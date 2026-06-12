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

type ReportPeriod = {
  start: string
  end: string
  label: string
}

const titles: Record<DirectorRoute, { title: string; description: string }> = {
  dashboard: {
    title: "Director Dashboard",
    description: "Executive view of approvals, finance exposure, and report snapshots.",
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
          <KpiCards kpis={directorKpis} />
          <Card>
            <CardHeader>
              <CardTitle>Pending approvals</CardTitle>
              <CardDescription>OA, finance, and retail items waiting for decision.</CardDescription>
            </CardHeader>
            <CardContent>
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
