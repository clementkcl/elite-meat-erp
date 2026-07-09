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

const audit = read("docs/STOCK_INBOUND_GUIDED_COMPLETION_AUDIT.md")
const packageJson = read("package.json")

includesAll(
  audit,
  [
    "Stock Inbound Guided Flow Completion Audit",
    "components/stock/workflow-forms.tsx",
    "components/stock/barcode-scanner.tsx",
    "lib/stock/display-names.ts",
    "lib/stock/actions.ts",
    "supabase/migrations/202606250004_stock_barcode_rule_sample_v1.sql",
    "supabase/migrations/202606250008_stock_inbound_session_void_rpc_v1.sql",
    "scripts/stock-inbound-guided-flow-coverage.mjs",
    "Requirement Matrix",
  ],
  "Guided inbound completion audit sources"
)

includesAll(
  audit,
  [
    "Product and manufacturer stay separate",
    "Display name is manufacturer + product",
    "Display name appears in UI/scanner/summary/labels/reports/search",
    "Filter/report by product and manufacturer separately",
    "Barcode inbound Page 1 setup",
    "Barcode inbound Page 2 rule setup",
    "Barcode rule stores length and sample",
    "Different barcode length warning",
    "Scanner popup/window",
    "External scanner keyboard input",
    "Continuous auto-save scanning",
    "Last scanned item/weight and live totals",
    "Duplicate barcode blocks immediately",
    "Undo last scan safely",
    "Barcode inbound Page 4 summary",
    "Whole-session delete/void",
    "No-barcode Page 1 setup",
    "The no-barcode/internal-label step labels are guarded as a 3-step setup -> manual weight -> summary flow.",
    "No-barcode Page 2 manual weight",
    "No-barcode label path",
    "supplier-barcode no-weight fallback now opens Inbound without Barcode",
    "continue the next running serial instead of restarting at `0001`",
    "No-barcode Page 3 summary",
  ],
  "Guided inbound requirement matrix"
)

includesAll(
  audit,
  [
    "Source-proven; live Supabase save still needs QA",
    "Source-proven; real phone/laptop camera QA still needed",
    "Source-proven; real handheld scanner timing QA still needed",
    "Source-proven; live RPC QA still needed",
    "Source-proven; real print/PDF/device QA still needed",
    "Remaining Proof Before Goal Completion",
    "logged-in Stock user completes a supplier-barcode session",
    "first supplier barcode teaches a rule",
    "different-length barcode shows the length warning",
    "duplicate barcode is blocked",
    "phone camera scan opens",
    "handheld or Bluetooth scanner that sends Enter",
    "internal-label/no-supplier session generates a numeric label",
    "Undo Last Scan voids one current-session stock unit",
    "Manager/admin/director whole-session undo/delete voids all eligible session stock",
    "Session summary is readable at about 390px width",
    "Additional local browser evidence from 2026-07-09",
    "documentElement.scrollWidth = 375",
    "signing in would transmit demo credentials",
  ],
  "Guided inbound remaining proof gates"
)

assert(
  packageJson.includes("stock-inbound-guided-completion-audit-coverage.mjs"),
  "npm run smoke must include stock-inbound-guided-completion-audit-coverage.mjs"
)

console.log("Stock inbound guided completion audit coverage passed.")
