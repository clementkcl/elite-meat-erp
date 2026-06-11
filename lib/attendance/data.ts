import {
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  demoAttendanceLogs,
  demoAttendancePeople,
  demoAttendanceRules,
  demoAttendanceSummaries,
  demoWorkLocations,
} from "@/lib/attendance/demo-data"
import {
  attendanceEventTypes,
  attendanceStatuses,
  type AttendanceEventType,
  type AttendanceKpi,
  type AttendanceLog,
  type AttendancePageData,
  type AttendancePerson,
  type AttendanceRule,
  type AttendanceStatus,
  type AttendanceSummary,
  type WorkLocation,
} from "@/lib/attendance/types"

function isAttendanceEventType(value: string): value is AttendanceEventType {
  return attendanceEventTypes.includes(value as AttendanceEventType)
}

function isAttendanceStatus(value: string): value is AttendanceStatus {
  return attendanceStatuses.includes(value as AttendanceStatus)
}

async function loadRows(table: string) {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.from(table).select("*").limit(1000)

  if (error) {
    return []
  }

  return asRecordArray(data)
}

function findPerson(people: AttendancePerson[], id: string | null | undefined) {
  return people.find((person) => person.id === id)
}

function findLocation(
  locations: WorkLocation[],
  id: string | null | undefined
) {
  return locations.find((location) => location.id === id)
}

function mapPerson(row: Record<string, unknown>): AttendancePerson {
  return {
    id: readString(row.id),
    fullName: readString(row.full_name, readString(row.email, "ERP User")),
    email: readString(row.email),
  }
}

function mapWorkLocation(row: Record<string, unknown>): WorkLocation {
  return {
    id: readString(row.id),
    name: readString(row.name),
    latitude: readNumber(row.latitude),
    longitude: readNumber(row.longitude),
    radiusMeters: readNumber(row.radius_meters),
    active: readBoolean(row.is_active, true),
  }
}

function mapRule(
  row: Record<string, unknown>,
  locations: WorkLocation[]
): AttendanceRule {
  const workLocationId = readNullableString(row.work_location_id)

  return {
    id: readString(row.id),
    name: readString(row.name),
    workLocationId,
    workLocationName: findLocation(locations, workLocationId)?.name ?? "-",
    startTime: readString(row.start_time, "08:00:00"),
    endTime: readString(row.end_time, "17:00:00"),
    lateAfterMinutes: readNumber(row.late_after_minutes, 10),
    active: readBoolean(row.is_active, true),
  }
}

function mapLog(
  row: Record<string, unknown>,
  people: AttendancePerson[],
  locations: WorkLocation[]
): AttendanceLog {
  const profileId = readString(row.profile_id)
  const workLocationId = readNullableString(row.work_location_id)
  const eventType = readString(row.event_type, "CLOCK_IN")
  const status = readString(row.status, "PRESENT")

  return {
    id: readString(row.id),
    profileId,
    personName: findPerson(people, profileId)?.fullName ?? "-",
    workLocationId,
    workLocationName: findLocation(locations, workLocationId)?.name ?? "-",
    eventType: isAttendanceEventType(eventType) ? eventType : "CLOCK_IN",
    eventTime: readString(row.event_time, new Date().toISOString()),
    latitude: readNumber(row.latitude),
    longitude: readNumber(row.longitude),
    distanceMeters: readNumber(row.distance_meters),
    status: isAttendanceStatus(status) ? status : "PRESENT",
    notes: readString(row.notes, ""),
  }
}

function mapSummary(
  row: Record<string, unknown>,
  people: AttendancePerson[],
  locations: WorkLocation[]
): AttendanceSummary {
  const profileId = readString(row.profile_id)
  const workLocationId = readNullableString(row.work_location_id)
  const status = readString(row.status, "PRESENT")

  return {
    id: readString(row.id),
    profileId,
    personName: findPerson(people, profileId)?.fullName ?? "-",
    workDate: readString(row.work_date),
    workLocationId,
    workLocationName: findLocation(locations, workLocationId)?.name ?? "-",
    clockInAt: readNullableString(row.clock_in_at),
    clockOutAt: readNullableString(row.clock_out_at),
    status: isAttendanceStatus(status) ? status : "PRESENT",
    totalMinutes: readNumber(row.total_minutes),
    notes: readString(row.notes, ""),
  }
}

function buildDashboard(summaries: AttendanceSummary[]) {
  const today = new Date().toISOString().slice(0, 10)
  const todayRows = summaries.filter((summary) => summary.workDate === today)

  const kpis: AttendanceKpi[] = [
    {
      label: "Present today",
      value: String(todayRows.filter((row) => row.status === "PRESENT").length),
      detail: "Clocked in on time",
    },
    {
      label: "Late today",
      value: String(todayRows.filter((row) => row.status === "LATE").length),
      detail: "Clock-in after rule threshold",
    },
    {
      label: "Absent today",
      value: String(todayRows.filter((row) => row.status === "ABSENT").length),
      detail: "Daily summary absence rows",
    },
    {
      label: "On leave",
      value: String(todayRows.filter((row) => row.status === "ON_LEAVE").length),
      detail: "Approved leave rows",
    },
    {
      label: "No clock-out",
      value: String(
        summaries.filter((row) => row.status === "NO_CLOCK_OUT").length
      ),
      detail: "Prior days missing clock-out",
    },
  ]

  return { kpis }
}

export async function getAttendancePageData(): Promise<AttendancePageData> {
  const [profileRows, locationRows, ruleRows, logRows, summaryRows] =
    await Promise.all([
      loadRows("profiles"),
      loadRows("work_locations"),
      loadRows("attendance_rules"),
      loadRows("attendance_logs"),
      loadRows("attendance_daily_summary"),
    ])

  if (!profileRows) {
    return {
      demoMode: true,
      people: demoAttendancePeople,
      workLocations: demoWorkLocations,
      rules: demoAttendanceRules,
      logs: demoAttendanceLogs,
      summaries: demoAttendanceSummaries,
      dashboard: buildDashboard(demoAttendanceSummaries),
    }
  }

  const people = profileRows.map(mapPerson)
  const workLocations = (locationRows ?? []).map(mapWorkLocation)
  const rules = (ruleRows ?? []).map((row) => mapRule(row, workLocations))
  const logs = (logRows ?? [])
    .map((row) => mapLog(row, people, workLocations))
    .sort((a, b) => b.eventTime.localeCompare(a.eventTime))
  const summaries = (summaryRows ?? [])
    .map((row) => mapSummary(row, people, workLocations))
    .sort((a, b) => b.workDate.localeCompare(a.workDate))

  return {
    demoMode: false,
    people,
    workLocations,
    rules,
    logs,
    summaries,
    dashboard: buildDashboard(summaries),
  }
}
