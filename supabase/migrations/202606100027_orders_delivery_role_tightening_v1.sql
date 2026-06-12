create or replace function public.can_manage_customer_orders()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team_general_worker')
    or public.has_role('retail_manager')
    or public.has_role('processing_team_general_worker')
    or public.has_role('processing_manager')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create or replace function public.can_insert_order_notification_event(target_order_id uuid)
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
        public.can_manage_customer_order_record(customer_order.id)
        or (
          customer_order.delivery_required
          and public.can_manage_delivery()
          and public.can_access_work_scope(customer_order.outlet_id, customer_order.department_id)
          and public.can_access_outlet_module(customer_order.outlet_id, 'delivery')
        )
      )
  );
$$;

drop policy if exists "orders users can insert notification events" on public.order_notification_events;
create policy "orders users can insert notification events"
on public.order_notification_events for insert to authenticated
with check (
  public.can_insert_order_notification_event(order_id)
);
