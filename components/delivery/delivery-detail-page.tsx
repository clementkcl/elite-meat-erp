"use client"

import Link from "next/link"
import {
  AlertTriangle,
  Camera,
  Check,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Receipt,
  Save,
  Truck,
  X,
} from "lucide-react"
import {
  useActionState,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

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
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import {
  acceptDelivery,
  cancelDeliveryAction,
  changeDeliveryDriverAction,
  changeDeliveryVehicleAction,
  markDeliveryLoaded,
  reportAddressIssue,
  reviewDeliveryAddressSuggestionAction,
  saveSuggestedCustomerGps,
  startDelivery,
  uploadDeliveredProofAndComplete,
  uploadFailedProofAndComplete,
} from "@/lib/delivery/actions"
import {
  initialDeliveryActionState,
  type DeliveryActionState,
} from "@/lib/delivery/action-state"
import {
  deliveryFailedReasons,
  type DeliveryDetail,
  type DeliveryFailedReason,
  type DeliveryPerson,
  type Vehicle,
} from "@/lib/delivery/types"
import type { CurrentProfile } from "@/lib/auth/types"

type MessageState = { status: "idle" | "success" | "error"; message: string }

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatWeight(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-"
  }

  return value.replace("T", " ").slice(0, 16)
}

function mapsUrl(delivery: DeliveryDetail) {
  const latitude = delivery.customerLatitude ?? delivery.completedLatitude
  const longitude = delivery.customerLongitude ?? delivery.completedLongitude

  if (latitude !== null && longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    delivery.deliveryAddress || delivery.customerName
  )}`
}

function whatsappUrl(phone: string) {
  const cleaned = phone.replace(/\D/g, "")

  return cleaned ? `https://wa.me/${cleaned}` : "#"
}

function Message({ state }: { state: MessageState | DeliveryActionState }) {
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
}: {
  id: string
  name: string
  children: ReactNode
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
    >
      {children}
    </select>
  )
}

function useDeliveryDetailAction() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<MessageState>({
    status: "idle",
    message: "",
  })

  function run(action: () => Promise<unknown>, successMessage: string) {
    startTransition(async () => {
      try {
        await action()
        setMessage({ status: "success", message: successMessage })
        router.refresh()
      } catch (error) {
        setMessage({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Action failed. Please try again.",
        })
      }
    })
  }

  function fail(messageText: string) {
    setMessage({ status: "error", message: messageText })
  }

  return { pending, message, run, fail }
}

async function getPhoneGps() {
  return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

async function watermarkProof(file: File, lines: string[]) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  const maxWidth = 1600
  const scale = Math.min(1, maxWidth / bitmap.width)
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    return file
  }

  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const fontSize = Math.max(22, Math.round(canvas.width * 0.025))
  const padding = Math.max(18, Math.round(canvas.width * 0.018))
  const lineHeight = Math.round(fontSize * 1.35)
  const boxHeight = lineHeight * lines.length + padding * 2

  ctx.fillStyle = "rgba(0, 0, 0, 0.68)"
  ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight)
  ctx.fillStyle = "#fff"
  ctx.font = `${fontSize}px sans-serif`

  lines.forEach((line, index) => {
    ctx.fillText(
      line,
      padding,
      canvas.height - boxHeight + padding + lineHeight * (index + 1)
    )
  })

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.88)
  )

  return blob
    ? new File([blob], file.name.replace(/\.[^.]+$/, "") + "-proof.jpg", {
        type: "image/jpeg",
      })
    : file
}

function Header({ delivery }: { delivery: DeliveryDetail }) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="break-words text-2xl">
              {delivery.deliveryNo}
            </CardTitle>
            <CardDescription>
              {label(delivery.deliveryType)} / {delivery.customerName}
            </CardDescription>
          </div>
          <StatusBadge value={delivery.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Customer" value={delivery.customerName} />
          <Info label="Phone" value={delivery.customerPhone || "-"} />
          <Info label="Driver" value={delivery.driverName} />
          <Info label="Vehicle" value={delivery.vehicleNo} />
          <Info label="Total weight" value={formatWeight(delivery.totalWeightKg)} />
          <Info label="Item count" value={`${delivery.itemCount}`} />
          <Info label="Requested" value={delivery.requestedDeliveryDate ?? "-"} />
          <Info label="Completed" value={formatDateTime(delivery.completedAt)} />
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Address</div>
            <div className="mt-1 break-words font-medium">
              {delivery.deliveryAddress || "-"}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Delivery / order note</div>
            <div className="mt-1 break-words font-medium">
              {delivery.deliveryNote || delivery.remarks || "-"}
            </div>
          </div>
        </div>
        <div className="grid gap-2 min-[360px]:grid-cols-3">
          <Button asChild variant="outline" className="min-h-11">
            <a href={mapsUrl(delivery)} target="_blank" rel="noreferrer">
              <Navigation className="size-4" />
              Google Maps
            </a>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <a href={delivery.customerPhone ? `tel:${delivery.customerPhone}` : "#"}>
              <Phone className="size-4" />
              Call
            </a>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <a href={whatsappUrl(delivery.customerPhone)} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function DriverActions({
  delivery,
  driverName,
  vehicles,
}: {
  delivery: DeliveryDetail
  driverName: string
  vehicles: Vehicle[]
}) {
  const { pending, message, run } = useDeliveryDetailAction()
  const [vehicleId, setVehicleId] = useState("")
  const canAccept = delivery.status === "AVAILABLE"
  const canLoad = delivery.status === "ACCEPTED"
  const canStart = delivery.status === "LOADED"
  const canProof = delivery.status === "OUT_FOR_DELIVERY"

  if (!canAccept && !canLoad && !canStart && !canProof) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver actions</CardTitle>
        <CardDescription>Simple delivery steps only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canAccept ? (
          <div className="space-y-3">
            <NativeSelect
              id="acceptVehicleId"
              name="vehicleId"
              value={vehicleId}
              onChange={setVehicleId}
            >
              <option value="">Use default vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNo} / {vehicle.vehicleType}
                </option>
              ))}
            </NativeSelect>
            <Button
              type="button"
              disabled={pending}
              className="min-h-12 w-full text-base"
              onClick={() =>
                run(
                  () => acceptDelivery(delivery.id, vehicleId || null),
                  "Delivery accepted."
                )
              }
            >
              <Truck className="size-5" />
              Accept Delivery
            </Button>
          </div>
        ) : null}
        {canLoad ? (
          <Button
            type="button"
            disabled={pending}
            className="min-h-12 w-full text-base"
            onClick={() =>
              run(() => markDeliveryLoaded(delivery.id), "Delivery loaded.")
            }
          >
            <Package className="size-5" />
            Loaded
          </Button>
        ) : null}
        {canStart ? (
          <Button
            type="button"
            disabled={pending}
            className="min-h-12 w-full text-base"
            onClick={() =>
              run(() => startDelivery(delivery.id), "Delivery started.")
            }
          >
            <Navigation className="size-5" />
            Start Delivery
          </Button>
        ) : null}
        {canProof ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <ProofButton delivery={delivery} driverName={driverName} outcome="DELIVERED" />
            <ProofButton delivery={delivery} driverName={driverName} outcome="FAILED" />
          </div>
        ) : null}
        <AddressIssueForm delivery={delivery} />
        <Message state={message} />
      </CardContent>
    </Card>
  )
}

function AddressIssueForm({ delivery }: { delivery: DeliveryDetail }) {
  const { pending, message, run } = useDeliveryDetailAction()
  const [reason, setReason] = useState("Wrong address")
  const [address, setAddress] = useState(delivery.deliveryAddress)
  const [note, setNote] = useState("")
  const photoRef = useRef<HTMLInputElement>(null)

  if (["DELIVERED", "FAILED", "CANCELLED"].includes(delivery.status)) {
    return null
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <Label>Address issue</Label>
      <div className="grid grid-cols-2 gap-2">
        {["Wrong address", "Hard to find", "Customer moved", "Other"].map((item) => (
          <Button
            key={item}
            type="button"
            variant={reason === item ? "default" : "outline"}
            className="min-h-11"
            onClick={() => setReason(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <Textarea
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="Better address"
        className="min-h-20 text-base"
      />
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional short note"
        className="min-h-16 text-base"
      />
      <div className="space-y-2">
        <Label htmlFor={`addressPhoto-${delivery.id}`}>Optional photo</Label>
        <input
          ref={photoRef}
          id={`addressPhoto-${delivery.id}`}
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full text-sm"
        />
      </div>
      <Button
        type="button"
        disabled={pending}
        variant="outline"
        className="min-h-11 w-full whitespace-normal py-3 text-center"
        onClick={() =>
          run(
            async () => {
              const gps = await getPhoneGps()
              const photoFile = photoRef.current?.files?.[0] ?? null
              await reportAddressIssue(delivery.id, {
                suggestedAddress: address,
                reason,
                note,
                photoFile,
                latitude: gps?.latitude ?? null,
                longitude: gps?.longitude ?? null,
              })
            },
            "Address issue sent."
          )
        }
      >
        <AlertTriangle className="size-4" />
        Address Issue
      </Button>
      <Button
        type="button"
        disabled={pending}
        variant="outline"
        className="min-h-11 w-full"
        onClick={() =>
          run(
            async () => {
              const gps = await getPhoneGps()

              if (!gps) {
                throw new Error("Phone GPS unavailable.")
              }

              await saveSuggestedCustomerGps(delivery.id, gps)
            },
            "Current location sent for manager approval."
          )
        }
      >
        <MapPinIcon />
        Save Current Location as Suggested Customer GPS
      </Button>
      <Message state={message} />
    </div>
  )
}

function MapPinIcon() {
  return <MapPin className="size-4" />
}

function ProofButton({
  delivery,
  driverName,
  outcome,
}: {
  delivery: DeliveryDetail
  driverName: string
  outcome: "DELIVERED" | "FAILED"
}) {
  const { pending, message, run, fail } = useDeliveryDetailAction()
  const inputRef = useRef<HTMLInputElement>(null)
  const [failedReason, setFailedReason] =
    useState<DeliveryFailedReason>("CUSTOMER_NOT_AVAILABLE")
  const [remarks, setRemarks] = useState("")

  function openCamera() {
    if (outcome === "FAILED" && failedReason === "OTHER" && !remarks.trim()) {
      fail("Enter a short note for Other.")
      return
    }

    inputRef.current?.click()
  }

  function submit(file: File) {
    run(async () => {
      const gps = await getPhoneGps()
      const watermarked = await watermarkProof(file, [
        delivery.deliveryNo,
        delivery.customerName,
        driverName,
        new Date().toLocaleString("en"),
        gps ? `GPS ${gps.latitude}, ${gps.longitude}` : "GPS unavailable",
      ])

      if (outcome === "FAILED") {
        await uploadFailedProofAndComplete(
          delivery.id,
          watermarked,
          gps
            ? { latitude: gps.latitude, longitude: gps.longitude }
            : { unavailable: true },
          failedReason,
          remarks.trim() || null
        )
      } else {
        await uploadDeliveredProofAndComplete(
          delivery.id,
          watermarked,
          gps
            ? { latitude: gps.latitude, longitude: gps.longitude }
            : { unavailable: true }
        )
      }
    }, outcome === "FAILED" ? "Failed proof uploaded." : "Delivered proof uploaded.")
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]

          if (file) {
            submit(file)
          }
        }}
      />
      {outcome === "FAILED" ? (
        <div className="space-y-2">
          <Label>Failed reason</Label>
          <div className="grid gap-2">
            {deliveryFailedReasons.map((reason) => (
              <Button
                key={reason}
                type="button"
                variant={failedReason === reason ? "default" : "outline"}
                className="min-h-10 justify-center"
                onClick={() => setFailedReason(reason)}
              >
                {label(reason)}
              </Button>
            ))}
          </div>
          {failedReason === "OTHER" ? (
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Remark required for Other"
              className="min-h-20 text-base"
            />
          ) : null}
        </div>
      ) : null}
      <Button
        type="button"
        disabled={pending}
        className="min-h-12 w-full text-base"
        onClick={openCamera}
      >
        <Camera className="size-5" />
        {outcome === "FAILED" ? "Upload Failed Proof" : "Upload Delivered Proof"}
      </Button>
      <Message state={message} />
    </div>
  )
}

function ManagerControls({
  delivery,
  drivers,
  vehicles,
}: {
  delivery: DeliveryDetail
  drivers: DeliveryPerson[]
  vehicles: Vehicle[]
}) {
  const closed = ["DELIVERED", "FAILED", "CANCELLED"].includes(delivery.status)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager controls</CardTitle>
        <CardDescription>Assign, update, or cancel this delivery.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        <DriverForm delivery={delivery} drivers={drivers} disabled={closed} />
        <VehicleForm delivery={delivery} vehicles={vehicles} disabled={closed} />
        <CancelForm delivery={delivery} disabled={closed} />
      </CardContent>
    </Card>
  )
}

function SubmitButton({
  children,
  pending,
  disabled,
  destructive = false,
}: {
  children: ReactNode
  pending: boolean
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      variant={destructive ? "destructive" : "default"}
      className="min-h-11 w-full"
    >
      {destructive ? <X className="size-4" /> : <Save className="size-4" />}
      {pending ? "Saving..." : children}
    </Button>
  )
}

function DriverForm({
  delivery,
  drivers,
  disabled,
}: {
  delivery: DeliveryDetail
  drivers: DeliveryPerson[]
  disabled: boolean
}) {
  const [state, formAction, pending] = useActionState(
    changeDeliveryDriverAction,
    initialDeliveryActionState
  )

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="deliveryId" value={delivery.id} />
      <Label htmlFor="managerDriverId">Driver</Label>
      <NativeSelect
        id="managerDriverId"
        name="driverId"
        defaultValue={delivery.driverId ?? ""}
      >
        <option value="">Unassigned</option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.fullName}
          </option>
        ))}
      </NativeSelect>
      <SubmitButton pending={pending} disabled={disabled}>
        Change Driver
      </SubmitButton>
      <Message state={state} />
    </form>
  )
}

function VehicleForm({
  delivery,
  vehicles,
  disabled,
}: {
  delivery: DeliveryDetail
  vehicles: Vehicle[]
  disabled: boolean
}) {
  const [state, formAction, pending] = useActionState(
    changeDeliveryVehicleAction,
    initialDeliveryActionState
  )

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="deliveryId" value={delivery.id} />
      <Label htmlFor="managerVehicleId">Vehicle</Label>
      <NativeSelect
        id="managerVehicleId"
        name="vehicleId"
        defaultValue={delivery.vehicleId ?? ""}
      >
        <option value="">No vehicle</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.vehicleNo} / {vehicle.vehicleType}
          </option>
        ))}
      </NativeSelect>
      <SubmitButton pending={pending} disabled={disabled}>
        Change Vehicle
      </SubmitButton>
      <Message state={state} />
    </form>
  )
}

function CancelForm({
  delivery,
  disabled,
}: {
  delivery: DeliveryDetail
  disabled: boolean
}) {
  const [state, formAction, pending] = useActionState(
    cancelDeliveryAction,
    initialDeliveryActionState
  )

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="deliveryId" value={delivery.id} />
      <Label htmlFor="cancelRemarks">Cancel reason</Label>
      <Textarea
        id="cancelRemarks"
        name="remarks"
        className="min-h-20 text-base md:text-sm"
        disabled={disabled}
      />
      <SubmitButton pending={pending} disabled={disabled} destructive>
        Cancel Delivery
      </SubmitButton>
      <Message state={state} />
    </form>
  )
}

function LinkedOrders({
  delivery,
  canOpenOrders,
}: {
  delivery: DeliveryDetail
  canOpenOrders: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked orders</CardTitle>
        <CardDescription>{delivery.orders.length} order link(s)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {delivery.orders.length === 0 ? (
          <EmptyState
            title="No linked orders"
            description="Manual deliveries can exist without a source order."
          />
        ) : (
          delivery.orders.map((order) => (
            <div key={order.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{order.orderNo}</div>
                {canOpenOrders && order.sourceCustomerOrderId ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/orders/${order.sourceCustomerOrderId}`}>
                      Open order
                    </Link>
                  </Button>
                ) : null}
              </div>
              <div className="mt-1 text-muted-foreground">
                {order.customerName} / {order.customerPhone || "-"}
              </div>
              <div className="mt-1 break-words">{order.deliveryAddress || "-"}</div>
              {order.orderNote ? (
                <div className="mt-1 text-muted-foreground">{order.orderNote}</div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function Items({ delivery }: { delivery: DeliveryDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Items</CardTitle>
        <CardDescription>
          {formatWeight(delivery.totalWeightKg)} / {delivery.itemCount} item(s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {delivery.items.length === 0 ? (
          <EmptyState title="No items" description="Items will appear after delivery creation." />
        ) : (
          delivery.items.map((item) => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{item.itemDescription}</div>
              <div className="mt-1 grid gap-2 text-muted-foreground min-[360px]:grid-cols-2">
                <div>Quantity: {item.quantity.toLocaleString()}</div>
                <div>Weight: {formatWeight(item.weightKg)}</div>
              </div>
              {item.notes ? <div className="mt-1">{item.notes}</div> : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function Proofs({ delivery }: { delivery: DeliveryDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proof photos</CardTitle>
        <CardDescription>{delivery.proofs.length} uploaded proof photo(s)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {delivery.proofs.length === 0 ? (
          <EmptyState title="No proof uploaded" description="Proof appears after driver completion." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {delivery.proofs.map((proof) => (
              <div key={proof.id} className="overflow-hidden rounded-md border">
                {proof.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={proof.signedUrl}
                    alt={`${proof.proofType} proof`}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">
                    {proof.objectPath || "Proof photo"}
                  </div>
                )}
                <div className="space-y-1 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge value={proof.proofType} />
                    <span className="text-muted-foreground">
                      {formatDateTime(proof.uploadedAt)}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {proof.gpsUnavailable
                      ? "GPS unavailable"
                      : proof.latitude !== null && proof.longitude !== null
                        ? `${proof.latitude}, ${proof.longitude}`
                        : "No GPS saved"}
                  </div>
                  {proof.failedReason ? <div>{label(proof.failedReason)}</div> : null}
                  {proof.remarks ? <div>{proof.remarks}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GpsStatus({ delivery }: { delivery: DeliveryDetail }) {
  const latestProof = delivery.proofs[0]
  const gpsUnavailable = delivery.gpsUnavailable || latestProof?.gpsUnavailable
  const latitude = delivery.completedLatitude ?? latestProof?.latitude ?? null
  const longitude = delivery.completedLongitude ?? latestProof?.longitude ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle>GPS status</CardTitle>
        <CardDescription>Captured only during proof or completion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {gpsUnavailable ? (
          <Badge variant="warning">GPS unavailable</Badge>
        ) : latitude !== null && longitude !== null ? (
          <Badge variant="success">GPS captured</Badge>
        ) : (
          <Badge variant="outline">No completion GPS yet</Badge>
        )}
        <div className="text-muted-foreground">
          {latitude !== null && longitude !== null
            ? `${latitude}, ${longitude}`
            : "Coordinates will appear after proof upload if available."}
        </div>
      </CardContent>
    </Card>
  )
}

function Suggestions({
  delivery,
  canManage,
}: {
  delivery: DeliveryDetail
  canManage: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Address / GPS suggestions</CardTitle>
        <CardDescription>Manager approval queue for customer location updates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {delivery.addressSuggestions.length === 0 ? (
          <EmptyState title="No suggestions" description="Driver address issues appear here." />
        ) : (
          delivery.addressSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="space-y-3 rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{suggestion.customerName}</div>
                <StatusBadge value={suggestion.status} />
              </div>
              <div className="break-words">{suggestion.suggestedAddress || "-"}</div>
              <div className="text-muted-foreground">
                {suggestion.suggestedLatitude !== null &&
                suggestion.suggestedLongitude !== null
                  ? `${suggestion.suggestedLatitude}, ${suggestion.suggestedLongitude}`
                  : "No GPS suggested"}
              </div>
              <div className="text-muted-foreground">{suggestion.reason || "-"}</div>
              {suggestion.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={suggestion.signedUrl}
                  alt="Address issue"
                  className="aspect-video w-full rounded-md border object-cover"
                />
              ) : null}
              {canManage && suggestion.status === "PENDING" ? (
                <SuggestionReviewForm
                  deliveryId={delivery.id}
                  suggestionId={suggestion.id}
                />
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function SuggestionReviewForm({
  deliveryId,
  suggestionId,
}: {
  deliveryId: string
  suggestionId: string
}) {
  const [state, formAction, pending] = useActionState(
    reviewDeliveryAddressSuggestionAction,
    initialDeliveryActionState
  )

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input type="hidden" name="suggestionId" value={suggestionId} />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="submit"
          name="status"
          value="APPROVED"
          disabled={pending}
          className="min-h-10"
        >
          <Check className="size-4" />
          Approve
        </Button>
        <Button
          type="submit"
          name="status"
          value="REJECTED"
          disabled={pending}
          variant="outline"
          className="min-h-10"
        >
          Reject
        </Button>
      </div>
      <Message state={state} />
    </form>
  )
}

function Expenses({
  delivery,
  canShowAmount,
}: {
  delivery: DeliveryDetail
  canShowAmount: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>{delivery.expenses.length} expense record(s)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {delivery.expenses.length === 0 ? (
          <EmptyState title="No expenses" description="Driver claims appear here after submission." />
        ) : (
          delivery.expenses.map((expense) => (
            <div key={expense.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{label(expense.expenseType)}</div>
                <StatusBadge value={expense.status} />
              </div>
              <div className="mt-1 text-muted-foreground">
                {formatDateTime(expense.createdAt)}
              </div>
              {canShowAmount ? (
                <div className="mt-1">Amount: RM {expense.amount.toFixed(2)}</div>
              ) : null}
              {expense.receiptUrl ? (
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
                >
                  <Receipt className="size-4" />
                  View receipt photo
                </a>
              ) : null}
              {expense.remark ? <div className="mt-1">{expense.remark}</div> : null}
              {expense.rejectedReason ? (
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-red-700">
                  {expense.rejectedReason}
                </div>
              ) : null}
              {expense.reviewNote ? (
                <div className="mt-2 rounded-md border bg-muted/30 p-2">
                  {expense.reviewNote}
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function Timeline({ delivery }: { delivery: DeliveryDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status timeline</CardTitle>
        <CardDescription>{delivery.statusLogs.length} status log(s)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {delivery.statusLogs.length === 0 ? (
          <EmptyState title="No status logs" description="Timeline appears after delivery updates." />
        ) : (
          delivery.statusLogs.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge value={entry.statusText || entry.status} />
                <span className="text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
              {entry.notes ? <div className="mt-2 break-words">{entry.notes}</div> : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function Remarks({ delivery }: { delivery: DeliveryDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Remarks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>{delivery.remarks || delivery.deliveryNote || "-"}</div>
        {delivery.failedReason ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            Failed reason: {label(delivery.failedReason)}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function DeliveryDetailPage({
  delivery,
  profile,
  vehicles,
  drivers,
}: {
  delivery: DeliveryDetail
  profile: CurrentProfile
  vehicles: Vehicle[]
  drivers: DeliveryPerson[]
}) {
  const canManage =
    profile.roles.includes("delivery_manager") || profile.roles.includes("admin")
  const canUseDriverActions =
    profile.roles.includes("delivery_team_general_worker") ||
    profile.roles.includes("delivery_manager") ||
    profile.roles.includes("admin")
  const canOpenOrders =
    canManage ||
    profile.roles.includes("retail_manager") ||
    profile.roles.includes("processing_manager") ||
    profile.roles.includes("director")

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Delivery Detail
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Delivery status, proof, items, GPS, and manager review.
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-10">
          <Link href={canManage ? "/delivery" : "/delivery/driver"}>
            Back to delivery
          </Link>
        </Button>
      </div>

      <Header delivery={delivery} />

      {canUseDriverActions ? (
        <DriverActions
          delivery={delivery}
          driverName={profile.fullName}
          vehicles={vehicles}
        />
      ) : null}

      {canManage ? (
        <ManagerControls delivery={delivery} drivers={drivers} vehicles={vehicles} />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <LinkedOrders delivery={delivery} canOpenOrders={canOpenOrders} />
        <Items delivery={delivery} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Proofs delivery={delivery} />
        <div className="space-y-4">
          <GpsStatus delivery={delivery} />
          <Remarks delivery={delivery} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Suggestions delivery={delivery} canManage={canManage} />
        <Expenses delivery={delivery} canShowAmount={canManage} />
      </div>

      <Timeline delivery={delivery} />
    </div>
  )
}
