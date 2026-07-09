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

function functionBody(source, name) {
  const marker = `export async function ${name}`
  const start = source.indexOf(marker)

  assert(start >= 0, `Missing stock action: ${name}`)

  const next = source.indexOf("\nexport async function ", start + marker.length)
  return source.slice(start, next === -1 ? source.length : next)
}

function assertActionUses(source, name, fragments) {
  const body = functionBody(source, name)

  for (const fragment of fragments) {
    assert(body.includes(fragment), `${name} missing: ${fragment}`)
  }
}

const actions = read("lib/stock/actions.ts")
const stockPage = read("components/stock/stock-page.tsx")
const packageJson = read("package.json")

for (const fragment of [
  'canAccessModule(profile, "stock")',
  'return { error: "Your outlet does not have stock access." }',
  "function assertStockLocationAccess",
  "canUseAllStockLocations(profile)",
  "Your profile is missing a stock location.",
  "Your role cannot ${action} stock for another location.",
]) {
  assert(actions.includes(fragment), `Stock action scope guard missing: ${fragment}`)
}

assert(
  actions.includes("const stockOperatorRoles: UserRole[] = [") &&
    !actions
      .match(/const stockOperatorRoles:[\s\S]*?=\s*\[([\s\S]*?)\]/)?.[1]
      ?.includes('"director"'),
  "Routine stock operator roles must not include director."
)

assert(
  actions.includes('"account"') &&
    actions.includes('"director"') &&
    actions.includes("const stockItemEditorRoles: UserRole[]"),
  "Item editor roles must keep all ERP roles able to create/edit item master."
)

assert(
  actions.includes('const stockDirectorApprovalRoles: UserRole[] = ["director", "admin"]'),
  "Director approval roles must be limited to director/admin."
)

for (const name of ["createItemAction", "updateItemAction"]) {
  assertActionUses(actions, name, ["runStockAction(formData, stockItemEditorRoles"])
}

for (const [name, actionText] of [
  ["barcodeInboundAction", "receive inbound"],
  ["confirmOrderOutboundAction", "confirm outbound"],
  ["confirmDirectOutboundAction", "confirm outbound"],
  ["transferAction", "transfer"],
  ["receiveTransferAction", "receive transfer"],
  ["returnStockAction", "return stock"],
  ["scanStockTakeBarcodeAction", "scan stock take"],
]) {
  assertActionUses(actions, name, [
    "runStockAction(formData, stockOperatorRoles",
    "assertStockLocationAccess(",
    actionText,
  ])
}

assertActionUses(actions, "createDamageRequestAction", [
  "runStockAction(formData, stockOperatorRoles",
  "createDamageRequestForUnit",
])
assertActionUses(actions, "createReturnSupplierRequestAction", [
  "runStockAction(formData, stockOperatorRoles",
  "createReturnSupplierRequestForUnit",
])

for (const [helperName, actionText] of [
  ["createDamageRequestForUnit", "request damage"],
  ["createReturnSupplierRequestForUnit", "request return supplier"],
]) {
  const marker = `async function ${helperName}`
  const start = actions.indexOf(marker)
  assert(start >= 0, `Missing stock helper: ${helperName}`)
  const next = actions.indexOf("\nexport async function ", start + marker.length)
  const body = actions.slice(start, next === -1 ? actions.length : next)

  for (const fragment of ["assertStockLocationAccess(", actionText]) {
    assert(body.includes(fragment), `${helperName} missing: ${fragment}`)
  }
}

assertActionUses(actions, "releaseInspectionStockAction", [
  "runStockAction(formData, stockManagerRoles",
  "assertStockLocationAccess(",
  "release inspection stock",
])

for (const [name, actionText] of [
  ["reviewDamageRequestAction", "review damage"],
  ["rejectReturnSupplierRequestAction", "reject return supplier"],
]) {
  assertActionUses(actions, name, [
    "runStockAction(formData, stockManagerRoles",
    "assertStockLocationAccess(",
    actionText,
  ])
}

assertActionUses(actions, "createStockTakeSessionAction", [
  "runStockAction(formData, stockOperatorRoles",
  "assertStockLocationAccess(",
  "create stock take",
])

assertActionUses(actions, "approveDamageRequestAction", [
  "runStockAction(formData, stockDirectorApprovalRoles",
  "assertStockLocationAccess(",
  "approve damage",
  '"approve_stock_damage_request"',
])
assertActionUses(actions, "approveStockTakeAction", [
  "runStockAction(formData, stockDirectorApprovalRoles",
  '"approve_stock_take_session"',
])
assertActionUses(actions, "approveReturnSupplierRequestAction", [
  "runStockAction(formData, stockManagerRoles",
  "assertStockLocationAccess(",
  "approve return supplier",
  '"approve_stock_return_supplier_request"',
])
assertActionUses(actions, "noBarcodeInboundAction", [
  "No-barcode inbound is disabled for MVP",
])

for (const fragment of [
  "const stockOperatorRoles: UserRole[] = stockRoles.filter",
  'role !== "director"',
  "const stockItemMasterRoles: UserRole[]",
  'const stockAdvancedRoles: UserRole[] = [...stockManagerRoles, "director"]',
  "items: stockItemMasterRoles",
  "inbound: stockOperatorRoles",
  "outbound: stockOperatorRoles",
  "transfer: stockOperatorRoles",
  '"receive-transfer": stockOperatorRoles',
  "return: stockOperatorRoles",
  "reports: stockAdvancedRoles",
  "settings: stockAdvancedRoles",
  "const isWorkerDashboard = route === \"dashboard\" && isGeneralStockWorker",
  "const canUseItemSetup = hasAnyRole(profile, stockItemMasterRoles)",
  "defaultLocationId={profile.stockLocationId}",
  "canUseItemSetup={canUseItemSetup}",
  "const showDashboardAlerts = !isWorkerDashboard",
]) {
  assert(stockPage.includes(fragment), `Stock page route scope missing: ${fragment}`)
}

const workerHomeBody =
  stockPage.match(/function StockWorkerHome\([\s\S]*?\n\}/)?.[0] ?? ""

for (const fragment of [
  "Outbound Without Order",
  "Transfer Out",
  "Receive Transfer",
  "Return Stock",
  "Item / Barcode Setup",
  "canUseItemSetup",
]) {
  assert(stockPage.includes(fragment), `Stock worker home missing: ${fragment}`)
}

for (const blockedFragment of [
  "KpiCards",
  "DataTable",
  "reports",
  "settings",
  "cost",
  "value",
  "finance",
]) {
  assert(
    !workerHomeBody.toLowerCase().includes(blockedFragment),
    `Stock worker dashboard must not expose ${blockedFragment}.`
  )
}

assert(
  actions.includes("if (locationId !== profile.stockLocationId)") &&
    actions.includes("Your role cannot ${action} stock for another location."),
  "Worker stock actions must block cross-location/cross-outlet stock writes."
)

assert(
  packageJson.includes("stock-role-scope-coverage.mjs"),
  "npm run smoke must include stock-role-scope-coverage.mjs"
)

console.log("Stock role/scope coverage checks passed.")
