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

const scanner = read("components/stock/barcode-scanner.tsx")
const workflowForms = read("components/stock/workflow-forms.tsx")
const stockPage = read("components/stock/stock-page.tsx")
const packageJson = read("package.json")

includesAll(
  scanner,
  [
    "@zxing/browser",
    "BrowserMultiFormatReader",
    "decodeFromConstraints",
    "navigator.mediaDevices?.getUserMedia",
    "facingMode: { ideal: \"environment\" }",
    "continuous",
    "lastDetectedRef",
    "navigator.vibrate?.(40)",
    "AudioContext",
    "Scan Barcode",
    "size=\"lg\"",
    "min-h-11",
    "min-[390px]:w-auto",
    "Manual fallback: type or paste the barcode here.",
    "recentScans",
    "Recent scans",
    "slice(0, 5)",
    "Allow camera permission to scan.",
    "Continuous scan is on.",
    "Unable to start the camera scanner.",
    "getTracks().forEach",
    "track.stop()",
    "videoElement.srcObject = null",
    "setOpen(false)",
  ],
  "Barcode scanner mobile UX"
)

const barcodeFieldCount = workflowForms.match(/<BarcodeField/g)?.length ?? 0

assert(
  barcodeFieldCount >= 6,
  `Expected BarcodeField in at least six stock scan workflows, found ${barcodeFieldCount}.`
)

for (const fragment of [
  "Continuous barcode inbound",
  "onScan={(value) => handleBarcodeChange(value, true)}",
  "continuousScan",
  "Confirm outbound batch",
  "setBarcodes((current) =>",
  "scanStockTakeBarcode(value",
  "TransferForm",
  "ReceiveTransferForm",
  "ReturnForm",
  "StockTakeWorkbench",
  "scanStockTakeBarcodeAction",
]) {
  assert(
    workflowForms.includes(fragment),
    `Stock scanner workflow wiring missing: ${fragment}`
  )
}

for (const fragment of [
  '| "inbound"',
  '| "outbound"',
  '| "transfer"',
  '| "receive-transfer"',
  '| "return"',
  '| "stock-take"',
  "title: \"Barcode Inbound\"",
  "title: \"Outbound\"",
  "title: \"Stock Transfer\"",
  "title: \"Receive Transfer\"",
  "title: \"Stock Return\"",
  "title: \"Stock Take\"",
]) {
  assert(stockPage.includes(fragment), `Stock scan route missing: ${fragment}`)
}

assert(
  packageJson.includes("stock-scanner-coverage.mjs"),
  "npm run smoke must include stock-scanner-coverage.mjs"
)

console.log("Stock scanner coverage checks passed.")
