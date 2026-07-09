import type { SupabaseClient } from "@supabase/supabase-js"

import { asRecord, readNullableString, readString } from "@/lib/records"

type AssignmentReason = "previous_handler" | "fallback_rule" | "staff_reply"

type AssignmentResolution = {
  assignedStaffId: string | null
  source: "current_customer" | "previous_assignment" | "fallback_rule" | "admin_queue"
}

function errorText(value: unknown) {
  const error = asRecord(value)

  return readString(error.message, "Unknown WhatsApp CRM assignment error")
}

function fallbackStaffIdFromEnv() {
  const staffId = process.env.WHATSAPP_CRM_FALLBACK_STAFF_ID?.trim()

  return staffId && staffId.length > 0 ? staffId : null
}

async function insertAssignmentRecord({
  supabase,
  customerId,
  staffId,
  reason,
}: {
  supabase: SupabaseClient
  customerId: string
  staffId: string
  reason: AssignmentReason
}) {
  const result = await supabase.from("crm_assignments").insert({
    customer_id: customerId,
    staff_id: staffId,
    assignment_reason: reason,
    is_active: true,
  })

  if (result.error) {
    throw new Error(errorText(result.error))
  }
}

async function insertAssignmentAuditLog({
  supabase,
  customerId,
  staffId,
  reason,
}: {
  supabase: SupabaseClient
  customerId: string
  staffId: string | null
  reason: AssignmentReason | "admin_queue"
}) {
  await supabase.from("crm_audit_logs").insert({
    action:
      reason === "admin_queue"
        ? "WHATSAPP_CUSTOMER_ADMIN_QUEUE"
        : "WHATSAPP_CUSTOMER_AUTO_ASSIGNMENT",
    table_name: "crm_customers",
    record_id: customerId,
    detail: {
      staff_id: staffId,
      assignment_reason: reason,
    },
  })
}

export async function resolvePreviousHandlingStaff({
  supabase,
  customerId,
  currentAssignedStaffId,
}: {
  supabase: SupabaseClient
  customerId: string
  currentAssignedStaffId: string | null
}): Promise<AssignmentResolution> {
  if (currentAssignedStaffId) {
    return {
      assignedStaffId: currentAssignedStaffId,
      source: "current_customer",
    }
  }

  const previous = await supabase
    .from("crm_assignments")
    .select("staff_id")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (previous.error) {
    throw new Error(errorText(previous.error))
  }

  const previousStaffId = readNullableString(asRecord(previous.data).staff_id)

  if (previousStaffId) {
    return {
      assignedStaffId: previousStaffId,
      source: "previous_assignment",
    }
  }

  return {
    assignedStaffId: null,
    source: "admin_queue",
  }
}

export function resolveNewCustomerAssignment(): AssignmentResolution {
  const fallbackStaffId = fallbackStaffIdFromEnv()

  if (fallbackStaffId) {
    return {
      assignedStaffId: fallbackStaffId,
      source: "fallback_rule",
    }
  }

  return {
    assignedStaffId: null,
    source: "admin_queue",
  }
}

export async function assignCustomerToStaff({
  supabase,
  customerId,
  staffId,
  reason,
}: {
  supabase: SupabaseClient
  customerId: string
  staffId: string
  reason: AssignmentReason
}) {
  const result = await supabase
    .from("crm_customers")
    .update({ assigned_staff_id: staffId })
    .eq("id", customerId)

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  await Promise.all([
    insertAssignmentRecord({
      supabase,
      customerId,
      staffId,
      reason,
    }),
    insertAssignmentAuditLog({
      supabase,
      customerId,
      staffId,
      reason,
    }),
  ])
}

export async function recordNewCustomerAssignment({
  supabase,
  customerId,
  assignment,
}: {
  supabase: SupabaseClient
  customerId: string
  assignment: AssignmentResolution
}) {
  if (assignment.assignedStaffId && assignment.source === "fallback_rule") {
    await Promise.all([
      insertAssignmentRecord({
        supabase,
        customerId,
        staffId: assignment.assignedStaffId,
        reason: "fallback_rule",
      }),
      insertAssignmentAuditLog({
        supabase,
        customerId,
        staffId: assignment.assignedStaffId,
        reason: "fallback_rule",
      }),
    ])

    return
  }

  if (assignment.source === "admin_queue") {
    await Promise.all([
      supabase.from("crm_notifications").insert({
        customer_id: customerId,
        notification_type: "ADMIN_QUEUE",
        title: "New WhatsApp customer",
        body: "New customer is waiting in the admin queue for assignment.",
        is_read: false,
      }),
      insertAssignmentAuditLog({
        supabase,
        customerId,
        staffId: null,
        reason: "admin_queue",
      }),
    ])
  }
}
