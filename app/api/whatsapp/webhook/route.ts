import { NextResponse } from "next/server"

import {
  verifyWebhookToken,
  verifyWhatsAppRequestSignature,
} from "@/lib/whatsapp-crm/cloud-api"
import { processWhatsappWebhookPayload } from "@/lib/whatsapp-crm/webhook"
import { createSupabaseAdminClient } from "@/server/supabase-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")

  if (verifyWebhookToken(mode, token) && challenge) {
    console.info("WhatsApp webhook verification accepted.")
    return new Response(challenge, { status: 200 })
  }

  console.warn("WhatsApp webhook verification rejected.", {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge),
  })

  return new Response("Forbidden", { status: 403 })
}

export async function POST(request: Request) {
  const rawBody = await request.text().catch(() => "")
  const signatureValid = await verifyWhatsAppRequestSignature({
    body: rawBody,
    signatureHeader: request.headers.get("x-hub-signature-256"),
  })

  if (!signatureValid) {
    console.warn("WhatsApp webhook signature rejected.")

    return NextResponse.json({ received: false, error: "Invalid signature." }, { status: 403 })
  }

  const payload = (() => {
    if (!rawBody) return null

    try {
      return JSON.parse(rawBody)
    } catch {
      return null
    }
  })()
  const supabase = createSupabaseAdminClient()

  if (!payload || !supabase) {
    console.warn("WhatsApp webhook received without payload or Supabase admin client.", {
      hasPayload: Boolean(payload),
      hasSupabase: Boolean(supabase),
    })

    return NextResponse.json({ received: true, stored: false })
  }

  const result = await processWhatsappWebhookPayload(supabase, payload).catch((error) => {
    console.warn("WhatsApp webhook processing failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    })

    return {
      received: true,
      rawStored: 0,
      stored: 0,
      statusesUpdated: 0,
      skippedDuplicates: 0,
      errors: ["Webhook processing failed."],
    }
  })

  return NextResponse.json(result)
}
