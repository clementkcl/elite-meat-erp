"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
  type UserRole,
} from "@/lib/auth/session"
import { canAccessModule } from "@/lib/auth/access"
import { asRecord, readString } from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import type { FinanceActionState } from "@/lib/finance/action-state"
import {
  containerStatuses,
  directorReportTypes,
  financePaymentStatuses,
  financeInvoiceTypes,
} from "@/lib/finance/types"

const financeEntryRoles: UserRole[] = ["account", "admin"]
const financeReviewRoles: UserRole[] = ["admin"]
const financeApproveRoles: UserRole[] = ["admin", "director"]
const financePaymentRoles: UserRole[] = ["account", "admin"]

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const invoiceSchema = z.object({
  invoiceNo: z.string().trim().min(2),
  invoiceType: z.enum(financeInvoiceTypes),
  partyName: z.string().trim().min(2),
  invoiceDate: z.string().trim().min(1),
  dueDate: optionalText,
  amount: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0),
  itemList: z.string().trim().min(2),
  paymentStatus: z.enum(financePaymentStatuses),
  relatedModule: optionalText,
  notes: optionalText,
})

const accountReviewSchema = z.object({
  invoiceId: z.string().trim().min(1),
  decision: z.enum(["ACCOUNT_REVIEWED", "REJECTED"]),
  notes: optionalText,
})

const directorInvoiceDecisionSchema = z.object({
  invoiceId: z.string().trim().min(1),
  decision: z.enum(["DIRECTOR_APPROVED", "REJECTED"]),
  notes: optionalText,
})

const invoicePaidSchema = z.object({
  invoiceId: z.string().trim().min(1),
  notes: optionalText,
})

const containerSchema = z.object({
  containerNo: z.string().trim().min(2),
  supplierName: z.string().trim().min(2),
  etaDate: optionalText,
  arrivalDate: optionalText,
  status: z.enum(containerStatuses),
  totalCost: z.coerce.number().min(0),
  currency: z.string().trim().min(3),
  invoiceId: optionalUuid,
  notes: optionalText,
})

const reportSnapshotSchema = z.object({
  reportType: z.enum(directorReportTypes),
  periodStart: z.string().trim().min(1),
  periodEnd: z.string().trim().min(1),
  totalSales: z.coerce.number().min(0),
  cashCollected: z.coerce.number().min(0),
  outstandingAr: z.coerce.number().min(0),
  outstandingAp: z.coerce.number().min(0),
  stockValue: z.coerce.number().min(0),
  expenseTotal: z.coerce.number().min(0),
  notes: optionalText,
})

type FinanceActionContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function success(message: string): FinanceActionState {
  return { status: "success", message }
}

function failure(message: string): FinanceActionState {
  return { status: "error", message }
}

function parseAction<T>(
  schema: z.ZodType<T>,
  formData: FormData
): T | FinanceActionState {
  const parsed = schema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the form fields.")
  }

  return parsed.data
}

function isFinanceActionState(value: unknown): value is FinanceActionState {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "status" in value
  )
}

async function getActionContext(roles: UserRole[]) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: "Sign in before changing finance records." }
  }

  if (!hasAnyRole(profile, roles)) {
    return { error: "Your role does not allow this finance action." }
  }

  if (!canAccessModule(profile, "accounting_finance")) {
    return { error: "Your outlet does not have accounting finance access." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { profile, demoMode: true }
  }

  return { profile, supabase, demoMode: false }
}

function revalidateFinancePaths() {
  [
    "/accounting-finance",
    "/accounting-finance/dashboard",
    "/accounting-finance/claims",
    "/accounting-finance/advances",
    "/accounting-finance/ar-invoices",
    "/accounting-finance/ap-invoices",
    "/accounting-finance/containers",
    "/director-reports",
    "/director-reports/dashboard",
    "/director-reports/approvals",
    "/director-reports/reports",
  ].forEach((path) => revalidatePath(path))
}

async function runFinanceAction(
  formData: FormData,
  roles: UserRole[],
  callback: (
    context: FinanceActionContext,
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
    revalidateFinancePaths()
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

function safeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

async function uploadOptionalFile(
  context: FinanceActionContext,
  formData: FormData
) {
  const fileValue = formData.get("invoiceFile")

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return null
  }

  const allowedType =
    fileValue.type === "application/pdf" || fileValue.type.startsWith("image/")

  if (!allowedType) {
    throw new Error("Upload a PDF or image invoice file.")
  }

  const cleanName = safeFileName(fileValue.name) || "invoice"
  const objectPath = `finance/invoices/${context.profile.id}/${Date.now()}-${cleanName}`
  const { error: uploadError } = await context.supabase.storage
    .from("erp-files")
    .upload(objectPath, fileValue, {
      contentType: fileValue.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data, error } = await context.supabase
    .from("files")
    .insert({
      owner_id: context.profile.id,
      bucket_id: "erp-files",
      object_path: objectPath,
      module: "finance",
      mime_type: fileValue.type || null,
      size_bytes: fileValue.size,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return String(asRecord(data).id ?? "")
}

async function getInvoice(supabase: SupabaseServerClient, invoiceId: string) {
  const { data, error } = await supabase
    .from("finance_invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const invoice = asRecord(data)

  if (!invoice.id) {
    throw new Error("Finance invoice was not found.")
  }

  return invoice
}

export async function createFinanceInvoiceAction(
  _state: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const parsed = parseAction(invoiceSchema, formData)

  if (isFinanceActionState(parsed)) {
    return parsed
  }

  return runFinanceAction(
    formData,
    financeEntryRoles,
    async (context, rawFormData) => {
      const fileId = await uploadOptionalFile(context, rawFormData)
      const { data, error } = await context.supabase
        .from("finance_invoices")
        .insert({
          invoice_no: parsed.invoiceNo,
          invoice_type: parsed.invoiceType,
          party_name: parsed.partyName,
          invoice_date: parsed.invoiceDate,
          due_date: parsed.dueDate,
          amount: parsed.amount,
          tax_amount: parsed.taxAmount,
          item_list: parsed.itemList,
          payment_status: parsed.paymentStatus,
          status: "SUBMITTED",
          file_id: fileId,
          related_module: parsed.relatedModule,
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
        "FINANCE_INVOICE_CREATED",
        "finance_invoices",
        String(asRecord(data).id ?? ""),
        parsed
      )

      return `Invoice ${parsed.invoiceNo} submitted.`
    }
  )
}

export async function reviewFinanceInvoiceAction(
  _state: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const parsed = parseAction(accountReviewSchema, formData)

  if (isFinanceActionState(parsed)) {
    return parsed
  }

  return runFinanceAction(formData, financeReviewRoles, async (context) => {
    const invoice = await getInvoice(context.supabase, parsed.invoiceId)
    const currentStatus = readString(invoice.status, "SUBMITTED")

    if (currentStatus !== "SUBMITTED") {
      throw new Error("Only submitted invoices can be admin reviewed.")
    }

    const { error } = await context.supabase
      .from("finance_invoices")
      .update({
        status: parsed.decision,
        reviewed_by: context.profile.id,
        reviewed_at: new Date().toISOString(),
        notes: parsed.notes,
      })
      .eq("id", parsed.invoiceId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "FINANCE_INVOICE_REVIEWED",
      "finance_invoices",
      parsed.invoiceId,
      parsed
    )

    return "Invoice review saved."
  })
}

export async function directorFinanceInvoiceDecisionAction(
  _state: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const parsed = parseAction(directorInvoiceDecisionSchema, formData)

  if (isFinanceActionState(parsed)) {
    return parsed
  }

  return runFinanceAction(formData, financeApproveRoles, async (context) => {
    const invoice = await getInvoice(context.supabase, parsed.invoiceId)
    const currentStatus = readString(invoice.status, "SUBMITTED")

    if (currentStatus !== "ACCOUNT_REVIEWED") {
      throw new Error("Only admin-reviewed invoices can be director approved.")
    }

    const { error } = await context.supabase
      .from("finance_invoices")
      .update({
        status: parsed.decision,
        approved_by: context.profile.id,
        approved_at:
          parsed.decision === "DIRECTOR_APPROVED"
            ? new Date().toISOString()
            : null,
        notes: parsed.notes,
      })
      .eq("id", parsed.invoiceId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "FINANCE_INVOICE_DIRECTOR_DECISION",
      "finance_invoices",
      parsed.invoiceId,
      parsed
    )

    return "Director invoice decision saved."
  })
}

export async function markFinanceInvoicePaidAction(
  _state: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const parsed = parseAction(invoicePaidSchema, formData)

  if (isFinanceActionState(parsed)) {
    return parsed
  }

  return runFinanceAction(formData, financePaymentRoles, async (context) => {
    const invoice = await getInvoice(context.supabase, parsed.invoiceId)
    const currentStatus = readString(invoice.status, "SUBMITTED")

    if (currentStatus !== "DIRECTOR_APPROVED") {
      throw new Error("Only director-approved invoices can be marked paid.")
    }

    const { error } = await context.supabase
      .from("finance_invoices")
      .update({
        status: "PAID",
        payment_status: "PAID",
        paid_at: new Date().toISOString(),
        notes: parsed.notes,
      })
      .eq("id", parsed.invoiceId)

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "FINANCE_INVOICE_PAID",
      "finance_invoices",
      parsed.invoiceId,
      parsed
    )

    return "Invoice marked paid."
  })
}

export async function upsertFinanceContainerAction(
  _state: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const parsed = parseAction(containerSchema, formData)

  if (isFinanceActionState(parsed)) {
    return parsed
  }

  return runFinanceAction(formData, financeEntryRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("finance_containers")
      .upsert(
        {
          container_no: parsed.containerNo,
          supplier_name: parsed.supplierName,
          eta_date: parsed.etaDate,
          arrival_date: parsed.arrivalDate,
          status: parsed.status,
          total_cost: parsed.totalCost,
          currency: parsed.currency,
          invoice_id: parsed.invoiceId,
          updated_by: context.profile.id,
          notes: parsed.notes,
        },
        { onConflict: "container_no" }
      )
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "FINANCE_CONTAINER_SAVED",
      "finance_containers",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Container saved."
  })
}

export async function createDirectorReportSnapshotAction(
  _state: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const parsed = parseAction(reportSnapshotSchema, formData)

  if (isFinanceActionState(parsed)) {
    return parsed
  }

  return runFinanceAction(formData, financeApproveRoles, async (context) => {
    const reportNo = `DR-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${Date.now().toString().slice(-5)}`
    const { data, error } = await context.supabase
      .from("director_report_snapshots")
      .insert({
        report_no: reportNo,
        report_type: parsed.reportType,
        period_start: parsed.periodStart,
        period_end: parsed.periodEnd,
        total_sales: parsed.totalSales,
        cash_collected: parsed.cashCollected,
        outstanding_ar: parsed.outstandingAr,
        outstanding_ap: parsed.outstandingAp,
        stock_value: parsed.stockValue,
        expense_total: parsed.expenseTotal,
        generated_by: context.profile.id,
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
      "DIRECTOR_REPORT_SNAPSHOT_CREATED",
      "director_report_snapshots",
      String(asRecord(data).id ?? ""),
      { ...parsed, reportNo }
    )

    return `Director report ${reportNo} saved.`
  })
}
