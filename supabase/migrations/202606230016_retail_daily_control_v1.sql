drop policy if exists "retail users can read outlet processing batches" on public.retail_processing_batches;
create policy "retail users can read outlet processing batches"
on public.retail_processing_batches for select to authenticated
using (
  public.can_view_retail()
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
);

drop policy if exists "retail users can insert outlet processing batches" on public.retail_processing_batches;
create policy "retail users can insert outlet processing batches"
on public.retail_processing_batches for insert to authenticated
with check (
  public.can_manage_retail()
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('OPEN', 'COMPLETED')
  and reviewed_by is null
  and reviewed_at is null
  and (processed_by = auth.uid() or processed_by is null)
);

drop policy if exists "retail users can update open outlet processing batches" on public.retail_processing_batches;
create policy "retail users can update open outlet processing batches"
on public.retail_processing_batches for update to authenticated
using (
  public.can_manage_retail()
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text = 'OPEN'
)
with check (
  public.can_manage_retail()
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('OPEN', 'COMPLETED', 'CANCELLED')
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "retail managers can review outlet processing batches" on public.retail_processing_batches;
create policy "retail managers can review outlet processing batches"
on public.retail_processing_batches for update to authenticated
using (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text = 'COMPLETED'
)
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('REVIEWED', 'CANCELLED')
  and reviewed_by = auth.uid()
  and reviewed_at is not null
);

drop policy if exists "retail managers can insert outlet cleaning tasks" on public.retail_cleaning_tasks;
create policy "retail managers can insert outlet cleaning tasks"
on public.retail_cleaning_tasks for insert to authenticated
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "retail managers can update outlet cleaning tasks" on public.retail_cleaning_tasks;
create policy "retail managers can update outlet cleaning tasks"
on public.retail_cleaning_tasks for update to authenticated
using (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
)
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
);
