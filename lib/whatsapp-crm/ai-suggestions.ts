import type { SupabaseClient } from "@supabase/supabase-js"

import type { CurrentProfile } from "@/lib/auth/session"
import {
  asRecord,
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import type {
  CrmAiSuggestion,
  CrmMessage,
  CrmOrder,
} from "@/lib/whatsapp-crm/types"

type GenerateSuggestionInput = {
  customerId?: string
  conversationId?: string | null
}

type StoredCustomer = {
  id: string
  name: string
  phone: string
  customerType: string
  area: string
  address: string
  tags: string[]
  assignedStaffId: string | null
  unreadCount: number
  hasComplaint: boolean
  paymentReminderStatus: string
}

type AiSuggestionDraft = {
  suggestion: string
  reason: string
  detectedOrderDetails: NonNullable<CrmAiSuggestion["detectedOrderDetails"]>
  translations: NonNullable<CrmAiSuggestion["translations"]>
  followUpRecommendation: string
  source: "openai" | "fallback"
}

type AiSuggestionResult = {
  ok: boolean
  error: string | null
  suggestion: CrmAiSuggestion | null
}

const aiSuggestionRoles = [
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

  return readString(error.message, "Unknown WhatsApp CRM AI suggestion error")
}

function assertCanSuggestReply(profile: CurrentProfile, customer: StoredCustomer) {
  if (!hasAnyRole(profile, aiSuggestionRoles)) {
    return "This role cannot request AI suggested replies."
  }

  if (hasAnyRole(profile, globalRoles)) {
    return null
  }

  if (customer.assignedStaffId === profile.id) {
    return null
  }

  return "You can only request AI suggestions for customers assigned to you."
}

function latestCustomerText(messages: CrmMessage[]) {
  return (
    [...messages]
      .reverse()
      .find((message) => message.direction === "inbound")
      ?.body.trim() ?? ""
  )
}

function hasChineseText(text: string) {
  return /[\u3400-\u9fff]/.test(text)
}

function hasLikelyIbanText(text: string) {
  const normalized = text.toLowerCase()

  return ["ukai", "nama", "minta", "berat", "barang", "enda", "berapa"].some(
    (word) => normalized.includes(word)
  )
}

function detectProduct(text: string) {
  const knownProducts = [
    "pork belly",
    "belly",
    "minced pork",
    "shoulder",
    "rib",
    "leg",
    "loin",
    "carton",
  ]
  const normalized = text.toLowerCase()

  return knownProducts.find((product) => normalized.includes(product)) ?? ""
}

function detectWeightQuantity(text: string) {
  const match = text.match(/\b\d+(?:\.\d+)?\s?(?:kg|kgs|kilogram|carton|cartons|ctn|pcs|pack|packs)\b/i)

  return match?.[0] ?? ""
}

function detectFulfillment(text: string): CrmOrder["fulfillment"] | "Unknown" {
  const normalized = text.toLowerCase()

  if (normalized.includes("pickup") || normalized.includes("collect")) return "Pickup"
  if (normalized.includes("delivery") || normalized.includes("send")) return "Delivery"

  return "Unknown"
}

function fallbackSuggestionForContext(
  customer: StoredCustomer,
  messages: CrmMessage[]
): AiSuggestionDraft {
  const latestText = latestCustomerText(messages)
  const product = detectProduct(latestText)
  const weightQuantity = detectWeightQuantity(latestText)
  const fulfillment = detectFulfillment(latestText)
  const hasOrderDetails = Boolean(product || weightQuantity)
  const languageNote = hasChineseText(latestText)
    ? "Chinese detected"
    : hasLikelyIbanText(latestText)
      ? "Iban/Malay-like wording detected"
      : "English/Malay detected"
  const suggestion = customer.hasComplaint
    ? "Sorry boss, we will check this now. Please keep the affected item aside and our staff will follow up with you before the next order."
    : hasOrderDetails
      ? "Sure boss, I will confirm the product, quantity, price, and delivery/pickup details here before creating the order."
      : "Sure boss, noted. I will check and update you shortly."
  const followUpRecommendation = customer.hasComplaint
    ? "Create an urgent complaint follow-up and keep the affected item/carton aside."
    : hasOrderDetails
      ? "Confirm missing price/address/date, then create a simple order from chat."
      : customer.unreadCount > 0
        ? "Reply now and add a follow-up if the customer needs confirmation later."
        : "No urgent follow-up detected."

  return {
    suggestion,
    reason: `${languageNote}. ${hasOrderDetails ? "Possible order details detected." : "No complete order details detected."}`,
    detectedOrderDetails: {
      product,
      weightQuantity,
      fulfillment,
      date: "",
      location: customer.area,
      remarks: latestText,
    },
    translations: {
      english: latestText || "No customer message to translate.",
      chinese: hasChineseText(latestText)
        ? latestText
        : "Please confirm using staff Chinese wording before sending.",
      iban: hasLikelyIbanText(latestText)
        ? latestText
        : "Please confirm using staff Iban wording before sending.",
    },
    followUpRecommendation,
    source: "fallback",
  }
}

function suggestionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "suggestion",
      "reason",
      "detectedOrderDetails",
      "translations",
      "followUpRecommendation",
    ],
    properties: {
      suggestion: { type: "string" },
      reason: { type: "string" },
      detectedOrderDetails: {
        type: "object",
        additionalProperties: false,
        required: ["product", "weightQuantity", "fulfillment", "date", "location", "remarks"],
        properties: {
          product: { type: "string" },
          weightQuantity: { type: "string" },
          fulfillment: { type: "string", enum: ["Delivery", "Pickup", "Unknown"] },
          date: { type: "string" },
          location: { type: "string" },
          remarks: { type: "string" },
        },
      },
      translations: {
        type: "object",
        additionalProperties: false,
        required: ["english", "chinese", "iban"],
        properties: {
          english: { type: "string" },
          chinese: { type: "string" },
          iban: { type: "string" },
        },
      },
      followUpRecommendation: { type: "string" },
    },
  }
}

function outputTextFromOpenAiResponse(response: unknown) {
  const root = asRecord(response)
  const outputText = readString(root.output_text)

  if (outputText) return outputText

  for (const outputItem of asRecordArray(root.output)) {
    for (const content of asRecordArray(outputItem.content)) {
      if (readString(content.type) === "output_text") {
        return readString(content.text)
      }
    }
  }

  return ""
}

async function generateWithOpenAi(
  customer: StoredCustomer,
  messages: CrmMessage[]
): Promise<AiSuggestionDraft | null> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) return null

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CRM_AI_MODEL ?? "gpt-5.2",
      instructions:
        "You help frozen meat CRM staff draft WhatsApp replies. Staff must approve before sending. Detect order details, translate customer meaning into English, Chinese, and Iban, and recommend follow-up. Keep the suggested reply concise, polite, and operational.",
      input: JSON.stringify({
        customer,
        recentMessages: messages.slice(-8),
      }),
      text: {
        format: {
          type: "json_schema",
          name: "whatsapp_crm_ai_suggestion",
          strict: true,
          schema: suggestionSchema(),
        },
      },
    }),
  })

  if (!response.ok) return null

  const text = outputTextFromOpenAiResponse(await response.json().catch(() => ({})))

  if (!text) return null

  const parsed = asRecord(JSON.parse(text))
  const order = asRecord(parsed.detectedOrderDetails)
  const translations = asRecord(parsed.translations)

  return {
    suggestion: readString(parsed.suggestion),
    reason: readString(parsed.reason),
    detectedOrderDetails: {
      product: readString(order.product),
      weightQuantity: readString(order.weightQuantity),
      fulfillment:
        readString(order.fulfillment) === "Delivery" ||
        readString(order.fulfillment) === "Pickup"
          ? (readString(order.fulfillment) as CrmOrder["fulfillment"])
          : "Unknown",
      date: readString(order.date),
      location: readString(order.location),
      remarks: readString(order.remarks),
    },
    translations: {
      english: readString(translations.english),
      chinese: readString(translations.chinese),
      iban: readString(translations.iban),
    },
    followUpRecommendation: readString(parsed.followUpRecommendation),
    source: "openai",
  }
}

function crmMessageFromRow(row: Record<string, unknown>): CrmMessage {
  return {
    id: readString(row.id),
    conversationId: readString(row.conversation_id),
    customerId: readString(row.customer_id),
    direction:
      readString(row.direction, "inbound") === "outbound" ? "outbound" : "inbound",
    senderName: readString(row.sender_name, "WhatsApp"),
    type:
      readString(row.message_type, "text") === "document"
        ? "file"
        : (readString(row.message_type, "text") as CrmMessage["type"]),
    body: readString(row.body),
    mediaLabel: readNullableString(row.media_label) ?? undefined,
    isPriceList: readBoolean(row.is_price_list),
    createdAt: readString(row.created_at, new Date().toISOString()),
    status: readString(row.status, "received") as CrmMessage["status"],
    approvedByStaff: readBoolean(row.approved_by_staff),
  }
}

function suggestionFromRow(
  row: Record<string, unknown>,
  draft: AiSuggestionDraft
): CrmAiSuggestion {
  return {
    id: readString(row.id),
    customerId: readString(row.customer_id),
    suggestion: readString(row.suggestion_text, draft.suggestion),
    reason: draft.reason,
    detectedOrderDetails: draft.detectedOrderDetails,
    translations: draft.translations,
    followUpRecommendation: draft.followUpRecommendation,
    source: draft.source,
  }
}

async function loadCustomer(
  supabase: SupabaseClient,
  customerId: string
): Promise<StoredCustomer> {
  const result = await supabase
    .from("crm_customers")
    .select(
      "id, name, phone, customer_type, area, address, tags, assigned_staff_id, unread_count, has_open_complaint, payment_reminder_status"
    )
    .eq("id", customerId)
    .single()

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  const row = asRecord(result.data)

  return {
    id: readString(row.id),
    name: readString(row.name, "Customer"),
    phone: readString(row.phone),
    customerType: readString(row.customer_type, "Retail"),
    area: readString(row.area),
    address: readString(row.address),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    assignedStaffId: readNullableString(row.assigned_staff_id),
    unreadCount: readNumber(row.unread_count),
    hasComplaint: readBoolean(row.has_open_complaint),
    paymentReminderStatus: readString(row.payment_reminder_status, "None"),
  }
}

async function loadRecentMessages(
  supabase: SupabaseClient,
  customerId: string
): Promise<CrmMessage[]> {
  const result = await supabase
    .from("crm_messages")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(12)

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  return asRecordArray(result.data).reverse().map(crmMessageFromRow)
}

export async function generateWhatsappCrmAiSuggestion({
  supabase,
  profile,
  input,
}: {
  supabase: SupabaseClient
  profile: CurrentProfile
  input: GenerateSuggestionInput
}): Promise<AiSuggestionResult> {
  if (!input.customerId) {
    return {
      ok: false,
      error: "Customer is required.",
      suggestion: null,
    }
  }

  const customer = await loadCustomer(supabase, input.customerId)
  const permissionError = assertCanSuggestReply(profile, customer)

  if (permissionError) {
    return {
      ok: false,
      error: permissionError,
      suggestion: null,
    }
  }

  const messages = await loadRecentMessages(supabase, customer.id)
  const draft =
    (await generateWithOpenAi(customer, messages).catch(() => null)) ??
    fallbackSuggestionForContext(customer, messages)
  const result = await supabase
    .from("crm_ai_suggestions")
    .insert({
      customer_id: customer.id,
      conversation_id: input.conversationId ?? null,
      suggestion_text: draft.suggestion,
      reason: JSON.stringify({
        reason: draft.reason,
        detectedOrderDetails: draft.detectedOrderDetails,
        translations: draft.translations,
        followUpRecommendation: draft.followUpRecommendation,
        source: draft.source,
      }),
      status: "PENDING",
    })
    .select("id, customer_id, suggestion_text")
    .single()

  if (result.error) {
    return {
      ok: false,
      error: errorText(result.error),
      suggestion: null,
    }
  }

  const suggestion = suggestionFromRow(asRecord(result.data), draft)

  await supabase.from("crm_audit_logs").insert({
    actor_id: profile.id,
    action: "WHATSAPP_AI_SUGGEST_REPLY",
    table_name: "crm_ai_suggestions",
    record_id: suggestion.id,
    detail: {
      customer_id: customer.id,
      source: draft.source,
      has_order_details: Boolean(
        draft.detectedOrderDetails.product ||
          draft.detectedOrderDetails.weightQuantity
      ),
    },
  })

  return {
    ok: true,
    error: null,
    suggestion,
  }
}
