import type { ModuleKey } from "@/lib/auth/access"

export const userRoles = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
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
  departmentId: string | null
  departmentName: string | null
  branchId: string | null
  outletId: string | null
  outletName: string | null
  stockLocationId: string | null
  stockLocationName: string | null
  moduleAccess: ModuleKey[]
  demoMode: boolean
}
