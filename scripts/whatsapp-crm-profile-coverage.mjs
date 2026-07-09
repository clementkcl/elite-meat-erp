import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const route = read("app/api/whatsapp/customer-profile/route.ts")
const customers = read("lib/whatsapp-crm/customers.ts")
const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const types = read("lib/whatsapp-crm/types.ts")
const packageJson = read("package.json")

assert(
  route.includes("getCurrentProfile") &&
    route.includes("updateWhatsappCrmCustomerProfile") &&
    route.includes('export const runtime = "nodejs"') &&
    route.includes("PATCH"),
  "Customer profile route must authenticate staff and delegate profile updates in Node runtime."
)

for (const behavior of [
  "editRoles",
  "globalRoles",
  "assertCanEditProfile",
  "assignedStaffId === profile.id",
  '"This role cannot edit customer profiles."',
  '"You can only edit profiles for customers assigned to you."',
]) {
  assert(customers.includes(behavior), `Profile update service missing ${behavior}.`)
}

for (const field of [
  "name",
  "phone",
  "address",
  "customer_type",
  "area",
  "tags",
  "remarks",
  "birthday",
  "company_name",
  "updated_by",
]) {
  assert(customers.includes(field), `Profile update service missing ${field}.`)
}

assert(
  customers.includes("WHATSAPP_CUSTOMER_PROFILE_UPDATE") &&
    customers.includes('"crm_audit_logs"') &&
    customers.includes('"crm_customers"'),
  "Profile updates must write CRM customers and audit logs."
)

assert(
  types.includes("CrmCustomerProfileUpdate") &&
    types.includes('"companyName"'),
  "CRM types must expose the editable customer profile update shape."
)

for (const marker of [
  "CustomerProfileForm",
  'fetch("/api/whatsapp/customer-profile"',
  "handleSaveProfile",
  "onCustomerUpdated(result.customer)",
  "Customer profile updated.",
  "This role can view customer profiles but cannot edit them.",
  "setCustomers",
  "canEditProfile",
]) {
  assert(inbox.includes(marker), `Chat profile UI missing ${marker}.`)
}

for (const label of [
  "Name",
  "Phone",
  "Company",
  "Customer type",
  "Birthday",
  "Area",
  "Address",
  "Tags",
  "Remarks",
]) {
  assert(inbox.includes(label), `Profile edit form missing ${label}.`)
}

assert(
  packageJson.includes("whatsapp-crm-profile-coverage.mjs"),
  "Profile coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM profile coverage passed.")
