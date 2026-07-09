import { createHmac } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

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

function normalizePhone(value) {
  return value.replace(/\D/g, "").replace(/^00/, "")
}

function printEnvSummary() {
  console.log("Configured env names found without printing secret values:")
  console.log(
    `- Deployment URL: ${
      configuredEnvNames(["WHATSAPP_CRM_DEPLOYMENT_URL"]).join(" or ") || "missing"
    }`
  )
  console.log(
    `- Webhook app secret: ${
      configuredEnvNames(["WHATSAPP_APP_SECRET"]).join(" or ") || "missing"
    }`
  )
  console.log(
    `- UAT phone-number ID: ${
      configuredEnvNames(["WHATSAPP_UAT_PHONE_NUMBER_ID", "WHATSAPP_PHONE_NUMBER_ID"]).join(
        " or "
      ) || "missing"
    }`
  )
  console.log(
    `- UAT customer phone: ${
      configuredEnvNames(["WHATSAPP_UAT_CUSTOMER_PHONE"]).join(" or ") || "missing"
    }`
  )
}

function buildPayload({ phoneNumberId, displayPhoneNumber, customerPhone, messageId }) {
  const timestamp = Math.floor(Date.now() / 1000).toString()

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "codex_uat_waba",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: displayPhoneNumber,
                phone_number_id: phoneNumberId,
              },
              contacts: [
                {
                  profile: { name: "Codex UAT Duplicate Replay" },
                  wa_id: customerPhone,
                },
              ],
              messages: [
                {
                  from: customerPhone,
                  id: messageId,
                  timestamp,
                  type: "text",
                  text: {
                    body: "UAT duplicate webhook replay check",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

async function postPayload({ deploymentUrl, appSecret, body }) {
  const normalizedBaseUrl = deploymentUrl.startsWith("http")
    ? deploymentUrl
    : `https://${deploymentUrl}`
  const url = new URL("/api/whatsapp/webhook", normalizedBaseUrl)
  const signature = `sha256=${createHmac("sha256", appSecret).update(body, "utf8").digest("hex")}`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": signature,
    },
    body,
    signal: AbortSignal.timeout(10000),
  })
  const text = await response.text().catch(() => "")
  const json = (() => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  })()

  return {
    status: response.status,
    text,
    json,
    compactText: text.replace(/\s+/g, " ").trim().slice(0, 120),
  }
}

function readNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

const deploymentUrl = configuredEnvValue(["WHATSAPP_CRM_DEPLOYMENT_URL"])
const appSecret = configuredEnvValue(["WHATSAPP_APP_SECRET"])
const phoneNumberId = configuredEnvValue(["WHATSAPP_UAT_PHONE_NUMBER_ID", "WHATSAPP_PHONE_NUMBER_ID"])
const displayPhoneNumber =
  configuredEnvValue(["WHATSAPP_UAT_DISPLAY_PHONE_NUMBER"]) || phoneNumberId
const customerPhone = normalizePhone(configuredEnvValue(["WHATSAPP_UAT_CUSTOMER_PHONE"]))
const messageId =
  configuredEnvValue(["WHATSAPP_UAT_DUPLICATE_MESSAGE_ID"]) ||
  `wamid.codex-uat-${Date.now()}`

console.log("WhatsApp CRM duplicate webhook replay check.")
printEnvSummary()

if (!deploymentUrl || !appSecret || !phoneNumberId || !customerPhone) {
  console.log(
    "Duplicate replay not checked: configure WHATSAPP_CRM_DEPLOYMENT_URL, WHATSAPP_APP_SECRET, WHATSAPP_UAT_PHONE_NUMBER_ID, and WHATSAPP_UAT_CUSTOMER_PHONE in the runtime that runs this script."
  )
  process.exit(0)
}

const payload = buildPayload({
  phoneNumberId,
  displayPhoneNumber,
  customerPhone,
  messageId,
})
const body = JSON.stringify(payload)

try {
  const first = await postPayload({ deploymentUrl, appSecret, body })
  const second = await postPayload({ deploymentUrl, appSecret, body })

  if (first.status !== 200 || !first.json) {
    console.error(
      `First webhook replay failed: expected JSON 200 response, got ${first.status}.`
    )
    process.exitCode = 1
  }

  if (second.status !== 200 || !second.json) {
    console.error(
      `Second webhook replay failed: expected JSON 200 response, got ${second.status}.`
    )
    process.exitCode = 1
  }

  const firstStored = readNumber(first.json?.stored)
  const firstSkipped = readNumber(first.json?.skippedDuplicates)
  const firstErrors = Array.isArray(first.json?.errors) ? first.json.errors : []
  const secondStored = readNumber(second.json?.stored)
  const secondSkipped = readNumber(second.json?.skippedDuplicates)
  const secondErrors = Array.isArray(second.json?.errors) ? second.json.errors : []

  if (first.compactText.includes("Vercel Authentication Required")) {
    console.error("Duplicate replay failed: deployment authentication blocks webhook POST.")
    process.exitCode = 1
  }

  if (firstErrors.length > 0 || secondErrors.length > 0) {
    console.error("Duplicate replay failed: webhook returned processing errors.")
    process.exitCode = 1
  }

  if (firstStored < 1 && firstSkipped < 1) {
    console.error("Duplicate replay failed: first payload was neither stored nor identified as duplicate.")
    process.exitCode = 1
  }

  if (secondStored !== 0 || secondSkipped < 1) {
    console.error("Duplicate replay failed: second identical payload was not skipped as duplicate.")
    process.exitCode = 1
  }

  if (!process.exitCode) {
    console.log("Duplicate webhook replay passed.")
    console.log(
      `Result summary: first stored=${firstStored}, first skipped=${firstSkipped}, second stored=${secondStored}, second skipped=${secondSkipped}.`
    )
  }
} catch (error) {
  console.error(
    `Duplicate replay check failed without exposing secrets: ${
      error instanceof Error ? error.message : "unknown error"
    }`
  )
  process.exitCode = 1
}
