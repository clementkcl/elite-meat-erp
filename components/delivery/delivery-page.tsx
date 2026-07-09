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
import { DriverDeliveryPage } from "@/components/delivery/driver-delivery-page"
import {
  DeliveryPaymentForm,
  DeliveryStatusForm,
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
  "delivery_manager",
  "admin",
]

const titles: Record<DeliveryRoute, { title: string; description: string }> = {
  dashboard: {
    title: "Delivery Dashboard",
    description: "Legacy delivery dashboard. Use /delivery for the canonical V1 manager dashboard.",
  },
  orders: {
    title: "Legacy Delivery Orders",
    description: "Legacy standalone delivery-order records. Canonical V1 deliveries use /delivery, /delivery/driver, and /delivery/[id].",
  },
  "new-order": {
    title: "Legacy New Delivery Order",
    description: "Legacy standalone entry. Canonical V1 delivery jobs are created from Orders or manual deliveries in the V1 service.",
  },
  driver: {
    title: "Driver View",
    description: "Legacy driver job view. Canonical V1 drivers use /delivery/driver.",
  },
  vehicles: {
    title: "Legacy Vehicles",
    description: "Legacy vehicle maintenance. Canonical V1 vehicle access is scoped through Delivery V1 queries and RLS.",
  },
  payments: {
    title: "Legacy Delivery Payments",
    description: "Legacy delivery payment records. Driver V1 does not expose collection, credit, finance, or accounting data.",
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

const reviewColumns: DataTableColumn<TableRow>[] = [
  { key: "jobNo", header: "Delivery" },
  { key: "customerName", header: "Customer" },
  { key: "driverName", header: "Driver" },
  { key: "status", header: "Status" },
  { key: "reason", header: "Reason" },
  { key: "date", header: "Date" },
]

const driverPerformanceColumns: DataTableColumn<TableRow>[] = [
  { key: "driverName", header: "Driver" },
  { key: "total", header: "Jobs", align: "right" },
  { key: "delivered", header: "Delivered", align: "right" },
  { key: "failed", header: "Failed", align: "right" },
  { key: "loaded", header: "Loaded", align: "right" },
  { key: "outForDelivery", header: "Out", align: "right" },
]

const driverWeightColumns: DataTableColumn<TableRow>[] = [
  { key: "driverName", header: "Driver" },
  { key: "weightKg", header: "Weight kg", align: "right" },
  { key: "jobs", header: "Jobs", align: "right" },
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
  const isLegacySurface = route !== "dashboard"

  return (
    <div className="space-y-3">
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
      {isLegacySurface ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Delivery V1 canonical workflow is based on deliveries, delivery orders,
          delivery items, proofs, status logs, address suggestions, and expenses.
          Keep this legacy page for historical records only unless a manager has
          confirmed the old standalone workflow is still needed.
        </div>
      ) : null}
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

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function jobDate(job: Awaited<ReturnType<typeof getDeliveryPageData>>["jobs"][number]) {
  return job.requestedDeliveryDate ?? job.createdAt.slice(0, 10)
}

function managerReviewRows(
  data: Awaited<ReturnType<typeof getDeliveryPageData>>
): TableRow[] {
  const today = todayDate()
  const failed = data.jobs
    .filter((job) => job.status === "FAILED")
    .map((job) => ({
      jobNo: job.jobNo,
      customerName: job.customerName,
      driverName: job.driverName,
      status: "Failed",
      reason: job.failedReason ? job.failedReason.replaceAll("_", " ") : "Review",
      date: dateText(job.completedAt ?? job.createdAt),
    }))
  const gpsUnavailable = data.jobs
    .filter((job) => job.gpsAvailable === false)
    .map((job) => ({
      jobNo: job.jobNo,
      customerName: job.customerName,
      driverName: job.driverName,
      status: "GPS unavailable",
      reason: "Proof completed without GPS",
      date: dateText(job.completedAt ?? job.createdAt),
    }))
  const addressSuggestions = data.addressSuggestions
    .filter((suggestion) => suggestion.status === "PENDING")
    .map((suggestion) => ({
      jobNo: "-",
      customerName: suggestion.customerName,
      driverName: "-",
      status: "Address suggestion",
      reason: suggestion.reason,
      date: dateText(suggestion.createdAt),
    }))
  const late = data.jobs
    .filter(
      (job) =>
        jobDate(job) < today &&
        !["DELIVERED", "FAILED", "CANCELLED"].includes(job.status)
    )
    .map((job) => ({
      jobNo: job.jobNo,
      customerName: job.customerName,
      driverName: job.driverName,
      status: "Late",
      reason: `Due ${jobDate(job)}`,
      date: dateText(job.createdAt),
    }))
  const slow = data.jobs
    .filter((job) => {
      if (!job.startedAt || !job.completedAt) {
        return false
      }

      return (
        new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime() >
        4 * 60 * 60 * 1000
      )
    })
    .map((job) => ({
      jobNo: job.jobNo,
      customerName: job.customerName,
      driverName: job.driverName,
      status: "Took too long",
      reason: "More than 4 hours after start",
      date: dateText(job.completedAt),
    }))

  return [...failed, ...gpsUnavailable, ...addressSuggestions, ...late, ...slow]
}

function driverPerformanceRows(
  data: Awaited<ReturnType<typeof getDeliveryPageData>>
): TableRow[] {
  const rows = new Map<
    string,
    {
      driverName: string
      total: number
      delivered: number
      failed: number
      loaded: number
      outForDelivery: number
      weightKg: number
    }
  >()

  for (const job of data.jobs) {
    const key = job.driverId ?? "unassigned"
    const current =
      rows.get(key) ??
      {
        driverName: job.driverName === "-" ? "Unassigned" : job.driverName,
        total: 0,
        delivered: 0,
        failed: 0,
        loaded: 0,
        outForDelivery: 0,
        weightKg: 0,
      }

    current.total += 1
    current.weightKg += job.totalWeightKg
    current.delivered += job.status === "DELIVERED" ? 1 : 0
    current.failed += job.status === "FAILED" ? 1 : 0
    current.loaded += job.status === "LOADED" ? 1 : 0
    current.outForDelivery += job.status === "OUT_FOR_DELIVERY" ? 1 : 0
    rows.set(key, current)
  }

  return Array.from(rows.values()).map((row) => ({
    ...row,
    weightKg: Number(row.weightKg.toFixed(1)),
  }))
}

function driverWeightRows(
  data: Awaited<ReturnType<typeof getDeliveryPageData>>
): TableRow[] {
  return driverPerformanceRows(data)
    .map((row) => ({
      driverName: row.driverName,
      weightKg: row.weightKg,
      jobs: row.total,
    }))
    .sort((a, b) => Number(b.weightKg) - Number(a.weightKg))
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

  if (route === "driver") {
    return (
      <DriverDeliveryPage
        profile={profile}
        jobs={data.jobs}
        expenses={data.expenses}
        vehicles={data.vehicles}
        demoMode={data.demoMode}
      />
    )
  }

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
              <CardTitle>Manager review</CardTitle>
              <CardDescription>
                Failed deliveries, GPS unavailable, address suggestions, late
                deliveries, and routes that took too long.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={reviewColumns} data={managerReviewRows(data)} />
            </CardContent>
          </Card>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Driver performance</CardTitle>
                <CardDescription>Job status counts by driver.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={driverPerformanceColumns}
                  data={driverPerformanceRows(data)}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Delivery weight by driver</CardTitle>
                <CardDescription>Total assigned delivery weight.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={driverWeightColumns}
                  data={driverWeightRows(data)}
                />
              </CardContent>
            </Card>
          </div>
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
