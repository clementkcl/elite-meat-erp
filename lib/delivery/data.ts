import {
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  demoDeliveryItems,
  demoDeliveryOrders,
  demoDeliveryPayments,
  demoDeliveryStatusLogs,
  demoDriverLocations,
  demoDrivers,
  demoVehicles,
} from "@/lib/delivery/demo-data"
import {
  deliveryPaymentStatuses,
  deliveryPaymentTypes,
  deliverySourceTypes,
  deliveryStatuses,
  type DeliveryChartPoint,
  type DeliveryKpi,
  type DeliveryOrder,
  type DeliveryOrderItem,
  type DeliveryPageData,
  type DeliveryPayment,
  type DeliveryPaymentStatus,
  type DeliveryPaymentType,
  type DeliveryPerson,
  type DeliverySourceType,
  type DeliveryStatus,
  type DeliveryStatusLog,
  type DriverLocation,
  type Vehicle,
} from "@/lib/delivery/types"

function isDeliveryStatus(value: string): value is DeliveryStatus {
  return deliveryStatuses.includes(value as DeliveryStatus)
}

function normalizeDeliveryStatus(value: string): DeliveryStatus {
  if (isDeliveryStatus(value)) {
    return value
  }

  if (value === "DRAFT" || value === "ASSIGNED") {
    return "PENDING"
  }

  if (value === "LOADING") {
    return "OUT_FOR_DELIVERY"
  }

  return "PENDING"
}

function isPaymentType(value: string): value is DeliveryPaymentType {
  return deliveryPaymentTypes.includes(value as DeliveryPaymentType)
}

function isPaymentStatus(value: string): value is DeliveryPaymentStatus {
  return deliveryPaymentStatuses.includes(value as DeliveryPaymentStatus)
}

function isSourceType(value: string): value is DeliverySourceType {
  return deliverySourceTypes.includes(value as DeliverySourceType)
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

function findVehicle(vehicles: Vehicle[], id: string | null | undefined) {
  return vehicles.find((vehicle) => vehicle.id === id)
}

function findDriver(drivers: DeliveryPerson[], id: string | null | undefined) {
  return drivers.find((driver) => driver.id === id)
}

function findOrder(orders: DeliveryOrder[], id: string | null | undefined) {
  return orders.find((order) => order.id === id)
}

function mapDriver(row: Record<string, unknown>): DeliveryPerson {
  return {
    id: readString(row.id),
    fullName: readString(row.full_name, readString(row.email, "ERP User")),
    email: readString(row.email),
  }
}

function mapVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id: readString(row.id),
    vehicleNo: readString(row.vehicle_no),
    vehicleType: readString(row.vehicle_type, "LORRY"),
    capacityKg: readNumber(row.capacity_kg),
    active: readBoolean(row.is_active, true),
  }
}

function mapOrder(
  row: Record<string, unknown>,
  vehicles: Vehicle[],
  drivers: DeliveryPerson[],
  filePaths: Map<string, string>
): DeliveryOrder {
  const status = readString(row.status, "PENDING")
  const paymentType = readString(row.payment_type, "CASH")
  const paymentStatus = readString(row.payment_status, "PENDING")
  const sourceType = readString(row.source_type, "manual")
  const vehicleId = readNullableString(row.vehicle_id)
  const driverId = readNullableString(row.driver_id)
  const proofFileId = readNullableString(row.proof_file_id)

  return {
    id: readString(row.id),
    orderNo: readString(row.order_no),
    customerName: readString(row.customer_name),
    customerPhone: readString(row.customer_phone, "-"),
    customerLocation: readString(row.customer_location),
    deliveryAddress: readString(row.delivery_address),
    vehicleId,
    vehicleNo: findVehicle(vehicles, vehicleId)?.vehicleNo ?? "-",
    driverId,
    driverName: findDriver(drivers, driverId)?.fullName ?? "-",
    status: normalizeDeliveryStatus(status),
    paymentType: isPaymentType(paymentType) ? paymentType : "CASH",
    paymentStatus: isPaymentStatus(paymentStatus) ? paymentStatus : "PENDING",
    sourceType: isSourceType(sourceType) ? sourceType : "manual",
    sourceReference: readString(row.source_reference, "-"),
    retailSaleId: readNullableString(row.retail_sale_id),
    requestedDeliveryDate: readNullableString(row.requested_delivery_date),
    proofFileId,
    proofPath: proofFileId ? filePaths.get(proofFileId) ?? "-" : "-",
    failedReturnStatus: readString(row.failed_return_status, "NOT_REQUIRED"),
    failedReturnRequiredUnits: readNumber(row.failed_return_required_units),
    failedReturnCompletedUnits: readNumber(row.failed_return_completed_units),
    notes: readString(row.notes, ""),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapOrderItem(
  row: Record<string, unknown>,
  orders: DeliveryOrder[]
): DeliveryOrderItem {
  const orderId = readString(row.order_id)

  return {
    id: readString(row.id),
    orderId,
    orderNo: findOrder(orders, orderId)?.orderNo ?? "-",
    itemDescription: readString(row.item_description),
    quantity: readNumber(row.quantity),
    weightKg: readNumber(row.weight_kg),
    notes: readString(row.notes, ""),
  }
}

function mapStatusLog(
  row: Record<string, unknown>,
  orders: DeliveryOrder[]
): DeliveryStatusLog {
  const orderId = readString(row.order_id)
  const status = readString(row.status, "PENDING")

  return {
    id: readString(row.id),
    orderId,
    orderNo: findOrder(orders, orderId)?.orderNo ?? "-",
    status: normalizeDeliveryStatus(status),
    notes: readString(row.notes, ""),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapDriverLocation(
  row: Record<string, unknown>,
  orders: DeliveryOrder[],
  drivers: DeliveryPerson[]
): DriverLocation {
  const orderId = readNullableString(row.order_id)
  const driverId = readNullableString(row.driver_id)

  return {
    id: readString(row.id),
    orderId,
    orderNo: findOrder(orders, orderId)?.orderNo ?? "-",
    driverId,
    driverName: findDriver(drivers, driverId)?.fullName ?? "-",
    latitude: readNumber(row.latitude),
    longitude: readNumber(row.longitude),
    locationNote: readString(row.location_note, ""),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapPayment(
  row: Record<string, unknown>,
  orders: DeliveryOrder[]
): DeliveryPayment {
  const orderId = readString(row.order_id)
  const paymentType = readString(row.payment_type, "CASH")
  const paymentStatus = readString(row.payment_status, "PENDING")

  return {
    id: readString(row.id),
    orderId,
    orderNo: findOrder(orders, orderId)?.orderNo ?? "-",
    paymentType: isPaymentType(paymentType) ? paymentType : "CASH",
    paymentStatus: isPaymentStatus(paymentStatus) ? paymentStatus : "PENDING",
    amount: readNumber(row.amount),
    referenceNo: readString(row.reference_no, "-"),
    notes: readString(row.notes, ""),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function buildDashboard(
  orders: DeliveryOrder[],
  payments: DeliveryPayment[],
  vehicles: Vehicle[]
) {
  const activeOrders = orders.filter(
    (order) =>
      order.status !== "DELIVERED" &&
      order.status !== "FAILED" &&
      order.status !== "CANCELLED"
  )
  const deliveredToday = orders.filter(
    (order) =>
      order.status === "DELIVERED" &&
      order.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)
  )
  const cashCollected = payments
    .filter((payment) => payment.paymentStatus === "PAID")
    .reduce((sum, payment) => sum + payment.amount, 0)
  const pendingPayments = orders.filter(
    (order) => order.paymentStatus === "PENDING" || order.paymentStatus === "PARTIAL"
  )

  const kpis: DeliveryKpi[] = [
    {
      label: "Active orders",
      value: String(activeOrders.length),
      detail: "Pending, out for delivery, or failed",
    },
    {
      label: "Delivered today",
      value: String(deliveredToday.length),
      detail: "Orders marked delivered today",
    },
    {
      label: "Payment follow-up",
      value: String(pendingPayments.length),
      detail: "Pending or partial payment status",
    },
    {
      label: "Cash collected",
      value: `RM ${cashCollected.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}`,
      detail: "Paid delivery payment records",
    },
    {
      label: "Vehicles active",
      value: String(vehicles.filter((vehicle) => vehicle.active).length),
      detail: "Available delivery vehicles",
    },
  ]

  const statusMix: DeliveryChartPoint[] = deliveryStatuses.map((status) => ({
    name: status,
    value: orders.filter((order) => order.status === status).length,
  }))

  const paymentMix: DeliveryChartPoint[] = deliveryPaymentStatuses.map(
    (status) => ({
      name: status,
      value: orders.filter((order) => order.paymentStatus === status).length,
    })
  )

  return { kpis, statusMix, paymentMix }
}

export async function getDeliveryPageData(): Promise<DeliveryPageData> {
  const [
    profileRows,
    vehicleRows,
    orderRows,
    itemRows,
    statusRows,
    locationRows,
    paymentRows,
    fileRows,
  ] = await Promise.all([
    loadRows("profiles"),
    loadRows("vehicles"),
    loadRows("delivery_orders"),
    loadRows("delivery_order_items"),
    loadRows("delivery_status_logs"),
    loadRows("driver_locations"),
    loadRows("delivery_payments"),
    loadRows("files"),
  ])

  if (!profileRows) {
    return {
      demoMode: true,
      drivers: demoDrivers,
      vehicles: demoVehicles,
      orders: demoDeliveryOrders,
      items: demoDeliveryItems,
      statusLogs: demoDeliveryStatusLogs,
      driverLocations: demoDriverLocations,
      payments: demoDeliveryPayments,
      dashboard: buildDashboard(
        demoDeliveryOrders,
        demoDeliveryPayments,
        demoVehicles
      ),
    }
  }

  const drivers = profileRows.map(mapDriver)
  const vehicles = vehicleRows?.map(mapVehicle) ?? []
  const filePaths = new Map(
    (fileRows ?? [])
      .filter((row) => readString(row.module) === "delivery")
      .map((row) => [readString(row.id), readString(row.object_path)])
  )
  const orders = (orderRows ?? [])
    .map((row) => mapOrder(row, vehicles, drivers, filePaths))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const items = (itemRows ?? []).map((row) => mapOrderItem(row, orders))
  const statusLogs = (statusRows ?? [])
    .map((row) => mapStatusLog(row, orders))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const driverLocations = (locationRows ?? [])
    .map((row) => mapDriverLocation(row, orders, drivers))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const payments = (paymentRows ?? [])
    .map((row) => mapPayment(row, orders))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    demoMode: false,
    drivers,
    vehicles,
    orders,
    items,
    statusLogs,
    driverLocations,
    payments,
    dashboard: buildDashboard(orders, payments, vehicles),
  }
}
