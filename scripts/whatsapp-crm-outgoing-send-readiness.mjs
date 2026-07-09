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

function maskPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "")
  if (digits.length <= 4) return "****"

  return `${digits.slice(0, 2)}...${digits.slice(-2)}`
}

function printEnvSummary() {
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
    `- WhatsApp Cloud API access token: ${
      configuredEnvNames([
        "WHATSAPP_ACCESS_TOKEN",
        "WHATSAPP_CLOUD_API_TOKEN",
        "WHATSAPP_TOKEN",
      ]).join(" or ") || "missing"
    }`
  )
  console.log(
    `- WhatsApp Graph API version: ${
      configuredEnvNames(["WHATSAPP_GRAPH_API_VERSION", "WHATSAPP_CLOUD_API_VERSION"]).join(
        " or "
      ) || "missing; runtime defaults to v23.0"
    }`
  )
  console.log(
    `- UAT customer ID: ${
      configuredEnvNames(["WHATSAPP_UAT_CUSTOMER_ID"]).join(" or ") || "not configured"
    }`
  )
}

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

const supabaseUrl = configuredEnvValue(["NEXT_PUBLIC_SUPABASE_URL"])
const serviceRoleKey = configuredEnvValue(["SUPABASE_SERVICE_ROLE_KEY"])
const cloudToken = configuredEnvValue([
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_CLOUD_API_TOKEN",
  "WHATSAPP_TOKEN",
])
const uatCustomerId = configuredEnvValue(["WHATSAPP_UAT_CUSTOMER_ID"])

console.log("WhatsApp CRM outgoing send readiness check.")
printEnvSummary()

if (!supabaseUrl || !serviceRoleKey) {
  console.log(
    "Outgoing readiness not checked: configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the runtime that runs this script."
  )
  process.exit(0)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const accountResult = await supabase
  .from("whatsapp_accounts")
  .select("id, display_name, phone_number_id, is_active")
  .eq("is_active", true)
  .limit(20)

if (accountResult.error) {
  fail(`Outgoing readiness failed while reading whatsapp_accounts: ${accountResult.error.message}`)
  process.exit()
}

const accounts = Array.isArray(accountResult.data) ? accountResult.data : []
console.log(`Active WhatsApp accounts available for sending: ${accounts.length}.`)

if (accounts.length === 0) {
  fail("No active whatsapp_accounts rows found for outgoing send UAT.")
}

const customerQuery = supabase
  .from("crm_customers")
  .select("id, name, phone, whatsapp_account_id, assigned_staff_id, is_active")
  .eq("is_active", true)
  .not("whatsapp_account_id", "is", null)
  .limit(20)

const customerResult = uatCustomerId
  ? await customerQuery.eq("id", uatCustomerId)
  : await customerQuery

if (customerResult.error) {
  fail(`Outgoing readiness failed while reading crm_customers: ${customerResult.error.message}`)
  process.exit()
}

const customers = Array.isArray(customerResult.data) ? customerResult.data : []
console.log(`Linked active CRM customers available for sending: ${customers.length}.`)

if (customers.length === 0) {
  fail(
    uatCustomerId
      ? "Configured WHATSAPP_UAT_CUSTOMER_ID does not point to an active CRM customer with a WhatsApp account."
      : "No active CRM customers with WhatsApp account links found for outgoing send UAT."
  )
}

const accountIds = new Set(accounts.map((account) => account.id))
const customersWithoutActiveAccount = customers.filter(
  (customer) => !accountIds.has(customer.whatsapp_account_id)
)

if (customersWithoutActiveAccount.length > 0) {
  fail(
    `${customersWithoutActiveAccount.length} linked customer(s) point to inactive or missing WhatsApp accounts.`
  )
}

if (!cloudToken) {
  fail("WhatsApp Cloud API access token is missing, so CRM replies cannot reach real WhatsApp.")
}

const sample = customers[0]
if (sample) {
  console.log(
    `Sample UAT customer ready for browser send test: id=${sample.id}, phone=${maskPhone(
      sample.phone
    )}.`
  )
}

if (!process.exitCode) {
  console.log(
    "Outgoing send readiness passed. Use the CRM browser UI with an authorized staff login to send the actual UAT reply."
  )
}
