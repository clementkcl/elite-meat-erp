import { moduleKeys } from "@/lib/auth/access"
import { userRoles, type UserRole } from "@/lib/auth/types"

export { moduleKeys, userRoles }
export type { UserRole }

export type SettingsOption = {
  id: string
  name: string
}

export type SettingsProfile = {
  id: string
  email: string
  fullName: string
  outletId: string | null
  departmentId: string | null
  stockLocationId: string | null
  roles: UserRole[]
}

export type OutletModuleAccessRow = {
  outletId: string
  moduleKey: string
  isEnabled: boolean
}

export type PaymentTypeSetting = {
  id: string
  code: string
  name: string
  isCash: boolean
  isActive: boolean
  sortOrder: number
}

export type SimpleSetting = {
  id: string
  code: string
  name: string
  isActive: boolean
  sortOrder: number
}

export type LeaveTypeSetting = SimpleSetting & {
  defaultDays: number
  requiresAttachment: boolean
}

export type CustomerCategorySetting = SimpleSetting & {
  creditTermDays: number
  isCredit: boolean
}

export type CustomerSetting = {
  id: string
  customerCode: string
  name: string
  phone: string
  address: string
  categoryId: string | null
  outletId: string | null
  creditTermDays: number
  latitude: number | null
  longitude: number | null
  isActive: boolean
}

export type CustomerPriceRuleSetting = {
  id: string
  categoryName: string
  customerName: string
  itemName: string
  brandName: string
  originName: string
  outletName: string
  unitPrice: number
  effectiveFrom: string
  isActive: boolean
}

export type BarcodeWeightRuleSetting = {
  id: string
  itemName: string
  brandName: string
  originName: string
  locationName: string
  barcodeWeightStart: number
  barcodeWeightLength: number
  barcodeWeightDecimals: number
}

export type SettingsPageData = {
  demoMode: boolean
  profiles: SettingsProfile[]
  roles: UserRole[]
  outlets: SettingsOption[]
  departments: SettingsOption[]
  stockLocations: SettingsOption[]
  outletModuleAccess: OutletModuleAccessRow[]
  paymentTypes: PaymentTypeSetting[]
  claimCategories: SimpleSetting[]
  leaveTypes: LeaveTypeSetting[]
  customerCategories: CustomerCategorySetting[]
  customers: CustomerSetting[]
  customerPriceRules: CustomerPriceRuleSetting[]
  barcodeWeightRules: BarcodeWeightRuleSetting[]
  items: SettingsOption[]
  brands: SettingsOption[]
  origins: SettingsOption[]
}
