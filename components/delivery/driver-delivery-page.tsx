"use client"

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  Phone,
  Receipt,
  Truck,
} from "lucide-react"
import { useActionState, useMemo, useState, useTransition, type ReactNode } from "react"

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
import type { CurrentProfile } from "@/lib/auth/types"
import {
  acceptDeliveryJobAction,
  createDeliveryExpenseAction,
  markDeliveryLoadedAction,
  reportDeliveryGoodsIssueAction,
  saveDeliveryAddressIssueAction,
  startDeliveryJobAction,
  uploadDeliveryJobProofAction,
} from "@/lib/delivery/actions"
import {
  initialDeliveryActionState,
  type DeliveryActionState,
} from "@/lib/delivery/action-state"
import {
  deliveryExpenseTypes,
  deliveryFailedReasons,
  deliveryGoodsIssueReasons,
  type DeliveryExpense,
  type DeliveryJob,
  type Vehicle,
} from "@/lib/delivery/types"

type StatefulAction = (
  state: DeliveryActionState,
  formData: FormData
) => Promise<DeliveryActionState>

const tabs = [
  "Available",
  "My Deliveries",
  "Completed",
  "Failed",
  "Expenses",
] as const

type DriverTab = (typeof tabs)[number]

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

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
  defaultValue,
  value,
  onChange,
}: {
  id: string
  name: string
  children: ReactNode
  required?: boolean
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <select
      id={id}
      name={name}
      required={required}
      defaultValue={defaultValue}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {children}
    </select>
  )
}

function SmallActionForm({
  action,
  jobId,
  children,
  className,
}: {
  action: StatefulAction
  jobId: string
  children: ReactNode
  className?: string
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialDeliveryActionState
  )

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="jobId" value={jobId} />
      <Button type="submit" disabled={pending} className="min-h-12 w-full text-base">
        {children}
      </Button>
      <ActionMessage state={state} />
    </form>
  )
}

function mapsUrl(job: DeliveryJob) {
  if (job.proofLatitude !== null && job.proofLongitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${job.proofLatitude},${job.proofLongitude}`
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    job.deliveryAddress || job.customerName
  )}`
}

function whatsappUrl(phone: string) {
  const cleaned = phone.replace(/\D/g, "")

  return cleaned ? `https://wa.me/${cleaned}` : "#"
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
    ctx.fillText(line, padding, canvas.height - boxHeight + padding + lineHeight * (index + 1))
  })

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.88)
  )

  return blob
    ? new File([blob], file.name.replace(/\.[^.]+$/, "") + "-watermarked.jpg", {
        type: "image/jpeg",
      })
    : file
}

function ProofForm({
  job,
  profile,
  outcome,
}: {
  job: DeliveryJob
  profile: CurrentProfile
  outcome: "DELIVERED" | "FAILED"
}) {
  const [state, setState] = useState(initialDeliveryActionState)
  const [isPending, startTransition] = useTransition()
  const [failedReason, setFailedReason] = useState("CUSTOMER_NOT_AVAILABLE")
  const [remarks, setRemarks] = useState("")

  async function submit(formData: FormData) {
    const file = formData.get("proofFile")

    if (!(file instanceof File) || file.size === 0) {
      setState({ status: "error", message: "Take a proof photo first." })
      return
    }

    const gps = await new Promise<{ lat: string; lng: string } | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude.toFixed(7),
            lng: position.coords.longitude.toFixed(7),
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
    const watermarked = await watermarkProof(file, [
      job.jobNo,
      job.customerName,
      profile.fullName,
      new Date().toLocaleString("en"),
      gps ? `GPS ${gps.lat}, ${gps.lng}` : "GPS unavailable",
    ])
    const payload = new FormData()

    payload.set("jobId", job.id)
    payload.set("deliveryOutcome", outcome)
    payload.set("proofFile", watermarked)
    payload.set("gpsAvailable", gps ? "true" : "false")
    payload.set("latitude", gps?.lat ?? "")
    payload.set("longitude", gps?.lng ?? "")
    payload.set("remarks", remarks)

    if (outcome === "FAILED") {
      payload.set("failedReason", failedReason)
    }

    startTransition(async () => {
      setState(await uploadDeliveryJobProofAction(initialDeliveryActionState, payload))
    })
  }

  return (
    <form action={submit} className="space-y-3 rounded-md border p-3">
      <input
        name="proofFile"
        type="file"
        accept="image/*"
        capture="environment"
        required
        className="w-full text-sm"
      />
      {outcome === "FAILED" ? (
        <div className="space-y-2">
          <Label htmlFor={`${job.id}-failedReason`}>Failed reason</Label>
          <NativeSelect
            id={`${job.id}-failedReason`}
            name="failedReason"
            value={failedReason}
            onChange={setFailedReason}
          >
            {deliveryFailedReasons.map((reason) => (
              <option key={reason} value={reason}>
                {label(reason)}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <Textarea
        name="remarks"
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        placeholder={outcome === "FAILED" ? "Remark for Other only" : "Optional note"}
      />
      <Button type="submit" disabled={isPending} className="min-h-12 w-full text-base">
        <Camera className="size-5" />
        {isPending
          ? "Uploading..."
          : outcome === "FAILED"
            ? "Upload Failed Proof"
            : "Upload Delivered Proof"}
      </Button>
      <ActionMessage state={state} />
    </form>
  )
}

function GoodsIssueForm({ job }: { job: DeliveryJob }) {
  const [state, formAction, pending] = useActionState(
    reportDeliveryGoodsIssueAction,
    initialDeliveryActionState
  )

  return (
    <form action={formAction} className="space-y-3 rounded-md border p-3">
      <input type="hidden" name="jobId" value={job.id} />
      <Label htmlFor={`${job.id}-goods`}>Goods issue</Label>
      <NativeSelect id={`${job.id}-goods`} name="goodsIssueReason">
        {deliveryGoodsIssueReasons.map((reason) => (
          <option key={reason} value={reason}>
            {label(reason)}
          </option>
        ))}
      </NativeSelect>
      <input
        name="issuePhoto"
        type="file"
        accept="image/*"
        capture="environment"
        className="w-full text-sm"
      />
      <Textarea name="remarks" placeholder="Remark required only for Other" />
      <Button type="submit" disabled={pending} variant="outline" className="min-h-12 w-full text-base">
        <AlertTriangle className="size-5" />
        Save Goods Issue
      </Button>
      <ActionMessage state={state} />
    </form>
  )
}

function AddressIssueForm({ job }: { job: DeliveryJob }) {
  const [state, formAction, pending] = useActionState(
    saveDeliveryAddressIssueAction,
    initialDeliveryActionState
  )

  return (
    <form action={formAction} className="space-y-3 rounded-md border p-3">
      <input type="hidden" name="jobId" value={job.id} />
      <Label htmlFor={`${job.id}-address`}>Better address</Label>
      <Textarea
        id={`${job.id}-address`}
        name="suggestedAddress"
        defaultValue={job.deliveryAddress}
        required
      />
      <Input name="reason" placeholder="Wrong gate, customer moved, or hard to find" required />
      <Button type="submit" disabled={pending} variant="outline" className="min-h-12 w-full text-base">
        <MapPin className="size-5" />
        Address Issue
      </Button>
      <ActionMessage state={state} />
    </form>
  )
}

function JobCard({
  job,
  vehicles,
  profile,
}: {
  job: DeliveryJob
  vehicles: Vehicle[]
  profile: CurrentProfile
}) {
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptDeliveryJobAction,
    initialDeliveryActionState
  )
  const showProof = job.status === "OUT_FOR_DELIVERY"

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{job.customerName}</CardTitle>
            <CardDescription>{job.jobNo} / {label(job.status)}</CardDescription>
          </div>
          <div className="rounded-md border px-2 py-1 text-xs font-medium">
            {label(job.jobType)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <div className="font-medium">{job.deliveryAddress || "No address saved"}</div>
          {job.deliveryNote ? <div className="text-muted-foreground">{job.deliveryNote}</div> : null}
          <div className="text-muted-foreground">
            {job.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg / {job.itemCount} item / {job.orderCount} order
          </div>
          <div className="text-muted-foreground">
            Vehicle {job.vehicleNo} / Driver {job.driverName}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="min-h-12 text-base">
            <a href={mapsUrl(job)} target="_blank" rel="noreferrer">
              <Navigation className="size-5" />
              Google Maps
            </a>
          </Button>
          <Button asChild variant="outline" className="min-h-12 text-base">
            <a href={job.customerPhone ? `tel:${job.customerPhone}` : "#"}>
              <Phone className="size-5" />
              Call
            </a>
          </Button>
          <Button asChild variant="outline" className="min-h-12 text-base">
            <a href={whatsappUrl(job.customerPhone)} target="_blank" rel="noreferrer">
              <MessageCircle className="size-5" />
              WhatsApp
            </a>
          </Button>
          <AddressIssueForm job={job} />
        </div>

        {job.status === "AVAILABLE" ? (
          <form action={acceptAction} className="space-y-3 rounded-md border p-3">
            <input type="hidden" name="jobId" value={job.id} />
            <Label htmlFor={`${job.id}-vehicle`}>Vehicle</Label>
            <NativeSelect id={`${job.id}-vehicle`} name="vehicleId" required={false} defaultValue={job.vehicleId ?? ""}>
              <option value="">Default vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNo} / {vehicle.vehicleType}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" disabled={acceptPending} className="min-h-12 w-full text-base">
              <Truck className="size-5" />
              Accept Delivery
            </Button>
            <ActionMessage state={acceptState} />
          </form>
        ) : null}

        {job.status === "ACCEPTED" ? (
          <SmallActionForm action={markDeliveryLoadedAction} jobId={job.id}>
            <PackageCheck className="size-5" />
            Loaded
          </SmallActionForm>
        ) : null}

        {job.status === "LOADED" ? (
          <SmallActionForm action={startDeliveryJobAction} jobId={job.id}>
            <Navigation className="size-5" />
            Start Delivery
          </SmallActionForm>
        ) : null}

        {showProof ? (
          <div className="space-y-3">
            <ProofForm job={job} profile={profile} outcome="DELIVERED" />
            <ProofForm job={job} profile={profile} outcome="FAILED" />
            <GoodsIssueForm job={job} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ExpenseForm({ vehicles }: { vehicles: Vehicle[] }) {
  const [state, formAction, pending] = useActionState(
    createDeliveryExpenseAction,
    initialDeliveryActionState
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Expense</CardTitle>
        <CardDescription>Receipt photo is required.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expenseType">Type</Label>
            <NativeSelect id="expenseType" name="expenseType">
              {deliveryExpenseTypes.map((type) => (
                <option key={type} value={type}>
                  {label(type)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" min="0" step="0.01" required className="min-h-11 text-base" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expenseVehicle">Vehicle</Label>
            <NativeSelect id="expenseVehicle" name="vehicleId" required={false}>
              <option value="">No vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNo}
                </option>
              ))}
            </NativeSelect>
          </div>
          <input name="receiptPhoto" type="file" accept="image/*" capture="environment" required className="w-full text-sm" />
          <Textarea name="remark" placeholder="Optional remark" />
          <Button type="submit" disabled={pending} className="min-h-12 w-full text-base">
            <Receipt className="size-5" />
            Save Expense
          </Button>
          <ActionMessage state={state} />
        </form>
      </CardContent>
    </Card>
  )
}

function ExpenseList({ expenses }: { expenses: DeliveryExpense[] }) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
        No expenses submitted yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <Card key={expense.id}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-medium">{label(expense.expenseType)}</div>
              <div className="text-sm text-muted-foreground">
                {expense.vehicleNo} / {label(expense.status)}
              </div>
            </div>
            <div className="text-right font-semibold tabular-nums">
              RM {expense.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DriverDeliveryPage({
  profile,
  jobs,
  expenses,
  vehicles,
  demoMode,
}: {
  profile: CurrentProfile
  jobs: DeliveryJob[]
  expenses: DeliveryExpense[]
  vehicles: Vehicle[]
  demoMode: boolean
}) {
  const [activeTab, setActiveTab] = useState<DriverTab>("Available")
  const myJobs = useMemo(
    () => jobs.filter((job) => job.driverId === profile.id || profile.demoMode),
    [jobs, profile.demoMode, profile.id]
  )
  const visibleJobs =
    activeTab === "Available"
      ? jobs.filter((job) => job.status === "AVAILABLE")
      : activeTab === "My Deliveries"
        ? myJobs.filter((job) => ["ACCEPTED", "LOADED", "OUT_FOR_DELIVERY"].includes(job.status))
        : activeTab === "Completed"
          ? myJobs.filter((job) => job.status === "DELIVERED")
          : activeTab === "Failed"
            ? myJobs.filter((job) => job.status === "FAILED")
            : []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Driver Delivery</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {demoMode ? "Demo data" : "Today delivery work"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-5">
        {tabs.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={activeTab === tab ? "default" : "outline"}
            className="min-h-11"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "Expenses" ? (
        <div className="space-y-4">
          <ExpenseForm vehicles={vehicles} />
          <ExpenseList expenses={expenses.filter((expense) => expense.driverId === profile.id || profile.demoMode)} />
        </div>
      ) : visibleJobs.length > 0 ? (
        <div className="space-y-4">
          {visibleJobs.map((job) => (
            <JobCard key={job.id} job={job} vehicles={vehicles} profile={profile} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          No deliveries in this tab.
        </div>
      )}

      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        <CheckCircle2 className="mr-2 inline size-4" />
        Proof photo is required for Delivered and Failed. GPS is attempted during proof upload; delivery can still be completed if GPS is unavailable.
      </div>
    </div>
  )
}
