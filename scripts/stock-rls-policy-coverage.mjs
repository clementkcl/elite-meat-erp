import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const migrationsDir = path.join(root, "supabase", "migrations")

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
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

function migration(fileName) {
  return read(`supabase/migrations/${fileName}`)
}

function stockPolicyFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter(
      (file) =>
        /^2026061000(09|31|37|38|39|40|41|44)_.*\.sql$/.test(file) ||
        /^202606230002_.*\.sql$/.test(file)
    )
    .sort()
}

function policyBlock(source, policyName, tableName) {
  const policyStart = source.indexOf(`create policy "${policyName}"`)

  assert(policyStart >= 0, `Missing policy "${policyName}" on ${tableName}.`)

  const expectedOn = `on public.${tableName}`
  const tableStart = source.indexOf(expectedOn, policyStart)

  assert(
    tableStart >= 0,
    `Policy "${policyName}" does not target public.${tableName}.`
  )

  const nextPolicy = source.indexOf("\ncreate policy ", tableStart + expectedOn.length)
  const nextDrop = source.indexOf("\ndrop policy ", tableStart + expectedOn.length)
  const candidates = [nextPolicy, nextDrop].filter((index) => index >= 0)
  const blockEnd = candidates.length > 0 ? Math.min(...candidates) : source.length

  return source.slice(policyStart, blockEnd)
}

function assertDeletePolicy(source, policyName, tableName) {
  const block = policyBlock(source, policyName, tableName)

  assert(
    /\bfor\s+delete\b/i.test(block),
    `Policy "${policyName}" on ${tableName} must be a DELETE policy.`
  )
  assert(
    block.includes("using (public.can_administer_stock());"),
    `Policy "${policyName}" on ${tableName} must use can_administer_stock().`
  )
  assert(
    !block.includes("can_manage_stock()") && !block.includes("can_manage_stock_take()"),
    `Policy "${policyName}" on ${tableName} must not grant delete through operator/manager helpers.`
  )
}

const teamRls = migration("202606100008_team_rls_v1.sql")
const stockHardening = migration("202606100009_internal_qa_hardening_v1.sql")
const stockTake = migration("202606100038_stock_take_scoped_approval_v1.sql")
const damage = migration("202606100039_stock_damage_approval_v1.sql")
const returnSupplier = migration("202606100040_stock_return_supplier_approval_v1.sql")
const inboundRules = migration("202606100037_stock_inbound_labels_rules_v1.sql")
const itemMaster = migration("202606100044_item_master_all_roles_v1.sql")
const allStockPolicySource = stockPolicyFiles()
  .map((file) => migration(file))
  .join("\n")

includesAll(
  teamRls,
  [
    "create or replace function public.is_admin_or_director()",
    "select public.has_role('admin') or public.has_role('director');",
    "create or replace function public.can_administer_stock()",
    "select public.is_admin_or_director();",
  ],
  "Stock admin/director helper"
)

includesAll(
  stockHardening,
  [
    "create or replace function public.can_access_stock_location",
    "create or replace function public.can_access_stock_unit",
    "create or replace function public.can_access_stock_movement",
    "alter table public.profiles",
    "stock_location_id uuid references public.stock_locations",
  ],
  "Stock location-scope helpers"
)

for (const file of stockPolicyFiles()) {
  const source = migration(file)

  assert(
    !/\bcreate\s+policy\b[\s\S]{0,200}\bfor\s+all\b/i.test(source),
    `Stock policy migration ${file} must not create broad FOR ALL policies.`
  )
}

const scopedPolicyExpectations = [
  ["stock users can read scoped units", "stock_units", "for select", "can_access_stock_unit"],
  ["stock users can insert scoped units", "stock_units", "for insert", "can_manage_stock()"],
  ["stock users can update scoped units", "stock_units", "for update", "can_access_stock_unit"],
  ["stock users can read scoped movements", "stock_movements", "for select", "can_access_stock_movement"],
  ["stock users can insert scoped movements", "stock_movements", "for insert", "can_access_stock_movement"],
  ["stock users can read scoped no barcode stock", "no_barcode_stock", "for select", "can_access_stock_location"],
  ["stock users can insert scoped no barcode stock", "no_barcode_stock", "for insert", "can_access_stock_location"],
  ["stock users can update scoped no barcode stock", "no_barcode_stock", "for update", "can_access_stock_location"],
  ["stock users can read scoped no barcode movements", "no_barcode_movements", "for select", "can_access_stock_location"],
  ["stock users can insert scoped no barcode movements", "no_barcode_movements", "for insert", "can_access_stock_location"],
  ["stock users can read scoped stock take sessions", "stock_take_sessions", "for select", "can_access_stock_location"],
  ["stock users can read scoped stock take lines", "stock_take_lines", "for select", "can_access_stock_location"],
  ["stock users can read scoped barcode weight rules", "barcode_weight_rules", "for select", "can_access_stock_location"],
  ["stock users can insert scoped barcode weight rules", "barcode_weight_rules", "for insert", "can_manage_stock()"],
  ["stock users can update scoped barcode weight rules", "barcode_weight_rules", "for update", "can_manage_stock()"],
  ["stock users can read scoped damage requests", "stock_damage_requests", "for select", "can_access_stock_location"],
  ["stock users can create scoped damage requests", "stock_damage_requests", "for insert", "can_access_stock_location"],
  ["stock users can read scoped return supplier requests", "stock_return_supplier_requests", "for select", "can_access_stock_location"],
  ["stock users can create scoped return supplier requests", "stock_return_supplier_requests", "for insert", "can_access_stock_location"],
]

for (const [policyName, tableName, operation, guard] of scopedPolicyExpectations) {
  const block = policyBlock(allStockPolicySource, policyName, tableName)

  assert(
    block.toLowerCase().includes(operation),
    `Policy "${policyName}" on ${tableName} must be ${operation.toUpperCase()}.`
  )
  assert(
    block.includes(guard),
    `Policy "${policyName}" on ${tableName} must keep guard ${guard}.`
  )
}

includesAll(
  stockTake,
  [
    "create or replace function public.can_manage_stock_take()",
    "create or replace function public.can_director_approve_stock_take()",
    "public.has_role('director')",
    "public.has_role('admin')",
    "create policy \"stock managers can review stock take sessions\"",
    "status in ('REVIEWED', 'REJECTED')",
    "manager_signature is not null",
    "create policy \"stock directors can approve reviewed stock take sessions\"",
    "status in ('APPROVED', 'REJECTED')",
    "director_signature is not null",
  ],
  "Stock take approval RLS"
)

includesAll(
  damage,
  [
    "create policy \"stock managers can review damage requests\"",
    "public.can_manage_stock_take()",
    "status in ('MANAGER_REVIEWED', 'REJECTED')",
    "manager_signature is not null",
    "create policy \"stock directors can approve damage requests\"",
    "public.can_director_approve_stock_take()",
    "status in ('DIRECTOR_APPROVED', 'REJECTED')",
    "director_signature is not null",
  ],
  "Damage approval RLS"
)

includesAll(
  returnSupplier,
  [
    "create policy \"stock managers can review return supplier requests\"",
    "public.can_manage_stock_take()",
    "status in ('MANAGER_REVIEWED', 'REJECTED')",
    "manager_signature is not null",
  ],
  "Return supplier approval RLS"
)

includesAll(
  itemMaster,
  [
    "create or replace function public.can_edit_item_master()",
    "public.has_role('retail_team_general_worker')",
    "public.has_role('account')",
    "create policy \"all erp users can insert item master\"",
    "create policy \"all erp users can update item master\"",
    "create policy \"stock admins can delete items\"",
  ],
  "Item master edit/delete RLS"
)

const deletePolicies = [
  [stockHardening, "stock admins can delete stock units", "stock_units"],
  [stockHardening, "stock admins can delete stock movements", "stock_movements"],
  [stockHardening, "stock admins can delete no barcode stock", "no_barcode_stock"],
  [stockHardening, "stock admins can delete no barcode movements", "no_barcode_movements"],
  [stockHardening, "stock admins can delete stock take sessions", "stock_take_sessions"],
  [stockHardening, "stock admins can delete stock take lines", "stock_take_lines"],
  [stockHardening, "stock admins can delete scan logs", "barcode_scan_logs"],
  [stockHardening, "stock admins can delete stock reports", "stock_reports"],
  [inboundRules, "stock admins can delete barcode weight rules", "barcode_weight_rules"],
  [inboundRules, "stock admins can delete brands", "brands"],
  [inboundRules, "stock admins can delete origins", "origins"],
  [itemMaster, "stock admins can delete items", "items"],
  [stockTake, "stock admins can delete stock take sessions", "stock_take_sessions"],
  [stockTake, "stock admins can delete stock take lines", "stock_take_lines"],
  [damage, "stock admins can delete damage requests", "stock_damage_requests"],
  [returnSupplier, "stock admins can delete return supplier requests", "stock_return_supplier_requests"],
]

for (const [source, policyName, tableName] of deletePolicies) {
  assertDeletePolicy(source, policyName, tableName)
}

console.log("Stock RLS policy coverage checks passed.")
