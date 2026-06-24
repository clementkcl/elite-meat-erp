-- Remove Delivery-operator read-through access to customer_orders.
-- Drivers use canonical Delivery tables for operational fields; customer_orders
-- includes finance-sensitive columns such as total_order_price.

create or replace function public.can_access_customer_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customer_orders customer_order
    where customer_order.id = target_order_id
      and (
        public.is_admin_or_director()
        or (
          public.can_access_work_scope(customer_order.outlet_id, customer_order.department_id)
          and public.can_access_outlet_module(customer_order.outlet_id, 'orders')
        )
      )
  );
$$;

drop policy if exists "orders users can read scoped orders" on public.customer_orders;
create policy "orders users can read scoped orders"
on public.customer_orders for select to authenticated
using (
  public.is_admin_or_director()
  or (
    public.can_access_work_scope(outlet_id, department_id)
    and public.can_access_outlet_module(outlet_id, 'orders')
  )
);
