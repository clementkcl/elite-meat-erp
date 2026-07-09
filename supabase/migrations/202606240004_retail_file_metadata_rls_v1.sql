create table if not exists public.retail_files (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.outlets(id) on delete cascade,
  record_type text not null,
  record_id uuid not null,
  bucket text not null default 'erp-files',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists retail_files_outlet_record_idx
  on public.retail_files(outlet_id, record_type, record_id);

alter table public.retail_files enable row level security;

create or replace function public.retail_storage_object_record_type(object_name text)
returns text
language sql
stable
security definer
set search_path = public, storage
as $$
  select nullif(split_part(object_name, '/', 3), '');
$$;

create or replace function public.retail_storage_object_record_id(object_name text)
returns uuid
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when split_part(object_name, '/', 4) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then split_part(object_name, '/', 4)::uuid
    else null
  end;
$$;

create or replace function public.is_valid_retail_storage_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    object_name ~ '^retail/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[a-z0-9_-]+/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[^/]+$';
$$;

create or replace function public.can_read_erp_file_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when object_name not like 'retail/%' then true
    else (
      public.is_valid_retail_storage_path(object_name)
      and public.retail_storage_object_outlet_id(object_name) is not null
      and public.can_view_retail()
      and public.can_access_outlet(public.retail_storage_object_outlet_id(object_name))
      and public.can_access_outlet_module(public.retail_storage_object_outlet_id(object_name), 'retail')
      and (
        exists (
          select 1
          from public.retail_files file
          where file.bucket = 'erp-files'
            and file.storage_path = object_name
            and file.outlet_id = public.retail_storage_object_outlet_id(object_name)
            and file.record_type = public.retail_storage_object_record_type(object_name)
            and file.record_id = public.retail_storage_object_record_id(object_name)
        )
        or exists (
          select 1
          from public.files file
          where file.bucket_id = 'erp-files'
            and file.object_path = object_name
            and file.module = 'retail'
            and file.outlet_id = public.retail_storage_object_outlet_id(object_name)
        )
      )
    )
  end;
$$;

create or replace function public.can_insert_erp_file_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when object_name not like 'retail/%' then true
    else (
      public.is_valid_retail_storage_path(object_name)
      and public.retail_storage_object_outlet_id(object_name) is not null
      and public.can_view_retail()
      and public.can_access_outlet(public.retail_storage_object_outlet_id(object_name))
      and public.can_access_outlet_module(public.retail_storage_object_outlet_id(object_name), 'retail')
    )
  end;
$$;

drop policy if exists "retail users can read retail files" on public.retail_files;
create policy "retail users can read retail files"
on public.retail_files for select to authenticated
using (
  public.can_view_retail()
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
);

drop policy if exists "retail users can insert own outlet retail files" on public.retail_files;
create policy "retail users can insert own outlet retail files"
on public.retail_files for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and bucket = 'erp-files'
  and public.can_view_retail()
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and storage_path like ('retail/' || outlet_id::text || '/' || record_type || '/' || record_id::text || '/%')
  and public.can_insert_erp_file_object(storage_path)
);

drop policy if exists "retail users can update own outlet retail files" on public.retail_files;
create policy "retail users can update own outlet retail files"
on public.retail_files for update to authenticated
using (
  public.can_view_retail()
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
)
with check (
  uploaded_by = auth.uid()
  and bucket = 'erp-files'
  and public.can_view_retail()
  and public.can_access_outlet(outlet_id)
  and public.can_access_outlet_module(outlet_id, 'retail')
  and storage_path like ('retail/' || outlet_id::text || '/' || record_type || '/' || record_id::text || '/%')
  and public.can_insert_erp_file_object(storage_path)
);

drop policy if exists "retail directors can delete retail files" on public.retail_files;
create policy "retail directors can delete retail files"
on public.retail_files for delete to authenticated
using (public.is_admin_or_director());
