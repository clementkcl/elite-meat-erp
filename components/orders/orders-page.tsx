import Link from "next/link"
import {
  BarChart3,
  ClipboardList,
  PackageCheck,
  Plus,
  ScanLine,
  Truck,
  UserRoundPlus,
  Users,
} from "lucide-react"

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
  FinalOrderPriceForm,
  MarkReadyForm,
  PickupCompletedButton,
  PickingForms,
  QuickCustomerNamePhoneForm,
  ReadyOrderActions,
} from "@/components/orders/orders-forms"
import {
  OrderReportsClient,
  OrdersTableClient,
} from "@/components/orders/orders-table-client"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { requireCurrentProfile } from "@/lib/auth/session"
import { getOrdersPageData } from "@/lib/orders/data"
import type { UserRole } from "@/lib/auth/types"
import type {
  CustomerOrder,
  CustomerOrderItem,
  OrderFilters,
  OrderLinkedDelivery,
  OrderNotificationEvent,
  OrderPickingEntry,
  OrderStockReservation,
} from "@/lib/orders/types"

export type OrdersRoute =
  | "list"
  | "create"
  | "picking"
  | "ready"
  | "customers"
  | "reports"
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

function workerPriceText(order: CustomerOrder) {
  if (order.status === "READY" && order.totalOrderPrice <= 0) {
    return "Price required"
  }

  if (
    order.totalOrderPrice > 0 &&
    !["NEW", "PREPARING", "READY"].includes(order.status)
  ) {
    return money(order.totalOrderPrice)
  }

  return "After picking"
}

function workerStatusText(order: CustomerOrder) {
  if (order.status === "READY" && order.totalOrderPrice <= 0) {
    return "Price Required"
  }

  if (order.status === "READY_FOR_PICKUP") {
    return "Ready for Pickup"
  }

  if (order.status === "READY_FOR_DELIVERY") {
    return "Pending Delivery"
  }

  return order.displayStatus
}

function kg(value: number) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })} kg`
}

function shortDate(value: string | null) {
  return value ? value.slice(0, 10) : "-"
}

function isAdvancedOrderUser(roles: UserRole[]) {
  return roles.some((role) =>
    [
      "retail_manager",
      "delivery_manager",
      "processing_manager",
      "admin",
      "director",
    ].includes(role)
  )
}

function isDeliveryWorker(roles: UserRole[]) {
  return roles.includes("delivery_team_general_worker")
}

function totalEstimatedWeight(items: CustomerOrderItem[]) {
  return items.reduce((sum, item) => sum + item.estimatedWeightKg, 0)
}

function totalPickedWeight(items: CustomerOrderItem[]) {
  return items.reduce((sum, item) => sum + item.preparedWeightKg, 0)
}

function fulfillmentDetail(order: CustomerOrder) {
  if (order.fulfillmentType === "DELIVERY") {
    return {
      label: "Delivery",
      primary: order.deliveryAddress || "-",
      secondary:
        order.deliveryLatitude !== null && order.deliveryLongitude !== null
          ? `${order.deliveryLatitude}, ${order.deliveryLongitude}`
          : "GPS optional",
    }
  }

  if (order.fulfillmentType === "INTERNAL_TRANSFER") {
    return {
      label: "Internal transfer",
      primary: `${order.fromLocationName} to ${order.toLocationName}`,
      secondary: "Single required date/time",
    }
  }

  return {
    label: "Pickup",
    primary: order.pickupLocationName,
    secondary: "Pickup completion does not need photo or signature",
  }
}

function isProcessingOverdue(order: CustomerOrder, item: CustomerOrderItem) {
  if (!item.processingRequired || item.preparedWeightKg > 0) {
    return false
  }

  const requiredDate = shortDate(order.requiredAt ?? order.requiredDate)
  const today = new Date().toISOString().slice(0, 10)

  return requiredDate !== "-" && requiredDate < today
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
          <Link href="/orders/ready">Price / Ready</Link>
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
            <option value="READY">Price / Ready</option>
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

function TaskActionGrid({
  roles,
  advancedOrderUser,
}: {
  roles: UserRole[]
  advancedOrderUser: boolean
}) {
  const deliveryAction = advancedOrderUser
    ? {
        label: "Delivery Dashboard",
        detail: "Delivery overview",
        href: "/delivery",
        icon: Truck,
      }
    : isDeliveryWorker(roles)
      ? {
          label: "Driver Delivery",
          detail: "Today jobs and proof photo",
          href: "/delivery/driver",
          icon: Truck,
        }
      : null

  const actions = [
    {
      label: "Create Order",
      detail: "Pickup, delivery, or transfer",
      href: "/orders/create",
      icon: Plus,
    },
    {
      label: "Pick Order",
      detail: "Scan barcode or manual weight",
      href: "/orders/picking",
      icon: ScanLine,
    },
    {
      label: "Price / Ready",
      detail: "Final price, pickup, delivery",
      href: "/orders/ready",
      icon: PackageCheck,
    },
    deliveryAction,
    {
      label: "Customers",
      detail: "Search or quick add",
      href: "/orders/customers",
      icon: Users,
    },
    advancedOrderUser
      ? {
          label: "Reports",
          detail: "Manager summaries",
          href: "/orders/reports",
          icon: BarChart3,
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => Boolean(action))

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {actions.map((action) => {
        const Icon = action.icon

        return (
          <Button
            key={action.href}
            asChild
            variant="outline"
            className="min-h-24 justify-start whitespace-normal rounded-md p-4 text-left"
          >
            <Link href={action.href} className="flex items-center gap-3">
              <Icon className="size-6 shrink-0" />
              <span className="min-w-0">
                <span className="block text-base font-semibold leading-5">
                  {action.label}
                </span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {action.detail}
                </span>
              </span>
            </Link>
          </Button>
        )
      })}
    </div>
  )
}

function SimpleOrderTaskCard({
  order,
  items,
  actionLabel,
}: {
  order: CustomerOrder
  items: CustomerOrderItem[]
  actionLabel: string
}) {
  const estimated = totalEstimatedWeight(items)
  const picked = totalPickedWeight(items)

  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="break-words text-base font-semibold">{order.orderNo}</div>
          <div className="mt-1 break-words text-sm text-muted-foreground">
            {order.customerName || "Internal transfer"} -{" "}
            {dateText(order.requiredAt ?? order.requiredDate)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={workerStatusText(order)} />
          {order.stockNotEnough ? (
            <Badge variant="warning">Stock not enough</Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground">Estimated</div>
          <div className="font-medium tabular-nums">{kg(estimated)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Picked</div>
          <div className="font-medium tabular-nums">{kg(picked)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Type</div>
          <div className="font-medium">
            {order.fulfillmentType.replaceAll("_", " ")}
          </div>
        </div>
      </div>
      <Button asChild className="mt-4 min-h-11 w-full">
        <Link href={`/orders/${order.id}`}>{actionLabel}</Link>
      </Button>
    </div>
  )
}

function TaskQueue({
  title,
  description,
  orders,
  items,
  actionLabel,
}: {
  title: string
  description: string
  orders: CustomerOrder[]
  items: CustomerOrderItem[]
  actionLabel: string
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant={orders.length > 0 ? "secondary" : "outline"}>
          {orders.length}
        </Badge>
      </div>
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            No orders in this task queue.
          </div>
        ) : null}
        {orders.slice(0, 5).map((order) => (
          <SimpleOrderTaskCard
            key={order.id}
            order={order}
            items={items.filter((item) => item.orderId === order.id)}
            actionLabel={actionLabel}
          />
        ))}
      </div>
    </section>
  )
}

function ManagerTodayProgress({ orders }: { orders: CustomerOrder[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const todayOrders = orders.filter((order) =>
    (order.requiredAt ?? order.requiredDate ?? order.createdAt).startsWith(today)
  )
  const completed = todayOrders.filter((order) =>
    ["PICKED_UP", "DELIVERED"].includes(order.status)
  ).length
  const pendingDelivery = todayOrders.filter(
    (order) => order.status === "READY_FOR_DELIVERY"
  ).length
  const needsAction = todayOrders.filter((order) =>
    ["NEW", "PREPARING", "READY"].includes(order.status)
  ).length
  const total = todayOrders.length
  const completePercent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Today order progress</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick manager view before opening advanced lists or reports.
          </p>
        </div>
        <Badge variant="secondary">{completePercent}% complete</Badge>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${completePercent}%` }}
        />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {[
          ["Today orders", total],
          ["Need action", needsAction],
          ["Pending delivery", pendingDelivery],
          ["Completed", completed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrdersTaskHome({
  orders,
  items,
  roles,
  advancedOrderUser,
}: {
  orders: CustomerOrder[]
  items: CustomerOrderItem[]
  roles: UserRole[]
  advancedOrderUser: boolean
}) {
  const needsPicking = orders.filter((order) =>
    ["NEW", "PREPARING"].includes(order.status)
  )
  const priceRequired = orders.filter(
    (order) => order.status === "READY" && order.totalOrderPrice <= 0
  )
  const readyPickup = orders.filter(
    (order) => order.status === "READY_FOR_PICKUP"
  )
  const readyDelivery = orders.filter(
    (order) =>
      order.fulfillmentType === "DELIVERY" &&
      order.status === "READY_FOR_DELIVERY"
  )
  const stockNotEnough = orders.filter((order) => order.stockNotEnough)
  const processingOrderIds = new Set(
    items
      .filter((item) => item.processingRequired && item.preparedWeightKg <= 0)
      .map((item) => item.orderId)
  )
  const processingRequired = orders.filter((order) =>
    processingOrderIds.has(order.id)
  )

  return (
    <div className="space-y-6">
      {advancedOrderUser ? <ManagerTodayProgress orders={orders} /> : null}
      <div className="rounded-md border bg-emerald-50/40 p-4">
        <div className="text-sm font-semibold">Today&apos;s order work</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with the next task: create, pick, price, pickup, or delivery.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {["Create Order", "Pick Items", "Enter final price", "Pickup / Delivery"].map((step, index) => (
            <div key={step} className="rounded-md border bg-background px-3 py-2 text-sm">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Step {index + 1}
              </div>
              <div className="mt-1 font-medium">{step}</div>
            </div>
          ))}
        </div>
      </div>
      <TaskActionGrid roles={roles} advancedOrderUser={advancedOrderUser} />
      <div className="grid gap-5 xl:grid-cols-2">
        <TaskQueue
          title="Need Picking"
          description="Start here for confirmed or in-progress orders."
          orders={needsPicking}
          items={items}
          actionLabel="Open Picking"
        />
        <TaskQueue
          title="Price Required"
          description="Picking is done. Enter final total price next."
          orders={priceRequired}
          items={items}
          actionLabel="Enter final price"
        />
        <TaskQueue
          title="Ready for Pickup"
          description="Customer pickup orders that need completion."
          orders={readyPickup}
          items={items}
          actionLabel="Open Pickup"
        />
        <TaskQueue
          title="Pending Delivery"
          description="Delivery team can see these orders now."
          orders={readyDelivery}
          items={items}
          actionLabel="Open Delivery"
        />
        <TaskQueue
          title="Stock Not Enough"
          description="Orders still created and visible for picking."
          orders={stockNotEnough}
          items={items}
          actionLabel="Review Order"
        />
        <TaskQueue
          title="Processing Required"
          description="Orders with items marked for processing."
          orders={processingRequired}
          items={items}
          actionLabel="Review Items"
        />
      </div>
    </div>
  )
}

function AdvancedOrdersSection({
  filters,
  data,
  orders,
  items,
  reservations,
  pickingEntries,
  notifications,
}: {
  filters: OrderFilters
  data: Awaited<ReturnType<typeof getOrdersPageData>>
  orders: CustomerOrder[]
  items: CustomerOrderItem[]
  reservations: OrderStockReservation[]
  pickingEntries: OrderPickingEntry[]
  notifications: OrderNotificationEvent[]
}) {
  return (
    <details className="rounded-md border">
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 text-sm font-medium">
        <ClipboardList className="size-4" />
        Advanced Order List
      </summary>
      <div className="space-y-4 border-t p-4">
        <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
          <Link href="/orders/reports">Open Order Reports</Link>
        </Button>
        <FilterBar
          filters={filters}
          outlets={data.scopeOptions.outlets}
          salespeople={data.scopeOptions.salespeople}
        />
        <KpiGrid kpis={data.dashboard.kpis} />
        <Alerts alerts={data.dashboard.alerts} />
        <OrdersTableClient
          orders={orders}
          items={items}
          reservations={reservations}
          pickingEntries={pickingEntries}
          notifications={notifications}
        />
      </div>
    </details>
  )
}

function OrderSummary({
  order,
  advancedOrderUser,
}: {
  order: CustomerOrder
  advancedOrderUser: boolean
}) {
  const fulfillment = fulfillmentDetail(order)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{order.orderNo}</CardTitle>
            <CardDescription>
              {order.customerName} - {order.fulfillmentType.replaceAll("_", " ")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={workerStatusText(order)} />
            {advancedOrderUser ? (
              <Badge variant="secondary">{order.sourceType}</Badge>
            ) : null}
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
            <div className="text-muted-foreground">Order type</div>
            <div className="font-medium">{fulfillment.label}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Final price</div>
            <div className="font-medium">{workerPriceText(order)}</div>
          </div>
          {advancedOrderUser ? (
            <>
              <div>
                <div className="text-muted-foreground">Created by</div>
                <div className="font-medium">{order.createdByName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Outlet</div>
                <div className="font-medium">{order.outletName}</div>
              </div>
            </>
          ) : null}
          <div>
            <div className="text-muted-foreground">{fulfillment.label} detail</div>
            <div className="font-medium">{fulfillment.primary}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Detail note</div>
            <div className="font-medium">{fulfillment.secondary}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Phone</div>
            <div className="font-medium">{order.customerPhone || "-"}</div>
          </div>
          {advancedOrderUser ? (
            <div>
              <div className="text-muted-foreground">Reservation expires</div>
              <div className="font-medium">{dateText(order.reservationExpiresAt)}</div>
            </div>
          ) : null}
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

function DetailAlerts({
  order,
  items,
}: {
  order: CustomerOrder
  items: CustomerOrderItem[]
}) {
  const processingRequired = items.filter((item) => item.processingRequired)
  const processingOverdue = processingRequired.filter((item) =>
    isProcessingOverdue(order, item)
  )
  const priceRequired = order.status === "READY" && order.totalOrderPrice <= 0

  if (
    !order.stockNotEnough &&
    processingRequired.length === 0 &&
    !priceRequired &&
    !order.customerRemarks &&
    order.status !== "CANCELLED" &&
    order.status !== "FAILED"
  ) {
    return null
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {order.stockNotEnough ? (
        <Card className="border-red-200 bg-red-50/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">
              Stock not enough
            </CardTitle>
            <CardDescription className="text-red-700/80">
              This order still appears in picking. Staff can pick available stock
              and resolve the shortage operationally.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {priceRequired ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-800">
              Price required
            </CardTitle>
            <CardDescription className="text-amber-800/80">
              Picking is complete. Enter final total price before pickup or delivery.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {processingRequired.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-800">
              Processing required
            </CardTitle>
            <CardDescription className="text-amber-800/80">
              {processingOverdue.length > 0
                ? `${processingOverdue.length} processing item is overdue by the required date.`
                : `${processingRequired.length} item needs processing before completion.`}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {order.customerRemarks ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer remarks</CardTitle>
            <CardDescription>{order.customerRemarks}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {order.status === "CANCELLED" ? (
        <Card className="border-red-200 bg-red-50/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">
              Order cancelled
            </CardTitle>
            <CardDescription className="text-red-700/80">
              {order.cancellationReason || "Reserved stock was released."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {order.status === "FAILED" ? (
        <Card className="border-red-200 bg-red-50/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">
              Delivery failed
            </CardTitle>
            <CardDescription className="text-red-700/80">
              Return/reinbound follow-up is handled by the Delivery and Stock
              modules.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  )
}

function DetailItems({
  order,
  items,
}: {
  order: CustomerOrder
  items: CustomerOrderItem[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Items</CardTitle>
        <CardDescription>
          Estimated weight, picked weight, remarks, and stock status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            No items were found for this order.
          </div>
        ) : null}
        {items.map((item) => {
          const overdue = isProcessingOverdue(order, item)

          return (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium">{item.itemLabel}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.orderingUnit.replaceAll("_", " ")} - requested{" "}
                    {item.requestedQuantity || item.requestedWeightKg || "-"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={item.status} />
                  {item.stockNotEnough ? (
                    <Badge variant="warning">Stock not enough</Badge>
                  ) : (
                    <Badge variant="success">Reserved</Badge>
                  )}
                  {item.processingRequired ? (
                    <Badge variant={overdue ? "destructive" : "secondary"}>
                      {overdue ? "Processing overdue" : "Processing required"}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <div className="text-muted-foreground">Brand</div>
                  <div className="font-medium">
                    {item.preferredBrandName || "No preference"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Estimated</div>
                  <div className="font-medium tabular-nums">
                    {kg(item.estimatedWeightKg)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Picked</div>
                  <div className="font-medium tabular-nums">
                    {kg(item.preparedWeightKg)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Remaining</div>
                  <div className="font-medium tabular-nums">
                    {kg(item.remainingWeightKg)}
                  </div>
                </div>
              </div>
              {Object.keys(item.customization).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(item.customization).flatMap(([group, options]) =>
                    options.map((option) => (
                      <Badge key={`${group}-${option}`} variant="outline">
                        {group}: {option}
                      </Badge>
                    ))
                  )}
                </div>
              ) : null}
              {item.itemRequestRemarks || item.notes ? (
                <div className="mt-3 rounded-md bg-muted/30 p-3 text-sm">
                  {item.itemRequestRemarks || item.notes}
                </div>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function StatusTimeline({
  order,
  reservations,
  pickingEntries,
  notifications,
  linkedDeliveries,
}: {
  order: CustomerOrder
  reservations: OrderStockReservation[]
  pickingEntries: OrderPickingEntry[]
  notifications: OrderNotificationEvent[]
  linkedDeliveries: OrderLinkedDelivery[]
}) {
  const events = [
    {
      id: "created",
      when: order.createdAt,
      title: "Order confirmed",
      detail: `${order.createdByName} created ${order.orderNo}`,
      tone: "success",
    },
    ...reservations.map((reservation) => ({
      id: `reservation-${reservation.id}`,
      when: reservation.createdAt,
      title:
        reservation.status === "ACTIVE"
          ? "Stock reserved"
          : `Reservation ${reservation.status.toLowerCase()}`,
      detail: `${reservation.itemLabel} - ${kg(reservation.reservedWeightKg)}`,
      tone: reservation.stockNotEnough ? "warning" : "success",
    })),
    ...pickingEntries.map((entry) => ({
      id: `pick-${entry.id}`,
      when: entry.createdAt,
      title: entry.entryType.replaceAll("_", " "),
      detail:
        entry.mismatchMessage ||
        `${entry.itemLabel} - ${kg(entry.pickedWeightKg)}`,
      tone: entry.entryType === "MISMATCH" ? "warning" : "success",
    })),
    ...notifications.map((event) => ({
      id: `notification-${event.id}`,
      when: event.createdAt,
      title: event.eventType.replaceAll("_", " "),
      detail: `${event.channel} - ${event.status}`,
      tone: "neutral",
    })),
    ...linkedDeliveries.map((delivery) => ({
      id: `delivery-${delivery.id}`,
      when: delivery.createdAt,
      title: "Delivery created",
      detail: `${delivery.deliveryNo} - ${delivery.status.replaceAll("_", " ")}`,
      tone: "neutral",
    })),
    ...(order.pickedUpAt
      ? [
          {
            id: "picked-up",
            when: order.pickedUpAt,
            title: "Picked up",
            detail: order.pickedUpByName,
            tone: "success",
          },
        ]
      : []),
    ...(order.status === "CANCELLED"
      ? [
          {
            id: "cancelled",
            when: order.createdAt,
            title: "Cancelled",
            detail: order.cancellationReason || "Reservation released",
            tone: "danger",
          },
        ]
      : []),
  ].sort((a, b) => b.when.localeCompare(a.when))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status timeline</CardTitle>
        <CardDescription>
          Order events, reservation changes, picking logs, and delivery notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="flex gap-3 rounded-md border p-3 text-sm">
            <div
              className={
                event.tone === "danger"
                  ? "mt-1 size-2 rounded-full bg-red-500"
                  : event.tone === "warning"
                    ? "mt-1 size-2 rounded-full bg-amber-500"
                    : event.tone === "success"
                      ? "mt-1 size-2 rounded-full bg-emerald-500"
                      : "mt-1 size-2 rounded-full bg-muted-foreground"
              }
            />
            <div className="min-w-0">
              <div className="font-medium">{event.title}</div>
              <div className="text-muted-foreground">{event.detail}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {dateText(event.when)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ReadyOrderCard({
  order,
  items,
  linkedDeliveries,
}: {
  order: CustomerOrder
  items: CustomerOrderItem[]
  linkedDeliveries: OrderLinkedDelivery[]
}) {
  const totalEstimated = items.reduce(
    (sum, item) => sum + item.estimatedWeightKg,
    0
  )
  const totalPicked = items.reduce((sum, item) => sum + item.preparedWeightKg, 0)
  const delivery = linkedDeliveries.find(
    (linkedDelivery) => linkedDelivery.orderId === order.id
  )
  const requiredAt = order.requiredAt ?? order.requiredDate
  const orderType = order.fulfillmentType.replaceAll("_", " ")
  const priceRequired = order.status === "READY" && order.totalOrderPrice <= 0

  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="break-words text-base font-semibold">{order.orderNo}</div>
          <div className="mt-1 break-words text-sm text-muted-foreground">
            {order.customerName || "Internal transfer"}
          </div>
        </div>
        {priceRequired ? (
          <Badge variant="warning">Price Required</Badge>
        ) : (
          <StatusBadge value={workerStatusText(order)} />
        )}
      </div>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <div className="text-muted-foreground">Order type</div>
          <div className="font-medium">{orderType}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Required</div>
          <div className="font-medium">{dateText(requiredAt)}</div>
        </div>
      </div>
      <div className="mt-3 rounded-md bg-muted/30 p-3 text-sm">
        <div className="text-muted-foreground">Picked / estimated weight</div>
        <div className="font-medium tabular-nums">
          {kg(totalPicked)} / {kg(totalEstimated)}
        </div>
      </div>

      <div className="mt-4">
        {priceRequired ? (
          <Button asChild className="min-h-11 w-full">
            <Link href={`/orders/${order.id}`}>Enter final price</Link>
          </Button>
        ) : order.status === "READY_FOR_PICKUP" ? (
          <PickupCompletedButton orderId={order.id} />
        ) : order.fulfillmentType === "DELIVERY" ? (
          <Button asChild className="min-h-11 w-full">
            <Link href={delivery?.actionHref ?? "/delivery"}>
              {delivery ? "Open Delivery" : "View Delivery"}
            </Link>
          </Button>
        ) : (
          <Button asChild className="min-h-11 w-full">
            <Link href={`/orders/${order.id}`}>Open Order</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

function ReadyOrdersBoard({
  orders,
  items,
  linkedDeliveries,
}: {
  orders: CustomerOrder[]
  items: CustomerOrderItem[]
  linkedDeliveries: OrderLinkedDelivery[]
}) {
  const readyOrders = orders.filter((order) =>
    ["READY", "READY_FOR_PICKUP", "READY_FOR_DELIVERY"].includes(order.status)
  )
  const priceRequiredOrders = readyOrders.filter(
    (order) => order.status === "READY" && order.totalOrderPrice <= 0
  )
  const pickupOrders = readyOrders.filter(
    (order) =>
      order.status === "READY_FOR_PICKUP" &&
      order.fulfillmentType !== "INTERNAL_TRANSFER"
  )
  const deliveryOrders = readyOrders.filter(
    (order) => order.status === "READY_FOR_DELIVERY" && order.fulfillmentType === "DELIVERY"
  )
  const transferOrders = readyOrders.filter(
    (order) => order.fulfillmentType === "INTERNAL_TRANSFER" && order.status !== "READY"
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Price Required</CardTitle>
            <Badge variant="secondary">{priceRequiredOrders.length}</Badge>
          </div>
          <CardDescription>
            Picking is complete. Enter final price so pickup or delivery can continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {priceRequiredOrders.length === 0 ? (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              No orders need final price.
            </div>
          ) : (
            <FinalOrderPriceForm orders={priceRequiredOrders} />
          )}
          {priceRequiredOrders.map((order) => (
            <ReadyOrderCard
              key={order.id}
              order={order}
              items={items.filter((item) => item.orderId === order.id)}
              linkedDeliveries={linkedDeliveries}
            />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Ready for Pickup</CardTitle>
              <Badge variant="secondary">{pickupOrders.length}</Badge>
            </div>
            <CardDescription>
              Staff can tap Picked Up when the customer collects the order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pickupOrders.length === 0 ? (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                No pickup orders are ready.
              </div>
            ) : null}
            {pickupOrders.map((order) => (
              <ReadyOrderCard
                key={order.id}
                order={order}
                items={items.filter((item) => item.orderId === order.id)}
                linkedDeliveries={linkedDeliveries}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Pending Delivery</CardTitle>
              <Badge variant="secondary">{deliveryOrders.length}</Badge>
            </div>
            <CardDescription>
              Delivery team can accept these orders in Delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveryOrders.length === 0 ? (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                No delivery orders are ready for delivery.
              </div>
            ) : null}
            {deliveryOrders.map((order) => (
              <ReadyOrderCard
                key={order.id}
                order={order}
                items={items.filter((item) => item.orderId === order.id)}
                linkedDeliveries={linkedDeliveries}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {transferOrders.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Internal Transfer</CardTitle>
              <Badge variant="secondary">{transferOrders.length}</Badge>
            </div>
            <CardDescription>
              Transfer orders stay visible here until staff open them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {transferOrders.map((order) => (
              <ReadyOrderCard
                key={order.id}
                order={order}
                items={items.filter((item) => item.orderId === order.id)}
                linkedDeliveries={linkedDeliveries}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
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

  if (order.status === "READY" && order.totalOrderPrice <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery</CardTitle>
          <CardDescription>
            Enter final price before Delivery can accept this order.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

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
              Open it from the Delivery module list.
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
  const initialCustomerId = Array.isArray(searchParams.customerId)
    ? searchParams.customerId[0]
    : searchParams.customerId ?? ""
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
          description="Create, pick, price, and move orders through the next task."
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
  const advancedOrderUser = isAdvancedOrderUser(profile.roles)
  const customerQuery = filters.customer?.trim().toLowerCase() ?? ""
  const visibleCustomers = data.customers.filter(
    (customer) =>
      !customerQuery ||
      customer.name.toLowerCase().includes(customerQuery) ||
      customer.phone.toLowerCase().includes(customerQuery)
  )
  const detailCanPick = detailOrder
    ? ["NEW", "PREPARING"].includes(detailOrder.status)
    : false
  const detailCanReady = detailOrder
    ? ["NEW", "PREPARING"].includes(detailOrder.status)
    : false
  const detailPriceRequired = detailOrder
    ? detailOrder.status === "READY" && detailOrder.totalOrderPrice <= 0
    : false
  const detailCanCancel = detailOrder
    ? !["DELIVERED", "FAILED", "CANCELLED"].includes(detailOrder.status)
    : false
  const detailCanPickup = detailOrder?.status === "READY_FOR_PICKUP"
  const detailCanEdit = detailOrder?.status === "NEW"

  return (
    <div className="space-y-5">
      <Header
        title={
          route === "create"
            ? "Create Order"
            : route === "picking"
              ? "Order Picking"
              : route === "ready"
                ? "Price / Ready"
                : route === "customers"
                  ? "Order Customers"
                  : route === "reports"
                    ? "Order Reports"
                    : detailOrder
                      ? detailOrder.orderNo
                      : "Orders"
        }
        description="Create, pick, price, and move orders through one simple workflow."
        demoMode={data.demoMode}
      />

      {route === "list" ? (
        <div className="space-y-6">
          <OrdersTaskHome
            orders={data.orders}
            items={data.items}
            roles={profile.roles}
            advancedOrderUser={advancedOrderUser}
          />
          {advancedOrderUser ? (
            <AdvancedOrdersSection
              filters={filters}
              data={data}
              orders={data.orders}
              items={data.items}
              reservations={data.reservations}
              pickingEntries={data.pickingEntries}
              notifications={data.notifications}
            />
          ) : null}
        </div>
      ) : null}

      {route === "create" ? (
        <CreateOrderForm
          profile={profile}
          customers={data.customers}
          stockItems={data.stockItems}
          brandOptions={data.brandOptions}
          scopeOptions={data.scopeOptions}
          initialCustomerId={initialCustomerId}
        />
      ) : null}

      {route === "picking" ? (
        <PickingForms
          orders={data.orders}
          items={data.items}
          pickingEntries={data.pickingEntries}
        />
      ) : null}

      {route === "ready" ? (
        <div className="space-y-4">
          <ReadyOrdersBoard
            orders={data.orders}
            items={data.items}
            linkedDeliveries={data.linkedDeliveries}
          />
          {advancedOrderUser ? (
            <AdvancedOrdersSection
              filters={filters}
              data={data}
              orders={data.orders}
              items={data.items}
              reservations={data.reservations}
              pickingEntries={data.pickingEntries}
              notifications={data.notifications}
            />
          ) : null}
        </div>
      ) : null}

      {route === "customers" ? (
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="min-h-12 rounded-md border bg-background px-3 text-base md:text-sm"
                name="customer"
                defaultValue={filters.customer ?? ""}
                placeholder="Search customer name or phone"
                aria-label="Search customer name or phone"
              />
              <Button type="submit" className="min-h-12">
                Search
              </Button>
            </form>
          </div>
          <details className="rounded-md border">
            <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 text-sm font-medium">
              <UserRoundPlus className="size-4" />
              Add Customer
            </summary>
            <div className="border-t p-4">
              <QuickCustomerNamePhoneForm profile={profile} />
            </div>
          </details>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Customers</h2>
              <Badge variant="secondary">{visibleCustomers.length}</Badge>
            </div>
            {visibleCustomers.length === 0 ? (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                No customer matches this search. Use Add Customer to save name and phone.
              </div>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleCustomers.map((customer) => (
                <div key={customer.id} className="rounded-md border p-4 text-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold">
                        {customer.name}
                      </div>
                      <div className="mt-1 break-words text-muted-foreground">
                        {customer.phone || "No phone saved"}
                      </div>
                    </div>
                    {advancedOrderUser && customer.hasOverdueCredit ? (
                      <Badge variant="warning">Credit warning</Badge>
                    ) : null}
                  </div>
                  <Button asChild className="mt-4 min-h-11 w-full">
                    <Link href={`/orders/create?customerId=${customer.id}`}>
                      Create Order
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>
          {advancedOrderUser ? (
            <details className="rounded-md border">
              <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 text-sm font-medium">
                <ClipboardList className="size-4" />
                Advanced Customer Details
              </summary>
              <div className="grid gap-3 border-t p-4 lg:grid-cols-2">
                {visibleCustomers.map((customer) => (
                  <div key={customer.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{customer.name}</div>
                    <div className="mt-1 text-muted-foreground">
                      {customer.categoryName} - {customer.creditTermDays} days
                    </div>
                    {customer.address ? (
                      <div className="mt-2 break-words">{customer.address}</div>
                    ) : null}
                    {customer.remarks ? (
                      <div className="mt-2 rounded-md bg-muted/30 p-2">
                        {customer.remarks}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      {route === "reports" ? (
        advancedOrderUser ? (
          <div className="space-y-4">
            <FilterBar
              filters={filters}
              outlets={data.scopeOptions.outlets}
              salespeople={data.scopeOptions.salespeople}
            />
            <KpiGrid kpis={data.dashboard.kpis} />
            <Alerts alerts={data.dashboard.alerts} />
            <OrderReportsClient reports={data.dashboard.reports} />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Reports unavailable</CardTitle>
              <CardDescription>
                Order reports are available to managers, admins, and directors.
              </CardDescription>
            </CardHeader>
          </Card>
        )
      ) : null}

      {detailOrder ? (
        <div className="space-y-4">
          <DetailAlerts order={detailOrder} items={detailItems} />
          <div className="grid gap-4 xl:grid-cols-2">
            <OrderSummary
              order={detailOrder}
              advancedOrderUser={advancedOrderUser}
            />
            <LinkedDeliverySummary
              order={detailOrder}
              linkedDeliveries={detailLinkedDeliveries}
            />
          </div>
          <DetailItems order={detailOrder} items={detailItems} />
          <div className="grid gap-4 xl:grid-cols-2">
            {advancedOrderUser ? (
              <StatusTimeline
                order={detailOrder}
                reservations={detailReservations}
                pickingEntries={detailPickingEntries}
                notifications={detailNotifications}
                linkedDeliveries={detailLinkedDeliveries}
              />
            ) : (
              <details className="rounded-md border bg-background">
                <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 text-sm font-medium">
                  <ClipboardList className="size-4" />
                  Activity log
                </summary>
                <div className="border-t p-3">
                  <StatusTimeline
                    order={detailOrder}
                    reservations={detailReservations}
                    pickingEntries={detailPickingEntries}
                    notifications={detailNotifications}
                    linkedDeliveries={detailLinkedDeliveries}
                  />
                </div>
              </details>
            )}
            <div className="space-y-4">
              {detailCanPick ? (
                <PickingForms
                  orders={[detailOrder]}
                  items={detailItems}
                  pickingEntries={detailPickingEntries}
                  selectedOrderId={detailOrder.id}
                />
              ) : null}
              {detailCanReady ? <MarkReadyForm orders={[detailOrder]} /> : null}
              {detailPriceRequired ? (
                <FinalOrderPriceForm orders={[detailOrder]} />
              ) : null}
              {detailCanPickup || detailCanCancel ? (
                <ReadyOrderActions orders={[detailOrder]} />
              ) : null}
              {detailCanEdit ? (
                <EditOrderBeforePickingForm order={detailOrder} />
              ) : null}
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

      {route !== "list" && route !== "create" && route !== "picking" && route !== "ready" && route !== "customers" && route !== "reports" && advancedOrderUser ? (
        <details className="rounded-md border">
          <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 text-sm font-medium">
            <ClipboardList className="size-4" />
            Advanced Order Records
          </summary>
          <div className="border-t p-4">
            <OrdersTableClient
              orders={detailOrder ? [detailOrder] : data.orders}
              items={detailItems}
              reservations={detailReservations}
              pickingEntries={detailPickingEntries}
              notifications={detailNotifications}
            />
          </div>
        </details>
      ) : null}
    </div>
  )
}
