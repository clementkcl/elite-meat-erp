import { OrdersPage } from "@/components/orders/orders-page"

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <OrdersPage route="list" searchParams={await searchParams} />
}
