import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const route = read("app/api/whatsapp/send/route.ts")
const send = read("lib/whatsapp-crm/send.ts")
const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const packageJson = read("package.json")

assert(
  route.includes("getCurrentProfile") &&
    route.includes("sendApprovedWhatsappReply") &&
    route.includes('export const runtime = "nodejs"'),
  "WhatsApp send route must authenticate staff and delegate sending in Node runtime."
)

assert(
  !route.includes("phoneNumberId?:") &&
    !route.includes("to?:") &&
    !route.includes("staffUserId"),
  "Send route must not trust browser-supplied phone number or staff identity fields."
)

for (const behavior of [
  "replyRoles",
  "globalRoles",
  "assertCanReply",
  "assignedStaffId === profile.id",
  '"This role cannot send WhatsApp replies."',
  '"You can only reply to customers assigned to you."',
]) {
  assert(send.includes(behavior), `Send service missing permission behavior: ${behavior}.`)
}

for (const behavior of [
  '"crm_customers"',
  '"whatsapp_accounts"',
  '"crm_conversations"',
  '"crm_messages"',
  '"crm_audit_logs"',
  "sendWhatsAppTextMessage",
  "sendWhatsAppMediaMessage",
  "approved_by_staff: true",
  "unread_count: 0",
  "WHATSAPP_OUTBOUND_MESSAGE",
]) {
  assert(send.includes(behavior), `Send service missing persistence behavior: ${behavior}.`)
}

for (const marker of [
  'fetch("/api/whatsapp/send"',
  "customerId: customer.id",
  "conversationId: activeConversationId",
  'type: "text"',
  "onMessageSent(result.message)",
  "Reply sent.",
  "aria-live=\"polite\"",
]) {
  assert(inbox.includes(marker), `Chat composer missing send marker: ${marker}.`)
}

assert(
  inbox.includes("setSentMessages") &&
    inbox.includes("[...data.messages, ...sentMessages]"),
  "Inbox must append sent CRM messages after the API returns."
)

assert(
  packageJson.includes("whatsapp-crm-send-coverage.mjs"),
  "Send coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM send coverage passed.")
