import { RetailPage } from "@/components/retail/retail-page"
import type { RetailReportFilters } from "@/lib/retail/types"

export default async function RetailMissingTasksReportPage({
  searchParams,
}: {
  searchParams: Promise<RetailReportFilters>
}) {
  const filters = await searchParams

  return <RetailPage route="missing-tasks-report" filters={filters} />
}
