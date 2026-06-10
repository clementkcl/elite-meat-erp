export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

export function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback
}

export function readNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null
}

export function readNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

export function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback
}
