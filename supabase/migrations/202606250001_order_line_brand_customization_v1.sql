alter table public.items
  add column if not exists order_customization_options jsonb not null default
    '{"Cut Style":["Standard"],"Thickness":["Standard"],"Packing":["Standard"]}'::jsonb,
  add column if not exists order_default_customization jsonb not null default
    '{"Cut Style":["Standard"],"Thickness":["Standard"],"Packing":["Standard"]}'::jsonb;

alter table public.customer_order_items
  add column if not exists preferred_brand_id uuid references public.brands(id) on delete set null,
  add column if not exists customization jsonb not null default '{}'::jsonb;

alter table public.order_stock_reservations
  add column if not exists preferred_brand_id uuid references public.brands(id) on delete set null;

create index if not exists idx_customer_order_items_preferred_brand
on public.customer_order_items(preferred_brand_id);

create index if not exists idx_order_stock_reservations_preferred_brand
on public.order_stock_reservations(item_id, preferred_brand_id, status)
where status = 'ACTIVE';
