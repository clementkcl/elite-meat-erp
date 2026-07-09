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
const stockPage = read("components/stock/stock-page.tsx")
const types = read("lib/stock/types.ts")
const data = read("lib/stock/data.ts")
const displayNames = read("lib/stock/display-names.ts")
const itemCodeHelper = read("lib/stock/item-code.ts")
const barcodeLabelHelper = read("lib/stock/barcode-label.ts")
const regression = read("scripts/stock-workflow-regression.mjs")
const migration037 = read("supabase/migrations/202606100037_stock_inbound_labels_rules_v1.sql")
const migration044 = read("supabase/migrations/202606100044_item_master_all_roles_v1.sql")
const migration045 = read("supabase/migrations/202606100045_item_master_default_brand_v1.sql")
const migration010 = read("supabase/migrations/202606250010_stock_item_default_weight_v1.sql")
const migration011 = read("supabase/migrations/202606250011_stock_item_display_name_v1.sql")
const migration012 = read("supabase/migrations/202606250012_stock_manufacturer_merge_v1.sql")
const migration013 = read("supabase/migrations/202606250013_stock_item_merge_v1.sql")
const seed = read("supabase/seed.sql")
const packageJson = read("package.json")

const itemMasterStart = workflowForms.indexOf("export function ItemMasterForm")
const masterDataStart = workflowForms.indexOf("export function MasterDataForms")
assert(itemMasterStart >= 0, "Missing ItemMasterForm.")
assert(masterDataStart > itemMasterStart, "Missing MasterDataForms after ItemMasterForm.")
const itemMasterForm = workflowForms.slice(itemMasterStart, masterDataStart)

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
  migration010,
  [
    "add column if not exists default_weight_kg",
    "items_default_weight_kg_nonnegative",
    "default_weight_kg is null or default_weight_kg >= 0",
    "Optional fixed-weight fallback in kg",
  ],
  "Item master default fixed-weight migration"
)

includesAll(
  migration011,
  [
    "add column if not exists display_name",
    "concat_ws(",
    "item.default_brand_id = brand.id",
    "idx_items_display_name",
    "Stored default display name",
  ],
  "Item master stored display-name migration"
)

includesAll(
  migration012,
  [
    "create or replace function public.merge_stock_manufacturer",
    "if not public.can_administer_stock()",
    "update public.stock_units set brand_id = p_target_brand_id",
    "update public.stock_movements set brand_id = p_target_brand_id",
    "update public.barcode_weight_rules set brand_id = p_target_brand_id",
    "set is_active = false",
    "STOCK_MANUFACTURER_MERGED",
    "grant execute on function public.merge_stock_manufacturer(uuid, uuid) to authenticated",
  ],
  "Manufacturer merge migration"
)

includesAll(
  migration013,
  [
    "create or replace function public.merge_stock_item",
    "if not public.can_administer_stock()",
    "update public.stock_units set item_id = p_target_item_id",
    "update public.stock_movements set item_id = p_target_item_id",
    "update public.customer_order_items set item_id = p_target_item_id",
    "update public.order_stock_reservations set item_id = p_target_item_id",
    "update public.retail_price_rules set item_id = p_target_item_id",
    "Cannot merge: target product already has matching retail price rules.",
    "update public.retail_processing_boms set raw_item_id = p_target_item_id",
    "update public.retail_processing_boms set finished_item_id = p_target_item_id",
    "update public.retail_processing_raw_lines set item_id = p_target_item_id",
    "update public.retail_processing_finished_lines set item_id = p_target_item_id",
    "update public.barcode_weight_rules set item_id = p_target_item_id",
    "set is_active = false",
    "STOCK_ITEM_MERGED",
    "grant execute on function public.merge_stock_item(uuid, uuid) to authenticated",
  ],
  "Product merge migration"
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
    "assertUniqueProductManufacturer",
    "Product already exists for this manufacturer. Select the existing product instead.",
    "normalizeSpacing",
    "canonicalLookupName",
    "is already used.",
    "normalizeItemCode",
    "Inactive products cannot receive new inbound stock.",
    "assertActiveItem(context.supabase, parsed.itemId)",
  ],
  "Item master action guards"
)

includesAll(
  functionBody(actions, "createItemAction"),
  [
    "runStockAction(formData, stockItemEditorRoles",
    "resolveNamedRecordId(",
    "parsed.defaultBrandId",
    "parsed.defaultBrandName",
    "const section = normalizeProductField(parsed.section, \"GENERAL\")",
    "const productName = normalizeProductField(parsed.name)",
    "const displayName = itemDisplayName(",
    "await assertUniqueProductManufacturer(context.supabase, {",
    "item_code: itemCode",
    "category: parsed.category",
    "default_brand_id: defaultBrandId",
    "display_name: displayName",
    "section,",
    "name: productName",
    "chinese_name: chineseName",
    "iban_name: ibanName",
    "barcode_required: parsed.barcodeRequired",
    "default_low_stock_level: parsed.defaultLowStockLevel",
    "default_weight_kg: parsed.defaultWeightKg ?? null",
    "brandName: defaultBrandName ?? undefined",
  ],
  "createItemAction item fields"
)

includesAll(
  functionBody(actions, "mergeBrandAction"),
  [
    "runStockAction(formData, [\"admin\", \"director\"]",
    "parsed.sourceBrandId === parsed.targetBrandId",
    "Choose two different manufacturers.",
    "merge_stock_manufacturer",
    "p_source_brand_id: parsed.sourceBrandId",
    "p_target_brand_id: parsed.targetBrandId",
    "revalidatePath(\"/stock/settings\")",
    "revalidatePath(\"/stock/inbound\")",
    "Manufacturer merged. Source is inactive.",
  ],
  "Manufacturer merge action"
)

includesAll(
  functionBody(actions, "mergeItemAction"),
  [
    "runStockAction(formData, [\"admin\", \"director\"]",
    "parsed.sourceItemId === parsed.targetItemId",
    "Choose two different products.",
    "merge_stock_item",
    "p_source_item_id: parsed.sourceItemId",
    "p_target_item_id: parsed.targetItemId",
    "revalidatePath(\"/stock/settings\")",
    "revalidatePath(\"/stock/inbound\")",
    "revalidatePath(\"/stock/items\")",
    "Product merged. Source is inactive.",
  ],
  "Product merge action"
)

includesAll(
  functionBody(actions, "updateItemAction"),
  [
    "runStockAction(formData, stockItemEditorRoles",
    "item_code: itemCode",
    "category: parsed.category",
    "default_brand_id: parsed.defaultBrandId",
    "const section = normalizeProductField(parsed.section, \"GENERAL\")",
    "const productName = normalizeProductField(parsed.name)",
    "const displayName = itemDisplayName(",
    "await assertUniqueProductManufacturer(context.supabase, {",
    "section,",
    "display_name: displayName",
    "name: productName",
    "chinese_name: chineseName",
    "iban_name: ibanName",
    "barcode_required: parsed.barcodeRequired",
    "default_low_stock_level: parsed.defaultLowStockLevel",
    "default_weight_kg: parsed.defaultWeightKg ?? null",
  ],
  "updateItemAction item fields"
)

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
    "useState(\"\")",
    "const [editItemQuery, setEditItemQuery] = useState(\"\")",
    "createNameInputRef",
    "editNameInputRef",
    "function selectEditItem",
    "filteredEditItems",
    "id=\"editItemSearch\"",
    "placeholder=\"Search item code or product\"",
    "filteredEditItems.slice(0, 6)",
    "No product match. Open the full product list.",
    "Full product list",
    "Item code is generated. Workers only need category and product name.",
    "Required item setup: item code, category, product name.",
    "Next: open inbound and scan stock.",
    "<Link href=\"/stock/inbound\">Open Barcode Inbound</Link>",
    "Optional item details",
    "Advanced item settings",
    "inputMode=\"numeric\"",
    "pattern=\"[0-9]*\"",
    "name=\"defaultBrandId\"",
    "Default manufacturer",
    "Product name",
    "Chinese name",
    "Iban name",
    "Default low stock kg",
    "Default fixed weight kg",
    "Barcode required",
    "Active",
    "{selectedItem ? (",
    "Enter name and a numeric item code before creating the item.",
    "function MergeManufacturerForm",
    "function MergeProductForm",
    ".sort((a, b) => compareText(a.name, b.name))",
    "Merge manufacturers",
    "Admin cleanup for duplicate manufacturer names.",
    "Merge products",
    "Admin cleanup for duplicate product names.",
    "Source becomes inactive. Audit kept.",
    "name=\"sourceBrandId\"",
    "name=\"targetBrandId\"",
    "action={mergeBrandAction}",
    "name=\"sourceItemId\"",
    "name=\"targetItemId\"",
    "action={mergeItemAction}",
  ],
  "Item master form controls"
)

includesAll(
  itemMasterForm,
  [
    "id=\"itemCode\"",
    "id=\"name\"",
    "id=\"editItemCode\"",
    "id=\"editName\"",
    "ref={createNameInputRef}",
    "ref={editNameInputRef}",
    "id=\"editDefaultBrandId\"",
    "id=\"editDefaultLowStockLevel\"",
    "id=\"editDefaultWeightKg\"",
    "autoComplete=\"off\"",
    "enterKeyHint=\"done\"",
    "inputMode=\"decimal\"",
  ],
  "Item master mobile keyboard controls"
)

assert(
  !workflowForms.includes("useState(items[0]?.id ?? \"\")"),
  "Item master edit form must not auto-select the first item."
)

includesAll(
  types + data + displayNames,
  [
    "defaultBrandId",
    "displayName",
    "default_brand_id",
    "display_name",
    "item?.displayName?.trim() || productName",
    "barcodeRequired",
    "defaultLowStockLevel",
    "default_low_stock_level",
    "defaultWeightKg",
    "default_weight_kg",
  ],
  "Item master data contract"
)

includesAll(
  stockPage,
  [
    "{ key: \"displayName\", header: \"Display name\" }",
    "displayName: stockDisplayItemName(",
    "String(row.displayName ?? row.name ?? \"Unknown product\")",
    "<MasterDataForms brands={data.brands} items={data.items} />",
  ],
  "Product master display-name list"
)

includesAll(
  itemCodeHelper + barcodeLabelHelper + regression,
  [
    "normalizeItemCode",
    "isNumericItemCode",
    "nextItemCode",
    "generatedItemCode",
    "Generated item code should ignore old non-numeric codes",
    "Generated barcode should be blank when session code has no digits.",
  ],
  "Item code helper regression"
)

includesAll(
  seed,
  [
    "insert into public.items",
    "set display_name = trim(",
    "default_weight_kg",
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
