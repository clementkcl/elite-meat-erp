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
import type {
  DeliveryDelayEstimate,
  TruckGpsSnapshot,
  TruckGpsSnapshotInput,
  TruckGpsTrailFilters,
  VehicleCurrentLocation,
} from "@/lib/delivery/types"

type TruckGpsContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

type TruckGpsSyncResult = {
  status: "SKIPPED" | "SYNCED"
  snapshotId: string | null
  reason: string
}

const threeDaysMs = 3 * 24 * 60 * 60 * 1000

async function getTruckGpsContext(): Promise<TruckGpsContext | null> {
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

function nullableNumber(row: Record<string, unknown>, key: string) {
  const value = row[key]

  if (value === null || value === undefined || value === "") {
    return null
  }

  return readNumber(value)
}

function nullableBoolean(row: Record<string, unknown>, key: string) {
  const value = row[key]

  if (value === null || value === undefined || value === "") {
    return null
  }

  return readBoolean(value)
}

function assertLatLong(latitude?: number | null, longitude?: number | null) {
  if (latitude !== null && latitude !== undefined) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error("Truck GPS latitude is not valid.")
    }
  }

  if (longitude !== null && longitude !== undefined) {
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("Truck GPS longitude is not valid.")
    }
  }
}

function normalizeSyncedAt(value?: string | null) {
  if (!value) {
    return new Date().toISOString()
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Truck GPS sync timestamp is not valid.")
  }

  return parsed.toISOString()
}

function expiresAtFor(syncedAt: string) {
  return new Date(new Date(syncedAt).getTime() + threeDaysMs).toISOString()
}

function threeDaysAgoIso() {
  return new Date(Date.now() - threeDaysMs).toISOString()
}

function mapSnapshot(row: Record<string, unknown>): TruckGpsSnapshot {
  return {
    id: readString(row.id),
    vehicleId: readString(row.vehicle_id),
    deliveryId: readNullableString(row.delivery_id),
    providerId: readNullableString(row.provider_id),
    providerName: readString(row.provider_name),
    providerVehicleRef: readString(row.provider_vehicle_ref),
    providerSnapshotRef: readString(row.provider_snapshot_ref),
    latitude: nullableNumber(row, "latitude"),
    longitude: nullableNumber(row, "longitude"),
    speedKmh: nullableNumber(row, "speed_kmh"),
    headingDegrees: nullableNumber(row, "heading_degrees"),
    fuelPercent: nullableNumber(row, "fuel_percent"),
    odometerKm: nullableNumber(row, "odometer_km"),
    engineOn: nullableBoolean(row, "engine_on"),
    batteryPercent: nullableNumber(row, "battery_percent"),
    etaMinutes: nullableNumber(row, "eta_minutes"),
    delayMinutes: nullableNumber(row, "delay_minutes"),
    syncedAt: readString(row.synced_at, new Date().toISOString()),
    expiresAt: readString(row.expires_at, expiresAtFor(new Date().toISOString())),
  }
}

function mapCurrentLocation(row: Record<string, unknown>): VehicleCurrentLocation {
  return {
    vehicleId: readString(row.vehicle_id),
    deliveryId: readNullableString(row.delivery_id),
    providerId: readNullableString(row.provider_id),
    providerName: readString(row.provider_name),
    providerVehicleRef: readString(row.provider_vehicle_ref),
    providerSnapshotRef: readString(row.provider_snapshot_ref),
    latitude: nullableNumber(row, "latitude"),
    longitude: nullableNumber(row, "longitude"),
    speedKmh: nullableNumber(row, "speed_kmh"),
    headingDegrees: nullableNumber(row, "heading_degrees"),
    fuelPercent: nullableNumber(row, "fuel_percent"),
    odometerKm: nullableNumber(row, "odometer_km"),
    engineOn: nullableBoolean(row, "engine_on"),
    batteryPercent: nullableNumber(row, "battery_percent"),
    etaMinutes: nullableNumber(row, "eta_minutes"),
    delayMinutes: nullableNumber(row, "delay_minutes"),
    syncedAt: readString(row.synced_at, new Date().toISOString()),
    snapshotId: readNullableString(row.snapshot_id),
    updatedAt: readString(row.updated_at, new Date().toISOString()),
  }
}

async function loadDeliveryScope(
  supabase: SupabaseServerClient,
  deliveryId: string | null | undefined
) {
  if (!deliveryId) {
    return null
  }

  const { data, error } = await supabase
    .from("deliveries")
    .select("id, status, outlet_id, delivery_team_id, vehicle_id")
    .eq("id", deliveryId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const delivery = asRecord(data)

  if (!delivery.id) {
    throw new Error("Linked delivery was not found for truck GPS sync.")
  }

  return delivery
}

async function loadVehicleScope(
  supabase: SupabaseServerClient,
  vehicleId: string
) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, delivery_team_id, gps_provider_id, gps_provider_vehicle_ref")
    .eq("id", vehicleId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const vehicle = asRecord(data)

  if (!vehicle.id) {
    throw new Error("Vehicle was not found for truck GPS sync.")
  }

  return vehicle
}

async function latestSnapshotForDelivery(
  context: TruckGpsContext,
  deliveryId: string,
  vehicleId: string | null
) {
  let query = context.supabase
    .from("truck_gps_snapshots")
    .select("*")
    .eq("delivery_id", deliveryId)
    .gte("synced_at", threeDaysAgoIso())
    .order("synced_at", { ascending: false })
    .limit(1)

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const rows = asRecordArray(data)

  if (rows[0]) {
    return mapSnapshot(rows[0])
  }

  if (!vehicleId) {
    return null
  }

  query = context.supabase
    .from("truck_gps_snapshots")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .gte("synced_at", threeDaysAgoIso())
    .order("synced_at", { ascending: false })
    .limit(1)

  const fallback = await query

  if (fallback.error) {
    throw new Error(fallback.error.message)
  }

  return asRecordArray(fallback.data)[0]
    ? mapSnapshot(asRecordArray(fallback.data)[0])
    : null
}

export async function syncTruckGpsSnapshot(
  payload?: TruckGpsSnapshotInput
): Promise<TruckGpsSyncResult> {
  if (!payload) {
    return {
      status: "SKIPPED",
      snapshotId: null,
      reason: "No provider snapshot payload supplied. Future provider API sync plugs in here.",
    }
  }

  assertLatLong(payload.latitude, payload.longitude)

  const context = await getTruckGpsContext()

  if (!context) {
    throw new Error("Delivery access is required before syncing truck GPS.")
  }

  if (!hasAnyRole(context.profile, ["admin"])) {
    throw new Error("Only admin can sync provider truck GPS snapshots.")
  }

  const syncedAt = normalizeSyncedAt(payload.syncedAt)
  const delivery = await loadDeliveryScope(context.supabase, payload.deliveryId)
  const vehicle = await loadVehicleScope(context.supabase, payload.vehicleId)
  const deliveryVehicleId = readString(delivery?.vehicle_id)

  if (deliveryVehicleId && deliveryVehicleId !== payload.vehicleId) {
    throw new Error("Truck GPS vehicle does not match the linked delivery vehicle.")
  }

  const providerId =
    payload.providerId ?? readNullableString(vehicle.gps_provider_id)
  const providerVehicleRef =
    payload.providerVehicleRef ??
    readString(vehicle.gps_provider_vehicle_ref)
  const outletId = readNullableString(delivery?.outlet_id)
  const deliveryTeamId =
    readNullableString(delivery?.delivery_team_id) ??
    readNullableString(vehicle.delivery_team_id)

  const snapshotRow = {
    vehicle_id: payload.vehicleId,
    delivery_id: payload.deliveryId ?? null,
    provider_id: providerId,
    provider_name: payload.providerName ?? null,
    provider_vehicle_ref: providerVehicleRef || null,
    provider_snapshot_ref: payload.providerSnapshotRef ?? null,
    outlet_id: outletId,
    delivery_team_id: deliveryTeamId,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    speed_kmh: payload.speedKmh ?? null,
    heading_degrees: payload.headingDegrees ?? null,
    fuel_percent: payload.fuelPercent ?? null,
    odometer_km: payload.odometerKm ?? null,
    engine_on: payload.engineOn ?? null,
    battery_percent: payload.batteryPercent ?? null,
    eta_minutes: payload.etaMinutes ?? null,
    delay_minutes: payload.delayMinutes ?? null,
    synced_at: syncedAt,
    expires_at: expiresAtFor(syncedAt),
    raw_payload: payload.rawPayload ?? {},
  }

  const { data, error } = await context.supabase
    .from("truck_gps_snapshots")
    .insert(snapshotRow)
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const snapshotId = readString(asRecord(data).id)

  const currentRow = {
    vehicle_id: payload.vehicleId,
    delivery_id: snapshotRow.delivery_id,
    provider_id: snapshotRow.provider_id,
    provider_name: snapshotRow.provider_name,
    provider_vehicle_ref: snapshotRow.provider_vehicle_ref,
    provider_snapshot_ref: snapshotRow.provider_snapshot_ref,
    latitude: snapshotRow.latitude,
    longitude: snapshotRow.longitude,
    speed_kmh: snapshotRow.speed_kmh,
    heading_degrees: snapshotRow.heading_degrees,
    fuel_percent: snapshotRow.fuel_percent,
    odometer_km: snapshotRow.odometer_km,
    engine_on: snapshotRow.engine_on,
    battery_percent: snapshotRow.battery_percent,
    eta_minutes: snapshotRow.eta_minutes,
    delay_minutes: snapshotRow.delay_minutes,
    snapshot_id: snapshotId,
    outlet_id: snapshotRow.outlet_id,
    delivery_team_id: snapshotRow.delivery_team_id,
    synced_at: snapshotRow.synced_at,
    raw_payload: snapshotRow.raw_payload,
    updated_at: new Date().toISOString(),
  }

  const { error: currentError } = await context.supabase
    .from("vehicle_current_locations")
    .upsert(currentRow, { onConflict: "vehicle_id" })

  if (currentError) {
    throw new Error(currentError.message)
  }

  return {
    status: "SYNCED",
    snapshotId,
    reason: "Truck GPS snapshot stored for future live-map and ETA workflows.",
  }
}

export async function getVehicleCurrentLocation(
  vehicleId: string
): Promise<VehicleCurrentLocation | null> {
  const context = await getTruckGpsContext()

  if (!context || !vehicleId) {
    return null
  }

  const { data, error } = await context.supabase
    .from("vehicle_current_locations")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .gte("synced_at", threeDaysAgoIso())
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const current = asRecord(data)

  if (!current.vehicle_id) {
    return null
  }

  return mapCurrentLocation(current)
}

export async function estimateDeliveryDelay(
  deliveryId: string
): Promise<DeliveryDelayEstimate> {
  const context = await getTruckGpsContext()

  if (!context || !deliveryId) {
    return {
      deliveryId,
      vehicleId: null,
      trackingAllowed: false,
      etaMinutes: null,
      delayMinutes: null,
      syncedAt: null,
      reason: "Delivery access is required before estimating delay.",
    }
  }

  const { data, error } = await context.supabase
    .from("deliveries")
    .select("id, status, vehicle_id")
    .eq("id", deliveryId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const delivery = asRecord(data)
  const vehicleId = readNullableString(delivery.vehicle_id)

  if (!delivery.id) {
    return {
      deliveryId,
      vehicleId: null,
      trackingAllowed: false,
      etaMinutes: null,
      delayMinutes: null,
      syncedAt: null,
      reason: "Delivery was not found.",
    }
  }

  if (readString(delivery.status) !== "OUT_FOR_DELIVERY") {
    return {
      deliveryId,
      vehicleId,
      trackingAllowed: false,
      etaMinutes: null,
      delayMinutes: null,
      syncedAt: null,
      reason: "Truck/customer tracking starts only when delivery is Out for Delivery.",
    }
  }

  const snapshot = await latestSnapshotForDelivery(context, deliveryId, vehicleId)

  if (!snapshot) {
    return {
      deliveryId,
      vehicleId,
      trackingAllowed: true,
      etaMinutes: null,
      delayMinutes: null,
      syncedAt: null,
      reason: "No truck GPS snapshot is available yet.",
    }
  }

  return {
    deliveryId,
    vehicleId,
    trackingAllowed: true,
    etaMinutes: snapshot.etaMinutes,
    delayMinutes: snapshot.delayMinutes,
    syncedAt: snapshot.syncedAt,
    reason: "Provider ETA/delay estimate placeholder returned from latest GPS snapshot.",
  }
}

export async function getTruckGpsTrail(
  filters: TruckGpsTrailFilters
): Promise<TruckGpsSnapshot[]> {
  const context = await getTruckGpsContext()

  if (!context || !filters.vehicleId) {
    return []
  }

  const retainedFrom = threeDaysAgoIso()
  const requestedFrom = filters.from
    ? normalizeSyncedAt(filters.from)
    : retainedFrom
  const from = requestedFrom > retainedFrom ? requestedFrom : retainedFrom
  const limit = Math.min(Math.max(filters.limit ?? 180, 1), 2000)

  let query = context.supabase
    .from("truck_gps_snapshots")
    .select("*")
    .eq("vehicle_id", filters.vehicleId)
    .gte("synced_at", from)
    .order("synced_at", { ascending: true })
    .limit(limit)

  if (filters.deliveryId) {
    query = query.eq("delivery_id", filters.deliveryId)
  }

  if (filters.to) {
    query = query.lte("synced_at", normalizeSyncedAt(filters.to))
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return asRecordArray(data).map(mapSnapshot)
}
