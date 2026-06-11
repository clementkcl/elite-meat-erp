create or replace function public.sync_approved_leave_to_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  leave_day date;
  target_department_id uuid;
begin
  if new.status::text <> 'APPROVED' then
    return new;
  end if;

  if new.requested_by is null then
    return new;
  end if;

  select coalesce(new.department_id, profile.department_id)
  into target_department_id
  from public.profiles profile
  where profile.id = new.requested_by;

  for leave_day in
    select generate_series(new.start_date, new.end_date, interval '1 day')::date
  loop
    insert into public.attendance_daily_summary (
      profile_id,
      work_date,
      department_id,
      clock_in_at,
      clock_out_at,
      status,
      total_minutes,
      notes,
      updated_by
    )
    values (
      new.requested_by,
      leave_day,
      target_department_id,
      null,
      null,
      'ON_LEAVE',
      0,
      concat('Approved leave: ', coalesce(new.reason, 'Leave')),
      coalesce(new.admin_reviewed_by, new.director_approved_by)
    )
    on conflict (profile_id, work_date) do update set
      department_id = excluded.department_id,
      clock_in_at = null,
      clock_out_at = null,
      status = 'ON_LEAVE',
      total_minutes = 0,
      notes = excluded.notes,
      updated_by = excluded.updated_by,
      updated_at = now();
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_approved_leave_to_attendance on public.leave_requests;
create trigger sync_approved_leave_to_attendance
after insert or update of status, start_date, end_date, requested_by, department_id
on public.leave_requests
for each row
execute function public.sync_approved_leave_to_attendance();

update public.leave_requests
set status = status
where status::text = 'APPROVED';
