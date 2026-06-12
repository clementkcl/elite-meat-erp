import {
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { isSupabaseConfigured } from "@/lib/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { demoItems } from "@/lib/stock/demo-data"
import {
  customerOrderFulfillments,
  customerOrderItemStatuses,
  customerOrderStatuses,
  orderReservationStatuses,
  orderNotificationEventTypes,
  type CustomerOrder,
  type CustomerOrderFulfillment,
  type CustomerOrderItem,
  type CustomerOrderItemStatus,
  type CustomerOrderStatus,
  type OrderNotificationEvent,
  type OrderNotificationEventType,
  type OrderReservationStatus,
  type OrderStockReservation,
  type OrdersPageData,
} from "@/lib/orders/types"

function isOrderStatus(value: string): value is CustomerOrderStatus {
  return customerOrderStatuses.includes(value as CustomerOrderStatus)
}

function isFulfillment(value: string): value is CustomerOrderFulfillment {
  return customerOrderFulfillments.includes(value as CustomerOrderFulfillment)
}

function isItemStatus(value: string): value is CustomerOrderItemStatus {
  return customerOrderItemStatuses.includes(value as CustomerOrderItemStatus)
}

function isEventType(value: string): value is OrderNotificationEventType {
  return orderNotificationEventTypes.includes(value as OrderNotificationEventType)
}

function isReservationStatus(value: string): value is OrderReservationStatus {
  return orderReservationStatuses.includes(value as OrderReservationStatus)
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

async function loadRows(table: string) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { rows: null, error: null }
  }

  const { data, error } = await supabase.from(table).select("*").limit(1000)

  if (error) {
    return { rows: [], error: error.message }
  }

  return { rows: asRecordArray(data), error: null }
}

function mapOrder(
  row: Record<string, unknown>,
  outlets: Record<string, unknown>[],
  departments: Record<string, unknown>[],
  profiles: Record<string, unknown>[],
  filePaths: Map<string, string>
): CustomerOrder {
  const status = readString(row.status, "NEW")
  const fulfillment = readString(row.fulfillment_type, "PICKUP")
  const outletId = readNullableString(row.outlet_id)
  const departmentId = readNullableString(row.department_id)
  const proofFileId = readNullableString(row.proof_file_id)

  return {
    id: readString(row.id),
    orderNo: readString(row.order_no),
    customerName: readString(row.customer_name),
    customerPhone: readString(row.customer_phone),
    orderDate: readString(row.order_date),
    requiredDate: readNullableString(row.required_date),
    fulfillmentType: isFulfillment(fulfillment) ? fulfillment : "PICKUP",
    deliveryRequired: readBoolean(row.delivery_required),
    status: isOrderStatus(status) ? status : "NEW",
    remarks: readString(row.remarks),
    outletId,
    outletName: findName(outlets, outletId),
    departmentId,
    departmentName: findName(departments, departmentId),
    createdByName: findProfileName(profiles, readNullableString(row.created_by)),
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
  profiles: Record<string, unknown>[]
): CustomerOrderItem {
  const itemId = readString(row.item_id)
  const status = readString(row.status, "REQUESTED")
  const orderId = readString(row.order_id)

  return {
    id: readString(row.id),
    orderId,
    orderNo: orders.find((order) => order.id === orderId)?.orderNo ?? "-",
    itemId,
    itemLabel: itemLabel(stockItems.find((item) => readString(item.id) === itemId)),
    requestedQuantity: readNumber(row.requested_quantity),
    requestedWeightKg: readNumber(row.requested_weight_kg),
    preparedQuantity: readNumber(row.prepared_quantity),
    preparedWeightKg: readNumber(row.prepared_weight_kg),
    preparedByName: findProfileName(profiles, readNullableString(row.prepared_by)),
    preparedAt: readNullableString(row.prepared_at),
    status: isItemStatus(status) ? status : "REQUESTED",
    notes: readString(row.notes),
  }
}

function mapNotification(
  row: Record<string, unknown>,
  orders: CustomerOrder[]
): OrderNotificationEvent {
  const orderId = readString(row.order_id)
  const eventType = readString(row.event_type, "READY_TO_PICKUP")

  return {
    id: readString(row.id),
    orderId,
    orderNo: orders.find((order) => order.id === orderId)?.orderNo ?? "-",
    eventType: isEventType(eventType) ? eventType : "READY_TO_PICKUP",
    channel: readString(row.channel, "WHATSAPP"),
    status: readString(row.status, "PENDING"),
    createdAt: readString(row.created_at, new Date().toISOString()),
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
  const status = readString(row.status, "ACTIVE")

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
    status: isReservationStatus(status) ? status : "ACTIVE",
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function demoData(): OrdersPageData {
  return {
    demoMode: true,
    orders: [
      {
        id: "order-demo-1",
        orderNo: "ORD-DEMO-001",
        customerName: "Demo Customer",
        customerPhone: "0123456789",
        orderDate: new Date().toISOString().slice(0, 10),
        requiredDate: new Date().toISOString().slice(0, 10),
        fulfillmentType: "DELIVERY",
        deliveryRequired: true,
        status: "READY_FOR_DELIVERY",
        remarks: "Demo order ready for delivery.",
        outletId: "outlet-demo",
        outletName: "Demo Outlet",
        departmentId: "department-demo",
        departmentName: "Retail",
        createdByName: "Demo Admin",
        proofFileId: null,
        proofPath: "-",
        failedReturnStatus: "NOT_REQUIRED",
        failedReturnRequiredUnits: 0,
        failedReturnCompletedUnits: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: "order-demo-cancelled",
        orderNo: "ORD-DEMO-002",
        customerName: "Cancelled Demo Customer",
        customerPhone: "0198765432",
        orderDate: new Date().toISOString().slice(0, 10),
        requiredDate: new Date().toISOString().slice(0, 10),
        fulfillmentType: "PICKUP",
        deliveryRequired: false,
        status: "CANCELLED",
        remarks: "Demo cancelled order with active reservation.",
        outletId: "outlet-demo",
        outletName: "Demo Outlet",
        departmentId: "department-demo",
        departmentName: "Retail",
        createdByName: "Demo Admin",
        proofFileId: null,
        proofPath: "-",
        failedReturnStatus: "NOT_REQUIRED",
        failedReturnRequiredUnits: 0,
        failedReturnCompletedUnits: 0,
        createdAt: new Date().toISOString(),
      },
    ],
    items: [
      {
        id: "order-item-demo-1",
        orderId: "order-demo-1",
        orderNo: "ORD-DEMO-001",
        itemId: demoItems[0]?.id ?? "demo-item",
        itemLabel: demoItems[0]
          ? `${demoItems[0].category} / ${demoItems[0].section} / ${demoItems[0].name}`
          : "Demo item",
        requestedQuantity: 2,
        requestedWeightKg: 8,
        preparedQuantity: 2,
        preparedWeightKg: 7.8,
        preparedByName: "Demo Admin",
        preparedAt: new Date().toISOString(),
        status: "PREPARED",
        notes: "Demo prepared weight.",
      },
      {
        id: "order-item-demo-cancelled",
        orderId: "order-demo-cancelled",
        orderNo: "ORD-DEMO-002",
        itemId: demoItems[1]?.id ?? "demo-item-2",
        itemLabel: demoItems[1]
          ? `${demoItems[1].category} / ${demoItems[1].section} / ${demoItems[1].name}`
          : "Demo item 2",
        requestedQuantity: 1,
        requestedWeightKg: 5,
        preparedQuantity: 1,
        preparedWeightKg: 5,
        preparedByName: "Demo Admin",
        preparedAt: new Date().toISOString(),
        status: "PREPARED",
        notes: "Demo cancelled reservation.",
      },
    ],
    reservations: [
      {
        id: "reservation-demo-cancelled",
        orderId: "order-demo-cancelled",
        orderNo: "ORD-DEMO-002",
        orderItemId: "order-item-demo-cancelled",
        itemId: demoItems[1]?.id ?? "demo-item-2",
        itemLabel: demoItems[1]
          ? `${demoItems[1].category} / ${demoItems[1].section} / ${demoItems[1].name}`
          : "Demo item 2",
        locationName: "Demo Freezer",
        reservedQuantity: 1,
        reservedWeightKg: 5,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      },
    ],
    notifications: [
      {
        id: "notification-demo-1",
        orderId: "order-demo-1",
        orderNo: "ORD-DEMO-001",
        eventType: "READY_TO_PICKUP",
        channel: "WHATSAPP",
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
    ],
    scopeOptions: {
      outlets: [{ id: "outlet-demo", name: "Demo Outlet" }],
      departments: [{ id: "department-demo", name: "Retail" }],
    },
    stockItems: demoItems.map((item) => ({
      id: item.id,
      label: `${item.itemCode} - ${item.category} / ${item.section} / ${item.name}`,
    })),
  }
}

export async function getOrdersPageData(): Promise<OrdersPageData> {
  const results = await Promise.all([
    loadRows("customer_orders"),
    loadRows("customer_order_items"),
    loadRows("order_stock_reservations"),
    loadRows("order_notification_events"),
    loadRows("items"),
    loadRows("stock_locations"),
    loadRows("outlets"),
    loadRows("departments"),
    loadRows("profiles"),
    loadRows("files"),
  ])
  const [
    orderResult,
    orderItemResult,
    reservationResult,
    notificationResult,
    stockItemResult,
    locationResult,
    outletResult,
    departmentResult,
    profileResult,
    fileResult,
  ] = results

  if (
    !isSupabaseConfigured() &&
    results.some((result) => result.rows === null)
  ) {
    return demoData()
  }

  const errors = results
    .map((result) => result.error)
    .filter((error): error is string => Boolean(error))

  if (errors.length > 0) {
    throw new Error(`Orders data could not load: ${errors.join("; ")}`)
  }

  const orderRows = orderResult.rows ?? []
  const orderItemRows = orderItemResult.rows ?? []
  const reservationRows = reservationResult.rows ?? []
  const notificationRows = notificationResult.rows ?? []
  const stockItemRows = stockItemResult.rows ?? []
  const locationRows = locationResult.rows ?? []
  const outletRows = outletResult.rows ?? []
  const departmentRows = departmentResult.rows ?? []
  const profileRows = profileResult.rows ?? []
  const fileRows = fileResult.rows ?? []

  const filePaths = new Map(
    fileRows
      .filter((row) => readString(row.module) === "orders")
      .map((row) => [readString(row.id), readString(row.object_path)])
  )
  const orders = orderRows
    .map((row) =>
      mapOrder(row, outletRows, departmentRows, profileRows, filePaths)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const items = orderItemRows.map((row) =>
    mapOrderItem(row, orders, stockItemRows, profileRows)
  )
  const reservations = reservationRows
    .map((row) => mapReservation(row, orders, stockItemRows, locationRows))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    demoMode: false,
    orders,
    items,
    reservations,
    notifications: notificationRows.map((row) => mapNotification(row, orders)),
    scopeOptions: {
      outlets: outletRows.map((row) => ({
        id: readString(row.id),
        name: readString(row.name),
      })),
      departments: departmentRows.map((row) => ({
        id: readString(row.id),
        name: readString(row.name),
      })),
    },
    stockItems: stockItemRows
      .filter((row) => readBoolean(row.is_active))
      .map((row) => ({
        id: readString(row.id),
        label: `${readString(row.item_code)} - ${itemLabel(row)}`,
      })),
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
    orderNotifications: data.notifications.filter(
      (event) => event.orderId === orderId
    ),
  }
}
