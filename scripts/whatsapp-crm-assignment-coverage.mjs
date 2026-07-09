import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const assignments = read("lib/whatsapp-crm/assignments.ts")
const webhook = read("lib/whatsapp-crm/webhook.ts")
const send = read("lib/whatsapp-crm/send.ts")
const data = read("lib/whatsapp-crm/data.ts")
const packageJson = read("package.json")

for (const marker of [
  "resolvePreviousHandlingStaff",
  "resolveNewCustomerAssignment",
  "WHATSAPP_CRM_FALLBACK_STAFF_ID",
  "assignCustomerToStaff",
  "recordNewCustomerAssignment",
  '"crm_assignments"',
  '"crm_notifications"',
  "WHATSAPP_CUSTOMER_AUTO_ASSIGNMENT",
  "WHATSAPP_CUSTOMER_ADMIN_QUEUE",
  '"previous_handler"',
  '"fallback_rule"',
  '"staff_reply"',
  '"admin_queue"',
]) {
  assert(assignments.includes(marker), `Assignment helper missing ${marker}.`)
}

assert(
  assignments.includes(".order(\"created_at\", { ascending: false })") &&
    assignments.includes(".eq(\"is_active\", true)") &&
    assignments.includes(".maybeSingle()"),
  "Previous handler lookup must use the latest active assignment."
)

for (const marker of [
  "resolvePreviousHandlingStaff",
  "resolveNewCustomerAssignment",
  "recordNewCustomerAssignment",
  "assignCustomerToStaff",
  "assigned_staff_id: assignment.assignedStaffId",
  'reason: "previous_handler"',
]) {
  assert(webhook.includes(marker), `Webhook assignment flow missing ${marker}.`)
}

assert(
  send.includes("assignCustomerToStaff") &&
    send.includes('reason: "staff_reply"') &&
    send.includes("assigned_staff_id: assignedStaffId") &&
    send.includes("customer.assignedStaffId"),
  "Staff replies must establish the previous handling staff when needed."
)

assert(
  data.includes('"Admin queue"'),
  "Customer list should label unassigned WhatsApp CRM customers as Admin queue."
)

assert(
  packageJson.includes("whatsapp-crm-assignment-coverage.mjs"),
  "Assignment coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM assignment coverage passed.")
