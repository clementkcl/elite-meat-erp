export type OrdersActionState = {
  status?: "success" | "error"
  message?: string
}

export const initialOrdersActionState: OrdersActionState = {}
