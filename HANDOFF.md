# Elite Meat ERP Handoff

## Current State

This handoff reflects the codebase inspection for the existing frozen pork / meat processing ERP. No business behavior was changed in this documentation pass.

The repository already contains a large dirty worktree from previous ERP work. Treat existing modified and untracked app files as in-progress work unless the owner explicitly asks to revert them.

## What Already Exists

- Next.js App Router project with Supabase Auth and Supabase PostgreSQL.
- Public anon Supabase env usage only; no frontend service-role key was found in the documented architecture.
- Main ERP modules:
  - Dashboard/home shortcuts.
  - Stock/inventory with barcode scanning, item master, inbound, outbound, transfer, receive-transfer, return, no-barcode stock, stock take, reports.
  - Orders with order creation, item preparation, ready statuses, order reservations, notification placeholder events.
  - Delivery with delivery orders, vehicles, driver updates, payment status, proof photo metadata, and Orders-module handoff.
  - Attendance with work locations, clock in/out, late/no-clock-out/on-leave states.
  - OA actions for advances, claims, leave, payslips, and approval timelines.
  - Retail sales, POS-like sale entry, payments, cash sessions, daily closing, expenses, price rules, cleaning, and processing surfaces.
  - Processing batch entry/review and yield/loss tracking.
  - Cleaning task tracking with frequency and 30-day matrix.
  - Accounting/finance AR/AP invoices, containers, aging, payment lifecycle.
  - Director dashboard, approvals, print/WhatsApp/CSV report surfaces.
  - Admin settings for user scope, outlet module access, configurable lists, customers, customer price rules, and barcode rules.
- Migrations `202606100001` through `202606100032`.
- Seed data for internal testing.
- Documentation already present under `docs/` for testing, roles, access matrix, known limitations, and workflow acceptance.

## What Is Missing

- Real Supabase Auth test users for every role/outlet/department combination.
- Browser-based QA evidence for each route and workflow.
- Real camera testing on mobile/laptop devices.
- Real storage bucket policy validation for uploaded photos/PDFs/images.
- Production WhatsApp integration.
- Automated unit/integration tests for core business workflows.
- Clear ownership of the current dirty worktree and whether all untracked migrations should be committed together.

## Risky Logic

- Migration order matters. Later migrations tighten RLS and workflow behavior from earlier broad V1 policies.
- Role/scope isolation depends on both frontend route/module checks and Supabase RLS/server actions.
- Demo mode returns an admin/director profile when Supabase is not configured; good for local review, risky if misunderstood as production auth.
- Order outbound updates stock through an RPC and must remain atomic.
- Stock transfer location should change only after receive-transfer; changes to stock statuses can easily break this rule.
- Delivery has both standalone delivery orders and Orders-module delivery handoff records; these should not be confused.
- Retail same-day edit restrictions and "different checker than submitter" rules are business-critical and should be regression-tested.
- File upload fields currently store paths/metadata; do not assume uploads are production-safe until Storage policies are tested.

## Recommended Next Tasks

1. Freeze the current dirty worktree into a reviewed branch/commit once the owner confirms scope.
2. Run SQL migrations on a fresh Supabase project in exact filename order, then run seed data.
3. Create test Auth users for every role and assign outlet/department/stock scope.
4. Execute `docs/manual-qa-checklist.md` end to end.
5. Add focused automated tests for:
   - duplicate inbound barcode block,
   - order outbound missing/sold/wrong-location block,
   - receive-transfer location change,
   - stock take approval-only adjustment,
   - retail past-day edit block,
   - OA approval chains,
   - cross-outlet/team isolation.
6. Validate real file upload and camera scanner behavior on HTTPS or localhost.

## Current Validation Commands

Run after documentation or code changes:

```bash
npm run lint
npm run typecheck
npm run build
```

Optional existing project check:

```bash
npm run smoke
```

## Latest Documentation Pass

Task completed:

- Updated `AGENTS.md`.
- Created `HANDOFF.md`.
- Created `TASKS.md`.
- Created `docs/BUSINESS_RULES.md`.
- Created `docs/DATA_MODEL.md`.
- Created `docs/MODULE_STATUS.md`.

Files changed in this pass:

- `AGENTS.md`
- `HANDOFF.md`
- `TASKS.md`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`

Migration SQL added:

- None.

Commands run and results:

- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - first parallel run failed because `.next/types/**/*.ts` files were temporarily missing while `npm.cmd run build` was running at the same time.
- `npm.cmd run build` - passed and regenerated `.next/types`.
- `npm.cmd run typecheck` - rerun by itself after build, passed.

Remaining issues:

- No runtime behavior was changed in this pass.
- The repository still has many pre-existing modified and untracked ERP files from prior work.
- Browser/device QA and real Supabase RLS testing remain pending.

## Latest Processing Module Pass

Task completed:

- Improved the Processing module only.
- Added centralized `calculateYield` and `calculateLoss` helpers under `lib/processing/`.
- Replaced `/processing/dashboard` and `/processing/batches` rendering so those routes use a Processing-specific page instead of the Retail page wrapper.
- Processing now shows raw weight, finished weight, calculated loss kg, and calculated yield percentage in KPI cards, mobile-friendly batch cards, and a scrollable table.
- Abnormal yield is highlighted using item thresholds where available, plus yield above 100%.

Files changed:

- `app/(erp)/processing/dashboard/page.tsx`
- `app/(erp)/processing/batches/page.tsx`
- `components/processing/processing-page.tsx`
- `lib/processing/calculations.ts`
- `lib/processing/data.ts`
- `lib/processing/types.ts`
- `HANDOFF.md`

Migration SQL added:

- None.

Commands run and results:

- `npm run lint` failed in PowerShell because `npm.ps1` is blocked by local execution policy.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Risks:

- Processing still adapts existing retail processing batch data/actions because there is not yet a separate Processing database/API layer.
- Current processing records are still one raw item to one finished item; the full multi-raw to multi-finished production rule remains future work.
- The page was compile-checked but not browser-tested at phone width in this pass.

What the next agent should check:

- Open `/processing/dashboard` and `/processing/batches` on mobile width and confirm no horizontal page scroll outside the batch table.
- Test processing batch creation and review with real processing roles.
- Confirm abnormal-yield highlights match management expectations for each item threshold.
- Plan a later Processing data-model pass for true multiple raw items to multiple finished items.

## Latest Overnight QA And Progress Audit

Task completed:

- Inspected the current codebase without adding features.
- Identified existing pages and modules.
- Classified modules as internal-test complete, partial, or demo/mock-backed.
- Checked business-rule coverage against `docs/BUSINESS_RULES.md`.
- Checked duplicated logic hotspots.
- Checked large/risky files.
- Ran lint, typecheck, and build.
- Updated `docs/MODULE_STATUS.md` with audit findings and progress scoring.
- Updated this handoff.

Files changed:

- `docs/MODULE_STATUS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Commands run and results:

- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Progress estimate:

- Overall completion: 58%.
- MVP completion: 68%.
- Production readiness: 32%.

Scoring detail:

- Project foundation and navigation: 8/10.
- Data model and mock data: 7/10.
- Dashboard: 6/10.
- Inventory: 7/10.
- Processing: 5/10.
- Cleaning: 6/10.
- Import/container tracking: 4/10.
- Orders and delivery: 6/10.
- Barcode scanning: 6/10.
- Reports, testing, and deployment readiness: 3/10.

Must-fix issues:

- Delivery proof is not fully enforced before `DELIVERED` or `FAILED`.
- Order reservation insert in `lib/orders/actions.ts` does not check the insert error.
- Processing remains one raw item to one finished item through `retail_processing_batches`.
- Customer/category price rules are configurable but not fully applied during order/sale entry.
- Real Supabase Auth users, RLS, Storage, barcode camera, and mobile browser QA remain unverified.

Top next tasks:

1. Fix delivery proof enforcement for standalone delivery and customer-order delivery handoff.
2. Check and fail loudly when order reservation insertion fails.
3. Run all migrations and seed data on a fresh Supabase project.
4. Create real Auth users for every role/outlet/department/stock-location scope.
5. Execute role/scope RLS QA for stock, orders, delivery, retail, processing, finance, and settings.
6. Verify barcode scanner on phone and laptop camera.
7. Validate file upload/storage policies for proof photos, invoices, claims, payslips, and reports.
8. Apply customer/category price rules during order and retail sale entry.
9. Decide and implement the canonical processing data model for multiple raw items to multiple finished items.
10. Add smoke/browser tests and server-action/RLS regression checks for blocked paths.

Suggested next agent task:

- Use a Logic/Data agent to fix the two highest-risk workflow gaps first: proof-required delivery completion and checked order reservation creation. Do not start visual redesign or broad refactors before those workflow guards are corrected and tested.

## Latest Logic/Data Workflow Guard Pass

Task completed:

- Fixed delivery proof enforcement in server actions.
- Fixed order reservation insert error handling.
- Added smoke-script regression checks for both workflow guards.
- Updated module status and this handoff.

Files changed:

- `lib/delivery/actions.ts`
- `lib/orders/actions.ts`
- `scripts/smoke-routes.mjs`
- `docs/MODULE_STATUS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

What changed:

- Standalone delivery status updates now read `proof_file_id` and reject `DELIVERED` or `FAILED` when proof is missing.
- Customer-order delivery status updates now reject `DELIVERED` or `FAILED` when `proof_file_id` is missing.
- Order item creation now checks the order status update error and the `order_stock_reservations` insert error.
- If reservation insertion fails, the action returns a clear error instead of reporting success without a reservation.

Fixed status:

- Delivery proof requirement: fixed at server-action layer for standalone delivery and customer-order delivery.
- Order reservation insert checking: fixed for fail-loud behavior.

Remaining risks:

- Order item creation and reservation creation are still separate database writes. If the reservation insert fails after the order item insert, the user sees an error, but a partial order item can remain. Recommended follow-up is an atomic RPC/transaction.
- Delivery proof enforcement was added in server actions. Direct database writes still depend on RLS/triggers and should be verified with real role-scoped Supabase users.
- File upload behavior still depends on real Supabase Storage bucket policies.

Recommended next task:

- Implement an atomic database RPC for adding an order item and reservation together, or add a safe compensating cleanup strategy if RPC scope is deferred.

## Latest Atomic Order Item Reservation Pass

Task completed:

- Added an atomic Supabase RPC for customer order item creation plus stock reservation creation.
- Updated the order item server action to call the RPC instead of separate `customer_order_items` and `order_stock_reservations` writes.
- Updated smoke checks and module status documentation.

Files changed:

- `lib/orders/actions.ts`
- `scripts/smoke-routes.mjs`
- `docs/MODULE_STATUS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100033_order_item_reservation_rpc_v1.sql`

Exact migration order:

- Run all existing migrations in filename order.
- Run `supabase/migrations/202606100033_order_item_reservation_rpc_v1.sql` after `supabase/migrations/202606100032_admin_settings_customer_pricing_v1.sql`.
- Then run `supabase/seed.sql` if setting up demo data.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

What changed:

- New RPC: `public.add_customer_order_item_with_reservation(...)`.
- The RPC validates the order exists and is accessible through caller RLS.
- The RPC rejects closed/non-editable orders, negative requested values, and missing requested quantity/weight.
- The RPC inserts `customer_order_items`, updates the order to `PREPARING`, and inserts `order_stock_reservations` in one PostgreSQL function call.
- If any insert/update fails, PostgreSQL rolls back the whole function call, so the order item should not remain without a matching reservation.
- `addCustomerOrderItemAction` now returns `Could not add order item and reserve stock: ...` for RPC failures.

Assumptions documented:

- `profiles.id` matches `auth.uid()` for authenticated Supabase users.
- Existing RLS policies on `customer_orders`, `customer_order_items`, and `order_stock_reservations` are the intended authorization layer.
- The RPC is `security invoker` by design so it does not bypass role/outlet/department scope.
- `order_stock_reservations.location_id` may be null because the existing table and action allowed null stock location scope.

Remaining issues:

- The RPC has not been executed against a real Supabase project in this pass.
- Live testing must confirm scoped users can call the RPC after all migrations are applied.
- If the new migration is not applied, adding order items through the app will fail because the server action now depends on the RPC.

Next recommended task:

- Apply migrations on a fresh Supabase project, seed demo data, then test adding order items as retail, processing, admin, and an out-of-scope user to verify success and blocked paths.

## Latest Supabase QA Plan Pass

Task completed:

- Created a production-readiness Supabase QA plan for Auth, RLS, Storage, delivery proof enforcement, order reservation RPC validation, and barcode device testing.
- No business features or app behavior were changed.

Files changed:

- `docs/SUPABASE_QA_PLAN.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Commands run and results:

- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

What changed:

- Documented all ERP roles.
- Documented seeded outlets, departments, stock locations, and outlet module access.
- Added positive and negative QA Auth user matrix.
- Listed RLS-enabled tables that need verification.
- Listed Storage upload workflows and current `erp-files` policy risk.
- Added checklists for Auth users, RLS allowed/denied cases, delivery proof upload, processing upload absence, barcode phone/laptop QA, order reservation creation, and delivery completion proof enforcement.

Remaining issues:

- The plan has not yet been executed against a real Supabase staging project.
- Current Storage object policies are broad for authenticated users and need explicit production sign-off or later tightening.

Next recommended task:

- Execute `docs/SUPABASE_QA_PLAN.md` on a fresh Supabase staging project, then automate the RLS allowed/denied checks with seeded QA Auth users.

## Latest Confirmed Business Rules + Picking-Time Reservation Pass

Task completed:

- Updated project direction documents with the latest confirmed business rules.
- Implemented the next safest business-logic improvement: customer order item entry no longer reserves stock; picking/preparation now creates the stock reservation atomically.

Files changed:

- `AGENTS.md`
- `README.md`
- `TASKS.md`
- `HANDOFF.md`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/SUPABASE_QA_PLAN.md`
- `docs/manual-qa-checklist.md`
- `docs/role-team-access-matrix.md`
- `docs/workflow-acceptance-checklist.md`
- `components/orders/orders-forms.tsx`
- `lib/orders/actions.ts`
- `scripts/smoke-routes.mjs`

Migration SQL added:

- `supabase/migrations/202606100034_order_reservation_on_picking_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100034_order_reservation_on_picking_v1.sql`.
- `202606100033_order_item_reservation_rpc_v1.sql` must still run before `202606100034_order_reservation_on_picking_v1.sql`; migration `034` drops the obsolete add-item reservation RPC and creates the picking-time reservation RPC.
- Then run `supabase/seed.sql` if setting up demo data.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

What changed:

- Confirmed rules documented:
  - stock is reserved only when picking/preparation starts,
  - no free order editing after reservation,
  - temporary negative stock is allowed but needs alerts,
  - manual batch/barcode selection remains for now,
  - damaged/spoiled stock requires director approval before deduction,
  - stock take adjustment needs department manager approval before director final approval,
  - partial delivery is not allowed for MVP,
  - cancelled-after-reservation stock remains reserved until manual release,
  - overdue credit customer is warning-only,
  - finance/aging reports are director/account only,
  - multi-outlet/location staff access is a confirmed future model.
- `addCustomerOrderItemAction` now inserts only `customer_order_items`.
- `addCustomerOrderItemAction` blocks adding more items once the order already has an active reservation.
- New RPC `public.prepare_customer_order_item_with_reservation(...)` atomically:
  - locks the order item,
  - validates the order/item can still start picking,
  - marks the item prepared,
  - writes the preparation log,
  - updates the order to `PREPARING`,
  - creates the active `order_stock_reservations` row.
- `prepareCustomerOrderItemAction` now calls that RPC and returns a clear error if preparation/reservation fails.

Remaining issues:

- Multi-outlet/multi-location access is documented but not implemented.
- Temporary negative stock alerts were documented but not implemented at that time; see the later negative stock alert pass below.
- Manager then director stock-take adjustment approval is documented but not implemented.
- Damaged/spoiled stock director approval before deduction is documented but not implemented.
- Manual reservation release after customer cancellation is documented but not implemented.
- Overdue credit customer warning is documented but not implemented.
- The new migration has not been run against a real Supabase staging project in this pass.

Next recommended task:

- Implement temporary negative stock alerts in stock balance/report surfaces, because temporary negative stock is now allowed but must be highly visible.

## Latest Supabase Production QA Plan Refresh

Task completed:

- Refreshed the Supabase production-readiness QA plan for Auth, RLS, Storage uploads, delivery proof enforcement, order reservation RPC checks, and barcode device testing.
- No business features or app behavior were changed.

Files changed:

- `docs/SUPABASE_QA_PLAN.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Commands run and results:

- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

What changed:

- Expanded the QA Auth matrix so each operational role is tested across `JALAN CHANNEL`, `SUNGAI MERAH`, `WONDERFUL`, and `SUNGAI MAAW` outlet/stock-location scopes.
- Kept separate global control users for `account`, `admin`, and `director`.
- Added cross-scope denial pairs for retail, stock, orders, delivery, processing, attendance, OA, and finance.
- Added an explicit delivery proof upload checklist separate from delivery completion proof enforcement.
- Clarified Auth/profile setup checks, including the need to confirm the Auth trigger or manually repair profile rows before assigning roles.

Remaining issues:

- The QA plan has not yet been executed against a real Supabase staging project.
- Current Storage policies still allow broad authenticated read/upload to `erp-files`; the plan flags this for production sign-off or later policy tightening.
- The plan is manual. A future automated RLS test script is still recommended.

Next recommended task:

- Execute `docs/SUPABASE_QA_PLAN.md` on a fresh Supabase staging project, then automate the allowed/denied RLS checks using the QA Auth matrix.

## Latest Stock Alert Pass

Task completed:

- Implemented the next confirmed stock rule gap: temporary negative stock remains allowed, but stock users now get a clear alert when balance data goes below zero.
- Implemented stock age alerts from barcode unit inbound dates for stock older than 6 months and 12 months.

Files changed:

- `lib/stock/types.ts`
- `lib/stock/data.ts`
- `lib/stock/demo-data.ts`
- `components/stock/stock-page.tsx`
- `components/ui/status-badge.tsx`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/manual-qa-checklist.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

What changed:

- Added centralized negative stock alert derivation from stock balance rows.
- Added centralized stock age alert derivation from `stock_units.received_at`.
- Balance rows now include combined quantity/weight and negative stock metadata.
- Stock dashboard KPIs now include the number of negative stock alerts and stock age alerts.
- Stock pages show a top-level `Negative stock alert` panel when negative balances exist.
- Stock pages show a top-level `Stock age alert` panel when stockable barcode units are older than 6 months or 12 months.
- Stock balance table shows total quantity, total kg, and `NEGATIVE STOCK`/`OK` status.
- Stock WhatsApp report summaries include negative stock and stock age alert counts.
- Demo data includes one negative no-barcode balance and two aged barcode units so local/demo mode can verify both alert paths.

Remaining issues:

- Negative stock alerting is application-derived and has not yet been verified against real Supabase role-scoped data.
- Stock age alerting is application-derived and has not yet been verified against real Supabase role-scoped data.
- No database notification/escalation workflow exists yet for negative stock; this pass only makes it visible in stock balance/report surfaces.
- Manager then director stock-take approval, damaged/spoiled director approval, manual reservation release, overdue credit warning, and multi-scope access remain open confirmed rule gaps.

Next recommended task:

- Implement the stock-take adjustment approval chain: department manager review first, then director final approval before adjustment is applied.

## Latest Part 2 Delivery / Barcode / Processing Direction Pass

Task completed:

- Updated project direction for PART 2 rules covering delivery, processing, pricing/customer, barcode, cleaning, storage, and Supabase/RLS expectations.
- Implemented the safest workflow slices:
  - delivery proof metadata and auto-delivered proof completion,
  - atomic customer-order proof completion plus customer GPS update,
  - delivery e-wallet payment type support,
  - delivery status/proof/payment access for assigned non-director staff who have delivery module access,
  - centralized barcode weight decoder with GS1 `3102`/`3103`, 1-3 decimal position rules, fixed-weight fallback, and manual confirmation messaging,
  - default processing abnormal-yield alert below 85%.

Files changed:

- `AGENTS.md`
- `README.md`
- `TASKS.md`
- `HANDOFF.md`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/SUPABASE_QA_PLAN.md`
- `components/delivery/delivery-forms.tsx`
- `components/orders/orders-forms.tsx`
- `components/stock/workflow-forms.tsx`
- `lib/delivery/actions.ts`
- `lib/delivery/types.ts`
- `lib/orders/actions.ts`
- `lib/processing/calculations.ts`
- `lib/processing/data.ts`
- `lib/stock/barcode-weight.ts`
- `scripts/smoke-routes.mjs`
- `supabase/seed.sql`

Migration SQL added:

- `supabase/migrations/202606100035_part2_delivery_proof_metadata_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100035_part2_delivery_proof_metadata_v1.sql`.
- Then run `supabase/seed.sql` for demo data.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

What changed:

- Delivery proof upload now requires receiver name, latitude, longitude, and image file.
- Standalone delivery proof upload updates `delivery_orders` with proof metadata and marks the order `DELIVERED`.
- Customer-order proof upload now calls `public.complete_customer_order_delivery_with_proof`, which locks the order row, checks scoped delivery access, updates `customer_orders` proof metadata, marks the order `DELIVERED`, and updates linked `customers.latitude` / `customers.longitude` in one database transaction.
- Delivery payment type now includes `EWALLET`.
- Delivery status/proof actions now allow assigned non-director staff with delivery module access; vehicle setup and new standalone delivery order entry remain delivery manager/admin workflows.
- Delivery payment entry now allows delivery general workers, delivery managers, account, and admin.
- Migration `202606100035_part2_delivery_proof_metadata_v1.sql` overrides delivery access helper functions idempotently so RLS matches the delivery-access workflow for scoped users.
- VIP customer category is added idempotently; legacy categories are not destructively removed.
- Barcode inbound now decodes GS1 `3102` and `3103`, supports 1-3 decimal position rules, supports fixed-weight fallback, and blocks auto-save when manual confirmation is required.
- Processing abnormal-yield checks default to below 85% when an item-specific minimum is absent.
- MVP storage scope is documented as delivery proof and import documents first; receipts and stock photos remain later.

Remaining issues:

- Failed delivery reinbound/return stock workflow is documented but not implemented.
- Multiple raw items to multiple finished items is documented but not implemented.
- Finished-product barcode generation from Processing output is documented but not implemented.
- Staff price override reason enforcement is documented but not implemented.
- AutoCount-format aging buckets are documented but not implemented.
- Import document upload remains represented by finance invoice upload; a dedicated import document workflow is not implemented.
- Standalone delivery proof upload plus status log insert are still separate writes; a future RPC should make standalone proof completion and logging atomic.

Next recommended task:

- Implement failed-delivery reinbound/return workflow first, because it protects stock accuracy after unsuccessful deliveries.

## Latest Part 3 Reservation Release Pass

Task completed:

- Updated docs/task queue with confirmed Part 3 rules.
- Selected one high-priority implementation task: manual release of reserved stock after a customer order is cancelled.
- Confirmed order creation/item entry does not reserve stock; picking/preparation still creates reservations through `prepare_customer_order_item_with_reservation`.
- Added manual reservation release for cancelled customer orders.

Files changed:

- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `components/orders/orders-forms.tsx`
- `components/orders/orders-page.tsx`
- `lib/orders/actions.ts`
- `lib/orders/data.ts`
- `lib/orders/types.ts`
- `scripts/smoke-routes.mjs`
- `HANDOFF.md`

Migration SQL added:

- None. Existing `order_stock_reservations.status` already supports `RELEASED`.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

What changed:

- Added `releaseOrderReservationsAction`.
- The release action requires the order to be `CANCELLED`.
- The release action updates only `ACTIVE` reservations to `RELEASED`.
- If the order is not cancelled or no active reservation exists, staff get a clear error.
- Orders data now loads and maps `order_stock_reservations`.
- Orders UI now shows a stock reservations table.
- Orders prepare/detail UI now includes a `Release reserved stock` form for cancelled orders with active reservations.
- Demo orders now include a cancelled order with an active reservation so the release surface is visible in demo mode.
- Smoke checks now cover the release action, release form, reservation data loading, and the no-auto-release rule text.

Remaining issues:

- Release workflow has not been verified against real Supabase RLS with seeded Auth users.
- Reservation release is a single-table update plus audit log, not a database RPC. If audit logging must be atomic with the release, add an RPC later.
- Cancelling a normal non-delivery order is still not a dedicated Orders-module action; current cancellation paths are limited by existing delivery/order status flows.

Next recommended task:

- Implement failed-delivery reinbound/return stock workflow and log linkage, because it is now the highest stock-accuracy gap after reservation release.

## Latest Failed Delivery Return Workflow Pass

Task completed:

- Implemented failed customer-order delivery return/reinbound workflow for linked barcode stock.
- Kept standalone delivery safe by recording `NO_STOCK_LINK` instead of pretending stock was returned.
- Blocked plain `FAILED` status updates so staff must upload failed proof with photo, receiver/contact name, and GPS.
- Surfaced failed-return status in delivery and order views.

Files changed:

- `README.md`
- `TASKS.md`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/manual-qa-checklist.md`
- `components/delivery/delivery-forms.tsx`
- `components/delivery/delivery-page.tsx`
- `components/orders/orders-forms.tsx`
- `components/orders/orders-page.tsx`
- `lib/delivery/actions.ts`
- `lib/delivery/data.ts`
- `lib/delivery/demo-data.ts`
- `lib/delivery/types.ts`
- `lib/orders/actions.ts`
- `lib/orders/data.ts`
- `lib/orders/types.ts`
- `scripts/smoke-routes.mjs`
- `supabase/migrations/202606100036_failed_delivery_return_workflow_v1.sql`

Migration SQL added:

- `supabase/migrations/202606100036_failed_delivery_return_workflow_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100036_failed_delivery_return_workflow_v1.sql`.
- Then run `supabase/seed.sql`.

What changed:

- Added `failed_return_status`, `failed_return_required_units`, `failed_return_completed_units`, and `failed_return_logged_at` to `customer_orders` and `delivery_orders`.
- Added `public.fail_customer_order_delivery_with_proof`.
- The failed-delivery RPC locks the customer order, requires delivery scope access, finds linked `stock_outbound_batch_lines` where `outbound_type = 'SALES'`, returns linked barcode `stock_units` to `IN_STOCK`, inserts `stock_movements` with `movement_type = 'RETURN'`, inserts `barcode_scan_logs` with `action = 'RETURN'`, updates failed-return counters, and writes an audit log.
- The failed-delivery RPC does not release or delete active `order_stock_reservations`.
- Customer-order proof upload can now submit `DELIVERED` or `FAILED`; `FAILED` calls the return RPC and does not create a delivered notification event.
- Standalone delivery proof upload can mark `FAILED`, stores proof metadata, records `NO_STOCK_LINK`, and logs a status message requiring manual return follow-up.
- Direct status update to `FAILED` is blocked for standalone deliveries and customer-order deliveries.
- Delivery and Orders pages show failed-return status so staff can see `Returned`, `Pending`, or `No linked stock`.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Failed standalone deliveries still have no normalized stock link; staff must follow up manually when `NO_STOCK_LINK` is shown.
- Failed delivery return currently handles barcode stock linked through sales outbound batch lines. Loose/no-barcode stock return needs a later workflow.
- The failed customer-order proof action uploads the Storage object and file metadata before calling the return RPC. If the RPC fails, uploaded proof metadata/object cleanup is not automatic.
- Real Supabase RLS, Storage policy, and device/browser QA are still required with seeded Auth users.

Next recommended task:

- Add real Supabase QA scripts or browser/manual evidence for the full order -> outbound -> failed delivery -> return movement flow, then implement no-barcode/standalone failed-return stock resolution if the business needs it for MVP.

## Latest Local Demo Profile Scope Fix

Task completed:

- Fixed local/demo profile scope for `clementkcl@elitempsb.com`.
- Checked the possible email variants `clementkc`, `clementkl`, and `clementkcl`.
- Kept production RLS/access logic unchanged.

Files changed:

- `README.md`
- `supabase/seed.sql`
- `scripts/smoke-routes.mjs`
- `HANDOFF.md`

What changed:

- Demo seed now enables every current ERP module in `outlet_module_access` for every demo outlet.
- Existing profiles with these emails are updated to a valid broad testing scope:
  - `clementkc@elitempsb.com`
  - `clementkl@elitempsb.com`
  - `clementkcl@elitempsb.com`
- Matching Clement profiles are assigned the `admin` and `director` roles only, replacing stale/default role rows.
- Matching Clement profiles are scoped to the `DIRECTOR` outlet, `Management` department, and `DIRECTOR` stock location. Admin/director roles still give global access in the app.

Root cause:

- The Auth user could sign in, but the seed did not include or upgrade `clementkcl@elitempsb.com`.
- The Auth trigger-created profile therefore had no outlet, department, or stock location.
- With no explicit role rows, the app fell back to `retail_team_general_worker`, and with no outlet the user had no module access rows to read.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Required local reseed command:

- `supabase db seed`

Remaining issue:

- The seed updates existing Auth-triggered profile rows. If the Auth user does not exist yet, sign in/create `clementkcl@elitempsb.com` first, then run `supabase db seed` again.

## Latest Admin Settings User Access UI Pass

Task completed:

- Improved `/settings` so admin can assign user outlet, department, stock location, roles, and selected outlet module access from one User Access form.
- Kept production RLS and access helpers unchanged.
- Reused existing `profiles`, `profile_roles`, and `outlet_module_access` tables.

Files changed:

- `components/settings/settings-page.tsx`
- `lib/settings/actions.ts`
- `scripts/smoke-routes.mjs`
- `HANDOFF.md`
- `docs/codex-current-status.md`

What changed:

- User Access form now includes module checkboxes for the selected outlet.
- Saving User Access updates:
  - `profiles.outlet_id`
  - `profiles.department_id`
  - `profiles.stock_location_id`
  - `profile_roles`
  - `outlet_module_access` for the selected outlet
- The module access UI clearly notes that module toggles are outlet-level and apply to users assigned to that outlet.
- Existing separate Outlet Module Access form remains available for outlet-level edits.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issue:

- Module access is still outlet-level, not per-user. This matches the current data model and RLS design. A future per-user module override would need a new table and RLS plan.
