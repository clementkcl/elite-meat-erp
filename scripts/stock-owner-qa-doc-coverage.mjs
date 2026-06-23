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

const ownerList = read("docs/STOCK_TEST_LIST_FOR_OWNER.md")
const remoteQa = read("docs/STOCK_REMOTE_QA_VERCEL.md")
const migrationChecklist = read("docs/STOCK_MIGRATION_CHECKLIST.md")
const migration053 = read(
  "supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql"
)
const migration055 = read(
  "supabase/migrations/202606100055_stock_take_exceptions_v1.sql"
)
const migration230002 = read(
  "supabase/migrations/202606230002_stock_mobile_worker_mvp_v1.sql"
)
const migration230003 = read(
  "supabase/migrations/202606230003_stock_receive_transfer_wrong_location_block_v1.sql"
)
const migration230006 = read(
  "supabase/migrations/202606230006_stock_transfer_any_location_v1.sql"
)
const businessRules = read("docs/BUSINESS_RULES.md")
const workflowForms = read("components/stock/workflow-forms.tsx")
const stockLabel = read("components/stock/stock-label.tsx")
const labelCoverage = read("scripts/stock-label-coverage.mjs")
const migrationSafety = read("scripts/stock-migration-safety.mjs")
const securityCoverage = read("scripts/stock-security-coverage.mjs")
const packageJson = read("package.json")

includesAll(
  ownerList,
  [
    "Login And Profile Scope",
    "Stock Inbound",
    "Recent Inbound Templates",
    "Continuous Scanning",
    "Barcode Weight Rule Save And Reuse",
    "Barcode Without Weight To Label Printing",
    "Duplicate Barcode Block",
    "Previous Scan Display",
    "Saved Scan Count And Total Weight",
    "Undo Scan And VOIDED Status",
    "Stock Movement INBOUND_VOID",
    "Stock Balance Excludes Voided Units",
    "Outbound Order-Based Scanning",
    "Transfer And Receive Transfer",
    "Return Stock Becomes IN_STOCK",
    "Damage And Spoilage Approval",
    "Stock Take Manager Review And Director Approval",
    "Reports CSV And PDF",
    "Mobile Scanner On Phone",
  ],
  "Owner stock test list"
)

includesAll(
  remoteQa,
  [
    "/stock/inbound",
    "/stock/outbound",
    "/stock/transfer",
    "/stock/receive-transfer",
    "/stock/return",
    "/stock/balance",
    "/stock/movements",
    "/stock/stock-take",
    "/stock/reports",
    "/stock/units/[id]",
    "https://elite-meat-erp.vercel.app",
  ],
  "Remote Vercel stock QA routes"
)

includesAll(
  migrationChecklist,
  [
    "202606100053_stock_inbound_session_undo_v1.sql",
    "202606100055_stock_take_exceptions_v1.sql",
    "202606230002_stock_mobile_worker_mvp_v1.sql",
    "202606230006_stock_transfer_any_location_v1.sql",
    "VOIDED",
    "INBOUND_VOID",
    "void_inbound_stock_unit",
    "UNKNOWN_BARCODE",
    "WRONG_LOCATION",
    "npx.cmd supabase login",
    "npx.cmd supabase link --project-ref aikfqnbsshflbtuakwrz",
    "npx.cmd supabase migration list",
    "Do not run `npx.cmd supabase db push` until the project link is confirmed",
  ],
  "Stock migration checklist"
)

includesAll(
  migration230002 + migration230003,
  [
    "drop policy if exists \"stock users can create scoped draft stock take sessions\"",
    "public.can_manage_stock()",
    "Wrong location. This barcode must be received at",
    "wrongLocationException', false",
  ],
  "Mobile worker receive-transfer safety"
)

includesAll(
  businessRules + ownerList + remoteQa + migration230006,
  [
    "Transfer destination is selected as a destination stock location.",
    "destination stock location",
    "active and allowed",
    "transferDestinationAnyActiveLocation",
    "Wrong location. This barcode must be received at",
  ],
  "Stock transfer destination-location rule"
)

for (const staleFragment of [
  "Transfer destination is selected by outlet",
  "outlet's default stock location",
  "destination outlet default stock location",
]) {
  assert(
    !businessRules.includes(staleFragment),
    `Business rules still contain stale transfer wording: ${staleFragment}`
  )
}

includesAll(
  migration055,
  [
    "exception_type",
    "exception_status",
    "UNKNOWN_BARCODE",
    "WRONG_LOCATION",
    "Stock take unknown barcode created after approval",
    "Stock take wrong-location barcode moved after approval",
    "stockTakeExceptionsResolved",
  ],
  "Migration 055 stock take exception safety"
)

includesAll(
  migration053,
  [
    "alter type public.stock_unit_status add value if not exists 'VOIDED'",
    "alter type public.stock_movement_type add value if not exists 'INBOUND_VOID'",
    "drop function if exists public.void_inbound_stock_unit",
    "create or replace function public.void_inbound_stock_unit",
    "'BARCODE_INBOUND_VOID'",
    "grant execute on function public.void_inbound_stock_unit",
  ],
  "Migration 053 undo safety"
)

includesAll(
  workflowForms,
  [
    "Recent inbound templates",
    "generateInboundBatchNo",
    "Saved scans",
    "Saved weight",
    "Previous scan",
    "Weight rule and notes",
    "Save weight rule for future scans",
    "Undo scan",
    "Finish Inbound Session",
    "No weight found. Generate an internal label, print it, then attach it.",
    "Generate internal label",
    "StockLabelPrintActions",
  ],
  "Stock inbound worker coverage"
)

includesAll(
  stockLabel,
  [
    "Bluetooth label printer",
    "PDF fallback",
    "50mm x 30mm",
    "stockLabelSizes",
  ],
  "Stock label mobile print coverage"
)

includesAll(
  labelCoverage + migrationSafety + securityCoverage,
  [
    "Stock unit label reprint surface",
    "Stock migration safety checks passed.",
    "must not reference Supabase service-role credentials",
  ],
  "Existing stock coverage scripts"
)

assert(
  packageJson.includes("stock-owner-qa-doc-coverage.mjs"),
  "npm run smoke must include stock-owner-qa-doc-coverage.mjs"
)

console.log("Stock owner QA doc coverage checks passed.")
