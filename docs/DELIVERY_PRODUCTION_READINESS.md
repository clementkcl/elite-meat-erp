# Delivery Production Readiness

Last updated: 2026-06-23

## Canonical V1 Data Model

Delivery Module V1 canonical workflow uses:

- `deliveries`
- `delivery_orders`
- `delivery_items`
- `delivery_proofs`
- `delivery_status_logs`
- `delivery_address_suggestions`
- `delivery_expenses`
- `vehicles`
- `truck_gps_providers`, `truck_gps_snapshots`, and `vehicle_current_locations` for future truck GPS preparation

Canonical V1 screens and services:

- `/delivery` manager dashboard uses `lib/delivery/queries.ts#getDeliveryDashboard` and reads `deliveries`.
- `/delivery/driver` uses `getAvailableDeliveries`, `getTodayDriverDeliveries`, `getTodayDriverExpenses`, and `getDeliveryVehicles`.
- `/delivery/[id]` uses `getDeliveryById` and canonical linked tables.
- `/delivery/expenses` uses canonical `delivery_expenses`.
- Order ready/manual delivery creation uses `create_delivery_from_customer_order`, which inserts into `deliveries`, `delivery_orders`, and `delivery_items`.
- Proof upload uses `delivery_proofs`, updates `deliveries`, writes `delivery_status_logs`, updates linked `delivery_orders` and customer orders, and creates address/GPS suggestions when GPS is available.

Legacy compatibility surfaces still present:

- `delivery_jobs`
- `delivery_job_orders`
- `delivery_goods_issues`
- `delivery_truck_current_locations`
- `delivery_truck_location_trail`
- Older standalone `delivery_orders`, `delivery_order_items`, `delivery_payments`, and `driver_locations` pages/actions

Legacy usage locations:

- `components/delivery/delivery-page.tsx` renders old manager-only pages for `/delivery/orders`, `/delivery/new-order`, `/delivery/payments`, and `/delivery/vehicles`.
- `components/delivery/driver-delivery-page.tsx` is the older delivery-job driver UI component.
- `lib/delivery/data.ts` loads legacy delivery orders/jobs/payments for old pages.
- `lib/delivery/actions.ts` still contains legacy form actions such as `acceptDeliveryJobAction`, `uploadDeliveryJobProofAction`, `createDeliveryOrderAction`, `recordDeliveryPaymentAction`, and older proof/payment actions.
- Older migrations and RLS policies still maintain these tables for compatibility.

Legacy risk:

- These pages can confuse V1 because they include old standalone delivery order, payment, receiver, and delivery-job concepts.
- They should be kept only as manager/admin historical compatibility until the owner confirms no historical records depend on them.
- Do not delete legacy tables or actions without a data migration and route retirement plan.
- Recommended future cleanup: redirect or archive `/delivery/orders`, `/delivery/new-order`, `/delivery/payments`, and `/delivery/vehicles` after live users confirm they no longer need old records.

## Staging Migration Checklist

Apply migrations in filename order. Prefer applying the complete project migration chain instead of cherry-picking Delivery migrations, because Delivery depends on core roles, profiles, orders, stock, files, and storage helpers.

Delivery-related migration order:

- `202606100002_delivery_v1.sql` - Initial legacy delivery tables, vehicles, driver locations, payment/proof/status logs.
- `202606100007_roles_scope_and_operations_v1.sql` - Adds scoped role/team fields and indexes used by delivery access.
- `202606100008_team_rls_v1.sql` - Early team-scoped RLS for vehicles, delivery orders, payments, locations, and proof records.
- `202606100012_delivery_workflow_status_v1.sql` - Delivery workflow status adjustment.
- `202606100019_delivery_source_proof_photo_v1.sql` - Source/proof metadata for legacy delivery orders.
- `202606100023_customer_order_delivery_proof_v1.sql` - Customer-order delivery proof support.
- `202606100026_customer_order_delivery_access_v1.sql` - Customer-order delivery access policies.
- `202606100027_orders_delivery_role_tightening_v1.sql` - Removes broad delivery roles from general order management.
- `202606100035_part2_delivery_proof_metadata_v1.sql` - Adds proof receiver/GPS/upload timestamp metadata and customer-order proof RPC.
- `202606100036_failed_delivery_return_workflow_v1.sql` - Failed customer-order return workflow for linked barcode stock.
- `202606230004_delivery_module_v1.sql` - Adds delivery-job compatibility tables, goods issues, expenses, truck prep stubs, and proof/address functions.
- `202606230007_delivery_database_storage_rls_v1.sql` - Adds canonical `deliveries`, `delivery_orders`, `delivery_items`, `delivery_proofs`, `delivery_status_logs`, address suggestions, expenses, buckets, indexes, helper functions, and RLS.
- `202606230009_delivery_proof_uploaded_at_v1.sql` - Adds/fills `delivery_proofs.uploaded_at`.
- `202606230010_order_delivery_integration_v1.sql` - Adds `create_delivery_from_customer_order` canonical order handoff RPC.
- `202606230012_delivery_address_suggestion_photo_approval_v1.sql` - Adds address suggestion photo/approval metadata.
- `202606230013_delivery_expense_review_v1.sql` - Adds expense review fields/indexes and expense RLS.
- `202606230014_truck_gps_future_prep_v1.sql` - Adds truck GPS provider/current-location/snapshot future schema and RLS.
- `202606230015_delivery_permissions_audit_hardening_v1.sql` - Hardens canonical and legacy delivery RLS, status transition triggers, storage read/upload policies, and mutation scopes.

Related Order reservation migration:

- `202606230026_order_reservation_logic_v1.sql` - Adds reservation-aware order stock helper functions. This migration intentionally runs after the Delivery hardening chain because no later migration depends on these helper functions, and the later timestamp avoids colliding with `202606230013_delivery_expense_review_v1.sql`.

Staging apply checklist:

- Confirm environment points to staging Supabase, not production.
- Back up staging database before applying migrations.
- Apply all pending migrations in filename order.
- Confirm buckets exist: `delivery-proofs`, `delivery-expenses`.
- Confirm RLS is enabled on canonical delivery tables.
- Confirm `create_delivery_from_customer_order` exists.
- Confirm `enforce_delivery_driver_status_transition` trigger exists on `deliveries`.
- Confirm `enforce_delivery_job_driver_status_transition` trigger exists on `delivery_jobs`.
- Confirm storage object policies exist for proof and expense buckets.

## RLS Verification Plan

Create or identify four staging Auth users:

- Driver: role `delivery_team_general_worker`, assigned `outlet_id = Outlet A`, `department_id = Delivery Team A`, Delivery module access enabled.
- Manager: role `delivery_manager`, same outlet/team as Driver, Delivery module access enabled.
- Admin: role `admin`, Delivery module access enabled.
- Director: role `director`, Delivery module access enabled.

Seed or create test data:

- Outlet A / Delivery Team A delivery with status `AVAILABLE`.
- Outlet B / Delivery Team B delivery with status `AVAILABLE`.
- Accepted delivery assigned to Driver A.
- Accepted delivery assigned to Driver B.
- Delivery with proof in Outlet A.
- Expense created by Driver A.
- Address suggestion for Outlet A delivery.

RLS assertions:

- Driver A can read Outlet A available delivery.
- Driver A cannot read Outlet B available delivery.
- Driver A can accept Outlet A available delivery.
- Driver A can read own accepted delivery.
- Driver A cannot read Driver B accepted delivery.
- Driver A cannot access `/delivery`, `/delivery/expenses`, `/delivery/payments`, `/delivery/vehicles`, or manager review actions.
- Driver A cannot see price, payment collection, customer credit, stock cost, stock value, profit, finance, or accounting data in `/delivery/driver`.
- Driver A can upload proof only after assigned delivery is `OUT_FOR_DELIVERY`.
- Driver A cannot upload proof for another driver's delivery.
- Driver A can upload an expense receipt only under their own user-id storage path.
- Manager can read and manage Outlet A / Delivery Team A deliveries.
- Manager cannot read/manage Outlet B / Delivery Team B unless assigned that scope.
- Manager can approve/reject Outlet A expense and address/GPS suggestion.
- Manager cannot approve/reject Outlet B expense or address/GPS suggestion.
- Admin can read/manage all delivery records according to existing ERP admin pattern.
- Director can read/review where existing ERP pattern allows, but should not mutate address/GPS approval through hardened mutation policies.

## Mobile QA Checklist

Test on a real phone using `/delivery/driver`:

- Log in as Driver A.
- Available tab shows only same outlet/team available deliveries.
- Tap `Accept Delivery`.
- Confirm delivery moves from Available to My Deliveries.
- Confirm default vehicle is applied; test Change Vehicle if needed.
- Tap `Loaded`.
- Tap `Google Maps`; confirm coordinates are used when present and address search is used otherwise.
- Tap `Call`; confirm phone dialer opens.
- Tap `WhatsApp`; confirm WhatsApp URL opens.
- Tap `Start Delivery`.
- With GPS allowed, upload delivered proof; confirm camera opens, watermark appears, proof uploads, delivery becomes Delivered, linked order becomes Delivered.
- With GPS denied/unavailable, upload delivered proof; confirm completion still succeeds and GPS unavailable is visible/logged.
- Upload failed proof with a non-Other reason; confirm delivery becomes Failed and linked order becomes Failed.
- Upload failed proof with `Other` and no remark; confirm UI/server blocks it.
- Upload failed proof with `Other` and a remark; confirm it succeeds.
- Deny camera permission; confirm the browser/user-facing failure is understandable and driver can retry.
- Submit Address Issue with optional note/photo; confirm manager sees suggestion.
- Tap Save Current Location as Suggested Customer GPS with GPS allowed; confirm manager sees suggestion.
- Submit expense receipt photo with amount/type; confirm expense is Pending.
- Confirm driver sees only own expense approval status.

## Staging App Server-Action QA

Use the deployed staging app, not local `.env.local`, because local env currently points to local Supabase.

Before testing:

- In Vercel/staging environment settings, confirm `NEXT_PUBLIC_SUPABASE_URL` points to `https://aikfqnbsshflbtuakwrz.supabase.co`.
- Confirm the staging app has the matching staging anon key configured. Do not paste keys into chat or docs.
- Redeploy/restart the staging app after any environment change.
- Use QA users `delivery.driver@example.test` and `delivery.manager@example.test` with the owner-approved test password.

Driver server-action flow evidence:

- Log in as `delivery.driver@example.test`.
- Open `/delivery/driver`.
- Confirm no price, total order price, cost, stock value, credit, payment, profit, finance, or accounting fields appear.
- Accept an Available delivery.
- Tap `Loaded`.
- Tap `Start Delivery`.
- Upload Delivered Proof with camera allowed.
- Confirm the delivery becomes `DELIVERED`.
- Confirm the linked `customer_orders.status` becomes `DELIVERED`.
- Repeat failed path: Upload Failed Proof, confirm a failed reason is required.
- Confirm `OTHER` requires a remark.
- Deny GPS and confirm completion still succeeds with GPS unavailable recorded.
- Submit a delivery expense receipt.
- Submit Address Issue / Suggested GPS.

Manager server-action flow evidence:

- Log in as `delivery.manager@example.test`.
- Open `/delivery`.
- Confirm only scoped outlet/team deliveries are visible.
- Review failed deliveries.
- Review/approve/reject delivery expense.
- Review/approve/reject address/GPS suggestion.

## Storage Verification

Buckets:

- `delivery-proofs`
- `delivery-expenses`

Proof bucket checks:

- Driver can upload to `{delivery_id}/proof/...` only for own allowed delivery that is `OUT_FOR_DELIVERY`.
- Driver can upload to `{delivery_id}/address-issue/...` only for own allowed non-closed delivery.
- Manager/admin can view scoped proof and address issue photos.
- Unassigned driver cannot upload/read another driver's proof object.
- Driver cannot upload proof for `AVAILABLE`, `ACCEPTED`, `LOADED`, `DELIVERED`, `FAILED`, or `CANCELLED` deliveries except allowed address-issue paths on non-closed deliveries.

Expense bucket checks:

- Driver can upload only to `{auth.uid()}/expenses/...`.
- Driver can view own expense receipt.
- Manager/admin can view scoped driver's receipt when expense is in their outlet/team.
- Other drivers cannot read or upload another user's expense receipt.

## Stabilization Status

- Canonical V1 model: PASS with caveat that legacy compatibility pages remain.
- Staging migration checklist: PASS, documented above.
- RLS verification plan: PASS for database/RLS QA with staging JWT claims; browser/server-action execution still required.
- Driver direct `customer_orders` finance exposure: PASS after `202606240009_order_delivery_finance_exposure_fix_v1.sql`; drivers use Delivery tables for operational fields.
- Delivery hotfix migration ledger: PASS for manually applied hotfixes `202606240005`, `202606240006`, `202606240007`, and `202606240009`; unrelated `202606240003` and `202606240008` remain pending.
- Mobile QA checklist: PASS, documented above; real device execution still required.
- Storage verification checklist: PASS, documented above; live Supabase execution still required.

Remaining risks:

- Legacy delivery pages can still confuse managers. They now show a warning, but future cleanup should archive or redirect them after data review.
- Source-level smoke tests do not replace real Auth/RLS/Storage tests.
- Client-side proof watermark is not server-verified.
- Truck GPS is schema/service preparation only.
- Full deployed-app proof/order-sync QA is still required because local `.env.local` is not connected to staging.
