"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import {
  StockLabelPreview,
  StockLabelPrintActions,
  StockLabelPrintArea,
  StockLabelPrintNote,
} from "@/components/stock/stock-label"
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

function MobileMovementCards({ movements }: { movements: StockMovement[] }) {
  if (movements.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:hidden">
        No movement history found for this barcode.
      </div>
    )
  }

  return (
    <div className="space-y-2 md:hidden">
      <div className="text-sm font-medium">Mobile movement summary</div>
      {movements.slice(0, 6).map((movement) => (
        <div
          key={movement.id}
          className="rounded-md border bg-muted/20 p-3 text-sm"
        >
          <div className="flex flex-col gap-2 min-[390px]:flex-row min-[390px]:items-start min-[390px]:justify-between">
            <div className="min-w-0">
              <div className="break-words font-semibold">
                {movement.movementType.replaceAll("_", " ")}
              </div>
              <div className="mt-1 break-words text-xs text-muted-foreground">
                {dateText(movement.createdAt)}
              </div>
            </div>
            <div className="font-semibold tabular-nums min-[390px]:shrink-0 min-[390px]:text-right">
              {movement.weightKg.toLocaleString(undefined, {
                maximumFractionDigits: 3,
              })}{" "}
              kg
            </div>
          </div>
          <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                From
              </div>
              <div className="break-words font-medium">
                {movement.fromLocation ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">To</div>
              <div className="break-words font-medium">
                {movement.toLocation ?? "-"}
              </div>
            </div>
          </div>
          {movement.referenceNo ? (
            <div className="mt-2 break-all text-xs text-muted-foreground">
              Ref: {movement.referenceNo}
            </div>
          ) : null}
        </div>
      ))}
      {movements.length > 6 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm break-words text-amber-800">
          Showing latest 6 movements. Scroll the table below for full history.
        </div>
      ) : null}
    </div>
  )
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
  const label = {
    id: unit.id,
    companyName: "Elite Meat",
    productName: unit.itemName,
    weightKg: unit.netWeightKg.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    }),
    barcode: unit.barcode,
  }

  return (
    <div className="space-y-5">
      <StockLabelPrintArea labels={[label]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button
            asChild
            variant="outline"
            className="min-h-11 w-full justify-start sm:w-fit"
          >
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
              View barcode status, movement history, and reprint the old label
              from a phone. No reason is required.
            </p>
          </div>
        </div>
        <div className="w-full sm:w-[320px]">
          <StockLabelPrintActions />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="break-words">{unit.itemName}</CardTitle>
            <CardDescription className="break-all font-mono">
              {unit.barcode}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <Badge className="whitespace-normal break-words">
                    {unit.status.replaceAll("_", " ")}
                  </Badge>
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
                <dd className="mt-1 break-words font-medium">
                  {unit.itemCode}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Manufacturer</dt>
                <dd className="mt-1 break-words font-medium">
                  {unit.brandName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Origin</dt>
                <dd className="mt-1 break-words font-medium">
                  {unit.originName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd className="mt-1 break-words font-medium">
                  {unit.locationName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Inbound source</dt>
                <dd className="mt-1 break-words font-medium">
                  {unit.inboundSource.replaceAll("_", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Received</dt>
                <dd className="mt-1 font-medium">{dateText(unit.receivedAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Batch</dt>
                <dd className="mt-1 break-all font-medium">
                  {unit.batchNo ?? "-"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Label preview</CardTitle>
            <CardDescription>Simple mobile reprint label.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StockLabelPreview label={label} />
            <StockLabelPrintNote />
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
        <CardContent className="space-y-3">
          <MobileMovementCards movements={movements} />
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
