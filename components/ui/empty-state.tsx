import { Inbox } from "lucide-react"

import { cn } from "@/lib/utils"

export function EmptyState({
  title = "No records found",
  description = "Records will appear here after activity is created.",
  className,
}: {
  title?: string
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center",
        className
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full border bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="max-w-md text-sm text-muted-foreground">
        {description}
      </div>
    </div>
  )
}
