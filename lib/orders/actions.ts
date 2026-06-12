"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
  type UserRole,
} from "@/lib/auth/session"
import { canAccessModule, type ModuleKey } from "@/lib/auth/access"
import { asRecord, readBoolean, readNumber, readString } from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import type { OrdersActionState } from "@/lib/orders/action-state"

const orderRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
]

const deliveryOrderOperatorRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
]

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))

const orderSchema = z.object({
  customerName: z.string().trim().min(2),
  customerPhone: optionalText,
  orderDate: z.string().trim().min(1),
  requiredDate: optionalText,
  fulfillmentType: z.enum(["PICKUP", "DELIVERY", "INTERNAL_TRANSFER"]),
  deliveryRequired: z.coerce.boolean().default(false),
  outletId: optionalId,
  departmentId: optionalId,
  remarks: optionalText,
})

const orderItemSchema = z.object({
  orderId: z.string().trim().min(1),
  itemId: z.string().trim().min(1),
  requestedQuantity: z.coerce.number().min(0),
  requestedWeightKg: z.coerce.number().min(0),
  notes: optionalText,
}).refine(
  (value) => value.requestedQuantity > 0 || value.requestedWeightKg > 0,
  "Requested quantity or requested weight is required."
)

const prepareItemSchema = z.object({
  orderItemId: z.string().trim().min(1),
  preparedQuantity: z.coerce.number().min(0),
  preparedWeightKg: z.coerce.number().min(0),
  notes: optionalText,
}).refine(
  (value) => value.preparedQuantity > 0 || value.preparedWeightKg > 0,
  "Prepared quantity or prepared weight is required."
)

const orderIdSchema = z.object({
  orderId: z.string().trim().min(1),
})

const releaseReservationsSchema = z.object({
  orderId: z.string().trim().min(1),
  releaseReason: z.string().trim().min(2),
})

const deliveryStatusSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.enum(["OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "CANCELLED"]),
  notes: optionalText,
})

const proofUploadSchema = z.object({
  orderId: z.string().trim().min(1),
  deliveryOutcome: z.enum(["DELIVERED", "FAILED"]).default("DELIVERED"),
  receiverName: z.string().trim().min(2),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  notes: optionalText,
})

type OrdersActionContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function success(message: string): OrdersActionState {
  return { status: "success", message }
}

function failure(message: string): OrdersActionState {
  return { status: "error", message }
}

function isAdminOrDirector(profile: CurrentProfile) {
  return hasAnyRole(profile, ["admin", "director"])
}

function scopedOutletId(profile: CurrentProfile, requestedOutletId: string | null) {
  if (isAdminOrDirector(profile)) {
    return requestedOutletId
  }

  return profile.outletId
}

function scopedDepartmentId(
  profile: CurrentProfile,
  requestedDepartmentId: string | null
) {
  if (isAdminOrDirector(profile)) {
    return requestedDepartmentId
  }

  return profile.departmentId
}

function parseAction<T>(
  schema: z.ZodType<T>,
  formData: FormData
): T | OrdersActionState {
  const parsed = schema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the form fields.")
  }

  return parsed.data
}

async function getActionContext(roles: UserRole[], moduleKey: ModuleKey) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: "Sign in before changing orders." }
  }

  if (!hasAnyRole(profile, roles)) {
    return { error: "Your role does not allow this order action." }
  }

  if (!canAccessModule(profile, moduleKey)) {
    return { error: `Your outlet does not have ${moduleKey.replaceAll("_", " ")} access.` }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { profile, demoMode: true }
  }

  return { profile, supabase, demoMode: false }
}

function isOrdersActionState(value: unknown): value is OrdersActionState {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "status" in value
  )
}

function revalidateOrderPaths() {
  [
    "/dashboard",
    "/orders",
    "/orders/new",
    "/orders/prepare",
    "/stock/outbound",
    "/delivery/orders",
    "/delivery/driver",
    "/delivery/dashboard",
  ].forEach((path) => revalidatePath(path))
}

async function runOrdersAction(
  formData: FormData,
  roles: UserRole[],
  moduleKey: ModuleKey,
  callback: (
    context: OrdersActionContext,
    formData: FormData
  ) => Promise<string>
) {
  const context = await getActionContext(roles, moduleKey)

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
    revalidateOrderPaths()
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

async function getOrder(supabase: SupabaseServerClient, orderId: string) {
  const { data, error } = await supabase
    .from("customer_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const order = asRecord(data)

  if (!order.id) {
    throw new Error("Order was not found.")
  }

  return order
}

function assertOrderEditable(order: Record<string, unknown>, action: string) {
  const status = readString(order.status)

  if (status === "NEW" || status === "PREPARING") {
    return
  }

  throw new Error(
    `Order is ${status || "not open"} and cannot ${action} after it is ready or closed.`
  )
}

async function getOrderItem(
  supabase: SupabaseServerClient,
  orderItemId: string
) {
  const { data, error } = await supabase
    .from("customer_order_items")
    .select("*")
    .eq("id", orderItemId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const item = asRecord(data)

  if (!item.id) {
    throw new Error("Order item was not found.")
  }

  return item
}

async function assertOrderHasNoActiveReservations(
  supabase: SupabaseServerClient,
  orderId: string
) {
  const { data, error } = await supabase
    .from("order_stock_reservations")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (asRecord(data).id) {
    throw new Error(
      "Stock is already reserved for this order. Cancel and recreate the order if changes are needed."
    )
  }
}

async function getOrderItems(supabase: SupabaseServerClient, orderId: string) {
  const { data, error } = await supabase
    .from("customer_order_items")
    .select("*")
    .eq("order_id", orderId)

  if (error) {
    throw new Error(error.message)
  }

  return Array.isArray(data) ? data.map(asRecord) : []
}

async function assertOrderReadyForHandoff(
  supabase: SupabaseServerClient,
  orderId: string
) {
  const items = await getOrderItems(supabase, orderId)

  if (items.length === 0) {
    throw new Error("Add at least one order item before marking the order ready.")
  }

  const incomplete = items.filter((item) => {
    if (readString(item.status) !== "PREPARED") {
      return true
    }

    return (
      readNumber(item.prepared_quantity) <= 0 &&
      readNumber(item.prepared_weight_kg) <= 0
    )
  })

  if (incomplete.length > 0) {
    throw new Error(
      "Prepare every order item with quantity or weight before marking the order ready."
    )
  }
}

function allowedDeliveryStatuses(currentStatus: string) {
  if (currentStatus === "READY_FOR_DELIVERY") {
    return ["OUT_FOR_DELIVERY", "FAILED", "CANCELLED"]
  }

  if (currentStatus === "OUT_FOR_DELIVERY") {
    return ["DELIVERED", "FAILED", "CANCELLED"]
  }

  return []
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
    "Upload proof of delivery before marking this customer order delivered or failed."
  )
}

async function insertNotificationEvent(
  context: OrdersActionContext,
  orderId: string,
  eventType: "READY_TO_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED"
) {
  await context.supabase.from("order_notification_events").insert({
    order_id: orderId,
    event_type: eventType,
    channel: "WHATSAPP",
    status: "PENDING",
    created_by: context.profile.id,
    payload: { source: "erp_placeholder", eventType },
  })
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

export async function createCustomerOrderAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(orderSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const outletId = scopedOutletId(context.profile, parsed.outletId)
    const departmentId = scopedDepartmentId(context.profile, parsed.departmentId)

    if (!outletId) {
      throw new Error("Choose an outlet before creating orders.")
    }

    const orderNo = `ORD-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now().toString().slice(-5)}`
    const deliveryRequired =
      parsed.deliveryRequired || parsed.fulfillmentType === "DELIVERY"
    const { data, error } = await context.supabase
      .from("customer_orders")
      .insert({
        order_no: orderNo,
        customer_name: parsed.customerName,
        customer_phone: parsed.customerPhone,
        order_date: parsed.orderDate,
        required_date: parsed.requiredDate,
        fulfillment_type: deliveryRequired ? "DELIVERY" : parsed.fulfillmentType,
        delivery_required: deliveryRequired,
        status: "NEW",
        remarks: parsed.remarks,
        outlet_id: outletId,
        department_id: departmentId,
        created_by: context.profile.id,
        updated_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const orderId = readString(asRecord(data).id)
    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_CREATED",
      "customer_orders",
      orderId,
      { ...parsed, orderNo, deliveryRequired }
    )

    return `Order ${orderNo} created.`
  })
}

export async function addCustomerOrderItemAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(orderItemSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const order = await getOrder(context.supabase, parsed.orderId)
    assertOrderEditable(order, "add items")
    await assertOrderHasNoActiveReservations(context.supabase, parsed.orderId)

    const { data, error } = await context.supabase
      .from("customer_order_items")
      .insert({
        order_id: parsed.orderId,
        item_id: parsed.itemId,
        requested_quantity: parsed.requestedQuantity,
        requested_weight_kg: parsed.requestedWeightKg,
        status: "REQUESTED",
        notes: parsed.notes,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const orderItemId = readString(asRecord(data).id)

    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_ITEM_ADDED",
      "customer_order_items",
      orderItemId,
      parsed
    )

    return "Order item added."
  })
}

export async function prepareCustomerOrderItemAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(prepareItemSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const item = await getOrderItem(context.supabase, parsed.orderItemId)
    const orderId = readString(item.order_id)
    const order = await getOrder(context.supabase, orderId)
    assertOrderEditable(order, "prepare items")

    const { error } = await context.supabase
      .rpc("prepare_customer_order_item_with_reservation", {
        p_order_item_id: parsed.orderItemId,
        p_prepared_quantity: parsed.preparedQuantity,
        p_prepared_weight_kg: parsed.preparedWeightKg,
        p_stock_location_id: context.profile.stockLocationId,
        p_notes: parsed.notes,
      })
      .single()

    if (error) {
      throw new Error(`Could not prepare item and reserve stock: ${error.message}`)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_ITEM_PREPARED",
      "customer_order_items",
      parsed.orderItemId,
      parsed
    )

    return "Prepared item weight saved."
  })
}

export async function markCustomerOrderReadyAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(orderIdSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const order = await getOrder(context.supabase, parsed.orderId)
    const currentStatus = readString(order.status)

    if (!["NEW", "PREPARING", "READY"].includes(currentStatus)) {
      throw new Error(`Order is ${currentStatus || "not open"} and cannot be marked ready.`)
    }

    await assertOrderReadyForHandoff(context.supabase, parsed.orderId)

    const deliveryRequired = readBoolean(order.delivery_required)
    const nextStatus = deliveryRequired ? "READY_FOR_DELIVERY" : "READY_FOR_PICKUP"

    const { error } = await context.supabase
      .from("customer_orders")
      .update({
        status: nextStatus,
        updated_by: context.profile.id,
      })
      .eq("id", parsed.orderId)

    if (error) {
      throw new Error(error.message)
    }

    await insertNotificationEvent(context, parsed.orderId, "READY_TO_PICKUP")
    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_READY",
      "customer_orders",
      parsed.orderId,
      { nextStatus }
    )

    return deliveryRequired
      ? "Order marked ready for delivery."
      : "Order marked ready for pickup."
  })
}

export async function releaseOrderReservationsAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(releaseReservationsSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const order = await getOrder(context.supabase, parsed.orderId)
    const currentStatus = readString(order.status)

    if (currentStatus !== "CANCELLED") {
      throw new Error(
        "Order must be cancelled before releasing reserved stock."
      )
    }

    const { data, error } = await context.supabase
      .from("order_stock_reservations")
      .update({ status: "RELEASED" })
      .eq("order_id", parsed.orderId)
      .eq("status", "ACTIVE")
      .select("id")

    if (error) {
      throw new Error(error.message)
    }

    const released = Array.isArray(data) ? data.length : 0

    if (released === 0) {
      throw new Error("No active reservations found for this cancelled order.")
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_RESERVATIONS_RELEASED",
      "customer_orders",
      parsed.orderId,
      {
        orderNo: readString(order.order_no),
        released,
        releaseReason: parsed.releaseReason,
      }
    )

    revalidatePath(`/orders/${parsed.orderId}`)

    return `${released} reservation${released === 1 ? "" : "s"} released.`
  })
}

export async function updateCustomerOrderDeliveryStatusAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(deliveryStatusSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(
    formData,
    deliveryOrderOperatorRoles,
    "delivery",
    async (context) => {
      const order = await getOrder(context.supabase, parsed.orderId)

      if (!readBoolean(order.delivery_required)) {
        throw new Error("Only delivery-required customer orders can be updated here.")
      }

      const currentStatus = readString(order.status)

      if (parsed.status === "FAILED") {
        throw new Error(
          "Upload failed delivery proof so receiver/contact, photo, GPS, and stock return workflow are recorded."
        )
      }

      if (!["READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"].includes(currentStatus)) {
        throw new Error(
          `Order is ${currentStatus || "not ready"} and cannot be updated from delivery.`
        )
      }

      if (!allowedDeliveryStatuses(currentStatus).includes(parsed.status)) {
        throw new Error(
          `Delivery order cannot move from ${currentStatus} to ${parsed.status}.`
        )
      }

      assertProofBeforeDeliveryCompletion(order, parsed.status)

      const { error } = await context.supabase
        .from("customer_orders")
        .update({
          status: parsed.status,
          remarks: parsed.notes ?? readString(order.remarks),
          updated_by: context.profile.id,
        })
        .eq("id", parsed.orderId)

      if (error) {
        throw new Error(error.message)
      }

      if (parsed.status === "OUT_FOR_DELIVERY") {
        await insertNotificationEvent(context, parsed.orderId, "OUT_FOR_DELIVERY")
      }

      if (parsed.status === "DELIVERED") {
        await insertNotificationEvent(context, parsed.orderId, "DELIVERED")
      }

      await insertAuditLog(
        context.supabase,
        context.profile,
        "CUSTOMER_ORDER_DELIVERY_STATUS_UPDATED",
        "customer_orders",
        parsed.orderId,
        { from: currentStatus, to: parsed.status, notes: parsed.notes }
      )

      return `Customer order marked ${parsed.status.replaceAll("_", " ")}.`
    }
  )
}

export async function uploadCustomerOrderProofAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(proofUploadSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(
    formData,
    deliveryOrderOperatorRoles,
    "delivery",
    async (context) => {
      const order = await getOrder(context.supabase, parsed.orderId)

      if (!readBoolean(order.delivery_required)) {
        throw new Error("Only delivery-required customer orders can receive proof photos.")
      }

      const currentStatus = readString(order.status)

      const allowedProofStatuses =
        parsed.deliveryOutcome === "FAILED"
          ? ["OUT_FOR_DELIVERY", "FAILED"]
          : ["OUT_FOR_DELIVERY", "DELIVERED"]

      if (!allowedProofStatuses.includes(currentStatus)) {
        throw new Error(
          parsed.deliveryOutcome === "FAILED"
            ? "Failed delivery proof can only be uploaded after the customer order is out for delivery."
            : "Proof photos can only complete customer orders after they are out for delivery."
        )
      }

      const fileValue = formData.get("proofFile")

      if (!(fileValue instanceof File) || fileValue.size === 0) {
        throw new Error("Choose a proof of delivery photo.")
      }

      if (!isProofPhoto(fileValue)) {
        throw new Error("Proof of delivery must be a photo image file.")
      }

      const cleanName = safeFileName(fileValue.name) || "proof"
      const objectPath = `orders/proof/${parsed.orderId}/${Date.now()}-${cleanName}`
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
          module: "orders",
          mime_type: fileValue.type || null,
          size_bytes: fileValue.size,
        })
        .select("id")
        .single()

      if (fileError) {
        throw new Error(fileError.message)
      }

      const fileId = readString(asRecord(fileData).id)
      const orderRpc =
        parsed.deliveryOutcome === "FAILED"
          ? context.supabase
              .rpc("fail_customer_order_delivery_with_proof", {
                p_order_id: parsed.orderId,
                p_file_id: fileId,
                p_contact_name: parsed.receiverName,
                p_latitude: parsed.latitude,
                p_longitude: parsed.longitude,
                p_notes: parsed.notes,
              })
              .single()
          : context.supabase.rpc("complete_customer_order_delivery_with_proof", {
              p_order_id: parsed.orderId,
              p_file_id: fileId,
              p_receiver_name: parsed.receiverName,
              p_latitude: parsed.latitude,
              p_longitude: parsed.longitude,
            })

      const { data: returnData, error: orderError } = await orderRpc

      if (orderError) {
        throw new Error(orderError.message)
      }

      if (parsed.deliveryOutcome === "DELIVERED") {
        await insertNotificationEvent(context, parsed.orderId, "DELIVERED")
      }

      await insertAuditLog(
        context.supabase,
        context.profile,
        parsed.deliveryOutcome === "FAILED"
          ? "CUSTOMER_ORDER_FAILED_PROOF_UPLOADED"
          : "CUSTOMER_ORDER_PROOF_UPLOADED",
        "customer_orders",
        parsed.orderId,
        {
          orderNo: readString(order.order_no),
          objectPath,
          fileId,
          receiverName: parsed.receiverName,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          status: parsed.deliveryOutcome,
          returnResult: returnData,
        }
      )

      return parsed.deliveryOutcome === "FAILED"
        ? "Failed delivery proof uploaded and barcode stock return workflow recorded."
        : "Customer order proof photo uploaded and order marked delivered."
    }
  )
}
