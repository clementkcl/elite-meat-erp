"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
  type UserRole,
} from "@/lib/auth/session"
import {
  asRecord,
  asRecordArray,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import type { RetailActionState } from "@/lib/retail/action-state"
import {
  retailCleaningFrequencies,
  retailExpenseStatuses,
  retailPaymentMethods,
  retailPaymentStatuses,
} from "@/lib/retail/types"

const retailOperatorRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "admin",
  "director",
]
const retailPaymentRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "account",
  "admin",
  "director",
]
const retailExpenseReviewRoles: UserRole[] = [
  "retail_manager",
  "account",
  "admin",
  "director",
]
const retailExpensePaymentRoles: UserRole[] = ["account", "admin"]
const retailAdminRoles: UserRole[] = ["retail_manager", "admin", "director"]
const retailDirectorRoles: UserRole[] = ["admin", "director"]
const processingOperatorRoles: UserRole[] = [
  "processing_team_general_worker",
  "processing_manager",
  "admin",
  "director",
]
const processingReviewRoles: UserRole[] = [
  "processing_manager",
  "admin",
  "director",
]
const cleaningManagerRoles: UserRole[] = [
  "retail_manager",
  "processing_manager",
  "admin",
  "director",
]
const cleaningCompletionRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
]

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const createSaleSchema = z.object({
  registerId: z.string().trim().min(1),
  cashSessionId: optionalUuid,
  customerName: optionalText,
  customerPhone: optionalText,
  itemId: z.string().trim().min(1),
  brandId: optionalUuid,
  originId: optionalUuid,
  stockLocationId: z.string().trim().min(1),
  stockUnitId: optionalUuid,
  noBarcodeStockId: optionalUuid,
  barcode: optionalText,
  quantity: z.coerce.number().positive(),
  weightKg: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  lineDiscount: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0),
  paymentMethod: z.enum(retailPaymentMethods),
  paymentAmount: z.coerce.number().min(0),
  referenceNo: optionalText,
  notes: optionalText,
})

const paymentSchema = z.object({
  saleId: z.string().trim().min(1),
  paymentMethod: z.enum(retailPaymentMethods),
  paymentStatus: z.enum(retailPaymentStatuses),
  amount: z.coerce.number().positive(),
  referenceNo: optionalText,
  notes: optionalText,
})

const openCashSessionSchema = z.object({
  registerId: z.string().trim().min(1),
  openingFloat: z.coerce.number().min(0),
  notes: optionalText,
})

const closeCashSessionSchema = z.object({
  sessionId: z.string().trim().min(1),
  closingCash: z.coerce.number().min(0),
  notes: optionalText,
})

const dailySaleSchema = z.object({
  outletId: optionalUuid,
  salesDate: z.string().trim().min(1),
  paymentCode: z.string().trim().min(2),
  grossSales: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0),
  cashReceived: z.coerce.number().min(0),
  notes: optionalText,
})

const dailyClosingSchema = z.object({
  outletId: optionalUuid,
  closingDate: z.string().trim().min(1),
  totalSales: z.coerce.number().min(0),
  cashReceived: z.coerce.number().min(0),
  expensesAmount: z.coerce.number().min(0),
  closingCash: z.coerce.number().min(0),
  varianceAmount: z.coerce.number(),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]),
  notes: optionalText,
})

const priceRuleSchema = z.object({
  itemId: z.string().trim().min(1),
  brandId: optionalUuid,
  originId: optionalUuid,
  outletId: optionalUuid,
  unitPrice: z.coerce.number().min(0),
  effectiveFrom: z.string().trim().min(1),
  effectiveTo: optionalText,
})

const processingBatchSchema = z.object({
  outletId: optionalUuid,
  stockLocationId: optionalUuid,
  rawItemId: z.string().trim().min(1),
  rawBrandId: optionalUuid,
  rawOriginId: optionalUuid,
  rawQuantity: z.coerce.number().min(0),
  rawWeightKg: z.coerce.number().positive(),
  finishedItemId: z.string().trim().min(1),
  finishedBrandId: optionalUuid,
  finishedOriginId: optionalUuid,
  finishedQuantity: z.coerce.number().min(0),
  finishedWeightKg: z.coerce.number().min(0),
  status: z.enum(["OPEN", "COMPLETED"]),
  notes: optionalText,
})

const processingReviewSchema = z.object({
  batchId: z.string().trim().min(1),
  status: z.enum(["REVIEWED", "CANCELLED"]),
  notes: optionalText,
})

const cleaningTaskSchema = z.object({
  outletId: optionalUuid,
  departmentId: optionalUuid,
  taskName: z.string().trim().min(2),
  frequency: z.enum(retailCleaningFrequencies),
  dueDate: z.string().trim().min(1),
  assignedTo: optionalUuid,
  notes: optionalText,
})

const completeCleaningTaskSchema = z.object({
  taskId: z.string().trim().min(1),
  status: z.enum(["DONE", "MISSED"]),
  notes: optionalText,
})

const expenseSchema = z.object({
  outletId: optionalUuid,
  expenseDate: z.string().trim().min(1),
  category: z.string().trim().min(2),
  vendor: optionalText,
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(retailPaymentMethods),
  receiptUrl: optionalText,
  notes: optionalText,
})

const expenseStatusSchema = z.object({
  expenseId: z.string().trim().min(1),
  status: z.enum(retailExpenseStatuses),
  notes: optionalText,
})

type RetailActionContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function success(message: string): RetailActionState {
  return { status: "success", message }
}

function failure(message: string): RetailActionState {
  return { status: "error", message }
}

function parseAction<T>(
  schema: z.ZodType<T>,
  formData: FormData
): T | RetailActionState {
  const parsed = schema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the form fields.")
  }

  return parsed.data
}

function isRetailActionState(value: unknown): value is RetailActionState {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "status" in value
  )
}

function isAdminScope(profile: CurrentProfile) {
  return hasAnyRole(profile, ["admin", "director"])
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function sameDay(value: unknown) {
  return readString(value).slice(0, 10) === todayKey()
}

function assertRetailSameDay(profile: CurrentProfile, value: unknown, action: string) {
  if (isAdminScope(profile)) {
    return
  }

  if (!sameDay(value)) {
    throw new Error(`Retail teams can only ${action} same-day retail records.`)
  }
}

function scopedOutlet(profile: CurrentProfile, requestedOutletId: string | null) {
  return isAdminScope(profile) ? requestedOutletId : profile.outletId
}

function scopedDepartment(
  profile: CurrentProfile,
  requestedDepartmentId: string | null
) {
  return isAdminScope(profile) ? requestedDepartmentId : profile.departmentId
}

function scopedStockLocation(
  profile: CurrentProfile,
  requestedStockLocationId: string | null
) {
  if (isAdminScope(profile)) {
    return requestedStockLocationId ?? profile.stockLocationId
  }

  if (
    requestedStockLocationId &&
    profile.stockLocationId &&
    requestedStockLocationId !== profile.stockLocationId
  ) {
    throw new Error("This stock location is outside your assigned scope.")
  }

  return profile.stockLocationId ?? requestedStockLocationId
}

function canUseWorkScope(
  profile: CurrentProfile,
  outletId: string | null,
  departmentId: string | null
) {
  return (
    isAdminScope(profile) ||
    (outletId === null && departmentId === null) ||
    (outletId !== null && outletId === profile.outletId) ||
    (departmentId !== null && departmentId === profile.departmentId)
  )
}

async function getActionContext(roles: UserRole[]) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: "Sign in before changing retail records." }
  }

  if (!hasAnyRole(profile, roles)) {
    return { error: "Your role does not allow this retail action." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { profile, demoMode: true }
  }

  return { profile, supabase, demoMode: false }
}

function revalidateRetailPaths() {
  [
    "/retail",
    "/retail/dashboard",
    "/retail/pos",
    "/retail/sales",
    "/retail/payments",
    "/retail/cash",
    "/retail/cash-closing",
    "/retail/prices",
    "/retail/processing",
    "/retail/cleaning",
    "/retail/expenses",
  ].forEach((path) => revalidatePath(path))
}

async function runRetailAction(
  formData: FormData,
  roles: UserRole[],
  callback: (context: RetailActionContext, formData: FormData) => Promise<string>
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
    revalidateRetailPaths()
    return success(message)
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Action failed.")
  }
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

async function ensureSale(supabase: SupabaseServerClient, saleId: string) {
  const { data, error } = await supabase
    .from("retail_sales")
    .select("*")
    .eq("id", saleId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const sale = asRecord(data)

  if (!sale.id) {
    throw new Error("Retail sale was not found.")
  }

  return sale
}

async function ensureCashSession(
  supabase: SupabaseServerClient,
  sessionId: string
) {
  const { data, error } = await supabase
    .from("retail_cash_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const session = asRecord(data)

  if (!session.id) {
    throw new Error("Cash session was not found.")
  }

  return session
}

async function addExpectedCash(
  supabase: SupabaseServerClient,
  sessionId: string | null,
  amount: number
) {
  if (!sessionId || amount <= 0) {
    return
  }

  const session = await ensureCashSession(supabase, sessionId)

  if (readString(session.status) !== "OPEN") {
    return
  }

  const expectedCash = readNumber(session.expected_cash) + amount
  const { error } = await supabase
    .from("retail_cash_sessions")
    .update({ expected_cash: expectedCash })
    .eq("id", sessionId)

  if (error) {
    throw new Error(error.message)
  }
}

async function loadStockUnit(supabase: SupabaseServerClient, stockUnitId: string) {
  const { data, error } = await supabase
    .from("stock_units")
    .select("id, barcode, item_id, brand_id, origin_id, location_id, status, net_weight_kg")
    .eq("id", stockUnitId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const stockUnit = asRecord(data)

  if (!stockUnit.id) {
    throw new Error("Barcode stock unit was not found.")
  }

  if (readString(stockUnit.status) !== "IN_STOCK") {
    throw new Error("Barcode stock unit is not available for sale.")
  }

  return stockUnit
}

async function loadNoBarcodeStock(
  supabase: SupabaseServerClient,
  noBarcodeStockId: string
) {
  const { data, error } = await supabase
    .from("no_barcode_stock")
    .select("id, item_id, brand_id, origin_id, location_id, quantity, weight_kg")
    .eq("id", noBarcodeStockId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const stock = asRecord(data)

  if (!stock.id) {
    throw new Error("No-barcode stock row was not found.")
  }

  return stock
}

async function consumeProcessingRawStock(
  supabase: SupabaseServerClient,
  profile: CurrentProfile,
  batchNo: string,
  parsed: z.infer<typeof processingBatchSchema>,
  stockLocationId: string
) {
  let query = supabase
    .from("no_barcode_stock")
    .select("id, quantity, weight_kg")
    .eq("item_id", parsed.rawItemId)
    .eq("location_id", stockLocationId)

  query = parsed.rawBrandId
    ? query.eq("brand_id", parsed.rawBrandId)
    : query.is("brand_id", null)
  query = parsed.rawOriginId
    ? query.eq("origin_id", parsed.rawOriginId)
    : query.is("origin_id", null)

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const stock = asRecord(data)

  if (!stock.id) {
    throw new Error("Raw material is not available in loose stock for this location.")
  }

  const availableQuantity = readNumber(stock.quantity)
  const availableWeightKg = readNumber(stock.weight_kg)

  if (parsed.rawQuantity > availableQuantity) {
    throw new Error("Raw material quantity exceeds available loose stock.")
  }

  if (parsed.rawWeightKg > availableWeightKg) {
    throw new Error("Raw material weight exceeds available loose stock.")
  }

  const remainingQuantity = availableQuantity - parsed.rawQuantity
  const remainingWeightKg = availableWeightKg - parsed.rawWeightKg

  const { error: updateError } = await supabase
    .from("no_barcode_stock")
    .update({
      quantity: remainingQuantity,
      weight_kg: remainingWeightKg,
    })
    .eq("id", readString(stock.id))

  if (updateError) {
    throw new Error(updateError.message)
  }

  const movementNotes = `Processing raw material consumed for ${batchNo}. Finished goods enter stock only after barcode inbound.`

  const { error: noBarcodeMovementError } = await supabase
    .from("no_barcode_movements")
    .insert({
      movement_type: "NO_BARCODE_OUTBOUND",
      item_id: parsed.rawItemId,
      brand_id: parsed.rawBrandId,
      origin_id: parsed.rawOriginId,
      location_id: stockLocationId,
      quantity_delta: -parsed.rawQuantity,
      weight_delta_kg: -parsed.rawWeightKg,
      reference_no: batchNo,
      notes: movementNotes,
      created_by: profile.id,
    })

  if (noBarcodeMovementError) {
    throw new Error(noBarcodeMovementError.message)
  }

  const { error: stockMovementError } = await supabase
    .from("stock_movements")
    .insert({
      movement_type: "NO_BARCODE_OUTBOUND",
      item_id: parsed.rawItemId,
      from_location_id: stockLocationId,
      quantity: parsed.rawQuantity,
      weight_kg: parsed.rawWeightKg,
      reference_no: batchNo,
      source_type: "processing",
      notes: movementNotes,
      created_by: profile.id,
    })

  if (stockMovementError) {
    throw new Error(stockMovementError.message)
  }
}

function paymentStatus(totalAmount: number, paymentAmount: number) {
  if (paymentAmount >= totalAmount && totalAmount > 0) {
    return "PAID"
  }

  if (paymentAmount > 0) {
    return "PARTIAL"
  }

  return "UNPAID"
}

async function closeSessionExpectedCash(
  supabase: SupabaseServerClient,
  sessionId: string,
  openingFloat: number
) {
  const { data: saleData, error: saleError } = await supabase
    .from("retail_sales")
    .select("id")
    .eq("cash_session_id", sessionId)

  if (saleError) {
    throw new Error(saleError.message)
  }

  const saleIds = asRecordArray(saleData)
    .map((row) => readString(row.id))
    .filter(Boolean)

  if (saleIds.length === 0) {
    return openingFloat
  }

  const { data: paymentData, error: paymentError } = await supabase
    .from("retail_payments")
    .select("amount, payment_method, payment_status")
    .in("sale_id", saleIds)

  if (paymentError) {
    throw new Error(paymentError.message)
  }

  const cashPayments = asRecordArray(paymentData)
    .filter(
      (row) =>
        readString(row.payment_method) === "CASH" &&
        readString(row.payment_status) === "PAID"
    )
    .reduce((sum, row) => sum + readNumber(row.amount), 0)

  return openingFloat + cashPayments
}

export async function createRetailSaleAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(createSaleSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailOperatorRoles, async (context) => {
    let itemId = parsed.itemId
    let brandId = parsed.brandId
    let originId = parsed.originId
    let stockLocationId = parsed.stockLocationId
    let barcode = parsed.barcode
    let quantity = parsed.quantity
    let weightKg = parsed.weightKg
    let stockUnit: Record<string, unknown> | null = null
    let noBarcodeStock: Record<string, unknown> | null = null

    if (parsed.stockUnitId) {
      stockUnit = await loadStockUnit(context.supabase, parsed.stockUnitId)
      itemId = readString(stockUnit.item_id)
      brandId = readNullableString(stockUnit.brand_id)
      originId = readNullableString(stockUnit.origin_id)
      stockLocationId = readString(stockUnit.location_id)
      barcode = readString(stockUnit.barcode)
      quantity = 1
      weightKg = parsed.weightKg > 0 ? parsed.weightKg : readNumber(stockUnit.net_weight_kg)
    }

    if (parsed.noBarcodeStockId) {
      noBarcodeStock = await loadNoBarcodeStock(
        context.supabase,
        parsed.noBarcodeStockId
      )
      const availableQuantity = readNumber(noBarcodeStock.quantity)
      const availableWeight = readNumber(noBarcodeStock.weight_kg)

      if (availableQuantity < quantity) {
        throw new Error("No-barcode quantity is not enough for this sale.")
      }

      if (weightKg > 0 && availableWeight < weightKg) {
        throw new Error("No-barcode weight is not enough for this sale.")
      }

      itemId = readString(noBarcodeStock.item_id)
      brandId = readNullableString(noBarcodeStock.brand_id)
      originId = readNullableString(noBarcodeStock.origin_id)
      stockLocationId = readString(noBarcodeStock.location_id)
    }

    const subtotalAmount = Math.max(quantity * parsed.unitPrice - parsed.lineDiscount, 0)
    const totalAmount = Math.max(
      subtotalAmount - parsed.discountAmount + parsed.taxAmount,
      0
    )
    const computedPaymentStatus = paymentStatus(totalAmount, parsed.paymentAmount)
    const changeAmount = Math.max(parsed.paymentAmount - totalAmount, 0)
    const saleNo = `RS-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now().toString().slice(-5)}`

    const { data, error } = await context.supabase
      .from("retail_sales")
      .insert({
        sale_no: saleNo,
        register_id: parsed.registerId,
        cash_session_id: parsed.cashSessionId,
        customer_name: parsed.customerName,
        customer_phone: parsed.customerPhone,
        status: "COMPLETED",
        payment_status: computedPaymentStatus,
        subtotal_amount: subtotalAmount,
        discount_amount: parsed.discountAmount,
        tax_amount: parsed.taxAmount,
        total_amount: totalAmount,
        paid_amount: parsed.paymentAmount,
        change_amount: changeAmount,
        sold_by: context.profile.id,
        completed_at: new Date().toISOString(),
        notes: parsed.notes,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const saleId = String(asRecord(data).id ?? "")
    const { error: lineError } = await context.supabase
      .from("retail_sale_lines")
      .insert({
        sale_id: saleId,
        item_id: itemId,
        brand_id: brandId,
        origin_id: originId,
        stock_location_id: stockLocationId,
        stock_unit_id: parsed.stockUnitId,
        no_barcode_stock_id: parsed.noBarcodeStockId,
        barcode,
        quantity,
        weight_kg: weightKg,
        unit_price: parsed.unitPrice,
        line_discount: parsed.lineDiscount,
        notes: parsed.notes,
      })

    if (lineError) {
      throw new Error(lineError.message)
    }

    if (stockUnit && parsed.stockUnitId) {
      const { error: stockUpdateError } = await context.supabase
        .from("stock_units")
        .update({ status: "SOLD", sold_at: new Date().toISOString() })
        .eq("id", parsed.stockUnitId)
        .eq("status", "IN_STOCK")

      if (stockUpdateError) {
        throw new Error(stockUpdateError.message)
      }

      const { error: movementError } = await context.supabase
        .from("stock_movements")
        .insert({
          movement_type: "OUTBOUND_SALES",
          item_id: itemId,
          stock_unit_id: parsed.stockUnitId,
          barcode,
          from_location_id: stockLocationId,
          quantity,
          weight_kg: weightKg,
          reference_no: saleNo,
          notes: "Retail POS sale",
          created_by: context.profile.id,
        })

      if (movementError) {
        throw new Error(movementError.message)
      }
    }

    if (noBarcodeStock && parsed.noBarcodeStockId) {
      const nextQuantity = readNumber(noBarcodeStock.quantity) - quantity
      const nextWeight = readNumber(noBarcodeStock.weight_kg) - weightKg
      const { error: noBarcodeUpdateError } = await context.supabase
        .from("no_barcode_stock")
        .update({
          quantity: nextQuantity,
          weight_kg: Math.max(nextWeight, 0),
        })
        .eq("id", parsed.noBarcodeStockId)

      if (noBarcodeUpdateError) {
        throw new Error(noBarcodeUpdateError.message)
      }

      const { error: noBarcodeMovementError } = await context.supabase
        .from("no_barcode_movements")
        .insert({
          movement_type: "NO_BARCODE_OUTBOUND",
          item_id: itemId,
          brand_id: brandId,
          origin_id: originId,
          location_id: stockLocationId,
          quantity_delta: -quantity,
          weight_delta_kg: -weightKg,
          reference_no: saleNo,
          notes: "Retail POS sale",
          created_by: context.profile.id,
        })

      if (noBarcodeMovementError) {
        throw new Error(noBarcodeMovementError.message)
      }
    }

    if (parsed.paymentAmount > 0) {
      const { error: paymentError } = await context.supabase
        .from("retail_payments")
        .insert({
          sale_id: saleId,
          payment_method: parsed.paymentMethod,
          payment_status: computedPaymentStatus,
          amount: parsed.paymentAmount,
          reference_no: parsed.referenceNo,
          received_by: context.profile.id,
          notes: parsed.notes,
        })

      if (paymentError) {
        throw new Error(paymentError.message)
      }

      if (parsed.paymentMethod === "CASH") {
        await addExpectedCash(
          context.supabase,
          parsed.cashSessionId,
          parsed.paymentAmount
        )
      }
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_SALE_CREATED",
      "retail_sales",
      saleId,
      { ...parsed, saleNo, subtotalAmount, totalAmount }
    )

    return `Retail sale ${saleNo} completed.`
  })
}

export async function recordRetailPaymentAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(paymentSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailPaymentRoles, async (context) => {
    const sale = await ensureSale(context.supabase, parsed.saleId)
    assertRetailSameDay(context.profile, sale.created_at, "record payments for")

    const { data, error } = await context.supabase
      .from("retail_payments")
      .insert({
        sale_id: parsed.saleId,
        payment_method: parsed.paymentMethod,
        payment_status: parsed.paymentStatus,
        amount: parsed.amount,
        reference_no: parsed.referenceNo,
        received_by: context.profile.id,
        notes: parsed.notes,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const totalAmount = readNumber(sale.total_amount)
    const paidAmount = readNumber(sale.paid_amount) + parsed.amount
    const nextPaymentStatus = paymentStatus(totalAmount, paidAmount)
    const { error: saleError } = await context.supabase
      .from("retail_sales")
      .update({
        paid_amount: paidAmount,
        payment_status: nextPaymentStatus,
        change_amount: Math.max(paidAmount - totalAmount, 0),
      })
      .eq("id", parsed.saleId)

    if (saleError) {
      throw new Error(saleError.message)
    }

    if (parsed.paymentMethod === "CASH" && parsed.paymentStatus === "PAID") {
      await addExpectedCash(
        context.supabase,
        readNullableString(sale.cash_session_id),
        parsed.amount
      )
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_PAYMENT_RECORDED",
      "retail_payments",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Retail payment recorded."
  })
}

export async function openRetailCashSessionAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(openCashSessionSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailOperatorRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("retail_cash_sessions")
      .insert({
        register_id: parsed.registerId,
        status: "OPEN",
        opening_float: parsed.openingFloat,
        expected_cash: parsed.openingFloat,
        opened_by: context.profile.id,
        notes: parsed.notes,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_CASH_SESSION_OPENED",
      "retail_cash_sessions",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Cash session opened."
  })
}

export async function closeRetailCashSessionAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(closeCashSessionSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailOperatorRoles, async (context) => {
    const session = await ensureCashSession(context.supabase, parsed.sessionId)
    assertRetailSameDay(context.profile, session.opened_at, "close")

    if (readString(session.status) !== "OPEN") {
      throw new Error("Only open cash sessions can be closed.")
    }

    const expectedCash = await closeSessionExpectedCash(
      context.supabase,
      parsed.sessionId,
      readNumber(session.opening_float)
    )
    const { error } = await context.supabase
      .from("retail_cash_sessions")
      .update({
        status: "CLOSED",
        expected_cash: expectedCash,
        closing_cash: parsed.closingCash,
        closed_by: context.profile.id,
        closed_at: new Date().toISOString(),
        notes: parsed.notes,
      })
      .eq("id", parsed.sessionId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_CASH_SESSION_CLOSED",
      "retail_cash_sessions",
      parsed.sessionId,
      { ...parsed, expectedCash }
    )

    return "Cash session closed."
  })
}

export async function recordRetailDailySaleAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(dailySaleSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailOperatorRoles, async (context) => {
    assertRetailSameDay(context.profile, parsed.salesDate, "record")

    const outletId = scopedOutlet(context.profile, parsed.outletId)

    if (!outletId) {
      throw new Error("Your profile needs an outlet before recording daily sales.")
    }

    const { data: paymentType } = await context.supabase
      .from("retail_payment_types")
      .select("id")
      .eq("code", parsed.paymentCode)
      .maybeSingle()

    const { data, error } = await context.supabase
      .from("retail_daily_sales")
      .upsert(
        {
          outlet_id: outletId,
          sales_date: parsed.salesDate,
          payment_type_id: readNullableString(asRecord(paymentType).id),
          payment_code: parsed.paymentCode,
          gross_sales: parsed.grossSales,
          discount_amount: parsed.discountAmount,
          cash_received: parsed.cashReceived,
          notes: parsed.notes,
          recorded_by: context.profile.id,
        },
        { onConflict: "outlet_id,sales_date,payment_code" }
      )
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_DAILY_SALE_RECORDED",
      "retail_daily_sales",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Daily sales saved."
  })
}

export async function submitRetailDailyClosingAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(dailyClosingSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  const approving = parsed.status === "APPROVED" || parsed.status === "REJECTED"
  const roles = approving ? retailAdminRoles : retailOperatorRoles

  return runRetailAction(formData, roles, async (context) => {
    assertRetailSameDay(context.profile, parsed.closingDate, "submit or approve")

    const outletId = scopedOutlet(context.profile, parsed.outletId)

    if (!outletId) {
      throw new Error("Your profile needs an outlet before submitting daily closing.")
    }

    if (approving) {
      const { data: existing, error: existingError } = await context.supabase
        .from("retail_daily_closings")
        .select("id, status, submitted_by")
        .eq("outlet_id", outletId)
        .eq("closing_date", parsed.closingDate)
        .maybeSingle()

      if (existingError) {
        throw new Error(existingError.message)
      }

      const record = asRecord(existing)

      if (!record.id) {
        throw new Error("Submit the daily closing before checking it.")
      }

      if (readString(record.status) !== "SUBMITTED") {
        throw new Error("Only submitted daily closings can be checked.")
      }

      if (readNullableString(record.submitted_by) === context.profile.id) {
        throw new Error("Daily closing must be checked by a different manager.")
      }

      const { error } = await context.supabase
        .from("retail_daily_closings")
        .update({
          status: parsed.status,
          approved_by: context.profile.id,
          approved_at: new Date().toISOString(),
          notes: parsed.notes,
        })
        .eq("id", readString(record.id))

      if (error) {
        throw new Error(error.message)
      }

      await insertAuditLog(
        context.supabase,
        context.profile,
        "RETAIL_DAILY_CLOSING_CHECKED",
        "retail_daily_closings",
        readString(record.id),
        parsed
      )

      return "Daily closing checked."
    }

    const { data, error } = await context.supabase
      .from("retail_daily_closings")
      .upsert(
        {
          outlet_id: outletId,
          closing_date: parsed.closingDate,
          total_sales: parsed.totalSales,
          cash_received: parsed.cashReceived,
          expenses_amount: parsed.expensesAmount,
          closing_cash: parsed.closingCash,
          variance_amount: parsed.varianceAmount,
          status: parsed.status,
          submitted_by: context.profile.id,
          submitted_at: new Date().toISOString(),
          approved_by: null,
          approved_at: null,
          notes: parsed.notes,
        },
        { onConflict: "outlet_id,closing_date" }
      )
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_DAILY_CLOSING_SAVED",
      "retail_daily_closings",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Daily closing saved."
  })
}

export async function upsertRetailPriceRuleAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(priceRuleSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailDirectorRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("retail_price_rules")
      .upsert(
        {
          item_id: parsed.itemId,
          brand_id: parsed.brandId,
          origin_id: parsed.originId,
          outlet_id: parsed.outletId,
          unit_price: parsed.unitPrice,
          effective_from: parsed.effectiveFrom,
          effective_to: parsed.effectiveTo,
          is_active: true,
          created_by: context.profile.id,
        },
        {
          onConflict: "item_id,brand_id,origin_id,outlet_id,effective_from",
        }
      )
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_PRICE_RULE_SAVED",
      "retail_price_rules",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Retail price saved."
  })
}

export async function createRetailProcessingBatchAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(processingBatchSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, processingOperatorRoles, async (context) => {
    const stockLocationId = scopedStockLocation(
      context.profile,
      parsed.stockLocationId
    )

    if (!stockLocationId) {
      throw new Error("Your profile needs a stock location before processing stock.")
    }

    const batchNo = `RP-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now().toString().slice(-5)}`

    await consumeProcessingRawStock(
      context.supabase,
      context.profile,
      batchNo,
      parsed,
      stockLocationId
    )

    const { data, error } = await context.supabase
      .from("retail_processing_batches")
      .insert({
        batch_no: batchNo,
        outlet_id: scopedOutlet(context.profile, parsed.outletId),
        department_id: scopedDepartment(context.profile, null),
        stock_location_id: stockLocationId,
        raw_item_id: parsed.rawItemId,
        raw_brand_id: parsed.rawBrandId,
        raw_origin_id: parsed.rawOriginId,
        raw_quantity: parsed.rawQuantity,
        raw_weight_kg: parsed.rawWeightKg,
        finished_item_id: parsed.finishedItemId,
        finished_brand_id: parsed.finishedBrandId,
        finished_origin_id: parsed.finishedOriginId,
        finished_quantity: parsed.finishedQuantity,
        finished_weight_kg: parsed.finishedWeightKg,
        status: parsed.status,
        processed_by: context.profile.id,
        processed_at: new Date().toISOString(),
        notes: parsed.notes,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_PROCESSING_BATCH_CREATED",
      "retail_processing_batches",
      String(asRecord(data).id ?? ""),
      { ...parsed, batchNo }
    )

    return `Processing batch ${batchNo} saved.`
  })
}

export async function reviewRetailProcessingBatchAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(processingReviewSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, processingReviewRoles, async (context) => {
    const { error } = await context.supabase
      .from("retail_processing_batches")
      .update({
        status: parsed.status,
        reviewed_by: context.profile.id,
        reviewed_at: new Date().toISOString(),
        notes: parsed.notes,
      })
      .eq("id", parsed.batchId)
      .eq("status", "COMPLETED")

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_PROCESSING_BATCH_REVIEWED",
      "retail_processing_batches",
      parsed.batchId,
      parsed
    )

    return "Processing batch reviewed."
  })
}

export async function createRetailCleaningTaskAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(cleaningTaskSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, cleaningManagerRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("retail_cleaning_tasks")
      .insert({
        outlet_id: scopedOutlet(context.profile, parsed.outletId),
        department_id: scopedDepartment(context.profile, parsed.departmentId),
        task_name: parsed.taskName,
        frequency: parsed.frequency,
        due_date: parsed.dueDate,
        status: "PENDING",
        assigned_to: parsed.assignedTo,
        notes: parsed.notes,
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
      "RETAIL_CLEANING_TASK_CREATED",
      "retail_cleaning_tasks",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Cleaning task saved."
  })
}

export async function completeRetailCleaningTaskAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(completeCleaningTaskSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, cleaningCompletionRoles, async (context) => {
    const { data: task, error: taskError } = await context.supabase
      .from("retail_cleaning_tasks")
      .select("id, outlet_id, department_id, status")
      .eq("id", parsed.taskId)
      .maybeSingle()

    if (taskError) {
      throw new Error(taskError.message)
    }

    if (!task) {
      throw new Error("Cleaning task not found.")
    }

    const taskRecord = asRecord(task)
    const outletId = readNullableString(taskRecord.outlet_id)
    const departmentId = readNullableString(taskRecord.department_id)

    if (!canUseWorkScope(context.profile, outletId, departmentId)) {
      throw new Error("This cleaning task is outside your assigned outlet or department.")
    }

    const done = parsed.status === "DONE"
    const { error } = await context.supabase
      .from("retail_cleaning_tasks")
      .update({
        status: parsed.status,
        completed_by: done ? context.profile.id : null,
        completed_at: done ? new Date().toISOString() : null,
        notes: parsed.notes,
      })
      .eq("id", parsed.taskId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_CLEANING_TASK_UPDATED",
      "retail_cleaning_tasks",
      parsed.taskId,
      parsed
    )

    return "Cleaning task updated."
  })
}

export async function createRetailExpenseAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(expenseSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailPaymentRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("retail_expenses")
      .insert({
        outlet_id: scopedOutlet(context.profile, parsed.outletId),
        expense_date: parsed.expenseDate,
        category: parsed.category,
        vendor: parsed.vendor,
        amount: parsed.amount,
        payment_method: parsed.paymentMethod,
        status: "SUBMITTED",
        receipt_url: parsed.receiptUrl,
        submitted_by: context.profile.id,
        notes: parsed.notes,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_EXPENSE_SUBMITTED",
      "retail_expenses",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Retail expense submitted."
  })
}

export async function updateRetailExpenseStatusAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(expenseStatusSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  const roles =
    parsed.status === "PAID"
      ? retailExpensePaymentRoles
      : parsed.status === "APPROVED"
        ? retailDirectorRoles
        : retailExpenseReviewRoles

  return runRetailAction(formData, roles, async (context) => {
    const now = new Date().toISOString()
    const { data: existing, error: existingError } = await context.supabase
      .from("retail_expenses")
      .select("id, outlet_id, status, submitted_by, reviewed_by")
      .eq("id", parsed.expenseId)
      .maybeSingle()

    if (existingError) {
      throw new Error(existingError.message)
    }

    const record = asRecord(existing)

    if (!record.id) {
      throw new Error("Retail expense not found.")
    }

    const outletId = readNullableString(record.outlet_id)

    if (!canUseWorkScope(context.profile, outletId, null)) {
      throw new Error("This expense is outside your assigned outlet.")
    }

    const currentStatus = readString(record.status)
    const submittedBy = readNullableString(record.submitted_by)

    const checkerDecision =
      parsed.status === "REVIEWED" ||
      (parsed.status === "REJECTED" && currentStatus === "SUBMITTED")
    const approverDecision =
      parsed.status === "APPROVED" ||
      (parsed.status === "REJECTED" && currentStatus === "REVIEWED")

    if (checkerDecision && currentStatus !== "SUBMITTED") {
      throw new Error("Only submitted expenses can be checked.")
    }

    if (checkerDecision && submittedBy === context.profile.id) {
      throw new Error("Expense must be checked by a different manager.")
    }

    if (approverDecision && currentStatus !== "REVIEWED") {
      throw new Error("Only reviewed expenses can be approved or rejected.")
    }

    if (approverDecision && !isAdminScope(context.profile)) {
      throw new Error("Only admin or director can approve or reject reviewed expenses.")
    }

    if (parsed.status === "APPROVED" && currentStatus !== "REVIEWED") {
      throw new Error("Only reviewed expenses can be approved.")
    }

    if (parsed.status === "PAID" && currentStatus !== "APPROVED") {
      throw new Error("Only approved expenses can be marked paid.")
    }

    const updatePayload =
      parsed.status === "PAID"
        ? {
            status: parsed.status,
            paid_by: context.profile.id,
            paid_at: now,
            notes: parsed.notes,
          }
        : parsed.status === "APPROVED"
          ? {
              status: parsed.status,
              approved_by: context.profile.id,
              notes: parsed.notes,
            }
          : approverDecision
            ? {
                status: parsed.status,
                approved_by: context.profile.id,
                notes: parsed.notes,
              }
          : {
              status: parsed.status,
              reviewed_by: context.profile.id,
              notes: parsed.notes,
            }

    const { error } = await context.supabase
      .from("retail_expenses")
      .update(updatePayload)
      .eq("id", parsed.expenseId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_EXPENSE_STATUS_UPDATED",
      "retail_expenses",
      parsed.expenseId,
      parsed
    )

    return "Retail expense status updated."
  })
}
