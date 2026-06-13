"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
  type UserRole,
} from "@/lib/auth/session"
import { canAccessModule } from "@/lib/auth/access"
import { asRecord, readNumber, readString } from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import type { StockActionState } from "@/lib/stock/action-state"
import {
  assertDamageCanBeManagerReviewed,
  assertReturnSupplierCanBeRejected,
  damageRejectionSignatureLabel,
} from "@/lib/stock/approval-rules"
import {
  assertCustomerOrderReadyForOutbound,
  duplicateOutboundBarcode,
  parseOutboundBarcodes,
} from "@/lib/stock/outbound-rules"
import { normalizeItemCode } from "@/lib/stock/item-code"
import {
  requireSignature,
  requireStockTakeScopeMatch,
  sameNullableId,
} from "@/lib/stock/stock-take-rules"
import {
  activeStockStatus,
  movementTypeForOutboundType,
} from "@/lib/stock/unit-status-rules"
import {
  stockInboundSources,
  stockDamageReasons,
  stockCategories,
  type StockMovementType,
} from "@/lib/stock/types"

const stockOperatorRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
]
const stockItemEditorRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
  "director",
]

const stockManagerRoles: UserRole[] = [
  "retail_manager",
  "delivery_manager",
  "processing_manager",
  "admin",
]
const stockDirectorApprovalRoles: UserRole[] = ["director", "admin"]

const optionalUuid = z
  .string()
  .trim()
  .transform((value) =>
    value.length > 0 && value !== "__other" ? value : null
  )

const itemSchema = z.object({
  itemCode: z.string().trim().regex(/^\d+$/, "Item code must be numeric only."),
  category: z.enum(stockCategories),
  defaultBrandId: optionalUuid,
  section: z.string().trim().default("GENERAL"),
  name: z.string().trim().min(2),
  chineseName: z.string().trim().optional(),
  ibanName: z.string().trim().optional(),
  barcodeRequired: z.coerce.boolean().default(true),
  defaultLowStockLevel: z.coerce.number().min(0).default(0),
})

const updateItemSchema = itemSchema.extend({
  itemId: z.string().trim().min(1),
  isActive: z.coerce.boolean().default(false),
})

const namedSchema = z.object({
  name: z.string().trim().min(2),
})

const barcodeInboundSchema = z.object({
  barcode: z.string().trim().min(3),
  itemId: z.string().trim().min(1),
  brandId: optionalUuid,
  brandName: z.string().trim().optional(),
  originId: optionalUuid,
  originName: z.string().trim().optional(),
  locationId: z.string().trim().min(1),
  netWeightKg: z.coerce.number().positive(),
  inboundSource: z.enum(stockInboundSources).default("supplier_import"),
  barcodeWeightStart: z.coerce.number().int().min(1).max(100).default(7),
  barcodeWeightLength: z.coerce.number().int().min(1).max(12).default(5),
  barcodeWeightDecimals: z.coerce.number().int().min(0).max(4).default(2),
  saveWeightRule: z.coerce.boolean().default(false),
  batchNo: z.string().trim().optional(),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const undoInboundScanSchema = z.object({
  stockUnitId: z.string().trim().min(1),
  batchNo: z.string().trim().min(1),
  reason: z.string().trim().default("Current inbound session undo"),
})

const orderOutboundTypes = ["SALES", "TRANSFER", "PROCESSING"] as const

const orderOutboundSchema = z.object({
  orderId: z.string().trim().min(1),
  outboundType: z.enum(orderOutboundTypes),
  toLocationId: optionalUuid,
  barcodesJson: z.string().trim().min(2),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const directOutboundSchema = z.object({
  outboundType: z.enum(orderOutboundTypes),
  toLocationId: optionalUuid,
  barcodesJson: z.string().trim().min(2),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const transferSchema = z.object({
  barcode: z.string().trim().min(3),
  toLocationId: z.string().trim().min(1),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const receiveTransferSchema = z.object({
  barcode: z.string().trim().min(3),
  receiveLocationId: z.string().trim().min(1),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const returnSchema = z.object({
  barcode: z.string().trim().min(3),
  locationId: z.string().trim().min(1),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const releaseInspectionSchema = z.object({
  barcode: z.string().trim().min(3),
  notes: z.string().trim().optional(),
})

const createStockTakeSessionSchema = z.object({
  locationId: z.string().trim().min(1),
  itemId: z.string().trim().min(1),
  brandId: optionalUuid,
})

const stockTakeSessionIdSchema = z.object({
  sessionId: z.string().trim().min(1),
  managerSignature: z.string().trim().optional(),
  directorSignature: z.string().trim().optional(),
})

const stockTakeBarcodeSchema = z.object({
  sessionId: z.string().trim().min(1),
  barcode: z.string().trim().min(3),
})

const damageRequestSchema = z.object({
  barcode: z.string().trim().min(3),
  reason: z.enum(stockDamageReasons),
  photoPath: z.string().trim().min(1, "Damage photo is required."),
  notes: z.string().trim().optional(),
})

const damageRequestIdSchema = z.object({
  requestId: z.string().trim().min(1),
  managerSignature: z.string().trim().optional(),
  directorSignature: z.string().trim().optional(),
})

const returnSupplierRequestSchema = z.object({
  barcode: z.string().trim().min(3),
  supplierName: z.string().trim().min(1, "Supplier name is required."),
  notes: z.string().trim().optional(),
})

const returnSupplierRequestIdSchema = z.object({
  requestId: z.string().trim().min(1),
  managerSignature: z.string().trim().optional(),
})

type StockActionContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function success(
  message: string,
  extra: Partial<Omit<StockActionState, "status" | "message">> = {}
): StockActionState {
  return { status: "success", message, ...extra }
}

function failure(message: string): StockActionState {
  return { status: "error", message }
}

function canUseAllStockLocations(profile: CurrentProfile) {
  return hasAnyRole(profile, ["admin", "director"])
}

function normalizeOptionalName(value: string | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized.toUpperCase() : null
}

function assertStockLocationAccess(
  profile: CurrentProfile,
  locationId: string | null | undefined,
  action: string
) {
  if (canUseAllStockLocations(profile)) {
    return
  }

  if (!profile.stockLocationId) {
    throw new Error(
      "Your profile is missing a stock location. Ask admin to assign one before using stock workflows."
    )
  }

  if (locationId !== profile.stockLocationId) {
    throw new Error(`Your role cannot ${action} stock for another location.`)
  }
}

async function assertActiveStockLocation(
  supabase: SupabaseServerClient,
  locationId: string,
  label: string
) {
  const { data, error } = await supabase
    .from("stock_locations")
    .select("id,is_active")
    .eq("id", locationId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const location = asRecord(data)

  if (!location.id || location.is_active === false) {
    throw new Error(`${label} was not found or is inactive.`)
  }
}

async function getActionContext(roles: UserRole[]) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: "Sign in before changing stock records." }
  }

  if (!hasAnyRole(profile, roles)) {
    return { error: "Your role does not allow this stock action." }
  }

  if (!canAccessModule(profile, "stock")) {
    return { error: "Your outlet does not have stock access." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { profile, demoMode: true }
  }

  return { profile, supabase, demoMode: false }
}

async function insertAuditLog(
  supabase: SupabaseServerClient,
  profile: CurrentProfile,
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, unknown>
) {
  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
  })
}

async function resolveNamedRecordId(
  supabase: SupabaseServerClient,
  table: "brands" | "origins",
  selectedId: string | null,
  customName: string | undefined,
  label: string
) {
  if (selectedId) {
    return selectedId
  }

  const name = normalizeOptionalName(customName)

  if (!name) {
    return null
  }

  const { data: existing, error: existingError } = await supabase
    .from(table)
    .select("id")
    .eq("name", name)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  const existingId = readString(asRecord(existing).id)

  if (existingId) {
    return existingId
  }

  const { data, error } = await supabase
    .from(table)
    .insert({ name })
    .select("id")
    .single()

  if (error) {
    throw new Error(`Could not create ${label}: ${error.message}`)
  }

  return readString(asRecord(data).id)
}

async function assertActiveItem(
  supabase: SupabaseServerClient,
  itemId: string
) {
  const { data, error } = await supabase
    .from("items")
    .select("id,is_active")
    .eq("id", itemId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const item = asRecord(data)

  if (!item.id) {
    throw new Error("Product was not found.")
  }

  if (item.is_active === false) {
    throw new Error("Inactive products cannot receive new inbound stock.")
  }
}

async function logBarcodeScan(
  supabase: SupabaseServerClient,
  input: {
    barcode: string
    action: StockMovementType
    success: boolean
    message: string
    scannedBy: string
  }
) {
  await supabase.from("barcode_scan_logs").insert({
    barcode: input.barcode,
    action: input.action,
    success: input.success,
    message: input.message,
    scanned_by: input.scannedBy,
  })
}

async function assertUniqueItemCode(
  supabase: SupabaseServerClient,
  itemCode: string,
  exceptItemId?: string
) {
  const { data, error } = await supabase
    .from("items")
    .select("id")
    .eq("item_code", itemCode)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const existingId = readString(asRecord(data).id)

  if (existingId && existingId !== exceptItemId) {
    throw new Error(`Item code ${itemCode} is already used.`)
  }
}

async function getUnitByBarcode(
  supabase: SupabaseServerClient,
  barcode: string
) {
  const { data, error } = await supabase
    .from("stock_units")
    .select("*")
    .eq("barcode", barcode)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return asRecord(data)
}

async function requireStockTakeLineCount(
  supabase: SupabaseServerClient,
  sessionId: string
) {
  const { count, error } = await supabase
    .from("stock_take_lines")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)

  if (error) {
    throw new Error(error.message)
  }

  if (!count) {
    throw new Error(
      "Scan at least one barcode before submitting stock take for review."
    )
  }

  return count
}

async function getCustomerOrder(
  supabase: SupabaseServerClient,
  orderId: string
) {
  const { data, error } = await supabase
    .from("customer_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const order = asRecord(data)

  if (!order.id) {
    throw new Error("Customer order was not found or is outside your scope.")
  }

  const status = readString(order.status)

  if (["DELIVERED", "FAILED", "CANCELLED"].includes(status)) {
    throw new Error(`Customer order is ${status} and cannot receive outbound scans.`)
  }

  return order
}

async function getStockTakeSession(
  supabase: SupabaseServerClient,
  sessionId: string
) {
  const { data, error } = await supabase
    .from("stock_take_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return asRecord(data)
}

function unitStatus(unit: Record<string, unknown>) {
  return String(unit.status ?? "")
}

function stockTakeStatus(session: Record<string, unknown>) {
  return String(session.status ?? "")
}

async function rejectBarcodeScan(
  context: StockActionContext,
  input: {
    barcode: string
    action: StockMovementType
    message: string
  }
): Promise<never> {
  await logBarcodeScan(context.supabase, {
    barcode: input.barcode,
    action: input.action,
    success: false,
    message: input.message,
    scannedBy: context.profile.id,
  })

  throw new Error(input.message)
}

async function requireBarcodeUnit(
  context: StockActionContext,
  barcode: string,
  action: StockMovementType
) {
  const unit = await getUnitByBarcode(context.supabase, barcode)

  if (!unit.id) {
    await rejectBarcodeScan(context, {
      barcode,
      action,
      message: "Barcode was not found.",
    })
  }

  return unit
}

async function requireActiveBarcodeUnit(
  context: StockActionContext,
  barcode: string,
  action: StockMovementType
) {
  const unit = await requireBarcodeUnit(context, barcode, action)
  const status = unitStatus(unit)

  if (!activeStockStatus(status)) {
    await rejectBarcodeScan(context, {
      barcode,
      action,
      message: `Barcode is ${status || "not active"} and cannot be used for this action.`,
    })
  }

  return unit
}

async function requireStockTakeSessionStatus(
  supabase: SupabaseServerClient,
  sessionId: string,
  allowedStatuses: string[]
) {
  const session = await getStockTakeSession(supabase, sessionId)

  if (!session.id) {
    throw new Error("Stock take session was not found.")
  }

  const status = stockTakeStatus(session)

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Stock take session is ${status || "not available"} and cannot be changed here.`
    )
  }

  return session
}

async function assertStockNotLockedByTake(
  context: StockActionContext,
  input: {
    itemId: string
    brandId: string | null
    locationId: string
    action: string
  }
) {
  const { data, error } = await context.supabase
    .from("stock_take_sessions")
    .select("session_no,item_id,brand_id,status")
    .eq("location_id", input.locationId)
    .in("status", ["DRAFT", "SUBMITTED", "REVIEWED"])
    .limit(100)

  if (error) {
    throw new Error(error.message)
  }

  const lockedSession = Array.isArray(data)
    ? data
        .map(asRecord)
        .find(
          (session) =>
            String(session.item_id ?? "") === input.itemId &&
            sameNullableId(session.brand_id, input.brandId)
        )
    : null

  if (lockedSession) {
    throw new Error(
      `Cannot ${input.action}. Stock take ${readString(
        lockedSession.session_no,
        "session"
      )} is open for this item and brand at this location.`
    )
  }
}

function revalidateStockPaths() {
  [
    "/stock/dashboard",
    "/stock/items",
    "/stock/inbound",
    "/stock/outbound",
    "/stock/balance",
    "/stock/movements",
    "/stock/return",
    "/stock/stock-take",
    "/stock/reports",
    "/stock/settings",
    "/orders",
    "/orders/prepare",
  ].forEach((path) => revalidatePath(path))
}

function parseAction<T>(
  schema: z.ZodType<T>,
  formData: FormData
): T | StockActionState {
  const parsed = schema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the form fields.")
  }

  return parsed.data
}

async function runStockAction(
  formData: FormData,
  roles: UserRole[],
  callback: (
    context: StockActionContext,
    formData: FormData
  ) => Promise<string | StockActionState>
) {
  const context = await getActionContext(roles)

  if ("error" in context) {
    return failure(context.error ?? "Action unavailable.")
  }

  if (context.demoMode || !context.supabase) {
    return success("Demo mode: connect Supabase to save this action.")
  }

  try {
    const result = await callback(
      { profile: context.profile, supabase: context.supabase },
      formData
    )
    revalidateStockPaths()
    return typeof result === "string" ? success(result) : result
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Action failed.")
  }
}

export async function createItemAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(itemSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockItemEditorRoles, async (context) => {
    const itemCode = normalizeItemCode(parsed.itemCode)
    await assertUniqueItemCode(context.supabase, itemCode)

    const { data, error } = await context.supabase
      .from("items")
      .insert({
        item_code: itemCode,
        category: parsed.category,
        default_brand_id: parsed.defaultBrandId,
        section: parsed.section || "GENERAL",
        name: parsed.name,
        chinese_name: normalizeOptionalName(parsed.chineseName),
        iban_name: normalizeOptionalName(parsed.ibanName),
        barcode_required: parsed.barcodeRequired,
        default_low_stock_level: parsed.defaultLowStockLevel,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const itemId = String(asRecord(data).id ?? "")
    await insertAuditLog(
      context.supabase,
      context.profile,
        "ITEM_CREATED",
        "items",
        itemId,
        { ...parsed, itemCode }
      )

    return success("Item created.", { itemId })
  })
}

export async function updateItemAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(updateItemSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockItemEditorRoles, async (context) => {
    const itemCode = normalizeItemCode(parsed.itemCode)
    await assertUniqueItemCode(context.supabase, itemCode, parsed.itemId)

    const { error } = await context.supabase
      .from("items")
      .update({
        item_code: itemCode,
        category: parsed.category,
        default_brand_id: parsed.defaultBrandId,
        section: parsed.section || "GENERAL",
        name: parsed.name,
        chinese_name: normalizeOptionalName(parsed.chineseName),
        iban_name: normalizeOptionalName(parsed.ibanName),
        barcode_required: parsed.barcodeRequired,
        is_active: parsed.isActive,
        default_low_stock_level: parsed.defaultLowStockLevel,
      })
      .eq("id", parsed.itemId)
      .select("id")
      .single()

    if (error) {
      throw new Error(
        error.code === "PGRST116"
          ? "Item was not found or your role cannot update it."
          : error.message
      )
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "ITEM_UPDATED",
      "items",
      parsed.itemId,
      { ...parsed, itemCode }
    )

    return "Item updated."
  })
}

export async function createBrandAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(namedSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, ["admin", "director"], async (context) => {
    const { data, error } = await context.supabase
      .from("brands")
      .insert({ name: parsed.name })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "BRAND_CREATED",
      "brands",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Brand created."
  })
}

export async function createOriginAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(namedSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, ["admin", "director"], async (context) => {
    const { data, error } = await context.supabase
      .from("origins")
      .insert({ name: parsed.name })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "ORIGIN_CREATED",
      "origins",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Origin created."
  })
}

export async function createLocationAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(namedSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, ["admin", "director"], async (context) => {
    const { data, error } = await context.supabase
      .from("stock_locations")
      .insert({ name: parsed.name })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "LOCATION_CREATED",
      "stock_locations",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Stock location created."
  })
}

export async function barcodeInboundAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(barcodeInboundSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    assertStockLocationAccess(context.profile, parsed.locationId, "inbound")
    await assertActiveItem(context.supabase, parsed.itemId)

    const brandId = await resolveNamedRecordId(
      context.supabase,
      "brands",
      parsed.brandId,
      parsed.brandName,
      "brand"
    )
    const originId = await resolveNamedRecordId(
      context.supabase,
      "origins",
      parsed.originId,
      parsed.originName,
      "origin"
    )

    if (!brandId) {
      throw new Error("Choose a brand before receiving inbound stock.")
    }

    if (!originId) {
      throw new Error("Choose an origin before receiving inbound stock.")
    }

    await assertStockNotLockedByTake(context, {
      itemId: parsed.itemId,
      brandId,
      locationId: parsed.locationId,
      action: "receive inbound stock",
    })

    const existingUnit = await getUnitByBarcode(context.supabase, parsed.barcode)

    if (existingUnit.id) {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "INBOUND",
        message: "Barcode already exists in stock.",
      })
    }

    const { data, error } = await context.supabase.rpc("inbound_stock_unit", {
      p_barcode: parsed.barcode,
      p_item_id: parsed.itemId,
      p_brand_id: brandId,
      p_origin_id: originId,
      p_location_id: parsed.locationId,
      p_net_weight_kg: parsed.netWeightKg,
      p_inbound_source: parsed.inboundSource,
      p_batch_no: parsed.batchNo ?? null,
      p_reference_no: parsed.referenceNo ?? null,
      p_notes: parsed.notes ?? null,
      p_save_weight_rule: parsed.saveWeightRule,
      p_barcode_weight_start: parsed.barcodeWeightStart,
      p_barcode_weight_length: parsed.barcodeWeightLength,
      p_barcode_weight_decimals: parsed.barcodeWeightDecimals,
    })

    if (error) {
      await logBarcodeScan(context.supabase, {
        barcode: parsed.barcode,
        action: "INBOUND",
        success: false,
        message: error.message,
        scannedBy: context.profile.id,
      })
      throw new Error(error.message)
    }

    return success("Barcode inbound saved.", {
      stockUnitId: readString(data),
    })
  })
}

export async function undoInboundScanAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(undoInboundScanSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const { data, error } = await context.supabase.rpc(
      "void_inbound_stock_unit",
      {
        p_stock_unit_id: parsed.stockUnitId,
        p_batch_no: parsed.batchNo,
        p_reason: parsed.reason,
      }
    )

    if (error) {
      throw new Error(error.message)
    }

    return success("Inbound scan undone. Audit trail kept.", {
      voidedStockUnitId: readString(data, parsed.stockUnitId),
    })
  })
}

export async function confirmOrderOutboundAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(orderOutboundSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const order = await getCustomerOrder(context.supabase, parsed.orderId)
    assertCustomerOrderReadyForOutbound(order)

    const barcodes = parseOutboundBarcodes(parsed.barcodesJson)
    const movementType = movementTypeForOutboundType(parsed.outboundType)
    const duplicateBarcode = duplicateOutboundBarcode(barcodes)

    if (duplicateBarcode) {
      await rejectBarcodeScan(context, {
        barcode: duplicateBarcode,
        action: movementType,
        message: "Duplicate barcode in this outbound batch.",
      })
    }

    if (parsed.outboundType === "TRANSFER" && !parsed.toLocationId) {
      throw new Error("Choose a transfer destination before confirming transfer.")
    }

    if (parsed.outboundType !== "TRANSFER" && parsed.toLocationId) {
      throw new Error("Destination location is only used for transfers.")
    }

    if (parsed.outboundType === "TRANSFER" && parsed.toLocationId) {
      await assertActiveStockLocation(
        context.supabase,
        parsed.toLocationId,
        "Transfer destination"
      )
    }

    const units: Record<string, unknown>[] = []
    let fromLocationId = ""

    for (const barcode of barcodes) {
      const unit = await requireActiveBarcodeUnit(context, barcode, movementType)
      const unitLocationId = readString(unit.location_id)

      assertStockLocationAccess(context.profile, unitLocationId, "outbound")

      if (!fromLocationId) {
        fromLocationId = unitLocationId
      }

      if (fromLocationId !== unitLocationId) {
        await rejectBarcodeScan(context, {
          barcode,
          action: movementType,
          message: "All barcodes in one outbound batch must come from the same location.",
        })
      }

      if (
        parsed.outboundType === "TRANSFER" &&
        parsed.toLocationId === unitLocationId
      ) {
        await rejectBarcodeScan(context, {
          barcode,
          action: movementType,
          message: "Transfer destination must be different from the current location.",
        })
      }

      await assertStockNotLockedByTake(context, {
        itemId: readString(unit.item_id),
        brandId: unit.brand_id ? String(unit.brand_id) : null,
        locationId: unitLocationId,
        action: "confirm outbound",
      })

      units.push(unit)
    }

    const batchNo = `OUT-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now()}-${randomUUID()
      .slice(0, 8)
      .toUpperCase()}`

    const { error: batchError } = await context.supabase.rpc(
      "confirm_order_outbound_batch",
      {
        p_order_id: parsed.orderId,
        p_outbound_type: parsed.outboundType,
        p_to_location_id:
          parsed.outboundType === "TRANSFER" ? parsed.toLocationId : null,
        p_lines: units.map((unit) => ({
          stockUnitId: readString(unit.id),
          barcode: readString(unit.barcode),
        })),
        p_batch_no: batchNo,
        p_reference_no: parsed.referenceNo || batchNo,
        p_notes: parsed.notes ?? null,
      }
    )

    if (batchError) {
      throw new Error(batchError.message)
    }

    return `${parsed.outboundType} outbound batch ${batchNo} confirmed.`
  })
}

export async function confirmDirectOutboundAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(directOutboundSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const barcodes = parseOutboundBarcodes(parsed.barcodesJson)
    const movementType = movementTypeForOutboundType(parsed.outboundType)
    const duplicateBarcode = duplicateOutboundBarcode(barcodes)

    if (duplicateBarcode) {
      await rejectBarcodeScan(context, {
        barcode: duplicateBarcode,
        action: movementType,
        message: "Duplicate barcode in this outbound batch.",
      })
    }

    if (parsed.outboundType === "TRANSFER" && !parsed.toLocationId) {
      throw new Error("Choose a transfer destination before confirming transfer.")
    }

    if (parsed.outboundType !== "TRANSFER" && parsed.toLocationId) {
      throw new Error("Destination location is only used for transfers.")
    }

    if (parsed.outboundType === "TRANSFER" && parsed.toLocationId) {
      await assertActiveStockLocation(
        context.supabase,
        parsed.toLocationId,
        "Transfer destination"
      )
    }

    const units: Record<string, unknown>[] = []
    let fromLocationId = ""

    for (const barcode of barcodes) {
      const unit = await requireActiveBarcodeUnit(context, barcode, movementType)
      const unitLocationId = readString(unit.location_id)

      assertStockLocationAccess(context.profile, unitLocationId, "outbound")

      if (!fromLocationId) {
        fromLocationId = unitLocationId
      }

      if (fromLocationId !== unitLocationId) {
        await rejectBarcodeScan(context, {
          barcode,
          action: movementType,
          message: "All barcodes in one outbound batch must come from the same location.",
        })
      }

      if (
        parsed.outboundType === "TRANSFER" &&
        parsed.toLocationId === unitLocationId
      ) {
        await rejectBarcodeScan(context, {
          barcode,
          action: movementType,
          message: "Transfer destination must be different from the current location.",
        })
      }

      await assertStockNotLockedByTake(context, {
        itemId: readString(unit.item_id),
        brandId: unit.brand_id ? String(unit.brand_id) : null,
        locationId: unitLocationId,
        action: "confirm outbound",
      })

      units.push(unit)
    }

    const batchNo = `DOUT-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now()}-${randomUUID()
      .slice(0, 8)
      .toUpperCase()}`

    const { error: batchError } = await context.supabase.rpc(
      "confirm_direct_outbound_batch",
      {
        p_outbound_type: parsed.outboundType,
        p_to_location_id:
          parsed.outboundType === "TRANSFER" ? parsed.toLocationId : null,
        p_lines: units.map((unit) => ({
          stockUnitId: readString(unit.id),
          barcode: readString(unit.barcode),
        })),
        p_batch_no: batchNo,
        p_reference_no: parsed.referenceNo || batchNo,
        p_notes: parsed.notes ?? null,
      }
    )

    if (batchError) {
      throw new Error(batchError.message)
    }

    return `${parsed.outboundType} direct outbound batch ${batchNo} confirmed.`
  })
}

export async function transferAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(transferSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const unit = await requireActiveBarcodeUnit(
      context,
      parsed.barcode,
      "OUTBOUND_TRANSFER"
    )
    assertStockLocationAccess(
      context.profile,
      String(unit.location_id ?? ""),
      "transfer"
    )
    await assertActiveStockLocation(
      context.supabase,
      parsed.toLocationId,
      "Transfer destination"
    )

    if (String(unit.location_id ?? "") === parsed.toLocationId) {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "OUTBOUND_TRANSFER",
        message: "Transfer destination must be different from the current location.",
      })
    }

    await assertStockNotLockedByTake(context, {
      itemId: readString(unit.item_id),
      brandId: unit.brand_id ? String(unit.brand_id) : null,
      locationId: readString(unit.location_id),
      action: "transfer stock",
    })

    const { error } = await context.supabase.rpc("transfer_stock_unit", {
      p_barcode: parsed.barcode,
      p_to_location_id: parsed.toLocationId,
      p_reference_no: parsed.referenceNo ?? null,
      p_notes: parsed.notes ?? null,
    })

    if (error) {
      throw new Error(error.message)
    }

    return "Transfer marked pending."
  })
}

export async function receiveTransferAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(receiveTransferSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    assertStockLocationAccess(
      context.profile,
      parsed.receiveLocationId,
      "receive transfer"
    )

    const unit = await requireBarcodeUnit(
      context,
      parsed.barcode,
      "TRANSFER_RECEIVED"
    )
    const status = unitStatus(unit)

    if (status !== "TRANSFER_PENDING") {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "TRANSFER_RECEIVED",
        message: `Barcode is ${status || "not pending transfer"} and cannot be received.`,
      })
    }

    if (String(unit.transfer_to_location_id ?? "") !== parsed.receiveLocationId) {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "TRANSFER_RECEIVED",
        message: "Barcode is not assigned to this receiving location.",
      })
    }

    await assertStockNotLockedByTake(context, {
      itemId: readString(unit.item_id),
      brandId: unit.brand_id ? String(unit.brand_id) : null,
      locationId: parsed.receiveLocationId,
      action: "receive transfer",
    })

    const { error } = await context.supabase.rpc("receive_stock_transfer", {
      p_barcode: parsed.barcode,
      p_receive_location_id: parsed.receiveLocationId,
      p_reference_no: parsed.referenceNo ?? null,
      p_notes: parsed.notes ?? null,
    })

    if (error) {
      throw new Error(error.message)
    }

    return "Transfer received."
  })
}

export async function returnStockAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(returnSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    assertStockLocationAccess(context.profile, parsed.locationId, "return")

    const unit = await requireBarcodeUnit(context, parsed.barcode, "RETURN")
    const status = unitStatus(unit)

    if (
      status === "TRANSFER_PENDING" ||
      status === "ADJUSTED_OUT" ||
      status === "DAMAGED"
    ) {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "RETURN",
        message: `Barcode is ${status} and cannot be returned.`,
      })
    }

    if (status === "RETURNED") {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "RETURN",
        message: "Barcode is already returned.",
      })
    }

    if (status === "HOLD" || status === "INSPECTION") {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "RETURN",
        message:
          "Barcode is waiting for inspection release and cannot use normal stock return.",
      })
    }

    await assertStockNotLockedByTake(context, {
      itemId: readString(unit.item_id),
      brandId: unit.brand_id ? String(unit.brand_id) : null,
      locationId: parsed.locationId,
      action: "return stock",
    })

    const { error } = await context.supabase.rpc("return_stock_unit", {
      p_barcode: parsed.barcode,
      p_location_id: parsed.locationId,
      p_reference_no: parsed.referenceNo ?? null,
      p_notes: parsed.notes ?? null,
    })

    if (error) {
      throw new Error(error.message)
    }

    return "Return saved and stock is available."
  })
}

export async function releaseInspectionStockAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(releaseInspectionSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockManagerRoles, async (context) => {
    const unit = await requireBarcodeUnit(
      context,
      parsed.barcode,
      "MANUAL_ADJUSTMENT"
    )
    const status = unitStatus(unit)
    const locationId = readString(unit.location_id)

    assertStockLocationAccess(
      context.profile,
      locationId,
      "release inspection stock"
    )

    if (status !== "INSPECTION" && status !== "HOLD") {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "MANUAL_ADJUSTMENT",
        message: `Barcode is ${status || "not held"} and is not waiting for inspection release.`,
      })
    }

    await assertStockNotLockedByTake(context, {
      itemId: readString(unit.item_id),
      brandId: unit.brand_id ? String(unit.brand_id) : null,
      locationId,
      action: "release inspection stock",
    })

    const { error } = await context.supabase.rpc(
      "release_inspection_stock_unit",
      {
        p_barcode: parsed.barcode,
        p_notes: parsed.notes ?? null,
      }
    )

    if (error) {
      throw new Error(error.message)
    }

    return "Inspection released. Stock is now available."
  })
}

async function getDamageRequest(
  supabase: SupabaseServerClient,
  requestId: string
) {
  const { data, error } = await supabase
    .from("stock_damage_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const request = asRecord(data)

  if (!request.id) {
    throw new Error("Damage request was not found or is outside your scope.")
  }

  return request
}

export async function createDamageRequestAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(damageRequestSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const unit = await requireActiveBarcodeUnit(
      context,
      parsed.barcode,
      "OUTBOUND_SPOILED"
    )
    const locationId = readString(unit.location_id)
    const itemId = readString(unit.item_id)
    const brandId = unit.brand_id ? String(unit.brand_id) : null

    assertStockLocationAccess(context.profile, locationId, "request damage")
    await assertStockNotLockedByTake(context, {
      itemId,
      brandId,
      locationId,
      action: "request damage/spoilage deduction",
    })

    const { data: existingData, error: existingError } = await context.supabase
      .from("stock_damage_requests")
      .select("id")
      .eq("stock_unit_id", readString(unit.id))
      .in("status", ["SUBMITTED", "MANAGER_REVIEWED"])
      .maybeSingle()

    if (existingError) {
      throw new Error(existingError.message)
    }

    if (asRecord(existingData).id) {
      throw new Error("This barcode already has an open damage request.")
    }

    const requestNo = `DMG-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`
    const { data, error } = await context.supabase
      .from("stock_damage_requests")
      .insert({
        request_no: requestNo,
        stock_unit_id: readString(unit.id),
        barcode: parsed.barcode,
        item_id: itemId,
        brand_id: brandId,
        origin_id: unit.origin_id ? String(unit.origin_id) : null,
        location_id: locationId,
        reason: parsed.reason,
        status: "SUBMITTED",
        photo_path: parsed.photoPath,
        notes: parsed.notes ?? null,
        requested_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await logBarcodeScan(context.supabase, {
      barcode: parsed.barcode,
      action: "OUTBOUND_SPOILED",
      success: true,
      message: "Damage request submitted for manager review",
      scannedBy: context.profile.id,
    })
    await insertAuditLog(
      context.supabase,
      context.profile,
      "DAMAGE_REQUEST_SUBMITTED",
      "stock_damage_requests",
      readString(asRecord(data).id),
      parsed
    )

    return `Damage request ${requestNo} submitted for manager review.`
  })
}

export async function reviewDamageRequestAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(damageRequestIdSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockManagerRoles, async (context) => {
    const signature = requireSignature(
      parsed.managerSignature,
      "Manager damage review"
    )
    const request = await getDamageRequest(context.supabase, parsed.requestId)

    assertDamageCanBeManagerReviewed(readString(request.status))

    assertStockLocationAccess(
      context.profile,
      readString(request.location_id),
      "review damage"
    )

    const { error } = await context.supabase
      .from("stock_damage_requests")
      .update({
        status: "MANAGER_REVIEWED",
        manager_reviewed_by: context.profile.id,
        manager_reviewed_at: new Date().toISOString(),
        manager_signature: signature,
      })
      .eq("id", parsed.requestId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "DAMAGE_REQUEST_MANAGER_REVIEWED",
      "stock_damage_requests",
      parsed.requestId,
      parsed
    )

    return "Damage request reviewed for director approval."
  })
}

export async function approveDamageRequestAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(damageRequestIdSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockDirectorApprovalRoles, async (context) => {
    const signature = requireSignature(
      parsed.directorSignature,
      "Director damage approval"
    )
    const request = await getDamageRequest(context.supabase, parsed.requestId)

    if (readString(request.status) !== "MANAGER_REVIEWED") {
      throw new Error("Only manager-reviewed damage requests can be approved.")
    }

    assertStockLocationAccess(
      context.profile,
      readString(request.location_id),
      "approve damage"
    )

    const { error } = await context.supabase.rpc("approve_stock_damage_request", {
      p_request_id: parsed.requestId,
      p_director_signature: signature,
    })

    if (error) {
      throw new Error(error.message)
    }

    return "Damage request approved and stock deducted."
  })
}

export async function rejectDamageRequestAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(damageRequestIdSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(
    formData,
    [...stockManagerRoles, "director"],
    async (context) => {
      const request = await getDamageRequest(context.supabase, parsed.requestId)
      const status = readString(request.status)

      if (status === "SUBMITTED" && !hasAnyRole(context.profile, stockManagerRoles)) {
        throw new Error("Only a manager or admin can reject submitted damage requests.")
      }

      if (
        status === "MANAGER_REVIEWED" &&
        !hasAnyRole(context.profile, stockDirectorApprovalRoles)
      ) {
        throw new Error("Only director or admin can reject reviewed damage requests.")
      }

      const signatureLabel = damageRejectionSignatureLabel(status)
      const signature = requireSignature(
        status === "MANAGER_REVIEWED"
          ? parsed.directorSignature
          : parsed.managerSignature,
        signatureLabel
      )

      const { error } = await context.supabase
        .from("stock_damage_requests")
        .update({
          status: "REJECTED",
          ...(status === "MANAGER_REVIEWED"
            ? {
                director_approved_by: context.profile.id,
                director_approved_at: new Date().toISOString(),
                director_signature: signature,
              }
            : {
                manager_reviewed_by: context.profile.id,
                manager_reviewed_at: new Date().toISOString(),
                manager_signature: signature,
              }),
        })
        .eq("id", parsed.requestId)

      if (error) {
        throw new Error(error.message)
      }

      await insertAuditLog(
        context.supabase,
        context.profile,
        "DAMAGE_REQUEST_REJECTED",
        "stock_damage_requests",
        parsed.requestId,
        parsed
      )

      return "Damage request rejected."
    }
  )
}

async function getReturnSupplierRequest(
  supabase: SupabaseServerClient,
  requestId: string
) {
  const { data, error } = await supabase
    .from("stock_return_supplier_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const request = asRecord(data)

  if (!request.id) {
    throw new Error("Return supplier request was not found or is outside your scope.")
  }

  return request
}

export async function createReturnSupplierRequestAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(returnSupplierRequestSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const unit = await requireActiveBarcodeUnit(
      context,
      parsed.barcode,
      "OUTBOUND_RETURN_SUPPLIER"
    )
    const locationId = readString(unit.location_id)
    const itemId = readString(unit.item_id)
    const brandId = unit.brand_id ? String(unit.brand_id) : null

    assertStockLocationAccess(context.profile, locationId, "request return supplier")
    await assertStockNotLockedByTake(context, {
      itemId,
      brandId,
      locationId,
      action: "request return supplier deduction",
    })

    const { data: existingData, error: existingError } = await context.supabase
      .from("stock_return_supplier_requests")
      .select("id")
      .eq("stock_unit_id", readString(unit.id))
      .eq("status", "SUBMITTED")
      .maybeSingle()

    if (existingError) {
      throw new Error(existingError.message)
    }

    if (asRecord(existingData).id) {
      throw new Error("This barcode already has an open return supplier request.")
    }

    const requestNo = `RS-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`
    const { data, error } = await context.supabase
      .from("stock_return_supplier_requests")
      .insert({
        request_no: requestNo,
        stock_unit_id: readString(unit.id),
        barcode: parsed.barcode,
        item_id: itemId,
        brand_id: brandId,
        origin_id: unit.origin_id ? String(unit.origin_id) : null,
        location_id: locationId,
        supplier_name: parsed.supplierName,
        status: "SUBMITTED",
        notes: parsed.notes ?? null,
        requested_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await logBarcodeScan(context.supabase, {
      barcode: parsed.barcode,
      action: "OUTBOUND_RETURN_SUPPLIER",
      success: true,
      message: "Return supplier request submitted for manager review",
      scannedBy: context.profile.id,
    })
    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETURN_SUPPLIER_REQUEST_SUBMITTED",
      "stock_return_supplier_requests",
      readString(asRecord(data).id),
      parsed
    )

    return `Return supplier request ${requestNo} submitted for manager review.`
  })
}

export async function approveReturnSupplierRequestAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(returnSupplierRequestIdSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockManagerRoles, async (context) => {
    const signature = requireSignature(
      parsed.managerSignature,
      "Manager return supplier approval"
    )
    const request = await getReturnSupplierRequest(
      context.supabase,
      parsed.requestId
    )

    if (readString(request.status) !== "SUBMITTED") {
      throw new Error("Only submitted return supplier requests can be approved.")
    }

    assertStockLocationAccess(
      context.profile,
      readString(request.location_id),
      "approve return supplier"
    )

    const { error } = await context.supabase.rpc(
      "approve_stock_return_supplier_request",
      {
        p_request_id: parsed.requestId,
        p_manager_signature: signature,
      }
    )

    if (error) {
      throw new Error(error.message)
    }

    return "Return supplier approved and stock deducted."
  })
}

export async function rejectReturnSupplierRequestAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(returnSupplierRequestIdSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockManagerRoles, async (context) => {
    const signature = requireSignature(
      parsed.managerSignature,
      "Manager return supplier rejection"
    )
    const request = await getReturnSupplierRequest(
      context.supabase,
      parsed.requestId
    )

    assertReturnSupplierCanBeRejected(readString(request.status))

    assertStockLocationAccess(
      context.profile,
      readString(request.location_id),
      "reject return supplier"
    )

    const { error } = await context.supabase
      .from("stock_return_supplier_requests")
      .update({
        status: "REJECTED",
        manager_reviewed_by: context.profile.id,
        manager_reviewed_at: new Date().toISOString(),
        manager_signature: signature,
      })
      .eq("id", parsed.requestId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETURN_SUPPLIER_REQUEST_REJECTED",
      "stock_return_supplier_requests",
      parsed.requestId,
      parsed
    )

    return "Return supplier request rejected."
  })
}

export async function noBarcodeInboundAction(
  _state: StockActionState,
  _formData: FormData
): Promise<StockActionState> {
  void _state
  void _formData

  return failure(
    "No-barcode inbound is disabled for MVP. Generate and print a barcode label first, attach it to the item, then use Barcode Inbound."
  )
}

export async function createStockTakeSessionAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(createStockTakeSessionSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockManagerRoles, async (context) => {
    assertStockLocationAccess(
      context.profile,
      parsed.locationId,
      "create stock take"
    )

    const sessionNo = `ST-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now().toString().slice(-5)}`
    const { data, error } = await context.supabase
      .from("stock_take_sessions")
      .insert({
        session_no: sessionNo,
        location_id: parsed.locationId,
        item_id: parsed.itemId,
        brand_id: parsed.brandId,
        status: "DRAFT",
        created_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "STOCK_TAKE_CREATED",
      "stock_take_sessions",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Stock take session created."
  })
}

export async function scanStockTakeBarcodeAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(stockTakeBarcodeSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const session = await getStockTakeSession(
      context.supabase,
      parsed.sessionId
    )

    if (!session.id) {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "STOCK_TAKE_ADJUSTMENT",
        message: "Stock take session was not found.",
      })
    }

    assertStockLocationAccess(
      context.profile,
      String(session.location_id ?? ""),
      "scan stock take"
    )

    if (stockTakeStatus(session) !== "DRAFT") {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "STOCK_TAKE_ADJUSTMENT",
        message: "Only draft stock take sessions can accept scans.",
      })
    }

    const unit = await requireActiveBarcodeUnit(
      context,
      parsed.barcode,
      "STOCK_TAKE_ADJUSTMENT"
    )
    const unitItemId = String(unit.item_id ?? "")
    const unitBrandId = unit.brand_id ? String(unit.brand_id) : null

    if (String(unit.location_id ?? "") !== String(session.location_id ?? "")) {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "STOCK_TAKE_ADJUSTMENT",
        message: "Barcode belongs to a different stock take location.",
      })
    }

    try {
      requireStockTakeScopeMatch(session, {
        itemId: unitItemId,
        brandId: unitBrandId,
      })
    } catch (error) {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "STOCK_TAKE_ADJUSTMENT",
        message:
          error instanceof Error
            ? error.message
            : "Barcode does not match this stock take scope.",
      })
    }

    const { data: existingLineData, error: existingLineError } =
      await context.supabase
        .from("stock_take_lines")
        .select("id")
        .eq("session_id", parsed.sessionId)
        .eq("barcode", parsed.barcode)
        .maybeSingle()

    if (existingLineError) {
      throw new Error(existingLineError.message)
    }

    if (asRecord(existingLineData).id) {
      await rejectBarcodeScan(context, {
        barcode: parsed.barcode,
        action: "STOCK_TAKE_ADJUSTMENT",
        message: "Barcode is already recorded in this stock take session.",
      })
    }

    const weightKg = readNumber(unit.net_weight_kg)
    const { data, error } = await context.supabase
      .from("stock_take_lines")
      .insert({
        session_id: parsed.sessionId,
        item_id: unitItemId,
        brand_id: unitBrandId,
        origin_id: unit.origin_id ? String(unit.origin_id) : null,
        barcode: parsed.barcode,
        system_count: 1,
        actual_count: 1,
        system_weight_kg: weightKg,
        actual_weight_kg: weightKg,
        notes: "Barcode stock take scan",
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await logBarcodeScan(context.supabase, {
      barcode: parsed.barcode,
      action: "STOCK_TAKE_ADJUSTMENT",
      success: true,
      message: "Stock take scan accepted",
      scannedBy: context.profile.id,
    })
    await insertAuditLog(
      context.supabase,
      context.profile,
      "STOCK_TAKE_BARCODE_SCANNED",
      "stock_take_lines",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Stock take barcode recorded."
  })
}

export async function addStockTakeLineAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  void formData

  return {
    status: "error",
    message:
      "Stock take is barcode scanning only. Scan each barcode instead of adding manual count lines.",
  }
}

export async function submitStockTakeAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(stockTakeSessionIdSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    await requireStockTakeSessionStatus(context.supabase, parsed.sessionId, [
      "DRAFT",
    ])
    await requireStockTakeLineCount(context.supabase, parsed.sessionId)

    const { error } = await context.supabase
      .from("stock_take_sessions")
      .update({
        status: "SUBMITTED",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", parsed.sessionId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "STOCK_TAKE_SUBMITTED",
      "stock_take_sessions",
      parsed.sessionId,
      parsed
    )

    return "Stock take submitted for review."
  })
}

export async function reviewStockTakeAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(stockTakeSessionIdSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockManagerRoles, async (context) => {
    const signature = requireSignature(
      parsed.managerSignature,
      "Manager review"
    )
    await requireStockTakeSessionStatus(context.supabase, parsed.sessionId, [
      "SUBMITTED",
    ])
    await requireStockTakeLineCount(context.supabase, parsed.sessionId)

    const { error } = await context.supabase
      .from("stock_take_sessions")
      .update({
        status: "REVIEWED",
        reviewed_at: new Date().toISOString(),
        manager_reviewed_by: context.profile.id,
        manager_reviewed_at: new Date().toISOString(),
        manager_signature: signature,
      })
      .eq("id", parsed.sessionId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "STOCK_TAKE_REVIEWED",
      "stock_take_sessions",
      parsed.sessionId,
      parsed
    )

    return "Stock take reviewed."
  })
}

export async function approveStockTakeAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(stockTakeSessionIdSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockDirectorApprovalRoles, async (context) => {
    const signature = requireSignature(
      parsed.directorSignature,
      "Director approval"
    )
    await requireStockTakeLineCount(context.supabase, parsed.sessionId)
    const { error } = await context.supabase.rpc("approve_stock_take_session", {
      p_session_id: parsed.sessionId,
      p_director_signature: signature,
    })

    if (error) {
      throw new Error(error.message)
    }

    return "Stock take approved and adjustments recorded."
  })
}

export async function rejectStockTakeAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(stockTakeSessionIdSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(
    formData,
    [...stockManagerRoles, "director"],
    async (context) => {
    const session = await requireStockTakeSessionStatus(context.supabase, parsed.sessionId, [
      "SUBMITTED",
      "REVIEWED",
    ])
    const status = stockTakeStatus(session)

    if (status === "SUBMITTED" && !hasAnyRole(context.profile, stockManagerRoles)) {
      throw new Error("Only a department manager or admin can reject submitted stock take.")
    }

    if (
      status === "REVIEWED" &&
      !hasAnyRole(context.profile, stockDirectorApprovalRoles)
    ) {
      throw new Error("Only director or admin can reject reviewed stock take.")
    }

    const signature =
      status === "REVIEWED"
        ? requireSignature(parsed.directorSignature, "Director rejection")
        : requireSignature(parsed.managerSignature, "Manager rejection")

    const { error } = await context.supabase
      .from("stock_take_sessions")
      .update({
        status: "REJECTED",
        reviewed_at: new Date().toISOString(),
        ...(status === "REVIEWED"
          ? {
              director_approved_by: context.profile.id,
              director_approved_at: new Date().toISOString(),
              director_signature: signature,
            }
          : {
              manager_reviewed_by: context.profile.id,
              manager_reviewed_at: new Date().toISOString(),
              manager_signature: signature,
            }),
      })
      .eq("id", parsed.sessionId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "STOCK_TAKE_REJECTED",
      "stock_take_sessions",
      parsed.sessionId,
      parsed
    )

    return "Stock take rejected."
  })
}
