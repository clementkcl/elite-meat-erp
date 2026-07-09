import type { SupabaseClient } from "@supabase/supabase-js"

import type { CurrentProfile } from "@/lib/auth/session"
import { asRecord, readNullableString, readString } from "@/lib/records"
import {
  sendWhatsAppMediaMessage,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp-crm/cloud-api"
import { assignCustomerToStaff } from "@/lib/whatsapp-crm/assignments"
import type { CrmMessage } from "@/lib/whatsapp-crm/types"

type SendReplyInput = {
  customerId?: string
  conversationId?: string | null
  type?: "text" | "image" | "file" | "audio" | "location"
  body?: string
  mediaId?: string
  caption?: string
  isPriceList?: boolean
}

type SendReplyResult = {
  ok: boolean
  skipped: boolean
  error: string | null
  message: CrmMessage | null
}

type StoredCustomer = {
  id: string
  phone: string
  name: string
  assignedStaffId: string | null
  whatsappAccountId: string
}

type StoredConversation = {
  id: string
}

type StoredWhatsappAccount = {
  id: string
  phoneNumberId: string
}

type WhatsAppSendResult = {
  ok?: boolean
  skipped?: boolean
  status?: number
  body?: unknown
  error?: string | null
}

const replyRoles = [
  "owner",
  "sales",
  "sales_staff",
  "customer_service",
  "admin",
  "director",
]

const globalRoles = ["owner", "admin", "director"]

function hasAnyRole(profile: CurrentProfile, roles: string[]) {
  return profile.roles.some((role) => roles.includes(role))
}

function errorText(value: unknown) {
  const error = asRecord(value)

  return readString(error.message, "Unknown WhatsApp send error")
}

function statusForResult(result: WhatsAppSendResult): CrmMessage["status"] {
  return result.ok ? "sent" : "failed"
}

function messageTypeForInput(type: SendReplyInput["type"]): CrmMessage["type"] {
  if (
    type === "image" ||
    type === "file" ||
    type === "audio" ||
    type === "location"
  ) {
    return type
  }

  return "text"
}

function phoneNumberForWhatsApp(value: string) {
  return value.replace(/\D/g, "")
}

function externalMessageIdFromResult(result: WhatsAppSendResult) {
  const body = asRecord(result.body)
  const messages = Array.isArray(body.messages) ? body.messages.map(asRecord) : []

  return readNullableString(messages[0]?.id)
}

function friendlySendError(result: WhatsAppSendResult) {
  if (result.error) {
    const parsed = (() => {
      try {
        return asRecord(JSON.parse(result.error ?? "{}"))
      } catch {
        return {}
      }
    })()
    const error = asRecord(parsed.error)
    const message = readString(error.message, result.error)

    if (message) return message
  }

  return result.ok ? null : "WhatsApp message could not be delivered."
}

function crmMessageFromRow(row: Record<string, unknown>): CrmMessage {
  return {
    id: readString(row.id),
    conversationId: readString(row.conversation_id),
    customerId: readString(row.customer_id),
    direction:
      readString(row.direction, "outbound") === "inbound" ? "inbound" : "outbound",
    senderName: readString(row.sender_name, "Staff"),
    type: messageTypeForInput(readString(row.message_type, "text") as SendReplyInput["type"]),
    body: readString(row.body),
    mediaLabel: readNullableString(row.media_label) ?? undefined,
    isPriceList: row.is_price_list === true,
    createdAt: readString(row.created_at, new Date().toISOString()),
    status: readString(row.status, "sent") as CrmMessage["status"],
    approvedByStaff: row.approved_by_staff === true,
  }
}

async function loadCustomer(
  supabase: SupabaseClient,
  customerId: string
): Promise<StoredCustomer> {
  const result = await supabase
    .from("crm_customers")
    .select("id, phone, name, assigned_staff_id, whatsapp_account_id")
    .eq("id", customerId)
    .single()

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  const row = asRecord(result.data)

  return {
    id: readString(row.id),
    phone: readString(row.phone),
    name: readString(row.name, "Customer"),
    assignedStaffId: readNullableString(row.assigned_staff_id),
    whatsappAccountId: readString(row.whatsapp_account_id),
  }
}

async function loadWhatsappAccount(
  supabase: SupabaseClient,
  accountId: string
): Promise<StoredWhatsappAccount> {
  const result = await supabase
    .from("whatsapp_accounts")
    .select("id, phone_number_id")
    .eq("id", accountId)
    .single()

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  const row = asRecord(result.data)

  return {
    id: readString(row.id),
    phoneNumberId: readString(row.phone_number_id),
  }
}

async function loadOrCreateConversation(
  supabase: SupabaseClient,
  inputConversationId: string | null | undefined,
  customer: StoredCustomer
): Promise<StoredConversation> {
  if (inputConversationId) {
    const existing = await supabase
      .from("crm_conversations")
      .select("id")
      .eq("id", inputConversationId)
      .eq("customer_id", customer.id)
      .maybeSingle()

    if (existing.error) {
      throw new Error(errorText(existing.error))
    }

    if (existing.data) {
      return { id: readString(asRecord(existing.data).id) }
    }
  }

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
    return { id: readString(asRecord(latest.data).id) }
  }

  const inserted = await supabase
    .from("crm_conversations")
    .insert({
      customer_id: customer.id,
      whatsapp_account_id: customer.whatsappAccountId,
      status: "OPEN",
      assigned_staff_id: customer.assignedStaffId,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (inserted.error) {
    throw new Error(errorText(inserted.error))
  }

  return { id: readString(asRecord(inserted.data).id) }
}

function assertCanReply(profile: CurrentProfile, customer: StoredCustomer) {
  if (!hasAnyRole(profile, replyRoles)) {
    return "This role cannot send WhatsApp replies."
  }

  if (hasAnyRole(profile, globalRoles)) {
    return null
  }

  if (customer.assignedStaffId === profile.id) {
    return null
  }

  return "You can only reply to customers assigned to you."
}

async function sendViaWhatsApp(
  account: StoredWhatsappAccount,
  customer: StoredCustomer,
  input: Required<Pick<SendReplyInput, "type">> & SendReplyInput
): Promise<WhatsAppSendResult> {
  if (input.type === "text") {
    return sendWhatsAppTextMessage({
      phoneNumberId: account.phoneNumberId,
      to: phoneNumberForWhatsApp(customer.phone),
      body: input.body ?? "",
    })
  }

  if (input.type === "location") {
    return {
      ok: false,
      skipped: false,
      error: "Live WhatsApp location sending is not supported yet.",
    }
  }

  return sendWhatsAppMediaMessage({
    phoneNumberId: account.phoneNumberId,
    to: phoneNumberForWhatsApp(customer.phone),
    mediaId: input.mediaId ?? "",
    type: input.type === "file" ? "document" : input.type,
    caption: input.caption,
  })
}

async function insertOutboundMessage(
  supabase: SupabaseClient,
  profile: CurrentProfile,
  customer: StoredCustomer,
  account: StoredWhatsappAccount,
  conversation: StoredConversation,
  input: Required<Pick<SendReplyInput, "type">> & SendReplyInput,
  result: WhatsAppSendResult
) {
  const now = new Date().toISOString()
  const body = input.body ?? input.caption ?? ""
  const externalMessageId = externalMessageIdFromResult(result)
  const inserted = await supabase
    .from("crm_messages")
    .insert({
      conversation_id: conversation.id,
      customer_id: customer.id,
      external_message_id: externalMessageId,
      whatsapp_phone_number_id: account.phoneNumberId,
      customer_phone: customer.phone,
      direction: "outbound",
      sender_name: profile.fullName || profile.email || "Staff",
      message_type: input.type,
      body,
      media_label: input.mediaId ?? null,
      is_price_list: input.isPriceList === true,
      status: statusForResult(result),
      approved_by_staff: true,
      raw_payload: {
        send_result: result,
        failed_reason: friendlySendError(result),
      },
      created_at: now,
    })
    .select("*")
    .single()

  if (inserted.error) {
    throw new Error(errorText(inserted.error))
  }

  if (result.ok) {
    const assignedStaffId = customer.assignedStaffId ?? profile.id
    await Promise.all([
      supabase
        .from("crm_customers")
        .update({
          last_message: body,
          last_message_at: now,
          unread_count: 0,
          minutes_since_last_inbound: 0,
          assigned_staff_id: assignedStaffId,
        })
        .eq("id", customer.id),
      supabase
        .from("crm_conversations")
        .update({
          last_message_at: now,
          assigned_staff_id: assignedStaffId,
        })
        .eq("id", conversation.id),
      customer.assignedStaffId
        ? Promise.resolve()
        : assignCustomerToStaff({
            supabase,
            customerId: customer.id,
            staffId: profile.id,
            reason: "staff_reply",
          }),
      supabase.from("crm_audit_logs").insert({
        actor_id: profile.id,
        action: "WHATSAPP_OUTBOUND_MESSAGE",
        table_name: "crm_messages",
        record_id: readString(asRecord(inserted.data).id),
        detail: {
          customer_id: customer.id,
          conversation_id: conversation.id,
          message_type: input.type,
          whatsapp_status: result.status ?? null,
          skipped: result.skipped === true,
        },
      }),
    ])
  }

  return crmMessageFromRow(asRecord(inserted.data))
}

export async function sendApprovedWhatsappReply({
  supabase,
  profile,
  input,
}: {
  supabase: SupabaseClient
  profile: CurrentProfile
  input: SendReplyInput
}): Promise<SendReplyResult> {
  const type = input.type ?? "text"
  const body = input.body?.trim() ?? ""

  if (!input.customerId) {
    return {
      ok: false,
      skipped: false,
      error: "Customer is required.",
      message: null,
    }
  }

  if (type === "text" && body.length === 0) {
    return {
      ok: false,
      skipped: false,
      error: "Reply message is required.",
      message: null,
    }
  }

  if (type !== "text" && type !== "location" && !input.mediaId) {
    return {
      ok: false,
      skipped: false,
      error: "Media ID is required.",
      message: null,
    }
  }

  const customer = await loadCustomer(supabase, input.customerId)
  const permissionError = assertCanReply(profile, customer)

  if (permissionError) {
    return {
      ok: false,
      skipped: false,
      error: permissionError,
      message: null,
    }
  }

  const account = await loadWhatsappAccount(supabase, customer.whatsappAccountId)
  const conversation = await loadOrCreateConversation(
    supabase,
    input.conversationId,
    customer
  )
  const sendResult = await sendViaWhatsApp(account, customer, {
    ...input,
    type,
    body,
  })
  const message = await insertOutboundMessage(
    supabase,
    profile,
    customer,
    account,
    conversation,
    {
      ...input,
      type,
      body,
    },
    sendResult
  )
  const error = friendlySendError(sendResult)

  return {
    ok: sendResult.ok === true,
    skipped: sendResult.skipped === true,
    error,
    message,
  }
}
