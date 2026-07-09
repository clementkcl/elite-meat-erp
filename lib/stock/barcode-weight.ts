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

export type BarcodeWeightRuleSuggestion = {
  start: number
  length: number
  decimals: number
}

export type BarcodeWeightRuleInference =
  | { status: "unique"; suggestion: BarcodeWeightRuleSuggestion }
  | { status: "ambiguous" | "not_found"; suggestion: null }

function formatWeight(value: number, decimals: number) {
  return value.toFixed(Math.max(0, Math.min(decimals, 3)))
}

function parsePositiveNumber(value: string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function enteredDecimalPlaces(value: string) {
  const match = value.trim().match(/\.(\d+)$/)

  if (!match) {
    return null
  }

  return Math.max(1, Math.min(match[1].length, 3))
}

export function inferBarcodeWeightRuleWithStatus({
  barcode,
  weightKgText,
}: {
  barcode: string
  weightKgText: string
}): BarcodeWeightRuleInference {
  const normalizedBarcode = barcode.trim()
  const weightKg = parsePositiveNumber(weightKgText)

  if (!normalizedBarcode || weightKg === null || !/^\d+$/.test(normalizedBarcode)) {
    return { status: "not_found", suggestion: null }
  }

  const candidates: BarcodeWeightRuleSuggestion[] = []
  const typedDecimals = enteredDecimalPlaces(weightKgText)
  const decimalOptions = typedDecimals ? [typedDecimals] : [1, 2, 3]

  for (const decimals of decimalOptions) {
    const rawWeight = Math.round(weightKg * 10 ** decimals)

    if (Math.abs(rawWeight / 10 ** decimals - weightKg) > 0.0005) {
      continue
    }

    const rawText = String(rawWeight)
    const length = Math.max(5, rawText.length)
    let searchFrom = 0

    while (searchFrom < normalizedBarcode.length) {
      const index = normalizedBarcode.indexOf(rawText, searchFrom)

      if (index === -1) {
        break
      }

      const start = index - (length - rawText.length)

      if (start < 0) {
        searchFrom = index + 1
        continue
      }

      const raw = normalizedBarcode.slice(start, index + rawText.length)

      if (raw.length !== length || !/^\d+$/.test(raw)) {
        searchFrom = index + 1
        continue
      }

      candidates.push({
        start: start + 1,
        length,
        decimals,
      })
      searchFrom = index + 1
    }
  }

  const unique = new Map(
    candidates.map((candidate) => [
      `${candidate.start}:${candidate.length}:${candidate.decimals}`,
      candidate,
    ])
  )

  if (unique.size === 1) {
    return { status: "unique", suggestion: [...unique.values()][0] }
  }

  return {
    status: unique.size > 1 ? "ambiguous" : "not_found",
    suggestion: null,
  }
}

export function inferBarcodeWeightRule(input: {
  barcode: string
  weightKgText: string
}): BarcodeWeightRuleSuggestion | null {
  const result = inferBarcodeWeightRuleWithStatus(input)

  return result.status === "unique" ? result.suggestion : null
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
