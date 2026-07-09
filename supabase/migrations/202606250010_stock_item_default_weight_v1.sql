alter table public.items
  add column if not exists default_weight_kg numeric(12, 3);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'items_default_weight_kg_nonnegative'
      and conrelid = 'public.items'::regclass
  ) then
    alter table public.items
      add constraint items_default_weight_kg_nonnegative
      check (default_weight_kg is null or default_weight_kg >= 0);
  end if;
end $$;

comment on column public.items.default_weight_kg is
  'Optional fixed-weight fallback in kg for barcode decoding and label workflows.';
