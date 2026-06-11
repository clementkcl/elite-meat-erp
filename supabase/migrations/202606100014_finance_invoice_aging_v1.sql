alter table public.finance_invoices
  add column if not exists item_list text not null default '',
  add column if not exists payment_status text not null default 'UNPAID'
    check (payment_status in ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'));

update public.finance_invoices
set payment_status = case
  when status::text = 'PAID' then 'PAID'
  when due_date is not null and due_date < current_date then 'OVERDUE'
  else payment_status
end;

create index if not exists idx_finance_invoices_payment_status
on public.finance_invoices(payment_status);

create or replace function public.can_manage_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('account') or public.has_role('admin');
$$;

create or replace function public.can_review_finance_invoice_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin');
$$;

create or replace function public.can_pay_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('account') or public.has_role('admin');
$$;

drop policy if exists "finance users can read invoices" on public.finance_invoices;
create policy "finance users can read invoices"
on public.finance_invoices for select to authenticated
using (public.can_view_finance());

drop policy if exists "finance users can insert invoices" on public.finance_invoices;
create policy "finance users can insert invoices"
on public.finance_invoices for insert to authenticated
with check (
  public.can_manage_finance()
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "finance users can update invoices" on public.finance_invoices;
create policy "finance users can update invoices"
on public.finance_invoices for update to authenticated
using (
  public.can_manage_finance()
  and created_by = auth.uid()
  and status::text in ('DRAFT', 'SUBMITTED')
)
with check (
  public.can_manage_finance()
  and created_by = auth.uid()
  and status::text in ('DRAFT', 'SUBMITTED')
  and reviewed_by is null
  and approved_by is null
  and approved_at is null
  and paid_at is null
);

drop policy if exists "finance reviewers can update invoices" on public.finance_invoices;
create policy "finance reviewers can update invoices"
on public.finance_invoices for update to authenticated
using (public.can_review_finance_invoice_data() and status::text = 'SUBMITTED')
with check (
  public.can_review_finance_invoice_data()
  and status::text in ('ACCOUNT_REVIEWED', 'REJECTED')
);

drop policy if exists "finance approvers can update invoices" on public.finance_invoices;
create policy "finance approvers can update invoices"
on public.finance_invoices for update to authenticated
using (public.can_approve_finance() and status::text = 'ACCOUNT_REVIEWED')
with check (
  public.can_approve_finance()
  and status::text in ('DIRECTOR_APPROVED', 'REJECTED')
);

drop policy if exists "finance users can mark invoices paid" on public.finance_invoices;
create policy "finance users can mark invoices paid"
on public.finance_invoices for update to authenticated
using (public.can_pay_finance() and status::text = 'DIRECTOR_APPROVED')
with check (
  public.can_pay_finance()
  and status::text = 'PAID'
  and payment_status = 'PAID'
);
