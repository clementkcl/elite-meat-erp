"use server"

import { redirect } from "next/navigation"

import type { AuthActionState } from "@/lib/auth/action-state"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function signInAction(
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return {
      error:
        "Supabase is not configured yet. Add the public Supabase environment variables first.",
    }
  }

  if (!email || !password) {
    return { error: "Enter both email and password." }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/stock/dashboard")
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()

  if (supabase) {
    await supabase.auth.signOut()
  }

  redirect("/login")
}
