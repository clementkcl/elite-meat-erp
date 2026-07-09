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

export const orderReservationStatuses = [
  "ACTIVE",
  "RELEASED",
  "CONSUMED",
  "CANCELLED",
] as const

export const orderNotificationEventTypes = [
  "READY_TO_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const

export const orderUnits = [
  "CARTON",
  "PACKET",
  "KG",
  "QUANTITY_ESTIMATED_KG",
] as const

export const manualPickReasons = [
  "NO_BARCODE",
  "BARCODE_DAMAGED",
  "LOOSE_ITEM",
  "PROCESSING_ITEM",
  "SCANNER_FAILED",
  "EMERGENCY_MANUAL_ADJUSTMENT",
] as const

export const pickingEntryTypes = [
  "BARCODE_SCAN",
  "MANUAL_WEIGHT",
  "MISMATCH",
] as const

export type CustomerOrderStatus = (typeof customerOrderStatuses)[number]
export type CustomerOrderFulfillment = (typeof customerOrderFulfillments)[number]
export type CustomerOrderItemStatus = (typeof customerOrderItemStatuses)[number]
export type OrderReservationStatus = (typeof orderReservationStatuses)[number]
export type OrderNotificationEventType =
  (typeof orderNotificationEventTypes)[number]
export type OrderUnit = (typeof orderUnits)[number]
export type ManualPickReason = (typeof manualPickReasons)[number]
export type PickingEntryType = (typeof pickingEntryTypes)[number]

export type CustomerOption = {
  id: string
  name: string
  phone: string
  address: string
  categoryName: string
  creditTermDays: number
  hasOverdueCredit: boolean
  remarks: string
}

export type OrderScopeOption = {
  id: string
  name: string
}

export type OrderBrandOption = OrderScopeOption & {
  itemId: string
  availableWeightKg: number
}

export type OrderCustomizationGroup = {
  name: string
  options: string[]
  defaultOptions: string[]
}

export type StockItemOption = {
  id: string
  itemCode: string
  category: string
  section: string
  name: string
  label: string
  orderUnit: OrderUnit
  requiresEstimatedKg: boolean
  processingRequiredDefault: boolean
  customizationGroups: OrderCustomizationGroup[]
}

export type OrderStockLocationOption = OrderScopeOption & {
  outletId: string | null
}

export type CustomerOrder = {
  id: string
  orderNo: string
  sourceType: "MANUAL_ERP" | string
  customerId: string | null
  customerName: string
  customerPhone: string
  customerRemarks: string
  orderDate: string
  requiredDate: string | null
  requiredAt: string | null
  fulfillmentType: CustomerOrderFulfillment
  deliveryRequired: boolean
  status: CustomerOrderStatus
  displayStatus: string
  totalOrderPrice: number
  remarks: string
  outletId: string | null
  outletName: string
  departmentId: string | null
  departmentName: string
  pickupLocationId: string | null
  pickupLocationName: string
  fromLocationId: string | null
  fromLocationName: string
  toLocationId: string | null
  toLocationName: string
  deliveryAddress: string
  deliveryLatitude: number | null
  deliveryLongitude: number | null
  createdById: string | null
  createdByName: string
  stockNotEnough: boolean
  reservationExpiresAt: string | null
  pickedUpAt: string | null
  pickedUpByName: string
  cancellationReason: string
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
  category: string
  orderingUnit: OrderUnit
  requestedQuantity: number
  requestedWeightKg: number
  estimatedWeightKg: number
  preparedQuantity: number
  preparedWeightKg: number
  remainingWeightKg: number
  withinTolerance: boolean
  processingRequired: boolean
  preferredBrandId: string | null
  preferredBrandName: string
  customization: Record<string, string[]>
  stockNotEnough: boolean
  preparedByName: string
  preparedAt: string | null
  status: CustomerOrderItemStatus
  notes: string
  itemRequestRemarks: string
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
  stockNotEnough: boolean
  expiresAt: string | null
  createdAt: string
}

export type OrderPickingEntry = {
  id: string
  orderId: string
  orderNo: string
  orderItemId: string | null
  itemLabel: string
  barcode: string
  entryType: PickingEntryType
  pickedQuantity: number
  pickedWeightKg: number
  manualReason: ManualPickReason | null
  mismatchMessage: string
  createdByName: string
  createdAt: string
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

export type OrderLinkedDelivery = {
  id: string
  orderId: string
  deliveryId: string
  deliveryNo: string
  status: string
  driverId: string | null
  driverName: string
  proofStatus: "NO_PROOF" | "UPLOADED"
  proofCount: number
  actionHref: string
  createdAt: string
}

export type OrderDashboardKpi = {
  label: string
  value: string
  detail: string
}

export type OrderAlert = {
  id: string
  label: string
  detail: string
  tone: "warning" | "danger" | "success" | "neutral"
  href?: string
}

export type OrderReportRow = {
  id: string
  reportName: string
  primary: string
  secondary: string
  count: number
  weightKg: number
  totalPrice: number
}

export type OrderFilters = {
  date?: string
  outlet?: string
  status?: string
  customer?: string
  salesperson?: string
}

export type OrdersPageData = {
  demoMode: boolean
  orders: CustomerOrder[]
  items: CustomerOrderItem[]
  reservations: OrderStockReservation[]
  pickingEntries: OrderPickingEntry[]
  notifications: OrderNotificationEvent[]
  linkedDeliveries: OrderLinkedDelivery[]
  customers: CustomerOption[]
  scopeOptions: {
    outlets: OrderScopeOption[]
    departments: OrderScopeOption[]
    stockLocations: OrderStockLocationOption[]
    salespeople: OrderScopeOption[]
  }
  stockItems: StockItemOption[]
  brandOptions: OrderBrandOption[]
  dashboard: {
    kpis: OrderDashboardKpi[]
    alerts: OrderAlert[]
    reports: OrderReportRow[]
  }
}
