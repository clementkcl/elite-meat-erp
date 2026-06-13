export type ItemCodeCandidate = {
  itemCode?: string | null
}

export function normalizeItemCode(value: string) {
  return value.trim()
}

export function isNumericItemCode(value: string) {
  return /^\d+$/.test(normalizeItemCode(value))
}

export function nextItemCode(value: string) {
  const parsed = Number(normalizeItemCode(value))
  return Number.isInteger(parsed) ? String(parsed + 1).padStart(4, "0") : "0001"
}

export function generatedItemCode(items: ItemCodeCandidate[]) {
  const maxCode = items.reduce((max, item) => {
    const code = item.itemCode ?? ""

    if (!isNumericItemCode(code)) {
      return max
    }

    return Math.max(max, Number(normalizeItemCode(code)))
  }, 0)

  return String(maxCode + 1).padStart(4, "0")
}
