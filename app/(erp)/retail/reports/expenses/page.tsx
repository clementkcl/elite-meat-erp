import { RetailPage } from "@/components/retail/retail-page"
import type { RetailReportFilters } from "@/lib/retail/types"

export default async function RetailExpensesReportPage({
  searchParams,
}: {
  searchParams: Promise<RetailReportFilters>
}) {
  const filters = await searchParams

  return <RetailPage route="expense-report" filters={filters} />
}
