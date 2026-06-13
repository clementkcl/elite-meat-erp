"use client"

import { ArrowLeft, Printer } from "lucide-react"
import Link from "next/link"

import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { StockMovement, StockUnit } from "@/lib/stock/types"

type StockUnitDetail = StockUnit & {
  itemName: string
  itemCode: string
  brandName: string
  originName: string
  locationName: string
}

type MovementRow = Record<string, string | number | boolean>

const movementColumns: DataTableColumn<MovementRow>[] = [
  { key: "createdAt", header: "Time" },
  { key: "movementType", header: "Type" },
  { key: "fromLocation", header: "From" },
  { key: "toLocation", header: "To" },
  { key: "weightKg", header: "Kg", align: "right" },
  { key: "referenceNo", header: "Ref" },
]

function dateText(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function movementRows(movements: StockMovement[]): MovementRow[] {
  return movements.map((movement) => ({
    createdAt: dateText(movement.createdAt),
    movementType: movement.movementType,
    fromLocation: movement.fromLocation,
    toLocation: movement.toLocation,
    weightKg: movement.weightKg,
    referenceNo: movement.referenceNo,
  }))
}

export function StockUnitDetailView({
  unit,
  movements,
  demoMode,
}: {
  unit: StockUnitDetail
  movements: StockMovement[]
  demoMode: boolean
}) {
  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .stock-label-print-area,
          .stock-label-print-area * {
            visibility: visible;
          }

          .stock-label-print-area {
            position: fixed;
            inset: 0;
            width: 50mm;
            height: 30mm;
            padding: 2mm;
            background: white;
          }

          @page {
            size: 50mm 30mm;
            margin: 0;
          }
        }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="w-fit px-0">
            <Link href="/stock/balance">
              <ArrowLeft className="size-4" />
              Back to stock balance
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Stock Unit
              </h1>
              {demoMode ? <Badge variant="warning">Demo data</Badge> : null}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              View barcode status, movement history, and reprint the 50mm x 30mm
              thermal label.
            </p>
          </div>
        </div>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / Export PDF label
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{unit.itemName}</CardTitle>
            <CardDescription>{unit.barcode}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <Badge>{unit.status.replaceAll("_", " ")}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Weight</dt>
                <dd className="mt-1 font-medium tabular-nums">
                  {unit.netWeightKg.toLocaleString(undefined, {
                    maximumFractionDigits: 3,
                  })}{" "}
                  kg
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Item code</dt>
                <dd className="mt-1 font-medium">{unit.itemCode}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Brand</dt>
                <dd className="mt-1 font-medium">{unit.brandName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Origin</dt>
                <dd className="mt-1 font-medium">{unit.originName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="mt-1 font-medium">{unit.locationName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Inbound source</dt>
                <dd className="mt-1 font-medium">
                  {unit.inboundSource.replaceAll("_", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Received</dt>
                <dd className="mt-1 font-medium">{dateText(unit.receivedAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Batch</dt>
                <dd className="mt-1 font-medium">{unit.batchNo ?? "-"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Label preview</CardTitle>
            <CardDescription>
              Printed as one 50mm x 30mm label per page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="stock-label-print-area mx-auto flex aspect-[5/3] w-full max-w-[280px] flex-col justify-between rounded border bg-white p-3 text-black shadow-xs">
              <div>
                <div className="text-xs font-bold uppercase">Elite Meat</div>
                <div className="mt-1 line-clamp-2 text-sm font-semibold leading-tight">
                  {unit.itemName}
                </div>
              </div>
              <div className="text-xl font-bold tabular-nums">
                {unit.netWeightKg.toLocaleString(undefined, {
                  maximumFractionDigits: 3,
                })}{" "}
                kg
              </div>
              <div className="space-y-1">
                <div className="h-9 w-full bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,#fff_2px,#fff_4px,#000_4px,#000_5px,#fff_5px,#fff_7px)]" />
                <div className="break-all text-center text-[10px] font-semibold tracking-wide">
                  {unit.barcode}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement history</CardTitle>
          <CardDescription>
            Inbound, outbound, transfer, return, and adjustment records linked
            to this barcode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={movementColumns}
            data={movementRows(movements)}
            emptyText="No movement history found for this barcode."
          />
        </CardContent>
      </Card>
    </div>
  )
}
