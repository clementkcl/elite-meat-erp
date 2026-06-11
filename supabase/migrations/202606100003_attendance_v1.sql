do $$
begin
  create type public.attendance_event_type as enum ('CLOCK_IN', 'CLOCK_OUT');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.attendance_status as enum (
    'PRESENT',
    'LATE',
    'ABSENT',
    'ON_LEAVE'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.can_manage_attendance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('director');
$$;

create table if not exists public.work_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  radius_meters integer not null default 150 check (radius_meters > 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  work_location_id uuid references public.work_locations(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  start_time time not null default '08:00',
  end_time time not null default '17:00',
  late_after_minutes integer not null default 10 check (late_after_minutes >= 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  work_location_id uuid references public.work_locations(id) on delete set null,
  event_type public.attendance_event_type not null,
  event_time timestamptz not null default now(),
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  distance_meters numeric(12, 2),
  status public.attendance_status not null default 'PRESENT',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_daily_summary (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  work_date date not null,
  work_location_id uuid references public.work_locations(id) on delete set null,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  status public.attendance_status not null default 'PRESENT',
  total_minutes integer not null default 0 check (total_minutes >= 0),
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, work_date)
);

create index if not exists idx_attendance_logs_profile_time on public.attendance_logs(profile_id, event_time desc);
create index if not exists idx_attendance_logs_location_time on public.attendance_logs(work_location_id, event_time desc);
create index if not exists idx_attendance_summary_date on public.attendance_daily_summary(work_date desc);
create index if not exists idx_attendance_summary_profile on public.attendance_daily_summary(profile_id, work_date desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['work_locations', 'attendance_rules', 'attendance_daily_summary']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

alter table public.work_locations enable row level security;
alter table public.attendance_rules enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.attendance_daily_summary enable row level security;

drop policy if exists "authenticated can read work locations" on public.work_locations;
drop policy if exists "attendance admins can insert work locations" on public.work_locations;
drop policy if exists "attendance admins can update work locations" on public.work_locations;
drop policy if exists "attendance admins can delete work locations" on public.work_locations;
drop policy if exists "authenticated can read work locations" on public.work_locations;
create policy "authenticated can read work locations"
on public.work_locations for select to authenticated using (true);
drop policy if exists "attendance admins can insert work locations" on public.work_locations;
create policy "attendance admins can insert work locations"
on public.work_locations for insert to authenticated with check (public.can_manage_attendance());
drop policy if exists "attendance admins can update work locations" on public.work_locations;
create policy "attendance admins can update work locations"
on public.work_locations for update to authenticated
using (public.can_manage_attendance())
with check (public.can_manage_attendance());
drop policy if exists "attendance admins can delete work locations" on public.work_locations;
create policy "attendance admins can delete work locations"
on public.work_locations for delete to authenticated using (public.can_manage_attendance());

drop policy if exists "authenticated can read attendance rules" on public.attendance_rules;
drop policy if exists "attendance admins can insert attendance rules" on public.attendance_rules;
drop policy if exists "attendance admins can update attendance rules" on public.attendance_rules;
drop policy if exists "attendance admins can delete attendance rules" on public.attendance_rules;
drop policy if exists "authenticated can read attendance rules" on public.attendance_rules;
create policy "authenticated can read attendance rules"
on public.attendance_rules for select to authenticated using (true);
drop policy if exists "attendance admins can insert attendance rules" on public.attendance_rules;
create policy "attendance admins can insert attendance rules"
on public.attendance_rules for insert to authenticated with check (public.can_manage_attendance());
drop policy if exists "attendance admins can update attendance rules" on public.attendance_rules;
create policy "attendance admins can update attendance rules"
on public.attendance_rules for update to authenticated
using (public.can_manage_attendance())
with check (public.can_manage_attendance());
drop policy if exists "attendance admins can delete attendance rules" on public.attendance_rules;
create policy "attendance admins can delete attendance rules"
on public.attendance_rules for delete to authenticated using (public.can_manage_attendance());

drop policy if exists "users can read own attendance logs" on public.attendance_logs;
drop policy if exists "users can insert own attendance logs" on public.attendance_logs;
drop policy if exists "attendance admins can update attendance logs" on public.attendance_logs;
drop policy if exists "attendance admins can delete attendance logs" on public.attendance_logs;
drop policy if exists "users can read own attendance logs" on public.attendance_logs;
create policy "users can read own attendance logs"
on public.attendance_logs for select to authenticated
using (profile_id = auth.uid() or created_by = auth.uid() or public.can_manage_attendance());
drop policy if exists "users can insert own attendance logs" on public.attendance_logs;
create policy "users can insert own attendance logs"
on public.attendance_logs for insert to authenticated
with check (
  (profile_id = auth.uid() or profile_id is null)
  and (created_by = auth.uid() or created_by is null)
);
drop policy if exists "attendance admins can update attendance logs" on public.attendance_logs;
create policy "attendance admins can update attendance logs"
on public.attendance_logs for update to authenticated
using (public.can_manage_attendance())
with check (public.can_manage_attendance());
drop policy if exists "attendance admins can delete attendance logs" on public.attendance_logs;
create policy "attendance admins can delete attendance logs"
on public.attendance_logs for delete to authenticated using (public.can_manage_attendance());

drop policy if exists "users can read own attendance summaries" on public.attendance_daily_summary;
drop policy if exists "users can insert own attendance summaries" on public.attendance_daily_summary;
drop policy if exists "users can update own attendance summaries" on public.attendance_daily_summary;
drop policy if exists "attendance admins can delete attendance summaries" on public.attendance_daily_summary;
drop policy if exists "users can read own attendance summaries" on public.attendance_daily_summary;
create policy "users can read own attendance summaries"
on public.attendance_daily_summary for select to authenticated
using (profile_id = auth.uid() or public.can_manage_attendance());
drop policy if exists "users can insert own attendance summaries" on public.attendance_daily_summary;
create policy "users can insert own attendance summaries"
on public.attendance_daily_summary for insert to authenticated
with check (profile_id = auth.uid() or public.can_manage_attendance());
drop policy if exists "users can update own attendance summaries" on public.attendance_daily_summary;
create policy "users can update own attendance summaries"
on public.attendance_daily_summary for update to authenticated
using (profile_id = auth.uid() or public.can_manage_attendance())
with check (profile_id = auth.uid() or public.can_manage_attendance());
drop policy if exists "attendance admins can delete attendance summaries" on public.attendance_daily_summary;
create policy "attendance admins can delete attendance summaries"
on public.attendance_daily_summary for delete to authenticated using (public.can_manage_attendance());
