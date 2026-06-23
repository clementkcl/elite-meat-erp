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
  demoDeliveryAddressSuggestions,
  demoDeliveryExpenses,
  demoDeliveryJobs,
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
  type DeliveryAddressSuggestion,
  type DeliveryExpense,
  type DeliveryExpenseStatus,
  type DeliveryExpenseType,
  type DeliveryJob,
  type DeliveryJobStatus,
  type DeliveryJobType,
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
  deliveryExpenseStatuses,
  deliveryExpenseTypes,
  deliveryJobStatuses,
  deliveryJobTypes,
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

function isDeliveryJobStatus(value: string): value is DeliveryJobStatus {
  return deliveryJobStatuses.includes(value as DeliveryJobStatus)
}

function isDeliveryJobType(value: string): value is DeliveryJobType {
  return deliveryJobTypes.includes(value as DeliveryJobType)
}

function isDeliveryExpenseType(value: string): value is DeliveryExpenseType {
  return deliveryExpenseTypes.includes(value as DeliveryExpenseType)
}

function isDeliveryExpenseStatus(value: string): value is DeliveryExpenseStatus {
  return deliveryExpenseStatuses.includes(value as DeliveryExpenseStatus)
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

function readNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  return readNumber(value)
}

function findNameById(
  rows: Record<string, unknown>[],
  id: string | null | undefined,
  fallback = "-"
) {
  const row = rows.find((candidate) => readString(candidate.id) === id)

  return readString(row?.name, fallback)
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

function mapJob(
  row: Record<string, unknown>,
  vehicles: Vehicle[],
  drivers: DeliveryPerson[],
  filePaths: Map<string, string>,
  outlets: Record<string, unknown>[],
  orderNos: string[]
): DeliveryJob {
  const status = readString(row.status, "AVAILABLE")
  const jobType = readString(row.job_type, "CUSTOMER_DELIVERY")
  const vehicleId = readNullableString(row.vehicle_id)
  const driverId = readNullableString(row.driver_id)
  const proofFileId = readNullableString(row.proof_file_id)
  const outletId = readNullableString(row.outlet_id)

  return {
    id: readString(row.id),
    jobNo: readString(row.job_no),
    jobType: isDeliveryJobType(jobType) ? jobType : "CUSTOMER_DELIVERY",
    status: isDeliveryJobStatus(status) ? status : "AVAILABLE",
    customerName: readString(row.customer_name, "Customer"),
    customerPhone: readString(row.customer_phone, ""),
    deliveryAddress: readString(row.delivery_address, ""),
    deliveryNote: readString(row.delivery_note, ""),
    outletId,
    outletName: findNameById(outlets, outletId),
    deliveryTeamId: readNullableString(row.delivery_team_id),
    driverId,
    driverName: findDriver(drivers, driverId)?.fullName ?? "-",
    vehicleId,
    vehicleNo: findVehicle(vehicles, vehicleId)?.vehicleNo ?? "-",
    requestedDeliveryDate: readNullableString(row.requested_delivery_date),
    totalWeightKg: readNumber(row.total_weight_kg),
    itemCount: readNumber(row.item_count),
    orderCount: readNumber(row.order_count, orderNos.length),
    orderNos,
    proofFileId,
    proofPath: proofFileId ? filePaths.get(proofFileId) ?? "-" : "-",
    failedReason: readString(row.failed_reason),
    goodsIssueReason: readString(row.goods_issue_reason),
    gpsAvailable:
      typeof row.gps_available === "boolean" ? row.gps_available : null,
    proofLatitude: readNullableNumber(row.proof_latitude),
    proofLongitude: readNullableNumber(row.proof_longitude),
    acceptedAt: readNullableString(row.accepted_at),
    loadedAt: readNullableString(row.loaded_at),
    startedAt: readNullableString(row.started_at),
    completedAt: readNullableString(row.completed_at),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapExpense(
  row: Record<string, unknown>,
  vehicles: Vehicle[],
  drivers: DeliveryPerson[],
  filePaths: Map<string, string>
): DeliveryExpense {
  const expenseType = readString(row.expense_type, "OTHER")
  const status = readString(row.status, "PENDING")
  const driverId = readNullableString(row.driver_id)
  const vehicleId = readNullableString(row.vehicle_id)
  const receiptFileId = readNullableString(row.receipt_file_id)

  return {
    id: readString(row.id),
    deliveryId: readNullableString(row.delivery_id),
    driverId,
    driverName: findDriver(drivers, driverId)?.fullName ?? "-",
    outletId: readNullableString(row.outlet_id),
    deliveryTeamId: readNullableString(row.delivery_team_id),
    vehicleId,
    vehicleNo: findVehicle(vehicles, vehicleId)?.vehicleNo ?? "-",
    expenseType: isDeliveryExpenseType(expenseType) ? expenseType : "OTHER",
    amount: readNumber(row.amount),
    receiptFileId,
    bucketId: readString(row.bucket_id, "delivery-expenses"),
    receiptPath: receiptFileId ? filePaths.get(receiptFileId) ?? "-" : "-",
    receiptUrl: "",
    status: isDeliveryExpenseStatus(status) ? status : "PENDING",
    remark: readString(row.remark),
    reviewNote: readString(row.review_note),
    rejectedReason: readString(row.rejected_reason),
    reviewedById: readNullableString(row.reviewed_by),
    reviewedAt: readNullableString(row.reviewed_at),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapAddressSuggestion(
  row: Record<string, unknown>
): DeliveryAddressSuggestion {
  const status = readString(row.status, "PENDING")

  return {
    id: readString(row.id),
    jobId: readNullableString(row.job_id),
    orderId: readNullableString(row.order_id),
    customerId: readNullableString(row.customer_id),
    customerName: readString(row.customer_name, "Customer"),
    suggestedAddress: readString(row.suggested_address),
    suggestedLatitude: readNullableNumber(row.suggested_latitude),
    suggestedLongitude: readNullableNumber(row.suggested_longitude),
    reason: readString(row.reason),
    status:
      status === "APPROVED" || status === "REJECTED" ? status : "PENDING",
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
  vehicles: Vehicle[],
  jobs: DeliveryJob[] = []
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

  const today = new Date().toISOString().slice(0, 10)
  const todayJobs = jobs.filter(
    (job) => (job.requestedDeliveryDate ?? job.createdAt.slice(0, 10)) === today
  )
  const deliveredTodayJobs = todayJobs.filter((job) => job.status === "DELIVERED")
  const failedTodayJobs = todayJobs.filter((job) => job.status === "FAILED")
  const overdueJobs = jobs.filter((job) => {
    const date = job.requestedDeliveryDate ?? job.createdAt.slice(0, 10)

    return (
      date < today &&
      !["DELIVERED", "FAILED", "CANCELLED"].includes(job.status)
    )
  })

  const kpis: DeliveryKpi[] = jobs.length > 0 ? [
    {
      label: "Today deliveries",
      value: String(todayJobs.length),
      detail: "Jobs dated today",
    },
    {
      label: "Pending / available",
      value: String(todayJobs.filter((job) => job.status === "AVAILABLE").length),
      detail: "Waiting for a driver",
    },
    {
      label: "Loaded",
      value: String(todayJobs.filter((job) => job.status === "LOADED").length),
      detail: "Loaded but not started",
    },
    {
      label: "Out for delivery",
      value: String(
        todayJobs.filter((job) => job.status === "OUT_FOR_DELIVERY").length
      ),
      detail: "On the road",
    },
    {
      label: "Delivered today",
      value: String(deliveredTodayJobs.length),
      detail: "Proof uploaded",
    },
    {
      label: "Failed today",
      value: String(failedTodayJobs.length),
      detail: "Needs manager review",
    },
    {
      label: "Overdue",
      value: String(overdueJobs.length),
      detail: "Past requested date",
    },
    {
      label: "Total weight today",
      value: `${todayJobs
        .reduce((sum, job) => sum + job.totalWeightKg, 0)
        .toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`,
      detail: "Across today jobs",
    },
  ] : [
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

  const statusMix: DeliveryChartPoint[] = jobs.length > 0
    ? deliveryJobStatuses.map((status) => ({
        name: status,
        value: jobs.filter((job) => job.status === status).length,
      }))
    : deliveryStatuses.map((status) => ({
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
    jobRows,
    jobLinkRows,
    customerOrderRows,
    outletRows,
    expenseRows,
    addressSuggestionRows,
  ] = await Promise.all([
    loadRows("profiles"),
    loadRows("vehicles"),
    loadRows("delivery_orders"),
    loadRows("delivery_order_items"),
    loadRows("delivery_status_logs"),
    loadRows("driver_locations"),
    loadRows("delivery_payments"),
    loadRows("files"),
    loadRows("delivery_jobs"),
    loadRows("delivery_job_orders"),
    loadRows("customer_orders"),
    loadRows("outlets"),
    loadRows("delivery_expenses"),
    loadRows("delivery_address_suggestions"),
  ])

  if (!profileRows) {
    return {
      demoMode: true,
      drivers: demoDrivers,
      vehicles: demoVehicles,
      orders: demoDeliveryOrders,
      jobs: demoDeliveryJobs,
      expenses: demoDeliveryExpenses,
      addressSuggestions: demoDeliveryAddressSuggestions,
      items: demoDeliveryItems,
      statusLogs: demoDeliveryStatusLogs,
      driverLocations: demoDriverLocations,
      payments: demoDeliveryPayments,
      dashboard: buildDashboard(
        demoDeliveryOrders,
        demoDeliveryPayments,
        demoVehicles,
        demoDeliveryJobs
      ),
    }
  }

  const drivers = profileRows.map(mapDriver)
  const vehicles = vehicleRows?.map(mapVehicle) ?? []
  const filePaths = new Map(
    (fileRows ?? [])
      .filter(
        (row) =>
          readString(row.module) === "delivery" ||
          readString(row.module) === "orders"
      )
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
  const customerOrderNoById = new Map(
    (customerOrderRows ?? []).map((row) => [
      readString(row.id),
      readString(row.order_no),
    ])
  )
  const standaloneOrderNoById = new Map(
    orders.map((order) => [order.id, order.orderNo])
  )
  const jobOrderNos = new Map<string, string[]>()

  for (const link of jobLinkRows ?? []) {
    const jobId = readString(link.job_id)
    const orderNo =
      customerOrderNoById.get(readString(link.customer_order_id)) ??
      standaloneOrderNoById.get(readString(link.delivery_order_id)) ??
      ""

    if (!jobId || !orderNo) {
      continue
    }

    jobOrderNos.set(jobId, [...(jobOrderNos.get(jobId) ?? []), orderNo])
  }

  const jobs = (jobRows ?? [])
    .map((row) =>
      mapJob(
        row,
        vehicles,
        drivers,
        filePaths,
        outletRows ?? [],
        jobOrderNos.get(readString(row.id)) ?? []
      )
    )
    .sort((a, b) => {
      const dateCompare = (b.requestedDeliveryDate ?? "").localeCompare(
        a.requestedDeliveryDate ?? ""
      )

      return dateCompare || b.createdAt.localeCompare(a.createdAt)
    })
  const expenses = (expenseRows ?? [])
    .map((row) => mapExpense(row, vehicles, drivers, filePaths))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const addressSuggestions = (addressSuggestionRows ?? [])
    .map(mapAddressSuggestion)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    demoMode: false,
    drivers,
    vehicles,
    orders,
    jobs,
    expenses,
    addressSuggestions,
    items,
    statusLogs,
    driverLocations,
    payments,
    dashboard: buildDashboard(orders, payments, vehicles, jobs),
  }
}
