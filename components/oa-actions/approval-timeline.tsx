import { CheckCircle2, Circle, Clock3, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"
import type {
  ApprovalLog,
  OaRequestStatus,
  UnifiedOaRequest,
} from "@/lib/oa-actions/types"

type TimelineStepState = "done" | "current" | "pending" | "rejected" | "skipped"

type TimelineStep = {
  label: string
  detail: string
  state: TimelineStepState
}

function dateText(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusText(value: string) {
  return value.replaceAll("_", " ")
}

function isRejected(status: OaRequestStatus) {
  return status === "REJECTED" || status === "CANCELLED"
}

function isCompleted(status: OaRequestStatus) {
  return status === "APPROVED" || status === "DIRECTOR_APPROVED" || status === "PAID"
}

function stepState(
  status: OaRequestStatus,
  doneStatuses: OaRequestStatus[],
  currentStatuses: OaRequestStatus[],
  skipped = false
): TimelineStepState {
  if (isRejected(status)) {
    return "rejected"
  }

  if (skipped) {
    return "skipped"
  }

  if (doneStatuses.includes(status)) {
    return "done"
  }

  if (currentStatuses.includes(status)) {
    return "current"
  }

  return "pending"
}

function requestTimelineSteps(request: UnifiedOaRequest): TimelineStep[] {
  const status = request.status
  const finalState: TimelineStepState = isRejected(status)
    ? "rejected"
    : isCompleted(status)
      ? "done"
      : "pending"

  return [
    {
      label: "Submitted",
      detail: "Worker sent the request.",
      state: "done",
    },
    {
      label: "Manager Review",
      detail:
        request.requestType === "advance"
          ? "Not required for advance."
          : "Department manager checks the request.",
      state: stepState(
        status,
        ["MANAGER_REVIEWED", "ADMIN_REVIEWED", "APPROVED", "DIRECTOR_APPROVED", "PAID"],
        ["SUBMITTED"],
        request.requestType === "advance"
      ),
    },
    {
      label: "Admin Review",
      detail:
        request.requestType === "leave"
          ? "Not required for leave."
          : "Admin checks documents and details.",
      state: stepState(
        status,
        ["ADMIN_REVIEWED", "DIRECTOR_APPROVED", "PAID"],
        request.requestType === "claim" ? ["MANAGER_REVIEWED"] : ["SUBMITTED"],
        request.requestType === "leave"
      ),
    },
    {
      label: "Director Approval",
      detail:
        request.requestType === "leave"
          ? "Not required for leave."
          : "Director makes the final approval decision.",
      state: stepState(
        status,
        ["DIRECTOR_APPROVED", "PAID"],
        ["ADMIN_REVIEWED"],
        request.requestType === "leave"
      ),
    },
    {
      label: "Approved/Rejected",
      detail:
        status === "PAID"
          ? "Approved and paid."
          : isRejected(status)
            ? "Request was rejected."
            : isCompleted(status)
              ? "Request was approved."
              : "Waiting for final decision.",
      state: finalState,
    },
  ]
}

function stepIcon(state: TimelineStepState) {
  if (state === "done") {
    return <CheckCircle2 className="size-4" />
  }

  if (state === "rejected") {
    return <XCircle className="size-4" />
  }

  if (state === "current") {
    return <Clock3 className="size-4" />
  }

  return <Circle className="size-4" />
}

function stepBadge(state: TimelineStepState) {
  if (state === "done") {
    return <Badge variant="success">Done</Badge>
  }

  if (state === "rejected") {
    return <Badge variant="destructive">Stopped</Badge>
  }

  if (state === "current") {
    return <Badge variant="warning">Now</Badge>
  }

  if (state === "skipped") {
    return <Badge variant="outline">Not required</Badge>
  }

  return <Badge variant="secondary">Next</Badge>
}

export function ApprovalFlowGuide() {
  const stages = [
    "Submitted",
    "Manager Review",
    "Admin Review",
    "Director Approval",
    "Approved/Rejected",
  ]

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-sm font-semibold">Approval flow</div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {stages.map((stage, index) => (
          <span key={stage} className="flex items-center gap-2">
            <span className="rounded-md border bg-background px-2 py-1 font-medium text-foreground">
              {stage}
            </span>
            {index < stages.length - 1 ? <span aria-hidden>-&gt;</span> : null}
          </span>
        ))}
      </div>
    </div>
  )
}

export function RequestApprovalTimeline({
  request,
}: {
  request: UnifiedOaRequest
}) {
  const steps = requestTimelineSteps(request)

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {request.requestType.toUpperCase()} - {request.requesterName}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {request.title}
          </div>
        </div>
        <StatusBadge value={request.status} />
      </div>
      <ol className="mt-4 grid gap-3 md:grid-cols-5">
        {steps.map((step) => (
          <li
            key={step.label}
            className={cn(
              "min-w-0 rounded-md border p-3 text-sm",
              step.state === "done" && "border-emerald-200 bg-emerald-50/70",
              step.state === "current" && "border-amber-200 bg-amber-50/70",
              step.state === "rejected" && "border-red-200 bg-red-50/70",
              step.state === "skipped" && "bg-muted/40 text-muted-foreground"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "rounded-md border bg-background p-1",
                  step.state === "done" && "text-emerald-700",
                  step.state === "current" && "text-amber-700",
                  step.state === "rejected" && "text-red-700"
                )}
              >
                {stepIcon(step.state)}
              </span>
              {stepBadge(step.state)}
            </div>
            <div className="mt-3 font-medium">{step.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {step.detail}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function ApprovalTimeline({ logs }: { logs: ApprovalLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
        No approval activity yet.
      </div>
    )
  }

  return (
    <ol className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="rounded-md border p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-medium">
                {statusText(log.action)} by {log.actorName}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {log.requestType.toUpperCase()} | {dateText(log.createdAt)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {log.fromStatus ? <StatusBadge value={log.fromStatus} /> : null}
              {log.toStatus ? <StatusBadge value={log.toStatus} /> : null}
            </div>
          </div>
          {log.notes ? (
            <div className="mt-2 text-sm text-muted-foreground">{log.notes}</div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
