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

function buildPayload({ phoneNumberId, displayPhoneNumber, customerPhone, runId }) {
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
                  profile: { name: "Codex UAT Media Replay" },
                  wa_id: customerPhone,
                },
              ],
              messages: [
                {
                  from: customerPhone,
                  id: `wamid.codex-media-image-${runId}`,
                  timestamp,
                  type: "image",
                  image: {
                    id: `codex-image-${runId}`,
                    caption: "UAT image webhook replay check",
                    mime_type: "image/jpeg",
                  },
                },
                {
                  from: customerPhone,
                  id: `wamid.codex-media-document-${runId}`,
                  timestamp,
                  type: "document",
                  document: {
                    id: `codex-document-${runId}`,
                    filename: "uat-price-list.pdf",
                    caption: "UAT document webhook replay check",
                    mime_type: "application/pdf",
                  },
                },
                {
                  from: customerPhone,
                  id: `wamid.codex-media-audio-${runId}`,
                  timestamp,
                  type: "audio",
                  audio: {
                    id: `codex-audio-${runId}`,
                    mime_type: "audio/ogg",
                  },
                },
                {
                  from: customerPhone,
                  id: `wamid.codex-media-location-${runId}`,
                  timestamp,
                  type: "location",
                  location: {
                    latitude: 1.5533,
                    longitude: 110.3592,
                    name: "Codex UAT Location",
                    address: "Masked UAT address",
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
const runId = configuredEnvValue(["WHATSAPP_UAT_MEDIA_RUN_ID"]) || Date.now().toString()

console.log("WhatsApp CRM media webhook replay check.")
printEnvSummary()

if (!deploymentUrl || !appSecret || !phoneNumberId || !customerPhone) {
  console.log(
    "Media replay not checked: configure WHATSAPP_CRM_DEPLOYMENT_URL, WHATSAPP_APP_SECRET, WHATSAPP_UAT_PHONE_NUMBER_ID, and WHATSAPP_UAT_CUSTOMER_PHONE in the runtime that runs this script."
  )
  process.exit(0)
}

const payload = buildPayload({
  phoneNumberId,
  displayPhoneNumber,
  customerPhone,
  runId,
})
const body = JSON.stringify(payload)

try {
  const result = await postPayload({ deploymentUrl, appSecret, body })

  if (result.status !== 200 || !result.json) {
    console.error(`Media replay failed: expected JSON 200 response, got ${result.status}.`)
    process.exitCode = 1
  }

  if (result.compactText.includes("Vercel Authentication Required")) {
    console.error("Media replay failed: deployment authentication blocks webhook POST.")
    process.exitCode = 1
  }

  const stored = readNumber(result.json?.stored)
  const skipped = readNumber(result.json?.skippedDuplicates)
  const errors = Array.isArray(result.json?.errors) ? result.json.errors : []

  if (errors.length > 0) {
    console.error("Media replay failed: webhook returned processing errors.")
    process.exitCode = 1
  }

  if (stored + skipped < 4) {
    console.error(
      `Media replay failed: expected four media/location messages stored or skipped, got stored=${stored}, skipped=${skipped}.`
    )
    process.exitCode = 1
  }

  if (!process.exitCode) {
    console.log("Media webhook replay passed.")
    console.log(`Result summary: stored=${stored}, skipped=${skipped}.`)
  }
} catch (error) {
  console.error(
    `Media replay check failed without exposing secrets: ${
      error instanceof Error ? error.message : "unknown error"
    }`
  )
  process.exitCode = 1
}
