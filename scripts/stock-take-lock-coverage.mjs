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

function includesAll(source, fragments, label) {
  for (const fragment of fragments) {
    assert(source.includes(fragment), `${label} missing: ${fragment}`)
  }
}

function assertLockCallShape(body, label) {
  const callStart = body.indexOf("await assertStockNotLockedByTake(context,")

  assert(callStart >= 0, `${label} must call assertStockNotLockedByTake.`)

  const callEnd = body.indexOf("})", callStart)
  const call = body.slice(callStart, callEnd === -1 ? body.length : callEnd)

  for (const fragment of ["itemId", "brandId", "locationId", "action:"]) {
    assert(call.includes(fragment), `${label} lock call missing ${fragment}.`)
  }
}

const actions = read("lib/stock/actions.ts")
const stockTakeRules = read("lib/stock/stock-take-rules.ts")
const workflowForms = read("components/stock/workflow-forms.tsx")
const regression = read("scripts/stock-workflow-regression.mjs")
const acceptance = read("scripts/stock-acceptance-coverage.mjs")
const stockTakeApprovalRpc = read(
  "supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql"
)
const packageJson = read("package.json")

includesAll(
  actions,
  [
    "async function assertStockNotLockedByTake",
    ".from(\"stock_take_sessions\")",
    ".select(\"session_no,item_id,brand_id,status\")",
    ".eq(\"location_id\", input.locationId)",
    ".in(\"status\", [\"DRAFT\", \"SUBMITTED\", \"REVIEWED\"])",
    "String(session.item_id ?? \"\") === input.itemId",
    "sameNullableId(session.brand_id, input.brandId)",
    "is open for this item and brand at this location.",
  ],
  "Stock take selected item+brand lock helper"
)

for (const [name, actionText] of [
  ["barcodeInboundAction", "receive inbound"],
  ["confirmOrderOutboundAction", "confirm outbound"],
  ["confirmDirectOutboundAction", "confirm outbound"],
  ["transferAction", "transfer stock"],
  ["receiveTransferAction", "receive transfer"],
  ["returnStockAction", "return stock"],
  ["releaseInspectionStockAction", "release inspection stock"],
  ["createDamageRequestAction", "request damage/spoilage deduction"],
  ["createReturnSupplierRequestAction", "request return supplier deduction"],
]) {
  const body = functionBody(actions, name)

  includesAll(
    body,
    [
      "await assertStockNotLockedByTake(context,",
      actionText,
    ],
    `${name} stock-take lock`
  )
  assertLockCallShape(body, `${name} stock-take lock`)
}

includesAll(
  functionBody(actions, "scanStockTakeBarcodeAction"),
  [
    "requireStockTakeScopeMatch(session",
    "Barcode belongs to a different stock take location.",
  ],
  "Stock take scan scope enforcement"
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
    "Manual count entry is disabled for MVP.",
    "Session scope is locked to the selected item and brand.",
    "Inbound, outbound, transfer, return, and damage requests",
    "for that exact scope will be blocked.",
  ],
  "Stock take worker lock guidance"
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
  ],
  "Stock take review and approval require scanned lines"
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

console.log("Stock take lock coverage checks passed.")
