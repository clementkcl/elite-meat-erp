import type {
  CrmCustomer,
  CrmDashboard,
  CrmMessage,
  CrmOrder,
  CrmStaffResponseRanking,
} from "@/lib/whatsapp-crm/types"

type DashboardInput = {
  customers: CrmCustomer[]
  messages: CrmMessage[]
  orders: CrmOrder[]
  now?: Date
}

type StaffResponseStats = {
  staffId: string
  staffName: string
  responseMinutes: number[]
  waitingCustomers: number
}

function minutesBetween(start: string, end: string) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null

  return Math.max(0, Math.floor((endTime - startTime) / 60_000))
}

function isSameDay(value: string, now: Date) {
  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) return false

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function average(values: number[]) {
  if (values.length === 0) return 0

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length)
}

function underThirtyRate(values: number[]) {
  if (values.length === 0) return 0

  const underThirty = values.filter((value) => value <= 30).length

  return Math.round((underThirty / values.length) * 100)
}

function staffKeyFromName(name: string) {
  return name.trim().toLowerCase() || "staff"
}

function getOrCreateStaff(
  staffStats: Map<string, StaffResponseStats>,
  staffId: string,
  staffName: string
) {
  const current = staffStats.get(staffId)

  if (current) return current

  const next = {
    staffId,
    staffName,
    responseMinutes: [],
    waitingCustomers: 0,
  }

  staffStats.set(staffId, next)

  return next
}

function buildStaffStats({
  customers,
  messages,
  now,
}: {
  customers: CrmCustomer[]
  messages: CrmMessage[]
  now: Date
}) {
  const staffStats = new Map<string, StaffResponseStats>()

  for (const customer of customers) {
    const staffId = customer.assignedStaffId ?? staffKeyFromName(customer.assignedStaff)
    const staffName = customer.assignedStaff || "Admin queue"
    const stats = getOrCreateStaff(staffStats, staffId, staffName)

    if (customer.unreadCount > 0) {
      stats.waitingCustomers += 1
    }
  }

  const pendingInboundByConversation = new Map<string, CrmMessage>()
  const sortedMessages = [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )

  for (const message of sortedMessages) {
    const conversationKey = message.conversationId || message.customerId

    if (message.direction === "inbound") {
      if (!pendingInboundByConversation.has(conversationKey)) {
        pendingInboundByConversation.set(conversationKey, message)
      }
      continue
    }

    const pendingInbound = pendingInboundByConversation.get(conversationKey)

    if (!pendingInbound) continue

    const responseMinutes = minutesBetween(
      pendingInbound.createdAt,
      message.createdAt
    )

    pendingInboundByConversation.delete(conversationKey)

    if (responseMinutes === null || !isSameDay(message.createdAt, now)) {
      continue
    }

    const staffName = message.senderName || "Staff"
    const stats = getOrCreateStaff(
      staffStats,
      staffKeyFromName(staffName),
      staffName
    )

    stats.responseMinutes.push(responseMinutes)
  }

  return staffStats
}

function rankStaff(
  staffStats: Map<string, StaffResponseStats>
): CrmStaffResponseRanking[] {
  return Array.from(staffStats.values())
    .map((staff) => ({
      staffId: staff.staffId,
      staffName: staff.staffName,
      averageResponseMinutes: average(staff.responseMinutes),
      repliedCount: staff.responseMinutes.length,
      underThirtyMinuteRate: underThirtyRate(staff.responseMinutes),
      waitingCustomers: staff.waitingCustomers,
    }))
    .sort((left, right) => {
      if (right.repliedCount !== left.repliedCount) {
        return right.repliedCount - left.repliedCount
      }

      if (left.averageResponseMinutes !== right.averageResponseMinutes) {
        return left.averageResponseMinutes - right.averageResponseMinutes
      }

      return left.staffName.localeCompare(right.staffName)
    })
}

export function buildWhatsappCrmDashboard({
  customers,
  messages,
  orders,
  now = new Date(),
}: DashboardInput): CrmDashboard {
  const staffStats = buildStaffStats({ customers, messages, now })
  const responseMinutes = Array.from(staffStats.values()).flatMap(
    (staff) => staff.responseMinutes
  )

  return {
    customersWaitingCount: customers.filter((customer) => customer.unreadCount > 0)
      .length,
    averageResponseMinutes: average(responseMinutes),
    underThirtyMinuteRate: underThirtyRate(responseMinutes),
    newMessagesTodayCount: messages.filter(
      (message) =>
        message.direction === "inbound" && isSameDay(message.createdAt, now)
    ).length,
    unreadTooLongCount: customers.filter((customer) => customer.unreadTooLong)
      .length,
    newOrdersTodayCount: orders.filter((order) => isSameDay(order.date, now)).length,
    complaintCount: customers.filter((customer) => customer.hasComplaint).length,
    staffResponseRanking: rankStaff(staffStats),
  }
}
