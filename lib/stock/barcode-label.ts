export type BarcodeLabelItem = {
  itemCode?: string | null
}

export function makeInternalBarcode(
  item: BarcodeLabelItem | undefined,
  weightKg: string,
  serial: number,
  date = new Date()
) {
  const itemCode = item?.itemCode?.trim() ?? ""
  const weightGrams = Math.round(Number(weightKg) * 1000)

  if (
    !/^\d+$/.test(itemCode) ||
    !Number.isInteger(serial) ||
    serial < 1 ||
    serial > 9999 ||
    !Number.isFinite(weightGrams) ||
    weightGrams <= 0
  ) {
    return ""
  }

  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "")
  const weightPart = String(weightGrams).padStart(6, "0").slice(-6)
  const serialPart = String(serial).padStart(4, "0")

  return `${datePart}${itemCode.padStart(4, "0")}${weightPart}${serialPart}`
}

export function makeUniqueInternalBarcode(
  item: BarcodeLabelItem | undefined,
  weightKg: string,
  existingBarcodes: string[],
  startSerial = 1,
  date = new Date()
) {
  const blockedBarcodes = new Set(existingBarcodes.map((barcode) => barcode.trim()))

  for (let serial = Math.max(1, startSerial); serial <= 9999; serial += 1) {
    const barcode = makeInternalBarcode(item, weightKg, serial, date)

    if (barcode && !blockedBarcodes.has(barcode)) {
      return { barcode, serial }
    }
  }

  return { barcode: "", serial: startSerial }
}
