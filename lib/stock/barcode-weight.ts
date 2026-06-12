export type BarcodeWeightDecodeStatus =
  | "decoded"
  | "manual_confirmation_required"
  | "error"

export type BarcodeWeightDecodeResult = {
  status: BarcodeWeightDecodeStatus
  weightKg: string
  source: "GS1_3102" | "GS1_3103" | "POSITION_RULE" | "FIXED_WEIGHT" | "NONE"
  message: string
}

export type BarcodeWeightDecodeInput = {
  barcode: string
  startText?: string
  lengthText?: string
  decimalsText?: string
  fixedWeightKgText?: string
}

function formatWeight(value: number, decimals: number) {
  return value.toFixed(Math.max(0, Math.min(decimals, 3)))
}

function parsePositiveNumber(value: string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function decodeGs1Weight(barcode: string): BarcodeWeightDecodeResult | null {
  const match = barcode.match(/310([23])(\d{6})/)

  if (!match) {
    return null
  }

  const decimals = Number(match[1])
  const rawWeight = Number(match[2])

  if (!Number.isFinite(rawWeight)) {
    return null
  }

  const source = decimals === 3 ? "GS1_3103" : "GS1_3102"

  return {
    status: "decoded",
    weightKg: formatWeight(rawWeight / 10 ** decimals, decimals),
    source,
    message: `Decoded barcode weight from ${source}.`,
  }
}

function decodePositionRule({
  barcode,
  startText,
  lengthText,
  decimalsText,
}: BarcodeWeightDecodeInput): BarcodeWeightDecodeResult | null {
  const start = Number(startText)
  const length = Number(lengthText)
  const decimals = Number(decimalsText)

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(length) ||
    !Number.isInteger(decimals) ||
    start < 1 ||
    length < 1 ||
    decimals < 1 ||
    decimals > 3
  ) {
    return null
  }

  const zeroBasedStart = start - 1
  const raw = barcode.slice(zeroBasedStart, zeroBasedStart + length)

  if (raw.length !== length || !/^\d+$/.test(raw)) {
    return null
  }

  return {
    status: "decoded",
    weightKg: formatWeight(Number(raw) / 10 ** decimals, decimals),
    source: "POSITION_RULE",
    message: "Decoded barcode weight from saved position rule.",
  }
}

function decodeFixedWeight({
  fixedWeightKgText,
}: BarcodeWeightDecodeInput): BarcodeWeightDecodeResult | null {
  const fixedWeightKg = parsePositiveNumber(fixedWeightKgText)

  if (fixedWeightKg === null) {
    return null
  }

  return {
    status: "manual_confirmation_required",
    weightKg: formatWeight(fixedWeightKg, 3),
    source: "FIXED_WEIGHT",
    message: "Fixed weight fallback applied. Confirm the weight before saving.",
  }
}

export function decodeBarcodeWeight(
  input: BarcodeWeightDecodeInput
): BarcodeWeightDecodeResult {
  const barcode = input.barcode.trim()

  if (!barcode) {
    return {
      status: "error",
      weightKg: "",
      source: "NONE",
      message: "Scan or enter a barcode before decoding weight.",
    }
  }

  const gs1Result = decodeGs1Weight(barcode)

  if (gs1Result) {
    return gs1Result
  }

  const positionResult = decodePositionRule({ ...input, barcode })

  if (positionResult) {
    return positionResult
  }

  const fixedResult = decodeFixedWeight(input)

  if (fixedResult) {
    return fixedResult
  }

  return {
    status: "error",
    weightKg: "",
    source: "NONE",
    message:
      "Barcode weight could not be decoded confidently. Enter the weight manually and confirm before saving.",
  }
}
