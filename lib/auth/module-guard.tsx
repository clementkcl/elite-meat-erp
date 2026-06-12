import { ModuleAccessState } from "@/components/erp/module-access-state"
import { canAccessModule, type ModuleKey } from "@/lib/auth/access"
import {
  hasAnyRole,
  requireCurrentProfile,
  type UserRole,
} from "@/lib/auth/session"

export async function moduleAccessBlock(
  moduleKey: ModuleKey,
  moduleName: string,
  roles?: UserRole[]
) {
  const profile = await requireCurrentProfile()
  const roleAllowed = !roles || hasAnyRole(profile, roles)

  if (roleAllowed && canAccessModule(profile, moduleKey)) {
    return null
  }

  return <ModuleAccessState moduleName={moduleName} />
}
