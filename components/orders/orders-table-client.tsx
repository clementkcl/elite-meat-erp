"use client"

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
import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import type {
  CustomerOrder,
  CustomerOrderItem,
  OrderNotificationEvent,
  OrderPickingEntry,
  OrderReportRow,
  OrderStockReservation,
} from "@/lib/orders/types"

type TableRow = Record<string, string | number | boolean>

const orderColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order No" },
  { key: "customerName", header: "Customer" },
  { key: "fulfillmentType", header: "Order Type" },
  { key: "required", header: "Required Date/Time" },
  { key: "outletName", header: "Outlet" },
  { key: "totalEstimatedWeightKg", header: "Total Estimated Weight", align: "right" },
  { key: "totalOrderPrice", header: "Total Price", align: "right" },
  { key: "stock", header: "Stock Status" },
  { key: "displayStatus", header: "Order Status" },
  { key: "createdByName", header: "Created By" },
  { key: "open", header: "Actions" },
]

const itemColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "itemLabel", header: "Item" },
  { key: "orderingUnit", header: "Unit" },
  { key: "estimatedWeightKg", header: "Est kg", align: "right" },
  { key: "preparedWeightKg", header: "Picked kg", align: "right" },
  { key: "status", header: "Status" },
  { key: "processingRequired", header: "Processing" },
]

const reservationColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "itemLabel", header: "Item" },
  { key: "locationName", header: "Location" },
  { key: "reservedWeightKg", header: "Reserved kg", align: "right" },
  { key: "status", header: "Status" },
  { key: "expiresAt", header: "Expires" },
  { key: "stock", header: "Stock" },
]

const pickingColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "itemLabel", header: "Item" },
  { key: "barcode", header: "Barcode" },
  { key: "entryType", header: "Type" },
  { key: "pickedWeightKg", header: "Picked kg", align: "right" },
  { key: "manualReason", header: "Reason" },
  { key: "mismatchMessage", header: "Mismatch" },
]

const notificationColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "eventType", header: "Event" },
  { key: "channel", header: "Channel" },
  { key: "status", header: "Status" },
  { key: "createdAt", header: "Created" },
]

const reportColumns: DataTableColumn<TableRow>[] = [
  { key: "reportName", header: "Report" },
  { key: "primary", header: "Primary" },
  { key: "secondary", header: "Secondary" },
  { key: "count", header: "Count", align: "right" },
  { key: "weightKg", header: "Kg", align: "right" },
  { key: "totalPrice", header: "Total", align: "right" },
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

function totalEstimatedWeightByOrder(items: CustomerOrderItem[]) {
  return items.reduce((totals, item) => {
    const current = totals.get(item.orderId) ?? 0

    totals.set(
      item.orderId,
      current + (item.estimatedWeightKg || item.requestedWeightKg)
    )

    return totals
  }, new Map<string, number>())
}

function kg(value: number) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })} kg`
}

function orderPriceText(value: number) {
  return value > 0 ? money(value) : "Price required"
}

function orderRows(
  orders: CustomerOrder[],
  estimatedWeights: Map<string, number>
) {
  return orders.map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    fulfillmentType: order.fulfillmentType,
    required: dateText(order.requiredAt ?? order.requiredDate),
    outletName: order.outletName,
    totalEstimatedWeightKg: kg(estimatedWeights.get(order.id) ?? 0),
    totalOrderPrice: orderPriceText(order.totalOrderPrice),
    stock: order.stockNotEnough ? "Not enough" : "Reserved",
    displayStatus: order.displayStatus,
    createdByName: order.createdByName,
    open: "View",
  }))
}

function itemRows(items: CustomerOrderItem[]) {
  return items.map((item) => ({
    orderNo: item.orderNo,
    itemLabel: item.itemLabel,
    orderingUnit: item.orderingUnit.replaceAll("_", " "),
    estimatedWeightKg: item.estimatedWeightKg,
    preparedWeightKg: item.preparedWeightKg,
    status: item.status,
    processingRequired: item.processingRequired ? "Required" : "-",
  }))
}

function reservationRows(reservations: OrderStockReservation[]) {
  return reservations.map((reservation) => ({
    orderNo: reservation.orderNo,
    itemLabel: reservation.itemLabel,
    locationName: reservation.locationName,
    reservedWeightKg: reservation.reservedWeightKg,
    status: reservation.status,
    expiresAt: dateText(reservation.expiresAt),
    stock: reservation.stockNotEnough ? "Not enough" : "Reserved",
  }))
}

function pickingRows(entries: OrderPickingEntry[]) {
  return entries.map((entry) => ({
    orderNo: entry.orderNo,
    itemLabel: entry.itemLabel,
    barcode: entry.barcode,
    entryType: entry.entryType.replaceAll("_", " "),
    pickedWeightKg: entry.pickedWeightKg,
    manualReason: entry.manualReason?.replaceAll("_", " ") ?? "-",
    mismatchMessage: entry.mismatchMessage || "-",
  }))
}

function notificationRows(notifications: OrderNotificationEvent[]) {
  return notifications.map((event) => ({
    orderNo: event.orderNo,
    eventType: event.eventType,
    channel: event.channel,
    status: event.status,
    createdAt: dateText(event.createdAt),
  }))
}

function reportRows(reports: OrderReportRow[]) {
  return reports.map((report) => ({
    reportName: report.reportName,
    primary: report.primary,
    secondary: report.secondary,
    count: report.count,
    weightKg: report.weightKg,
    totalPrice: money(report.totalPrice),
  }))
}

export function OrdersTableClient({
  orders,
  items,
  reservations,
  pickingEntries,
  notifications,
}: {
  orders: CustomerOrder[]
  items: CustomerOrderItem[]
  reservations: OrderStockReservation[]
  pickingEntries: OrderPickingEntry[]
  notifications: OrderNotificationEvent[]
}) {
  const estimatedWeights = totalEstimatedWeightByOrder(items)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Confirmed Manual ERP orders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:hidden">
            {orders.length > 0 ? (
              orders.map((order) => (
                <div key={order.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{order.orderNo}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {order.customerName}
                      </div>
                    </div>
                    <Badge
                      variant={
                        order.stockNotEnough ? "destructive" : "secondary"
                      }
                    >
                      {order.stockNotEnough ? "Stock not enough" : "Reserved"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Order type</div>
                      <div className="font-medium">
                        {order.fulfillmentType.replaceAll("_", " ")}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Required</div>
                      <div className="font-medium">
                        {dateText(order.requiredAt ?? order.requiredDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Outlet</div>
                      <div className="font-medium">{order.outletName}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Est weight</div>
                      <div className="font-medium tabular-nums">
                        {kg(estimatedWeights.get(order.id) ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total price</div>
                      <div className="font-medium tabular-nums">
                        {orderPriceText(order.totalOrderPrice)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Created by</div>
                      <div className="font-medium">{order.createdByName}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{order.displayStatus}</Badge>
                    <Badge variant="secondary">
                      {order.fulfillmentType.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
                    <Button asChild className="min-h-11 flex-1">
                      <Link href={`/orders/${order.id}`}>View Order</Link>
                    </Button>
                    {order.displayStatus === "CONFIRMED" ||
                    order.displayStatus === "STOCK_NOT_ENOUGH" ||
                    order.displayStatus === "PICKING" ? (
                      <Button
                        asChild
                        variant="outline"
                        className="min-h-11 flex-1"
                      >
                        <Link href="/orders/picking">Picking</Link>
                      </Button>
                    ) : null}
                    {order.displayStatus === "READY" ? (
                      <Button
                        asChild
                        variant="outline"
                        className="min-h-11 flex-1"
                      >
                        <Link href="/orders/ready">Price / Ready</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No orders match the current filters.
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <DataTable
              columns={orderColumns}
              data={orderRows(orders, estimatedWeights)}
              getRowHref={(row) => `/orders/${row.id}`}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order items</CardTitle>
          <CardDescription>Requested estimates and final picked weight.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={itemColumns} data={itemRows(items)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock reservations</CardTitle>
          <CardDescription>Item-weight reservations expiring end of day.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={reservationColumns}
            data={reservationRows(reservations)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Picking log</CardTitle>
          <CardDescription>Barcode scans, manual weight, and mismatches.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={pickingColumns} data={pickingRows(pickingEntries)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>In-app notifications</CardTitle>
          <CardDescription>
            Order events surfaced in the app and dashboard alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={notificationColumns}
            data={notificationRows(notifications)}
          />
        </CardContent>
      </Card>
    </>
  )
}

export function OrderReportsClient({ reports }: { reports: OrderReportRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
        <CardDescription>
          Customer, item, staff, queue, status, and delivery performance summaries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={reportColumns} data={reportRows(reports)} />
      </CardContent>
    </Card>
  )
}
