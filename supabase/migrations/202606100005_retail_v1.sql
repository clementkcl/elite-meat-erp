do $$
begin
  create type public.retail_sale_status as enum (
    'DRAFT',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.retail_payment_method as enum (
    'CASH',
    'CARD',
    'ONLINE_TRANSFER',
    'EWALLET',
    'CREDIT'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.retail_payment_status as enum (
    'UNPAID',
    'PARTIAL',
    'PAID',
    'REFUNDED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.retail_cash_session_status as enum (
    'OPEN',
    'CLOSED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.retail_processing_status as enum (
    'OPEN',
    'COMPLETED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.retail_cleaning_frequency as enum (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.retail_cleaning_status as enum (
    'PENDING',
    'DONE',
    'MISSED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.retail_expense_status as enum (
    'SUBMITTED',
    'REVIEWED',
    'APPROVED',
    'REJECTED',
    'PAID'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.can_view_retail()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team')
    or public.has_role('account')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create or replace function public.can_manage_retail()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create or replace function public.can_manage_retail_payments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team')
    or public.has_role('account')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create or replace function public.can_review_retail_expenses()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('account')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create or replace function public.can_administer_retail()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('director');
$$;

create table if not exists public.retail_registers (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references public.outlets(id) on delete set null,
  stock_location_id uuid references public.stock_locations(id) on delete set null,
  register_name text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outlet_id, register_name)
);

create table if not exists public.retail_cash_sessions (
  id uuid primary key default gen_random_uuid(),
  register_id uuid not null references public.retail_registers(id) on delete restrict,
  status public.retail_cash_session_status not null default 'OPEN',
  opening_float numeric(12, 2) not null default 0 check (opening_float >= 0),
  expected_cash numeric(12, 2) not null default 0 check (expected_cash >= 0),
  closing_cash numeric(12, 2) check (closing_cash >= 0),
  variance_amount numeric(12, 2) generated always as (
    case
      when closing_cash is null then null
      else closing_cash - expected_cash
    end
  ) stored,
  opened_by uuid references public.profiles(id) on delete set null,
  closed_by uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retail_sales (
  id uuid primary key default gen_random_uuid(),
  sale_no text not null unique,
  register_id uuid references public.retail_registers(id) on delete set null,
  cash_session_id uuid references public.retail_cash_sessions(id) on delete set null,
  customer_name text,
  customer_phone text,
  status public.retail_sale_status not null default 'COMPLETED',
  payment_status public.retail_payment_status not null default 'UNPAID',
  subtotal_amount numeric(12, 2) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  change_amount numeric(12, 2) not null default 0 check (change_amount >= 0),
  sold_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retail_sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.retail_sales(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  stock_location_id uuid references public.stock_locations(id) on delete set null,
  stock_unit_id uuid references public.stock_units(id) on delete set null,
  no_barcode_stock_id uuid references public.no_barcode_stock(id) on delete set null,
  barcode text,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  weight_kg numeric(12, 3) not null default 0 check (weight_kg >= 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_discount numeric(12, 2) not null default 0 check (line_discount >= 0),
  line_total numeric(12, 2) generated always as (
    greatest((quantity * unit_price) - line_discount, 0)
  ) stored,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.retail_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.retail_sales(id) on delete cascade,
  payment_method public.retail_payment_method not null,
  payment_status public.retail_payment_status not null default 'PAID',
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  reference_no text,
  received_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.retail_price_rules (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  outlet_id uuid references public.outlets(id) on delete set null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (item_id, brand_id, origin_id, outlet_id, effective_from)
);

create table if not exists public.retail_processing_batches (
  id uuid primary key default gen_random_uuid(),
  batch_no text not null unique,
  outlet_id uuid references public.outlets(id) on delete set null,
  stock_location_id uuid references public.stock_locations(id) on delete set null,
  raw_item_id uuid not null references public.items(id) on delete restrict,
  raw_brand_id uuid references public.brands(id) on delete set null,
  raw_origin_id uuid references public.origins(id) on delete set null,
  raw_quantity numeric(12, 3) not null default 0 check (raw_quantity >= 0),
  raw_weight_kg numeric(12, 3) not null default 0 check (raw_weight_kg >= 0),
  finished_item_id uuid not null references public.items(id) on delete restrict,
  finished_brand_id uuid references public.brands(id) on delete set null,
  finished_origin_id uuid references public.origins(id) on delete set null,
  finished_quantity numeric(12, 3) not null default 0 check (finished_quantity >= 0),
  finished_weight_kg numeric(12, 3) not null default 0 check (finished_weight_kg >= 0),
  yield_percent numeric(8, 2) generated always as (
    case
      when raw_weight_kg > 0 then round((finished_weight_kg / raw_weight_kg) * 100, 2)
      else null
    end
  ) stored,
  loss_weight_kg numeric(12, 3) generated always as (
    greatest(raw_weight_kg - finished_weight_kg, 0)
  ) stored,
  status public.retail_processing_status not null default 'OPEN',
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retail_cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references public.outlets(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  task_name text not null,
  frequency public.retail_cleaning_frequency not null default 'DAILY',
  due_date date not null default current_date,
  status public.retail_cleaning_status not null default 'PENDING',
  assigned_to uuid references public.profiles(id) on delete set null,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retail_expenses (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references public.outlets(id) on delete set null,
  expense_date date not null default current_date,
  category text not null,
  vendor text,
  amount numeric(12, 2) not null check (amount >= 0),
  payment_method public.retail_payment_method not null default 'CASH',
  status public.retail_expense_status not null default 'SUBMITTED',
  receipt_file_id uuid references public.files(id) on delete set null,
  submitted_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_retail_registers_outlet on public.retail_registers(outlet_id);
create index if not exists idx_retail_cash_sessions_register on public.retail_cash_sessions(register_id, opened_at desc);
create unique index if not exists idx_retail_cash_sessions_one_open
on public.retail_cash_sessions(register_id)
where status = 'OPEN';
create index if not exists idx_retail_sales_created_at on public.retail_sales(created_at desc);
create index if not exists idx_retail_sales_status on public.retail_sales(status, payment_status);
create index if not exists idx_retail_sales_session on public.retail_sales(cash_session_id);
create index if not exists idx_retail_sale_lines_sale on public.retail_sale_lines(sale_id);
create index if not exists idx_retail_sale_lines_stock_unit on public.retail_sale_lines(stock_unit_id);
create index if not exists idx_retail_payments_sale on public.retail_payments(sale_id, created_at desc);
create index if not exists idx_retail_price_rules_item on public.retail_price_rules(item_id, brand_id, origin_id);
create index if not exists idx_retail_processing_batches_created_at on public.retail_processing_batches(created_at desc);
create index if not exists idx_retail_processing_batches_status on public.retail_processing_batches(status);
create index if not exists idx_retail_cleaning_tasks_due on public.retail_cleaning_tasks(due_date, status);
create index if not exists idx_retail_cleaning_tasks_outlet on public.retail_cleaning_tasks(outlet_id);
create index if not exists idx_retail_expenses_date on public.retail_expenses(expense_date desc);
create index if not exists idx_retail_expenses_status on public.retail_expenses(status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'retail_registers',
    'retail_cash_sessions',
    'retail_sales',
    'retail_price_rules',
    'retail_processing_batches',
    'retail_cleaning_tasks',
    'retail_expenses'
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

alter table public.retail_registers enable row level security;
alter table public.retail_cash_sessions enable row level security;
alter table public.retail_sales enable row level security;
alter table public.retail_sale_lines enable row level security;
alter table public.retail_payments enable row level security;
alter table public.retail_price_rules enable row level security;
alter table public.retail_processing_batches enable row level security;
alter table public.retail_cleaning_tasks enable row level security;
alter table public.retail_expenses enable row level security;

drop policy if exists "retail users can read registers" on public.retail_registers;
drop policy if exists "retail operators can insert registers" on public.retail_registers;
drop policy if exists "retail operators can update registers" on public.retail_registers;
drop policy if exists "retail admins can delete registers" on public.retail_registers;
drop policy if exists "retail users can read registers" on public.retail_registers;
create policy "retail users can read registers"
on public.retail_registers for select to authenticated using (public.can_view_retail());
drop policy if exists "retail operators can insert registers" on public.retail_registers;
create policy "retail operators can insert registers"
on public.retail_registers for insert to authenticated with check (
  public.can_manage_retail() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "retail operators can update registers" on public.retail_registers;
create policy "retail operators can update registers"
on public.retail_registers for update to authenticated
using (public.can_manage_retail())
with check (public.can_manage_retail());
drop policy if exists "retail admins can delete registers" on public.retail_registers;
create policy "retail admins can delete registers"
on public.retail_registers for delete to authenticated using (public.can_administer_retail());

drop policy if exists "retail users can read cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail operators can insert cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail operators can update cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail admins can delete cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail users can read cash sessions" on public.retail_cash_sessions;
create policy "retail users can read cash sessions"
on public.retail_cash_sessions for select to authenticated using (public.can_view_retail());
drop policy if exists "retail operators can insert cash sessions" on public.retail_cash_sessions;
create policy "retail operators can insert cash sessions"
on public.retail_cash_sessions for insert to authenticated with check (
  public.can_manage_retail() and (opened_by = auth.uid() or opened_by is null)
);
drop policy if exists "retail operators can update cash sessions" on public.retail_cash_sessions;
create policy "retail operators can update cash sessions"
on public.retail_cash_sessions for update to authenticated
using (public.can_manage_retail())
with check (public.can_manage_retail());
drop policy if exists "retail admins can delete cash sessions" on public.retail_cash_sessions;
create policy "retail admins can delete cash sessions"
on public.retail_cash_sessions for delete to authenticated using (public.can_administer_retail());

drop policy if exists "retail users can read sales" on public.retail_sales;
drop policy if exists "retail operators can insert sales" on public.retail_sales;
drop policy if exists "retail operators can update sales" on public.retail_sales;
drop policy if exists "retail admins can delete sales" on public.retail_sales;
drop policy if exists "retail users can read sales" on public.retail_sales;
create policy "retail users can read sales"
on public.retail_sales for select to authenticated using (public.can_view_retail());
drop policy if exists "retail operators can insert sales" on public.retail_sales;
create policy "retail operators can insert sales"
on public.retail_sales for insert to authenticated with check (
  public.can_manage_retail() and (sold_by = auth.uid() or sold_by is null)
);
drop policy if exists "retail operators can update sales" on public.retail_sales;
create policy "retail operators can update sales"
on public.retail_sales for update to authenticated
using (public.can_manage_retail())
with check (public.can_manage_retail());
drop policy if exists "retail admins can delete sales" on public.retail_sales;
create policy "retail admins can delete sales"
on public.retail_sales for delete to authenticated using (public.can_administer_retail());

drop policy if exists "retail users can read sale lines" on public.retail_sale_lines;
drop policy if exists "retail operators can insert sale lines" on public.retail_sale_lines;
drop policy if exists "retail operators can update sale lines" on public.retail_sale_lines;
drop policy if exists "retail admins can delete sale lines" on public.retail_sale_lines;
drop policy if exists "retail users can read sale lines" on public.retail_sale_lines;
create policy "retail users can read sale lines"
on public.retail_sale_lines for select to authenticated using (public.can_view_retail());
drop policy if exists "retail operators can insert sale lines" on public.retail_sale_lines;
create policy "retail operators can insert sale lines"
on public.retail_sale_lines for insert to authenticated with check (public.can_manage_retail());
drop policy if exists "retail operators can update sale lines" on public.retail_sale_lines;
create policy "retail operators can update sale lines"
on public.retail_sale_lines for update to authenticated
using (public.can_manage_retail())
with check (public.can_manage_retail());
drop policy if exists "retail admins can delete sale lines" on public.retail_sale_lines;
create policy "retail admins can delete sale lines"
on public.retail_sale_lines for delete to authenticated using (public.can_administer_retail());

drop policy if exists "retail users can read payments" on public.retail_payments;
drop policy if exists "retail payment users can insert payments" on public.retail_payments;
drop policy if exists "retail payment users can update payments" on public.retail_payments;
drop policy if exists "retail admins can delete payments" on public.retail_payments;
drop policy if exists "retail users can read payments" on public.retail_payments;
create policy "retail users can read payments"
on public.retail_payments for select to authenticated using (public.can_view_retail());
drop policy if exists "retail payment users can insert payments" on public.retail_payments;
create policy "retail payment users can insert payments"
on public.retail_payments for insert to authenticated with check (
  public.can_manage_retail_payments()
  and (received_by = auth.uid() or received_by is null)
);
drop policy if exists "retail payment users can update payments" on public.retail_payments;
create policy "retail payment users can update payments"
on public.retail_payments for update to authenticated
using (public.can_manage_retail_payments())
with check (public.can_manage_retail_payments());
drop policy if exists "retail admins can delete payments" on public.retail_payments;
create policy "retail admins can delete payments"
on public.retail_payments for delete to authenticated using (public.can_administer_retail());

drop policy if exists "retail users can read price rules" on public.retail_price_rules;
drop policy if exists "retail admins can insert price rules" on public.retail_price_rules;
drop policy if exists "retail admins can update price rules" on public.retail_price_rules;
drop policy if exists "retail admins can delete price rules" on public.retail_price_rules;
drop policy if exists "retail users can read price rules" on public.retail_price_rules;
create policy "retail users can read price rules"
on public.retail_price_rules for select to authenticated using (public.can_view_retail());
drop policy if exists "retail admins can insert price rules" on public.retail_price_rules;
create policy "retail admins can insert price rules"
on public.retail_price_rules for insert to authenticated with check (
  public.can_administer_retail() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "retail admins can update price rules" on public.retail_price_rules;
create policy "retail admins can update price rules"
on public.retail_price_rules for update to authenticated
using (public.can_administer_retail())
with check (public.can_administer_retail());
drop policy if exists "retail admins can delete price rules" on public.retail_price_rules;
create policy "retail admins can delete price rules"
on public.retail_price_rules for delete to authenticated using (public.can_administer_retail());

drop policy if exists "retail users can read processing batches" on public.retail_processing_batches;
drop policy if exists "retail operators can insert processing batches" on public.retail_processing_batches;
drop policy if exists "retail operators can update processing batches" on public.retail_processing_batches;
drop policy if exists "retail admins can delete processing batches" on public.retail_processing_batches;
drop policy if exists "retail users can read processing batches" on public.retail_processing_batches;
create policy "retail users can read processing batches"
on public.retail_processing_batches for select to authenticated using (public.can_view_retail());
drop policy if exists "retail operators can insert processing batches" on public.retail_processing_batches;
create policy "retail operators can insert processing batches"
on public.retail_processing_batches for insert to authenticated with check (
  public.can_manage_retail() and (processed_by = auth.uid() or processed_by is null)
);
drop policy if exists "retail operators can update processing batches" on public.retail_processing_batches;
create policy "retail operators can update processing batches"
on public.retail_processing_batches for update to authenticated
using (public.can_manage_retail())
with check (public.can_manage_retail());
drop policy if exists "retail admins can delete processing batches" on public.retail_processing_batches;
create policy "retail admins can delete processing batches"
on public.retail_processing_batches for delete to authenticated using (public.can_administer_retail());

drop policy if exists "retail users can read cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "retail operators can insert cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "retail operators can update cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "retail admins can delete cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "retail users can read cleaning tasks" on public.retail_cleaning_tasks;
create policy "retail users can read cleaning tasks"
on public.retail_cleaning_tasks for select to authenticated using (public.can_view_retail());
drop policy if exists "retail operators can insert cleaning tasks" on public.retail_cleaning_tasks;
create policy "retail operators can insert cleaning tasks"
on public.retail_cleaning_tasks for insert to authenticated with check (
  public.can_manage_retail() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "retail operators can update cleaning tasks" on public.retail_cleaning_tasks;
create policy "retail operators can update cleaning tasks"
on public.retail_cleaning_tasks for update to authenticated
using (public.can_manage_retail())
with check (public.can_manage_retail());
drop policy if exists "retail admins can delete cleaning tasks" on public.retail_cleaning_tasks;
create policy "retail admins can delete cleaning tasks"
on public.retail_cleaning_tasks for delete to authenticated using (public.can_administer_retail());

drop policy if exists "retail users can read expenses" on public.retail_expenses;
drop policy if exists "retail payment users can insert expenses" on public.retail_expenses;
drop policy if exists "retail payment users can update expenses" on public.retail_expenses;
drop policy if exists "retail expense reviewers can update expenses" on public.retail_expenses;
drop policy if exists "retail expense approvers can update expenses" on public.retail_expenses;
drop policy if exists "retail admins can delete expenses" on public.retail_expenses;
drop policy if exists "retail users can read expenses" on public.retail_expenses;
create policy "retail users can read expenses"
on public.retail_expenses for select to authenticated using (public.can_view_retail());
drop policy if exists "retail payment users can insert expenses" on public.retail_expenses;
create policy "retail payment users can insert expenses"
on public.retail_expenses for insert to authenticated with check (
  public.can_manage_retail_payments()
  and (submitted_by = auth.uid() or submitted_by is null)
);
drop policy if exists "retail payment users can update expenses" on public.retail_expenses;
create policy "retail payment users can update expenses"
on public.retail_expenses for update to authenticated
using (
  public.can_manage_retail_payments()
  and submitted_by = auth.uid()
  and status = 'SUBMITTED'
)
with check (
  public.can_manage_retail_payments()
  and submitted_by = auth.uid()
  and status = 'SUBMITTED'
);
drop policy if exists "retail expense reviewers can update expenses" on public.retail_expenses;
create policy "retail expense reviewers can update expenses"
on public.retail_expenses for update to authenticated
using (public.can_review_retail_expenses() and status = 'SUBMITTED')
with check (public.can_review_retail_expenses() and status in ('REVIEWED', 'REJECTED'));
drop policy if exists "retail expense approvers can update expenses" on public.retail_expenses;
create policy "retail expense approvers can update expenses"
on public.retail_expenses for update to authenticated
using (public.can_administer_retail() and status in ('REVIEWED', 'APPROVED'))
with check (public.can_administer_retail() and status in ('APPROVED', 'REJECTED', 'PAID'));
drop policy if exists "retail admins can delete expenses" on public.retail_expenses;
create policy "retail admins can delete expenses"
on public.retail_expenses for delete to authenticated using (public.can_administer_retail());
