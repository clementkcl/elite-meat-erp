import { NextResponse } from "next/server"

import { getCurrentProfile } from "@/lib/auth/session"
import { sendWhatsappPriceListBroadcast } from "@/lib/whatsapp-crm/broadcasts"
import { createSupabaseAdminClient } from "@/server/supabase-admin"

export const runtime = "nodejs"

function statusForError(error: string | null) {
  return error?.includes("owner/admin") ? 403 : 400
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return NextResponse.json(
      { error: "WhatsApp CRM broadcasts are not configured." },
      { status: 503 }
    )
  }

  const payload = await request.json().catch(() => ({}))
  const result = await sendWhatsappPriceListBroadcast({
    supabase,
    profile,
    input: payload,
  })

  if (!result.ok && !result.broadcast) {
    return NextResponse.json(result, { status: statusForError(result.error) })
  }

  return NextResponse.json(result, {
    status: result.ok ? 200 : 207,
  })
}
