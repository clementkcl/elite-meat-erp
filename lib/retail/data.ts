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
  demoRetailDailyClosings,
  demoRetailDailySales,
  demoRetailDepartments,
  demoRetailAuditLogs,
  demoRetailExpenseCategories,
  demoRetailExpenses,
  demoRetailItems,
  demoRetailLocations,
  demoRetailNoBarcodeStock,
  demoRetailOrigins,
  demoRetailOutlets,
  demoRetailPayments,
  demoRetailPeople,
  demoRetailPriceRules,
  demoRetailProcessingBoms,
  demoRetailProcessingBatches,
  demoRetailRegisters,
  demoRetailSaleLines,
  demoRetailSales,
  demoRetailStockUnits,
} from "@/lib/retail/demo-data"
import {
  type CurrentProfile,
} from "@/lib/auth/types"
import {
  retailCashSessionStatuses,
  retailClosingStatuses,
  retailCleaningFrequencies,
  retailCleaningStatuses,
  retailExpensePaymentMethods,
  retailExpenseStatuses,
  retailPaymentMethods,
  retailPaymentStatuses,
  retailProcessingStatuses,
  retailSaleStatuses,
  type RetailAuditLog,
  type RetailBrand,
  type RetailCashSession,
  type RetailCashSessionStatus,
  type RetailCleaningFrequency,
  type RetailCleaningStatus,
  type RetailCleaningTask,
  type RetailClosingStatus,
  type RetailDailyClosing,
  type RetailDailySale,
  type RetailDepartment,
  type RetailExpense,
  type RetailExpenseCategory,
  type RetailExpensePaymentMethod,
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
  type RetailProcessingBom,
  type RetailProcessingBatch,
  type RetailProcessingLine,
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

function isExpensePaymentMethod(
  value: string
): value is RetailExpensePaymentMethod {
  return retailExpensePaymentMethods.includes(value as RetailExpensePaymentMethod)
}

function isPaymentStatus(value: string): value is RetailPaymentStatus {
  return retailPaymentStatuses.includes(value as RetailPaymentStatus)
}

function isCashSessionStatus(value: string): value is RetailCashSessionStatus {
  return retailCashSessionStatuses.includes(value as RetailCashSessionStatus)
}

function isClosingStatus(value: string): value is RetailClosingStatus {
  return retailClosingStatuses.includes(value as RetailClosingStatus)
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

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => readString(item))
        .filter((item) => item.length > 0)
    : []
}

function readNullableNumber(value: unknown) {
  return value === null || value === undefined ? null : readNumber(value)
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

function mapDailySale(
  row: Record<string, unknown>,
  outlets: RetailOutlet[],
  people: RetailPerson[]
): RetailDailySale {
  const outletId = readNullableString(row.outlet_id)
  const createdBy =
    readNullableString(row.created_by) ?? readNullableString(row.recorded_by)
  const updatedBy = readNullableString(row.updated_by)
  const attachmentUrl =
    readNullableString(row.autocount_attachment_url) ??
    readNullableString(row.attachment_url)
  const cashSales =
    row.cash_sales === undefined ? readNumber(row.cash_received) : readNumber(row.cash_sales)
  const bankTransferSales = readNumber(row.bank_transfer_sales)
  const ewalletSales =
    row.ewallet_sales === undefined &&
    readString(row.payment_code).toUpperCase().includes("EWALLET")
      ? readNumber(row.net_sales)
      : readNumber(row.ewallet_sales)
  const creditSales = readNumber(row.credit_sales)
  const totalSales =
    row.total_sales === undefined
      ? cashSales + bankTransferSales + ewalletSales + creditSales
      : readNumber(row.total_sales)

  return {
    id: readString(row.id),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    salesDate: readString(row.sales_date),
    status: readString(row.status, "CONFIRMED") === "DRAFT" ? "DRAFT" : "CONFIRMED",
    cashSales,
    bankTransferSales,
    ewalletSales,
    creditSales,
    totalSales,
    attachmentUrl,
    attachmentStatus: attachmentUrl ? "OK" : "MISSING",
    createdByName: findById(people, createdBy)?.fullName ?? "-",
    updatedByName: findById(people, updatedBy)?.fullName ?? "-",
    remarks: readString(row.remarks, readString(row.notes)),
    createdAt: readString(row.created_at, new Date().toISOString()),
    updatedAt: readString(row.updated_at, new Date().toISOString()),
  }
}

function mapDailyClosing(
  row: Record<string, unknown>,
  outlets: RetailOutlet[],
  people: RetailPerson[]
): RetailDailyClosing {
  const outletId = readNullableString(row.outlet_id)
  const status = readString(row.status, "DRAFT")
  const submittedBy = readNullableString(row.submitted_by)
  const reviewedBy =
    readNullableString(row.reviewed_by) ?? readNullableString(row.approved_by)
  const cashSales = readNumber(row.cash_sales, readNumber(row.cash_received))
  const cashExpenses = readNumber(
    row.cash_expenses,
    readNumber(row.expenses_amount)
  )
  const actualCashCounted = readNumber(
    row.actual_cash_counted,
    readNumber(row.closing_cash)
  )
  const expectedCash = readNumber(
    row.expected_cash,
    readNumber(row.opening_cash) + cashSales - cashExpenses
  )

  return {
    id: readString(row.id),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    closingDate: readString(row.closing_date),
    openingCash: readNumber(row.opening_cash),
    cashSales,
    bankTransferSales: readNumber(row.bank_transfer_sales),
    ewalletSales: readNumber(row.ewallet_sales),
    creditSales: readNumber(row.credit_sales),
    cashExpenses,
    expectedCash,
    actualCashCounted,
    totalSales: readNumber(row.total_sales),
    cashReceived: readNumber(row.cash_received),
    expensesAmount: readNumber(row.expenses_amount),
    closingCash: readNumber(row.closing_cash),
    varianceAmount: readNumber(row.variance_amount, actualCashCounted - expectedCash),
    status: isClosingStatus(status) ? status : "DRAFT",
    submittedByName: findById(people, submittedBy)?.fullName ?? "-",
    submittedAt: readNullableString(row.submitted_at),
    reviewedByName: findById(people, reviewedBy)?.fullName ?? "-",
    reviewedAt: readNullableString(row.reviewed_at) ?? readNullableString(row.approved_at),
    remarks: readString(row.remarks, readString(row.notes)),
    notes: readString(row.notes, readString(row.remarks)),
    createdAt: readString(row.created_at, new Date().toISOString()),
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

function mapProcessingBom(
  row: Record<string, unknown>,
  outlets: RetailOutlet[],
  people: RetailPerson[]
): RetailProcessingBom {
  const outletId = readNullableString(row.outlet_id)
  const createdBy = readNullableString(row.created_by)
  const updatedBy = readNullableString(row.updated_by)

  return {
    id: readString(row.id),
    outletId,
    outletName: outletId ? findById(outlets, outletId)?.name ?? "-" : "All outlets",
    name: readString(row.name),
    rawMaterialItemNames: readStringArray(row.raw_material_item_names),
    finishedProductItemNames: readStringArray(row.finished_product_item_names),
    active: readBoolean(row.is_active, true),
    remarks: readString(row.remarks),
    expectedYieldMinPercent: readNullableNumber(row.expected_yield_min_percent),
    expectedYieldMaxPercent: readNullableNumber(row.expected_yield_max_percent),
    expectedWastagePercent: readNullableNumber(row.expected_wastage_percent),
    createdByName: findById(people, createdBy)?.fullName ?? "-",
    createdAt: readString(row.created_at, new Date().toISOString()),
    updatedByName: findById(people, updatedBy)?.fullName ?? "-",
    updatedAt: readString(row.updated_at, new Date().toISOString()),
  }
}

function mapProcessingLine(
  row: Record<string, unknown>,
  items: RetailItem[]
): RetailProcessingLine & { processingBatchId: string } {
  const itemId = readNullableString(row.item_id)

  return {
    id: readString(row.id),
    processingBatchId: readString(row.processing_batch_id),
    itemId,
    itemName: readString(row.item_name, findById(items, itemId)?.label ?? "-"),
    quantity: readNumber(row.quantity),
    weightKg: readNumber(row.weight_kg),
    remarks: readString(row.remarks),
  }
}

function summarizeProcessingLines(lines: RetailProcessingLine[]) {
  if (lines.length === 0) {
    return "-"
  }

  return lines
    .map((line) => `${line.itemName} (${line.weightKg.toFixed(3)}kg)`)
    .join(", ")
}

function mapProcessingBatch(
  row: Record<string, unknown>,
  outlets: RetailOutlet[],
  departments: RetailDepartment[],
  locations: RetailStockLocation[],
  items: RetailItem[],
  brands: RetailBrand[],
  origins: RetailOrigin[],
  people: RetailPerson[],
  rawLines: RetailProcessingLine[] = [],
  finishedLines: RetailProcessingLine[] = []
): RetailProcessingBatch {
  const status = readString(row.status, "OPEN")
  const outletId = readNullableString(row.outlet_id)
  const departmentId = readNullableString(row.department_id)
  const stockLocationId = readNullableString(row.stock_location_id)
  const rawItemId = readNullableString(row.raw_item_id)
  const rawBrandId = readNullableString(row.raw_brand_id)
  const rawOriginId = readNullableString(row.raw_origin_id)
  const finishedItemId = readNullableString(row.finished_item_id)
  const finishedBrandId = readNullableString(row.finished_brand_id)
  const finishedOriginId = readNullableString(row.finished_origin_id)
  const processedBy = readNullableString(row.processed_by)
  const createdBy = readNullableString(row.created_by)
  const submittedBy = readNullableString(row.submitted_by)
  const reviewedBy = readNullableString(row.reviewed_by)
  const finishedItem = findById(items, finishedItemId)
  const rawQuantity =
    rawLines.length > 0
      ? rawLines.reduce((sum, line) => sum + line.quantity, 0)
      : readNumber(row.raw_quantity)
  const rawWeightKg =
    rawLines.length > 0
      ? rawLines.reduce((sum, line) => sum + line.weightKg, 0)
      : readNumber(row.raw_weight_kg)
  const finishedQuantity =
    finishedLines.length > 0
      ? finishedLines.reduce((sum, line) => sum + line.quantity, 0)
      : readNumber(row.finished_quantity)
  const finishedWeightKg =
    finishedLines.length > 0
      ? finishedLines.reduce((sum, line) => sum + line.weightKg, 0)
      : readNumber(row.finished_weight_kg)
  const wastageWeightKg = readNumber(row.wastage_weight_kg)
  const accountedWeightKg =
    readNullableString(row.accounted_weight_kg) !== null
      ? readNumber(row.accounted_weight_kg)
      : finishedWeightKg + wastageWeightKg
  const unaccountedDifferenceKg =
    readNullableString(row.unaccounted_difference_kg) !== null
      ? readNumber(row.unaccounted_difference_kg)
      : rawWeightKg - accountedWeightKg
  const yieldPercent =
    readNullableString(row.yield_percent) !== null
      ? readNumber(row.yield_percent)
      : rawWeightKg > 0
        ? (finishedWeightKg / rawWeightKg) * 100
        : 0
  const wastagePercent =
    readNullableString(row.wastage_percent) !== null
      ? readNumber(row.wastage_percent)
      : rawWeightKg > 0
        ? (wastageWeightKg / rawWeightKg) * 100
        : 0
  const unaccountedDifferencePercent =
    readNullableString(row.unaccounted_difference_percent) !== null
      ? readNumber(row.unaccounted_difference_percent)
      : rawWeightKg > 0
        ? (unaccountedDifferenceKg / rawWeightKg) * 100
        : 0
  const lossWeightKg = readNumber(row.loss_weight_kg, unaccountedDifferenceKg)
  const minYield = finishedItem?.processingMinYieldPercent ?? null
  const maxLoss = finishedItem?.processingMaxLossPercent ?? null

  return {
    id: readString(row.id),
    batchNo: readString(row.batch_no),
    processingBomId: readNullableString(row.processing_bom_id),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    departmentId,
    departmentName: findById(departments, departmentId)?.name ?? "-",
    stockLocationId,
    stockLocationName: findById(locations, stockLocationId)?.name ?? "-",
    processingDate: readString(row.processing_date, readString(row.processed_at)),
    processingType: readString(row.processing_type, "Retail processing"),
    rawLines,
    rawItemLabel:
      rawLines.length > 0
        ? summarizeProcessingLines(rawLines)
        : findById(items, rawItemId)?.label ?? readString(row.raw_item_name, "-"),
    rawBrandName: findById(brands, rawBrandId)?.name ?? "-",
    rawOriginName: findById(origins, rawOriginId)?.name ?? "-",
    rawQuantity,
    rawWeightKg,
    finishedLines,
    finishedItemLabel:
      finishedLines.length > 0
        ? summarizeProcessingLines(finishedLines)
        : finishedItem?.label ?? readString(row.finished_item_name, "-"),
    finishedBrandName: findById(brands, finishedBrandId)?.name ?? "-",
    finishedOriginName: findById(origins, finishedOriginId)?.name ?? "-",
    finishedQuantity,
    finishedWeightKg,
    wastageWeightKg,
    wastagePercent,
    wastageReason: readString(row.wastage_reason),
    wastagePhotoUrl: readNullableString(row.wastage_photo_url),
    wastageRemarks: readString(row.wastage_remarks),
    accountedWeightKg,
    unaccountedDifferenceKg,
    unaccountedDifferencePercent,
    yieldPercent,
    lossWeightKg,
    processingMinYieldPercent: minYield,
    processingMaxLossPercent: maxLoss,
    yieldAlert: "OK",
    warningMessage: "OK",
    status: isProcessingStatus(status) ? status : "OPEN",
    createdByName: findById(people, createdBy)?.fullName ?? "-",
    createdAt: readString(row.created_at, new Date().toISOString()),
    submittedByName: findById(people, submittedBy)?.fullName ?? "-",
    submittedAt: readNullableString(row.submitted_at),
    reviewedByName: findById(people, reviewedBy)?.fullName ?? "-",
    reviewedAt: readNullableString(row.reviewed_at),
    rejectionReason: readString(row.rejection_reason),
    processedByName: findById(people, processedBy)?.fullName ?? "-",
    processedAt: readString(row.processed_at, new Date().toISOString()),
    remarks: readString(row.remarks, readString(row.notes)),
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
  const createdBy = readNullableString(row.created_by)
  const updatedBy = readNullableString(row.updated_by)

  return {
    id: readString(row.id),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    departmentId,
    departmentName: findById(departments, departmentId)?.name ?? "-",
    taskName: readString(row.task_name),
    frequency: isCleaningFrequency(frequency) ? frequency : "DAILY",
    dueDate: readString(row.due_date),
    active: readBoolean(row.is_active, true),
    status: isCleaningStatus(status) ? status : "PENDING",
    assignedToName: findById(people, assignedTo)?.fullName ?? "-",
    completedByName: findById(people, completedBy)?.fullName ?? "-",
    completedAt: readNullableString(row.completed_at),
    completionPhotoUrl: readNullableString(row.completion_photo_url),
    remarks: readString(row.remarks, readString(row.notes)),
    createdByName: findById(people, createdBy)?.fullName ?? "-",
    createdAt: readString(row.created_at, new Date().toISOString()),
    updatedByName: findById(people, updatedBy)?.fullName ?? "-",
    updatedAt: readString(row.updated_at, new Date().toISOString()),
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

  return {
    id: readString(row.id),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    expenseDate: readString(row.expense_date),
    category: readString(row.category),
    supplierPayee: readString(row.supplier_payee, readString(row.vendor, "-")),
    amount: readNumber(row.amount),
    paymentMethod: isExpensePaymentMethod(paymentMethod) ? paymentMethod : "CASH",
    status: isExpenseStatus(status) ? status : "SUBMITTED",
    receiptUrl: readNullableString(row.receipt_url),
    submittedById: submittedBy,
    submittedByName: findById(people, submittedBy)?.fullName ?? "-",
    submittedAt: readNullableString(row.submitted_at),
    reviewedByName: findById(people, reviewedBy)?.fullName ?? "-",
    reviewedAt: readNullableString(row.reviewed_at),
    rejectionReason: readString(row.rejection_reason),
    remarks: readString(row.remarks, readString(row.notes)),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapExpenseCategory(
  row: Record<string, unknown>,
  outlets: RetailOutlet[]
): RetailExpenseCategory {
  const outletId = readNullableString(row.outlet_id)

  return {
    id: readString(row.id),
    outletId,
    outletName: outletId ? findById(outlets, outletId)?.name ?? "-" : "All outlets",
    name: readString(row.name),
    active: readBoolean(row.is_active, true),
  }
}

function mapAuditLog(
  row: Record<string, unknown>,
  outlets: RetailOutlet[],
  people: RetailPerson[]
): RetailAuditLog {
  const outletId = readNullableString(row.outlet_id)
  const editedBy = readNullableString(row.edited_by)

  return {
    id: readString(row.id),
    tableName: readString(row.table_name),
    recordId: readString(row.record_id),
    outletId,
    outletName: findById(outlets, outletId)?.name ?? "-",
    fieldChanged: readString(row.field_name, readString(row.field_changed)),
    oldValue: readString(row.old_value, "-"),
    newValue: readString(row.new_value, "-"),
    editedByName: findById(people, editedBy)?.fullName ?? "-",
    editedAt: readString(row.edited_at, new Date().toISOString()),
    reason: readString(row.reason),
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
  dailySales: RetailDailySale[],
  dailyClosings: RetailDailyClosing[],
  cashSessions: RetailCashSession[],
  processingBatches: RetailProcessingBatch[],
  cleaningTasks: RetailCleaningTask[],
  expenses: RetailExpense[]
) {
  const today = new Date().toISOString().slice(0, 10)
  const salesToday = dailySales.filter((sale) => sale.salesDate === today)
  const revenueToday = salesToday.reduce((sum, sale) => sum + sale.totalSales, 0)
  const cashCollected = salesToday.reduce((sum, sale) => sum + sale.cashSales, 0)
  const completedBatches = processingBatches.filter(
    (batch) =>
      batch.status === "SUBMITTED" ||
      batch.status === "REVIEWED" ||
      batch.status === "COMPLETED"
  )
  const averageYield =
    completedBatches.length > 0
      ? completedBatches.reduce((sum, batch) => sum + batch.yieldPercent, 0) /
        completedBatches.length
      : 0
  const cleaningAlerts = cleaningTasks.filter(
    (task) =>
      task.status === "MISSED" ||
      (task.status === "PENDING" && task.dueDate < today)
  )
  const submittedExpenses = expenses.filter(
    (expense) => expense.status === "SUBMITTED" || expense.status === "REVIEWED"
  )
  const pendingClosings = dailyClosings.filter(
    (closing) => closing.status === "SUBMITTED"
  )
  const closingVariance = dailyClosings
    .filter((closing) => closing.closingDate === today)
    .reduce((sum, closing) => sum + closing.varianceAmount, 0)

  return {
    kpis: [
      {
        label: "AutoCount sales",
        value: `RM ${revenueToday.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`,
        detail: "Daily summaries recorded today",
      },
      {
        label: "Payment summaries",
        value: String(salesToday.length),
        detail: "Payment types recorded today",
      },
      {
        label: "Cash collected",
        value: `RM ${cashCollected.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`,
        detail: "Cash payments received today",
      },
      {
        label: "Open shop sessions",
        value: String(
          cashSessions.filter((session) => session.status === "OPEN").length
        ),
        detail: "Retail cash sessions currently open",
      },
      {
        label: "Closing review",
        value: String(pendingClosings.length),
        detail: "Submitted closings waiting for check",
      },
      {
        label: "Cash variance",
        value: `RM ${closingVariance.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`,
        detail: "Today closing variance total",
      },
      {
        label: "Avg yield",
        value: `${averageYield.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}%`,
        detail: "Completed processing batch yield",
      },
      {
        label: "Processing records",
        value: String(processingBatches.length),
        detail: "Records with calculated yield and difference",
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

function isGlobalProfile(profile?: CurrentProfile) {
  return (
    !profile ||
    profile.roles.includes("admin") ||
    profile.roles.includes("director")
  )
}

function sameOutlet<T extends { outletId: string | null }>(
  rows: T[],
  profile?: CurrentProfile
) {
  if (isGlobalProfile(profile) || !profile?.outletId) {
    return rows
  }

  return rows.filter((row) => row.outletId === profile.outletId)
}

function sameOutletOrGlobal<T extends { outletId: string | null }>(
  rows: T[],
  profile?: CurrentProfile
) {
  if (isGlobalProfile(profile) || !profile?.outletId) {
    return rows
  }

  return rows.filter(
    (row) => row.outletId === null || row.outletId === profile.outletId
  )
}

function sameDepartment<T extends { departmentId: string | null }>(
  rows: T[],
  profile?: CurrentProfile
) {
  if (isGlobalProfile(profile) || !profile?.departmentId) {
    return rows
  }

  return rows.filter((row) => row.departmentId === profile.departmentId)
}

function sameOutletOrDepartment<
  T extends { outletId: string | null; departmentId: string | null },
>(rows: T[], profile?: CurrentProfile) {
  if (isGlobalProfile(profile)) {
    return rows
  }

  return rows.filter(
    (row) =>
      (profile?.outletId && row.outletId === profile.outletId) ||
      (profile?.departmentId && row.departmentId === profile.departmentId)
  )
}

export async function getRetailPageData(
  profile?: CurrentProfile
): Promise<RetailPageData> {
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
    dailySaleRows,
    dailyClosingRows,
    saleRows,
    saleLineRows,
    paymentRows,
    priceRuleRows,
    processingBomRows,
    processingRows,
    processingRawLineRows,
    processingFinishedLineRows,
    cleaningRows,
    expenseCategoryRows,
    expenseRows,
    auditRows,
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
    loadRows("retail_daily_sales"),
    loadRows("retail_daily_closings"),
    loadRows("retail_sales"),
    loadRows("retail_sale_lines"),
    loadRows("retail_payments"),
    loadRows("retail_price_rules"),
    loadRows("retail_processing_boms"),
    loadRows("retail_processing_batches"),
    loadRows("retail_processing_raw_lines"),
    loadRows("retail_processing_finished_lines"),
    loadRows("retail_cleaning_tasks"),
    loadRows("retail_expense_categories"),
    loadRows("retail_expenses"),
    loadRows("retail_audit_logs"),
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
      dailySales: sameOutlet(demoRetailDailySales, profile),
      dailyClosings: sameOutlet(demoRetailDailyClosings, profile),
      sales: demoRetailSales,
      saleLines: demoRetailSaleLines,
      payments: demoRetailPayments,
      priceRules: demoRetailPriceRules,
      processingBoms: sameOutletOrGlobal(demoRetailProcessingBoms, profile),
      processingBatches: demoRetailProcessingBatches,
      cleaningTasks: demoRetailCleaningTasks,
      expenseCategories: sameOutletOrGlobal(demoRetailExpenseCategories, profile),
      expenses: demoRetailExpenses,
      auditLogs: sameOutlet(demoRetailAuditLogs, profile),
      stockUnits: demoRetailStockUnits,
      noBarcodeStock: demoRetailNoBarcodeStock,
      dashboard: buildDashboard(
        sameOutlet(demoRetailDailySales, profile),
        sameOutlet(demoRetailDailyClosings, profile),
        demoRetailCashSessions,
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
  const dailySales = sameOutlet(
    (dailySaleRows ?? [])
      .map((row) => mapDailySale(row, outlets, people))
      .sort((a, b) => b.salesDate.localeCompare(a.salesDate)),
    profile
  )
  const dailyClosings = sameOutlet(
    (dailyClosingRows ?? [])
      .map((row) => mapDailyClosing(row, outlets, people))
      .sort((a, b) => b.closingDate.localeCompare(a.closingDate)),
    profile
  )
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
  const processingBoms = sameOutletOrGlobal(
    (processingBomRows ?? [])
      .map((row) => mapProcessingBom(row, outlets, people))
      .sort((a, b) => a.name.localeCompare(b.name)),
    profile
  )
  const processingRawLines = (processingRawLineRows ?? []).map((row) =>
    mapProcessingLine(row, items)
  )
  const processingFinishedLines = (processingFinishedLineRows ?? []).map((row) =>
    mapProcessingLine(row, items)
  )
  const processingBatches = sameOutlet(
    sameDepartment(
      (processingRows ?? []).map((row) =>
      mapProcessingBatch(
        row,
        outlets,
        departments,
        stockLocations,
        items,
        brands,
        origins,
        people,
        processingRawLines.filter(
          (line) => line.processingBatchId === readString(row.id)
        ),
        processingFinishedLines.filter(
          (line) => line.processingBatchId === readString(row.id)
        )
      )
      ),
      profile
    ).sort((a, b) => b.processedAt.localeCompare(a.processedAt)),
    profile
  )
  const cleaningTasks = sameOutletOrDepartment(
    (cleaningRows ?? [])
      .map((row) => mapCleaningTask(row, outlets, departments, people))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    profile
  )
  const expenseCategories = sameOutletOrGlobal(
    (expenseCategoryRows ?? [])
      .map((row) => mapExpenseCategory(row, outlets))
      .sort((a, b) => a.name.localeCompare(b.name)),
    profile
  )
  const expenses = sameOutlet(
    (expenseRows ?? [])
      .map((row) => mapExpense(row, outlets, people))
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)),
    profile
  )
  const auditLogs = sameOutlet(
    (auditRows ?? [])
      .map((row) => mapAuditLog(row, outlets, people))
      .sort((a, b) => b.editedAt.localeCompare(a.editedAt)),
    profile
  )
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
    dailySales,
    dailyClosings,
    sales,
    saleLines,
    payments,
    priceRules,
    processingBoms,
    processingBatches,
    cleaningTasks,
    expenseCategories,
    expenses,
    auditLogs,
    stockUnits,
    noBarcodeStock,
    dashboard: buildDashboard(
      dailySales,
      dailyClosings,
      cashSessions,
      processingBatches,
      cleaningTasks,
      expenses
    ),
  }
}
