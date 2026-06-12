alter type public.stock_movement_type add value if not exists 'OUTBOUND_PROCESSING';
alter type public.stock_movement_type add value if not exists 'OUTBOUND_SPOILED';

create table if not exists public.stock_outbound_batches (
  id uuid primary key default gen_random_uuid(),
  batch_no text not null unique,
  order_id uuid not null references public.customer_orders(id) on delete restrict,
  outbound_type text not null check (outbound_type in ('SALES', 'TRANSFER', 'PROCESSING', 'SPOILED')),
  from_location_id uuid not null references public.stock_locations(id) on delete restrict,
  to_location_id uuid references public.stock_locations(id) on delete restrict,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'CANCELLED')),
  total_units integer not null default 0 check (total_units >= 0),
  total_weight_kg numeric(12, 3) not null default 0 check (total_weight_kg >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_outbound_batch_lines (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.stock_outbound_batches(id) on delete cascade,
  order_id uuid not null references public.customer_orders(id) on delete restrict,
  stock_unit_id uuid not null references public.stock_units(id) on delete restrict,
  barcode text not null,
  item_id uuid not null references public.items(id) on delete restrict,
  from_location_id uuid not null references public.stock_locations(id) on delete restrict,
  to_location_id uuid references public.stock_locations(id) on delete restrict,
  weight_kg numeric(12, 3) not null default 0 check (weight_kg >= 0),
  outbound_type text not null check (outbound_type in ('SALES', 'TRANSFER', 'PROCESSING', 'SPOILED')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (batch_id, barcode)
);

create index if not exists idx_stock_outbound_batches_order
on public.stock_outbound_batches(order_id, created_at desc);

create index if not exists idx_stock_outbound_batches_scope
on public.stock_outbound_batches(from_location_id, outbound_type, created_at desc);

create index if not exists idx_stock_outbound_batch_lines_batch
on public.stock_outbound_batch_lines(batch_id);

create index if not exists idx_stock_outbound_batch_lines_unit
on public.stock_outbound_batch_lines(stock_unit_id, created_at desc);

drop trigger if exists set_stock_outbound_batches_updated_at on public.stock_outbound_batches;
create trigger set_stock_outbound_batches_updated_at
  before update on public.stock_outbound_batches
  for each row execute function public.set_updated_at();

create or replace function public.can_access_stock_outbound_batch(target_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stock_outbound_batches batch
    where batch.id = target_batch_id
      and public.can_access_customer_order(batch.order_id)
      and (
        public.can_administer_stock()
        or public.can_access_stock_location(batch.from_location_id)
        or public.can_access_stock_location(batch.to_location_id)
      )
  );
$$;

alter table public.stock_outbound_batches enable row level security;
alter table public.stock_outbound_batch_lines enable row level security;

drop policy if exists "stock users can read scoped outbound batches" on public.stock_outbound_batches;
create policy "stock users can read scoped outbound batches"
on public.stock_outbound_batches for select to authenticated
using (
  public.can_access_customer_order(order_id)
  and (
    public.can_administer_stock()
    or public.can_access_stock_location(from_location_id)
    or public.can_access_stock_location(to_location_id)
  )
);

drop policy if exists "stock users can insert scoped outbound batches" on public.stock_outbound_batches;
create policy "stock users can insert scoped outbound batches"
on public.stock_outbound_batches for insert to authenticated
with check (
  public.can_manage_stock()
  and public.can_access_customer_order(order_id)
  and public.can_access_stock_location(from_location_id)
  and (created_by = auth.uid() or created_by is null)
  and (confirmed_by = auth.uid() or confirmed_by is null)
);

drop policy if exists "stock users can update scoped outbound batches" on public.stock_outbound_batches;
create policy "stock users can update scoped outbound batches"
on public.stock_outbound_batches for update to authenticated
using (
  public.can_manage_stock()
  and public.can_access_customer_order(order_id)
  and public.can_access_stock_location(from_location_id)
)
with check (
  public.can_manage_stock()
  and public.can_access_customer_order(order_id)
  and public.can_access_stock_location(from_location_id)
);

drop policy if exists "stock admins can delete outbound batches" on public.stock_outbound_batches;
create policy "stock admins can delete outbound batches"
on public.stock_outbound_batches for delete to authenticated
using (public.can_administer_stock());

drop policy if exists "stock users can read scoped outbound batch lines" on public.stock_outbound_batch_lines;
create policy "stock users can read scoped outbound batch lines"
on public.stock_outbound_batch_lines for select to authenticated
using (
  public.can_access_stock_outbound_batch(batch_id)
  and public.can_access_customer_order(order_id)
);

drop policy if exists "stock users can insert scoped outbound batch lines" on public.stock_outbound_batch_lines;
create policy "stock users can insert scoped outbound batch lines"
on public.stock_outbound_batch_lines for insert to authenticated
with check (
  public.can_manage_stock()
  and public.can_access_stock_outbound_batch(batch_id)
  and public.can_access_customer_order(order_id)
  and public.can_access_stock_location(from_location_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "stock admins can delete outbound batch lines" on public.stock_outbound_batch_lines;
create policy "stock admins can delete outbound batch lines"
on public.stock_outbound_batch_lines for delete to authenticated
using (public.can_administer_stock());
