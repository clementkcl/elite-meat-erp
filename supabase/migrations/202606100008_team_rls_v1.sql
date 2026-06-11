create or replace function public.is_admin_or_director()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('director');
$$;

create or replace function public.current_profile_outlet_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select outlet_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id from public.profiles where id = auth.uid();
$$;

create or replace function public.can_access_outlet(target_outlet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (
      target_outlet_id is not null
      and target_outlet_id = public.current_profile_outlet_id()
    );
$$;

create or replace function public.can_access_department(target_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (
      target_department_id is not null
      and target_department_id = public.current_profile_department_id()
    );
$$;

create or replace function public.can_access_work_scope(
  target_outlet_id uuid,
  target_department_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (target_outlet_id is null and target_department_id is null)
    or public.can_access_outlet(target_outlet_id)
    or public.can_access_department(target_department_id);
$$;

drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "users can read scoped profiles" on public.profiles;
create policy "users can read scoped profiles"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_admin_or_director()
  or public.can_access_outlet(outlet_id)
  or public.can_access_department(department_id)
);

create or replace function public.can_manage_stock()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team_general_worker')
    or public.has_role('retail_manager')
    or public.has_role('delivery_team_general_worker')
    or public.has_role('delivery_manager')
    or public.has_role('processing_team_general_worker')
    or public.has_role('processing_manager')
    or public.is_admin_or_director();
$$;

create or replace function public.can_administer_stock()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director();
$$;

create or replace function public.can_manage_delivery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('delivery_team_general_worker')
    or public.has_role('delivery_manager')
    or public.is_admin_or_director();
$$;

create or replace function public.can_manage_delivery_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (
      (public.has_role('delivery_team_general_worker') or public.has_role('delivery_manager'))
      and public.can_access_department(target_team_id)
    );
$$;

create or replace function public.can_administer_delivery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director();
$$;

create or replace function public.can_manage_attendance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_manager')
    or public.has_role('delivery_manager')
    or public.has_role('processing_manager')
    or public.is_admin_or_director();
$$;

create or replace function public.can_view_retail()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team_general_worker')
    or public.has_role('retail_manager')
    or public.has_role('account')
    or public.is_admin_or_director();
$$;

create or replace function public.can_manage_retail()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team_general_worker')
    or public.has_role('retail_manager')
    or public.is_admin_or_director();
$$;

create or replace function public.can_manage_retail_payments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team_general_worker')
    or public.has_role('retail_manager')
    or public.has_role('account')
    or public.is_admin_or_director();
$$;

create or replace function public.can_review_retail_expenses()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_manager')
    or public.has_role('account')
    or public.is_admin_or_director();
$$;

create or replace function public.can_administer_retail()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_manager') or public.is_admin_or_director();
$$;

create or replace function public.can_manage_processing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('processing_team_general_worker')
    or public.has_role('processing_manager')
    or public.is_admin_or_director();
$$;

create or replace function public.can_review_processing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('processing_manager') or public.is_admin_or_director();
$$;

create or replace function public.can_review_oa_actions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('account')
    or public.has_role('retail_manager')
    or public.has_role('delivery_manager')
    or public.has_role('processing_manager')
    or public.has_role('admin');
$$;

create or replace function public.can_approve_oa_actions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director();
$$;

drop policy if exists "authenticated can read vehicles" on public.vehicles;
drop policy if exists "delivery operators can insert vehicles" on public.vehicles;
drop policy if exists "delivery operators can update vehicles" on public.vehicles;
drop policy if exists "delivery admins can delete vehicles" on public.vehicles;
drop policy if exists "delivery users can read scoped vehicles" on public.vehicles;
create policy "delivery users can read scoped vehicles"
on public.vehicles for select to authenticated
using (public.can_manage_delivery_team(delivery_team_id));
drop policy if exists "delivery users can insert scoped vehicles" on public.vehicles;
create policy "delivery users can insert scoped vehicles"
on public.vehicles for insert to authenticated
with check (public.can_manage_delivery_team(delivery_team_id) and (created_by = auth.uid() or created_by is null));
drop policy if exists "delivery users can update scoped vehicles" on public.vehicles;
create policy "delivery users can update scoped vehicles"
on public.vehicles for update to authenticated
using (public.can_manage_delivery_team(delivery_team_id))
with check (public.can_manage_delivery_team(delivery_team_id));
drop policy if exists "delivery admins can delete scoped vehicles" on public.vehicles;
create policy "delivery admins can delete scoped vehicles"
on public.vehicles for delete to authenticated
using (public.can_administer_delivery() and public.can_manage_delivery_team(delivery_team_id));

drop policy if exists "authenticated can read delivery orders" on public.delivery_orders;
drop policy if exists "delivery operators can insert delivery orders" on public.delivery_orders;
drop policy if exists "delivery operators can update delivery orders" on public.delivery_orders;
drop policy if exists "delivery admins can delete delivery orders" on public.delivery_orders;
drop policy if exists "delivery users can read scoped orders" on public.delivery_orders;
create policy "delivery users can read scoped orders"
on public.delivery_orders for select to authenticated
using (public.can_manage_delivery_team(delivery_team_id));
drop policy if exists "delivery users can insert scoped orders" on public.delivery_orders;
create policy "delivery users can insert scoped orders"
on public.delivery_orders for insert to authenticated
with check (public.can_manage_delivery_team(delivery_team_id) and (created_by = auth.uid() or created_by is null));
drop policy if exists "delivery users can update scoped orders" on public.delivery_orders;
create policy "delivery users can update scoped orders"
on public.delivery_orders for update to authenticated
using (public.can_manage_delivery_team(delivery_team_id) or driver_id = auth.uid())
with check (public.can_manage_delivery_team(delivery_team_id) or driver_id = auth.uid());
drop policy if exists "delivery admins can delete scoped orders" on public.delivery_orders;
create policy "delivery admins can delete scoped orders"
on public.delivery_orders for delete to authenticated
using (public.can_administer_delivery() and public.can_manage_delivery_team(delivery_team_id));

drop policy if exists "authenticated can read delivery order items" on public.delivery_order_items;
drop policy if exists "delivery operators can insert delivery order items" on public.delivery_order_items;
drop policy if exists "delivery operators can update delivery order items" on public.delivery_order_items;
drop policy if exists "delivery admins can delete delivery order items" on public.delivery_order_items;
drop policy if exists "delivery users can read scoped order items" on public.delivery_order_items;
create policy "delivery users can read scoped order items"
on public.delivery_order_items for select to authenticated
using (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));
drop policy if exists "delivery users can insert scoped order items" on public.delivery_order_items;
create policy "delivery users can insert scoped order items"
on public.delivery_order_items for insert to authenticated
with check (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));
drop policy if exists "delivery users can update scoped order items" on public.delivery_order_items;
create policy "delivery users can update scoped order items"
on public.delivery_order_items for update to authenticated
using (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
))
with check (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));
drop policy if exists "delivery admins can delete scoped order items" on public.delivery_order_items;
create policy "delivery admins can delete scoped order items"
on public.delivery_order_items for delete to authenticated
using (public.can_administer_delivery() and exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));

drop policy if exists "authenticated can read delivery status logs" on public.delivery_status_logs;
drop policy if exists "delivery operators can insert delivery status logs" on public.delivery_status_logs;
drop policy if exists "delivery admins can delete delivery status logs" on public.delivery_status_logs;
drop policy if exists "delivery users can read scoped status logs" on public.delivery_status_logs;
create policy "delivery users can read scoped status logs"
on public.delivery_status_logs for select to authenticated
using (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));
drop policy if exists "delivery users can insert scoped status logs" on public.delivery_status_logs;
create policy "delivery users can insert scoped status logs"
on public.delivery_status_logs for insert to authenticated
with check (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));
drop policy if exists "delivery admins can delete scoped status logs" on public.delivery_status_logs;
create policy "delivery admins can delete scoped status logs"
on public.delivery_status_logs for delete to authenticated
using (public.can_administer_delivery() and exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));

drop policy if exists "authenticated can read driver locations" on public.driver_locations;
drop policy if exists "delivery operators can insert driver locations" on public.driver_locations;
drop policy if exists "delivery admins can delete driver locations" on public.driver_locations;
drop policy if exists "delivery users can read scoped driver locations" on public.driver_locations;
create policy "delivery users can read scoped driver locations"
on public.driver_locations for select to authenticated
using (
  driver_id = auth.uid()
  or order_id is null
  or exists (
    select 1 from public.delivery_orders delivery_order
    where delivery_order.id = order_id
      and public.can_manage_delivery_team(delivery_order.delivery_team_id)
  )
);
drop policy if exists "delivery users can insert scoped driver locations" on public.driver_locations;
create policy "delivery users can insert scoped driver locations"
on public.driver_locations for insert to authenticated
with check (
  driver_id = auth.uid()
  and (
    order_id is null
    or exists (
      select 1 from public.delivery_orders delivery_order
      where delivery_order.id = order_id
        and public.can_manage_delivery_team(delivery_order.delivery_team_id)
    )
  )
);
drop policy if exists "delivery admins can delete scoped driver locations" on public.driver_locations;
create policy "delivery admins can delete scoped driver locations"
on public.driver_locations for delete to authenticated
using (public.can_administer_delivery());

drop policy if exists "authenticated can read delivery payments" on public.delivery_payments;
drop policy if exists "delivery operators can insert delivery payments" on public.delivery_payments;
drop policy if exists "delivery operators can update delivery payments" on public.delivery_payments;
drop policy if exists "delivery admins can delete delivery payments" on public.delivery_payments;
drop policy if exists "delivery users can read scoped payments" on public.delivery_payments;
create policy "delivery users can read scoped payments"
on public.delivery_payments for select to authenticated
using (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));
drop policy if exists "delivery users can insert scoped payments" on public.delivery_payments;
create policy "delivery users can insert scoped payments"
on public.delivery_payments for insert to authenticated
with check (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));
drop policy if exists "delivery users can update scoped payments" on public.delivery_payments;
create policy "delivery users can update scoped payments"
on public.delivery_payments for update to authenticated
using (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
))
with check (exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));
drop policy if exists "delivery admins can delete scoped payments" on public.delivery_payments;
create policy "delivery admins can delete scoped payments"
on public.delivery_payments for delete to authenticated
using (public.can_administer_delivery() and exists (
  select 1 from public.delivery_orders delivery_order
  where delivery_order.id = order_id
    and public.can_manage_delivery_team(delivery_order.delivery_team_id)
));

drop policy if exists "authenticated can read work locations" on public.work_locations;
drop policy if exists "attendance admins can insert work locations" on public.work_locations;
drop policy if exists "attendance admins can update work locations" on public.work_locations;
drop policy if exists "attendance admins can delete work locations" on public.work_locations;
drop policy if exists "users can read scoped work locations" on public.work_locations;
create policy "users can read scoped work locations"
on public.work_locations for select to authenticated
using (public.can_access_work_scope(outlet_id, department_id));
drop policy if exists "attendance managers can insert scoped work locations" on public.work_locations;
create policy "attendance managers can insert scoped work locations"
on public.work_locations for insert to authenticated
with check (public.can_manage_attendance() and public.can_access_work_scope(outlet_id, department_id));
drop policy if exists "attendance managers can update scoped work locations" on public.work_locations;
create policy "attendance managers can update scoped work locations"
on public.work_locations for update to authenticated
using (public.can_manage_attendance() and public.can_access_work_scope(outlet_id, department_id))
with check (public.can_manage_attendance() and public.can_access_work_scope(outlet_id, department_id));
drop policy if exists "attendance admins can delete work locations" on public.work_locations;
create policy "attendance admins can delete work locations"
on public.work_locations for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "authenticated can read attendance rules" on public.attendance_rules;
drop policy if exists "attendance admins can insert attendance rules" on public.attendance_rules;
drop policy if exists "attendance admins can update attendance rules" on public.attendance_rules;
drop policy if exists "attendance admins can delete attendance rules" on public.attendance_rules;
drop policy if exists "users can read scoped attendance rules" on public.attendance_rules;
create policy "users can read scoped attendance rules"
on public.attendance_rules for select to authenticated
using (public.can_access_department(department_id) or department_id is null);
drop policy if exists "attendance managers can insert scoped attendance rules" on public.attendance_rules;
create policy "attendance managers can insert scoped attendance rules"
on public.attendance_rules for insert to authenticated
with check (public.can_manage_attendance() and public.can_access_department(department_id));
drop policy if exists "attendance managers can update scoped attendance rules" on public.attendance_rules;
create policy "attendance managers can update scoped attendance rules"
on public.attendance_rules for update to authenticated
using (public.can_manage_attendance() and public.can_access_department(department_id))
with check (public.can_manage_attendance() and public.can_access_department(department_id));
drop policy if exists "attendance admins can delete attendance rules" on public.attendance_rules;
create policy "attendance admins can delete attendance rules"
on public.attendance_rules for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "users can read own attendance logs" on public.attendance_logs;
drop policy if exists "users can insert own attendance logs" on public.attendance_logs;
drop policy if exists "attendance admins can update attendance logs" on public.attendance_logs;
drop policy if exists "attendance admins can delete attendance logs" on public.attendance_logs;
drop policy if exists "users can read scoped attendance logs" on public.attendance_logs;
create policy "users can read scoped attendance logs"
on public.attendance_logs for select to authenticated
using (profile_id = auth.uid() or public.can_access_department(department_id));
drop policy if exists "users can insert own scoped attendance logs" on public.attendance_logs;
create policy "users can insert own scoped attendance logs"
on public.attendance_logs for insert to authenticated
with check (
  profile_id = auth.uid()
  and (created_by = auth.uid() or created_by is null)
  and (department_id is null or public.can_access_department(department_id))
);
drop policy if exists "attendance managers can update scoped attendance logs" on public.attendance_logs;
create policy "attendance managers can update scoped attendance logs"
on public.attendance_logs for update to authenticated
using (public.can_manage_attendance() and public.can_access_department(department_id))
with check (public.can_manage_attendance() and public.can_access_department(department_id));
drop policy if exists "attendance admins can delete attendance logs" on public.attendance_logs;
create policy "attendance admins can delete attendance logs"
on public.attendance_logs for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "users can read own attendance summaries" on public.attendance_daily_summary;
drop policy if exists "users can insert own attendance summaries" on public.attendance_daily_summary;
drop policy if exists "users can update own attendance summaries" on public.attendance_daily_summary;
drop policy if exists "attendance admins can delete attendance summaries" on public.attendance_daily_summary;
drop policy if exists "users can read scoped attendance summaries" on public.attendance_daily_summary;
create policy "users can read scoped attendance summaries"
on public.attendance_daily_summary for select to authenticated
using (profile_id = auth.uid() or public.can_access_department(department_id));
drop policy if exists "users can insert own attendance summaries" on public.attendance_daily_summary;
create policy "users can insert own attendance summaries"
on public.attendance_daily_summary for insert to authenticated
with check (profile_id = auth.uid() or (public.can_manage_attendance() and public.can_access_department(department_id)));
drop policy if exists "users can update own attendance summaries" on public.attendance_daily_summary;
create policy "users can update own attendance summaries"
on public.attendance_daily_summary for update to authenticated
using (profile_id = auth.uid() or (public.can_manage_attendance() and public.can_access_department(department_id)))
with check (profile_id = auth.uid() or (public.can_manage_attendance() and public.can_access_department(department_id)));
drop policy if exists "attendance admins can delete attendance summaries" on public.attendance_daily_summary;
create policy "attendance admins can delete attendance summaries"
on public.attendance_daily_summary for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read registers" on public.retail_registers;
drop policy if exists "retail operators can insert registers" on public.retail_registers;
drop policy if exists "retail operators can update registers" on public.retail_registers;
drop policy if exists "retail admins can delete registers" on public.retail_registers;
drop policy if exists "retail users can read scoped registers" on public.retail_registers;
create policy "retail users can read scoped registers"
on public.retail_registers for select to authenticated
using (public.can_view_retail() and public.can_access_outlet(outlet_id));
drop policy if exists "retail managers can insert scoped registers" on public.retail_registers;
create policy "retail managers can insert scoped registers"
on public.retail_registers for insert to authenticated
with check (public.can_administer_retail() and public.can_access_outlet(outlet_id));
drop policy if exists "retail managers can update scoped registers" on public.retail_registers;
create policy "retail managers can update scoped registers"
on public.retail_registers for update to authenticated
using (public.can_administer_retail() and public.can_access_outlet(outlet_id))
with check (public.can_administer_retail() and public.can_access_outlet(outlet_id));
drop policy if exists "retail admins can delete scoped registers" on public.retail_registers;
create policy "retail admins can delete scoped registers"
on public.retail_registers for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail operators can insert cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail operators can update cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail admins can delete cash sessions" on public.retail_cash_sessions;
drop policy if exists "retail users can read scoped cash sessions" on public.retail_cash_sessions;
create policy "retail users can read scoped cash sessions"
on public.retail_cash_sessions for select to authenticated
using (exists (
  select 1 from public.retail_registers register
  where register.id = register_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail users can insert scoped cash sessions" on public.retail_cash_sessions;
create policy "retail users can insert scoped cash sessions"
on public.retail_cash_sessions for insert to authenticated
with check (public.can_manage_retail() and exists (
  select 1 from public.retail_registers register
  where register.id = register_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail users can submit own cash sessions" on public.retail_cash_sessions;
create policy "retail users can submit own cash sessions"
on public.retail_cash_sessions for update to authenticated
using (
  public.can_manage_retail()
  and approval_status::text in ('DRAFT', 'REJECTED')
  and exists (
    select 1 from public.retail_registers register
    where register.id = register_id
      and public.can_access_outlet(register.outlet_id)
  )
)
with check (
  public.can_manage_retail()
  and approval_status::text in ('DRAFT', 'SUBMITTED')
  and approved_by is null
  and approved_at is null
);
drop policy if exists "retail managers can approve cash sessions" on public.retail_cash_sessions;
create policy "retail managers can approve cash sessions"
on public.retail_cash_sessions for update to authenticated
using (public.can_administer_retail() and approval_status::text = 'SUBMITTED')
with check (public.can_administer_retail() and approval_status::text in ('APPROVED', 'REJECTED'));
drop policy if exists "retail admins can delete cash sessions" on public.retail_cash_sessions;
create policy "retail admins can delete cash sessions"
on public.retail_cash_sessions for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read sales" on public.retail_sales;
drop policy if exists "retail operators can insert sales" on public.retail_sales;
drop policy if exists "retail operators can update sales" on public.retail_sales;
drop policy if exists "retail admins can delete sales" on public.retail_sales;
drop policy if exists "retail users can read scoped sales" on public.retail_sales;
create policy "retail users can read scoped sales"
on public.retail_sales for select to authenticated
using (exists (
  select 1 from public.retail_registers register
  where register.id = register_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail users can insert scoped sales" on public.retail_sales;
create policy "retail users can insert scoped sales"
on public.retail_sales for insert to authenticated
with check (public.can_manage_retail() and exists (
  select 1 from public.retail_registers register
  where register.id = register_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail users can update scoped sales" on public.retail_sales;
create policy "retail users can update scoped sales"
on public.retail_sales for update to authenticated
using (public.can_manage_retail() and exists (
  select 1 from public.retail_registers register
  where register.id = register_id
    and public.can_access_outlet(register.outlet_id)
))
with check (public.can_manage_retail() and exists (
  select 1 from public.retail_registers register
  where register.id = register_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail admins can delete sales" on public.retail_sales;
create policy "retail admins can delete sales"
on public.retail_sales for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read sale lines" on public.retail_sale_lines;
drop policy if exists "retail operators can insert sale lines" on public.retail_sale_lines;
drop policy if exists "retail operators can update sale lines" on public.retail_sale_lines;
drop policy if exists "retail admins can delete sale lines" on public.retail_sale_lines;
drop policy if exists "retail users can read scoped sale lines" on public.retail_sale_lines;
create policy "retail users can read scoped sale lines"
on public.retail_sale_lines for select to authenticated
using (exists (
  select 1
  from public.retail_sales sale
  join public.retail_registers register on register.id = sale.register_id
  where sale.id = sale_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail users can insert scoped sale lines" on public.retail_sale_lines;
create policy "retail users can insert scoped sale lines"
on public.retail_sale_lines for insert to authenticated
with check (public.can_manage_retail() and exists (
  select 1
  from public.retail_sales sale
  join public.retail_registers register on register.id = sale.register_id
  where sale.id = sale_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail users can update scoped sale lines" on public.retail_sale_lines;
create policy "retail users can update scoped sale lines"
on public.retail_sale_lines for update to authenticated
using (public.can_manage_retail() and exists (
  select 1
  from public.retail_sales sale
  join public.retail_registers register on register.id = sale.register_id
  where sale.id = sale_id
    and public.can_access_outlet(register.outlet_id)
))
with check (public.can_manage_retail() and exists (
  select 1
  from public.retail_sales sale
  join public.retail_registers register on register.id = sale.register_id
  where sale.id = sale_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail admins can delete sale lines" on public.retail_sale_lines;
create policy "retail admins can delete sale lines"
on public.retail_sale_lines for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read payments" on public.retail_payments;
drop policy if exists "retail payment users can insert payments" on public.retail_payments;
drop policy if exists "retail payment users can update payments" on public.retail_payments;
drop policy if exists "retail admins can delete payments" on public.retail_payments;
drop policy if exists "retail users can read scoped payments" on public.retail_payments;
create policy "retail users can read scoped payments"
on public.retail_payments for select to authenticated
using (exists (
  select 1
  from public.retail_sales sale
  join public.retail_registers register on register.id = sale.register_id
  where sale.id = sale_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail payment users can insert scoped payments" on public.retail_payments;
create policy "retail payment users can insert scoped payments"
on public.retail_payments for insert to authenticated
with check (public.can_manage_retail_payments() and exists (
  select 1
  from public.retail_sales sale
  join public.retail_registers register on register.id = sale.register_id
  where sale.id = sale_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail payment users can update scoped payments" on public.retail_payments;
create policy "retail payment users can update scoped payments"
on public.retail_payments for update to authenticated
using (public.can_manage_retail_payments() and exists (
  select 1
  from public.retail_sales sale
  join public.retail_registers register on register.id = sale.register_id
  where sale.id = sale_id
    and public.can_access_outlet(register.outlet_id)
))
with check (public.can_manage_retail_payments() and exists (
  select 1
  from public.retail_sales sale
  join public.retail_registers register on register.id = sale.register_id
  where sale.id = sale_id
    and public.can_access_outlet(register.outlet_id)
));
drop policy if exists "retail admins can delete payments" on public.retail_payments;
create policy "retail admins can delete payments"
on public.retail_payments for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read processing batches" on public.retail_processing_batches;
drop policy if exists "retail operators can insert processing batches" on public.retail_processing_batches;
drop policy if exists "retail operators can update processing batches" on public.retail_processing_batches;
drop policy if exists "retail admins can delete processing batches" on public.retail_processing_batches;
drop policy if exists "processing users can read scoped batches" on public.retail_processing_batches;
create policy "processing users can read scoped batches"
on public.retail_processing_batches for select to authenticated
using (public.can_access_department(department_id));
drop policy if exists "processing users can insert scoped batches" on public.retail_processing_batches;
create policy "processing users can insert scoped batches"
on public.retail_processing_batches for insert to authenticated
with check (
  public.can_manage_processing()
  and public.can_access_department(department_id)
  and status::text in ('OPEN', 'COMPLETED')
  and reviewed_by is null
  and reviewed_at is null
  and (processed_by = auth.uid() or processed_by is null)
);
drop policy if exists "processing workers can update open batches" on public.retail_processing_batches;
create policy "processing workers can update open batches"
on public.retail_processing_batches for update to authenticated
using (
  public.can_manage_processing()
  and public.can_access_department(department_id)
  and status::text = 'OPEN'
)
with check (
  public.can_manage_processing()
  and public.can_access_department(department_id)
  and status::text in ('OPEN', 'COMPLETED', 'CANCELLED')
  and reviewed_by is null
);
drop policy if exists "processing managers can review batches" on public.retail_processing_batches;
create policy "processing managers can review batches"
on public.retail_processing_batches for update to authenticated
using (
  public.can_review_processing()
  and public.can_access_department(department_id)
  and status::text = 'COMPLETED'
)
with check (
  public.can_review_processing()
  and public.can_access_department(department_id)
  and status::text in ('REVIEWED', 'CANCELLED')
);
drop policy if exists "processing admins can delete batches" on public.retail_processing_batches;
create policy "processing admins can delete batches"
on public.retail_processing_batches for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "retail operators can insert cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "retail operators can update cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "retail admins can delete cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "cleaning users can read scoped tasks" on public.retail_cleaning_tasks;
create policy "cleaning users can read scoped tasks"
on public.retail_cleaning_tasks for select to authenticated
using (public.can_access_work_scope(outlet_id, department_id));
drop policy if exists "cleaning managers can insert scoped tasks" on public.retail_cleaning_tasks;
create policy "cleaning managers can insert scoped tasks"
on public.retail_cleaning_tasks for insert to authenticated
with check (
  public.can_manage_attendance()
  and public.can_access_work_scope(outlet_id, department_id)
  and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "cleaning managers can update scoped tasks" on public.retail_cleaning_tasks;
create policy "cleaning managers can update scoped tasks"
on public.retail_cleaning_tasks for update to authenticated
using (public.can_manage_attendance() and public.can_access_work_scope(outlet_id, department_id))
with check (public.can_manage_attendance() and public.can_access_work_scope(outlet_id, department_id));
drop policy if exists "cleaning admins can delete tasks" on public.retail_cleaning_tasks;
create policy "cleaning admins can delete tasks"
on public.retail_cleaning_tasks for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read expenses" on public.retail_expenses;
drop policy if exists "retail payment users can insert expenses" on public.retail_expenses;
drop policy if exists "retail payment users can update expenses" on public.retail_expenses;
drop policy if exists "retail expense reviewers can update expenses" on public.retail_expenses;
drop policy if exists "retail expense approvers can update expenses" on public.retail_expenses;
drop policy if exists "retail admins can delete expenses" on public.retail_expenses;
drop policy if exists "retail users can read scoped expenses" on public.retail_expenses;
create policy "retail users can read scoped expenses"
on public.retail_expenses for select to authenticated
using (public.can_manage_retail_payments() and public.can_access_outlet(outlet_id));
drop policy if exists "retail users can insert scoped expenses" on public.retail_expenses;
create policy "retail users can insert scoped expenses"
on public.retail_expenses for insert to authenticated
with check (
  public.can_manage_retail_payments()
  and public.can_access_outlet(outlet_id)
  and (submitted_by = auth.uid() or submitted_by is null)
);
drop policy if exists "retail submitters can update submitted expenses" on public.retail_expenses;
create policy "retail submitters can update submitted expenses"
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
  and status::text = 'SUBMITTED'
  and public.can_access_outlet(outlet_id)
);
drop policy if exists "retail reviewers can review expenses" on public.retail_expenses;
create policy "retail reviewers can review expenses"
on public.retail_expenses for update to authenticated
using (public.can_review_retail_expenses() and status::text = 'SUBMITTED' and public.can_access_outlet(outlet_id))
with check (public.can_review_retail_expenses() and status::text in ('REVIEWED', 'REJECTED') and public.can_access_outlet(outlet_id));
drop policy if exists "retail approvers can approve expenses" on public.retail_expenses;
create policy "retail approvers can approve expenses"
on public.retail_expenses for update to authenticated
using (public.is_admin_or_director() and status::text in ('REVIEWED', 'APPROVED'))
with check (public.is_admin_or_director() and status::text in ('APPROVED', 'REJECTED', 'PAID'));
drop policy if exists "retail admins can delete expenses" on public.retail_expenses;
create policy "retail admins can delete expenses"
on public.retail_expenses for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read payment types" on public.retail_payment_types;
create policy "retail users can read payment types"
on public.retail_payment_types for select to authenticated
using (public.can_view_retail());
drop policy if exists "admins can insert payment types" on public.retail_payment_types;
create policy "admins can insert payment types"
on public.retail_payment_types for insert to authenticated
with check (public.is_admin_or_director());
drop policy if exists "admins can update payment types" on public.retail_payment_types;
create policy "admins can update payment types"
on public.retail_payment_types for update to authenticated
using (public.is_admin_or_director())
with check (public.is_admin_or_director());
drop policy if exists "admins can delete payment types" on public.retail_payment_types;
create policy "admins can delete payment types"
on public.retail_payment_types for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read scoped daily sales" on public.retail_daily_sales;
create policy "retail users can read scoped daily sales"
on public.retail_daily_sales for select to authenticated
using (public.can_view_retail() and public.can_access_outlet(outlet_id));
drop policy if exists "retail users can insert scoped daily sales" on public.retail_daily_sales;
create policy "retail users can insert scoped daily sales"
on public.retail_daily_sales for insert to authenticated
with check (public.can_manage_retail() and public.can_access_outlet(outlet_id));
drop policy if exists "retail users can update scoped daily sales" on public.retail_daily_sales;
create policy "retail users can update scoped daily sales"
on public.retail_daily_sales for update to authenticated
using (public.can_manage_retail() and public.can_access_outlet(outlet_id))
with check (public.can_manage_retail() and public.can_access_outlet(outlet_id));
drop policy if exists "admins can delete daily sales" on public.retail_daily_sales;
create policy "admins can delete daily sales"
on public.retail_daily_sales for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "retail users can read scoped daily closings" on public.retail_daily_closings;
create policy "retail users can read scoped daily closings"
on public.retail_daily_closings for select to authenticated
using (public.can_view_retail() and public.can_access_outlet(outlet_id));
drop policy if exists "retail users can insert scoped daily closings" on public.retail_daily_closings;
create policy "retail users can insert scoped daily closings"
on public.retail_daily_closings for insert to authenticated
with check (
  public.can_manage_retail()
  and public.can_access_outlet(outlet_id)
  and status::text in ('DRAFT', 'SUBMITTED')
);
drop policy if exists "retail users can submit daily closings" on public.retail_daily_closings;
create policy "retail users can submit daily closings"
on public.retail_daily_closings for update to authenticated
using (
  public.can_manage_retail()
  and public.can_access_outlet(outlet_id)
  and status::text in ('DRAFT', 'REJECTED')
)
with check (
  public.can_manage_retail()
  and public.can_access_outlet(outlet_id)
  and status::text in ('DRAFT', 'SUBMITTED')
  and approved_by is null
  and approved_at is null
);
drop policy if exists "retail managers can approve daily closings" on public.retail_daily_closings;
create policy "retail managers can approve daily closings"
on public.retail_daily_closings for update to authenticated
using (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and status::text = 'SUBMITTED'
)
with check (
  public.can_administer_retail()
  and public.can_access_outlet(outlet_id)
  and status::text in ('APPROVED', 'REJECTED')
);
drop policy if exists "admins can delete daily closings" on public.retail_daily_closings;
create policy "admins can delete daily closings"
on public.retail_daily_closings for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "users and oa reviewers can read advance requests" on public.advance_requests;
drop policy if exists "users can insert own advance requests" on public.advance_requests;
drop policy if exists "users can update own pending advance requests" on public.advance_requests;
drop policy if exists "oa reviewers can update advance requests" on public.advance_requests;
drop policy if exists "oa approvers can update advance requests" on public.advance_requests;
drop policy if exists "oa approvers can delete advance requests" on public.advance_requests;
drop policy if exists "users and reviewers can read scoped advances" on public.advance_requests;
create policy "users and reviewers can read scoped advances"
on public.advance_requests for select to authenticated
using (requested_by = auth.uid() or public.has_role('account') or public.is_admin_or_director());
drop policy if exists "users can insert own advances" on public.advance_requests;
create policy "users can insert own advances"
on public.advance_requests for insert to authenticated
with check (requested_by = auth.uid() and status::text = 'SUBMITTED');
drop policy if exists "users can update own submitted advances" on public.advance_requests;
create policy "users can update own submitted advances"
on public.advance_requests for update to authenticated
using (requested_by = auth.uid() and status::text = 'SUBMITTED')
with check (requested_by = auth.uid() and status::text = 'SUBMITTED');
drop policy if exists "admin account can review advances" on public.advance_requests;
create policy "admin account can review advances"
on public.advance_requests for update to authenticated
using ((public.has_role('account') or public.has_role('admin')) and status::text = 'SUBMITTED')
with check ((public.has_role('account') or public.has_role('admin')) and status::text in ('ADMIN_REVIEWED', 'REJECTED'));
drop policy if exists "directors can approve advances" on public.advance_requests;
create policy "directors can approve advances"
on public.advance_requests for update to authenticated
using (public.is_admin_or_director() and status::text in ('ADMIN_REVIEWED', 'DIRECTOR_APPROVED'))
with check (public.is_admin_or_director() and status::text in ('DIRECTOR_APPROVED', 'REJECTED', 'PAID'));
drop policy if exists "oa approvers can delete advances" on public.advance_requests;
create policy "oa approvers can delete advances"
on public.advance_requests for delete to authenticated using (public.is_admin_or_director());

drop policy if exists "users and oa reviewers can read claim requests" on public.claim_requests;
drop policy if exists "users can insert own claim requests" on public.claim_requests;
drop policy if exists "users can update own pending claim requests" on public.claim_requests;
drop policy if exists "oa reviewers can update claim requests" on public.claim_requests;
drop policy if exists "oa approvers can update claim requests" on public.claim_requests;
drop policy if exists "oa approvers can delete claim requests" on public.claim_requests;
drop policy if exists "users and reviewers can read scoped claims" on public.claim_requests;
create policy "users and reviewers can read scoped claims"
on public.claim_requests for select to authenticated
using (
  requested_by = auth.uid()
  or public.can_access_department(department_id)
  or public.has_role('account')
  or public.is_admin_or_director()
);
drop policy if exists "users can insert own claims" on public.claim_requests;
create policy "users can insert own claims"
on public.claim_requests for insert to authenticated
with check (requested_by = auth.uid() and status::text = 'SUBMITTED');
drop policy if exists "users can update own submitted claims" on public.claim_requests;
create policy "users can update own submitted claims"
on public.claim_requests for update to authenticated
using (requested_by = auth.uid() and status::text = 'SUBMITTED')
with check (requested_by = auth.uid() and status::text = 'SUBMITTED');
drop policy if exists "department managers can review claims" on public.claim_requests;
create policy "department managers can review claims"
on public.claim_requests for update to authenticated
using (public.can_access_department(department_id) and status::text = 'SUBMITTED')
with check (public.can_access_department(department_id) and status::text in ('MANAGER_REVIEWED', 'REJECTED'));
drop policy if exists "admin account can review manager reviewed claims" on public.claim_requests;
create policy "admin account can review manager reviewed claims"
on public.claim_requests for update to authenticated
using ((public.has_role('account') or public.has_role('admin')) and status::text = 'MANAGER_REVIEWED')
with check ((public.has_role('account') or public.has_role('admin')) and status::text in ('ADMIN_REVIEWED', 'REJECTED'));
drop policy if exists "directors can approve claims" on public.claim_requests;
create policy "directors can approve claims"
on public.claim_requests for update to authenticated
using (public.is_admin_or_director() and status::text in ('ADMIN_REVIEWED', 'DIRECTOR_APPROVED'))
with check (public.is_admin_or_director() and status::text in ('DIRECTOR_APPROVED', 'REJECTED', 'PAID'));
drop policy if exists "oa approvers can delete claims" on public.claim_requests;
create policy "oa approvers can delete claims"
on public.claim_requests for delete to authenticated using (public.is_admin_or_director());

drop policy if exists "users and oa reviewers can read leave requests" on public.leave_requests;
drop policy if exists "users can insert own leave requests" on public.leave_requests;
drop policy if exists "users can update own pending leave requests" on public.leave_requests;
drop policy if exists "oa reviewers can update leave requests" on public.leave_requests;
drop policy if exists "oa approvers can update leave requests" on public.leave_requests;
drop policy if exists "oa approvers can delete leave requests" on public.leave_requests;
drop policy if exists "users and managers can read scoped leave" on public.leave_requests;
create policy "users and managers can read scoped leave"
on public.leave_requests for select to authenticated
using (requested_by = auth.uid() or public.can_access_department(department_id) or public.is_admin_or_director());
drop policy if exists "users can insert own leave" on public.leave_requests;
create policy "users can insert own leave"
on public.leave_requests for insert to authenticated
with check (requested_by = auth.uid() and status::text = 'SUBMITTED');
drop policy if exists "users can update own submitted leave" on public.leave_requests;
create policy "users can update own submitted leave"
on public.leave_requests for update to authenticated
using (requested_by = auth.uid() and status::text = 'SUBMITTED')
with check (requested_by = auth.uid() and status::text = 'SUBMITTED');
drop policy if exists "department managers can approve leave" on public.leave_requests;
create policy "department managers can approve leave"
on public.leave_requests for update to authenticated
using (public.can_access_department(department_id) and status::text = 'SUBMITTED')
with check (public.can_access_department(department_id) and status::text in ('APPROVED', 'REJECTED'));
drop policy if exists "oa approvers can delete leave" on public.leave_requests;
create policy "oa approvers can delete leave"
on public.leave_requests for delete to authenticated using (public.is_admin_or_director());
