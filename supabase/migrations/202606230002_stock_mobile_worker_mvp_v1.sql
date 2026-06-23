-- Stock mobile worker MVP hardening.
-- Safe to re-run: policy updates are dropped/re-created and functions use CREATE OR REPLACE.

drop policy if exists "stock users can create scoped draft stock take sessions" on public.stock_take_sessions;
create policy "stock users can create scoped draft stock take sessions"
on public.stock_take_sessions for insert to authenticated
with check (
  public.can_manage_stock()
  and public.can_access_stock_location(location_id)
  and status = 'DRAFT'
);

create or replace function public.receive_stock_transfer(
  p_barcode text,
  p_receive_location_id uuid,
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
  expected_location_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before receiving transfer stock.';
  end if;

  if not public.can_manage_stock() then
    raise exception 'Your role does not allow this stock action.';
  end if;

  if nullif(trim(p_barcode), '') is null then
    raise exception 'Scan a barcode before receiving transfer stock.';
  end if;

  if p_receive_location_id is null then
    raise exception 'Choose a receiving location before receiving transfer stock.';
  end if;

  if not public.can_access_stock_location(p_receive_location_id) then
    raise exception 'Your role cannot receive transfer stock for another location.';
  end if;

  if not exists (
    select 1
    from public.stock_locations
    where id = p_receive_location_id
      and is_active
  ) then
    raise exception 'Receiving location was not found or is inactive.';
  end if;

  if not public.is_default_outlet_stock_location(p_receive_location_id) then
    raise exception 'Receiving location must be the receiving outlet default stock location.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where barcode = trim(p_barcode)
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if unit_record.status <> 'TRANSFER_PENDING' then
    raise exception 'Barcode is % and cannot be received.', unit_record.status;
  end if;

  expected_location_id := unit_record.transfer_to_location_id;

  if expected_location_id is distinct from p_receive_location_id then
    raise exception 'Wrong receiving location. Select the transfer destination before receiving.';
  end if;

  update public.stock_units
  set
    status = 'TRANSFERRED',
    location_id = p_receive_location_id,
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
    'TRANSFER_RECEIVED',
    unit_record.item_id,
    unit_record.id,
    unit_record.barcode,
    unit_record.location_id,
    p_receive_location_id,
    1,
    unit_record.net_weight_kg,
    nullif(p_reference_no, ''),
    nullif(p_notes, ''),
    'transfer',
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
    'TRANSFER_RECEIVED',
    true,
    'Transfer receive scan accepted',
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
    'TRANSFER_RECEIVED',
    'stock_movements',
    v_movement_id::text,
    jsonb_build_object(
      'barcode', unit_record.barcode,
      'fromLocationId', unit_record.location_id,
      'expectedToLocationId', expected_location_id,
      'receivedLocationId', p_receive_location_id,
      'wrongLocationException', false,
      'atomic', true
    )
  );

  return v_movement_id;
end;
$$;
