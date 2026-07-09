-- Admin/director helper to merge duplicate products without deleting data.
-- Safe to re-run in Supabase SQL Editor.

create or replace function public.merge_stock_item(
  p_source_item_id uuid,
  p_target_item_id uuid
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
  if p_source_item_id is null or p_target_item_id is null then
    raise exception 'Choose source and target products.';
  end if;

  if p_source_item_id = p_target_item_id then
    raise exception 'Choose two different products.';
  end if;

  if not public.can_administer_stock() then
    raise exception 'Your role cannot merge products.';
  end if;

  select name into source_name from public.items where id = p_source_item_id;
  select name into target_name from public.items where id = p_target_item_id;

  if source_name is null or target_name is null then
    raise exception 'Product was not found.';
  end if;

  update public.stock_units set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_movements set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  begin
    update public.no_barcode_stock set item_id = p_target_item_id where item_id = p_source_item_id;
    get diagnostics row_count = ROW_COUNT;
    changed_count := changed_count + row_count;
  exception when unique_violation then
    raise exception 'Cannot merge: target product already has matching no-barcode stock.';
  end;

  update public.no_barcode_movements set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_take_sessions set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_take_lines set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_damage_requests set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.stock_return_supplier_requests set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.customer_order_items set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.order_stock_reservations set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  begin
    update public.retail_price_rules set item_id = p_target_item_id where item_id = p_source_item_id;
    get diagnostics row_count = ROW_COUNT;
    changed_count := changed_count + row_count;
  exception when unique_violation then
    raise exception 'Cannot merge: target product already has matching retail price rules.';
  end;

  update public.retail_processing_boms set raw_item_id = p_target_item_id where raw_item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.retail_processing_boms set finished_item_id = p_target_item_id where finished_item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.retail_processing_batches set raw_item_id = p_target_item_id where raw_item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.retail_processing_batches set finished_item_id = p_target_item_id where finished_item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.retail_processing_raw_lines set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  update public.retail_processing_finished_lines set item_id = p_target_item_id where item_id = p_source_item_id;
  get diagnostics row_count = ROW_COUNT;
  changed_count := changed_count + row_count;

  begin
    update public.barcode_weight_rules set item_id = p_target_item_id where item_id = p_source_item_id;
    get diagnostics row_count = ROW_COUNT;
    changed_count := changed_count + row_count;
  exception when unique_violation then
    raise exception 'Cannot merge: target product already has matching barcode rules.';
  end;

  renamed_source_name := source_name || ' (MERGED ' || left(p_source_item_id::text, 8) || ')';

  update public.items
  set is_active = false,
      name = renamed_source_name,
      display_name = trim(coalesce(display_name, source_name) || ' (MERGED ' || left(p_source_item_id::text, 8) || ')'),
      updated_at = now()
  where id = p_source_item_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, changes)
  values (
    auth.uid(),
    'STOCK_ITEM_MERGED',
    'items',
    p_target_item_id::text,
    jsonb_build_object(
      'sourceItemId', p_source_item_id,
      'sourceName', source_name,
      'sourceRenamedTo', renamed_source_name,
      'targetItemId', p_target_item_id,
      'targetName', target_name,
      'changedRows', changed_count
    )
  );

  return jsonb_build_object(
    'sourceItemId', p_source_item_id,
    'targetItemId', p_target_item_id,
    'changedRows', changed_count
  );
exception when undefined_table or undefined_column then
  raise exception 'Cannot merge products until stock schema migrations are applied.';
end;
$$;

grant execute on function public.merge_stock_item(uuid, uuid) to authenticated;
