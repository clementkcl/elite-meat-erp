-- Stock scan issue review scope.
-- Lets scoped stock managers review scan issue rows for their own stock
-- locations while keeping delete restricted to admin/director policies.

drop policy if exists "stock users can read own scan logs" on public.barcode_scan_logs;
create policy "stock users can read own scan logs"
on public.barcode_scan_logs for select to authenticated
using (
  public.can_administer_stock()
  or scanned_by = auth.uid()
  or (
    public.can_manage_stock_take()
    and (
      public.can_access_stock_location(expected_location_id)
      or public.can_access_stock_location(scanned_location_id)
    )
  )
);

drop policy if exists "stock admins can update scan logs" on public.barcode_scan_logs;
create policy "stock admins can update scan logs"
on public.barcode_scan_logs for update to authenticated
using (
  public.can_administer_stock()
  or (
    public.can_manage_stock_take()
    and review_status = 'OPEN'
    and (
      public.can_access_stock_location(expected_location_id)
      or public.can_access_stock_location(scanned_location_id)
    )
  )
)
with check (
  public.can_administer_stock()
  or (
    public.can_manage_stock_take()
    and review_status in ('APPROVED', 'REJECTED', 'CORRECTED')
    and reviewed_by = auth.uid()
    and reviewed_at is not null
    and (
      public.can_access_stock_location(expected_location_id)
      or public.can_access_stock_location(scanned_location_id)
    )
  )
);
