export const crmOrderStatuses = [
  "New Order",
  "Confirmed",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
  "Failed",
  "Cancelled",
] as const

export type CrmOrderStatus = (typeof crmOrderStatuses)[number]

export type CrmRoleMode = "full" | "staff" | "account"

export type WhatsappAccount = {
  id: string
  displayName: string
  phoneNumber: string
  phoneNumberId: string
  status: "Connected" | "Needs setup" | "Paused"
}

export type CrmCustomer = {
  id: string
  name: string
  phone: string
  address: string
  customerType: "Retail" | "Wholesale" | "VIP"
  area: string
  tags: string[]
  remarks: string
  birthday: string | null
  companyName: string
  assignedStaff: string
  assignedStaffId: string | null
  lastOrderDate: string | null
  latestOrderStatus: CrmOrderStatus
  paymentReminderStatus: "None" | "Due soon" | "Overdue"
  unreadCount: number
  lastMessage: string
  lastMessageAt: string
  whatsappAccountId: string
  whatsappAccountName: string
  orderStatusBadge: CrmOrderStatus
  hasComplaint: boolean
  unreadTooLong: boolean
}

export type CrmCustomerProfileUpdate = Pick<
  CrmCustomer,
  | "id"
  | "name"
  | "phone"
  | "address"
  | "customerType"
  | "area"
  | "tags"
  | "remarks"
  | "birthday"
  | "companyName"
>

export type CrmMessageType = "text" | "image" | "file" | "audio" | "location"

export type CrmMessage = {
  id: string
  conversationId: string
  customerId: string
  direction: "inbound" | "outbound"
  senderName: string
  type: CrmMessageType
  body: string
  mediaLabel?: string
  isPriceList?: boolean
  createdAt: string
  status: "received" | "sent" | "delivered" | "read" | "failed"
  approvedByStaff?: boolean
}

export type CrmOrder = {
  id: string
  customerId: string
  product: string
  weightQuantity: string
  price: number
  fulfillment: "Delivery" | "Pickup"
  address: string
  date: string
  location: string
  remarks: string
  status: CrmOrderStatus
}

export type CrmOrderInput = {
  customerId?: string
  conversationId?: string | null
  product?: string
  weightQuantity?: string
  price?: number | string
  fulfillment?: CrmOrder["fulfillment"]
  address?: string
  date?: string
  location?: string
  remarks?: string
}

export type CrmOrderStatusUpdate = {
  orderId?: string
  status?: CrmOrderStatus
}

export type CrmAiSuggestion = {
  id: string
  customerId: string
  suggestion: string
  reason: string
  detectedOrderDetails?: {
    product: string
    weightQuantity: string
    fulfillment: CrmOrder["fulfillment"] | "Unknown"
    date: string
    location: string
    remarks: string
  }
  translations?: {
    english: string
    chinese: string
    iban: string
  }
  followUpRecommendation?: string
  source?: "openai" | "fallback"
}

export type CrmStaffResponseRanking = {
  staffId: string
  staffName: string
  averageResponseMinutes: number
  repliedCount: number
  underThirtyMinuteRate: number
  waitingCustomers: number
}

export type CrmDashboard = {
  customersWaitingCount: number
  averageResponseMinutes: number
  underThirtyMinuteRate: number
  newMessagesTodayCount: number
  unreadTooLongCount: number
  newOrdersTodayCount: number
  complaintCount: number
  staffResponseRanking: CrmStaffResponseRanking[]
}

export type CrmBroadcastDraft = {
  id: string
  title: string
  imageLabel: string
  audience: string
  status: "Draft" | "Needs owner/admin approval" | "Sent"
  recipientCount: number
}

export type CrmBroadcastFilterOptions = {
  customerTypes: CrmCustomer["customerType"][]
  areas: string[]
  tags: string[]
  assignedStaff: Array<{
    id: string
    name: string
  }>
}

export type CrmNotificationType =
  | "NEW_MESSAGE"
  | "UNREAD_30_MIN"
  | "NEW_ORDER"
  | "COMPLAINT"
  | "PAYMENT_REMINDER"
  | "ADMIN_QUEUE"

export type CrmNotificationAlert = {
  id: string
  customerId: string
  type: CrmNotificationType
  title: string
  body: string
  tone: "info" | "warning" | "destructive" | "success"
  createdAt: string
}

export type WhatsappCrmData = {
  demoMode: boolean
  roleMode: CrmRoleMode
  accounts: WhatsappAccount[]
  customers: CrmCustomer[]
  messages: CrmMessage[]
  orders: CrmOrder[]
  aiSuggestions: CrmAiSuggestion[]
  broadcasts: CrmBroadcastDraft[]
  broadcastFilters: CrmBroadcastFilterOptions
  notifications: CrmNotificationAlert[]
  dashboard: CrmDashboard
  canBroadcast: boolean
}
