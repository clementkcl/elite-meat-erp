-- Stock inbound/label workflow hardening.
-- Safe to re-run in Supabase SQL Editor.

alter table public.items
  add column if not exists chinese_name text,
  add column if not exists iban_name text,
  add column if not exists default_low_stock_level numeric(12,3) not null default 0
    check (default_low_stock_level >= 0);

with max_numeric_code as (
  select coalesce(max(item_code::integer), 0) as base_code
  from public.items
  where item_code ~ '^[0-9]+$'
),
non_numeric_items as (
  select
    id,
    row_number() over (order by created_at, id) as row_no
  from public.items
  where item_code !~ '^[0-9]+$'
)
update public.items item
set item_code = lpad((max_numeric_code.base_code + non_numeric_items.row_no)::text, 4, '0')
from max_numeric_code, non_numeric_items
where item.id = non_numeric_items.id;

alter table public.items
  drop constraint if exists items_item_code_numeric_only_check;

alter table public.items
  add constraint items_item_code_numeric_only_check
  check (item_code ~ '^[0-9]+$');

alter table public.stock_units
  drop constraint if exists stock_units_inbound_source_check;

alter table public.stock_units
  add constraint stock_units_inbound_source_check
  check (
    inbound_source in (
      'supplier_import',
      'processing_output',
      'customer_return',
      'transfer_received',
      'manual_adjustment',
      'other',
      'return',
      'transfer'
    )
  );

alter table public.stock_movements
  drop constraint if exists stock_movements_source_type_check;

alter table public.stock_movements
  add constraint stock_movements_source_type_check
  check (
    source_type is null
    or source_type in (
      'supplier_import',
      'processing_output',
      'customer_return',
      'transfer_received',
      'manual_adjustment',
      'other',
      'return',
      'transfer',
      'sales',
      'processing',
      'damage_spoilage',
      'return_supplier'
    )
  );

alter table public.barcode_weight_rules
  alter column location_id drop not null;

create index if not exists idx_barcode_weight_rules_item_brand_origin
on public.barcode_weight_rules(item_id, brand_id, origin_id);

drop policy if exists "stock users can read scoped barcode weight rules" on public.barcode_weight_rules;
create policy "stock users can read scoped barcode weight rules"
on public.barcode_weight_rules for select to authenticated
using (
  (location_id is null and public.can_manage_stock())
  or public.can_access_stock_location(location_id)
);

drop policy if exists "stock users can insert scoped barcode weight rules" on public.barcode_weight_rules;
create policy "stock users can insert scoped barcode weight rules"
on public.barcode_weight_rules for insert to authenticated
with check (
  public.can_manage_stock()
  and (location_id is null or public.can_access_stock_location(location_id))
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "stock users can update scoped barcode weight rules" on public.barcode_weight_rules;
create policy "stock users can update scoped barcode weight rules"
on public.barcode_weight_rules for update to authenticated
using (
  public.can_manage_stock()
  and (location_id is null or public.can_access_stock_location(location_id))
)
with check (
  public.can_manage_stock()
  and (location_id is null or public.can_access_stock_location(location_id))
  and (updated_by = auth.uid() or updated_by is null)
);

drop policy if exists "stock admins can delete barcode weight rules" on public.barcode_weight_rules;
create policy "stock admins can delete barcode weight rules"
on public.barcode_weight_rules for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "stock admins can insert brands" on public.brands;
create policy "stock admins can insert brands"
on public.brands for insert to authenticated
with check (public.can_manage_stock());

drop policy if exists "stock admins can update brands" on public.brands;
create policy "stock admins can update brands"
on public.brands for update to authenticated
using (public.can_manage_stock())
with check (public.can_manage_stock());

drop policy if exists "stock admins can delete brands" on public.brands;
create policy "stock admins can delete brands"
on public.brands for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "stock admins can insert origins" on public.origins;
create policy "stock admins can insert origins"
on public.origins for insert to authenticated
with check (public.can_manage_stock());

drop policy if exists "stock admins can update origins" on public.origins;
create policy "stock admins can update origins"
on public.origins for update to authenticated
using (public.can_manage_stock())
with check (public.can_manage_stock());

drop policy if exists "stock admins can delete origins" on public.origins;
create policy "stock admins can delete origins"
on public.origins for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "stock admins can insert items" on public.items;
create policy "stock admins can insert items"
on public.items for insert to authenticated
with check (public.can_manage_stock() or public.has_role('director'));

drop policy if exists "stock admins can update items" on public.items;
create policy "stock admins can update items"
on public.items for update to authenticated
using (public.can_manage_stock() or public.has_role('director'))
with check (public.can_manage_stock() or public.has_role('director'));

drop policy if exists "stock admins can delete items" on public.items;
create policy "stock admins can delete items"
on public.items for delete to authenticated
using (public.can_administer_stock());
