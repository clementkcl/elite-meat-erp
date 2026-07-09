"use client"

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Bot,
  CalendarDays,
  Check,
  Clock,
  File,
  ImageIcon,
  MapPin,
  Megaphone,
  Mic,
  PackagePlus,
  Paperclip,
  Pencil,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { buildWhatsappCrmDashboard } from "@/lib/whatsapp-crm/dashboard"
import {
  crmOrderStatuses,
  type CrmAiSuggestion,
  type CrmCustomer,
  type CrmCustomerProfileUpdate,
  type CrmBroadcastDraft,
  type CrmMessage,
  type CrmNotificationAlert,
  type CrmOrder,
  type CrmOrderStatus,
  type CrmDashboard,
  type WhatsappCrmData,
} from "@/lib/whatsapp-crm/types"

type MobilePane = "list" | "chat" | "profile"

type CustomerProfileForm = {
  name: string
  phone: string
  address: string
  customerType: CrmCustomer["customerType"]
  area: string
  tagsText: string
  remarks: string
  birthday: string
  companyName: string
}

const statusTone: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
  "New Order": "secondary",
  Confirmed: "secondary",
  Preparing: "warning",
  "Ready for Pickup": "success",
  "Out for Delivery": "warning",
  Completed: "success",
  Failed: "destructive",
  Cancelled: "destructive",
}

type SimpleOrderFormState = {
  product: string
  weightQuantity: string
  price: string
  fulfillment: CrmOrder["fulfillment"]
  address: string
  date: string
  location: string
  remarks: string
}

type BroadcastPriceListFormState = {
  title: string
  imageMediaId: string
  imageLabel: string
  caption: string
  customerTypes: CrmCustomer["customerType"][]
  areas: string[]
  tags: string[]
  assignedStaffIds: string[]
}

const customerTypeOptions: CrmCustomer["customerType"][] = [
  "Retail",
  "Wholesale",
  "VIP",
]

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : "-"
}

function money(value: number) {
  return `RM ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)

  return (parts[0]?.[0] ?? "C") + (parts[1]?.[0] ?? "")
}

function profileFormFromCustomer(customer: CrmCustomer): CustomerProfileForm {
  return {
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    customerType: customer.customerType,
    area: customer.area,
    tagsText: customer.tags.join(", "),
    remarks: customer.remarks,
    birthday: customer.birthday ?? "",
    companyName: customer.companyName,
  }
}

function todayText() {
  return new Date().toISOString().slice(0, 10)
}

function simpleOrderFormFromCustomer(customer: CrmCustomer): SimpleOrderFormState {
  return {
    product: "",
    weightQuantity: "",
    price: "",
    fulfillment: "Delivery",
    address: customer.address,
    date: todayText(),
    location: customer.area,
    remarks: "",
  }
}

function statusOptionsForOrder(order: CrmOrder): CrmOrderStatus[] {
  const flow =
    order.fulfillment === "Pickup"
      ? ["New Order", "Confirmed", "Preparing", "Ready for Pickup", "Completed"]
      : ["New Order", "Confirmed", "Preparing", "Out for Delivery", "Completed"]
  const options = [...flow, "Failed", "Cancelled"]

  return crmOrderStatuses.filter((status) => options.includes(status))
}

function tagsFromText(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  )
}

function emptyBroadcastForm(): BroadcastPriceListFormState {
  return {
    title: "Image price list",
    imageMediaId: "",
    imageLabel: "",
    caption: "Latest image price list",
    customerTypes: [],
    areas: [],
    tags: [],
    assignedStaffIds: [],
  }
}

function toggleListValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function MessageTypeIcon({ type }: { type: CrmMessage["type"] }) {
  if (type === "image") return <ImageIcon className="size-3" />
  if (type === "file") return <File className="size-3" />
  if (type === "audio") return <Mic className="size-3" />
  if (type === "location") return <MapPin className="size-3" />
  return null
}

function notificationToneClass(tone: CrmNotificationAlert["tone"]) {
  if (tone === "destructive") {
    return "border-red-200 bg-red-50 text-red-950"
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-950"
  }

  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-950"
  }

  return "border-sky-200 bg-sky-50 text-sky-950"
}

function notificationLabel(type: CrmNotificationAlert["type"]) {
  if (type === "NEW_MESSAGE") return "Message"
  if (type === "UNREAD_30_MIN") return "30 min"
  if (type === "NEW_ORDER") return "Order"
  if (type === "COMPLAINT") return "Complaint"
  if (type === "PAYMENT_REMINDER") return "Payment"

  return "Queue"
}

function NotificationAlerts({
  notifications,
  onSelectCustomer,
}: {
  notifications: CrmNotificationAlert[]
  onSelectCustomer: (customerId: string) => void
}) {
  if (notifications.length === 0) {
    return null
  }

  const visibleNotifications = notifications.slice(0, 6)

  return (
    <section className="rounded-md border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4" />
          Alerts
        </div>
        <Badge variant="secondary">{notifications.length}</Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {visibleNotifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => onSelectCustomer(notification.customerId)}
            className={cn(
              "min-h-20 rounded-md border p-3 text-left transition-colors hover:bg-muted/60",
              notificationToneClass(notification.tone)
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 text-sm font-semibold">
                {notification.title}
              </div>
              <Badge variant="outline" className="shrink-0 bg-white/65 text-[10px]">
                {notificationLabel(notification.type)}
              </Badge>
            </div>
            <div className="mt-1 line-clamp-2 text-xs">{notification.body}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

function BroadcastFilterCheckbox({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label className="flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-4"
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  )
}

function BroadcastPriceListPanel({
  canBroadcast,
  data,
  onBroadcastSaved,
}: {
  canBroadcast: boolean
  data: WhatsappCrmData
  onBroadcastSaved: (broadcast: CrmBroadcastDraft) => void
}) {
  const [form, setForm] = useState(() => emptyBroadcastForm())
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState<{
    tone: "success" | "warning" | "destructive"
    text: string
  } | null>(null)

  function updateField<Field extends keyof BroadcastPriceListFormState>(
    field: Field,
    value: BroadcastPriceListFormState[Field]
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSendBroadcast() {
    if (!canBroadcast || isSending) return

    if (!form.title.trim() || !form.imageMediaId.trim() || !form.imageLabel.trim()) {
      setFeedback({
        tone: "destructive",
        text: "Title, image media ID, and image label are required.",
      })
      return
    }

    setIsSending(true)
    setFeedback(null)

    try {
      const response = await fetch("/api/whatsapp/broadcasts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string | null
        broadcast?: CrmBroadcastDraft | null
        sentCount?: number
        skippedCount?: number
        failedCount?: number
      }

      if (result.broadcast) {
        onBroadcastSaved(result.broadcast)
      }

      if (response.ok && result.broadcast) {
        setForm(emptyBroadcastForm())
        setFeedback({
          tone: result.ok ? "success" : "warning",
          text: `Broadcast queued for ${result.broadcast.recipientCount} recipients. Sent ${result.sentCount ?? 0}, skipped ${result.skippedCount ?? 0}, failed ${result.failedCount ?? 0}.`,
        })
      } else {
        setFeedback({
          tone: "destructive",
          text: result.error ?? "Broadcast price list could not be sent.",
        })
      }
    } catch {
      setFeedback({
        tone: "destructive",
        text: "Broadcast price list could not be sent. Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="rounded-md border bg-card p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Megaphone className="size-4" />
          Broadcast image price list
        </div>
        <Badge variant={canBroadcast ? "success" : "secondary"}>
          Owner/admin
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="crm-broadcast-title">Title</Label>
          <Input
            id="crm-broadcast-title"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            disabled={!canBroadcast || isSending}
            className="min-h-10 text-base md:text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="crm-broadcast-image-label">Image label</Label>
          <Input
            id="crm-broadcast-image-label"
            value={form.imageLabel}
            onChange={(event) => updateField("imageLabel", event.target.value)}
            disabled={!canBroadcast || isSending}
            placeholder="price-list-week-26.png"
            className="min-h-10 text-base md:text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="crm-broadcast-media-id">WhatsApp image media ID</Label>
          <Input
            id="crm-broadcast-media-id"
            value={form.imageMediaId}
            onChange={(event) => updateField("imageMediaId", event.target.value)}
            disabled={!canBroadcast || isSending}
            className="min-h-10 text-base md:text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="crm-broadcast-caption">Caption</Label>
          <Input
            id="crm-broadcast-caption"
            value={form.caption}
            onChange={(event) => updateField("caption", event.target.value)}
            disabled={!canBroadcast || isSending}
            className="min-h-10 text-base md:text-sm"
          />
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-4">
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            Customer type
          </div>
          <div className="grid gap-1.5">
            {data.broadcastFilters.customerTypes.map((type) => (
              <BroadcastFilterCheckbox
                key={type}
                label={type}
                checked={form.customerTypes.includes(type)}
                onToggle={() =>
                  updateField(
                    "customerTypes",
                    toggleListValue(form.customerTypes, type) as CrmCustomer["customerType"][]
                  )
                }
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Area</div>
          <div className="grid max-h-40 gap-1.5 overflow-y-auto pr-1">
            {data.broadcastFilters.areas.map((area) => (
              <BroadcastFilterCheckbox
                key={area}
                label={area}
                checked={form.areas.includes(area)}
                onToggle={() => updateField("areas", toggleListValue(form.areas, area))}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Tags</div>
          <div className="grid max-h-40 gap-1.5 overflow-y-auto pr-1">
            {data.broadcastFilters.tags.map((tag) => (
              <BroadcastFilterCheckbox
                key={tag}
                label={tag}
                checked={form.tags.includes(tag)}
                onToggle={() => updateField("tags", toggleListValue(form.tags, tag))}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            Assigned staff
          </div>
          <div className="grid max-h-40 gap-1.5 overflow-y-auto pr-1">
            {data.broadcastFilters.assignedStaff.map((staff) => (
              <BroadcastFilterCheckbox
                key={staff.id}
                label={staff.name}
                checked={form.assignedStaffIds.includes(staff.id)}
                onToggle={() =>
                  updateField(
                    "assignedStaffIds",
                    toggleListValue(form.assignedStaffIds, staff.id)
                  )
                }
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="min-h-11"
          disabled={!canBroadcast || isSending}
          onClick={handleSendBroadcast}
        >
          <ImageIcon className="size-4" />
          {isSending ? "Sending" : "Send image price list"}
        </Button>
        {!canBroadcast ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <AlertTriangle className="size-4" />
            Broadcast sending is owner/admin only.
          </div>
        ) : null}
      </div>
      {feedback ? (
        <div
          className={cn(
            "mt-3 rounded-md border px-3 py-2 text-sm",
            feedback.tone === "success" &&
              "border-emerald-200 bg-emerald-50 text-emerald-900",
            feedback.tone === "warning" &&
              "border-amber-200 bg-amber-50 text-amber-900",
            feedback.tone === "destructive" &&
              "border-red-200 bg-red-50 text-red-900"
          )}
          aria-live="polite"
        >
          {feedback.text}
        </div>
      ) : null}
    </section>
  )
}

function CustomerRow({
  customer,
  active,
  onSelect,
}: {
  customer: CrmCustomer
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "grid min-h-24 w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60 lg:min-h-[5.75rem] lg:px-2.5",
        active && "bg-emerald-50/70"
      )}
    >
      <div className="relative">
        <div className="grid size-11 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
          {initials(customer.name)}
        </div>
        {customer.unreadCount > 0 ? (
          <span
            aria-label={`${customer.unreadCount} unread messages`}
            className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white ring-2 ring-card"
          >
            {customer.unreadCount}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-sm font-semibold">{customer.name}</div>
          {customer.hasComplaint ? (
            <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
              Complaint
            </Badge>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {customer.phone} - {customer.whatsappAccountName}
        </div>
        <div className="mt-1 truncate text-sm text-muted-foreground">
          {customer.lastMessage}
        </div>
        <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground min-[430px]:grid-cols-2">
          <div className="flex min-w-0 items-center gap-1">
            <UserRound className="size-3 shrink-0" />
            <span className="truncate">Staff: {customer.assignedStaff}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <CalendarDays className="size-3 shrink-0" />
            <span className="truncate">
              Last order: {formatDate(customer.lastOrderDate)}
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {customer.customerType}
          </Badge>
          <Badge variant={statusTone[customer.orderStatusBadge] ?? "secondary"} className="text-[10px]">
            {customer.orderStatusBadge}
          </Badge>
          {customer.unreadTooLong ? (
            <Badge variant="warning" className="text-[10px]">
              30 min
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="text-xs text-muted-foreground">
          {formatTime(customer.lastMessageAt)}
        </div>
        <div className="rounded-md bg-muted px-1.5 py-1 text-[10px] font-medium text-muted-foreground">
          {customer.whatsappAccountName}
        </div>
      </div>
    </button>
  )
}

function CustomerList({
  customers,
  selectedId,
  onSelect,
}: {
  customers: CrmCustomer[]
  selectedId: string
  onSelect: (customerId: string) => void
}) {
  const [query, setQuery] = useState("")
  const unreadTotal = customers.reduce(
    (total, customer) => total + customer.unreadCount,
    0
  )
  const filtered = customers.filter((customer) => {
    const text =
      `${customer.name} ${customer.phone} ${customer.area} ${customer.assignedStaff} ${customer.orderStatusBadge} ${customer.lastOrderDate ?? ""} ${customer.tags.join(" ")}`.toLowerCase()

    return text.includes(query.toLowerCase())
  })

  return (
    <section className="min-h-[calc(100vh-11rem)] overflow-hidden rounded-md border bg-card lg:min-h-[36rem] xl:h-[calc(100vh-18rem)]">
      <div className="border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Customers</div>
            <div className="text-xs text-muted-foreground">
              Unread, staff, last order, and order status.
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary">{filtered.length}</Badge>
            {unreadTotal > 0 ? (
              <Badge variant="success">{unreadTotal} unread</Badge>
            ) : null}
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, phone, area, tag"
            className="h-10 pl-9 text-base md:text-sm"
            inputMode="search"
          />
        </div>
      </div>
      <div className="max-h-[calc(100vh-18rem)] overflow-y-auto lg:max-h-[29rem] xl:max-h-[calc(100vh-25rem)]">
        {filtered.map((customer) => (
          <CustomerRow
            key={customer.id}
            customer={customer}
            active={customer.id === selectedId}
            onSelect={() => onSelect(customer.id)}
          />
        ))}
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {customers.length === 0
              ? "No CRM customers are available in your current scope."
              : "No customers match this search."}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function MessageContent({ message }: { message: CrmMessage }) {
  if (message.type === "image") {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "min-h-32 overflow-hidden rounded-md border border-black/10 bg-white/65",
            message.isPriceList && "border-emerald-300 bg-emerald-50/80"
          )}
        >
          <div className="grid aspect-[4/3] min-h-28 place-items-center bg-gradient-to-br from-white to-emerald-50 px-4 text-center">
            <div>
              <ImageIcon className="mx-auto size-8 text-emerald-700" />
              <div className="mt-2 text-xs font-medium">
                {message.isPriceList ? "Price list image" : "Image"}
              </div>
              {message.mediaLabel ? (
                <div className="mt-1 break-all text-[11px] text-muted-foreground">
                  {message.mediaLabel}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div>{message.body}</div>
      </div>
    )
  }

  if (message.type === "file") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-md border border-black/10 bg-white/65 p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-700">
            <File className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {message.mediaLabel ?? "Attached file"}
            </div>
            <div className="text-xs text-muted-foreground">{message.body}</div>
          </div>
        </div>
      </div>
    )
  }

  if (message.type === "audio") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-md border border-black/10 bg-white/65 p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Mic className="size-5" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {[10, 18, 28, 16, 24, 34, 20, 14, 26, 18].map((height, index) => (
              <span
                key={`${message.id}-wave-${index}`}
                className="w-1 rounded-full bg-emerald-700/70"
                style={{ height }}
              />
            ))}
          </div>
          <div className="shrink-0 text-xs text-muted-foreground">
            {message.mediaLabel ?? "Audio"}
          </div>
        </div>
        <div>{message.body}</div>
      </div>
    )
  }

  if (message.type === "location") {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-md border border-black/10 bg-white/65">
          <div className="grid min-h-24 place-items-center bg-emerald-50 px-4 text-center text-emerald-900">
            <div>
              <MapPin className="mx-auto size-7" />
              <div className="mt-2 text-xs font-medium">
                {message.mediaLabel ?? "Shared location"}
              </div>
            </div>
          </div>
          <div className="p-2 text-sm">{message.body}</div>
        </div>
      </div>
    )
  }

  return <div>{message.body}</div>
}

function MessageBubble({ message }: { message: CrmMessage }) {
  return (
    <div
      className={cn(
        "flex",
        message.direction === "outbound" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[86%] rounded-md px-3 py-2 text-sm shadow-xs sm:max-w-[72%]",
          message.direction === "outbound"
            ? "bg-emerald-100 text-emerald-950"
            : "bg-white text-foreground"
        )}
      >
        <div className="mb-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          <MessageTypeIcon type={message.type} />
          <span>{message.senderName}</span>
          {message.isPriceList ? (
            <Badge variant="success" className="px-1.5 py-0 text-[10px]">
              Price list
            </Badge>
          ) : null}
        </div>
        <MessageContent message={message} />
        <div
          className={cn(
            "mt-1 text-right text-[10px] text-muted-foreground",
            message.status === "failed" && "font-medium text-red-700"
          )}
        >
          {formatTime(message.createdAt)} -{" "}
          {message.status === "failed" ? "failed to send" : message.status}
        </div>
      </div>
    </div>
  )
}

function AiSuggestionPanel({
  suggestion,
  onUseDraft,
}: {
  suggestion: CrmAiSuggestion
  onUseDraft: (value: string) => void
}) {
  const details = suggestion.detectedOrderDetails
  const detailItems = details
    ? [
        ["Product", details.product],
        ["Weight/quantity", details.weightQuantity],
        ["Fulfillment", details.fulfillment],
        ["Date", details.date],
        ["Location", details.location],
      ].filter(([, value]) => value)
    : []
  const translations = suggestion.translations
    ? [
        ["English", suggestion.translations.english],
        ["Chinese", suggestion.translations.chinese],
        ["Iban", suggestion.translations.iban],
      ].filter(([, value]) => value)
    : []

  return (
    <div className="border-t bg-card p-3">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <Bot className="size-4" />
            AI suggested reply
          </div>
          <Badge variant="secondary" className="capitalize">
            {suggestion.source ?? "fallback"}
          </Badge>
        </div>
        <div className="mt-2 rounded-md bg-white/70 p-2 text-sm text-emerald-950">
          {suggestion.suggestion}
        </div>
        <div className="mt-2 text-xs text-emerald-900">
          {suggestion.reason}
        </div>
        {detailItems.length > 0 ? (
          <div className="mt-3 grid gap-1.5 text-xs min-[430px]:grid-cols-2">
            {detailItems.map(([label, value]) => (
              <div key={label} className="rounded-md bg-white/65 px-2 py-1.5">
                <div className="font-medium text-emerald-950">{label}</div>
                <div className="mt-0.5 text-emerald-900">{value}</div>
              </div>
            ))}
          </div>
        ) : null}
        {translations.length > 0 ? (
          <div className="mt-3 grid gap-1.5 text-xs">
            {translations.map(([label, value]) => (
              <div key={label} className="rounded-md bg-white/65 px-2 py-1.5">
                <div className="font-medium text-emerald-950">{label}</div>
                <div className="mt-0.5 whitespace-pre-wrap text-emerald-900">
                  {value}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {suggestion.followUpRecommendation ? (
          <div className="mt-3 rounded-md border border-emerald-200 bg-white/65 px-2 py-1.5 text-xs text-emerald-950">
            <span className="font-medium">Follow-up: </span>
            {suggestion.followUpRecommendation}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="min-h-9"
            onClick={() => onUseDraft(suggestion.suggestion)}
          >
            <Check className="size-4" />
            Use draft
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-9"
            onClick={() => onUseDraft(suggestion.suggestion)}
          >
            <Pencil className="size-4" />
            Edit first
          </Button>
          <div className="flex min-h-9 items-center rounded-md border bg-white/65 px-2 text-xs text-emerald-900">
            Staff approval required before sending.
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatPane({
  customer,
  messages,
  order,
  suggestion,
  canReply,
  canCreateOrder,
  canBroadcast,
  canEditProfile,
  onBack,
  onMessageSent,
  onCustomerUpdated,
  onOrderSaved,
  onAiSuggestionSaved,
  profileName,
}: {
  customer: CrmCustomer
  messages: CrmMessage[]
  order: CrmOrder | null
  suggestion: CrmAiSuggestion | null
  canReply: boolean
  canCreateOrder: boolean
  canBroadcast: boolean
  canEditProfile: boolean
  onBack: () => void
  onMessageSent: (message: CrmMessage) => void
  onCustomerUpdated: (customer: CrmCustomerProfileUpdate) => void
  onOrderSaved: (order: CrmOrder) => void
  onAiSuggestionSaved: (suggestion: CrmAiSuggestion) => void
  profileName: string
}) {
  const [draft, setDraft] = useState("")
  const [profileOpen, setProfileOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [sendFeedback, setSendFeedback] = useState<{
    tone: "success" | "warning" | "destructive"
    text: string
  } | null>(null)
  const [suggestFeedback, setSuggestFeedback] = useState<{
    tone: "success" | "warning" | "destructive"
    text: string
  } | null>(null)
  const activeConversationId = messages[messages.length - 1]?.conversationId ?? null

  async function handleSuggestReply() {
    if (!canReply || isSuggesting) return

    setIsSuggesting(true)
    setSuggestFeedback(null)

    try {
      const response = await fetch("/api/whatsapp/ai-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.id,
          conversationId: activeConversationId,
        }),
      })
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string | null
        suggestion?: CrmAiSuggestion | null
      }

      if (response.ok && result.suggestion) {
        onAiSuggestionSaved(result.suggestion)
        setSuggestFeedback({
          tone: "success",
          text: "Suggestion ready. Review it before sending.",
        })
      } else {
        setSuggestFeedback({
          tone: "destructive",
          text: result.error ?? "Suggested reply could not be generated.",
        })
      }
    } catch {
      setSuggestFeedback({
        tone: "destructive",
        text: "Suggested reply could not be generated. Please try again.",
      })
    } finally {
      setIsSuggesting(false)
    }
  }

  async function handleSendReply() {
    const body = draft.trim()

    if (!canReply || body.length === 0 || isSending) {
      return
    }

    setIsSending(true)
    setSendFeedback(null)

    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.id,
          conversationId: activeConversationId,
          type: "text",
          body,
        }),
      })
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        skipped?: boolean
        error?: string | null
        message?: CrmMessage | null
      }

      if (result.message) {
        onMessageSent(result.message)
        setDraft("")
      }

      if (result.ok) {
        setSendFeedback({ tone: "success", text: "Reply sent." })
      } else {
        setSendFeedback({
          tone: result.message ? "warning" : "destructive",
          text:
            result.error ??
            (response.ok
              ? "Reply was saved but WhatsApp delivery is not confirmed."
              : "Reply could not be sent."),
        })
      }
    } catch {
      setSendFeedback({
        tone: "destructive",
        text: "Reply could not be sent. Please check the connection and try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-md border bg-[#efe7dc] lg:min-h-[36rem] xl:h-[calc(100vh-18rem)]">
      <div className="flex min-h-14 items-center gap-2 border-b bg-card px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onBack}
          aria-label="Back to customers"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="grid size-9 place-items-center rounded-full bg-emerald-100 text-emerald-900">
          <UserRound className="size-4" />
        </div>
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="min-w-0 flex-1 text-left"
          aria-label="Open customer profile"
        >
          <div className="truncate text-sm font-semibold">{customer.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {customer.phone} - {customer.whatsappAccountName}
          </div>
        </button>
        {customer.hasComplaint ? (
          <Badge variant="destructive">Complaint</Badge>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {customer.unreadTooLong ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <Clock className="mt-0.5 size-4" />
            Unread for more than 30 minutes. Please reply or assign follow-up.
          </div>
        ) : null}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      {suggestion && canReply ? (
        <AiSuggestionPanel suggestion={suggestion} onUseDraft={setDraft} />
      ) : null}

      <div className="border-t bg-card p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          <Button
            id={`crm-chat-suggest-reply-${customer.id}`}
            type="button"
            variant="outline"
            size="sm"
            disabled={!canReply || isSuggesting}
            onClick={handleSuggestReply}
          >
            <Bot className="size-4" />
            {isSuggesting ? "Suggesting" : "Suggest Reply"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!canReply}>
            <ImageIcon className="size-4" />
            Price list image
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!canReply}>
            <Paperclip className="size-4" />
            File
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!canReply}>
            <MapPin className="size-4" />
            Location
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              canReply
                ? `Reply as ${profileName}`
                : "This role can view CRM information but cannot reply."
            }
            disabled={!canReply || isSending}
            className="min-h-11 resize-none text-base md:text-sm"
          />
          <Button
            type="button"
            size="icon-lg"
            className="min-h-11 min-w-11"
            disabled={!canReply || isSending || draft.trim().length === 0}
            onClick={handleSendReply}
            aria-label={isSending ? "Sending reply" : "Send reply"}
          >
            <Send className="size-4" />
          </Button>
        </div>
        {sendFeedback ? (
          <div
            className={cn(
              "mt-2 rounded-md border px-3 py-2 text-xs",
              sendFeedback.tone === "success" &&
                "border-emerald-200 bg-emerald-50 text-emerald-900",
              sendFeedback.tone === "warning" &&
                "border-amber-200 bg-amber-50 text-amber-900",
              sendFeedback.tone === "destructive" &&
                "border-red-200 bg-red-50 text-red-900"
            )}
            aria-live="polite"
          >
            {sendFeedback.text}
          </div>
        ) : null}
        {suggestFeedback ? (
          <div
            className={cn(
              "mt-2 rounded-md border px-3 py-2 text-xs",
              suggestFeedback.tone === "success" &&
                "border-emerald-200 bg-emerald-50 text-emerald-900",
              suggestFeedback.tone === "warning" &&
                "border-amber-200 bg-amber-50 text-amber-900",
              suggestFeedback.tone === "destructive" &&
                "border-red-200 bg-red-50 text-red-900"
            )}
            aria-live="polite"
          >
            {suggestFeedback.text}
          </div>
        ) : null}
        <div className="mt-1 text-xs text-muted-foreground">
          AI suggestions and staff drafts require staff approval before sending.
        </div>
      </div>
      <CustomerProfileDrawer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        customer={customer}
        order={order}
        canCreateOrder={canCreateOrder}
        canBroadcast={canBroadcast}
        canEditProfile={canEditProfile}
        onSuggestReply={() => {
          setProfileOpen(false)
          window.requestAnimationFrame(() => {
            document.getElementById(`crm-chat-suggest-reply-${customer.id}`)?.focus()
          })
        }}
        onCustomerUpdated={onCustomerUpdated}
        onOrderSaved={onOrderSaved}
      />
    </section>
  )
}

function ChatEmptyState({ customerCount }: { customerCount: number }) {
  return (
    <section className="hidden min-h-[36rem] flex-col overflow-hidden rounded-md border bg-[#efe7dc] lg:flex xl:h-[calc(100vh-18rem)]">
      <div className="flex min-h-14 items-center gap-2 border-b bg-card px-3">
        <div className="grid size-9 place-items-center rounded-full bg-emerald-100 text-emerald-900">
          <UserRound className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">Select a customer</div>
          <div className="text-xs text-muted-foreground">
            Choose a chat from the customer list to open the conversation.
          </div>
        </div>
      </div>
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div className="max-w-sm rounded-md border bg-card/90 p-5">
          <UserRound className="mx-auto size-8 text-emerald-700" />
          <div className="mt-3 text-sm font-semibold">
            {customerCount > 0 ? "No customer selected" : "No CRM customers yet"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {customerCount > 0
              ? "Pick a customer on the left to view WhatsApp messages, reply, create orders, and check follow-up details."
              : "Incoming WhatsApp conversations will appear here after setup and webhook processing."}
          </div>
        </div>
      </div>
    </section>
  )
}

function OrderStatusUpdater({
  order,
  canUpdateOrder,
  onOrderSaved,
}: {
  order: CrmOrder
  canUpdateOrder: boolean
  onOrderSaved: (order: CrmOrder) => void
}) {
  const [status, setStatus] = useState<CrmOrderStatus>(order.status)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    tone: "success" | "destructive"
    text: string
  } | null>(null)

  async function handleSaveStatus() {
    if (!canUpdateOrder || isSaving) return

    setIsSaving(true)
    setFeedback(null)

    try {
      const response = await fetch("/api/whatsapp/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          status,
        }),
      })
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string | null
        order?: CrmOrder | null
      }

      if (response.ok && result.order) {
        onOrderSaved(result.order)
        setStatus(result.order.status)
        setFeedback({ tone: "success", text: "Order status updated." })
      } else {
        setFeedback({
          tone: "destructive",
          text: result.error ?? "Order status could not be updated.",
        })
      }
    } catch {
      setFeedback({
        tone: "destructive",
        text: "Order status could not be updated. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mt-3 grid gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor={`crm-order-status-${order.id}`}>Update order status</Label>
        <select
          id={`crm-order-status-${order.id}`}
          value={status}
          onChange={(event) => setStatus(event.target.value as CrmOrderStatus)}
          disabled={!canUpdateOrder || isSaving}
          className="min-h-10 rounded-md border bg-background px-3 text-base md:text-sm"
        >
          {statusOptionsForOrder(order).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-10"
        onClick={handleSaveStatus}
        disabled={!canUpdateOrder || isSaving || status === order.status}
      >
        {isSaving ? "Saving" : "Save status"}
      </Button>
      {feedback ? (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs",
            feedback.tone === "success" &&
              "border-emerald-200 bg-emerald-50 text-emerald-900",
            feedback.tone === "destructive" &&
              "border-red-200 bg-red-50 text-red-900"
          )}
          aria-live="polite"
        >
          {feedback.text}
        </div>
      ) : null}
    </div>
  )
}

function OrderActionPanel({
  order,
  canUpdateOrder,
  onOrderSaved,
}: {
  order: CrmOrder | null
  canUpdateOrder: boolean
  onOrderSaved: (order: CrmOrder) => void
}) {
  if (!order) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">No order yet</div>
        <div className="mt-1">
          Create an order after the customer confirms product, quantity, price,
          and delivery or pickup details.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{order.product}</div>
          <div className="text-xs text-muted-foreground">
            {order.weightQuantity} - {order.fulfillment}
          </div>
        </div>
        <Badge variant={statusTone[order.status] ?? "secondary"}>
          {order.status}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Price</span>
          <span>{money(order.price)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Date</span>
          <span>{order.date}</span>
        </div>
        <div>
          <div className="text-muted-foreground">Address</div>
          <div>{order.address}</div>
        </div>
        {order.location || order.remarks ? (
          <div>
            <div className="text-muted-foreground">Location / remarks</div>
            <div>
              {[order.location, order.remarks].filter(Boolean).join(" - ")}
            </div>
          </div>
        ) : null}
      </div>
      <OrderStatusUpdater
        key={`${order.id}-${order.status}`}
        order={order}
        canUpdateOrder={canUpdateOrder}
        onOrderSaved={onOrderSaved}
      />
    </div>
  )
}

function SimpleOrderForm({
  customer,
  onOrderSaved,
  onCancel,
}: {
  customer: CrmCustomer
  onOrderSaved: (order: CrmOrder) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(() => simpleOrderFormFromCustomer(customer))
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    tone: "success" | "destructive"
    text: string
  } | null>(null)

  function updateField<Field extends keyof SimpleOrderFormState>(
    field: Field,
    value: SimpleOrderFormState[Field]
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleCreateOrder() {
    if (isSaving) return

    if (!form.product.trim() || !form.weightQuantity.trim()) {
      setFeedback({
        tone: "destructive",
        text: "Product and weight/quantity are required.",
      })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const response = await fetch("/api/whatsapp/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.id,
          product: form.product,
          weightQuantity: form.weightQuantity,
          price: form.price,
          fulfillment: form.fulfillment,
          address: form.address,
          date: form.date,
          location: form.location,
          remarks: form.remarks,
        }),
      })
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string | null
        order?: CrmOrder | null
      }

      if (response.ok && result.order) {
        onOrderSaved(result.order)
        setForm(simpleOrderFormFromCustomer(customer))
        setFeedback({ tone: "success", text: "Simple order created." })
        onCancel()
      } else {
        setFeedback({
          tone: "destructive",
          text: result.error ?? "Simple order could not be created.",
        })
      }
    } catch {
      setFeedback({
        tone: "destructive",
        text: "Simple order could not be created. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 text-sm font-semibold">Create simple order</div>
      <div className="grid gap-3 text-sm">
        <div className="grid gap-1.5">
          <Label htmlFor={`crm-order-product-${customer.id}`}>Product</Label>
          <Input
            id={`crm-order-product-${customer.id}`}
            value={form.product}
            onChange={(event) => updateField("product", event.target.value)}
            disabled={isSaving}
            className="min-h-10 text-base md:text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`crm-order-weight-${customer.id}`}>Weight/quantity</Label>
          <Input
            id={`crm-order-weight-${customer.id}`}
            value={form.weightQuantity}
            onChange={(event) => updateField("weightQuantity", event.target.value)}
            disabled={isSaving}
            placeholder="10 kg or 3 cartons"
            className="min-h-10 text-base md:text-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-order-price-${customer.id}`}>Price</Label>
            <Input
              id={`crm-order-price-${customer.id}`}
              value={form.price}
              onChange={(event) => updateField("price", event.target.value)}
              disabled={isSaving}
              inputMode="decimal"
              placeholder="0.00"
              className="min-h-10 text-base md:text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-order-fulfillment-${customer.id}`}>
              Delivery or pickup
            </Label>
            <select
              id={`crm-order-fulfillment-${customer.id}`}
              value={form.fulfillment}
              onChange={(event) =>
                updateField(
                  "fulfillment",
                  event.target.value as CrmOrder["fulfillment"]
                )
              }
              disabled={isSaving}
              className="min-h-10 rounded-md border bg-background px-3 text-base md:text-sm"
            >
              <option value="Delivery">Delivery</option>
              <option value="Pickup">Pickup</option>
            </select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`crm-order-address-${customer.id}`}>Address</Label>
          <Textarea
            id={`crm-order-address-${customer.id}`}
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            disabled={isSaving}
            className="min-h-20 resize-none text-base md:text-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-order-date-${customer.id}`}>Date</Label>
            <Input
              id={`crm-order-date-${customer.id}`}
              type="date"
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
              disabled={isSaving}
              className="min-h-10 text-base md:text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-order-location-${customer.id}`}>Location</Label>
            <Input
              id={`crm-order-location-${customer.id}`}
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              disabled={isSaving}
              className="min-h-10 text-base md:text-sm"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`crm-order-remarks-${customer.id}`}>Remarks</Label>
          <Textarea
            id={`crm-order-remarks-${customer.id}`}
            value={form.remarks}
            onChange={(event) => updateField("remarks", event.target.value)}
            disabled={isSaving}
            className="min-h-20 resize-none text-base md:text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            className="min-h-11"
            onClick={handleCreateOrder}
            disabled={isSaving}
          >
            <PackagePlus className="size-4" />
            {isSaving ? "Creating" : "Create order"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
        {feedback ? (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              feedback.tone === "success" &&
                "border-emerald-200 bg-emerald-50 text-emerald-900",
              feedback.tone === "destructive" &&
                "border-red-200 bg-red-50 text-red-900"
            )}
            aria-live="polite"
          >
            {feedback.text}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CustomerProfileContent({
  customer,
  order,
  canCreateOrder,
  canBroadcast,
  canEditProfile,
  onSuggestReply,
  onCustomerUpdated,
  onOrderSaved,
}: {
  customer: CrmCustomer
  order: CrmOrder | null
  canCreateOrder: boolean
  canBroadcast: boolean
  canEditProfile: boolean
  onSuggestReply: () => void
  onCustomerUpdated: (customer: CrmCustomerProfileUpdate) => void
  onOrderSaved: (order: CrmOrder) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [form, setForm] = useState(() => profileFormFromCustomer(customer))
  const [feedback, setFeedback] = useState<{
    tone: "success" | "warning" | "destructive"
    text: string
  } | null>(null)

  function updateField<Field extends keyof CustomerProfileForm>(
    field: Field,
    value: CustomerProfileForm[Field]
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSaveProfile() {
    if (isSaving) return

    if (!form.name.trim() || !form.phone.trim()) {
      setFeedback({
        tone: "destructive",
        text: "Name and phone are required.",
      })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const response = await fetch("/api/whatsapp/customer-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.id,
          name: form.name,
          phone: form.phone,
          address: form.address,
          customerType: form.customerType,
          area: form.area,
          tags: tagsFromText(form.tagsText),
          remarks: form.remarks,
          birthday: form.birthday || null,
          companyName: form.companyName,
        }),
      })
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string | null
        customer?: CrmCustomerProfileUpdate | null
      }

      if (response.ok && result.customer) {
        onCustomerUpdated(result.customer)
        setForm(profileFormFromCustomer({ ...customer, ...result.customer }))
        setIsEditing(false)
        setFeedback({ tone: "success", text: "Customer profile updated." })
      } else {
        setFeedback({
          tone: "destructive",
          text: result.error ?? "Customer profile could not be updated.",
        })
      }
    } catch {
      setFeedback({
        tone: "destructive",
        text: "Customer profile could not be updated. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-3">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">{customer.name}</div>
            <div className="text-sm text-muted-foreground">{customer.phone}</div>
          </div>
          {canEditProfile ? (
            isEditing ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cancel profile edit"
                onClick={() => {
                  setForm(profileFormFromCustomer(customer))
                  setIsEditing(false)
                  setFeedback(null)
                }}
                disabled={isSaving}
              >
                <X className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
            )
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="outline">{customer.customerType}</Badge>
          <Badge variant="secondary">{customer.area}</Badge>
          {customer.hasComplaint ? (
            <Badge variant="destructive">Complaint</Badge>
          ) : null}
        </div>
      </div>

      {feedback ? (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            feedback.tone === "success" &&
              "border-emerald-200 bg-emerald-50 text-emerald-900",
            feedback.tone === "warning" &&
              "border-amber-200 bg-amber-50 text-amber-900",
            feedback.tone === "destructive" &&
              "border-red-200 bg-red-50 text-red-900"
          )}
          aria-live="polite"
        >
          {feedback.text}
        </div>
      ) : null}

      {isEditing ? (
        <div className="grid gap-3 text-sm">
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-profile-name-${customer.id}`}>Name</Label>
            <Input
              id={`crm-profile-name-${customer.id}`}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              disabled={isSaving}
              className="min-h-10 text-base md:text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-profile-phone-${customer.id}`}>Phone</Label>
            <Input
              id={`crm-profile-phone-${customer.id}`}
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              disabled={isSaving}
              className="min-h-10 text-base md:text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-profile-company-${customer.id}`}>Company</Label>
            <Input
              id={`crm-profile-company-${customer.id}`}
              value={form.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
              disabled={isSaving}
              className="min-h-10 text-base md:text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`crm-profile-type-${customer.id}`}>Customer type</Label>
              <select
                id={`crm-profile-type-${customer.id}`}
                value={form.customerType}
                onChange={(event) =>
                  updateField(
                    "customerType",
                    event.target.value as CrmCustomer["customerType"]
                  )
                }
                disabled={isSaving}
                className="min-h-10 rounded-md border bg-background px-3 text-base md:text-sm"
              >
                {customerTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`crm-profile-birthday-${customer.id}`}>Birthday</Label>
              <Input
                id={`crm-profile-birthday-${customer.id}`}
                type="date"
                value={form.birthday}
                onChange={(event) => updateField("birthday", event.target.value)}
                disabled={isSaving}
                className="min-h-10 text-base md:text-sm"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-profile-area-${customer.id}`}>Area</Label>
            <Input
              id={`crm-profile-area-${customer.id}`}
              value={form.area}
              onChange={(event) => updateField("area", event.target.value)}
              disabled={isSaving}
              className="min-h-10 text-base md:text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-profile-address-${customer.id}`}>Address</Label>
            <Textarea
              id={`crm-profile-address-${customer.id}`}
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              disabled={isSaving}
              className="min-h-20 resize-none text-base md:text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-profile-tags-${customer.id}`}>Tags</Label>
            <Input
              id={`crm-profile-tags-${customer.id}`}
              value={form.tagsText}
              onChange={(event) => updateField("tagsText", event.target.value)}
              disabled={isSaving}
              placeholder="vip, weekly, delivery"
              className="min-h-10 text-base md:text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`crm-profile-remarks-${customer.id}`}>Remarks</Label>
            <Textarea
              id={`crm-profile-remarks-${customer.id}`}
              value={form.remarks}
              onChange={(event) => updateField("remarks", event.target.value)}
              disabled={isSaving}
              className="min-h-20 resize-none text-base md:text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              className="min-h-11"
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              <Check className="size-4" />
              {isSaving ? "Saving" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setForm(profileFormFromCustomer(customer))
                setIsEditing(false)
                setFeedback(null)
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Company</div>
            <div>{customer.companyName || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Address</div>
            <div>{customer.address || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Tags</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {customer.tags.length > 0
                ? customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))
                : "-"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Remarks</div>
            <div>{customer.remarks || "-"}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-muted-foreground">Birthday</div>
              <div>{formatDate(customer.birthday)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Assigned staff</div>
              <div>{customer.assignedStaff}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Last order</div>
              <div>{formatDate(customer.lastOrderDate)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Payment</div>
              <div>{customer.paymentReminderStatus}</div>
            </div>
          </div>
          {!canEditProfile ? (
            <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-4" />
              This role can view customer profiles but cannot edit them.
            </div>
          ) : null}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <PackagePlus className="size-4" />
          Latest order
        </div>
        <OrderActionPanel
          order={order}
          canUpdateOrder={canCreateOrder}
          onOrderSaved={onOrderSaved}
        />
      </div>

      {showOrderForm ? (
        <SimpleOrderForm
          key={customer.id}
          customer={customer}
          onOrderSaved={onOrderSaved}
          onCancel={() => setShowOrderForm(false)}
        />
      ) : null}

      <div className="grid gap-2">
        <Button
          type="button"
          className="min-h-11"
          disabled={!canCreateOrder}
          onClick={() => setShowOrderForm((current) => !current)}
        >
          <PackagePlus className="size-4" />
          {showOrderForm ? "Hide simple order" : "Create simple order"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={!canCreateOrder || !order}
          onClick={() => {
            const target = document.getElementById(
              order ? `crm-order-status-${order.id}` : ""
            )
            target?.focus()
          }}
        >
          Update order status
        </Button>
        <Button type="button" variant="outline" className="min-h-11">
          Add follow-up
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={!canCreateOrder}
          onClick={onSuggestReply}
        >
          <Bot className="size-4" />
          Suggest reply
        </Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={!canBroadcast}>
          <Megaphone className="size-4" />
          Broadcast price list
        </Button>
      </div>

      {!canBroadcast ? (
        <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4" />
          Broadcast sending is owner/admin only by default.
        </div>
      ) : null}
    </div>
  )
}

function ProfilePane({
  customer,
  order,
  canCreateOrder,
  canBroadcast,
  canEditProfile,
  onSuggestReply,
  onBack,
  onCustomerUpdated,
  onOrderSaved,
}: {
  customer: CrmCustomer
  order: CrmOrder | null
  canCreateOrder: boolean
  canBroadcast: boolean
  canEditProfile: boolean
  onSuggestReply: () => void
  onBack: () => void
  onCustomerUpdated: (customer: CrmCustomerProfileUpdate) => void
  onOrderSaved: (order: CrmOrder) => void
}) {
  return (
    <aside className="min-h-[calc(100vh-11rem)] overflow-hidden rounded-md border bg-card lg:col-span-2 lg:min-h-[36rem] xl:col-span-1 xl:h-[calc(100vh-18rem)]">
      <div className="flex min-h-14 items-center gap-2 border-b px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onBack}
          aria-label="Back to chat"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <div className="text-sm font-semibold">Customer profile</div>
          <div className="text-xs text-muted-foreground">
            Actions stay beside the chat on desktop.
          </div>
        </div>
      </div>
      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto lg:max-h-[29rem] xl:max-h-[calc(100vh-22rem)]">
        <CustomerProfileContent
          key={customer.id}
          customer={customer}
          order={order}
          canCreateOrder={canCreateOrder}
          canBroadcast={canBroadcast}
          canEditProfile={canEditProfile}
          onSuggestReply={onSuggestReply}
          onCustomerUpdated={onCustomerUpdated}
          onOrderSaved={onOrderSaved}
        />
      </div>
    </aside>
  )
}

function CrmSummaryPanel({
  dashboard,
  customerCount,
}: {
  dashboard: CrmDashboard
  customerCount: number
}) {
  return (
    <aside className="hidden min-h-[36rem] overflow-hidden rounded-md border bg-card lg:block lg:col-span-2 xl:col-span-1 xl:h-[calc(100vh-18rem)]">
      <div className="flex min-h-14 items-center gap-2 border-b px-3">
        <div>
          <div className="text-sm font-semibold">CRM panel</div>
          <div className="text-xs text-muted-foreground">
            Profile, latest order, and follow-up details appear here.
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-3 text-sm">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="font-medium">Select a customer to start</div>
          <div className="mt-1 text-muted-foreground">
            Use the left list to open a WhatsApp chat. This panel will show the
            customer profile, latest order, payment reminder, complaint tag, and
            quick actions.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Customers</div>
            <div className="mt-1 text-lg font-semibold">{customerCount}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Waiting</div>
            <div className="mt-1 text-lg font-semibold">
              {dashboard.customersWaitingCount}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Orders today</div>
            <div className="mt-1 text-lg font-semibold">
              {dashboard.newOrdersTodayCount}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Complaints</div>
            <div className="mt-1 text-lg font-semibold">
              {dashboard.complaintCount}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function CustomerProfileDrawer({
  open,
  onOpenChange,
  customer,
  order,
  canCreateOrder,
  canBroadcast,
  canEditProfile,
  onSuggestReply,
  onCustomerUpdated,
  onOrderSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CrmCustomer
  order: CrmOrder | null
  canCreateOrder: boolean
  canBroadcast: boolean
  canEditProfile: boolean
  onSuggestReply: () => void
  onCustomerUpdated: (customer: CrmCustomerProfileUpdate) => void
  onOrderSaved: (order: CrmOrder) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(92vw,24rem)] overflow-y-auto bg-card text-card-foreground"
      >
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Customer profile drawer</SheetTitle>
          <SheetDescription>
            Profile, latest order, follow-up, and permitted actions.
          </SheetDescription>
        </SheetHeader>
        <CustomerProfileContent
          key={customer.id}
          customer={customer}
          order={order}
          canCreateOrder={canCreateOrder}
          canBroadcast={canBroadcast}
          canEditProfile={canEditProfile}
          onSuggestReply={onSuggestReply}
          onCustomerUpdated={onCustomerUpdated}
          onOrderSaved={onOrderSaved}
        />
      </SheetContent>
    </Sheet>
  )
}

function OwnerDashboardMetric({
  label,
  value,
  helper,
  tone,
  icon,
}: {
  label: string
  value: string | number
  helper: string
  tone: "neutral" | "success" | "warning" | "destructive" | "info"
  icon: ReactNode
}) {
  return (
    <div
      className={cn(
        "min-h-28 rounded-md border bg-card p-3",
        tone === "warning" && "border-amber-200 bg-amber-50",
        tone === "destructive" && "border-red-200 bg-red-50",
        tone === "success" && "border-emerald-200 bg-emerald-50",
        tone === "info" && "border-sky-200 bg-sky-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground",
            tone === "warning" && "bg-amber-100 text-amber-800",
            tone === "destructive" && "bg-red-100 text-red-800",
            tone === "success" && "bg-emerald-100 text-emerald-800",
            tone === "info" && "bg-sky-100 text-sky-800"
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  )
}

function StaffResponseRanking({ dashboard }: { dashboard: CrmDashboard }) {
  const ranking = dashboard.staffResponseRanking.slice(0, 6)

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Staff response ranking</div>
          <div className="text-xs text-muted-foreground">
            Ranked by replies today, then faster average response.
          </div>
        </div>
        <Badge variant="secondary">{ranking.length}</Badge>
      </div>
      <div className="grid gap-2">
        {ranking.map((staff, index) => (
          <div key={staff.staffId} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? "success" : "secondary"}>
                    #{index + 1}
                  </Badge>
                  <div className="truncate text-sm font-semibold">
                    {staff.staffName}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground min-[430px]:grid-cols-4">
                  <div>
                    <div className="font-medium text-foreground">
                      {staff.averageResponseMinutes} min
                    </div>
                    Avg response
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {staff.repliedCount}
                    </div>
                    Replies
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {staff.underThirtyMinuteRate}%
                    </div>
                    Under 30 min
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {staff.waitingCustomers}
                    </div>
                    Waiting
                  </div>
                </div>
              </div>
              {staff.waitingCustomers > 0 ? (
                <Badge variant="warning" className="shrink-0">
                  Waiting
                </Badge>
              ) : null}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${staff.underThirtyMinuteRate}%` }}
              />
            </div>
          </div>
        ))}
        {ranking.length === 0 ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            No staff replies recorded today.
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DashboardStrip({ dashboard }: { dashboard: CrmDashboard }) {
  return (
    <section className="rounded-md border bg-card p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Owner dashboard</div>
          <div className="text-xs text-muted-foreground">
            Response speed, waiting customers, orders, and complaints.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Today</Badge>
          <Badge variant="outline">{dashboard.underThirtyMinuteRate}% under 30 min</Badge>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <OwnerDashboardMetric
          label="Customers waiting"
          value={dashboard.customersWaitingCount}
          helper="Unread customer chats"
          tone={dashboard.customersWaitingCount > 0 ? "warning" : "success"}
          icon={<UserRound className="size-4" />}
        />
        <OwnerDashboardMetric
          label="Unread over 30 min"
          value={dashboard.unreadTooLongCount}
          helper="Needs fast follow-up"
          tone={dashboard.unreadTooLongCount > 0 ? "destructive" : "success"}
          icon={<Clock className="size-4" />}
        />
        <OwnerDashboardMetric
          label="New messages today"
          value={dashboard.newMessagesTodayCount}
          helper="Inbound WhatsApp messages"
          tone="info"
          icon={<Bell className="size-4" />}
        />
        <OwnerDashboardMetric
          label="Avg response"
          value={`${dashboard.averageResponseMinutes} min`}
          helper="Inbound to staff reply"
          tone={dashboard.averageResponseMinutes <= 30 ? "success" : "warning"}
          icon={<Check className="size-4" />}
        />
        <OwnerDashboardMetric
          label="New orders"
          value={dashboard.newOrdersTodayCount}
          helper="Simple chat orders today"
          tone="neutral"
          icon={<PackagePlus className="size-4" />}
        />
        <OwnerDashboardMetric
          label="Complaints"
          value={dashboard.complaintCount}
          helper="Open complaint tags"
          tone={dashboard.complaintCount > 0 ? "destructive" : "success"}
          icon={<AlertTriangle className="size-4" />}
        />
      </div>
      <div className="mt-3">
        <StaffResponseRanking dashboard={dashboard} />
      </div>
    </section>
  )
}

export function WhatsappCrmInbox({
  data,
  profileName,
}: {
  data: WhatsappCrmData
  profileName: string
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [mobilePane, setMobilePane] = useState<MobilePane>("list")
  const [customers, setCustomers] = useState(data.customers)
  const [orders, setOrders] = useState(data.orders)
  const [notifications, setNotifications] = useState(data.notifications)
  const [broadcasts, setBroadcasts] = useState(data.broadcasts)
  const [aiSuggestions, setAiSuggestions] = useState(data.aiSuggestions)
  const [sentMessages, setSentMessages] = useState<CrmMessage[]>([])
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ?? null
  const allMessages = useMemo(
    () => [...data.messages, ...sentMessages],
    [data.messages, sentMessages]
  )
  const customerMessages = useMemo(
    () =>
      selectedCustomer
        ? allMessages.filter((message) => message.customerId === selectedCustomer.id)
        : [],
    [allMessages, selectedCustomer]
  )
  const latestOrder = selectedCustomer
    ? orders.find((order) => order.customerId === selectedCustomer.id) ?? null
    : null
  const currentDashboard = useMemo(
    () =>
      buildWhatsappCrmDashboard({
        customers,
        messages: allMessages,
        orders,
      }),
    [allMessages, customers, orders]
  )
  const suggestion = selectedCustomer
    ? aiSuggestions.find((item) => item.customerId === selectedCustomer.id) ?? null
    : null
  const canReply = data.roleMode !== "account"
  const canCreateOrder = data.roleMode !== "account"
  const canEditProfile = data.roleMode !== "account"
  const canBroadcast = data.canBroadcast

  function handleCustomerUpdated(customerUpdate: CrmCustomerProfileUpdate) {
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === customerUpdate.id
          ? {
              ...customer,
              ...customerUpdate,
              orderStatusBadge: customer.orderStatusBadge,
              latestOrderStatus: customer.latestOrderStatus,
            }
          : customer
      )
    )
  }

  function handleOrderSaved(order: CrmOrder) {
    const isNewOrder = !orders.some((item) => item.id === order.id)

    setOrders((current) => {
      if (current.some((item) => item.id === order.id)) {
        return current.map((item) => (item.id === order.id ? order : item))
      }

      return [order, ...current]
    })
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === order.customerId
          ? {
              ...customer,
              lastOrderDate: order.date,
              latestOrderStatus: order.status,
              orderStatusBadge: order.status,
            }
          : customer
      )
    )

    if (isNewOrder) {
      setNotifications((current) => [
        {
          id: `new-order-${order.id}`,
          customerId: order.customerId,
          type: "NEW_ORDER",
          title: "New simple order",
          body: `${order.product} - ${order.weightQuantity} (${order.fulfillment})`,
          tone: "success",
          createdAt: new Date().toISOString(),
        },
        ...current,
      ])
    }
  }

  function handleBroadcastSaved(broadcast: CrmBroadcastDraft) {
    setBroadcasts((current) =>
      current.some((item) => item.id === broadcast.id)
        ? current.map((item) => (item.id === broadcast.id ? broadcast : item))
        : [broadcast, ...current]
    )
  }

  function handleAiSuggestionSaved(suggestion: CrmAiSuggestion) {
    setAiSuggestions((current) => [
      suggestion,
      ...current.filter((item) => item.customerId !== suggestion.customerId),
    ])
  }

  function handleSuggestReplyQuickAction() {
    if (!selectedCustomer) return

    setMobilePane("chat")
    window.requestAnimationFrame(() => {
      document.getElementById(`crm-chat-suggest-reply-${selectedCustomer.id}`)?.focus()
    })
  }

  return (
    <div className="space-y-3">
      <DashboardStrip dashboard={currentDashboard} />
      <NotificationAlerts
        notifications={notifications}
        onSelectCustomer={(customerId) => {
          setSelectedCustomerId(customerId)
          setMobilePane("chat")
        }}
      />
      <BroadcastPriceListPanel
        canBroadcast={canBroadcast}
        data={data}
        onBroadcastSaved={handleBroadcastSaved}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.35fr)] xl:grid-cols-[minmax(17rem,0.85fr)_minmax(28rem,1.45fr)_minmax(18rem,0.8fr)]">
        <div className={cn(mobilePane !== "list" && "hidden lg:block")}>
          <CustomerList
            customers={customers}
            selectedId={selectedCustomer?.id ?? ""}
            onSelect={(customerId) => {
              setSelectedCustomerId(customerId)
              setMobilePane("chat")
            }}
          />
        </div>
        <div className={cn("min-w-0", mobilePane !== "chat" && "hidden lg:block")}>
          {selectedCustomer ? (
            <ChatPane
              customer={selectedCustomer}
              messages={customerMessages}
              order={latestOrder}
              suggestion={suggestion}
              canReply={canReply}
              canCreateOrder={canCreateOrder}
              canBroadcast={canBroadcast}
              canEditProfile={canEditProfile}
              onBack={() => setMobilePane("list")}
              onMessageSent={(message) =>
                setSentMessages((current) =>
                  current.some((item) => item.id === message.id)
                    ? current
                    : [...current, message]
                )
              }
              onCustomerUpdated={handleCustomerUpdated}
              onOrderSaved={handleOrderSaved}
              onAiSuggestionSaved={handleAiSuggestionSaved}
              profileName={profileName}
            />
          ) : (
            <ChatEmptyState customerCount={customers.length} />
          )}
        </div>
        <div
          className={cn(
            "min-w-0 lg:col-span-2 xl:col-span-1",
            mobilePane !== "profile" && "hidden lg:block"
          )}
        >
          {selectedCustomer ? (
            <ProfilePane
              customer={selectedCustomer}
              order={latestOrder}
              canCreateOrder={canCreateOrder}
              canBroadcast={canBroadcast}
              canEditProfile={canEditProfile}
              onSuggestReply={handleSuggestReplyQuickAction}
              onBack={() => setMobilePane("chat")}
              onCustomerUpdated={handleCustomerUpdated}
              onOrderSaved={handleOrderSaved}
            />
          ) : (
            <CrmSummaryPanel
              dashboard={currentDashboard}
              customerCount={customers.length}
            />
          )}
        </div>
      </div>
      {broadcasts.length > 0 ? (
        <div className="rounded-md border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="size-4" />
            Broadcast queue
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {broadcasts.map((broadcast) => (
              <div key={broadcast.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{broadcast.title}</div>
                <div className="mt-1 text-muted-foreground">
                  {broadcast.imageLabel} - {broadcast.audience}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{broadcast.recipientCount} recipients</Badge>
                  <Badge variant={broadcast.status === "Sent" ? "success" : "warning"}>
                    {broadcast.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
