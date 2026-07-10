export function makeInternalBarcode(
  sessionCode: string | null | undefined,
  weightKg: string,
  serial: number
) {
  const sessionPart = sessionCode?.replace(/\D/g, "") ?? ""
  const weightGrams = Math.round(Number(weightKg) * 1000)

  if (
    !sessionPart ||
    !Number.isInteger(serial) ||
    serial < 1 ||
    serial > 9999 ||
    !Number.isFinite(weightGrams) ||
    weightGrams <= 0 ||
    weightGrams > 999999
  ) {
    return ""
  }

  const weightPart = String(weightGrams).padStart(6, "0").slice(-6)
  const serialPart = String(serial).padStart(4, "0")

  return `${sessionPart}${serialPart}${weightPart}`
}

export function makeUniqueInternalBarcode(
  sessionCode: string | null | undefined,
  weightKg: string,
  existingBarcodes: string[],
  startSerial = 1
) {
  const blockedBarcodes = new Set(
    existingBarcodes.map((barcode) => barcode.trim()).filter(Boolean)
  )
  const firstSerial = Number.isFinite(startSerial)
    ? Math.max(1, Math.ceil(startSerial))
    : 1

  for (let serial = firstSerial; serial <= 9999; serial += 1) {
    const barcode = makeInternalBarcode(sessionCode, weightKg, serial)

    if (barcode && !blockedBarcodes.has(barcode)) {
      return { barcode, serial }
    }
  }

  return { barcode: "", serial: firstSerial }
}

export function internalBarcodeSerial(
  sessionCode: string | null | undefined,
  barcode: string
) {
  const sessionPart = sessionCode?.replace(/\D/g, "") ?? ""
  const normalizedBarcode = barcode.trim()

  if (
    !sessionPart ||
    !normalizedBarcode.startsWith(sessionPart) ||
    normalizedBarcode.length !== sessionPart.length + 10 ||
    !/^\d+$/.test(normalizedBarcode)
  ) {
    return null
  }

  const serial = Number(normalizedBarcode.slice(sessionPart.length, sessionPart.length + 4))

  return Number.isInteger(serial) && serial > 0 ? serial : null
}
