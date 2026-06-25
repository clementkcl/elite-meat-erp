export const deliveryStatuses = [
  "PENDING",
  "LOADED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const

export const deliveryPaymentTypes = [
  "CREDIT",
  "CASH",
  "ONLINE_TRANSFER",
  "EWALLET",
] as const

export const deliveryPaymentStatuses = [
  "PENDING",
  "PARTIAL",
  "PAID",
  "WAIVED",
] as const

export const deliverySourceTypes = ["manual", "retail_sale", "whatsapp"] as const
export const deliveryJobStatuses = [
  "AVAILABLE",
  "ACCEPTED",
  "LOADED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const
export const deliveryLifecycleStatuses = deliveryJobStatuses
export const deliveryJobTypes = [
  "CUSTOMER_DELIVERY",
  "INTERNAL_TRANSFER_DELIVERY",
  "RETURN_COLLECTION",
] as const
export const deliveryFailedReasons = [
  "CUSTOMER_NOT_AVAILABLE",
  "WRONG_ADDRESS",
  "CUSTOMER_REJECTED",
  "GOODS_ISSUE",
  "VEHICLE_ISSUE",
  "OTHER",
] as const
export const deliveryGoodsIssueReasons = [
  "ITEM_MISSING",
  "WRONG_ITEM",
  "WEIGHT_MISMATCH",
  "PACKAGING_DAMAGED",
  "NOT_READY",
  "OTHER",
] as const
export const deliveryExpenseTypes = [
  "PETROL",
  "PARKING",
  "TOLL",
  "VEHICLE_REPAIR",
  "OTHER",
] as const
export const deliveryExpenseStatuses = ["PENDING", "APPROVED", "REJECTED"] as const

export type DeliveryStatus = (typeof deliveryStatuses)[number]
export type DeliveryPaymentType = (typeof deliveryPaymentTypes)[number]
export type DeliveryPaymentStatus = (typeof deliveryPaymentStatuses)[number]
export type DeliverySourceType = (typeof deliverySourceTypes)[number]
export type DeliveryJobStatus = (typeof deliveryJobStatuses)[number]
export type DeliveryLifecycleStatus = (typeof deliveryLifecycleStatuses)[number]
export type DeliveryJobType = (typeof deliveryJobTypes)[number]
export type DeliveryFailedReason = (typeof deliveryFailedReasons)[number]
export type DeliveryGoodsIssueReason = (typeof deliveryGoodsIssueReasons)[number]
export type DeliveryExpenseType = (typeof deliveryExpenseTypes)[number]
export type DeliveryExpenseStatus = (typeof deliveryExpenseStatuses)[number]
export type DeliveryProofType = "DELIVERED" | "FAILED"
export type DeliveryGoodsReadiness =
  | "Goods Ready"
  | "Not Ready"
  | "Partially Ready"

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
  deliveryTeamId?: string | null
  defaultDriverId?: string | null
  gpsProviderId?: string | null
  gpsProviderName?: string
  gpsProviderVehicleRef?: string
  gpsEnabled?: boolean
}

export type TruckGpsProvider = {
  id: string
  providerName: string
  apiBaseUrl: string
  apiReference: string
  syncIntervalSeconds: number
  active: boolean
  lastSyncAt: string | null
}

export type TruckGpsSnapshot = {
  id: string
  vehicleId: string
  deliveryId: string | null
  providerId: string | null
  providerName: string
  providerVehicleRef: string
  providerSnapshotRef: string
  latitude: number | null
  longitude: number | null
  speedKmh: number | null
  headingDegrees: number | null
  fuelPercent: number | null
  odometerKm: number | null
  engineOn: boolean | null
  batteryPercent: number | null
  etaMinutes: number | null
  delayMinutes: number | null
  syncedAt: string
  expiresAt: string
}

export type VehicleCurrentLocation = Omit<TruckGpsSnapshot, "id" | "expiresAt"> & {
  snapshotId: string | null
  updatedAt: string
}

export type TruckGpsSnapshotInput = {
  vehicleId: string
  deliveryId?: string | null
  providerId?: string | null
  providerName?: string | null
  providerVehicleRef?: string | null
  providerSnapshotRef?: string | null
  latitude?: number | null
  longitude?: number | null
  speedKmh?: number | null
  headingDegrees?: number | null
  fuelPercent?: number | null
  odometerKm?: number | null
  engineOn?: boolean | null
  batteryPercent?: number | null
  etaMinutes?: number | null
  delayMinutes?: number | null
  syncedAt?: string | null
  rawPayload?: Record<string, unknown> | null
}

export type DeliveryDelayEstimate = {
  deliveryId: string
  vehicleId: string | null
  trackingAllowed: boolean
  etaMinutes: number | null
  delayMinutes: number | null
  syncedAt: string | null
  reason: string
}

export type TruckGpsTrailFilters = {
  vehicleId: string
  deliveryId?: string | null
  from?: string | null
  to?: string | null
  limit?: number | null
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
  failedReturnStatus: string
  failedReturnRequiredUnits: number
  failedReturnCompletedUnits: number
  notes: string
  createdAt: string
}

export type DeliveryJob = {
  id: string
  jobNo: string
  jobType: DeliveryJobType
  status: DeliveryJobStatus
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryNote: string
  outletId: string | null
  outletName: string
  deliveryTeamId: string | null
  driverId: string | null
  driverName: string
  vehicleId: string | null
  vehicleNo: string
  requestedDeliveryDate: string | null
  totalWeightKg: number
  itemCount: number
  orderCount: number
  orderNos: string[]
  proofFileId: string | null
  proofPath: string
  failedReason: string
  goodsIssueReason: string
  gpsAvailable: boolean | null
  proofLatitude: number | null
  proofLongitude: number | null
  acceptedAt: string | null
  loadedAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export type DeliveryExpense = {
  id: string
  deliveryId: string | null
  driverId: string | null
  driverName: string
  outletId: string | null
  deliveryTeamId: string | null
  vehicleId: string | null
  vehicleNo: string
  expenseType: DeliveryExpenseType
  amount: number
  receiptFileId: string | null
  bucketId: string
  receiptPath: string
  receiptUrl: string
  status: DeliveryExpenseStatus
  remark: string
  reviewNote: string
  rejectedReason: string
  reviewedById: string | null
  reviewedAt: string | null
  createdAt: string
}

export type DeliveryAddressSuggestion = {
  id: string
  jobId: string | null
  orderId: string | null
  customerId: string | null
  customerName: string
  suggestedAddress: string
  suggestedLatitude: number | null
  suggestedLongitude: number | null
  reason: string
  status: "PENDING" | "APPROVED" | "REJECTED"
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
  jobs: DeliveryJob[]
  expenses: DeliveryExpense[]
  addressSuggestions: DeliveryAddressSuggestion[]
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

export type DeliveryGpsInput = {
  latitude?: number | null
  longitude?: number | null
  unavailable?: boolean | null
}

export type Delivery = {
  id: string
  deliveryNo: string
  deliveryType: DeliveryJobType
  status: DeliveryLifecycleStatus
  outletId: string | null
  deliveryTeamId: string | null
  driverId: string | null
  driverName: string
  defaultVehicleId: string | null
  vehicleId: string | null
  vehicleNo: string
  customerId: string | null
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryNote: string
  totalWeightKg: number
  itemCount: number
  completedLatitude: number | null
  completedLongitude: number | null
  customerLatitude: number | null
  customerLongitude: number | null
  gpsUnavailable: boolean
  failedReason: DeliveryFailedReason | null
  remarks: string
  requestedDeliveryDate: string | null
  acceptedAt: string | null
  loadedAt: string | null
  startedAt: string | null
  completedAt: string | null
  goodsReadiness: DeliveryGoodsReadiness
  createdAt: string
}

export type DeliveryLinkedOrder = {
  id: string
  deliveryId: string
  orderNo: string
  sourceCustomerOrderId: string | null
  customerName: string
  customerPhone: string
  deliveryAddress: string
  orderNote: string
  orderSequence: number
}

export type DeliveryItem = {
  id: string
  deliveryId: string | null
  deliveryOrderId: string | null
  customerOrderId: string | null
  customerOrderItemId: string | null
  itemId: string | null
  itemDescription: string
  quantity: number
  weightKg: number
  notes: string
}

export type DeliveryProof = {
  id: string
  deliveryId: string | null
  deliveryOrderId: string | null
  customerOrderId: string | null
  proofType: DeliveryProofType
  proofFileId: string | null
  bucketId: string
  objectPath: string
  signedUrl: string
  mimeType: string | null
  sizeBytes: number
  latitude: number | null
  longitude: number | null
  gpsUnavailable: boolean
  failedReason: DeliveryFailedReason | null
  remarks: string
  uploadedBy: string | null
  uploadedAt: string
  createdAt: string
}

export type DeliveryStatusTimelineEntry = {
  id: string
  deliveryId: string | null
  orderId: string | null
  status: DeliveryLifecycleStatus | DeliveryStatus
  statusText: string
  notes: string
  driverId: string | null
  createdAt: string
}

export type CreateManualDeliveryItemPayload = {
  itemId?: string | null
  itemDescription: string
  quantity?: number | null
  weightKg?: number | null
  notes?: string | null
}

export type CreateManualDeliveryOrderPayload = {
  orderNo?: string | null
  sourceCustomerOrderId?: string | null
  customerName?: string | null
  customerPhone?: string | null
  deliveryAddress?: string | null
  orderNote?: string | null
}

export type CreateManualDeliveryPayload = {
  deliveryType: DeliveryJobType
  customerId?: string | null
  customerName: string
  customerPhone?: string | null
  deliveryAddress?: string | null
  deliveryNote?: string | null
  outletId?: string | null
  deliveryTeamId?: string | null
  driverId?: string | null
  defaultVehicleId?: string | null
  vehicleId?: string | null
  requestedDeliveryDate?: string | null
  orders?: CreateManualDeliveryOrderPayload[]
  items?: CreateManualDeliveryItemPayload[]
}

export type DeliveryAddressIssuePayload = {
  suggestedAddress?: string | null
  reason: string
  latitude?: number | null
  longitude?: number | null
  note?: string | null
  photoFile?: File | null
}

export type CreateDeliveryExpensePayload = {
  deliveryId?: string | null
  vehicleId?: string | null
  expenseType: DeliveryExpenseType
  amount: number
  receiptFile: File
  remark?: string | null
}

export type DeliveryExpenseFilters = {
  date?: string | null
  driverId?: string | null
  vehicleId?: string | null
  expenseType?: DeliveryExpenseType | "ALL" | null
  status?: DeliveryExpenseStatus | "ALL" | null
}

export type DeliveryDashboardFilters = {
  date?: string | null
  driverId?: string | null
  status?: DeliveryLifecycleStatus | "ALL" | null
  customer?: string | null
  outletId?: string | null
  deliveryTeamId?: string | null
}

export type DeliveryDashboardDriverMetric = {
  driverId: string | null
  driverName: string
  totalDeliveries: number
  delivered: number
  failed: number
  loaded: number
  outForDelivery: number
  totalWeightKg: number
}

export type DeliveryDashboardAddressSuggestion = {
  id: string
  deliveryId: string | null
  customerId: string | null
  customerName: string
  suggestedAddress: string
  suggestedLatitude: number | null
  suggestedLongitude: number | null
  reason: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  photoFileId: string | null
  bucketId: string
  objectPath: string
  signedUrl: string
  createdAt: string
}

export type DeliveryDashboardData = {
  deliveries: Delivery[]
  kpis: {
    todayDeliveries: number
    pendingAvailable: number
    loaded: number
    outForDelivery: number
    deliveredToday: number
    failedToday: number
    overdue: number
    totalWeightToday: number
  }
  driverPerformance: DeliveryDashboardDriverMetric[]
  deliveryWeightByDriver: DeliveryChartPoint[]
  reviews: {
    failedDeliveries: Delivery[]
    gpsUnavailable: Delivery[]
    addressSuggestions: DeliveryDashboardAddressSuggestion[]
    pendingExpenses: number
    lateDeliveries: Delivery[]
    slowDeliveries: Delivery[]
  }
}

export type DeliveryDetail = Delivery & {
  orders: DeliveryLinkedOrder[]
  items: DeliveryItem[]
  proofs: DeliveryProof[]
  statusLogs: DeliveryStatusTimelineEntry[]
  expenses: DeliveryExpense[]
  addressSuggestions: DeliveryDashboardAddressSuggestion[]
}
