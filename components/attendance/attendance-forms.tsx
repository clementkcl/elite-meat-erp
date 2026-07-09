"use client"

import Link from "next/link"
import { CheckCircle2, Home, LogIn, LogOut, MapPin, Save } from "lucide-react"
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
  clockAttendanceAction,
  createAttendanceRuleAction,
  createWorkLocationAction,
  setAttendanceStatusAction,
} from "@/lib/attendance/actions"
import {
  initialAttendanceActionState,
  type AttendanceActionState,
} from "@/lib/attendance/action-state"
import {
  attendanceStatuses,
  type AttendanceEventType,
  type AttendancePerson,
  type WorkLocation,
} from "@/lib/attendance/types"

type StatefulAction = (
  state: AttendanceActionState,
  formData: FormData
) => Promise<AttendanceActionState>

function ActionMessage({ state }: { state: AttendanceActionState }) {
  if (!state.message) {
    return null
  }

  const nextStep =
    state.status === "success" && state.message.toLowerCase().includes("clocked in")
      ? "Next: continue work, then clock out before leaving."
      : state.status === "success" &&
          state.message.toLowerCase().includes("clocked out")
        ? "Next: you are done for this shift."
        : ""

  return (
    <div
      className={
        state.status === "success"
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      }
    >
      <div>{state.message}</div>
      {nextStep ? <div className="mt-1 font-medium">{nextStep}</div> : null}
    </div>
  )
}

function ClockSuccessNextStep({ state }: { state: AttendanceActionState }) {
  const message = state.message.toLowerCase()
  const clockedIn = state.status === "success" && message.includes("clocked in")
  const clockedOut =
    state.status === "success" && message.includes("clocked out")

  if (!clockedIn && !clockedOut) {
    return null
  }

  const steps = clockedIn
    ? ["Continue work", "Clock out before leaving", "Check My Attendance"]
    : ["Shift complete", "Check My Attendance", "Return Home"]

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            Attendance saved
          </p>
          <p className="text-sm text-emerald-900/75">
            {clockedIn
              ? "You are clocked in. Keep working and clock out before leaving."
              : "You are clocked out. Check your attendance record if needed."}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border bg-background/80 p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Next {index + 1}
            </div>
            <div className="mt-1 text-sm font-semibold">{step}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button asChild className="min-h-12 w-full justify-start text-base">
          <Link href="/attendance/my-attendance">
            <CheckCircle2 className="size-5" />
            Check My Attendance
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-12 w-full justify-start text-base"
        >
          <Link href="/dashboard">
            <Home className="size-5" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  )
}

function ClockErrorNextStep({ state }: { state: AttendanceActionState }) {
  if (state.status !== "error") {
    return null
  }

  const steps = [
    "Check Clock In or Clock Out",
    "Capture location again",
    "Ask manager if still blocked",
  ]

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-900">
        Attendance not saved yet
      </p>
      <p className="mt-1 text-sm text-red-900/75">
        Fix the action, location, or work location, then submit again.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step} className="rounded-md border bg-background/80 p-3">
            <div className="text-sm font-semibold">{step}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NativeSelect({
  id,
  name,
  children,
  required = true,
  value,
  onChange,
}: {
  id: string
  name: string
  children: ReactNode
  required?: boolean
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <select
      id={id}
      name={name}
      required={required}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {children}
    </select>
  )
}

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean
  children: ReactNode
}) {
  return (
    <Button type="submit" disabled={pending} className="min-h-11 w-full sm:w-auto">
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
}: {
  title: string
  description: string
  action: StatefulAction
  children: ReactNode
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAttendanceActionState
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
          <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

function WorkLocationSelect({
  locations,
  id = "workLocationId",
  value,
  onChange,
}: {
  locations: WorkLocation[]
  id?: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <NativeSelect id={id} name="workLocationId" value={value} onChange={onChange}>
      <option value="">Select location</option>
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function ClockReadinessGuide({
  eventType,
  hasLocation,
  hasCoordinates,
  hasWorkLocations,
}: {
  eventType: AttendanceEventType
  hasLocation: boolean
  hasCoordinates: boolean
  hasWorkLocations: boolean
}) {
  const checks = [
    { label: eventType === "CLOCK_IN" ? "Clock In selected" : "Clock Out selected", ready: true },
    { label: "Work location selected", ready: hasLocation },
    { label: "GPS or manual location ready", ready: hasCoordinates },
  ]

  if (!hasWorkLocations) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <div className="font-semibold">Clock is not ready yet</div>
        <p className="mt-1">
          No active work location is available. Ask a manager to set up the
          attendance location before clocking in or out.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-semibold">
        {hasLocation && hasCoordinates ? "Ready to submit" : "Clock is not ready yet"}
      </div>
      <p className="mt-1">
        Choose the action, select work location, then use current location.
      </p>
      <div className="mt-3 grid gap-2 min-[380px]:grid-cols-3">
        {checks.map((check) => (
          <div
            key={check.label}
            className={
              check.ready
                ? "rounded-md border border-emerald-200 bg-background px-3 py-2 text-emerald-800"
                : "rounded-md border bg-background px-3 py-2"
            }
          >
            <div className="text-xs font-medium text-muted-foreground">
              {check.ready ? "Ready" : "Needed"}
            </div>
            <div className="mt-1 font-semibold">{check.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AttendanceWorkerFastPath() {
  const steps = [
    "Choose Clock In or Clock Out",
    "Use Current Location",
    "Submit attendance",
  ]

  return (
    <Card className="border-emerald-200 bg-emerald-50/60">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <LogIn className="size-4" />
          Attendance worker fast path
        </div>
        <CardTitle className="text-lg">Big button attendance</CardTitle>
        <CardDescription className="text-emerald-950/75">
          Pick one action, capture GPS, then submit. No typing unless GPS is blocked.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded-md border bg-background/80 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Step {index + 1}
              </div>
              <div className="mt-1 text-sm font-semibold">{step}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ClockAttendanceForm({
  locations,
}: {
  locations: WorkLocation[]
}) {
  const [state, formAction, pending] = useActionState(
    clockAttendanceAction,
    initialAttendanceActionState
  )
  const [eventType, setEventType] = useState<AttendanceEventType>("CLOCK_IN")
  const [workLocationId, setWorkLocationId] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [geoError, setGeoError] = useState("")
  const hasCoordinates = Boolean(latitude.trim() && longitude.trim())
  const canSubmit = Boolean(workLocationId && hasCoordinates)

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
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Location permission is blocked. Allow location or type latitude and longitude below.")
          return
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError("Location is unavailable. Move near the outlet or type latitude and longitude below.")
          return
        }

        setGeoError("Location timed out. Try again or type latitude and longitude below.")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-4">
      <AttendanceWorkerFastPath />
      <Card>
      <CardHeader>
        <CardTitle>Clock In / Clock Out</CardTitle>
        <CardDescription>
          Choose one action, capture location, then submit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="eventType" value={eventType} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant={eventType === "CLOCK_IN" ? "default" : "outline"}
              className="min-h-20 justify-start gap-3 px-4 text-left"
              onClick={() => setEventType("CLOCK_IN")}
            >
              <LogIn className="size-6 shrink-0" />
              <span>
                <span className="block text-base font-semibold">Clock In</span>
                <span className="block text-xs opacity-80">Start shift</span>
              </span>
            </Button>
            <Button
              type="button"
              variant={eventType === "CLOCK_OUT" ? "default" : "outline"}
              className="min-h-20 justify-start gap-3 px-4 text-left"
              onClick={() => setEventType("CLOCK_OUT")}
            >
              <LogOut className="size-6 shrink-0" />
              <span>
                <span className="block text-base font-semibold">Clock Out</span>
                <span className="block text-xs opacity-80">End shift</span>
              </span>
            </Button>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            Selected action:{" "}
            <span className="font-semibold">
              {eventType === "CLOCK_IN" ? "Clock In" : "Clock Out"}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workLocationId">Work location</Label>
            <WorkLocationSelect
              locations={locations}
              value={workLocationId}
              onChange={setWorkLocationId}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="min-h-14 w-full justify-center gap-2 text-base"
            onClick={captureLocation}
          >
            <MapPin className="size-5" />
            Use Current Location
          </Button>

          {latitude && longitude ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Location captured. Next: tap{" "}
              {eventType === "CLOCK_IN" ? "Submit Clock In" : "Submit Clock Out"}.
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Capture location before submitting. If location is blocked, type it below.
            </div>
          )}

          {geoError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {geoError}
            </div>
          ) : null}
          <ClockReadinessGuide
            eventType={eventType}
            hasLocation={Boolean(workLocationId)}
            hasCoordinates={hasCoordinates}
            hasWorkLocations={locations.length > 0}
          />

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Manual location and notes
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="2.2871000"
                  className="min-h-11"
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
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" className="min-h-11" />
              </div>
            </div>
          </details>

          <ActionMessage state={state} />
          <ClockErrorNextStep state={state} />
          <ClockSuccessNextStep state={state} />
          <Button
            type="submit"
            disabled={pending || !canSubmit}
            className="min-h-14 w-full text-base"
          >
            {eventType === "CLOCK_IN" ? (
              <LogIn className="size-5" />
            ) : (
              <LogOut className="size-5" />
            )}
            {pending
              ? "Saving..."
              : eventType === "CLOCK_IN"
                ? "Submit Clock In"
                : "Submit Clock Out"}
          </Button>
        </form>
      </CardContent>
      </Card>
    </div>
  )
}

export function WorkLocationForm() {
  return (
    <WorkflowCard
      title="Work location"
      description="Create clock-in locations and radius limits."
      action={createWorkLocationAction}
      submitLabel="Save location"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="JALAN CHANNEL" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="radiusMeters">Radius meters</Label>
          <Input
            id="radiusMeters"
            name="radiusMeters"
            type="number"
            min="1"
            defaultValue="50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" name="latitude" placeholder="2.2871000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" name="longitude" placeholder="111.8320000" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function AttendanceRuleForm({
  locations,
}: {
  locations: WorkLocation[]
}) {
  return (
    <WorkflowCard
      title="Attendance rule"
      description="Set clock times and late threshold by work location."
      action={createAttendanceRuleAction}
      submitLabel="Save rule"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ruleName">Rule name</Label>
          <Input id="ruleName" name="name" placeholder="Standard JALAN CHANNEL" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ruleWorkLocationId">Work location</Label>
          <WorkLocationSelect id="ruleWorkLocationId" locations={locations} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" name="startTime" type="time" defaultValue="08:00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End time</Label>
          <Input id="endTime" name="endTime" type="time" defaultValue="17:00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lateAfterMinutes">Late after minutes</Label>
          <Input
            id="lateAfterMinutes"
            name="lateAfterMinutes"
            type="number"
            min="0"
            defaultValue="5"
          />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function AttendanceStatusForm({
  people,
  locations,
}: {
  people: AttendancePerson[]
  locations: WorkLocation[]
}) {
  return (
    <WorkflowCard
      title="Set daily status"
      description="Mark absent, leave, present, or late for department review."
      action={setAttendanceStatusAction}
      submitLabel="Update status"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profileId">Employee</Label>
          <NativeSelect id="profileId" name="profileId">
            <option value="">Select employee</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="workDate">Date</Label>
          <Input
            id="workDate"
            name="workDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="statusWorkLocationId">Work location</Label>
          <WorkLocationSelect id="statusWorkLocationId" locations={locations} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status">
            {attendanceStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
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
