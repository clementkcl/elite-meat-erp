"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { moduleKeys, type ModuleKey } from "@/lib/auth/access"
import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
} from "@/lib/auth/session"
import { userRoles, type UserRole } from "@/lib/auth/types"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { SupabaseServerClient } from "@/lib/supabase/server"

type SettingsActionState = {
  status: "idle" | "success" | "error"
  message: string
}

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const userAccessSchema = z.object({
  profileId: z.string().trim().min(1),
  outletId: optionalUuid,
  departmentId: optionalUuid,
  stockLocationId: optionalUuid,
})

const outletModuleSchema = z.object({
  outletId: z.string().trim().min(1),
})

const simpleSettingSchema = z.object({
  code: z.string().trim().min(2),
  name: z.string().trim().min(2),
  sortOrder: z.coerce.number().int().min(0).default(100),
  isActive: z.coerce.boolean().default(true),
})

const paymentTypeSchema = simpleSettingSchema.extend({
  isCash: z.coerce.boolean().default(false),
})

const leaveTypeSchema = simpleSettingSchema.extend({
  defaultDays: z.coerce.number().min(0).default(0),
  requiresAttachment: z.coerce.boolean().default(false),
})

const customerCategorySchema = simpleSettingSchema.extend({
  creditTermDays: z.coerce.number().int().min(0).default(0),
  isCredit: z.coerce.boolean().default(false),
})

const customerSchema = z.object({
  customerCode: z.string().trim().optional(),
  name: z.string().trim().min(2),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  categoryId: optionalUuid,
  outletId: optionalUuid,
  creditTermDays: z.coerce.number().int().min(0).default(0),
  latitude: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? Number(value) : null)),
  longitude: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? Number(value) : null)),
  isActive: z.coerce.boolean().default(true),
})

const customerPriceRuleSchema = z
  .object({
    customerCategoryId: optionalUuid,
    customerId: optionalUuid,
    itemId: z.string().trim().min(1),
    brandId: optionalUuid,
    originId: optionalUuid,
    outletId: optionalUuid,
    unitPrice: z.coerce.number().min(0),
    effectiveFrom: z.string().trim().min(1),
    isActive: z.coerce.boolean().default(true),
  })
  .refine(
    (value) => value.customerCategoryId || value.customerId,
    "Choose a customer category or a specific customer."
  )

const barcodeWeightRuleSchema = z.object({
  itemId: z.string().trim().min(1),
  brandId: optionalUuid,
  originId: optionalUuid,
  locationId: z.string().trim().min(1),
  barcodeWeightStart: z.coerce.number().int().min(1).max(100),
  barcodeWeightLength: z.coerce.number().int().min(1).max(12),
  barcodeWeightDecimals: z.coerce.number().int().min(0).max(4),
})

type SettingsContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

function success(message: string): SettingsActionState {
  return { status: "success", message }
}

function failure(message: string): SettingsActionState {
  return { status: "error", message }
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

async function getAdminContext() {
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: "Sign in before changing settings." }
  }

  if (!hasAnyRole(profile, ["admin"])) {
    return { error: "Only admin can change ERP settings." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { profile, demoMode: true }
  }

  return { profile, supabase, demoMode: false }
}

async function insertAuditLog(
  context: SettingsContext,
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, unknown>
) {
  await context.supabase.from("audit_logs").insert({
    actor_id: context.profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
  })
}

async function runSettingsAction(
  callback: (context: SettingsContext) => Promise<string>
) {
  const context = await getAdminContext()

  if ("error" in context) {
    return failure(context.error ?? "Action unavailable.")
  }

  if (context.demoMode || !context.supabase) {
    return success("Demo mode: connect Supabase to save this setting.")
  }

  try {
    const message = await callback({
      profile: context.profile,
      supabase: context.supabase,
    })
    revalidatePath("/settings")
    return success(message)
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Settings action failed.")
  }
}

function selectedRoles(formData: FormData): UserRole[] {
  return formData
    .getAll("roles")
    .map((role) => String(role))
    .filter((role): role is UserRole => userRoles.includes(role as UserRole))
}

function selectedModules(formData: FormData): ModuleKey[] {
  return formData
    .getAll("modules")
    .map((moduleKey) => String(moduleKey))
    .filter((moduleKey): moduleKey is ModuleKey =>
      moduleKeys.includes(moduleKey as ModuleKey)
    )
}

function selectedOutletModules(formData: FormData): ModuleKey[] {
  return formData
    .getAll("outletModules")
    .map((moduleKey) => String(moduleKey))
    .filter((moduleKey): moduleKey is ModuleKey =>
      moduleKeys.includes(moduleKey as ModuleKey)
    )
}

export async function updateUserAccessAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = userAccessSchema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check user access fields.")
  }

  const roles = selectedRoles(formData)
  const outletModules = selectedOutletModules(formData)

  if (roles.length === 0) {
    return failure("Select at least one role.")
  }

  return runSettingsAction(async (context) => {
    const { error: profileError } = await context.supabase
      .from("profiles")
      .update({
        outlet_id: parsed.data.outletId,
        department_id: parsed.data.departmentId,
        stock_location_id: parsed.data.stockLocationId,
      })
      .eq("id", parsed.data.profileId)

    if (profileError) {
      throw new Error(profileError.message)
    }

    const { error: deleteError } = await context.supabase
      .from("profile_roles")
      .delete()
      .eq("profile_id", parsed.data.profileId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    const { error: roleError } = await context.supabase
      .from("profile_roles")
      .insert(
        roles.map((role) => ({
          profile_id: parsed.data.profileId,
          role_key: role,
          assigned_by: context.profile.id,
        }))
      )

    if (roleError) {
      throw new Error(roleError.message)
    }

    if (parsed.data.outletId) {
      const moduleRows = moduleKeys.map((moduleKey) => ({
        outlet_id: parsed.data.outletId,
        module_key: moduleKey,
        is_enabled: outletModules.includes(moduleKey),
      }))
      const { error: moduleError } = await context.supabase
        .from("outlet_module_access")
        .upsert(moduleRows, { onConflict: "outlet_id,module_key" })

      if (moduleError) {
        throw new Error(moduleError.message)
      }
    }

    await insertAuditLog(context, "USER_ACCESS_UPDATED", "profiles", parsed.data.profileId, {
      ...parsed.data,
      roles,
      outletModules: parsed.data.outletId ? outletModules : [],
    })

    return "User access updated."
  })
}

export async function updateOutletModuleAccessAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = outletModuleSchema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Choose an outlet.")
  }

  const modules = selectedModules(formData)

  return runSettingsAction(async (context) => {
    const rows = moduleKeys.map((moduleKey) => ({
      outlet_id: parsed.data.outletId,
      module_key: moduleKey,
      is_enabled: modules.includes(moduleKey),
    }))
    const { error } = await context.supabase
      .from("outlet_module_access")
      .upsert(rows, { onConflict: "outlet_id,module_key" })

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(context, "OUTLET_MODULE_ACCESS_UPDATED", "outlet_module_access", parsed.data.outletId, {
      modules,
    })

    return "Outlet module access updated."
  })
}

async function upsertByCode(
  context: SettingsContext,
  table: string,
  values: Record<string, unknown>,
  auditAction: string
) {
  const { data, error } = await context.supabase
    .from(table)
    .upsert(values, { onConflict: "code" })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const entityId =
    data && typeof data === "object" && "id" in data ? String(data.id) : null
  await insertAuditLog(context, auditAction, table, entityId, values)
}

export async function savePaymentTypeAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = paymentTypeSchema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check payment type fields.")
  }

  return runSettingsAction(async (context) => {
    await upsertByCode(
      context,
      "retail_payment_types",
      {
        code: normalizeCode(parsed.data.code),
        name: parsed.data.name,
        is_cash: parsed.data.isCash,
        is_active: parsed.data.isActive,
        sort_order: parsed.data.sortOrder,
        created_by: context.profile.id,
      },
      "PAYMENT_TYPE_SAVED"
    )

    return "Payment type saved."
  })
}

export async function saveClaimCategoryAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = simpleSettingSchema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check claim category fields.")
  }

  return runSettingsAction(async (context) => {
    await upsertByCode(context, "erp_claim_categories", {
      code: normalizeCode(parsed.data.code),
      name: parsed.data.name,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
      created_by: context.profile.id,
    }, "CLAIM_CATEGORY_SAVED")

    return "Claim category saved."
  })
}

export async function saveLeaveTypeAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = leaveTypeSchema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check leave type fields.")
  }

  return runSettingsAction(async (context) => {
    await upsertByCode(context, "erp_leave_types", {
      code: normalizeCode(parsed.data.code),
      name: parsed.data.name,
      default_days: parsed.data.defaultDays,
      requires_attachment: parsed.data.requiresAttachment,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
      created_by: context.profile.id,
    }, "LEAVE_TYPE_SAVED")

    return "Leave type saved."
  })
}

export async function saveCustomerCategoryAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = customerCategorySchema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check customer category fields.")
  }

  return runSettingsAction(async (context) => {
    await upsertByCode(context, "customer_categories", {
      code: normalizeCode(parsed.data.code),
      name: parsed.data.name,
      credit_term_days: parsed.data.creditTermDays,
      is_credit: parsed.data.isCredit,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
      created_by: context.profile.id,
    }, "CUSTOMER_CATEGORY_SAVED")

    return "Customer category saved."
  })
}

export async function saveCustomerAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = customerSchema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check customer fields.")
  }

  return runSettingsAction(async (context) => {
    const { data, error } = await context.supabase
      .from("customers")
      .insert({
        customer_code: parsed.data.customerCode
          ? normalizeCode(parsed.data.customerCode)
          : null,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        category_id: parsed.data.categoryId,
        outlet_id: parsed.data.outletId,
        credit_term_days: parsed.data.creditTermDays,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        is_active: parsed.data.isActive,
        created_by: context.profile.id,
        updated_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const entityId =
      data && typeof data === "object" && "id" in data ? String(data.id) : null
    await insertAuditLog(context, "CUSTOMER_CREATED", "customers", entityId, parsed.data)

    return "Customer saved."
  })
}

export async function saveCustomerPriceRuleAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = customerPriceRuleSchema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check customer price fields.")
  }

  return runSettingsAction(async (context) => {
    let lookup = context.supabase
      .from("customer_price_rules")
      .select("id")
      .eq("item_id", parsed.data.itemId)
      .eq("effective_from", parsed.data.effectiveFrom)

    lookup = parsed.data.customerCategoryId
      ? lookup.eq("customer_category_id", parsed.data.customerCategoryId)
      : lookup.is("customer_category_id", null)
    lookup = parsed.data.customerId
      ? lookup.eq("customer_id", parsed.data.customerId)
      : lookup.is("customer_id", null)
    lookup = parsed.data.brandId
      ? lookup.eq("brand_id", parsed.data.brandId)
      : lookup.is("brand_id", null)
    lookup = parsed.data.originId
      ? lookup.eq("origin_id", parsed.data.originId)
      : lookup.is("origin_id", null)
    lookup = parsed.data.outletId
      ? lookup.eq("outlet_id", parsed.data.outletId)
      : lookup.is("outlet_id", null)

    const { data: existing, error: lookupError } = await lookup.maybeSingle()

    if (lookupError) {
      throw new Error(lookupError.message)
    }

    const values = {
      customer_category_id: parsed.data.customerCategoryId,
      customer_id: parsed.data.customerId,
      item_id: parsed.data.itemId,
      brand_id: parsed.data.brandId,
      origin_id: parsed.data.originId,
      outlet_id: parsed.data.outletId,
      unit_price: parsed.data.unitPrice,
      effective_from: parsed.data.effectiveFrom,
      is_active: parsed.data.isActive,
      created_by: context.profile.id,
    }

    if (existing?.id) {
      const { error } = await context.supabase
        .from("customer_price_rules")
        .update(values)
        .eq("id", existing.id)

      if (error) {
        throw new Error(error.message)
      }
    } else {
      const { error } = await context.supabase
        .from("customer_price_rules")
        .insert(values)

      if (error) {
        throw new Error(error.message)
      }
    }

    await insertAuditLog(context, "CUSTOMER_PRICE_RULE_SAVED", "customer_price_rules", null, parsed.data)

    return "Customer price rule saved."
  })
}

export async function saveBarcodeWeightRuleAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const parsed = barcodeWeightRuleSchema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check barcode rule fields.")
  }

  return runSettingsAction(async (context) => {
    const { error } = await context.supabase
      .from("barcode_weight_rules")
      .upsert(
        {
          item_id: parsed.data.itemId,
          brand_id: parsed.data.brandId,
          origin_id: parsed.data.originId,
          location_id: parsed.data.locationId,
          barcode_weight_start: parsed.data.barcodeWeightStart,
          barcode_weight_length: parsed.data.barcodeWeightLength,
          barcode_weight_decimals: parsed.data.barcodeWeightDecimals,
          created_by: context.profile.id,
          updated_by: context.profile.id,
        },
        { onConflict: "item_id,brand_id,origin_id,location_id" }
      )

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(context, "BARCODE_WEIGHT_RULE_SAVED", "barcode_weight_rules", null, parsed.data)

    return "Barcode weight rule saved."
  })
}
