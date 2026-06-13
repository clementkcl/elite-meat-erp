# Supabase Migration Handoff

Target Supabase project URL:

`https://aikfqnbsshflbtuakwrz.supabase.co`

## Current Verification

- Local `.env.local` points to `https://aikfqnbsshflbtuakwrz.supabase.co`.
- Supabase CLI is not installed in this environment: `supabase` command is unavailable.
- No local Supabase link metadata was found:
  - `supabase/config.toml` is missing.
  - `supabase/.temp` is missing.
- Because the CLI is not installed/linked, Codex did not inspect remote migration history and did not run live SQL.

## Required Latest Migration

The app currently depends on migrations through:

`supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql`

Migration `053` is present and includes:

- `VOIDED` stock-unit status.
- `INBOUND_VOID` stock movement type.
- `public.void_inbound_stock_unit(uuid, text, text)`.
- Audit trail write using `BARCODE_INBOUND_VOID`.
- No table drops, no truncates, and no destructive data deletes.

## SQL Editor Copy-Paste Order

In the Supabase dashboard, first confirm you are in the project:

`https://aikfqnbsshflbtuakwrz.supabase.co`

Then open SQL Editor and run each migration file in filename order. If a migration has already been applied and is fully idempotent, it should complete safely. If any migration fails, stop and record the exact error before running later files.

1. `supabase/migrations/202606100001_erp_core_stock_v1.sql`
2. `supabase/migrations/202606100002_delivery_v1.sql`
3. `supabase/migrations/202606100003_attendance_v1.sql`
4. `supabase/migrations/202606100004_oa_actions_v1.sql`
5. `supabase/migrations/202606100005_retail_v1.sql`
6. `supabase/migrations/202606100006_finance_director_v1.sql`
7. `supabase/migrations/202606100007_roles_scope_and_operations_v1.sql`
8. `supabase/migrations/202606100008_team_rls_v1.sql`
9. `supabase/migrations/202606100009_internal_qa_hardening_v1.sql`
10. `supabase/migrations/202606100010_stock_inbound_workflow_v1.sql`
11. `supabase/migrations/202606100011_outlet_module_access_v1.sql`
12. `supabase/migrations/202606100012_delivery_workflow_status_v1.sql`
13. `supabase/migrations/202606100013_oa_workflow_hardening_v1.sql`
14. `supabase/migrations/202606100014_finance_invoice_aging_v1.sql`
15. `supabase/migrations/202606100015_attendance_leave_sync_v1.sql`
16. `supabase/migrations/202606100016_cleaning_completion_alerts_v1.sql`
17. `supabase/migrations/202606100017_retail_expense_checker_payment_v1.sql`
18. `supabase/migrations/202606100018_processing_stock_thresholds_v1.sql`
19. `supabase/migrations/202606100019_delivery_source_proof_photo_v1.sql`
20. `supabase/migrations/202606100020_attendance_no_clock_out_v1.sql`
21. `supabase/migrations/202606100021_orders_workflow_v1.sql`
22. `supabase/migrations/202606100022_order_outbound_batches_v1.sql`
23. `supabase/migrations/202606100023_customer_order_delivery_proof_v1.sql`
24. `supabase/migrations/202606100024_orders_module_access_v1.sql`
25. `supabase/migrations/202606100025_orders_module_rls_v1.sql`
26. `supabase/migrations/202606100026_customer_order_delivery_access_v1.sql`
27. `supabase/migrations/202606100027_orders_delivery_role_tightening_v1.sql`
28. `supabase/migrations/202606100028_order_outbound_atomic_rpc_v1.sql`
29. `supabase/migrations/202606100029_order_workflow_guards_v1.sql`
30. `supabase/migrations/202606100030_director_view_only_order_ops_v1.sql`
31. `supabase/migrations/202606100031_stock_director_view_scope_v1.sql`
32. `supabase/migrations/202606100032_admin_settings_customer_pricing_v1.sql`
33. `supabase/migrations/202606100033_order_item_reservation_rpc_v1.sql`
34. `supabase/migrations/202606100034_order_reservation_on_picking_v1.sql`
35. `supabase/migrations/202606100035_part2_delivery_proof_metadata_v1.sql`
36. `supabase/migrations/202606100036_failed_delivery_return_workflow_v1.sql`
37. `supabase/migrations/202606100037_stock_inbound_labels_rules_v1.sql`
38. `supabase/migrations/202606100038_stock_take_scoped_approval_v1.sql`
39. `supabase/migrations/202606100039_stock_damage_approval_v1.sql`
40. `supabase/migrations/202606100040_stock_return_supplier_approval_v1.sql`
41. `supabase/migrations/202606100041_direct_outbound_batches_v1.sql`
42. `supabase/migrations/202606100042_atomic_stock_approval_rpcs_v1.sql`
43. `supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql`
44. `supabase/migrations/202606100044_item_master_all_roles_v1.sql`
45. `supabase/migrations/202606100045_item_master_default_brand_v1.sql`
46. `supabase/migrations/202606100046_customer_return_inspection_status_v1.sql`
47. `supabase/migrations/202606100047_atomic_transfer_receive_rpcs_v1.sql`
48. `supabase/migrations/202606100048_atomic_stock_return_rpc_v1.sql`
49. `supabase/migrations/202606100049_atomic_inspection_release_rpc_v1.sql`
50. `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`
51. `supabase/migrations/202606100051_stock_take_approval_requires_lines_v1.sql`
52. `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`
53. `supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql`

## Seed Instructions

Only run seed data on a safe demo/staging database, or when you intentionally want demo data in this project.

SQL Editor option:

1. Open `supabase/seed.sql`.
2. Confirm the target project is `https://aikfqnbsshflbtuakwrz.supabase.co`.
3. Paste and run the full file after all migrations above succeed.

CLI option, only after installing and linking Supabase CLI to the correct project:

```bash
supabase db seed
```

## Verification Queries

After migration `053`, these checks should return rows or valid definitions:

```sql
select 'VOIDED'::public.stock_unit_status;
select 'INBOUND_VOID'::public.stock_movement_type;
select proname
from pg_proc
where proname = 'void_inbound_stock_unit';
```

## Remote App QA After Migration

Start with:

- `https://elite-meat-erp.vercel.app/stock/inbound`
- `https://elite-meat-erp.vercel.app/stock/movements`
- `https://elite-meat-erp.vercel.app/stock/balance`

Primary test:

1. Inbound one unique barcode.
2. Confirm the saved scan appears in the current-session list.
3. Click `Undo scan`.
4. Confirm the scan row becomes `VOIDED`.
5. Confirm `/stock/movements` shows `INBOUND_VOID`.
6. Confirm `/stock/balance` does not count the voided unit as available stock.
