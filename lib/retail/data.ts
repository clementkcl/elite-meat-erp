import {
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  demoRetailBrands,
  demoRetailCashSessions,
  demoRetailCleaningTasks,
  demoRetailDepartments,
  demoRetailExpenses,
  demoRetailItems,
  demoRetailLocations,
  demoRetailNoBarcodeStock,
  demoRetailOrigins,
  demoRetailOutlets,
  demoRetailPayments,
  demoRetailPeople,
  demoRetailPriceRules,
  demoRetailProcessingBatches,
  demoRetailRegisters,
  demoRetailSaleLines,
  demoRetailSales,
  demoRetailStockUnits,
} from "@/lib/retail/demo-data"
import {
  retailCashSessionStatuses,
  retailCleaningFrequencies,
  retailCleaningStatuses,
  retailExpenseStatuses,
  retailPaymentMethods,
  retailPaymentStatuses,
  retailProcessingStatuses,
  retailSaleStatuses,
  type RetailBrand,
  type RetailCashSession,
  type RetailCashSessionStatus,
  type RetailCleaningFrequency,
  type RetailCleaningStatus,
  type RetailCleaningTask,
  type RetailDepartment,
  type RetailExpense,
  type RetailExpenseStatus,
  type RetailItem,
  type RetailNoBarcodeStock,
  type RetailOrigin,
  type RetailOutlet,
  type RetailPageData,
  type RetailPayment,
  type RetailPaymentMethod,
  type RetailPaymentStatus,
  type RetailPerson,
  type RetailPriceRule,
  type RetailProcessingBatch,
  type RetailProcessingStatus,
  type RetailRegister,
  type RetailSale,
  type RetailSaleLine,
  type RetailSaleStatus,
  type RetailStockLocation,
  type RetailStockUnit,
} from "@/lib/retail/types"

function isSaleStatus(value: string): value is RetailSaleStatus {
  return retailSaleStatuses.includes(value as RetailSaleStatus)
}

function isPaymentMethod(value: string): value is RetailPaymentMethod {
  return retailPaymentMethods.includes(value as RetailPaymentMethod)
}

function isPaymentStatus(value: string): value is RetailPaymentStatus {
  return retailPaymentStatuses.includes(value as RetailPaymentStatus)
}

function isCashSessionStatus(value: string): value is RetailCashSessionStatus {
  return retailCashSessionStatuses.includes(value as RetailCashSessionStatus)
}

function isProcessingStatus(value: string): value is RetailProcessingStatus {
  return retailProcessingStatuses.includes(value as RetailProcessingStatus)
}

function isCleaningFrequency(value: string): value is RetailCleaningFrequency {
  return retailCleaningFrequencies.includes(value as RetailCleaningFrequency)
}

function isCleaningStatus(value: string): value is RetailCleaningStatus {
  return retailCleaningStatuses.includes(value as RetailCleaningStatus)
}

function isExpenseStatus(value: string): value is RetailExpenseStatus {
  return retailExpenseStatuses.includes(value as RetailExpenseStatus)
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

function itemLabel(row: Record<string, unknown>) {
  return [
    readString(row.category),
    readString(row.section),
    readString(row.name),
  ]
    .filter(Boolean)
    .join(" / ")
}

function findById<T extends { id: string }>(
  rows: T[],
  id: string | null | undefined
) {
  return rows.find((row) => row.id === id)
}

function mapPerson(row: Record<string, unknown>): RetailPerson {
  return {
    id: readString(row.id),
    fullName: readString(row.full_name, readString(row.email, "ERP User")),
    email: readString(row.email),
  }
}

function mapOutlet(row: Record<string, unknown>): RetailOutlet {
  return {
    id: readString(row.id),
    name: readString(row.name),
  }
}

function mapDepartment(row: Record<string, unknown>): RetailDepartment {
  return {
    id: readString(row.id),
    name: readString(row.name),
  }
}

function mapStockLocation(row: Record<string, unknown>): RetailStockLocation {
  return {
    id: readString(row.id),
    name: readString(row.name),
  }
}

function mapItem(row: Record<string, unknown>): RetailItem {
  const label = itemLabel(row)

  return {
    id: readString(row.id),
    itemCode: readString(row.item_code),
    category: readString(row.category),
    section: readString(row.section),
    name: readString(row.name),
    label,
    barcodeRequired: readBoolean(row.barcode_required, true),
    processingMinYieldPercent: readNullableString(row.processing_min_yield_percent)
      ? readNumber(row.processing_min_yield_percent)
      : null,
    processingMaxLossPercent: readNullableString(row.processing_max_loss_percent)
      ? readNumber(row.processing_max_loss_percent)
      : null,
  }
}

function mapBrand(row: Record<string, unknown>): RetailBrand {
  return {
    id: readString(row.id),
    name: readString(row.name),
  }
}

function mapOrigin(row: Record<string, unknown>): RetailOrigin {
  return {
    id: readString(row.id),
    name: readString(row.name),
  }
}

function mapRegister(
  row: Record<string, unknown>,
  outlets: RetailOutlet[],
  locations: RetailStockLocation[]
): RetailRegister {
  const outletId = readNullableString(row.outlet_id)
  const stockLocationId = readNullableString(row.stock_location_id)

  return {
    id: readString(row.id),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    stockLocationId,
    stockLocationName: findById(locations, stockLocationId)?.name ?? "-",
    registerName: readString(row.register_name),
    active: readBoolean(row.is_active, true),
  }
}

function mapCashSession(
  row: Record<string, unknown>,
  registers: RetailRegister[],
  people: RetailPerson[]
): RetailCashSession {
  const status = readString(row.status, "OPEN")
  const registerId = readString(row.register_id)
  const openedBy = readNullableString(row.opened_by)
  const closedBy = readNullableString(row.closed_by)

  return {
    id: readString(row.id),
    registerId,
    registerName: findById(registers, registerId)?.registerName ?? "-",
    status: isCashSessionStatus(status) ? status : "OPEN",
    openingFloat: readNumber(row.opening_float),
    expectedCash: readNumber(row.expected_cash),
    closingCash: readNumber(row.closing_cash),
    varianceAmount: readNumber(row.variance_amount),
    openedByName: findById(people, openedBy)?.fullName ?? "-",
    closedByName: findById(people, closedBy)?.fullName ?? "-",
    openedAt: readString(row.opened_at, new Date().toISOString()),
    closedAt: readNullableString(row.closed_at),
    notes: readString(row.notes),
  }
}

function mapSale(
  row: Record<string, unknown>,
  registers: RetailRegister[],
  people: RetailPerson[]
): RetailSale {
  const status = readString(row.status, "COMPLETED")
  const paymentStatus = readString(row.payment_status, "UNPAID")
  const registerId = readNullableString(row.register_id)
  const soldBy = readNullableString(row.sold_by)

  return {
    id: readString(row.id),
    saleNo: readString(row.sale_no),
    registerId,
    registerName: findById(registers, registerId)?.registerName ?? "-",
    cashSessionId: readNullableString(row.cash_session_id),
    customerName: readString(row.customer_name, "Walk-in Customer"),
    customerPhone: readString(row.customer_phone, "-"),
    status: isSaleStatus(status) ? status : "COMPLETED",
    paymentStatus: isPaymentStatus(paymentStatus) ? paymentStatus : "UNPAID",
    subtotalAmount: readNumber(row.subtotal_amount),
    discountAmount: readNumber(row.discount_amount),
    taxAmount: readNumber(row.tax_amount),
    totalAmount: readNumber(row.total_amount),
    paidAmount: readNumber(row.paid_amount),
    changeAmount: readNumber(row.change_amount),
    soldBy,
    soldByName: findById(people, soldBy)?.fullName ?? "-",
    completedAt: readNullableString(row.completed_at),
    cancelledAt: readNullableString(row.cancelled_at),
    notes: readString(row.notes),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapSaleLine(
  row: Record<string, unknown>,
  sales: RetailSale[],
  items: RetailItem[],
  brands: RetailBrand[],
  origins: RetailOrigin[],
  locations: RetailStockLocation[]
): RetailSaleLine {
  const saleId = readString(row.sale_id)
  const itemId = readString(row.item_id)
  const brandId = readNullableString(row.brand_id)
  const originId = readNullableString(row.origin_id)
  const stockLocationId = readNullableString(row.stock_location_id)

  return {
    id: readString(row.id),
    saleId,
    saleNo: findById(sales, saleId)?.saleNo ?? "-",
    itemId,
    itemLabel: findById(items, itemId)?.label ?? "-",
    brandName: findById(brands, brandId)?.name ?? "-",
    originName: findById(origins, originId)?.name ?? "-",
    stockLocationName: findById(locations, stockLocationId)?.name ?? "-",
    barcode: readString(row.barcode, "-"),
    quantity: readNumber(row.quantity),
    weightKg: readNumber(row.weight_kg),
    unitPrice: readNumber(row.unit_price),
    lineDiscount: readNumber(row.line_discount),
    lineTotal: readNumber(row.line_total),
    notes: readString(row.notes),
  }
}

function mapPayment(
  row: Record<string, unknown>,
  sales: RetailSale[],
  people: RetailPerson[]
): RetailPayment {
  const saleId = readString(row.sale_id)
  const paymentMethod = readString(row.payment_method, "CASH")
  const paymentStatus = readString(row.payment_status, "PAID")
  const receivedBy = readNullableString(row.received_by)

  return {
    id: readString(row.id),
    saleId,
    saleNo: findById(sales, saleId)?.saleNo ?? "-",
    paymentMethod: isPaymentMethod(paymentMethod) ? paymentMethod : "CASH",
    paymentStatus: isPaymentStatus(paymentStatus) ? paymentStatus : "PAID",
    amount: readNumber(row.amount),
    referenceNo: readString(row.reference_no, "-"),
    receivedByName: findById(people, receivedBy)?.fullName ?? "-",
    notes: readString(row.notes),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapPriceRule(
  row: Record<string, unknown>,
  items: RetailItem[],
  brands: RetailBrand[],
  origins: RetailOrigin[],
  outlets: RetailOutlet[]
): RetailPriceRule {
  const itemId = readString(row.item_id)
  const brandId = readNullableString(row.brand_id)
  const originId = readNullableString(row.origin_id)
  const outletId = readNullableString(row.outlet_id)

  return {
    id: readString(row.id),
    itemId,
    itemLabel: findById(items, itemId)?.label ?? "-",
    brandId,
    brandName: findById(brands, brandId)?.name ?? "-",
    originId,
    originName: findById(origins, originId)?.name ?? "-",
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    unitPrice: readNumber(row.unit_price),
    effectiveFrom: readString(row.effective_from),
    effectiveTo: readNullableString(row.effective_to),
    active: readBoolean(row.is_active, true),
  }
}

function mapProcessingBatch(
  row: Record<string, unknown>,
  outlets: RetailOutlet[],
  locations: RetailStockLocation[],
  items: RetailItem[],
  brands: RetailBrand[],
  origins: RetailOrigin[],
  people: RetailPerson[]
): RetailProcessingBatch {
  const status = readString(row.status, "OPEN")
  const outletId = readNullableString(row.outlet_id)
  const stockLocationId = readNullableString(row.stock_location_id)
  const rawItemId = readString(row.raw_item_id)
  const rawBrandId = readNullableString(row.raw_brand_id)
  const rawOriginId = readNullableString(row.raw_origin_id)
  const finishedItemId = readString(row.finished_item_id)
  const finishedBrandId = readNullableString(row.finished_brand_id)
  const finishedOriginId = readNullableString(row.finished_origin_id)
  const processedBy = readNullableString(row.processed_by)
  const finishedItem = findById(items, finishedItemId)
  const yieldPercent = readNumber(row.yield_percent)
  const lossWeightKg = readNumber(row.loss_weight_kg)
  const rawWeightKg = readNumber(row.raw_weight_kg)
  const lossPercent = rawWeightKg > 0 ? (lossWeightKg / rawWeightKg) * 100 : 0
  const minYield = finishedItem?.processingMinYieldPercent ?? null
  const maxLoss = finishedItem?.processingMaxLossPercent ?? null
  const yieldAlerts = [
    minYield !== null && yieldPercent < minYield
      ? `Yield below ${minYield}%`
      : "",
    maxLoss !== null && lossPercent > maxLoss ? `Loss above ${maxLoss}%` : "",
  ].filter(Boolean)

  return {
    id: readString(row.id),
    batchNo: readString(row.batch_no),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    stockLocationId,
    stockLocationName: findById(locations, stockLocationId)?.name ?? "-",
    rawItemLabel: findById(items, rawItemId)?.label ?? "-",
    rawBrandName: findById(brands, rawBrandId)?.name ?? "-",
    rawOriginName: findById(origins, rawOriginId)?.name ?? "-",
    rawQuantity: readNumber(row.raw_quantity),
    rawWeightKg,
    finishedItemLabel: finishedItem?.label ?? "-",
    finishedBrandName: findById(brands, finishedBrandId)?.name ?? "-",
    finishedOriginName: findById(origins, finishedOriginId)?.name ?? "-",
    finishedQuantity: readNumber(row.finished_quantity),
    finishedWeightKg: readNumber(row.finished_weight_kg),
    yieldPercent,
    lossWeightKg,
    processingMinYieldPercent: minYield,
    processingMaxLossPercent: maxLoss,
    yieldAlert: yieldAlerts.length > 0 ? yieldAlerts.join(", ") : "OK",
    status: isProcessingStatus(status) ? status : "OPEN",
    processedByName: findById(people, processedBy)?.fullName ?? "-",
    processedAt: readString(row.processed_at, new Date().toISOString()),
    notes: readString(row.notes),
  }
}

function mapCleaningTask(
  row: Record<string, unknown>,
  outlets: RetailOutlet[],
  departments: RetailDepartment[],
  people: RetailPerson[]
): RetailCleaningTask {
  const frequency = readString(row.frequency, "DAILY")
  const status = readString(row.status, "PENDING")
  const outletId = readNullableString(row.outlet_id)
  const departmentId = readNullableString(row.department_id)
  const assignedTo = readNullableString(row.assigned_to)
  const completedBy = readNullableString(row.completed_by)

  return {
    id: readString(row.id),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    departmentId,
    departmentName: findById(departments, departmentId)?.name ?? "-",
    taskName: readString(row.task_name),
    frequency: isCleaningFrequency(frequency) ? frequency : "DAILY",
    dueDate: readString(row.due_date),
    status: isCleaningStatus(status) ? status : "PENDING",
    assignedToName: findById(people, assignedTo)?.fullName ?? "-",
    completedByName: findById(people, completedBy)?.fullName ?? "-",
    completedAt: readNullableString(row.completed_at),
    notes: readString(row.notes),
  }
}

function mapExpense(
  row: Record<string, unknown>,
  outlets: RetailOutlet[],
  people: RetailPerson[]
): RetailExpense {
  const paymentMethod = readString(row.payment_method, "CASH")
  const status = readString(row.status, "SUBMITTED")
  const outletId = readNullableString(row.outlet_id)
  const submittedBy = readNullableString(row.submitted_by)
  const reviewedBy = readNullableString(row.reviewed_by)
  const approvedBy = readNullableString(row.approved_by)
  const paidBy = readNullableString(row.paid_by)

  return {
    id: readString(row.id),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    expenseDate: readString(row.expense_date),
    category: readString(row.category),
    vendor: readString(row.vendor, "-"),
    amount: readNumber(row.amount),
    paymentMethod: isPaymentMethod(paymentMethod) ? paymentMethod : "CASH",
    status: isExpenseStatus(status) ? status : "SUBMITTED",
    receiptUrl: readString(row.receipt_url, "-"),
    submittedByName: findById(people, submittedBy)?.fullName ?? "-",
    reviewedByName: findById(people, reviewedBy)?.fullName ?? "-",
    approvedByName: findById(people, approvedBy)?.fullName ?? "-",
    paidByName: findById(people, paidBy)?.fullName ?? "-",
    paidAt: readNullableString(row.paid_at),
    notes: readString(row.notes),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapStockUnit(
  row: Record<string, unknown>,
  items: RetailItem[],
  brands: RetailBrand[],
  origins: RetailOrigin[],
  locations: RetailStockLocation[]
): RetailStockUnit {
  const itemId = readString(row.item_id)
  const brandId = readNullableString(row.brand_id)
  const originId = readNullableString(row.origin_id)
  const locationId = readString(row.location_id)

  return {
    id: readString(row.id),
    barcode: readString(row.barcode),
    itemId,
    itemLabel: findById(items, itemId)?.label ?? "-",
    brandId,
    brandName: findById(brands, brandId)?.name ?? "-",
    originId,
    originName: findById(origins, originId)?.name ?? "-",
    locationId,
    locationName: findById(locations, locationId)?.name ?? "-",
    netWeightKg: readNumber(row.net_weight_kg),
    status: readString(row.status, "IN_STOCK"),
  }
}

function mapNoBarcodeStock(
  row: Record<string, unknown>,
  items: RetailItem[],
  brands: RetailBrand[],
  origins: RetailOrigin[],
  locations: RetailStockLocation[]
): RetailNoBarcodeStock {
  const itemId = readString(row.item_id)
  const brandId = readNullableString(row.brand_id)
  const originId = readNullableString(row.origin_id)
  const locationId = readString(row.location_id)

  return {
    id: readString(row.id),
    itemId,
    itemLabel: findById(items, itemId)?.label ?? "-",
    brandId,
    brandName: findById(brands, brandId)?.name ?? "-",
    originId,
    originName: findById(origins, originId)?.name ?? "-",
    locationId,
    locationName: findById(locations, locationId)?.name ?? "-",
    quantity: readNumber(row.quantity),
    weightKg: readNumber(row.weight_kg),
  }
}

function buildDashboard(
  sales: RetailSale[],
  payments: RetailPayment[],
  cashSessions: RetailCashSession[],
  stockUnits: RetailStockUnit[],
  noBarcodeStock: RetailNoBarcodeStock[],
  processingBatches: RetailProcessingBatch[],
  cleaningTasks: RetailCleaningTask[],
  expenses: RetailExpense[]
) {
  const today = new Date().toISOString().slice(0, 10)
  const salesToday = sales.filter((sale) => sale.createdAt.slice(0, 10) === today)
  const revenueToday = salesToday
    .filter((sale) => sale.status === "COMPLETED")
    .reduce((sum, sale) => sum + sale.totalAmount, 0)
  const cashCollected = payments
    .filter(
      (payment) =>
        payment.paymentMethod === "CASH" &&
        payment.paymentStatus === "PAID" &&
        payment.createdAt.slice(0, 10) === today
    )
    .reduce((sum, payment) => sum + payment.amount, 0)
  const pendingPayment = sales.filter(
    (sale) =>
      sale.paymentStatus === "UNPAID" || sale.paymentStatus === "PARTIAL"
  )
  const availableStock =
    stockUnits.filter((unit) => unit.status === "IN_STOCK").length +
    noBarcodeStock.reduce((sum, row) => sum + row.quantity, 0)
  const completedBatches = processingBatches.filter(
    (batch) => batch.status === "COMPLETED"
  )
  const averageYield =
    completedBatches.length > 0
      ? completedBatches.reduce((sum, batch) => sum + batch.yieldPercent, 0) /
        completedBatches.length
      : 0
  const processingAlerts = processingBatches.filter(
    (batch) => batch.yieldAlert !== "OK"
  )
  const cleaningAlerts = cleaningTasks.filter(
    (task) =>
      task.status === "MISSED" ||
      (task.status === "PENDING" && task.dueDate < today)
  )
  const submittedExpenses = expenses.filter(
    (expense) => expense.status === "SUBMITTED" || expense.status === "REVIEWED"
  )

  return {
    kpis: [
      {
        label: "Sales today",
        value: `RM ${revenueToday.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`,
        detail: "Completed retail sales created today",
      },
      {
        label: "Transactions",
        value: String(salesToday.length),
        detail: "Retail sales recorded today",
      },
      {
        label: "Cash collected",
        value: `RM ${cashCollected.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`,
        detail: "Cash payments received today",
      },
      {
        label: "Open sessions",
        value: String(
          cashSessions.filter((session) => session.status === "OPEN").length
        ),
        detail: "Registers currently open",
      },
      {
        label: "Available stock",
        value: availableStock.toLocaleString(undefined, {
          maximumFractionDigits: 3,
        }),
        detail: "Barcode units plus no-barcode quantity",
      },
      {
        label: "Payment follow-up",
        value: String(pendingPayment.length),
        detail: "Unpaid or partially paid sales",
      },
      {
        label: "Avg yield",
        value: `${averageYield.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}%`,
        detail: "Completed processing batch yield",
      },
      {
        label: "Yield alerts",
        value: String(processingAlerts.length),
        detail: "Batches outside item thresholds",
      },
      {
        label: "Cleaning alerts",
        value: String(cleaningAlerts.length),
        detail: "Overdue or missed cleaning tasks",
      },
      {
        label: "Expenses review",
        value: String(submittedExpenses.length),
        detail: "Submitted or reviewed outlet expenses",
      },
    ],
  }
}

export async function getRetailPageData(): Promise<RetailPageData> {
  const [
    profileRows,
    outletRows,
    departmentRows,
    stockLocationRows,
    itemRows,
    brandRows,
    originRows,
    stockUnitRows,
    noBarcodeRows,
    registerRows,
    cashSessionRows,
    saleRows,
    saleLineRows,
    paymentRows,
    priceRuleRows,
    processingRows,
    cleaningRows,
    expenseRows,
  ] = await Promise.all([
    loadRows("profiles"),
    loadRows("outlets"),
    loadRows("departments"),
    loadRows("stock_locations"),
    loadRows("items"),
    loadRows("brands"),
    loadRows("origins"),
    loadRows("stock_units"),
    loadRows("no_barcode_stock"),
    loadRows("retail_registers"),
    loadRows("retail_cash_sessions"),
    loadRows("retail_sales"),
    loadRows("retail_sale_lines"),
    loadRows("retail_payments"),
    loadRows("retail_price_rules"),
    loadRows("retail_processing_batches"),
    loadRows("retail_cleaning_tasks"),
    loadRows("retail_expenses"),
  ])

  if (!profileRows) {
    return {
      demoMode: true,
      people: demoRetailPeople,
      outlets: demoRetailOutlets,
      departments: demoRetailDepartments,
      stockLocations: demoRetailLocations,
      items: demoRetailItems,
      brands: demoRetailBrands,
      origins: demoRetailOrigins,
      registers: demoRetailRegisters,
      cashSessions: demoRetailCashSessions,
      sales: demoRetailSales,
      saleLines: demoRetailSaleLines,
      payments: demoRetailPayments,
      priceRules: demoRetailPriceRules,
      processingBatches: demoRetailProcessingBatches,
      cleaningTasks: demoRetailCleaningTasks,
      expenses: demoRetailExpenses,
      stockUnits: demoRetailStockUnits,
      noBarcodeStock: demoRetailNoBarcodeStock,
      dashboard: buildDashboard(
        demoRetailSales,
        demoRetailPayments,
        demoRetailCashSessions,
        demoRetailStockUnits,
        demoRetailNoBarcodeStock,
        demoRetailProcessingBatches,
        demoRetailCleaningTasks,
        demoRetailExpenses
      ),
    }
  }

  const people = profileRows.map(mapPerson)
  const outlets = (outletRows ?? []).map(mapOutlet)
  const departments = (departmentRows ?? []).map(mapDepartment)
  const stockLocations = (stockLocationRows ?? []).map(mapStockLocation)
  const items = (itemRows ?? []).map(mapItem)
  const brands = (brandRows ?? []).map(mapBrand)
  const origins = (originRows ?? []).map(mapOrigin)
  const registers = (registerRows ?? [])
    .map((row) => mapRegister(row, outlets, stockLocations))
    .sort((a, b) => a.registerName.localeCompare(b.registerName))
  const cashSessions = (cashSessionRows ?? [])
    .map((row) => mapCashSession(row, registers, people))
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
  const sales = (saleRows ?? [])
    .map((row) => mapSale(row, registers, people))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const saleLines = (saleLineRows ?? []).map((row) =>
    mapSaleLine(row, sales, items, brands, origins, stockLocations)
  )
  const payments = (paymentRows ?? [])
    .map((row) => mapPayment(row, sales, people))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const priceRules = (priceRuleRows ?? [])
    .map((row) => mapPriceRule(row, items, brands, origins, outlets))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
  const processingBatches = (processingRows ?? [])
    .map((row) =>
      mapProcessingBatch(
        row,
        outlets,
        stockLocations,
        items,
        brands,
        origins,
        people
      )
    )
    .sort((a, b) => b.processedAt.localeCompare(a.processedAt))
  const cleaningTasks = (cleaningRows ?? [])
    .map((row) => mapCleaningTask(row, outlets, departments, people))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const expenses = (expenseRows ?? [])
    .map((row) => mapExpense(row, outlets, people))
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
  const stockUnits = (stockUnitRows ?? [])
    .map((row) => mapStockUnit(row, items, brands, origins, stockLocations))
    .filter((unit) => unit.status === "IN_STOCK")
  const noBarcodeStock = (noBarcodeRows ?? [])
    .map((row) => mapNoBarcodeStock(row, items, brands, origins, stockLocations))
    .filter((row) => row.quantity > 0 || row.weightKg > 0)

  return {
    demoMode: false,
    people,
    outlets,
    departments,
    stockLocations,
    items,
    brands,
    origins,
    registers,
    cashSessions,
    sales,
    saleLines,
    payments,
    priceRules,
    processingBatches,
    cleaningTasks,
    expenses,
    stockUnits,
    noBarcodeStock,
    dashboard: buildDashboard(
      sales,
      payments,
      cashSessions,
      stockUnits,
      noBarcodeStock,
      processingBatches,
      cleaningTasks,
      expenses
    ),
  }
}
