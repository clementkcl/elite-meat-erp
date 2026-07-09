import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const route = read("app/api/whatsapp/broadcasts/route.ts")
const broadcasts = read("lib/whatsapp-crm/broadcasts.ts")
const data = read("lib/whatsapp-crm/data.ts")
const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const types = read("lib/whatsapp-crm/types.ts")
const packageJson = read("package.json")

assert(
  route.includes("getCurrentProfile") &&
    route.includes("sendWhatsappPriceListBroadcast") &&
    route.includes('export const runtime = "nodejs"') &&
    route.includes("POST"),
  "Broadcast route must authenticate owner/admin and delegate in Node runtime."
)

for (const marker of [
  "ownerAdminBroadcastRoles",
  '"owner"',
  '"admin"',
  "Only owner/admin can send broadcast price lists.",
  "assertCanBroadcast",
]) {
  assert(broadcasts.includes(marker), `Broadcast service missing ${marker}.`)
}

for (const filter of [
  "customerTypes",
  "areas",
  "tags",
  "assignedStaffIds",
  "matchesFilter",
  "audienceSummary",
]) {
  assert(broadcasts.includes(filter), `Broadcast filters missing ${filter}.`)
}

for (const behavior of [
  "sendWhatsAppMediaMessage",
  'type: "image"',
  '"crm_broadcasts"',
  '"crm_broadcast_recipients"',
  '"crm_messages"',
  "is_price_list: true",
  "approved_by_staff: true",
  "WHATSAPP_PRICE_LIST_BROADCAST",
  "SENT",
  "FAILED",
  "SKIPPED",
]) {
  assert(broadcasts.includes(behavior), `Broadcast send behavior missing ${behavior}.`)
}

assert(
  types.includes("CrmBroadcastFilterOptions") &&
    types.includes("canBroadcast") &&
    types.includes("broadcastFilters"),
  "CRM types must expose broadcast filters and capability."
)

assert(
  data.includes("broadcastFiltersFromCustomers") &&
    data.includes("canSendCrmBroadcastForProfile") &&
    data.includes('role === "owner" || role === "admin"') &&
    data.includes("assignedStaff"),
  "Data loader must expose owner/admin capability and broadcast filter options."
)

for (const marker of [
  "BroadcastPriceListPanel",
  'fetch("/api/whatsapp/broadcasts"',
  "Send image price list",
  "Customer type",
  "Area",
  "Tags",
  "Assigned staff",
  "WhatsApp image media ID",
  "onBroadcastSaved(result.broadcast)",
  "setBroadcasts",
  "Broadcast sending is owner/admin only.",
]) {
  assert(inbox.includes(marker), `Broadcast UI missing ${marker}.`)
}

assert(
  packageJson.includes("whatsapp-crm-broadcast-coverage.mjs"),
  "Broadcast coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM broadcast coverage passed.")
