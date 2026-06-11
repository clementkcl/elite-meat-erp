do $$
begin
  create type public.delivery_status as enum (
    'DRAFT',
    'ASSIGNED',
    'LOADING',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.delivery_payment_type as enum (
    'CREDIT',
    'CASH',
    'ONLINE_TRANSFER'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.delivery_payment_status as enum (
    'PENDING',
    'PARTIAL',
    'PAID',
    'WAIVED'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.can_manage_delivery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('general_worker')
    or public.has_role('retail_team')
    or public.has_role('admin')
    or public.has_role('director');
$$;

create or replace function public.can_administer_delivery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('director');
$$;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_no text not null unique,
  vehicle_type text not null default 'LORRY',
  capacity_kg numeric(12, 3),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_name text not null,
  customer_phone text,
  customer_location text not null,
  delivery_address text not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null,
  status public.delivery_status not null default 'DRAFT',
  payment_type public.delivery_payment_type not null default 'CASH',
  payment_status public.delivery_payment_status not null default 'PENDING',
  requested_delivery_date date,
  proof_file_id uuid references public.files(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.delivery_orders(id) on delete cascade,
  item_description text not null,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  weight_kg numeric(12, 3) not null default 0 check (weight_kg >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.delivery_orders(id) on delete cascade,
  status public.delivery_status not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.driver_locations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.delivery_orders(id) on delete cascade,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  location_note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.delivery_orders(id) on delete cascade,
  payment_type public.delivery_payment_type not null,
  payment_status public.delivery_payment_status not null default 'PENDING',
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  reference_no text,
  notes text,
  received_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_delivery_orders_status on public.delivery_orders(status);
create index if not exists idx_delivery_orders_driver on public.delivery_orders(driver_id);
create index if not exists idx_delivery_orders_created_at on public.delivery_orders(created_at desc);
create index if not exists idx_delivery_order_items_order on public.delivery_order_items(order_id);
create index if not exists idx_delivery_status_logs_order on public.delivery_status_logs(order_id, created_at desc);
create index if not exists idx_driver_locations_order on public.driver_locations(order_id, created_at desc);
create index if not exists idx_delivery_payments_order on public.delivery_payments(order_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['vehicles', 'delivery_orders']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

alter table public.vehicles enable row level security;
alter table public.delivery_orders enable row level security;
alter table public.delivery_order_items enable row level security;
alter table public.delivery_status_logs enable row level security;
alter table public.driver_locations enable row level security;
alter table public.delivery_payments enable row level security;

drop policy if exists "authenticated can read vehicles" on public.vehicles;
drop policy if exists "delivery operators can insert vehicles" on public.vehicles;
drop policy if exists "delivery operators can update vehicles" on public.vehicles;
drop policy if exists "delivery admins can delete vehicles" on public.vehicles;
drop policy if exists "authenticated can read vehicles" on public.vehicles;
create policy "authenticated can read vehicles"
on public.vehicles for select to authenticated using (true);
drop policy if exists "delivery operators can insert vehicles" on public.vehicles;
create policy "delivery operators can insert vehicles"
on public.vehicles for insert to authenticated with check (
  public.can_manage_delivery() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "delivery operators can update vehicles" on public.vehicles;
create policy "delivery operators can update vehicles"
on public.vehicles for update to authenticated
using (public.can_manage_delivery())
with check (public.can_manage_delivery());
drop policy if exists "delivery admins can delete vehicles" on public.vehicles;
create policy "delivery admins can delete vehicles"
on public.vehicles for delete to authenticated using (public.can_administer_delivery());

drop policy if exists "authenticated can read delivery orders" on public.delivery_orders;
drop policy if exists "delivery operators can insert delivery orders" on public.delivery_orders;
drop policy if exists "delivery operators can update delivery orders" on public.delivery_orders;
drop policy if exists "delivery admins can delete delivery orders" on public.delivery_orders;
drop policy if exists "authenticated can read delivery orders" on public.delivery_orders;
create policy "authenticated can read delivery orders"
on public.delivery_orders for select to authenticated using (true);
drop policy if exists "delivery operators can insert delivery orders" on public.delivery_orders;
create policy "delivery operators can insert delivery orders"
on public.delivery_orders for insert to authenticated with check (
  public.can_manage_delivery() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "delivery operators can update delivery orders" on public.delivery_orders;
create policy "delivery operators can update delivery orders"
on public.delivery_orders for update to authenticated
using (public.can_manage_delivery() or created_by = auth.uid() or driver_id = auth.uid())
with check (public.can_manage_delivery() or created_by = auth.uid() or driver_id = auth.uid());
drop policy if exists "delivery admins can delete delivery orders" on public.delivery_orders;
create policy "delivery admins can delete delivery orders"
on public.delivery_orders for delete to authenticated using (public.can_administer_delivery());

drop policy if exists "authenticated can read delivery order items" on public.delivery_order_items;
drop policy if exists "delivery operators can insert delivery order items" on public.delivery_order_items;
drop policy if exists "delivery operators can update delivery order items" on public.delivery_order_items;
drop policy if exists "delivery admins can delete delivery order items" on public.delivery_order_items;
drop policy if exists "authenticated can read delivery order items" on public.delivery_order_items;
create policy "authenticated can read delivery order items"
on public.delivery_order_items for select to authenticated using (true);
drop policy if exists "delivery operators can insert delivery order items" on public.delivery_order_items;
create policy "delivery operators can insert delivery order items"
on public.delivery_order_items for insert to authenticated with check (
  public.can_manage_delivery() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "delivery operators can update delivery order items" on public.delivery_order_items;
create policy "delivery operators can update delivery order items"
on public.delivery_order_items for update to authenticated
using (public.can_manage_delivery() or created_by = auth.uid())
with check (public.can_manage_delivery() or created_by = auth.uid());
drop policy if exists "delivery admins can delete delivery order items" on public.delivery_order_items;
create policy "delivery admins can delete delivery order items"
on public.delivery_order_items for delete to authenticated using (public.can_administer_delivery());

drop policy if exists "authenticated can read delivery status logs" on public.delivery_status_logs;
drop policy if exists "delivery operators can insert delivery status logs" on public.delivery_status_logs;
drop policy if exists "delivery admins can delete delivery status logs" on public.delivery_status_logs;
drop policy if exists "authenticated can read delivery status logs" on public.delivery_status_logs;
create policy "authenticated can read delivery status logs"
on public.delivery_status_logs for select to authenticated using (true);
drop policy if exists "delivery operators can insert delivery status logs" on public.delivery_status_logs;
create policy "delivery operators can insert delivery status logs"
on public.delivery_status_logs for insert to authenticated with check (
  public.can_manage_delivery() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "delivery admins can delete delivery status logs" on public.delivery_status_logs;
create policy "delivery admins can delete delivery status logs"
on public.delivery_status_logs for delete to authenticated using (public.can_administer_delivery());

drop policy if exists "authenticated can read driver locations" on public.driver_locations;
drop policy if exists "delivery operators can insert driver locations" on public.driver_locations;
drop policy if exists "delivery admins can delete driver locations" on public.driver_locations;
drop policy if exists "authenticated can read driver locations" on public.driver_locations;
create policy "authenticated can read driver locations"
on public.driver_locations for select to authenticated using (true);
drop policy if exists "delivery operators can insert driver locations" on public.driver_locations;
create policy "delivery operators can insert driver locations"
on public.driver_locations for insert to authenticated with check (
  public.can_manage_delivery() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "delivery admins can delete driver locations" on public.driver_locations;
create policy "delivery admins can delete driver locations"
on public.driver_locations for delete to authenticated using (public.can_administer_delivery());

drop policy if exists "authenticated can read delivery payments" on public.delivery_payments;
drop policy if exists "delivery operators can insert delivery payments" on public.delivery_payments;
drop policy if exists "delivery operators can update delivery payments" on public.delivery_payments;
drop policy if exists "delivery admins can delete delivery payments" on public.delivery_payments;
drop policy if exists "authenticated can read delivery payments" on public.delivery_payments;
create policy "authenticated can read delivery payments"
on public.delivery_payments for select to authenticated using (true);
drop policy if exists "delivery operators can insert delivery payments" on public.delivery_payments;
create policy "delivery operators can insert delivery payments"
on public.delivery_payments for insert to authenticated with check (
  public.can_manage_delivery() and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "delivery operators can update delivery payments" on public.delivery_payments;
create policy "delivery operators can update delivery payments"
on public.delivery_payments for update to authenticated
using (public.can_manage_delivery() or created_by = auth.uid())
with check (public.can_manage_delivery() or created_by = auth.uid());
drop policy if exists "delivery admins can delete delivery payments" on public.delivery_payments;
create policy "delivery admins can delete delivery payments"
on public.delivery_payments for delete to authenticated using (public.can_administer_delivery());
