export const attendanceEventTypes = ["CLOCK_IN", "CLOCK_OUT"] as const
export const attendanceStatuses = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "ON_LEAVE",
  "NO_CLOCK_OUT",
] as const

export type AttendanceEventType = (typeof attendanceEventTypes)[number]
export type AttendanceStatus = (typeof attendanceStatuses)[number]

export type AttendancePerson = {
  id: string
  fullName: string
  email: string
}

export type WorkLocation = {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
  active: boolean
}

export type AttendanceRule = {
  id: string
  name: string
  workLocationId: string | null
  workLocationName: string
  startTime: string
  endTime: string
  lateAfterMinutes: number
  active: boolean
}

export type AttendanceLog = {
  id: string
  profileId: string
  personName: string
  workLocationId: string | null
  workLocationName: string
  eventType: AttendanceEventType
  eventTime: string
  latitude: number
  longitude: number
  distanceMeters: number
  status: AttendanceStatus
  notes: string
}

export type AttendanceSummary = {
  id: string
  profileId: string
  personName: string
  workDate: string
  workLocationId: string | null
  workLocationName: string
  clockInAt: string | null
  clockOutAt: string | null
  status: AttendanceStatus
  totalMinutes: number
  notes: string
}

export type AttendanceKpi = {
  label: string
  value: string
  detail: string
}

export type AttendancePageData = {
  demoMode: boolean
  people: AttendancePerson[]
  workLocations: WorkLocation[]
  rules: AttendanceRule[]
  logs: AttendanceLog[]
  summaries: AttendanceSummary[]
  dashboard: {
    kpis: AttendanceKpi[]
  }
}
