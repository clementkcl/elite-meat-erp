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
  DirectorInvoiceDecisionForm,
  DirectorReportSnapshotForm,
} from "@/components/finance/finance-forms"
import { DirectorDecisionForm } from "@/components/oa-actions/oa-forms"
import { RetailExpenseStatusForm } from "@/components/retail/retail-forms"
import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import { RecentActivityList } from "@/components/ui/recent-activity-list"
import { ReportToolbar } from "@/components/ui/report-toolbar"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import type { UserRole } from "@/lib/auth/types"
import { getFinancePageData } from "@/lib/finance/data"
import type { DirectorReportSnapshot, FinanceInvoice } from "@/lib/finance/types"
import { getAttendancePageData } from "@/lib/attendance/data"
import { getDeliveryPageData } from "@/lib/delivery/data"
import { getOaPageData } from "@/lib/oa-actions/data"
import type { UnifiedOaRequest } from "@/lib/oa-actions/types"
import { getRetailPageData } from "@/lib/retail/data"
import type { RetailExpense } from "@/lib/retail/types"
import { getStockPageData } from "@/lib/stock/data"

export type DirectorRoute = "dashboard" | "approvals" | "reports"

type TableRow = Record<string, string | number | boolean>

const directorRoles: UserRole[] = ["director", "admin"]

type DirectorOverviewItem = {
  label: string
  value: string
  detail: string
  href: string
  action: string
  tone?: "default" | "warning" | "danger"
}

type ReportPeriod = {
  start: string
  end: string
  label: string
}

const titles: Record<DirectorRoute, { title: string; description: string }> = {
  dashboard: {
    title: "Director Dashboard",
    description:
      "All-in-one company overview for sales, stock, orders, delivery, attendance, cleaning, processing, approvals, finance, and alerts.",
  },
  approvals: {
    title: "Director Approvals",
    description: "Approve or reject OA requests, finance invoices, and outlet expenses.",
  },
  reports: {
    title: "Director Reports",
    description: "Review and save director-facing KPI snapshots.",
  },
}

const navItems: { route: DirectorRoute; href: string; label: string }[] = [
  { route: "dashboard", href: "/director-reports/dashboard", label: "Dashboard" },
  { route: "approvals", href: "/director-reports/approvals", label: "Approvals" },
  { route: "reports", href: "/director-reports/reports", label: "Reports" },
]

const approvalColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "module", header: "Module" },
  { key: "reference", header: "Reference" },
  { key: "party", header: "Party" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "status", header: "Status" },
]

const reportColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "reportNo", header: "Report" },
  { key: "reportType", header: "Type" },
  { key: "period", header: "Period" },
  { key: "totalSales", header: "Sales", align: "right" },
  { key: "cashCollected", header: "Cash", align: "right" },
  { key: "outstandingAr", header: "AR", align: "right" },
  { key: "outstandingAp", header: "AP", align: "right" },
  { key: "expenseTotal", header: "Expenses", align: "right" },
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

function localDateText(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function currentMonthPeriod(): ReportPeriod {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(startDate)

  return {
    start: localDateText(startDate),
    end: localDateText(endDate),
    label: `${monthLabel} (${localDateText(startDate)} to ${localDateText(endDate)})`,
  }
}

function dateKey(value: string | null) {
  return value ? value.slice(0, 10) : ""
}

function isInPeriod(value: string | null, period: ReportPeriod) {
  const key = dateKey(value)

  return key >= period.start && key <= period.end
}

function statusText(value: string) {
  if (value === "ACCOUNT_REVIEWED") {
    return "ADMIN REVIEWED"
  }

  return value.replaceAll("_", " ")
}

function PageHeader({
  route,
  demoMode,
}: {
  route: DirectorRoute
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

function DirectorNav({ route }: { route: DirectorRoute }) {
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

function findKpi(
  kpis: { label: string; value: string; detail: string }[],
  label: string
) {
  return kpis.find((kpi) => kpi.label === label) ?? {
    label,
    value: "-",
    detail: "No data loaded",
  }
}

function buildDirectorOverviewItems({
  kpis,
  pendingApprovals,
}: {
  kpis: { label: string; value: string; detail: string }[]
  pendingApprovals: number
}): DirectorOverviewItem[] {
  const sales = findKpi(kpis, "Sales this month")
  const stockWeight = findKpi(kpis, "Stock total weight")
  const lowStock = findKpi(kpis, "Low stock items")
  const pendingDelivery = findKpi(kpis, "Pending delivery")
  const absent = findKpi(kpis, "Absent staff this month")
  const late = findKpi(kpis, "Late staff this month")
  const cleaning = findKpi(kpis, "Cleaning completion")
  const processing = findKpi(kpis, "Processing yield/loss")
  const ar = findKpi(kpis, "AR outstanding")
  const ap = findKpi(kpis, "AP outstanding")
  const containers = findKpi(kpis, "Container ETA approaching")

  return [
    {
      label: "Sales",
      value: sales.value,
      detail: "Current-month retail sales summary.",
      href: "/retail/reports",
      action: "Open sales reports",
    },
    {
      label: "Stock",
      value: stockWeight.value,
      detail: `${lowStock.value} low-stock rows need checking.`,
      href: "/stock/dashboard",
      action: "Check stock",
      tone: lowStock.value === "0" ? "default" : "warning",
    },
    {
      label: "Orders",
      value: pendingDelivery.value,
      detail: "Customer orders not delivered or cancelled.",
      href: "/orders",
      action: "Review orders",
      tone: pendingDelivery.value === "0" ? "default" : "warning",
    },
    {
      label: "Delivery",
      value: pendingDelivery.value,
      detail: "Delivery work still open for follow-up.",
      href: "/delivery",
      action: "Check delivery",
      tone: pendingDelivery.value === "0" ? "default" : "warning",
    },
    {
      label: "Attendance",
      value: `${absent.value} absent / ${late.value} late`,
      detail: "Staff attendance gaps this month.",
      href: "/attendance/today",
      action: "View attendance",
      tone: absent.value === "0" && late.value === "0" ? "default" : "warning",
    },
    {
      label: "Cleaning",
      value: cleaning.value,
      detail: "Required cleaning completion by due date.",
      href: "/retail/cleaning/history",
      action: "Check cleaning",
    },
    {
      label: "Processing",
      value: processing.value,
      detail: "Yield and loss summary; abnormal yield is alert-only.",
      href: "/processing/dashboard",
      action: "Review processing",
    },
    {
      label: "OA approvals",
      value: String(pendingApprovals),
      detail: "OA, finance, and outlet expense decisions waiting.",
      href: "/director-reports/approvals",
      action: "Open approvals",
      tone: pendingApprovals > 0 ? "danger" : "default",
    },
    {
      label: "Finance/accounting",
      value: `${ar.value} AR / ${ap.value} AP`,
      detail: `${containers.value} containers have ETA within 7 days.`,
      href: "/accounting-finance/dashboard",
      action: "Review finance",
      tone: containers.value === "0" ? "default" : "warning",
    },
    {
      label: "Alerts",
      value: String(
        [
          lowStock,
          pendingDelivery,
          absent,
          late,
          containers,
        ].filter((kpi) => kpi.value !== "0").length +
          (pendingApprovals > 0 ? 1 : 0)
      ),
      detail: "Open company-level exceptions first.",
      href: "/director-reports/approvals",
      action: "Open alerts first",
      tone: "danger",
    },
  ]
}

function buildDirectorAlertItems({
  kpis,
  pendingApprovals,
}: {
  kpis: { label: string; value: string; detail: string }[]
  pendingApprovals: number
}): DirectorOverviewItem[] {
  const lowStock = findKpi(kpis, "Low stock items")
  const pendingDelivery = findKpi(kpis, "Pending delivery")
  const absent = findKpi(kpis, "Absent staff this month")
  const late = findKpi(kpis, "Late staff this month")
  const containers = findKpi(kpis, "Container ETA approaching")
  const ar = findKpi(kpis, "AR outstanding")

  return [
    {
      label: "Approval waiting",
      value: String(pendingApprovals),
      detail: "Director decisions needed now.",
      href: "/director-reports/approvals",
      action: "Review approvals",
      tone: pendingApprovals > 0 ? "danger" : "default",
    },
    {
      label: "Low stock",
      value: lowStock.value,
      detail: lowStock.detail,
      href: "/stock/dashboard",
      action: "Check stock",
      tone: lowStock.value === "0" ? "default" : "warning",
    },
    {
      label: "Delivery follow-up",
      value: pendingDelivery.value,
      detail: pendingDelivery.detail,
      href: "/delivery",
      action: "Check delivery",
      tone: pendingDelivery.value === "0" ? "default" : "warning",
    },
    {
      label: "Attendance gaps",
      value: `${absent.value} absent / ${late.value} late`,
      detail: "Attendance exceptions to review.",
      href: "/attendance/today",
      action: "View attendance",
      tone: absent.value === "0" && late.value === "0" ? "default" : "warning",
    },
    {
      label: "Finance exposure",
      value: ar.value,
      detail: "Outstanding receivables still unpaid.",
      href: "/accounting-finance/dashboard",
      action: "Review AR",
      tone: "warning",
    },
    {
      label: "Container ETA",
      value: containers.value,
      detail: containers.detail,
      href: "/accounting-finance/containers",
      action: "Check containers",
      tone: containers.value === "0" ? "default" : "warning",
    },
  ]
}

function itemToneClass(tone: DirectorOverviewItem["tone"]) {
  if (tone === "danger") {
    return "border-red-200 bg-red-50"
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50"
  }

  return "border-border bg-background"
}

function itemBadgeVariant(tone: DirectorOverviewItem["tone"]) {
  if (tone === "danger") {
    return "destructive"
  }

  if (tone === "warning") {
    return "warning"
  }

  return "secondary"
}

function DirectorCompanyOverview({
  items,
  alerts,
  period,
}: {
  items: DirectorOverviewItem[]
  alerts: DirectorOverviewItem[]
  period: ReportPeriod
}) {
  const directorReviewSteps = [
    "Open alerts first",
    "Review approvals",
    "Check operations",
    "Save/share report",
  ]
  const directorAlertSteps = [
    "Find urgent exception",
    "Open owner module",
    "Record follow-up",
  ]

  return (
    <section
      aria-labelledby="director-company-overview"
      className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Director company overview
          </p>
          <h2
            id="director-company-overview"
            className="text-xl font-semibold tracking-tight"
          >
            All-in-one company view
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Sales, stock, orders, delivery, attendance, cleaning, processing, OA
            approvals, finance/accounting, and alerts for {period.label}.
          </p>
        </div>
        <Badge variant="warning" className="w-fit">
          Alerts first
        </Badge>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="text-sm font-semibold">Director daily review order</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Use the same order each day before reading normal reports.
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {directorReviewSteps.map((step, index) => (
            <div key={step} className="rounded-md border bg-background px-3 py-3">
              <div className="text-xs font-medium text-muted-foreground">
                Step {index + 1}
              </div>
              <div className="mt-1 text-sm font-semibold">{step}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className={`flex min-h-40 flex-col justify-between rounded-lg border p-4 ${itemToneClass(
                item.tone
              )}`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{item.label}</h3>
                  <Badge variant={itemBadgeVariant(item.tone)}>
                    {item.tone === "danger"
                      ? "Act"
                      : item.tone === "warning"
                        ? "Check"
                        : "View"}
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

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Director alerts first</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Company-level exceptions to clear before normal reports.
              </p>
            </div>
            <Badge variant="destructive">Alerts</Badge>
          </div>
          <div className="mt-4 rounded-md border bg-background p-3">
            <div className="text-sm font-semibold">Director alert handling</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Clear urgent exceptions before reading normal KPI reports.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {directorAlertSteps.map((step) => (
                <div key={step} className="rounded-md border bg-muted/30 px-3 py-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Next
                  </div>
                  <div className="mt-1 text-sm font-semibold">{step}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.label}
                className="rounded-md border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{alert.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {alert.detail}
                    </div>
                  </div>
                  <div className="text-right text-lg font-semibold tabular-nums">
                    {alert.value}
                  </div>
                </div>
                <Button
                  asChild
                  variant="link"
                  size="sm"
                  className="mt-2 h-auto min-h-0 p-0"
                >
                  <Link href={alert.href}>{alert.action}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function DirectorApprovalClearGuide({ pendingCount }: { pendingCount: number }) {
  if (pendingCount > 0) {
    return null
  }

  const steps = [
    "Check operations",
    "Check finance aging",
    "Save/share report",
  ]

  return (
    <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <div className="font-semibold">No director approvals waiting</div>
      <div className="mt-1">
        OA, finance, and outlet expense decisions are clear. Continue with the
        company overview, finance aging, and report snapshot.
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
    </div>
  )
}

function money(value: number) {
  return `RM ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function numberText(value: number, digits = 0) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits })
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function buildDirectorCsv(kpis: { label: string; value: string; detail: string }[]) {
  return [
    ["Metric", "Value", "Detail"].map(csvCell).join(","),
    ...kpis.map((kpi) =>
      [kpi.label, kpi.value, kpi.detail].map(csvCell).join(",")
    ),
  ].join("\n")
}

function buildDirectorKpis({
  finance,
  oa,
  retail,
  attendance,
  delivery,
  stock,
  period,
}: {
  finance: Awaited<ReturnType<typeof getFinancePageData>>
  oa: Awaited<ReturnType<typeof getOaPageData>>
  retail: Awaited<ReturnType<typeof getRetailPageData>>
  attendance: Awaited<ReturnType<typeof getAttendancePageData>>
  delivery: Awaited<ReturnType<typeof getDeliveryPageData>>
  stock: Awaited<ReturnType<typeof getStockPageData>>
  period: ReportPeriod
}) {
  const today = localDateText(new Date())
  const periodSales = retail.sales.filter((sale) =>
    isInPeriod(sale.completedAt ?? sale.createdAt, period)
  )
  const salesAmount = periodSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
  const cashReceived = retail.payments
    .filter(
      (payment) =>
        payment.paymentMethod === "CASH" &&
        payment.paymentStatus === "PAID" &&
        isInPeriod(payment.createdAt, period)
    )
    .reduce((sum, payment) => sum + payment.amount, 0)
  const expenses = retail.expenses
    .filter((expense) => isInPeriod(expense.expenseDate, period))
    .reduce((sum, expense) => sum + expense.amount, 0)
  const stockWeight = stock.balances.reduce(
    (sum, balance) => sum + balance.totalWeightKg + balance.noBarcodeWeightKg,
    0
  )
  const lowStockItems = stock.balances.filter(
    (balance) => balance.totalWeightKg + balance.noBarcodeWeightKg <= 10
  ).length
  const pendingDelivery = delivery.orders.filter(
    (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED"
  ).length
  const pendingOa = oa.requests.filter(
    (request) =>
      request.status === "SUBMITTED" ||
      request.status === "MANAGER_REVIEWED" ||
      request.status === "ADMIN_REVIEWED"
  ).length
  const periodAttendance = attendance.summaries.filter(
    (summary) => isInPeriod(summary.workDate, period)
  )
  const absent = periodAttendance.filter(
    (summary) => summary.status === "ABSENT"
  ).length
  const late = periodAttendance.filter(
    (summary) => summary.status === "LATE"
  ).length
  const periodCleaning = retail.cleaningTasks.filter((task) =>
    isInPeriod(task.dueDate, period)
  )
  const cleaningTotal = periodCleaning.length
  const cleaningDone = periodCleaning.filter(
    (task) => task.status === "DONE"
  ).length
  const cleaningRate =
    cleaningTotal > 0 ? (cleaningDone / cleaningTotal) * 100 : 0
  const completedProcessing = retail.processingBatches.filter(
    (batch) =>
      (batch.status === "COMPLETED" || batch.status === "REVIEWED") &&
      isInPeriod(batch.processedAt, period)
  )
  const averageYield =
    completedProcessing.length > 0
      ? completedProcessing.reduce((sum, batch) => sum + batch.yieldPercent, 0) /
        completedProcessing.length
      : 0
  const processingLoss = completedProcessing.reduce(
    (sum, batch) => sum + batch.lossWeightKg,
    0
  )
  const arOutstanding = finance.invoices
    .filter((invoice) => invoice.invoiceType === "AR" && invoice.status !== "PAID")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const apOutstanding = finance.invoices
    .filter((invoice) => invoice.invoiceType === "AP" && invoice.status !== "PAID")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const etaSoon = finance.containers.filter((container) => {
    if (!container.etaDate) {
      return false
    }

    const days =
      (new Date(container.etaDate).getTime() - new Date(today).getTime()) /
      86400000
    return days >= 0 && days <= 7 && container.status !== "CLOSED"
  }).length

  return [
    { label: "Sales this month", value: money(salesAmount), detail: period.label },
    { label: "Cash received this month", value: money(cashReceived), detail: "Cash payments in current report period" },
    { label: "Expenses this month", value: money(expenses), detail: "Outlet expenses in current report period" },
    { label: "Stock total weight", value: `${numberText(stockWeight, 3)} kg`, detail: "Barcode and no-barcode stock" },
    { label: "Low stock items", value: String(lowStockItems), detail: "Rows at or below 10kg" },
    { label: "Pending delivery", value: String(pendingDelivery), detail: "Orders not delivered/cancelled" },
    { label: "Pending claims/advances", value: String(pendingOa), detail: "OA requests awaiting action" },
    { label: "Absent staff this month", value: String(absent), detail: "Attendance summaries marked absent" },
    { label: "Late staff this month", value: String(late), detail: "Clock-ins after grace period" },
    { label: "Cleaning completion", value: `${numberText(cleaningRate, 1)}%`, detail: "Completed cleaning tasks due this month" },
    { label: "Processing yield/loss", value: `${numberText(averageYield, 1)}% / ${numberText(processingLoss, 3)} kg`, detail: "Current-month average yield and total loss" },
    { label: "AR outstanding", value: money(arOutstanding), detail: "Receivables not paid" },
    { label: "AP outstanding", value: money(apOutstanding), detail: "Payables not paid" },
    { label: "Container ETA approaching", value: String(etaSoon), detail: "Open containers due within 7 days" },
  ]
}

function approvalRows({
  oaRequests,
  invoices,
  expenses,
}: {
  oaRequests: UnifiedOaRequest[]
  invoices: FinanceInvoice[]
  expenses: RetailExpense[]
}): TableRow[] {
  return [
    ...oaRequests.map((request) => ({
      createdAt: dateText(request.createdAt),
      module: "OA",
      reference: request.requestType.toUpperCase(),
      party: request.requesterName,
      amount: request.amount,
      status: statusText(request.status),
    })),
    ...invoices.map((invoice) => ({
      createdAt: dateText(invoice.createdAt),
      module: "Finance",
      reference: invoice.invoiceNo,
      party: invoice.partyName,
      amount: invoice.totalAmount,
      status: statusText(invoice.status),
    })),
    ...expenses.map((expense) => ({
      createdAt: dateText(expense.createdAt),
      module: "Retail",
      reference: expense.category,
      party: expense.outletName,
      amount: expense.amount,
      status: statusText(expense.status),
    })),
  ]
}

function reportRows(reports: DirectorReportSnapshot[]): TableRow[] {
  return reports.map((report) => ({
    createdAt: dateText(report.createdAt),
    reportNo: report.reportNo,
    reportType: report.reportType,
    period: `${dateText(report.periodStart)} to ${dateText(report.periodEnd)}`,
    totalSales: report.totalSales,
    cashCollected: report.cashCollected,
    outstandingAr: report.outstandingAr,
    outstandingAp: report.outstandingAp,
    expenseTotal: report.expenseTotal,
  }))
}

export async function DirectorPage({ route }: { route: DirectorRoute }) {
  const blocked = await moduleAccessBlock(
    "director_reports",
    "Director Reports",
    directorRoles
  )

  if (blocked) {
    return blocked
  }

  const [finance, oa, retail, attendance, delivery, stock] = await Promise.all([
    getFinancePageData(),
    getOaPageData(),
    getRetailPageData(),
    getAttendancePageData(),
    getDeliveryPageData(),
    getStockPageData(),
  ])
  const reportPeriod = currentMonthPeriod()
  const directorKpis = buildDirectorKpis({
    finance,
    oa,
    retail,
    attendance,
    delivery,
    stock,
    period: reportPeriod,
  })
  const whatsappSummary = [
    `Elite Meat Director Report`,
    `Period: ${reportPeriod.label}`,
    ...directorKpis.map((kpi) => `${kpi.label}: ${kpi.value}`),
  ]
    .join("\n")
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    buildDirectorCsv(directorKpis)
  )}`
  const oaPending = oa.requests.filter(
    (request) => request.status === "ADMIN_REVIEWED"
  )
  const financePending = finance.invoices.filter(
    (invoice) => invoice.status === "ACCOUNT_REVIEWED"
  )
  const retailPending = retail.expenses.filter(
    (expense) =>
      expense.status === "SUBMITTED" || expense.status === "REVIEWED"
  )
  const pendingRows = approvalRows({
    oaRequests: oaPending,
    invoices: financePending,
    expenses: retailPending,
  })
  const overviewItems = buildDirectorOverviewItems({
    kpis: directorKpis,
    pendingApprovals: pendingRows.length,
  })
  const alertItems = buildDirectorAlertItems({
    kpis: directorKpis,
    pendingApprovals: pendingRows.length,
  })

  return (
    <div className="space-y-5">
      <PageHeader
        route={route}
        demoMode={finance.demoMode || oa.demoMode || retail.demoMode}
      />
      <Badge variant="secondary" className="w-fit">
        Reporting period: {reportPeriod.label}
      </Badge>
      <DirectorNav route={route} />

      {route === "dashboard" ? (
        <>
          <DirectorCompanyOverview
            items={overviewItems}
            alerts={alertItems}
            period={reportPeriod}
          />
          <KpiCards kpis={directorKpis} />
          <Card>
            <CardHeader>
              <CardTitle>Pending approvals</CardTitle>
              <CardDescription>OA, finance, and retail items waiting for decision.</CardDescription>
            </CardHeader>
            <CardContent>
              <DirectorApprovalClearGuide pendingCount={pendingRows.length} />
              <DataTable columns={approvalColumns} data={pendingRows} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Director activity focus</CardTitle>
              <CardDescription>Oldest pending approval items to review first.</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivityList
                items={pendingRows.slice(0, 8).map((row, index) => ({
                  id: `${row.module}-${row.reference}-${index}`,
                  title: `${row.module}: ${row.reference}`,
                  description: String(row.party),
                  status: String(row.status),
                  meta: `${row.createdAt} | RM ${Number(row.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                }))}
                emptyText="No director approvals pending."
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Latest reports</CardTitle>
              <CardDescription>Saved director report snapshots.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={reportColumns}
                data={reportRows(finance.reports).slice(0, 8)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "approvals" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <DirectorDecisionForm requests={oa.requests} />
            <DirectorInvoiceDecisionForm invoices={finance.invoices} />
            <RetailExpenseStatusForm expenses={retail.expenses} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Approval queue</CardTitle>
              <CardDescription>All director-facing approval items.</CardDescription>
            </CardHeader>
            <CardContent>
              <DirectorApprovalClearGuide pendingCount={pendingRows.length} />
              <DataTable columns={approvalColumns} data={pendingRows} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "reports" ? (
        <>
          <DirectorReportSnapshotForm
            defaultPeriod={{ start: reportPeriod.start, end: reportPeriod.end }}
          />
          <Card className="print:shadow-none">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Print / PDF view</CardTitle>
                <CardDescription>Use browser print to save this section as PDF.</CardDescription>
              </div>
              <ReportToolbar
                csvHref={csvHref}
                filename="director-kpi-summary.csv"
                whatsappText={whatsappSummary}
              />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {directorKpis.map((kpi) => (
                  <div key={kpi.label} className="border-b pb-2">
                    <div className="text-sm text-muted-foreground">{kpi.label}</div>
                    <div className="text-lg font-semibold">{kpi.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>WhatsApp summary</CardTitle>
                  <CardDescription>Plain text summary for manual sharing.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                {whatsappSummary}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Report snapshots</CardTitle>
              <CardDescription>Director KPI snapshots saved by period.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={reportColumns} data={reportRows(finance.reports)} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
