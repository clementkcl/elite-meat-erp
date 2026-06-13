export type StockTakeScopeSession = {
  item_id?: unknown
  brand_id?: unknown
}

export function sameNullableId(
  left: unknown,
  right: string | null | undefined
) {
  const leftValue = left ? String(left) : null
  return leftValue === (right ?? null)
}

export function requireStockTakeScopeMatch(
  session: StockTakeScopeSession,
  input: {
    itemId: string
    brandId: string | null
  }
) {
  if (String(session.item_id ?? "") !== input.itemId) {
    throw new Error("Barcode/item does not match this stock take item.")
  }

  if (!sameNullableId(session.brand_id, input.brandId)) {
    throw new Error("Barcode brand does not match this stock take brand.")
  }
}

export function requireSignature(value: string | undefined, label: string) {
  const signature = value?.trim()

  if (!signature) {
    throw new Error(`${label} signature is required.`)
  }

  return signature
}
