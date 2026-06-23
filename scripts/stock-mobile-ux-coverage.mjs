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
const workflowForms = read("components/stock/workflow-forms.tsx")
const stockActions = read("lib/stock/actions.ts")
const barcodeScanner = read("components/stock/barcode-scanner.tsx")
const stockUnitDetail = read("components/stock/stock-unit-detail.tsx")
const stockLabel = read("components/stock/stock-label.tsx")
const ownerList = read("docs/STOCK_TEST_LIST_FOR_OWNER.md")
const remoteQa = read("docs/STOCK_REMOTE_QA_VERCEL.md")
const packageJson = read("package.json")

includesAll(
  stockPage,
  [
    "function StockWorkerHome()",
    "<StockShortcutButtons showHeading={false} workerHome />",
    "workerHome",
    "h-20 justify-start gap-3 text-lg",
    "Inbound",
    "Outbound",
    "Transfer",
    "Receive",
    "Return / Damage",
    "Stock Take",
    "/stock/inbound",
    "/stock/outbound",
    "/stock/transfer",
    "/stock/receive-transfer",
    "/stock/return",
    "/stock/stock-take",
  ],
  "Stock worker mobile home"
)

const workerHomeBody =
  stockPage.match(/function StockWorkerHome\(\) \{[\s\S]*?\n\}/)?.[0] ?? ""

for (const blockedFragment of [
  "KpiCards",
  "DataTable",
  "reports",
  "settings",
  "cost",
  "value",
  "finance",
]) {
  assert(
    !workerHomeBody.toLowerCase().includes(blockedFragment),
    `Stock worker mobile home must not include ${blockedFragment}.`
  )
}

includesAll(
  workflowForms,
  [
    "Recent inbound templates",
    "Search product or item code",
    "Finish Inbound Session",
    "Duplicate barcode. Inbound is blocked.",
    "Blocked/error scans this session",
    "role={decodeStatus === \"error\" ? \"alert\" : \"status\"}",
    "aria-live={decodeStatus === \"error\" ? \"assertive\" : \"polite\"}",
    "role={state.status === \"success\" ? \"status\" : \"alert\"}",
    "aria-live={state.status === \"success\" ? \"polite\" : \"assertive\"}",
    "function Input({ className, ...props }",
    "min-h-11 text-base sm:text-sm",
    "No weight found. Generate an internal label, print it, then attach it.",
    "Saved scans",
    "Saved weight",
    "Previous scan",
    "Select order first.",
    "Confirm substitution. No reason needed.",
    "No customer name",
    "No photo",
    "function DamageReasonButtons",
    "stockDamageReasons.map",
    "aria-pressed={value === reason}",
    "min-h-14 rounded-md",
    "Photo required. Stock goes to approval.",
    "Scan barcode, choose return location, then save.",
    "Customer returns may need inspection before normal outbound.",
    "Photo required. Request only; stock is not deducted now.",
    "Stock goes on supplier hold until manager approval.",
    "Choose destination stock location and scan barcode.",
    "Wrong location is blocked.",
    "Barcode not found",
    "Blocked barcode",
    "Wrong destination",
    "Barcode progress",
    "Weight progress",
    "Tap active session",
    "activeScanSessions",
    "Start a stock take above, then scan.",
    "min-h-16 rounded-md",
    "Wrong item/brand blocked.",
    "Unknown barcode is exception.",
    "Stock take is active for this item/brand/location. You can",
    "offlineScanMessage",
    "function OfflineScanAlert",
    "role=\"alert\"",
    "Connection lost. Please reconnect before scanning.",
    "const isOnline = useOnlineStatus()",
    "disabled={!isOnline}",
    "min-h-11 w-full rounded-md",
    "min-h-11 gap-2",
    "min-[390px]:grid-cols-2",
    "className=\"h-12 w-full\"",
  ],
  "Stock worker mobile workflow forms"
)

assert(
  !workflowForms.includes("No internet connection."),
  "Stock worker offline scanner message must use the approved short wording."
)
assert(
  !workflowForms.includes("Duplicate barcode. Remove it before saving."),
  "Stock inbound duplicate message must be an immediate blocked warning."
)
assert(
  (workflowForms.match(/offlineScanMessage/g) ?? []).length >= 8,
  "Stock worker scan/save flows must reuse the shared offline scanner message."
)
assert(
  (workflowForms.match(/<OfflineScanAlert/g) ?? []).length >= 8,
  "Stock worker scan forms must render the shared offline scanner alert."
)
assert(
  (workflowForms.match(/const isOnline = useOnlineStatus\(\)/g) ?? []).length >=
    8,
  "Stock worker scan/save forms must check online status."
)
assert(
  !`${ownerList}\n${remoteQa}`.includes("No internet connection."),
  "Stock QA docs must use the approved offline scanner message."
)

includesAll(
  barcodeScanner,
  [
    "Scan Barcode",
    "size=\"lg\"",
    "min-h-12 w-full gap-2 text-base sm:w-auto",
    "min-h-11 text-base sm:text-sm",
    "Manual fallback: type or paste the barcode here.",
    "min-h-11 min-w-11",
    "min-h-11 w-full sm:w-auto",
    "aria-label=\"Scan barcode with camera\"",
    "role=\"alert\"",
    "aria-live=\"polite\"",
    "break-all font-mono text-xs",
    "Continuous scan is on.",
    "Allow camera permission to scan.",
    "navigator.vibrate?.(40)",
  ],
  "Stock mobile scanner"
)

includesAll(
  stockUnitDetail + stockLabel,
  [
    "Simple mobile reprint label.",
    "Print label",
    "PDF fallback",
  ],
  "Stock mobile label reprint"
)

includesAll(
  ownerList + remoteQa,
  [
    "Test at phone width around 390px.",
    "no horizontal scrolling",
    "large Scan Barcode button",
    "Photo required. Request only; stock is not deducted now.",
    "Stock goes on supplier hold until manager approval.",
    "Stock take is active for this item/brand/location. You can continue, but this movement will be recorded.",
    "Print label",
    "PDF fallback",
  ],
  "Stock mobile owner QA docs"
)

includesAll(
  stockActions,
  [
    "function friendlyStockErrorMessage",
    "duplicate key value",
    "violates row-level security",
    "Choose an allowed stock location.",
    "Action could not be saved. Check the details and try again.",
    "return failure(friendlyStockErrorMessage(error))",
  ],
  "Stock worker-friendly action errors"
)

assert(
  packageJson.includes("stock-mobile-ux-coverage.mjs"),
  "npm run smoke must include stock-mobile-ux-coverage.mjs"
)

console.log("Stock mobile UX coverage checks passed.")
