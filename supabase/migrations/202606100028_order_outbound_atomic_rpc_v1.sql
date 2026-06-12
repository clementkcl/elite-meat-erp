drop function if exists public.confirm_order_outbound_batch(
  uuid,
  text,
  uuid,
  jsonb,
  text,
  text
);

drop function if exists public.confirm_order_outbound_batch(
  uuid,
  text,
  uuid,
  jsonb,
  text,
  text,
  text
);

create or replace function public.confirm_order_outbound_batch(
  p_order_id uuid,
  p_outbound_type text,
  p_to_location_id uuid,
  p_lines jsonb,
  p_batch_no text,
  p_reference_no text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_id uuid;
  batch_no text;
  current_user_id uuid := auth.uid();
  from_location_id uuid;
  movement_type public.stock_movement_type;
  next_status public.stock_unit_status;
  movement_source_type text;
  order_status text;
  requested_line_count integer := 0;
  distinct_line_count integer := 0;
  total_units integer := 0;
  total_weight_kg numeric(12, 3) := 0;
  line_record jsonb;
  unit_record public.stock_units%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in before confirming outbound scans.';
  end if;

  if not public.can_manage_stock() then
    raise exception 'Your role does not allow this stock action.';
  end if;

  if not public.can_access_customer_order(p_order_id) then
    raise exception 'Customer order was not found or is outside your scope.';
  end if;

  select status::text
  into order_status
  from public.customer_orders
  where id = p_order_id;

  if order_status not in ('READY_FOR_PICKUP', 'READY_FOR_DELIVERY') then
    raise exception 'Customer order must be marked ready before confirming outbound scans.';
  end if;

  if p_outbound_type not in ('SALES', 'TRANSFER', 'PROCESSING', 'SPOILED') then
    raise exception 'Unsupported outbound type.';
  end if;

  if p_outbound_type = 'TRANSFER' and p_to_location_id is null then
    raise exception 'Choose a transfer destination before confirming transfer.';
  end if;

  if p_outbound_type <> 'TRANSFER' and p_to_location_id is not null then
    raise exception 'Destination location is only used for transfers.';
  end if;

  if p_outbound_type = 'TRANSFER'
    and not exists (
      select 1
      from public.stock_locations
      where id = p_to_location_id
        and is_active
    )
  then
    raise exception 'Transfer destination was not found or is inactive.';
  end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Scan at least one barcode before confirming outbound.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_lines)
    where nullif(value->>'stockUnitId', '') is null
      or nullif(value->>'barcode', '') is null
  ) then
    raise exception 'Every outbound scan line must include a stock unit and barcode.';
  end if;

  select
    count(*),
    count(distinct nullif(value->>'barcode', ''))
  into requested_line_count, distinct_line_count
  from jsonb_array_elements(p_lines);

  if requested_line_count <> distinct_line_count then
    raise exception 'Duplicate barcode in this outbound batch.';
  end if;

  movement_type := case p_outbound_type
    when 'SALES' then 'OUTBOUND_SALES'::public.stock_movement_type
    when 'TRANSFER' then 'OUTBOUND_TRANSFER'::public.stock_movement_type
    when 'PROCESSING' then 'OUTBOUND_PROCESSING'::public.stock_movement_type
    else 'OUTBOUND_SPOILED'::public.stock_movement_type
  end;

  next_status := case p_outbound_type
    when 'SALES' then 'SOLD'::public.stock_unit_status
    when 'TRANSFER' then 'TRANSFER_PENDING'::public.stock_unit_status
    when 'PROCESSING' then 'OUTBOUNDED'::public.stock_unit_status
    else 'DAMAGED'::public.stock_unit_status
  end;

  movement_source_type := case p_outbound_type
    when 'SALES' then 'sales'
    when 'TRANSFER' then 'transfer'
    when 'PROCESSING' then 'processing'
    else 'damage_spoilage'
  end;

  for line_record in
    select value from jsonb_array_elements(p_lines)
  loop
    select *
    into unit_record
    from public.stock_units
    where id = (line_record->>'stockUnitId')::uuid
    for update;

    if unit_record.id is null then
      raise exception 'Barcode was not found.';
    end if;

    if unit_record.barcode <> line_record->>'barcode' then
      raise exception 'Barcode does not match the selected stock unit.';
    end if;

    if unit_record.status not in ('IN_STOCK', 'TRANSFERRED', 'RETURNED') then
      raise exception 'Barcode is % and cannot be used for this action.', unit_record.status;
    end if;

    if not public.can_access_stock_location(unit_record.location_id) then
      raise exception 'Your role cannot outbound stock for another location.';
    end if;

    if from_location_id is null then
      from_location_id := unit_record.location_id;
    elsif from_location_id <> unit_record.location_id then
      raise exception 'All barcodes in one outbound batch must come from the same location.';
    end if;

    if p_outbound_type = 'TRANSFER' and p_to_location_id = unit_record.location_id then
      raise exception 'Transfer destination must be different from the current location.';
    end if;

    total_units := total_units + 1;
    total_weight_kg := total_weight_kg + unit_record.net_weight_kg;
  end loop;

  if from_location_id is null then
    raise exception 'Scan at least one barcode before confirming outbound.';
  end if;

  batch_no := coalesce(
    nullif(p_batch_no, ''),
    'OUT-' || to_char(now(), 'YYYYMMDD') || '-' ||
      (extract(epoch from clock_timestamp()) * 1000)::bigint::text || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );

  insert into public.stock_outbound_batches (
    batch_no,
    order_id,
    outbound_type,
    from_location_id,
    to_location_id,
    total_units,
    total_weight_kg,
    notes,
    created_by,
    confirmed_by
  )
  values (
    batch_no,
    p_order_id,
    p_outbound_type,
    from_location_id,
    case when p_outbound_type = 'TRANSFER' then p_to_location_id else null end,
    total_units,
    total_weight_kg,
    nullif(p_notes, ''),
    current_user_id,
    current_user_id
  )
  returning id into batch_id;

  for line_record in
    select value from jsonb_array_elements(p_lines)
  loop
    select *
    into unit_record
    from public.stock_units
    where id = (line_record->>'stockUnitId')::uuid
    for update;

    insert into public.stock_outbound_batch_lines (
      batch_id,
      order_id,
      stock_unit_id,
      barcode,
      item_id,
      from_location_id,
      to_location_id,
      weight_kg,
      outbound_type,
      created_by
    )
    values (
      batch_id,
      p_order_id,
      unit_record.id,
      unit_record.barcode,
      unit_record.item_id,
      unit_record.location_id,
      case when p_outbound_type = 'TRANSFER' then p_to_location_id else null end,
      unit_record.net_weight_kg,
      p_outbound_type,
      current_user_id
    );

    update public.stock_units
    set
      status = next_status,
      transfer_to_location_id = case
        when p_outbound_type = 'TRANSFER' then p_to_location_id
        else null
      end,
      sold_at = case
        when p_outbound_type = 'SALES' then now()
        else sold_at
      end
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
      movement_type,
      unit_record.item_id,
      unit_record.id,
      unit_record.barcode,
      unit_record.location_id,
      case when p_outbound_type = 'TRANSFER' then p_to_location_id else null end,
      1,
      unit_record.net_weight_kg,
      coalesce(nullif(p_reference_no, ''), batch_no),
      nullif(p_notes, ''),
      movement_source_type,
      current_user_id
    );

    insert into public.barcode_scan_logs (
      barcode,
      action,
      success,
      message,
      scanned_by
    )
    values (
      unit_record.barcode,
      movement_type,
      true,
      p_outbound_type || ' outbound accepted for ' || batch_no,
      current_user_id
    );
  end loop;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'ORDER_OUTBOUND_CONFIRMED',
    'stock_outbound_batches',
    batch_id::text,
    jsonb_build_object(
      'orderId', p_order_id,
      'outboundType', p_outbound_type,
      'batchNo', batch_no,
      'totalUnits', total_units,
      'totalWeightKg', total_weight_kg,
      'atomic', true
    )
  );

  return batch_id;
end;
$$;
