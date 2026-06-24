-- Order Module V1 stock reservation logic:
-- available stock = physical stock - active unexpired order reservations.

drop policy if exists "orders admins can delete orders" on public.customer_orders;

create index if not exists idx_order_reservations_v1_active_lookup
on public.order_stock_reservations(item_id, location_id, status, expires_at)
where status = 'ACTIVE';

create index if not exists idx_order_reservations_v1_order_item_active
on public.order_stock_reservations(order_item_id, status)
where status = 'ACTIVE';

alter table public.order_picking_entries
  drop constraint if exists order_picking_entries_manual_reason_required,
  add constraint order_picking_entries_manual_reason_required
    check (entry_type <> 'MANUAL_WEIGHT' or manual_reason is not null);

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

grant select, insert, update on public.customers to authenticated;
grant select, insert, update on public.customer_orders to authenticated;
grant select, insert, update on public.customer_order_items to authenticated;
grant select, insert, update on public.order_stock_reservations to authenticated;
grant select, insert on public.order_picking_entries to authenticated;
grant select, insert on public.order_status_logs to authenticated;
grant select, insert on public.order_notification_events to authenticated;
grant select on public.order_daily_counters to authenticated;
grant select on public.items to authenticated;
grant select on public.stock_units to authenticated;
grant select on public.stock_locations to authenticated;
grant select on public.outlets to authenticated;
grant select on public.departments to authenticated;
grant select, update on public.delivery_jobs to authenticated;
grant select on public.delivery_job_orders to authenticated;
grant select on public.delivery_items to authenticated;

create or replace function public.guard_order_header_after_picking_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.order_picking_entries picking_entry
    where picking_entry.order_id = old.id
    limit 1
  ) then
    if new.customer_id is distinct from old.customer_id
      or new.customer_name is distinct from old.customer_name
      or new.customer_phone is distinct from old.customer_phone
      or new.order_date is distinct from old.order_date
      or new.required_date is distinct from old.required_date
      or new.required_at is distinct from old.required_at
      or new.fulfillment_type is distinct from old.fulfillment_type
      or new.delivery_required is distinct from old.delivery_required
      or new.outlet_id is distinct from old.outlet_id
      or new.department_id is distinct from old.department_id
      or new.total_order_price is distinct from old.total_order_price
      or new.pickup_location_id is distinct from old.pickup_location_id
      or new.from_location_id is distinct from old.from_location_id
      or new.to_location_id is distinct from old.to_location_id
      or new.delivery_address is distinct from old.delivery_address
      or new.delivery_latitude is distinct from old.delivery_latitude
      or new.delivery_longitude is distinct from old.delivery_longitude
      or new.customer_remarks is distinct from old.customer_remarks
    then
      raise exception 'Order cannot be edited after picking starts.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_order_header_after_picking_v1 on public.customer_orders;
create trigger guard_order_header_after_picking_v1
  before update on public.customer_orders
  for each row execute function public.guard_order_header_after_picking_v1();

create or replace function public.guard_order_line_after_picking_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.order_picking_entries picking_entry
    where picking_entry.order_id = old.order_id
    limit 1
  ) then
    if new.item_id is distinct from old.item_id
      or new.requested_quantity is distinct from old.requested_quantity
      or new.requested_weight_kg is distinct from old.requested_weight_kg
      or new.ordering_unit is distinct from old.ordering_unit
      or new.estimated_weight_kg is distinct from old.estimated_weight_kg
      or new.item_request_remarks is distinct from old.item_request_remarks
      or new.processing_required is distinct from old.processing_required
    then
      raise exception 'Order items cannot be edited after picking starts.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_order_line_after_picking_v1 on public.customer_order_items;
create trigger guard_order_line_after_picking_v1
  before update on public.customer_order_items
  for each row execute function public.guard_order_line_after_picking_v1();

create or replace function public.sync_customer_orders_from_delivery_job_status_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status in ('OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED') then
    perform set_config('app.delivery_status_sync', 'true', true);

    update public.customer_orders customer_order
    set status = new.status::public.customer_order_status,
        updated_by = coalesce(new.updated_by, new.driver_id, customer_order.updated_by)
    from public.delivery_job_orders job_order
    where job_order.job_id = new.id
      and job_order.customer_order_id = customer_order.id
      and customer_order.delivery_required = true
      and customer_order.status::text <> new.status;

    perform set_config('app.delivery_status_sync', '', true);
  end if;

  return new;
end;
$$;

drop trigger if exists sync_customer_orders_from_delivery_job_status_v1 on public.delivery_jobs;
create trigger sync_customer_orders_from_delivery_job_status_v1
  after update of status on public.delivery_jobs
  for each row execute function public.sync_customer_orders_from_delivery_job_status_v1();
