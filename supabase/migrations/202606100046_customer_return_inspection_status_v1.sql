-- Customer-return stock should be held for inspection before becoming sellable.
-- Safe to re-run in Supabase SQL Editor.

alter type public.stock_unit_status add value if not exists 'HOLD';
alter type public.stock_unit_status add value if not exists 'INSPECTION';

comment on type public.stock_unit_status is
  'Barcode stock unit status. Customer returns use HOLD/INSPECTION before sellable stock.';
