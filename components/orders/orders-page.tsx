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
import {
  AddOrderItemForm,
  MarkOrderReadyForm,
  NewCustomerOrderForm,
  PrepareOrderItemForm,
  ReleaseOrderReservationsForm,
} from "@/components/orders/orders-forms"
import {
  getOrdersPageData,
} from "@/lib/orders/data"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { requireCurrentProfile } from "@/lib/auth/session"
import type { UserRole } from "@/lib/auth/types"
import type {
  CustomerOrder,
  CustomerOrderItem,
  OrderNotificationEvent,
  OrderStockReservation,
} from "@/lib/orders/types"

export type OrdersRoute = "list" | "new" | "prepare" | "detail"

type TableRow = Record<string, string | number | boolean>

const orderRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
  "director",
]

const orderOperatorRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
]

const orderColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "customerName", header: "Customer" },
  { key: "requiredDate", header: "Required" },
  { key: "fulfillmentType", header: "Type" },
  { key: "status", header: "Status" },
  { key: "failedReturnStatus", header: "Failed return" },
  { key: "outletName", header: "Outlet" },
  { key: "open", header: "Open" },
]

const itemColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "itemLabel", header: "Item" },
  { key: "requestedWeightKg", header: "Requested kg", align: "right" },
  { key: "preparedWeightKg", header: "Prepared kg", align: "right" },
  { key: "preparedByName", header: "Prepared by" },
  { key: "status", header: "Status" },
]

const notificationColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "eventType", header: "Event" },
  { key: "channel", header: "Channel" },
  { key: "status", header: "Status" },
  { key: "createdAt", header: "Created" },
]

const reservationColumns: DataTableColumn<TableRow>[] = [
  { key: "orderNo", header: "Order" },
  { key: "itemLabel", header: "Item" },
  { key: "locationName", header: "Location" },
  { key: "reservedQuantity", header: "Reserved qty", align: "right" },
  { key: "reservedWeightKg", header: "Reserved kg", align: "right" },
  { key: "status", header: "Status" },
]

function dateText(value: string | null) {
  return value ?? "-"
}

function failedReturnText(order: CustomerOrder) {
  if (
    !order.failedReturnStatus ||
    order.failedReturnStatus === "NOT_REQUIRED"
  ) {
    return "-"
  }

  if (order.failedReturnStatus === "NO_STOCK_LINK") {
    return "No linked stock"
  }

  if (order.failedReturnStatus === "RETURNED") {
    return `Returned ${order.failedReturnCompletedUnits}/${order.failedReturnRequiredUnits}`
  }

  if (order.failedReturnStatus === "PENDING_RETURN") {
    return `Pending ${order.failedReturnCompletedUnits}/${order.failedReturnRequiredUnits}`
  }

  return order.failedReturnStatus.replaceAll("_", " ")
}

function orderRows(data: Awaited<ReturnType<typeof getOrdersPageData>>) {
  return data.orders.map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    requiredDate: dateText(order.requiredDate),
    fulfillmentType: order.fulfillmentType,
    status: order.status,
    failedReturnStatus: failedReturnText(order),
    outletName: order.outletName,
    open: "View",
  }))
}

function itemRows(items: CustomerOrderItem[]) {
  return items.map((item) => ({
    orderNo: item.orderNo,
    itemLabel: item.itemLabel,
    requestedWeightKg: item.requestedWeightKg,
    preparedWeightKg: item.preparedWeightKg,
    preparedByName: item.preparedByName,
    status: item.status,
  }))
}

function notificationRows(
  notifications: OrderNotificationEvent[]
) {
  return notifications.map((event) => ({
    orderNo: event.orderNo,
    eventType: event.eventType,
    channel: event.channel,
    status: event.status,
    createdAt: event.createdAt,
  }))
}

function reservationRows(reservations: OrderStockReservation[]) {
  return reservations.map((reservation) => ({
    orderNo: reservation.orderNo,
    itemLabel: reservation.itemLabel,
    locationName: reservation.locationName,
    reservedQuantity: reservation.reservedQuantity,
    reservedWeightKg: reservation.reservedWeightKg,
    status: reservation.status,
  }))
}

function editableOrderItems(
  items: CustomerOrderItem[],
  orders: CustomerOrder[]
) {
  const editableOrderIds = new Set(
    orders
      .filter((order) => order.status === "NEW" || order.status === "PREPARING")
      .map((order) => order.id)
  )

  return items.filter((item) => editableOrderIds.has(item.orderId))
}

function Header({
  title,
  description,
  demoMode,
  canOperate,
}: {
  title: string
  description: string
  demoMode: boolean
  canOperate: boolean
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
        {canOperate ? (
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/orders/new">New order</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/orders/prepare">Prepare</Link>
            </Button>
          </>
        ) : null}
        {demoMode ? <Badge variant="warning">Demo data</Badge> : null}
      </div>
    </div>
  )
}

export async function OrdersPage({
  route,
  orderId,
}: {
  route: OrdersRoute
  orderId?: string
}) {
  const blocked = await moduleAccessBlock("orders", "Orders", orderRoles)

  if (blocked) {
    return blocked
  }

  const profile = await requireCurrentProfile()
  let data: Awaited<ReturnType<typeof getOrdersPageData>>

  try {
    data = await getOrdersPageData()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Orders data could not load."

    return (
      <div className="space-y-5">
        <Header
          title="Orders"
          description="Create customer orders, prepare requested item weights, and move ready orders into pickup or delivery."
          demoMode={false}
          canOperate={false}
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
  const canOperateOrders = orderOperatorRoles.some((role) =>
    profile.roles.includes(role)
  )

  let detailOrder: CustomerOrder | null = null
  let detailItems: CustomerOrderItem[] = data.items
  let detailReservations: OrderStockReservation[] = data.reservations
  let detailNotifications: OrderNotificationEvent[] = data.notifications

  if (orderId) {
    detailOrder = data.orders.find((order) => order.id === orderId) ?? null
    detailItems = data.items.filter((item) => item.orderId === orderId)
    detailReservations = data.reservations.filter(
      (reservation) => reservation.orderId === orderId
    )
    detailNotifications = data.notifications.filter(
      (event) => event.orderId === orderId
    )
  }

  return (
    <div className="space-y-5">
      <Header
        title={
          route === "new"
            ? "New Order"
            : route === "prepare"
              ? "Prepare Orders"
              : detailOrder
                ? detailOrder.orderNo
                : "Orders"
        }
        description="Create customer orders, prepare requested item weights, and move ready orders into pickup or delivery."
        demoMode={data.demoMode}
        canOperate={canOperateOrders}
      />

      {route === "new" && canOperateOrders ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <NewCustomerOrderForm
            profile={profile}
            scopeOptions={data.scopeOptions}
          />
          <AddOrderItemForm orders={data.orders} stockItems={data.stockItems} />
        </div>
      ) : route === "new" ? (
        <Card>
          <CardHeader>
            <CardTitle>Order entry unavailable</CardTitle>
            <CardDescription>
              Your role can view customer orders, but routine order entry is
              reserved for retail, processing, and admin users.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {route === "prepare" && canOperateOrders ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <PrepareOrderItemForm
            items={editableOrderItems(data.items, data.orders)}
          />
          <MarkOrderReadyForm orders={data.orders} items={data.items} />
          <ReleaseOrderReservationsForm
            orders={data.orders}
            reservations={data.reservations}
          />
        </div>
      ) : route === "prepare" ? (
        <Card>
          <CardHeader>
            <CardTitle>Order preparation unavailable</CardTitle>
            <CardDescription>
              Your role can view prepared order records, but preparation entry
              is reserved for retail, processing, and admin users.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {detailOrder ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{detailOrder.customerName}</CardTitle>
              <CardDescription>
                {detailOrder.fulfillmentType} - {detailOrder.status} -{" "}
                {detailOrder.outletName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-muted-foreground">Order date</div>
                  <div className="font-medium">{detailOrder.orderDate}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Required</div>
                  <div className="font-medium">
                    {dateText(detailOrder.requiredDate)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Created by</div>
                  <div className="font-medium">{detailOrder.createdByName}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Department</div>
                  <div className="font-medium">
                    {detailOrder.departmentName}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    Failed delivery return
                  </div>
                  <div className="font-medium">
                    {failedReturnText(detailOrder)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {canOperateOrders ? (
            <div className="grid gap-4 xl:grid-cols-3">
              <AddOrderItemForm
                orders={[detailOrder]}
                stockItems={data.stockItems}
                orderId={detailOrder.id}
              />
              <PrepareOrderItemForm
                items={editableOrderItems(detailItems, [detailOrder])}
              />
              <MarkOrderReadyForm orders={[detailOrder]} items={detailItems} />
              <ReleaseOrderReservationsForm
                orders={[detailOrder]}
                reservations={detailReservations}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Scoped customer orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={orderColumns}
            data={orderRows(data)}
            getRowHref={(row) => `/orders/${row.id}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order items</CardTitle>
          <CardDescription>
            Requested and prepared quantity/weight by item.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={itemColumns} data={itemRows(detailItems)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock reservations</CardTitle>
          <CardDescription>
            Picking-time reservations. Cancelled orders keep active reservations until staff releases them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={reservationColumns}
            data={reservationRows(detailReservations)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification hooks</CardTitle>
          <CardDescription>
            Placeholder events for future WhatsApp API delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={notificationColumns}
            data={notificationRows(detailNotifications)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
