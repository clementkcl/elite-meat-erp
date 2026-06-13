# Elite Meat ERP Manual QA Checklist

Use this checklist for internal testing after applying migrations in order and running the seed file. Each module has at least one happy path and one blocked or invalid path to verify.

For Stock-only completion evidence, also run `docs/STOCK_QA_RUNBOOK.md` and fill in `docs/STOCK_QA_EVIDENCE.md`.

## Environment Checks

- Run with anon Supabase keys only in `.env.local`; no service-role key in frontend.
- Confirm `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run smoke` pass.
- Confirm `npm run smoke` runs route checks, barcode/label regression checks, and stock acceptance coverage checks.
- Confirm that a configured Supabase project with a missing/failed stock table shows a clear stock data load error instead of demo data.
- Create test users in Supabase Auth and assign `profiles`, `profile_roles`, `outlet_id`, `department_id`, and `stock_location_id`.
- Verify non-admin users show a scope badge in the sidebar/header.
- After running `supabase/seed.sql`, use `ORD-SEED-PICKUP-001` with `EM-SEED-OUT-001` and `EM-SEED-OUT-002` for the first order outbound test.
- After running `supabase/seed.sql`, use `ORD-SEED-DELIVERY-001` to verify delivery-required Orders module records in `/delivery/driver` and `/delivery/orders`.
- After running `supabase/seed.sql`, use `CUST-JC-PICKUP-001` and `CUST-SM-CREDIT-001` to verify customer master, price category, and credit customer data.

## Admin Settings

- Happy path: admin opens `/settings`, assigns a user role, outlet, department, and stock location, then signs in as that user and verifies the sidebar and "Viewing" scope reflect the assignment.
- Happy path: admin disables one module for an outlet, signs in as a scoped user from that outlet, and verifies that module shortcut/category is hidden and direct route access is blocked.
- Happy path: admin adds a payment type, claim category, leave type, customer category, customer, customer price rule, and barcode weight rule.
- Blocked path: non-admin direct visits `/settings` and sees the module access block.
- Blocked path: non-admin attempts a settings server action and must receive an admin-only error/RLS rejection.
- Blocked path: create a customer price rule without category or customer; the form action must reject it.

## Stock

- Happy path: sign in as each ERP role with Stock module access, open `/stock/items`, create or edit a numeric item code with category, default brand, and product name, and verify non-numeric item codes are rejected.
- Happy path: inbound scan a new barcode into the user stock location; verify `stock_units`, `stock_movements`, and `barcode_scan_logs` rows are created.
- Happy path: transfer a barcode from source location; verify location does not change until receive-transfer scan completes.
- Happy path: receive-transfer scan at the destination; verify the unit location changes to destination.
- Happy path: confirm a transfer scanned out for more than 3 days appears in overdue receive alerts.
- Happy path: return stock; verify the unit status becomes `IN_STOCK`.
- Happy path: customer return after sale goes to hold/inspection, cannot be outbounded, then manager/admin inspection release changes it to `IN_STOCK`.
- Happy path: direct outbound supports `SALES`, `TRANSFER`, and `PROCESSING` without a customer order.
- Happy path: order outbound can scan different items under the same order, shows a warning for requested/scanned differences, and records substitutions separately.
- Happy path: create stock take for assigned location, scan a barcode at that location, submit, then approve as director/admin.
- Happy path: leave one expected barcode unscanned in the selected item+brand+location; after director approval, confirm the missing barcode appears as variance and the stock unit becomes adjusted out.
- Happy path: damage/spoilage request requires photo and a reason, manager review, then director approval before stock deduction.
- Happy path: return supplier request requires approval before stock deduction.
- Blocked path: inbound scan the same barcode twice; second scan must fail.
- Blocked path: outbound a missing or already sold barcode; action must fail.
- Blocked path: outbound a wrong-status or wrong-location barcode; action must fail.
- Blocked path: damage/spoilage or return-supplier deduction cannot be completed through direct outbound without the approval workflow.
- Blocked path: transfer cannot be cancelled after it has been scanned out.
- Blocked path: stock take scan a barcode from the wrong location; action must fail.
- Blocked path: open stock take blocks inbound/outbound only for the selected item+brand in that location, not unrelated stock.
- Blocked path: general worker tries to approve/reject stock take; RLS/action must block it.
- Blocked path: general worker tries another location; server action must show missing/wrong stock-location access.
- Blocked path: director can view stock dashboards/reports and approve submitted stock take, but direct visits to `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, and `/stock/return` must show the module access block or fail the server action.
- Blocked path: non-admin/director cannot delete item master rows even though they can create/edit them.
- No-barcode-to-barcode path: visit `/stock/no-barcode-inbound`, verify it redirects to `/stock/inbound`, generate/print a label, attach it, then complete Barcode Inbound.

## Delivery

- Happy path: delivery team creates an order with customer location, vehicle, driver, status, payment type, and payment status.
- Happy path: delivery order records source as manual, retail sale, or WhatsApp with a source reference.
- Happy path: driver updates progress, proof photo upload/file reference, and driver location.
- Happy path: customer-order delivery is moved to `OUT_FOR_DELIVERY`, failed proof photo/contact/GPS is uploaded, linked barcode stock returns to `IN_STOCK`, `stock_movements` contains `RETURN` rows with the customer order id as reference, and the order shows failed return status.
- Happy path: standalone delivery failed proof records `NO_STOCK_LINK` so staff can see manual return follow-up is required.
- Blocked path: proof upload rejects non-image files.
- Blocked path: direct delivery/customer-order status update to `FAILED` without proof is rejected with a clear proof/return-workflow message.
- Blocked path: failed delivery with missing photo, receiver/contact name, latitude, or longitude is rejected server-side.
- Blocked path: attempt partial failed delivery; MVP should return all linked outbound barcode lines or report a pending/no-link status instead of silently losing stock.
- Blocked path: delivery user assigned to another department/team must not see or update the first team order.
- Blocked path: normal delivery worker must not delete vehicles, orders, payments, or status logs.

## Attendance

- Happy path: user clocks in within 50m of assigned work location; summary uses department-specific start time.
- Happy path: user clocks out and summary shows clock-out time.
- Happy path: clock in more than 5 minutes after department start; summary status is `LATE`.
- Happy path: department manager approves leave in OA; attendance summary for the leave dates automatically shows `ON_LEAVE`.
- Blocked path: clock in outside 50m GPS radius; action must fail.
- Blocked path: user on approved leave tries to clock in; action must fail and keep `ON_LEAVE`.
- Blocked path: leave a prior day with no clock-out; verify the next clock action marks it as `NO_CLOCK_OUT`.
- Blocked path: user tries to clock out before clocking in; action must fail.
- Blocked path: user cannot read another department's attendance unless manager/admin/director scope permits it.

## OA Actions

- Happy path advance: staff submits, admin reviews, director approves, account marks paid; approval timeline rows exist.
- Happy path claim: staff submits, department manager reviews, admin reviews, director approves, account marks paid; approval timeline rows exist.
- Happy path leave: staff submits leave; department manager approves.
- Happy path payslip: account or admin uploads payslip; staff sees own; director sees all.
- Blocked path: staff cannot director-approve own advance or claim.
- Blocked path: account cannot admin-review an advance or claim.
- Blocked path: account cannot approve a claim/advance before director approval.
- Blocked path: director cannot upload or edit payslips.
- Blocked path: manager from a different department cannot review another department claim/leave.

## Retail

- Happy path: retail user records daily sales for today with admin-configured payment type and cash received.
- Happy path: retail user opens and closes cash session for today; a different manager/admin/director approves.
- Happy path: retail user submits outlet expense with type, amount, receipt image path, date, and payment method; a different manager checks it; admin/director approves it; account/admin marks it paid.
- Happy path: POS sale consumes barcode or no-barcode stock and records payment.
- Blocked path: retail expense submitter cannot check their own submitted expense.
- Blocked path: retail user attempts to edit past-day sales/cash; action and RLS must block it.
- Blocked path: retail user from Outlet A cannot see Outlet B sales, cash sessions, payments, expenses, or daily closing.
- Blocked path: retail user cannot delete sales/payment/closing rows.

## Processing

- Happy path: processing worker records raw material, finished goods, worker, department, yield %, and loss.
- Happy path: completed processing batch consumes matching no-barcode raw stock at the user's assigned stock location and creates stock movement history.
- Happy path: processing dashboard/table flags yield or loss outside the finished item's threshold.
- Happy path: processing manager reviews completed batch for own department.
- Blocked path: processing worker cannot create a batch when raw loose stock is missing or insufficient.
- Blocked path: processing worker cannot review protected batch workflow.
- Blocked path: user from another processing department cannot see or update the batch.

## Cleaning

- Happy path: retail/processing manager creates cleaning task for own outlet/department with daily, weekly, monthly, or quarterly frequency.
- Happy path: department user marks own scoped task done or missed and verify the 30-day cleaning matrix changes counts.
- Happy path: overdue pending and missed tasks appear in Missing cleaning alerts.
- Blocked path: manager from another outlet/department cannot edit the task.
- Blocked path: normal worker cannot delete cleaning tasks.

## Accounting and Finance

- Happy path: account uploads AR/AP invoice PDF/image metadata with invoice number, customer/supplier, invoice date, amount, item list, and payment status.
- Happy path: admin reviews invoice data, director/admin approves, account/admin marks paid.
- Happy path: accounting dashboard shows debtor and creditor aging buckets.
- Happy path: account records container ETA, supplier, order ID, permit status, payment status, document status, item list, actual/proforma weight.
- Blocked path: account cannot admin-review submitted invoice data.
- Blocked path: non-account worker cannot approve/pay finance invoice.
- Blocked path: invoice cannot be paid before approved status.

## Director

- Happy path: director dashboard defaults to the current month and shows sales, cash received, expenses, stock weight, low stock, pending delivery, pending OA, attendance, cleaning, processing, AR/AP, and container ETA cards.
- Happy path: director approvals page approves/rejects OA, finance, and retail pending items.
- Happy path: reports page supports print/PDF view, WhatsApp summary copy, and CSV download.
- Blocked path: director can view customer orders and delivery handoff records, but routine order creation/preparation, order outbound confirmation, and delivery status/proof actions must be unavailable or rejected.
- Blocked path: non-director/non-admin cannot access director report routes through sidebar and must be blocked by route-level role checks/RLS.

## Browser Smoke Routes

- Mobile navigation happy path: set viewport to 390px wide, sign in, tap the hamburger button, verify the left drawer opens with the same role-based navigation as desktop, tap one menu item, and verify the drawer closes without horizontal scrolling.
- Mobile navigation blocked path: sign in as a role without Orders or Director access, open the mobile drawer, and verify restricted categories/routes are absent; direct URL access should show the module access block.
- Order workflow happy path: create a pickup order, add at least one item with requested quantity or weight, prepare every item with prepared quantity or weight, mark the order ready, then verify it appears as ready for outbound.
- Order scope happy path: sign in as admin/director, create an order with an outlet scope, then sign in as a user assigned to that outlet and verify the order appears.
- Order reservation happy path: after adding an order item, verify no `order_stock_reservations` row exists yet; after preparing/picking the item, verify one active reservation row exists for the prepared item, quantity/weight, and assigned stock location.
- Order reservation release happy path: cancel an order after picking/preparation has created an active reservation, verify the reservation remains `ACTIVE`, then use `Release reserved stock` and verify the reservation changes to `RELEASED`.
- Order reservation release blocked path: try to release reservations for a non-cancelled order or a cancelled order with no active reservations; the server should reject it clearly.
- Order workflow blocked path: try to mark an order ready before all items are prepared; the form should keep the submit path disabled or the server should reject it.
- Delivery order integration happy path: create a delivery-required order, prepare it, mark it ready, then verify the delivery list shows the customer order as `Pending`.
- Delivery order action path: from `/delivery/orders`, move the customer order to `Out for delivery`, upload delivered proof after it is in progress, and verify the proof upload marks it `Delivered`.
- Failed delivery return path: after order outbound as `SALES`, move the customer order to `Out for delivery`, upload failed proof, then verify stock units become `IN_STOCK`, return movement and scan logs exist, and the delivery/order page shows returned or pending return status.
- Delivery order integration blocked path: try to update a delivery order from `READY_FOR_DELIVERY` directly to `DELIVERED`; the action must reject the invalid transition.
- Order outbound happy path: select a ready customer order, scan multiple barcodes, confirm outbound as `SALES`, and verify the outbound batch, batch lines, stock movements, scan logs, and stock unit statuses.
- Seeded outbound happy path: select `ORD-SEED-PICKUP-001`, scan `EM-SEED-OUT-001` and `EM-SEED-OUT-002`, confirm `SALES`, and verify the scanned list clears after success.
- Order outbound transfer path: select `TRANSFER`, verify confirm stays disabled until a destination is selected, confirm the batch, and verify stock units are `TRANSFER_PENDING` until receive-transfer scan.
- Direct outbound happy path: select `Direct outbound`, scan multiple in-stock barcodes, confirm as `PROCESSING` or `SALES`, and verify outbound batch/lines have `order_id = null`.
- Direct outbound transfer path: select `Direct outbound` and `TRANSFER`, verify destination is required, confirm, and verify stock units are `TRANSFER_PENDING` until receive-transfer scan.
- Order outbound blocked path: scan duplicate, missing, sold/outbounded, or mixed-location barcodes; each invalid case should show a clear error and avoid partial stock updates.
- Visit `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and `/stock/stock-take`; verify the large scanner button opens camera permission flow, manual fallback text field exists, and the recent scan list is shown after scans.
- Visit `/delivery/dashboard`, `/attendance/today`, `/oa-actions/dashboard`, `/retail/dashboard`, `/processing/dashboard`, `/cleaning/tasks`, `/accounting-finance/dashboard`, and `/director-reports/dashboard`; verify no runtime error boundary appears.
- Submit one intentionally invalid form per module and verify the page shows an error state without losing the full page.
