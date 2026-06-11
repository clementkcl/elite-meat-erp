alter table public.profiles
  add column if not exists stock_location_id uuid references public.stock_locations(id) on delete set null;

update public.profiles profile
set stock_location_id = stock_location.id
from public.outlets outlet
join public.stock_locations stock_location on stock_location.name = outlet.name
where profile.stock_location_id is null
  and profile.outlet_id = outlet.id;

create index if not exists idx_profiles_stock_location on public.profiles(stock_location_id);

create or replace function public.current_profile_stock_location_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select stock_location_id from public.profiles where id = auth.uid();
$$;

create or replace function public.can_access_stock_location(target_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (
      target_location_id is not null
      and target_location_id = public.current_profile_stock_location_id()
    );
$$;

create or replace function public.can_access_stock_unit(
  target_location_id uuid,
  target_transfer_to_location_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or public.can_access_stock_location(target_location_id)
    or public.can_access_stock_location(target_transfer_to_location_id);
$$;

create or replace function public.can_access_stock_movement(
  target_from_location_id uuid,
  target_to_location_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or public.can_access_stock_location(target_from_location_id)
    or public.can_access_stock_location(target_to_location_id);
$$;

drop policy if exists "users can read scoped profiles" on public.profiles;
create policy "users can read scoped profiles"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_admin_or_director()
  or public.can_access_outlet(outlet_id)
  or public.can_access_department(department_id)
  or public.can_access_stock_location(stock_location_id)
);

drop policy if exists "authenticated can read stock units" on public.stock_units;
drop policy if exists "stock operators can insert stock units" on public.stock_units;
drop policy if exists "stock operators can update stock units" on public.stock_units;
drop policy if exists "stock admins can delete stock units" on public.stock_units;
drop policy if exists "stock users can read scoped units" on public.stock_units;
create policy "stock users can read scoped units"
on public.stock_units for select to authenticated
using (public.can_access_stock_unit(location_id, transfer_to_location_id));
drop policy if exists "stock users can insert scoped units" on public.stock_units;
create policy "stock users can insert scoped units"
on public.stock_units for insert to authenticated
with check (public.can_manage_stock() and public.can_access_stock_location(location_id));
drop policy if exists "stock users can update scoped units" on public.stock_units;
create policy "stock users can update scoped units"
on public.stock_units for update to authenticated
using (public.can_manage_stock() and public.can_access_stock_unit(location_id, transfer_to_location_id))
with check (public.can_manage_stock() and public.can_access_stock_unit(location_id, transfer_to_location_id));
drop policy if exists "stock admins can delete stock units" on public.stock_units;
create policy "stock admins can delete stock units"
on public.stock_units for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read stock movements" on public.stock_movements;
drop policy if exists "stock operators can insert stock movements" on public.stock_movements;
drop policy if exists "stock admins can update stock movements" on public.stock_movements;
drop policy if exists "stock admins can delete stock movements" on public.stock_movements;
drop policy if exists "stock users can read scoped movements" on public.stock_movements;
create policy "stock users can read scoped movements"
on public.stock_movements for select to authenticated
using (public.can_access_stock_movement(from_location_id, to_location_id));
drop policy if exists "stock users can insert scoped movements" on public.stock_movements;
create policy "stock users can insert scoped movements"
on public.stock_movements for insert to authenticated
with check (
  public.can_manage_stock()
  and (created_by = auth.uid() or created_by is null)
  and public.can_access_stock_movement(from_location_id, to_location_id)
);
drop policy if exists "stock admins can update stock movements" on public.stock_movements;
create policy "stock admins can update stock movements"
on public.stock_movements for update to authenticated
using (public.can_administer_stock())
with check (public.can_administer_stock());
drop policy if exists "stock admins can delete stock movements" on public.stock_movements;
create policy "stock admins can delete stock movements"
on public.stock_movements for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read no barcode stock" on public.no_barcode_stock;
drop policy if exists "stock operators can insert no barcode stock" on public.no_barcode_stock;
drop policy if exists "stock operators can update no barcode stock" on public.no_barcode_stock;
drop policy if exists "stock admins can delete no barcode stock" on public.no_barcode_stock;
drop policy if exists "stock users can read scoped no barcode stock" on public.no_barcode_stock;
create policy "stock users can read scoped no barcode stock"
on public.no_barcode_stock for select to authenticated
using (public.can_access_stock_location(location_id));
drop policy if exists "stock users can insert scoped no barcode stock" on public.no_barcode_stock;
create policy "stock users can insert scoped no barcode stock"
on public.no_barcode_stock for insert to authenticated
with check (public.can_manage_stock() and public.can_access_stock_location(location_id));
drop policy if exists "stock users can update scoped no barcode stock" on public.no_barcode_stock;
create policy "stock users can update scoped no barcode stock"
on public.no_barcode_stock for update to authenticated
using (public.can_manage_stock() and public.can_access_stock_location(location_id))
with check (public.can_manage_stock() and public.can_access_stock_location(location_id));
drop policy if exists "stock admins can delete no barcode stock" on public.no_barcode_stock;
create policy "stock admins can delete no barcode stock"
on public.no_barcode_stock for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read no barcode movements" on public.no_barcode_movements;
drop policy if exists "stock operators can insert no barcode movements" on public.no_barcode_movements;
drop policy if exists "stock admins can update no barcode movements" on public.no_barcode_movements;
drop policy if exists "stock admins can delete no barcode movements" on public.no_barcode_movements;
drop policy if exists "stock users can read scoped no barcode movements" on public.no_barcode_movements;
create policy "stock users can read scoped no barcode movements"
on public.no_barcode_movements for select to authenticated
using (public.can_access_stock_location(location_id));
drop policy if exists "stock users can insert scoped no barcode movements" on public.no_barcode_movements;
create policy "stock users can insert scoped no barcode movements"
on public.no_barcode_movements for insert to authenticated
with check (
  public.can_manage_stock()
  and (created_by = auth.uid() or created_by is null)
  and public.can_access_stock_location(location_id)
);
drop policy if exists "stock admins can update no barcode movements" on public.no_barcode_movements;
create policy "stock admins can update no barcode movements"
on public.no_barcode_movements for update to authenticated
using (public.can_administer_stock())
with check (public.can_administer_stock());
drop policy if exists "stock admins can delete no barcode movements" on public.no_barcode_movements;
create policy "stock admins can delete no barcode movements"
on public.no_barcode_movements for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock operators can create draft stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock operators can submit draft stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock admins can review approve or reject stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock admins can delete stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock users can read scoped stock take sessions" on public.stock_take_sessions;
create policy "stock users can read scoped stock take sessions"
on public.stock_take_sessions for select to authenticated
using (public.can_access_stock_location(location_id));
drop policy if exists "stock users can create scoped draft stock take sessions" on public.stock_take_sessions;
create policy "stock users can create scoped draft stock take sessions"
on public.stock_take_sessions for insert to authenticated
with check (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and status = 'DRAFT'
  and (created_by is null or created_by = auth.uid())
);
drop policy if exists "stock users can submit scoped draft stock take sessions" on public.stock_take_sessions;
create policy "stock users can submit scoped draft stock take sessions"
on public.stock_take_sessions for update to authenticated
using (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and status = 'DRAFT'
)
with check (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and status in ('DRAFT', 'SUBMITTED')
  and reviewed_at is null
  and approved_by is null
  and approved_at is null
);
drop policy if exists "stock admins can review approve or reject stock take sessions" on public.stock_take_sessions;
create policy "stock admins can review approve or reject stock take sessions"
on public.stock_take_sessions for update to authenticated
using (public.can_administer_stock())
with check (public.can_administer_stock());
drop policy if exists "stock admins can delete stock take sessions" on public.stock_take_sessions;
create policy "stock admins can delete stock take sessions"
on public.stock_take_sessions for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read stock take lines" on public.stock_take_lines;
drop policy if exists "stock operators can insert draft stock take lines" on public.stock_take_lines;
drop policy if exists "stock operators can update draft stock take lines" on public.stock_take_lines;
drop policy if exists "stock admins can delete stock take lines" on public.stock_take_lines;
drop policy if exists "stock users can read scoped stock take lines" on public.stock_take_lines;
create policy "stock users can read scoped stock take lines"
on public.stock_take_lines for select to authenticated
using (exists (
  select 1 from public.stock_take_sessions session
  where session.id = session_id
    and public.can_access_stock_location(session.location_id)
));
drop policy if exists "stock users can insert scoped draft stock take lines" on public.stock_take_lines;
create policy "stock users can insert scoped draft stock take lines"
on public.stock_take_lines for insert to authenticated
with check (
  public.can_edit_stock_take_session(session_id)
  and exists (
    select 1 from public.stock_take_sessions session
    where session.id = session_id
      and public.can_access_stock_location(session.location_id)
  )
);
drop policy if exists "stock users can update scoped draft stock take lines" on public.stock_take_lines;
create policy "stock users can update scoped draft stock take lines"
on public.stock_take_lines for update to authenticated
using (
  public.can_edit_stock_take_session(session_id)
  and exists (
    select 1 from public.stock_take_sessions session
    where session.id = session_id
      and public.can_access_stock_location(session.location_id)
  )
)
with check (
  public.can_edit_stock_take_session(session_id)
  and exists (
    select 1 from public.stock_take_sessions session
    where session.id = session_id
      and public.can_access_stock_location(session.location_id)
  )
);
drop policy if exists "stock admins can delete stock take lines" on public.stock_take_lines;
create policy "stock admins can delete stock take lines"
on public.stock_take_lines for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read scan logs" on public.barcode_scan_logs;
drop policy if exists "stock operators can insert scan logs" on public.barcode_scan_logs;
drop policy if exists "stock admins can update scan logs" on public.barcode_scan_logs;
drop policy if exists "stock admins can delete scan logs" on public.barcode_scan_logs;
drop policy if exists "stock users can read own scan logs" on public.barcode_scan_logs;
create policy "stock users can read own scan logs"
on public.barcode_scan_logs for select to authenticated
using (public.can_administer_stock() or scanned_by = auth.uid());
drop policy if exists "stock users can insert own scan logs" on public.barcode_scan_logs;
create policy "stock users can insert own scan logs"
on public.barcode_scan_logs for insert to authenticated
with check (
  public.can_manage_stock()
  and (scanned_by = auth.uid() or scanned_by is null)
);
drop policy if exists "stock admins can update scan logs" on public.barcode_scan_logs;
create policy "stock admins can update scan logs"
on public.barcode_scan_logs for update to authenticated
using (public.can_administer_stock())
with check (public.can_administer_stock());
drop policy if exists "stock admins can delete scan logs" on public.barcode_scan_logs;
create policy "stock admins can delete scan logs"
on public.barcode_scan_logs for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "authenticated can read stock reports" on public.stock_reports;
drop policy if exists "stock operators can insert stock reports" on public.stock_reports;
drop policy if exists "stock admins can update stock reports" on public.stock_reports;
drop policy if exists "stock admins can delete stock reports" on public.stock_reports;
drop policy if exists "stock users can read own stock reports" on public.stock_reports;
create policy "stock users can read own stock reports"
on public.stock_reports for select to authenticated
using (public.can_administer_stock() or generated_by = auth.uid());
drop policy if exists "stock users can insert own stock reports" on public.stock_reports;
create policy "stock users can insert own stock reports"
on public.stock_reports for insert to authenticated
with check (
  public.can_manage_stock()
  and (generated_by = auth.uid() or generated_by is null)
);
drop policy if exists "stock admins can update stock reports" on public.stock_reports;
create policy "stock admins can update stock reports"
on public.stock_reports for update to authenticated
using (public.can_administer_stock())
with check (public.can_administer_stock());
drop policy if exists "stock admins can delete stock reports" on public.stock_reports;
create policy "stock admins can delete stock reports"
on public.stock_reports for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "retail users can update scoped cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail users can submit own cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail users can submit same-day cash sessions" on public.retail_cash_sessions;
create policy "retail users can submit same-day cash sessions"
on public.retail_cash_sessions for update to authenticated
using (
  public.can_manage_retail()
  and opened_at::date = current_date
  and approval_status::text in ('DRAFT', 'REJECTED')
  and exists (
    select 1 from public.retail_registers register
    where register.id = register_id
      and public.can_access_outlet(register.outlet_id)
  )
)
with check (
  public.can_manage_retail()
  and opened_at::date = current_date
  and approval_status::text in ('DRAFT', 'SUBMITTED')
  and approved_by is null
  and approved_at is null
);

drop policy if exists "retail users can update scoped sales" on public.retail_sales;
drop policy if exists "retail users can update same-day scoped sales" on public.retail_sales;
create policy "retail users can update same-day scoped sales"
on public.retail_sales for update to authenticated
using (
  public.can_manage_retail()
  and created_at::date = current_date
  and exists (
    select 1 from public.retail_registers register
    where register.id = register_id
      and public.can_access_outlet(register.outlet_id)
  )
)
with check (
  public.can_manage_retail()
  and created_at::date = current_date
  and exists (
    select 1 from public.retail_registers register
    where register.id = register_id
      and public.can_access_outlet(register.outlet_id)
  )
);

drop policy if exists "retail payment users can update scoped payments" on public.retail_payments;
drop policy if exists "retail payment users can update same-day scoped payments" on public.retail_payments;
create policy "retail payment users can update same-day scoped payments"
on public.retail_payments for update to authenticated
using (
  public.can_manage_retail_payments()
  and created_at::date = current_date
  and exists (
    select 1
    from public.retail_sales sale
    join public.retail_registers register on register.id = sale.register_id
    where sale.id = sale_id
      and public.can_access_outlet(register.outlet_id)
  )
)
with check (
  public.can_manage_retail_payments()
  and created_at::date = current_date
  and exists (
    select 1
    from public.retail_sales sale
    join public.retail_registers register on register.id = sale.register_id
    where sale.id = sale_id
      and public.can_access_outlet(register.outlet_id)
  )
);

drop policy if exists "retail users can update scoped sale lines" on public.retail_sale_lines;
drop policy if exists "retail users can update same-day scoped sale lines" on public.retail_sale_lines;
create policy "retail users can update same-day scoped sale lines"
on public.retail_sale_lines for update to authenticated
using (
  public.can_manage_retail()
  and exists (
    select 1
    from public.retail_sales sale
    join public.retail_registers register on register.id = sale.register_id
    where sale.id = sale_id
      and sale.created_at::date = current_date
      and public.can_access_outlet(register.outlet_id)
  )
)
with check (
  public.can_manage_retail()
  and exists (
    select 1
    from public.retail_sales sale
    join public.retail_registers register on register.id = sale.register_id
    where sale.id = sale_id
      and sale.created_at::date = current_date
      and public.can_access_outlet(register.outlet_id)
  )
);

drop policy if exists "retail users can update scoped daily sales" on public.retail_daily_sales;
drop policy if exists "retail users can update same-day scoped daily sales" on public.retail_daily_sales;
create policy "retail users can update same-day scoped daily sales"
on public.retail_daily_sales for update to authenticated
using (
  public.can_manage_retail()
  and sales_date = current_date
  and public.can_access_outlet(outlet_id)
)
with check (
  public.can_manage_retail()
  and sales_date = current_date
  and public.can_access_outlet(outlet_id)
);

drop policy if exists "retail users can submit daily closings" on public.retail_daily_closings;
drop policy if exists "retail users can submit same-day daily closings" on public.retail_daily_closings;
create policy "retail users can submit same-day daily closings"
on public.retail_daily_closings for update to authenticated
using (
  public.can_manage_retail()
  and closing_date = current_date
  and public.can_access_outlet(outlet_id)
  and status::text in ('DRAFT', 'REJECTED')
)
with check (
  public.can_manage_retail()
  and closing_date = current_date
  and public.can_access_outlet(outlet_id)
  and status::text in ('DRAFT', 'SUBMITTED')
  and approved_by is null
  and approved_at is null
);
