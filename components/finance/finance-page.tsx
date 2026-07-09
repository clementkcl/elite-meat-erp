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
  AccountReviewInvoiceForm,
  FinanceContainerForm,
  FinanceInvoiceForm,
  PaidInvoiceForm,
} from "@/components/finance/finance-forms"
import { AdminReviewForm, PaidRequestForm } from "@/components/oa-actions/oa-forms"
import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import { RecentActivityList } from "@/components/ui/recent-activity-list"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import type { UserRole } from "@/lib/auth/types"
import { getFinancePageData } from "@/lib/finance/data"
import type { FinanceContainer, FinanceInvoice } from "@/lib/finance/types"
import { getOaPageData } from "@/lib/oa-actions/data"
import type { UnifiedOaRequest } from "@/lib/oa-actions/types"

export type FinanceRoute =
  | "dashboard"
  | "claims"
  | "advances"
  | "ar-invoices"
  | "ap-invoices"
  | "containers"

type TableRow = Record<string, string | number | boolean>

const financeRoles: UserRole[] = ["account", "admin", "director"]

type OperationalQueueItem = {
  label: string
  value: string
  detail: string
  href: string
  action: string
  tone?: "default" | "warning" | "danger" | "success"
}

const titles: Record<FinanceRoute, { title: string; description: string }> = {
  dashboard: {
    title: "Accounting Dashboard",
    description:
      "Operational review and control screen for receivables, payables, OA payments, and containers.",
  },
  claims: {
    title: "Claims",
    description: "Review and pay staff claim requests from OA Actions.",
  },
  advances: {
    title: "Advances",
    description: "Review and pay staff advance requests from OA Actions.",
  },
  "ar-invoices": {
    title: "AR Invoices",
    description: "Upload and track customer receivable invoices.",
  },
  "ap-invoices": {
    title: "AP Invoices",
    description: "Upload and track supplier payable invoices.",
  },
  containers: {
    title: "Containers",
    description: "Update imported container status, ETA, arrival, and cost.",
  },
}

const navItems: { route: FinanceRoute; href: string; label: string }[] = [
  { route: "dashboard", href: "/accounting-finance/dashboard", label: "Dashboard" },
  { route: "claims", href: "/accounting-finance/claims", label: "Claims" },
  { route: "advances", href: "/accounting-finance/advances", label: "Advances" },
  { route: "ar-invoices", href: "/accounting-finance/ar-invoices", label: "AR" },
  { route: "ap-invoices", href: "/accounting-finance/ap-invoices", label: "AP" },
  { route: "containers", href: "/accounting-finance/containers", label: "Containers" },
]

const invoiceColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "invoiceNo", header: "Invoice" },
  { key: "invoiceType", header: "Type" },
  { key: "partyName", header: "Party" },
  { key: "invoiceDate", header: "Date" },
  { key: "dueDate", header: "Due" },
  { key: "ageDays", header: "Age", align: "right" },
  { key: "agingBucket", header: "Bucket" },
  { key: "totalAmount", header: "Total", align: "right" },
  { key: "paymentStatus", header: "Payment" },
  { key: "status", header: "Status" },
  { key: "itemList", header: "Items" },
  { key: "filePath", header: "File" },
]

const agingColumns: DataTableColumn<TableRow>[] = [
  { key: "bucket", header: "Age" },
  { key: "count", header: "Invoices", align: "right" },
  { key: "amount", header: "Outstanding", align: "right" },
]

const containerColumns: DataTableColumn<TableRow>[] = [
  { key: "containerNo", header: "Container" },
  { key: "supplierName", header: "Supplier" },
  { key: "etaDate", header: "ETA" },
  { key: "arrivalDate", header: "Arrival" },
  { key: "status", header: "Status" },
  { key: "totalCost", header: "Cost", align: "right" },
  { key: "invoiceNo", header: "Invoice" },
]

const requestColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "requesterName", header: "Employee" },
  { key: "title", header: "Details" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "dateText", header: "Date" },
  { key: "status", header: "Status" },
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
  if (value === "ACCOUNT_REVIEWED") {
    return "ADMIN REVIEWED"
  }

  return value.replaceAll("_", " ")
}

function money(value: number) {
  return `RM ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function PageHeader({
  route,
  demoMode,
}: {
  route: FinanceRoute
  demoMode: boolean
}) {
  const title = titles[route]

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

function FinanceNav({ route }: { route: FinanceRoute }) {
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

function queueToneClass(tone: OperationalQueueItem["tone"]) {
  if (tone === "danger") {
    return "border-red-200 bg-red-50"
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50"
  }

  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50"
  }

  return "border-border bg-background"
}

function queueBadgeVariant(tone: OperationalQueueItem["tone"]) {
  if (tone === "danger") {
    return "destructive"
  }

  if (tone === "warning") {
    return "warning"
  }

  if (tone === "success") {
    return "success"
  }

  return "secondary"
}

function buildOperationalQueue({
  invoices,
  containers,
  claims,
  advances,
}: {
  invoices: FinanceInvoice[]
  containers: FinanceContainer[]
  claims: UnifiedOaRequest[]
  advances: UnifiedOaRequest[]
}): OperationalQueueItem[] {
  const submittedInvoices = invoices.filter(
    (invoice) => invoice.status === "SUBMITTED"
  )
  const directorApprovedUnpaid = invoices.filter(
    (invoice) =>
      invoice.status === "DIRECTOR_APPROVED" &&
      invoice.paymentStatus !== "PAID"
  )
  const overdueAr = invoices.filter(
    (invoice) =>
      invoice.invoiceType === "AR" &&
      invoice.paymentStatus !== "PAID" &&
      invoice.status !== "REJECTED" &&
      invoice.status !== "VOID" &&
      invoice.ageDays > 30
  )
  const overdueAp = invoices.filter(
    (invoice) =>
      invoice.invoiceType === "AP" &&
      invoice.paymentStatus !== "PAID" &&
      invoice.status !== "REJECTED" &&
      invoice.status !== "VOID" &&
      invoice.ageDays > 30
  )
  const oaAdminReview = [...claims, ...advances].filter(
    (request) =>
      request.status === "SUBMITTED" || request.status === "MANAGER_REVIEWED"
  )
  const oaReadyToPay = [...claims, ...advances].filter(
    (request) => request.status === "DIRECTOR_APPROVED"
  )
  const openContainers = containers.filter(
    (container) => container.status !== "CLOSED"
  )
  const etaMissing = openContainers.filter((container) => !container.etaDate)

  return [
    {
      label: "Admin invoice review",
      value: String(submittedInvoices.length),
      detail: "Submitted AR/AP invoices waiting for admin review.",
      href: "/accounting-finance/dashboard",
      action: "Review invoices",
      tone: submittedInvoices.length > 0 ? "danger" : "success",
    },
    {
      label: "Payment to release",
      value: String(directorApprovedUnpaid.length),
      detail: "Director-approved invoices not marked paid.",
      href: "/accounting-finance/dashboard",
      action: "Mark paid",
      tone: directorApprovedUnpaid.length > 0 ? "danger" : "success",
    },
    {
      label: "OA admin review",
      value: String(oaAdminReview.length),
      detail: "Claims and advances waiting for admin review.",
      href: "/accounting-finance/claims",
      action: "Review OA",
      tone: oaAdminReview.length > 0 ? "warning" : "success",
    },
    {
      label: "OA payment",
      value: String(oaReadyToPay.length),
      detail: "Director-approved claims and advances waiting for account payment.",
      href: "/accounting-finance/advances",
      action: "Pay requests",
      tone: oaReadyToPay.length > 0 ? "danger" : "success",
    },
    {
      label: "AR overdue",
      value: String(overdueAr.length),
      detail: "Receivable invoices older than 30 days and not paid.",
      href: "/accounting-finance/ar-invoices",
      action: "Check AR",
      tone: overdueAr.length > 0 ? "warning" : "success",
    },
    {
      label: "AP overdue",
      value: String(overdueAp.length),
      detail: "Payable invoices older than 30 days and not paid.",
      href: "/accounting-finance/ap-invoices",
      action: "Check AP",
      tone: overdueAp.length > 0 ? "warning" : "success",
    },
    {
      label: "Container control",
      value: String(openContainers.length),
      detail: `${etaMissing.length} open containers are missing ETA.`,
      href: "/accounting-finance/containers",
      action: "Update containers",
      tone: etaMissing.length > 0 ? "warning" : "default",
    },
  ]
}

function OperationalReviewBoard({ items }: { items: OperationalQueueItem[] }) {
  const urgentCount = items.filter((item) => item.tone === "danger").length
  const checkCount = items.filter((item) => item.tone === "warning").length
  const accountAdminReviewSteps = [
    "Review invoices",
    "Release payments",
    "Check aging",
    "Update containers",
  ]
  const accountAdminEmptySteps = [
    "Reviews clear",
    "Payments clear",
    "Check aging next",
  ]

  return (
    <section
      aria-labelledby="account-admin-operational-review"
      className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Account/admin operational review
          </p>
          <h2
            id="account-admin-operational-review"
            className="text-xl font-semibold tracking-tight"
          >
            Review and control queue
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Start with review, payment, overdue, and container control items
            before normal finance reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={urgentCount > 0 ? "destructive" : "success"}>
            {urgentCount} urgent
          </Badge>
          <Badge variant={checkCount > 0 ? "warning" : "secondary"}>
            {checkCount} to check
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="text-sm font-semibold">Account/admin daily control order</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Clear reviews and payments first, then check aging and container follow-up.
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {accountAdminReviewSteps.map((step, index) => (
            <div key={step} className="rounded-md border bg-background px-3 py-3">
              <div className="text-xs font-medium text-muted-foreground">
                Step {index + 1}
              </div>
              <div className="mt-1 text-sm font-semibold">{step}</div>
            </div>
          ))}
        </div>
      </div>

      {urgentCount === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold">
                Account/admin queue clear guide
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                If no review or payment card is urgent, check aging and container
                follow-up before normal finance reports.
              </p>
            </div>
            <Badge variant="success">Queue clear</Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {accountAdminEmptySteps.map((step) => (
              <div key={step} className="rounded-md border bg-background px-3 py-2">
                <div className="text-sm font-semibold">{step}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex min-h-40 flex-col justify-between rounded-lg border p-4 ${queueToneClass(
              item.tone
            )}`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{item.label}</h3>
                <Badge variant={queueBadgeVariant(item.tone)}>
                  {item.tone === "danger"
                    ? "Act"
                    : item.tone === "warning"
                      ? "Check"
                      : item.tone === "success"
                        ? "Clear"
                        : "Open"}
                </Badge>
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {item.value}
              </div>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </div>
            <Button
              asChild
              variant={item.tone === "danger" ? "default" : "outline"}
              size="sm"
              className="mt-4 min-h-11 w-full justify-center"
            >
              <Link href={item.href}>{item.action}</Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

function invoiceRows(invoices: FinanceInvoice[]): TableRow[] {
  return invoices.map((invoice) => ({
    createdAt: dateText(invoice.createdAt),
    invoiceNo: invoice.invoiceNo,
    invoiceType: invoice.invoiceType,
    partyName: invoice.partyName,
    invoiceDate: dateText(invoice.invoiceDate),
    dueDate: dateText(invoice.dueDate),
    ageDays: invoice.ageDays,
    agingBucket: invoice.agingBucket,
    totalAmount: invoice.totalAmount,
    paymentStatus: statusText(invoice.paymentStatus),
    status: statusText(invoice.status),
    itemList: invoice.itemList,
    filePath: invoice.filePath,
  }))
}

function agingRows(invoices: FinanceInvoice[], invoiceType: "AR" | "AP") {
  const buckets = ["0-30", "31-60", "61-90", "90+"]

  return buckets.map((bucket) => {
    const rows = invoices.filter(
      (invoice) =>
        invoice.invoiceType === invoiceType &&
        invoice.paymentStatus !== "PAID" &&
        invoice.status !== "REJECTED" &&
        invoice.status !== "VOID" &&
        invoice.agingBucket === bucket
    )

    return {
      bucket,
      count: rows.length,
      amount: money(rows.reduce((sum, invoice) => sum + invoice.totalAmount, 0)),
    }
  })
}

function containerRows(containers: FinanceContainer[]): TableRow[] {
  return containers.map((container) => ({
    containerNo: container.containerNo,
    supplierName: container.supplierName,
    etaDate: dateText(container.etaDate),
    arrivalDate: dateText(container.arrivalDate),
    status: statusText(container.status),
    totalCost: container.totalCost,
    invoiceNo: container.invoiceNo,
  }))
}

function requestRows(requests: UnifiedOaRequest[]): TableRow[] {
  return requests.map((request) => ({
    createdAt: dateText(request.createdAt),
    requesterName: request.requesterName,
    title: request.title,
    amount: request.amount,
    dateText: request.dateText,
    status: statusText(request.status),
  }))
}

export async function FinancePage({ route }: { route: FinanceRoute }) {
  const blocked = await moduleAccessBlock(
    "accounting_finance",
    "Accounting / Finance",
    financeRoles
  )

  if (blocked) {
    return blocked
  }

  const [finance, oa] = await Promise.all([
    getFinancePageData(),
    getOaPageData(),
  ])
  const claims = oa.requests.filter((request) => request.requestType === "claim")
  const advances = oa.requests.filter(
    (request) => request.requestType === "advance"
  )
  const arInvoices = finance.invoices.filter(
    (invoice) => invoice.invoiceType === "AR"
  )
  const apInvoices = finance.invoices.filter(
    (invoice) => invoice.invoiceType === "AP"
  )
  const operationalQueue = buildOperationalQueue({
    invoices: finance.invoices,
    containers: finance.containers,
    claims,
    advances,
  })

  return (
    <div className="space-y-5">
      <PageHeader route={route} demoMode={finance.demoMode || oa.demoMode} />
      <FinanceNav route={route} />

      {route === "dashboard" ? (
        <>
          <OperationalReviewBoard items={operationalQueue} />
          <KpiCards kpis={finance.dashboard.kpis} />
          <div className="grid gap-4 xl:grid-cols-2">
            <AccountReviewInvoiceForm invoices={finance.invoices} />
            <PaidInvoiceForm invoices={finance.invoices} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Latest AR and AP invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={invoiceColumns}
                data={invoiceRows(finance.invoices).slice(0, 10)}
              />
            </CardContent>
          </Card>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Debtor aging</CardTitle>
                <CardDescription>Outstanding AR by invoice age.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={agingColumns} data={agingRows(finance.invoices, "AR")} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Creditor aging</CardTitle>
                <CardDescription>Outstanding AP by invoice age.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={agingColumns} data={agingRows(finance.invoices, "AP")} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent finance activity</CardTitle>
              <CardDescription>Invoices and containers needing finance follow-up.</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivityList
                items={[
                  ...finance.invoices.slice(0, 4).map((invoice) => ({
                    id: invoice.id,
                    title: invoice.invoiceNo,
                    description: `${invoice.invoiceType} | ${invoice.partyName}`,
                    status: invoice.status,
                    meta: dateText(invoice.createdAt),
                  })),
                  ...finance.containers.slice(0, 3).map((container) => ({
                    id: container.id,
                    title: container.containerNo,
                    description: container.supplierName,
                    status: container.status,
                    meta: container.etaDate ? `ETA ${dateText(container.etaDate)}` : "ETA not set",
                  })),
                ]}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "claims" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminReviewForm requests={claims} />
            <PaidRequestForm requests={claims} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Claims</CardTitle>
              <CardDescription>OA claim request review and payment status.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={requestColumns} data={requestRows(claims)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "advances" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminReviewForm requests={advances} />
            <PaidRequestForm requests={advances} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Advances</CardTitle>
              <CardDescription>OA advance request review and payment status.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={requestColumns} data={requestRows(advances)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "ar-invoices" ? (
        <>
          <FinanceInvoiceForm invoiceType="AR" />
          <Card>
            <CardHeader>
              <CardTitle>AR invoices</CardTitle>
              <CardDescription>Customer receivables and approval status.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={invoiceColumns} data={invoiceRows(arInvoices)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "ap-invoices" ? (
        <>
          <FinanceInvoiceForm invoiceType="AP" />
          <Card>
            <CardHeader>
              <CardTitle>AP invoices</CardTitle>
              <CardDescription>Supplier payables and approval status.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={invoiceColumns} data={invoiceRows(apInvoices)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "containers" ? (
        <>
          <FinanceContainerForm invoices={finance.invoices} />
          <Card>
            <CardHeader>
              <CardTitle>Containers</CardTitle>
              <CardDescription>Container ETA, arrival, cost, and linked AP invoice.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={containerColumns}
                data={containerRows(finance.containers)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
