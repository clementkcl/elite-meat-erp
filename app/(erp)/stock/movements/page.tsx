import { StockPage } from "@/components/stock/stock-page"
import type { MovementFilters } from "@/lib/stock/types"

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<MovementFilters>
}) {
  const filters = await searchParams

  return <StockPage route="movements" filters={filters} />
}
