create table if not exists public.delivery_shifts (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null default current_date,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  outlet_id uuid references public.outlets(id) on delete set null,
  delivery_team_id uuid references public.departments(id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ENDED')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_date, vehicle_id)
);

create table if not exists public.delivery_shift_members (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.delivery_shifts(id) on delete cascade,
  shift_date date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  crew_role text not null check (crew_role in ('DRIVER', 'ASSISTANT')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  unique (shift_id, user_id)
);

create table if not exists public.delivery_cash_records (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.delivery_shifts(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  remark text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now()
);

alter table public.deliveries
  add column if not exists shift_id uuid references public.delivery_shifts(id) on delete set null,
  add column if not exists route_sequence integer,
  add column if not exists manager_pinned boolean not null default false,
  add column if not exists planned_delivery_at timestamptz;

alter table public.delivery_expenses
  add column if not exists shift_id uuid references public.delivery_shifts(id) on delete set null;

alter table public.deliveries drop constraint if exists deliveries_delivery_type_check;
alter table public.deliveries add constraint deliveries_delivery_type_check check (
  delivery_type in (
    'CUSTOMER_DELIVERY', 'INTERNAL_TRANSFER_DELIVERY', 'RETURN_COLLECTION',
    'SUPPLIER_PICKUP', 'COLLECT_DOCUMENT', 'OTHER_STOP'
  )
);

create index if not exists idx_delivery_shift_members_user_day
on public.delivery_shift_members(user_id, shift_date);
create unique index if not exists idx_delivery_shift_members_one_active_day
on public.delivery_shift_members(shift_date, user_id) where left_at is null;
create index if not exists idx_deliveries_shift_route
on public.deliveries(shift_id, route_sequence, created_at);
create unique index if not exists idx_deliveries_one_active_stop_per_shift
on public.deliveries(shift_id) where shift_id is not null and status = 'OUT_FOR_DELIVERY';
create index if not exists idx_delivery_cash_shift
on public.delivery_cash_records(shift_id, recorded_at);

create or replace function public.is_delivery_shift_member(target_shift_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.delivery_shift_members member
    join public.delivery_shifts shift on shift.id = member.shift_id
    where member.shift_id = target_shift_id
      and member.user_id = auth.uid()
      and member.left_at is null
      and shift.status = 'ACTIVE'
  );
$$;

create or replace function public.is_delivery_shift_participant(target_shift_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.delivery_shift_members
    where shift_id = target_shift_id and user_id = auth.uid()
  );
$$;

create or replace function public.join_delivery_shift(
  p_vehicle_id uuid,
  p_change_lorry boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  actor_outlet_id uuid;
  vehicle_team_id uuid;
  vehicle_default_driver_id uuid;
  current_shift_id uuid;
  current_vehicle_id uuid;
  target_shift_id uuid;
  member_id uuid;
  assigned_crew_role text;
begin
  if v_actor_id is null then raise exception 'Sign in before joining a lorry shift.'; end if;

  select outlet_id
  into actor_outlet_id
  from public.profiles
  where id = v_actor_id;

  select delivery_team_id, default_driver_id
  into vehicle_team_id, vehicle_default_driver_id
  from public.vehicles
  where id = p_vehicle_id and is_active = true;

  if not found then raise exception 'This lorry is not available.'; end if;
  if not public.can_access_delivery_scope(null, vehicle_team_id) then
    raise exception 'This lorry is outside your delivery team.';
  end if;

  select shift.id, shift.vehicle_id
  into current_shift_id, current_vehicle_id
  from public.delivery_shift_members member
  join public.delivery_shifts shift on shift.id = member.shift_id
  where member.user_id = v_actor_id
    and member.shift_date = current_date
    and member.left_at is null
    and shift.status = 'ACTIVE'
  limit 1;

  if current_vehicle_id = p_vehicle_id then return current_shift_id; end if;
  if current_shift_id is not null and not p_change_lorry then
    raise exception 'You already joined a lorry shift today.';
  end if;

  select id into target_shift_id
  from public.delivery_shifts
  where shift_date = current_date and vehicle_id = p_vehicle_id and status = 'ACTIVE';

  if target_shift_id is null then
    insert into public.delivery_shifts (
      shift_date, vehicle_id, outlet_id, delivery_team_id, created_by
    ) values (
      current_date, p_vehicle_id, actor_outlet_id, vehicle_team_id, v_actor_id
    )
    on conflict (shift_date, vehicle_id) do nothing
    returning id into target_shift_id;

    if target_shift_id is null then
      select id into target_shift_id
      from public.delivery_shifts
      where shift_date = current_date and vehicle_id = p_vehicle_id and status = 'ACTIVE';
    end if;
  end if;

  if target_shift_id is null then
    raise exception 'This lorry shift has already ended today.';
  end if;

  if current_shift_id is not null then
    update public.delivery_shift_members
    set left_at = now()
    where shift_id = current_shift_id and user_id = v_actor_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
    values (v_actor_id, 'DELIVERY_CREW_LEFT', 'delivery_shifts', current_shift_id, '{}'::jsonb);
  end if;

  assigned_crew_role := case when vehicle_default_driver_id = v_actor_id then 'DRIVER' else 'ASSISTANT' end;
  select id into member_id
  from public.delivery_shift_members
  where shift_id = target_shift_id and user_id = v_actor_id;

  if member_id is null then
    insert into public.delivery_shift_members (
      shift_id, shift_date, user_id, crew_role, created_by
    ) values (
      target_shift_id, current_date, v_actor_id, assigned_crew_role, v_actor_id
    );
  else
    update public.delivery_shift_members
    set left_at = null, crew_role = assigned_crew_role, joined_at = now()
    where id = member_id;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (
    v_actor_id, 'DELIVERY_CREW_JOINED', 'delivery_shifts', target_shift_id,
    jsonb_build_object('crewRole', assigned_crew_role)
  );

  return target_shift_id;
end;
$$;

revoke all on function public.join_delivery_shift(uuid, boolean) from public;
grant execute on function public.join_delivery_shift(uuid, boolean) to authenticated;

create or replace function public.end_delivery_shift(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_delivery_shift_member(p_shift_id) then
    raise exception 'This is not your active delivery shift.';
  end if;

  if exists (
    select 1 from public.deliveries
    where shift_id = p_shift_id
      and status in ('ACCEPTED', 'LOADED', 'OUT_FOR_DELIVERY')
  ) then
    raise exception 'Finish or report all active deliveries before ending the shift.';
  end if;

  update public.delivery_shift_members
  set left_at = now()
  where shift_id = p_shift_id and left_at is null;

  update public.delivery_shifts
  set status = 'ENDED', ended_at = now(), updated_at = now()
  where id = p_shift_id and status = 'ACTIVE';

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (auth.uid(), 'DELIVERY_SHIFT_ENDED', 'delivery_shifts', p_shift_id, '{}'::jsonb);
end;
$$;

revoke all on function public.end_delivery_shift(uuid) from public;
grant execute on function public.end_delivery_shift(uuid) to authenticated;

create or replace function public.reorder_delivery_shift_route(
  p_shift_id uuid,
  p_delivery_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_count integer;
begin
  if not public.is_delivery_shift_member(p_shift_id) then
    raise exception 'This is not your active delivery shift.';
  end if;

  if coalesce(array_length(p_delivery_ids, 1), 0) = 0 then
    raise exception 'Choose at least one delivery stop.';
  end if;

  if (select count(distinct requested.id) from unnest(p_delivery_ids) as requested(id))
    <> array_length(p_delivery_ids, 1)
  then
    raise exception 'Delivery route contains duplicate stops.';
  end if;

  select count(*) into expected_count
  from public.deliveries
  where shift_id = p_shift_id
    and status in ('ACCEPTED', 'LOADED', 'OUT_FOR_DELIVERY');

  if expected_count <> array_length(p_delivery_ids, 1)
    or exists (
      select 1
      from unnest(p_delivery_ids) as requested(id)
      where not exists (
        select 1 from public.deliveries delivery
        where delivery.id = requested.id
          and delivery.shift_id = p_shift_id
          and delivery.status in ('ACCEPTED', 'LOADED', 'OUT_FOR_DELIVERY')
      )
    )
  then
    raise exception 'Delivery route changed. Refresh and arrange it again.';
  end if;

  update public.deliveries delivery
  set route_sequence = ordered.ordinality::integer,
      updated_by = auth.uid(),
      updated_at = now()
  from unnest(p_delivery_ids) with ordinality ordered(id, ordinality)
  where delivery.id = ordered.id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (
    auth.uid(),
    'DELIVERY_ROUTE_REORDERED',
    'delivery_shifts',
    p_shift_id,
    jsonb_build_object('deliveryIds', to_jsonb(p_delivery_ids))
  );
end;
$$;

revoke all on function public.reorder_delivery_shift_route(uuid, uuid[]) from public;
grant execute on function public.reorder_delivery_shift_route(uuid, uuid[]) to authenticated;

create or replace function public.can_access_delivery(target_delivery_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deliveries delivery
    where delivery.id = target_delivery_id and (
      public.can_review_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
      or delivery.driver_id = auth.uid()
      or public.is_delivery_shift_member(delivery.shift_id)
      or (
        delivery.status = 'AVAILABLE'
        and public.can_access_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
      )
    )
  );
$$;

create or replace function public.can_mutate_delivery(target_delivery_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deliveries delivery
    where delivery.id = target_delivery_id and (
      public.can_review_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
      or delivery.driver_id = auth.uid()
      or public.is_delivery_shift_member(delivery.shift_id)
      or (
        delivery.status = 'AVAILABLE'
        and public.can_access_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
      )
    )
  );
$$;

alter table public.delivery_shifts enable row level security;
alter table public.delivery_shift_members enable row level security;
alter table public.delivery_cash_records enable row level security;

drop policy if exists "delivery crew can read shifts" on public.delivery_shifts;
create policy "delivery crew can read shifts"
on public.delivery_shifts for select to authenticated
using (
  public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or public.can_access_delivery_scope(outlet_id, delivery_team_id)
);
drop policy if exists "delivery crew can create shifts" on public.delivery_shifts;
create policy "delivery crew can create shifts"
on public.delivery_shifts for insert to authenticated
with check (
  created_by = auth.uid()
  and public.can_access_delivery_scope(outlet_id, delivery_team_id)
);
drop policy if exists "delivery crew can update shifts" on public.delivery_shifts;
create policy "delivery crew can update shifts"
on public.delivery_shifts for update to authenticated
using (public.is_delivery_shift_member(id) or public.can_review_delivery_scope(outlet_id, delivery_team_id))
with check (public.is_delivery_shift_participant(id) or public.can_review_delivery_scope(outlet_id, delivery_team_id));

drop policy if exists "delivery crew can read shift members" on public.delivery_shift_members;
create policy "delivery crew can read shift members"
on public.delivery_shift_members for select to authenticated
using (user_id = auth.uid() or public.is_delivery_shift_member(shift_id) or exists (
  select 1 from public.delivery_shifts shift where shift.id = shift_id
  and public.can_review_delivery_scope(shift.outlet_id, shift.delivery_team_id)
));
drop policy if exists "delivery crew can join shifts" on public.delivery_shift_members;
create policy "delivery crew can join shifts"
on public.delivery_shift_members for insert to authenticated
with check (user_id = auth.uid() and created_by = auth.uid() and exists (
  select 1 from public.delivery_shifts shift where shift.id = shift_id
  and shift.status = 'ACTIVE'
  and public.can_access_delivery_scope(shift.outlet_id, shift.delivery_team_id)
));
drop policy if exists "delivery crew can leave shifts" on public.delivery_shift_members;
create policy "delivery crew can leave shifts"
on public.delivery_shift_members for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delivery crew can read cash records" on public.delivery_cash_records;
create policy "delivery crew can read cash records"
on public.delivery_cash_records for select to authenticated
using (public.is_delivery_shift_member(shift_id) or exists (
  select 1 from public.delivery_shifts shift where shift.id = shift_id
  and public.can_review_delivery_scope(shift.outlet_id, shift.delivery_team_id)
));
drop policy if exists "delivery crew can record cash" on public.delivery_cash_records;
create policy "delivery crew can record cash"
on public.delivery_cash_records for insert to authenticated
with check (
  recorded_by = auth.uid()
  and public.is_delivery_shift_member(shift_id)
  and (
    delivery_id is null
    or exists (
      select 1 from public.deliveries delivery
      where delivery.id = delivery_cash_records.delivery_id
        and delivery.shift_id = delivery_cash_records.shift_id
    )
  )
);

drop policy if exists "delivery users can update scoped deliveries" on public.deliveries;
create policy "delivery users can update scoped deliveries"
on public.deliveries for update to authenticated
using (public.can_mutate_delivery(id))
with check (
  public.can_review_delivery_scope(outlet_id, delivery_team_id)
  or driver_id = auth.uid()
  or public.is_delivery_shift_member(shift_id)
);

drop policy if exists "delivery users can insert scoped deliveries" on public.deliveries;
create policy "delivery users can insert scoped deliveries"
on public.deliveries for insert to authenticated
with check (
  created_by = auth.uid() and (
    public.can_review_delivery_scope(outlet_id, delivery_team_id)
    or (
      shift_id is not null
      and public.is_delivery_shift_member(shift_id)
      and delivery_type in ('RETURN_COLLECTION', 'INTERNAL_TRANSFER_DELIVERY', 'SUPPLIER_PICKUP', 'COLLECT_DOCUMENT', 'OTHER_STOP')
    )
  )
);

drop policy if exists "delivery drivers can insert canonical expenses" on public.delivery_expenses;
create policy "delivery drivers can insert canonical expenses"
on public.delivery_expenses for insert to authenticated
with check (
  driver_id = auth.uid() and (created_by = auth.uid() or created_by is null) and (
    (
      shift_id is not null
      and public.is_delivery_shift_member(shift_id)
      and (
        delivery_id is null
        or exists (
          select 1 from public.deliveries delivery
          where delivery.id = delivery_expenses.delivery_id
            and delivery.shift_id = delivery_expenses.shift_id
        )
      )
    )
    or (
      shift_id is null
      and (
        public.can_access_delivery_scope(outlet_id, delivery_team_id)
        or (delivery_id is not null and public.can_mutate_delivery(delivery_id))
      )
    )
  )
);

drop policy if exists "delivery users can read canonical expenses" on public.delivery_expenses;
create policy "delivery users can read canonical expenses"
on public.delivery_expenses for select to authenticated
using (
  driver_id = auth.uid()
  or (shift_id is not null and public.is_delivery_shift_member(shift_id))
  or public.can_review_delivery_scope(outlet_id, delivery_team_id)
);

create or replace function public.enforce_delivery_driver_status_transition()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.can_manage_delivery_review_scope(old.outlet_id, old.delivery_team_id) then
    return new;
  end if;
  if old.status = new.status then return new; end if;
  if old.status = 'AVAILABLE' and new.status = 'ACCEPTED'
    and new.driver_id = auth.uid() and public.is_delivery_shift_member(new.shift_id)
  then return new; end if;
  if not public.is_delivery_shift_member(old.shift_id) and old.driver_id is distinct from auth.uid() then
    raise exception 'Delivery is not assigned to the current lorry shift.';
  end if;
  if old.status = 'ACCEPTED' and new.status = 'LOADED' then return new; end if;
  if old.status = 'LOADED' and new.status = 'OUT_FOR_DELIVERY' then return new; end if;
  if old.status = 'OUT_FOR_DELIVERY' and new.status in ('DELIVERED', 'FAILED') and exists (
    select 1 from public.delivery_proofs proof
    where proof.delivery_id = old.id and proof.uploaded_by = auth.uid() and proof.proof_type = new.status
  ) then return new; end if;
  raise exception 'Delivery status transition is not allowed.';
end;
$$;

drop policy if exists "delivery users can insert delivery proofs" on public.delivery_proofs;
create policy "delivery users can insert delivery proofs"
on public.delivery_proofs for insert to authenticated
with check (
  uploaded_by = auth.uid() and delivery_id is not null and exists (
    select 1 from public.deliveries delivery
    where delivery.id = delivery_id and delivery.status = 'OUT_FOR_DELIVERY'
      and (
        delivery.driver_id = auth.uid()
        or public.is_delivery_shift_member(delivery.shift_id)
        or public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
      )
  )
);

drop policy if exists "delivery users can insert canonical address suggestions" on public.delivery_address_suggestions;
create policy "delivery users can insert canonical address suggestions"
on public.delivery_address_suggestions for insert to authenticated
with check (
  created_by = auth.uid() and delivery_id is not null and exists (
    select 1 from public.deliveries delivery
    where delivery.id = delivery_id and (
      delivery.driver_id = auth.uid()
      or public.is_delivery_shift_member(delivery.shift_id)
      or public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
    )
  )
);

create or replace function public.can_upload_delivery_storage_object(
  target_bucket_id text,
  target_name text
)
returns boolean language sql stable security definer set search_path = public, storage as $$
  select case
    when target_bucket_id = 'delivery-proofs' and (storage.foldername(target_name))[2] = 'proof' then
      exists (
        select 1 from public.deliveries delivery
        where delivery.id = public.safe_uuid((storage.foldername(target_name))[1])
          and delivery.status = 'OUT_FOR_DELIVERY'
          and (
            delivery.driver_id = auth.uid()
            or public.is_delivery_shift_member(delivery.shift_id)
            or public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
          )
      )
    when target_bucket_id = 'delivery-proofs' and (storage.foldername(target_name))[2] in ('address-issue', 'issues') then
      exists (
        select 1 from public.deliveries delivery
        where delivery.id = public.safe_uuid((storage.foldername(target_name))[1])
          and delivery.status not in ('DELIVERED', 'FAILED', 'CANCELLED')
          and (
            delivery.driver_id = auth.uid()
            or public.is_delivery_shift_member(delivery.shift_id)
            or public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
          )
      )
    when target_bucket_id = 'delivery-expenses' then
      auth.uid()::text = (storage.foldername(target_name))[1]
    else false
  end;
$$;

create or replace function public.can_read_delivery_storage_object(
  target_bucket_id text,
  target_name text
)
returns boolean language sql stable security definer set search_path = public, storage as $$
  select case
    when target_bucket_id = 'delivery-proofs' then
      public.can_access_delivery(public.safe_uuid((storage.foldername(target_name))[1]))
      or public.can_access_delivery_job(public.safe_uuid((storage.foldername(target_name))[1]))
      or public.can_access_delivery_order_record(public.safe_uuid((storage.foldername(target_name))[1]))
    when target_bucket_id = 'delivery-expenses' then
      auth.uid()::text = (storage.foldername(target_name))[1]
      or exists (
        select 1 from public.delivery_expenses expense
        where expense.object_path = target_name
          and expense.shift_id is not null
          and public.is_delivery_shift_member(expense.shift_id)
      )
      or exists (
        select 1 from public.profiles profile
        where profile.id = public.safe_uuid((storage.foldername(target_name))[1])
          and public.can_review_delivery_scope(profile.outlet_id, profile.department_id)
      )
    else false
  end;
$$;
