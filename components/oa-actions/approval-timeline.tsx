import { StatusBadge } from "@/components/ui/status-badge"
import type { ApprovalLog } from "@/lib/oa-actions/types"

function dateText(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusText(value: string) {
  return value.replaceAll("_", " ")
}

export function ApprovalTimeline({ logs }: { logs: ApprovalLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
        No approval activity yet.
      </div>
    )
  }

  return (
    <ol className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="rounded-md border p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-medium">
                {statusText(log.action)} by {log.actorName}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {log.requestType.toUpperCase()} | {dateText(log.createdAt)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {log.fromStatus ? <StatusBadge value={log.fromStatus} /> : null}
              {log.toStatus ? <StatusBadge value={log.toStatus} /> : null}
            </div>
          </div>
          {log.notes ? (
            <div className="mt-2 text-sm text-muted-foreground">{log.notes}</div>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
