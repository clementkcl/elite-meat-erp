"use client"

import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import type { StockReportTableRow } from "@/lib/stock/report-export"

const unitColumns: DataTableColumn<StockReportTableRow>[] = [
  { key: "barcode", header: "Barcode" },
  { key: "itemName", header: "Item" },
  { key: "brandName", header: "Brand" },
  { key: "originName", header: "Origin" },
  { key: "locationName", header: "Location" },
  { key: "status", header: "Status" },
  { key: "netWeightKg", header: "Kg", align: "right" },
  { key: "receivedAt", header: "Received" },
]

export function StockUnitsTableClient({
  rows,
}: {
  rows: StockReportTableRow[]
}) {
  return (
    <DataTable
      columns={unitColumns}
      data={rows}
      getRowHref={(row) => `/stock/units/${row.id}`}
      emptyText="No barcode stock units found."
    />
  )
}
