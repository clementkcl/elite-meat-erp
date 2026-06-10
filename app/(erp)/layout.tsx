import type { ReactNode } from "react"

import { AppShell } from "@/components/erp/app-shell"
import { requireCurrentProfile } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export default async function ErpLayout({
  children,
}: {
  children: ReactNode
}) {
  const profile = await requireCurrentProfile()

  return <AppShell profile={profile}>{children}</AppShell>
}
