import { NextResponse } from "next/server"

import { getCurrentProfile } from "@/lib/auth/session"
import {
  createWhatsappCrmSimpleOrder,
  updateWhatsappCrmOrderStatus,
} from "@/lib/whatsapp-crm/orders"
import { createSupabaseAdminClient } from "@/server/supabase-admin"

export const runtime = "nodejs"

function statusForError(error: string | null) {
  return error?.includes("role") || error?.includes("assigned") ? 403 : 400
}

async function getOrderRouteContext() {
  const profile = await getCurrentProfile()

  if (!profile) {
    return {
      response: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
      profile: null,
      supabase: null,
    }
  }

  const supabase = createSupabaseAdminClient()

  if (!supabase) {
    return {
      response: NextResponse.json(
        { error: "WhatsApp CRM orders are not configured." },
        { status: 503 }
      ),
      profile,
      supabase: null,
    }
  }

  return {
    response: null,
    profile,
    supabase,
  }
}

export async function POST(request: Request) {
  const context = await getOrderRouteContext()

  if (context.response) {
    return context.response
  }

  const payload = await request.json().catch(() => ({}))
  const result = await createWhatsappCrmSimpleOrder({
    supabase: context.supabase,
    profile: context.profile,
    input: payload,
  })

  if (!result.ok) {
    return NextResponse.json(result, { status: statusForError(result.error) })
  }

  return NextResponse.json(result)
}

export async function PATCH(request: Request) {
  const context = await getOrderRouteContext()

  if (context.response) {
    return context.response
  }

  const payload = await request.json().catch(() => ({}))
  const result = await updateWhatsappCrmOrderStatus({
    supabase: context.supabase,
    profile: context.profile,
    input: payload,
  })

  if (!result.ok) {
    return NextResponse.json(result, { status: statusForError(result.error) })
  }

  return NextResponse.json(result)
}
