-- Backstop Delivery failed-proof validation at the database boundary.
-- Server actions already validate this; the constraint prevents direct client/RLS
-- inserts from bypassing the same rule.

alter table public.delivery_proofs
  drop constraint if exists delivery_failed_proof_reason_required;

alter table public.delivery_proofs
  add constraint delivery_failed_proof_reason_required
  check (
    proof_type <> 'FAILED'
    or failed_reason is not null
  );

alter table public.delivery_proofs
  drop constraint if exists delivery_failed_proof_other_remark_required;

alter table public.delivery_proofs
  add constraint delivery_failed_proof_other_remark_required
  check (
    failed_reason <> 'OTHER'
    or nullif(trim(coalesce(remarks, '')), '') is not null
  );
