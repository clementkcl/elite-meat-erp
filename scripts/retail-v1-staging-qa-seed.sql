-- Retail V1 staging QA seed.
-- Non-production only. Creates deterministic QA users, outlets, and module access.

insert into public.branches (id, name)
values ('20000000-0000-4000-8000-000000000000', 'Retail QA Branch')
on conflict (name) do update set updated_at = now();

insert into public.outlets (id, branch_id, name)
values
  ('20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000000', 'Retail QA Outlet A'),
  ('20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000000', 'Retail QA Outlet B')
on conflict (id) do update set
  branch_id = excluded.branch_id,
  name = excluded.name,
  updated_at = now();

insert into public.departments (id, name)
values
  ('21000000-0000-4000-8000-000000000001', 'Retail QA Team A'),
  ('21000000-0000-4000-8000-000000000002', 'Retail QA Team B')
on conflict (id) do update set
  name = excluded.name,
  updated_at = now();

insert into public.stock_locations (id, name)
values
  ('22000000-0000-4000-8000-000000000001', 'Retail QA Location A'),
  ('22000000-0000-4000-8000-000000000002', 'Retail QA Location B')
on conflict (id) do update set
  name = excluded.name,
  updated_at = now();

insert into public.outlet_module_access (outlet_id, module_key, is_enabled)
values
  ('20000000-0000-4000-8000-000000000001', 'retail', true),
  ('20000000-0000-4000-8000-000000000002', 'retail', true)
on conflict (outlet_id, module_key) do update set
  is_enabled = excluded.is_enabled,
  updated_at = now();

delete from auth.identities
where user_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000006'
);

with qa_users(id, email, full_name, outlet_id, department_id, stock_location_id, role_key) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'retail.worker.outletA@example.test', 'Retail QA Worker Outlet A', '20000000-0000-4000-8000-000000000001'::uuid, '21000000-0000-4000-8000-000000000001'::uuid, '22000000-0000-4000-8000-000000000001'::uuid, 'retail_team_general_worker'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'retail.manager.outletA@example.test', 'Retail QA Manager Outlet A', '20000000-0000-4000-8000-000000000001'::uuid, '21000000-0000-4000-8000-000000000001'::uuid, '22000000-0000-4000-8000-000000000001'::uuid, 'retail_manager'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'retail.worker.outletB@example.test', 'Retail QA Worker Outlet B', '20000000-0000-4000-8000-000000000002'::uuid, '21000000-0000-4000-8000-000000000002'::uuid, '22000000-0000-4000-8000-000000000002'::uuid, 'retail_team_general_worker'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'retail.manager.outletB@example.test', 'Retail QA Manager Outlet B', '20000000-0000-4000-8000-000000000002'::uuid, '21000000-0000-4000-8000-000000000002'::uuid, '22000000-0000-4000-8000-000000000002'::uuid, 'retail_manager'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'admin.qa@example.test', 'Retail QA Admin', null::uuid, null::uuid, null::uuid, 'admin'),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'director.qa@example.test', 'Retail QA Director', null::uuid, null::uuid, null::uuid, 'director')
),
auth_upsert as (
  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  select
    id,
    'authenticated',
    'authenticated',
    email,
    crypt('RetailQA2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', full_name),
    now(),
    now()
  from qa_users
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now()
  returning id
),
profile_upsert as (
  insert into public.profiles (
    id,
    email,
    full_name,
    outlet_id,
    department_id,
    stock_location_id
  )
  select
    id,
    email,
    full_name,
    outlet_id,
    department_id,
    stock_location_id
  from qa_users
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    outlet_id = excluded.outlet_id,
    department_id = excluded.department_id,
    stock_location_id = excluded.stock_location_id,
    updated_at = now()
  returning id
),
identity_upsert as (
  insert into auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    created_at,
    updated_at,
    last_sign_in_at
  )
  select
    ('11000000-0000-4000-8000-' || lpad(row_number() over (order by email)::text, 12, '0'))::uuid,
    id,
    email,
    'email',
    jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
    now(),
    now(),
    now()
  from qa_users
  on conflict (provider, provider_id) do update set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now()
  returning id
)
insert into public.profile_roles (profile_id, role_key)
select id, role_key
from qa_users
on conflict (profile_id, role_key) do nothing;

insert into public.retail_expense_categories (id, outlet_id, name, is_active, active, created_by, updated_by)
values
  ('23000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Retail QA Supplies', true, true, '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
  ('23000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Retail QA Supplies', true, true, '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004')
on conflict (id) do update set
  name = excluded.name,
  is_active = excluded.is_active,
  active = excluded.active,
  updated_by = excluded.updated_by,
  updated_at = now();
