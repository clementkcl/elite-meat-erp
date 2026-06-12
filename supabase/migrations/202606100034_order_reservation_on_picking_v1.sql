-- Reservation timing hardening:
-- Customer order item entry must not reserve stock.
-- Stock is reserved only when picking/preparation starts.

drop function if exists public.add_customer_order_item_with_reservation(
  uuid,
  uuid,
  numeric,
  numeric,
  uuid,
  text
);

drop function if exists public.prepare_customer_order_item_with_reservation(
  uuid,
  numeric,
  numeric,
  uuid,
  text
);

create or replace function public.prepare_customer_order_item_with_reservation(
  p_order_item_id uuid,
  p_prepared_quantity numeric,
  p_prepared_weight_kg numeric,
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
  v_order_id uuid;
  v_item_id uuid;
  v_item_status public.customer_order_item_status;
  v_order_status public.customer_order_status;
  v_reservation_id uuid;
begin
  if v_actor_id is null then
    raise exception using message = 'Sign in before preparing order items.';
  end if;

  if coalesce(p_prepared_quantity, 0) < 0 or coalesce(p_prepared_weight_kg, 0) < 0 then
    raise exception using message = 'Prepared quantity and prepared weight cannot be negative.';
  end if;

  if coalesce(p_prepared_quantity, 0) = 0 and coalesce(p_prepared_weight_kg, 0) = 0 then
    raise exception using message = 'Prepared quantity or prepared weight is required.';
  end if;

  select order_item.order_id,
         order_item.item_id,
         order_item.status
    into v_order_id,
         v_item_id,
         v_item_status
  from public.customer_order_items order_item
  where order_item.id = p_order_item_id
  for update;

  if not found then
    raise exception using message = 'Order item was not found or is not accessible.';
  end if;

  if v_item_status = 'PREPARED' then
    raise exception using message = 'Stock is already reserved for this order item. Cancel and recreate the order if changes are needed.';
  end if;

  select customer_order.status
    into v_order_status
  from public.customer_orders customer_order
  where customer_order.id = v_order_id
  for update;

  if not found then
    raise exception using message = 'Order was not found or is not accessible.';
  end if;

  if v_order_status not in ('NEW', 'PREPARING') then
    raise exception using message = 'Only new or preparing orders can start picking.';
  end if;

  if exists (
    select 1
    from public.order_stock_reservations reservation
    where reservation.order_item_id = p_order_item_id
      and reservation.status = 'ACTIVE'
  ) then
    raise exception using message = 'Stock is already reserved for this order item. Cancel and recreate the order if changes are needed.';
  end if;

  update public.customer_order_items
  set
    prepared_quantity = coalesce(p_prepared_quantity, 0),
    prepared_weight_kg = coalesce(p_prepared_weight_kg, 0),
    prepared_by = v_actor_id,
    prepared_at = now(),
    status = 'PREPARED',
    notes = p_notes
  where id = p_order_item_id;

  insert into public.order_preparation_logs (
    order_id,
    order_item_id,
    item_id,
    prepared_quantity,
    prepared_weight_kg,
    prepared_by,
    notes
  )
  values (
    v_order_id,
    p_order_item_id,
    v_item_id,
    coalesce(p_prepared_quantity, 0),
    coalesce(p_prepared_weight_kg, 0),
    v_actor_id,
    p_notes
  );

  update public.customer_orders
  set
    status = 'PREPARING',
    updated_by = v_actor_id
  where id = v_order_id
    and status in ('NEW', 'PREPARING');

  if not found then
    raise exception using message = 'Order status changed before stock could be reserved. Try again.';
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
    v_order_id,
    p_order_item_id,
    v_item_id,
    p_stock_location_id,
    coalesce(p_prepared_quantity, 0),
    coalesce(p_prepared_weight_kg, 0),
    'ACTIVE',
    v_actor_id
  )
  returning id into v_reservation_id;

  order_item_id := p_order_item_id;
  reservation_id := v_reservation_id;
  return next;
end;
$$;

grant execute on function public.prepare_customer_order_item_with_reservation(
  uuid,
  numeric,
  numeric,
  uuid,
  text
) to authenticated;

comment on function public.prepare_customer_order_item_with_reservation(
  uuid,
  numeric,
  numeric,
  uuid,
  text
) is 'Atomically marks an order item prepared and creates its stock reservation when picking starts.';
