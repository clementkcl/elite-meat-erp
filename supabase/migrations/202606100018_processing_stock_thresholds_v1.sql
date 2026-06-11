alter table public.items
  add column if not exists processing_min_yield_percent numeric(8, 2)
    check (
      processing_min_yield_percent is null
      or (
        processing_min_yield_percent >= 0
        and processing_min_yield_percent <= 100
      )
    ),
  add column if not exists processing_max_loss_percent numeric(8, 2)
    check (
      processing_max_loss_percent is null
      or (
        processing_max_loss_percent >= 0
        and processing_max_loss_percent <= 100
      )
    );

comment on column public.items.processing_min_yield_percent is
  'Minimum expected processing yield percentage when this item is the finished item.';

comment on column public.items.processing_max_loss_percent is
  'Maximum expected processing loss percentage when this item is the finished item.';
