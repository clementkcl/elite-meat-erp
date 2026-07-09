alter table public.retail_processing_batches
  alter column status set default 'DRAFT';

create table if not exists public.retail_processing_boms (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references public.outlets(id) on delete set null,
  name text not null,
  raw_material_item_names text[] not null default '{}',
  finished_product_item_names text[] not null default '{}',
  is_active boolean not null default true,
  remarks text,
  expected_yield_min_percent numeric(8, 2),
  expected_yield_max_percent numeric(8, 2),
  expected_wastage_percent numeric(8, 2),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint retail_processing_boms_expected_yield_min_non_negative
    check (expected_yield_min_percent is null or expected_yield_min_percent >= 0),
  constraint retail_processing_boms_expected_yield_max_non_negative
    check (expected_yield_max_percent is null or expected_yield_max_percent >= 0),
  constraint retail_processing_boms_expected_wastage_non_negative
    check (expected_wastage_percent is null or expected_wastage_percent >= 0),
  constraint retail_processing_boms_raw_names_required
    check (coalesce(array_length(raw_material_item_names, 1), 0) > 0),
  constraint retail_processing_boms_finished_names_required
    check (coalesce(array_length(finished_product_item_names, 1), 0) > 0)
);

create unique index if not exists retail_processing_boms_outlet_name_unique
on public.retail_processing_boms(outlet_id, name) nulls not distinct;

create index if not exists idx_retail_processing_boms_outlet_active
on public.retail_processing_boms(outlet_id, is_active, name);

alter table public.retail_processing_batches
  add column if not exists processing_bom_id uuid references public.retail_processing_boms(id) on delete set null;

alter table public.retail_processing_boms enable row level security;

drop policy if exists "retail users can read processing boms" on public.retail_processing_boms;
create policy "retail users can read processing boms"
on public.retail_processing_boms for select to authenticated
using (
  public.can_view_retail()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
);

drop policy if exists "retail admins can insert processing boms" on public.retail_processing_boms;
create policy "retail admins can insert processing boms"
on public.retail_processing_boms for insert to authenticated
with check (
  public.is_admin_or_director()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
  and (created_by = auth.uid() or created_by is null)
  and (updated_by = auth.uid() or updated_by is null)
);

drop policy if exists "retail admins can update processing boms" on public.retail_processing_boms;
create policy "retail admins can update processing boms"
on public.retail_processing_boms for update to authenticated
using (
  public.is_admin_or_director()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
)
with check (
  public.is_admin_or_director()
  and (outlet_id is null or public.can_access_outlet(outlet_id))
  and (updated_by = auth.uid() or updated_by is null)
);
