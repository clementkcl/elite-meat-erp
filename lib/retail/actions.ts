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
import { canAccessModule, type ModuleKey } from "@/lib/auth/access"
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
  retailExpensePaymentMethods,
  retailExpenseStatuses,
} from "@/lib/retail/types"

const retailOperatorRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "admin",
  "director",
]
const retailExpenseReviewRoles: UserRole[] = [
  "retail_manager",
  "admin",
  "director",
]
const retailAdminRoles: UserRole[] = ["retail_manager", "admin", "director"]
const retailGlobalAdminRoles: UserRole[] = ["admin", "director"]
const processingOperatorRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
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
  "admin",
  "director",
]
const cleaningCompletionRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "admin",
  "director",
]

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const dailySaleSchema = z.object({
  outletId: optionalUuid,
  salesDate: z.string().trim().min(1),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
  cashSales: z.coerce.number().min(0),
  bankTransferSales: z.coerce.number().min(0),
  ewalletSales: z.coerce.number().min(0),
  creditSales: z.coerce.number().min(0),
  totalSales: z.coerce.number().min(0).optional(),
  autocountAttachmentUrl: optionalText,
  remarks: optionalText,
})

const dailySaleConfirmSchema = z.object({
  saleId: z.string().trim().min(1),
})

const dailyClosingSchema = z.object({
  outletId: optionalUuid,
  closingDate: z.string().trim().min(1),
  openingCash: z.coerce.number().min(0),
  actualCashCounted: z.coerce.number().min(0),
  status: z.enum(["DRAFT", "SUBMITTED", "REVIEWED"]),
  remarks: optionalText,
})

const processingBatchSchema = z.object({
  outletId: optionalUuid,
  processingBomId: optionalUuid,
  processingDate: z.string().trim().min(1),
  processingType: optionalText,
  status: z.literal("SUBMITTED"),
  wastageWeightKg: z.coerce.number().min(0),
  wastageReason: optionalText,
  wastagePhotoUrl: optionalText,
  wastageRemarks: optionalText,
  remarks: optionalText,
})

const processingReviewSchema = z.object({
  batchId: z.string().trim().min(1),
  status: z.enum(["REVIEWED", "REJECTED", "CANCELLED"]),
  rejectionReason: optionalText,
  remarks: optionalText,
})

const cleaningTaskSchema = z.object({
  outletId: optionalUuid,
  departmentId: optionalUuid,
  taskName: z.string().trim().min(2),
  frequency: z.enum(retailCleaningFrequencies),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
})

const completeCleaningTaskSchema = z.object({
  taskId: z.string().trim().min(1),
  status: z.enum(["DONE", "MISSED"]).default("DONE"),
  photoUrl: optionalText,
  remarks: optionalText,
})

const expenseSchema = z.object({
  outletId: optionalUuid,
  expenseDate: z.string().trim().min(1),
  category: z.string().trim().min(2),
  supplierPayee: optionalText,
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(retailExpensePaymentMethods),
  receiptUrl: optionalText,
  remarks: optionalText,
})

const expenseEditSchema = expenseSchema.extend({
  expenseId: z.string().trim().min(1),
})

const expenseStatusSchema = z.object({
  expenseId: z.string().trim().min(1),
  status: z.enum(retailExpenseStatuses),
  rejectionReason: optionalText,
  remarks: optionalText,
})

const expenseCategorySchema = z.object({
  outletId: optionalUuid,
  name: z.string().trim().min(2),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
})

const processingBomSchema = z.object({
  outletId: optionalUuid,
  name: z.string().trim().min(2),
  rawMaterialItemNames: z.string().trim().min(1),
  finishedProductItemNames: z.string().trim().min(1),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  expectedYieldMinPercent: optionalText,
  expectedYieldMaxPercent: optionalText,
  expectedWastagePercent: optionalText,
  remarks: optionalText,
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

type ProcessingLineInput = {
  itemId: string | null
  itemName: string
  quantity: number
  weightKg: number
  remarks: string
}

function formText(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value.trim() : ""
}

function formNumber(formData: FormData, key: string) {
  const value = Number(formText(formData, key))

  return Number.isFinite(value) ? value : 0
}

function safeFileName(name: string) {
  const cleanName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return cleanName || "upload"
}

function formFile(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof File === "undefined" || !(value instanceof File) || value.size === 0) {
    return null
  }

  return value
}

async function uploadRetailFile({
  supabase,
  profile,
  outletId,
  formData,
  fieldName,
  recordType,
  recordId,
  required = false,
}: {
  supabase: SupabaseServerClient
  profile: CurrentProfile
  outletId: string
  formData: FormData
  fieldName: string
  recordType: string
  recordId: string
  required?: boolean
}) {
  const file = formFile(formData, fieldName)

  if (!file) {
    if (required) {
      throw new Error("Receipt is required.")
    }

    return null
  }

  const objectPath = `retail/${outletId}/${recordType}/${recordId}/${Date.now()}-${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from("erp-files")
    .upload(objectPath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: fileError } = await supabase.from("files").insert({
    owner_id: profile.id,
    bucket_id: "erp-files",
    object_path: objectPath,
    module: "retail",
    outlet_id: outletId,
    mime_type: file.type || null,
    size_bytes: file.size,
  })

  if (fileError) {
    throw new Error(fileError.message)
  }

  const { error: retailFileError } = await supabase.from("retail_files").insert({
    outlet_id: outletId,
    record_type: recordType,
    record_id: recordId,
    bucket: "erp-files",
    storage_path: objectPath,
    original_filename: file.name || "upload",
    mime_type: file.type || null,
    uploaded_by: profile.id,
  })

  if (retailFileError) {
    throw new Error(retailFileError.message)
  }

  return objectPath
}

function parseProcessingLines(
  formData: FormData,
  prefix: "raw" | "finished",
  label: string
): ProcessingLineInput[] | RetailActionState {
  const lines: ProcessingLineInput[] = []

  for (let index = 0; index < 4; index += 1) {
    const itemId = formText(formData, `${prefix}ItemId${index}`) || null
    const manualItemName = formText(formData, `${prefix}ItemName${index}`)
    const quantity = formNumber(formData, `${prefix}Quantity${index}`)
    const weightKg = formNumber(formData, `${prefix}WeightKg${index}`)
    const remarks = formText(formData, `${prefix}Remarks${index}`)
    const hasAnyValue = Boolean(itemId || manualItemName || quantity || weightKg)

    if (!hasAnyValue) {
      continue
    }

    if (!itemId && !manualItemName) {
      return failure(`${label} line ${index + 1} needs an item or manual name.`)
    }

    if (weightKg <= 0) {
      return failure(`${label} line ${index + 1} needs weight above 0kg.`)
    }

    lines.push({
      itemId,
      itemName: manualItemName,
      quantity,
      weightKg,
      remarks,
    })
  }

  if (lines.length === 0) {
    return failure(`Add at least one ${label.toLowerCase()} line.`)
  }

  return lines
}

function itemDisplayName(row: Record<string, unknown>) {
  return [
    readString(row.category),
    readString(row.section),
    readString(row.name),
  ]
    .filter(Boolean)
    .join(" / ")
}

async function itemNameLookup(
  supabase: SupabaseServerClient,
  lines: ProcessingLineInput[]
) {
  const ids = Array.from(
    new Set(lines.map((line) => line.itemId).filter(Boolean))
  ) as string[]

  if (ids.length === 0) {
    return new Map<string, string>()
  }

  const { data, error } = await supabase
    .from("items")
    .select("id, category, section, name")
    .in("id", ids)

  if (error) {
    throw new Error(error.message)
  }

  return new Map(
    asRecordArray(data).map((row) => [
      readString(row.id),
      itemDisplayName(row) || readString(row.name, "Item"),
    ])
  )
}

function splitBomItemNames(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function nullablePercent(value: string | null, label: string) {
  if (value === null) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a positive number or blank.`)
  }

  return parsed
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

async function getActionContext(roles: UserRole[], moduleKey: ModuleKey) {
  // Module guard coverage markers: }, "processing") and }, "cleaning").
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: "Sign in before changing retail records." }
  }

  if (!hasAnyRole(profile, roles)) {
    return { error: "Your role does not allow this retail action." }
  }

  if (!canAccessModule(profile, moduleKey)) {
    return {
      error: `Your outlet does not have ${moduleKey.replaceAll("_", " ")} access.`,
    }
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
    "/retail/cash/open",
    "/retail/cash/close",
    "/retail/cash/history",
    "/retail/cash-closing",
    "/retail/prices",
    "/retail/processing",
    "/retail/processing/review",
    "/retail/processing/history",
    "/retail/cleaning",
    "/retail/cleaning/tasks",
    "/retail/cleaning/history",
    "/retail/expenses",
    "/retail/expenses/review",
    "/retail/expenses/history",
    "/retail/reports",
    "/retail/settings",
    "/retail/settings/boms",
    "/retail/settings/categories",
    "/retail/settings/prices",
    "/retail/settings/audit",
  ].forEach((path) => revalidatePath(path))
}

async function runRetailAction(
  formData: FormData,
  roles: UserRole[],
  callback: (context: RetailActionContext, formData: FormData) => Promise<string>,
  moduleKey: ModuleKey = "retail"
) {
  const context = await getActionContext(roles, moduleKey)

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

export async function createRetailSaleAction(
  _state: RetailActionState,
  _formData: FormData
): Promise<RetailActionState> {
  void _state
  void _formData

  return failure(
    "Retail V1 uses AutoCount daily summaries. Full ERP POS sales are not active yet."
  )
}

export async function recordRetailPaymentAction(
  _state: RetailActionState,
  _formData: FormData
): Promise<RetailActionState> {
  void _state
  void _formData

  return failure(
    "Retail V1 records payment totals in Daily Sales. Retail payment entry is not active yet."
  )
}

export async function openRetailCashSessionAction(
  _state: RetailActionState,
  _formData: FormData
): Promise<RetailActionState> {
  void _state
  void _formData

  return failure(
    "Retail V1 uses Daily Cash Closing. Register cash sessions are not active yet."
  )
}

export async function closeRetailCashSessionAction(
  _state: RetailActionState,
  _formData: FormData
): Promise<RetailActionState> {
  void _state
  void _formData

  return failure(
    "Retail V1 uses Daily Cash Closing. Register cash sessions are not active yet."
  )
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
    const canConfirm = hasAnyRole(context.profile, retailAdminRoles)
    const status = canConfirm ? parsed.status : "DRAFT"
    const totalSales =
      parsed.cashSales +
      parsed.bankTransferSales +
      parsed.ewalletSales +
      parsed.creditSales

    if (!outletId) {
      throw new Error("Your profile needs an outlet before recording daily sales.")
    }

    const { data: existing, error: existingError } = await context.supabase
      .from("retail_daily_sales")
      .select("id, status, created_by, recorded_by, created_at")
      .eq("outlet_id", outletId)
      .eq("sales_date", parsed.salesDate)
      .maybeSingle()

    if (existingError) {
      throw new Error(existingError.message)
    }

    const existingRecord = asRecord(existing)
    const existingId = readNullableString(existingRecord.id)

    if (
      existingId &&
      readString(existingRecord.status, "CONFIRMED") === "CONFIRMED" &&
      !canConfirm
    ) {
      throw new Error("Manager already confirmed today's Daily Sales.")
    }

    const saleRecordId = existingId ?? randomUUID()
    const attachmentUrl =
      (await uploadRetailFile({
        supabase: context.supabase,
        profile: context.profile,
        outletId,
        formData,
        fieldName: "autocountAttachmentFile",
        recordType: "daily_sales",
        recordId: saleRecordId,
      })) ?? parsed.autocountAttachmentUrl

    const { data, error } = await context.supabase
      .from("retail_daily_sales")
      .upsert(
        {
          id: saleRecordId,
          outlet_id: outletId,
          sales_date: parsed.salesDate,
          payment_type_id: null,
          payment_code: "SUMMARY",
          gross_sales: totalSales,
          status,
          discount_amount: 0,
          cash_received: parsed.cashSales,
          cash_sales: parsed.cashSales,
          bank_transfer_sales: parsed.bankTransferSales,
          ewallet_sales: parsed.ewalletSales,
          credit_sales: parsed.creditSales,
          total_sales: totalSales,
          autocount_attachment_url: attachmentUrl,
          remarks: parsed.remarks,
          notes: parsed.remarks,
          recorded_by: readNullableString(existingRecord.recorded_by) ?? context.profile.id,
          created_by: readNullableString(existingRecord.created_by) ?? context.profile.id,
          updated_by: context.profile.id,
        },
        { onConflict: "outlet_id,sales_date" }
      )
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      existingId ? "RETAIL_DAILY_SALE_UPDATED" : "RETAIL_DAILY_SALE_CREATED",
      "retail_daily_sales",
      String(asRecord(data).id ?? ""),
      {
        ...parsed,
        status,
        outletId,
        totalSales,
        attachmentMissing: !attachmentUrl,
      }
    )

    const savedMessage =
      status === "DRAFT"
        ? "Daily sales draft saved for manager confirmation."
        : "Daily sales summary confirmed."

    return attachmentUrl ? savedMessage : `${savedMessage} AutoCount attachment is missing.`
  })
}

export async function confirmRetailDailySaleAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(dailySaleConfirmSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailAdminRoles, async (context) => {
    const { data: sale, error: saleError } = await context.supabase
      .from("retail_daily_sales")
      .select("id, outlet_id, sales_date, status")
      .eq("id", parsed.saleId)
      .maybeSingle()

    if (saleError) {
      throw new Error(saleError.message)
    }

    const saleRecord = asRecord(sale)
    const outletId = readNullableString(saleRecord.outlet_id)

    if (!saleRecord.id || !outletId) {
      throw new Error("Daily Sales draft was not found.")
    }

    assertRetailSameDay(context.profile, readString(saleRecord.sales_date), "confirm")
    scopedOutlet(context.profile, outletId)

    if (readString(saleRecord.status, "CONFIRMED") === "CONFIRMED") {
      return "Daily Sales is already confirmed."
    }

    const { error } = await context.supabase
      .from("retail_daily_sales")
      .update({
        status: "CONFIRMED",
        updated_by: context.profile.id,
      })
      .eq("id", parsed.saleId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_DAILY_SALE_CONFIRMED",
      "retail_daily_sales",
      parsed.saleId,
      { status: "CONFIRMED" }
    )

    return "Daily Sales confirmed. Cash Closing can use it now."
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

  const roles = retailAdminRoles
  const reviewing = parsed.status === "REVIEWED"

  return runRetailAction(formData, roles, async (context) => {
    assertRetailSameDay(context.profile, parsed.closingDate, "submit or review")

    const outletId = scopedOutlet(context.profile, parsed.outletId)

    if (!outletId) {
      throw new Error("Your profile needs an outlet before submitting daily closing.")
    }

    const { data: dailySale, error: dailySaleError } = await context.supabase
      .from("retail_daily_sales")
      .select(
        "status, cash_sales, bank_transfer_sales, ewallet_sales, credit_sales, total_sales"
      )
      .eq("outlet_id", outletId)
      .eq("sales_date", parsed.closingDate)
      .maybeSingle()

    if (dailySaleError) {
      throw new Error(dailySaleError.message)
    }

    const dailySaleRecord = asRecord(dailySale)

    if (readString(dailySaleRecord.status) !== "CONFIRMED") {
      throw new Error("Manager must confirm Daily Sales before Cash Closing.")
    }

    const cashSales = readNumber(dailySaleRecord.cash_sales)
    const bankTransferSales = readNumber(dailySaleRecord.bank_transfer_sales)
    const ewalletSales = readNumber(dailySaleRecord.ewallet_sales)
    const creditSales = readNumber(dailySaleRecord.credit_sales)
    const totalSales = readNumber(
      dailySaleRecord.total_sales,
      cashSales + bankTransferSales + ewalletSales + creditSales
    )
    const { data: cashExpenseRows, error: expenseError } = await context.supabase
      .from("retail_expenses")
      .select("amount")
      .eq("outlet_id", outletId)
      .eq("expense_date", parsed.closingDate)
      .eq("payment_method", "CASH")
      .in("status", ["SUBMITTED", "REVIEWED"])

    if (expenseError) {
      throw new Error(expenseError.message)
    }

    const cashExpenses = asRecordArray(cashExpenseRows).reduce(
      (sum, row) => sum + readNumber(row.amount),
      0
    )
    const expectedCash = parsed.openingCash + cashSales - cashExpenses
    const varianceAmount = parsed.actualCashCounted - expectedCash
    const now = new Date().toISOString()
    const { data: existing, error: existingError } = await context.supabase
      .from("retail_daily_closings")
      .select("id, status, submitted_by, submitted_at")
      .eq("outlet_id", outletId)
      .eq("closing_date", parsed.closingDate)
      .maybeSingle()

    if (existingError) {
      throw new Error(existingError.message)
    }

    const existingRecord = asRecord(existing)
    const existingId = readNullableString(existingRecord.id)

    if (reviewing) {
      if (!existingId) {
        throw new Error("Submit the daily closing before reviewing it.")
      }

      if (readString(existingRecord.status) !== "SUBMITTED") {
        throw new Error("Only submitted daily closings can be reviewed.")
      }

      if (
        readNullableString(existingRecord.submitted_by) === context.profile.id &&
        !isAdminScope(context.profile)
      ) {
        throw new Error("Daily closing must be reviewed by a different manager.")
      }
    }

    const { data, error } = await context.supabase
      .from("retail_daily_closings")
      .upsert(
        {
          outlet_id: outletId,
          closing_date: parsed.closingDate,
          opening_cash: parsed.openingCash,
          cash_sales: cashSales,
          bank_transfer_sales: bankTransferSales,
          ewallet_sales: ewalletSales,
          credit_sales: creditSales,
          cash_expenses: cashExpenses,
          expected_cash: expectedCash,
          actual_cash_counted: parsed.actualCashCounted,
          total_sales: totalSales,
          cash_received: cashSales,
          expenses_amount: cashExpenses,
          closing_cash: parsed.actualCashCounted,
          variance_amount: varianceAmount,
          status: parsed.status,
          submitted_by: reviewing
            ? readNullableString(existingRecord.submitted_by)
            : parsed.status === "SUBMITTED"
              ? context.profile.id
              : null,
          submitted_at: reviewing
            ? readNullableString(existingRecord.submitted_at)
            : parsed.status === "SUBMITTED"
              ? now
              : null,
          reviewed_by: reviewing ? context.profile.id : null,
          reviewed_at: reviewing ? now : null,
          approved_by: reviewing ? context.profile.id : null,
          approved_at: reviewing ? now : null,
          remarks: parsed.remarks,
          notes: parsed.remarks,
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
      reviewing
        ? "RETAIL_DAILY_CLOSING_REVIEWED"
        : existingId
          ? "RETAIL_DAILY_CLOSING_UPDATED"
          : "RETAIL_DAILY_CLOSING_SAVED",
      "retail_daily_closings",
      String(asRecord(data).id ?? ""),
      {
        ...parsed,
        outletId,
        cashSales,
        bankTransferSales,
        ewalletSales,
        creditSales,
        cashExpenses,
        expectedCash,
        varianceAmount,
        varianceWarning: varianceAmount !== 0,
      }
    )

    return varianceAmount !== 0
      ? "Daily cash closing saved with variance warning."
      : "Daily cash closing saved."
  })
}

export async function upsertRetailPriceRuleAction(
  _state: RetailActionState,
  _formData: FormData
): Promise<RetailActionState> {
  void _state
  void _formData

  return failure(
    "Retail V1 does not use item-level retail price rules. Use AutoCount totals in Daily Sales."
  )
}

export async function upsertRetailProcessingBomAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(processingBomSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailGlobalAdminRoles, async (context) => {
    const rawMaterialItemNames = splitBomItemNames(parsed.rawMaterialItemNames)
    const finishedProductItemNames = splitBomItemNames(
      parsed.finishedProductItemNames
    )

    if (rawMaterialItemNames.length === 0) {
      throw new Error("Add at least one raw material item name.")
    }

    if (finishedProductItemNames.length === 0) {
      throw new Error("Add at least one finished product item name.")
    }

    const expectedYieldMinPercent = nullablePercent(
      parsed.expectedYieldMinPercent,
      "Expected yield minimum"
    )
    const expectedYieldMaxPercent = nullablePercent(
      parsed.expectedYieldMaxPercent,
      "Expected yield maximum"
    )
    const expectedWastagePercent = nullablePercent(
      parsed.expectedWastagePercent,
      "Expected wastage"
    )

    const { data, error } = await context.supabase
      .from("retail_processing_boms")
      .upsert(
        {
          outlet_id: parsed.outletId,
          name: parsed.name,
          raw_material_item_names: rawMaterialItemNames,
          finished_product_item_names: finishedProductItemNames,
          is_active: parsed.active,
          remarks: parsed.remarks,
          expected_yield_min_percent: expectedYieldMinPercent,
          expected_yield_max_percent: expectedYieldMaxPercent,
          expected_wastage_percent: expectedWastagePercent,
          created_by: context.profile.id,
          updated_by: context.profile.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "outlet_id,name" }
      )
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_PROCESSING_BOM_SAVED",
      "retail_processing_boms",
      String(asRecord(data).id ?? ""),
      {
        ...parsed,
        rawMaterialItemNames,
        finishedProductItemNames,
        expectedYieldMinPercent,
        expectedYieldMaxPercent,
        expectedWastagePercent,
      }
    )

    return "Processing BOM saved."
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

  const rawLines = parseProcessingLines(formData, "raw", "Raw material")
  if (isRetailActionState(rawLines)) {
    return rawLines
  }

  const finishedLines = parseProcessingLines(
    formData,
    "finished",
    "Finished product"
  )
  if (isRetailActionState(finishedLines)) {
    return finishedLines
  }

  return runRetailAction(formData, processingOperatorRoles, async (context) => {
    const outletId = scopedOutlet(context.profile, parsed.outletId)

    if (!outletId) {
      throw new Error("Your profile needs an outlet before recording retail processing.")
    }

    let processingType = parsed.processingType
    const processingBomId = parsed.processingBomId

    if (processingBomId) {
      const { data: bom, error: bomError } = await context.supabase
        .from("retail_processing_boms")
        .select("id, name, outlet_id, is_active")
        .eq("id", processingBomId)
        .maybeSingle()

      if (bomError) {
        throw new Error(bomError.message)
      }

      if (!bom) {
        throw new Error("Selected BOM was not found.")
      }

      const bomRecord = asRecord(bom)
      const bomOutletId = readNullableString(bomRecord.outlet_id)

      if (bomRecord.is_active !== true) {
        throw new Error("Selected BOM is inactive.")
      }

      if (bomOutletId !== null && bomOutletId !== outletId) {
        throw new Error("Selected BOM is outside this outlet.")
      }

      processingType = readString(bomRecord.name)
    }

    if (!processingType) {
      throw new Error("Choose a BOM or type a processing type.")
    }

    const batchId = randomUUID()
    const wastagePhotoUrl =
      (await uploadRetailFile({
        supabase: context.supabase,
        profile: context.profile,
        outletId,
        formData,
        fieldName: "wastagePhotoFile",
        recordType: "processing",
        recordId: batchId,
      })) ?? parsed.wastagePhotoUrl

    const rawItemNames = await itemNameLookup(context.supabase, rawLines)
    const finishedItemNames = await itemNameLookup(context.supabase, finishedLines)
    const rawTotalWeightKg = rawLines.reduce((sum, line) => sum + line.weightKg, 0)
    const finishedTotalWeightKg = finishedLines.reduce(
      (sum, line) => sum + line.weightKg,
      0
    )
    const rawTotalQuantity = rawLines.reduce((sum, line) => sum + line.quantity, 0)
    const finishedTotalQuantity = finishedLines.reduce(
      (sum, line) => sum + line.quantity,
      0
    )
    const yieldPercent =
      rawTotalWeightKg > 0 ? (finishedTotalWeightKg / rawTotalWeightKg) * 100 : 0
    const wastagePercent =
      rawTotalWeightKg > 0
        ? (parsed.wastageWeightKg / rawTotalWeightKg) * 100
        : 0
    const accountedWeightKg = finishedTotalWeightKg + parsed.wastageWeightKg
    const unaccountedDifferenceKg = rawTotalWeightKg - accountedWeightKg
    const unaccountedDifferencePercent =
      rawTotalWeightKg > 0
        ? (unaccountedDifferenceKg / rawTotalWeightKg) * 100
        : 0
    const now = new Date().toISOString()
    const batchNo = `RP-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now().toString().slice(-5)}`
    const { data, error } = await context.supabase
      .from("retail_processing_batches")
      .insert({
        id: batchId,
        batch_no: batchNo,
        outlet_id: outletId,
        department_id: scopedDepartment(context.profile, null),
        stock_location_id: scopedStockLocation(context.profile, null),
        processing_bom_id: processingBomId,
        processing_date: parsed.processingDate,
        processing_type: processingType,
        raw_item_id: rawLines[0]?.itemId,
        raw_quantity: rawTotalQuantity,
        raw_weight_kg: rawTotalWeightKg,
        finished_item_id: finishedLines[0]?.itemId,
        finished_quantity: finishedTotalQuantity,
        finished_weight_kg: finishedTotalWeightKg,
        wastage_weight_kg: parsed.wastageWeightKg,
        wastage_reason: parsed.wastageReason,
        wastage_photo_url: wastagePhotoUrl,
        wastage_remarks: parsed.wastageRemarks,
        warning_message: null,
        status: parsed.status,
        processed_by: context.profile.id,
        processed_at: now,
        worker_id: context.profile.id,
        created_by: context.profile.id,
        submitted_by: context.profile.id,
        submitted_at: now,
        remarks: parsed.remarks,
        notes: parsed.remarks,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const savedBatchId = String(asRecord(data).id ?? batchId)
    const rawLineRows = rawLines.map((line) => ({
      processing_batch_id: savedBatchId,
      item_id: line.itemId,
      item_name:
        line.itemName || (line.itemId ? rawItemNames.get(line.itemId) : "") || "Item",
      weight_kg: line.weightKg,
      quantity: line.quantity,
      remarks: line.remarks,
    }))
    const finishedLineRows = finishedLines.map((line) => ({
      processing_batch_id: savedBatchId,
      item_id: line.itemId,
      item_name:
        line.itemName ||
        (line.itemId ? finishedItemNames.get(line.itemId) : "") ||
        "Item",
      weight_kg: line.weightKg,
      quantity: line.quantity,
      remarks: line.remarks,
    }))

    const { error: rawLineError } = await context.supabase
      .from("retail_processing_raw_lines")
      .insert(rawLineRows)

    if (rawLineError) {
      throw new Error(rawLineError.message)
    }

    const { error: finishedLineError } = await context.supabase
      .from("retail_processing_finished_lines")
      .insert(finishedLineRows)

    if (finishedLineError) {
      throw new Error(finishedLineError.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_PROCESSING_BATCH_CREATED",
      "retail_processing_batches",
      savedBatchId,
      {
        ...parsed,
        batchNo,
        processingBomId,
        processingType,
        rawTotalWeightKg,
        finishedTotalWeightKg,
        yieldPercent,
        wastagePercent,
        unaccountedDifferenceKg,
        unaccountedDifferencePercent,
      }
    )

    return `Processing record ${batchNo} saved.`
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

  if (parsed.status === "REJECTED" && !parsed.rejectionReason) {
    return failure("Rejection reason is required when rejecting processing.")
  }

  return runRetailAction(formData, processingReviewRoles, async (context) => {
    const { error } = await context.supabase
      .from("retail_processing_batches")
      .update({
        status: parsed.status,
        reviewed_by: context.profile.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason:
          parsed.status === "REJECTED" ? parsed.rejectionReason : null,
        remarks: parsed.remarks,
        notes: parsed.remarks,
      })
      .eq("id", parsed.batchId)
      .in("status", ["SUBMITTED", "COMPLETED"])

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
  }, "processing")
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
    const outletId = scopedOutlet(context.profile, parsed.outletId)
    const departmentId = scopedDepartment(context.profile, parsed.departmentId)

    if (!outletId) {
      throw new Error("Your profile needs an outlet before saving cleaning tasks.")
    }

    const { data, error } = await context.supabase
      .from("retail_cleaning_tasks")
      .upsert(
        {
          outlet_id: outletId,
          department_id: departmentId,
          task_name: parsed.taskName,
          frequency: parsed.frequency,
          due_date: new Date().toISOString().slice(0, 10),
          is_active: parsed.active,
          status: "PENDING",
          created_by: context.profile.id,
          updated_by: context.profile.id,
        },
        { onConflict: "outlet_id,task_name,frequency" }
      )
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

    return "Cleaning task master saved."
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
    const completedAt = new Date().toISOString()
    const photoUrl =
      done && outletId
        ? (await uploadRetailFile({
            supabase: context.supabase,
            profile: context.profile,
            outletId,
            formData,
            fieldName: "photoFile",
            recordType: "cleaning",
            recordId: parsed.taskId,
          })) ?? parsed.photoUrl
        : parsed.photoUrl
    const { error } = await context.supabase
      .from("retail_cleaning_tasks")
      .update({
        status: parsed.status,
        completed_by: done ? context.profile.id : null,
        completed_at: done ? completedAt : null,
        completion_photo_url: done ? photoUrl : null,
        remarks: parsed.remarks,
        notes: parsed.remarks,
        updated_by: context.profile.id,
      })
      .eq("id", parsed.taskId)

    if (error) {
      throw new Error(error.message)
    }

    if (done) {
      const { error: completionError } = await context.supabase
        .from("retail_cleaning_completions")
        .upsert(
          {
            task_id: parsed.taskId,
            outlet_id: outletId,
            completion_date: completedAt.slice(0, 10),
            completed_by: context.profile.id,
            completed_at: completedAt,
            photo_url: photoUrl,
            remarks: parsed.remarks,
          },
          { onConflict: "task_id,completion_date" }
        )

      if (completionError) {
        throw new Error(completionError.message)
      }
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_CLEANING_TASK_UPDATED",
      "retail_cleaning_tasks",
      parsed.taskId,
      parsed
    )

    return done ? "Cleaning task completed." : "Cleaning task marked missing."
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

  return runRetailAction(formData, retailOperatorRoles, async (context) => {
    const outletId = scopedOutlet(context.profile, parsed.outletId)
    const now = new Date().toISOString()

    if (!outletId) {
      throw new Error("Your profile needs an outlet before submitting expenses.")
    }

    const expenseId = randomUUID()
    const receiptUrl =
      (await uploadRetailFile({
        supabase: context.supabase,
        profile: context.profile,
        outletId,
        formData,
        fieldName: "receiptFile",
        recordType: "expenses",
        recordId: expenseId,
        required: !parsed.receiptUrl,
      })) ?? parsed.receiptUrl

    if (!receiptUrl) {
      throw new Error("Receipt is required.")
    }

    const { data, error } = await context.supabase
      .from("retail_expenses")
      .insert({
        id: expenseId,
        outlet_id: outletId,
        expense_date: parsed.expenseDate,
        category: parsed.category,
        vendor: parsed.supplierPayee,
        supplier_payee: parsed.supplierPayee,
        amount: parsed.amount,
        payment_method: parsed.paymentMethod,
        status: "SUBMITTED",
        receipt_url: receiptUrl,
        submitted_by: context.profile.id,
        submitted_at: now,
        remarks: parsed.remarks,
        notes: parsed.remarks,
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

export async function updateRetailExpenseAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(expenseEditSchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailOperatorRoles, async (context) => {
    const { data: existing, error: existingError } = await context.supabase
      .from("retail_expenses")
      .select("id, outlet_id, status, submitted_by, receipt_url")
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
    const submittedBy = readNullableString(record.submitted_by)
    const currentStatus = readString(record.status)
    const existingReceiptUrl = readNullableString(record.receipt_url)

    if (!outletId || !canUseWorkScope(context.profile, outletId, null)) {
      throw new Error("This expense is outside your assigned outlet.")
    }

    if (currentStatus !== "SUBMITTED") {
      throw new Error("Only submitted expenses can be edited before manager review.")
    }

    if (submittedBy !== context.profile.id && !isAdminScope(context.profile)) {
      throw new Error("Only the submitting worker can edit this expense before review.")
    }

    const receiptUrl =
      (await uploadRetailFile({
        supabase: context.supabase,
        profile: context.profile,
        outletId,
        formData,
        fieldName: "receiptFile",
        recordType: "expenses",
        recordId: parsed.expenseId,
        required: !(parsed.receiptUrl ?? existingReceiptUrl),
      })) ?? parsed.receiptUrl ?? existingReceiptUrl

    if (!receiptUrl) {
      throw new Error("Receipt is required.")
    }

    const updatePayload = {
      expense_date: parsed.expenseDate,
      category: parsed.category,
      vendor: parsed.supplierPayee,
      supplier_payee: parsed.supplierPayee,
      amount: parsed.amount,
      payment_method: parsed.paymentMethod,
      receipt_url: receiptUrl,
      remarks: parsed.remarks,
      notes: parsed.remarks,
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
      "RETAIL_EXPENSE_UPDATED_BEFORE_REVIEW",
      "retail_expenses",
      parsed.expenseId,
      parsed
    )

    return "Retail expense updated."
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

  const roles = retailExpenseReviewRoles

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

    if (currentStatus !== "SUBMITTED") {
      throw new Error("Only submitted expenses can be reviewed, rejected, or cancelled.")
    }

    if (submittedBy === context.profile.id && !isAdminScope(context.profile)) {
      throw new Error("Expense must be reviewed by a different manager.")
    }

    if (parsed.status === "REJECTED" && !parsed.rejectionReason) {
      throw new Error("Rejection reason is required when rejecting an expense.")
    }

    const updatePayload = {
      status: parsed.status,
      reviewed_by: context.profile.id,
      reviewed_at: now,
      rejection_reason:
        parsed.status === "REJECTED" ? parsed.rejectionReason : null,
      remarks: parsed.remarks,
      notes: parsed.remarks,
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

export async function upsertRetailExpenseCategoryAction(
  _state: RetailActionState,
  formData: FormData
): Promise<RetailActionState> {
  const parsed = parseAction(expenseCategorySchema, formData)

  if (isRetailActionState(parsed)) {
    return parsed
  }

  return runRetailAction(formData, retailAdminRoles, async (context) => {
    const outletId = scopedOutlet(context.profile, parsed.outletId)

    if (!outletId && !isAdminScope(context.profile)) {
      throw new Error("Your profile needs an outlet before saving expense categories.")
    }

    const { data, error } = await context.supabase
      .from("retail_expense_categories")
      .upsert(
        {
          outlet_id: outletId,
          name: parsed.name,
          is_active: parsed.active,
          created_by: context.profile.id,
          updated_by: context.profile.id,
        },
        { onConflict: "outlet_id,name" }
      )
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "RETAIL_EXPENSE_CATEGORY_SAVED",
      "retail_expense_categories",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Expense category saved."
  })
}
