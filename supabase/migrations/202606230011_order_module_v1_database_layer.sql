-- Order Module V1 database contract:
-- canonical V1 status support, status audit log, reservation expiry/release,
-- compatibility views for the requested order table names, and scoped RLS.

alter table public.customers
  add column if not exists remarks text;

alter table public.order_stock_reservations
  add column if not exists expires_at timestamptz,
  add column if not exists stock_not_enough boolean not null default false,
  add column if not exists assigned_stock_unit_id uuid references public.stock_units(id) on delete set null,
  add column if not exists assigned_barcode text,
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null;

alter table public.order_stock_reservations
  alter column expires_at set default (
    (
      date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur')
      + interval '1 day'
      - interval '1 second'
    ) at time zone 'Asia/Kuala_Lumpur'
  );

update public.order_stock_reservations
set expires_at = (
  (
    date_trunc('day', created_at at time zone 'Asia/Kuala_Lumpur')
    + interval '1 day'
    - interval '1 second'
  ) at time zone 'Asia/Kuala_Lumpur'
)
where expires_at is null;

alter table public.customer_orders
  add column if not exists order_v1_status text not null default 'CONFIRMED'
    check (
      order_v1_status in (
        'CONFIRMED',
        'STOCK_NOT_ENOUGH',
        'PICKING',
        'READY',
        'OUT_FOR_DELIVERY',
        'PICKED_UP',
        'DELIVERED',
        'FAILED',
        'CANCELLED'
      )
    ),
  add column if not exists salesperson_id uuid references public.profiles(id) on delete set null;

update public.customer_orders
set salesperson_id = created_by
where salesperson_id is null;

create or replace function public.customer_order_v1_status(
  p_legacy_status text,
  p_stock_not_enough boolean,
  p_picked_up_at timestamptz
)
returns text
language sql
immutable
as $$
  select case
    when p_legacy_status = 'CANCELLED' then 'CANCELLED'
    when p_legacy_status = 'FAILED' then 'FAILED'
    when p_legacy_status = 'OUT_FOR_DELIVERY' then 'OUT_FOR_DELIVERY'
    when p_legacy_status = 'DELIVERED' and p_picked_up_at is not null then 'PICKED_UP'
    when p_legacy_status = 'DELIVERED' then 'DELIVERED'
    when p_legacy_status in ('READY', 'READY_FOR_PICKUP', 'READY_FOR_DELIVERY') then 'READY'
    when p_legacy_status = 'PREPARING' then 'PICKING'
    when coalesce(p_stock_not_enough, false) then 'STOCK_NOT_ENOUGH'
    else 'CONFIRMED'
  end;
$$;

grant execute on function public.customer_order_v1_status(text, boolean, timestamptz) to authenticated;

update public.customer_orders
set order_v1_status = public.customer_order_v1_status(
  status::text,
  stock_not_enough,
  picked_up_at
);

create table if not exists public.order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete cascade,
  order_no text,
  from_status text
    check (
      from_status is null
      or from_status in (
        'CONFIRMED',
        'STOCK_NOT_ENOUGH',
        'PICKING',
        'READY',
        'OUT_FOR_DELIVERY',
        'PICKED_UP',
        'DELIVERED',
        'FAILED',
        'CANCELLED'
      )
    ),
  to_status text not null
    check (
      to_status in (
        'CONFIRMED',
        'STOCK_NOT_ENOUGH',
        'PICKING',
        'READY',
        'OUT_FOR_DELIVERY',
        'PICKED_UP',
        'DELIVERED',
        'FAILED',
        'CANCELLED'
      )
    ),
  legacy_from_status text,
  legacy_to_status text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.order_status_logs enable row level security;

drop policy if exists "orders users can read status logs" on public.order_status_logs;
create policy "orders users can read status logs"
on public.order_status_logs for select to authenticated
using (public.can_access_customer_order(order_id));

drop policy if exists "orders users can insert status logs" on public.order_status_logs;
create policy "orders users can insert status logs"
on public.order_status_logs for insert to authenticated
with check (
  public.can_manage_customer_order_record(order_id)
  or exists (
    select 1
    from public.customer_orders customer_order
    where customer_order.id = order_id
      and customer_order.delivery_required
      and public.can_operate_customer_order_delivery()
      and public.can_access_work_scope(customer_order.outlet_id, customer_order.department_id)
      and public.can_access_outlet_module(customer_order.outlet_id, 'delivery')
  )
);

drop policy if exists "admins can update status logs" on public.order_status_logs;
create policy "admins can update status logs"
on public.order_status_logs for update to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "admins can delete status logs" on public.order_status_logs;
create policy "admins can delete status logs"
on public.order_status_logs for delete to authenticated
using (public.has_role('admin'));

insert into public.order_status_logs (
  order_id,
  order_no,
  from_status,
  to_status,
  legacy_from_status,
  legacy_to_status,
  notes,
  created_by,
  created_at
)
select
  customer_order.id,
  customer_order.order_no,
  null,
  customer_order.order_v1_status,
  null,
  customer_order.status::text,
  'Backfilled V1 status.',
  customer_order.created_by,
  customer_order.created_at
from public.customer_orders customer_order
where not exists (
  select 1
  from public.order_status_logs existing
  where existing.order_id = customer_order.id
);

create or replace function public.sync_customer_order_v1_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.order_v1_status := public.customer_order_v1_status(
    new.status::text,
    new.stock_not_enough,
    new.picked_up_at
  );

  if new.status::text = 'CANCELLED' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.cancelled_by := coalesce(new.cancelled_by, auth.uid(), new.updated_by, new.created_by);
  end if;

  return new;
end;
$$;

drop trigger if exists sync_customer_order_v1_status on public.customer_orders;
create trigger sync_customer_order_v1_status
  before insert or update of status, stock_not_enough, picked_up_at, cancelled_at, cancelled_by, order_v1_status
  on public.customer_orders
  for each row execute function public.sync_customer_order_v1_status();

create or replace function public.log_customer_order_v1_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_logs (
      order_id,
      order_no,
      from_status,
      to_status,
      legacy_from_status,
      legacy_to_status,
      notes,
      created_by
    )
    values (
      new.id,
      new.order_no,
      null,
      new.order_v1_status,
      null,
      new.status::text,
      'Order created.',
      coalesce(new.created_by, auth.uid())
    );

    return new;
  end if;

  if old.order_v1_status is distinct from new.order_v1_status
    or old.status is distinct from new.status
  then
    insert into public.order_status_logs (
      order_id,
      order_no,
      from_status,
      to_status,
      legacy_from_status,
      legacy_to_status,
      notes,
      created_by
    )
    values (
      new.id,
      new.order_no,
      old.order_v1_status,
      new.order_v1_status,
      old.status::text,
      new.status::text,
      null,
      coalesce(new.updated_by, auth.uid(), new.created_by)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists log_customer_order_v1_status on public.customer_orders;
create trigger log_customer_order_v1_status
  after insert or update of status, stock_not_enough, picked_up_at, order_v1_status
  on public.customer_orders
  for each row execute function public.log_customer_order_v1_status();

create or replace function public.release_order_reservations_on_cancel_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_v1_status = 'CANCELLED'
    and (
      tg_op = 'INSERT'
      or old.order_v1_status is distinct from new.order_v1_status
      or old.status is distinct from new.status
    )
  then
    update public.order_stock_reservations reservation
    set status = 'RELEASED',
        updated_at = now()
    where reservation.order_id = new.id
      and reservation.status = 'ACTIVE';
  end if;

  return new;
end;
$$;

drop trigger if exists release_order_reservations_on_cancel_v1 on public.customer_orders;
create trigger release_order_reservations_on_cancel_v1
  after insert or update of status, order_v1_status
  on public.customer_orders
  for each row execute function public.release_order_reservations_on_cancel_v1();

create or replace function public.can_manage_customer_orders()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team_general_worker')
    or public.has_role('retail_manager')
    or public.has_role('delivery_team_general_worker')
    or public.has_role('delivery_manager')
    or public.has_role('processing_team_general_worker')
    or public.has_role('processing_manager')
    or public.has_role('account')
    or public.has_role('admin');
$$;

create index if not exists idx_customer_orders_v1_order_date
on public.customer_orders(order_date);

create index if not exists idx_customer_orders_v1_outlet
on public.customer_orders(outlet_id);

create index if not exists idx_customer_orders_v1_status
on public.customer_orders(order_v1_status);

create index if not exists idx_customer_orders_v1_customer
on public.customer_orders(customer_id);

create index if not exists idx_customer_orders_v1_salesperson
on public.customer_orders(salesperson_id);

create index if not exists idx_customer_orders_v1_order_no
on public.customer_orders(order_no);

create index if not exists idx_order_status_logs_order
on public.order_status_logs(order_id, created_at desc);

create index if not exists idx_order_reservations_v1_expiry
on public.order_stock_reservations(expires_at, status);

create index if not exists idx_order_reservations_v1_assignment
on public.order_stock_reservations(assigned_stock_unit_id)
where assigned_stock_unit_id is not null;

create index if not exists idx_order_reservations_v1_shortage
on public.order_stock_reservations(order_id, stock_not_enough)
where stock_not_enough = true;

create or replace view public.orders
with (security_invoker = true)
as
select
  customer_order.id,
  customer_order.order_no,
  customer_order.customer_id,
  customer_order.customer_name,
  customer_order.customer_phone,
  customer_order.order_date,
  customer_order.required_date,
  customer_order.required_at,
  customer_order.fulfillment_type as order_type,
  customer_order.delivery_required,
  customer_order.order_v1_status as status,
  customer_order.status as legacy_status,
  customer_order.total_order_price,
  customer_order.source_type,
  customer_order.source_reference,
  customer_order.outlet_id,
  customer_order.department_id as team_id,
  customer_order.salesperson_id,
  customer_order.created_by,
  customer_order.updated_by,
  customer_order.pickup_location_id,
  customer_order.from_location_id,
  customer_order.to_location_id,
  customer_order.delivery_address,
  customer_order.delivery_latitude,
  customer_order.delivery_longitude,
  customer_order.customer_remarks,
  customer_order.remarks as staff_remarks,
  customer_order.stock_not_enough,
  customer_order.reservation_expires_at,
  customer_order.picked_up_at,
  customer_order.picked_up_by,
  customer_order.cancelled_at,
  customer_order.cancelled_by,
  customer_order.cancellation_reason,
  customer_order.created_at,
  customer_order.updated_at
from public.customer_orders customer_order;

create or replace view public.order_lines
with (security_invoker = true)
as
select
  order_item.id,
  order_item.order_id,
  order_item.item_id,
  order_item.ordering_unit,
  order_item.requested_quantity,
  order_item.requested_weight_kg,
  order_item.estimated_weight_kg,
  order_item.prepared_quantity as picked_quantity,
  order_item.prepared_weight_kg as picked_weight_kg,
  order_item.processing_required,
  order_item.stock_not_enough,
  order_item.item_request_remarks,
  order_item.notes,
  order_item.status as legacy_status,
  order_item.created_at,
  order_item.updated_at
from public.customer_order_items order_item;

create or replace view public.order_reservations
with (security_invoker = true)
as
select
  reservation.id,
  reservation.order_id,
  reservation.order_item_id as order_line_id,
  reservation.item_id,
  reservation.location_id,
  reservation.reserved_quantity,
  reservation.reserved_weight_kg,
  reservation.assigned_stock_unit_id,
  reservation.assigned_barcode,
  reservation.assigned_at,
  reservation.assigned_by,
  reservation.status,
  reservation.stock_not_enough,
  reservation.expires_at,
  reservation.created_by,
  reservation.created_at,
  reservation.updated_at
from public.order_stock_reservations reservation;

create or replace view public.order_pick_logs
with (security_invoker = true)
as
select
  picking_entry.id,
  picking_entry.order_id,
  picking_entry.order_item_id as order_line_id,
  picking_entry.item_id,
  picking_entry.stock_unit_id,
  picking_entry.barcode,
  picking_entry.entry_type,
  picking_entry.picked_quantity,
  picking_entry.picked_weight_kg,
  picking_entry.manual_reason,
  picking_entry.mismatch_message,
  picking_entry.created_by,
  picking_entry.created_at
from public.order_picking_entries picking_entry;

create or replace view public.order_notifications
with (security_invoker = true)
as
select
  notification.id,
  notification.order_id,
  notification.event_type,
  notification.channel,
  notification.payload,
  notification.status,
  notification.created_by,
  notification.sent_at,
  notification.created_at
from public.order_notification_events notification;

grant select on public.orders to authenticated;
grant select on public.order_lines to authenticated;
grant select on public.order_reservations to authenticated;
grant select on public.order_pick_logs to authenticated;
grant select on public.order_notifications to authenticated;
