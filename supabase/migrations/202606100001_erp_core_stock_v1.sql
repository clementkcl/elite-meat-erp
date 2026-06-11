create extension if not exists "pgcrypto";

do $$
begin
  create type public.stock_category as enum ('MEAT', 'ORGANS', 'PROCESSED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_movement_type as enum (
    'INBOUND',
    'OUTBOUND_SALES',
    'OUTBOUND_TRANSFER',
    'TRANSFER_RECEIVED',
    'RETURN',
    'STOCK_TAKE_ADJUSTMENT',
    'MANUAL_ADJUSTMENT',
    'NO_BARCODE_INBOUND',
    'NO_BARCODE_OUTBOUND'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_unit_status as enum (
    'IN_STOCK',
    'OUTBOUNDED',
    'TRANSFER_PENDING',
    'TRANSFERRED',
    'SOLD',
    'RETURNED',
    'ADJUSTED_OUT',
    'DAMAGED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_take_status as enum (
    'DRAFT',
    'SUBMITTED',
    'REVIEWED',
    'APPROVED',
    'REJECTED'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete set null,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  department_id uuid references public.departments(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  outlet_id uuid references public.outlets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  role_key text primary key check (
    role_key in ('general_worker', 'retail_team', 'account', 'admin', 'director')
  ),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null references public.roles(role_key) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (profile_id, role_key)
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  bucket_id text not null default 'erp-files',
  object_path text not null,
  module text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.origins (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  item_code text not null unique,
  category public.stock_category not null,
  section text not null,
  name text not null,
  barcode_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, section, name)
);

create table if not exists public.stock_units (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  item_id uuid not null references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  transfer_to_location_id uuid references public.stock_locations(id) on delete set null,
  status public.stock_unit_status not null default 'IN_STOCK',
  net_weight_kg numeric(12, 3) not null check (net_weight_kg >= 0),
  batch_no text,
  received_at timestamptz not null default now(),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.barcode_scan_logs (
  id uuid primary key default gen_random_uuid(),
  barcode text not null,
  action public.stock_movement_type not null,
  success boolean not null default false,
  message text,
  scanned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.no_barcode_stock (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  quantity numeric(12, 3) not null default 0,
  weight_kg numeric(12, 3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (item_id, brand_id, origin_id, location_id)
);

create table if not exists public.no_barcode_movements (
  id uuid primary key default gen_random_uuid(),
  movement_type public.stock_movement_type not null,
  item_id uuid not null references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  quantity_delta numeric(12, 3) not null,
  weight_delta_kg numeric(12, 3) not null,
  reference_no text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_take_sessions (
  id uuid primary key default gen_random_uuid(),
  session_no text not null unique,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  status public.stock_take_status not null default 'DRAFT',
  created_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_reports (
  id uuid primary key default gen_random_uuid(),
  report_name text not null,
  filters jsonb not null default '{}'::jsonb,
  generated_by uuid references public.profiles(id) on delete set null,
  file_id uuid references public.files(id) on delete set null,
  generated_at timestamptz not null default now()
);

create index if not exists idx_stock_units_barcode on public.stock_units(barcode);
create index if not exists idx_stock_units_location_status on public.stock_units(location_id, status);
create index if not exists idx_stock_movements_created_at on public.stock_movements(created_at desc);
create index if not exists idx_stock_movements_type on public.stock_movements(movement_type);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'departments',
    'branches',
    'outlets',
    'profiles',
    'brands',
    'origins',
    'stock_locations',
    'items',
    'stock_units',
    'no_barcode_stock',
    'stock_take_sessions'
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_roles pr
    where pr.profile_id = auth.uid()
      and pr.role_key = required_role
  );
$$;

create or replace function public.can_manage_stock()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('general_worker')
    or public.has_role('retail_team')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create or replace function public.can_administer_stock()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('director');
$$;

create or replace function public.can_edit_stock_take_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_administer_stock()
    or exists (
      select 1
      from public.stock_take_sessions sts
      where sts.id = target_session_id
        and sts.status = 'DRAFT'
        and public.can_manage_stock()
    );
$$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('erp-files', 'erp-files', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

alter table public.departments enable row level security;
alter table public.branches enable row level security;
alter table public.outlets enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.profile_roles enable row level security;
alter table public.files enable row level security;
alter table public.audit_logs enable row level security;
alter table public.brands enable row level security;
alter table public.origins enable row level security;
alter table public.stock_locations enable row level security;
alter table public.items enable row level security;
alter table public.stock_units enable row level security;
alter table public.stock_movements enable row level security;
alter table public.barcode_scan_logs enable row level security;
alter table public.no_barcode_stock enable row level security;
alter table public.no_barcode_movements enable row level security;
alter table public.stock_take_sessions enable row level security;
alter table public.stock_take_lines enable row level security;
alter table public.stock_reports enable row level security;

drop policy if exists "authenticated can read departments" on public.departments;
create policy "authenticated can read departments"
on public.departments for select to authenticated using (true);
drop policy if exists "admins can insert departments" on public.departments;
create policy "admins can insert departments"
on public.departments for insert to authenticated with check (public.has_role('admin'));
drop policy if exists "admins can update departments" on public.departments;
create policy "admins can update departments"
on public.departments for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "admins can delete departments" on public.departments;
create policy "admins can delete departments"
on public.departments for delete to authenticated using (public.has_role('admin'));

drop policy if exists "authenticated can read branches" on public.branches;
create policy "authenticated can read branches"
on public.branches for select to authenticated using (true);
drop policy if exists "admins can insert branches" on public.branches;
create policy "admins can insert branches"
on public.branches for insert to authenticated with check (public.has_role('admin'));
drop policy if exists "admins can update branches" on public.branches;
create policy "admins can update branches"
on public.branches for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "admins can delete branches" on public.branches;
create policy "admins can delete branches"
on public.branches for delete to authenticated using (public.has_role('admin'));

drop policy if exists "authenticated can read outlets" on public.outlets;
create policy "authenticated can read outlets"
on public.outlets for select to authenticated using (true);
drop policy if exists "admins can insert outlets" on public.outlets;
create policy "admins can insert outlets"
on public.outlets for insert to authenticated with check (public.has_role('admin'));
drop policy if exists "admins can update outlets" on public.outlets;
create policy "admins can update outlets"
on public.outlets for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "admins can delete outlets" on public.outlets;
create policy "admins can delete outlets"
on public.outlets for delete to authenticated using (public.has_role('admin'));

drop policy if exists "authenticated can read roles" on public.roles;
create policy "authenticated can read roles"
on public.roles for select to authenticated using (true);
drop policy if exists "admins can insert roles" on public.roles;
create policy "admins can insert roles"
on public.roles for insert to authenticated with check (public.has_role('admin'));
drop policy if exists "admins can update roles" on public.roles;
create policy "admins can update roles"
on public.roles for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "admins can delete roles" on public.roles;
create policy "admins can delete roles"
on public.roles for delete to authenticated using (public.has_role('admin'));

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles for select to authenticated using (id = auth.uid() or public.has_role('admin'));
drop policy if exists "admins can insert profiles" on public.profiles;
create policy "admins can insert profiles"
on public.profiles for insert to authenticated with check (public.has_role('admin'));
drop policy if exists "admins can update profiles" on public.profiles;
create policy "admins can update profiles"
on public.profiles for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "admins can delete profiles" on public.profiles;
create policy "admins can delete profiles"
on public.profiles for delete to authenticated using (public.has_role('admin'));

drop policy if exists "users can read own profile roles" on public.profile_roles;
create policy "users can read own profile roles"
on public.profile_roles for select to authenticated using (profile_id = auth.uid() or public.has_role('admin'));
drop policy if exists "admins can insert profile roles" on public.profile_roles;
create policy "admins can insert profile roles"
on public.profile_roles for insert to authenticated with check (public.has_role('admin'));
drop policy if exists "admins can update profile roles" on public.profile_roles;
create policy "admins can update profile roles"
on public.profile_roles for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "admins can delete profile roles" on public.profile_roles;
create policy "admins can delete profile roles"
on public.profile_roles for delete to authenticated using (public.has_role('admin'));

drop policy if exists "authenticated can read brands" on public.brands;
create policy "authenticated can read brands"
on public.brands for select to authenticated using (true);
drop policy if exists "stock admins can insert brands" on public.brands;
create policy "stock admins can insert brands"
on public.brands for insert to authenticated with check (public.can_administer_stock());
drop policy if exists "stock admins can update brands" on public.brands;
create policy "stock admins can update brands"
on public.brands for update to authenticated using (public.can_administer_stock()) with check (public.can_administer_stock());
drop policy if exists "stock admins can delete brands" on public.brands;
create policy "stock admins can delete brands"
on public.brands for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read origins" on public.origins;
create policy "authenticated can read origins"
on public.origins for select to authenticated using (true);
drop policy if exists "stock admins can insert origins" on public.origins;
create policy "stock admins can insert origins"
on public.origins for insert to authenticated with check (public.can_administer_stock());
drop policy if exists "stock admins can update origins" on public.origins;
create policy "stock admins can update origins"
on public.origins for update to authenticated using (public.can_administer_stock()) with check (public.can_administer_stock());
drop policy if exists "stock admins can delete origins" on public.origins;
create policy "stock admins can delete origins"
on public.origins for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read stock locations" on public.stock_locations;
create policy "authenticated can read stock locations"
on public.stock_locations for select to authenticated using (true);
drop policy if exists "stock admins can insert stock locations" on public.stock_locations;
create policy "stock admins can insert stock locations"
on public.stock_locations for insert to authenticated with check (public.can_administer_stock());
drop policy if exists "stock admins can update stock locations" on public.stock_locations;
create policy "stock admins can update stock locations"
on public.stock_locations for update to authenticated using (public.can_administer_stock()) with check (public.can_administer_stock());
drop policy if exists "stock admins can delete stock locations" on public.stock_locations;
create policy "stock admins can delete stock locations"
on public.stock_locations for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read items" on public.items;
create policy "authenticated can read items"
on public.items for select to authenticated using (true);
drop policy if exists "stock admins can insert items" on public.items;
create policy "stock admins can insert items"
on public.items for insert to authenticated with check (public.can_administer_stock());
drop policy if exists "stock admins can update items" on public.items;
create policy "stock admins can update items"
on public.items for update to authenticated using (public.can_administer_stock()) with check (public.can_administer_stock());
drop policy if exists "stock admins can delete items" on public.items;
create policy "stock admins can delete items"
on public.items for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read stock units" on public.stock_units;
create policy "authenticated can read stock units"
on public.stock_units for select to authenticated using (true);
drop policy if exists "stock operators can insert stock units" on public.stock_units;
create policy "stock operators can insert stock units"
on public.stock_units for insert to authenticated with check (public.can_manage_stock());
drop policy if exists "stock operators can update stock units" on public.stock_units;
create policy "stock operators can update stock units"
on public.stock_units for update to authenticated using (public.can_manage_stock()) with check (public.can_manage_stock());
drop policy if exists "stock admins can delete stock units" on public.stock_units;
create policy "stock admins can delete stock units"
on public.stock_units for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read stock movements" on public.stock_movements;
create policy "authenticated can read stock movements"
on public.stock_movements for select to authenticated using (true);
drop policy if exists "stock operators can insert stock movements" on public.stock_movements;
create policy "stock operators can insert stock movements"
on public.stock_movements for insert to authenticated with check (public.can_manage_stock());
drop policy if exists "stock admins can update stock movements" on public.stock_movements;
create policy "stock admins can update stock movements"
on public.stock_movements for update to authenticated using (public.can_administer_stock()) with check (public.can_administer_stock());
drop policy if exists "stock admins can delete stock movements" on public.stock_movements;
create policy "stock admins can delete stock movements"
on public.stock_movements for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read scan logs" on public.barcode_scan_logs;
create policy "authenticated can read scan logs"
on public.barcode_scan_logs for select to authenticated using (true);
drop policy if exists "stock operators can insert scan logs" on public.barcode_scan_logs;
create policy "stock operators can insert scan logs"
on public.barcode_scan_logs for insert to authenticated with check (public.can_manage_stock());
drop policy if exists "stock admins can update scan logs" on public.barcode_scan_logs;
create policy "stock admins can update scan logs"
on public.barcode_scan_logs for update to authenticated using (public.can_administer_stock()) with check (public.can_administer_stock());
drop policy if exists "stock admins can delete scan logs" on public.barcode_scan_logs;
create policy "stock admins can delete scan logs"
on public.barcode_scan_logs for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read no barcode stock" on public.no_barcode_stock;
create policy "authenticated can read no barcode stock"
on public.no_barcode_stock for select to authenticated using (true);
drop policy if exists "stock operators can insert no barcode stock" on public.no_barcode_stock;
create policy "stock operators can insert no barcode stock"
on public.no_barcode_stock for insert to authenticated with check (public.can_manage_stock());
drop policy if exists "stock operators can update no barcode stock" on public.no_barcode_stock;
create policy "stock operators can update no barcode stock"
on public.no_barcode_stock for update to authenticated using (public.can_manage_stock()) with check (public.can_manage_stock());
drop policy if exists "stock admins can delete no barcode stock" on public.no_barcode_stock;
create policy "stock admins can delete no barcode stock"
on public.no_barcode_stock for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read no barcode movements" on public.no_barcode_movements;
create policy "authenticated can read no barcode movements"
on public.no_barcode_movements for select to authenticated using (true);
drop policy if exists "stock operators can insert no barcode movements" on public.no_barcode_movements;
create policy "stock operators can insert no barcode movements"
on public.no_barcode_movements for insert to authenticated with check (public.can_manage_stock());
drop policy if exists "stock admins can update no barcode movements" on public.no_barcode_movements;
create policy "stock admins can update no barcode movements"
on public.no_barcode_movements for update to authenticated using (public.can_administer_stock()) with check (public.can_administer_stock());
drop policy if exists "stock admins can delete no barcode movements" on public.no_barcode_movements;
create policy "stock admins can delete no barcode movements"
on public.no_barcode_movements for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read stock take sessions" on public.stock_take_sessions;
create policy "authenticated can read stock take sessions"
on public.stock_take_sessions for select to authenticated using (true);
drop policy if exists "stock operators can create draft stock take sessions" on public.stock_take_sessions;
create policy "stock operators can create draft stock take sessions"
on public.stock_take_sessions for insert to authenticated
with check (
  public.can_manage_stock()
  and status = 'DRAFT'
  and (created_by is null or created_by = auth.uid())
);
drop policy if exists "stock operators can submit draft stock take sessions" on public.stock_take_sessions;
create policy "stock operators can submit draft stock take sessions"
on public.stock_take_sessions for update to authenticated
using (public.can_manage_stock() and status = 'DRAFT')
with check (
  public.can_manage_stock()
  and status in ('DRAFT', 'SUBMITTED')
  and reviewed_at is null
  and approved_by is null
  and approved_at is null
);
drop policy if exists "stock admins can review approve or reject stock take sessions" on public.stock_take_sessions;
create policy "stock admins can review approve or reject stock take sessions"
on public.stock_take_sessions for update to authenticated
using (public.can_administer_stock())
with check (public.can_administer_stock());
drop policy if exists "stock admins can delete stock take sessions" on public.stock_take_sessions;
create policy "stock admins can delete stock take sessions"
on public.stock_take_sessions for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read stock take lines" on public.stock_take_lines;
create policy "authenticated can read stock take lines"
on public.stock_take_lines for select to authenticated using (true);
drop policy if exists "stock operators can insert draft stock take lines" on public.stock_take_lines;
create policy "stock operators can insert draft stock take lines"
on public.stock_take_lines for insert to authenticated with check (public.can_edit_stock_take_session(session_id));
drop policy if exists "stock operators can update draft stock take lines" on public.stock_take_lines;
create policy "stock operators can update draft stock take lines"
on public.stock_take_lines for update to authenticated
using (public.can_edit_stock_take_session(session_id))
with check (public.can_edit_stock_take_session(session_id));
drop policy if exists "stock admins can delete stock take lines" on public.stock_take_lines;
create policy "stock admins can delete stock take lines"
on public.stock_take_lines for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read stock reports" on public.stock_reports;
create policy "authenticated can read stock reports"
on public.stock_reports for select to authenticated using (true);
drop policy if exists "stock operators can insert stock reports" on public.stock_reports;
create policy "stock operators can insert stock reports"
on public.stock_reports for insert to authenticated with check (public.can_manage_stock());
drop policy if exists "stock admins can update stock reports" on public.stock_reports;
create policy "stock admins can update stock reports"
on public.stock_reports for update to authenticated using (public.can_administer_stock()) with check (public.can_administer_stock());
drop policy if exists "stock admins can delete stock reports" on public.stock_reports;
create policy "stock admins can delete stock reports"
on public.stock_reports for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read files" on public.files;
create policy "authenticated can read files"
on public.files for select to authenticated using (true);
drop policy if exists "authenticated can insert files" on public.files;
create policy "authenticated can insert files"
on public.files for insert to authenticated with check (owner_id = auth.uid() or public.can_manage_stock());
drop policy if exists "file owners and stock admins can update files" on public.files;
create policy "file owners and stock admins can update files"
on public.files for update to authenticated
using (owner_id = auth.uid() or public.can_administer_stock())
with check (owner_id = auth.uid() or public.can_administer_stock());
drop policy if exists "file owners and stock admins can delete files" on public.files;
create policy "file owners and stock admins can delete files"
on public.files for delete to authenticated using (owner_id = auth.uid() or public.can_administer_stock());

drop policy if exists "stock admins can read audit logs" on public.audit_logs;
create policy "stock admins can read audit logs"
on public.audit_logs for select to authenticated using (public.can_administer_stock());
drop policy if exists "authenticated can insert audit logs" on public.audit_logs;
create policy "authenticated can insert audit logs"
on public.audit_logs for insert to authenticated with check (actor_id = auth.uid());
drop policy if exists "stock admins can delete audit logs" on public.audit_logs;
create policy "stock admins can delete audit logs"
on public.audit_logs for delete to authenticated using (public.can_administer_stock());

drop policy if exists "authenticated can read erp files" on storage.objects;
create policy "authenticated can read erp files"
on storage.objects for select to authenticated using (bucket_id = 'erp-files');
drop policy if exists "authenticated can upload erp files" on storage.objects;
create policy "authenticated can upload erp files"
on storage.objects for insert to authenticated with check (bucket_id = 'erp-files');
