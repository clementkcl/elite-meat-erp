"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { canAccessModule, type ModuleKey } from "@/lib/auth/access"
import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
  type UserRole,
} from "@/lib/auth/session"
import { asRecord, asRecordArray, readBoolean, readNumber, readString } from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import type { OrdersActionState } from "@/lib/orders/action-state"
import { manualPickReasons, orderUnits } from "@/lib/orders/types"

const orderRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
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
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))

const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))

const orderLineSchema = z
  .object({
    itemId: z.string().trim().min(1),
    orderingUnit: z.enum(orderUnits),
    requestedQuantity: z.coerce.number().min(0).default(0),
    estimatedWeightKg: z.coerce.number().min(0).default(0),
    processingRequired: z.coerce.boolean().default(false),
    preferredBrandId: optionalId,
    customization: z.record(z.string(), z.array(z.string().trim().min(1))).optional().default({}),
    remarks: z.string().trim().optional().default(""),
  })
  .refine(
    (value) => value.requestedQuantity > 0 || value.estimatedWeightKg > 0,
    "Each order item needs quantity or estimated kg."
  )

const createOrderSchema = z.object({
  fulfillmentType: z.enum(["PICKUP", "DELIVERY", "INTERNAL_TRANSFER"]),
  customerId: optionalId,
  newCustomerName: optionalText,
  newCustomerPhone: optionalText,
  scheduledAt: z.string().trim().min(1, "Choose required date and time."),
  pickupLocationId: optionalId,
  fromLocationId: optionalId,
  toLocationId: optionalId,
  deliveryAddress: optionalText,
  totalOrderPrice: z.coerce.number().min(0).default(0),
  customerRemarks: optionalText,
  remarks: optionalText,
  outletId: optionalId,
  departmentId: optionalId,
  itemsJson: z.string().trim().min(2),
})

const quickCustomerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required."),
  phone: z.string().trim().min(3, "Customer phone is required."),
  address: optionalText,
  remarks: optionalText,
  isActive: z.enum(["on"]).optional(),
  outletId: optionalId,
})

const editOrderSchema = z.object({
  orderId: z.string().trim().min(1),
  scheduledAt: z.string().trim().min(1),
  totalOrderPrice: z.coerce.number().min(0),
  deliveryAddress: optionalText,
  customerRemarks: optionalText,
  remarks: optionalText,
})

const barcodePickSchema = z.object({
  orderId: z.string().trim().min(1),
  orderItemId: z.string().trim().min(1),
  barcode: z.string().trim().min(1, "Scan or type a barcode."),
})

const manualPickSchema = z.object({
  orderItemId: z.string().trim().min(1),
  pickedQuantity: z.coerce.number().min(0).default(0),
  pickedWeightKg: z.coerce.number().min(0).default(0),
  manualReason: z.enum(manualPickReasons),
  notes: optionalText,
}).refine(
  (value) => value.pickedQuantity > 0 || value.pickedWeightKg > 0,
  "Manual picking needs quantity or weight."
)

const orderIdSchema = z.object({
  orderId: z.string().trim().min(1),
})

const finalPriceSchema = z.object({
  orderId: z.string().trim().min(1),
  totalOrderPrice: z.coerce.number().positive("Enter final total price."),
})

const releaseReservationsSchema = z.object({
  orderId: z.string().trim().min(1),
  releaseReason: optionalText,
})

const cancelOrderSchema = z.object({
  orderId: z.string().trim().min(1),
  cancellationReason: z.string().trim().min(2, "Enter a cancellation reason."),
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

type ParsedOrderLine = z.infer<typeof orderLineSchema>

type ReservationLine = ParsedOrderLine & {
  orderItemId: string
}

function readCustomization(value: unknown): Record<string, string[]> {
  const record = asRecord(value)
  const customization: Record<string, string[]> = {}

  for (const [key, optionValues] of Object.entries(record)) {
    if (!Array.isArray(optionValues)) {
      continue
    }

    const values = optionValues
      .map((optionValue) => readString(optionValue))
      .filter(Boolean)

    if (values.length > 0) {
      customization[key] = values
    }
  }

  return customization
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

function isOrdersActionState(value: unknown): value is OrdersActionState {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "status" in value
  )
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

function revalidateOrderPaths(orderId?: string) {
  [
    "/dashboard",
    "/orders",
    "/orders/create",
    "/orders/picking",
    "/orders/ready",
    "/orders/customers",
    "/delivery/orders",
    "/delivery/driver",
    "/delivery/dashboard",
  ].forEach((path) => revalidatePath(path))

  if (orderId) {
    revalidatePath(`/orders/${orderId}`)
  }
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

async function getOrderItems(supabase: SupabaseServerClient, orderId: string) {
  const { data, error } = await supabase
    .from("customer_order_items")
    .select("*")
    .eq("order_id", orderId)

  if (error) {
    throw new Error(error.message)
  }

  return asRecordArray(data)
}

async function hasPickingStarted(supabase: SupabaseServerClient, orderId: string) {
  const { data, error } = await supabase
    .from("order_picking_entries")
    .select("id")
    .eq("order_id", orderId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(asRecord(data).id)
}

function assertOrderOpenForPicking(order: Record<string, unknown>) {
  const status = readString(order.status)

  if (status === "NEW" || status === "PREPARING") {
    return
  }

  throw new Error(
    `Order is ${status || "not open"} and cannot be picked now.`
  )
}

function endOfLocalDay(value: string) {
  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    const fallback = new Date()
    fallback.setHours(23, 59, 59, 999)
    return fallback.toISOString()
  }

  date.setHours(23, 59, 59, 999)
  return date.toISOString()
}

function scheduledDate(value: string) {
  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

async function insertNotificationEvent(
  context: OrdersActionContext,
  orderId: string,
  eventType: "READY_TO_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED"
) {
  await context.supabase.from("order_notification_events").insert({
    order_id: orderId,
    event_type: eventType,
    channel: "IN_APP",
    status: "SENT",
    created_by: context.profile.id,
    payload: {
      source: "manual_erp_v1",
      eventType,
      method: "dashboard_alert",
      note: "In-app notification only. WhatsApp is disabled in V1.",
    },
  })
}

async function createLinkedDeliveryFromOrder(
  context: OrdersActionContext,
  orderId: string
) {
  const { data, error } = await context.supabase
    .rpc("create_delivery_from_customer_order", {
      p_order_id: orderId,
      p_allow_related: false,
    })
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const result = asRecord(data)
  const deliveryId = readString(result.delivery_id)
  const deliveryNo = readString(result.delivery_no)
  const created = Boolean(result.created)
  const order = await getOrder(context.supabase, orderId)
  const customerRemarks = readString(order.customer_remarks)

  if (deliveryId && customerRemarks) {
    await context.supabase
      .from("deliveries")
      .update({ delivery_note: customerRemarks })
      .eq("id", deliveryId)
  }

  await insertAuditLog(
    context.supabase,
    context.profile,
    created ? "ORDER_DELIVERY_CREATED" : "ORDER_DELIVERY_REUSED",
    "deliveries",
    deliveryId,
    { orderId, deliveryNo, created }
  )

  return { deliveryId, deliveryNo, created }
}

async function loadCustomer(
  supabase: SupabaseServerClient,
  customerId: string | null
) {
  if (!customerId) {
    return null
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const customer = asRecord(data)

  return customer.id ? customer : null
}

async function createQuickCustomer(
  context: OrdersActionContext,
  name: string,
  phone: string,
  outletId: string | null,
  options: {
    address?: string | null
    remarks?: string | null
    isActive?: boolean
  } = {}
) {
  const { data, error } = await context.supabase
    .from("customers")
    .insert({
      name,
      phone,
      address: options.address ?? null,
      remarks: options.remarks ?? null,
      is_active: options.isActive ?? true,
      outlet_id: outletId,
      created_by: context.profile.id,
      updated_by: context.profile.id,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return asRecord(data)
}

async function availableStockWeightKg(
  supabase: SupabaseServerClient,
  itemId: string,
  locationId: string | null,
  excludeOrderId: string | null = null,
  preferredBrandId: string | null = null
) {
  const physicalWeight = await physicalStockWeightKg(
    supabase,
    itemId,
    locationId,
    preferredBrandId
  )
  const reservedWeight = await activeReservedStockWeightKg(
    supabase,
    itemId,
    locationId,
    excludeOrderId,
    preferredBrandId
  )

  return physicalWeight - reservedWeight
}

async function physicalStockWeightKg(
  supabase: SupabaseServerClient,
  itemId: string,
  locationId: string | null,
  preferredBrandId: string | null = null
) {
  let query = supabase
    .from("stock_units")
    .select("net_weight_kg")
    .eq("item_id", itemId)
    .in("status", ["IN_STOCK", "RETURNED"])

  if (locationId) {
    query = query.eq("location_id", locationId)
  }

  if (preferredBrandId) {
    query = query.eq("brand_id", preferredBrandId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return asRecordArray(data).reduce(
    (sum, row) => sum + readNumber(row.net_weight_kg),
    0
  )
}

async function activeReservedStockWeightKg(
  supabase: SupabaseServerClient,
  itemId: string,
  locationId: string | null,
  excludeOrderId: string | null = null,
  preferredBrandId: string | null = null
) {
  let query = supabase
    .from("order_stock_reservations")
    .select("reserved_weight_kg, preferred_brand_id")
    .eq("item_id", itemId)
    .eq("status", "ACTIVE")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  if (locationId) {
    query = query.eq("location_id", locationId)
  }

  if (excludeOrderId) {
    query = query.neq("order_id", excludeOrderId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return asRecordArray(data)
    .filter((row) => {
      const reservedBrandId = readString(row.preferred_brand_id)

      return !preferredBrandId || !reservedBrandId || reservedBrandId === preferredBrandId
    })
    .reduce((sum, row) => sum + readNumber(row.reserved_weight_kg), 0)
}

async function stockUnitByBarcode(
  supabase: SupabaseServerClient,
  barcode: string
) {
  const { data, error } = await supabase
    .from("stock_units")
    .select("*")
    .eq("barcode", barcode)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const unit = asRecord(data)

  return unit.id ? unit : null
}

function parseOrderLines(itemsJson: string) {
  let raw: unknown

  try {
    raw = JSON.parse(itemsJson)
  } catch {
    throw new Error("Order items could not be read. Add at least one item.")
  }

  const parsed = z.array(orderLineSchema).min(1).safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Check order items.")
  }

  return parsed.data
}

function validateCreateOrderLines(lines: ReturnType<typeof parseOrderLines>) {
  const missingEstimatedWeight = lines.find((line) => line.estimatedWeightKg <= 0)

  if (missingEstimatedWeight) {
    throw new Error("Estimated kg is required for every order item so stock can be reserved.")
  }

  const missingQuantity = lines.find(
    (line) => line.orderingUnit !== "KG" && line.requestedQuantity <= 0
  )

  if (missingQuantity) {
    throw new Error("Carton, packet, and quantity orders need quantity plus estimated kg.")
  }
}

function orderReservationLocation(order: Record<string, unknown>) {
  return (
    readString(order.from_location_id) ||
    readString(order.pickup_location_id) ||
    null
  )
}

async function expireEndOfDayReservations(
  context: OrdersActionContext,
  now = new Date()
) {
  const { data, error } = await context.supabase
    .from("order_stock_reservations")
    .update({
      status: "RELEASED",
      updated_at: now.toISOString(),
    })
    .eq("status", "ACTIVE")
    .lte("expires_at", now.toISOString())
    .select("id, order_id")

  if (error) {
    throw new Error(error.message)
  }

  return asRecordArray(data)
}

async function releaseOrderReservations(
  context: OrdersActionContext,
  orderId: string
) {
  const { data, error } = await context.supabase
    .from("order_stock_reservations")
    .update({
      status: "RELEASED",
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .eq("status", "ACTIVE")
    .select("id")

  if (error) {
    throw new Error(error.message)
  }

  return asRecordArray(data).length
}

async function setOrderStockStatus(
  context: OrdersActionContext,
  orderId: string,
  stockNotEnough: boolean
) {
  const { error } = await context.supabase
    .from("customer_orders")
    .update({
      stock_not_enough: stockNotEnough,
      updated_by: context.profile.id,
    })
    .eq("id", orderId)

  if (error) {
    throw new Error(error.message)
  }
}

async function reserveOrderStockLines(
  context: OrdersActionContext,
  orderId: string,
  lines: ReservationLine[],
  locationId: string | null,
  expiresAt: string
) {
  await expireEndOfDayReservations(context)

  let anyStockNotEnough = false

  for (const line of lines) {
    const availableWeight = await availableStockWeightKg(
      context.supabase,
      line.itemId,
      locationId,
      null,
      line.preferredBrandId
    )
    const stockNotEnough = availableWeight < line.estimatedWeightKg
    anyStockNotEnough = anyStockNotEnough || stockNotEnough

    const { error: itemError } = await context.supabase
      .from("customer_order_items")
      .update({ stock_not_enough: stockNotEnough })
      .eq("id", line.orderItemId)

    if (itemError) {
      throw new Error(itemError.message)
    }

    const { error: reservationError } = await context.supabase
      .from("order_stock_reservations")
      .insert({
        order_id: orderId,
        order_item_id: line.orderItemId,
        item_id: line.itemId,
        preferred_brand_id: line.preferredBrandId,
        location_id: locationId,
        reserved_quantity: line.requestedQuantity,
        reserved_weight_kg: line.estimatedWeightKg,
        status: "ACTIVE",
        expires_at: expiresAt,
        stock_not_enough: stockNotEnough,
        created_by: context.profile.id,
      })

    if (reservationError) {
      throw new Error(reservationError.message)
    }
  }

  await setOrderStockStatus(context, orderId, anyStockNotEnough)

  return anyStockNotEnough
}

async function reserveOrderStockForOrder(
  context: OrdersActionContext,
  orderId: string
) {
  const order = await getOrder(context.supabase, orderId)
  const items = await getOrderItems(context.supabase, orderId)
  const locationId = orderReservationLocation(order)
  const expiresAt =
    readString(order.reservation_expires_at) ||
    endOfLocalDay(readString(order.required_at, new Date().toISOString()))
  const activeReservationItemIds = new Set<string>()
  const { data, error } = await context.supabase
    .from("order_stock_reservations")
    .select("order_item_id")
    .eq("order_id", orderId)
    .eq("status", "ACTIVE")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

  if (error) {
    throw new Error(error.message)
  }

  asRecordArray(data).forEach((reservation) => {
    const orderItemId = readString(reservation.order_item_id)

    if (orderItemId) {
      activeReservationItemIds.add(orderItemId)
    }
  })

  const lines = items
    .filter((item) => !activeReservationItemIds.has(readString(item.id)))
    .map((item) => ({
      orderItemId: readString(item.id),
      itemId: readString(item.item_id),
      orderingUnit: orderUnits.includes(readString(item.ordering_unit) as ParsedOrderLine["orderingUnit"])
        ? (readString(item.ordering_unit) as ParsedOrderLine["orderingUnit"])
        : "KG",
      requestedQuantity: readNumber(item.requested_quantity),
      estimatedWeightKg: readNumber(
        item.estimated_weight_kg,
        readNumber(item.requested_weight_kg)
      ),
      processingRequired: readBoolean(item.processing_required),
      remarks: readString(item.item_request_remarks, readString(item.notes)),
      preferredBrandId: readString(item.preferred_brand_id) || null,
      customization: readCustomization(item.customization),
    }))

  if (lines.length === 0) {
    return recalculateOrderStockStatus(context, orderId)
  }

  return reserveOrderStockLines(context, orderId, lines, locationId, expiresAt)
}

async function recalculateOrderStockStatus(
  context: OrdersActionContext,
  orderId: string
) {
  const order = await getOrder(context.supabase, orderId)
  const items = await getOrderItems(context.supabase, orderId)
  const locationId = orderReservationLocation(order)
  let anyStockNotEnough = false

  await expireEndOfDayReservations(context)

  for (const item of items) {
    const itemId = readString(item.item_id)
    const orderItemId = readString(item.id)
    const requiredWeight = readNumber(
      item.estimated_weight_kg,
      readNumber(item.requested_weight_kg)
    )
    const availableWeight = await availableStockWeightKg(
      context.supabase,
      itemId,
      locationId,
      orderId,
      readString(item.preferred_brand_id) || null
    )
    const stockNotEnough = availableWeight < requiredWeight
    anyStockNotEnough = anyStockNotEnough || stockNotEnough

    const { error: itemError } = await context.supabase
      .from("customer_order_items")
      .update({ stock_not_enough: stockNotEnough })
      .eq("id", orderItemId)

    if (itemError) {
      throw new Error(itemError.message)
    }

    const { error: reservationError } = await context.supabase
      .from("order_stock_reservations")
      .update({
        stock_not_enough: stockNotEnough,
        updated_at: new Date().toISOString(),
      })
      .eq("order_item_id", orderItemId)
      .eq("status", "ACTIVE")

    if (reservationError) {
      throw new Error(reservationError.message)
    }
  }

  await setOrderStockStatus(context, orderId, anyStockNotEnough)

  return anyStockNotEnough
}

export async function createCustomerOrderAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(createOrderSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const outletId = scopedOutletId(context.profile, parsed.outletId)
    const departmentId = scopedDepartmentId(context.profile, parsed.departmentId)

    if (!outletId) {
      throw new Error("Choose an outlet before creating orders.")
    }

    const lines = parseOrderLines(parsed.itemsJson)
    validateCreateOrderLines(lines)
    let customer = await loadCustomer(context.supabase, parsed.customerId)

    if (!customer && parsed.fulfillmentType !== "INTERNAL_TRANSFER") {
      if (!parsed.newCustomerName || !parsed.newCustomerPhone) {
        throw new Error("Choose a customer or quick add name and phone.")
      }

      customer = await createQuickCustomer(
        context,
        parsed.newCustomerName,
        parsed.newCustomerPhone,
        outletId,
        {
          address:
            parsed.fulfillmentType === "DELIVERY" ? parsed.deliveryAddress : null,
          remarks: parsed.customerRemarks,
        }
      )
    }

    const deliveryRequired =
      parsed.fulfillmentType === "DELIVERY" ||
      parsed.fulfillmentType === "INTERNAL_TRANSFER"
    const reservationLocationId =
      parsed.fromLocationId ??
      parsed.pickupLocationId ??
      context.profile.stockLocationId

    if (
      parsed.fulfillmentType === "PICKUP" &&
      !parsed.pickupLocationId &&
      !context.profile.stockLocationId
    ) {
      throw new Error("Choose a pickup location before creating a pickup order.")
    }

    if (parsed.fulfillmentType === "INTERNAL_TRANSFER") {
      if (!parsed.fromLocationId || !parsed.toLocationId) {
        throw new Error("Choose both from and to locations for internal transfer.")
      }

      if (parsed.fromLocationId === parsed.toLocationId) {
        throw new Error("Internal transfer locations must be different.")
      }
    }

    for (const line of lines) {
      if (!line.preferredBrandId) {
        continue
      }

      const availableBrandWeight = await availableStockWeightKg(
        context.supabase,
        line.itemId,
        reservationLocationId,
        null,
        line.preferredBrandId
      )

      if (availableBrandWeight <= 0) {
        throw new Error("Selected brand has no stock. Choose another brand or no brand preference.")
      }
    }

    const { data: orderNoData, error: orderNoError } = await context.supabase.rpc(
      "next_customer_order_no_v1",
      { p_outlet_id: outletId }
    )

    if (orderNoError) {
      throw new Error(orderNoError.message)
    }

    const orderNo = readString(orderNoData)
    const reservationExpiresAt = endOfLocalDay(parsed.scheduledAt)
    const orderDate = new Date().toISOString().slice(0, 10)
    const requiredDate = scheduledDate(parsed.scheduledAt)
    const customerName =
      parsed.fulfillmentType === "INTERNAL_TRANSFER"
        ? "Internal transfer"
        : readString(customer?.name, parsed.newCustomerName ?? "Customer")
    const customerPhone =
      parsed.fulfillmentType === "INTERNAL_TRANSFER"
        ? null
        : readString(customer?.phone, parsed.newCustomerPhone ?? "")
    const deliveryAddress =
      parsed.deliveryAddress ??
      (parsed.fulfillmentType === "DELIVERY"
        ? readString(customer?.address)
        : null)

    if (parsed.fulfillmentType === "DELIVERY" && !deliveryAddress) {
      throw new Error("Delivery address is required for delivery orders.")
    }

    const { data: orderData, error: orderError } = await context.supabase
      .from("customer_orders")
      .insert({
        order_no: orderNo,
        customer_id: customer ? readString(customer.id) : null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_remarks: parsed.customerRemarks ?? readString(customer?.remarks),
        order_date: orderDate,
        required_date: requiredDate,
        required_at: new Date(parsed.scheduledAt).toISOString(),
        fulfillment_type: parsed.fulfillmentType,
        delivery_required: deliveryRequired,
        status: "NEW",
        source_type: "manual_erp",
        total_order_price: parsed.totalOrderPrice,
        remarks: parsed.remarks,
        outlet_id: outletId,
        department_id: departmentId,
        pickup_location_id: parsed.pickupLocationId,
        from_location_id: parsed.fromLocationId,
        to_location_id: parsed.toLocationId,
        delivery_address: deliveryAddress,
        delivery_latitude: null,
        delivery_longitude: null,
        reservation_expires_at: reservationExpiresAt,
        created_by: context.profile.id,
        updated_by: context.profile.id,
      })
      .select("id")
      .single()

    if (orderError) {
      throw new Error(orderError.message)
    }

    const orderId = readString(asRecord(orderData).id)
    const reservationLines: ReservationLine[] = []

    for (const line of lines) {
      const { data: itemData, error: itemError } = await context.supabase
        .from("customer_order_items")
        .insert({
          order_id: orderId,
          item_id: line.itemId,
          ordering_unit: line.orderingUnit,
          requested_quantity: line.requestedQuantity,
          requested_weight_kg: line.estimatedWeightKg,
          estimated_weight_kg: line.estimatedWeightKg,
          preferred_brand_id: line.preferredBrandId,
          customization: line.customization,
          status: "REQUESTED",
          notes: line.remarks || null,
          item_request_remarks: line.remarks || null,
          processing_required: line.processingRequired,
          stock_not_enough: false,
        })
        .select("id")
        .single()

      if (itemError) {
        throw new Error(itemError.message)
      }

      const orderItemId = readString(asRecord(itemData).id)
      reservationLines.push({ ...line, orderItemId })
    }

    const anyStockNotEnough = await reserveOrderStockLines(
      context,
      orderId,
      reservationLines,
      reservationLocationId,
      reservationExpiresAt
    )

    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_V1_CREATED",
      "customer_orders",
      orderId,
      {
        orderNo,
        fulfillmentType: parsed.fulfillmentType,
        sourceType: "MANUAL_ERP",
        itemCount: lines.length,
        stockNotEnough: anyStockNotEnough,
        deliveryHandoff: "after_ready",
      }
    )

    revalidateOrderPaths(orderId)

    return anyStockNotEnough
      ? `Order ${orderNo} confirmed and reserved. Stock not enough warning added.`
      : `Order ${orderNo} confirmed and stock reserved.`
  })
}

export async function reserveOrderStockAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(orderIdSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const stockNotEnough = await reserveOrderStockForOrder(context, parsed.orderId)

    await insertAuditLog(
      context.supabase,
      context.profile,
      "ORDER_STOCK_RESERVED_V1",
      "customer_orders",
      parsed.orderId,
      { stockNotEnough }
    )
    revalidateOrderPaths(parsed.orderId)

    return stockNotEnough
      ? "Order stock reservation updated with Stock Not Enough warning."
      : "Order stock reserved."
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
    const released = await releaseOrderReservations(context, parsed.orderId)

    await insertAuditLog(
      context.supabase,
      context.profile,
      "ORDER_STOCK_RESERVATIONS_RELEASED_V1",
      "customer_orders",
      parsed.orderId,
      {
        released,
        releaseReason: parsed.releaseReason ?? "Manual release",
      }
    )
    revalidateOrderPaths(parsed.orderId)

    return `${released} active reservation${released === 1 ? "" : "s"} released.`
  })
}

export async function expireOrderReservationsAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const expired = await expireEndOfDayReservations(context)
    const orderIds = Array.from(
      new Set(expired.map((reservation) => readString(reservation.order_id)).filter(Boolean))
    )

    await insertAuditLog(
      context.supabase,
      context.profile,
      "ORDER_STOCK_RESERVATIONS_EXPIRED_V1",
      "order_stock_reservations",
      null,
      { expired: expired.length, orderIds }
    )
    orderIds.forEach((orderId) => revalidateOrderPaths(orderId))

    return `${expired.length} expired reservation${expired.length === 1 ? "" : "s"} released.`
  })
}

export async function recalculateOrderStockStatusAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(orderIdSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const stockNotEnough = await recalculateOrderStockStatus(context, parsed.orderId)

    await insertAuditLog(
      context.supabase,
      context.profile,
      "ORDER_STOCK_STATUS_RECALCULATED_V1",
      "customer_orders",
      parsed.orderId,
      { stockNotEnough }
    )
    revalidateOrderPaths(parsed.orderId)

    return stockNotEnough
      ? "Order stock status recalculated: Stock Not Enough."
      : "Order stock status recalculated: stock enough."
  })
}

export async function quickAddCustomerAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(quickCustomerSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const outletId = scopedOutletId(context.profile, parsed.outletId)

    await createQuickCustomer(context, parsed.name, parsed.phone, outletId, {
      address: parsed.address,
      remarks: parsed.remarks,
      isActive: parsed.isActive === "on",
    })

    return "Customer saved."
  })
}

export async function editCustomerOrderBeforePickingAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(editOrderSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const order = await getOrder(context.supabase, parsed.orderId)

    if (readString(order.status) !== "NEW") {
      throw new Error("Only confirmed orders can be edited before picking starts.")
    }

    if (await hasPickingStarted(context.supabase, parsed.orderId)) {
      throw new Error("Picking has started. Cancel and recreate if changes are needed.")
    }

    const { error } = await context.supabase
      .from("customer_orders")
      .update({
        required_date: scheduledDate(parsed.scheduledAt),
        required_at: new Date(parsed.scheduledAt).toISOString(),
        total_order_price: parsed.totalOrderPrice,
        delivery_address: parsed.deliveryAddress,
        customer_remarks: parsed.customerRemarks,
        remarks: parsed.remarks,
        updated_by: context.profile.id,
      })
      .eq("id", parsed.orderId)

    if (error) {
      throw new Error(error.message)
    }

    revalidateOrderPaths(parsed.orderId)

    return "Order updated before picking."
  })
}

async function updatePickedTotals(
  context: OrdersActionContext,
  orderItem: Record<string, unknown>,
  pickedQuantity: number,
  pickedWeightKg: number,
  notes: string | null
) {
  const orderItemId = readString(orderItem.id)
  const orderId = readString(orderItem.order_id)
  const preparedQuantity = readNumber(orderItem.prepared_quantity) + pickedQuantity
  const preparedWeightKg = readNumber(orderItem.prepared_weight_kg) + pickedWeightKg
  const { error: itemError } = await context.supabase
    .from("customer_order_items")
    .update({
      prepared_quantity: preparedQuantity,
      prepared_weight_kg: preparedWeightKg,
      prepared_by: context.profile.id,
      prepared_at: new Date().toISOString(),
      status: "PREPARING",
      notes: (notes ?? readString(orderItem.notes)) || null,
    })
    .eq("id", orderItemId)

  if (itemError) {
    throw new Error(itemError.message)
  }

  const { error: orderError } = await context.supabase
    .from("customer_orders")
    .update({
      status: "PREPARING",
      updated_by: context.profile.id,
    })
    .eq("id", orderId)
    .in("status", ["NEW", "PREPARING"])

  if (orderError) {
    throw new Error(orderError.message)
  }
}

async function assignReservationStockUnit(
  context: OrdersActionContext,
  orderId: string,
  orderItemId: string,
  stockUnitId: string,
  barcode: string
) {
  const { error } = await context.supabase
    .from("order_stock_reservations")
    .update({
      assigned_stock_unit_id: stockUnitId,
      assigned_barcode: barcode,
      assigned_at: new Date().toISOString(),
      assigned_by: context.profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .eq("order_item_id", orderItemId)
    .eq("status", "ACTIVE")
    .is("assigned_stock_unit_id", null)

  if (error) {
    throw new Error(error.message)
  }
}

export async function pickOrderBarcodeAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(barcodePickSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const order = await getOrder(context.supabase, parsed.orderId)
    assertOrderOpenForPicking(order)

    const { data: duplicate } = await context.supabase
      .from("order_picking_entries")
      .select("id")
      .eq("order_id", parsed.orderId)
      .eq("barcode", parsed.barcode)
      .limit(1)
      .maybeSingle()

    if (asRecord(duplicate).id) {
      throw new Error("Duplicate barcode. This barcode is already picked for the order.")
    }

    const unit = await stockUnitByBarcode(context.supabase, parsed.barcode)
    const items = await getOrderItems(context.supabase, parsed.orderId)
    const selectedItem = items.find(
      (item) => readString(item.id) === parsed.orderItemId
    )

    if (!selectedItem) {
      throw new Error("Select the order item before scanning.")
    }

    if (!unit) {
      await context.supabase.from("order_picking_entries").insert({
        order_id: parsed.orderId,
        order_item_id: parsed.orderItemId,
        barcode: parsed.barcode,
        entry_type: "MISMATCH",
        mismatch_message: "Barcode not found.",
        created_by: context.profile.id,
      })
      throw new Error("Barcode not found. Mismatch recorded.")
    }

    const matchingItem = items.find(
      (item) =>
        readString(item.item_id) === readString(unit.item_id) &&
        readString(item.status) !== "CANCELLED"
    )

    if (!matchingItem || readString(matchingItem.id) !== parsed.orderItemId) {
      await context.supabase.from("order_picking_entries").insert({
        order_id: parsed.orderId,
        order_item_id: parsed.orderItemId,
        item_id: readString(unit.item_id),
        stock_unit_id: readString(unit.id),
        barcode: parsed.barcode,
        entry_type: "MISMATCH",
        mismatch_message: "Wrong item scanned.",
        created_by: context.profile.id,
      })
      throw new Error("Wrong item scanned. Mismatch recorded.")
    }

    const preferredBrandId = readString(matchingItem.preferred_brand_id)

    if (preferredBrandId && preferredBrandId !== readString(unit.brand_id)) {
      await context.supabase.from("order_picking_entries").insert({
        order_id: parsed.orderId,
        order_item_id: readString(matchingItem.id),
        item_id: readString(unit.item_id),
        stock_unit_id: readString(unit.id),
        barcode: parsed.barcode,
        entry_type: "MISMATCH",
        mismatch_message: "Wrong brand scanned.",
        created_by: context.profile.id,
      })
      throw new Error("Wrong brand scanned. Mismatch recorded.")
    }

    const pickedWeightKg = readNumber(unit.net_weight_kg)
    const matchingOrderItemId = readString(matchingItem.id)
    const { error: entryError } = await context.supabase
      .from("order_picking_entries")
      .insert({
        order_id: parsed.orderId,
        order_item_id: matchingOrderItemId,
        item_id: readString(unit.item_id),
        stock_unit_id: readString(unit.id),
        barcode: parsed.barcode,
        entry_type: "BARCODE_SCAN",
        picked_quantity: 1,
        picked_weight_kg: pickedWeightKg,
        created_by: context.profile.id,
      })

    if (entryError) {
      throw new Error(entryError.message)
    }

    await assignReservationStockUnit(
      context,
      parsed.orderId,
      matchingOrderItemId,
      readString(unit.id),
      parsed.barcode
    )
    await updatePickedTotals(context, matchingItem, 1, pickedWeightKg, "Barcode picked")
    revalidateOrderPaths(parsed.orderId)

    return `Picked barcode ${parsed.barcode} (${pickedWeightKg} kg).`
  })
}

export async function manualPickWeightAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(manualPickSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const item = await getOrderItem(context.supabase, parsed.orderItemId)
    const orderId = readString(item.order_id)
    const order = await getOrder(context.supabase, orderId)
    assertOrderOpenForPicking(order)

    const { error: entryError } = await context.supabase
      .from("order_picking_entries")
      .insert({
        order_id: orderId,
        order_item_id: parsed.orderItemId,
        item_id: readString(item.item_id),
        entry_type: "MANUAL_WEIGHT",
        picked_quantity: parsed.pickedQuantity,
        picked_weight_kg: parsed.pickedWeightKg,
        manual_reason: parsed.manualReason,
        created_by: context.profile.id,
      })

    if (entryError) {
      throw new Error(entryError.message)
    }

    await updatePickedTotals(
      context,
      item,
      parsed.pickedQuantity,
      parsed.pickedWeightKg,
      parsed.notes
    )
    revalidateOrderPaths(orderId)

    return "Manual picked weight saved."
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
    const status = readString(order.status)

    if (!["NEW", "PREPARING", "READY"].includes(status)) {
      throw new Error(`Order is ${status || "not open"} and cannot be marked ready.`)
    }

    const items = await getOrderItems(context.supabase, parsed.orderId)

    if (items.length === 0) {
      throw new Error("Add at least one order item before marking ready.")
    }

    const incomplete = items.filter((item) => {
      const targetWeight = readNumber(item.estimated_weight_kg, readNumber(item.requested_weight_kg))
      const preparedWeight = readNumber(item.prepared_weight_kg)
      const targetQuantity = readNumber(item.requested_quantity)
      const preparedQuantity = readNumber(item.prepared_quantity)

      if (targetWeight > 0) {
        return preparedWeight <= 0 || Math.abs(preparedWeight - targetWeight) > 10
      }

      return targetQuantity > 0 && preparedQuantity <= 0
    })

    if (incomplete.length > 0) {
      throw new Error("Pick every item within the 10kg tolerance before marking ready.")
    }

    const { error } = await context.supabase
      .from("customer_orders")
      .update({
        status: "READY",
        updated_by: context.profile.id,
      })
      .eq("id", parsed.orderId)

    if (error) {
      throw new Error(error.message)
    }

    await context.supabase
      .from("customer_order_items")
      .update({ status: "PREPARED" })
      .eq("order_id", parsed.orderId)
      .neq("status", "CANCELLED")

    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_READY_V1",
      "customer_orders",
      parsed.orderId,
      {
        nextStatus: "READY",
        priceRequired: true,
      }
    )
    revalidateOrderPaths(parsed.orderId)

    return "Picking completed. Enter final total price next."
  })
}

export async function setCustomerOrderFinalPriceAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(finalPriceSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const order = await getOrder(context.supabase, parsed.orderId)
    const status = readString(order.status)

    if (status !== "READY") {
      throw new Error(`Order is ${status || "not ready"} and cannot be priced.`)
    }

    const deliveryRequired = readBoolean(order.delivery_required)
    const nextStatus = deliveryRequired ? "READY_FOR_DELIVERY" : "READY_FOR_PICKUP"
    const { error } = await context.supabase
      .from("customer_orders")
      .update({
        status: nextStatus,
        total_order_price: parsed.totalOrderPrice,
        updated_by: context.profile.id,
      })
      .eq("id", parsed.orderId)

    if (error) {
      throw new Error(error.message)
    }

    const linkedDelivery = deliveryRequired
      ? await createLinkedDeliveryFromOrder(context, parsed.orderId)
      : null

    await insertNotificationEvent(context, parsed.orderId, "READY_TO_PICKUP")
    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_FINAL_PRICE_V1",
      "customer_orders",
      parsed.orderId,
      {
        totalOrderPrice: parsed.totalOrderPrice,
        nextStatus,
        deliveryId: linkedDelivery?.deliveryId ?? null,
        deliveryNo: linkedDelivery?.deliveryNo ?? null,
        deliveryCreated: linkedDelivery?.created ?? false,
      }
    )
    revalidateOrderPaths(parsed.orderId)

    return deliveryRequired
      ? `Final price saved. Delivery ${linkedDelivery?.deliveryNo ?? "job"} is pending delivery.`
      : "Final price saved. Order is ready for pickup."
  })
}

export async function createOrderDeliveryAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(orderIdSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const order = await getOrder(context.supabase, parsed.orderId)
    const fulfillmentType = readString(order.fulfillment_type, "PICKUP")
    const deliveryRequired = readBoolean(order.delivery_required)
    const status = readString(order.status)

    if (
      fulfillmentType === "PICKUP" ||
      (!deliveryRequired &&
        !["DELIVERY", "INTERNAL_TRANSFER"].includes(fulfillmentType))
    ) {
      throw new Error("Customer pickup stays in Orders and does not create a delivery job.")
    }

    if (status !== "READY_FOR_DELIVERY") {
      throw new Error("Enter final total price before creating the delivery job.")
    }

    const linkedDelivery = await createLinkedDeliveryFromOrder(context, parsed.orderId)

    revalidateOrderPaths(parsed.orderId)

    return linkedDelivery.created
      ? `Delivery ${linkedDelivery.deliveryNo} created.`
      : `Delivery ${linkedDelivery.deliveryNo} is already linked.`
  })
}

export async function cancelCustomerOrderAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(cancelOrderSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const order = await getOrder(context.supabase, parsed.orderId)
    const currentStatus = readString(order.status)

    if (["DELIVERED", "FAILED", "CANCELLED"].includes(currentStatus)) {
      throw new Error(`Order is already ${currentStatus}.`)
    }

    const { error: orderError } = await context.supabase
      .from("customer_orders")
      .update({
        status: "CANCELLED",
        cancellation_reason: parsed.cancellationReason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: context.profile.id,
        updated_by: context.profile.id,
      })
      .eq("id", parsed.orderId)

    if (orderError) {
      throw new Error(orderError.message)
    }

    const released = await releaseOrderReservations(context, parsed.orderId)

    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_CANCELLED_V1",
      "customer_orders",
      parsed.orderId,
      {
        orderNo: readString(order.order_no),
        cancellationReason: parsed.cancellationReason,
        reservationsReleased: released,
      }
    )
    revalidateOrderPaths(parsed.orderId)

    return "Order cancelled and reserved stock released."
  })
}

export async function markPickupCompletedAction(
  _state: OrdersActionState,
  formData: FormData
): Promise<OrdersActionState> {
  const parsed = parseAction(orderIdSchema, formData)

  if (isOrdersActionState(parsed)) {
    return parsed
  }

  return runOrdersAction(formData, orderRoles, "orders", async (context) => {
    const order = await getOrder(context.supabase, parsed.orderId)

    if (readString(order.status) !== "READY_FOR_PICKUP") {
      throw new Error("Only ready pickup orders can be completed.")
    }

    const { error } = await context.supabase
      .from("customer_orders")
      .update({
        status: "DELIVERED",
        picked_up_at: new Date().toISOString(),
        picked_up_by: context.profile.id,
        updated_by: context.profile.id,
      })
      .eq("id", parsed.orderId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "CUSTOMER_ORDER_PICKED_UP_V1",
      "customer_orders",
      parsed.orderId,
      { orderNo: readString(order.order_no) }
    )
    revalidateOrderPaths(parsed.orderId)

    return "Pickup completed."
  })
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

      return `Customer order marked ${parsed.status.replaceAll("_", " ")}.`
    }
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

      const { error: orderError } = await orderRpc

      if (orderError) {
        throw new Error(orderError.message)
      }

      if (parsed.deliveryOutcome === "DELIVERED") {
        await insertNotificationEvent(context, parsed.orderId, "DELIVERED")
      }

      return parsed.deliveryOutcome === "FAILED"
        ? "Failed delivery proof uploaded and barcode stock return workflow recorded."
        : "Customer order proof photo uploaded and order marked delivered."
    }
  )
}
