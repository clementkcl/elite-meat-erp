-- Stock schema repair for deployments that missed one or more Stock V1 migrations.
-- Safe to re-run. This migration does not drop tables or existing data.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter type public.stock_movement_type add value if not exists 'OUTBOUND_PROCESSING';
alter type public.stock_movement_type add value if not exists 'OUTBOUND_SPOILED';
alter type public.stock_movement_type add value if not exists 'OUTBOUND_RETURN_SUPPLIER';
alter type public.stock_movement_type add value if not exists 'OUTBOUND_SAMPLE_TESTING';
alter type public.stock_movement_type add value if not exists 'INBOUND_VOID';

alter type public.stock_unit_status add value if not exists 'HOLD';
alter type public.stock_unit_status add value if not exists 'INSPECTION';
alter type public.stock_unit_status add value if not exists 'HOLD_RETURN_SUPPLIER';
alter type public.stock_unit_status add value if not exists 'VOIDED';

alter table public.profiles
  add column if not exists stock_location_id uuid references public.stock_locations(id) on delete set null;

create index if not exists idx_profiles_stock_location
on public.profiles(stock_location_id);

create or replace function public.is_admin_or_director()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('director');
$$;

create or replace function public.current_profile_stock_location_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select stock_location_id from public.profiles where id = auth.uid();
$$;

create or replace function public.can_access_stock_location(target_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (
      target_location_id is not null
      and target_location_id = public.current_profile_stock_location_id()
    );
$$;

create or replace function public.can_access_stock_unit(
  target_location_id uuid,
  target_transfer_to_location_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or public.can_access_stock_location(target_location_id)
    or public.can_access_stock_location(target_transfer_to_location_id);
$$;

create or replace function public.can_access_stock_movement(
  target_from_location_id uuid,
  target_to_location_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or public.can_access_stock_location(target_from_location_id)
    or public.can_access_stock_location(target_to_location_id);
$$;

create or replace function public.can_manage_stock_take()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_manager')
    or public.has_role('delivery_manager')
    or public.has_role('processing_manager')
    or public.has_role('admin');
$$;

create or replace function public.can_director_approve_stock_take()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('director')
    or public.has_role('admin');
$$;

alter table public.items
  add column if not exists chinese_name text,
  add column if not exists iban_name text,
  add column if not exists default_brand_id uuid references public.brands(id) on delete set null,
  add column if not exists default_low_stock_level numeric(12, 3) not null default 0;

create index if not exists idx_items_default_brand
on public.items(default_brand_id);

alter table public.stock_locations
  add column if not exists outlet_id uuid references public.outlets(id) on delete set null,
  add column if not exists is_default_for_outlet boolean not null default false;

create index if not exists idx_stock_locations_outlet
on public.stock_locations(outlet_id)
where outlet_id is not null;

create unique index if not exists idx_stock_locations_one_default_per_outlet
on public.stock_locations(outlet_id)
where outlet_id is not null
  and is_default_for_outlet;

create or replace function public.is_default_outlet_stock_location(
  target_location_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stock_locations location
    where location.id = target_location_id
      and location.is_active
      and (
        location.outlet_id is null
        or location.is_default_for_outlet
      )
  );
$$;

alter table public.stock_units
  add column if not exists transfer_to_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists inbound_source text not null default 'supplier_import',
  add column if not exists batch_no text,
  add column if not exists sold_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.stock_units
  drop constraint if exists stock_units_inbound_source_check;

alter table public.stock_units
  add constraint stock_units_inbound_source_check
  check (
    inbound_source in (
      'supplier_import',
      'processing_output',
      'customer_return',
      'transfer_received',
      'manual_adjustment',
      'other',
      'return',
      'transfer'
    )
  ) not valid;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  movement_type public.stock_movement_type not null,
  item_id uuid not null references public.items(id) on delete restrict,
  stock_unit_id uuid references public.stock_units(id) on delete set null,
  barcode text,
  from_location_id uuid references public.stock_locations(id) on delete set null,
  to_location_id uuid references public.stock_locations(id) on delete set null,
  quantity numeric(12, 3) not null default 1,
  weight_kg numeric(12, 3) not null default 0,
  reference_no text,
  notes text,
  source_type text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.stock_movements
  add column if not exists movement_type public.stock_movement_type,
  add column if not exists item_id uuid references public.items(id) on delete restrict,
  add column if not exists stock_unit_id uuid references public.stock_units(id) on delete set null,
  add column if not exists barcode text,
  add column if not exists from_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists to_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists quantity numeric(12, 3) not null default 1,
  add column if not exists weight_kg numeric(12, 3) not null default 0,
  add column if not exists reference_no text,
  add column if not exists notes text,
  add column if not exists source_type text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

alter table public.stock_movements
  drop constraint if exists stock_movements_source_type_check;

alter table public.stock_movements
  add constraint stock_movements_source_type_check
  check (
    source_type is null
    or source_type in (
      'supplier_import',
      'processing_output',
      'customer_return',
      'transfer_received',
      'manual_adjustment',
      'other',
      'return',
      'transfer',
      'sales',
      'direct_sales',
      'processing',
      'damage_spoilage',
      'return_supplier',
      'sample_testing'
    )
  ) not valid;

create index if not exists idx_stock_movements_created_at
on public.stock_movements(created_at desc);

create index if not exists idx_stock_movements_type
on public.stock_movements(movement_type);

create table if not exists public.barcode_scan_logs (
  id uuid primary key default gen_random_uuid(),
  barcode text not null,
  action public.stock_movement_type not null,
  success boolean not null default false,
  message text,
  scanned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.barcode_scan_logs
  add column if not exists barcode text,
  add column if not exists action public.stock_movement_type,
  add column if not exists success boolean not null default false,
  add column if not exists message text,
  add column if not exists scanned_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_barcode_scan_logs_created_at
on public.barcode_scan_logs(created_at desc);

create index if not exists idx_barcode_scan_logs_barcode
on public.barcode_scan_logs(barcode);

create table if not exists public.stock_take_sessions (
  id uuid primary key default gen_random_uuid(),
  session_no text not null unique,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  item_id uuid references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  status public.stock_take_status not null default 'DRAFT',
  created_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  manager_reviewed_by uuid references public.profiles(id) on delete set null,
  manager_reviewed_at timestamptz,
  manager_signature text,
  director_approved_by uuid references public.profiles(id) on delete set null,
  director_approved_at timestamptz,
  director_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stock_take_sessions
  add column if not exists session_no text,
  add column if not exists location_id uuid references public.stock_locations(id) on delete restrict,
  add column if not exists item_id uuid references public.items(id) on delete restrict,
  add column if not exists brand_id uuid references public.brands(id) on delete set null,
  add column if not exists status public.stock_take_status not null default 'DRAFT',
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists manager_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists manager_reviewed_at timestamptz,
  add column if not exists manager_signature text,
  add column if not exists director_approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists director_approved_at timestamptz,
  add column if not exists director_signature text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.stock_take_sessions
set
  manager_reviewed_at = coalesce(manager_reviewed_at, reviewed_at),
  director_approved_at = coalesce(director_approved_at, approved_at),
  director_approved_by = coalesce(director_approved_by, approved_by)
where reviewed_at is not null
   or approved_at is not null
   or approved_by is not null;

create unique index if not exists idx_stock_take_sessions_session_no_unique
on public.stock_take_sessions(session_no);

create index if not exists idx_stock_take_sessions_scope_status
on public.stock_take_sessions(location_id, item_id, brand_id, status);

create table if not exists public.stock_take_lines (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.stock_take_sessions(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  barcode text,
  system_count numeric(12, 3) not null default 0,
  actual_count numeric(12, 3) not null default 0,
  variance_count numeric(12, 3) generated always as (actual_count - system_count) stored,
  system_weight_kg numeric(12, 3) not null default 0,
  actual_weight_kg numeric(12, 3) not null default 0,
  variance_weight_kg numeric(12, 3) generated always as (actual_weight_kg - system_weight_kg) stored,
  exception_type text,
  exception_status text,
  exception_location_id uuid references public.stock_locations(id) on delete set null,
  source_stock_unit_id uuid references public.stock_units(id) on delete set null,
  resolved_stock_unit_id uuid references public.stock_units(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.stock_take_lines
  add column if not exists session_id uuid references public.stock_take_sessions(id) on delete cascade,
  add column if not exists item_id uuid references public.items(id) on delete restrict,
  add column if not exists brand_id uuid references public.brands(id) on delete set null,
  add column if not exists origin_id uuid references public.origins(id) on delete set null,
  add column if not exists barcode text,
  add column if not exists system_count numeric(12, 3) not null default 0,
  add column if not exists actual_count numeric(12, 3) not null default 0,
  add column if not exists variance_count numeric(12, 3) generated always as (actual_count - system_count) stored,
  add column if not exists system_weight_kg numeric(12, 3) not null default 0,
  add column if not exists actual_weight_kg numeric(12, 3) not null default 0,
  add column if not exists variance_weight_kg numeric(12, 3) generated always as (actual_weight_kg - system_weight_kg) stored,
  add column if not exists exception_type text,
  add column if not exists exception_status text,
  add column if not exists exception_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists source_stock_unit_id uuid references public.stock_units(id) on delete set null,
  add column if not exists resolved_stock_unit_id uuid references public.stock_units(id) on delete set null,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now();

alter table public.stock_take_lines
  drop constraint if exists stock_take_lines_exception_type_check;

alter table public.stock_take_lines
  add constraint stock_take_lines_exception_type_check
  check (exception_type is null or exception_type in ('UNKNOWN_BARCODE', 'WRONG_LOCATION')) not valid;

alter table public.stock_take_lines
  drop constraint if exists stock_take_lines_exception_status_check;

alter table public.stock_take_lines
  add constraint stock_take_lines_exception_status_check
  check (exception_status is null or exception_status in ('PENDING', 'RESOLVED')) not valid;

create index if not exists idx_stock_take_lines_session
on public.stock_take_lines(session_id);

create index if not exists idx_stock_take_lines_exception
on public.stock_take_lines(session_id, exception_type, exception_status);

create table if not exists public.stock_damage_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique,
  stock_unit_id uuid not null references public.stock_units(id) on delete restrict,
  barcode text not null,
  item_id uuid not null references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  reason text not null,
  status text not null default 'SUBMITTED',
  photo_path text not null,
  notes text,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  manager_reviewed_by uuid references public.profiles(id) on delete set null,
  manager_reviewed_at timestamptz,
  manager_signature text,
  director_approved_by uuid references public.profiles(id) on delete set null,
  director_approved_at timestamptz,
  director_signature text,
  movement_id uuid references public.stock_movements(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stock_damage_requests
  add column if not exists request_no text,
  add column if not exists stock_unit_id uuid references public.stock_units(id) on delete restrict,
  add column if not exists barcode text,
  add column if not exists item_id uuid references public.items(id) on delete restrict,
  add column if not exists brand_id uuid references public.brands(id) on delete set null,
  add column if not exists origin_id uuid references public.origins(id) on delete set null,
  add column if not exists location_id uuid references public.stock_locations(id) on delete restrict,
  add column if not exists reason text,
  add column if not exists status text not null default 'SUBMITTED',
  add column if not exists photo_path text,
  add column if not exists notes text,
  add column if not exists requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists requested_at timestamptz not null default now(),
  add column if not exists manager_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists manager_reviewed_at timestamptz,
  add column if not exists manager_signature text,
  add column if not exists director_approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists director_approved_at timestamptz,
  add column if not exists director_signature text,
  add column if not exists movement_id uuid references public.stock_movements(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.stock_damage_requests
  drop constraint if exists stock_damage_requests_reason_check;

alter table public.stock_damage_requests
  add constraint stock_damage_requests_reason_check
  check (
    reason in (
      'expired',
      'broken_packaging',
      'smell',
      'wrong_temperature',
      'customer_rejected',
      'other'
    )
  ) not valid;

alter table public.stock_damage_requests
  drop constraint if exists stock_damage_requests_status_check;

alter table public.stock_damage_requests
  add constraint stock_damage_requests_status_check
  check (
    status in (
      'SUBMITTED',
      'MANAGER_REVIEWED',
      'DIRECTOR_APPROVED',
      'REJECTED'
    )
  ) not valid;

create unique index if not exists idx_stock_damage_requests_request_no_unique
on public.stock_damage_requests(request_no);

create index if not exists idx_stock_damage_requests_scope_status
on public.stock_damage_requests(location_id, status, requested_at desc);

create index if not exists idx_stock_damage_requests_unit_status
on public.stock_damage_requests(stock_unit_id, status);

create unique index if not exists idx_stock_damage_requests_open_unit
on public.stock_damage_requests(stock_unit_id)
where status in ('SUBMITTED', 'MANAGER_REVIEWED');

create table if not exists public.stock_return_supplier_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique,
  stock_unit_id uuid not null references public.stock_units(id) on delete restrict,
  barcode text not null,
  item_id uuid not null references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  supplier_name text not null,
  status text not null default 'SUBMITTED',
  notes text,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  manager_reviewed_by uuid references public.profiles(id) on delete set null,
  manager_reviewed_at timestamptz,
  manager_signature text,
  movement_id uuid references public.stock_movements(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stock_return_supplier_requests
  add column if not exists request_no text,
  add column if not exists stock_unit_id uuid references public.stock_units(id) on delete restrict,
  add column if not exists barcode text,
  add column if not exists item_id uuid references public.items(id) on delete restrict,
  add column if not exists brand_id uuid references public.brands(id) on delete set null,
  add column if not exists origin_id uuid references public.origins(id) on delete set null,
  add column if not exists location_id uuid references public.stock_locations(id) on delete restrict,
  add column if not exists supplier_name text,
  add column if not exists status text not null default 'SUBMITTED',
  add column if not exists notes text,
  add column if not exists requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists requested_at timestamptz not null default now(),
  add column if not exists manager_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists manager_reviewed_at timestamptz,
  add column if not exists manager_signature text,
  add column if not exists movement_id uuid references public.stock_movements(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.stock_return_supplier_requests
  drop constraint if exists stock_return_supplier_requests_status_check;

alter table public.stock_return_supplier_requests
  add constraint stock_return_supplier_requests_status_check
  check (status in ('SUBMITTED', 'MANAGER_REVIEWED', 'REJECTED')) not valid;

create unique index if not exists idx_stock_return_supplier_requests_request_no_unique
on public.stock_return_supplier_requests(request_no);

create index if not exists idx_stock_return_supplier_requests_scope_status
on public.stock_return_supplier_requests(location_id, status, requested_at desc);

create index if not exists idx_stock_return_supplier_requests_unit_status
on public.stock_return_supplier_requests(stock_unit_id, status);

create unique index if not exists idx_stock_return_supplier_requests_open_unit
on public.stock_return_supplier_requests(stock_unit_id)
where status = 'SUBMITTED';

drop trigger if exists set_stock_units_updated_at on public.stock_units;
create trigger set_stock_units_updated_at
  before update on public.stock_units
  for each row execute function public.set_updated_at();

drop trigger if exists set_stock_take_sessions_updated_at on public.stock_take_sessions;
create trigger set_stock_take_sessions_updated_at
  before update on public.stock_take_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists set_stock_damage_requests_updated_at on public.stock_damage_requests;
create trigger set_stock_damage_requests_updated_at
  before update on public.stock_damage_requests
  for each row execute function public.set_updated_at();

drop trigger if exists set_stock_return_supplier_requests_updated_at on public.stock_return_supplier_requests;
create trigger set_stock_return_supplier_requests_updated_at
  before update on public.stock_return_supplier_requests
  for each row execute function public.set_updated_at();

create or replace function public.can_edit_stock_take_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin')
    or exists (
      select 1
      from public.stock_take_sessions sts
      where sts.id = target_session_id
        and sts.status = 'DRAFT'
        and public.can_manage_stock()
        and public.can_access_stock_location(sts.location_id)
    );
$$;

alter table public.stock_movements enable row level security;
alter table public.barcode_scan_logs enable row level security;
alter table public.stock_take_sessions enable row level security;
alter table public.stock_take_lines enable row level security;
alter table public.stock_damage_requests enable row level security;
alter table public.stock_return_supplier_requests enable row level security;

drop policy if exists "authenticated can read stock movements" on public.stock_movements;
drop policy if exists "stock operators can insert stock movements" on public.stock_movements;
drop policy if exists "stock users can read scoped movements" on public.stock_movements;
create policy "stock users can read scoped movements"
on public.stock_movements for select to authenticated
using (public.can_access_stock_movement(from_location_id, to_location_id));

drop policy if exists "stock users can insert scoped movements" on public.stock_movements;
create policy "stock users can insert scoped movements"
on public.stock_movements for insert to authenticated
with check (
  public.can_manage_stock()
  and (created_by = auth.uid() or created_by is null)
  and public.can_access_stock_movement(from_location_id, to_location_id)
);

drop policy if exists "stock admins can update stock movements" on public.stock_movements;
create policy "stock admins can update stock movements"
on public.stock_movements for update to authenticated
using (public.can_administer_stock())
with check (public.can_administer_stock());

drop policy if exists "stock admins can delete stock movements" on public.stock_movements;
create policy "stock admins can delete stock movements"
on public.stock_movements for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read scan logs" on public.barcode_scan_logs;
drop policy if exists "stock operators can insert scan logs" on public.barcode_scan_logs;
drop policy if exists "stock users can read own scan logs" on public.barcode_scan_logs;
create policy "stock users can read own scan logs"
on public.barcode_scan_logs for select to authenticated
using (public.can_administer_stock() or scanned_by = auth.uid());

drop policy if exists "stock users can insert own scan logs" on public.barcode_scan_logs;
create policy "stock users can insert own scan logs"
on public.barcode_scan_logs for insert to authenticated
with check (
  public.can_manage_stock()
  and (scanned_by = auth.uid() or scanned_by is null)
);

drop policy if exists "stock admins can update scan logs" on public.barcode_scan_logs;
create policy "stock admins can update scan logs"
on public.barcode_scan_logs for update to authenticated
using (public.can_administer_stock())
with check (public.can_administer_stock());

drop policy if exists "stock admins can delete scan logs" on public.barcode_scan_logs;
create policy "stock admins can delete scan logs"
on public.barcode_scan_logs for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock operators can create draft stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock operators can submit draft stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock admins can review approve or reject stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock users can read scoped stock take sessions" on public.stock_take_sessions;
create policy "stock users can read scoped stock take sessions"
on public.stock_take_sessions for select to authenticated
using (public.can_access_stock_location(location_id));

drop policy if exists "stock users can create scoped draft stock take sessions" on public.stock_take_sessions;
create policy "stock users can create scoped draft stock take sessions"
on public.stock_take_sessions for insert to authenticated
with check (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'DRAFT'
  and item_id is not null
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "stock users can submit scoped draft stock take sessions" on public.stock_take_sessions;
create policy "stock users can submit scoped draft stock take sessions"
on public.stock_take_sessions for update to authenticated
using (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and status = 'DRAFT'
)
with check (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and status in ('DRAFT', 'SUBMITTED')
  and manager_reviewed_at is null
  and director_approved_at is null
  and approved_by is null
  and approved_at is null
);

drop policy if exists "stock admins can review approve or reject stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock managers can review stock take sessions" on public.stock_take_sessions;
create policy "stock managers can review stock take sessions"
on public.stock_take_sessions for update to authenticated
using (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'SUBMITTED'
)
with check (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status in ('REVIEWED', 'REJECTED')
  and manager_reviewed_at is not null
  and manager_signature is not null
  and director_approved_at is null
);

drop policy if exists "stock directors can approve reviewed stock take sessions" on public.stock_take_sessions;
create policy "stock directors can approve reviewed stock take sessions"
on public.stock_take_sessions for update to authenticated
using (
  public.can_director_approve_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'REVIEWED'
)
with check (
  public.can_director_approve_stock_take()
  and public.can_access_stock_location(location_id)
  and status in ('APPROVED', 'REJECTED')
  and director_approved_at is not null
  and director_signature is not null
);

drop policy if exists "stock admins can delete stock take sessions" on public.stock_take_sessions;
create policy "stock admins can delete stock take sessions"
on public.stock_take_sessions for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read stock take lines" on public.stock_take_lines;
drop policy if exists "stock operators can insert draft stock take lines" on public.stock_take_lines;
drop policy if exists "stock operators can update draft stock take lines" on public.stock_take_lines;
drop policy if exists "stock users can read scoped stock take lines" on public.stock_take_lines;
create policy "stock users can read scoped stock take lines"
on public.stock_take_lines for select to authenticated
using (exists (
  select 1
  from public.stock_take_sessions session
  where session.id = session_id
    and public.can_access_stock_location(session.location_id)
));

drop policy if exists "stock users can insert scoped draft stock take lines" on public.stock_take_lines;
create policy "stock users can insert scoped draft stock take lines"
on public.stock_take_lines for insert to authenticated
with check (
  public.can_edit_stock_take_session(session_id)
  and exists (
    select 1
    from public.stock_take_sessions session
    where session.id = session_id
      and public.can_access_stock_location(session.location_id)
      and session.status = 'DRAFT'
      and session.item_id = stock_take_lines.item_id
      and session.brand_id is not distinct from stock_take_lines.brand_id
  )
);

drop policy if exists "stock users can update scoped draft stock take lines" on public.stock_take_lines;
create policy "stock users can update scoped draft stock take lines"
on public.stock_take_lines for update to authenticated
using (
  public.can_edit_stock_take_session(session_id)
  and exists (
    select 1
    from public.stock_take_sessions session
    where session.id = session_id
      and public.can_access_stock_location(session.location_id)
      and session.status = 'DRAFT'
  )
)
with check (
  public.can_edit_stock_take_session(session_id)
  and exists (
    select 1
    from public.stock_take_sessions session
    where session.id = session_id
      and public.can_access_stock_location(session.location_id)
      and session.status = 'DRAFT'
      and session.item_id = stock_take_lines.item_id
      and session.brand_id is not distinct from stock_take_lines.brand_id
  )
);

drop policy if exists "stock admins can delete stock take lines" on public.stock_take_lines;
create policy "stock admins can delete stock take lines"
on public.stock_take_lines for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "stock users can read scoped damage requests" on public.stock_damage_requests;
create policy "stock users can read scoped damage requests"
on public.stock_damage_requests for select to authenticated
using (public.can_access_stock_location(location_id));

drop policy if exists "stock users can create scoped damage requests" on public.stock_damage_requests;
create policy "stock users can create scoped damage requests"
on public.stock_damage_requests for insert to authenticated
with check (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and status = 'SUBMITTED'
  and photo_path <> ''
  and (requested_by = auth.uid() or requested_by is null)
);

drop policy if exists "stock managers can review damage requests" on public.stock_damage_requests;
create policy "stock managers can review damage requests"
on public.stock_damage_requests for update to authenticated
using (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'SUBMITTED'
)
with check (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status in ('MANAGER_REVIEWED', 'REJECTED')
  and manager_signature is not null
  and director_approved_at is null
);

drop policy if exists "stock directors can approve damage requests" on public.stock_damage_requests;
create policy "stock directors can approve damage requests"
on public.stock_damage_requests for update to authenticated
using (
  public.can_director_approve_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'MANAGER_REVIEWED'
)
with check (
  public.can_director_approve_stock_take()
  and public.can_access_stock_location(location_id)
  and status in ('DIRECTOR_APPROVED', 'REJECTED')
  and director_signature is not null
);

drop policy if exists "stock admins can delete damage requests" on public.stock_damage_requests;
create policy "stock admins can delete damage requests"
on public.stock_damage_requests for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "stock users can read scoped return supplier requests" on public.stock_return_supplier_requests;
create policy "stock users can read scoped return supplier requests"
on public.stock_return_supplier_requests for select to authenticated
using (public.can_access_stock_location(location_id));

drop policy if exists "stock users can create scoped return supplier requests" on public.stock_return_supplier_requests;
create policy "stock users can create scoped return supplier requests"
on public.stock_return_supplier_requests for insert to authenticated
with check (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and status = 'SUBMITTED'
  and supplier_name <> ''
  and (requested_by = auth.uid() or requested_by is null)
);

drop policy if exists "stock managers can review return supplier requests" on public.stock_return_supplier_requests;
create policy "stock managers can review return supplier requests"
on public.stock_return_supplier_requests for update to authenticated
using (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'SUBMITTED'
)
with check (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status in ('MANAGER_REVIEWED', 'REJECTED')
  and manager_signature is not null
);

drop policy if exists "stock admins can delete return supplier requests" on public.stock_return_supplier_requests;
create policy "stock admins can delete return supplier requests"
on public.stock_return_supplier_requests for delete to authenticated
using (public.can_administer_stock());

create or replace function public.approve_stock_damage_request(
  p_request_id uuid,
  p_director_signature text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.stock_damage_requests%rowtype;
  unit_record public.stock_units%rowtype;
  v_movement_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before approving damage requests.';
  end if;

  if not public.can_director_approve_stock_take() then
    raise exception 'Only director or admin can approve damage requests.';
  end if;

  if nullif(trim(p_director_signature), '') is null then
    raise exception 'Director damage approval signature is required.';
  end if;

  select *
  into request_record
  from public.stock_damage_requests
  where id = p_request_id
  for update;

  if request_record.id is null then
    raise exception 'Damage request was not found or is outside your scope.';
  end if;

  if request_record.status <> 'MANAGER_REVIEWED' then
    raise exception 'Only manager-reviewed damage requests can be approved.';
  end if;

  if not public.can_access_stock_location(request_record.location_id) then
    raise exception 'Your role cannot approve damage for another stock location.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where id = request_record.stock_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if unit_record.barcode <> request_record.barcode then
    raise exception 'Barcode does not match the selected stock unit.';
  end if;

  if unit_record.status not in ('IN_STOCK', 'TRANSFERRED', 'RETURNED') then
    raise exception 'Barcode is % and cannot be used for this action.', unit_record.status;
  end if;

  if unit_record.location_id <> request_record.location_id then
    raise exception 'Barcode location changed after damage request review.';
  end if;

  update public.stock_units
  set
    status = 'DAMAGED',
    transfer_to_location_id = null
  where id = unit_record.id;

  insert into public.stock_movements (
    movement_type,
    item_id,
    stock_unit_id,
    barcode,
    from_location_id,
    quantity,
    weight_kg,
    reference_no,
    notes,
    source_type,
    created_by
  )
  values (
    'OUTBOUND_SPOILED',
    request_record.item_id,
    request_record.stock_unit_id,
    request_record.barcode,
    request_record.location_id,
    1,
    unit_record.net_weight_kg,
    request_record.request_no,
    'Damage/spoilage approved: ' || request_record.reason,
    'damage_spoilage',
    current_user_id
  )
  returning id into v_movement_id;

  update public.stock_damage_requests
  set
    status = 'DIRECTOR_APPROVED',
    director_approved_by = current_user_id,
    director_approved_at = now(),
    director_signature = trim(p_director_signature),
    movement_id = v_movement_id
  where id = request_record.id;

  insert into public.barcode_scan_logs (
    barcode,
    action,
    success,
    message,
    scanned_by
  )
  values (
    request_record.barcode,
    'OUTBOUND_SPOILED',
    true,
    'Damage request approved and stock deducted',
    current_user_id
  );

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'DAMAGE_REQUEST_DIRECTOR_APPROVED',
    'stock_damage_requests',
    request_record.id::text,
    jsonb_build_object(
      'movementId', v_movement_id,
      'atomic', true
    )
  );

  return v_movement_id;
end;
$$;

create or replace function public.approve_stock_return_supplier_request(
  p_request_id uuid,
  p_manager_signature text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.stock_return_supplier_requests%rowtype;
  unit_record public.stock_units%rowtype;
  v_movement_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before approving return supplier requests.';
  end if;

  if not public.can_manage_stock_take() then
    raise exception 'Only a manager or admin can approve return supplier requests.';
  end if;

  if nullif(trim(p_manager_signature), '') is null then
    raise exception 'Manager return supplier approval signature is required.';
  end if;

  select *
  into request_record
  from public.stock_return_supplier_requests
  where id = p_request_id
  for update;

  if request_record.id is null then
    raise exception 'Return supplier request was not found or is outside your scope.';
  end if;

  if request_record.status <> 'SUBMITTED' then
    raise exception 'Only submitted return supplier requests can be approved.';
  end if;

  if not public.can_access_stock_location(request_record.location_id) then
    raise exception 'Your role cannot approve return supplier for another stock location.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where id = request_record.stock_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if unit_record.barcode <> request_record.barcode then
    raise exception 'Barcode does not match the selected stock unit.';
  end if;

  if unit_record.status not in (
    'IN_STOCK',
    'TRANSFERRED',
    'RETURNED',
    'HOLD_RETURN_SUPPLIER'
  ) then
    raise exception 'Barcode is % and cannot be used for this action.', unit_record.status;
  end if;

  if unit_record.location_id <> request_record.location_id then
    raise exception 'Barcode location changed after return supplier request.';
  end if;

  update public.stock_units
  set
    status = 'OUTBOUNDED',
    transfer_to_location_id = null
  where id = unit_record.id;

  insert into public.stock_movements (
    movement_type,
    item_id,
    stock_unit_id,
    barcode,
    from_location_id,
    quantity,
    weight_kg,
    reference_no,
    notes,
    source_type,
    created_by
  )
  values (
    'OUTBOUND_RETURN_SUPPLIER',
    request_record.item_id,
    request_record.stock_unit_id,
    request_record.barcode,
    request_record.location_id,
    1,
    unit_record.net_weight_kg,
    request_record.request_no,
    'Return supplier approved: ' || request_record.supplier_name,
    'return_supplier',
    current_user_id
  )
  returning id into v_movement_id;

  update public.stock_return_supplier_requests
  set
    status = 'MANAGER_REVIEWED',
    manager_reviewed_by = current_user_id,
    manager_reviewed_at = now(),
    manager_signature = trim(p_manager_signature),
    movement_id = v_movement_id
  where id = request_record.id;

  insert into public.barcode_scan_logs (
    barcode,
    action,
    success,
    message,
    scanned_by
  )
  values (
    request_record.barcode,
    'OUTBOUND_RETURN_SUPPLIER',
    true,
    'Return supplier approved and stock deducted',
    current_user_id
  );

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'RETURN_SUPPLIER_REQUEST_APPROVED',
    'stock_return_supplier_requests',
    request_record.id::text,
    jsonb_build_object(
      'movementId', v_movement_id,
      'previousStatus', unit_record.status,
      'atomic', true
    )
  );

  return v_movement_id;
end;
$$;

create or replace function public.hold_return_supplier_stock_unit(
  p_stock_unit_id uuid,
  p_request_no text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  unit_record public.stock_units%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in before holding return-supplier stock.';
  end if;

  if not public.can_manage_stock() then
    raise exception 'Your role does not allow this stock action.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where id = p_stock_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if unit_record.status not in ('IN_STOCK', 'TRANSFERRED', 'RETURNED') then
    raise exception 'Barcode is % and cannot be placed on return-supplier hold.', unit_record.status;
  end if;

  if not public.can_access_stock_location(unit_record.location_id) then
    raise exception 'Your role cannot hold return-supplier stock for another location.';
  end if;

  update public.stock_units
  set
    status = 'HOLD_RETURN_SUPPLIER',
    transfer_to_location_id = null
  where id = unit_record.id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'RETURN_SUPPLIER_STOCK_HELD',
    'stock_units',
    unit_record.id::text,
    jsonb_build_object(
      'barcode', unit_record.barcode,
      'requestNo', p_request_no,
      'previousStatus', unit_record.status,
      'newStatus', 'HOLD_RETURN_SUPPLIER',
      'atomic', true
    )
  );

  return unit_record.id;
end;
$$;

create or replace function public.release_return_supplier_stock_hold(
  p_stock_unit_id uuid,
  p_request_id uuid,
  p_manager_signature text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  unit_record public.stock_units%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in before releasing return-supplier stock hold.';
  end if;

  if not public.can_manage_stock_take() then
    raise exception 'Only a manager or admin can release return-supplier stock hold.';
  end if;

  if nullif(trim(p_manager_signature), '') is null then
    raise exception 'Manager return supplier rejection signature is required.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where id = p_stock_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if not public.can_access_stock_location(unit_record.location_id) then
    raise exception 'Your role cannot release return-supplier stock for another location.';
  end if;

  if unit_record.status = 'HOLD_RETURN_SUPPLIER' then
    update public.stock_units
    set
      status = 'IN_STOCK',
      transfer_to_location_id = null
    where id = unit_record.id;
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'RETURN_SUPPLIER_STOCK_HOLD_RELEASED',
    'stock_units',
    unit_record.id::text,
    jsonb_build_object(
      'requestId', p_request_id,
      'barcode', unit_record.barcode,
      'previousStatus', unit_record.status,
      'newStatus', case
        when unit_record.status = 'HOLD_RETURN_SUPPLIER' then 'IN_STOCK'
        else unit_record.status::text
      end,
      'atomic', true
    )
  );

  return unit_record.id;
end;
$$;

create or replace function public.approve_stock_take_session(
  p_session_id uuid,
  p_director_signature text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  session_record public.stock_take_sessions%rowtype;
  line_record public.stock_take_lines%rowtype;
  expected_unit public.stock_units%rowtype;
  source_unit public.stock_units%rowtype;
  created_unit_id uuid;
  line_count integer := 0;
  missing_count integer := 0;
  adjustment_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Sign in before approving stock take.';
  end if;

  if not public.can_director_approve_stock_take() then
    raise exception 'Only director or admin can approve reviewed stock take.';
  end if;

  if nullif(trim(p_director_signature), '') is null then
    raise exception 'Director approval signature is required.';
  end if;

  select *
  into session_record
  from public.stock_take_sessions
  where id = p_session_id
  for update;

  if session_record.id is null then
    raise exception 'Stock take session was not found.';
  end if;

  if session_record.status <> 'REVIEWED' then
    raise exception 'Only reviewed stock take sessions can be approved.';
  end if;

  if session_record.item_id is null then
    raise exception 'Stock take session must have an item scope before approval.';
  end if;

  if not public.can_access_stock_location(session_record.location_id) then
    raise exception 'Your role cannot approve stock take for another stock location.';
  end if;

  select count(*)
  into line_count
  from public.stock_take_lines
  where session_id = p_session_id;

  if line_count = 0 then
    raise exception 'Scan at least one barcode before approving stock take.';
  end if;

  for line_record in
    select *
    from public.stock_take_lines
    where session_id = p_session_id
    for update
  loop
    if line_record.item_id <> session_record.item_id then
      raise exception 'Stock take line item does not match the session scope.';
    end if;

    if line_record.brand_id is distinct from session_record.brand_id then
      raise exception 'Stock take line brand does not match the session scope.';
    end if;

    if line_record.exception_type = 'UNKNOWN_BARCODE' then
      if line_record.exception_status = 'RESOLVED' then
        continue;
      end if;

      if nullif(trim(coalesce(line_record.barcode, '')), '') is null then
        raise exception 'Unknown barcode stock take exception is missing a barcode.';
      end if;

      if exists (
        select 1
        from public.stock_units existing_unit
        where existing_unit.barcode = line_record.barcode
      ) then
        raise exception 'Unknown stock take barcode already exists as a stock unit.';
      end if;

      insert into public.stock_units (
        barcode,
        item_id,
        brand_id,
        origin_id,
        location_id,
        status,
        net_weight_kg,
        batch_no,
        received_at
      )
      values (
        line_record.barcode,
        line_record.item_id,
        line_record.brand_id,
        line_record.origin_id,
        session_record.location_id,
        'IN_STOCK',
        greatest(line_record.actual_weight_kg, 0),
        'STOCK-TAKE-' || session_record.session_no,
        now()
      )
      returning id into created_unit_id;

      insert into public.stock_movements (
        movement_type,
        item_id,
        stock_unit_id,
        barcode,
        to_location_id,
        quantity,
        weight_kg,
        reference_no,
        notes,
        created_by
      )
      values (
        'STOCK_TAKE_ADJUSTMENT',
        line_record.item_id,
        created_unit_id,
        line_record.barcode,
        session_record.location_id,
        1,
        greatest(line_record.actual_weight_kg, 0),
        p_session_id::text,
        'Stock take unknown barcode created after approval',
        current_user_id
      );

      insert into public.barcode_scan_logs (
        barcode,
        action,
        success,
        message,
        scanned_by
      )
      values (
        line_record.barcode,
        'STOCK_TAKE_ADJUSTMENT',
        true,
        'Stock take unknown barcode created after director approval',
        current_user_id
      );

      update public.stock_take_lines
      set
        exception_status = 'RESOLVED',
        resolved_stock_unit_id = created_unit_id,
        notes = coalesce(notes, '') || ' Resolved by director approval.'
      where id = line_record.id;

      adjustment_count := adjustment_count + 1;
      continue;
    end if;

    if line_record.exception_type = 'WRONG_LOCATION' then
      if line_record.exception_status = 'RESOLVED' then
        continue;
      end if;

      select *
      into source_unit
      from public.stock_units
      where id = line_record.source_stock_unit_id
         or (
           line_record.source_stock_unit_id is null
           and barcode = line_record.barcode
         )
      order by case when id = line_record.source_stock_unit_id then 0 else 1 end
      limit 1
      for update;

      if source_unit.id is null then
        raise exception 'Wrong-location stock take barcode no longer exists.';
      end if;

      if source_unit.item_id <> session_record.item_id then
        raise exception 'Wrong-location stock unit item does not match the session scope.';
      end if;

      if source_unit.brand_id is distinct from session_record.brand_id then
        raise exception 'Wrong-location stock unit brand does not match the session scope.';
      end if;

      update public.stock_units
      set
        location_id = session_record.location_id,
        status = 'IN_STOCK',
        transfer_to_location_id = null,
        updated_at = now()
      where id = source_unit.id;

      insert into public.stock_movements (
        movement_type,
        item_id,
        stock_unit_id,
        barcode,
        from_location_id,
        to_location_id,
        quantity,
        weight_kg,
        reference_no,
        notes,
        created_by
      )
      values (
        'STOCK_TAKE_ADJUSTMENT',
        source_unit.item_id,
        source_unit.id,
        source_unit.barcode,
        source_unit.location_id,
        session_record.location_id,
        1,
        source_unit.net_weight_kg,
        p_session_id::text,
        'Stock take wrong-location barcode moved after approval',
        current_user_id
      );

      insert into public.barcode_scan_logs (
        barcode,
        action,
        success,
        message,
        scanned_by
      )
      values (
        source_unit.barcode,
        'STOCK_TAKE_ADJUSTMENT',
        true,
        'Stock take wrong-location barcode moved after director approval',
        current_user_id
      );

      update public.stock_take_lines
      set
        exception_status = 'RESOLVED',
        exception_location_id = source_unit.location_id,
        resolved_stock_unit_id = source_unit.id,
        notes = coalesce(notes, '') || ' Resolved by director approval.'
      where id = line_record.id;

      adjustment_count := adjustment_count + 1;
      continue;
    end if;

    if line_record.variance_count = 0 and line_record.variance_weight_kg = 0 then
      continue;
    end if;

    insert into public.stock_movements (
      movement_type,
      item_id,
      barcode,
      from_location_id,
      quantity,
      weight_kg,
      reference_no,
      notes,
      created_by
    )
    values (
      'STOCK_TAKE_ADJUSTMENT',
      line_record.item_id,
      line_record.barcode,
      session_record.location_id,
      line_record.variance_count,
      line_record.variance_weight_kg,
      p_session_id::text,
      'Approved stock take variance',
      current_user_id
    );

    adjustment_count := adjustment_count + 1;
  end loop;

  for expected_unit in
    select su.*
    from public.stock_units su
    where su.location_id = session_record.location_id
      and su.item_id = session_record.item_id
      and su.brand_id is not distinct from session_record.brand_id
      and su.status in ('IN_STOCK', 'TRANSFERRED', 'RETURNED')
      and not exists (
        select 1
        from public.stock_take_lines stl
        where stl.session_id = p_session_id
          and stl.barcode = su.barcode
      )
    for update
  loop
    insert into public.stock_take_lines (
      session_id,
      item_id,
      brand_id,
      origin_id,
      barcode,
      system_count,
      actual_count,
      system_weight_kg,
      actual_weight_kg,
      notes
    )
    values (
      p_session_id,
      expected_unit.item_id,
      expected_unit.brand_id,
      expected_unit.origin_id,
      expected_unit.barcode,
      1,
      0,
      expected_unit.net_weight_kg,
      0,
      'Auto-created at director approval for missing barcode'
    );

    update public.stock_units
    set
      status = 'ADJUSTED_OUT',
      transfer_to_location_id = null,
      updated_at = now()
    where id = expected_unit.id;

    insert into public.stock_movements (
      movement_type,
      item_id,
      stock_unit_id,
      barcode,
      from_location_id,
      quantity,
      weight_kg,
      reference_no,
      notes,
      created_by
    )
    values (
      'STOCK_TAKE_ADJUSTMENT',
      expected_unit.item_id,
      expected_unit.id,
      expected_unit.barcode,
      expected_unit.location_id,
      -1,
      -expected_unit.net_weight_kg,
      p_session_id::text,
      'Stock take missing barcode adjusted out',
      current_user_id
    );

    insert into public.barcode_scan_logs (
      barcode,
      action,
      success,
      message,
      scanned_by
    )
    values (
      expected_unit.barcode,
      'STOCK_TAKE_ADJUSTMENT',
      true,
      'Stock take missing barcode adjusted out',
      current_user_id
    );

    missing_count := missing_count + 1;
    adjustment_count := adjustment_count + 1;
  end loop;

  update public.stock_take_sessions
  set
    status = 'APPROVED',
    approved_by = current_user_id,
    approved_at = now(),
    director_approved_by = current_user_id,
    director_approved_at = now(),
    director_signature = trim(p_director_signature)
  where id = session_record.id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'STOCK_TAKE_APPROVED',
    'stock_take_sessions',
    session_record.id::text,
    jsonb_build_object(
      'lineCount', line_count,
      'missingCount', missing_count,
      'adjustmentCount', adjustment_count,
      'barcodeVarianceComputed', true,
      'stockTakeExceptionsResolved', true,
      'atomic', true
    )
  );

  return adjustment_count;
end;
$$;

grant execute on function public.approve_stock_damage_request(uuid, text) to authenticated;
grant execute on function public.approve_stock_return_supplier_request(uuid, text) to authenticated;
grant execute on function public.hold_return_supplier_stock_unit(uuid, text) to authenticated;
grant execute on function public.release_return_supplier_stock_hold(uuid, uuid, text) to authenticated;
grant execute on function public.approve_stock_take_session(uuid, text) to authenticated;
