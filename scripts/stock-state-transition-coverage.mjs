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

function assertIncludes(source, fragments, label) {
  for (const fragment of fragments) {
    assert(source.includes(fragment), `${label} missing: ${fragment}`)
  }
}

const actions = read("lib/stock/actions.ts")
const packageJson = read("package.json")

assertIncludes(
  actions,
  [
    '"inbound_stock_unit"',
    '"confirm_order_outbound_batch"',
    '"confirm_direct_outbound_batch"',
    '"transfer_stock_unit"',
    '"receive_stock_transfer"',
    '"return_stock_unit"',
    '"release_inspection_stock_unit"',
    '"approve_stock_damage_request"',
    '"approve_stock_return_supplier_request"',
    '"approve_stock_take_session"',
  ],
  "Stock state transition RPC wiring"
)

const directStockUnitWritePattern =
  /\.from\(["']stock_units["']\)[\s\S]{0,700}\.(?:insert|update|delete|upsert)\s*\(/m

assert(
  !directStockUnitWritePattern.test(actions),
  "lib/stock/actions.ts must not directly insert/update/delete/upsert stock_units; use atomic RPCs"
)

const migrations = [
  {
    path: "supabase/migrations/202606100028_order_outbound_atomic_rpc_v1.sql",
    fragments: [
      "create or replace function public.confirm_order_outbound_batch",
      "for update",
      "update public.stock_units",
      "'atomic', true",
    ],
  },
  {
    path: "supabase/migrations/202606100041_direct_outbound_batches_v1.sql",
    fragments: [
      "create or replace function public.confirm_direct_outbound_batch",
      "for update",
      "update public.stock_units",
      "'atomic', true",
    ],
  },
  {
    path: "supabase/migrations/202606100042_atomic_stock_approval_rpcs_v1.sql",
    fragments: [
      "create or replace function public.approve_stock_damage_request",
      "create or replace function public.approve_stock_return_supplier_request",
      "for update",
      "update public.stock_units",
      "'atomic', true",
    ],
  },
  {
    path: "supabase/migrations/202606100052_stock_take_barcode_variance_rpc_v1.sql",
    fragments: [
      "create or replace function public.approve_stock_take_session",
      "Scan at least one barcode before approving stock take.",
      "lineCount",
      "missingCount",
      "barcodeVarianceComputed",
      "for update",
      "status = 'ADJUSTED_OUT'",
      "insert into public.stock_movements",
      "'atomic', true",
    ],
  },
  {
    path: "supabase/migrations/202606100047_atomic_transfer_receive_rpcs_v1.sql",
    fragments: [
      "create or replace function public.transfer_stock_unit",
      "create or replace function public.receive_stock_transfer",
      "for update",
      "update public.stock_units",
      "'atomic', true",
    ],
  },
  {
    path: "supabase/migrations/202606100048_atomic_stock_return_rpc_v1.sql",
    fragments: [
      "create or replace function public.return_stock_unit",
      "for update",
      "update public.stock_units",
      "'atomic', true",
    ],
  },
  {
    path: "supabase/migrations/202606100049_atomic_inspection_release_rpc_v1.sql",
    fragments: [
      "create or replace function public.release_inspection_stock_unit",
      "for update",
      "update public.stock_units",
      "'atomic', true",
    ],
  },
  {
    path: "supabase/migrations/202606100050_atomic_barcode_inbound_rpc_v1.sql",
    fragments: [
      "create or replace function public.inbound_stock_unit",
      "insert into public.stock_units",
      "insert into public.stock_movements",
      "insert into public.barcode_scan_logs",
      "'atomic', true",
    ],
  },
]

for (const migration of migrations) {
  assertIncludes(read(migration.path), migration.fragments, migration.path)
}

assert(
  packageJson.includes("stock-state-transition-coverage.mjs"),
  "npm run smoke must include stock-state-transition-coverage.mjs"
)

console.log("Stock state transition coverage checks passed.")
