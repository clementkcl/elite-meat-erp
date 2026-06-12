import { EmptyState } from "@/components/ui/empty-state"
import { Card, CardContent } from "@/components/ui/card"

export function ModuleAccessState({
  moduleName,
}: {
  moduleName: string
}) {
  return (
    <Card>
      <CardContent>
        <EmptyState
          title={`${moduleName} is not enabled`}
          description="This outlet or profile does not currently have access to this module. Ask admin to enable it in settings."
        />
      </CardContent>
    </Card>
  )
}
