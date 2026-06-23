import type { StockMovementType, StockUnitStatus } from "@/lib/stock/types"

export const stockableStatuses: StockUnitStatus[] = [
  "IN_STOCK",
  "TRANSFERRED",
  "RETURNED",
]

export type StockOutboundType = "SALES" | "TRANSFER" | "PROCESSING"
export type DirectStockOutboundType =
  | StockOutboundType
  | "DAMAGE_SPOILAGE"
  | "RETURN_SUPPLIER"
  | "SAMPLE_TESTING"

export function activeStockStatus(status: string) {
  return stockableStatuses.includes(status as StockUnitStatus)
}

export function movementTypeForOutboundType(
  outboundType: DirectStockOutboundType
): StockMovementType {
  if (outboundType === "SALES") {
    return "OUTBOUND_SALES"
  }

  if (outboundType === "TRANSFER") {
    return "OUTBOUND_TRANSFER"
  }

  if (outboundType === "PROCESSING") {
    return "OUTBOUND_PROCESSING"
  }

  if (outboundType === "DAMAGE_SPOILAGE") {
    return "OUTBOUND_SPOILED"
  }

  if (outboundType === "RETURN_SUPPLIER") {
    return "OUTBOUND_RETURN_SUPPLIER"
  }

  return "OUTBOUND_SAMPLE_TESTING"
}
