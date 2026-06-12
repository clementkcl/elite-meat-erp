alter table public.customer_orders
  add column if not exists failed_return_status text not null default 'NOT_REQUIRED'
    check (failed_return_status in ('NOT_REQUIRED', 'NO_STOCK_LINK', 'PENDING_RETURN', 'RETURNED')),
  add column if not exists failed_return_required_units integer not null default 0
    check (failed_return_required_units >= 0),
  add column if not exists failed_return_completed_units integer not null default 0
    check (failed_return_completed_units >= 0),
  add column if not exists failed_return_logged_at timestamptz;

alter table public.delivery_orders
  add column if not exists failed_return_status text not null default 'NOT_REQUIRED'
    check (failed_return_status in ('NOT_REQUIRED', 'NO_STOCK_LINK', 'PENDING_RETURN', 'RETURNED')),
  add column if not exists failed_return_required_units integer not null default 0
    check (failed_return_required_units >= 0),
  add column if not exists failed_return_completed_units integer not null default 0
    check (failed_return_completed_units >= 0),
  add column if not exists failed_return_logged_at timestamptz;

comment on column public.customer_orders.failed_return_status is
  'Failed delivery stock-return status derived from order outbound barcode lines.';

comment on column public.delivery_orders.failed_return_status is
  'Failed standalone delivery return status. Standalone deliveries have no order-stock linkage in MVP.';

drop function if exists public.fail_customer_order_delivery_with_proof(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  text
);

create or replace function public.fail_customer_order_delivery_with_proof(
  p_order_id uuid,
  p_file_id uuid,
  p_contact_name text,
  p_latitude numeric,
  p_longitude numeric,
  p_notes text default null
)
returns table (
  outbound_units integer,
  returned_units integer,
  return_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_order public.customer_orders%rowtype;
  line_record record;
  movement_exists boolean;
begin
  if current_user_id is null then
    raise exception 'Sign in before failing a delivery.';
  end if;

  select *
  into target_order
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Customer order was not found.';
  end if;

  if not target_order.delivery_required then
    raise exception 'Only delivery-required customer orders can be failed from delivery.';
  end if;

  if target_order.status::text not in ('OUT_FOR_DELIVERY', 'FAILED') then
    raise exception 'Failed delivery proof can only be uploaded after the order is out for delivery.';
  end if;

  if not (
    public.can_operate_customer_order_delivery()
    and public.can_access_work_scope(target_order.outlet_id, target_order.department_id)
    and public.can_access_outlet_module(target_order.outlet_id, 'delivery')
  ) then
    raise exception 'You cannot fail this customer-order delivery.';
  end if;

  select count(distinct line.stock_unit_id)
  into outbound_units
  from public.stock_outbound_batch_lines line
  where line.order_id = p_order_id
    and line.outbound_type = 'SALES';

  returned_units := 0;

  for line_record in
    select
      line.stock_unit_id,
      line.item_id,
      line.barcode,
      line.from_location_id,
      line.weight_kg,
      unit.status
    from public.stock_outbound_batch_lines line
    join public.stock_units unit on unit.id = line.stock_unit_id
    where line.order_id = p_order_id
      and line.outbound_type = 'SALES'
    for update of unit
  loop
    select exists (
      select 1
      from public.stock_movements movement
      where movement.stock_unit_id = line_record.stock_unit_id
        and movement.movement_type = 'RETURN'
        and movement.reference_no = p_order_id::text
        and movement.source_type = 'return'
    )
    into movement_exists;

    if movement_exists then
      returned_units := returned_units + 1;
      continue;
    end if;

    if line_record.status::text not in ('SOLD', 'OUTBOUNDED', 'RETURNED', 'IN_STOCK') then
      raise exception 'Barcode % is % and cannot be returned from failed delivery.',
        line_record.barcode,
        line_record.status;
    end if;

    update public.stock_units
    set
      status = 'IN_STOCK',
      location_id = line_record.from_location_id,
      transfer_to_location_id = null,
      sold_at = null
    where id = line_record.stock_unit_id;

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
      'RETURN',
      line_record.item_id,
      line_record.stock_unit_id,
      line_record.barcode,
      line_record.from_location_id,
      1,
      line_record.weight_kg,
      p_order_id::text,
      coalesce(nullif(p_notes, ''), 'Failed delivery return'),
      'return',
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
      'RETURN',
      true,
      'Failed delivery return accepted for customer order ' || target_order.order_no,
      current_user_id
    );

    returned_units := returned_units + 1;
  end loop;

  return_status := case
    when outbound_units = 0 then 'NO_STOCK_LINK'
    when returned_units >= outbound_units then 'RETURNED'
    else 'PENDING_RETURN'
  end;

  update public.customer_orders
  set
    proof_file_id = p_file_id,
    proof_receiver_name = nullif(trim(p_contact_name), ''),
    proof_latitude = p_latitude,
    proof_longitude = p_longitude,
    proof_uploaded_at = now(),
    status = 'FAILED',
    remarks = coalesce(nullif(p_notes, ''), remarks),
    failed_return_status = return_status,
    failed_return_required_units = outbound_units,
    failed_return_completed_units = returned_units,
    failed_return_logged_at = now(),
    updated_by = current_user_id
  where id = p_order_id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    current_user_id,
    'CUSTOMER_ORDER_FAILED_DELIVERY_RETURNED',
    'customer_orders',
    p_order_id::text,
    jsonb_build_object(
      'orderNo', target_order.order_no,
      'outboundUnits', outbound_units,
      'returnedUnits', returned_units,
      'returnStatus', return_status,
      'partialDeliveryAllowed', false
    )
  );

  return next;
end;
$$;

grant execute on function public.fail_customer_order_delivery_with_proof(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  text
) to authenticated;
