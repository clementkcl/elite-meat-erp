"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
  type UserRole,
} from "@/lib/auth/session"
import { canAccessModule } from "@/lib/auth/access"
import { asRecord, readString } from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import type { DeliveryActionState } from "@/lib/delivery/action-state"
import {
  deliveryPaymentStatuses,
  deliveryPaymentTypes,
  deliverySourceTypes,
  deliveryStatuses,
} from "@/lib/delivery/types"

const deliveryAccessRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
]

const deliveryManagerRoles: UserRole[] = ["delivery_manager", "admin"]

const deliveryPaymentRoles: UserRole[] = [
  "delivery_team_general_worker",
  "delivery_manager",
  "account",
  "admin",
]

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const createOrderSchema = z.object({
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().optional(),
  customerLocation: z.string().trim().min(2),
  deliveryAddress: z.string().trim().min(5),
  vehicleId: optionalUuid,
  driverId: optionalUuid,
  requestedDeliveryDate: optionalText,
  sourceType: z.enum(deliverySourceTypes).default("manual"),
  sourceReference: optionalText,
  retailSaleId: optionalUuid,
  paymentType: z.enum(deliveryPaymentTypes).default("CASH"),
  paymentStatus: z.enum(deliveryPaymentStatuses).default("PENDING"),
  itemDescription: z.string().trim().min(2),
  quantity: z.coerce.number().positive(),
  weightKg: z.coerce.number().min(0),
  notes: z.string().trim().optional(),
})

const updateStatusSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.enum(deliveryStatuses),
  notes: z.string().trim().optional(),
})

const vehicleSchema = z.object({
  vehicleNo: z.string().trim().min(2),
  vehicleType: z.string().trim().min(2),
  capacityKg: z.coerce.number().min(0).optional(),
})

const driverLocationSchema = z.object({
  orderId: optionalUuid,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  locationNote: z.string().trim().optional(),
})

const paymentSchema = z.object({
  orderId: z.string().trim().min(1),
  paymentType: z.enum(deliveryPaymentTypes),
  paymentStatus: z.enum(deliveryPaymentStatuses),
  amount: z.coerce.number().min(0),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const proofUploadSchema = z.object({
  orderId: z.string().trim().min(1),
  deliveryOutcome: z.enum(["DELIVERED", "FAILED"]).default("DELIVERED"),
  receiverName: z.string().trim().min(2),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})

type DeliveryActionContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function success(message: string): DeliveryActionState {
  return { status: "success", message }
}

function failure(message: string): DeliveryActionState {
  return { status: "error", message }
}

function parseAction<T>(
  schema: z.ZodType<T>,
  formData: FormData
): T | DeliveryActionState {
  const parsed = schema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the form fields.")
  }

  return parsed.data
}

function isDeliveryActionState(value: unknown): value is DeliveryActionState {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "status" in value
  )
}

async function getActionContext(roles: UserRole[]) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: "Sign in before changing delivery records." }
  }

  if (!hasAnyRole(profile, roles)) {
    return { error: "Your role does not allow this delivery action." }
  }

  if (!canAccessModule(profile, "delivery")) {
    return { error: "Your outlet does not have delivery access." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { profile, demoMode: true }
  }

  return { profile, supabase, demoMode: false }
}

function revalidateDeliveryPaths() {
  [
    "/delivery",
    "/delivery/dashboard",
    "/delivery/orders",
    "/delivery/new-order",
    "/delivery/driver",
    "/delivery/vehicles",
    "/delivery/payments",
  ].forEach((path) => revalidatePath(path))
}

async function runDeliveryAction(
  formData: FormData,
  roles: UserRole[],
  callback: (
    context: DeliveryActionContext,
    formData: FormData
  ) => Promise<string>
) {
  const context = await getActionContext(roles)

  if ("error" in context) {
    return failure(context.error ?? "Action unavailable.")
  }

  if (context.demoMode || !context.supabase) {
    return success("Demo mode: connect Supabase to save this action.")
  }

  try {
    const message = await callback(
      { profile: context.profile, supabase: context.supabase },
      formData
    )
    revalidateDeliveryPaths()
    return success(message)
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Action failed.")
  }
}

async function insertAuditLog(
  supabase: SupabaseServerClient,
  profile: CurrentProfile,
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, unknown>
) {
  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
  })
}

async function ensureOrderExists(
  supabase: SupabaseServerClient,
  orderId: string
) {
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("id, order_no, status, proof_file_id")
    .eq("id", orderId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const order = asRecord(data)

  if (!order.id) {
    throw new Error("Delivery order was not found.")
  }

  return order
}

function isDeliveryCompletionStatus(status: string) {
  return status === "DELIVERED" || status === "FAILED"
}

function assertProofBeforeDeliveryCompletion(
  order: Record<string, unknown>,
  nextStatus: string
) {
  if (!isDeliveryCompletionStatus(nextStatus)) {
    return
  }

  if (readString(order.proof_file_id)) {
    return
  }

  throw new Error(
    "Upload proof of delivery before marking this delivery delivered or failed."
  )
}

function assertProofUploadAllowed(order: Record<string, unknown>) {
  const status = readString(order.status)

  if (["OUT_FOR_DELIVERY", "DELIVERED", "FAILED"].includes(status)) {
    return
  }

  throw new Error(
    "Proof photos can only be uploaded after the delivery is out for delivery."
  )
}

function safeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

function isProofPhoto(file: File) {
  return file.type.startsWith("image/")
}

function scopedDeliveryTeamId(profile: CurrentProfile) {
  if (hasAnyRole(profile, ["admin"])) {
    return profile.departmentId
  }

  if (!profile.departmentId) {
    throw new Error("Your profile needs a delivery team before changing delivery records.")
  }

  return profile.departmentId
}

export async function createDeliveryOrderAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(createOrderSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryAccessRoles, async (context) => {
    if (parsed.sourceType !== "manual" && !parsed.sourceReference) {
      throw new Error("Enter a source reference for retail sale or WhatsApp orders.")
    }

    const orderNo = `DO-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now().toString().slice(-5)}`
    const initialStatus = "PENDING"

    const { data, error } = await context.supabase
      .from("delivery_orders")
      .insert({
        order_no: orderNo,
        customer_name: parsed.customerName,
        customer_phone: parsed.customerPhone ?? null,
        customer_location: parsed.customerLocation,
        delivery_address: parsed.deliveryAddress,
        vehicle_id: parsed.vehicleId,
        driver_id: parsed.driverId,
        status: initialStatus,
        payment_type: parsed.paymentType,
        payment_status: parsed.paymentStatus,
        source_type: parsed.sourceType,
        source_reference: parsed.sourceReference,
        retail_sale_id: parsed.retailSaleId,
        requested_delivery_date: parsed.requestedDeliveryDate,
        notes: parsed.notes ?? null,
        delivery_team_id: scopedDeliveryTeamId(context.profile),
        created_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const orderId = String(asRecord(data).id ?? "")

    const { error: itemError } = await context.supabase
      .from("delivery_order_items")
      .insert({
        order_id: orderId,
        item_description: parsed.itemDescription,
        quantity: parsed.quantity,
        weight_kg: parsed.weightKg,
        notes: parsed.notes ?? null,
        created_by: context.profile.id,
      })

    if (itemError) {
      throw new Error(itemError.message)
    }

    const { error: statusError } = await context.supabase
      .from("delivery_status_logs")
      .insert({
        order_id: orderId,
        status: initialStatus,
        notes: "Order created",
        created_by: context.profile.id,
      })

    if (statusError) {
      throw new Error(statusError.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_ORDER_CREATED",
      "delivery_orders",
      orderId,
      { ...parsed, orderNo, initialStatus }
    )

    return `Delivery order ${orderNo} created.`
  })
}

export async function updateDeliveryStatusAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(updateStatusSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryAccessRoles, async (context) => {
    const order = await ensureOrderExists(context.supabase, parsed.orderId)

    if (parsed.status === "FAILED") {
      throw new Error(
        "Upload failed delivery proof so receiver/contact, photo, GPS, and return workflow are recorded."
      )
    }

    assertProofBeforeDeliveryCompletion(order, parsed.status)

    const { error } = await context.supabase
      .from("delivery_orders")
      .update({ status: parsed.status })
      .eq("id", parsed.orderId)

    if (error) {
      throw new Error(error.message)
    }

    const { error: logError } = await context.supabase
      .from("delivery_status_logs")
      .insert({
        order_id: parsed.orderId,
        status: parsed.status,
        notes: parsed.notes ?? null,
        created_by: context.profile.id,
      })

    if (logError) {
      throw new Error(logError.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_STATUS_UPDATED",
      "delivery_orders",
      parsed.orderId,
      parsed
    )

    return "Delivery status updated."
  })
}

export async function createVehicleAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(vehicleSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryManagerRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("vehicles")
      .insert({
        vehicle_no: parsed.vehicleNo,
        vehicle_type: parsed.vehicleType,
        capacity_kg: parsed.capacityKg ?? null,
        delivery_team_id: scopedDeliveryTeamId(context.profile),
        created_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "VEHICLE_CREATED",
      "vehicles",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Vehicle saved."
  })
}

export async function recordDriverLocationAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(driverLocationSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryAccessRoles, async (context) => {
    if (parsed.orderId) {
      await ensureOrderExists(context.supabase, parsed.orderId)
    }

    const { data, error } = await context.supabase
      .from("driver_locations")
      .insert({
        driver_id: context.profile.id,
        order_id: parsed.orderId,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        location_note: parsed.locationNote ?? null,
        created_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DRIVER_LOCATION_RECORDED",
      "driver_locations",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Driver location recorded."
  })
}

export async function recordDeliveryPaymentAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(paymentSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryPaymentRoles, async (context) => {
    await ensureOrderExists(context.supabase, parsed.orderId)

    const { data, error } = await context.supabase
      .from("delivery_payments")
      .insert({
        order_id: parsed.orderId,
        payment_type: parsed.paymentType,
        payment_status: parsed.paymentStatus,
        amount: parsed.amount,
        reference_no: parsed.referenceNo ?? null,
        notes: parsed.notes ?? null,
        received_by: context.profile.id,
        created_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const { error: orderError } = await context.supabase
      .from("delivery_orders")
      .update({
        payment_type: parsed.paymentType,
        payment_status: parsed.paymentStatus,
      })
      .eq("id", parsed.orderId)

    if (orderError) {
      throw new Error(orderError.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_PAYMENT_RECORDED",
      "delivery_payments",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Delivery payment recorded."
  })
}

export async function uploadProofOfDeliveryAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(proofUploadSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryAccessRoles, async (context) => {
    const order = await ensureOrderExists(context.supabase, parsed.orderId)
    assertProofUploadAllowed(order)

    const fileValue = formData.get("proofFile")

    if (!(fileValue instanceof File) || fileValue.size === 0) {
      throw new Error("Choose a proof of delivery photo.")
    }

    if (!isProofPhoto(fileValue)) {
      throw new Error("Proof of delivery must be a photo image file.")
    }

    const cleanName = safeFileName(fileValue.name) || "proof"
    const objectPath = `delivery/proof/${parsed.orderId}/${Date.now()}-${cleanName}`
    const { error: uploadError } = await context.supabase.storage
      .from("erp-files")
      .upload(objectPath, fileValue, {
        contentType: fileValue.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data: fileData, error: fileError } = await context.supabase
      .from("files")
      .insert({
        owner_id: context.profile.id,
        bucket_id: "erp-files",
        object_path: objectPath,
        module: "delivery",
        mime_type: fileValue.type || null,
        size_bytes: fileValue.size,
      })
      .select("id")
      .single()

    if (fileError) {
      throw new Error(fileError.message)
    }

    const fileId = String(asRecord(fileData).id ?? "")
    const nextStatus = parsed.deliveryOutcome
    const { error: orderError } = await context.supabase
      .from("delivery_orders")
      .update({
        proof_file_id: fileId,
        proof_receiver_name: parsed.receiverName,
        proof_latitude: parsed.latitude,
        proof_longitude: parsed.longitude,
        proof_uploaded_at: new Date().toISOString(),
        status: nextStatus,
        failed_return_status:
          nextStatus === "FAILED" ? "NO_STOCK_LINK" : "NOT_REQUIRED",
        failed_return_required_units: 0,
        failed_return_completed_units: 0,
        failed_return_logged_at:
          nextStatus === "FAILED" ? new Date().toISOString() : null,
      })
      .eq("id", parsed.orderId)

    if (orderError) {
      throw new Error(orderError.message)
    }

    const { error: statusError } = await context.supabase
      .from("delivery_status_logs")
      .insert({
        order_id: parsed.orderId,
        status: nextStatus,
        notes:
          nextStatus === "FAILED"
            ? `Failed delivery proof uploaded. Contact: ${parsed.receiverName}. Standalone delivery has no linked order stock; return follow-up is required.`
            : `Proof uploaded. Receiver: ${parsed.receiverName}.`,
        created_by: context.profile.id,
      })

    if (statusError) {
      throw new Error(statusError.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "PROOF_OF_DELIVERY_UPLOADED",
      "delivery_orders",
      parsed.orderId,
      {
        orderNo: String(order.order_no ?? ""),
        objectPath,
        fileId,
        receiverName: parsed.receiverName,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        status: nextStatus,
        failedReturnStatus:
          nextStatus === "FAILED" ? "NO_STOCK_LINK" : "NOT_REQUIRED",
      }
    )

    return nextStatus === "FAILED"
      ? "Failed delivery proof uploaded. Standalone stock return follow-up is required."
      : "Proof of delivery uploaded and delivery marked delivered."
  })
}
