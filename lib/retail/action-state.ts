export type RetailActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export const initialRetailActionState: RetailActionState = {
  status: "idle",
  message: "",
}
