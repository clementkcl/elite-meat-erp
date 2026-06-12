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

- Item master supports editable `item_code`, category, section, name, barcode requirement, and active status.
- Item master create/edit is allowed for stock staff, stock manager, and admin.
- Stock inbound, outbound, and transfer are allowed for outlet staff with stock module access.
- Temporary negative stock is allowed and stock balance/dashboard/report surfaces show a clear alert when no-barcode quantity or weight goes below zero.
- Staff manually chooses batch/barcode. Do not force FIFO/FEFO yet.
- Duplicate item code and duplicate inbound barcode are blocked.
- Barcode stock is tracked in `stock_units`.
- Loose/non-barcode stock is tracked in `no_barcode_stock`.
- Inbound writes stock units, stock movements, and barcode scan logs.
- Expiry date is not required.
- Inbound date is recorded on barcode stock units and used to estimate stock age.
- Stock dashboard/report surfaces show stock age alerts above 6 months and 12 months.
- Transfers should not change stock location until receive-transfer scan.
- Returns restore stock unit status to `IN_STOCK`.
- Damaged/spoiled stock requires director approval before deduction.
- Stock take can be created/submitted by stock operators.
- Stock take adjustment needs department manager approval first, then director final approval.
- Stock take adjustments happen only after both approval steps.

### Barcode Rules

- Barcode weight rules differ by item and brand.
- Weight is normally encoded in kilograms.
- GS1 AI `3102` means kilograms with 2 decimals.
- GS1 AI `3103` means kilograms with 3 decimals.
- Some barcode formats do not include `3102` or `3103`; saved position rules are used for those.
- Position rules support 1, 2, or 3 decimals.
- Some items use fixed weight; fixed-weight fallback requires manual confirmation.
- If barcode weight cannot be decoded confidently, staff must see a clear error and manually confirm weight before saving.

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

- Outbound is order-based.
- A ready customer order must be selected before outbound confirmation.
- Scans are batched into outbound batch and batch-line records.
- Atomic RPC blocks duplicate lines, missing barcodes, invalid barcode state, wrong location, invalid transfer destination, and non-ready orders.
- Transfer outbound sets `TRANSFER_PENDING`; receive-transfer later changes location.

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
- Manager then director stock-take adjustment approval chain.
- Director approval workflow for damaged/spoiled stock deduction.
- Manual reservation release when customer cancels after picking starts.
- Overdue credit warning display during order entry.
- Real-world pricing application from customer price rules into all order/retail line calculations.
- Staff price override reason enforcement.
- AutoCount-format aging buckets.
- Full multiple-raw to multiple-finished processing model.
- Finished-product barcode generation from processing output.
- Failed-delivery return workflow for standalone deliveries and loose/no-barcode stock.
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
