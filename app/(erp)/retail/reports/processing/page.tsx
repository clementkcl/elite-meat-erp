import { RetailPage } from "@/components/retail/retail-page"
import type { RetailReportFilters } from "@/lib/retail/types"

export default async function RetailProcessingReportPage({
  searchParams,
}: {
  searchParams: Promise<RetailReportFilters>
}) {
  const filters = await searchParams

  return <RetailPage route="processing-report" filters={filters} />
}
