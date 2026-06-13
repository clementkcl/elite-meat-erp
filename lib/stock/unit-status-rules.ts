import type { StockMovementType, StockUnitStatus } from "@/lib/stock/types"

export const stockableStatuses: StockUnitStatus[] = [
  "IN_STOCK",
  "TRANSFERRED",
  "RETURNED",
]

export type StockOutboundType = "SALES" | "TRANSFER" | "PROCESSING"

export function activeStockStatus(status: string) {
  return stockableStatuses.includes(status as StockUnitStatus)
}

export function movementTypeForOutboundType(
  outboundType: StockOutboundType
): StockMovementType {
  if (outboundType === "SALES") {
    return "OUTBOUND_SALES"
  }

  if (outboundType === "TRANSFER") {
    return "OUTBOUND_TRANSFER"
  }

  return "OUTBOUND_PROCESSING"
}
