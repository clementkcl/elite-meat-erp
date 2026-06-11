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
import { getDeliveryPageData } from "@/lib/delivery/data"

export type DeliveryRoute =
  | "dashboard"
  | "orders"
  | "new-order"
  | "driver"
  | "vehicles"
  | "payments"

type TableRow = Record<string, string | number | boolean>

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

export async function DeliveryPage({ route }: { route: DeliveryRoute }) {
  const data = await getDeliveryPageData()

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
          <NewDeliveryOrderForm vehicles={data.vehicles} drivers={data.drivers} />
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
          <div className="grid gap-4 xl:grid-cols-2">
            <DeliveryStatusForm orders={data.orders} />
            <ProofUploadForm orders={data.orders} />
          </div>
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
            <DriverLocationForm orders={data.orders} />
            <DeliveryStatusForm orders={data.orders} />
          </div>
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
          <VehicleForm />
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
          <DeliveryPaymentForm orders={data.orders} />
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
