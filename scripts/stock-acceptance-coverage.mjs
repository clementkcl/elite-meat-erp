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
const data = read("lib/stock/data.ts")
const types = read("lib/stock/types.ts")
const workflowForms = read("components/stock/workflow-forms.tsx")
const scanner = read("components/stock/barcode-scanner.tsx")
const stockPage = read("components/stock/stock-page.tsx")
const unitDetail = read("components/stock/stock-unit-detail.tsx")
const noBarcodeRoute = read("app/(erp)/stock/no-barcode-inbound/page.tsx")
const packageJson = read("package.json")
const approvalRules = read("lib/stock/approval-rules.ts")
const itemCodeRules = read("lib/stock/item-code.ts")
const outboundRules = read("lib/stock/outbound-rules.ts")
const reportExportRules = read("lib/stock/report-export.ts")
const stockTakeRules = read("lib/stock/stock-take-rules.ts")
const stockWorkflowRegression = read("scripts/stock-workflow-regression.mjs")
const unitStatusRules = read("lib/stock/unit-status-rules.ts")
const rlsPolicyCoverage = read("scripts/stock-rls-policy-coverage.mjs")
const seedCoverage = read("scripts/stock-seed-coverage.mjs")
const securityCoverage = read("scripts/stock-security-coverage.mjs")
const itemMasterCoverage = read("scripts/stock-item-master-coverage.mjs")
const labelCoverage = read("scripts/stock-label-coverage.mjs")
const stockTakeLockCoverage = read("scripts/stock-take-lock-coverage.mjs")
const reportCoverage = read("scripts/stock-report-coverage.mjs")
const migration009 = read("supabase/migrations/202606100009_internal_qa_hardening_v1.sql")
const migration028 = read("supabase/migrations/202606100028_order_outbound_atomic_rpc_v1.sql")
const migration037 = read("supabase/migrations/202606100037_stock_inbound_labels_rules_v1.sql")
const migration038 = read("supabase/migrations/202606100038_stock_take_scoped_approval_v1.sql")
const migration041 = read("supabase/migrations/202606100041_direct_outbound_batches_v1.sql")
const migration042 = read("supabase/migrations/202606100042_atomic_stock_approval_rpcs_v1.sql")
const migration043 = read("supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql")
const migration051 = read("supabase/migrations/202606100051_stock_take_approval_requires_lines_v1.sql")
const migration052 = read("supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql")
const migration055 = read("supabase/migrations/202606100055_stock_take_exceptions_v1.sql")
const migration044 = read("supabase/migrations/202606100044_item_master_all_roles_v1.sql")
const migration040 = read("supabase/migrations/202606100040_stock_return_supplier_approval_v1.sql")
const migration046 = read("supabase/migrations/202606100046_customer_return_inspection_status_v1.sql")
const migration047 = read("supabase/migrations/202606100047_atomic_transfer_receive_rpcs_v1.sql")
const migration054 = read("supabase/migrations/202606100054_stock_outbound_transfer_hardening_v1.sql")
const migration048 = read("supabase/migrations/202606100048_atomic_stock_return_rpc_v1.sql")
const migration049 = read("supabase/migrations/202606100049_atomic_inspection_release_rpc_v1.sql")
const migration050 = read("supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql")
const migration053 = read("supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql")
const migration230002 = read("supabase/migrations/202606230002_stock_mobile_worker_mvp_v1.sql")
const migration230003 = read("supabase/migrations/202606230003_stock_receive_transfer_wrong_location_block_v1.sql")
const migration230006 = read("supabase/migrations/202606230006_stock_transfer_any_location_v1.sql")

includesAll(
  actions + migration050,
  [
    "export async function barcodeInboundAction",
    "\"inbound_stock_unit\"",
    "create or replace function public.inbound_stock_unit",
    "insert into public.stock_units",
    "insert into public.stock_movements",
    "insert into public.barcode_scan_logs",
    "insert into public.audit_logs",
    "'BARCODE_INBOUND'",
    "'atomic', true",
    "logBarcodeScan(context.supabase",
    "assertActiveItem(context.supabase, parsed.itemId)",
    "Inactive products cannot receive new inbound stock.",
  ],
  "Acceptance 1 inbound scan"
)

includesAll(
  actions + workflowForms + migration053,
  [
    "export async function undoInboundScanAction",
    "\"void_inbound_stock_unit\"",
    "create or replace function public.void_inbound_stock_unit",
    "'VOIDED'",
    "'INBOUND_VOID'",
    "'BARCODE_INBOUND_VOID'",
    "Original inbound movement was not found.",
    "Current inbound session undo",
    "Inbound scan undone. Audit trail kept.",
  ],
  "Acceptance 1b inbound undo audit trail"
)

includesAll(
  actions + workflowForms,
  [
    "const existingUnit = await getUnitByBarcode",
    "if (existingUnit.id)",
    "Barcode already exists in stock.",
    "rejectBarcodeScan(context",
    "isDuplicateInboundBarcode",
    "submitAfterScan && isDuplicateInboundBarcode(value)",
    "Duplicate barcode. Inbound is blocked.",
    "decodeStatus === \"error\"",
  ],
  "Acceptance 2 duplicate inbound"
)

includesAll(
  actions + workflowForms + migration037 + migration050,
  [
    "p_save_weight_rule",
    "insert into public.barcode_weight_rules",
    "update public.barcode_weight_rules",
    "saveWeightRule",
    "applyMatchingWeightRule",
    "barcodeWeightRules",
    "idx_barcode_weight_rules_item_brand_origin",
    "location_id is null",
  ],
  "Acceptance 3 barcode weight rule"
)

includesAll(
  workflowForms +
    unitDetail +
    read("components/stock/stock-label.tsx") +
    read("lib/stock/barcode-label.ts") +
    stockWorkflowRegression,
  [
    "makeInternalBarcode",
    "makeUniqueInternalBarcode",
    "Generate internal label",
    "StockLabelPrintArea",
    "StockLabelPrintActions",
    "50mm x 30mm",
    "Bluetooth label printer",
    "PDF fallback",
    "window.print()",
    "No reason is required.",
    "Generated barcode should be blank when item code is not numeric.",
    "Generated barcode should skip existing labels and use the next serial.",
  ],
  "Acceptance 4 barcode label printing"
)

includesAll(
  actions + workflowForms + migration028 + migration054 + outboundRules + stockWorkflowRegression,
  [
    "export async function confirmOrderOutboundAction",
    "\"confirm_order_outbound_batch\"",
    "assertCustomerOrderReadyForOutbound",
    "Check before confirm",
    "Weight difference is allowed.",
    "Order item checklist",
    "Substitution scanned",
    "Confirm substitution. No reason needed.",
    "requireSubstitutionConfirmation",
    "Customer order must be marked ready before confirming outbound scans.",
    "parseOutboundBarcodes",
    "duplicateOutboundBarcode",
    "missingScannedBarcodes",
    "Barcode not found",
    "Remove barcode not found.",
    "outboundUnitBlockReason",
    "Blocked barcode",
    "cannot be outbounded.",
    "No customer name",
    "No photo",
    "Photo required. Stock goes to approval.",
    "Non-ready orders should be blocked from outbound confirmation.",
    "Outbound batch should detect duplicate scanned barcodes.",
    "Transfer-pending barcode units should show a clear outbound block reason.",
  ],
  "Acceptance 5 order-based outbound"
)

includesAll(
  actions +
    workflowForms +
    migration041 +
    migration047 +
    migration054 +
    migration230002 +
    migration230003 +
    migration230006 +
    data +
    stockPage +
    unitStatusRules +
    stockWorkflowRegression,
  [
    "export async function transferAction",
    "export async function receiveTransferAction",
    "\"transfer_stock_unit\"",
    "\"receive_stock_transfer\"",
    "create or replace function public.transfer_stock_unit",
    "create or replace function public.receive_stock_transfer",
    "is_default_for_outlet",
    "transferDestinationAnyActiveLocation",
    "enforce_default_transfer_destination",
    "Barcode has an open damage request and cannot be outbounded.",
    "Barcode has an open return supplier request and cannot be outbounded.",
    "Destination stock location",
    "Choose destination stock location and scan barcode.",
    "Choose an allowed stock location.",
    "Wrong location. This barcode must be received at",
    "wrongLocationException', false",
    "'atomic', true",
    "\"TRANSFER_PENDING\"",
    "\"TRANSFER_RECEIVED\"",
    "Transfer receive overdue",
    "buildTransferPendingAlerts",
    "sender outlet manager, receiver outlet manager",
    "Alert: sender manager, receiver manager, admin, director.",
    "overdueTransferDays = 3",
    "sameDestinationTransferUnits",
    "Wrong destination",
    "Choose another destination or remove it.",
    "stockableStatuses",
    "INSPECTION",
    "should not be active stock for normal outbound workflows.",
    "movementTypeForOutboundType",
  ],
  "Acceptance 6 transfer and receive"
)

includesAll(
  actions + migration039Maybe() + migration042 + migration054 + approvalRules + stockWorkflowRegression,
  [
    "export async function createDamageRequestAction",
    "export async function reviewDamageRequestAction",
    "export async function approveDamageRequestAction",
    "Damage photo is required.",
    "DAMAGE_SPOILAGE",
    "createDamageRequestForUnit",
    "Only manager-reviewed damage requests can be approved.",
    "\"approve_stock_damage_request\"",
    "OUTBOUND_SPOILED",
    "DIRECTOR_APPROVED",
    "assertDamageCanBeManagerReviewed",
    "damageRejectionSignatureLabel",
    "Submitted damage rejection should require manager signature.",
    "Manager-reviewed damage rejection should require director signature.",
  ],
  "Acceptance 7 damage/spoilage approval"
)

includesAll(
  actions + migration040 + migration042 + migration054 + approvalRules + stockWorkflowRegression,
  [
    "export async function createReturnSupplierRequestAction",
    "export async function approveReturnSupplierRequestAction",
    "export async function rejectReturnSupplierRequestAction",
    "Supplier name is required.",
    "HOLD_RETURN_SUPPLIER",
    "createReturnSupplierRequestForUnit",
    "Only submitted return supplier requests can be approved.",
    "\"approve_stock_return_supplier_request\"",
    "OUTBOUND_RETURN_SUPPLIER",
    "assertReturnSupplierCanBeRejected",
    "Submitted return-supplier requests should be rejectable by manager.",
    "Reviewed return-supplier requests should not be rejected again.",
  ],
  "Return supplier approval"
)

includesAll(
  actions +
    workflowForms +
    migration038 +
    migration043 +
    migration051 +
    migration052 +
    migration055 +
    stockTakeRules +
    stockWorkflowRegression,
  [
    "createStockTakeSessionAction",
    "scanStockTakeBarcodeAction",
    "addStockTakeLineAction",
    "Stock take is barcode scanning only.",
    "Scan at least one barcode before submitting stock take for review.",
    "Scan at least one barcode before approving stock take.",
    "Barcode-only count",
    "reviewStockTakeAction",
    "approveStockTakeAction",
    "\"approve_stock_take_session\"",
    "managerSignature",
    "directorSignature",
    "STOCK_TAKE_ADJUSTMENT",
    "requireStockTakeScopeMatch",
    "Barcode/item does not match this stock take item.",
    "Barcode brand does not match this stock take brand.",
    "Director approval signature is required",
    "Different stock take brand should be blocked.",
    "Auto-created at director approval for missing barcode",
    "Stock take missing barcode adjusted out",
    "barcodeVarianceComputed",
    "UNKNOWN_BARCODE",
    "WRONG_LOCATION",
    "Stock take unknown barcode created after approval",
    "Stock take wrong-location barcode moved after approval",
    "stockTakeExceptionsResolved",
  ],
  "Acceptance 8 stock take approval"
)

includesAll(
  noBarcodeRoute + workflowForms + actions,
  [
    "redirect(\"/stock/inbound\")",
    "No-barcode stock needs a label first",
    "Generate and print a barcode label first",
    "No-barcode inbound is disabled for MVP",
  ],
  "Acceptance 9 no-barcode-to-barcode"
)

includesAll(
  actions + migration048,
  [
    "export async function returnStockAction",
    "\"return_stock_unit\"",
    "create or replace function public.return_stock_unit",
    "status = 'IN_STOCK'",
    "location_id = p_location_id",
    "transfer_to_location_id = null",
    "Barcode is waiting for inspection release",
    "'atomic', true",
  ],
  "Return stock atomic requirements"
)

includesAll(
  stockPage + data + reportExportRules + stockWorkflowRegression,
  [
    "<ReportToolbar",
    "buildCsv",
    "buildStockWhatsappSummary",
    "Stock report CSV should include headers and escape quotes.",
    "WhatsApp summary should include overdue transfer alert count.",
    "Stock by location",
    "Stock by inbound age",
    "Stock movement history",
    "Transfer pending",
    "Old stock 6 months",
    "Barcode scan errors",
    "Today inbound",
    "Today outbound",
    "Damage pending approval",
    "Stock take pending approval",
    "Duplicate scan attempts",
    "Barcode decode errors",
    "sixMonthStockAgeDays",
    "twelveMonthStockAgeDays",
    "Stock take variance",
    "Damage/spoilage",
    "Return supplier",
  ],
  "Acceptance 10 reports/export"
)

includesAll(
  actions + stockPage + migration009 + migration038 + migration041 + migration042 + migration043,
  [
    "assertStockLocationAccess",
    "can_access_stock_location",
    "moduleAccessBlock",
    "stockRouteRoles",
    "Your role cannot",
    "public.can_access_stock_location",
  ],
  "Acceptance 11 role/outlet/location isolation"
)

includesAll(
  data + read("app/(erp)/stock/units/[id]/page.tsx"),
  [
    "Stock data could not load",
    "return supabaseData ?? buildDemoData(filters)",
    "export async function getStockUnitDetailData",
    "const data = await getStockPageData()",
    "data.units.find((candidate) => candidate.id === unitId)",
    "moduleAccessBlock(\"stock\", \"Stock\", stockRoles)",
    "notFound()",
  ],
  "Stock detail and data-loading isolation"
)

includesAll(
  scanner + workflowForms,
  [
    "BrowserMultiFormatReader",
    "facingMode: { ideal: \"environment\" }",
    "getTracks().forEach",
    "track.stop()",
    "Scan Barcode",
    "size=\"lg\"",
    "min-h-11",
    "Manual fallback: type or paste the barcode here.",
    "Recent scans",
    "Allow camera permission to scan.",
    "onChange={(event) => onChange(event.target.value)}",
    "Camera blocked. Allow camera permission or type barcode.",
    "Camera could not start. Type barcode manually.",
  ],
  "Acceptance 12 mobile scanner"
)

includesAll(
  packageJson +
    rlsPolicyCoverage +
    seedCoverage +
    securityCoverage +
    itemMasterCoverage +
    labelCoverage +
    stockTakeLockCoverage +
    reportCoverage,
  [
    "smoke-routes.mjs",
    "stock-workflow-regression.mjs",
    "stock-acceptance-coverage.mjs",
    "stock-state-transition-coverage.mjs",
    "stock-migration-safety.mjs",
    "stock-role-scope-coverage.mjs",
    "stock-scanner-coverage.mjs",
    "stock-rls-policy-coverage.mjs",
    "stock-seed-coverage.mjs",
    "stock-security-coverage.mjs",
    "stock-item-master-coverage.mjs",
    "stock-label-coverage.mjs",
    "stock-take-lock-coverage.mjs",
    "stock-report-coverage.mjs",
    "can_administer_stock()",
    "must not create broad FOR ALL policies",
    "must not grant delete through operator/manager helpers",
    "DMG-SEED-REVIEWED-001",
    "RS-SEED-SUBMITTED-001",
    "ST-SEED-REVIEWED-001",
    "must not reference Supabase service-role credentials",
    "No-barcode inbound action must not create loose no-barcode stock",
    "Item master category-brand-product uniqueness",
    "Item master role policies",
    "Generated barcode helper must not include KG text inside the barcode.",
    "Stock unit label reprint surface",
    "Stock take selected item+brand warning helper",
    "stock-take warning",
    "Stock reports page export surface",
    "Stock report data sources",
  ],
  "Acceptance 13 automated stock workflow tests"
)

includesAll(
  actions + workflowForms + unitStatusRules + migration054,
  [
    "Direct outbound remarks are required.",
    "SAMPLE_TESTING",
    "OUTBOUND_SAMPLE_TESTING",
    "Direct outbound",
    "Damage/spoilage photo is required.",
    "RETURN_SUPPLIER",
    "HOLD_RETURN_SUPPLIER",
    "Barcode has an open damage request and cannot be outbounded.",
    "Barcode has an open return supplier request and cannot be outbounded.",
  ],
  "Direct outbound hardening requirements"
)

includesAll(
  types +
    actions +
    workflowForms +
    migration037 +
    migration044 +
    itemCodeRules +
    stockWorkflowRegression,
  [
    "defaultBrandId",
    "default_brand_id",
    "Item code must be numeric only.",
    "isNumericItemCode",
    "nextItemCode",
    "generatedItemCode",
    "Generated item code should ignore old non-numeric codes",
    "assertUniqueItemCode",
    "items_item_code_numeric_only_check",
    "all erp users can insert item master",
  ],
  "Item master requirements"
)

includesAll(
  types +
    actions +
    workflowForms +
    migration046 +
    migration049 +
    migration050 +
    read("supabase/seed.sql"),
  [
    "\"HOLD\"",
    "\"INSPECTION\"",
    "v_initial_status := case",
    "p_inbound_source = 'customer_return'",
    "export async function releaseInspectionStockAction",
    "\"release_inspection_stock_unit\"",
    "create or replace function public.release_inspection_stock_unit",
    "releaseInspectionSchema",
    "status !== \"INSPECTION\" && status !== \"HOLD\"",
    "STOCK_INSPECTION_RELEASED",
    "Release inspected return",
    "Release to stock",
    "Customer returns go to inspection first.",
    "alter type public.stock_unit_status add value if not exists 'HOLD'",
    "alter type public.stock_unit_status add value if not exists 'INSPECTION'",
    "EM-SEED-RETURN-INSPECTION-001",
    "'INSPECTION'",
    "'customer_return'",
  ],
  "Customer return inspection requirements"
)

function migration039Maybe() {
  return read("supabase/migrations/202606100039_stock_damage_approval_v1.sql")
}

console.log("Stock acceptance coverage checks passed.")
