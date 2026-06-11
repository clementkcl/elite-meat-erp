# Elite Meat ERP Manual QA Checklist

Use this checklist for internal testing after applying migrations in order and running the seed file. Each module has at least one happy path and one blocked or invalid path to verify.

## Environment Checks

- Run with anon Supabase keys only in `.env.local`; no service-role key in frontend.
- Confirm `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run smoke` pass.
- Create test users in Supabase Auth and assign `profiles`, `profile_roles`, `outlet_id`, `department_id`, and `stock_location_id`.
- Verify non-admin users show a scope badge in the sidebar/header.

## Stock

- Happy path: inbound scan a new barcode into the user stock location; verify `stock_units`, `stock_movements`, and `barcode_scan_logs` rows are created.
- Happy path: transfer a barcode from source location; verify location does not change until receive-transfer scan completes.
- Happy path: receive-transfer scan at the destination; verify the unit location changes to destination.
- Happy path: return stock; verify the unit status becomes `IN_STOCK`.
- Happy path: create stock take for assigned location, scan a barcode at that location, submit, then approve as director/admin.
- Blocked path: inbound scan the same barcode twice; second scan must fail.
- Blocked path: outbound a missing or already sold barcode; action must fail.
- Blocked path: stock take scan a barcode from the wrong location; action must fail.
- Blocked path: general worker tries to approve/reject stock take; RLS/action must block it.
- Blocked path: general worker tries another location; server action must show missing/wrong stock-location access.

## Delivery

- Happy path: delivery team creates an order with customer location, vehicle, driver, status, payment type, and payment status.
- Happy path: delivery order records source as manual, retail sale, or WhatsApp with a source reference.
- Happy path: driver updates progress, proof photo upload/file reference, and driver location.
- Blocked path: proof upload rejects non-image files.
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
- Blocked path: non-director/non-admin cannot access director report routes through sidebar and must be blocked by route-level role checks/RLS.

## Browser Smoke Routes

- Visit `/stock/inbound`, `/stock/outbound`, `/stock/transfer`, `/stock/receive-transfer`, `/stock/return`, and `/stock/stock-take`; verify scanner button opens camera permission flow and manual fallback exists.
- Visit `/delivery/dashboard`, `/attendance/today`, `/oa-actions/dashboard`, `/retail/dashboard`, `/processing/dashboard`, `/cleaning/tasks`, `/accounting-finance/dashboard`, and `/director-reports/dashboard`; verify no runtime error boundary appears.
- Submit one intentionally invalid form per module and verify the page shows an error state without losing the full page.
