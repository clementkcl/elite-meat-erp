import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import { DeliveryDashboardCharts } from "@/components/delivery/delivery-charts"
import {
  DeliveryPaymentForm,
  DeliveryStatusForm,
  DriverLocationForm,
  NewDeliveryOrderForm,
  ProofUploadForm,
  VehicleForm,
} from "@/components/delivery/delivery-forms"
import {
  CustomerOrderDeliveryStatusForm,
  CustomerOrderProofUploadForm,
} from "@/components/orders/orders-forms"
import { getDeliveryPageData } from "@/lib/delivery/data"
import { getOrdersPageData } from "@/lib/orders/data"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { requireCurrentProfile } from "@/lib/auth/session"
import type { UserRole } from "@/lib/auth/types"

export type DeliveryRoute =
  | "dashboard"
  | "orders"
  | "new-order"
  | "driver"
  | "vehicles"
  | "payments"

type TableRow = Record<string, string | number | boolean>

const deliveryRoles: UserRole[] = [
  "delivery_team_general_worker",
  "delivery_manager",
  "admin",
  "director",
]

const deliveryOperatorRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
]

const deliveryManagerRoles: UserRole[] = ["delivery_manager", "admin"]
const deliveryPaymentRoles: UserRole[] = [
  "delivery_team_general_worker",
  "delivery_manager",
  "account",
  "admin",
]

const titles: Record<DeliveryRoute, { title: string; description: string }> = {
  dashboard: {
    title: "Delivery Dashboard",
    description: "Dispatch workload, vehicle readiness, payment follow-up, and status mix.",
  },
  orders: {
    title: "Delivery Orders",
    description: "Track progress, proof of delivery, and full order history.",
  },
  "new-order": {
    title: "New Delivery Order",
    description: "Record customer delivery details, first item, vehicle, driver, and payment terms.",
  },
  driver: {
    title: "Driver View",
    description: "Update route progress and record delivery location checkpoints.",
  },
  vehicles: {
    title: "Vehicles",
    description: "Maintain active lorries, vans, and delivery capacity.",
  },
  payments: {
    title: "Delivery Payments",
    description: "Record cash, credit, and online transfer collection status.",
  },
}

const navItems: { route: DeliveryRoute; href: string; label: string }[] = [
  { route: "dashboard", href: "/delivery/dashboard", label: "Dashboard" },
  { route: "orders", href: "/delivery/orders", label: "Orders" },
  { route: "new-order", href: "/delivery/new-order", label: "New Order" },
  { route: "driver", href: "/delivery/driver", label: "Driver" },
  { route: "vehicles", href: "/delivery/vehicles", label: "Vehicles" },
  { route: "payments", href: "/delivery/payments", label: "Payments" },
]

const orderColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "customerName", header: "Customer" },
  { key: "customerLocation", header: "Location" },
  { key: "vehicleNo", header: "Vehicle" },
  { key: "driverName", header: "Driver" },
  { key: "status", header: "Status" },
  { key: "source", header: "Source" },
  { key: "paymentStatus", header: "Payment" },
  { key: "proofPath", header: "Proof" },
  { key: "failedReturnStatus", header: "Return" },
  { key: "requestedDeliveryDate", header: "Date" },
]

const itemColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "itemDescription", header: "Item" },
  { key: "quantity", header: "Qty", align: "right" },
  { key: "weightKg", header: "Kg", align: "right" },
  { key: "notes", header: "Notes" },
]

const statusLogColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Time" },
  { key: "orderNo", header: "Order" },
  { key: "status", header: "Status" },
  { key: "notes", header: "Notes" },
]

const vehicleColumns: DataTableColumn<TableRow>[] = [
  { key: "vehicleNo", header: "Vehicle" },
  { key: "vehicleType", header: "Type" },
  { key: "capacityKg", header: "Capacity kg", align: "right" },
  { key: "active", header: "Active" },
]

const locationColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Time" },
  { key: "orderNo", header: "Order" },
  { key: "driverName", header: "Driver" },
  { key: "latitude", header: "Lat", align: "right" },
  { key: "longitude", header: "Lng", align: "right" },
  { key: "locationNote", header: "Note" },
]

const paymentColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Time" },
  { key: "orderNo", header: "Order" },
  { key: "paymentType", header: "Type" },
  { key: "paymentStatus", header: "Status" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "referenceNo", header: "Reference" },
]

const customerOrderColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "customerName", header: "Customer" },
  { key: "requiredDate", header: "Required" },
  { key: "status", header: "Status" },
  { key: "proofPath", header: "Proof" },
  { key: "failedReturnStatus", header: "Return" },
  { key: "outletName", header: "Outlet" },
  { key: "departmentName", header: "Department" },
]

function dateText(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value))
}

function paymentTypeLabel(value: string) {
  if (value === "CREDIT") {
    return "Credit term"
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function customerDeliveryStatusLabel(status: string) {
  if (status === "READY_FOR_DELIVERY") {
    return "Pending"
  }

  if (status === "OUT_FOR_DELIVERY") {
    return "Out for delivery"
  }

  if (status === "DELIVERED") {
    return "Delivered"
  }

  if (status === "FAILED") {
    return "Failed"
  }

  if (status === "CANCELLED") {
    return "Cancelled"
  }

  return status.replaceAll("_", " ")
}

function failedReturnText(
  status: string,
  completedUnits: number,
  requiredUnits: number
) {
  if (!status || status === "NOT_REQUIRED") {
    return "-"
  }

  if (status === "NO_STOCK_LINK") {
    return "No linked stock"
  }

  if (status === "RETURNED") {
    return `Returned ${completedUnits}/${requiredUnits}`
  }

  if (status === "PENDING_RETURN") {
    return `Pending ${completedUnits}/${requiredUnits}`
  }

  return status.replaceAll("_", " ")
}

function sourceTypeLabel(value: string) {
  if (value === "retail_sale") {
    return "Retail sale"
  }

  if (value === "whatsapp") {
    return "WhatsApp"
  }

  return "Manual"
}

function PageHeader({
  route,
  demoMode,
}: {
  route: DeliveryRoute
  demoMode: boolean
}) {
  const title = titles[route]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {title.description}
        </p>
      </div>
      {demoMode ? <Badge variant="warning">Demo data</Badge> : null}
    </div>
  )
}

function DeliveryNav({ route }: { route: DeliveryRoute }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {navItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={item.route === route ? "default" : "outline"}
          size="sm"
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </div>
  )
}

function KpiCards({
  kpis,
}: {
  kpis: { label: string; value: string; detail: string }[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="pb-2">
            <CardDescription>{kpi.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{kpi.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function hasAnyRole(roles: UserRole[], allowedRoles: UserRole[]) {
  return allowedRoles.some((role) => roles.includes(role))
}

function ViewOnlyCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function orderRows(
  data: Awaited<ReturnType<typeof getDeliveryPageData>>
): TableRow[] {
  return data.orders.map((order) => ({
    orderNo: order.orderNo,
    customerName: order.customerName,
    customerLocation: order.customerLocation,
    vehicleNo: order.vehicleNo,
    driverName: order.driverName,
    status: order.status.replaceAll("_", " "),
    source:
      order.sourceReference && order.sourceReference !== "-"
        ? `${sourceTypeLabel(order.sourceType)} / ${order.sourceReference}`
        : sourceTypeLabel(order.sourceType),
    paymentStatus: order.paymentStatus,
    proofPath: order.proofPath,
    failedReturnStatus: failedReturnText(
      order.failedReturnStatus,
      order.failedReturnCompletedUnits,
      order.failedReturnRequiredUnits
    ),
    requestedDeliveryDate: dateText(order.requestedDeliveryDate),
  }))
}

function itemRows(
  data: Awaited<ReturnType<typeof getDeliveryPageData>>
): TableRow[] {
  return data.items.map((item) => ({
    orderNo: item.orderNo,
    itemDescription: item.itemDescription,
    quantity: item.quantity,
    weightKg: item.weightKg,
    notes: item.notes,
  }))
}

function statusRows(
  data: Awaited<ReturnType<typeof getDeliveryPageData>>
): TableRow[] {
  return data.statusLogs.map((log) => ({
    createdAt: dateText(log.createdAt),
    orderNo: log.orderNo,
    status: log.status.replaceAll("_", " "),
    notes: log.notes,
  }))
}

function vehicleRows(
  data: Awaited<ReturnType<typeof getDeliveryPageData>>
): TableRow[] {
  return data.vehicles.map((vehicle) => ({
    vehicleNo: vehicle.vehicleNo,
    vehicleType: vehicle.vehicleType,
    capacityKg: vehicle.capacityKg,
    active: vehicle.active,
  }))
}

function locationRows(
  data: Awaited<ReturnType<typeof getDeliveryPageData>>
): TableRow[] {
  return data.driverLocations.map((location) => ({
    createdAt: dateText(location.createdAt),
    orderNo: location.orderNo,
    driverName: location.driverName,
    latitude: location.latitude,
    longitude: location.longitude,
    locationNote: location.locationNote,
  }))
}

function paymentRows(
  data: Awaited<ReturnType<typeof getDeliveryPageData>>
): TableRow[] {
  return data.payments.map((payment) => ({
    createdAt: dateText(payment.createdAt),
    orderNo: payment.orderNo,
    paymentType: paymentTypeLabel(payment.paymentType),
    paymentStatus: payment.paymentStatus,
    amount: payment.amount,
    referenceNo: payment.referenceNo,
  }))
}

function customerDeliveryRows(
  data: Awaited<ReturnType<typeof getOrdersPageData>>
): TableRow[] {
  return data.orders
    .filter(
      (order) =>
        order.deliveryRequired &&
        [
          "READY_FOR_DELIVERY",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "FAILED",
          "CANCELLED",
        ].includes(order.status)
    )
    .map((order) => ({
      orderNo: order.orderNo,
      customerName: order.customerName,
      requiredDate: dateText(order.requiredDate),
      status: customerDeliveryStatusLabel(order.status),
      proofPath: order.proofPath,
      failedReturnStatus: failedReturnText(
        order.failedReturnStatus,
        order.failedReturnCompletedUnits,
        order.failedReturnRequiredUnits
      ),
      outletName: order.outletName,
      departmentName: order.departmentName,
    }))
}

export async function DeliveryPage({ route }: { route: DeliveryRoute }) {
  const blocked = await moduleAccessBlock("delivery", "Delivery", deliveryRoles)

  if (blocked) {
    return blocked
  }

  const profile = await requireCurrentProfile()
  const canOperateDelivery = hasAnyRole(profile.roles, deliveryOperatorRoles)
  const canManageDelivery = hasAnyRole(profile.roles, deliveryManagerRoles)
  const canManageDeliveryPayments = hasAnyRole(
    profile.roles,
    deliveryPaymentRoles
  )
  const shouldLoadCustomerOrders = route === "orders" || route === "driver"
  const [data, customerOrderResult] = await Promise.all([
    getDeliveryPageData(),
    shouldLoadCustomerOrders
      ? getOrdersPageData()
          .then((ordersData) => ({ ordersData, error: null }))
          .catch((error: unknown) => ({
            ordersData: null,
            error:
              error instanceof Error
                ? error.message
                : "Orders data could not load.",
          }))
      : Promise.resolve({ ordersData: null, error: null }),
  ])
  const customerOrders = customerOrderResult.ordersData

  return (
    <div className="space-y-5">
      <PageHeader route={route} demoMode={data.demoMode} />
      <DeliveryNav route={route} />

      {route === "dashboard" ? (
        <>
          <KpiCards kpis={data.dashboard.kpis} />
          <DeliveryDashboardCharts
            statusMix={data.dashboard.statusMix}
            paymentMix={data.dashboard.paymentMix}
          />
          <Card>
            <CardHeader>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Latest delivery order activity.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={orderColumns} data={orderRows(data).slice(0, 8)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "new-order" ? (
        <>
          {canManageDelivery ? (
            <NewDeliveryOrderForm vehicles={data.vehicles} drivers={data.drivers} />
          ) : (
            <ViewOnlyCard
              title="Delivery order entry unavailable"
              description="Your role can view delivery records, but delivery order entry is reserved for delivery managers and admin users."
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Orders created most recently.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={orderColumns} data={orderRows(data).slice(0, 8)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "orders" ? (
        <>
          {customerOrders ? (
            canOperateDelivery ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <CustomerOrderDeliveryStatusForm orders={customerOrders.orders} />
                <CustomerOrderProofUploadForm orders={customerOrders.orders} />
              </div>
            ) : (
              <ViewOnlyCard
                title="Customer order delivery actions unavailable"
                description="Your role can view delivery handoff records, but status updates and proof uploads are reserved for delivery users and admin."
              />
            )
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Customer order handoff unavailable</CardTitle>
                <CardDescription>
                  Check that the Orders migrations were applied before using
                  delivery-required customer order handoff.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-destructive">
                {customerOrderResult.error ?? "Orders data could not load."}
              </CardContent>
            </Card>
          )}
          {canOperateDelivery ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <DeliveryStatusForm orders={data.orders} />
              <ProofUploadForm orders={data.orders} />
            </div>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Customer order deliveries</CardTitle>
              <CardDescription>
                Order module records that delivery users can move through
                delivery and review after completion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerOrders ? (
                <DataTable
                  columns={customerOrderColumns}
                  data={customerDeliveryRows(customerOrders)}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Customer order delivery data is unavailable.
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>All active and historical deliveries.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={orderColumns} data={orderRows(data)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Order items</CardTitle>
              <CardDescription>Delivery item quantities and weight.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={itemColumns} data={itemRows(data)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
              <CardDescription>Progress logs by order.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={statusLogColumns} data={statusRows(data)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "driver" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            {canOperateDelivery ? (
              <DriverLocationForm orders={data.orders} />
            ) : (
              <ViewOnlyCard
                title="Driver updates unavailable"
                description="Your role can view driver routes, but driver location updates are reserved for delivery users and admin."
              />
            )}
            {customerOrders ? (
              canOperateDelivery ? (
                <CustomerOrderDeliveryStatusForm orders={customerOrders.orders} />
              ) : (
                <ViewOnlyCard
                  title="Customer order delivery actions unavailable"
                  description="Your role can view delivery handoff records, but status updates are reserved for delivery users and admin."
                />
              )
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Customer order handoff unavailable</CardTitle>
                  <CardDescription>
                    Check that the Orders migrations were applied before using
                    the driver pickup list.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-destructive">
                  {customerOrderResult.error ?? "Orders data could not load."}
                </CardContent>
              </Card>
            )}
          </div>
          {customerOrders && canOperateDelivery ? (
            <CustomerOrderProofUploadForm orders={customerOrders.orders} />
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Customer pickup list</CardTitle>
              <CardDescription>
                Ready delivery-required customer orders from the Orders module.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerOrders ? (
                <DataTable
                  columns={customerOrderColumns}
                  data={customerDeliveryRows(customerOrders)}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Customer order delivery data is unavailable.
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Driver routes</CardTitle>
              <CardDescription>Assigned and in-progress delivery orders.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={orderColumns}
                data={orderRows(data).filter(
                  (row) =>
                    row.status !== "DELIVERED" &&
                    row.status !== "CANCELLED" &&
                    row.status !== "FAILED"
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Location log</CardTitle>
              <CardDescription>Driver position updates.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={locationColumns} data={locationRows(data)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "vehicles" ? (
        <>
          {canManageDelivery ? (
            <VehicleForm />
          ) : (
            <ViewOnlyCard
              title="Vehicle maintenance unavailable"
              description="Your role can view vehicles, but vehicle setup is reserved for delivery managers and admin users."
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle list</CardTitle>
              <CardDescription>Active and available delivery vehicles.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={vehicleColumns} data={vehicleRows(data)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "payments" ? (
        <>
          {canManageDeliveryPayments ? (
            <DeliveryPaymentForm orders={data.orders} />
          ) : (
            <ViewOnlyCard
              title="Delivery payment entry unavailable"
              description="Your role can view payment records, but payment entry is reserved for delivery drivers, delivery managers, account, and admin users."
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle>Payment records</CardTitle>
              <CardDescription>Delivery payment collection history.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={paymentColumns} data={paymentRows(data)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Order payment status</CardTitle>
              <CardDescription>Payment follow-up by order.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={orderColumns} data={orderRows(data)} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
