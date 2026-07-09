import Link from "next/link"
import {
  AlertTriangle,
  ClipboardCheck,
  PackageCheck,
  Scale,
  ScanBarcode,
} from "lucide-react"

import {
  RetailProcessingBatchForm,
  RetailProcessingReviewForm,
} from "@/components/retail/retail-forms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import {
  hasAnyRole,
  requireCurrentProfile,
  type CurrentProfile,
} from "@/lib/auth/session"
import type { UserRole } from "@/lib/auth/types"
import { getProcessingPageData } from "@/lib/processing/data"
import type { ProcessingBatchSummary, ProcessingKpi } from "@/lib/processing/types"
import { cn } from "@/lib/utils"

type ProcessingView = "dashboard" | "batches"

const processingRoles: UserRole[] = [
  "processing_team_general_worker",
  "processing_manager",
  "admin",
  "director",
]

const processingOperatorRoles: UserRole[] = [
  "processing_team_general_worker",
  "processing_manager",
  "admin",
]

const processingReviewRoles: UserRole[] = [
  "processing_manager",
  "admin",
  "director",
]

function dateText(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value))
}

function numberText(value: number, maximumFractionDigits = 3) {
  return value.toLocaleString(undefined, { maximumFractionDigits })
}

function scopeText(profile: CurrentProfile) {
  return [
    profile.outletName ?? "All outlets",
    profile.departmentName ?? "All departments",
    profile.stockLocationName ?? "All stock locations",
  ].join(" / ")
}

function PageHeader({
  demoMode,
  profile,
  view,
}: {
  demoMode: boolean
  profile: CurrentProfile
  view: ProcessingView
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Processing
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Track raw material, finished output, loss, yield, and manager review.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">Viewing: {scopeText(profile)}</Badge>
          {demoMode ? <Badge variant="warning">Demo data</Badge> : null}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          asChild
          size="sm"
          variant={view === "dashboard" ? "default" : "outline"}
        >
          <Link href="/processing/dashboard">Dashboard</Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant={view === "batches" ? "default" : "outline"}
        >
          <Link href="/processing/batches">Batches</Link>
        </Button>
      </div>
    </div>
  )
}

function KpiCards({ kpis }: { kpis: ProcessingKpi[] }) {
  const icons = [Scale, PackageCheck, AlertTriangle, ClipboardCheck]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = icons[index] ?? ClipboardCheck

        return (
          <Card key={kpi.label}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardDescription>{kpi.label}</CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle>{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{kpi.detail}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function ProcessingWorkerFastPath() {
  const steps = [
    "Record raw",
    "Record finished",
    "Check yield",
    "Submit",
    "Barcode inbound",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing worker fast path</CardTitle>
        <CardDescription>
          Record one processing or packing job, submit it, then inbound the
          finished stock barcode.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-5">
          {steps.map((step, index) => (
            <div
              key={step}
              className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium"
            >
              {index + 1}. {step}
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button asChild className="min-h-12 w-full justify-start">
            <a href="#record-processing">
              <ClipboardCheck className="size-4" />
              Record processing
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-12 w-full justify-start"
          >
            <Link href="/processing/batches">Check batches</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-12 w-full justify-start"
          >
            <Link href="/stock/inbound">
              <ScanBarcode className="size-4" />
              Barcode inbound
            </Link>
          </Button>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Finished stock still needs barcode inbound after packing. Abnormal
          yield below 85% is alert only.
        </div>
      </CardContent>
    </Card>
  )
}

function YieldBadge({ batch }: { batch: ProcessingBatchSummary }) {
  return (
    <Badge variant={batch.isAbnormalYield ? "destructive" : "success"}>
      {numberText(batch.yieldPercent, 2)}%
    </Badge>
  )
}

function BatchCard({ batch }: { batch: ProcessingBatchSummary }) {
  return (
    <Card
      className={cn(
        batch.isAbnormalYield &&
          "border-red-300 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20"
      )}
    >
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="truncate">{batch.batchNo}</CardTitle>
            <CardDescription>
              {dateText(batch.processedAt)} by {batch.processedByName}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={batch.status} />
            <YieldBadge batch={batch} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Raw
            </div>
            <div className="mt-1 font-medium">{batch.rawItemLabel}</div>
            <div className="tabular-nums">
              {numberText(batch.rawWeightKg)} kg
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Finished
            </div>
            <div className="mt-1 font-medium">{batch.finishedItemLabel}</div>
            <div className="tabular-nums">
              {numberText(batch.finishedWeightKg)} kg
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Loss
            </div>
            <div className="mt-1 font-medium tabular-nums">
              {numberText(batch.lossKg)} kg
            </div>
            <div className="text-muted-foreground">raw minus finished</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Yield
            </div>
            <div className="mt-1 font-medium tabular-nums">
              {numberText(batch.yieldPercent, 2)}%
            </div>
            <div
              className={cn(
                "text-muted-foreground",
                batch.isAbnormalYield && "font-medium text-red-700"
              )}
            >
              {batch.yieldAlert}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{batch.outletName}</Badge>
          <Badge variant="outline">{batch.stockLocationName}</Badge>
          {batch.minimumYieldPercent !== null ? (
            <Badge variant="outline">
              Min yield {numberText(batch.minimumYieldPercent, 2)}%
            </Badge>
          ) : null}
          {batch.maximumLossPercent !== null ? (
            <Badge variant="outline">
              Max loss {numberText(batch.maximumLossPercent, 2)}%
            </Badge>
          ) : null}
        </div>
        {batch.notes ? (
          <p className="text-sm text-muted-foreground">{batch.notes}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function BatchList({ batches }: { batches: ProcessingBatchSummary[] }) {
  if (batches.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            title="No processing batches"
            description="Processing batches will appear here after raw material is recorded."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {batches.map((batch) => (
        <BatchCard key={batch.id} batch={batch} />
      ))}
    </div>
  )
}

function BatchTable({ batches }: { batches: ProcessingBatchSummary[] }) {
  if (batches.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch weight table</CardTitle>
        <CardDescription>
          Raw weight, finished weight, calculated loss, and calculated yield.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Batch</th>
                <th className="px-3 py-2">Raw item</th>
                <th className="px-3 py-2 text-right">Raw kg</th>
                <th className="px-3 py-2">Finished item</th>
                <th className="px-3 py-2 text-right">Finished kg</th>
                <th className="px-3 py-2 text-right">Loss kg</th>
                <th className="px-3 py-2 text-right">Yield %</th>
                <th className="px-3 py-2">Alert</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr
                  key={batch.id}
                  className={cn(
                    "border-t",
                    batch.isAbnormalYield && "bg-red-50/50 dark:bg-red-950/20"
                  )}
                >
                  <td className="px-3 py-3 font-medium">{batch.batchNo}</td>
                  <td className="px-3 py-3">{batch.rawItemLabel}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {numberText(batch.rawWeightKg)}
                  </td>
                  <td className="px-3 py-3">{batch.finishedItemLabel}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {numberText(batch.finishedWeightKg)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {numberText(batch.lossKg)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <YieldBadge batch={batch} />
                  </td>
                  <td className="px-3 py-3">{batch.yieldAlert}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export async function ProcessingPage({ view }: { view: ProcessingView }) {
  const accessBlock = await moduleAccessBlock(
    "processing",
    "Processing",
    processingRoles
  )

  if (accessBlock) {
    return accessBlock
  }

  const profile = await requireCurrentProfile()
  const data = await getProcessingPageData()
  const canOperate = hasAnyRole(profile, processingOperatorRoles)
  const canReview = hasAnyRole(profile, processingReviewRoles)
  const visibleBatches =
    view === "dashboard" ? data.batches.slice(0, 6) : data.batches

  return (
    <div className="space-y-5">
      <PageHeader demoMode={data.demoMode} profile={profile} view={view} />
      {canOperate ? <ProcessingWorkerFastPath /> : null}
      <KpiCards kpis={data.kpis} />

      {view === "dashboard" ? (
        <Card>
          <CardHeader>
            <CardTitle>Order preparation</CardTitle>
            <CardDescription>
              Prepare requested customer order items before stock is packed,
              barcoded, and scanned inbound as finished goods.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/orders/picking">Prepare customer orders</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canOperate || canReview ? (
        <div
          className={cn(
            "grid gap-4",
            canOperate && canReview && "xl:grid-cols-2"
          )}
        >
          {canOperate ? (
            <section id="record-processing" className="scroll-mt-4">
              <RetailProcessingBatchForm
                outlets={data.outlets}
                items={data.items}
                profile={profile}
              />
            </section>
          ) : null}
          {canReview ? (
            <RetailProcessingReviewForm batches={data.sourceBatches} />
          ) : null}
        </div>
      ) : null}

      <BatchList batches={visibleBatches} />
      <BatchTable batches={visibleBatches} />
    </div>
  )
}
