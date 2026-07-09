"use client"

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  Phone,
  Receipt,
  Truck,
} from "lucide-react"
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  acceptDelivery,
  createDeliveryExpense,
  markDeliveryLoaded,
  reportAddressIssue,
  saveSuggestedCustomerGps,
  startDelivery,
  uploadDeliveredProofAndComplete,
  uploadFailedProofAndComplete,
} from "@/lib/delivery/actions"
import {
  deliveryExpenseTypes,
  deliveryFailedReasons,
  type Delivery,
  type DeliveryExpense,
  type DeliveryExpenseType,
  type DeliveryFailedReason,
  type DeliveryUpcomingOrder,
  type Vehicle,
} from "@/lib/delivery/types"

const tabs = [
  "Available",
  "My Deliveries",
  "Completed",
  "Failed",
  "Expenses",
] as const

type DriverTab = (typeof tabs)[number]
type MessageState = { status: "idle" | "success" | "error"; message: string }

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function Message({ state }: { state: MessageState }) {
  if (!state.message) {
    return null
  }

  return (
    <div
      role={state.status === "error" ? "alert" : "status"}
      aria-live={state.status === "error" ? "assertive" : "polite"}
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
  value,
  defaultValue,
  required = true,
  onChange,
}: {
  id: string
  name: string
  children: ReactNode
  value?: string
  defaultValue?: string
  required?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      required={required}
      onChange={(event) => onChange?.(event.target.value)}
      className="min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
    >
      {children}
    </select>
  )
}

function statusVariant(status: Delivery["status"]) {
  if (status === "DELIVERED") {
    return "success"
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "destructive"
  }

  if (status === "LOADED" || status === "OUT_FOR_DELIVERY") {
    return "warning"
  }

  return "outline"
}

function mapsUrl(delivery: Delivery) {
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

function deliverySummary(delivery: Delivery) {
  return `${delivery.totalWeightKg.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} kg / ${delivery.itemCount} item${delivery.itemCount === 1 ? "" : "s"}`
}

function kg(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`
}

function driverStepText(delivery: Delivery) {
  switch (delivery.status) {
    case "AVAILABLE":
      return "Tap Accept Delivery to take this job."
    case "ACCEPTED":
      return "Next: load the goods, then tap Loaded."
    case "LOADED":
      return "Next: tap Start Delivery when leaving the outlet."
    case "OUT_FOR_DELIVERY":
      return "Next: visit the customer, then upload Delivered or Failed proof photo."
    case "DELIVERED":
      return "Done. Proof photo was uploaded."
    case "FAILED":
      return "Failed proof uploaded. Manager must check the return follow-up."
    default:
      return "Check this delivery with a manager."
  }
}

function driverMainAction(delivery: Delivery) {
  switch (delivery.status) {
    case "AVAILABLE":
      return {
        title: "Main action: Accept this job",
        detail: "No typing needed unless the vehicle is wrong.",
      }
    case "ACCEPTED":
      return {
        title: "Main action: Tap Loaded",
        detail: "Use this after the goods are on the vehicle.",
      }
    case "LOADED":
      return {
        title: "Main action: Start Delivery",
        detail: "Use this when leaving the outlet for the customer.",
      }
    case "OUT_FOR_DELIVERY":
      return {
        title: "Main action: Upload proof photo",
        detail: "Delivered and Failed both need a photo before completion.",
      }
    case "DELIVERED":
      return {
        title: "Main action: Check next job",
        detail: "This job is complete after proof upload.",
      }
    case "FAILED":
      return {
        title: "Main action: Tell manager",
        detail: "Failed delivery needs manager return follow-up.",
      }
    default:
      return {
        title: "Main action: Ask manager",
        detail: "This delivery needs review before continuing.",
      }
  }
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

function useDeliveryAction() {
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

  function fail(message: string) {
    setMessage({ status: "error", message })
  }

  return { pending, message, run, fail }
}

function QuickLinks({ delivery }: { delivery: Delivery }) {
  return (
    <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
      <Button asChild variant="outline" className="min-h-12 justify-center text-base">
        <a href={mapsUrl(delivery)} target="_blank" rel="noreferrer">
          <Navigation className="size-5" />
          Google Maps
        </a>
      </Button>
      <Button asChild variant="outline" className="min-h-12 justify-center text-base">
        <a href={delivery.customerPhone ? `tel:${delivery.customerPhone}` : "#"}>
          <Phone className="size-5" />
          Call
        </a>
      </Button>
      <Button asChild variant="outline" className="min-h-12 justify-center text-base">
        <a href={whatsappUrl(delivery.customerPhone)} target="_blank" rel="noreferrer">
          <MessageCircle className="size-5" />
          WhatsApp
        </a>
      </Button>
    </div>
  )
}

function DeliveryCardShell({
  delivery,
  children,
}: {
  delivery: Delivery
  children?: ReactNode
}) {
  const mainAction = driverMainAction(delivery)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="break-words text-xl">{delivery.customerName}</CardTitle>
            <CardDescription className="break-words">
              {delivery.deliveryNo}
            </CardDescription>
          </div>
          <Badge variant={statusVariant(delivery.status)} className="mt-1">
            {label(delivery.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <div className="text-base font-semibold">{mainAction.title}</div>
            <div className="mt-1 text-sm text-emerald-950/75">
              {mainAction.detail}
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
            {driverStepText(delivery)}
          </div>
          {delivery.deliveryNote ? (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Customer remarks
              </div>
              <div className="mt-1 break-words font-medium">
                {delivery.deliveryNote}
              </div>
            </div>
          ) : null}
          <div className="flex gap-2 break-words text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span>{delivery.deliveryAddress || "No address saved"}</span>
          </div>
          <div className="grid gap-2 text-muted-foreground min-[360px]:grid-cols-2">
            <div>{delivery.customerPhone || "No phone saved"}</div>
            <div>{deliverySummary(delivery)}</div>
          </div>
        </div>
        <QuickLinks delivery={delivery} />
        {children}
      </CardContent>
    </Card>
  )
}

function AvailableCard({
  delivery,
  vehicles,
}: {
  delivery: Delivery
  vehicles: Vehicle[]
}) {
  const { pending, message, run } = useDeliveryAction()
  const [showVehicle, setShowVehicle] = useState(false)
  const [vehicleId, setVehicleId] = useState("")
  const acceptSteps = ["Tap Accept", "Load goods", "Tap Loaded", "Start delivery"]

  return (
    <DeliveryCardShell delivery={delivery}>
      {showVehicle ? (
        <div className="space-y-2 rounded-md border p-3">
          <Label htmlFor={`${delivery.id}-vehicle`}>Vehicle</Label>
          <NativeSelect
            id={`${delivery.id}-vehicle`}
            name="vehicleId"
            value={vehicleId}
            required={false}
            onChange={setVehicleId}
          >
            <option value="">Use default vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicleNo} / {vehicle.vehicleType}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      <div className="rounded-md border bg-muted/30 p-3">
        <div className="text-sm font-semibold">Driver accept steps</div>
        <div className="mt-1 text-sm text-muted-foreground">
          No typing for normal accept. Use Change Vehicle only when needed.
        </div>
        <div className="mt-3 grid gap-2 min-[360px]:grid-cols-4">
          {acceptSteps.map((step, index) => (
            <div key={step} className="rounded-md border bg-background px-3 py-3">
              <div className="text-xs font-medium text-muted-foreground">
                Step {index + 1}
              </div>
              <div className="mt-1 text-sm font-semibold">{step}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        One tap accepts this delivery. Change vehicle only when the default is wrong.
      </div>
      <Button
        type="button"
        disabled={pending}
        className="min-h-16 w-full text-base"
        onClick={() =>
          run(
            () => acceptDelivery(delivery.id, vehicleId || null),
            "Delivery accepted. Next: load goods, then tap Loaded."
          )
        }
      >
        <Truck className="size-5" />
        {pending ? "Accepting..." : "Accept Delivery"}
      </Button>
      <div className="grid gap-2 min-[360px]:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full text-base"
          onClick={() => setShowVehicle((value) => !value)}
        >
          Change Vehicle
        </Button>
      </div>
      <Message state={message} />
    </DeliveryCardShell>
  )
}

function AddressIssueForm({ delivery }: { delivery: Delivery }) {
  const { pending, message, run } = useDeliveryAction()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("Wrong address")
  const [address, setAddress] = useState(delivery.deliveryAddress)
  const [note, setNote] = useState("")
  const photoRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="min-h-12 w-full text-base"
        onClick={() => setOpen((value) => !value)}
      >
        <AlertTriangle className="size-5" />
        Address Issue
      </Button>
      {open ? (
        <div className="space-y-3 rounded-md border p-3">
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
            className="min-h-24 text-base"
          />
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional short note"
            className="min-h-20 text-base"
          />
          <div className="space-y-2">
            <Label htmlFor={`${delivery.id}-address-photo`}>
              Optional photo
            </Label>
            <input
              ref={photoRef}
              id={`${delivery.id}-address-photo`}
              type="file"
              accept="image/*"
              capture="environment"
              className="w-full text-sm"
            />
          </div>
          <Button
            type="button"
            disabled={pending}
            className="min-h-12 w-full text-base"
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
                "Address issue sent for manager review."
              )
            }
          >
            Send Address Issue
          </Button>
          <Button
            type="button"
            disabled={pending}
            variant="outline"
            className="min-h-12 w-full whitespace-normal py-3 text-center text-base"
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
            <MapPin className="size-5" />
            Save Current Location as Suggested Customer GPS
          </Button>
          <Message state={message} />
        </div>
      ) : null}
    </div>
  )
}

function ProofSuccessNextStep({
  outcome,
  state,
}: {
  outcome: "DELIVERED" | "FAILED"
  state: MessageState
}) {
  if (state.status !== "success" || !state.message.includes("proof uploaded")) {
    return null
  }

  const steps =
    outcome === "FAILED"
      ? ["Failed proof saved", "Tell manager", "Return follow-up"]
      : ["Delivery complete", "Check next job", "Completed tab"]

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            Proof uploaded
          </p>
          <p className="text-sm text-emerald-900/75">
            {outcome === "FAILED"
              ? "Manager must review the failed delivery and stock return follow-up."
              : "This delivery is complete. Continue with the next job if one is shown."}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 min-[380px]:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border bg-background/80 px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">
              Next {index + 1}
            </div>
            <div className="mt-1 text-sm font-semibold">{step}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProofBlockedGuide({ status }: { status: Delivery["status"] }) {
  if (status !== "ACCEPTED" && status !== "LOADED") {
    return null
  }

  const steps =
    status === "ACCEPTED"
      ? ["Accept done", "Tap Loaded", "Start Delivery", "Proof buttons appear"]
      : ["Loaded done", "Tap Start Delivery", "Visit customer", "Proof buttons appear"]

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-semibold">Proof photo locked until Start Delivery</div>
      <p className="mt-1">
        Finish the current step first. Delivered and Failed proof buttons appear
        after Start Delivery.
      </p>
      <div className="mt-3 grid gap-2 min-[380px]:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border bg-background px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">
              Step {index + 1}
            </div>
            <div className="mt-1 font-semibold">{step}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProofForm({
  delivery,
  outcome,
  driverName,
}: {
  delivery: Delivery
  outcome: "DELIVERED" | "FAILED"
  driverName: string
}) {
  const { pending, message, run, fail } = useDeliveryAction()
  const inputRef = useRef<HTMLInputElement>(null)
  const [failedReason, setFailedReason] =
    useState<DeliveryFailedReason>("CUSTOMER_NOT_AVAILABLE")
  const [remarks, setRemarks] = useState("")
  const proofSteps =
    outcome === "FAILED"
      ? ["Choose reason", "Take proof photo", "Manager follow-up"]
      : ["Take proof photo", "GPS tried", "Delivery complete"]

  function openCamera() {
    if (outcome === "FAILED" && failedReason === "OTHER" && !remarks.trim()) {
      fail("Enter a short note for Other.")
      return
    }

    inputRef.current?.click()
  }

  function submit(file: File) {
    if (!file) {
      return
    }

    run(
      async () => {
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
        if (inputRef.current) {
          inputRef.current.value = ""
        }
      },
      outcome === "FAILED"
        ? "Failed proof uploaded. Next: tell the manager if stock needs return follow-up."
        : "Delivered proof uploaded. This delivery is complete."
    )
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-medium">
          <Camera className="size-5" />
          {outcome === "FAILED" ? "Failed proof photo" : "Delivered proof photo"}
        </div>
        <p className="text-sm text-muted-foreground">
          Photo opens the camera. GPS is tried automatically during upload.
        </p>
      </div>
      <div className="grid gap-2 min-[380px]:grid-cols-3">
        {proofSteps.map((step, index) => (
          <div key={step} className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">
              Step {index + 1}
            </div>
            <div className="mt-1 text-sm font-semibold">{step}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="warning">Photo required</Badge>
        <Badge variant="outline">GPS tried automatically</Badge>
        {outcome === "FAILED" ? (
          <Badge variant="destructive">Return follow-up needed</Badge>
        ) : (
          <Badge variant="success">Auto-completes delivery</Badge>
        )}
      </div>
      <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
        {outcome === "FAILED"
          ? "Failed proof records the failed reason and tells the manager to check stock return follow-up."
          : "Delivered proof completes the delivery after the photo uploads."}
      </div>
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
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {deliveryFailedReasons.map((reason) => (
              <Button
                key={reason}
                type="button"
                variant={failedReason === reason ? "default" : "outline"}
                className="min-h-12 justify-center text-base"
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
        className="min-h-16 w-full text-base"
        onClick={openCamera}
      >
        <Camera className="size-5" />
        {pending
          ? "Uploading..."
          : outcome === "FAILED"
            ? "Upload Failed Proof"
            : "Upload Delivered Proof"}
      </Button>
      <Message state={message} />
      <ProofSuccessNextStep outcome={outcome} state={message} />
    </div>
  )
}

function UpcomingOrderCard({ order }: { order: DeliveryUpcomingOrder }) {
  const status =
    order.status === "READY"
      ? "Price Required"
      : order.status === "PREPARING"
        ? "Picking"
        : "Preparing"
  const waitingTitle =
    order.status === "READY" ? "Final price needed" : "Preparing order"
  const waitingText =
    order.status === "READY"
      ? "Picked weight is visible. Accept appears after final price is saved."
      : "Progress is visible. Accept appears after picking and final price are done."

  return (
    <Card className="overflow-hidden border-amber-200 bg-amber-50/40">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="break-words text-xl">{order.customerName}</CardTitle>
            <CardDescription className="break-words">
              {order.orderNo}
            </CardDescription>
          </div>
          <Badge variant="warning" className="mt-1">
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-background p-3 text-sm">
          <div className="text-base font-semibold text-amber-900">
            {waitingTitle}
          </div>
          <div className="mt-1 text-amber-900/80">
            {waitingText}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">Picking progress</span>
            <span className="tabular-nums">{order.progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-background">
            <div
              className="h-2 rounded-full bg-amber-500"
              style={{ width: `${order.progressPercent}%` }}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Picked {kg(order.pickedWeightKg)} / {kg(order.totalEstimatedWeightKg)}
          </div>
        </div>
        {order.items.length > 0 ? (
          <div className="space-y-2 rounded-md border bg-background p-3">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Items and customization
            </div>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="break-words text-sm font-medium">
                    {item.itemLabel}
                  </div>
                  {Object.keys(item.customization).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.customization).flatMap(([group, options]) =>
                        options.map((option) => (
                          <Badge key={`${item.id}-${group}-${option}`} variant="outline">
                            {group}: {option}
                          </Badge>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No customization
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {order.customerRemarks ? (
          <div className="rounded-md border bg-background p-3 text-sm">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Customer remarks
            </div>
            <div className="mt-1 break-words font-medium">
              {order.customerRemarks}
            </div>
          </div>
        ) : null}
        <div className="flex gap-2 break-words text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>{order.deliveryAddress || "No address saved"}</span>
        </div>
        <Button disabled className="min-h-14 w-full text-base">
          Not ready to accept yet
        </Button>
      </CardContent>
    </Card>
  )
}

function MyDeliveryCard({
  delivery,
  driverName,
}: {
  delivery: Delivery
  driverName: string
}) {
  const { pending, message, run } = useDeliveryAction()

  return (
    <DeliveryCardShell delivery={delivery}>
      <div className="grid gap-2">
        {delivery.status === "ACCEPTED" ? (
          <Button
            type="button"
            disabled={pending}
            className="min-h-16 w-full text-base"
            onClick={() =>
              run(
                () => markDeliveryLoaded(delivery.id),
                "Delivery marked loaded. Next: tap Start Delivery when leaving."
              )
            }
          >
            <PackageCheck className="size-5" />
            {pending ? "Saving..." : "Loaded"}
          </Button>
        ) : null}
        {delivery.status === "LOADED" ? (
          <Button
            type="button"
            disabled={pending}
            className="min-h-16 w-full text-base"
            onClick={() =>
              run(
                () => startDelivery(delivery.id),
                "Delivery started. Next: upload Delivered or Failed proof photo after visiting the customer."
              )
            }
          >
            <Navigation className="size-5" />
            {pending ? "Starting..." : "Start Delivery"}
          </Button>
        ) : null}
      </div>
      <ProofBlockedGuide status={delivery.status} />
      {delivery.status === "OUT_FOR_DELIVERY" ? (
        <div className="space-y-3">
          <ProofForm
            delivery={delivery}
            outcome="DELIVERED"
            driverName={driverName}
          />
          <ProofForm
            delivery={delivery}
            outcome="FAILED"
            driverName={driverName}
          />
        </div>
      ) : null}
      <AddressIssueForm delivery={delivery} />
      <Message state={message} />
    </DeliveryCardShell>
  )
}

function CompletedCard({ delivery }: { delivery: Delivery }) {
  return (
    <DeliveryCardShell delivery={delivery}>
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        <CheckCircle2 className="mr-2 inline size-4" />
        Proof uploaded. Completed {delivery.completedAt ? new Date(delivery.completedAt).toLocaleString("en") : "today"}.
      </div>
    </DeliveryCardShell>
  )
}

function FailedCard({ delivery }: { delivery: Delivery }) {
  return (
    <DeliveryCardShell delivery={delivery}>
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <AlertTriangle className="mr-2 inline size-4" />
        {delivery.failedReason ? label(delivery.failedReason) : "Failed proof uploaded."}
        {delivery.remarks ? ` ${delivery.remarks}` : ""}
      </div>
    </DeliveryCardShell>
  )
}

function ExpenseForm({
  vehicles,
  deliveries,
}: {
  vehicles: Vehicle[]
  deliveries: Delivery[]
}) {
  const { pending, message, run } = useDeliveryAction()
  const fileRef = useRef<HTMLInputElement>(null)
  const [expenseType, setExpenseType] = useState<DeliveryExpenseType>("PETROL")
  const [amount, setAmount] = useState("")
  const [remark, setRemark] = useState("")
  const [deliveryId, setDeliveryId] = useState("")
  const [vehicleId, setVehicleId] = useState("")

  function submit() {
    const file = fileRef.current?.files?.[0]
    const parsedAmount = Number(amount)

    if (!file) {
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return
    }

    run(
      () =>
        createDeliveryExpense({
          deliveryId: deliveryId || null,
          vehicleId: vehicleId || null,
          expenseType,
          amount: parsedAmount,
          receiptFile: file,
          remark,
        }),
      "Expense submitted."
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Expense</CardTitle>
        <CardDescription>Choose type, amount, and receipt photo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {deliveryExpenseTypes.map((type) => (
            <Button
              key={type}
              type="button"
              variant={expenseType === type ? "default" : "outline"}
              className="min-h-12 text-base"
              onClick={() => setExpenseType(type)}
            >
              {label(type)}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expenseAmount">Amount</Label>
          <Input
            id="expenseAmount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="min-h-12 text-base"
          />
        </div>
        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expenseDelivery">Delivery</Label>
            <NativeSelect
              id="expenseDelivery"
              name="deliveryId"
              value={deliveryId}
              required={false}
              onChange={setDeliveryId}
            >
              <option value="">No delivery link</option>
              {deliveries.map((delivery) => (
                <option key={delivery.id} value={delivery.id}>
                  {delivery.customerName}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expenseVehicle">Vehicle</Label>
            <NativeSelect
              id="expenseVehicle"
              name="vehicleId"
              value={vehicleId}
              required={false}
              onChange={setVehicleId}
            >
              <option value="">No vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNo}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          required
          className="w-full text-sm"
        />
        <Textarea
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
          placeholder="Optional remark"
          className="min-h-20 text-base"
        />
        <Button
          type="button"
          disabled={pending}
          className="min-h-12 w-full text-base"
          onClick={submit}
        >
          <Receipt className="size-5" />
          Submit Expense
        </Button>
        <Message state={message} />
      </CardContent>
    </Card>
  )
}

function ExpenseList({ expenses }: { expenses: DeliveryExpense[] }) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Submitted driver expenses will appear here."
        className="rounded-md border border-dashed"
      />
    )
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <Card key={expense.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{label(expense.expenseType)}</div>
                <div className="text-sm text-muted-foreground">
                  {expense.createdAt.replace("T", " ").slice(0, 16)}
                </div>
              </div>
              <Badge
                variant={
                  expense.status === "APPROVED"
                    ? "success"
                    : expense.status === "REJECTED"
                      ? "destructive"
                      : "warning"
                }
              >
                {label(expense.status)}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {expense.vehicleNo !== "-" ? expense.vehicleNo : "No vehicle"}
              </span>
              <span className="font-semibold tabular-nums">
                RM{" "}
                {expense.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {expense.rejectedReason ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {expense.rejectedReason}
              </div>
            ) : null}
            {expense.reviewNote ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                {expense.reviewNote}
              </div>
            ) : null}
            {expense.receiptUrl ? (
              <Button asChild variant="outline" className="min-h-11 w-full">
                <a href={expense.receiptUrl} target="_blank" rel="noreferrer">
                  <Receipt className="size-4" />
                  View Receipt
                </a>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TabEmptyState({ tab }: { tab: DriverTab }) {
  const descriptions: Record<DriverTab, string> = {
    Available:
      "No jobs to accept right now. Stay on this screen or ask a manager if a delivery is missing.",
    "My Deliveries":
      "No active delivery. Accept a job from Available, then follow Loaded, Start Delivery, and proof photo.",
    Completed:
      "Delivered jobs appear here after the proof photo upload completes the delivery.",
    Failed:
      "Failed jobs appear here after failed proof upload. Tell the manager when return follow-up is needed.",
    Expenses:
      "Submitted expenses will appear here after you save a receipt photo.",
  }
  const nextActions: Record<DriverTab, string[]> = {
    Available: ["Wait for today job", "Ask manager", "Refresh if needed"],
    "My Deliveries": ["Open Available", "Accept Delivery", "Follow next action"],
    Completed: ["Upload proof photo", "Check next job", "End route when clear"],
    Failed: ["Upload failed proof", "Tell manager", "Return follow-up"],
    Expenses: ["Choose type", "Enter amount", "Attach receipt photo"],
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed p-4">
      <EmptyState
        title={`No ${tab.toLowerCase()}`}
        description={descriptions[tab]}
      />
      <div className="grid gap-2 min-[380px]:grid-cols-3">
        {nextActions[tab].map((action) => (
          <div
            key={action}
            className="min-h-11 rounded-md border bg-background px-3 py-2 text-sm font-medium"
          >
            {action}
          </div>
        ))}
      </div>
    </div>
  )
}

function DriverFastPath({
  availableCount,
  activeCount,
  completedCount,
  failedCount,
}: {
  availableCount: number
  activeCount: number
  completedCount: number
  failedCount: number
}) {
  const steps = [
    "Accept Delivery",
    "Loaded",
    "Start Delivery",
    "Proof photo",
  ]

  return (
    <Card className="border-emerald-200 bg-emerald-50/70">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <Truck className="size-4" />
          Driver fast path
        </div>
        <CardTitle className="text-xl">Do today jobs in order</CardTitle>
        <CardDescription className="text-emerald-950/70">
          One big action at a time. Open maps, call customer, then upload a proof photo.
        </CardDescription>
        <div className="grid gap-2 min-[420px]:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step}
              className="rounded-md bg-background/80 px-3 py-2 text-sm font-medium text-emerald-950"
            >
              {step}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm min-[520px]:grid-cols-4">
          <div className="rounded-md border bg-background px-3 py-2">
            <div className="text-muted-foreground">Available today</div>
            <div className="text-lg font-semibold tabular-nums">
              {availableCount}
            </div>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <div className="text-muted-foreground">In progress</div>
            <div className="text-lg font-semibold tabular-nums">
              {activeCount}
            </div>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <div className="text-muted-foreground">Completed</div>
            <div className="text-lg font-semibold tabular-nums">
              {completedCount}
            </div>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <div className="text-muted-foreground">Failed follow-up</div>
            <div className="text-lg font-semibold tabular-nums">
              {failedCount}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DriverMobileDeliveryPage({
  availableDeliveries,
  upcomingOrderDeliveries,
  driverDeliveries,
  expenses,
  vehicles,
  driverName,
  loadError,
}: {
  availableDeliveries: Delivery[]
  upcomingOrderDeliveries: DeliveryUpcomingOrder[]
  driverDeliveries: Delivery[]
  expenses: DeliveryExpense[]
  vehicles: Vehicle[]
  driverName: string
  loadError?: string | null
}) {
  const myDeliveries = useMemo(
    () =>
      driverDeliveries.filter((delivery) =>
        ["ACCEPTED", "LOADED", "OUT_FOR_DELIVERY"].includes(delivery.status)
      ),
    [driverDeliveries]
  )
  const completed = useMemo(
    () => driverDeliveries.filter((delivery) => delivery.status === "DELIVERED"),
    [driverDeliveries]
  )
  const failed = useMemo(
    () => driverDeliveries.filter((delivery) => delivery.status === "FAILED"),
    [driverDeliveries]
  )
  const expenseDeliveries = useMemo(
    () => [...myDeliveries, ...completed, ...failed],
    [completed, failed, myDeliveries]
  )
  const [activeTab, setActiveTab] = useState<DriverTab>(
    myDeliveries.length > 0 ? "My Deliveries" : "Available"
  )

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-3 py-4 sm:px-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Driver Delivery</h1>
        <p className="text-sm text-muted-foreground">Today delivery work</p>
      </div>

      <DriverFastPath
        availableCount={availableDeliveries.length}
        activeCount={myDeliveries.length}
        completedCount={completed.length}
        failedCount={failed.length}
      />

      {loadError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Delivery data could not load. Ask a manager to check setup.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-5">
        {tabs.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={activeTab === tab ? "default" : "outline"}
            className="min-h-12 text-base"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "Available" ? (
        availableDeliveries.length > 0 || upcomingOrderDeliveries.length > 0 ? (
          <div className="space-y-4">
            {upcomingOrderDeliveries.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Preparing Orders</h2>
                  <Badge variant="secondary">{upcomingOrderDeliveries.length}</Badge>
                </div>
                {upcomingOrderDeliveries.map((order) => (
                  <UpcomingOrderCard key={order.id} order={order} />
                ))}
              </section>
            ) : null}
            {availableDeliveries.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Pending Delivery</h2>
                  <Badge variant="secondary">{availableDeliveries.length}</Badge>
                </div>
                {availableDeliveries.map((delivery) => (
                  <AvailableCard
                    key={delivery.id}
                    delivery={delivery}
                    vehicles={vehicles}
                  />
                ))}
              </section>
            ) : null}
          </div>
        ) : (
          <TabEmptyState tab={activeTab} />
        )
      ) : null}

      {activeTab === "My Deliveries" ? (
        myDeliveries.length > 0 ? (
          <div className="space-y-4">
            {myDeliveries.map((delivery) => (
              <MyDeliveryCard
                key={delivery.id}
                delivery={delivery}
                driverName={driverName}
              />
            ))}
          </div>
        ) : (
          <TabEmptyState tab={activeTab} />
        )
      ) : null}

      {activeTab === "Completed" ? (
        completed.length > 0 ? (
          <div className="space-y-4">
            {completed.map((delivery) => (
              <CompletedCard key={delivery.id} delivery={delivery} />
            ))}
          </div>
        ) : (
          <TabEmptyState tab={activeTab} />
        )
      ) : null}

      {activeTab === "Failed" ? (
        failed.length > 0 ? (
          <div className="space-y-4">
            {failed.map((delivery) => (
              <FailedCard key={delivery.id} delivery={delivery} />
            ))}
          </div>
        ) : (
          <TabEmptyState tab={activeTab} />
        )
      ) : null}

      {activeTab === "Expenses" ? (
        <div className="space-y-4">
          <ExpenseForm vehicles={vehicles} deliveries={expenseDeliveries} />
          <ExpenseList expenses={expenses} />
        </div>
      ) : null}

      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Clock className="mr-2 inline size-4" />
        Proof photo is required for Delivered and Failed. GPS is tried during proof upload.
      </div>
    </main>
  )
}
