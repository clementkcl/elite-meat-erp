export function calculateYield(rawWeightKg: number, finishedWeightKg: number) {
  if (rawWeightKg <= 0) {
    return 0
  }

  return (finishedWeightKg / rawWeightKg) * 100
}

export function calculateLoss(rawWeightKg: number, finishedWeightKg: number) {
  return rawWeightKg - finishedWeightKg
}

export function calculateLossPercent(
  rawWeightKg: number,
  finishedWeightKg: number
) {
  if (rawWeightKg <= 0) {
    return 0
  }

  return (calculateLoss(rawWeightKg, finishedWeightKg) / rawWeightKg) * 100
}

export function isAbnormalYield({
  rawWeightKg,
  finishedWeightKg,
  minimumYieldPercent,
  maximumLossPercent,
}: {
  rawWeightKg: number
  finishedWeightKg: number
  minimumYieldPercent: number | null
  maximumLossPercent: number | null
}) {
  const yieldPercent = calculateYield(rawWeightKg, finishedWeightKg)
  const lossPercent = calculateLossPercent(rawWeightKg, finishedWeightKg)
  const effectiveMinimumYieldPercent = minimumYieldPercent ?? 85

  return (
    yieldPercent > 100 ||
    yieldPercent < effectiveMinimumYieldPercent ||
    (maximumLossPercent !== null && lossPercent > maximumLossPercent)
  )
}
