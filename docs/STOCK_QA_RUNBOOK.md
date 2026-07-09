# Stock Module QA Runbook

Last updated: 2026-06-23

Use this runbook on a fresh Supabase staging project before calling the Stock module complete. Do not run these tests directly on production data.

For the conservative completion map, also read `docs/STOCK_COMPLETION_AUDIT.md`.

## Setup

1. Apply every migration in filename order through `supabase/migrations/202606100053_stock_inbound_session_undo_v1.sql`.
2. Run `supabase/seed.sql`.
3. Run local checks:
   - `npm.cmd run smoke`
   - `npm.cmd run lint`
   - `npm.cmd run typecheck`
   - `npm.cmd run build`
4. Use anon Supabase keys only in `.env.local`; never use a service-role key in frontend env.
5. Create the Stock QA users from `docs/SUPABASE_QA_PLAN.md`, especially:
   - `qa.processing.worker.jc@example.test`
   - `qa.processing.worker.wf@example.test`
   - `qa.retail.manager.jc@example.test`
   - `qa.admin@example.test`
   - `qa.director@example.test`

## Seeded Stock QA Fixtures

After `supabase/seed.sql` runs, these fixtures should be available for stock QA:

- Order outbound: `ORD-SEED-PICKUP-001` with `EM-SEED-OUT-001` and `EM-SEED-OUT-002`.
- Delivery/order outbound: `ORD-SEED-DELIVERY-001` with `EM-SEED-OUT-003`.
- Customer-return inspection: `EM-SEED-RETURN-INSPECTION-001`.
- Damage manager review: `DMG-SEED-SUBMITTED-001` using `EM-SEED-DAMAGE-001`.
- Damage director approval: `DMG-SEED-REVIEWED-001` using `EM-SEED-DAMAGE-APPROVE-001`.
- Return supplier manager approval: `RS-SEED-SUBMITTED-001` using `EM-SEED-RETURN-SUPPLIER-001`.
- Stock take scan/review/approval: `ST-SEED-DRAFT-001`, `ST-SEED-SUBMITTED-001`, and `ST-SEED-REVIEWED-001` using `EM-SEED-STOCK-TAKE-001`.

## Evidence To Capture

For each test, capture:

- signed-in email and role
- visible scope badge
- route URL
- success or blocked message
- relevant table rows or screenshots
- whether the result passed or failed

## Acceptance Tests

| # | Test | User / Route | Expected evidence |
| --- | --- | --- | --- |
| 1 | Inbound scan works | Stock operator at `/stock/inbound` | Recent templates appear first; assigned stock location is selected by default; inbound session code is auto-generated; atomic new `stock_units` row, `INBOUND` `stock_movements` row, successful `barcode_scan_logs` row, `audit_logs` row, saved scan count, saved total weight, previous scan weight, and recent inbound scan list |
| 2 | Duplicate barcode blocked | Same barcode at `/stock/inbound` | UI/action error, camera auto-save does not submit a known duplicate, failed `barcode_scan_logs` row if submitted/bypassed, and no second `stock_units` row |
| 3 | Barcode weight rule saved/reused | Save rule for item+brand+origin, then scan same scope | Atomic `barcode_weight_rules` row with `location_id = null`; next scan pre-fills matching rule |
| 4 | Barcode label printing works | Scan a no-weight barcode at `/stock/inbound`; generate label at `/stock/inbound`; reprint at `/stock/units/[id]` | No-weight supplier barcode is blocked with label-print instruction; 50mm x 30mm print/PDF preview with company, product, weight, barcode |
| 5 | Order-based outbound works | `ORD-SEED-PICKUP-001` at `/stock/outbound` | Outbound batch and lines created; scanned units become sold/outbounded; substitutions show warning only; missing barcode and unavailable statuses show pre-confirm warnings; local regression covers ready-order gating, barcode list parsing, duplicate detection, missing scan messaging, and blocked status messaging |
| 6 | Transfer/receive works | `/stock/transfer` then `/stock/receive-transfer` | Atomic transfer scan sets `TRANSFER_PENDING` with movement/log rows; atomic receive scan changes actual location with movement/log rows; transfer cannot be cancelled after scanned out |
| 7 | Damage/spoilage approval works | Staff request, manager review, director approve | Required photo path, required reason, reviewed request, director approval, `OUTBOUND_SPOILED` movement, unit `DAMAGED`; local regression covers review/reject status gates |
| 8 | Stock take approval works | Manager create/review, director approve | Item+brand scoped session; barcode-only count with manual count entry disabled; submit blocked until at least one barcode line exists; manager signature; director signature; missing expected barcodes are auto-recorded as variance and adjusted out only at director approval; `STOCK_TAKE_ADJUSTMENT` movement; local regression covers item+brand scope matching and required signatures |
| 9 | No-barcode-to-barcode flow works | `/stock/no-barcode-inbound` then `/stock/inbound` | Route redirects to barcode inbound; generated internal numeric label is used for inbound |
| 10 | Reports/export work | `/stock/reports` | CSV download, print/PDF-ready view, WhatsApp summary text include balance, inbound age, variance, damage, supplier return; damage/supplier rows include linked barcode weight where available; local regression covers CSV quote escaping and WhatsApp total/alert counts |
| 11 | Role/outlet isolation works | JC user vs Wonderful user | Cross-location stock units, movements, stock take rows, requests are hidden or rejected |
| 12 | Mobile scanner works | Phone-width 390px on real phone and laptop | Large scan button, camera permission prompt, rear camera preference on phone, manual fallback, recent scan list, saved scan count/weight, previous scan weight, undo scan before finish, finish-session summary, success vibrate/beep where supported, continuous mode on batch workflows, stream stops on close; local scanner coverage guards these source hooks |
| 13 | Automated tests exist | Local terminal | `npm.cmd run smoke` runs route checks, barcode regression, stock acceptance coverage, stock state-transition coverage, stock migration safety checks, stock role/scope coverage, stock scanner coverage, stock RLS policy coverage, stock seed coverage, stock security/no-service-role coverage, stock item-master coverage, stock label coverage, stock-take warning coverage, and stock report coverage |

Dashboard KPI and shortcut QA: verify `/stock/dashboard` shows today inbound and today outbound weights from the current day's movement rows, alongside total stock weight, barcode units, pending transfers, legacy no-barcode visibility, variance, negative-stock alerts, and stock-age alerts. Also verify stock operator/admin dashboard shortcuts open inbound, outbound, transfer, receive-transfer, and return; director/view-only users should not see these routine operation shortcuts.

## Blocked/Invalid Paths

- Item code rules: create/edit item master with a non-numeric `item_code`, expect rejection; create/edit with a duplicate numeric `item_code`, expect rejection; confirm the next-code suggestion ignores old non-numeric legacy codes.
- Barcode label rules: generated labels should be numeric-only and should not generate from a non-numeric item code.
- Inbound undo: undo a current-session scan; expect the unit to become `VOIDED`, an `INBOUND_VOID` movement with negative weight, a scan log, and an audit log. The original `stock_units` and `INBOUND` movement rows must remain.
- Inactive item inbound: mark an item inactive, try inbound, expect `Inactive products cannot receive new inbound stock.`
- Missing barcode outbound: scan a non-existing barcode, expect a pre-confirm missing-barcode warning; if bypassed/submitted, expect `Barcode was not found.`
- Same-destination transfer outbound: choose `TRANSFER`, scan a barcode already in the selected destination, expect the outbound batch confirm button to stay disabled with `Invalid transfer destination`.
- Already outbound barcode: outbound the same barcode again, expect blocked action and failed scan log.
- Wrong-status outbound: scan a barcode that is not available for the selected outbound type, expect a pre-confirm blocked-scan warning and a blocked action if submitted.
- Stockable status rules: `IN_STOCK`, `TRANSFERRED`, and `RETURNED` are available for normal stock movement; `INSPECTION`, `HOLD`, `TRANSFER_PENDING`, `DAMAGED`, and `SOLD` are not available for normal outbound.
- Direct outbound: confirm `SALES`, `TRANSFER`, and `PROCESSING` work without an order and that damage/spoilage and supplier return use approval workflows.
- Damage approval: manager review should only accept `SUBMITTED`; director approval should only accept `MANAGER_REVIEWED`; manager rejection should only apply before review; director rejection should only apply after manager review.
- Return supplier approval: manager approval/rejection should only apply to `SUBMITTED` requests and must reject requests outside the manager stock-location scope.
- Wrong-location stock take: scan a barcode from another location, expect rejection.
- Empty stock take submit: create a draft session with no scanned barcode lines, then submit; expect `Scan at least one barcode before submitting stock take for review.`
- Empty stock take review/approval: use an older submitted/reviewed session with no lines if available; expect review/approval to be blocked, and direct RPC approval to return `Scan at least one barcode before approving stock take.`
- Customer return: sold customer return should go to `INSPECTION` before becoming sellable; seeded barcode `EM-SEED-RETURN-INSPECTION-001` should not be available for outbound until atomic manager/admin inspection release changes it to `IN_STOCK` and writes movement, scan-log, and audit-log rows.
- Normal return: returning a barcode should atomically set the unit to `IN_STOCK` and write movement, scan-log, and audit-log rows.
- Failed delivery return: linked barcode stock should return to `IN_STOCK`; no-barcode failed return is not used for MVP.
- Director routine operations: director can view/approve but cannot use `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, or `/stock/return`.
- Non-admin delete: non-admin/director can create/edit item master but cannot delete item rows.

## Evidence Log

Record every pass/fail result in `docs/STOCK_QA_EVIDENCE.md`. The runbook is the test procedure; the evidence log is the sign-off record.

## Phone QA

Test on a real phone, not only browser responsive mode:

Codex note for the current Stock Mobile UX pass: local source guards cover the mobile scanner and worker-flow requirements, but real phone/browser automation was not available in the Windows sandbox. Owner/device QA must still capture evidence for the items below.

1. Open app over HTTPS or localhost tunneling that allows camera permission.
2. Sign in as a stock operator.
3. Visit `/stock/inbound`.
4. Tap `Scan Barcode`.
5. Confirm the browser asks for camera permission.
6. Confirm the rear camera is preferred.
7. Scan a physical barcode.
8. Confirm the recent scan list, saved scan count, and saved total weight appear, the barcode input is filled, and the phone vibrates or beeps if supported.
9. Close scanner and confirm camera indicator turns off.
10. Repeat on `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and `/stock/stock-take`.
11. On `/stock/inbound`, `/stock/outbound`, and `/stock/stock-take`, keep the scanner open and scan multiple different labels to confirm continuous scan mode works.

## Desktop QA

1. Open the app on a laptop with camera access.
2. Visit the same scanner routes.
3. Confirm camera opens, manual fallback works, and closing scanner stops camera use.
4. Print or export one inbound label and one stock-unit detail reprint label.

## Remaining Completion Gate

The Stock module can only be marked complete when this runbook has passing evidence for all 13 acceptance tests, plus the local commands all pass.
