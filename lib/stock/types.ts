export const stockCategories = ["MEAT", "ORGANS", "PROCESSED"] as const

export const stockMovementTypes = [
  "INBOUND",
  "OUTBOUND_SALES",
  "OUTBOUND_TRANSFER",
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
  "ADJUSTED_OUT",
  "DAMAGED",
] as const

export const stockInboundSources = [
  "supplier_import",
  "processing_output",
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

export type StockCategory = (typeof stockCategories)[number]
export type StockMovementType = (typeof stockMovementTypes)[number]
export type StockUnitStatus = (typeof stockUnitStatuses)[number]
export type StockInboundSource = (typeof stockInboundSources)[number]
export type StockTakeStatus = (typeof stockTakeStatuses)[number]

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
  active: boolean
}

export type Item = {
  id: string
  itemCode: string
  category: StockCategory
  section: string
  name: string
  barcodeRequired: boolean
  active: boolean
}

export type StockUnit = {
  id: string
  barcode: string
  itemId: string
  brandId: string | null
  originId: string | null
  locationId: string
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
  locationId: string
  barcodeWeightStart: number
  barcodeWeightLength: number
  barcodeWeightDecimals: number
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
  itemName: string
  barcode: string
  fromLocation: string
  toLocation: string
  quantity: number
  weightKg: number
  referenceNo: string
  notes: string
  createdAt: string
}

export type StockBalanceRow = {
  id: string
  itemName: string
  category: StockCategory
  locationName: string
  unitCount: number
  totalWeightKg: number
  noBarcodeQuantity: number
  noBarcodeWeightKg: number
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
  status: StockTakeStatus
  createdAt: string
  submittedAt: string | null
  approvedAt: string | null
}

export type StockTakeLine = {
  id: string
  sessionId: string
  itemId: string
  barcode: string | null
  itemName: string
  systemCount: number
  actualCount: number
  varianceCount: number
  systemWeightKg: number
  actualWeightKg: number
  varianceWeightKg: number
  notes: string
}

export type StockReportRow = {
  id: string
  reportName: string
  locationName: string
  category: string
  count: number
  weightKg: number
  generatedAt: string
}

export type StockPageData = {
  demoMode: boolean
  brands: Brand[]
  origins: Origin[]
  locations: StockLocation[]
  items: Item[]
  units: StockUnit[]
  barcodeWeightRules: BarcodeWeightRule[]
  noBarcodeStock: NoBarcodeStock[]
  movements: StockMovement[]
  balances: StockBalanceRow[]
  stockTakeSessions: StockTakeSession[]
  stockTakeLines: StockTakeLine[]
  reports: StockReportRow[]
  dashboard: {
    kpis: DashboardKpi[]
    categoryMix: ChartPoint[]
    locationStock: ChartPoint[]
    movementTrend: MovementTrendPoint[]
  }
}

export type MovementFilters = {
  q?: string
  type?: string
  location?: string
}
