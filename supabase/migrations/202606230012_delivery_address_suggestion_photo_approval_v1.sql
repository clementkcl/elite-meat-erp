alter table public.delivery_address_suggestions
  add column if not exists photo_file_id uuid references public.files(id) on delete set null,
  add column if not exists bucket_id text not null default 'delivery-proofs',
  add column if not exists object_path text,
  add column if not exists photo_mime_type text,
  add column if not exists photo_size_bytes bigint;

create index if not exists idx_delivery_address_suggestions_customer_status
on public.delivery_address_suggestions(customer_id, status);
