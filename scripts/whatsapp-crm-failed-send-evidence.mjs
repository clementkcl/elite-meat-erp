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

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

function failedReasonForMessage(row) {
  const rawPayload = asRecord(row.raw_payload)
  const sendResult = asRecord(rawPayload.send_result)

  return (
    typeof rawPayload.failed_reason === "string" && rawPayload.failed_reason.trim()
      ? rawPayload.failed_reason.trim()
      : typeof sendResult.error === "string" && sendResult.error.trim()
        ? sendResult.error.trim()
        : ""
  )
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
const uatCustomerId = configuredEnvValue(["WHATSAPP_UAT_CUSTOMER_ID"])
const afterIso = configuredEnvValue(["WHATSAPP_UAT_FAILED_AFTER"])

console.log("WhatsApp CRM failed-send evidence check.")
printEnvSummary()

if (!supabaseUrl || !serviceRoleKey) {
  console.log(
    "Failed-send evidence not checked: configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the runtime that runs this script."
  )
  process.exit(0)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

let query = supabase
  .from("crm_messages")
  .select("id, customer_id, status, direction, raw_payload, created_at")
  .eq("direction", "outbound")
  .eq("status", "failed")
  .order("created_at", { ascending: false })
  .limit(20)

if (uatCustomerId) {
  query = query.eq("customer_id", uatCustomerId)
}

if (afterIso) {
  query = query.gte("created_at", afterIso)
}

const result = await query

if (result.error) {
  fail(`Failed-send evidence check could not read crm_messages: ${result.error.message}`)
  process.exit()
}

const rows = Array.isArray(result.data) ? result.data : []
const rowsWithReason = rows.filter((row) => failedReasonForMessage(row))

console.log(`Failed outbound CRM messages found: ${rows.length}.`)
console.log(`Failed outbound messages with stored reason: ${rowsWithReason.length}.`)

if (rows.length === 0) {
  fail(
    uatCustomerId
      ? "No failed outbound message found for the configured UAT customer."
      : "No failed outbound message found. Run the controlled browser failure test first."
  )
}

if (rowsWithReason.length === 0) {
  fail("Failed outbound messages exist, but none store a useful failed reason.")
}

if (!process.exitCode) {
  console.log(
    `Failed-send evidence passed. Latest failed message id=${rowsWithReason[0].id}; created_at=${rowsWithReason[0].created_at}.`
  )
}
