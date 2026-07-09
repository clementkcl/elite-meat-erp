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
const displayNames = read("lib/stock/display-names.ts")
const rlsPolicyCoverage = read("scripts/stock-rls-policy-coverage.mjs")
const seedCoverage = read("scripts/stock-seed-coverage.mjs")
const securityCoverage = read("scripts/stock-security-coverage.mjs")
const itemMasterCoverage = read("scripts/stock-item-master-coverage.mjs")
const labelCoverage = read("scripts/stock-label-coverage.mjs")
const stockTakeLockCoverage = read("scripts/stock-take-lock-coverage.mjs")
const reportCoverage = read("scripts/stock-report-coverage.mjs")
const migration001 = read("supabase/migrations/202606100001_erp_core_stock_v1.sql")
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
const migration250004 = read("supabase/migrations/202606250004_stock_barcode_rule_sample_v1.sql")
const migration250005 = read("supabase/migrations/202606250005_stock_transfer_worker_flow_v1.sql")
const migration250006 = read("supabase/migrations/202606250006_stock_return_condition_flow_v1.sql")
const migration250007 = read("supabase/migrations/202606250007_stock_scan_issue_context_v1.sql")
const migration250008 = read("supabase/migrations/202606250008_stock_inbound_session_void_rpc_v1.sql")
const migration250009 = read("supabase/migrations/202606250009_stock_scan_issue_review_scope_v1.sql")

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
    "logInboundScanIssueAction",
    "Inbound scan issue logged for manager review.",
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
    "logInboundScanIssue(value, message, \"DUPLICATE_BARCODE\", {",
    "expectedStatus: \"unused barcode\"",
    "isDuplicateInboundBarcode",
    "submitAfterScan && isDuplicateInboundBarcode(value)",
    "Duplicate barcode. Inbound is blocked.",
    "decodeStatus === \"error\"",
  ],
  "Acceptance 2 duplicate inbound"
)

includesAll(
  actions +
    workflowForms +
    migration037 +
    migration050 +
    migration250004 +
    stockWorkflowRegression,
  [
    "p_save_weight_rule",
    "p_barcode_length",
    "p_sample_barcode",
    "barcode_length",
    "sample_barcode",
    "insert into public.barcode_weight_rules",
    "update public.barcode_weight_rules",
    "saveWeightRule",
    "applyMatchingWeightRule",
    "barcodeWeightRules",
    "inferBarcodeWeightRule",
    "currentBarcodeWeightRule.barcodeLength",
    "Learned from sample",
    "Future supplier barcodes should auto-extract weight from the saved position rule.",
    "idx_barcode_weight_rules_item_brand_origin",
    "location_id is null",
  ],
  "Acceptance 3 barcode weight rule"
)

includesAll(
  workflowForms +
    scanner +
    data +
    displayNames +
    stockPage +
    unitDetail +
    reportCoverage +
    actions +
    migration250008,
  [
    "formatProductName(",
    "formatDisplayItemName",
    "formatDefaultDisplayItemName",
    "formatDefaultDisplayItemName(",
    "stockProductName(",
    "stockDisplayItemName(",
    "return stockDisplayItemName(item, brand, \"Unknown product\")",
    "section.toUpperCase() === \"GENERAL\"",
    "name.toLowerCase().startsWith(section.toLowerCase())",
    "formatScanIssueItemName",
    "relatedContext.displayProductName",
    "formData.set(\"displayProductName\", selectedProductDisplayName)",
    "formData.set(\"productName\", stockProductName(selectedItem, \"\"))",
    "formData.set(\"manufacturerName\", selectedManufacturerName)",
    "brandId: parsed.brandId",
    "originId: parsed.originId",
    "selectedManufacturerValue",
    "selectedProductDisplayName",
    "const selectedOriginName =",
    "Origin: {selectedOriginName}",
    "Search manufacturer + product or item code",
    "brands={brands}",
    "item.defaultBrandId",
    "formatProductName(item, itemDefaultBrand)",
    "quickProductNameSuggestion",
    "quickProductCreateManufacturerReady",
    "productSearchHasExactMatch",
    "Use as product:",
    "Product name.",
    "Choose manufacturer before creating product.",
    "Choose manufacturer before creating product.",
    "brandSearchInputRef",
    "focusManufacturerSearch",
    "scrollIntoView({",
    "Choose manufacturer",
    "!quickProductCreateManufacturerReady",
    "data-stock-action=\"manual-product-entry\"",
    "New product",
    "Product not found.",
    "placeholder=\"Product name only\"",
    "const defaultBrandId =",
    "name=\"defaultBrandId\"",
    "name=\"defaultBrandName\"",
    "defaultBrandName: z.string().trim().optional()",
    "resolveNamedRecordId(",
    "brandId: defaultBrandId ?? undefined",
    "const resolvedBrandId = result.brandId ?? null",
    "const resolvedOriginId = result.originId ?? null",
    "preset.brandId === \"__other\" && resolvedBrandId",
    "preset.originId === \"__other\" && resolvedOriginId",
    "current.originId === \"__other\" && resolvedOriginId",
    "brandId: nextBrandId",
    "name=\"brandName\" value={brandName.trim()}",
    "name=\"originName\"",
    "value={originName.trim()}",
    "preset.brandId && preset.brandId !== \"__other\"",
    "preset.originId && preset.originId !== \"__other\"",
    "function applyInboundSetupPreset",
    "setProductQuery(",
    "quickManufacturerNameSuggestion",
    "manufacturerSearchHasExactMatch",
    "data-stock-action=\"manual-manufacturer-entry\"",
    "Manufacturer not found.",
    "Use as manufacturer:",
    "quickOriginNameSuggestion",
    "originSearchHasExactMatch",
    "Use search text as custom origin:",
    "emptyLabel=\"Select manufacturer\"",
    "customLabel=\"Other / custom manufacturer\"",
    "guided-inbound-flow",
    "data-stock-action=\"guided-inbound-page-cue\"",
    "Page {inboundPageNumber}/{visibleInboundSteps.length}",
    "Session Setup",
    "Barcode Rule",
    "Scanner",
    "Manual Weight Entry",
    "Session Summary",
    "data-stock-action=\"read-only-inbound-session-code\"",
    "Inbound session code",
    "Auto code.",
    "data-stock-action=\"guided-inbound-submit-context\"",
    "name=\"itemId\" value={preset.itemId}",
    "name=\"brandId\" value={preset.brandId}",
    "name=\"originId\" value={preset.originId}",
    "name=\"locationId\" value={preset.locationId}",
    "name=\"batchNo\" value={batchNo}",
    "data-stock-action=\"read-only-inbound-setup-review\"",
    "Setup locked. Finish or delete this session to change setup.",
    "Review setup (read-only)",
    "Recent inbound templates",
    "originName:",
    "Tap recent product.",
    "itemId: \"\"",
    "activeItemIds.has(preset.itemId) ? preset.itemId : \"\"",
    "Choose a product or tap a recent template before scanning.",
    "\"No product selected\"",
    "1 Setup",
    "2 Barcode Rule",
    "2 Manual Weight",
    "3 Scan",
    "4 Summary",
    "data-stock-action=\"current-scan-preset-card\"",
    "inboundStep === \"scan\" || inboundStep === \"manual\"",
    "Current scan preset",
    "Display name",
    "Product: {selectedProductName}",
    "Manufacturer: {selectedManufacturerName}",
    "Sample barcode",
    "Scan sample, enter kg.",
    "Learning barcode rule",
    "Barcode rule setup",
    "Manufacturer:",
    "Display name:",
    "data-stock-action=\"barcode-rule-scope-cue\"",
    "Rule is for this product, manufacturer, and origin only.",
    "Weight start position",
    "Weight digits",
    "Weight decimals",
    "data-stock-action=\"barcode-rule-fields-panel\"",
    "Extracted weight preview",
    "ruleExtractedPreviewWeightKg",
    "data-stock-action=\"barcode-rule-save-summary\"",
    "Rule values to save",
    "ruleSaveSummaryRows.map",
    "[\"Display product\", selectedProductDisplayName]",
    "[\"Product\", selectedProductName]",
    "[\"Manufacturer\", selectedManufacturerName]",
    "[\"Origin\", selectedOriginName]",
    "[\"Sample barcode\", barcode.trim() || \"-\"]",
    "[\"Barcode length\", barcode.trim() ? String(barcode.trim().length) : \"-\"]",
    "showDetectedRulePreview",
    "data-stock-action=\"detected-barcode-rule-preview\"",
    "Detected barcode rule",
    "Sample length:",
    "Weight digits:",
    "Save first barcode. Rule reused.",
    "mustSaveCurrentRule",
    "Save weight rule for first scan",
    "Save first barcode + rule",
    "inboundStep !== \"rule\" || !canUseBarcodeRuleForSession",
    "Save rule first",
    "disabled={!scanSetupReady || !canUseBarcodeRuleForSession}",
    "sessionBarcodeRuleSaved",
    "sessionBarcodeRuleLength",
    "!canUseBarcodeRuleForSession &&",
    "saveWeightRule: false",
    "name=\"barcodeWeightStart\"",
    "value={preset.barcodeWeightStart}",
    "name=\"barcodeWeightLength\"",
    "value={preset.barcodeWeightLength}",
    "name=\"barcodeWeightDecimals\"",
    "value={preset.barcodeWeightDecimals}",
    "data-stock-action=\"locked-barcode-rule-fields\"",
    "Rule locked. Start new session to change rule.",
    "disabled={scopeLocked}",
    "disabled={mustSaveCurrentRule || scopeLocked}",
    "Rule saved. ${savedWeightText} saved.",
    "${savedWeightText} saved.",
    "Rule saved for this session",
    "Barcode length is different from saved rule.",
    "const lengthWarning = inboundBarcodeLengthWarning(value)",
    "logInboundScanIssue(value, lengthWarning, \"BARCODE_LENGTH_MISMATCH\", {",
    "Check barcode, then press Save inbound only if correct.",
    "No weight position found. Use internal label.",
    "data-stock-action=\"rule-page-internal-label-escape\"",
    "No weight? Use labels.",
    "No weight? Use labels.",
    "switchInboundMode(\"internal_label\")",
    "No rule? Use labels.",
    "data-stock-action=\"internal-label-fallback-cue\"",
    "Enter kg, save, print label.",
    "!manualMode ? (",
    "continuousScan",
    "data-stock-action=\"scanner-popup-external-input\"",
    "External scanner input",
    "Enter sends scan{continuous ? \". Stays ready.\" : \".\"}",
    "const barcodeScannerVisible =",
    "inboundStep === \"manual\" && Boolean(pendingInternalLabel)",
    "Continuous scan is on.",
    "Saving ${decoded.weightKg} kg.",
    "Weight saves label.",
    "pendingLabelRef.current = nextLabel",
    "pendingInternalLabelRef.current && pendingLabelRef.current",
    "Manual label inbound",
    "data-stock-action=\"manual-label-next-unit\"",
    "Enter next unit",
    "Setup locked. Save, print, attach.",
    "<OfflineScanAlert className=\"border-red-300 bg-red-50\" />",
    "event.key !== \"Enter\"",
    "External scanner: scan into this box.",
    "Continuous scan is on.",
    "Previous scan",
    "manualMode ? \"Previous entered weight\" : \"Previous scan\"",
    "inboundScannerContextSummary",
    "scanContextSummary={inboundScannerContextSummary}",
    "Current inbound setup",
    "`Batch: ${batchNo}`",
    "`Display product: ${selectedProductDisplayName}`",
    "`Product: ${selectedProductName}`",
    "`Manufacturer: ${selectedManufacturerName}`",
    "`Origin: ${selectedOriginName}`",
    "whitespace-pre-line break-words",
    "inboundScanSummary",
    "scanSummary={inboundScanSummary}",
    "const inboundScanUnitLabel =",
    "inboundMode === \"internal_label\" ? \"saved unit\" : \"saved scan\"",
    "inboundScanTotalSummary",
    "scanTotalSummary={inboundScanTotalSummary}",
    "scanFeedbackMessage={decodeMessage}",
    "scanFeedbackStatus={decodeStatus}",
    "data-stock-action=\"scanner-live-scan-feedback\"",
    "scanActionSlot={",
    "function undoLatestInboundScan",
    "const inboundUndoEntryLabel =",
    "inboundMode === \"internal_label\" ? \"unit\" : \"scan\"",
    "setLatestScanUndoMessage(inboundUndoSuccessMessage)",
    "Last saved item and weight",
    "Inbound session total",
    "Undo Last Scan",
    "Back to Barcode Rule",
    "inboundStep === \"rule\"",
    "Back to setup",
    "onClick={() => goInboundStep(\"rule\")}",
    "onClick={() => goInboundStep(\"setup\")}",
    "const scopeLockedReason = sessionFinishedAt",
    "Session finished. Start new session to change setup.",
    "data-stock-action=\"finished-inbound-scan-stop\"",
    "Session finished. Review only.",
    "recentInboundWeightKg.toFixed(3)",
    "Inbound session summary",
    "Inbound mode:",
    "manualMode ? \"Inbound without Barcode\" : \"Inbound with Barcode\"",
    "manualMode ? \"Total count\" : \"Total barcode units\"",
    "const wholeSessionVoided =",
    "const voidedSessionScans = recentLabels.filter(",
    "voidedSessionScans.length > 0",
    "Session undone. Stock units were voided.",
    "disabled={wholeSessionVoided}",
    "const inboundSummaryNextAction = manualMode",
    "Print labels.",
    "Move stock when ready.",
    "Next: {inboundSummaryNextAction}",
    "data-stock-action=\"future-session-summary-print-area\"",
    "Print summary",
    "data-stock-action=\"inbound-session-print-summary-fields\"",
    "sessionSummaryPrintRows.map",
    "[\"Display product\", selectedProductDisplayName]",
    "[\"Product\", selectedProductName]",
    "[\"Manufacturer\", selectedManufacturerName]",
    "[\"Total weight\", `${recentInboundWeightKg.toFixed(3)} kg`]",
    "Print or save PDF.",
    "Compact list.",
    "data-stock-action=\"inbound-session-summary-saved-list\"",
    "Saved barcodes in this session",
    "Saved units in this session",
    "savedSessionScans.slice(0, 8).map",
    "Compact list.",
    "Full audit kept.",
    "Scanned by: {label.scannedBy}",
    "data-stock-action=\"inbound-session-summary-error-list\"",
    "Duplicate/error scans in this session",
    "data-stock-action=\"inbound-summary-print-labels-pdf-area\"",
    "Print Labels PDF",
    "} ready.",
    "data-stock-action=\"print-inbound-session-summary\"",
    "Print Session Summary",
    "data-stock-action=\"inbound-summary-action-grid\"",
    "xl:grid-cols-6",
    "data-stock-action=\"review-barcode-rule-from-summary\"",
    "Review Barcode Rule",
    "Review setup",
    "Review {manualMode ? \"Manual Weight\" : \"Scanner\"}",
    "Delete Whole Session",
    "wholeSessionUndoConfirmOpen",
    "data-stock-action=\"whole-session-undo-confirmation\"",
    "Confirm manager-approved Delete Whole Session",
    "kg) for {batchNo}. Audit kept.",
    "Manager approval required. Audit kept.",
    "Delete Whole Session",
    "Keep session",
    "undoInboundSessionAction",
    "[...stockManagerRoles, \"director\"]",
    "\"void_inbound_stock_session\"",
    "create or replace function public.void_inbound_stock_session",
    "BARCODE_INBOUND_SESSION_VOID",
    "'INBOUND_VOID'::public.stock_movement_type",
    "'atomicSessionUndo', true",
    "finishBlockedByPendingLabel",
    "Label generated. Saving stock now.",
    "finishBlockedByNoSavedScan",
    "const finishBlockedNoSavedMessage = inboundMode === \"internal_label\"",
    "Save at least one barcode before finishing this session.",
    "Save at least one unit before finishing this session.",
    "Label generated. Saving stock now.",
    "function clearInboundDraftScan",
    "clearInboundDraftScan()",
    "if (scopeKeyChanged) {\n      clearInboundDraftScan()",
    "function applyInboundTemplate",
    "clearInboundDraftScan()\n    setPreset(next)",
    "function startNewInboundSession",
    "onClick={startNewInboundSession}",
    "setBatchNo(generateInboundBatchNo())",
    "data-stock-action=\"new-inbound-session-ready-cue\"",
    "New inbound session ready. Kept setup:",
    "New inbound session ready. Choose setup.",
    "function switchInboundMode",
    "switchInboundMode(\"supplier_barcode\")",
    "switchInboundMode(\"internal_label\")",
    "setBarcode(\"\")",
    "setNetWeightKg(\"\")",
    "setPendingInternalLabel(null)",
    "pendingLabelRef.current = null",
    "pendingInternalLabelRef.current = true",
    "Enter weight, save stock, then print label.",
    "if (!scanSetupReady || !selectedItem)",
    "!scanSetupReady",
    "savedSessionScans.length === 0",
    "setPendingInternalLabel(null)",
    "pendingInternalLabelRef.current = false",
    "lastErrorMessageRef.current = \"\"",
    "loggedInboundIssueKeysRef.current.clear()",
    "data-stock-action=\"sticky-inbound-active-session-summary\"",
    "sticky top-2 z-20",
    "mt-1 break-all font-mono text-xs text-emerald-800",
    "mt-1 grid gap-1 text-xs text-emerald-800 sm:grid-cols-2",
    "Product: {selectedProductName}",
    "Manufacturer: {selectedManufacturerName}",
    "manualMode ? \"Enter one unit weight kg\" : \"Net weight kg\"",
    "Enter kg. Press Enter.",
    "Enter saves next weight.",
    "mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start",
    "After save, next weight.",
    "setBarcode(\"\")\n        setNetWeightKg(\"\")",
    "setNetWeightKg(\"\")",
    "Saved. Enter next weight.",
    "netWeightInputRef.current?.focus()",
    "manualMode ? \"Recent saved labels\" : \"Recent inbound scans\"",
    "inboundMode === \"internal_label\"",
    "Barcode labels already attached.",
    "manualMode && label.status === \"SAVED\"",
    "Ready. Enter weight.",
    "setInboundStep(\"manual\")",
    "function handleNetWeightKeyDown",
    "event.key !== \"Enter\" || inboundStep !== \"manual\"",
    "Enter kg. Press Enter.",
    "Stock balance",
    "brandName",
  ],
  "Acceptance 3b guided inbound goal coverage"
)

assert(
  !workflowForms.includes("continuousScan={inboundStep !== \"rule\"}"),
  "Inbound scanner popup must stay open on the barcode-rule page until Close."
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
    "Bluetooth first. PDF fallback.",
    "PDF fallback",
    "window.print()",
    "No reason needed.",
    "Generated barcode should be blank when session code has no digits.",
    "Generated barcode should skip existing labels and use the next serial.",
  ],
  "Acceptance 4 barcode label printing"
)

includesAll(
  actions + workflowForms + migration028 + migration054 + outboundRules + stockWorkflowRegression,
  [
    "export async function confirmDirectOutboundAction",
    "Outbound Without Order",
    'name="outboundMode" value="DIRECT"',
    "parseOutboundBarcodes",
    "duplicateOutboundBarcode",
    "missingScannedBarcodes",
    "Barcode not found",
    "Barcode not found.",
    "Remove barcode not found.",
    "directOutboundUnitBlockReason",
    "Wrong location. Use stock from",
    "Barcode is ${unit.status}.",
    "outboundUnitBlockReason",
    "Blocked barcode",
    "cannot be outbounded.",
    "Choose customer",
    "Choose customer before scanning.",
    "Choose customer first, then scan sales stock.",
    "getOutboundCustomerName",
    "parsed.outboundType === \"SALES\" && !parsed.customerId",
    "Choose customer before scanning sales outbound.",
    "onScan={(value) => addBarcode(value)}",
    "No photo",
    "Photo required. Request only; stock is not deducted now.",
    "Outbound batch should detect duplicate scanned barcodes.",
    "Transfer-pending barcode units should show a clear outbound block reason.",
  ],
  "Acceptance 5 direct outbound without order"
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
    migration250005 +
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
    "Confirm transfer sets stock to In Transfer.",
    "Duplicate barcode. Transfer is blocked.",
    "Wrong source. Use stock from",
    "Choose an allowed stock location.",
    "Wrong location. This barcode must be received at",
    "wrongLocationException', false",
    "'atomic', true",
    "transferToLocationId",
    "Pending to this location",
    "Showing pending transfers for your receiving location only.",
    "unit.transferToLocationId === receiveLocationId",
    "\"TRANSFER_PENDING\"",
    "\"TRANSFER_RECEIVED\"",
    "expectedBarcode",
    "Unexpected barcode. Scan the selected transfer barcode.",
    "Tap pending transfer card first.",
    "All visible expected transfer barcodes are received.",
    "Missing transfer barcodes stay pending for manager review.",
    "status = 'IN_STOCK'",
    "Barcode is % and cannot be transferred.",
    "Transfer receive overdue",
    "buildTransferPendingAlerts",
    "sender outlet manager, receiver outlet manager",
    "Alert: sender manager, receiver manager, admin, director.",
    "overdueTransferDays = 3",
    "sameDestinationTransferUnits",
    "Wrong destination",
    "Choose another destination or remove it from scanned list.",
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
    "Pending stock take exceptions",
    "Review these before final approval.",
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
  actions + migration048 + migration250006 + workflowForms,
  [
    "export async function returnStockAction",
    "\"return_stock_unit\"",
    "create or replace function public.return_stock_unit",
    "returnCondition",
    "Return condition:",
    "p_return_condition",
    "NEED_CHECK",
    "SPOILED_DAMAGED",
    "next_status := case p_return_condition",
    "status = next_status",
    "Return condition: Good -> Available",
    "Return condition: Need Check -> Hold",
    "Return condition: Spoiled / Damaged -> Spoiled",
    "Return saved on hold for manager check.",
    "Spoiled/damaged return saved for manager review.",
    "manager review issue",
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
    "Scan issues for review",
    "log.issueType",
    "reviewStatus === \"OPEN\"",
    "Manager scan issue review",
    "reviewStockScanIssueFormAction",
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
  actions +
    stockPage +
    data +
    workflowForms +
    migration001 +
    migration250007 +
    migration250009,
  [
    "add column if not exists issue_type text",
    "review_status text not null default 'OPEN'",
    "related_context jsonb not null default '{}'::jsonb",
    "created_at timestamptz not null default now()",
    "createdAt: log.createdAt",
    "scanned_by",
    "const scanAlerts: StockScanAlert[] = failedScanLogs",
    "throw new Error(fallbackError.message)",
    "throw new Error(error.message)",
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
    "logStockScanIssueAction",
    "assertStockIssueLocationAccess(context.profile",
    "locationIds.some((locationId) =>",
    "Your role cannot log stock issue for another location.",
    "logWorkerScanIssue",
    "scanIssueReviewSchema",
    "review_status: parsed.reviewStatus",
    "review_note: parsed.reviewNote ?? null",
    "reviewed_by: context.profile.id",
    "reviewed_at: new Date().toISOString()",
    ".select(\"id\")",
    "Issue was not updated. It may already be reviewed or outside your stock location.",
    "public.can_manage_stock_take()",
    "public.can_access_stock_location(expected_location_id)",
    "public.can_access_stock_location(scanned_location_id)",
    "logInboundScanIssue(value, message, \"DUPLICATE_BARCODE\", {",
    "expectedStatus: \"unused barcode\"",
    "logInboundScanIssue(value, lengthWarning, \"BARCODE_LENGTH_MISMATCH\", {",
    "No weight position found. Use internal label.",
    "logInboundScanIssue(\n          barcode,\n          message,\n          \"BARCODE_RULE_DETECTION_FAILURE\"",
    "loggedOutboundIssueKeysRef",
    "relatedCustomerId: customerId || null",
    "loggedTransferIssueKeysRef",
    "loggedReceiveIssueKeysRef",
    "loggedReturnIssueKeysRef",
    "directOutboundIssueActions",
    "function inferStockIssueType",
    "Barcode length is different from saved rule",
    "Barcode not found.",
    "Wrong location. Use stock from",
    "Barcode is ${unit.status} and cannot be returned.",
    "Spoiled/damaged return needs manager review.",
    "returnCondition: parsed.returnCondition",
    "Missing transfer item still pending.",
    "Unexpected barcode. Scan the selected transfer barcode.",
    "receiveBarcodeIssueDetails",
    "loggedReceiveIssueKeysRef",
    "relatedTransferId: selectedReceiveBarcode",
    "relatedTransferId: selectedReceiveBarcode || null,",
    "expectedBarcode: selectedReceiveBarcode || null",
    "receivedBarcode: nextBarcode",
    "Damage request submitted for manager review",
    "Stock take unknown barcode exception recorded for approval.",
    "Stock take mismatch submitted for manager review.",
    "mismatchType: \"missing_expected_barcode\"",
    "Open scan and stock workflow issues awaiting review",
    "expectedStatus: \"same source location\"",
    "expectedStatus: \"different destination\"",
    "expectedStatus: \"selected transfer barcode\"",
    "expectedStatus: \"TRANSFER_PENDING\"",
    "expectedStatus: \"returnable stock\"",
    "expectedStatus: \"INSPECTION or HOLD\"",
    "expectedStatus: \"DRAFT\"",
    "expectedStatus: \"active stock\"",
    "reviewStockScanIssueAction",
    "Mark corrected",
    "itemName: log.itemId",
    "expectedLocationName",
    "All open issue types are shown",
    "formatIssueContext(alert.relatedContext)",
    "export async function logInboundScanIssueAction",
    "export async function logStockScanIssueAction",
    "export async function confirmDirectOutboundAction",
    "export async function transferAction",
    "export async function receiveTransferAction",
    "export async function returnStockAction",
    "export async function scanStockTakeBarcodeAction",
    "async function createDamageRequestForUnit",
    "Stock take unknown barcode exception recorded for approval.",
    "Stock take wrong-location exception recorded for approval",
    "Stock take mismatch submitted for manager review.",
    "Missing transfer item still pending.",
    "Unexpected barcode. Scan the selected transfer barcode.",
    "Spoiled/damaged return needs manager review.",
    "Damage request submitted for manager review",
    "sessionId: input.relatedSessionId",
    "orderId: input.relatedOrderId",
    "customerId: input.relatedCustomerId",
    "transferId: input.relatedTransferId",
  ],
  "Stock issue auto-create and manager review"
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
    "Type barcode if needed.",
    "Recent scans",
    "Allow camera. Use manual if blocked.",
    "onChange={(event) => onChange(event.target.value)}",
    "Camera blocked. Allow camera or use manual.",
    "Camera could not start. Use manual entry.",
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
