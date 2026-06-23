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

function stockMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((file) =>
      /^2026061000(28|31|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)_.*\.sql$/.test(file) ||
      /^20260623000(1|2|3|6)_.*\.sql$/.test(file)
    )
    .sort()
}

const files = stockMigrationFiles()

assert(
  files.includes("202606100053_stock_inbound_session_undo_v1.sql"),
  "Stock migration safety must include the latest stock inbound session undo migration."
)

assert(
  files.includes("202606100054_stock_outbound_transfer_hardening_v1.sql"),
  "Stock migration safety must include the stock outbound and transfer hardening migration."
)

assert(
  files.includes("202606100055_stock_take_exceptions_v1.sql"),
  "Stock migration safety must include the stock take exception approval migration."
)

assert(
  files.includes("202606230002_stock_mobile_worker_mvp_v1.sql"),
  "Stock migration safety must include the stock mobile worker MVP migration."
)

assert(
  files.includes("202606230003_stock_receive_transfer_wrong_location_block_v1.sql"),
  "Stock migration safety must include the strict receive-transfer wrong-location block migration."
)

assert(
  files.includes("202606230006_stock_transfer_any_location_v1.sql"),
  "Stock migration safety must include the stock transfer any active location migration."
)

const destructivePatterns = [
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\balter\s+table\b[\s\S]{0,140}\bdrop\s+column\b/i,
  /\bdelete\s+from\s+public\./i,
  /\bdelete\s+from\s+storage\./i,
]

for (const file of files) {
  const relativePath = `supabase/migrations/${file}`
  const source = read(relativePath)

  for (const pattern of destructivePatterns) {
    assert(
      !pattern.test(source),
      `${relativePath} contains a destructive migration statement: ${pattern}`
    )
  }

  const lines = source.split(/\r?\n/)

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
      `${relativePath}:${index + 1} policy "${createMatch[1]}" must be immediately preceded by ${expectedDrop}`
    )
  }
}

console.log("Stock migration safety checks passed.")
