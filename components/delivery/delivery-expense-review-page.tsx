"use client"

import Link from "next/link"
import { Check, Receipt, X } from "lucide-react"
import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import {
  initialDeliveryActionState,
  type DeliveryActionState,
} from "@/lib/delivery/action-state"
import { reviewDeliveryExpenseAction } from "@/lib/delivery/actions"
import {
  deliveryExpenseStatuses,
  deliveryExpenseTypes,
  type DeliveryExpense,
  type DeliveryExpenseFilters,
  type DeliveryPerson,
  type Vehicle,
} from "@/lib/delivery/types"

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-"
  }

  return value.replace("T", " ").slice(0, 16)
}

function formatMoney(value: number) {
  return `RM ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function Message({ state }: { state: DeliveryActionState }) {
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

function ExpenseFilters({
  filters,
  drivers,
  vehicles,
}: {
  filters: DeliveryExpenseFilters
  drivers: DeliveryPerson[]
  vehicles: Vehicle[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Review driver expenses by date, driver, vehicle, type, and status.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={filters.date ?? new Date().toISOString().slice(0, 10)}
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverId">Driver</Label>
            <select
              id="driverId"
              name="driverId"
              defaultValue={filters.driverId ?? ""}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All drivers</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle</Label>
            <select
              id="vehicleId"
              name="vehicleId"
              defaultValue={filters.vehicleId ?? ""}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All vehicles</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNo}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expenseType">Type</Label>
            <select
              id="expenseType"
              name="expenseType"
              defaultValue={filters.expenseType ?? "ALL"}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">All types</option>
              {deliveryExpenseTypes.map((type) => (
                <option key={type} value={type}>
                  {label(type)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status ?? "ALL"}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              {deliveryExpenseStatuses.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="min-h-11 flex-1">
              Apply
            </Button>
            <Button asChild type="button" variant="outline" className="min-h-11">
              <Link href="/delivery/expenses">Clear</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ExpenseReviewControls({ expense }: { expense: DeliveryExpense }) {
  const [state, action, pending] = useActionState(
    reviewDeliveryExpenseAction,
    initialDeliveryActionState
  )
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null)

  if (expense.status !== "PENDING") {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        {expense.status === "APPROVED"
          ? "Approved"
          : `Rejected${expense.rejectedReason ? `: ${expense.rejectedReason}` : ""}`}
        {expense.reviewedAt ? ` on ${formatDateTime(expense.reviewedAt)}` : ""}
        {expense.reviewNote ? ` / ${expense.reviewNote}` : ""}
      </div>
    )
  }

  return (
    <form action={action} className="space-y-3 rounded-md border p-3">
      <input type="hidden" name="expenseId" value={expense.id} />
      <ExpenseReviewReadiness expense={expense} decision={decision} />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`review-note-${expense.id}`}>Review note</Label>
          <Textarea
            id={`review-note-${expense.id}`}
            name="reviewNote"
            placeholder="Optional"
            className="min-h-20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`reject-reason-${expense.id}`}>Reject reason</Label>
          <Textarea
            id={`reject-reason-${expense.id}`}
            name="rejectedReason"
            required={decision === "REJECTED"}
            placeholder={
              decision === "REJECTED"
                ? "Required before rejecting"
                : "Required only when rejecting"
            }
            className="min-h-20"
          />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="submit"
          name="status"
          value="APPROVED"
          disabled={pending}
          onClick={() => setDecision("APPROVED")}
          className="min-h-12 w-full"
        >
          <Check className="size-4" />
          Approve
        </Button>
        <Button
          type="submit"
          name="status"
          value="REJECTED"
          disabled={pending}
          variant="destructive"
          onClick={() => setDecision("REJECTED")}
          className="min-h-12 w-full"
        >
          <X className="size-4" />
          Reject
        </Button>
      </div>
      <Message state={state} />
      {state.status === "error" ? <ExpenseReviewErrorGuide /> : null}
    </form>
  )
}

function ExpenseReviewReadiness({
  expense,
  decision,
}: {
  expense: DeliveryExpense
  decision: "APPROVED" | "REJECTED" | null
}) {
  const checks = [
    {
      label: "Receipt checked",
      detail: expense.receiptUrl
        ? "Open receipt photo before approving."
        : "Receipt is unavailable; reject or ask driver to resubmit.",
      ready: Boolean(expense.receiptUrl),
    },
    {
      label: "Scope checked",
      detail: expense.deliveryId
        ? "Linked delivery can be opened for context."
        : "Standalone expense uses outlet/team scope.",
      ready: true,
    },
    {
      label: "Decision selected",
      detail:
        decision === "APPROVED"
          ? "Approving releases the standalone expense from pending review."
          : decision === "REJECTED"
            ? "Reject with a reason the driver can understand."
            : "Tap Approve or Reject after checking proof.",
      ready: Boolean(decision),
    },
  ]

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-sm font-semibold">Expense review readiness</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pending &gt; Manager review &gt; Approved or Rejected. Delivery expenses
        stay separate from OA claims in V1.
      </p>
      <div className="mt-3 grid gap-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Check
                className={
                  check.ready
                    ? "size-4 shrink-0 text-emerald-700"
                    : "size-4 shrink-0 text-amber-700"
                }
              />
              {check.label}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {check.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExpenseReviewErrorGuide() {
  const steps = ["Open receipt", "Check scope", "Add reject reason if needed"]

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-900">
        Expense review not saved yet
      </p>
      <p className="mt-1 text-sm text-red-900/75">
        Fix the blocked review step, then try again. The expense may be outside
        your outlet or delivery team.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step} className="rounded-md border bg-background/80 p-3">
            <div className="text-sm font-semibold">{step}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExpenseCard({ expense }: { expense: DeliveryExpense }) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{label(expense.expenseType)}</div>
              <div className="text-sm text-muted-foreground">
                {expense.driverName} / {expense.vehicleNo}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={expense.status} />
              <span className="text-lg font-semibold tabular-nums">
                {formatMoney(expense.amount)}
              </span>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <div>
              <div className="text-foreground">Submitted</div>
              <div>{formatDateTime(expense.createdAt)}</div>
            </div>
            <div>
              <div className="text-foreground">Delivery</div>
              <div>{expense.deliveryId ?? "No delivery link"}</div>
            </div>
            <div>
              <div className="text-foreground">Scope</div>
              <div>{expense.outletId ?? "-"} / {expense.deliveryTeamId ?? "-"}</div>
            </div>
          </div>
          {expense.remark ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              {expense.remark}
            </div>
          ) : null}
          {expense.receiptUrl ? (
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <Receipt className="size-4" />
              View receipt photo
            </a>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt className="size-4" />
              Receipt photo unavailable
            </div>
          )}
          {expense.deliveryId ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/delivery/${expense.deliveryId}`}>Open Delivery</Link>
            </Button>
          ) : null}
        </div>
        <ExpenseReviewControls expense={expense} />
      </CardContent>
    </Card>
  )
}

function ExpenseReviewGuide({ expenses }: { expenses: DeliveryExpense[] }) {
  const pending = expenses.filter((expense) => expense.status === "PENDING")
  const firstPending = pending[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense review queue</CardTitle>
        <CardDescription>
          Review pending driver receipt claims before normal delivery reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-sm font-semibold">
            {firstPending ? "Start here" : "Queue clear"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {firstPending
              ? "Open the first pending receipt, check delivery or scope, then approve or reject."
              : "No pending delivery expenses need action for the current filters."}
          </p>
        </div>
        {firstPending ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Driver</div>
              <div className="mt-1 text-sm font-semibold">
                {firstPending.driverName}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {firstPending.vehicleNo}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Claim</div>
              <div className="mt-1 text-sm font-semibold">
                {label(firstPending.expenseType)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {formatMoney(firstPending.amount)}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Next action</div>
              <div className="mt-1 text-sm font-semibold">
                Open receipt proof
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Pending standalone review
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {["Return to Dashboard", "Check filters", "Review later"].map((step) => (
              <div key={step} className="rounded-md border p-3">
                <div className="text-sm font-semibold">{step}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DeliveryExpenseReviewPage({
  expenses,
  filters,
  drivers,
  vehicles,
  loadError,
}: {
  expenses: DeliveryExpense[]
  filters: DeliveryExpenseFilters
  drivers: DeliveryPerson[]
  vehicles: Vehicle[]
  loadError?: string | null
}) {
  const pendingCount = expenses.filter((expense) => expense.status === "PENDING").length
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Delivery Expenses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review driver receipt claims and approval status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/delivery">Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/delivery/driver">Driver Page</Link>
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Delivery expenses could not load. Check database migrations and permissions.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Expense Records</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {expenses.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pending Review</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Amount</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              {formatMoney(totalAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <ExpenseFilters filters={filters} drivers={drivers} vehicles={vehicles} />
      <ExpenseReviewGuide expenses={expenses} />

      <div className="space-y-3">
        {expenses.length === 0 ? (
          <EmptyState
            title="No expenses found"
            description="Driver expense submissions matching the filters will appear here."
            className="rounded-md border border-dashed"
          />
        ) : (
          expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))
        )}
      </div>
    </div>
  )
}
