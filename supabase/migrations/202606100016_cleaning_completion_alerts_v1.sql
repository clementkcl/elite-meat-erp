create or replace function public.can_complete_cleaning_task(
  target_outlet_id uuid,
  target_department_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin')
    or (
      (
        public.has_role('retail_team_general_worker')
        or public.has_role('retail_manager')
        or public.has_role('delivery_team_general_worker')
        or public.has_role('delivery_manager')
        or public.has_role('processing_team_general_worker')
        or public.has_role('processing_manager')
        or public.has_role('account')
      )
      and public.can_access_work_scope(target_outlet_id, target_department_id)
    );
$$;

drop policy if exists "cleaning users can complete scoped tasks" on public.retail_cleaning_tasks;
create policy "cleaning users can complete scoped tasks"
on public.retail_cleaning_tasks for update to authenticated
using (
  public.can_complete_cleaning_task(outlet_id, department_id)
  and status::text in ('PENDING', 'MISSED')
)
with check (
  public.can_complete_cleaning_task(outlet_id, department_id)
  and status::text in ('DONE', 'MISSED')
  and (
    (
      status::text = 'DONE'
      and completed_by = auth.uid()
      and completed_at is not null
    )
    or (
      status::text = 'MISSED'
      and completed_by is null
      and completed_at is null
    )
  )
);
