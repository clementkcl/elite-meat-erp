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
  "app/(erp)/debug/profile/page.tsx",
  "app/(erp)/stock/inbound/page.tsx",
  "app/(erp)/stock/outbound/page.tsx",
  "app/(erp)/stock/transfer/page.tsx",
  "app/(erp)/stock/receive-transfer/page.tsx",
  "app/(erp)/stock/return/page.tsx",
  "app/(erp)/stock/stock-take/page.tsx",
  "app/(erp)/stock/units/[id]/page.tsx",
  "app/(erp)/orders/page.tsx",
  "app/(erp)/orders/new/page.tsx",
  "app/(erp)/orders/[id]/page.tsx",
  "app/(erp)/orders/prepare/page.tsx",
  "app/(erp)/delivery/dashboard/page.tsx",
  "app/(erp)/delivery/driver/page.tsx",
  "app/(erp)/debug/build/page.tsx",
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

const authSession = read("lib/auth/session.ts")
assert(
  authSession.includes('.from("profiles")') &&
    authSession.includes('.select("id, email, full_name, department_id, branch_id, outlet_id, stock_location_id")') &&
    authSession.includes('.from("profile_roles")') &&
    authSession.includes('.select("role_key")') &&
    !authSession.includes("profile_roles("),
  "Profile loader must load profile_roles separately instead of embedding profile_roles inside profiles"
)

const debugProfilePage = read("app/(erp)/debug/profile/page.tsx")
for (const fragment of [
  'process.env.NODE_ENV === "production"',
  "notFound()",
  "authUser?.id",
  "authEmail",
  "appLoadedCurrentProfile",
  "profileByAuthId",
  "profilesByAuthEmail",
  "rolesByAuthId",
  "rolesByEmailProfileId",
  "roleNames",
  "moduleAccessRowsForResolvedOutlet",
  "likelyCauseHints",
]) {
  assert(
    debugProfilePage.includes(fragment),
    `Debug profile page missing: ${fragment}`
  )
}

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
const stockPageSource = read("components/stock/stock-page.tsx")
const stockUnitsTableClient = read("components/stock/stock-units-table-client.tsx")
const stockUnitDetail = read("components/stock/stock-unit-detail.tsx")
const stockLabelSource = read("components/stock/stock-label.tsx")
const stockDataSource = read("lib/stock/data.ts")
const itemCodeRules = read("lib/stock/item-code.ts")
const barcodeFieldCount = workflowForms.match(/<BarcodeField/g)?.length ?? 0
assert(
  barcodeFieldCount >= 6,
  `Expected scanner fields in six workflows, found ${barcodeFieldCount}`
)
for (const fragment of [
  "Chinese name",
  "Iban name",
  'placeholder="0007"',
  "Product name",
  "Default brand",
  "Default low stock kg",
  "itemCodeEdited",
  "const canCreateItem",
  "const canUpdateItem",
  "setItemCodeEdited(false)",
  "name=\"itemCode\"",
  "updateItemAction",
  "name=\"isActive\"",
  "Enter name and a numeric item code before creating the item.",
  "Select an item before updating item master details.",
  "defaultValue={selectedItem.itemCode}",
  "defaultValue={selectedItem.defaultBrandId ?? \"\"}",
  "Confirm outbound batch",
  "barcodesJson",
  "const confirmDisabled",
  "setBarcodes([])",
  "disabled={confirmDisabled}",
  "Select order first.",
  "Scan at least one barcode.",
  "Confirm substitution. No reason needed.",
  "No customer name",
  "No photo",
  "Photo required. Stock goes to approval.",
  "const activeItems = items.filter((item) => item.active)",
  "const activeBrands = brands.filter((brand) => brand.active)",
  "const activeOrigins = origins.filter((origin) => origin.active)",
  "const activeLocations = locations.filter((location) => location.active)",
  "function normalizeInboundPreset",
  "initialInboundPreset(items, locations, brands, origins, defaultLocationId)",
  "allowOther",
  "Other / custom brand",
  "Other / custom origin",
  "customer_return",
  "transfer_received",
  "manual_adjustment",
  "Generate internal label",
  "StockLabelPrintActions",
  "Duplicate barcode. Inbound is blocked.",
  "vibrateAndBeep",
  "activeBrandIds.has(preset.brandId)",
  "activeOriginIds.has(preset.originId)",
  "totalWeightKg.toFixed(3)",
  "canOperate: boolean",
  "canManage: boolean",
  "canDirectorApprove: boolean",
  "Counting and scan entry are",
  "for stock operators.",
  "canOperate ?",
  "canManage ?",
  "canDirectorApprove ?",
  "Choose one location, item, and brand.",
  "Barcode progress",
  "Weight progress",
  "Barcode-only count",
  "Wrong item/brand blocked.",
  "Missing barcode adjustment waits for manager",
  "Manager signature:",
  "Director signature:",
  "Damage / spoilage approval",
  "Submit damage request",
  "Return supplier approval",
  "Submit return supplier",
  "Manager approve",
  "Manager review",
  "Director approve",
  "Photo reference",
  "Photo required. Request only; stock is not deducted now.",
  "Stock goes on supplier hold until manager approval.",
]) {
  assert(workflowForms.includes(fragment), `Workflow forms missing: ${fragment}`)
}
for (const fragment of ["PDF fallback", "50mm x 30mm"]) {
  assert(stockLabelSource.includes(fragment), `Stock label missing: ${fragment}`)
}
for (const fragment of [
  "function generatedItemCode",
  "function nextItemCode",
  "padStart(4, \"0\")",
  "function isNumericItemCode",
]) {
  assert(itemCodeRules.includes(fragment), `Item code rules missing: ${fragment}`)
}
assert(
  workflowForms.includes('order.status === "READY_FOR_PICKUP"') &&
    workflowForms.includes('order.status === "READY_FOR_DELIVERY"') &&
    workflowForms.includes("No ready orders yet."),
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
const stockWorkflowRegression = read("scripts/stock-workflow-regression.mjs")
for (const fragment of [
  "5363704999000267800078252512525227068224013687",
  "910293079163102001446",
  "011843560100965431030176701527080810310066026",
  "000844512473539709000",
  "makeInternalBarcode",
  "Generated barcode must be numeric only.",
]) {
  assert(
    stockWorkflowRegression.includes(fragment),
    `Stock workflow regression missing: ${fragment}`
  )
}
assert(
    workflowForms.includes("decodeBarcodeWeight") &&
    workflowForms.includes("fixedWeightKg") &&
    workflowForms.includes("decoded.status === \"decoded\"") &&
    workflowForms.includes("makeUniqueInternalBarcode") &&
    read("lib/stock/barcode-label.ts").includes("weightGrams") &&
    read("lib/stock/barcode-label.ts").includes("blockedBarcodes"),
  "Barcode inbound form must use centralized decoder, avoid auto-save when manual confirmation is required, and generate unused labels"
)
const noBarcodeRoute = read("app/(erp)/stock/no-barcode-inbound/page.tsx")
assert(
  noBarcodeRoute.includes('redirect("/stock/inbound")'),
  "No-barcode inbound route must redirect to Barcode Inbound for MVP label-first flow"
)
assert(
  workflowForms.includes("No-barcode stock needs a label first") &&
    workflowForms.includes("Open Barcode Inbound") &&
    workflowForms.includes("New loose no-barcode balances are disabled") &&
    !workflowForms.includes('submitLabel="Save no-barcode inbound"'),
  "No-barcode UI must guide staff to generate/print a barcode label first"
)
assert(
  stockPageSource.includes("Barcode stock units") &&
    stockPageSource.includes("<StockUnitsTableClient") &&
    stockUnitsTableClient.includes('"use client"') &&
    stockUnitsTableClient.includes("getRowHref={(row) => `/stock/units/${row.id}`}"),
  "Stock balance page must link barcode stock units to the detail/reprint page"
)
assert(
  stockPageSource.includes("Legacy qty") &&
    stockPageSource.includes("Barcode stock with legacy loose balances kept visible") &&
    stockDataSource.includes("Legacy no-barcode weight") &&
    stockDataSource.includes("Visible for old records only"),
  "Stock balance/dashboard must present no-barcode balances as legacy visibility, not an active MVP stock workflow"
)
assert(
  stockPageSource.includes("Elite Meat stock reports") &&
    stockPageSource.includes("Formal stock balance, movement history, inbound, outbound") &&
    stockPageSource.includes("function ReportsFilter") &&
    stockPageSource.includes("<ReportToolbar") &&
    stockDataSource.includes('reportName: "Stock by location"') &&
    stockDataSource.includes('reportName: "Stock by category"') &&
    stockDataSource.includes('reportName: "Stock by inbound age"') &&
    stockDataSource.includes('reportName: "Stock movement history"') &&
    stockDataSource.includes('reportName: "Inbound"') &&
    stockDataSource.includes('reportName: "Outbound"') &&
    stockDataSource.includes('reportName: "Transfer pending"') &&
    stockDataSource.includes('reportName: "Old stock 6 months"') &&
    stockDataSource.includes("sixMonthStockAgeDays") &&
    stockDataSource.includes("twelveMonthStockAgeDays") &&
    stockDataSource.includes('reportName: "Stock take variance"') &&
    stockDataSource.includes('reportName: "Damage/spoilage"') &&
    stockDataSource.includes('reportName: "Return supplier"') &&
    stockDataSource.includes('reportName: "Barcode scan errors"'),
  "Stock reports must cover required formal reports, filters, and export toolbar"
)
assert(
    stockUnitDetail.includes("StockLabelPrintActions") &&
    stockUnitDetail.includes("StockLabelPrintArea") &&
    stockLabelSource.includes('pageSize: "50mm 30mm"') &&
    stockLabelSource.includes("window.print()") &&
    stockLabelSource.includes("Bluetooth label printer") &&
    stockLabelSource.includes("PDF fallback"),
  "Stock unit detail page must support 50mm x 30mm label reprint/export"
)

const stockActions = read("lib/stock/actions.ts")
const stockActionRules = stockActions + read("lib/stock/outbound-rules.ts")
const stockTakeActionRules = stockActions + read("lib/stock/stock-take-rules.ts")
assert(
  stockActions.includes("export async function confirmOrderOutboundAction") &&
    stockActions.includes("export async function confirmDirectOutboundAction") &&
    stockActions.includes('"confirm_order_outbound_batch"') &&
    stockActions.includes('"confirm_direct_outbound_batch"'),
  "Stock outbound must support both order-based and direct atomic batch confirmation"
)
assert(
  stockActions.includes("assertStockLocationAccess"),
  "Stock actions must enforce stock-location access"
)
assert(
  stockActions.includes("export async function noBarcodeInboundAction") &&
    stockActions.includes("No-barcode inbound is disabled for MVP") &&
    !stockActions.includes('.from("no_barcode_stock")'),
  "No-barcode inbound action must block new loose no-barcode stock creation"
)
assert(
  stockActions.includes('canAccessModule(profile, "stock")'),
  "Stock actions must enforce stock module access"
)
assert(
  read("supabase/migrations/202606100048_atomic_stock_return_rpc_v1.sql").includes(
    "status = 'IN_STOCK'"
  ) &&
    read(
      "supabase/migrations/202606100049_atomic_inspection_release_rpc_v1.sql"
    ).includes("set status = 'IN_STOCK'"),
  "Return and inspection release RPCs must restore IN_STOCK status"
)
assert(
  stockActions.includes("export async function releaseInspectionStockAction") &&
    stockActions.includes('"release_inspection_stock_unit"') &&
    stockActions.includes("status !== \"INSPECTION\" && status !== \"HOLD\""),
  "Customer return inspection stock must have a manager/admin release path back to IN_STOCK"
)
assert(
  stockActions.includes("Barcode already exists"),
  "Duplicate inbound barcode must be blocked"
)
assert(
  stockActions.includes("Inactive products cannot receive new inbound stock.") &&
    stockActions.includes("resolveNamedRecordId") &&
    stockActions.includes('"inbound_stock_unit"') &&
    read("supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql").includes(
      "location_id is null"
    ) &&
    read("supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql").includes(
      "insert into public.barcode_weight_rules"
    ),
  "Stock inbound must block inactive items, allow custom brand/origin, save global item/brand/origin barcode rules, and use atomic RPC"
)
assert(
  stockActions.includes("warnIfStockTakeOpen") &&
    stockActions.includes("STOCK_TAKE_OPERATION_WARNING") &&
    stockTakeActionRules.includes("requireStockTakeScopeMatch") &&
    stockTakeActionRules.includes("signature is required.") &&
    stockTakeActionRules.includes("Manager review") &&
    stockTakeActionRules.includes("Director approval") &&
    stockActions.includes("stockManagerRoles") &&
    stockActions.includes("stockDirectorApprovalRoles") &&
    stockActions.includes('"approve_stock_take_session"') &&
    stockActions.includes("p_director_signature: signature"),
  "Stock take actions must warn on scoped open counts, enforce manager review, director approval, signatures, and atomic approval RPC"
)
assert(
  stockActions.includes('const orderOutboundTypes = ["SALES", "TRANSFER", "PROCESSING"]') &&
    !stockActions.includes('"SPOILED"] as const') &&
    stockActions.includes("createDamageRequestAction") &&
    stockActions.includes("reviewDamageRequestAction") &&
    stockActions.includes("approveDamageRequestAction") &&
    stockActions.includes("rejectDamageRequestAction") &&
    stockActions.includes("Damage photo is required.") &&
    stockActions.includes('"approve_stock_damage_request"') &&
    stockActions.includes("p_director_signature: signature") &&
    stockActions.includes("Damage request approved and stock deducted."),
  "Damage/spoilage must use request/review/director approval and atomic RPC before stock deduction"
)
assert(
  stockActions.includes("createReturnSupplierRequestAction") &&
    stockActions.includes("approveReturnSupplierRequestAction") &&
    stockActions.includes("rejectReturnSupplierRequestAction") &&
    stockActions.includes("Supplier name is required.") &&
    stockActions.includes('"approve_stock_return_supplier_request"') &&
    stockActions.includes("p_manager_signature: signature") &&
    stockActions.includes("Return supplier approved and stock deducted."),
  "Return supplier must use request/manager approval and atomic RPC before stock deduction"
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
  "STOCK_TAKE_OPERATION_WARNING",
  "Stock take session created.",
]) {
  assert(stockActionRules.includes(fragment), `Stock action missing: ${fragment}`)
}

const ordersActions = read("lib/orders/actions.ts")
const ordersPage = read("components/orders/orders-page.tsx")
const ordersTableClient = read("components/orders/orders-table-client.tsx")
for (const fragment of [
  "createCustomerOrderAction",
  "parseOrderLines(parsed.itemsJson)",
  "next_customer_order_no_v1",
  "source_type: \"manual_erp\"",
  "total_order_price: parsed.totalOrderPrice",
  "order_stock_reservations",
  "expires_at: reservationExpiresAt",
  "stock_not_enough: stockNotEnough",
  "Order ${orderNo} confirmed and stock reserved.",
  "outletId: optionalId",
  "departmentId: optionalId",
  "scopedOutletId(context.profile, parsed.outletId)",
  "scopedDepartmentId(context.profile, parsed.departmentId)",
  "Choose an outlet before creating orders.",
  '"INTERNAL_TRANSFER"',
  "pickOrderBarcodeAction",
  "manualPickWeightAction",
  "order_picking_entries",
  "Wrong item scanned. Mismatch recorded.",
  "Duplicate barcode. This barcode is already picked for the order.",
  "Manual picking needs quantity or weight.",
  "markCustomerOrderReadyAction",
  "Pick every item within the 10kg tolerance before marking ready.",
  "prepared_quantity",
  "prepared_weight_kg",
  "READY_FOR_PICKUP",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "cancelCustomerOrderAction",
  "Order cancelled and reserved stock released.",
  "CUSTOMER_ORDER_CANCELLED_V1",
  "markPickupCompletedAction",
  "CUSTOMER_ORDER_PICKED_UP_V1",
  "allowedDeliveryStatuses",
  "Delivery order cannot move from",
  "Only delivery-required customer orders can be updated here.",
  "Only delivery-required customer orders can receive proof photos.",
  "Proof photos can only complete customer orders after they are out for delivery.",
  "Proof of delivery must be a photo image file.",
  "assertProofBeforeDeliveryCompletion(order, parsed.status)",
  "Upload proof of delivery before marking this customer order delivered or failed.",
  "proof_file_id",
  'status: "RELEASED"',
  '.eq("status", "ACTIVE")',
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
  "Create confirmed order",
  "itemsJson",
  "Search name or phone",
  "Credit overdue warning. Order is not blocked.",
  "Processing required",
  "Estimated kg is needed for stock reservation.",
  "pickOrderBarcodeAction",
  "manualPickWeightAction",
  "manualPickReasons.map",
  "Wrong item scans are recorded as mismatches.",
  "submitDisabled={readyCandidates.length === 0}",
  "disabled={deliveryOrders.length === 0}",
  "disabled={statusOptions.length === 0}",
  "cancelCustomerOrderAction",
  "Cancelling releases active reservations.",
  "markPickupCompletedAction",
]) {
  assert(ordersForms.includes(fragment), `Order form UX guard missing: ${fragment}`)
}
assert(
  ordersPage.includes("<OrdersTableClient") &&
    ordersTableClient.includes('"use client"') &&
    ordersTableClient.includes("getRowHref={(row) => `/orders/${row.id}`}"),
  "Orders list must link rows to order detail pages"
)
assert(
  ordersPage.includes("Orders unavailable") &&
    ordersPage.includes("Check that the Orders migrations were applied in order.") &&
    !ordersPage.includes("getOrderDetailData"),
  "Orders page must show setup errors and avoid duplicate detail data loads"
)
assert(
  ordersPage.includes("EditOrderBeforePickingForm") &&
    ordersPage.includes("selectedOrderId={detailOrder.id}") &&
    ordersPage.includes("MarkReadyForm") &&
    ordersPage.includes("ReadyOrderActions") &&
    ordersTableClient.includes("reservationRows(reservations)") &&
    ordersTableClient.includes("pickingRows(entries"),
  "Order detail page must support edit-before-picking, picking, mark-ready, pickup, and cancellation workflows"
)
assert(
  ordersPage.includes("requireCurrentProfile") &&
    ordersPage.includes("scopeOptions={data.scopeOptions}") &&
    ordersPage.includes('route === "create"') &&
    ordersPage.includes('route === "picking"') &&
    ordersPage.includes('route === "ready"') &&
    ordersPage.includes('route === "customers"'),
  "Order creation page must pass current profile and scope options into the form"
)

const ordersData = read("lib/orders/data.ts")
assert(
  ordersData.includes("scopeOptions: {") &&
    ordersData.includes(".filter((row) => readBoolean(row.is_active, true))") &&
    ordersData.includes("stockItemOptions"),
  "Order data must expose scope options and only offer active stock items for new order lines"
)
assert(
  ordersData.includes('loadRows("order_stock_reservations")') &&
    ordersData.includes('loadRows("order_picking_entries")') &&
    ordersData.includes("mapReservation") &&
    ordersData.includes("mapPickingEntry"),
  "Order data must expose stock reservations and picking entries"
)
assert(
  ordersData.includes("isSupabaseConfigured") &&
    ordersData.includes("Orders data could not load") &&
    ordersData.includes("return demoData(filters)"),
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
  "cross join (",
  "('accounting_finance')",
  "('director_reports')",
  "'clementkc@elitempsb.com'",
  "'clementkl@elitempsb.com'",
  "'clementkcl@elitempsb.com'",
  "delete from public.profile_roles role",
  "('admin')",
  "('director')",
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
  "was not found or is inactive.",
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

const directOutboundMigration = read(
  "supabase/migrations/202606100041_direct_outbound_batches_v1.sql"
)
for (const fragment of [
  "alter table public.stock_outbound_batches",
  "alter column order_id drop not null",
  "alter table public.stock_outbound_batch_lines",
  "create or replace function public.can_access_stock_outbound_batch",
  "drop policy if exists \"stock users can read scoped outbound batches\"",
  "drop policy if exists \"stock users can insert scoped outbound batches\"",
  "drop policy if exists \"stock users can update scoped outbound batches\"",
  "drop policy if exists \"stock users can read scoped outbound batch lines\"",
  "drop policy if exists \"stock users can insert scoped outbound batch lines\"",
  "create or replace function public.confirm_direct_outbound_batch",
  "p_outbound_type not in ('SALES', 'TRANSFER', 'PROCESSING')",
  "session.status in ('DRAFT', 'SUBMITTED', 'REVIEWED')",
  "insert into public.stock_outbound_batches",
  "insert into public.stock_outbound_batch_lines",
  "order_id,",
  "null,",
  "'DOUT-'",
  "'DIRECT_OUTBOUND_CONFIRMED'",
  "grant execute on function public.confirm_direct_outbound_batch",
]) {
  assert(
    directOutboundMigration.includes(fragment),
    `Direct outbound migration missing: ${fragment}`
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

const stockInboundLabelsRulesMigration = read(
  "supabase/migrations/202606100037_stock_inbound_labels_rules_v1.sql"
)
for (const fragment of [
  "drop constraint if exists items_item_code_numeric_only_check",
  "item_code ~ '^[0-9]+$'",
  "customer_return",
  "transfer_received",
  "manual_adjustment",
  "alter column location_id drop not null",
  "idx_barcode_weight_rules_item_brand_origin",
  "drop policy if exists \"stock users can read scoped barcode weight rules\"",
  "location_id is null and public.can_manage_stock()",
  "with check (public.can_manage_stock())",
  "using (public.can_administer_stock())",
]) {
  assert(
    stockInboundLabelsRulesMigration.includes(fragment),
    `Stock inbound labels/rules migration missing: ${fragment}`
  )
}

const itemMasterAllRolesMigration = read(
  "supabase/migrations/202606100044_item_master_all_roles_v1.sql"
)
for (const fragment of [
  "create or replace function public.can_edit_item_master()",
  "public.has_role('account')",
  "drop policy if exists \"stock admins can insert items\"",
  "drop policy if exists \"all erp users can insert item master\"",
  "create policy \"all erp users can insert item master\"",
  "with check (public.can_edit_item_master())",
  "create policy \"all erp users can update item master\"",
  "using (public.can_edit_item_master())",
  "create policy \"stock admins can delete items\"",
  "using (public.can_administer_stock())",
]) {
  assert(
    itemMasterAllRolesMigration.includes(fragment),
    `Item master all-roles migration missing: ${fragment}`
  )
}

const itemMasterDefaultBrandMigration = read(
  "supabase/migrations/202606100045_item_master_default_brand_v1.sql"
)
for (const fragment of [
  "add column if not exists default_brand_id",
  "references public.brands(id) on delete set null",
  "drop constraint if exists items_category_section_name_key",
  "idx_items_category_default_brand_section_name_unique",
  "on public.items(category, default_brand_id, section, name)",
  "nulls not distinct",
  "idx_items_default_brand",
]) {
  assert(
    itemMasterDefaultBrandMigration.includes(fragment),
    `Item master default brand migration missing: ${fragment}`
  )
}

const stockTakeScopedApprovalMigration = read(
  "supabase/migrations/202606100038_stock_take_scoped_approval_v1.sql"
)
for (const fragment of [
  "add column if not exists item_id",
  "add column if not exists brand_id",
  "manager_reviewed_by",
  "manager_signature",
  "director_approved_by",
  "director_signature",
  "create or replace function public.can_manage_stock_take()",
  "create or replace function public.can_director_approve_stock_take()",
  "drop policy if exists \"stock managers can review stock take sessions\"",
  "create policy \"stock managers can review stock take sessions\"",
  "create policy \"stock directors can approve reviewed stock take sessions\"",
  "session.item_id = stock_take_lines.item_id",
  "session.brand_id is not distinct from stock_take_lines.brand_id",
]) {
  assert(
    stockTakeScopedApprovalMigration.includes(fragment),
    `Stock take scoped approval migration missing: ${fragment}`
  )
}

const stockDamageApprovalMigration = read(
  "supabase/migrations/202606100039_stock_damage_approval_v1.sql"
)
for (const fragment of [
  "create table if not exists public.stock_damage_requests",
  "photo_path text not null",
  "idx_stock_damage_requests_open_unit",
  "status in ('SUBMITTED', 'MANAGER_REVIEWED')",
  "create policy \"stock users can create scoped damage requests\"",
  "create policy \"stock managers can review damage requests\"",
  "create policy \"stock directors can approve damage requests\"",
  "using (public.can_administer_stock())",
]) {
  assert(
    stockDamageApprovalMigration.includes(fragment),
    `Stock damage approval migration missing: ${fragment}`
  )
}

const stockReturnSupplierApprovalMigration = read(
  "supabase/migrations/202606100040_stock_return_supplier_approval_v1.sql"
)
for (const fragment of [
  "alter type public.stock_movement_type add value if not exists 'OUTBOUND_RETURN_SUPPLIER'",
  "create table if not exists public.stock_return_supplier_requests",
  "supplier_name text not null",
  "idx_stock_return_supplier_requests_open_unit",
  "create policy \"stock users can create scoped return supplier requests\"",
  "create policy \"stock managers can review return supplier requests\"",
  "using (public.can_administer_stock())",
]) {
  assert(
    stockReturnSupplierApprovalMigration.includes(fragment),
    `Stock return supplier approval migration missing: ${fragment}`
  )
}

const atomicStockApprovalMigration = read(
  "supabase/migrations/202606100042_atomic_stock_approval_rpcs_v1.sql"
)
for (const fragment of [
  "drop function if exists public.approve_stock_damage_request(uuid, text)",
  "drop function if exists public.approve_stock_return_supplier_request(uuid, text)",
  "create or replace function public.approve_stock_damage_request",
  "create or replace function public.approve_stock_return_supplier_request",
  "for update",
  "public.can_director_approve_stock_take()",
  "public.can_manage_stock_take()",
  "status = 'DIRECTOR_APPROVED'",
  "status = 'MANAGER_REVIEWED'",
  "'OUTBOUND_SPOILED'",
  "'OUTBOUND_RETURN_SUPPLIER'",
  "'DAMAGE_REQUEST_DIRECTOR_APPROVED'",
  "'RETURN_SUPPLIER_REQUEST_APPROVED'",
  "'atomic', true",
  "grant execute on function public.approve_stock_damage_request(uuid, text) to authenticated",
  "grant execute on function public.approve_stock_return_supplier_request(uuid, text) to authenticated",
]) {
  assert(
    atomicStockApprovalMigration.includes(fragment),
    `Atomic stock approval migration missing: ${fragment}`
  )
}

const atomicStockTakeApprovalMigration = read(
  "supabase/migrations/202606100043_atomic_stock_take_approval_rpc_v1.sql"
)
for (const fragment of [
  "drop function if exists public.approve_stock_take_session(uuid, text)",
  "create or replace function public.approve_stock_take_session",
  "returns integer",
  "for update",
  "public.can_director_approve_stock_take()",
  "public.can_access_stock_location(session_record.location_id)",
  "line_record.item_id <> session_record.item_id",
  "line_record.brand_id is distinct from session_record.brand_id",
  "'STOCK_TAKE_ADJUSTMENT'",
  "status = 'APPROVED'",
  "'STOCK_TAKE_APPROVED'",
  "'adjustmentCount', adjustment_count",
  "'atomic', true",
  "grant execute on function public.approve_stock_take_session(uuid, text) to authenticated",
]) {
  assert(
    atomicStockTakeApprovalMigration.includes(fragment),
    `Atomic stock take approval migration missing: ${fragment}`
  )
}

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
  "Module access for selected outlet",
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
  "outletModules",
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
const deliveryDriverRoute = read("app/(erp)/delivery/driver/page.tsx")
const deliveryDriverPage = read("components/delivery/driver-mobile-delivery-page.tsx")
const buildDebugPage = read("app/(erp)/debug/build/page.tsx")
assert(
  deliveryDriverRoute.includes("DriverMobileDeliveryPage") &&
    !deliveryDriverRoute.includes('import { DeliveryPage }') &&
    !deliveryDriverRoute.includes('DeliveryPage route="driver"') &&
    deliveryDriverPage.includes('"Available"') &&
    deliveryDriverPage.includes('"My Deliveries"') &&
    deliveryDriverPage.includes('"Completed"') &&
    deliveryDriverPage.includes('"Failed"') &&
    deliveryDriverPage.includes('"Expenses"') &&
    deliveryDriverPage.includes("Complete Delivery") &&
    deliveryDriverPage.includes("Report Failed") &&
    deliveryDriverPage.includes("Mark Loaded") &&
    !deliveryDriverPage.includes("New Order"),
  "Delivery driver route must render V1 tabs and next-action UI, not legacy delivery"
)
assert(
  buildDebugPage.includes("VERCEL_GIT_COMMIT_REF") &&
    buildDebugPage.includes("VERCEL_GIT_COMMIT_SHA") &&
    buildDebugPage.includes("NEXT_PUBLIC_SUPABASE_URL") &&
    buildDebugPage.includes("Supabase ref"),
  "Build debug page must expose branch, commit, environment, and Supabase ref"
)
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
  ordersActions.includes("parseOrderLines(parsed.itemsJson)") &&
    ordersActions.includes("order_stock_reservations") &&
    ordersActions.includes("Order ${orderNo} confirmed and stock reserved.") &&
    ordersActions.includes("Order cancelled and reserved stock released."),
  "Order V1 must reserve stock at confirmed creation and release active reservations on cancellation"
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
  ordersPage.includes("delivery failed") ||
    ordersData.includes("Delivery failed") ||
    ordersData.includes("failedReturnStatus"),
  "Orders module must keep delivery failed/return alert coverage"
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
    deliveryPage.includes("Vehicle maintenance unavailable") &&
    deliveryPage.includes("Delivery payment entry unavailable"),
  "Delivery UI must keep director/view roles away from routine delivery operation controls"
)

const stockPage = read("components/stock/stock-page.tsx")
const stockReportExport = read("lib/stock/report-export.ts")
assert(
  stockPage.includes("Order outbound unavailable") &&
    stockPage.includes("Check that the Orders migrations were applied before using") &&
    stockPage.includes("ordersResult?.ordersData"),
  "Stock outbound must show a setup error when Orders data cannot load"
)
assert(
  workflowForms.includes("orderItems: CustomerOrderItem[]") &&
    workflowForms.includes("Check before confirm") &&
    workflowForms.includes("Weight difference is allowed.") &&
    workflowForms.includes("Substitution scanned") &&
    workflowForms.includes("Confirm substitution. No reason needed.") &&
    stockPage.includes("orderItems={ordersResult.ordersData.items}"),
  "Order outbound must warn on requested-vs-scanned differences and visible substitutions while allowing MVP substitution"
)
assert(
  stockPage.includes("const stockOperatorRoles: UserRole[] = stockRoles.filter") &&
    stockPage.includes("const stockItemMasterRoles: UserRole[]") &&
    stockPage.includes("defaultBrandName") &&
    stockPage.includes('"account"') &&
    stockPage.includes("items: stockItemMasterRoles") &&
    stockPage.includes('role !== "director"') &&
    stockPage.includes("const stockRouteRoles: Partial<Record<StockRoute, UserRole[]>>") &&
    stockPage.includes("stockRouteRoles[route] ?? stockRoles") &&
    stockPage.includes("canOperateStock") &&
    stockPage.includes("canManageStockTake") &&
    stockPage.includes("canDirectorApproveStockTake"),
  "Stock pages must block director from routine stock operation routes while preserving stock view routes"
)
assert(
  stockPage.includes("NegativeStockAlertPanel") &&
    stockPage.includes("NEGATIVE_STOCK") &&
    stockReportExport.includes("Negative stock alerts:"),
  "Stock pages must surface temporary negative stock alerts in UI and report summaries"
)
assert(
  stockPage.includes("StockAgeAlertPanel") &&
    stockReportExport.includes("Stock age alerts:") &&
    stockPage.includes("OVER_12_MONTHS"),
  "Stock pages must surface 6-month and 12-month stock age alerts in UI and report summaries"
)
assert(
  stockPage.includes("TransferPendingAlertPanel") &&
    stockPage.includes("Transfer receive overdue") &&
    stockReportExport.includes("Overdue transfer alerts:"),
  "Stock pages must surface transfers pending receive for more than 3 days"
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
assert(
  stockData.includes("buildTransferPendingAlerts") &&
    stockData.includes("overdueTransferDays = 3") &&
    stockData.includes('movement.movementType === "OUTBOUND_TRANSFER"') &&
    stockData.includes("transferPendingAlerts"),
  "Stock data must centralize transfer-pending-over-3-days alert calculation"
)

const appShell = read("components/erp/app-shell.tsx")
const homePage = read("components/dashboard/home-page.tsx")
assert(
  homePage.includes('href: "/orders/create"') &&
    homePage.includes('label: "Orders"') &&
    homePage.includes('href: "/orders/picking"') &&
    homePage.includes('label: "Order Picking"'),
  "Home shortcuts must include order creation and picking for eligible users"
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
    homePage.includes("const stockItemMasterRoles: UserRole[]") &&
    homePage.includes('href: "/stock/items"') &&
    homePage.includes('label: "Item Master"') &&
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
  appShell.includes("const stockItemMasterRoles: UserRole[]") &&
    appShell.includes('href: "/stock/items"') &&
    appShell.includes("roles: stockItemMasterRoles") &&
    appShell.includes('prefix: "/stock/items"') &&
    appShell.includes('moduleName: "Item Master"'),
  "Sidebar and route guard must allow all stock-module users to reach item master without opening stock operations"
)
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
    !appShell.includes('href: "/stock/no-barcode-inbound"') &&
    !appShell.includes('prefix: "/stock/no-barcode-inbound"'),
  "Sidebar and route guard must split routine stock operator routes from director stock viewing"
)
assert(
  /const orderRoles:[\s\S]*?delivery_team_general_worker/.test(appShell) &&
    /const orderRoles:[\s\S]*?delivery_team_general_worker/.test(ordersActions),
  "Order V1 must allow delivery general workers with Orders module access"
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

const atomicTransferMigration = read(
  "supabase/migrations/202606100047_atomic_transfer_receive_rpcs_v1.sql"
)
for (const fragment of [
  "drop function if exists public.transfer_stock_unit",
  "create or replace function public.transfer_stock_unit",
  "drop function if exists public.receive_stock_transfer",
  "create or replace function public.receive_stock_transfer",
  "for update",
  "status = 'TRANSFER_PENDING'",
  "status = 'TRANSFERRED'",
  "location_id = p_receive_location_id",
  "'atomic', true",
  "grant execute on function public.transfer_stock_unit",
  "grant execute on function public.receive_stock_transfer",
]) {
  assert(
    atomicTransferMigration.includes(fragment),
    `Atomic transfer migration missing: ${fragment}`
  )
}
assert(
  stockActions.includes('"transfer_stock_unit"') &&
    stockActions.includes('"receive_stock_transfer"') &&
    !stockActions.includes('action: "TRANSFER_CREATED"') &&
    !stockActions.includes('message: "Transfer receive scan accepted",\n      scannedBy: context.profile.id'),
  "Transfer and receive-transfer actions must use atomic RPCs for unit update, movement, scan log, and audit"
)

const atomicReturnMigration = read(
  "supabase/migrations/202606100048_atomic_stock_return_rpc_v1.sql"
)
for (const fragment of [
  "drop function if exists public.return_stock_unit",
  "create or replace function public.return_stock_unit",
  "for update",
  "status = 'IN_STOCK'",
  "location_id = p_location_id",
  "transfer_to_location_id = null",
  "Barcode is waiting for inspection release",
  "'atomic', true",
  "grant execute on function public.return_stock_unit",
]) {
  assert(
    atomicReturnMigration.includes(fragment),
    `Atomic return migration missing: ${fragment}`
  )
}
assert(
  stockActions.includes('"return_stock_unit"') &&
    stockActions.includes("status === \"HOLD\" || status === \"INSPECTION\"") &&
    stockActions.includes("Barcode is waiting for inspection release"),
  "Return action must use atomic RPC and keep inspection release separate from normal return"
)

const atomicInspectionReleaseMigration = read(
  "supabase/migrations/202606100049_atomic_inspection_release_rpc_v1.sql"
)
for (const fragment of [
  "drop function if exists public.release_inspection_stock_unit",
  "create or replace function public.release_inspection_stock_unit",
  "for update",
  "unit_record.status not in ('HOLD', 'INSPECTION')",
  "set status = 'IN_STOCK'",
  "'INSPECTION_RELEASE'",
  "'STOCK_INSPECTION_RELEASED'",
  "'atomic', true",
  "grant execute on function public.release_inspection_stock_unit",
]) {
  assert(
    atomicInspectionReleaseMigration.includes(fragment),
    `Atomic inspection release migration missing: ${fragment}`
  )
}
assert(
  stockActions.includes('"release_inspection_stock_unit"') &&
    !stockActions.includes('"STOCK_INSPECTION_RELEASED",\n      "stock_movements",\n      movementId'),
  "Inspection release action must use atomic RPC for unit update, movement, scan log, and audit"
)

assert(exists("docs/role-team-access-matrix.md"), "Missing role/team matrix")
assert(exists("docs/manual-qa-checklist.md"), "Missing QA checklist")
assert(exists("docs/STOCK_QA_RUNBOOK.md"), "Missing stock QA runbook")
assert(exists("docs/STOCK_QA_EVIDENCE.md"), "Missing stock QA evidence log")
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

const stockQaRunbook = read("docs/STOCK_QA_RUNBOOK.md")
for (const fragment of [
  "## Acceptance Tests",
  "Inbound scan works",
  "Duplicate barcode blocked",
  "Barcode weight rule saved/reused",
  "Barcode label printing works",
  "Order-based outbound works",
  "Transfer/receive works",
  "Damage/spoilage approval works",
  "Stock take approval works",
  "No-barcode-to-barcode flow works",
  "Reports/export work",
  "Role/outlet isolation works",
  "Mobile scanner works",
  "EM-SEED-RETURN-INSPECTION-001",
  "## Phone QA",
  "## Desktop QA",
]) {
  assert(
    stockQaRunbook.includes(fragment),
    `Stock QA runbook missing: ${fragment}`
  )
}

const stockQaEvidence = read("docs/STOCK_QA_EVIDENCE.md")
for (const fragment of [
  "## Acceptance Test Evidence",
  "Inbound scan works",
  "Duplicate barcode blocked",
  "Barcode weight rule saved/reused",
  "Barcode label printing works",
  "Order-based outbound works",
  "Transfer/receive works",
  "Damage/spoilage approval works",
  "Stock take approval works",
  "No-barcode-to-barcode flow works",
  "Reports/export work",
  "Role/outlet isolation works",
  "Mobile scanner works",
  "Automated tests exist",
  "## Outbound Workflow Evidence",
  "## Transfer Evidence",
  "## Damage And Return Evidence",
  "Customer return after sale goes to `INSPECTION` first, cannot be outbounded",
  "## Stock Take Evidence",
  "## RLS / Scope Evidence",
  "## Phone Scanner Evidence",
  "## Desktop Scanner Evidence",
  "## Final Sign-Off",
]) {
  assert(
    stockQaEvidence.includes(fragment),
    `Stock QA evidence log missing: ${fragment}`
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
  "Director can view stock dashboards/reports and approve stock take, but cannot run routine stock inbound/outbound/transfer/receive/return workflows.",
  "/stock/no-barcode-inbound` redirects to Barcode Inbound and new loose no-barcode inbound is blocked server-side.",
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
