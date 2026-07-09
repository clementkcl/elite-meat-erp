import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function read(path) {
  return readFileSync(join(root, path), "utf8")
}

function readIfExists(path) {
  const fullPath = join(root, path)

  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : ""
}

function parseEnvText(text) {
  const values = new Map()

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue

    const value = match[2].replace(/^['"]|['"]$/g, "").trim()
    values.set(match[1], value)
  }

  return values
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const envFiles = [".env.local", ".env"].map((path) => ({
  path,
  values: parseEnvText(readIfExists(path)),
}))

function hasConfiguredEnv(names) {
  return names.some((name) => {
    const processValue = process.env[name]
    if (processValue && processValue.trim()) return true

    return envFiles.some(({ values }) => {
      const value = values.get(name)

      return Boolean(value && value.trim())
    })
  })
}

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

function envNamesPresent(names) {
  return names.filter((name) => hasConfiguredEnv([name]))
}

const requiredEnvGroups = [
  {
    label: "Supabase URL",
    names: ["NEXT_PUBLIC_SUPABASE_URL"],
  },
  {
    label: "Supabase anon key",
    names: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
  {
    label: "Supabase service-role key",
    names: ["SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    label: "WhatsApp Cloud API access token",
    names: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_CLOUD_API_TOKEN", "WHATSAPP_TOKEN"],
  },
  {
    label: "WhatsApp Cloud API version",
    names: ["WHATSAPP_GRAPH_API_VERSION", "WHATSAPP_CLOUD_API_VERSION"],
  },
  {
    label: "WhatsApp webhook verify token",
    names: ["WHATSAPP_VERIFY_TOKEN", "WHATSAPP_WEBHOOK_VERIFY_TOKEN", "VERIFY_TOKEN"],
  },
]

const missingEnv = requiredEnvGroups.filter((group) => !hasConfiguredEnv(group.names))
const envReady = missingEnv.length === 0
const deploymentUrl = configuredEnvValue(["WHATSAPP_CRM_DEPLOYMENT_URL"])

const route = read("app/api/whatsapp/webhook/route.ts")
const cloudApi = read("lib/whatsapp-crm/cloud-api.ts")
const webhook = read("lib/whatsapp-crm/webhook.ts")
const send = read("lib/whatsapp-crm/send.ts")
const inbox = read("components/whatsapp-crm/whatsapp-crm-inbox.tsx")
const dashboard = read("lib/whatsapp-crm/dashboard.ts")
const liveUatDoc = read("docs/WHATSAPP_CRM_LIVE_UAT.md")

for (const marker of [
  "verifyWebhookToken(mode, token)",
  "request.text()",
  "x-hub-signature-256",
  "Invalid signature.",
  "processWhatsappWebhookPayload",
]) {
  assert(route.includes(marker), `Webhook route is missing ${marker}.`)
}

for (const marker of [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_CLOUD_API_TOKEN",
  "WHATSAPP_TOKEN",
  "WHATSAPP_GRAPH_API_VERSION",
  "WHATSAPP_CLOUD_API_VERSION",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "verifyWhatsAppRequestSignature",
]) {
  assert(cloudApi.includes(marker), `Cloud API helper is missing ${marker}.`)
}

for (const marker of [
  "normalizeWhatsappWebhookPayload",
  "normalizeWhatsappStatusPayload",
  "messageAlreadyStored",
  "skippedDuplicates",
  "phone_number_id",
  "external_message_id",
  "Unsupported WhatsApp message type",
  'type === "image"',
  'type === "document"',
  'type === "audio"',
  'type === "location"',
  "failedReasonForStatus",
]) {
  assert(webhook.includes(marker), `Webhook processor is missing ${marker}.`)
}

for (const marker of [
  "phoneNumberForWhatsApp",
  "externalMessageIdFromResult",
  "friendlySendError",
  "Live WhatsApp location sending is not supported yet.",
  "failed_reason",
  "WHATSAPP_OUTBOUND_MESSAGE",
]) {
  assert(send.includes(marker), `Send handler is missing ${marker}.`)
}

assert(inbox.includes("failed to send"), "Inbox UI must expose failed-send state.")
assert(
  dashboard.includes("buildWhatsappCrmDashboard") &&
    dashboard.includes("newMessagesTodayCount"),
  "Owner dashboard metrics must still be available for live-message recomputation."
)

for (const marker of [
  "Real customer sends text",
  "Staff replies from CRM",
  "Customer sends image",
  "Customer sends file/document",
  "Customer sends audio/voice note",
  "Customer sends location",
  "second company WhatsApp number",
  "Same webhook event is replayed",
  "Outgoing send fails",
  "Owner dashboard after live message",
]) {
  assert(liveUatDoc.includes(marker), `Live UAT document is missing ${marker}.`)
}

async function checkDeploymentWebhookReachability(rawDeploymentUrl) {
  if (!rawDeploymentUrl) {
    return {
      configured: false,
      message:
        "not checked; set WHATSAPP_CRM_DEPLOYMENT_URL to check public webhook reachability",
    }
  }

  const normalizedBaseUrl = rawDeploymentUrl.startsWith("http")
    ? rawDeploymentUrl
    : `https://${rawDeploymentUrl}`
  const url = new URL("/api/whatsapp/webhook", normalizedBaseUrl)
  url.searchParams.set("hub.mode", "subscribe")
  url.searchParams.set("hub.verify_token", "__codex_wrong_token__")
  url.searchParams.set("hub.challenge", "codex_readiness_check")

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })
    const body = await response.text().catch(() => "")
    const compactBody = body.replace(/\s+/g, " ").trim().slice(0, 120)

    if (response.status === 403 && compactBody.includes("Forbidden")) {
      return {
        configured: true,
        message: "route reachable; wrong-token challenge returned route-level 403 Forbidden",
      }
    }

    if (compactBody.includes("Vercel Authentication Required") || response.status === 401) {
      return {
        configured: true,
        message:
          "blocked by deployment authentication; Meta webhook verification cannot reach this URL",
      }
    }

    if (response.status === 404 || compactBody.includes("Cannot GET")) {
      return {
        configured: true,
        message:
          "deployment did not serve /api/whatsapp/webhook; confirm project/deployment is current",
      }
    }

    return {
      configured: true,
      message: `unexpected response ${response.status}; inspect deployed webhook route before live UAT`,
    }
  } catch (error) {
    return {
      configured: true,
      message: `check failed without exposing secrets: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    }
  }
}

const optionalAppSecret = envNamesPresent(["WHATSAPP_APP_SECRET"])
const deploymentCheck = await checkDeploymentWebhookReachability(deploymentUrl)

console.log("WhatsApp CRM live UAT source readiness passed.")
console.log("Configured env groups found without printing secret values:")
for (const group of requiredEnvGroups) {
  const presentNames = envNamesPresent(group.names)
  console.log(`- ${group.label}: ${presentNames.length ? presentNames.join(" or ") : "missing"}`)
}
console.log(
  `- Webhook app secret: ${optionalAppSecret.length > 0 ? "configured" : "not configured; recommended before public UAT"}`
)
console.log(`Deployment webhook reachability: ${deploymentCheck.message}.`)
console.log(
  "Run node scripts\\whatsapp-crm-account-mapping-readiness.mjs with live Supabase env to verify whatsapp_accounts phone_number_id mappings."
)
console.log(
  "Run node scripts\\whatsapp-crm-webhook-challenge-check.mjs with live deployment URL and verify token to confirm Meta challenge readiness."
)
console.log(
  "Run node scripts\\whatsapp-crm-duplicate-webhook-replay.mjs with explicit UAT phone env to verify duplicate webhook idempotency."
)
console.log(
  "Run node scripts\\whatsapp-crm-media-webhook-replay.mjs with explicit UAT phone env to verify media/location webhook handling."
)
console.log(
  "Run node scripts\\whatsapp-crm-outgoing-send-readiness.mjs with live Supabase env before the browser-based CRM reply test."
)
console.log(
  "Run node scripts\\whatsapp-crm-failed-send-evidence.mjs after a controlled browser failure test to verify failed-send evidence."
)
if (!envReady) {
  console.log(
    `Live credential setup is incomplete: ${missingEnv.map((group) => group.label).join(", ")}.`
  )
}
console.log("Manual real-device UAT is still required before Task 16 can be accepted.")
