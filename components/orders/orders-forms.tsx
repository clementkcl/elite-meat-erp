"use client"

import { Save } from "lucide-react"
import { useActionState, useMemo, useState, type ReactNode } from "react"

import {
  addCustomerOrderItemAction,
  createCustomerOrderAction,
  markCustomerOrderReadyAction,
  prepareCustomerOrderItemAction,
  releaseOrderReservationsAction,
  updateCustomerOrderDeliveryStatusAction,
  uploadCustomerOrderProofAction,
} from "@/lib/orders/actions"
import {
  initialOrdersActionState,
  type OrdersActionState,
} from "@/lib/orders/action-state"
import type {
  CustomerOrder,
  CustomerOrderItem,
  OrderStockReservation,
  OrderScopeOption,
} from "@/lib/orders/types"
import type { CurrentProfile } from "@/lib/auth/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type StatefulAction = (
  state: OrdersActionState,
  formData: FormData
) => Promise<OrdersActionState>

function ActionMessage({ state }: { state: OrdersActionState }) {
  if (!state.message) {
    return null
  }

  return (
    <div
      className={
        state.status === "success"
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      }
    >
      {state.message}
    </div>
  )
}

function NativeSelect({
  id,
  name,
  children,
  defaultValue,
  value,
  onChange,
  required = true,
  disabled = false,
}: {
  id: string
  name: string
  children: ReactNode
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  required?: boolean
  disabled?: boolean
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      required={required}
      disabled={disabled}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {children}
    </select>
  )
}

function SubmitButton({
  pending,
  disabled = false,
  children,
}: {
  pending: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Button type="submit" disabled={pending || disabled}>
      <Save className="size-4" />
      {pending ? "Saving..." : children}
    </Button>
  )
}

function WorkflowCard({
  title,
  description,
  action,
  children,
  submitLabel,
  submitDisabled = false,
}: {
  title: string
  description: string
  action: StatefulAction
  children: ReactNode
  submitLabel: string
  submitDisabled?: boolean
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialOrdersActionState
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {children}
          <ActionMessage state={state} />
          <SubmitButton pending={pending} disabled={submitDisabled}>
            {submitLabel}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

function canChooseOrderScope(profile: CurrentProfile) {
  return profile.roles.includes("admin") || profile.roles.includes("director")
}

export function NewCustomerOrderForm({
  profile,
  scopeOptions,
}: {
  profile: CurrentProfile
  scopeOptions: {
    outlets: OrderScopeOption[]
    departments: OrderScopeOption[]
  }
}) {
  const canChooseScope = canChooseOrderScope(profile)
  const submitDisabled = canChooseScope && scopeOptions.outlets.length === 0

  return (
    <WorkflowCard
      title="Create order"
      description="Create a customer order for pickup or delivery in your assigned scope."
      action={createCustomerOrderAction}
      submitLabel="Create order"
      submitDisabled={submitDisabled}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer</Label>
          <Input id="customerName" name="customerName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Phone</Label>
          <Input id="customerPhone" name="customerPhone" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="orderDate">Order date</Label>
          <Input
            id="orderDate"
            name="orderDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requiredDate">Required date</Label>
          <Input id="requiredDate" name="requiredDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fulfillmentType">Order type</Label>
          <NativeSelect id="fulfillmentType" name="fulfillmentType">
            <option value="PICKUP">PICKUP</option>
            <option value="DELIVERY">DELIVERY</option>
            <option value="INTERNAL_TRANSFER">INTERNAL TRANSFER</option>
          </NativeSelect>
        </div>
        {canChooseScope ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="orderOutletId">Outlet</Label>
              <NativeSelect
                id="orderOutletId"
                name="outletId"
                disabled={scopeOptions.outlets.length === 0}
              >
                <option value="">Select outlet</option>
                {scopeOptions.outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderDepartmentId">Department</Label>
              <NativeSelect
                id="orderDepartmentId"
                name="departmentId"
                required={false}
              >
                <option value="">No department</option>
                {scopeOptions.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </>
        ) : (
          <>
            <input type="hidden" name="outletId" value={profile.outletId ?? ""} />
            <input
              type="hidden"
              name="departmentId"
              value={profile.departmentId ?? ""}
            />
          </>
        )}
      </div>
      {canChooseScope ? (
        <p className="text-sm text-muted-foreground">
          Choose the outlet scope so the assigned outlet and delivery team can
          see this order.
        </p>
      ) : null}
      {submitDisabled ? (
        <p className="text-sm text-muted-foreground">
          Add an outlet before creating scoped customer orders.
        </p>
      ) : null}
      <input type="hidden" name="deliveryRequired" value="false" />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="deliveryRequired"
          value="true"
          className="size-4 rounded border-input"
        />
        Delivery required
      </label>
      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" name="remarks" />
      </div>
    </WorkflowCard>
  )
}

export function AddOrderItemForm({
  orders,
  stockItems,
  orderId,
}: {
  orders: CustomerOrder[]
  stockItems: { id: string; label: string }[]
  orderId?: string
}) {
  const editableOrders = orders.filter(
    (order) => order.status === "NEW" || order.status === "PREPARING"
  )
  const selectedOrderId = editableOrders.some((order) => order.id === orderId)
    ? orderId
    : undefined
  const [requestedQuantity, setRequestedQuantity] = useState("")
  const [requestedWeightKg, setRequestedWeightKg] = useState("")
  const hasRequestedAmount =
    Number(requestedQuantity) > 0 || Number(requestedWeightKg) > 0
  const submitDisabled =
    editableOrders.length === 0 || stockItems.length === 0 || !hasRequestedAmount

  return (
    <WorkflowCard
      title="Add order item"
      description="Record requested quantity or requested weight. Stock is not reserved until picking starts."
      action={addCustomerOrderItemAction}
      submitLabel="Add item"
      submitDisabled={submitDisabled}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="orderId">Order</Label>
          <NativeSelect
            id="orderId"
            name="orderId"
            defaultValue={selectedOrderId}
            disabled={editableOrders.length === 0}
          >
            <option value="">Select order</option>
            {editableOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNo} - {order.customerName}
              </option>
            ))}
          </NativeSelect>
          {editableOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Items can only be added while an order is new or preparing.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="itemId">Item</Label>
          <NativeSelect
            id="itemId"
            name="itemId"
            disabled={stockItems.length === 0}
          >
            <option value="">Select item</option>
            {stockItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </NativeSelect>
          {stockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add active stock items before adding order lines.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedQuantity">Requested quantity</Label>
          <Input
            id="requestedQuantity"
            name="requestedQuantity"
            type="number"
            min="0"
            step="0.001"
            value={requestedQuantity}
            onChange={(event) => setRequestedQuantity(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedWeightKg">Requested weight kg</Label>
          <Input
            id="requestedWeightKg"
            name="requestedWeightKg"
            type="number"
            min="0"
            step="0.001"
            value={requestedWeightKg}
            onChange={(event) => setRequestedWeightKg(event.target.value)}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Enter requested quantity, requested weight, or both.
      </p>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function PrepareOrderItemForm({
  items,
}: {
  items: CustomerOrderItem[]
}) {
  const [preparedQuantity, setPreparedQuantity] = useState("")
  const [preparedWeightKg, setPreparedWeightKg] = useState("")
  const hasPreparedAmount =
    Number(preparedQuantity) > 0 || Number(preparedWeightKg) > 0

  return (
    <WorkflowCard
      title="Prepare item"
      description="Start picking, reserve stock, and record prepared quantity, prepared weight, and prepared-by user."
      action={prepareCustomerOrderItemAction}
      submitLabel="Save prepared item"
      submitDisabled={items.length === 0 || !hasPreparedAmount}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="orderItemId">Order item</Label>
          <NativeSelect
            id="orderItemId"
            name="orderItemId"
            disabled={items.length === 0}
          >
            <option value="">Select item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.orderNo} - {item.itemLabel}
              </option>
            ))}
          </NativeSelect>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No editable order items are available. Items can only be prepared
              before the order is marked ready.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="preparedQuantity">Prepared quantity</Label>
          <Input
            id="preparedQuantity"
            name="preparedQuantity"
            type="number"
            min="0"
            step="0.001"
            value={preparedQuantity}
            onChange={(event) => setPreparedQuantity(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preparedWeightKg">Prepared weight kg</Label>
          <Input
            id="preparedWeightKg"
            name="preparedWeightKg"
            type="number"
            min="0"
            step="0.001"
            value={preparedWeightKg}
            onChange={(event) => setPreparedWeightKg(event.target.value)}
          />
        </div>
      </div>
      {!hasPreparedAmount ? (
        <p className="text-sm text-muted-foreground">
          Enter prepared quantity, prepared weight, or both before saving and reserving stock.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

function orderItemsReady(order: CustomerOrder, items: CustomerOrderItem[]) {
  const orderItems = items.filter((item) => item.orderId === order.id)

  return (
    orderItems.length > 0 &&
    orderItems.every(
      (item) =>
        item.status === "PREPARED" &&
        (item.preparedQuantity > 0 || item.preparedWeightKg > 0)
    )
  )
}

export function MarkOrderReadyForm({
  orders,
  items = [],
}: {
  orders: CustomerOrder[]
  items?: CustomerOrderItem[]
}) {
  const readyCandidates = orders.filter(
    (order) =>
      (order.status === "NEW" ||
        order.status === "PREPARING" ||
        order.status === "READY") &&
      orderItemsReady(order, items)
  )

  return (
    <WorkflowCard
      title="Mark order ready"
      description="Move order to ready-for-pickup or ready-for-delivery and create WhatsApp placeholder event."
      action={markCustomerOrderReadyAction}
      submitLabel="Mark ready"
      submitDisabled={readyCandidates.length === 0}
    >
      <div className="space-y-2">
        <Label htmlFor="readyOrderId">Order</Label>
        <NativeSelect
          id="readyOrderId"
          name="orderId"
          disabled={readyCandidates.length === 0}
        >
          <option value="">Select order</option>
          {readyCandidates.map((order) => (
            <option key={order.id} value={order.id}>
              {order.orderNo} - {order.customerName}
            </option>
          ))}
        </NativeSelect>
      </div>
      {readyCandidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Prepare every item with quantity or weight before marking an order ready.
        </p>
      ) : null}
    </WorkflowCard>
  )
}

export function ReleaseOrderReservationsForm({
  orders,
  reservations,
}: {
  orders: CustomerOrder[]
  reservations: OrderStockReservation[]
}) {
  const activeReservationOrderIds = new Set(
    reservations
      .filter((reservation) => reservation.status === "ACTIVE")
      .map((reservation) => reservation.orderId)
  )
  const releaseCandidates = orders.filter(
    (order) =>
      order.status === "CANCELLED" && activeReservationOrderIds.has(order.id)
  )

  return (
    <WorkflowCard
      title="Release reserved stock"
      description="Release active reservations only after a customer order is cancelled. Cancellation itself does not release stock."
      action={releaseOrderReservationsAction}
      submitLabel="Release reservations"
      submitDisabled={releaseCandidates.length === 0}
    >
      <div className="space-y-2">
        <Label htmlFor="releaseOrderId">Cancelled order</Label>
        <NativeSelect
          id="releaseOrderId"
          name="orderId"
          disabled={releaseCandidates.length === 0}
        >
          <option value="">Select cancelled order</option>
          {releaseCandidates.map((order) => (
            <option key={order.id} value={order.id}>
              {order.orderNo} - {order.customerName}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="releaseReason">Release reason</Label>
        <Textarea
          id="releaseReason"
          name="releaseReason"
          placeholder="Customer cancelled after picking"
          required
        />
      </div>
      {releaseCandidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No cancelled orders with active reservations are available.
        </p>
      ) : null}
    </WorkflowCard>
  )
}

export function CustomerOrderDeliveryStatusForm({
  orders,
}: {
  orders: CustomerOrder[]
}) {
  const deliveryOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.deliveryRequired &&
          (order.status === "READY_FOR_DELIVERY" ||
            order.status === "OUT_FOR_DELIVERY")
      ),
    [orders]
  )
  const [orderId, setOrderId] = useState(deliveryOrders[0]?.id ?? "")
  const selectedOrderId = deliveryOrders.some((order) => order.id === orderId)
    ? orderId
    : deliveryOrders[0]?.id ?? ""
  const selectedOrder = deliveryOrders.find(
    (order) => order.id === selectedOrderId
  )
  const statusOptions =
    selectedOrder?.status === "READY_FOR_DELIVERY"
      ? [
          ["OUT_FOR_DELIVERY", "OUT FOR DELIVERY"],
          ["CANCELLED", "CANCELLED"],
        ]
      : selectedOrder?.status === "OUT_FOR_DELIVERY"
        ? [
            ["DELIVERED", "DELIVERED"],
            ["CANCELLED", "CANCELLED"],
          ]
        : []
  const submitDisabled =
    !selectedOrderId || deliveryOrders.length === 0 || statusOptions.length === 0

  return (
    <WorkflowCard
      title="Customer order delivery"
      description="Move ready customer orders through delivery and create WhatsApp placeholder events."
      action={updateCustomerOrderDeliveryStatusAction}
      submitLabel="Update delivery"
      submitDisabled={submitDisabled}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerDeliveryOrderId">Order</Label>
          <NativeSelect
            id="customerDeliveryOrderId"
            name="orderId"
            value={selectedOrderId}
            onChange={setOrderId}
            disabled={deliveryOrders.length === 0}
          >
            <option value="">Select customer order</option>
            {deliveryOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNo} - {order.customerName} - {order.status}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerDeliveryStatus">Status</Label>
          <NativeSelect
            id="customerDeliveryStatus"
            name="status"
            disabled={statusOptions.length === 0}
          >
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {deliveryOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No customer orders are ready for delivery update.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="customerDeliveryNotes">Notes</Label>
        <Textarea id="customerDeliveryNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function CustomerOrderProofUploadForm({
  orders,
}: {
  orders: CustomerOrder[]
}) {
  const deliveryOrders = orders.filter(
    (order) =>
      order.deliveryRequired &&
      (order.status === "OUT_FOR_DELIVERY" ||
        order.status === "DELIVERED" ||
        order.status === "FAILED")
  )
  const submitDisabled = deliveryOrders.length === 0

  return (
    <WorkflowCard
      title="Customer order proof"
      description="Upload proof photo, receiver/contact name, and GPS. Successful proof marks delivered; failed proof returns linked barcode stock."
      action={uploadCustomerOrderProofAction}
      submitLabel="Upload proof"
      submitDisabled={submitDisabled}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerProofOrderId">Order</Label>
          <NativeSelect
            id="customerProofOrderId"
            name="orderId"
            disabled={deliveryOrders.length === 0}
          >
            <option value="">Select customer order</option>
            {deliveryOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNo} - {order.customerName} - {order.status}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerProofFile">Proof photo</Label>
          <Input
            id="customerProofFile"
            name="proofFile"
            type="file"
            accept="image/*"
            required={!submitDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerDeliveryOutcome">Outcome</Label>
          <NativeSelect
            id="customerDeliveryOutcome"
            name="deliveryOutcome"
            disabled={submitDisabled}
          >
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerProofReceiverName">Receiver/contact name</Label>
          <Input
            id="customerProofReceiverName"
            name="receiverName"
            disabled={submitDisabled}
            required={!submitDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerProofLatitude">GPS latitude</Label>
          <Input
            id="customerProofLatitude"
            name="latitude"
            type="number"
            step="0.0000001"
            disabled={submitDisabled}
            required={!submitDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerProofLongitude">GPS longitude</Label>
          <Input
            id="customerProofLongitude"
            name="longitude"
            type="number"
            step="0.0000001"
            disabled={submitDisabled}
            required={!submitDisabled}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerProofNotes">Failed delivery notes</Label>
        <Textarea
          id="customerProofNotes"
          name="notes"
          disabled={submitDisabled}
          placeholder="Reason for failed delivery or return notes"
        />
      </div>
      {deliveryOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Proof photos can be uploaded after a customer order is out for
          delivery, delivered, or failed.
        </p>
      ) : null}
    </WorkflowCard>
  )
}
