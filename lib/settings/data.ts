import {
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { isSupabaseConfigured } from "@/lib/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { userRoles, type UserRole } from "@/lib/auth/types"
import type {
  BarcodeWeightRuleSetting,
  CustomerCategorySetting,
  CustomerPriceRuleSetting,
  CustomerSetting,
  LeaveTypeSetting,
  OutletModuleAccessRow,
  PaymentTypeSetting,
  SettingsOption,
  SettingsPageData,
  SettingsProfile,
  SimpleSetting,
} from "@/lib/settings/types"

async function loadRows(table: string) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { rows: null, error: null }
  }

  const { data, error } = await supabase.from(table).select("*").limit(1000)

  if (error) {
    return { rows: [], error: error.message }
  }

  return { rows: asRecordArray(data), error: null }
}

function optionRows(rows: Record<string, unknown>[]): SettingsOption[] {
  return rows.map((row) => ({
    id: readString(row.id),
    name: readString(row.name, readString(row.email, "-")),
  }))
}

function profileRows(
  profiles: Record<string, unknown>[],
  profileRoles: Record<string, unknown>[]
): SettingsProfile[] {
  return profiles.map((profile) => {
    const id = readString(profile.id)
    const roles = profileRoles
      .filter((row) => readString(row.profile_id) === id)
      .map((row) => readString(row.role_key))
      .filter((role): role is UserRole => userRoles.includes(role as UserRole))

    return {
      id,
      email: readString(profile.email),
      fullName: readString(profile.full_name, readString(profile.email, "User")),
      outletId: readNullableString(profile.outlet_id),
      departmentId: readNullableString(profile.department_id),
      stockLocationId: readNullableString(profile.stock_location_id),
      roles,
    }
  })
}

function simpleRows(rows: Record<string, unknown>[]): SimpleSetting[] {
  return rows.map((row) => ({
    id: readString(row.id),
    code: readString(row.code),
    name: readString(row.name),
    isActive: readBoolean(row.is_active, true),
    sortOrder: readNumber(row.sort_order, 100),
  }))
}

function paymentRows(rows: Record<string, unknown>[]): PaymentTypeSetting[] {
  return rows.map((row) => ({
    ...simpleRows([row])[0],
    isCash: readBoolean(row.is_cash),
  }))
}

function leaveRows(rows: Record<string, unknown>[]): LeaveTypeSetting[] {
  return rows.map((row) => ({
    ...simpleRows([row])[0],
    defaultDays: readNumber(row.default_days),
    requiresAttachment: readBoolean(row.requires_attachment),
  }))
}

function customerCategoryRows(
  rows: Record<string, unknown>[]
): CustomerCategorySetting[] {
  return rows.map((row) => ({
    ...simpleRows([row])[0],
    creditTermDays: readNumber(row.credit_term_days),
    isCredit: readBoolean(row.is_credit),
  }))
}

function customerRows(rows: Record<string, unknown>[]): CustomerSetting[] {
  return rows.map((row) => ({
    id: readString(row.id),
    customerCode: readString(row.customer_code),
    name: readString(row.name),
    phone: readString(row.phone),
    address: readString(row.address),
    categoryId: readNullableString(row.category_id),
    outletId: readNullableString(row.outlet_id),
    creditTermDays: readNumber(row.credit_term_days),
    latitude:
      row.latitude === null || row.latitude === undefined
        ? null
        : readNumber(row.latitude),
    longitude:
      row.longitude === null || row.longitude === undefined
        ? null
        : readNumber(row.longitude),
    isActive: readBoolean(row.is_active, true),
  }))
}

function findName(rows: Record<string, unknown>[], id: unknown) {
  return readString(
    rows.find((row) => readString(row.id) === readString(id))?.name,
    "-"
  )
}

function customerName(row: Record<string, unknown> | undefined) {
  if (!row) {
    return "-"
  }

  return `${readString(row.customer_code, "NO-CODE")} - ${readString(row.name)}`
}

function itemName(row: Record<string, unknown> | undefined) {
  if (!row) {
    return "-"
  }

  return `${readString(row.item_code)} - ${readString(row.section)} / ${readString(row.name)}`
}

function customerPriceRuleRows(
  rows: Record<string, unknown>[],
  categories: Record<string, unknown>[],
  customers: Record<string, unknown>[],
  items: Record<string, unknown>[],
  brands: Record<string, unknown>[],
  origins: Record<string, unknown>[],
  outlets: Record<string, unknown>[]
): CustomerPriceRuleSetting[] {
  return rows.map((row) => ({
    id: readString(row.id),
    categoryName: findName(categories, row.customer_category_id),
    customerName: customerName(
      customers.find(
        (customer) => readString(customer.id) === readString(row.customer_id)
      )
    ),
    itemName: itemName(items.find((item) => readString(item.id) === readString(row.item_id))),
    brandName: findName(brands, row.brand_id),
    originName: findName(origins, row.origin_id),
    outletName: findName(outlets, row.outlet_id),
    unitPrice: readNumber(row.unit_price),
    effectiveFrom: readString(row.effective_from),
    isActive: readBoolean(row.is_active, true),
  }))
}

function barcodeRuleRows(
  rows: Record<string, unknown>[],
  items: Record<string, unknown>[],
  brands: Record<string, unknown>[],
  origins: Record<string, unknown>[],
  locations: Record<string, unknown>[]
): BarcodeWeightRuleSetting[] {
  return rows.map((row) => ({
    id: readString(row.id),
    itemName: itemName(items.find((item) => readString(item.id) === readString(row.item_id))),
    brandName: findName(brands, row.brand_id),
    originName: findName(origins, row.origin_id),
    locationName: findName(locations, row.location_id),
    barcodeWeightStart: readNumber(row.barcode_weight_start),
    barcodeWeightLength: readNumber(row.barcode_weight_length),
    barcodeWeightDecimals: readNumber(row.barcode_weight_decimals),
  }))
}

function demoData(): SettingsPageData {
  return {
    demoMode: true,
    profiles: [],
    roles: [...userRoles],
    outlets: [{ id: "demo-outlet", name: "Demo Outlet" }],
    departments: [{ id: "demo-dept", name: "Retail" }],
    stockLocations: [{ id: "demo-location", name: "Demo Location" }],
    outletModuleAccess: [],
    paymentTypes: [],
    claimCategories: [],
    leaveTypes: [],
    customerCategories: [],
    customers: [],
    customerPriceRules: [],
    barcodeWeightRules: [],
    items: [],
    brands: [],
    origins: [],
  }
}

export async function getSettingsPageData(): Promise<SettingsPageData> {
  const results = await Promise.all([
    loadRows("profiles"),
    loadRows("profile_roles"),
    loadRows("outlets"),
    loadRows("departments"),
    loadRows("stock_locations"),
    loadRows("outlet_module_access"),
    loadRows("retail_payment_types"),
    loadRows("erp_claim_categories"),
    loadRows("erp_leave_types"),
    loadRows("customer_categories"),
    loadRows("customers"),
    loadRows("customer_price_rules"),
    loadRows("barcode_weight_rules"),
    loadRows("items"),
    loadRows("brands"),
    loadRows("origins"),
  ])

  if (!isSupabaseConfigured() && results.some((result) => result.rows === null)) {
    return demoData()
  }

  const errors = results
    .map((result) => result.error)
    .filter((error): error is string => Boolean(error))

  if (errors.length > 0) {
    throw new Error(`Settings data could not load: ${errors.join("; ")}`)
  }

  const [
    profiles,
    profileRoles,
    outlets,
    departments,
    stockLocations,
    outletModuleAccess,
    paymentTypes,
    claimCategories,
    leaveTypes,
    customerCategories,
    customers,
    customerPriceRules,
    barcodeWeightRules,
    items,
    brands,
    origins,
  ] = results.map((result) => result.rows ?? [])
  const outletModuleAccessRows: OutletModuleAccessRow[] = outletModuleAccess.map(
    (row) => ({
      outletId: readString(row.outlet_id),
      moduleKey: readString(row.module_key),
      isEnabled: readBoolean(row.is_enabled),
    })
  )

  return {
    demoMode: false,
    profiles: profileRows(profiles, profileRoles),
    roles: [...userRoles],
    outlets: optionRows(outlets),
    departments: optionRows(departments),
    stockLocations: optionRows(stockLocations),
    outletModuleAccess: outletModuleAccessRows,
    paymentTypes: paymentRows(paymentTypes),
    claimCategories: simpleRows(claimCategories),
    leaveTypes: leaveRows(leaveTypes),
    customerCategories: customerCategoryRows(customerCategories),
    customers: customerRows(customers),
    customerPriceRules: customerPriceRuleRows(
      customerPriceRules,
      customerCategories,
      customers,
      items,
      brands,
      origins,
      outlets
    ),
    barcodeWeightRules: barcodeRuleRows(
      barcodeWeightRules,
      items,
      brands,
      origins,
      stockLocations
    ),
    items: items
      .filter((row) => readBoolean(row.is_active, true))
      .map((row) => ({
        id: readString(row.id),
        name: itemName(row),
      })),
    brands: optionRows(brands.filter((row) => readBoolean(row.is_active, true))),
    origins: optionRows(origins.filter((row) => readBoolean(row.is_active, true))),
  }
}
