# Elite Meat ERP Task Queue

## What Already Exists

- Working module shells and route coverage for dashboard, stock/inventory, orders, delivery, attendance, OA actions, retail, processing, cleaning, finance, director reports, and settings.
- Server actions for each operational module.
- Supabase migrations and seed data for internal testing.
- RLS policies and helper functions for role/team/outlet/department/stock-location scope.
- Existing QA documents:
  - `docs/manual-qa-checklist.md`
  - `docs/workflow-acceptance-checklist.md`
  - `docs/role-team-access-matrix.md`
  - `docs/roles-and-team-isolation.md`
  - `docs/known-limitations.md`
  - `docs/erp-testing-plan.md`

## What Is Missing

- Confirmed production-ready QA evidence.
- Commit/branch cleanup for the current broad dirty worktree.
- Automated tests for high-risk workflows.
- Real Supabase Storage validation.
- Real WhatsApp integration.
- Full customer/pricing flow applied across all order and retail forms.
- Multi-outlet/multi-location staff access model.
- Stock take adjustment workflow with department manager approval before director final approval.
- Director approval workflow for damaged/spoiled stock deduction.
- Manual reservation release when a customer cancels after picking has started.
- Overdue credit customer warning during order entry.
- Failed-delivery return workflow for standalone deliveries and no-barcode/loose stock.
- Multiple raw to multiple finished Processing data model.
- Finished-product barcode generation from Processing output.
- Staff price override reason enforcement.
- AutoCount-format aging buckets.
- Import document upload workflow and Storage verification.

## Risky Logic

- Do not create new features before validating existing workflows.
- Do not refactor broad module files just to clean them up; many are tied to RLS and server-action rules.
- Do not change migration history destructively.
- Do not bypass role/module guards because the UI and RLS are intentionally layered.
- Do not assume demo-mode data proves real Supabase/RLS behavior.

## Recommended Next Tasks

### P0 - Stabilize Current Work

1. Review and intentionally commit the existing ERP worktree once scope is confirmed.
2. Run migrations on a fresh Supabase project in order and run seed data.
3. Create Auth users for all roles.
4. Test login, sidebar, mobile menu, and route blocking for every role.

### P1 - Validate Core Meat ERP Flow

1. Stock inbound: scan new barcode, duplicate block, weight rule parsing, movement/log rows.
2. Order: create order, add items without reservation, start picking/preparation to create reservations, mark ready.
3. Outbound: select ready order, scan multiple barcodes, confirm sales/transfer/processing/spoiled, verify stock statuses.
4. Processing: consume raw no-barcode stock, record finished weights/yield/loss, manager review.
5. Delivery: ready-for-delivery order appears in delivery list, move to out-for-delivery, upload proof photo with receiver/GPS to auto-mark delivered, and reject partial delivery for MVP.

### P2 - Validate Supporting Workflows

1. Attendance: GPS radius, late grace, clock out, no-clock-out, approved leave.
2. OA: advance, claim, leave, payslip permissions.
3. Retail: same-day sales/cash only, daily closing, outlet expenses, payments.
4. Cleaning: frequency matrix, scoped updates, missed/overdue alerts.
5. Finance: AR/AP upload metadata, review, approve, paid, aging.
6. Director: dashboard, approvals, reports, print/WhatsApp/CSV.

### P2 - Confirmed Rule Gaps

1. Change stock take adjustment from single approval to department manager approval followed by director final approval.
2. Add damaged/spoiled stock deduction request and director approval before stock deduction.
3. Add manual reservation release workflow for customer cancellations after picking starts. Completed in Part 3; needs real Supabase/RLS QA.
4. Add overdue credit customer warning to order entry without blocking order creation.
5. Add failed-delivery return support for standalone deliveries and no-barcode/loose stock.
6. Add multiple raw item to multiple finished item Processing model.
7. Generate new finished-product barcodes from Processing output.
8. Enforce price override reason in order/retail line entry.
9. Add AutoCount-format aging buckets.
10. Add import document upload workflow; keep receipts and stock photos for later.
11. Design multi-outlet/multi-location access tables and update RLS helpers before assigning staff to multiple scopes.

### Recently Completed Rule Gaps

1. Temporary negative stock alerting is now derived from stock balance rows and shown in stock dashboard, balance, and report surfaces.
2. Stock age alerting is now derived from barcode stock inbound dates and shown in stock dashboard and report surfaces.
3. Delivery proof upload now captures receiver/GPS and auto-marks standalone and customer-order deliveries delivered.
4. Barcode inbound now supports GS1 `3102`/`3103`, 1-3 decimal position rules, fixed-weight fallback, and manual confirmation errors.
5. Processing abnormal yield now defaults to a below-85% alert with no approval block.
6. Manual reservation release is available for active reservations on cancelled customer orders; cancellation itself does not release stock.
7. Failed customer-order delivery proof now returns linked barcode stock from sales outbound lines, writes return movements and scan logs, records failed-return counters, and leaves reservations untouched.

### P3 - Add Tests After Manual QA

1. Add lightweight server-action tests where practical.
2. Add database/RLS verification scripts against seeded test users.
3. Add browser smoke coverage for the highest-risk routes.

## Done Criteria

- `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- Manual QA checklist has evidence for every module.
- Cross-outlet/team isolation is verified with real users.
- Storage and camera flows are tested on real devices.
- Remaining limitations are documented before internal pilot use.
