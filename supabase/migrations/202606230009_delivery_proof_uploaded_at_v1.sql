do $$
begin
  if to_regclass('public.delivery_proofs') is not null then
    alter table public.delivery_proofs
      add column if not exists uploaded_at timestamptz not null default now();

    update public.delivery_proofs
    set uploaded_at = coalesce(uploaded_at, created_at, now())
    where uploaded_at is null;

    comment on column public.delivery_proofs.uploaded_at is
      'Timestamp captured when a delivery proof photo is uploaded.';
  end if;
end $$;
