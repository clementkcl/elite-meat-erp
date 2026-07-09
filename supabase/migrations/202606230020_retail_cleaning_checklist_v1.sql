alter table public.retail_cleaning_tasks
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists completion_photo_url text,
  add column if not exists remarks text;

update public.retail_cleaning_tasks
set
  is_active = true,
  remarks = coalesce(remarks, notes),
  updated_by = coalesce(updated_by, completed_by, created_by);

create unique index if not exists retail_cleaning_tasks_master_unique
on public.retail_cleaning_tasks(outlet_id, task_name, frequency);

create table if not exists public.retail_cleaning_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.retail_cleaning_tasks(id) on delete cascade,
  outlet_id uuid references public.outlets(id) on delete set null,
  completion_date date not null default current_date,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz not null default now(),
  photo_url text,
  remarks text,
  created_at timestamptz not null default now(),
  unique (task_id, completion_date)
);

create index if not exists idx_retail_cleaning_completions_outlet_date
on public.retail_cleaning_completions(outlet_id, completion_date desc);

alter table public.retail_cleaning_completions enable row level security;

drop policy if exists "retail operators can insert cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "retail operators can update cleaning tasks" on public.retail_cleaning_tasks;
drop policy if exists "cleaning managers can insert scoped tasks" on public.retail_cleaning_tasks;
drop policy if exists "cleaning managers can update scoped tasks" on public.retail_cleaning_tasks;
drop policy if exists "cleaning users can complete scoped tasks" on public.retail_cleaning_tasks;

drop policy if exists "retail users can read cleaning completions" on public.retail_cleaning_completions;
create policy "retail users can read cleaning completions"
on public.retail_cleaning_completions for select to authenticated
using (
  public.can_view_retail()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
);

drop policy if exists "retail users can insert cleaning completions" on public.retail_cleaning_completions;
create policy "retail users can insert cleaning completions"
on public.retail_cleaning_completions for insert to authenticated
with check (
  public.can_manage_retail()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
  and completed_by = auth.uid()
);

drop policy if exists "retail managers can insert outlet cleaning tasks" on public.retail_cleaning_tasks;
create policy "retail managers can insert outlet cleaning tasks"
on public.retail_cleaning_tasks for insert to authenticated
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (created_by = auth.uid() or created_by is null)
  and (updated_by = auth.uid() or updated_by is null)
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
  and (updated_by = auth.uid() or updated_by is null)
);

drop policy if exists "retail users can complete outlet cleaning tasks" on public.retail_cleaning_tasks;
create policy "retail users can complete outlet cleaning tasks"
on public.retail_cleaning_tasks for update to authenticated
using (
  public.can_manage_retail()
  and is_active
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and (
    status::text in ('PENDING', 'MISSED')
    or (status::text = 'DONE' and completed_at::date < current_date)
  )
)
with check (
  public.can_manage_retail()
  and is_active
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('DONE', 'MISSED')
  and (completed_by = auth.uid() or completed_by is null)
);
