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

const workflowForms = read("components/stock/workflow-forms.tsx")
const scanner = read("components/stock/barcode-scanner.tsx")
const displayNames = read("lib/stock/display-names.ts")
const data = read("lib/stock/data.ts")
const label = read("components/stock/stock-label.tsx")
const stockPage = read("components/stock/stock-page.tsx")
const actions = read("lib/stock/actions.ts")
const actionState = read("lib/stock/action-state.ts")
const inboundRpc = read("supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql")
const inboundRuleSampleRpc = read(
  "supabase/migrations/202606250004_stock_barcode_rule_sample_v1.sql"
)
const undoRpc = read("supabase/migrations/202606250008_stock_inbound_session_void_rpc_v1.sql")

includesAll(
  workflowForms,
  [
    "type InboundSessionHistory =",
    "const inboundSessionDraftKey = \"elite-meat:stock-inbound-session-draft\"",
    "type InboundSessionDraft =",
    "function readInboundSessionDraft()",
    "return readInboundSessionDraft()",
    "function inboundLabelsForBatch",
    "inboundLabelsForBatch(",
    "setRecentLabels((current) => [savedLabel, ...current])",
    "const hasReadyDraftSetup = Boolean(",
    "preset.brandId !== \"__other\"",
    "preset.originId !== \"__other\"",
    "sessionFinishedAt || !hasReadyDraftSetup",
    "window.localStorage.setItem(\n        inboundSessionDraftKey",
    "window.localStorage.removeItem(inboundSessionDraftKey)",
    "function buildInboundSessionHistory",
    "voidedCount: number",
    "unit.status === \"VOIDED\"",
    "const [sessionHistoryPage, setSessionHistoryPage] = useState(1)",
    "const historyPageSize = 10",
    "data-stock-action=\"inbound-session-history\"",
    "Inbound Session History",
    "10 per page.",
    "Start new session",
    "data-stock-action=\"continue-current-inbound-session\"",
    "scanSetupReady || recentLabels.length > 0",
    "Current unfinished session",
    "manualMode || canUseBarcodeRuleForSession",
    "? activeScanStep",
    ": \"rule\"",
    "Continue unfinished session",
    "function applyInboundHistorySetup",
    "data-stock-action=\"use-inbound-history-setup\"",
    "Use same setup",
    "setBatchNo(generateInboundBatchNo())",
    "New session ready: ${session.displayName}.",
    "View details",
    "data-stock-action=\"inbound-session-history-details\"",
    "voided kept for audit",
    "Saved: {session.count}",
    "Voided: {session.voidedCount}",
    "session.barcodes.slice(0, 20).join",
    "Showing latest 20 barcodes.",
    "No previous inbound sessions yet.",
    "Page {boundedHistoryPage} / {historyPageCount}",
    "recentLabels.slice(0, 12).map",
    "Showing latest 12. Totals include all.",
  ],
  "Inbound session history"
)

const inboundLabelsStart = workflowForms.indexOf("function inboundLabelsForBatch")
const inboundLabelsEnd = workflowForms.indexOf(
  "export function BarcodeInboundForm",
  inboundLabelsStart
)
assert(inboundLabelsStart >= 0, "inboundLabelsForBatch function missing")
assert(inboundLabelsEnd > inboundLabelsStart, "inboundLabelsForBatch boundary missing")
assert(
  !workflowForms.slice(inboundLabelsStart, inboundLabelsEnd).includes(".slice(0, 12)"),
  "Current-session labels must not be capped before totals/printing."
)

const historyBuildStart = workflowForms.indexOf("function buildInboundSessionHistory")
const historyBuildEnd = workflowForms.indexOf("function formatProductName", historyBuildStart)
assert(historyBuildStart >= 0, "buildInboundSessionHistory function missing")
assert(historyBuildEnd > historyBuildStart, "buildInboundSessionHistory boundary missing")
assert(
  !workflowForms.slice(historyBuildStart, historyBuildEnd).includes(".slice(0, 8)"),
  "Inbound session history details must not cap barcode data before rendering."
)

const historySetupStart = workflowForms.indexOf(
  "function applyInboundHistorySetup"
)
const historySetupEnd = workflowForms.indexOf(
  "return (",
  historySetupStart
)
assert(historySetupStart >= 0, "applyInboundHistorySetup function missing")
assert(historySetupEnd > historySetupStart, "applyInboundHistorySetup boundary missing")
includesAll(
  workflowForms.slice(historySetupStart, historySetupEnd),
  [
    "normalizeInboundPreset(",
    "localItems",
    "locations",
    "localBrands",
    "origins",
    "defaultLocationId",
  ],
  "Inbound history setup normalization"
)

includesAll(
  workflowForms,
  [
    'type InboundStep = "setup" | "rule" | "scan" | "manual" | "summary"',
    'inboundMode === "internal_label"\n      ? ["setup", "manual", "summary"]',
    ': ["setup", "rule", "scan", "summary"]',
    "const inboundStepLabel = (step: InboundStep) =>",
    "scopeLocked && step === \"setup\"",
    "Review Setup",
    "scopeLocked && step === \"rule\"",
    "Review Barcode Rule",
    "sessionFinishedAt && step === activeScanStep",
    "Review Manual Weight",
    "Review Scanner",
    'step === "summary" && inboundMode === "internal_label"',
    'return "3 Summary"',
    "Session Setup",
    "Barcode Rule",
    "Scanner",
    "Manual Weight Entry",
    "Session Summary",
    "data-stock-action=\"guided-inbound-page-cue\"",
    "Page {inboundPageNumber}/{visibleInboundSteps.length}",
    "onClick={() => goInboundStep(step)}",
    "const hasSavedSessionEntries = savedSessionScans.length > 0",
    "Saved stock exists. Finish or Delete Whole Session.",
    "setupChangeProtectionMessage =",
    "Review only. Finish or Delete Whole Session to change.",
    "data-stock-action=\"safe-back-review-warning\"",
    "Review only. Saved entries stay. Setup is locked.",
    "Scan or cancel pending label first.",
    "Back to setup",
    "Back to Barcode Rule",
    "Review setup",
    "Review setup (read-only)",
    "Set barcode rule before opening scanner.",
    "(inboundMode === \"supplier_barcode\" &&\n                      !canUseBarcodeRuleForSession)",
    "const inboundCardTitle = manualMode",
    "Inbound without Barcode",
    "Inbound with Barcode",
    "const inboundCardDescription = manualMode",
    "Choose setup once, then enter weights.",
    "Choose setup once, then scan barcodes.",
    "Review session.",
    "const summaryStepLockedMessage =",
    "Tap Finish Session to open summary.",
    "Save at least one unit before summary.",
    "Save at least one barcode before summary.",
    "data-stock-action=\"inbound-summary-locked-cue\"",
    "{summaryStepLockedMessage}",
  ],
  "Guided inbound page flow"
)

includesAll(
  workflowForms,
  [
    "data-stock-action=\"read-only-inbound-session-code\"",
    "Inbound session code",
    "Auto code.",
    "function compareText(a: string, b: string)",
    "a.localeCompare(b, undefined, { sensitivity: \"base\" })",
    "const quickInboundItems = filteredItems",
    "return compareText(aName, bName)",
    ".sort((a, b) => compareText(a.name, b.name))",
    "data-stock-action=\"read-only-inbound-setup-review\"",
    "{scopeLockedReason}",
    "data-stock-action=\"inbound-session-change-protection-warning\"",
    "{setupChangeProtectionMessage}",
    "data-stock-action=\"finish-current-session-before-setup-change\"",
    "Finish current session",
    "onClick={finishInboundSession}",
    "data-stock-action=\"review-delete-whole-session-from-locked-setup\"",
    "Review summary or delete whole session",
    "Recent inbound templates",
    "function applyInboundTemplate",
    "setInboundStep(template.hasRule ? \"scan\" : \"rule\")",
    "manufacturerName: string",
    "setBrandQuery(template.manufacturerName)",
    "setOriginQuery(template.originName)",
    "setBrandName(\"\")",
    "setOriginName(\"\")",
    "data-stock-action=\"recent-inbound-template-card\"",
    "data-stock-action=\"inbound-mode-guidance\"",
    "Inbound with Barcode",
    "Inbound without Barcode",
    "Mode: scan barcodes",
    "Mode: enter weights",
    "data-stock-action=\"inbound-page-one-required-setup\"",
    "Page 1: Inbound without barcode setup",
    "Page 1 required setup",
    "setupLocationId",
    "Inbound location",
    "name=\"locationId\"",
    "data-stock-action=\"page-one-generated-display-name\"",
    "Display name",
    "Product: {selectedProductName}",
    "Manufacturer: {selectedManufacturerName}",
    "setInboundStep(\"manual\")",
    "Using location:",
    "Profile default.",
    "Change Location",
    "Next: Barcode Rule Page",
    "next.brandId !== \"__other\"",
    "(next.originId !== \"__other\" || originName.trim())",
    "if (nextBrandId === \"__other\")",
    "if (!brandName.trim() && brandQuery.trim())",
    "setBrandName(brandQuery.trim())",
    "if (nextOriginId === \"__other\")",
    "if (!originName.trim() && originQuery.trim())",
    "setOriginName(originQuery.trim())",
  ],
  "Session setup"
)

includesAll(
  workflowForms + displayNames + data + stockPage + actions + actionState,
  [
    "stockProductName(",
    "stockDisplayItemName(",
    "return `${manufacturerName} ${productName}`",
    "function formatProductName(",
    "const typedProductName =",
    "? `${selectedManufacturerValue} ${typedProductName}`",
    "const productName = stockProductName(item, \"\")",
    "function canonicalUiName(value: string)",
    "canonicalUiName(productName) ===",
    "canonicalUiName(displayName) ===",
    "canonicalUiName(brand.name) ===",
    "canonicalUiName(origin.name) ===",
    "const productSearchQuery = canonicalUiName(productQuery)",
    "const searchableText = [",
    "return canonicalUiName(searchableText).includes(productSearchQuery)",
    "canonicalUiName(brand.name).includes(query)",
    "canonicalUiName(origin.name).includes(query)",
    "selectedProductDisplayName",
    "selectedManufacturerName",
    "Product name.",
    "Choose manufacturer before creating product.",
    "function normalizeSpacing(",
    "function canonicalLookupName(",
    "async function findNamedRecordId(",
    "async function assertUniqueProductManufacturer(",
    "Product already exists for this manufacturer. Select the existing product instead.",
    "const productName = normalizeProductField(parsed.name)",
    "name: productName",
    "normalizeOptionalName(customName)",
    "const defaultBrand = item.defaultBrandId",
    "formatProductName(item, defaultBrand)",
    "}, [items, brands, editItemQuery])",
    "}, [items, brands, createItemQuery])",
    "ItemSelect",
    "BrandSelect",
    "{item.itemCode} / {item.category} / {item.section} / {displayName}",
    "allowOther",
    "data-stock-action=\"manual-product-entry\"",
    "Save product now",
    "const resolvedBrandName = result.brandName ?? selectedManufacturerValue",
    "displayName: resolvedBrandName",
    "setBrandQuery(resolvedBrandName)",
    "data-stock-action=\"manual-manufacturer-entry\"",
    "data-stock-action=\"inbound-save-custom-manufacturer\"",
    "data-stock-action=\"custom-manufacturer-save-required\"",
    "Save manufacturer before scanning.",
    "createInboundBrandAction",
    "useActionState(quickBrandCreateFormAction, initialStockActionState)",
    "async function quickBrandCreateFormAction",
    "formAction={quickBrandCreateAction}",
    "formNoValidate",
    "Save manufacturer now",
    "brandName?: string",
    "brandName:",
    "result.brandName ??",
    "setLocalBrands((current) =>",
    "brandId: result.brandId",
    "setBrandQuery(savedName)",
    "setBrandName(\"\")",
    "const inboundBrandSchema = z.object({",
    "export async function createInboundBrandAction",
    "return runStockAction(formData, stockOperatorRoles",
    "Manufacturer already saved.",
    "INBOUND_BRAND_CREATED",
    "formData.set(\"productName\", stockProductName(selectedItem, \"\"))",
    "formData.set(\"manufacturerName\", selectedManufacturerName)",
    "formData.set(\"displayProductName\", selectedProductDisplayName)",
    "relatedContext.displayProductName",
    "data-stock-action=\"current-scan-preset-card\"",
    "inboundStep === \"scan\" || inboundStep === \"manual\"",
    "? \"hidden\"",
    "data-stock-action=\"generated-display-name-preview\"",
    "Display name",
    "Manufacturer + product.",
    "itemName: unit ? formatDisplayItemName(item, brand) : \"-\"",
    "const displayBrandId =",
    "linkedUnit?.brandId ?? readNullableString(row.brand_id)",
    "const brand = brands.find((candidate) => candidate.id === displayBrandId)",
    "function stockUnitLabel(unit: StockUnit, items: Item[], brands: Brand[])",
    "const brand = brands.find((candidate) => candidate.id === unit.brandId)",
    "return stockDisplayItemName(item, brand, \"Unknown product\")",
    "stockUnitLabel(previousOutboundScan.unit, items, brands)",
    "stockUnitLabel(row.unit, items, brands)",
    "stockUnitLabel(currentReturnUnit, items, brands)",
    "stockDisplayItemName(\n                            scopedItem,\n                            scopedBrand,\n                            \"Unknown product\"\n                          )",
    "report.itemName.toLowerCase().includes(item)",
    "report.brandName.toLowerCase().includes(brand)",
    "report.originName.toLowerCase().includes(origin)",
    "{ key: \"itemName\", header: \"Product\" }",
    "{ key: \"brandName\", header: \"Manufacturer\" }",
    "{ key: \"originName\", header: \"Origin\" }",
  ],
  "Manufacturer and product display-name contract"
)

includesAll(
  workflowForms + actions + inboundRpc + inboundRuleSampleRpc,
  [
    "Sample barcode",
    "Scan sample, enter kg.",
    "data-stock-action=\"barcode-rule-selected-product-top\"",
    "Selected product and manufacturer",
    "data-stock-action=\"barcode-rule-input-methods\"",
    "Camera scanner",
    "Handheld scanner + Enter",
    "Manual typing fallback",
    "Weight start position",
    "Weight digits",
    "Weight decimals",
    "data-stock-action=\"barcode-rule-decimal-buttons\"",
    "className=\"grid gap-2 sm:grid-cols-3\"",
    "[\"1\", \"0.1\"]",
    "[\"2\", \"0.01\"]",
    "[\"3\", \"0.001\"]",
    "data-stock-action=\"fixed-weight-fallback-checkbox\"",
    "Use fixed-weight fallback",
    "const selectedItemDefaultWeightKg =",
    "selectedItem.defaultWeightKg.toFixed(3)",
    "preset.fixedWeightKg.trim() ||\n    selectedItemDefaultWeightKg",
    "const canToggleFixedWeightFallback = Boolean(fixedWeightFallbackValue)",
    "disabled={scopeLocked || !canToggleFixedWeightFallback}",
    "Set default fixed kg first.",
    "const rulePreviewInvalid =",
    "data-stock-action=\"rule-extracted-weight-preview\"",
    "Extracted weight preview",
    "ruleExtractedPreviewWeightKg",
    "No valid weight extracted. Adjust rule or use Inbound without",
    "Inbound without",
    "data-stock-action=\"barcode-rule-save-summary\"",
    "Rule values to save",
    "[\"Display product\", selectedProductDisplayName]",
    "[\"Product\", selectedProductName]",
    "[\"Manufacturer\", selectedManufacturerName]",
    "[\"Origin\", selectedOriginName]",
    "[\"Sample barcode\", barcode.trim() || \"-\"]",
    "[\"Barcode length\", barcode.trim() ? String(barcode.trim().length) : \"-\"]",
    "inferBarcodeWeightRuleWithStatus",
    "Weight appears twice. Scan another sample.",
    "mustSaveCurrentRule",
    "Save first barcode + rule",
    "data-stock-action=\"saved-barcode-rule-length-cue\"",
    "Expected length: {expectedBarcodeLength} digits.",
    "Save first barcode. Rule reused.",
    "p_save_weight_rule",
    "p_barcode_length",
    "p_sample_barcode",
    "insert into public.barcode_weight_rules",
    "Barcode length is different from saved rule.",
    "BARCODE_LENGTH_MISMATCH",
    "data-stock-action=\"rule-page-internal-label-escape\"",
    "Teach barcode rule",
    "Scan sample, enter kg.",
    "No weight? Use labels.",
    "Use Inbound without Barcode",
    "Back to setup",
    "Open scanner",
  ],
  "Barcode-rule setup and fallback"
)

includesAll(
  inboundRuleSampleRpc,
  [
    "create or replace function public.inbound_stock_unit",
    "insert into public.stock_units",
    "returning id into v_stock_unit_id",
    "insert into public.stock_movements",
    "stock_unit_id,",
    "v_stock_unit_id,",
    "insert into public.barcode_scan_logs",
    "return v_stock_unit_id;",
    "p_net_weight_kg numeric",
  ],
  "Live inbound RPC stock unit and movement linkage"
)

includesAll(
  workflowForms + scanner + actions,
  [
    "BarcodeField",
    "continuousScan",
    "data-stock-action=\"scanner-popup-external-input\"",
    "External scanner input",
    "handleDetected(typedValue)",
    "Saving ${decoded.weightKg} kg.",
    "Rule saved. ${savedWeightText} saved.",
    "${savedWeightText} saved.",
    "window.setTimeout(() => formRef.current?.requestSubmit(), 0)",
    "Duplicate barcode. Inbound is blocked.",
    "inboundScannerContextSummary",
    "`Batch: ${batchNo}`",
    "`Display product: ${selectedProductDisplayName}`",
    "`Product: ${selectedProductName}`",
    "`Manufacturer: ${selectedManufacturerName}`",
    "`Origin: ${selectedOriginName}`",
    "Location: ${selectedLocation?.name ?? \"No location\"}",
    "scanContextSummary={inboundScannerContextSummary}",
    "scanButtonLabel=\"Use Phone Scanner\"",
    "data-stock-action=\"sticky-inbound-active-session-summary\"",
    "sticky top-2 z-20",
    "mt-1 break-all font-mono text-xs text-emerald-800",
    "{batchNo}",
    "mt-1 grid gap-1 text-xs text-emerald-800 sm:grid-cols-2",
    "Product: {selectedProductName}",
    "Manufacturer: {selectedManufacturerName}",
    "mt-2 grid gap-2 sm:grid-cols-2",
    "data-stock-action=\"scanner-current-setup-top\"",
    "whitespace-pre-line break-words",
    "scanSummary={inboundScanSummary}",
    "scanTotalSummary={inboundScanTotalSummary}",
    "p_net_weight_kg: parsed.netWeightKg",
    "stockUnitId: readString(data)",
    "data-stock-action=\"scanner-primary-scan-action-slot\"",
    "data-stock-action=\"scanner-camera-window\"",
    "data-stock-action=\"scanner-camera-feedback-frame\"",
    "Stays open until Close.",
    "border-emerald-400",
    "border-red-400",
    "Scan failed. Try again.",
    "scanFeedbackMessage\n        ? scanFeedbackMessage",
    "<video",
    "decodeFromConstraints",
    "data-stock-action=\"scanner-last-saved-item-weight-top\"",
    "Last saved item and weight",
    "data-stock-action=\"scanner-last-scanned-barcode\"",
    "Last scanned barcode",
    "Detected. Ready for next scan.",
    "data-stock-action=\"scanner-session-total-top\"",
    "Inbound session total",
    "Live barcode count and session weight",
    "const inboundUndoEntryLabel =",
    "inboundMode === \"internal_label\" ? \"unit\" : \"scan\"",
    "const latestSavedScan = savedSessionScans[0]",
    "const inboundUndoEmptyMessage = `No saved ${inboundUndoEntryLabel} to undo yet.`",
    "const inboundUndoSuccessMessage = `Previous ${inboundUndoEntryLabel} undone. Audit trail kept.`",
    "function finishInboundSession()",
    "data-stock-action=\"scanner-finish-inbound-session\"",
    "Finish Session",
    "onClick={finishInboundSession}",
    "setLatestScanUndoMessage(\"\")",
    "setWholeSessionUndoMessage(\"\")",
    "setWholeSessionUndoConfirmOpen(false)",
    "setInboundPrintTarget(null)",
    "const finishBlockedNoSavedMessage = inboundMode === \"internal_label\"",
    "Save at least one unit before finishing this session.",
    "Save at least one barcode before finishing this session.",
    "data-stock-action=\"scanner-camera-session-count-top\"",
    "Camera window scans",
    "Undo Last Scan",
    "label.stockUnitId === latestSavedScan?.stockUnitId",
    "disabled={latestScanUndoing || !latestSavedScan}",
    "{inboundUndoEmptyMessage}",
    "function undoLatestInboundScan",
    "formData.set(\"stockUnitId\", latestSavedScan.stockUnitId)",
    "setLatestScanUndoMessage(inboundUndoSuccessMessage)",
    "const manualWeightConfirmationReady =",
    "ruleExtractedPreview.status === \"manual_confirmation_required\"",
    "Confirm weight and save",
    "data-stock-action=\"finished-inbound-scan-stop\"",
    "Session finished. Review only.",
    "sessionFinishedAt\n                      ? \"Session finished. Review only.\"",
  ],
  "Continuous scanner and undo"
)

assert(
  !workflowForms.includes("continuousScan={inboundStep !== \"rule\"}"),
  "Inbound scanner popup must stay open on the barcode-rule page until Close."
)

const scannerActionSlotStart = workflowForms.indexOf("scanActionSlot={")
const scannerActionSlotEnd = workflowForms.indexOf("continuousScan", scannerActionSlotStart)
assert(
  scannerActionSlotStart >= 0 && scannerActionSlotEnd > scannerActionSlotStart,
  "Inbound scanner action slot must be easy to inspect."
)
const scannerActionSlot = workflowForms.slice(
  scannerActionSlotStart,
  scannerActionSlotEnd
)
includesAll(
  scannerActionSlot,
  [
    "inboundStep === \"rule\"",
    "inboundStep === \"scan\"",
    "inboundStep === \"manual\"",
    "Undo Last Scan",
    "data-stock-action=\"scanner-finish-inbound-session\"",
  ],
  "Inbound scanner popup controls"
)

includesAll(
  workflowForms + label,
  [
    "data-stock-action=\"manual-label-next-unit\"",
    "data-stock-action=\"manual-weight-enter-shortcut\"",
    "data-stock-action=\"manual-weight-progress-card\"",
    "Enter next unit",
    "Enter saves next weight.",
    "Enter kg. Print label. Repeat.",
    "Previous entered weight",
    "manualPreviousWeightText",
    "Undo Last Weight Entry",
    "Undo weight entry",
    "manualMode ? \"Enter one unit weight kg\" : \"Net weight kg\"",
    "function handleNetWeightKeyDown",
    "event.key !== \"Enter\" || inboundStep !== \"manual\"",
    "Generate internal label",
    "generateLabelBarcode()",
    'status: "PENDING"',
    'status: "SAVED"',
    "setNetWeightKg(\"\")",
    "netWeightInputRef.current?.focus()",
    "Saved. Enter next weight.",
    "inboundSummaryTitle = manualMode",
    "Page 3: Inbound without barcode session summary",
    "manualMode ? \"Total count\" : \"Total barcode units\"",
    "Saved units in this session",
    "data-stock-action=\"inbound-summary-print-labels-pdf-area\"",
    "Print Labels PDF",
    "StockLabelPreview",
    "StockLabelPrintActions",
    "thermal-50x30",
    'width: "50mm"',
    'height: "30mm"',
    'pageSize: "50mm 30mm"',
    "@page { size: ${size.pageSize}; margin: 0; }",
    "page-break-after: always;",
    "break-after: page;",
    "One label per page.",
    "label.companyName",
    "label.productName",
    "label.weightKg",
    "label.barcode",
  ],
  "No-supplier-barcode manual label flow"
)

assert(
  workflowForms.includes("const activePrintLabels = recentLabels.filter("),
  "Summary Print Labels PDF must use all saved session labels, not internal-label mode only."
)
assert(
  workflowForms.includes("Reprint if needed."),
  "Supplier-barcode sessions must expose safe label reprint copy."
)

const generateLabelStart = workflowForms.indexOf("function generateLabelBarcode()")
const cancelLabelStart = workflowForms.indexOf(
  "function cancelPendingInternalLabel()",
  generateLabelStart
)
assert(generateLabelStart >= 0, "generateLabelBarcode function missing")
assert(cancelLabelStart > generateLabelStart, "generateLabelBarcode boundary missing")
const generateLabelBlock = workflowForms.slice(generateLabelStart, cancelLabelStart)
includesAll(
  generateLabelBlock,
  [
    "const nextLabel: InboundLabel =",
    'status: "PENDING"',
    "pendingLabelRef.current = nextLabel",
    "pendingInternalLabelRef.current = true",
    "setPendingInternalLabel(nextLabel)",
    "setBarcode(generated.barcode)",
    "Label generated. Saving stock now.",
    "formRef.current?.requestSubmit()",
  ],
  "Generated internal label immediate save"
)

const inboundActionStart = workflowForms.indexOf("async function inboundFormAction")
const inboundActionEnd = workflowForms.indexOf(
  "function recordSessionError",
  inboundActionStart
)
assert(inboundActionStart >= 0, "inboundFormAction function missing")
assert(inboundActionEnd > inboundActionStart, "inboundFormAction boundary missing")

const sessionErrorStart = workflowForms.indexOf("function recordSessionError")
const sessionErrorEnd = workflowForms.indexOf(
  "function logInboundScanIssue",
  sessionErrorStart
)
assert(sessionErrorStart >= 0, "recordSessionError function missing")
assert(sessionErrorEnd > sessionErrorStart, "recordSessionError boundary missing")
assert(
  !workflowForms.slice(sessionErrorStart, sessionErrorEnd).includes(".slice(0, 8)"),
  "Inbound session error count must not be capped before summary."
)
const inboundActionBlock = workflowForms.slice(inboundActionStart, inboundActionEnd)
includesAll(
  inboundActionBlock,
  [
    "const wasInternalLabel = pendingInternalLabelRef.current",
    "status: \"SAVED\"",
    "setDecodeMessage(\"Saved. Enter next weight.\")",
  ],
  "Internal label server-save transition"
)

const clearDraftStart = workflowForms.indexOf("function clearInboundDraftScan()")
const updatePresetStart = workflowForms.indexOf("function updatePreset", clearDraftStart)
assert(clearDraftStart >= 0, "clearInboundDraftScan function missing")
assert(updatePresetStart > clearDraftStart, "clearInboundDraftScan boundary missing")
const clearDraftBlock = workflowForms.slice(clearDraftStart, updatePresetStart)
includesAll(
  clearDraftBlock,
  [
    "setBarcode(\"\")",
    "setNetWeightKg(\"\")",
    "setPendingInternalLabel(null)",
    "pendingLabelRef.current = null",
    "pendingInternalLabelRef.current = false",
    "lastErrorMessageRef.current = \"\"",
    "loggedInboundIssueKeysRef.current.clear()",
  ],
  "Inbound draft scan reset helper"
)

const startNewSessionStart = workflowForms.indexOf(
  "function startNewInboundSession()"
)
const selectedItemStart = workflowForms.indexOf(
  "const selectedItem = localItems.find",
  startNewSessionStart
)
assert(startNewSessionStart >= 0, "startNewInboundSession function missing")
assert(selectedItemStart > startNewSessionStart, "startNewInboundSession boundary missing")
const startNewSessionBlock = workflowForms.slice(
  startNewSessionStart,
  selectedItemStart
)
includesAll(
  startNewSessionBlock,
  [
    "setRecentLabels([])",
    "setSessionErrors([])",
    "setSessionFinishedAt(null)",
    "setBatchNo(generateInboundBatchNo())",
    "labelSerialRef.current = 0",
    "clearInboundDraftScan()",
    "setInboundPrintTarget(null)",
    "setSessionBarcodeRuleSaved(false)",
    "setSessionBarcodeRuleLength(null)",
    "setInboundStep(\"setup\")",
  ],
  "New inbound session reset"
)

const historySetupStartForSerial = workflowForms.indexOf(
  "function applyInboundHistorySetup"
)
const historyStatusStart = workflowForms.indexOf(
  "return (",
  historySetupStartForSerial
)
assert(
  workflowForms
    .slice(historySetupStartForSerial, historyStatusStart)
    .includes("labelSerialRef.current = 0"),
  "History setup reuse must reset internal-label running serial."
)

assert(
  !workflowForms.includes("function inboundTemplateStatusText"),
  "Recent inbound templates should not render extra status helper copy."
)
assert(
  !workflowForms.includes("Origin: {template.originName}"),
  "Recent inbound template cards should show only manufacturer + product."
)
assert(
  workflowForms.includes("Tap recent product."),
  "Recent inbound templates should use short worker helper copy."
)

includesAll(
  workflowForms + stockPage + actions + undoRpc,
  [
    "data-stock-action=\"inbound-page-four-session-summary\"",
    "Page 4: Inbound session summary",
    "const inboundSessionStatus = wholeSessionVoided",
    "data-stock-action=\"inbound-session-summary-status\"",
    "Session status: {inboundSessionStatus}",
    "data-stock-action=\"inbound-summary-session-code\"",
    "Inbound session code",
    "{batchNo}",
    "[\"Session status\", inboundSessionStatus]",
    "manualMode ? \"Total count\" : \"Total barcode units\"",
    "Total weight",
    "Product: {selectedProductName}",
    "Manufacturer: {selectedManufacturerName}",
    "Display name: {selectedProductDisplayName}",
    "Inbound location: {selectedLocation?.name ?? \"No location\"}",
    "Scanned by: {scannedByName}",
    "data-stock-action=\"future-session-summary-print-area\"",
    "Print summary",
    "Print or save PDF.",
    "data-stock-action=\"inbound-session-summary-saved-list\"",
    "{savedSessionScans.length} saved",
    "Compact list.",
    "data-stock-action=\"inbound-session-summary-error-list\"",
    "sessionErrors.slice(0, 8).map",
    "Showing latest 8 errors. Full list prints in session summary.",
    "data-stock-action=\"inbound-session-summary-voided-list\"",
    "const voidedSessionScans = recentLabels.filter(",
    "Voided scans kept for audit",
    "VOIDED",
    "data-stock-action=\"inbound-summary-print-labels-pdf-area\"",
    "data-stock-action=\"internal-label-summary-no-reprint\"",
    "No saved labels to reprint.",
    "function printInboundLabels",
    "function printInboundSessionSummary",
    "inboundPrintTarget === \"labels\" ? labelsForPrint : []",
    "onPrint={printInboundLabels}",
    "onClick={printInboundSessionSummary}",
    "Print Session Summary",
    "data-stock-action=\"summary-finish-inbound-session\"",
    "Finish Session",
    "className=\"min-h-11 w-full whitespace-normal\"",
    "data-stock-action=\"inbound-summary-action-grid\"",
    "lg:grid-cols-5",
    "xl:grid-cols-6",
    "data-stock-action=\"summary-safe-back-to-setup\"",
    "Review setup (read-only)",
    "data-stock-action=\"review-barcode-rule-from-summary\"",
    "Review Barcode Rule",
    "onClick={() => goInboundStep(\"rule\")}",
    "data-stock-action=\"summary-safe-back-to-scan\"",
    "data-stock-action=\"inbound-session-summary-print-root\"",
    "inboundPrintTarget === \"summary\"",
    "stock-inbound-summary-print-root",
    "@page { size: A4; margin: 12mm; }",
    "Elite Meat inbound session summary",
    "sessionSummaryPrintRows.map(([label, value])",
    "savedSessionScans.map((label) =>",
    "<th>Barcode</th>",
    "<th>Product</th>",
    "<th>Weight</th>",
    "Duplicate/error scans",
    "sessionErrors.map((error) =>",
    "<th>Message</th>",
    "print-error-${error.id}",
    "voidedSessionScans.map((label) =>",
    "print-voided-${label.id}",
    "<th>Status</th>",
    'Review {manualMode ? "Manual Weight" : "Scanner"}',
    "Delete Whole Session",
    "data-stock-action=\"open-whole-session-delete-confirmation\"",
    "canDeleteWholeSession",
    "!canDeleteWholeSession ||",
    "canManageStockTake ||",
    "canDirectorApproveStockTake",
    "data-stock-action=\"whole-session-undo-confirmation\"",
    "Confirm manager-approved Delete Whole Session",
    "Voids {recentInboundCount} saved",
    "kg) for {batchNo}. Audit kept.",
    "Keep session",
    "Delete Whole Session",
    "data-stock-action=\"start-new-inbound-session\"",
    "function startNewInboundSession",
    "Manager approval required. Audit kept.",
    "Full audit kept.",
    "undoInboundSessionAction",
    "[...stockManagerRoles, \"director\"]",
    "create or replace function public.void_inbound_stock_session",
    "'INBOUND_VOID'::public.stock_movement_type",
  ],
  "Session summary and safe whole-session undo"
)

assert(
  !workflowForms.includes("scan-back"),
  "Manual label flow saves immediately and must not mention scan-back."
)
assert(
  !workflowForms.includes("mt-2 grid grid-cols-2 gap-2"),
  "Inbound sticky summary Saved/Weight cards must stay one-column on phone."
)
const manualSummaryStart = workflowForms.indexOf(
  'data-stock-action="manual-label-next-unit"'
)
const manualSummaryEnd = workflowForms.indexOf(
  'data-stock-action="manual-weight-progress-card"',
  manualSummaryStart
)
assert(
  manualSummaryStart >= 0 &&
    manualSummaryEnd > manualSummaryStart &&
    workflowForms
      .slice(manualSummaryStart, manualSummaryEnd)
      .includes("sticky top-2 z-20"),
  "Manual weight entry summary must stay sticky on phone."
)
const historyPanelStart = workflowForms.indexOf(
  'data-stock-action="inbound-session-history"'
)
const historyPanelPrefix = workflowForms.slice(
  Math.max(0, historyPanelStart - 120),
  historyPanelStart
)
assert(
  historyPanelStart >= 0 && historyPanelPrefix.includes('inboundStep === "setup"'),
  "Inbound session history must stay on setup, not active scan/manual pages."
)

console.log("Stock inbound guided flow coverage passed.")
