import Link from "next/link"
import { ArrowLeft, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Card, CardContent } from "@/components/ui/card"

export function ModuleAccessState({
  moduleName,
}: {
  moduleName: string
}) {
  const steps = [
    "Go back to Home",
    "Ask manager or admin",
    "Check role, outlet, and module access",
  ]

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <EmptyState
          title={`${moduleName} is not available for your account`}
          description="Your role, outlet, department, or module access does not allow this page. No work was changed."
          className="py-6"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded-md border bg-background px-3 py-3">
              <div className="text-xs font-medium text-muted-foreground">
                Step {index + 1}
              </div>
              <div className="mt-1 text-sm font-semibold">{step}</div>
            </div>
          ))}
        </div>
        <div className="rounded-md border bg-background px-3 py-3 text-sm text-muted-foreground">
          <ShieldAlert className="mr-2 inline size-4 text-amber-700" />
          If this button should be available, ask a manager or admin to update
          your role, outlet, department, and module access in Settings.
        </div>
        <Button asChild className="min-h-12 w-full text-base sm:w-auto">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
