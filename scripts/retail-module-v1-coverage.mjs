import fs from "node:fs"

function read(path) {
  return fs.readFileSync(path, "utf8")
}

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message)
  }
}

function assertNotIncludes(source, needle, message) {
  if (source.includes(needle)) {
    throw new Error(message)
  }
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const retailPage = read("components/retail/retail-page.tsx")
const retailActions = read("lib/retail/actions.ts")
const retailData = read("lib/retail/data.ts")
const retailReports = read("lib/retail/reports.ts")
const retailTypes = read("lib/retail/types.ts")
const retailMigration = read("supabase/migrations/202606230016_retail_daily_control_v1.sql")
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
const retailProcessingBomMigration = read(
  "supabase/migrations/202606230022_retail_processing_bom_master_v1.sql"
)
const retailCashClosingMigration = read(
  "supabase/migrations/202606230023_retail_daily_cash_closing_v1.sql"
)
const retailAuditTrailMigration = read(
  "supabase/migrations/202606230024_retail_audit_trail_v1.sql"
)
const retailDatabaseTablesMigration = read(
  "supabase/migrations/202606230025_retail_database_tables_v1.sql"
)
const retailForms = read("components/retail/retail-forms.tsx")
const retailDailyClosingFormStart = retailForms.indexOf(
  "export function RetailDailyClosingForm"
)
const retailDailyClosingFormEnd = retailForms.indexOf(
  "const processingLineIndexes",
  retailDailyClosingFormStart
)
const retailDailyClosingForm = retailForms.slice(
  retailDailyClosingFormStart,
  retailDailyClosingFormEnd
)
const retailExpenseFormStart = retailForms.indexOf("export function RetailExpenseForm")
const retailExpenseFormEnd = retailForms.indexOf(
  "export function RetailExpenseEditForm",
  retailExpenseFormStart
)
const retailExpenseForm = retailForms.slice(
  retailExpenseFormStart,
  retailExpenseFormEnd
)
const retailReportsPage = read("app/(erp)/retail/reports/page.tsx")
const retailTodayPage = read("app/(erp)/retail/today/page.tsx")
const retailSalesHistoryPage = read("app/(erp)/retail/sales/history/page.tsx")
const retailOutletReportPage = read("app/(erp)/retail/reports/outlet/page.tsx")
const retailAllOutletReportPage = read("app/(erp)/retail/reports/all/page.tsx")
const retailCashVarianceReportPage = read(
  "app/(erp)/retail/reports/cash-variance/page.tsx"
)
const retailMissingTasksReportPage = read(
  "app/(erp)/retail/reports/missing-tasks/page.tsx"
)
const retailProcessingReportPage = read(
  "app/(erp)/retail/reports/processing/page.tsx"
)
const retailExpensesReportPage = read("app/(erp)/retail/reports/expenses/page.tsx")
const retailExportCenterPage = read("app/(erp)/retail/reports/export/page.tsx")
const retailExpenseReviewPage = read("app/(erp)/retail/expenses/review/page.tsx")
const retailExpenseHistoryPage = read("app/(erp)/retail/expenses/history/page.tsx")
const retailCleaningTasksPage = read("app/(erp)/retail/cleaning/tasks/page.tsx")
const retailCleaningHistoryPage = read("app/(erp)/retail/cleaning/history/page.tsx")
const retailProcessingReviewPage = read("app/(erp)/retail/processing/review/page.tsx")
const retailProcessingHistoryPage = read("app/(erp)/retail/processing/history/page.tsx")
const retailCashPage = read("app/(erp)/retail/cash/page.tsx")
const retailCashOpenPage = read("app/(erp)/retail/cash/open/page.tsx")
const retailCashClosePage = read("app/(erp)/retail/cash/close/page.tsx")
const retailCashHistoryPage = read("app/(erp)/retail/cash/history/page.tsx")
const retailCashClosingHistoryPage = read(
  "app/(erp)/retail/cash/history/closings/page.tsx"
)
const retailCashSessionHistoryPage = read(
  "app/(erp)/retail/cash/history/sessions/page.tsx"
)
const retailSettingsBomsPage = read("app/(erp)/retail/settings/boms/page.tsx")
const retailSettingsBomsRecordsPage = read(
  "app/(erp)/retail/settings/boms/records/page.tsx"
)
const retailSettingsCategoriesPage = read(
  "app/(erp)/retail/settings/categories/page.tsx"
)
const retailSettingsCategoriesRecordsPage = read(
  "app/(erp)/retail/settings/categories/records/page.tsx"
)
const retailSettingsPricesPage = read("app/(erp)/retail/settings/prices/page.tsx")
const retailSettingsPricesRecordsPage = read(
  "app/(erp)/retail/settings/prices/records/page.tsx"
)
const retailSettingsAuditPage = read("app/(erp)/retail/settings/audit/page.tsx")
const posPage = read("app/(erp)/retail/pos/page.tsx")
const paymentsPage = read("app/(erp)/retail/payments/page.tsx")
const pricesPage = read("app/(erp)/retail/prices/page.tsx")

for (const label of [
  "Daily Sales",
  "Expenses",
  "Cleaning",
  "Processing",
  "Cash Closing",
  "Reports",
  "Settings",
]) {
  assertIncludes(retailPage, label, `Retail home missing ${label}.`)
}

assertIncludes(
  retailPage,
  'route === "settings" && !canManageSettings',
  "Retail Settings must be manager/admin/director gated."
)
const managerGateSource = retailPage.slice(
  retailPage.indexOf('"expense-review"'),
  retailPage.indexOf("].includes(route) &&")
)
for (const route of [
  '"cleaning-history"',
  '"processing-history"',
  '"cash-closing-history"',
]) {
  assertIncludes(
    managerGateSource,
    route,
    `Retail ${route} route must be manager/admin/director gated.`
  )
}
assertIncludes(
  retailPage,
  "isRetailWorkerView",
  "Retail page must detect worker-only access."
)
assertIncludes(
  retailPage,
  "canCreateDailySales",
  "Retail daily sales visibility must stay role-gated."
)
assertIncludes(
  retailPage,
  "canSubmitCashClosing",
  "Retail workers must not see cash closing submit controls."
)
assertIncludes(
  retailPage,
  "canViewFullReports",
  "Retail workers must not see full retail reports."
)
assertIncludes(
  retailPage,
  "workerHomeItems",
  "Retail worker home must use simplified operational shortcuts."
)
assertCondition(
  retailPage.indexOf('label: "Record Processing"') <
    retailPage.indexOf('label: "Submit Expense"'),
  "Retail worker home must put the frequent processing phone task first."
)
assertIncludes(
  retailPage,
  "function RetailWorkerHome",
  "Retail worker home must render a dedicated daily action entry point."
)
assertIncludes(
  retailPage,
  "function retailNavLabel",
  "Retail worker sub-navigation must use task labels instead of module nouns."
)
assertIncludes(
  retailPage,
  "function retailNavHref",
  "Retail sub-navigation must send manager/admin users to focused task pages."
)
assertIncludes(
  retailPage,
  'return "Submit Expense"',
  "Retail worker expense navigation must say Submit Expense."
)
assertIncludes(
  retailPage,
  'return "Complete Cleaning"',
  "Retail worker cleaning navigation must say Complete Cleaning."
)
assertIncludes(
  retailPage,
  'return "Record Processing"',
  "Retail worker processing navigation must say Record Processing."
)
assertIncludes(
  retailPage,
  'return "Review Expenses"',
  "Retail manager expense navigation must still open the expense review task."
)
assertIncludes(
  retailPage,
  'return "Cleaning Setup"',
  "Retail manager cleaning navigation must say Cleaning Setup."
)
assertIncludes(
  retailPage,
  'return "Processing Records"',
  "Retail manager processing navigation must say Processing Records."
)
assertIncludes(
  retailPage,
  'return "/retail/expenses/review"',
  "Retail manager expense navigation must open the review page."
)
assertIncludes(
  retailPage,
  'return "/retail/cleaning/tasks"',
  "Retail manager cleaning navigation must open setup, not worker completion."
)
assertIncludes(
  retailPage,
  'return "/retail/processing/history"',
  "Retail manager processing navigation must open records, not worker entry."
)
assertIncludes(
  retailPage,
  "Record Processing",
  "Retail worker home must include simplified processing language."
)
assertIncludes(
  retailPage,
  "/orders/picking",
  "Retail worker home must link Picking Order to the existing Order picking page."
)
assertIncludes(
  retailPage,
  "managerHomeItems",
  "Retail manager home must use manager task shortcuts."
)
assertIncludes(
  retailPage,
  "adminHomeItems",
  "Retail admin/director home must use report exception shortcuts."
)
assertIncludes(
  retailPage,
  "globalNavItems",
  "Retail admin/director navigation must use report/export shortcuts."
)
assertIncludes(
  retailPage,
  "canManageGlobalSettings ? globalNavItems : navItems",
  "Retail navigation must switch to global report shortcuts for admin/director users."
)
assertIncludes(
  retailPage,
  "canManageGlobalSettings={canManageGlobalSettings}",
  "Retail navigation must receive the admin/director role flag."
)
for (const href of [
  'href: "/retail/reports/all"',
  'href: "/retail/reports/cash-variance"',
  'href: "/retail/reports/missing-tasks"',
  'href: "/retail/reports/processing"',
  'href: "/retail/reports/expenses"',
  'href: "/retail/reports/export"',
]) {
  assertIncludes(retailPage, href, `Retail admin/director navigation missing ${href}.`)
}
for (const label of [
  "Submit Expense",
  "Complete Cleaning",
  "Record Processing",
  "Picking Order",
  "Today Status",
]) {
  assertIncludes(retailPage, label, `Retail worker launcher missing ${label}.`)
}
for (const label of [
  "Daily Sales",
  "Cash Closing",
  "Expense Review",
  "Cleaning Setup",
  "Outlet Report",
  "Picking Order",
]) {
  assertIncludes(retailPage, label, `Retail manager launcher missing ${label}.`)
}
for (const label of [
  "All Outlet Report",
  "Cash Variance",
  "Missing Tasks",
  "Processing Yield",
  "Expenses",
  "Export Center",
]) {
  assertIncludes(retailPage, label, `Retail admin launcher missing ${label}.`)
}
const workerLauncherSource = retailPage.slice(
  retailPage.indexOf("const workerHomeItems"),
  retailPage.indexOf("const managerHomeItems")
)
assertNotIncludes(
  workerLauncherSource,
  "/retail/reports",
  "Retail worker launcher must not include report actions."
)
assertNotIncludes(
  workerLauncherSource,
  "/retail/settings",
  "Retail worker launcher must not include settings actions."
)
const managerLauncherSource = retailPage.slice(
  retailPage.indexOf("const managerHomeItems"),
  retailPage.indexOf("const adminHomeItems")
)
assertNotIncludes(
  managerLauncherSource,
  "/retail/processing/history",
  "Retail manager home must not show Processing Records as a primary button."
)
const todaySummaryRouteSource = retailPage.slice(
  retailPage.indexOf('{route === "today-summary"'),
  retailPage.indexOf('{route === "reports"')
)
assertNotIncludes(
  todaySummaryRouteSource,
  "Next actions",
  "Retail Today Summary must not act as a second task launcher."
)
assertNotIncludes(
  todaySummaryRouteSource,
  "/retail/expenses",
  "Retail Today Summary must not show Submit Expense actions."
)
assertNotIncludes(
  todaySummaryRouteSource,
  "/retail/processing",
  "Retail Today Summary must not show Record Processing actions."
)
assertIncludes(
  retailPage,
  "hasMissingCleaning",
  "Retail Today Summary must detect missing cleaning clearly."
)
assertIncludes(
  retailPage,
  "border-red-200 bg-red-50",
  "Retail Today Summary missing cleaning status must show a red card."
)
assertIncludes(
  retailPage,
  "Missing tasks today",
  "Retail Today Summary must label missing cleaning work clearly."
)
for (const fragment of [
  "<Receipt",
  "<Banknote",
  "<WalletCards",
  "<ClipboardCheck",
  "<CookingPot",
]) {
  assertIncludes(
    retailPage,
    fragment,
    `Retail Today Summary must keep visual status icon ${fragment}.`
  )
}
assertIncludes(
  retailPage,
  "Retail Manager Task",
  "Retail manager-only focused subpages must remain permission gated."
)
for (const route of [
  "today-summary",
  "outlet-report",
  "all-outlet-report",
  "cash-variance-report",
  "missing-tasks-report",
  "processing-report",
  "expense-report",
  "export-center",
  "expense-review",
  "expense-history",
  "cleaning-tasks",
  "cleaning-history",
  "processing-history",
  "cash-closing-history",
  "settings-boms",
  "settings-boms-list",
  "settings-categories",
  "settings-categories-list",
  "settings-audit",
]) {
  assertIncludes(retailPage, route, `Retail one-task route missing ${route}.`)
}
for (const [source, route] of [
  [retailTodayPage, 'route="today-summary"'],
  [retailOutletReportPage, 'route="outlet-report"'],
  [retailAllOutletReportPage, 'route="all-outlet-report"'],
  [retailCashVarianceReportPage, 'route="cash-variance-report"'],
  [retailMissingTasksReportPage, 'route="missing-tasks-report"'],
  [retailProcessingReportPage, 'route="processing-report"'],
  [retailExpensesReportPage, 'route="expense-report"'],
  [retailExportCenterPage, 'route="export-center"'],
  [retailExpenseReviewPage, 'route="expense-review"'],
  [retailExpenseHistoryPage, 'route="expense-history"'],
  [retailCleaningTasksPage, 'route="cleaning-tasks"'],
  [retailCleaningHistoryPage, 'route="cleaning-history"'],
  [retailProcessingHistoryPage, 'route="processing-history"'],
  [retailCashClosingHistoryPage, 'route="cash-closing-history"'],
  [retailSettingsBomsPage, 'route="settings-boms"'],
  [retailSettingsBomsRecordsPage, 'route="settings-boms-list"'],
  [retailSettingsCategoriesPage, 'route="settings-categories"'],
  [retailSettingsCategoriesRecordsPage, 'route="settings-categories-list"'],
  [retailSettingsAuditPage, 'route="settings-audit"'],
]) {
  assertIncludes(source, route, `Retail focused page wrapper missing ${route}.`)
}
assertIncludes(
  retailProcessingReviewPage,
  'redirect("/retail/processing/history")',
  "Retail Processing review route must redirect to report-only Processing Records."
)
assertNotIncludes(
  retailPage,
  'route === "processing-review"',
  "Retail Processing review branch must not exist because processing is report-only."
)
for (const source of [retailCashPage, retailCashOpenPage, retailCashClosePage]) {
  assertIncludes(
    source,
    'redirect("/retail/cash-closing")',
    "Retail V1 cash-session entry routes must redirect to Cash Closing."
  )
}
for (const source of [retailCashHistoryPage, retailCashSessionHistoryPage]) {
  assertIncludes(
    source,
    'redirect("/retail/cash/history/closings")',
    "Retail V1 cash-session history routes must redirect to cash closing records."
  )
}
assertIncludes(
  retailSettingsPricesPage,
  'redirect("/retail/settings")',
  "Retail V1 price setup route must redirect back to Settings."
)
assertIncludes(
  retailSettingsPricesRecordsPage,
  'redirect("/retail/settings")',
  "Retail V1 price records route must redirect back to Settings."
)
assertNotIncludes(
  retailPage,
  'href: "/retail/settings/prices"',
  "Retail V1 Settings must not show retail price setup."
)
assertNotIncludes(
  retailPage,
  'href: "/retail/settings/prices/records"',
  "Retail V1 Settings must not show retail price records."
)
assertNotIncludes(
  retailPage,
  "categories, prices, and task masters",
  "Retail V1 Settings copy must not mention hidden price setup."
)
for (const fragment of [
  "icon: Receipt",
  "icon: CookingPot",
  "icon: ClipboardCheck",
  "icon: Search",
]) {
  assertIncludes(
    retailPage,
    fragment,
    `Retail Settings launcher missing visual icon action ${fragment}.`
  )
}
assertIncludes(
  retailPage,
  "TodaySummaryView",
  "Retail worker Today Summary focused page must exist."
)
assertIncludes(
  retailPage,
  "Status: {salesStatus}",
  "Retail worker Today Summary must show today's sales status with the amount."
)
assertIncludes(
  retailPage,
  "const todayData = filterWorkerTodayData(data)",
  "Retail Today Summary must filter its own data to today."
)
assertIncludes(
  retailPage,
  "todayData.processingBatches.length",
  "Retail Today Summary processing count must use today-scoped records."
)
assertNotIncludes(
  retailPage,
  "Sales summary entered",
  "Retail worker Today Summary must not hide the actual Daily Sales status."
)
assertIncludes(
  retailPage,
  "OutletReportView",
  "Retail manager Outlet Report focused page must exist."
)
assertIncludes(
  retailPage,
  "ExportCenterView",
  "Retail admin/director Export Center focused page must exist."
)
assertIncludes(
  retailPage,
  "All Outlet Retail Reports",
  "Retail all-outlet focused reports must be admin/director gated."
)
assertIncludes(
  retailPage,
  "RetailReportsLauncher",
  "Retail reports page must render a role-based report launcher."
)
const reportsRouteStart = retailPage.indexOf('{route === "reports"')
const reportsRouteSource = retailPage.slice(
  reportsRouteStart,
  retailPage.indexOf('{route === "outlet-report"', reportsRouteStart)
)
assertIncludes(
  reportsRouteSource,
  "RetailReportsLauncher",
  "Retail Reports route must send users to one focused report page."
)
assertNotIncludes(
  reportsRouteSource,
  "RetailReportsView",
  "Retail Reports route must not render the old all-in-one report dashboard."
)
assertNotIncludes(
  reportsRouteSource,
  "Export CSV",
  "Retail Reports launcher must not show export controls directly."
)
assertIncludes(
  retailPage,
  "RetailReportsFilter",
  "Focused retail report pages must include filters."
)
assertIncludes(
  retailPage,
  "Retail audit trail",
  "Retail settings must show audit trail."
)
assertIncludes(
  retailPage,
  "auditColumns",
  "Retail audit trail table columns must exist."
)
const settingsAuditRouteSource = retailPage.slice(
  retailPage.indexOf('route === "settings-audit"'),
  retailPage.indexOf("</div>", retailPage.indexOf('route === "settings-audit"'))
)
assertNotIncludes(
  settingsAuditRouteSource,
  "Manager controls",
  "Retail audit settings page must only show the audit trail task."
)
for (const field of [
  "openingCash",
  "cashSales",
  "bankTransferSales",
  "ewalletSales",
  "creditSales",
  "cashExpenses",
  "expectedCash",
  "actualCashCounted",
  "varianceWarning",
]) {
  assertIncludes(retailPage, field, `Retail cash closing table missing ${field}.`)
}
assertIncludes(
  retailPage,
  "RetailDailySaleForm",
  "Retail daily sales form must be part of V1."
)
for (const field of [
  "cashSales",
  "bankTransferSales",
  "ewalletSales",
  "creditSales",
  "totalSales",
  "attachmentStatus",
]) {
  assertIncludes(retailPage, field, `Retail daily sales table missing ${field}.`)
}
for (const field of [
  "cashSales",
  "bankTransferSales",
  "ewalletSales",
  "creditSales",
  "autocountAttachmentFile",
  "remarks",
]) {
  assertIncludes(retailForms, field, `Retail daily sales form missing ${field}.`)
}
assertIncludes(
  retailForms,
  "Remarks (optional)",
  "Retail daily sales form must tuck optional remarks away from the main entry path."
)
assertIncludes(
  retailForms,
  'name="salesDate" value={today}',
  "Retail daily sales form must save today's date without an editable history date picker."
)
assertNotIncludes(
  retailForms,
  'id="salesDate"',
  "Retail daily sales page must not show an editable date picker."
)
assertIncludes(
  retailPage,
  "RetailProcessingBatchForm",
  "Retail processing form must be part of V1."
)
assertIncludes(
  retailPage,
  "RetailProcessingBomForm",
  "Retail settings must include processing BOM master form."
)
assertIncludes(
  retailPage,
  "canManageGlobalSettings",
  "Retail processing BOM master must be admin/director gated."
)
assertIncludes(
  retailPage,
  "processingBomRows",
  "Retail settings must show processing BOM master rows."
)
for (const [route, nextRoute, tableNeedle] of [
  ['route === "settings-boms"', 'route === "settings-boms-list"', "processingBomRows"],
  [
    'route === "settings-categories"',
    'route === "settings-categories-list"',
    "expenseCategoryRows",
  ],
]) {
  const formRouteSource = retailPage.slice(
    retailPage.indexOf(route),
    retailPage.indexOf(nextRoute)
  )
  assertNotIncludes(
    formRouteSource,
    tableNeedle,
    `Retail setup form page ${route} must not include its records table.`
  )
}
for (const fragment of [
  "/retail/settings/categories/records",
  "/retail/settings/boms/records",
  "Add another category",
  "Add another BOM",
]) {
  assertIncludes(
    retailForms + retailPage,
    fragment,
    `Retail settings split workflow missing ${fragment}.`
  )
}
for (const field of [
  "processingType",
  "wastageWeightKg",
  "wastagePercent",
  "unaccountedDifferenceKg",
  "unaccountedDifferencePercent",
]) {
  assertIncludes(retailPage, field, `Retail processing table missing ${field}.`)
}
assertNotIncludes(
  retailPage,
  "Processing warnings",
  "Retail processing reports must not show warning sections."
)
assertIncludes(
  retailPage,
  "requiredCleaningTasks",
  "Retail cleaning page must show required cleaning tasks."
)
assertIncludes(
  retailPage,
  "cleaningDisplayStatus",
  "Retail cleaning reports must use checklist completion status."
)
assertIncludes(
  retailPage,
  "isCleaningDueToday",
  "Retail cleaning checklist must support recurring frequencies."
)
assertIncludes(
  retailForms,
  "Cleaning task master",
  "Retail cleaning task master form must exist."
)
assertIncludes(
  retailForms,
  "Complete Cleaning",
  "Retail cleaning worker completion card must exist."
)
assertIncludes(
  retailForms,
  "FileUploadField",
  "Retail upload UI must use the shared file upload field."
)
assertIncludes(
  retailForms,
  "Uploading...",
  "Retail upload UI must show a loading state when files are submitted."
)
assertIncludes(
  retailForms,
  "fileName",
  "Retail upload UI must show the selected filename."
)
assertIncludes(
  retailForms,
  'setCustomValidity("Receipt is required.")',
  "Retail expense upload field must show the simple missing-receipt error inline."
)
assertIncludes(
  retailForms,
  'defaultValue="CASH"',
  "Retail expense payment method must default to Cash."
)
assertIncludes(
  retailForms,
  "flex min-h-11 w-full rounded-md border border-input",
  "Retail select controls must keep phone-friendly tap height."
)
assertIncludes(
  retailForms,
  "fixed inset-x-4 bottom-4 z-40",
  "Retail worker forms must keep phone fixed bottom primary action buttons."
)
assertIncludes(
  retailForms,
  "pb-20 sm:pb-0",
  "Retail worker forms must leave room for fixed bottom action buttons on phone."
)
assertCondition(
  (retailForms.match(/type="number"/g)?.length ?? 0) ===
    (retailForms.match(/inputMode="decimal"/g)?.length ?? 0),
  "Retail numeric fields must request a phone decimal keyboard."
)
assertIncludes(
  retailForms,
  "Submit Expense",
  "Retail expense form title must match the focused Submit Expense task."
)
assertCondition(
  retailExpenseForm.indexOf('<Label htmlFor="amount">Amount</Label>') <
    retailExpenseForm.indexOf('<Label htmlFor="category">Category</Label>') &&
    retailExpenseForm.indexOf('<Label htmlFor="category">Category</Label>') <
      retailExpenseForm.indexOf('<Label htmlFor="paymentMethod">Payment method</Label>') &&
    retailExpenseForm.indexOf('<Label htmlFor="paymentMethod">Payment method</Label>') <
      retailExpenseForm.indexOf('label="Receipt"'),
  "Retail Submit Expense fields must follow Amount, Category, Payment method, Receipt."
)
assertIncludes(
  retailForms,
  "Back to Retail Home",
  "Retail expense success state must offer Back to Retail Home."
)
assertIncludes(
  retailForms,
  'state.status === "success" && successActions.length > 0 ? null :',
  "Retail forms with success actions must hide the submit button after success."
)
assertIncludes(
  retailForms,
  "Edit submitted expense",
  "Retail expense success state must expose the submitted-expense edit path."
)
assertIncludes(
  retailForms,
  'successActions={[\n        { href: "/retail", label: "Back to Retail Home" },\n        { href: "/retail/expenses/history", label: "Edit submitted expense" },',
  "Retail expense submit success must prioritize returning to Retail Home before edit."
)
assertIncludes(
  retailForms,
  'href: "/retail/expenses/history"',
  "Retail expense submit success must link to expense status/edit."
)
assertIncludes(
  retailExpenseForm,
  '<ScopeDisplay label={profile.outletName ?? "Assigned outlet"} />',
  "Retail expense worker form must show assigned outlet context without asking for selection."
)
assertNotIncludes(
  retailForms,
  "Supplier / remarks (optional)",
  "Retail expense form must not show optional supplier/remarks on the worker path."
)
assertIncludes(
  retailActions,
  "Receipt is required.",
  "Retail expense receipt-required error must be simple."
)
assertIncludes(
  retailForms,
  "export function RetailExpenseEditForm",
  "Retail workers must have an edit form for submitted expenses."
)
assertIncludes(
  retailForms,
  "Edit your own submitted expense before manager review.",
  "Retail expense edit form must explain the before-review rule."
)
assertIncludes(
  retailActions,
  "export async function updateRetailExpenseAction",
  "Retail expense edit action must exist."
)
assertIncludes(
  retailActions,
  "Only submitted expenses can be edited before manager review.",
  "Retail expense edit action must block edits after review."
)
assertIncludes(
  retailActions,
  "Only the submitting worker can edit this expense before review.",
  "Retail expense edit action must enforce submitting-worker ownership."
)
const submitExpenseRouteSource = retailPage.slice(
  retailPage.indexOf('route === "expenses"'),
  retailPage.indexOf('route === "expense-review"')
)
assertNotIncludes(
  submitExpenseRouteSource,
  "Review expenses",
  "Retail Submit Expense page must not show manager review controls."
)
assertNotIncludes(
  submitExpenseRouteSource,
  "View expense records",
  "Retail Submit Expense page must not show report/history tables or links."
)
const dailySalesRouteSource = retailPage.slice(
  retailPage.indexOf('route === "sales"'),
  retailPage.indexOf('route === "expenses"')
)
assertNotIncludes(
  dailySalesRouteSource,
  "View sales records",
  "Retail Daily Sales page must not show history links."
)
assertIncludes(
  retailSalesHistoryPage,
  'redirect("/retail/reports")',
  "Retail Daily Sales history route must redirect to reports."
)
assertNotIncludes(
  retailPage,
  'route === "sales-history"',
  "Retail V1 must not keep a separate Daily Sales history page branch."
)
const expenseReviewRouteSource = retailPage.slice(
  retailPage.indexOf('route === "expense-review"'),
  retailPage.indexOf('route === "expense-history"')
)
assertNotIncludes(
  expenseReviewRouteSource,
  "View expense records",
  "Retail Expense Review page must not show history links."
)
const expenseHistoryRouteSource = retailPage.slice(
  retailPage.indexOf('{route === "expense-history"'),
  retailPage.indexOf('{route === "cleaning"', retailPage.indexOf('{route === "expense-history"'))
)
assertIncludes(
  expenseHistoryRouteSource,
  "RetailExpenseEditForm",
  "Retail expense history/status page must include submitted-expense edit."
)
const completeCleaningRouteSource = retailPage.slice(
  retailPage.indexOf('route === "cleaning"'),
  retailPage.indexOf('route === "cleaning-tasks"')
)
assertNotIncludes(
  completeCleaningRouteSource,
  "Manage task master",
  "Retail Complete Cleaning page must not show manager setup controls."
)
assertNotIncludes(
  completeCleaningRouteSource,
  "View cleaning records",
  "Retail Complete Cleaning page must not show history/report links."
)
const recordProcessingRouteSource = retailPage.slice(
  retailPage.indexOf('route === "processing"'),
  retailPage.indexOf('route === "processing-history"')
)
assertNotIncludes(
  recordProcessingRouteSource,
  "Review processing",
  "Retail Record Processing page must not show manager review controls."
)
assertNotIncludes(
  recordProcessingRouteSource,
  "View processing records",
  "Retail Record Processing page must not show history/report links."
)
assertNotIncludes(
  recordProcessingRouteSource,
  'href="/orders/picking"',
  "Retail Record Processing page must not send workers to Orders picking."
)
const cashClosingRouteSource = retailPage.slice(
  retailPage.indexOf('route === "cash-closing"'),
  retailPage.indexOf('route === "cash-closing-history"')
)
assertNotIncludes(
  cashClosingRouteSource,
  "Open cash session",
  "Retail Cash Closing page must not show open-cash actions."
)
assertNotIncludes(
  cashClosingRouteSource,
  "Close register",
  "Retail Cash Closing page must not show register-close actions."
)
assertNotIncludes(
  cashClosingRouteSource,
  "View cash records",
  "Retail Cash Closing page must not show cash history links."
)
assertNotIncludes(
  retailPage,
  "Cash sessions opened",
  "Retail Today Summary must not show cash-session counts in V1."
)
assertIncludes(
  retailForms,
  "Cleaning worker fast path",
  "Retail cleaning completion must show a worker fast-path guide."
)
assertIncludes(
  retailForms,
  "Tap to complete cleaning",
  "Retail cleaning completion must keep the main tap-to-complete action obvious."
)
assertIncludes(
  retailForms,
  "Missing first",
  "Retail cleaning completion must guide workers to clear missing tasks first."
)
assertIncludes(
  retailForms,
  "Missing cleaning is marked red",
  "Retail cleaning completion must explain missing cleaning with red status."
)
assertIncludes(
  retailForms,
  "sortCleaningTasksForWorker",
  "Retail cleaning completion must sort missed/late tasks before normal due tasks."
)
assertIncludes(
  retailForms,
  "Missing",
  "Retail cleaning completion must show a clear missing badge."
)
assertIncludes(
  retailForms,
  "Pending",
  "Retail cleaning completion must show a pending badge."
)
assertIncludes(
  retailForms,
  "Missing cleaning. Check the area, then tap Complete Cleaning.",
  "Retail cleaning completion must make missed cleaning status clear."
)
assertIncludes(
  retailForms,
  "Tasks left today:",
  "Retail cleaning completion must show how many tasks remain today."
)
assertIncludes(
  retailPage,
  "tasks={requiredCleaningTasks(visibleData.cleaningTasks).filter(",
  "Retail worker cleaning page must pass only today-required tasks into the worker form."
)
assertIncludes(
  retailPage,
  "isCleaningDueToday",
  "Retail worker cleaning page must use the due-today schedule helper."
)
assertIncludes(
  retailForms,
  "Missing cleaning is marked red; finish it first, then continue.",
  "Retail cleaning worker guidance must use missing-status wording."
)
assertNotIncludes(
  retailForms,
  "Remarks or photo (optional)",
  "Retail cleaning completion must be tap Complete only."
)
assertNotIncludes(
  retailForms,
  "Add remarks or a photo only when something needs explanation.",
  "Retail cleaning completion must not ask for remarks or photos."
)
assertIncludes(
  retailForms,
  "No photo or remarks needed for V1.",
  "Retail cleaning completion must explain tap-only V1 behavior."
)
assertIncludes(
  retailForms,
  "Complete another task",
  "Retail cleaning success state must offer another completion action."
)
for (const fragment of [
  "function CleaningSuccessNextStep",
  "Cleaning saved",
  "Task saved",
  "Complete next task",
  "Missing status saved",
  "Today count updated",
  "If another task is shown, complete it now. Otherwise return home.",
]) {
  assertIncludes(
    retailForms,
    fragment,
    `Retail cleaning success next-step UX missing ${fragment}.`
  )
}
assertNotIncludes(
  retailForms,
  "Late status stays in history",
  "Retail cleaning worker page must not talk about late/history status."
)
assertIncludes(
  retailForms,
  'className="fixed inset-x-4 bottom-4 z-40 min-h-16 text-base shadow-lg sm:static sm:w-full sm:shadow-none"',
  "Retail cleaning completion button must be large, fixed on phone, and mobile-friendly."
)
assertIncludes(
  retailForms,
  "Tap Complete Cleaning",
  "Retail cleaning completion button must use worker-friendly tap wording."
)
assertNotIncludes(
  retailForms,
  'name="photoFile"',
  "Retail cleaning completion must not ask workers for a photo in V1."
)
assertIncludes(
  retailForms,
  'name="active"',
  "Retail cleaning task master must support active/inactive."
)
assertIncludes(
  retailForms,
  "Record Processing",
  "Retail processing V1 form must exist."
)
assertIncludes(
  retailForms,
  "Record another processing",
  "Retail processing success state must offer another record action."
)
assertIncludes(
  retailForms,
  "ProcessingLineFields",
  "Retail processing form must support multiple raw and finished lines."
)
for (const fragment of [
  "ProcessingStepHeader",
  '["Type", "Raw", "Finished", "Wastage", "Submit"]',
  "Use one record for one processing or packing job",
  "defaultProcessingTypes",
  "Minced Meat",
  "Slice",
  "Cut",
  "Pack",
  "Repack",
  "Other",
  "Tap a preset, or type a processing name.",
  "Processing remarks (optional)",
  "If numbers look right, tap Submit processing",
  "Weight differences are",
  "Wastage details (optional)",
  "afterProcessingSteps",
  "Pack finished goods",
  "Confirm finished weight",
  "Inbound finished stock",
  "Finished stock is not added automatically",
  "min-h-11 text-base",
]) {
  assertIncludes(
    retailForms,
    fragment,
    `Retail processing worker UX missing ${fragment}.`
  )
}
assertNotIncludes(
  retailForms,
  "Print barcode labels",
  "Retail processing worker UX must not prompt V1 barcode label generation."
)
assertNotIncludes(
  retailForms,
  "View prices",
  "Retail V1 must not send users back into disabled retail price setup."
)
assertIncludes(
  retailForms,
  'name={`${prefix}ItemName${index}`}',
  "Retail processing lines must support manual item name fallback."
)
assertIncludes(
  retailActions,
  'status: z.literal("SUBMITTED")',
  "Retail processing action must reject draft status server-side."
)
assertIncludes(
  retailActions,
  "submitted_by: context.profile.id",
  "Retail processing records must always save submitted metadata."
)
assertNotIncludes(
  retailActions,
  'z.enum(["DRAFT", "SUBMITTED"])',
  "Retail processing action must not accept draft records in V1."
)
assertNotIncludes(
  retailForms,
  'name={`${prefix}Remarks${index}`}',
  "Retail processing worker lines must not show per-line remarks fields."
)
assertIncludes(
  retailForms,
  'name="wastageWeightKg"',
  "Retail processing form must capture wastage weight."
)
assertIncludes(
  retailForms,
  'value="SUBMITTED"',
  "Retail processing records must support submitted status."
)
assertIncludes(
  retailForms,
  'name="processingBomId"',
  "Retail processing form must keep the BOM field compatible with existing actions."
)
assertIncludes(
  retailForms,
  "activeBoms",
  "Retail processing presets must hide inactive BOMs from new records."
)
assertIncludes(
  retailForms,
  "Manual processing type",
  "Retail processing form must keep manual processing type fallback."
)
assertIncludes(
  retailForms,
  "Processing BOM master",
  "Retail settings must include BOM master management."
)
assertIncludes(
  retailForms,
  'name="rawMaterialItemNames"',
  "Retail BOM master must capture raw material item names."
)
assertIncludes(
  retailForms,
  'name="finishedProductItemNames"',
  "Retail BOM master must capture finished product item names."
)
assertIncludes(
  retailForms,
  'name="expectedYieldMinPercent"',
  "Retail BOM master must keep optional expected yield fields."
)
assertIncludes(
  retailForms,
  "Future yield settings and remarks (optional)",
  "Retail BOM setup must tuck future yield settings away from the main setup path."
)
assertIncludes(
  retailForms,
  "Daily cash closing",
  "Retail cash closing form must exist."
)
assertIncludes(
  retailForms,
  "function CashClosingFinalChecklist",
  "Retail cash closing must show a final checklist after save."
)
assertIncludes(
  retailForms,
  "Receipts ready for manager/admin review",
  "Retail cash closing final checklist must include receipt readiness."
)
assertIncludes(
  retailForms,
  "Back to Retail Home",
  "Retail daily sales success state must offer a home return action."
)
assertIncludes(
  retailForms,
  "Review another expense",
  "Retail expense review success state must offer another review action."
)
assertIncludes(
  retailProcessingReviewPage,
  'redirect("/retail/processing/history")',
  "Retail processing review URL must redirect to report-only records."
)
assertNotIncludes(
  retailPage,
  "<RetailProcessingReviewForm",
  "Retail V1 routes must not render the shared processing review form."
)
assertNotIncludes(
  retailForms,
  'href: "/retail/processing/review"',
  "Shared processing review success link must not point back to retired Retail review route."
)
assertIncludes(
  retailForms,
  'href: "/processing/dashboard", label: "Review another processing"',
  "Shared processing review success link must stay in the Processing dashboard."
)
assertIncludes(
  retailForms,
  "Rejection reason and remarks (if needed)",
  "Retail review pages must tuck rejection reason and remarks away from the main review path."
)
assertIncludes(
  retailPage,
  "function ManagerTodayChecklist",
  "Retail manager outlet report must show today's checklist first."
)
assertIncludes(
  retailPage,
  "Pending outlet tasks first.",
  "Retail manager checklist must put pending tasks first."
)
for (const fragment of [
  "icon: Banknote",
  "icon: ClipboardCheck",
  "icon: WalletCards",
  "icon: Receipt",
  "const Icon = item.icon",
]) {
  assertIncludes(
    retailPage,
    fragment,
    `Retail manager checklist must keep visual status marker ${fragment}.`
  )
}
assertIncludes(
  retailPage,
  'value: salesConfirmed ? "Confirmed" : todaySale ? "Draft" : "Not Entered"',
  "Retail manager checklist must treat Daily Sales draft as pending."
)
assertIncludes(
  retailPage,
  "sort((a, b) => Number(b.pending) - Number(a.pending))",
  "Retail manager checklist must sort pending items first."
)
const managerChecklistStart = retailPage.indexOf("function ManagerTodayChecklist")
assertCondition(
  retailPage.indexOf('label: "Expenses"', managerChecklistStart) <
    retailPage.indexOf('label: "Cleaning"', managerChecklistStart) &&
    retailPage.indexOf('label: "Cleaning"', managerChecklistStart) <
      retailPage.indexOf('label: "Cash Closing"', managerChecklistStart),
  "Retail manager checklist must order pending tasks as expenses, cleaning, then cash closing."
)
assertIncludes(
  read("app/(erp)/retail/dashboard/page.tsx"),
  'route="outlet-report"',
  "Retail dashboard route must open the manager outlet checklist/report."
)
assertNotIncludes(
  retailForms,
  "Submit another closing",
  "Retail cash closing success state must not offer another same-day closing action."
)
assertCondition(
  retailDailyClosingFormStart >= 0 && retailDailyClosingFormEnd > retailDailyClosingFormStart,
  "Retail cash closing form source slice must be detectable."
)
assertIncludes(
  retailDailyClosingForm,
  'name="status" value="SUBMITTED"',
  "Retail cash closing form must submit as Submitted without a manager status choice."
)
assertNotIncludes(
  retailDailyClosingForm,
  "dailyClosingStatus",
  "Retail cash closing page must not show a visible status dropdown in V1."
)
assertNotIncludes(
  retailPage,
  "RetailCashOpenForm",
  "Retail V1 page shell must not render old cash-session open forms."
)
assertNotIncludes(
  retailPage,
  "RetailCashCloseForm",
  "Retail V1 page shell must not render old cash-session close forms."
)
assertNotIncludes(
  retailPage,
  "cashSessionRows(",
  "Retail V1 page shell must not render old cash-session record tables."
)
assertIncludes(
  retailForms,
  "matchingSale",
  "Retail cash closing form must display pulled daily sales numbers."
)
assertIncludes(
  retailForms,
  "Record and confirm Daily Sales first.",
  "Retail cash closing guidance must require confirmed Daily Sales, not worker draft."
)
assertIncludes(
  retailForms,
  "cashExpenses",
  "Retail cash closing form must display pulled cash expenses."
)
assertIncludes(
  retailForms,
  'name="openingCash"',
  "Retail cash closing form must capture opening cash."
)
assertIncludes(
  retailForms,
  'name="actualCashCounted"',
  "Retail cash closing form must capture actual cash counted."
)
assertIncludes(
  retailForms,
  "Variance is not zero",
  "Retail cash closing form must warn on non-zero variance."
)
assertIncludes(
  retailForms,
  "Warning only; save is allowed.",
  "Retail cash closing variance warning must not imply a blocking rule."
)
assertNotIncludes(
  retailForms,
  "Add remarks before saving.",
  "Retail cash closing variance warning must not require remarks in V1."
)
assertIncludes(
  retailForms,
  "Remarks optional",
  "Retail cash closing remarks must be visibly optional."
)
assertNotIncludes(
  retailPage,
  "RetailSaleForm",
  "Retail V1 page must not render the ERP POS sale form."
)
for (const removedForm of [
  "export function RetailSaleForm",
  "export function RetailPaymentForm",
  "export function RetailCashOpenForm",
  "export function RetailCashCloseForm",
  "export function RetailPriceRuleForm",
  "export function RetailPriceHint",
]) {
  assertNotIncludes(
    retailForms,
    removedForm,
    `Retail V1 forms must not keep dead POS/register/price UI: ${removedForm}.`
  )
}
assertNotIncludes(
  retailPage,
  "/retail/pos",
  "Retail V1 navigation must not link to POS."
)
assertIncludes(posPage, 'redirect("/retail/sales")', "Old POS route must redirect.")
assertIncludes(
  paymentsPage,
  'redirect("/retail/sales")',
  "Old payments route must redirect."
)
assertIncludes(
  pricesPage,
  'redirect("/retail/settings")',
  "Old prices route must redirect to settings."
)
assertIncludes(
  retailActions,
  "Retail V1 uses AutoCount daily summaries",
  "Retail sale action must be disabled for V1."
)
for (const disabledActionMessage of [
  "Retail V1 records payment totals in Daily Sales. Retail payment entry is not active yet.",
  "Retail V1 uses Daily Cash Closing. Register cash sessions are not active yet.",
  "Retail V1 does not use item-level retail price rules. Use AutoCount totals in Daily Sales.",
]) {
  assertIncludes(
    retailActions,
    disabledActionMessage,
    `Retail V1 disabled action message missing: ${disabledActionMessage}.`
  )
}
for (const disabledMutation of [
  'from("retail_sales")',
  'from("retail_payments")',
  'from("retail_cash_sessions")',
  'from("retail_price_rules")',
]) {
  assertNotIncludes(
    retailActions,
    disabledMutation,
    `Retail V1 actions must not mutate old POS/register/price tables: ${disabledMutation}.`
  )
}
assertIncludes(
  retailActions,
  "recordRetailDailySaleAction",
  "Daily sales action must exist for worker drafts and manager-confirmed summaries."
)
assertIncludes(
  retailActions,
  "return runRetailAction(formData, retailOperatorRoles, async (context) => {\n    assertRetailSameDay(context.profile, parsed.salesDate",
  "Daily sales summary action must allow outlet workers to save same-day drafts."
)
assertIncludes(
  retailActions,
  'const status = canConfirm ? parsed.status : "DRAFT"',
  "Daily sales workers must be forced to draft status."
)
assertIncludes(
  retailActions,
  "confirmRetailDailySaleAction",
  "Daily sales manager confirmation action must exist."
)
assertIncludes(
  retailActions,
  "Manager must confirm Daily Sales before Cash Closing.",
  "Cash closing must require confirmed Daily Sales."
)
assertIncludes(
  retailActions,
  'onConflict: "outlet_id,sales_date"',
  "Daily sales summary action must save one record per outlet/date."
)
assertIncludes(
  retailActions,
  "parsed.cashSales +",
  "Daily sales summary action must calculate total sales from payment buckets."
)
assertIncludes(
  retailActions,
  "const roles = retailAdminRoles",
  "Daily closing submission must be manager/admin/director gated."
)
assertIncludes(
  retailActions,
  'fieldName: "receiptFile"',
  "Retail expense submission must require a receipt."
)
assertIncludes(
  retailActions,
  'parsed.status === "REJECTED" && !parsed.rejectionReason',
  "Retail expense rejection must require a reason."
)
assertIncludes(
  retailActions,
  "expectedCash = parsed.openingCash + cashSales - cashExpenses",
  "Daily cash closing must calculate expected cash from opening cash, cash sales, and cash expenses."
)
assertIncludes(
  retailActions,
  "varianceAmount = parsed.actualCashCounted - expectedCash",
  "Daily cash closing must calculate variance from actual cash counted."
)
assertIncludes(
  retailActions,
  '.from("retail_daily_sales")',
  "Daily cash closing action must pull daily sales summary."
)
assertIncludes(
  retailActions,
  '.from("retail_expenses")',
  "Daily cash closing action must pull retail cash expenses."
)
assertIncludes(
  retailActions,
  'status: z.enum(["DRAFT", "SUBMITTED", "REVIEWED"])',
  "Daily cash closing schema must use Draft, Submitted, Reviewed statuses."
)
assertIncludes(
  retailActions,
  "cleaningManagerRoles",
  "Retail cleaning task master must be manager/admin/director controlled."
)
assertIncludes(
  retailActions,
  'onConflict: "outlet_id,task_name,frequency"',
  "Retail cleaning task master must be one task per outlet/name/frequency."
)
assertIncludes(
  retailActions,
  "retail_cleaning_completions",
  "Retail cleaning completion action must keep completion history."
)
assertIncludes(
  retailActions,
  "completion_date: completedAt.slice(0, 10)",
  "Retail cleaning completion history must be recorded per actual completion date."
)
assertIncludes(
  retailActions,
  "completion_photo_url",
  "Retail cleaning completion action must save optional photo."
)
assertIncludes(
  retailActions,
  "parseProcessingLines",
  "Retail processing action must parse multiple raw/finished lines."
)
const processingReviewRolesSource = retailActions.slice(
  retailActions.indexOf("const processingReviewRoles"),
  retailActions.indexOf("const cleaningManagerRoles")
)
assertNotIncludes(
  processingReviewRolesSource,
  "retail_manager",
  "Retail managers must not be able to review Retail processing records."
)
assertIncludes(
  retailActions,
  '}, "processing")',
  "Processing review action must require Processing module access, not Retail access."
)
assertNotIncludes(
  retailActions,
  "Processing record ${batchNo} saved with warning",
  "Retail processing save must not warn on weight differences."
)
assertIncludes(
  retailActions,
  "warning_message: null",
  "Retail processing save must store calculations without warning text."
)
assertIncludes(
  retailActions,
  "retail_processing_raw_lines",
  "Retail processing action must save raw material lines."
)
assertIncludes(
  retailActions,
  "retail_processing_finished_lines",
  "Retail processing action must save finished product lines."
)
assertIncludes(
  retailActions,
  "unaccountedDifferencePercent",
  "Retail processing action must calculate unaccounted difference."
)
assertIncludes(
  retailActions,
  "upsertRetailProcessingBomAction",
  "Retail processing BOM save action must exist."
)
assertIncludes(
  retailActions,
  "retailGlobalAdminRoles",
  "Retail processing BOM save action must be admin/director controlled."
)
assertIncludes(
  retailActions,
  "splitBomItemNames",
  "Retail processing BOM action must parse item-name lists."
)
assertIncludes(
  retailActions,
  "nullablePercent",
  "Retail processing BOM expected yield fields must stay nullable."
)
assertIncludes(
  retailActions,
  "Selected BOM is inactive.",
  "Retail processing action must block inactive BOM use."
)
assertNotIncludes(
  retailActions,
  '.from("stock_movements")',
  "Retail actions must not create stock movements for V1 retail sales or processing."
)
assertNotIncludes(
  retailActions,
  '.from("no_barcode_movements")',
  "Retail actions must not create no-barcode movements for V1 retail processing."
)
assertNotIncludes(
  retailActions,
  'status: "SOLD"',
  "Retail V1 must not mark stock units sold from retail sales."
)
assertIncludes(
  retailData,
  "retail_daily_sales",
  "Retail loader must fetch daily sales summaries."
)
assertIncludes(
  retailData,
  "retail_daily_closings",
  "Retail loader must fetch daily closings."
)
assertIncludes(
  retailData,
  "retail_processing_boms",
  "Retail loader must fetch processing BOM master data."
)
assertIncludes(
  retailData,
  "retail_audit_logs",
  "Retail loader must fetch audit logs."
)
assertIncludes(
  retailReportsPage,
  "searchParams: Promise<RetailReportFilters>",
  "Retail reports route must read URL filters."
)
assertIncludes(
  retailReportsPage,
  'filters={filters}',
  "Retail reports route must pass filters into RetailPage."
)
assertIncludes(
  retailTypes,
  "RetailReportFilters",
  "Retail report filter type must exist."
)
assertIncludes(
  retailTypes,
  "RetailAuditLog",
  "Retail audit log type must exist."
)
assertIncludes(
  retailReports,
  "buildRetailReportData",
  "Retail reports must centralize report calculations in lib/retail."
)
for (const label of [
  "Today total sales",
  "Cash received",
  "Payment method breakdown",
  "Cash expenses",
  "Cash variance",
  "Missing cash closing",
  "Missing AutoCount attachment",
  "Cleaning completion",
  "Missing cleaning tasks",
  "Today raw material used",
  "Today finished product weight",
  "Today wastage weight",
  "Today processing yield %",
  "All outlet total sales",
  "Outlet comparison",
  "Cash variance by outlet",
  "Daily sales trend",
  "Monthly sales trend",
  "Missing closing records",
  "Expenses summary",
  "Processing yield by outlet",
  "Wastage by outlet",
]) {
  assertIncludes(retailReports, label, `Retail reports missing KPI ${label}.`)
}
for (const field of [
  "filteredDailySales",
  "filteredExpenses",
  "missingCleaningTasks",
  "filteredDailyClosings",
  "filteredProcessingBatches",
]) {
  assertIncludes(retailReports, field, `Retail reports missing ${field}.`)
}
assertNotIncludes(
  retailReports,
  "abnormalProcessingBatches",
  "Retail reports must not keep abnormal processing warning collections."
)
for (const field of [
  'name="date"',
  'name="dateFrom"',
  'name="dateTo"',
  'name="outletId"',
  'name="paymentMethod"',
  'name="status"',
  'name="processingItem"',
  'name="processingType"',
]) {
  assertIncludes(retailPage, field, `Retail reports filter missing ${field}.`)
}
assertIncludes(
  retailTypes,
  "RetailProcessingBom",
  "Retail processing BOM type must exist."
)
assertIncludes(
  retailTypes,
  "RetailDailySale",
  "Retail daily sale type must exist."
)
assertIncludes(
  retailMigration,
  "retail users can insert outlet processing batches",
  "Retail processing RLS must allow scoped outlet recording."
)
assertIncludes(
  retailMigration,
  "retail managers can insert outlet cleaning tasks",
  "Retail cleaning setup RLS must allow scoped manager checklist setup."
)
assertIncludes(
  retailAccessMigration,
  "retail managers can insert scoped daily sales",
  "Retail daily sales RLS must be manager/admin/director gated."
)
assertIncludes(
  retailAccessMigration,
  "retail managers can submit same-day daily closings",
  "Retail daily closing RLS must be manager/admin/director gated."
)
assertIncludes(
  retailDailySalesMigration,
  "retail_daily_sales_one_summary_per_outlet_date",
  "Retail daily sales migration must enforce one summary per outlet/date."
)
assertIncludes(
  retailDailySalesMigration,
  "retail_daily_sales_total_matches_components",
  "Retail daily sales migration must enforce calculated totals."
)
assertIncludes(
  retailDailySalesMigration,
  "autocount_attachment_url",
  "Retail daily sales migration must support optional AutoCount attachment."
)
assertIncludes(
  retailExpensesMigration,
  "retail_expenses_receipt_required",
  "Retail expenses migration must enforce receipt requirement."
)
assertIncludes(
  retailExpensesMigration,
  "retail_expenses_rejection_reason_required",
  "Retail expenses migration must require rejection reasons."
)
assertIncludes(
  retailExpensesMigration,
  "retail_expense_categories",
  "Retail expenses migration must add configurable categories."
)
assertIncludes(
  retailExpensesMigration,
  "drop policy if exists \"retail admins can delete expenses\"",
  "Retail expenses migration must remove hard-delete policy."
)
assertIncludes(
  retailCleaningMigration,
  "retail_cleaning_tasks_master_unique",
  "Retail cleaning migration must enforce task master uniqueness."
)
assertIncludes(
  retailCleaningMigration,
  "retail_cleaning_completions",
  "Retail cleaning migration must add completion history."
)
assertIncludes(
  retailCleaningMigration,
  "completion_photo_url",
  "Retail cleaning migration must support optional completion photo."
)
assertIncludes(
  retailCleaningMigration,
  "retail managers can insert outlet cleaning tasks",
  "Retail cleaning migration must keep task master manager/admin/director gated."
)
assertIncludes(
  retailCleaningMigration,
  "retail users can complete outlet cleaning tasks",
  "Retail cleaning migration must allow scoped worker completion."
)
assertIncludes(
  retailCleaningMigration,
  'drop policy if exists "retail operators can update cleaning tasks"',
  "Retail cleaning migration must replace older broad update policy."
)
assertIncludes(
  retailProcessingMigration,
  "retail_processing_raw_lines",
  "Retail processing migration must add raw material line table."
)
assertIncludes(
  retailProcessingMigration,
  "retail_processing_finished_lines",
  "Retail processing migration must add finished product line table."
)
assertIncludes(
  retailProcessingMigration,
  "wastage_weight_kg",
  "Retail processing migration must capture wastage weight."
)
assertIncludes(
  retailProcessingMigration,
  "unaccounted_difference_percent",
  "Retail processing migration must store unaccounted difference percentage."
)
assertIncludes(
  retailProcessingMigration,
  "drop policy if exists \"retail admins can delete processing batches\"",
  "Retail processing migration must remove hard-delete policy."
)
assertIncludes(
  retailProcessingMigration,
  "status::text in ('DRAFT', 'SUBMITTED')",
  "Retail processing insert policy must support draft and submitted records."
)
assertIncludes(
  retailProcessingBomMigration,
  "retail_processing_boms",
  "Retail processing BOM migration must add BOM master table."
)
assertIncludes(
  retailProcessingBomMigration,
  "processing_bom_id",
  "Retail processing BOM migration must link processing records to BOMs."
)
assertIncludes(
  retailProcessingBomMigration,
  "expected_yield_min_percent",
  "Retail processing BOM migration must keep nullable expected yield fields."
)
assertIncludes(
  retailProcessingBomMigration,
  "retail admins can insert processing boms",
  "Retail processing BOM migration must allow admin-managed BOMs."
)
assertIncludes(
  retailProcessingBomMigration,
  "retail users can read processing boms",
  "Retail processing BOM migration must let retail users read active/reference BOMs."
)
assertIncludes(
  retailCashClosingMigration,
  "opening_cash",
  "Retail cash closing migration must add opening cash."
)
assertIncludes(
  retailCashClosingMigration,
  "expected_cash",
  "Retail cash closing migration must add expected cash."
)
assertIncludes(
  retailCashClosingMigration,
  "actual_cash_counted",
  "Retail cash closing migration must add actual cash counted."
)
assertIncludes(
  retailCashClosingMigration,
  "alter type public.retail_closing_status add value if not exists 'REVIEWED'",
  "Retail cash closing migration must add Reviewed status."
)
assertIncludes(
  retailCashClosingMigration,
  "drop policy if exists \"admins can delete daily closings\"",
  "Retail cash closing migration must remove hard-delete policy."
)
assertIncludes(
  retailCashClosingMigration,
  "retail managers can update daily cash closings",
  "Retail cash closing migration must allow scoped manager same-day edits."
)
assertIncludes(
  retailAuditTrailMigration,
  "create table if not exists public.retail_audit_logs",
  "Retail audit trail migration must create retail audit logs."
)
for (const field of [
  "table_name",
  "record_id",
  "field_changed",
  "old_value",
  "new_value",
  "edited_by",
  "edited_at",
  "reason",
]) {
  assertIncludes(
    retailAuditTrailMigration,
    field,
    `Retail audit migration missing ${field}.`
  )
}
for (const trigger of [
  "log_retail_daily_sales_audit",
  "log_retail_expenses_audit",
  "log_retail_cleaning_tasks_audit",
  "log_retail_processing_batches_audit",
  "log_retail_daily_closings_audit",
]) {
  assertIncludes(
    retailAuditTrailMigration,
    trigger,
    `Retail audit migration missing trigger ${trigger}.`
  )
}
assertIncludes(
  retailAuditTrailMigration,
  "public.log_retail_audit_field_changes()",
  "Retail audit migration must use field-change trigger function."
)
assertIncludes(
  retailAuditTrailMigration,
  "retail managers can read scoped audit logs",
  "Retail audit logs must be manager scoped."
)
assertIncludes(
  retailAuditTrailMigration,
  "public.is_admin_or_director()",
  "Retail audit logs must allow admin/director all-scope view."
)
assertNotIncludes(
  retailAuditTrailMigration,
  "for delete to authenticated using",
  "Retail audit logs must not add a hard-delete policy."
)
for (const table of [
  "retail_daily_sales",
  "retail_expenses",
  "retail_expense_categories",
  "retail_cleaning_tasks",
  "retail_cleaning_completions",
  "retail_processing_boms",
  "retail_processing_records",
  "retail_processing_raw_lines",
  "retail_processing_finished_lines",
  "retail_cash_closings",
  "retail_audit_logs",
]) {
  assertIncludes(
    retailDatabaseTablesMigration,
    table,
    `Retail database refinement missing ${table}.`
  )
}
for (const field of [
  "category_id",
  "active boolean",
  "bom_name",
  "raw_item_names",
  "finished_item_names",
  "expected_yield_min",
  "expected_yield_max",
  "expected_wastage",
  "processing_record_id",
  "raw_item_name",
  "finished_item_name",
  "total_raw_weight",
  "total_finished_weight",
  "total_wastage_weight",
  "unaccounted_difference",
  "warning_flag",
  "retail_cash_closings_one_per_outlet_date",
  "field_name",
]) {
  assertIncludes(
    retailDatabaseTablesMigration,
    field,
    `Retail database refinement missing ${field}.`
  )
}
assertIncludes(
  retailDatabaseTablesMigration,
  "retail_daily_sales_one_summary_per_outlet_date",
  "Retail daily sales must keep one summary per outlet/date."
)
assertIncludes(
  retailDatabaseTablesMigration,
  "public.sync_retail_processing_record_from_batch()",
  "Retail processing records must stay synced from existing processing batches."
)
assertIncludes(
  retailDatabaseTablesMigration,
  "public.sync_retail_cash_closing_from_daily_closing()",
  "Retail cash closings must stay synced from existing daily closings."
)
for (const policy of [
  "retail users can read processing records",
  "retail users can insert processing records",
  "retail managers can update processing records",
  "retail users can read cash closings",
  "retail managers can insert cash closings",
  "retail managers can update cash closings",
]) {
  assertIncludes(
    retailDatabaseTablesMigration,
    policy,
    `Retail database refinement missing RLS policy ${policy}.`
  )
}
assertIncludes(
  retailDatabaseTablesMigration,
  "public.can_access_outlet(outlet_id)",
  "Retail database refinement must scope outlet users by outlet."
)
assertIncludes(
  retailDatabaseTablesMigration,
  "public.is_admin_or_director()",
  "Retail database refinement must allow admin/director all-outlet visibility."
)

console.log("Retail Module V1 coverage passed.")
