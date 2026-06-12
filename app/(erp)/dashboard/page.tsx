import { HomePage } from "@/components/dashboard/home-page"
import { requireCurrentProfile } from "@/lib/auth/session"

export default async function DashboardPage() {
  const profile = await requireCurrentProfile()

  return <HomePage profile={profile} />
}
