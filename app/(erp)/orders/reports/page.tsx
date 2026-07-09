import { OrdersPage } from "@/components/orders/orders-page"

export default async function OrderReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <OrdersPage route="reports" searchParams={await searchParams} />
}
