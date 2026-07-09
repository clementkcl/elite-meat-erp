drop policy if exists "retail users can insert scoped daily sales" on public.retail_daily_sales;
drop policy if exists "retail managers can insert scoped daily sales" on public.retail_daily_sales;
create policy "retail managers can insert scoped daily sales"
on public.retail_daily_sales for insert to authenticated
with check (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and (public.is_admin_or_director() or sales_date = current_date)
);

drop policy if exists "retail users can update scoped daily sales" on public.retail_daily_sales;
drop policy if exists "retail users can update same-day scoped daily sales" on public.retail_daily_sales;
drop policy if exists "retail managers can update scoped daily sales" on public.retail_daily_sales;
create policy "retail managers can update scoped daily sales"
on public.retail_daily_sales for update to authenticated
using (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and (public.is_admin_or_director() or sales_date = current_date)
)
with check (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and (public.is_admin_or_director() or sales_date = current_date)
);

drop policy if exists "retail users can insert scoped daily closings" on public.retail_daily_closings;
drop policy if exists "retail managers can insert scoped daily closings" on public.retail_daily_closings;
create policy "retail managers can insert scoped daily closings"
on public.retail_daily_closings for insert to authenticated
with check (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and (public.is_admin_or_director() or closing_date = current_date)
  and status::text in ('DRAFT', 'SUBMITTED')
);

drop policy if exists "retail users can submit daily closings" on public.retail_daily_closings;
drop policy if exists "retail users can submit same-day daily closings" on public.retail_daily_closings;
drop policy if exists "retail managers can submit same-day daily closings" on public.retail_daily_closings;
create policy "retail managers can submit same-day daily closings"
on public.retail_daily_closings for update to authenticated
using (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and (
    public.is_admin_or_director()
    or (
      closing_date = current_date
      and status::text in ('DRAFT', 'REJECTED')
    )
  )
)
with check (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and (public.is_admin_or_director() or closing_date = current_date)
  and (
    public.is_admin_or_director()
    or (
      status::text in ('DRAFT', 'SUBMITTED')
      and approved_by is null
      and approved_at is null
    )
  )
);

drop policy if exists "retail operators can update cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail users can submit own cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail users can submit same-day cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail managers can submit same-day cash sessions" on public.retail_cash_sessions;
create policy "retail managers can submit same-day cash sessions"
on public.retail_cash_sessions for update to authenticated
using (
  public.can_administer_retail()
  and (
    public.is_admin_or_director()
    or (
      opened_at::date = current_date
      and approval_status::text in ('DRAFT', 'REJECTED')
    )
  )
  and exists (
    select 1 from public.retail_registers register
    where register.id = register_id
      and public.can_access_outlet(register.outlet_id)
  )
)
with check (
  public.can_administer_retail()
  and (public.is_admin_or_director() or opened_at::date = current_date)
  and (
    public.is_admin_or_director()
    or (
      approval_status::text in ('DRAFT', 'SUBMITTED')
      and approved_by is null
      and approved_at is null
    )
  )
  and exists (
    select 1 from public.retail_registers register
    where register.id = register_id
      and public.can_access_outlet(register.outlet_id)
  )
);
