-- Store barcode-rule sample metadata for item-first inbound learning.
-- Safe to re-run in Supabase SQL Editor.

alter table public.barcode_weight_rules
  add column if not exists barcode_length integer,
  add column if not exists sample_barcode text;

drop function if exists public.inbound_stock_unit(
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer,
  integer
);

drop function if exists public.inbound_stock_unit(
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer,
  integer,
  integer,
  text
);

create or replace function public.inbound_stock_unit(
  p_barcode text,
  p_item_id uuid,
  p_brand_id uuid,
  p_origin_id uuid,
  p_location_id uuid,
  p_net_weight_kg numeric,
  p_inbound_source text,
  p_batch_no text,
  p_reference_no text,
  p_notes text,
  p_save_weight_rule boolean,
  p_barcode_weight_start integer,
  p_barcode_weight_length integer,
  p_barcode_weight_decimals integer,
  p_barcode_length integer,
  p_sample_barcode text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  v_stock_unit_id uuid;
  v_movement_id uuid;
  v_initial_status public.stock_unit_status;
  existing_rule_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before receiving inbound stock.';
  end if;

  if not public.can_manage_stock() then
    raise exception 'Your role does not allow this stock action.';
  end if;

  if nullif(trim(p_barcode), '') is null then
    raise exception 'Scan a barcode before receiving inbound stock.';
  end if;

  if p_net_weight_kg is null or p_net_weight_kg <= 0 then
    raise exception 'Inbound weight must be greater than zero.';
  end if;

  if not public.can_access_stock_location(p_location_id) then
    raise exception 'Your role cannot inbound stock for another location.';
  end if;

  if not exists (
    select 1
    from public.stock_locations
    where id = p_location_id
      and is_active
  ) then
    raise exception 'Inbound location was not found or is inactive.';
  end if;

  if not exists (
    select 1
    from public.items
    where id = p_item_id
      and is_active
  ) then
    raise exception 'Inactive products cannot receive new inbound stock.';
  end if;

  if exists (
    select 1
    from public.stock_units
    where barcode = trim(p_barcode)
  ) then
    raise exception 'Barcode already exists in stock.';
  end if;

  if exists (
    select 1
    from public.stock_take_sessions session
    where session.location_id = p_location_id
      and session.item_id = p_item_id
      and session.brand_id is not distinct from p_brand_id
      and session.status in ('DRAFT', 'SUBMITTED', 'REVIEWED')
  ) then
    raise exception 'Cannot receive inbound stock. A stock take is open for this item and brand at this location.';
  end if;

  v_initial_status := case
    when p_inbound_source = 'customer_return' then 'INSPECTION'::public.stock_unit_status
    else 'IN_STOCK'::public.stock_unit_status
  end;

  insert into public.stock_units (
    barcode,
    item_id,
    brand_id,
    origin_id,
    location_id,
    status,
    net_weight_kg,
    inbound_source,
    batch_no
  )
  values (
    trim(p_barcode),
    p_item_id,
    p_brand_id,
    p_origin_id,
    p_location_id,
    v_initial_status,
    p_net_weight_kg,
    p_inbound_source,
    nullif(p_batch_no, '')
  )
  returning id into v_stock_unit_id;

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
    'INBOUND',
    p_item_id,
    v_stock_unit_id,
    trim(p_barcode),
    p_location_id,
    1,
    p_net_weight_kg,
    nullif(p_reference_no, ''),
    nullif(p_notes, ''),
    p_inbound_source,
    current_user_id
  )
  returning id into v_movement_id;

  if coalesce(p_save_weight_rule, false) then
    if p_barcode_weight_start is null
      or p_barcode_weight_length is null
      or p_barcode_weight_decimals is null
      or p_barcode_weight_start < 1
      or p_barcode_weight_length < 1
      or p_barcode_weight_length > 12
      or p_barcode_weight_decimals < 0
      or p_barcode_weight_decimals > 4
    then
      raise exception 'Barcode weight rule settings are invalid.';
    end if;

    select id
    into existing_rule_id
    from public.barcode_weight_rules
    where item_id = p_item_id
      and brand_id is not distinct from p_brand_id
      and origin_id is not distinct from p_origin_id
      and location_id is null
    limit 1
    for update;

    if existing_rule_id is null then
      insert into public.barcode_weight_rules (
        item_id,
        brand_id,
        origin_id,
        location_id,
        barcode_weight_start,
        barcode_weight_length,
        barcode_weight_decimals,
        barcode_length,
        sample_barcode,
        created_by,
        updated_by
      )
      values (
        p_item_id,
        p_brand_id,
        p_origin_id,
        null,
        p_barcode_weight_start,
        p_barcode_weight_length,
        p_barcode_weight_decimals,
        nullif(p_barcode_length, 0),
        nullif(trim(coalesce(p_sample_barcode, p_barcode)), ''),
        current_user_id,
        current_user_id
      );
    else
      update public.barcode_weight_rules
      set
        barcode_weight_start = p_barcode_weight_start,
        barcode_weight_length = p_barcode_weight_length,
        barcode_weight_decimals = p_barcode_weight_decimals,
        barcode_length = nullif(p_barcode_length, 0),
        sample_barcode = nullif(trim(coalesce(p_sample_barcode, p_barcode)), ''),
        updated_by = current_user_id
      where id = existing_rule_id;
    end if;
  end if;

  insert into public.barcode_scan_logs (
    barcode,
    action,
    success,
    message,
    scanned_by
  )
  values (
    trim(p_barcode),
    'INBOUND',
    true,
    'Inbound accepted',
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
    'BARCODE_INBOUND',
    'stock_movements',
    v_movement_id::text,
    jsonb_build_object(
      'barcode', trim(p_barcode),
      'itemId', p_item_id,
      'brandId', p_brand_id,
      'originId', p_origin_id,
      'locationId', p_location_id,
      'initialStatus', v_initial_status,
      'savedWeightRule', coalesce(p_save_weight_rule, false),
      'barcodeLength', nullif(p_barcode_length, 0),
      'sampleBarcode', nullif(trim(coalesce(p_sample_barcode, p_barcode)), ''),
      'atomic', true
    )
  );

  return v_stock_unit_id;
end;
$$;

grant execute on function public.inbound_stock_unit(
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer,
  integer,
  integer,
  text
) to authenticated;
