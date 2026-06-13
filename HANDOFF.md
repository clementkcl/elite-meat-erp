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

## Latest UX Agent Workflow Documentation Pass

Task completed:

- Added UX-focused Codex agent workflow documentation.
- No app features, business logic, database schema, RLS, or migrations were changed.

Files changed:

- `AGENTS.md`
- `docs/AGENT_WORKFLOW.md`
- `docs/UX_AGENT_GUIDE.md`
- `docs/USER_FRIENDLY_CHECKLIST.md`
- `HANDOFF.md`

What changed:

- Added Worker UX Agent.
- Added Mobile Scanner UX Agent.
- Added Manager Dashboard UX Agent.
- Added Driver UX Agent.
- Added Error and Empty State Agent.
- Added Accessibility and Language Agent.
- Added User Journey QA Agent.
- Documented UX agent rules, acceptance checks, and required commands.

Commands run and results:

- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining risks:

- These are workflow docs only. No usability changes have been applied to the app yet.
- Future UX tasks must still verify role/scope restrictions and avoid changing business logic unless a usability-blocking bug requires it.

Next recommended task:

- Start with Mobile Scanner UX Agent on `/stock/inbound` and `/stock/outbound`, because scanning speed and clarity are high-impact worker workflows.

## Latest Stock Inbound Barcode / Label Pass

Task completed:

- Advanced the Stock Module goal by hardening stock inbound, item master, barcode rule scope, and label printing.
- Kept work scoped to stock files, stock docs, seed data, and stock smoke checks.

Files changed:

- `components/stock/workflow-forms.tsx`
- `components/stock/stock-page.tsx`
- `lib/stock/actions.ts`
- `lib/stock/data.ts`
- `lib/stock/demo-data.ts`
- `lib/stock/types.ts`
- `scripts/smoke-routes.mjs`
- `supabase/seed.sql`
- `supabase/migrations/202606100037_stock_inbound_labels_rules_v1.sql`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100037_stock_inbound_labels_rules_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100037_stock_inbound_labels_rules_v1.sql`.
- Then run `supabase/seed.sql`.
- This migration has not been run against the live Supabase project by Codex.

What changed:

- Item master now uses numeric-only item codes in the server action and UI, with next-code style `0001`, `0002`, etc.
- Migration `037` converts old non-numeric `items.item_code` values to numeric codes and adds a numeric-only check constraint.
- Item master now supports editable Chinese name, Iban name, and default low stock kg fields.
- Stock operators can create/edit item master, brands, and origins; delete remains admin/director-only through RLS.
- Inactive items are blocked from new barcode inbound.
- Inbound sources now include supplier/import, processing output, customer return, transfer received, manual adjustment, and other.
- Brand and origin selectors on inbound allow Other/custom values.
- Barcode weight rules are now saved globally by item + brand + origin using `barcode_weight_rules.location_id = null`; old location-specific rules can remain for compatibility.
- Inbound form can generate numeric internal barcode labels based on date + numeric item code + weight in grams + serial.
- Inbound form shows duplicate barcode warning before submit and still relies on server-side duplicate block.
- Recent successful inbound labels are listed and can be printed/exported as PDF labels using 50mm x 30mm pages.
- Success feedback now includes optional vibration/sound in supported browsers.
- Seed stock item codes were updated to numeric values so fresh seed runs remain compatible with migration `037`.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- The stock-unit detail/reprint page does not exist yet; label reprint is currently available from recent inbound labels only.
- Browser print/PDF export is implemented, but real thermal printer layout needs device testing.
- Phone camera scanner and vibration/sound feedback still need real device QA.
- Existing migrated projects may still contain old location-specific barcode weight rules; new saves are global by item + brand + origin.
- No-barcode route still exists for compatibility, but the MVP direction is to generate labels and use barcode stock instead.
- Damage/spoilage approval, return-supplier approval, and manager-then-director stock-take adjustment are still open stock workflow gaps.

Next recommended task:

- Implement the dedicated stock-unit detail/reprint page and then continue with damaged/spoilage and return-supplier approval workflows.

## Latest Stock Take Scoped Approval Pass

Task completed:

- Implemented item+brand-scoped stock take sessions.
- Added manager review and director final approval signatures for stock take.
- Added stock-operation locking while a scoped stock take is open.

Files changed:

- `components/stock/workflow-forms.tsx`
- `components/stock/stock-page.tsx`
- `lib/stock/actions.ts`
- `lib/stock/data.ts`
- `lib/stock/demo-data.ts`
- `lib/stock/types.ts`
- `scripts/smoke-routes.mjs`
- `supabase/migrations/202606100038_stock_take_scoped_approval_v1.sql`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100038_stock_take_scoped_approval_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100038_stock_take_scoped_approval_v1.sql`.
- Migration `037` must run before `038`.
- Then run `supabase/seed.sql`.
- This migration has not been run against the live Supabase project by Codex.

What changed:

- `stock_take_sessions` now supports `item_id`, `brand_id`, manager review fields, and director approval fields.
- Managers/admin create stock take sessions for one location and one item+brand.
- Stock take barcode scans must match the session location, item, and brand.
- Manual stock take lines are constrained to the selected session item+brand.
- While a stock take is open in `DRAFT`, `SUBMITTED`, or `REVIEWED`, inbound/outbound/transfer/return actions are blocked only for that item+brand at that location.
- Manager review requires a manager signature and moves `SUBMITTED` to `REVIEWED`.
- Director approval requires a director signature and only applies adjustment movements after the session is `REVIEWED`.
- Rejection is split by stage: manager/admin can reject `SUBMITTED`; director/admin can reject `REVIEWED`.
- UI permissions now separate stock operators, stock managers, and director final approval.

Commands run and results:

- `npm.cmd run smoke` - passed after updating stock smoke checks.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is still needed for manager-created scoped sessions and director approval.
- The signature values are simple electronic signature strings in the current UI; a richer signing/audit UX can come later.
- Damage/spoilage approval and return-supplier approval remain open stock workflow gaps.
- Direct outbound support remains open; current outbound is still order-based batch outbound plus existing transfer/return forms.
- Dedicated stock-unit detail/reprint page remains open.

Next recommended task:

- Implement damage/spoilage request -> manager review -> director approval -> stock deduction, including required photo and reason list.

## Latest Stock Damage / Spoilage Approval Pass

Task completed:

- Implemented damage/spoilage request -> manager review -> director approval -> stock deduction.
- Removed direct `SPOILED / DAMAGE` from order outbound so ordinary stock outbound no longer deducts damaged stock immediately.

Files changed:

- `components/stock/workflow-forms.tsx`
- `components/stock/stock-page.tsx`
- `lib/stock/actions.ts`
- `lib/stock/data.ts`
- `lib/stock/demo-data.ts`
- `lib/stock/types.ts`
- `scripts/smoke-routes.mjs`
- `supabase/migrations/202606100039_stock_damage_approval_v1.sql`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100039_stock_damage_approval_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100039_stock_damage_approval_v1.sql`.
- Migration `039` depends on helper functions from `038`, so run `037`, `038`, then `039` in order.
- Then run `supabase/seed.sql`.
- This migration has not been run against the live Supabase project by Codex.

What changed:

- Added `stock_damage_requests` with required `photo_path`, reason, status, manager signature, director signature, and final movement linkage.
- Damage reasons: expired, broken packaging, smell, wrong temperature, customer rejected, other.
- Staff with stock access can submit a damage request for an active barcode in their stock location.
- A barcode can have only one open damage request.
- Damage requests are blocked if the selected item+brand/location is under an open stock take.
- Managers/admin can review submitted damage requests.
- Director/admin can approve manager-reviewed damage requests.
- Director approval updates the stock unit to `DAMAGED`, writes an `OUTBOUND_SPOILED` stock movement, writes a scan log, and links the movement back to the request.
- Damage requests now appear in the stock return page and in stock report rows as `Damage/spoilage`.

Commands run and results:

- `npm.cmd run typecheck` - passed before documentation update.
- Full smoke/lint/typecheck/build still needs final rerun after this handoff entry.

Remaining issues:

- Damage approval updates the stock unit/movement and then the request in separate writes. A future RPC should make this fully atomic.
- Real Supabase/RLS QA is still needed for damage request/review/approval roles.
- Real file upload/storage integration for damage photos is not implemented; the current MVP field records a photo path/reference.
- Return-supplier approval workflow remains open.
- Direct outbound support remains open.
- Dedicated stock-unit detail/reprint page remains open.

Next recommended task:

- Implement return-supplier request -> manager review -> stock deduction, or add a stock-unit detail/reprint page if label operations are the next priority.

## Latest Stock Return Supplier Approval Pass

Task completed:

- Implemented return-supplier request -> manager approval -> stock deduction.

Files changed:

- `components/stock/workflow-forms.tsx`
- `components/stock/stock-page.tsx`
- `lib/stock/actions.ts`
- `lib/stock/data.ts`
- `lib/stock/demo-data.ts`
- `lib/stock/types.ts`
- `scripts/smoke-routes.mjs`
- `supabase/migrations/202606100040_stock_return_supplier_approval_v1.sql`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100040_stock_return_supplier_approval_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100040_stock_return_supplier_approval_v1.sql`.
- Migration `040` adds the `OUTBOUND_RETURN_SUPPLIER` stock movement enum value and the `stock_return_supplier_requests` table.
- Then run `supabase/seed.sql`.
- This migration has not been run against the live Supabase project by Codex.

What changed:

- Staff with stock access can submit a supplier return request for an active barcode in their stock location.
- Supplier name is required.
- A barcode can have only one open supplier return request.
- Supplier return requests are blocked if the selected item+brand/location is under an open stock take.
- Managers/admin can approve or reject submitted supplier return requests.
- Manager approval updates the stock unit to `OUTBOUNDED`, writes an `OUTBOUND_RETURN_SUPPLIER` stock movement, writes a scan log, and links the movement back to the request.
- Supplier return requests now appear on the stock return page and in stock report rows as `Return supplier`.

Commands run and results:

- Full smoke/lint/typecheck/build still needs final rerun after this handoff entry.

Remaining issues:

- Return-supplier approval updates the stock unit/movement and then the request in separate writes. A future RPC should make this fully atomic.
- Real Supabase/RLS QA is still needed for return supplier request/approval roles.
- Direct outbound support remains open.
- Dedicated stock-unit detail/reprint page remains open.

Next recommended task:

- Implement a stock-unit detail/reprint page, then continue direct outbound support and real browser/device QA.

## 2026-06-12 - Stock unit detail and label reprint page

Task completed:

- Added a scoped stock-unit detail page so staff can open a barcode stock unit from Stock Balance, review its details/movement history, and reprint/export the 50mm x 30mm thermal label after inbound.

Files changed:

- `app/(erp)/stock/units/[id]/page.tsx`
- `components/stock/stock-page.tsx`
- `components/stock/stock-unit-detail.tsx`
- `lib/stock/data.ts`
- `scripts/smoke-routes.mjs`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100040_stock_return_supplier_approval_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/balance` now includes a `Barcode stock units` table.
- Barcode stock unit rows open `/stock/units/[id]`.
- `/stock/units/[id]` uses the existing stock module access guard and the scoped stock data loader. If a scoped user cannot see a stock unit, the detail route returns not found.
- The detail page shows item, item code, brand, origin, location, status, weight, inbound source, batch, received date, and movement history.
- The detail page includes a print/export action for a 50mm x 30mm label with company name, product name, weight, and barcode.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real browser/device QA is still needed for the stock-unit label print/export flow.
- Direct outbound support remains open.
- Return-supplier approval still needs a future atomic RPC if production risk tolerance requires it.

Next recommended task:

- Implement direct outbound support or run real browser/device QA for scanner and label print flows.

## 2026-06-12 - Direct outbound batch workflow

Task completed:

- Added direct stock outbound support for `SALES`, `TRANSFER`, and `PROCESSING` without requiring a customer order.

Files changed:

- `components/stock/workflow-forms.tsx`
- `lib/stock/actions.ts`
- `supabase/migrations/202606100041_direct_outbound_batches_v1.sql`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/workflow-acceptance-checklist.md`
- `docs/manual-qa-checklist.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100041_direct_outbound_batches_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100041_direct_outbound_batches_v1.sql`.
- Migration `041` makes `stock_outbound_batches.order_id` and `stock_outbound_batch_lines.order_id` nullable for direct outbound, updates outbound batch RLS to allow scoped direct batches, and adds `public.confirm_direct_outbound_batch`.
- Then run `supabase/seed.sql`.
- This migration has not been run against the live Supabase project by Codex.

What changed:

- `/stock/outbound` now has an `Outbound mode` selector for `Order-based` or `Direct outbound`.
- Order-based outbound keeps the ready-customer-order requirement and existing atomic RPC.
- Direct outbound uses the same batch scanner UI and calls `confirm_direct_outbound_batch`.
- Direct outbound creates a stock outbound batch and batch lines with `order_id = null`.
- Direct `SALES` marks stock units `SOLD`; direct `PROCESSING` marks units `OUTBOUNDED`; direct `TRANSFER` marks units `TRANSFER_PENDING` and keeps the current location until receive-transfer scan.
- Direct outbound blocks duplicate, missing, inactive-status, wrong-location, mixed-location, same-destination transfer, and open stock-take item+brand/location scans.
- Damage/spoilage and supplier return remain approval workflows, not direct outbound types.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is needed for direct outbound with normal stock users and admin/director.
- Real browser/device QA is still needed for scanner behavior on the direct outbound mode.
- Return-supplier approval still needs a future atomic RPC if production risk tolerance requires it.

Next recommended task:

- Run real browser/device QA for inbound/outbound scanner flows or add automated regression coverage around stock actions.

## 2026-06-12 - No-barcode-to-barcode stock flow

Task completed:

- Aligned the Stock module with the MVP rule that barcode stock is the main model and new no-barcode balances should not be created.

Files changed:

- `app/(erp)/stock/no-barcode-inbound/page.tsx`
- `components/erp/app-shell.tsx`
- `components/stock/stock-page.tsx`
- `components/stock/workflow-forms.tsx`
- `lib/stock/actions.ts`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/workflow-acceptance-checklist.md`
- `docs/manual-qa-checklist.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100041_direct_outbound_batches_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/no-barcode-inbound` redirects to `/stock/inbound`.
- The no-barcode sidebar item was removed.
- The old no-barcode inbound server action now returns a clear blocked message instead of inserting/updating `no_barcode_stock`.
- The old `NoBarcodeInboundForm` component is now guidance that tells staff to generate/print a barcode label first and then use Barcode Inbound.
- Legacy no-barcode records remain readable in data/report surfaces for compatibility.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Legacy no-barcode data remains in balance/report calculations until old records are migrated or depleted.
- Other non-stock modules may still reference no-barcode stock; this slice intentionally changed only Stock-module creation flow.
- Real browser/device QA is still needed for the label-first inbound path.

Next recommended task:

- Add automated stock workflow regression tests beyond static smoke checks, or run real device QA for inbound/outbound scanners.

## 2026-06-12 - Stock workflow regression checks

Task completed:

- Added executable stock workflow regression checks for barcode weight parsing and internal numeric barcode label generation.

Files changed:

- `lib/stock/barcode-label.ts`
- `components/stock/workflow-forms.tsx`
- `scripts/stock-workflow-regression.mjs`
- `scripts/smoke-routes.mjs`
- `package.json`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100041_direct_outbound_batches_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Moved internal generated barcode construction to `lib/stock/barcode-label.ts`.
- Stock inbound now uses the shared barcode label helper.
- Added `scripts/stock-workflow-regression.mjs`.
- `npm.cmd run smoke` now runs both `scripts/smoke-routes.mjs` and `scripts/stock-workflow-regression.mjs`.
- Regression coverage checks:
  - Imported position-rule sample barcode decodes to 26.78 kg.
  - GS1 `3102` sample barcode decodes to 14.46 kg.
  - GS1 `3103` sample barcode decodes to 17.670 kg.
  - Fixed-weight sample requires manual confirmation at 10 kg.
  - Generated internal barcode is numeric-only and follows date + numeric item code + grams + serial.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- These are pure regression checks, not database-backed Supabase/RLS tests.
- Real scanner/device QA is still needed.
- Real migrated Supabase QA is still needed for stock action policies and RPCs.

Next recommended task:

- Add database-backed stock action tests against a seeded local Supabase project, or run real device QA for scanner/label flows.

## 2026-06-12 - Atomic stock approval RPCs

Task completed:

- Replaced split-write approval flows for damage/spoilage and return supplier with atomic Supabase RPCs.

Files changed:

- `lib/stock/actions.ts`
- `supabase/migrations/202606100042_atomic_stock_approval_rpcs_v1.sql`
- `scripts/smoke-routes.mjs`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100042_atomic_stock_approval_rpcs_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100042_atomic_stock_approval_rpcs_v1.sql`.
- Migration `042` adds:
  - `public.approve_stock_damage_request(uuid, text)`
  - `public.approve_stock_return_supplier_request(uuid, text)`
- Then run `supabase/seed.sql`.
- This migration has not been run against the live Supabase project by Codex.

What changed:

- Damage/spoilage director approval now calls `approve_stock_damage_request`.
- Return-supplier manager approval now calls `approve_stock_return_supplier_request`.
- Each RPC locks the request and stock unit, checks role/location/status, updates the stock unit, writes stock movement, writes scan log, writes audit log, updates the request, and returns the movement id in one transaction.
- Existing request creation/review/reject behavior is unchanged.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real migrated Supabase/RLS QA is still needed for manager/director approval users.
- Stock take approval is still action-layer multi-step and should be reviewed for atomicity separately.
- Real scanner/device QA is still needed.

Next recommended task:

- Review stock-take director approval for atomicity, or run real Supabase/RLS QA for stock approval RPCs.

## 2026-06-12 - Atomic stock-take final approval RPC

Task completed:

- Replaced split-write stock-take director final approval with an atomic Supabase RPC.

Files changed:

- `lib/stock/actions.ts`
- `supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql`
- `scripts/smoke-routes.mjs`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql`.
- Migration `043` adds `public.approve_stock_take_session(uuid, text)`.
- Then run `supabase/seed.sql`.
- This migration has not been run against the live Supabase project by Codex.

What changed:

- `approveStockTakeAction` now calls `approve_stock_take_session`.
- The RPC locks the reviewed stock-take session and lines, checks director/admin permission and location scope, verifies each line matches the session item+brand scope, writes non-zero `STOCK_TAKE_ADJUSTMENT` movements, marks the session `APPROVED`, saves director signature fields, and writes an audit log in one transaction.
- Manager review, rejection, line entry, and scoped stock-take locks are unchanged.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real migrated Supabase/RLS QA is still needed for manager-created sessions, worker scan/count, manager review, and director approval.
- Real scanner/device QA is still needed.

Next recommended task:

- Run real Supabase/RLS QA or add database-backed stock action tests for the stock take approval RPC.

## 2026-06-12 - Stock report coverage

Task completed:

- Expanded Stock Reports so CSV/print/WhatsApp reporting covers stock balance, stock-take variance, damage/spoilage, and return-supplier summaries.

Files changed:

- `lib/stock/data.ts`
- `components/stock/stock-page.tsx`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/MODULE_STATUS.md`
- `docs/workflow-acceptance-checklist.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Stock report rows now include:
  - `Stock by location`
  - `Stock by category`
  - `Stock take variance`
  - `Damage/spoilage`
  - `Return supplier`
- Stock-take variance report rows use the linked stock-take session location where available.
- Stock Reports page description now names the included report types.
- Smoke checks now assert these report categories and the report export toolbar are present.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Report numbers still need real Supabase data QA.
- Browser print/PDF and WhatsApp-copy behavior still need manual browser QA.

Next recommended task:

- Run real browser QA for stock report print/CSV/WhatsApp, or continue with database-backed RLS tests.

## 2026-06-12 - Legacy no-barcode wording

Task completed:

- Tightened Stock dashboard and balance wording so no-barcode balances are shown as legacy/old-record visibility, not as an active MVP stock workflow.

Files changed:

- `lib/stock/data.ts`
- `components/stock/stock-page.tsx`
- `scripts/smoke-routes.mjs`
- `docs/MODULE_STATUS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Stock dashboard now labels the old loose-stock KPI as `Legacy no-barcode weight`.
- Stock balance table columns now use `Legacy qty` and `Legacy kg`.
- Stock balance help text now says barcode stock is primary and legacy loose balances are visible for old records only.
- Smoke checks now guard this wording so no-barcode does not drift back into a first-class MVP workflow.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Legacy no-barcode records still remain in calculations until old records are migrated, depleted, or cleaned up by a future data migration.
- Real Supabase/RLS and device scanner QA are still needed.

Next recommended task:

- Run real Supabase/RLS QA for stock workflows or continue with database-backed stock action tests.

## 2026-06-12 - Transfer receive overdue alert

Task completed:

- Added alert-only visibility for transfers scanned out but not received after 3 days.

Files changed:

- `lib/stock/types.ts`
- `lib/stock/data.ts`
- `components/stock/stock-page.tsx`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/MODULE_STATUS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Stock dashboard data now calculates `transferPendingAlerts` by matching `TRANSFER_PENDING` stock units to their latest `OUTBOUND_TRANSFER` movement by barcode.
- Transfers pending for 3 days or more now show a `Transfer receive overdue` alert panel.
- Stock KPI text now shows how many pending transfers are overdue.
- Stock report WhatsApp summary now includes `Overdue transfer alerts`.
- Smoke checks now guard the transfer-overdue alert calculation and UI/report summary wiring.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed after fixing JSX text escaping in the transfer alert panel.
- `npm.cmd run typecheck` - passed after fixing JSX text escaping in the transfer alert panel.
- `npm.cmd run build` - passed.

Remaining issues:

- This is an alert-only implementation. It does not notify staff externally or auto-resolve transfers.
- Real Supabase data QA is still needed to confirm movement barcode matching covers all migrated transfer rows.
- Real device scanner QA is still needed.

Next recommended task:

- Continue with stock workflow edge-case QA, especially direct/order outbound scanning warnings and stock-take lock behavior in a real Supabase project.

## 2026-06-12 - Order outbound requested-vs-scanned warning

Task completed:

- Added warning-only order outbound comparison so staff can see requested quantity/weight, scanned quantity/weight, and substitutions before confirming an outbound batch.

Files changed:

- `components/stock/workflow-forms.tsx`
- `components/stock/stock-page.tsx`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/MODULE_STATUS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/outbound` now passes order item lines into the outbound scanning form.
- In order-based outbound mode, scanned barcodes are compared against the selected order's requested quantity and requested weight.
- The UI shows a warning if scanned quantity/weight differs or if a scanned stock unit is not part of the original order item list.
- Substitution remains allowed for MVP. The original ordered item stays on the order item line, and the actual scanned item remains recorded on the outbound batch line.
- Smoke checks now guard this warning and substitution visibility.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is warning-only by confirmed business rule; it does not require a manager override.
- Real Supabase QA is still needed to verify the outbound batch RPC records substituted item lines as expected under RLS.

Next recommended task:

- Continue with real Supabase/RLS QA for order outbound substitutions, transfer receive, and stock-take locks.

## 2026-06-12 - Item master all-role edit access

Task completed:

- Aligned Stock item master with the rule that every ERP role can create/edit items when their outlet has Stock module access, while item deletion remains admin/director only.

Files changed:

- `lib/stock/actions.ts`
- `components/stock/stock-page.tsx`
- `components/erp/app-shell.tsx`
- `components/dashboard/home-page.tsx`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/manual-qa-checklist.md`
- `supabase/migrations/202606100044_item_master_all_roles_v1.sql`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100044_item_master_all_roles_v1.sql`

Exact migration order:

1. Run existing migrations in filename order through `supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql`.
2. Run `supabase/migrations/202606100044_item_master_all_roles_v1.sql`.
3. Run `supabase/seed.sql`.

No migration has been run against the live Supabase project by Codex.

What changed:

- Added `public.can_edit_item_master()` helper that includes all current ERP roles.
- Replaced `items` insert/update RLS policies with item-master policies that use `public.can_edit_item_master()`.
- Kept `items` delete policy restricted to `public.can_administer_stock()`.
- Updated stock item server actions so `account` and all other business roles can create/update item master when Stock module access is present.
- Updated sidebar, route guard, and Home shortcut so `/stock/items` is reachable by all business roles with Stock module access without opening routine stock operation routes.
- Updated the item form numeric placeholder and local next-code reset so it stays in the `0001`, `0002` workflow after a successful create.
- Clarified that item master identity is category plus product section/name, while brand is captured on barcode stock units, barcode rules, price rules, stock-take scope, and stock request workflows.
- Smoke checks now guard the migration, route guard, and item-master shortcut.

Commands run and results:

- `npm.cmd run smoke` - passed after reordering the item delete policy block so the matching `DROP POLICY IF EXISTS` immediately precedes `CREATE POLICY`.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is still needed for each role to confirm item create/update succeeds and item delete remains blocked for non-admin/director.
- This does not grant Stock module access by itself; admin still needs to assign Stock module access at outlet/module level.

Next recommended task:

- Run role-by-role Supabase QA for item master, then continue Stock acceptance testing on real device scanner and stock RLS isolation.

## 2026-06-12 - Item master default brand

Task completed:

- Added default-brand support to item master so item identity can follow category + brand + product section/name while actual stock brand remains captured on barcode stock units and stock workflows.

Files changed:

- `lib/stock/types.ts`
- `lib/stock/data.ts`
- `lib/stock/actions.ts`
- `lib/stock/demo-data.ts`
- `components/stock/workflow-forms.tsx`
- `components/stock/stock-page.tsx`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/manual-qa-checklist.md`
- `supabase/seed.sql`
- `supabase/migrations/202606100045_item_master_default_brand_v1.sql`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100045_item_master_default_brand_v1.sql`

Exact migration order:

1. Run existing migrations in filename order through `supabase/migrations/202606100044_item_master_all_roles_v1.sql`.
2. Run `supabase/migrations/202606100045_item_master_default_brand_v1.sql`.
3. Run `supabase/seed.sql`.

No migration has been run against the live Supabase project by Codex.

What changed:

- Added `items.default_brand_id`.
- Replaced old item uniqueness on category/section/name with category/default-brand/section/name uniqueness.
- Added a default-brand field to item create/edit forms.
- Added Brand to the item master table.
- Seed data now assigns default brands to the demo item master rows where useful.
- Smoke checks now guard the migration and UI wiring.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase QA is still needed to verify the uniqueness replacement on existing data and all-role item edit policies after migrations are applied.
- The field is a default/master brand only. Barcode stock units, barcode rules, stock take, pricing, damage, and return workflows still store the actual stock brand separately.

Next recommended task:

- Continue Stock acceptance testing, especially real RLS/location isolation and mobile scanner device QA.

## 2026-06-12 - Stock acceptance coverage smoke guard

Task completed:

- Added an automated stock acceptance coverage script and wired it into `npm.cmd run smoke`.

Files changed:

- `scripts/stock-acceptance-coverage.mjs`
- `package.json`
- `docs/MODULE_STATUS.md`
- `docs/manual-qa-checklist.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100045_item_master_default_brand_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `npm.cmd run smoke` now runs:
  - `scripts/smoke-routes.mjs`
  - `scripts/stock-workflow-regression.mjs`
  - `scripts/stock-acceptance-coverage.mjs`
- The new acceptance coverage guard checks the implementation evidence for:
  - inbound scan
  - duplicate barcode block
  - barcode weight-rule save/reuse
  - barcode label printing/reprint
  - order-based outbound
  - transfer/receive
  - damage/spoilage approval
  - stock take manager/director approval
  - no-barcode-to-barcode flow
  - reports/export
  - role/location isolation hooks
  - mobile scanner camera/manual fallback hooks
  - item master numeric/default-brand/all-role edit rules

Commands run and results:

- `npm.cmd run smoke` - passed. It now runs route checks, barcode/label regression checks, and stock acceptance coverage checks.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is still source-level automated coverage, not a real database transaction test.
- Real Supabase/RLS and real phone camera QA remain required before marking the Stock module complete.

Next recommended task:

- Add database-backed Supabase QA or run manual role/location/device QA on a seeded project.

## 2026-06-12 - Stock data load error hardening

Task completed:

- Hardened stock data loading so configured Supabase query errors do not silently fall back to demo data.

Files changed:

- `lib/stock/data.ts`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/MODULE_STATUS.md`
- `docs/manual-qa-checklist.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100045_item_master_default_brand_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `loadRows()` now throws `Stock data could not load <table>: <error>` when Supabase is configured and a stock query fails.
- Demo stock data fallback remains available only when no Supabase server client is configured.
- The stock acceptance coverage script now guards that configured database errors surface and that stock-unit detail lookup is based on scoped `getStockPageData()`.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is still needed. This change makes those failures visible instead of hiding them behind demo data.
- Real device scanner QA is still needed.

Next recommended task:

- Run the stock module against a seeded Supabase project and verify role/location-specific user accounts.

## 2026-06-12 - Mobile scanner field hardening

Task completed:

- Improved the reusable stock barcode field for phone-width scanner workflows.

Files changed:

- `components/stock/barcode-scanner.tsx`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/MODULE_STATUS.md`
- `docs/manual-qa-checklist.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100045_item_master_default_brand_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `BarcodeField` now shows a larger `Scan Barcode` button that fits phone-width workflows.
- Added clear manual fallback text under every barcode input.
- Added recent scan display after a camera-detected barcode.
- Added scanner modal guidance telling staff to allow camera permission or close and use manual fallback.
- Kept rear-camera preference and stream cleanup behavior.
- Stock acceptance coverage now guards these scanner UX hooks.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real phone/laptop camera QA is still needed under HTTPS or localhost.
- This is UI hardening only; it does not prove actual camera permission behavior on physical devices.

Next recommended task:

- Run real device QA for `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and `/stock/stock-take`.

## 2026-06-12 - Stock QA runbook

Task completed:

- Added a dedicated Stock QA runbook that maps the Stock goal's 13 acceptance tests to concrete Supabase, RLS, phone, desktop, and database evidence.

Files changed:

- `docs/STOCK_QA_RUNBOOK.md`
- `docs/manual-qa-checklist.md`
- `docs/MODULE_STATUS.md`
- `scripts/smoke-routes.mjs`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100045_item_master_default_brand_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `docs/STOCK_QA_RUNBOOK.md` now defines the Stock-only completion evidence required for:
  - all 13 stock acceptance tests,
  - blocked/invalid paths,
  - phone scanner QA,
  - desktop scanner/label QA,
  - table-level evidence to capture.
- Manual QA checklist now links to the Stock runbook.
- Module status now lists passing runbook evidence as a remaining Stock completion gate.
- Smoke checks now require the Stock QA runbook and its key sections.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- The runbook is a test plan. It does not replace actually running the real Supabase/RLS and device QA.

Next recommended task:

- Execute `docs/STOCK_QA_RUNBOOK.md` against a seeded Supabase staging project and capture pass/fail evidence.

## 2026-06-12 - Stock Part 2 rule capture and QA evidence log

Task completed:

- Captured the latest Stock Part 2 business rules for outbound, transfer, damage/spoilage, customer return, failed-delivery return, stock take, stock reports, and permissions.
- Added a dedicated Stock QA evidence log so real Supabase/RLS/device results can be recorded against the 13 acceptance tests.
- Added smoke coverage to require the evidence log and its main sections.

Files changed:

- `docs/STOCK_QA_EVIDENCE.md`
- `docs/BUSINESS_RULES.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/manual-qa-checklist.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `scripts/smoke-routes.mjs`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this documentation/QA guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100045_item_master_default_brand_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Business rules now explicitly state:
  - outbound supports order-based and direct batches;
  - outbound types are `SALES`, `TRANSFER`, `PROCESSING`, `DAMAGE`/`SPOILED`, and `RETURN_SUPPLIER`;
  - direct outbound remains limited to `SALES`, `TRANSFER`, and `PROCESSING`;
  - damage/spoilage and supplier return must use approval workflows before deduction;
  - transfer cannot be cancelled after scanned out;
  - customer return after sale goes to hold/inspection first;
  - failed delivery return restores linked barcode stock to `IN_STOCK`;
  - stock take is barcode-only and scoped by selected item+brand+location;
  - stock reports group by item, brand, location, and inbound age.
- `docs/STOCK_QA_EVIDENCE.md` provides a fillable evidence template for:
  - all 13 Stock acceptance tests;
  - outbound workflow paths;
  - transfer evidence;
  - damage and return evidence;
  - stock take evidence;
  - RLS/scope evidence;
  - phone and desktop scanner evidence;
  - final sign-off.
- `scripts/smoke-routes.mjs` now checks that the evidence log exists and includes the required sections.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This slice documents and guards QA evidence expectations. It does not run real Supabase/RLS tests or real device scanner tests.
- Transfer cancellation blocking, customer-return hold/inspection, and all approval paths still need real seeded Supabase verification.

Next recommended task:

- Run `npm.cmd run smoke`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build`, then execute `docs/STOCK_QA_RUNBOOK.md` and fill `docs/STOCK_QA_EVIDENCE.md` on a seeded Supabase staging project.

## 2026-06-12 - Customer return inspection status

Task completed:

- Implemented the Stock rule that customer returns after sale must go to inspection before becoming sellable stock.
- Added safe enum migration values for `HOLD` and `INSPECTION`.
- Changed barcode inbound so `inboundSource = customer_return` creates stock units with `status = INSPECTION` instead of `IN_STOCK`.
- Added a worker-facing inbound message explaining that customer returns are held for inspection first.
- Added seeded/demo inspection barcode evidence for Stock QA.

Files changed:

- `lib/stock/actions.ts`
- `lib/stock/types.ts`
- `lib/stock/demo-data.ts`
- `components/stock/workflow-forms.tsx`
- `supabase/seed.sql`
- `supabase/migrations/202606100046_customer_return_inspection_status_v1.sql`
- `scripts/stock-acceptance-coverage.mjs`
- `scripts/smoke-routes.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/DATA_MODEL.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100046_customer_return_inspection_status_v1.sql`
  - Adds `HOLD` and `INSPECTION` to `public.stock_unit_status`.
  - Adds a comment documenting that customer returns use hold/inspection before sellable stock.

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100046_customer_return_inspection_status_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Normal inbound still creates `IN_STOCK` barcode units.
- Customer-return inbound now creates `INSPECTION` barcode units.
- `INSPECTION` is intentionally excluded from stockable/outbound-active statuses because `activeStockStatus()` still only accepts `IN_STOCK`, `TRANSFERRED`, and `RETURNED`.
- `supabase/seed.sql` now includes `EM-SEED-RETURN-INSPECTION-001` for real Supabase QA.
- Demo mode includes `EM-RET-INSP-001` with `status = INSPECTION`.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- There is not yet a release-from-inspection workflow. Staff can see inspection stock, but moving it from inspection to sellable stock needs a future manager/admin review action.
- Real Supabase/RLS and browser/device QA remain required.

Next recommended task:

- Add a small manager/admin release-from-inspection workflow for customer returns, or run seeded QA first to confirm the inspection block behaves as expected.

## 2026-06-12 - Customer return inspection release

Task completed:

- Added a controlled release path for customer-return stock held in `INSPECTION` or `HOLD`.
- Managers/admin can scan an inspection barcode on `/stock/return`, add notes, and release it back to `IN_STOCK`.
- The release action keeps stock-location scope checks, blocks non-held barcodes, respects open stock-take locks, writes a `MANUAL_ADJUSTMENT` movement, logs a barcode scan, and writes an audit log.
- Updated docs and smoke/acceptance guards for the inspection release path.

Files changed:

- `lib/stock/actions.ts`
- `components/stock/workflow-forms.tsx`
- `components/stock/stock-page.tsx`
- `scripts/stock-acceptance-coverage.mjs`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/DATA_MODEL.md`
- `docs/manual-qa-checklist.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this release workflow.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100046_customer_return_inspection_status_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New server action: `releaseInspectionStockAction`.
- New UI card: `InspectionReleaseForm` on `/stock/return`.
- Customer-return inspection stock remains unavailable for normal outbound until a manager/admin releases it.
- Seeded test barcode `EM-SEED-RETURN-INSPECTION-001` can be used to test blocked outbound before release and `IN_STOCK` availability after release.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is still required to prove manager/admin release and worker denial with actual users.
- Real phone/laptop scanner QA is still required.

Next recommended task:

- Run seeded Supabase QA for `EM-SEED-RETURN-INSPECTION-001`: confirm outbound is blocked while `INSPECTION`, release it as manager/admin, then confirm it becomes available as `IN_STOCK`.

## 2026-06-12 - Stock report inbound-age grouping

Task completed:

- Added stock report rows grouped by item, brand, location, and inbound age.
- The report builder now creates `Stock by inbound age` rows from barcode units that are actually stockable.
- Inbound age buckets are `Under 6 months`, `6 to 12 months`, and `Over 12 months`.
- Updated report UI copy, QA docs, smoke checks, and stock acceptance coverage.

Files changed:

- `lib/stock/data.ts`
- `components/stock/stock-page.tsx`
- `scripts/smoke-routes.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this report data slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100046_customer_return_inspection_status_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/reports` now includes `Stock by inbound age` rows.
- CSV, print/PDF-ready view, and WhatsApp summary now include those rows through the existing report export path.
- Demo data includes older 6-month and 12-month stock units, so the report can show age buckets locally.

Commands run and results:

- `npm.cmd run smoke` - passed after updating the report smoke guard to the new inbound-age wording.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Report output still needs real Supabase QA with seeded barcode units and scoped users.
- Real print/PDF export should be manually checked in the browser.

Next recommended task:

- Verify `/stock/reports` with seeded Supabase data and confirm CSV/print/WhatsApp output includes `Stock by inbound age`.

## 2026-06-12 - Atomic transfer and receive-transfer RPCs

Task completed:

- Hardened the single-barcode transfer and receive-transfer workflows so stock unit updates and audit records succeed or fail together.
- Added atomic RPCs for transfer scan and destination receive scan.
- Updated `transferAction` and `receiveTransferAction` to call the RPCs instead of doing separate stock-unit update, movement insert, scan-log insert, and audit-log insert steps.
- Updated smoke and stock acceptance coverage to guard the RPC definitions and action wiring.

Files changed:

- `lib/stock/actions.ts`
- `supabase/migrations/202606100047_atomic_transfer_receive_rpcs_v1.sql`
- `scripts/smoke-routes.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100047_atomic_transfer_receive_rpcs_v1.sql`
  - Adds `public.transfer_stock_unit(text, uuid, text, text)`.
  - Adds `public.receive_stock_transfer(text, uuid, text, text)`.
  - Both functions lock the barcode stock unit, validate role/location/status/stock-take lock, update the unit, write `stock_movements`, write `barcode_scan_logs`, and write `audit_logs` in one transaction.

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100047_atomic_transfer_receive_rpcs_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/transfer` still leaves `location_id` unchanged and sets `TRANSFER_PENDING`.
- `/stock/receive-transfer` changes `location_id` only after the destination receive scan succeeds.
- Transfer and receive-transfer audit rows are now written atomically with the stock unit change.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is still required to prove scoped users can transfer/receive only allowed locations.
- Real phone/laptop scanner QA is still required.

Next recommended task:

- Test `/stock/transfer` and `/stock/receive-transfer` with a seeded Supabase user and verify unit status/location plus movement, scan-log, and audit-log rows.

## 2026-06-12 - Atomic stock return RPC

Task completed:

- Hardened the normal barcode stock-return workflow so returning a barcode to `IN_STOCK` and writing audit records succeed or fail together.
- Added an atomic RPC for normal stock return.
- Updated `returnStockAction` to call the RPC instead of doing separate stock-unit update, movement insert, scan-log insert, and audit-log insert steps.
- Kept customer-return `HOLD`/`INSPECTION` stock out of the normal return path; those barcodes must use manager/admin inspection release.
- Updated smoke and stock acceptance coverage to guard the RPC definition and action wiring.

Files changed:

- `lib/stock/actions.ts`
- `supabase/migrations/202606100048_atomic_stock_return_rpc_v1.sql`
- `scripts/smoke-routes.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100048_atomic_stock_return_rpc_v1.sql`
  - Adds `public.return_stock_unit(text, uuid, text, text)`.
  - The function locks the barcode stock unit, validates role/location/status/stock-take lock, updates the unit to `IN_STOCK`, writes `stock_movements`, writes `barcode_scan_logs`, and writes `audit_logs` in one transaction.

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100048_atomic_stock_return_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/return` now uses `public.return_stock_unit`.
- Normal return still restores stock to `IN_STOCK`.
- `HOLD` and `INSPECTION` stock cannot be returned through the normal return form; manager/admin inspection release remains the required path.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is still required to prove scoped users can return only allowed locations.
- Real phone/laptop scanner QA is still required.

Next recommended task:

- Test `/stock/return` with a seeded Supabase user and verify unit status plus movement, scan-log, and audit-log rows.

## 2026-06-12 - Atomic inspection release RPC

Task completed:

- Hardened the customer-return inspection-release workflow so moving `HOLD`/`INSPECTION` stock back to `IN_STOCK` and writing audit records succeed or fail together.
- Added an atomic RPC for inspection release.
- Updated `releaseInspectionStockAction` to call the RPC instead of doing separate stock-unit update, movement insert, scan-log insert, and audit-log insert steps.
- Updated smoke and stock acceptance coverage to guard the RPC definition and action wiring.

Files changed:

- `lib/stock/actions.ts`
- `supabase/migrations/202606100049_atomic_inspection_release_rpc_v1.sql`
- `scripts/smoke-routes.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100049_atomic_inspection_release_rpc_v1.sql`
  - Adds `public.release_inspection_stock_unit(text, text)`.
  - The function locks the barcode stock unit, validates role/location/status/stock-take lock, updates the unit to `IN_STOCK`, writes `stock_movements`, writes `barcode_scan_logs`, and writes `audit_logs` in one transaction.

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100049_atomic_inspection_release_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/return` inspection release now uses `public.release_inspection_stock_unit`.
- Customer-return inspection release still requires manager/admin role and stock-location scope.
- `HOLD`/`INSPECTION` stock is released to `IN_STOCK` with movement, scan-log, and audit-log rows.

Commands run and results:

- `npm.cmd run smoke` - passed after updating old source-level guards to check the new RPC-backed implementation.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is still required to prove scoped manager/admin release and worker denial with actual users.
- Real phone/laptop scanner QA is still required.

Next recommended task:

- Test `EM-SEED-RETURN-INSPECTION-001` with a seeded Supabase manager/admin: blocked outbound while `INSPECTION`, release on `/stock/return`, then verify `IN_STOCK`, movement, scan-log, and audit-log rows.

## 2026-06-12 - Atomic barcode inbound RPC

Task completed:

- Hardened barcode inbound so successful scans create all required audit records together.
- Added an atomic RPC for barcode inbound.
- Updated `barcodeInboundAction` to call the RPC instead of doing separate stock-unit insert, movement insert, optional rule upsert, scan-log insert, and audit-log insert steps.
- Kept duplicate inbound pre-check and failed scan logging for clear worker feedback.
- Updated smoke and stock acceptance coverage to guard the RPC definition and action wiring.

Files changed:

- `lib/stock/actions.ts`
- `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`
- `scripts/smoke-routes.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`
  - Adds `public.inbound_stock_unit(...)`.
  - The function validates role/location/item/status/stock-take lock, creates `stock_units`, creates `stock_movements`, optionally saves the global item+brand+origin barcode weight rule, writes `barcode_scan_logs`, and writes `audit_logs` in one transaction.

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/inbound` now uses `public.inbound_stock_unit`.
- Successful inbound now atomically creates stock unit, inbound movement, scan log, audit log, and optional barcode weight rule.
- Customer-return inbound still starts as `INSPECTION`; normal inbound still starts as `IN_STOCK`.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed after removing the obsolete local `insertMovement` helper.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is still required to prove scoped inbound and cross-location denial with actual users.
- Real phone/laptop scanner QA is still required.

Next recommended task:

- Test `/stock/inbound` with a seeded Supabase user: scan a new barcode with save-rule enabled and verify stock unit, movement, scan-log, audit-log, and barcode weight-rule rows all exist.

## 2026-06-12 - Stock state-transition coverage guard

Task completed:

- Audited the stock action file for remaining direct `stock_units` writes.
- Confirmed the only direct `stock_units` access in `lib/stock/actions.ts` is a read helper by barcode.
- Added a smoke-time source guard to keep stock unit state transitions behind atomic database RPCs.
- Updated Stock QA documentation so automated coverage includes state-transition coverage.

Files changed:

- `package.json`
- `scripts/stock-state-transition-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `docs/workflow-acceptance-checklist.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-state-transition-coverage.mjs` checks that stock state-changing server actions use the expected RPCs for inbound, order outbound, direct outbound, transfer, receive-transfer, return, inspection release, damage approval, supplier return approval, and stock-take approval.
- The script blocks future direct `insert`, `update`, `delete`, or `upsert` calls against `stock_units` in `lib/stock/actions.ts`.
- The script verifies the relevant migrations contain atomic transaction markers and row locking where expected.
- `npm.cmd run smoke` now runs the new guard after the existing route, barcode regression, and stock acceptance coverage checks.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Documentation cleanup after validation:

- `docs/BUSINESS_RULES.md` now labels stock-take and damage approval as needing real Supabase evidence instead of missing source/schema work.
- `docs/DATA_MODEL.md` now reflects the current migration range through `202606100050_atomic_barcode_inbound_rpc_v1.sql`.
- `docs/workflow-acceptance-checklist.md` now includes global item+brand+origin barcode rules, expanded inbound sources, manager/director stock-take approval, damage/spoilage approval, return-supplier approval, customer-return inspection, and failed-delivery return checks.

Remaining issues:

- This is source-level coverage. It does not replace real Supabase/RLS testing or real phone/laptop barcode scanner QA.
- Real seeded QA is still required for failed paths such as wrong-location scans, duplicate inbound, damage approval, stock take approval, and transfer receive.

Next recommended task:

- Run the full local command set, then execute `docs/STOCK_QA_RUNBOOK.md` on a seeded Supabase staging project and fill `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Outbound rule regression helpers

Task completed:

- Moved pure outbound rules out of `lib/stock/actions.ts` into a testable Stock helper.
- Added regression coverage for outbound barcode list parsing, duplicate detection, and ready-order gating.
- Updated stock acceptance coverage so order-based outbound checks include the helper and regression tests.

Files changed:

- `lib/stock/actions.ts`
- `lib/stock/outbound-rules.ts`
- `scripts/stock-workflow-regression.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this helper/test slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `parseOutboundBarcodes`, `duplicateOutboundBarcode`, and `assertCustomerOrderReadyForOutbound` now live in `lib/stock/outbound-rules.ts`.
- `lib/stock/actions.ts` imports those helpers without changing outbound business behavior.
- `scripts/stock-workflow-regression.mjs` now tests:
  - trimming and blank removal for outbound scanned barcode lists;
  - invalid scanned-list JSON rejection;
  - empty scanned-list rejection;
  - duplicate barcode detection;
  - `READY_FOR_PICKUP` and `READY_FOR_DELIVERY` outbound allowance;
  - non-ready order outbound blocking.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- These are pure local regression tests. They do not replace real database-backed Supabase tests for missing, wrong-status, wrong-location, already-outbounded, or cross-scope barcodes.
- Real scanner/device QA remains required.

Next recommended task:

- Add database-backed Supabase/RLS workflow tests after a staging project with seeded users is available, or continue extracting small pure stock rules where they can be tested safely.

## 2026-06-12 - Stock take rule regression helpers

Task completed:

- Moved pure stock-take scope/signature validation out of `lib/stock/actions.ts` into a testable Stock helper.
- Added regression coverage for item+brand stock-take scope matching and required manager/director signatures.
- Updated stock acceptance coverage so stock-take approval checks include the helper and regression tests.

Files changed:

- `lib/stock/actions.ts`
- `lib/stock/stock-take-rules.ts`
- `scripts/stock-workflow-regression.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this helper/test slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `sameNullableId`, `requireStockTakeScopeMatch`, and `requireSignature` now live in `lib/stock/stock-take-rules.ts`.
- `lib/stock/actions.ts` imports those helpers without changing stock-take workflow behavior.
- `scripts/stock-workflow-regression.mjs` now tests:
  - nullable brand matching;
  - matching item+brand stock-take scan allowance;
  - item mismatch blocking;
  - brand mismatch blocking;
  - signature trimming;
  - blank director signature rejection.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- These are pure local regression tests. They do not replace real database-backed tests for stock-take row creation, manager review, director approval, adjustment movement creation, or RLS denial paths.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Add similar pure regression coverage for item-code normalization/duplicate guard boundaries, or run the full seeded Supabase stock QA plan when a staging project is available.

## 2026-06-12 - Item code rule regression helpers

Task completed:

- Centralized pure item-code rules for the Stock item master.
- Updated the item master form and server actions to use the shared helper for normalization, numeric checks, next-code generation, and generated-code suggestions.
- Added regression coverage for numeric-only item-code behavior.

Files changed:

- `lib/stock/actions.ts`
- `lib/stock/item-code.ts`
- `components/stock/workflow-forms.tsx`
- `scripts/stock-workflow-regression.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this helper/test slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New helper `lib/stock/item-code.ts` provides:
  - `normalizeItemCode`;
  - `isNumericItemCode`;
  - `nextItemCode`;
  - `generatedItemCode`.
- `ItemMasterForm` now uses `isNumericItemCode`, `nextItemCode`, and `generatedItemCode`.
- `createItemAction` and `updateItemAction` now use shared `normalizeItemCode`.
- `scripts/stock-workflow-regression.mjs` now tests:
  - trimming item-code input;
  - accepting numeric codes;
  - rejecting non-numeric codes;
  - preserving four-digit next-code padding;
  - resetting invalid next-code suggestions to `0001`;
  - ignoring old non-numeric item codes when suggesting the next numeric code.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Duplicate item-code blocking still depends on the database query and unique/constraint behavior; it must be tested against seeded Supabase data.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then test item master create/edit and duplicate item-code blocking with seeded Supabase users.

## 2026-06-12 - Damage and return-supplier approval rule regression helpers

Task completed:

- Centralized pure status-gate rules for damage/spoilage and return-supplier approval workflows.
- Updated stock server actions to use the shared helper without changing role checks, RPC usage, or database writes.
- Added regression coverage for manager/director approval-chain status gates.
- Added explicit return-supplier approval coverage to the stock acceptance script.

Files changed:

- `lib/stock/actions.ts`
- `lib/stock/approval-rules.ts`
- `scripts/stock-workflow-regression.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this helper/test slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New helper `lib/stock/approval-rules.ts` provides:
  - `assertDamageCanBeManagerReviewed`;
  - `damageRejectionSignatureLabel`;
  - `assertReturnSupplierCanBeRejected`.
- `reviewDamageRequestAction`, `rejectDamageRequestAction`, and `rejectReturnSupplierRequestAction` now use those helpers.
- `scripts/stock-workflow-regression.mjs` now tests:
  - submitted damage requests can be manager reviewed;
  - manager-reviewed damage requests cannot be manager reviewed again;
  - submitted damage rejection requires manager signature;
  - manager-reviewed damage rejection requires director signature;
  - director-approved damage requests cannot be rejected;
  - submitted return-supplier requests can be rejected by manager;
  - reviewed return-supplier requests cannot be rejected again.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- These are pure local regression tests. They do not replace real Supabase tests for damage request creation, manager review, director approval RPC stock deduction, return-supplier manager approval RPC stock deduction, RLS denial, or file/photo evidence.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then test damage/spoilage and return-supplier workflows with seeded Supabase manager/director users.

## 2026-06-12 - Stock report export regression helpers

Task completed:

- Moved pure stock report CSV and WhatsApp summary builders out of `components/stock/stock-page.tsx` into a reusable Stock helper.
- Added regression coverage for CSV escaping and WhatsApp summary totals/alert counts.
- Updated stock acceptance coverage so report/export checks include the helper and regression tests.

Files changed:

- `components/stock/stock-page.tsx`
- `lib/stock/report-export.ts`
- `scripts/stock-workflow-regression.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this helper/test slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New helper `lib/stock/report-export.ts` provides:
  - `buildCsv`;
  - `buildStockWhatsappSummary`;
  - `StockReportTableRow`.
- `/stock/reports` still uses the same report toolbar behavior, but now imports the pure export helpers from `lib/stock/report-export.ts`.
- `scripts/stock-workflow-regression.mjs` now tests:
  - blank CSV output for empty rows;
  - CSV headers and quote escaping;
  - WhatsApp summary title;
  - location count;
  - total report row count;
  - total stock count and weight;
  - negative stock, stock age, and overdue transfer alert counts.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- These are pure local regression tests. They do not replace browser testing for CSV download, print/PDF rendering, or WhatsApp copy behavior on the actual `/stock/reports` page.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then manually test `/stock/reports` CSV download, print/PDF view, and WhatsApp summary on desktop and phone width.

## 2026-06-12 - Stockable status regression helpers

Task completed:

- Centralized stockable barcode-unit status rules and outbound movement-type mapping.
- Updated stock actions and stock data/report calculations to use the same stockable status list.
- Added regression coverage to keep `INSPECTION`, `HOLD`, `TRANSFER_PENDING`, `DAMAGED`, and `SOLD` out of normal outbound-active stock.

Files changed:

- `lib/stock/actions.ts`
- `lib/stock/data.ts`
- `lib/stock/unit-status-rules.ts`
- `scripts/stock-workflow-regression.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this helper/test slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New helper `lib/stock/unit-status-rules.ts` provides:
  - `stockableStatuses`;
  - `activeStockStatus`;
  - `movementTypeForOutboundType`.
- `lib/stock/actions.ts` now imports `activeStockStatus` and `movementTypeForOutboundType`.
- `lib/stock/data.ts` now imports `stockableStatuses`, keeping stock balance/report calculations aligned with server-action status checks.
- `scripts/stock-workflow-regression.mjs` now tests:
  - only `IN_STOCK`, `TRANSFERRED`, and `RETURNED` are stockable;
  - `INSPECTION`, `HOLD`, `TRANSFER_PENDING`, `DAMAGED`, and `SOLD` are not active for normal outbound;
  - `SALES`, `TRANSFER`, and `PROCESSING` outbound types map to the correct stock movement types.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed after removing an unused action-file type alias from the helper extraction.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- These are pure local regression tests. They do not replace real Supabase tests for wrong-status outbound blocking, transfer receive behavior, or customer-return inspection release.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then test wrong-status outbound blocking and customer-return inspection behavior against seeded Supabase data.

## 2026-06-12 - Numeric barcode label item-code guard

Task completed:

- Tightened internal barcode label generation so labels are generated only when the item code is numeric.
- Added regression coverage for the non-numeric item-code case.
- Updated stock acceptance coverage and QA docs for numeric-only generated labels.

Files changed:

- `lib/stock/barcode-label.ts`
- `scripts/stock-workflow-regression.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this helper/test slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `makeInternalBarcode` now returns an empty string if `item.itemCode` is missing or non-numeric.
- This prevents accidental label generation from old non-numeric codes such as `AB-7`.
- `scripts/stock-workflow-regression.mjs` now verifies that a valid weight with a non-numeric item code still produces no generated barcode.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is local helper coverage. Real label printing/export and duplicate barcode checks still need Supabase/browser QA.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then manually test label generation and label reprint in `/stock/inbound` and `/stock/units/[id]`.

## 2026-06-12 - Stock migration safety guard

Task completed:

- Added automated safety checks for stock-related migrations.
- Wired the migration safety guard into `npm.cmd run smoke`.
- Updated stock QA docs and evidence templates so acceptance test 13 includes migration safety coverage.

Files changed:

- `package.json`
- `scripts/stock-migration-safety.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-migration-safety.mjs` scans stock-related migrations and fails if it finds:
  - `drop table`;
  - `truncate`;
  - `alter table ... drop column`;
  - `delete from public.*`;
  - `delete from storage.*`.
- The script also checks every `CREATE POLICY` in those stock migrations is immediately preceded by the matching `DROP POLICY IF EXISTS`.
- `npm.cmd run smoke` now runs this script after route, workflow regression, stock acceptance, and state-transition coverage checks.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is a static migration safety guard. It does not replace actually applying migrations to a fresh Supabase project.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then apply migrations through `202606100050_atomic_barcode_inbound_rpc_v1.sql` on a fresh Supabase staging project and execute `docs/STOCK_QA_RUNBOOK.md`.

## 2026-06-12 - Stock role/scope coverage guard

Task completed:

- Added automated source coverage for Stock role, module, route, and stock-location guard expectations.
- Wired the role/scope guard into `npm.cmd run smoke`.
- Updated stock QA docs and evidence templates so acceptance test 13 includes role/scope coverage.

Files changed:

- `package.json`
- `scripts/stock-role-scope-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-role-scope-coverage.mjs` checks:
  - Stock actions still require `canAccessModule(profile, "stock")`.
  - Stock location guard messages and checks remain present.
  - Routine stock operator roles do not include director.
  - Item editor roles include broad ERP item-master access.
  - Director approval roles remain director/admin.
  - Item create/update use item editor roles.
  - Routine stock actions use operator roles plus stock-location guards.
  - Manager approval/setup actions use manager roles plus stock-location guards.
  - Director approval actions use director/admin roles and RPCs.
  - Stock route role mapping keeps item master separate from routine operations.
- `npm.cmd run smoke` now runs this script after route, workflow regression, stock acceptance, state-transition, and migration safety checks.

Commands run and results:

- `npm.cmd run smoke` - passed after aligning the direct outbound static guard with the actual action labels.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is source-level role/scope coverage. It does not replace real Supabase RLS tests with scoped users and cross-location denial evidence.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then execute real RLS allowed/denied tests from `docs/STOCK_QA_RUNBOOK.md` and record them in `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Stock scanner coverage guard

Task completed:

- Added automated source coverage for Stock scanner/mobile workflow expectations.
- Wired the scanner coverage guard into `npm.cmd run smoke`.
- Updated stock QA docs and evidence templates so acceptance test 12 and automated test coverage include scanner source checks.

Files changed:

- `package.json`
- `scripts/stock-scanner-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-scanner-coverage.mjs` checks:
  - the scanner uses `@zxing/browser`;
  - it asks for camera access and prefers rear camera;
  - it has a large phone-friendly `Scan Barcode` button;
  - it includes manual fallback and recent scan display;
  - it shows camera permission/error guidance;
  - it stops camera tracks and clears the video stream on close;
  - stock scan workflows include at least six `BarcodeField` usages;
  - inbound, outbound, transfer, receive-transfer, return, and stock-take routes remain present.
- `npm.cmd run smoke` now runs this script after route, workflow regression, stock acceptance, state-transition, migration safety, and role/scope coverage checks.

Commands run and results:

- `npm.cmd run smoke` - passed after aligning the scanner route guard with the actual Stock route title structure.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is source-level scanner coverage. It does not replace real phone/laptop camera testing, browser permission testing, or visual verification at 390px width.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then test scanner behavior on a real phone and laptop and record results in `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Stock RLS policy coverage guard

Task completed:

- Added automated source coverage for Stock RLS policy expectations.
- Wired the RLS policy guard into `npm.cmd run smoke`.
- Updated stock QA docs and evidence templates so acceptance test 13 includes Stock RLS policy coverage.

Files changed:

- `package.json`
- `scripts/stock-rls-policy-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-rls-policy-coverage.mjs` checks:
  - stock hardening migrations do not create broad `FOR ALL` policies;
  - `can_administer_stock()` still resolves through admin/director scope;
  - stock location-scope helper functions remain present;
  - key stock table policies remain split by select, insert, update, and delete;
  - scoped stock policies still use stock-location or stock-unit access helpers;
  - stock take, damage, and return-supplier approval policies keep manager/director gates;
  - delete policies for stock master/workflow tables use `can_administer_stock()` and do not grant delete through operator or manager helpers.
- `npm.cmd run smoke` now runs this script after route, workflow regression, stock acceptance, state-transition, migration safety, role/scope, and scanner coverage checks.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is static SQL-source coverage. It does not replace real Supabase RLS tests with scoped Auth users.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then execute real RLS allowed/denied tests from `docs/STOCK_QA_RUNBOOK.md` and record results in `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Stock seed coverage and QA fixtures

Task completed:

- Improved `supabase/seed.sql` with Stock QA fixtures for approval and scan workflows.
- Added automated source coverage so `npm.cmd run smoke` fails if key Stock seed fixtures are removed.
- Updated Stock QA docs with the exact seeded fixture identifiers for manual Supabase testing.

Files changed:

- `supabase/seed.sql`
- `package.json`
- `scripts/stock-seed-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `docs/DATA_MODEL.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this seed/test slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Added seeded barcode stock units:
  - `EM-SEED-DAMAGE-001`;
  - `EM-SEED-DAMAGE-APPROVE-001`;
  - `EM-SEED-RETURN-SUPPLIER-001`;
  - `EM-SEED-STOCK-TAKE-001`.
- Added seeded workflow rows:
  - `DMG-SEED-SUBMITTED-001` for manager damage review;
  - `DMG-SEED-REVIEWED-001` for director damage approval;
  - `RS-SEED-SUBMITTED-001` for manager return-supplier approval;
  - `ST-SEED-DRAFT-001`, `ST-SEED-SUBMITTED-001`, and `ST-SEED-REVIEWED-001` for stock-take scan/review/approval QA.
- New script `scripts/stock-seed-coverage.mjs` checks Stock seed fixtures for:
  - demo outlets, Stock module access, and Clement admin/director test access;
  - item master and default-brand setup;
  - global barcode weight rule setup;
  - outbound, inspection, damage, return-supplier, and stock-take barcodes;
  - ready pickup/delivery order fixtures;
  - idempotent seed patterns.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is static seed coverage. It does not prove the seed executes successfully on a fresh Supabase project.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Apply migrations and seed on a fresh Supabase staging project, then execute `docs/STOCK_QA_RUNBOOK.md` using the listed fixture identifiers and record results in `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Stock security and no-barcode MVP guard

Task completed:

- Added automated source coverage for Stock service-role secret safety and no-barcode MVP workflow rules.
- Wired the guard into `npm.cmd run smoke`.
- Updated Stock QA docs so automated acceptance coverage includes the security/no-service-role guard.

Files changed:

- `package.json`
- `scripts/stock-security-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-security-coverage.mjs` checks:
  - app/component/lib source files do not reference Supabase service-role credentials;
  - Supabase clients use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
  - `/stock/no-barcode-inbound` redirects to `/stock/inbound`;
  - `noBarcodeInboundAction` blocks new loose no-barcode stock creation and does not insert into `no_barcode_stock`;
  - the sidebar does not advertise no-barcode inbound as an active Stock workflow;
  - worker-facing Stock UI explains the label-first flow and does not expose `Save no-barcode inbound`;
  - legacy no-barcode data remains visible only as legacy stock visibility.

Commands run and results:

- `npm.cmd run smoke` - passed after aligning the guard with existing Stock UI copy and data-layer labels.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is static source coverage. It does not replace environment review on the deployed host.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then execute real Supabase and device QA from `docs/STOCK_QA_RUNBOOK.md`.

## 2026-06-12 - Stock item-master coverage and local route probe

Task completed:

- Added automated source coverage for the Stock item-master contract.
- Ran a local dev-server HTTP probe for Stock routes; routes responded with unauthenticated redirects, confirming the dev server and route/proxy layer responded but not proving authenticated page rendering.
- Updated Stock QA docs so automated acceptance coverage includes item-master coverage.

Files changed:

- `package.json`
- `scripts/stock-item-master-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-item-master-coverage.mjs` checks:
  - legacy non-numeric item-code conversion and numeric-only constraint migration;
  - category + default brand + section/name uniqueness migration;
  - all ERP roles can create/edit item master while delete remains admin/director;
  - create/update actions preserve item code, category, default brand, section/name, Chinese/Iban names, barcode requirement, active status, and low-stock level;
  - duplicate item-code guard remains in server actions;
  - inactive items remain blocked from new inbound stock;
  - item-master form has numeric item-code controls and required worker-facing controls;
  - item-code and label-generation helper regression coverage remains wired.
- Local route probe:
  - Started Next dev server locally.
  - Checked `/stock`, `/stock/dashboard`, `/stock/items`, `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, `/stock/no-barcode-inbound`, `/stock/balance`, `/stock/movements`, `/stock/stock-take`, `/stock/reports`, and `/stock/settings`.
  - All returned HTTP `307` without an authenticated browser session, which is expected for protected routes. This does not replace authenticated browser QA.

Commands run and results:

- `npm.cmd run smoke` - passed after aligning the guard with the current duplicate item-code message.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Authenticated browser rendering was not verified because no logged-in browser session was available to the automation layer.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then execute authenticated Stock route/browser QA with seeded users and record evidence in `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Stock label coverage guard

Task completed:

- Added automated source coverage for generated barcode labels and label print/reprint surfaces.
- Wired the label guard into `npm.cmd run smoke`.
- Updated Stock QA docs so automated acceptance coverage includes label coverage.

Files changed:

- `package.json`
- `scripts/stock-label-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-label-coverage.mjs` checks:
  - generated internal barcodes use date + numeric item code + weight in grams + serial;
  - generated barcode helper does not include `KG` text;
  - generated barcodes are numeric-only and reject non-numeric item codes;
  - inbound label printing uses 50mm x 30mm print CSS and supports multiple labels;
  - inbound has `Generate label barcode`, recent labels, and PDF/print controls;
  - stock-unit detail page has 50mm x 30mm label preview and `Print / Export PDF label` reprint.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is static source coverage. It does not replace real browser print/PDF preview testing with a printer/PDF target.
- Real Supabase/RLS and phone scanner QA remain required before the Stock module can be called complete.

Next recommended task:

- Run the full local command set, then manually test inbound label export and stock-unit label reprint in a browser.

## 2026-06-12 - Stock completion audit document

Task completed:

- Created a conservative Stock completion audit mapping every acceptance test to current automated/source evidence and manual evidence still required.
- Linked the audit from the Stock QA runbook, evidence log, and module status.

Files changed:

- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this documentation slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New `docs/STOCK_COMPLETION_AUDIT.md` documents:
  - local evidence currently available;
  - what `npm.cmd run smoke` covers;
  - each of the 13 Stock acceptance tests;
  - the current automated/source evidence for each test;
  - the manual Supabase/browser/device evidence still required;
  - core Stock rule audit;
  - item-master audit;
  - the remaining completion gate.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- The audit confirms the Stock module remains partial until real Supabase/RLS, authenticated browser, print/PDF, and phone/laptop scanner evidence is recorded.

Next recommended task:

- Execute the fresh Supabase migration/seed and real Stock QA pass, then fill `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Stock-take selected-scope lock coverage

Task completed:

- Added automated source coverage for the Stock take selected item+brand lock rule.
- Improved Stock take worker guidance so staff can see which operations are blocked for the locked scope.
- Wired the stock-take lock guard into `npm.cmd run smoke`.

Files changed:

- `components/stock/workflow-forms.tsx`
- `package.json`
- `scripts/stock-take-lock-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard/UI-copy slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-take-lock-coverage.mjs` checks:
  - `assertStockNotLockedByTake` filters open stock take sessions by location and only blocks matching item+brand;
  - inbound, order outbound, direct outbound, transfer, receive-transfer, return, inspection release, damage request, and return-supplier request call the stock-take lock helper;
  - stock-take barcode scanning rejects wrong item, wrong brand, and wrong location;
  - worker UI explains that inbound, outbound, transfer, return, and damage requests for that exact scope are blocked.

Commands run and results:

- `npm.cmd run smoke` - passed after aligning the guard with helper delegation and JSX text.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is source/UI-copy coverage. Real Supabase QA still needs to prove the lock blocks only the selected item+brand in the selected location and leaves unrelated stock movable.

Next recommended task:

- Execute the stock-take lock manual tests from `docs/STOCK_QA_RUNBOOK.md` and record evidence in `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Stock report coverage guard

Task completed:

- Added automated source coverage for Stock report/export requirements.
- Wired the report guard into `npm.cmd run smoke`.
- Updated Stock QA docs so automated acceptance coverage includes report coverage.

Files changed:

- `package.json`
- `scripts/stock-report-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/MODULE_STATUS.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New script `scripts/stock-report-coverage.mjs` checks:
  - report data sources include stock balance, inbound age, stock take variance, damage/spoilage, return supplier, and age thresholds;
  - `/stock/reports` builds CSV and WhatsApp summary data;
  - `ReportToolbar` receives CSV and WhatsApp content;
  - report page is print-ready;
  - CSV escaping and WhatsApp summary regression coverage remains wired.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is source/helper coverage. Real browser CSV download, print/PDF, and WhatsApp copy still need manual evidence.

Next recommended task:

- Browser-test `/stock/reports` with seeded data and record CSV/print/WhatsApp evidence in `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Stock Details Part 2 rule review

Task completed:

- Reviewed the confirmed Stock Details Part 2 rules for outbound, transfer, damage/spoilage, customer return, failed delivery return, stock take, reports, permissions, and scanner UX.
- Confirmed the current business/data docs already capture the main workflow rules.
- Updated `AGENTS.md` where the short agent guide still described barcode rules as item+brand instead of item+brand+origin and clarified manager/director approval and stock-take lock rules for future agents.

Files changed:

- `AGENTS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this documentation review.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Future agents are now pointed at:
  - barcode rules saved by item + brand + origin;
  - damage/spoilage staff photo request -> manager review -> director approval;
  - transfer outbound `TRANSFER_PENDING` and no cancellation after scanned out;
  - customer returns through inspection, failed-delivery barcode returns to `IN_STOCK`;
  - stock-take locks only the selected item+brand at the selected location.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This was a documentation alignment pass. The workflows still need real Supabase/browser/device evidence before final Stock completion.

Next recommended task:

- Run the full local checks, then manually QA outbound batch mode, transfer receive, damage approval, stock take lock, and report export against seeded Supabase data.

## 2026-06-12 - Stock scanner continuous mode and feedback

Task completed:

- Added optional continuous camera scanning to the reusable Stock barcode scanner.
- Added success feedback for scans using vibration and a short browser beep where supported.
- Enabled continuous scan mode for:
  - barcode inbound auto-save;
  - outbound batch scan list;
  - stock-take barcode recording.
- Updated scanner source coverage and Stock QA docs for repeated scan and feedback evidence.

Files changed:

- `components/stock/barcode-scanner.tsx`
- `components/stock/workflow-forms.tsx`
- `scripts/stock-scanner-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this scanner UX slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `BarcodeScanner` now keeps a stable detection callback, supports `continuous`, debounces the same barcode for 1.5 seconds in continuous mode, and stops the camera stream on close.
- `BarcodeField` exposes `continuousScan`.
- Inbound scanning can keep the camera open while auto-saving decoded scans.
- Outbound batch scanning can add multiple barcodes without reopening the scanner.
- Stock take scanning can submit each detected barcode from the scanner workflow.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is source/browser-build verified only. Real phone and laptop camera tests still need to prove permission prompts, rear camera preference, repeated scan behavior, success feedback, and camera shutoff.

Next recommended task:

- Run `/stock/inbound`, `/stock/outbound`, and `/stock/stock-take` on a real phone over HTTPS/localhost tunnel and record continuous scanner evidence in `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Stock scanner recent scan list

Task completed:

- Changed the reusable Stock barcode field from one recent scan value to a recent scan list.
- The list keeps the five most recent unique scanned barcodes and wraps on mobile widths.
- Updated scanner coverage and QA docs to verify the recent scan list requirement.

Files changed:

- `components/stock/barcode-scanner.tsx`
- `scripts/stock-scanner-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/manual-qa-checklist.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this scanner UI slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `BarcodeField` now stores `recentScans`, de-duplicates repeated values, keeps the newest five entries, and renders them as compact barcode chips.
- Scanner coverage now guards `Recent scans` and the five-entry list behavior.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- This is source/build verified only until a real phone and laptop confirm the list updates after physical scans.

Next recommended task:

- Device-test the scanner routes and record whether recent scan chips remain readable at about 390px width.

## 2026-06-12 - Outbound blocked-status pre-confirm warning

Task completed:

- Added a shared outbound helper that returns a staff-facing block reason when a scanned barcode is not in an available stock status.
- Added a pre-confirm warning in the outbound batch screen for known unavailable barcode statuses such as `TRANSFER_PENDING` and `DAMAGED`.
- Kept the server/RPC as the final enforcement layer; this is an early worker-facing warning, not a replacement for server validation.
- Updated regression and acceptance coverage plus Stock QA docs.

Files changed:

- `lib/stock/outbound-rules.ts`
- `components/stock/workflow-forms.tsx`
- `scripts/stock-workflow-regression.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this outbound UI/rule slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `outboundUnitBlockReason` returns a clear message such as `Barcode EM-002 is TRANSFER_PENDING and cannot be outbounded.`
- The outbound batch form lists blocked known barcodes before confirm.
- Regression coverage verifies the helper matches active stock status rules for available and unavailable statuses.
- Acceptance coverage now checks the blocked-scan warning text for order outbound.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase QA still needs to scan missing, already-outbounded, wrong-status, and wrong-location barcodes and confirm both UI warnings and server/RPC blocks.

Next recommended task:

- Use seeded unavailable barcode fixtures in `/stock/outbound` and record blocked-scan evidence in `docs/STOCK_QA_EVIDENCE.md`.

## 2026-06-12 - Outbound missing-barcode pre-confirm warning

Task completed:

- Added a pre-confirm missing-barcode warning in the outbound batch screen.
- Confirmation is disabled until missing or blocked scans are removed from the batch.
- Updated acceptance coverage and Stock QA docs for the missing-barcode warning.

Files changed:

- `components/stock/workflow-forms.tsx`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this outbound UI slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/outbound` now lists scanned barcodes that are not present in the loaded stock-unit list under `Missing barcode scan`.
- The confirm button is disabled while missing or blocked scans remain in the batch.
- The existing server/RPC validation remains the final enforcement layer if the UI is bypassed or stale.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase QA still needs to scan a truly missing barcode and confirm the UI warning plus server-side `Barcode was not found.` behavior if submitted through a stale/bypassed UI.

Next recommended task:

- Browser-test `/stock/outbound` with one valid barcode, one missing barcode, and one unavailable-status barcode to record warning and disable-state evidence.

## 2026-06-12 - Inbound duplicate auto-save prevention

Task completed:

- Tightened barcode inbound duplicate handling for camera auto-save mode.
- A locally known duplicate barcode now shows a clear duplicate warning and does not auto-submit after camera detection.
- Manual save remains disabled while the known duplicate barcode is in the field.
- Server/RPC duplicate validation remains the final enforcement layer.

Files changed:

- `components/stock/workflow-forms.tsx`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this inbound UI guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Added `isDuplicateInboundBarcode` in the inbound form.
- `handleBarcodeChange(value, true)` now stops before `requestSubmit()` when the scanned barcode already exists in the loaded stock unit list.
- Acceptance coverage checks the local duplicate warning, auto-save prevention, manual save disable, and server duplicate rejection strings.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase QA still needs to prove the database unique constraint/RPC prevents duplicates when the client list is stale.

Next recommended task:

- Browser-test `/stock/inbound` with auto-save on by scanning an existing barcode and confirm no new inbound submit happens before server validation.

## 2026-06-12 - Stock take barcode-only enforcement

Task completed:

- Removed the manual stock-take count entry form from the Stock take UI.
- Added a barcode-only guidance card so workers know count lines are created by scanning barcode units.
- Changed the legacy `addStockTakeLineAction` server action to return a clear error if called directly.
- Updated stock-take coverage and QA docs to guard barcode-only count behavior.

Files changed:

- `components/stock/workflow-forms.tsx`
- `components/stock/stock-page.tsx`
- `lib/stock/actions.ts`
- `scripts/stock-take-lock-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `scripts/smoke-routes.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this stock-take UI/action guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/stock-take` no longer renders `Add actual stock count` / `Add count line`.
- `addStockTakeLineAction` now returns: `Stock take is barcode scanning only. Scan each barcode instead of adding manual count lines.`
- `scripts/stock-take-lock-coverage.mjs` now fails if the manual count form returns.
- Acceptance coverage now checks barcode-only UI and server-action behavior.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase QA still needs to prove scanned barcode lines, manager review, director approval, and `STOCK_TAKE_ADJUSTMENT` movement application against seeded data.

Next recommended task:

- Browser-test `/stock/stock-take` with seeded sessions and prove workers can only add count lines by barcode scan.

## 2026-06-12 - Stock take empty submit guard

Task completed:

- Added a server-side guard so a draft stock take session cannot be submitted for manager review until it has at least one scanned barcode line.
- Updated stock-take source coverage and QA docs for the empty-session blocked path.

Files changed:

- `lib/stock/actions.ts`
- `scripts/stock-take-lock-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this stock-take action guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `submitStockTakeAction` now counts `stock_take_lines` for the selected session before submission.
- Empty sessions return `Scan at least one barcode before submitting stock take for review.`
- Coverage now guards the count query and staff-facing error text.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase QA still needs to prove the empty-submit block and the normal scanned-session submit path with seeded users.

Next recommended task:

- Browser-test one empty draft stock take session and one draft session with a scanned barcode line.

## 2026-06-12 - Stock take empty review and approval guard

Task completed:

- Added app-side guards so manager review and director approval require at least one scanned stock-take line.
- Added migration `202606100051_stock_take_approval_requires_lines_v1.sql` to update `public.approve_stock_take_session` with the same no-empty-approval guard for direct RPC calls.
- Updated stock-take coverage, migration safety coverage, and stock docs for the new migration order.

Files changed:

- `lib/stock/actions.ts`
- `scripts/stock-migration-safety.mjs`
- `scripts/stock-state-transition-coverage.mjs`
- `scripts/stock-take-lock-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/DATA_MODEL.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`
- `supabase/migrations/202606100051_stock_take_approval_requires_lines_v1.sql`

Migration SQL added:

- `supabase/migrations/202606100051_stock_take_approval_requires_lines_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100051_stock_take_approval_requires_lines_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `reviewStockTakeAction` and `approveStockTakeAction` now call `requireStockTakeLineCount`.
- `public.approve_stock_take_session` now raises `Scan at least one barcode before approving stock take.` when a reviewed session has no lines.
- The approval RPC audit payload now includes `lineCount`.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase QA still needs to apply migration `051` and test empty submit, empty review, empty direct approval, plus the normal scanned-session approval path.

Next recommended task:

- Run fresh Supabase migrations through `051`, seed, then test stock-take empty and scanned approval paths.

## 2026-06-12 - Damage and return-supplier approval app-side guards

Task completed:

- Added app-side status and stock-location scope checks before damage director approval calls the atomic RPC.
- Added app-side status and stock-location scope checks before return-supplier manager approval calls the atomic RPC.
- Kept the existing database RPC checks as the final enforcement layer.
- Updated acceptance, role/scope coverage, and QA docs.

Files changed:

- `lib/stock/actions.ts`
- `scripts/stock-role-scope-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/MODULE_STATUS.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this action guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100051_stock_take_approval_requires_lines_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- Damage approval now rejects anything other than `MANAGER_REVIEWED` before RPC call and checks stock-location access.
- Return-supplier approval now rejects anything other than `SUBMITTED` before RPC call and checks stock-location access.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase QA still needs to prove cross-location denial and stale-status denial with seeded manager/director users.

Next recommended task:

- Test damage and return-supplier approval with wrong-status and wrong-location requests in staging Supabase.

## 2026-06-12 - Stock take barcode variance approval

Task completed:

- Fixed the barcode-only stock-take approval gap where a reviewed session with scanned lines could approve with no adjustment even when expected barcodes in the selected item+brand+location were not scanned.
- Added an idempotent migration that replaces `public.approve_stock_take_session`.
- Updated stock-take smoke/source coverage and QA docs for missing-barcode variance behavior.

Files changed:

- `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`
- `scripts/stock-migration-safety.mjs`
- `scripts/stock-state-transition-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `scripts/stock-take-lock-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/manual-qa-checklist.md`
- `docs/workflow-acceptance-checklist.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `docs/STOCK_QA_EVIDENCE.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `public.approve_stock_take_session` still requires a reviewed session, director/admin permission, matching stock-location scope, a director signature, and at least one scanned barcode line.
- During director final approval, the RPC now compares active expected barcode stock units in the session location/item/brand with scanned `stock_take_lines`.
- Missing expected barcodes are inserted as variance lines with `system_count = 1`, `actual_count = 0`, `system_weight_kg = stock_units.net_weight_kg`, and `actual_weight_kg = 0`.
- Missing barcode stock units are updated to `ADJUSTED_OUT`.
- Missing barcode adjustments write `STOCK_TAKE_ADJUSTMENT` movements and `barcode_scan_logs`.
- The approval audit payload now includes `missingCount` and `barcodeVarianceComputed`.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase QA still needs to prove the migration runs on a fresh project and that a director-approved stock take with one intentionally missed expected barcode creates the variance line, sets the stock unit to `ADJUSTED_OUT`, and writes the adjustment movement/log.
- Real RLS QA still needs manager/director users for cross-location approval denial and happy-path approval.

Next recommended task:

- Run fresh Supabase migrations through `052`, seed, then manually QA stock take with: empty session blocked, scanned session approval, wrong-location scan blocked, and missing expected barcode adjusted out only after director approval.

## 2026-06-12 - Stock dashboard today movement KPIs

Task completed:

- Added `Today inbound` and `Today outbound` KPI cards to the Stock dashboard data builder.
- Today inbound includes inbound, transfer received, return, and legacy no-barcode inbound movements for the current date.
- Today outbound includes sales, transfer, processing, damage/spoilage, supplier return, and legacy no-barcode outbound movements for the current date.
- Updated stock coverage and QA docs so these KPIs are part of the Stock Module acceptance surface.

Files changed:

- `lib/stock/data.ts`
- `scripts/stock-report-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/MODULE_STATUS.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this dashboard KPI slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `buildDashboard` now calculates current-day inbound and outbound movement weights from already loaded `stock_movements`.
- Stock report/acceptance coverage now checks that the dashboard data source includes today inbound/outbound KPI labels and helper logic.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real browser QA still needs to verify the KPI cards are readable at phone width and match seeded/current-day movement rows.
- Real Supabase QA remains required for RLS, scanner devices, migration execution, and stock workflow evidence.

Next recommended task:

- Browser-test `/stock/dashboard` at desktop and 390px mobile width, then continue with seeded Supabase QA for stock inbound/outbound/transfer/stock-take workflows.

## 2026-06-12 - Stock local route protection check

Task completed:

- Started the local Next dev server inside a verification script.
- Requested key Stock routes without an authenticated session.
- Confirmed the routes redirect to `/login` instead of rendering protected Stock content.
- Recorded the result in `docs/STOCK_QA_EVIDENCE.md`.

Files changed:

- `docs/STOCK_QA_EVIDENCE.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this route-protection QA slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `/stock/dashboard`, `/stock/inbound`, `/stock/reports`, and `/stock/stock-take` returned HTTP `307` with `Location: /login` when requested locally without an authenticated session.

Commands run and results:

- Local route probe - passed for unauthenticated route protection.
- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Authenticated visual/browser QA was not completed because the in-app browser automation failed with a Windows sandbox permission error: `CreateProcessAsUserW failed: 5`.
- Phone/laptop camera QA still needs manual testing with an authenticated session.

Next recommended task:

- Use an authenticated local browser session to test `/stock/dashboard`, `/stock/inbound`, `/stock/outbound`, `/stock/reports`, and `/stock/stock-take` at desktop and 390px phone width.

## 2026-06-12 - Stock dashboard workflow shortcuts

Task completed:

- Added Stock dashboard shortcut buttons for daily worker workflows.
- Shortcuts link to inbound, outbound, transfer, receive-transfer, and return.
- Used icons from `lucide-react` and responsive wrapping so the controls stay usable on phone width.
- Updated Stock coverage and docs to guard the shortcut surface.

Files changed:

- `components/stock/stock-page.tsx`
- `scripts/stock-report-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/MODULE_STATUS.md`
- `docs/STOCK_COMPLETION_AUDIT.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `TASKS.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this dashboard shortcut slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `DashboardView` now renders `StockShortcutButtons` below the KPI cards.
- The shortcut strip includes `Inbound`, `Outbound`, `Transfer`, `Receive`, and `Return`.
- `scripts/stock-report-coverage.mjs` now checks the shortcut component and route links.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Authenticated visual QA still needs to verify the shortcuts at desktop and 390px mobile width.
- Real phone/laptop scanner QA and live Supabase/RLS workflow QA are still required before the Stock Module goal can be considered complete.

Next recommended task:

- With an authenticated session, browser-test `/stock/dashboard` shortcuts and then run the stock workflow QA paths from `docs/STOCK_QA_RUNBOOK.md`.

## 2026-06-12 - Stock dashboard shortcut role alignment

Task completed:

- Aligned Stock dashboard workflow shortcut visibility with existing stock operator route/action permissions.
- Director/view-only Stock users can still view the dashboard, KPIs, alerts, charts, and reports, but no longer see routine operation shortcuts that lead to blocked inbound/outbound/transfer/receive/return pages.
- Updated Stock coverage and QA docs for this role behavior.

Files changed:

- `components/stock/stock-page.tsx`
- `scripts/stock-report-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this dashboard role-alignment slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `DashboardView` now receives `canOperateStock`.
- `StockShortcutButtons` only renders when `canOperateStock` is true.
- Coverage checks now verify the dashboard shortcut role guard is present.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Authenticated browser QA still needs to prove directors do not see routine operation shortcuts and stock operators/admins do see them.
- Real phone/laptop scanner QA and live Supabase/RLS workflow QA are still required before the Stock Module goal can be considered complete.

Next recommended task:

- Browser-test Stock dashboard with one director user and one stock-operator/admin user, then continue seeded workflow QA from `docs/STOCK_QA_RUNBOOK.md`.

## 2026-06-12 - Internal barcode label uniqueness guard

Task completed:

- Hardened generated internal barcode labels so they do not wrap 4-digit serial numbers and do not knowingly reuse an existing barcode.
- Added a helper that finds the next unused label barcode from current stock units and labels generated in the current inbound session.
- Updated Barcode Inbound to generate an unused internal numeric barcode before printing/saving.
- Updated regression and coverage checks for the uniqueness behavior.

Files changed:

- `lib/stock/barcode-label.ts`
- `components/stock/workflow-forms.tsx`
- `scripts/stock-workflow-regression.mjs`
- `scripts/stock-label-coverage.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `scripts/smoke-routes.mjs`
- `docs/BUSINESS_RULES.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this label uniqueness slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `makeInternalBarcode` now rejects serials outside `1..9999` instead of wrapping with modulo.
- New `makeUniqueInternalBarcode` skips existing stock-unit barcodes and recent labels.
- Barcode Inbound uses `makeUniqueInternalBarcode` and shows a clearer error if a label cannot be generated.
- Regression now checks no serial wraparound and skip-to-next-serial behavior.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Server-side duplicate barcode guards still remain the final enforcement layer and need real Supabase QA.
- Browser QA still needs to prove the printed label flow works after refresh and at phone width.

Next recommended task:

- In an authenticated browser, generate two labels for the same item/weight, refresh the page, generate another label, and confirm it skips existing stock-unit barcodes before printing.

## 2026-06-12 - Outbound same-destination transfer precheck

Task completed:

- Added a pre-confirm outbound batch warning for transfer scans where a scanned barcode is already at the selected destination.
- The confirm button now stays disabled until those barcodes are removed or a different destination is selected.
- Kept the existing server/RPC same-destination transfer guard as final enforcement.
- Updated source coverage and QA docs for this blocked path.

Files changed:

- `components/stock/workflow-forms.tsx`
- `scripts/stock-acceptance-coverage.mjs`
- `scripts/stock-workflow-regression.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this outbound UI precheck slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `OutboundSalesForm` computes `sameDestinationTransferUnits` for transfer batches.
- Same-destination transfer scans now show `Invalid transfer destination` with the affected barcodes.
- `confirmDisabled` includes same-destination transfer scans.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Authenticated browser QA still needs to verify the warning with seeded barcode units and locations.
- Real Supabase/RLS QA remains required for the RPC-side transfer denial.

Next recommended task:

- In an authenticated browser, test `/stock/outbound` transfer mode by selecting a destination that matches a scanned barcode's current location and confirm the UI blocks before submit.

## 2026-06-12 - Item master update no-row guard

Task completed:

- Tightened item master update behavior so stale/tampered item ids cannot report a false success.
- `updateItemAction` now selects the updated item id and requires a returned row.
- Added item-master coverage for the no-row/stale-id guard.

Files changed:

- `lib/stock/actions.ts`
- `scripts/stock-item-master-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this item-master action guard slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `updateItemAction` now calls `.select("id").single()` after update.
- If Supabase returns no row, the action returns `Item was not found or your role cannot update it.`

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Authenticated Supabase QA still needs to prove item update success, duplicate code rejection, stale-id failure, and inactive-item inbound blocking with real RLS.

Next recommended task:

- In an authenticated browser, test item master create/edit with duplicate item codes, inactive item inbound blocking, and a stale item id via direct action/RLS QA if practical.

## 2026-06-12 - Stock unit movement history linkage

Task completed:

- Improved stock-unit detail movement history so it includes movements linked by `stock_unit_id` as well as matching barcode text.
- Added `stockUnitId` to the `StockMovement` data contract.
- Updated demo movement data and coverage for the linkage.

Files changed:

- `lib/stock/types.ts`
- `lib/stock/data.ts`
- `lib/stock/demo-data.ts`
- `scripts/stock-label-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this stock-unit detail data-contract slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `mapMovement` now reads `stock_movements.stock_unit_id`.
- `getStockUnitDetailData` now includes movement rows where `movement.stockUnitId === unit.id` or `movement.barcode === unit.barcode`.
- Demo movement rows now include `stockUnitId` values.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Authenticated browser QA still needs to open `/stock/units/[id]` for a real stock unit and confirm movement history appears for rows linked by stock unit id.

Next recommended task:

- In Supabase QA, create or inspect one stock movement with `stock_unit_id` and no barcode text, then confirm the stock-unit detail page still shows it.

## 2026-06-12 - Stock report linked-unit weights

Task completed:

- Improved Stock report rows for damage/spoilage and return-supplier workflows.
- These report rows now include linked barcode stock-unit weight when the request references an existing stock unit.
- Updated report coverage and QA docs.

Files changed:

- `lib/stock/data.ts`
- `scripts/stock-report-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this report data slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `buildReports` now looks up `units.find((unit) => unit.id === request.stockUnitId)` for damage/spoilage and return-supplier report rows.
- Report row `weightKg` now uses the linked unit `netWeightKg` when available, instead of always `0`.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Authenticated Supabase QA still needs to verify `/stock/reports` CSV/print/WhatsApp output against real damage and return-supplier requests.

Next recommended task:

- In seeded Supabase QA, approve or inspect one damage request and one return-supplier request, then confirm their report rows include the barcode unit weight.

## 2026-06-13 - Continuous inbound scan count and weight feedback

Task completed:

- Improved the Stock Module continuous barcode inbound worker screen.
- The inbound form now always shows the current session's saved scan count and saved total weight.
- Recent successful inbound scans are labelled as recent inbound scans while still supporting 50mm x 30mm label PDF/print output.
- Added source coverage so the stock label/inbound guard checks for the scan count and weight feedback.
- Updated stock rules/status/QA docs for the inbound session summary.

Files changed:

- `components/stock/workflow-forms.tsx`
- `scripts/stock-label-coverage.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/MODULE_STATUS.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `HANDOFF.md`

Migration SQL added:

- None.

Exact migration order:

- No new migration is needed for this UI/coverage slice.
- Existing stock migrations should still be run in filename order through `supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql`, then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- `BarcodeInboundForm` now derives `recentInboundCount` and `recentInboundWeightKg` from the successful inbound labels for the current session.
- The form displays `Saved scans` and `Saved weight` cards on mobile and desktop.
- The recent label panel is now titled `Recent inbound scans` and still explains label PDF/print output.
- `scripts/stock-label-coverage.mjs` now guards the saved scan count/weight UI strings.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Authenticated browser QA still needs to confirm the count/weight increments after real Supabase saves on `/stock/inbound`.
- Real phone/laptop camera QA still needs to confirm continuous scans update the recent scan list and saved weight at 390px phone width.

Next recommended task:

- In a seeded Supabase staging project, test `/stock/inbound` with three different barcodes under the same item/brand/origin/location preset and confirm stock unit, movement, scan log, recent list, saved scan count, saved weight, and label print output all match.

## 2026-06-13 - Stock inbound templates, session summary, and undo

Task completed:

- Improved `/stock/inbound` for the preferred mobile worker flow.
- Added recent inbound templates at the top of the form, showing simple brand + product labels.
- Added product search and quick product creation inside inbound. New quick-created products use the next numeric item code automatically.
- Defaulted inbound location from the signed-in user's assigned stock location while keeping it editable under normal location restrictions.
- Auto-generates an inbound batch number when the page opens; no Start Batch step is required.
- Keeps inbound source defaulted to Supplier/import.
- Enforces required brand and origin on the server for barcode inbound.
- Uses the newest matching item+brand+origin barcode weight rule automatically.
- Blocks camera scans with no confident weight and tells workers to use generated label printing instead of saving the supplier barcode.
- Shows previous saved scan weight, current-session saved scan count, saved total weight, recent scan list with barcode/product/weight/time/scanned-by/location/status, and duplicate/error scans.
- Added Finish Inbound Session summary with total barcode units, total weight, item/brand/origin, location, scanned by, start/end time, and duplicate/error count.
- Added current-session undo that calls an atomic RPC to void the stock unit and write `INBOUND_VOID`, scan-log, and audit-log rows instead of deleting data.

Files changed:

- `components/stock/workflow-forms.tsx`
- `components/stock/stock-page.tsx`
- `lib/stock/action-state.ts`
- `lib/stock/actions.ts`
- `lib/stock/data.ts`
- `lib/stock/demo-data.ts`
- `lib/stock/types.ts`
- `scripts/smoke-routes.mjs`
- `scripts/stock-acceptance-coverage.mjs`
- `scripts/stock-label-coverage.mjs`
- `scripts/stock-migration-safety.mjs`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `docs/STOCK_QA_RUNBOOK.md`
- `HANDOFF.md`

Migration SQL added:

- `supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql`

Exact migration order:

- Run all existing migrations in filename order through `supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql`.
- Then run `supabase/seed.sql`.
- No migration has been run against the live Supabase project by Codex.

What changed:

- New `VOIDED` stock-unit status and `INBOUND_VOID` movement type.
- New `public.void_inbound_stock_unit(uuid, text, text)` RPC.
- The undo RPC checks auth, stock access, location access, active unmoved status, current batch number, and original inbound movement before voiding.
- Undo updates `stock_units.status = VOIDED`, writes a negative `INBOUND_VOID` stock movement, writes a barcode scan log, and writes a `BARCODE_INBOUND_VOID` audit log.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Real Supabase/RLS QA is needed for the new undo RPC with worker, manager, admin, and cross-location users.
- The app hides undo after Finish Inbound Session, but a deeper persisted inbound-session table would be needed to enforce "worker undo only before finish" at database level across browser refreshes.
- The requested separate barcode label printing page is not split out yet; label generation remains in `/stock/inbound` and stock-unit reprint remains at `/stock/units/[id]`.
- Real phone/laptop camera QA is still needed for 390px scanning, continuous auto-save, sound/vibration, and finish summary.

Next recommended task:

- Apply migrations through `053` in a staging Supabase project, then run `/stock/inbound` on a phone with one saved-rule template, one no-rule template, one duplicate barcode, one no-weight barcode, and one undo before finish.

## 2026-06-13 - Stock inbound remote QA and deploy handoff

Task completed:

- Reviewed the latest Stock Inbound changes for remote Vercel QA.
- Confirmed migration `202606100053_stock_inbound_session_undo_v1.sql` is idempotent at the object level, uses no destructive table/data drops, and keeps auth/stock/location checks inside the security-definer RPC.
- Added a remote QA checklist for testing Stock Inbound through the deployed Vercel app.
- Confirmed no frontend app code references Supabase service-role credentials; only local guard scripts/docs mention service-role checks.

Files changed:

- `docs/REMOTE_QA_STOCK_INBOUND.md`
- `HANDOFF.md`

Migration SQL added:

- No new migration in this deploy-prep slice.
- Existing migration `supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql` still needs to be applied before undo works in the deployed app database.

Exact migration order:

- Run all migrations in filename order through `supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql`.
- Then run `supabase/seed.sql` if reseeding a demo/staging database.
- Codex did not run live Supabase SQL.

Commands run and results:

- `npm.cmd run smoke` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.

Remaining issues:

- Git push and Vercel deployment verification happen after this handoff entry if commit/push succeeds.
- Production/staging Supabase still needs migration `053` applied manually or by the configured deployment process.
- Remote phone camera QA remains manual through `https://elite-meat-erp.vercel.app/stock/inbound`.

Next recommended task:

- After Vercel deploys the pushed branch, run the first 10 steps in `docs/REMOTE_QA_STOCK_INBOUND.md`.
