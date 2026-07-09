-- Atomic whole-session inbound undo.
-- Safe to re-run in Supabase SQL Editor after the stock inbound undo migration.

create or replace function public.void_inbound_stock_session(
  p_batch_no text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_batch_no text := trim(coalesce(p_batch_no, ''));
  can_correct_after_session boolean;
  active_unit_count integer := 0;
  invalid_status_count integer := 0;
  inaccessible_count integer := 0;
  missing_inbound_count integer := 0;
  not_allowed_count integer := 0;
  voided_count integer := 0;
  voided_weight_kg numeric(12, 3) := 0;
  unit_record public.stock_units%rowtype;
  inbound_movement public.stock_movements%rowtype;
  void_movement_id uuid;
  reason_text text := nullif(trim(coalesce(p_reason, 'Whole inbound session undo')), '');
begin
  if current_user_id is null then
    raise exception 'Sign in before undoing inbound stock.';
  end if;

  if normalized_batch_no = '' then
    raise exception 'Inbound session code is required.';
  end if;

  if not public.can_manage_stock() then
    raise exception 'Your role does not allow this stock action.';
  end if;

  can_correct_after_session :=
    public.has_role('retail_manager')
    or public.has_role('delivery_manager')
    or public.has_role('processing_manager')
    or public.has_role('admin');

  select count(*)
  into active_unit_count
  from public.stock_units
  where coalesce(batch_no, '') = normalized_batch_no
    and status <> 'VOIDED'::public.stock_unit_status;

  if active_unit_count = 0 then
    return jsonb_build_object(
      'voidedCount', 0,
      'voidedWeightKg', 0,
      'batchNo', normalized_batch_no
    );
  end if;

  select count(*)
  into inaccessible_count
  from public.stock_units
  where coalesce(batch_no, '') = normalized_batch_no
    and status <> 'VOIDED'::public.stock_unit_status
    and not public.can_access_stock_location(location_id);

  if inaccessible_count > 0 then
    raise exception 'Your role cannot undo inbound stock for another location.';
  end if;

  select count(*)
  into invalid_status_count
  from public.stock_units
  where coalesce(batch_no, '') = normalized_batch_no
    and status <> 'VOIDED'::public.stock_unit_status
    and status not in (
      'IN_STOCK'::public.stock_unit_status,
      'INSPECTION'::public.stock_unit_status,
      'HOLD'::public.stock_unit_status
    );

  if invalid_status_count > 0 then
    raise exception 'Only stock that has not moved onward can be undone from inbound.';
  end if;

  select count(*)
  into missing_inbound_count
  from public.stock_units unit
  where coalesce(unit.batch_no, '') = normalized_batch_no
    and unit.status <> 'VOIDED'::public.stock_unit_status
    and not exists (
      select 1
      from public.stock_movements movement
      where movement.stock_unit_id = unit.id
        and movement.movement_type = 'INBOUND'::public.stock_movement_type
    );

  if missing_inbound_count > 0 then
    raise exception 'Original inbound movement was not found for every barcode.';
  end if;

  if not can_correct_after_session then
    select count(*)
    into not_allowed_count
    from public.stock_units unit
    where coalesce(unit.batch_no, '') = normalized_batch_no
      and unit.status <> 'VOIDED'::public.stock_unit_status
      and exists (
        select 1
        from public.stock_movements movement
        where movement.stock_unit_id = unit.id
          and movement.movement_type = 'INBOUND'::public.stock_movement_type
          and movement.created_by is distinct from current_user_id
      );

    if not_allowed_count > 0 then
      raise exception 'Only the original scanner, manager, or admin can undo this inbound session.';
    end if;
  end if;

  for unit_record in
    select *
    from public.stock_units
    where coalesce(batch_no, '') = normalized_batch_no
      and status <> 'VOIDED'::public.stock_unit_status
    order by created_at asc, id asc
    for update
  loop
    select *
    into inbound_movement
    from public.stock_movements
    where stock_unit_id = unit_record.id
      and movement_type = 'INBOUND'::public.stock_movement_type
    order by created_at asc
    limit 1;

    update public.stock_units
    set
      status = 'VOIDED'::public.stock_unit_status,
      updated_at = now()
    where id = unit_record.id;

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
      'INBOUND_VOID'::public.stock_movement_type,
      unit_record.item_id,
      unit_record.id,
      unit_record.barcode,
      unit_record.location_id,
      -1,
      -unit_record.net_weight_kg,
      normalized_batch_no,
      reason_text,
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
      'INBOUND_VOID'::public.stock_movement_type,
      true,
      'Inbound session undo; stock unit voided.',
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
      'BARCODE_INBOUND_SESSION_VOID',
      'stock_units',
      unit_record.id::text,
      jsonb_build_object(
        'barcode', unit_record.barcode,
        'stockUnitId', unit_record.id,
        'originalInboundMovementId', inbound_movement.id,
        'voidMovementId', void_movement_id,
        'batchNo', normalized_batch_no,
        'previousStatus', unit_record.status,
        'newStatus', 'VOIDED',
        'reason', reason_text,
        'atomicSessionUndo', true
      )
    );

    voided_count := voided_count + 1;
    voided_weight_kg := voided_weight_kg + unit_record.net_weight_kg;
  end loop;

  return jsonb_build_object(
    'voidedCount', voided_count,
    'voidedWeightKg', voided_weight_kg,
    'batchNo', normalized_batch_no
  );
end;
$$;

grant execute on function public.void_inbound_stock_session(text, text) to authenticated;
