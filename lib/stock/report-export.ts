export type StockReportTableRow = Record<string, string | number | boolean>

function csvCell(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`
}

export function buildCsv(rows: StockReportTableRow[]) {
  const headers = Object.keys(rows[0] ?? {})

  if (headers.length === 0) {
    return ""
  }

  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n")
}

export function buildStockWhatsappSummary(
  rows: StockReportTableRow[],
  negativeStockAlertCount: number,
  stockAgeAlertCount: number,
  transferPendingAlertCount: number
) {
  const totalCount = rows.reduce((sum, row) => sum + Number(row.count ?? 0), 0)
  const totalWeight = rows.reduce((sum, row) => sum + Number(row.weightKg ?? 0), 0)
  const locations = new Set(rows.map((row) => String(row.locationName))).size

  return [
    "Elite Meat Stock Report",
    `Locations: ${locations}`,
    `Report rows: ${rows.length}`,
    `Total count: ${totalCount}`,
    `Total weight: ${totalWeight.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} kg`,
    `Negative stock alerts: ${negativeStockAlertCount}`,
    `Stock age alerts: ${stockAgeAlertCount}`,
    `Overdue transfer alerts: ${transferPendingAlertCount}`,
  ].join("\n")
}
