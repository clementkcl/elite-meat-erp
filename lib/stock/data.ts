import {
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  demoBrands,
  demoBarcodeWeightRules,
  demoItems,
  demoLocations,
  demoMovements,
  demoNoBarcodeStock,
  demoOrigins,
  demoStockTakeLines,
  demoStockTakeSessions,
  demoUnits,
} from "@/lib/stock/demo-data"
import {
  stockCategories,
  stockInboundSources,
  stockMovementTypes,
  stockTakeStatuses,
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
  type StockPageData,
  type StockReportRow,
  type StockInboundSource,
  type StockTakeLine,
  type StockTakeSession,
  type StockTakeStatus,
  type StockUnit,
  type StockUnitStatus,
} from "@/lib/stock/types"

const stockableStatuses: StockUnitStatus[] = [
  "IN_STOCK",
  "TRANSFERRED",
  "RETURNED",
]
const sixMonthStockAgeDays = 183
const twelveMonthStockAgeDays = 365

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

function formatItemName(item: Item | undefined) {
  if (!item) {
    return "Unknown item"
  }

  return `${item.category} / ${item.section} / ${item.name}`
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
    return null
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
    active: readBoolean(row.is_active, true),
  }
}

function mapItem(row: Record<string, unknown>): Item {
  const category = readString(row.category, "MEAT")

  return {
    id: readString(row.id),
    itemCode: readString(row.item_code),
    category: isStockCategory(category) ? category : "MEAT",
    section: readString(row.section, "GENERAL"),
    name: readString(row.name),
    barcodeRequired: readBoolean(row.barcode_required, true),
    active: readBoolean(row.is_active, true),
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
    locationId: readString(row.location_id),
    barcodeWeightStart: readNumber(row.barcode_weight_start, 7),
    barcodeWeightLength: readNumber(row.barcode_weight_length, 5),
    barcodeWeightDecimals: readNumber(row.barcode_weight_decimals, 2),
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
    status: isTakeStatus(status) ? status : "DRAFT",
    createdAt: readString(row.created_at, new Date().toISOString()),
    submittedAt: readNullableString(row.submitted_at),
    approvedAt: readNullableString(row.approved_at),
  }
}

function mapStockTakeLine(
  row: Record<string, unknown>,
  items: Item[]
): StockTakeLine {
  const itemId = readString(row.item_id)
  const systemCount = readNumber(row.system_count)
  const actualCount = readNumber(row.actual_count)
  const systemWeightKg = readNumber(row.system_weight_kg)
  const actualWeightKg = readNumber(row.actual_weight_kg)

  return {
    id: readString(row.id),
    sessionId: readString(row.session_id),
    itemId,
    barcode: readNullableString(row.barcode),
    itemName: formatItemName(items.find((item) => item.id === itemId)),
    systemCount,
    actualCount,
    varianceCount: readNumber(row.variance_count, actualCount - systemCount),
    systemWeightKg,
    actualWeightKg,
    varianceWeightKg: readNumber(
      row.variance_weight_kg,
      actualWeightKg - systemWeightKg
    ),
    notes: readString(row.notes, ""),
  }
}

function mapMovement(
  row: Record<string, unknown>,
  items: Item[],
  locations: StockLocation[]
): StockMovement {
  const movementType = readString(row.movement_type, "INBOUND")
  const itemId = readString(row.item_id)
  const fromLocationId = readNullableString(row.from_location_id)
  const toLocationId = readNullableString(row.to_location_id)

  return {
    id: readString(row.id),
    movementType: isMovementType(movementType) ? movementType : "INBOUND",
    itemName: formatItemName(items.find((item) => item.id === itemId)),
    barcode: readString(row.barcode, "-"),
    fromLocation: findName(locations, fromLocationId),
    toLocation: findName(locations, toLocationId),
    quantity: readNumber(row.quantity),
    weightKg: readNumber(row.weight_kg),
    referenceNo: readString(row.reference_no, "-"),
    notes: readString(row.notes, ""),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function buildBalances(
  items: Item[],
  locations: StockLocation[],
  units: StockUnit[],
  noBarcodeStock: NoBarcodeStock[]
): StockBalanceRow[] {
  const grouped = new Map<string, StockBalanceRow>()

  const ensureRow = (item: Item, location: StockLocation) => {
    const key = `${item.id}:${location.id}`
    const existing = grouped.get(key)

    if (existing) {
      return existing
    }

    const row: StockBalanceRow = {
      id: key,
      itemName: formatItemName(item),
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

      const row = ensureRow(item, location)
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

    const row = ensureRow(item, location)
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

      return {
        id: `age-${unit.id}`,
        barcode: unit.barcode,
        itemName: formatItemName(item),
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

function buildReports(balances: StockBalanceRow[]): StockReportRow[] {
  const now = new Date().toISOString()
  const totalByLocation = new Map<string, StockReportRow>()
  const totalByCategory = new Map<string, StockReportRow>()

  balances.forEach((balance) => {
    const locationRow =
      totalByLocation.get(balance.locationName) ??
      ({
        id: `report-location-${balance.locationName}`,
        reportName: "Stock by location",
        locationName: balance.locationName,
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

  return [...totalByLocation.values(), ...totalByCategory.values()]
}

function buildDashboard(
  items: Item[],
  locations: StockLocation[],
  units: StockUnit[],
  noBarcodeStock: NoBarcodeStock[],
  movements: StockMovement[],
  balances: StockBalanceRow[],
  stockTakeLines: StockTakeLine[]
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
  const stockAgeAlerts = buildStockAgeAlerts(units, items, locations)

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
        detail: "Barcode and no-barcode stock",
      },
      {
        label: "Transfers pending",
        value: String(transferPending),
        detail: "Awaiting receive confirmation",
      },
      {
        label: "No-barcode weight",
        value: `${roundWeight(noBarcodeWeight).toLocaleString()} kg`,
        detail: "Tracked by quantity and weight",
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
    ],
    categoryMix,
    locationStock,
    movementTrend,
    negativeStockAlerts,
    stockAgeAlerts,
  }
}

function filterMovements(
  movements: StockMovement[],
  filters: MovementFilters = {}
) {
  const query = filters.q?.trim().toLowerCase()
  const type = filters.type?.trim()
  const location = filters.location?.trim().toLowerCase()

  return movements.filter((movement) => {
    const matchesQuery =
      !query ||
      [
        movement.itemName,
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

    return matchesQuery && matchesType && matchesLocation
  })
}

async function loadSupabaseData(filters: MovementFilters) {
  const [
    brandRows,
    originRows,
    locationRows,
    itemRows,
    unitRows,
    barcodeWeightRuleRows,
    noBarcodeRows,
    movementRows,
    stockTakeSessionRows,
    stockTakeLineRows,
  ] = await Promise.all([
    loadRows("brands"),
    loadRows("origins"),
    loadRows("stock_locations"),
    loadRows("items"),
    loadRows("stock_units"),
    loadRows("barcode_weight_rules"),
    loadRows("no_barcode_stock"),
    loadRows("stock_movements"),
    loadRows("stock_take_sessions"),
    loadRows("stock_take_lines"),
  ])

  if (
    !brandRows ||
    !originRows ||
    !locationRows ||
    !itemRows ||
    !unitRows ||
    !barcodeWeightRuleRows ||
    !noBarcodeRows ||
    !movementRows ||
    !stockTakeSessionRows ||
    !stockTakeLineRows
  ) {
    return null
  }

  const brands = brandRows.map(mapBrand)
  const origins = originRows.map(mapOrigin)
  const locations = locationRows.map(mapLocation)
  const items = itemRows.map(mapItem)
  const units = unitRows.map(mapUnit)
  const barcodeWeightRules = barcodeWeightRuleRows.map(mapBarcodeWeightRule)
  const noBarcodeStock = noBarcodeRows.map(mapNoBarcodeStock)
  const movements = filterMovements(
    movementRows
      .map((row) => mapMovement(row, items, locations))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    filters
  )
  const balances = buildBalances(items, locations, units, noBarcodeStock)
  const stockTakeSessions = stockTakeSessionRows
    .map((row) => mapStockTakeSession(row, locations))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const stockTakeLines = stockTakeLineRows.map((row) =>
    mapStockTakeLine(row, items)
  )
  const reports = buildReports(balances)

  return {
    demoMode: false,
    brands,
    origins,
    locations,
    items,
    units,
    barcodeWeightRules,
    noBarcodeStock,
    movements,
    balances,
    stockTakeSessions,
    stockTakeLines,
    reports,
    dashboard: buildDashboard(
      items,
      locations,
      units,
      noBarcodeStock,
      movements,
      balances,
      stockTakeLines
    ),
  } satisfies StockPageData
}

function buildDemoData(filters: MovementFilters): StockPageData {
  const balances = buildBalances(
    demoItems,
    demoLocations,
    demoUnits,
    demoNoBarcodeStock
  )
  const movements = filterMovements(demoMovements, filters)
  const reports = buildReports(balances)

  return {
    demoMode: true,
    brands: demoBrands,
    origins: demoOrigins,
    locations: demoLocations,
    items: demoItems,
    units: demoUnits,
    barcodeWeightRules: demoBarcodeWeightRules,
    noBarcodeStock: demoNoBarcodeStock,
    movements,
    balances,
    stockTakeSessions: demoStockTakeSessions,
    stockTakeLines: demoStockTakeLines,
    reports,
    dashboard: buildDashboard(
      demoItems,
      demoLocations,
      demoUnits,
      demoNoBarcodeStock,
      movements,
      balances,
      demoStockTakeLines
    ),
  }
}

export async function getStockPageData(filters: MovementFilters = {}) {
  const supabaseData = await loadSupabaseData(filters)

  return supabaseData ?? buildDemoData(filters)
}

export function getSystemStockForItemLocation(
  balances: StockBalanceRow[],
  item: Item,
  location: StockLocation
) {
  const row = balances.find(
    (balance) =>
      balance.itemName === formatItemName(item) &&
      balance.locationName === location.name
  )

  return {
    count: (row?.unitCount ?? 0) + (row?.noBarcodeQuantity ?? 0),
    weightKg: roundWeight(
      (row?.totalWeightKg ?? 0) + (row?.noBarcodeWeightKg ?? 0)
    ),
  }
}
