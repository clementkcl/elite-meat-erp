import { StockPage } from "@/components/stock/stock-page"
import type { MovementFilters } from "@/lib/stock/types"

export default async function StockReportsPage({
  searchParams,
}: {
  searchParams: Promise<MovementFilters>
}) {
  const filters = await searchParams

  return <StockPage route="reports" filters={filters} />
}
