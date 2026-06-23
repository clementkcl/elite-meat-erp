import { DeliveryDetailPage } from "@/components/delivery/delivery-detail-page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { requireCurrentProfile, type UserRole } from "@/lib/auth/session"
import {
  getDeliveryById,
  getDeliveryDrivers,
  getDeliveryVehicles,
} from "@/lib/delivery/queries"

const deliveryDetailRoles: UserRole[] = [
  "delivery_team_general_worker",
  "delivery_manager",
  "admin",
  "director",
]

export default async function DeliveryDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const blocked = await moduleAccessBlock(
    "delivery",
    "Delivery",
    deliveryDetailRoles
  )

  if (blocked) {
    return blocked
  }

  const [{ id }, profile] = await Promise.all([params, requireCurrentProfile()])
  const result = await Promise.all([
    getDeliveryById(id),
    getDeliveryVehicles(),
    getDeliveryDrivers(),
  ])
    .then(([delivery, vehicles, drivers]) => ({
      delivery,
      vehicles,
      drivers,
      error: null,
    }))
    .catch((error: unknown) => ({
      delivery: null,
      vehicles: [],
      drivers: [],
      error:
        error instanceof Error
          ? error.message
          : "Delivery detail could not load.",
    }))

  if (!result.delivery) {
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Delivery unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {result.error ??
              "This delivery was not found or is outside your delivery scope."}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DeliveryDetailPage
      delivery={result.delivery}
      profile={profile}
      vehicles={result.vehicles}
      drivers={result.drivers}
    />
  )
}
