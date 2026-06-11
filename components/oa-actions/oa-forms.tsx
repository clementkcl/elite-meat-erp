"use client"

import { Save, Upload } from "lucide-react"
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
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
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
    <Button type="submit" disabled={pending}>
      <Icon className="size-4" />
      {pending ? "Saving..." : children}
    </Button>
  )
}

function WorkflowCard({
  title,
  description,
  action,
  children,
  submitLabel,
  upload,
}: {
  title: string
  description: string
  action: StatefulAction
  children: ReactNode
  submitLabel: string
  upload?: boolean
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
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="advanceAmount">Amount</Label>
          <Input id="advanceAmount" name="amount" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="neededDate">Needed date</Label>
          <Input id="neededDate" name="neededDate" type="date" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="advanceReason">Reason</Label>
        <Textarea id="advanceReason" name="reason" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="advanceAttachment">Attachment</Label>
        <Input id="advanceAttachment" name="attachmentFile" type="file" />
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
          <Input id="expenseDate" name="expenseDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="claimAmount">Amount</Label>
          <Input id="claimAmount" name="amount" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="claimAttachment">Receipt</Label>
          <Input id="claimAttachment" name="attachmentFile" type="file" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" />
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
          <Input id="totalDays" name="totalDays" type="number" min="0" step="0.5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="leaveAttachment">Attachment</Label>
          <Input id="leaveAttachment" name="attachmentFile" type="file" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="leaveReason">Reason</Label>
        <Textarea id="leaveReason" name="reason" />
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
  const { requestKey, setRequestKey, selected } = useSelectedRequest(approvable)

  return (
    <WorkflowCard
      title="Director approval"
      description="Approve or reject requests after admin review."
      action={directorDecisionRequestAction}
      submitLabel="Save decision"
    >
      <input type="hidden" name="requestType" value={selected.requestType} />
      <input type="hidden" name="requestId" value={selected.requestId} />
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
    </WorkflowCard>
  )
}

export function PaidRequestForm({ requests }: { requests: UnifiedOaRequest[] }) {
  const payable = requests.filter(
    (request) =>
      request.status === "DIRECTOR_APPROVED" && request.requestType !== "leave"
  )
  const { requestKey, setRequestKey, selected } = useSelectedRequest(payable)

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
          <Input id="periodMonth" name="periodMonth" type="month" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grossPay">Gross pay</Label>
          <Input id="grossPay" name="grossPay" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deductions">Deductions</Label>
          <Input
            id="deductions"
            name="deductions"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="payslipFile">File</Label>
          <Input id="payslipFile" name="payslipFile" type="file" />
        </div>
      </div>
    </WorkflowCard>
  )
}
