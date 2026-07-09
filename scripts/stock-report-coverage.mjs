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
const stockUnitsTable = read("components/stock/stock-units-table-client.tsx")
const stockUnitDetail = read("components/stock/stock-unit-detail.tsx")
const data = read("lib/stock/data.ts")
const demoData = read("lib/stock/demo-data.ts")
const displayNames = read("lib/stock/display-names.ts")
const reportExport = read("lib/stock/report-export.ts")
const regression = read("scripts/stock-workflow-regression.mjs")
const acceptance = read("scripts/stock-acceptance-coverage.mjs")
const packageJson = read("package.json")
const inboundRuleSampleRpc = read(
  "supabase/migrations/202606250004_stock_barcode_rule_sample_v1.sql"
)

includesAll(
  data + displayNames,
  [
    "function buildReports",
    "stockDisplayItemName(item, brand, \"Unknown item\")",
    "stockProductName(",
    "section.toUpperCase() === \"GENERAL\"",
    "reportName: \"Stock balance\"",
    "itemName: balance.itemName",
    "brandName: balance.brandName",
    "originName:",
    "function withMovementDisplayNames",
    ".map((row) => mapMovement(row, items, brands, units, locations))",
    "const linkedUnit = units.find(",
    "const displayItemId = linkedUnit?.itemId ?? itemId",
    "const displayBrandId =",
    "linkedUnit?.brandId ?? readNullableString(row.brand_id)",
    "const brand = brands.find((candidate) => candidate.id === displayBrandId)",
    "formatDisplayItemName(",
    "brandName: brand?.name ?? \"No manufacturer\"",
    "movement.brandName",
    "const matchesBrand",
    "movement.stockUnitId && unit.id === movement.stockUnitId",
    "movement.barcode !== \"-\" && unit.barcode === movement.barcode",
    "Stock by location",
    "Stock by inbound age",
    "Stock movement history",
    "Inbound",
    "Outbound",
    "Transfer pending",
    "Old stock 6 months",
    "Barcode scan errors",
    "category: `${log.barcode} / ${log.issueType ?? log.action}: ${log.message}`",
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
    "Scan issues for review",
    "reviewStatus === \"OPEN\"",
    "sixMonthStockAgeDays",
    "twelveMonthStockAgeDays",
    "stock_damage_requests",
    "stock_return_supplier_requests",
    "stock_take_lines",
  ],
  "Stock report data sources"
)

includesAll(
  inboundRuleSampleRpc,
  [
    "insert into public.stock_movements",
    "stock_unit_id,",
    "v_stock_unit_id,",
    "movement_type,",
    "weight_kg,",
    "reference_no,",
  ],
  "Inbound RPC movement report linkage"
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
    "<Label htmlFor=\"reportItem\">Product</Label>",
    "Manufacturer",
    "Origin",
    "{ key: \"itemName\", header: \"Product\" }",
    "{ key: \"brandName\", header: \"Manufacturer\" }",
    "{ key: \"originName\", header: \"Origin\" }",
    "{ key: \"category\", header: \"Detail\" }",
    "report.itemName.toLowerCase().includes(item)",
    "report.brandName.toLowerCase().includes(brand)",
    "report.originName.toLowerCase().includes(origin)",
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
    "{ key: \"itemName\", header: \"Product\" }",
    "{ key: \"brandName\", header: \"Manufacturer\" }",
    "Manufacturer: {movement.brandName}",
    "{ key: \"name\", header: \"Product\" }",
    "{ key: \"itemName\", header: \"Product\" }",
    "transfer pending, old stock, stock take variance,",
    "damage/spoilage, return supplier, and barcode scan error",
    "Manager scan issue review",
    "Open stock scan issues from inbound, outbound, transfer, return,",
    "damage/spoilage, and stock take.",
    "Open barcode scan error report",
    "/stock/reports?q=Barcode%20scan%20errors",
    "Transfer receive overdue",
    "Alert: sender manager, receiver manager, admin, director.",
    "Open receive",
    "StockShortcutButtons",
    "canOperateStock",
    "canOperateStock ? (",
    "<StockShortcutButtons canUseItemSetup={canUseItemSetup} />",
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
  stockUnitsTable + stockUnitDetail + stockPage + data,
  [
    "{ key: \"brandName\", header: \"Manufacturer\" }",
    "<dt className=\"text-muted-foreground\">Manufacturer</dt>",
    "brandName: brand?.name ?? \"No manufacturer\"",
    "const brandName = brand?.name ?? \"No manufacturer\"",
    "stockDisplayItemName(item, brand, \"Unknown product\")",
  ],
  "Stock unit manufacturer display wording"
)

includesAll(
  demoData,
  [
    'itemName: "TICAN BELLY BONELESS"',
    'itemName: "SEABOARD LOIN BONELESS"',
    'itemName: "RIVASAM BELLY BONELESS"',
    'itemName: "RIVASAM LOIN BONELESS"',
  ],
  "Stock demo display names"
)

for (const staleName of [
  'itemName: "MEAT / BELLY / BONELESS"',
  'itemName: "MEAT / LOIN / BONELESS"',
  'itemName: "PROCESSED / MEATBALL / MEATBALL"',
]) {
  assert(
    !demoData.includes(staleName),
    `Stock demo data must use manufacturer + product display names, found: ${staleName}`
  )
}

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
