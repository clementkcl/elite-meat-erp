-- Atomic stock approval RPCs for damage/spoilage and supplier return.
-- Safe to re-run in Supabase SQL Editor.

drop function if exists public.approve_stock_damage_request(uuid, text);
drop function if exists public.approve_stock_return_supplier_request(uuid, text);

create or replace function public.approve_stock_damage_request(
  p_request_id uuid,
  p_director_signature text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.stock_damage_requests%rowtype;
  unit_record public.stock_units%rowtype;
  v_movement_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before approving damage requests.';
  end if;

  if not public.can_director_approve_stock_take() then
    raise exception 'Only director or admin can approve damage requests.';
  end if;

  if nullif(trim(p_director_signature), '') is null then
    raise exception 'Director damage approval signature is required.';
  end if;

  select *
  into request_record
  from public.stock_damage_requests
  where id = p_request_id
  for update;

  if request_record.id is null then
    raise exception 'Damage request was not found or is outside your scope.';
  end if;

  if request_record.status <> 'MANAGER_REVIEWED' then
    raise exception 'Only manager-reviewed damage requests can be approved.';
  end if;

  if not public.can_access_stock_location(request_record.location_id) then
    raise exception 'Your role cannot approve damage for another stock location.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where id = request_record.stock_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if unit_record.barcode <> request_record.barcode then
    raise exception 'Barcode does not match the selected stock unit.';
  end if;

  if unit_record.status not in ('IN_STOCK', 'TRANSFERRED', 'RETURNED') then
    raise exception 'Barcode is % and cannot be used for this action.', unit_record.status;
  end if;

  if unit_record.location_id <> request_record.location_id then
    raise exception 'Barcode location changed after damage request review.';
  end if;

  update public.stock_units
  set
    status = 'DAMAGED',
    transfer_to_location_id = null
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
    'OUTBOUND_SPOILED',
    request_record.item_id,
    request_record.stock_unit_id,
    request_record.barcode,
    request_record.location_id,
    1,
    unit_record.net_weight_kg,
    request_record.request_no,
    'Damage/spoilage approved: ' || request_record.reason,
    'damage_spoilage',
    current_user_id
  )
  returning id into v_movement_id;

  update public.stock_damage_requests
  set
    status = 'DIRECTOR_APPROVED',
    director_approved_by = current_user_id,
    director_approved_at = now(),
    director_signature = trim(p_director_signature),
    movement_id = v_movement_id
  where id = request_record.id;

  insert into public.barcode_scan_logs (
    barcode,
    action,
    success,
    message,
    scanned_by
  )
  values (
    request_record.barcode,
    'OUTBOUND_SPOILED',
    true,
    'Damage request approved and stock deducted',
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
    'DAMAGE_REQUEST_DIRECTOR_APPROVED',
    'stock_damage_requests',
    request_record.id::text,
    jsonb_build_object(
      'movementId', v_movement_id,
      'atomic', true
    )
  );

  return v_movement_id;
end;
$$;

create or replace function public.approve_stock_return_supplier_request(
  p_request_id uuid,
  p_manager_signature text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.stock_return_supplier_requests%rowtype;
  unit_record public.stock_units%rowtype;
  v_movement_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before approving return supplier requests.';
  end if;

  if not public.can_manage_stock_take() then
    raise exception 'Only a manager or admin can approve return supplier requests.';
  end if;

  if nullif(trim(p_manager_signature), '') is null then
    raise exception 'Manager return supplier approval signature is required.';
  end if;

  select *
  into request_record
  from public.stock_return_supplier_requests
  where id = p_request_id
  for update;

  if request_record.id is null then
    raise exception 'Return supplier request was not found or is outside your scope.';
  end if;

  if request_record.status <> 'SUBMITTED' then
    raise exception 'Only submitted return supplier requests can be approved.';
  end if;

  if not public.can_access_stock_location(request_record.location_id) then
    raise exception 'Your role cannot approve return supplier for another stock location.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where id = request_record.stock_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if unit_record.barcode <> request_record.barcode then
    raise exception 'Barcode does not match the selected stock unit.';
  end if;

  if unit_record.status not in ('IN_STOCK', 'TRANSFERRED', 'RETURNED') then
    raise exception 'Barcode is % and cannot be used for this action.', unit_record.status;
  end if;

  if unit_record.location_id <> request_record.location_id then
    raise exception 'Barcode location changed after return supplier request.';
  end if;

  update public.stock_units
  set
    status = 'OUTBOUNDED',
    transfer_to_location_id = null
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
    'OUTBOUND_RETURN_SUPPLIER',
    request_record.item_id,
    request_record.stock_unit_id,
    request_record.barcode,
    request_record.location_id,
    1,
    unit_record.net_weight_kg,
    request_record.request_no,
    'Return supplier approved: ' || request_record.supplier_name,
    'return_supplier',
    current_user_id
  )
  returning id into v_movement_id;

  update public.stock_return_supplier_requests
  set
    status = 'MANAGER_REVIEWED',
    manager_reviewed_by = current_user_id,
    manager_reviewed_at = now(),
    manager_signature = trim(p_manager_signature),
    movement_id = v_movement_id
  where id = request_record.id;

  insert into public.barcode_scan_logs (
    barcode,
    action,
    success,
    message,
    scanned_by
  )
  values (
    request_record.barcode,
    'OUTBOUND_RETURN_SUPPLIER',
    true,
    'Return supplier approved and stock deducted',
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
    'RETURN_SUPPLIER_REQUEST_APPROVED',
    'stock_return_supplier_requests',
    request_record.id::text,
    jsonb_build_object(
      'movementId', v_movement_id,
      'atomic', true
    )
  );

  return v_movement_id;
end;
$$;

grant execute on function public.approve_stock_damage_request(uuid, text) to authenticated;
grant execute on function public.approve_stock_return_supplier_request(uuid, text) to authenticated;
