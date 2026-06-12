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
    or public.has_role('admin');
$$;

create or replace function public.can_operate_customer_order_delivery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('delivery_team_general_worker')
    or public.has_role('delivery_manager')
    or public.has_role('admin');
$$;

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
          and public.can_operate_customer_order_delivery()
          and public.can_access_work_scope(customer_order.outlet_id, customer_order.department_id)
          and public.can_access_outlet_module(customer_order.outlet_id, 'delivery')
        )
      )
  );
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
          and public.can_operate_customer_order_delivery()
          and public.can_access_work_scope(customer_order.outlet_id, customer_order.department_id)
          and public.can_access_outlet_module(customer_order.outlet_id, 'delivery')
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
    and public.can_operate_customer_order_delivery()
    and public.can_access_work_scope(outlet_id, department_id)
    and public.can_access_outlet_module(outlet_id, 'delivery')
  )
);

drop policy if exists "orders users can insert scoped orders" on public.customer_orders;
create policy "orders users can insert scoped orders"
on public.customer_orders for insert to authenticated
with check (
  public.can_manage_customer_orders()
  and created_by = auth.uid()
  and (
    public.has_role('admin')
    or (
      public.can_access_work_scope(outlet_id, department_id)
      and public.can_access_outlet_module(outlet_id, 'orders')
    )
  )
);

drop policy if exists "orders users can update scoped orders" on public.customer_orders;
create policy "orders users can update scoped orders"
on public.customer_orders for update to authenticated
using (
  (
    public.can_manage_customer_orders()
    and (
      public.has_role('admin')
      or (
        public.can_access_work_scope(outlet_id, department_id)
        and public.can_access_outlet_module(outlet_id, 'orders')
      )
    )
  )
  or (
    delivery_required
    and public.can_operate_customer_order_delivery()
    and status::text in ('READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED')
    and public.can_access_work_scope(outlet_id, department_id)
    and public.can_access_outlet_module(outlet_id, 'delivery')
  )
)
with check (
  (
    public.can_manage_customer_orders()
    and (
      public.has_role('admin')
      or (
        public.can_access_work_scope(outlet_id, department_id)
        and public.can_access_outlet_module(outlet_id, 'orders')
      )
    )
  )
  or (
    delivery_required
    and public.can_operate_customer_order_delivery()
    and status::text in ('OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED')
    and public.can_access_work_scope(outlet_id, department_id)
    and public.can_access_outlet_module(outlet_id, 'delivery')
  )
);

create or replace function public.guard_customer_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_status text := old.status::text;
  new_status text := new.status::text;
  user_id uuid := auth.uid();
  order_scope_allowed boolean;
  delivery_scope_allowed boolean;
begin
  if user_id is null then
    return new;
  end if;

  if public.has_role('admin') then
    return new;
  end if;

  if public.has_role('director') then
    raise exception 'Director users can view customer orders but cannot perform routine order updates.';
  end if;

  if new.order_no is distinct from old.order_no
    or new.outlet_id is distinct from old.outlet_id
    or new.department_id is distinct from old.department_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Order identity and scope cannot be changed by this role.';
  end if;

  if new.updated_by is distinct from user_id then
    raise exception 'Order updates must be attributed to the signed-in user.';
  end if;

  order_scope_allowed :=
    public.can_manage_customer_orders()
    and public.can_access_work_scope(old.outlet_id, old.department_id)
    and public.can_access_outlet_module(old.outlet_id, 'orders');

  delivery_scope_allowed :=
    old.delivery_required
    and new.delivery_required
    and public.can_operate_customer_order_delivery()
    and public.can_access_work_scope(old.outlet_id, old.department_id)
    and public.can_access_outlet_module(old.outlet_id, 'delivery');

  if delivery_scope_allowed and not order_scope_allowed then
    if new.customer_name is distinct from old.customer_name
      or new.customer_phone is distinct from old.customer_phone
      or new.order_date is distinct from old.order_date
      or new.required_date is distinct from old.required_date
      or new.fulfillment_type is distinct from old.fulfillment_type
      or new.delivery_required is distinct from old.delivery_required
    then
      raise exception 'Delivery users can only update delivery status, remarks, proof, and audit fields.';
    end if;

    if old_status = new_status then
      if old_status not in ('OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED') then
        raise exception 'Delivery proof updates are only allowed after the order is out for delivery.';
      end if;

      return new;
    end if;

    if old_status = 'READY_FOR_DELIVERY'
      and new_status in ('OUT_FOR_DELIVERY', 'FAILED', 'CANCELLED')
    then
      return new;
    end if;

    if old_status = 'OUT_FOR_DELIVERY'
      and new_status in ('DELIVERED', 'FAILED', 'CANCELLED')
    then
      return new;
    end if;

    raise exception 'Delivery order cannot move from % to %.', old_status, new_status;
  end if;

  if order_scope_allowed then
    if old_status not in ('NEW', 'PREPARING', 'READY') then
      raise exception 'Order is % and can no longer be changed by order operators.', old_status;
    end if;

    if new_status not in (
      'NEW',
      'PREPARING',
      'READY',
      'READY_FOR_PICKUP',
      'READY_FOR_DELIVERY',
      'CANCELLED'
    ) then
      raise exception 'Order operators cannot move orders to %.', new_status;
    end if;

    if new_status = 'READY_FOR_DELIVERY' and not new.delivery_required then
      raise exception 'Only delivery-required orders can be marked ready for delivery.';
    end if;

    if new_status = 'READY_FOR_PICKUP' and new.delivery_required then
      raise exception 'Delivery-required orders must be marked ready for delivery.';
    end if;

    return new;
  end if;

  raise exception 'Your role cannot update this customer order.';
end;
$$;

drop trigger if exists guard_customer_order_update on public.customer_orders;
create trigger guard_customer_order_update
  before update on public.customer_orders
  for each row execute function public.guard_customer_order_update();

