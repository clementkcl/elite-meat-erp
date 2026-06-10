insert into public.roles (role_key, name) values
  ('general_worker', 'General Worker'),
  ('retail_team', 'Retail Team'),
  ('account', 'Account'),
  ('admin', 'Admin'),
  ('director', 'Director')
on conflict (role_key) do update set name = excluded.name;

insert into public.departments (name) values
  ('Operations'),
  ('Retail'),
  ('Accounting'),
  ('Management')
on conflict (name) do nothing;

insert into public.branches (name) values
  ('Elite Meat Main')
on conflict (name) do nothing;

insert into public.outlets (branch_id, name)
select b.id, outlet_name
from public.branches b
cross join (values
  ('JALAN CHANNEL'),
  ('SUNGAI MERAH'),
  ('DIRECTOR')
) as outlets(outlet_name)
where b.name = 'Elite Meat Main'
on conflict (name) do nothing;

insert into public.stock_locations (name) values
  ('JALAN CHANNEL'),
  ('SUNGAI MERAH'),
  ('DIRECTOR')
on conflict (name) do update set is_active = true;

insert into public.brands (name) values
  ('TICAN'),
  ('RIVASAM'),
  ('SEABOARD'),
  ('VAN ROOI'),
  ('ABC'),
  ('ICP'),
  ('LOCKS')
on conflict (name) do update set is_active = true;

insert into public.origins (name) values
  ('DENMARK'),
  ('SPAIN'),
  ('USA'),
  ('NETHERLAND'),
  ('BELGIUM'),
  ('CHINA')
on conflict (name) do update set is_active = true;

insert into public.items (item_code, category, section, name, barcode_required) values
  ('MEAT-BELLY-BONELESS', 'MEAT', 'BELLY', 'BONELESS', true),
  ('MEAT-BELLY-BONE-IN', 'MEAT', 'BELLY', 'BONE IN', true),
  ('MEAT-LOIN-BONELESS', 'MEAT', 'LOIN', 'BONELESS', true),
  ('ORGANS-COOKED-STOMACH', 'ORGANS', 'COOKED', 'STOMACH', true),
  ('ORGANS-TONGUE', 'ORGANS', 'TONGUE', 'TONGUE', true),
  ('PROCESSED-MEATBALL', 'PROCESSED', 'MEATBALL', 'MEATBALL', false)
on conflict (item_code) do update set
  category = excluded.category,
  section = excluded.section,
  name = excluded.name,
  barcode_required = excluded.barcode_required,
  is_active = true;
