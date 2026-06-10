import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { getSupabaseEnv } from "@/lib/env"
import { supabaseFetch } from "@/lib/supabase/fetch"

export async function createSupabaseServerClient() {
  const env = getSupabaseEnv()

  if (!env) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(env.url, env.anonKey, {
    global: {
      fetch: supabaseFetch,
    },
    auth: {
      persistSession: true,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot always write cookies; proxy handles refreshes.
        }
      },
    },
  })
}

export type SupabaseServerClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>
