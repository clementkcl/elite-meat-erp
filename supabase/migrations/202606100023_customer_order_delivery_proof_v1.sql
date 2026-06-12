alter table public.customer_orders
  add column if not exists proof_file_id uuid references public.files(id) on delete set null;
