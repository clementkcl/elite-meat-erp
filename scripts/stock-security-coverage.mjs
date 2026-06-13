import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === ".git"
    ) {
      continue
    }

    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walk(fullPath, files)
      continue
    }

    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
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

const sourceFiles = [
  ...walk(path.join(root, "app")),
  ...walk(path.join(root, "components")),
  ...walk(path.join(root, "lib")),
].map((file) => path.relative(root, file).replaceAll(path.sep, "/"))

const serviceRolePattern =
  /SUPABASE_SERVICE|SERVICE_ROLE|service_role|service-role|supabase_service/i

for (const relativePath of sourceFiles) {
  const source = read(relativePath)

  assert(
    !serviceRolePattern.test(source),
    `${relativePath} must not reference Supabase service-role credentials.`
  )
}

const env = read("lib/env.ts")
const browserClient = read("lib/supabase/client.ts")
const serverClient = read("lib/supabase/server.ts")
const stockActions = read("lib/stock/actions.ts")
const stockData = read("lib/stock/data.ts")
const stockPage = read("components/stock/stock-page.tsx")
const workflowForms = read("components/stock/workflow-forms.tsx")
const noBarcodeRoute = read("app/(erp)/stock/no-barcode-inbound/page.tsx")
const appShell = read("components/erp/app-shell.tsx")
const packageJson = read("package.json")

includesAll(
  env + browserClient + serverClient,
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "anonKey",
  ],
  "Supabase public anon env usage"
)

assert(
  !env.includes("SUPABASE_SERVICE") &&
    !browserClient.includes("SUPABASE_SERVICE") &&
    !serverClient.includes("SUPABASE_SERVICE"),
  "Supabase clients must not read service-role environment variables."
)

includesAll(
  noBarcodeRoute,
  ['redirect("/stock/inbound")'],
  "No-barcode inbound route redirect"
)

includesAll(
  stockActions,
  [
    "export async function noBarcodeInboundAction",
    "No-barcode inbound is disabled for MVP",
    "Generate and print a barcode label first",
  ],
  "No-barcode server action block"
)

const noBarcodeActionStart = stockActions.indexOf(
  "export async function noBarcodeInboundAction"
)
const noBarcodeActionEnd = stockActions.indexOf(
  "\nexport async function ",
  noBarcodeActionStart + 1
)
const noBarcodeAction = stockActions.slice(
  noBarcodeActionStart,
  noBarcodeActionEnd === -1 ? stockActions.length : noBarcodeActionEnd
)

assert(
  noBarcodeActionStart >= 0 && !noBarcodeAction.includes('.from("no_barcode_stock")'),
  "No-barcode inbound action must not create loose no-barcode stock."
)

assert(
  !appShell.includes('href: "/stock/no-barcode-inbound"') &&
    !appShell.includes('prefix: "/stock/no-barcode-inbound"'),
  "Sidebar must not advertise no-barcode inbound as an active Stock workflow."
)

includesAll(
  workflowForms,
  [
    "New loose no-barcode balances are disabled",
    "Generate and print an",
    "internal barcode label",
    "No-barcode stock needs a label first",
  ],
  "No-barcode worker guidance"
)

assert(
  !workflowForms.includes('submitLabel="Save no-barcode inbound"'),
  "Stock workflow forms must not expose Save no-barcode inbound as an active submit action."
)

includesAll(
  stockPage,
  [
    '"no-barcode-inbound":',
    "No-Barcode Label Flow",
    "Generate a barcode label first",
  ],
  "No-barcode label-flow route metadata"
)

includesAll(
  stockData,
  [
    "Legacy no-barcode weight",
    'loadRows("no_barcode_stock")',
  ],
  "Legacy no-barcode visibility"
)

assert(
  packageJson.includes("stock-security-coverage.mjs"),
  "npm run smoke must include stock-security-coverage.mjs"
)

console.log("Stock security coverage checks passed.")
