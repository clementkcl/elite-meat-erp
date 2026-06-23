-- Order Module V1 stock reservation logic:
-- available stock = physical stock - active unexpired order reservations.

drop policy if exists "orders admins can delete orders" on public.customer_orders;

create index if not exists idx_order_reservations_v1_active_lookup
on public.order_stock_reservations(item_id, location_id, status, expires_at)
where status = 'ACTIVE';

create index if not exists idx_order_reservations_v1_order_item_active
on public.order_stock_reservations(order_item_id, status)
where status = 'ACTIVE';

create or replace function public.order_available_stock_weight_v1(
  p_item_id uuid,
  p_location_id uuid default null,
  p_exclude_order_id uuid default null
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with physical as (
    select coalesce(sum(stock_unit.net_weight_kg), 0) as weight_kg
    from public.stock_units stock_unit
    where stock_unit.item_id = p_item_id
      and stock_unit.status in ('IN_STOCK', 'RETURNED')
      and (
        p_location_id is null
        or stock_unit.location_id = p_location_id
      )
  ),
  reserved as (
    select coalesce(sum(reservation.reserved_weight_kg), 0) as weight_kg
    from public.order_stock_reservations reservation
    where reservation.item_id = p_item_id
      and reservation.status = 'ACTIVE'
      and (
        reservation.expires_at is null
        or reservation.expires_at > now()
      )
      and (
        p_location_id is null
        or reservation.location_id = p_location_id
      )
      and (
        p_exclude_order_id is null
        or reservation.order_id <> p_exclude_order_id
      )
  )
  select case
    when public.can_manage_customer_orders()
      then physical.weight_kg - reserved.weight_kg
    else 0
  end
  from physical, reserved;
$$;

grant execute on function public.order_available_stock_weight_v1(uuid, uuid, uuid) to authenticated;

create or replace function public.expire_order_reservations_v1(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
begin
  if not public.can_manage_customer_orders() then
    raise exception 'Your role does not allow order reservation expiry.';
  end if;

  update public.order_stock_reservations reservation
  set status = 'RELEASED',
      updated_at = p_now
  where reservation.status = 'ACTIVE'
    and reservation.expires_at is not null
    and reservation.expires_at <= p_now;

  get diagnostics expired_count = row_count;

  return expired_count;
end;
$$;

grant execute on function public.expire_order_reservations_v1(timestamptz) to authenticated;

create or replace function public.release_order_reservations_v1(
  p_order_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released_count integer := 0;
begin
  if not public.can_manage_customer_order_record(p_order_id) then
    raise exception 'Order is not available in your scope.';
  end if;

  update public.order_stock_reservations reservation
  set status = 'RELEASED',
      updated_at = now()
  where reservation.order_id = p_order_id
    and reservation.status = 'ACTIVE';

  get diagnostics released_count = row_count;

  return released_count;
end;
$$;

grant execute on function public.release_order_reservations_v1(uuid) to authenticated;

create or replace function public.recalculate_order_stock_status_v1(
  p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record record;
  item_record record;
  reservation_location_id uuid;
  required_weight numeric;
  available_weight numeric;
  item_stock_not_enough boolean;
  order_stock_not_enough boolean := false;
begin
  select *
  into order_record
  from public.customer_orders
  where id = p_order_id;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if not public.can_manage_customer_order_record(p_order_id) then
    raise exception 'Order is not available in your scope.';
  end if;

  reservation_location_id := coalesce(
    order_record.from_location_id,
    order_record.pickup_location_id
  );

  perform public.expire_order_reservations_v1(now());

  for item_record in
    select *
    from public.customer_order_items
    where order_id = p_order_id
      and coalesce(status::text, '') <> 'CANCELLED'
  loop
    required_weight := coalesce(
      item_record.estimated_weight_kg,
      item_record.requested_weight_kg,
      0
    );
    available_weight := public.order_available_stock_weight_v1(
      item_record.item_id,
      reservation_location_id,
      p_order_id
    );
    item_stock_not_enough := available_weight < required_weight;
    order_stock_not_enough := order_stock_not_enough or item_stock_not_enough;

    update public.customer_order_items
    set stock_not_enough = item_stock_not_enough
    where id = item_record.id;

    update public.order_stock_reservations reservation
    set stock_not_enough = item_stock_not_enough,
        updated_at = now()
    where reservation.order_item_id = item_record.id
      and reservation.status = 'ACTIVE';
  end loop;

  update public.customer_orders
  set stock_not_enough = order_stock_not_enough,
      updated_by = coalesce(auth.uid(), updated_by)
  where id = p_order_id;

  return order_stock_not_enough;
end;
$$;

grant execute on function public.recalculate_order_stock_status_v1(uuid) to authenticated;
