alter type public.retail_processing_status add value if not exists 'DRAFT';
alter type public.retail_processing_status add value if not exists 'SUBMITTED';
alter type public.retail_processing_status add value if not exists 'REJECTED';

alter table public.retail_processing_batches
  alter column raw_item_id drop not null,
  alter column finished_item_id drop not null,
  add column if not exists processing_date date not null default current_date,
  add column if not exists processing_type text not null default 'Retail processing',
  add column if not exists wastage_weight_kg numeric(12, 3) not null default 0 check (wastage_weight_kg >= 0),
  add column if not exists wastage_reason text,
  add column if not exists wastage_photo_url text,
  add column if not exists wastage_remarks text,
  add column if not exists remarks text,
  add column if not exists warning_message text,
  add column if not exists rejection_reason text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_at timestamptz;

create or replace function public.can_view_processing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_processing() or public.can_review_processing();
$$;

update public.retail_processing_batches
set
  processing_date = coalesce(processing_date, processed_at::date, current_date),
  processing_type = coalesce(nullif(processing_type, ''), 'Retail processing'),
  created_by = coalesce(created_by, worker_id, processed_by),
  submitted_by = case
    when status::text in ('COMPLETED', 'SUBMITTED', 'REVIEWED') then coalesce(submitted_by, worker_id, processed_by)
    else submitted_by
  end,
  submitted_at = case
    when status::text in ('COMPLETED', 'SUBMITTED', 'REVIEWED') then coalesce(submitted_at, processed_at)
    else submitted_at
  end,
  remarks = coalesce(remarks, notes);

alter table public.retail_processing_batches
  add column if not exists wastage_percent numeric(8, 2)
    generated always as (
      case
        when raw_weight_kg > 0 then round((wastage_weight_kg / raw_weight_kg) * 100, 2)
        else null
      end
    ) stored,
  add column if not exists accounted_weight_kg numeric(12, 3)
    generated always as (finished_weight_kg + wastage_weight_kg) stored,
  add column if not exists unaccounted_difference_kg numeric(12, 3)
    generated always as (raw_weight_kg - (finished_weight_kg + wastage_weight_kg)) stored,
  add column if not exists unaccounted_difference_percent numeric(8, 2)
    generated always as (
      case
        when raw_weight_kg > 0 then round(((raw_weight_kg - (finished_weight_kg + wastage_weight_kg)) / raw_weight_kg) * 100, 2)
        else null
      end
    ) stored;

create table if not exists public.retail_processing_raw_lines (
  id uuid primary key default gen_random_uuid(),
  processing_batch_id uuid not null references public.retail_processing_batches(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  item_name text not null,
  weight_kg numeric(12, 3) not null check (weight_kg > 0),
  quantity numeric(12, 3) not null default 0 check (quantity >= 0),
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists public.retail_processing_finished_lines (
  id uuid primary key default gen_random_uuid(),
  processing_batch_id uuid not null references public.retail_processing_batches(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  item_name text not null,
  weight_kg numeric(12, 3) not null check (weight_kg > 0),
  quantity numeric(12, 3) not null default 0 check (quantity >= 0),
  remarks text,
  created_at timestamptz not null default now()
);

create index if not exists idx_retail_processing_batches_date
on public.retail_processing_batches(processing_date desc, outlet_id, status);

create index if not exists idx_retail_processing_raw_lines_batch
on public.retail_processing_raw_lines(processing_batch_id);

create index if not exists idx_retail_processing_finished_lines_batch
on public.retail_processing_finished_lines(processing_batch_id);

alter table public.retail_processing_raw_lines enable row level security;
alter table public.retail_processing_finished_lines enable row level security;

drop policy if exists "retail admins can delete processing batches" on public.retail_processing_batches;
drop policy if exists "processing admins can delete batches" on public.retail_processing_batches;

drop policy if exists "retail users can insert outlet processing batches" on public.retail_processing_batches;
create policy "retail users can insert outlet processing batches"
on public.retail_processing_batches for insert to authenticated
with check (
  public.can_manage_retail()
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('DRAFT', 'SUBMITTED')
  and reviewed_by is null
  and reviewed_at is null
  and (processed_by = auth.uid() or processed_by is null)
  and (created_by = auth.uid() or created_by is null)
  and (submitted_by = auth.uid() or submitted_by is null)
);

drop policy if exists "retail users can update draft outlet processing batches" on public.retail_processing_batches;
create policy "retail users can update draft outlet processing batches"
on public.retail_processing_batches for update to authenticated
using (
  public.can_manage_retail()
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('DRAFT', 'REJECTED')
)
with check (
  public.can_manage_retail()
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('DRAFT', 'SUBMITTED', 'CANCELLED')
  and reviewed_by is null
);

drop policy if exists "retail managers can review outlet processing batches" on public.retail_processing_batches;
create policy "retail managers can review outlet processing batches"
on public.retail_processing_batches for update to authenticated
using (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text = 'SUBMITTED'
)
with check (
  (public.has_role('retail_manager') or public.is_admin_or_director())
  and public.can_access_work_scope(outlet_id, department_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and status::text in ('REVIEWED', 'REJECTED', 'CANCELLED')
  and reviewed_by = auth.uid()
  and reviewed_at is not null
  and (status::text <> 'REJECTED' or nullif(trim(rejection_reason), '') is not null)
);

drop policy if exists "processing users can insert scoped batches" on public.retail_processing_batches;
create policy "processing users can insert scoped batches"
on public.retail_processing_batches for insert to authenticated
with check (
  public.can_manage_processing()
  and public.can_access_department(department_id)
  and status::text in ('DRAFT', 'SUBMITTED', 'OPEN', 'COMPLETED')
  and reviewed_by is null
  and reviewed_at is null
  and (processed_by = auth.uid() or processed_by is null)
  and (created_by = auth.uid() or created_by is null)
  and (submitted_by = auth.uid() or submitted_by is null)
);

drop policy if exists "processing workers can update open batches" on public.retail_processing_batches;
create policy "processing workers can update open batches"
on public.retail_processing_batches for update to authenticated
using (
  public.can_manage_processing()
  and public.can_access_department(department_id)
  and status::text in ('DRAFT', 'REJECTED', 'OPEN')
)
with check (
  public.can_manage_processing()
  and public.can_access_department(department_id)
  and status::text in ('DRAFT', 'SUBMITTED', 'CANCELLED', 'OPEN', 'COMPLETED')
  and reviewed_by is null
);

drop policy if exists "processing managers can review batches" on public.retail_processing_batches;
create policy "processing managers can review batches"
on public.retail_processing_batches for update to authenticated
using (
  public.can_review_processing()
  and public.can_access_department(department_id)
  and status::text in ('SUBMITTED', 'COMPLETED')
)
with check (
  public.can_review_processing()
  and public.can_access_department(department_id)
  and status::text in ('REVIEWED', 'REJECTED', 'CANCELLED')
  and (status::text <> 'REJECTED' or nullif(trim(rejection_reason), '') is not null)
);

drop policy if exists "retail users can read processing raw lines" on public.retail_processing_raw_lines;
create policy "retail users can read processing raw lines"
on public.retail_processing_raw_lines for select to authenticated
using (
  exists (
    select 1
    from public.retail_processing_batches batch
    where batch.id = processing_batch_id
      and public.can_view_retail()
      and public.can_access_work_scope(batch.outlet_id, batch.department_id)
      and public.can_access_outlet_module(batch.outlet_id, 'retail')
  )
);

drop policy if exists "retail users can insert processing raw lines" on public.retail_processing_raw_lines;
create policy "retail users can insert processing raw lines"
on public.retail_processing_raw_lines for insert to authenticated
with check (
  exists (
    select 1
    from public.retail_processing_batches batch
    where batch.id = processing_batch_id
      and public.can_manage_retail()
      and public.can_access_work_scope(batch.outlet_id, batch.department_id)
      and public.can_access_outlet_module(batch.outlet_id, 'retail')
      and batch.status::text in ('DRAFT', 'SUBMITTED')
  )
);

drop policy if exists "processing users can read processing raw lines" on public.retail_processing_raw_lines;
create policy "processing users can read processing raw lines"
on public.retail_processing_raw_lines for select to authenticated
using (
  exists (
    select 1
    from public.retail_processing_batches batch
    where batch.id = processing_batch_id
      and public.can_view_processing()
      and public.can_access_department(batch.department_id)
  )
);

drop policy if exists "processing users can insert processing raw lines" on public.retail_processing_raw_lines;
create policy "processing users can insert processing raw lines"
on public.retail_processing_raw_lines for insert to authenticated
with check (
  exists (
    select 1
    from public.retail_processing_batches batch
    where batch.id = processing_batch_id
      and public.can_manage_processing()
      and public.can_access_department(batch.department_id)
      and batch.status::text in ('DRAFT', 'SUBMITTED', 'OPEN', 'COMPLETED')
  )
);

drop policy if exists "retail users can read processing finished lines" on public.retail_processing_finished_lines;
create policy "retail users can read processing finished lines"
on public.retail_processing_finished_lines for select to authenticated
using (
  exists (
    select 1
    from public.retail_processing_batches batch
    where batch.id = processing_batch_id
      and public.can_view_retail()
      and public.can_access_work_scope(batch.outlet_id, batch.department_id)
      and public.can_access_outlet_module(batch.outlet_id, 'retail')
  )
);

drop policy if exists "retail users can insert processing finished lines" on public.retail_processing_finished_lines;
create policy "retail users can insert processing finished lines"
on public.retail_processing_finished_lines for insert to authenticated
with check (
  exists (
    select 1
    from public.retail_processing_batches batch
    where batch.id = processing_batch_id
      and public.can_manage_retail()
      and public.can_access_work_scope(batch.outlet_id, batch.department_id)
      and public.can_access_outlet_module(batch.outlet_id, 'retail')
      and batch.status::text in ('DRAFT', 'SUBMITTED')
  )
);

drop policy if exists "processing users can read processing finished lines" on public.retail_processing_finished_lines;
create policy "processing users can read processing finished lines"
on public.retail_processing_finished_lines for select to authenticated
using (
  exists (
    select 1
    from public.retail_processing_batches batch
    where batch.id = processing_batch_id
      and public.can_view_processing()
      and public.can_access_department(batch.department_id)
  )
);

drop policy if exists "processing users can insert processing finished lines" on public.retail_processing_finished_lines;
create policy "processing users can insert processing finished lines"
on public.retail_processing_finished_lines for insert to authenticated
with check (
  exists (
    select 1
    from public.retail_processing_batches batch
    where batch.id = processing_batch_id
      and public.can_manage_processing()
      and public.can_access_department(batch.department_id)
      and batch.status::text in ('DRAFT', 'SUBMITTED', 'OPEN', 'COMPLETED')
  )
);
