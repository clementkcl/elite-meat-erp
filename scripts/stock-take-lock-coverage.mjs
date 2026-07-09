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

function functionBody(source, name) {
  const marker = `export async function ${name}`
  const start = source.indexOf(marker)

  assert(start >= 0, `Missing stock action: ${name}`)

  const next = source.indexOf("\nexport async function ", start + marker.length)
  return source.slice(start, next === -1 ? source.length : next)
}

function internalFunctionBody(source, name) {
  const marker = `async function ${name}`
  const start = source.indexOf(marker)

  assert(start >= 0, `Missing stock helper: ${name}`)

  const nextExport = source.indexOf("\nexport async function ", start + marker.length)
  const nextInternal = source.indexOf("\nasync function ", start + marker.length)
  const nextCandidates = [nextExport, nextInternal].filter((index) => index >= 0)
  const next = nextCandidates.length > 0 ? Math.min(...nextCandidates) : -1

  return source.slice(start, next === -1 ? source.length : next)
}

function includesAll(source, fragments, label) {
  for (const fragment of fragments) {
    assert(source.includes(fragment), `${label} missing: ${fragment}`)
  }
}

function assertLockCallShape(body, label) {
  const callStart = body.indexOf("await warnIfStockTakeOpen(context,")

  assert(callStart >= 0, `${label} must call warnIfStockTakeOpen.`)

  const callEnd = body.indexOf("})", callStart)
  const call = body.slice(callStart, callEnd === -1 ? body.length : callEnd)

  for (const fragment of ["itemId", "brandId", "locationId", "action:"]) {
    assert(call.includes(fragment), `${label} warning call missing ${fragment}.`)
  }
}

const actions = read("lib/stock/actions.ts")
const stockTakeRules = read("lib/stock/stock-take-rules.ts")
const workflowForms = read("components/stock/workflow-forms.tsx")
const regression = read("scripts/stock-workflow-regression.mjs")
const acceptance = read("scripts/stock-acceptance-coverage.mjs")
const mobileWorkerMvpMigration = read(
  "supabase/migrations/202606230002_stock_mobile_worker_mvp_v1.sql"
)
const stockTakeApprovalRpc = read(
  "supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql"
)
const packageJson = read("package.json")

includesAll(
  actions,
  [
    "async function warnIfStockTakeOpen",
    ".from(\"stock_take_sessions\")",
    ".select(\"session_no,item_id,brand_id,status\")",
    ".eq(\"location_id\", input.locationId)",
    ".in(\"status\", [\"DRAFT\", \"SUBMITTED\", \"REVIEWED\"])",
    "String(session.item_id ?? \"\") === input.itemId",
    "sameNullableId(session.brand_id, input.brandId)",
    "STOCK_TAKE_OPERATION_WARNING",
    "Stock take is active for this item/manufacturer/location.",
    "You can continue, but this movement will be recorded.",
  ],
  "Stock take selected item+brand warning helper"
)

for (const [name, actionText] of [
  ["barcodeInboundAction", "receive inbound"],
  ["confirmOrderOutboundAction", "confirm outbound"],
  ["confirmDirectOutboundAction", "confirm outbound"],
  ["transferAction", "transfer stock"],
  ["receiveTransferAction", "receive transfer"],
  ["returnStockAction", "return stock"],
  ["releaseInspectionStockAction", "release inspection stock"],
]) {
  const body = functionBody(actions, name)

  includesAll(
    body,
    [
      "await warnIfStockTakeOpen(context,",
      actionText,
    ],
    `${name} stock-take warning`
  )
  assertLockCallShape(body, `${name} stock-take warning`)
}

for (const [name, actionText] of [
  ["createDamageRequestForUnit", "request damage/spoilage deduction"],
  ["createReturnSupplierRequestForUnit", "request return supplier deduction"],
]) {
  const body = internalFunctionBody(actions, name)

  includesAll(
    body,
    [
      "await warnIfStockTakeOpen(context,",
      actionText,
    ],
    `${name} stock-take warning`
  )
  assertLockCallShape(body, `${name} stock-take warning`)
}

includesAll(
  functionBody(actions, "scanStockTakeBarcodeAction"),
  [
    "requireStockTakeScopeMatch(session",
    "UNKNOWN_BARCODE",
    "WRONG_LOCATION",
    "Unknown barcode exception recorded for manager/director approval.",
    "Wrong-location barcode exception recorded for manager/director approval.",
  ],
  "Stock take scan exception handling"
)

includesAll(
  functionBody(actions, "createStockTakeSessionAction") +
    mobileWorkerMvpMigration,
  [
    "runStockAction(formData, stockOperatorRoles",
    "assertStockLocationAccess",
    "create stock take",
    "stock users can create scoped draft stock take sessions",
    "with check (",
    "public.can_manage_stock()",
    "public.can_access_stock_location(location_id)",
    "status = 'DRAFT'",
  ],
  "Stock workers can start scoped draft stock take sessions"
)

includesAll(
  functionBody(actions, "reviewStockTakeAction") +
    functionBody(actions, "approveStockTakeAction"),
  [
    "runStockAction(formData, stockManagerRoles",
    "runStockAction(formData, stockDirectorApprovalRoles",
    "managerSignature",
    "directorSignature",
  ],
  "Stock take review and approval remain protected"
)

includesAll(
  stockTakeRules + regression,
  [
    "export function sameNullableId",
    "export function requireStockTakeScopeMatch",
    "Barcode/item does not match this stock take item.",
    "Barcode brand does not match this stock take brand.",
    "Stock take nullable brand matching should allow both sides to be empty.",
    "Different stock take item should be blocked.",
    "Different stock take brand should be blocked.",
  ],
  "Stock take scope regression"
)

includesAll(
  workflowForms,
  [
    "Barcode-only count",
    "Wrong item/manufacturer blocked.",
    "Unknown barcode is exception.",
    "Missing barcode adjustment waits for manager",
    "Finish Count",
    "Counted quantity",
    "Counted weight",
    "Extra scanned count",
    "Missing expected count",
    "Wrong item count",
    "Wrong location count",
    "Mismatch report waits for approval.",
    "activeStockStatus(unit.status)",
    "selectedExpectedUnits",
    "wrongItemScanCount",
    "Stock take is active for this item/manufacturer/location. You can",
  ],
  "Stock take worker warning guidance"
)

includesAll(
  functionBody(actions, "addStockTakeLineAction"),
  [
    "Stock take is barcode scanning only.",
    "Scan each barcode instead of adding manual count lines.",
  ],
  "Stock take manual line block"
)

includesAll(
  actions + functionBody(actions, "submitStockTakeAction"),
  [
    "async function requireStockTakeLineCount",
    ".from(\"stock_take_lines\")",
    "count: \"exact\", head: true",
    "requireStockTakeLineCount(context.supabase, parsed.sessionId)",
    "Scan at least one barcode before submitting stock take for review.",
  ],
  "Stock take submit requires scanned lines"
)

includesAll(
  functionBody(actions, "reviewStockTakeAction") +
    functionBody(actions, "approveStockTakeAction") +
    stockTakeApprovalRpc,
  [
    "requireStockTakeLineCount(context.supabase, parsed.sessionId)",
    "Scan at least one barcode before approving stock take.",
    "lineCount",
    "missingCount",
    "barcodeVarianceComputed",
    "Stock take missing barcode adjusted out",
    "director_approved_at",
    "manager_signature",
  ],
  "Stock take review and approval require scanned lines"
)

const stockTakeExceptionRpc = read(
  "supabase/migrations/202606100055_stock_take_exceptions_v1.sql"
)

includesAll(
  actions + workflowForms + stockTakeExceptionRpc,
  [
    "exception_type",
    "exception_status",
    "UNKNOWN_BARCODE",
    "WRONG_LOCATION",
    "Pending stock take exceptions",
    "pendingStockTakeExceptions",
    "Review these before final approval.",
    "Next: manager review, then director approval.",
    "Stock take unknown barcode created after approval",
    "Stock take wrong-location barcode moved after approval",
    "exceptionLines",
    "stockTakeExceptionsResolved",
  ],
  "Stock take unknown and wrong-location exception coverage"
)

assert(
  !workflowForms.includes("Add actual stock count") &&
    !workflowForms.includes("Add count line"),
  "Stock take UI must not expose manual count line entry."
)

includesAll(
  acceptance,
  [
    "requireStockTakeScopeMatch",
    "Barcode/item does not match this stock take item.",
    "Barcode brand does not match this stock take brand.",
    "Scan at least one barcode before submitting stock take for review.",
    "Scan at least one barcode before approving stock take.",
  ],
  "Stock acceptance stock-take scope coverage"
)

assert(
  packageJson.includes("stock-take-lock-coverage.mjs"),
  "npm run smoke must include stock-take-lock-coverage.mjs"
)

console.log("Stock take warning coverage checks passed.")
