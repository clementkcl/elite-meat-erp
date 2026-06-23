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
const code128 = read("lib/stock/code128.ts")
const workflowForms = read("components/stock/workflow-forms.tsx")
const unitDetail = read("components/stock/stock-unit-detail.tsx")
const stockLabel = read("components/stock/stock-label.tsx")
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
  stockLabel,
  [
    "export const stockLabelSizes",
    "thermal-50x30",
    "StockLabelPrintActions",
    "StockLabelPrintArea",
    "StockLabelPreview",
    "Code128Barcode",
    "encodeCode128",
  ],
  "Reusable stock label component"
)

includesAll(
  code128,
  [
    "export function encodeCode128",
    "const startCodeB = 104",
    "const startCodeC = 105",
    "const stopCode = 106",
    "function canUseCodeSetC",
    "function canUseCodeSetB",
    "function checksum",
    "quietZoneWidth",
    "bars.push({ x, width })",
    "mode: encoded.mode",
  ],
  "Code 128 label barcode encoder"
)

includesAll(
  stockLabel,
  [
    'width: "50mm"',
    'height: "30mm"',
    'pageSize: "50mm 30mm"',
    "@page { size: ${size.pageSize}; margin: 0; }",
    "width: ${size.width};",
    "height: ${size.height};",
    "page-break-after: always;",
    "break-after: page;",
    "labels.map((label)",
    "label.companyName",
    "label.productName",
    "label.weightKg",
    "label.barcode",
    "Bluetooth label printer",
    "PDF fallback",
    "Use your phone print sheet",
    "window.print()",
    "aria-label=\"Print label with phone print sheet or Bluetooth printer\"",
    "aria-label=\"Open PDF fallback for label printing\"",
    "h-12 w-full justify-center",
    "viewBox={`0 0 ${encoded.width} 40`}",
    "preserveAspectRatio=\"none\"",
    "<rect",
    "stock-label-bars",
    "letter-spacing: 0",
    "tracking-normal",
  ],
  "Reusable stock label print/export surface"
)

assert(
  !stockLabel.includes("repeating-linear-gradient"),
  "Stock labels must render real Code 128 bars, not decorative placeholder stripes."
)

includesAll(
  workflowForms,
  [
    "Generate internal label",
    "makeUniqueInternalBarcode",
    "Internal label generated. Saving stock now; print and attach the label after it appears below.",
    "Stock saves immediately.",
    "recentInboundWeightKg",
    "Saved scans",
    "Saved weight",
    "Recent inbound templates",
    "generateInboundBatchNo",
    "Finish Inbound Session",
    "Inbound session summary",
    "Undo scan",
    "No weight found. Generate an internal label, print it, then attach it.",
    "Blocked/error scans this session",
    "Recent inbound scans",
    "StockLabelPrintActions",
    "StockLabelPrintArea",
    "StockLabelPreview",
  ],
  "Inbound label generation surface"
)

includesAll(
  unitDetail + stockLabel,
  [
    "StockLabelPrintArea",
    "StockLabelPreview",
    "StockLabelPrintActions",
    "StockLabelPrintNote",
    'width: "50mm"',
    'height: "30mm"',
    'pageSize: "50mm 30mm"',
    "Print label",
    "PDF fallback",
    "window.print()",
    "Label preview",
    "Elite Meat",
    "No reason is required.",
    "barcode: unit.barcode",
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
