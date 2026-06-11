import { Badge } from "@/components/ui/badge"
import type { CurrentProfile } from "@/lib/auth/types"

function isGlobalScope(profile: CurrentProfile) {
  return profile.roles.includes("admin") || profile.roles.includes("director")
}

export function getTeamScopeLabels(profile: CurrentProfile) {
  if (isGlobalScope(profile)) {
    return ["Viewing: All outlets / departments / teams"]
  }

  const labels: string[] = []

  if (profile.outletId) {
    labels.push(`Viewing outlet: ${profile.outletName ?? "Assigned outlet"}`)
  }

  if (profile.departmentId) {
    labels.push(
      `Viewing department: ${profile.departmentName ?? "Assigned department"}`
    )
  }

  if (profile.stockLocationId) {
    labels.push(
      `Viewing stock: ${profile.stockLocationName ?? "Assigned stock location"}`
    )
  }

  return labels.length > 0 ? labels : ["Profile scope missing"]
}

export function TeamScopeBadge({
  profile,
  className,
}: {
  profile: CurrentProfile
  className?: string
}) {
  return (
    <>
      {getTeamScopeLabels(profile).map((scope) => (
        <Badge key={scope} variant="outline" className={className}>
          {scope}
        </Badge>
      ))}
    </>
  )
}
