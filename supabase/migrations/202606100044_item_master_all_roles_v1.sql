-- Item master role hardening.
-- Safe to re-run in Supabase SQL Editor.

create or replace function public.can_edit_item_master()
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
    or public.has_role('account')
    or public.has_role('admin')
    or public.has_role('director');
$$;

drop policy if exists "stock admins can insert items" on public.items;
drop policy if exists "stock users can insert items" on public.items;
drop policy if exists "all erp users can insert item master" on public.items;
create policy "all erp users can insert item master"
on public.items for insert to authenticated
with check (public.can_edit_item_master());

drop policy if exists "stock admins can update items" on public.items;
drop policy if exists "stock users can update items" on public.items;
drop policy if exists "all erp users can update item master" on public.items;
create policy "all erp users can update item master"
on public.items for update to authenticated
using (public.can_edit_item_master())
with check (public.can_edit_item_master());

drop policy if exists "stock admins can delete items" on public.items;
drop policy if exists "all erp users can delete item master" on public.items;
drop policy if exists "stock admins can delete items" on public.items;
create policy "stock admins can delete items"
on public.items for delete to authenticated
using (public.can_administer_stock());
