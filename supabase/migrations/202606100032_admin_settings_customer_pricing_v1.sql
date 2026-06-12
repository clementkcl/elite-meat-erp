do $$
begin
  alter type public.customer_order_fulfillment add value if not exists 'INTERNAL_TRANSFER';
exception
  when undefined_object then null;
end $$;

create table if not exists public.erp_claim_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_leave_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  default_days numeric(8, 2) not null default 0 check (default_days >= 0),
  requires_attachment boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  credit_term_days integer not null default 0 check (credit_term_days >= 0),
  is_credit boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique,
  name text not null,
  phone text,
  address text,
  category_id uuid references public.customer_categories(id) on delete set null,
  outlet_id uuid references public.outlets(id) on delete set null,
  credit_term_days integer not null default 0 check (credit_term_days >= 0),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_price_rules (
  id uuid primary key default gen_random_uuid(),
  customer_category_id uuid references public.customer_categories(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete cascade,
  origin_id uuid references public.origins(id) on delete cascade,
  outlet_id uuid references public.outlets(id) on delete cascade,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  effective_from date not null default current_date,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_category_id is not null or customer_id is not null)
);

create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  leave_type_id uuid not null references public.erp_leave_types(id) on delete cascade,
  balance_year integer not null,
  opening_days numeric(8, 2) not null default 0,
  used_days numeric(8, 2) not null default 0,
  adjusted_days numeric(8, 2) not null default 0,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, leave_type_id, balance_year)
);

create table if not exists public.order_stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete cascade,
  order_item_id uuid references public.customer_order_items(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  location_id uuid references public.stock_locations(id) on delete set null,
  reserved_quantity numeric(12, 3) not null default 0 check (reserved_quantity >= 0),
  reserved_weight_kg numeric(12, 3) not null default 0 check (reserved_weight_kg >= 0),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'RELEASED', 'CONSUMED', 'CANCELLED')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_orders
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists source_type text not null default 'manual_erp'
    check (source_type in ('manual_erp', 'retail_sale', 'whatsapp')),
  add column if not exists source_reference text;

alter table public.customer_order_items
  add column if not exists is_processing_item boolean not null default false;

create index if not exists idx_customers_scope on public.customers(outlet_id, category_id, is_active);
create index if not exists idx_customer_price_rules_lookup
on public.customer_price_rules(customer_category_id, customer_id, item_id, brand_id, origin_id, outlet_id, is_active);
create index if not exists idx_leave_balances_profile on public.leave_balances(profile_id, balance_year);
create index if not exists idx_order_stock_reservations_order on public.order_stock_reservations(order_id, status);
create index if not exists idx_order_stock_reservations_item on public.order_stock_reservations(item_id, location_id, status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'erp_claim_categories',
    'erp_leave_types',
    'customer_categories',
    'customers',
    'customer_price_rules',
    'leave_balances',
    'order_stock_reservations'
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

insert into public.erp_claim_categories (code, name, sort_order) values
  ('TRAVEL', 'Travel', 10),
  ('MEAL', 'Meal', 20),
  ('MEDICAL', 'Medical', 30),
  ('OTHER', 'Other', 100)
on conflict (code) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.erp_leave_types (code, name, default_days, sort_order) values
  ('ANNUAL', 'Annual Leave', 8, 10),
  ('MEDICAL', 'Medical Leave', 14, 20),
  ('EMERGENCY', 'Emergency Leave', 0, 30),
  ('OTHER', 'Other', 0, 100)
on conflict (code) do update set
  name = excluded.name,
  default_days = excluded.default_days,
  sort_order = excluded.sort_order;

insert into public.customer_categories (code, name, credit_term_days, is_credit, sort_order) values
  ('RETAIL', 'Retail', 0, false, 10),
  ('WHOLESALE', 'Wholesale', 14, true, 20),
  ('CREDIT', 'Credit Customer', 30, true, 30),
  ('OTHER', 'Other', 0, false, 100)
on conflict (code) do update set
  name = excluded.name,
  credit_term_days = excluded.credit_term_days,
  is_credit = excluded.is_credit,
  sort_order = excluded.sort_order;

alter table public.erp_claim_categories enable row level security;
alter table public.erp_leave_types enable row level security;
alter table public.customer_categories enable row level security;
alter table public.customers enable row level security;
alter table public.customer_price_rules enable row level security;
alter table public.leave_balances enable row level security;
alter table public.order_stock_reservations enable row level security;

drop policy if exists "settings users can read claim categories" on public.erp_claim_categories;
create policy "settings users can read claim categories"
on public.erp_claim_categories for select to authenticated
using (true);
drop policy if exists "admins can insert claim categories" on public.erp_claim_categories;
create policy "admins can insert claim categories"
on public.erp_claim_categories for insert to authenticated
with check (public.has_role('admin'));
drop policy if exists "admins can update claim categories" on public.erp_claim_categories;
create policy "admins can update claim categories"
on public.erp_claim_categories for update to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));
drop policy if exists "admins can delete claim categories" on public.erp_claim_categories;
create policy "admins can delete claim categories"
on public.erp_claim_categories for delete to authenticated
using (public.has_role('admin'));

drop policy if exists "settings users can read leave types" on public.erp_leave_types;
create policy "settings users can read leave types"
on public.erp_leave_types for select to authenticated
using (true);
drop policy if exists "admins can insert leave types" on public.erp_leave_types;
create policy "admins can insert leave types"
on public.erp_leave_types for insert to authenticated
with check (public.has_role('admin'));
drop policy if exists "admins can update leave types" on public.erp_leave_types;
create policy "admins can update leave types"
on public.erp_leave_types for update to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));
drop policy if exists "admins can delete leave types" on public.erp_leave_types;
create policy "admins can delete leave types"
on public.erp_leave_types for delete to authenticated
using (public.has_role('admin'));

drop policy if exists "users can read customer categories" on public.customer_categories;
create policy "users can read customer categories"
on public.customer_categories for select to authenticated
using (true);
drop policy if exists "admins can insert customer categories" on public.customer_categories;
create policy "admins can insert customer categories"
on public.customer_categories for insert to authenticated
with check (public.has_role('admin'));
drop policy if exists "admins can update customer categories" on public.customer_categories;
create policy "admins can update customer categories"
on public.customer_categories for update to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));
drop policy if exists "admins can delete customer categories" on public.customer_categories;
create policy "admins can delete customer categories"
on public.customer_categories for delete to authenticated
using (public.has_role('admin'));

drop policy if exists "users can read scoped customers" on public.customers;
create policy "users can read scoped customers"
on public.customers for select to authenticated
using (
  public.is_admin_or_director()
  or public.can_access_outlet(outlet_id)
);
drop policy if exists "admins can insert customers" on public.customers;
create policy "admins can insert customers"
on public.customers for insert to authenticated
with check (
  public.has_role('admin')
  or (
    created_by = auth.uid()
    and public.can_access_outlet(outlet_id)
  )
);
drop policy if exists "admins can update customers" on public.customers;
create policy "admins can update customers"
on public.customers for update to authenticated
using (
  public.has_role('admin')
  or public.can_access_outlet(outlet_id)
)
with check (
  public.has_role('admin')
  or public.can_access_outlet(outlet_id)
);
drop policy if exists "admins can delete customers" on public.customers;
create policy "admins can delete customers"
on public.customers for delete to authenticated
using (public.has_role('admin'));

drop policy if exists "users can read scoped customer price rules" on public.customer_price_rules;
create policy "users can read scoped customer price rules"
on public.customer_price_rules for select to authenticated
using (
  public.is_admin_or_director()
  or public.can_access_outlet(outlet_id)
  or outlet_id is null
);
drop policy if exists "admins can insert customer price rules" on public.customer_price_rules;
create policy "admins can insert customer price rules"
on public.customer_price_rules for insert to authenticated
with check (public.has_role('admin'));
drop policy if exists "admins can update customer price rules" on public.customer_price_rules;
create policy "admins can update customer price rules"
on public.customer_price_rules for update to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));
drop policy if exists "admins can delete customer price rules" on public.customer_price_rules;
create policy "admins can delete customer price rules"
on public.customer_price_rules for delete to authenticated
using (public.has_role('admin'));

drop policy if exists "users can read own leave balances" on public.leave_balances;
create policy "users can read own leave balances"
on public.leave_balances for select to authenticated
using (
  public.is_admin_or_director()
  or profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles profile
    where profile.id = profile_id
      and public.can_access_department(profile.department_id)
  )
);
drop policy if exists "admins can insert leave balances" on public.leave_balances;
create policy "admins can insert leave balances"
on public.leave_balances for insert to authenticated
with check (public.has_role('admin'));
drop policy if exists "admins can update leave balances" on public.leave_balances;
create policy "admins can update leave balances"
on public.leave_balances for update to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));
drop policy if exists "admins can delete leave balances" on public.leave_balances;
create policy "admins can delete leave balances"
on public.leave_balances for delete to authenticated
using (public.has_role('admin'));

drop policy if exists "users can read scoped order reservations" on public.order_stock_reservations;
create policy "users can read scoped order reservations"
on public.order_stock_reservations for select to authenticated
using (public.can_access_customer_order(order_id));
drop policy if exists "order users can insert reservations" on public.order_stock_reservations;
create policy "order users can insert reservations"
on public.order_stock_reservations for insert to authenticated
with check (
  public.can_manage_customer_order_record(order_id)
  and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "order users can update reservations" on public.order_stock_reservations;
create policy "order users can update reservations"
on public.order_stock_reservations for update to authenticated
using (public.can_manage_customer_order_record(order_id))
with check (public.can_manage_customer_order_record(order_id));
drop policy if exists "admins can delete reservations" on public.order_stock_reservations;
create policy "admins can delete reservations"
on public.order_stock_reservations for delete to authenticated
using (public.has_role('admin'));
