alter table public.retail_daily_sales
  add column if not exists status text not null default 'CONFIRMED';

update public.retail_daily_sales
set status = 'CONFIRMED'
where status is null or status not in ('DRAFT', 'CONFIRMED');

alter table public.retail_daily_sales
  drop constraint if exists retail_daily_sales_status_check;

alter table public.retail_daily_sales
  add constraint retail_daily_sales_status_check
  check (status in ('DRAFT', 'CONFIRMED'));

create index if not exists idx_retail_daily_sales_status_date
on public.retail_daily_sales(status, sales_date desc);

drop policy if exists "retail managers can insert scoped daily sales" on public.retail_daily_sales;
drop policy if exists "retail users can insert draft daily sales" on public.retail_daily_sales;
create policy "retail users can insert draft daily sales"
on public.retail_daily_sales for insert to authenticated
with check (
  public.can_manage_retail()
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (
    public.is_admin_or_director()
    or sales_date = current_date
  )
  and (
    (
      (public.has_role('retail_manager') or public.is_admin_or_director())
      and status in ('DRAFT', 'CONFIRMED')
    )
    or (
      public.has_role('retail_team_general_worker')
      and status = 'DRAFT'
    )
  )
);

drop policy if exists "retail managers can update scoped daily sales" on public.retail_daily_sales;
drop policy if exists "retail users can update draft daily sales" on public.retail_daily_sales;
create policy "retail users can update draft daily sales"
on public.retail_daily_sales for update to authenticated
using (
  public.can_manage_retail()
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (
    public.is_admin_or_director()
    or sales_date = current_date
  )
  and (
    (public.has_role('retail_manager') or public.is_admin_or_director())
    or (
      public.has_role('retail_team_general_worker')
      and status = 'DRAFT'
    )
  )
)
with check (
  public.can_manage_retail()
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (
    public.is_admin_or_director()
    or sales_date = current_date
  )
  and (
    (
      (public.has_role('retail_manager') or public.is_admin_or_director())
      and status in ('DRAFT', 'CONFIRMED')
    )
    or (
      public.has_role('retail_team_general_worker')
      and status = 'DRAFT'
    )
  )
);
