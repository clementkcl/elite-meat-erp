import { RetailPage } from "@/components/retail/retail-page"
import type { RetailReportFilters } from "@/lib/retail/types"

export default async function RetailCashVarianceReportPage({
  searchParams,
}: {
  searchParams: Promise<RetailReportFilters>
}) {
  const filters = await searchParams

  return <RetailPage route="cash-variance-report" filters={filters} />
}
