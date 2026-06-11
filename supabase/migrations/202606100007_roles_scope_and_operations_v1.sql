alter table public.roles drop constraint if exists roles_role_key_check;
alter table public.roles add constraint roles_role_key_check check (
  role_key in (
    'general_worker',
    'retail_team',
    'retail_team_general_worker',
    'retail_manager',
    'delivery_team_general_worker',
    'delivery_manager',
    'processing_team_general_worker',
    'processing_manager',
    'account',
    'admin',
    'director'
  )
);

insert into public.roles (role_key, name) values
  ('retail_team_general_worker', 'Retail Team General Worker'),
  ('retail_manager', 'Retail Manager'),
  ('delivery_team_general_worker', 'Delivery Team General Worker'),
  ('delivery_manager', 'Delivery Manager'),
  ('processing_team_general_worker', 'Processing Team General Worker'),
  ('processing_manager', 'Processing Manager'),
  ('account', 'Account'),
  ('admin', 'Admin'),
  ('director', 'Director')
on conflict (role_key) do update set name = excluded.name;

insert into public.profile_roles (profile_id, role_key, assigned_by)
select profile_id, 'retail_team_general_worker', assigned_by
from public.profile_roles
where role_key in ('retail_team', 'general_worker')
on conflict do nothing;

do $$
begin
  alter type public.oa_request_status add value if not exists 'MANAGER_REVIEWED';
  alter type public.oa_request_status add value if not exists 'APPROVED';
  alter type public.retail_processing_status add value if not exists 'REVIEWED';
exception
  when undefined_object then null;
end $$;

do $$
begin
  create type public.retail_closing_status as enum (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.work_locations
  add column if not exists outlet_id uuid references public.outlets(id) on delete set null,
  add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.work_locations alter column radius_meters set default 50;
update public.work_locations
set radius_meters = 50
where radius_meters = 150;

alter table public.attendance_rules
  add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.attendance_rules alter column late_after_minutes set default 5;
update public.attendance_rules
set late_after_minutes = 5
where late_after_minutes = 10;

alter table public.attendance_logs
  add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.attendance_daily_summary
  add column if not exists department_id uuid references public.departments(id) on delete set null;

alter table public.vehicles
  add column if not exists delivery_team_id uuid references public.departments(id) on delete set null;
alter table public.delivery_orders
  add column if not exists delivery_team_id uuid references public.departments(id) on delete set null;

update public.vehicles vehicle
set delivery_team_id = profile.department_id
from public.profiles profile
where vehicle.delivery_team_id is null
  and vehicle.created_by = profile.id;

update public.delivery_orders delivery_order
set delivery_team_id = profile.department_id
from public.profiles profile
where delivery_order.delivery_team_id is null
  and coalesce(delivery_order.driver_id, delivery_order.created_by) = profile.id;

alter table public.advance_requests
  add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.claim_requests
  add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.leave_requests
  add column if not exists department_id uuid references public.departments(id) on delete set null;

update public.advance_requests request
set department_id = profile.department_id
from public.profiles profile
where request.department_id is null
  and request.requested_by = profile.id;

update public.claim_requests request
set department_id = profile.department_id
from public.profiles profile
where request.department_id is null
  and request.requested_by = profile.id;

update public.leave_requests request
set department_id = profile.department_id
from public.profiles profile
where request.department_id is null
  and request.requested_by = profile.id;

create table if not exists public.retail_payment_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_cash boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.retail_payment_types (code, name, is_cash, sort_order) values
  ('CASH', 'Cash', true, 10),
  ('CARD', 'Card', false, 20),
  ('ONLINE_TRANSFER', 'Online Transfer', false, 30),
  ('EWALLET', 'E-Wallet', false, 40),
  ('CREDIT', 'Credit', false, 50)
on conflict (code) do update set
  name = excluded.name,
  is_cash = excluded.is_cash,
  sort_order = excluded.sort_order;

create table if not exists public.retail_daily_sales (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id) on delete restrict,
  sales_date date not null default current_date,
  payment_type_id uuid references public.retail_payment_types(id) on delete set null,
  payment_code text not null default 'CASH',
  gross_sales numeric(12, 2) not null default 0 check (gross_sales >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  net_sales numeric(12, 2) generated always as (greatest(gross_sales - discount_amount, 0)) stored,
  cash_received numeric(12, 2) not null default 0 check (cash_received >= 0),
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outlet_id, sales_date, payment_code)
);

create table if not exists public.retail_daily_closings (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id) on delete restrict,
  closing_date date not null default current_date,
  total_sales numeric(12, 2) not null default 0 check (total_sales >= 0),
  cash_received numeric(12, 2) not null default 0 check (cash_received >= 0),
  expenses_amount numeric(12, 2) not null default 0 check (expenses_amount >= 0),
  closing_cash numeric(12, 2) not null default 0 check (closing_cash >= 0),
  variance_amount numeric(12, 2) not null default 0,
  status public.retail_closing_status not null default 'DRAFT',
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outlet_id, closing_date)
);

alter table public.retail_cash_sessions
  add column if not exists approval_status public.retail_closing_status not null default 'DRAFT',
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.retail_processing_batches
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists worker_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

update public.retail_processing_batches batch
set worker_id = processed_by
where worker_id is null
  and processed_by is not null;

update public.retail_processing_batches batch
set department_id = profile.department_id
from public.profiles profile
where batch.department_id is null
  and batch.processed_by = profile.id;

create index if not exists idx_vehicles_delivery_team on public.vehicles(delivery_team_id);
create index if not exists idx_delivery_orders_team_status on public.delivery_orders(delivery_team_id, status);
create index if not exists idx_attendance_logs_department_time on public.attendance_logs(department_id, event_time desc);
create index if not exists idx_attendance_summary_department_date on public.attendance_daily_summary(department_id, work_date desc);
create index if not exists idx_advance_requests_department on public.advance_requests(department_id, status);
create index if not exists idx_claim_requests_department on public.claim_requests(department_id, status);
create index if not exists idx_leave_requests_department on public.leave_requests(department_id, status);
create index if not exists idx_retail_daily_sales_outlet_date on public.retail_daily_sales(outlet_id, sales_date desc);
create index if not exists idx_retail_daily_closings_outlet_date on public.retail_daily_closings(outlet_id, closing_date desc);
create index if not exists idx_retail_processing_batches_department on public.retail_processing_batches(department_id, status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'retail_payment_types',
    'retail_daily_sales',
    'retail_daily_closings'
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

alter table public.retail_payment_types enable row level security;
alter table public.retail_daily_sales enable row level security;
alter table public.retail_daily_closings enable row level security;
