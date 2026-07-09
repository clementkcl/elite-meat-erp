import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function includesAll(source, fragments, label) {
  for (const fragment of fragments) {
    assert(source.includes(fragment), `${label} missing: ${fragment}`)
  }
}

function exportedFunctionBody(source, name) {
  const marker = `export async function ${name}`
  const start = source.indexOf(marker)

  assert(start >= 0, `Missing exported function: ${name}`)

  const next = source.indexOf("\nexport async function ", start + marker.length)
  return source.slice(start, next === -1 ? source.length : next)
}

function functionSlice(source, marker, endMarker) {
  const start = source.indexOf(marker)

  assert(start >= 0, `Missing source marker: ${marker}`)

  const end = source.indexOf(endMarker, start + marker.length)
  return source.slice(start, end === -1 ? source.length : end)
}

function assertNoForbidden(source, fragments, label) {
  const lowerSource = source.toLowerCase()

  for (const fragment of fragments) {
    assert(
      !lowerSource.includes(fragment.toLowerCase()),
      `${label} must not expose ${fragment}.`
    )
  }
}

const packageJson = read("package.json")
const deliveryActions = read("lib/delivery/actions.ts")
const deliveryQueries = read("lib/delivery/queries.ts")
const deliveryTypes = read("lib/delivery/types.ts")
const driverPageRoute = read("app/(erp)/delivery/driver/page.tsx")
const deliveryDetailRoute = read("app/(erp)/delivery/[id]/page.tsx")
const driverMobilePage = read("components/delivery/driver-mobile-delivery-page.tsx")
const deliveryDetailPage = read("components/delivery/delivery-detail-page.tsx")
const managerDashboard = read("components/delivery/manager-delivery-dashboard.tsx")
const expenseReviewPage = read("components/delivery/delivery-expense-review-page.tsx")
const appShell = read("components/erp/app-shell.tsx")
const homePage = read("components/dashboard/home-page.tsx")
const ordersActions = read("lib/orders/actions.ts")
const ordersForms = read("components/orders/orders-forms.tsx")
const ordersPage = read("components/orders/orders-page.tsx")
const orderDeliveryIntegrationMigration = read(
  "supabase/migrations/202606230010_order_delivery_integration_v1.sql"
)
const deliveryDatabaseMigration = read(
  "supabase/migrations/202606230004_delivery_module_v1.sql"
)
const deliveryRlsMigration = read(
  "supabase/migrations/202606230015_delivery_permissions_audit_hardening_v1.sql"
)

for (const route of [
  "app/(erp)/delivery/page.tsx",
  "app/(erp)/delivery/dashboard/page.tsx",
  "app/(erp)/delivery/driver/page.tsx",
  "app/(erp)/delivery/[id]/page.tsx",
  "app/(erp)/delivery/expenses/page.tsx",
]) {
  assert(exists(route), `Missing Delivery route: ${route}`)
}

assert(
  packageJson.includes("delivery-module-coverage.mjs"),
  "npm run smoke must include delivery-module-coverage.mjs"
)

includesAll(
  deliveryTypes,
  [
    '"AVAILABLE"',
    '"ACCEPTED"',
    '"LOADED"',
    '"OUT_FOR_DELIVERY"',
    '"DELIVERED"',
    '"FAILED"',
    '"CUSTOMER_DELIVERY"',
    '"INTERNAL_TRANSFER_DELIVERY"',
    '"RETURN_COLLECTION"',
    '"PETROL"',
    '"PARKING"',
    '"TOLL"',
    '"VEHICLE_REPAIR"',
    '"CUSTOMER_NOT_AVAILABLE"',
    '"WRONG_ADDRESS"',
    '"CUSTOMER_REJECTED"',
    '"GOODS_ISSUE"',
    '"VEHICLE_ISSUE"',
    '"OTHER"',
  ],
  "Delivery V1 statuses, types, expenses, and failed reasons"
)

const createLinkedDeliveryFromOrder = functionSlice(
  ordersActions,
  "async function createLinkedDeliveryFromOrder",
  "async function loadCustomer"
)
includesAll(
  createLinkedDeliveryFromOrder,
  [
    '.rpc("create_delivery_from_customer_order"',
    "p_allow_related: false",
    'created ? "ORDER_DELIVERY_CREATED" : "ORDER_DELIVERY_REUSED"',
    ".update({ delivery_note: customerRemarks })",
  ],
  "Orders to Delivery handoff helper"
)

const saveFinalOrderPriceAction = exportedFunctionBody(
  ordersActions,
  "setCustomerOrderFinalPriceAction"
)
includesAll(
  saveFinalOrderPriceAction,
  [
    'const nextStatus = deliveryRequired ? "READY_FOR_DELIVERY" : "READY_FOR_PICKUP"',
    "const linkedDelivery = deliveryRequired",
    "? await createLinkedDeliveryFromOrder(context, parsed.orderId)",
    "Final price saved. Delivery",
  ],
  "Auto-create delivery after final price"
)

const createOrderDeliveryAction = exportedFunctionBody(
  ordersActions,
  "createOrderDeliveryAction"
)
includesAll(
  createOrderDeliveryAction,
  [
    'fulfillmentType === "PICKUP"',
    "Customer pickup stays in Orders and does not create a delivery job.",
    "const linkedDelivery = await createLinkedDeliveryFromOrder(context, parsed.orderId)",
    "is already linked",
  ],
  "Manual Create Delivery action"
)

includesAll(
  ordersForms,
  [
    "export function CreateOrderDeliveryForm",
    'submitLabel="Create Delivery"',
    "Customer pickup stays in Orders.",
  ],
  "Order detail manual Create Delivery form"
)

includesAll(
  ordersPage,
  [
    "Delivery created",
    "Open it from the Delivery module list.",
    "Open Delivery",
  ],
  "Order page linked delivery display"
)

includesAll(
  orderDeliveryIntegrationMigration,
  [
    "create or replace function public.create_delivery_from_customer_order",
    "p_allow_related boolean default false",
    "Customer pickup orders stay in Orders and do not create delivery jobs.",
    "where delivery_order.source_customer_order_id = p_order_id",
    "and delivery.status <> 'CANCELLED'",
    "created := false",
    "'AVAILABLE'",
    "'CUSTOMER_DELIVERY'",
    "'INTERNAL_TRANSFER_DELIVERY'",
    "insert into public.delivery_items",
    "'Delivery created from order.'",
  ],
  "Order delivery integration migration"
)

const acceptDelivery = exportedFunctionBody(deliveryActions, "acceptDelivery")
includesAll(
  acceptDelivery,
  [
    'readString(delivery.status) !== "AVAILABLE"',
    "defaultVehicleId(context.supabase, teamId)",
    '"ACCEPTED"',
    "driver_id: context.profile.id",
    "accepted_at: new Date().toISOString()",
    "await updateLinkedCustomerOrders(context, parsedDeliveryId, \"ACCEPTED\")",
  ],
  "Driver accepts delivery"
)

const markDeliveryLoaded = exportedFunctionBody(deliveryActions, "markDeliveryLoaded")
includesAll(
  markDeliveryLoaded,
  [
    "assertDriverCanChangeDelivery(delivery, context.profile)",
    'readString(delivery.status) !== "ACCEPTED"',
    '"LOADED"',
    "loaded_at: new Date().toISOString()",
    "await updateLinkedCustomerOrders(context, parsedDeliveryId, \"LOADED\")",
  ],
  "Driver marks loaded"
)

const startDelivery = exportedFunctionBody(deliveryActions, "startDelivery")
includesAll(
  startDelivery,
  [
    "assertDriverCanChangeDelivery(delivery, context.profile)",
    'readString(delivery.status) !== "LOADED"',
    '"OUT_FOR_DELIVERY"',
    "started_at: new Date().toISOString()",
    "await updateLinkedCustomerOrders(context, parsedDeliveryId, \"OUT_FOR_DELIVERY\")",
  ],
  "Driver starts delivery"
)

const createProofAndComplete = functionSlice(
  deliveryActions,
  "async function createProofAndComplete",
  "export async function getAvailableDeliveries"
)
includesAll(
  createProofAndComplete,
  [
    'assertPhotoFile(file, "proof")',
    'if (outcome === "FAILED" && !failedReason)',
    'if (failedReason === "OTHER" && !remarks)',
    'readString(delivery.status) !== "OUT_FOR_DELIVERY"',
    'throw new Error("Start delivery before uploading proof.")',
    '"delivery-proofs"',
    '.from("delivery_proofs")',
    "proof_type: outcome",
    "gps_unavailable: normalizedGps.gpsUnavailable",
    "failed_reason: failedReason",
    "completed_latitude: normalizedGps.latitude",
    "completed_longitude: normalizedGps.longitude",
    "gps_unavailable: normalizedGps.gpsUnavailable",
    "await updateLinkedCustomerOrders(context, deliveryId, outcome)",
    'if (outcome === "DELIVERED")',
    "await completeLinkedCustomerOrderProofs(context, deliveryId, fileId, normalizedGps)",
    'if (normalizedGps.gpsUnavailable)',
    '"DELIVERY_GPS_UNAVAILABLE"',
    "await createDeliveryAddressSuggestion(context, delivery,",
  ],
  "Proof upload and completion"
)

assertNoForbidden(
  createProofAndComplete,
  ["stock_units", "stock_movements", "order_stock_reservations", "no_barcode_stock"],
  "Delivery completion action"
)

const uploadDeliveredProofAndComplete = exportedFunctionBody(
  deliveryActions,
  "uploadDeliveredProofAndComplete"
)
includesAll(
  uploadDeliveredProofAndComplete,
  ['"DELIVERED"', "null", "createProofAndComplete"],
  "Delivered proof action"
)

const uploadFailedProofAndComplete = exportedFunctionBody(
  deliveryActions,
  "uploadFailedProofAndComplete"
)
includesAll(
  uploadFailedProofAndComplete,
  [
    "z.enum(deliveryFailedReasons)",
    "parsedRemarks",
    '"FAILED"',
    "parsedFailedReason",
    "createProofAndComplete",
  ],
  "Failed proof action"
)

const updateLinkedCustomerOrders = functionSlice(
  deliveryActions,
  "async function updateLinkedCustomerOrders",
  "async function completeLinkedCustomerOrderProofs"
)
includesAll(
  updateLinkedCustomerOrders,
  [
    '.from("delivery_orders")',
    ".update({ status: deliveryOrderStatus })",
    '.from("customer_orders")',
    ".update({ status: customerOrderStatus, updated_by: context.profile.id })",
    "revalidateLinkedOrderPaths(linkedCustomerOrderIds)",
  ],
  "Linked order status sync"
)

includesAll(
  deliveryDatabaseMigration,
  [
    "drop function if exists public.complete_customer_order_delivery_with_proof",
    "create or replace function public.complete_customer_order_delivery_with_proof",
    "insert into public.delivery_address_suggestions",
    "Manager review required before updating customer master.",
  ],
  "Customer GPS suggestion from proof migration"
)

const completeCustomerOrderFunction = functionSlice(
  deliveryDatabaseMigration,
  "create or replace function public.complete_customer_order_delivery_with_proof",
  "grant execute on function public.complete_customer_order_delivery_with_proof"
)
assert(
  !completeCustomerOrderFunction.includes("update public.customers"),
  "Delivery proof GPS must not overwrite official customer GPS automatically."
)

const reportAddressIssue = exportedFunctionBody(deliveryActions, "reportAddressIssue")
includesAll(
  reportAddressIssue,
  [
    "assertDriverCanChangeDelivery(delivery, context.profile)",
    "await createDeliveryAddressSuggestion(context, delivery, payload)",
    '"DELIVERY_ADDRESS_ISSUE_REPORTED"',
  ],
  "Address issue submission"
)

const saveSuggestedCustomerGps = exportedFunctionBody(
  deliveryActions,
  "saveSuggestedCustomerGps"
)
includesAll(
  saveSuggestedCustomerGps,
  [
    "if (normalizedGps.gpsUnavailable)",
    "GPS coordinates are required to save a customer GPS suggestion.",
    "Driver suggested customer GPS.",
    "await createDeliveryAddressSuggestion(context, delivery,",
  ],
  "Suggested customer GPS submission"
)

const reviewDeliveryAddressSuggestionAction = exportedFunctionBody(
  deliveryActions,
  "reviewDeliveryAddressSuggestionAction"
)
includesAll(
  reviewDeliveryAddressSuggestionAction,
  [
    "runDeliveryAction(formData, deliveryManagerRoles",
    "assertManagerCanChangeDelivery(delivery, context.profile)",
    'if (parsed.status === "APPROVED")',
    '.from("customers")',
    ".update(customerPatch)",
    "reviewed_by: context.profile.id",
    "reviewed_at: new Date().toISOString()",
    '"DELIVERY_ADDRESS_SUGGESTION_REVIEWED"',
  ],
  "Manager address/GPS suggestion review"
)

const createDeliveryExpense = exportedFunctionBody(deliveryActions, "createDeliveryExpense")
includesAll(
  createDeliveryExpense,
  [
    "parseService(serviceExpenseSchema, payload)",
    'assertPhotoFile(payload.receiptFile, "receipt")',
    "assertDriverCanChangeDelivery(delivery, context.profile)",
    'const objectPath = `${context.profile.id}/expenses/${Date.now()}-${cleanName}`',
    '"delivery-expenses"',
    '.from("delivery_expenses")',
    "driver_id: context.profile.id",
    'status: "PENDING"',
    '"DELIVERY_EXPENSE_SUBMITTED"',
  ],
  "Delivery expense submission"
)

includesAll(
  deliveryActions,
  [
    "amount: z.number().positive()",
    '(value) => value.status !== "REJECTED" || Boolean(value.rejectedReason)',
    '"Enter a reason before rejecting this expense."',
  ],
  "Expense validation"
)

const reviewDeliveryExpenseAction = exportedFunctionBody(
  deliveryActions,
  "reviewDeliveryExpenseAction"
)
includesAll(
  reviewDeliveryExpenseAction,
  [
    "runDeliveryAction(formData, deliveryManagerRoles",
    "await assertManagerCanReviewExpense(context, expense)",
    'readString(expense.status, "PENDING") !== "PENDING"',
    "reviewed_by: context.profile.id",
    "reviewed_at: new Date().toISOString()",
    "rejected_reason:",
    '"DELIVERY_EXPENSE_APPROVED"',
    '"DELIVERY_EXPENSE_REJECTED"',
  ],
  "Delivery expense review"
)

includesAll(
  driverPageRoute,
  [
    '"delivery_team_general_worker"',
    '"delivery_manager"',
    '"admin"',
    "getAvailableDeliveries()",
    "getUpcomingOrderDeliveries",
    "getTodayDriverDeliveries()",
    "getTodayDriverExpenses()",
    "getDeliveryVehicles()",
    "<DriverMobileDeliveryPage",
  ],
  "Driver route data loading"
)
assert(
  !driverPageRoute.includes('"director"'),
  "Driver route must not allow director as a driver role."
)

includesAll(
  driverMobilePage,
  [
    '"Available"',
    '"My Deliveries"',
    '"Completed"',
    '"Failed"',
    '"Expenses"',
    "Accept Delivery",
    "Preparing Orders",
    "Pending Delivery",
    "Not ready to accept yet",
    "Final price needed",
    "Picked weight is visible. Accept appears after final price is saved.",
    "Progress is visible. Accept appears after picking and final price are done.",
    "Picked {kg(order.pickedWeightKg)} / {kg(order.totalEstimatedWeightKg)}",
    "Items and customization",
    "Object.entries(item.customization).flatMap",
    "No customization",
    "Change Vehicle",
    "Driver accept steps",
    "No typing for normal accept. Use Change Vehicle only when needed.",
    "Tap Accept",
    "Load goods",
    "Tap Loaded",
    "Google Maps",
    "Call",
    "WhatsApp",
    "Loaded",
    "Start Delivery",
    "Upload Delivered Proof",
    "Upload Failed Proof",
    "Address Issue",
    "Save Current Location as Suggested Customer GPS",
    "Driver fast path",
    "Do today jobs in order",
    "One big action at a time.",
    "Available today",
    "In progress",
    "Failed follow-up",
    'myDeliveries.length > 0 ? "My Deliveries" : "Available"',
    'role={state.status === "error" ? "alert" : "status"}',
    'aria-live={state.status === "error" ? "assertive" : "polite"}',
    "function driverStepText",
    "Tap Accept Delivery to take this job.",
    "One tap accepts this delivery.",
    "Delivery accepted. Next: load goods, then tap Loaded.",
    "Photo opens the camera. GPS is tried automatically during upload.",
    "Choose reason",
    "Take proof photo",
    "Manager follow-up",
    "GPS tried",
    "Delivery complete",
    "Photo required",
    "GPS tried automatically",
    "Return follow-up needed",
    "Auto-completes delivery",
    "Failed proof records the failed reason and tells the manager to check stock return follow-up.",
    "Delivered proof completes the delivery after the photo uploads.",
    "Delivered proof uploaded. This delivery is complete.",
    "function ProofSuccessNextStep",
    "Proof uploaded",
    "Failed proof saved",
    "Tell manager",
    "Return follow-up",
    "Delivery complete",
    "Check next job",
    "Completed tab",
    "Manager must review the failed delivery and stock return follow-up.",
    "function ProofBlockedGuide",
    "Proof photo locked until Start Delivery",
    "Finish the current step first.",
    "Proof buttons appear",
    "<ProofBlockedGuide status={delivery.status} />",
    "min-h-16 w-full text-base",
    "navigator.geolocation.getCurrentPosition",
    "capture=\"environment\"",
    "watermarkProof(file",
    "GPS unavailable",
    "Remark required for Other",
    "Submit Expense",
    "View Receipt",
  ],
  "Driver mobile UI workflow"
)

assertNoForbidden(
  driverMobilePage + driverPageRoute,
  ["total price", "credit", "stock cost", "stock value", "profit", "payment", "finance", "accounting"],
  "Driver delivery UI"
)

includesAll(
  deliveryDetailRoute,
  [
    "canManageDelivery",
    "canManageDelivery ? getDeliveryDrivers() : Promise.resolve([])",
  ],
  "Delivery detail driver-list isolation"
)

includesAll(
  deliveryDetailPage,
  [
    "canManage",
    "changeDeliveryDriverAction",
    "changeDeliveryVehicleAction",
    "cancelDeliveryAction",
    "reviewDeliveryAddressSuggestionAction",
    "uploadDeliveredProofAndComplete",
    "uploadFailedProofAndComplete",
  ],
  "Delivery detail manager and driver actions"
)

const getAvailableDeliveries = exportedFunctionBody(
  deliveryQueries,
  "getAvailableDeliveries"
)
includesAll(
  getAvailableDeliveries,
  [
    '.from("deliveries")',
    '.eq("status", "AVAILABLE")',
    "requested_delivery_date.eq",
    "todayIsoDate()",
  ],
  "Available deliveries query"
)

const getUpcomingOrderDeliveries = exportedFunctionBody(
  deliveryQueries,
  "getUpcomingOrderDeliveries"
)
includesAll(
  getUpcomingOrderDeliveries,
  [
    '.from("customer_orders")',
    '.eq("delivery_required", true)',
    '.in("status", ["NEW", "PREPARING", "READY"])',
    '.from("customer_order_items")',
    "customization",
    "readCustomization",
    "items: upcomingItems.get(orderId) ?? []",
    "progressPercent",
    "customerRemarks",
  ],
  "Upcoming order deliveries query"
)

const getTodayDriverDeliveries = exportedFunctionBody(
  deliveryQueries,
  "getTodayDriverDeliveries"
)
includesAll(
  getTodayDriverDeliveries,
  [
    '.eq("driver_id", context.profile.id)',
    '"ACCEPTED"',
    '"LOADED"',
    '"OUT_FOR_DELIVERY"',
    '"DELIVERED"',
    '"FAILED"',
  ],
  "Current driver delivery query"
)

const getDeliveryDashboard = exportedFunctionBody(
  deliveryQueries,
  "getDeliveryDashboard"
)
includesAll(
  getDeliveryDashboard,
  [
    '"delivery_manager"',
    '"admin"',
    '"director"',
    '"Your role does not allow delivery dashboard access."',
    "todayDeliveries",
    "pendingAvailable",
    "loaded",
    "outForDelivery",
    "deliveredToday",
    "failedToday",
    "overdue",
    "totalWeightToday",
    "driverPerformance",
    "deliveryWeightByDriver",
  ],
  "Manager dashboard query"
)

includesAll(
  managerDashboard,
  [
    "Today Deliveries",
    "Pending / Available",
    "Loaded",
    "Out for Delivery",
    "Delivered Today",
    "Failed Today",
    "Overdue",
    "Total Weight Today",
    "DriverPerformance",
    "Dashboard Delivery List",
    "Failed Deliveries",
    "GPS Unavailable",
    "AddressSuggestionReview",
    "Late Deliveries",
    "Driver Took Too Long",
    "V1 does not include a dispatch board.",
  ],
  "Manager dashboard UI"
)

includesAll(
  expenseReviewPage,
  [
    "Review driver receipt claims",
    "Expense review queue",
    "Review pending driver receipt claims before normal delivery reports.",
    "Open the first pending receipt, check delivery or scope, then approve or reject.",
    "Pending standalone review",
    "Queue clear",
    "No pending delivery expenses need action for the current filters.",
    "Expense review readiness",
    "Pending &gt; Manager review &gt; Approved or Rejected.",
    "Delivery expenses",
    "stay separate from OA claims in V1.",
    "Receipt checked",
    "Scope checked",
    "Decision selected",
    "Expense review not saved yet",
    "Add reject reason if needed",
    "required={decision === \"REJECTED\"}",
    "reviewDeliveryExpenseAction",
    "Approve",
    "Reject",
    "Reject reason",
    "View receipt photo",
  ],
  "Expense review UI"
)

const getDeliveryVehicles = exportedFunctionBody(deliveryQueries, "getDeliveryVehicles")
includesAll(
  getDeliveryVehicles,
  [
    "!hasAnyRole(context.profile, [\"admin\", \"director\"])",
    'query = query.eq("delivery_team_id", context.profile.departmentId)',
    "canSeeGpsMetadata",
    "gpsProviderId: canSeeGpsMetadata",
    "gpsProviderVehicleRef: canSeeGpsMetadata",
    "gpsEnabled: canSeeGpsMetadata",
  ],
  "Vehicle/team isolation and GPS metadata hiding"
)

const getDeliveryDrivers = exportedFunctionBody(deliveryQueries, "getDeliveryDrivers")
includesAll(
  getDeliveryDrivers,
  [
    '!hasAnyRole(context.profile, ["delivery_manager", "admin", "director"])',
    'query = query.eq("department_id", context.profile.departmentId)',
    'query = query.eq("outlet_id", context.profile.outletId)',
  ],
  "Driver list isolation"
)

const getTodayDriverExpenses = exportedFunctionBody(
  deliveryQueries,
  "getTodayDriverExpenses"
)
includesAll(
  getTodayDriverExpenses,
  ['.eq("driver_id", context.profile.id)', '.from("delivery_expenses")'],
  "Driver expense query isolation"
)

includesAll(
  appShell,
  [
    'prefix: "/delivery/dashboard"',
    'roles: ["delivery_manager", "admin", "director"]',
    'prefix: "/delivery/payments"',
    'roles: ["delivery_manager", "admin"]',
    'prefix: "/delivery/driver"',
    'roles: ["delivery_team_general_worker", "delivery_manager", "admin"]',
  ],
  "Delivery route access"
)

assert(
  homePage.includes('href: "/delivery/dashboard"') &&
    homePage.includes('roles: ["delivery_manager", "admin", "director"]') &&
    !homePage.includes('roles: ["delivery_team_general_worker", "delivery_manager", "admin", "director"]'),
  "Driver home shortcuts must not expose manager Delivery Dashboard."
)

includesAll(
  deliveryRlsMigration,
  [
    "create or replace function public.can_manage_delivery_review_scope",
    "create or replace function public.enforce_delivery_driver_status_transition",
    "create or replace function public.enforce_delivery_job_driver_status_transition",
    "public.can_access_delivery_scope(job.outlet_id, job.delivery_team_id)",
    "job.driver_id = auth.uid()",
    "delivery.driver_id = auth.uid()",
    "driver_id = auth.uid()",
    "on public.delivery_expenses for select",
    "on public.delivery_expenses for insert",
    "on public.delivery_proofs for insert",
    "bucket_id = 'delivery-proofs'",
    "bucket_id = 'delivery-expenses'",
    "auth.uid()::text = (storage.foldername(target_name))[1]",
    "on public.delivery_address_suggestions for update",
    ".status = 'OUT_FOR_DELIVERY'",
  ],
  "Delivery RLS and storage hardening"
)

assertNoForbidden(
  deliveryRlsMigration,
  ["gps_accuracy", "completed_gps_accuracy"],
  "Delivery RLS schema"
)

console.log("Delivery module coverage checks passed.")
