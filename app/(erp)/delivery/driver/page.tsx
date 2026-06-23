import { DriverMobileDeliveryPage } from "@/components/delivery/driver-mobile-delivery-page"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { requireCurrentProfile, type UserRole } from "@/lib/auth/session"
import {
  getAvailableDeliveries,
  getDeliveryVehicles,
  getTodayDriverDeliveries,
  getTodayDriverExpenses,
} from "@/lib/delivery/queries"

const driverDeliveryRoles: UserRole[] = [
  "delivery_team_general_worker",
  "delivery_manager",
  "admin",
  "director",
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
    getTodayDriverDeliveries(),
    getTodayDriverExpenses(),
    getDeliveryVehicles(),
  ])
    .then(([availableDeliveries, driverDeliveries, expenses, vehicles]) => ({
      availableDeliveries,
      driverDeliveries,
      expenses,
      vehicles,
      error: null,
    }))
    .catch((error: unknown) => ({
      availableDeliveries: [],
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
      driverDeliveries={result.driverDeliveries}
      expenses={result.expenses}
      vehicles={result.vehicles}
      driverName={profile.fullName}
      loadError={result.error}
    />
  )
}
