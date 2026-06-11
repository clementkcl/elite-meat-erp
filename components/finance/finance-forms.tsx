"use client"

import { FileUp, Save } from "lucide-react"
import { useActionState, type ReactNode } from "react"

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
  createDirectorReportSnapshotAction,
  createFinanceInvoiceAction,
  directorFinanceInvoiceDecisionAction,
  markFinanceInvoicePaidAction,
  reviewFinanceInvoiceAction,
  upsertFinanceContainerAction,
} from "@/lib/finance/actions"
import {
  initialFinanceActionState,
  type FinanceActionState,
} from "@/lib/finance/action-state"
import {
  containerStatuses,
  directorReportTypes,
  financePaymentStatuses,
  financeInvoiceTypes,
  type FinanceInvoice,
} from "@/lib/finance/types"

type StatefulAction = (
  state: FinanceActionState,
  formData: FormData
) => Promise<FinanceActionState>

function ActionMessage({ state }: { state: FinanceActionState }) {
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
  defaultValue,
  required = true,
}: {
  id: string
  name: string
  children: ReactNode
  defaultValue?: string
  required?: boolean
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      required={required}
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
  const Icon = upload ? FileUp : Save

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
  const [state, formAction, pending] = useActionState(
    action,
    initialFinanceActionState
  )

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

function InvoiceSelect({
  invoices,
  id = "invoiceId",
}: {
  invoices: FinanceInvoice[]
  id?: string
}) {
  return (
    <NativeSelect id={id} name="invoiceId">
      <option value="">Select invoice</option>
      {invoices.map((invoice) => (
        <option key={invoice.id} value={invoice.id}>
          {invoice.invoiceNo} - {invoice.partyName} - RM{" "}
          {invoice.totalAmount.toFixed(2)}
        </option>
      ))}
    </NativeSelect>
  )
}

export function FinanceInvoiceForm({
  invoiceType,
}: {
  invoiceType?: "AR" | "AP"
}) {
  return (
    <WorkflowCard
      title="Upload invoice"
      description="Create an AR or AP invoice with optional attachment."
      action={createFinanceInvoiceAction}
      submitLabel="Submit invoice"
      upload
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceNo">Invoice no.</Label>
          <Input id="invoiceNo" name="invoiceNo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceType">Type</Label>
          <NativeSelect id="invoiceType" name="invoiceType" defaultValue={invoiceType}>
            {financeInvoiceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="partyName">Customer / supplier</Label>
          <Input id="partyName" name="partyName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment status</Label>
          <NativeSelect id="paymentStatus" name="paymentStatus">
            {financePaymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceDate">Invoice date</Label>
          <Input id="invoiceDate" name="invoiceDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" name="amount" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxAmount">Tax</Label>
          <Input
            id="taxAmount"
            name="taxAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="relatedModule">Related module</Label>
          <Input id="relatedModule" name="relatedModule" placeholder="delivery" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceFile">File</Label>
          <Input
            id="invoiceFile"
            name="invoiceFile"
            type="file"
            accept="application/pdf,image/*"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="itemList">Item list</Label>
          <Textarea id="itemList" name="itemList" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="invoiceNotes">Notes</Label>
          <Textarea id="invoiceNotes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function AccountReviewInvoiceForm({
  invoices,
}: {
  invoices: FinanceInvoice[]
}) {
  const submitted = invoices.filter((invoice) => invoice.status === "SUBMITTED")

  return (
    <WorkflowCard
      title="Admin review"
      description="Review submitted invoice data before director approval."
      action={reviewFinanceInvoiceAction}
      submitLabel="Save review"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reviewInvoiceId">Invoice</Label>
          <InvoiceSelect id="reviewInvoiceId" invoices={submitted} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="decision">Decision</Label>
          <NativeSelect id="decision" name="decision">
            <option value="ACCOUNT_REVIEWED">ADMIN REVIEWED</option>
            <option value="REJECTED">REJECTED</option>
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

export function DirectorInvoiceDecisionForm({
  invoices,
}: {
  invoices: FinanceInvoice[]
}) {
  const reviewable = invoices.filter(
    (invoice) => invoice.status === "ACCOUNT_REVIEWED"
  )

  return (
    <WorkflowCard
      title="Director invoice approval"
      description="Approve or reject admin-reviewed finance invoices."
      action={directorFinanceInvoiceDecisionAction}
      submitLabel="Save decision"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="directorInvoiceId">Invoice</Label>
          <InvoiceSelect id="directorInvoiceId" invoices={reviewable} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="decision">Decision</Label>
          <NativeSelect id="decision" name="decision">
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

export function PaidInvoiceForm({ invoices }: { invoices: FinanceInvoice[] }) {
  const payable = invoices.filter(
    (invoice) => invoice.status === "DIRECTOR_APPROVED"
  )

  return (
    <WorkflowCard
      title="Mark paid"
      description="Close director-approved invoices after payment."
      action={markFinanceInvoicePaidAction}
      submitLabel="Mark paid"
    >
      <div className="space-y-2">
        <Label htmlFor="paidInvoiceId">Invoice</Label>
        <InvoiceSelect id="paidInvoiceId" invoices={payable} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paidNotes">Notes</Label>
        <Textarea id="paidNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function FinanceContainerForm({
  invoices,
}: {
  invoices: FinanceInvoice[]
}) {
  const apInvoices = invoices.filter((invoice) => invoice.invoiceType === "AP")

  return (
    <WorkflowCard
      title="Container"
      description="Create or update container cost, ETA, arrival, and linked AP invoice."
      action={upsertFinanceContainerAction}
      submitLabel="Save container"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="containerNo">Container no.</Label>
          <Input id="containerNo" name="containerNo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplierName">Supplier</Label>
          <Input id="supplierName" name="supplierName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="etaDate">ETA</Label>
          <Input id="etaDate" name="etaDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="arrivalDate">Arrival date</Label>
          <Input id="arrivalDate" name="arrivalDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status">
            {containerStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceId">AP invoice</Label>
          <NativeSelect id="invoiceId" name="invoiceId" required={false}>
            <option value="">No invoice</option>
            {apInvoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNo} - {invoice.partyName}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalCost">Total cost</Label>
          <Input id="totalCost" name="totalCost" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue="MYR" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="containerNotes">Notes</Label>
          <Textarea id="containerNotes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function DirectorReportSnapshotForm({
  defaultPeriod,
}: {
  defaultPeriod?: { start: string; end: string }
}) {
  return (
    <WorkflowCard
      title="Report snapshot"
      description="Save director-facing KPI totals for a reporting period."
      action={createDirectorReportSnapshotAction}
      submitLabel="Save report"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reportType">Type</Label>
          <NativeSelect id="reportType" name="reportType">
            {directorReportTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div />
        <div className="space-y-2">
          <Label htmlFor="periodStart">Period start</Label>
          <Input
            id="periodStart"
            name="periodStart"
            type="date"
            defaultValue={defaultPeriod?.start}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodEnd">Period end</Label>
          <Input
            id="periodEnd"
            name="periodEnd"
            type="date"
            defaultValue={defaultPeriod?.end}
          />
        </div>
        {[
          ["totalSales", "Total sales"],
          ["cashCollected", "Cash collected"],
          ["outstandingAr", "Outstanding AR"],
          ["outstandingAp", "Outstanding AP"],
          ["stockValue", "Stock value"],
          ["expenseTotal", "Expense total"],
        ].map(([name, label]) => (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} type="number" min="0" step="0.01" />
          </div>
        ))}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="reportNotes">Notes</Label>
          <Textarea id="reportNotes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}
