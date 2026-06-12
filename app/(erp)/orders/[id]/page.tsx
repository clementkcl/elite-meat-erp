import { OrdersPage } from "@/components/orders/orders-page"

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <OrdersPage route="detail" orderId={id} />
}
