import { DriverMobileDeliveryPage } from "@/components/delivery/driver-mobile-delivery-page"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { requireCurrentProfile, type UserRole } from "@/lib/auth/session"
import {
  getDeliveryShiftHome,
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

  const result = await getDeliveryShiftHome()
    .then((home) => ({ home, error: null }))
    .catch((error: unknown) => ({
      home: { shift: null, deliveries: [], expenses: [], vehicles: [], cashReceived: 0 },
      error:
        error instanceof Error
          ? error.message
          : "Delivery data could not load.",
    }))

  return (
    <DriverMobileDeliveryPage
      home={result.home}
      driverName={profile.fullName}
      loadError={result.error}
    />
  )
}
