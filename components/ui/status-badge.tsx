import { Badge } from "@/components/ui/badge"

const successStatuses = new Set([
  "APPROVED",
  "ARRIVED",
  "COMPLETED",
  "DELIVERED",
  "DONE",
  "IN_STOCK",
  "OK",
  "PAID",
  "PRESENT",
  "REVIEWED",
])

const warningStatuses = new Set([
  "ACCOUNT_REVIEWED",
  "ADMIN_REVIEWED",
  "ASSIGNED",
  "DRAFT",
  "IN_TRANSIT",
  "LATE",
  "LOADING",
  "MANAGER_REVIEWED",
  "MISSING",
  "OPEN",
  "OUT_FOR_DELIVERY",
  "OVER_6_MONTHS",
  "PARTIAL",
  "PENDING",
  "REVIEWED",
  "SUBMITTED",
  "TRANSFER_PENDING",
  "UNPAID",
  "VARIANCE",
])

const destructiveStatuses = new Set([
  "ABSENT",
  "ADJUSTED_OUT",
  "CANCELLED",
  "DAMAGED",
  "FAILED",
  "MISSED",
  "NEGATIVE_STOCK",
  "OUTBOUNDED",
  "OVER_12_MONTHS",
  "REJECTED",
  "VOID",
])

function normalizeStatus(value: string) {
  return value.trim().replaceAll(" ", "_").toUpperCase()
}

function displayStatus(value: string) {
  return normalizeStatus(value).replaceAll("_", " ")
}

export function isStatusLike(value: unknown) {
  if (typeof value !== "string") {
    return false
  }

  const normalized = normalizeStatus(value)
  return (
    successStatuses.has(normalized) ||
    warningStatuses.has(normalized) ||
    destructiveStatuses.has(normalized)
  )
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = normalizeStatus(value)
  const variant = destructiveStatuses.has(normalized)
    ? "destructive"
    : successStatuses.has(normalized)
      ? "success"
      : warningStatuses.has(normalized)
        ? "warning"
        : "outline"

  return <Badge variant={variant}>{displayStatus(value)}</Badge>
}
