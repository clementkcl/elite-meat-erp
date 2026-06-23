-- Stock take exception handling for unknown and wrong-location barcodes.
-- Safe to re-run in Supabase SQL Editor.

alter table public.stock_take_lines
  add column if not exists exception_type text,
  add column if not exists exception_status text,
  add column if not exists exception_location_id uuid references public.stock_locations(id) on delete set null,
  add column if not exists source_stock_unit_id uuid references public.stock_units(id) on delete set null,
  add column if not exists resolved_stock_unit_id uuid references public.stock_units(id) on delete set null;

do $$
begin
  alter table public.stock_take_lines
    add constraint stock_take_lines_exception_type_check
    check (exception_type is null or exception_type in ('UNKNOWN_BARCODE', 'WRONG_LOCATION'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.stock_take_lines
    add constraint stock_take_lines_exception_status_check
    check (exception_status is null or exception_status in ('PENDING', 'RESOLVED'));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_stock_take_lines_exception
on public.stock_take_lines(session_id, exception_type, exception_status);

drop function if exists public.approve_stock_take_session(uuid, text);

create or replace function public.approve_stock_take_session(
  p_session_id uuid,
  p_director_signature text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  session_record public.stock_take_sessions%rowtype;
  line_record public.stock_take_lines%rowtype;
  expected_unit public.stock_units%rowtype;
  source_unit public.stock_units%rowtype;
  created_unit_id uuid;
  line_count integer := 0;
  missing_count integer := 0;
  adjustment_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Sign in before approving stock take.';
  end if;

  if not public.can_director_approve_stock_take() then
    raise exception 'Only director or admin can approve reviewed stock take.';
  end if;

  if nullif(trim(p_director_signature), '') is null then
    raise exception 'Director approval signature is required.';
  end if;

  select *
  into session_record
  from public.stock_take_sessions
  where id = p_session_id
  for update;

  if session_record.id is null then
    raise exception 'Stock take session was not found.';
  end if;

  if session_record.status <> 'REVIEWED' then
    raise exception 'Only reviewed stock take sessions can be approved.';
  end if;

  if session_record.item_id is null then
    raise exception 'Stock take session must have an item scope before approval.';
  end if;

  if not public.can_access_stock_location(session_record.location_id) then
    raise exception 'Your role cannot approve stock take for another stock location.';
  end if;

  select count(*)
  into line_count
  from public.stock_take_lines
  where session_id = p_session_id;

  if line_count = 0 then
    raise exception 'Scan at least one barcode before approving stock take.';
  end if;

  for line_record in
    select *
    from public.stock_take_lines
    where session_id = p_session_id
    for update
  loop
    if line_record.item_id <> session_record.item_id then
      raise exception 'Stock take line item does not match the session scope.';
    end if;

    if line_record.brand_id is distinct from session_record.brand_id then
      raise exception 'Stock take line brand does not match the session scope.';
    end if;

    if line_record.exception_type = 'UNKNOWN_BARCODE' then
      if line_record.exception_status = 'RESOLVED' then
        continue;
      end if;

      if nullif(trim(coalesce(line_record.barcode, '')), '') is null then
        raise exception 'Unknown barcode stock take exception is missing a barcode.';
      end if;

      if exists (
        select 1
        from public.stock_units existing_unit
        where existing_unit.barcode = line_record.barcode
      ) then
        raise exception 'Unknown stock take barcode already exists as a stock unit.';
      end if;

      insert into public.stock_units (
        barcode,
        item_id,
        brand_id,
        origin_id,
        location_id,
        status,
        net_weight_kg,
        batch_no,
        received_at
      )
      values (
        line_record.barcode,
        line_record.item_id,
        line_record.brand_id,
        line_record.origin_id,
        session_record.location_id,
        'IN_STOCK',
        greatest(line_record.actual_weight_kg, 0),
        'STOCK-TAKE-' || session_record.session_no,
        now()
      )
      returning id into created_unit_id;

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
        created_by
      )
      values (
        'STOCK_TAKE_ADJUSTMENT',
        line_record.item_id,
        created_unit_id,
        line_record.barcode,
        session_record.location_id,
        1,
        greatest(line_record.actual_weight_kg, 0),
        p_session_id::text,
        'Stock take unknown barcode created after approval',
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
        line_record.barcode,
        'STOCK_TAKE_ADJUSTMENT',
        true,
        'Stock take unknown barcode created after director approval',
        current_user_id
      );

      update public.stock_take_lines
      set
        exception_status = 'RESOLVED',
        resolved_stock_unit_id = created_unit_id,
        notes = coalesce(notes, '') || ' Resolved by director approval.'
      where id = line_record.id;

      adjustment_count := adjustment_count + 1;
      continue;
    end if;

    if line_record.exception_type = 'WRONG_LOCATION' then
      if line_record.exception_status = 'RESOLVED' then
        continue;
      end if;

      select *
      into source_unit
      from public.stock_units
      where id = line_record.source_stock_unit_id
         or (
           line_record.source_stock_unit_id is null
           and barcode = line_record.barcode
         )
      order by case when id = line_record.source_stock_unit_id then 0 else 1 end
      limit 1
      for update;

      if source_unit.id is null then
        raise exception 'Wrong-location stock take barcode no longer exists.';
      end if;

      if source_unit.item_id <> session_record.item_id then
        raise exception 'Wrong-location stock unit item does not match the session scope.';
      end if;

      if source_unit.brand_id is distinct from session_record.brand_id then
        raise exception 'Wrong-location stock unit brand does not match the session scope.';
      end if;

      update public.stock_units
      set
        location_id = session_record.location_id,
        status = 'IN_STOCK',
        transfer_to_location_id = null,
        updated_at = now()
      where id = source_unit.id;

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
        created_by
      )
      values (
        'STOCK_TAKE_ADJUSTMENT',
        source_unit.item_id,
        source_unit.id,
        source_unit.barcode,
        source_unit.location_id,
        session_record.location_id,
        1,
        source_unit.net_weight_kg,
        p_session_id::text,
        'Stock take wrong-location barcode moved after approval',
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
        source_unit.barcode,
        'STOCK_TAKE_ADJUSTMENT',
        true,
        'Stock take wrong-location barcode moved after director approval',
        current_user_id
      );

      update public.stock_take_lines
      set
        exception_status = 'RESOLVED',
        exception_location_id = source_unit.location_id,
        resolved_stock_unit_id = source_unit.id,
        notes = coalesce(notes, '') || ' Resolved by director approval.'
      where id = line_record.id;

      adjustment_count := adjustment_count + 1;
      continue;
    end if;

    if line_record.variance_count = 0 and line_record.variance_weight_kg = 0 then
      continue;
    end if;

    insert into public.stock_movements (
      movement_type,
      item_id,
      barcode,
      from_location_id,
      quantity,
      weight_kg,
      reference_no,
      notes,
      created_by
    )
    values (
      'STOCK_TAKE_ADJUSTMENT',
      line_record.item_id,
      line_record.barcode,
      session_record.location_id,
      line_record.variance_count,
      line_record.variance_weight_kg,
      p_session_id::text,
      'Approved stock take variance',
      current_user_id
    );

    adjustment_count := adjustment_count + 1;
  end loop;

  for expected_unit in
    select su.*
    from public.stock_units su
    where su.location_id = session_record.location_id
      and su.item_id = session_record.item_id
      and su.brand_id is not distinct from session_record.brand_id
      and su.status in ('IN_STOCK', 'TRANSFERRED', 'RETURNED')
      and not exists (
        select 1
        from public.stock_take_lines stl
        where stl.session_id = p_session_id
          and stl.barcode = su.barcode
      )
    for update
  loop
    insert into public.stock_take_lines (
      session_id,
      item_id,
      brand_id,
      origin_id,
      barcode,
      system_count,
      actual_count,
      system_weight_kg,
      actual_weight_kg,
      notes
    )
    values (
      p_session_id,
      expected_unit.item_id,
      expected_unit.brand_id,
      expected_unit.origin_id,
      expected_unit.barcode,
      1,
      0,
      expected_unit.net_weight_kg,
      0,
      'Auto-created at director approval for missing barcode'
    );

    update public.stock_units
    set
      status = 'ADJUSTED_OUT',
      transfer_to_location_id = null,
      updated_at = now()
    where id = expected_unit.id;

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
      created_by
    )
    values (
      'STOCK_TAKE_ADJUSTMENT',
      expected_unit.item_id,
      expected_unit.id,
      expected_unit.barcode,
      expected_unit.location_id,
      -1,
      -expected_unit.net_weight_kg,
      p_session_id::text,
      'Stock take missing barcode adjusted out',
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
      expected_unit.barcode,
      'STOCK_TAKE_ADJUSTMENT',
      true,
      'Stock take missing barcode adjusted out',
      current_user_id
    );

    missing_count := missing_count + 1;
    adjustment_count := adjustment_count + 1;
  end loop;

  update public.stock_take_sessions
  set
    status = 'APPROVED',
    approved_by = current_user_id,
    approved_at = now(),
    director_approved_by = current_user_id,
    director_approved_at = now(),
    director_signature = trim(p_director_signature)
  where id = session_record.id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'STOCK_TAKE_APPROVED',
    'stock_take_sessions',
    session_record.id::text,
    jsonb_build_object(
      'lineCount', line_count,
      'missingCount', missing_count,
      'adjustmentCount', adjustment_count,
      'barcodeVarianceComputed', true,
      'stockTakeExceptionsResolved', true,
      'atomic', true
    )
  );

  return adjustment_count;
end;
$$;

grant execute on function public.approve_stock_take_session(uuid, text) to authenticated;
