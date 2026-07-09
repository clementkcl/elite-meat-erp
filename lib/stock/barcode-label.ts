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
    weightGrams <= 0
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
  const blockedBarcodes = new Set(existingBarcodes.map((barcode) => barcode.trim()))

  for (let serial = Math.max(1, startSerial); serial <= 9999; serial += 1) {
    const barcode = makeInternalBarcode(sessionCode, weightKg, serial)

    if (barcode && !blockedBarcodes.has(barcode)) {
      return { barcode, serial }
    }
  }

  return { barcode: "", serial: startSerial }
}
