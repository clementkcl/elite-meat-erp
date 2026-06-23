-- Stock outbound and transfer hardening.
-- Safe to re-run in Supabase SQL Editor.

alter type public.stock_movement_type add value if not exists 'OUTBOUND_SAMPLE_TESTING';
alter type public.stock_unit_status add value if not exists 'HOLD_RETURN_SUPPLIER';

alter table public.stock_locations
  add column if not exists outlet_id uuid references public.outlets(id) on delete set null;

alter table public.stock_locations
  add column if not exists is_default_for_outlet boolean not null default false;

update public.stock_locations location
set outlet_id = outlet.id
from public.outlets outlet
where location.outlet_id is null
  and upper(location.name) = upper(outlet.name);

create index if not exists idx_stock_locations_outlet
on public.stock_locations(outlet_id)
where outlet_id is not null;

update public.stock_locations location
set is_default_for_outlet = true
where location.outlet_id is not null
  and not exists (
    select 1
    from public.stock_locations existing_default
    where existing_default.outlet_id = location.outlet_id
      and existing_default.is_default_for_outlet
  )
  and location.id = (
    select candidate.id
    from public.stock_locations candidate
    where candidate.outlet_id = location.outlet_id
      and candidate.is_active
    order by
      case
        when upper(candidate.name) = (
          select upper(outlet.name)
          from public.outlets outlet
          where outlet.id = location.outlet_id
        ) then 0
        else 1
      end,
      candidate.name,
      candidate.id
    limit 1
  );

with duplicate_defaults as (
  select
    id,
    row_number() over (
      partition by outlet_id
      order by name, id
    ) as default_rank
  from public.stock_locations
  where outlet_id is not null
    and is_default_for_outlet
)
update public.stock_locations location
set is_default_for_outlet = false
from duplicate_defaults duplicate
where location.id = duplicate.id
  and duplicate.default_rank > 1;

create unique index if not exists idx_stock_locations_one_default_per_outlet
on public.stock_locations(outlet_id)
where outlet_id is not null
  and is_default_for_outlet;

create or replace function public.is_default_outlet_stock_location(
  target_location_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stock_locations location
    where location.id = target_location_id
      and location.is_active
      and (
        location.outlet_id is null
        or location.is_default_for_outlet
      )
  );
$$;

create or replace function public.enforce_default_transfer_destination()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('SOLD', 'OUTBOUNDED', 'TRANSFER_PENDING')
    and exists (
      select 1
      from public.stock_damage_requests request
      where request.stock_unit_id = new.id
        and request.status in ('SUBMITTED', 'MANAGER_REVIEWED')
    )
  then
    raise exception 'Barcode has an open damage request and cannot be outbounded.';
  end if;

  if new.status in ('SOLD', 'TRANSFER_PENDING')
    and exists (
      select 1
      from public.stock_return_supplier_requests request
      where request.stock_unit_id = new.id
        and request.status = 'SUBMITTED'
    )
  then
    raise exception 'Barcode has an open return supplier request and cannot be outbounded.';
  end if;

  if new.status = 'OUTBOUNDED'
    and old.status is distinct from 'HOLD_RETURN_SUPPLIER'
    and exists (
      select 1
      from public.stock_return_supplier_requests request
      where request.stock_unit_id = new.id
        and request.status = 'SUBMITTED'
    )
  then
    raise exception 'Barcode has an open return supplier request and cannot be outbounded.';
  end if;

  if new.status = 'TRANSFER_PENDING'
    and new.transfer_to_location_id is not null
    and not public.is_default_outlet_stock_location(new.transfer_to_location_id)
  then
    raise exception 'Transfer destination must be the destination outlet default stock location.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_default_transfer_destination_trigger on public.stock_units;
create trigger enforce_default_transfer_destination_trigger
  before insert or update of status, transfer_to_location_id on public.stock_units
  for each row execute function public.enforce_default_transfer_destination();

alter table public.stock_outbound_batches
  drop constraint if exists stock_outbound_batches_outbound_type_check;

alter table public.stock_outbound_batches
  add constraint stock_outbound_batches_outbound_type_check
  check (
    outbound_type in (
      'SALES',
      'TRANSFER',
      'PROCESSING',
      'SPOILED',
      'DAMAGE_SPOILAGE',
      'RETURN_SUPPLIER',
      'SAMPLE_TESTING'
    )
  );

alter table public.stock_outbound_batch_lines
  drop constraint if exists stock_outbound_batch_lines_outbound_type_check;

alter table public.stock_outbound_batch_lines
  add constraint stock_outbound_batch_lines_outbound_type_check
  check (
    outbound_type in (
      'SALES',
      'TRANSFER',
      'PROCESSING',
      'SPOILED',
      'DAMAGE_SPOILAGE',
      'RETURN_SUPPLIER',
      'SAMPLE_TESTING'
    )
  );

drop function if exists public.confirm_direct_outbound_batch(
  text,
  uuid,
  jsonb,
  text,
  text,
  text
);

create or replace function public.confirm_direct_outbound_batch(
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

  if nullif(trim(coalesce(p_notes, '')), '') is null then
    raise exception 'Direct outbound remarks are required.';
  end if;

  if p_outbound_type in ('DAMAGE_SPOILAGE', 'RETURN_SUPPLIER') then
    raise exception 'Use the request workflow for damage/spoilage or return supplier.';
  end if;

  if p_outbound_type not in ('SALES', 'TRANSFER', 'PROCESSING', 'SAMPLE_TESTING') then
    raise exception 'Unsupported direct outbound type.';
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

  if p_outbound_type = 'TRANSFER'
    and not public.is_default_outlet_stock_location(p_to_location_id)
  then
    raise exception 'Transfer destination must be the destination outlet default stock location.';
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
    else 'OUTBOUND_SAMPLE_TESTING'::public.stock_movement_type
  end;

  next_status := case p_outbound_type
    when 'SALES' then 'SOLD'::public.stock_unit_status
    when 'TRANSFER' then 'TRANSFER_PENDING'::public.stock_unit_status
    else 'OUTBOUNDED'::public.stock_unit_status
  end;

  movement_source_type := case p_outbound_type
    when 'SALES' then 'direct_sales'
    when 'TRANSFER' then 'transfer'
    when 'PROCESSING' then 'processing'
    else 'sample_testing'
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

    if exists (
      select 1
      from public.stock_damage_requests request
      where request.stock_unit_id = unit_record.id
        and request.status in ('SUBMITTED', 'MANAGER_REVIEWED')
    ) then
      raise exception 'Barcode has an open damage request and cannot be outbounded.';
    end if;

    if exists (
      select 1
      from public.stock_return_supplier_requests request
      where request.stock_unit_id = unit_record.id
        and request.status = 'SUBMITTED'
    ) then
      raise exception 'Barcode has an open return supplier request and cannot be outbounded.';
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

    if exists (
      select 1
      from public.stock_take_sessions session
      where session.location_id = unit_record.location_id
        and session.item_id = unit_record.item_id
        and session.brand_id is not distinct from unit_record.brand_id
        and session.status in ('DRAFT', 'SUBMITTED', 'REVIEWED')
    ) then
      raise exception 'Cannot confirm outbound. A stock take is open for this item and brand at this location.';
    end if;

    total_units := total_units + 1;
    total_weight_kg := total_weight_kg + unit_record.net_weight_kg;
  end loop;

  if from_location_id is null then
    raise exception 'Scan at least one barcode before confirming outbound.';
  end if;

  batch_no := coalesce(
    nullif(p_batch_no, ''),
    'DOUT-' || to_char(now(), 'YYYYMMDD') || '-' ||
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
    null,
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
      null,
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
      p_outbound_type || ' direct outbound accepted for ' || batch_no,
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
    'DIRECT_OUTBOUND_CONFIRMED',
    'stock_outbound_batches',
    batch_id::text,
    jsonb_build_object(
      'outboundType', p_outbound_type,
      'batchNo', batch_no,
      'totalUnits', total_units,
      'totalWeightKg', total_weight_kg,
      'directRemarksRequired', true,
      'atomic', true
    )
  );

  return batch_id;
end;
$$;

drop function if exists public.receive_stock_transfer(text, uuid, text, text);

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
  wrong_location_exception boolean := false;
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
  wrong_location_exception := expected_location_id is distinct from p_receive_location_id;

  if exists (
    select 1
    from public.stock_take_sessions session
    where session.location_id = p_receive_location_id
      and session.item_id = unit_record.item_id
      and session.brand_id is not distinct from unit_record.brand_id
      and session.status in ('DRAFT', 'SUBMITTED', 'REVIEWED')
  ) then
    raise exception 'Cannot receive transfer. A stock take is open for this item and brand at this location.';
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
    case
      when wrong_location_exception then
        concat(
          'WRONG_LOCATION_EXCEPTION expected=',
          coalesce(expected_location_id::text, 'none'),
          ' received=',
          p_receive_location_id::text,
          case when nullif(trim(coalesce(p_notes, '')), '') is null
            then ''
            else ' notes=' || trim(p_notes)
          end
        )
      else nullif(p_notes, '')
    end,
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
    case
      when wrong_location_exception then 'Transfer received with wrong-location exception'
      else 'Transfer receive scan accepted'
    end,
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
    case
      when wrong_location_exception then 'TRANSFER_RECEIVED_WRONG_LOCATION'
      else 'TRANSFER_RECEIVED'
    end,
    'stock_movements',
    v_movement_id::text,
    jsonb_build_object(
      'barcode', unit_record.barcode,
      'fromLocationId', unit_record.location_id,
      'expectedToLocationId', expected_location_id,
      'receivedLocationId', p_receive_location_id,
      'wrongLocationException', wrong_location_exception,
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

  if unit_record.status not in (
    'IN_STOCK',
    'TRANSFERRED',
    'RETURNED',
    'HOLD_RETURN_SUPPLIER'
  ) then
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
      'previousStatus', unit_record.status,
      'atomic', true
    )
  );

  return v_movement_id;
end;
$$;

drop function if exists public.hold_return_supplier_stock_unit(uuid, text);

create or replace function public.hold_return_supplier_stock_unit(
  p_stock_unit_id uuid,
  p_request_no text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  unit_record public.stock_units%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in before holding return-supplier stock.';
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
    raise exception 'Barcode was not found.';
  end if;

  if unit_record.status not in ('IN_STOCK', 'TRANSFERRED', 'RETURNED') then
    raise exception 'Barcode is % and cannot be placed on return-supplier hold.', unit_record.status;
  end if;

  if not public.can_access_stock_location(unit_record.location_id) then
    raise exception 'Your role cannot hold return-supplier stock for another location.';
  end if;

  update public.stock_units
  set
    status = 'HOLD_RETURN_SUPPLIER',
    transfer_to_location_id = null
  where id = unit_record.id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'RETURN_SUPPLIER_STOCK_HELD',
    'stock_units',
    unit_record.id::text,
    jsonb_build_object(
      'barcode', unit_record.barcode,
      'requestNo', p_request_no,
      'previousStatus', unit_record.status,
      'newStatus', 'HOLD_RETURN_SUPPLIER',
      'atomic', true
    )
  );

  return unit_record.id;
end;
$$;

drop function if exists public.release_return_supplier_stock_hold(uuid, uuid, text);

create or replace function public.release_return_supplier_stock_hold(
  p_stock_unit_id uuid,
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
  unit_record public.stock_units%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in before releasing return-supplier stock hold.';
  end if;

  if not public.can_manage_stock_take() then
    raise exception 'Only a manager or admin can release return-supplier stock hold.';
  end if;

  if nullif(trim(p_manager_signature), '') is null then
    raise exception 'Manager return supplier rejection signature is required.';
  end if;

  select *
  into unit_record
  from public.stock_units
  where id = p_stock_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'Barcode was not found.';
  end if;

  if not public.can_access_stock_location(unit_record.location_id) then
    raise exception 'Your role cannot release return-supplier stock for another location.';
  end if;

  if unit_record.status = 'HOLD_RETURN_SUPPLIER' then
    update public.stock_units
    set
      status = 'IN_STOCK',
      transfer_to_location_id = null
    where id = unit_record.id;
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'RETURN_SUPPLIER_STOCK_HOLD_RELEASED',
    'stock_units',
    unit_record.id::text,
    jsonb_build_object(
      'requestId', p_request_id,
      'barcode', unit_record.barcode,
      'previousStatus', unit_record.status,
      'newStatus', case
        when unit_record.status = 'HOLD_RETURN_SUPPLIER' then 'IN_STOCK'
        else unit_record.status::text
      end,
      'atomic', true
    )
  );

  return unit_record.id;
end;
$$;

grant execute on function public.confirm_direct_outbound_batch(
  text,
  uuid,
  jsonb,
  text,
  text,
  text
) to authenticated;
grant execute on function public.receive_stock_transfer(text, uuid, text, text) to authenticated;
grant execute on function public.approve_stock_return_supplier_request(uuid, text) to authenticated;
grant execute on function public.hold_return_supplier_stock_unit(uuid, text) to authenticated;
grant execute on function public.release_return_supplier_stock_hold(uuid, uuid, text) to authenticated;
