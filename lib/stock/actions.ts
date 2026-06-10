"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
  type UserRole,
} from "@/lib/auth/session"
import { asRecord, readNumber } from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import {
  stockCategories,
  type StockMovementType,
} from "@/lib/stock/types"

export type StockActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export const initialStockActionState: StockActionState = {
  status: "idle",
  message: "",
}

const stockOperatorRoles: UserRole[] = [
  "general_worker",
  "retail_team",
  "admin",
  "director",
]

const stockApproverRoles: UserRole[] = ["admin", "director"]

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const itemSchema = z.object({
  itemCode: z.string().trim().min(2),
  category: z.enum(stockCategories),
  section: z.string().trim().min(2),
  name: z.string().trim().min(2),
  barcodeRequired: z.coerce.boolean().default(true),
})

const namedSchema = z.object({
  name: z.string().trim().min(2),
})

const barcodeInboundSchema = z.object({
  barcode: z.string().trim().min(3),
  itemId: z.string().trim().min(1),
  brandId: optionalUuid,
  originId: optionalUuid,
  locationId: z.string().trim().min(1),
  netWeightKg: z.coerce.number().positive(),
  batchNo: z.string().trim().optional(),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const barcodeOutboundSchema = z.object({
  barcode: z.string().trim().min(3),
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

const noBarcodeInboundSchema = z.object({
  itemId: z.string().trim().min(1),
  locationId: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  weightKg: z.coerce.number().positive(),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const createStockTakeSessionSchema = z.object({
  locationId: z.string().trim().min(1),
})

const stockTakeLineSchema = z.object({
  sessionId: z.string().trim().min(1),
  itemId: z.string().trim().min(1),
  systemCount: z.coerce.number().min(0),
  actualCount: z.coerce.number().min(0),
  systemWeightKg: z.coerce.number().min(0),
  actualWeightKg: z.coerce.number().min(0),
  notes: z.string().trim().optional(),
})

const stockTakeSessionIdSchema = z.object({
  sessionId: z.string().trim().min(1),
})

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function success(message: string): StockActionState {
  return { status: "success", message }
}

function failure(message: string): StockActionState {
  return { status: "error", message }
}

async function getActionContext(roles: UserRole[]) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: "Sign in before changing stock records." }
  }

  if (!hasAnyRole(profile, roles)) {
    return { error: "Your role does not allow this stock action." }
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

async function insertMovement(
  supabase: SupabaseServerClient,
  input: {
    movementType: StockMovementType
    itemId: string
    stockUnitId?: string | null
    barcode?: string | null
    fromLocationId?: string | null
    toLocationId?: string | null
    quantity: number
    weightKg: number
    referenceNo?: string | null
    notes?: string | null
    createdBy: string
  }
) {
  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      movement_type: input.movementType,
      item_id: input.itemId,
      stock_unit_id: input.stockUnitId ?? null,
      barcode: input.barcode ?? null,
      from_location_id: input.fromLocationId ?? null,
      to_location_id: input.toLocationId ?? null,
      quantity: input.quantity,
      weight_kg: input.weightKg,
      reference_no: input.referenceNo ?? null,
      notes: input.notes ?? null,
      created_by: input.createdBy,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return String(asRecord(data).id ?? "")
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

function revalidateStockPaths() {
  [
    "/stock/dashboard",
    "/stock/items",
    "/stock/balance",
    "/stock/movements",
    "/stock/stock-take",
    "/stock/reports",
    "/stock/settings",
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
    context: {
      profile: CurrentProfile
      supabase: SupabaseServerClient
    },
    formData: FormData
  ) => Promise<string>
) {
  const context = await getActionContext(roles)

  if ("error" in context) {
    return failure(context.error ?? "Action unavailable.")
  }

  if (context.demoMode || !context.supabase) {
    return success("Demo mode: connect Supabase to save this action.")
  }

  try {
    const message = await callback(
      { profile: context.profile, supabase: context.supabase },
      formData
    )
    revalidateStockPaths()
    return success(message)
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

  return runStockAction(formData, ["admin", "director"], async (context) => {
    const { data, error } = await context.supabase
      .from("items")
      .insert({
        item_code: parsed.itemCode,
        category: parsed.category,
        section: parsed.section,
        name: parsed.name,
        barcode_required: parsed.barcodeRequired,
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
      parsed
    )

    return "Item created."
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
    const { data, error } = await context.supabase
      .from("stock_units")
      .insert({
        barcode: parsed.barcode,
        item_id: parsed.itemId,
        brand_id: parsed.brandId,
        origin_id: parsed.originId,
        location_id: parsed.locationId,
        status: "IN_STOCK",
        net_weight_kg: parsed.netWeightKg,
        batch_no: parsed.batchNo ?? null,
      })
      .select("id")
      .single()

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

    const stockUnitId = String(asRecord(data).id ?? "")
    const movementId = await insertMovement(context.supabase, {
      movementType: "INBOUND",
      itemId: parsed.itemId,
      stockUnitId,
      barcode: parsed.barcode,
      toLocationId: parsed.locationId,
      quantity: 1,
      weightKg: parsed.netWeightKg,
      referenceNo: parsed.referenceNo ?? null,
      notes: parsed.notes ?? null,
      createdBy: context.profile.id,
    })

    await logBarcodeScan(context.supabase, {
      barcode: parsed.barcode,
      action: "INBOUND",
      success: true,
      message: "Inbound accepted",
      scannedBy: context.profile.id,
    })
    await insertAuditLog(
      context.supabase,
      context.profile,
      "BARCODE_INBOUND",
      "stock_movements",
      movementId,
      parsed
    )

    return "Barcode inbound saved."
  })
}

export async function outboundSalesAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(barcodeOutboundSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const unit = await getUnitByBarcode(context.supabase, parsed.barcode)

    if (!unit.id) {
      throw new Error("Barcode was not found.")
    }

    const { error } = await context.supabase
      .from("stock_units")
      .update({ status: "SOLD", sold_at: new Date().toISOString() })
      .eq("id", unit.id)

    if (error) {
      throw new Error(error.message)
    }

    const movementId = await insertMovement(context.supabase, {
      movementType: "OUTBOUND_SALES",
      itemId: String(unit.item_id ?? ""),
      stockUnitId: String(unit.id),
      barcode: parsed.barcode,
      fromLocationId: String(unit.location_id ?? ""),
      quantity: 1,
      weightKg: readNumber(unit.net_weight_kg),
      referenceNo: parsed.referenceNo ?? null,
      notes: parsed.notes ?? null,
      createdBy: context.profile.id,
    })

    await logBarcodeScan(context.supabase, {
      barcode: parsed.barcode,
      action: "OUTBOUND_SALES",
      success: true,
      message: "Sales outbound accepted",
      scannedBy: context.profile.id,
    })
    await insertAuditLog(
      context.supabase,
      context.profile,
      "OUTBOUND_SALES",
      "stock_movements",
      movementId,
      parsed
    )

    return "Sales outbound saved."
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
    const unit = await getUnitByBarcode(context.supabase, parsed.barcode)

    if (!unit.id) {
      throw new Error("Barcode was not found.")
    }

    const { error } = await context.supabase
      .from("stock_units")
      .update({
        status: "TRANSFER_PENDING",
        transfer_to_location_id: parsed.toLocationId,
      })
      .eq("id", unit.id)

    if (error) {
      throw new Error(error.message)
    }

    const movementId = await insertMovement(context.supabase, {
      movementType: "OUTBOUND_TRANSFER",
      itemId: String(unit.item_id ?? ""),
      stockUnitId: String(unit.id),
      barcode: parsed.barcode,
      fromLocationId: String(unit.location_id ?? ""),
      toLocationId: parsed.toLocationId,
      quantity: 1,
      weightKg: readNumber(unit.net_weight_kg),
      referenceNo: parsed.referenceNo ?? null,
      notes: parsed.notes ?? null,
      createdBy: context.profile.id,
    })

    await insertAuditLog(
      context.supabase,
      context.profile,
      "TRANSFER_CREATED",
      "stock_movements",
      movementId,
      parsed
    )

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
    const unit = await getUnitByBarcode(context.supabase, parsed.barcode)

    if (!unit.id) {
      throw new Error("Barcode was not found.")
    }

    const { error } = await context.supabase
      .from("stock_units")
      .update({
        status: "TRANSFERRED",
        location_id: parsed.receiveLocationId,
        transfer_to_location_id: null,
      })
      .eq("id", unit.id)

    if (error) {
      throw new Error(error.message)
    }

    const movementId = await insertMovement(context.supabase, {
      movementType: "TRANSFER_RECEIVED",
      itemId: String(unit.item_id ?? ""),
      stockUnitId: String(unit.id),
      barcode: parsed.barcode,
      fromLocationId: String(unit.location_id ?? ""),
      toLocationId: parsed.receiveLocationId,
      quantity: 1,
      weightKg: readNumber(unit.net_weight_kg),
      referenceNo: parsed.referenceNo ?? null,
      notes: parsed.notes ?? null,
      createdBy: context.profile.id,
    })

    await insertAuditLog(
      context.supabase,
      context.profile,
      "TRANSFER_RECEIVED",
      "stock_movements",
      movementId,
      parsed
    )

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
    const unit = await getUnitByBarcode(context.supabase, parsed.barcode)

    if (!unit.id) {
      throw new Error("Barcode was not found.")
    }

    const { error } = await context.supabase
      .from("stock_units")
      .update({
        status: "RETURNED",
        location_id: parsed.locationId,
      })
      .eq("id", unit.id)

    if (error) {
      throw new Error(error.message)
    }

    const movementId = await insertMovement(context.supabase, {
      movementType: "RETURN",
      itemId: String(unit.item_id ?? ""),
      stockUnitId: String(unit.id),
      barcode: parsed.barcode,
      toLocationId: parsed.locationId,
      quantity: 1,
      weightKg: readNumber(unit.net_weight_kg),
      referenceNo: parsed.referenceNo ?? null,
      notes: parsed.notes ?? null,
      createdBy: context.profile.id,
    })

    await insertAuditLog(
      context.supabase,
      context.profile,
      "STOCK_RETURN",
      "stock_movements",
      movementId,
      parsed
    )

    return "Return saved."
  })
}

export async function noBarcodeInboundAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(noBarcodeInboundSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const { data: existingData, error: existingError } = await context.supabase
      .from("no_barcode_stock")
      .select("*")
      .eq("item_id", parsed.itemId)
      .eq("location_id", parsed.locationId)
      .maybeSingle()

    if (existingError) {
      throw new Error(existingError.message)
    }

    const existing = asRecord(existingData)

    if (existing.id) {
      const { error } = await context.supabase
        .from("no_barcode_stock")
        .update({
          quantity: readNumber(existing.quantity) + parsed.quantity,
          weight_kg: readNumber(existing.weight_kg) + parsed.weightKg,
        })
        .eq("id", existing.id)

      if (error) {
        throw new Error(error.message)
      }
    } else {
      const { error } = await context.supabase
        .from("no_barcode_stock")
        .insert({
          item_id: parsed.itemId,
          location_id: parsed.locationId,
          quantity: parsed.quantity,
          weight_kg: parsed.weightKg,
        })

      if (error) {
        throw new Error(error.message)
      }
    }

    const movementId = await insertMovement(context.supabase, {
      movementType: "NO_BARCODE_INBOUND",
      itemId: parsed.itemId,
      toLocationId: parsed.locationId,
      quantity: parsed.quantity,
      weightKg: parsed.weightKg,
      referenceNo: parsed.referenceNo ?? null,
      notes: parsed.notes ?? null,
      createdBy: context.profile.id,
    })

    const { error: noBarcodeMovementError } = await context.supabase
      .from("no_barcode_movements")
      .insert({
        movement_type: "NO_BARCODE_INBOUND",
        item_id: parsed.itemId,
        location_id: parsed.locationId,
        quantity_delta: parsed.quantity,
        weight_delta_kg: parsed.weightKg,
        reference_no: parsed.referenceNo ?? null,
        notes: parsed.notes ?? null,
        created_by: context.profile.id,
      })

    if (noBarcodeMovementError) {
      throw new Error(noBarcodeMovementError.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "NO_BARCODE_INBOUND",
      "stock_movements",
      movementId,
      parsed
    )

    return "No-barcode inbound saved."
  })
}

export async function createStockTakeSessionAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(createStockTakeSessionSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const sessionNo = `ST-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now().toString().slice(-5)}`
    const { data, error } = await context.supabase
      .from("stock_take_sessions")
      .insert({
        session_no: sessionNo,
        location_id: parsed.locationId,
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

export async function addStockTakeLineAction(
  _state: StockActionState,
  formData: FormData
): Promise<StockActionState> {
  const parsed = parseAction(stockTakeLineSchema, formData)

  if ("status" in parsed) {
    return parsed
  }

  return runStockAction(formData, stockOperatorRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("stock_take_lines")
      .insert({
        session_id: parsed.sessionId,
        item_id: parsed.itemId,
        system_count: parsed.systemCount,
        actual_count: parsed.actualCount,
        system_weight_kg: parsed.systemWeightKg,
        actual_weight_kg: parsed.actualWeightKg,
        notes: parsed.notes ?? null,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "STOCK_TAKE_LINE_ADDED",
      "stock_take_lines",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Stock take line added."
  })
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

  return runStockAction(formData, stockApproverRoles, async (context) => {
    const { error } = await context.supabase
      .from("stock_take_sessions")
      .update({
        status: "REVIEWED",
        reviewed_at: new Date().toISOString(),
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

  return runStockAction(formData, stockApproverRoles, async (context) => {
    const { data: linesData, error: linesError } = await context.supabase
      .from("stock_take_lines")
      .select("*")
      .eq("session_id", parsed.sessionId)

    if (linesError) {
      throw new Error(linesError.message)
    }

    const lines = Array.isArray(linesData) ? linesData.map(asRecord) : []

    for (const line of lines) {
      const itemId = String(line.item_id ?? "")
      const varianceCount = readNumber(line.variance_count)
      const varianceWeightKg = readNumber(line.variance_weight_kg)

      if (varianceCount === 0 && varianceWeightKg === 0) {
        continue
      }

      await insertMovement(context.supabase, {
        movementType: "STOCK_TAKE_ADJUSTMENT",
        itemId,
        quantity: varianceCount,
        weightKg: varianceWeightKg,
        referenceNo: parsed.sessionId,
        notes: "Approved stock take variance",
        createdBy: context.profile.id,
      })
    }

    const { error } = await context.supabase
      .from("stock_take_sessions")
      .update({
        status: "APPROVED",
        approved_by: context.profile.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", parsed.sessionId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "STOCK_TAKE_APPROVED",
      "stock_take_sessions",
      parsed.sessionId,
      parsed
    )

    return "Stock take approved and adjustments recorded."
  })
}
