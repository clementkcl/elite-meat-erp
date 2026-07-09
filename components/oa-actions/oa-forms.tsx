"use client"

import Link from "next/link"
import {
  AlertTriangle,
  CalendarDays,
  HandCoins,
  ReceiptText,
  Save,
  Upload,
} from "lucide-react"
import { useActionState, useMemo, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  adminReviewRequestAction,
  createAdvanceRequestAction,
  createClaimRequestAction,
  createLeaveRequestAction,
  directorDecisionRequestAction,
  markOaRequestPaidAction,
  uploadPayslipAction,
} from "@/lib/oa-actions/actions"
import {
  initialOaActionState,
  type OaActionState,
} from "@/lib/oa-actions/action-state"
import {
  claimRequestCategories,
  claimRequestCategoryLabels,
  leaveRequestTypes,
  leaveRequestTypeLabels,
  type OaPerson,
  type UnifiedOaRequest,
} from "@/lib/oa-actions/types"
import { RequestApprovalTimeline } from "@/components/oa-actions/approval-timeline"
import { cn } from "@/lib/utils"

type StatefulAction = (
  state: OaActionState,
  formData: FormData
) => Promise<OaActionState>

function ActionMessage({ state }: { state: OaActionState }) {
  if (!state.message) {
    return null
  }

  return (
    <div
      className={
        state.status === "success"
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      }
    >
      {state.message}
    </div>
  )
}

function NativeSelect({
  id,
  name,
  children,
  value,
  onChange,
  required = true,
}: {
  id: string
  name: string
  children: ReactNode
  value?: string
  onChange?: (value: string) => void
  required?: boolean
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      required={required}
      onChange={(event) => onChange?.(event.target.value)}
      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {children}
    </select>
  )
}

function SubmitButton({
  pending,
  children,
  upload = false,
}: {
  pending: boolean
  children: ReactNode
  upload?: boolean
}) {
  const Icon = upload ? Upload : Save

  return (
    <Button type="submit" disabled={pending} className="min-h-12 w-full sm:w-auto">
      <Icon className="size-4" />
      {pending ? "Saving..." : children}
    </Button>
  )
}

const workerRequestOptions = [
  {
    key: "advance",
    href: "/oa-actions/advance",
    label: "Need cash advance",
    detail: "Money needed before salary or purchase.",
    icon: HandCoins,
  },
  {
    key: "claim",
    href: "/oa-actions/claim",
    label: "Claim expense",
    detail: "Paid first and need receipt claim.",
    icon: ReceiptText,
  },
  {
    key: "leave",
    href: "/oa-actions/leave",
    label: "Apply leave",
    detail: "Day off, MC, emergency, or unpaid leave.",
    icon: CalendarDays,
  },
] as const

export function OaRequestFastPath({
  active,
}: {
  active?: (typeof workerRequestOptions)[number]["key"]
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-sm font-semibold">Worker request fast path</div>
      <div className="mt-1 text-sm text-muted-foreground">
        Choose the correct request, submit the form, then check My Requests for the
        next reviewer.
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {workerRequestOptions.map((option) => {
          const Icon = option.icon
          const isActive = option.key === active

          return (
            <Link
              key={option.key}
              href={option.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-20 items-start gap-3 rounded-md border bg-background p-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "border-primary bg-primary/5 text-primary"
              )}
            >
              <span className="rounded-md border bg-background p-2">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{option.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {option.detail}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
      <Button asChild variant="outline" className="mt-3 min-h-11 w-full sm:w-auto">
        <Link href="/oa-actions/my-requests">Check My Requests</Link>
      </Button>
    </div>
  )
}

function SuccessNextStep({ state }: { state: OaActionState }) {
  if (state.status !== "success") {
    return null
  }

  const steps = ["Request submitted", "Timeline visible", "Wait for reviewer"]

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      <div className="font-semibold">Request submitted</div>
      <div className="mt-1">
        Check My Requests to see the approval timeline and who reviews next.
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border bg-white px-3 py-2">
            <div className="text-xs font-medium text-emerald-900/70">
              Next {index + 1}
            </div>
            <div className="mt-1 font-semibold">{step}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border bg-white px-3 py-2">
        Do not submit the same request again unless a reviewer asks you to fix it.
      </div>
      <Button asChild variant="outline" className="mt-3 min-h-11 w-full bg-white sm:w-auto">
        <Link href="/oa-actions/my-requests">Go to My Requests</Link>
      </Button>
    </div>
  )
}

function WorkerRequestErrorNextStep({ state }: { state: OaActionState }) {
  if (state.status !== "error") {
    return null
  }

  const steps = ["Check request type", "Fix missing details", "Submit request again"]

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <div className="font-semibold">Request not saved yet</div>
          <div className="mt-1">
            Fix the missing type, amount, date, or attachment, then submit again.
            Ask your manager if the request type is blocked.
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border bg-white px-3 py-2">
            <div className="text-xs font-medium text-amber-900/70">
              Fix {index + 1}
            </div>
            <div className="mt-1 font-semibold">{step}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PayslipUploadErrorNextStep({ state }: { state: OaActionState }) {
  if (state.status !== "error") {
    return null
  }

  const steps = ["Select employee", "Check payroll month", "Attach file again"]

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <div className="font-semibold">Payslip not saved yet</div>
          <div className="mt-1">
            Check the employee, payroll month, pay numbers, and payslip file,
            then upload again. Ask admin if the employee is missing.
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border bg-white px-3 py-2">
            <div className="text-xs font-medium text-amber-900/70">
              Fix {index + 1}
            </div>
            <div className="mt-1 font-semibold">{step}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkflowCard({
  title,
  description,
  action,
  children,
  submitLabel,
  upload,
  errorNextStep,
}: {
  title: string
  description: string
  action: StatefulAction
  children: ReactNode
  submitLabel: string
  upload?: boolean
  errorNextStep?: (state: OaActionState) => ReactNode
}) {
  const [state, formAction, pending] = useActionState(action, initialOaActionState)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {children}
          <ActionMessage state={state} />
          <SuccessNextStep state={state} />
          {errorNextStep?.(state)}
          <SubmitButton pending={pending} upload={upload}>
            {submitLabel}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

export function AdvanceRequestForm() {
  return (
    <WorkflowCard
      title="Apply advance"
      description="Submit a staff cash advance request for review."
      action={createAdvanceRequestAction}
      submitLabel="Submit advance"
      errorNextStep={(state) => <WorkerRequestErrorNextStep state={state} />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="advanceAmount">Amount</Label>
          <Input
            id="advanceAmount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            className="h-12 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="neededDate">Needed date</Label>
          <Input
            id="neededDate"
            name="neededDate"
            type="date"
            className="h-12 text-base sm:text-sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="advanceReason">Reason</Label>
        <Textarea id="advanceReason" name="reason" className="text-base sm:text-sm" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="advanceAttachment">Attachment</Label>
        <Input
          id="advanceAttachment"
          name="attachmentFile"
          type="file"
          className="h-12 text-base sm:text-sm"
        />
      </div>
    </WorkflowCard>
  )
}

export function ClaimRequestForm() {
  return (
    <WorkflowCard
      title="Apply claim"
      description="Submit expense claim details and receipt attachment."
      action={createClaimRequestAction}
      submitLabel="Submit claim"
      errorNextStep={(state) => <WorkerRequestErrorNextStep state={state} />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <NativeSelect id="category" name="category">
            {claimRequestCategories.map((category) => (
              <option key={category} value={category}>
                {claimRequestCategoryLabels[category]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expenseDate">Expense date</Label>
          <Input
            id="expenseDate"
            name="expenseDate"
            type="date"
            className="h-12 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="claimAmount">Amount</Label>
          <Input
            id="claimAmount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            className="h-12 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="claimAttachment">Receipt</Label>
          <Input
            id="claimAttachment"
            name="attachmentFile"
            type="file"
            className="h-12 text-base sm:text-sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" className="text-base sm:text-sm" />
      </div>
    </WorkflowCard>
  )
}

export function LeaveRequestForm() {
  return (
    <WorkflowCard
      title="Apply leave"
      description="Submit leave dates, type, reason, and optional supporting document."
      action={createLeaveRequestAction}
      submitLabel="Submit leave"
      errorNextStep={(state) => <WorkerRequestErrorNextStep state={state} />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="leaveType">Leave type</Label>
          <NativeSelect id="leaveType" name="leaveType">
            {leaveRequestTypes.map((type) => (
              <option key={type} value={type}>
                {leaveRequestTypeLabels[type]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalDays">Total days</Label>
          <Input
            id="totalDays"
            name="totalDays"
            type="number"
            min="0"
            step="0.5"
            className="h-12 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            className="h-12 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            className="h-12 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="leaveAttachment">Attachment</Label>
          <Input
            id="leaveAttachment"
            name="attachmentFile"
            type="file"
            className="h-12 text-base sm:text-sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="leaveReason">Reason</Label>
        <Textarea id="leaveReason" name="reason" className="text-base sm:text-sm" />
      </div>
    </WorkflowCard>
  )
}

function RequestSelect({
  id,
  requests,
  value,
  onChange,
  includePaid = false,
}: {
  id: string
  requests: UnifiedOaRequest[]
  value: string
  onChange: (value: string) => void
  includePaid?: boolean
}) {
  const rows = requests.filter((request) =>
    includePaid
      ? request.requestType !== "leave"
      : request.status !== "PAID" && request.status !== "CANCELLED"
  )

  return (
    <NativeSelect id={id} name="requestKey" value={value} onChange={onChange}>
      <option value="">Select request</option>
      {rows.map((request) => (
        <option
          key={`${request.requestType}:${request.id}`}
          value={`${request.requestType}:${request.id}`}
        >
          {request.requestType.toUpperCase()} - {request.requesterName} -{" "}
          {request.title}
        </option>
      ))}
    </NativeSelect>
  )
}

function useSelectedRequest(requests: UnifiedOaRequest[]) {
  const defaultKey = requests[0]
    ? `${requests[0].requestType}:${requests[0].id}`
    : ""
  const [requestKey, setRequestKey] = useState(defaultKey)
  const selected = useMemo(() => {
    const [requestType = "", requestId = ""] = requestKey.split(":")
    return { requestType, requestId }
  }, [requestKey])
  const selectedRequest = useMemo(
    () =>
      requests.find(
        (request) =>
          request.requestType === selected.requestType &&
          request.id === selected.requestId
      ),
    [requests, selected.requestId, selected.requestType]
  )

  return { requestKey, setRequestKey, selected, selectedRequest }
}

function reviewDecisionOptions(request?: UnifiedOaRequest) {
  if (!request) {
    return []
  }

  if (request.requestType === "advance" && request.status === "SUBMITTED") {
    return [
      { value: "ADMIN_REVIEWED", label: "Admin reviewed" },
      { value: "REJECTED", label: "Reject" },
    ]
  }

  if (request.requestType === "claim" && request.status === "SUBMITTED") {
    return [
      { value: "MANAGER_REVIEWED", label: "Manager reviewed" },
      { value: "REJECTED", label: "Reject" },
    ]
  }

  if (request.requestType === "claim" && request.status === "MANAGER_REVIEWED") {
    return [
      { value: "ADMIN_REVIEWED", label: "Admin reviewed" },
      { value: "REJECTED", label: "Reject" },
    ]
  }

  if (request.requestType === "leave" && request.status === "SUBMITTED") {
    return [
      { value: "APPROVED", label: "Approve leave" },
      { value: "REJECTED", label: "Reject" },
    ]
  }

  return []
}

function reviewNextActionText(request: UnifiedOaRequest) {
  if (request.requestType === "advance" && request.status === "SUBMITTED") {
    return "Next: admin checks the advance, then sends it to director approval or rejects it."
  }

  if (request.requestType === "claim" && request.status === "SUBMITTED") {
    return "Next: manager checks the claim, then sends it to admin review or rejects it."
  }

  if (request.requestType === "claim" && request.status === "MANAGER_REVIEWED") {
    return "Next: admin checks the receipt and details, then sends it to director approval or rejects it."
  }

  if (request.requestType === "leave" && request.status === "SUBMITTED") {
    return "Next: department manager approves or rejects this leave request."
  }

  if (request.status === "ADMIN_REVIEWED") {
    return "Next: director makes the final approval or rejection decision."
  }

  return "Next: check the timeline before saving a decision."
}

function ReviewQueueGuide({
  pendingCount,
  mode,
}: {
  pendingCount: number
  mode: "manager-admin" | "director"
}) {
  const steps =
    mode === "director"
      ? ["Open oldest", "Check timeline", "Approve or reject", "Save note"]
      : ["Open request", "Check details", "Move to next stage", "Save note"]

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Review queue guide</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Clear pending requests one by one. The timeline shows who reviews next.
          </div>
        </div>
        <div className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">
          {pendingCount} pending
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border bg-background px-3 py-3">
            <div className="text-xs font-medium text-muted-foreground">
              Step {index + 1}
            </div>
            <div className="mt-1 text-sm font-semibold">{step}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SelectedReviewNextAction({
  request,
}: {
  request?: UnifiedOaRequest
}) {
  if (!request) {
    const emptySteps = ["Queue clear", "Check timeline later", "Return to dashboard"]

    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm">
        <div className="font-semibold">No pending request in this queue.</div>
        <p className="mt-1 text-muted-foreground">
          Nothing needs review right now. New staff requests will appear here
          when your role is the next reviewer.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {emptySteps.map((step) => (
            <div key={step} className="rounded-md border bg-background px-3 py-2 font-medium">
              {step}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-background px-3 py-3 text-sm">
      <div className="font-semibold">Selected request next action</div>
      <div className="mt-1 text-muted-foreground">{reviewNextActionText(request)}</div>
    </div>
  )
}

export function AdminReviewForm({ requests }: { requests: UnifiedOaRequest[] }) {
  const reviewable = requests.filter(
    (request) =>
      request.status === "SUBMITTED" || request.status === "MANAGER_REVIEWED"
  )
  const { requestKey, setRequestKey, selected, selectedRequest } =
    useSelectedRequest(reviewable)
  const decisions = reviewDecisionOptions(selectedRequest)

  return (
    <WorkflowCard
      title="Admin review"
      description="Review submitted requests by manager/admin workflow."
      action={adminReviewRequestAction}
      submitLabel="Save review"
    >
      <input type="hidden" name="requestType" value={selected.requestType} />
      <input type="hidden" name="requestId" value={selected.requestId} />
      <ReviewQueueGuide pendingCount={reviewable.length} mode="manager-admin" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reviewRequest">Request</Label>
          <RequestSelect
            id="reviewRequest"
            requests={reviewable}
            value={requestKey}
            onChange={setRequestKey}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reviewDecision">Decision</Label>
          <NativeSelect id="reviewDecision" name="decision">
            {decisions.length === 0 ? (
              <option value="">Select a request first</option>
            ) : (
              decisions.map((decision) => (
                <option key={decision.value} value={decision.value}>
                  {decision.label}
                </option>
              ))
            )}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reviewNotes">Notes</Label>
        <Textarea id="reviewNotes" name="notes" />
      </div>
      <SelectedReviewNextAction request={selectedRequest} />
      {selectedRequest ? <RequestApprovalTimeline request={selectedRequest} /> : null}
    </WorkflowCard>
  )
}

export function DirectorDecisionForm({
  requests,
}: {
  requests: UnifiedOaRequest[]
}) {
  const approvable = requests.filter(
    (request) => request.status === "ADMIN_REVIEWED"
  )
  const { requestKey, setRequestKey, selected, selectedRequest } =
    useSelectedRequest(approvable)

  return (
    <WorkflowCard
      title="Director approval"
      description="Approve or reject requests after admin review."
      action={directorDecisionRequestAction}
      submitLabel="Save decision"
    >
      <input type="hidden" name="requestType" value={selected.requestType} />
      <input type="hidden" name="requestId" value={selected.requestId} />
      <ReviewQueueGuide pendingCount={approvable.length} mode="director" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="directorRequest">Request</Label>
          <RequestSelect
            id="directorRequest"
            requests={approvable}
            value={requestKey}
            onChange={setRequestKey}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="directorDecision">Decision</Label>
          <NativeSelect id="directorDecision" name="decision">
            <option value="DIRECTOR_APPROVED">DIRECTOR APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="directorNotes">Notes</Label>
        <Textarea id="directorNotes" name="notes" />
      </div>
      <SelectedReviewNextAction request={selectedRequest} />
      {selectedRequest ? <RequestApprovalTimeline request={selectedRequest} /> : null}
    </WorkflowCard>
  )
}

export function PaidRequestForm({ requests }: { requests: UnifiedOaRequest[] }) {
  const payable = requests.filter(
    (request) =>
      request.status === "DIRECTOR_APPROVED" && request.requestType !== "leave"
  )
  const { requestKey, setRequestKey, selected, selectedRequest } =
    useSelectedRequest(payable)

  return (
    <WorkflowCard
      title="Mark paid"
      description="Mark approved advances and claims as paid."
      action={markOaRequestPaidAction}
      submitLabel="Mark paid"
    >
      <input type="hidden" name="requestType" value={selected.requestType} />
      <input type="hidden" name="requestId" value={selected.requestId} />
      <div className="space-y-2">
        <Label htmlFor="paidRequest">Request</Label>
        <RequestSelect
          id="paidRequest"
          requests={payable}
          value={requestKey}
          onChange={setRequestKey}
          includePaid
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paidNotes">Notes</Label>
        <Textarea id="paidNotes" name="notes" />
      </div>
      {selectedRequest ? <RequestApprovalTimeline request={selectedRequest} /> : null}
    </WorkflowCard>
  )
}

export function PayslipUploadForm({ people }: { people: OaPerson[] }) {
  return (
    <WorkflowCard
      title="Upload payslip"
      description="Publish a payslip for an employee and payroll period."
      action={uploadPayslipAction}
      submitLabel="Save payslip"
      errorNextStep={(state) => <PayslipUploadErrorNextStep state={state} />}
      upload
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profileId">Employee</Label>
          <NativeSelect id="profileId" name="profileId">
            <option value="">Select employee</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodMonth">Period</Label>
          <Input
            id="periodMonth"
            name="periodMonth"
            type="month"
            className="h-12 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grossPay">Gross pay</Label>
          <Input
            id="grossPay"
            name="grossPay"
            type="number"
            min="0"
            step="0.01"
            className="h-12 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deductions">Deductions</Label>
          <Input
            id="deductions"
            name="deductions"
            type="number"
            min="0"
            step="0.01"
            className="h-12 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="payslipFile">File</Label>
          <Input
            id="payslipFile"
            name="payslipFile"
            type="file"
            className="h-12 text-base sm:text-sm"
          />
        </div>
      </div>
    </WorkflowCard>
  )
}
