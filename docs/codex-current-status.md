# Codex Current Status

Last updated: 2026-06-12

## A. Current Overall Status

### Goal In Progress

The active work was ERP workflow hardening for Elite Meat ERP. The latest task improved the Admin Settings user access UI so admin can assign user scope, roles, and selected outlet module access without editing Supabase SQL directly.

No new feature implementation is currently running. The last command set completed successfully, and work is paused for review.

### Completed

- Improved `/settings` User Access so admin can edit:
  - user outlet
  - user department
  - user stock location
  - user roles
  - module access for the selected outlet
- Reused existing `profiles`, `profile_roles`, and `outlet_module_access` tables.
- Kept production RLS and access helpers unchanged.
- Fixed demo/local profile scope seed data for `clementkcl@elitempsb.com`.
- Checked email variants:
  - `clementkc@elitempsb.com`
  - `clementkl@elitempsb.com`
  - `clementkcl@elitempsb.com`
- Updated seed data so matching existing Auth-triggered profiles get:
  - `admin` role
  - `director` role
  - `DIRECTOR` outlet
  - `Management` department
  - `DIRECTOR` stock location
- Updated seed data so every demo outlet has every current ERP module enabled in `outlet_module_access`.
- Kept production RLS and application access logic unchanged.
- Updated smoke checks to guard the seed profile/module-access fix.
- Previously completed workflow hardening includes:
  - Orders module basics.
  - Picking-time stock reservation instead of reservation at order creation.
  - Manual release of active reservations only after customer order cancellation.
  - Order outbound batch scanning through an atomic RPC.
  - Delivery proof metadata with receiver/GPS.
  - Successful customer-order delivery proof updating customer latitude/longitude.
  - Failed customer-order delivery proof returning linked barcode stock to `IN_STOCK`.
  - Failed-return status visibility on Orders and Delivery pages.

### Still Incomplete

- Real Supabase RLS testing with seeded Auth users.
- Real Supabase Storage policy testing for proof uploads and import documents.
- Browser/device QA for barcode scanner on phone and laptop.
- Standalone failed-delivery stock return linkage.
- Loose/no-barcode failed-delivery return automation.
- Full multiple-raw to multiple-finished processing model.
- Finished-product barcode generation from Processing output.
- Barcode label printing workflow.
- Customer price rule application across order/retail line entry.
- Staff price override reason enforcement.
- AutoCount-format aging buckets.
- Import document upload workflow beyond finance/container metadata.
- Stock-take manager-then-director approval chain.
- Director approval before damaged/spoiled stock deduction.
- Automated regression tests beyond static smoke checks.

### Blockers / Risks

- The latest profile-scope fix updates existing Auth-created profile rows. If `clementkcl@elitempsb.com` does not exist in Supabase Auth yet, sign in/create the user first, then run seed again.
- Current multi-scope support is limited. Non-admin/director profiles still have one primary outlet, department, and stock location.
- Admin/director global access is application/RLS-helper based; real RLS must be verified with real Auth users.
- Module access is still outlet-level, not per-user. The Settings UI edits `outlet_module_access` for the selected user's outlet, matching the current data model.
- Failed customer-order delivery return currently depends on `stock_outbound_batch_lines` for barcode stock. It does not cover standalone delivery stock or no-barcode stock automatically.
- The failed customer-order proof action uploads the Storage object and file metadata before the failed-return RPC. If the RPC fails, automatic proof object cleanup is not implemented.
- Direct database writes still rely on RLS/triggers; UI/server-action validation alone is not enough for production.

## B. Changed Files

Current uncommitted files from the latest Settings/user-access work and recent local/demo scope fix:

### App Pages

- None in the latest run.

### Components

- `components/settings/settings-page.tsx`

### Server Actions

- `lib/settings/actions.ts`

### Migrations

- None added in the latest Settings/user-access work.

### Docs

- `README.md`
- `HANDOFF.md`
- `docs/codex-current-status.md`

### Tests / Scripts

- `scripts/smoke-routes.mjs`

### Seed Data

- `supabase/seed.sql`

Previously completed ERP workflow work also touched Orders, Delivery, Stock, Processing, Settings, docs, and migrations. See `HANDOFF.md` for the longer historical list.

## C. New Migrations

No new migration was added for the latest Settings/user-access work. It uses the existing settings/access schema.

No new migration was added for the Admin Settings user access UI pass. It uses existing tables and policies.

Current newer ERP workflow migrations in the repo are:

- `202606100021_orders_workflow_v1.sql`
  - Adds customer orders, order items, preparation logs, and notification event placeholders.
- `202606100022_order_outbound_batches_v1.sql`
  - Adds outbound batch and batch-line tables for order-based barcode outbound scanning.
- `202606100023_customer_order_delivery_proof_v1.sql`
  - Adds proof/customer delivery support to customer orders.
- `202606100024_orders_module_access_v1.sql`
  - Adds `orders` to outlet module access constraints and enables orders module access.
- `202606100025_orders_module_rls_v1.sql`
  - Adds scoped RLS for Orders module tables.
- `202606100026_customer_order_delivery_access_v1.sql`
  - Adds delivery-access helpers/policies for customer-order delivery handoff.
- `202606100027_orders_delivery_role_tightening_v1.sql`
  - Tightens Orders/Delivery role separation so delivery roles do not become general order operators.
- `202606100028_order_outbound_atomic_rpc_v1.sql`
  - Adds atomic `confirm_order_outbound_batch` RPC for outbound scanning and stock state updates.
- `202606100029_order_workflow_guards_v1.sql`
  - Adds database workflow guards for customer order status transitions.
- `202606100030_director_view_only_order_ops_v1.sql`
  - Makes director view-only for routine order operations.
- `202606100031_stock_director_view_scope_v1.sql`
  - Keeps director view/approval scope while removing routine stock-operation access.
- `202606100032_admin_settings_customer_pricing_v1.sql`
  - Adds admin settings tables, customers, customer categories, customer price rules, leave balances, barcode rules, and order reservations.
- `202606100033_order_item_reservation_rpc_v1.sql`
  - Adds an earlier order-item-plus-reservation RPC, later superseded.
- `202606100034_order_reservation_on_picking_v1.sql`
  - Moves reservation creation to picking/preparation through `prepare_customer_order_item_with_reservation`.
- `202606100035_part2_delivery_proof_metadata_v1.sql`
  - Adds delivery proof receiver/GPS metadata and successful customer-order delivery proof RPC that updates customer lat/long.
- `202606100036_failed_delivery_return_workflow_v1.sql`
  - Adds failed-return tracking fields and `fail_customer_order_delivery_with_proof`, which returns linked outbound barcode stock to `IN_STOCK` and logs return movement/scan rows.

### Exact SQL Run Order

Run migrations in filename order:

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
37. `supabase/seed.sql`

### Run Status

- Codex did not apply migrations to a live Supabase project.
- The migrations still need to be run in your Supabase project if not already applied.
- The latest seed change needs to be applied with `supabase db seed` after the Auth user exists.

## D. Workflow Review

### Order -> Prepare -> Outbound -> Delivery

Status: strong partial.

- Order creation exists.
- Order item entry no longer reserves stock immediately.
- Picking/preparation creates reservations through RPC.
- Ready-for-pickup and ready-for-delivery states exist.
- Order outbound is order-based and uses an atomic RPC for barcode scan confirmation.
- Delivery handoff exists for delivery-required customer orders.
- Delivered proof can update customer lat/long.
- Failed customer-order proof returns linked barcode stock to `IN_STOCK`.
- Remaining gaps: real RLS QA, standalone/no-barcode failed returns, more automated tests, and full browser workflow evidence.

### Continuous Stock Inbound Scanning

Status: partial.

- Barcode scanner component exists.
- Inbound form can scan barcodes and use manual fallback.
- Duplicate inbound barcode is blocked.
- Movement and scan logs are created.
- Remaining gaps: real phone/laptop camera QA and high-volume continuous scanning UX validation.

### Barcode Weight-Position Rules

Status: partial.

- Barcode rules are saved by item and brand.
- GS1 `3102` and `3103` support exists.
- 1, 2, and 3 decimal position rules exist.
- Fixed-weight fallback exists with manual confirmation requirement.
- Remaining gaps: broader real barcode sample testing and rule-management QA with real users.

### Barcode Label Printing

Status: incomplete.

- Barcode generation/label printing is planned.
- No complete label print workflow is confirmed as production usable.

### Customer Master And Customer Category Pricing

Status: partial.

- Customer master exists in admin settings.
- Customer categories include Retail, Wholesale, VIP, and Other.
- Customer price rules table exists.
- Remaining gaps: category pricing is not fully applied across order/retail line entry, and staff price override reason enforcement is incomplete.

### Delivery Proof Photo And Customer Lat/Long Update

Status: strong partial.

- Delivery proof requires image file, receiver/contact name, and GPS in server actions.
- Successful customer-order proof calls an RPC that updates customer latitude/longitude.
- Failed customer-order proof calls an RPC that returns linked barcode stock and records failed-return status.
- Remaining gaps: Storage policy QA, proof cleanup if later RPC fails, standalone/no-barcode failed returns.

### Processing Raw Material Scan And Yield/Loss

Status: partial.

- Processing UI shows raw weight, finished weight, loss kg, yield %, and abnormal yield below 85%.
- Yield/loss calculation helpers are centralized.
- Current data model still adapts retail processing batches and remains one raw item to one finished item.
- Remaining gaps: multiple raw items from multiple batches/barcodes to multiple finished outputs; finished product barcode generation; barcode raw-material scan workflow.

### Attendance Clock-In/Out, No-Clock-Out, Leave Balance

Status: partial.

- GPS clock-in/out exists.
- Work-location radius, department timing, 5-minute late grace, no-clock-out, and leave sync exist.
- Leave balances table exists.
- Remaining gaps: real device GPS QA and full leave-balance adjustment workflow validation.

### OA Claim/Advance/Leave Approval

Status: strong partial.

- Advance: staff -> admin review -> director approve/reject -> account pay.
- Claim: staff -> manager review -> admin review -> director approve/reject -> account pay.
- Leave: staff -> department manager approve/reject.
- Payslip upload/view flows exist.
- Remaining gaps: real role/user QA and broader regression tests.

### Accounting AR/AP And Aging

Status: partial.

- AR/AP invoice metadata exists.
- Upload metadata, review, approval, payment status, and container metadata exist.
- Aging display exists in finance/dashboard surfaces.
- Remaining gaps: Storage QA, AutoCount-format aging buckets, extraction/manual correction workflow, real invoice upload verification.

### Director Dashboard And Reports

Status: partial.

- Director dashboard, approvals, reports, print/PDF-ready views, WhatsApp-ready summaries, and CSV surfaces exist.
- Director is mostly view/approve in newer logic.
- Remaining gaps: report coverage breadth, real role QA, and final production reporting validation.

## E. Validation

Latest commands run:

- `npm.cmd run smoke` - passed
- `npm.cmd run lint` - passed
- `npm.cmd run typecheck` - passed
- `npm.cmd run build` - passed

No browser/device QA was performed in the latest pause/status step.

## F. Next Action Plan

### What To Run First When You Return

If the Supabase Auth user already exists:

```bash
supabase db seed
```

If `clementkcl@elitempsb.com` does not exist yet:

1. Create/sign in once as `clementkcl@elitempsb.com` so the Auth trigger creates the `profiles` row.
2. Run:

```bash
supabase db seed
```

Then restart or refresh the app and sign out/sign in again.

### What To Test First

1. Sign in as `clementkcl@elitempsb.com`.
2. Confirm the sidebar shows broad admin/director navigation, not only Home.
3. Confirm Home no longer says `Profile scope missing`.
4. Confirm scope badge shows global viewing scope or admin/director behavior.
5. Open `/settings`.
6. In User Access, select a user and update outlet, department, stock location, roles, and module access for the selected outlet.
7. Sign in as that user and confirm sidebar/routes match the assigned role/scope/module setup.
8. Open `/stock/dashboard`, `/orders`, `/delivery/orders`, `/accounting-finance/dashboard`, and `/director-reports/dashboard`.

### What Codex Should Continue Next

After login/scope is confirmed, continue with real Supabase QA rather than new feature work:

1. Verify seeded role/scope users.
2. Verify RLS allowed/denied cases.
3. Verify order -> prepare -> outbound -> delivery happy path.
4. Verify failed customer-order delivery returns linked barcode stock.
5. Verify Storage proof upload policies.
6. Verify barcode scanner on real phone/laptop.

### Exact Next Codex Prompt

```text
Continue from docs/codex-current-status.md.

Do not add new features yet.

First verify the local/demo profile-scope fix after I have run supabase db seed:
- clementkcl@elitempsb.com should have admin/director access.
- Home should not show Profile scope missing.
- Sidebar should show broad ERP navigation.

Then perform QA only:
1. Check role/module/sidebar access.
2. Check order -> prepare -> outbound -> delivery happy path.
3. Check failed customer-order delivery proof returns linked barcode stock.
4. Check Storage proof upload behavior if local Supabase is configured.
5. Check barcode scanner pages for runtime issues.

Run npm.cmd run smoke, lint, typecheck, and build.
Update docs/codex-current-status.md and HANDOFF.md with results.
Do not implement new features unless a small fix is required to make the tested workflow work.
```
