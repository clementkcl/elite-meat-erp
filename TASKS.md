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

- Confirmed production-ready QA evidence in `docs/STOCK_QA_EVIDENCE.md`.
- Commit/branch cleanup for the current broad dirty worktree.
- Automated tests for high-risk workflows.
- Broader database-backed automated stock workflow tests.
- Real Supabase Storage validation.
- Real WhatsApp integration.
- Full customer/pricing flow applied across all order and retail forms.
- Multi-outlet/multi-location staff access model.
- Real Supabase QA evidence for stock take adjustment workflow with department manager approval before director final approval.
- Real Supabase QA evidence for director approval workflow for damaged/spoiled stock deduction.
- Real Supabase QA evidence for return-supplier request and manager review workflow.
- Real Supabase QA evidence for direct outbound batches with `order_id = null`.
- Manual reservation release when a customer cancels after picking has started.
- Overdue credit customer warning during order entry.
- Failed-delivery return workflow for standalone deliveries and no-barcode/loose stock.
- Multiple raw to multiple finished Processing data model.
- Finished-product barcode generation from Processing output.
- Real browser/device QA for stock-unit detail label reprints.
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
3. Outbound: select ready order, scan multiple barcodes, confirm sales/transfer/processing, verify stock statuses, substitution records, and requested/scanned warnings.
4. Processing: consume raw no-barcode stock, record finished weights/yield/loss, manager review.
5. Delivery: ready-for-delivery order appears in delivery list, move to out-for-delivery, upload proof photo with receiver/GPS to auto-mark delivered, and reject partial delivery for MVP.
6. Stock approvals: verify damage/spoilage photo request -> manager review -> director approval, return supplier approval, and stock take manager/director signatures.

### P2 - Validate Supporting Workflows

1. Attendance: GPS radius, late grace, clock out, no-clock-out, approved leave.
2. OA: advance, claim, leave, payslip permissions.
3. Retail: same-day sales/cash only, daily closing, outlet expenses, payments.
4. Cleaning: frequency matrix, scoped updates, missed/overdue alerts.
5. Finance: AR/AP upload metadata, review, approve, paid, aging.
6. Director: dashboard, approvals, reports, print/WhatsApp/CSV.

### P2 - Confirmed Rule Gaps

1. Real-test stock take adjustment from department manager approval followed by director final approval.
2. Real-test damaged/spoiled stock deduction request, manager review, and director approval before stock deduction.
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
8. Stock inbound now supports item+brand+origin barcode rules, custom brand/origin entry, generated numeric barcode labels, 50mm x 30mm label PDF print/export, expanded inbound sources, inactive-item inbound blocking, numeric item codes, and editable Chinese/Iban/low-stock item fields.
8b. Barcode inbound now uses an atomic RPC so stock unit, movement, scan log, audit log, and optional item+brand+origin weight rule save succeed or fail together.
8a. Customer-return inbound now goes to `INSPECTION`, and manager/admin inspection release atomically changes it back to `IN_STOCK` with movement, scan-log, and audit-log rows.
9. Stock take sessions now support item+brand scope, manager-created sessions, manager review signature, director approval signature, and open-count locking for the selected item+brand at the selected location.
10. Damage/spoilage now supports staff photo request, manager review, director approval, stock unit `DAMAGED` update, `OUTBOUND_SPOILED` movement, and damage/spoilage report rows.
11. Return supplier now supports staff request, manager approval, stock unit `OUTBOUNDED` update, `OUTBOUND_RETURN_SUPPLIER` movement, and return-supplier report rows.
12. Stock balance now links barcode stock units to a stock-unit detail page where staff can review movement history and reprint/export the 50mm x 30mm label.
13. Stock outbound now supports order-based and direct atomic outbound batches. Direct outbound uses `order_id = null` for `SALES`, `TRANSFER`, and `PROCESSING`.
13a. Single-barcode transfer and receive-transfer now use atomic RPCs so stock unit updates, movement rows, scan logs, and audit logs succeed or fail together.
13b. Normal barcode stock return now uses an atomic RPC so `IN_STOCK` restoration, movement rows, scan logs, and audit logs succeed or fail together.
14. Stock no-barcode inbound now redirects to Barcode Inbound and the legacy no-barcode inbound server action blocks new loose no-barcode stock creation.
15. `npm.cmd run smoke` now runs stock workflow regression checks for item-code normalization/next-code generation, barcode weight decoding, internal numeric label barcode generation, non-numeric item-code label rejection, outbound ready-order gating, outbound barcode parsing, outbound duplicate detection, stockable status and outbound movement mapping, stock-take item+brand scope matching, stock-take signature requirements, damage/return-supplier approval status gates, stock report CSV/WhatsApp export helpers, stock acceptance coverage, stock state-transition coverage, stock migration safety, stock role/scope coverage, stock scanner coverage, stock RLS policy coverage, stock seed coverage, stock security/no-service-role coverage, stock item-master coverage, stock label coverage, stock-take lock coverage, and stock report coverage.
16. Damage/spoilage director approval and return-supplier manager approval now use atomic Supabase RPCs for stock unit updates, movement rows, scan logs, audit logs, and request linkage.
17. Stock-take director final approval now uses an atomic Supabase RPC for adjustment movements, session approval, and audit logging.
18. Stock reports now include balance, stock-take variance, damage/spoilage, and return-supplier rows with CSV/print/WhatsApp report tooling.
19. Stock camera scanner now supports success vibrate/beep, a recent scan list, and continuous mode on inbound, outbound batch, and stock-take scan workflows; scanner source coverage guards the wiring.
20. Outbound batch UI now shows a pre-confirm blocked-scan warning for known unavailable barcode statuses, with regression coverage aligned to active stock status rules.
21. Outbound batch UI now shows a pre-confirm missing-barcode warning and disables confirmation until missing/blocked scans are removed.
22. Barcode inbound now prevents camera auto-save from submitting a locally known duplicate barcode, while keeping the server/RPC duplicate guard.
23. Stock take count entry is now barcode-only in the UI, and the legacy manual count-line action returns a clear barcode-only error.
24. Stock take draft submission now requires at least one scanned barcode line before manager review.
25. Stock take manager review and director approval now also require at least one scanned barcode line, including direct RPC approval.
26. Damage and return-supplier approval actions now perform app-side status and stock-location scope checks before calling atomic RPCs.
27. Stock-take director approval now computes missing expected barcode variance, records missing barcode lines, marks missing units `ADJUSTED_OUT`, and writes adjustment movements/logs atomically.
28. Stock dashboard KPIs now include today inbound and today outbound movement weights.
29. Stock dashboard shortcuts now link to inbound, outbound, transfer, receive-transfer, and return workflows.

### P3 - Add Tests After Manual QA

1. Add lightweight server-action tests where practical.
2. Add database/RLS verification scripts against seeded test users.
3. Add browser smoke coverage for the highest-risk routes.

## Done Criteria

- `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- Manual QA checklist has evidence for every module.
- Stock QA evidence log has pass/fail evidence for all 13 stock acceptance tests.
- Cross-outlet/team isolation is verified with real users.
- Storage and camera flows are tested on real devices.
- Remaining limitations are documented before internal pilot use.
