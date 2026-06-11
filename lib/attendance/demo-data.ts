import type {
  AttendanceLog,
  AttendancePerson,
  AttendanceRule,
  AttendanceSummary,
  WorkLocation,
} from "@/lib/attendance/types"

const today = new Date().toISOString().slice(0, 10)
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

export const demoAttendancePeople: AttendancePerson[] = [
  {
    id: "demo-user",
    fullName: "Demo Admin",
    email: "demo@elitemeat.local",
  },
  {
    id: "demo-worker",
    fullName: "Demo Worker",
    email: "worker@elitemeat.local",
  },
]

export const demoWorkLocations: WorkLocation[] = [
  {
    id: "work-location-jalan-channel",
    name: "JALAN CHANNEL",
    latitude: 2.2871,
    longitude: 111.832,
    radiusMeters: 50,
    active: true,
  },
  {
    id: "work-location-sungai-merah",
    name: "SUNGAI MERAH",
    latitude: 2.3123,
    longitude: 111.846,
    radiusMeters: 50,
    active: true,
  },
]

export const demoAttendanceRules: AttendanceRule[] = [
  {
    id: "attendance-rule-jalan-channel",
    name: "Standard JALAN CHANNEL",
    workLocationId: "work-location-jalan-channel",
    workLocationName: "JALAN CHANNEL",
    startTime: "08:00:00",
    endTime: "17:00:00",
    lateAfterMinutes: 5,
    active: true,
  },
]

export const demoAttendanceLogs: AttendanceLog[] = [
  {
    id: "attendance-log-001",
    profileId: "demo-user",
    personName: "Demo Admin",
    workLocationId: "work-location-jalan-channel",
    workLocationName: "JALAN CHANNEL",
    eventType: "CLOCK_IN",
    eventTime: `${today}T08:04:00.000Z`,
    latitude: 2.2871,
    longitude: 111.832,
    distanceMeters: 0,
    status: "PRESENT",
    notes: "Demo clock in",
  },
]

export const demoAttendanceSummaries: AttendanceSummary[] = [
  {
    id: "attendance-summary-001",
    profileId: "demo-user",
    personName: "Demo Admin",
    workDate: today,
    workLocationId: "work-location-jalan-channel",
    workLocationName: "JALAN CHANNEL",
    clockInAt: `${today}T08:04:00.000Z`,
    clockOutAt: null,
    status: "PRESENT",
    totalMinutes: 0,
    notes: "Demo attendance",
  },
  {
    id: "attendance-summary-002",
    profileId: "demo-worker",
    personName: "Demo Worker",
    workDate: today,
    workLocationId: "work-location-jalan-channel",
    workLocationName: "JALAN CHANNEL",
    clockInAt: null,
    clockOutAt: null,
    status: "ON_LEAVE",
    totalMinutes: 0,
    notes: "Approved leave: Family matter",
  },
  {
    id: "attendance-summary-003",
    profileId: "demo-worker",
    personName: "Demo Worker",
    workDate: yesterday,
    workLocationId: "work-location-jalan-channel",
    workLocationName: "JALAN CHANNEL",
    clockInAt: `${yesterday}T08:01:00.000Z`,
    clockOutAt: null,
    status: "NO_CLOCK_OUT",
    totalMinutes: 0,
    notes: "No clock-out recorded.",
  },
]
