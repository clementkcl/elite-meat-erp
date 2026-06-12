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

  if public.is_admin_or_director() then
    return new;
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
    and public.can_manage_delivery()
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
