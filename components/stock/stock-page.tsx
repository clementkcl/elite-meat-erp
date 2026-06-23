import {
  ArrowRightLeft,
  ClipboardList,
  PackageCheck,
  PackagePlus,
  RotateCcw,
  Search,
  Send,
} from "lucide-react"

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
import { StockUnitsTableClient } from "@/components/stock/stock-units-table-client"
import { ReportToolbar } from "@/components/ui/report-toolbar"
import {
  BarcodeInboundForm,
  DamageRequestWorkbench,
  InspectionReleaseForm,
  ItemMasterForm,
  MasterDataForms,
  NoBarcodeInboundForm,
  OutboundSalesForm,
  ReceiveTransferForm,
  ReturnForm,
  ReturnSupplierWorkbench,
  StockTakeWorkbench,
  TransferForm,
} from "@/components/stock/workflow-forms"
import { getStockPageData } from "@/lib/stock/data"
import {
  buildCsv,
  buildStockWhatsappSummary,
  type StockReportTableRow,
} from "@/lib/stock/report-export"
import {
  stockMovementTypes,
  stockUnitStatuses,
  type MovementFilters,
} from "@/lib/stock/types"
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

type TableRow = StockReportTableRow

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

const stockItemMasterRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
  "director",
]

const stockOperatorRoles: UserRole[] = stockRoles.filter(
  (role) => role !== "director"
)

const stockWorkerRoles: UserRole[] = [
  "retail_team_general_worker",
  "delivery_team_general_worker",
  "processing_team_general_worker",
]

const stockManagerRoles: UserRole[] = [
  "retail_manager",
  "delivery_manager",
  "processing_manager",
  "admin",
]

const stockAdvancedRoles: UserRole[] = [...stockManagerRoles, "director"]

const stockRouteRoles: Partial<Record<StockRoute, UserRole[]>> = {
  items: stockItemMasterRoles,
  inbound: stockOperatorRoles,
  outbound: stockOperatorRoles,
  transfer: stockOperatorRoles,
  "receive-transfer": stockOperatorRoles,
  return: stockOperatorRoles,
  "no-barcode-inbound": stockOperatorRoles,
  reports: stockAdvancedRoles,
  settings: stockAdvancedRoles,
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
    title: "Outbound",
    description:
      "Scan barcode stock units for order-based or direct outbound batches.",
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
    title: "No-Barcode Label Flow",
    description:
      "Generate a barcode label first, then receive the item through Barcode Inbound.",
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
  { key: "defaultBrandName", header: "Brand" },
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
  { key: "noBarcodeQuantity", header: "Legacy qty", align: "right" },
  { key: "noBarcodeWeightKg", header: "Legacy kg", align: "right" },
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

const stockShortcuts = [
  {
    label: "Inbound",
    href: "/stock/inbound",
    icon: PackagePlus,
  },
  {
    label: "Outbound",
    href: "/stock/outbound",
    icon: Send,
  },
  {
    label: "Transfer",
    href: "/stock/transfer",
    icon: ArrowRightLeft,
  },
  {
    label: "Receive",
    href: "/stock/receive-transfer",
    icon: PackageCheck,
  },
  {
    label: "Return / Damage",
    href: "/stock/return",
    icon: RotateCcw,
  },
  {
    label: "Stock Take",
    href: "/stock/stock-take",
    icon: ClipboardList,
  },
]

function StockShortcutButtons({
  showHeading = true,
  workerHome = false,
}: {
  showHeading?: boolean
  workerHome?: boolean
}) {
  return (
    <div className="space-y-3">
      {showHeading ? (
        <div>
          <h2 className="text-base font-semibold">Stock shortcuts</h2>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stockShortcuts.map((shortcut) => {
          const Icon = shortcut.icon

          return (
            <Button
              key={shortcut.href}
              asChild
              variant="outline"
              className={
                workerHome
                  ? "h-20 justify-start gap-3 text-lg"
                  : "h-16 justify-start gap-3 text-base"
              }
            >
              <a href={shortcut.href}>
                <Icon className={workerHome ? "size-6" : "size-5"} />
                {shortcut.label}
              </a>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function StockWorkerHome() {
  return <StockShortcutButtons showHeading={false} workerHome />
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

function TransferPendingAlertPanel({
  alerts,
}: {
  alerts: Awaited<
    ReturnType<typeof getStockPageData>
  >["dashboard"]["transferPendingAlerts"]
}) {
  if (alerts.length === 0) {
    return null
  }

  const previewAlerts = alerts.slice(0, 4)
  const hiddenCount = alerts.length - previewAlerts.length

  return (
    <Card className="border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/30">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base text-orange-950 dark:text-orange-100">
              Transfer receive overdue
            </CardTitle>
            <CardDescription className="text-orange-900/80 dark:text-orange-200/80">
              Transfers scanned out for more than 3 days should be received or
              investigated by sender outlet manager, receiver outlet manager,
              admin, and director.
            </CardDescription>
          </div>
          <Badge variant="warning">{alerts.length} open</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {previewAlerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-md border border-orange-200 bg-background p-3 text-sm dark:border-orange-900"
          >
            <div className="font-medium">{alert.itemName}</div>
            <div className="mt-1 break-all font-mono text-xs">
              {alert.barcode}
            </div>
            <div className="mt-2 text-muted-foreground">
              {alert.fromLocation} {"->"} {alert.toLocation}
            </div>
            <div className="mt-1 text-xs text-orange-800 dark:text-orange-200">
              Alert: sender manager, receiver manager, admin, director.
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Scanned out {dateText(alert.transferredAt)}
            </div>
            <div className="mt-2 tabular-nums text-orange-700 dark:text-orange-300">
              {alert.ageDays} day{alert.ageDays === 1 ? "" : "s"} pending
            </div>
          </div>
        ))}
        {hiddenCount > 0 ? (
          <div className="rounded-md border border-dashed border-orange-200 bg-background p-3 text-sm text-muted-foreground dark:border-orange-900">
            {hiddenCount} more overdue transfer
            {hiddenCount === 1 ? "" : "s"} awaiting receive scan.
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
    defaultBrandName:
      data.brands.find((brand) => brand.id === item.defaultBrandId)?.name ??
      "No brand",
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

function unitRows(data: Awaited<ReturnType<typeof getStockPageData>>): TableRow[] {
  return data.units.map((unit) => {
    const item = data.items.find((candidate) => candidate.id === unit.itemId)
    const brand = data.brands.find((candidate) => candidate.id === unit.brandId)
    const origin = data.origins.find((candidate) => candidate.id === unit.originId)
    const location = data.locations.find(
      (candidate) => candidate.id === unit.locationId
    )

    return {
      id: unit.id,
      barcode: unit.barcode,
      itemName: item?.name ?? "Unknown item",
      brandName: brand?.name ?? "Unbranded",
      originName: origin?.name ?? "Unknown origin",
      locationName: location?.name ?? "Unknown location",
      status: unit.status,
      netWeightKg: unit.netWeightKg,
      receivedAt: dateText(unit.receivedAt),
    }
  })
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

function reportRows(
  data: Awaited<ReturnType<typeof getStockPageData>>,
  filters: MovementFilters = {}
): TableRow[] {
  const query = filters.q?.trim().toLowerCase()
  const dateFrom = filters.dateFrom?.trim()
  const dateTo = filters.dateTo?.trim()
  const location = filters.location?.trim().toLowerCase()
  const item = filters.item?.trim().toLowerCase()
  const brand = filters.brand?.trim().toLowerCase()
  const origin = filters.origin?.trim().toLowerCase()
  const status = filters.status?.trim().toLowerCase()
  const user = filters.user?.trim().toLowerCase()
  const movementType = filters.movementType?.trim() || filters.type?.trim()

  return data.reports.filter((report) => {
    const generatedDate = report.generatedAt.slice(0, 10)
    const haystack = [
      report.reportName,
      report.locationName,
      report.category,
      String(report.count),
      String(report.weightKg),
    ]
      .join(" ")
      .toLowerCase()

    return (
      (!query || haystack.includes(query)) &&
      (!dateFrom || generatedDate >= dateFrom) &&
      (!dateTo || generatedDate <= dateTo) &&
      (!location || report.locationName.toLowerCase().includes(location)) &&
      (!item || report.category.toLowerCase().includes(item)) &&
      (!brand || report.category.toLowerCase().includes(brand)) &&
      (!origin || report.category.toLowerCase().includes(origin)) &&
      (!status || report.category.toLowerCase().includes(status)) &&
      (!user || report.category.toLowerCase().includes(user)) &&
      (!movementType || report.category.includes(movementType))
    )
  }).map((report) => ({
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

function ReportsFilter({ filters }: { filters: MovementFilters }) {
  return (
    <Card className="print:hidden">
      <CardContent className="pt-4 sm:pt-5">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" method="get">
          <div className="space-y-2">
            <Label htmlFor="reportQ">Search</Label>
            <Input id="reportQ" name="q" defaultValue={filters.q ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Date from</Label>
            <Input
              id="dateFrom"
              name="dateFrom"
              type="date"
              defaultValue={filters.dateFrom ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">Date to</Label>
            <Input
              id="dateTo"
              name="dateTo"
              type="date"
              defaultValue={filters.dateTo ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportLocation">Outlet / location</Label>
            <Input
              id="reportLocation"
              name="location"
              defaultValue={filters.location ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportMovementType">Movement type</Label>
            <select
              id="reportMovementType"
              name="movementType"
              defaultValue={filters.movementType ?? filters.type ?? ""}
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
            <Label htmlFor="reportItem">Item</Label>
            <Input
              id="reportItem"
              name="item"
              defaultValue={filters.item ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportBrand">Brand</Label>
            <Input
              id="reportBrand"
              name="brand"
              defaultValue={filters.brand ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportOrigin">Origin</Label>
            <Input
              id="reportOrigin"
              name="origin"
              defaultValue={filters.origin ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportStatus">Status</Label>
            <select
              id="reportStatus"
              name="status"
              defaultValue={filters.status ?? ""}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="">All statuses</option>
              {stockUnitStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportUser">User</Label>
            <Input
              id="reportUser"
              name="user"
              defaultValue={filters.user ?? ""}
            />
          </div>
          <div className="flex items-end xl:col-span-5">
            <Button type="submit" className="w-full md:w-auto">
              <Search className="size-4" />
              Filter reports
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function DashboardView({
  data,
  canOperateStock,
  isGeneralWorker,
}: {
  data: Awaited<ReturnType<typeof getStockPageData>>
  canOperateStock: boolean
  isGeneralWorker: boolean
}) {
  if (isGeneralWorker) {
    return <StockWorkerHome />
  }

  return (
    <>
      <KpiCards kpis={data.dashboard.kpis} />
      {canOperateStock ? <StockShortcutButtons /> : null}
      <StockDashboardCharts
        categoryMix={data.dashboard.categoryMix}
        locationStock={data.dashboard.locationStock}
        movementTrend={data.dashboard.movementTrend}
      />
      <ScanAlertPanel alerts={data.dashboard.scanAlerts} />
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

function ScanAlertPanel({
  alerts,
}: {
  alerts: Awaited<ReturnType<typeof getStockPageData>>["dashboard"]["scanAlerts"]
}) {
  if (alerts.length === 0) {
    return null
  }

  return (
    <Card className="border-amber-200 bg-amber-50/70">
      <CardHeader>
        <CardTitle>Barcode scan alerts</CardTitle>
        <CardDescription>
          Recent duplicate scan attempts and barcode weight/decode errors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-md border border-amber-200 bg-background px-3 py-2 text-sm"
          >
            <div className="font-medium">{alert.barcode}</div>
            <div className="text-muted-foreground">
              {alert.action} - {alert.message}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
  const isGeneralStockWorker = hasAnyRole(profile, stockWorkerRoles)
  const canManageStockTake = hasAnyRole(profile, stockManagerRoles)
  const canDirectorApproveStockTake = hasAnyRole(profile, ["admin", "director"])

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
  const stockReportRows = reportRows(data, filters)
  const stockReportCsv = buildCsv(stockReportRows)
  const stockReportCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    stockReportCsv
  )}`
  const stockWhatsappSummary = buildStockWhatsappSummary(
    stockReportRows,
    data.dashboard.negativeStockAlerts.length,
    data.dashboard.stockAgeAlerts.length,
    data.dashboard.transferPendingAlerts.length
  )
  const isWorkerDashboard = route === "dashboard" && isGeneralStockWorker
  const showDashboardAlerts = !isWorkerDashboard

  return (
    <div className="space-y-5">
      {isWorkerDashboard ? null : (
        <PageHeader route={route} demoMode={data.demoMode} />
      )}
      {showDashboardAlerts ? (
        <>
          <NegativeStockAlertPanel alerts={data.dashboard.negativeStockAlerts} />
          <StockAgeAlertPanel alerts={data.dashboard.stockAgeAlerts} />
          <TransferPendingAlertPanel
            alerts={data.dashboard.transferPendingAlerts}
          />
        </>
      ) : null}

      {route === "dashboard" ? (
        <DashboardView
          data={data}
          canOperateStock={canOperateStock}
          isGeneralWorker={isGeneralStockWorker}
        />
      ) : null}

      {route === "items" ? (
        <>
          <ItemMasterForm items={data.items} brands={data.brands} />
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
          units={data.units}
          defaultLocationId={profile.stockLocationId}
          scannedByName={profile.fullName || profile.email}
        />
      ) : null}

      {route === "outbound" ? (
        ordersResult?.ordersData ? (
          <OutboundSalesForm
            orders={ordersResult.ordersData.orders}
            orderItems={ordersResult.ordersData.items}
            outlets={data.outlets}
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
        <TransferForm outlets={data.outlets} locations={data.locations} />
      ) : null}

      {route === "receive-transfer" ? (
        <ReceiveTransferForm outlets={data.outlets} locations={data.locations} />
      ) : null}

      {route === "return" ? <ReturnForm locations={data.locations} /> : null}

      {route === "return" ? (
        <InspectionReleaseForm canManage={canManageStockTake} />
      ) : null}

      {route === "return" ? (
        <DamageRequestWorkbench
          requests={data.damageRequests}
          canOperate={canOperateStock}
          canManage={canManageStockTake}
          canDirectorApprove={canDirectorApproveStockTake}
        />
      ) : null}

      {route === "return" ? (
        <ReturnSupplierWorkbench
          requests={data.returnSupplierRequests}
          canOperate={canOperateStock}
          canManage={canManageStockTake}
        />
      ) : null}

      {route === "no-barcode-inbound" ? <NoBarcodeInboundForm /> : null}

      {route === "balance" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Balance by item and location</CardTitle>
              <CardDescription>
                Barcode stock with legacy loose balances kept visible for old
                records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={balanceColumns} data={balanceRows(data)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Barcode stock units</CardTitle>
              <CardDescription>
                Open a stock unit to review its history or reprint a 50mm x 30mm
                label.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StockUnitsTableClient rows={unitRows(data)} />
            </CardContent>
          </Card>
        </>
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
          brands={data.brands}
          locations={data.locations}
          sessions={data.stockTakeSessions}
          lines={data.stockTakeLines}
          canOperate={canOperateStock}
          canManage={canManageStockTake}
          canDirectorApprove={canDirectorApproveStockTake}
        />
      ) : null}

      {route === "reports" ? (
        <>
          <ReportsFilter filters={filters} />
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Elite Meat stock reports</CardTitle>
                <CardDescription>
                  Formal stock balance, movement history, inbound, outbound,
                  transfer pending, old stock, stock take variance,
                  damage/spoilage, return supplier, and barcode scan error
                  reports.
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
        </>
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
