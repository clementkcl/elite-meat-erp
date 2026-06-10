import { redirect } from "next/navigation"

import { asRecord, asRecordArray, readString } from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const userRoles = [
  "general_worker",
  "retail_team",
  "account",
  "admin",
  "director",
] as const

export type UserRole = (typeof userRoles)[number]

export type CurrentProfile = {
  id: string
  email: string
  fullName: string
  roles: UserRole[]
  demoMode: boolean
}

const demoProfile: CurrentProfile = {
  id: "demo-user",
  email: "demo@elitemeat.local",
  fullName: "Demo Admin",
  roles: ["admin", "director"],
  demoMode: true,
}

export function isUserRole(role: string): role is UserRole {
  return userRoles.includes(role as UserRole)
}

export function hasAnyRole(profile: CurrentProfile, roles: UserRole[]) {
  return roles.some((role) => profile.roles.includes(role))
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return demoProfile
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, profile_roles(roles(role_key))")
    .eq("id", user.id)
    .maybeSingle()

  const profile = asRecord(data)
  const profileRoles = asRecordArray(profile.profile_roles)
    .map((entry) => readString(asRecord(entry.roles).role_key))
    .filter(isUserRole)

  return {
    id: user.id,
    email: readString(profile.email, user.email ?? ""),
    fullName: readString(
      profile.full_name,
      readString(user.user_metadata?.full_name, user.email ?? "ERP User")
    ),
    roles: profileRoles.length > 0 ? profileRoles : ["general_worker"],
    demoMode: false,
  }
}

export async function requireCurrentProfile() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  return profile
}
