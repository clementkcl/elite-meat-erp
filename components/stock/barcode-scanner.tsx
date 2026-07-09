"use client"

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"
import { Camera, Loader2, ScanBarcode, X } from "lucide-react"
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type BarcodeFieldProps = {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  onScan?: (value: string) => void
  scanContextSummary?: string
  scanSummary?: string
  scanTotalSummary?: string
  scanFeedbackMessage?: string
  scanFeedbackStatus?: "success" | "warning" | "error" | ""
  scanActionSlot?: ReactNode
  continuousScan?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
  placeholder?: string
  helperText?: string
  scanButtonLabel?: string
  disabled?: boolean
  disabledReason?: string
}

type BarcodeScannerButtonProps = {
  onDetected: (value: string) => void
  onManualFallback?: () => void
  scanContextSummary?: string
  scanSummary?: string
  scanTotalSummary?: string
  scanFeedbackMessage?: string
  scanFeedbackStatus?: "success" | "warning" | "error" | ""
  scanActionSlot?: ReactNode
  continuous?: boolean
  scanButtonLabel?: string
  disabled?: boolean
  disabledReason?: string
  disabledReasonId?: string
}

const offlineScanMessage = "Connection lost. Please reconnect before scanning."

function useBrowserOnline() {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}

export function BarcodeField({
  id,
  name,
  label,
  value,
  onChange,
  onScan,
  scanContextSummary = "",
  scanSummary = "",
  scanTotalSummary = "",
  scanFeedbackMessage = "",
  scanFeedbackStatus = "",
  scanActionSlot,
  continuousScan = false,
  inputRef,
  placeholder,
  helperText = "Type barcode if needed.",
  scanButtonLabel = "Scan Barcode",
  disabled = false,
  disabledReason = "",
}: BarcodeFieldProps) {
  const [recentScans, setRecentScans] = useState<string[]>([])
  const isOnline = useBrowserOnline()
  const generatedId = useId()
  const internalInputRef = useRef<HTMLInputElement | null>(null)
  const manualInputRef = inputRef ?? internalInputRef
  const effectiveDisabled = disabled || !isOnline
  const effectiveDisabledReason = !isOnline
    ? offlineScanMessage
    : disabledReason
  const disabledReasonId =
    effectiveDisabled && effectiveDisabledReason
      ? `${id || generatedId}-disabled-reason`
      : undefined
  const isConnectionLost = effectiveDisabledReason.startsWith("Connection lost")
  const handleDetected = (detectedValue: string) => {
    setRecentScans((current) =>
      [
        detectedValue,
        ...current.filter((scan) => scan !== detectedValue),
      ].slice(0, 5)
    )
    ;(onScan ?? onChange)(detectedValue)
  }
  const handleManualKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const typedValue = event.currentTarget.value

    if (event.key !== "Enter" || !typedValue.trim()) {
      return
    }

    event.preventDefault()
    handleDetected(typedValue)
    queueMicrotask(() => manualInputRef.current?.select())
  }
  const focusManualInput = () => {
    queueMicrotask(() => {
      manualInputRef.current?.focus()
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <Label htmlFor={id}>{label}</Label>
        <BarcodeScanner
          onDetected={handleDetected}
          onManualFallback={focusManualInput}
          scanContextSummary={scanContextSummary}
          scanSummary={scanSummary}
          scanTotalSummary={scanTotalSummary}
          scanFeedbackMessage={scanFeedbackMessage}
          scanFeedbackStatus={scanFeedbackStatus}
          scanActionSlot={scanActionSlot}
          continuous={continuousScan}
          scanButtonLabel={scanButtonLabel}
          disabled={effectiveDisabled}
          disabledReason={effectiveDisabledReason}
          disabledReasonId={disabledReasonId}
        />
      </div>
      <Input
        ref={manualInputRef}
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleManualKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="none"
        inputMode="numeric"
        enterKeyHint="done"
        pattern="[0-9]*"
        spellCheck={false}
        disabled={effectiveDisabled}
        aria-describedby={disabledReasonId}
        className="min-h-11 text-base sm:text-sm"
      />
      {helperText ? (
        <div className="flex flex-col gap-1 text-xs break-words text-muted-foreground">
          <span>{helperText}</span>
        </div>
      ) : null}
      {effectiveDisabled && effectiveDisabledReason ? (
        <div
          id={disabledReasonId}
          role={isConnectionLost ? "alert" : "status"}
          aria-live={isConnectionLost ? "assertive" : "polite"}
          className={
            isConnectionLost
              ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium break-words text-red-700"
              : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium break-words text-amber-800"
          }
        >
          {effectiveDisabledReason}
        </div>
      ) : null}
      {recentScans.length > 0 ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs break-words text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="font-medium">Recent scans</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {recentScans.map((scan) => (
              <span
                key={scan}
                className="max-w-full break-all rounded border border-emerald-200 bg-white px-2 py-1 font-mono text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              >
                {scan}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function cameraErrorMessage(scanError: unknown) {
  if (!(scanError instanceof Error)) {
    return "Camera could not start. Use manual entry."
  }

  if (scanError.name === "NotAllowedError") {
    return "Camera blocked. Allow camera or use manual."
  }

  if (scanError.name === "NotFoundError") {
    return "No camera found. Use manual entry."
  }

  if (scanError.name === "NotReadableError") {
    return "Camera is busy. Close other camera apps and try again."
  }

  if (scanError.name === "SecurityError") {
    return "Camera needs a secure browser page. Use manual entry."
  }

  return "Camera could not start. Use manual entry."
}

export function BarcodeScanner({
  onDetected,
  onManualFallback,
  scanContextSummary = "",
  scanSummary = "",
  scanTotalSummary = "",
  scanFeedbackMessage = "",
  scanFeedbackStatus = "",
  scanActionSlot,
  continuous = false,
  scanButtonLabel = "Scan Barcode",
  disabled = false,
  disabledReason = "",
  disabledReasonId,
}: BarcodeScannerButtonProps) {
  const [open, setOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState("")
  const [lastValue, setLastValue] = useState("")
  const [sessionScanCount, setSessionScanCount] = useState(0)
  const [scannerRunId, setScannerRunId] = useState(0)
  const [externalScanValue, setExternalScanValue] = useState("")
  const isOnline = useBrowserOnline()
  const generatedId = useId()
  const dialogTitleId = `${generatedId}-scanner-title`
  const dialogDescriptionId = `${generatedId}-scanner-description`
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const externalScannerInputRef = useRef<HTMLInputElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const onDetectedRef = useRef(onDetected)
  const onManualFallbackRef = useRef(onManualFallback)
  const lastDetectedRef = useRef<{ value: string; at: number } | null>(null)
  const isOnlineRef = useRef(isOnline)
  const wasOpenRef = useRef(false)
  const manualFallbackRequestedRef = useRef(false)
  const effectiveDisabled = disabled || !isOnline
  const effectiveDisabledReason = !isOnline
    ? offlineScanMessage
    : disabledReason
  const effectiveDisabledReasonId =
    effectiveDisabled && effectiveDisabledReason
      ? disabledReasonId ?? `${generatedId}-disabled-reason`
      : undefined
  const cameraFrameTone = error
    ? "error"
    : scanFeedbackStatus === "success"
      ? "success"
      : scanFeedbackStatus === "error"
        ? "error"
        : scanFeedbackStatus === "warning"
          ? "warning"
          : "idle"
  const cameraFrameClass =
    cameraFrameTone === "success"
      ? "border-emerald-400 shadow-[0_0_0_999px_rgba(5,150,105,0.18)]"
      : cameraFrameTone === "error"
        ? "border-red-400 shadow-[0_0_0_999px_rgba(220,38,38,0.18)]"
        : cameraFrameTone === "warning"
          ? "border-amber-300 shadow-[0_0_0_999px_rgba(217,119,6,0.16)]"
          : "border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]"
  const cameraFrameMessage =
    cameraFrameTone === "success"
      ? scanFeedbackMessage
        ? scanFeedbackMessage
        : scanSummary
        ? `Saved: ${scanSummary}`
        : "Scan saved. Keep scanning."
      : cameraFrameTone === "error"
        ? scanFeedbackMessage || "Scan failed. Try again."
      : cameraFrameTone === "warning"
          ? scanFeedbackMessage || "Check scan before saving."
          : "Keep barcode inside the box."
  const lastScanToneClass =
    cameraFrameTone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : cameraFrameTone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700"
  const lastScanStatusText =
    cameraFrameTone === "error"
      ? "Blocked. Try again."
      : cameraFrameTone === "warning"
        ? "Check scan."
        : "Detected. Checking scan."

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    onManualFallbackRef.current = onManualFallback
  }, [onManualFallback])

  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])

  useEffect(() => {
    if (!effectiveDisabled) {
      return
    }

    controlsRef.current?.stop()
    controlsRef.current = null
    queueMicrotask(() => {
      setOpen(false)
      setStarting(false)
    })
  }, [effectiveDisabled])

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true
      return
    }

    if (!wasOpenRef.current || effectiveDisabled) {
      return
    }

    wasOpenRef.current = false

    if (manualFallbackRequestedRef.current) {
      manualFallbackRequestedRef.current = false
      queueMicrotask(() => {
        onManualFallbackRef.current?.()
      })
      return
    }

    queueMicrotask(() => {
      triggerRef.current?.focus()
    })
  }, [open, effectiveDisabled])

  function useManualEntry() {
    manualFallbackRequestedRef.current = true
    setOpen(false)
  }

  function openScanner() {
    lastDetectedRef.current = null
    setError("")
    setLastValue("")
    setSessionScanCount(0)
    setExternalScanValue("")
    setOpen(true)
  }

  function retryScanner() {
    lastDetectedRef.current = null
    setError("")
    setLastValue("")
    setSessionScanCount(0)
    setExternalScanValue("")
    setScannerRunId((id) => id + 1)
  }

  function submitExternalScannerValue(value: string) {
    const text = value.trim()

    if (!text || !isOnlineRef.current) {
      return
    }

    const now = Date.now()
    const lastDetected = lastDetectedRef.current

    if (
      continuous &&
      lastDetected?.value === text &&
      now - lastDetected.at < 1500
    ) {
      setExternalScanValue("")
      return
    }

    lastDetectedRef.current = { value: text, at: now }
    setLastValue(text)
    setSessionScanCount((count) => count + 1)
    onDetectedRef.current(text)

    if (!continuous) {
      setOpen(false)
      return
    }

    setExternalScanValue("")
    queueMicrotask(() => {
      externalScannerInputRef.current?.focus()
    })
  }

  function handleExternalScannerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const typedValue = event.currentTarget.value

    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    submitExternalScannerValue(typedValue)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    queueMicrotask(() => {
      if (externalScannerInputRef.current) {
        externalScannerInputRef.current.focus()
        return
      }

      dialogRef.current?.focus()
    })

    const video = videoRef.current
    if (!video) {
      return
    }

    const videoElement = video
    let cancelled = false

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera scanning is not available. Use manual entry.")
        return
      }

      setError("")
      setStarting(true)

      try {
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoElement,
          (result, _scanError, scannerControls) => {
            const text = result?.getText().trim()

            if (!text || cancelled || !isOnlineRef.current) {
              return
            }

            const now = Date.now()
            const lastDetected = lastDetectedRef.current

            if (
              continuous &&
              lastDetected?.value === text &&
              now - lastDetected.at < 1500
            ) {
              return
            }

            lastDetectedRef.current = { value: text, at: now }
            setLastValue(text)
            setSessionScanCount((count) => count + 1)
            onDetectedRef.current(text)

            if (!continuous) {
              scannerControls.stop()
              controlsRef.current = null
              setOpen(false)
            }
          }
        )

        if (cancelled) {
          controls.stop()
          return
        }

        controlsRef.current = controls
      } catch (scanError) {
        if (!cancelled) {
          setError(cameraErrorMessage(scanError))
        }
      } finally {
        if (!cancelled) {
          setStarting(false)
        }
      }
    }

    startScanner()

    return () => {
      cancelled = true
      document.body.style.overflow = previousBodyOverflow
      controlsRef.current?.stop()
      controlsRef.current = null

      const stream = videoElement.srcObject

      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      videoElement.srcObject = null
    }
  }, [open, continuous, scannerRunId])

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="lg"
        className="min-h-12 w-full gap-2 text-base sm:w-auto sm:text-sm"
        onClick={openScanner}
        disabled={effectiveDisabled}
        title={
          effectiveDisabled && effectiveDisabledReason
            ? effectiveDisabledReason
            : "Scan barcode with camera"
        }
        aria-label={
          effectiveDisabled && effectiveDisabledReason
            ? `Scan barcode unavailable. ${effectiveDisabledReason}`
            : "Scan barcode with camera"
        }
        aria-describedby={effectiveDisabledReasonId}
      >
        <ScanBarcode className="size-4" />
        {scanButtonLabel}
      </Button>

      {effectiveDisabled &&
      effectiveDisabledReason &&
      effectiveDisabledReasonId &&
      !disabledReasonId ? (
        <div
          id={effectiveDisabledReasonId}
          role="alert"
          aria-live="assertive"
          className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium break-words text-red-700"
        >
          {effectiveDisabledReason}
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescriptionId}
            tabIndex={-1}
            className="max-h-[calc(100dvh-24px)] w-full max-w-xl overflow-y-auto rounded-lg border bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div
                id={dialogTitleId}
                className="flex items-center gap-2 font-semibold"
              >
                <Camera className="size-4" />
                Scan barcode
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11"
                onClick={() => setOpen(false)}
                title="Close scanner"
                aria-label="Close scanner"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-3 p-4">
              <div
                id={dialogDescriptionId}
                className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm break-words text-muted-foreground"
              >
                Allow camera. Use manual if blocked.
              </div>
              {scanContextSummary ? (
                <div
                  data-stock-action="scanner-locked-inbound-session"
                  aria-live="polite"
                  className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm break-words text-sky-800"
                >
                  <div className="text-xs font-semibold uppercase">
                    Locked inbound session
                  </div>
                  <div className="mt-1 whitespace-pre-line break-words font-medium">
                    {scanContextSummary}
                  </div>
                </div>
              ) : null}
              {continuous ? (
                <div
                  data-stock-action="continuous-scan-auto-save-cue"
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm break-words text-emerald-700"
                >
                  Stays open until Close.
                </div>
              ) : (
                <div
                  data-stock-action="one-sample-scan-cue"
                  className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm break-words text-sky-800"
                >
                  One sample only.
                </div>
              )}
              <div
                data-stock-action="scanner-popup-external-input"
                className="rounded-md border bg-background px-3 py-2"
              >
                <Label htmlFor={`${generatedId}-external-scanner`}>
                  External scanner input
                </Label>
                <Input
                  ref={externalScannerInputRef}
                  id={`${generatedId}-external-scanner`}
                  value={externalScanValue}
                  onChange={(event) => setExternalScanValue(event.target.value)}
                  onKeyDown={handleExternalScannerKeyDown}
                  placeholder="Scan with handheld scanner"
                  autoComplete="off"
                  autoCapitalize="none"
                  inputMode="numeric"
                  enterKeyHint="done"
                  pattern="[0-9]*"
                  spellCheck={false}
                  disabled={!isOnline}
                  className="mt-2 min-h-11 text-base sm:text-sm"
                />
                <p className="mt-1 text-xs break-words text-muted-foreground">
                  Enter sends scan{continuous ? ". Stays ready." : "."}
                </p>
              </div>
              {!isOnline ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium break-words text-red-700"
                >
                  {offlineScanMessage}
                </div>
              ) : null}
              {scanFeedbackMessage ? (
                <div
                  data-stock-action="scanner-live-scan-feedback"
                  role={scanFeedbackStatus === "error" ? "alert" : "status"}
                  aria-live={
                    scanFeedbackStatus === "error" ? "assertive" : "polite"
                  }
                  className={[
                    "rounded-md border px-3 py-2 text-sm font-medium break-words",
                    scanFeedbackStatus === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : scanFeedbackStatus === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-red-200 bg-red-50 text-red-700",
                  ].join(" ")}
                >
                  {scanFeedbackMessage}
                </div>
              ) : null}
              {scanActionSlot ? (
                <div
                  data-stock-action="scanner-primary-scan-action-slot"
                  className="rounded-md border bg-background px-3 py-2"
                >
                  {scanActionSlot}
                </div>
              ) : null}
              {scanContextSummary ||
              scanSummary ||
              scanTotalSummary ||
              continuous ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {scanContextSummary ? (
                    <div
                      data-stock-action="scanner-current-setup-top"
                      aria-live="polite"
                      className="rounded-md border-2 border-sky-300 bg-sky-50 px-4 py-3 text-sm break-words text-sky-800"
                    >
                      <div className="text-xs font-semibold uppercase">
                        Current inbound setup
                      </div>
                      <div className="mt-1 whitespace-pre-line break-words text-base font-semibold leading-tight">
                        {scanContextSummary}
                      </div>
                    </div>
                  ) : null}
                  {scanSummary ? (
                    <div
                      data-stock-action="scanner-last-saved-item-weight-top"
                      aria-live="polite"
                      className="rounded-md border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm break-words text-emerald-800"
                    >
                      <div className="text-xs font-semibold uppercase">
                        Last saved item and weight
                      </div>
                      <div className="mt-1 break-words text-lg font-semibold leading-tight">
                        {scanSummary}
                      </div>
                    </div>
                  ) : null}
                  {scanTotalSummary ? (
                    <div
                      data-stock-action="scanner-session-total-top"
                      aria-live="polite"
                      className="rounded-md border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm break-words text-emerald-800"
                    >
                      <div className="text-xs font-semibold uppercase">
                        Inbound session total
                      </div>
                      <div className="mt-1 text-xs font-medium">
                        Live barcode count and session weight
                      </div>
                      <div className="mt-1 break-words text-lg font-semibold leading-tight">
                        {scanTotalSummary}
                      </div>
                    </div>
                  ) : null}
                  {continuous ? (
                    <div
                      data-stock-action="scanner-camera-session-count-top"
                      aria-live="polite"
                      className="rounded-md border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm break-words text-emerald-800"
                    >
                      <div className="text-xs font-semibold uppercase">
                        Camera detections
                      </div>
                      <div className="mt-1 text-2xl font-semibold tabular-nums">
                        {sessionScanCount}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div
                data-stock-action="scanner-camera-window"
                className="relative overflow-hidden rounded-md border bg-black"
              >
                <video
                  ref={videoRef}
                  className="aspect-[4/3] w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                <div
                  data-stock-action="scanner-camera-feedback-frame"
                  className={[
                    "pointer-events-none absolute inset-6 rounded-lg border-4",
                    cameraFrameClass,
                  ].join(" ")}
                />
                <div className="pointer-events-none absolute inset-x-8 bottom-6 rounded bg-black/60 px-3 py-2 text-center text-xs font-medium text-white">
                  {cameraFrameMessage}
                </div>
                {starting ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white"
                  >
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Starting camera...
                  </div>
                ) : null}
              </div>

              {error ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm break-words text-red-700"
                >
                  {error}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full border-red-200 bg-white text-red-700 hover:bg-red-50"
                      onClick={retryScanner}
                      disabled={starting || !isOnline}
                    >
                      Try camera again
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full border-red-200 bg-white text-red-700 hover:bg-red-50"
                      onClick={useManualEntry}
                    >
                      Use manual entry
                    </Button>
                  </div>
                </div>
              ) : null}

              {lastValue ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div
                    data-stock-action="scanner-last-scanned-barcode"
                    role={cameraFrameTone === "error" ? "alert" : "status"}
                    aria-live={
                      cameraFrameTone === "error" ? "assertive" : "polite"
                    }
                    className={[
                      "rounded-md border px-3 py-2 text-sm break-words",
                      lastScanToneClass,
                    ].join(" ")}
                  >
                    <div className="text-xs font-semibold uppercase">
                      Last scanned barcode
                    </div>
                    <div className="font-medium">Last scan</div>
                    <div className="mt-1 break-all font-mono text-xs">
                      {lastValue}
                    </div>
                      {continuous ? (
                        <div className="mt-2 text-xs font-medium">
                        {lastScanStatusText}
                        </div>
                      ) : null}
                  </div>
                  <div
                    aria-live="polite"
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm break-words text-emerald-700"
                  >
                    <div className="font-medium">Camera detections</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {sessionScanCount}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full"
                  onClick={useManualEntry}
                >
                  Use manual entry
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full"
                  onClick={() => setOpen(false)}
                  aria-label="Close scanner"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
