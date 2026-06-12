export const customerOrderStatuses = [
  "NEW",
  "PREPARING",
  "READY",
  "READY_FOR_PICKUP",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const

export const customerOrderFulfillments = [
  "PICKUP",
  "DELIVERY",
  "INTERNAL_TRANSFER",
] as const

export const customerOrderItemStatuses = [
  "REQUESTED",
  "PREPARING",
  "PREPARED",
  "CANCELLED",
] as const

export const orderNotificationEventTypes = [
  "READY_TO_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const

export const orderReservationStatuses = [
  "ACTIVE",
  "RELEASED",
  "CONSUMED",
  "CANCELLED",
] as const

export type CustomerOrderStatus = (typeof customerOrderStatuses)[number]
export type CustomerOrderFulfillment = (typeof customerOrderFulfillments)[number]
export type CustomerOrderItemStatus = (typeof customerOrderItemStatuses)[number]
export type OrderNotificationEventType =
  (typeof orderNotificationEventTypes)[number]
export type OrderReservationStatus = (typeof orderReservationStatuses)[number]

export type CustomerOrder = {
  id: string
  orderNo: string
  customerName: string
  customerPhone: string
  orderDate: string
  requiredDate: string | null
  fulfillmentType: CustomerOrderFulfillment
  deliveryRequired: boolean
  status: CustomerOrderStatus
  remarks: string
  outletId: string | null
  outletName: string
  departmentId: string | null
  departmentName: string
  createdByName: string
  proofFileId: string | null
  proofPath: string
  failedReturnStatus: string
  failedReturnRequiredUnits: number
  failedReturnCompletedUnits: number
  createdAt: string
}

export type CustomerOrderItem = {
  id: string
  orderId: string
  orderNo: string
  itemId: string
  itemLabel: string
  requestedQuantity: number
  requestedWeightKg: number
  preparedQuantity: number
  preparedWeightKg: number
  preparedByName: string
  preparedAt: string | null
  status: CustomerOrderItemStatus
  notes: string
}

export type OrderNotificationEvent = {
  id: string
  orderId: string
  orderNo: string
  eventType: OrderNotificationEventType
  channel: string
  status: string
  createdAt: string
}

export type OrderStockReservation = {
  id: string
  orderId: string
  orderNo: string
  orderItemId: string | null
  itemId: string
  itemLabel: string
  locationName: string
  reservedQuantity: number
  reservedWeightKg: number
  status: OrderReservationStatus
  createdAt: string
}

export type OrderScopeOption = {
  id: string
  name: string
}

export type OrdersPageData = {
  demoMode: boolean
  orders: CustomerOrder[]
  items: CustomerOrderItem[]
  reservations: OrderStockReservation[]
  notifications: OrderNotificationEvent[]
  scopeOptions: {
    outlets: OrderScopeOption[]
    departments: OrderScopeOption[]
  }
  stockItems: {
    id: string
    label: string
  }[]
}
