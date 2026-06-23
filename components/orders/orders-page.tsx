import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CreateOrderDeliveryForm,
  CreateOrderForm,
  EditOrderBeforePickingForm,
  MarkReadyForm,
  PickingForms,
  QuickCustomerForm,
  ReadyOrderActions,
} from "@/components/orders/orders-forms"
import { OrdersTableClient } from "@/components/orders/orders-table-client"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { requireCurrentProfile } from "@/lib/auth/session"
import { getOrdersPageData } from "@/lib/orders/data"
import type { UserRole } from "@/lib/auth/types"
import type {
  CustomerOrder,
  OrderFilters,
  OrderLinkedDelivery,
} from "@/lib/orders/types"

export type OrdersRoute =
  | "list"
  | "create"
  | "picking"
  | "ready"
  | "customers"
  | "detail"

const orderRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
  "director",
]

function dateText(value: string | null) {
  return value ? value.replace("T", " ").slice(0, 16) : "-"
}

function money(value: number) {
  return `RM ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function Header({
  title,
  description,
  demoMode,
}: {
  title: string
  description: string
  demoMode: boolean
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/orders/create">Create</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/orders/picking">Picking</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/orders/ready">Ready</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/orders/customers">Customers</Link>
        </Button>
        {demoMode ? <Badge variant="warning">Demo data</Badge> : null}
      </div>
    </div>
  )
}

function FilterBar({
  filters,
  outlets,
  salespeople,
}: {
  filters: OrderFilters
  outlets: { id: string; name: string }[]
  salespeople: { id: string; name: string }[]
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base md:text-sm"
            type="date"
            name="date"
            defaultValue={filters.date ?? ""}
            aria-label="Date"
          />
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-base md:text-sm"
            name="outlet"
            defaultValue={filters.outlet ?? ""}
            aria-label="Outlet"
          >
            <option value="">All outlets</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-base md:text-sm"
            name="status"
            defaultValue={filters.status ?? ""}
            aria-label="Status"
          >
            <option value="">All statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="STOCK_NOT_ENOUGH">Stock not enough</option>
            <option value="PICKING">Picking</option>
            <option value="READY">Ready</option>
            <option value="OUT_FOR_DELIVERY">Out for delivery</option>
            <option value="PICKED_UP">Picked up</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base md:text-sm"
            name="customer"
            defaultValue={filters.customer ?? ""}
            placeholder="Customer"
            aria-label="Customer"
          />
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-base md:text-sm"
            name="salesperson"
            defaultValue={filters.salesperson ?? ""}
            aria-label="Salesperson"
          >
            <option value="">All staff</option>
            {salespeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <Button type="submit" className="min-h-11 xl:col-start-5">
            Apply filters
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function KpiGrid({
  kpis,
}: {
  kpis: { label: string; value: string; detail: string }[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="pb-2">
            <CardDescription>{kpi.label}</CardDescription>
            <CardTitle className="text-2xl">{kpi.value}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpi.detail}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Alerts({
  alerts,
}: {
  alerts: { id: string; label: string; detail: string; tone: string; href?: string }[]
}) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No order alerts for the current filters.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {alerts.slice(0, 10).map((alert) => {
        const content = (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{alert.label}</CardTitle>
                <Badge
                  variant={
                    alert.tone === "danger"
                      ? "destructive"
                      : alert.tone === "warning"
                        ? "warning"
                        : "secondary"
                  }
                >
                  {alert.tone}
                </Badge>
              </div>
              <CardDescription>{alert.detail}</CardDescription>
            </CardHeader>
          </Card>
        )

        return alert.href ? (
          <Link key={alert.id} href={alert.href}>
            {content}
          </Link>
        ) : (
          <div key={alert.id}>{content}</div>
        )
      })}
    </div>
  )
}

function OrderSummary({ order }: { order: CustomerOrder }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{order.customerName}</CardTitle>
            <CardDescription>
              {order.fulfillmentType.replaceAll("_", " ")} - {order.displayStatus}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{order.sourceType}</Badge>
            {order.stockNotEnough ? (
              <Badge variant="destructive">Stock not enough</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-muted-foreground">Required</div>
            <div className="font-medium">{dateText(order.requiredAt ?? order.requiredDate)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-medium">{money(order.totalOrderPrice)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Created by</div>
            <div className="font-medium">{order.createdByName}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Outlet</div>
            <div className="font-medium">{order.outletName}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Pickup/from</div>
            <div className="font-medium">
              {order.fromLocationName !== "-"
                ? order.fromLocationName
                : order.pickupLocationName}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">To location</div>
            <div className="font-medium">{order.toLocationName}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Phone</div>
            <div className="font-medium">{order.customerPhone || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Reservation expires</div>
            <div className="font-medium">{dateText(order.reservationExpiresAt)}</div>
          </div>
        </div>
        {order.customerRemarks || order.remarks || order.deliveryAddress ? (
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div>
              <div className="text-muted-foreground">Customer remarks</div>
              <div>{order.customerRemarks || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Staff remarks</div>
              <div>{order.remarks || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Delivery address</div>
              <div>{order.deliveryAddress || "-"}</div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function LinkedDeliverySummary({
  order,
  linkedDeliveries,
}: {
  order: CustomerOrder
  linkedDeliveries: OrderLinkedDelivery[]
}) {
  if (order.fulfillmentType === "PICKUP" || !order.deliveryRequired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery</CardTitle>
          <CardDescription>
            Customer pickup stays inside the Order module.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const activeDelivery =
    linkedDeliveries.find((delivery) => delivery.status !== "CANCELLED") ??
    linkedDeliveries[0] ??
    null

  if (!activeDelivery) {
    return <CreateOrderDeliveryForm order={order} />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Linked delivery</CardTitle>
            <CardDescription>
              Existing delivery is shown here to avoid duplicate creation.
            </CardDescription>
          </div>
          <StatusBadge value={activeDelivery.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-muted-foreground">Delivery no</div>
            <div className="font-medium">{activeDelivery.deliveryNo}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Driver</div>
            <div className="font-medium">{activeDelivery.driverName}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Proof status</div>
            <div className="font-medium">
              {activeDelivery.proofStatus === "UPLOADED"
                ? `Uploaded (${activeDelivery.proofCount})`
                : "No proof yet"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Delivery status</div>
            <div className="font-medium">
              {activeDelivery.status.replaceAll("_", " ")}
            </div>
          </div>
        </div>
        <Button asChild className="min-h-11 w-full sm:w-auto">
          <Link href={activeDelivery.actionHref}>Open Delivery</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>) {
  const read = (key: string) => {
    const value = searchParams[key]

    return Array.isArray(value) ? value[0] : value
  }

  return {
    date: read("date"),
    outlet: read("outlet"),
    status: read("status"),
    customer: read("customer"),
    salesperson: read("salesperson"),
  } satisfies OrderFilters
}

export async function OrdersPage({
  route,
  orderId,
  searchParams = {},
}: {
  route: OrdersRoute
  orderId?: string
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const blocked = await moduleAccessBlock("orders", "Orders", orderRoles)

  if (blocked) {
    return blocked
  }

  const profile = await requireCurrentProfile()
  const filters = parseFilters(searchParams)
  let data: Awaited<ReturnType<typeof getOrdersPageData>>

  try {
    data = await getOrdersPageData(filters)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Orders data could not load."

    return (
      <div className="space-y-5">
        <Header
          title="Orders"
          description="Create, reserve, pick, ready, and hand off orders."
          demoMode={false}
        />
        <Card>
          <CardHeader>
            <CardTitle>Orders unavailable</CardTitle>
            <CardDescription>
              Check that the Orders migrations were applied in order.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            {message}
          </CardContent>
        </Card>
      </div>
    )
  }

  const detailOrder = orderId
    ? data.orders.find((order) => order.id === orderId) ?? null
    : null
  const detailItems = orderId
    ? data.items.filter((item) => item.orderId === orderId)
    : data.items
  const detailReservations = orderId
    ? data.reservations.filter((reservation) => reservation.orderId === orderId)
    : data.reservations
  const detailPickingEntries = orderId
    ? data.pickingEntries.filter((entry) => entry.orderId === orderId)
    : data.pickingEntries
  const detailNotifications = orderId
    ? data.notifications.filter((event) => event.orderId === orderId)
    : data.notifications
  const detailLinkedDeliveries = orderId
    ? data.linkedDeliveries.filter((delivery) => delivery.orderId === orderId)
    : []

  return (
    <div className="space-y-5">
      <Header
        title={
          route === "create"
            ? "Create Order"
            : route === "picking"
              ? "Order Picking"
              : route === "ready"
                ? "Ready Orders"
                : route === "customers"
                  ? "Order Customers"
                  : detailOrder
                    ? detailOrder.orderNo
                    : "Orders"
        }
        description="Manual ERP order flow from confirmed order to picking, ready, pickup, or delivery handoff."
        demoMode={data.demoMode}
      />

      {route === "list" ? (
        <>
          <FilterBar
            filters={filters}
            outlets={data.scopeOptions.outlets}
            salespeople={data.scopeOptions.salespeople}
          />
          <KpiGrid kpis={data.dashboard.kpis} />
          <Alerts alerts={data.dashboard.alerts} />
        </>
      ) : null}

      {route === "create" ? (
        <CreateOrderForm
          profile={profile}
          customers={data.customers}
          stockItems={data.stockItems}
          scopeOptions={data.scopeOptions}
        />
      ) : null}

      {route === "picking" ? (
        <PickingForms orders={data.orders} items={data.items} />
      ) : null}

      {route === "ready" ? (
        <div className="space-y-4">
          <MarkReadyForm orders={data.orders} />
          <ReadyOrderActions orders={data.orders} />
        </div>
      ) : null}

      {route === "customers" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <QuickCustomerForm profile={profile} outlets={data.scopeOptions.outlets} />
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>Searchable during order creation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.customers.map((customer) => (
                <div key={customer.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{customer.name}</div>
                    {customer.hasOverdueCredit ? (
                      <Badge variant="warning">Credit warning</Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {customer.phone || "-"} - {customer.categoryName}
                  </div>
                  <div className="mt-1">{customer.address || "-"}</div>
                  {customer.remarks ? (
                    <div className="mt-1 text-muted-foreground">
                      {customer.remarks}
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {detailOrder ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <OrderSummary order={detailOrder} />
            <LinkedDeliverySummary
              order={detailOrder}
              linkedDeliveries={detailLinkedDeliveries}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <EditOrderBeforePickingForm order={detailOrder} />
            <div className="space-y-4">
              <PickingForms
                orders={[detailOrder]}
                items={detailItems}
                selectedOrderId={detailOrder.id}
              />
              <MarkReadyForm orders={[detailOrder]} />
              <ReadyOrderActions orders={[detailOrder]} />
            </div>
          </div>
        </div>
      ) : route === "detail" ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Order was not found in your current scope.
          </CardContent>
        </Card>
      ) : null}

      <OrdersTableClient
        orders={detailOrder ? [detailOrder] : data.orders}
        items={detailItems}
        reservations={detailReservations}
        pickingEntries={detailPickingEntries}
        notifications={detailNotifications}
        reports={data.dashboard.reports}
      />
    </div>
  )
}
