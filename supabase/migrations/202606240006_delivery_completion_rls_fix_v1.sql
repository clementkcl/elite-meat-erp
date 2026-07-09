-- Fix canonical delivery completion RLS proof check.
-- Drivers may complete their own out-for-delivery delivery only after a matching
-- proof row exists for the target terminal status.

drop policy if exists "delivery users can update scoped deliveries" on public.deliveries;
create policy "delivery users can update scoped deliveries"
on public.deliveries
for update
to authenticated
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
          where proof.delivery_id = deliveries.id
            and proof.uploaded_by = auth.uid()
            and proof.proof_type = deliveries.status
        )
      )
    )
  )
);
