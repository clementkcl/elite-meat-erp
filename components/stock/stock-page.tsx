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
import {
  CsvExportButton,
  PrintButton,
} from "@/components/stock/report-actions"
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
    title: "Outbound Sales",
    description: "Scan barcode stock out for retail or sales movement.",
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
  const data = await getStockPageData(filters)

  return (
    <div className="space-y-5">
      <PageHeader route={route} demoMode={data.demoMode} />

      {route === "dashboard" ? <DashboardView data={data} /> : null}

      {route === "items" ? (
        <>
          <ItemMasterForm />
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
        />
      ) : null}

      {route === "outbound" ? <OutboundSalesForm /> : null}

      {route === "transfer" ? (
        <TransferForm locations={data.locations} />
      ) : null}

      {route === "receive-transfer" ? (
        <ReceiveTransferForm locations={data.locations} />
      ) : null}

      {route === "return" ? <ReturnForm locations={data.locations} /> : null}

      {route === "no-barcode-inbound" ? (
        <NoBarcodeInboundForm items={data.items} locations={data.locations} />
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
            <div className="flex gap-2 print:hidden">
              <CsvExportButton
                rows={reportRows(data)}
                filename="elite-meat-stock-report.csv"
              />
              <PrintButton />
            </div>
          </CardHeader>
          <CardContent>
            <DataTable columns={reportColumns} data={reportRows(data)} />
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
