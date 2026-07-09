import { DriverMobileDeliveryPage } from "@/components/delivery/driver-mobile-delivery-page"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { requireCurrentProfile, type UserRole } from "@/lib/auth/session"
import {
  getAvailableDeliveries,
  getDeliveryVehicles,
  getTodayDriverDeliveries,
  getTodayDriverExpenses,
  getUpcomingOrderDeliveries,
} from "@/lib/delivery/queries"

const driverDeliveryRoles: UserRole[] = [
  "delivery_team_general_worker",
  "delivery_manager",
  "admin",
]

export default async function DeliveryDriverPage() {
  const blocked = await moduleAccessBlock(
    "delivery",
    "Delivery",
    driverDeliveryRoles
  )

  if (blocked) {
    return blocked
  }

  const profile = await requireCurrentProfile()

  const result = await Promise.all([
    getAvailableDeliveries(),
    getUpcomingOrderDeliveries(),
    getTodayDriverDeliveries(),
    getTodayDriverExpenses(),
    getDeliveryVehicles(),
  ])
    .then(([availableDeliveries, upcomingOrderDeliveries, driverDeliveries, expenses, vehicles]) => ({
      availableDeliveries,
      upcomingOrderDeliveries,
      driverDeliveries,
      expenses,
      vehicles,
      error: null,
    }))
    .catch((error: unknown) => ({
      availableDeliveries: [],
      upcomingOrderDeliveries: [],
      driverDeliveries: [],
      expenses: [],
      vehicles: [],
      error:
        error instanceof Error
          ? error.message
          : "Delivery data could not load.",
    }))

  return (
    <DriverMobileDeliveryPage
      availableDeliveries={result.availableDeliveries}
      upcomingOrderDeliveries={result.upcomingOrderDeliveries}
      driverDeliveries={result.driverDeliveries}
      expenses={result.expenses}
      vehicles={result.vehicles}
      driverName={profile.fullName}
      loadError={result.error}
    />
  )
}
