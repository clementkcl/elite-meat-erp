-- Delivery Module V1 - permissions, RLS, and data isolation hardening.
-- Forward-only and idempotent. This migration tightens legacy delivery
-- surfaces to match the V1 driver/manager access model.

create or replace function public.can_manage_delivery_review_scope(
  target_outlet_id uuid,
  target_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin')
    or (
      public.has_role('delivery_manager')
      and (target_outlet_id is not null or target_team_id is not null)
      and public.can_access_work_scope(target_outlet_id, target_team_id)
      and (
        target_outlet_id is null
        or public.can_access_outlet_module(target_outlet_id, 'delivery')
      )
    );
$$;

create or replace function public.can_mutate_delivery_job(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.delivery_jobs job
    where job.id = target_job_id
      and (
        public.can_manage_delivery_review_scope(job.outlet_id, job.delivery_team_id)
        or job.driver_id = auth.uid()
        or (
          job.status = 'AVAILABLE'
          and public.can_access_delivery_scope(job.outlet_id, job.delivery_team_id)
        )
      )
  );
$$;

create or replace function public.can_read_delivery_storage_object(
  target_bucket_id text,
  target_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when target_bucket_id = 'delivery-proofs' then
      public.can_access_delivery(public.safe_uuid((storage.foldername(target_name))[1]))
      or public.can_access_delivery_job(public.safe_uuid((storage.foldername(target_name))[1]))
      or public.can_access_delivery_order_record(public.safe_uuid((storage.foldername(target_name))[1]))
    when target_bucket_id = 'delivery-expenses' then
      auth.uid()::text = (storage.foldername(target_name))[1]
      or exists (
        select 1
        from public.profiles profile
        where profile.id = public.safe_uuid((storage.foldername(target_name))[1])
          and public.can_review_delivery_scope(profile.outlet_id, profile.department_id)
      )
    else false
  end;
$$;

create or replace function public.can_upload_delivery_storage_object(
  target_bucket_id text,
  target_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when target_bucket_id = 'delivery-proofs'
      and (storage.foldername(target_name))[2] = 'proof'
      then (
        exists (
          select 1
          from public.deliveries delivery
          where delivery.id = public.safe_uuid((storage.foldername(target_name))[1])
            and delivery.status = 'OUT_FOR_DELIVERY'
            and (
              delivery.driver_id = auth.uid()
              or public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
            )
        )
        or exists (
          select 1
          from public.delivery_jobs job
          where job.id = public.safe_uuid((storage.foldername(target_name))[1])
            and job.status = 'OUT_FOR_DELIVERY'
            and (
              job.driver_id = auth.uid()
              or public.can_manage_delivery_review_scope(job.outlet_id, job.delivery_team_id)
            )
        )
        or exists (
          select 1
          from public.delivery_orders delivery_order
          where delivery_order.id = public.safe_uuid((storage.foldername(target_name))[1])
            and delivery_order.status::text = 'OUT_FOR_DELIVERY'
            and (
              delivery_order.driver_id = auth.uid()
              or public.can_manage_delivery_review_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
            )
        )
      )
    when target_bucket_id = 'delivery-proofs'
      and (storage.foldername(target_name))[2] in ('address-issue', 'issues')
      then (
        exists (
          select 1
          from public.deliveries delivery
          where delivery.id = public.safe_uuid((storage.foldername(target_name))[1])
            and delivery.status not in ('DELIVERED', 'FAILED', 'CANCELLED')
            and (
              delivery.driver_id = auth.uid()
              or public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
            )
        )
        or exists (
          select 1
          from public.delivery_jobs job
          where job.id = public.safe_uuid((storage.foldername(target_name))[1])
            and job.status not in ('DELIVERED', 'FAILED', 'CANCELLED')
            and (
              job.driver_id = auth.uid()
              or public.can_manage_delivery_review_scope(job.outlet_id, job.delivery_team_id)
            )
        )
      )
    when target_bucket_id = 'delivery-expenses' then
      auth.uid()::text = (storage.foldername(target_name))[1]
    else false
  end;
$$;

create or replace function public.enforce_delivery_driver_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.can_manage_delivery_review_scope(old.outlet_id, old.delivery_team_id) then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'AVAILABLE'
    and new.status = 'ACCEPTED'
    and new.driver_id = auth.uid()
  then
    return new;
  end if;

  if old.driver_id is distinct from auth.uid() then
    raise exception 'Delivery is not assigned to the current driver.';
  end if;

  if old.status = 'ACCEPTED' and new.status = 'LOADED' then
    return new;
  end if;

  if old.status = 'LOADED' and new.status = 'OUT_FOR_DELIVERY' then
    return new;
  end if;

  if old.status = 'OUT_FOR_DELIVERY'
    and new.status in ('DELIVERED', 'FAILED')
    and exists (
      select 1
      from public.delivery_proofs proof
      where proof.delivery_id = old.id
        and proof.uploaded_by = auth.uid()
        and proof.proof_type = new.status
    )
  then
    return new;
  end if;

  raise exception 'Delivery status transition is not allowed for this role.';
end;
$$;

drop trigger if exists enforce_delivery_driver_status_transition on public.deliveries;
create trigger enforce_delivery_driver_status_transition
before update on public.deliveries
for each row
when (old.status is distinct from new.status)
execute function public.enforce_delivery_driver_status_transition();

create or replace function public.enforce_delivery_job_driver_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.can_manage_delivery_review_scope(old.outlet_id, old.delivery_team_id) then
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'AVAILABLE'
    and new.status = 'ACCEPTED'
    and new.driver_id = auth.uid()
  then
    return new;
  end if;

  if old.driver_id is distinct from auth.uid() then
    raise exception 'Delivery job is not assigned to the current driver.';
  end if;

  if old.status = 'ACCEPTED' and new.status = 'LOADED' then
    return new;
  end if;

  if old.status = 'LOADED' and new.status = 'OUT_FOR_DELIVERY' then
    return new;
  end if;

  if old.status = 'OUT_FOR_DELIVERY'
    and new.status in ('DELIVERED', 'FAILED')
    and new.proof_file_id is not null
  then
    return new;
  end if;

  raise exception 'Delivery job status transition is not allowed for this role.';
end;
$$;

drop trigger if exists enforce_delivery_job_driver_status_transition on public.delivery_jobs;
create trigger enforce_delivery_job_driver_status_transition
before update on public.delivery_jobs
for each row
when (old.status is distinct from new.status)
execute function public.enforce_delivery_job_driver_status_transition();

drop policy if exists "authenticated can read vehicles" on public.vehicles;
drop policy if exists "delivery users can read scoped vehicles" on public.vehicles;
create policy "delivery users can read scoped vehicles"
on public.vehicles for select to authenticated
using (
  public.is_admin_or_director()
  or public.can_review_delivery_scope(null, delivery_team_id)
  or public.can_access_delivery_scope(null, delivery_team_id)
);

drop policy if exists "delivery operators can insert vehicles" on public.vehicles;
drop policy if exists "delivery managers can insert scoped vehicles" on public.vehicles;
create policy "delivery managers can insert scoped vehicles"
on public.vehicles for insert to authenticated
with check (
  public.can_manage_delivery_review_scope(null, delivery_team_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "delivery operators can update vehicles" on public.vehicles;
drop policy if exists "delivery managers can update scoped vehicles" on public.vehicles;
create policy "delivery managers can update scoped vehicles"
on public.vehicles for update to authenticated
using (public.can_manage_delivery_review_scope(null, delivery_team_id))
with check (public.can_manage_delivery_review_scope(null, delivery_team_id));

drop policy if exists "delivery admins can delete vehicles" on public.vehicles;
create policy "delivery admins can delete vehicles"
on public.vehicles for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "delivery users can read scoped jobs" on public.delivery_jobs;
create policy "delivery users can read scoped jobs"
on public.delivery_jobs for select to authenticated
using (public.can_access_delivery_job(id));

drop policy if exists "delivery users can update scoped deliveries" on public.deliveries;
create policy "delivery users can update scoped deliveries"
on public.deliveries for update to authenticated
using (public.can_mutate_delivery(id))
with check (
  public.can_manage_delivery_review_scope(outlet_id, delivery_team_id)
  or (
    driver_id = auth.uid()
    and (
      status in ('ACCEPTED', 'LOADED', 'OUT_FOR_DELIVERY')
      or (
        status in ('DELIVERED', 'FAILED')
        and exists (
          select 1
          from public.delivery_proofs proof
          where proof.delivery_id = id
            and proof.uploaded_by = auth.uid()
            and proof.proof_type = status
        )
      )
    )
  )
);

drop policy if exists "delivery users can insert scoped jobs" on public.delivery_jobs;
create policy "delivery users can insert scoped jobs"
on public.delivery_jobs for insert to authenticated
with check (
  public.can_manage_delivery_review_scope(outlet_id, delivery_team_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "delivery users can update scoped jobs" on public.delivery_jobs;
create policy "delivery users can update scoped jobs"
on public.delivery_jobs for update to authenticated
using (public.can_mutate_delivery_job(id))
with check (
  public.can_manage_delivery_review_scope(outlet_id, delivery_team_id)
  or driver_id = auth.uid()
);

drop policy if exists "delivery users can read job links" on public.delivery_job_orders;
create policy "delivery users can read job links"
on public.delivery_job_orders for select to authenticated
using (
  exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and public.can_access_delivery_job(job.id)
  )
);

drop policy if exists "delivery users can insert job links" on public.delivery_job_orders;
create policy "delivery users can insert job links"
on public.delivery_job_orders for insert to authenticated
with check (
  exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and public.can_manage_delivery_review_scope(job.outlet_id, job.delivery_team_id)
  )
);

drop policy if exists "delivery users can read goods issues" on public.delivery_goods_issues;
create policy "delivery users can read goods issues"
on public.delivery_goods_issues for select to authenticated
using (
  reported_by = auth.uid()
  or exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and public.can_review_delivery_scope(job.outlet_id, job.delivery_team_id)
  )
);

drop policy if exists "delivery users can insert goods issues" on public.delivery_goods_issues;
create policy "delivery users can insert goods issues"
on public.delivery_goods_issues for insert to authenticated
with check (
  reported_by = auth.uid()
  and exists (
    select 1
    from public.delivery_jobs job
    where job.id = job_id
      and (
        job.driver_id = auth.uid()
        or public.can_manage_delivery_review_scope(job.outlet_id, job.delivery_team_id)
      )
      and job.status not in ('DELIVERED', 'FAILED', 'CANCELLED')
  )
);

drop policy if exists "delivery users can read address suggestions" on public.delivery_address_suggestions;
drop policy if exists "delivery users can read canonical address suggestions" on public.delivery_address_suggestions;
create policy "delivery users can read canonical address suggestions"
on public.delivery_address_suggestions for select to authenticated
using (
  created_by = auth.uid()
  or public.is_admin_or_director()
  or (
    delivery_id is not null
    and exists (
      select 1
      from public.deliveries delivery
      where delivery.id = delivery_id
        and public.can_review_delivery_scope(delivery.outlet_id, delivery.delivery_team_id)
    )
  )
  or (
    job_id is not null
    and exists (
      select 1
      from public.delivery_jobs job
      where job.id = job_id
        and public.can_review_delivery_scope(job.outlet_id, job.delivery_team_id)
    )
  )
);

drop policy if exists "delivery users can insert address suggestions" on public.delivery_address_suggestions;
drop policy if exists "delivery users can insert canonical address suggestions" on public.delivery_address_suggestions;
create policy "delivery users can insert canonical address suggestions"
on public.delivery_address_suggestions for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    (
      delivery_id is not null
      and exists (
        select 1
        from public.deliveries delivery
        where delivery.id = delivery_id
          and (
            delivery.driver_id = auth.uid()
            or public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
          )
      )
    )
    or (
      job_id is not null
      and exists (
        select 1
        from public.delivery_jobs job
        where job.id = job_id
          and (
            job.driver_id = auth.uid()
            or public.can_manage_delivery_review_scope(job.outlet_id, job.delivery_team_id)
          )
      )
    )
  )
);

drop policy if exists "delivery managers can update address suggestions" on public.delivery_address_suggestions;
drop policy if exists "delivery managers can update canonical address suggestions" on public.delivery_address_suggestions;
create policy "delivery managers can update canonical address suggestions"
on public.delivery_address_suggestions for update to authenticated
using (
  public.has_role('admin')
  or (
    delivery_id is not null
    and exists (
      select 1
      from public.deliveries delivery
      where delivery.id = delivery_id
        and public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
    )
  )
  or (
    job_id is not null
    and exists (
      select 1
      from public.delivery_jobs job
      where job.id = job_id
        and public.can_manage_delivery_review_scope(job.outlet_id, job.delivery_team_id)
    )
  )
)
with check (
  public.has_role('admin')
  or (
    delivery_id is not null
    and exists (
      select 1
      from public.deliveries delivery
      where delivery.id = delivery_id
        and public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
    )
  )
  or (
    job_id is not null
    and exists (
      select 1
      from public.delivery_jobs job
      where job.id = job_id
        and public.can_manage_delivery_review_scope(job.outlet_id, job.delivery_team_id)
    )
  )
);

drop policy if exists "delivery users can read scoped expenses" on public.delivery_expenses;
drop policy if exists "delivery users can read canonical expenses" on public.delivery_expenses;
create policy "delivery users can read canonical expenses"
on public.delivery_expenses for select to authenticated
using (
  driver_id = auth.uid()
  or public.can_review_delivery_scope(outlet_id, delivery_team_id)
);

drop policy if exists "delivery drivers can insert expenses" on public.delivery_expenses;
drop policy if exists "delivery drivers can insert canonical expenses" on public.delivery_expenses;
create policy "delivery drivers can insert canonical expenses"
on public.delivery_expenses for insert to authenticated
with check (
  driver_id = auth.uid()
  and (created_by = auth.uid() or created_by is null)
  and (
    (
      delivery_id is null
      and public.can_access_delivery_scope(outlet_id, delivery_team_id)
    )
    or (
      delivery_id is not null
      and exists (
        select 1
        from public.deliveries delivery
        where delivery.id = delivery_id
          and (
            delivery.driver_id = auth.uid()
            or public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
          )
      )
    )
  )
);

drop policy if exists "delivery managers can update expenses" on public.delivery_expenses;
drop policy if exists "delivery managers can update canonical expenses" on public.delivery_expenses;
create policy "delivery managers can update canonical expenses"
on public.delivery_expenses for update to authenticated
using (
  public.can_manage_delivery_review_scope(outlet_id, delivery_team_id)
)
with check (
  public.can_manage_delivery_review_scope(outlet_id, delivery_team_id)
);

drop policy if exists "delivery users can insert delivery proofs" on public.delivery_proofs;
create policy "delivery users can insert delivery proofs"
on public.delivery_proofs for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and (
    (
      delivery_id is not null
      and exists (
        select 1
        from public.deliveries delivery
        where delivery.id = delivery_id
          and delivery.status = 'OUT_FOR_DELIVERY'
          and (
            delivery.driver_id = auth.uid()
            or public.can_manage_delivery_review_scope(delivery.outlet_id, delivery.delivery_team_id)
          )
      )
    )
    or (
      delivery_order_id is not null
      and exists (
        select 1
        from public.delivery_orders delivery_order
        where delivery_order.id = delivery_order_id
          and delivery_order.status::text = 'OUT_FOR_DELIVERY'
          and (
            delivery_order.driver_id = auth.uid()
            or public.can_manage_delivery_review_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
          )
      )
    )
  )
);

drop policy if exists "authenticated can read driver locations" on public.driver_locations;
drop policy if exists "delivery users can read scoped driver locations" on public.driver_locations;
create policy "delivery users can read scoped driver locations"
on public.driver_locations for select to authenticated
using (
  driver_id = auth.uid()
  or exists (
    select 1
    from public.delivery_orders delivery_order
    where delivery_order.id = order_id
      and public.can_review_delivery_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
  )
);

drop policy if exists "delivery operators can insert driver locations" on public.driver_locations;
drop policy if exists "delivery users can insert scoped driver locations" on public.driver_locations;
create policy "delivery users can insert scoped driver locations"
on public.driver_locations for insert to authenticated
with check (
  driver_id = auth.uid()
  and (
    order_id is null
    or exists (
      select 1
      from public.delivery_orders delivery_order
      where delivery_order.id = order_id
        and (
          delivery_order.driver_id = auth.uid()
          or public.can_manage_delivery_review_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
        )
    )
  )
);

drop policy if exists "delivery admins can delete driver locations" on public.driver_locations;
drop policy if exists "delivery admins can delete scoped driver locations" on public.driver_locations;
create policy "delivery admins can delete scoped driver locations"
on public.driver_locations for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "authenticated can read delivery payments" on public.delivery_payments;
drop policy if exists "delivery users can read scoped payments" on public.delivery_payments;
create policy "delivery users can read scoped payments"
on public.delivery_payments for select to authenticated
using (
  exists (
    select 1
    from public.delivery_orders delivery_order
    where delivery_order.id = order_id
      and public.can_review_delivery_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
  )
);

drop policy if exists "delivery operators can insert delivery payments" on public.delivery_payments;
drop policy if exists "delivery users can insert scoped payments" on public.delivery_payments;
create policy "delivery users can insert scoped payments"
on public.delivery_payments for insert to authenticated
with check (
  exists (
    select 1
      from public.delivery_orders delivery_order
      where delivery_order.id = order_id
      and public.can_manage_delivery_review_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
  )
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists "delivery operators can update delivery payments" on public.delivery_payments;
drop policy if exists "delivery users can update scoped payments" on public.delivery_payments;
create policy "delivery users can update scoped payments"
on public.delivery_payments for update to authenticated
using (
  exists (
    select 1
      from public.delivery_orders delivery_order
      where delivery_order.id = order_id
      and public.can_manage_delivery_review_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
  )
)
with check (
  exists (
    select 1
      from public.delivery_orders delivery_order
      where delivery_order.id = order_id
      and public.can_manage_delivery_review_scope(delivery_order.outlet_id, delivery_order.delivery_team_id)
  )
);

drop policy if exists "delivery admins can delete delivery payments" on public.delivery_payments;
drop policy if exists "delivery admins can delete scoped payments" on public.delivery_payments;
create policy "delivery admins can delete scoped payments"
on public.delivery_payments for delete to authenticated
using (public.is_admin_or_director());

drop policy if exists "delivery users can read proof bucket" on storage.objects;
create policy "delivery users can read proof bucket"
on storage.objects for select to authenticated
using (
  bucket_id = 'delivery-proofs'
  and public.can_read_delivery_storage_object(bucket_id, name)
);

drop policy if exists "delivery users can upload proof bucket" on storage.objects;
create policy "delivery users can upload proof bucket"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'delivery-proofs'
  and public.can_upload_delivery_storage_object(bucket_id, name)
);

drop policy if exists "delivery users can read expense bucket" on storage.objects;
create policy "delivery users can read expense bucket"
on storage.objects for select to authenticated
using (
  bucket_id = 'delivery-expenses'
  and public.can_read_delivery_storage_object(bucket_id, name)
);

drop policy if exists "delivery users can upload expense bucket" on storage.objects;
create policy "delivery users can upload expense bucket"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'delivery-expenses'
  and public.can_upload_delivery_storage_object(bucket_id, name)
);
