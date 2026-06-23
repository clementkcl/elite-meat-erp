import { ManagerDeliveryDashboard } from "@/components/delivery/manager-delivery-dashboard"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import type { UserRole } from "@/lib/auth/session"
import { getDeliveryDashboard } from "@/lib/delivery/queries"
import {
  deliveryLifecycleStatuses,
  type DeliveryDashboardFilters,
  type DeliveryLifecycleStatus,
} from "@/lib/delivery/types"

type DeliveryDashboardSearchParams = {
  date?: string
  driverId?: string
  status?: string
  customer?: string
  outletId?: string
  deliveryTeamId?: string
}

const managerRoles: UserRole[] = ["delivery_manager", "admin", "director"]

function isDeliveryStatus(value: string): value is DeliveryLifecycleStatus {
  return deliveryLifecycleStatuses.includes(value as DeliveryLifecycleStatus)
}

function parseFilters(
  searchParams: DeliveryDashboardSearchParams
): DeliveryDashboardFilters {
  const status = searchParams.status ?? "ALL"

  return {
    date: searchParams.date || null,
    driverId: searchParams.driverId || null,
    status: status === "ALL" || isDeliveryStatus(status) ? status : "ALL",
    customer: searchParams.customer || null,
    outletId: searchParams.outletId || null,
    deliveryTeamId: searchParams.deliveryTeamId || null,
  }
}

export default async function DeliveryHomePage({
  searchParams,
}: {
  searchParams: Promise<DeliveryDashboardSearchParams>
}) {
  const blocked = await moduleAccessBlock("delivery", "Delivery", managerRoles)

  if (blocked) {
    return blocked
  }

  const filters = parseFilters(await searchParams)
  const result = await getDeliveryDashboard(filters)
    .then((data) => ({ data, error: null }))
    .catch((error: unknown) => ({
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Delivery dashboard could not load.",
    }))

  return (
    <ManagerDeliveryDashboard
      data={
        result.data ?? {
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
      filters={filters}
      loadError={result.error}
    />
  )
}
