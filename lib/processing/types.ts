export type ProcessingBatchStatus =
  | "OPEN"
  | "COMPLETED"
  | "REVIEWED"
  | "CANCELLED"

export type ProcessingBatchSummary = {
  id: string
  batchNo: string
  outletName: string
  stockLocationName: string
  rawItemLabel: string
  rawWeightKg: number
  finishedItemLabel: string
  finishedWeightKg: number
  lossKg: number
  yieldPercent: number
  minimumYieldPercent: number | null
  maximumLossPercent: number | null
  isAbnormalYield: boolean
  yieldAlert: string
  status: ProcessingBatchStatus
  processedByName: string
  processedAt: string
  notes: string
}

export type ProcessingKpi = {
  label: string
  value: string
  detail: string
}
