-- Delivery Module V1 - future truck GPS provider preparation.
-- This prepares provider references, current vehicle location, ETA/delay/fuel fields,
-- and 3-day snapshot retention without adding a live map dashboard.

create table if not exists public.truck_gps_providers (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null unique,
  api_base_url text,
  api_reference text,
  sync_interval_seconds integer not null default 10
    check (sync_interval_seconds > 0),
  is_active boolean not null default true,
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicles
  add column if not exists gps_provider_id uuid references public.truck_gps_providers(id) on delete set null,
  add column if not exists gps_provider_vehicle_ref text,
  add column if not exists gps_enabled boolean not null default false,
  add column if not exists gps_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.truck_gps_snapshots (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete set null,
  provider_name text,
  provider_vehicle_ref text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  speed_kmh numeric(8, 2),
  fuel_percent numeric(5, 2),
  eta_minutes integer,
  delay_minutes integer,
  synced_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 days'),
  created_at timestamptz not null default now()
);

alter table public.truck_gps_snapshots
  add column if not exists provider_id uuid references public.truck_gps_providers(id) on delete set null,
  add column if not exists provider_snapshot_ref text,
  add column if not exists outlet_id uuid references public.outlets(id) on delete set null,
  add column if not exists delivery_team_id uuid references public.departments(id) on delete set null,
  add column if not exists heading_degrees numeric(6, 2),
  add column if not exists odometer_km numeric(12, 2),
  add column if not exists engine_on boolean,
  add column if not exists battery_percent numeric(5, 2),
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

create table if not exists public.vehicle_current_locations (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete set null,
  provider_id uuid references public.truck_gps_providers(id) on delete set null,
  provider_name text,
  provider_vehicle_ref text,
  provider_snapshot_ref text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  speed_kmh numeric(8, 2),
  heading_degrees numeric(6, 2),
  fuel_percent numeric(5, 2),
  odometer_km numeric(12, 2),
  engine_on boolean,
  battery_percent numeric(5, 2),
  eta_minutes integer,
  delay_minutes integer,
  snapshot_id uuid references public.truck_gps_snapshots(id) on delete set null,
  outlet_id uuid references public.outlets(id) on delete set null,
  delivery_team_id uuid references public.departments(id) on delete set null,
  synced_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.truck_gps_snapshots snapshot
set provider_id = coalesce(
  snapshot.provider_id,
  (
    select provider.id
    from public.truck_gps_providers provider
    where provider.provider_name = snapshot.provider_name
  )
)
where snapshot.provider_id is null
  and snapshot.provider_name is not null;

update public.truck_gps_snapshots snapshot
set
  outlet_id = coalesce(
    snapshot.outlet_id,
    (
      select delivery.outlet_id
      from public.deliveries delivery
      where delivery.id = snapshot.delivery_id
    )
  ),
  delivery_team_id = coalesce(
    snapshot.delivery_team_id,
    (
      select delivery.delivery_team_id
      from public.deliveries delivery
      where delivery.id = snapshot.delivery_id
    ),
    (
      select vehicle.delivery_team_id
      from public.vehicles vehicle
      where vehicle.id = snapshot.vehicle_id
    )
  )
where snapshot.outlet_id is null
   or snapshot.delivery_team_id is null;

insert into public.vehicle_current_locations (
  vehicle_id,
  delivery_id,
  provider_id,
  provider_name,
  provider_vehicle_ref,
  provider_snapshot_ref,
  latitude,
  longitude,
  speed_kmh,
  heading_degrees,
  fuel_percent,
  odometer_km,
  engine_on,
  battery_percent,
  eta_minutes,
  delay_minutes,
  snapshot_id,
  outlet_id,
  delivery_team_id,
  synced_at,
  raw_payload
)
select distinct on (snapshot.vehicle_id)
  snapshot.vehicle_id,
  snapshot.delivery_id,
  snapshot.provider_id,
  snapshot.provider_name,
  snapshot.provider_vehicle_ref,
  snapshot.provider_snapshot_ref,
  snapshot.latitude,
  snapshot.longitude,
  snapshot.speed_kmh,
  snapshot.heading_degrees,
  snapshot.fuel_percent,
  snapshot.odometer_km,
  snapshot.engine_on,
  snapshot.battery_percent,
  snapshot.eta_minutes,
  snapshot.delay_minutes,
  snapshot.id,
  snapshot.outlet_id,
  snapshot.delivery_team_id,
  snapshot.synced_at,
  snapshot.raw_payload
from public.truck_gps_snapshots snapshot
where snapshot.vehicle_id is not null
order by snapshot.vehicle_id, snapshot.synced_at desc
on conflict (vehicle_id) do update set
  delivery_id = excluded.delivery_id,
  provider_id = excluded.provider_id,
  provider_name = excluded.provider_name,
  provider_vehicle_ref = excluded.provider_vehicle_ref,
  provider_snapshot_ref = excluded.provider_snapshot_ref,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  speed_kmh = excluded.speed_kmh,
  heading_degrees = excluded.heading_degrees,
  fuel_percent = excluded.fuel_percent,
  odometer_km = excluded.odometer_km,
  engine_on = excluded.engine_on,
  battery_percent = excluded.battery_percent,
  eta_minutes = excluded.eta_minutes,
  delay_minutes = excluded.delay_minutes,
  snapshot_id = excluded.snapshot_id,
  outlet_id = excluded.outlet_id,
  delivery_team_id = excluded.delivery_team_id,
  synced_at = excluded.synced_at,
  raw_payload = excluded.raw_payload,
  updated_at = now();

create index if not exists idx_truck_gps_providers_active
  on public.truck_gps_providers(is_active, provider_name);

create index if not exists idx_vehicles_gps_provider_ref
  on public.vehicles(gps_provider_id, gps_provider_vehicle_ref)
  where gps_enabled = true;

create index if not exists idx_truck_gps_snapshots_scope_sync
  on public.truck_gps_snapshots(outlet_id, delivery_team_id, synced_at desc);

create index if not exists idx_truck_gps_snapshots_expires_at
  on public.truck_gps_snapshots(expires_at);

create index if not exists idx_vehicle_current_locations_scope
  on public.vehicle_current_locations(outlet_id, delivery_team_id, synced_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'truck_gps_providers',
    'vehicle_current_locations'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

alter table public.truck_gps_providers enable row level security;
alter table public.vehicle_current_locations enable row level security;

drop policy if exists "delivery users can read gps providers" on public.truck_gps_providers;
create policy "delivery users can read gps providers"
on public.truck_gps_providers for select to authenticated
using (
  is_active = true
  and (
    public.has_role('delivery_manager')
    or public.is_admin_or_director()
  )
);

drop policy if exists "admins can write gps providers" on public.truck_gps_providers;
create policy "admins can write gps providers"
on public.truck_gps_providers for all to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "delivery users can read truck gps snapshots" on public.truck_gps_snapshots;
create policy "delivery users can read truck gps snapshots"
on public.truck_gps_snapshots for select to authenticated
using (
  synced_at >= now() - interval '3 days'
  and (
    public.is_admin_or_director()
    or public.can_review_delivery_scope(outlet_id, delivery_team_id)
    or exists (
      select 1
      from public.deliveries delivery
      where delivery.id = delivery_id
        and delivery.status = 'OUT_FOR_DELIVERY'
        and public.can_access_delivery(delivery.id)
    )
  )
);

drop policy if exists "admins can write truck gps snapshots" on public.truck_gps_snapshots;
create policy "admins can write truck gps snapshots"
on public.truck_gps_snapshots for all to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "delivery users can read vehicle current locations" on public.vehicle_current_locations;
create policy "delivery users can read vehicle current locations"
on public.vehicle_current_locations for select to authenticated
using (
  synced_at >= now() - interval '3 days'
  and (
    public.is_admin_or_director()
    or public.can_review_delivery_scope(outlet_id, delivery_team_id)
    or exists (
      select 1
      from public.deliveries delivery
      where delivery.id = delivery_id
        and delivery.status = 'OUT_FOR_DELIVERY'
        and public.can_access_delivery(delivery.id)
    )
  )
);

drop policy if exists "admins can write vehicle current locations" on public.vehicle_current_locations;
create policy "admins can write vehicle current locations"
on public.vehicle_current_locations for all to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

comment on table public.truck_gps_providers is
  'Future truck GPS provider API references. Sync target is every 10 seconds when integration is enabled.';

comment on table public.truck_gps_snapshots is
  'Truck GPS trail snapshots. Rows are intended to be retained for 3 days only.';

comment on table public.vehicle_current_locations is
  'Latest known vehicle GPS location for future manager map and customer tracking. Customer tracking should be exposed only while delivery is OUT_FOR_DELIVERY.';
