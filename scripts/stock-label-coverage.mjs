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

const labelHelper = read("lib/stock/barcode-label.ts")
const data = read("lib/stock/data.ts")
const types = read("lib/stock/types.ts")
const demoData = read("lib/stock/demo-data.ts")
const workflowForms = read("components/stock/workflow-forms.tsx")
const unitDetail = read("components/stock/stock-unit-detail.tsx")
const regression = read("scripts/stock-workflow-regression.mjs")
const packageJson = read("package.json")

includesAll(
  labelHelper,
  [
    "export function makeInternalBarcode",
    "export function makeUniqueInternalBarcode",
    "weightGrams",
    "Math.round(Number(weightKg) * 1000)",
    "!/^\\d+$/.test(itemCode)",
    "serial > 9999",
    "date.toISOString().slice(0, 10).replaceAll(\"-\", \"\")",
    "String(weightGrams).padStart(6, \"0\").slice(-6)",
    "String(serial).padStart(4, \"0\")",
    "blockedBarcodes",
  ],
  "Internal barcode generation"
)

assert(
  !/kg|KG/.test(labelHelper),
  "Generated barcode helper must not include KG text inside the barcode."
)

includesAll(
  regression,
  [
    "Generated barcode should be date + numeric item code + grams + serial.",
    "Generated barcode must be numeric only.",
    "Generated barcode should be blank when item code is not numeric.",
    "Generated barcode should not wrap serial numbers after 9999.",
    "Generated barcode should skip existing labels and use the next serial.",
  ],
  "Internal barcode regression"
)

includesAll(
  workflowForms,
  [
    "function PrintLabels",
    "@page { size: 50mm 30mm; margin: 0; }",
    "width: 50mm;",
    "height: 30mm;",
    "page-break-after: always;",
    "labels.map((label)",
    "Elite Meat",
    "Generate label barcode",
    "makeUniqueInternalBarcode",
    "Generated an unused internal numeric barcode. Print the label, attach it, then save inbound.",
    "recentInboundWeightKg",
    "Saved scans",
    "Saved weight",
    "Recent inbound templates",
    "generateInboundBatchNo",
    "Finish Inbound Session",
    "Inbound session summary",
    "Undo scan",
    "Barcode has no confident weight. Go to barcode label printing",
    "Duplicate/error scans this session",
    "Recent inbound scans",
    "Recent labels print one 50mm x 30mm label per page when",
    "window.print()",
    "Export labels PDF",
  ],
  "Inbound label print/export surface"
)

includesAll(
  unitDetail,
  [
    "stock-label-print-area",
    "width: 50mm;",
    "height: 30mm;",
    "size: 50mm 30mm;",
    "Print / Export PDF label",
    "window.print()",
    "Label preview",
    "Elite Meat",
    "Printed as one 50mm x 30mm label per page.",
    "{unit.barcode}",
  ],
  "Stock unit label reprint surface"
)

includesAll(
  types + data + demoData,
  [
    "stockUnitId: string | null",
    "stockUnitId: readNullableString(row.stock_unit_id)",
    "movement.stockUnitId === unit.id || movement.barcode === unit.barcode",
    "stockUnitId: \"unit-001\"",
    "stockUnitId: null",
  ],
  "Stock unit movement history linkage"
)

assert(
  packageJson.includes("stock-label-coverage.mjs"),
  "npm run smoke must include stock-label-coverage.mjs"
)

console.log("Stock label coverage checks passed.")
