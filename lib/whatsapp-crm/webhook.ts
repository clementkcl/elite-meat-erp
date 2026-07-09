import type { SupabaseClient } from "@supabase/supabase-js"

import {
  assignCustomerToStaff,
  recordNewCustomerAssignment,
  resolveNewCustomerAssignment,
  resolvePreviousHandlingStaff,
} from "@/lib/whatsapp-crm/assignments"
import { createInboundMessageNotifications } from "@/lib/whatsapp-crm/notifications"

type JsonRecord = Record<string, unknown>

type NormalizedInboundMessage = {
  externalMessageId: string | null
  phoneNumberId: string
  displayPhoneNumber: string
  customerPhone: string
  senderName: string
  messageType: "text" | "image" | "file" | "audio" | "location"
  body: string
  mediaLabel: string | null
  rawPayload: JsonRecord
  createdAt: string
  hasComplaint: boolean
}

type NormalizedMessageStatus = {
  externalMessageId: string | null
  phoneNumberId: string
  status: "sent" | "delivered" | "read" | "failed"
  rawPayload: JsonRecord
  failedReason: string | null
}

type StoredCustomer = {
  id: string
  name: string
  assignedStaffId: string | null
}

type StoredConversation = {
  id: string
}

type StoredWhatsappAccount = {
  id: string
  displayName: string
}

export type WhatsappWebhookProcessResult = {
  received: boolean
  rawStored: number
  stored: number
  statusesUpdated: number
  skippedDuplicates: number
  errors: string[]
}

const complaintKeywords = [
  "bad smell",
  "broken",
  "complain",
  "complaint",
  "damage",
  "damaged",
  "leaking",
  "reject",
  "return",
  "rotten",
  "smell",
  "spoiled",
  "wrong item",
  "bau",
  "busuk",
  "rosak",
  "salah barang",
]

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function readBoolean(value: unknown) {
  return value === true
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "")

  if (digits.startsWith("00")) return digits.slice(2)

  return digits
}

function errorText(value: unknown) {
  const error = asRecord(value)

  return readString(error.message, "Unknown WhatsApp webhook error")
}

export function detectWhatsappComplaint(text: string) {
  const normalized = text.toLowerCase()

  return complaintKeywords.some((keyword) => normalized.includes(keyword))
}

function contactNameForMessage(contacts: unknown[], from: string) {
  const match = contacts
    .map(asRecord)
    .find((contact) => readString(contact.wa_id) === from)
  const profile = asRecord(match?.profile)

  return readString(profile.name, from || "Customer")
}

function createdAtForMessage(message: JsonRecord) {
  const timestamp = Number(readString(message.timestamp))

  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp * 1000).toISOString()
    : new Date().toISOString()
}

function messageTypeForMessage(message: JsonRecord): NormalizedInboundMessage["messageType"] {
  const type = readString(message.type, "text")

  if (type === "image" || type === "audio" || type === "location") {
    return type
  }

  if (type === "document" || type === "file") {
    return "file"
  }

  return "text"
}

function bodyForMessage(message: JsonRecord) {
  const type = readString(message.type, "text")
  const text = asRecord(message.text)
  const image = asRecord(message.image)
  const document = asRecord(message.document)
  const location = asRecord(message.location)

  if (type === "text") return readString(text.body)
  if (type === "image") return readString(image.caption, "Image received")
  if (type === "document") {
    return (
      readString(document.caption) ||
      readString(document.filename, "File received")
    )
  }
  if (type === "audio") return "Audio received"
  if (type === "location") {
    return (
      [location.name, location.address].map((value) => readString(value)).filter(Boolean).join(" - ") ||
      "Location received"
    )
  }

  return `Unsupported WhatsApp message type: ${type || "unknown"}`
}

function mediaLabelForMessage(message: JsonRecord) {
  const type = readString(message.type, "text")
  const image = asRecord(message.image)
  const document = asRecord(message.document)
  const audio = asRecord(message.audio)
  const location = asRecord(message.location)

  if (type === "image") return readNullableString(image.id)
  if (type === "document") {
    return readNullableString(document.filename) ?? readNullableString(document.id)
  }
  if (type === "audio") return readNullableString(audio.id)
  if (type === "location") {
    const latitude = Number(location.latitude)
    const longitude = Number(location.longitude)

    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `${latitude}, ${longitude}`
      : null
  }

  return null
}

function statusForWebhookStatus(status: JsonRecord): NormalizedMessageStatus["status"] {
  const value = readString(status.status, "sent")

  if (value === "delivered" || value === "read" || value === "failed") return value

  return "sent"
}

function failedReasonForStatus(status: JsonRecord) {
  const errors = asArray(status.errors).map(asRecord)
  const firstError = errors[0]

  if (!firstError) return null

  const title = readString(firstError.title)
  const message = readString(firstError.message)
  const code = readString(firstError.code)

  return [code, title, message].filter(Boolean).join(" - ") || null
}

export function normalizeWhatsappWebhookPayload(
  payload: unknown
): NormalizedInboundMessage[] {
  return asArray(asRecord(payload).entry).flatMap((entry) =>
    asArray(asRecord(entry).changes).flatMap((change) => {
      const value = asRecord(asRecord(change).value)
      const metadata = asRecord(value.metadata)
      const phoneNumberId = readString(metadata.phone_number_id)
      const displayPhoneNumber = readString(metadata.display_phone_number, phoneNumberId)
      const contacts = asArray(value.contacts)

      return asArray(value.messages).map((rawMessage) => {
        const message = asRecord(rawMessage)
        const rawCustomerPhone = readString(message.from)
        const customerPhone = normalizePhoneNumber(rawCustomerPhone)
        const body = bodyForMessage(message)

        return {
          externalMessageId: readNullableString(message.id),
          phoneNumberId,
          displayPhoneNumber,
          customerPhone,
          senderName: contactNameForMessage(contacts, rawCustomerPhone),
          messageType: messageTypeForMessage(message),
          body,
          mediaLabel: mediaLabelForMessage(message),
          rawPayload: message,
          createdAt: createdAtForMessage(message),
          hasComplaint: detectWhatsappComplaint(body),
        }
      })
    })
  )
}

export function normalizeWhatsappStatusPayload(
  payload: unknown
): NormalizedMessageStatus[] {
  return asArray(asRecord(payload).entry).flatMap((entry) =>
    asArray(asRecord(entry).changes).flatMap((change) => {
      const value = asRecord(asRecord(change).value)
      const metadata = asRecord(value.metadata)
      const phoneNumberId = readString(metadata.phone_number_id)

      return asArray(value.statuses).map((rawStatus) => {
        const status = asRecord(rawStatus)

        return {
          externalMessageId: readNullableString(status.id),
          phoneNumberId,
          status: statusForWebhookStatus(status),
          rawPayload: status,
          failedReason: failedReasonForStatus(status),
        }
      })
    })
  )
}

async function storeRawWebhookMessage(
  supabase: SupabaseClient,
  message: NormalizedInboundMessage
) {
  const result = await supabase
    .from("crm_webhook_inbox")
    .insert({
      external_message_id: message.externalMessageId,
      whatsapp_phone_number_id: message.phoneNumberId,
      customer_phone: message.customerPhone,
      direction: "inbound",
      sender_name: message.senderName,
      message_type: message.messageType,
      body: message.body,
      media_label: message.mediaLabel,
      is_price_list: false,
      status: "received",
      raw_payload: message.rawPayload,
      created_at: message.createdAt,
    })
    .select("id")
    .single()

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  return readString(asRecord(result.data).id)
}

async function messageAlreadyStored(
  supabase: SupabaseClient,
  externalMessageId: string | null
) {
  if (!externalMessageId) return false

  const result = await supabase
    .from("crm_messages")
    .select("id")
    .eq("external_message_id", externalMessageId)
    .maybeSingle()

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  return Boolean(result.data)
}

async function ensureWhatsappAccount(
  supabase: SupabaseClient,
  message: NormalizedInboundMessage
): Promise<StoredWhatsappAccount> {
  const existing = await supabase
    .from("whatsapp_accounts")
    .select("id, display_name")
    .eq("phone_number_id", message.phoneNumberId)
    .maybeSingle()

  if (existing.error) {
    throw new Error(errorText(existing.error))
  }

  if (existing.data) {
    const row = asRecord(existing.data)

    return {
      id: readString(row.id),
      displayName: readString(row.display_name, "WhatsApp number"),
    }
  }

  const displayName = message.displayPhoneNumber
    ? `WhatsApp ${message.displayPhoneNumber}`
    : `WhatsApp ${message.phoneNumberId}`
  const inserted = await supabase
    .from("whatsapp_accounts")
    .insert({
      display_name: displayName,
      phone_number: message.displayPhoneNumber || message.phoneNumberId,
      phone_number_id: message.phoneNumberId,
      is_active: true,
    })
    .select("id, display_name")
    .single()

  if (inserted.error) {
    const retry = await supabase
      .from("whatsapp_accounts")
      .select("id, display_name")
      .eq("phone_number_id", message.phoneNumberId)
      .single()

    if (retry.error) {
      throw new Error(errorText(inserted.error))
    }

    const row = asRecord(retry.data)

    return {
      id: readString(row.id),
      displayName: readString(row.display_name, "WhatsApp number"),
    }
  }

  const row = asRecord(inserted.data)

  return {
    id: readString(row.id),
    displayName: readString(row.display_name, "WhatsApp number"),
  }
}

async function ensureCrmCustomer(
  supabase: SupabaseClient,
  account: StoredWhatsappAccount,
  message: NormalizedInboundMessage
): Promise<StoredCustomer> {
  const phoneMatches = Array.from(
    new Set([
      message.customerPhone,
      `+${message.customerPhone}`,
      message.customerPhone.startsWith("0")
        ? message.customerPhone.slice(1)
        : message.customerPhone,
    ].filter(Boolean))
  )
  const existing = await supabase
    .from("crm_customers")
    .select("id, name, unread_count, has_open_complaint, assigned_staff_id")
    .eq("whatsapp_account_id", account.id)
    .in("phone", phoneMatches)
    .limit(1)
    .maybeSingle()

  if (existing.error) {
    throw new Error(errorText(existing.error))
  }

  if (existing.data) {
    const row = asRecord(existing.data)
    const customerId = readString(row.id)
    const currentAssignedStaffId = readNullableString(row.assigned_staff_id)
    const assignment = await resolvePreviousHandlingStaff({
      supabase,
      customerId,
      currentAssignedStaffId,
    })

    if (
      assignment.assignedStaffId &&
      assignment.source === "previous_assignment"
    ) {
      await assignCustomerToStaff({
        supabase,
        customerId,
        staffId: assignment.assignedStaffId,
        reason: "previous_handler",
      })
    }

    const update = await supabase
      .from("crm_customers")
      .update({
        name:
          readString(row.name) === message.customerPhone
            ? message.senderName
            : readString(row.name),
        last_message: message.body,
        last_message_at: message.createdAt,
        unread_count: readNumber(row.unread_count) + 1,
        minutes_since_last_inbound: 0,
        has_open_complaint:
          readBoolean(row.has_open_complaint) || message.hasComplaint,
        whatsapp_account_id: account.id,
        assigned_staff_id: assignment.assignedStaffId,
      })
      .eq("id", customerId)

    if (update.error) {
      throw new Error(errorText(update.error))
    }

    return {
      id: customerId,
      name:
        readString(row.name) === message.customerPhone
          ? message.senderName
          : readString(row.name, message.senderName),
      assignedStaffId: assignment.assignedStaffId,
    }
  }

  const assignment = resolveNewCustomerAssignment()
  const inserted = await supabase
    .from("crm_customers")
    .insert({
      whatsapp_account_id: account.id,
      name: message.senderName || message.customerPhone,
      phone: message.customerPhone,
      address: "",
      customer_type: "Retail",
      area: "",
      tags: [],
      remarks: "",
      company_name: "",
      latest_order_status: "New Order",
      payment_reminder_status: "None",
      unread_count: 1,
      minutes_since_last_inbound: 0,
      last_message: message.body,
      last_message_at: message.createdAt,
      has_open_complaint: message.hasComplaint,
      assigned_staff_id: assignment.assignedStaffId,
      is_active: true,
    })
    .select("id, assigned_staff_id")
    .single()

  if (inserted.error) {
    throw new Error(errorText(inserted.error))
  }

  const row = asRecord(inserted.data)
  const customerId = readString(row.id)

  await recordNewCustomerAssignment({
    supabase,
    customerId,
    assignment,
  })

  return {
    id: customerId,
    name: message.senderName || message.customerPhone,
    assignedStaffId: readNullableString(row.assigned_staff_id),
  }
}

async function ensureCrmConversation(
  supabase: SupabaseClient,
  account: StoredWhatsappAccount,
  customer: StoredCustomer,
  message: NormalizedInboundMessage
): Promise<StoredConversation> {
  const existing = await supabase
    .from("crm_conversations")
    .select("id, assigned_staff_id")
    .eq("customer_id", customer.id)
    .in("status", ["OPEN", "PENDING"])
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing.error) {
    throw new Error(errorText(existing.error))
  }

  if (existing.data) {
    const row = asRecord(existing.data)
    const conversationId = readString(row.id)
    const update = await supabase
      .from("crm_conversations")
      .update({
        whatsapp_account_id: account.id,
        assigned_staff_id:
          readNullableString(row.assigned_staff_id) ?? customer.assignedStaffId,
        last_message_at: message.createdAt,
      })
      .eq("id", conversationId)

    if (update.error) {
      throw new Error(errorText(update.error))
    }

    return { id: conversationId }
  }

  const inserted = await supabase
    .from("crm_conversations")
    .insert({
      customer_id: customer.id,
      whatsapp_account_id: account.id,
      status: "OPEN",
      assigned_staff_id: customer.assignedStaffId,
      last_message_at: message.createdAt,
    })
    .select("id")
    .single()

  if (inserted.error) {
    throw new Error(errorText(inserted.error))
  }

  return { id: readString(asRecord(inserted.data).id) }
}

async function insertCrmMessage(
  supabase: SupabaseClient,
  customer: StoredCustomer,
  conversation: StoredConversation,
  message: NormalizedInboundMessage
) {
  const inserted = await supabase
    .from("crm_messages")
    .insert({
      conversation_id: conversation.id,
      customer_id: customer.id,
      external_message_id: message.externalMessageId,
      whatsapp_phone_number_id: message.phoneNumberId,
      customer_phone: message.customerPhone,
      direction: "inbound",
      sender_name: message.senderName,
      message_type: message.messageType,
      body: message.body,
      media_label: message.mediaLabel,
      is_price_list: false,
      status: "received",
      approved_by_staff: false,
      raw_payload: message.rawPayload,
      created_at: message.createdAt,
    })
    .select("id")
    .single()

  if (inserted.error) {
    throw new Error(errorText(inserted.error))
  }

  return readString(asRecord(inserted.data).id)
}

async function markRawWebhookProcessed(supabase: SupabaseClient, rawId: string) {
  if (!rawId) return

  await supabase
    .from("crm_webhook_inbox")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", rawId)
}

async function insertAuditLog(
  supabase: SupabaseClient,
  messageId: string,
  customer: StoredCustomer,
  conversation: StoredConversation,
  inboundMessage: NormalizedInboundMessage
) {
  await supabase.from("crm_audit_logs").insert({
    action: "WHATSAPP_INBOUND_MESSAGE",
    table_name: "crm_messages",
    record_id: messageId,
    detail: {
      customer_id: customer.id,
      conversation_id: conversation.id,
      customer_phone: inboundMessage.customerPhone,
      whatsapp_phone_number_id: inboundMessage.phoneNumberId,
      message_type: inboundMessage.messageType,
      has_complaint: inboundMessage.hasComplaint,
    },
  })
}

async function updateMessageStatus(
  supabase: SupabaseClient,
  status: NormalizedMessageStatus
) {
  if (!status.externalMessageId) return false

  const result = await supabase
    .from("crm_messages")
    .update({
      status: status.status,
      raw_payload: {
        webhook_status: status.rawPayload,
        failed_reason: status.failedReason,
      },
    })
    .eq("external_message_id", status.externalMessageId)
    .select("id")
    .maybeSingle()

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  return Boolean(result.data)
}

export async function processWhatsappWebhookPayload(
  supabase: SupabaseClient,
  payload: unknown
): Promise<WhatsappWebhookProcessResult> {
  const messages = normalizeWhatsappWebhookPayload(payload)
  const statuses = normalizeWhatsappStatusPayload(payload)
  const result: WhatsappWebhookProcessResult = {
    received: true,
    rawStored: 0,
    stored: 0,
    statusesUpdated: 0,
    skippedDuplicates: 0,
    errors: [],
  }

  for (const status of statuses) {
    try {
      if (await updateMessageStatus(supabase, status)) {
        result.statusesUpdated += 1
      }
    } catch (error) {
      result.errors.push(errorText(error))
    }
  }

  for (const message of messages) {
    let rawId = ""

    try {
      rawId = await storeRawWebhookMessage(supabase, message)
      result.rawStored += 1

      if (!message.phoneNumberId || !message.customerPhone) {
        result.errors.push("Missing phone number ID or customer phone.")
        continue
      }

      if (await messageAlreadyStored(supabase, message.externalMessageId)) {
        result.skippedDuplicates += 1
        await markRawWebhookProcessed(supabase, rawId)
        continue
      }

      const account = await ensureWhatsappAccount(supabase, message)
      const customer = await ensureCrmCustomer(supabase, account, message)
      const conversation = await ensureCrmConversation(
        supabase,
        account,
        customer,
        message
      )
      const messageId = await insertCrmMessage(
        supabase,
        customer,
        conversation,
        message
      )

      await markRawWebhookProcessed(supabase, rawId)
      await insertAuditLog(supabase, messageId, customer, conversation, message)
      await createInboundMessageNotifications({
        supabase,
        customerId: customer.id,
        customerName: customer.name,
        messageBody: message.body,
        hasComplaint: message.hasComplaint,
      })
      result.stored += 1
    } catch (error) {
      result.errors.push(errorText(error))
    }
  }

  return result
}
