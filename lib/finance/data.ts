import {
  asRecordArray,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  demoDirectorReports,
  demoFinanceContainers,
  demoFinanceInvoices,
  demoFinancePeople,
} from "@/lib/finance/demo-data"
import {
  containerStatuses,
  directorReportTypes,
  financePaymentStatuses,
  financeInvoiceStatuses,
  financeInvoiceTypes,
  type ContainerStatus,
  type DirectorReportSnapshot,
  type DirectorReportType,
  type FinanceContainer,
  type FinanceInvoice,
  type FinanceInvoiceStatus,
  type FinanceInvoiceType,
  type FinancePaymentStatus,
  type FinancePageData,
  type FinancePerson,
} from "@/lib/finance/types"

function isInvoiceType(value: string): value is FinanceInvoiceType {
  return financeInvoiceTypes.includes(value as FinanceInvoiceType)
}

function isInvoiceStatus(value: string): value is FinanceInvoiceStatus {
  return financeInvoiceStatuses.includes(value as FinanceInvoiceStatus)
}

function isPaymentStatus(value: string): value is FinancePaymentStatus {
  return financePaymentStatuses.includes(value as FinancePaymentStatus)
}

function isContainerStatus(value: string): value is ContainerStatus {
  return containerStatuses.includes(value as ContainerStatus)
}

function isReportType(value: string): value is DirectorReportType {
  return directorReportTypes.includes(value as DirectorReportType)
}

async function loadRows(table: string) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.from(table).select("*").limit(1000)

  if (error) {
    return []
  }

  return asRecordArray(data)
}

function findById<T extends { id: string }>(
  rows: T[],
  id: string | null | undefined
) {
  return rows.find((row) => row.id === id)
}

function mapPerson(row: Record<string, unknown>): FinancePerson {
  return {
    id: readString(row.id),
    fullName: readString(row.full_name, readString(row.email, "ERP User")),
    email: readString(row.email),
  }
}

function daysBetween(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`)
  const today = new Date()
  const normalizedToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  if (Number.isNaN(start.getTime())) {
    return 0
  }

  return Math.max(
    0,
    Math.floor((normalizedToday.getTime() - start.getTime()) / 86400000)
  )
}

function agingBucket(ageDays: number) {
  if (ageDays <= 30) {
    return "0-30"
  }

  if (ageDays <= 60) {
    return "31-60"
  }

  if (ageDays <= 90) {
    return "61-90"
  }

  return "90+"
}

function mapInvoice(
  row: Record<string, unknown>,
  people: FinancePerson[],
  filePaths: Map<string, string>
): FinanceInvoice {
  const invoiceType = readString(row.invoice_type, "AR")
  const status = readString(row.status, "SUBMITTED")
  const rawPaymentStatus = readString(row.payment_status, "UNPAID")
  const fileId = readNullableString(row.file_id)
  const reviewedBy = readNullableString(row.reviewed_by)
  const approvedBy = readNullableString(row.approved_by)
  const createdBy = readNullableString(row.created_by)

  const ageDays = daysBetween(readString(row.invoice_date))
  const derivedPaymentStatus =
    status === "PAID"
      ? "PAID"
      : isPaymentStatus(rawPaymentStatus)
        ? rawPaymentStatus
        : "UNPAID"

  return {
    id: readString(row.id),
    invoiceNo: readString(row.invoice_no),
    invoiceType: isInvoiceType(invoiceType) ? invoiceType : "AR",
    partyName: readString(row.party_name),
    invoiceDate: readString(row.invoice_date),
    dueDate: readNullableString(row.due_date),
    amount: readNumber(row.amount),
    taxAmount: readNumber(row.tax_amount),
    totalAmount: readNumber(row.total_amount),
    itemList: readString(row.item_list, "-"),
    paymentStatus: derivedPaymentStatus,
    ageDays,
    agingBucket: agingBucket(ageDays),
    status: isInvoiceStatus(status) ? status : "SUBMITTED",
    fileId,
    filePath: fileId ? filePaths.get(fileId) ?? "-" : "-",
    relatedModule: readString(row.related_module, "-"),
    reviewedByName: findById(people, reviewedBy)?.fullName ?? "-",
    approvedByName: findById(people, approvedBy)?.fullName ?? "-",
    paidAt: readNullableString(row.paid_at),
    notes: readString(row.notes),
    createdByName: findById(people, createdBy)?.fullName ?? "-",
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapContainer(
  row: Record<string, unknown>,
  invoices: FinanceInvoice[],
  people: FinancePerson[]
): FinanceContainer {
  const status = readString(row.status, "OPEN")
  const invoiceId = readNullableString(row.invoice_id)
  const updatedBy = readNullableString(row.updated_by)

  return {
    id: readString(row.id),
    containerNo: readString(row.container_no),
    supplierName: readString(row.supplier_name),
    etaDate: readNullableString(row.eta_date),
    arrivalDate: readNullableString(row.arrival_date),
    status: isContainerStatus(status) ? status : "OPEN",
    totalCost: readNumber(row.total_cost),
    currency: readString(row.currency, "MYR"),
    invoiceId,
    invoiceNo: findById(invoices, invoiceId)?.invoiceNo ?? "-",
    updatedByName: findById(people, updatedBy)?.fullName ?? "-",
    notes: readString(row.notes),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapReport(
  row: Record<string, unknown>,
  people: FinancePerson[]
): DirectorReportSnapshot {
  const reportType = readString(row.report_type, "DAILY")
  const generatedBy = readNullableString(row.generated_by)

  return {
    id: readString(row.id),
    reportNo: readString(row.report_no),
    reportType: isReportType(reportType) ? reportType : "DAILY",
    periodStart: readString(row.period_start),
    periodEnd: readString(row.period_end),
    totalSales: readNumber(row.total_sales),
    cashCollected: readNumber(row.cash_collected),
    outstandingAr: readNumber(row.outstanding_ar),
    outstandingAp: readNumber(row.outstanding_ap),
    stockValue: readNumber(row.stock_value),
    expenseTotal: readNumber(row.expense_total),
    generatedByName: findById(people, generatedBy)?.fullName ?? "-",
    notes: readString(row.notes),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function money(value: number) {
  return `RM ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function buildDashboard(
  invoices: FinanceInvoice[],
  containers: FinanceContainer[],
  reports: DirectorReportSnapshot[]
) {
  const outstandingAr = invoices
    .filter(
      (invoice) =>
        invoice.invoiceType === "AR" &&
        invoice.status !== "PAID" &&
        invoice.status !== "VOID" &&
        invoice.status !== "REJECTED"
    )
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const outstandingAp = invoices
    .filter(
      (invoice) =>
        invoice.invoiceType === "AP" &&
        invoice.status !== "PAID" &&
        invoice.status !== "VOID" &&
        invoice.status !== "REJECTED"
    )
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const pendingDirector = invoices.filter(
    (invoice) => invoice.status === "ACCOUNT_REVIEWED"
  )
  const overdueAr = invoices.filter(
    (invoice) =>
      invoice.invoiceType === "AR" &&
      invoice.paymentStatus !== "PAID" &&
      invoice.ageDays > 30
  )
  const overdueAp = invoices.filter(
    (invoice) =>
      invoice.invoiceType === "AP" &&
      invoice.paymentStatus !== "PAID" &&
      invoice.ageDays > 30
  )
  const openContainers = containers.filter(
    (container) => container.status !== "CLOSED"
  )

  return {
    kpis: [
      {
        label: "Outstanding AR",
        value: money(outstandingAr),
        detail: "Receivable invoices not yet paid",
      },
      {
        label: "Outstanding AP",
        value: money(outstandingAp),
        detail: "Payable invoices not yet paid",
      },
      {
        label: "AR >30 days",
        value: money(
          overdueAr.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
        ),
        detail: `${overdueAr.length} receivable invoices past 30 days`,
      },
      {
        label: "AP >30 days",
        value: money(
          overdueAp.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
        ),
        detail: `${overdueAp.length} payable invoices past 30 days`,
      },
      {
        label: "Director approval",
        value: String(pendingDirector.length),
        detail: "Finance invoices waiting for director",
      },
      {
        label: "Open containers",
        value: String(openContainers.length),
        detail: "Containers not closed",
      },
      {
        label: "Reports",
        value: String(reports.length),
        detail: "Director report snapshots",
      },
    ],
  }
}

export async function getFinancePageData(): Promise<FinancePageData> {
  const [profileRows, invoiceRows, containerRows, reportRows, fileRows] =
    await Promise.all([
      loadRows("profiles"),
      loadRows("finance_invoices"),
      loadRows("finance_containers"),
      loadRows("director_report_snapshots"),
      loadRows("files"),
    ])

  if (!profileRows) {
    return {
      demoMode: true,
      people: demoFinancePeople,
      invoices: demoFinanceInvoices,
      containers: demoFinanceContainers,
      reports: demoDirectorReports,
      dashboard: buildDashboard(
        demoFinanceInvoices,
        demoFinanceContainers,
        demoDirectorReports
      ),
    }
  }

  const people = profileRows.map(mapPerson)
  const filePaths = new Map(
    (fileRows ?? [])
      .filter((row) => readString(row.module) === "finance")
      .map((row) => [readString(row.id), readString(row.object_path)])
  )
  const invoices = (invoiceRows ?? [])
    .map((row) => mapInvoice(row, people, filePaths))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const containers = (containerRows ?? [])
    .map((row) => mapContainer(row, invoices, people))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const reports = (reportRows ?? [])
    .map((row) => mapReport(row, people))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    demoMode: false,
    people,
    invoices,
    containers,
    reports,
    dashboard: buildDashboard(invoices, containers, reports),
  }
}
