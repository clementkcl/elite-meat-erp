import { NextResponse } from "next/server"

import { getCurrentProfile } from "@/lib/auth/session"
import { sendApprovedWhatsappReply } from "@/lib/whatsapp-crm/send"
import { createSupabaseAdminClient } from "@/server/supabase-admin"

export const runtime = "nodejs"

type SendPayload = {
  customerId?: string
  conversationId?: string | null
  type?: "text" | "image" | "file" | "audio" | "location"
  body?: string
  mediaId?: string
  caption?: string
  isPriceList?: boolean
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return NextResponse.json(
      { error: "WhatsApp sending is not configured." },
      { status: 503 }
    )
  }

  const payload = (await request.json().catch(() => ({}))) as SendPayload
  const result = await sendApprovedWhatsappReply({
    supabase,
    profile,
    input: payload,
  })

  if (!result.message && result.error) {
    const status = result.error.includes("role") || result.error.includes("assigned")
      ? 403
      : 400

    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result, {
    status: result.ok || result.skipped ? 200 : 502,
  })
}
