export const oaRequestStatuses = [
  "SUBMITTED",
  "MANAGER_REVIEWED",
  "ADMIN_REVIEWED",
  "APPROVED",
  "DIRECTOR_APPROVED",
  "REJECTED",
  "PAID",
  "CANCELLED",
] as const

export const claimRequestCategories = [
  "FUEL",
  "PARKING",
  "PURCHASE",
  "TRANSPORT",
  "OTHER",
] as const

export const leaveRequestTypes = [
  "ANNUAL",
  "MEDICAL",
  "EMERGENCY",
  "UNPAID",
  "REPLACEMENT",
] as const

export const oaRequestTypes = ["advance", "claim", "leave"] as const

export type OaRequestStatus = (typeof oaRequestStatuses)[number]
export type ClaimRequestCategory = (typeof claimRequestCategories)[number]
export type LeaveRequestType = (typeof leaveRequestTypes)[number]
export type OaRequestType = (typeof oaRequestTypes)[number]

export const claimRequestCategoryLabels: Record<ClaimRequestCategory, string> = {
  FUEL: "Fuel",
  PARKING: "Parking",
  PURCHASE: "Purchase",
  TRANSPORT: "Transport",
  OTHER: "Other",
}

export const leaveRequestTypeLabels: Record<LeaveRequestType, string> = {
  ANNUAL: "Annual",
  MEDICAL: "Medical",
  EMERGENCY: "Emergency",
  UNPAID: "Unpaid",
  REPLACEMENT: "Replacement",
}

export type OaPerson = {
  id: string
  fullName: string
  email: string
}

export type AdvanceRequest = {
  id: string
  requestedBy: string | null
  requesterName: string
  amount: number
  neededDate: string | null
  reason: string
  status: OaRequestStatus
  attachmentFileId: string | null
  attachmentPath: string
  adminReviewedAt: string | null
  directorApprovedAt: string | null
  paidAt: string | null
  createdAt: string
}

export type ClaimRequest = {
  id: string
  requestedBy: string | null
  requesterName: string
  category: string
  expenseDate: string | null
  amount: number
  description: string
  status: OaRequestStatus
  attachmentFileId: string | null
  attachmentPath: string
  adminReviewedAt: string | null
  directorApprovedAt: string | null
  paidAt: string | null
  createdAt: string
}

export type LeaveRequest = {
  id: string
  requestedBy: string | null
  requesterName: string
  leaveType: LeaveRequestType
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  status: OaRequestStatus
  attachmentFileId: string | null
  attachmentPath: string
  adminReviewedAt: string | null
  directorApprovedAt: string | null
  createdAt: string
}

export type Payslip = {
  id: string
  profileId: string | null
  employeeName: string
  periodMonth: string
  grossPay: number
  deductions: number
  netPay: number
  fileId: string | null
  filePath: string
  createdAt: string
}

export type ApprovalLog = {
  id: string
  requestType: string
  requestId: string
  action: string
  fromStatus: OaRequestStatus | null
  toStatus: OaRequestStatus | null
  notes: string
  actorName: string
  createdAt: string
}

export type OaKpi = {
  label: string
  value: string
  detail: string
}

export type UnifiedOaRequest = {
  id: string
  requestType: OaRequestType
  requesterName: string
  title: string
  amount: number
  dateText: string
  status: OaRequestStatus
  createdAt: string
}

export type OaPageData = {
  demoMode: boolean
  people: OaPerson[]
  advances: AdvanceRequest[]
  claims: ClaimRequest[]
  leaves: LeaveRequest[]
  payslips: Payslip[]
  approvalLogs: ApprovalLog[]
  requests: UnifiedOaRequest[]
  dashboard: {
    kpis: OaKpi[]
  }
}
