export type DeliveryActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export const initialDeliveryActionState: DeliveryActionState = {
  status: "idle",
  message: "",
}
