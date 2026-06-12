alter table public.delivery_orders
  add column if not exists proof_receiver_name text,
  add column if not exists proof_latitude numeric(10, 7),
  add column if not exists proof_longitude numeric(10, 7),
  add column if not exists proof_uploaded_at timestamptz;

alter table public.customer_orders
  add column if not exists proof_receiver_name text,
  add column if not exists proof_latitude numeric(10, 7),
  add column if not exists proof_longitude numeric(10, 7),
  add column if not exists proof_uploaded_at timestamptz;

comment on column public.delivery_orders.proof_receiver_name is
  'Receiver name captured with delivery proof photo.';

comment on column public.delivery_orders.proof_latitude is
  'GPS latitude captured when delivery proof is uploaded.';

comment on column public.delivery_orders.proof_longitude is
  'GPS longitude captured when delivery proof is uploaded.';

comment on column public.delivery_orders.proof_uploaded_at is
  'Timestamp when delivery proof metadata was uploaded.';

comment on column public.customer_orders.proof_receiver_name is
  'Receiver name captured with customer-order delivery proof photo.';

comment on column public.customer_orders.proof_latitude is
  'GPS latitude captured when customer-order delivery proof is uploaded.';

comment on column public.customer_orders.proof_longitude is
  'GPS longitude captured when customer-order delivery proof is uploaded.';

comment on column public.customer_orders.proof_uploaded_at is
  'Timestamp when customer-order delivery proof metadata was uploaded.';

alter type public.delivery_payment_type add value if not exists 'EWALLET';

insert into public.customer_categories (code, name, credit_term_days, is_credit, sort_order)
values ('VIP', 'VIP', 14, true, 25)
on conflict (code) do update set
  name = excluded.name,
  credit_term_days = excluded.credit_term_days,
  is_credit = excluded.is_credit,
  sort_order = excluded.sort_order,
  is_active = true;

create or replace function public.can_manage_delivery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team_general_worker')
    or public.has_role('retail_manager')
    or public.has_role('delivery_team_general_worker')
    or public.has_role('delivery_manager')
    or public.has_role('processing_team_general_worker')
    or public.has_role('processing_manager')
    or public.has_role('account')
    or public.has_role('admin');
$$;

create or replace function public.can_manage_delivery_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_director()
    or (
      public.can_manage_delivery()
      and public.can_access_department(target_team_id)
    );
$$;

create or replace function public.can_operate_customer_order_delivery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_delivery();
$$;

create or replace function public.complete_customer_order_delivery_with_proof(
  p_order_id uuid,
  p_file_id uuid,
  p_receiver_name text,
  p_latitude numeric,
  p_longitude numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.customer_orders%rowtype;
begin
  select *
  into target_order
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Customer order was not found.';
  end if;

  if not target_order.delivery_required then
    raise exception 'Only delivery-required customer orders can receive proof photos.';
  end if;

  if target_order.status::text not in ('OUT_FOR_DELIVERY', 'DELIVERED') then
    raise exception 'Proof photos can only complete customer orders after they are out for delivery.';
  end if;

  if not (
    public.can_operate_customer_order_delivery()
    and public.can_access_work_scope(target_order.outlet_id, target_order.department_id)
    and public.can_access_outlet_module(target_order.outlet_id, 'delivery')
  ) then
    raise exception 'You cannot upload proof for this customer-order delivery.';
  end if;

  update public.customer_orders
  set
    proof_file_id = p_file_id,
    proof_receiver_name = nullif(trim(p_receiver_name), ''),
    proof_latitude = p_latitude,
    proof_longitude = p_longitude,
    proof_uploaded_at = now(),
    status = 'DELIVERED',
    updated_by = auth.uid()
  where id = p_order_id;

  if target_order.customer_id is not null then
    update public.customers
    set
      latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
    where id = target_order.customer_id;
  end if;
end;
$$;

grant execute on function public.complete_customer_order_delivery_with_proof(
  uuid,
  uuid,
  text,
  numeric,
  numeric
) to authenticated;
