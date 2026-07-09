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

const stockPage = read("components/stock/stock-page.tsx")
const homePage = read("components/dashboard/home-page.tsx")
const workflowForms = read("components/stock/workflow-forms.tsx")
const stockActions = read("lib/stock/actions.ts")
const barcodeScanner = read("components/stock/barcode-scanner.tsx")
const stockUnitDetail = read("components/stock/stock-unit-detail.tsx")
const stockLabel = read("components/stock/stock-label.tsx")
const stockDataTable = read("components/stock/data-table.tsx")
const ownerList = read("docs/STOCK_TEST_LIST_FOR_OWNER.md")
const remoteQa = read("docs/STOCK_REMOTE_QA_VERCEL.md")
const packageJson = read("package.json")
const stockInboundSessionVoidMigration = read(
  "supabase/migrations/202606250008_stock_inbound_session_void_rpc_v1.sql"
)

includesAll(
  homePage,
  [
    'href: "/stock"',
    'label: "Stock"',
    "Open stock workflows for your assigned location.",
    "roles: stockRoles",
    "const stockAdvancedShortcutRoles",
    'href: "/stock/reports"',
    "roles: stockAdvancedShortcutRoles",
  ],
  "ERP Home stock worker shortcut"
)

assert(
  !homePage.includes('label: "Stock Dashboard"'),
  "ERP Home should show workers a simple Stock shortcut, not Stock Dashboard."
)

includesAll(
  stockPage,
  [
    'import Link from "next/link"',
    "function StockWorkerHome({",
    "canUseItemSetup={canUseItemSetup}",
    "workerHome",
    "min-[390px]:grid-cols-2",
    "min-h-20 justify-start gap-3 whitespace-normal py-4 text-left text-lg",
    "min-h-16 justify-start gap-3 whitespace-normal py-3 text-left text-base",
    "size-6 shrink-0",
    "min-w-0 break-words",
    "Inbound",
    "Outbound Without Order",
    "Transfer Out",
    "Receive Transfer",
    "Return Stock",
    "Stock Take",
    "Item / Barcode Setup",
    "canUseItemSetup",
    "/stock/inbound",
    "/stock/outbound",
    "/stock/transfer",
    "/stock/receive-transfer",
    "/stock/return",
    "/stock/stock-take",
    "/stock/items",
    "<Link href={shortcut.href}>",
  ],
  "Stock worker mobile home"
)

includesAll(
  stockPage,
  [
    'route === "return" && canManageStockTake',
    "<InspectionReleaseForm canManage={canManageStockTake} />",
  ],
  "Stock return manager-only inspection release"
)

includesAll(
  stockPage,
  [
    "Negative stock alert",
    "Stock age alert",
    "Transfer receive overdue",
    "break-words text-red-800/80",
    "break-words text-amber-900/80",
    "break-words text-orange-900/80",
    "break-words font-medium",
    "mt-1 break-words text-muted-foreground",
    "mt-2 break-words text-muted-foreground",
  ],
  "Stock mobile alert card wrapping"
)

includesAll(
  stockPage,
  [
    "function MobileItemCards",
    "Mobile item list",
    "No product master records found.",
    "Showing first 8 products. Use product search or scroll the table below",
    "<MobileItemCards rows={itemRows(data)} />",
    "String(row.itemCode ?? \"-\")",
    "row.barcodeRequired ? \"Required\" : \"Optional\"",
    "break-all font-mono text-xs",
    "mt-1 break-words text-xs text-muted-foreground",
    "flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between",
    "className=\"w-fit max-w-full whitespace-normal break-words\"",
    "md:hidden",
  ],
  "Stock mobile item cards"
)

includesAll(
  stockPage,
  [
    "function MobileStockBalanceCards",
    "Mobile stock balance",
    "No stock balance found for this scope.",
    "Barcode units",
    "Total kg",
    "Total qty",
    "Barcode kg",
    "balance.brandName",
    "Showing first 8 balances. Scroll the table below for full balance.",
    "<MobileStockBalanceCards balances={data.balances} />",
    "break-words font-semibold",
    "mt-1 break-words text-xs text-muted-foreground",
    "className=\"w-fit max-w-full whitespace-normal break-words\"",
    "md:hidden",
  ],
  "Stock mobile balance cards"
)

includesAll(
  stockPage,
  [
    "function MobileStockUnitCards",
    "Mobile barcode units",
    "No barcode stock units found for this scope.",
    "Open / reprint",
    "Showing first 8 barcode units. Scroll the table below for all units.",
    "<MobileStockUnitCards rows={unitRows(data)} />",
    "<Link href={`/stock/units/${String(row.id)}`}>",
    "Number(row.netWeightKg ?? 0).toLocaleString",
    "String(row.locationName ?? \"Unknown location\")",
    "flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between",
    "className=\"w-fit max-w-full whitespace-normal break-words\"",
    "break-words font-medium",
    "md:hidden",
  ],
  "Stock mobile barcode unit cards"
)

includesAll(
  stockPage,
  [
    "function MobileStockMovementCards",
    "Mobile movement history",
    "No stock movements found for this scope.",
    "Showing first 8 movements. Scroll the table below for full history.",
    "<MobileStockMovementCards movements={data.movements} />",
    "movement.weightKg.toLocaleString",
    "movement.quantity.toLocaleString",
    "movement.barcode || \"No barcode\"",
    "flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between",
    "break-words font-semibold",
    "font-semibold tabular-nums min-[390px]:shrink-0 min-[390px]:text-right",
    "mt-1 break-words text-xs text-muted-foreground",
    "break-words font-medium",
  ],
  "Stock mobile movement history cards"
)

includesAll(
  stockPage,
  [
    "<CardTitle>Latest movements</CardTitle>",
    "<CardContent className=\"space-y-3\">",
    "<MobileStockMovementCards movements={data.movements} />",
    "data={movementRows(data).slice(0, 8)}",
  ],
  "Stock dashboard mobile latest movement cards"
)

includesAll(
  stockPage,
  [
    "<CardTitle>Recent movements</CardTitle>",
    "Recent stock actions for quick confirmation.",
    "<MobileStockMovementCards movements={data.movements} />",
    "data={movementRows(data).slice(0, 10)}",
    "no-barcode-inbound",
    "min-h-11 w-full gap-2 md:w-auto",
    "size-4 shrink-0",
  ],
  "Stock worker scan pages mobile recent movement cards"
)

const workerHomeBody =
  stockPage.match(/function StockWorkerHome\([^)]*\) \{[\s\S]*?\n\}/)?.[0] ?? ""

for (const blockedFragment of [
  "KpiCards",
  "DataTable",
  "reports",
  "settings",
  "cost",
  "value",
  "finance",
]) {
  assert(
    !workerHomeBody.toLowerCase().includes(blockedFragment),
    `Stock worker mobile home must not include ${blockedFragment}.`
  )
}

includesAll(
  workflowForms + barcodeScanner + stockActions + stockInboundSessionVoidMigration,
  [
    "Recent inbound templates",
    "Tap recent product.",
    "originName:",
    "guided-inbound-flow",
    "data-stock-action=\"read-only-inbound-session-code\"",
    "data-stock-action=\"read-only-inbound-setup-review\"",
    "1 Setup",
    "2 Barcode Rule",
    "2 Manual Weight",
    "3 Scan",
    "3 Summary",
    "4 Summary",
    "Inbound with Barcode",
    "Inbound without Barcode",
    "Inbound session code",
    "Auto code.",
    "data-stock-action=\"guided-inbound-submit-context\"",
    "name=\"itemId\" value={preset.itemId}",
    "name=\"brandId\" value={preset.brandId}",
    "name=\"originId\" value={preset.originId}",
    "name=\"locationId\" value={preset.locationId}",
    "name=\"batchNo\" value={batchNo}",
    "Finish or delete first.",
    "Next: Barcode Rule",
    "Next: Manual Weight",
    "onClick={() => goInboundStep(\"setup\")}",
    "Open scanner",
    "Save rule first",
    "disabled={!scanSetupReady || !canUseBarcodeRuleForSession}",
    "External scanner: scan into this box.",
    "Scan sample, enter kg.",
    "Weight saves label.",
    ": \"\"",
    "Saving ${decoded.weightKg} kg.",
    "Manual Weight Entry",
    "data-stock-action=\"manual-label-next-unit\"",
    "Enter next unit",
    "Setup locked. Save, print, attach.",
    "function handleNetWeightKeyDown",
    "event.key !== \"Enter\" || inboundStep !== \"manual\"",
    "Enter kg. Press Enter.",
    "const scopeLockedReason = sessionFinishedAt",
    "Finished. Start new to change.",
    "const finishBlockedNoSavedMessage = inboundMode === \"internal_label\"",
    "Save one barcode first.",
    "Save one unit first.",
    "data-stock-action=\"finished-inbound-scan-stop\"",
    "Session finished. Review only.",
    "data-stock-action=\"barcode-rule-fields-panel\"",
    "Extracted weight preview",
    "data-stock-action=\"barcode-rule-save-summary\"",
    "Rule values to save",
    "ruleSaveSummaryRows.map",
    "[\"Display product\", selectedProductDisplayName]",
    "[\"Product\", selectedProductName]",
    "[\"Manufacturer\", selectedManufacturerName]",
    "[\"Origin\", selectedOriginName]",
    "[\"Sample barcode\", barcode.trim() || \"-\"]",
    "[\"Barcode length\", barcode.trim() ? String(barcode.trim().length) : \"-\"]",
    "data-stock-action=\"detected-barcode-rule-preview\"",
    "Detected barcode rule",
    "Sample length:",
    "Weight position:",
    "Save first barcode. Rule reused.",
    "Barcode rule setup",
    "Manufacturer:",
    "Display name:",
    "data-stock-action=\"barcode-rule-scope-cue\"",
    "Rule is for this product, manufacturer, and origin only.",
    "ruleExtractedPreviewWeightKg",
    "Preview only. Net kg below.",
    "Preview source:",
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
    "data-stock-action=\"inbound-session-summary-error-list\"",
    "Duplicate/error scans in this session",
    "data-stock-action=\"inbound-summary-print-labels-pdf-area\"",
    "Print Labels PDF",
    "} ready.",
    "data-stock-action=\"print-inbound-session-summary\"",
    "Print Session Summary",
    "data-stock-action=\"inbound-summary-action-grid\"",
    "sm:grid-cols-2",
    "xl:grid-cols-6",
    "Review setup (read-only)",
    "data-stock-action=\"review-barcode-rule-from-summary\"",
    "Review Barcode Rule",
    "manualMode ? \"Total count\" : \"Total barcode units\"",
    "Delete Whole Session",
    "canDeleteWholeSession",
    "!canDeleteWholeSession ||",
    "wholeSessionUndoConfirmOpen",
    "data-stock-action=\"whole-session-undo-confirmation\"",
    "Confirm Delete Whole Session",
    "kg) for {batchNo}. Audit kept.",
    "Corrections need manager approval. Audit kept.",
    "Delete Whole Session",
    "Keep session",
    "Whole inbound session undo",
    "wholeSessionVoided",
    "Session undone. Stock units were voided.",
    "Corrections need manager approval. Audit kept.",
    "undoInboundSessionAction",
    "[...stockManagerRoles, \"director\"]",
    "\"void_inbound_stock_session\"",
    "create or replace function public.void_inbound_stock_session",
    "BARCODE_INBOUND_SESSION_VOID",
    "'atomicSessionUndo', true",
    "inboundScanSummary",
    "inboundScannerContextSummary",
    "scanContextSummary={inboundScannerContextSummary}",
    "Current inbound setup",
    "`Inbound session code: ${batchNo}`",
    "`Display product: ${selectedProductDisplayName}`",
    "`Product: ${selectedProductName}`",
    "`Manufacturer: ${selectedManufacturerName}`",
    "`Origin: ${selectedOriginName}`",
    "whitespace-pre-line break-words",
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
    "Undo Last Scan",
    "Back to Barcode Rule",
    "inboundStep === \"rule\"",
    "Back to setup",
    "onClick={() => goInboundStep(\"rule\")}",
    "onClick={() => goInboundStep(\"setup\")}",
    "Review {manualMode ? \"Manual Weight\" : \"Scanner\"}",
    "Ready. Scan next barcode.",
    "Choose location, then scan.",
    "Scan sample, enter kg.",
    "data-stock-action=\"recent-inbound-template-card\"",
    "inboundMode === \"internal_label\"",
    "Ready. Enter weight.",
    "setInboundStep(\"manual\")",
    "netWeightInputRef.current?.focus()",
    "h-auto min-w-0 justify-start break-words whitespace-normal py-3 text-left",
    "type=\"search\"",
    "Search manufacturer + product or item code",
    "selectedManufacturerValue",
    "formatProductName(item, itemDefaultBrand)",
    "formatProductName(item, { name: selectedManufacturerValue })",
    "const selectedOriginName =",
    "Origin: {selectedOriginName}",
    "enterKeyHint=\"search\"",
    "Quick inbound products",
    "Tap product.",
    "data-stock-action=\"guided-inbound-page-cue\"",
    "Page {inboundPageNumber}/{visibleInboundSteps.length}",
    "Session Setup",
    "Barcode Rule",
    "Scanner",
    "Manual Weight Entry",
    "Session Summary",
    "itemId: \"\"",
    "activeItemIds.has(preset.itemId) ? preset.itemId : \"\"",
    "Choose product first.",
    "\"No product selected\"",
    "Other / custom product",
    "value === \"__other\"",
    "min-h-14 min-w-0 justify-start break-words whitespace-normal text-left",
    "flex min-h-11 cursor-pointer items-center break-words text-sm font-medium",
    "data-stock-action=\"use-other-product\"",
    "Use Other Product",
    "showManualProductEntry",
    "data-stock-action=\"quick-create-item\"",
    "quickProductNameSuggestion",
    "quickProductCreateManufacturerReady",
    "productSearchHasExactMatch",
    "Use as product:",
    "Save before scanning.",
    "Choose manufacturer first.",
    "Choose manufacturer first.",
    "brandSearchInputRef",
    "focusManufacturerSearch",
    "scrollIntoView({",
    "Choose manufacturer",
    "!quickProductCreateManufacturerReady",
    "data-stock-action=\"manual-product-entry\"",
    "New product",
    "Product not found.",
    "placeholder=\"Product name only\"",
    "className=\"min-h-11 w-full sm:w-auto\"",
    "Recent manufacturers",
    "inboundBrandSearch",
    "Search manufacturer",
    "quickManufacturerNameSuggestion",
    "manufacturerSearchHasExactMatch",
    "data-stock-action=\"manual-manufacturer-entry\"",
    "Manufacturer not found.",
    "Use as manufacturer:",
    "<Label htmlFor=\"brandId\">Manufacturer</Label>",
    "emptyLabel=\"Select manufacturer\"",
    "customLabel=\"Other / custom manufacturer\"",
    "const resolvedBrandId = result.brandId ?? null",
    "const resolvedOriginId = result.originId ?? null",
    "current.brandId === \"__other\" && resolvedBrandId",
    "current.originId === \"__other\" && resolvedOriginId",
    "name=\"brandName\" value={brandName.trim()}",
    "name=\"originName\"",
    "value={originName.trim()}",
    "function selectInboundBrand",
    "Quick inbound origins",
    "inboundOriginSearch",
    "Search origin",
    "quickOriginNameSuggestion",
    "originSearchHasExactMatch",
    "Use search text as custom origin:",
    "function selectInboundOrigin",
    "Tap origin to avoid dropdown.",
    "Quick inbound locations",
    "Change location only.",
    "function inboundPresetCanScan",
    "function selectInboundSetup",
    'selectInboundSetup("itemId"',
    'selectInboundSetup("brandId"',
    'selectInboundSetup("originId"',
    'selectInboundSetup("locationId"',
    "function assignedStockLocationId",
    "defaultLocationId",
    "Using location:",
    "Profile default.",
    "Change Location",
    "Change location only.",
    "className=\"min-h-11 w-full sm:w-auto\"",
    "Finish Session",
    "finishBlockedByNoSavedScan",
    "finishBlockedNoSavedMessage",
    "Save one barcode first.",
    "Save one unit first.",
    "savedSessionScans.length === 0",
    "finishBlockedByPendingLabel",
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
    "if (!scanSetupReady || !selectedItem)",
    "!scanSetupReady",
    "setPendingInternalLabel(null)",
    "pendingInternalLabelRef.current = false",
    "lastErrorMessageRef.current = \"\"",
    "loggedInboundIssueKeysRef.current.clear()",
    "Undo before finish.",
    "setBarcode(\"\")\n        setNetWeightKg(\"\")",
    "Duplicate barcode. Inbound is blocked.",
    "role=\"alert\"",
    "aria-live=\"assertive\"",
    "Blocked/error scans this session",
    "logInboundScanIssueAction",
    "logInboundScanIssue(value, message, \"DUPLICATE_BARCODE\", {",
    "expectedStatus: \"unused barcode\"",
    "className=\"text-sm break-words text-red-900\"",
    "className=\"break-all font-mono\"",
    "role={decodeStatus === \"error\" ? \"alert\" : \"status\"}",
    "aria-live={decodeStatus === \"error\" ? \"assertive\" : \"polite\"}",
    "text-sm break-words text-emerald-700",
    "text-sm break-words text-amber-800",
    "text-sm break-words text-red-700",
    "role={state.status === \"success\" ? \"status\" : \"alert\"}",
    "aria-live={state.status === \"success\" ? \"polite\" : \"assertive\"}",
    "function Input({ className, ...props }",
    "min-h-11 text-base sm:text-sm",
    "id=\"editCategory\"",
    "id=\"editDefaultBrandId\"",
    "flex min-h-11 w-full rounded-md border border-input",
    "disabledReason",
    "No weight found. Use internal label.",
    "No weight position found. Use internal label.",
    "data-stock-action=\"rule-page-internal-label-escape\"",
    "No weight? Use labels.",
    "No weight? Use labels.",
    "switchInboundMode(\"internal_label\")",
    "data-stock-action=\"internal-label-fallback-cue\"",
    "Enter kg, save, print label.",
    "setInboundMode(\"internal_label\")",
    "setInboundStep(\"manual\")",
    "Use Inbound without Barcode",
    "decodeMessage.includes(\"Use internal label\")",
    "No rule? Use labels.",
    "Enter weight, save stock, then print label.",
    "currentBarcodeWeightRule",
    "sessionBarcodeRuleSaved",
    "fixedWeightFallbackActive",
    "sessionBarcodeRuleLength",
    "canUseBarcodeRuleForSession",
    "expectedBarcodeLength",
    "currentBarcodeWeightRule.barcodeLength",
    "currentBarcodeWeightRule?.sampleBarcode",
    "Learned from sample",
    "Barcode length changed.",
    "const lengthWarning = inboundBarcodeLengthWarning(value)",
    "Use internal label.",
    "logInboundScanIssue(value, lengthWarning, \"BARCODE_LENGTH_MISMATCH\", {",
    "relatedTransferId: selectedReceiveBarcode || null,",
    "expectedBarcode: selectedReceiveBarcode || null",
    "receivedBarcode: nextBarcode",
    "Save only if correct.",
    "return { ...preset, saveWeightRule: true }",
    "saveWeightRule: false",
    "Saved barcode rule ready",
    "Rule saved for this session",
    "Rule ready. Keep scanning.",
    "Rule saved. Keep scanning.",
    "No saved barcode rule yet",
    "Scan sample, enter kg.",
    "Teach barcode rule",
    "Scan sample, enter kg.",
    "Sample scanned. Enter kg, then save rule.",
    "inboundStep !== \"rule\"",
    "ruleSampleNeedsActualKg",
    "!canUseBarcodeRuleForSession &&",
    "mustSaveCurrentRule",
    "checked={mustSaveCurrentRule || preset.saveWeightRule}",
    "disabled={mustSaveCurrentRule || scopeLocked}",
    "Save weight rule for first scan",
    "First barcode teaches rule.",
    "Save first barcode + rule",
    "inboundStep !== \"rule\" || !canUseBarcodeRuleForSession",
    "data-stock-action=\"locked-barcode-rule-fields\"",
    "Rule locked. Start new session to change rule.",
    "name=\"barcodeWeightStart\"",
    "value={preset.barcodeWeightStart}",
    "disabled={scopeLocked}",
    "disabled={mustSaveCurrentRule || scopeLocked}",
    "setSessionBarcodeRuleSaved(true)",
    "setSessionBarcodeRuleLength(String(formData.get(\"barcode\") ?? \"\").length)",
    "setPreset((current) => ({ ...current, saveWeightRule: false }))",
    "Rule saved. ${savedWeightText} saved.",
    "${savedWeightText} saved.",
    "Auto-filled by rule.",
    "Scan sample, enter kg.",
    "No weight position found. Use internal label.",
    "shouldOpenWeightRulePanel",
    "const barcodeRuleSetupReady = scanSetupReady",
    "barcodeRuleSetupReady && !canUseBarcodeRuleForSession && !sessionFinishedAt",
    "Set barcode rule once",
    "Future scans use rule.",
    "Generate internal label",
    "data-stock-action=\"generate-internal-label-from-weight\"",
    "No weight? Use labels.",
    "Enter kg. Press Enter.",
    "pendingInternalLabel",
    "pending-internal-label-confirm",
    "pendingInternalLabelRef",
    "function retryPendingInternalLabelSave()",
    "pendingLabelRef.current = pendingInternalLabel",
    "pendingInternalLabelRef.current = true",
    "Retrying save.",
    "Save pending. Retry or cancel.",
    "Retry or cancel pending label.",
    "Retry save",
    "Label generated. Saving stock now.",
    "Label generated. Saving stock now.",
    "After save, next weight.",
    "Printed label confirmed. Saving stock.",
    "pendingLabelRef.current = nextLabel",
    "pendingInternalLabelRef.current && pendingLabelRef.current",
    "setNetWeightKg(\"\")",
    "Saved. Enter next weight.",
    "setInboundStep(wasInternalLabel && inboundMode === \"internal_label\" ? \"manual\" : \"scan\")",
    "Print labels.",
    "mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start",
    "netWeightInputRef.current?.focus()",
    "inferBarcodeWeightRule",
    "Weight position found. Save rule.",
    "Print labels.",
    "id=\"netWeightKg\"",
    "inputMode=\"decimal\"",
    "id=\"barcodeWeightStart\"",
    "id=\"barcodeWeightLength\"",
    "id=\"barcodeWeightDecimals\"",
    "id=\"fixedWeightKg\"",
    "enterKeyHint=\"done\"",
    "placeholder=\"Product name only\"",
    "autoComplete=\"off\"",
    "Next: open inbound and scan stock.",
    "function NoBarcodeInboundForm()",
    "<Link href=\"/stock/inbound\">Open Barcode Inbound</Link>",
    "className=\"min-h-11 w-full sm:w-auto\"",
    "const scanSetupReady = Boolean",
    "disabled={scanBlocked}",
    "disabledReason={",
    "Choose setup first.",
    "data-stock-action=\"current-scan-preset-card\"",
    "inboundStep === \"scan\" || inboundStep === \"manual\"",
    "Current scan preset",
    "Display name",
    "Product: {selectedProductName}",
    "Manufacturer: {selectedManufacturerName}",
    "data-stock-action=\"sticky-inbound-active-session-summary\"",
    "sticky top-2 z-20",
    "mt-1 break-all font-mono text-xs text-emerald-800",
    "mt-1 grid gap-1 text-xs text-emerald-800 sm:grid-cols-2",
    "Learning barcode rule",
    "Manual label inbound",
    "Scanning inbound",
    "Session locked. Finish first.",
    "manualMode ? \"Enter one unit weight kg\" : \"Net weight kg\"",
    "Enter kg. Press Enter.",
    "Previous scan",
    "manualMode ? \"Previous entered weight\" : \"Previous scan\"",
    "mt-1 break-words font-semibold",
    "manualMode ? \"Recent saved labels\" : \"Recent inbound scans\"",
    "inboundMode === \"internal_label\"",
    "Barcode labels already attached.",
    "manualMode && label.status === \"SAVED\"",
    "Recent inbound scans",
    "mt-3 grid gap-2 sm:grid-cols-2",
    "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
    "className=\"w-fit max-w-full whitespace-normal break-words\"",
    "Inbound session summary",
    "Inbound mode:",
    "manualMode ? \"Inbound without Barcode\" : \"Inbound with Barcode\"",
    "mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
    "text-sm text-muted-foreground sm:grid-cols-2",
    "Next: {inboundSummaryNextAction}",
    "Print labels.",
    "Move stock when ready.",
    "h-auto min-h-14 min-w-0 justify-start break-words whitespace-normal py-3 text-left",
    "Direct stock outbound only. Order picking stays in Orders.",
    "Direct stock outbound",
    "For customer orders, use Orders picking.",
    "<Link href=\"/orders/picking\">Open Orders picking</Link>",
    "Reference no. (optional)",
    "Open only if paperwork needs a number.",
    "previousOutboundScan",
    "Previous outbound scan",
    "text-sm break-words text-emerald-900",
    "text-sm break-words text-red-700",
    "mt-1 break-words",
    "const outboundScanBlocked",
    "Duplicate barcode. Outbound is blocked.",
    "break-words rounded-md border border-red-200 bg-red-50",
    "Choose destination stock location first.",
    "Scanning outbound",
    "break-words text-xs font-semibold uppercase",
    "mt-1 break-words text-base font-semibold",
    "mt-1 break-words text-emerald-800",
    "Scan multiple barcodes, then confirm.",
    "Scanned units",
    "Known weight",
    "Unknown scans",
    "text-sm min-[390px]:grid-cols-3",
    "Remove a wrong scan before final confirm.",
    "const rowBlockReason = !row.unit",
    "Barcode not found. Remove before confirm.",
    "Blocked. Remove before confirm.",
    "Wrong destination. Remove before confirm.",
    "Remove it from scanned list, then scan the correct label.",
    "Remove blocked scans, then scan the next barcode.",
    "Choose another destination or remove it from scanned list.",
    "blockedScannedUnits.map((row)",
    "<span className=\"break-all font-mono\">{row.barcode}</span>",
    "aria-live=\"assertive\"",
    "border-red-200 bg-red-50 text-red-900",
    "break-all font-mono text-sm font-medium",
    "className=\"h-11 w-full sm:w-auto\"",
    "break-words font-medium",
    "Choose customer",
    "directSalesNeedsCustomer",
    "Choose customer before scanning.",
    "Choose customer before confirming.",
    "Choose customer first, then scan sales stock.",
    "filteredOutboundCustomers",
    "function selectOutboundCustomer",
    "setCustomerQuery(",
    "setCustomerId(\"\")",
    "outboundCustomerSearchInputRef",
    "function focusOutboundCustomerSearch",
    "focusOutboundCustomerSearch()",
    "function selectOutboundDestination",
    "onChange={selectOutboundDestination}",
    "window.setTimeout(() => outboundBarcodeInputRef.current?.focus(), 0)",
    "outboundBarcodeInputRef.current?.focus()",
    "function outboundTypeCanScanNow",
    "outboundTypeCanScanNow(option.value)",
    "inputRef={outboundBarcodeInputRef}",
    'name="outboundMode" value="DIRECT"',
    "directOutboundUnitBlockReason",
    "Wrong location. Use stock from",
    "Barcode is ${unit.status}.",
    "Barcode not found.",
    "Search customer or phone",
    "No customer match. Open the full customer list.",
    "Full customer list",
    "filteredOutboundCustomers.slice(0, 6)",
    "No photo",
    "function DamageReasonButtons",
    "stockDamageReasons.map",
    "aria-pressed={value === reason}",
    "min-h-14 rounded-md",
    "function selectOutboundDamageReason",
    "function selectOutboundDamagePhoto",
    "function selectDamageReason",
    "function selectDamagePhoto",
    "inputRef={damageBarcodeInputRef}",
    "function scanDamageBarcode",
    "Add damage photo first.",
    "Damage request sent. Scan next.",
    "previousDamageBarcode",
    "Previous damage scan",
    "Camera scan sends the damage request automatically after photo.",
    "Requesting damage",
    "Request only. Stock is deducted after approval.",
    "outboundDamagePhotoFile",
    "capture=\"environment\"",
    "Take photo or choose image.",
    "Photo selected:",
    "break-words rounded-md border border-emerald-200 bg-emerald-50",
    "Take photo before scanning.",
    "Photo reference fallback",
    "Use only if the photo picker does not fill the file name.",
    "Photo file name / reference",
    "outboundType === \"DAMAGE_SPOILAGE\"",
    "outboundType === \"RETURN_SUPPLIER\"",
    "!damagePhotoPath.trim()",
    "!supplierName.trim()",
    "const recentSupplierNames = useMemo",
    "returnSupplierRequests",
    "Photo required. Request only; stock is not deducted now.",
    "Quick remarks",
    "h-auto min-h-12 min-w-0 justify-start break-words whitespace-normal py-3 text-left",
    "Direct sales stock out",
    "First remark is selected automatically. Tap another if needed.",
    "Confirm ${barcodes.length.toLocaleString()} scanned / ${totalWeightKg.toFixed(3)} kg",
    "className=\"h-auto whitespace-normal text-left\"",
    "directOutboundQuickRemarks",
    "defaultDirectOutboundRemark",
    "useState(\"Direct sales stock out\")",
    "Scan barcode, check item details, choose condition, then save.",
    "Change return location",
    "Quick return locations",
    "Default return location:",
    "Tap location to scan faster.",
    "Returning to",
    "selectedReturnLocation.name",
    "function selectReturnLocation",
    "function selectReturnCondition",
    "inputRef={returnBarcodeInputRef}",
    "Choose Good for available, Need Check for hold, or Spoiled /",
    "Return condition",
    "Good",
    "Need Check",
    "Spoiled / Damaged",
    "Available",
    "Hold",
    "Spoiled",
    "name=\"returnCondition\"",
    "const returnScanBlocked",
    "function scanReturnBarcode",
    "Barcode ready. Choose condition, then save.",
    "Return barcode details",
    "Current status",
    "Previous movement",
    "Save will create manager review issue.",
    "Cannot return this barcode. Manager review issue will be",
    "Return saved. Scan next barcode.",
    "previousReturnBarcode",
    "Previous return scan",
    "Camera scan fills details. Choose condition, then save.",
    "Choose return location first.",
    "Photo required. Request only; stock is not deducted now.",
    "Stock goes on supplier hold until manager approval.",
    "Choose supplier before scanning.",
    "Recent suppliers",
    "Tap supplier to avoid typing.",
    "function selectOutboundSupplier",
    "function selectReturnSupplier",
    "inputRef={returnSupplierBarcodeInputRef}",
    "function scanReturnSupplierBarcode",
    "Choose supplier first.",
    "Supplier return requested. Scan next.",
    "Returning supplier",
    "previousReturnSupplierBarcode",
    "Previous supplier return scan",
    "Camera scan requests supplier return automatically.",
    "Choose destination stock location and scan barcode.",
    "Quick destinations",
    "Search stock location",
    "filteredOptions.slice(0, 8)",
    "No matching stock location.",
    "function chooseDestination",
    "setLocationQuery(option.locationName)",
    "selectOptions.map((option)",
    "Tap destination to scan faster.",
    "function selectTransferDestination",
    "onChange={selectTransferDestination}",
    "inputRef={transferBarcodeInputRef}",
    "Sending from assigned location:",
    "excludeLocationId={assignedTransferLocation?.id ?? null}",
    "destinationIsAssignedSource",
    "Choose a different destination.",
    "selectedLabel = \"Selected stock location\"",
    "Sending to",
    "selectedTransferLocation.name",
    "border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800",
    "aria-pressed={selected}",
    "const transferScanBlocked",
    "const receiveScanBlocked",
    "function scanTransferBarcode",
    "Transfer sent. Scan next barcode.",
    "Confirm transfer sets stock to In Transfer.",
    "Duplicate barcode. Transfer is blocked.",
    "Wrong source. Use stock from",
    "Sent this transfer session",
    "previousTransferBarcode",
    "Previous transfer scan",
    "Camera scan sends automatically.",
    "function scanReceiveTransferBarcode",
    "function selectPendingReceiveBarcode",
    "selectedReceiveBarcode",
    "expectedBarcode",
    "Tap pending transfer card, scan barcode, then receive.",
    "inputRef={receiveBarcodeInputRef}",
    "Received. Scan next barcode.",
    "previousReceiveBarcode",
    "Previous receive scan",
    "Camera scan receives automatically.",
    "Default receiving location:",
    "Receiving at",
    "selectedReceiveLocation.name",
    "Pending to this location",
    "pendingReceiveUnits",
    "No pending transfers for this receiving location.",
    "Showing pending transfers for your receiving location only.",
    "Tap a pending transfer card before scanning.",
    "Selected transfer card",
    "Unexpected barcode. Scan the selected transfer barcode.",
    "Already received in this session.",
    "All visible expected transfer barcodes are received.",
    "Missing transfer barcodes stay pending for manager review.",
    "Scan only barcodes for this destination.",
    "wrongReceiveDestinationName",
    "Wrong location. This barcode must be received at",
    "Barcode not found",
    "Blocked barcode",
    "Wrong destination",
    "Counted quantity",
    "Counted weight",
    "Extra scanned count",
    "Missing expected count",
    "Wrong item count",
    "Wrong location count",
    "Mismatch report waits for approval.",
    "mt-3 grid gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3",
    "previousStockTakeLine",
    "Previous stock take scan",
    "break-words font-medium",
    "Unknown barcode exception",
    "Wrong location exception",
    "Quick stock take locations",
    "Default stock take location:",
    "Location defaults to your assigned stock location.",
    "stockTakeCreateItemSearch",
    "Search item or code",
    "createItemQuery",
    "Quick stock take items",
    "Tap item to avoid dropdown.",
    "Quick stock take manufacturers",
    "Tap manufacturer to avoid dropdown.",
    "Tap active session",
    "activeScanSessions",
    "function selectStockTakeScanSession",
    "inputRef={stockTakeBarcodeInputRef}",
    "First active session is selected automatically.",
    "firstActiveSessionId",
    "Scanning for",
    "selectedActiveScanSession.locationName",
    "Wrong item or manufacturer is blocked.",
    "Start a stock take above, then scan.",
    "const stockTakeScannerBlocked",
    "Select active stock take session first.",
    "min-h-16 min-w-0 rounded-md",
    "className=\"break-words rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900\"",
    "mt-1 break-words text-base font-semibold",
    "mt-1 break-words text-emerald-800",
    "className=\"break-words rounded-lg border bg-muted/30 p-3 text-sm\"",
    "mt-1 break-words text-muted-foreground",
    "break-all text-xs text-muted-foreground",
    "Wrong item/manufacturer blocked.",
    "Unknown barcode is exception.",
    "break-words rounded-md border border-red-200 bg-red-50",
    "grid gap-2 min-[390px]:grid-cols-3",
    "Stock take is active for this item/manufacturer/location. You can",
    "role=\"status\"",
    "className=\"min-h-11 justify-center whitespace-normal break-words\"",
    "className=\"w-full lg:w-auto\"",
    "className=\"break-all font-semibold\"",
    "className=\"break-words text-sm text-muted-foreground\"",
    "className=\"whitespace-normal break-all text-left\"",
    "Manager signature:",
    "Director signature:",
    "offlineScanMessage",
    "function OfflineScanAlert",
    "role=\"alert\"",
    "text-sm break-words text-emerald-700",
    "text-sm break-words text-red-700",
    "text-sm font-medium break-words text-amber-800",
    "text-sm font-medium break-words text-red-700",
    "Connection lost. Please reconnect before scanning.",
    "const isOnline = useOnlineStatus()",
    "disabled={!isOnline}",
    "min-h-11 w-full rounded-md",
    "min-h-11 w-full gap-2 sm:w-auto",
    "min-[390px]:grid-cols-2",
    "className=\"h-12 w-full\"",
  ],
  "Stock worker mobile workflow forms"
)

assert(
  workflowForms.includes("confirmDisabledMessage") &&
    workflowForms.includes('role="status"') &&
    workflowForms.includes('aria-live="polite"') &&
    workflowForms.includes("Wrong location. Use stock from") &&
    workflowForms.includes("Barcode is ${unit.status}."),
  "Stock outbound warnings must be short worker-facing status messages."
)

assert(
  !workflowForms.includes("No internet connection."),
  "Stock worker offline scanner message must use the approved short wording."
)
assert(
  workflowForms.includes("Connection issue. Retry this barcode.") &&
    !workflowForms.includes("If the internet is unstable"),
  "Stock inbound save errors must use short worker-facing retry copy."
)
assert(
  !workflowForms.includes('className="flex h-9 w-full rounded-md border border-input') &&
    !stockPage.includes('className="flex h-9 w-full rounded-md border border-input'),
  "Stock mobile selects must keep phone-size touch targets."
)
assert(
  !workflowForms.includes('summary className="cursor-pointer text-sm font-medium"'),
  "Stock workflow disclosure headers must keep phone-size tap targets."
)
assert(
  !workflowForms.includes("min-h-9 cursor-pointer"),
  "Stock workflow disclosure headers must keep at least 44px phone tap targets."
)
includesAll(
  stockDataTable,
  [
    "h-auto min-h-11 gap-1 whitespace-normal px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
    "size-3 shrink-0",
    "min-w-0 whitespace-normal break-words text-sm text-foreground/90",
  ],
  "Stock table mobile sort buttons and wrapped cells"
)
assert(
  !stockDataTable.includes("h-7 px-1 text-xs"),
  "Stock table sort buttons must keep phone-size touch targets."
)
assert(
  !stockDataTable.includes("min-w-0 truncate text-sm"),
  "Stock table cells must wrap long values instead of truncating them on worker phone fallback tables."
)
assert(
  !workflowForms.includes("Duplicate barcode. Remove it before saving."),
  "Stock inbound duplicate message must be an immediate blocked warning."
)
assert(
  !workflowForms.includes("This barcode is already in the outbound batch."),
  "Stock outbound duplicate message must be short and worker-friendly."
)
assert(
  !workflowForms.includes("Quick ready orders") &&
    !workflowForms.includes("Tap order to start scanning."),
  "Stock outbound should not expose order picking controls; order picking belongs in Orders."
)
assert(
  (workflowForms.match(/offlineScanMessage/g) ?? []).length >= 8,
  "Stock worker scan/save flows must reuse the shared offline scanner message."
)
assert(
  (workflowForms.match(/<OfflineScanAlert/g) ?? []).length >= 8,
  "Stock worker scan forms must render the shared offline scanner alert."
)
assert(
  (workflowForms.match(/const isOnline = useOnlineStatus\(\)/g) ?? []).length >=
    8,
  "Stock worker scan/save forms must check online status."
)
for (const liveMessageName of [
  "localTransferMessage",
  "localReceiveMessage",
  "localReturnMessage",
  "localDamageMessage",
  "localReturnSupplierMessage",
]) {
  assert(
    new RegExp(`aria-live=\\{\\s*${liveMessageName}`).test(workflowForms),
    `Stock worker local feedback must announce ${liveMessageName}.`
  )
}
assert(
  (
    workflowForms.match(
      /break-words rounded-md border px-3 py-2 text-sm/g
    ) ?? []
  ).length >= 5,
  "Stock transfer, receive, return, damage, and supplier-return feedback cards must wrap on phone width."
)
assert(
  (
    workflowForms.match(
      /min-h-14 min-w-0 justify-start break-words whitespace-normal text-left/g
    ) ?? []
  ).length >= 9,
  "Stock inbound, transfer, return, and stock-take quick buttons must wrap long labels at phone width."
)
assert(
  workflowForms.includes('aria-live="assertive"') &&
    workflowForms.includes("{localScanMessage}"),
  "Stock take scan feedback must announce blocked messages assertively."
)
assert(
  /id="damagePhotoPath"[\s\S]*?autoComplete="off"[\s\S]*?enterKeyHint="done"/.test(
    workflowForms
  ),
  "Direct outbound damage photo fallback must keep a phone Done-key hint."
)
assert(
  /function addBarcode[\s\S]*?outboundScanBlocked && outboundScanBlockMessage[\s\S]*?setScanError\(outboundScanBlockMessage\)/.test(
    workflowForms
  ),
  "Direct outbound scan handler must enforce worker prerequisites, not rely only on disabled inputs."
)
assert(
  /id="photoPath"[\s\S]*?autoComplete="off"[\s\S]*?enterKeyHint="done"/.test(
    workflowForms
  ),
  "Return/Damage photo reference fallback must keep a phone Done-key hint."
)
assert(
  (
    workflowForms.match(
      /id="supplierName"[\s\S]*?autoComplete="off"[\s\S]*?enterKeyHint="done"/g
    ) ?? []
  ).length >= 2,
  "Direct outbound and return-supplier name fallbacks must keep phone Done-key hints."
)
assert(
  (
    workflowForms.match(
      /id="referenceNo"[\s\S]*?autoComplete="off"[\s\S]*?enterKeyHint="done"/g
    ) ?? []
  ).length >= 5,
  "Stock optional reference-number fields must keep phone Done-key hints."
)
assert(
  /id="batchNo"[\s\S]*?name="batchNo"[\s\S]*?readOnly[\s\S]*?aria-readonly="true"/.test(
    workflowForms
  ) &&
    workflowForms.includes("Inbound session code") &&
    workflowForms.includes("Auto code."),
  "Stock inbound session code must be auto-generated and read-only."
)
assert(
  !`${ownerList}\n${remoteQa}`.includes("No internet connection."),
  "Stock QA docs must use the approved offline scanner message."
)

includesAll(
  barcodeScanner,
  [
    "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
    "Scan Barcode",
    "size=\"lg\"",
    "min-h-12 w-full gap-2 text-base sm:w-auto",
    "min-h-11 text-base sm:text-sm",
    "Type barcode if needed.",
    "helperText = \"Type barcode if needed.\"",
    "<span>{helperText}</span>",
    "text-xs break-words text-muted-foreground",
    "text-sm font-medium break-words text-red-700",
    "text-sm font-medium break-words text-amber-800",
    "text-sm break-words text-red-700",
    "text-sm break-words text-emerald-700",
    "function useBrowserOnline",
    "const isOnline = useBrowserOnline()",
    "const effectiveDisabled = disabled || !isOnline",
    "const effectiveDisabledReason = !isOnline",
    "disabled={effectiveDisabled}",
    "{effectiveDisabledReason}",
    "const isConnectionLost = effectiveDisabledReason.startsWith(\"Connection lost\")",
    "disabledReasonId",
    "aria-describedby={disabledReasonId}",
    "role={isConnectionLost ? \"alert\" : \"status\"}",
    "aria-live={isConnectionLost ? \"assertive\" : \"polite\"}",
    "Scan barcode unavailable.",
    "min-h-11 min-w-11",
    "min-h-11 w-full",
    "manualInputRef",
    "onManualFallback={focusManualInput}",
    "Use manual entry",
    "manualFallbackRequestedRef",
    "Try camera again",
    "function retryScanner()",
    "setScannerRunId((id) => id + 1)",
    "onClick={useManualEntry}",
    "Starting camera...",
    "role=\"status\"",
    "role=\"alert\"",
    "aria-live=\"assertive\"",
    "aria-live=\"polite\"",
    "grid gap-2 sm:grid-cols-[1fr_auto]",
    "break-all font-mono text-xs",
    "lastDetectedRef.current = null",
    "Camera detections",
    "sessionScanCount",
    "Detected. Checking scan.",
    "Last saved item and weight",
    "Inbound session total",
    "Stays open until Close.",
    "data-stock-action=\"continuous-scan-auto-save-cue\"",
    "data-stock-action=\"one-sample-scan-cue\"",
    "One sample only.",
    "data-stock-action=\"scanner-popup-external-input\"",
    "External scanner input",
    "Scan with handheld scanner",
    "Enter sends scan{continuous ? \". Stays ready.\" : \".\"}",
    "const offlineScanMessage = \"Connection lost. Please reconnect before scanning.\"",
    "navigator.onLine",
    "window.addEventListener(\"online\", handleOnline)",
    "window.addEventListener(\"offline\", handleOffline)",
    "const effectiveDisabled = disabled || !isOnline",
    "isOnlineRef.current",
    "!isOnlineRef.current",
    "Allow camera. Use manual if blocked.",
    "data-stock-action=\"scanner-locked-inbound-session\"",
    "Locked inbound session",
    "Camera scanning is not available. Use manual entry.",
    "Keep barcode inside the box.",
    "role=\"dialog\"",
    "aria-modal=\"true\"",
    "aria-labelledby={dialogTitleId}",
    "aria-describedby={dialogDescriptionId}",
    "dialogRef.current?.focus()",
    "triggerRef.current?.focus()",
    "ref={triggerRef}",
    "document.body.style.overflow = \"hidden\"",
    "document.body.style.overflow = previousBodyOverflow",
  ],
  "Stock mobile scanner"
)

includesAll(
  workflowForms,
  [
    "function vibrateAndBeep()",
    "navigator.vibrate?.(80)",
    "AudioContext",
    "vibrateAndBeep()",
  ],
  "Stock inbound confirmed save feedback"
)

assert(
  !barcodeScanner.includes("playSuccessFeedback") &&
    !barcodeScanner.includes("navigator.vibrate") &&
    !barcodeScanner.includes("AudioContext"),
  "Stock mobile scanner must not vibrate/beep before the stock save succeeds."
)

assert(
  !barcodeScanner.includes("min-[390px]:flex-row min-[390px]:items-end"),
  "Stock mobile scanner label and Scan button should stay stacked at 390px width."
)
assert(
  !barcodeScanner.includes("min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between"),
  "Stock mobile scanner helper/status text should stay stacked and wrapping at 390px width."
)
assert(
  !barcodeScanner.includes("grid gap-2 min-[390px]:grid-cols-[1fr_auto]"),
  "Stock mobile scanner last-scan and camera-count cards should stay stacked at 390px width."
)
assert(
  !barcodeScanner.includes("min-[390px]:grid-cols"),
  "Stock mobile scanner popup should stay one-column at 390px width."
)
assert(
  !barcodeScanner.includes("close this window and use"),
  "Stock mobile scanner helper copy must point workers to Use manual entry."
)
assert(
  !barcodeScanner.includes("Type barcode manually") &&
    !barcodeScanner.includes("type barcode manually"),
  "Stock mobile scanner camera errors must point workers to Use manual entry."
)
assert(
  !barcodeScanner.includes("Manual fallback: type or paste the barcode here."),
  "Stock mobile scanner helper copy must avoid making typing feel like the normal worker path."
)
assert(
  !barcodeScanner.includes("Camera scanning is not available in this browser."),
  "Stock mobile scanner browser-unavailable copy must point workers to Use manual entry."
)

includesAll(
  stockUnitDetail + stockLabel,
  [
    "Back to stock balance",
    "min-h-11 w-full justify-start sm:w-fit",
    "function MobileMovementCards",
    "Mobile movement summary",
    "Showing latest 6 movements. Scroll the table below for full history.",
    "md:hidden",
    "flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between",
    "mt-1 break-words text-xs text-muted-foreground",
    "break-words font-semibold",
    "break-words font-medium",
    "font-semibold tabular-nums min-[390px]:shrink-0 min-[390px]:text-right",
    "Mobile reprint label.",
    "<CardTitle className=\"break-words\">{unit.itemName}</CardTitle>",
    "<CardDescription className=\"break-all font-mono\">",
    "<Badge className=\"whitespace-normal break-words\">",
    "mt-1 break-all font-medium",
    "sm:grid-cols-2",
    "Print labels",
    "Print Labels PDF",
    "Bluetooth printer",
    "Save as PDF",
    "Bluetooth first. PDF fallback.",
    "h-auto min-h-12 w-full justify-center gap-2 whitespace-normal text-left",
    "flex min-w-0 flex-col items-start break-words leading-tight",
    "break-words text-xs font-bold uppercase",
    "mt-1 break-words text-sm font-semibold leading-tight",
    "break-words text-xl font-bold tabular-nums",
    "size-4 shrink-0",
    "One label per page.",
  ],
  "Stock mobile label reprint"
)
assert(
  !stockLabel.includes("line-clamp-2"),
  "Stock label preview must wrap product names instead of clipping them on phone width."
)

includesAll(
  ownerList + remoteQa,
  [
    "Test at phone width around 390px.",
    "no horizontal scrolling",
    "large Scan Barcode button",
    "Photo required. Request only; stock is not deducted now.",
    "Stock goes on supplier hold until manager approval.",
    "Stock take is active for this item/manufacturer/location. You can continue, but this movement will be recorded.",
    "Print labels",
    "Print Labels PDF",
  ],
  "Stock mobile owner QA docs"
)

includesAll(
  stockActions,
  [
    "function friendlyStockErrorMessage",
    "duplicate key value",
    "violates row-level security",
    "Choose an allowed stock location.",
    "Action could not be saved. Check the details and try again.",
    "return failure(friendlyStockErrorMessage(error))",
  ],
  "Stock worker-friendly action errors"
)

assert(
  packageJson.includes("stock-mobile-ux-coverage.mjs"),
  "npm run smoke must include stock-mobile-ux-coverage.mjs"
)

console.log("Stock mobile UX coverage checks passed.")
