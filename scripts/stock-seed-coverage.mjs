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

function includesAll(source, fragments, label) {
  for (const fragment of fragments) {
    assert(source.includes(fragment), `${label} missing: ${fragment}`)
  }
}

const seed = read("supabase/seed.sql")
const packageJson = read("package.json")

includesAll(
  seed,
  [
    "'JALAN CHANNEL'",
    "'SUNGAI MERAH'",
    "'WONDERFUL'",
    "'SUNGAI MAAW'",
    "'DIRECTOR'",
    "insert into public.outlet_module_access",
    "('stock')",
    "'clementkcl@elitempsb.com'",
    "('admin')",
    "('director')",
  ],
  "Seed role/scope setup"
)

includesAll(
  seed,
  [
    "insert into public.items",
    "'0001'",
    "'0002'",
    "'0003'",
    "'0004'",
    "update public.items item",
    "set default_brand_id = brand.id",
  ],
  "Seed stock item master"
)

includesAll(
  seed,
  [
    "insert into public.barcode_weight_rules",
    "null::uuid",
    "on conflict (item_id, brand_id, origin_id, location_id)",
  ],
  "Seed barcode rule"
)

includesAll(
  seed,
  [
    "EM-SEED-OUT-001",
    "EM-SEED-OUT-002",
    "EM-SEED-OUT-003",
    "EM-SEED-RETURN-INSPECTION-001",
    "EM-SEED-DAMAGE-001",
    "EM-SEED-DAMAGE-APPROVE-001",
    "EM-SEED-RETURN-SUPPLIER-001",
    "EM-SEED-STOCK-TAKE-001",
    "'INSPECTION'",
    "'customer_return'",
  ],
  "Seed barcode stock units"
)

includesAll(
  seed,
  [
    "ORD-SEED-PICKUP-001",
    "ORD-SEED-DELIVERY-001",
    "'READY_FOR_PICKUP'",
    "'READY_FOR_DELIVERY'",
    "insert into public.order_stock_reservations",
    "'ACTIVE'",
  ],
  "Seed order outbound fixtures"
)

includesAll(
  seed,
  [
    "insert into public.stock_damage_requests",
    "DMG-SEED-SUBMITTED-001",
    "DMG-SEED-REVIEWED-001",
    "seed/stock/damage-submitted.jpg",
    "seed/stock/damage-reviewed.jpg",
    "'MANAGER_REVIEWED'",
    "Seed damage request ready for director approval.",
  ],
  "Seed damage workflow fixtures"
)

includesAll(
  seed,
  [
    "insert into public.stock_return_supplier_requests",
    "RS-SEED-SUBMITTED-001",
    "EM-SEED-RETURN-SUPPLIER-001",
    "Seed supplier return request ready for manager approval.",
  ],
  "Seed return-supplier workflow fixtures"
)

includesAll(
  seed,
  [
    "insert into public.stock_take_sessions",
    "ST-SEED-DRAFT-001",
    "ST-SEED-SUBMITTED-001",
    "ST-SEED-REVIEWED-001",
    "insert into public.stock_take_lines",
    "EM-SEED-STOCK-TAKE-001",
    "Seed stock take barcode line.",
  ],
  "Seed stock-take workflow fixtures"
)

includesAll(
  seed,
  [
    "on conflict (barcode) do nothing",
    "on conflict (request_no) do nothing",
    "on conflict (session_no) do nothing",
    "not exists (",
  ],
  "Seed idempotency"
)

assert(
  packageJson.includes("stock-seed-coverage.mjs"),
  "npm run smoke must include stock-seed-coverage.mjs"
)

console.log("Stock seed coverage checks passed.")
