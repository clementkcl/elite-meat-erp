import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const route = read("app/api/whatsapp/orders/route.ts")
const orders = read("lib/whatsapp-crm/orders.ts")
const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const types = read("lib/whatsapp-crm/types.ts")
const packageJson = read("package.json")

assert(
  route.includes("getCurrentProfile") &&
    route.includes("createWhatsappCrmSimpleOrder") &&
    route.includes("updateWhatsappCrmOrderStatus") &&
    route.includes('export const runtime = "nodejs"') &&
    route.includes("POST") &&
    route.includes("PATCH"),
  "Simple order route must authenticate staff and expose create/status updates."
)

for (const behavior of [
  "orderRoles",
  "globalRoles",
  "assertCanManageOrder",
  "assignedStaffId === profile.id",
  '"This role cannot create or update simple orders."',
  '"You can only manage orders for customers assigned to you."',
]) {
  assert(orders.includes(behavior), `Order service missing ${behavior}.`)
}

for (const statusRule of [
  "pickupStatusFlow",
  "deliveryStatusFlow",
  '"Ready for Pickup"',
  '"Out for Delivery"',
  "allowedStatusesForFulfillment",
  '"Failed"',
  '"Cancelled"',
]) {
  assert(orders.includes(statusRule), `Order status flow missing ${statusRule}.`)
}

for (const field of [
  "crm_orders",
  "customer_id",
  "conversation_id",
  "product_name",
  "weight_quantity",
  "price",
  "fulfillment",
  "address",
  "order_date",
  "location",
  "remarks",
  "status",
  "created_by",
]) {
  assert(orders.includes(field), `Order create/update service missing ${field}.`)
}

assert(
  orders.includes("WHATSAPP_SIMPLE_ORDER_CREATE") &&
    orders.includes("WHATSAPP_SIMPLE_ORDER_STATUS_UPDATE") &&
    orders.includes('"crm_audit_logs"') &&
    orders.includes("last_order_date") &&
    orders.includes("latest_order_status"),
  "Order changes must update customer latest status and write audit logs."
)

assert(
  types.includes("CrmOrderInput") &&
    types.includes("CrmOrderStatusUpdate") &&
    types.includes("CrmOrderStatus"),
  "CRM order types must expose order create and status update shapes."
)

for (const marker of [
  "SimpleOrderForm",
  "OrderStatusUpdater",
  'fetch("/api/whatsapp/orders"',
  "onOrderSaved(result.order)",
  "setOrders",
  "lastOrderDate: order.date",
  "orderStatusBadge: order.status",
  "Create simple order",
  "Save status",
]) {
  assert(inbox.includes(marker), `Chat order UI missing ${marker}.`)
}

for (const label of [
  "Product",
  "Weight/quantity",
  "Price",
  "Delivery or pickup",
  "Address",
  "Date",
  "Location",
  "Remarks",
  "Update order status",
]) {
  assert(inbox.includes(label), `Simple order form missing ${label}.`)
}

assert(
  packageJson.includes("whatsapp-crm-order-coverage.mjs"),
  "Order coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM simple order coverage passed.")
