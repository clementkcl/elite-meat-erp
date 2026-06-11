alter table public.stock_units
  add column if not exists inbound_source text not null default 'supplier_import'
  check (inbound_source in ('supplier_import', 'processing_output', 'return', 'transfer'));

alter table public.stock_movements
  add column if not exists source_type text
  check (
    source_type is null
    or source_type in (
      'supplier_import',
      'processing_output',
      'return',
      'transfer',
      'sales',
      'processing',
      'damage_spoilage',
      'return_supplier'
    )
  );

create table if not exists public.barcode_weight_rules (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  origin_id uuid references public.origins(id) on delete set null,
  location_id uuid not null references public.stock_locations(id) on delete cascade,
  barcode_weight_start integer not null check (barcode_weight_start >= 1),
  barcode_weight_length integer not null check (barcode_weight_length between 1 and 12),
  barcode_weight_decimals integer not null default 2 check (barcode_weight_decimals between 0 and 4),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (item_id, brand_id, origin_id, location_id)
);

create index if not exists idx_barcode_weight_rules_scope
on public.barcode_weight_rules(item_id, brand_id, origin_id, location_id);

drop trigger if exists set_barcode_weight_rules_updated_at on public.barcode_weight_rules;
create trigger set_barcode_weight_rules_updated_at
  before update on public.barcode_weight_rules
  for each row execute function public.set_updated_at();

alter table public.barcode_weight_rules enable row level security;

drop policy if exists "stock users can read scoped barcode weight rules" on public.barcode_weight_rules;
create policy "stock users can read scoped barcode weight rules"
on public.barcode_weight_rules for select to authenticated
using (public.can_access_stock_location(location_id));

drop policy if exists "stock users can insert scoped barcode weight rules" on public.barcode_weight_rules;
create policy "stock users can insert scoped barcode weight rules"
on public.barcode_weight_rules for insert to authenticated
with check (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "stock users can update scoped barcode weight rules" on public.barcode_weight_rules;
create policy "stock users can update scoped barcode weight rules"
on public.barcode_weight_rules for update to authenticated
using (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
)
with check (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and (updated_by = auth.uid() or updated_by is null)
);

drop policy if exists "stock admins can delete barcode weight rules" on public.barcode_weight_rules;
create policy "stock admins can delete barcode weight rules"
on public.barcode_weight_rules for delete to authenticated
using (public.can_administer_stock());
