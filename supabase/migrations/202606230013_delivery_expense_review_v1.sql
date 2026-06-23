-- Delivery Module V1 - expense review metadata and scoped policies.
-- Forward-only and idempotent.

alter table public.delivery_expenses
  add column if not exists outlet_id uuid references public.outlets(id) on delete set null,
  add column if not exists review_note text,
  add column if not exists rejected_reason text;

update public.delivery_expenses expense
set outlet_id = coalesce(
  expense.outlet_id,
  (
    select delivery.outlet_id
    from public.deliveries delivery
    where delivery.id = expense.delivery_id
  ),
  (
    select profile.outlet_id
    from public.profiles profile
    where profile.id = expense.driver_id
  )
)
where expense.outlet_id is null;

update public.delivery_expenses expense
set delivery_team_id = coalesce(
  expense.delivery_team_id,
  (
    select delivery.delivery_team_id
    from public.deliveries delivery
    where delivery.id = expense.delivery_id
  ),
  (
    select profile.department_id
    from public.profiles profile
    where profile.id = expense.driver_id
  )
)
where expense.delivery_team_id is null;

create index if not exists idx_delivery_expenses_outlet_team_created
  on public.delivery_expenses(outlet_id, delivery_team_id, created_at desc);

create index if not exists idx_delivery_expenses_vehicle_created
  on public.delivery_expenses(vehicle_id, created_at desc);

create index if not exists idx_delivery_expenses_type_status_created
  on public.delivery_expenses(expense_type, status, created_at desc);

drop policy if exists "delivery users can read canonical expenses" on public.delivery_expenses;
create policy "delivery users can read canonical expenses"
on public.delivery_expenses for select to authenticated
using (
  driver_id = auth.uid()
  or public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or (delivery_id is not null and public.can_access_delivery(delivery_id))
);

drop policy if exists "delivery drivers can insert canonical expenses" on public.delivery_expenses;
create policy "delivery drivers can insert canonical expenses"
on public.delivery_expenses for insert to authenticated
with check (
  driver_id = auth.uid()
  and (created_by = auth.uid() or created_by is null)
  and (
    public.can_access_delivery_scope(outlet_id, delivery_team_id)
    or (delivery_id is not null and public.can_mutate_delivery(delivery_id))
  )
);

drop policy if exists "delivery managers can update canonical expenses" on public.delivery_expenses;
create policy "delivery managers can update canonical expenses"
on public.delivery_expenses for update to authenticated
using (
  public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or public.is_admin_or_director()
)
with check (
  public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or public.is_admin_or_director()
);
