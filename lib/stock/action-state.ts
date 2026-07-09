export type StockActionState = {
  status: "idle" | "success" | "error"
  message: string
  warning?: string
  itemId?: string
  brandId?: string
  brandName?: string
  originId?: string
  originName?: string
  stockUnitId?: string
  voidedStockUnitId?: string
}

export const initialStockActionState: StockActionState = {
  status: "idle",
  message: "",
}
