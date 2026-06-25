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
import Link from "next/link"
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

function readinessVariant(readiness: Delivery["goodsReadiness"]) {
  if (readiness === "Goods Ready") {
    return "success"
  }

  if (readiness === "Partially Ready") {
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
      <Button asChild variant="outline" size="sm" className="justify-center">
        <a href={mapsUrl(delivery)} target="_blank" rel="noreferrer">
          <Navigation className="size-4" />
          Google Maps
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="justify-center">
        <a href={delivery.customerPhone ? `tel:${delivery.customerPhone}` : "#"}>
          <Phone className="size-4" />
          Call
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="justify-center">
        <a href={whatsappUrl(delivery.customerPhone)} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" />
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
          <div className="flex flex-col items-end gap-2">
            <Badge variant={statusVariant(delivery.status)}>
              {label(delivery.status)}
            </Badge>
            <Badge variant={readinessVariant(delivery.goodsReadiness)}>
              {delivery.goodsReadiness}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          {delivery.deliveryNote ? (
            <div className="break-words font-medium">{delivery.deliveryNote}</div>
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

      <div className="space-y-2">
        <Button
          type="button"
          disabled={pending}
          className="min-h-14 w-full text-lg"
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
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
        size="sm"
        className="w-full"
        onClick={() => setOpen((value) => !value)}
      >
        <AlertTriangle className="size-4" />
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

    run(async () => {
      const gps = await getPhoneGps()
      const watermarked = await watermarkProof(file, [
        delivery.deliveryNo,
        delivery.customerName,
        driverName,
        new Date().toLocaleString("en"),
        gps
          ? `GPS ${gps.latitude}, ${gps.longitude}`
          : "GPS unavailable",
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
        className="min-h-12 w-full text-base"
        onClick={openCamera}
      >
        <Camera className="size-5" />
        {pending
          ? "Uploading..."
          : outcome === "FAILED"
            ? "Upload Failed Proof"
            : "Complete Delivery"}
      </Button>
      <Message state={message} />
    </div>
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
  const [showFailed, setShowFailed] = useState(false)

  return (
    <DeliveryCardShell delivery={delivery}>
      <div className="space-y-2">
        {delivery.status === "ACCEPTED" ? (
          <Button
            type="button"
            disabled={pending}
            className="min-h-14 w-full text-lg"
            onClick={() =>
              run(() => markDeliveryLoaded(delivery.id), "Delivery marked loaded.")
            }
          >
            <PackageCheck className="size-5" />
            Mark Loaded
          </Button>
        ) : null}
        {delivery.status === "LOADED" ? (
          <Button
            type="button"
            disabled={pending}
            className="min-h-14 w-full text-lg"
            onClick={() =>
              run(() => startDelivery(delivery.id), "Delivery started.")
            }
          >
            <Navigation className="size-5" />
            Start Delivery
          </Button>
        ) : null}
      </div>
      {delivery.status === "OUT_FOR_DELIVERY" ? (
        <div className="space-y-3">
          <ProofForm
            delivery={delivery}
            outcome="DELIVERED"
            driverName={driverName}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowFailed((value) => !value)}
          >
            <AlertTriangle className="size-4" />
            Report Failed
          </Button>
          {showFailed ? (
            <ProofForm
              delivery={delivery}
              outcome="FAILED"
              driverName={driverName}
            />
          ) : null}
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
      <Button asChild className="min-h-14 w-full text-lg">
        <Link href={`/delivery/${delivery.id}`}>
          <CheckCircle2 className="size-5" />
          View Summary
        </Link>
      </Button>
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
      <Button asChild className="min-h-14 w-full text-lg">
        <Link href={`/delivery/${delivery.id}`}>
          <AlertTriangle className="size-5" />
          View Summary
        </Link>
      </Button>
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
  driverId,
}: {
  vehicles: Vehicle[]
  deliveries: Delivery[]
  driverId: string
}) {
  const { pending, message, run } = useDeliveryAction()
  const fileRef = useRef<HTMLInputElement>(null)
  const defaultVehicle = vehicles.find((vehicle) => vehicle.defaultDriverId === driverId)
  const [expenseType, setExpenseType] = useState<DeliveryExpenseType>("PETROL")
  const [amount, setAmount] = useState("")
  const [remark, setRemark] = useState("")
  const [deliveryId, setDeliveryId] = useState("")
  const [vehicleId, setVehicleId] = useState(defaultVehicle?.id ?? "")

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
            {!defaultVehicle ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                No default vehicle assigned. Ask manager to assign vehicle.
              </div>
            ) : null}
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
    Available: "No available deliveries for today.",
    "My Deliveries": "Accepted deliveries will appear here.",
    Completed: "Delivered records will appear here after proof upload.",
    Failed: "Failed records will appear here after failed proof upload.",
    Expenses: "Submitted expenses will appear here.",
  }

  return (
    <EmptyState
      title={`No ${tab.toLowerCase()}`}
      description={descriptions[tab]}
      className="rounded-md border border-dashed"
    />
  )
}

export function DriverMobileDeliveryPage({
  availableDeliveries,
  driverDeliveries,
  expenses,
  vehicles,
  driverName,
  driverId,
  loadError,
}: {
  availableDeliveries: Delivery[]
  driverDeliveries: Delivery[]
  expenses: DeliveryExpense[]
  vehicles: Vehicle[]
  driverName: string
  driverId: string
  loadError?: string | null
}) {
  const [activeTab, setActiveTab] = useState<DriverTab>("Available")
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

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-3 py-4 sm:px-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Driver Delivery</h1>
        <p className="text-sm text-muted-foreground">Today delivery work</p>
      </div>

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
        availableDeliveries.length > 0 ? (
          <div className="space-y-4">
            {availableDeliveries.map((delivery) => (
              <AvailableCard
                key={delivery.id}
                delivery={delivery}
                vehicles={vehicles}
              />
            ))}
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
          <ExpenseForm
            vehicles={vehicles}
            deliveries={expenseDeliveries}
            driverId={driverId}
          />
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
