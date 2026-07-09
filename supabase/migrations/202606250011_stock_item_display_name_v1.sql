-- Store item display name for manufacturer + product search/display.
-- Safe to re-run in Supabase SQL Editor.

alter table public.items
  add column if not exists display_name text;

update public.items item
set display_name = trim(
  concat_ws(
    ' ',
    nullif(brand.name, ''),
    case
      when nullif(trim(coalesce(item.name, '')), '') is null then null
      when nullif(trim(coalesce(item.section, '')), '') is null then trim(item.name)
      when upper(trim(item.section)) = 'GENERAL' then trim(item.name)
      when lower(trim(item.name)) like lower(trim(item.section)) || '%' then trim(item.name)
      else trim(item.section) || ' ' || trim(item.name)
    end
  )
)
from public.brands brand
where item.default_brand_id = brand.id
  and (
    item.display_name is null
    or trim(item.display_name) = ''
  );

update public.items item
set display_name = case
  when nullif(trim(coalesce(item.name, '')), '') is null then null
  when nullif(trim(coalesce(item.section, '')), '') is null then trim(item.name)
  when upper(trim(item.section)) = 'GENERAL' then trim(item.name)
  when lower(trim(item.name)) like lower(trim(item.section)) || '%' then trim(item.name)
  else trim(item.section) || ' ' || trim(item.name)
end
where item.default_brand_id is null
  and (
    item.display_name is null
    or trim(item.display_name) = ''
  );

create index if not exists idx_items_display_name
on public.items(display_name);

comment on column public.items.display_name is
  'Stored default display name, normally manufacturer + product name. Stock-unit displays still use the scanned unit manufacturer when different.';
