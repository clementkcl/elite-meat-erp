import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const dashboard = read("lib/whatsapp-crm/dashboard.ts")
const data = read("lib/whatsapp-crm/data.ts")
const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const types = read("lib/whatsapp-crm/types.ts")
const mock = read("data/mock/whatsapp-crm.ts")
const packageJson = read("package.json")

for (const marker of [
  "CrmStaffResponseRanking",
  "customersWaitingCount",
  "newMessagesTodayCount",
  "newOrdersTodayCount",
  "staffResponseRanking",
]) {
  assert(types.includes(marker), `Owner dashboard type missing ${marker}.`)
}

for (const marker of [
  "buildWhatsappCrmDashboard",
  "customersWaitingCount",
  "newMessagesTodayCount",
  "newOrdersTodayCount",
  "complaintCount",
  "staffResponseRanking",
  "buildStaffStats",
  "pendingInboundByConversation",
  "underThirtyRate",
  "isSameDay",
]) {
  assert(dashboard.includes(marker), `Dashboard helper missing ${marker}.`)
}

assert(
  data.includes("buildWhatsappCrmDashboard") &&
    data.includes("dashboard: buildWhatsappCrmDashboard({ customers, messages, orders })"),
  "Data loader must use shared dashboard KPI calculation."
)

for (const label of [
  "Owner dashboard",
  "Customers waiting",
  "Unread over 30 min",
  "New messages today",
  "Avg response",
  "New orders",
  "Complaints",
  "Staff response ranking",
  "Ranked by replies today",
]) {
  assert(inbox.includes(label), `Owner dashboard UI missing ${label}.`)
}

assert(
  inbox.includes("currentDashboard") &&
    inbox.includes("buildWhatsappCrmDashboard({") &&
    inbox.includes("messages: allMessages") &&
    inbox.includes("StaffResponseRanking"),
  "Inbox must recompute owner dashboard from current customer/message/order state."
)

for (const marker of [
  "customersWaitingCount",
  "newMessagesTodayCount",
  "newOrdersTodayCount",
  "staffResponseRanking",
  "waitingCustomers",
]) {
  assert(mock.includes(marker), `Demo dashboard data missing ${marker}.`)
}

assert(
  packageJson.includes("whatsapp-crm-owner-dashboard-coverage.mjs"),
  "Owner dashboard coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM owner dashboard coverage passed.")
