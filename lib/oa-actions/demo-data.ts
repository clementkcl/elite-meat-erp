import type {
  AdvanceRequest,
  ApprovalLog,
  ClaimRequest,
  LeaveRequest,
  OaPerson,
  Payslip,
} from "@/lib/oa-actions/types"

export const demoOaPeople: OaPerson[] = [
  {
    id: "demo-user",
    fullName: "Demo Admin",
    email: "demo@elitemeat.local",
  },
  {
    id: "demo-worker",
    fullName: "Demo Worker",
    email: "worker@elitemeat.local",
  },
]

export const demoAdvanceRequests: AdvanceRequest[] = [
  {
    id: "advance-demo-001",
    requestedBy: "demo-worker",
    requesterName: "Demo Worker",
    amount: 300,
    neededDate: "2026-06-15",
    reason: "Transport and meal advance",
    status: "SUBMITTED",
    attachmentFileId: null,
    attachmentPath: "-",
    adminReviewedAt: null,
    directorApprovedAt: null,
    paidAt: null,
    createdAt: "2026-06-10T08:00:00.000Z",
  },
]

export const demoClaimRequests: ClaimRequest[] = [
  {
    id: "claim-demo-001",
    requestedBy: "demo-worker",
    requesterName: "Demo Worker",
    category: "TRANSPORT",
    expenseDate: "2026-06-10",
    amount: 45.5,
    description: "Delivery support transport",
    status: "ADMIN_REVIEWED",
    attachmentFileId: null,
    attachmentPath: "-",
    adminReviewedAt: "2026-06-10T10:15:00.000Z",
    directorApprovedAt: null,
    paidAt: null,
    createdAt: "2026-06-10T09:30:00.000Z",
  },
]

export const demoLeaveRequests: LeaveRequest[] = [
  {
    id: "leave-demo-001",
    requestedBy: "demo-worker",
    requesterName: "Demo Worker",
    leaveType: "ANNUAL",
    startDate: "2026-06-20",
    endDate: "2026-06-20",
    totalDays: 1,
    reason: "Family matter",
    status: "APPROVED",
    attachmentFileId: null,
    attachmentPath: "-",
    adminReviewedAt: "2026-06-10T11:00:00.000Z",
    directorApprovedAt: null,
    createdAt: "2026-06-09T15:00:00.000Z",
  },
]

export const demoPayslips: Payslip[] = [
  {
    id: "payslip-demo-001",
    profileId: "demo-worker",
    employeeName: "Demo Worker",
    periodMonth: "2026-06-01",
    grossPay: 2800,
    deductions: 280,
    netPay: 2520,
    fileId: null,
    filePath: "-",
    createdAt: "2026-06-10T12:30:00.000Z",
  },
]

export const demoApprovalLogs: ApprovalLog[] = [
  {
    id: "approval-log-demo-001",
    requestType: "claim",
    requestId: "claim-demo-001",
    action: "ADMIN_REVIEWED",
    fromStatus: "SUBMITTED",
    toStatus: "ADMIN_REVIEWED",
    notes: "Receipt checked",
    actorName: "Demo Admin",
    createdAt: "2026-06-10T10:15:00.000Z",
  },
]
