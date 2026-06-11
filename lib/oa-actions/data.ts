import {
  asRecordArray,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  demoAdvanceRequests,
  demoApprovalLogs,
  demoClaimRequests,
  demoLeaveRequests,
  demoOaPeople,
  demoPayslips,
} from "@/lib/oa-actions/demo-data"
import {
  leaveRequestTypes,
  oaRequestStatuses,
  type AdvanceRequest,
  type ApprovalLog,
  type ClaimRequest,
  type LeaveRequest,
  type LeaveRequestType,
  type OaKpi,
  type OaPageData,
  type OaPerson,
  type OaRequestStatus,
  type Payslip,
  type UnifiedOaRequest,
} from "@/lib/oa-actions/types"

function isOaRequestStatus(value: string): value is OaRequestStatus {
  return oaRequestStatuses.includes(value as OaRequestStatus)
}

function isLeaveRequestType(value: string): value is LeaveRequestType {
  return leaveRequestTypes.includes(value as LeaveRequestType)
}

async function loadRows(table: string) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.from(table).select("*").limit(1000)

  if (error) {
    return []
  }

  return asRecordArray(data)
}

function mapPerson(row: Record<string, unknown>): OaPerson {
  return {
    id: readString(row.id),
    fullName: readString(row.full_name, readString(row.email, "ERP User")),
    email: readString(row.email),
  }
}

function findPerson(people: OaPerson[], id: string | null | undefined) {
  return people.find((person) => person.id === id)
}

function mapStatus(value: unknown) {
  const status = readString(value, "SUBMITTED")
  return isOaRequestStatus(status) ? status : "SUBMITTED"
}

function mapAdvance(
  row: Record<string, unknown>,
  people: OaPerson[],
  filePaths: Map<string, string>
): AdvanceRequest {
  const requestedBy = readNullableString(row.requested_by)
  const attachmentFileId = readNullableString(row.attachment_file_id)

  return {
    id: readString(row.id),
    requestedBy,
    requesterName: findPerson(people, requestedBy)?.fullName ?? "-",
    amount: readNumber(row.amount),
    neededDate: readNullableString(row.needed_date),
    reason: readString(row.reason),
    status: mapStatus(row.status),
    attachmentFileId,
    attachmentPath: attachmentFileId ? filePaths.get(attachmentFileId) ?? "-" : "-",
    adminReviewedAt: readNullableString(row.admin_reviewed_at),
    directorApprovedAt: readNullableString(row.director_approved_at),
    paidAt: readNullableString(row.paid_at),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapClaim(
  row: Record<string, unknown>,
  people: OaPerson[],
  filePaths: Map<string, string>
): ClaimRequest {
  const requestedBy = readNullableString(row.requested_by)
  const attachmentFileId = readNullableString(row.attachment_file_id)

  return {
    id: readString(row.id),
    requestedBy,
    requesterName: findPerson(people, requestedBy)?.fullName ?? "-",
    category: readString(row.category),
    expenseDate: readNullableString(row.expense_date),
    amount: readNumber(row.amount),
    description: readString(row.description),
    status: mapStatus(row.status),
    attachmentFileId,
    attachmentPath: attachmentFileId ? filePaths.get(attachmentFileId) ?? "-" : "-",
    adminReviewedAt: readNullableString(row.admin_reviewed_at),
    directorApprovedAt: readNullableString(row.director_approved_at),
    paidAt: readNullableString(row.paid_at),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapLeave(
  row: Record<string, unknown>,
  people: OaPerson[],
  filePaths: Map<string, string>
): LeaveRequest {
  const requestedBy = readNullableString(row.requested_by)
  const leaveType = readString(row.leave_type, "ANNUAL")
  const attachmentFileId = readNullableString(row.attachment_file_id)

  return {
    id: readString(row.id),
    requestedBy,
    requesterName: findPerson(people, requestedBy)?.fullName ?? "-",
    leaveType: isLeaveRequestType(leaveType) ? leaveType : "ANNUAL",
    startDate: readString(row.start_date),
    endDate: readString(row.end_date),
    totalDays: readNumber(row.total_days),
    reason: readString(row.reason),
    status: mapStatus(row.status),
    attachmentFileId,
    attachmentPath: attachmentFileId ? filePaths.get(attachmentFileId) ?? "-" : "-",
    adminReviewedAt: readNullableString(row.admin_reviewed_at),
    directorApprovedAt: readNullableString(row.director_approved_at),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapPayslip(
  row: Record<string, unknown>,
  people: OaPerson[],
  filePaths: Map<string, string>
): Payslip {
  const profileId = readNullableString(row.profile_id)
  const fileId = readNullableString(row.file_id)

  return {
    id: readString(row.id),
    profileId,
    employeeName: findPerson(people, profileId)?.fullName ?? "-",
    periodMonth: readString(row.period_month),
    grossPay: readNumber(row.gross_pay),
    deductions: readNumber(row.deductions),
    netPay: readNumber(row.net_pay),
    fileId,
    filePath: fileId ? filePaths.get(fileId) ?? "-" : "-",
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapApprovalLog(
  row: Record<string, unknown>,
  people: OaPerson[]
): ApprovalLog {
  const actorId = readNullableString(row.actor_id)

  return {
    id: readString(row.id),
    requestType: readString(row.request_type),
    requestId: readString(row.request_id),
    action: readString(row.action),
    fromStatus: row.from_status ? mapStatus(row.from_status) : null,
    toStatus: row.to_status ? mapStatus(row.to_status) : null,
    notes: readString(row.notes, ""),
    actorName: findPerson(people, actorId)?.fullName ?? "-",
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function buildUnifiedRequests(
  advances: AdvanceRequest[],
  claims: ClaimRequest[],
  leaves: LeaveRequest[]
) {
  const requests: UnifiedOaRequest[] = [
    ...advances.map((request) => ({
      id: request.id,
      requestType: "advance" as const,
      requesterName: request.requesterName,
      title: request.reason,
      amount: request.amount,
      dateText: request.neededDate ?? "-",
      status: request.status,
      createdAt: request.createdAt,
    })),
    ...claims.map((request) => ({
      id: request.id,
      requestType: "claim" as const,
      requesterName: request.requesterName,
      title: request.description,
      amount: request.amount,
      dateText: request.expenseDate ?? "-",
      status: request.status,
      createdAt: request.createdAt,
    })),
    ...leaves.map((request) => ({
      id: request.id,
      requestType: "leave" as const,
      requesterName: request.requesterName,
      title: request.reason,
      amount: request.totalDays,
      dateText: `${request.startDate} to ${request.endDate}`,
      status: request.status,
      createdAt: request.createdAt,
    })),
  ]

  return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function buildDashboard(requests: UnifiedOaRequest[], payslips: Payslip[]) {
  const pendingReview = requests.filter(
    (request) => request.status === "SUBMITTED"
  )
  const pendingDirector = requests.filter(
    (request) => request.status === "ADMIN_REVIEWED"
  )
  const approved = requests.filter(
    (request) => request.status === "DIRECTOR_APPROVED"
  )
  const rejected = requests.filter((request) => request.status === "REJECTED")

  const kpis: OaKpi[] = [
    {
      label: "Pending admin review",
      value: String(pendingReview.length),
      detail: "Submitted advance, claim, and leave requests",
    },
    {
      label: "Pending director",
      value: String(pendingDirector.length),
      detail: "Reviewed requests waiting for approval",
    },
    {
      label: "Approved",
      value: String(approved.length),
      detail: "Director-approved requests",
    },
    {
      label: "Rejected",
      value: String(rejected.length),
      detail: "Requests rejected in review",
    },
    {
      label: "Payslips",
      value: String(payslips.length),
      detail: "Visible payroll documents",
    },
  ]

  return { kpis }
}

export async function getOaPageData(): Promise<OaPageData> {
  const [
    profileRows,
    advanceRows,
    claimRows,
    leaveRows,
    payslipRows,
    approvalLogRows,
    fileRows,
  ] = await Promise.all([
    loadRows("profiles"),
    loadRows("advance_requests"),
    loadRows("claim_requests"),
    loadRows("leave_requests"),
    loadRows("payslips"),
    loadRows("approval_logs"),
    loadRows("files"),
  ])

  if (!profileRows) {
    const requests = buildUnifiedRequests(
      demoAdvanceRequests,
      demoClaimRequests,
      demoLeaveRequests
    )

    return {
      demoMode: true,
      people: demoOaPeople,
      advances: demoAdvanceRequests,
      claims: demoClaimRequests,
      leaves: demoLeaveRequests,
      payslips: demoPayslips,
      approvalLogs: demoApprovalLogs,
      requests,
      dashboard: buildDashboard(requests, demoPayslips),
    }
  }

  const people = profileRows.map(mapPerson)
  const filePaths = new Map(
    (fileRows ?? [])
      .filter((row) => readString(row.module) === "oa-actions")
      .map((row) => [readString(row.id), readString(row.object_path)])
  )
  const advances = (advanceRows ?? [])
    .map((row) => mapAdvance(row, people, filePaths))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const claims = (claimRows ?? [])
    .map((row) => mapClaim(row, people, filePaths))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const leaves = (leaveRows ?? [])
    .map((row) => mapLeave(row, people, filePaths))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const payslips = (payslipRows ?? [])
    .map((row) => mapPayslip(row, people, filePaths))
    .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth))
  const approvalLogs = (approvalLogRows ?? [])
    .map((row) => mapApprovalLog(row, people))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const requests = buildUnifiedRequests(advances, claims, leaves)

  return {
    demoMode: false,
    people,
    advances,
    claims,
    leaves,
    payslips,
    approvalLogs,
    requests,
    dashboard: buildDashboard(requests, payslips),
  }
}
