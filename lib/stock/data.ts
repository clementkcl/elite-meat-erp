import {
  asRecord,
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { stockDisplayItemName } from "@/lib/stock/display-names"
import {
  demoBrands,
  demoBarcodeWeightRules,
  demoItems,
  demoLocations,
  demoMovements,
  demoNoBarcodeStock,
  demoOrigins,
  demoOutlets,
  demoScanLogs,
  demoDamageRequests,
  demoReturnSupplierRequests,
  demoStockTakeLines,
  demoStockTakeSessions,
  demoUnits,
} from "@/lib/stock/demo-data"
import { stockableStatuses } from "@/lib/stock/unit-status-rules"
import {
  stockCategories,
  stockInboundSources,
  stockMovementTypes,
  stockTakeStatuses,
  stockDamageReasons,
  stockDamageRequestStatuses,
  stockReturnSupplierRequestStatuses,
  stockUnitStatuses,
  type BarcodeWeightRule,
  type Brand,
  type ChartPoint,
  type Item,
  type MovementFilters,
  type MovementTrendPoint,
  type NoBarcodeStock,
  type NegativeStockAlert,
  type Origin,
  type StockAgeAlert,
  type StockBalanceRow,
  type StockCategory,
  type StockLocation,
  type StockMovement,
  type StockMovementType,
  type StockOutlet,
  type StockPageData,
  type StockReportRow,
  type StockScanAlert,
  type StockScanLog,
  type StockInboundSource,
  type StockTakeLine,
  type StockTakeSession,
  type StockTakeStatus,
  type StockUnit,
  type StockUnitStatus,
  type StockDamageReason,
  type StockDamageRequest,
  type StockDamageRequestStatus,
  type StockReturnSupplierRequest,
  type StockReturnSupplierRequestStatus,
  type TransferPendingAlert,
} from "@/lib/stock/types"

const sixMonthStockAgeDays = 183
const twelveMonthStockAgeDays = 365
const overdueTransferDays = 3

function isStockCategory(value: string): value is StockCategory {
  return stockCategories.includes(value as StockCategory)
}

function isMovementType(value: string): value is StockMovementType {
  return stockMovementTypes.includes(value as StockMovementType)
}

function isUnitStatus(value: string): value is StockUnitStatus {
  return stockUnitStatuses.includes(value as StockUnitStatus)
}

function isInboundSource(value: string): value is StockInboundSource {
  return stockInboundSources.includes(value as StockInboundSource)
}

function isTakeStatus(value: string): value is StockTakeStatus {
  return stockTakeStatuses.includes(value as StockTakeStatus)
}

function isDamageReason(value: string): value is StockDamageReason {
  return stockDamageReasons.includes(value as StockDamageReason)
}

function isDamageRequestStatus(value: string): value is StockDamageRequestStatus {
  return stockDamageRequestStatuses.includes(value as StockDamageRequestStatus)
}

function isReturnSupplierRequestStatus(
  value: string
): value is StockReturnSupplierRequestStatus {
  return stockReturnSupplierRequestStatuses.includes(
    value as StockReturnSupplierRequestStatus
  )
}

function formatDisplayItemName(item: Item | undefined, brand: Brand | undefined) {
  if (!item) {
    return "Unknown item"
  }

  return stockDisplayItemName(item, brand, "Unknown item")
}

function formatDefaultDisplayItemName(item: Item | undefined, brands: Brand[]) {
  const brand = item?.defaultBrandId
    ? brands.find((candidate) => candidate.id === item.defaultBrandId)
    : undefined

  return formatDisplayItemName(item, brand)
}

function formatScanIssueItemName(
  item: Item | undefined,
  brands: Brand[],
  relatedContext: Record<string, unknown>
) {
  const displayProductName = readString(relatedContext.displayProductName)

  if (displayProductName) {
    return displayProductName
  }

  const productName = readString(relatedContext.productName)
  const manufacturerName = readString(relatedContext.manufacturerName)

  if (productName) {
    return manufacturerName
      ? `${manufacturerName} ${productName}`
      : stockDisplayItemName(item, undefined, productName)
  }

  const brandId = readNullableString(relatedContext.brandId)
  const exactBrand = brandId
    ? brands.find((candidate) => candidate.id === brandId)
    : undefined

  return exactBrand
    ? formatDisplayItemName(item, exactBrand)
    : formatDefaultDisplayItemName(item, brands)
}

function findName<T extends { id: string; name: string }>(
  rows: T[],
  id: string | null | undefined,
  fallback = "-"
) {
  return rows.find((row) => row.id === id)?.name ?? fallback
}

function roundWeight(value: number) {
  return Math.round(value * 100) / 100
}

function tableDate(value: string) {
  return value.slice(0, 10)
}

function isDashboardInboundMovement(movementType: StockMovementType) {
  return [
    "INBOUND",
    "TRANSFER_RECEIVED",
    "RETURN",
    "NO_BARCODE_INBOUND",
  ].includes(movementType)
}

function isDashboardOutboundMovement(movementType: StockMovementType) {
  return [
    "OUTBOUND_SALES",
    "OUTBOUND_TRANSFER",
    "OUTBOUND_PROCESSING",
    "OUTBOUND_SPOILED",
    "OUTBOUND_RETURN_SUPPLIER",
    "OUTBOUND_SAMPLE_TESTING",
    "NO_BARCODE_OUTBOUND",
  ].includes(movementType)
}

async function loadRows(table: string) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .limit(1000)

  if (error) {
    throw new Error(`Stock data could not load ${table}: ${error.message}`)
  }

  return asRecordArray(data)
}

function mapBrand(row: Record<string, unknown>): Brand {
  return {
    id: readString(row.id),
    name: readString(row.name),
    active: readBoolean(row.is_active, true),
  }
}

function mapOrigin(row: Record<string, unknown>): Origin {
  return {
    id: readString(row.id),
    name: readString(row.name),
    active: readBoolean(row.is_active, true),
  }
}

function mapLocation(row: Record<string, unknown>): StockLocation {
  return {
    id: readString(row.id),
    name: readString(row.name),
    outletId: readNullableString(row.outlet_id),
    isDefaultForOutlet: readBoolean(row.is_default_for_outlet),
    active: readBoolean(row.is_active, true),
  }
}

function mapOutlet(row: Record<string, unknown>): StockOutlet {
  return {
    id: readString(row.id),
    name: readString(row.name),
  }
}

function mapItem(row: Record<string, unknown>): Item {
  const category = readString(row.category, "MEAT")

  return {
    id: readString(row.id),
    itemCode: readString(row.item_code),
    category: isStockCategory(category) ? category : "MEAT",
    defaultBrandId: readNullableString(row.default_brand_id),
    displayName: readNullableString(row.display_name),
    section: readString(row.section, "GENERAL"),
    name: readString(row.name),
    chineseName: readNullableString(row.chinese_name),
    ibanName: readNullableString(row.iban_name),
    barcodeRequired: readBoolean(row.barcode_required, true),
    active: readBoolean(row.is_active, true),
    defaultLowStockLevel: readNumber(row.default_low_stock_level),
    defaultWeightKg:
      row.default_weight_kg === null || row.default_weight_kg === undefined
        ? null
        : readNumber(row.default_weight_kg),
  }
}

function mapUnit(row: Record<string, unknown>): StockUnit {
  const status = readString(row.status, "IN_STOCK")
  const inboundSource = readString(row.inbound_source, "supplier_import")

  return {
    id: readString(row.id),
    barcode: readString(row.barcode),
    itemId: readString(row.item_id),
    brandId: readNullableString(row.brand_id),
    originId: readNullableString(row.origin_id),
    locationId: readString(row.location_id),
    transferToLocationId: readNullableString(row.transfer_to_location_id),
    status: isUnitStatus(status) ? status : "IN_STOCK",
    netWeightKg: readNumber(row.net_weight_kg),
    inboundSource: isInboundSource(inboundSource)
      ? inboundSource
      : "supplier_import",
    batchNo: readNullableString(row.batch_no),
    receivedAt: readString(row.received_at, new Date().toISOString()),
  }
}

function mapBarcodeWeightRule(row: Record<string, unknown>): BarcodeWeightRule {
  return {
    id: readString(row.id),
    itemId: readString(row.item_id),
    brandId: readNullableString(row.brand_id),
    originId: readNullableString(row.origin_id),
    locationId: readNullableString(row.location_id),
    barcodeWeightStart: readNumber(row.barcode_weight_start, 7),
    barcodeWeightLength: readNumber(row.barcode_weight_length, 5),
    barcodeWeightDecimals: readNumber(row.barcode_weight_decimals, 2),
    barcodeLength: row.barcode_length == null ? null : readNumber(row.barcode_length),
    sampleBarcode: readNullableString(row.sample_barcode),
    updatedAt: readString(row.updated_at, new Date().toISOString()),
  }
}

function mapNoBarcodeStock(row: Record<string, unknown>): NoBarcodeStock {
  return {
    id: readString(row.id),
    itemId: readString(row.item_id),
    brandId: readNullableString(row.brand_id),
    originId: readNullableString(row.origin_id),
    locationId: readString(row.location_id),
    quantity: readNumber(row.quantity),
    weightKg: readNumber(row.weight_kg),
  }
}

function mapStockTakeSession(
  row: Record<string, unknown>,
  locations: StockLocation[]
): StockTakeSession {
  const status = readString(row.status, "DRAFT")
  const locationId = readString(row.location_id)

  return {
    id: readString(row.id),
    sessionNo: readString(row.session_no),
    locationId,
    locationName: findName(locations, locationId),
    itemId: readNullableString(row.item_id),
    brandId: readNullableString(row.brand_id),
    status: isTakeStatus(status) ? status : "DRAFT",
    createdAt: readString(row.created_at, new Date().toISOString()),
    submittedAt: readNullableString(row.submitted_at),
    managerReviewedAt: readNullableString(row.manager_reviewed_at ?? row.reviewed_at),
    managerSignature: readNullableString(row.manager_signature),
    approvedAt: readNullableString(row.approved_at),
    directorSignature: readNullableString(row.director_signature),
  }
}

function mapStockTakeLine(
  row: Record<string, unknown>,
  items: Item[],
  brands: Brand[]
): StockTakeLine {
  const itemId = readString(row.item_id)
  const brandId = readNullableString(row.brand_id)
  const exceptionType = readNullableString(row.exception_type)
  const exceptionStatus = readNullableString(row.exception_status)
  const systemCount = readNumber(row.system_count)
  const actualCount = readNumber(row.actual_count)
  const systemWeightKg = readNumber(row.system_weight_kg)
  const actualWeightKg = readNumber(row.actual_weight_kg)

  return {
    id: readString(row.id),
    sessionId: readString(row.session_id),
    itemId,
    brandId,
    barcode: readNullableString(row.barcode),
    itemName: formatDisplayItemName(
      items.find((item) => item.id === itemId),
      brands.find((brand) => brand.id === brandId)
    ),
    systemCount,
    actualCount,
    varianceCount: readNumber(row.variance_count, actualCount - systemCount),
    systemWeightKg,
    actualWeightKg,
    varianceWeightKg: readNumber(
      row.variance_weight_kg,
      actualWeightKg - systemWeightKg
    ),
    exceptionType:
      exceptionType === "UNKNOWN_BARCODE" || exceptionType === "WRONG_LOCATION"
        ? exceptionType
        : null,
    exceptionStatus:
      exceptionStatus === "PENDING" || exceptionStatus === "RESOLVED"
        ? exceptionStatus
        : null,
    exceptionLocationId: readNullableString(row.exception_location_id),
    sourceStockUnitId: readNullableString(row.source_stock_unit_id),
    resolvedStockUnitId: readNullableString(row.resolved_stock_unit_id),
    notes: readString(row.notes, ""),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapDamageRequest(
  row: Record<string, unknown>,
  items: Item[],
  brands: Brand[],
  locations: StockLocation[]
): StockDamageRequest {
  const itemId = readString(row.item_id)
  const brandId = readNullableString(row.brand_id)
  const locationId = readString(row.location_id)
  const reason = readString(row.reason, "other")
  const status = readString(row.status, "SUBMITTED")

  return {
    id: readString(row.id),
    requestNo: readString(row.request_no),
    barcode: readString(row.barcode),
    stockUnitId: readString(row.stock_unit_id),
    itemId,
    itemName: formatDisplayItemName(
      items.find((item) => item.id === itemId),
      brands.find((brand) => brand.id === brandId)
    ),
    locationId,
    locationName: findName(locations, locationId),
    reason: isDamageReason(reason) ? reason : "other",
    status: isDamageRequestStatus(status) ? status : "SUBMITTED",
    photoPath: readString(row.photo_path),
    notes: readString(row.notes, ""),
    managerSignature: readNullableString(row.manager_signature),
    directorSignature: readNullableString(row.director_signature),
    requestedAt: readString(row.requested_at, new Date().toISOString()),
  }
}

function mapReturnSupplierRequest(
  row: Record<string, unknown>,
  items: Item[],
  brands: Brand[],
  locations: StockLocation[]
): StockReturnSupplierRequest {
  const itemId = readString(row.item_id)
  const brandId = readNullableString(row.brand_id)
  const locationId = readString(row.location_id)
  const status = readString(row.status, "SUBMITTED")

  return {
    id: readString(row.id),
    requestNo: readString(row.request_no),
    barcode: readString(row.barcode),
    stockUnitId: readString(row.stock_unit_id),
    itemId,
    itemName: formatDisplayItemName(
      items.find((item) => item.id === itemId),
      brands.find((brand) => brand.id === brandId)
    ),
    locationId,
    locationName: findName(locations, locationId),
    supplierName: readString(row.supplier_name),
    status: isReturnSupplierRequestStatus(status)
      ? status
      : "SUBMITTED",
    notes: readString(row.notes, ""),
    managerSignature: readNullableString(row.manager_signature),
    requestedAt: readString(row.requested_at, new Date().toISOString()),
  }
}

function mapMovement(
  row: Record<string, unknown>,
  items: Item[],
  brands: Brand[],
  units: StockUnit[],
  locations: StockLocation[]
): StockMovement {
  const movementType = readString(row.movement_type, "INBOUND")
  const itemId = readString(row.item_id)
  const stockUnitId = readNullableString(row.stock_unit_id)
  const barcode = readString(row.barcode, "-")
  const linkedUnit = units.find(
    (unit) =>
      (stockUnitId && unit.id === stockUnitId) ||
      (barcode !== "-" && unit.barcode === barcode)
  )
  const displayItemId = linkedUnit?.itemId ?? itemId
  const displayBrandId =
    linkedUnit?.brandId ?? readNullableString(row.brand_id)
  const brand = brands.find((candidate) => candidate.id === displayBrandId)
  const brandName = brand?.name ?? "No manufacturer"
  const fromLocationId = readNullableString(row.from_location_id)
  const toLocationId = readNullableString(row.to_location_id)

  return {
    id: readString(row.id),
    movementType: isMovementType(movementType) ? movementType : "INBOUND",
    stockUnitId,
    itemName: formatDisplayItemName(
      items.find((item) => item.id === displayItemId),
      brand
    ),
    brandName,
    barcode,
    fromLocation: findName(locations, fromLocationId),
    toLocation: findName(locations, toLocationId),
    quantity: readNumber(row.quantity),
    weightKg: readNumber(row.weight_kg),
    referenceNo: readString(row.reference_no, "-"),
    notes: readString(row.notes, ""),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapScanLog(row: Record<string, unknown>): StockScanLog {
  return {
    id: readString(row.id),
    barcode: readString(row.barcode),
    action: readString(row.action),
    success: readBoolean(row.success),
    message: readString(row.message),
    scannedBy: readNullableString(row.scanned_by),
    issueType: readNullableString(row.issue_type),
    itemId: readNullableString(row.item_id),
    selectedItemId: readNullableString(row.selected_item_id),
    expectedLocationId: readNullableString(row.expected_location_id),
    scannedLocationId: readNullableString(row.scanned_location_id),
    expectedStatus: readNullableString(row.expected_status),
    scannedStatus: readNullableString(row.scanned_status),
    relatedContext: asRecord(row.related_context),
    reviewStatus: readString(row.review_status, "OPEN"),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function buildBalances(
  items: Item[],
  brands: Brand[],
  locations: StockLocation[],
  units: StockUnit[],
  noBarcodeStock: NoBarcodeStock[]
): StockBalanceRow[] {
  const grouped = new Map<string, StockBalanceRow>()

  const ensureRow = (
    item: Item,
    brand: Brand | undefined,
    brandId: string | null,
    location: StockLocation
  ) => {
    const key = `${item.id}:${brandId ?? "none"}:${location.id}`
    const existing = grouped.get(key)

    if (existing) {
      return existing
    }

    const row: StockBalanceRow = {
      id: key,
      itemId: item.id,
      brandId,
      itemName: formatDisplayItemName(item, brand),
      brandName: brand?.name ?? "No manufacturer",
      category: item.category,
      locationName: location.name,
      unitCount: 0,
      totalWeightKg: 0,
      noBarcodeQuantity: 0,
      noBarcodeWeightKg: 0,
      totalQuantity: 0,
      combinedWeightKg: 0,
      hasNegativeStock: false,
      negativeQuantity: 0,
      negativeWeightKg: 0,
    }
    grouped.set(key, row)
    return row
  }

  units
    .filter((unit) => stockableStatuses.includes(unit.status))
    .forEach((unit) => {
      const item = items.find((candidate) => candidate.id === unit.itemId)
      const location = locations.find(
        (candidate) => candidate.id === unit.locationId
      )

      if (!item || !location) {
        return
      }

      const brand = brands.find((candidate) => candidate.id === unit.brandId)
      const row = ensureRow(item, brand, unit.brandId ?? null, location)
      row.unitCount += 1
      row.totalWeightKg = roundWeight(row.totalWeightKg + unit.netWeightKg)
    })

  noBarcodeStock.forEach((stock) => {
    const item = items.find((candidate) => candidate.id === stock.itemId)
    const location = locations.find(
      (candidate) => candidate.id === stock.locationId
    )

    if (!item || !location) {
      return
    }

    const brand = brands.find((candidate) => candidate.id === stock.brandId)
    const row = ensureRow(item, brand, stock.brandId, location)
    row.noBarcodeQuantity += stock.quantity
    row.noBarcodeWeightKg = roundWeight(row.noBarcodeWeightKg + stock.weightKg)
  })

  return Array.from(grouped.values())
    .map((row) => {
      const totalQuantity = row.unitCount + row.noBarcodeQuantity
      const combinedWeightKg = roundWeight(row.totalWeightKg + row.noBarcodeWeightKg)
      const negativeQuantity =
        row.noBarcodeQuantity < 0
          ? row.noBarcodeQuantity
          : totalQuantity < 0
            ? totalQuantity
            : 0
      const negativeWeightKg =
        row.noBarcodeWeightKg < 0
          ? row.noBarcodeWeightKg
          : combinedWeightKg < 0
            ? combinedWeightKg
            : 0

      return {
        ...row,
        totalQuantity,
        combinedWeightKg,
        hasNegativeStock: negativeQuantity < 0 || negativeWeightKg < 0,
        negativeQuantity,
        negativeWeightKg,
      } satisfies StockBalanceRow
    })
    .sort((a, b) =>
      `${a.locationName}${a.itemName}`.localeCompare(`${b.locationName}${b.itemName}`)
    )
}

function buildNegativeStockAlerts(
  balances: StockBalanceRow[]
): NegativeStockAlert[] {
  return balances
    .filter((balance) => balance.hasNegativeStock)
    .map((balance) => {
      const reasons = [
        balance.negativeQuantity < 0 ? "quantity below zero" : null,
        balance.negativeWeightKg < 0 ? "weight below zero" : null,
      ].filter(Boolean)

      return {
        id: `negative-${balance.id}`,
        itemName: balance.itemName,
        locationName: balance.locationName,
        quantity: balance.negativeQuantity,
        weightKg: balance.negativeWeightKg,
        reason: reasons.join(" and "),
      }
    })
}

function buildStockAgeAlerts(
  units: StockUnit[],
  items: Item[],
  brands: Brand[],
  locations: StockLocation[]
): StockAgeAlert[] {
  const now = Date.now()

  return units
    .filter((unit) => stockableStatuses.includes(unit.status))
    .map((unit) => {
      const receivedTime = new Date(unit.receivedAt).getTime()

      if (!Number.isFinite(receivedTime)) {
        return null
      }

      const ageDays = Math.floor((now - receivedTime) / 86_400_000)

      if (ageDays < sixMonthStockAgeDays) {
        return null
      }

      const item = items.find((candidate) => candidate.id === unit.itemId)
      const brand = brands.find((candidate) => candidate.id === unit.brandId)

      return {
        id: `age-${unit.id}`,
        barcode: unit.barcode,
        itemName: formatDisplayItemName(item, brand),
        locationName: findName(locations, unit.locationId),
        receivedAt: unit.receivedAt,
        ageDays,
        alertLevel:
          ageDays >= twelveMonthStockAgeDays
            ? "OVER_12_MONTHS"
            : "OVER_6_MONTHS",
      } satisfies StockAgeAlert
    })
    .filter((alert): alert is StockAgeAlert => alert !== null)
    .sort((a, b) => b.ageDays - a.ageDays)
}

function buildTransferPendingAlerts(
  units: StockUnit[],
  movements: StockMovement[],
  items: Item[],
  brands: Brand[]
): TransferPendingAlert[] {
  const now = Date.now()
  const outboundTransfers = movements
    .filter((movement) => movement.movementType === "OUTBOUND_TRANSFER")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return units
    .filter((unit) => unit.status === "TRANSFER_PENDING")
    .map((unit) => {
      const movement = outboundTransfers.find(
        (candidate) => candidate.barcode === unit.barcode
      )
      const transferredAt = movement?.createdAt ?? unit.receivedAt
      const transferredTime = new Date(transferredAt).getTime()

      if (!Number.isFinite(transferredTime)) {
        return null
      }

      const ageDays = Math.floor((now - transferredTime) / 86_400_000)

      if (ageDays < overdueTransferDays) {
        return null
      }

      return {
        id: `transfer-pending-${unit.id}`,
        barcode: unit.barcode,
        itemName: formatDisplayItemName(
          items.find((candidate) => candidate.id === unit.itemId),
          brands.find((candidate) => candidate.id === unit.brandId)
        ),
        fromLocation: movement?.fromLocation ?? "-",
        toLocation: movement?.toLocation ?? "-",
        transferredAt,
        ageDays,
      } satisfies TransferPendingAlert
    })
    .filter((alert): alert is TransferPendingAlert => alert !== null)
    .sort((a, b) => b.ageDays - a.ageDays)
}

function buildReports(
  balances: StockBalanceRow[],
  units: StockUnit[] = [],
  items: Item[] = [],
  brands: Brand[] = [],
  origins: Origin[] = [],
  locations: StockLocation[] = [],
  movements: StockMovement[] = [],
  stockAgeAlerts: StockAgeAlert[] = [],
  scanLogs: StockScanLog[] = [],
  damageRequests: StockDamageRequest[] = [],
  returnSupplierRequests: StockReturnSupplierRequest[] = [],
  stockTakeLines: StockTakeLine[] = [],
  stockTakeSessions: StockTakeSession[] = []
): StockReportRow[] {
  const now = new Date().toISOString()
  const totalByLocation = new Map<string, StockReportRow>()
  const totalByCategory = new Map<string, StockReportRow>()
  const stockByInboundAge = new Map<string, StockReportRow>()
  const unitIdentity = (unit: StockUnit | undefined) => {
    const item = unit ? items.find((candidate) => candidate.id === unit.itemId) : undefined
    const brand = unit
      ? brands.find((candidate) => candidate.id === unit.brandId)
      : undefined
    const origin = unit
      ? origins.find((candidate) => candidate.id === unit.originId)
      : undefined

    return {
      itemName: unit ? formatDisplayItemName(item, brand) : "-",
      brandName: brand?.name ?? "No manufacturer",
      originName: origin?.name ?? "Unknown origin",
    }
  }
  const movementHistoryRows = movements.map((movement) => ({
    id: `report-movement-${movement.id}`,
    reportName: "Stock movement history",
    locationName: movement.toLocation !== "-" ? movement.toLocation : movement.fromLocation,
    itemName: movement.itemName,
    brandName: movement.brandName,
    originName: "-",
    category: movement.movementType,
    count: movement.quantity,
    weightKg: roundWeight(movement.weightKg),
    generatedAt: movement.createdAt,
  }) satisfies StockReportRow)
  const inboundRows = movements
    .filter((movement) => isDashboardInboundMovement(movement.movementType))
    .map((movement) => ({
      id: `report-inbound-${movement.id}`,
      reportName: "Inbound",
      locationName: movement.toLocation,
      itemName: movement.itemName,
      brandName: movement.brandName,
      originName: "-",
      category: movement.itemName,
      count: movement.quantity,
      weightKg: roundWeight(movement.weightKg),
      generatedAt: movement.createdAt,
    }) satisfies StockReportRow)
  const outboundRows = movements
    .filter((movement) => isDashboardOutboundMovement(movement.movementType))
    .map((movement) => ({
      id: `report-outbound-${movement.id}`,
      reportName: "Outbound",
      locationName: movement.fromLocation,
      itemName: movement.itemName,
      brandName: movement.brandName,
      originName: "-",
      category: movement.movementType,
      count: movement.quantity,
      weightKg: roundWeight(movement.weightKg),
      generatedAt: movement.createdAt,
    }) satisfies StockReportRow)
  const transferPendingRows = units
    .filter((unit) => unit.status === "TRANSFER_PENDING")
    .map((unit) => {
      const movement = movements.find(
        (candidate) =>
          candidate.movementType === "OUTBOUND_TRANSFER" &&
          candidate.barcode === unit.barcode
      )
      const identity = unitIdentity(unit)

      return {
        id: `report-transfer-pending-${unit.id}`,
        reportName: "Transfer pending",
        locationName: findName(locations, unit.locationId),
        itemName: identity.itemName,
        brandName: identity.brandName,
        originName: identity.originName,
        category: unit.barcode,
        count: 1,
        weightKg: roundWeight(unit.netWeightKg),
        generatedAt: movement?.createdAt ?? unit.receivedAt,
      } satisfies StockReportRow
    })
  const oldStockRows = stockAgeAlerts.map((alert) => {
    const unit = units.find((candidate) => candidate.barcode === alert.barcode)
    const identity = unitIdentity(unit)

    return {
      id: `report-old-stock-${alert.id}`,
      reportName: "Old stock 6 months",
      locationName: alert.locationName,
      itemName: identity.itemName,
      brandName: identity.brandName,
      originName: identity.originName,
      category: `${alert.itemName} / ${
        alert.alertLevel === "OVER_12_MONTHS" ? "Over 12 months" : "Over 6 months"
      }`,
      count: 1,
      weightKg: roundWeight(unit?.netWeightKg ?? 0),
      generatedAt: now,
    } satisfies StockReportRow
  })
  const barcodeScanErrorRows = scanLogs
    .filter((log) => !log.success || log.issueType)
    .map((log) => ({
      id: `report-barcode-scan-error-${log.id}`,
      reportName: "Barcode scan errors",
      locationName: "SCAN LOG",
      itemName: "Scan issue",
      brandName: "-",
      originName: "-",
      category: `${log.barcode} / ${log.issueType ?? log.action}: ${log.message}`,
      count: 1,
      weightKg: 0,
      generatedAt: log.createdAt,
    }) satisfies StockReportRow)
  const stockBalanceRows = balances.map((balance) => ({
    id: `report-stock-balance-${balance.id}`,
    reportName: "Stock balance",
    locationName: balance.locationName,
    itemName: balance.itemName,
    brandName: balance.brandName,
    originName: "-",
    category: balance.category,
    count: balance.totalQuantity,
    weightKg: roundWeight(balance.combinedWeightKg),
    generatedAt: now,
  }) satisfies StockReportRow)

  balances.forEach((balance) => {
    const locationRow =
      totalByLocation.get(balance.locationName) ??
      ({
        id: `report-location-${balance.locationName}`,
        reportName: "Stock by location",
        locationName: balance.locationName,
        itemName: "ALL",
        brandName: "ALL",
        originName: "ALL",
        category: "ALL",
        count: 0,
        weightKg: 0,
        generatedAt: now,
      } satisfies StockReportRow)

    locationRow.count += balance.unitCount + balance.noBarcodeQuantity
    locationRow.weightKg = roundWeight(
      locationRow.weightKg +
        balance.totalWeightKg +
        balance.noBarcodeWeightKg
    )
    totalByLocation.set(balance.locationName, locationRow)

    const categoryRow =
      totalByCategory.get(balance.category) ??
      ({
        id: `report-category-${balance.category}`,
        reportName: "Stock by category",
        locationName: "ALL",
        itemName: "ALL",
        brandName: "ALL",
        originName: "ALL",
        category: balance.category,
        count: 0,
        weightKg: 0,
        generatedAt: now,
      } satisfies StockReportRow)

    categoryRow.count += balance.unitCount + balance.noBarcodeQuantity
    categoryRow.weightKg = roundWeight(
      categoryRow.weightKg + balance.totalWeightKg + balance.noBarcodeWeightKg
    )
    totalByCategory.set(balance.category, categoryRow)
  })

  units
    .filter((unit) => stockableStatuses.includes(unit.status))
    .forEach((unit) => {
      const item = items.find((candidate) => candidate.id === unit.itemId)
      const receivedTime = new Date(unit.receivedAt).getTime()

      if (!item || !Number.isFinite(receivedTime)) {
        return
      }

      const ageDays = Math.floor((Date.now() - receivedTime) / 86_400_000)
      const ageBucket =
        ageDays >= twelveMonthStockAgeDays
          ? "Over 12 months"
          : ageDays >= sixMonthStockAgeDays
            ? "6 to 12 months"
            : "Under 6 months"
      const brand = brands.find((candidate) => candidate.id === unit.brandId)
      const brandName = brand?.name ?? "No manufacturer"
      const originName = findName(origins, unit.originId, "Unknown origin")
      const locationName = findName(locations, unit.locationId)
      const itemName = formatDisplayItemName(item, brand)
      const key = `${item.id}:${unit.brandId ?? "none"}:${unit.locationId}:${ageBucket}`
      const row =
        stockByInboundAge.get(key) ??
        ({
          id: `report-inbound-age-${key}`,
          reportName: "Stock by inbound age",
          locationName,
          itemName,
          brandName,
          originName,
          category: `${itemName} / ${brandName} / ${ageBucket}`,
          count: 0,
          weightKg: 0,
          generatedAt: now,
        } satisfies StockReportRow)

      row.count += 1
      row.weightKg = roundWeight(row.weightKg + unit.netWeightKg)
      stockByInboundAge.set(key, row)
    })

  const damageRows = damageRequests.map(
    (request) => {
      const linkedUnit = units.find((unit) => unit.id === request.stockUnitId)
      const identity = unitIdentity(linkedUnit)

      return {
        id: `report-damage-${request.id}`,
        reportName: "Damage/spoilage",
        locationName: request.locationName,
        itemName: identity.itemName === "-" ? request.itemName : identity.itemName,
        brandName: identity.brandName,
        originName: identity.originName,
        category: `${request.status} / Manager signature: ${request.managerSignature ?? "Pending"} / Director signature: ${request.directorSignature ?? "Pending"}`,
        count: 1,
        weightKg: roundWeight(linkedUnit?.netWeightKg ?? 0),
        generatedAt: request.requestedAt,
      } satisfies StockReportRow
    }
  )
  const returnSupplierRows = returnSupplierRequests.map(
    (request) => {
      const linkedUnit = units.find((unit) => unit.id === request.stockUnitId)
      const identity = unitIdentity(linkedUnit)

      return {
        id: `report-return-supplier-${request.id}`,
        reportName: "Return supplier",
        locationName: request.locationName,
        itemName: identity.itemName === "-" ? request.itemName : identity.itemName,
        brandName: identity.brandName,
        originName: identity.originName,
        category: request.status,
        count: 1,
        weightKg: roundWeight(linkedUnit?.netWeightKg ?? 0),
        generatedAt: request.requestedAt,
      } satisfies StockReportRow
    }
  )
  const stockTakeVarianceRows = stockTakeLines
    .filter(
      (line) => line.varianceCount !== 0 || line.varianceWeightKg !== 0
    )
    .map((line) => {
      const session = stockTakeSessions.find(
        (candidate) => candidate.id === line.sessionId
      )

      return {
          id: `report-stock-take-variance-${line.id}`,
          reportName: "Stock take variance",
          locationName: session?.locationName ?? "STOCK TAKE",
          itemName: line.itemName,
          brandName:
            brands.find((brand) => brand.id === line.brandId)?.name ??
            "No manufacturer",
          originName: "-",
          category: `${line.itemName} / Manager signature: ${session?.managerSignature ?? "Pending"} / Director signature: ${session?.directorSignature ?? "Pending"}`,
          count: line.varianceCount,
          weightKg: roundWeight(line.varianceWeightKg),
          generatedAt: session?.approvedAt ?? session?.createdAt ?? now,
        } satisfies StockReportRow
    })

  return [
    ...stockBalanceRows,
    ...totalByLocation.values(),
    ...totalByCategory.values(),
    ...stockByInboundAge.values(),
    ...movementHistoryRows,
    ...inboundRows,
    ...outboundRows,
    ...transferPendingRows,
    ...oldStockRows,
    ...stockTakeVarianceRows,
    ...damageRows,
    ...returnSupplierRows,
    ...barcodeScanErrorRows,
  ]
}

function buildDashboard(
  items: Item[],
  brands: Brand[],
  locations: StockLocation[],
  units: StockUnit[],
  noBarcodeStock: NoBarcodeStock[],
  movements: StockMovement[],
  balances: StockBalanceRow[],
  stockTakeLines: StockTakeLine[],
  stockTakeSessions: StockTakeSession[] = [],
  damageRequests: StockDamageRequest[] = [],
  scanLogs: StockScanLog[] = []
) {
  const inStockUnits = units.filter((unit) =>
    stockableStatuses.includes(unit.status)
  )
  const totalWeight = balances.reduce(
    (sum, balance) =>
      sum + balance.totalWeightKg + balance.noBarcodeWeightKg,
    0
  )
  const transferPending = units.filter(
    (unit) => unit.status === "TRANSFER_PENDING"
  ).length
  const noBarcodeWeight = noBarcodeStock.reduce(
    (sum, stock) => sum + stock.weightKg,
    0
  )
  const openVariance = stockTakeLines.reduce(
    (sum, line) => sum + Math.abs(line.varianceWeightKg),
    0
  )
  const negativeStockAlerts = buildNegativeStockAlerts(balances)
  const stockAgeAlerts = buildStockAgeAlerts(units, items, brands, locations)
  const transferPendingAlerts = buildTransferPendingAlerts(
    units,
    movements,
    items,
    brands
  )
  const pendingDamageApprovals = damageRequests.filter((request) =>
    ["SUBMITTED", "MANAGER_REVIEWED"].includes(request.status)
  )
  const pendingStockTakeApprovals = stockTakeSessions.filter((session) =>
    ["SUBMITTED", "REVIEWED"].includes(session.status)
  )
  const duplicateScanAttempts = scanLogs.filter(
    (log) => !log.success && log.message.toLowerCase().includes("duplicate")
  )
  const barcodeDecodeErrors = scanLogs.filter((log) => {
    const message = log.message.toLowerCase()

    return (
      !log.success &&
      (message.includes("decode") ||
        message.includes("confident") ||
        message.includes("weight"))
    )
  })
  const failedScanLogs = scanLogs.filter(
    (log) => (!log.success || log.issueType) && log.reviewStatus === "OPEN"
  )
  const scanAlerts: StockScanAlert[] = failedScanLogs
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((log) => ({
      id: `scan-alert-${log.id}`,
      barcode: log.barcode,
      action: log.action,
      message: log.message,
      scannedBy: log.scannedBy,
      issueType: log.issueType ?? null,
      itemName: log.itemId
        ? formatScanIssueItemName(
            items.find((item) => item.id === log.itemId),
            brands,
            log.relatedContext ?? {}
          )
        : null,
      selectedItemName: log.selectedItemId
        ? formatScanIssueItemName(
            items.find((item) => item.id === log.selectedItemId),
            brands,
            log.relatedContext ?? {}
          )
        : null,
      expectedLocationId: log.expectedLocationId ?? null,
      expectedLocationName: log.expectedLocationId
        ? findName(locations, log.expectedLocationId)
        : null,
      scannedLocationId: log.scannedLocationId ?? null,
      scannedLocationName: log.scannedLocationId
        ? findName(locations, log.scannedLocationId)
        : null,
      expectedStatus: log.expectedStatus ?? null,
      scannedStatus: log.scannedStatus ?? null,
      relatedContext: log.relatedContext ?? {},
      reviewStatus: log.reviewStatus ?? "OPEN",
      createdAt: log.createdAt,
    }))
  const today = tableDate(new Date().toISOString())
  const todayInboundWeight = movements
    .filter(
      (movement) =>
        tableDate(movement.createdAt) === today &&
        isDashboardInboundMovement(movement.movementType)
    )
    .reduce((sum, movement) => sum + movement.weightKg, 0)
  const todayOutboundWeight = movements
    .filter(
      (movement) =>
        tableDate(movement.createdAt) === today &&
        isDashboardOutboundMovement(movement.movementType)
    )
    .reduce((sum, movement) => sum + Math.abs(movement.weightKg), 0)

  const categoryMix: ChartPoint[] = stockCategories.map((category) => ({
    name: category,
    value: roundWeight(
      balances
        .filter((balance) => balance.category === category)
        .reduce(
          (sum, balance) =>
            sum + balance.totalWeightKg + balance.noBarcodeWeightKg,
          0
        )
    ),
  }))

  const locationStock: ChartPoint[] = locations.map((location) => ({
    name: location.name,
    value: roundWeight(
      balances
        .filter((balance) => balance.locationName === location.name)
        .reduce(
          (sum, balance) =>
            sum + balance.totalWeightKg + balance.noBarcodeWeightKg,
          0
        )
    ),
  }))

  const movementDates = Array.from(
    new Set(movements.map((movement) => tableDate(movement.createdAt)))
  )
    .sort()
    .slice(-7)

  const movementTrend: MovementTrendPoint[] = movementDates.map((date) => ({
    date,
    inbound: movements
      .filter(
        (movement) =>
          tableDate(movement.createdAt) === date &&
          (movement.movementType === "INBOUND" ||
            movement.movementType === "NO_BARCODE_INBOUND")
      )
      .reduce((sum, movement) => sum + movement.weightKg, 0),
    outbound: movements
      .filter(
        (movement) =>
          tableDate(movement.createdAt) === date &&
          (movement.movementType === "OUTBOUND_SALES" ||
            movement.movementType === "NO_BARCODE_OUTBOUND")
      )
      .reduce((sum, movement) => sum + movement.weightKg, 0),
    transfer: movements
      .filter(
        (movement) =>
          tableDate(movement.createdAt) === date &&
          (movement.movementType === "OUTBOUND_TRANSFER" ||
            movement.movementType === "TRANSFER_RECEIVED")
      )
      .reduce((sum, movement) => sum + movement.weightKg, 0),
  }))

  return {
    kpis: [
      {
        label: "Active SKUs",
        value: String(items.filter((item) => item.active).length),
        detail: "Item master records",
      },
      {
        label: "Barcode units",
        value: String(inStockUnits.length),
        detail: "Units available or returned",
      },
      {
        label: "Total stock weight",
        value: `${roundWeight(totalWeight).toLocaleString()} kg`,
        detail: "Barcode stock plus legacy balances",
      },
      {
        label: "Today inbound",
        value: `${roundWeight(todayInboundWeight).toLocaleString()} kg`,
        detail: "Inbound, return, and received transfer weight",
      },
      {
        label: "Today outbound",
        value: `${roundWeight(todayOutboundWeight).toLocaleString()} kg`,
        detail: "Sales, transfer, processing, damage, and supplier return",
      },
      {
        label: "Transfers pending",
        value: String(transferPending),
        detail:
          transferPendingAlerts.length > 0
            ? `${transferPendingAlerts.length} overdue more than 3 days`
            : "Awaiting receive confirmation",
      },
      {
        label: "Legacy no-barcode weight",
        value: `${roundWeight(noBarcodeWeight).toLocaleString()} kg`,
        detail: "Visible for old records only",
      },
      {
        label: "Open variance",
        value: `${roundWeight(openVariance).toLocaleString()} kg`,
        detail: "Latest stock take variance",
      },
      {
        label: "Negative stock alerts",
        value: String(negativeStockAlerts.length),
        detail:
          negativeStockAlerts.length > 0
            ? "Temporary negative balances need review"
            : "No negative stock detected",
      },
      {
        label: "Stock age alerts",
        value: String(stockAgeAlerts.length),
        detail:
          stockAgeAlerts.length > 0
            ? "Stock older than 6 or 12 months"
            : "No aged stock detected",
      },
      {
        label: "Damage pending approval",
        value: String(pendingDamageApprovals.length),
        detail: "Submitted or manager-reviewed damage requests",
      },
      {
        label: "Stock take pending approval",
        value: String(pendingStockTakeApprovals.length),
        detail: "Submitted manager review or director approval",
      },
      {
        label: "Scan issues for review",
        value: String(failedScanLogs.length),
        detail: "Open scan and stock workflow issues awaiting review",
      },
      {
        label: "Duplicate scan attempts",
        value: String(duplicateScanAttempts.length),
        detail: "Blocked duplicate barcode scan logs",
      },
      {
        label: "Barcode decode errors",
        value: String(barcodeDecodeErrors.length),
        detail: "Blocked weight/decode scan logs",
      },
    ],
    categoryMix,
    locationStock,
    movementTrend,
    negativeStockAlerts,
    stockAgeAlerts,
    transferPendingAlerts,
    scanAlerts,
  }
}

function filterMovements(
  movements: StockMovement[],
  filters: MovementFilters = {}
) {
  const query = filters.q?.trim().toLowerCase()
  const type = filters.movementType?.trim() || filters.type?.trim()
  const location = filters.location?.trim().toLowerCase()
  const dateFrom = filters.dateFrom?.trim()
  const dateTo = filters.dateTo?.trim()
  const item = filters.item?.trim().toLowerCase()
  const brand = filters.brand?.trim().toLowerCase()
  const status = filters.status?.trim().toLowerCase()
  const user = filters.user?.trim().toLowerCase()

  return movements.filter((movement) => {
    const movementDate = tableDate(movement.createdAt)
    const matchesQuery =
      !query ||
      [
        movement.itemName,
        movement.brandName,
        movement.barcode,
        movement.referenceNo,
        movement.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    const matchesType = !type || movement.movementType === type
    const matchesLocation =
      !location ||
      movement.fromLocation.toLowerCase().includes(location) ||
      movement.toLocation.toLowerCase().includes(location)
    const matchesDateFrom = !dateFrom || movementDate >= dateFrom
    const matchesDateTo = !dateTo || movementDate <= dateTo
    const matchesItem =
      !item || movement.itemName.toLowerCase().includes(item)
    const matchesBrand =
      !brand || movement.brandName.toLowerCase().includes(brand)
    const matchesStatus =
      !status ||
      movement.movementType.toLowerCase().includes(status) ||
      movement.notes.toLowerCase().includes(status)
    const matchesUser = !user || movement.notes.toLowerCase().includes(user)

    return (
      matchesQuery &&
      matchesType &&
      matchesLocation &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesItem &&
      matchesBrand &&
      matchesStatus &&
      matchesUser
    )
  })
}

function withMovementDisplayNames(
  movements: StockMovement[],
  items: Item[],
  brands: Brand[],
  units: StockUnit[]
) {
  return movements.map((movement) => {
    const linkedUnit = units.find(
      (unit) =>
        (movement.stockUnitId && unit.id === movement.stockUnitId) ||
        (movement.barcode !== "-" && unit.barcode === movement.barcode)
    )

    if (!linkedUnit) {
      return movement
    }

    return {
      ...movement,
      itemName: formatDisplayItemName(
        items.find((item) => item.id === linkedUnit.itemId),
        brands.find((brand) => brand.id === linkedUnit.brandId)
      ),
      brandName:
        brands.find((brand) => brand.id === linkedUnit.brandId)?.name ??
        "No manufacturer",
    }
  })
}

async function loadSupabaseData(filters: MovementFilters) {
  const [
    brandRows,
    originRows,
    outletRows,
    locationRows,
    itemRows,
    unitRows,
    barcodeWeightRuleRows,
    noBarcodeRows,
    movementRows,
    scanLogRows,
    stockTakeSessionRows,
    stockTakeLineRows,
    damageRequestRows,
    returnSupplierRequestRows,
  ] = await Promise.all([
    loadRows("brands"),
    loadRows("origins"),
    loadRows("outlets"),
    loadRows("stock_locations"),
    loadRows("items"),
    loadRows("stock_units"),
    loadRows("barcode_weight_rules"),
    loadRows("no_barcode_stock"),
    loadRows("stock_movements"),
    loadRows("barcode_scan_logs"),
    loadRows("stock_take_sessions"),
    loadRows("stock_take_lines"),
    loadRows("stock_damage_requests"),
    loadRows("stock_return_supplier_requests"),
  ])

  if (
    !brandRows ||
    !originRows ||
    !outletRows ||
    !locationRows ||
    !itemRows ||
    !unitRows ||
    !barcodeWeightRuleRows ||
    !noBarcodeRows ||
    !movementRows ||
    !scanLogRows ||
    !stockTakeSessionRows ||
    !stockTakeLineRows ||
    !damageRequestRows ||
    !returnSupplierRequestRows
  ) {
    return null
  }

  const brands = brandRows.map(mapBrand)
  const origins = originRows.map(mapOrigin)
  const outlets = outletRows.map(mapOutlet)
  const locations = locationRows.map(mapLocation)
  const items = itemRows.map(mapItem)
  const units = unitRows.map(mapUnit)
  const barcodeWeightRules = barcodeWeightRuleRows.map(mapBarcodeWeightRule)
  const noBarcodeStock = noBarcodeRows.map(mapNoBarcodeStock)
  const movements = filterMovements(
    movementRows
      .map((row) => mapMovement(row, items, brands, units, locations))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    filters
  )
  const scanLogs = scanLogRows
    .map(mapScanLog)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const balances = buildBalances(items, brands, locations, units, noBarcodeStock)
  const stockTakeSessions = stockTakeSessionRows
    .map((row) => mapStockTakeSession(row, locations))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const stockTakeLines = stockTakeLineRows
    .map((row) => mapStockTakeLine(row, items, brands))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const damageRequests = damageRequestRows
    .map((row) => mapDamageRequest(row, items, brands, locations))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  const returnSupplierRequests = returnSupplierRequestRows
    .map((row) => mapReturnSupplierRequest(row, items, brands, locations))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  const reports = buildReports(
    balances,
    units,
    items,
    brands,
    origins,
    locations,
    movements,
    buildStockAgeAlerts(units, items, brands, locations),
    scanLogs,
    damageRequests,
    returnSupplierRequests,
    stockTakeLines,
    stockTakeSessions
  )

  return {
    demoMode: false,
    brands,
    origins,
    outlets,
    locations,
    items,
    units,
    barcodeWeightRules,
    noBarcodeStock,
    movements,
    scanLogs,
    balances,
    stockTakeSessions,
    stockTakeLines,
    damageRequests,
    returnSupplierRequests,
    reports,
    dashboard: buildDashboard(
      items,
      brands,
      locations,
      units,
      noBarcodeStock,
      movements,
      balances,
      stockTakeLines,
      stockTakeSessions,
      damageRequests,
      scanLogs
    ),
  } satisfies StockPageData
}

function buildDemoData(filters: MovementFilters): StockPageData {
  const balances = buildBalances(
    demoItems,
    demoBrands,
    demoLocations,
    demoUnits,
    demoNoBarcodeStock
  )
  const movements = filterMovements(
    withMovementDisplayNames(demoMovements, demoItems, demoBrands, demoUnits),
    filters
  )
  const reports = buildReports(
    balances,
    demoUnits,
    demoItems,
    demoBrands,
    demoOrigins,
    demoLocations,
    movements,
    buildStockAgeAlerts(demoUnits, demoItems, demoBrands, demoLocations),
    demoScanLogs,
    demoDamageRequests,
    demoReturnSupplierRequests,
    demoStockTakeLines,
    demoStockTakeSessions
  )

  return {
    demoMode: true,
    brands: demoBrands,
    origins: demoOrigins,
    outlets: demoOutlets,
    locations: demoLocations,
    items: demoItems,
    units: demoUnits,
    barcodeWeightRules: demoBarcodeWeightRules,
    noBarcodeStock: demoNoBarcodeStock,
    movements,
    scanLogs: demoScanLogs,
    balances,
    stockTakeSessions: demoStockTakeSessions,
    stockTakeLines: demoStockTakeLines,
    damageRequests: demoDamageRequests,
    returnSupplierRequests: demoReturnSupplierRequests,
    reports,
    dashboard: buildDashboard(
      demoItems,
      demoBrands,
      demoLocations,
      demoUnits,
      demoNoBarcodeStock,
      movements,
      balances,
      demoStockTakeLines,
      demoStockTakeSessions,
      demoDamageRequests,
      demoScanLogs
    ),
  }
}

export async function getStockPageData(filters: MovementFilters = {}) {
  const supabaseData = await loadSupabaseData(filters)

  return supabaseData ?? buildDemoData(filters)
}

export async function getStockUnitDetailData(unitId: string) {
  const data = await getStockPageData()
  const unit = data.units.find((candidate) => candidate.id === unitId)

  if (!unit) {
    return {
      data,
      unit: null,
      movements: [],
    }
  }

  const item = data.items.find((candidate) => candidate.id === unit.itemId)
  const brand = data.brands.find((candidate) => candidate.id === unit.brandId)
  const origin = data.origins.find((candidate) => candidate.id === unit.originId)
  const location = data.locations.find(
    (candidate) => candidate.id === unit.locationId
  )
  const movements = data.movements.filter(
    (movement) =>
      movement.stockUnitId === unit.id || movement.barcode === unit.barcode
  )

  return {
    data,
    unit: {
      ...unit,
      itemName: formatDisplayItemName(item, brand),
      itemCode: item?.itemCode ?? "-",
      brandName: brand?.name ?? "No manufacturer",
      originName: origin?.name ?? "Unknown origin",
      locationName: location?.name ?? "Unknown location",
    },
    movements,
  }
}

export function getSystemStockForItemLocation(
  balances: StockBalanceRow[],
  item: Item,
  location: StockLocation
) {
  const scopedRows = balances.filter(
    (balance) =>
      balance.itemId === item.id &&
      balance.locationName === location.name
  )

  return {
    count: scopedRows.reduce(
      (total, row) => total + row.unitCount + row.noBarcodeQuantity,
      0
    ),
    weightKg: roundWeight(
      scopedRows.reduce(
        (total, row) => total + row.totalWeightKg + row.noBarcodeWeightKg,
        0
      )
    ),
  }
}
