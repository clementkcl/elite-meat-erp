import type { SupabaseClient } from "@supabase/supabase-js"

import { asRecord, readString } from "@/lib/records"
import type {
  CrmCustomer,
  CrmNotificationAlert,
  CrmNotificationType,
  CrmOrder,
} from "@/lib/whatsapp-crm/types"

type NotificationInput = {
  customerId: string
  type: CrmNotificationType
  title: string
  body: string
}

function errorText(value: unknown) {
  const error = asRecord(value)

  return readString(error.message, "Unknown WhatsApp CRM notification error")
}

export function notificationTone(
  type: CrmNotificationType
): CrmNotificationAlert["tone"] {
  if (type === "COMPLAINT" || type === "PAYMENT_REMINDER") return "destructive"
  if (type === "UNREAD_30_MIN" || type === "ADMIN_QUEUE") return "warning"
  if (type === "NEW_ORDER") return "success"

  return "info"
}

export async function createWhatsappCrmNotification({
  supabase,
  input,
}: {
  supabase: SupabaseClient
  input: NotificationInput
}) {
  const result = await supabase.from("crm_notifications").insert({
    customer_id: input.customerId,
    notification_type: input.type,
    title: input.title,
    body: input.body,
    is_read: false,
  })

  if (result.error) {
    throw new Error(errorText(result.error))
  }
}

export async function createInboundMessageNotifications({
  supabase,
  customerId,
  customerName,
  messageBody,
  hasComplaint,
}: {
  supabase: SupabaseClient
  customerId: string
  customerName: string
  messageBody: string
  hasComplaint: boolean
}) {
  const inserts = [
    createWhatsappCrmNotification({
      supabase,
      input: {
        customerId,
        type: "NEW_MESSAGE",
        title: "New WhatsApp message",
        body: `${customerName}: ${messageBody}`,
      },
    }),
  ]

  if (hasComplaint) {
    inserts.push(
      createWhatsappCrmNotification({
        supabase,
        input: {
          customerId,
          type: "COMPLAINT",
          title: "Complaint detected",
          body: `${customerName} may need urgent service follow-up.`,
        },
      })
    )
  }

  await Promise.all(inserts)
}

export async function createSimpleOrderNotification({
  supabase,
  order,
}: {
  supabase: SupabaseClient
  order: CrmOrder
}) {
  await createWhatsappCrmNotification({
    supabase,
    input: {
      customerId: order.customerId,
      type: "NEW_ORDER",
      title: "New simple order",
      body: `${order.product} - ${order.weightQuantity} (${order.fulfillment})`,
    },
  })
}

export function notificationFromRow(
  row: Record<string, unknown>
): CrmNotificationAlert {
  const type = readString(row.notification_type, "NEW_MESSAGE") as CrmNotificationType

  return {
    id: readString(row.id),
    customerId: readString(row.customer_id),
    type,
    title: readString(row.title, "CRM alert"),
    body: readString(row.body),
    tone: notificationTone(type),
    createdAt: readString(row.created_at, new Date().toISOString()),
  }
}

export function buildDerivedCustomerAlerts(
  customers: CrmCustomer[]
): CrmNotificationAlert[] {
  const now = new Date().toISOString()

  return customers.flatMap((customer) => {
    const alerts: CrmNotificationAlert[] = []

    if (customer.unreadTooLong) {
      alerts.push({
        id: `unread-30-${customer.id}`,
        customerId: customer.id,
        type: "UNREAD_30_MIN",
        title: "Unread over 30 minutes",
        body: `${customer.name} has waited more than 30 minutes.`,
        tone: notificationTone("UNREAD_30_MIN"),
        createdAt: customer.lastMessageAt,
      })
    }

    if (customer.paymentReminderStatus !== "None") {
      alerts.push({
        id: `payment-${customer.id}`,
        customerId: customer.id,
        type: "PAYMENT_REMINDER",
        title:
          customer.paymentReminderStatus === "Overdue"
            ? "Payment overdue"
            : "Payment reminder",
        body: `${customer.name}: ${customer.paymentReminderStatus}`,
        tone: notificationTone("PAYMENT_REMINDER"),
        createdAt: now,
      })
    }

    return alerts
  })
}
