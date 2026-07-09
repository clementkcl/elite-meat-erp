import { whatsappCrmDemoData } from "@/data/mock/whatsapp-crm"
import { requireCurrentProfile } from "@/lib/auth/session"
import { isSupabaseConfigured } from "@/lib/env"
import {
  asRecord,
  asRecordArray,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
} from "@/lib/records"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { buildWhatsappCrmDashboard } from "@/lib/whatsapp-crm/dashboard"
import {
  buildDerivedCustomerAlerts,
  notificationFromRow,
} from "@/lib/whatsapp-crm/notifications"
import type {
  CrmAiSuggestion,
  CrmBroadcastDraft,
  CrmBroadcastFilterOptions,
  CrmCustomer,
  CrmMessage,
  CrmNotificationAlert,
  CrmOrder,
  CrmOrderStatus,
  CrmRoleMode,
  WhatsappAccount,
  WhatsappCrmData,
} from "@/lib/whatsapp-crm/types"

function roleModeForProfile(roles: string[]): CrmRoleMode {
  if (
    roles.some((role) => role === "owner" || role === "admin" || role === "director")
  ) {
    return "full"
  }

  if (roles.includes("account")) {
    return "account"
  }

  return "staff"
}

function canSeeAllCustomers(roles: string[]) {
  return roles.some((role) => role === "owner" || role === "admin" || role === "director")
}

function canSendCrmBroadcastForProfile(roles: string[]) {
  return roles.some((role) => role === "owner" || role === "admin")
}

function statusText(value: string): CrmOrderStatus {
  const normalized = value.replaceAll("_", " ").toLowerCase()
  const statuses: CrmOrderStatus[] = [
    "New Order",
    "Confirmed",
    "Preparing",
    "Ready for Pickup",
    "Out for Delivery",
    "Completed",
    "Failed",
    "Cancelled",
  ]

  return (
    statuses.find((status) => status.toLowerCase() === normalized) ??
    "New Order"
  )
}

function minutesSince(value: string) {
  const timestamp = new Date(value).getTime()

  if (!Number.isFinite(timestamp)) return 0

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
}

function accountRowsToAccounts(rows: Record<string, unknown>[]): WhatsappAccount[] {
  return rows.map((row) => ({
    id: readString(row.id),
    displayName: readString(row.display_name, "WhatsApp number"),
    phoneNumber: readString(row.phone_number),
    phoneNumberId: readString(row.phone_number_id),
    status: readBoolean(row.is_active, true) ? "Connected" : "Paused",
  }))
}

function mapCustomers(
  rows: Record<string, unknown>[],
  accounts: WhatsappAccount[],
  profileNames: Map<string, string>,
  roleMode: CrmRoleMode,
  currentUserId: string,
  canSeeAll: boolean
): CrmCustomer[] {
  const filteredRows =
    canSeeAll || roleMode === "account"
      ? rows
      : rows.filter((row) => readNullableString(row.assigned_staff_id) === currentUserId)

  return filteredRows.map((row) => {
    const accountId = readString(row.whatsapp_account_id)
    const account = accounts.find((item) => item.id === accountId)
    const assignedStaffId = readNullableString(row.assigned_staff_id)
    const unreadCount = readNumber(row.unread_count)
    const lastMessageAt = readString(row.last_message_at, new Date().toISOString())
    const minutesSinceLastInbound = Math.max(
      readNumber(row.minutes_since_last_inbound),
      minutesSince(lastMessageAt)
    )
    const hasComplaint = readBoolean(row.has_open_complaint)
    const latestOrderStatus = statusText(readString(row.latest_order_status, "New Order"))

    return {
      id: readString(row.id),
      name: readString(row.name, "Unknown customer"),
      phone: readString(row.phone),
      address: readString(row.address),
      customerType: readString(row.customer_type, "Retail") as CrmCustomer["customerType"],
      area: readString(row.area),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      remarks: readString(row.remarks),
      birthday: readNullableString(row.birthday),
      companyName: readString(row.company_name),
      assignedStaff: assignedStaffId
        ? profileNames.get(assignedStaffId) ?? "Assigned staff"
        : "Admin queue",
      assignedStaffId,
      lastOrderDate: readNullableString(row.last_order_date),
      latestOrderStatus,
      paymentReminderStatus: readString(
        row.payment_reminder_status,
        "None"
      ) as CrmCustomer["paymentReminderStatus"],
      unreadCount,
      lastMessage: readString(row.last_message),
      lastMessageAt,
      whatsappAccountId: accountId,
      whatsappAccountName: account?.displayName ?? "WhatsApp number",
      orderStatusBadge: latestOrderStatus,
      hasComplaint,
      unreadTooLong: unreadCount > 0 && minutesSinceLastInbound >= 30,
    }
  })
}

function mapMessages(rows: Record<string, unknown>[]): CrmMessage[] {
  return rows.map((row) => ({
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
  }))
}

function mapOrders(rows: Record<string, unknown>[]): CrmOrder[] {
  return rows.map((row) => ({
    id: readString(row.id),
    customerId: readString(row.customer_id),
    product: readString(row.product_name),
    weightQuantity: readString(row.weight_quantity),
    price: readNumber(row.price),
    fulfillment:
      readString(row.fulfillment, "Delivery") === "Pickup" ? "Pickup" : "Delivery",
    address: readString(row.address),
    date: readString(row.order_date),
    location: readString(row.location),
    remarks: readString(row.remarks),
    status: statusText(readString(row.status, "New Order")),
  }))
}

function parseAiSuggestionReason(row: Record<string, unknown>) {
  const value = readString(row.reason)

  try {
    return asRecord(JSON.parse(value || "{}"))
  } catch {
    return { reason: value }
  }
}

function aiSuggestionFromRow(row: Record<string, unknown>): CrmAiSuggestion {
  const meta = parseAiSuggestionReason(row)
  const detectedOrderDetails = asRecord(meta.detectedOrderDetails)
  const translations = asRecord(meta.translations)
  const reason = readString(meta.reason, readString(row.reason))

  return {
    id: readString(row.id),
    customerId: readString(row.customer_id),
    suggestion: readString(row.suggestion_text),
    reason,
    detectedOrderDetails: {
      product: readString(detectedOrderDetails.product),
      weightQuantity: readString(detectedOrderDetails.weightQuantity),
      fulfillment:
        readString(detectedOrderDetails.fulfillment) === "Pickup"
          ? "Pickup"
          : readString(detectedOrderDetails.fulfillment) === "Delivery"
            ? "Delivery"
            : "Unknown",
      date: readString(detectedOrderDetails.date),
      location: readString(detectedOrderDetails.location),
      remarks: readString(detectedOrderDetails.remarks),
    },
    translations: {
      english: readString(translations.english),
      chinese: readString(translations.chinese),
      iban: readString(translations.iban),
    },
    followUpRecommendation: readString(meta.followUpRecommendation),
    source: readString(meta.source) === "openai" ? "openai" : "fallback",
  }
}

function broadcastFiltersFromCustomers(customers: CrmCustomer[]): CrmBroadcastFilterOptions {
  const staffById = new Map<string, string>()

  for (const customer of customers) {
    if (customer.assignedStaffId) {
      staffById.set(customer.assignedStaffId, customer.assignedStaff)
    }
  }

  return {
    customerTypes: ["Retail", "Wholesale", "VIP"],
    areas: Array.from(new Set(customers.map((customer) => customer.area).filter(Boolean))).sort(),
    tags: Array.from(new Set(customers.flatMap((customer) => customer.tags))).sort(),
    assignedStaff: Array.from(staffById.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  }
}

function demoForRole(roleMode: CrmRoleMode): WhatsappCrmData {
  return {
    ...whatsappCrmDemoData,
    roleMode,
    canBroadcast: roleMode === "full",
    broadcasts:
      roleMode === "account" ? [] : whatsappCrmDemoData.broadcasts,
  }
}

export async function getWhatsappCrmData(): Promise<WhatsappCrmData> {
  const profile = await requireCurrentProfile()
  const roleMode = roleModeForProfile(profile.roles)
  const supabase = await createSupabaseServerClient()

  if (!supabase || !isSupabaseConfigured()) {
    return demoForRole(roleMode)
  }

  const [
    accountResult,
    customerResult,
    messageResult,
    orderResult,
    notificationResult,
    suggestionResult,
    broadcastResult,
    profileResult,
  ] = await Promise.all([
    supabase.from("whatsapp_accounts").select("*").order("display_name"),
    supabase.from("crm_customers").select("*").order("last_message_at", { ascending: false }),
    supabase.from("crm_messages").select("*").order("created_at"),
    supabase.from("crm_orders").select("*").order("created_at", { ascending: false }),
    supabase
      .from("crm_notifications")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase.from("crm_ai_suggestions").select("*").eq("status", "PENDING"),
    supabase.from("crm_broadcasts").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email"),
  ])

  const errors = [
    accountResult.error,
    customerResult.error,
    messageResult.error,
    orderResult.error,
    notificationResult.error,
    suggestionResult.error,
    broadcastResult.error,
    profileResult.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    return demoForRole(roleMode)
  }

  const accounts = accountRowsToAccounts(asRecordArray(accountResult.data))
  const profileNames = new Map(
    asRecordArray(profileResult.data).map((row) => [
      readString(row.id),
      readString(row.full_name, readString(row.email, "Staff")),
    ])
  )
  const customers = mapCustomers(
    asRecordArray(customerResult.data),
    accounts,
    profileNames,
    roleMode,
    profile.id,
    canSeeAllCustomers(profile.roles)
  )
  const visibleCustomerIds = new Set(customers.map((customer) => customer.id))
  const messages = mapMessages(asRecordArray(messageResult.data)).filter((message) =>
    visibleCustomerIds.has(message.customerId)
  )
  const orders = mapOrders(asRecordArray(orderResult.data)).filter((order) =>
    visibleCustomerIds.has(order.customerId)
  )
  const notificationRows = asRecordArray(notificationResult.data)
  const notifications: CrmNotificationAlert[] = [
    ...notificationRows
      .map(notificationFromRow)
      .filter((notification) => visibleCustomerIds.has(notification.customerId)),
    ...buildDerivedCustomerAlerts(customers),
  ]
  const aiSuggestions: CrmAiSuggestion[] = asRecordArray(suggestionResult.data)
    .map(aiSuggestionFromRow)
    .filter((suggestion) => visibleCustomerIds.has(suggestion.customerId))
  const broadcasts: CrmBroadcastDraft[] =
    roleMode === "account"
      ? []
      : asRecordArray(broadcastResult.data).map((row) => ({
          id: readString(row.id),
          title: readString(row.title),
          imageLabel: readString(row.image_label),
          audience: readString(row.audience_summary),
          status: readString(row.status, "Draft") as CrmBroadcastDraft["status"],
          recipientCount: readNumber(row.recipient_count),
        }))

  return {
    demoMode: false,
    roleMode,
    accounts,
    customers,
    messages,
    orders,
    aiSuggestions,
    broadcasts,
    broadcastFilters: broadcastFiltersFromCustomers(customers),
    notifications,
    dashboard: buildWhatsappCrmDashboard({ customers, messages, orders }),
    canBroadcast: canSendCrmBroadcastForProfile(profile.roles),
  }
}

export const whatsappCrmRoles = [
  "owner",
  "sales",
  "sales_staff",
  "customer_service",
  "account",
  "admin",
  "director",
] as const

export function canSendCrmBroadcast(roles: string[]) {
  return canSendCrmBroadcastForProfile(roles)
}
