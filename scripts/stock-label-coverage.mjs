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
    "sessionCode?.replace(/\\D/g, \"\")",
    "weightGrams",
    "Math.round(Number(weightKg) * 1000)",
    "serial > 9999",
    "String(serial).padStart(4, \"0\")",
    "String(weightGrams).padStart(6, \"0\").slice(-6)",
    "`${sessionPart}${serialPart}${weightPart}`",
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
    "Generated barcode should be session code digits + running number + grams.",
    "Generated barcode must be numeric only.",
    "Generated barcode should be blank when session code has no digits.",
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
    "onPrint = printLabels",
    "StockLabelActionText",
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
    ".stock-label-page:last-child",
    "page-break-after: auto;",
    "break-after: auto;",
    "labels.map((label)",
    "label.companyName",
    "label.productName",
    "label.weightKg",
    "label.barcode",
    "Bluetooth printer",
    "Print Labels PDF",
    "Bluetooth first. PDF fallback.",
    "One label per page.",
    "helper=\"Bluetooth printer\"",
    "helper=\"Save as PDF\"",
    "window.print()",
    "aria-label=\"Print labels with phone print sheet or Bluetooth printer\"",
    "aria-label=\"Print labels PDF\"",
    "h-auto min-h-12 w-full justify-center gap-2 whitespace-normal text-left",
    "flex min-w-0 flex-col items-start break-words leading-tight",
    "size-4 shrink-0",
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
    "pendingLabelRef.current = nextLabel",
    "pendingInternalLabelRef.current = true",
    "setBarcode(generated.barcode)",
    "Label generated. Saving stock now.",
    "formRef.current?.requestSubmit()",
    "pendingInternalLabelRef.current && pendingLabelRef.current",
    "Saved. Enter next weight.",
    "No supplier weight? Use internal label.",
    "id=\"netWeightKg\"",
    "inputMode=\"decimal\"",
    "enterKeyHint=\"done\"",
    "recentInboundWeightKg",
    "Saved scans",
    "Saved weight",
    "Recent inbound templates",
    "generateInboundBatchNo",
    "Finish Session",
    "Inbound session summary",
    "Undo scan",
    "No weight found. Generate an internal label, print it, then attach it.",
    "Blocked/error scans this session",
    "Recent inbound scans",
    "StockLabelPrintActions",
    "printInboundLabels",
    "inboundPrintTarget === \"labels\" ? labelsForPrint : []",
    "StockLabelPrintArea",
    "StockLabelPreview",
    "productName: selectedProductDisplayName",
    "Print and attach saved labels before moving stock.",
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
    "Print labels",
    "Print Labels PDF",
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
    "const stockUnitId = readNullableString(row.stock_unit_id)",
    "stockUnitId,",
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
