do $$
begin
  alter type public.retail_expense_status add value if not exists 'CANCELLED';
end $$;

create or replace function public.can_review_retail_expenses()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_manager') or public.is_admin_or_director();
$$;

alter table public.retail_expenses
  add column if not exists supplier_payee text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists remarks text;

update public.retail_expenses
set
  supplier_payee = coalesce(supplier_payee, vendor),
  submitted_at = coalesce(submitted_at, created_at),
  remarks = coalesce(remarks, notes),
  receipt_url = coalesce(nullif(receipt_url, ''), 'legacy/missing-receipt-before-retail-expenses-v1')
where supplier_payee is null
   or submitted_at is null
   or remarks is null
   or nullif(receipt_url, '') is null;

update public.retail_expenses
set status = 'REVIEWED'
where status::text in ('APPROVED', 'PAID');

alter table public.retail_expenses
  drop constraint if exists retail_expenses_receipt_required,
  drop constraint if exists retail_expenses_rejection_reason_required;

alter table public.retail_expenses
  add constraint retail_expenses_receipt_required
  check (nullif(trim(receipt_url), '') is not null),
  add constraint retail_expenses_rejection_reason_required
  check (status::text <> 'REJECTED' or nullif(trim(rejection_reason), '') is not null);

create table if not exists public.retail_expense_categories (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references public.outlets(id) on delete set null,
  name text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outlet_id, name)
);

create index if not exists idx_retail_expense_categories_outlet
on public.retail_expense_categories(outlet_id, is_active, name);

drop trigger if exists set_retail_expense_categories_updated_at on public.retail_expense_categories;
create trigger set_retail_expense_categories_updated_at
before update on public.retail_expense_categories
for each row execute function public.set_updated_at();

alter table public.retail_expense_categories enable row level security;

insert into public.retail_expense_categories (name)
values
  ('Cleaning Supplies'),
  ('Utilities'),
  ('Repairs and Maintenance'),
  ('Packaging'),
  ('Transport'),
  ('Other')
on conflict do nothing;

drop policy if exists "retail users can read expense categories" on public.retail_expense_categories;
create policy "retail users can read expense categories"
on public.retail_expense_categories for select to authenticated
using (
  public.can_view_retail()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
);

drop policy if exists "retail managers can insert expense categories" on public.retail_expense_categories;
create policy "retail managers can insert expense categories"
on public.retail_expense_categories for insert to authenticated
with check (
  public.can_administer_retail()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "retail managers can update expense categories" on public.retail_expense_categories;
create policy "retail managers can update expense categories"
on public.retail_expense_categories for update to authenticated
using (
  public.can_administer_retail()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
)
with check (
  public.can_administer_retail()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
  and (updated_by = auth.uid() or updated_by is null)
);

drop policy if exists "retail payment users can update expenses" on public.retail_expenses;
drop policy if exists "retail expense approvers can update expenses" on public.retail_expenses;
drop policy if exists "retail approvers can approve expenses" on public.retail_expenses;
drop policy if exists "retail payers can pay approved expenses" on public.retail_expenses;
drop policy if exists "retail admins can delete expenses" on public.retail_expenses;

drop policy if exists "retail users can insert scoped expenses" on public.retail_expenses;
create policy "retail users can insert scoped expenses"
on public.retail_expenses for insert to authenticated
with check (
  public.can_manage_retail_payments()
  and public.can_access_outlet(outlet_id)
  and status::text = 'SUBMITTED'
  and submitted_by = auth.uid()
  and submitted_at is not null
  and nullif(trim(receipt_url), '') is not null
);

drop policy if exists "retail submitters can update submitted expenses" on public.retail_expenses;
drop policy if exists "retail submitters can cancel own submitted expenses" on public.retail_expenses;
create policy "retail submitters can cancel own submitted expenses"
on public.retail_expenses for update to authenticated
using (
  public.can_manage_retail_payments()
  and submitted_by = auth.uid()
  and status::text = 'SUBMITTED'
  and public.can_access_outlet(outlet_id)
)
with check (
  public.can_manage_retail_payments()
  and submitted_by = auth.uid()
  and status::text = 'CANCELLED'
  and public.can_access_outlet(outlet_id)
);

drop policy if exists "retail reviewers can review expenses" on public.retail_expenses;
create policy "retail reviewers can review expenses"
on public.retail_expenses for update to authenticated
using (
  public.can_review_retail_expenses()
  and status::text = 'SUBMITTED'
  and public.can_access_outlet(outlet_id)
  and coalesce(submitted_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()
)
with check (
  public.can_review_retail_expenses()
  and status::text in ('REVIEWED', 'REJECTED', 'CANCELLED')
  and public.can_access_outlet(outlet_id)
  and reviewed_by = auth.uid()
  and reviewed_at is not null
  and coalesce(submitted_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()
  and (status::text <> 'REJECTED' or nullif(trim(rejection_reason), '') is not null)
);
