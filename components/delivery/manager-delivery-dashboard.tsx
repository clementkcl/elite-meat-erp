import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  deliveryLifecycleStatuses,
  type Delivery,
  type DeliveryDashboardData,
  type DeliveryDashboardFilters,
} from "@/lib/delivery/types"

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatWeight(value: number) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} kg`
}

function compactDate(value?: string | null) {
  return value || new Date().toISOString().slice(0, 10)
}

function uniqueBy<T>(items: T[], key: (item: T) => string | null) {
  const seen = new Set<string>()
  const result: T[] = []

  for (const item of items) {
    const value = key(item)

    if (!value || seen.has(value)) {
      continue
    }

    seen.add(value)
    result.push(item)
  }

  return result
}

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  )
}

function DashboardFilters({
  filters,
  deliveries,
}: {
  filters: DeliveryDashboardFilters
  deliveries: Delivery[]
}) {
  const drivers = uniqueBy(
    deliveries.filter((delivery) => delivery.driverId),
    (delivery) => delivery.driverId
  )
  const outlets = uniqueBy(
    deliveries.filter((delivery) => delivery.outletId),
    (delivery) => delivery.outletId
  )
  const teams = uniqueBy(
    deliveries.filter((delivery) => delivery.deliveryTeamId),
    (delivery) => delivery.deliveryTeamId
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Use simple filters for today delivery review.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={compactDate(filters.date)}
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverId">Driver</Label>
            <select
              id="driverId"
              name="driverId"
              defaultValue={filters.driverId ?? ""}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All drivers</option>
              {drivers.map((delivery) => (
                <option key={delivery.driverId} value={delivery.driverId ?? ""}>
                  {delivery.driverName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status ?? "ALL"}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              {deliveryLifecycleStatuses.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <Input
              id="customer"
              name="customer"
              defaultValue={filters.customer ?? ""}
              placeholder="Customer name"
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="outletId">Outlet</Label>
            <select
              id="outletId"
              name="outletId"
              defaultValue={filters.outletId ?? ""}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All outlets</option>
              {outlets.map((delivery) => (
                <option key={delivery.outletId} value={delivery.outletId ?? ""}>
                  {delivery.outletId}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryTeamId">Team</Label>
            <select
              id="deliveryTeamId"
              name="deliveryTeamId"
              defaultValue={filters.deliveryTeamId ?? ""}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All teams</option>
              {teams.map((delivery) => (
                <option
                  key={delivery.deliveryTeamId}
                  value={delivery.deliveryTeamId ?? ""}
                >
                  {delivery.deliveryTeamId}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 md:col-span-3 xl:col-span-6">
            <Button type="submit" className="min-h-11">
              Apply Filters
            </Button>
            <Button asChild type="button" variant="outline" className="min-h-11">
              <Link href="/delivery">Clear</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function DeliveryList({ deliveries }: { deliveries: Delivery[] }) {
  if (deliveries.length === 0) {
    return (
      <EmptyState
        title="No deliveries found"
        description="Deliveries matching the selected filters will appear here."
        className="rounded-md border border-dashed"
      />
    )
  }

  return (
    <div className="space-y-3">
      {deliveries.map((delivery) => (
        <Card key={delivery.id}>
          <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <div className="font-medium">{delivery.deliveryNo}</div>
                <div className="text-sm text-muted-foreground">
                  {delivery.customerName}
                </div>
              </div>
              <div className="space-y-1 md:col-span-1">
                <div className="break-words text-sm">
                  {delivery.deliveryAddress || "No address saved"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Driver {delivery.driverName}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <StatusBadge value={delivery.status} />
                </div>
                <div>
                  <div className="text-muted-foreground">Weight</div>
                  <div className="font-medium">{formatWeight(delivery.totalWeightKg)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Items</div>
                  <div className="font-medium">{delivery.itemCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Date</div>
                  <div className="font-medium">
                    {delivery.requestedDeliveryDate ?? "-"}
                  </div>
                </div>
              </div>
            </div>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/delivery/${delivery.id}`}>Review</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DriverPerformance({ data }: { data: DeliveryDashboardData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Driver Performance</CardTitle>
          <CardDescription>Delivery count by driver.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.driverPerformance.length > 0 ? (
            data.driverPerformance.map((driver) => (
              <div
                key={driver.driverId ?? "unassigned"}
                className="grid grid-cols-2 gap-3 rounded-md border p-3 text-sm md:grid-cols-6"
              >
                <div className="font-medium md:col-span-2">{driver.driverName}</div>
                <div>Total {driver.totalDeliveries}</div>
                <div>Delivered {driver.delivered}</div>
                <div>Failed {driver.failed}</div>
                <div>Out {driver.outForDelivery}</div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No driver activity"
              description="Driver performance appears after deliveries are assigned."
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Delivery Weight by Driver</CardTitle>
          <CardDescription>Total assigned weight by driver.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.deliveryWeightByDriver.length > 0 ? (
            data.deliveryWeightByDriver.map((point) => (
              <div key={point.name} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{point.name}</span>
                  <span>{formatWeight(point.value)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, Math.max(4, point.value))}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No delivery weight"
              description="Weight totals appear when deliveries have assigned weight."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReviewDeliveryList({
  title,
  description,
  deliveries,
}: {
  title: string
  description: string
  deliveries: Delivery[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {deliveries.length > 0 ? (
          deliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="font-medium">
                  {delivery.deliveryNo} / {delivery.customerName}
                </div>
                <div className="text-muted-foreground">
                  {delivery.driverName} / {delivery.deliveryAddress || "No address"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={delivery.status} />
                <Button asChild variant="outline" size="sm">
                  <Link href={`/delivery/${delivery.id}`}>Review</Link>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Nothing to review"
            description="Matching delivery issues will appear here."
          />
        )}
      </CardContent>
    </Card>
  )
}

function DeliveryIssueReviewGuide({ data }: { data: DeliveryDashboardData }) {
  const issueBuckets = [
    {
      label: "Failed proof",
      count: data.reviews.failedDeliveries.length,
      next: "Open failed delivery",
    },
    {
      label: "GPS/address",
      count:
        data.reviews.gpsUnavailable.length + data.reviews.addressSuggestions.length,
      next: "Check driver note",
    },
    {
      label: "Late or slow",
      count: data.reviews.lateDeliveries.length + data.reviews.slowDeliveries.length,
      next: "Call driver",
    },
  ]
  const totalIssues = issueBuckets.reduce((sum, bucket) => sum + bucket.count, 0)
  const priorityBucket = issueBuckets.find((bucket) => bucket.count > 0)
  const clearSteps =
    totalIssues > 0
      ? ["Open first issue below", "Review proof or note", "Record follow-up", "Continue next bucket"]
      : ["Issue queue clear", "Check driver workload", "Review delivery list", "Return to normal reports"]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery issues to clear today</CardTitle>
        <CardDescription>
          Review failed proof, GPS/address, late, and slow delivery items before normal reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-semibold">
            {totalIssues > 0
              ? `${totalIssues} delivery issue${totalIssues === 1 ? "" : "s"} need follow-up`
              : "No delivery issues need follow-up right now"}
          </div>
          <div className="mt-1 text-muted-foreground">
            Failed deliveries still need manager review and stock return follow-up.
            Address or GPS suggestions stay pending until a manager approves or rejects them.
          </div>
        </div>
        <div
          className={
            totalIssues > 0
              ? "rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
              : "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"
          }
        >
          <div className="font-semibold">
            {priorityBucket
              ? `Start here: ${priorityBucket.label}`
              : "Issue queue clear"}
          </div>
          <div className="mt-1">
            {priorityBucket
              ? `${priorityBucket.next}. Clear this bucket before normal delivery reports.`
              : "No failed proof, GPS/address, late, or slow delivery issue needs action right now."}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {clearSteps.map((step, index) => (
              <div key={step} className="rounded-md border bg-background/80 px-3 py-2">
                <div className="text-xs font-medium opacity-70">
                  Step {index + 1}
                </div>
                <div className="mt-1 font-semibold">{step}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {issueBuckets.map((bucket, index) => (
            <div key={bucket.label} className="rounded-md border p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground">
                Check {index + 1}
              </div>
              <div className="mt-1 font-semibold">{bucket.label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {bucket.count}
              </div>
              <div className="mt-1 text-muted-foreground">{bucket.next}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AddressSuggestionReview({ data }: { data: DeliveryDashboardData }) {
  const suggestions = data.reviews.addressSuggestions

  return (
    <Card>
      <CardHeader>
        <CardTitle>Address/GPS Suggestions</CardTitle>
        <CardDescription>Driver-submitted address and GPS suggestions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{suggestion.customerName}</div>
                <Badge variant="warning">{label(suggestion.status)}</Badge>
              </div>
              <div className="mt-1 text-muted-foreground">
                {suggestion.suggestedAddress || "GPS suggestion only"}
              </div>
              <div className="mt-1 text-muted-foreground">
                {suggestion.suggestedLatitude !== null &&
                suggestion.suggestedLongitude !== null
                  ? `${suggestion.suggestedLatitude}, ${suggestion.suggestedLongitude}`
                  : "No GPS coordinates"}
              </div>
              <div className="mt-1">{suggestion.reason}</div>
              {suggestion.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={suggestion.signedUrl}
                  alt="Address suggestion"
                  className="mt-3 aspect-video w-full rounded-md border object-cover"
                />
              ) : null}
              {suggestion.deliveryId ? (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={`/delivery/${suggestion.deliveryId}`}>Review</Link>
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState
            title="No address suggestions"
            description="Pending driver address or GPS suggestions will appear here."
          />
        )}
      </CardContent>
    </Card>
  )
}

export function ManagerDeliveryDashboard({
  data,
  filters,
  loadError,
}: {
  data: DeliveryDashboardData
  filters: DeliveryDashboardFilters
  loadError?: string | null
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Delivery Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manager review for delivery progress, issues, and driver workload.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/delivery/expenses">Expense Review</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/delivery/driver">Driver Page</Link>
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Delivery dashboard data could not load. Check database migrations and permissions.
        </div>
      ) : null}

      <DashboardFilters filters={filters} deliveries={data.deliveries} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today Deliveries"
          value={data.kpis.todayDeliveries}
          detail="Matching selected date"
        />
        <KpiCard
          label="Pending / Available"
          value={data.kpis.pendingAvailable}
          detail="Waiting for driver"
        />
        <KpiCard label="Loaded" value={data.kpis.loaded} detail="Loaded by driver" />
        <KpiCard
          label="Out for Delivery"
          value={data.kpis.outForDelivery}
          detail="Started delivery"
        />
        <KpiCard
          label="Delivered Today"
          value={data.kpis.deliveredToday}
          detail="Completed proof uploaded"
        />
        <KpiCard
          label="Failed Today"
          value={data.kpis.failedToday}
          detail="Failed proof uploaded"
        />
        <KpiCard
          label="Overdue"
          value={data.kpis.overdue}
          detail="Past requested date"
        />
        <KpiCard
          label="Total Weight Today"
          value={formatWeight(data.kpis.totalWeightToday)}
          detail="Delivery workload"
        />
      </div>

      <DriverPerformance data={data} />

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Delivery List</CardTitle>
          <CardDescription>
            Delivery no, customer, address, driver, status, weight, items, and action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryList deliveries={data.deliveries} />
        </CardContent>
      </Card>

      <DeliveryIssueReviewGuide data={data} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ReviewDeliveryList
          title="Failed Deliveries"
          description="Failed proof uploaded and needs manager review."
          deliveries={data.reviews.failedDeliveries}
        />
        <ReviewDeliveryList
          title="GPS Unavailable"
          description="Proof completed without phone GPS."
          deliveries={data.reviews.gpsUnavailable}
        />
        <AddressSuggestionReview data={data} />
        <ReviewDeliveryList
          title="Late Deliveries"
          description="Requested date is before the selected date and still open."
          deliveries={data.reviews.lateDeliveries}
        />
        <ReviewDeliveryList
          title="Driver Took Too Long"
          description="Started more than two hours before completion or still out."
          deliveries={data.reviews.slowDeliveries}
        />
      </div>

      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        V1 does not include a dispatch board. Use this page for status review and issue follow-up.
      </div>
    </div>
  )
}
