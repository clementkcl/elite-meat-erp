-- Damage/spoilage stock approval workflow.
-- Safe to re-run in Supabase SQL Editor.

create table if not exists public.stock_damage_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique,
  stock_unit_id uuid not null references public.stock_units(id) on delete restrict,
  barcode text not null,
  item_id uuid not null references public.items(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  location_id uuid not null references public.stock_locations(id) on delete restrict,
  reason text not null check (
    reason in (
      'expired',
      'broken_packaging',
      'smell',
      'wrong_temperature',
      'customer_rejected',
      'other'
    )
  ),
  status text not null default 'SUBMITTED' check (
    status in (
      'SUBMITTED',
      'MANAGER_REVIEWED',
      'DIRECTOR_APPROVED',
      'REJECTED'
    )
  ),
  photo_path text not null,
  notes text,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  manager_reviewed_by uuid references public.profiles(id) on delete set null,
  manager_reviewed_at timestamptz,
  manager_signature text,
  director_approved_by uuid references public.profiles(id) on delete set null,
  director_approved_at timestamptz,
  director_signature text,
  movement_id uuid references public.stock_movements(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stock_damage_requests_scope_status
on public.stock_damage_requests(location_id, status, requested_at desc);

create index if not exists idx_stock_damage_requests_unit_status
on public.stock_damage_requests(stock_unit_id, status);

create unique index if not exists idx_stock_damage_requests_open_unit
on public.stock_damage_requests(stock_unit_id)
where status in ('SUBMITTED', 'MANAGER_REVIEWED');

drop trigger if exists set_stock_damage_requests_updated_at on public.stock_damage_requests;
create trigger set_stock_damage_requests_updated_at
  before update on public.stock_damage_requests
  for each row execute function public.set_updated_at();

alter table public.stock_damage_requests enable row level security;

drop policy if exists "stock users can read scoped damage requests" on public.stock_damage_requests;
create policy "stock users can read scoped damage requests"
on public.stock_damage_requests for select to authenticated
using (public.can_access_stock_location(location_id));

drop policy if exists "stock users can create scoped damage requests" on public.stock_damage_requests;
create policy "stock users can create scoped damage requests"
on public.stock_damage_requests for insert to authenticated
with check (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and status = 'SUBMITTED'
  and photo_path <> ''
  and (requested_by = auth.uid() or requested_by is null)
);

drop policy if exists "stock managers can review damage requests" on public.stock_damage_requests;
create policy "stock managers can review damage requests"
on public.stock_damage_requests for update to authenticated
using (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'SUBMITTED'
)
with check (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status in ('MANAGER_REVIEWED', 'REJECTED')
  and manager_signature is not null
  and director_approved_at is null
);

drop policy if exists "stock directors can approve damage requests" on public.stock_damage_requests;
create policy "stock directors can approve damage requests"
on public.stock_damage_requests for update to authenticated
using (
  public.can_director_approve_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'MANAGER_REVIEWED'
)
with check (
  public.can_director_approve_stock_take()
  and public.can_access_stock_location(location_id)
  and status in ('DIRECTOR_APPROVED', 'REJECTED')
  and director_signature is not null
);

drop policy if exists "stock admins can delete damage requests" on public.stock_damage_requests;
create policy "stock admins can delete damage requests"
on public.stock_damage_requests for delete to authenticated
using (public.can_administer_stock());
