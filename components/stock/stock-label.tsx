"use client"

import { FileDown, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { encodeCode128 } from "@/lib/stock/code128"
import { cn } from "@/lib/utils"

export type StockLabelSizeId = "thermal-50x30"

export type StockLabelPrintData = {
  id: string
  companyName: string
  productName: string
  weightKg: string
  barcode: string
}

export const stockLabelSizes: Record<
  StockLabelSizeId,
  {
    label: string
    width: string
    height: string
    pageSize: string
  }
> = {
  "thermal-50x30": {
    label: "50mm x 30mm",
    width: "50mm",
    height: "30mm",
    pageSize: "50mm 30mm",
  },
}

export const defaultStockLabelSize: StockLabelSizeId = "thermal-50x30"

function printLabels() {
  window.print()
}

function StockLabelActionText({
  title,
  helper,
}: {
  title: string
  helper: string
}) {
  return (
    <span className="flex min-w-0 flex-col items-start break-words leading-tight">
      <span className="break-words">{title}</span>
      <span className="break-words text-[11px] font-normal opacity-80">
        {helper}
      </span>
    </span>
  )
}

function Code128Barcode({
  barcode,
  className,
}: {
  barcode: string
  className?: string
}) {
  const encoded = encodeCode128(barcode)

  if (!encoded) {
    return (
      <div
        role="img"
        aria-label={`Barcode ${barcode}`}
        className={cn(
          "flex items-center justify-center border border-black text-[8px] font-bold",
          className
        )}
      >
        {barcode}
      </div>
    )
  }

  return (
    <svg
      role="img"
      aria-label={`Barcode ${barcode}`}
      className={cn("block w-full text-black", className)}
      viewBox={`0 0 ${encoded.width} 40`}
      preserveAspectRatio="none"
    >
      <rect width={encoded.width} height="40" fill="white" />
      {encoded.bars.map((bar, index) => (
        <rect
          key={`${bar.x}-${bar.width}-${index}`}
          x={bar.x}
          y="0"
          width={bar.width}
          height="40"
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

export function StockLabelPrintActions({
  disabled = false,
  className,
  onPrint = printLabels,
}: {
  disabled?: boolean
  className?: string
  onPrint?: () => void
}) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <Button
        type="button"
        aria-label="Print labels with phone print sheet or Bluetooth printer"
        onClick={onPrint}
        disabled={disabled}
        className="h-auto min-h-12 w-full justify-center gap-2 whitespace-normal text-left"
      >
        <Printer className="size-4 shrink-0" />
        <StockLabelActionText
          title="Print labels"
          helper="Bluetooth printer"
        />
      </Button>
      <Button
        type="button"
        aria-label="Print labels PDF"
        variant="outline"
        onClick={onPrint}
        disabled={disabled}
        className="h-auto min-h-12 w-full justify-center gap-2 whitespace-normal text-left"
      >
        <FileDown className="size-4 shrink-0" />
        <StockLabelActionText title="Print Labels PDF" helper="Save as PDF" />
      </Button>
    </div>
  )
}

export function StockLabelPrintNote({
  sizeId = defaultStockLabelSize,
}: {
  sizeId?: StockLabelSizeId
}) {
  const size = stockLabelSizes[sizeId]

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm break-words text-emerald-800">
      <div className="font-medium">Bluetooth first. PDF fallback.</div>
      <div className="mt-1">{size.label}. One label per page.</div>
    </div>
  )
}

export function StockLabelPreview({
  label,
  sizeId = defaultStockLabelSize,
  className,
}: {
  label: StockLabelPrintData
  sizeId?: StockLabelSizeId
  className?: string
}) {
  const size = stockLabelSizes[sizeId]

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[280px] flex-col justify-between rounded border bg-white p-3 text-black shadow-xs",
        className
      )}
      style={{ aspectRatio: `${Number.parseFloat(size.width)} / ${Number.parseFloat(size.height)}` }}
    >
      <div>
        <div className="break-words text-xs font-bold uppercase">
          {label.companyName}
        </div>
        <div className="mt-1 break-words text-sm font-semibold leading-tight">
          {label.productName}
        </div>
      </div>
      <div className="break-words text-xl font-bold tabular-nums">
        {label.weightKg} kg
      </div>
      <div className="space-y-1">
        <Code128Barcode barcode={label.barcode} className="h-9" />
        <div className="break-all text-center text-[10px] font-semibold tracking-normal">
          {label.barcode}
        </div>
      </div>
    </div>
  )
}

export function StockLabelPrintArea({
  labels,
  sizeId = defaultStockLabelSize,
}: {
  labels: StockLabelPrintData[]
  sizeId?: StockLabelSizeId
}) {
  const size = stockLabelSizes[sizeId]

  if (labels.length === 0) {
    return null
  }

  return (
    <div className="stock-label-print-root hidden print:block">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .stock-label-print-root,
          .stock-label-print-root * {
            visibility: visible;
          }

          .stock-label-print-root {
            display: block !important;
            position: absolute;
            inset: 0;
            background: white;
          }

          @page { size: ${size.pageSize}; margin: 0; }
          body { margin: 0; }
          .stock-label-page {
            width: ${size.width};
            height: ${size.height};
            page-break-after: always;
            break-after: page;
            padding: 2mm;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
            color: black;
            background: white;
          }
          .stock-label-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .stock-label-company { font-size: 9pt; font-weight: 700; text-transform: uppercase; }
          .stock-label-product { font-size: 8pt; margin-top: 1mm; font-weight: 700; line-height: 1.1; }
          .stock-label-weight { font-size: 10pt; font-weight: 700; margin-top: 1mm; }
          .stock-label-bars {
            height: 8mm;
            width: 100%;
            display: block;
            margin-top: 1mm;
          }
          .stock-label-barcode { font-size: 7pt; letter-spacing: 0; margin-top: 1mm; word-break: break-all; text-align: center; }
        }
      `}</style>
      {labels.map((label) => (
        <div key={label.id} className="stock-label-page">
          <div className="stock-label-company">{label.companyName}</div>
          <div className="stock-label-product">{label.productName}</div>
          <div className="stock-label-weight">{label.weightKg} kg</div>
          <Code128Barcode barcode={label.barcode} className="stock-label-bars" />
          <div className="stock-label-barcode">{label.barcode}</div>
        </div>
      ))}
    </div>
  )
}
