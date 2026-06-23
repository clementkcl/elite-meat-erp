alter type public.delivery_status add value if not exists 'AVAILABLE';
alter type public.delivery_status add value if not exists 'ACCEPTED';
alter type public.delivery_status add value if not exists 'LOADED';

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_no text not null unique,
  vehicle_type text not null default 'LORRY',
  capacity_kg numeric(12, 3),
  is_active boolean not null default true,
  delivery_team_id uuid references public.departments(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicles
  add column if not exists delivery_team_id uuid references public.departments(id) on delete set null,
  add column if not exists default_driver_id uuid references public.profiles(id) on delete set null;

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_no text not null unique,
  delivery_type text not null default 'CUSTOMER_DELIVERY'
    check (delivery_type in ('CUSTOMER_DELIVERY', 'INTERNAL_TRANSFER_DELIVERY', 'RETURN_COLLECTION')),
  status text not null default 'AVAILABLE'
    check (status in ('AVAILABLE', 'ACCEPTED', 'LOADED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED')),
  outlet_id uuid references public.outlets(id) on delete set null,
  delivery_team_id uuid references public.departments(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null,
  default_vehicle_id uuid references public.vehicles(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  delivery_address text,
  delivery_note text,
  total_weight_kg numeric(12, 3) not null default 0 check (total_weight_kg >= 0),
  item_count integer not null default 0 check (item_count >= 0),
  completed_latitude numeric(10, 7),
  completed_longitude numeric(10, 7),
  gps_unavailable boolean not null default false,
  failed_reason text
    check (failed_reason is null or failed_reason in ('CUSTOMER_NOT_AVAILABLE', 'WRONG_ADDRESS', 'CUSTOMER_REJECTED', 'GOODS_ISSUE', 'VEHICLE_ISSUE', 'OTHER')),
  remarks text,
  requested_delivery_date date,
  accepted_at timestamptz,
  loaded_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_name text not null,
  customer_phone text,
  customer_location text,
  delivery_address text,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null,
  status public.delivery_status not null default 'PENDING',
  requested_delivery_date date,
  proof_file_id uuid references public.files(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_orders
  add column if not exists delivery_id uuid references public.deliveries(id) on delete set null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists outlet_id uuid references public.outlets(id) on delete set null,
  add column if not exists delivery_team_id uuid references public.departments(id) on delete set null,
  add column if not exists source_customer_order_id uuid references public.customer_orders(id) on delete set null,
  add column if not exists order_note text,
  add column if not exists order_sequence integer not null default 1;

create table if not exists public.delivery_items (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references public.deliveries(id) on delete cascade,
  delivery_order_id uuid references public.delivery_orders(id) on delete cascade,
  customer_order_id uuid references public.customer_orders(id) on delete set null,
  customer_order_item_id uuid references public.customer_order_items(id) on delete set null,
  item_id uuid references public.items(id) on delete set null,
  item_description text not null,
  quantity numeric(12, 3) not null default 0 check (quantity >= 0),
  weight_kg numeric(12, 3) not null default 0 check (weight_kg >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (delivery_id is not null or delivery_order_id is not null)
);

create table if not exists public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references public.deliveries(id) on delete cascade,
  delivery_order_id uuid references public.delivery_orders(id) on delete set null,
  customer_order_id uuid references public.customer_orders(id) on delete set null,
  proof_type text not null
    check (proof_type in ('DELIVERED', 'FAILED')),
  proof_file_id uuid references public.files(id) on delete set null,
  bucket_id text not null default 'delivery-proofs',
  object_path text,
  mime_type text,
  size_bytes bigint,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  gps_unavailable boolean not null default false,
  failed_reason text
    check (failed_reason is null or failed_reason in ('CUSTOMER_NOT_AVAILABLE', 'WRONG_ADDRESS', 'CUSTOMER_REJECTED', 'GOODS_ISSUE', 'VEHICLE_ISSUE', 'OTHER')),
  remarks text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (delivery_id is not null or delivery_order_id is not null or customer_order_id is not null)
);

alter table public.delivery_status_logs
  alter column order_id drop not null,
  add column if not exists delivery_id uuid references public.deliveries(id) on delete cascade,
  add column if not exists status_text text,
  add column if not exists driver_id uuid references public.profiles(id) on delete set null;

create table if not exists public.delivery_address_suggestions (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references public.deliveries(id) on delete set null,
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

alter table public.delivery_address_suggestions
  add column if not exists delivery_id uuid references public.deliveries(id) on delete set null;

create table if not exists public.delivery_expenses (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references public.deliveries(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  delivery_team_id uuid references public.departments(id) on delete set null,
  expense_type text not null
    check (expense_type in ('PETROL', 'PARKING', 'TOLL', 'VEHICLE_REPAIR', 'OTHER')),
  amount numeric(12, 2) not null check (amount > 0),
  receipt_file_id uuid references public.files(id) on delete set null,
  bucket_id text not null default 'delivery-expenses',
  object_path text,
  remark text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_expenses
  add column if not exists delivery_id uuid references public.deliveries(id) on delete set null,
  add column if not exists bucket_id text not null default 'delivery-expenses',
  add column if not exists object_path text;

create table if not exists public.truck_gps_snapshots (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete set null,
  provider_name text,
  provider_vehicle_ref text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  speed_kmh numeric(8, 2),
  fuel_percent numeric(5, 2),
  eta_minutes integer,
  delay_minutes integer,
  synced_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_deliveries_delivery_no on public.deliveries(delivery_no);
create index if not exists idx_deliveries_status_date on public.deliveries(status, requested_delivery_date desc);
create index if not exists idx_deliveries_driver_status on public.deliveries(driver_id, status);
create index if not exists idx_deliveries_customer on public.deliveries(customer_id, customer_name);
create index if not exists idx_deliveries_outlet_team on public.deliveries(outlet_id, delivery_team_id);
create index if not exists idx_deliveries_created_at on public.deliveries(created_at desc);
create index if not exists idx_delivery_orders_delivery on public.delivery_orders(delivery_id);
create index if not exists idx_delivery_orders_source_customer_order on public.delivery_orders(source_customer_order_id);
create index if not exists idx_delivery_orders_outlet_team on public.delivery_orders(outlet_id, delivery_team_id);
create index if not exists idx_delivery_items_delivery on public.delivery_items(delivery_id);
create index if not exists idx_delivery_items_delivery_order on public.delivery_items(delivery_order_id);
create index if not exists idx_delivery_proofs_delivery on public.delivery_proofs(delivery_id, created_at desc);
create index if not exists idx_delivery_status_logs_delivery on public.delivery_status_logs(delivery_id, created_at desc);
create index if not exists idx_delivery_address_suggestions_delivery_status on public.delivery_address_suggestions(delivery_id, status);
create index if not exists idx_delivery_expenses_driver_status on public.delivery_expenses(driver_id, status, created_at desc);
create index if not exists idx_truck_gps_snapshots_vehicle_sync on public.truck_gps_snapshots(vehicle_id, synced_at desc);
create index if not exists idx_truck_gps_snapshots_delivery_sync on public.truck_gps_snapshots(delivery_id, synced_at desc);

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('delivery-proofs', 'delivery-proofs', false, 52428800),
  ('delivery-expenses', 'delivery-expenses', false, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'vehicles',
    'deliveries',
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

create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.can_access_delivery_scope(
  target_outlet_id uuid,
  target_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (
      (
        public.has_role('delivery_team_general_worker')
        or public.has_role('delivery_manager')
      )
      and (target_outlet_id is not null or target_team_id is not null)
      and public.can_access_work_scope(target_outlet_id, target_team_id)
      and (
        target_outlet_id is null
        or public.can_access_outlet_module(target_outlet_id, 'delivery')
      )
    );
$$;

create or replace function public.can_review_delivery_scope(
  target_outlet_id uuid,
  target_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (
      public.has_role('delivery_manager')
      and (target_outlet_id is not null or target_team_id is not null)
      and public.can_access_work_scope(target_outlet_id, target_team_id)
      and (
        target_outlet_id is null
        or public.can_access_outlet_module(target_outlet_id, 'delivery')
      )
    );
$$;

create or replace function public.can_access_delivery(target_delivery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.deliveries delivery
    where delivery.id = target_delivery_id
      and (
        public.can_review_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
        or delivery.driver_id = auth.uid()
        or (
          delivery.status = 'AVAILABLE'
          and public.can_access_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
        )
      )
  );
$$;

create or replace function public.can_mutate_delivery(target_delivery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.deliveries delivery
    where delivery.id = target_delivery_id
      and (
        public.can_review_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
        or delivery.driver_id = auth.uid()
        or (
          delivery.status = 'AVAILABLE'
          and public.can_access_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
        )
      )
  );
$$;

create or replace function public.can_access_delivery_job(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.delivery_jobs job
    where job.id = target_job_id
      and (
        public.can_review_delivery_scope(job.outlet_id, job.delivery_team_id)
        or job.driver_id = auth.uid()
        or (
          job.status = 'AVAILABLE'
          and public.can_access_delivery_scope(job.outlet_id, job.delivery_team_id)
        )
      )
  );
$$;

create or replace function public.can_access_delivery_order_record(target_delivery_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.delivery_orders delivery_order
    left join public.deliveries delivery on delivery.id = delivery_order.delivery_id
    where delivery_order.id = target_delivery_order_id
      and (
        public.can_access_delivery(delivery.id)
        or public.can_review_delivery_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
        or delivery_order.driver_id = auth.uid()
        or public.can_access_delivery_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
      )
  );
$$;

create or replace function public.can_access_delivery_storage_object(
  target_bucket_id text,
  target_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when target_bucket_id = 'delivery-proofs' then
      public.can_access_delivery(public.safe_uuid((storage.foldername(target_name))[1]))
      or public.can_access_delivery_job(public.safe_uuid((storage.foldername(target_name))[1]))
    when target_bucket_id = 'delivery-expenses' then
      auth.uid()::text = (storage.foldername(target_name))[1]
      or exists (
        select 1
        from public.profiles profile
        where profile.id = public.safe_uuid((storage.foldername(target_name))[1])
          and public.can_review_delivery_scope(profile.outlet_id, profile.department_id)
      )
    else false
  end;
$$;

alter table public.deliveries enable row level security;
alter table public.delivery_orders enable row level security;
alter table public.delivery_items enable row level security;
alter table public.delivery_proofs enable row level security;
alter table public.delivery_status_logs enable row level security;
alter table public.delivery_address_suggestions enable row level security;
alter table public.delivery_expenses enable row level security;
alter table public.truck_gps_snapshots enable row level security;

drop policy if exists "delivery users can read scoped deliveries" on public.deliveries;
create policy "delivery users can read scoped deliveries"
on public.deliveries for select to authenticated
using (public.can_access_delivery(id));

drop policy if exists "delivery users can insert scoped deliveries" on public.deliveries;
create policy "delivery users can insert scoped deliveries"
on public.deliveries for insert to authenticated
with check (
  public.can_review_delivery_scope(outlet_id, delivery_team_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "delivery users can update scoped deliveries" on public.deliveries;
create policy "delivery users can update scoped deliveries"
on public.deliveries for update to authenticated
using (public.can_mutate_delivery(id))
with check (
  public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or driver_id = auth.uid()
);

drop policy if exists "delivery admins can delete scoped deliveries" on public.deliveries;
create policy "delivery admins can delete scoped deliveries"
on public.deliveries for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "delivery users can read canonical delivery orders" on public.delivery_orders;
create policy "delivery users can read canonical delivery orders"
on public.delivery_orders for select to authenticated
using (
  public.can_access_delivery_order_record(id)
  or (
    delivery_id is not null
    and public.can_access_delivery(delivery_id)
  )
);

drop policy if exists "delivery users can insert canonical delivery orders" on public.delivery_orders;
create policy "delivery users can insert canonical delivery orders"
on public.delivery_orders for insert to authenticated
with check (
  (
    delivery_id is not null
    and public.can_mutate_delivery(delivery_id)
  )
  or public.can_review_delivery_scope(outlet_id, delivery_team_id)
);

drop policy if exists "delivery users can update canonical delivery orders" on public.delivery_orders;
create policy "delivery users can update canonical delivery orders"
on public.delivery_orders for update to authenticated
using (
  (
    delivery_id is not null
    and public.can_mutate_delivery(delivery_id)
  )
  or public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or driver_id = auth.uid()
)
with check (
  (
    delivery_id is not null
    and public.can_mutate_delivery(delivery_id)
  )
  or public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or driver_id = auth.uid()
);

drop policy if exists "delivery users can read scoped orders" on public.delivery_orders;
create policy "delivery users can read scoped orders"
on public.delivery_orders for select to authenticated
using (
  (
    delivery_id is not null
    and public.can_access_delivery(delivery_id)
  )
  or driver_id = auth.uid()
  or public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or (
    status::text in ('AVAILABLE', 'PENDING')
    and driver_id is null
    and public.can_access_delivery_scope(outlet_id, delivery_team_id)
  )
);

drop policy if exists "delivery users can insert scoped orders" on public.delivery_orders;
create policy "delivery users can insert scoped orders"
on public.delivery_orders for insert to authenticated
with check (
  public.can_review_delivery_scope(outlet_id, delivery_team_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "delivery users can update scoped orders" on public.delivery_orders;
create policy "delivery users can update scoped orders"
on public.delivery_orders for update to authenticated
using (
  driver_id = auth.uid()
  or public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or (
    delivery_id is not null
    and public.can_mutate_delivery(delivery_id)
  )
)
with check (
  driver_id = auth.uid()
  or public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or (
    delivery_id is not null
    and public.can_mutate_delivery(delivery_id)
  )
);

drop policy if exists "delivery admins can delete scoped orders" on public.delivery_orders;
create policy "delivery admins can delete scoped orders"
on public.delivery_orders for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "delivery users can read delivery items" on public.delivery_items;
create policy "delivery users can read delivery items"
on public.delivery_items for select to authenticated
using (
  (delivery_id is not null and public.can_access_delivery(delivery_id))
  or (delivery_order_id is not null and public.can_access_delivery_order_record(delivery_order_id))
);

drop policy if exists "delivery users can insert delivery items" on public.delivery_items;
create policy "delivery users can insert delivery items"
on public.delivery_items for insert to authenticated
with check (
  (delivery_id is not null and public.can_mutate_delivery(delivery_id))
  or (delivery_order_id is not null and public.can_access_delivery_order_record(delivery_order_id))
);

drop policy if exists "delivery users can update delivery items" on public.delivery_items;
create policy "delivery users can update delivery items"
on public.delivery_items for update to authenticated
using (
  (delivery_id is not null and public.can_mutate_delivery(delivery_id))
  or (delivery_order_id is not null and public.can_access_delivery_order_record(delivery_order_id))
)
with check (
  (delivery_id is not null and public.can_mutate_delivery(delivery_id))
  or (delivery_order_id is not null and public.can_access_delivery_order_record(delivery_order_id))
);

drop policy if exists "delivery users can read scoped order items" on public.delivery_order_items;
create policy "delivery users can read scoped order items"
on public.delivery_order_items for select to authenticated
using (exists (
  select 1
  from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_access_delivery_order_record(delivery_order.id)
));

drop policy if exists "delivery users can insert scoped order items" on public.delivery_order_items;
create policy "delivery users can insert scoped order items"
on public.delivery_order_items for insert to authenticated
with check (exists (
  select 1
  from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_review_delivery_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
));

drop policy if exists "delivery users can update scoped order items" on public.delivery_order_items;
create policy "delivery users can update scoped order items"
on public.delivery_order_items for update to authenticated
using (exists (
  select 1
  from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_access_delivery_order_record(delivery_order.id)
))
with check (exists (
  select 1
  from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_access_delivery_order_record(delivery_order.id)
));

drop policy if exists "delivery admins can delete scoped order items" on public.delivery_order_items;
create policy "delivery admins can delete scoped order items"
on public.delivery_order_items for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "delivery users can read delivery proofs" on public.delivery_proofs;
create policy "delivery users can read delivery proofs"
on public.delivery_proofs for select to authenticated
using (
  (delivery_id is not null and public.can_access_delivery(delivery_id))
  or (delivery_order_id is not null and public.can_access_delivery_order_record(delivery_order_id))
  or (uploaded_by = auth.uid())
);

drop policy if exists "delivery users can insert delivery proofs" on public.delivery_proofs;
create policy "delivery users can insert delivery proofs"
on public.delivery_proofs for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and (
    (delivery_id is not null and public.can_mutate_delivery(delivery_id))
    or (delivery_order_id is not null and public.can_access_delivery_order_record(delivery_order_id))
  )
);

drop policy if exists "delivery users can read canonical status logs" on public.delivery_status_logs;
create policy "delivery users can read canonical status logs"
on public.delivery_status_logs for select to authenticated
using (
  (delivery_id is not null and public.can_access_delivery(delivery_id))
  or (order_id is not null and public.can_access_delivery_order_record(order_id))
);

drop policy if exists "delivery users can insert canonical status logs" on public.delivery_status_logs;
create policy "delivery users can insert canonical status logs"
on public.delivery_status_logs for insert to authenticated
with check (
  (delivery_id is not null and public.can_mutate_delivery(delivery_id))
  or (order_id is not null and public.can_access_delivery_order_record(order_id))
);

drop policy if exists "delivery users can read scoped status logs" on public.delivery_status_logs;
create policy "delivery users can read scoped status logs"
on public.delivery_status_logs for select to authenticated
using (
  (delivery_id is not null and public.can_access_delivery(delivery_id))
  or (order_id is not null and public.can_access_delivery_order_record(order_id))
);

drop policy if exists "delivery users can insert scoped status logs" on public.delivery_status_logs;
create policy "delivery users can insert scoped status logs"
on public.delivery_status_logs for insert to authenticated
with check (
  (delivery_id is not null and public.can_mutate_delivery(delivery_id))
  or (order_id is not null and public.can_access_delivery_order_record(order_id))
);

drop policy if exists "delivery admins can delete scoped status logs" on public.delivery_status_logs;
create policy "delivery admins can delete scoped status logs"
on public.delivery_status_logs for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "delivery users can read canonical address suggestions" on public.delivery_address_suggestions;
create policy "delivery users can read canonical address suggestions"
on public.delivery_address_suggestions for select to authenticated
using (
  created_by = auth.uid()
  or public.is_admin_or_director()
  or (delivery_id is not null and public.can_access_delivery(delivery_id))
);

drop policy if exists "delivery users can insert canonical address suggestions" on public.delivery_address_suggestions;
create policy "delivery users can insert canonical address suggestions"
on public.delivery_address_suggestions for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    delivery_id is null
    or public.can_mutate_delivery(delivery_id)
  )
);

drop policy if exists "delivery managers can update canonical address suggestions" on public.delivery_address_suggestions;
create policy "delivery managers can update canonical address suggestions"
on public.delivery_address_suggestions for update to authenticated
using (
  public.is_admin_or_director()
  or (delivery_id is not null and exists (
    select 1
    from public.deliveries delivery
    where delivery.id = delivery_id
      and public.can_review_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
  ))
)
with check (
  public.is_admin_or_director()
  or (delivery_id is not null and exists (
    select 1
    from public.deliveries delivery
    where delivery.id = delivery_id
      and public.can_review_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
  ))
);

drop policy if exists "delivery users can read canonical expenses" on public.delivery_expenses;
create policy "delivery users can read canonical expenses"
on public.delivery_expenses for select to authenticated
using (
  driver_id = auth.uid()
  or public.can_review_delivery_scope(null, delivery_team_id)
  or (delivery_id is not null and public.can_access_delivery(delivery_id))
);

drop policy if exists "delivery drivers can insert canonical expenses" on public.delivery_expenses;
create policy "delivery drivers can insert canonical expenses"
on public.delivery_expenses for insert to authenticated
with check (
  driver_id = auth.uid()
  and (created_by = auth.uid() or created_by is null)
  and (
    public.can_access_delivery_scope(null, delivery_team_id)
    or (delivery_id is not null and public.can_mutate_delivery(delivery_id))
  )
);

drop policy if exists "delivery managers can update canonical expenses" on public.delivery_expenses;
create policy "delivery managers can update canonical expenses"
on public.delivery_expenses for update to authenticated
using (
  public.can_review_delivery_scope(null, delivery_team_id)
  or public.is_admin_or_director()
)
with check (
  public.can_review_delivery_scope(null, delivery_team_id)
  or public.is_admin_or_director()
);

drop policy if exists "delivery users can read truck gps snapshots" on public.truck_gps_snapshots;
create policy "delivery users can read truck gps snapshots"
on public.truck_gps_snapshots for select to authenticated
using (
  synced_at >= now() - interval '3 days'
  and (
    delivery_id is null
    or public.can_access_delivery(delivery_id)
  )
);

drop policy if exists "admins can write truck gps snapshots" on public.truck_gps_snapshots;
create policy "admins can write truck gps snapshots"
on public.truck_gps_snapshots for all to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "delivery users can read proof bucket" on storage.objects;
create policy "delivery users can read proof bucket"
on storage.objects for select to authenticated
using (
  bucket_id = 'delivery-proofs'
  and public.can_access_delivery_storage_object(bucket_id, name)
);

drop policy if exists "delivery users can upload proof bucket" on storage.objects;
create policy "delivery users can upload proof bucket"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'delivery-proofs'
  and public.can_access_delivery_storage_object(bucket_id, name)
);

drop policy if exists "delivery users can read expense bucket" on storage.objects;
create policy "delivery users can read expense bucket"
on storage.objects for select to authenticated
using (
  bucket_id = 'delivery-expenses'
  and public.can_access_delivery_storage_object(bucket_id, name)
);

drop policy if exists "delivery users can upload expense bucket" on storage.objects;
create policy "delivery users can upload expense bucket"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'delivery-expenses'
  and public.can_access_delivery_storage_object(bucket_id, name)
);
