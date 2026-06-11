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
    .select("id, email, full_name, department_id, branch_id, outlet_id, stock_location_id, departments(name), outlets(name), stock_locations(name), profile_roles(roles(role_key))")
    .eq("id", user.id)
    .maybeSingle()

  const profile = asRecord(data)
  const department = asRecord(profile.departments)
  const outlet = asRecord(profile.outlets)
  const stockLocation = asRecord(profile.stock_locations)
  const profileRoles = asRecordArray(profile.profile_roles)
    .map((entry) => readString(asRecord(entry.roles).role_key))
    .filter(isUserRole)
  let moduleAccess: ModuleKey[] = []

  if (readString(profile.outlet_id)) {
    const { data: moduleRows, error: moduleError } = await supabase
      .from("outlet_module_access")
      .select("module_key")
      .eq("outlet_id", readString(profile.outlet_id))
      .eq("is_enabled", true)

    moduleAccess = moduleError
      ? [...moduleKeys]
      : asRecordArray(moduleRows)
          .map((entry) => readString(entry.module_key))
          .filter(isModuleKey)
  }

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
        : ["retail_team_general_worker"],
    departmentId: readString(profile.department_id) || null,
    departmentName: readString(department.name) || null,
    branchId: readString(profile.branch_id) || null,
    outletId: readString(profile.outlet_id) || null,
    outletName: readString(outlet.name) || null,
    stockLocationId: readString(profile.stock_location_id) || null,
    stockLocationName: readString(stockLocation.name) || null,
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
