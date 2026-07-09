import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const types = read("lib/whatsapp-crm/types.ts")
const mock = read("data/mock/whatsapp-crm.ts")

assert(
  inbox.includes('type MobilePane = "list" | "chat" | "profile"') &&
    inbox.includes('useState<MobilePane>("list")'),
  "Mobile CRM flow must start at the customer list."
)

assert(
  inbox.includes("grid min-h-24 w-full grid-cols-[2.75rem_minmax(0,1fr)_auto]"),
  "Customer rows must use a stable mobile inbox row layout."
)

assert(
  inbox.includes("aria-label={`${customer.unreadCount} unread messages`}") &&
    inbox.includes("{unreadTotal} unread"),
  "Mobile inbox must show unread badges per customer and unread total."
)

assert(
  inbox.includes("Staff: {customer.assignedStaff}") &&
    inbox.includes("Last order: {formatDate(customer.lastOrderDate)}") &&
    inbox.includes("customer.orderStatusBadge"),
  "Customer row must show assigned staff, last order date, and order status badge."
)

assert(
  inbox.includes("Search name, phone, area, tag") &&
    inbox.includes("customer.assignedStaff") &&
    inbox.includes("customer.orderStatusBadge") &&
    inbox.includes("customer.lastOrderDate"),
  "Inbox search must cover staff, status, and last order fields."
)

for (const field of [
  "unreadCount: number",
  "assignedStaff: string",
  "lastOrderDate: string | null",
  "orderStatusBadge: CrmOrderStatus",
]) {
  assert(types.includes(field), `CRM customer type missing ${field}.`)
}

for (const value of [
  'unreadCount: 3',
  'assignedStaff: "Amelia Tan"',
  'lastOrderDate: "2026-06-22"',
  'orderStatusBadge: "Preparing"',
]) {
  assert(mock.includes(value), `Demo inbox data missing ${value}.`)
}

console.log("WhatsApp CRM mobile inbox coverage passed.")
