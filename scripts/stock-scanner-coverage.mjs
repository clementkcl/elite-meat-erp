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

const scanner = read("components/stock/barcode-scanner.tsx")
const workflowForms = read("components/stock/workflow-forms.tsx")
const stockPage = read("components/stock/stock-page.tsx")
const packageJson = read("package.json")

includesAll(
  scanner,
  [
    "@zxing/browser",
    "BrowserMultiFormatReader",
    "decodeFromConstraints",
    "navigator.mediaDevices?.getUserMedia",
    "facingMode: { ideal: \"environment\" }",
    "scanContextSummary?: string",
    "scanSummary?: string",
    "scanTotalSummary?: string",
    "scanFeedbackMessage?: string",
    "scanFeedbackStatus?: \"success\" | \"warning\" | \"error\" | \"\"",
    "scanActionSlot?: ReactNode",
    "helperText?: string",
    "scanButtonLabel?: string",
    "helperText = \"Manual entry: paste barcode if camera cannot scan.\"",
    "scanButtonLabel = \"Scan Barcode\"",
    "<span>{helperText}</span>",
    "continuous",
    "lastDetectedRef",
    "navigator.vibrate?.(40)",
    "AudioContext",
    "Scan Barcode",
    "{scanButtonLabel}",
    "size=\"lg\"",
    "min-h-12 w-full gap-2 text-base sm:w-auto",
    "min-h-11 text-base sm:text-sm",
    "inputMode=\"numeric\"",
    "enterKeyHint=\"done\"",
    "pattern=\"[0-9]*\"",
    "autoCapitalize=\"none\"",
    "spellCheck={false}",
    "Manual entry: paste barcode if camera cannot scan.",
    "const internalInputRef = useRef<HTMLInputElement | null>(null)",
    "const externalScannerInputRef = useRef<HTMLInputElement | null>(null)",
    "const [externalScanValue, setExternalScanValue] = useState(\"\")",
    "manualInputRef",
    "const handleManualKeyDown",
    "const typedValue = event.currentTarget.value",
    "event.key !== \"Enter\"",
    "handleDetected(typedValue)",
    "onKeyDown={handleManualKeyDown}",
    "function submitExternalScannerValue",
    "function handleExternalScannerKeyDown",
    "submitExternalScannerValue(typedValue)",
    "lastDetectedRef.current = { value: text, at: now }",
    "externalScannerInputRef.current?.focus()",
    "const focusManualInput",
    "onManualFallback={focusManualInput}",
    "function useBrowserOnline",
    "const isOnline = useBrowserOnline()",
    "const effectiveDisabled = disabled || !isOnline",
    "const effectiveDisabledReason = !isOnline",
    "disabled={effectiveDisabled}",
    "{effectiveDisabledReason}",
    "recentScans",
    "Recent scans",
    "slice(0, 5)",
    "Allow camera. Use rear camera if available.",
    "If blocked, tap",
    "Use manual entry.",
    "data-stock-action=\"scanner-locked-inbound-session\"",
    "Locked inbound session",
    "Keep barcode inside the box.",
    "Scanner stays open until Close.",
    "data-stock-action=\"continuous-scan-auto-save-cue\"",
    "data-stock-action=\"one-sample-scan-cue\"",
    "One sample scan. Camera closes after one barcode.",
    "data-stock-action=\"scanner-popup-external-input\"",
    "External scanner input",
    "Scan with handheld scanner",
    "Keep cursor here for handheld scanner.",
    "Enter sends the scan",
    "disabled={!isOnline}",
    "const offlineScanMessage = \"Connection lost. Please reconnect before scanning.\"",
    "navigator.onLine",
    "window.addEventListener(\"online\", handleOnline)",
    "window.addEventListener(\"offline\", handleOffline)",
    "const effectiveDisabled = disabled || !isOnline",
    "isOnlineRef.current",
    "!isOnlineRef.current",
    "function cameraErrorMessage",
    "Camera blocked. Allow camera permission or use manual entry.",
    "No camera found. Use manual entry.",
    "Camera is busy. Close other camera apps and try again.",
    "Camera needs a secure browser page. Use manual entry.",
    "Camera could not start. Use manual entry.",
    "Camera scanning is not available. Use manual entry.",
    "getTracks().forEach",
    "track.stop()",
    "videoElement.srcObject = null",
    "setOpen(false)",
    "if (!effectiveDisabled)",
    "controlsRef.current?.stop()",
    "setStarting(false)",
    "min-h-11 min-w-11",
    "min-h-11 w-full",
    "role=\"dialog\"",
    "aria-modal=\"true\"",
    "aria-labelledby={dialogTitleId}",
    "aria-describedby={dialogDescriptionId}",
    "dialogRef.current?.focus()",
    "const triggerRef = useRef<HTMLButtonElement | null>(null)",
    "const wasOpenRef = useRef(false)",
    "const manualFallbackRequestedRef = useRef(false)",
    "onManualFallbackRef.current?.()",
    "triggerRef.current?.focus()",
    "ref={triggerRef}",
    "const previousBodyOverflow = document.body.style.overflow",
    "document.body.style.overflow = \"hidden\"",
    "document.body.style.overflow = previousBodyOverflow",
    "Scan barcode unavailable.",
    "disabledReasonId",
    "aria-describedby={disabledReasonId}",
    ": \"Scan barcode with camera\"",
    "aria-label=\"Close scanner\"",
    "Use manual entry",
    "function useManualEntry()",
    "role=\"alert\"",
    "aria-live=\"assertive\"",
    "aria-live=\"polite\"",
    "Last scan",
    "scannerRunId",
    "function retryScanner()",
    "setScannerRunId((id) => id + 1)",
    "[open, continuous, scannerRunId]",
    "Try camera again",
    "onClick={retryScanner}",
    "mt-3 grid gap-2 sm:grid-cols-2",
    "onClick={useManualEntry}",
    "Starting camera...",
    "role=\"status\"",
    "aria-live=\"polite\"",
    "lastDetectedRef.current = null",
    "setError(\"\")",
    "sessionScanCount",
    "setSessionScanCount(0)",
    "setSessionScanCount((count) => count + 1)",
    "Camera session scans",
    "Detected. Ready for next scan.",
    "Current inbound setup",
    "scanContextSummary ||",
    "data-stock-action=\"scanner-current-setup-top\"",
    "data-stock-action=\"scanner-live-scan-feedback\"",
    "scanFeedbackStatus === \"error\" ? \"alert\" : \"status\"",
    "{scanFeedbackMessage}",
    "scanFeedbackMessage || \"Scan failed. Try again.\"",
    "scanFeedbackMessage || \"Check scan before saving.\"",
    "data-stock-action=\"scanner-primary-scan-action-slot\"",
    "data-stock-action=\"scanner-last-saved-item-weight-top\"",
    "data-stock-action=\"scanner-session-total-top\"",
    "data-stock-action=\"scanner-camera-session-count-top\"",
    "Camera window scans",
    "Last saved item and weight",
    "border-2 border-emerald-300",
    "text-lg font-semibold leading-tight",
    "Inbound session total",
    "scanActionSlot ?",
    "break-all font-mono text-xs",
  ],
  "Barcode scanner mobile UX"
)

assert(
  !scanner.includes("scanError.message"),
  "Barcode scanner must not show raw browser camera errors to workers."
)

assert(
  !scanner.includes("min-[390px]:grid-cols"),
  "Barcode scanner popup must stay one-column around 390px phone width."
)

assert(
  !scanner.includes("close this window and use"),
  "Barcode scanner helper copy must point workers to Use manual entry."
)
assert(
  !scanner.includes("Type barcode manually") &&
    !scanner.includes("type barcode manually"),
  "Barcode scanner errors must point workers to Use manual entry."
)
assert(
  !scanner.includes("Manual fallback: type or paste the barcode here."),
  "Barcode scanner helper copy must avoid making typing feel like the normal worker path."
)
assert(
  !scanner.includes("Camera scanning is not available in this browser."),
  "Barcode scanner browser-unavailable copy must point workers to Use manual entry."
)

const barcodeFieldCount = workflowForms.match(/<BarcodeField/g)?.length ?? 0

assert(
  barcodeFieldCount >= 6,
  `Expected BarcodeField in at least six stock scan workflows, found ${barcodeFieldCount}.`
)

for (const fragment of [
  "Supplier barcode inbound",
  "No supplier barcode inbound",
  "onScan={(value) => handleBarcodeChange(value, true)}",
  "continuousScan",
  "Confirm outbound batch",
  "setBarcodes((current) =>",
  "scanStockTakeBarcode(value",
  "TransferForm",
  "ReceiveTransferForm",
  "ReturnForm",
  "StockTakeWorkbench",
  "scanStockTakeBarcodeAction",
]) {
  assert(
    workflowForms.includes(fragment),
    `Stock scanner workflow wiring missing: ${fragment}`
  )
}

assert(
  !workflowForms.includes("continuousScan={inboundStep !== \"rule\"}"),
  "Inbound scanner popup must stay open on the barcode-rule page until Close."
)

for (const fragment of [
  '| "inbound"',
  '| "outbound"',
  '| "transfer"',
  '| "receive-transfer"',
  '| "return"',
  '| "stock-take"',
  "title: \"Barcode Inbound\"",
  "title: \"Outbound\"",
  "title: \"Stock Transfer\"",
  "title: \"Receive Transfer\"",
  "title: \"Stock Return\"",
  "title: \"Stock Take\"",
]) {
  assert(stockPage.includes(fragment), `Stock scan route missing: ${fragment}`)
}

assert(
  packageJson.includes("stock-scanner-coverage.mjs"),
  "npm run smoke must include stock-scanner-coverage.mjs"
)

console.log("Stock scanner coverage checks passed.")
