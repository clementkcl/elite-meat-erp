import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function includesAll(source, fragments, label) {
  for (const fragment of fragments) {
    assert(source.includes(fragment), `${label} missing: ${fragment}`)
  }
}

const stockPage = read("components/stock/stock-page.tsx")
const data = read("lib/stock/data.ts")
const reportExport = read("lib/stock/report-export.ts")
const regression = read("scripts/stock-workflow-regression.mjs")
const acceptance = read("scripts/stock-acceptance-coverage.mjs")
const packageJson = read("package.json")

includesAll(
  data,
  [
    "function buildReports",
    "Stock by location",
    "Stock by inbound age",
    "Stock movement history",
    "Inbound",
    "Outbound",
    "Transfer pending",
    "Old stock 6 months",
    "Barcode scan errors",
    "Stock take variance",
    "Damage/spoilage",
    "Return supplier",
    "Manager signature:",
    "Director signature:",
    "scanLogs",
    "Duplicate scan attempts",
    "Barcode decode errors",
    "Damage pending approval",
    "Stock take pending approval",
    "const linkedUnit = units.find((unit) => unit.id === request.stockUnitId)",
    "weightKg: roundWeight(linkedUnit?.netWeightKg ?? 0)",
    "isDashboardInboundMovement",
    "isDashboardOutboundMovement",
    "Today inbound",
    "Today outbound",
    "sixMonthStockAgeDays",
    "twelveMonthStockAgeDays",
    "stock_damage_requests",
    "stock_return_supplier_requests",
    "stock_take_lines",
  ],
  "Stock report data sources"
)

includesAll(
  stockPage,
  [
    "function reportRows",
    "const stockReportRows = reportRows(data, filters)",
    "function ReportsFilter",
    "Date from",
    "Date to",
    "Outlet / location",
    "Movement type",
    "Brand",
    "Origin",
    "Status",
    "User",
    "const stockReportCsv = buildCsv(stockReportRows)",
    "const stockReportCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(",
    "const stockWhatsappSummary = buildStockWhatsappSummary(",
    "<ReportToolbar",
    "csvHref={stockReportCsvHref}",
    "whatsappText={stockWhatsappSummary}",
    "Elite Meat stock reports",
    "Formal stock balance, movement history, inbound, outbound,",
    "transfer pending, old stock, stock take variance,",
    "damage/spoilage, return supplier, and barcode scan error",
    "Barcode scan alerts",
    "StockShortcutButtons",
    "canOperateStock",
    "canOperateStock ? <StockShortcutButtons /> : null",
    "isGeneralWorker={isGeneralStockWorker}",
    "Stock shortcuts",
    "/stock/inbound",
    "/stock/outbound",
    "/stock/transfer",
    "/stock/receive-transfer",
    "/stock/return",
    "/stock/stock-take",
    "print:border-0 print:shadow-none",
  ],
  "Stock reports page export surface"
)

includesAll(
  reportExport,
  [
    "export function buildCsv",
    "replaceAll('\"', '\"\"')",
    "export function buildStockWhatsappSummary",
    "Elite Meat Stock Report",
    "Locations:",
    "Report rows:",
    "Total count:",
    "Total weight:",
    "Negative stock alerts:",
    "Stock age alerts:",
    "Overdue transfer alerts:",
  ],
  "Stock report export helpers"
)

includesAll(
  regression,
  [
    "Empty stock report CSV should be blank.",
    "Stock report CSV should include headers and escape quotes.",
    "WhatsApp summary should have a clear stock report title.",
    "WhatsApp summary should total stock report counts.",
    "WhatsApp summary should include negative stock alert count.",
    "WhatsApp summary should include stock age alert count.",
    "WhatsApp summary should include overdue transfer alert count.",
  ],
  "Stock report regression coverage"
)

includesAll(
  acceptance,
  [
    "buildCsv",
    "buildStockWhatsappSummary",
    "Stock take variance",
    "Damage/spoilage",
    "Return supplier",
  ],
  "Stock acceptance report coverage"
)

assert(
  packageJson.includes("stock-report-coverage.mjs"),
  "npm run smoke must include stock-report-coverage.mjs"
)

console.log("Stock report coverage checks passed.")
