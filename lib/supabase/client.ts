"use client"

import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseEnv } from "@/lib/env"

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  const env = getSupabaseEnv()

  if (!env) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    )
  }

  if (!browserClient) {
    browserClient = createBrowserClient(env.url, env.anonKey)
  }

  return browserClient
}
