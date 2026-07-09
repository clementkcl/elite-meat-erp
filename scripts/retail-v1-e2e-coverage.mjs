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

function assertIncludes(source, fragment, message) {
  assert(source.includes(fragment), `${message} Missing: ${fragment}`)
}

function assertAll(source, fragments, message) {
  for (const fragment of fragments) {
    assertIncludes(source, fragment, message)
  }
}

function assertNotIncludes(source, fragment, message) {
  assert(!source.includes(fragment), `${message} Forbidden: ${fragment}`)
}

function assertClose(actual, expected, message) {
  assert(Math.abs(actual - expected) < 0.000001, `${message} Expected ${expected}, got ${actual}.`)
}

const scenarios = []

function scenario(id, title, checks) {
  try {
    checks()
    scenarios.push({ id, title, status: "passed" })
  } catch (error) {
    throw new Error(`Scenario ${id} failed: ${title}\n${error.message}`)
  }
}

const retailPage = read("components/retail/retail-page.tsx")
const retailForms = read("components/retail/retail-forms.tsx")
const retailActions = read("lib/retail/actions.ts")
const retailData = read("lib/retail/data.ts")
const retailReports = read("lib/retail/reports.ts")
const retailTypes = read("lib/retail/types.ts")
const retailFileRoute = read("app/api/retail/files/route.ts")
const dataTable = read("components/stock/data-table.tsx")
const statusBadge = read("components/ui/status-badge.tsx")
const packageJson = read("package.json")
const retailAccessMigration = read(
  "supabase/migrations/202606230017_retail_home_access_control_v1.sql"
)
const retailDailySalesMigration = read(
  "supabase/migrations/202606230018_retail_daily_sales_summary_v1.sql"
)
const retailExpensesMigration = read(
  "supabase/migrations/202606230019_retail_expenses_v1.sql"
)
const retailCleaningMigration = read(
  "supabase/migrations/202606230020_retail_cleaning_checklist_v1.sql"
)
const retailProcessingMigration = read(
  "supabase/migrations/202606230021_retail_processing_v1.sql"
)
const retailCashClosingMigration = read(
  "supabase/migrations/202606230023_retail_daily_cash_closing_v1.sql"
)
const retailAuditMigration = read(
  "supabase/migrations/202606230024_retail_audit_trail_v1.sql"
)
const retailDatabaseMigration = read(
  "supabase/migrations/202606230025_retail_database_tables_v1.sql"
)
const retailFileMetadataMigration = read(
  "supabase/migrations/202606240004_retail_file_metadata_rls_v1.sql"
)

const workerProfile = {
  roles: ["retail_team_general_worker"],
  outletId: "outlet-a",
}
const managerProfile = {
  roles: ["retail_manager"],
  outletId: "outlet-a",
}
const directorProfile = {
  roles: ["director"],
  outletId: null,
}
const outletRecords = [
  { id: "a-1", outletId: "outlet-a" },
  { id: "b-1", outletId: "outlet-b" },
]

function isGlobal(profile) {
  return profile.roles.includes("admin") || profile.roles.includes("director")
}

function visibleOutletRows(profile, rows) {
  if (isGlobal(profile) || !profile.outletId) {
    return rows
  }

  return rows.filter((row) => row.outletId === profile.outletId)
}

function dailySalesTotal(sale) {
  return (
    sale.cashSales +
    sale.bankTransferSales +
    sale.ewalletSales +
    sale.creditSales
  )
}

function cashClosing({ openingCash, cashSales, expenses, actualCashCounted }) {
  const cashExpenses = expenses
    .filter(
      (expense) =>
        expense.paymentMethod === "CASH" &&
        !["REJECTED", "CANCELLED"].includes(expense.status)
    )
    .reduce((total, expense) => total + expense.amount, 0)
  const expectedCash = openingCash + cashSales - cashExpenses

  return {
    cashExpenses,
    expectedCash,
    variance: actualCashCounted - expectedCash,
  }
}

function processingMath({ rawWeights, finishedWeights, wastageWeight }) {
  const totalRawWeight = rawWeights.reduce((total, weight) => total + weight, 0)
  const totalFinishedWeight = finishedWeights.reduce(
    (total, weight) => total + weight,
    0
  )
  const wastagePercent = (wastageWeight / totalRawWeight) * 100
  const yieldPercent = (totalFinishedWeight / totalRawWeight) * 100
  const accountedWeight = totalFinishedWeight + wastageWeight
  const unaccountedDifference = totalRawWeight - accountedWeight
  const unaccountedDifferencePercent =
    (unaccountedDifference / totalRawWeight) * 100

  return {
    totalRawWeight,
    totalFinishedWeight,
    wastagePercent,
    yieldPercent,
    unaccountedDifference,
    unaccountedDifferencePercent,
  }
}

const sampleSale = {
  cashSales: 125,
  bankTransferSales: 200,
  ewalletSales: 75,
  creditSales: 50,
}
const sampleExpenses = [
  { amount: 45, paymentMethod: "CASH", status: "SUBMITTED" },
  { amount: 80, paymentMethod: "EWALLET", status: "SUBMITTED" },
  { amount: 12, paymentMethod: "CASH", status: "REJECTED" },
]
const sampleClosing = cashClosing({
  openingCash: 300,
  cashSales: sampleSale.cashSales,
  expenses: sampleExpenses,
  actualCashCounted: 390,
})
const sampleProcessing = processingMath({
  rawWeights: [60, 40],
  finishedWeights: [82, 3],
  wastageWeight: 8,
})

scenario(1, "Retail worker can view today's own outlet records", () => {
  assert(visibleOutletRows(workerProfile, outletRecords).length === 1, "Worker fixture must be outlet scoped.")
  assertIncludes(retailPage, "filterWorkerTodayData", "Worker view must filter to today's operational records.")
  assertIncludes(retailData, "sameOutlet(demoRetailDailySales, profile)", "Loader must scope sales by outlet.")
})

scenario(2, "Retail worker cannot see other outlet records", () => {
  assert(
    !visibleOutletRows(workerProfile, outletRecords).some(
      (row) => row.outletId === "outlet-b"
    ),
    "Worker fixture should hide other outlet rows."
  )
  assertIncludes(retailData, "sameOutlet(", "Loader must enforce outlet filtering.")
  assertIncludes(retailAccessMigration, "public.can_access_outlet(outlet_id)", "RLS must scope retail rows by outlet.")
})

scenario(3, "Retail manager cannot see other outlet records", () => {
  assert(
    visibleOutletRows(managerProfile, outletRecords).every(
      (row) => row.outletId === "outlet-a"
    ),
    "Manager fixture should stay assigned-outlet scoped."
  )
  assertIncludes(retailReports, "canViewAllOutlets", "Reports must distinguish manager/global scope.")
  assertIncludes(retailReports, "return [", "Manager report scope must synthesize only assigned outlet.")
})

scenario(4, "Admin/director can see all outlet records", () => {
  assert(visibleOutletRows(directorProfile, outletRecords).length === 2, "Director fixture must see all outlets.")
  assertIncludes(retailData, "profile.roles.includes(\"director\")", "Loader must treat director as global.")
  assertIncludes(retailDatabaseMigration, "public.is_admin_or_director()", "RLS must allow admin/director global access.")
})

scenario(5, "Retail manager can create daily sales summary", () => {
  assertIncludes(retailActions, "export async function recordRetailDailySaleAction", "Daily sales action must exist.")
  assertIncludes(retailActions, "const canConfirm = hasAnyRole(context.profile, retailAdminRoles)", "Daily sales action must detect manager/admin/director confirmation access.")
  assertIncludes(retailAccessMigration, "retail managers can insert scoped daily sales", "Daily sales insert RLS must be manager scoped.")
})

scenario(6, "Retail worker can save draft but cannot confirm daily sales", () => {
  assertIncludes(retailPage, "canCreateDailySales = canManageSettings || workerView", "Daily sales form must allow assigned retail workers to save drafts.")
  assertIncludes(retailForms, 'const canConfirm = canConfirmDailySales(profile)', "Daily sales form must branch manager confirmation from worker draft.")
  assertIncludes(retailForms, '<input type="hidden" name="status" value={canConfirm ? "CONFIRMED" : "DRAFT"} />', "Worker daily sales submissions must be saved as drafts.")
  assertIncludes(retailActions, 'const status = canConfirm ? parsed.status : "DRAFT"', "Server action must force non-manager Daily Sales to draft.")
  assertIncludes(retailActions, "export async function confirmRetailDailySaleAction", "Manager confirmation action must exist.")
  assertNotIncludes(
    "const retailAdminRoles: UserRole[] = [\"retail_manager\", \"admin\", \"director\"]",
    "retail_team_general_worker",
    "Worker role must not be in Daily Sales confirmation role set."
  )
})

scenario(7, "Duplicate daily sales summary for same outlet/date is blocked", () => {
  assertIncludes(retailDailySalesMigration, "retail_daily_sales_one_summary_per_outlet_date", "Daily sales must have unique outlet/date index.")
  assertIncludes(retailActions, "onConflict: \"outlet_id,sales_date\"", "Daily sales action must prevent duplicate rows by outlet/date.")
})

scenario(8, "Payment buckets calculate total sales correctly", () => {
  assert(dailySalesTotal(sampleSale) === 450, "Daily sales total fixture should be 450.")
  assertIncludes(retailActions, "parsed.cashSales +", "Daily sales action must sum cash sales.")
  assertIncludes(retailDailySalesMigration, "retail_daily_sales_total_matches_components", "Database must enforce total equals payment buckets.")
})

scenario(9, "Missing AutoCount attachment warns but does not block", () => {
  assertIncludes(retailActions, "AutoCount attachment is missing", "Daily sales action must return a missing-attachment warning.")
  assertIncludes(retailData, "attachmentStatus: attachmentUrl ? \"OK\" : \"MISSING\"", "Loader must expose missing attachment status.")
  assertIncludes(retailReports, "Missing AutoCount attachment", "Reports must surface missing attachment warnings.")
})

scenario(10, "Retail worker can submit expense with receipt", () => {
  assertIncludes(retailActions, "export async function createRetailExpenseAction", "Expense submit action must exist.")
  assertIncludes(retailActions, "retailOperatorRoles", "Expense submit action must allow retail operators.")
  assertIncludes(retailActions, 'fieldName: "receiptFile"', "Expense submit action must upload receipt file.")
  assertIncludes(retailActions, "receipt_url: receiptUrl", "Expense submit action must save uploaded receipt path.")
  assertIncludes(retailActions, "retail/${outletId}/${recordType}/${recordId}/", "Retail uploads must use outlet and record-scoped storage paths.")
  assertIncludes(retailActions, '.from("retail_files")', "Retail uploads must create dedicated retail file metadata.")
  assertIncludes(retailFileMetadataMigration, "create table if not exists public.retail_files", "Retail file metadata table must exist.")
  assertIncludes(retailFileMetadataMigration, "public.can_read_erp_file_object", "Retail storage reads must be policy-gated.")
  assertIncludes(retailFileMetadataMigration, "exists (\n          select 1\n          from public.retail_files", "Retail storage reads must require matching retail file metadata.")
  assertIncludes(retailFileRoute, ".from(\"retail_files\")", "Retail file viewing route must check Retail file metadata.")
  assertIncludes(retailFileRoute, "createSignedUrl(path, 60)", "Retail file viewing route must create short-lived signed URLs.")
  assertIncludes(retailPage, "/api/retail/files?path=", "Retail tables must use the authorized file viewing route.")
  assertIncludes(dataTable, 'kind: "link"', "Retail file links must render through the shared table link value.")
})

scenario(11, "Retail worker cannot submit expense without receipt", () => {
  assertIncludes(retailActions, "Receipt is required.", "Expense schema must require receipt.")
  assertIncludes(retailExpensesMigration, "retail_expenses_receipt_required", "Database must enforce receipt requirement.")
})

scenario(12, "Cash expense reduces expected cash", () => {
  assert(sampleClosing.cashExpenses === 45, "Cash expense fixture should total only valid cash expenses.")
  assert(sampleClosing.expectedCash === 380, "Expected cash should be opening cash plus cash sales minus cash expenses.")
  assertIncludes(retailActions, ".eq(\"payment_method\", \"CASH\")", "Cash closing must pull only cash expenses.")
})

scenario(13, "Non-cash expense does not reduce expected cash", () => {
  assert(
    sampleClosing.cashExpenses !== sampleExpenses[0].amount + sampleExpenses[1].amount,
    "Non-cash expense must not be included in cash expenses."
  )
  assertIncludes(retailReports, "Cash expenses reduce expected cash", "Reports must describe cash-only expense treatment.")
})

scenario(14, "Manager can review expense", () => {
  assertIncludes(retailActions, "export async function updateRetailExpenseStatusAction", "Expense review action must exist.")
  assertIncludes(retailActions, "const roles = retailExpenseReviewRoles", "Expense review must use manager/admin/director roles.")
  assertIncludes(retailActions, "Expense must be reviewed by a different manager.", "Expense review must enforce checker separation.")
})

scenario(15, "Retail worker can complete cleaning task", () => {
  assertIncludes(retailActions, "export async function completeRetailCleaningTaskAction", "Cleaning completion action must exist.")
  assertIncludes(retailActions, "cleaningCompletionRoles", "Cleaning completion must allow retail workers.")
  assertIncludes(retailActions, ".from(\"retail_cleaning_completions\")", "Cleaning completion history must be written.")
  assertIncludes(retailForms, "Complete Cleaning", "Worker cleaning completion form must be visible.")
  assertIncludes(retailCleaningMigration, "retail users can insert cleaning completions", "Cleaning completion RLS must allow scoped worker inserts.")
})

scenario(16, "Missing cleaning task appears in report", () => {
  assertIncludes(retailReports, "missingCleaningTasks", "Report model must expose missing cleaning tasks.")
  assertIncludes(retailReports, "isCleaningDueOn(task, focusDate)", "Reports must identify required tasks for focus date.")
  assertIncludes(retailPage, "Cleaning missing tasks", "Retail reports must render missing cleaning table.")
})

scenario(17, "Completed cleaning task shows green status", () => {
  assertIncludes(statusBadge, "\"DONE\"", "DONE status must be recognized.")
  assertIncludes(statusBadge, "? \"success\"", "DONE status must render with success badge styling.")
  assertIncludes(retailPage, "cleaningDisplayStatus(task)", "Retail cleaning rows must use display status.")
})

scenario(18, "Missing cleaning task shows red status", () => {
  assertIncludes(retailTypes, "retailCleaningStatuses", "Retail types must define cleaning statuses.")
  assertIncludes(statusBadge, "\"MISSED\"", "MISSED status must be recognized.")
  assertIncludes(statusBadge, "? \"destructive\"", "MISSED status must render with destructive badge styling.")
  assertIncludes(retailPage, "return \"MISSED\"", "Retail cleaning display status must expose missing status.")
})

scenario(19, "Worker can create processing record", () => {
  assertIncludes(retailActions, "export async function createRetailProcessingBatchAction", "Processing action must exist.")
  assertIncludes(retailActions, "processingOperatorRoles", "Processing action must allow worker roles.")
  assertIncludes(retailProcessingMigration, "retail users can insert outlet processing batches", "Processing RLS must allow scoped worker creation.")
})

scenario(20, "Worker can add multiple raw material lines", () => {
  assert(sampleProcessing.totalRawWeight === 100, "Raw fixture must use multiple raw material lines.")
  assertIncludes(retailActions, "parseProcessingLines(formData, \"raw\"", "Processing action must parse raw lines.")
  assertIncludes(retailActions, ".from(\"retail_processing_raw_lines\")", "Processing action must save raw line rows.")
})

scenario(21, "Worker can add multiple finished product lines", () => {
  assert(sampleProcessing.totalFinishedWeight === 85, "Finished fixture must use multiple finished product lines.")
  assertIncludes(retailActions, "parseProcessingLines(\n    formData,\n    \"finished\"", "Processing action must parse finished lines.")
  assertIncludes(retailActions, ".from(\"retail_processing_finished_lines\")", "Processing action must save finished line rows.")
})

scenario(22, "Processing yield percent calculates correctly", () => {
  assertClose(sampleProcessing.yieldPercent, 85, "Yield should be finished weight / raw weight * 100.")
  assertIncludes(retailActions, "(finishedTotalWeightKg / rawTotalWeightKg) * 100", "Processing action must calculate yield percent.")
})

scenario(23, "Wastage percent calculates correctly", () => {
  assertClose(sampleProcessing.wastagePercent, 8, "Wastage should be wastage weight / raw weight * 100.")
  assertIncludes(retailActions, "(parsed.wastageWeightKg / rawTotalWeightKg) * 100", "Processing action must calculate wastage percent.")
})

scenario(24, "Unaccounted difference calculates correctly", () => {
  assertClose(sampleProcessing.unaccountedDifference, 7, "Unaccounted difference should be raw minus finished plus wastage.")
  assertClose(sampleProcessing.unaccountedDifferencePercent, 7, "Unaccounted difference percent should be 7%.")
  assertIncludes(retailActions, "rawTotalWeightKg - accountedWeightKg", "Processing action must calculate unaccounted difference.")
})

scenario(25, "Processing weight difference is display-only", () => {
  assert(sampleProcessing.unaccountedDifference !== 0, "Processing fixture should have a weight difference.")
  assertNotIncludes(retailActions, "processingWarnings", "Processing action must not create weight warning text.")
  assertIncludes(retailActions, "warning_message: null", "Processing action must store calculations without warning text.")
  assertIncludes(retailForms, "Weight differences are", "Worker form must explain weight differences are display-only.")
})

scenario(26, "Processing report can filter by outlet and item", () => {
  assertIncludes(retailReports, "matchesOutlet(batch.outletId", "Processing report must filter by outlet.")
  assertIncludes(retailReports, "matchesProcessingFilters(batch, filters)", "Processing report must filter by processing item/type.")
  assertIncludes(retailPage, "name=\"processingItem\"", "Report UI must include processing item filter.")
})

scenario(27, "Manager can submit one cash closing per outlet/date", () => {
  assertIncludes(retailActions, "export async function submitRetailDailyClosingAction", "Cash closing action must exist.")
  assertIncludes(retailActions, "return runRetailAction(formData, roles", "Cash closing action must be manager/admin/director gated.")
  assertIncludes(retailDatabaseMigration, "retail_cash_closings_one_per_outlet_date", "Canonical cash closings must be unique per outlet/date.")
  assertIncludes(retailActions, "onConflict: \"outlet_id,closing_date\"", "Daily closing action must prevent duplicate closing rows.")
})

scenario(28, "Worker cannot submit cash closing", () => {
  assertIncludes(retailPage, "canSubmitCashClosing = canManageSettings", "Cash closing submit controls must be manager gated.")
  assertIncludes(retailPage, "Cash closing is manager controlled", "Worker cash-closing block must be visible.")
  assertIncludes(retailCashClosingMigration, "public.has_role('retail_manager') or public.is_admin_or_director()", "Cash closing RLS must exclude workers.")
})

scenario(29, "Cash closing pulls sales summary correctly", () => {
  assertIncludes(retailActions, ".from(\"retail_daily_sales\")", "Cash closing action must pull daily sales.")
  assertAll(
    retailActions,
    ["cash_sales", "bank_transfer_sales", "ewallet_sales", "credit_sales"],
    "Cash closing action must pull payment buckets."
  )
})

scenario(30, "Cash closing pulls cash expenses correctly", () => {
  assertIncludes(retailActions, ".from(\"retail_expenses\")", "Cash closing action must pull expenses.")
  assertIncludes(retailActions, ".eq(\"payment_method\", \"CASH\")", "Cash closing action must pull only cash expenses.")
  assertIncludes(retailActions, ".in(\"status\", [\"SUBMITTED\", \"REVIEWED\"])", "Cash closing action must include valid expense statuses.")
})

scenario(31, "Expected cash calculates correctly", () => {
  assert(sampleClosing.expectedCash === 380, "Expected cash fixture should be 380.")
  assertIncludes(retailActions, "expectedCash = parsed.openingCash + cashSales - cashExpenses", "Cash closing action must calculate expected cash.")
})

scenario(32, "Variance calculates correctly", () => {
  assert(sampleClosing.variance === 10, "Variance fixture should be actual cash counted minus expected cash.")
  assertIncludes(retailActions, "varianceAmount = parsed.actualCashCounted - expectedCash", "Cash closing action must calculate variance.")
})

scenario(33, "Variance shows warning", () => {
  assert(sampleClosing.variance !== 0, "Variance warning fixture should be non-zero.")
  assertIncludes(retailActions, "Daily cash closing saved with variance warning.", "Cash closing action must warn on variance.")
  assertIncludes(retailPage, "varianceWarning", "Cash closing table must display variance warning.")
})

scenario(34, "Manager can edit same-day cash closing and audit log is created", () => {
  assertIncludes(retailActions, "assertRetailSameDay(context.profile, parsed.closingDate", "Manager edits must be same-day scoped.")
  assertIncludes(retailActions, "existingId\n          ? \"RETAIL_DAILY_CLOSING_UPDATED\"", "Cash closing update audit action must be recorded.")
  assertIncludes(retailAuditMigration, "log_retail_daily_closings_audit", "Submitted daily closing edits must have field audit trigger.")
})

scenario(35, "Admin/director can reopen/edit past closing and audit log is created", () => {
  assertIncludes(retailActions, "if (isAdminScope(profile))", "Admin/director must bypass same-day edit restriction.")
  assertIncludes(retailCashClosingMigration, "public.is_admin_or_director() or closing_date = current_date", "RLS must allow admin/director past closing edits.")
  assertIncludes(retailAuditMigration, "log_retail_daily_closings_audit", "Past closing edits must have audit trigger.")
})

scenario(36, "Manager report shows only assigned outlet", () => {
  assertIncludes(retailReports, "const scope = canViewAllOutlets ? \"global\" : \"manager\"", "Reports must distinguish manager scope.")
  assertIncludes(retailReports, "profile.outletId", "Manager report scope must use assigned outlet.")
  assertIncludes(retailPage, "const canViewFullReports = canManageSettings", "Retail workers must not receive full reports or export controls.")
  assertIncludes(retailPage, "Export CSV", "Retail reports must expose CSV export controls to report viewers.")
  assertIncludes(retailPage, "retailReportCsvHref(report)", "CSV export must use the filtered report data.")
  assert(visibleOutletRows(managerProfile, outletRecords).length === 1, "Manager report fixture should be one outlet.")
})

scenario(37, "Director/admin report shows all outlets", () => {
  assertIncludes(retailReports, "canViewAllOutlets", "Reports must support global outlet view.")
  assertIncludes(retailPage, "canManageGlobalSettings", "Retail page must derive admin/director global view.")
  assertIncludes(retailPage, "canViewAllOutlets: true", "Admin/director focused reports must use global outlet scope.")
  assertIncludes(retailPage, "resetHref=\"/retail/reports/export\"", "Admin/director export page must remain a focused global export route.")
  assert(visibleOutletRows(directorProfile, outletRecords).length === 2, "Director report fixture should include all outlets.")
})

scenario(38, "Missing cash closing appears in report", () => {
  assertIncludes(retailReports, "Missing cash closing", "Manager report must include missing cash closing KPI.")
  assertIncludes(retailReports, "Missing closing records", "Global report must include missing closing records KPI.")
  assertIncludes(retailReports, "!dayClosings.some", "Report must detect missing closings by scoped outlet.")
})

scenario(39, "Payment method breakdown is correct", () => {
  assert(dailySalesTotal(sampleSale) === 450, "Payment breakdown total should match all payment methods.")
  assertIncludes(retailReports, "Payment method breakdown", "Reports must include payment method breakdown KPI.")
  assertAll(
    retailReports,
    ["sale.cashSales", "sale.bankTransferSales", "sale.ewalletSales", "sale.creditSales"],
    "Payment breakdown must include every requested payment method."
  )
})

scenario(40, "Outlet comparison works for admin/director", () => {
  assertIncludes(retailReports, "function outletComparison", "Reports must calculate outlet comparison.")
  assertIncludes(retailReports, "top outlet", "Outlet comparison KPI must identify top outlet.")
  assertIncludes(retailReports, "scope === \"global\"", "Outlet comparison must be used in global report mode.")
})

assert(
  packageJson.includes("retail-v1-e2e-coverage.mjs"),
  "npm run smoke must include retail-v1-e2e-coverage.mjs"
)
assert(scenarios.length === 40, `Expected 40 scenarios, found ${scenarios.length}.`)

console.log(`Retail Module V1 E2E coverage passed (${scenarios.length} scenarios).`)
