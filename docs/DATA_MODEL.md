# Data Model

## What Already Exists

The database is defined through Supabase SQL migrations in `supabase/migrations`. The current migration sequence runs from `202606100001_erp_core_stock_v1.sql` through `202606100051_stock_take_approval_requires_lines_v1.sql`.

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

Stock uses barcode units for individually scanned stock. Item master identity is category plus default brand plus product section/name, while actual brand is still captured on barcode stock units, barcode rules, prices, damage/return requests, and stock-take scope. Legacy no-barcode tables remain for compatibility, but the MVP direction is to generate/print an internal numeric barcode label first whenever supplier/import stock has no usable barcode, then inbound/outbound the item as normal barcode stock. The Stock module no longer exposes a loose no-barcode inbound workflow for new stock. Movements and scan logs are the audit trail. Outbound batches group scanned barcodes against customer orders.

Migration `202606100037_stock_inbound_labels_rules_v1.sql` extends item master with `chinese_name`, `iban_name`, and `default_low_stock_level`, converts legacy non-numeric `items.item_code` values to numeric codes, and enforces numeric-only item codes. It also expands stock inbound/source values to include `customer_return`, `transfer_received`, `manual_adjustment`, and `other`.

Migration `202606100044_item_master_all_roles_v1.sql` adds `public.can_edit_item_master()` and updates `items` RLS so every ERP role can create/edit item master records when they can access the Stock module. Item deletion remains admin/director only through `public.can_administer_stock()`.

Migration `202606100045_item_master_default_brand_v1.sql` adds `items.default_brand_id`, replaces the old category/section/name uniqueness with category/default-brand/section/name uniqueness, and indexes the default brand for item master lookup.
Migration `202606100046_customer_return_inspection_status_v1.sql` adds `HOLD` and `INSPECTION` stock-unit statuses so customer returns can be kept out of sellable stock until checked.
Migration `202606100047_atomic_transfer_receive_rpcs_v1.sql` adds atomic transfer and receive-transfer RPCs so unit status/location, movement rows, scan logs, and audit logs succeed or fail together.
Migration `202606100048_atomic_stock_return_rpc_v1.sql` adds an atomic normal stock-return RPC so returning a barcode to `IN_STOCK` cannot happen without movement, scan-log, and audit-log rows.
Migration `202606100049_atomic_inspection_release_rpc_v1.sql` adds an atomic inspection-release RPC so customer-return stock cannot move from `HOLD`/`INSPECTION` to `IN_STOCK` without movement, scan-log, and audit-log rows.
Migration `202606100050_atomic_barcode_inbound_rpc_v1.sql` adds an atomic barcode inbound RPC so stock-unit creation, inbound movement, scan log, audit log, and optional global barcode weight-rule save succeed or fail together.

Migration `202606100051_stock_take_approval_requires_lines_v1.sql` updates `public.approve_stock_take_session` so director approval fails if the reviewed stock take session has no scanned barcode lines.

Migration `202606100053_stock_inbound_session_undo_v1.sql` adds `VOIDED` stock-unit status, `INBOUND_VOID` stock movement type, and `public.void_inbound_stock_unit`. The RPC voids a current-session inbound stock unit, writes a negative reversal movement, logs the scan, and writes an audit record instead of deleting the original unit or movement.

`barcode_weight_rules` now supports global item + brand + origin rules by allowing `location_id` to be null. Existing location-specific rules can remain for compatibility, but the stock inbound workflow saves new rules globally by item, brand, and origin.

Migration `202606100038_stock_take_scoped_approval_v1.sql` adds item+brand scope and manager/director signature fields to `stock_take_sessions`. Open stock take sessions can now lock only the selected item+brand at the selected location while counting is in progress.

Migration `202606100039_stock_damage_approval_v1.sql` adds `stock_damage_requests` for staff damage/spoilage requests with required photo path, manager review signature, director approval signature, and a link to the final stock movement when stock is deducted.

Migration `202606100040_stock_return_supplier_approval_v1.sql` adds `stock_return_supplier_requests` for staff return-supplier requests. Manager approval deducts the barcode from available stock and writes an `OUTBOUND_RETURN_SUPPLIER` movement.

Migration `202606100042_atomic_stock_approval_rpcs_v1.sql` adds atomic approval RPCs for damage/spoilage and return-supplier stock deduction.

Migration `202606100043_atomic_stock_take_approval_rpc_v1.sql` adds `public.approve_stock_take_session`, which atomically writes stock-take adjustment movements, records the director approval, and writes the audit log.

Temporary negative stock alerts are derived in the application data layer from `no_barcode_stock` and combined balance rows. No extra table is required for the current alert surface.

Stock age alerts are derived in the application data layer from `stock_units.received_at` for stockable barcode units. No extra table is required for the current 6-month and 12-month alert surface.

`supabase/seed.sql` includes stock QA fixtures for order outbound, customer-return inspection, damage request/review, return-supplier approval, and stock-take review/approval. The fixture identifiers are listed in `docs/STOCK_QA_RUNBOOK.md`.

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
- Barcode inbound calls `public.inbound_stock_unit`, which creates `stock_units`, `stock_movements`, `barcode_scan_logs`, `audit_logs`, and optional global `barcode_weight_rules` rows in one transaction.
- `no_barcode_stock` is unique by item/brand/origin/location for legacy compatibility, but new Stock-module inbound should generate a barcode label and create `stock_units` instead.
- `customer_orders` link to customers and scope fields.
- `customer_order_items` link to `customer_orders` and `items`.
- `order_stock_reservations` link prepared/picked order items to items and stock locations. They represent stock reserved after picking starts. Active reservations on cancelled orders are released by explicitly changing the reservation status to `RELEASED`; cancellation alone must not free stock.
- `stock_outbound_batches` link outbound scans to customer orders when `order_id` is present. Direct outbound batches use `order_id = null` and are scoped by stock location.
- `stock_outbound_batch_lines` can also store direct outbound lines with `order_id = null`; failed-delivery return lookup only uses order-linked `SALES` lines.
- Migration `202606100054_stock_outbound_transfer_hardening_v1.sql` adds `HOLD_RETURN_SUPPLIER`, `OUTBOUND_SAMPLE_TESTING`, optional `stock_locations.outlet_id`, `stock_locations.is_default_for_outlet`, one-default-per-outlet indexing, a transfer destination trigger, direct outbound remarks enforcement, supplier-return stock hold/release RPCs, and the earlier wrong-location receive-transfer exception audit logging.
- Migration `202606230002_stock_mobile_worker_mvp_v1.sql` updates the mobile MVP rule so wrong-location receive-transfer is blocked, and allows stock workers to create scoped draft stock take sessions while manager/director review and approval gates stay intact.
- Migration `202606230003_stock_receive_transfer_wrong_location_block_v1.sql` re-applies strict receive-transfer blocking with the worker-facing error `Wrong location. This barcode must be received at [destination location].`
- Migration `202606100055_stock_take_exceptions_v1.sql` adds stock-take line exception metadata for `UNKNOWN_BARCODE` and `WRONG_LOCATION`, then replaces `public.approve_stock_take_session` so director approval creates unknown barcode units or moves wrong-location units while writing `STOCK_TAKE_ADJUSTMENT` movements, barcode scan logs, and audit metadata.
- Order outbound batch lines preserve the scanned/substituted barcode item separately from the original customer order item so staff can fulfill practical substitutions while keeping the requested item visible.
- Direct outbound is for `SALES`, `TRANSFER`, and `PROCESSING`. Damage/spoilage and supplier return use request/approval tables and RPCs before stock deduction.
- Transfer outbound sets barcode units to `TRANSFER_PENDING`; the actual stock location changes only when the destination receive scan succeeds.
- Single-barcode transfer and receive-transfer actions call `public.transfer_stock_unit` and `public.receive_stock_transfer` so audit records cannot be partially written after the stock unit changes.
- Normal barcode stock return calls `public.return_stock_unit` so `IN_STOCK` restoration and audit records are written together. `HOLD` and `INSPECTION` stock must use inspection release instead of normal return.
- Customer returns after sale enter `INSPECTION` before becoming sellable. Manager/admin inspection release calls `public.release_inspection_stock_unit`, changes the barcode unit back to `IN_STOCK`, and writes a `MANUAL_ADJUSTMENT` movement with `source_type = customer_return`. Failed customer-order delivery returns linked barcode stock directly to `IN_STOCK` because the sale was not completed.
- `stock_take_sessions` can link to `items` and `brands` to define the exact item+brand under count. Manager review and director final approval signatures are captured on the session. Director final approval uses `public.approve_stock_take_session` to compare expected active barcode units with scanned barcode lines, auto-create missing-barcode variance lines, update missing `stock_units` to `ADJUSTED_OUT`, write `STOCK_TAKE_ADJUSTMENT` movements/logs, and approve the session atomically.
- `stock_damage_requests` links one damaged barcode stock unit to the request/review/approval workflow. Director approval uses `public.approve_stock_damage_request` to atomically update the stock unit to `DAMAGED`, record an `OUTBOUND_SPOILED` movement, write the scan/audit logs, and link the movement back to the request.
- `stock_return_supplier_requests` links one barcode stock unit to a supplier-return request. Manager approval uses `public.approve_stock_return_supplier_request` to atomically update the stock unit to `OUTBOUNDED`, record an `OUTBOUND_RETURN_SUPPLIER` movement, write the scan/audit logs, and link the movement back to the request.
- Failed customer-order delivery proof calls `public.fail_customer_order_delivery_with_proof`, which locks the order, finds `stock_outbound_batch_lines` for `SALES`, returns linked barcode `stock_units` to `IN_STOCK`, writes `stock_movements.movement_type = 'RETURN'` with `source_type = 'return'` and `reference_no = customer_orders.id`, writes `barcode_scan_logs.action = 'RETURN'`, and updates the order failed-return counters. The RPC does not release or delete active reservations.
- `delivery_orders` can reference operational source data; customer-order delivery handoff is handled through customer order status/actions.
- `approval_logs` references OA requests by request type/id rather than one shared parent table.
- `finance_containers` can link to finance invoices.

## What Is Missing

- A generated entity relationship diagram.
- Database-level tests proving every RLS policy for every role.
- A normalized multi-outlet/multi-location staff access table.
- Real Supabase QA evidence for manual reservation release after customer cancellations.
- Real Supabase QA evidence for the manager-then-director stock-take adjustment model, including missing-barcode adjustment-out behavior.
- Real Supabase QA evidence for director-approved damaged/spoiled stock deduction.
- A single normalized production planning model separate from retail processing batches.
- Processing line tables for multiple raw items from multiple batches/barcodes and multiple finished outputs.
- Finished-product barcode generation from processing output.
- A dedicated customer order delivery table; delivery handoff currently reuses `customer_orders` fields/status.
- Full file object lifecycle details for Supabase Storage buckets.
- Strong automated validation for pricing rule precedence.
- Price override reason fields/workflow enforcement.
- AutoCount-format aging bucket schema or shared reporting helper.
- Failed-delivery return support for standalone deliveries and no-barcode/loose stock links.
- Real Supabase QA evidence for return-supplier request/review/deduction workflow.
- Browser/device QA evidence for stock-unit label reprints.

## Risky Logic

- RLS policies are distributed across many migrations. A fresh project must apply all migrations in order.
- Some tables have broad read policies in early migrations that are later replaced with scoped policies.
- Several status workflows depend on server actions and RLS working together.
- `order_stock_reservations` now represents prepared/picked quantity or weight. It still does not by itself lock specific barcode units until outbound scan.
- Failed-delivery return currently uses barcode outbound lines as the source of truth. If a failed order used loose/no-barcode stock or a standalone delivery with no order outbound linkage, the system records `NO_STOCK_LINK` and requires manual stock follow-up.
- Damage, return-supplier, and stock-take final approval RPCs are atomic, but still need real migrated Supabase/RLS QA with manager/director users.
- Stock take is location plus item+brand scoped. Open count sessions should lock only the selected item+brand in the selected location, not unrelated stock in the same location.
- Migration `202606100033_order_item_reservation_rpc_v1.sql` created an add-item reservation RPC that is superseded by `202606100034_order_reservation_on_picking_v1.sql`; fresh projects must run both in order so the old RPC is dropped.
- Retail processing and general processing concepts are currently close together; future production planning may require a clearer domain split.
- File metadata may exist without confirmed Storage object access.

## Recommended Next Tasks

1. Generate an ERD from a fresh migrated Supabase schema.
2. Add RLS verification scripts using seeded Auth users.
3. Document status transitions per table with allowed actors.
4. Add a pricing precedence document before expanding customer/category-specific price automation.
5. Decide whether processing should remain in retail tables or move to a dedicated production-planning schema.
