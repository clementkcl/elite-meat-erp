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

function functionBody(source, name) {
  const marker = `export async function ${name}`
  const start = source.indexOf(marker)

  assert(start >= 0, `Missing stock action: ${name}`)

  const next = source.indexOf("\nexport async function ", start + marker.length)
  return source.slice(start, next === -1 ? source.length : next)
}

const actions = read("lib/stock/actions.ts")
const workflowForms = read("components/stock/workflow-forms.tsx")
const types = read("lib/stock/types.ts")
const data = read("lib/stock/data.ts")
const itemCodeHelper = read("lib/stock/item-code.ts")
const barcodeLabelHelper = read("lib/stock/barcode-label.ts")
const regression = read("scripts/stock-workflow-regression.mjs")
const migration037 = read("supabase/migrations/202606100037_stock_inbound_labels_rules_v1.sql")
const migration044 = read("supabase/migrations/202606100044_item_master_all_roles_v1.sql")
const migration045 = read("supabase/migrations/202606100045_item_master_default_brand_v1.sql")
const seed = read("supabase/seed.sql")
const packageJson = read("package.json")

includesAll(
  migration037,
  [
    "where item_code !~ '^[0-9]+$'",
    "set item_code = lpad",
    "items_item_code_numeric_only_check",
    "check (item_code ~ '^[0-9]+$')",
    "add column if not exists chinese_name text",
    "add column if not exists iban_name text",
    "add column if not exists default_low_stock_level",
  ],
  "Item master numeric-code migration"
)

includesAll(
  migration045,
  [
    "add column if not exists default_brand_id",
    "references public.brands",
    "idx_items_category_default_brand_section_name_unique",
    "on public.items(category, default_brand_id, section, name)",
    "idx_items_default_brand",
  ],
  "Item master category-brand-product uniqueness"
)

includesAll(
  migration044,
  [
    "create or replace function public.can_edit_item_master()",
    "public.has_role('retail_team_general_worker')",
    "public.has_role('retail_manager')",
    "public.has_role('delivery_team_general_worker')",
    "public.has_role('delivery_manager')",
    "public.has_role('processing_team_general_worker')",
    "public.has_role('processing_manager')",
    "public.has_role('account')",
    "public.has_role('admin')",
    "public.has_role('director')",
    "create policy \"all erp users can insert item master\"",
    "create policy \"all erp users can update item master\"",
    "create policy \"stock admins can delete items\"",
    "using (public.can_administer_stock());",
  ],
  "Item master role policies"
)

includesAll(
  actions,
  [
    "const stockItemEditorRoles: UserRole[]",
    "assertUniqueItemCode",
    "is already used.",
    "normalizeItemCode",
    "Inactive products cannot receive new inbound stock.",
    "assertActiveItem(context.supabase, parsed.itemId)",
  ],
  "Item master action guards"
)

for (const actionName of ["createItemAction", "updateItemAction"]) {
  const body = functionBody(actions, actionName)

  includesAll(
    body,
    [
      "runStockAction(formData, stockItemEditorRoles",
      "item_code: itemCode",
      "category: parsed.category",
      "default_brand_id: parsed.defaultBrandId",
      "section: parsed.section || \"GENERAL\"",
      "name: parsed.name",
      "chinese_name: normalizeOptionalName(parsed.chineseName)",
      "iban_name: normalizeOptionalName(parsed.ibanName)",
      "barcode_required: parsed.barcodeRequired",
      "default_low_stock_level: parsed.defaultLowStockLevel",
    ],
    `${actionName} item fields`
  )
}

includesAll(
  functionBody(actions, "updateItemAction"),
  [
    "is_active: parsed.isActive",
    ".select(\"id\")",
    ".single()",
    "Item was not found or your role cannot update it.",
  ],
  "Item update active flag"
)

includesAll(
  workflowForms,
  [
    "export function ItemMasterForm",
    "generatedItemCode(items)",
    "nextItemCode(itemCode)",
    "inputMode=\"numeric\"",
    "pattern=\"[0-9]*\"",
    "name=\"defaultBrandId\"",
    "Default brand",
    "Product name",
    "Chinese name",
    "Iban name",
    "Default low stock kg",
    "Barcode required",
    "Active",
    "Enter name and a numeric item code before creating the item.",
  ],
  "Item master form controls"
)

includesAll(
  types + data,
  [
    "defaultBrandId",
    "default_brand_id",
    "barcodeRequired",
    "defaultLowStockLevel",
    "default_low_stock_level",
  ],
  "Item master data contract"
)

includesAll(
  itemCodeHelper + barcodeLabelHelper + regression,
  [
    "normalizeItemCode",
    "isNumericItemCode",
    "nextItemCode",
    "generatedItemCode",
    "Generated item code should ignore old non-numeric codes",
    "Generated barcode should be blank when item code is not numeric.",
  ],
  "Item code helper regression"
)

includesAll(
  seed,
  [
    "insert into public.items",
    "update public.items item",
    "set default_brand_id = brand.id",
    "on conflict (item_code) do update",
  ],
  "Item master seed setup"
)

assert(
  packageJson.includes("stock-item-master-coverage.mjs"),
  "npm run smoke must include stock-item-master-coverage.mjs"
)

console.log("Stock item master coverage checks passed.")
