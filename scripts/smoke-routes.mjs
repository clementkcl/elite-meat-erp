import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function listFiles(relativePath) {
  return fs.readdirSync(path.join(root, relativePath)).sort()
}

function listFilesRecursive(relativePath) {
  const absolutePath = path.join(root, relativePath)
  const entries = fs.readdirSync(absolutePath, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const childPath = path.join(relativePath, entry.name)

    if (entry.isDirectory()) {
      return listFilesRecursive(childPath)
    }

    return [childPath]
  })
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const requiredRoutes = [
  "app/(erp)/home/page.tsx",
  "app/(erp)/stock/inbound/page.tsx",
  "app/(erp)/stock/outbound/page.tsx",
  "app/(erp)/stock/transfer/page.tsx",
  "app/(erp)/stock/receive-transfer/page.tsx",
  "app/(erp)/stock/return/page.tsx",
  "app/(erp)/stock/stock-take/page.tsx",
  "app/(erp)/orders/page.tsx",
  "app/(erp)/orders/new/page.tsx",
  "app/(erp)/orders/[id]/page.tsx",
  "app/(erp)/orders/prepare/page.tsx",
  "app/(erp)/delivery/dashboard/page.tsx",
  "app/(erp)/attendance/today/page.tsx",
  "app/(erp)/oa-actions/dashboard/page.tsx",
  "app/(erp)/retail/dashboard/page.tsx",
  "app/(erp)/processing/dashboard/page.tsx",
  "app/(erp)/cleaning/tasks/page.tsx",
  "app/(erp)/accounting-finance/dashboard/page.tsx",
  "app/(erp)/accounting/dashboard/page.tsx",
  "app/(erp)/director-reports/dashboard/page.tsx",
  "app/(erp)/director/dashboard/page.tsx",
  "app/(erp)/oa/my-requests/page.tsx",
  "app/(erp)/settings/page.tsx",
  "app/(erp)/loading.tsx",
  "app/(erp)/error.tsx",
]

for (const route of requiredRoutes) {
  assert(exists(route), `Missing route or state file: ${route}`)
}

const accessHelper = read("lib/auth/access.ts")
assert(
  accessHelper.includes("return profile.moduleAccess.includes(moduleKey)") &&
    !accessHelper.includes("if (!profile.outletId)"),
  "Non-admin users must need explicit module access even when outlet assignment is missing"
)

const serviceRolePattern =
  /SUPABASE_SERVICE|SERVICE_ROLE|service_role|service-role|supabase_service/i
for (const sourceRoot of ["app", "components", "lib"]) {
  for (const sourceFile of listFilesRecursive(sourceRoot).filter((file) =>
    /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)
  )) {
    assert(
      !serviceRolePattern.test(read(sourceFile)),
      `${sourceFile} must not reference Supabase service-role credentials`
    )
  }
}
for (const edgeFile of ["proxy.ts", "middleware.ts"]) {
  if (exists(edgeFile)) {
    assert(
      !serviceRolePattern.test(read(edgeFile)),
      `${edgeFile} must not reference Supabase service-role credentials`
    )
  }
}

const barcodeScanner = read("components/stock/barcode-scanner.tsx")
assert(
  barcodeScanner.includes("@zxing/browser"),
  "Barcode scanner must use @zxing/browser"
)
assert(
  barcodeScanner.includes("facingMode") && barcodeScanner.includes("environment"),
  "Barcode scanner should prefer rear camera on mobile"
)
assert(
  barcodeScanner.includes("export function BarcodeScanner"),
  "Barcode scanner must export a reusable BarcodeScanner component"
)
assert(
  barcodeScanner.includes("getTracks().forEach") &&
    barcodeScanner.includes("track.stop()"),
  "Barcode scanner must stop camera stream"
)

const workflowForms = read("components/stock/workflow-forms.tsx")
const barcodeFieldCount = workflowForms.match(/<BarcodeField/g)?.length ?? 0
assert(
  barcodeFieldCount >= 6,
  `Expected scanner fields in six workflows, found ${barcodeFieldCount}`
)
for (const fragment of [
  "function generatedItemCode",
  "itemCodeEdited",
  "const canCreateItem",
  "const canUpdateItem",
  "setItemCodeEdited(false)",
  "name=\"itemCode\"",
  "updateItemAction",
  "name=\"isActive\"",
  "Enter section, name, and item code before creating the item.",
  "Select an item before updating item master details.",
  "defaultValue={selectedItem.itemCode}",
  "Confirm outbound batch",
  "barcodesJson",
  "const confirmDisabled",
  "setBarcodes([])",
  "disabled={confirmDisabled}",
  "Select a ready order, scan at least one barcode",
  "const activeItems = items.filter((item) => item.active)",
  "const activeBrands = brands.filter((brand) => brand.active)",
  "const activeOrigins = origins.filter((origin) => origin.active)",
  "const activeLocations = locations.filter((location) => location.active)",
  "function normalizeInboundPreset",
  "initialInboundPreset(items, locations, brands, origins)",
  "activeBrandIds.has(preset.brandId)",
  "activeOriginIds.has(preset.originId)",
  "totalWeightKg.toFixed(3)",
  "canOperate: boolean",
  "canApprove: boolean",
  "Counting and scan entry are",
  "reserved for stock operators.",
  "canOperate ?",
  "canApprove ?",
]) {
  assert(workflowForms.includes(fragment), `Workflow forms missing: ${fragment}`)
}
assert(
  workflowForms.includes('order.status === "READY_FOR_PICKUP"') &&
    workflowForms.includes('order.status === "READY_FOR_DELIVERY"') &&
    workflowForms.includes("Mark an order ready before confirming outbound scans."),
  "Outbound form must only list ready orders"
)
const barcodeWeight = read("lib/stock/barcode-weight.ts")
assert(
  barcodeWeight.includes("310([23])") &&
    barcodeWeight.includes("GS1_3102") &&
    barcodeWeight.includes("GS1_3103") &&
    barcodeWeight.includes("FIXED_WEIGHT") &&
    barcodeWeight.includes("manual_confirmation_required"),
  "Barcode weight decoder must support GS1 3102/3103, fixed fallback, and manual confirmation"
)
assert(
  workflowForms.includes("decodeBarcodeWeight") &&
    workflowForms.includes("fixedWeightKg") &&
    workflowForms.includes("decoded.status === \"decoded\""),
  "Barcode inbound form must use centralized decoder and avoid auto-save when manual confirmation is required"
)

const stockActions = read("lib/stock/actions.ts")
assert(
  !stockActions.includes("export async function outboundSalesAction") &&
    !stockActions.includes("const barcodeOutboundSchema"),
  "Stock outbound must only use the order-based batch confirmation action"
)
assert(
  stockActions.includes("assertStockLocationAccess"),
  "Stock actions must enforce stock-location access"
)
assert(
  stockActions.includes('canAccessModule(profile, "stock")'),
  "Stock actions must enforce stock module access"
)
assert(
  stockActions.includes('status: "IN_STOCK"'),
  "Return stock must restore IN_STOCK status"
)
assert(
  stockActions.includes("Barcode already exists"),
  "Duplicate inbound barcode must be blocked"
)
assert(
  !(
    stockActions
      .match(/const stockOperatorRoles:[\s\S]*?=\s*\[([\s\S]*?)\]/)?.[1]
      ?.includes('"director"') ?? false
  ),
  "Stock operator actions must not allow director to perform routine stock operations"
)
for (const fragment of [
  "assertUniqueItemCode(context.supabase, itemCode)",
  "assertUniqueItemCode(context.supabase, itemCode, parsed.itemId)",
  "parseOutboundBarcodes",
  "duplicateOutboundBarcode",
  "assertCustomerOrderReadyForOutbound",
  "Customer order must be marked ready before confirming outbound scans.",
  'import { randomUUID } from "node:crypto"',
  "randomUUID()",
  '"confirm_order_outbound_batch"',
  "p_batch_no: batchNo",
  "Duplicate barcode in this outbound batch.",
  "Barcode was not found.",
  "Choose a transfer destination before confirming transfer.",
  "Destination location is only used for transfers.",
  "assertActiveStockLocation",
  "was not found or is inactive.",
  "All barcodes in one outbound batch must come from the same location.",
  "Transfer destination must be different from the current location.",
]) {
  assert(stockActions.includes(fragment), `Stock action missing: ${fragment}`)
}

const ordersActions = read("lib/orders/actions.ts")
const ordersPage = read("components/orders/orders-page.tsx")
for (const fragment of [
  "createCustomerOrderAction",
  "outletId: optionalId",
  "departmentId: optionalId",
  "scopedOutletId(context.profile, parsed.outletId)",
  "scopedDepartmentId(context.profile, parsed.departmentId)",
  "Choose an outlet before creating orders.",
  "addCustomerOrderItemAction",
  '"INTERNAL_TRANSFER"',
  "assertOrderHasNoActiveReservations",
  "Stock is already reserved for this order.",
  "prepare_customer_order_item_with_reservation",
  "Could not prepare item and reserve stock:",
  "Requested quantity or requested weight is required.",
  "prepareCustomerOrderItemAction",
  "markCustomerOrderReadyAction",
  "assertOrderEditable",
  'assertOrderEditable(order, "add items")',
  'assertOrderEditable(order, "prepare items")',
  "after it is ready or closed",
  "assertOrderReadyForHandoff",
  "Prepare every order item with quantity or weight",
  "prepared_quantity",
  "prepared_weight_kg",
  "READY_FOR_PICKUP",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "allowedDeliveryStatuses",
  "Delivery order cannot move from",
  "Only delivery-required customer orders can be updated here.",
  "Only delivery-required customer orders can receive proof photos.",
  "Proof photos can only complete customer orders after they are out for delivery.",
  "Proof of delivery must be a photo image file.",
  "assertProofBeforeDeliveryCompletion(order, parsed.status)",
  "Upload proof of delivery before marking this customer order delivered or failed.",
  "proof_file_id",
  "releaseOrderReservationsAction",
  "releaseReservationsSchema",
  "Order must be cancelled before releasing reserved stock.",
  "No active reservations found for this cancelled order.",
  'status: "RELEASED"',
  '.eq("status", "ACTIVE")',
  "CUSTOMER_ORDER_RESERVATIONS_RELEASED",
]) {
  assert(ordersActions.includes(fragment), `Order action missing: ${fragment}`)
}
const ordersForms = read("components/orders/orders-forms.tsx")
assert(
  ordersForms.includes('selectedOrder?.status === "READY_FOR_DELIVERY"') &&
    ordersForms.includes('["OUT_FOR_DELIVERY", "OUT FOR DELIVERY"]') &&
    ordersForms.includes('selectedOrder?.status === "OUT_FOR_DELIVERY"') &&
    ordersForms.includes('["DELIVERED", "DELIVERED"]'),
  "Delivery status form must show valid next statuses based on current order state"
)
for (const fragment of [
  "function canChooseOrderScope",
  "scopeOptions.outlets",
  "name=\"outletId\"",
  "name=\"departmentId\"",
  "Choose the outlet scope",
  "submitDisabled={submitDisabled}",
  "submitDisabled={items.length === 0 || !hasPreparedAmount}",
  "submitDisabled={readyCandidates.length === 0}",
  "disabled={deliveryOrders.length === 0}",
  "disabled={statusOptions.length === 0}",
  "required={!submitDisabled}",
  "hasRequestedAmount",
  "hasPreparedAmount",
  "Stock is not reserved until picking starts.",
  "Enter prepared quantity, prepared weight, or both before saving and reserving stock.",
  "Start picking, reserve stock",
  "Release reserved stock",
  "Cancellation itself does not release stock.",
  "releaseOrderReservationsAction",
  "No cancelled orders with active reservations are available.",
  "Proof photos can be uploaded after a customer order is out for",
]) {
  assert(ordersForms.includes(fragment), `Order form UX guard missing: ${fragment}`)
}
assert(
  ordersPage.includes("getRowHref") && ordersPage.includes("/orders/${row.id}"),
  "Orders list must link rows to order detail pages"
)
assert(
  ordersPage.includes("Orders unavailable") &&
    ordersPage.includes("Check that the Orders migrations were applied in order.") &&
    !ordersPage.includes("getOrderDetailData"),
  "Orders page must show setup errors and avoid duplicate detail data loads"
)
assert(
  ordersPage.includes("editableOrderItems(detailItems, [detailOrder])") &&
    ordersPage.includes("<MarkOrderReadyForm orders={[detailOrder]} items={detailItems}") &&
    ordersPage.includes("<ReleaseOrderReservationsForm") &&
    ordersPage.includes("reservationRows(detailReservations)") &&
    ordersPage.includes("canOperateOrders ?"),
  "Order detail page must support prepare, mark-ready, and manual reservation release workflows"
)
assert(
  ordersPage.includes("const orderOperatorRoles: UserRole[]") &&
    ordersPage.includes("canOperate={canOperateOrders}") &&
    ordersPage.includes("Order entry unavailable") &&
    ordersPage.includes("Order preparation unavailable") &&
    ordersPage.includes("reserved for retail, processing, and admin users"),
  "Orders UI must keep director/view roles away from routine order entry controls"
)
assert(
  ordersPage.includes("requireCurrentProfile") &&
    ordersPage.includes("scopeOptions={data.scopeOptions}"),
  "Order creation page must pass current profile and scope options into the form"
)

const ordersData = read("lib/orders/data.ts")
assert(
  ordersData.includes("scopeOptions: {") &&
    ordersData.includes(".filter((row) => readBoolean(row.is_active))"),
  "Order data must expose scope options and only offer active stock items for new order lines"
)
assert(
  ordersData.includes('loadRows("order_stock_reservations")') &&
    ordersData.includes("mapReservation") &&
    ordersData.includes("reservations,"),
  "Order data must expose stock reservations for manual release workflow"
)
assert(
  ordersData.includes("isSupabaseConfigured") &&
    ordersData.includes("Orders data could not load") &&
    ordersData.includes("return demoData()"),
  "Orders data loader must only use demo fallback when Supabase is not configured and surface real query errors"
)

const ordersMigration = read(
  "supabase/migrations/202606100021_orders_workflow_v1.sql"
)
for (const fragment of [
  "create table if not exists public.customer_orders",
  "create table if not exists public.customer_order_items",
  "create table if not exists public.order_preparation_logs",
  "create table if not exists public.order_notification_events",
  "'NEW'",
  "'PREPARING'",
  "'READY'",
  "'READY_FOR_PICKUP'",
  "'READY_FOR_DELIVERY'",
  "'OUT_FOR_DELIVERY'",
  "'DELIVERED'",
  "'FAILED'",
  "'CANCELLED'",
]) {
  assert(ordersMigration.includes(fragment), `Orders migration missing: ${fragment}`)
}

const seedSql = read("supabase/seed.sql")
for (const fragment of [
  "'ORD-SEED-PICKUP-001'",
  "'ORD-SEED-DELIVERY-001'",
  "'CUST-JC-PICKUP-001'",
  "'CUST-SM-CREDIT-001'",
  "insert into public.customers",
  "insert into public.customer_orders",
  "insert into public.customer_order_items",
  "insert into public.order_stock_reservations",
  "insert into public.order_preparation_logs",
  "insert into public.order_notification_events",
  "'EM-SEED-OUT-001'",
  "'EM-SEED-OUT-002'",
  "'EM-SEED-OUT-003'",
  "'SEED-ORDER-OUTBOUND'",
]) {
  assert(seedSql.includes(fragment), `Seed SQL missing: ${fragment}`)
}

const outboundMigration = read(
  "supabase/migrations/202606100022_order_outbound_batches_v1.sql"
)
for (const fragment of [
  "create table if not exists public.stock_outbound_batches",
  "create table if not exists public.stock_outbound_batch_lines",
  "unique (batch_id, barcode)",
  "'SALES'",
  "'TRANSFER'",
  "'PROCESSING'",
  "'SPOILED'",
]) {
  assert(
    outboundMigration.includes(fragment),
    `Outbound migration missing: ${fragment}`
  )
}

const atomicOutboundMigration = read(
  "supabase/migrations/202606100028_order_outbound_atomic_rpc_v1.sql"
)
assert(
  /drop function if exists public\.confirm_order_outbound_batch\(\s*uuid,\s*text,\s*uuid,\s*jsonb,\s*text,\s*text,\s*text\s*\);/i.test(
    atomicOutboundMigration
  ),
  "Atomic outbound migration must drop the current 7-argument RPC signature before recreating it"
)
for (const fragment of [
  "drop function if exists public.confirm_order_outbound_batch",
  "create or replace function public.confirm_order_outbound_batch",
  "for update",
  "gen_random_uuid()",
  "Every outbound scan line must include a stock unit and barcode.",
  "order_status not in ('READY_FOR_PICKUP', 'READY_FOR_DELIVERY')",
  "Transfer destination was not found or is inactive.",
  "from public.stock_locations",
  "Duplicate barcode in this outbound batch.",
  "insert into public.stock_outbound_batches",
  "insert into public.stock_outbound_batch_lines",
  "update public.stock_units",
  "insert into public.stock_movements",
  "insert into public.barcode_scan_logs",
  "insert into public.audit_logs",
  "'SOLD'::public.stock_unit_status",
  "'TRANSFER_PENDING'::public.stock_unit_status",
  "'OUTBOUNDED'::public.stock_unit_status",
  "'DAMAGED'::public.stock_unit_status",
]) {
  assert(
    atomicOutboundMigration.includes(fragment),
    `Atomic outbound migration missing: ${fragment}`
  )
}

const orderWorkflowGuardMigration = read(
  "supabase/migrations/202606100029_order_workflow_guards_v1.sql"
)
for (const fragment of [
  "create or replace function public.guard_customer_order_update()",
  "drop trigger if exists guard_customer_order_update on public.customer_orders",
  "create trigger guard_customer_order_update",
  "Delivery users can only update delivery status, remarks, proof, and audit fields.",
  "Delivery order cannot move from % to %.",
  "Order operators cannot move orders to %.",
  "Only delivery-required orders can be marked ready for delivery.",
  "Delivery-required orders must be marked ready for delivery.",
]) {
  assert(
    orderWorkflowGuardMigration.includes(fragment),
    `Order workflow guard migration missing: ${fragment}`
  )
}

const directorViewOnlyOrdersMigration = read(
  "supabase/migrations/202606100030_director_view_only_order_ops_v1.sql"
)
for (const fragment of [
  "create or replace function public.can_manage_customer_orders()",
  "create or replace function public.can_operate_customer_order_delivery()",
  "or public.has_role('admin');",
  "Director users can view customer orders but cannot perform routine order updates.",
  "drop policy if exists \"orders users can insert scoped orders\" on public.customer_orders;",
  "drop policy if exists \"orders users can update scoped orders\" on public.customer_orders;",
]) {
  assert(
    directorViewOnlyOrdersMigration.includes(fragment),
    `Director view-only order migration missing: ${fragment}`
  )
}
assert(
  !directorViewOnlyOrdersMigration.includes("or public.has_role('director');"),
  "Director view-only order migration must not grant director routine order operation helpers"
)

const stockDirectorViewMigration = read(
  "supabase/migrations/202606100031_stock_director_view_scope_v1.sql"
)
for (const fragment of [
  "create or replace function public.can_manage_stock()",
  "create or replace function public.can_edit_stock_take_session(target_session_id uuid)",
  "or public.has_role('admin');",
  "sts.status = 'DRAFT'",
]) {
  assert(
    stockDirectorViewMigration.includes(fragment),
    `Stock director view migration missing: ${fragment}`
  )
}
assert(
  !stockDirectorViewMigration.includes("or public.has_role('director');") &&
    !stockDirectorViewMigration.includes("public.is_admin_or_director()"),
  "Stock director view migration must not grant director routine stock operation helpers"
)

const settingsMigration = read(
  "supabase/migrations/202606100032_admin_settings_customer_pricing_v1.sql"
)
for (const fragment of [
  "alter type public.customer_order_fulfillment add value if not exists 'INTERNAL_TRANSFER'",
  "create table if not exists public.erp_claim_categories",
  "create table if not exists public.erp_leave_types",
  "create table if not exists public.customer_categories",
  "create table if not exists public.customers",
  "create table if not exists public.customer_price_rules",
  "create table if not exists public.leave_balances",
  "create table if not exists public.order_stock_reservations",
  "add column if not exists customer_id",
  "add column if not exists source_type",
  "add column if not exists is_processing_item",
  "drop policy if exists \"admins can insert customers\" on public.customers;",
  "drop policy if exists \"users can read scoped order reservations\" on public.order_stock_reservations;",
]) {
  assert(settingsMigration.includes(fragment), `Settings migration missing: ${fragment}`)
}

const orderReservationOnPickingMigration = read(
  "supabase/migrations/202606100034_order_reservation_on_picking_v1.sql"
)
for (const fragment of [
  "drop function if exists public.add_customer_order_item_with_reservation",
  "create or replace function public.prepare_customer_order_item_with_reservation",
  "security invoker",
  "set search_path = public",
  "Order item was not found or is not accessible.",
  "Only new or preparing orders can start picking.",
  "Stock is already reserved for this order item.",
  "update public.customer_order_items",
  "insert into public.order_preparation_logs",
  "update public.customer_orders",
  "insert into public.order_stock_reservations",
  "returning id into v_reservation_id",
  "grant execute on function public.prepare_customer_order_item_with_reservation",
]) {
  assert(
    orderReservationOnPickingMigration.includes(fragment),
    `Order picking reservation RPC migration missing: ${fragment}`
  )
}

const deliveryProofMetadataMigration = read(
  "supabase/migrations/202606100035_part2_delivery_proof_metadata_v1.sql"
)
for (const fragment of [
  "add column if not exists proof_receiver_name",
  "alter type public.delivery_payment_type add value if not exists 'EWALLET'",
  "values ('VIP', 'VIP', 14, true, 25)",
  "create or replace function public.can_manage_delivery()",
  "public.has_role('retail_team_general_worker')",
  "create or replace function public.can_manage_delivery_team(target_team_id uuid)",
  "create or replace function public.can_operate_customer_order_delivery()",
  "select public.can_manage_delivery();",
  "create or replace function public.complete_customer_order_delivery_with_proof",
  "for update",
  "update public.customer_orders",
  "update public.customers",
  "grant execute on function public.complete_customer_order_delivery_with_proof",
]) {
  assert(
    deliveryProofMetadataMigration.includes(fragment),
    `Part 2 delivery proof metadata migration missing: ${fragment}`
  )
}

const failedDeliveryReturnMigration = read(
  "supabase/migrations/202606100036_failed_delivery_return_workflow_v1.sql"
)
for (const fragment of [
  "add column if not exists failed_return_status",
  "drop function if exists public.fail_customer_order_delivery_with_proof",
  "create or replace function public.fail_customer_order_delivery_with_proof",
  "for update",
  "from public.stock_outbound_batch_lines line",
  "line.outbound_type = 'SALES'",
  "movement.movement_type = 'RETURN'",
  "movement.reference_no = p_order_id::text",
  "movement.source_type = 'return'",
  "status = 'IN_STOCK'",
  "insert into public.stock_movements",
  "insert into public.barcode_scan_logs",
  "'partialDeliveryAllowed', false",
  "grant execute on function public.fail_customer_order_delivery_with_proof",
]) {
  assert(
    failedDeliveryReturnMigration.includes(fragment),
    `Failed delivery return migration missing: ${fragment}`
  )
}

const settingsPage = read("components/settings/settings-page.tsx")
const settingsActions = read("lib/settings/actions.ts")
const settingsData = read("lib/settings/data.ts")
for (const fragment of [
  "User Access",
  "Outlet Module Access",
  "Payment Types",
  "Claim Categories",
  "Leave Types",
  "Customer Categories",
  "Customer Master",
  "Barcode Weight Rules",
]) {
  assert(settingsPage.includes(fragment), `Settings page missing: ${fragment}`)
}
for (const fragment of [
  "updateUserAccessAction",
  "updateOutletModuleAccessAction",
  "saveCustomerAction",
  "saveBarcodeWeightRuleAction",
  "Only admin can change ERP settings.",
  "profile_roles",
  "outlet_module_access",
  "customer_categories",
  "barcode_weight_rules",
]) {
  assert(settingsActions.includes(fragment), `Settings action missing: ${fragment}`)
}
assert(
  settingsData.includes("getSettingsPageData") &&
    settingsData.includes("erp_claim_categories") &&
    settingsData.includes("customer_price_rules") &&
    settingsData.includes("barcode_weight_rules"),
  "Settings data loader must include admin-configurable tables"
)

const retailActions = read("lib/retail/actions.ts")
const retailPage = read("components/retail/retail-page.tsx")
assert(
  retailActions.includes("assertRetailSameDay"),
  "Retail actions must enforce same-day operator edits"
)
assert(
  retailActions.includes("moduleKey: ModuleKey = \"retail\"") &&
    retailActions.includes('}, "processing")') &&
    retailActions.includes('}, "cleaning")'),
  "Retail actions must enforce retail/processing/cleaning module access"
)
assert(
  retailPage.includes('href="/orders/prepare"') &&
    retailPage.includes("Prepare customer orders") &&
    retailPage.includes("Finished") &&
    retailPage.includes("goods only enter stock after packing"),
  "Processing page must link to order preparation and clarify stock entry"
)

for (const [file, moduleKey] of [
  ["lib/delivery/actions.ts", "delivery"],
  ["lib/attendance/actions.ts", "attendance"],
  ["lib/oa-actions/actions.ts", "oa_actions"],
  ["lib/finance/actions.ts", "accounting_finance"],
]) {
  const contents = read(file)
  assert(
    contents.includes(`canAccessModule(profile, "${moduleKey}")`),
    `${file} must enforce ${moduleKey} module access`
  )
}
const deliveryActions = read("lib/delivery/actions.ts")
const deliveryPage = read("components/delivery/delivery-page.tsx")
assert(
  deliveryActions.includes("assertProofUploadAllowed(order)") &&
    deliveryActions.includes("Proof photos can only be uploaded after the delivery is out for delivery."),
  "Delivery proof upload must be blocked until the delivery is out for delivery"
)
assert(
  deliveryActions.includes("assertProofBeforeDeliveryCompletion(order, parsed.status)") &&
    deliveryActions.includes("Upload proof of delivery before marking this delivery delivered or failed."),
  "Standalone delivery completion must require proof before DELIVERED or FAILED"
)
assert(
  deliveryActions.includes("proof_receiver_name") &&
    deliveryActions.includes("proof_latitude") &&
    deliveryActions.includes("proof_longitude") &&
    deliveryActions.includes("deliveryOutcome") &&
    deliveryActions.includes('failed_return_status') &&
    deliveryActions.includes('"NO_STOCK_LINK"') &&
    deliveryActions.includes("Proof of delivery uploaded and delivery marked delivered."),
  "Standalone delivery proof upload must require receiver/GPS and auto-mark delivered or failed with return follow-up"
)
assert(
  ordersActions.includes("assertProofBeforeDeliveryCompletion(order, parsed.status)") &&
    ordersActions.includes("Upload proof of delivery before marking this customer order delivered or failed."),
  "Customer-order delivery completion must require proof before DELIVERED or FAILED"
)
assert(
  ordersActions.includes("receiverName") &&
    ordersActions.includes("p_latitude: parsed.latitude") &&
    ordersActions.includes("p_longitude: parsed.longitude") &&
    ordersActions.includes("complete_customer_order_delivery_with_proof") &&
    ordersActions.includes("fail_customer_order_delivery_with_proof") &&
    ordersActions.includes("Upload failed delivery proof so receiver/contact, photo, GPS, and stock return workflow are recorded.") &&
    ordersActions.includes("Failed delivery proof uploaded and barcode stock return workflow recorded."),
  "Customer-order delivery proof upload must require receiver/GPS and use proof/customer GPS plus failed-return RPCs"
)
assert(
  ordersActions.includes("assertOrderHasNoActiveReservations") &&
    ordersActions.includes("prepare_customer_order_item_with_reservation") &&
    ordersActions.includes("Could not prepare item and reserve stock:"),
  "Order reservation flow must add items without reservation and reserve stock during preparation"
)
assert(
  deliveryPage.includes("shouldLoadCustomerOrders") &&
    deliveryPage.includes("Customer order handoff unavailable") &&
    deliveryPage.includes("Customer order delivery data is unavailable."),
  "Delivery page must only load Orders handoff data where needed and show setup errors"
)
assert(
  deliveryPage.includes("function failedReturnText") &&
    deliveryPage.includes("failedReturnStatus") &&
    deliveryPage.includes("No linked stock") &&
    deliveryPage.includes("Pending ${completedUnits}/${requiredUnits}") &&
    deliveryPage.includes("Returned ${completedUnits}/${requiredUnits}"),
  "Delivery page must show failed-delivery return/reinbound status"
)
assert(
  ordersPage.includes("function failedReturnText") &&
    ordersPage.includes("failedReturnStatus") &&
    ordersPage.includes("Failed delivery return"),
  "Orders page must show failed-delivery return/reinbound status"
)
assert(
  deliveryActions.includes('parsed.status === "FAILED"') &&
    deliveryActions.includes("Upload failed delivery proof so receiver/contact, photo, GPS, and return workflow are recorded."),
  "Standalone delivery direct FAILED status must be blocked in favor of proof upload"
)
assert(
  ordersForms.includes("name=\"deliveryOutcome\"") &&
    ordersForms.includes("<option value=\"FAILED\">Failed</option>") &&
    ordersForms.includes("Failed delivery notes"),
  "Customer-order proof form must support failed proof upload details"
)
assert(
  workflowForms.includes("Confirm outbound batch") &&
    failedDeliveryReturnMigration.includes("stock_outbound_batch_lines"),
  "Failed delivery return workflow must link back to order outbound scan lines"
)
assert(
  deliveryPage.includes("const deliveryOperatorRoles: UserRole[]") &&
    deliveryPage.includes("const deliveryManagerRoles: UserRole[]") &&
    deliveryPage.includes("const deliveryPaymentRoles: UserRole[]") &&
    deliveryPage.includes("canOperateDelivery ?") &&
    deliveryPage.includes("Delivery order entry unavailable") &&
    deliveryPage.includes("Customer order delivery actions unavailable") &&
    deliveryPage.includes("Driver updates unavailable") &&
    deliveryPage.includes("Vehicle maintenance unavailable") &&
    deliveryPage.includes("Delivery payment entry unavailable"),
  "Delivery UI must keep director/view roles away from routine delivery operation controls"
)

const stockPage = read("components/stock/stock-page.tsx")
assert(
  stockPage.includes("Order outbound unavailable") &&
    stockPage.includes("Check that the Orders migrations were applied before using") &&
    stockPage.includes("ordersResult?.ordersData"),
  "Stock outbound must show a setup error when Orders data cannot load"
)
assert(
  stockPage.includes("const stockOperatorRoles: UserRole[] = stockRoles.filter") &&
    stockPage.includes('role !== "director"') &&
    stockPage.includes("const stockRouteRoles: Partial<Record<StockRoute, UserRole[]>>") &&
    stockPage.includes("stockRouteRoles[route] ?? stockRoles") &&
    stockPage.includes("canOperateStock") &&
    stockPage.includes("canApproveStock"),
  "Stock pages must block director from routine stock operation routes while preserving stock view routes"
)
assert(
  stockPage.includes("NegativeStockAlertPanel") &&
    stockPage.includes("NEGATIVE_STOCK") &&
    stockPage.includes("Negative stock alerts:"),
  "Stock pages must surface temporary negative stock alerts in UI and report summaries"
)
assert(
  stockPage.includes("StockAgeAlertPanel") &&
    stockPage.includes("Stock age alerts:") &&
    stockPage.includes("OVER_12_MONTHS"),
  "Stock pages must surface 6-month and 12-month stock age alerts in UI and report summaries"
)
const stockData = read("lib/stock/data.ts")
assert(
  stockData.includes("buildNegativeStockAlerts") &&
    stockData.includes("negativeStockAlerts") &&
    stockData.includes("hasNegativeStock"),
  "Stock data must centralize negative stock alert calculation"
)
assert(
  stockData.includes("buildStockAgeAlerts") &&
    stockData.includes("sixMonthStockAgeDays") &&
    stockData.includes("twelveMonthStockAgeDays") &&
    stockData.includes("stockAgeAlerts"),
  "Stock data must centralize stock age alert calculation"
)

const appShell = read("components/erp/app-shell.tsx")
const homePage = read("components/dashboard/home-page.tsx")
assert(
  homePage.includes('href: "/orders/prepare"') &&
    homePage.includes('label: "Prepare Orders"'),
  "Home shortcuts must include order preparation for eligible users"
)
for (const fragment of [
  'label: "Stock Dashboard"',
  'label: "Stock Reports"',
  'label: "Processing Dashboard"',
  'label: "Retail Dashboard"',
  'label: "Delivery Dashboard"',
  'label: "Finance Dashboard"',
  'label: "Director Dashboard"',
  'label: "Director Reports"',
]) {
  assert(homePage.includes(fragment), `Home shortcut missing: ${fragment}`)
}
assert(
  homePage.includes("function viewingScopeText") &&
    homePage.includes("Viewing: {viewingScopeText(profile)}") &&
    homePage.includes("const stockRoles: UserRole[]") &&
    homePage.includes("roles: stockRoles") &&
    homePage.includes("const stockOperatorShortcutRoles: UserRole[]") &&
    homePage.includes("role !== \"director\"") &&
    homePage.includes("const orderOperatorShortcutRoles: UserRole[]") &&
    homePage.includes("const attendanceRoles: UserRole[]") &&
    homePage.includes("roles: attendanceRoles") &&
    homePage.includes("const cleaningRoles: UserRole[]") &&
    homePage.includes("roles: cleaningRoles"),
  "Home shortcuts must be role-filtered and show a clear viewing scope line"
)
for (const label of [
  "Dashboard",
  "Stock",
  "Orders",
  "Attendance",
  "OA Actions",
  "Retail",
  "Delivery",
  "Accounting",
  "Director",
  "Settings",
]) {
  assert(
    appShell.includes(`label: "${label}"`),
    `Sidebar must include ${label} category`
  )
}
assert(
  appShell.includes("<Sheet open={open} onOpenChange={setOpen}>") &&
    !appShell.includes("<SheetTrigger") &&
    appShell.includes('type="button"') &&
    appShell.includes('aria-controls="erp-mobile-navigation"') &&
    appShell.includes("aria-expanded={open}") &&
    appShell.includes('aria-label="Open navigation"') &&
    appShell.includes("onClick={() => setOpen(true)}") &&
    appShell.includes('id="erp-mobile-navigation"') &&
    appShell.includes('side="left"') &&
    appShell.includes("close={() => setOpen(false)}") &&
    appShell.includes("grid-cols-[auto_minmax(0,1fr)_auto]") &&
    appShell.includes("min-[390px]:block") &&
    appShell.includes("lg:hidden") &&
    appShell.includes("overflow-x-hidden"),
  "Mobile sidebar must use a controlled Sheet with hamburger trigger and close-on-nav"
)
assert(
  appShell.includes("const stockOperatorRoles: UserRole[] = stockRoles.filter") &&
    appShell.includes('role !== "director"') &&
    appShell.includes('prefix: "/stock/inbound"') &&
    appShell.includes('prefix: "/stock/outbound"') &&
    appShell.includes('prefix: "/stock/transfer"') &&
    appShell.includes('prefix: "/stock/receive-transfer"') &&
    appShell.includes('prefix: "/stock/return"') &&
    appShell.includes('prefix: "/stock/no-barcode-inbound"'),
  "Sidebar and route guard must split routine stock operator routes from director stock viewing"
)
assert(
  !/const orderRoles:[^\[]*\[[^\]]*delivery_team_general_worker/.test(appShell),
  "Orders sidebar access must not grant delivery roles general order access"
)

assert(
  !/const orderRoles:[^\[]*\[[^\]]*delivery_team_general_worker/.test(
    ordersActions
  ),
  "Order actions must not allow delivery roles to create or prepare orders"
)
assert(
  !(
    ordersActions
      .match(/const orderRoles:[\s\S]*?=\s*\[([\s\S]*?)\]/)?.[1]
      ?.includes('"director"') ?? false
  ) &&
    !(
      ordersActions
        .match(/const deliveryOrderOperatorRoles:[\s\S]*?=\s*\[([\s\S]*?)\]/)?.[1]
        ?.includes('"director"') ?? false
    ),
  "Order actions must not allow director roles to perform routine order or customer delivery operations"
)
assert(
  ordersActions.includes('"READY_TO_PICKUP"') &&
    ordersActions.includes('"OUT_FOR_DELIVERY"') &&
    ordersActions.includes('"DELIVERED"'),
  "Orders must keep WhatsApp notification placeholder events"
)

assert(
  deliveryPage.includes("function customerDeliveryStatusLabel") &&
    deliveryPage.includes('status === "READY_FOR_DELIVERY"') &&
    deliveryPage.includes('return "Pending"') &&
    deliveryPage.includes('status === "OUT_FOR_DELIVERY"') &&
    deliveryPage.includes('return "Out for delivery"') &&
    deliveryPage.includes("customerDeliveryStatusLabel(order.status)"),
  "Delivery customer order list must show user-facing delivery status labels"
)
assert(
  deliveryPage.includes("<CustomerOrderDeliveryStatusForm orders={customerOrders.orders} />") &&
    deliveryPage.includes("<CustomerOrderProofUploadForm orders={customerOrders.orders} />") &&
    deliveryPage.includes('"DELIVERED"') &&
    deliveryPage.includes('"FAILED"') &&
    deliveryPage.includes('"CANCELLED"') &&
    deliveryPage.includes("Customer order deliveries") &&
    deliveryPage.includes("customerOrders ?"),
  "Delivery orders page must support Orders-module delivery updates and delivery history"
)

const hardeningMigration = read(
  "supabase/migrations/202606100009_internal_qa_hardening_v1.sql"
)
for (const fragment of [
  "can_access_stock_location",
  "stock users can read scoped units",
  "stock users can submit scoped draft stock take sessions",
  "stock users can read own scan logs",
  "retail users can update same-day scoped daily sales",
  "retail users can submit same-day daily closings",
]) {
  assert(
    hardeningMigration.includes(fragment),
    `Hardening migration missing: ${fragment}`
  )
}

assert(exists("docs/role-team-access-matrix.md"), "Missing role/team matrix")
assert(exists("docs/manual-qa-checklist.md"), "Missing QA checklist")
for (const doc of [
  "AGENTS.md",
  "docs/erp-testing-plan.md",
  "docs/roles-and-team-isolation.md",
  "docs/workflow-acceptance-checklist.md",
  "docs/known-limitations.md",
]) {
  assert(exists(doc), `Missing hardening artifact: ${doc}`)
}

const manualQaChecklist = read("docs/manual-qa-checklist.md")
for (const fragment of [
  "Mobile navigation happy path",
  "Order workflow happy path",
  "Order scope happy path",
  "Delivery order integration happy path",
  "Delivery order action path",
  "Order outbound transfer path",
  "Order outbound blocked path",
  "ORD-SEED-PICKUP-001",
  "EM-SEED-OUT-001",
  "ORD-SEED-DELIVERY-001",
]) {
  assert(
    manualQaChecklist.includes(fragment),
    `Manual QA checklist missing: ${fragment}`
  )
}

const workflowAcceptanceChecklist = read("docs/workflow-acceptance-checklist.md")
for (const fragment of [
  "## Orders",
  "Order outbound requires a ready customer order before confirmation.",
  "Admin/director-created orders require an outlet scope",
  "Prepared item records `prepared_by`",
  "Delivery-required Orders module records appear in the delivery list",
  "Seeded delivery order `ORD-SEED-DELIVERY-001`",
  "Seeded order outbound can be tested with `ORD-SEED-PICKUP-001`",
  "/delivery/orders` can update Orders-module deliveries",
  "At 390px width, the hamburger opens the mobile drawer.",
  "Director can view stock dashboards/reports and approve stock take, but cannot run routine stock inbound/outbound/transfer/receive/return/no-barcode workflows.",
  "Director can view orders but cannot create, prepare, mark ready, or update delivery status/proof as a routine operator.",
]) {
  assert(
    workflowAcceptanceChecklist.includes(fragment),
    `Workflow acceptance checklist missing: ${fragment}`
  )
}

for (const component of [
  "components/erp/team-scope-badge.tsx",
  "components/ui/empty-state.tsx",
  "components/ui/status-badge.tsx",
  "components/oa-actions/approval-timeline.tsx",
  "components/ui/report-toolbar.tsx",
  "components/ui/recent-activity-list.tsx",
]) {
  assert(exists(component), `Missing reusable component: ${component}`)
}

const orderDeliveryTightening = read(
  "supabase/migrations/202606100027_orders_delivery_role_tightening_v1.sql"
)
assert(
  !orderDeliveryTightening.includes("delivery_team_general_worker") &&
    orderDeliveryTightening.includes("can_insert_order_notification_event") &&
    orderDeliveryTightening.includes('drop policy if exists "orders users can insert notification events"'),
  "Order delivery tightening migration must keep delivery roles out of general order management"
)

for (const migration of listFiles("supabase/migrations").filter((file) =>
  file.endsWith(".sql")
)) {
  const lines = read(`supabase/migrations/${migration}`).split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const createMatch = lines[index].match(/^\s*create policy "([^"]+)"/i)

    if (!createMatch) {
      continue
    }

    const tableLine = lines
      .slice(index + 1, index + 8)
      .find((line) => /^\s*on\s+(public|storage)\.[a-z0-9_]+/i.test(line))
    const tableName = tableLine
      ?.match(/^\s*on\s+((?:public|storage)\.[a-z0-9_]+)/i)?.[1]
    const expectedDrop = `drop policy if exists "${createMatch[1]}" on ${tableName};`

    assert(
      tableName &&
        lines[index - 1]?.trim().toLowerCase() === expectedDrop.toLowerCase(),
      `${migration}:${index + 1} policy "${createMatch[1]}" must be immediately preceded by ${expectedDrop}`
    )
  }
}

console.log("Smoke checks passed.")
