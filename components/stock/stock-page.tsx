import {
  ArrowRightLeft,
  ClipboardList,
  PackageCheck,
  PackagePlus,
  RotateCcw,
  Search,
  Send,
} from "lucide-react"
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
import { stockDisplayItemName } from "@/lib/stock/display-names"
import {
  buildCsv,
  buildStockWhatsappSummary,
  type StockReportTableRow,
} from "@/lib/stock/report-export"
import { reviewStockScanIssueFormAction } from "@/lib/stock/actions"
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
    title: "Product Master",
    description: "Create and review product master records used by all stock workflows.",
  },
  inbound: {
    title: "Barcode Inbound",
    description: "Receive barcode-tracked stock units into a selected location.",
  },
  outbound: {
    title: "Outbound",
    description:
      "Scan barcode stock units for direct outbound batches.",
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
      "Generate a barcode label first, then receive the product through Barcode Inbound.",
  },
  balance: {
    title: "Stock Balance",
    description: "Current stock on hand by product and location.",
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
    description: "Manage manufacturers, origins, and stock locations.",
  },
}

const itemColumns: DataTableColumn<TableRow>[] = [
  { key: "itemCode", header: "Item code" },
  { key: "category", header: "Category" },
  { key: "displayName", header: "Display name" },
  { key: "defaultBrandName", header: "Manufacturer" },
  { key: "section", header: "Section" },
  { key: "name", header: "Product" },
  { key: "barcodeRequired", header: "Barcode" },
  { key: "active", header: "Active" },
]

const balanceColumns: DataTableColumn<TableRow>[] = [
  { key: "locationName", header: "Location" },
  { key: "itemName", header: "Product" },
  { key: "brandName", header: "Manufacturer" },
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
  { key: "itemName", header: "Product" },
  { key: "brandName", header: "Manufacturer" },
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
  { key: "itemName", header: "Product" },
  { key: "brandName", header: "Manufacturer" },
  { key: "originName", header: "Origin" },
  { key: "category", header: "Detail" },
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
    workerLabel: "Outbound Without Order",
    href: "/stock/outbound",
    icon: Send,
  },
  {
    label: "Transfer",
    workerLabel: "Transfer Out",
    href: "/stock/transfer",
    icon: ArrowRightLeft,
  },
  {
    label: "Receive",
    workerLabel: "Receive Transfer",
    href: "/stock/receive-transfer",
    icon: PackageCheck,
  },
  {
    label: "Return / Damage",
    workerLabel: "Return Stock",
    href: "/stock/return",
    icon: RotateCcw,
  },
  {
    label: "Stock Take",
    href: "/stock/stock-take",
    icon: ClipboardList,
  },
  {
    label: "Item Master",
    workerLabel: "Item / Barcode Setup",
    href: "/stock/items",
    icon: Search,
    itemSetup: true,
  },
]

function StockShortcutButtons({
  showHeading = true,
  workerHome = false,
  canUseItemSetup = false,
}: {
  showHeading?: boolean
  workerHome?: boolean
  canUseItemSetup?: boolean
}) {
  const shortcuts = stockShortcuts.filter(
    (shortcut) => !shortcut.itemSetup || canUseItemSetup
  )

  return (
    <div className="space-y-3">
      {showHeading ? (
        <div>
          <h2 className="text-base font-semibold">Stock shortcuts</h2>
        </div>
      ) : null}
      <div className="grid gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon
          const label = workerHome
            ? shortcut.workerLabel ?? shortcut.label
            : shortcut.label

          return (
            <Button
              key={shortcut.href}
              asChild
              variant="outline"
              className={
                workerHome
                  ? "min-h-20 justify-start gap-3 whitespace-normal py-4 text-left text-lg"
                  : "min-h-16 justify-start gap-3 whitespace-normal py-3 text-left text-base"
              }
            >
              <Link href={shortcut.href}>
                <Icon
                  className={
                    workerHome ? "size-6 shrink-0" : "size-5 shrink-0"
                  }
                />
                <span className="min-w-0 break-words">{label}</span>
              </Link>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function StockWorkerHome({
  canUseItemSetup,
}: {
  canUseItemSetup: boolean
}) {
  return (
    <StockShortcutButtons
      showHeading={false}
      workerHome
      canUseItemSetup={canUseItemSetup}
    />
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
            <CardDescription className="break-words text-red-800/80 dark:text-red-200/80">
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
            <div className="break-words font-medium">{alert.itemName}</div>
            <div className="mt-1 break-words text-muted-foreground">
              {alert.locationName}
            </div>
            <div className="mt-2 tabular-nums text-red-700 dark:text-red-300">
              Qty {alert.quantity.toLocaleString()} /{" "}
              {alert.weightKg.toLocaleString(undefined, {
                maximumFractionDigits: 3,
              })}{" "}
              kg
            </div>
            <div className="mt-1 break-words text-xs text-muted-foreground">
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
            <CardDescription className="break-words text-amber-900/80 dark:text-amber-200/80">
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
              <span className="break-words font-medium">{alert.itemName}</span>
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
            <div className="mt-1 break-words text-muted-foreground">
              {alert.locationName}
            </div>
            <div className="mt-2 break-words text-xs text-muted-foreground">
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
            <CardDescription className="break-words text-orange-900/80 dark:text-orange-200/80">
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
            <div className="break-words font-medium">{alert.itemName}</div>
            <div className="mt-1 break-all font-mono text-xs">
              {alert.barcode}
            </div>
            <div className="mt-2 break-words text-muted-foreground">
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
            <Button asChild className="mt-3 min-h-11 w-full" size="sm">
              <Link href="/stock/receive-transfer">Open receive</Link>
            </Button>
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
      "No manufacturer",
    displayName: stockDisplayItemName(
      item,
      data.brands.find((brand) => brand.id === item.defaultBrandId)
    ),
    section: item.section,
    name: item.name,
    barcodeRequired: item.barcodeRequired,
    active: item.active,
  }))
}

function MobileItemCards({ rows }: { rows: TableRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:hidden">
        No product master records found.
      </div>
    )
  }

  return (
    <div className="space-y-2 md:hidden">
      <div className="text-sm font-medium">Mobile item list</div>
      {rows.slice(0, 8).map((row) => (
        <div
          key={String(row.itemCode)}
          className="rounded-md border bg-muted/20 p-3 text-sm"
        >
          <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between">
            <div className="min-w-0">
              <div className="break-all font-mono text-xs">
                {String(row.itemCode ?? "-")}
              </div>
              <div className="mt-1 break-words font-semibold">
                {String(row.displayName ?? row.name ?? "Unknown product")}
              </div>
              <div className="mt-1 break-words text-xs text-muted-foreground">
                {String(row.category ?? "No category")} -{" "}
                {String(row.section ?? "No section")}
              </div>
            </div>
            <Badge
              className="w-fit max-w-full whitespace-normal break-words"
              variant={row.active ? "outline" : "secondary"}
            >
              {row.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Manufacturer
              </div>
              <div className="break-words font-medium">
                {String(row.defaultBrandName ?? "No manufacturer")}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Barcode
              </div>
              <div className="break-words font-medium">
                {row.barcodeRequired ? "Required" : "Optional"}
              </div>
            </div>
          </div>
        </div>
      ))}
      {rows.length > 8 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm break-words text-amber-800">
          Showing first 8 products. Use product search or scroll the table below
          for all products.
        </div>
      ) : null}
    </div>
  )
}

function balanceRows(data: Awaited<ReturnType<typeof getStockPageData>>): TableRow[] {
  return data.balances.map((balance) => ({
    locationName: balance.locationName,
    itemName: balance.itemName,
    brandName: balance.brandName,
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

function MobileStockBalanceCards({
  balances,
}: {
  balances: Awaited<ReturnType<typeof getStockPageData>>["balances"]
}) {
  if (balances.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:hidden">
        No stock balance found for this scope.
      </div>
    )
  }

  return (
    <div className="space-y-2 md:hidden">
      <div className="text-sm font-medium">Mobile stock balance</div>
      {balances.slice(0, 8).map((balance) => (
        <div
          key={balance.id}
          className="rounded-md border bg-muted/20 p-3 text-sm"
        >
          <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between">
            <div className="min-w-0">
              <div className="break-words font-semibold">{balance.itemName}</div>
              <div className="mt-1 break-words text-xs text-muted-foreground">
                {balance.brandName} - {balance.locationName} -{" "}
                {balance.category}
              </div>
            </div>
            <Badge
              className="w-fit max-w-full whitespace-normal break-words"
              variant={balance.hasNegativeStock ? "destructive" : "outline"}
            >
              {balance.hasNegativeStock ? "Alert" : "OK"}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Barcode units
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {balance.unitCount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Total kg
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {balance.combinedWeightKg.toLocaleString(undefined, {
                  maximumFractionDigits: 3,
                })}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Total qty
              </div>
              <div className="font-medium tabular-nums">
                {balance.totalQuantity.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Barcode kg
              </div>
              <div className="font-medium tabular-nums">
                {balance.totalWeightKg.toLocaleString(undefined, {
                  maximumFractionDigits: 3,
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
      {balances.length > 8 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Showing first 8 balances. Scroll the table below for full balance.
        </div>
      ) : null}
    </div>
  )
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
      itemName: stockDisplayItemName(item, brand, "Unknown product"),
      brandName: brand?.name ?? "No manufacturer",
      originName: origin?.name ?? "Unknown origin",
      locationName: location?.name ?? "Unknown location",
      status: unit.status,
      netWeightKg: unit.netWeightKg,
      receivedAt: dateText(unit.receivedAt),
    }
  })
}

function MobileStockUnitCards({ rows }: { rows: TableRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:hidden">
        No barcode stock units found for this scope.
      </div>
    )
  }

  return (
    <div className="space-y-2 md:hidden">
      <div className="text-sm font-medium">Mobile barcode units</div>
      {rows.slice(0, 8).map((row) => (
        <div
          key={String(row.id)}
          className="rounded-md border bg-muted/20 p-3 text-sm"
        >
          <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between">
            <div className="min-w-0">
              <div className="break-all font-mono text-xs">
                {String(row.barcode ?? "No barcode")}
              </div>
              <div className="mt-1 break-words font-semibold">
                {String(row.itemName ?? "Unknown product")}
              </div>
              <div className="mt-1 break-words text-xs text-muted-foreground">
                {String(row.brandName ?? "No manufacturer")} -{" "}
                {String(row.originName ?? "Unknown origin")}
              </div>
            </div>
            <Badge
              className="w-fit max-w-full whitespace-normal break-words"
              variant="outline"
            >
              {String(row.status ?? "UNKNOWN")}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Weight
              </div>
              <div className="font-semibold tabular-nums">
                {Number(row.netWeightKg ?? 0).toLocaleString(undefined, {
                  maximumFractionDigits: 3,
                })}{" "}
                kg
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Location
              </div>
              <div className="break-words font-medium">
                {String(row.locationName ?? "Unknown location")}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Received
              </div>
              <div className="font-medium">
                {String(row.receivedAt ?? "-")}
              </div>
            </div>
            <div className="flex items-end">
              <Button asChild className="min-h-11 w-full" variant="outline">
                <Link href={`/stock/units/${String(row.id)}`}>
                  Open / reprint
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}
      {rows.length > 8 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Showing first 8 barcode units. Scroll the table below for all units.
        </div>
      ) : null}
    </div>
  )
}

function movementRows(data: Awaited<ReturnType<typeof getStockPageData>>): TableRow[] {
  return data.movements.map((movement) => ({
    createdAt: dateText(movement.createdAt),
    movementType: movement.movementType,
    itemName: movement.itemName,
    brandName: movement.brandName,
    barcode: movement.barcode,
    fromLocation: movement.fromLocation,
    toLocation: movement.toLocation,
    quantity: movement.quantity,
    weightKg: movement.weightKg,
    referenceNo: movement.referenceNo,
  }))
}

function MobileStockMovementCards({
  movements,
}: {
  movements: Awaited<ReturnType<typeof getStockPageData>>["movements"]
}) {
  if (movements.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:hidden">
        No stock movements found for this scope.
      </div>
    )
  }

  return (
    <div className="space-y-2 md:hidden">
      <div className="text-sm font-medium">Mobile movement history</div>
      {movements.slice(0, 8).map((movement) => (
        <div
          key={movement.id}
          className="rounded-md border bg-muted/20 p-3 text-sm"
        >
          <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between">
            <div className="min-w-0">
              <div className="break-words font-semibold">
                {movement.movementType.replaceAll("_", " ")}
              </div>
              <div className="mt-1 break-words text-xs text-muted-foreground">
                {movement.itemName}
              </div>
              <div className="mt-1 break-words text-xs text-muted-foreground">
                Manufacturer: {movement.brandName}
              </div>
            </div>
            <div className="font-semibold tabular-nums min-[390px]:shrink-0 min-[390px]:text-right">
              {movement.weightKg.toLocaleString(undefined, {
                maximumFractionDigits: 3,
              })}{" "}
              kg
            </div>
          </div>
          <div className="mt-3 break-all font-mono text-xs">
            {movement.barcode || "No barcode"}
          </div>
          <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                From
              </div>
              <div className="break-words font-medium">
                {movement.fromLocation || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">To</div>
              <div className="break-words font-medium">
                {movement.toLocation || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Qty</div>
              <div className="font-medium tabular-nums">
                {movement.quantity.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Time
              </div>
              <div className="font-medium">{dateText(movement.createdAt)}</div>
            </div>
          </div>
          {movement.referenceNo ? (
            <div className="mt-2 break-all text-xs text-muted-foreground">
              Ref: {movement.referenceNo}
            </div>
          ) : null}
        </div>
      ))}
      {movements.length > 8 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Showing first 8 movements. Scroll the table below for full history.
        </div>
      ) : null}
    </div>
  )
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
      report.itemName,
      report.brandName,
      report.originName,
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
      (!item ||
        report.itemName.toLowerCase().includes(item) ||
        report.category.toLowerCase().includes(item)) &&
      (!brand || report.brandName.toLowerCase().includes(brand)) &&
      (!origin || report.originName.toLowerCase().includes(origin)) &&
      (!status || report.category.toLowerCase().includes(status)) &&
      (!user || report.category.toLowerCase().includes(user)) &&
      (!movementType || report.category.includes(movementType))
    )
  }).map((report) => ({
    reportName: report.reportName,
    locationName: report.locationName,
    itemName: report.itemName,
    brandName: report.brandName,
    originName: report.originName,
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
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-sm"
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
            <Button type="submit" className="min-h-11 w-full gap-2 md:w-auto">
              <Search className="size-4 shrink-0" />
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
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-sm"
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
            <Label htmlFor="reportItem">Product</Label>
            <Input
              id="reportItem"
              name="item"
              defaultValue={filters.item ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportBrand">Manufacturer</Label>
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
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-sm"
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
            <Button type="submit" className="min-h-11 w-full gap-2 md:w-auto">
              <Search className="size-4 shrink-0" />
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
  canUseItemSetup,
}: {
  data: Awaited<ReturnType<typeof getStockPageData>>
  canOperateStock: boolean
  isGeneralWorker: boolean
  canUseItemSetup: boolean
}) {
  if (isGeneralWorker) {
    return <StockWorkerHome canUseItemSetup={canUseItemSetup} />
  }

  return (
    <>
      <KpiCards kpis={data.dashboard.kpis} />
      {canOperateStock ? (
        <StockShortcutButtons canUseItemSetup={canUseItemSetup} />
      ) : null}
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
        <CardContent className="space-y-3">
          <MobileStockMovementCards movements={data.movements} />
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Manager scan issue review</CardTitle>
            <CardDescription>
              Open stock scan issues from inbound, outbound, transfer, return,
              damage/spoilage, and stock take. All open issue types are shown
              for manager review. Mark corrected records review evidence only;
              stock changes still use the proper approval workflow.
            </CardDescription>
          </div>
          <Badge variant="warning">{alerts.length} open</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-md border border-amber-200 bg-background px-3 py-2 text-sm"
          >
            <div className="break-all font-mono text-xs font-medium">
              {alert.barcode}
            </div>
            <div className="mt-1 break-words text-muted-foreground">
              {(alert.issueType ?? alert.action).replaceAll("_", " ")} -{" "}
              {alert.message}
            </div>
            {alert.expectedStatus || alert.scannedStatus ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Expected: {alert.expectedStatus ?? "-"} / Scanned:{" "}
                {alert.scannedStatus ?? "-"}
              </div>
            ) : null}
            {alert.itemName || alert.selectedItemName ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Product: {alert.itemName ?? "-"}
                {alert.selectedItemName
                  ? ` / selected ${alert.selectedItemName}`
                  : ""}
              </div>
            ) : null}
            {alert.expectedLocationId || alert.scannedLocationId ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Location: expected{" "}
                {alert.expectedLocationName ?? alert.expectedLocationId ?? "-"}{" "}
                / scanned{" "}
                {alert.scannedLocationName ?? alert.scannedLocationId ?? "-"}
              </div>
            ) : null}
            {Object.keys(alert.relatedContext).length > 0 ? (
              <div className="mt-1 break-words text-xs text-muted-foreground">
                Related: {formatIssueContext(alert.relatedContext)}
              </div>
            ) : null}
            <div className="mt-2 text-xs text-muted-foreground">
              {dateText(alert.createdAt)}
              {alert.scannedBy ? ` by ${alert.scannedBy}` : ""}
            </div>
            <div className="mt-3 grid gap-2 min-[390px]:grid-cols-3">
              {["APPROVED", "REJECTED", "CORRECTED"].map((status) => (
                <form key={status} action={reviewStockScanIssueFormAction}>
                  <input
                    type="hidden"
                    name="scanLogId"
                    value={alert.id.replace("scan-alert-", "")}
                  />
                  <input type="hidden" name="reviewStatus" value={status} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="min-h-11 w-full whitespace-normal"
                  >
                    {status === "CORRECTED" ? "Mark corrected" : status}
                  </Button>
                </form>
              ))}
            </div>
          </div>
        ))}
        <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
          <Link href="/stock/reports?q=Barcode%20scan%20errors">
            Open barcode scan error report
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function formatIssueContext(context: Record<string, unknown>) {
  return Object.entries(context)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" / ")
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
          <CardTitle>Manufacturers</CardTitle>
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
  const canUseItemSetup = hasAnyRole(profile, stockItemMasterRoles)
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
          canUseItemSetup={canUseItemSetup}
        />
      ) : null}

      {route === "items" ? (
        <>
          <ItemMasterForm items={data.items} brands={data.brands} />
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Active product master records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <MobileItemCards rows={itemRows(data)} />
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
          canDeleteWholeSession={
            canManageStockTake || canDirectorApproveStockTake
          }
        />
      ) : null}

      {route === "outbound" ? (
        ordersResult?.ordersData ? (
          <OutboundSalesForm
            customers={ordersResult.ordersData.customers}
            outlets={data.outlets}
            locations={data.locations}
            units={data.units}
            items={data.items}
            brands={data.brands}
            returnSupplierRequests={data.returnSupplierRequests}
            defaultLocationId={profile.stockLocationId}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Outbound unavailable</CardTitle>
              <CardDescription>
                Check that the Orders customer migrations were applied before
                using direct sales outbound.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-destructive">
              {ordersResult?.error ?? "Orders data could not load."}
            </CardContent>
          </Card>
        )
      ) : null}

      {route === "transfer" ? (
        <TransferForm
          outlets={data.outlets}
          locations={data.locations}
          units={data.units}
          defaultLocationId={profile.stockLocationId}
        />
      ) : null}

      {route === "receive-transfer" ? (
        <ReceiveTransferForm
          locations={data.locations}
          units={data.units}
          defaultLocationId={profile.stockLocationId}
        />
      ) : null}

      {route === "return" ? (
        <ReturnForm
          locations={data.locations}
          items={data.items}
          brands={data.brands}
          units={data.units}
          movements={data.movements}
          defaultLocationId={profile.stockLocationId}
        />
      ) : null}

      {route === "return" && canManageStockTake ? (
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
            <CardContent className="space-y-3">
              <MobileStockBalanceCards balances={data.balances} />
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
            <CardContent className="space-y-3">
              <MobileStockUnitCards rows={unitRows(data)} />
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
            <CardContent className="space-y-3">
              <MobileStockMovementCards movements={data.movements} />
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
          units={data.units}
          sessions={data.stockTakeSessions}
          lines={data.stockTakeLines}
          defaultLocationId={profile.stockLocationId}
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
          <MasterDataForms brands={data.brands} items={data.items} />
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
          <CardContent className="space-y-3">
            <MobileStockMovementCards movements={data.movements} />
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
