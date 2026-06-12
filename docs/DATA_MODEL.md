# Data Model

## What Already Exists

The database is defined through Supabase SQL migrations in `supabase/migrations`. The current migration sequence runs from `202606100001_erp_core_stock_v1.sql` through `202606100036_failed_delivery_return_workflow_v1.sql`.

## Core Tables By Area

### Identity, Scope, And Audit

- `roles`
- `profiles`
- `profile_roles`
- `departments`
- `branches`
- `outlets`
- `outlet_module_access`
- `files`
- `audit_logs`

These tables support Auth profile mapping, role assignment, branch/outlet/department scope, module access, shared file metadata, and audit history.

### Stock / Inventory

- `items`
- `brands`
- `origins`
- `stock_locations`
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

Stock uses barcode units for individually scanned stock and no-barcode tables for loose stock. Movements and scan logs are the audit trail. Outbound batches group scanned barcodes against customer orders.

Temporary negative stock alerts are derived in the application data layer from `no_barcode_stock` and combined balance rows. No extra table is required for the current alert surface.

Stock age alerts are derived in the application data layer from `stock_units.received_at` for stockable barcode units. No extra table is required for the current 6-month and 12-month alert surface.

### Customers, Orders, And Pricing

- `customer_categories`
- `customers`
- `customer_price_rules`
- `customer_orders`
- `customer_order_items`
- `order_stock_reservations`
- `order_preparation_logs`
- `order_notification_events`

Orders hold customer requests, preparation progress, picking-time order reservation rows, and placeholder notification events for future WhatsApp integration. Reservations are created when picking/preparation starts, not when the order or order item is created. Customer-order delivery proof GPS can update `customers.latitude` and `customers.longitude` after successful proof upload when the customer order is linked to a customer row. Migration `202606100036_failed_delivery_return_workflow_v1.sql` adds failed-delivery return tracking fields to `customer_orders`: `failed_return_status`, `failed_return_required_units`, `failed_return_completed_units`, and `failed_return_logged_at`.

### Delivery

- `vehicles`
- `delivery_orders`
- `delivery_order_items`
- `delivery_status_logs`
- `driver_locations`
- `delivery_payments`

Delivery supports standalone delivery orders plus handoff from customer orders at the application/action level. Migration `202606100035_part2_delivery_proof_metadata_v1.sql` adds proof receiver name, proof GPS latitude/longitude, and proof upload timestamp fields to `delivery_orders` and `customer_orders`. Migration `202606100036_failed_delivery_return_workflow_v1.sql` adds the same failed-return tracking fields to `delivery_orders`; standalone deliveries currently use `NO_STOCK_LINK` because they do not link to order outbound barcode lines.

### Attendance

- `work_locations`
- `attendance_rules`
- `attendance_logs`
- `attendance_daily_summary`

Attendance combines GPS work locations, department timing rules, raw clock events, and daily summaries.

### OA Actions

- `advance_requests`
- `claim_requests`
- `leave_requests`
- `payslips`
- `approval_logs`
- `erp_claim_categories`
- `erp_leave_types`
- `leave_balances`

OA stores staff requests, review/payment state, payslip metadata, approval timelines, configurable categories/types, and leave balances.

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

Retail currently includes sales/cash/payment/expense workflows plus processing and cleaning records under the retail migration set.

### Finance And Director

- `finance_invoices`
- `finance_containers`
- `director_report_snapshots`

Finance covers AR/AP invoices, containers/import tracking, aging, review/approval/payment status, and director report snapshots.

## Important Relationships

- `profiles` link to `outlets`, `departments`, and `stock_locations`.
- Staff may need multiple outlet/location access in production; the current `profiles` table stores one primary outlet, department, and stock location, so a future access-scope join table is needed for true multi-scope users.
- `profile_roles` links profiles to `roles`.
- `outlet_module_access` links outlets to enabled module keys.
- `stock_units` link item/brand/origin/location and feed stock movements/scans.
- `no_barcode_stock` is unique by item/brand/origin/location.
- `customer_orders` link to customers and scope fields.
- `customer_order_items` link to `customer_orders` and `items`.
- `order_stock_reservations` link prepared/picked order items to items and stock locations. They represent stock reserved after picking starts. Active reservations on cancelled orders are released by explicitly changing the reservation status to `RELEASED`; cancellation alone must not free stock.
- `stock_outbound_batches` link outbound scans to customer orders.
- Failed customer-order delivery proof calls `public.fail_customer_order_delivery_with_proof`, which locks the order, finds `stock_outbound_batch_lines` for `SALES`, returns linked barcode `stock_units` to `IN_STOCK`, writes `stock_movements.movement_type = 'RETURN'` with `source_type = 'return'` and `reference_no = customer_orders.id`, writes `barcode_scan_logs.action = 'RETURN'`, and updates the order failed-return counters. The RPC does not release or delete active reservations.
- `delivery_orders` can reference operational source data; customer-order delivery handoff is handled through customer order status/actions.
- `approval_logs` references OA requests by request type/id rather than one shared parent table.
- `finance_containers` can link to finance invoices.

## What Is Missing

- A generated entity relationship diagram.
- Database-level tests proving every RLS policy for every role.
- A normalized multi-outlet/multi-location staff access table.
- Real Supabase QA evidence for manual reservation release after customer cancellations.
- A manager-then-director approval model for stock-take adjustment.
- A director approval model for damaged/spoiled stock deduction.
- A single normalized production planning model separate from retail processing batches.
- Processing line tables for multiple raw items from multiple batches/barcodes and multiple finished outputs.
- Finished-product barcode generation from processing output.
- A dedicated customer order delivery table; delivery handoff currently reuses `customer_orders` fields/status.
- Full file object lifecycle details for Supabase Storage buckets.
- Strong automated validation for pricing rule precedence.
- Price override reason fields/workflow enforcement.
- AutoCount-format aging bucket schema or shared reporting helper.
- Failed-delivery return support for standalone deliveries and no-barcode/loose stock links.

## Risky Logic

- RLS policies are distributed across many migrations. A fresh project must apply all migrations in order.
- Some tables have broad read policies in early migrations that are later replaced with scoped policies.
- Several status workflows depend on server actions and RLS working together.
- `order_stock_reservations` now represents prepared/picked quantity or weight. It still does not by itself lock specific barcode units until outbound scan.
- Failed-delivery return currently uses barcode outbound lines as the source of truth. If a failed order used loose/no-barcode stock or a standalone delivery with no order outbound linkage, the system records `NO_STOCK_LINK` and requires manual stock follow-up.
- Migration `202606100033_order_item_reservation_rpc_v1.sql` created an add-item reservation RPC that is superseded by `202606100034_order_reservation_on_picking_v1.sql`; fresh projects must run both in order so the old RPC is dropped.
- Retail processing and general processing concepts are currently close together; future production planning may require a clearer domain split.
- File metadata may exist without confirmed Storage object access.

## Recommended Next Tasks

1. Generate an ERD from a fresh migrated Supabase schema.
2. Add RLS verification scripts using seeded Auth users.
3. Document status transitions per table with allowed actors.
4. Add a pricing precedence document before expanding customer/category-specific price automation.
5. Decide whether processing should remain in retail tables or move to a dedicated production-planning schema.
