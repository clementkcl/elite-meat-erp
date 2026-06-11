"use client"

import { Check, Copy, Download, Printer } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function ReportToolbar({
  csvHref,
  filename,
  whatsappText,
}: {
  csvHref?: string
  filename?: string
  whatsappText?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copyWhatsappText() {
    if (!whatsappText) {
      return
    }

    await navigator.clipboard.writeText(whatsappText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {csvHref ? (
        <Button asChild variant="outline" size="sm">
          <a download={filename ?? "report.csv"} href={csvHref}>
            <Download className="size-4" />
            CSV
          </a>
        </Button>
      ) : null}
      {whatsappText ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyWhatsappText}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "WhatsApp"}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => window.print()}
      >
        <Printer className="size-4" />
        Print
      </Button>
    </div>
  )
}
