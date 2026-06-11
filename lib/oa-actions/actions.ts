"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
  type UserRole,
} from "@/lib/auth/session"
import { asRecord, readString } from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import type { OaActionState } from "@/lib/oa-actions/action-state"
import {
  claimRequestCategories,
  leaveRequestTypes,
  oaRequestTypes,
  type OaRequestStatus,
  type OaRequestType,
} from "@/lib/oa-actions/types"

const oaUserRoles: UserRole[] = [
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

const departmentManagerRoles: UserRole[] = [
  "retail_manager",
  "delivery_manager",
  "processing_manager",
]
const oaReviewRoles: UserRole[] = ["admin"]
const oaApproveRoles: UserRole[] = ["director"]
const oaPaymentRoles: UserRole[] = ["account", "admin"]
const payslipRoles: UserRole[] = ["account", "admin"]

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const advanceSchema = z.object({
  amount: z.coerce.number().positive(),
  neededDate: optionalText,
  reason: z.string().trim().min(3),
})

const claimSchema = z.object({
  category: z.enum(claimRequestCategories),
  expenseDate: optionalText,
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(3),
})

const leaveSchema = z.object({
  leaveType: z.enum(leaveRequestTypes),
  startDate: z.string().trim().min(8),
  endDate: z.string().trim().min(8),
  totalDays: z.coerce.number().positive(),
  reason: z.string().trim().min(3),
})

const reviewSchema = z.object({
  requestType: z.enum(oaRequestTypes),
  requestId: z.string().trim().min(1),
  decision: z.enum(["MANAGER_REVIEWED", "ADMIN_REVIEWED", "APPROVED", "REJECTED"]),
  notes: z.string().trim().optional(),
})

const directorDecisionSchema = z.object({
  requestType: z.enum(oaRequestTypes),
  requestId: z.string().trim().min(1),
  decision: z.enum(["DIRECTOR_APPROVED", "REJECTED"]),
  notes: z.string().trim().optional(),
})

const paidSchema = z.object({
  requestType: z.enum(["advance", "claim"]),
  requestId: z.string().trim().min(1),
  notes: z.string().trim().optional(),
})

const payslipSchema = z.object({
  profileId: z.string().trim().min(1),
  periodMonth: z.string().trim().min(7),
  grossPay: z.coerce.number().min(0),
  deductions: z.coerce.number().min(0),
})

type OaActionContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

const requestTables: Record<OaRequestType, string> = {
  advance: "advance_requests",
  claim: "claim_requests",
  leave: "leave_requests",
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function success(message: string): OaActionState {
  return { status: "success", message }
}

function failure(message: string): OaActionState {
  return { status: "error", message }
}

function parseAction<T>(
  schema: z.ZodType<T>,
  formData: FormData
): T | OaActionState {
  const parsed = schema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the form fields.")
  }

  return parsed.data
}

function isOaActionState(value: unknown): value is OaActionState {
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
    return { error: "Sign in before changing OA records." }
  }

  if (!hasAnyRole(profile, roles)) {
    return { error: "Your role does not allow this OA action." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { profile, demoMode: true }
  }

  return { profile, supabase, demoMode: false }
}

function revalidateOaPaths() {
  [
    "/oa-actions",
    "/oa-actions/dashboard",
    "/oa-actions/advance",
    "/oa-actions/claim",
    "/oa-actions/leave",
    "/oa-actions/payslip",
    "/oa-actions/my-requests",
    "/attendance",
    "/attendance/today",
    "/attendance/my-attendance",
    "/attendance/department",
  ].forEach((path) => revalidatePath(path))
}

async function runOaAction(
  formData: FormData,
  roles: UserRole[],
  callback: (context: OaActionContext, formData: FormData) => Promise<string>
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
    revalidateOaPaths()
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
  context: OaActionContext,
  formData: FormData,
  fieldName: string,
  folder: string
) {
  const fileValue = formData.get(fieldName)

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return null
  }

  const cleanName = safeFileName(fileValue.name) || "attachment"
  const objectPath = `oa-actions/${folder}/${context.profile.id}/${Date.now()}-${cleanName}`
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
      module: "oa-actions",
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

async function getRequest(
  supabase: SupabaseServerClient,
  requestType: OaRequestType,
  requestId: string
) {
  const { data, error } = await supabase
    .from(requestTables[requestType])
    .select("*")
    .eq("id", requestId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const request = asRecord(data)

  if (!request.id) {
    throw new Error("Request was not found.")
  }

  return request
}

async function insertApprovalLog(
  context: OaActionContext,
  input: {
    requestType: OaRequestType
    requestId: string
    action: string
    fromStatus: OaRequestStatus | null
    toStatus: OaRequestStatus
    notes?: string | null
  }
) {
  const { error } = await context.supabase.from("approval_logs").insert({
    module: "oa-actions",
    request_type: input.requestType,
    request_id: input.requestId,
    action: input.action,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    notes: input.notes ?? null,
    actor_id: context.profile.id,
  })

  if (error) {
    throw new Error(error.message)
  }
}

function normalizeMonth(value: string) {
  return value.length === 7 ? `${value}-01` : value
}

function hasManagerRole(profile: CurrentProfile) {
  return hasAnyRole(profile, departmentManagerRoles)
}

function canReviewRequestDepartment(
  profile: CurrentProfile,
  request: Record<string, unknown>
) {
  const departmentId = readString(request.department_id)

  return (
    hasManagerRole(profile) &&
    Boolean(profile.departmentId) &&
    departmentId === profile.departmentId
  )
}

function hasAdminReviewRole(profile: CurrentProfile) {
  return hasAnyRole(profile, oaReviewRoles)
}

export async function createAdvanceRequestAction(
  _state: OaActionState,
  formData: FormData
): Promise<OaActionState> {
  const parsed = parseAction(advanceSchema, formData)

  if (isOaActionState(parsed)) {
    return parsed
  }

  return runOaAction(formData, oaUserRoles, async (context, rawFormData) => {
    const attachmentFileId = await uploadOptionalFile(
      context,
      rawFormData,
      "attachmentFile",
      "advance"
    )
    const { data, error } = await context.supabase
      .from("advance_requests")
      .insert({
        requested_by: context.profile.id,
        amount: parsed.amount,
        needed_date: parsed.neededDate,
        reason: parsed.reason,
        status: "SUBMITTED",
        department_id: context.profile.departmentId,
        attachment_file_id: attachmentFileId,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const requestId = String(asRecord(data).id ?? "")
    await insertAuditLog(
      context.supabase,
      context.profile,
      "ADVANCE_REQUEST_CREATED",
      "advance_requests",
      requestId,
      parsed
    )

    return "Advance request submitted."
  })
}

export async function createClaimRequestAction(
  _state: OaActionState,
  formData: FormData
): Promise<OaActionState> {
  const parsed = parseAction(claimSchema, formData)

  if (isOaActionState(parsed)) {
    return parsed
  }

  return runOaAction(formData, oaUserRoles, async (context, rawFormData) => {
    const attachmentFileId = await uploadOptionalFile(
      context,
      rawFormData,
      "attachmentFile",
      "claim"
    )
    const { data, error } = await context.supabase
      .from("claim_requests")
      .insert({
        requested_by: context.profile.id,
        category: parsed.category,
        expense_date: parsed.expenseDate,
        amount: parsed.amount,
        description: parsed.description,
        status: "SUBMITTED",
        department_id: context.profile.departmentId,
        attachment_file_id: attachmentFileId,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const requestId = String(asRecord(data).id ?? "")
    await insertAuditLog(
      context.supabase,
      context.profile,
      "CLAIM_REQUEST_CREATED",
      "claim_requests",
      requestId,
      parsed
    )

    return "Claim request submitted."
  })
}

export async function createLeaveRequestAction(
  _state: OaActionState,
  formData: FormData
): Promise<OaActionState> {
  const parsed = parseAction(leaveSchema, formData)

  if (isOaActionState(parsed)) {
    return parsed
  }

  return runOaAction(formData, oaUserRoles, async (context, rawFormData) => {
    const attachmentFileId = await uploadOptionalFile(
      context,
      rawFormData,
      "attachmentFile",
      "leave"
    )
    const { data, error } = await context.supabase
      .from("leave_requests")
      .insert({
        requested_by: context.profile.id,
        leave_type: parsed.leaveType,
        start_date: parsed.startDate,
        end_date: parsed.endDate,
        total_days: parsed.totalDays,
        reason: parsed.reason,
        status: "SUBMITTED",
        department_id: context.profile.departmentId,
        attachment_file_id: attachmentFileId,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const requestId = String(asRecord(data).id ?? "")
    await insertAuditLog(
      context.supabase,
      context.profile,
      "LEAVE_REQUEST_CREATED",
      "leave_requests",
      requestId,
      parsed
    )

    return "Leave request submitted."
  })
}

export async function adminReviewRequestAction(
  _state: OaActionState,
  formData: FormData
): Promise<OaActionState> {
  const parsed = parseAction(reviewSchema, formData)

  if (isOaActionState(parsed)) {
    return parsed
  }

  return runOaAction(formData, oaUserRoles, async (context) => {
    const request = await getRequest(
      context.supabase,
      parsed.requestType,
      parsed.requestId
    )
    const fromStatus = readString(request.status, "SUBMITTED") as OaRequestStatus

    if (parsed.requestType === "advance") {
      if (!hasAdminReviewRole(context.profile)) {
        throw new Error("Only admin can review advance requests.")
      }

      if (fromStatus !== "SUBMITTED" || parsed.decision === "MANAGER_REVIEWED" || parsed.decision === "APPROVED") {
        throw new Error("Advance requests go from submitted to admin reviewed or rejected.")
      }
    }

    if (parsed.requestType === "claim") {
      if (fromStatus === "SUBMITTED") {
        if (!canReviewRequestDepartment(context.profile, request) || parsed.decision !== "MANAGER_REVIEWED") {
          throw new Error("Claim requests must be reviewed by the department manager first.")
        }
      } else if (fromStatus === "MANAGER_REVIEWED") {
        if (!hasAdminReviewRole(context.profile) || parsed.decision === "MANAGER_REVIEWED" || parsed.decision === "APPROVED") {
          throw new Error("Admin/account review is required after manager review.")
        }
      } else {
        throw new Error("Only submitted or manager-reviewed claims can be reviewed.")
      }
    }

    if (parsed.requestType === "leave") {
      if (!canReviewRequestDepartment(context.profile, request)) {
        throw new Error("Only department managers can approve leave.")
      }

      if (fromStatus !== "SUBMITTED" || (parsed.decision !== "APPROVED" && parsed.decision !== "REJECTED")) {
        throw new Error("Leave requests can only be approved or rejected by the department manager.")
      }
    }

    const { error } = await context.supabase
      .from(requestTables[parsed.requestType])
      .update({
        status: parsed.decision,
        admin_reviewed_by: context.profile.id,
        admin_reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.requestId)

    if (error) {
      throw new Error(error.message)
    }

    await insertApprovalLog(context, {
      requestType: parsed.requestType,
      requestId: parsed.requestId,
      action: parsed.decision,
      fromStatus,
      toStatus: parsed.decision,
      notes: parsed.notes ?? null,
    })
    await insertAuditLog(
      context.supabase,
      context.profile,
      "OA_ADMIN_REVIEWED",
      requestTables[parsed.requestType],
      parsed.requestId,
      parsed
    )

    return "Request review saved."
  })
}

export async function directorDecisionRequestAction(
  _state: OaActionState,
  formData: FormData
): Promise<OaActionState> {
  const parsed = parseAction(directorDecisionSchema, formData)

  if (isOaActionState(parsed)) {
    return parsed
  }

  return runOaAction(formData, oaApproveRoles, async (context) => {
    const request = await getRequest(
      context.supabase,
      parsed.requestType,
      parsed.requestId
    )
    const fromStatus = readString(request.status, "SUBMITTED") as OaRequestStatus

    if (fromStatus !== "ADMIN_REVIEWED") {
      throw new Error("Only admin-reviewed requests can be director approved.")
    }

    const { error } = await context.supabase
      .from(requestTables[parsed.requestType])
      .update({
        status: parsed.decision,
        director_approved_by: context.profile.id,
        director_approved_at:
          parsed.decision === "DIRECTOR_APPROVED"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", parsed.requestId)

    if (error) {
      throw new Error(error.message)
    }

    await insertApprovalLog(context, {
      requestType: parsed.requestType,
      requestId: parsed.requestId,
      action: parsed.decision,
      fromStatus,
      toStatus: parsed.decision,
      notes: parsed.notes ?? null,
    })
    await insertAuditLog(
      context.supabase,
      context.profile,
      "OA_DIRECTOR_DECISION",
      requestTables[parsed.requestType],
      parsed.requestId,
      parsed
    )

    return "Director decision saved."
  })
}

export async function markOaRequestPaidAction(
  _state: OaActionState,
  formData: FormData
): Promise<OaActionState> {
  const parsed = parseAction(paidSchema, formData)

  if (isOaActionState(parsed)) {
    return parsed
  }

  return runOaAction(formData, oaPaymentRoles, async (context) => {
    const request = await getRequest(
      context.supabase,
      parsed.requestType,
      parsed.requestId
    )
    const fromStatus = readString(request.status, "SUBMITTED") as OaRequestStatus

    if (fromStatus !== "DIRECTOR_APPROVED") {
      throw new Error("Only director-approved requests can be marked paid.")
    }

    const { error } = await context.supabase
      .from(requestTables[parsed.requestType])
      .update({
        status: "PAID",
        paid_at: new Date().toISOString(),
      })
      .eq("id", parsed.requestId)

    if (error) {
      throw new Error(error.message)
    }

    await insertApprovalLog(context, {
      requestType: parsed.requestType,
      requestId: parsed.requestId,
      action: "PAID",
      fromStatus,
      toStatus: "PAID",
      notes: parsed.notes ?? null,
    })
    await insertAuditLog(
      context.supabase,
      context.profile,
      "OA_REQUEST_PAID",
      requestTables[parsed.requestType],
      parsed.requestId,
      parsed
    )

    return "Request marked paid."
  })
}

export async function uploadPayslipAction(
  _state: OaActionState,
  formData: FormData
): Promise<OaActionState> {
  const parsed = parseAction(payslipSchema, formData)

  if (isOaActionState(parsed)) {
    return parsed
  }

  return runOaAction(formData, payslipRoles, async (context, rawFormData) => {
    const fileId = await uploadOptionalFile(
      context,
      rawFormData,
      "payslipFile",
      "payslip"
    )
    const { data, error } = await context.supabase
      .from("payslips")
      .upsert(
        {
          profile_id: parsed.profileId,
          period_month: normalizeMonth(parsed.periodMonth),
          gross_pay: parsed.grossPay,
          deductions: parsed.deductions,
          file_id: fileId,
          uploaded_by: context.profile.id,
        },
        { onConflict: "profile_id,period_month" }
      )
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "PAYSLIP_UPLOADED",
      "payslips",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Payslip saved."
  })
}
