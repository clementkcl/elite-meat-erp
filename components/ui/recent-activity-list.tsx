import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

export type RecentActivityItem = {
  id: string
  title: string
  description?: string
  status?: string
  meta?: string
}

export function RecentActivityList({
  items,
  emptyText = "No recent activity.",
}: {
  items: RecentActivityItem[]
  emptyText?: string
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="divide-y rounded-md border">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "flex items-start justify-between gap-3 px-3 py-3",
            index % 2 === 1 && "bg-muted/25"
          )}
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{item.title}</div>
            {item.description ? (
              <div className="mt-1 truncate text-sm text-muted-foreground">
                {item.description}
              </div>
            ) : null}
            {item.meta ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {item.meta}
              </div>
            ) : null}
          </div>
          {item.status ? <StatusBadge value={item.status} /> : null}
        </div>
      ))}
    </div>
  )
}
