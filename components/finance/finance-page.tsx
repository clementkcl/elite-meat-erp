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

const titles: Record<FinanceRoute, { title: string; description: string }> = {
  dashboard: {
    title: "Accounting Dashboard",
    description: "Receivables, payables, director approvals, and container exposure.",
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

  return (
    <div className="space-y-5">
      <PageHeader route={route} demoMode={finance.demoMode || oa.demoMode} />
      <FinanceNav route={route} />

      {route === "dashboard" ? (
        <>
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
