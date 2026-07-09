import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertIncludes(source, needle, label) {
  assert(source.includes(needle), `${label} missing: ${needle}`)
}

function assertNotIncludes(source, needle, label) {
  assert(!source.includes(needle), `${label} must not include: ${needle}`)
}

function sliceBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker)

  assert(start >= 0, `${label} missing start marker: ${startMarker}`)

  const end = source.indexOf(endMarker, start + startMarker.length)

  assert(end >= 0, `${label} missing end marker: ${endMarker}`)

  return source.slice(start, end)
}

const packageJson = read("package.json")
const ordersPage = read("components/orders/orders-page.tsx")
const ordersForms = read("components/orders/orders-forms.tsx")
const ordersTable = read("components/orders/orders-table-client.tsx")
const ordersData = read("lib/orders/data.ts")
const newRoute = read("app/(erp)/orders/new/page.tsx")
const prepareRoute = read("app/(erp)/orders/prepare/page.tsx")
const reportsRoute = read("app/(erp)/orders/reports/page.tsx")
const brandCustomizationMigration = read(
  "supabase/migrations/202606250001_order_line_brand_customization_v1.sql"
)

assertIncludes(
  packageJson,
  "order-ux-simplification-coverage.mjs",
  "npm run smoke"
)

const advancedUserFunction = sliceBetween(
  ordersPage,
  "function isAdvancedOrderUser",
  "function isDeliveryWorker",
  "Advanced order role gate"
)

for (const role of [
  "retail_manager",
  "delivery_manager",
  "processing_manager",
  "admin",
  "director",
]) {
  assertIncludes(advancedUserFunction, role, "Advanced order role gate")
}

for (const role of [
  "retail_team_general_worker",
  "delivery_team_general_worker",
  "processing_team_general_worker",
  "account",
]) {
  assertNotIncludes(advancedUserFunction, role, "Advanced order role gate")
}

const orderHome = sliceBetween(
  ordersPage,
  "function TaskActionGrid",
  "function AdvancedOrdersSection",
  "/orders task home"
)
const advancedOrdersSection = sliceBetween(
  ordersPage,
  "function AdvancedOrdersSection",
  "function OrderSummary",
  "/orders advanced section"
)

assertIncludes(ordersPage, "function isDeliveryWorker", "Orders page")
assertIncludes(
  ordersPage,
  "Create, pick, price, and move orders through one simple workflow.",
  "Orders page header"
)
assertNotIncludes(
  ordersPage,
  "Manual ERP order flow",
  "Orders page header"
)
assertIncludes(
  ordersPage,
  '<Link href="/orders/ready">Price / Ready</Link>',
  "Orders page header"
)
assertIncludes(ordersPage, "function workerPriceText", "Worker order price display")
assertIncludes(ordersPage, 'return "After picking"', "Worker order price display")
assertIncludes(
  ordersPage,
  '!["NEW", "PREPARING", "READY"].includes(order.status)',
  "Worker order price display"
)
assertIncludes(ordersPage, "function workerStatusText", "Worker order status display")
assertIncludes(ordersPage, 'return "Pending Delivery"', "Worker order status display")
assertIncludes(
  ordersPage,
  "<StatusBadge value={workerStatusText(order)}",
  "Worker order status display"
)
assertIncludes(ordersForms, "function orderWorkflowLabel", "Worker order form status display")
assertIncludes(ordersForms, 'return "Pending Delivery"', "Worker order form status display")
assertIncludes(
  ordersForms,
  "orderWorkflowLabel(order)",
  "Worker order form status display"
)

for (const fragment of [
  "Create Order",
  "Pick Order",
  "Price / Ready",
  "Driver Delivery",
  "Today jobs and proof photo",
  'href: "/delivery/driver"',
  "Delivery Dashboard",
  "Delivery overview",
  "Customers",
  "Reports",
  'href: "/orders/reports"',
  "function ManagerTodayProgress",
  "Today order progress",
  "Quick manager view before opening advanced lists or reports.",
  "Need action",
  "Pending delivery",
  "Completed",
  "<ManagerTodayProgress orders={orders} />",
  "Today&apos;s order work",
  "Start with the next task:",
  "Pick Items",
  "Enter final price",
  "Pickup / Delivery",
  "Final price, pickup, delivery",
  "Need Picking",
  "Ready for Pickup",
  "Pending Delivery",
  "Delivery team can see these orders now.",
  "Open Delivery",
  "Price Required",
  "Stock Not Enough",
  "Processing Required",
]) {
  assertIncludes(orderHome, fragment, "/orders task home")
}

assert(
  orderHome.indexOf("<ManagerTodayProgress orders={orders} />") <
    orderHome.indexOf("Today&apos;s order work"),
  "/orders task home manager progress should render before worker task copy"
)

const listRoute = sliceBetween(
  ordersPage,
  '{route === "list" ?',
  '{route === "create" ?',
  "/orders list route"
)

assertIncludes(listRoute, "<OrdersTaskHome", "/orders list route")
assertIncludes(listRoute, "advancedOrderUser ?", "/orders list route")
assertIncludes(listRoute, "<AdvancedOrdersSection", "/orders list route")
assertNotIncludes(listRoute, "<OrdersTableClient", "/orders list route")
assertIncludes(ordersPage, 'route === "ready"\n                ? "Price / Ready"', "/orders/ready title")
assertNotIncludes(orderHome, "<Alerts", "/orders task home")
assertIncludes(
  advancedOrdersSection,
  "<Alerts alerts={data.dashboard.alerts}",
  "/orders advanced alerts"
)

const reportsPageRoute = sliceBetween(
  ordersPage,
  '{route === "reports" ?',
  "{detailOrder ?",
  "/orders/reports route"
)

for (const fragment of [
  "advancedOrderUser ?",
  "<OrderReportsClient",
  "Order reports are available to managers, admins, and directors.",
]) {
  assertIncludes(reportsPageRoute, fragment, "/orders/reports route")
}

assertIncludes(reportsRoute, 'route="reports"', "/orders/reports page")
assertIncludes(ordersTable, "export function OrderReportsClient", "Order reports client")
assertNotIncludes(
  sliceBetween(
    ordersTable,
    "export function OrdersTableClient",
    "export function OrderReportsClient",
    "Advanced order table"
  ),
  "<CardTitle>Reports</CardTitle>",
  "Advanced order table"
)

const orderSummary = sliceBetween(
  ordersPage,
  "function OrderSummary",
  "function DetailAlerts",
  "/orders detail summary"
)

for (const fragment of [
  "advancedOrderUser: boolean",
  "{advancedOrderUser ? (",
  "order.sourceType",
  "Created by",
  "Final price",
  "Outlet",
  "Reservation expires",
]) {
  assertIncludes(orderSummary, fragment, "/orders detail summary")
}

assertIncludes(
  ordersPage,
  "advancedOrderUser={advancedOrderUser}",
  "/orders detail summary role gate"
)

const detailRoute = sliceBetween(
  ordersPage,
  "{detailOrder ? (",
  ") : route === \"detail\" ?",
  "/orders detail route"
)

for (const fragment of [
  "advancedOrderUser ? (",
  "<StatusTimeline",
  "Activity log",
  "detailCanEdit ?",
  "<EditOrderBeforePickingForm",
]) {
  assertIncludes(detailRoute, fragment, "/orders detail route")
}

assertIncludes(
  ordersPage,
  'const detailCanEdit = detailOrder?.status === "NEW"',
  "/orders detail edit gate"
)

const createForm = sliceBetween(
  ordersForms,
  "export function CreateOrderForm",
  "export function QuickCustomerForm",
  "/orders/create guided form"
)

for (const fragment of [
  "function CreateOrderFastGuide",
  "Worker fast path",
  "Customer or transfer",
  "Tap order type",
  "Add items",
  "Save order",
  "Price later",
  "Use search, quick add, and recent items to avoid typing.",
  "function CreateOrderSuccessNextStep",
  "Order created. Pick items next.",
  "Order saved",
  "Stock checked",
  "Open picking",
  "Stock shortage stays visible in picking. Do not create the same order",
  "function CreateOrderErrorNextStep",
  "Order not saved yet",
  "Read the red message",
  "Fix the highlighted step",
  "Try Create Order again",
  'href="/orders/picking"',
  "Go to Picking",
  "Back to Orders",
  "const sortedCustomers = [...customers].sort",
  "a.name.localeCompare(b.name)",
  "initialCustomerId",
  "const initialCustomer = sortedCustomers.find",
  "useState(initialCustomer?.id ?? \"\")",
  "initialCustomer?.address ?? \"\"",
  "initialCustomer?.remarks ?? \"\"",
  "const canSeeOrderCreditWarning",
  "canSeeOrderCreditWarning && selectedCustomer?.hasOverdueCredit",
  "Delivery address (saved to new customer)",
  "New delivery customer uses name, phone, and this address.",
]) {
  assertIncludes(ordersForms, fragment, "/orders/create helper UX")
}

const createCreditWarningGate = sliceBetween(
  ordersForms,
  "const canSeeOrderCreditWarning",
  "const [fulfillmentType",
  "/orders/create credit warning role gate"
)

for (const role of [
  "retail_manager",
  "delivery_manager",
  "processing_manager",
  "admin",
  "director",
]) {
  assertIncludes(createCreditWarningGate, role, "/orders/create credit warning role gate")
}

for (const role of [
  "retail_team_general_worker",
  "delivery_team_general_worker",
  "processing_team_general_worker",
  "account",
]) {
  assertNotIncludes(createCreditWarningGate, role, "/orders/create credit warning role gate")
}

for (const fragment of [
  '"Customer / Transfer"',
  '"Order Type"',
  '"Items"',
  '"Create Order"',
  "Step 1 Customer / Transfer",
  "Step 2 Order Type",
  "Step 3 Items",
  "Step 4 Create Order",
  "Brand / manufacturer preference",
  "No brand preference",
  "Picker chooses the brand/manufacturer during picking.",
  "Selected brand has no stock. Choose another brand or no brand preference.",
  "Weight orders use estimated kg only.",
  'line.orderingUnit === "KG"',
  "Customization",
  "Pick at least one chip in each group.",
  "min-h-11 whitespace-normal text-left",
  "Quantity + estimated kg",
  'placeholder="Quantity"',
  'placeholder="Estimated kg"',
  'inputMode="decimal"',
  "const createOrderFinalSteps",
  "Final order check",
  "Save now. Final total price is entered after picking.",
  "Special price remark (optional)",
  "Add ordered items and estimated kg for picking.",
  "Check customer",
  "Check items kg",
  "Enter final price",
  "<CreateOrderFastGuide />",
  "Pickup",
  "Delivery",
  "Delivery sees progress, accepts later",
  "Internal Transfer",
  "validationForStep",
  "goToStep",
  "onSubmit={handleFormSubmit}",
  "Select a customer or enter name and phone.",
  "Select order type.",
  'fulfillmentType !== "INTERNAL_TRANSFER"',
  "Enter delivery address for new delivery customer.",
  "Enter delivery address.",
  "Select pickup location.",
  "Select transfer from and to locations.",
  "const hasCustomer",
  "Add at least one item.",
  "Items and brand ready",
  "Selected customer",
  "Quick add customer",
  "Quick add name",
  "Quick add phone",
  "Search by name or phone, quick add, or skip for internal transfer.",
  "Internal transfer - skip customer",
  "Required date/time",
  "Location / address",
  "Estimated weight",
  "Create Order",
  "Recent items",
  "Tap a recent item to add it without typing the item name.",
  "adding an item.",
  'aria-label="Customer request for item"',
  'placeholder="Customer request"',
  "Needs processing",
  "Estimated kg is needed for picking.",
  "min-h-11 justify-start",
  "Stock check",
  "Brand checked before save",
  "<CreateOrderSuccessNextStep />",
  "<CreateOrderErrorNextStep />",
]) {
  assertIncludes(createForm, fragment, "/orders/create guided form")
}

for (const fragment of ["itemPrice", "paymentStatus", "outstandingAmount"]) {
  assertNotIncludes(createForm, fragment, "/orders/create guided form")
}

assertNotIncludes(
  createForm,
  "step !== steps.length && submitDisabled",
  "/orders/create non-final steps should not show final create blocker"
)

const pickingForm = sliceBetween(
  ordersForms,
  "function PickingFastPath",
  "export function MarkReadyForm",
  "/orders/picking form"
)

for (const fragment of [
  "Order picking fast path",
  "After picking starts",
  "Choose order",
  'useState(selectedOrderId ?? "")',
  "Choose an order to start picking.",
  "activeOrderItemId",
  "setActiveOrderItemId",
  "Select item first.",
  "Simple order list",
  "Picking item",
  "Tap an item below first",
  'name="orderItemId"',
  "Scan barcode",
  "Scan Barcode",
  'href="#scan-barcode-action"',
  'href="#manual-weight-action"',
  'id="scan-barcode-action"',
  'id="manual-weight-action"',
  "Manual Weight",
  "sm:grid-cols-[minmax(0,1fr)_auto]",
  "Confirm picked weight",
  "Manual weight",
  'placeholder="Picked kg"',
  'placeholder="Picked quantity"',
  "Weight items use picked kg only.",
  "Finish picking",
  "Complete picking after all items are picked.",
  "Complete picking",
  "Pick items",
  "Tap an item, then scan barcode or enter weight.",
  "Brand / manufacturer:",
  "No preference - scan the brand/manufacturer you pick",
  "Required",
  "Picked",
  "Remaining",
  "Tolerance",
  "weight before completing picking.",
  "Complete Picking is blocked",
  "const totalProgress",
  "Total order progress",
  "{totalProgress}%",
  "Stock not enough",
  "Duplicate picked barcodes show a warning",
  "Wrong item scans show a warning with the next choice.",
  "Wrong item scans show a warning, then choose",
  "function PickingMismatchGuide",
  "Continue picking?",
  "Scan correct barcode",
  "Manual Weight with reason",
  "Pick saved. Next step:",
  "Go to Price / Ready",
  "Recent picks",
  "Saved scans and manual weights appear here.",
  "manualPickReasons",
]) {
  assertIncludes(pickingForm, fragment, "/orders/picking form")
}

const finalPriceForm = sliceBetween(
  ordersForms,
  "export function FinalOrderPriceForm",
  "export function CreateOrderDeliveryForm",
  "/orders/final price form"
)

for (const fragment of [
  "const singlePriceOrder = priceOrders.length === 1 ? priceOrders[0] : null",
  '<input type="hidden" name="orderId" value={singlePriceOrder.id} />',
  'id="finalPriceOrderId"',
  'title="Enter final price"',
  "One total for the whole order. No item prices.",
  'inputMode="decimal"',
  'placeholder="Final total only"',
  "Pickup moves to Ready for Pickup. Delivery moves to Pending Delivery.",
  "Internal transfer moves to the Internal Transfer section.",
]) {
  assertIncludes(finalPriceForm, fragment, "/orders/final price form")
}

const readyOrderActions = sliceBetween(
  ordersForms,
  "export function ReadyOrderActions",
  "export function CustomerOrderDeliveryStatusForm",
  "/orders/detail ready actions"
)

for (const fragment of [
  "pickupOrders.length > 0 ?",
  "cancellableOrders.length > 0 ?",
  'title="Pickup completed"',
  'title="Cancel order"',
]) {
  assertIncludes(readyOrderActions, fragment, "/orders/detail ready actions")
}

const readyRoute = sliceBetween(
  ordersPage,
  '{route === "ready" ?',
  '{route === "customers" ?',
  "/orders/ready route"
)
const readyBoard = sliceBetween(
  ordersPage,
  "function ReadyOrderCard",
  "function LinkedDeliverySummary",
  "/orders/ready board"
)

for (const fragment of [
  "Price Required",
  "FinalOrderPriceForm",
  "Ready for Pickup",
  "Pending Delivery",
  "Internal Transfer",
  'order.fulfillmentType !== "INTERNAL_TRANSFER"',
  "Enter final price so pickup or delivery can continue.",
  "Delivery team can accept these orders in Delivery.",
  "No delivery orders are ready for delivery.",
  "Transfer orders stay visible here until staff open them.",
  "PickupCompletedButton",
  "Enter final price",
  "Open Delivery",
  "View Delivery",
  "Open Order",
  "Picked / estimated weight",
]) {
  assertIncludes(readyBoard, fragment, "/orders/ready board")
}

assertNotIncludes(readyBoard, "handoff", "/orders/ready board")
assertNotIncludes(ordersPage, "handoff", "Order worker copy")
assertNotIncludes(ordersPage, "hand off", "Order worker copy")
assertNotIncludes(ordersData, "handoff", "Order dashboard and alert copy")

for (const fragment of [
  "preferredBrandId",
  "customization",
  "preferred_brand_id",
  "line.preferredBrandId",
  "availableBrandWeight <= 0",
  "Selected brand has no stock. Choose another brand or no brand preference.",
  "preferredBrandId && preferredBrandId !== readString(unit.brand_id)",
  "Wrong brand scanned.",
  "orderItemId: z.string().trim().min(1)",
  "Select the order item before scanning.",
  "readString(matchingItem.id) !== parsed.orderItemId",
]) {
  assertIncludes(read("lib/orders/actions.ts"), fragment, "Order brand/customization actions")
}

const orderAvailableStock = sliceBetween(
  read("lib/orders/actions.ts"),
  "async function availableStockWeightKg",
  "async function stockUnitByBarcode",
  "Order brand reservation stock check"
)

for (const fragment of [
  "preferredBrandId: string | null = null",
  "physicalStockWeightKg(",
  "activeReservedStockWeightKg(",
  "query = query.eq(\"brand_id\", preferredBrandId)",
  "return !preferredBrandId || !reservedBrandId || reservedBrandId === preferredBrandId",
]) {
  assertIncludes(orderAvailableStock, fragment, "Order brand reservation stock check")
}

for (const fragment of [
  "order_customization_options",
  "order_default_customization",
  "preferred_brand_id",
  "customization jsonb",
]) {
  assertIncludes(
    brandCustomizationMigration,
    fragment,
    "Order brand/customization migration"
  )
}

assertIncludes(readyRoute, "<ReadyOrdersBoard", "/orders/ready route")
assertIncludes(readyRoute, "advancedOrderUser ?", "/orders/ready route")
assertIncludes(readyRoute, "<AdvancedOrdersSection", "/orders/ready route")
assertNotIncludes(readyRoute, "ReadyOrderActions", "/orders/ready route")

const customersRoute = sliceBetween(
  ordersPage,
  '{route === "customers" ?',
  "{detailOrder ?",
  "/orders/customers route"
)

for (const fragment of [
  "Search customer name or phone",
  "Add Customer",
  "QuickCustomerNamePhoneForm",
  "Customers",
  "Create Order",
  "/orders/create?customerId=${customer.id}",
  "Advanced Customer Details",
]) {
  assertIncludes(customersRoute, fragment, "/orders/customers route")
}

const customerWorkerCards = sliceBetween(
  customersRoute,
  '<div className="grid gap-3 lg:grid-cols-2">',
  "{advancedOrderUser ?",
  "/orders/customers worker cards"
)
const customerAdvancedDetails = sliceBetween(
  customersRoute,
  "{advancedOrderUser ?",
  "{route === \"reports\" ?",
  "/orders/customers advanced details"
)

for (const fragment of ["customer.creditTermDays", "customer.categoryName"]) {
  assertNotIncludes(customerWorkerCards, fragment, "/orders/customers worker cards")
  assertIncludes(customerAdvancedDetails, fragment, "/orders/customers advanced details")
}

assertNotIncludes(customersRoute, "QuickCustomerForm", "/orders/customers route")
assertNotIncludes(customersRoute, "<OrdersTableClient", "/orders/customers route")
assertIncludes(
  ordersData,
  ".sort((a, b) => a.name.localeCompare(b.name))",
  "Order customers A-Z ordering"
)
assertNotIncludes(ordersData, "Credit warning only.", "Order demo worker remarks")

for (const fragment of [
  "customer outstanding",
  "outstanding amount",
  "finance invoice",
  "payment status",
  "item-level price",
  "stock value",
  "profit",
]) {
  assertNotIncludes(
    `${ordersPage}\n${ordersForms}`,
    fragment,
    "Worker-facing Order UI"
  )
}

assertIncludes(ordersTable, "Total price", "Advanced order table")
assertIncludes(ordersPage, '<option value="READY">Price / Ready</option>', "Advanced order status filter")
assertIncludes(ordersTable, '<Link href="/orders/ready">Price / Ready</Link>', "Advanced order table ready action")
assertIncludes(newRoute, 'redirect("/orders/create")', "/orders/new redirect")
assertIncludes(prepareRoute, 'redirect("/orders/picking")', "/orders/prepare redirect")

console.log("Order UX simplification coverage checks passed.")
