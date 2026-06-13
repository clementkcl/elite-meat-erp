# Business Rules

## What Already Exists

Elite Meat ERP is modeled for a frozen pork / meat processing business with outlet, department, stock-location, and role-based workflows.

### Roles

- `retail_team_general_worker`
- `retail_manager`
- `delivery_team_general_worker`
- `delivery_manager`
- `processing_team_general_worker`
- `processing_manager`
- `account`
- `admin`
- `director`

### Scope Rules

- Admin and director can view all data.
- Non-admin users are scoped by profile fields:
  - `profiles.outlet_id`
  - `profiles.department_id`
  - `profiles.stock_location_id`
- Staff may need access to multiple outlets or stock locations depending on role; the current profile model is single-scope and needs a future multi-scope access model.
- Outlet module access is controlled by `outlet_module_access`.
- Operational pages show role/module-specific navigation and scope badges.
- RLS must strictly block outlets, departments, teams, and stock locations the user cannot access unless the user has a global role that explicitly allows it.

### Stock / Inventory

- Item master supports editable numeric-only `item_code`, category, default brand, section, name, Chinese name, Iban name, barcode requirement, active status, and default low stock level.
- Item master product identity is category plus default brand plus product section/name. Brand is still captured on barcode stock units, barcode rules, prices, damage/return requests, and stock-take scope for actual stock traceability.
- Item master create/edit is allowed for every ERP role when that user's outlet has Stock module access. Item master delete remains admin/director only.
- Old non-numeric item codes are converted to the next numeric `0001`-style code by the stock inbound/label migration before the numeric-only item-code constraint is applied.
- Stock inbound, outbound, and transfer are allowed for outlet staff with stock module access.
- Create/edit item master is allowed for every ERP role with Stock module access. Item deletion is admin/director only.
- Temporary negative stock is allowed and stock balance/dashboard/report surfaces show a clear alert when no-barcode quantity or weight goes below zero.
- Staff manually chooses batch/barcode. Do not force FIFO/FEFO yet.
- Duplicate item code and duplicate inbound barcode are blocked.
- Item master updates must fail clearly if the selected item no longer exists or the user's role cannot update it.
- Barcode stock is the main stock model for MVP. Every stock unit should have a barcode.
- If an item has no supplier/import barcode, staff generate and print an internal numeric barcode label first, attach it, then inbound/outbound the item normally.
- Legacy loose/non-barcode tables still exist for compatibility and older records, but new MVP stock flow should use barcode labels instead of creating a separate no-barcode balance.
- New no-barcode inbound is disabled in the Stock module; `/stock/no-barcode-inbound` redirects to Barcode Inbound.
- Inbound writes stock units, stock movements, and barcode scan logs.
- Barcode inbound writes the stock unit, movement row, scan log, audit log, and optional item+brand+origin weight rule atomically through a database RPC.
- Continuous barcode inbound shows the current scan preset, saved scan count, saved total weight, and recent inbound scans/labels for the current worker session.
- Barcode inbound starts with recent item+brand+origin templates so workers can reuse a saved setup and scan immediately.
- Barcode inbound auto-generates a batch number when the page opens; workers do not need to press Start Batch.
- Inbound location defaults to the user's assigned stock location, but remains editable subject to role/location restrictions.
- Brand and origin are required for barcode inbound.
- If a scanned barcode cannot decode weight confidently, workers must use generated barcode label printing rather than saving the supplier barcode with a manually typed weight.
- Low-confidence fixed-weight fallback still asks staff to confirm or correct the weight before saving.
- Current-session inbound undo voids the stock unit and writes an `INBOUND_VOID` movement, scan log, and audit log. It must not delete stock units or movements silently.
- After a worker finishes an inbound session, normal workers should ask a manager/admin to correct mistakes.
- Expiry date is not required.
- Inbound date is recorded on barcode stock units and used to estimate stock age.
- Stock dashboard/report surfaces show stock age alerts above 6 months and 12 months.
- Transfers should not change stock location until receive-transfer scan.
- Returns restore stock unit status to `IN_STOCK`.
- Normal stock return updates the barcode unit, movement row, scan log, and audit log atomically through a database RPC.
- Customer return after sale goes to `HOLD` or `INSPECTION` first before becoming sellable stock again.
- Manager/admin inspection release is required before customer-return inspection stock becomes `IN_STOCK`.
- Inspection release updates the barcode unit, movement row, scan log, and audit log atomically through a database RPC.
- Failed delivery return automatically restores linked barcode stock to `IN_STOCK`.
- No-barcode failed delivery return is not required for MVP because no-barcode stock should be converted to barcode stock before operational movement.
- Damaged/spoiled stock requires staff request with photo, department manager review, then director approval before deduction.
- Damage/spoilage reasons are expired, broken packaging, smell, wrong temperature, customer rejected, and other.
- Return supplier stock requires staff request, department manager approval, then stock deduction.
- Stock take sessions are created by department managers/admin for one location and one item+brand scope.
- Staff can scan/count barcode stock for the scoped stock take session.
- While a stock take is open, inbound/outbound/transfer/return actions are blocked only for the selected item+brand in that location.
- Stock take counting is barcode scanning only.
- Stock take adjustment needs department manager approval first, then director final approval.
- Manager and director electronic signatures are required for stock take review/final approval.
- Stock take adjustments happen only after both approval steps.
- At director final approval, expected in-stock/returned barcode units in the selected item+brand+location are compared with scanned barcodes. Missing barcodes are recorded as stock-take variance and adjusted out only after approval.
- Stock reports group stock by item, brand, location, and inbound age.
- Stock reports include stock balance, stock take variance, damage/spoilage, and return-supplier summaries.
- Damage/spoilage and return-supplier report rows should include linked barcode stock-unit weight when available.
- Stock reports support CSV export, print/PDF-ready view, and WhatsApp-ready summary text.
- Stock dashboard KPIs include total stock weight, barcode units, today inbound, today outbound, pending transfers, legacy no-barcode visibility, stock-take variance, negative-stock alerts, and stock-age alerts.
- Stock dashboard shortcuts link stock operators/admins to inbound, outbound, transfer, receive-transfer, and return workflows. Director/view-only users should not see routine operation shortcuts.

### Barcode Rules

- Barcode weight rules differ by item, brand, and origin.
- Brand and origin are selected from dropdown lists, with Other/custom entry allowed during inbound.
- Weight is normally encoded in kilograms.
- GS1 AI `3102` means kilograms with 2 decimals.
- GS1 AI `3103` means kilograms with 3 decimals.
- Some barcode formats do not include `3102` or `3103`; saved position rules are used for those.
- Position rules support 1, 2, or 3 decimals.
- Some items use fixed weight; fixed-weight fallback requires manual confirmation.
- If barcode weight cannot be decoded confidently, staff must see a clear error and manually confirm weight before saving.
- Internal generated barcode labels are numeric only and are based on date, numeric item code, weight in grams, and a serial number. The barcode itself does not include `KG` text.
- Internal generated barcode labels must skip existing stock-unit barcodes and labels generated during the current inbound session before printing.
- Thermal label output is 50mm x 30mm with company name, product name, weight, and barcode. Browser print/export is used to save labels as PDF, one label per page.
- Historical barcode labels can be reprinted from the stock-unit detail page.
- Stock-unit detail history should include movements linked by stock unit id or barcode so older incomplete movement rows remain auditable.

### Orders

- Customer orders support pickup, delivery, and internal transfer.
- Order statuses include `NEW`, `PREPARING`, `READY`, `READY_FOR_PICKUP`, `READY_FOR_DELIVERY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED`, and `CANCELLED`.
- Order items store requested quantity/weight and prepared quantity/weight.
- Prepared items record `prepared_by` and preparation logs.
- Stock is reserved only when picking/preparation starts, not when the order is created or when an order item is added.
- After stock is reserved, staff cannot freely edit the order. Cancel and recreate if changes are needed.
- Partial delivery is not allowed for MVP.
- If the customer cancels after reservation, keep stock reserved until staff manually releases it.
- Manual reservation release is allowed only after the order is `CANCELLED`; cancellation must not automatically free reserved stock.
- Orders cannot be marked ready until all items are prepared.
- Overdue credit customer warning is informational only; it should not hard block order entry.
- WhatsApp notification placeholder events exist for ready/out-for-delivery/delivered.

### Outbound

- Outbound supports order-based and direct stock movement batches.
- A ready customer order must be selected before order-based outbound confirmation.
- Outbound types are `SALES`, `TRANSFER`, `PROCESSING`, `DAMAGE`/`SPOILED`, and `RETURN_SUPPLIER`.
- Direct outbound is allowed for `SALES`, `TRANSFER`, and `PROCESSING` stock movement.
- Damage/spoilage and supplier-return stock deduction must use their review/approval workflows instead of direct outbound.
- Outbound scanning is batch-first: staff scan multiple barcodes continuously, then confirm the outbound batch.
- Scans are batched into outbound batch and batch-line records.
- Order outbound may scan different/substituted items under the same order. The original ordered item remains on the order item line and the scanned/substituted item is recorded on the outbound batch line.
- If scanned order-outbound quantity or weight differs from requested quantity or weight, show a warning but allow staff to continue.
- Atomic RPCs block duplicate lines, missing barcodes, already-outbounded barcodes, wrong-status barcodes, wrong-location barcodes, invalid transfer destination, and non-ready orders for order-based outbound.
- Outbound batch UI should pre-block transfer scans where the selected destination is the same as the barcode unit's current location.
- Transfer outbound sets `TRANSFER_PENDING`; receive-transfer later changes location.
- Transfer and receive-transfer update the barcode unit, movement row, scan log, and audit log atomically through database RPCs.
- Transfers still pending after 3 days show an overdue receive alert.
- Transfer cannot be cancelled after scanned out.

### Processing

- Processing batches record raw item, finished item, weights, quantity, worker, department, yield, loss, and review status.
- Raw loose stock is consumed from the assigned stock location.
- Finished goods do not enter stock automatically; barcode inbound is required after packing.
- Yield/loss thresholds exist on item master.
- Yield below 85% shows an abnormal yield alert by default.
- Abnormal yield is alert-only; no approval is required.
- Target processing model is multiple raw items from multiple batches/barcodes to multiple finished items, with finished products generating new barcodes.

### Delivery

- Delivery orders track customer location, address, vehicle, driver, status, payment type/status, source, proof photo path, and driver location.
- Delivery statuses are Pending, Out for Delivery, Delivered, Failed, and Cancelled.
- Any staff with delivery access can update delivery status.
- Proof file must be an image and must include receiver name and GPS location.
- When proof is uploaded successfully, delivery is automatically marked `DELIVERED`.
- After successful customer-order delivery, customer latitude/longitude is updated from delivery GPS when the order is linked to a customer.
- Failed delivery proof is uploaded through the proof workflow, not a plain status update. It requires image proof, receiver/contact name, and GPS.
- Failed customer-order delivery returns linked barcode stock from sales outbound batches back to `IN_STOCK`, writes `RETURN` stock movements and scan logs, and records failed-return status on the order.
- Failed standalone delivery has no order-stock linkage in MVP, so it is marked `NO_STOCK_LINK` and requires manual stock follow-up.
- Failed delivery must not release or delete active stock reservations silently.
- Driver can record payment collection by cash, bank transfer, or e-wallet.
- Orders-module delivery handoff is supported for `READY_FOR_DELIVERY` customer orders.

### Retail

- Retail supports sales, sale lines, payments, cash sessions, daily sales, daily closings, expenses, price rules, cleaning, and processing surfaces.
- Retail operators are restricted to same-day sales/cash edits.
- Daily closings and outlet expenses require a different checker/approver than the submitter.
- Payment types are admin-configurable.

### Pricing / Customers

- Customer categories are Retail, Wholesale, and VIP for the current business direction.
- Existing legacy categories should not be destructively deleted without a migration/data cleanup plan.
- Staff can override price only when an override reason is recorded.
- No delivery fee is charged for now.
- Credit terms are COD, 7 days, 14 days, and 30 days.
- Aging buckets should follow AutoCount-style buckets.

### Attendance

- Attendance supports work locations, 50m GPS radius, department start/end rules, 5-minute late grace, clock-in/out, no-clock-out, and approved leave sync.

### OA Actions

- Advance: staff -> admin review -> director approve/reject -> account pay.
- Claim: staff -> department manager review -> admin review -> director approve/reject -> account pay.
- Leave: staff -> department manager approve/reject.
- Payslip: account/admin upload, staff own view, director all view.

### Finance / Director

- Finance supports AR/AP invoice metadata, aging, review, approval, payment, and container tracking.
- Finance and aging reports are for director and account staff only.
- Director has dashboard, approvals, reports, print/PDF-ready output, WhatsApp-ready summary, and CSV where available.

### Cleaning

- Cleaning frequencies are daily, weekly, monthly, and quarterly.
- Cleaning photo upload is not required for MVP.
- Late cleaning counts as late, not completed on time.

### Upload / Storage

- MVP upload types are delivery proof and import documents.
- Receipts and stock photos are later-phase uploads.

## What Is Missing

- Manual confirmation that every role/scope rule holds with real Supabase Auth users.
- Multi-outlet/multi-location staff access model.
- Real Supabase QA evidence for manager then director stock-take adjustment approval.
- Real Supabase QA evidence for director-approved damaged/spoiled stock deduction.
- Manual reservation release when customer cancels after picking starts.
- Overdue credit warning display during order entry.
- Real-world pricing application from customer price rules into all order/retail line calculations.
- Staff price override reason enforcement.
- AutoCount-format aging buckets.
- Full multiple-raw to multiple-finished processing model.
- Finished-product barcode generation from processing output.
- Failed-delivery return workflow for standalone deliveries and loose/no-barcode stock links.
- Real WhatsApp integration.
- Import document upload workflow and storage verification.
- Full leave balance workflow automation.
- Full automated regression tests for business rules.

## Risky Logic

- Delivery has both standalone delivery orders and customer-order delivery handoff. Mixing these records can create status confusion.
- Some early migrations establish broad policies or old helper names that are hardened later; running migrations out of order is risky.
- Frontend route hiding must not be treated as the only permission layer.
- Director is intended to view/approve, but some older helper functions may include director until later migrations override them.
- Status transitions are spread between server actions, RLS policies, and database triggers/functions.
- Demo mode may hide real permission problems because it returns an admin/director-like profile.

## Recommended Next Tasks

1. Execute the manual QA checklist with real users and capture evidence.
2. Add tests for the high-risk state transitions listed above.
3. Verify migration order on a fresh Supabase project.
4. Confirm all file upload buckets and policies before using real customer/business files.
5. After workflow validation, wire customer price rules into line-level pricing calculations.
