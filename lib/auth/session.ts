import { redirect } from "next/navigation"

import { asRecord, asRecordArray, readString } from "@/lib/records"
import {
  isModuleKey,
  moduleKeys,
  type ModuleKey,
} from "@/lib/auth/access"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { userRoles, type CurrentProfile, type UserRole } from "@/lib/auth/types"

export type { CurrentProfile, UserRole } from "@/lib/auth/types"

const demoProfile: CurrentProfile = {
  id: "demo-user",
  email: "demo@elitemeat.local",
  fullName: "Demo Admin",
  roles: ["admin", "director"],
  departmentId: null,
  departmentName: null,
  branchId: null,
  branchName: null,
  outletId: null,
  outletName: null,
  stockLocationId: null,
  stockLocationName: null,
  moduleAccess: [...moduleKeys],
  demoMode: true,
}

export function isUserRole(role: string): role is UserRole {
  return userRoles.includes(role as UserRole)
}

export function hasAnyRole(profile: CurrentProfile, roles: UserRole[]) {
  return roles.some((role) => profile.roles.includes(role))
}

async function loadNameById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  id: string | null
) {
  if (!supabase || !id) {
    return null
  }

  const { data } = await supabase
    .from(table)
    .select("name")
    .eq("id", id)
    .maybeSingle()

  return readString(asRecord(data).name) || null
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

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, department_id, branch_id, outlet_id, stock_location_id")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    console.error("Profile load failed", error.message)
    return null
  }

  if (!data) {
    console.error("Profile row missing for authenticated user", user.id)
    return null
  }

  const profile = asRecord(data)
  const outletId = readString(profile.outlet_id) || null
  const departmentId = readString(profile.department_id) || null
  const branchId = readString(profile.branch_id) || null
  const stockLocationId = readString(profile.stock_location_id) || null
  const { data: roleRows, error: roleError } = await supabase
    .from("profile_roles")
    .select("role_key")
    .eq("profile_id", user.id)
  const profileRoles = roleError
    ? []
    : asRecordArray(roleRows)
    .map((entry) => readString(entry.role_key))
    .filter(isUserRole)
  let moduleAccess: ModuleKey[] = []

  if (outletId) {
    const { data: moduleRows, error: moduleError } = await supabase
      .from("outlet_module_access")
      .select("module_key")
      .eq("outlet_id", outletId)
      .eq("is_enabled", true)

    if (moduleError) {
      console.error("Module access load failed", moduleError.message)
      moduleAccess = []
    } else {
      moduleAccess = asRecordArray(moduleRows)
        .map((entry) => readString(entry.module_key))
        .filter(isModuleKey)
    }
  }
  const [departmentName, branchName, outletName, stockLocationName] =
    await Promise.all([
      loadNameById(supabase, "departments", departmentId),
      loadNameById(supabase, "branches", branchId),
      loadNameById(supabase, "outlets", outletId),
      loadNameById(supabase, "stock_locations", stockLocationId),
    ])

  return {
    id: user.id,
    email: readString(profile.email, user.email ?? ""),
    fullName: readString(
      profile.full_name,
      readString(user.user_metadata?.full_name, user.email ?? "ERP User")
    ),
    roles:
      profileRoles.length > 0
        ? profileRoles
        : [],
    departmentId,
    departmentName,
    branchId,
    branchName,
    outletId,
    outletName,
    stockLocationId,
    stockLocationName,
    moduleAccess,
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
