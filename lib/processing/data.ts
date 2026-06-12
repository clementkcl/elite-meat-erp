import { getRetailPageData } from "@/lib/retail/data"
import type { RetailProcessingBatch } from "@/lib/retail/types"
import {
  calculateLoss,
  calculateLossPercent,
  calculateYield,
  isAbnormalYield,
} from "@/lib/processing/calculations"
import type { ProcessingBatchSummary, ProcessingKpi } from "@/lib/processing/types"

function roundWeight(value: number) {
  return Number(value.toFixed(3))
}

function roundPercent(value: number) {
  return Number(value.toFixed(2))
}

function abnormalYieldReason(batch: RetailProcessingBatch) {
  const yieldPercent = calculateYield(batch.rawWeightKg, batch.finishedWeightKg)
  const lossPercent = calculateLossPercent(
    batch.rawWeightKg,
    batch.finishedWeightKg
  )

  if (yieldPercent > 100) {
    return "Yield above 100%"
  }

  const minimumYieldPercent = batch.processingMinYieldPercent ?? 85

  if (yieldPercent < minimumYieldPercent) {
    return `Below ${minimumYieldPercent}% minimum`
  }

  if (
    batch.processingMaxLossPercent !== null &&
    lossPercent > batch.processingMaxLossPercent
  ) {
    return `Loss above ${batch.processingMaxLossPercent}%`
  }

  return "OK"
}

function summarizeBatch(batch: RetailProcessingBatch): ProcessingBatchSummary {
  const abnormal = isAbnormalYield({
    rawWeightKg: batch.rawWeightKg,
    finishedWeightKg: batch.finishedWeightKg,
    minimumYieldPercent: batch.processingMinYieldPercent,
    maximumLossPercent: batch.processingMaxLossPercent,
  })

  return {
    id: batch.id,
    batchNo: batch.batchNo,
    outletName: batch.outletName,
    stockLocationName: batch.stockLocationName,
    rawItemLabel: batch.rawItemLabel,
    rawWeightKg: roundWeight(batch.rawWeightKg),
    finishedItemLabel: batch.finishedItemLabel,
    finishedWeightKg: roundWeight(batch.finishedWeightKg),
    lossKg: roundWeight(calculateLoss(batch.rawWeightKg, batch.finishedWeightKg)),
    yieldPercent: roundPercent(
      calculateYield(batch.rawWeightKg, batch.finishedWeightKg)
    ),
    minimumYieldPercent: batch.processingMinYieldPercent,
    maximumLossPercent: batch.processingMaxLossPercent,
    isAbnormalYield: abnormal,
    yieldAlert: abnormal ? abnormalYieldReason(batch) : "OK",
    status: batch.status,
    processedByName: batch.processedByName,
    processedAt: batch.processedAt,
    notes: batch.notes,
  }
}

function formatKg(value: number) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })} kg`
}

function formatPercent(value: number) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`
}

function buildKpis(batches: ProcessingBatchSummary[]): ProcessingKpi[] {
  const completed = batches.filter((batch) => batch.status !== "CANCELLED")
  const totalRaw = completed.reduce((sum, batch) => sum + batch.rawWeightKg, 0)
  const totalFinished = completed.reduce(
    (sum, batch) => sum + batch.finishedWeightKg,
    0
  )
  const totalLoss = completed.reduce((sum, batch) => sum + batch.lossKg, 0)
  const averageYield =
    completed.length > 0
      ? completed.reduce((sum, batch) => sum + batch.yieldPercent, 0) /
        completed.length
      : 0

  return [
    {
      label: "Raw weight",
      value: formatKg(totalRaw),
      detail: "Non-cancelled processing batches",
    },
    {
      label: "Finished weight",
      value: formatKg(totalFinished),
      detail: "Output recorded before barcode inbound",
    },
    {
      label: "Loss",
      value: formatKg(totalLoss),
      detail: "Raw weight minus finished weight",
    },
    {
      label: "Average yield",
      value: formatPercent(averageYield),
      detail: `${batches.filter((batch) => batch.isAbnormalYield).length} abnormal batch alerts`,
    },
  ]
}

export async function getProcessingPageData() {
  const retailData = await getRetailPageData()
  const batches = retailData.processingBatches.map(summarizeBatch)

  return {
    demoMode: retailData.demoMode,
    outlets: retailData.outlets,
    stockLocations: retailData.stockLocations,
    items: retailData.items,
    brands: retailData.brands,
    origins: retailData.origins,
    batches,
    sourceBatches: retailData.processingBatches,
    kpis: buildKpis(batches),
  }
}
