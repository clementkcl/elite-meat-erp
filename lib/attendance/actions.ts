"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentProfile,
  hasAnyRole,
  type CurrentProfile,
  type UserRole,
} from "@/lib/auth/session"
import { asRecord, readNumber, readString } from "@/lib/records"
import {
  createSupabaseServerClient,
  type SupabaseServerClient,
} from "@/lib/supabase/server"
import type { AttendanceActionState } from "@/lib/attendance/action-state"
import { attendanceEventTypes, attendanceStatuses } from "@/lib/attendance/types"

const attendanceUserRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
]

const attendanceAdminRoles: UserRole[] = [
  "retail_manager",
  "delivery_manager",
  "processing_manager",
  "admin",
]

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

const clockSchema = z.object({
  eventType: z.enum(attendanceEventTypes),
  workLocationId: z.string().trim().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  notes: z.string().trim().optional(),
})

const workLocationSchema = z.object({
  name: z.string().trim().min(2),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().positive(),
})

const attendanceRuleSchema = z.object({
  name: z.string().trim().min(2),
  workLocationId: optionalUuid,
  startTime: z.string().trim().min(4),
  endTime: z.string().trim().min(4),
  lateAfterMinutes: z.coerce.number().int().min(0),
})

const summaryStatusSchema = z.object({
  profileId: z.string().trim().min(1),
  workDate: z.string().trim().min(8),
  workLocationId: optionalUuid,
  status: z.enum(attendanceStatuses),
  notes: z.string().trim().optional(),
})

type AttendanceActionContext = {
  profile: CurrentProfile
  supabase: SupabaseServerClient
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

function success(message: string): AttendanceActionState {
  return { status: "success", message }
}

function failure(message: string): AttendanceActionState {
  return { status: "error", message }
}

function parseAction<T>(
  schema: z.ZodType<T>,
  formData: FormData
): T | AttendanceActionState {
  const parsed = schema.safeParse(formObject(formData))

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Check the form fields.")
  }

  return parsed.data
}

function isAttendanceActionState(value: unknown): value is AttendanceActionState {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "status" in value
  )
}

async function getActionContext(roles: UserRole[]) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: "Sign in before changing attendance records." }
  }

  if (!hasAnyRole(profile, roles)) {
    return { error: "Your role does not allow this attendance action." }
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return { profile, demoMode: true }
  }

  return { profile, supabase, demoMode: false }
}

function revalidateAttendancePaths() {
  [
    "/attendance",
    "/attendance/today",
    "/attendance/clock",
    "/attendance/my-attendance",
    "/attendance/department",
    "/attendance/settings",
  ].forEach((path) => revalidatePath(path))
}

async function runAttendanceAction(
  formData: FormData,
  roles: UserRole[],
  callback: (
    context: AttendanceActionContext,
    formData: FormData
  ) => Promise<string>
) {
  const context = await getActionContext(roles)

  if ("error" in context) {
    return failure(context.error ?? "Action unavailable.")
  }

  if (context.demoMode || !context.supabase) {
    return success("Demo mode: connect Supabase to save this action.")
  }

  try {
    const message = await callback(
      { profile: context.profile, supabase: context.supabase },
      formData
    )
    revalidateAttendancePaths()
    return success(message)
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Action failed.")
  }
}

async function insertAuditLog(
  supabase: SupabaseServerClient,
  profile: CurrentProfile,
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, unknown>
) {
  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
  })
}

function distanceMeters(
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number }
) {
  const earthRadiusMeters = 6371000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const deltaLat = toRadians(pointB.latitude - pointA.latitude)
  const deltaLng = toRadians(pointB.longitude - pointA.longitude)
  const latA = toRadians(pointA.latitude)
  const latB = toRadians(pointB.latitude)
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine))
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function minutesFromTime(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":")
  return Number(hours) * 60 + Number(minutes)
}

async function getWorkLocation(
  supabase: SupabaseServerClient,
  workLocationId: string
) {
  const { data, error } = await supabase
    .from("work_locations")
    .select("*")
    .eq("id", workLocationId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const location = asRecord(data)

  if (!location.id) {
    throw new Error("Work location was not found.")
  }

  return location
}

async function getRuleForLocation(
  supabase: SupabaseServerClient,
  workLocationId: string,
  departmentId: string | null
) {
  let query = supabase
    .from("attendance_rules")
    .select("*")
    .eq("work_location_id", workLocationId)
    .eq("is_active", true)

  if (departmentId) {
    query = query.or(`department_id.eq.${departmentId},department_id.is.null`)
  } else {
    query = query.is("department_id", null)
  }

  const { data, error } = await query
    .order("department_id", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return asRecord(data)
}

async function getSummaryForToday(
  supabase: SupabaseServerClient,
  profileId: string
) {
  const { data, error } = await supabase
    .from("attendance_daily_summary")
    .select("*")
    .eq("profile_id", profileId)
    .eq("work_date", todayDate())
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return asRecord(data)
}

async function markPriorNoClockOutSummaries(
  supabase: SupabaseServerClient,
  profile: CurrentProfile
) {
  const { error } = await supabase
    .from("attendance_daily_summary")
    .update({
      status: "NO_CLOCK_OUT",
      notes: "No clock-out recorded.",
      updated_by: profile.id,
    })
    .eq("profile_id", profile.id)
    .lt("work_date", todayDate())
    .not("clock_in_at", "is", null)
    .is("clock_out_at", null)
    .in("status", ["PRESENT", "LATE"])

  if (error) {
    throw new Error(error.message)
  }
}

async function hasApprovedLeaveToday(
  supabase: SupabaseServerClient,
  profileId: string
) {
  const today = todayDate()
  const { data, error } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("requested_by", profileId)
    .eq("status", "APPROVED")
    .lte("start_date", today)
    .gte("end_date", today)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(asRecord(data).id)
}

function clockInStatus(rule: Record<string, unknown>, eventTime: Date) {
  const startTime = readString(rule.start_time, "08:00:00")
  const lateAfterMinutes = readNumber(rule.late_after_minutes, 5)
  const threshold = minutesFromTime(startTime) + lateAfterMinutes
  const current = eventTime.getHours() * 60 + eventTime.getMinutes()

  return current > threshold ? "LATE" : "PRESENT"
}

export async function clockAttendanceAction(
  _state: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const parsed = parseAction(clockSchema, formData)

  if (isAttendanceActionState(parsed)) {
    return parsed
  }

  return runAttendanceAction(formData, attendanceUserRoles, async (context) => {
    await markPriorNoClockOutSummaries(context.supabase, context.profile)

    if (await hasApprovedLeaveToday(context.supabase, context.profile.id)) {
      throw new Error("Today is approved leave, so attendance is marked On Leave.")
    }

    const location = await getWorkLocation(
      context.supabase,
      parsed.workLocationId
    )
    const distance = distanceMeters(
      {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      },
      {
        latitude: readNumber(location.latitude),
        longitude: readNumber(location.longitude),
      }
    )
    const radiusMeters = readNumber(location.radius_meters, 50)

    if (distance > radiusMeters) {
      throw new Error(
        `You are ${Math.round(distance)}m from ${readString(
          location.name,
          "the work location"
        )}, outside the ${radiusMeters}m radius.`
      )
    }

    const eventTime = new Date()
    const rule = await getRuleForLocation(
      context.supabase,
      parsed.workLocationId,
      context.profile.departmentId
    )
    const existingSummary = await getSummaryForToday(
      context.supabase,
      context.profile.id
    )

    if (
      parsed.eventType === "CLOCK_OUT" &&
      !readString(existingSummary.clock_in_at)
    ) {
      throw new Error("Clock in before clocking out.")
    }

    if (
      parsed.eventType === "CLOCK_IN" &&
      readString(existingSummary.clock_in_at) &&
      !readString(existingSummary.clock_out_at)
    ) {
      throw new Error("You are already clocked in. Clock out before clocking in again.")
    }

    const status =
      parsed.eventType === "CLOCK_IN"
        ? clockInStatus(rule, eventTime)
        : readString(existingSummary.status, "PRESENT")

    const { data, error } = await context.supabase
      .from("attendance_logs")
      .insert({
        profile_id: context.profile.id,
        work_location_id: parsed.workLocationId,
        department_id: context.profile.departmentId,
        event_type: parsed.eventType,
        event_time: eventTime.toISOString(),
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        distance_meters: Math.round(distance * 100) / 100,
        status,
        notes: parsed.notes ?? null,
        created_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const summaryPatch: Record<string, unknown> =
      parsed.eventType === "CLOCK_IN"
        ? {
            profile_id: context.profile.id,
            work_date: todayDate(),
            work_location_id: parsed.workLocationId,
            department_id: context.profile.departmentId,
            clock_in_at: eventTime.toISOString(),
            status,
            notes: parsed.notes ?? null,
            updated_by: context.profile.id,
          }
        : {
            profile_id: context.profile.id,
            work_date: todayDate(),
            work_location_id:
              readString(existingSummary.work_location_id) || parsed.workLocationId,
            department_id:
              readString(existingSummary.department_id) ||
              context.profile.departmentId,
            clock_in_at: readString(existingSummary.clock_in_at) || null,
            clock_out_at: eventTime.toISOString(),
            status,
            total_minutes: existingSummary.clock_in_at
              ? Math.max(
                  0,
                  Math.round(
                    (eventTime.getTime() -
                      new Date(readString(existingSummary.clock_in_at)).getTime()) /
                      60000
                  )
                )
              : 0,
            notes: parsed.notes ?? readString(existingSummary.notes) ?? null,
            updated_by: context.profile.id,
          }

    const { error: summaryError } = await context.supabase
      .from("attendance_daily_summary")
      .upsert(summaryPatch, { onConflict: "profile_id,work_date" })

    if (summaryError) {
      throw new Error(summaryError.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      parsed.eventType,
      "attendance_logs",
      String(asRecord(data).id ?? ""),
      {
        ...parsed,
        distanceMeters: Math.round(distance * 100) / 100,
        status,
      }
    )

    return parsed.eventType === "CLOCK_IN" ? "Clocked in." : "Clocked out."
  })
}

export async function createWorkLocationAction(
  _state: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const parsed = parseAction(workLocationSchema, formData)

  if (isAttendanceActionState(parsed)) {
    return parsed
  }

  return runAttendanceAction(formData, attendanceAdminRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("work_locations")
      .insert({
        name: parsed.name,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        radius_meters: parsed.radiusMeters,
        outlet_id: context.profile.outletId,
        department_id: context.profile.departmentId,
        created_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "WORK_LOCATION_CREATED",
      "work_locations",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Work location saved."
  })
}

export async function createAttendanceRuleAction(
  _state: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const parsed = parseAction(attendanceRuleSchema, formData)

  if (isAttendanceActionState(parsed)) {
    return parsed
  }

  return runAttendanceAction(formData, attendanceAdminRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("attendance_rules")
      .insert({
        name: parsed.name,
        work_location_id: parsed.workLocationId,
        department_id: context.profile.departmentId,
        start_time: parsed.startTime,
        end_time: parsed.endTime,
        late_after_minutes: parsed.lateAfterMinutes,
        created_by: context.profile.id,
      })
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "ATTENDANCE_RULE_CREATED",
      "attendance_rules",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Attendance rule saved."
  })
}

export async function setAttendanceStatusAction(
  _state: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const parsed = parseAction(summaryStatusSchema, formData)

  if (isAttendanceActionState(parsed)) {
    return parsed
  }

  return runAttendanceAction(formData, attendanceAdminRoles, async (context) => {
    const { data, error } = await context.supabase
      .from("attendance_daily_summary")
      .upsert(
        {
          profile_id: parsed.profileId,
          work_date: parsed.workDate,
          work_location_id: parsed.workLocationId,
          status: parsed.status,
          notes: parsed.notes ?? null,
          updated_by: context.profile.id,
        },
        { onConflict: "profile_id,work_date" }
      )
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    await insertAuditLog(
      context.supabase,
      context.profile,
      "ATTENDANCE_STATUS_SET",
      "attendance_daily_summary",
      String(asRecord(data).id ?? ""),
      parsed
    )

    return "Attendance status updated."
  })
}
