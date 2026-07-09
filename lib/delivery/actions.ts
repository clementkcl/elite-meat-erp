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
  getAvailableDeliveries as queryAvailableDeliveries,
  getDeliveryById as queryDeliveryById,
  getDeliveryDashboard as queryDeliveryDashboard,
  getTodayDriverDeliveries as queryTodayDriverDeliveries,
} from "@/lib/delivery/queries"
import {
  deliveryPaymentStatuses,
  deliveryPaymentTypes,
  deliveryExpenseStatuses,
  deliveryExpenseTypes,
  deliveryFailedReasons,
  deliveryGoodsIssueReasons,
  deliveryJobTypes,
  deliverySourceTypes,
  deliveryStatuses,
  type CreateDeliveryExpensePayload,
  type CreateManualDeliveryPayload,
  type DeliveryAddressIssuePayload,
  type DeliveryDashboardFilters,
  type DeliveryExpenseStatus,
  type DeliveryFailedReason,
  type DeliveryGpsInput,
  type DeliveryLifecycleStatus,
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
const deliveryDriverRoles: UserRole[] = [
  "delivery_team_general_worker",
  "delivery_manager",
  "admin",
]

const deliveryServiceManagerRoles: UserRole[] = [
  "delivery_manager",
  "admin",
  "director",
]

const deliveryPaymentRoles: UserRole[] = [
  "delivery_manager",
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

const nullableNumberField = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null
    }

    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  })

const deliveryJobIdSchema = z.object({
  jobId: z.string().trim().min(1),
})

const acceptDeliveryJobSchema = z.object({
  jobId: z.string().trim().min(1),
  vehicleId: optionalUuid,
})

const deliveryJobProofSchema = z.object({
  jobId: z.string().trim().min(1),
  deliveryOutcome: z.enum(["DELIVERED", "FAILED"]).default("DELIVERED"),
  failedReason: z.enum(deliveryFailedReasons).optional(),
  goodsIssueReason: z.enum(deliveryGoodsIssueReasons).optional(),
  remarks: optionalText,
  latitude: nullableNumberField.refine(
    (value) => value === null || (value >= -90 && value <= 90),
    "GPS latitude is not valid."
  ),
  longitude: nullableNumberField.refine(
    (value) => value === null || (value >= -180 && value <= 180),
    "GPS longitude is not valid."
  ),
  gpsAvailable: z.coerce.boolean().default(false),
})

const goodsIssueSchema = z.object({
  jobId: z.string().trim().min(1),
  goodsIssueReason: z.enum(deliveryGoodsIssueReasons),
  remarks: optionalText,
}).refine(
  (value) => value.goodsIssueReason !== "OTHER" || Boolean(value.remarks),
  "Enter a short note for Other."
)

const addressIssueSchema = z.object({
  jobId: z.string().trim().min(1),
  suggestedAddress: z.string().trim().min(3),
  reason: z.string().trim().min(2),
  latitude: nullableNumberField,
  longitude: nullableNumberField,
})

const expenseSchema = z.object({
  expenseType: z.enum(deliveryExpenseTypes),
  amount: z.coerce.number().positive(),
  vehicleId: optionalUuid,
  remark: optionalText,
})

const serviceUuid = z
  .string()
  .trim()
  .min(1)

const serviceOptionalUuid = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))

const serviceOptionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))

const serviceManualDeliveryItemSchema = z.object({
  itemId: serviceOptionalUuid,
  itemDescription: z.string().trim().min(2),
  quantity: z.number().min(0).optional().nullable().default(0),
  weightKg: z.number().min(0).optional().nullable().default(0),
  notes: serviceOptionalText,
})

const serviceManualDeliveryOrderSchema = z.object({
  orderNo: serviceOptionalText,
  sourceCustomerOrderId: serviceOptionalUuid,
  customerName: serviceOptionalText,
  customerPhone: serviceOptionalText,
  deliveryAddress: serviceOptionalText,
  orderNote: serviceOptionalText,
})

const serviceManualDeliverySchema = z.object({
  deliveryType: z.enum(deliveryJobTypes),
  customerId: serviceOptionalUuid,
  customerName: z.string().trim().min(2),
  customerPhone: serviceOptionalText,
  deliveryAddress: serviceOptionalText,
  deliveryNote: serviceOptionalText,
  outletId: serviceOptionalUuid,
  deliveryTeamId: serviceOptionalUuid,
  driverId: serviceOptionalUuid,
  defaultVehicleId: serviceOptionalUuid,
  vehicleId: serviceOptionalUuid,
  requestedDeliveryDate: serviceOptionalText,
  orders: z.array(serviceManualDeliveryOrderSchema).optional().default([]),
  items: z.array(serviceManualDeliveryItemSchema).optional().default([]),
})

const serviceGpsSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  unavailable: z.boolean().optional().nullable(),
})

const serviceAddressIssueSchema = z.object({
  suggestedAddress: serviceOptionalText,
  reason: z.string().trim().min(2),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  note: serviceOptionalText,
  photoFile: z.instanceof(File).optional().nullable(),
})

const serviceExpenseSchema = z.object({
  deliveryId: serviceOptionalUuid,
  vehicleId: serviceOptionalUuid,
  expenseType: z.enum(deliveryExpenseTypes),
  amount: z.number().positive(),
  remark: serviceOptionalText,
})

const managerDeliveryDriverSchema = z.object({
  deliveryId: z.string().trim().min(1),
  driverId: optionalUuid,
})

const managerDeliveryVehicleSchema = z.object({
  deliveryId: z.string().trim().min(1),
  vehicleId: optionalUuid,
})

const managerCancelDeliverySchema = z.object({
  deliveryId: z.string().trim().min(1),
  remarks: z.string().trim().min(2, "Enter a cancellation reason."),
})

const managerAddressSuggestionReviewSchema = z.object({
  deliveryId: z.string().trim().min(1),
  suggestionId: z.string().trim().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
})

const managerExpenseReviewSchema = z
  .object({
    expenseId: z.string().trim().min(1),
    status: z.enum(deliveryExpenseStatuses),
    rejectedReason: optionalText,
    reviewNote: optionalText,
  })
  .refine(
    (value) => value.status !== "REJECTED" || Boolean(value.rejectedReason),
    "Enter a reason before rejecting this expense."
  )
  .refine(
    (value) => value.status === "APPROVED" || value.status === "REJECTED",
    "Choose approve or reject."
  )

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
    "/delivery/expenses",
    "/orders",
    "/orders/ready",
    "/orders/picking",
  ].forEach((path) => revalidatePath(path))
}

function revalidateLinkedOrderPaths(orderIds: string[]) {
  orderIds.forEach((orderId) => revalidatePath(`/orders/${orderId}`))
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

async function uploadDeliveryFile(
  supabase: SupabaseServerClient,
  profile: CurrentProfile,
  file: File,
  objectPath: string,
  module = "delivery",
  bucketId = "erp-files"
) {
  const { error: uploadError } = await supabase.storage
    .from(bucketId)
    .upload(objectPath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data: fileData, error: fileError } = await supabase
      .from("files")
      .insert({
        owner_id: profile.id,
        bucket_id: bucketId,
        object_path: objectPath,
        module,
        mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select("id")
    .single()

  if (fileError) {
    throw new Error(fileError.message)
  }

  return readString(asRecord(fileData).id)
}

async function ensureJobExists(
  supabase: SupabaseServerClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from("delivery_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const job = asRecord(data)

  if (!job.id) {
    throw new Error("Delivery job was not found.")
  }

  return job
}

async function getDeliveryJobLinks(
  supabase: SupabaseServerClient,
  jobId: string
) {
  const { data, error } = await supabase
    .from("delivery_job_orders")
    .select("customer_order_id, delivery_order_id")
    .eq("job_id", jobId)

  if (error) {
    throw new Error(error.message)
  }

  return Array.isArray(data) ? data.map(asRecord) : []
}

async function defaultVehicleId(
  supabase: SupabaseServerClient,
  teamId: string | null
) {
  let query = supabase
    .from("vehicles")
    .select("id")
    .eq("is_active", true)
    .limit(1)

  if (teamId) {
    query = query.eq("delivery_team_id", teamId)
  }

  const { data } = await query.maybeSingle()

  return readString(asRecord(data).id) || null
}

function assertJobAssignedToDriver(job: Record<string, unknown>, profile: CurrentProfile) {
  if (hasAnyRole(profile, ["delivery_manager", "admin"])) {
    return
  }

  const driverId = readString(job.driver_id)

  if (driverId === profile.id) {
    return
  }

  throw new Error("This delivery is not assigned to you.")
}

async function updateLinkedOrdersForStart(
  context: DeliveryActionContext,
  jobId: string
) {
  const links = await getDeliveryJobLinks(context.supabase, jobId)

  for (const link of links) {
    const customerOrderId = readString(link.customer_order_id)
    const deliveryOrderId = readString(link.delivery_order_id)

    if (customerOrderId) {
      const { error } = await context.supabase
        .from("customer_orders")
        .update({ status: "OUT_FOR_DELIVERY", updated_by: context.profile.id })
        .eq("id", customerOrderId)
        .eq("status", "READY_FOR_DELIVERY")

      if (error) {
        throw new Error(error.message)
      }
    }

    if (deliveryOrderId) {
      const { error } = await context.supabase
        .from("delivery_orders")
        .update({ status: "OUT_FOR_DELIVERY" })
        .eq("id", deliveryOrderId)

      if (error) {
        throw new Error(error.message)
      }
    }
  }
}

async function updateLinkedOrdersForProof(
  context: DeliveryActionContext,
  jobId: string,
  fileId: string,
  outcome: "DELIVERED" | "FAILED",
  failedReason: string | null,
  latitude: number | null,
  longitude: number | null,
  notes: string | null
) {
  const links = await getDeliveryJobLinks(context.supabase, jobId)

  for (const link of links) {
    const customerOrderId = readString(link.customer_order_id)
    const deliveryOrderId = readString(link.delivery_order_id)

    if (customerOrderId) {
      if (outcome === "FAILED") {
        const { error } = await context.supabase
          .rpc("fail_customer_order_delivery_with_proof", {
            p_order_id: customerOrderId,
            p_file_id: fileId,
            p_contact_name: context.profile.fullName,
            p_latitude: latitude,
            p_longitude: longitude,
            p_notes: notes ?? failedReason,
          })
          .single()

        if (error) {
          throw new Error(error.message)
        }
      } else {
        const { error } = await context.supabase
          .rpc("complete_customer_order_delivery_with_proof", {
            p_order_id: customerOrderId,
            p_file_id: fileId,
            p_receiver_name: context.profile.fullName,
            p_latitude: latitude,
            p_longitude: longitude,
          })

        if (error) {
          throw new Error(error.message)
        }
      }
    }

    if (deliveryOrderId) {
      const { error } = await context.supabase
        .from("delivery_orders")
        .update({
          proof_file_id: fileId,
          proof_receiver_name: context.profile.fullName,
          proof_latitude: latitude,
          proof_longitude: longitude,
          proof_uploaded_at: new Date().toISOString(),
          status: outcome,
          failed_return_status:
            outcome === "FAILED" ? "NO_STOCK_LINK" : "NOT_REQUIRED",
          failed_return_logged_at:
            outcome === "FAILED" ? new Date().toISOString() : null,
        })
        .eq("id", deliveryOrderId)

      if (error) {
        throw new Error(error.message)
      }
    }
  }
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

function parseService<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Check delivery details.")
  }

  return parsed.data
}

async function requireDeliveryServiceContext(
  roles: UserRole[]
): Promise<DeliveryActionContext> {
  const context = await getActionContext(roles)

  if ("error" in context) {
    throw new Error(context.error ?? "Delivery action unavailable.")
  }

  if (context.demoMode || !context.supabase) {
    throw new Error("Connect Supabase before saving delivery records.")
  }

  return { profile: context.profile, supabase: context.supabase }
}

async function runDeliveryService<T>(
  roles: UserRole[],
  callback: (context: DeliveryActionContext) => Promise<T>
) {
  const context = await requireDeliveryServiceContext(roles)
  const result = await callback(context)
  revalidateDeliveryPaths()
  return result
}

function generatedDeliveryNo(prefix = "DL") {
  return `${prefix}-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${Date.now().toString().slice(-6)}`
}

function scopedServiceOutletId(
  profile: CurrentProfile,
  requestedOutletId: string | null
) {
  if (hasAnyRole(profile, ["admin", "director"])) {
    return requestedOutletId ?? profile.outletId
  }

  if (requestedOutletId && requestedOutletId !== profile.outletId) {
    throw new Error("This delivery is outside your outlet.")
  }

  return profile.outletId
}

function scopedServiceTeamId(
  profile: CurrentProfile,
  requestedTeamId: string | null
) {
  if (hasAnyRole(profile, ["admin", "director"])) {
    return requestedTeamId ?? profile.departmentId
  }

  if (requestedTeamId && requestedTeamId !== profile.departmentId) {
    throw new Error("This delivery is outside your delivery team.")
  }

  if (!profile.departmentId) {
    throw new Error("Your profile needs a delivery team before changing deliveries.")
  }

  return profile.departmentId
}

function normalizeGps(gps: DeliveryGpsInput) {
  const parsed = parseService(serviceGpsSchema, gps)
  const hasCoordinates =
    parsed.latitude !== null &&
    parsed.latitude !== undefined &&
    parsed.longitude !== null &&
    parsed.longitude !== undefined

  return {
    latitude: hasCoordinates ? parsed.latitude ?? null : null,
    longitude: hasCoordinates ? parsed.longitude ?? null : null,
    gpsUnavailable: Boolean(parsed.unavailable) || !hasCoordinates,
  }
}

function assertPhotoFile(file: File, label: string) {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error(`Take a ${label} photo before saving.`)
  }

  if (!isProofPhoto(file)) {
    throw new Error(`${label} must be a photo image.`)
  }
}

function assertDriverCanChangeDelivery(
  delivery: Record<string, unknown>,
  profile: CurrentProfile
) {
  const status = readString(delivery.status)

  if (["CANCELLED", "DELIVERED", "FAILED"].includes(status)) {
    throw new Error("This delivery is already closed.")
  }

  if (hasAnyRole(profile, ["delivery_manager", "admin", "director"])) {
    return
  }

  const driverId = readString(delivery.driver_id)

  if (driverId === profile.id) {
    return
  }

  throw new Error("This delivery is not assigned to you.")
}

function assertManagerCanChangeDelivery(
  delivery: Record<string, unknown>,
  profile: CurrentProfile
) {
  if (hasAnyRole(profile, ["admin"])) {
    return
  }

  const outletId = readString(delivery.outlet_id)
  const deliveryTeamId = readString(delivery.delivery_team_id)

  if (outletId && outletId !== profile.outletId) {
    throw new Error("This delivery is outside your outlet.")
  }

  if (deliveryTeamId && deliveryTeamId !== profile.departmentId) {
    throw new Error("This delivery is outside your delivery team.")
  }
}

async function getDeliveryForUpdate(
  supabase: SupabaseServerClient,
  deliveryId: string
) {
  const { data, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("id", deliveryId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const delivery = asRecord(data)

  if (!delivery.id) {
    throw new Error("Delivery was not found.")
  }

  return delivery
}

async function getDeliveryExpenseForReview(
  supabase: SupabaseServerClient,
  expenseId: string
) {
  const { data, error } = await supabase
    .from("delivery_expenses")
    .select("*")
    .eq("id", expenseId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const expense = asRecord(data)

  if (!expense.id) {
    throw new Error("Delivery expense was not found.")
  }

  return expense
}

async function assertManagerCanReviewExpense(
  context: DeliveryActionContext,
  expense: Record<string, unknown>
) {
  if (hasAnyRole(context.profile, ["admin"])) {
    return
  }

  const deliveryId = readString(expense.delivery_id)

  if (deliveryId) {
    const delivery = await getDeliveryForUpdate(context.supabase, deliveryId)
    assertManagerCanChangeDelivery(delivery, context.profile)
    return
  }

  const outletId = readString(expense.outlet_id)
  const deliveryTeamId = readString(expense.delivery_team_id)

  if (outletId && outletId !== context.profile.outletId) {
    throw new Error("This expense is outside your outlet.")
  }

  if (deliveryTeamId && deliveryTeamId !== context.profile.departmentId) {
    throw new Error("This expense is outside your delivery team.")
  }

  if (!outletId && !deliveryTeamId) {
    throw new Error("This expense has no delivery scope for review.")
  }
}

async function insertDeliveryStatusLog(
  context: DeliveryActionContext,
  deliveryId: string,
  status: DeliveryLifecycleStatus,
  notes: string | null
) {
  const { error } = await context.supabase.from("delivery_status_logs").insert({
    delivery_id: deliveryId,
    status,
    status_text: status,
    notes,
    driver_id: context.profile.id,
    created_by: context.profile.id,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function updateDeliveryStatus(
  context: DeliveryActionContext,
  deliveryId: string,
  status: DeliveryLifecycleStatus,
  updates: Record<string, unknown>,
  notes: string | null
) {
  const { error } = await context.supabase
    .from("deliveries")
    .update({
      ...updates,
      status,
      updated_by: context.profile.id,
    })
    .eq("id", deliveryId)

  if (error) {
    throw new Error(error.message)
  }

  await insertDeliveryStatusLog(context, deliveryId, status, notes)
}

async function getDeliveryOrderLinks(
  supabase: SupabaseServerClient,
  deliveryId: string
) {
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("id, source_customer_order_id")
    .eq("delivery_id", deliveryId)

  if (error) {
    throw new Error(error.message)
  }

  return Array.isArray(data) ? data.map(asRecord) : []
}

function deliveryOrderStatusForLifecycle(status: DeliveryLifecycleStatus) {
  if (status === "AVAILABLE" || status === "ACCEPTED") {
    return "PENDING"
  }

  return status
}

function customerOrderStatusForDelivery(status: DeliveryLifecycleStatus) {
  if (status === "OUT_FOR_DELIVERY" || status === "DELIVERED" || status === "FAILED") {
    return status
  }

  return null
}

async function updateLinkedCustomerOrders(
  context: DeliveryActionContext,
  deliveryId: string,
  status: DeliveryLifecycleStatus
) {
  const links = await getDeliveryOrderLinks(context.supabase, deliveryId)
  const deliveryOrderStatus = deliveryOrderStatusForLifecycle(status)
  const customerOrderStatus = customerOrderStatusForDelivery(status)

  const { error: deliveryOrderError } = await context.supabase
    .from("delivery_orders")
    .update({ status: deliveryOrderStatus })
    .eq("delivery_id", deliveryId)

  if (deliveryOrderError) {
    throw new Error(deliveryOrderError.message)
  }

  if (!customerOrderStatus) {
    return links
  }

  const linkedCustomerOrderIds: string[] = []

  for (const link of links) {
    const customerOrderId = readString(link.source_customer_order_id)

    if (!customerOrderId) {
      continue
    }

    const { error } = await context.supabase
      .from("customer_orders")
      .update({ status: customerOrderStatus, updated_by: context.profile.id })
      .eq("id", customerOrderId)

    if (error) {
      throw new Error(error.message)
    }

    linkedCustomerOrderIds.push(customerOrderId)
  }

  revalidateLinkedOrderPaths(linkedCustomerOrderIds)

  return links
}

async function completeLinkedCustomerOrderProofs(
  context: DeliveryActionContext,
  deliveryId: string,
  fileId: string,
  gps: ReturnType<typeof normalizeGps>
) {
  if (gps.gpsUnavailable || gps.latitude === null || gps.longitude === null) {
    return
  }

  const links = await getDeliveryOrderLinks(context.supabase, deliveryId)
  const linkedCustomerOrderIds: string[] = []

  for (const link of links) {
    const customerOrderId = readString(link.source_customer_order_id)

    if (!customerOrderId) {
      continue
    }

    const { error } = await context.supabase.rpc(
      "complete_customer_order_delivery_with_proof",
      {
        p_order_id: customerOrderId,
        p_file_id: fileId,
        p_receiver_name: "",
        p_latitude: gps.latitude,
        p_longitude: gps.longitude,
      }
    )

    if (error) {
      throw new Error(error.message)
    }

    linkedCustomerOrderIds.push(customerOrderId)
  }

  revalidateLinkedOrderPaths(linkedCustomerOrderIds)
}

async function createDeliveryAddressSuggestion(
  context: DeliveryActionContext,
  delivery: Record<string, unknown>,
  payload: DeliveryAddressIssuePayload
) {
  const parsed = parseService(serviceAddressIssueSchema, payload)
  let photoFileId: string | null = null
  let objectPath: string | null = null
  let photoMimeType: string | null = null
  let photoSizeBytes: number | null = null

  if (parsed.photoFile && parsed.photoFile.size > 0) {
    assertPhotoFile(parsed.photoFile, "address issue")
    const cleanName = safeFileName(parsed.photoFile.name) || "address-issue"
    objectPath = `${readString(delivery.id)}/address-issue/${Date.now()}-${cleanName}`
    photoFileId = await uploadDeliveryFile(
      context.supabase,
      context.profile,
      parsed.photoFile,
      objectPath,
      "delivery",
      "delivery-proofs"
    )
    photoMimeType = parsed.photoFile.type || null
    photoSizeBytes = parsed.photoFile.size
  }

  const { error } = await context.supabase
    .from("delivery_address_suggestions")
    .insert({
      delivery_id: readString(delivery.id),
      customer_id: readString(delivery.customer_id) || null,
      customer_name: readString(delivery.customer_name, "Customer"),
      suggested_address:
        parsed.suggestedAddress ?? (readString(delivery.delivery_address) || null),
      suggested_latitude: parsed.latitude ?? null,
      suggested_longitude: parsed.longitude ?? null,
      reason: parsed.note
        ? `${parsed.reason} - ${parsed.note}`
        : parsed.reason,
      status: "PENDING",
      photo_file_id: photoFileId,
      bucket_id: "delivery-proofs",
      object_path: objectPath,
      photo_mime_type: photoMimeType,
      photo_size_bytes: photoSizeBytes,
      created_by: context.profile.id,
    })

  if (error) {
    throw new Error(error.message)
  }
}

async function createProofAndComplete(
  context: DeliveryActionContext,
  deliveryId: string,
  file: File,
  gps: DeliveryGpsInput,
  outcome: "DELIVERED" | "FAILED",
  failedReason: DeliveryFailedReason | null,
  remarks: string | null
) {
  assertPhotoFile(file, "proof")

  if (outcome === "FAILED" && !failedReason) {
    throw new Error("Choose a failed delivery reason.")
  }

  if (failedReason === "OTHER" && !remarks) {
    throw new Error("Enter a short note for Other.")
  }

  const delivery = await getDeliveryForUpdate(context.supabase, deliveryId)
  assertDriverCanChangeDelivery(delivery, context.profile)

  if (readString(delivery.status) !== "OUT_FOR_DELIVERY") {
    throw new Error("Start delivery before uploading proof.")
  }

  const cleanName = safeFileName(file.name) || "proof"
  const objectPath = `${deliveryId}/proof/${Date.now()}-${cleanName}`
  const uploadedAt = new Date().toISOString()
  const fileId = await uploadDeliveryFile(
    context.supabase,
    context.profile,
    file,
    objectPath,
    "delivery",
    "delivery-proofs"
  )
  const normalizedGps = normalizeGps(gps)

  const { error: proofError } = await context.supabase
    .from("delivery_proofs")
    .insert({
      delivery_id: deliveryId,
      proof_type: outcome,
      proof_file_id: fileId,
      bucket_id: "delivery-proofs",
      object_path: objectPath,
      mime_type: file.type || null,
      size_bytes: file.size,
      latitude: normalizedGps.latitude,
      longitude: normalizedGps.longitude,
      gps_unavailable: normalizedGps.gpsUnavailable,
      failed_reason: failedReason,
      remarks,
      uploaded_by: context.profile.id,
      uploaded_at: uploadedAt,
    })

  if (proofError) {
    throw new Error(proofError.message)
  }

  await updateDeliveryStatus(
    context,
    deliveryId,
    outcome,
    {
      completed_at: new Date().toISOString(),
      completed_latitude: normalizedGps.latitude,
      completed_longitude: normalizedGps.longitude,
      gps_unavailable: normalizedGps.gpsUnavailable,
      failed_reason: failedReason,
      remarks,
    },
    normalizedGps.gpsUnavailable
      ? `${outcome} proof uploaded. Phone GPS unavailable.`
      : `${outcome} proof uploaded.`
  )

  await updateLinkedCustomerOrders(context, deliveryId, outcome)

  if (outcome === "DELIVERED") {
    await completeLinkedCustomerOrderProofs(context, deliveryId, fileId, normalizedGps)
  }

  if (normalizedGps.gpsUnavailable) {
    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_GPS_UNAVAILABLE",
      "deliveries",
      deliveryId,
      { outcome }
    )
  } else {
    await createDeliveryAddressSuggestion(context, delivery, {
      suggestedAddress: readString(delivery.delivery_address),
      reason: "Proof GPS captured by driver.",
      latitude: normalizedGps.latitude,
      longitude: normalizedGps.longitude,
    })
  }

  await insertAuditLog(
    context.supabase,
    context.profile,
    outcome === "FAILED"
      ? "DELIVERY_FAILED_PROOF_UPLOADED"
      : "DELIVERY_DELIVERED_PROOF_UPLOADED",
    "deliveries",
    deliveryId,
    {
      fileId,
      objectPath,
      gpsUnavailable: normalizedGps.gpsUnavailable,
      failedReason,
    }
  )

  return { deliveryId, status: outcome, proofFileId: fileId }
}

export async function getAvailableDeliveries() {
  return queryAvailableDeliveries()
}

export async function getTodayDriverDeliveries() {
  return queryTodayDriverDeliveries()
}

export async function getDeliveryDashboard(filters: DeliveryDashboardFilters = {}) {
  return queryDeliveryDashboard(filters)
}

export async function getDeliveryById(deliveryId: string) {
  return queryDeliveryById(deliveryId)
}

export async function createDeliveryFromOrder(orderId: string) {
  const parsedOrderId = parseService(serviceUuid, orderId)

  return runDeliveryService(deliveryServiceManagerRoles, async (context) => {
    const { data, error } = await context.supabase
      .rpc("create_delivery_from_customer_order", {
        p_order_id: parsedOrderId,
        p_allow_related: false,
      })
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const result = asRecord(data)
    const deliveryId = readString(result.delivery_id)
    const deliveryNo = readString(result.delivery_no)

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_CREATED_FROM_ORDER",
      "deliveries",
      deliveryId,
      { orderId: parsedOrderId, deliveryNo, created: Boolean(result.created) }
    )

    return { deliveryId, deliveryNo }
  })
}

export async function createManualDelivery(payload: CreateManualDeliveryPayload) {
  const parsed = parseService(serviceManualDeliverySchema, payload)

  return runDeliveryService(deliveryServiceManagerRoles, async (context) => {
    const totalWeightKg = parsed.items.reduce(
      (total, item) => total + (item.weightKg ?? 0),
      0
    )
    const deliveryNo = generatedDeliveryNo()
    const outletId = scopedServiceOutletId(context.profile, parsed.outletId)
    const deliveryTeamId = scopedServiceTeamId(context.profile, parsed.deliveryTeamId)

    const { data, error } = await context.supabase
      .from("deliveries")
      .insert({
        delivery_no: deliveryNo,
        delivery_type: parsed.deliveryType,
        status: "AVAILABLE",
        outlet_id: outletId,
        delivery_team_id: deliveryTeamId,
        driver_id: parsed.driverId,
        default_vehicle_id: parsed.defaultVehicleId,
        vehicle_id: parsed.vehicleId,
        customer_id: parsed.customerId,
        customer_name: parsed.customerName,
        customer_phone: parsed.customerPhone,
        delivery_address: parsed.deliveryAddress,
        delivery_note: parsed.deliveryNote,
        total_weight_kg: totalWeightKg,
        item_count: parsed.items.length,
        requested_delivery_date: parsed.requestedDeliveryDate,
        created_by: context.profile.id,
        updated_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const deliveryId = readString(asRecord(data).id)
    const deliveryOrders = parsed.orders.length > 0 ? parsed.orders : []

    if (deliveryOrders.length > 0) {
      const { error: orderError } = await context.supabase
        .from("delivery_orders")
        .insert(
          deliveryOrders.map((order, index) => ({
            delivery_id: deliveryId,
            order_no: order.orderNo ?? generatedDeliveryNo("DO"),
            customer_name: order.customerName ?? parsed.customerName,
            customer_phone: order.customerPhone ?? parsed.customerPhone,
            delivery_address: order.deliveryAddress ?? parsed.deliveryAddress,
            outlet_id: outletId,
            delivery_team_id: deliveryTeamId,
            source_customer_order_id: order.sourceCustomerOrderId,
            order_note: order.orderNote,
            order_sequence: index + 1,
            status: "PENDING",
            created_by: context.profile.id,
          }))
        )

      if (orderError) {
        throw new Error(orderError.message)
      }
    }

    if (parsed.items.length > 0) {
      const { error: itemError } = await context.supabase
        .from("delivery_items")
        .insert(
          parsed.items.map((item) => ({
            delivery_id: deliveryId,
            item_id: item.itemId,
            item_description: item.itemDescription,
            quantity: item.quantity ?? 0,
            weight_kg: item.weightKg ?? 0,
            notes: item.notes,
            created_by: context.profile.id,
          }))
        )

      if (itemError) {
        throw new Error(itemError.message)
      }
    }

    await insertDeliveryStatusLog(context, deliveryId, "AVAILABLE", "Manual delivery created.")

    await insertAuditLog(
      context.supabase,
      context.profile,
      "MANUAL_DELIVERY_CREATED",
      "deliveries",
      deliveryId,
      { deliveryNo, deliveryType: parsed.deliveryType }
    )

    return { deliveryId, deliveryNo }
  })
}

export async function acceptDelivery(deliveryId: string, vehicleId?: string | null) {
  const parsedDeliveryId = parseService(serviceUuid, deliveryId)
  const parsedVehicleId = vehicleId
    ? parseService(serviceUuid, vehicleId)
    : null

  return runDeliveryService(deliveryDriverRoles, async (context) => {
    const delivery = await getDeliveryForUpdate(context.supabase, parsedDeliveryId)

    if (readString(delivery.status) !== "AVAILABLE") {
      throw new Error("This delivery is no longer available.")
    }

    const teamId = readString(delivery.delivery_team_id) || context.profile.departmentId
    const vehicleId =
      parsedVehicleId ||
      readString(delivery.vehicle_id) ||
      readString(delivery.default_vehicle_id) ||
      (await defaultVehicleId(context.supabase, teamId))

    await updateDeliveryStatus(
      context,
      parsedDeliveryId,
      "ACCEPTED",
      {
        driver_id: context.profile.id,
        vehicle_id: vehicleId,
        accepted_at: new Date().toISOString(),
      },
      "Delivery accepted."
    )
    await updateLinkedCustomerOrders(context, parsedDeliveryId, "ACCEPTED")

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_ACCEPTED",
      "deliveries",
      parsedDeliveryId,
      { vehicleId }
    )

    return { deliveryId: parsedDeliveryId, status: "ACCEPTED" as const }
  })
}

export async function markDeliveryLoaded(deliveryId: string) {
  const parsedDeliveryId = parseService(serviceUuid, deliveryId)

  return runDeliveryService(deliveryDriverRoles, async (context) => {
    const delivery = await getDeliveryForUpdate(context.supabase, parsedDeliveryId)
    assertDriverCanChangeDelivery(delivery, context.profile)

    if (readString(delivery.status) !== "ACCEPTED") {
      throw new Error("Accept this delivery before marking it loaded.")
    }

    await updateDeliveryStatus(
      context,
      parsedDeliveryId,
      "LOADED",
      { loaded_at: new Date().toISOString() },
      "Driver confirmed loading."
    )
    await updateLinkedCustomerOrders(context, parsedDeliveryId, "LOADED")

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_LOADED",
      "deliveries",
      parsedDeliveryId,
      {}
    )

    return { deliveryId: parsedDeliveryId, status: "LOADED" as const }
  })
}

export async function startDelivery(deliveryId: string) {
  const parsedDeliveryId = parseService(serviceUuid, deliveryId)

  return runDeliveryService(deliveryDriverRoles, async (context) => {
    const delivery = await getDeliveryForUpdate(context.supabase, parsedDeliveryId)
    assertDriverCanChangeDelivery(delivery, context.profile)

    if (readString(delivery.status) !== "LOADED") {
      throw new Error("Mark this delivery loaded before starting delivery.")
    }

    await updateDeliveryStatus(
      context,
      parsedDeliveryId,
      "OUT_FOR_DELIVERY",
      { started_at: new Date().toISOString() },
      "Delivery started."
    )
    await updateLinkedCustomerOrders(context, parsedDeliveryId, "OUT_FOR_DELIVERY")

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_STARTED",
      "deliveries",
      parsedDeliveryId,
      {}
    )

    return { deliveryId: parsedDeliveryId, status: "OUT_FOR_DELIVERY" as const }
  })
}

export async function uploadDeliveredProofAndComplete(
  deliveryId: string,
  file: File,
  gps: DeliveryGpsInput
) {
  const parsedDeliveryId = parseService(serviceUuid, deliveryId)

  return runDeliveryService(deliveryDriverRoles, (context) =>
    createProofAndComplete(
      context,
      parsedDeliveryId,
      file,
      gps,
      "DELIVERED",
      null,
      null
    )
  )
}

export async function uploadFailedProofAndComplete(
  deliveryId: string,
  file: File,
  gps: DeliveryGpsInput,
  failedReason: DeliveryFailedReason,
  remarks?: string | null
) {
  const parsedDeliveryId = parseService(serviceUuid, deliveryId)
  const parsedFailedReason = parseService(z.enum(deliveryFailedReasons), failedReason)
  const parsedRemarks = remarks?.trim() || null

  return runDeliveryService(deliveryDriverRoles, (context) =>
    createProofAndComplete(
      context,
      parsedDeliveryId,
      file,
      gps,
      "FAILED",
      parsedFailedReason,
      parsedRemarks
    )
  )
}

export async function reportAddressIssue(
  deliveryId: string,
  payload: DeliveryAddressIssuePayload
) {
  const parsedDeliveryId = parseService(serviceUuid, deliveryId)

  return runDeliveryService(deliveryDriverRoles, async (context) => {
    const delivery = await getDeliveryForUpdate(context.supabase, parsedDeliveryId)
    assertDriverCanChangeDelivery(delivery, context.profile)
    await createDeliveryAddressSuggestion(context, delivery, payload)

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_ADDRESS_ISSUE_REPORTED",
      "delivery_address_suggestions",
      parsedDeliveryId,
      {
        suggestedAddress: payload.suggestedAddress ?? null,
        reason: payload.reason,
        note: payload.note ?? null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        photoAttached: Boolean(payload.photoFile),
      }
    )

    return { deliveryId: parsedDeliveryId, status: "PENDING_REVIEW" as const }
  })
}

export async function saveSuggestedCustomerGps(
  deliveryId: string,
  gps: DeliveryGpsInput
) {
  const parsedDeliveryId = parseService(serviceUuid, deliveryId)
  const normalizedGps = normalizeGps(gps)

  if (normalizedGps.gpsUnavailable) {
    throw new Error("GPS coordinates are required to save a customer GPS suggestion.")
  }

  return runDeliveryService(deliveryDriverRoles, async (context) => {
    const delivery = await getDeliveryForUpdate(context.supabase, parsedDeliveryId)
    assertDriverCanChangeDelivery(delivery, context.profile)

    await createDeliveryAddressSuggestion(context, delivery, {
      suggestedAddress: readString(delivery.delivery_address),
      reason: "Driver suggested customer GPS.",
      latitude: normalizedGps.latitude,
      longitude: normalizedGps.longitude,
    })

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_CUSTOMER_GPS_SUGGESTED",
      "delivery_address_suggestions",
      parsedDeliveryId,
      {
        latitude: normalizedGps.latitude,
        longitude: normalizedGps.longitude,
      }
    )

    return { deliveryId: parsedDeliveryId, status: "PENDING_REVIEW" as const }
  })
}

export async function createDeliveryExpense(payload: CreateDeliveryExpensePayload) {
  const parsed = parseService(serviceExpenseSchema, payload)
  assertPhotoFile(payload.receiptFile, "receipt")

  return runDeliveryService(deliveryDriverRoles, async (context) => {
    let deliveryOutletId = scopedServiceOutletId(context.profile, null)
    let deliveryTeamId = scopedServiceTeamId(context.profile, null)
    let deliveryVehicleId = parsed.vehicleId

    if (parsed.deliveryId) {
      const delivery = await getDeliveryForUpdate(context.supabase, parsed.deliveryId)
      assertDriverCanChangeDelivery(delivery, context.profile)
      deliveryOutletId = readString(delivery.outlet_id) || deliveryOutletId
      deliveryTeamId = readString(delivery.delivery_team_id) || deliveryTeamId
      deliveryVehicleId =
        deliveryVehicleId ?? (readString(delivery.vehicle_id) || null)
    }

    const cleanName = safeFileName(payload.receiptFile.name) || "receipt"
    const objectPath = `${context.profile.id}/expenses/${Date.now()}-${cleanName}`
    const fileId = await uploadDeliveryFile(
      context.supabase,
      context.profile,
      payload.receiptFile,
      objectPath,
      "delivery",
      "delivery-expenses"
    )

    const { data, error } = await context.supabase
      .from("delivery_expenses")
      .insert({
        delivery_id: parsed.deliveryId,
        driver_id: context.profile.id,
        outlet_id: deliveryOutletId,
        vehicle_id: deliveryVehicleId,
        delivery_team_id: deliveryTeamId,
        expense_type: parsed.expenseType,
        amount: parsed.amount,
        receipt_file_id: fileId,
        bucket_id: "delivery-expenses",
        object_path: objectPath,
        remark: parsed.remark,
        status: "PENDING",
        created_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const expenseId = readString(asRecord(data).id)

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_EXPENSE_SUBMITTED",
      "delivery_expenses",
      expenseId,
      {
        deliveryId: parsed.deliveryId,
        expenseType: parsed.expenseType,
        amount: parsed.amount,
        fileId,
      }
    )

    return { expenseId, status: "PENDING" as const }
  })
}

export async function reviewDeliveryExpenseAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(managerExpenseReviewSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryManagerRoles, async (context) => {
    const expense = await getDeliveryExpenseForReview(
      context.supabase,
      parsed.expenseId
    )
    await assertManagerCanReviewExpense(context, expense)

    if (readString(expense.status, "PENDING") !== "PENDING") {
      throw new Error("This expense has already been reviewed.")
    }

    const nextStatus = parsed.status as DeliveryExpenseStatus
    const { error } = await context.supabase
      .from("delivery_expenses")
      .update({
        status: nextStatus,
        reviewed_by: context.profile.id,
        reviewed_at: new Date().toISOString(),
        review_note: parsed.reviewNote,
        rejected_reason:
          nextStatus === "REJECTED" ? parsed.rejectedReason : null,
      })
      .eq("id", parsed.expenseId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      nextStatus === "APPROVED"
        ? "DELIVERY_EXPENSE_APPROVED"
        : "DELIVERY_EXPENSE_REJECTED",
      "delivery_expenses",
      parsed.expenseId,
      {
        status: nextStatus,
        rejectedReason: parsed.rejectedReason,
        reviewNote: parsed.reviewNote,
      }
    )

    const deliveryId = readString(expense.delivery_id)

    if (deliveryId) {
      revalidatePath(`/delivery/${deliveryId}`)
    }

    return nextStatus === "APPROVED"
      ? "Expense approved."
      : "Expense rejected."
  })
}

export async function changeDeliveryDriverAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(managerDeliveryDriverSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryManagerRoles, async (context) => {
    const delivery = await getDeliveryForUpdate(context.supabase, parsed.deliveryId)
    assertManagerCanChangeDelivery(delivery, context.profile)

    if (["DELIVERED", "FAILED", "CANCELLED"].includes(readString(delivery.status))) {
      throw new Error("Closed deliveries cannot be reassigned.")
    }

    const { error } = await context.supabase
      .from("deliveries")
      .update({
        driver_id: parsed.driverId,
        updated_by: context.profile.id,
      })
      .eq("id", parsed.deliveryId)

    if (error) {
      throw new Error(error.message)
    }

    await insertDeliveryStatusLog(
      context,
      parsed.deliveryId,
      readString(delivery.status, "AVAILABLE") as DeliveryLifecycleStatus,
      "Manager changed driver."
    )
    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_DRIVER_CHANGED",
      "deliveries",
      parsed.deliveryId,
      { driverId: parsed.driverId }
    )
    revalidatePath(`/delivery/${parsed.deliveryId}`)

    return "Driver updated."
  })
}

export async function changeDeliveryVehicleAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(managerDeliveryVehicleSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryManagerRoles, async (context) => {
    const delivery = await getDeliveryForUpdate(context.supabase, parsed.deliveryId)
    assertManagerCanChangeDelivery(delivery, context.profile)

    if (["DELIVERED", "FAILED", "CANCELLED"].includes(readString(delivery.status))) {
      throw new Error("Closed deliveries cannot change vehicle.")
    }

    const { error } = await context.supabase
      .from("deliveries")
      .update({
        vehicle_id: parsed.vehicleId,
        updated_by: context.profile.id,
      })
      .eq("id", parsed.deliveryId)

    if (error) {
      throw new Error(error.message)
    }

    await insertDeliveryStatusLog(
      context,
      parsed.deliveryId,
      readString(delivery.status, "AVAILABLE") as DeliveryLifecycleStatus,
      "Manager changed vehicle."
    )
    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_VEHICLE_CHANGED",
      "deliveries",
      parsed.deliveryId,
      { vehicleId: parsed.vehicleId }
    )
    revalidatePath(`/delivery/${parsed.deliveryId}`)

    return "Vehicle updated."
  })
}

export async function cancelDeliveryAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(managerCancelDeliverySchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryManagerRoles, async (context) => {
    const delivery = await getDeliveryForUpdate(context.supabase, parsed.deliveryId)
    assertManagerCanChangeDelivery(delivery, context.profile)

    if (["DELIVERED", "FAILED", "CANCELLED"].includes(readString(delivery.status))) {
      throw new Error("This delivery is already closed.")
    }

    await updateDeliveryStatus(
      context,
      parsed.deliveryId,
      "CANCELLED",
      {
        completed_at: new Date().toISOString(),
        remarks: parsed.remarks,
      },
      `Cancelled by manager: ${parsed.remarks}`
    )

    const { error } = await context.supabase
      .from("delivery_orders")
      .update({ status: "CANCELLED" })
      .eq("delivery_id", parsed.deliveryId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_CANCELLED",
      "deliveries",
      parsed.deliveryId,
      { remarks: parsed.remarks }
    )
    revalidatePath(`/delivery/${parsed.deliveryId}`)

    return "Delivery cancelled."
  })
}

export async function reviewDeliveryAddressSuggestionAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(managerAddressSuggestionReviewSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryManagerRoles, async (context) => {
    const delivery = await getDeliveryForUpdate(context.supabase, parsed.deliveryId)
    assertManagerCanChangeDelivery(delivery, context.profile)

    const { data: suggestionData, error: suggestionLoadError } = await context.supabase
      .from("delivery_address_suggestions")
      .select("*")
      .eq("id", parsed.suggestionId)
      .eq("delivery_id", parsed.deliveryId)
      .maybeSingle()

    if (suggestionLoadError) {
      throw new Error(suggestionLoadError.message)
    }

    const suggestion = asRecord(suggestionData)

    if (!suggestion.id) {
      throw new Error("Address suggestion was not found.")
    }

    if (parsed.status === "APPROVED") {
      const customerId =
        readString(suggestion.customer_id) || readString(delivery.customer_id)

      if (!customerId) {
        throw new Error("This suggestion has no linked customer to update.")
      }

      const customerPatch: Record<string, unknown> = {
        updated_by: context.profile.id,
        updated_at: new Date().toISOString(),
      }
      const suggestedAddress = readString(suggestion.suggested_address)
      const suggestedLatitude =
        suggestion.suggested_latitude === null ||
        suggestion.suggested_latitude === undefined
          ? null
          : Number(suggestion.suggested_latitude)
      const suggestedLongitude =
        suggestion.suggested_longitude === null ||
        suggestion.suggested_longitude === undefined
          ? null
          : Number(suggestion.suggested_longitude)

      if (suggestedAddress) {
        customerPatch.address = suggestedAddress
      }

      if (
        Number.isFinite(suggestedLatitude) &&
        Number.isFinite(suggestedLongitude)
      ) {
        customerPatch.latitude = suggestedLatitude
        customerPatch.longitude = suggestedLongitude
      }

      const { error: customerError } = await context.supabase
        .from("customers")
        .update(customerPatch)
        .eq("id", customerId)

      if (customerError) {
        throw new Error(customerError.message)
      }
    }

    const { error } = await context.supabase
      .from("delivery_address_suggestions")
      .update({
        status: parsed.status,
        reviewed_by: context.profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.suggestionId)
      .eq("delivery_id", parsed.deliveryId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_ADDRESS_SUGGESTION_REVIEWED",
      "delivery_address_suggestions",
      parsed.suggestionId,
      {
        deliveryId: parsed.deliveryId,
        customerId:
          readString(suggestion.customer_id) || readString(delivery.customer_id) || null,
        status: parsed.status,
        approvedAddress: readString(suggestion.suggested_address) || null,
        approvedLatitude: suggestion.suggested_latitude ?? null,
        approvedLongitude: suggestion.suggested_longitude ?? null,
      }
    )
    revalidatePath(`/delivery/${parsed.deliveryId}`)

    return `Suggestion ${parsed.status.toLowerCase()}.`
  })
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
    const objectPath = `${parsed.orderId}/proof/${Date.now()}-${cleanName}`
    const fileId = await uploadDeliveryFile(
      context.supabase,
      context.profile,
      fileValue,
      objectPath,
      "delivery",
      "delivery-proofs"
    )
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

export async function acceptDeliveryJobAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(acceptDeliveryJobSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryDriverRoles, async (context) => {
    const job = await ensureJobExists(context.supabase, parsed.jobId)
    const status = readString(job.status)

    if (status !== "AVAILABLE") {
      throw new Error("This delivery is no longer available.")
    }

    const teamId = readString(job.delivery_team_id) || context.profile.departmentId
    const existingVehicleId = readString(job.vehicle_id) || null
    const vehicleId =
      parsed.vehicleId ??
      existingVehicleId ??
      (await defaultVehicleId(context.supabase, teamId))

    const { error } = await context.supabase
      .from("delivery_jobs")
      .update({
        status: "ACCEPTED",
        driver_id: context.profile.id,
        vehicle_id: vehicleId,
        accepted_at: new Date().toISOString(),
        updated_by: context.profile.id,
      })
      .eq("id", parsed.jobId)
      .eq("status", "AVAILABLE")

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_JOB_ACCEPTED",
      "delivery_jobs",
      parsed.jobId,
      { vehicleId }
    )

    return "Delivery accepted."
  })
}

export async function markDeliveryLoadedAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(deliveryJobIdSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryDriverRoles, async (context) => {
    const job = await ensureJobExists(context.supabase, parsed.jobId)
    assertJobAssignedToDriver(job, context.profile)

    if (readString(job.status) !== "ACCEPTED") {
      throw new Error("Accept this delivery before marking it loaded.")
    }

    const { error } = await context.supabase
      .from("delivery_jobs")
      .update({
        status: "LOADED",
        loaded_at: new Date().toISOString(),
        updated_by: context.profile.id,
      })
      .eq("id", parsed.jobId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_JOB_LOADED",
      "delivery_jobs",
      parsed.jobId,
      {}
    )

    return "Delivery marked loaded."
  })
}

export async function startDeliveryJobAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(deliveryJobIdSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryDriverRoles, async (context) => {
    const job = await ensureJobExists(context.supabase, parsed.jobId)
    assertJobAssignedToDriver(job, context.profile)

    if (readString(job.status) !== "LOADED") {
      throw new Error("Mark this delivery loaded before starting delivery.")
    }

    const { error } = await context.supabase
      .from("delivery_jobs")
      .update({
        status: "OUT_FOR_DELIVERY",
        started_at: new Date().toISOString(),
        updated_by: context.profile.id,
      })
      .eq("id", parsed.jobId)

    if (error) {
      throw new Error(error.message)
    }

    await updateLinkedOrdersForStart(context, parsed.jobId)

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_JOB_STARTED",
      "delivery_jobs",
      parsed.jobId,
      {}
    )

    return "Delivery started."
  })
}

export async function reportDeliveryGoodsIssueAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(goodsIssueSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryDriverRoles, async (context) => {
    const job = await ensureJobExists(context.supabase, parsed.jobId)
    assertJobAssignedToDriver(job, context.profile)

    let fileId: string | null = null
    const fileValue = formData.get("issuePhoto")

    if (fileValue instanceof File && fileValue.size > 0) {
      if (!isProofPhoto(fileValue)) {
        throw new Error("Issue photo must be an image.")
      }

      const cleanName = safeFileName(fileValue.name) || "goods-issue"
      fileId = await uploadDeliveryFile(
        context.supabase,
        context.profile,
        fileValue,
        `${parsed.jobId}/issues/${Date.now()}-${cleanName}`,
        "delivery",
        "delivery-proofs"
      )
    }

    const { error } = await context.supabase
      .from("delivery_goods_issues")
      .insert({
        job_id: parsed.jobId,
        issue_reason: parsed.goodsIssueReason,
        remark: parsed.remarks,
        photo_file_id: fileId,
        reported_by: context.profile.id,
      })

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_GOODS_ISSUE_REPORTED",
      "delivery_goods_issues",
      parsed.jobId,
      { reason: parsed.goodsIssueReason, fileId }
    )

    return "Goods issue saved."
  })
}

export async function saveDeliveryAddressIssueAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(addressIssueSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryDriverRoles, async (context) => {
    const job = await ensureJobExists(context.supabase, parsed.jobId)
    assertJobAssignedToDriver(job, context.profile)

    const { error } = await context.supabase
      .from("delivery_address_suggestions")
      .insert({
        job_id: parsed.jobId,
        customer_name: readString(job.customer_name, "Customer"),
        suggested_address: parsed.suggestedAddress,
        suggested_latitude: parsed.latitude,
        suggested_longitude: parsed.longitude,
        reason: parsed.reason,
        status: "PENDING",
        created_by: context.profile.id,
      })

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DELIVERY_ADDRESS_SUGGESTED",
      "delivery_address_suggestions",
      parsed.jobId,
      parsed
    )

    return "Address issue saved for manager review."
  })
}

export async function uploadDeliveryJobProofAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(deliveryJobProofSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  if (parsed.deliveryOutcome === "FAILED" && !parsed.failedReason) {
    return failure("Choose a failed delivery reason.")
  }

  if (parsed.failedReason === "OTHER" && !parsed.remarks) {
    return failure("Enter a short note for Other.")
  }

  return runDeliveryAction(formData, deliveryDriverRoles, async (context) => {
    const job = await ensureJobExists(context.supabase, parsed.jobId)
    assertJobAssignedToDriver(job, context.profile)

    if (readString(job.status) !== "OUT_FOR_DELIVERY") {
      throw new Error("Start delivery before uploading proof.")
    }

    const fileValue = formData.get("proofFile")

    if (!(fileValue instanceof File) || fileValue.size === 0) {
      throw new Error("Take a proof photo before completing delivery.")
    }

    if (!isProofPhoto(fileValue)) {
      throw new Error("Proof must be a photo image.")
    }

    const cleanName = safeFileName(fileValue.name) || "proof"
    const fileId = await uploadDeliveryFile(
      context.supabase,
      context.profile,
      fileValue,
      `${parsed.jobId}/proof/${Date.now()}-${cleanName}`,
      "delivery",
      "delivery-proofs"
    )
    const nextStatus = parsed.deliveryOutcome
    const gpsAvailable =
      parsed.gpsAvailable && parsed.latitude !== null && parsed.longitude !== null

    const { error } = await context.supabase
      .from("delivery_jobs")
      .update({
        status: nextStatus,
        proof_file_id: fileId,
        proof_latitude: parsed.latitude,
        proof_longitude: parsed.longitude,
        gps_available: gpsAvailable,
        failed_reason: parsed.failedReason ?? null,
        goods_issue_reason: parsed.goodsIssueReason ?? null,
        proof_note: parsed.remarks,
        completed_at: new Date().toISOString(),
        updated_by: context.profile.id,
      })
      .eq("id", parsed.jobId)

    if (error) {
      throw new Error(error.message)
    }

    await updateLinkedOrdersForProof(
      context,
      parsed.jobId,
      fileId,
      nextStatus,
      parsed.failedReason ?? null,
      parsed.latitude,
      parsed.longitude,
      parsed.remarks
    )

    if (!gpsAvailable) {
      await insertAuditLog(
        context.supabase,
        context.profile,
        "DELIVERY_PROOF_GPS_UNAVAILABLE",
        "delivery_jobs",
        parsed.jobId,
        { reason: "Phone GPS denied or unavailable" }
      )
    }

    if (gpsAvailable) {
      await context.supabase.from("delivery_address_suggestions").insert({
        job_id: parsed.jobId,
        customer_name: readString(job.customer_name, "Customer"),
        suggested_address: readString(job.delivery_address),
        suggested_latitude: parsed.latitude,
        suggested_longitude: parsed.longitude,
        reason: "Proof GPS captured by driver.",
        status: "PENDING",
        created_by: context.profile.id,
      })
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      nextStatus === "FAILED"
        ? "DELIVERY_JOB_FAILED_PROOF_UPLOADED"
        : "DELIVERY_JOB_DELIVERED_PROOF_UPLOADED",
      "delivery_jobs",
      parsed.jobId,
      {
        fileId,
        status: nextStatus,
        gpsAvailable,
        failedReason: parsed.failedReason,
        goodsIssueReason: parsed.goodsIssueReason,
      }
    )

    return nextStatus === "FAILED"
      ? "Failed proof uploaded. Manager review is required."
      : "Proof uploaded and delivery marked delivered."
  })
}

export async function createDeliveryExpenseAction(
  _state: DeliveryActionState,
  formData: FormData
): Promise<DeliveryActionState> {
  const parsed = parseAction(expenseSchema, formData)

  if (isDeliveryActionState(parsed)) {
    return parsed
  }

  return runDeliveryAction(formData, deliveryDriverRoles, async (context) => {
    const fileValue = formData.get("receiptPhoto")

    if (!(fileValue instanceof File) || fileValue.size === 0) {
      throw new Error("Take a receipt photo before saving expense.")
    }

    if (!isProofPhoto(fileValue)) {
      throw new Error("Receipt must be a photo image.")
    }

    const cleanName = safeFileName(fileValue.name) || "receipt"
    const objectPath = `${context.profile.id}/expenses/${Date.now()}-${cleanName}`
    const fileId = await uploadDeliveryFile(
      context.supabase,
      context.profile,
      fileValue,
      objectPath,
      "delivery",
      "delivery-expenses"
    )

    const { data, error } = await context.supabase
      .from("delivery_expenses")
      .insert({
        driver_id: context.profile.id,
        outlet_id: context.profile.outletId,
        vehicle_id: parsed.vehicleId,
        delivery_team_id: scopedDeliveryTeamId(context.profile),
        expense_type: parsed.expenseType,
        amount: parsed.amount,
        receipt_file_id: fileId,
        bucket_id: "delivery-expenses",
        object_path: objectPath,
        remark: parsed.remark,
        status: "PENDING",
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
      "DELIVERY_EXPENSE_SUBMITTED",
      "delivery_expenses",
      readString(asRecord(data).id),
      { expenseType: parsed.expenseType, amount: parsed.amount, fileId }
    )

    return "Expense saved for approval."
  })
}
