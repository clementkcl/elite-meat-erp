-- Atomic stock take final approval.
-- Safe to re-run in Supabase SQL Editor.

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

  if not public.can_access_stock_location(session_record.location_id) then
    raise exception 'Your role cannot approve stock take for another stock location.';
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

    if line_record.variance_count = 0 and line_record.variance_weight_kg = 0 then
      continue;
    end if;

    insert into public.stock_movements (
      movement_type,
      item_id,
      quantity,
      weight_kg,
      reference_no,
      notes,
      created_by
    )
    values (
      'STOCK_TAKE_ADJUSTMENT',
      line_record.item_id,
      line_record.variance_count,
      line_record.variance_weight_kg,
      p_session_id::text,
      'Approved stock take variance',
      current_user_id
    );

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
      'adjustmentCount', adjustment_count,
      'atomic', true
    )
  );

  return adjustment_count;
end;
$$;

grant execute on function public.approve_stock_take_session(uuid, text) to authenticated;
