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
    );
$$;
