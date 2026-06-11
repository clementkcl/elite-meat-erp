do $$
begin
  create type public.oa_request_status as enum (
    'SUBMITTED',
    'ADMIN_REVIEWED',
    'DIRECTOR_APPROVED',
    'REJECTED',
    'PAID',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.leave_request_type as enum (
    'ANNUAL',
    'SICK',
    'EMERGENCY',
    'UNPAID'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.can_review_oa_actions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('account');
$$;

create or replace function public.can_approve_oa_actions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('director');
$$;

create table if not exists public.advance_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  needed_date date,
  reason text not null,
  status public.oa_request_status not null default 'SUBMITTED',
  attachment_file_id uuid references public.files(id) on delete set null,
  admin_reviewed_by uuid references public.profiles(id) on delete set null,
  admin_reviewed_at timestamptz,
  director_approved_by uuid references public.profiles(id) on delete set null,
  director_approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id) on delete set null,
  category text not null,
  expense_date date,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  status public.oa_request_status not null default 'SUBMITTED',
  attachment_file_id uuid references public.files(id) on delete set null,
  admin_reviewed_by uuid references public.profiles(id) on delete set null,
  admin_reviewed_at timestamptz,
  director_approved_by uuid references public.profiles(id) on delete set null,
  director_approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id) on delete set null,
  leave_type public.leave_request_type not null,
  start_date date not null,
  end_date date not null,
  total_days numeric(6, 2) not null check (total_days > 0),
  reason text not null,
  status public.oa_request_status not null default 'SUBMITTED',
  attachment_file_id uuid references public.files(id) on delete set null,
  admin_reviewed_by uuid references public.profiles(id) on delete set null,
  admin_reviewed_at timestamptz,
  director_approved_by uuid references public.profiles(id) on delete set null,
  director_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  period_month date not null,
  gross_pay numeric(12, 2) not null default 0 check (gross_pay >= 0),
  deductions numeric(12, 2) not null default 0 check (deductions >= 0),
  net_pay numeric(12, 2) generated always as (gross_pay - deductions) stored,
  file_id uuid references public.files(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, period_month)
);

create table if not exists public.approval_logs (
  id uuid primary key default gen_random_uuid(),
  module text not null default 'oa-actions',
  request_type text not null,
  request_id uuid not null,
  action text not null,
  from_status public.oa_request_status,
  to_status public.oa_request_status,
  notes text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_advance_requests_requested_by on public.advance_requests(requested_by, created_at desc);
create index if not exists idx_advance_requests_status on public.advance_requests(status);
create index if not exists idx_claim_requests_requested_by on public.claim_requests(requested_by, created_at desc);
create index if not exists idx_claim_requests_status on public.claim_requests(status);
create index if not exists idx_leave_requests_requested_by on public.leave_requests(requested_by, created_at desc);
create index if not exists idx_leave_requests_status on public.leave_requests(status);
create index if not exists idx_payslips_profile_period on public.payslips(profile_id, period_month desc);
create index if not exists idx_approval_logs_request on public.approval_logs(request_type, request_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'advance_requests',
    'claim_requests',
    'leave_requests',
    'payslips'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

alter table public.advance_requests enable row level security;
alter table public.claim_requests enable row level security;
alter table public.leave_requests enable row level security;
alter table public.payslips enable row level security;
alter table public.approval_logs enable row level security;

drop policy if exists "users and oa reviewers can read advance requests" on public.advance_requests;
drop policy if exists "users can insert own advance requests" on public.advance_requests;
drop policy if exists "users can update own pending advance requests" on public.advance_requests;
drop policy if exists "oa reviewers can update advance requests" on public.advance_requests;
drop policy if exists "oa approvers can update advance requests" on public.advance_requests;
drop policy if exists "oa approvers can delete advance requests" on public.advance_requests;
drop policy if exists "users and oa reviewers can read advance requests" on public.advance_requests;
create policy "users and oa reviewers can read advance requests"
on public.advance_requests for select to authenticated
using (
  requested_by = auth.uid()
  or public.can_review_oa_actions()
  or public.can_approve_oa_actions()
);
drop policy if exists "users can insert own advance requests" on public.advance_requests;
create policy "users can insert own advance requests"
on public.advance_requests for insert to authenticated
with check (requested_by = auth.uid() and status = 'SUBMITTED');
drop policy if exists "users can update own pending advance requests" on public.advance_requests;
create policy "users can update own pending advance requests"
on public.advance_requests for update to authenticated
using (requested_by = auth.uid() and status = 'SUBMITTED')
with check (requested_by = auth.uid() and status in ('SUBMITTED', 'CANCELLED'));
drop policy if exists "oa reviewers can update advance requests" on public.advance_requests;
create policy "oa reviewers can update advance requests"
on public.advance_requests for update to authenticated
using (public.can_review_oa_actions() and status = 'SUBMITTED')
with check (public.can_review_oa_actions() and status in ('ADMIN_REVIEWED', 'REJECTED'));
drop policy if exists "oa approvers can update advance requests" on public.advance_requests;
create policy "oa approvers can update advance requests"
on public.advance_requests for update to authenticated
using (public.can_approve_oa_actions() and status in ('ADMIN_REVIEWED', 'DIRECTOR_APPROVED'))
with check (public.can_approve_oa_actions() and status in ('DIRECTOR_APPROVED', 'REJECTED', 'PAID'));
drop policy if exists "oa approvers can delete advance requests" on public.advance_requests;
create policy "oa approvers can delete advance requests"
on public.advance_requests for delete to authenticated using (public.can_approve_oa_actions());

drop policy if exists "users and oa reviewers can read claim requests" on public.claim_requests;
drop policy if exists "users can insert own claim requests" on public.claim_requests;
drop policy if exists "users can update own pending claim requests" on public.claim_requests;
drop policy if exists "oa reviewers can update claim requests" on public.claim_requests;
drop policy if exists "oa approvers can update claim requests" on public.claim_requests;
drop policy if exists "oa approvers can delete claim requests" on public.claim_requests;
drop policy if exists "users and oa reviewers can read claim requests" on public.claim_requests;
create policy "users and oa reviewers can read claim requests"
on public.claim_requests for select to authenticated
using (
  requested_by = auth.uid()
  or public.can_review_oa_actions()
  or public.can_approve_oa_actions()
);
drop policy if exists "users can insert own claim requests" on public.claim_requests;
create policy "users can insert own claim requests"
on public.claim_requests for insert to authenticated
with check (requested_by = auth.uid() and status = 'SUBMITTED');
drop policy if exists "users can update own pending claim requests" on public.claim_requests;
create policy "users can update own pending claim requests"
on public.claim_requests for update to authenticated
using (requested_by = auth.uid() and status = 'SUBMITTED')
with check (requested_by = auth.uid() and status in ('SUBMITTED', 'CANCELLED'));
drop policy if exists "oa reviewers can update claim requests" on public.claim_requests;
create policy "oa reviewers can update claim requests"
on public.claim_requests for update to authenticated
using (public.can_review_oa_actions() and status = 'SUBMITTED')
with check (public.can_review_oa_actions() and status in ('ADMIN_REVIEWED', 'REJECTED'));
drop policy if exists "oa approvers can update claim requests" on public.claim_requests;
create policy "oa approvers can update claim requests"
on public.claim_requests for update to authenticated
using (public.can_approve_oa_actions() and status in ('ADMIN_REVIEWED', 'DIRECTOR_APPROVED'))
with check (public.can_approve_oa_actions() and status in ('DIRECTOR_APPROVED', 'REJECTED', 'PAID'));
drop policy if exists "oa approvers can delete claim requests" on public.claim_requests;
create policy "oa approvers can delete claim requests"
on public.claim_requests for delete to authenticated using (public.can_approve_oa_actions());

drop policy if exists "users and oa reviewers can read leave requests" on public.leave_requests;
drop policy if exists "users can insert own leave requests" on public.leave_requests;
drop policy if exists "users can update own pending leave requests" on public.leave_requests;
drop policy if exists "oa reviewers can update leave requests" on public.leave_requests;
drop policy if exists "oa approvers can update leave requests" on public.leave_requests;
drop policy if exists "oa approvers can delete leave requests" on public.leave_requests;
drop policy if exists "users and oa reviewers can read leave requests" on public.leave_requests;
create policy "users and oa reviewers can read leave requests"
on public.leave_requests for select to authenticated
using (
  requested_by = auth.uid()
  or public.can_review_oa_actions()
  or public.can_approve_oa_actions()
);
drop policy if exists "users can insert own leave requests" on public.leave_requests;
create policy "users can insert own leave requests"
on public.leave_requests for insert to authenticated
with check (requested_by = auth.uid() and status = 'SUBMITTED');
drop policy if exists "users can update own pending leave requests" on public.leave_requests;
create policy "users can update own pending leave requests"
on public.leave_requests for update to authenticated
using (requested_by = auth.uid() and status = 'SUBMITTED')
with check (requested_by = auth.uid() and status in ('SUBMITTED', 'CANCELLED'));
drop policy if exists "oa reviewers can update leave requests" on public.leave_requests;
create policy "oa reviewers can update leave requests"
on public.leave_requests for update to authenticated
using (public.can_review_oa_actions() and status = 'SUBMITTED')
with check (public.can_review_oa_actions() and status in ('ADMIN_REVIEWED', 'REJECTED'));
drop policy if exists "oa approvers can update leave requests" on public.leave_requests;
create policy "oa approvers can update leave requests"
on public.leave_requests for update to authenticated
using (public.can_approve_oa_actions() and status = 'ADMIN_REVIEWED')
with check (public.can_approve_oa_actions() and status in ('DIRECTOR_APPROVED', 'REJECTED'));
drop policy if exists "oa approvers can delete leave requests" on public.leave_requests;
create policy "oa approvers can delete leave requests"
on public.leave_requests for delete to authenticated using (public.can_approve_oa_actions());

drop policy if exists "users and payroll admins can read payslips" on public.payslips;
drop policy if exists "payroll admins can insert payslips" on public.payslips;
drop policy if exists "payroll admins can update payslips" on public.payslips;
drop policy if exists "oa approvers can delete payslips" on public.payslips;
drop policy if exists "users and payroll admins can read payslips" on public.payslips;
create policy "users and payroll admins can read payslips"
on public.payslips for select to authenticated
using (
  profile_id = auth.uid()
  or public.can_review_oa_actions()
  or public.can_approve_oa_actions()
);
drop policy if exists "payroll admins can insert payslips" on public.payslips;
create policy "payroll admins can insert payslips"
on public.payslips for insert to authenticated
with check (public.can_review_oa_actions() or public.can_approve_oa_actions());
drop policy if exists "payroll admins can update payslips" on public.payslips;
create policy "payroll admins can update payslips"
on public.payslips for update to authenticated
using (public.can_review_oa_actions() or public.can_approve_oa_actions())
with check (public.can_review_oa_actions() or public.can_approve_oa_actions());
drop policy if exists "oa approvers can delete payslips" on public.payslips;
create policy "oa approvers can delete payslips"
on public.payslips for delete to authenticated using (public.can_approve_oa_actions());

drop policy if exists "oa reviewers can read approval logs" on public.approval_logs;
drop policy if exists "oa reviewers can insert approval logs" on public.approval_logs;
drop policy if exists "oa approvers can delete approval logs" on public.approval_logs;
drop policy if exists "oa reviewers can read approval logs" on public.approval_logs;
create policy "oa reviewers can read approval logs"
on public.approval_logs for select to authenticated
using (actor_id = auth.uid() or public.can_review_oa_actions() or public.can_approve_oa_actions());
drop policy if exists "oa reviewers can insert approval logs" on public.approval_logs;
create policy "oa reviewers can insert approval logs"
on public.approval_logs for insert to authenticated
with check (
  actor_id = auth.uid()
  and (public.can_review_oa_actions() or public.can_approve_oa_actions())
);
drop policy if exists "oa approvers can delete approval logs" on public.approval_logs;
create policy "oa approvers can delete approval logs"
on public.approval_logs for delete to authenticated using (public.can_approve_oa_actions());
