export const financeInvoiceTypes = ["AR", "AP"] as const

export const financeInvoiceStatuses = [
  "DRAFT",
  "SUBMITTED",
  "ACCOUNT_REVIEWED",
  "DIRECTOR_APPROVED",
  "REJECTED",
  "PAID",
  "VOID",
] as const

export const financePaymentStatuses = [
  "UNPAID",
  "PARTIAL",
  "PAID",
  "OVERDUE",
] as const

export const containerStatuses = [
  "OPEN",
  "IN_TRANSIT",
  "ARRIVED",
  "CLOSED",
] as const

export const directorReportTypes = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "CUSTOM",
] as const

export type FinanceInvoiceType = (typeof financeInvoiceTypes)[number]
export type FinanceInvoiceStatus = (typeof financeInvoiceStatuses)[number]
export type FinancePaymentStatus = (typeof financePaymentStatuses)[number]
export type ContainerStatus = (typeof containerStatuses)[number]
export type DirectorReportType = (typeof directorReportTypes)[number]

export type FinancePerson = {
  id: string
  fullName: string
  email: string
}

export type FinanceInvoice = {
  id: string
  invoiceNo: string
  invoiceType: FinanceInvoiceType
  partyName: string
  invoiceDate: string
  dueDate: string | null
  amount: number
  taxAmount: number
  totalAmount: number
  itemList: string
  paymentStatus: FinancePaymentStatus
  ageDays: number
  agingBucket: string
  status: FinanceInvoiceStatus
  fileId: string | null
  filePath: string
  relatedModule: string
  reviewedByName: string
  approvedByName: string
  paidAt: string | null
  notes: string
  createdByName: string
  createdAt: string
}

export type FinanceContainer = {
  id: string
  containerNo: string
  supplierName: string
  etaDate: string | null
  arrivalDate: string | null
  status: ContainerStatus
  totalCost: number
  currency: string
  invoiceId: string | null
  invoiceNo: string
  updatedByName: string
  notes: string
  createdAt: string
}

export type DirectorReportSnapshot = {
  id: string
  reportNo: string
  reportType: DirectorReportType
  periodStart: string
  periodEnd: string
  totalSales: number
  cashCollected: number
  outstandingAr: number
  outstandingAp: number
  stockValue: number
  expenseTotal: number
  generatedByName: string
  notes: string
  createdAt: string
}

export type FinanceKpi = {
  label: string
  value: string
  detail: string
}

export type FinancePageData = {
  demoMode: boolean
  people: FinancePerson[]
  invoices: FinanceInvoice[]
  containers: FinanceContainer[]
  reports: DirectorReportSnapshot[]
  dashboard: {
    kpis: FinanceKpi[]
  }
}
