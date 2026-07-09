import {
  asRecord,
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { isSupabaseConfigured } from "@/lib/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { demoItems, demoLocations } from "@/lib/stock/demo-data"
import {
  customerOrderFulfillments,
  customerOrderItemStatuses,
  customerOrderStatuses,
  manualPickReasons,
  orderNotificationEventTypes,
  orderReservationStatuses,
  orderUnits,
  pickingEntryTypes,
  type CustomerOption,
  type CustomerOrder,
  type CustomerOrderFulfillment,
  type CustomerOrderItem,
  type CustomerOrderItemStatus,
  type CustomerOrderStatus,
  type ManualPickReason,
  type OrderBrandOption,
  type OrderAlert,
  type OrderDashboardKpi,
  type OrderFilters,
  type OrderLinkedDelivery,
  type OrderNotificationEvent,
  type OrderNotificationEventType,
  type OrderPickingEntry,
  type OrderReportRow,
  type OrderReservationStatus,
  type OrderStockReservation,
  type OrderUnit,
  type OrdersPageData,
  type PickingEntryType,
} from "@/lib/orders/types"

const readyStatuses = ["READY", "READY_FOR_PICKUP", "READY_FOR_DELIVERY"]
const pickToleranceKg = 10
const fallbackCustomization = {
  "Cut Style": ["Standard"],
  Thickness: ["Standard"],
  Packing: ["Standard"],
}

function isOrderStatus(value: string): value is CustomerOrderStatus {
  return customerOrderStatuses.includes(value as CustomerOrderStatus)
}

function isFulfillment(value: string): value is CustomerOrderFulfillment {
  return customerOrderFulfillments.includes(value as CustomerOrderFulfillment)
}

function isItemStatus(value: string): value is CustomerOrderItemStatus {
  return customerOrderItemStatuses.includes(value as CustomerOrderItemStatus)
}

function isReservationStatus(value: string): value is OrderReservationStatus {
  return orderReservationStatuses.includes(value as OrderReservationStatus)
}

function isOrderUnit(value: string): value is OrderUnit {
  return orderUnits.includes(value as OrderUnit)
}

function isEventType(value: string): value is OrderNotificationEventType {
  return orderNotificationEventTypes.includes(value as OrderNotificationEventType)
}

function isPickingEntryType(value: string): value is PickingEntryType {
  return pickingEntryTypes.includes(value as PickingEntryType)
}

function isManualPickReason(value: string): value is ManualPickReason {
  return manualPickReasons.includes(value as ManualPickReason)
}

function tableDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : ""
}

function roundWeight(value: number) {
  return Math.round(value * 1000) / 1000
}

function findName(
  rows: Record<string, unknown>[],
  id: string | null | undefined,
  fallback = "-"
) {
  const row = rows.find((candidate) => readString(candidate.id) === id)

  return readString(row?.name, fallback)
}

function findProfileName(rows: Record<string, unknown>[], id: string | null) {
  const row = rows.find((candidate) => readString(candidate.id) === id)

  return readString(row?.full_name, readString(row?.email, "-"))
}

function itemLabel(item: Record<string, unknown> | undefined) {
  if (!item) {
    return "Unknown item"
  }

  return `${readString(item.category)} / ${readString(item.section)} / ${readString(item.name)}`
}

function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => readString(entry)).filter(Boolean)
    : []
}

function readCustomization(value: unknown): Record<string, string[]> {
  const entries = Object.entries(asRecord(value))
    .map(([key, options]) => [key, readStringList(options)] as const)
    .filter(([key, options]) => key && options.length > 0)

  return Object.fromEntries(entries)
}

function itemCustomizationGroups(item: Record<string, unknown> | undefined) {
  const savedOptions = readCustomization(item?.order_customization_options)
  const options =
    Object.keys(savedOptions).length > 0 ? savedOptions : fallbackCustomization
  const defaults = readCustomization(item?.order_default_customization)

  return Object.entries(options).map(([name, choices]) => ({
    name,
    options: choices,
    defaultOptions: defaults[name]?.length
      ? defaults[name]
      : [choices[0]].filter(Boolean),
  }))
}

async function loadRows(table: string) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { rows: null, error: null }
  }

  const { data, error } = await supabase.from(table).select("*").limit(2000)

  if (error) {
    return { rows: [], error: error.message }
  }

  return { rows: asRecordArray(data), error: null }
}

async function loadOptionalRows(table: string) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase.from(table).select("*").limit(2000)

  if (error) {
    return []
  }

  return asRecordArray(data)
}

async function expireReservationsForDashboard() {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return
  }

  await supabase.rpc("expire_order_reservations_v1", {
    p_now: new Date().toISOString(),
  })
}

function displayStatus(
  status: CustomerOrder["status"],
  stockNotEnough = false,
  pickedUpAt: string | null = null
) {
  if (status === "CANCELLED") {
    return "CANCELLED"
  }

  if (status === "FAILED") {
    return "FAILED"
  }

  if (status === "OUT_FOR_DELIVERY") {
    return "OUT_FOR_DELIVERY"
  }

  if (status === "DELIVERED") {
    return pickedUpAt ? "PICKED_UP" : "DELIVERED"
  }

  if (readyStatuses.includes(status)) {
    return "READY"
  }

  if (status === "PREPARING") {
    return "PICKING"
  }

  if (stockNotEnough) {
    return "STOCK_NOT_ENOUGH"
  }

  if (status === "NEW") {
    return "CONFIRMED"
  }

  return status
}

function mapCustomer(
  row: Record<string, unknown>,
  categories: Record<string, unknown>[]
): CustomerOption {
  return {
    id: readString(row.id),
    name: readString(row.name),
    phone: readString(row.phone),
    address: readString(row.address),
    categoryName: findName(categories, readNullableString(row.category_id), "Retail"),
    creditTermDays: readNumber(row.credit_term_days),
    hasOverdueCredit: readBoolean(row.has_overdue_credit),
    remarks: readString(row.remarks),
  }
}

function mapOrder(
  row: Record<string, unknown>,
  outlets: Record<string, unknown>[],
  departments: Record<string, unknown>[],
  locations: Record<string, unknown>[],
  profiles: Record<string, unknown>[],
  filePaths: Map<string, string>
): CustomerOrder {
  const statusValue = readString(row.status, "NEW")
  const fulfillmentValue = readString(row.fulfillment_type, "PICKUP")
  const status = isOrderStatus(statusValue) ? statusValue : "NEW"
  const fulfillmentType = isFulfillment(fulfillmentValue)
    ? fulfillmentValue
    : "PICKUP"
  const outletId = readNullableString(row.outlet_id)
  const departmentId = readNullableString(row.department_id)
  const proofFileId = readNullableString(row.proof_file_id)
  const createdById = readNullableString(row.created_by)
  const stockNotEnough = readBoolean(row.stock_not_enough)
  const pickedUpAt = readNullableString(row.picked_up_at)

  return {
    id: readString(row.id),
    orderNo: readString(row.order_no),
    sourceType:
      readString(row.source_type, "manual_erp").toUpperCase() === "MANUAL_ERP"
        ? "MANUAL_ERP"
        : readString(row.source_type, "manual_erp").toUpperCase(),
    customerId: readNullableString(row.customer_id),
    customerName: readString(row.customer_name),
    customerPhone: readString(row.customer_phone),
    customerRemarks: readString(row.customer_remarks),
    orderDate: readString(row.order_date),
    requiredDate: readNullableString(row.required_date),
    requiredAt: readNullableString(row.required_at),
    fulfillmentType,
    deliveryRequired: readBoolean(row.delivery_required),
    status,
    displayStatus: displayStatus(status, stockNotEnough, pickedUpAt),
    totalOrderPrice: readNumber(row.total_order_price),
    remarks: readString(row.remarks),
    outletId,
    outletName: findName(outlets, outletId),
    departmentId,
    departmentName: findName(departments, departmentId),
    pickupLocationId: readNullableString(row.pickup_location_id),
    pickupLocationName: findName(locations, readNullableString(row.pickup_location_id)),
    fromLocationId: readNullableString(row.from_location_id),
    fromLocationName: findName(locations, readNullableString(row.from_location_id)),
    toLocationId: readNullableString(row.to_location_id),
    toLocationName: findName(locations, readNullableString(row.to_location_id)),
    deliveryAddress: readString(row.delivery_address),
    deliveryLatitude:
      row.delivery_latitude === null || row.delivery_latitude === undefined
        ? null
        : readNumber(row.delivery_latitude),
    deliveryLongitude:
      row.delivery_longitude === null || row.delivery_longitude === undefined
        ? null
        : readNumber(row.delivery_longitude),
    createdById,
    createdByName: findProfileName(profiles, createdById),
    stockNotEnough,
    reservationExpiresAt: readNullableString(row.reservation_expires_at),
    pickedUpAt,
    pickedUpByName: findProfileName(profiles, readNullableString(row.picked_up_by)),
    cancellationReason: readString(row.cancellation_reason),
    proofFileId,
    proofPath: proofFileId ? filePaths.get(proofFileId) ?? "-" : "-",
    failedReturnStatus: readString(row.failed_return_status, "NOT_REQUIRED"),
    failedReturnRequiredUnits: readNumber(row.failed_return_required_units),
    failedReturnCompletedUnits: readNumber(row.failed_return_completed_units),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapOrderItem(
  row: Record<string, unknown>,
  orders: CustomerOrder[],
  stockItems: Record<string, unknown>[],
  profiles: Record<string, unknown>[],
  brands: Record<string, unknown>[]
): CustomerOrderItem {
  const itemId = readString(row.item_id)
  const statusValue = readString(row.status, "REQUESTED")
  const unitValue = readString(row.ordering_unit, readString(row.order_unit, "KG"))
  const orderId = readString(row.order_id)
  const requestedWeightKg = readNumber(row.requested_weight_kg)
  const estimatedWeightKg = readNumber(row.estimated_weight_kg, requestedWeightKg)
  const preparedWeightKg = readNumber(row.prepared_weight_kg)
  const targetWeight = estimatedWeightKg || requestedWeightKg
  const item = stockItems.find((candidate) => readString(candidate.id) === itemId)

  return {
    id: readString(row.id),
    orderId,
    orderNo: orders.find((order) => order.id === orderId)?.orderNo ?? "-",
    itemId,
    itemLabel: itemLabel(item),
    category: readString(item?.category, "MEAT"),
    orderingUnit: isOrderUnit(unitValue) ? unitValue : "KG",
    requestedQuantity: readNumber(row.requested_quantity),
    requestedWeightKg,
    estimatedWeightKg,
    preparedQuantity: readNumber(row.prepared_quantity),
    preparedWeightKg,
    remainingWeightKg: roundWeight(Math.max(targetWeight - preparedWeightKg, 0)),
    withinTolerance:
      targetWeight <= 0 ||
      (preparedWeightKg > 0 &&
        Math.abs(preparedWeightKg - targetWeight) <= pickToleranceKg),
    processingRequired: readBoolean(row.processing_required),
    preferredBrandId: readNullableString(row.preferred_brand_id),
    preferredBrandName: findName(brands, readNullableString(row.preferred_brand_id), ""),
    customization: readCustomization(row.customization),
    stockNotEnough: readBoolean(row.stock_not_enough),
    preparedByName: findProfileName(profiles, readNullableString(row.prepared_by)),
    preparedAt: readNullableString(row.prepared_at),
    status: isItemStatus(statusValue) ? statusValue : "REQUESTED",
    notes: readString(row.notes),
    itemRequestRemarks: readString(row.item_request_remarks),
  }
}

function mapReservation(
  row: Record<string, unknown>,
  orders: CustomerOrder[],
  stockItems: Record<string, unknown>[],
  locations: Record<string, unknown>[]
): OrderStockReservation {
  const orderId = readString(row.order_id)
  const itemId = readString(row.item_id)
  const statusValue = readString(row.status, "ACTIVE")

  return {
    id: readString(row.id),
    orderId,
    orderNo: orders.find((order) => order.id === orderId)?.orderNo ?? "-",
    orderItemId: readNullableString(row.order_item_id),
    itemId,
    itemLabel: itemLabel(stockItems.find((item) => readString(item.id) === itemId)),
    locationName: findName(locations, readNullableString(row.location_id)),
    reservedQuantity: readNumber(row.reserved_quantity),
    reservedWeightKg: readNumber(row.reserved_weight_kg),
    status: isReservationStatus(statusValue) ? statusValue : "ACTIVE",
    stockNotEnough: readBoolean(row.stock_not_enough),
    expiresAt: readNullableString(row.expires_at),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapPickingEntry(
  row: Record<string, unknown>,
  orders: CustomerOrder[],
  items: CustomerOrderItem[],
  profiles: Record<string, unknown>[]
): OrderPickingEntry {
  const orderId = readString(row.order_id)
  const orderItemId = readNullableString(row.order_item_id)
  const entryTypeValue = readString(row.entry_type, "MANUAL_WEIGHT")
  const manualReason = readNullableString(row.manual_reason)

  return {
    id: readString(row.id),
    orderId,
    orderNo: orders.find((order) => order.id === orderId)?.orderNo ?? "-",
    orderItemId,
    itemLabel:
      items.find((item) => item.id === orderItemId)?.itemLabel ??
      items.find((item) => item.itemId === readString(row.item_id))?.itemLabel ??
      "Unknown item",
    barcode: readString(row.barcode, "-"),
    entryType: isPickingEntryType(entryTypeValue)
      ? entryTypeValue
      : "MANUAL_WEIGHT",
    pickedQuantity: readNumber(row.picked_quantity),
    pickedWeightKg: readNumber(row.picked_weight_kg),
    manualReason: manualReason && isManualPickReason(manualReason) ? manualReason : null,
    mismatchMessage: readString(row.mismatch_message),
    createdByName: findProfileName(profiles, readNullableString(row.created_by)),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapLinkedDeliveries(
  deliveryOrderRows: Record<string, unknown>[],
  deliveryRows: Record<string, unknown>[],
  proofRows: Record<string, unknown>[],
  profiles: Record<string, unknown>[]
): OrderLinkedDelivery[] {
  const deliveryById = new Map(
    deliveryRows.map((delivery) => [readString(delivery.id), delivery])
  )
  const proofCountByDeliveryId = proofRows.reduce((counts, proof) => {
    const deliveryId = readString(proof.delivery_id)

    if (deliveryId) {
      counts.set(deliveryId, (counts.get(deliveryId) ?? 0) + 1)
    }

    return counts
  }, new Map<string, number>())

  return deliveryOrderRows
    .map((link) => {
      const orderId = readString(link.source_customer_order_id)
      const deliveryId = readString(link.delivery_id)
      const delivery = deliveryById.get(deliveryId)

      if (!orderId || !deliveryId || !delivery) {
        return null
      }

      const proofCount = proofCountByDeliveryId.get(deliveryId) ?? 0
      const driverId = readNullableString(delivery.driver_id)

      return {
        id: readString(link.id),
        orderId,
        deliveryId,
        deliveryNo: readString(delivery.delivery_no, readString(link.order_no, "-")),
        status: readString(delivery.status, readString(link.status, "AVAILABLE")),
        driverId,
        driverName: findProfileName(profiles, driverId),
        proofStatus: proofCount > 0 ? "UPLOADED" : "NO_PROOF",
        proofCount,
        actionHref: "/delivery",
        createdAt: readString(delivery.created_at, readString(link.created_at)),
      } satisfies OrderLinkedDelivery
    })
    .filter((delivery): delivery is OrderLinkedDelivery => Boolean(delivery))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function mapNotification(
  row: Record<string, unknown>,
  orders: CustomerOrder[]
): OrderNotificationEvent {
  const orderId = readString(row.order_id)
  const eventType = readString(row.event_type, "READY_TO_PICKUP")
  const rawChannel = readString(row.channel, "IN_APP").toUpperCase()
  const channel = rawChannel === "WHATSAPP" ? "IN_APP" : rawChannel
  const rawStatus = readString(row.status, "SENT").toUpperCase()

  return {
    id: readString(row.id),
    orderId,
    orderNo: orders.find((order) => order.id === orderId)?.orderNo ?? "-",
    eventType: isEventType(eventType) ? eventType : "READY_TO_PICKUP",
    channel,
    status: channel === "IN_APP" && rawStatus === "SKIPPED" ? "SHOWN" : rawStatus,
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function brandOptions(
  stockItems: Record<string, unknown>[],
  brands: Record<string, unknown>[],
  stockUnits: Record<string, unknown>[],
  reservations: Record<string, unknown>[]
): OrderBrandOption[] {
  return stockItems.flatMap((item) => {
    const itemId = readString(item.id)

    return brands
      .filter((brand) => readBoolean(brand.is_active, true))
      .map((brand) => {
        const brandId = readString(brand.id)
        const physical = stockUnits
          .filter(
            (unit) =>
              readString(unit.item_id) === itemId &&
              readString(unit.brand_id) === brandId &&
              ["IN_STOCK", "RETURNED"].includes(readString(unit.status))
          )
          .reduce((sum, unit) => sum + readNumber(unit.net_weight_kg), 0)
        const reserved = reservations
          .filter(
            (reservation) =>
              readString(reservation.item_id) === itemId &&
              readString(reservation.status) === "ACTIVE" &&
              (!readString(reservation.preferred_brand_id) ||
                readString(reservation.preferred_brand_id) === brandId)
          )
          .reduce((sum, reservation) => sum + readNumber(reservation.reserved_weight_kg), 0)

        return {
          id: brandId,
          itemId,
          name: readString(brand.name),
          availableWeightKg: Math.max(physical - reserved, 0),
        }
      })
      .filter((brand) => brand.id && brand.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  })
}

function stockItemOptions(rows: Record<string, unknown>[]) {
  return rows
    .filter((row) => readBoolean(row.is_active, true))
    .map((row) => {
      const orderUnit = readString(row.order_unit, "KG")

      return {
        id: readString(row.id),
        itemCode: readString(row.item_code),
        category: readString(row.category),
        section: readString(row.section),
        name: readString(row.name),
        label: `${readString(row.item_code)} - ${itemLabel(row)}`,
        orderUnit: isOrderUnit(orderUnit) ? orderUnit : "KG",
        requiresEstimatedKg: readBoolean(row.order_requires_estimated_kg, true),
        processingRequiredDefault: readBoolean(row.processing_required_default),
        customizationGroups: itemCustomizationGroups(row),
      }
    })
}

function filterOrders(orders: CustomerOrder[], filters: OrderFilters) {
  const date = filters.date?.trim()
  const outlet = filters.outlet?.trim()
  const status = filters.status?.trim().toUpperCase()
  const customer = filters.customer?.trim().toLowerCase()
  const salesperson = filters.salesperson?.trim()

  return orders.filter((order) => {
    const matchesDate = !date || order.orderDate === date || tableDate(order.requiredAt) === date
    const matchesOutlet = !outlet || order.outletId === outlet
    const matchesStatus =
      !status ||
      order.status === status ||
      order.displayStatus.toUpperCase() === status ||
      (status === "READY" && readyStatuses.includes(order.status)) ||
      (status === "COMPLETED" &&
        (order.displayStatus === "DELIVERED" ||
          order.displayStatus === "PICKED_UP"))
    const matchesCustomer =
      !customer ||
      order.customerName.toLowerCase().includes(customer) ||
      order.customerPhone.toLowerCase().includes(customer)
    const matchesSalesperson = !salesperson || order.createdById === salesperson

    return (
      matchesDate &&
      matchesOutlet &&
      matchesStatus &&
      matchesCustomer &&
      matchesSalesperson
    )
  })
}

function buildReports(
  orders: CustomerOrder[],
  items: CustomerOrderItem[],
  linkedDeliveries: OrderLinkedDelivery[] = []
): OrderReportRow[] {
  const byCustomer = new Map<string, OrderReportRow>()
  const byStatus = new Map<string, OrderReportRow>()
  const byStaff = new Map<string, OrderReportRow>()
  const byItem = new Map<string, OrderReportRow>()
  const pendingReadyFailed = new Map<string, OrderReportRow>()
  const deliveryPerformance = new Map<string, OrderReportRow>()
  const orderById = new Map(orders.map((order) => [order.id, order]))
  const weightByOrderId = new Map<string, number>()

  items.forEach((item) => {
    const current = weightByOrderId.get(item.orderId) ?? 0

    weightByOrderId.set(
      item.orderId,
      current + (item.estimatedWeightKg || item.requestedWeightKg)
    )
  })

  orders.forEach((order) => {
    const customerKey = order.customerName || "Walk-in"
    const customerRow =
      byCustomer.get(customerKey) ??
      ({
        id: `customer-${customerKey}`,
        reportName: "Orders by customer",
        primary: customerKey,
        secondary: order.customerPhone || "-",
        count: 0,
        weightKg: 0,
        totalPrice: 0,
      } satisfies OrderReportRow)
    customerRow.count += 1
    customerRow.totalPrice += order.totalOrderPrice
    byCustomer.set(customerKey, customerRow)

    const statusRow =
      byStatus.get(order.displayStatus) ??
      ({
        id: `status-${order.displayStatus}`,
        reportName: "Orders by status",
        primary: order.displayStatus,
        secondary: "Current workflow status",
        count: 0,
        weightKg: 0,
        totalPrice: 0,
      } satisfies OrderReportRow)
    statusRow.count += 1
    statusRow.totalPrice += order.totalOrderPrice
    byStatus.set(order.displayStatus, statusRow)

    const staffRow =
      byStaff.get(order.createdByName) ??
      ({
        id: `staff-${order.createdByName}`,
        reportName: "Orders by salesperson/staff",
        primary: order.createdByName,
        secondary: order.outletName,
        count: 0,
        weightKg: 0,
        totalPrice: 0,
      } satisfies OrderReportRow)
    staffRow.count += 1
    staffRow.totalPrice += order.totalOrderPrice
    byStaff.set(order.createdByName, staffRow)

    const workflowBucket =
      order.displayStatus === "READY"
        ? "Ready"
        : order.displayStatus === "FAILED"
          ? "Failed"
          : ["CONFIRMED", "STOCK_NOT_ENOUGH", "PICKING"].includes(
                order.displayStatus
              )
            ? "Pending"
            : null

    if (workflowBucket) {
      const workflowRow =
        pendingReadyFailed.get(workflowBucket) ??
        ({
          id: `workflow-${workflowBucket.toLowerCase()}`,
          reportName: "Pending/ready/failed orders",
          primary: workflowBucket,
          secondary: "Operational order queue",
          count: 0,
          weightKg: 0,
          totalPrice: 0,
        } satisfies OrderReportRow)

      workflowRow.count += 1
      workflowRow.weightKg += weightByOrderId.get(order.id) ?? 0
      workflowRow.totalPrice += order.totalOrderPrice
      pendingReadyFailed.set(workflowBucket, workflowRow)
    }
  })

  items.forEach((item) => {
    const itemRow =
      byItem.get(item.itemLabel) ??
      ({
        id: `item-${item.itemId}`,
        reportName: "Orders by item",
        primary: item.itemLabel,
        secondary: item.category,
        count: 0,
        weightKg: 0,
        totalPrice: 0,
      } satisfies OrderReportRow)
    itemRow.count += 1
    itemRow.weightKg += item.estimatedWeightKg || item.requestedWeightKg
    byItem.set(item.itemLabel, itemRow)
  })

  linkedDeliveries.forEach((delivery) => {
    const order = orderById.get(delivery.orderId)
    const status = delivery.status.replaceAll("_", " ")
    const performanceRow =
      deliveryPerformance.get(status) ??
      ({
        id: `delivery-performance-${status.toLowerCase().replaceAll(" ", "-")}`,
        reportName: "Delivery performance",
        primary: status,
        secondary: "Orders handed to Delivery Module",
        count: 0,
        weightKg: 0,
        totalPrice: 0,
      } satisfies OrderReportRow)

    performanceRow.count += 1
    performanceRow.weightKg += weightByOrderId.get(delivery.orderId) ?? 0
    performanceRow.totalPrice += order?.totalOrderPrice ?? 0
    deliveryPerformance.set(status, performanceRow)
  })

  return [
    ...byCustomer.values(),
    ...byItem.values(),
    ...byStaff.values(),
    ...pendingReadyFailed.values(),
    ...byStatus.values(),
    ...deliveryPerformance.values(),
  ].map((row) => ({
    ...row,
    weightKg: roundWeight(row.weightKg),
    totalPrice: Math.round(row.totalPrice * 100) / 100,
  }))
}

function buildDashboard(
  orders: CustomerOrder[],
  items: CustomerOrderItem[],
  customers: CustomerOption[],
  linkedDeliveries: OrderLinkedDelivery[] = []
) {
  const today = tableDate(new Date().toISOString())
  const todayOrders = orders.filter((order) => order.orderDate === today)
  const pendingConfirmedOrders = orders.filter(
    (order) => order.displayStatus === "CONFIRMED"
  )
  const readyOrders = orders.filter((order) => readyStatuses.includes(order.status))
  const stockNotEnough = orders.filter((order) => order.stockNotEnough)
  const pickingOrders = orders.filter((order) => order.displayStatus === "PICKING")
  const outForDelivery = orders.filter(
    (order) => order.displayStatus === "OUT_FOR_DELIVERY"
  )
  const failedOrders = orders.filter((order) => order.displayStatus === "FAILED")
  const completedOrders = orders.filter(
    (order) =>
      order.displayStatus === "DELIVERED" || order.displayStatus === "PICKED_UP"
  )
  const processingOverdue = items.filter((item) => {
    if (!item.processingRequired || item.preparedWeightKg > 0) {
      return false
    }

    const order = orders.find((candidate) => candidate.id === item.orderId)
    const due = tableDate(order?.requiredAt ?? order?.requiredDate)

    return Boolean(due && due < today)
  })
  const deliveryFailed = orders.filter((order) => order.status === "FAILED")
  const creditOverdue = customers.filter((customer) => customer.hasOverdueCredit)
  const orderReady = orders.filter((order) => readyStatuses.includes(order.status))
  const kpis: OrderDashboardKpi[] = [
    {
      label: "Today Orders",
      value: String(todayOrders.length),
      detail: "Order date is today",
    },
    {
      label: "Pending/Confirmed Orders",
      value: String(pendingConfirmedOrders.length),
      detail: "Confirmed and not picked yet",
    },
    {
      label: "Stock Not Enough",
      value: String(stockNotEnough.length),
      detail: "Created and visible to picking",
    },
    {
      label: "Picking",
      value: String(pickingOrders.length),
      detail: "Picking has started",
    },
    {
      label: "Ready",
      value: String(readyOrders.length),
      detail: "Pickup or delivery next",
    },
    {
      label: "Out for Delivery",
      value: String(outForDelivery.length),
      detail: "Driver has taken over",
    },
    {
      label: "Failed",
      value: String(failedOrders.length),
      detail: "Needs delivery or return follow-up",
    },
    {
      label: "Completed/Picked Up",
      value: String(completedOrders.length),
      detail: "Delivered or picked up",
    },
  ]

  const alerts: OrderAlert[] = [
    ...stockNotEnough.slice(0, 8).map((order) => ({
      id: `stock-${order.id}`,
      label: "Stock not enough",
      detail: `${order.orderNo} - ${order.customerName}`,
      tone: "danger" as const,
      href: `/orders/${order.id}`,
    })),
    ...processingOverdue.slice(0, 8).map((item) => ({
      id: `processing-${item.id}`,
      label: "Processing overdue",
      detail: `${item.orderNo} - ${item.itemLabel}`,
      tone: "warning" as const,
      href: `/orders/${item.orderId}`,
    })),
    ...orderReady.slice(0, 8).map((order) => ({
      id: `ready-${order.id}`,
      label: "Order ready",
      detail:
        order.fulfillmentType === "DELIVERY"
          ? `${order.orderNo} is ready for delivery`
          : `${order.orderNo} is ready for pickup or transfer`,
      tone: "success" as const,
      href: `/orders/${order.id}`,
    })),
    ...deliveryFailed.slice(0, 8).map((order) => ({
      id: `failed-${order.id}`,
      label: "Delivery failed",
      detail: `${order.orderNo} needs return follow-up`,
      tone: "danger" as const,
      href: `/orders/${order.id}`,
    })),
    ...creditOverdue.slice(0, 8).map((customer) => ({
      id: `credit-${customer.id}`,
      label: "Credit overdue",
      detail: `${customer.name} has overdue credit`,
      tone: "warning" as const,
    })),
  ]

  return {
    kpis,
    alerts,
    reports: buildReports(orders, items, linkedDeliveries),
  }
}

function demoData(filters: OrderFilters): OrdersPageData {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const requiredAt = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString()
  const customers: CustomerOption[] = [
    {
      id: "customer-demo",
      name: "Demo Customer",
      phone: "0123456789",
      address: "Demo delivery address",
      categoryName: "Retail",
      creditTermDays: 0,
      hasOverdueCredit: false,
      remarks: "Call before delivery.",
    },
    {
      id: "customer-credit",
      name: "Wholesale Credit Demo",
      phone: "0198765432",
      address: "Wholesale demo address",
      categoryName: "Wholesale",
      creditTermDays: 14,
      hasOverdueCredit: true,
      remarks: "Call receiver before pickup.",
    },
  ]
  const orders: CustomerOrder[] = [
    {
      id: "order-demo-1",
      orderNo: "ORD-2026062310001",
      sourceType: "MANUAL_ERP",
      customerId: "customer-demo",
      customerName: "Demo Customer",
      customerPhone: "0123456789",
      customerRemarks: "Call before delivery.",
      orderDate: today,
      requiredDate: today,
      requiredAt,
      fulfillmentType: "DELIVERY",
      deliveryRequired: true,
      status: "NEW",
      displayStatus: "CONFIRMED",
      totalOrderPrice: 388,
      remarks: "Manual ERP demo order.",
      outletId: "outlet-demo",
      outletName: "Demo Outlet",
      departmentId: "department-demo",
      departmentName: "Retail",
      pickupLocationId: demoLocations[0]?.id ?? null,
      pickupLocationName: demoLocations[0]?.name ?? "Demo Freezer",
      fromLocationId: null,
      fromLocationName: "-",
      toLocationId: null,
      toLocationName: "-",
      deliveryAddress: "Demo delivery address",
      deliveryLatitude: null,
      deliveryLongitude: null,
      createdById: "demo-user",
      createdByName: "Demo Admin",
      stockNotEnough: false,
      reservationExpiresAt: `${today}T23:59:59.000Z`,
      pickedUpAt: null,
      pickedUpByName: "-",
      cancellationReason: "",
      proofFileId: null,
      proofPath: "-",
      failedReturnStatus: "NOT_REQUIRED",
      failedReturnRequiredUnits: 0,
      failedReturnCompletedUnits: 0,
      createdAt: now.toISOString(),
    },
    {
      id: "order-demo-short",
      orderNo: "ORD-2026062310002",
      sourceType: "MANUAL_ERP",
      customerId: "customer-credit",
      customerName: "Wholesale Credit Demo",
      customerPhone: "0198765432",
      customerRemarks: "Call receiver before pickup.",
      orderDate: today,
      requiredDate: today,
      requiredAt,
      fulfillmentType: "PICKUP",
      deliveryRequired: false,
      status: "PREPARING",
      displayStatus: "PREPARING",
      totalOrderPrice: 528,
      remarks: "Stock shortage visible to picker.",
      outletId: "outlet-demo",
      outletName: "Demo Outlet",
      departmentId: "department-demo",
      departmentName: "Retail",
      pickupLocationId: demoLocations[0]?.id ?? null,
      pickupLocationName: demoLocations[0]?.name ?? "Demo Freezer",
      fromLocationId: null,
      fromLocationName: "-",
      toLocationId: null,
      toLocationName: "-",
      deliveryAddress: "",
      deliveryLatitude: null,
      deliveryLongitude: null,
      createdById: "demo-user",
      createdByName: "Demo Admin",
      stockNotEnough: true,
      reservationExpiresAt: `${today}T23:59:59.000Z`,
      pickedUpAt: null,
      pickedUpByName: "-",
      cancellationReason: "",
      proofFileId: null,
      proofPath: "-",
      failedReturnStatus: "NOT_REQUIRED",
      failedReturnRequiredUnits: 0,
      failedReturnCompletedUnits: 0,
      createdAt: now.toISOString(),
    },
  ]
  const items: CustomerOrderItem[] = [
    {
      id: "item-demo-1",
      orderId: "order-demo-1",
      orderNo: "ORD-2026062310001",
      itemId: demoItems[0]?.id ?? "demo-item",
      itemLabel: demoItems[0]
        ? `${demoItems[0].category} / ${demoItems[0].section} / ${demoItems[0].name}`
        : "Demo item",
      category: demoItems[0]?.category ?? "MEAT",
      orderingUnit: "KG",
      requestedQuantity: 0,
      requestedWeightKg: 20,
      estimatedWeightKg: 20,
      preparedQuantity: 0,
      preparedWeightKg: 0,
      remainingWeightKg: 20,
      withinTolerance: false,
      processingRequired: false,
      preferredBrandId: null,
      preferredBrandName: "",
      customization: {},
      stockNotEnough: false,
      preparedByName: "-",
      preparedAt: null,
      status: "REQUESTED",
      notes: "",
      itemRequestRemarks: "Slice request kept in remarks only.",
    },
    {
      id: "item-demo-short",
      orderId: "order-demo-short",
      orderNo: "ORD-2026062310002",
      itemId: demoItems[1]?.id ?? "demo-item-2",
      itemLabel: demoItems[1]
        ? `${demoItems[1].category} / ${demoItems[1].section} / ${demoItems[1].name}`
        : "Demo item 2",
      category: demoItems[1]?.category ?? "MEAT",
      orderingUnit: "CARTON",
      requestedQuantity: 4,
      requestedWeightKg: 60,
      estimatedWeightKg: 60,
      preparedQuantity: 1,
      preparedWeightKg: 12,
      remainingWeightKg: 48,
      withinTolerance: false,
      processingRequired: true,
      preferredBrandId: null,
      preferredBrandName: "",
      customization: {},
      stockNotEnough: true,
      preparedByName: "Demo Admin",
      preparedAt: now.toISOString(),
      status: "PREPARING",
      notes: "Manual weight entered.",
      itemRequestRemarks: "Processing required.",
    },
  ]
  const filteredOrders = filterOrders(orders, filters)
  const linkedDeliveries = ([
    {
      id: "delivery-link-demo",
      orderId: "order-demo-1",
      deliveryId: "delivery-demo-1",
      deliveryNo: "DL-20260623-DEMO",
      status: "AVAILABLE",
      driverId: null,
      driverName: "-",
      proofStatus: "NO_PROOF",
      proofCount: 0,
      actionHref: "/delivery",
      createdAt: now.toISOString(),
    },
  ] satisfies OrderLinkedDelivery[]).filter((delivery) =>
    filteredOrders.some((order) => order.id === delivery.orderId)
  )

  return {
    demoMode: true,
    orders: filteredOrders,
    items: items.filter((item) =>
      filteredOrders.some((order) => order.id === item.orderId)
    ),
    reservations: filteredOrders.map((order) => ({
      id: `reservation-${order.id}`,
      orderId: order.id,
      orderNo: order.orderNo,
      orderItemId: items.find((item) => item.orderId === order.id)?.id ?? null,
      itemId: items.find((item) => item.orderId === order.id)?.itemId ?? "demo-item",
      itemLabel:
        items.find((item) => item.orderId === order.id)?.itemLabel ??
        "Demo item",
      locationName: order.pickupLocationName,
      reservedQuantity: 1,
      reservedWeightKg:
        items.find((item) => item.orderId === order.id)?.estimatedWeightKg ?? 0,
      status: "ACTIVE",
      stockNotEnough: order.stockNotEnough,
      expiresAt: order.reservationExpiresAt,
      createdAt: order.createdAt,
    })),
    pickingEntries: [
      {
        id: "pick-demo",
        orderId: "order-demo-short",
        orderNo: "ORD-2026062310002",
        orderItemId: "item-demo-short",
        itemLabel: items[1]?.itemLabel ?? "Demo item",
        barcode: "-",
        entryType: "MANUAL_WEIGHT",
        pickedQuantity: 1,
        pickedWeightKg: 12,
        manualReason: "LOOSE_ITEM",
        mismatchMessage: "",
        createdByName: "Demo Admin",
        createdAt: now.toISOString(),
      },
    ],
    notifications: [],
    linkedDeliveries,
    customers,
    scopeOptions: {
      outlets: [{ id: "outlet-demo", name: "Demo Outlet" }],
      departments: [{ id: "department-demo", name: "Retail" }],
      stockLocations: demoLocations.map((location) => ({
        id: location.id,
        name: location.name,
        outletId: location.outletId ?? null,
      })),
      salespeople: [{ id: "demo-user", name: "Demo Admin" }],
    },
    stockItems: demoItems.map((item) => ({
      id: item.id,
      itemCode: item.itemCode,
      category: item.category,
      section: item.section,
      name: item.name,
      label: `${item.itemCode} - ${item.category} / ${item.section} / ${item.name}`,
      orderUnit: item.category === "PROCESSED" ? "PACKET" : "KG",
      requiresEstimatedKg: true,
      processingRequiredDefault: item.category === "PROCESSED",
      customizationGroups: itemCustomizationGroups({}),
    })),
    brandOptions: demoItems.flatMap((item) => [
      { id: "brand-demo-tican", itemId: item.id, name: "TICAN", availableWeightKg: 250 },
      { id: "brand-demo-other", itemId: item.id, name: "Other", availableWeightKg: 0 },
    ]),
    dashboard: buildDashboard(filteredOrders, items, customers, linkedDeliveries),
  }
}

export async function getOrdersPageData(
  filters: OrderFilters = {}
): Promise<OrdersPageData> {
  await expireReservationsForDashboard()

  const results = await Promise.all([
    loadRows("customer_orders"),
    loadRows("customer_order_items"),
    loadRows("order_stock_reservations"),
    loadRows("order_picking_entries"),
    loadRows("order_notification_events"),
    loadRows("items"),
    loadRows("stock_locations"),
    loadRows("outlets"),
    loadRows("departments"),
    loadRows("profiles"),
    loadRows("customers"),
    loadRows("customer_categories"),
    loadRows("brands"),
    loadRows("stock_units"),
  ])

  if (
    !isSupabaseConfigured() &&
    results.some((result) => result.rows === null)
  ) {
    return demoData(filters)
  }

  const errors = results
    .map((result) => result.error)
    .filter((error): error is string => Boolean(error))

  if (errors.length > 0) {
    throw new Error(`Orders data could not load: ${errors.join("; ")}`)
  }

  const [
    orderRows,
    orderItemRows,
    reservationRows,
    pickingRows,
    notificationRows,
    stockItemRows,
    locationRows,
    outletRows,
    departmentRows,
    profileRows,
    customerRows,
    customerCategoryRows,
    brandRows,
    stockUnitRows,
  ] = results.map((result) => result.rows ?? [])

  const customers = customerRows
    .filter((row) => readBoolean(row.is_active, true))
    .map((row) => mapCustomer(row, customerCategoryRows))
    .sort((a, b) => a.name.localeCompare(b.name))
  const filePaths = new Map<string, string>()
  const orders = filterOrders(
    orderRows
      .map((row) =>
        mapOrder(row, outletRows, departmentRows, locationRows, profileRows, filePaths)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    filters
  )
  const items = orderItemRows
    .map((row) => mapOrderItem(row, orders, stockItemRows, profileRows, brandRows))
    .filter((item) => orders.some((order) => order.id === item.orderId))
  const reservations = reservationRows
    .map((row) => mapReservation(row, orders, stockItemRows, locationRows))
    .filter((reservation) =>
      orders.some((order) => order.id === reservation.orderId)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pickingEntries = pickingRows
    .map((row) => mapPickingEntry(row, orders, items, profileRows))
    .filter((entry) => orders.some((order) => order.id === entry.orderId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const [deliveryOrderRows, deliveryRows, deliveryProofRows] = await Promise.all([
    loadOptionalRows("delivery_orders"),
    loadOptionalRows("deliveries"),
    loadOptionalRows("delivery_proofs"),
  ])
  const linkedDeliveries = mapLinkedDeliveries(
    deliveryOrderRows,
    deliveryRows,
    deliveryProofRows,
    profileRows
  ).filter((delivery) =>
    orders.some((order) => order.id === delivery.orderId)
  )

  return {
    demoMode: false,
    orders,
    items,
    reservations,
    pickingEntries,
    notifications: notificationRows
      .map((row) => mapNotification(row, orders))
      .filter((event) => orders.some((order) => order.id === event.orderId)),
    linkedDeliveries,
    customers,
    scopeOptions: {
      outlets: outletRows.map((row) => ({
        id: readString(row.id),
        name: readString(row.name),
      })),
      departments: departmentRows.map((row) => ({
        id: readString(row.id),
        name: readString(row.name),
      })),
      stockLocations: locationRows
        .filter((row) => readBoolean(row.is_active, true))
        .map((row) => ({
          id: readString(row.id),
          name: readString(row.name),
          outletId: readNullableString(row.outlet_id),
        })),
      salespeople: profileRows.map((row) => ({
        id: readString(row.id),
        name: readString(row.full_name, readString(row.email, "Staff")),
      })),
    },
    stockItems: stockItemOptions(stockItemRows),
    brandOptions: brandOptions(stockItemRows, brandRows, stockUnitRows, reservationRows),
    dashboard: buildDashboard(orders, items, customers, linkedDeliveries),
  }
}

export async function getOrderDetailData(orderId: string) {
  const data = await getOrdersPageData()

  return {
    ...data,
    order: data.orders.find((order) => order.id === orderId) ?? null,
    orderItems: data.items.filter((item) => item.orderId === orderId),
    orderReservations: data.reservations.filter(
      (reservation) => reservation.orderId === orderId
    ),
    orderPickingEntries: data.pickingEntries.filter(
      (entry) => entry.orderId === orderId
    ),
    orderNotifications: data.notifications.filter(
      (event) => event.orderId === orderId
    ),
  }
}
