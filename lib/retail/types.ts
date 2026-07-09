export const retailSaleStatuses = [
  "DRAFT",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const

export const retailPaymentMethods = [
  "CASH",
  "CARD",
  "ONLINE_TRANSFER",
  "EWALLET",
  "CREDIT",
] as const

export const retailExpensePaymentMethods = [
  "CASH",
  "ONLINE_TRANSFER",
  "EWALLET",
  "CREDIT",
] as const

export const retailPaymentStatuses = [
  "UNPAID",
  "PARTIAL",
  "PAID",
  "REFUNDED",
] as const

export const retailCashSessionStatuses = ["OPEN", "CLOSED"] as const

export const retailClosingStatuses = [
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "APPROVED",
  "REJECTED",
] as const

export const retailProcessingStatuses = [
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "REJECTED",
  "CANCELLED",
  "OPEN",
  "COMPLETED",
] as const

export const retailCleaningFrequencies = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
] as const

export const retailCleaningStatuses = ["PENDING", "DONE", "MISSED"] as const

export const retailExpenseStatuses = [
  "SUBMITTED",
  "REVIEWED",
  "REJECTED",
  "CANCELLED",
] as const

export type RetailSaleStatus = (typeof retailSaleStatuses)[number]
export type RetailPaymentMethod = (typeof retailPaymentMethods)[number]
export type RetailExpensePaymentMethod =
  (typeof retailExpensePaymentMethods)[number]
export type RetailPaymentStatus = (typeof retailPaymentStatuses)[number]
export type RetailCashSessionStatus =
  (typeof retailCashSessionStatuses)[number]
export type RetailClosingStatus = (typeof retailClosingStatuses)[number]
export type RetailProcessingStatus = (typeof retailProcessingStatuses)[number]
export type RetailCleaningFrequency =
  (typeof retailCleaningFrequencies)[number]
export type RetailCleaningStatus = (typeof retailCleaningStatuses)[number]
export type RetailExpenseStatus = (typeof retailExpenseStatuses)[number]

export type RetailPerson = {
  id: string
  fullName: string
  email: string
}

export type RetailOutlet = {
  id: string
  name: string
}

export type RetailDepartment = {
  id: string
  name: string
}

export type RetailStockLocation = {
  id: string
  name: string
}

export type RetailItem = {
  id: string
  itemCode: string
  category: string
  section: string
  name: string
  label: string
  barcodeRequired: boolean
  processingMinYieldPercent: number | null
  processingMaxLossPercent: number | null
}

export type RetailBrand = {
  id: string
  name: string
}

export type RetailOrigin = {
  id: string
  name: string
}

export type RetailRegister = {
  id: string
  outletId: string | null
  outletName: string
  stockLocationId: string | null
  stockLocationName: string
  registerName: string
  active: boolean
}

export type RetailCashSession = {
  id: string
  registerId: string
  registerName: string
  status: RetailCashSessionStatus
  openingFloat: number
  expectedCash: number
  closingCash: number
  varianceAmount: number
  openedByName: string
  closedByName: string
  openedAt: string
  closedAt: string | null
  notes: string
}

export type RetailSale = {
  id: string
  saleNo: string
  registerId: string | null
  registerName: string
  cashSessionId: string | null
  customerName: string
  customerPhone: string
  status: RetailSaleStatus
  paymentStatus: RetailPaymentStatus
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  changeAmount: number
  soldBy: string | null
  soldByName: string
  completedAt: string | null
  cancelledAt: string | null
  notes: string
  createdAt: string
}

export type RetailSaleLine = {
  id: string
  saleId: string
  saleNo: string
  itemId: string
  itemLabel: string
  brandName: string
  originName: string
  stockLocationName: string
  barcode: string
  quantity: number
  weightKg: number
  unitPrice: number
  lineDiscount: number
  lineTotal: number
  notes: string
}

export type RetailDailySale = {
  id: string
  outletId: string | null
  outletName: string
  salesDate: string
  status: "DRAFT" | "CONFIRMED"
  cashSales: number
  bankTransferSales: number
  ewalletSales: number
  creditSales: number
  totalSales: number
  attachmentUrl: string | null
  attachmentStatus: "OK" | "MISSING"
  createdByName: string
  updatedByName: string
  remarks: string
  createdAt: string
  updatedAt: string
}

export type RetailDailyClosing = {
  id: string
  outletId: string | null
  outletName: string
  closingDate: string
  openingCash: number
  cashSales: number
  bankTransferSales: number
  ewalletSales: number
  creditSales: number
  cashExpenses: number
  expectedCash: number
  actualCashCounted: number
  totalSales: number
  cashReceived: number
  expensesAmount: number
  closingCash: number
  varianceAmount: number
  status: RetailClosingStatus
  submittedByName: string
  submittedAt: string | null
  reviewedByName: string
  reviewedAt: string | null
  remarks: string
  notes: string
  createdAt: string
}

export type RetailPayment = {
  id: string
  saleId: string
  saleNo: string
  paymentMethod: RetailPaymentMethod
  paymentStatus: RetailPaymentStatus
  amount: number
  referenceNo: string
  receivedByName: string
  notes: string
  createdAt: string
}

export type RetailPriceRule = {
  id: string
  itemId: string
  itemLabel: string
  brandId: string | null
  brandName: string
  originId: string | null
  originName: string
  outletId: string | null
  outletName: string
  unitPrice: number
  effectiveFrom: string
  effectiveTo: string | null
  active: boolean
}

export type RetailProcessingLine = {
  id: string
  itemId: string | null
  itemName: string
  quantity: number
  weightKg: number
  remarks: string
}

export type RetailProcessingBom = {
  id: string
  outletId: string | null
  outletName: string
  name: string
  rawMaterialItemNames: string[]
  finishedProductItemNames: string[]
  active: boolean
  remarks: string
  expectedYieldMinPercent: number | null
  expectedYieldMaxPercent: number | null
  expectedWastagePercent: number | null
  createdByName: string
  createdAt: string
  updatedByName: string
  updatedAt: string
}

export type RetailProcessingBatch = {
  id: string
  batchNo: string
  processingBomId: string | null
  outletId: string | null
  outletName: string
  departmentId: string | null
  departmentName: string
  stockLocationId: string | null
  stockLocationName: string
  processingDate: string
  processingType: string
  rawLines: RetailProcessingLine[]
  rawItemLabel: string
  rawBrandName: string
  rawOriginName: string
  rawQuantity: number
  rawWeightKg: number
  finishedLines: RetailProcessingLine[]
  finishedItemLabel: string
  finishedBrandName: string
  finishedOriginName: string
  finishedQuantity: number
  finishedWeightKg: number
  wastageWeightKg: number
  wastagePercent: number
  wastageReason: string
  wastagePhotoUrl: string | null
  wastageRemarks: string
  accountedWeightKg: number
  unaccountedDifferenceKg: number
  unaccountedDifferencePercent: number
  yieldPercent: number
  lossWeightKg: number
  processingMinYieldPercent: number | null
  processingMaxLossPercent: number | null
  yieldAlert: string
  warningMessage: string
  status: RetailProcessingStatus
  createdByName: string
  createdAt: string
  submittedByName: string
  submittedAt: string | null
  reviewedByName: string
  reviewedAt: string | null
  rejectionReason: string
  processedByName: string
  processedAt: string
  remarks: string
  notes: string
}

export type RetailCleaningTask = {
  id: string
  outletId: string | null
  outletName: string
  departmentId: string | null
  departmentName: string
  taskName: string
  frequency: RetailCleaningFrequency
  dueDate: string
  active: boolean
  status: RetailCleaningStatus
  assignedToName: string
  completedByName: string
  completedAt: string | null
  completionPhotoUrl: string | null
  remarks: string
  createdByName: string
  createdAt: string
  updatedByName: string
  updatedAt: string
}

export type RetailExpense = {
  id: string
  outletId: string | null
  outletName: string
  expenseDate: string
  category: string
  supplierPayee: string
  amount: number
  paymentMethod: RetailExpensePaymentMethod
  status: RetailExpenseStatus
  receiptUrl: string | null
  submittedById: string | null
  submittedByName: string
  submittedAt: string | null
  reviewedByName: string
  reviewedAt: string | null
  rejectionReason: string
  remarks: string
  createdAt: string
}

export type RetailExpenseCategory = {
  id: string
  outletId: string | null
  outletName: string
  name: string
  active: boolean
}

export type RetailAuditLog = {
  id: string
  tableName: string
  recordId: string
  outletId: string | null
  outletName: string
  fieldChanged: string
  oldValue: string
  newValue: string
  editedByName: string
  editedAt: string
  reason: string
}

export type RetailStockUnit = {
  id: string
  barcode: string
  itemId: string
  itemLabel: string
  brandId: string | null
  brandName: string
  originId: string | null
  originName: string
  locationId: string
  locationName: string
  netWeightKg: number
  status: string
}

export type RetailNoBarcodeStock = {
  id: string
  itemId: string
  itemLabel: string
  brandId: string | null
  brandName: string
  originId: string | null
  originName: string
  locationId: string
  locationName: string
  quantity: number
  weightKg: number
}

export type RetailKpi = {
  label: string
  value: string
  detail: string
}

export type RetailReportFilters = {
  date?: string
  dateFrom?: string
  dateTo?: string
  outletId?: string
  paymentMethod?: string
  status?: string
  processingItem?: string
  processingType?: string
}

export type RetailPageData = {
  demoMode: boolean
  people: RetailPerson[]
  outlets: RetailOutlet[]
  departments: RetailDepartment[]
  stockLocations: RetailStockLocation[]
  items: RetailItem[]
  brands: RetailBrand[]
  origins: RetailOrigin[]
  registers: RetailRegister[]
  cashSessions: RetailCashSession[]
  dailySales: RetailDailySale[]
  dailyClosings: RetailDailyClosing[]
  sales: RetailSale[]
  saleLines: RetailSaleLine[]
  payments: RetailPayment[]
  priceRules: RetailPriceRule[]
  processingBoms: RetailProcessingBom[]
  processingBatches: RetailProcessingBatch[]
  cleaningTasks: RetailCleaningTask[]
  expenseCategories: RetailExpenseCategory[]
  expenses: RetailExpense[]
  auditLogs: RetailAuditLog[]
  stockUnits: RetailStockUnit[]
  noBarcodeStock: RetailNoBarcodeStock[]
  dashboard: {
    kpis: RetailKpi[]
  }
}
