"use client"

import { MapPin, Save, Upload } from "lucide-react"
import { useActionState, useState, type ReactNode } from "react"

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
import {
  createDeliveryOrderAction,
  createVehicleAction,
  recordDeliveryPaymentAction,
  recordDriverLocationAction,
  updateDeliveryStatusAction,
  uploadProofOfDeliveryAction,
} from "@/lib/delivery/actions"
import {
  initialDeliveryActionState,
  type DeliveryActionState,
} from "@/lib/delivery/action-state"
import {
  deliveryPaymentStatuses,
  deliveryPaymentTypes,
  deliverySourceTypes,
  deliveryStatuses,
  type DeliveryOrder,
  type DeliveryPerson,
  type Vehicle,
} from "@/lib/delivery/types"

type StatefulAction = (
  state: DeliveryActionState,
  formData: FormData
) => Promise<DeliveryActionState>

function ActionMessage({ state }: { state: DeliveryActionState }) {
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
  required = true,
}: {
  id: string
  name: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <select
      id={id}
      name={name}
      required={required}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {children}
    </select>
  )
}

function SubmitButton({
  pending,
  children,
  icon = "save",
}: {
  pending: boolean
  children: ReactNode
  icon?: "save" | "upload" | "location"
}) {
  const Icon = icon === "upload" ? Upload : icon === "location" ? MapPin : Save

  return (
    <Button type="submit" disabled={pending}>
      <Icon className="size-4" />
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
  submitIcon,
}: {
  title: string
  description: string
  action: StatefulAction
  children: ReactNode
  submitLabel: string
  submitIcon?: "save" | "upload" | "location"
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialDeliveryActionState
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
          <SubmitButton pending={pending} icon={submitIcon}>
            {submitLabel}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

function VehicleSelect({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <NativeSelect id="vehicleId" name="vehicleId" required={false}>
      <option value="">No vehicle</option>
      {vehicles.map((vehicle) => (
        <option key={vehicle.id} value={vehicle.id}>
          {vehicle.vehicleNo} - {vehicle.vehicleType}
        </option>
      ))}
    </NativeSelect>
  )
}

function DriverSelect({ drivers }: { drivers: DeliveryPerson[] }) {
  return (
    <NativeSelect id="driverId" name="driverId" required={false}>
      <option value="">No driver</option>
      {drivers.map((driver) => (
        <option key={driver.id} value={driver.id}>
          {driver.fullName}
        </option>
      ))}
    </NativeSelect>
  )
}

function OrderSelect({
  orders,
  id = "orderId",
}: {
  orders: DeliveryOrder[]
  id?: string
}) {
  return (
    <NativeSelect id={id} name="orderId">
      <option value="">Select order</option>
      {orders.map((order) => (
        <option key={order.id} value={order.id}>
          {order.orderNo} - {order.customerName}
        </option>
      ))}
    </NativeSelect>
  )
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

export function NewDeliveryOrderForm({
  vehicles,
  drivers,
}: {
  vehicles: Vehicle[]
  drivers: DeliveryPerson[]
}) {
  return (
    <WorkflowCard
      title="New delivery order"
      description="Create customer delivery, dispatch, and first item details."
      action={createDeliveryOrderAction}
      submitLabel="Create order"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer name</Label>
          <Input id="customerName" name="customerName" placeholder="Retail outlet" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Customer phone</Label>
          <Input id="customerPhone" name="customerPhone" placeholder="+60 12..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerLocation">Customer location</Label>
          <Input
            id="customerLocation"
            name="customerLocation"
            placeholder="Sungai Merah"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedDeliveryDate">Delivery date</Label>
          <Input id="requestedDeliveryDate" name="requestedDeliveryDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sourceType">Order source</Label>
          <NativeSelect id="sourceType" name="sourceType">
            {deliverySourceTypes.map((type) => (
              <option key={type} value={type}>
                {sourceTypeLabel(type)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sourceReference">Source reference</Label>
          <Input id="sourceReference" name="sourceReference" placeholder="RS-20260610-001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleId">Vehicle</Label>
          <VehicleSelect vehicles={vehicles} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driverId">Driver</Label>
          <DriverSelect drivers={drivers} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentType">Payment type</Label>
          <NativeSelect id="paymentType" name="paymentType">
            {deliveryPaymentTypes.map((type) => (
              <option key={type} value={type}>
                {paymentTypeLabel(type)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment status</Label>
          <NativeSelect id="paymentStatus" name="paymentStatus">
            {deliveryPaymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="deliveryAddress">Delivery address</Label>
          <Textarea id="deliveryAddress" name="deliveryAddress" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="itemDescription">Item</Label>
          <Input
            id="itemDescription"
            name="itemDescription"
            placeholder="MEAT / BELLY / BONELESS"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" min="0" step="1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weightKg">Weight kg</Label>
          <Input id="weightKg" name="weightKg" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function DeliveryStatusForm({ orders }: { orders: DeliveryOrder[] }) {
  return (
    <WorkflowCard
      title="Update progress"
      description="Move an order through dispatch and delivery status."
      action={updateDeliveryStatusAction}
      submitLabel="Update status"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="orderId">Order</Label>
          <OrderSelect orders={orders} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status">
            {deliveryStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="statusNotes">Notes</Label>
        <Textarea id="statusNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function ProofUploadForm({ orders }: { orders: DeliveryOrder[] }) {
  return (
    <WorkflowCard
      title="Proof of delivery"
      description="Attach proof photo to a delivered order."
      action={uploadProofOfDeliveryAction}
      submitLabel="Upload proof"
      submitIcon="upload"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="proofOrderId">Order</Label>
          <OrderSelect id="proofOrderId" orders={orders} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proofFile">File</Label>
          <Input id="proofFile" name="proofFile" type="file" accept="image/*" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function VehicleForm() {
  return (
    <WorkflowCard
      title="Add vehicle"
      description="Register lorries, vans, and other delivery vehicles."
      action={createVehicleAction}
      submitLabel="Save vehicle"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="vehicleNo">Vehicle no.</Label>
          <Input id="vehicleNo" name="vehicleNo" placeholder="EM-LORRY-01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleType">Type</Label>
          <Input id="vehicleType" name="vehicleType" placeholder="LORRY" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacityKg">Capacity kg</Label>
          <Input id="capacityKg" name="capacityKg" type="number" min="0" step="0.01" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function DriverLocationForm({ orders }: { orders: DeliveryOrder[] }) {
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [geoError, setGeoError] = useState("")

  function captureLocation() {
    setGeoError("")

    if (!navigator.geolocation) {
      setGeoError("Location is not available in this browser.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7))
        setLongitude(position.coords.longitude.toFixed(7))
      },
      (error) => setGeoError(error.message),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <WorkflowCard
      title="Driver location"
      description="Record current driver position against an active delivery."
      action={recordDriverLocationAction}
      submitLabel="Record location"
      submitIcon="location"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="locationOrderId">Order</Label>
          <OrderSelect id="locationOrderId" orders={orders} />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={captureLocation}>
            <MapPin className="size-4" />
            Use Current Location
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            name="latitude"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="2.2871000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            name="longitude"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="111.8320000"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="locationNote">Location note</Label>
        <Textarea id="locationNote" name="locationNote" />
      </div>
      {geoError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {geoError}
        </div>
      ) : null}
    </WorkflowCard>
  )
}

export function DeliveryPaymentForm({ orders }: { orders: DeliveryOrder[] }) {
  return (
    <WorkflowCard
      title="Record payment"
      description="Capture credit, cash, and online transfer payment updates."
      action={recordDeliveryPaymentAction}
      submitLabel="Save payment"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="paymentOrderId">Order</Label>
          <OrderSelect id="paymentOrderId" orders={orders} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentType">Payment type</Label>
          <NativeSelect id="paymentType" name="paymentType">
            {deliveryPaymentTypes.map((type) => (
              <option key={type} value={type}>
                {paymentTypeLabel(type)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment status</Label>
          <NativeSelect id="paymentStatus" name="paymentStatus">
            {deliveryPaymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" name="amount" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNo">Reference no.</Label>
          <Input id="referenceNo" name="referenceNo" placeholder="Receipt or transfer ref" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentNotes">Notes</Label>
          <Input id="paymentNotes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}
