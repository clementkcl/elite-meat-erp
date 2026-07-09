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

function printEnvSummary() {
  console.log("Configured env names found without printing secret values:")
  console.log(
    `- Deployment URL: ${
      configuredEnvNames(["WHATSAPP_CRM_DEPLOYMENT_URL"]).join(" or ") || "missing"
    }`
  )
  console.log(
    `- Webhook verify token: ${
      configuredEnvNames([
        "WHATSAPP_VERIFY_TOKEN",
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
        "VERIFY_TOKEN",
      ]).join(" or ") || "missing"
    }`
  )
}

async function requestChallenge({ deploymentUrl, verifyToken, challenge }) {
  const normalizedBaseUrl = deploymentUrl.startsWith("http")
    ? deploymentUrl
    : `https://${deploymentUrl}`
  const url = new URL("/api/whatsapp/webhook", normalizedBaseUrl)
  url.searchParams.set("hub.mode", "subscribe")
  url.searchParams.set("hub.verify_token", verifyToken)
  url.searchParams.set("hub.challenge", challenge)

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  })
  const body = await response.text().catch(() => "")

  return {
    status: response.status,
    body,
    compactBody: body.replace(/\s+/g, " ").trim().slice(0, 120),
  }
}

const deploymentUrl = configuredEnvValue(["WHATSAPP_CRM_DEPLOYMENT_URL"])
const verifyToken = configuredEnvValue([
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "VERIFY_TOKEN",
])
const challenge = `codex-live-uat-${Date.now()}`

console.log("WhatsApp CRM webhook challenge check.")
printEnvSummary()

if (!deploymentUrl || !verifyToken) {
  console.log(
    "Challenge not checked: configure WHATSAPP_CRM_DEPLOYMENT_URL and a webhook verify token in the runtime that runs this script."
  )
  process.exit(0)
}

try {
  const realTokenResult = await requestChallenge({
    deploymentUrl,
    verifyToken,
    challenge,
  })

  if (realTokenResult.status === 200 && realTokenResult.body === challenge) {
    console.log("Real-token webhook challenge passed.")
  } else if (realTokenResult.compactBody.includes("Vercel Authentication Required")) {
    console.error(
      "Real-token webhook challenge failed: deployment authentication blocks Meta webhook verification."
    )
    process.exitCode = 1
  } else {
    console.error(
      `Real-token webhook challenge failed: expected 200 challenge echo, got ${realTokenResult.status}.`
    )
    process.exitCode = 1
  }

  const wrongTokenResult = await requestChallenge({
    deploymentUrl,
    verifyToken: "__codex_wrong_token__",
    challenge,
  })

  if (wrongTokenResult.status === 403 && wrongTokenResult.compactBody.includes("Forbidden")) {
    console.log("Wrong-token webhook challenge correctly rejected.")
  } else {
    console.error(
      `Wrong-token webhook challenge check failed: expected 403 Forbidden, got ${wrongTokenResult.status}.`
    )
    process.exitCode = 1
  }
} catch (error) {
  console.error(
    `Webhook challenge check failed without exposing secrets: ${
      error instanceof Error ? error.message : "unknown error"
    }`
  )
  process.exitCode = 1
}
