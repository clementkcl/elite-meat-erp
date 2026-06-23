export type OutboundReadyOrder = {
  status?: string | null
}

const outboundAvailableStatuses = ["IN_STOCK", "TRANSFERRED", "RETURNED"]

export function assertCustomerOrderReadyForOutbound(order: OutboundReadyOrder) {
  const status = String(order.status ?? "")

  if (status !== "READY_FOR_PICKUP" && status !== "READY_FOR_DELIVERY") {
    throw new Error(
      "Customer order must be marked ready before confirming outbound scans."
    )
  }
}

export function parseOutboundBarcodes(value: string) {
  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error("Scanned barcode list is not valid.")
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Scanned barcode list is not valid.")
  }

  const barcodes = parsed
    .map((barcode) => String(barcode ?? "").trim())
    .filter(Boolean)

  if (barcodes.length === 0) {
    throw new Error("Scan at least one barcode before confirming outbound.")
  }

  return barcodes
}

export function duplicateOutboundBarcode(barcodes: string[]) {
  const seen = new Set<string>()

  for (const barcode of barcodes) {
    if (seen.has(barcode)) {
      return barcode
    }

    seen.add(barcode)
  }

  return null
}

export function outboundUnitBlockReason(unit: {
  barcode: string
  status: string
}) {
  if (outboundAvailableStatuses.includes(unit.status)) {
    return null
  }

  return `Barcode ${unit.barcode} is ${unit.status} and cannot be outbounded.`
}

export function requireSubstitutionConfirmation(input: {
  hasSubstitution: boolean
  confirmed: boolean
}) {
  if (input.hasSubstitution && !input.confirmed) {
    throw new Error(
      "Confirm substitution before outbounding a barcode item that is not on the order."
    )
  }
}
