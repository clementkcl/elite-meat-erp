do $$
begin
  create type public.customer_order_status as enum (
    'NEW',
    'PREPARING',
    'READY',
    'READY_FOR_PICKUP',
    'READY_FOR_DELIVERY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.customer_order_fulfillment as enum ('PICKUP', 'DELIVERY');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.customer_order_item_status as enum (
    'REQUESTED',
    'PREPARING',
    'PREPARED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_notification_event_type as enum (
    'READY_TO_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_name text not null,
  customer_phone text,
  order_date date not null default current_date,
  required_date date,
  fulfillment_type public.customer_order_fulfillment not null default 'PICKUP',
  delivery_required boolean not null default false,
  status public.customer_order_status not null default 'NEW',
  remarks text,
  outlet_id uuid references public.outlets(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  requested_quantity numeric(12, 3) not null default 0 check (requested_quantity >= 0),
  requested_weight_kg numeric(12, 3) not null default 0 check (requested_weight_kg >= 0),
  prepared_quantity numeric(12, 3) not null default 0 check (prepared_quantity >= 0),
  prepared_weight_kg numeric(12, 3) not null default 0 check (prepared_weight_kg >= 0),
  prepared_by uuid references public.profiles(id) on delete set null,
  prepared_at timestamptz,
  status public.customer_order_item_status not null default 'REQUESTED',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_preparation_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete cascade,
  order_item_id uuid references public.customer_order_items(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  prepared_quantity numeric(12, 3) not null default 0,
  prepared_weight_kg numeric(12, 3) not null default 0,
  prepared_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_notification_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete cascade,
  event_type public.order_notification_event_type not null,
  channel text not null default 'WHATSAPP',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  created_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_orders_scope_status
on public.customer_orders(outlet_id, department_id, status);

create index if not exists idx_customer_order_items_order
on public.customer_order_items(order_id);

create index if not exists idx_order_preparation_logs_order
on public.order_preparation_logs(order_id);

create index if not exists idx_order_notification_events_order
on public.order_notification_events(order_id, event_type);

drop trigger if exists set_customer_orders_updated_at on public.customer_orders;
create trigger set_customer_orders_updated_at
  before update on public.customer_orders
  for each row execute function public.set_updated_at();

drop trigger if exists set_customer_order_items_updated_at on public.customer_order_items;
create trigger set_customer_order_items_updated_at
  before update on public.customer_order_items
  for each row execute function public.set_updated_at();

create or replace function public.can_access_customer_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customer_orders customer_order
    where customer_order.id = target_order_id
      and (
        public.is_admin_or_director()
        or public.can_access_work_scope(customer_order.outlet_id, customer_order.department_id)
      )
  );
$$;

create or replace function public.can_manage_customer_orders()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('retail_team_general_worker')
    or public.has_role('retail_manager')
    or public.has_role('processing_team_general_worker')
    or public.has_role('processing_manager')
    or public.has_role('delivery_team_general_worker')
    or public.has_role('delivery_manager')
    or public.has_role('admin')
    or public.has_role('director');
$$;

alter table public.customer_orders enable row level security;
alter table public.customer_order_items enable row level security;
alter table public.order_preparation_logs enable row level security;
alter table public.order_notification_events enable row level security;

drop policy if exists "orders users can read scoped orders" on public.customer_orders;
create policy "orders users can read scoped orders"
on public.customer_orders for select to authenticated
using (
  public.is_admin_or_director()
  or public.can_access_work_scope(outlet_id, department_id)
);

drop policy if exists "orders users can insert scoped orders" on public.customer_orders;
create policy "orders users can insert scoped orders"
on public.customer_orders for insert to authenticated
with check (
  public.can_manage_customer_orders()
  and created_by = auth.uid()
  and (
    public.is_admin_or_director()
    or public.can_access_work_scope(outlet_id, department_id)
  )
);

drop policy if exists "orders users can update scoped orders" on public.customer_orders;
create policy "orders users can update scoped orders"
on public.customer_orders for update to authenticated
using (
  public.can_manage_customer_orders()
  and (
    public.is_admin_or_director()
    or public.can_access_work_scope(outlet_id, department_id)
  )
)
with check (
  public.can_manage_customer_orders()
  and (
    public.is_admin_or_director()
    or public.can_access_work_scope(outlet_id, department_id)
  )
);

drop policy if exists "orders admins can delete orders" on public.customer_orders;
create policy "orders admins can delete orders"
on public.customer_orders for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "orders users can read scoped order items" on public.customer_order_items;
create policy "orders users can read scoped order items"
on public.customer_order_items for select to authenticated
using (public.can_access_customer_order(order_id));

drop policy if exists "orders users can insert scoped order items" on public.customer_order_items;
create policy "orders users can insert scoped order items"
on public.customer_order_items for insert to authenticated
with check (
  public.can_manage_customer_orders()
  and public.can_access_customer_order(order_id)
);

drop policy if exists "orders users can update scoped order items" on public.customer_order_items;
create policy "orders users can update scoped order items"
on public.customer_order_items for update to authenticated
using (
  public.can_manage_customer_orders()
  and public.can_access_customer_order(order_id)
)
with check (
  public.can_manage_customer_orders()
  and public.can_access_customer_order(order_id)
);

drop policy if exists "orders admins can delete order items" on public.customer_order_items;
create policy "orders admins can delete order items"
on public.customer_order_items for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "orders users can read preparation logs" on public.order_preparation_logs;
create policy "orders users can read preparation logs"
on public.order_preparation_logs for select to authenticated
using (public.can_access_customer_order(order_id));

drop policy if exists "orders users can insert preparation logs" on public.order_preparation_logs;
create policy "orders users can insert preparation logs"
on public.order_preparation_logs for insert to authenticated
with check (
  prepared_by = auth.uid()
  and public.can_manage_customer_orders()
  and public.can_access_customer_order(order_id)
);

drop policy if exists "orders users can read notification events" on public.order_notification_events;
create policy "orders users can read notification events"
on public.order_notification_events for select to authenticated
using (public.can_access_customer_order(order_id));

drop policy if exists "orders users can insert notification events" on public.order_notification_events;
create policy "orders users can insert notification events"
on public.order_notification_events for insert to authenticated
with check (
  public.can_manage_customer_orders()
  and public.can_access_customer_order(order_id)
);
