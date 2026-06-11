create table if not exists public.outlet_module_access (
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  module_key text not null check (
    module_key in (
      'stock',
      'retail',
      'processing',
      'delivery',
      'attendance',
      'cleaning',
      'oa_actions',
      'accounting_finance',
      'director_reports'
    )
  ),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (outlet_id, module_key)
);

create index if not exists idx_outlet_module_access_module
on public.outlet_module_access(module_key);

drop trigger if exists set_outlet_module_access_updated_at on public.outlet_module_access;
create trigger set_outlet_module_access_updated_at
  before update on public.outlet_module_access
  for each row execute function public.set_updated_at();

create or replace function public.can_access_outlet_module(
  target_outlet_id uuid,
  target_module_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (
      public.can_access_outlet(target_outlet_id)
      and exists (
        select 1
        from public.outlet_module_access access
        where access.outlet_id = target_outlet_id
          and access.module_key = target_module_key
          and access.is_enabled
      )
    );
$$;

alter table public.outlet_module_access enable row level security;

drop policy if exists "users can read scoped outlet module access" on public.outlet_module_access;
create policy "users can read scoped outlet module access"
on public.outlet_module_access for select to authenticated
using (public.is_admin_or_director() or public.can_access_outlet(outlet_id));

drop policy if exists "admins can insert outlet module access" on public.outlet_module_access;
create policy "admins can insert outlet module access"
on public.outlet_module_access for insert to authenticated
with check (public.is_admin_or_director());

drop policy if exists "admins can update outlet module access" on public.outlet_module_access;
create policy "admins can update outlet module access"
on public.outlet_module_access for update to authenticated
using (public.is_admin_or_director())
with check (public.is_admin_or_director());

drop policy if exists "admins can delete outlet module access" on public.outlet_module_access;
create policy "admins can delete outlet module access"
on public.outlet_module_access for delete to authenticated
using (public.is_admin_or_director());
