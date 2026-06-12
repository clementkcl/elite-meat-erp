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
        or (
          customer_order.delivery_required
          and public.can_manage_delivery()
          and public.can_access_work_scope(customer_order.outlet_id, customer_order.department_id)
          and public.can_access_outlet_module(customer_order.outlet_id, 'delivery')
        )
      )
  );
$$;

create or replace function public.can_manage_customer_order_record(target_order_id uuid)
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
      and public.can_manage_customer_orders()
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
  or (
    delivery_required
    and public.can_manage_delivery()
    and public.can_access_work_scope(outlet_id, department_id)
    and public.can_access_outlet_module(outlet_id, 'delivery')
  )
);

drop policy if exists "orders users can update scoped orders" on public.customer_orders;
create policy "orders users can update scoped orders"
on public.customer_orders for update to authenticated
using (
  (
    public.can_manage_customer_orders()
    and (
      public.is_admin_or_director()
      or (
        public.can_access_work_scope(outlet_id, department_id)
        and public.can_access_outlet_module(outlet_id, 'orders')
      )
    )
  )
  or (
    delivery_required
    and public.can_manage_delivery()
    and status::text in ('READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED')
    and public.can_access_work_scope(outlet_id, department_id)
    and public.can_access_outlet_module(outlet_id, 'delivery')
  )
)
with check (
  (
    public.can_manage_customer_orders()
    and (
      public.is_admin_or_director()
      or (
        public.can_access_work_scope(outlet_id, department_id)
        and public.can_access_outlet_module(outlet_id, 'orders')
      )
    )
  )
  or (
    delivery_required
    and public.can_manage_delivery()
    and status::text in ('OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED')
    and public.can_access_work_scope(outlet_id, department_id)
    and public.can_access_outlet_module(outlet_id, 'delivery')
  )
);

drop policy if exists "orders users can insert scoped order items" on public.customer_order_items;
create policy "orders users can insert scoped order items"
on public.customer_order_items for insert to authenticated
with check (public.can_manage_customer_order_record(order_id));

drop policy if exists "orders users can update scoped order items" on public.customer_order_items;
create policy "orders users can update scoped order items"
on public.customer_order_items for update to authenticated
using (public.can_manage_customer_order_record(order_id))
with check (public.can_manage_customer_order_record(order_id));

drop policy if exists "orders users can insert preparation logs" on public.order_preparation_logs;
create policy "orders users can insert preparation logs"
on public.order_preparation_logs for insert to authenticated
with check (
  prepared_by = auth.uid()
  and public.can_manage_customer_order_record(order_id)
);
