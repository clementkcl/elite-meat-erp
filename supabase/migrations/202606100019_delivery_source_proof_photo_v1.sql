alter table public.delivery_orders
  add column if not exists source_type text not null default 'manual'
    check (source_type in ('manual', 'retail_sale', 'whatsapp')),
  add column if not exists source_reference text,
  add column if not exists retail_sale_id uuid references public.retail_sales(id) on delete set null;

create index if not exists idx_delivery_orders_source_type
on public.delivery_orders(source_type);

create index if not exists idx_delivery_orders_retail_sale
on public.delivery_orders(retail_sale_id);
