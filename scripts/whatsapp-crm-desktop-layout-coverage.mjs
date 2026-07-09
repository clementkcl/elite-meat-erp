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
const packageJson = read("package.json")

assert(
  inbox.includes('type MobilePane = "list" | "chat" | "profile"') &&
    inbox.includes('useState<MobilePane>("list")') &&
    inbox.includes('mobilePane !== "list" && "hidden lg:block"') &&
    inbox.includes('mobilePane !== "chat" && "hidden lg:block"') &&
    inbox.includes('mobilePane !== "profile" && "hidden lg:block"'),
  "Desktop layout must preserve the mobile list -> chat -> profile flow."
)

assert(
  inbox.includes("lg:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.35fr)]") &&
    inbox.includes("xl:grid-cols-[minmax(17rem,0.85fr)_minmax(28rem,1.45fr)_minmax(18rem,0.8fr)]") &&
    inbox.includes("lg:col-span-2 xl:col-span-1"),
  "Inbox must use tablet two-column and desktop three-column layout."
)

for (const marker of [
  "ChatEmptyState",
  "No customer selected",
  "No CRM customers yet",
  "CrmSummaryPanel",
  "CRM panel",
  "Select a customer to start",
]) {
  assert(inbox.includes(marker), `Desktop empty state missing ${marker}.`)
}

for (const label of [
  "Customer profile",
  "Company",
  "Tags",
  "Remarks",
  "Birthday",
  "Assigned staff",
  "Payment",
  "Latest order",
  "No order yet",
]) {
  assert(inbox.includes(label), `Right CRM panel missing ${label}.`)
}

for (const action of [
  "Edit",
  "Create simple order",
  "Update order status",
  "Add follow-up",
  "Suggest reply",
  "crm-chat-suggest-reply",
]) {
  assert(inbox.includes(action), `Right CRM panel quick action missing ${action}.`)
}

assert(
  inbox.includes("buildWhatsappCrmDashboard({") &&
    inbox.includes("messages: allMessages") &&
    inbox.includes("onMessageSent") &&
    inbox.includes("handleOrderSaved"),
  "Desktop refinement must preserve dashboard recomputation and local reply/order updates."
)

assert(
  packageJson.includes("whatsapp-crm-desktop-layout-coverage.mjs"),
  "Desktop layout coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM desktop layout coverage passed.")
