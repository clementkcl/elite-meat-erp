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
    "Camera detections",
    "Last scanned barcode` card follows the same green/yellow/red tone",
    "announces errors assertively",
    "Pre-save `Saving ... kg.` feedback stays amber",
    "External scanner keyboard input",
    "Continuous auto-save scanning",
    "Last scanned item/weight and live totals",
    "Duplicate barcode blocks immediately",
    "Undo last scan safely",
    "Barcode inbound Page 4 summary",
    "Whole-session delete/void",
    "No-barcode Page 1 setup",
    "compact barcode details with weight/status/time rows",
    "voided barcode rows remain visible in session details for audit",
    "The no-barcode/internal-label step labels are guarded as a 3-step setup -> manual weight -> summary flow.",
    "No-barcode Page 2 manual weight",
    "No-barcode label path",
    "supplier-barcode no-weight fallback now opens Inbound without Barcode",
    "continue the next running serial instead of restarting at `0001`",
    "No-barcode Page 3 summary",
    "Bluetooth-first/PDF-fallback label note",
  ],
  "Guided inbound requirement matrix"
)

assert(
  !audit.includes("Camera window scans") &&
    !audit.includes("Scanner stays open until Close."),
  "Guided inbound audit must use current neutral scanner detection copy."
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
    "Logged-in Stock user completes a supplier-barcode session",
    "database shows matching `stock_units`, `stock_movements`, `barcode_scan_logs`, and `audit_logs`",
    "First supplier barcode teaches a rule",
    "database shows `barcode_weight_rules.barcode_length`, weight position, digit length, decimals, and sample barcode",
    "Different-length barcode shows the length warning",
    "database shows no incorrect extra `stock_units` row",
    "Duplicate barcode is blocked",
    "database shows no second `stock_units` row",
    "Phone camera scan opens",
    "camera indicator off after Close",
    "Handheld/Bluetooth scanner Enter input works",
    "Internal-label session generates a numeric label",
    "label PDF/photo plus database `stock_units`, movement, scan log, and generated barcode evidence",
    "Undo Last Scan voids one current-session stock unit",
    "database shows unit `VOIDED`, `INBOUND_VOID` movement, scan log, and audit log",
    "Manager/admin/director whole-session undo/delete voids eligible session stock",
    "database shows all eligible units voided plus `INBOUND_VOID` movement/log/audit rows",
    "Session summary is readable at about 390px width",
    "without horizontal scrolling",
    "Additional local browser evidence from 2026-07-09",
    "Base commit `4160d081`",
    "session-history details now show barcode, weight, status, and scan time",
    "manager-approved wording",
    "documentElement.scrollWidth = 375",
    "signing in would transmit demo credentials",
    "Additional local browser attempt from 2026-07-10",
    "PowerShell reached `/stock/inbound`",
    "could not reach `127.0.0.1:3900` or `localhost:3900`",
    "browser viewport was reset",
  ],
  "Guided inbound remaining proof gates"
)

assert(
  packageJson.includes("stock-inbound-guided-completion-audit-coverage.mjs"),
  "npm run smoke must include stock-inbound-guided-completion-audit-coverage.mjs"
)

console.log("Stock inbound guided completion audit coverage passed.")
