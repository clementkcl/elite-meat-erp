alter type public.delivery_status add value if not exists 'LOADED';

create table if not exists public.delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  job_no text not null unique,
  job_type text not null default 'CUSTOMER_DELIVERY'
    check (job_type in ('CUSTOMER_DELIVERY', 'INTERNAL_TRANSFER_DELIVERY', 'RETURN_COLLECTION')),
  status text not null default 'AVAILABLE'
    check (status in ('AVAILABLE', 'ACCEPTED', 'LOADED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED')),
  customer_name text not null,
  customer_phone text,
  delivery_address text,
  delivery_note text,
  outlet_id uuid references public.outlets(id) on delete set null,
  delivery_team_id uuid references public.departments(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  requested_delivery_date date,
  total_weight_kg numeric(12, 3) not null default 0 check (total_weight_kg >= 0),
  item_count integer not null default 0 check (item_count >= 0),
  order_count integer not null default 1 check (order_count >= 1),
  proof_file_id uuid references public.files(id) on delete set null,
  proof_latitude numeric(10, 7),
  proof_longitude numeric(10, 7),
  gps_available boolean,
  proof_note text,
  failed_reason text
    check (failed_reason is null or failed_reason in ('CUSTOMER_NOT_AVAILABLE', 'WRONG_ADDRESS', 'CUSTOMER_REJECTED', 'GOODS_ISSUE', 'VEHICLE_ISSUE', 'OTHER')),
  goods_issue_reason text
    check (goods_issue_reason is null or goods_issue_reason in ('ITEM_MISSING', 'WRONG_ITEM', 'WEIGHT_MISMATCH', 'PACKAGING_DAMAGED', 'NOT_READY', 'OTHER')),
  accepted_at timestamptz,
  loaded_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_job_orders (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.delivery_jobs(id) on delete cascade,
  customer_order_id uuid references public.customer_orders(id) on delete cascade,
  delivery_order_id uuid references public.delivery_orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (customer_order_id is not null or delivery_order_id is not null)
);

create unique index if not exists idx_delivery_job_orders_customer_order
on public.delivery_job_orders(customer_order_id)
where customer_order_id is not null;

create unique index if not exists idx_delivery_job_orders_delivery_order
on public.delivery_job_orders(delivery_order_id)
where delivery_order_id is not null;

create index if not exists idx_delivery_jobs_status_date
on public.delivery_jobs(status, requested_delivery_date desc);

create index if not exists idx_delivery_jobs_driver_status
on public.delivery_jobs(driver_id, status);

create table if not exists public.delivery_goods_issues (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.delivery_jobs(id) on delete cascade,
  issue_reason text not null
    check (issue_reason in ('ITEM_MISSING', 'WRONG_ITEM', 'WEIGHT_MISMATCH', 'PACKAGING_DAMAGED', 'NOT_READY', 'OTHER')),
  remark text,
  photo_file_id uuid references public.files(id) on delete set null,
  reported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_address_suggestions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.delivery_jobs(id) on delete set null,
  order_id uuid references public.customer_orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  suggested_address text,
  suggested_latitude numeric(10, 7),
  suggested_longitude numeric(10, 7),
  reason text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_expenses (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.profiles(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  delivery_team_id uuid references public.departments(id) on delete set null,
  expense_type text not null
    check (expense_type in ('PETROL', 'PARKING', 'TOLL', 'VEHICLE_REPAIR', 'OTHER')),
  amount numeric(12, 2) not null check (amount > 0),
  receipt_file_id uuid not null references public.files(id) on delete restrict,
  remark text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_delivery_expenses_driver_status
on public.delivery_expenses(driver_id, status, created_at desc);

create table if not exists public.delivery_truck_current_locations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  provider_name text,
  provider_vehicle_ref text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  speed_kmh numeric(8, 2),
  fuel_percent numeric(5, 2),
  eta_minutes integer,
  delay_minutes integer,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (vehicle_id)
);

create table if not exists public.delivery_truck_location_trail (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  job_id uuid references public.delivery_jobs(id) on delete cascade,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  speed_kmh numeric(8, 2),
  fuel_percent numeric(5, 2),
  synced_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_delivery_truck_trail_vehicle_sync
on public.delivery_truck_location_trail(vehicle_id, synced_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'delivery_jobs',
    'delivery_address_suggestions',
    'delivery_expenses'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

create or replace function public.delivery_job_no()
returns text
language sql
volatile
as $$
  select 'DJ-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 100000)::text, 5, '0');
$$;

create or replace function public.refresh_delivery_job_totals(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_job_id uuid;
begin
  select job_id
  into target_job_id
  from public.delivery_job_orders
  where customer_order_id = target_order_id
  limit 1;

  if target_job_id is null then
    return;
  end if;

  update public.delivery_jobs
  set
    total_weight_kg = coalesce((
      select sum(coalesce(prepared_weight_kg, requested_weight_kg, 0))
      from public.customer_order_items
      where order_id in (
        select customer_order_id
        from public.delivery_job_orders
        where job_id = target_job_id
          and customer_order_id is not null
      )
    ), 0),
    item_count = coalesce((
      select sum(greatest(coalesce(prepared_quantity, requested_quantity, 0), 1))::integer
      from public.customer_order_items
      where order_id in (
        select customer_order_id
        from public.delivery_job_orders
        where job_id = target_job_id
          and customer_order_id is not null
      )
    ), 0),
    order_count = greatest(1, (
      select count(*)
      from public.delivery_job_orders
      where job_id = target_job_id
    )),
    updated_at = now()
  where id = target_job_id;
end;
$$;

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
  if not new.delivery_required then
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
    coalesce(linked_customer.address, new.remarks, new.customer_name),
    new.remarks,
    new.outlet_id,
    new.department_id,
    new.required_date,
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
after insert or update of delivery_required, fulfillment_type
on public.customer_orders
for each row
execute function public.create_delivery_job_for_customer_order();

create or replace function public.refresh_delivery_job_totals_from_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_delivery_job_totals(old.order_id);
    return old;
  end if;

  perform public.refresh_delivery_job_totals(new.order_id);

  return new;
end;
$$;

drop trigger if exists refresh_delivery_job_totals_on_order_item on public.customer_order_items;
create trigger refresh_delivery_job_totals_on_order_item
after insert or update or delete
on public.customer_order_items
for each row
execute function public.refresh_delivery_job_totals_from_order_item();

create or replace function public.create_delivery_job_for_standalone_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_job_id uuid;
  total_weight numeric(12, 3);
  total_items integer;
begin
  if exists (
    select 1
    from public.delivery_job_orders
    where delivery_order_id = new.id
  ) then
    return new;
  end if;

  select
    coalesce(sum(weight_kg), 0),
    coalesce(sum(greatest(quantity, 1))::integer, 0)
  into total_weight, total_items
  from public.delivery_order_items
  where order_id = new.id;

  insert into public.delivery_jobs (
    job_no,
    job_type,
    status,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_note,
    delivery_team_id,
    driver_id,
    vehicle_id,
    requested_delivery_date,
    total_weight_kg,
    item_count,
    created_by
  )
  values (
    public.delivery_job_no(),
    'CUSTOMER_DELIVERY',
    'AVAILABLE',
    new.customer_name,
    new.customer_phone,
    new.delivery_address,
    new.notes,
    new.delivery_team_id,
    new.driver_id,
    new.vehicle_id,
    new.requested_delivery_date,
    total_weight,
    total_items,
    new.created_by
  )
  returning id into new_job_id;

  insert into public.delivery_job_orders (job_id, delivery_order_id)
  values (new_job_id, new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists create_delivery_job_after_delivery_order on public.delivery_orders;
create trigger create_delivery_job_after_delivery_order
after insert
on public.delivery_orders
for each row
execute function public.create_delivery_job_for_standalone_delivery();

create or replace function public.refresh_delivery_job_totals_from_delivery_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_job_id uuid;
  target_order_id uuid;
begin
  if tg_op = 'DELETE' then
    target_order_id := old.order_id;
  else
    target_order_id := new.order_id;
  end if;

  select job_id
  into target_job_id
  from public.delivery_job_orders
  where delivery_order_id = target_order_id
  limit 1;

  if target_job_id is not null then
    update public.delivery_jobs
    set
      total_weight_kg = coalesce((
        select sum(weight_kg)
        from public.delivery_order_items
        where order_id = target_order_id
      ), 0),
      item_count = coalesce((
        select sum(greatest(quantity, 1))::integer
        from public.delivery_order_items
        where order_id = target_order_id
      ), 0),
      updated_at = now()
    where id = target_job_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists refresh_delivery_job_totals_on_delivery_item on public.delivery_order_items;
create trigger refresh_delivery_job_totals_on_delivery_item
after insert or update or delete
on public.delivery_order_items
for each row
execute function public.refresh_delivery_job_totals_from_delivery_item();

drop function if exists public.complete_customer_order_delivery_with_proof(
  uuid,
  uuid,
  text,
  numeric,
  numeric
);

create or replace function public.complete_customer_order_delivery_with_proof(
  p_order_id uuid,
  p_file_id uuid,
  p_receiver_name text,
  p_latitude numeric,
  p_longitude numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.customer_orders%rowtype;
begin
  select *
  into target_order
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Customer order was not found.';
  end if;

  if not target_order.delivery_required then
    raise exception 'Only delivery-required customer orders can receive proof photos.';
  end if;

  if target_order.status::text not in ('OUT_FOR_DELIVERY', 'DELIVERED') then
    raise exception 'Proof photos can only complete customer orders after they are out for delivery.';
  end if;

  if not (
    public.can_operate_customer_order_delivery()
    and public.can_access_work_scope(target_order.outlet_id, target_order.department_id)
    and public.can_access_outlet_module(target_order.outlet_id, 'delivery')
  ) then
    raise exception 'You cannot upload proof for this customer-order delivery.';
  end if;

  update public.customer_orders
  set
    proof_file_id = p_file_id,
    proof_receiver_name = nullif(trim(p_receiver_name), ''),
    proof_latitude = p_latitude,
    proof_longitude = p_longitude,
    proof_uploaded_at = now(),
    status = 'DELIVERED',
    updated_by = auth.uid()
  where id = p_order_id;

  if target_order.customer_id is not null
    and p_latitude is not null
    and p_longitude is not null then
    insert into public.delivery_address_suggestions (
      order_id,
      customer_id,
      customer_name,
      suggested_address,
      suggested_latitude,
      suggested_longitude,
      reason,
      status,
      created_by
    )
    values (
      p_order_id,
      target_order.customer_id,
      target_order.customer_name,
      target_order.remarks,
      p_latitude,
      p_longitude,
      'Proof GPS captured during delivery. Manager review required before updating customer master.',
      'PENDING',
      auth.uid()
    );
  end if;
end;
$$;

grant execute on function public.complete_customer_order_delivery_with_proof(
  uuid,
  uuid,
  text,
  numeric,
  numeric
) to authenticated;

alter table public.delivery_jobs enable row level security;
alter table public.delivery_job_orders enable row level security;
alter table public.delivery_goods_issues enable row level security;
alter table public.delivery_address_suggestions enable row level security;
alter table public.delivery_expenses enable row level security;
alter table public.delivery_truck_current_locations enable row level security;
alter table public.delivery_truck_location_trail enable row level security;

drop policy if exists "delivery users can read scoped jobs" on public.delivery_jobs;
create policy "delivery users can read scoped jobs"
on public.delivery_jobs for select to authenticated
using (
  driver_id = auth.uid()
  or public.can_manage_delivery_team(delivery_team_id)
);

drop policy if exists "delivery users can insert scoped jobs" on public.delivery_jobs;
create policy "delivery users can insert scoped jobs"
on public.delivery_jobs for insert to authenticated
with check (
  public.can_manage_delivery_team(delivery_team_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "delivery users can update scoped jobs" on public.delivery_jobs;
create policy "delivery users can update scoped jobs"
on public.delivery_jobs for update to authenticated
using (
  driver_id = auth.uid()
  or public.can_manage_delivery_team(delivery_team_id)
)
with check (
  driver_id = auth.uid()
  or public.can_manage_delivery_team(delivery_team_id)
);

drop policy if exists "delivery users can read job links" on public.delivery_job_orders;
create policy "delivery users can read job links"
on public.delivery_job_orders for select to authenticated
using (
  exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and (job.driver_id = auth.uid() or public.can_manage_delivery_team(job.delivery_team_id))
  )
);

drop policy if exists "delivery users can insert job links" on public.delivery_job_orders;
create policy "delivery users can insert job links"
on public.delivery_job_orders for insert to authenticated
with check (
  exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and public.can_manage_delivery_team(job.delivery_team_id)
  )
);

drop policy if exists "delivery users can read goods issues" on public.delivery_goods_issues;
create policy "delivery users can read goods issues"
on public.delivery_goods_issues for select to authenticated
using (
  reported_by = auth.uid()
  or exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and public.can_manage_delivery_team(job.delivery_team_id)
  )
);

drop policy if exists "delivery users can insert goods issues" on public.delivery_goods_issues;
create policy "delivery users can insert goods issues"
on public.delivery_goods_issues for insert to authenticated
with check (
  reported_by = auth.uid()
  and exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and (job.driver_id = auth.uid() or public.can_manage_delivery_team(job.delivery_team_id))
  )
);

drop policy if exists "delivery users can read address suggestions" on public.delivery_address_suggestions;
create policy "delivery users can read address suggestions"
on public.delivery_address_suggestions for select to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and public.can_manage_delivery_team(job.delivery_team_id)
  )
  or public.is_admin_or_director()
);

drop policy if exists "delivery users can insert address suggestions" on public.delivery_address_suggestions;
create policy "delivery users can insert address suggestions"
on public.delivery_address_suggestions for insert to authenticated
with check (created_by = auth.uid() or public.is_admin_or_director());

drop policy if exists "delivery managers can update address suggestions" on public.delivery_address_suggestions;
create policy "delivery managers can update address suggestions"
on public.delivery_address_suggestions for update to authenticated
using (public.has_role('delivery_manager') or public.has_role('admin'))
with check (public.has_role('delivery_manager') or public.has_role('admin'));

drop policy if exists "delivery users can read scoped expenses" on public.delivery_expenses;
create policy "delivery users can read scoped expenses"
on public.delivery_expenses for select to authenticated
using (
  driver_id = auth.uid()
  or public.can_manage_delivery_team(delivery_team_id)
);

drop policy if exists "delivery drivers can insert expenses" on public.delivery_expenses;
create policy "delivery drivers can insert expenses"
on public.delivery_expenses for insert to authenticated
with check (
  driver_id = auth.uid()
  and (created_by = auth.uid() or created_by is null)
  and public.can_manage_delivery_team(delivery_team_id)
);

drop policy if exists "delivery managers can update expenses" on public.delivery_expenses;
create policy "delivery managers can update expenses"
on public.delivery_expenses for update to authenticated
using (
  public.has_role('delivery_manager')
  and public.can_manage_delivery_team(delivery_team_id)
)
with check (
  public.has_role('delivery_manager')
  and public.can_manage_delivery_team(delivery_team_id)
);

drop policy if exists "delivery users can read truck current locations" on public.delivery_truck_current_locations;
create policy "delivery users can read truck current locations"
on public.delivery_truck_current_locations for select to authenticated
using (public.can_manage_delivery());

drop policy if exists "admins can write truck current locations" on public.delivery_truck_current_locations;
create policy "admins can write truck current locations"
on public.delivery_truck_current_locations for all to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "delivery users can read truck trails" on public.delivery_truck_location_trail;
create policy "delivery users can read truck trails"
on public.delivery_truck_location_trail for select to authenticated
using (
  synced_at >= now() - interval '3 days'
  and exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and job.status = 'OUT_FOR_DELIVERY'
      and (job.driver_id = auth.uid() or public.can_manage_delivery_team(job.delivery_team_id))
  )
);

drop policy if exists "admins can write truck trails" on public.delivery_truck_location_trail;
create policy "admins can write truck trails"
on public.delivery_truck_location_trail for all to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));
