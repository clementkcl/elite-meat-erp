update public.retail_daily_closings
set status = 'REVIEWED'
where status::text = 'APPROVED';

create table if not exists public.retail_audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  outlet_id uuid references public.outlets(id) on delete set null,
  field_changed text not null,
  old_value text,
  new_value text,
  edited_by uuid references public.profiles(id) on delete set null,
  edited_at timestamptz not null default now(),
  reason text
);

create index if not exists idx_retail_audit_logs_table_record
on public.retail_audit_logs(table_name, record_id, edited_at desc);

create index if not exists idx_retail_audit_logs_outlet_time
on public.retail_audit_logs(outlet_id, edited_at desc);

create index if not exists idx_retail_audit_logs_edited_by_time
on public.retail_audit_logs(edited_by, edited_at desc);

create or replace function public.retail_audit_editor(new_row jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  editor uuid;
begin
  editor := auth.uid();

  if nullif(new_row ->> 'updated_by', '') is not null then
    editor := (new_row ->> 'updated_by')::uuid;
  elsif nullif(new_row ->> 'reviewed_by', '') is not null then
    editor := (new_row ->> 'reviewed_by')::uuid;
  elsif nullif(new_row ->> 'submitted_by', '') is not null then
    editor := (new_row ->> 'submitted_by')::uuid;
  elsif nullif(new_row ->> 'completed_by', '') is not null then
    editor := (new_row ->> 'completed_by')::uuid;
  end if;

  return editor;
end;
$$;

create or replace function public.retail_audit_reason(
  old_row jsonb,
  new_row jsonb
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(new_row ->> 'rejection_reason', ''),
    nullif(new_row ->> 'remarks', ''),
    nullif(new_row ->> 'notes', ''),
    nullif(new_row ->> 'wastage_reason', ''),
    nullif(old_row ->> 'rejection_reason', ''),
    nullif(old_row ->> 'remarks', ''),
    nullif(old_row ->> 'notes', ''),
    nullif(old_row ->> 'wastage_reason', '')
  );
$$;

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

drop trigger if exists log_retail_daily_sales_audit on public.retail_daily_sales;
create trigger log_retail_daily_sales_audit
after update on public.retail_daily_sales
for each row execute function public.log_retail_audit_field_changes();

drop trigger if exists log_retail_expenses_audit on public.retail_expenses;
create trigger log_retail_expenses_audit
after update on public.retail_expenses
for each row execute function public.log_retail_audit_field_changes();

drop trigger if exists log_retail_cleaning_tasks_audit on public.retail_cleaning_tasks;
create trigger log_retail_cleaning_tasks_audit
after update on public.retail_cleaning_tasks
for each row execute function public.log_retail_audit_field_changes();

drop trigger if exists log_retail_processing_batches_audit on public.retail_processing_batches;
create trigger log_retail_processing_batches_audit
after update on public.retail_processing_batches
for each row execute function public.log_retail_audit_field_changes();

drop trigger if exists log_retail_daily_closings_audit on public.retail_daily_closings;
create trigger log_retail_daily_closings_audit
after update on public.retail_daily_closings
for each row execute function public.log_retail_audit_field_changes();

alter table public.retail_audit_logs enable row level security;

drop policy if exists "retail managers can read scoped audit logs" on public.retail_audit_logs;
create policy "retail managers can read scoped audit logs"
on public.retail_audit_logs for select to authenticated
using (
  public.is_admin_or_director()
  or (
    public.has_role('retail_manager')
    and outlet_id is not null
    and public.can_access_outlet(outlet_id)
    and public.can_access_outlet_module(outlet_id, 'retail')
  )
);

drop policy if exists "retail users can insert own audit logs" on public.retail_audit_logs;
create policy "retail users can insert own audit logs"
on public.retail_audit_logs for insert to authenticated
with check (
  edited_by = auth.uid()
  and (
    public.is_admin_or_director()
    or (
      outlet_id is not null
      and public.can_access_outlet(outlet_id)
      and public.can_access_outlet_module(outlet_id, 'retail')
    )
  )
);

drop policy if exists "retail admins can delete audit logs" on public.retail_audit_logs;
