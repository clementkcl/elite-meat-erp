"use client"

import { Download, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

type CsvRow = Record<string, string | number | boolean | null>

function toCsvValue(value: string | number | boolean | null) {
  const text = value === null ? "" : String(value)
  return `"${text.replaceAll("\"", "\"\"")}"`
}

export function CsvExportButton({
  rows,
  filename,
}: {
  rows: CsvRow[]
  filename: string
}) {
  function exportCsv() {
    if (rows.length === 0) {
      return
    }

    const headers = Object.keys(rows[0] ?? {})
    const csv = [
      headers.map(toCsvValue).join(","),
      ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(",")),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" variant="outline" onClick={exportCsv}>
      <Download className="size-4" />
      CSV
    </Button>
  )
}

export function PrintButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      <Printer className="size-4" />
      Print
    </Button>
  )
}
