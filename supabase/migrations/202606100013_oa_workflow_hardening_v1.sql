alter type public.leave_request_type add value if not exists 'MEDICAL';
alter type public.leave_request_type add value if not exists 'REPLACEMENT';

create or replace function public.can_review_oa_actions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin')
    or public.has_role('retail_manager')
    or public.has_role('delivery_manager')
    or public.has_role('processing_manager');
$$;

create or replace function public.can_review_department_oa(target_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    public.has_role('retail_manager')
    or public.has_role('delivery_manager')
    or public.has_role('processing_manager')
  )
  and public.can_access_department(target_department_id);
$$;

create or replace function public.can_admin_review_oa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin');
$$;

create or replace function public.can_director_approve_oa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('director');
$$;

create or replace function public.can_pay_oa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('account') or public.has_role('admin');
$$;

create or replace function public.can_manage_payslips()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('account') or public.has_role('admin');
$$;

drop policy if exists "admin account can review advances" on public.advance_requests;
drop policy if exists "admins can review advances" on public.advance_requests;
create policy "admins can review advances"
on public.advance_requests for update to authenticated
using (public.can_admin_review_oa() and status::text = 'SUBMITTED')
with check (public.can_admin_review_oa() and status::text in ('ADMIN_REVIEWED', 'REJECTED'));

drop policy if exists "directors can approve advances" on public.advance_requests;
create policy "directors can approve advances"
on public.advance_requests for update to authenticated
using (public.can_director_approve_oa() and status::text = 'ADMIN_REVIEWED')
with check (public.can_director_approve_oa() and status::text in ('DIRECTOR_APPROVED', 'REJECTED'));

drop policy if exists "account admins can pay advances" on public.advance_requests;
create policy "account admins can pay advances"
on public.advance_requests for update to authenticated
using (public.can_pay_oa() and status::text = 'DIRECTOR_APPROVED')
with check (public.can_pay_oa() and status::text = 'PAID');

drop policy if exists "department managers can review claims" on public.claim_requests;
create policy "department managers can review claims"
on public.claim_requests for update to authenticated
using (public.can_review_department_oa(department_id) and status::text = 'SUBMITTED')
with check (public.can_review_department_oa(department_id) and status::text in ('MANAGER_REVIEWED', 'REJECTED'));

drop policy if exists "admin account can review manager reviewed claims" on public.claim_requests;
drop policy if exists "admins can review manager reviewed claims" on public.claim_requests;
create policy "admins can review manager reviewed claims"
on public.claim_requests for update to authenticated
using (public.can_admin_review_oa() and status::text = 'MANAGER_REVIEWED')
with check (public.can_admin_review_oa() and status::text in ('ADMIN_REVIEWED', 'REJECTED'));

drop policy if exists "directors can approve claims" on public.claim_requests;
create policy "directors can approve claims"
on public.claim_requests for update to authenticated
using (public.can_director_approve_oa() and status::text = 'ADMIN_REVIEWED')
with check (public.can_director_approve_oa() and status::text in ('DIRECTOR_APPROVED', 'REJECTED'));

drop policy if exists "account admins can pay claims" on public.claim_requests;
create policy "account admins can pay claims"
on public.claim_requests for update to authenticated
using (public.can_pay_oa() and status::text = 'DIRECTOR_APPROVED')
with check (public.can_pay_oa() and status::text = 'PAID');

drop policy if exists "department managers can approve leave" on public.leave_requests;
create policy "department managers can approve leave"
on public.leave_requests for update to authenticated
using (public.can_review_department_oa(department_id) and status::text = 'SUBMITTED')
with check (public.can_review_department_oa(department_id) and status::text in ('APPROVED', 'REJECTED'));

drop policy if exists "users and payroll admins can read payslips" on public.payslips;
create policy "users and payroll admins can read payslips"
on public.payslips for select to authenticated
using (
  profile_id = auth.uid()
  or public.can_manage_payslips()
  or public.has_role('director')
);

drop policy if exists "payroll admins can insert payslips" on public.payslips;
create policy "payroll admins can insert payslips"
on public.payslips for insert to authenticated
with check (public.can_manage_payslips());

drop policy if exists "payroll admins can update payslips" on public.payslips;
create policy "payroll admins can update payslips"
on public.payslips for update to authenticated
using (public.can_manage_payslips())
with check (public.can_manage_payslips());

drop policy if exists "oa approvers can delete payslips" on public.payslips;
drop policy if exists "payroll admins can delete payslips" on public.payslips;
create policy "payroll admins can delete payslips"
on public.payslips for delete to authenticated
using (public.has_role('admin'));

drop policy if exists "oa reviewers can read approval logs" on public.approval_logs;
create policy "oa reviewers can read approval logs"
on public.approval_logs for select to authenticated
using (
  actor_id = auth.uid()
  or public.can_review_oa_actions()
  or public.can_director_approve_oa()
  or public.can_pay_oa()
);

drop policy if exists "oa reviewers can insert approval logs" on public.approval_logs;
create policy "oa reviewers can insert approval logs"
on public.approval_logs for insert to authenticated
with check (
  actor_id = auth.uid()
  and (
    public.can_review_oa_actions()
    or public.can_director_approve_oa()
    or public.can_pay_oa()
  )
);
