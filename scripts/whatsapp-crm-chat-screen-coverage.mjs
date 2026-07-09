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
const data = read("lib/whatsapp-crm/data.ts")
const mock = read("data/mock/whatsapp-crm.ts")
const migration = read("supabase/migrations/202606240003_whatsapp_crm_phase1.sql")
const packageJson = read("package.json")

for (const messageType of ['"text"', '"image"', '"file"', '"audio"', '"location"']) {
  assert(
    types.includes(messageType),
    `CRM message type union must include ${messageType}.`
  )
}

assert(
  types.includes("isPriceList?: boolean") &&
    migration.includes("is_price_list boolean not null default false") &&
    data.includes("isPriceList: readBoolean(row.is_price_list)"),
  "Price list image messages must be represented in types, database rows, and data mapping."
)

for (const branch of [
  'message.type === "image"',
  'message.type === "file"',
  'message.type === "audio"',
  'message.type === "location"',
]) {
  assert(inbox.includes(branch), `Chat screen missing renderer branch: ${branch}.`)
}

for (const label of [
  "Price list image",
  "Attached file",
  "Shared location",
  "Voice note describing the smell issue",
]) {
  assert(
    inbox.includes(label) || mock.includes(label),
    `Chat screen or demo data missing ${label}.`
  )
}

assert(
  inbox.includes("SheetContent") &&
    inbox.includes("SheetHeader") &&
    inbox.includes("SheetTitle") &&
    inbox.includes("Customer profile drawer"),
  "Chat screen must expose the customer profile in a drawer."
)

for (const fixture of [
  'type: "file"',
  'type: "audio"',
  "isPriceList: true",
]) {
  assert(mock.includes(fixture), `Demo messages missing ${fixture}.`)
}

assert(
  packageJson.includes("whatsapp-crm-chat-screen-coverage.mjs"),
  "Chat screen coverage must be wired into npm smoke."
)

console.log("WhatsApp CRM chat screen coverage passed.")
