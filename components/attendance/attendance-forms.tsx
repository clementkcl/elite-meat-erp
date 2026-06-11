"use client"

import { MapPin, Save } from "lucide-react"
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
  attendanceEventTypes,
  attendanceStatuses,
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
}: {
  pending: boolean
  children: ReactNode
}) {
  return (
    <Button type="submit" disabled={pending}>
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
}: {
  locations: WorkLocation[]
  id?: string
}) {
  return (
    <NativeSelect id={id} name="workLocationId">
      <option value="">Select location</option>
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </NativeSelect>
  )
}

export function ClockAttendanceForm({
  locations,
}: {
  locations: WorkLocation[]
}) {
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
      title="Clock"
      description="Clock in or out from an approved work location."
      action={clockAttendanceAction}
      submitLabel="Save clock event"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eventType">Event</Label>
          <NativeSelect id="eventType" name="eventType">
            {attendanceEventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType.replace("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="workLocationId">Work location</Label>
          <WorkLocationSelect locations={locations} />
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
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" />
        </div>
      </div>
      {geoError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {geoError}
        </div>
      ) : null}
    </WorkflowCard>
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
