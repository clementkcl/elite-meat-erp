-- Item master category + brand + product-name support.
-- Safe to re-run in Supabase SQL Editor.

alter table public.items
  add column if not exists default_brand_id uuid references public.brands(id) on delete set null;

drop index if exists public.idx_items_category_default_brand_section_name_unique;

alter table public.items
  drop constraint if exists items_category_section_name_key;

create unique index if not exists idx_items_category_default_brand_section_name_unique
on public.items(category, default_brand_id, section, name)
nulls not distinct;

create index if not exists idx_items_default_brand
on public.items(default_brand_id);
