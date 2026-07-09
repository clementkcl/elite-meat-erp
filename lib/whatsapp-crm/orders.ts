import type { SupabaseClient } from "@supabase/supabase-js"

import type { CurrentProfile } from "@/lib/auth/session"
import {
  asRecord,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import {
  crmOrderStatuses,
  type CrmOrder,
  type CrmOrderInput,
  type CrmOrderStatus,
  type CrmOrderStatusUpdate,
} from "@/lib/whatsapp-crm/types"
import { createSimpleOrderNotification } from "@/lib/whatsapp-crm/notifications"

type StoredCustomerAccess = {
  id: string
  assignedStaffId: string | null
}

type StoredOrderAccess = CrmOrder & {
  assignedStaffId: string | null
}

type OrderResult = {
  ok: boolean
  error: string | null
  order: CrmOrder | null
}

export const pickupStatusFlow: CrmOrderStatus[] = [
  "New Order",
  "Confirmed",
  "Preparing",
  "Ready for Pickup",
  "Completed",
]

export const deliveryStatusFlow: CrmOrderStatus[] = [
  "New Order",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Completed",
]

const terminalOrderStatuses: CrmOrderStatus[] = ["Failed", "Cancelled"]

const orderRoles = [
  "owner",
  "sales",
  "sales_staff",
  "customer_service",
  "admin",
  "director",
]

const globalRoles = ["owner", "admin", "director"]

function hasAnyRole(profile: CurrentProfile, roles: string[]) {
  return profile.roles.some((role) => roles.includes(role))
}

function errorText(value: unknown) {
  const error = asRecord(value)

  return readString(error.message, "Unknown WhatsApp CRM order error")
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function cleanDate(value: unknown) {
  const text = cleanText(value)

  return /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text
    : new Date().toISOString().slice(0, 10)
}

function cleanPrice(value: unknown) {
  return Math.max(0, readNumber(value))
}

function statusText(value: unknown): CrmOrderStatus {
  const text = cleanText(value)

  return crmOrderStatuses.find((status) => status === text) ?? "New Order"
}

function allowedStatusesForFulfillment(
  fulfillment: CrmOrder["fulfillment"]
): CrmOrderStatus[] {
  const flow = fulfillment === "Pickup" ? pickupStatusFlow : deliveryStatusFlow

  return [...flow, ...terminalOrderStatuses]
}

function validateCreateInput(input: CrmOrderInput) {
  const fulfillment = input.fulfillment ?? "Delivery"

  if (!input.customerId) return "Customer is required."
  if (!cleanText(input.product)) return "Product is required."
  if (!cleanText(input.weightQuantity)) return "Weight/quantity is required."
  if (!["Delivery", "Pickup"].includes(fulfillment)) {
    return "Delivery or pickup is invalid."
  }

  return null
}

function crmOrderFromRow(row: Record<string, unknown>): CrmOrder {
  return {
    id: readString(row.id),
    customerId: readString(row.customer_id),
    product: readString(row.product_name),
    weightQuantity: readString(row.weight_quantity),
    price: readNumber(row.price),
    fulfillment:
      readString(row.fulfillment, "Delivery") === "Pickup" ? "Pickup" : "Delivery",
    address: readString(row.address),
    date: readString(row.order_date),
    location: readString(row.location),
    remarks: readString(row.remarks),
    status: statusText(row.status),
  }
}

async function loadCustomerAccess(
  supabase: SupabaseClient,
  customerId: string
): Promise<StoredCustomerAccess> {
  const result = await supabase
    .from("crm_customers")
    .select("id, assigned_staff_id")
    .eq("id", customerId)
    .single()

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  const row = asRecord(result.data)

  return {
    id: readString(row.id),
    assignedStaffId: readNullableString(row.assigned_staff_id),
  }
}

async function loadOrderAccess(
  supabase: SupabaseClient,
  orderId: string
): Promise<StoredOrderAccess> {
  const result = await supabase
    .from("crm_orders")
    .select("*")
    .eq("id", orderId)
    .single()

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  const order = crmOrderFromRow(asRecord(result.data))
  const customer = await loadCustomerAccess(supabase, order.customerId)

  return {
    ...order,
    assignedStaffId: customer.assignedStaffId,
  }
}

function assertCanManageOrder(
  profile: CurrentProfile,
  customer: StoredCustomerAccess
) {
  if (!hasAnyRole(profile, orderRoles)) {
    return "This role cannot create or update simple orders."
  }

  if (hasAnyRole(profile, globalRoles)) {
    return null
  }

  if (customer.assignedStaffId === profile.id) {
    return null
  }

  return "You can only manage orders for customers assigned to you."
}

async function updateCustomerLatestOrder(
  supabase: SupabaseClient,
  order: CrmOrder,
  profile: CurrentProfile
) {
  await supabase
    .from("crm_customers")
    .update({
      last_order_date: order.date,
      latest_order_status: order.status,
      updated_by: profile.id,
    })
    .eq("id", order.customerId)
}

async function writeOrderAuditLog({
  supabase,
  profile,
  action,
  order,
  detail,
}: {
  supabase: SupabaseClient
  profile: CurrentProfile
  action: string
  order: CrmOrder
  detail: Record<string, unknown>
}) {
  await supabase.from("crm_audit_logs").insert({
    actor_id: profile.id,
    action,
    table_name: "crm_orders",
    record_id: order.id,
    detail,
  })
}

export async function createWhatsappCrmSimpleOrder({
  supabase,
  profile,
  input,
}: {
  supabase: SupabaseClient
  profile: CurrentProfile
  input: CrmOrderInput
}): Promise<OrderResult> {
  const inputError = validateCreateInput(input)

  if (inputError) {
    return {
      ok: false,
      error: inputError,
      order: null,
    }
  }

  const customer = await loadCustomerAccess(supabase, input.customerId ?? "")
  const permissionError = assertCanManageOrder(profile, customer)

  if (permissionError) {
    return {
      ok: false,
      error: permissionError,
      order: null,
    }
  }

  const result = await supabase
    .from("crm_orders")
    .insert({
      customer_id: customer.id,
      conversation_id: input.conversationId ?? null,
      product_name: cleanText(input.product),
      weight_quantity: cleanText(input.weightQuantity),
      price: cleanPrice(input.price),
      fulfillment: input.fulfillment ?? "Delivery",
      address: cleanText(input.address),
      order_date: cleanDate(input.date),
      location: cleanText(input.location),
      remarks: cleanText(input.remarks),
      status: "New Order",
      created_by: profile.id,
    })
    .select("*")
    .single()

  if (result.error) {
    return {
      ok: false,
      error: errorText(result.error),
      order: null,
    }
  }

  const order = crmOrderFromRow(asRecord(result.data))

  await Promise.all([
    updateCustomerLatestOrder(supabase, order, profile),
    createSimpleOrderNotification({
      supabase,
      order,
    }),
    writeOrderAuditLog({
      supabase,
      profile,
      action: "WHATSAPP_SIMPLE_ORDER_CREATE",
      order,
      detail: {
        customer_id: customer.id,
        conversation_id: input.conversationId ?? null,
        fulfillment: order.fulfillment,
      },
    }),
  ])

  return {
    ok: true,
    error: null,
    order,
  }
}

export async function updateWhatsappCrmOrderStatus({
  supabase,
  profile,
  input,
}: {
  supabase: SupabaseClient
  profile: CurrentProfile
  input: CrmOrderStatusUpdate
}): Promise<OrderResult> {
  if (!input.orderId) {
    return {
      ok: false,
      error: "Order is required.",
      order: null,
    }
  }

  if (!input.status || !crmOrderStatuses.includes(input.status)) {
    return {
      ok: false,
      error: "Order status is invalid.",
      order: null,
    }
  }

  const orderAccess = await loadOrderAccess(supabase, input.orderId)
  const permissionError = assertCanManageOrder(profile, {
    id: orderAccess.customerId,
    assignedStaffId: orderAccess.assignedStaffId,
  })

  if (permissionError) {
    return {
      ok: false,
      error: permissionError,
      order: null,
    }
  }

  if (!allowedStatusesForFulfillment(orderAccess.fulfillment).includes(input.status)) {
    return {
      ok: false,
      error: `${input.status} is not valid for ${orderAccess.fulfillment.toLowerCase()} orders.`,
      order: null,
    }
  }

  const result = await supabase
    .from("crm_orders")
    .update({
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderAccess.id)
    .select("*")
    .single()

  if (result.error) {
    return {
      ok: false,
      error: errorText(result.error),
      order: null,
    }
  }

  const order = crmOrderFromRow(asRecord(result.data))

  await Promise.all([
    updateCustomerLatestOrder(supabase, order, profile),
    writeOrderAuditLog({
      supabase,
      profile,
      action: "WHATSAPP_SIMPLE_ORDER_STATUS_UPDATE",
      order,
      detail: {
        customer_id: order.customerId,
        previous_status: orderAccess.status,
        next_status: order.status,
      },
    }),
  ])

  return {
    ok: true,
    error: null,
    order,
  }
}
