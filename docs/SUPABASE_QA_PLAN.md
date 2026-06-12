# Supabase Production-Readiness QA Plan

Last updated: 2026-06-12

## Purpose

This plan prepares real Supabase QA for Auth, RLS, Storage, picking-time order reservation RPCs, delivery proof enforcement, and barcode camera testing. It does not require production credentials and should be run first on a fresh Supabase staging project.

## Source Files Reviewed

- `AGENTS.md`
- `HANDOFF.md`
- `docs/BUSINESS_RULES.md`
- `docs/DATA_MODEL.md`
- `docs/MODULE_STATUS.md`
- `supabase/migrations/*.sql`
- `supabase/seed.sql`
- Upload and workflow actions in `lib/delivery/actions.ts`, `lib/orders/actions.ts`, `lib/oa-actions/actions.ts`, `lib/finance/actions.ts`, and `lib/stock/actions.ts`
- Barcode scanner implementation in `components/stock/barcode-scanner.tsx`

## Migration And Seed Baseline

Run migrations in filename order from:

1. `supabase/migrations/202606100001_erp_core_stock_v1.sql`
2. Continue every migration in filename order.
3. End with `supabase/migrations/202606100034_order_reservation_on_picking_v1.sql`.
4. Run `supabase/seed.sql` after migrations if demo QA data is needed.

Do not skip later hardening migrations. Some early policies are intentionally tightened by later migrations.

## Roles

The ERP uses these roles:

| Role | QA purpose |
| --- | --- |
| `retail_team_general_worker` | Retail entry, same-day retail work, scoped stock/order operations where module access allows |
| `retail_manager` | Retail team management, retail closing/expense review, scoped retail/cleaning work |
| `delivery_team_general_worker` | Driver/delivery progress, location, proof upload, customer-order delivery status |
| `delivery_manager` | Delivery order/vehicle/team management and delivery review |
| `processing_team_general_worker` | Processing entry and scoped stock/order preparation |
| `processing_manager` | Processing review and scoped processing/cleaning management |
| `account` | Finance invoice entry/payment, OA payment, payslip upload |
| `admin` | Global configuration, admin review, protected operational management |
| `director` | Global view and approval, not routine operational entry |

## Seeded Scopes

### Outlets

- `JALAN CHANNEL`
- `SUNGAI MERAH`
- `WONDERFUL`
- `SUNGAI MAAW`
- `DIRECTOR`

### Departments

- `Retail`
- `Delivery`
- `Processing`
- `Stock`
- `Accounting`
- `Admin`
- `Management`

### Stock Locations

- `JALAN CHANNEL`
- `SUNGAI MERAH`
- `WONDERFUL`
- `SUNGAI MAAW`
- `DIRECTOR`

### Seeded Outlet Module Access

| Outlet | Enabled modules |
| --- | --- |
| `JALAN CHANNEL` | `stock`, `orders`, `retail`, `processing`, `attendance`, `cleaning`, `oa_actions` |
| `SUNGAI MERAH` | `stock`, `orders`, `retail`, `delivery`, `attendance`, `cleaning`, `oa_actions` |
| `WONDERFUL` | `stock`, `orders`, `processing`, `attendance`, `cleaning`, `oa_actions` |
| `SUNGAI MAAW` | `retail`, `orders`, `delivery`, `attendance`, `cleaning`, `oa_actions` |
| `DIRECTOR` | No seeded outlet-module rows; admin/director global access should bypass normal outlet gating where intended |

## Test User Matrix

Create Auth users manually in Supabase Auth. For each user, create a matching `profiles` row where `profiles.id = auth.users.id`, then assign exactly one intended role in `profile_roles`.

Use a predictable password only in staging, for example `ChangeMe-QA-2026!`. Do not create these users in production until the matrix is approved.

### Operational Role / Scope Matrix

Create one Auth user for every row below. This covers each non-global business role against each operational outlet and stock-location scope. Some rows are expected to be denied by `outlet_module_access`; those denial rows are intentional and must be tested, not skipped.

| Email | Role | Outlet | Department | Stock location | Expected module result |
| --- | --- | --- | --- | --- | --- |
| `qa.retail.worker.jc@example.test` | `retail_team_general_worker` | `JALAN CHANNEL` | `Retail` | `JALAN CHANNEL` | Retail/orders/stock allowed |
| `qa.retail.worker.sm@example.test` | `retail_team_general_worker` | `SUNGAI MERAH` | `Retail` | `SUNGAI MERAH` | Retail/orders/stock allowed |
| `qa.retail.worker.wf@example.test` | `retail_team_general_worker` | `WONDERFUL` | `Retail` | `WONDERFUL` | Orders/stock allowed; retail denied |
| `qa.retail.worker.smaaw@example.test` | `retail_team_general_worker` | `SUNGAI MAAW` | `Retail` | `SUNGAI MAAW` | Retail/orders allowed; stock denied |
| `qa.retail.manager.jc@example.test` | `retail_manager` | `JALAN CHANNEL` | `Retail` | `JALAN CHANNEL` | Retail manager actions allowed in scope |
| `qa.retail.manager.sm@example.test` | `retail_manager` | `SUNGAI MERAH` | `Retail` | `SUNGAI MERAH` | Retail manager actions allowed in scope |
| `qa.retail.manager.wf@example.test` | `retail_manager` | `WONDERFUL` | `Retail` | `WONDERFUL` | Retail denied; cleaning/orders checked by scope |
| `qa.retail.manager.smaaw@example.test` | `retail_manager` | `SUNGAI MAAW` | `Retail` | `SUNGAI MAAW` | Retail manager actions allowed in scope |
| `qa.delivery.worker.jc@example.test` | `delivery_team_general_worker` | `JALAN CHANNEL` | `Delivery` | `JALAN CHANNEL` | Delivery denied |
| `qa.delivery.worker.sm@example.test` | `delivery_team_general_worker` | `SUNGAI MERAH` | `Delivery` | `SUNGAI MERAH` | Delivery allowed in scope |
| `qa.delivery.worker.wf@example.test` | `delivery_team_general_worker` | `WONDERFUL` | `Delivery` | `WONDERFUL` | Delivery denied |
| `qa.delivery.worker.smaaw@example.test` | `delivery_team_general_worker` | `SUNGAI MAAW` | `Delivery` | `SUNGAI MAAW` | Delivery allowed in scope |
| `qa.delivery.manager.jc@example.test` | `delivery_manager` | `JALAN CHANNEL` | `Delivery` | `JALAN CHANNEL` | Delivery denied |
| `qa.delivery.manager.sm@example.test` | `delivery_manager` | `SUNGAI MERAH` | `Delivery` | `SUNGAI MERAH` | Delivery manager actions allowed in scope |
| `qa.delivery.manager.wf@example.test` | `delivery_manager` | `WONDERFUL` | `Delivery` | `WONDERFUL` | Delivery denied |
| `qa.delivery.manager.smaaw@example.test` | `delivery_manager` | `SUNGAI MAAW` | `Delivery` | `SUNGAI MAAW` | Delivery manager actions allowed in scope |
| `qa.processing.worker.jc@example.test` | `processing_team_general_worker` | `JALAN CHANNEL` | `Processing` | `JALAN CHANNEL` | Processing/orders/stock allowed |
| `qa.processing.worker.sm@example.test` | `processing_team_general_worker` | `SUNGAI MERAH` | `Processing` | `SUNGAI MERAH` | Processing denied; orders/stock allowed |
| `qa.processing.worker.wf@example.test` | `processing_team_general_worker` | `WONDERFUL` | `Processing` | `WONDERFUL` | Processing/orders/stock allowed |
| `qa.processing.worker.smaaw@example.test` | `processing_team_general_worker` | `SUNGAI MAAW` | `Processing` | `SUNGAI MAAW` | Processing/stock denied; orders allowed |
| `qa.processing.manager.jc@example.test` | `processing_manager` | `JALAN CHANNEL` | `Processing` | `JALAN CHANNEL` | Processing manager actions allowed in scope |
| `qa.processing.manager.sm@example.test` | `processing_manager` | `SUNGAI MERAH` | `Processing` | `SUNGAI MERAH` | Processing denied |
| `qa.processing.manager.wf@example.test` | `processing_manager` | `WONDERFUL` | `Processing` | `WONDERFUL` | Processing manager actions allowed in scope |
| `qa.processing.manager.smaaw@example.test` | `processing_manager` | `SUNGAI MAAW` | `Processing` | `SUNGAI MAAW` | Processing/stock denied |
| `qa.account.jc@example.test` | `account` | `JALAN CHANNEL` | `Accounting` | `JALAN CHANNEL` | Finance/OA payment checks; no retail/delivery/processing operator access |
| `qa.account.sm@example.test` | `account` | `SUNGAI MERAH` | `Accounting` | `SUNGAI MERAH` | Finance/OA payment checks; no retail/delivery/processing operator access |
| `qa.account.wf@example.test` | `account` | `WONDERFUL` | `Accounting` | `WONDERFUL` | Finance/OA payment checks; no retail/delivery/processing operator access |
| `qa.account.smaaw@example.test` | `account` | `SUNGAI MAAW` | `Accounting` | `SUNGAI MAAW` | Finance/OA payment checks; no retail/delivery/processing operator access |

### Global Control Users

These users verify global or approval behavior and should be kept separate from operational users.

| Email | Role | Outlet | Department | Stock location | Expected result |
| --- | --- | --- | --- | --- | --- |
| `qa.account.global@example.test` | `account` | `DIRECTOR` | `Accounting` | `DIRECTOR` | Finance invoice entry/payment, OA payment, payslip upload |
| `qa.admin@example.test` | `admin` | `DIRECTOR` | `Admin` | `DIRECTOR` | Global settings, user/scope management, admin review, protected management |
| `qa.director@example.test` | `director` | `DIRECTOR` | `Management` | `DIRECTOR` | Global dashboards/reports/approvals; routine operational entry denied where intended |

### Cross-Scope Denial Pairs

Use these pairs for every RLS table listed below. User A should be allowed to read/write only their own scope; User B should receive zero rows or an RLS/action error for User A's data.

| Workflow area | User A | User B | Denial target |
| --- | --- | --- | --- |
| Retail | `qa.retail.worker.jc@example.test` | `qa.retail.worker.sm@example.test` | JC sales, cash, closing, expenses, customers |
| Stock | `qa.processing.worker.jc@example.test` | `qa.processing.worker.wf@example.test` | JC stock units, movements, no-barcode rows, scan logs |
| Orders | `qa.retail.worker.jc@example.test` | `qa.retail.worker.sm@example.test` | JC customer orders, order items, reservations, prep logs |
| Delivery | `qa.delivery.worker.sm@example.test` | `qa.delivery.worker.smaaw@example.test` | Sungai Merah delivery orders, driver locations, proof metadata |
| Processing | `qa.processing.worker.jc@example.test` | `qa.processing.worker.wf@example.test` | JC processing batches and review actions |
| Attendance | `qa.retail.worker.jc@example.test` | `qa.retail.worker.sm@example.test` | JC attendance logs and daily summary rows |
| OA | `qa.retail.worker.jc@example.test` | `qa.processing.manager.wf@example.test` | JC personal requests and department review scope |
| Finance | `qa.account.global@example.test` | `qa.retail.worker.jc@example.test` | Finance invoices, containers, aging/payment actions |

## RLS Tables To Verify

### Identity, Scope, And Audit

- `departments`
- `branches`
- `outlets`
- `profiles`
- `roles`
- `profile_roles`
- `outlet_module_access`
- `files`
- `audit_logs`

### Stock

- `brands`
- `origins`
- `stock_locations`
- `items`
- `stock_units`
- `stock_movements`
- `barcode_scan_logs`
- `barcode_weight_rules`
- `no_barcode_stock`
- `no_barcode_movements`
- `stock_take_sessions`
- `stock_take_lines`
- `stock_reports`
- `stock_outbound_batches`
- `stock_outbound_batch_lines`

### Customers, Orders, And Pricing

- `customer_categories`
- `customers`
- `customer_price_rules`
- `customer_orders`
- `customer_order_items`
- `order_stock_reservations`
- `order_preparation_logs`
- `order_notification_events`

### Delivery

- `vehicles`
- `delivery_orders`
- `delivery_order_items`
- `delivery_status_logs`
- `driver_locations`
- `delivery_payments`

### Attendance

- `work_locations`
- `attendance_rules`
- `attendance_logs`
- `attendance_daily_summary`

### OA Actions

- `erp_claim_categories`
- `erp_leave_types`
- `advance_requests`
- `claim_requests`
- `leave_requests`
- `leave_balances`
- `payslips`
- `approval_logs`

### Retail, Cleaning, And Processing

- `retail_payment_types`
- `retail_registers`
- `retail_cash_sessions`
- `retail_sales`
- `retail_sale_lines`
- `retail_payments`
- `retail_price_rules`
- `retail_daily_sales`
- `retail_daily_closings`
- `retail_processing_batches`
- `retail_cleaning_tasks`
- `retail_expenses`

### Finance And Director

- `finance_invoices`
- `finance_containers`
- `director_report_snapshots`

## Auth Users Checklist

- [ ] Create every QA Auth user listed in the operational role/scope matrix.
- [ ] Create every QA Auth user listed in the global control users table.
- [ ] Confirm each `profiles.id` equals the Supabase Auth user ID.
- [ ] Confirm each profile has exactly the intended `outlet_id`, `department_id`, and `stock_location_id`.
- [ ] Confirm each user has exactly the intended `profile_roles` rows.
- [ ] Confirm the Supabase Auth trigger creates a profile automatically, or manually repair profile rows before assigning roles.
- [ ] Confirm admin has all settings access.
- [ ] Confirm director has dashboard/report/approval access but not routine operational entry.
- [ ] Confirm non-admin users see `Viewing: Outlet / Department / Team` scope text.
- [ ] Confirm disabled outlet module access hides/blocks affected modules.
- [ ] Confirm all cross-scope denial pairs return zero rows or an RLS/action error for out-of-scope data.

## RLS Allowed Checklist

- [ ] Retail worker in `JALAN CHANNEL` can read and create same-day retail records for `JALAN CHANNEL`.
- [ ] Retail worker in `SUNGAI MERAH` can read and create same-day retail records for `SUNGAI MERAH`.
- [ ] Retail manager can approve scoped retail daily closing/expense workflows.
- [ ] Delivery worker in `SUNGAI MERAH` can read scoped delivery orders and update driver progress/proof.
- [ ] Delivery worker in `SUNGAI MAAW` can read scoped delivery orders and update driver progress/proof.
- [ ] Processing worker in `JALAN CHANNEL` can create scoped processing batches.
- [ ] Processing worker in `WONDERFUL` can create scoped processing batches.
- [ ] Processing manager can review scoped processing batches.
- [ ] Stock-capable scoped user can read own-location stock units and movements.
- [ ] Stock-capable scoped user can scan inbound/outbound/transfer/return/stock-take only for own location.
- [ ] Customer order operator can create orders in their scoped outlet.
- [ ] Customer order operator can add an order item without creating an `order_stock_reservations` row.
- [ ] Customer order operator can start picking/preparation and the RPC creates a matching `order_stock_reservations` row.
- [ ] Account can upload AR/AP invoice files and enter manual fields.
- [ ] Account can mark director-approved OA/finance items paid.
- [ ] Admin can manage settings, users, roles, outlet modules, configurable lists, and protected records.
- [ ] Director can read global dashboards/reports and approve protected workflows.

## RLS Denied Checklist

- [ ] Retail worker cannot read or edit another outlet's retail sales, cash sessions, closing, expenses, or customers.
- [ ] Retail worker cannot edit past-day retail sales/cash records.
- [ ] Delivery worker cannot read or update another delivery outlet/team's delivery orders.
- [ ] Delivery role cannot create or prepare general customer orders.
- [ ] Processing worker cannot read or review another processing outlet/department's processing records.
- [ ] Scoped stock user cannot read or mutate another stock location's operational stock rows.
- [ ] Normal stock operator cannot delete `items`, `stock_units`, `stock_movements`, `no_barcode_stock`, `no_barcode_movements`, `stock_take_sessions`, `stock_take_lines`, or `stock_reports`.
- [ ] Stock operator cannot approve/reject submitted stock take.
- [ ] Director cannot run routine stock inbound/outbound/transfer/receive/return/no-barcode workflows.
- [ ] Account cannot admin-review an advance, claim, or finance invoice.
- [ ] Account cannot director-approve an OA or finance workflow.
- [ ] Staff cannot see another staff member's payslip.
- [ ] Non-admin cannot update `profiles`, `profile_roles`, `outlet_module_access`, customer categories, customer price rules, claim categories, leave types, or barcode rules.
- [ ] Negative users in module-disabled outlets are blocked from the disabled module routes and server actions.

## Storage Upload Workflows

Storage bucket:

- Bucket: `erp-files`
- Private bucket: `public = false`
- Size limit: 50 MB
- Current `storage.objects` policies allow authenticated read and authenticated upload to `erp-files`.

Metadata table:

- `public.files`
- Key fields: `bucket_id`, `object_path`, `module`, `mime_type`, `size_bytes`, `owner_id`

### MVP Workflows Requiring Storage QA

| Workflow | Action | Object path pattern | Accepted file types |
| --- | --- | --- | --- |
| Standalone delivery proof | `uploadProofOfDeliveryAction` | `delivery/proof/{delivery_order_id}/{timestamp}-{name}` | `image/*` only |
| Customer-order delivery proof | `uploadCustomerOrderProofAction` | `orders/proof/{customer_order_id}/{timestamp}-{name}` | `image/*` only |
| Finance invoice upload | `createFinanceInvoiceAction` | `finance/invoices/{profile_id}/{timestamp}-{name}` | `application/pdf` or `image/*` |

Finance invoice upload is the current import-document proxy for MVP import/container documents. Receipts and stock photos are later-phase uploads. Retail expense currently stores `receipt_url` as a text path, not a real Storage upload. Processing currently has no proof/upload workflow found in the reviewed code.

## Storage Checklist

- [ ] Confirm `erp-files` bucket exists, is private, and has 50 MB limit.
- [ ] Confirm authenticated users can upload valid files through each app workflow.
- [ ] Confirm unauthenticated users cannot upload to `erp-files`.
- [ ] Confirm uploaded object exists in `storage.objects`.
- [ ] Confirm matching row exists in `public.files`.
- [ ] Confirm `owner_id`, `module`, `bucket_id`, `object_path`, `mime_type`, and `size_bytes` are correct.
- [ ] Confirm delivery proof rejects non-image files.
- [ ] Confirm customer-order proof rejects non-image files.
- [ ] Confirm finance invoice rejects non-PDF/non-image files.
- [ ] Confirm import/container documents use the finance invoice/import document path for MVP.
- [ ] Confirm receipts and stock photos are not treated as required MVP uploads.
- [ ] Confirm uploaded files cannot be overwritten when `upsert: false`.
- [ ] Confirm another authenticated user cannot update/delete someone else's `public.files` metadata unless allowed by policy.
- [ ] Decide whether broad authenticated Storage read/upload is acceptable before production; if not, implement stricter object-path policies in a later task.

## Delivery Proof Upload Checklist

- [ ] Standalone delivery proof upload accepts a valid `image/*` file for an in-scope delivery user.
- [ ] Standalone delivery proof upload rejects PDF, text, and other non-image files.
- [ ] Standalone delivery proof upload creates an object under `delivery/proof/{delivery_order_id}/`.
- [ ] Standalone delivery proof upload creates a matching `public.files` row with `module = 'delivery'`.
- [ ] Customer-order proof upload accepts a valid `image/*` file for an in-scope delivery user.
- [ ] Customer-order proof upload rejects PDF, text, and other non-image files.
- [ ] Customer-order proof upload creates an object under `orders/proof/{customer_order_id}/`.
- [ ] Customer-order proof upload creates a matching `public.files` row with `module = 'orders'`.
- [ ] Out-of-scope delivery user cannot upload proof for another outlet/team's standalone delivery.
- [ ] Out-of-scope delivery user cannot upload proof for another outlet/team's customer-order delivery.

## Delivery Completion Proof Enforcement Checklist

- [ ] Standalone delivery cannot become `DELIVERED` without `proof_file_id`.
- [ ] Standalone delivery cannot become `FAILED` without `proof_file_id`.
- [ ] Customer-order delivery cannot become `DELIVERED` without `proof_file_id`.
- [ ] Customer-order delivery cannot become `FAILED` without `proof_file_id`.
- [ ] Delivery proof upload is only allowed after standalone delivery is `OUT_FOR_DELIVERY`.
- [ ] Customer-order proof upload is only allowed after customer order is `OUT_FOR_DELIVERY`, `DELIVERED`, or `FAILED`.
- [ ] After uploading proof, marking `DELIVERED` succeeds for the correct scoped delivery user.
- [ ] After uploading proof, marking `FAILED` succeeds for the correct scoped delivery user.
- [ ] Out-of-scope delivery user cannot upload proof or complete another outlet/team delivery.
- [ ] Director can view proof-linked records but cannot run routine delivery proof/status actions as an operator.

## Order Reservation Creation Checklist

- [ ] Apply migrations through `202606100034_order_reservation_on_picking_v1.sql`.
- [ ] Confirm obsolete RPC is not callable: `public.add_customer_order_item_with_reservation`.
- [ ] Confirm active RPC exists: `public.prepare_customer_order_item_with_reservation`.
- [ ] Add an item to a `NEW` customer order as an allowed scoped order user.
- [ ] Confirm exactly one `customer_order_items` row is created.
- [ ] Confirm no matching `order_stock_reservations` row is created from item entry.
- [ ] Prepare/pick the order item as an allowed scoped order user.
- [ ] Confirm exactly one matching `order_stock_reservations` row is created during preparation.
- [ ] Confirm order status becomes `PREPARING`.
- [ ] Attempt to add an item after stock is reserved and confirm no item row is created.
- [ ] Attempt to prepare the same item twice and confirm no second reservation row is created.
- [ ] Attempt to add or prepare an item as an out-of-scope user and confirm no item/reservation row is created.
- [ ] Attempt to add or prepare an item with zero quantity and zero weight and confirm no item/reservation row is created.
- [ ] Confirm server action returns a staff-readable error if the RPC fails.

## Barcode Camera Device QA

Scanner component:

- `components/stock/barcode-scanner.tsx`
- Library: `@zxing/browser`
- Camera constraints prefer rear camera with `facingMode: { ideal: "environment" }`
- Manual fallback exists because every scanner field remains a normal text input

Workflows using barcode scanner fields:

- `/stock/inbound`
- `/stock/outbound`
- `/stock/transfer`
- `/stock/receive-transfer`
- `/stock/return`
- `/stock/stock-take`

### Phone Camera Checklist

- [ ] Test on Android Chrome over HTTPS or localhost tunnel.
- [ ] Test on iPhone Safari over HTTPS or localhost tunnel.
- [ ] Camera permission prompt appears when pressing `Scan Barcode`.
- [ ] Rear camera is selected where supported.
- [ ] Barcode scan fills the correct field.
- [ ] Scanner closes after a successful scan.
- [ ] Camera stream stops after scanner closes.
- [ ] Denying permission shows a clear error.
- [ ] Manual barcode entry still works after permission denial.
- [ ] Inbound duplicate barcode is blocked.
- [ ] Outbound missing barcode is blocked.
- [ ] Outbound already-sold/outbounded barcode is blocked.
- [ ] Transfer receive changes location only after receive-transfer scan.
- [ ] Return scan changes stock back to `IN_STOCK`.
- [ ] Stock take wrong-location barcode is blocked.

### Laptop Camera Checklist

- [ ] Test on Chrome desktop using built-in camera.
- [ ] Test on Edge desktop if the business uses Windows laptops.
- [ ] Camera permission prompt appears.
- [ ] Barcode can be scanned from printed label and from another screen.
- [ ] Scanner modal fits laptop viewport.
- [ ] Manual entry works when camera cannot focus.
- [ ] Closing scanner stops camera indicator.
- [ ] Reopening scanner starts camera again without page refresh.

## Processing Upload Checklist

- [ ] Confirm no processing proof/upload feature exists in current code.
- [ ] Confirm processing batch entry/review works without file upload.
- [ ] If production requires processing proof photos later, add a separate feature and Storage policy task.

## Minimum QA Execution Order

1. Create a fresh Supabase staging project.
2. Apply all migrations in filename order through `202606100034`.
3. Run `supabase/seed.sql`.
4. Create Auth users and profiles from the test matrix.
5. Verify login and module sidebar visibility for every user.
6. Run RLS allowed checks.
7. Run RLS denied checks.
8. Run Storage upload checks.
9. Run delivery proof enforcement checks.
10. Run order reservation RPC checks.
11. Run phone barcode camera checks.
12. Run laptop barcode camera checks.
13. Record failures with user, role, outlet, department, stock location, route/action, expected result, actual result, and timestamp.

## Production Readiness Exit Criteria

- [ ] Every required QA user can sign in.
- [ ] Every positive RLS check passes.
- [ ] Every denied RLS check is blocked by server action, RLS, or both.
- [ ] No normal user can see another outlet/team/location's operational data.
- [ ] All required uploads create both Storage objects and `files` metadata rows.
- [ ] Delivery completion is blocked without proof in both standalone and customer-order paths.
- [ ] Order item entry does not reserve stock.
- [ ] Picking/preparation and stock reservation are atomic through the RPC.
- [ ] Barcode scanning works on at least one Android or iPhone and one Windows laptop.
- [ ] Manual barcode fallback works on all scanner pages.
- [ ] Any accepted Storage policy risk is explicitly signed off before production.

## Next Recommended Implementation Task

After this QA plan is executed, implement an automated RLS verification script that logs in as the seeded QA Auth users and checks the allowed/denied table access cases with the Supabase anon client. Do not rely on UI-only route hiding for production security evidence.
