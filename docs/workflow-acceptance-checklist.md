# Workflow Acceptance Checklist

Use this as the acceptance gate before internal pilot use.

## Stock

- [ ] Staff can select item, brand, origin, location, inbound source, and weight-position rule once, then keep scanning the same item.
- [ ] Camera scan can auto-fill barcode and parsed net weight from the saved barcode weight-position rule.
- [ ] Saved barcode weight-position rule is reused for the same item/brand/origin/location.
- [ ] Inbound creates `stock_units`, `stock_movements`, and `barcode_scan_logs`.
- [ ] Inbound records source as supplier/import, processing output, return, or transfer.
- [ ] Duplicate inbound barcode is blocked.
- [ ] Outbound missing barcode is blocked.
- [ ] Outbound sold/outbounded barcode is blocked.
- [ ] Transfer creates pending transfer without changing `location_id`.
- [ ] Receive-transfer changes `location_id` only at destination scan.
- [ ] Return changes barcode unit status to `IN_STOCK`.
- [ ] Stock take scan rejects wrong-location barcode.
- [ ] Stock take adjustment is applied only after admin/director approval.
- [ ] General worker cannot see another stock location.

## Delivery

- [ ] Delivery order records customer location, vehicle, driver, progress, payment type, and payment status.
- [ ] Delivery order records source as manual, retail sale, or WhatsApp with source reference.
- [ ] Delivery status options are Pending, Out for Delivery, Delivered, Failed, and Cancelled.
- [ ] Delivery payment type options display Cash, Online Transfer, and Credit Term.
- [ ] Proof photo upload/file metadata can be attached.
- [ ] Non-image proof upload is rejected.
- [ ] Driver location can be recorded.
- [ ] Another delivery team cannot see or edit the order.

## Attendance

- [ ] Clock-in works inside 50m GPS radius.
- [ ] Clock-in outside 50m fails.
- [ ] Late status applies after 5-minute grace.
- [ ] Clock-out updates the day summary.
- [ ] Prior days missing clock-out are recorded as `NO_CLOCK_OUT`.
- [ ] Clock-out before clock-in is blocked.
- [ ] Department-specific start time is used.
- [ ] Approved OA leave automatically creates or updates attendance summary rows as `ON_LEAVE`.
- [ ] Clock-in is blocked on an approved leave day.

## OA Actions

- [ ] Advance follows staff -> admin -> director -> account pay.
- [ ] Claim follows staff -> department manager -> admin -> director -> account pay.
- [ ] Leave is approved/rejected by department manager.
- [ ] Approval timeline records every transition.
- [ ] Staff cannot approve own protected workflow.
- [ ] Account cannot pay before director approval.
- [ ] Payslip staff/director visibility is correct.

## Retail

- [ ] Daily sales can be recorded for today.
- [ ] Payment type comes from admin-configurable payment types.
- [ ] Cash session can be opened and closed.
- [ ] Daily closing can be submitted and checked by a different manager/admin/director.
- [ ] Outlet expense captures type, amount, receipt image path, submitted by, paid by, and date.
- [ ] Outlet expense submitter cannot check their own expense.
- [ ] Retail worker cannot edit past-day sales/cash.
- [ ] Other outlet data is not visible.

## Processing

- [ ] Worker records raw material, finished goods, worker, department, yield, and loss.
- [ ] Raw material is consumed from matching no-barcode stock in the assigned stock location.
- [ ] Finished goods do not enter stock until barcode inbound scan.
- [ ] Yield/loss alerts use item-level thresholds.
- [ ] Processing manager reviews completed batch.
- [ ] Other department cannot see or update batch.

## Cleaning

- [ ] Manager creates task for own outlet/department.
- [ ] Department user marks own scoped task done or missed.
- [ ] Frequency supports daily, weekly, monthly, quarterly.
- [ ] 30-day matrix shows projected due counts.
- [ ] Missing cleaning alerts show overdue pending and missed tasks.
- [ ] Other outlet/department cannot update task.

## Finance

- [ ] AR/AP invoice upload metadata supports PDF/image file path.
- [ ] Invoice number, customer/supplier, invoice date, amount, item list, and payment status can be entered/corrected.
- [ ] Admin reviews submitted invoice data.
- [ ] Account cannot admin-review submitted invoice data.
- [ ] Invoice lifecycle reaches admin reviewed, approved, paid.
- [ ] Dashboard shows debtor and creditor aging buckets.
- [ ] Container has ETA, supplier, order ID, permit/payment/document status, item list, and actual/proforma weight.

## Director

- [ ] Dashboard cards load.
- [ ] Dashboard defaults to the current month for period-based totals.
- [ ] Director can approve/reject pending items.
- [ ] Reports have print/PDF-ready view.
- [ ] Reports have WhatsApp-ready copy text.
- [ ] Reports have CSV export where available.
