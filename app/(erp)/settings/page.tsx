import { SettingsPage as SettingsPageView } from "@/components/settings/settings-page"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ModuleAccessState } from "@/components/erp/module-access-state"
import { hasAnyRole, requireCurrentProfile } from "@/lib/auth/session"
import { getSettingsPageData } from "@/lib/settings/data"

export default async function SettingsPage() {
  const profile = await requireCurrentProfile()

  if (!hasAnyRole(profile, ["admin"])) {
    return <ModuleAccessState moduleName="Settings" />
  }

  let data = null
  let loadError: unknown = null

  try {
    data = await getSettingsPageData()
  } catch (error) {
    loadError = error
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settings setup needed</CardTitle>
          <CardDescription>
            Run the latest Supabase migrations, then refresh this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {loadError instanceof Error
              ? loadError.message
              : "Settings data could not load."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return <SettingsPageView data={data} />
}
