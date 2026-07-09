export const moduleKeys = [
  "stock",
  "orders",
  "whatsapp_crm",
  "retail",
  "processing",
  "delivery",
  "attendance",
  "cleaning",
  "oa_actions",
  "accounting_finance",
  "director_reports",
] as const

export type ModuleKey = (typeof moduleKeys)[number]

type ModuleAccessProfile = {
  roles: string[]
  outletId: string | null
  moduleAccess: ModuleKey[]
}

export function isModuleKey(value: string): value is ModuleKey {
  return moduleKeys.includes(value as ModuleKey)
}

export function canAccessModule(
  profile: ModuleAccessProfile,
  moduleKey: ModuleKey | undefined
) {
  if (!moduleKey) {
    return true
  }

  if (
    profile.roles.includes("owner") ||
    profile.roles.includes("admin") ||
    profile.roles.includes("director")
  ) {
    return true
  }

  return profile.moduleAccess.includes(moduleKey)
}
