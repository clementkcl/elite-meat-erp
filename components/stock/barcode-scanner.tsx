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
  inputRef?: Ref<HTMLInputElement>
  placeholder?: string
}

type BarcodeScannerButtonProps = {
  onDetected: (value: string) => void
}

export function BarcodeField({
  id,
  name,
  label,
  value,
  onChange,
  onScan,
  inputRef,
  placeholder,
}: BarcodeFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <BarcodeScanner onDetected={onScan ?? onChange} />
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
    </div>
  )
}

export function BarcodeScanner({ onDetected }: BarcodeScannerButtonProps) {
  const [open, setOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState("")
  const [lastValue, setLastValue] = useState("")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

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

            scannerControls.stop()
            controlsRef.current = null
            setLastValue(text)
            onDetected(text)
            setOpen(false)
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
  }, [open, onDetected])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Scan barcode with camera"
      >
        <ScanBarcode className="size-4" />
        Scan Barcode
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-lg border bg-background shadow-xl">
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
