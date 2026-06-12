import { Search } from "lucide-react"

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
import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import { StockDashboardCharts } from "@/components/stock/dashboard-charts"
import { ReportToolbar } from "@/components/ui/report-toolbar"
import {
  BarcodeInboundForm,
  ItemMasterForm,
  MasterDataForms,
  NoBarcodeInboundForm,
  OutboundSalesForm,
  ReceiveTransferForm,
  ReturnForm,
  StockTakeWorkbench,
  TransferForm,
} from "@/components/stock/workflow-forms"
import { getStockPageData } from "@/lib/stock/data"
import { stockMovementTypes, type MovementFilters } from "@/lib/stock/types"
import { getOrdersPageData } from "@/lib/orders/data"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { hasAnyRole, requireCurrentProfile } from "@/lib/auth/session"
import type { UserRole } from "@/lib/auth/types"

export type StockRoute =
  | "dashboard"
  | "items"
  | "inbound"
  | "outbound"
  | "transfer"
  | "receive-transfer"
  | "return"
  | "no-barcode-inbound"
  | "balance"
  | "movements"
  | "stock-take"
  | "reports"
  | "settings"

type TableRow = Record<string, string | number | boolean>

const stockRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
  "director",
]

const stockOperatorRoles: UserRole[] = stockRoles.filter(
  (role) => role !== "director"
)

const stockRouteRoles: Partial<Record<StockRoute, UserRole[]>> = {
  inbound: stockOperatorRoles,
  outbound: stockOperatorRoles,
  transfer: stockOperatorRoles,
  "receive-transfer": stockOperatorRoles,
  return: stockOperatorRoles,
  "no-barcode-inbound": stockOperatorRoles,
}

const titles: Record<StockRoute, { title: string; description: string }> = {
  dashboard: {
    title: "Stock Dashboard",
    description: "Live stock KPIs, category mix, movement trend, and location weight.",
  },
  items: {
    title: "Item Master",
    description: "Create and review item master records used by all stock workflows.",
  },
  inbound: {
    title: "Barcode Inbound",
    description: "Receive barcode-tracked stock units into a selected location.",
  },
  outbound: {
    title: "Order Outbound",
    description: "Attach scanned barcode stock units to a customer order and confirm outbound type.",
  },
  transfer: {
    title: "Stock Transfer",
    description: "Create pending transfers between stock locations.",
  },
  "receive-transfer": {
    title: "Receive Transfer",
    description: "Confirm pending transfer stock at the destination location.",
  },
  return: {
    title: "Stock Return",
    description: "Return barcode stock back to an active location.",
  },
  "no-barcode-inbound": {
    title: "No-Barcode Inbound",
    description: "Receive loose or bulk stock by quantity and weight.",
  },
  balance: {
    title: "Stock Balance",
    description: "Current stock on hand by item and location.",
  },
  movements: {
    title: "Movement History",
    description: "Search and filter every important stock movement.",
  },
  "stock-take": {
    title: "Stock Take",
    description: "Create sessions, count actual stock, submit, review, and approve.",
  },
  reports: {
    title: "Stock Reports",
    description: "Printable and exportable stock summaries.",
  },
  settings: {
    title: "Stock Settings",
    description: "Manage brands, origins, and stock locations.",
  },
}

const itemColumns: DataTableColumn<TableRow>[] = [
  { key: "itemCode", header: "Item code" },
  { key: "category", header: "Category" },
  { key: "section", header: "Section" },
  { key: "name", header: "Name" },
  { key: "barcodeRequired", header: "Barcode" },
  { key: "active", header: "Active" },
]

const balanceColumns: DataTableColumn<TableRow>[] = [
  { key: "locationName", header: "Location" },
  { key: "itemName", header: "Item" },
  { key: "category", header: "Category" },
  { key: "unitCount", header: "Barcode units", align: "right" },
  { key: "totalWeightKg", header: "Barcode kg", align: "right" },
  { key: "noBarcodeQuantity", header: "No-barcode qty", align: "right" },
  { key: "noBarcodeWeightKg", header: "No-barcode kg", align: "right" },
  { key: "totalQuantity", header: "Total qty", align: "right" },
  { key: "combinedWeightKg", header: "Total kg", align: "right" },
  { key: "stockStatus", header: "Alert" },
]

const movementColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Time" },
  { key: "movementType", header: "Type" },
  { key: "itemName", header: "Item" },
  { key: "barcode", header: "Barcode" },
  { key: "fromLocation", header: "From" },
  { key: "toLocation", header: "To" },
  { key: "quantity", header: "Qty", align: "right" },
  { key: "weightKg", header: "Kg", align: "right" },
  { key: "referenceNo", header: "Ref" },
]

const reportColumns: DataTableColumn<TableRow>[] = [
  { key: "reportName", header: "Report" },
  { key: "locationName", header: "Location" },
  { key: "category", header: "Category" },
  { key: "count", header: "Count", align: "right" },
  { key: "weightKg", header: "Kg", align: "right" },
  { key: "generatedAt", header: "Generated" },
]

const masterColumns: DataTableColumn<TableRow>[] = [
  { key: "name", header: "Name" },
  { key: "active", header: "Active" },
]

function dateText(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function PageHeader({
  route,
  demoMode,
}: {
  route: StockRoute
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

function KpiCards({ kpis }: { kpis: { label: string; value: string; detail: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

function NegativeStockAlertPanel({
  alerts,
}: {
  alerts: Awaited<
    ReturnType<typeof getStockPageData>
  >["dashboard"]["negativeStockAlerts"]
}) {
  if (alerts.length === 0) {
    return null
  }

  const previewAlerts = alerts.slice(0, 4)
  const hiddenCount = alerts.length - previewAlerts.length

  return (
    <Card className="border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-red-900 dark:text-red-100">
              Negative stock alert
            </CardTitle>
            <CardDescription className="text-red-800/80 dark:text-red-200/80">
              Temporary negative stock is allowed, but these balances need review.
            </CardDescription>
          </div>
          <Badge variant="destructive">{alerts.length} open</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {previewAlerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-md border border-red-200 bg-background p-3 text-sm dark:border-red-900"
          >
            <div className="font-medium">{alert.itemName}</div>
            <div className="mt-1 text-muted-foreground">{alert.locationName}</div>
            <div className="mt-2 tabular-nums text-red-700 dark:text-red-300">
              Qty {alert.quantity.toLocaleString()} /{" "}
              {alert.weightKg.toLocaleString(undefined, {
                maximumFractionDigits: 3,
              })}{" "}
              kg
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {alert.reason}
            </div>
          </div>
        ))}
        {hiddenCount > 0 ? (
          <div className="rounded-md border border-dashed border-red-200 bg-background p-3 text-sm text-muted-foreground dark:border-red-900">
            {hiddenCount} more negative stock balance
            {hiddenCount === 1 ? "" : "s"} in the balance report.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function StockAgeAlertPanel({
  alerts,
}: {
  alerts: Awaited<ReturnType<typeof getStockPageData>>["dashboard"]["stockAgeAlerts"]
}) {
  if (alerts.length === 0) {
    return null
  }

  const previewAlerts = alerts.slice(0, 4)
  const hiddenCount = alerts.length - previewAlerts.length

  return (
    <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-amber-950 dark:text-amber-100">
              Stock age alert
            </CardTitle>
            <CardDescription className="text-amber-900/80 dark:text-amber-200/80">
              Review stock older than 6 months. Stock over 12 months is highest priority.
            </CardDescription>
          </div>
          <Badge variant="warning">{alerts.length} open</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {previewAlerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-md border border-amber-200 bg-background p-3 text-sm dark:border-amber-900"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{alert.itemName}</span>
              <Badge
                variant={
                  alert.alertLevel === "OVER_12_MONTHS"
                    ? "destructive"
                    : "warning"
                }
              >
                {alert.alertLevel.replaceAll("_", " ")}
              </Badge>
            </div>
            <div className="mt-1 text-muted-foreground">{alert.locationName}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {alert.barcode} received {dateText(alert.receivedAt)}
            </div>
            <div className="mt-1 tabular-nums text-amber-800 dark:text-amber-200">
              {alert.ageDays.toLocaleString()} days old
            </div>
          </div>
        ))}
        {hiddenCount > 0 ? (
          <div className="rounded-md border border-dashed border-amber-200 bg-background p-3 text-sm text-muted-foreground dark:border-amber-900">
            {hiddenCount} more aged stock unit{hiddenCount === 1 ? "" : "s"} in
            scoped stock.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function itemRows(data: Awaited<ReturnType<typeof getStockPageData>>): TableRow[] {
  return data.items.map((item) => ({
    itemCode: item.itemCode,
    category: item.category,
    section: item.section,
    name: item.name,
    barcodeRequired: item.barcodeRequired,
    active: item.active,
  }))
}

function balanceRows(data: Awaited<ReturnType<typeof getStockPageData>>): TableRow[] {
  return data.balances.map((balance) => ({
    locationName: balance.locationName,
    itemName: balance.itemName,
    category: balance.category,
    unitCount: balance.unitCount,
    totalWeightKg: balance.totalWeightKg,
    noBarcodeQuantity: balance.noBarcodeQuantity,
    noBarcodeWeightKg: balance.noBarcodeWeightKg,
    totalQuantity: balance.totalQuantity,
    combinedWeightKg: balance.combinedWeightKg,
    stockStatus: balance.hasNegativeStock ? "NEGATIVE_STOCK" : "OK",
  }))
}

function movementRows(data: Awaited<ReturnType<typeof getStockPageData>>): TableRow[] {
  return data.movements.map((movement) => ({
    createdAt: dateText(movement.createdAt),
    movementType: movement.movementType,
    itemName: movement.itemName,
    barcode: movement.barcode,
    fromLocation: movement.fromLocation,
    toLocation: movement.toLocation,
    quantity: movement.quantity,
    weightKg: movement.weightKg,
    referenceNo: movement.referenceNo,
  }))
}

function reportRows(data: Awaited<ReturnType<typeof getStockPageData>>): TableRow[] {
  return data.reports.map((report) => ({
    reportName: report.reportName,
    locationName: report.locationName,
    category: report.category,
    count: report.count,
    weightKg: report.weightKg,
    generatedAt: dateText(report.generatedAt),
  }))
}

function csvCell(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function buildCsv(rows: TableRow[]) {
  const headers = Object.keys(rows[0] ?? {})

  if (headers.length === 0) {
    return ""
  }

  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n")
}

function buildStockWhatsappSummary(
  rows: TableRow[],
  negativeStockAlertCount: number,
  stockAgeAlertCount: number
) {
  const totalCount = rows.reduce((sum, row) => sum + Number(row.count ?? 0), 0)
  const totalWeight = rows.reduce((sum, row) => sum + Number(row.weightKg ?? 0), 0)
  const locations = new Set(rows.map((row) => String(row.locationName))).size

  return [
    "Elite Meat Stock Report",
    `Locations: ${locations}`,
    `Report rows: ${rows.length}`,
    `Total count: ${totalCount}`,
    `Total weight: ${totalWeight.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} kg`,
    `Negative stock alerts: ${negativeStockAlertCount}`,
    `Stock age alerts: ${stockAgeAlertCount}`,
  ].join("\n")
}

function masterRows(rows: { name: string; active: boolean }[]): TableRow[] {
  return rows.map((row) => ({
    name: row.name,
    active: row.active,
  }))
}

function MovementsFilter({ filters }: { filters: MovementFilters }) {
  return (
    <Card>
      <CardContent className="pt-4 sm:pt-5">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_1fr_auto]" method="get">
          <div className="space-y-2">
            <Label htmlFor="q">Search</Label>
            <Input id="q" name="q" defaultValue={filters.q ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              defaultValue={filters.type ?? ""}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="">All movement types</option>
              {stockMovementTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={filters.location ?? ""}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full md:w-auto">
              <Search className="size-4" />
              Filter
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function DashboardView({
  data,
}: {
  data: Awaited<ReturnType<typeof getStockPageData>>
}) {
  return (
    <>
      <KpiCards kpis={data.dashboard.kpis} />
      <StockDashboardCharts
        categoryMix={data.dashboard.categoryMix}
        locationStock={data.dashboard.locationStock}
        movementTrend={data.dashboard.movementTrend}
      />
      <Card>
        <CardHeader>
          <CardTitle>Latest movements</CardTitle>
          <CardDescription>Most recent stock activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={movementColumns}
            data={movementRows(data).slice(0, 8)}
          />
        </CardContent>
      </Card>
    </>
  )
}

function SettingsTables({
  data,
}: {
  data: Awaited<ReturnType<typeof getStockPageData>>
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Brands</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={masterColumns} data={masterRows(data.brands)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Origins</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={masterColumns} data={masterRows(data.origins)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={masterColumns} data={masterRows(data.locations)} />
        </CardContent>
      </Card>
    </div>
  )
}

export async function StockPage({
  route,
  filters = {},
}: {
  route: StockRoute
  filters?: MovementFilters
}) {
  const blocked = await moduleAccessBlock(
    "stock",
    "Stock",
    stockRouteRoles[route] ?? stockRoles
  )

  if (blocked) {
    return blocked
  }

  const profile = await requireCurrentProfile()
  const canOperateStock = hasAnyRole(profile, stockOperatorRoles)
  const canApproveStock = hasAnyRole(profile, ["admin", "director"])

  const [data, ordersResult] = await Promise.all([
    getStockPageData(filters),
    route === "outbound"
      ? getOrdersPageData()
          .then((ordersData) => ({ ordersData, error: null }))
          .catch((error: unknown) => ({
            ordersData: null,
            error:
              error instanceof Error
                ? error.message
                : "Orders data could not load.",
          }))
      : Promise.resolve(null),
  ])
  const stockReportRows = reportRows(data)
  const stockReportCsv = buildCsv(stockReportRows)
  const stockReportCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    stockReportCsv
  )}`
  const stockWhatsappSummary = buildStockWhatsappSummary(
    stockReportRows,
    data.dashboard.negativeStockAlerts.length,
    data.dashboard.stockAgeAlerts.length
  )

  return (
    <div className="space-y-5">
      <PageHeader route={route} demoMode={data.demoMode} />
      <NegativeStockAlertPanel alerts={data.dashboard.negativeStockAlerts} />
      <StockAgeAlertPanel alerts={data.dashboard.stockAgeAlerts} />

      {route === "dashboard" ? <DashboardView data={data} /> : null}

      {route === "items" ? (
        <>
          <ItemMasterForm items={data.items} />
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Active item master records.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={itemColumns} data={itemRows(data)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "inbound" ? (
        <BarcodeInboundForm
          items={data.items}
          brands={data.brands}
          origins={data.origins}
          locations={data.locations}
          barcodeWeightRules={data.barcodeWeightRules}
        />
      ) : null}

      {route === "outbound" ? (
        ordersResult?.ordersData ? (
          <OutboundSalesForm
            orders={ordersResult.ordersData.orders}
            locations={data.locations}
            units={data.units}
            items={data.items}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Order outbound unavailable</CardTitle>
              <CardDescription>
                Check that the Orders migrations were applied before using
                order-based outbound scanning.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-destructive">
              {ordersResult?.error ?? "Orders data could not load."}
            </CardContent>
          </Card>
        )
      ) : null}

      {route === "transfer" ? (
        <TransferForm locations={data.locations} />
      ) : null}

      {route === "receive-transfer" ? (
        <ReceiveTransferForm locations={data.locations} />
      ) : null}

      {route === "return" ? <ReturnForm locations={data.locations} /> : null}

      {route === "no-barcode-inbound" ? (
        <NoBarcodeInboundForm
          items={data.items}
          brands={data.brands}
          origins={data.origins}
          locations={data.locations}
        />
      ) : null}

      {route === "balance" ? (
        <Card>
          <CardHeader>
            <CardTitle>Balance by item and location</CardTitle>
            <CardDescription>
              Barcode units and no-barcode stock combined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={balanceColumns} data={balanceRows(data)} />
          </CardContent>
        </Card>
      ) : null}

      {route === "movements" ? (
        <>
          <MovementsFilter filters={filters} />
          <Card>
            <CardHeader>
              <CardTitle>Movement log</CardTitle>
              <CardDescription>
                Inbound, outbound, transfer, return, stock take, and manual
                movement activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={movementColumns} data={movementRows(data)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "stock-take" ? (
        <StockTakeWorkbench
          items={data.items}
          locations={data.locations}
          balances={data.balances}
          sessions={data.stockTakeSessions}
          lines={data.stockTakeLines}
          canOperate={canOperateStock}
          canApprove={canApproveStock}
        />
      ) : null}

      {route === "reports" ? (
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Printable stock reports</CardTitle>
              <CardDescription>
                Summary totals by location and category.
              </CardDescription>
            </div>
            <ReportToolbar
              csvHref={stockReportCsvHref}
              filename="elite-meat-stock-report.csv"
              whatsappText={stockWhatsappSummary}
            />
          </CardHeader>
          <CardContent>
            <DataTable columns={reportColumns} data={stockReportRows} />
          </CardContent>
        </Card>
      ) : null}

      {route === "settings" ? (
        <>
          <MasterDataForms />
          <SettingsTables data={data} />
        </>
      ) : null}

      {["inbound", "outbound", "transfer", "receive-transfer", "return", "no-barcode-inbound"].includes(
        route
      ) ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent movements</CardTitle>
            <CardDescription>
              Recent stock actions for quick confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={movementColumns}
              data={movementRows(data).slice(0, 10)}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
