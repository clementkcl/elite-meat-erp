-- Stock take scope and approval hardening.
-- Safe to re-run in Supabase SQL Editor.

alter table public.stock_take_sessions
  add column if not exists item_id uuid references public.items(id) on delete restrict,
  add column if not exists brand_id uuid references public.brands(id) on delete set null,
  add column if not exists manager_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists manager_reviewed_at timestamptz,
  add column if not exists manager_signature text,
  add column if not exists director_approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists director_approved_at timestamptz,
  add column if not exists director_signature text;

update public.stock_take_sessions
set
  manager_reviewed_at = coalesce(manager_reviewed_at, reviewed_at),
  director_approved_at = coalesce(director_approved_at, approved_at),
  director_approved_by = coalesce(director_approved_by, approved_by)
where reviewed_at is not null
   or approved_at is not null
   or approved_by is not null;

create index if not exists idx_stock_take_sessions_scope_status
on public.stock_take_sessions(location_id, item_id, brand_id, status);

create or replace function public.can_manage_stock_take()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_manager')
    or public.has_role('delivery_manager')
    or public.has_role('processing_manager')
    or public.has_role('admin');
$$;

create or replace function public.can_director_approve_stock_take()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('director')
    or public.has_role('admin');
$$;

create or replace function public.can_edit_stock_take_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin')
    or exists (
      select 1
      from public.stock_take_sessions sts
      where sts.id = target_session_id
        and sts.status = 'DRAFT'
        and public.can_manage_stock()
        and public.can_access_stock_location(sts.location_id)
    );
$$;

alter table public.stock_take_sessions enable row level security;
alter table public.stock_take_lines enable row level security;

drop policy if exists "stock users can read scoped stock take sessions" on public.stock_take_sessions;
create policy "stock users can read scoped stock take sessions"
on public.stock_take_sessions for select to authenticated
using (public.can_access_stock_location(location_id));

drop policy if exists "stock users can create scoped draft stock take sessions" on public.stock_take_sessions;
create policy "stock users can create scoped draft stock take sessions"
on public.stock_take_sessions for insert to authenticated
with check (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'DRAFT'
  and item_id is not null
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
  and manager_reviewed_at is null
  and director_approved_at is null
  and approved_by is null
  and approved_at is null
);

drop policy if exists "stock admins can review approve or reject stock take sessions" on public.stock_take_sessions;
drop policy if exists "stock managers can review stock take sessions" on public.stock_take_sessions;
create policy "stock managers can review stock take sessions"
on public.stock_take_sessions for update to authenticated
using (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'SUBMITTED'
)
with check (
  public.can_manage_stock_take()
  and public.can_access_stock_location(location_id)
  and status in ('REVIEWED', 'REJECTED')
  and manager_reviewed_at is not null
  and manager_signature is not null
  and director_approved_at is null
);

drop policy if exists "stock directors can approve reviewed stock take sessions" on public.stock_take_sessions;
create policy "stock directors can approve reviewed stock take sessions"
on public.stock_take_sessions for update to authenticated
using (
  public.can_director_approve_stock_take()
  and public.can_access_stock_location(location_id)
  and status = 'REVIEWED'
)
with check (
  public.can_director_approve_stock_take()
  and public.can_access_stock_location(location_id)
  and status in ('APPROVED', 'REJECTED')
  and director_approved_at is not null
  and director_signature is not null
);

drop policy if exists "stock admins can delete stock take sessions" on public.stock_take_sessions;
create policy "stock admins can delete stock take sessions"
on public.stock_take_sessions for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "stock users can read scoped stock take lines" on public.stock_take_lines;
create policy "stock users can read scoped stock take lines"
on public.stock_take_lines for select to authenticated
using (exists (
  select 1
  from public.stock_take_sessions session
  where session.id = session_id
    and public.can_access_stock_location(session.location_id)
));

drop policy if exists "stock users can insert scoped draft stock take lines" on public.stock_take_lines;
create policy "stock users can insert scoped draft stock take lines"
on public.stock_take_lines for insert to authenticated
with check (
  public.can_edit_stock_take_session(session_id)
  and exists (
    select 1
    from public.stock_take_sessions session
    where session.id = session_id
      and public.can_access_stock_location(session.location_id)
      and session.status = 'DRAFT'
      and session.item_id = stock_take_lines.item_id
      and session.brand_id is not distinct from stock_take_lines.brand_id
  )
);

drop policy if exists "stock users can update scoped draft stock take lines" on public.stock_take_lines;
create policy "stock users can update scoped draft stock take lines"
on public.stock_take_lines for update to authenticated
using (
  public.can_edit_stock_take_session(session_id)
  and exists (
    select 1
    from public.stock_take_sessions session
    where session.id = session_id
      and public.can_access_stock_location(session.location_id)
      and session.status = 'DRAFT'
  )
)
with check (
  public.can_edit_stock_take_session(session_id)
  and exists (
    select 1
    from public.stock_take_sessions session
    where session.id = session_id
      and public.can_access_stock_location(session.location_id)
      and session.status = 'DRAFT'
      and session.item_id = stock_take_lines.item_id
      and session.brand_id is not distinct from stock_take_lines.brand_id
  )
);

drop policy if exists "stock admins can delete stock take lines" on public.stock_take_lines;
create policy "stock admins can delete stock take lines"
on public.stock_take_lines for delete to authenticated
using (public.can_administer_stock());
