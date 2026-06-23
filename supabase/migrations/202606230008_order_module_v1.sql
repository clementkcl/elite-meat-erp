-- Order Module V1:
-- create confirmed manual ERP orders with same-day stock reservations,
-- picking entries, pickup completion, and ready delivery handoff.

alter table public.outlets
  add column if not exists order_code text;

with ranked_outlets as (
  select id, row_number() over (order by name, id) as row_no
  from public.outlets
  where order_code is null or btrim(order_code) = ''
)
update public.outlets outlet
set order_code = case
  when ranked.row_no = 1 then '10'
  when ranked.row_no = 2 then '11'
  when ranked.row_no = 3 then '12'
  else lpad((ranked.row_no + 9)::text, 2, '0')
end
from ranked_outlets ranked
where outlet.id = ranked.id;

create unique index if not exists idx_outlets_order_code
on public.outlets(order_code)
where order_code is not null;

alter table public.items
  add column if not exists order_unit text not null default 'KG'
    check (order_unit in ('CARTON', 'PACKET', 'KG', 'QUANTITY_ESTIMATED_KG')),
  add column if not exists order_requires_estimated_kg boolean not null default true,
  add column if not exists processing_required_default boolean not null default false;

alter table public.customer_orders
  add column if not exists total_order_price numeric(12, 2) not null default 0
    check (total_order_price >= 0),
  add column if not exists required_at timestamptz,
  add column if not exists pickup_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists from_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists to_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists delivery_address text,
  add column if not exists delivery_latitude numeric(10, 7),
  add column if not exists delivery_longitude numeric(10, 7),
  add column if not exists customer_remarks text,
  add column if not exists stock_not_enough boolean not null default false,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists picked_up_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_reason text;

alter table public.customer_order_items
  add column if not exists ordering_unit text not null default 'KG'
    check (ordering_unit in ('CARTON', 'PACKET', 'KG', 'QUANTITY_ESTIMATED_KG')),
  add column if not exists estimated_weight_kg numeric(12, 3) not null default 0
    check (estimated_weight_kg >= 0),
  add column if not exists item_request_remarks text,
  add column if not exists processing_required boolean not null default false,
  add column if not exists stock_not_enough boolean not null default false;

update public.customer_order_items
set estimated_weight_kg = requested_weight_kg
where estimated_weight_kg = 0 and requested_weight_kg > 0;

alter table public.order_stock_reservations
  add column if not exists expires_at timestamptz,
  add column if not exists stock_not_enough boolean not null default false;

create table if not exists public.order_daily_counters (
  order_date date not null,
  outlet_code text not null,
  running_no integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (order_date, outlet_code)
);

create table if not exists public.order_picking_entries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete cascade,
  order_item_id uuid references public.customer_order_items(id) on delete set null,
  item_id uuid references public.items(id) on delete set null,
  stock_unit_id uuid references public.stock_units(id) on delete set null,
  barcode text,
  entry_type text not null
    check (entry_type in ('BARCODE_SCAN', 'MANUAL_WEIGHT', 'MISMATCH')),
  picked_quantity numeric(12, 3) not null default 0,
  picked_weight_kg numeric(12, 3) not null default 0,
  manual_reason text
    check (
      manual_reason is null
      or manual_reason in (
        'NO_BARCODE',
        'BARCODE_DAMAGED',
        'LOOSE_ITEM',
        'PROCESSING_ITEM',
        'SCANNER_FAILED',
        'EMERGENCY_MANUAL_ADJUSTMENT'
      )
    ),
  mismatch_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_order_picking_entries_order_barcode
on public.order_picking_entries(order_id, barcode)
where barcode is not null and entry_type = 'BARCODE_SCAN';

create index if not exists idx_order_picking_entries_order
on public.order_picking_entries(order_id, created_at desc);

create index if not exists idx_customer_orders_v1_filters
on public.customer_orders(order_date, outlet_id, status, customer_id, created_by);

create index if not exists idx_customer_orders_ready_delivery
on public.customer_orders(status, delivery_required)
where delivery_required = true;

alter table public.order_daily_counters enable row level security;
alter table public.order_picking_entries enable row level security;

drop policy if exists "orders users can read picking entries" on public.order_picking_entries;
create policy "orders users can read picking entries"
on public.order_picking_entries for select to authenticated
using (public.can_access_customer_order(order_id));

drop policy if exists "orders users can insert picking entries" on public.order_picking_entries;
create policy "orders users can insert picking entries"
on public.order_picking_entries for insert to authenticated
with check (
  public.can_manage_customer_order_record(order_id)
  and created_by = auth.uid()
);

drop policy if exists "admins can read order counters" on public.order_daily_counters;
create policy "admins can read order counters"
on public.order_daily_counters for select to authenticated
using (public.is_admin_or_director());

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

create or replace function public.next_customer_order_no_v1(p_outlet_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outlet_code text;
  v_running_no integer;
  v_order_date date := current_date;
begin
  if auth.uid() is null then
    raise exception using message = 'Sign in before creating orders.';
  end if;

  if not public.can_manage_customer_orders() then
    raise exception using message = 'Your role does not allow order creation.';
  end if;

  select coalesce(nullif(outlet.order_code, ''), '10')
    into v_outlet_code
  from public.outlets outlet
  where outlet.id = p_outlet_id;

  if v_outlet_code is null then
    raise exception using message = 'Outlet was not found for order number.';
  end if;

  insert into public.order_daily_counters (order_date, outlet_code, running_no)
  values (v_order_date, v_outlet_code, 1)
  on conflict (order_date, outlet_code) do update
  set running_no = public.order_daily_counters.running_no + 1,
      updated_at = now()
  returning running_no into v_running_no;

  return 'ORD-' || to_char(v_order_date, 'YYYYMMDD') || v_outlet_code || lpad(v_running_no::text, 3, '0');
end;
$$;

grant execute on function public.next_customer_order_no_v1(uuid) to authenticated;

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
    if old_status in ('DELIVERED', 'FAILED', 'CANCELLED') then
      raise exception 'Order is % and can no longer be changed by order operators.', old_status;
    end if;

    if new_status = 'CANCELLED' then
      return new;
    end if;

    if old_status = 'READY_FOR_PICKUP' and new_status = 'DELIVERED' then
      if new.picked_up_by is distinct from user_id or new.picked_up_at is null then
        raise exception 'Pickup completion must record the signed-in staff member and time.';
      end if;

      return new;
    end if;

    if old_status not in ('NEW', 'PREPARING', 'READY') then
      raise exception 'Order is % and can no longer be changed by order operators.', old_status;
    end if;

    if new_status not in (
      'NEW',
      'PREPARING',
      'READY',
      'READY_FOR_PICKUP',
      'READY_FOR_DELIVERY'
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

create or replace function public.create_delivery_job_for_customer_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_job_id uuid;
  linked_customer public.customers%rowtype;
  delivery_type text;
begin
  if not new.delivery_required or new.status::text <> 'READY_FOR_DELIVERY' then
    return new;
  end if;

  if exists (
    select 1
    from public.delivery_job_orders
    where customer_order_id = new.id
  ) then
    return new;
  end if;

  if new.customer_id is not null then
    select *
    into linked_customer
    from public.customers
    where id = new.customer_id;
  end if;

  delivery_type := case
    when new.fulfillment_type::text = 'INTERNAL_TRANSFER' then 'INTERNAL_TRANSFER_DELIVERY'
    else 'CUSTOMER_DELIVERY'
  end;

  insert into public.delivery_jobs (
    job_no,
    job_type,
    status,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_note,
    outlet_id,
    delivery_team_id,
    requested_delivery_date,
    created_by
  )
  values (
    public.delivery_job_no(),
    delivery_type,
    'AVAILABLE',
    coalesce(nullif(new.customer_name, ''), linked_customer.name, 'Customer'),
    coalesce(nullif(new.customer_phone, ''), linked_customer.phone),
    coalesce(new.delivery_address, linked_customer.address, new.remarks, new.customer_name),
    coalesce(new.customer_remarks, new.remarks),
    new.outlet_id,
    new.department_id,
    coalesce(new.required_at::date, new.required_date),
    new.created_by
  )
  returning id into new_job_id;

  insert into public.delivery_job_orders (job_id, customer_order_id)
  values (new_job_id, new.id)
  on conflict do nothing;

  perform public.refresh_delivery_job_totals(new.id);

  return new;
end;
$$;

drop trigger if exists create_delivery_job_after_customer_order on public.customer_orders;
create trigger create_delivery_job_after_customer_order
after insert or update of delivery_required, fulfillment_type, status
on public.customer_orders
for each row
execute function public.create_delivery_job_for_customer_order();
