export const stockCategories = ["MEAT", "ORGANS", "PROCESSED"] as const

export const stockMovementTypes = [
  "INBOUND",
  "OUTBOUND_SALES",
  "OUTBOUND_TRANSFER",
  "OUTBOUND_PROCESSING",
  "OUTBOUND_SPOILED",
  "OUTBOUND_RETURN_SUPPLIER",
  "OUTBOUND_SAMPLE_TESTING",
  "INBOUND_VOID",
  "TRANSFER_RECEIVED",
  "RETURN",
  "STOCK_TAKE_ADJUSTMENT",
  "MANUAL_ADJUSTMENT",
  "NO_BARCODE_INBOUND",
  "NO_BARCODE_OUTBOUND",
] as const

export const stockUnitStatuses = [
  "IN_STOCK",
  "OUTBOUNDED",
  "TRANSFER_PENDING",
  "TRANSFERRED",
  "SOLD",
  "RETURNED",
  "HOLD",
  "HOLD_RETURN_SUPPLIER",
  "INSPECTION",
  "VOIDED",
  "ADJUSTED_OUT",
  "DAMAGED",
] as const

export const stockInboundSources = [
  "supplier_import",
  "processing_output",
  "customer_return",
  "transfer_received",
  "manual_adjustment",
  "other",
  // Legacy values kept readable for existing rows/migrations.
  "return",
  "transfer",
] as const

export const stockTakeStatuses = [
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "APPROVED",
  "REJECTED",
] as const

export const stockDamageReasons = [
  "expired",
  "broken_packaging",
  "smell",
  "wrong_temperature",
  "customer_rejected",
  "other",
] as const

export const stockDamageRequestStatuses = [
  "SUBMITTED",
  "MANAGER_REVIEWED",
  "DIRECTOR_APPROVED",
  "REJECTED",
] as const

export const stockReturnSupplierRequestStatuses = [
  "SUBMITTED",
  "MANAGER_REVIEWED",
  "REJECTED",
] as const

export type StockCategory = (typeof stockCategories)[number]
export type StockMovementType = (typeof stockMovementTypes)[number]
export type StockUnitStatus = (typeof stockUnitStatuses)[number]
export type StockInboundSource = (typeof stockInboundSources)[number]
export type StockTakeStatus = (typeof stockTakeStatuses)[number]
export type StockDamageReason = (typeof stockDamageReasons)[number]
export type StockDamageRequestStatus =
  (typeof stockDamageRequestStatuses)[number]
export type StockReturnSupplierRequestStatus =
  (typeof stockReturnSupplierRequestStatuses)[number]

export type Brand = {
  id: string
  name: string
  active: boolean
}

export type Origin = {
  id: string
  name: string
  active: boolean
}

export type StockLocation = {
  id: string
  name: string
  outletId?: string | null
  isDefaultForOutlet?: boolean
  active: boolean
}

export type StockOutlet = {
  id: string
  name: string
}

export type Item = {
  id: string
  itemCode: string
  category: StockCategory
  defaultBrandId: string | null
  displayName?: string | null
  section: string
  name: string
  chineseName: string | null
  ibanName: string | null
  barcodeRequired: boolean
  active: boolean
  defaultLowStockLevel: number
  defaultWeightKg: number | null
}

export type StockUnit = {
  id: string
  barcode: string
  itemId: string
  brandId: string | null
  originId: string | null
  locationId: string
  transferToLocationId?: string | null
  status: StockUnitStatus
  netWeightKg: number
  inboundSource: StockInboundSource
  batchNo: string | null
  receivedAt: string
}

export type BarcodeWeightRule = {
  id: string
  itemId: string
  brandId: string | null
  originId: string | null
  locationId: string | null
  barcodeWeightStart: number
  barcodeWeightLength: number
  barcodeWeightDecimals: number
  barcodeLength: number | null
  sampleBarcode: string | null
  updatedAt: string
}

export type NoBarcodeStock = {
  id: string
  itemId: string
  brandId: string | null
  originId: string | null
  locationId: string
  quantity: number
  weightKg: number
}

export type StockMovement = {
  id: string
  movementType: StockMovementType
  stockUnitId: string | null
  itemName: string
  brandName: string
  barcode: string
  fromLocation: string
  toLocation: string
  quantity: number
  weightKg: number
  referenceNo: string
  notes: string
  createdAt: string
}

export type StockScanLog = {
  id: string
  barcode: string
  action: string
  success: boolean
  message: string
  scannedBy: string | null
  issueType?: string | null
  itemId?: string | null
  selectedItemId?: string | null
  expectedLocationId?: string | null
  scannedLocationId?: string | null
  expectedStatus?: string | null
  scannedStatus?: string | null
  relatedContext?: Record<string, unknown>
  reviewStatus?: string
  createdAt: string
}

export type StockScanAlert = {
  id: string
  barcode: string
  action: string
  message: string
  scannedBy: string | null
  issueType: string | null
  itemName: string | null
  selectedItemName: string | null
  expectedLocationId: string | null
  expectedLocationName: string | null
  scannedLocationId: string | null
  scannedLocationName: string | null
  expectedStatus: string | null
  scannedStatus: string | null
  relatedContext: Record<string, unknown>
  reviewStatus: string
  createdAt: string
}

export type StockBalanceRow = {
  id: string
  itemId: string
  brandId: string | null
  itemName: string
  brandName: string
  category: StockCategory
  locationName: string
  unitCount: number
  totalWeightKg: number
  noBarcodeQuantity: number
  noBarcodeWeightKg: number
  totalQuantity: number
  combinedWeightKg: number
  hasNegativeStock: boolean
  negativeQuantity: number
  negativeWeightKg: number
}

export type NegativeStockAlert = {
  id: string
  itemName: string
  locationName: string
  quantity: number
  weightKg: number
  reason: string
}

export type StockAgeAlertLevel = "OVER_6_MONTHS" | "OVER_12_MONTHS"

export type StockAgeAlert = {
  id: string
  barcode: string
  itemName: string
  locationName: string
  receivedAt: string
  ageDays: number
  alertLevel: StockAgeAlertLevel
}

export type TransferPendingAlert = {
  id: string
  barcode: string
  itemName: string
  fromLocation: string
  toLocation: string
  transferredAt: string
  ageDays: number
}

export type DashboardKpi = {
  label: string
  value: string
  detail: string
}

export type ChartPoint = {
  name: string
  value: number
}

export type MovementTrendPoint = {
  date: string
  inbound: number
  outbound: number
  transfer: number
}

export type StockTakeSession = {
  id: string
  sessionNo: string
  locationId: string
  locationName: string
  itemId: string | null
  brandId: string | null
  status: StockTakeStatus
  createdAt: string
  submittedAt: string | null
  managerReviewedAt: string | null
  managerSignature: string | null
  approvedAt: string | null
  directorSignature: string | null
}

export type StockTakeLine = {
  id: string
  sessionId: string
  itemId: string
  brandId: string | null
  barcode: string | null
  itemName: string
  systemCount: number
  actualCount: number
  varianceCount: number
  systemWeightKg: number
  actualWeightKg: number
  varianceWeightKg: number
  exceptionType: "UNKNOWN_BARCODE" | "WRONG_LOCATION" | null
  exceptionStatus: "PENDING" | "RESOLVED" | null
  exceptionLocationId: string | null
  sourceStockUnitId: string | null
  resolvedStockUnitId: string | null
  notes: string
  createdAt: string
}

export type StockDamageRequest = {
  id: string
  requestNo: string
  barcode: string
  stockUnitId: string
  itemId: string
  itemName: string
  locationId: string
  locationName: string
  reason: StockDamageReason
  status: StockDamageRequestStatus
  photoPath: string
  notes: string
  managerSignature: string | null
  directorSignature: string | null
  requestedAt: string
}

export type StockReturnSupplierRequest = {
  id: string
  requestNo: string
  barcode: string
  stockUnitId: string
  itemId: string
  itemName: string
  locationId: string
  locationName: string
  supplierName: string
  status: StockReturnSupplierRequestStatus
  notes: string
  managerSignature: string | null
  requestedAt: string
}

export type StockReportRow = {
  id: string
  reportName: string
  locationName: string
  itemName: string
  brandName: string
  originName: string
  category: string
  count: number
  weightKg: number
  generatedAt: string
}

export type StockPageData = {
  demoMode: boolean
  brands: Brand[]
  origins: Origin[]
  outlets: StockOutlet[]
  locations: StockLocation[]
  items: Item[]
  units: StockUnit[]
  barcodeWeightRules: BarcodeWeightRule[]
  noBarcodeStock: NoBarcodeStock[]
  movements: StockMovement[]
  scanLogs: StockScanLog[]
  balances: StockBalanceRow[]
  stockTakeSessions: StockTakeSession[]
  stockTakeLines: StockTakeLine[]
  damageRequests: StockDamageRequest[]
  returnSupplierRequests: StockReturnSupplierRequest[]
  reports: StockReportRow[]
  dashboard: {
    kpis: DashboardKpi[]
    categoryMix: ChartPoint[]
    locationStock: ChartPoint[]
    movementTrend: MovementTrendPoint[]
    negativeStockAlerts: NegativeStockAlert[]
    stockAgeAlerts: StockAgeAlert[]
    transferPendingAlerts: TransferPendingAlert[]
    scanAlerts: StockScanAlert[]
  }
}

export type MovementFilters = {
  q?: string
  type?: string
  movementType?: string
  location?: string
  dateFrom?: string
  dateTo?: string
  item?: string
  brand?: string
  origin?: string
  status?: string
  user?: string
}
