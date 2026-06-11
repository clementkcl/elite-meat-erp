alter table public.retail_expenses
  add column if not exists receipt_url text,
  add column if not exists paid_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_retail_expenses_paid_by on public.retail_expenses(paid_by);

create or replace function public.can_pay_retail_expenses()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('account') or public.has_role('admin');
$$;

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
  and status::text in ('REVIEWED', 'REJECTED')
  and public.can_access_outlet(outlet_id)
  and reviewed_by = auth.uid()
  and coalesce(submitted_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()
  and approved_by is null
  and paid_by is null
  and paid_at is null
);

drop policy if exists "retail approvers can approve expenses" on public.retail_expenses;
create policy "retail approvers can approve expenses"
on public.retail_expenses for update to authenticated
using (
  public.is_admin_or_director()
  and status::text = 'REVIEWED'
  and public.can_access_outlet(outlet_id)
)
with check (
  public.is_admin_or_director()
  and status::text in ('APPROVED', 'REJECTED')
  and public.can_access_outlet(outlet_id)
  and approved_by = auth.uid()
  and paid_by is null
  and paid_at is null
);

drop policy if exists "retail payers can pay approved expenses" on public.retail_expenses;
create policy "retail payers can pay approved expenses"
on public.retail_expenses for update to authenticated
using (
  public.can_pay_retail_expenses()
  and status::text = 'APPROVED'
  and public.can_access_outlet(outlet_id)
)
with check (
  public.can_pay_retail_expenses()
  and status::text = 'PAID'
  and public.can_access_outlet(outlet_id)
  and paid_by = auth.uid()
  and paid_at is not null
);

drop policy if exists "retail managers can approve daily closings" on public.retail_daily_closings;
create policy "retail managers can approve daily closings"
on public.retail_daily_closings for update to authenticated
using (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and status::text = 'SUBMITTED'
  and coalesce(submitted_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()
)
with check (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and status::text in ('APPROVED', 'REJECTED')
  and approved_by = auth.uid()
  and approved_at is not null
  and coalesce(submitted_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()
);
