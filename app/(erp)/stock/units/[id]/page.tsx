import { notFound } from "next/navigation"

import { StockUnitDetailView } from "@/components/stock/stock-unit-detail"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { getStockUnitDetailData } from "@/lib/stock/data"
import type { UserRole } from "@/lib/auth/session"

const stockRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
  "director",
]

export default async function StockUnitPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const blocked = await moduleAccessBlock("stock", "Stock", stockRoles)

  if (blocked) {
    return blocked
  }

  const { data, unit, movements } = await getStockUnitDetailData(id)

  if (!unit) {
    notFound()
  }

  return (
    <StockUnitDetailView
      unit={unit}
      movements={movements}
      demoMode={data.demoMode}
    />
  )
}
