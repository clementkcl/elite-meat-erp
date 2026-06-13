-- Stock inbound current-session undo support.
-- Safe to re-run in Supabase SQL Editor.

alter type public.stock_unit_status add value if not exists 'VOIDED';
alter type public.stock_movement_type add value if not exists 'INBOUND_VOID';

drop function if exists public.void_inbound_stock_unit(uuid, text, text);

create or replace function public.void_inbound_stock_unit(
  p_stock_unit_id uuid,
  p_batch_no text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  unit_record public.stock_units%rowtype;
  inbound_movement public.stock_movements%rowtype;
  void_movement_id uuid;
  can_correct_after_session boolean;
begin
  if current_user_id is null then
    raise exception 'Sign in before undoing inbound stock.';
  end if;

  if not public.can_manage_stock() then
    raise exception 'Your role does not allow this stock action.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where id = p_stock_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'Inbound stock unit was not found.';
  end if;

  if not public.can_access_stock_location(unit_record.location_id) then
    raise exception 'Your role cannot undo inbound stock for another location.';
  end if;

  if unit_record.status not in ('IN_STOCK', 'INSPECTION', 'HOLD') then
    raise exception 'Only stock that has not moved onward can be undone from inbound.';
  end if;

  if coalesce(unit_record.batch_no, '') <> trim(coalesce(p_batch_no, '')) then
    raise exception 'This barcode is not part of the current inbound session.';
  end if;

  select *
  into inbound_movement
  from public.stock_movements
  where stock_unit_id = p_stock_unit_id
    and movement_type = 'INBOUND'
  order by created_at asc
  limit 1;

  if inbound_movement.id is null then
    raise exception 'Original inbound movement was not found.';
  end if;

  can_correct_after_session :=
    public.has_role('retail_manager')
    or public.has_role('delivery_manager')
    or public.has_role('processing_manager')
    or public.has_role('admin');

  if inbound_movement.created_by is distinct from current_user_id
    and not can_correct_after_session
  then
    raise exception 'Only the original scanner, manager, or admin can undo this inbound scan.';
  end if;

  update public.stock_units
  set
    status = 'VOIDED',
    updated_at = now()
  where id = p_stock_unit_id;

  insert into public.stock_movements (
    movement_type,
    item_id,
    stock_unit_id,
    barcode,
    from_location_id,
    quantity,
    weight_kg,
    reference_no,
    notes,
    source_type,
    created_by
  )
  values (
    'INBOUND_VOID',
    unit_record.item_id,
    unit_record.id,
    unit_record.barcode,
    unit_record.location_id,
    -1,
    -unit_record.net_weight_kg,
    nullif(unit_record.batch_no, ''),
    nullif(trim(coalesce(p_reason, 'Current inbound session undo')), ''),
    'manual_adjustment',
    current_user_id
  )
  returning id into void_movement_id;

  insert into public.barcode_scan_logs (
    barcode,
    action,
    success,
    message,
    scanned_by
  )
  values (
    unit_record.barcode,
    'INBOUND_VOID',
    true,
    'Inbound scan undone; stock unit voided.',
    current_user_id
  );

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'BARCODE_INBOUND_VOID',
    'stock_units',
    unit_record.id::text,
    jsonb_build_object(
      'barcode', unit_record.barcode,
      'stockUnitId', unit_record.id,
      'originalInboundMovementId', inbound_movement.id,
      'voidMovementId', void_movement_id,
      'batchNo', unit_record.batch_no,
      'previousStatus', unit_record.status,
      'newStatus', 'VOIDED',
      'reason', nullif(trim(coalesce(p_reason, 'Current inbound session undo')), ''),
      'atomic', true
    )
  );

  return unit_record.id;
end;
$$;

grant execute on function public.void_inbound_stock_unit(uuid, text, text) to authenticated;
