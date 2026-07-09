import { MessageCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { WhatsappCrmInbox } from "@/components/whatsapp-crm/whatsapp-crm-inbox"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { requireCurrentProfile } from "@/lib/auth/session"
import { getWhatsappCrmData, whatsappCrmRoles } from "@/lib/whatsapp-crm/data"

export async function WhatsappCrmPage() {
  const blocked = await moduleAccessBlock(
    "whatsapp_crm",
    "WhatsApp CRM",
    [...whatsappCrmRoles]
  )

  if (blocked) {
    return blocked
  }

  const profile = await requireCurrentProfile()
  const data = await getWhatsappCrmData()

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5 text-emerald-700" />
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              WhatsApp CRM
            </h1>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Staff inbox for customer chats, simple chat orders, follow-ups,
            price-list broadcasts, and response speed tracking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{data.accounts.length} WhatsApp numbers</Badge>
          {data.demoMode ? <Badge variant="warning">Demo data</Badge> : null}
        </div>
      </div>

      {data.accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp setup needed</CardTitle>
            <CardDescription>
              Add at least one WhatsApp account before staff can receive or send
              CRM messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Configure phone number ID, display phone, and webhook verification
            token in Supabase and server environment variables.
          </CardContent>
        </Card>
      ) : null}

      <WhatsappCrmInbox data={data} profileName={profile.fullName} />
    </div>
  )
}
