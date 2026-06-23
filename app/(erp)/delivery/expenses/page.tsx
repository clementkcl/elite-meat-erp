import { DeliveryExpenseReviewPage } from "@/components/delivery/delivery-expense-review-page"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import type { UserRole } from "@/lib/auth/session"
import {
  getDeliveryDrivers,
  getDeliveryExpenses,
  getDeliveryVehicles,
} from "@/lib/delivery/queries"
import {
  deliveryExpenseStatuses,
  deliveryExpenseTypes,
  type DeliveryExpenseFilters,
  type DeliveryExpenseStatus,
  type DeliveryExpenseType,
} from "@/lib/delivery/types"

type DeliveryExpenseSearchParams = {
  date?: string
  driverId?: string
  vehicleId?: string
  expenseType?: string
  status?: string
}

const expenseReviewRoles: UserRole[] = ["delivery_manager", "admin", "director"]

function isExpenseType(value: string): value is DeliveryExpenseType {
  return deliveryExpenseTypes.includes(value as DeliveryExpenseType)
}

function isExpenseStatus(value: string): value is DeliveryExpenseStatus {
  return deliveryExpenseStatuses.includes(value as DeliveryExpenseStatus)
}

function parseFilters(
  searchParams: DeliveryExpenseSearchParams
): DeliveryExpenseFilters {
  const expenseType = searchParams.expenseType ?? "ALL"
  const status = searchParams.status ?? "ALL"

  return {
    date: searchParams.date || null,
    driverId: searchParams.driverId || null,
    vehicleId: searchParams.vehicleId || null,
    expenseType:
      expenseType === "ALL" || isExpenseType(expenseType) ? expenseType : "ALL",
    status: status === "ALL" || isExpenseStatus(status) ? status : "ALL",
  }
}

export default async function DeliveryExpensesPage({
  searchParams,
}: {
  searchParams: Promise<DeliveryExpenseSearchParams>
}) {
  const blocked = await moduleAccessBlock(
    "delivery",
    "Delivery",
    expenseReviewRoles
  )

  if (blocked) {
    return blocked
  }

  const filters = parseFilters(await searchParams)
  const result = await Promise.all([
    getDeliveryExpenses(filters),
    getDeliveryDrivers(),
    getDeliveryVehicles(),
  ])
    .then(([expenses, drivers, vehicles]) => ({
      expenses,
      drivers,
      vehicles,
      error: null,
    }))
    .catch((error: unknown) => ({
      expenses: [],
      drivers: [],
      vehicles: [],
      error:
        error instanceof Error
          ? error.message
          : "Delivery expenses could not load.",
    }))

  return (
    <DeliveryExpenseReviewPage
      expenses={result.expenses}
      filters={filters}
      drivers={result.drivers}
      vehicles={result.vehicles}
      loadError={result.error}
    />
  )
}
