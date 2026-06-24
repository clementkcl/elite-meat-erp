-- Delivery V1 staging QA hotfix:
-- Qualify the delivery insert RETURNING columns so PL/pgSQL output variables
-- named delivery_id / delivery_no cannot make delivery_no ambiguous.

create or replace function public.create_delivery_from_customer_order(
  p_order_id uuid,
  p_allow_related boolean default false
)
returns table(delivery_id uuid, delivery_no text, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.customer_orders%rowtype;
  existing_delivery record;
  new_delivery_id uuid;
  new_delivery_no text;
  delivery_order_id uuid;
  delivery_order_no text;
  total_weight numeric(12, 3);
  item_total integer;
begin
  if not public.can_manage_customer_orders()
    or not public.can_access_customer_order(p_order_id) then
    raise exception 'Order delivery creation is not allowed.';
  end if;

  select *
  into order_row
  from public.customer_orders
  where id = p_order_id;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if order_row.fulfillment_type = 'PICKUP'
    or (
      coalesce(order_row.delivery_required, false) = false
      and order_row.fulfillment_type not in ('DELIVERY', 'INTERNAL_TRANSFER')
    ) then
    raise exception 'Customer pickup orders stay in Orders and do not create delivery jobs.';
  end if;

  if not p_allow_related then
    select delivery.id, delivery.delivery_no
    into existing_delivery
    from public.delivery_orders delivery_order
    join public.deliveries delivery on delivery.id = delivery_order.delivery_id
    where delivery_order.source_customer_order_id = p_order_id
      and delivery.status <> 'CANCELLED'
    order by delivery.created_at desc
    limit 1;

    if existing_delivery.id is not null then
      delivery_id := existing_delivery.id;
      delivery_no := existing_delivery.delivery_no;
      created := false;
      return next;
      return;
    end if;
  end if;

  select
    coalesce(
      sum(
        greatest(
          coalesce(order_item.prepared_weight_kg, 0),
          coalesce(order_item.estimated_weight_kg, 0),
          coalesce(order_item.requested_weight_kg, 0)
        )
      ),
      0
    ),
    count(*)::integer
  into total_weight, item_total
  from public.customer_order_items order_item
  where order_item.order_id = p_order_id
    and order_item.status <> 'CANCELLED';

  new_delivery_no :=
    'DL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.deliveries (
    delivery_no,
    delivery_type,
    status,
    outlet_id,
    delivery_team_id,
    customer_id,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_note,
    total_weight_kg,
    item_count,
    requested_delivery_date,
    created_by,
    updated_by
  )
  values (
    new_delivery_no,
    case
      when order_row.fulfillment_type = 'INTERNAL_TRANSFER' then 'INTERNAL_TRANSFER_DELIVERY'
      else 'CUSTOMER_DELIVERY'
    end,
    'AVAILABLE',
    order_row.outlet_id,
    order_row.department_id,
    order_row.customer_id,
    order_row.customer_name,
    order_row.customer_phone,
    order_row.delivery_address,
    coalesce(order_row.customer_remarks, order_row.remarks),
    coalesce(total_weight, 0),
    coalesce(item_total, 0),
    coalesce(order_row.required_date, order_row.required_at::date),
    auth.uid(),
    auth.uid()
  )
  returning public.deliveries.id, public.deliveries.delivery_no
  into new_delivery_id, new_delivery_no;

  delivery_order_no := order_row.order_no;

  if exists (
    select 1 from public.delivery_orders where order_no = delivery_order_no
  ) then
    delivery_order_no := order_row.order_no || '-DEL-' || upper(substr(replace(new_delivery_id::text, '-', ''), 1, 4));
  end if;

  insert into public.delivery_orders (
    delivery_id,
    order_no,
    customer_id,
    customer_name,
    customer_phone,
    customer_location,
    delivery_address,
    outlet_id,
    delivery_team_id,
    source_customer_order_id,
    order_note,
    order_sequence,
    status,
    created_by
  )
  values (
    new_delivery_id,
    delivery_order_no,
    order_row.customer_id,
    order_row.customer_name,
    order_row.customer_phone,
    coalesce(order_row.delivery_address, order_row.customer_name, delivery_order_no),
    order_row.delivery_address,
    order_row.outlet_id,
    order_row.department_id,
    p_order_id,
    coalesce(order_row.customer_remarks, order_row.remarks),
    1,
    'PENDING',
    auth.uid()
  )
  returning id into delivery_order_id;

  insert into public.delivery_items (
    delivery_id,
    delivery_order_id,
    customer_order_id,
    customer_order_item_id,
    item_id,
    item_description,
    quantity,
    weight_kg,
    notes,
    created_by
  )
  select
    new_delivery_id,
    delivery_order_id,
    p_order_id,
    order_item.id,
    order_item.item_id,
    coalesce(item.category || ' / ' || item.section || ' / ' || item.name, order_item.item_id::text),
    greatest(coalesce(order_item.prepared_quantity, 0), coalesce(order_item.requested_quantity, 0)),
    greatest(
      coalesce(order_item.prepared_weight_kg, 0),
      coalesce(order_item.estimated_weight_kg, 0),
      coalesce(order_item.requested_weight_kg, 0)
    ),
    order_item.notes,
    auth.uid()
  from public.customer_order_items order_item
  left join public.items item on item.id = order_item.item_id
  where order_item.order_id = p_order_id
    and order_item.status <> 'CANCELLED';

  insert into public.delivery_status_logs (
    delivery_id,
    status,
    status_text,
    notes,
    created_by
  )
  values (
    new_delivery_id,
    'AVAILABLE',
    'AVAILABLE',
    'Delivery created from order.',
    auth.uid()
  );

  delivery_id := new_delivery_id;
  delivery_no := new_delivery_no;
  created := true;
  return next;
end;
$$;
