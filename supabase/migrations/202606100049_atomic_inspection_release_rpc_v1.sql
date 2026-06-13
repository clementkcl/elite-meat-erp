-- Atomic inspection-release RPC for customer-return barcode stock.
-- Safe to re-run in Supabase SQL Editor.

drop function if exists public.release_inspection_stock_unit(text, text);

create or replace function public.release_inspection_stock_unit(
  p_barcode text,
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
begin
  if current_user_id is null then
    raise exception 'Sign in before releasing inspection stock.';
  end if;

  if not public.can_manage_stock() then
    raise exception 'Your role does not allow this stock action.';
  end if;

  if nullif(trim(p_barcode), '') is null then
    raise exception 'Scan a barcode before releasing inspection stock.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where barcode = trim(p_barcode)
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if not public.can_access_stock_location(unit_record.location_id) then
    raise exception 'Your role cannot release inspection stock for another location.';
  end if;

  if unit_record.status not in ('HOLD', 'INSPECTION') then
    raise exception 'Barcode is % and is not waiting for inspection release.', unit_record.status;
  end if;

  if exists (
    select 1
    from public.stock_take_sessions session
    where session.location_id = unit_record.location_id
      and session.item_id = unit_record.item_id
      and session.brand_id is not distinct from unit_record.brand_id
      and session.status in ('DRAFT', 'SUBMITTED', 'REVIEWED')
  ) then
    raise exception 'Cannot release inspection stock. A stock take is open for this item and brand at this location.';
  end if;

  update public.stock_units
  set status = 'IN_STOCK'
  where id = unit_record.id;

  insert into public.stock_movements (
    movement_type,
    item_id,
    stock_unit_id,
    barcode,
    to_location_id,
    quantity,
    weight_kg,
    reference_no,
    notes,
    source_type,
    created_by
  )
  values (
    'MANUAL_ADJUSTMENT',
    unit_record.item_id,
    unit_record.id,
    unit_record.barcode,
    unit_record.location_id,
    0,
    0,
    'INSPECTION_RELEASE',
    coalesce(nullif(p_notes, ''), 'Customer return released from inspection'),
    'customer_return',
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
    'MANUAL_ADJUSTMENT',
    true,
    'Inspection release accepted',
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
    'STOCK_INSPECTION_RELEASED',
    'stock_movements',
    v_movement_id::text,
    jsonb_build_object(
      'barcode', unit_record.barcode,
      'locationId', unit_record.location_id,
      'fromStatus', unit_record.status,
      'toStatus', 'IN_STOCK',
      'atomic', true
    )
  );

  return v_movement_id;
end;
$$;

grant execute on function public.release_inspection_stock_unit(text, text) to authenticated;
