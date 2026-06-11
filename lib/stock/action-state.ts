export type StockActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export const initialStockActionState: StockActionState = {
  status: "idle",
  message: "",
}
