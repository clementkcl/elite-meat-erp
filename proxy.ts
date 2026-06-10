import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { getSupabaseEnv } from "@/lib/env"
import { supabaseFetch } from "@/lib/supabase/fetch"

export async function proxy(request: NextRequest) {
  const env = getSupabaseEnv()
  let response = NextResponse.next({ request })

  if (!env) {
    return response
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    global: {
      fetch: supabaseFetch,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
