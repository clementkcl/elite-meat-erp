import type { SupabaseClient } from "@supabase/supabase-js"

import type { CurrentProfile } from "@/lib/auth/session"
import {
  asRecord,
  asRecordArray,
  readNullableString,
  readString,
} from "@/lib/records"
import { sendWhatsAppMediaMessage } from "@/lib/whatsapp-crm/cloud-api"
import type {
  CrmBroadcastDraft,
  CrmCustomer,
} from "@/lib/whatsapp-crm/types"

type BroadcastPriceListInput = {
  title?: string
  imageMediaId?: string
  imageLabel?: string
  caption?: string
  customerTypes?: CrmCustomer["customerType"][]
  areas?: string[]
  tags?: string[]
  assignedStaffIds?: string[]
}

type BroadcastPriceListResult = {
  ok: boolean
  error: string | null
  broadcast: CrmBroadcastDraft | null
  sentCount: number
  skippedCount: number
  failedCount: number
}

type BroadcastCustomer = {
  id: string
  name: string
  phone: string
  customerType: CrmCustomer["customerType"]
  area: string
  tags: string[]
  assignedStaffId: string | null
  whatsappPhoneNumberId: string
}

type WhatsAppSendResult = {
  ok?: boolean
  skipped?: boolean
  status?: number
  body?: unknown
  error?: string | null
}

const ownerAdminBroadcastRoles = ["owner", "admin"]
const customerTypes: CrmCustomer["customerType"][] = ["Retail", "Wholesale", "VIP"]

function hasAnyRole(profile: CurrentProfile, roles: string[]) {
  return profile.roles.some((role) => roles.includes(role))
}

function errorText(value: unknown) {
  const error = asRecord(value)

  return readString(error.message, "Unknown WhatsApp CRM broadcast error")
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((item) => cleanText(item))
        .filter(Boolean)
        .slice(0, 30)
    )
  )
}

function cleanCustomerTypes(value: unknown): CrmCustomer["customerType"][] {
  return cleanList(value).filter((item): item is CrmCustomer["customerType"] =>
    customerTypes.includes(item as CrmCustomer["customerType"])
  )
}

function validateBroadcastInput(input: BroadcastPriceListInput) {
  if (!cleanText(input.title)) return "Broadcast title is required."
  if (!cleanText(input.imageMediaId)) return "WhatsApp image media ID is required."
  if (!cleanText(input.imageLabel)) return "Image price list label is required."

  return null
}

function assertCanBroadcast(profile: CurrentProfile) {
  if (!hasAnyRole(profile, ownerAdminBroadcastRoles)) {
    return "Only owner/admin can send broadcast price lists."
  }

  return null
}

function listText(values: string[], label: string) {
  return values.length > 0 ? `${label}: ${values.join(", ")}` : ""
}

function audienceSummary({
  customerTypes: typeFilters,
  areas,
  tags,
  assignedStaffIds,
}: {
  customerTypes: string[]
  areas: string[]
  tags: string[]
  assignedStaffIds: string[]
}) {
  return (
    [
      listText(typeFilters, "Type"),
      listText(areas, "Area"),
      listText(tags, "Tags"),
      listText(assignedStaffIds, "Staff"),
    ]
      .filter(Boolean)
      .join(" | ") || "All active WhatsApp CRM customers"
  )
}

function matchesFilter(customer: BroadcastCustomer, input: BroadcastPriceListInput) {
  const typeFilters = cleanCustomerTypes(input.customerTypes)
  const areaFilters = cleanList(input.areas).map((area) => area.toLowerCase())
  const tagFilters = cleanList(input.tags).map((tag) => tag.toLowerCase())
  const staffFilters = cleanList(input.assignedStaffIds)
  const customerTags = customer.tags.map((tag) => tag.toLowerCase())

  if (typeFilters.length > 0 && !typeFilters.includes(customer.customerType)) {
    return false
  }

  if (areaFilters.length > 0 && !areaFilters.includes(customer.area.toLowerCase())) {
    return false
  }

  if (
    tagFilters.length > 0 &&
    !tagFilters.some((tag) => customerTags.includes(tag))
  ) {
    return false
  }

  if (
    staffFilters.length > 0 &&
    (!customer.assignedStaffId || !staffFilters.includes(customer.assignedStaffId))
  ) {
    return false
  }

  return true
}

function statusForSend(result: WhatsAppSendResult) {
  if (result.ok) return "sent"

  return "failed"
}

function recipientStatusForSend(result: WhatsAppSendResult) {
  if (result.ok) return "SENT"
  if (result.skipped) return "SKIPPED"

  return "FAILED"
}

function mapBroadcastFromRow(
  row: Record<string, unknown>,
  recipientCount: number,
  audience: string
): CrmBroadcastDraft {
  return {
    id: readString(row.id),
    title: readString(row.title),
    imageLabel: readString(row.image_label),
    audience,
    status: readString(row.status, "Sent") as CrmBroadcastDraft["status"],
    recipientCount,
  }
}

async function loadBroadcastCustomers(
  supabase: SupabaseClient
): Promise<BroadcastCustomer[]> {
  const result = await supabase
    .from("crm_customers")
    .select(
      "id, name, phone, customer_type, area, tags, assigned_staff_id, is_active, whatsapp_accounts(phone_number_id)"
    )
    .eq("is_active", true)

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  return asRecordArray(result.data).map((row) => {
    const account = asRecord(row.whatsapp_accounts)

    return {
      id: readString(row.id),
      name: readString(row.name, "Customer"),
      phone: readString(row.phone),
      customerType: readString(row.customer_type, "Retail") as CrmCustomer["customerType"],
      area: readString(row.area),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      assignedStaffId: readNullableString(row.assigned_staff_id),
      whatsappPhoneNumberId: readString(account.phone_number_id),
    }
  })
}

async function loadOrCreateBroadcastConversation(
  supabase: SupabaseClient,
  customer: BroadcastCustomer
) {
  const latest = await supabase
    .from("crm_conversations")
    .select("id")
    .eq("customer_id", customer.id)
    .in("status", ["OPEN", "PENDING"])
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest.error) {
    throw new Error(errorText(latest.error))
  }

  if (latest.data) {
    return readString(asRecord(latest.data).id)
  }

  const customerRow = await supabase
    .from("crm_customers")
    .select("whatsapp_account_id")
    .eq("id", customer.id)
    .single()

  if (customerRow.error) {
    throw new Error(errorText(customerRow.error))
  }

  const inserted = await supabase
    .from("crm_conversations")
    .insert({
      customer_id: customer.id,
      whatsapp_account_id: readString(asRecord(customerRow.data).whatsapp_account_id),
      status: "OPEN",
      assigned_staff_id: customer.assignedStaffId,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (inserted.error) {
    throw new Error(errorText(inserted.error))
  }

  return readString(asRecord(inserted.data).id)
}

async function storeBroadcastMessage({
  supabase,
  profile,
  customer,
  mediaId,
  caption,
  result,
}: {
  supabase: SupabaseClient
  profile: CurrentProfile
  customer: BroadcastCustomer
  mediaId: string
  caption: string
  result: WhatsAppSendResult
}) {
  const now = new Date().toISOString()
  const conversationId = await loadOrCreateBroadcastConversation(supabase, customer)

  await supabase.from("crm_messages").insert({
    conversation_id: conversationId,
    customer_id: customer.id,
    customer_phone: customer.phone,
    direction: "outbound",
    sender_name: profile.fullName || profile.email || "Owner/Admin",
    message_type: "image",
    body: caption,
    media_label: mediaId,
    is_price_list: true,
    status: statusForSend(result),
    approved_by_staff: true,
    raw_payload: result,
    created_at: now,
  })
}

export async function sendWhatsappPriceListBroadcast({
  supabase,
  profile,
  input,
}: {
  supabase: SupabaseClient
  profile: CurrentProfile
  input: BroadcastPriceListInput
}): Promise<BroadcastPriceListResult> {
  const permissionError = assertCanBroadcast(profile)

  if (permissionError) {
    return {
      ok: false,
      error: permissionError,
      broadcast: null,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
    }
  }

  const inputError = validateBroadcastInput(input)

  if (inputError) {
    return {
      ok: false,
      error: inputError,
      broadcast: null,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
    }
  }

  const customerTypes = cleanCustomerTypes(input.customerTypes)
  const areas = cleanList(input.areas)
  const tags = cleanList(input.tags)
  const assignedStaffIds = cleanList(input.assignedStaffIds)
  const audience = audienceSummary({
    customerTypes,
    areas,
    tags,
    assignedStaffIds,
  })
  const customers = (await loadBroadcastCustomers(supabase)).filter((customer) =>
    matchesFilter(customer, {
      ...input,
      customerTypes,
      areas,
      tags,
      assignedStaffIds,
    })
  )

  if (customers.length === 0) {
    return {
      ok: false,
      error: "No customers match these broadcast filters.",
      broadcast: null,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
    }
  }

  const now = new Date().toISOString()
  const broadcastResult = await supabase
    .from("crm_broadcasts")
    .insert({
      title: cleanText(input.title),
      image_label: cleanText(input.imageLabel),
      audience_summary: audience,
      filters: {
        customerTypes,
        areas,
        tags,
        assignedStaffIds,
      },
      status: "Sent",
      recipient_count: customers.length,
      created_by: profile.id,
      approved_by: profile.id,
      sent_at: now,
    })
    .select("*")
    .single()

  if (broadcastResult.error) {
    return {
      ok: false,
      error: errorText(broadcastResult.error),
      broadcast: null,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
    }
  }

  const broadcastId = readString(asRecord(broadcastResult.data).id)
  let sentCount = 0
  let skippedCount = 0
  let failedCount = 0
  const mediaId = cleanText(input.imageMediaId)
  const caption = cleanText(input.caption) || cleanText(input.title)

  for (const customer of customers) {
    const sendResult = customer.whatsappPhoneNumberId
      ? await sendWhatsAppMediaMessage({
          phoneNumberId: customer.whatsappPhoneNumberId,
          to: customer.phone,
          mediaId,
          type: "image",
          caption,
        })
      : {
          ok: false,
          skipped: true,
          error: "WhatsApp phone number ID is missing.",
        }
    const recipientStatus = recipientStatusForSend(sendResult)

    if (recipientStatus === "SENT") sentCount += 1
    if (recipientStatus === "SKIPPED") skippedCount += 1
    if (recipientStatus === "FAILED") failedCount += 1

    await Promise.all([
      supabase.from("crm_broadcast_recipients").insert({
        broadcast_id: broadcastId,
        customer_id: customer.id,
        status: recipientStatus,
        sent_at: recipientStatus === "SENT" ? new Date().toISOString() : null,
        error_message: sendResult.error ?? null,
      }),
      storeBroadcastMessage({
        supabase,
        profile,
        customer,
        mediaId,
        caption,
        result: sendResult,
      }),
    ])
  }

  await supabase.from("crm_audit_logs").insert({
    actor_id: profile.id,
    action: "WHATSAPP_PRICE_LIST_BROADCAST",
    table_name: "crm_broadcasts",
    record_id: broadcastId,
    detail: {
      recipient_count: customers.length,
      sent_count: sentCount,
      skipped_count: skippedCount,
      failed_count: failedCount,
      filters: {
        customerTypes,
        areas,
        tags,
        assignedStaffIds,
      },
    },
  })

  return {
    ok: failedCount === 0,
    error: failedCount > 0 ? "Some broadcast recipients failed." : null,
    broadcast: mapBroadcastFromRow(
      asRecord(broadcastResult.data),
      customers.length,
      audience
    ),
    sentCount,
    skippedCount,
    failedCount,
  }
}
