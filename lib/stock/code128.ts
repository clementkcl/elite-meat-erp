export type Code128Mode = "B" | "C"

export type Code128Bar = {
  x: number
  width: number
}

export type Code128Encoding = {
  bars: Code128Bar[]
  width: number
  mode: Code128Mode
}

const quietZoneWidth = 10
const startCodeB = 104
const startCodeC = 105
const stopCode = 106

const code128Patterns = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
] as const

function canUseCodeSetC(value: string) {
  return /^\d+$/.test(value) && value.length % 2 === 0
}

function canUseCodeSetB(value: string) {
  return /^[ -~]+$/.test(value)
}

function encodeValues(value: string) {
  if (canUseCodeSetC(value)) {
    const values = [startCodeC]

    for (let index = 0; index < value.length; index += 2) {
      values.push(Number(value.slice(index, index + 2)))
    }

    return { mode: "C" as const, values }
  }

  if (!canUseCodeSetB(value)) {
    return null
  }

  return {
    mode: "B" as const,
    values: [
      startCodeB,
      ...Array.from(value, (character) => character.charCodeAt(0) - 32),
    ],
  }
}

function checksum(values: number[]) {
  return (
    values[0] +
    values.slice(1).reduce((total, value, index) => {
      return total + value * (index + 1)
    }, 0)
  ) % 103
}

export function encodeCode128(input: string): Code128Encoding | null {
  const value = input.trim()

  if (!value) {
    return null
  }

  const encoded = encodeValues(value)

  if (!encoded) {
    return null
  }

  const values = [...encoded.values, checksum(encoded.values), stopCode]
  const bars: Code128Bar[] = []
  let x = quietZoneWidth

  for (const codeValue of values) {
    const pattern = code128Patterns[codeValue]

    if (!pattern) {
      return null
    }

    for (const [index, widthText] of Array.from(pattern).entries()) {
      const width = Number(widthText)

      if (index % 2 === 0) {
        bars.push({ x, width })
      }

      x += width
    }
  }

  return {
    bars,
    width: x + quietZoneWidth,
    mode: encoded.mode,
  }
}
