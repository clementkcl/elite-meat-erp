-- Atomic customer order item + stock reservation creation.
-- Run after 202606100032_admin_settings_customer_pricing_v1.sql.

drop function if exists public.add_customer_order_item_with_reservation(
  uuid,
  uuid,
  numeric,
  numeric,
  uuid,
  text
);

create or replace function public.add_customer_order_item_with_reservation(
  p_order_id uuid,
  p_item_id uuid,
  p_requested_quantity numeric,
  p_requested_weight_kg numeric,
  p_stock_location_id uuid default null,
  p_notes text default null
)
returns table (
  order_item_id uuid,
  reservation_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_order_status public.customer_order_status;
  v_order_item_id uuid;
  v_reservation_id uuid;
begin
  if v_actor_id is null then
    raise exception using message = 'Sign in before adding order items.';
  end if;

  if coalesce(p_requested_quantity, 0) < 0 or coalesce(p_requested_weight_kg, 0) < 0 then
    raise exception using message = 'Requested quantity and requested weight cannot be negative.';
  end if;

  if coalesce(p_requested_quantity, 0) = 0 and coalesce(p_requested_weight_kg, 0) = 0 then
    raise exception using message = 'Requested quantity or requested weight is required.';
  end if;

  select customer_order.status
    into v_order_status
  from public.customer_orders customer_order
  where customer_order.id = p_order_id;

  if not found then
    raise exception using message = 'Order was not found or is not accessible.';
  end if;

  if v_order_status not in ('NEW', 'PREPARING') then
    raise exception using message = 'Only new or preparing orders can accept more items.';
  end if;

  insert into public.customer_order_items (
    order_id,
    item_id,
    requested_quantity,
    requested_weight_kg,
    status,
    notes
  )
  values (
    p_order_id,
    p_item_id,
    coalesce(p_requested_quantity, 0),
    coalesce(p_requested_weight_kg, 0),
    'REQUESTED',
    p_notes
  )
  returning id into v_order_item_id;

  update public.customer_orders
  set
    status = 'PREPARING',
    updated_by = v_actor_id
  where id = p_order_id
    and status in ('NEW', 'PREPARING');

  if not found then
    raise exception using message = 'Order status changed before the item could be reserved. Try again.';
  end if;

  insert into public.order_stock_reservations (
    order_id,
    order_item_id,
    item_id,
    location_id,
    reserved_quantity,
    reserved_weight_kg,
    status,
    created_by
  )
  values (
    p_order_id,
    v_order_item_id,
    p_item_id,
    p_stock_location_id,
    coalesce(p_requested_quantity, 0),
    coalesce(p_requested_weight_kg, 0),
    'ACTIVE',
    v_actor_id
  )
  returning id into v_reservation_id;

  order_item_id := v_order_item_id;
  reservation_id := v_reservation_id;
  return next;
end;
$$;

grant execute on function public.add_customer_order_item_with_reservation(
  uuid,
  uuid,
  numeric,
  numeric,
  uuid,
  text
) to authenticated;

comment on function public.add_customer_order_item_with_reservation(
  uuid,
  uuid,
  numeric,
  numeric,
  uuid,
  text
) is 'Atomically inserts a customer order item and its order_stock_reservations row using the caller RLS context.';
