create or replace function public.return_stock_unit(
  p_barcode text,
  p_location_id uuid,
  p_return_condition text,
  p_reference_no text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  unit_record public.stock_units%rowtype;
  v_movement_id uuid;
  next_status public.stock_unit_status;
begin
  if current_user_id is null then
    raise exception 'Sign in before returning stock.';
  end if;

  if not public.can_manage_stock() then
    raise exception 'Your role does not allow this stock action.';
  end if;

  if nullif(trim(p_barcode), '') is null then
    raise exception 'Scan a barcode before returning stock.';
  end if;

  if p_location_id is null then
    raise exception 'Choose a return location before returning stock.';
  end if;

  if p_return_condition is null or p_return_condition not in ('GOOD', 'NEED_CHECK', 'SPOILED_DAMAGED') then
    raise exception 'Choose return condition.';
  end if;

  if not public.can_access_stock_location(p_location_id) then
    raise exception 'Your role cannot return stock for another location.';
  end if;

  if not exists (
    select 1
    from public.stock_locations
    where id = p_location_id
      and is_active
  ) then
    raise exception 'Return location was not found or is inactive.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where barcode = trim(p_barcode)
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if unit_record.status in ('TRANSFER_PENDING', 'ADJUSTED_OUT', 'DAMAGED') then
    raise exception 'Barcode is % and cannot be returned.', unit_record.status;
  end if;

  if unit_record.status = 'RETURNED' then
    raise exception 'Barcode is already returned.';
  end if;

  if unit_record.status in ('HOLD', 'INSPECTION') then
    raise exception 'Barcode is waiting for inspection release and cannot use normal stock return.';
  end if;

  if exists (
    select 1
    from public.stock_take_sessions session
    where session.location_id = p_location_id
      and session.item_id = unit_record.item_id
      and session.brand_id is not distinct from unit_record.brand_id
      and session.status in ('DRAFT', 'SUBMITTED', 'REVIEWED')
  ) then
    raise exception 'Cannot return stock. A stock take is open for this item and brand at this location.';
  end if;

  next_status := case p_return_condition
    when 'NEED_CHECK' then 'HOLD'::public.stock_unit_status
    when 'SPOILED_DAMAGED' then 'DAMAGED'::public.stock_unit_status
    else 'IN_STOCK'::public.stock_unit_status
  end;

  update public.stock_units
  set
    status = next_status,
    location_id = p_location_id,
    transfer_to_location_id = null
  where id = unit_record.id;

  insert into public.stock_movements (
    movement_type,
    item_id,
    stock_unit_id,
    barcode,
    from_location_id,
    to_location_id,
    quantity,
    weight_kg,
    reference_no,
    notes,
    source_type,
    created_by
  )
  values (
    'RETURN',
    unit_record.item_id,
    unit_record.id,
    unit_record.barcode,
    unit_record.location_id,
    p_location_id,
    1,
    unit_record.net_weight_kg,
    nullif(p_reference_no, ''),
    nullif(p_notes, ''),
    'return',
    current_user_id
  )
  returning id into v_movement_id;

  insert into public.barcode_scan_logs (
    barcode,
    action,
    success,
    message,
    scanned_by
  )
  values (
    unit_record.barcode,
    'RETURN',
    true,
    'Return scan accepted',
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
    'STOCK_RETURN',
    'stock_movements',
    v_movement_id::text,
    jsonb_build_object(
      'barcode', unit_record.barcode,
      'fromLocationId', unit_record.location_id,
      'toLocationId', p_location_id,
      'fromStatus', unit_record.status,
      'returnCondition', p_return_condition,
      'toStatus', next_status,
      'atomic', true
    )
  );

  return v_movement_id;
end;
$$;

grant execute on function public.return_stock_unit(text, uuid, text, text, text) to authenticated;
