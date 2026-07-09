import { NextResponse } from "next/server"

import { getCurrentProfile } from "@/lib/auth/session"
import { updateWhatsappCrmCustomerProfile } from "@/lib/whatsapp-crm/customers"
import { createSupabaseAdminClient } from "@/server/supabase-admin"

export const runtime = "nodejs"

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return NextResponse.json(
      { error: "Customer profile updates are not configured." },
      { status: 503 }
    )
  }

  const payload = await request.json().catch(() => ({}))
  const result = await updateWhatsappCrmCustomerProfile({
    supabase,
    profile,
    input: payload,
  })

  if (!result.ok) {
    const status =
      result.error?.includes("role") || result.error?.includes("assigned")
        ? 403
        : 400

    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result)
}
