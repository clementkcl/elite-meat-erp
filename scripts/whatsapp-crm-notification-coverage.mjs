import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const notifications = read("lib/whatsapp-crm/notifications.ts")
const webhook = read("lib/whatsapp-crm/webhook.ts")
const orders = read("lib/whatsapp-crm/orders.ts")
const data = read("lib/whatsapp-crm/data.ts")
const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const types = read("lib/whatsapp-crm/types.ts")
const mock = read("data/mock/whatsapp-crm.ts")
const packageJson = read("package.json")

for (const type of [
  "NEW_MESSAGE",
  "UNREAD_30_MIN",
  "NEW_ORDER",
  "COMPLAINT",
  "PAYMENT_REMINDER",
]) {
  assert(types.includes(type), `CRM notification types missing ${type}.`)
  assert(notifications.includes(type), `Notification helper missing ${type}.`)
  assert(mock.includes(type), `Demo alerts missing ${type}.`)
}

assert(
  notifications.includes('"crm_notifications"') &&
    notifications.includes("createWhatsappCrmNotification") &&
    notifications.includes("createInboundMessageNotifications") &&
    notifications.includes("createSimpleOrderNotification") &&
    notifications.includes("buildDerivedCustomerAlerts") &&
    notifications.includes("notificationTone"),
  "Notification helper must create persisted and derived CRM alerts."
)

assert(
  webhook.includes("createInboundMessageNotifications") &&
    webhook.includes("hasComplaint: message.hasComplaint") &&
    webhook.includes("messageBody: message.body"),
  "Webhook must create new-message and complaint notifications."
)

assert(
  orders.includes("createSimpleOrderNotification") &&
    orders.includes("WHATSAPP_SIMPLE_ORDER_CREATE"),
  "Simple order creation must create a new-order notification."
)

assert(
  data.includes('"crm_notifications"') &&
    data.includes(".eq(\"is_read\", false)") &&
    data.includes("notificationFromRow") &&
    data.includes("buildDerivedCustomerAlerts(customers)") &&
    data.includes("notifications,"),
  "CRM data loader must load unread notifications and derived alerts."
)

for (const marker of [
  "NotificationAlerts",
  "setNotifications",
  "New simple order",
  "30 min",
  "Payment",
  "Complaint",
  "onSelectCustomer",
  "Bell",
]) {
  assert(inbox.includes(marker), `Inbox notification UI missing ${marker}.`)
}

assert(
  packageJson.includes("whatsapp-crm-notification-coverage.mjs"),
  "Notification coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM notification coverage passed.")
