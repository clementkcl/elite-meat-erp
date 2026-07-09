alter type public.retail_closing_status add value if not exists 'REVIEWED';

alter table public.retail_daily_closings
  add column if not exists opening_cash numeric(12, 2) not null default 0 check (opening_cash >= 0),
  add column if not exists cash_sales numeric(12, 2) not null default 0 check (cash_sales >= 0),
  add column if not exists bank_transfer_sales numeric(12, 2) not null default 0 check (bank_transfer_sales >= 0),
  add column if not exists ewallet_sales numeric(12, 2) not null default 0 check (ewallet_sales >= 0),
  add column if not exists credit_sales numeric(12, 2) not null default 0 check (credit_sales >= 0),
  add column if not exists cash_expenses numeric(12, 2) not null default 0 check (cash_expenses >= 0),
  add column if not exists expected_cash numeric(12, 2) not null default 0,
  add column if not exists actual_cash_counted numeric(12, 2) not null default 0 check (actual_cash_counted >= 0),
  add column if not exists remarks text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

update public.retail_daily_closings
set
  opening_cash = coalesce(opening_cash, 0),
  cash_sales = coalesce(nullif(cash_sales, 0), cash_received, 0),
  cash_expenses = coalesce(nullif(cash_expenses, 0), expenses_amount, 0),
  expected_cash = coalesce(
    nullif(expected_cash, 0),
    coalesce(opening_cash, 0) + coalesce(cash_received, 0) - coalesce(expenses_amount, 0),
    0
  ),
  actual_cash_counted = coalesce(nullif(actual_cash_counted, 0), closing_cash, 0),
  reviewed_by = coalesce(reviewed_by, approved_by),
  reviewed_at = coalesce(reviewed_at, approved_at),
  remarks = coalesce(remarks, notes),
  updated_by = coalesce(updated_by, approved_by, submitted_by);

drop policy if exists "retail users can insert scoped daily closings" on public.retail_daily_closings;
drop policy if exists "retail managers can insert scoped daily closings" on public.retail_daily_closings;
drop policy if exists "retail users can submit daily closings" on public.retail_daily_closings;
drop policy if exists "retail users can submit same-day daily closings" on public.retail_daily_closings;
drop policy if exists "retail managers can submit same-day daily closings" on public.retail_daily_closings;
drop policy if exists "retail managers can approve daily closings" on public.retail_daily_closings;
drop policy if exists "retail managers can review daily closings" on public.retail_daily_closings;
drop policy if exists "admins can delete daily closings" on public.retail_daily_closings;

drop policy if exists "retail managers can insert daily cash closings" on public.retail_daily_closings;
create policy "retail managers can insert daily cash closings"
on public.retail_daily_closings for insert to authenticated
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (public.is_admin_or_director() or closing_date = current_date)
  and status::text in ('DRAFT', 'SUBMITTED')
  and reviewed_by is null
  and reviewed_at is null
  and (submitted_by = auth.uid() or submitted_by is null)
);

drop policy if exists "retail managers can update daily cash closings" on public.retail_daily_closings;
create policy "retail managers can update daily cash closings"
on public.retail_daily_closings for update to authenticated
using (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (public.is_admin_or_director() or closing_date = current_date)
)
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (public.is_admin_or_director() or closing_date = current_date)
  and status::text in ('DRAFT', 'SUBMITTED', 'REVIEWED')
  and (
    status::text <> 'REVIEWED'
    or (reviewed_by = auth.uid() and reviewed_at is not null)
  )
);
