-- Admin/director helper to merge duplicate manufacturers without deleting data.
-- Safe to re-run in Supabase SQL Editor.

create or replace function public.merge_stock_manufacturer(
  p_source_brand_id uuid,
  p_target_brand_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_name text;
  target_name text;
  changed_count integer := 0;
  row_count integer := 0;
  renamed_source_name text;
begin
  if p_source_brand_id is null or p_target_brand_id is null then
    raise exception 'Choose source and target manufacturer.';
  end if;

  if p_source_brand_id = p_target_brand_id then
    raise exception 'Choose two different manufacturers.';
  end if;

  if not public.can_administer_stock() then
    raise exception 'Your role cannot merge manufacturers.';
  end if;

  select name into source_name from public.brands where id = p_source_brand_id;
  select name into target_name from public.brands where id = p_target_brand_id;

  if source_name is null or target_name is null then
    raise exception 'Manufacturer was not found.';
  end if;

  update public.items item
  set default_brand_id = p_target_brand_id,
      display_name = trim(concat_ws(' ', target_name, item.name)),
      updated_at = now()
  where item.default_brand_id = p_source_brand_id
    and not exists (
      select 1
      from public.items existing
      where existing.id <> item.id
        and existing.category = item.category
        and existing.default_brand_id = p_target_brand_id
        and upper(trim(coalesce(existing.section, ''))) = upper(trim(coalesce(item.section, '')))
        and upper(trim(coalesce(existing.name, ''))) = upper(trim(coalesce(item.name, '')))
    );
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_units set brand_id = p_target_brand_id where brand_id = p_source_brand_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_movements set brand_id = p_target_brand_id where brand_id = p_source_brand_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.no_barcode_stock set brand_id = p_target_brand_id where brand_id = p_source_brand_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.no_barcode_movements set brand_id = p_target_brand_id where brand_id = p_source_brand_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_take_sessions set brand_id = p_target_brand_id where brand_id = p_source_brand_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_take_lines set brand_id = p_target_brand_id where brand_id = p_source_brand_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_damage_requests set brand_id = p_target_brand_id where brand_id = p_source_brand_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_return_supplier_requests set brand_id = p_target_brand_id where brand_id = p_source_brand_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  begin
    update public.barcode_weight_rules set brand_id = p_target_brand_id where brand_id = p_source_brand_id;
    get diagnostics row_count = ROW_COUNT;
    changed_count := changed_count + row_count;
  exception when unique_violation then
    raise exception 'Cannot merge: target manufacturer already has matching barcode rules.';
  end;

  renamed_source_name := source_name || ' (MERGED ' || left(p_source_brand_id::text, 8) || ')';

  update public.brands
  set is_active = false,
      name = renamed_source_name,
      updated_at = now()
  where id = p_source_brand_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, changes)
  values (
    auth.uid(),
    'STOCK_MANUFACTURER_MERGED',
    'brands',
    p_target_brand_id::text,
    jsonb_build_object(
      'sourceBrandId', p_source_brand_id,
      'sourceName', source_name,
      'sourceRenamedTo', renamed_source_name,
      'targetBrandId', p_target_brand_id,
      'targetName', target_name,
      'changedRows', changed_count
    )
  );

  return jsonb_build_object(
    'sourceBrandId', p_source_brand_id,
    'targetBrandId', p_target_brand_id,
    'changedRows', changed_count
  );
exception when undefined_table or undefined_column then
  raise exception 'Cannot merge manufacturers until stock schema migrations are applied.';
end;
$$;

grant execute on function public.merge_stock_manufacturer(uuid, uuid) to authenticated;
