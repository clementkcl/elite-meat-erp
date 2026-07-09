import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(path, "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const seed = read("supabase/seed.sql")
const qaPlan = read("docs/SUPABASE_QA_PLAN.md")

for (const fragment of [
  "insert into auth.users",
  "auth.identities",
  "ChangeMe-QA-2026!",
  "qa.retail.worker.jc@example.test",
  "qa.retail.worker.sm@example.test",
  "qa.admin@example.test",
  "qa.director@example.test",
  "qa.noorders@example.test",
  "when 'JALAN CHANNEL' then '10'",
  "when 'SUNGAI MERAH' then '11'",
  "when 'WONDERFUL' then '12'",
  "outlet.name = 'QA NO ORDERS'",
  "access.module_key in ('orders', 'delivery', 'retail', 'processing')",
]) {
  assert(seed.includes(fragment), `QA seed missing: ${fragment}`)
}

for (const fragment of [
  "QA Auth users are seeded by `supabase/seed.sql` for local/dev QA.",
  "`qa.noorders@example.test`",
  "Order V1 reserves stock immediately when a confirmed Manual ERP order is created.",
  "JALAN CHANNEL | `10`",
  "SUNGAI MERAH | `11`",
  "WONDERFUL | `12`",
]) {
  assert(qaPlan.includes(fragment), `QA plan missing: ${fragment}`)
}

console.log("Order QA environment coverage checks passed.")
