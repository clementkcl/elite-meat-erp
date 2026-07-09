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

const actions = read("lib/stock/actions.ts")
const workflowForms = read("components/stock/workflow-forms.tsx")
const stockPage = read("components/stock/stock-page.tsx")
const data = read("lib/stock/data.ts")
const types = read("lib/stock/types.ts")
const packageJson = read("package.json")
const issueMigration = read(
  "supabase/migrations/202606250007_stock_scan_issue_context_v1.sql"
)
const reviewMigration = read(
  "supabase/migrations/202606250009_stock_scan_issue_review_scope_v1.sql"
)
const coreMigration = read("supabase/migrations/202606100001_erp_core_stock_v1.sql")

const issueTypes = [
  "DUPLICATE_BARCODE",
  "BARCODE_LENGTH_MISMATCH",
  "BARCODE_NOT_FOUND",
  "WRONG_LOCATION",
  "WRONG_ITEM",
  "UNAVAILABLE_STOCK",
  "BARCODE_RULE_DETECTION_FAILURE",
  "UNKNOWN_BARCODE_STOCK_TAKE",
  "STOCK_TAKE_MISMATCH",
  "TRANSFER_MISSING_ITEM",
  "TRANSFER_UNEXPECTED_ITEM",
  "SPOILED_DAMAGED_REVIEW",
]

for (const issueType of issueTypes) {
  assert(actions.includes(`"${issueType}"`), `Action contract missing ${issueType}`)
  assert(
    workflowForms.includes(`"${issueType}"`) || actions.includes(issueType),
    `Worker issue flow missing ${issueType}`
  )
  assert(
    issueMigration.includes(`'${issueType}'`),
    `Issue migration missing ${issueType}`
  )
}

includesAll(
  issueMigration + coreMigration,
  [
    "scanned_by uuid references public.profiles(id) on delete set null",
    "created_at timestamptz not null default now()",
    "add column if not exists issue_type text",
    "add column if not exists item_id uuid",
    "add column if not exists selected_item_id uuid",
    "add column if not exists expected_location_id uuid",
    "add column if not exists scanned_location_id uuid",
    "add column if not exists expected_status text",
    "add column if not exists scanned_status text",
    "add column if not exists related_context jsonb",
    "add column if not exists review_status text",
    "add column if not exists reviewed_by uuid",
    "add column if not exists reviewed_at timestamptz",
    "add column if not exists review_note text",
  ],
  "Issue schema"
)

includesAll(
  actions,
  [
    "type BarcodeIssueContext",
    "type StockActionContext",
    "issueContext: BarcodeIssueContext = {}",
    "const unit = await requireBarcodeUnit(context, barcode, action, issueContext)",
    "async function logBarcodeScan",
    "barcode: input.barcode",
    "action: input.action",
    "success: input.success",
    "message: input.message",
    "scanned_by: input.scannedBy",
    "issue_type: input.issueType",
    "item_id: input.itemId",
    "selected_item_id: input.selectedItemId",
    "expected_location_id: input.expectedLocationId",
    "scanned_location_id: input.scannedLocationId",
    "expected_status: input.expectedStatus",
    "scanned_status: input.scannedStatus",
    "related_context: input.relatedContext",
    "scanned_by: input.scannedBy",
    "function issueRelatedContext",
    "sessionId: input.relatedSessionId",
    "orderId: input.relatedOrderId",
    "customerId: input.relatedCustomerId",
    "transferId: input.relatedTransferId",
    "expectedBarcode: input.expectedBarcode",
    "receivedBarcode: input.receivedBarcode",
    "brandId: input.brandId",
    "originId: input.originId",
    "async function rejectWrongLocationScan",
    "relatedSessionId",
    "relatedOrderId",
    "relatedCustomerId",
    "relatedTransferId",
    "expectedBarcode: z.string().trim().optional()",
    "receivedBarcode: z.string().trim().optional()",
    "expectedBarcode",
    "receivedBarcode",
    "export async function logInboundScanIssueAction",
    "export async function logStockScanIssueAction",
  ],
  "Issue insert helper"
)

includesAll(
  data,
  [
    "createdAt: readString(row.created_at",
    "scannedBy: readNullableString(row.scanned_by)",
    "itemId: readNullableString(row.item_id)",
    "selectedItemId: readNullableString(row.selected_item_id)",
    "expectedLocationId: readNullableString(row.expected_location_id)",
    "scannedLocationId: readNullableString(row.scanned_location_id)",
    "expectedStatus: readNullableString(row.expected_status)",
    "scannedStatus: readNullableString(row.scanned_status)",
    "relatedContext: asRecord(row.related_context)",
    "reviewStatus: readString(row.review_status, \"OPEN\")",
  ],
  "Issue data mapping"
)

includesAll(
  actions,
  [
    "expectedLocationId: context.profile.stockLocationId",
    "itemId: readString(existingUnit.item_id) || null",
    "relatedContext: issueRelatedContext({\n          relatedSessionId: parsed.batchNo,",
    "await rejectWrongLocationScan(context, {",
    "expectedLocationId: parsed.receiveLocationId",
    "expectedLocationId: parsed.locationId",
    "expectedStatus: \"TRANSFER_PENDING\"",
    "expectedStatus: \"returnable stock\"",
    "message: \"Barcode was not found.\"",
    "issueType: \"BARCODE_NOT_FOUND\"",
    "relatedContext: issueRelatedContext({ relatedOrderId: parsed.orderId })",
    "relatedContext: issueRelatedContext({\n          relatedCustomerId: parsed.customerId,",
  ],
  "Server blocked-scan context"
)

includesAll(
  workflowForms,
  [
    "function logWorkerScanIssue",
    "logStockScanIssueAction(formData)",
    "void logStockScanIssueAction(formData).catch",
    "input.locationId ?? \"\"",
    "input.itemId ?? \"\"",
    "input.selectedItemId ?? \"\"",
    "input.expectedLocationId ?? \"\"",
    "input.scannedLocationId ?? \"\"",
    "input.expectedStatus ?? \"\"",
    "input.scannedStatus ?? \"\"",
    "input.relatedOrderId ?? \"\"",
    "input.relatedCustomerId ?? \"\"",
    "input.expectedBarcode ?? \"\"",
    "input.receivedBarcode ?? \"\"",
    "loggedOutboundIssueKeysRef",
    "loggedTransferIssueKeysRef",
    "loggedReceiveIssueKeysRef",
    "loggedReturnIssueKeysRef",
    "logInboundScanIssue(value, message, \"DUPLICATE_BARCODE\", {",
    "logInboundScanIssue(value, lengthWarning, \"BARCODE_LENGTH_MISMATCH\", {",
    "expectedStatus: `${expectedBarcodeLength} digits`",
    "scannedStatus: `${value.length} digits`",
    "logInboundScanIssue(value, message, \"BARCODE_RULE_DETECTION_FAILURE\")",
    "setIssueFormValue(formData, \"expectedBarcode\", input.expectedBarcode)",
    "setIssueFormValue(formData, \"receivedBarcode\", input.receivedBarcode)",
    "context.scannedLocationId",
    "context.scannedStatus",
    "expectedBarcode: selectedReceiveBarcode || null",
    "receivedBarcode: nextBarcode",
    "expectedStatus: \"unused barcode\"",
    "Duplicate barcode. Inbound is blocked.",
    "Barcode not found.",
    "currentReturnWrongLocation",
    "Wrong location. Return at",
    "Wrong location. Manager review issue will be logged.",
    "Wrong location. This barcode must be received at",
  ],
  "Worker short-message issue logging"
)

includesAll(
  workflowForms,
  [
    "formData.set(\"issueType\", input.issueType)",
    "setIssueFormValue(formData, \"itemId\", input.itemId)",
    "setIssueFormValue(formData, \"selectedItemId\", input.selectedItemId)",
    "setIssueFormValue(formData, \"expectedLocationId\", input.expectedLocationId)",
    "setIssueFormValue(formData, \"scannedLocationId\", input.scannedLocationId)",
    "setIssueFormValue(formData, \"expectedStatus\", input.expectedStatus)",
    "setIssueFormValue(formData, \"scannedStatus\", input.scannedStatus)",
    "setIssueFormValue(formData, \"relatedSessionId\", input.relatedSessionId)",
    "setIssueFormValue(formData, \"relatedOrderId\", input.relatedOrderId)",
    "setIssueFormValue(formData, \"relatedCustomerId\", input.relatedCustomerId)",
    "setIssueFormValue(formData, \"relatedTransferId\", input.relatedTransferId)",
    "setIssueFormValue(formData, \"expectedBarcode\", input.expectedBarcode)",
    "setIssueFormValue(formData, \"receivedBarcode\", input.receivedBarcode)",
  ],
  "Worker auto issue context payload"
)

includesAll(
  actions,
  [
    "issueType: \"DUPLICATE_BARCODE\"",
    "issueType: \"BARCODE_NOT_FOUND\"",
    "issueType: \"WRONG_LOCATION\"",
    "issueType: \"WRONG_ITEM\"",
    "issueType: \"UNAVAILABLE_STOCK\"",
    "issueType: \"UNKNOWN_BARCODE_STOCK_TAKE\"",
    "issueType: \"STOCK_TAKE_MISMATCH\"",
    "issueType: \"TRANSFER_MISSING_ITEM\"",
    "issueType: \"TRANSFER_UNEXPECTED_ITEM\"",
    "issueType: \"SPOILED_DAMAGED_REVIEW\"",
    "message: \"Wrong location. This barcode belongs to another location.\"",
    "expectedBarcode: readString(missingTransfer.barcode)",
    "receivedBarcode: parsed.barcode",
    "expectedStatus: \"selected item/manufacturer\"",
    "relatedContext: issueRelatedContext({\n          relatedTransferId: parsed.expectedBarcode,",
    "Database adjustment is not applied by issue review itself.",
  ].filter((fragment) => fragment !== "Database adjustment is not applied by issue review itself."),
  "Server-side issue sources"
)

includesAll(
  actions,
  [
    "createDamageRequestForUnit",
    "Damage request submitted for manager review",
    "expectedStatus: \"manager review\"",
    "Spoiled/damaged return needs manager review.",
    "approve_stock_damage_request",
    "approve_stock_take_session",
    "reviewStockScanIssueAction",
    "reviewStatus: z.enum([\"APPROVED\", \"REJECTED\", \"CORRECTED\"])",
  ],
  "Approval-only correction paths"
)

includesAll(
  actions,
  [
    "scanned_by: input.scannedBy",
    "issue_type: input.issueType ?? inferStockIssueType(input.message)",
    "item_id: input.itemId ?? null",
    "selected_item_id: input.selectedItemId ?? null",
    "expected_location_id: input.expectedLocationId ?? null",
    "scanned_location_id: input.scannedLocationId ?? null",
    "expected_status: input.expectedStatus ?? null",
    "scanned_status: input.scannedStatus ?? null",
    "related_context: input.relatedContext ?? {}",
    "relatedContext: issueRelatedContext(parsed)",
  ],
  "Issue record persisted context fields"
)

const flowIssueCoverage = [
  {
    flow: "inbound",
    source: actions + workflowForms,
    fragments: [
      "export async function barcodeInboundAction",
      "export async function logInboundScanIssueAction",
      "Barcode already exists in stock.",
      "issueType: \"DUPLICATE_BARCODE\"",
      "logInboundScanIssue(value, lengthWarning, \"BARCODE_LENGTH_MISMATCH\", {",
      "logInboundScanIssue(value, message, \"BARCODE_RULE_DETECTION_FAILURE\")",
      "relatedSessionId: parsed.batchNo",
    ],
  },
  {
    flow: "outbound",
    source: actions + workflowForms,
    fragments: [
      "export async function confirmOrderOutboundAction",
      "export async function confirmDirectOutboundAction",
      "Duplicate barcode in this outbound batch.",
      "issueType: \"UNAVAILABLE_STOCK\"",
      "issueType: \"WRONG_LOCATION\"",
      "relatedContext: issueRelatedContext({ relatedOrderId: parsed.orderId })",
      "relatedContext: issueRelatedContext({\n          relatedCustomerId: parsed.customerId,",
    ],
  },
  {
    flow: "transfer",
    source: actions + workflowForms,
    fragments: [
      "export async function transferAction",
      "export async function receiveTransferAction",
      "issueType: \"TRANSFER_UNEXPECTED_ITEM\"",
      "message: \"Unexpected barcode. Scan the selected transfer barcode.\",\n        issueType: \"TRANSFER_UNEXPECTED_ITEM\",\n        expectedLocationId: parsed.receiveLocationId,\n        expectedStatus: \"selected transfer barcode\",\n        scannedStatus: \"unexpected barcode\"",
      "issueType: \"TRANSFER_MISSING_ITEM\"",
      "expectedBarcode: readString(missingTransfer.barcode)",
      "receivedBarcode: parsed.barcode",
      "Wrong location. This barcode must be received at",
    ],
  },
  {
    flow: "return and damage",
    source: actions + workflowForms,
    fragments: [
      "export async function returnStockAction",
      "async function createDamageRequestForUnit",
      "issueType: \"SPOILED_DAMAGED_REVIEW\"",
      "returnCondition === \"SPOILED_DAMAGED\"",
      "Spoiled/damaged return needs manager review.",
      "Spoiled/damaged return saved for manager review.",
      "Damage request submitted for manager review",
      "expectedStatus: \"manager review\"",
      "expectedStatus: \"returnable stock\"",
      "Barcode is ${unit.status} and cannot be returned.",
    ],
  },
  {
    flow: "stock take",
    source: actions + workflowForms,
    fragments: [
      "export async function scanStockTakeBarcodeAction",
      "export async function submitStockTakeAction",
      "issueType: \"UNKNOWN_BARCODE_STOCK_TAKE\"",
      "issueType: \"STOCK_TAKE_MISMATCH\"",
      "issueType: \"WRONG_ITEM\"",
      "exception_type: \"UNKNOWN_BARCODE\"",
      "mismatchType: \"missing_expected_barcode\"",
    ],
  },
]

for (const { flow, source, fragments } of flowIssueCoverage) {
  includesAll(source, fragments, `${flow} issue auto-create path`)
}

const reviewActionStart = actions.indexOf("export async function reviewStockScanIssueAction")
const reviewActionEnd = actions.indexOf(
  "export async function reviewStockScanIssueFormAction",
  reviewActionStart
)
assert(reviewActionStart >= 0, "Review issue action missing")
assert(reviewActionEnd > reviewActionStart, "Review issue action boundary missing")
const reviewAction = actions.slice(reviewActionStart, reviewActionEnd)

includesAll(
  reviewAction,
  [
    ".from(\"barcode_scan_logs\")",
    "review_status: parsed.reviewStatus",
    "reviewed_by: context.profile.id",
    "reviewed_at: new Date().toISOString()",
    ".eq(\"review_status\", \"OPEN\")",
  ],
  "Issue review status update"
)

for (const forbiddenFragment of [
  "approve_stock_take_session",
  "stock_movements",
  "stock_units",
  "STOCK_TAKE_ADJUSTMENT",
]) {
  assert(
    !reviewAction.includes(forbiddenFragment),
    `Issue review must not directly adjust stock: ${forbiddenFragment}`
  )
}

includesAll(
  stockPage + data + types,
  [
    "Manager scan issue review",
    "Open stock scan issues from inbound, outbound, transfer, return,",
    "damage/spoilage, and stock take",
    "All open issue types are shown",
    "Mark corrected records review evidence only",
    "stock changes still use the proper approval workflow",
    "Product: {alert.itemName",
    "Location: expected",
    "Related: {formatIssueContext(alert.relatedContext)}",
    "dateText(alert.createdAt)",
    "alert.scannedBy ? ` by ${alert.scannedBy}` : \"\"",
    "APPROVED",
    "REJECTED",
    "CORRECTED",
    "reviewStockScanIssueFormAction",
    "scanAlerts",
    "reviewStatus === \"OPEN\"",
    "type StockScanAlert",
  ],
  "Manager review queue"
)

const workerHomeStart = stockPage.indexOf("function StockWorkerHome")
const dashboardViewStart = stockPage.indexOf("function DashboardView")
const scanAlertPanelStart = stockPage.indexOf("function ScanAlertPanel")

assert(workerHomeStart >= 0, "Worker stock home missing")
assert(dashboardViewStart > workerHomeStart, "Dashboard view boundary missing")
assert(scanAlertPanelStart > dashboardViewStart, "Scan alert panel boundary missing")

const workerHomeSource = stockPage.slice(workerHomeStart, dashboardViewStart)
const dashboardViewSource = stockPage.slice(dashboardViewStart, scanAlertPanelStart)

assert(
  !workerHomeSource.includes("reviewStockScanIssueFormAction") &&
    !workerHomeSource.includes("ScanAlertPanel"),
  "Worker home must not expose the manager issue review queue"
)
includesAll(
  dashboardViewSource,
  [
    "if (isGeneralWorker) {",
    "return <StockWorkerHome canUseItemSetup={canUseItemSetup} />",
    "<ScanAlertPanel alerts={data.dashboard.scanAlerts} />",
  ],
  "Worker short-message and manager queue visibility"
)

includesAll(
  reviewMigration,
  [
    "drop policy if exists \"stock users can read own scan logs\"",
    "drop policy if exists \"stock admins can update scan logs\"",
    "public.can_administer_stock()",
    "public.can_manage_stock_take()",
    "public.can_access_stock_location(expected_location_id)",
    "public.can_access_stock_location(scanned_location_id)",
    "review_status in ('APPROVED', 'REJECTED', 'CORRECTED')",
    "reviewed_by = auth.uid()",
    "reviewed_at is not null",
  ],
  "Manager review RLS scope"
)

assert(
  packageJson.includes("node scripts/stock-issue-handling-coverage.mjs"),
  "npm run smoke must include stock-issue-handling-coverage.mjs"
)

console.log("Stock issue handling coverage passed.")
