# Workflow Acceptance Checklist

Use this as the acceptance gate before internal pilot use.

## Settings

- [ ] Admin can assign a user role, outlet, department, and stock location.
- [ ] Admin can enable/disable outlet module access.
- [ ] Normal users see only modules enabled for their assigned outlet.
- [ ] Admin can manage payment types, claim categories, leave types, customer categories, customers, customer price rules, and barcode weight rules.
- [ ] Non-admin users cannot access `/settings` or save settings actions.
- [ ] Settings changes are written with authenticated user context only; no frontend service-role key is used.

## Stock

- [ ] Staff can select item, brand, origin, location, inbound source, and weight-position rule once, then keep scanning the same item.
- [ ] Camera scan can auto-fill barcode and parsed net weight from the saved barcode weight-position rule.
- [ ] Saved barcode weight-position rule is reused for the same item/brand/origin.
- [ ] Inbound creates `stock_units`, `stock_movements`, and `barcode_scan_logs`.
- [ ] Inbound records source as supplier/import, processing output, customer return, transfer received, manual adjustment, or other.
- [ ] Duplicate inbound barcode is blocked.
- [ ] Outbound missing barcode is blocked.
- [ ] Outbound sold/outbounded barcode is blocked.
- [ ] Transfer creates pending transfer without changing `location_id`.
- [ ] Receive-transfer changes `location_id` only at destination scan.
- [ ] Return changes barcode unit status to `IN_STOCK`.
- [ ] Stock take scan rejects wrong-location barcode.
- [ ] Stock take adjustment is applied only after manager review and director final approval.
- [ ] Missing expected stock-take barcodes become variance and are adjusted out only after director final approval.
- [ ] General worker cannot see another stock location.
- [ ] Director can view stock dashboards/reports and approve stock take, but cannot run routine stock inbound/outbound/transfer/receive/return workflows.
- [ ] `/stock/no-barcode-inbound` redirects to Barcode Inbound and new loose no-barcode inbound is blocked server-side.
- [ ] Order outbound requires a ready customer order before confirmation.
- [ ] Order outbound shows scanned list, item count, known total weight, and unknown scan count.
- [ ] Order outbound confirmation stays disabled until a barcode is scanned.
- [ ] Order outbound transfer confirmation stays disabled until a destination location is selected.
- [ ] Order outbound writes outbound batch, batch lines, stock movements, scan logs, and final stock-unit status.
- [ ] Direct outbound allows `SALES`, `TRANSFER`, and `PROCESSING` without a customer order.
- [ ] Direct outbound writes outbound batch, batch lines with `order_id = null`, stock movements, scan logs, and final stock-unit status.
- [ ] Damage/spoilage requires photo, reason, manager review, and director approval before stock is deducted.
- [ ] Return supplier requires request and manager approval before stock is deducted.
- [ ] Customer return after sale goes to inspection before it can become sellable stock.
- [ ] Failed delivery linked barcode stock returns to `IN_STOCK` and writes return movement/scan logs.
- [ ] Stock reports include stock balance, stock take variance, damage/spoilage, and return supplier rows.
- [ ] Stock reports support CSV export, print/PDF-ready view, and WhatsApp-ready summary text.
- [ ] Seeded order outbound can be tested with `ORD-SEED-PICKUP-001`, `EM-SEED-OUT-001`, and `EM-SEED-OUT-002` after running `supabase/seed.sql`.

## Orders

- [ ] Sidebar shows Orders for eligible retail/processing/admin/director users.
- [ ] Orders routes load: `/orders`, `/orders/new`, `/orders/[id]`, and `/orders/prepare`.
- [ ] User can create pickup and delivery orders with customer, dates, fulfillment type, delivery flag, remarks, creator, and scope.
- [ ] User can create internal transfer orders.
- [ ] Admin/director-created orders require an outlet scope so assigned outlet users can see them.
- [ ] User can add order items with requested quantity or requested weight.
- [ ] Adding an order item does not create a stock reservation.
- [ ] Starting picking/preparation creates an active stock reservation for prepared quantity/weight.
- [ ] User can prepare each order item with prepared quantity or prepared weight.
- [ ] Prepared item records `prepared_by` and writes a preparation log.
- [ ] Order cannot be marked ready until every item is prepared with quantity or weight.
- [ ] Ready pickup order becomes `READY_FOR_PICKUP`.
- [ ] Ready delivery order becomes `READY_FOR_DELIVERY`.
- [ ] Ready pickup, out-for-delivery, and delivered transitions create WhatsApp placeholder events.
- [ ] Non-admin order operators cannot directly move orders to out-for-delivery, delivered, or failed outside the delivery workflow.
- [ ] Delivery users cannot directly edit customer, dates, fulfillment, outlet, department, or creator fields on Orders-module records.
- [ ] Director can view orders but cannot create, prepare, mark ready, or update delivery status/proof as a routine operator.

## Delivery

- [ ] Delivery order records customer location, vehicle, driver, progress, payment type, and payment status.
- [ ] Delivery order records source as manual, retail sale, or WhatsApp with source reference.
- [ ] Delivery status options are Pending, Out for Delivery, Delivered, Failed, and Cancelled.
- [ ] Delivery payment type options display Cash, Online Transfer, and Credit Term.
- [ ] Proof photo upload/file metadata can be attached.
- [ ] Non-image proof upload is rejected.
- [ ] Driver location can be recorded.
- [ ] Another delivery team cannot see or edit the order.
- [ ] Delivery-required Orders module records appear in the delivery list as Pending when `READY_FOR_DELIVERY`.
- [ ] Seeded delivery order `ORD-SEED-DELIVERY-001` appears in the delivery list as Pending after running `supabase/seed.sql`.
- [ ] `/delivery/orders` can update Orders-module deliveries and upload customer order proof photos.
- [ ] Delivery team can move customer order from Pending to Out for Delivery, then Delivered, Failed, or Cancelled only through valid transitions.
- [ ] Customer order proof photo upload accepts image files and rejects non-images.
- [ ] Customer order proof upload is blocked until the order is out for delivery, delivered, or failed.

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
- [ ] Customer category price rules are available for future retail/order pricing decisions.
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

## Navigation

- [ ] At 390px width, the hamburger opens the mobile drawer.
- [ ] Mobile drawer shows the same role-based categories as desktop.
- [ ] Tapping a mobile drawer nav item closes the drawer.
- [ ] Desktop sidebar remains visible and unchanged on large screens.
- [ ] Page has no horizontal scrolling at 390px width.
