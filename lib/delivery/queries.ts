import "server-only"

import { canAccessModule } from "@/lib/auth/access"
import { getCurrentProfile, hasAnyRole, type CurrentProfile } from "@/lib/auth/session"
import {
  asRecord,
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import {
  deliveryFailedReasons,
  deliveryLifecycleStatuses,
  deliveryJobTypes,
  type Delivery,
  type DeliveryDashboardAddressSuggestion,
  type DeliveryDashboardData,
  type DeliveryDashboardDriverMetric,
  type DeliveryDashboardFilters,
  type DeliveryDetail,
  type DeliveryExpense,
  type DeliveryExpenseFilters,
  type DeliveryExpenseStatus,
  type DeliveryExpenseType,
  type DeliveryFailedReason,
  type DeliveryItem,
  type DeliveryJobType,
  type DeliveryLifecycleStatus,
  type DeliveryLinkedOrder,
  type DeliveryProof,
  type DeliveryStatusTimelineEntry,
  type Vehicle,
} from "@/lib/delivery/types"

type DeliveryQueryContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

function isDeliveryLifecycleStatus(value: string): value is DeliveryLifecycleStatus {
  return deliveryLifecycleStatuses.includes(value as DeliveryLifecycleStatus)
}

function isDeliveryJobType(value: string): value is DeliveryJobType {
  return deliveryJobTypes.includes(value as DeliveryJobType)
}

function isDeliveryFailedReason(value: string): value is DeliveryFailedReason {
  return deliveryFailedReasons.includes(value as DeliveryFailedReason)
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

async function getQueryContext(): Promise<DeliveryQueryContext | null> {
  const profile = await getCurrentProfile()

  if (!profile || !canAccessModule(profile, "delivery")) {
    return null
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return null
  }

  return { profile, supabase }
}

async function loadProfiles(
  supabase: SupabaseServerClient,
  rows: Record<string, unknown>[]
) {
  const ids = Array.from(
    new Set(
      rows
        .map((row) => readNullableString(row.driver_id))
        .filter((id): id is string => Boolean(id))
    )
  )

  if (ids.length === 0) {
    return new Map<string, string>()
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids)

  return new Map(
    asRecordArray(data).map((profile) => [
      readString(profile.id),
      readString(profile.full_name, readString(profile.email, "Driver")),
    ])
  )
}

async function loadVehicles(
  supabase: SupabaseServerClient,
  rows: Record<string, unknown>[]
) {
  const ids = Array.from(
    new Set(
      rows
        .flatMap((row) => [
          readNullableString(row.vehicle_id),
          readNullableString(row.default_vehicle_id),
        ])
        .filter((id): id is string => Boolean(id))
    )
  )

  if (ids.length === 0) {
    return new Map<string, string>()
  }

  const { data } = await supabase
    .from("vehicles")
    .select("id, vehicle_no")
    .in("id", ids)

  return new Map(
    asRecordArray(data).map((vehicle) => [
      readString(vehicle.id),
      readString(vehicle.vehicle_no, "Vehicle"),
    ])
  )
}

async function mapDeliveries(
  supabase: SupabaseServerClient,
  rows: Record<string, unknown>[]
): Promise<Delivery[]> {
  const driverNames = await loadProfiles(supabase, rows)
  const vehicleNos = await loadVehicles(supabase, rows)

  return rows.map((row) => mapDelivery(row, driverNames, vehicleNos))
}

function mapDelivery(
  row: Record<string, unknown>,
  driverNames = new Map<string, string>(),
  vehicleNos = new Map<string, string>()
): Delivery {
  const status = readString(row.status, "AVAILABLE")
  const deliveryType = readString(row.delivery_type, "CUSTOMER_DELIVERY")
  const driverId = readNullableString(row.driver_id)
  const vehicleId = readNullableString(row.vehicle_id)
  const failedReason = readString(row.failed_reason)

  return {
    id: readString(row.id),
    deliveryNo: readString(row.delivery_no),
    deliveryType: isDeliveryJobType(deliveryType)
      ? deliveryType
      : "CUSTOMER_DELIVERY",
    status: isDeliveryLifecycleStatus(status) ? status : "AVAILABLE",
    outletId: readNullableString(row.outlet_id),
    deliveryTeamId: readNullableString(row.delivery_team_id),
    driverId,
    driverName: driverId ? driverNames.get(driverId) ?? "Driver" : "-",
    defaultVehicleId: readNullableString(row.default_vehicle_id),
    vehicleId,
    vehicleNo: vehicleId ? vehicleNos.get(vehicleId) ?? "-" : "-",
    customerId: readNullableString(row.customer_id),
    customerName: readString(row.customer_name, "Customer"),
    customerPhone: readString(row.customer_phone),
    deliveryAddress: readString(row.delivery_address),
    deliveryNote: readString(row.delivery_note),
    totalWeightKg: readNumber(row.total_weight_kg),
    itemCount: readNumber(row.item_count),
    completedLatitude:
      row.completed_latitude === null ? null : readNumber(row.completed_latitude),
    completedLongitude:
      row.completed_longitude === null ? null : readNumber(row.completed_longitude),
    customerLatitude:
      row.customer_latitude === null || row.customer_latitude === undefined
        ? null
        : readNumber(row.customer_latitude),
    customerLongitude:
      row.customer_longitude === null || row.customer_longitude === undefined
        ? null
        : readNumber(row.customer_longitude),
    gpsUnavailable: readBoolean(row.gps_unavailable),
    failedReason: isDeliveryFailedReason(failedReason) ? failedReason : null,
    remarks: readString(row.remarks),
    requestedDeliveryDate: readNullableString(row.requested_delivery_date),
    acceptedAt: readNullableString(row.accepted_at),
    loadedAt: readNullableString(row.loaded_at),
    startedAt: readNullableString(row.started_at),
    completedAt: readNullableString(row.completed_at),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapDeliveryOrder(row: Record<string, unknown>): DeliveryLinkedOrder {
  return {
    id: readString(row.id),
    deliveryId: readString(row.delivery_id),
    orderNo: readString(row.order_no),
    sourceCustomerOrderId: readNullableString(row.source_customer_order_id),
    customerName: readString(row.customer_name),
    customerPhone: readString(row.customer_phone),
    deliveryAddress: readString(row.delivery_address),
    orderNote: readString(row.order_note, readString(row.notes)),
    orderSequence: readNumber(row.order_sequence, 1),
  }
}

function mapDeliveryItem(row: Record<string, unknown>): DeliveryItem {
  return {
    id: readString(row.id),
    deliveryId: readNullableString(row.delivery_id),
    deliveryOrderId: readNullableString(row.delivery_order_id),
    customerOrderId: readNullableString(row.customer_order_id),
    customerOrderItemId: readNullableString(row.customer_order_item_id),
    itemId: readNullableString(row.item_id),
    itemDescription: readString(row.item_description),
    quantity: readNumber(row.quantity),
    weightKg: readNumber(row.weight_kg),
    notes: readString(row.notes),
  }
}

function mapProof(row: Record<string, unknown>): DeliveryProof {
  const failedReason = readString(row.failed_reason)

  return {
    id: readString(row.id),
    deliveryId: readNullableString(row.delivery_id),
    deliveryOrderId: readNullableString(row.delivery_order_id),
    customerOrderId: readNullableString(row.customer_order_id),
    proofType: readString(row.proof_type) === "FAILED" ? "FAILED" : "DELIVERED",
    proofFileId: readNullableString(row.proof_file_id),
    bucketId: readString(row.bucket_id, "delivery-proofs"),
    objectPath: readString(row.object_path),
    signedUrl: "",
    mimeType: readNullableString(row.mime_type),
    sizeBytes: readNumber(row.size_bytes),
    latitude: row.latitude === null ? null : readNumber(row.latitude),
    longitude: row.longitude === null ? null : readNumber(row.longitude),
    gpsUnavailable: readBoolean(row.gps_unavailable),
    failedReason: isDeliveryFailedReason(failedReason) ? failedReason : null,
    remarks: readString(row.remarks),
    uploadedBy: readNullableString(row.uploaded_by),
    uploadedAt: readString(row.uploaded_at, readString(row.created_at, new Date().toISOString())),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

async function withSignedProofUrls(
  supabase: SupabaseServerClient,
  proofs: DeliveryProof[]
) {
  return Promise.all(
    proofs.map(async (proof) => {
      if (!proof.objectPath) {
        return proof
      }

      const { data } = await supabase.storage
        .from(proof.bucketId)
        .createSignedUrl(proof.objectPath, 60 * 30)

      return { ...proof, signedUrl: data?.signedUrl ?? "" }
    })
  )
}

function mapStatusLog(row: Record<string, unknown>): DeliveryStatusTimelineEntry {
  const status = readString(row.status_text, readString(row.status, "AVAILABLE"))

  return {
    id: readString(row.id),
    deliveryId: readNullableString(row.delivery_id),
    orderId: readNullableString(row.order_id),
    status: isDeliveryLifecycleStatus(status) ? status : "PENDING",
    statusText: status,
    notes: readString(row.notes),
    driverId: readNullableString(row.driver_id),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

function mapExpense(
  row: Record<string, unknown>,
  driverNames = new Map<string, string>(),
  vehicleNos = new Map<string, string>()
): DeliveryExpense {
  const driverId = readNullableString(row.driver_id)
  const vehicleId = readNullableString(row.vehicle_id)

  return {
    id: readString(row.id),
    deliveryId: readNullableString(row.delivery_id),
    driverId,
    driverName: driverId ? driverNames.get(driverId) ?? "Driver" : "-",
    outletId: readNullableString(row.outlet_id),
    deliveryTeamId: readNullableString(row.delivery_team_id),
    vehicleId,
    vehicleNo: vehicleId ? vehicleNos.get(vehicleId) ?? "-" : "-",
    expenseType: readString(row.expense_type, "OTHER") as DeliveryExpenseType,
    amount: readNumber(row.amount),
    receiptFileId: readNullableString(row.receipt_file_id),
    bucketId: readString(row.bucket_id, "delivery-expenses"),
    receiptPath: readString(row.object_path, "-"),
    receiptUrl: "",
    status: readString(row.status, "PENDING") as DeliveryExpenseStatus,
    remark: readString(row.remark),
    reviewNote: readString(row.review_note),
    rejectedReason: readString(row.rejected_reason),
    reviewedById: readNullableString(row.reviewed_by),
    reviewedAt: readNullableString(row.reviewed_at),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

async function mapExpenses(
  supabase: SupabaseServerClient,
  rows: Record<string, unknown>[]
): Promise<DeliveryExpense[]> {
  const driverNames = await loadProfiles(supabase, rows)
  const vehicleNos = await loadVehicles(supabase, rows)

  return withSignedExpenseUrls(
    supabase,
    rows.map((row) => mapExpense(row, driverNames, vehicleNos))
  )
}

async function withSignedExpenseUrls(
  supabase: SupabaseServerClient,
  expenses: DeliveryExpense[]
) {
  return Promise.all(
    expenses.map(async (expense) => {
      if (!expense.receiptPath || expense.receiptPath === "-") {
        return expense
      }

      const { data } = await supabase.storage
        .from(expense.bucketId)
        .createSignedUrl(expense.receiptPath, 60 * 30)

      return { ...expense, receiptUrl: data?.signedUrl ?? "" }
    })
  )
}

export async function getAvailableDeliveries(): Promise<Delivery[]> {
  const context = await getQueryContext()

  if (!context) {
    return []
  }

  const { data, error } = await context.supabase
    .from("deliveries")
    .select("*")
    .eq("status", "AVAILABLE")
    .or(`requested_delivery_date.eq.${todayIsoDate()},requested_delivery_date.is.null`)
    .order("requested_delivery_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return mapDeliveries(context.supabase, asRecordArray(data))
}

function mapAddressSuggestion(
  row: Record<string, unknown>
): DeliveryDashboardAddressSuggestion {
  const status = readString(row.status, "PENDING")

  return {
    id: readString(row.id),
    deliveryId: readNullableString(row.delivery_id),
    customerId: readNullableString(row.customer_id),
    customerName: readString(row.customer_name, "Customer"),
    suggestedAddress: readString(row.suggested_address),
    suggestedLatitude:
      row.suggested_latitude === null || row.suggested_latitude === undefined
        ? null
        : readNumber(row.suggested_latitude),
    suggestedLongitude:
      row.suggested_longitude === null || row.suggested_longitude === undefined
        ? null
        : readNumber(row.suggested_longitude),
    reason: readString(row.reason),
    status:
      status === "APPROVED" || status === "REJECTED" ? status : "PENDING",
    photoFileId: readNullableString(row.photo_file_id),
    bucketId: readString(row.bucket_id, "delivery-proofs"),
    objectPath: readString(row.object_path),
    signedUrl: "",
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

async function withSignedAddressSuggestionUrls(
  supabase: SupabaseServerClient,
  suggestions: DeliveryDashboardAddressSuggestion[]
) {
  return Promise.all(
    suggestions.map(async (suggestion) => {
      if (!suggestion.objectPath) {
        return suggestion
      }

      const { data } = await supabase.storage
        .from(suggestion.bucketId)
        .createSignedUrl(suggestion.objectPath, 60 * 30)

      return { ...suggestion, signedUrl: data?.signedUrl ?? "" }
    })
  )
}

export async function getDeliveryVehicles(): Promise<Vehicle[]> {
  const context = await getQueryContext()

  if (!context) {
    return []
  }

  const { data, error } = await context.supabase
    .from("vehicles")
    .select("*")
    .eq("is_active", true)
    .order("vehicle_no", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return asRecordArray(data).map((vehicle) => ({
    id: readString(vehicle.id),
    vehicleNo: readString(vehicle.vehicle_no, "Vehicle"),
    vehicleType: readString(vehicle.vehicle_type, "LORRY"),
    capacityKg: readNumber(vehicle.capacity_kg),
    active: readBoolean(vehicle.is_active, true),
    deliveryTeamId: readNullableString(vehicle.delivery_team_id),
    gpsProviderId: readNullableString(vehicle.gps_provider_id),
    gpsProviderVehicleRef: readString(vehicle.gps_provider_vehicle_ref),
    gpsEnabled: readBoolean(vehicle.gps_enabled),
  }))
}

export async function getDeliveryDrivers() {
  const context = await getQueryContext()

  if (!context) {
    return []
  }

  const { data: roleRows, error: roleError } = await context.supabase
    .from("profile_roles")
    .select("profile_id, role_key")
    .in("role_key", ["delivery_team_general_worker", "delivery_manager"])

  if (roleError) {
    throw new Error(roleError.message)
  }

  const driverIds = Array.from(
    new Set(
      asRecordArray(roleRows)
        .map((row) => readString(row.profile_id))
        .filter(Boolean)
    )
  )

  if (driverIds.length === 0) {
    return []
  }

  let query = context.supabase
    .from("profiles")
    .select("id, full_name, email, department_id, outlet_id")
    .in("id", driverIds)
    .order("full_name", { ascending: true })

  if (!hasAnyRole(context.profile, ["admin", "director"])) {
    if (context.profile.departmentId) {
      query = query.eq("department_id", context.profile.departmentId)
    }

    if (context.profile.outletId) {
      query = query.eq("outlet_id", context.profile.outletId)
    }
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return asRecordArray(data).map((profile) => ({
    id: readString(profile.id),
    fullName: readString(profile.full_name, readString(profile.email, "Driver")),
    email: readString(profile.email),
  }))
}

export async function getTodayDriverDeliveries(): Promise<Delivery[]> {
  const context = await getQueryContext()

  if (!context) {
    return []
  }

  const today = todayIsoDate()
  const { data, error } = await context.supabase
    .from("deliveries")
    .select("*")
    .eq("driver_id", context.profile.id)
    .in("status", [
      "ACCEPTED",
      "LOADED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "FAILED",
    ])
    .or(
      `requested_delivery_date.eq.${today},requested_delivery_date.is.null,created_at.gte.${today}T00:00:00.000Z`
    )
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return mapDeliveries(context.supabase, asRecordArray(data))
}

export async function getDeliveryDashboard(
  filters: DeliveryDashboardFilters = {}
): Promise<DeliveryDashboardData> {
  const context = await getQueryContext()

  if (!context) {
    return emptyDashboard()
  }

  if (
    !hasAnyRole(context.profile, [
      "delivery_manager",
      "admin",
      "director",
    ])
  ) {
    throw new Error("Your role does not allow delivery dashboard access.")
  }

  const filterDate = filters.date || todayIsoDate()
  let query = context.supabase.from("deliveries").select("*")

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status)
  }

  if (filters.driverId) {
    query = query.eq("driver_id", filters.driverId)
  }

  if (filters.customer) {
    query = query.ilike("customer_name", `%${filters.customer}%`)
  }

  if (filters.outletId) {
    query = query.eq("outlet_id", filters.outletId)
  }

  if (filters.deliveryTeamId) {
    query = query.eq("delivery_team_id", filters.deliveryTeamId)
  }

  query = query
    .or(`requested_delivery_date.lte.${filterDate},created_at.gte.${filterDate}T00:00:00.000Z`)
    .order("created_at", { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const deliveries = await mapDeliveries(context.supabase, asRecordArray(data))
  const driverPerformance = buildDriverPerformance(deliveries)
  const reviews = await buildDashboardReviews(
    context.supabase,
    deliveries,
    filterDate
  )

  return {
    deliveries,
    kpis: {
      todayDeliveries: deliveries.length,
      pendingAvailable: deliveries.filter((delivery) => delivery.status === "AVAILABLE").length,
      loaded: deliveries.filter((delivery) => delivery.status === "LOADED").length,
      outForDelivery: deliveries.filter((delivery) => delivery.status === "OUT_FOR_DELIVERY").length,
      deliveredToday: deliveries.filter((delivery) => delivery.status === "DELIVERED").length,
      failedToday: deliveries.filter((delivery) => delivery.status === "FAILED").length,
      overdue: deliveries.filter((delivery) => {
        return Boolean(
          delivery.requestedDeliveryDate &&
            delivery.requestedDeliveryDate < filterDate &&
            !["DELIVERED", "FAILED", "CANCELLED"].includes(delivery.status)
        )
      }).length,
      totalWeightToday: deliveries.reduce(
        (total, delivery) => total + delivery.totalWeightKg,
        0
      ),
    },
    driverPerformance,
    deliveryWeightByDriver: driverPerformance.map((metric) => ({
      name: metric.driverName,
      value: metric.totalWeightKg,
    })),
    reviews,
  }
}

export async function getDeliveryById(
  deliveryId: string
): Promise<DeliveryDetail | null> {
  const context = await getQueryContext()

  if (!context) {
    return null
  }

  const { data, error } = await context.supabase
    .from("deliveries")
    .select("*")
    .eq("id", deliveryId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const deliveryRow = asRecord(data)

  if (!deliveryRow.id) {
    return null
  }

  const [delivery] = await mapDeliveries(context.supabase, [deliveryRow])
  const [orders, items, proofs, logs, expenses, addressSuggestions] = await Promise.all([
    context.supabase
      .from("delivery_orders")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("order_sequence", { ascending: true }),
    context.supabase
      .from("delivery_items")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("created_at", { ascending: true }),
    context.supabase
      .from("delivery_proofs")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("delivery_status_logs")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("created_at", { ascending: true }),
    context.supabase
      .from("delivery_expenses")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("delivery_address_suggestions")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("created_at", { ascending: false }),
  ])

  for (const result of [orders, items, proofs, logs, expenses, addressSuggestions]) {
    if (result.error) {
      throw new Error(result.error.message)
    }
  }

  const proofRows = asRecordArray(proofs.data).map(mapProof)

  return {
    ...delivery,
    orders: asRecordArray(orders.data).map(mapDeliveryOrder),
    items: asRecordArray(items.data).map(mapDeliveryItem),
    proofs: await withSignedProofUrls(context.supabase, proofRows),
    statusLogs: asRecordArray(logs.data).map(mapStatusLog),
    expenses: await mapExpenses(context.supabase, asRecordArray(expenses.data)),
    addressSuggestions: await withSignedAddressSuggestionUrls(
      context.supabase,
      asRecordArray(addressSuggestions.data).map(mapAddressSuggestion)
    ),
  }
}

export async function getTodayDriverExpenses(): Promise<DeliveryExpense[]> {
  const context = await getQueryContext()

  if (!context) {
    return []
  }

  const today = todayIsoDate()
  const { data, error } = await context.supabase
    .from("delivery_expenses")
    .select("*")
    .eq("driver_id", context.profile.id)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return mapExpenses(context.supabase, asRecordArray(data))
}

function nextIsoDate(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  parsed.setUTCDate(parsed.getUTCDate() + 1)
  return parsed.toISOString().slice(0, 10)
}

export async function getDeliveryExpenses(
  filters: DeliveryExpenseFilters = {}
): Promise<DeliveryExpense[]> {
  const context = await getQueryContext()

  if (!context) {
    return []
  }

  if (
    !hasAnyRole(context.profile, ["delivery_manager", "admin", "director"])
  ) {
    return getTodayDriverExpenses()
  }

  const filterDate = filters.date || todayIsoDate()
  const nextDate = nextIsoDate(filterDate)
  let query = context.supabase
    .from("delivery_expenses")
    .select("*")
    .gte("created_at", `${filterDate}T00:00:00.000Z`)
    .order("created_at", { ascending: false })

  if (nextDate) {
    query = query.lt("created_at", `${nextDate}T00:00:00.000Z`)
  }

  if (filters.driverId) {
    query = query.eq("driver_id", filters.driverId)
  }

  if (filters.vehicleId) {
    query = query.eq("vehicle_id", filters.vehicleId)
  }

  if (filters.expenseType && filters.expenseType !== "ALL") {
    query = query.eq("expense_type", filters.expenseType)
  }

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status)
  }

  if (!hasAnyRole(context.profile, ["admin", "director"])) {
    if (context.profile.outletId) {
      query = query.eq("outlet_id", context.profile.outletId)
    }

    if (context.profile.departmentId) {
      query = query.eq("delivery_team_id", context.profile.departmentId)
    }
  }

  const { data, error } = await query.limit(200)

  if (error) {
    throw new Error(error.message)
  }

  return mapExpenses(context.supabase, asRecordArray(data))
}

function buildDriverPerformance(deliveries: Delivery[]) {
  const metrics = new Map<string, DeliveryDashboardDriverMetric>()

  for (const delivery of deliveries) {
    const key = delivery.driverId ?? "unassigned"
    const existing =
      metrics.get(key) ??
      {
        driverId: delivery.driverId,
        driverName: delivery.driverName,
        totalDeliveries: 0,
        delivered: 0,
        failed: 0,
        loaded: 0,
        outForDelivery: 0,
        totalWeightKg: 0,
      }

    existing.totalDeliveries += 1
    existing.totalWeightKg += delivery.totalWeightKg

    if (delivery.status === "DELIVERED") {
      existing.delivered += 1
    }

    if (delivery.status === "FAILED") {
      existing.failed += 1
    }

    if (delivery.status === "LOADED") {
      existing.loaded += 1
    }

    if (delivery.status === "OUT_FOR_DELIVERY") {
      existing.outForDelivery += 1
    }

    metrics.set(key, existing)
  }

  return Array.from(metrics.values())
}

async function buildDashboardReviews(
  supabase: SupabaseServerClient,
  deliveries: Delivery[],
  filterDate: string
) {
  const now = Date.now()
  const slowMs = 2 * 60 * 60 * 1000
  const lateDeliveries = deliveries.filter((delivery) => {
    return Boolean(
      delivery.requestedDeliveryDate &&
        delivery.requestedDeliveryDate < filterDate &&
        !["DELIVERED", "FAILED", "CANCELLED"].includes(delivery.status)
    )
  })
  const slowDeliveries = deliveries.filter((delivery) => {
    if (!delivery.startedAt) {
      return false
    }

    const startedAt = new Date(delivery.startedAt).getTime()
    const finishedAt = delivery.completedAt
      ? new Date(delivery.completedAt).getTime()
      : now

    return (
      Number.isFinite(startedAt) &&
      Number.isFinite(finishedAt) &&
      finishedAt - startedAt > slowMs
    )
  })
  const { data, error } = await supabase
    .from("delivery_address_suggestions")
    .select("*")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(error.message)
  }

  const addressSuggestions = await withSignedAddressSuggestionUrls(
    supabase,
    asRecordArray(data).map(mapAddressSuggestion)
  )

  return {
    failedDeliveries: deliveries.filter((delivery) => delivery.status === "FAILED"),
    gpsUnavailable: deliveries.filter((delivery) => delivery.gpsUnavailable),
    addressSuggestions,
    lateDeliveries,
    slowDeliveries,
  }
}

function emptyDashboard(): DeliveryDashboardData {
  return {
    deliveries: [],
    kpis: {
      todayDeliveries: 0,
      pendingAvailable: 0,
      loaded: 0,
      outForDelivery: 0,
      deliveredToday: 0,
      failedToday: 0,
      overdue: 0,
      totalWeightToday: 0,
    },
    driverPerformance: [],
    deliveryWeightByDriver: [],
    reviews: {
      failedDeliveries: [],
      gpsUnavailable: [],
      addressSuggestions: [],
      lateDeliveries: [],
      slowDeliveries: [],
    },
  }
}
