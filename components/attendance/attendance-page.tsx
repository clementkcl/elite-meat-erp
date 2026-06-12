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
  AttendanceRuleForm,
  AttendanceStatusForm,
  ClockAttendanceForm,
  WorkLocationForm,
} from "@/components/attendance/attendance-forms"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { getCurrentProfile } from "@/lib/auth/session"
import type { UserRole } from "@/lib/auth/types"
import { getAttendancePageData } from "@/lib/attendance/data"

export type AttendanceRoute =
  | "today"
  | "clock"
  | "my-attendance"
  | "department"
  | "settings"

type TableRow = Record<string, string | number | boolean>

const attendanceRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
  "director",
]

const titles: Record<AttendanceRoute, { title: string; description: string }> = {
  today: {
    title: "Attendance Today",
    description: "Daily attendance status, clock activity, and exceptions.",
  },
  clock: {
    title: "Clock",
    description: "Clock in and out with GPS validation.",
  },
  "my-attendance": {
    title: "My Attendance",
    description: "Own clock history, daily summaries, and working minutes.",
  },
  department: {
    title: "Department Attendance",
    description: "Review and update team attendance status.",
  },
  settings: {
    title: "Attendance Settings",
    description: "Maintain work locations, radius limits, and attendance rules.",
  },
}

const navItems: { route: AttendanceRoute; href: string; label: string }[] = [
  { route: "today", href: "/attendance/today", label: "Today" },
  { route: "clock", href: "/attendance/clock", label: "Clock" },
  { route: "my-attendance", href: "/attendance/my-attendance", label: "My Attendance" },
  { route: "department", href: "/attendance/department", label: "Department" },
  { route: "settings", href: "/attendance/settings", label: "Settings" },
]

const summaryColumns: DataTableColumn<TableRow>[] = [
  { key: "workDate", header: "Date" },
  { key: "personName", header: "Employee" },
  { key: "workLocationName", header: "Location" },
  { key: "clockInAt", header: "Clock in" },
  { key: "clockOutAt", header: "Clock out" },
  { key: "status", header: "Status" },
  { key: "totalMinutes", header: "Minutes", align: "right" },
]

const logColumns: DataTableColumn<TableRow>[] = [
  { key: "eventTime", header: "Time" },
  { key: "personName", header: "Employee" },
  { key: "workLocationName", header: "Location" },
  { key: "eventType", header: "Event" },
  { key: "distanceMeters", header: "Meters", align: "right" },
  { key: "status", header: "Status" },
]

const locationColumns: DataTableColumn<TableRow>[] = [
  { key: "name", header: "Location" },
  { key: "latitude", header: "Lat", align: "right" },
  { key: "longitude", header: "Lng", align: "right" },
  { key: "radiusMeters", header: "Radius", align: "right" },
  { key: "active", header: "Active" },
]

const ruleColumns: DataTableColumn<TableRow>[] = [
  { key: "name", header: "Rule" },
  { key: "workLocationName", header: "Location" },
  { key: "startTime", header: "Start" },
  { key: "endTime", header: "End" },
  { key: "lateAfterMinutes", header: "Late min", align: "right" },
  { key: "active", header: "Active" },
]

function dateText(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value))
}

function PageHeader({
  route,
  demoMode,
}: {
  route: AttendanceRoute
  demoMode: boolean
}) {
  const title = titles[route]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {title.description}
        </p>
      </div>
      {demoMode ? <Badge variant="warning">Demo data</Badge> : null}
    </div>
  )
}

function AttendanceNav({ route }: { route: AttendanceRoute }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {navItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={item.route === route ? "default" : "outline"}
          size="sm"
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </div>
  )
}

function KpiCards({
  kpis,
}: {
  kpis: { label: string; value: string; detail: string }[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="pb-2">
            <CardDescription>{kpi.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{kpi.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function summaryRows(
  data: Awaited<ReturnType<typeof getAttendancePageData>>,
  profileId?: string
): TableRow[] {
  return data.summaries
    .filter((summary) => !profileId || summary.profileId === profileId)
    .map((summary) => ({
      workDate: dateText(summary.workDate),
      personName: summary.personName,
      workLocationName: summary.workLocationName,
      clockInAt: dateText(summary.clockInAt),
      clockOutAt: dateText(summary.clockOutAt),
      status: summary.status.replace("_", " "),
      totalMinutes: summary.totalMinutes,
    }))
}

function logRows(
  data: Awaited<ReturnType<typeof getAttendancePageData>>,
  profileId?: string
): TableRow[] {
  return data.logs
    .filter((log) => !profileId || log.profileId === profileId)
    .map((log) => ({
      eventTime: dateText(log.eventTime),
      personName: log.personName,
      workLocationName: log.workLocationName,
      eventType: log.eventType.replace("_", " "),
      distanceMeters: Math.round(log.distanceMeters),
      status: log.status.replace("_", " "),
    }))
}

function locationRows(
  data: Awaited<ReturnType<typeof getAttendancePageData>>
): TableRow[] {
  return data.workLocations.map((location) => ({
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    radiusMeters: location.radiusMeters,
    active: location.active,
  }))
}

function ruleRows(
  data: Awaited<ReturnType<typeof getAttendancePageData>>
): TableRow[] {
  return data.rules.map((rule) => ({
    name: rule.name,
    workLocationName: rule.workLocationName,
    startTime: rule.startTime,
    endTime: rule.endTime,
    lateAfterMinutes: rule.lateAfterMinutes,
    active: rule.active,
  }))
}

export async function AttendancePage({ route }: { route: AttendanceRoute }) {
  const blocked = await moduleAccessBlock(
    "attendance",
    "Attendance",
    attendanceRoles
  )

  if (blocked) {
    return blocked
  }

  const [data, profile] = await Promise.all([
    getAttendancePageData(),
    getCurrentProfile(),
  ])
  const currentProfileId = profile?.id
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-5">
      <PageHeader route={route} demoMode={data.demoMode} />
      <AttendanceNav route={route} />

      {route === "today" ? (
        <>
          <KpiCards kpis={data.dashboard.kpis} />
          <Card>
            <CardHeader>
              <CardTitle>Today</CardTitle>
              <CardDescription>Attendance summary for {dateText(today)}.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={summaryColumns}
                data={summaryRows(data).filter((row) =>
                  String(row.workDate).includes(
                    new Date(today).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  )
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Latest clock logs</CardTitle>
              <CardDescription>Recent clock-in and clock-out events.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={logColumns} data={logRows(data).slice(0, 12)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "clock" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Clock rules</CardTitle>
              <CardDescription>
                GPS and schedule rules used for this attendance workflow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <div className="font-medium">GPS radius</div>
                  <div className="mt-1 text-muted-foreground">
                    Clock events must be within 50m of an active work location.
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="font-medium">Late grace</div>
                  <div className="mt-1 text-muted-foreground">
                    More than 5 minutes after department start time is late.
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="font-medium">Clock-out</div>
                  <div className="mt-1 text-muted-foreground">
                    Missing clock-out remains visible on the daily summary.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <ClockAttendanceForm locations={data.workLocations} />
          <Card>
            <CardHeader>
              <CardTitle>My recent logs</CardTitle>
              <CardDescription>Clock records for the signed-in user.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={logColumns} data={logRows(data, currentProfileId)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "my-attendance" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>My daily summaries</CardTitle>
              <CardDescription>Attendance status and working minutes.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={summaryColumns}
                data={summaryRows(data, currentProfileId)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>My clock logs</CardTitle>
              <CardDescription>Raw clock events with distance validation.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={logColumns} data={logRows(data, currentProfileId)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "department" ? (
        <>
          <AttendanceStatusForm
            people={data.people}
            locations={data.workLocations}
          />
          <Card>
            <CardHeader>
              <CardTitle>Department summary</CardTitle>
              <CardDescription>Daily attendance rows across employees.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={summaryColumns} data={summaryRows(data)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "settings" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <WorkLocationForm />
            <AttendanceRuleForm locations={data.workLocations} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Work locations</CardTitle>
              <CardDescription>Approved clock-in location radius settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={locationColumns} data={locationRows(data)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Attendance rules</CardTitle>
              <CardDescription>Clock schedule and late thresholds.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={ruleColumns} data={ruleRows(data)} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
