"use client"

import {
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Receipt,
  Save,
  Upload,
} from "lucide-react"
import {
  useActionState,
  useMemo,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react"

import { Badge } from "@/components/ui/badge"
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
  completeRetailCleaningTaskAction,
  confirmRetailDailySaleAction,
  createRetailCleaningTaskAction,
  createRetailExpenseAction,
  createRetailProcessingBatchAction,
  recordRetailDailySaleAction,
  reviewRetailProcessingBatchAction,
  submitRetailDailyClosingAction,
  updateRetailExpenseAction,
  updateRetailExpenseStatusAction,
  upsertRetailExpenseCategoryAction,
  upsertRetailProcessingBomAction,
} from "@/lib/retail/actions"
import type { CurrentProfile } from "@/lib/auth/types"
import {
  initialRetailActionState,
  type RetailActionState,
} from "@/lib/retail/action-state"
import {
  retailCleaningFrequencies,
  retailExpensePaymentMethods,
  retailExpenseStatuses,
  type RetailCleaningTask,
  type RetailDailySale,
  type RetailDepartment,
  type RetailExpense,
  type RetailExpenseCategory,
  type RetailItem,
  type RetailOutlet,
  type RetailProcessingBatch,
  type RetailProcessingBom,
} from "@/lib/retail/types"

type StatefulAction = (
  state: RetailActionState,
  formData: FormData
) => Promise<RetailActionState>

function ActionMessage({ state }: { state: RetailActionState }) {
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
  required = true,
  ...props
}: {
  id: string
  name: string
  children: ReactNode
  required?: boolean
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "name" | "children">) {
  return (
    <select
      id={id}
      name={name}
      required={required}
      {...props}
      className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {children}
    </select>
  )
}

function SubmitButton({
  pending,
  children,
  icon = "save",
  pendingLabel = "Saving...",
}: {
  pending: boolean
  children: ReactNode
  icon?: "save" | "receipt" | "cash"
  pendingLabel?: string
}) {
  const Icon = icon === "receipt" ? Receipt : icon === "cash" ? Banknote : Save

  return (
    <Button
      type="submit"
      disabled={pending}
      className="fixed inset-x-4 bottom-4 z-40 min-h-14 text-base shadow-lg sm:static sm:w-auto sm:shadow-none"
    >
      <Icon className="size-4" />
      {pending ? pendingLabel : children}
    </Button>
  )
}

type SuccessAction = {
  href: string
  label: string
}

function WorkflowCard({
  title,
  description,
  action,
  children,
  submitLabel,
  submitIcon,
  successActions = [],
  errorNextStep,
  successNextStep,
}: {
  title: string
  description: string
  action: StatefulAction
  children: ReactNode
  submitLabel: string
  submitIcon?: "save" | "receipt" | "cash"
  successActions?: SuccessAction[]
  errorNextStep?: ReactNode
  successNextStep?: ReactNode
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialRetailActionState
  )
  const [pendingLabel, setPendingLabel] = useState("Saving...")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="space-y-4 pb-20 sm:pb-0"
          onSubmit={(event) => {
            const hasFile = Array.from(
              event.currentTarget.querySelectorAll<HTMLInputElement>(
                'input[type="file"]'
              )
            ).some((input) => Boolean(input.files?.length))

            setPendingLabel(hasFile ? "Uploading..." : "Saving...")
          }}
        >
          {children}
          <ActionMessage state={state} />
          {state.status === "error" && errorNextStep ? errorNextStep : null}
          {state.status === "success" && successNextStep ? successNextStep : null}
          {state.status === "success" && successActions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {successActions.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full justify-start"
                >
                  <a href={item.href}>{item.label}</a>
                </Button>
              ))}
            </div>
          ) : null}
          {state.status === "success" && successActions.length > 0 ? null : (
            <SubmitButton
              pending={pending}
              pendingLabel={pendingLabel}
              icon={submitIcon}
            >
              {submitLabel}
            </SubmitButton>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

function FileUploadField({
  id,
  name,
  label,
  accept,
  required = false,
  onSelectedChange,
}: {
  id: string
  name: string
  label: string
  accept?: string
  required?: boolean
  onSelectedChange?: (selected: boolean) => void
}) {
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState("")

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          event.currentTarget.setCustomValidity("")
          const selectedFileName = event.target.files?.[0]?.name ?? ""
          setFileName(selectedFileName)
          onSelectedChange?.(Boolean(selectedFileName))
          setError("")
        }}
        onInvalid={(event) => {
          if (required) {
            event.currentTarget.setCustomValidity("Receipt is required.")
            setError("Receipt is required.")
          }
        }}
      />
      {fileName ? (
        <div className="flex min-h-9 items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
          <Upload className="size-4 shrink-0 text-emerald-600" />
          <span className="min-w-0 truncate">Selected file: {fileName}</span>
        </div>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function OutletSelect({
  outlets,
  value,
  onValueChange,
  required = false,
  emptyLabel = "All outlets",
}: {
  outlets: RetailOutlet[]
  value?: string
  onValueChange?: (value: string) => void
  required?: boolean
  emptyLabel?: string
}) {
  return (
    <NativeSelect
      id="outletId"
      name="outletId"
      required={required}
      value={value}
      onChange={
        onValueChange
          ? (event) => onValueChange(event.target.value)
          : undefined
      }
    >
      <option value="">{emptyLabel}</option>
      {outlets.map((outlet) => (
        <option key={outlet.id} value={outlet.id}>
          {outlet.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function canChooseScope(profile: CurrentProfile) {
  return profile.roles.includes("admin") || profile.roles.includes("director")
}

function canConfirmDailySales(profile: CurrentProfile) {
  return (
    profile.roles.includes("retail_manager") ||
    profile.roles.includes("admin") ||
    profile.roles.includes("director")
  )
}

function ScopeDisplay({ label }: { label: string }) {
  return (
    <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function OutletScopeField({
  profile,
  outlets,
  selectedOutletId,
  onOutletChange,
  outletRequired = false,
  emptyLabel = "All outlets",
}: {
  profile: CurrentProfile
  outlets: RetailOutlet[]
  selectedOutletId?: string
  onOutletChange?: (value: string) => void
  outletRequired?: boolean
  emptyLabel?: string
}) {
  if (canChooseScope(profile)) {
    return (
      <div className="space-y-2">
        <Label htmlFor="outletId">Outlet</Label>
        <OutletSelect
          outlets={outlets}
          value={selectedOutletId}
          onValueChange={onOutletChange}
          required={outletRequired}
          emptyLabel={emptyLabel}
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Viewing outlet</Label>
      <input type="hidden" name="outletId" value={profile.outletId ?? ""} />
      <ScopeDisplay label={profile.outletName ?? "Assigned outlet"} />
    </div>
  )
}

function DepartmentSelect({
  departments,
}: {
  departments: RetailDepartment[]
}) {
  return (
    <NativeSelect id="departmentId" name="departmentId" required={false}>
      <option value="">No department</option>
      {departments.map((department) => (
        <option key={department.id} value={department.id}>
          {department.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function DepartmentScopeField({
  profile,
  departments,
}: {
  profile: CurrentProfile
  departments: RetailDepartment[]
}) {
  if (canChooseScope(profile)) {
    return (
      <div className="space-y-2">
        <Label htmlFor="departmentId">Department</Label>
        <DepartmentSelect departments={departments} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Viewing department</Label>
      <input
        type="hidden"
        name="departmentId"
        value={profile.departmentId ?? ""}
      />
      <ScopeDisplay label={profile.departmentName ?? "Assigned department"} />
    </div>
  )
}

function ExpenseSelect({
  expenses,
  value,
  onValueChange,
}: {
  expenses: RetailExpense[]
  value?: string
  onValueChange?: (value: string) => void
}) {
  const reviewableExpenses = expenses.filter(
    (expense) => expense.status === "SUBMITTED"
  )

  return (
    <NativeSelect
      id="expenseId"
      name="expenseId"
      value={value}
      onChange={
        onValueChange
          ? (event) => onValueChange(event.target.value)
          : undefined
      }
    >
      <option value="">Select expense</option>
      {reviewableExpenses.map((expense) => (
        <option key={expense.id} value={expense.id}>
          {expense.expenseDate} - {expense.category} - RM{" "}
          {expense.amount.toFixed(2)}
        </option>
      ))}
    </NativeSelect>
  )
}

export function RetailDailySaleForm({
  outlets,
  profile,
}: {
  outlets: RetailOutlet[]
  profile: CurrentProfile
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [outletId, setOutletId] = useState(profile.outletId ?? "")
  const [cashSales, setCashSales] = useState("0")
  const [bankTransferSales, setBankTransferSales] = useState("0")
  const [ewalletSales, setEwalletSales] = useState("0")
  const [creditSales, setCreditSales] = useState("0")
  const canSelectOutlet = canChooseScope(profile)
  const canConfirm = canConfirmDailySales(profile)
  const totalSales = useMemo(
    () =>
      [cashSales, bankTransferSales, ewalletSales, creditSales].reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      ),
    [bankTransferSales, cashSales, creditSales, ewalletSales]
  )

  return (
    <WorkflowCard
      title="Daily Sales"
      description={
        canConfirm
          ? "Enter and confirm today's AutoCount sales summary."
          : "Save today's AutoCount sales totals as a draft for manager confirmation."
      }
      action={recordRetailDailySaleAction}
      submitLabel={canConfirm ? "Confirm Daily Sales" : "Save draft"}
      submitIcon="receipt"
      successActions={
        canConfirm
          ? [
              { href: "/retail/cash-closing", label: "Go to Cash Closing" },
              { href: "/retail", label: "Back to Retail Home" },
            ]
          : [{ href: "/retail", label: "Back to Retail Home" }]
      }
    >
      <DailySalesReadiness
        outletSelected={Boolean(outletId)}
        totalSales={totalSales}
        canConfirm={canConfirm}
      />
      <input type="hidden" name="status" value={canConfirm ? "CONFIRMED" : "DRAFT"} />
      <div className="grid gap-4 md:grid-cols-2">
        {canSelectOutlet ? (
          <div className="space-y-2">
            <Label htmlFor="outletId">Outlet</Label>
            <NativeSelect
              id="outletId"
              name="outletId"
              required={false}
              value={outletId}
              onChange={(event) => setOutletId(event.target.value)}
            >
              <option value="">Select outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Viewing outlet</Label>
            <input type="hidden" name="outletId" value={profile.outletId ?? ""} />
            <ScopeDisplay label={profile.outletName ?? "Assigned outlet"} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Sales date</Label>
          <input type="hidden" name="salesDate" value={today} />
          <ScopeDisplay label={`Today: ${today}`} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cashSales">Cash sales</Label>
          <Input
            id="cashSales"
            name="cashSales"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={cashSales}
            onChange={(event) => setCashSales(event.target.value)}
            className="min-h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankTransferSales">Bank transfer sales</Label>
          <Input
            id="bankTransferSales"
            name="bankTransferSales"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={bankTransferSales}
            onChange={(event) => setBankTransferSales(event.target.value)}
            className="min-h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ewalletSales">E-wallet / DuitNow sales</Label>
          <Input
            id="ewalletSales"
            name="ewalletSales"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={ewalletSales}
            onChange={(event) => setEwalletSales(event.target.value)}
            className="min-h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="creditSales">Credit sales</Label>
          <Input
            id="creditSales"
            name="creditSales"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={creditSales}
            onChange={(event) => setCreditSales(event.target.value)}
            className="min-h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalSales">Total sales</Label>
          <Input
            id="totalSales"
            name="totalSales"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={totalSales.toFixed(2)}
            readOnly
            className="min-h-11 text-base"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <input type="hidden" name="autocountAttachmentUrl" value="" />
          <FileUploadField
            id="autocountAttachmentFile"
            name="autocountAttachmentFile"
            label="AutoCount report / receipt file"
            accept="image/*,.pdf,.csv,.xlsx,.xls"
          />
        </div>
      </div>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Remarks (optional)
        </summary>
        <div className="mt-3 space-y-2">
          <Label htmlFor="dailySaleRemarks">Remarks</Label>
          <Textarea id="dailySaleRemarks" name="remarks" />
        </div>
      </details>
    </WorkflowCard>
  )
}

function CashClosingReadiness({
  outletSelected,
  hasSalesSummary,
  hasDraftSales,
  actualCashCounted,
  variance,
}: {
  outletSelected: boolean
  hasSalesSummary: boolean
  hasDraftSales: boolean
  actualCashCounted: string
  variance: number
}) {
  const cashCounted = actualCashCounted.trim().length > 0
  const checks = [
    {
      label: "Outlet selected",
      detail: outletSelected ? "Cash closing has an outlet." : "Select outlet first.",
      ready: outletSelected,
    },
    {
      label: "Daily sales found",
      detail: hasSalesSummary
        ? "Cash sales are pulled from Daily Sales."
        : hasDraftSales
          ? "Daily Sales is still draft. Confirm it before Cash Closing."
          : "Record and confirm Daily Sales first.",
      ready: hasSalesSummary,
    },
    {
      label: "Cash counted",
      detail: cashCounted
        ? `Actual cash counted: RM ${Number(actualCashCounted).toFixed(2)}`
        : "Count the drawer cash before saving.",
      ready: cashCounted,
    },
    {
      label: "Variance checked",
      detail:
        Math.abs(variance) > 0
          ? "Variance is not zero. Warning only; save is allowed."
          : "Variance is zero.",
      ready: true,
    },
  ]

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Cash closing readiness</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Check sales, cash counted, and variance before tapping Save closing.
          </p>
        </div>
        {!hasSalesSummary ? (
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <a href="/retail/sales">Record Daily Sales</a>
          </Button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2
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

function CashClosingFinalChecklist() {
  const items = [
    "Cash closing saved",
    "Variance checked",
    "Cash kept for next opening",
    "Receipts ready for manager/admin review",
  ]

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
      <div className="text-sm font-semibold text-emerald-900">
        Final checklist
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-md border bg-background/80 p-3 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DailySalesReadiness({
  outletSelected,
  totalSales,
  canConfirm,
}: {
  outletSelected: boolean
  totalSales: number
  canConfirm: boolean
}) {
  const hasSalesAmount = totalSales > 0
  const checks = [
    {
      label: "Outlet selected",
      detail: outletSelected
        ? "Sales summary has an outlet."
        : "Select outlet before saving.",
      ready: outletSelected,
    },
    {
      label: "AutoCount totals entered",
      detail: hasSalesAmount
        ? `Total sales: RM ${totalSales.toFixed(2)}`
        : "Enter at least one payment total from AutoCount.",
      ready: hasSalesAmount,
    },
    {
      label: "Payment split checked",
      detail: "Cash, bank, e-wallet, and credit add up automatically.",
      ready: true,
    },
    {
      label: canConfirm ? "Next step ready" : "Manager confirmation",
      detail: canConfirm
        ? "After confirming, go to Cash Closing for the same outlet and date."
        : "Manager must confirm this draft before Cash Closing.",
      ready: true,
    },
  ]

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-sm font-semibold">Daily sales readiness</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Copy totals from AutoCount, attach the report if available, then save the
        sales summary.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2
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
      {!hasSalesAmount ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Daily sales total is zero. Check AutoCount before saving.
        </div>
      ) : null}
    </div>
  )
}

export function RetailDailySaleConfirmForm({
  sales,
}: {
  sales: RetailDailySale[]
}) {
  const drafts = sales.filter((sale) => sale.status === "DRAFT")
  const [state, formAction, pending] = useActionState(
    confirmRetailDailySaleAction,
    initialRetailActionState
  )

  if (drafts.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
      <div>
        <div className="text-sm font-semibold text-amber-950">
          Draft Daily Sales waiting for manager confirmation
        </div>
        <p className="mt-1 text-sm text-amber-900">
          Confirm the draft before Cash Closing uses the sales numbers.
        </p>
      </div>
      <ActionMessage state={state} />
      <div className="grid gap-2">
        {drafts.map((sale) => (
          <form key={sale.id} action={formAction}>
            <input type="hidden" name="saleId" value={sale.id} />
            <Button
              type="submit"
              disabled={pending}
              className="min-h-12 w-full justify-start"
            >
              <CheckCircle2 className="size-4" />
              {pending ? "Confirming..." : `Confirm ${sale.outletName} Daily Sales`}
            </Button>
          </form>
        ))}
      </div>
    </div>
  )
}

export function RetailDailyClosingForm({
  outlets,
  dailySales,
  expenses,
  profile,
}: {
  outlets: RetailOutlet[]
  dailySales: RetailDailySale[]
  expenses: RetailExpense[]
  profile: CurrentProfile
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [closingDate, setClosingDate] = useState(today)
  const [outletId, setOutletId] = useState(profile.outletId ?? "")
  const [openingCash, setOpeningCash] = useState("0")
  const [actualCashCounted, setActualCashCounted] = useState("0")
  const matchingSale = dailySales.find(
    (sale) =>
      sale.outletId === outletId &&
      sale.salesDate === closingDate &&
      sale.status === "CONFIRMED"
  )
  const draftSale = dailySales.find(
    (sale) =>
      sale.outletId === outletId &&
      sale.salesDate === closingDate &&
      sale.status === "DRAFT"
  )
  const cashExpenses = expenses
    .filter(
      (expense) =>
        expense.outletId === outletId &&
        expense.expenseDate === closingDate &&
        expense.paymentMethod === "CASH" &&
        expense.status !== "REJECTED" &&
        expense.status !== "CANCELLED"
    )
    .reduce((sum, expense) => sum + expense.amount, 0)
  const expectedCash =
    (Number(openingCash) || 0) + (matchingSale?.cashSales ?? 0) - cashExpenses
  const variance = (Number(actualCashCounted) || 0) - expectedCash

  return (
    <WorkflowCard
      title="Cash Closing"
      description="Daily cash closing from the outlet sales summary."
      action={submitRetailDailyClosingAction}
      submitLabel="Save closing"
      submitIcon="cash"
      successActions={[
        { href: "/retail/reports/outlet", label: "Go to Outlet Report" },
        { href: "/retail", label: "Back to Retail Home" },
      ]}
      successNextStep={<CashClosingFinalChecklist />}
    >
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <span className="font-medium">Expected Cash</span> = Opening Cash + Cash
        Sales - Cash Expenses
      </div>
      <CashClosingReadiness
        outletSelected={Boolean(outletId)}
        hasSalesSummary={Boolean(matchingSale)}
        hasDraftSales={Boolean(draftSale)}
        actualCashCounted={actualCashCounted}
        variance={variance}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {canChooseScope(profile) ? (
          <div className="space-y-2">
            <Label htmlFor="outletId">Outlet</Label>
            <NativeSelect
              id="outletId"
              name="outletId"
              required={false}
              value={outletId}
              onChange={(event) => setOutletId(event.target.value)}
            >
              <option value="">Select outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Viewing outlet</Label>
            <input type="hidden" name="outletId" value={profile.outletId ?? ""} />
            <ScopeDisplay label={profile.outletName ?? "Assigned outlet"} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="closingDate">Closing date</Label>
          <Input
            id="closingDate"
            name="closingDate"
            type="date"
            value={closingDate}
            onChange={(event) => setClosingDate(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="openingCash">Opening cash</Label>
          <Input
            id="openingCash"
            name="openingCash"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={openingCash}
            onChange={(event) => setOpeningCash(event.target.value)}
            className="min-h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cashSalesPulled">Cash sales</Label>
          <Input
            id="cashSalesPulled"
            value={(matchingSale?.cashSales ?? 0).toFixed(2)}
            readOnly
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cashExpensesPulled">Cash expenses</Label>
          <Input id="cashExpensesPulled" value={cashExpenses.toFixed(2)} readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expectedCash">Expected cash</Label>
          <Input id="expectedCash" value={expectedCash.toFixed(2)} readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="actualCashCounted">Actual cash counted</Label>
          <Input
            id="actualCashCounted"
            name="actualCashCounted"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={actualCashCounted}
            onChange={(event) => setActualCashCounted(event.target.value)}
            className="min-h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="varianceDisplay">Variance</Label>
          <Input id="varianceDisplay" value={variance.toFixed(2)} readOnly />
        </div>
        <input type="hidden" name="status" value="SUBMITTED" />
      </div>
      <div className="rounded-md border p-3">
        <div className="text-sm font-medium">Non-cash sales reference</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bankTransferSalesPulled">Bank transfer sales</Label>
            <Input
              id="bankTransferSalesPulled"
              value={(matchingSale?.bankTransferSales ?? 0).toFixed(2)}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ewalletSalesPulled">E-wallet / DuitNow sales</Label>
            <Input
              id="ewalletSalesPulled"
              value={(matchingSale?.ewalletSales ?? 0).toFixed(2)}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditSalesPulled">Credit sales</Label>
            <Input
              id="creditSalesPulled"
              value={(matchingSale?.creditSales ?? 0).toFixed(2)}
              readOnly
            />
          </div>
        </div>
      </div>
      {Math.abs(variance) > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Variance is not zero. Warning only; save is allowed.
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="dailyClosingRemarks">Remarks optional</Label>
        <Textarea id="dailyClosingRemarks" name="remarks" />
      </div>
    </WorkflowCard>
  )
}

const processingLineIndexes = [0, 1, 2, 3]
const defaultProcessingTypes = ["Minced Meat", "Slice", "Cut", "Pack", "Repack", "Other"]
const afterProcessingSteps = [
  "Pack finished goods",
  "Confirm finished weight",
  "Inbound finished stock",
]

function ProcessingLineFields({
  prefix,
  title,
  firstLineLabel,
  additionalLineLabel,
  items,
  weights,
  onWeightChange,
}: {
  prefix: "raw" | "finished"
  title: string
  firstLineLabel: string
  additionalLineLabel: string
  items: RetailItem[]
  weights: string[]
  onWeightChange: (index: number, value: string) => void
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="grid gap-3">
        {processingLineIndexes.map((index) => (
          <details
            key={index}
            open={index === 0}
            className="rounded-md border p-3 open:bg-muted/20"
          >
            <summary className="cursor-pointer text-sm font-medium">
              {index === 0 ? firstLineLabel : `${additionalLineLabel} ${index + 1}`}
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${prefix}ItemId${index}`}>Item</Label>
                <NativeSelect
                  id={`${prefix}ItemId${index}`}
                  name={`${prefix}ItemId${index}`}
                  required={false}
                >
                  <option value="">Manual / not in item list</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${prefix}ItemName${index}`}>
                  Manual item name
                </Label>
                <Input
                  id={`${prefix}ItemName${index}`}
                  name={`${prefix}ItemName${index}`}
                  className="min-h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${prefix}WeightKg${index}`}>Weight kg</Label>
                <Input
                  id={`${prefix}WeightKg${index}`}
                  name={`${prefix}WeightKg${index}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.001"
                  value={weights[index] ?? ""}
                  onChange={(event) => onWeightChange(index, event.target.value)}
                  className="min-h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${prefix}Quantity${index}`}>Quantity</Label>
                <Input
                  id={`${prefix}Quantity${index}`}
                  name={`${prefix}Quantity${index}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.001"
                  className="min-h-11 text-base"
                />
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

function ProcessingStepHeader({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-base font-semibold text-primary-foreground">
        {step}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function ProcessingErrorNextStep() {
  const steps = [
    "Check raw and finished weights",
    "Check processing type",
    "Submit processing again",
  ]

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-900">
        Processing not saved yet
      </p>
      <p className="mt-1 text-sm text-red-900/75">
        Fix the missing type, item, or weight, then submit again. Finished stock
        still needs barcode inbound after packing.
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

export function RetailProcessingBatchForm({
  outlets,
  items,
  processingBoms = [],
  profile,
}: {
  outlets: RetailOutlet[]
  items: RetailItem[]
  processingBoms?: RetailProcessingBom[]
  profile: CurrentProfile
}) {
  const today = new Date().toISOString().slice(0, 10)
  const activeBoms = processingBoms.filter((bom) => bom.active)
  const processingTypePresets = [
    ...defaultProcessingTypes,
    ...activeBoms.map((bom) => bom.name),
  ].filter((name, index, names) => names.indexOf(name) === index)
  const [processingType, setProcessingType] = useState("Minced Meat")
  const [rawWeights, setRawWeights] = useState<string[]>(
    processingLineIndexes.map(() => "")
  )
  const [finishedWeights, setFinishedWeights] = useState<string[]>(
    processingLineIndexes.map(() => "")
  )
  const [wastageWeightKg, setWastageWeightKg] = useState("0")
  const updateWeight = (
    setter: (value: string[]) => void,
    values: string[],
    index: number,
    value: string
  ) => {
    const next = [...values]
    next[index] = value
    setter(next)
  }
  const weightTotal = (values: string[]) =>
    values.reduce((sum, value) => sum + (Number(value) || 0), 0)
  const totalRawWeight = weightTotal(rawWeights)
  const totalFinishedWeight = weightTotal(finishedWeights)
  const totalWastageWeight = Number(wastageWeightKg) || 0
  const yieldPercent =
    totalRawWeight > 0 ? (totalFinishedWeight / totalRawWeight) * 100 : 0
  const wastagePercent =
    totalRawWeight > 0 ? (totalWastageWeight / totalRawWeight) * 100 : 0
  const unaccountedDifference =
    totalRawWeight - (totalFinishedWeight + totalWastageWeight)

  return (
    <WorkflowCard
      title="Record Processing"
      description="Record raw usage, finished output, and wastage for the outlet."
      action={createRetailProcessingBatchAction}
      submitLabel="Submit processing"
      successActions={[
        { href: "/retail/processing", label: "Record another processing" },
        { href: "/retail", label: "Back to Retail Home" },
      ]}
      errorNextStep={<ProcessingErrorNextStep />}
    >
      <div className="grid gap-2 sm:grid-cols-5">
        {["Type", "Raw", "Finished", "Wastage", "Submit"].map((step, index) => (
          <div
            key={step}
            className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium"
          >
            {index + 1}. {step}
          </div>
        ))}
      </div>

      <section className="space-y-4 rounded-md border p-4">
        <ProcessingStepHeader
          step="1"
          title="Processing Type"
          description="Tap a preset, or type a processing name."
        />
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Use one record for one processing or packing job. Add more raw and
          finished lines only when needed.
        </div>
        <input type="hidden" name="processingBomId" value="" />
        <div className="grid gap-4 md:grid-cols-2">
          <OutletScopeField profile={profile} outlets={outlets} />
          <div className="space-y-2">
            <Label htmlFor="processingDate">Date</Label>
            <Input
              id="processingDate"
              name="processingDate"
              type="date"
              defaultValue={today}
              className="min-h-11 text-base"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Preset processing type</Label>
            <div className="grid gap-2 min-[380px]:grid-cols-3">
              {processingTypePresets.slice(0, 6).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={processingType === type ? "default" : "outline"}
                  className="min-h-12 justify-start"
                  onClick={() => setProcessingType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="processingType">Manual processing type</Label>
            <Input
              id="processingType"
              name="processingType"
              value={processingType}
              onChange={(event) => setProcessingType(event.target.value)}
              placeholder="Example: Slice pork belly"
              className="min-h-11 text-base"
            />
          </div>
          <details className="rounded-md border p-3 md:col-span-2">
            <summary className="cursor-pointer text-sm font-medium">
              Processing remarks (optional)
            </summary>
            <div className="mt-3 space-y-2">
              <Label htmlFor="processingRemarks">Remarks</Label>
              <Textarea
                id="processingRemarks"
                name="remarks"
                className="min-h-20 text-base"
              />
            </div>
          </details>
        </div>
      </section>

      <section className="space-y-4 rounded-md border p-4">
        <ProcessingStepHeader
          step="2"
          title="Raw Material"
          description="Enter the raw items used today."
        />
        <ProcessingLineFields
          prefix="raw"
          title="Raw materials"
          firstLineLabel="Add raw item"
          additionalLineLabel="Add another raw item"
          items={items}
          weights={rawWeights}
          onWeightChange={(index, value) =>
            updateWeight(setRawWeights, rawWeights, index, value)
          }
        />
      </section>

      <section className="space-y-4 rounded-md border p-4">
        <ProcessingStepHeader
          step="3"
          title="Finished Product"
          description="Enter what the outlet produced from the raw material."
        />
        <ProcessingLineFields
          prefix="finished"
          title="Finished products"
          firstLineLabel="Add finished item"
          additionalLineLabel="Add another finished item"
          items={items}
          weights={finishedWeights}
          onWeightChange={(index, value) =>
            updateWeight(setFinishedWeights, finishedWeights, index, value)
          }
        />
      </section>

      <section className="space-y-4 rounded-md border p-4">
        <ProcessingStepHeader
          step="4"
          title="Wastage"
          description="Record the total wastage weight and optional evidence."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wastageWeightKg">Total wastage weight</Label>
            <Input
              id="wastageWeightKg"
              name="wastageWeightKg"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.001"
              value={wastageWeightKg}
              onChange={(event) => setWastageWeightKg(event.target.value)}
              className="min-h-11 text-base"
            />
          </div>
          <details className="rounded-md border p-3 md:col-span-2">
            <summary className="cursor-pointer text-sm font-medium">
              Wastage details (optional)
            </summary>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wastageReason">Reason optional</Label>
                <Input
                  id="wastageReason"
                  name="wastageReason"
                  className="min-h-11 text-base"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <input type="hidden" name="wastagePhotoUrl" value="" />
                <FileUploadField
                  id="wastagePhotoFile"
                  name="wastagePhotoFile"
                  label="Wastage photo optional"
                  accept="image/*"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="wastageRemarks">Wastage remarks optional</Label>
                <Input
                  id="wastageRemarks"
                  name="wastageRemarks"
                  className="min-h-11 text-base"
                />
              </div>
            </div>
          </details>
        </div>
      </section>

      <section className="space-y-4 rounded-md border p-4">
        <ProcessingStepHeader
          step="5"
          title="Review and Submit"
          description="Check the calculated weight totals before submitting."
        />
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          If numbers look right, tap Submit processing. Weight differences are
          recorded only; they do not block submission.
        </div>
        <div className="rounded-md border p-3">
          <div className="mb-3">
            <p className="text-sm font-semibold">After processing</p>
            <p className="text-sm text-muted-foreground">
              Finished stock is not added automatically. Pack and inbound
              finished stock before it can be sold.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {afterProcessingSteps.map((step, index) => (
              <div
                key={step}
                className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium"
              >
                {index + 1}. {step}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Total raw weight", `${totalRawWeight.toFixed(3)} kg`],
            ["Total finished weight", `${totalFinishedWeight.toFixed(3)} kg`],
            ["Total wastage weight", `${totalWastageWeight.toFixed(3)} kg`],
            ["Yield %", `${yieldPercent.toFixed(2)}%`],
            ["Wastage %", `${wastagePercent.toFixed(2)}%`],
            ["Unaccounted difference", `${unaccountedDifference.toFixed(3)} kg`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-semibold tabular-nums">{value}</div>
            </div>
          ))}
        </div>
        <input type="hidden" name="status" value="SUBMITTED" />
      </section>
    </WorkflowCard>
  )
}

export function RetailProcessingReviewForm({
  batches,
}: {
  batches: RetailProcessingBatch[]
}) {
  const reviewable = batches.filter(
    (batch) => batch.status === "SUBMITTED" || batch.status === "COMPLETED"
  )

  return (
    <WorkflowCard
      title="Review processing"
      description="Manager review for submitted outlet processing records."
      action={reviewRetailProcessingBatchAction}
      submitLabel="Save review"
      successActions={[
        { href: "/processing/dashboard", label: "Review another processing" },
        { href: "/retail", label: "Back to Retail Home" },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="batchId">Batch</Label>
          <NativeSelect id="batchId" name="batchId">
            <option value="">Select batch</option>
            {reviewable.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.batchNo} - {batch.processingType} -{" "}
                {batch.yieldPercent.toFixed(2)}%
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="processingReviewStatus">Decision</Label>
          <NativeSelect id="processingReviewStatus" name="status">
            <option value="REVIEWED">REVIEWED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </NativeSelect>
        </div>
      </div>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Rejection reason and remarks (if needed)
        </summary>
        <div className="mt-3 grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="processingRejectionReason">Rejection reason</Label>
            <Textarea id="processingRejectionReason" name="rejectionReason" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="processingReviewRemarks">Remarks</Label>
            <Textarea id="processingReviewRemarks" name="remarks" />
          </div>
        </div>
      </details>
    </WorkflowCard>
  )
}

export function RetailCleaningTaskForm({
  outlets,
  departments,
  profile,
}: {
  outlets: RetailOutlet[]
  departments: RetailDepartment[]
  profile: CurrentProfile
}) {
  return (
    <WorkflowCard
      title="Cleaning task master"
      description="Manage required retail cleaning work by outlet and frequency."
      action={createRetailCleaningTaskAction}
      submitLabel="Save task"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <OutletScopeField profile={profile} outlets={outlets} />
        <DepartmentScopeField profile={profile} departments={departments} />
        <div className="space-y-2">
          <Label htmlFor="taskName">Task</Label>
          <Input id="taskName" name="taskName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <NativeSelect id="frequency" name="frequency">
            {retailCleaningFrequencies.map((frequency) => (
              <option key={frequency} value={frequency}>
                {frequency}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cleaningActive">Status</Label>
          <NativeSelect id="cleaningActive" name="active">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </NativeSelect>
        </div>
      </div>
    </WorkflowCard>
  )
}

function CleaningWorkerFastPath({ taskCount }: { taskCount: number }) {
  const steps = ["Missing first", "Check area", "Tap complete", "Next task"]

  return (
    <Card className="border-emerald-200 bg-emerald-50/60">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <ClipboardCheck className="size-4" />
          Cleaning worker fast path
        </div>
        <CardTitle className="text-lg">Tap to complete cleaning</CardTitle>
        <CardDescription className="text-emerald-950/75">
          Finish each required task with one big button. No photo is required for V1.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step} className="rounded-md border bg-background/80 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Step {index + 1}
              </div>
              <div className="mt-1 text-sm font-semibold">{step}</div>
            </div>
          ))}
        </div>
        <div className="rounded-md border bg-background/80 p-3 text-sm text-emerald-950/80">
          Tasks left today: <span className="font-semibold">{taskCount}</span>.
          Missing cleaning is marked red; finish it first, then continue.
          No photo or remarks needed for V1.
        </div>
      </CardContent>
    </Card>
  )
}

function cleaningTaskDateKey(value: string) {
  return value.slice(0, 10)
}

function isCleaningTaskLate(task: RetailCleaningTask) {
  const today = new Date().toISOString().slice(0, 10)

  return task.status === "MISSED" || cleaningTaskDateKey(task.dueDate) < today
}

function sortCleaningTasksForWorker(tasks: RetailCleaningTask[]) {
  return [...tasks].sort((first, second) => {
    const firstLate = isCleaningTaskLate(first)
    const secondLate = isCleaningTaskLate(second)

    if (firstLate !== secondLate) {
      return firstLate ? -1 : 1
    }

    return cleaningTaskDateKey(first.dueDate).localeCompare(
      cleaningTaskDateKey(second.dueDate)
    )
  })
}

function CleaningSuccessNextStep({ isLate }: { isLate: boolean }) {
  const steps = [
    "Task saved",
    "Complete next task",
    isLate ? "Missing status saved" : "Today count updated",
  ]

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            Cleaning saved
          </p>
          <p className="text-sm text-emerald-900/75">
            If another task is shown, complete it now. Otherwise return home.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border bg-background/80 p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Next {index + 1}
            </div>
            <div className="mt-1 text-sm font-semibold">{step}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CleaningErrorNextStep({ state }: { state: RetailActionState }) {
  if (state.status !== "error") {
    return null
  }

  const steps = [
    "Check the task",
    "Check connection",
    "Tap Complete Cleaning again",
  ]

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-900">
        Cleaning not saved yet
      </p>
      <p className="mt-1 text-sm text-red-900/75">
        Fix the blocked task or connection, then submit again. Ask a manager if
        the task is no longer available.
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

function CleaningTodayFocus({ tasks }: { tasks: RetailCleaningTask[] }) {
  const firstTask = tasks[0]
  const lateCount = tasks.filter(isCleaningTaskLate).length
  const dueCount = tasks.length - lateCount

  if (!firstTask) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="font-semibold">All required cleaning is done for today</div>
        <p className="mt-1 text-emerald-950/75">
          No more cleaning action is needed now. Check again after the next schedule.
        </p>
        <div className="mt-3 grid gap-2 min-[380px]:grid-cols-3">
          {["Return home", "Check later", "Tell manager if asked"].map((step) => (
            <div key={step} className="rounded-md border bg-background px-3 py-2 font-medium">
              {step}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-semibold">
        Do this first: {firstTask.taskName}
      </div>
      <p className="mt-1">
        Complete the first card, then continue down the list. Missing tasks are
        marked red.
      </p>
      <div className="mt-3 grid gap-2 min-[380px]:grid-cols-3">
        <div className="rounded-md border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">Missing</div>
          <div className="font-semibold tabular-nums">{lateCount}</div>
        </div>
        <div className="rounded-md border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">Due today</div>
          <div className="font-semibold tabular-nums">{dueCount}</div>
        </div>
        <div className="rounded-md border bg-background px-3 py-2 font-medium">
          No photo needed
        </div>
      </div>
    </div>
  )
}

function CleaningCompleteCard({ task }: { task: RetailCleaningTask }) {
  const [state, formAction, pending] = useActionState(
    completeRetailCleaningTaskAction,
    initialRetailActionState
  )
  const isComplete = state.status === "success"
  const isLate = isCleaningTaskLate(task)
  const statusLabel = isLate ? "Missing" : "Pending"

  return (
    <Card className={isComplete ? "border-emerald-200 bg-emerald-50/40" : ""}>
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={
              isComplete
                ? "flex size-11 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white"
                : "flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
            }
          >
            {isComplete ? (
              <CheckCircle2 className="size-6" />
            ) : (
              <ClipboardCheck className="size-6" />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{task.taskName}</CardTitle>
              <Badge variant={isLate ? "destructive" : "secondary"}>
                {statusLabel}
              </Badge>
            </div>
            <CardDescription>
              {task.outletName} - {task.frequency} - due {task.dueDate}
            </CardDescription>
          </div>
        </div>
        <div className="rounded-md border bg-background px-3 py-2 text-sm">
          {isComplete
            ? "Done. Continue with the next cleaning task."
            : isLate
              ? "Missing cleaning. Check the area, then tap Complete Cleaning."
              : "Check the area, then tap Complete Cleaning."}
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3 pb-20 sm:pb-0">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="status" value="DONE" />
          <input type="hidden" name="photoUrl" value="" />
          <input type="hidden" name="remarks" value="" />
          <ActionMessage state={state} />
          <CleaningErrorNextStep state={state} />
          {isComplete ? <CleaningSuccessNextStep isLate={isLate} /> : null}
          {isComplete ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                asChild
                type="button"
                variant="outline"
                className="min-h-11 w-full justify-start"
              >
                <a href="/retail/cleaning">Complete another task</a>
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                className="min-h-11 w-full justify-start"
              >
                <a href="/retail">Back to Retail Home</a>
              </Button>
            </div>
          ) : null}
          {!isComplete ? (
            <Button
              type="submit"
              disabled={pending}
              className="fixed inset-x-4 bottom-4 z-40 min-h-16 text-base shadow-lg sm:static sm:w-full sm:shadow-none"
            >
              <CheckCircle2 className="size-5" />
              {pending ? "Saving..." : "Tap Complete Cleaning"}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}

export function RetailCleaningUpdateForm({
  tasks,
}: {
  tasks: RetailCleaningTask[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const activeTasks = sortCleaningTasksForWorker(
    tasks.filter((task) => task.active && task.completedAt?.slice(0, 10) !== today)
  )

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Complete Cleaning</h2>
        <p className="text-sm text-muted-foreground">
          Finish today&apos;s required outlet cleaning tasks. No photo is required.
        </p>
      </div>
      <CleaningWorkerFastPath taskCount={activeTasks.length} />
      <CleaningTodayFocus tasks={activeTasks} />
      <div className="grid gap-3">
        {activeTasks.length > 0 ? (
          activeTasks.map((task) => (
            <CleaningCompleteCard key={task.id} task={task} />
          ))
        ) : (
          <div className="rounded-md border bg-emerald-50 p-4 text-sm text-emerald-800">
            All required cleaning is done for today. Return home or check again
            after the next schedule.
          </div>
        )}
      </div>
    </section>
  )
}

function ExpenseErrorNextStep() {
  const steps = [
    "Check category and amount",
    "Attach receipt proof",
    "Submit expense again",
  ]

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-900">
        Expense not submitted yet
      </p>
      <p className="mt-1 text-sm text-red-900/75">
        Fix the blocked field, then submit again. Ask a manager if the outlet or
        category is missing.
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

export function RetailExpenseForm({
  outlets,
  categories,
  profile,
}: {
  outlets: RetailOutlet[]
  categories: RetailExpenseCategory[]
  profile: CurrentProfile
}) {
  const activeCategories = categories.filter((category) => category.active)
  const today = new Date().toISOString().slice(0, 10)
  const [outletId, setOutletId] = useState(profile.outletId ?? "")
  const canPickOutlet = canChooseScope(profile)

  return (
    <WorkflowCard
      title="Submit Expense"
      description="Submit one outlet expense with receipt proof."
      action={createRetailExpenseAction}
      submitLabel="Submit expense"
      submitIcon="cash"
      successActions={[
        { href: "/retail", label: "Back to Retail Home" },
        { href: "/retail/expenses/history", label: "Edit submitted expense" },
      ]}
      errorNextStep={<ExpenseErrorNextStep />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="expenseDate" value={today} />
        {canPickOutlet ? (
          <OutletScopeField
            profile={profile}
            outlets={outlets}
            selectedOutletId={outletId}
            onOutletChange={setOutletId}
            outletRequired
            emptyLabel="Select outlet"
          />
        ) : (
          <div className="space-y-2">
            <Label>Viewing outlet</Label>
            <input type="hidden" name="outletId" value={profile.outletId ?? ""} />
            <ScopeDisplay label={profile.outletName ?? "Assigned outlet"} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="min-h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          {activeCategories.length > 0 ? (
            <NativeSelect id="category" name="category">
              <option value="">Select category</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <Input
              id="category"
              name="category"
              placeholder="Cleaning Supplies"
              required
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment method</Label>
          <NativeSelect id="paymentMethod" name="paymentMethod" defaultValue="CASH">
            {retailExpensePaymentMethods.map((method) => (
              <option key={method} value={method}>
                {method === "ONLINE_TRANSFER"
                  ? "Bank Transfer"
                  : method === "EWALLET"
                    ? "E-wallet / DuitNow"
                    : method === "CREDIT"
                      ? "Credit / Other"
                      : "Cash"}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 md:col-span-2">
          <input type="hidden" name="receiptUrl" value="" />
          <FileUploadField
            id="receiptFile"
            name="receiptFile"
            label="Receipt"
            accept="image/*,.pdf"
            required
          />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function RetailExpenseEditForm({
  expenses,
  categories,
  profile,
}: {
  expenses: RetailExpense[]
  categories: RetailExpenseCategory[]
  profile: CurrentProfile
}) {
  const editableExpenses = expenses.filter(
    (expense) =>
      expense.status === "SUBMITTED" &&
      (expense.submittedById === profile.id || canChooseScope(profile))
  )
  const [selectedExpenseId, setSelectedExpenseId] = useState(
    editableExpenses[0]?.id ?? ""
  )
  const selectedExpense = editableExpenses.find(
    (expense) => expense.id === selectedExpenseId
  )
  const activeCategories = categories.filter((category) => category.active)
  const hasSelectedCategory = activeCategories.some(
    (category) => category.name === selectedExpense?.category
  )

  if (editableExpenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Submitted Expense</CardTitle>
          <CardDescription>
            No submitted expense can be edited. Reviewed, rejected, and cancelled
            expenses are locked.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <WorkflowCard
      title="Edit Submitted Expense"
      description="Edit your own submitted expense before manager review."
      action={updateRetailExpenseAction}
      submitLabel="Update submitted expense"
      submitIcon="cash"
      successActions={[
        { href: "/retail/expenses/history", label: "Back to expense status" },
        { href: "/retail", label: "Back to Retail Home" },
      ]}
      errorNextStep={<ExpenseErrorNextStep />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="expenseId">Submitted expense</Label>
          <NativeSelect
            id="expenseId"
            name="expenseId"
            value={selectedExpenseId}
            onChange={(event) => setSelectedExpenseId(event.target.value)}
          >
            {editableExpenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expense.expenseDate} - {expense.category} - RM{" "}
                {expense.amount.toFixed(2)}
              </option>
            ))}
          </NativeSelect>
        </div>
        {selectedExpense ? (
          <div key={selectedExpense.id} className="contents">
            <input
              type="hidden"
              name="expenseDate"
              value={selectedExpense.expenseDate}
            />
            <input
              type="hidden"
              name="outletId"
              value={selectedExpense.outletId ?? ""}
            />
            <input
              type="hidden"
              name="receiptUrl"
              value={selectedExpense.receiptUrl ?? ""}
            />
            <input
              type="hidden"
              name="supplierPayee"
              value={selectedExpense.supplierPayee}
            />
            <input type="hidden" name="remarks" value={selectedExpense.remarks} />
            <div className="space-y-2">
              <Label htmlFor="editCategory">Category</Label>
              {activeCategories.length > 0 ? (
                <NativeSelect
                  id="editCategory"
                  name="category"
                  defaultValue={selectedExpense.category}
                >
                  {!hasSelectedCategory ? (
                    <option value={selectedExpense.category}>
                      {selectedExpense.category}
                    </option>
                  ) : null}
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  id="editCategory"
                  name="category"
                  defaultValue={selectedExpense.category}
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAmount">Amount</Label>
              <Input
                id="editAmount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                defaultValue={selectedExpense.amount}
                className="min-h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPaymentMethod">Payment method</Label>
              <NativeSelect
                id="editPaymentMethod"
                name="paymentMethod"
                defaultValue={selectedExpense.paymentMethod}
              >
                {retailExpensePaymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method === "ONLINE_TRANSFER"
                      ? "Bank Transfer"
                      : method === "EWALLET"
                        ? "E-wallet / DuitNow"
                        : method === "CREDIT"
                          ? "Credit / Other"
                          : "Cash"}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 md:col-span-2">
              <FileUploadField
                id="editReceiptFile"
                name="receiptFile"
                label="Replace receipt optional"
                accept="image/*,.pdf"
              />
            </div>
          </div>
        ) : null}
      </div>
    </WorkflowCard>
  )
}

export function RetailExpenseStatusForm({
  expenses,
}: {
  expenses: RetailExpense[]
}) {
  const reviewableExpenses = expenses.filter(
    (expense) => expense.status === "SUBMITTED"
  )
  const [selectedExpenseId, setSelectedExpenseId] = useState(
    reviewableExpenses[0]?.id ?? ""
  )
  const [status, setStatus] = useState("APPROVED")
  const selectedExpense = reviewableExpenses.find(
    (expense) => expense.id === selectedExpenseId
  )
  const receiptReady = Boolean(selectedExpense?.receiptUrl)
  const rejecting = status === "REJECTED"

  return (
    <WorkflowCard
      title="Expense review"
      description="Check the receipt, confirm a different checker, then update the submitted expense."
      action={updateRetailExpenseStatusAction}
      submitLabel="Update expense"
      successActions={[
        { href: "/retail/expenses/review", label: "Review another expense" },
        { href: "/retail/expenses/history", label: "View expense history" },
        { href: "/retail", label: "Back to Retail Home" },
      ]}
      errorNextStep={<ExpenseReviewErrorNextStep />}
    >
      <ExpenseReviewReadiness
        selectedExpense={selectedExpense}
        status={status}
        receiptReady={receiptReady}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expenseId">Expense</Label>
          <ExpenseSelect
            expenses={expenses}
            value={selectedExpenseId}
            onValueChange={setSelectedExpenseId}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            id="status"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {retailExpenseStatuses
              .filter((status) => status !== "SUBMITTED")
              .map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
          </NativeSelect>
        </div>
      </div>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Rejection reason and remarks (if needed)
        </summary>
        <div className="mt-3 grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Rejection reason</Label>
            <Textarea
              id="rejectionReason"
              name="rejectionReason"
              required={rejecting}
              placeholder={
                rejecting
                  ? "Required when rejecting an expense."
                  : "Optional unless rejecting."
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expenseReviewRemarks">Remarks</Label>
            <Textarea id="expenseReviewRemarks" name="remarks" />
          </div>
        </div>
      </details>
    </WorkflowCard>
  )
}

function ExpenseReviewReadiness({
  selectedExpense,
  status,
  receiptReady,
}: {
  selectedExpense: RetailExpense | undefined
  status: string
  receiptReady: boolean
}) {
  const checks = [
    {
      label: "Expense selected",
      detail: selectedExpense
        ? `${selectedExpense.category} - RM ${selectedExpense.amount.toFixed(2)}`
        : "Select a submitted expense first.",
      ready: Boolean(selectedExpense),
    },
    {
      label: "Receipt opened",
      detail: receiptReady
        ? "Open the receipt before approving."
        : "Receipt is missing; reject or ask staff to resubmit.",
      ready: receiptReady,
    },
    {
      label: "Different checker",
      detail:
        "The server blocks same-manager review unless admin/director scope applies.",
      ready: true,
    },
    {
      label: "Decision selected",
      detail:
        status === "APPROVED"
          ? "Approve only after checking receipt proof."
          : status === "REJECTED"
            ? "Reject with a clear reason for the submitter."
            : "Cancel only when the submission should be stopped.",
      ready: Boolean(status),
    },
  ]

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-sm font-semibold">Expense review timeline</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Submitted &gt; Manager checker &gt; Approved, Rejected, or Cancelled.
      </p>
      {selectedExpense ? (
        <div className="mt-3 rounded-md border bg-background p-3 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-semibold">
                Review now: {selectedExpense.category}
              </div>
              <div className="mt-1 text-muted-foreground">
                {selectedExpense.outletName} - {selectedExpense.submittedByName} - RM{" "}
                {selectedExpense.amount.toFixed(2)}
              </div>
            </div>
            {selectedExpense.receiptUrl ? (
              <Button
                asChild
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
              >
                <a
                  href={`/api/retail/files?path=${encodeURIComponent(
                    selectedExpense.receiptUrl
                  )}`}
                >
                  Open selected receipt
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2
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

function ExpenseReviewErrorNextStep() {
  const steps = [
    "Select submitted expense",
    "Open receipt proof",
    "Add rejection reason if needed",
  ]

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-900">
        Expense review not saved yet
      </p>
      <p className="mt-1 text-sm text-red-900/75">
        Fix the blocked review step, then update the expense again. Same-manager
        review may be blocked by outlet rules.
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

export function RetailExpenseCategoryForm({
  outlets,
  profile,
}: {
  outlets: RetailOutlet[]
  profile: CurrentProfile
}) {
  return (
    <WorkflowCard
      title="Expense category"
      description="Add or update expense categories for outlet expense entry."
      action={upsertRetailExpenseCategoryAction}
      submitLabel="Save category"
      successActions={[
        { href: "/retail/settings/categories", label: "Add another category" },
        { href: "/retail/settings/categories/records", label: "View categories" },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <OutletScopeField profile={profile} outlets={outlets} />
        <div className="space-y-2">
          <Label htmlFor="expenseCategoryName">Category name</Label>
          <Input id="expenseCategoryName" name="name" placeholder="Cleaning Supplies" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expenseCategoryActive">Status</Label>
          <NativeSelect id="expenseCategoryActive" name="active">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </NativeSelect>
        </div>
      </div>
    </WorkflowCard>
  )
}

export function RetailProcessingBomForm({
  outlets,
  profile,
}: {
  outlets: RetailOutlet[]
  profile: CurrentProfile
}) {
  return (
    <WorkflowCard
      title="Processing BOM master"
      description="Add or update standard retail processing type names."
      action={upsertRetailProcessingBomAction}
      submitLabel="Save BOM"
      successActions={[
        { href: "/retail/settings/boms", label: "Add another BOM" },
        { href: "/retail/settings/boms/records", label: "View BOMs" },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <OutletScopeField profile={profile} outlets={outlets} />
        <div className="space-y-2">
          <Label htmlFor="processingBomName">BOM / processing type name</Label>
          <Input
            id="processingBomName"
            name="name"
            placeholder="Belly debone"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="processingBomActive">Status</Label>
          <NativeSelect id="processingBomActive" name="active">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </NativeSelect>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="rawMaterialItemNames">Raw material item names</Label>
          <Textarea
            id="rawMaterialItemNames"
            name="rawMaterialItemNames"
            placeholder="MEAT / BELLY / BONE IN"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="finishedProductItemNames">
            Finished product item names
          </Label>
          <Textarea
            id="finishedProductItemNames"
            name="finishedProductItemNames"
            placeholder="MEAT / BELLY / BONELESS"
          />
        </div>
        <details className="rounded-md border p-3 md:col-span-2">
          <summary className="cursor-pointer text-sm font-medium">
            Future yield settings and remarks (optional)
          </summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expectedYieldMinPercent">Expected yield min %</Label>
              <Input
                id="expectedYieldMinPercent"
                name="expectedYieldMinPercent"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="min-h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedYieldMaxPercent">Expected yield max %</Label>
              <Input
                id="expectedYieldMaxPercent"
                name="expectedYieldMaxPercent"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="min-h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedWastagePercent">Expected wastage %</Label>
              <Input
                id="expectedWastagePercent"
                name="expectedWastagePercent"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="min-h-11 text-base"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="processingBomRemarks">Remarks</Label>
              <Textarea id="processingBomRemarks" name="remarks" />
            </div>
          </div>
        </details>
      </div>
    </WorkflowCard>
  )
}
