type WhatsAppCloudConfig = {
  token: string
  apiVersion: string
}

type SendTextInput = {
  phoneNumberId: string
  to: string
  body: string
}

type SendMediaInput = {
  phoneNumberId: string
  to: string
  mediaId: string
  type: "image" | "document" | "audio"
  caption?: string
}

function getWhatsAppCloudConfig(): WhatsAppCloudConfig | null {
  const token =
    process.env.WHATSAPP_ACCESS_TOKEN ??
    process.env.WHATSAPP_CLOUD_API_TOKEN ??
    process.env.WHATSAPP_TOKEN
  const apiVersion =
    process.env.WHATSAPP_GRAPH_API_VERSION ??
    process.env.WHATSAPP_CLOUD_API_VERSION ??
    "v23.0"

  if (!token) {
    return null
  }

  return { token, apiVersion }
}

async function postWhatsAppMessage(
  phoneNumberId: string,
  payload: Record<string, unknown>
) {
  const config = getWhatsAppCloudConfig()

  if (!config) {
    return {
      ok: false,
      skipped: true,
      error: "WhatsApp Cloud API token is not configured.",
    }
  }

  const response = await fetch(
    `https://graph.facebook.com/${config.apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...payload,
      }),
    }
  )
  const body = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    skipped: false,
    status: response.status,
    body,
    error: response.ok ? null : JSON.stringify(body),
  }
}

export async function sendWhatsAppTextMessage(input: SendTextInput) {
  return postWhatsAppMessage(input.phoneNumberId, {
    to: input.to,
    type: "text",
    text: {
      preview_url: false,
      body: input.body,
    },
  })
}

export async function sendWhatsAppMediaMessage(input: SendMediaInput) {
  return postWhatsAppMessage(input.phoneNumberId, {
    to: input.to,
    type: input.type,
    [input.type]: {
      id: input.mediaId,
      caption: input.caption,
    },
  })
}

export function verifyWebhookToken(mode: string | null, token: string | null) {
  const expected =
    process.env.WHATSAPP_VERIFY_TOKEN ??
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ??
    process.env.VERIFY_TOKEN

  return Boolean(expected && mode === "subscribe" && token === expected)
}

export async function verifyWhatsAppRequestSignature({
  body,
  signatureHeader,
}: {
  body: string
  signatureHeader: string | null
}) {
  const appSecret = process.env.WHATSAPP_APP_SECRET

  if (!appSecret) return true
  if (!signatureHeader?.startsWith("sha256=")) return false

  const { createHmac, timingSafeEqual } = await import("node:crypto")
  const expected = `sha256=${createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest("hex")}`

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(signatureHeader)

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}
