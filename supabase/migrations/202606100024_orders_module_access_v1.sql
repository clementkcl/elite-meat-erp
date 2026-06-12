do $$
declare
  constraint_name text;
begin
  select con.conname
  into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'outlet_module_access'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%module_key%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.outlet_module_access drop constraint if exists %I',
      constraint_name
    );
  end if;
end $$;

alter table public.outlet_module_access
  add constraint outlet_module_access_module_key_check
  check (
    module_key in (
      'stock',
      'orders',
      'retail',
      'processing',
      'delivery',
      'attendance',
      'cleaning',
      'oa_actions',
      'accounting_finance',
      'director_reports'
    )
  );

insert into public.outlet_module_access (outlet_id, module_key, is_enabled)
select outlet.id, 'orders', true
from public.outlets outlet
on conflict (outlet_id, module_key) do update set
  is_enabled = excluded.is_enabled,
  updated_at = now();
