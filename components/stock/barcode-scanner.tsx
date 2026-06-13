"use client"

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"
import { Camera, Loader2, ScanBarcode, X } from "lucide-react"
import { useEffect, useRef, useState, type Ref } from "react"

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
  continuousScan?: boolean
  inputRef?: Ref<HTMLInputElement>
  placeholder?: string
}

type BarcodeScannerButtonProps = {
  onDetected: (value: string) => void
  continuous?: boolean
}

export function BarcodeField({
  id,
  name,
  label,
  value,
  onChange,
  onScan,
  continuousScan = false,
  inputRef,
  placeholder,
}: BarcodeFieldProps) {
  const [recentScans, setRecentScans] = useState<string[]>([])
  const handleDetected = (detectedValue: string) => {
    setRecentScans((current) =>
      [
        detectedValue,
        ...current.filter((scan) => scan !== detectedValue),
      ].slice(0, 5)
    )
    ;(onScan ?? onChange)(detectedValue)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-end min-[390px]:justify-between">
        <Label htmlFor={id}>{label}</Label>
        <BarcodeScanner
          onDetected={handleDetected}
          continuous={continuousScan}
        />
      </div>
      <Input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <div className="flex flex-col gap-1 text-xs text-muted-foreground min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
        <span>Manual fallback: type or paste the barcode here.</span>
      </div>
      {recentScans.length > 0 ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
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

function playSuccessFeedback() {
  navigator.vibrate?.(40)

  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext

  if (!AudioContextClass) {
    return
  }

  const audio = new AudioContextClass()
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(880, audio.currentTime)
  gain.gain.setValueAtTime(0.05, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.08)

  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + 0.08)
  oscillator.addEventListener("ended", () => {
    void audio.close()
  })
}

export function BarcodeScanner({
  onDetected,
  continuous = false,
}: BarcodeScannerButtonProps) {
  const [open, setOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState("")
  const [lastValue, setLastValue] = useState("")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const onDetectedRef = useRef(onDetected)
  const lastDetectedRef = useRef<{ value: string; at: number } | null>(null)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    if (!open) {
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    const videoElement = video
    let cancelled = false

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera scanning is not available in this browser.")
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

            if (!text || cancelled) {
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
            playSuccessFeedback()
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
          setError(
            scanError instanceof Error
              ? scanError.message
              : "Unable to start the camera scanner."
          )
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
      controlsRef.current?.stop()
      controlsRef.current = null

      const stream = videoElement.srcObject

      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      videoElement.srcObject = null
    }
  }, [open, continuous])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="min-h-11 w-full gap-2 min-[390px]:w-auto"
        onClick={() => setOpen(true)}
        title="Scan barcode with camera"
      >
        <ScanBarcode className="size-4" />
        Scan Barcode
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
          <div className="max-h-[calc(100dvh-24px)] w-full max-w-xl overflow-y-auto rounded-lg border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2 font-semibold">
                <Camera className="size-4" />
                Scan barcode
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                title="Close scanner"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-3 p-4">
              <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Allow camera permission to scan. If permission is blocked,
                close this window and use the manual fallback field.
              </div>
              {continuous ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Continuous scan is on. Keep scanning labels, then close this
                  window when the batch is done.
                </div>
              ) : null}
              <div className="relative overflow-hidden rounded-md border bg-black">
                <video
                  ref={videoRef}
                  className="aspect-[4/3] w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                {starting ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Starting camera...
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {lastValue ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Last scan: {lastValue}
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
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
