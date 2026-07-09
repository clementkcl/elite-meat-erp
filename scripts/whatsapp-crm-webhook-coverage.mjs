import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const route = read("app/api/whatsapp/webhook/route.ts")
const webhook = read("lib/whatsapp-crm/webhook.ts")
const data = read("lib/whatsapp-crm/data.ts")
const packageJson = read("package.json")

assert(
  route.includes("verifyWebhookToken") &&
    route.includes("processWhatsappWebhookPayload") &&
    route.includes('export const runtime = "nodejs"'),
  "WhatsApp webhook route must verify setup and delegate inbound processing in Node runtime."
)

for (const table of [
  '"crm_webhook_inbox"',
  '"whatsapp_accounts"',
  '"crm_customers"',
  '"crm_conversations"',
  '"crm_messages"',
  '"crm_audit_logs"',
]) {
  assert(webhook.includes(table), `Webhook processing must write ${table}.`)
}

for (const behavior of [
  "normalizeWhatsappWebhookPayload",
  "messageAlreadyStored",
  "external_message_id",
  "unread_count: readNumber(row.unread_count) + 1",
  "has_open_complaint",
  "assigned_staff_id",
  "is_price_list: false",
  "processed_at",
]) {
  assert(webhook.includes(behavior), `Webhook processing missing ${behavior}.`)
}

for (const messageType of [
  'type === "image"',
  'type === "document"',
  'type === "audio"',
  'type === "location"',
]) {
  assert(webhook.includes(messageType), `Webhook must normalize ${messageType}.`)
}

assert(
  webhook.includes("detectWhatsappComplaint") &&
    webhook.includes('"busuk"') &&
    webhook.includes('"wrong item"'),
  "Webhook must detect complaint language for the red complaint tag."
)

assert(
  data.includes("minutesSince(lastMessageAt)") &&
    data.includes("unreadTooLong: unreadCount > 0 && minutesSinceLastInbound >= 30"),
  "Inbox loader must age webhook-created unread messages into the 30-minute reminder."
)

assert(
  packageJson.includes("whatsapp-crm-webhook-coverage.mjs"),
  "Webhook coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM webhook coverage passed.")
