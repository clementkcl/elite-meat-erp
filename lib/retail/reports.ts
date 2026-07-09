import type { CurrentProfile } from "@/lib/auth/types"
import type {
  RetailCleaningTask,
  RetailDailyClosing,
  RetailDailySale,
  RetailExpense,
  RetailKpi,
  RetailOutlet,
  RetailPageData,
  RetailProcessingBatch,
  RetailReportFilters,
} from "@/lib/retail/types"

type RetailReportScope = "manager" | "global"

type RetailReportData = {
  scope: RetailReportScope
  focusDate: string
  filteredDailySales: RetailDailySale[]
  filteredExpenses: RetailExpense[]
  filteredCleaningTasks: RetailCleaningTask[]
  missingCleaningTasks: RetailCleaningTask[]
  filteredDailyClosings: RetailDailyClosing[]
  filteredProcessingBatches: RetailProcessingBatch[]
  kpis: RetailKpi[]
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function clean(value: string | undefined) {
  const trimmed = value?.trim()

  return trimmed ? trimmed : undefined
}

function sameDate(value: string | null | undefined, target: string) {
  return Boolean(value?.slice(0, 10) === target)
}

function dateInRange(
  value: string | null | undefined,
  filters: RetailReportFilters
) {
  const date = value?.slice(0, 10)
  const exactDate = clean(filters.date)
  const dateFrom = clean(filters.dateFrom)
  const dateTo = clean(filters.dateTo)

  if (!date) {
    return false
  }

  return (
    (!exactDate || date === exactDate) &&
    (!dateFrom || date >= dateFrom) &&
    (!dateTo || date <= dateTo)
  )
}

function money(value: number) {
  return `RM ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function weight(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`
}

function percent(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
}

function sum<T>(rows: T[], getValue: (row: T) => number) {
  return rows.reduce((total, row) => total + getValue(row), 0)
}

function daysBetween(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T00:00:00.000Z`)

  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000)
}

function monthDiff(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T00:00:00.000Z`)

  return (
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    endDate.getUTCMonth() -
    startDate.getUTCMonth()
  )
}

function isCleaningDueOn(task: RetailCleaningTask, date: string) {
  const anchor = task.dueDate.slice(0, 10)

  if (!task.active || anchor > date) {
    return false
  }

  if (task.frequency === "DAILY") {
    return true
  }

  if (task.frequency === "WEEKLY") {
    return daysBetween(anchor, date) % 7 === 0
  }

  const anchorDay = new Date(`${anchor}T00:00:00.000Z`).getUTCDate()
  const targetDay = new Date(`${date}T00:00:00.000Z`).getUTCDate()

  if (anchorDay !== targetDay) {
    return false
  }

  if (task.frequency === "MONTHLY") {
    return monthDiff(anchor, date) >= 0
  }

  return monthDiff(anchor, date) % 3 === 0
}

function isCleaningDoneOn(task: RetailCleaningTask, date: string) {
  return sameDate(task.completedAt, date) || task.status === "DONE"
}

function cleaningDisplayStatus(task: RetailCleaningTask, date: string) {
  if (!task.active) {
    return "INACTIVE"
  }

  if (isCleaningDoneOn(task, date)) {
    return "DONE"
  }

  if (isCleaningDueOn(task, date)) {
    return "MISSING"
  }

  if (task.status === "MISSED") {
    return "MISSED"
  }

  return task.status
}

function scopeOutlets({
  outlets,
  profile,
  filters,
  canViewAllOutlets,
}: {
  outlets: RetailOutlet[]
  profile: CurrentProfile
  filters: RetailReportFilters
  canViewAllOutlets: boolean
}) {
  const outletId = clean(filters.outletId)

  if (canViewAllOutlets) {
    return outletId
      ? outlets.filter((outlet) => outlet.id === outletId)
      : outlets
  }

  if (!profile.outletId) {
    return []
  }

  return [
    outlets.find((outlet) => outlet.id === profile.outletId) ?? {
      id: profile.outletId,
      name: profile.outletName ?? "Assigned outlet",
    },
  ]
}

function matchesOutlet(
  outletId: string | null,
  filters: RetailReportFilters,
  canViewAllOutlets: boolean
) {
  const selectedOutletId = clean(filters.outletId)

  return !canViewAllOutlets || !selectedOutletId || outletId === selectedOutletId
}

function matchesStatus(status: string, filters: RetailReportFilters) {
  const selectedStatus = clean(filters.status)?.toUpperCase()

  return !selectedStatus || status.toUpperCase() === selectedStatus
}

function matchesPaymentBreakdown(
  sale: RetailDailySale,
  filters: RetailReportFilters
) {
  const selectedMethod = clean(filters.paymentMethod)?.toUpperCase()

  if (!selectedMethod) {
    return true
  }

  if (selectedMethod === "CASH") {
    return sale.cashSales > 0
  }

  if (selectedMethod === "ONLINE_TRANSFER") {
    return sale.bankTransferSales > 0
  }

  if (selectedMethod === "EWALLET") {
    return sale.ewalletSales > 0
  }

  return selectedMethod === "CREDIT" && sale.creditSales > 0
}

function matchesProcessingFilters(
  batch: RetailProcessingBatch,
  filters: RetailReportFilters
) {
  const processingItem = clean(filters.processingItem)?.toLowerCase()
  const processingType = clean(filters.processingType)?.toLowerCase()
  const itemHaystack = [
    batch.rawItemLabel,
    batch.finishedItemLabel,
    ...batch.rawLines.map((line) => line.itemName),
    ...batch.finishedLines.map((line) => line.itemName),
  ]
    .join(" ")
    .toLowerCase()

  return (
    (!processingItem || itemHaystack.includes(processingItem)) &&
    (!processingType ||
      batch.processingType.toLowerCase().includes(processingType))
  )
}

function outletName(outlets: RetailOutlet[], outletId: string | null) {
  return outlets.find((outlet) => outlet.id === outletId)?.name ?? "No outlet"
}

function outletComparison(
  rows: RetailDailySale[],
  outlets: RetailOutlet[]
) {
  const totals = new Map<string, number>()

  for (const sale of rows) {
    const key = sale.outletId ?? "no-outlet"
    totals.set(key, (totals.get(key) ?? 0) + sale.totalSales)
  }

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const [topOutletId, topTotal] = ranked[0] ?? []

  return {
    label: topOutletId ? outletName(outlets, topOutletId) : "-",
    total: topTotal ?? 0,
    count: ranked.length,
  }
}

function outletMetricDetail(
  rows: { outletId: string | null; value: number }[],
  outlets: RetailOutlet[]
) {
  const totals = new Map<string, number>()

  for (const row of rows) {
    const key = row.outletId ?? "no-outlet"
    totals.set(key, (totals.get(key) ?? 0) + row.value)
  }

  return [...totals.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([outletId, total]) => `${outletName(outlets, outletId)} ${money(total)}`)
    .join(" | ")
}

function averageYield(batches: RetailProcessingBatch[]) {
  const withRaw = batches.filter((batch) => batch.rawWeightKg > 0)

  if (withRaw.length === 0) {
    return 0
  }

  return sum(withRaw, (batch) => batch.yieldPercent) / withRaw.length
}

function managerKpis({
  dailySales,
  dailyClosings,
  expenses,
  cleaningTasks,
  missingCleaningTasks,
  processingBatches,
  focusDate,
  scopedOutlets,
}: {
  dailySales: RetailDailySale[]
  dailyClosings: RetailDailyClosing[]
  expenses: RetailExpense[]
  cleaningTasks: RetailCleaningTask[]
  missingCleaningTasks: RetailCleaningTask[]
  processingBatches: RetailProcessingBatch[]
  focusDate: string
  scopedOutlets: RetailOutlet[]
}): RetailKpi[] {
  const daySales = dailySales.filter((sale) => sameDate(sale.salesDate, focusDate))
  const dayClosings = dailyClosings.filter((closing) =>
    sameDate(closing.closingDate, focusDate)
  )
  const dayExpenses = expenses.filter((expense) =>
    sameDate(expense.expenseDate, focusDate)
  )
  const cashExpenses = dayExpenses.filter(
    (expense) =>
      expense.paymentMethod === "CASH" &&
      expense.status !== "REJECTED" &&
      expense.status !== "CANCELLED"
  )
  const requiredCleaning = cleaningTasks.filter((task) =>
    isCleaningDueOn(task, focusDate)
  )
  const completedCleaning = requiredCleaning.filter((task) =>
    isCleaningDoneOn(task, focusDate)
  )
  const dayProcessing = processingBatches.filter((batch) =>
    sameDate(batch.processingDate, focusDate)
  )
  const missingClosings = scopedOutlets.filter(
    (outlet) =>
      !dayClosings.some(
        (closing) =>
          closing.outletId === outlet.id &&
          closing.status !== "DRAFT" &&
          closing.status !== "REJECTED"
      )
  )
  const attachmentWarnings = daySales.filter(
    (sale) => sale.attachmentStatus === "MISSING"
  )

  return [
    {
      label: "Today total sales",
      value: money(sum(daySales, (sale) => sale.totalSales)),
      detail: `AutoCount summaries for ${focusDate}`,
    },
    {
      label: "Cash received",
      value: money(sum(daySales, (sale) => sale.cashSales)),
      detail: "Cash sales from Daily Sales Summary",
    },
    {
      label: "Payment method breakdown",
      value: money(sum(daySales, (sale) => sale.totalSales)),
      detail: `Cash ${money(sum(daySales, (sale) => sale.cashSales))} | Bank ${money(sum(daySales, (sale) => sale.bankTransferSales))} | E-wallet ${money(sum(daySales, (sale) => sale.ewalletSales))} | Credit ${money(sum(daySales, (sale) => sale.creditSales))}`,
    },
    {
      label: "Cash expenses",
      value: money(sum(cashExpenses, (expense) => expense.amount)),
      detail: "Cash expenses reduce expected cash",
    },
    {
      label: "Cash variance",
      value: money(sum(dayClosings, (closing) => closing.varianceAmount)),
      detail: "Actual cash counted minus expected cash",
    },
    {
      label: "Missing cash closing",
      value: String(missingClosings.length),
      detail: missingClosings.map((outlet) => outlet.name).join(", ") || "No missing closing",
    },
    {
      label: "Missing AutoCount attachment",
      value: String(attachmentWarnings.length),
      detail: "Warning only, submission stays allowed",
    },
    {
      label: "Cleaning completion",
      value:
        requiredCleaning.length === 0
          ? "100%"
          : percent((completedCleaning.length / requiredCleaning.length) * 100),
      detail: `${completedCleaning.length}/${requiredCleaning.length} required tasks done`,
    },
    {
      label: "Missing cleaning tasks",
      value: String(missingCleaningTasks.length),
      detail: "Required tasks not completed for the selected day",
    },
    {
      label: "Today raw material used",
      value: weight(sum(dayProcessing, (batch) => batch.rawWeightKg)),
      detail: "Retail processing raw weight",
    },
    {
      label: "Today finished product weight",
      value: weight(sum(dayProcessing, (batch) => batch.finishedWeightKg)),
      detail: "Finished product output weight",
    },
    {
      label: "Today wastage weight",
      value: weight(sum(dayProcessing, (batch) => batch.wastageWeightKg)),
      detail: "Recorded wastage weight",
    },
    {
      label: "Today processing yield %",
      value: percent(averageYield(dayProcessing)),
      detail: "Average actual yield, warning only",
    },
  ]
}

function globalKpis({
  dailySales,
  dailyClosings,
  expenses,
  missingCleaningTasks,
  processingBatches,
  scopedOutlets,
}: {
  dailySales: RetailDailySale[]
  dailyClosings: RetailDailyClosing[]
  expenses: RetailExpense[]
  missingCleaningTasks: RetailCleaningTask[]
  processingBatches: RetailProcessingBatch[]
  scopedOutlets: RetailOutlet[]
}): RetailKpi[] {
  const today = todayKey()
  const month = today.slice(0, 7)
  const comparison = outletComparison(dailySales, scopedOutlets)
  const missingClosings = scopedOutlets.filter(
    (outlet) =>
      !dailyClosings.some(
        (closing) =>
          closing.outletId === outlet.id &&
          sameDate(closing.closingDate, today) &&
          closing.status !== "DRAFT" &&
          closing.status !== "REJECTED"
      )
  )
  const dailyTrendTotal = sum(
    dailySales.filter((sale) => sale.salesDate >= today.slice(0, 8) + "01"),
    (sale) => sale.totalSales
  )
  const monthlyTrendTotal = sum(
    dailySales.filter((sale) => sale.salesDate.slice(0, 7) === month),
    (sale) => sale.totalSales
  )
  const cashVarianceDetail =
    outletMetricDetail(
      dailyClosings.map((closing) => ({
        outletId: closing.outletId,
        value: closing.varianceAmount,
      })),
      scopedOutlets
    ) || "No variance records"
  const yieldDetail =
    outletMetricDetail(
      processingBatches.map((batch) => ({
        outletId: batch.outletId,
        value: batch.yieldPercent,
      })),
      scopedOutlets
    ) || "No processing records"
  const wastageDetail =
    outletMetricDetail(
      processingBatches.map((batch) => ({
        outletId: batch.outletId,
        value: batch.wastageWeightKg,
      })),
      scopedOutlets
    ) || "No wastage records"

  return [
    {
      label: "All outlet total sales",
      value: money(sum(dailySales, (sale) => sale.totalSales)),
      detail: "Filtered Daily Sales Summary total",
    },
    {
      label: "Outlet comparison",
      value: comparison.label,
      detail: `${money(comparison.total)} top outlet, ${comparison.count} outlet(s) with sales`,
    },
    {
      label: "Cash variance by outlet",
      value: money(sum(dailyClosings, (closing) => closing.varianceAmount)),
      detail: cashVarianceDetail,
    },
    {
      label: "Payment method breakdown",
      value: money(sum(dailySales, (sale) => sale.totalSales)),
      detail: `Cash ${money(sum(dailySales, (sale) => sale.cashSales))} | Bank ${money(sum(dailySales, (sale) => sale.bankTransferSales))} | E-wallet ${money(sum(dailySales, (sale) => sale.ewalletSales))} | Credit ${money(sum(dailySales, (sale) => sale.creditSales))}`,
    },
    {
      label: "Daily sales trend",
      value: money(dailyTrendTotal),
      detail: "Sales total from the current month in this filter",
    },
    {
      label: "Monthly sales trend",
      value: money(monthlyTrendTotal),
      detail: `Current month ${month}`,
    },
    {
      label: "Missing closing records",
      value: String(missingClosings.length),
      detail: missingClosings.map((outlet) => outlet.name).join(", ") || "No missing closing today",
    },
    {
      label: "Expenses summary",
      value: money(sum(expenses, (expense) => expense.amount)),
      detail: `${expenses.length} filtered expense record(s)`,
    },
    {
      label: "Cleaning missing tasks",
      value: String(missingCleaningTasks.length),
      detail: "Required cleaning not completed",
    },
    {
      label: "Processing yield by outlet",
      value: percent(averageYield(processingBatches)),
      detail: yieldDetail,
    },
    {
      label: "Wastage by outlet",
      value: weight(sum(processingBatches, (batch) => batch.wastageWeightKg)),
      detail: wastageDetail,
    },
  ]
}

export function buildRetailReportData({
  data,
  profile,
  filters = {},
  canViewAllOutlets,
}: {
  data: RetailPageData
  profile: CurrentProfile
  filters?: RetailReportFilters
  canViewAllOutlets: boolean
}): RetailReportData {
  const focusDate = clean(filters.date) ?? todayKey()
  const selectedPaymentMethod = clean(filters.paymentMethod)?.toUpperCase()
  const scopedOutlets = scopeOutlets({
    outlets: data.outlets,
    profile,
    filters,
    canViewAllOutlets,
  })
  const filteredDailySales = data.dailySales.filter(
    (sale) =>
      dateInRange(sale.salesDate, filters) &&
      matchesOutlet(sale.outletId, filters, canViewAllOutlets) &&
      matchesPaymentBreakdown(sale, filters)
  )
  const filteredExpenses = data.expenses.filter(
    (expense) =>
      dateInRange(expense.expenseDate, filters) &&
      matchesOutlet(expense.outletId, filters, canViewAllOutlets) &&
      matchesStatus(expense.status, filters) &&
      (!selectedPaymentMethod || expense.paymentMethod === selectedPaymentMethod)
  )
  const filteredDailyClosings = data.dailyClosings.filter(
    (closing) =>
      dateInRange(closing.closingDate, filters) &&
      matchesOutlet(closing.outletId, filters, canViewAllOutlets) &&
      matchesStatus(closing.status, filters)
  )
  const filteredProcessingBatches = data.processingBatches.filter(
    (batch) =>
      dateInRange(batch.processingDate, filters) &&
      matchesOutlet(batch.outletId, filters, canViewAllOutlets) &&
      matchesStatus(batch.status, filters) &&
      matchesProcessingFilters(batch, filters)
  )
  const filteredCleaningTasks = data.cleaningTasks.filter(
    (task) =>
      matchesOutlet(task.outletId, filters, canViewAllOutlets) &&
      (!clean(filters.status) ||
        cleaningDisplayStatus(task, focusDate) === clean(filters.status)?.toUpperCase())
  )
  const missingCleaningTasks = filteredCleaningTasks.filter(
    (task) =>
      isCleaningDueOn(task, focusDate) &&
      cleaningDisplayStatus(task, focusDate) !== "DONE"
  )
  const scope = canViewAllOutlets ? "global" : "manager"

  return {
    scope,
    focusDate,
    filteredDailySales,
    filteredExpenses,
    filteredCleaningTasks,
    missingCleaningTasks,
    filteredDailyClosings,
    filteredProcessingBatches,
    kpis:
      scope === "global"
        ? globalKpis({
            dailySales: filteredDailySales,
            dailyClosings: filteredDailyClosings,
            expenses: filteredExpenses,
            missingCleaningTasks,
            processingBatches: filteredProcessingBatches,
            scopedOutlets,
          })
        : managerKpis({
            dailySales: data.dailySales,
            dailyClosings: data.dailyClosings,
            expenses: data.expenses,
            cleaningTasks: data.cleaningTasks,
            missingCleaningTasks,
            processingBatches: data.processingBatches,
            focusDate,
            scopedOutlets,
          }),
  }
}
