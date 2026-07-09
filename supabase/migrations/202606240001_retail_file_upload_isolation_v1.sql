alter table public.files
  add column if not exists outlet_id uuid references public.outlets(id) on delete set null;

create index if not exists files_module_outlet_idx
  on public.files(module, outlet_id);

create or replace function public.retail_storage_object_outlet_id(object_name text)
returns uuid
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when object_name ~ '^retail/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
      then split_part(object_name, '/', 2)::uuid
    else null
  end;
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
      public.retail_storage_object_outlet_id(object_name) is not null
      and public.can_view_retail()
      and public.can_access_outlet(public.retail_storage_object_outlet_id(object_name))
      and public.can_access_outlet_module(public.retail_storage_object_outlet_id(object_name), 'retail')
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
      public.retail_storage_object_outlet_id(object_name) is not null
      and public.can_view_retail()
      and public.can_access_outlet(public.retail_storage_object_outlet_id(object_name))
      and public.can_access_outlet_module(public.retail_storage_object_outlet_id(object_name), 'retail')
    )
  end;
$$;

drop policy if exists "authenticated can read files" on public.files;
create policy "authenticated can read files"
on public.files for select to authenticated using (
  coalesce(module, '') <> 'retail'
  or (
    outlet_id is not null
    and public.can_view_retail()
    and public.can_access_outlet(outlet_id)
    and public.can_access_outlet_module(outlet_id, 'retail')
  )
  or (
    outlet_id is null
    and object_path like 'retail/%'
    and public.can_read_erp_file_object(object_path)
  )
);

drop policy if exists "authenticated can insert files" on public.files;
create policy "authenticated can insert files"
on public.files for insert to authenticated with check (
  (
    coalesce(module, '') = 'retail'
    and owner_id = auth.uid()
    and outlet_id is not null
    and object_path like ('retail/' || outlet_id::text || '/%')
    and public.can_insert_erp_file_object(object_path)
  )
  or (
    coalesce(module, '') <> 'retail'
    and (owner_id = auth.uid() or public.can_manage_stock())
  )
);

drop policy if exists "file owners and stock admins can update files" on public.files;
create policy "file owners and stock admins can update files"
on public.files for update to authenticated
using (
  (
    coalesce(module, '') = 'retail'
    and owner_id = auth.uid()
    and outlet_id is not null
    and public.can_access_outlet(outlet_id)
  )
  or (
    coalesce(module, '') <> 'retail'
    and (owner_id = auth.uid() or public.can_administer_stock())
  )
)
with check (
  (
    coalesce(module, '') = 'retail'
    and owner_id = auth.uid()
    and outlet_id is not null
    and object_path like ('retail/' || outlet_id::text || '/%')
    and public.can_insert_erp_file_object(object_path)
  )
  or (
    coalesce(module, '') <> 'retail'
    and (owner_id = auth.uid() or public.can_administer_stock())
  )
);

drop policy if exists "authenticated can read erp files" on storage.objects;
create policy "authenticated can read erp files"
on storage.objects for select to authenticated using (
  bucket_id = 'erp-files'
  and public.can_read_erp_file_object(name)
);

drop policy if exists "authenticated can upload erp files" on storage.objects;
create policy "authenticated can upload erp files"
on storage.objects for insert to authenticated with check (
  bucket_id = 'erp-files'
  and public.can_insert_erp_file_object(name)
);
