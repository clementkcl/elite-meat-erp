"use client"

import {
  AlertTriangle,
  Banknote,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Ellipsis,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  Phone,
  Receipt,
  Route,
  Truck,
} from "lucide-react"
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  acceptDelivery,
  addDeliveryShiftStop,
  arrangeDeliveryRoute,
  changeDeliveryShift,
  createDeliveryExpense,
  endDeliveryShift,
  joinDeliveryShift,
  markDeliveryLoaded,
  recordDeliveryCash,
  reportDeliveryVehicleIssue,
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
  type DeliveryExpenseType,
  type DeliveryFailedReason,
  type DeliveryShiftHome,
} from "@/lib/delivery/types"

const tabs = ["Delivering", "Delivered", "Failed"] as const
const stopTypes = [
  "RETURN_COLLECTION",
  "INTERNAL_TRANSFER_DELIVERY",
  "SUPPLIER_PICKUP",
  "COLLECT_DOCUMENT",
  "OTHER_STOP",
] as const
const quickActions = [
  ["stop", CirclePlus, "Add Stop"],
  ["expense", Receipt, "Add Expense"],
  ["route", Route, "Arrange Route"],
  ["cash", Banknote, "Record Cash"],
  ["more", Ellipsis, "More"],
] as const
type DriverTab = (typeof tabs)[number]
type Panel = "stop" | "expense" | "route" | "cash" | "more" | null
type MessageState = { status: "idle" | "success" | "error"; message: string }

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function NativeSelect({
  id, value, onChange, children, required = true,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  required?: boolean
}) {
  return (
    <select
      id={id}
      value={value}
      required={required}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
    >
      {children}
    </select>
  )
}

function Message({ state }: { state: MessageState }) {
  if (!state.message) return null
  return (
    <div className={state.status === "success"
      ? "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
      : "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"}
    >
      {state.message}
    </div>
  )
}

function useDeliveryAction() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<MessageState>({ status: "idle", message: "" })
  function run(action: () => Promise<unknown>, successMessage: string) {
    startTransition(async () => {
      try {
        await action()
        setMessage({ status: "success", message: successMessage })
        router.refresh()
      } catch (error) {
        setMessage({ status: "error", message: error instanceof Error ? error.message : "Action failed." })
      }
    })
  }
  return { pending, message, run, fail: (message: string) => setMessage({ status: "error", message }) }
}

async function getPhoneGps() {
  return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: Number(coords.latitude.toFixed(7)),
        longitude: Number(coords.longitude.toFixed(7)),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

async function watermarkProof(file: File, lines: string[]) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  const scale = Math.min(1, 1600 / bitmap.width)
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext("2d")
  if (!context) return file
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const fontSize = Math.max(22, Math.round(canvas.width * 0.025))
  const padding = Math.max(18, Math.round(canvas.width * 0.018))
  const lineHeight = Math.round(fontSize * 1.35)
  const boxHeight = lineHeight * lines.length + padding * 2
  context.fillStyle = "rgba(0,0,0,.68)"
  context.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight)
  context.fillStyle = "#fff"
  context.font = `${fontSize}px sans-serif`
  lines.forEach((line, index) => context.fillText(line, padding, canvas.height - boxHeight + padding + lineHeight * (index + 1)))
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88))
  return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-proof.jpg`, { type: "image/jpeg" }) : file
}

function mapsUrl(delivery: Delivery) {
  const lat = delivery.customerLatitude ?? delivery.completedLatitude
  const lng = delivery.customerLongitude ?? delivery.completedLongitude
  return lat !== null && lng !== null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.deliveryAddress || delivery.customerName)}`
}

function ShiftSelection({ home }: { home: DeliveryShiftHome }) {
  const { pending, message, run } = useDeliveryAction()
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-3 py-5 sm:px-4">
      <div>
        <h1 className="text-2xl font-semibold">Select Today&apos;s Lorry</h1>
        <p className="text-sm text-muted-foreground">Tap the lorry you are using for today&apos;s work.</p>
      </div>
      {home.vehicles.length ? home.vehicles.map((vehicle) => (
        <Card key={vehicle.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">{vehicle.vehicleNo}</div>
                <div className="text-sm text-muted-foreground">{vehicle.vehicleType}</div>
              </div>
              <Badge variant={vehicle.shiftStatus === "ACTIVE" ? "warning" : "outline"}>
                {vehicle.shiftStatus === "ACTIVE" ? "Shift active" : "Ready"}
              </Badge>
            </div>
            <div className="text-sm">
              {vehicle.currentCrew?.length ? `Current crew: ${vehicle.currentCrew.join(", ")}` : "No crew joined yet"}
            </div>
            <Button
              className="min-h-14 w-full text-lg"
              disabled={pending}
              onClick={() => run(() => joinDeliveryShift(vehicle.id), `Joined ${vehicle.vehicleNo}.`)}
            >
              <Truck className="size-5" />
              Join This Lorry
            </Button>
          </CardContent>
        </Card>
      )) : (
        <EmptyState title="No lorry available" description="Ask a manager to assign an active lorry to your delivery team." />
      )}
      <Message state={message} />
    </main>
  )
}

function ProofForm({
  delivery, outcome, driverName,
}: {
  delivery: Delivery
  outcome: "DELIVERED" | "FAILED"
  driverName: string
}) {
  const { pending, message, run, fail } = useDeliveryAction()
  const inputRef = useRef<HTMLInputElement>(null)
  const [reason, setReason] = useState<DeliveryFailedReason>("CUSTOMER_NOT_AVAILABLE")
  const [remark, setRemark] = useState("")
  function openCamera() {
    if (outcome === "FAILED" && reason === "OTHER" && !remark.trim()) return fail("Enter a short note for Other.")
    inputRef.current?.click()
  }
  async function submit(file: File) {
    const gps = await getPhoneGps()
    const proof = await watermarkProof(file, [
      delivery.deliveryNo, delivery.customerName, driverName,
      new Date().toLocaleString("en"),
      gps ? `GPS ${gps.latitude}, ${gps.longitude}` : "GPS unavailable",
    ])
    const location = gps ? gps : { unavailable: true }
    if (outcome === "FAILED") {
      await uploadFailedProofAndComplete(delivery.id, proof, location, reason, remark.trim() || null)
    } else {
      await uploadDeliveredProofAndComplete(delivery.id, proof, location)
    }
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
          if (file) run(() => submit(file), outcome === "FAILED" ? "Delivery reported failed." : "Delivery completed.")
        }}
      />
      {outcome === "FAILED" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {deliveryFailedReasons.map((item) => (
              <Button key={item} variant={reason === item ? "default" : "outline"} className="min-h-12 whitespace-normal" onClick={() => setReason(item)}>
                {label(item)}
              </Button>
            ))}
          </div>
          {reason === "OTHER" ? <Textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Remark required for Other" /> : null}
        </>
      ) : null}
      <Button className="min-h-14 w-full text-lg" disabled={pending} onClick={openCamera}>
        <Camera className="size-5" />
        {pending ? "Uploading..." : outcome === "FAILED" ? "Upload Failed Proof" : "Complete Delivery"}
      </Button>
      <Message state={message} />
    </div>
  )
}

function AddressActions({ delivery }: { delivery: Delivery }) {
  const { pending, message, run } = useDeliveryAction()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  return (
    <div className="space-y-2">
      <Button variant="outline" className="min-h-11 w-full" onClick={() => setOpen(!open)}>
        <AlertTriangle /> Address Issue
      </Button>
      {open ? (
        <div className="space-y-2 rounded-md border p-3">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional short note" />
          <Button className="min-h-12 w-full" disabled={pending} onClick={() => run(async () => {
            const gps = await getPhoneGps()
            await reportAddressIssue(delivery.id, {
              suggestedAddress: delivery.deliveryAddress,
              reason: "Address issue",
              note,
              latitude: gps?.latitude ?? null,
              longitude: gps?.longitude ?? null,
            })
          }, "Address issue sent for review.")}>Send Address Issue</Button>
          <Button variant="outline" className="min-h-12 w-full whitespace-normal" disabled={pending} onClick={() => run(async () => {
            const gps = await getPhoneGps()
            if (!gps) throw new Error("Phone GPS unavailable.")
            await saveSuggestedCustomerGps(delivery.id, gps)
          }, "Current location sent for approval.")}>
            <MapPin /> Save Current Location as Suggested Customer GPS
          </Button>
          <Message state={message} />
        </div>
      ) : null}
    </div>
  )
}

function DeliveryCard({
  delivery, driverName, highlighted = false,
}: {
  delivery: Delivery
  driverName: string
  highlighted?: boolean
}) {
  const { pending, message, run } = useDeliveryAction()
  const [failed, setFailed] = useState(false)
  const primary = delivery.status === "AVAILABLE"
    ? () => run(() => acceptDelivery(delivery.id), "Delivery accepted.")
    : delivery.status === "ACCEPTED"
      ? () => run(() => markDeliveryLoaded(delivery.id), "Goods loaded.")
      : delivery.status === "LOADED"
        ? () => run(() => startDelivery(delivery.id), "Delivery started.")
        : null
  const primaryLabel = delivery.status === "AVAILABLE" ? "Accept Delivery"
    : delivery.status === "ACCEPTED" ? "Goods Loaded"
      : delivery.status === "LOADED" ? "Start Delivery" : "Complete Delivery"

  return (
    <Card className={highlighted ? "border-primary shadow-sm" : ""}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            {highlighted ? <div className="mb-1 text-xs font-semibold uppercase text-primary">Next stop</div> : null}
            <CardTitle className="text-xl">{delivery.customerName}</CardTitle>
            <CardDescription>{delivery.deliveryNo}</CardDescription>
          </div>
          <Badge variant={delivery.status === "OUT_FOR_DELIVERY" ? "warning" : "outline"}>{label(delivery.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {delivery.deliveryNote ? <div className="font-medium">{delivery.deliveryNote}</div> : null}
        <div className="flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{delivery.deliveryAddress || "No address saved"}</div>
        <div className="text-sm text-muted-foreground">{delivery.totalWeightKg.toLocaleString()} kg · {delivery.itemCount} items</div>
        {delivery.status === "OUT_FOR_DELIVERY" ? (
          <ProofForm delivery={delivery} outcome="DELIVERED" driverName={driverName} />
        ) : (
          <Button className="min-h-14 w-full text-lg" disabled={pending} onClick={primary ?? undefined}>
            {delivery.status === "ACCEPTED" ? <PackageCheck /> : delivery.status === "LOADED" ? <Navigation /> : <Truck />}
            {primaryLabel}
          </Button>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Button asChild variant="outline"><a href={mapsUrl(delivery)} target="_blank" rel="noreferrer"><Navigation /> Maps</a></Button>
          <Button asChild variant="outline"><a href={delivery.customerPhone ? `tel:${delivery.customerPhone}` : "#"}><Phone /> Call</a></Button>
          <Button asChild variant="outline"><a href={delivery.customerPhone ? `https://wa.me/${delivery.customerPhone.replace(/\D/g, "")}` : "#"} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button>
        </div>
        {delivery.status !== "AVAILABLE" ? <AddressActions delivery={delivery} /> : null}
        {delivery.status === "OUT_FOR_DELIVERY" ? (
          <Button variant="outline" className="min-h-11 w-full" onClick={() => setFailed(!failed)}><AlertTriangle /> Report Failed</Button>
        ) : null}
        {delivery.status === "OUT_FOR_DELIVERY" && failed ? <ProofForm delivery={delivery} outcome="FAILED" driverName={driverName} /> : null}
        <Message state={message} />
      </CardContent>
    </Card>
  )
}

function AddStopPanel({ shiftId }: { shiftId: string }) {
  const { pending, message, run } = useDeliveryAction()
  const [type, setType] = useState<(typeof stopTypes)[number]>("RETURN_COLLECTION")
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  return (
    <Card><CardContent className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        {stopTypes.map((item) => <Button key={item} variant={type === item ? "default" : "outline"} className="min-h-12 whitespace-normal" onClick={() => setType(item)}>{label(item)}</Button>)}
      </div>
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Location name" />
      <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Address" />
      <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone (optional)" inputMode="tel" />
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
      <Button className="min-h-12 w-full" disabled={pending || name.trim().length < 2} onClick={() => run(() => addDeliveryShiftStop({
        shiftId, deliveryType: type, locationName: name, address, phone, note,
      }), "Stop added.")}>Add Stop</Button>
      <Message state={message} />
    </CardContent></Card>
  )
}

function ExpensePanel({ home }: { home: DeliveryShiftHome }) {
  const { pending, message, run } = useDeliveryAction()
  const fileRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<DeliveryExpenseType>("PETROL")
  const [amount, setAmount] = useState("")
  const [deliveryId, setDeliveryId] = useState("")
  const [remark, setRemark] = useState("")
  const shift = home.shift!
  return (
    <Card><CardContent className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        {deliveryExpenseTypes.map((item) => <Button key={item} variant={type === item ? "default" : "outline"} className="min-h-12" onClick={() => setType(item)}>{label(item)}</Button>)}
      </div>
      <div className="rounded-md border bg-muted/30 p-3 text-sm">Lorry: <strong>{shift.vehicleNo}</strong></div>
      <Input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" />
      <NativeSelect id="expense-delivery" value={deliveryId} onChange={setDeliveryId} required={false}>
        <option value="">No delivery link</option>
        {home.deliveries.map((delivery) => <option key={delivery.id} value={delivery.id}>{delivery.customerName}</option>)}
      </NativeSelect>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="w-full text-sm" />
      <Textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Optional remark" />
      <Button className="min-h-12 w-full" disabled={pending} onClick={() => {
        const receiptFile = fileRef.current?.files?.[0]
        if (!receiptFile) return
        run(() => createDeliveryExpense({
          shiftId: shift.id, deliveryId: deliveryId || null, vehicleId: shift.vehicleId,
          expenseType: type, amount: Number(amount), receiptFile, remark,
        }), "Expense submitted.")
      }}><Receipt /> Submit Expense</Button>
      <Message state={message} />
    </CardContent></Card>
  )
}

function RoutePanel({ shiftId, deliveries }: { shiftId: string; deliveries: Delivery[] }) {
  const { pending, message, run } = useDeliveryAction()
  const [ordered, setOrdered] = useState(
    deliveries.filter((delivery) =>
      ["ACCEPTED", "LOADED", "OUT_FOR_DELIVERY"].includes(delivery.status)
    )
  )
  const [dragged, setDragged] = useState<number | null>(null)
  function move(index: number, direction: -1 | 1) {
    const next = index + direction
    if (next < 0 || next >= ordered.length) return
    setOrdered((items) => {
      const copy = [...items]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
  }
  return (
    <Card><CardContent className="space-y-3 p-4">
      {ordered.map((delivery, index) => (
        <div
          key={delivery.id}
          draggable
          onDragStart={() => setDragged(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (dragged === null || dragged === index) return
            setOrdered((items) => {
              const copy = [...items]
              const [item] = copy.splice(dragged, 1)
              copy.splice(index, 0, item)
              return copy
            })
            setDragged(null)
          }}
          className="flex items-center gap-2 rounded-md border p-2"
        >
          <div className="w-7 text-center font-semibold">{index + 1}</div>
          <div className="min-w-0 flex-1 truncate">{delivery.customerName}</div>
          <Button size="icon" variant="outline" aria-label="Move stop up" onClick={() => move(index, -1)}><ChevronUp /></Button>
          <Button size="icon" variant="outline" aria-label="Move stop down" onClick={() => move(index, 1)}><ChevronDown /></Button>
        </div>
      ))}
      {ordered.length ? <Button className="min-h-12 w-full" disabled={pending} onClick={() => run(() => arrangeDeliveryRoute(shiftId, ordered.map(({ id }) => id)), "Route order saved.")}><Route /> Save Order</Button> : <div className="text-sm text-muted-foreground">Accept deliveries before arranging the route.</div>}
      <Message state={message} />
    </CardContent></Card>
  )
}

function CashPanel({ shiftId, deliveries }: { shiftId: string; deliveries: Delivery[] }) {
  const { pending, message, run } = useDeliveryAction()
  const [deliveryId, setDeliveryId] = useState("")
  const [amount, setAmount] = useState("")
  const [remark, setRemark] = useState("")
  return (
    <Card><CardContent className="space-y-3 p-4">
      <NativeSelect id="cash-delivery" value={deliveryId} onChange={setDeliveryId} required={false}>
        <option value="">No delivery link</option>
        {deliveries.map((delivery) => <option key={delivery.id} value={delivery.id}>{delivery.customerName}</option>)}
      </NativeSelect>
      <Input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Cash received" />
      <Textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Optional remark" />
      <Button className="min-h-12 w-full" disabled={pending} onClick={() => run(() => recordDeliveryCash(shiftId, deliveryId || null, Number(amount), remark), "Cash recorded.")}><Banknote /> Record Cash</Button>
      <Message state={message} />
    </CardContent></Card>
  )
}

export function DriverMobileDeliveryPage({
  home, driverName, loadError,
}: {
  home: DeliveryShiftHome
  driverName: string
  loadError?: string | null
}) {
  const [tab, setTab] = useState<DriverTab>("Delivering")
  const [panel, setPanel] = useState<Panel>(null)
  const [vehicleIssue, setVehicleIssue] = useState("")
  const { pending, message, run } = useDeliveryAction()
  const router = useRouter()

  useEffect(() => {
    const refresh = window.setInterval(() => router.refresh(), 10_000)
    return () => window.clearInterval(refresh)
  }, [router])

  if (!home.shift) return <ShiftSelection home={home} />

  const active = home.deliveries.filter((delivery) => ["AVAILABLE", "ACCEPTED", "LOADED", "OUT_FOR_DELIVERY"].includes(delivery.status))
  const delivered = home.deliveries.filter((delivery) => delivery.status === "DELIVERED")
  const failed = home.deliveries.filter((delivery) => delivery.status === "FAILED")
  const accepted = active.filter((delivery) => delivery.status !== "AVAILABLE")
  const next = accepted.find((delivery) => delivery.status === "OUT_FOR_DELIVERY") ?? accepted[0] ?? active[0]
  const remaining = active.filter((delivery) => delivery.id !== next?.id)
  const driver = home.shift.members.find((member) => member.crewRole === "DRIVER")?.fullName ?? "Not joined"
  const assistant = home.shift.members.filter((member) => member.crewRole === "ASSISTANT").map((member) => member.fullName).join(", ") || "Not joined"
  const expenses = home.expenses.reduce((total, expense) => total + expense.amount, 0)
  const summaries = [
    ["In Progress", accepted.length], ["Delivered", delivered.length], ["Failed", failed.length],
    ["Remaining", active.length], ["Cash Received", `RM ${home.cashReceived.toFixed(2)}`], ["Expenses", `RM ${expenses.toFixed(2)}`],
  ]

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div><h1 className="text-2xl font-semibold">{home.shift.vehicleNo}</h1><p className="text-sm text-muted-foreground">Today&apos;s delivery shift</p></div>
          <Button size="icon" variant="outline" aria-label="More shift options" onClick={() => setPanel(panel === "more" ? null : "more")}><Ellipsis /></Button>
        </div>
        <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
          <span>Driver: {driver}</span><span>Assistant: {assistant}</span>
          <span>Started: {new Date(home.shift.startedAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </header>
      {loadError ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Delivery data could not load. Ask a manager to check setup.</div> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {summaries.map(([name, value]) => <div key={name} className="rounded-md border bg-card p-3"><div className="text-xs text-muted-foreground">{name}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>)}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {quickActions.map(([key, Icon, text]) => (
          <Button key={String(key)} variant={panel === key ? "default" : "outline"} className="min-h-12 whitespace-normal" onClick={() => setPanel(panel === key ? null : key as Panel)}>
            <Icon className="size-4" />{text}
          </Button>
        ))}
      </div>
      {panel === "stop" ? <AddStopPanel shiftId={home.shift.id} /> : null}
      {panel === "expense" ? <ExpensePanel home={home} /> : null}
      {panel === "route" ? <RoutePanel shiftId={home.shift.id} deliveries={home.deliveries} /> : null}
      {panel === "cash" ? <CashPanel shiftId={home.shift.id} deliveries={home.deliveries} /> : null}
      {panel === "more" ? (
        <Card><CardContent className="grid gap-2 p-4">
          <Button asChild variant="outline"><Link href="/delivery/vehicles">View Lorry Details</Link></Button>
          <Textarea value={vehicleIssue} onChange={(event) => setVehicleIssue(event.target.value)} placeholder="Vehicle issue" />
          <Button variant="outline" disabled={pending} onClick={() => run(() => reportDeliveryVehicleIssue(home.shift!.id, vehicleIssue), "Vehicle issue reported.")}><AlertTriangle /> Report Vehicle Issue</Button>
          {next ? <Button asChild variant="outline"><Link href={`/delivery/${next.id}`}><MapPin /> Address Issue</Link></Button> : null}
          <NativeSelect id="change-lorry" value={home.shift.vehicleId} onChange={(vehicleId) => {
            if (vehicleId !== home.shift?.vehicleId && window.confirm("Change today's lorry?")) run(() => changeDeliveryShift(vehicleId), "Lorry changed.")
          }}>
            {home.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleNo}</option>)}
          </NativeSelect>
          <Button variant="destructive" disabled={pending} onClick={() => {
            if (window.confirm("End this shift? Check unfinished tasks, proof, cash, and expenses first.")) run(() => endDeliveryShift(home.shift!.id), "Shift ended.")
          }}>End Shift</Button>
          <Message state={message} />
        </CardContent></Card>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map((item) => <Button key={item} variant={tab === item ? "default" : "outline"} className="min-h-12" onClick={() => setTab(item)}>{item}</Button>)}
      </div>
      {tab === "Delivering" ? (
        <div className="space-y-3">
          {next ? <DeliveryCard delivery={next} driverName={driverName} highlighted /> : <EmptyState title="No delivery work" description="Today’s available and accepted stops will appear here." />}
          {remaining.map((delivery, index) => (
            <div key={delivery.id} className="grid grid-cols-[2rem_1fr] gap-2">
              <div className="pt-5 text-center font-semibold text-muted-foreground">{index + 2}</div>
              <DeliveryCard delivery={delivery} driverName={driverName} />
            </div>
          ))}
        </div>
      ) : null}
      {tab === "Delivered" ? (
        <div className="space-y-2">
          {delivered.length ? delivered.map((delivery) => (
            <Card key={delivery.id}><CardContent className="space-y-2 p-4">
              <div className="flex justify-between gap-3"><strong>{delivery.customerName}</strong><Badge variant="success">Delivered</Badge></div>
              <div className="text-sm text-muted-foreground">{delivery.completedAt ? new Date(delivery.completedAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }) : "Today"} · {delivery.totalWeightKg} kg</div>
              <div className="text-sm">Cash received: RM {delivery.cashReceived.toFixed(2)} · Proof uploaded</div>
              <Button asChild variant="outline" className="w-full"><Link href={`/delivery/${delivery.id}`}><CheckCircle2 /> View Summary</Link></Button>
            </CardContent></Card>
          )) : <EmptyState title="No delivered stops" description="Completed stops will appear here." />}
        </div>
      ) : null}
      {tab === "Failed" ? (
        <div className="space-y-2">
          {failed.length ? failed.map((delivery) => (
            <Card key={delivery.id}><CardContent className="space-y-2 p-4">
              <div className="flex justify-between gap-3"><strong>{delivery.customerName}</strong><Badge variant="destructive">Failed</Badge></div>
              <div className="text-sm">{delivery.failedReason ? label(delivery.failedReason) : "Reason recorded"} · Proof uploaded</div>
              <div className="text-sm text-muted-foreground">Manager review pending</div>
              <Button asChild variant="outline" className="w-full"><Link href={`/delivery/${delivery.id}`}><AlertTriangle /> View Summary</Link></Button>
            </CardContent></Card>
          )) : <EmptyState title="No failed stops" description="Failed stops will appear here." />}
        </div>
      ) : null}
    </main>
  )
}
