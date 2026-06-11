do $$
begin
  create type public.finance_invoice_type as enum (
    'AR',
    'AP'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.finance_invoice_status as enum (
    'DRAFT',
    'SUBMITTED',
    'ACCOUNT_REVIEWED',
    'DIRECTOR_APPROVED',
    'REJECTED',
    'PAID',
    'VOID'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.container_status as enum (
    'OPEN',
    'IN_TRANSIT',
    'ARRIVED',
    'CLOSED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.director_report_type as enum (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'CUSTOM'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.can_view_finance()
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

create or replace function public.can_manage_finance()
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

create or replace function public.can_approve_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('director');
$$;

create table if not exists public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  invoice_type public.finance_invoice_type not null,
  party_name text not null,
  invoice_date date not null default current_date,
  due_date date,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12, 2) generated always as (amount + tax_amount) stored,
  status public.finance_invoice_status not null default 'SUBMITTED',
  file_id uuid references public.files(id) on delete set null,
  related_module text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_containers (
  id uuid primary key default gen_random_uuid(),
  container_no text not null unique,
  supplier_name text not null,
  eta_date date,
  arrival_date date,
  status public.container_status not null default 'OPEN',
  total_cost numeric(12, 2) not null default 0 check (total_cost >= 0),
  currency text not null default 'MYR',
  invoice_id uuid references public.finance_invoices(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.director_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_no text not null unique,
  report_type public.director_report_type not null default 'DAILY',
  period_start date not null,
  period_end date not null,
  total_sales numeric(12, 2) not null default 0 check (total_sales >= 0),
  cash_collected numeric(12, 2) not null default 0 check (cash_collected >= 0),
  outstanding_ar numeric(12, 2) not null default 0 check (outstanding_ar >= 0),
  outstanding_ap numeric(12, 2) not null default 0 check (outstanding_ap >= 0),
  stock_value numeric(12, 2) not null default 0 check (stock_value >= 0),
  expense_total numeric(12, 2) not null default 0 check (expense_total >= 0),
  generated_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_invoices_type_status on public.finance_invoices(invoice_type, status);
create index if not exists idx_finance_invoices_created_at on public.finance_invoices(created_at desc);
create index if not exists idx_finance_containers_status on public.finance_containers(status);
create index if not exists idx_finance_containers_eta on public.finance_containers(eta_date);
create index if not exists idx_director_report_snapshots_period on public.director_report_snapshots(period_start, period_end);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'finance_invoices',
    'finance_containers'
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

alter table public.finance_invoices enable row level security;
alter table public.finance_containers enable row level security;
alter table public.director_report_snapshots enable row level security;

drop policy if exists "finance users can read invoices" on public.finance_invoices;
drop policy if exists "finance users can insert invoices" on public.finance_invoices;
drop policy if exists "finance users can update invoices" on public.finance_invoices;
drop policy if exists "finance reviewers can update invoices" on public.finance_invoices;
drop policy if exists "finance approvers can update invoices" on public.finance_invoices;
drop policy if exists "finance users can mark invoices paid" on public.finance_invoices;
drop policy if exists "finance approvers can delete invoices" on public.finance_invoices;
drop policy if exists "finance users can read invoices" on public.finance_invoices;
create policy "finance users can read invoices"
on public.finance_invoices for select to authenticated using (public.can_view_finance());
drop policy if exists "finance users can insert invoices" on public.finance_invoices;
create policy "finance users can insert invoices"
on public.finance_invoices for insert to authenticated with check (
  public.can_manage_finance() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "finance users can update invoices" on public.finance_invoices;
create policy "finance users can update invoices"
on public.finance_invoices for update to authenticated
using (
  public.can_manage_finance()
  and created_by = auth.uid()
  and status in ('DRAFT', 'SUBMITTED')
)
with check (
  public.can_manage_finance()
  and created_by = auth.uid()
  and status in ('DRAFT', 'SUBMITTED')
  and reviewed_by is null
  and approved_by is null
  and approved_at is null
  and paid_at is null
);
drop policy if exists "finance reviewers can update invoices" on public.finance_invoices;
create policy "finance reviewers can update invoices"
on public.finance_invoices for update to authenticated
using (public.can_manage_finance() and status = 'SUBMITTED')
with check (public.can_manage_finance() and status in ('ACCOUNT_REVIEWED', 'REJECTED'));
drop policy if exists "finance approvers can update invoices" on public.finance_invoices;
create policy "finance approvers can update invoices"
on public.finance_invoices for update to authenticated
using (public.can_approve_finance() and status = 'ACCOUNT_REVIEWED')
with check (public.can_approve_finance() and status in ('DIRECTOR_APPROVED', 'REJECTED'));
drop policy if exists "finance users can mark invoices paid" on public.finance_invoices;
create policy "finance users can mark invoices paid"
on public.finance_invoices for update to authenticated
using (public.can_manage_finance() and status = 'DIRECTOR_APPROVED')
with check (public.can_manage_finance() and status = 'PAID');
drop policy if exists "finance approvers can delete invoices" on public.finance_invoices;
create policy "finance approvers can delete invoices"
on public.finance_invoices for delete to authenticated using (public.can_approve_finance());

drop policy if exists "finance users can read containers" on public.finance_containers;
drop policy if exists "finance users can insert containers" on public.finance_containers;
drop policy if exists "finance users can update containers" on public.finance_containers;
drop policy if exists "finance approvers can delete containers" on public.finance_containers;
drop policy if exists "finance users can read containers" on public.finance_containers;
create policy "finance users can read containers"
on public.finance_containers for select to authenticated using (public.can_view_finance());
drop policy if exists "finance users can insert containers" on public.finance_containers;
create policy "finance users can insert containers"
on public.finance_containers for insert to authenticated with check (
  public.can_manage_finance() and (updated_by = auth.uid() or updated_by is null)
);
drop policy if exists "finance users can update containers" on public.finance_containers;
create policy "finance users can update containers"
on public.finance_containers for update to authenticated
using (public.can_manage_finance())
with check (public.can_manage_finance());
drop policy if exists "finance approvers can delete containers" on public.finance_containers;
create policy "finance approvers can delete containers"
on public.finance_containers for delete to authenticated using (public.can_approve_finance());

drop policy if exists "directors can read report snapshots" on public.director_report_snapshots;
drop policy if exists "directors can insert report snapshots" on public.director_report_snapshots;
drop policy if exists "directors can delete report snapshots" on public.director_report_snapshots;
drop policy if exists "directors can read report snapshots" on public.director_report_snapshots;
create policy "directors can read report snapshots"
on public.director_report_snapshots for select to authenticated using (public.can_approve_finance());
drop policy if exists "directors can insert report snapshots" on public.director_report_snapshots;
create policy "directors can insert report snapshots"
on public.director_report_snapshots for insert to authenticated with check (
  public.can_approve_finance() and (generated_by = auth.uid() or generated_by is null)
);
drop policy if exists "directors can delete report snapshots" on public.director_report_snapshots;
create policy "directors can delete report snapshots"
on public.director_report_snapshots for delete to authenticated using (public.can_approve_finance());
