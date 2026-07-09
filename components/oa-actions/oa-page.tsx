import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AdminReviewForm,
  AdvanceRequestForm,
  ClaimRequestForm,
  DirectorDecisionForm,
  LeaveRequestForm,
  OaRequestFastPath,
  PaidRequestForm,
  PayslipUploadForm,
} from "@/components/oa-actions/oa-forms"
import {
  ApprovalFlowGuide,
  ApprovalTimeline,
  RequestApprovalTimeline,
} from "@/components/oa-actions/approval-timeline"
import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { getCurrentProfile, hasAnyRole } from "@/lib/auth/session"
import type { UserRole } from "@/lib/auth/types"
import { getOaPageData } from "@/lib/oa-actions/data"
import type {
  AdvanceRequest,
  ClaimRequest,
  LeaveRequest,
  OaPageData,
  Payslip,
  UnifiedOaRequest,
} from "@/lib/oa-actions/types"

export type OaRoute =
  | "dashboard"
  | "advance"
  | "claim"
  | "leave"
  | "payslip"
  | "my-requests"

type TableRow = Record<string, string | number | boolean>

const oaRoles: UserRole[] = [
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

const workerOaRoles: UserRole[] = [
  "retail_team_general_worker",
  "delivery_team_general_worker",
  "processing_team_general_worker",
]

const elevatedOaRoles: UserRole[] = [
  "retail_manager",
  "delivery_manager",
  "processing_manager",
  "account",
  "admin",
  "director",
  "owner",
]

const payslipControlRoles: UserRole[] = ["account", "admin", "director"]

const titles: Record<OaRoute, { title: string; description: string }> = {
  dashboard: {
    title: "OA Actions Dashboard",
    description: "Review staff requests, approvals, payments, and payroll documents.",
  },
  advance: {
    title: "Advance Requests",
    description: "Submit and track staff cash advance requests.",
  },
  claim: {
    title: "Claim Requests",
    description: "Submit expense claims with receipt attachments.",
  },
  leave: {
    title: "Leave Requests",
    description: "Submit leave dates, types, and supporting documents.",
  },
  payslip: {
    title: "Payslips",
    description: "Upload payroll documents and close approved payable requests.",
  },
  "my-requests": {
    title: "My Requests",
    description: "View your own advances, claims, leave requests, and payslips.",
  },
}

const navItems: { route: OaRoute; href: string; label: string }[] = [
  { route: "dashboard", href: "/oa-actions/dashboard", label: "Dashboard" },
  { route: "advance", href: "/oa-actions/advance", label: "Advance" },
  { route: "claim", href: "/oa-actions/claim", label: "Claim" },
  { route: "leave", href: "/oa-actions/leave", label: "Leave" },
  { route: "payslip", href: "/oa-actions/payslip", label: "Payslip" },
  { route: "my-requests", href: "/oa-actions/my-requests", label: "My Requests" },
]

const requestColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "requestType", header: "Type" },
  { key: "requesterName", header: "Employee" },
  { key: "title", header: "Details" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "dateText", header: "Date" },
  { key: "status", header: "Status" },
]

const advanceColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "requesterName", header: "Employee" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "neededDate", header: "Needed" },
  { key: "reason", header: "Reason" },
  { key: "status", header: "Status" },
  { key: "attachmentPath", header: "Attachment" },
]

const claimColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "requesterName", header: "Employee" },
  { key: "category", header: "Category" },
  { key: "expenseDate", header: "Expense" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "description", header: "Description" },
  { key: "status", header: "Status" },
  { key: "attachmentPath", header: "Receipt" },
]

const leaveColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "requesterName", header: "Employee" },
  { key: "leaveType", header: "Type" },
  { key: "dateText", header: "Dates" },
  { key: "totalDays", header: "Days", align: "right" },
  { key: "reason", header: "Reason" },
  { key: "status", header: "Status" },
  { key: "attachmentPath", header: "Attachment" },
]

const payslipColumns: DataTableColumn<TableRow>[] = [
  { key: "periodMonth", header: "Period" },
  { key: "employeeName", header: "Employee" },
  { key: "grossPay", header: "Gross", align: "right" },
  { key: "deductions", header: "Deductions", align: "right" },
  { key: "netPay", header: "Net", align: "right" },
  { key: "filePath", header: "File" },
  { key: "createdAt", header: "Created" },
]

function dateText(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value))
}

function statusText(value: string) {
  return value.replaceAll("_", " ")
}

function PageHeader({
  route,
  demoMode,
  workerMode,
}: {
  route: OaRoute
  demoMode: boolean
  workerMode?: boolean
}) {
  const title =
    workerMode && route === "dashboard"
      ? {
          title: "OA Actions",
          description:
            "Submit advance, claim, leave, and check your request status.",
        }
      : titles[route]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {title.description}
        </p>
      </div>
      {demoMode ? <Badge variant="warning">Demo data</Badge> : null}
    </div>
  )
}

function OaNav({ route }: { route: OaRoute }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {navItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={item.route === route ? "default" : "outline"}
          size="sm"
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </div>
  )
}

function KpiCards({
  kpis,
}: {
  kpis: { label: string; value: string; detail: string }[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="pb-2">
            <CardDescription>{kpi.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{kpi.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function requestRows(requests: UnifiedOaRequest[]): TableRow[] {
  return requests.map((request) => ({
    createdAt: dateText(request.createdAt),
    requestType: request.requestType.toUpperCase(),
    requesterName: request.requesterName,
    title: request.title,
    amount: request.amount,
    dateText: request.dateText,
    status: statusText(request.status),
  }))
}

function advanceRows(advances: AdvanceRequest[]): TableRow[] {
  return advances.map((request) => ({
    createdAt: dateText(request.createdAt),
    requesterName: request.requesterName,
    amount: request.amount,
    neededDate: dateText(request.neededDate),
    reason: request.reason,
    status: statusText(request.status),
    attachmentPath: request.attachmentPath,
  }))
}

function claimRows(claims: ClaimRequest[]): TableRow[] {
  return claims.map((request) => ({
    createdAt: dateText(request.createdAt),
    requesterName: request.requesterName,
    category: request.category,
    expenseDate: dateText(request.expenseDate),
    amount: request.amount,
    description: request.description,
    status: statusText(request.status),
    attachmentPath: request.attachmentPath,
  }))
}

function leaveRows(leaves: LeaveRequest[]): TableRow[] {
  return leaves.map((request) => ({
    createdAt: dateText(request.createdAt),
    requesterName: request.requesterName,
    leaveType: request.leaveType,
    dateText: `${dateText(request.startDate)} to ${dateText(request.endDate)}`,
    totalDays: request.totalDays,
    reason: request.reason,
    status: statusText(request.status),
    attachmentPath: request.attachmentPath,
  }))
}

function payslipRows(payslips: Payslip[]): TableRow[] {
  return payslips.map((payslip) => ({
    periodMonth: payslip.periodMonth,
    employeeName: payslip.employeeName,
    grossPay: payslip.grossPay,
    deductions: payslip.deductions,
    netPay: payslip.netPay,
    filePath: payslip.filePath,
    createdAt: dateText(payslip.createdAt),
  }))
}

function RequestTimelineList({
  requests,
  emptyText,
}: {
  requests: UnifiedOaRequest[]
  emptyText: string
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <RequestApprovalTimeline
          key={`${request.requestType}:${request.id}`}
          request={request}
        />
      ))}
    </div>
  )
}

function workerRequestNextStep(request?: UnifiedOaRequest) {
  if (!request) {
    return "Submit an advance, claim, or leave request first. The timeline will appear here after saving."
  }

  if (request.status === "REJECTED" || request.status === "CANCELLED") {
    return "Ask the reviewer what to fix before submitting again."
  }

  if (request.status === "PAID") {
    return "Payment is done. No action is needed."
  }

  if (request.status === "APPROVED") {
    return "Leave is approved. No action is needed unless your manager asks for changes."
  }

  if (request.status === "DIRECTOR_APPROVED") {
    return "Director approved it. Account will mark payment next."
  }

  if (request.status === "ADMIN_REVIEWED") {
    return "Director reviews next. Do not submit the same request again."
  }

  if (request.status === "MANAGER_REVIEWED") {
    return "Admin reviews next. Keep the receipt or proof ready."
  }

  if (request.requestType === "advance") {
    return "Admin reviews this advance next. Wait for the timeline to move."
  }

  if (request.requestType === "claim") {
    return "Manager reviews this claim next. Keep the receipt ready."
  }

  return "Department manager reviews this leave next. Wait for approval or rejection."
}

function WorkerRequestStatusGuide({
  requests,
}: {
  requests: UnifiedOaRequest[]
}) {
  const latestRequest = [...requests].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  )[0]
  const waitingCount = requests.filter(
    (request) =>
      request.status !== "APPROVED" &&
      request.status !== "PAID" &&
      request.status !== "REJECTED" &&
      request.status !== "CANCELLED"
  ).length
  const doneCount = requests.filter(
    (request) => request.status === "APPROVED" || request.status === "PAID"
  ).length
  const stoppedCount = requests.filter(
    (request) => request.status === "REJECTED" || request.status === "CANCELLED"
  ).length
  const summary = [
    ["Waiting", waitingCount],
    ["Approved or paid", doneCount],
    ["Stopped", stoppedCount],
  ] as const

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold">My request status guide</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Check the newest request first. The timeline shows who reviews next.
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
          <Link href="/oa-actions/dashboard">Submit new request</Link>
        </Button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {summary.map(([label, value]) => (
          <div key={label} className="rounded-md border bg-background px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border bg-background p-3 text-sm">
        <div className="font-semibold">
          {latestRequest
            ? `Newest: ${latestRequest.requestType.toUpperCase()} - ${statusText(
                latestRequest.status
              )}`
            : "No request yet"}
        </div>
        <p className="mt-1 text-muted-foreground">
          {workerRequestNextStep(latestRequest)}
        </p>
      </div>
    </div>
  )
}

function WorkerOaDashboard({ requests }: { requests: UnifiedOaRequest[] }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>OA Action</CardTitle>
          <CardDescription>
            Submit a staff request or check what happens next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OaRequestFastPath />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>My request timeline</CardTitle>
          <CardDescription>
            See your submitted requests and who needs to review next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApprovalFlowGuide />
          <WorkerRequestStatusGuide requests={requests} />
          <RequestTimelineList
            requests={requests}
            emptyText="You have not submitted an OA request yet."
          />
        </CardContent>
      </Card>
    </>
  )
}

function filterOwnData(data: OaPageData, profileId?: string) {
  if (!profileId) {
    return {
      requests: data.requests,
      advances: data.advances,
      claims: data.claims,
      leaves: data.leaves,
      payslips: data.payslips,
    }
  }

  return {
    advances: data.advances.filter((advance) => advance.requestedBy === profileId),
    claims: data.claims.filter((claim) => claim.requestedBy === profileId),
    leaves: data.leaves.filter((leave) => leave.requestedBy === profileId),
    requests: data.requests.filter((request) => {
      const source = {
        advance: data.advances.find((advance) => advance.id === request.id),
        claim: data.claims.find((claim) => claim.id === request.id),
        leave: data.leaves.find((leave) => leave.id === request.id),
      }[request.requestType]

      return source?.requestedBy === profileId
    }),
    payslips: data.payslips.filter((payslip) => payslip.profileId === profileId),
  }
}

export async function OaPage({ route }: { route: OaRoute }) {
  const blocked = await moduleAccessBlock("oa_actions", "OA Actions", oaRoles)

  if (blocked) {
    return blocked
  }

  const [data, profile] = await Promise.all([
    getOaPageData(),
    getCurrentProfile(),
  ])
  const ownData = filterOwnData(data, profile?.id)
  const isWorkerOnlyProfile = profile
    ? hasAnyRole(profile, workerOaRoles) && !hasAnyRole(profile, elevatedOaRoles)
    : false
  const canManagePayslips = profile ? hasAnyRole(profile, payslipControlRoles) : false
  const visibleAdvances = isWorkerOnlyProfile ? ownData.advances : data.advances
  const visibleClaims = isWorkerOnlyProfile ? ownData.claims : data.claims
  const visibleLeaves = isWorkerOnlyProfile ? ownData.leaves : data.leaves

  return (
    <div className="space-y-5">
      <PageHeader
        route={route}
        demoMode={data.demoMode}
        workerMode={isWorkerOnlyProfile}
      />
      <OaNav route={route} />

      {route === "dashboard" ? (
        isWorkerOnlyProfile ? (
          <WorkerOaDashboard requests={ownData.requests} />
        ) : (
          <>
            <KpiCards kpis={data.dashboard.kpis} />
            <Card>
              <CardHeader>
                <CardTitle>Approval queue timeline</CardTitle>
                <CardDescription>
                  Submitted, manager review, admin review, director approval, and final decision by request.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ApprovalFlowGuide />
                <RequestTimelineList
                  requests={data.requests.slice(0, 6)}
                  emptyText="No OA requests are waiting for review."
                />
              </CardContent>
            </Card>
            <div className="grid gap-4 xl:grid-cols-2">
              <AdminReviewForm requests={data.requests} />
              <DirectorDecisionForm requests={data.requests} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent requests</CardTitle>
                <CardDescription>Latest advance, claim, and leave activity.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={requestColumns}
                  data={requestRows(data.requests).slice(0, 12)}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Approval timeline</CardTitle>
                <CardDescription>Review, approval, rejection, and payment history.</CardDescription>
              </CardHeader>
              <CardContent>
                <ApprovalTimeline logs={data.approvalLogs.slice(0, 8)} />
              </CardContent>
            </Card>
          </>
        )
      ) : null}

      {route === "advance" ? (
        <>
          <OaRequestFastPath active="advance" />
          <AdvanceRequestForm />
          <Card>
            <CardHeader>
              <CardTitle>Advance history</CardTitle>
              <CardDescription>Submitted advances and approval progress.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={advanceColumns}
                data={advanceRows(visibleAdvances)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "claim" ? (
        <>
          <OaRequestFastPath active="claim" />
          <ClaimRequestForm />
          <Card>
            <CardHeader>
              <CardTitle>Claim history</CardTitle>
              <CardDescription>Expense claims, receipts, and payment status.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={claimColumns} data={claimRows(visibleClaims)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "leave" ? (
        <>
          <OaRequestFastPath active="leave" />
          <LeaveRequestForm />
          <Card>
            <CardHeader>
              <CardTitle>Leave history</CardTitle>
              <CardDescription>Leave requests by employee and approval state.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={leaveColumns} data={leaveRows(visibleLeaves)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "payslip" ? (
        canManagePayslips ? (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <PayslipUploadForm people={data.people} />
              <PaidRequestForm requests={data.requests} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Payslips</CardTitle>
                <CardDescription>Payroll documents by employee and month.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={payslipColumns} data={payslipRows(data.payslips)} />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>My payslips</CardTitle>
              <CardDescription>Payroll documents visible to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={payslipColumns}
                data={payslipRows(ownData.payslips)}
              />
            </CardContent>
          </Card>
        )
      ) : null}

      {route === "my-requests" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>My request timeline</CardTitle>
              <CardDescription>
                See what happened, what is next, and who needs to review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApprovalFlowGuide />
              <WorkerRequestStatusGuide requests={ownData.requests} />
              <RequestTimelineList
                requests={ownData.requests}
                emptyText="You have not submitted an OA request yet."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>My requests</CardTitle>
              <CardDescription>Advances, claims, and leave linked to your profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={requestColumns}
                data={requestRows(ownData.requests)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>My payslips</CardTitle>
              <CardDescription>Payroll documents visible to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={payslipColumns}
                data={payslipRows(ownData.payslips)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>My approval timeline</CardTitle>
              <CardDescription>Recent status changes for your visible requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <ApprovalTimeline logs={data.approvalLogs.slice(0, 10)} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
