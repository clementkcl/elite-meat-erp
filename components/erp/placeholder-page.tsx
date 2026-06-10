import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge variant="outline">Placeholder</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming after Stock Module V1</CardTitle>
          <CardDescription>
            This route is intentionally present for navigation and permissions,
            but the business workflow is not built in this phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            The ERP foundation is ready to host this module once Stock V1 is
            complete.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
