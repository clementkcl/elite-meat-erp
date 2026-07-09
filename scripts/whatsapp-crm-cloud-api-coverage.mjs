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
const sendRoute = read("app/api/whatsapp/send/route.ts")
const cloudApi = read("lib/whatsapp-crm/cloud-api.ts")
const webhook = read("lib/whatsapp-crm/webhook.ts")
const send = read("lib/whatsapp-crm/send.ts")
const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const dashboard = read("lib/whatsapp-crm/dashboard.ts")
const packageJson = read("package.json")

assert(
  cloudApi.includes("WHATSAPP_VERIFY_TOKEN") &&
    cloudApi.includes("WHATSAPP_WEBHOOK_VERIFY_TOKEN") &&
    cloudApi.includes("VERIFY_TOKEN") &&
    cloudApi.includes("WHATSAPP_APP_SECRET") &&
    cloudApi.includes("verifyWhatsAppRequestSignature") &&
    cloudApi.includes("timingSafeEqual"),
  "Cloud API helper must support verify-token aliases and optional app-secret signature verification."
)

assert(
  cloudApi.includes("WHATSAPP_ACCESS_TOKEN") &&
    cloudApi.includes("WHATSAPP_CLOUD_API_TOKEN") &&
    cloudApi.includes("WHATSAPP_TOKEN") &&
    cloudApi.includes("WHATSAPP_GRAPH_API_VERSION") &&
    cloudApi.includes("WHATSAPP_CLOUD_API_VERSION"),
  "Cloud API helper must support current and recommended environment variable names."
)

for (const marker of [
  "verifyWebhookToken(mode, token)",
  "WhatsApp webhook verification accepted.",
  "WhatsApp webhook verification rejected.",
  "request.text()",
  "x-hub-signature-256",
  "Invalid signature.",
  "Webhook processing failed.",
]) {
  assert(route.includes(marker), `Webhook route missing ${marker}.`)
}

for (const marker of [
  "normalizeWhatsappWebhookPayload",
  "normalizeWhatsappStatusPayload",
  "asRecord(payload).entry",
  "asRecord(entry).changes",
  "normalizePhoneNumber",
  "whatsapp_accounts",
  "phone_number_id",
  "crm_customers",
  "crm_conversations",
  "crm_messages",
  "external_message_id",
  "messageAlreadyStored",
  "skippedDuplicates",
  "Unsupported WhatsApp message type",
]) {
  assert(webhook.includes(marker), `Webhook processing missing ${marker}.`)
}

for (const marker of [
  'type === "image"',
  'type === "document"',
  'type === "audio"',
  'type === "location"',
  "mediaLabelForMessage",
  "rawPayload: message",
]) {
  assert(webhook.includes(marker), `Webhook media/location handling missing ${marker}.`)
}

for (const marker of [
  "NormalizedMessageStatus",
  "statusForWebhookStatus",
  "failedReasonForStatus",
  "updateMessageStatus",
  "statusesUpdated",
  "webhook_status",
  "failed_reason",
]) {
  assert(webhook.includes(marker), `Status webhook handling missing ${marker}.`)
}

for (const marker of [
  "phoneNumberForWhatsApp",
  "externalMessageIdFromResult",
  "friendlySendError",
  "whatsapp_phone_number_id: account.phoneNumberId",
  "external_message_id: externalMessageId",
  "Live WhatsApp location sending is not supported yet.",
  "failed_reason",
  "WHATSAPP_OUTBOUND_MESSAGE",
]) {
  assert(send.includes(marker), `Outgoing send hardening missing ${marker}.`)
}

assert(
  sendRoute.includes('type?: "text" | "image" | "file" | "audio" | "location"'),
  "Send route must explicitly include location as a handled unsupported live-send type."
)

assert(
  inbox.includes("failed to send") &&
    inbox.includes("message.status === \"failed\"") &&
    inbox.includes("setSentMessages") &&
    inbox.includes("[...data.messages, ...sentMessages]"),
  "Chat UI must keep local sends and show failed-send state clearly."
)

assert(
  dashboard.includes("buildWhatsappCrmDashboard") &&
    dashboard.includes("newMessagesTodayCount") &&
    dashboard.includes("customersWaitingCount"),
  "Owner dashboard must still be able to update from message/customer state."
)

assert(
  packageJson.includes("whatsapp-crm-cloud-api-coverage.mjs"),
  "Cloud API coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM Cloud API hardening coverage passed.")
