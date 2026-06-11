export const deliveryStatuses = [
  "PENDING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const

export const deliveryPaymentTypes = [
  "CREDIT",
  "CASH",
  "ONLINE_TRANSFER",
] as const

export const deliveryPaymentStatuses = [
  "PENDING",
  "PARTIAL",
  "PAID",
  "WAIVED",
] as const

export const deliverySourceTypes = ["manual", "retail_sale", "whatsapp"] as const

export type DeliveryStatus = (typeof deliveryStatuses)[number]
export type DeliveryPaymentType = (typeof deliveryPaymentTypes)[number]
export type DeliveryPaymentStatus = (typeof deliveryPaymentStatuses)[number]
export type DeliverySourceType = (typeof deliverySourceTypes)[number]

export type DeliveryPerson = {
  id: string
  fullName: string
  email: string
}

export type Vehicle = {
  id: string
  vehicleNo: string
  vehicleType: string
  capacityKg: number
  active: boolean
}

export type DeliveryOrder = {
  id: string
  orderNo: string
  customerName: string
  customerPhone: string
  customerLocation: string
  deliveryAddress: string
  vehicleId: string | null
  vehicleNo: string
  driverId: string | null
  driverName: string
  status: DeliveryStatus
  paymentType: DeliveryPaymentType
  paymentStatus: DeliveryPaymentStatus
  sourceType: DeliverySourceType
  sourceReference: string
  retailSaleId: string | null
  requestedDeliveryDate: string | null
  proofFileId: string | null
  proofPath: string
  notes: string
  createdAt: string
}

export type DeliveryOrderItem = {
  id: string
  orderId: string
  orderNo: string
  itemDescription: string
  quantity: number
  weightKg: number
  notes: string
}

export type DeliveryStatusLog = {
  id: string
  orderId: string
  orderNo: string
  status: DeliveryStatus
  notes: string
  createdAt: string
}

export type DriverLocation = {
  id: string
  orderId: string | null
  orderNo: string
  driverId: string | null
  driverName: string
  latitude: number
  longitude: number
  locationNote: string
  createdAt: string
}

export type DeliveryPayment = {
  id: string
  orderId: string
  orderNo: string
  paymentType: DeliveryPaymentType
  paymentStatus: DeliveryPaymentStatus
  amount: number
  referenceNo: string
  notes: string
  createdAt: string
}

export type DeliveryKpi = {
  label: string
  value: string
  detail: string
}

export type DeliveryChartPoint = {
  name: string
  value: number
}

export type DeliveryPageData = {
  demoMode: boolean
  drivers: DeliveryPerson[]
  vehicles: Vehicle[]
  orders: DeliveryOrder[]
  items: DeliveryOrderItem[]
  statusLogs: DeliveryStatusLog[]
  driverLocations: DriverLocation[]
  payments: DeliveryPayment[]
  dashboard: {
    kpis: DeliveryKpi[]
    statusMix: DeliveryChartPoint[]
    paymentMix: DeliveryChartPoint[]
  }
}
