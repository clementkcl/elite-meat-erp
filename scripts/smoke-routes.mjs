import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const requiredRoutes = [
  "app/(erp)/stock/inbound/page.tsx",
  "app/(erp)/stock/outbound/page.tsx",
  "app/(erp)/stock/transfer/page.tsx",
  "app/(erp)/stock/receive-transfer/page.tsx",
  "app/(erp)/stock/return/page.tsx",
  "app/(erp)/stock/stock-take/page.tsx",
  "app/(erp)/delivery/dashboard/page.tsx",
  "app/(erp)/attendance/today/page.tsx",
  "app/(erp)/oa-actions/dashboard/page.tsx",
  "app/(erp)/retail/dashboard/page.tsx",
  "app/(erp)/processing/dashboard/page.tsx",
  "app/(erp)/cleaning/tasks/page.tsx",
  "app/(erp)/accounting-finance/dashboard/page.tsx",
  "app/(erp)/accounting/dashboard/page.tsx",
  "app/(erp)/director-reports/dashboard/page.tsx",
  "app/(erp)/director/dashboard/page.tsx",
  "app/(erp)/oa/my-requests/page.tsx",
  "app/(erp)/loading.tsx",
  "app/(erp)/error.tsx",
]

for (const route of requiredRoutes) {
  assert(exists(route), `Missing route or state file: ${route}`)
}

const barcodeScanner = read("components/stock/barcode-scanner.tsx")
assert(
  barcodeScanner.includes("@zxing/browser"),
  "Barcode scanner must use @zxing/browser"
)
assert(
  barcodeScanner.includes("facingMode") && barcodeScanner.includes("environment"),
  "Barcode scanner should prefer rear camera on mobile"
)
assert(
  barcodeScanner.includes("export function BarcodeScanner"),
  "Barcode scanner must export a reusable BarcodeScanner component"
)
assert(
  barcodeScanner.includes("getTracks().forEach") &&
    barcodeScanner.includes("track.stop()"),
  "Barcode scanner must stop camera stream"
)

const workflowForms = read("components/stock/workflow-forms.tsx")
const barcodeFieldCount = workflowForms.match(/<BarcodeField/g)?.length ?? 0
assert(
  barcodeFieldCount >= 6,
  `Expected scanner fields in six workflows, found ${barcodeFieldCount}`
)

const stockActions = read("lib/stock/actions.ts")
assert(
  stockActions.includes("assertStockLocationAccess"),
  "Stock actions must enforce stock-location access"
)
assert(
  stockActions.includes('status: "IN_STOCK"'),
  "Return stock must restore IN_STOCK status"
)
assert(
  stockActions.includes("Barcode already exists"),
  "Duplicate inbound barcode must be blocked"
)

const retailActions = read("lib/retail/actions.ts")
assert(
  retailActions.includes("assertRetailSameDay"),
  "Retail actions must enforce same-day operator edits"
)

const hardeningMigration = read(
  "supabase/migrations/202606100009_internal_qa_hardening_v1.sql"
)
for (const fragment of [
  "can_access_stock_location",
  "stock users can read scoped units",
  "stock users can submit scoped draft stock take sessions",
  "stock users can read own scan logs",
  "retail users can update same-day scoped daily sales",
  "retail users can submit same-day daily closings",
]) {
  assert(
    hardeningMigration.includes(fragment),
    `Hardening migration missing: ${fragment}`
  )
}

assert(exists("docs/role-team-access-matrix.md"), "Missing role/team matrix")
assert(exists("docs/manual-qa-checklist.md"), "Missing QA checklist")
for (const doc of [
  "AGENTS.md",
  "docs/erp-testing-plan.md",
  "docs/roles-and-team-isolation.md",
  "docs/workflow-acceptance-checklist.md",
  "docs/known-limitations.md",
]) {
  assert(exists(doc), `Missing hardening artifact: ${doc}`)
}

for (const component of [
  "components/erp/team-scope-badge.tsx",
  "components/ui/empty-state.tsx",
  "components/ui/status-badge.tsx",
  "components/oa-actions/approval-timeline.tsx",
  "components/ui/report-toolbar.tsx",
  "components/ui/recent-activity-list.tsx",
]) {
  assert(exists(component), `Missing reusable component: ${component}`)
}

console.log("Smoke checks passed.")
