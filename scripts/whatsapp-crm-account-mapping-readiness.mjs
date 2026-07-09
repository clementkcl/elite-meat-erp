import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function readIfExists(path) {
  const fullPath = join(root, path)

  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : ""
}

function parseEnvText(text) {
  const values = new Map()

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue

    values.set(match[1], match[2].replace(/^['"]|['"]$/g, "").trim())
  }

  return values
}

const envFiles = [".env.local", ".env"].map((path) => ({
  path,
  values: parseEnvText(readIfExists(path)),
}))

function configuredEnvValue(names) {
  for (const name of names) {
    const processValue = process.env[name]
    if (processValue && processValue.trim()) return processValue.trim()
  }

  for (const name of names) {
    for (const { values } of envFiles) {
      const value = values.get(name)
      if (value && value.trim()) return value.trim()
    }
  }

  return ""
}

function configuredEnvNames(names) {
  return names.filter((name) => Boolean(configuredEnvValue([name])))
}

function expectedPhoneNumberIds() {
  const raw = configuredEnvValue([
    "WHATSAPP_EXPECTED_PHONE_NUMBER_IDS",
    "WHATSAPP_PHONE_NUMBER_IDS",
    "WHATSAPP_PHONE_NUMBER_ID",
  ])

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

function maskIdentifier(value) {
  if (!value) return "(blank)"
  if (value.length <= 4) return "****"

  return `${value.slice(0, 2)}...${value.slice(-2)}`
}

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

const supabaseUrl = configuredEnvValue(["NEXT_PUBLIC_SUPABASE_URL"])
const serviceRoleKey = configuredEnvValue(["SUPABASE_SERVICE_ROLE_KEY"])
const expectedIds = expectedPhoneNumberIds()

console.log("WhatsApp CRM account mapping readiness check.")
console.log("Configured env names found without printing secret values:")
console.log(
  `- Supabase URL: ${
    configuredEnvNames(["NEXT_PUBLIC_SUPABASE_URL"]).join(" or ") || "missing"
  }`
)
console.log(
  `- Supabase service-role key: ${
    configuredEnvNames(["SUPABASE_SERVICE_ROLE_KEY"]).join(" or ") || "missing"
  }`
)
console.log(
  `- Expected WhatsApp phone number IDs: ${
    expectedIds.length > 0 ? `${expectedIds.length} configured` : "not configured"
  }`
)

if (!supabaseUrl || !serviceRoleKey) {
  console.log(
    "Mapping not checked: configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the runtime that runs this script."
  )
  process.exit(0)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const { data, error } = await supabase
  .from("whatsapp_accounts")
  .select("id, display_name, phone_number_id, is_active")
  .order("display_name")

if (error) {
  fail(`Mapping check failed: ${error.message}`)
  process.exit()
}

const accounts = Array.isArray(data) ? data : []
const activeAccounts = accounts.filter((account) => account.is_active)
const configuredIds = new Set(
  accounts
    .map((account) => String(account.phone_number_id ?? "").trim())
    .filter(Boolean)
)
const duplicateIds = accounts
  .map((account) => String(account.phone_number_id ?? "").trim())
  .filter((value, index, values) => value && values.indexOf(value) !== index)
const missingExpectedIds = expectedIds.filter((id) => !configuredIds.has(id))

console.log(`WhatsApp accounts found: ${accounts.length}.`)
console.log(`Active WhatsApp accounts found: ${activeAccounts.length}.`)

if (expectedIds.length > 0) {
  console.log(
    `Expected phone-number IDs checked: ${expectedIds.map(maskIdentifier).join(", ")}.`
  )
}

if (accounts.length === 0) {
  fail("No whatsapp_accounts rows found. Add the company WhatsApp number mappings before live UAT.")
}

if (activeAccounts.length === 0) {
  fail("No active whatsapp_accounts rows found. At least one active mapping is required for live UAT.")
}

if (duplicateIds.length > 0) {
  fail(
    `Duplicate phone_number_id values found: ${[...new Set(duplicateIds)]
      .map(maskIdentifier)
      .join(", ")}.`
  )
}

if (missingExpectedIds.length > 0) {
  fail(
    `Expected WhatsApp phone-number IDs are missing from whatsapp_accounts: ${missingExpectedIds
      .map(maskIdentifier)
      .join(", ")}.`
  )
}

if (!process.exitCode) {
  console.log("WhatsApp CRM account mapping readiness passed.")
}
