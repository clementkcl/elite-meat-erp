insert into public.roles (role_key, name) values
  ('retail_team_general_worker', 'Retail Team General Worker'),
  ('retail_manager', 'Retail Manager'),
  ('delivery_team_general_worker', 'Delivery Team General Worker'),
  ('delivery_manager', 'Delivery Manager'),
  ('processing_team_general_worker', 'Processing Team General Worker'),
  ('processing_manager', 'Processing Manager'),
  ('account', 'Account'),
  ('admin', 'Admin'),
  ('director', 'Director')
on conflict (role_key) do update set name = excluded.name;

insert into public.departments (name) values
  ('Retail'),
  ('Delivery'),
  ('Processing'),
  ('Stock'),
  ('Accounting'),
  ('Admin'),
  ('Management')
on conflict (name) do nothing;

insert into public.branches (name) values
  ('Elite Meat Main')
on conflict (name) do nothing;

insert into public.outlets (branch_id, name)
select b.id, outlet_name
from public.branches b
cross join (values
  ('JALAN CHANNEL'),
  ('SUNGAI MERAH'),
  ('WONDERFUL'),
  ('SUNGAI MAAW'),
  ('DIRECTOR')
) as outlets(outlet_name)
where b.name = 'Elite Meat Main'
on conflict (name) do nothing;

insert into public.stock_locations (name) values
  ('JALAN CHANNEL'),
  ('SUNGAI MERAH'),
  ('WONDERFUL'),
  ('SUNGAI MAAW'),
  ('DIRECTOR')
on conflict (name) do update set is_active = true;

insert into public.outlet_module_access (outlet_id, module_key, is_enabled)
select outlet.id, module.module_key, true
from public.outlets outlet
cross join (
  values
    ('stock'),
    ('orders'),
    ('retail'),
    ('processing'),
    ('delivery'),
    ('attendance'),
    ('cleaning'),
    ('oa_actions'),
    ('accounting_finance'),
    ('director_reports')
) as module(module_key)
on conflict (outlet_id, module_key) do update set
  is_enabled = excluded.is_enabled;

insert into public.erp_claim_categories (code, name, sort_order) values
  ('TRAVEL', 'Travel', 10),
  ('MEAL', 'Meal', 20),
  ('MEDICAL', 'Medical', 30),
  ('OTHER', 'Other', 100)
on conflict (code) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.erp_leave_types (code, name, default_days, sort_order) values
  ('ANNUAL', 'Annual Leave', 8, 10),
  ('MEDICAL', 'Medical Leave', 14, 20),
  ('EMERGENCY', 'Emergency Leave', 0, 30),
  ('OTHER', 'Other', 0, 100)
on conflict (code) do update set
  name = excluded.name,
  default_days = excluded.default_days,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.customer_categories (code, name, credit_term_days, is_credit, sort_order) values
  ('RETAIL', 'Retail', 0, false, 10),
  ('WHOLESALE', 'Wholesale', 14, true, 20),
  ('VIP', 'VIP', 14, true, 30),
  ('OTHER', 'Other', 0, false, 100)
on conflict (code) do update set
  name = excluded.name,
  credit_term_days = excluded.credit_term_days,
  is_credit = excluded.is_credit,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.customers (
  customer_code,
  name,
  phone,
  address,
  category_id,
  outlet_id,
  credit_term_days,
  latitude,
  longitude,
  remarks
)
select
  seed.customer_code,
  seed.name,
  seed.phone,
  seed.address,
  category.id,
  outlet.id,
  seed.credit_term_days,
  seed.latitude,
  seed.longitude,
  seed.remarks
from (values
  (
    'CUST-JC-PICKUP-001',
    'Jalan Channel Pickup Customer',
    '+60 12-200 3001',
    'Jalan Channel retail counter',
    'RETAIL',
    'JALAN CHANNEL',
    0,
    2.2871000,
    111.8320000,
    'Prefers morning pickup.'
  ),
  (
    'CUST-SM-CREDIT-001',
    'Sungai Merah Delivery Customer',
    '+60 12-200 3002',
    'Sungai Merah outlet loading bay',
    'VIP',
    'SUNGAI MERAH',
    30,
    2.3123000,
    111.8460000,
    'Call before delivery.'
  )
) as seed(
  customer_code,
  name,
  phone,
  address,
  category_code,
  outlet_name,
  credit_term_days,
  latitude,
  longitude,
  remarks
)
join public.customer_categories category on category.code = seed.category_code
join public.outlets outlet on outlet.name = seed.outlet_name
on conflict (customer_code) do update set
  name = excluded.name,
  phone = excluded.phone,
  address = excluded.address,
  category_id = excluded.category_id,
  outlet_id = excluded.outlet_id,
  credit_term_days = excluded.credit_term_days,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  remarks = excluded.remarks,
  is_active = true;

update public.profiles profile
set stock_location_id = stock_location.id
from public.outlets outlet
join public.stock_locations stock_location on stock_location.name = outlet.name
where profile.stock_location_id is null
  and profile.outlet_id = outlet.id;

update public.profiles profile
set
  full_name = coalesce(nullif(profile.full_name, ''), 'Clement KCL'),
  branch_id = branch.id,
  outlet_id = outlet.id,
  department_id = department.id,
  stock_location_id = stock_location.id
from public.branches branch
join public.outlets outlet on outlet.name = 'DIRECTOR'
join public.departments department on department.name = 'Management'
join public.stock_locations stock_location on stock_location.name = 'DIRECTOR'
where branch.name = 'Elite Meat Main'
  and lower(profile.email) in (
    'clementkc@elitempsb.com',
    'clementkl@elitempsb.com',
    'clementkcl@elitempsb.com'
  );

with target_profiles as (
  select id
  from public.profiles
  where lower(email) in (
    'clementkc@elitempsb.com',
    'clementkl@elitempsb.com',
    'clementkcl@elitempsb.com'
  )
)
delete from public.profile_roles role
using target_profiles target
where role.profile_id = target.id;

insert into public.profile_roles (profile_id, role_key)
select target.id, role.role_key
from (
  select id
  from public.profiles
  where lower(email) in (
    'clementkc@elitempsb.com',
    'clementkl@elitempsb.com',
    'clementkcl@elitempsb.com'
  )
) target
cross join (values
  ('admin'),
  ('director')
) as role(role_key)
on conflict do nothing;

insert into public.brands (name) values
  ('TICAN'),
  ('RIVASAM'),
  ('SEABOARD'),
  ('VAN ROOI'),
  ('ABC'),
  ('ICP'),
  ('LOCKS')
on conflict (name) do update set is_active = true;

insert into public.origins (name) values
  ('DENMARK'),
  ('SPAIN'),
  ('USA'),
  ('NETHERLAND'),
  ('BELGIUM'),
  ('CHINA')
on conflict (name) do update set is_active = true;

insert into public.items (
  item_code,
  category,
  section,
  name,
  barcode_required,
  processing_min_yield_percent,
  processing_max_loss_percent
) values
  ('0001', 'MEAT', 'BELLY', 'BONELESS', true, 85.00, 15.00),
  ('0002', 'MEAT', 'BELLY', 'BONE IN', true, 80.00, 20.00),
  ('0003', 'MEAT', 'LOIN', 'BONELESS', true, 88.00, 12.00),
  ('0004', 'ORGANS', 'COOKED', 'STOMACH', true, 70.00, 30.00),
  ('0005', 'ORGANS', 'TONGUE', 'TONGUE', true, 75.00, 25.00),
  ('0006', 'PROCESSED', 'MEATBALL', 'MEATBALL', false, 90.00, 10.00)
on conflict (item_code) do update set
  category = excluded.category,
  section = excluded.section,
  name = excluded.name,
  barcode_required = excluded.barcode_required,
  processing_min_yield_percent = excluded.processing_min_yield_percent,
  processing_max_loss_percent = excluded.processing_max_loss_percent,
  is_active = true;

update public.items item
set default_brand_id = brand.id
from (
  values
    ('0001', 'TICAN'),
    ('0002', 'TICAN'),
    ('0003', 'SEABOARD'),
    ('0004', 'ABC'),
    ('0005', 'ABC')
) as seed(item_code, brand_name)
join public.brands brand on brand.name = seed.brand_name
where item.item_code = seed.item_code;

insert into public.barcode_weight_rules (
  item_id,
  brand_id,
  origin_id,
  location_id,
  barcode_weight_start,
  barcode_weight_length,
  barcode_weight_decimals
)
select
  item.id,
  brand.id,
  origin.id,
  null::uuid,
  7,
  5,
  2
from public.items item
join public.brands brand on brand.name = 'TICAN'
join public.origins origin on origin.name = 'DENMARK'
where item.item_code = '0001'
on conflict (item_id, brand_id, origin_id, location_id) do update set
  barcode_weight_start = excluded.barcode_weight_start,
  barcode_weight_length = excluded.barcode_weight_length,
  barcode_weight_decimals = excluded.barcode_weight_decimals;

insert into public.no_barcode_stock (
  item_id,
  brand_id,
  origin_id,
  location_id,
  quantity,
  weight_kg
)
select
  item.id,
  brand.id,
  origin.id,
  stock_location.id,
  25.000,
  250.000
from public.items item
join public.brands brand on brand.name = 'TICAN'
join public.origins origin on origin.name = 'DENMARK'
join public.stock_locations stock_location on stock_location.name = 'JALAN CHANNEL'
where item.item_code = '0002'
on conflict (item_id, brand_id, origin_id, location_id) do update set
  quantity = greatest(public.no_barcode_stock.quantity, excluded.quantity),
  weight_kg = greatest(public.no_barcode_stock.weight_kg, excluded.weight_kg);

insert into public.stock_units (
  barcode,
  item_id,
  brand_id,
  origin_id,
  location_id,
  status,
  net_weight_kg,
  inbound_source,
  batch_no,
  received_at
)
select
  seed.barcode,
  item.id,
  brand.id,
  origin.id,
  stock_location.id,
  seed.status::public.stock_unit_status,
  seed.net_weight_kg,
  seed.inbound_source,
  seed.batch_no,
  '2026-06-10 08:30:00+08'::timestamptz
from (values
  ('EM-SEED-OUT-001', '0001', 'TICAN', 'DENMARK', 'JALAN CHANNEL', 'IN_STOCK', 12.500, 'supplier_import', 'SEED-ORDER-OUTBOUND'),
  ('EM-SEED-OUT-002', '0001', 'TICAN', 'DENMARK', 'JALAN CHANNEL', 'IN_STOCK', 11.750, 'supplier_import', 'SEED-ORDER-OUTBOUND'),
  ('EM-SEED-OUT-003', '0003', 'RIVASAM', 'SPAIN', 'SUNGAI MERAH', 'IN_STOCK', 9.250, 'supplier_import', 'SEED-ORDER-OUTBOUND'),
  ('EM-SEED-RETURN-INSPECTION-001', '0002', 'TICAN', 'DENMARK', 'JALAN CHANNEL', 'INSPECTION', 10.000, 'customer_return', 'SEED-CUSTOMER-RETURN'),
  ('EM-SEED-DAMAGE-001', '0001', 'TICAN', 'DENMARK', 'JALAN CHANNEL', 'IN_STOCK', 8.500, 'supplier_import', 'SEED-DAMAGE'),
  ('EM-SEED-DAMAGE-APPROVE-001', '0001', 'TICAN', 'DENMARK', 'JALAN CHANNEL', 'IN_STOCK', 7.750, 'supplier_import', 'SEED-DAMAGE-APPROVE'),
  ('EM-SEED-RETURN-SUPPLIER-001', '0001', 'TICAN', 'DENMARK', 'JALAN CHANNEL', 'IN_STOCK', 6.250, 'supplier_import', 'SEED-RETURN-SUPPLIER'),
  ('EM-SEED-STOCK-TAKE-001', '0004', 'ABC', 'CHINA', 'WONDERFUL', 'IN_STOCK', 5.000, 'supplier_import', 'SEED-STOCK-TAKE')
) as seed(barcode, item_code, brand_name, origin_name, stock_location_name, status, net_weight_kg, inbound_source, batch_no)
join public.items item on item.item_code = seed.item_code
left join public.brands brand on brand.name = seed.brand_name
left join public.origins origin on origin.name = seed.origin_name
join public.stock_locations stock_location on stock_location.name = seed.stock_location_name
on conflict (barcode) do nothing;

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
select
  'INBOUND'::public.stock_movement_type,
  stock_unit.item_id,
  stock_unit.id,
  stock_unit.barcode,
  stock_unit.location_id,
  1,
  stock_unit.net_weight_kg,
  'SEED-ORDER-OUTBOUND',
  'Seed barcode stock for order outbound testing',
  'supplier_import',
  first_profile.id
from public.stock_units stock_unit
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where stock_unit.barcode in (
    'EM-SEED-OUT-001',
    'EM-SEED-OUT-002',
    'EM-SEED-OUT-003',
    'EM-SEED-DAMAGE-001',
    'EM-SEED-DAMAGE-APPROVE-001',
    'EM-SEED-RETURN-SUPPLIER-001',
    'EM-SEED-STOCK-TAKE-001'
  )
  and not exists (
    select 1
    from public.stock_movements existing
    where existing.barcode = stock_unit.barcode
      and existing.reference_no = 'SEED-ORDER-OUTBOUND'
      and existing.movement_type = 'INBOUND'::public.stock_movement_type
  );

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
select
  'INBOUND'::public.stock_movement_type,
  stock_unit.item_id,
  stock_unit.id,
  stock_unit.barcode,
  stock_unit.location_id,
  1,
  stock_unit.net_weight_kg,
  'SEED-CUSTOMER-RETURN',
  'Seed customer return held for inspection',
  'customer_return',
  first_profile.id
from public.stock_units stock_unit
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where stock_unit.barcode = 'EM-SEED-RETURN-INSPECTION-001'
  and not exists (
    select 1
    from public.stock_movements existing
    where existing.barcode = stock_unit.barcode
      and existing.reference_no = 'SEED-CUSTOMER-RETURN'
      and existing.movement_type = 'INBOUND'::public.stock_movement_type
  );

insert into public.stock_damage_requests (
  request_no,
  stock_unit_id,
  barcode,
  item_id,
  brand_id,
  origin_id,
  location_id,
  reason,
  status,
  photo_path,
  notes,
  requested_by,
  manager_reviewed_by,
  manager_reviewed_at,
  manager_signature
)
select
  seed.request_no,
  stock_unit.id,
  stock_unit.barcode,
  stock_unit.item_id,
  stock_unit.brand_id,
  stock_unit.origin_id,
  stock_unit.location_id,
  seed.reason,
  seed.status,
  seed.photo_path,
  seed.notes,
  first_profile.id,
  case when seed.status = 'MANAGER_REVIEWED' then first_profile.id else null end,
  case when seed.status = 'MANAGER_REVIEWED' then '2026-06-10 10:00:00+08'::timestamptz else null end,
  case when seed.status = 'MANAGER_REVIEWED' then 'Seed Manager' else null end
from (values
  (
    'DMG-SEED-SUBMITTED-001',
    'EM-SEED-DAMAGE-001',
    'broken_packaging',
    'SUBMITTED',
    'seed/stock/damage-submitted.jpg',
    'Seed damage request ready for manager review.'
  ),
  (
    'DMG-SEED-REVIEWED-001',
    'EM-SEED-DAMAGE-APPROVE-001',
    'wrong_temperature',
    'MANAGER_REVIEWED',
    'seed/stock/damage-reviewed.jpg',
    'Seed damage request ready for director approval.'
  )
) as seed(request_no, barcode, reason, status, photo_path, notes)
join public.stock_units stock_unit on stock_unit.barcode = seed.barcode
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
on conflict (request_no) do nothing;

insert into public.stock_return_supplier_requests (
  request_no,
  stock_unit_id,
  barcode,
  item_id,
  brand_id,
  origin_id,
  location_id,
  supplier_name,
  status,
  notes,
  requested_by
)
select
  'RS-SEED-SUBMITTED-001',
  stock_unit.id,
  stock_unit.barcode,
  stock_unit.item_id,
  stock_unit.brand_id,
  stock_unit.origin_id,
  stock_unit.location_id,
  'Seed Supplier',
  'SUBMITTED',
  'Seed supplier return request ready for manager approval.',
  first_profile.id
from public.stock_units stock_unit
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where stock_unit.barcode = 'EM-SEED-RETURN-SUPPLIER-001'
on conflict (request_no) do nothing;

insert into public.stock_take_sessions (
  session_no,
  location_id,
  item_id,
  brand_id,
  status,
  created_by,
  submitted_at,
  reviewed_at,
  manager_reviewed_by,
  manager_reviewed_at,
  manager_signature
)
select
  seed.session_no,
  stock_location.id,
  item.id,
  brand.id,
  seed.status::public.stock_take_status,
  first_profile.id,
  seed.submitted_at,
  seed.reviewed_at,
  case when seed.status = 'REVIEWED' then first_profile.id else null end,
  case when seed.status = 'REVIEWED' then seed.reviewed_at else null end,
  case when seed.status = 'REVIEWED' then 'Seed Manager' else null end
from (values
  (
    'ST-SEED-DRAFT-001',
    'WONDERFUL',
    '0004',
    'ABC',
    'DRAFT',
    null::timestamptz,
    null::timestamptz
  ),
  (
    'ST-SEED-SUBMITTED-001',
    'WONDERFUL',
    '0004',
    'ABC',
    'SUBMITTED',
    '2026-06-10 09:30:00+08'::timestamptz,
    null::timestamptz
  ),
  (
    'ST-SEED-REVIEWED-001',
    'WONDERFUL',
    '0004',
    'ABC',
    'REVIEWED',
    '2026-06-10 09:30:00+08'::timestamptz,
    '2026-06-10 10:00:00+08'::timestamptz
  )
) as seed(session_no, location_name, item_code, brand_name, status, submitted_at, reviewed_at)
join public.stock_locations stock_location on stock_location.name = seed.location_name
join public.items item on item.item_code = seed.item_code
join public.brands brand on brand.name = seed.brand_name
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
on conflict (session_no) do nothing;

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
select
  session.id,
  stock_unit.item_id,
  stock_unit.brand_id,
  stock_unit.origin_id,
  stock_unit.barcode,
  1,
  case when session.session_no = 'ST-SEED-REVIEWED-001' then 0 else 1 end,
  stock_unit.net_weight_kg,
  case when session.session_no = 'ST-SEED-REVIEWED-001' then 0 else stock_unit.net_weight_kg end,
  'Seed stock take barcode line.'
from public.stock_take_sessions session
join public.stock_units stock_unit on stock_unit.barcode = 'EM-SEED-STOCK-TAKE-001'
where session.session_no in ('ST-SEED-SUBMITTED-001', 'ST-SEED-REVIEWED-001')
  and not exists (
    select 1
    from public.stock_take_lines existing
    where existing.session_id = session.id
      and existing.barcode = stock_unit.barcode
  );

insert into public.customer_orders (
  order_no,
  customer_name,
  customer_phone,
  order_date,
  required_date,
  fulfillment_type,
  delivery_required,
  status,
  remarks,
  outlet_id,
  department_id,
  created_by,
  updated_by
)
select
  seed.order_no,
  seed.customer_name,
  seed.customer_phone,
  seed.order_date::date,
  seed.required_date::date,
  seed.fulfillment_type::public.customer_order_fulfillment,
  seed.delivery_required,
  seed.status::public.customer_order_status,
  seed.remarks,
  outlet.id,
  department.id,
  first_profile.id,
  first_profile.id
from (values
  (
    'ORD-SEED-PICKUP-001',
    'Jalan Channel Pickup Customer',
    '+60 12-200 3001',
    '2026-06-10',
    '2026-06-11',
    'PICKUP',
    false,
    'READY_FOR_PICKUP',
    'Seed ready pickup order for outbound sales scan.',
    'JALAN CHANNEL',
    'Retail'
  ),
  (
    'ORD-SEED-DELIVERY-001',
    'Sungai Merah Delivery Customer',
    '+60 12-200 3002',
    '2026-06-10',
    '2026-06-11',
    'DELIVERY',
    true,
    'READY_FOR_DELIVERY',
    'Seed ready delivery order for driver list testing.',
    'SUNGAI MERAH',
    'Delivery'
  )
) as seed(
  order_no,
  customer_name,
  customer_phone,
  order_date,
  required_date,
  fulfillment_type,
  delivery_required,
  status,
  remarks,
  outlet_name,
  department_name
)
join public.outlets outlet on outlet.name = seed.outlet_name
left join public.departments department on department.name = seed.department_name
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
on conflict (order_no) do update set
  customer_name = excluded.customer_name,
  customer_phone = excluded.customer_phone,
  order_date = excluded.order_date,
  required_date = excluded.required_date,
  fulfillment_type = excluded.fulfillment_type,
  delivery_required = excluded.delivery_required,
  status = excluded.status,
  remarks = excluded.remarks,
  outlet_id = excluded.outlet_id,
  department_id = excluded.department_id,
  updated_by = excluded.updated_by;

update public.customer_orders customer_order
set customer_id = customer.id,
    source_type = 'manual_erp',
    source_reference = customer_order.order_no,
    salesperson_id = coalesce(customer_order.salesperson_id, customer_order.created_by),
    total_order_price = case
      when customer_order.order_no = 'ORD-SEED-PICKUP-001' then 188.00
      when customer_order.order_no = 'ORD-SEED-DELIVERY-001' then 128.00
      else customer_order.total_order_price
    end,
    required_at = case
      when customer_order.order_no = 'ORD-SEED-PICKUP-001' then '2026-06-11 10:00:00+08'::timestamptz
      when customer_order.order_no = 'ORD-SEED-DELIVERY-001' then '2026-06-11 14:00:00+08'::timestamptz
      else customer_order.required_at
    end,
    customer_remarks = customer.remarks,
    reservation_expires_at = coalesce(
      customer_order.reservation_expires_at,
      '2026-06-10 23:59:59+08'::timestamptz
    ),
    order_v1_status = public.customer_order_v1_status(
      customer_order.status::text,
      customer_order.stock_not_enough,
      customer_order.picked_up_at
    )
from public.customers customer
where (
    (customer_order.order_no = 'ORD-SEED-PICKUP-001' and customer.customer_code = 'CUST-JC-PICKUP-001')
    or (customer_order.order_no = 'ORD-SEED-DELIVERY-001' and customer.customer_code = 'CUST-SM-CREDIT-001')
  );

insert into public.customer_order_items (
  order_id,
  item_id,
  ordering_unit,
  requested_quantity,
  requested_weight_kg,
  estimated_weight_kg,
  prepared_quantity,
  prepared_weight_kg,
  prepared_by,
  prepared_at,
  status,
  item_request_remarks,
  processing_required,
  stock_not_enough,
  notes
)
select
  customer_order.id,
  item.id,
  'KG',
  seed.requested_quantity,
  seed.requested_weight_kg,
  seed.requested_weight_kg,
  seed.prepared_quantity,
  seed.prepared_weight_kg,
  first_profile.id,
  '2026-06-10 09:00:00+08'::timestamptz,
  'PREPARED'::public.customer_order_item_status,
  seed.notes,
  false,
  false,
  seed.notes
from (values
  ('ORD-SEED-PICKUP-001', '0001', 2.000, 24.250, 2.000, 24.250, 'Seed prepared pickup order line.'),
  ('ORD-SEED-DELIVERY-001', '0003', 1.000, 9.250, 1.000, 9.250, 'Seed prepared delivery order line.')
) as seed(
  order_no,
  item_code,
  requested_quantity,
  requested_weight_kg,
  prepared_quantity,
  prepared_weight_kg,
  notes
)
join public.customer_orders customer_order on customer_order.order_no = seed.order_no
join public.items item on item.item_code = seed.item_code
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where not exists (
  select 1
  from public.customer_order_items existing
  where existing.order_id = customer_order.id
    and existing.item_id = item.id
    and existing.notes = seed.notes
);

insert into public.order_stock_reservations (
  order_id,
  order_item_id,
  item_id,
  location_id,
  reserved_quantity,
  reserved_weight_kg,
  status,
  stock_not_enough,
  expires_at,
  created_by
)
select
  customer_order_item.order_id,
  customer_order_item.id,
  customer_order_item.item_id,
  stock_location.id,
  customer_order_item.requested_quantity,
  customer_order_item.requested_weight_kg,
  'ACTIVE',
  false,
  '2026-06-10 23:59:59+08'::timestamptz,
  first_profile.id
from public.customer_order_items customer_order_item
join public.customer_orders customer_order on customer_order.id = customer_order_item.order_id
left join public.stock_locations stock_location on stock_location.name =
  case
    when customer_order.order_no = 'ORD-SEED-DELIVERY-001' then 'SUNGAI MERAH'
    else 'JALAN CHANNEL'
  end
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where customer_order.order_no in ('ORD-SEED-PICKUP-001', 'ORD-SEED-DELIVERY-001')
  and not exists (
    select 1
    from public.order_stock_reservations existing
    where existing.order_item_id = customer_order_item.id
  );

insert into public.order_preparation_logs (
  order_id,
  order_item_id,
  item_id,
  prepared_quantity,
  prepared_weight_kg,
  prepared_by,
  notes
)
select
  customer_order_item.order_id,
  customer_order_item.id,
  customer_order_item.item_id,
  customer_order_item.prepared_quantity,
  customer_order_item.prepared_weight_kg,
  customer_order_item.prepared_by,
  'Seed preparation log'
from public.customer_order_items customer_order_item
join public.customer_orders customer_order on customer_order.id = customer_order_item.order_id
where customer_order.order_no in ('ORD-SEED-PICKUP-001', 'ORD-SEED-DELIVERY-001')
  and not exists (
    select 1
    from public.order_preparation_logs existing
    where existing.order_item_id = customer_order_item.id
      and existing.notes = 'Seed preparation log'
  );

insert into public.order_notification_events (
  order_id,
  event_type,
  channel,
  payload,
  status,
  created_by
)
select
  customer_order.id,
  seed.event_type::public.order_notification_event_type,
  'WHATSAPP',
  jsonb_build_object('source', 'seed', 'orderNo', customer_order.order_no),
  'PENDING',
  first_profile.id
from (values
  ('ORD-SEED-PICKUP-001', 'READY_TO_PICKUP'),
  ('ORD-SEED-DELIVERY-001', 'READY_TO_PICKUP')
) as seed(order_no, event_type)
join public.customer_orders customer_order on customer_order.order_no = seed.order_no
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where not exists (
  select 1
  from public.order_notification_events existing
  where existing.order_id = customer_order.id
    and existing.event_type = seed.event_type::public.order_notification_event_type
    and existing.payload->>'source' = 'seed'
);

insert into public.vehicles (vehicle_no, vehicle_type, capacity_kg) values
  ('EM-LORRY-01', 'LORRY', 1800),
  ('EM-VAN-02', 'VAN', 900)
on conflict (vehicle_no) do update set
  vehicle_type = excluded.vehicle_type,
  capacity_kg = excluded.capacity_kg,
  is_active = true;

update public.vehicles vehicle
set delivery_team_id = department.id
from public.departments department
where department.name = 'Delivery'
  and vehicle.delivery_team_id is null;

insert into public.delivery_orders (
  order_no,
  customer_name,
  customer_phone,
  customer_location,
  delivery_address,
  vehicle_id,
  status,
  payment_type,
  payment_status,
  source_type,
  source_reference,
  requested_delivery_date,
  notes
)
select
  seed.order_no,
  seed.customer_name,
  seed.customer_phone,
  seed.customer_location,
  seed.delivery_address,
  v.id,
  seed.status::public.delivery_status,
  seed.payment_type::public.delivery_payment_type,
  seed.payment_status::public.delivery_payment_status,
  seed.source_type,
  seed.source_reference,
  seed.requested_delivery_date::date,
  seed.notes
from (values
  (
    'DO-20260610-001',
    'Sungai Merah Retail',
    '+60 12-100 2001',
    'Sungai Merah',
    'Sungai Merah outlet loading bay',
    'EM-LORRY-01',
    'PENDING',
    'CREDIT',
    'PENDING',
    'whatsapp',
    'WA-SM-20260610-001',
    '2026-06-10',
    'Seed delivery order'
  ),
  (
    'DO-20260610-002',
    'Jalan Channel Counter',
    '+60 12-100 2002',
    'Jalan Channel',
    'Jalan Channel retail counter',
    'EM-VAN-02',
    'DELIVERED',
    'CASH',
    'PAID',
    'retail_sale',
    'RS-20260610-001',
    '2026-06-10',
    'Seed delivered order'
  )
) as seed(
  order_no,
  customer_name,
  customer_phone,
  customer_location,
  delivery_address,
  vehicle_no,
  status,
  payment_type,
  payment_status,
  source_type,
  source_reference,
  requested_delivery_date,
  notes
)
left join public.vehicles v on v.vehicle_no = seed.vehicle_no
on conflict (order_no) do update set
  customer_name = excluded.customer_name,
  customer_phone = excluded.customer_phone,
  customer_location = excluded.customer_location,
  delivery_address = excluded.delivery_address,
  vehicle_id = excluded.vehicle_id,
  status = excluded.status,
  payment_type = excluded.payment_type,
  payment_status = excluded.payment_status,
  source_type = excluded.source_type,
  source_reference = excluded.source_reference,
  requested_delivery_date = excluded.requested_delivery_date,
  notes = excluded.notes;

update public.delivery_orders delivery_order
set delivery_team_id = department.id
from public.departments department
where department.name = 'Delivery'
  and delivery_order.delivery_team_id is null;

insert into public.delivery_order_items (
  order_id,
  item_description,
  quantity,
  weight_kg,
  notes
)
select
  o.id,
  seed.item_description,
  seed.quantity,
  seed.weight_kg,
  seed.notes
from (values
  ('DO-20260610-001', 'MEAT / BELLY / BONELESS', 8, 168.5, 'Carton delivery'),
  ('DO-20260610-002', 'PROCESSED / MEATBALL / MEATBALL', 20, 40, 'Retail replenishment')
) as seed(order_no, item_description, quantity, weight_kg, notes)
join public.delivery_orders o on o.order_no = seed.order_no
where not exists (
  select 1
  from public.delivery_order_items existing
  where existing.order_id = o.id
    and existing.item_description = seed.item_description
);

insert into public.delivery_status_logs (order_id, status, notes)
select o.id, o.status, 'Seed status'
from public.delivery_orders o
where o.order_no in ('DO-20260610-001', 'DO-20260610-002')
  and not exists (
    select 1
    from public.delivery_status_logs existing
    where existing.order_id = o.id
      and existing.notes = 'Seed status'
  );

insert into public.delivery_payments (
  order_id,
  payment_type,
  payment_status,
  amount,
  reference_no,
  notes
)
select
  o.id,
  o.payment_type,
  o.payment_status,
  case when o.payment_status = 'PAID' then 520.00 else 0 end,
  o.order_no,
  'Seed payment'
from public.delivery_orders o
where o.order_no in ('DO-20260610-001', 'DO-20260610-002')
  and not exists (
    select 1
    from public.delivery_payments existing
    where existing.order_id = o.id
      and existing.notes = 'Seed payment'
  );

insert into public.work_locations (name, latitude, longitude, radius_meters) values
  ('JALAN CHANNEL', 2.2871000, 111.8320000, 50),
  ('SUNGAI MERAH', 2.3123000, 111.8460000, 50),
  ('WONDERFUL', 2.3042000, 111.8415000, 50),
  ('SUNGAI MAAW', 2.3313000, 111.8638000, 50),
  ('DIRECTOR', 2.2905000, 111.8310000, 50)
on conflict (name) do update set
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  radius_meters = excluded.radius_meters,
  is_active = true;

update public.work_locations location
set outlet_id = outlet.id,
    department_id = department.id
from public.outlets outlet
join public.departments department on department.name = 'Retail'
where outlet.name = location.name
  and location.name in ('JALAN CHANNEL', 'SUNGAI MERAH', 'WONDERFUL', 'SUNGAI MAAW');

insert into public.attendance_rules (
  name,
  work_location_id,
  start_time,
  end_time,
  late_after_minutes
)
select
  concat('Standard ', location.name),
  location.id,
  '08:00'::time,
  '17:00'::time,
  5
from public.work_locations location
where location.name in ('JALAN CHANNEL', 'SUNGAI MERAH', 'WONDERFUL', 'SUNGAI MAAW', 'DIRECTOR')
on conflict (name) do update set
  work_location_id = excluded.work_location_id,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  late_after_minutes = excluded.late_after_minutes,
  is_active = true;

insert into public.attendance_daily_summary (
  profile_id,
  work_date,
  work_location_id,
  department_id,
  clock_in_at,
  clock_out_at,
  status,
  total_minutes,
  notes,
  updated_by
)
select
  first_profile.id,
  '2026-06-10'::date,
  location.id,
  first_profile.department_id,
  '2026-06-10 08:01:00+08'::timestamptz,
  null,
  'NO_CLOCK_OUT'::public.attendance_status,
  0,
  'Seed no-clock-out attendance summary',
  first_profile.id
from public.work_locations location
left join lateral (
  select id, department_id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where location.name = 'JALAN CHANNEL'
  and first_profile.id is not null
on conflict (profile_id, work_date) do update set
  work_location_id = excluded.work_location_id,
  department_id = excluded.department_id,
  clock_in_at = excluded.clock_in_at,
  clock_out_at = excluded.clock_out_at,
  status = excluded.status,
  total_minutes = excluded.total_minutes,
  notes = excluded.notes,
  updated_by = excluded.updated_by;

with first_profile as (
  select id, department_id
  from public.profiles
  order by created_at
  limit 1
)
insert into public.advance_requests (requested_by, department_id, amount, needed_date, reason, status)
select
  id,
  department_id,
  300.00,
  '2026-06-15'::date,
  'Seed staff advance request',
  'SUBMITTED'::public.oa_request_status
from first_profile
where not exists (
  select 1
  from public.advance_requests existing
  where existing.reason = 'Seed staff advance request'
);

with first_profile as (
  select id, department_id
  from public.profiles
  order by created_at
  limit 1
)
insert into public.claim_requests (
  requested_by,
  department_id,
  category,
  expense_date,
  amount,
  description,
  status
)
select
  id,
  department_id,
  'TRANSPORT',
  '2026-06-10'::date,
  45.50,
  'Seed transport claim',
  'SUBMITTED'::public.oa_request_status
from first_profile
where not exists (
  select 1
  from public.claim_requests existing
  where existing.description = 'Seed transport claim'
);

with first_profile as (
  select id, department_id
  from public.profiles
  order by created_at
  limit 1
)
insert into public.leave_requests (
  requested_by,
  department_id,
  leave_type,
  start_date,
  end_date,
  total_days,
  reason,
  status
)
select
  id,
  department_id,
  'ANNUAL'::public.leave_request_type,
  '2026-06-20'::date,
  '2026-06-20'::date,
  1,
  'Seed annual leave request',
  'SUBMITTED'::public.oa_request_status
from first_profile
where not exists (
  select 1
  from public.leave_requests existing
  where existing.reason = 'Seed annual leave request'
);

with first_profile as (
  select id, department_id
  from public.profiles
  order by created_at
  limit 1
)
insert into public.leave_requests (
  requested_by,
  department_id,
  leave_type,
  start_date,
  end_date,
  total_days,
  reason,
  status,
  admin_reviewed_by,
  admin_reviewed_at
)
select
  id,
  department_id,
  'MEDICAL'::public.leave_request_type,
  '2026-06-11'::date,
  '2026-06-11'::date,
  1,
  'Seed approved leave for attendance',
  'APPROVED'::public.oa_request_status,
  id,
  now()
from first_profile
where not exists (
  select 1
  from public.leave_requests existing
  where existing.reason = 'Seed approved leave for attendance'
);

with first_profile as (
  select id
  from public.profiles
  order by created_at
  limit 1
)
insert into public.payslips (
  profile_id,
  period_month,
  gross_pay,
  deductions
)
select
  id,
  '2026-06-01'::date,
  2800.00,
  280.00
from first_profile
on conflict (profile_id, period_month) do update set
  gross_pay = excluded.gross_pay,
  deductions = excluded.deductions;

insert into public.retail_registers (
  outlet_id,
  stock_location_id,
  register_name
)
select
  outlet.id,
  stock_location.id,
  seed.register_name
from (values
  ('JALAN CHANNEL', 'JALAN CHANNEL', 'Jalan Channel Counter'),
  ('SUNGAI MERAH', 'SUNGAI MERAH', 'Sungai Merah Counter')
) as seed(outlet_name, stock_location_name, register_name)
join public.outlets outlet on outlet.name = seed.outlet_name
left join public.stock_locations stock_location
  on stock_location.name = seed.stock_location_name
on conflict (outlet_id, register_name) do update set
  stock_location_id = excluded.stock_location_id,
  is_active = true;

insert into public.retail_price_rules (
  item_id,
  brand_id,
  origin_id,
  outlet_id,
  unit_price,
  effective_from
)
select
  item.id,
  brand.id,
  origin.id,
  outlet.id,
  seed.unit_price,
  '2026-06-01'::date
from (values
  ('0001', 'TICAN', 'DENMARK', 'JALAN CHANNEL', 42.00),
  ('0003', 'RIVASAM', 'SPAIN', 'JALAN CHANNEL', 46.00),
  ('0006', null, null, 'SUNGAI MERAH', 18.50)
) as seed(item_code, brand_name, origin_name, outlet_name, unit_price)
join public.items item on item.item_code = seed.item_code
left join public.brands brand on brand.name = seed.brand_name
left join public.origins origin on origin.name = seed.origin_name
left join public.outlets outlet on outlet.name = seed.outlet_name
on conflict (item_id, brand_id, origin_id, outlet_id, effective_from) do update set
  unit_price = excluded.unit_price,
  is_active = true;

insert into public.customer_price_rules (
  customer_category_id,
  customer_id,
  item_id,
  brand_id,
  origin_id,
  outlet_id,
  unit_price,
  effective_from
)
select
  category.id,
  null::uuid,
  item.id,
  brand.id,
  origin.id,
  outlet.id,
  seed.unit_price,
  '2026-06-01'::date
from (values
  ('WHOLESALE', '0001', 'TICAN', 'DENMARK', 'JALAN CHANNEL', 38.00),
  ('VIP', '0003', 'RIVASAM', 'SPAIN', 'SUNGAI MERAH', 44.00),
  ('RETAIL', '0006', null, null, 'JALAN CHANNEL', 18.50)
) as seed(category_code, item_code, brand_name, origin_name, outlet_name, unit_price)
join public.customer_categories category on category.code = seed.category_code
join public.items item on item.item_code = seed.item_code
left join public.brands brand on brand.name = seed.brand_name
left join public.origins origin on origin.name = seed.origin_name
left join public.outlets outlet on outlet.name = seed.outlet_name
where not exists (
  select 1
  from public.customer_price_rules existing
  where existing.customer_category_id = category.id
    and existing.customer_id is null
    and existing.item_id = item.id
    and existing.brand_id is not distinct from brand.id
    and existing.origin_id is not distinct from origin.id
    and existing.outlet_id is not distinct from outlet.id
    and existing.effective_from = '2026-06-01'::date
);

insert into public.retail_cash_sessions (
  register_id,
  status,
  opening_float,
  expected_cash,
  closing_cash,
  opened_by,
  closed_by,
  opened_at,
  closed_at,
  notes
)
select
  register.id,
  'CLOSED'::public.retail_cash_session_status,
  200.00,
  720.00,
  720.00,
  first_profile.id,
  first_profile.id,
  '2026-06-10 08:00:00+08'::timestamptz,
  '2026-06-10 17:00:00+08'::timestamptz,
  'Seed retail cash session'
from public.retail_registers register
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where register.register_name = 'Jalan Channel Counter'
  and not exists (
    select 1
    from public.retail_cash_sessions existing
    where existing.register_id = register.id
      and existing.notes = 'Seed retail cash session'
  );

insert into public.retail_sales (
  sale_no,
  register_id,
  cash_session_id,
  customer_name,
  customer_phone,
  status,
  payment_status,
  subtotal_amount,
  discount_amount,
  tax_amount,
  total_amount,
  paid_amount,
  change_amount,
  sold_by,
  completed_at,
  notes
)
select
  'RS-20260610-001',
  register.id,
  cash_session.id,
  'Walk-in Customer',
  null,
  'COMPLETED'::public.retail_sale_status,
  'PAID'::public.retail_payment_status,
  189.00,
  0.00,
  0.00,
  189.00,
  200.00,
  11.00,
  first_profile.id,
  '2026-06-10 10:30:00+08'::timestamptz,
  'Seed retail sale'
from public.retail_registers register
left join public.retail_cash_sessions cash_session
  on cash_session.register_id = register.id
  and cash_session.notes = 'Seed retail cash session'
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where register.register_name = 'Jalan Channel Counter'
on conflict (sale_no) do update set
  register_id = excluded.register_id,
  cash_session_id = excluded.cash_session_id,
  customer_name = excluded.customer_name,
  customer_phone = excluded.customer_phone,
  status = excluded.status,
  payment_status = excluded.payment_status,
  subtotal_amount = excluded.subtotal_amount,
  discount_amount = excluded.discount_amount,
  tax_amount = excluded.tax_amount,
  total_amount = excluded.total_amount,
  paid_amount = excluded.paid_amount,
  change_amount = excluded.change_amount,
  sold_by = excluded.sold_by,
  completed_at = excluded.completed_at,
  notes = excluded.notes;

update public.delivery_orders delivery_order
set retail_sale_id = sale.id
from public.retail_sales sale
where delivery_order.order_no = 'DO-20260610-002'
  and sale.sale_no = 'RS-20260610-001';

insert into public.retail_sale_lines (
  sale_id,
  item_id,
  brand_id,
  origin_id,
  stock_location_id,
  quantity,
  weight_kg,
  unit_price,
  line_discount,
  notes
)
select
  sale.id,
  item.id,
  brand.id,
  origin.id,
  stock_location.id,
  4.500,
  4.500,
  42.00,
  0.00,
  'Seed retail sale line'
from public.retail_sales sale
join public.items item on item.item_code = '0001'
left join public.brands brand on brand.name = 'TICAN'
left join public.origins origin on origin.name = 'DENMARK'
left join public.stock_locations stock_location on stock_location.name = 'JALAN CHANNEL'
where sale.sale_no = 'RS-20260610-001'
  and not exists (
    select 1
    from public.retail_sale_lines existing
    where existing.sale_id = sale.id
      and existing.notes = 'Seed retail sale line'
  );

insert into public.retail_payments (
  sale_id,
  payment_method,
  payment_status,
  amount,
  reference_no,
  received_by,
  notes
)
select
  sale.id,
  'CASH'::public.retail_payment_method,
  'PAID'::public.retail_payment_status,
  200.00,
  sale.sale_no,
  first_profile.id,
  'Seed retail cash payment'
from public.retail_sales sale
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where sale.sale_no = 'RS-20260610-001'
  and not exists (
    select 1
    from public.retail_payments existing
    where existing.sale_id = sale.id
      and existing.notes = 'Seed retail cash payment'
  );

insert into public.retail_processing_batches (
  batch_no,
  outlet_id,
  department_id,
  stock_location_id,
  raw_item_id,
  raw_brand_id,
  raw_origin_id,
  raw_quantity,
  raw_weight_kg,
  finished_item_id,
  finished_brand_id,
  finished_origin_id,
  finished_quantity,
  finished_weight_kg,
  status,
  worker_id,
  processed_by,
  processed_at,
  notes
)
select
  'RP-20260610-001',
  outlet.id,
  department.id,
  stock_location.id,
  raw_item.id,
  raw_brand.id,
  raw_origin.id,
  10.000,
  100.000,
  finished_item.id,
  finished_brand.id,
  finished_origin.id,
  8.000,
  86.500,
  'COMPLETED'::public.retail_processing_status,
  first_profile.id,
  first_profile.id,
  '2026-06-10 09:00:00+08'::timestamptz,
  'Seed retail processing batch'
from public.outlets outlet
join public.departments department on department.name = 'Processing'
join public.stock_locations stock_location on stock_location.name = 'JALAN CHANNEL'
join public.items raw_item on raw_item.item_code = '0002'
join public.items finished_item on finished_item.item_code = '0001'
left join public.brands raw_brand on raw_brand.name = 'TICAN'
left join public.origins raw_origin on raw_origin.name = 'DENMARK'
left join public.brands finished_brand on finished_brand.name = 'TICAN'
left join public.origins finished_origin on finished_origin.name = 'DENMARK'
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where outlet.name = 'JALAN CHANNEL'
on conflict (batch_no) do update set
  outlet_id = excluded.outlet_id,
  department_id = excluded.department_id,
  stock_location_id = excluded.stock_location_id,
  raw_item_id = excluded.raw_item_id,
  raw_brand_id = excluded.raw_brand_id,
  raw_origin_id = excluded.raw_origin_id,
  raw_quantity = excluded.raw_quantity,
  raw_weight_kg = excluded.raw_weight_kg,
  finished_item_id = excluded.finished_item_id,
  finished_brand_id = excluded.finished_brand_id,
  finished_origin_id = excluded.finished_origin_id,
  finished_quantity = excluded.finished_quantity,
  finished_weight_kg = excluded.finished_weight_kg,
  status = excluded.status,
  worker_id = excluded.worker_id,
  processed_by = excluded.processed_by,
  processed_at = excluded.processed_at,
  notes = excluded.notes;

insert into public.retail_cleaning_tasks (
  outlet_id,
  department_id,
  task_name,
  frequency,
  due_date,
  status,
  created_by,
  notes
)
select
  outlet.id,
  department.id,
  seed.task_name,
  seed.frequency::public.retail_cleaning_frequency,
  seed.due_date::date,
  seed.status::public.retail_cleaning_status,
  first_profile.id,
  'Seed cleaning task'
from (values
  ('JALAN CHANNEL', 'Retail', 'Counter deep clean', 'DAILY', '2026-06-10', 'DONE'),
  ('JALAN CHANNEL', 'Retail', 'Waste bin sanitation', 'DAILY', '2026-06-10', 'MISSED'),
  ('JALAN CHANNEL', 'Stock', 'Display chiller cleaning', 'WEEKLY', '2026-06-12', 'PENDING'),
  ('SUNGAI MERAH', 'Retail', 'Freezer gasket inspection', 'MONTHLY', '2026-06-30', 'PENDING'),
  ('SUNGAI MERAH', 'Processing', 'Quarterly drain sanitation', 'QUARTERLY', '2026-06-30', 'PENDING')
) as seed(outlet_name, department_name, task_name, frequency, due_date, status)
join public.outlets outlet on outlet.name = seed.outlet_name
left join public.departments department on department.name = seed.department_name
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where not exists (
  select 1
  from public.retail_cleaning_tasks existing
  where existing.outlet_id = outlet.id
    and existing.task_name = seed.task_name
    and existing.due_date = seed.due_date::date
);

insert into public.retail_expenses (
  outlet_id,
  expense_date,
  category,
  vendor,
  amount,
  payment_method,
  status,
  receipt_url,
  submitted_by,
  notes
)
select
  outlet.id,
  '2026-06-10'::date,
  'Cleaning Supplies',
  'Local Supplier',
  68.90,
  'CASH'::public.retail_payment_method,
  'SUBMITTED'::public.retail_expense_status,
  'receipts/jalan-channel/2026-06-10-cleaning-supplies.jpg',
  first_profile.id,
  'Seed retail outlet expense'
from public.outlets outlet
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where outlet.name = 'JALAN CHANNEL'
  and not exists (
    select 1
    from public.retail_expenses existing
    where existing.outlet_id = outlet.id
      and existing.notes = 'Seed retail outlet expense'
  );

insert into public.finance_invoices (
  invoice_no,
  invoice_type,
  party_name,
  invoice_date,
  due_date,
  amount,
  tax_amount,
  item_list,
  payment_status,
  status,
  related_module,
  created_by,
  notes
)
select
  seed.invoice_no,
  seed.invoice_type::public.finance_invoice_type,
  seed.party_name,
  seed.invoice_date::date,
  seed.due_date::date,
  seed.amount,
  seed.tax_amount,
  seed.item_list,
  seed.payment_status,
  seed.status::public.finance_invoice_status,
  seed.related_module,
  first_profile.id,
  seed.notes
from (values
  (
    'AR-20260610-001',
    'AR',
    'Sungai Merah Retail',
    '2026-06-10',
    '2026-06-20',
    520.00,
    0.00,
    'Delivery invoice for outlet replenishment',
    'UNPAID',
    'SUBMITTED',
    'delivery',
    'Seed AR invoice'
  ),
  (
    'AP-20260610-001',
    'AP',
    'Cold Chain Supplier',
    '2026-06-10',
    '2026-06-25',
    1280.00,
    0.00,
    'Cold chain container service',
    'UNPAID',
    'ACCOUNT_REVIEWED',
    'container',
    'Seed AP invoice'
  )
) as seed(
  invoice_no,
  invoice_type,
  party_name,
  invoice_date,
  due_date,
  amount,
  tax_amount,
  item_list,
  payment_status,
  status,
  related_module,
  notes
)
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
on conflict (invoice_no) do update set
  invoice_type = excluded.invoice_type,
  party_name = excluded.party_name,
  invoice_date = excluded.invoice_date,
  due_date = excluded.due_date,
  amount = excluded.amount,
  tax_amount = excluded.tax_amount,
  item_list = excluded.item_list,
  payment_status = excluded.payment_status,
  status = excluded.status,
  related_module = excluded.related_module,
  created_by = excluded.created_by,
  notes = excluded.notes;

insert into public.finance_containers (
  container_no,
  supplier_name,
  eta_date,
  arrival_date,
  status,
  total_cost,
  currency,
  invoice_id,
  updated_by,
  notes
)
select
  'CONT-20260610-001',
  'Cold Chain Supplier',
  '2026-06-18'::date,
  null::date,
  'IN_TRANSIT'::public.container_status,
  1280.00,
  'MYR',
  invoice.id,
  first_profile.id,
  'Seed container'
from public.finance_invoices invoice
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
where invoice.invoice_no = 'AP-20260610-001'
on conflict (container_no) do update set
  supplier_name = excluded.supplier_name,
  eta_date = excluded.eta_date,
  arrival_date = excluded.arrival_date,
  status = excluded.status,
  total_cost = excluded.total_cost,
  currency = excluded.currency,
  invoice_id = excluded.invoice_id,
  updated_by = excluded.updated_by,
  notes = excluded.notes;

insert into public.director_report_snapshots (
  report_no,
  report_type,
  period_start,
  period_end,
  total_sales,
  cash_collected,
  outstanding_ar,
  outstanding_ap,
  stock_value,
  expense_total,
  generated_by,
  notes
)
select
  'DR-20260610-001',
  'DAILY'::public.director_report_type,
  '2026-06-10'::date,
  '2026-06-10'::date,
  189.00,
  200.00,
  520.00,
  1280.00,
  0.00,
  68.90,
  first_profile.id,
  'Seed director daily snapshot'
from (select 1) seed
left join lateral (
  select id
  from public.profiles
  order by created_at
  limit 1
) first_profile on true
on conflict (report_no) do update set
  report_type = excluded.report_type,
  period_start = excluded.period_start,
  period_end = excluded.period_end,
  total_sales = excluded.total_sales,
  cash_collected = excluded.cash_collected,
  outstanding_ar = excluded.outstanding_ar,
  outstanding_ap = excluded.outstanding_ap,
  stock_value = excluded.stock_value,
  expense_total = excluded.expense_total,
  generated_by = excluded.generated_by,
  notes = excluded.notes;
