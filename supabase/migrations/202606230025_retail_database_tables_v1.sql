-- Retail Module V1 database refinement.
-- This migration keeps existing operational tables intact and adds the
-- canonical V1 table/column names requested for reporting, audit, and future API use.

create unique index if not exists retail_daily_sales_one_summary_per_outlet_date
on public.retail_daily_sales(outlet_id, sales_date);

alter table public.retail_expense_categories
  add column if not exists active boolean;

update public.retail_expense_categories
set active = coalesce(active, is_active, true)
where active is null;

alter table public.retail_expense_categories
  alter column active set default true,
  alter column active set not null;

alter table public.retail_expenses
  add column if not exists category_id uuid references public.retail_expense_categories(id) on delete set null;

update public.retail_expenses expense
set category_id = (
  select category.id
  from public.retail_expense_categories category
  where category.name = expense.category
    and (category.outlet_id = expense.outlet_id or category.outlet_id is null)
  order by category.outlet_id is null
  limit 1
)
where expense.category_id is null;

alter table public.retail_cleaning_tasks
  add column if not exists active boolean;

update public.retail_cleaning_tasks
set active = coalesce(active, is_active, true)
where active is null;

alter table public.retail_cleaning_tasks
  alter column active set default true,
  alter column active set not null;

alter table public.retail_cleaning_completions
  add column if not exists completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists completed_at timestamptz not null default now(),
  add column if not exists photo_url text,
  add column if not exists remarks text;

alter table public.retail_processing_boms
  add column if not exists bom_name text,
  add column if not exists raw_item_names text[],
  add column if not exists finished_item_names text[],
  add column if not exists expected_yield_min numeric(8, 2),
  add column if not exists expected_yield_max numeric(8, 2),
  add column if not exists expected_wastage numeric(8, 2),
  add column if not exists active boolean;

update public.retail_processing_boms
set
  bom_name = coalesce(bom_name, name),
  raw_item_names = coalesce(raw_item_names, raw_material_item_names),
  finished_item_names = coalesce(finished_item_names, finished_product_item_names),
  expected_yield_min = coalesce(expected_yield_min, expected_yield_min_percent),
  expected_yield_max = coalesce(expected_yield_max, expected_yield_max_percent),
  expected_wastage = coalesce(expected_wastage, expected_wastage_percent),
  active = coalesce(active, is_active, true)
where bom_name is null
   or raw_item_names is null
   or finished_item_names is null
   or active is null;

alter table public.retail_processing_boms
  alter column bom_name set not null,
  alter column raw_item_names set default '{}'::text[],
  alter column raw_item_names set not null,
  alter column finished_item_names set default '{}'::text[],
  alter column finished_item_names set not null,
  alter column active set default true,
  alter column active set not null;

create or replace function public.sync_retail_expense_category_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.active := coalesce(new.active, new.is_active, true);
    new.is_active := coalesce(new.is_active, new.active, true);
  elsif new.active is distinct from old.active then
    new.is_active := new.active;
  elsif new.is_active is distinct from old.is_active then
    new.active := new.is_active;
  else
    new.active := coalesce(new.active, new.is_active, true);
    new.is_active := coalesce(new.is_active, new.active, true);
  end if;

  return new;
end;
$$;

drop trigger if exists sync_retail_expense_category_active on public.retail_expense_categories;
create trigger sync_retail_expense_category_active
before insert or update on public.retail_expense_categories
for each row execute function public.sync_retail_expense_category_active();

create or replace function public.sync_retail_cleaning_task_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.active := coalesce(new.active, new.is_active, true);
    new.is_active := coalesce(new.is_active, new.active, true);
  elsif new.active is distinct from old.active then
    new.is_active := new.active;
  elsif new.is_active is distinct from old.is_active then
    new.active := new.is_active;
  else
    new.active := coalesce(new.active, new.is_active, true);
    new.is_active := coalesce(new.is_active, new.active, true);
  end if;

  return new;
end;
$$;

drop trigger if exists sync_retail_cleaning_task_active on public.retail_cleaning_tasks;
create trigger sync_retail_cleaning_task_active
before insert or update on public.retail_cleaning_tasks
for each row execute function public.sync_retail_cleaning_task_active();

create or replace function public.sync_retail_processing_bom_aliases()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.bom_name := coalesce(new.bom_name, new.name);
    new.name := coalesce(new.name, new.bom_name);
    new.raw_item_names := coalesce(new.raw_item_names, new.raw_material_item_names, '{}'::text[]);
    new.raw_material_item_names := coalesce(new.raw_material_item_names, new.raw_item_names, '{}'::text[]);
    new.finished_item_names := coalesce(new.finished_item_names, new.finished_product_item_names, '{}'::text[]);
    new.finished_product_item_names := coalesce(new.finished_product_item_names, new.finished_item_names, '{}'::text[]);
    new.expected_yield_min := coalesce(new.expected_yield_min, new.expected_yield_min_percent);
    new.expected_yield_min_percent := coalesce(new.expected_yield_min_percent, new.expected_yield_min);
    new.expected_yield_max := coalesce(new.expected_yield_max, new.expected_yield_max_percent);
    new.expected_yield_max_percent := coalesce(new.expected_yield_max_percent, new.expected_yield_max);
    new.expected_wastage := coalesce(new.expected_wastage, new.expected_wastage_percent);
    new.expected_wastage_percent := coalesce(new.expected_wastage_percent, new.expected_wastage);
    new.active := coalesce(new.active, new.is_active, true);
    new.is_active := coalesce(new.is_active, new.active, true);
  else
    if new.bom_name is distinct from old.bom_name then
      new.name := new.bom_name;
    elsif new.name is distinct from old.name then
      new.bom_name := new.name;
    end if;

    if new.raw_item_names is distinct from old.raw_item_names then
      new.raw_material_item_names := new.raw_item_names;
    elsif new.raw_material_item_names is distinct from old.raw_material_item_names then
      new.raw_item_names := new.raw_material_item_names;
    end if;

    if new.finished_item_names is distinct from old.finished_item_names then
      new.finished_product_item_names := new.finished_item_names;
    elsif new.finished_product_item_names is distinct from old.finished_product_item_names then
      new.finished_item_names := new.finished_product_item_names;
    end if;

    if new.expected_yield_min is distinct from old.expected_yield_min then
      new.expected_yield_min_percent := new.expected_yield_min;
    elsif new.expected_yield_min_percent is distinct from old.expected_yield_min_percent then
      new.expected_yield_min := new.expected_yield_min_percent;
    end if;

    if new.expected_yield_max is distinct from old.expected_yield_max then
      new.expected_yield_max_percent := new.expected_yield_max;
    elsif new.expected_yield_max_percent is distinct from old.expected_yield_max_percent then
      new.expected_yield_max := new.expected_yield_max_percent;
    end if;

    if new.expected_wastage is distinct from old.expected_wastage then
      new.expected_wastage_percent := new.expected_wastage;
    elsif new.expected_wastage_percent is distinct from old.expected_wastage_percent then
      new.expected_wastage := new.expected_wastage_percent;
    end if;

    if new.active is distinct from old.active then
      new.is_active := new.active;
    elsif new.is_active is distinct from old.is_active then
      new.active := new.is_active;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_retail_processing_bom_aliases on public.retail_processing_boms;
create trigger sync_retail_processing_bom_aliases
before insert or update on public.retail_processing_boms
for each row execute function public.sync_retail_processing_bom_aliases();

create table if not exists public.retail_processing_records (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references public.outlets(id) on delete set null,
  processing_date date not null default current_date,
  bom_id uuid references public.retail_processing_boms(id) on delete set null,
  processing_type_name text not null default 'Retail processing',
  status public.retail_processing_status not null default 'DRAFT',
  total_raw_weight numeric(12, 3) not null default 0 check (total_raw_weight >= 0),
  total_finished_weight numeric(12, 3) not null default 0 check (total_finished_weight >= 0),
  total_wastage_weight numeric(12, 3) not null default 0 check (total_wastage_weight >= 0),
  yield_percent numeric(8, 2),
  wastage_percent numeric(8, 2),
  unaccounted_difference numeric(12, 3) not null default 0,
  warning_flag boolean not null default false,
  remarks text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);

create index if not exists idx_retail_processing_records_outlet_date
on public.retail_processing_records(outlet_id, processing_date desc, status);

create or replace function public.sync_retail_processing_record_from_batch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.retail_processing_records (
    id,
    outlet_id,
    processing_date,
    bom_id,
    processing_type_name,
    status,
    total_raw_weight,
    total_finished_weight,
    total_wastage_weight,
    yield_percent,
    wastage_percent,
    unaccounted_difference,
    warning_flag,
    remarks,
    created_by,
    created_at,
    submitted_by,
    submitted_at,
    reviewed_by,
    reviewed_at
  )
  values (
    new.id,
    new.outlet_id,
    coalesce(new.processing_date, current_date),
    new.processing_bom_id,
    coalesce(nullif(new.processing_type, ''), 'Retail processing'),
    new.status,
    coalesce(new.raw_weight_kg, 0),
    coalesce(new.finished_weight_kg, 0),
    coalesce(new.wastage_weight_kg, 0),
    new.yield_percent,
    new.wastage_percent,
    new.unaccounted_difference_kg,
    coalesce(nullif(new.warning_message, ''), 'OK') <> 'OK',
    coalesce(new.remarks, new.notes),
    coalesce(new.created_by, new.worker_id, new.processed_by),
    coalesce(new.created_at, now()),
    new.submitted_by,
    new.submitted_at,
    new.reviewed_by,
    new.reviewed_at
  )
  on conflict (id) do update set
    outlet_id = excluded.outlet_id,
    processing_date = excluded.processing_date,
    bom_id = excluded.bom_id,
    processing_type_name = excluded.processing_type_name,
    status = excluded.status,
    total_raw_weight = excluded.total_raw_weight,
    total_finished_weight = excluded.total_finished_weight,
    total_wastage_weight = excluded.total_wastage_weight,
    yield_percent = excluded.yield_percent,
    wastage_percent = excluded.wastage_percent,
    unaccounted_difference = excluded.unaccounted_difference,
    warning_flag = excluded.warning_flag,
    remarks = excluded.remarks,
    created_by = excluded.created_by,
    created_at = excluded.created_at,
    submitted_by = excluded.submitted_by,
    submitted_at = excluded.submitted_at,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at;

  return new;
end;
$$;

insert into public.retail_processing_records (
  id,
  outlet_id,
  processing_date,
  bom_id,
  processing_type_name,
  status,
  total_raw_weight,
  total_finished_weight,
  total_wastage_weight,
  yield_percent,
  wastage_percent,
  unaccounted_difference,
  warning_flag,
  remarks,
  created_by,
  created_at,
  submitted_by,
  submitted_at,
  reviewed_by,
  reviewed_at
)
select
  batch.id,
  batch.outlet_id,
  coalesce(batch.processing_date, current_date),
  batch.processing_bom_id,
  coalesce(nullif(batch.processing_type, ''), 'Retail processing'),
  batch.status,
  coalesce(batch.raw_weight_kg, 0),
  coalesce(batch.finished_weight_kg, 0),
  coalesce(batch.wastage_weight_kg, 0),
  batch.yield_percent,
  batch.wastage_percent,
  batch.unaccounted_difference_kg,
  coalesce(nullif(batch.warning_message, ''), 'OK') <> 'OK',
  coalesce(batch.remarks, batch.notes),
  coalesce(batch.created_by, batch.worker_id, batch.processed_by),
  coalesce(batch.created_at, now()),
  batch.submitted_by,
  batch.submitted_at,
  batch.reviewed_by,
  batch.reviewed_at
from public.retail_processing_batches batch
on conflict (id) do update set
  outlet_id = excluded.outlet_id,
  processing_date = excluded.processing_date,
  bom_id = excluded.bom_id,
  processing_type_name = excluded.processing_type_name,
  status = excluded.status,
  total_raw_weight = excluded.total_raw_weight,
  total_finished_weight = excluded.total_finished_weight,
  total_wastage_weight = excluded.total_wastage_weight,
  yield_percent = excluded.yield_percent,
  wastage_percent = excluded.wastage_percent,
  unaccounted_difference = excluded.unaccounted_difference,
  warning_flag = excluded.warning_flag,
  remarks = excluded.remarks,
  created_by = excluded.created_by,
  created_at = excluded.created_at,
  submitted_by = excluded.submitted_by,
  submitted_at = excluded.submitted_at,
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at;

drop trigger if exists sync_retail_processing_record_from_batch on public.retail_processing_batches;
create trigger sync_retail_processing_record_from_batch
after insert or update on public.retail_processing_batches
for each row execute function public.sync_retail_processing_record_from_batch();

alter table public.retail_processing_raw_lines
  add column if not exists processing_record_id uuid references public.retail_processing_records(id) on delete cascade,
  add column if not exists raw_item_name text,
  add column if not exists weight numeric(12, 3);

update public.retail_processing_raw_lines
set
  processing_record_id = coalesce(processing_record_id, processing_batch_id),
  raw_item_name = coalesce(raw_item_name, item_name),
  weight = coalesce(weight, weight_kg)
where processing_record_id is null
   or raw_item_name is null
   or weight is null;

alter table public.retail_processing_finished_lines
  add column if not exists processing_record_id uuid references public.retail_processing_records(id) on delete cascade,
  add column if not exists finished_item_name text,
  add column if not exists weight numeric(12, 3);

update public.retail_processing_finished_lines
set
  processing_record_id = coalesce(processing_record_id, processing_batch_id),
  finished_item_name = coalesce(finished_item_name, item_name),
  weight = coalesce(weight, weight_kg)
where processing_record_id is null
   or finished_item_name is null
   or weight is null;

create or replace function public.sync_retail_processing_raw_line_aliases()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.processing_record_id := coalesce(new.processing_record_id, new.processing_batch_id);
  new.processing_batch_id := coalesce(new.processing_batch_id, new.processing_record_id);
  new.raw_item_name := coalesce(new.raw_item_name, new.item_name);
  new.item_name := coalesce(new.item_name, new.raw_item_name);
  new.weight := coalesce(new.weight, new.weight_kg);
  new.weight_kg := coalesce(new.weight_kg, new.weight);

  return new;
end;
$$;

drop trigger if exists sync_retail_processing_raw_line_aliases on public.retail_processing_raw_lines;
create trigger sync_retail_processing_raw_line_aliases
before insert or update on public.retail_processing_raw_lines
for each row execute function public.sync_retail_processing_raw_line_aliases();

create or replace function public.sync_retail_processing_finished_line_aliases()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.processing_record_id := coalesce(new.processing_record_id, new.processing_batch_id);
  new.processing_batch_id := coalesce(new.processing_batch_id, new.processing_record_id);
  new.finished_item_name := coalesce(new.finished_item_name, new.item_name);
  new.item_name := coalesce(new.item_name, new.finished_item_name);
  new.weight := coalesce(new.weight, new.weight_kg);
  new.weight_kg := coalesce(new.weight_kg, new.weight);

  return new;
end;
$$;

drop trigger if exists sync_retail_processing_finished_line_aliases on public.retail_processing_finished_lines;
create trigger sync_retail_processing_finished_line_aliases
before insert or update on public.retail_processing_finished_lines
for each row execute function public.sync_retail_processing_finished_line_aliases();

create table if not exists public.retail_cash_closings (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references public.outlets(id) on delete set null,
  closing_date date not null default current_date,
  opening_cash numeric(12, 2) not null default 0 check (opening_cash >= 0),
  cash_sales numeric(12, 2) not null default 0 check (cash_sales >= 0),
  bank_transfer_sales numeric(12, 2) not null default 0 check (bank_transfer_sales >= 0),
  ewallet_sales numeric(12, 2) not null default 0 check (ewallet_sales >= 0),
  credit_sales numeric(12, 2) not null default 0 check (credit_sales >= 0),
  cash_expenses numeric(12, 2) not null default 0 check (cash_expenses >= 0),
  expected_cash numeric(12, 2) not null default 0,
  actual_cash_counted numeric(12, 2) not null default 0 check (actual_cash_counted >= 0),
  variance numeric(12, 2) not null default 0,
  remarks text,
  status public.retail_closing_status not null default 'DRAFT',
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index if not exists retail_cash_closings_one_per_outlet_date
on public.retail_cash_closings(outlet_id, closing_date);

create index if not exists idx_retail_cash_closings_status
on public.retail_cash_closings(status, closing_date desc);

create or replace function public.sync_retail_cash_closing_from_daily_closing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.retail_cash_closings (
    id,
    outlet_id,
    closing_date,
    opening_cash,
    cash_sales,
    bank_transfer_sales,
    ewallet_sales,
    credit_sales,
    cash_expenses,
    expected_cash,
    actual_cash_counted,
    variance,
    remarks,
    status,
    submitted_by,
    submitted_at,
    reviewed_by,
    reviewed_at,
    updated_by,
    updated_at
  )
  values (
    new.id,
    new.outlet_id,
    new.closing_date,
    coalesce(new.opening_cash, 0),
    coalesce(new.cash_sales, new.cash_received, 0),
    coalesce(new.bank_transfer_sales, 0),
    coalesce(new.ewallet_sales, 0),
    coalesce(new.credit_sales, 0),
    coalesce(new.cash_expenses, new.expenses_amount, 0),
    coalesce(new.expected_cash, coalesce(new.opening_cash, 0) + coalesce(new.cash_sales, new.cash_received, 0) - coalesce(new.cash_expenses, new.expenses_amount, 0)),
    coalesce(new.actual_cash_counted, new.closing_cash, 0),
    coalesce(new.variance_amount, coalesce(new.actual_cash_counted, new.closing_cash, 0) - coalesce(new.expected_cash, 0)),
    coalesce(new.remarks, new.notes),
    new.status,
    new.submitted_by,
    new.submitted_at,
    coalesce(new.reviewed_by, new.approved_by),
    coalesce(new.reviewed_at, new.approved_at),
    new.updated_by,
    coalesce(new.updated_at, now())
  )
  on conflict (id) do update set
    outlet_id = excluded.outlet_id,
    closing_date = excluded.closing_date,
    opening_cash = excluded.opening_cash,
    cash_sales = excluded.cash_sales,
    bank_transfer_sales = excluded.bank_transfer_sales,
    ewallet_sales = excluded.ewallet_sales,
    credit_sales = excluded.credit_sales,
    cash_expenses = excluded.cash_expenses,
    expected_cash = excluded.expected_cash,
    actual_cash_counted = excluded.actual_cash_counted,
    variance = excluded.variance,
    remarks = excluded.remarks,
    status = excluded.status,
    submitted_by = excluded.submitted_by,
    submitted_at = excluded.submitted_at,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

insert into public.retail_cash_closings (
  id,
  outlet_id,
  closing_date,
  opening_cash,
  cash_sales,
  bank_transfer_sales,
  ewallet_sales,
  credit_sales,
  cash_expenses,
  expected_cash,
  actual_cash_counted,
  variance,
  remarks,
  status,
  submitted_by,
  submitted_at,
  reviewed_by,
  reviewed_at,
  updated_by,
  updated_at
)
select
  closing.id,
  closing.outlet_id,
  closing.closing_date,
  coalesce(closing.opening_cash, 0),
  coalesce(closing.cash_sales, closing.cash_received, 0),
  coalesce(closing.bank_transfer_sales, 0),
  coalesce(closing.ewallet_sales, 0),
  coalesce(closing.credit_sales, 0),
  coalesce(closing.cash_expenses, closing.expenses_amount, 0),
  coalesce(closing.expected_cash, coalesce(closing.opening_cash, 0) + coalesce(closing.cash_sales, closing.cash_received, 0) - coalesce(closing.cash_expenses, closing.expenses_amount, 0)),
  coalesce(closing.actual_cash_counted, closing.closing_cash, 0),
  coalesce(closing.variance_amount, coalesce(closing.actual_cash_counted, closing.closing_cash, 0) - coalesce(closing.expected_cash, 0)),
  coalesce(closing.remarks, closing.notes),
  closing.status,
  closing.submitted_by,
  closing.submitted_at,
  coalesce(closing.reviewed_by, closing.approved_by),
  coalesce(closing.reviewed_at, closing.approved_at),
  closing.updated_by,
  coalesce(closing.updated_at, now())
from public.retail_daily_closings closing
on conflict (id) do update set
  outlet_id = excluded.outlet_id,
  closing_date = excluded.closing_date,
  opening_cash = excluded.opening_cash,
  cash_sales = excluded.cash_sales,
  bank_transfer_sales = excluded.bank_transfer_sales,
  ewallet_sales = excluded.ewallet_sales,
  credit_sales = excluded.credit_sales,
  cash_expenses = excluded.cash_expenses,
  expected_cash = excluded.expected_cash,
  actual_cash_counted = excluded.actual_cash_counted,
  variance = excluded.variance,
  remarks = excluded.remarks,
  status = excluded.status,
  submitted_by = excluded.submitted_by,
  submitted_at = excluded.submitted_at,
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  updated_by = excluded.updated_by,
  updated_at = excluded.updated_at;

drop trigger if exists sync_retail_cash_closing_from_daily_closing on public.retail_daily_closings;
create trigger sync_retail_cash_closing_from_daily_closing
after insert or update on public.retail_daily_closings
for each row execute function public.sync_retail_cash_closing_from_daily_closing();

alter table public.retail_audit_logs
  add column if not exists field_name text;

update public.retail_audit_logs
set field_name = coalesce(field_name, field_changed)
where field_name is null;

create or replace function public.log_retail_audit_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  changed_key text;
  ignored_fields text[] := array[
    'updated_at',
    'updated_by'
  ];
  audit_outlet_id uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  old_row := to_jsonb(old);
  new_row := to_jsonb(new);

  if nullif(new_row ->> 'outlet_id', '') is not null then
    audit_outlet_id := (new_row ->> 'outlet_id')::uuid;
  end if;

  for changed_key in select jsonb_object_keys(new_row)
  loop
    if changed_key = any(ignored_fields) then
      continue;
    end if;

    if (old_row -> changed_key) is distinct from (new_row -> changed_key) then
      insert into public.retail_audit_logs (
        table_name,
        record_id,
        outlet_id,
        field_changed,
        field_name,
        old_value,
        new_value,
        edited_by,
        reason
      )
      values (
        tg_table_name,
        (new_row ->> 'id')::uuid,
        audit_outlet_id,
        changed_key,
        changed_key,
        old_row ->> changed_key,
        new_row ->> changed_key,
        public.retail_audit_editor(new_row),
        public.retail_audit_reason(old_row, new_row)
      );
    end if;
  end loop;

  return new;
end;
$$;

alter table public.retail_processing_records enable row level security;
alter table public.retail_cash_closings enable row level security;

drop policy if exists "retail users can read processing records" on public.retail_processing_records;
create policy "retail users can read processing records"
on public.retail_processing_records for select to authenticated
using (
  public.is_admin_or_director()
  or (
    public.can_view_retail()
    and outlet_id is not null
    and public.can_access_outlet(outlet_id)
    and public.can_access_outlet_module(outlet_id, 'retail')
  )
);

drop policy if exists "retail users can insert processing records" on public.retail_processing_records;
create policy "retail users can insert processing records"
on public.retail_processing_records for insert to authenticated
with check (
  public.can_manage_retail()
  and outlet_id is not null
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('DRAFT', 'SUBMITTED')
  and (created_by = auth.uid() or created_by is null)
  and (submitted_by = auth.uid() or submitted_by is null)
);

drop policy if exists "retail managers can update processing records" on public.retail_processing_records;
create policy "retail managers can update processing records"
on public.retail_processing_records for update to authenticated
using (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and outlet_id is not null
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
)
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and outlet_id is not null
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('DRAFT', 'SUBMITTED', 'REVIEWED', 'REJECTED', 'CANCELLED')
);

drop policy if exists "retail users can read cash closings" on public.retail_cash_closings;
create policy "retail users can read cash closings"
on public.retail_cash_closings for select to authenticated
using (
  public.is_admin_or_director()
  or (
    public.can_view_retail()
    and outlet_id is not null
    and public.can_access_outlet(outlet_id)
    and public.can_access_outlet_module(outlet_id, 'retail')
  )
);

drop policy if exists "retail managers can insert cash closings" on public.retail_cash_closings;
create policy "retail managers can insert cash closings"
on public.retail_cash_closings for insert to authenticated
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and outlet_id is not null
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (public.is_admin_or_director() or closing_date = current_date)
  and status::text in ('DRAFT', 'SUBMITTED')
  and (submitted_by = auth.uid() or submitted_by is null)
);

drop policy if exists "retail managers can update cash closings" on public.retail_cash_closings;
create policy "retail managers can update cash closings"
on public.retail_cash_closings for update to authenticated
using (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and outlet_id is not null
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (public.is_admin_or_director() or closing_date = current_date)
)
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and outlet_id is not null
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (public.is_admin_or_director() or closing_date = current_date)
  and status::text in ('DRAFT', 'SUBMITTED', 'REVIEWED')
);
