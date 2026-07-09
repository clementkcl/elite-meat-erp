import Link from "next/link"
import {
  Banknote,
  BarChart3,
  ClipboardCheck,
  CookingPot,
  Download,
  Receipt,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  RetailCleaningTaskForm,
  RetailCleaningUpdateForm,
  RetailDailyClosingForm,
  RetailDailySaleConfirmForm,
  RetailDailySaleForm,
  RetailExpenseCategoryForm,
  RetailExpenseEditForm,
  RetailExpenseForm,
  RetailExpenseStatusForm,
  RetailProcessingBatchForm,
  RetailProcessingBomForm,
} from "@/components/retail/retail-forms"
import {
  DataTable,
  type DataTableColumn,
} from "@/components/stock/data-table"
import { moduleAccessBlock } from "@/lib/auth/module-guard"
import { hasAnyRole, requireCurrentProfile } from "@/lib/auth/session"
import type { CurrentProfile, UserRole } from "@/lib/auth/types"
import { getRetailPageData } from "@/lib/retail/data"
import { buildRetailReportData } from "@/lib/retail/reports"
import {
  retailClosingStatuses,
  retailExpensePaymentMethods,
  retailExpenseStatuses,
  retailProcessingStatuses,
  type RetailAuditLog,
  type RetailCleaningTask,
  type RetailDailyClosing,
  type RetailDailySale,
  type RetailExpense,
  type RetailExpenseCategory,
  type RetailPageData,
  type RetailProcessingBom,
  type RetailProcessingBatch,
  type RetailReportFilters,
} from "@/lib/retail/types"

export type RetailRoute =
  | "home"
  | "today-summary"
  | "reports"
  | "outlet-report"
  | "all-outlet-report"
  | "cash-variance-report"
  | "missing-tasks-report"
  | "processing-report"
  | "expense-report"
  | "export-center"
  | "sales"
  | "expenses"
  | "expense-review"
  | "expense-history"
  | "cleaning"
  | "cleaning-tasks"
  | "cleaning-history"
  | "processing"
  | "processing-history"
  | "cash-closing"
  | "cash-closing-history"
  | "settings"
  | "settings-boms"
  | "settings-boms-list"
  | "settings-categories"
  | "settings-categories-list"
  | "settings-audit"

type TableCellValue =
  | string
  | number
  | boolean
  | { kind: "link"; href: string; label: string }
type TableRow = Record<string, TableCellValue>

const retailRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "account",
  "admin",
  "director",
]

const retailManagerRoles: UserRole[] = ["retail_manager", "admin", "director"]
const retailWorkerRoles: UserRole[] = ["retail_team_general_worker"]
const retailGlobalAdminRoles: UserRole[] = ["admin", "director"]
const retailReportStatuses = Array.from(
  new Set([
    ...retailExpenseStatuses,
    ...retailClosingStatuses,
    ...retailProcessingStatuses,
    "DONE",
    "MISSING",
    "MISSED",
  ])
)
const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"

const titles: Record<RetailRoute, { title: string; description: string }> = {
  home: {
    title: "Retail Daily Control",
    description: "Choose the next task for your role and outlet.",
  },
  "today-summary": {
    title: "Today Summary",
    description: "Check today's own outlet records and missing work.",
  },
  reports: {
    title: "Retail Reports",
    description: "Choose one report view for your role.",
  },
  "outlet-report": {
    title: "Outlet Report",
    description: "Review your assigned outlet's daily Retail control summary.",
  },
  "all-outlet-report": {
    title: "All Outlet Report",
    description: "Review all outlet Retail sales, cash, cleaning, and processing status.",
  },
  "cash-variance-report": {
    title: "Cash Variance",
    description: "Check outlet cash closing variances.",
  },
  "missing-tasks-report": {
    title: "Missing Tasks",
    description: "Check missing cash closing and cleaning work.",
  },
  "processing-report": {
    title: "Processing Yield",
    description: "Check retail processing yield, wastage, and weight differences.",
  },
  "expense-report": {
    title: "Expenses",
    description: "Review all authorized outlet expenses.",
  },
  "export-center": {
    title: "Export Center",
    description: "Export authorized Retail report data.",
  },
  sales: {
    title: "Daily Sales",
    description: "Record AutoCount daily sales totals by payment type.",
  },
  expenses: {
    title: "Submit Expense",
    description: "Upload one outlet expense receipt and submit it for review.",
  },
  "expense-review": {
    title: "Review Expense",
    description: "Review, reject, or cancel one submitted outlet expense.",
  },
  "expense-history": {
    title: "Expense Records",
    description: "View outlet expense submissions and review status.",
  },
  cleaning: {
    title: "Complete Cleaning",
    description: "Complete retail cleaning tasks by frequency.",
  },
  "cleaning-tasks": {
    title: "Cleaning Task Master",
    description: "Manage required retail cleaning work by outlet and frequency.",
  },
  "cleaning-history": {
    title: "Cleaning Records",
    description: "View completed and missing retail cleaning tasks.",
  },
  processing: {
    title: "Record Processing",
    description: "Record raw material, finished product, yield, and loss.",
  },
  "processing-history": {
    title: "Processing Records",
    description: "View raw materials, finished products, wastage, and yield.",
  },
  "cash-closing": {
    title: "Cash Closing",
    description: "Submit one daily cash closing and check variance.",
  },
  "cash-closing-history": {
    title: "Cash Closing Records",
    description: "View daily outlet cash closing submissions.",
  },
  settings: {
    title: "Retail Settings",
    description: "Choose one retail setup or audit task.",
  },
  "settings-boms": {
    title: "Add Processing BOM",
    description: "Save one standard retail processing type or BOM reference.",
  },
  "settings-boms-list": {
    title: "Processing BOM Records",
    description: "View existing retail processing BOM references.",
  },
  "settings-categories": {
    title: "Add Expense Category",
    description: "Save one outlet expense category.",
  },
  "settings-categories-list": {
    title: "Expense Category Records",
    description: "View existing outlet expense categories.",
  },
  "settings-audit": {
    title: "Retail Audit Trail",
    description: "View important retail edits and audit reasons.",
  },
}

const workerHomeItems = [
  {
    href: "/retail/processing",
    label: "Record Processing",
    description: "Most used phone task.",
    icon: CookingPot,
  },
  {
    href: "/retail/expenses",
    label: "Submit Expense",
    description: "Upload one receipt.",
    icon: WalletCards,
  },
  {
    href: "/retail/cleaning",
    label: "Complete Cleaning",
    description: "Finish required tasks.",
    icon: Sparkles,
  },
  {
    href: "/orders/picking",
    label: "Picking Order",
    description: "Open existing order picking.",
    icon: Search,
  },
  {
    href: "/retail/today",
    label: "Today Status",
    description: "Own outlet only.",
    icon: ClipboardCheck,
  },
]

const managerHomeItems = [
  {
    href: "/retail/sales",
    label: "Daily Sales",
    description: "Enter AutoCount totals.",
    icon: Receipt,
  },
  {
    href: "/retail/cash-closing",
    label: "Cash Closing",
    description: "Submit today's closing.",
    icon: Banknote,
  },
  {
    href: "/retail/expenses/review",
    label: "Expense Review",
    description: "Approve or reject one claim.",
    icon: WalletCards,
  },
  {
    href: "/retail/cleaning/tasks",
    label: "Cleaning Setup",
    description: "Manage task master.",
    icon: Sparkles,
  },
  {
    href: "/retail/reports/outlet",
    label: "Outlet Report",
    description: "Assigned outlet view.",
    icon: BarChart3,
  },
  {
    href: "/orders/picking",
    label: "Picking Order",
    description: "Open existing order picking.",
    icon: Search,
  },
]

const adminHomeItems = [
  {
    href: "/retail/reports/all",
    label: "All Outlet Report",
    description: "Company-wide view.",
    icon: BarChart3,
  },
  {
    href: "/retail/reports/cash-variance",
    label: "Cash Variance",
    description: "Find cash differences.",
    icon: Banknote,
  },
  {
    href: "/retail/reports/missing-tasks",
    label: "Missing Tasks",
    description: "Closing and cleaning gaps.",
    icon: ClipboardCheck,
  },
  {
    href: "/retail/reports/processing",
    label: "Processing Yield",
    description: "Yield and wastage.",
    icon: CookingPot,
  },
  {
    href: "/retail/reports/expenses",
    label: "Expenses",
    description: "Outlet expense table.",
    icon: WalletCards,
  },
  {
    href: "/retail/reports/export",
    label: "Export Center",
    description: "CSV report export.",
    icon: Download,
  },
]

type RetailNavItem = { route: RetailRoute; href: string; label: string }

const navItems: RetailNavItem[] = [
  { route: "home", href: "/retail", label: "Home" },
  { route: "today-summary", href: "/retail/today", label: "Today Summary" },
  { route: "sales", href: "/retail/sales", label: "Daily Sales" },
  { route: "expenses", href: "/retail/expenses", label: "Expenses" },
  { route: "cleaning", href: "/retail/cleaning", label: "Cleaning" },
  { route: "processing", href: "/retail/processing", label: "Processing" },
  { route: "cash-closing", href: "/retail/cash-closing", label: "Cash Closing" },
  { route: "reports", href: "/retail/reports", label: "Reports" },
  { route: "settings", href: "/retail/settings", label: "Settings" },
]

const globalNavItems: RetailNavItem[] = [
  { route: "home", href: "/retail", label: "Home" },
  { route: "all-outlet-report", href: "/retail/reports/all", label: "All Outlet Report" },
  {
    route: "cash-variance-report",
    href: "/retail/reports/cash-variance",
    label: "Cash Variance",
  },
  {
    route: "missing-tasks-report",
    href: "/retail/reports/missing-tasks",
    label: "Missing Tasks",
  },
  {
    route: "processing-report",
    href: "/retail/reports/processing",
    label: "Processing Yield",
  },
  {
    route: "expense-report",
    href: "/retail/reports/expenses",
    label: "Expenses",
  },
  { route: "export-center", href: "/retail/reports/export", label: "Export Center" },
]

const routeGroups: Partial<Record<RetailRoute, RetailRoute>> = {
  "outlet-report": "reports",
  "all-outlet-report": "reports",
  "cash-variance-report": "reports",
  "missing-tasks-report": "reports",
  "processing-report": "reports",
  "expense-report": "reports",
  "export-center": "reports",
  "expense-review": "expenses",
  "expense-history": "expenses",
  "cleaning-tasks": "cleaning",
  "cleaning-history": "cleaning",
  "processing-history": "processing",
  "cash-closing-history": "cash-closing",
  "settings-boms": "settings",
  "settings-boms-list": "settings",
  "settings-categories": "settings",
  "settings-categories-list": "settings",
  "settings-audit": "settings",
}

function retailNavLabel(item: { route: RetailRoute; label: string }, workerView: boolean) {
  if (!workerView) {
    if (item.route === "expenses") {
      return "Review Expenses"
    }

    if (item.route === "cleaning") {
      return "Cleaning Setup"
    }

    if (item.route === "processing") {
      return "Processing Records"
    }

    return item.label
  }

  if (item.route === "expenses") {
    return "Submit Expense"
  }

  if (item.route === "cleaning") {
    return "Complete Cleaning"
  }

  if (item.route === "processing") {
    return "Record Processing"
  }

  return item.label
}

function retailNavHref(
  item: { route: RetailRoute; href: string },
  workerView: boolean
) {
  if (workerView) {
    return item.href
  }

  if (item.route === "expenses") {
    return "/retail/expenses/review"
  }

  if (item.route === "cleaning") {
    return "/retail/cleaning/tasks"
  }

  if (item.route === "processing") {
    return "/retail/processing/history"
  }

  return item.href
}

const dailySaleColumns: DataTableColumn<TableRow>[] = [
  { key: "salesDate", header: "Date" },
  { key: "outletName", header: "Outlet" },
  { key: "status", header: "Status" },
  { key: "cashSales", header: "Cash", align: "right" },
  { key: "bankTransferSales", header: "Bank", align: "right" },
  { key: "ewalletSales", header: "E-wallet", align: "right" },
  { key: "creditSales", header: "Credit", align: "right" },
  { key: "totalSales", header: "Total", align: "right" },
  { key: "attachmentStatus", header: "Attachment" },
  { key: "createdByName", header: "Created by" },
  { key: "createdAt", header: "Created" },
  { key: "updatedByName", header: "Updated by" },
  { key: "updatedAt", header: "Updated" },
]

const dailySaleEntryColumns: DataTableColumn<TableRow>[] = [
  { key: "salesDate", header: "Date" },
  { key: "status", header: "Status" },
  { key: "cashSales", header: "Cash", align: "right" },
  { key: "bankTransferSales", header: "Bank", align: "right" },
  { key: "ewalletSales", header: "E-wallet", align: "right" },
  { key: "creditSales", header: "Credit", align: "right" },
  { key: "totalSales", header: "Total", align: "right" },
  { key: "attachmentStatus", header: "Attachment" },
]

const closingColumns: DataTableColumn<TableRow>[] = [
  { key: "closingDate", header: "Date" },
  { key: "outletName", header: "Outlet" },
  { key: "status", header: "Status" },
  { key: "openingCash", header: "Opening", align: "right" },
  { key: "cashSales", header: "Cash sales", align: "right" },
  { key: "bankTransferSales", header: "Bank", align: "right" },
  { key: "ewalletSales", header: "E-wallet", align: "right" },
  { key: "creditSales", header: "Credit", align: "right" },
  { key: "cashExpenses", header: "Cash expenses", align: "right" },
  { key: "expectedCash", header: "Expected", align: "right" },
  { key: "actualCashCounted", header: "Actual counted", align: "right" },
  { key: "varianceAmount", header: "Variance", align: "right" },
  { key: "varianceWarning", header: "Warning" },
  { key: "submittedByName", header: "Submitted by" },
  { key: "reviewedByName", header: "Reviewed by" },
]

const processingColumns: DataTableColumn<TableRow>[] = [
  { key: "processingDate", header: "Date" },
  { key: "batchNo", header: "Batch" },
  { key: "outletName", header: "Outlet" },
  { key: "processingType", header: "Type / BOM" },
  { key: "rawItemLabel", header: "Raw materials" },
  { key: "rawWeightKg", header: "Raw kg", align: "right" },
  { key: "finishedItemLabel", header: "Finished products" },
  { key: "finishedWeightKg", header: "Finished kg", align: "right" },
  { key: "yieldPercent", header: "Yield %", align: "right" },
  { key: "wastageWeightKg", header: "Wastage kg", align: "right" },
  { key: "wastagePercent", header: "Wastage %", align: "right" },
  { key: "wastagePhoto", header: "Wastage photo" },
  { key: "unaccountedDifferenceKg", header: "Unaccounted kg", align: "right" },
  { key: "unaccountedDifferencePercent", header: "Unaccounted %", align: "right" },
  { key: "status", header: "Status" },
  { key: "submittedByName", header: "Submitted by" },
  { key: "reviewedByName", header: "Reviewed by" },
]

const cleaningColumns: DataTableColumn<TableRow>[] = [
  { key: "dueDate", header: "Due" },
  { key: "outletName", header: "Outlet" },
  { key: "taskName", header: "Task" },
  { key: "frequency", header: "Frequency" },
  { key: "active", header: "Active" },
  { key: "status", header: "Status" },
  { key: "completedByName", header: "Completed by" },
  { key: "completedAt", header: "Completed" },
  { key: "photoStatus", header: "Photo" },
  { key: "createdByName", header: "Created by" },
  { key: "updatedAt", header: "Updated" },
]

const expenseColumns: DataTableColumn<TableRow>[] = [
  { key: "expenseDate", header: "Date" },
  { key: "outletName", header: "Outlet" },
  { key: "category", header: "Category" },
  { key: "supplierPayee", header: "Supplier/payee" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "paymentMethod", header: "Method" },
  { key: "status", header: "Status" },
  { key: "receiptStatus", header: "Receipt" },
  { key: "submittedByName", header: "Submitted by" },
  { key: "submittedAt", header: "Submitted" },
  { key: "reviewedByName", header: "Reviewed by" },
  { key: "reviewedAt", header: "Reviewed" },
  { key: "rejectionReason", header: "Rejection reason" },
]

const expenseReviewColumns: DataTableColumn<TableRow>[] = [
  { key: "expenseDate", header: "Date" },
  { key: "category", header: "Category" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "paymentMethod", header: "Method" },
  { key: "receiptStatus", header: "Receipt" },
  { key: "submittedByName", header: "Submitted by" },
  { key: "submittedAt", header: "Submitted" },
]

const cleaningSetupColumns: DataTableColumn<TableRow>[] = [
  { key: "taskName", header: "Task" },
  { key: "frequency", header: "Frequency" },
  { key: "active", header: "Active" },
  { key: "status", header: "Today status" },
  { key: "updatedAt", header: "Updated" },
]

const expenseCategoryColumns: DataTableColumn<TableRow>[] = [
  { key: "name", header: "Category" },
  { key: "outletName", header: "Outlet" },
  { key: "active", header: "Active" },
]

const processingBomColumns: DataTableColumn<TableRow>[] = [
  { key: "name", header: "BOM / type" },
  { key: "outletName", header: "Outlet" },
  { key: "rawMaterials", header: "Raw materials" },
  { key: "finishedProducts", header: "Finished products" },
  { key: "active", header: "Active" },
  { key: "expectedYieldMinPercent", header: "Yield min %", align: "right" },
  { key: "expectedYieldMaxPercent", header: "Yield max %", align: "right" },
  { key: "expectedWastagePercent", header: "Wastage %", align: "right" },
  { key: "updatedByName", header: "Updated by" },
  { key: "updatedAt", header: "Updated" },
]

const auditColumns: DataTableColumn<TableRow>[] = [
  { key: "editedAt", header: "Edited" },
  { key: "outletName", header: "Outlet" },
  { key: "tableName", header: "Table" },
  { key: "recordId", header: "Record ID" },
  { key: "fieldChanged", header: "Field changed" },
  { key: "oldValue", header: "Old value" },
  { key: "newValue", header: "New value" },
  { key: "editedByName", header: "Edited by" },
  { key: "reason", header: "Reason" },
]

function dateText(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value))
}

function statusText(value: string) {
  return value.replaceAll("_", " ")
}

function money(value: number) {
  return Number(value.toFixed(2))
}

function retailFileHref(path: string | null) {
  return path
    ? `/api/retail/files?path=${encodeURIComponent(path)}`
    : null
}

function retailFileLink(path: string | null) {
  const href = retailFileHref(path)

  return href ? { kind: "link" as const, href, label: "View" } : null
}

function dailySaleRows(sales: RetailDailySale[]): TableRow[] {
  return sales.map((sale) => ({
    salesDate: dateText(sale.salesDate),
    outletName: sale.outletName,
    status: sale.status,
    cashSales: money(sale.cashSales),
    bankTransferSales: money(sale.bankTransferSales),
    ewalletSales: money(sale.ewalletSales),
    creditSales: money(sale.creditSales),
    totalSales: money(sale.totalSales),
    attachmentStatus: retailFileLink(sale.attachmentUrl) ?? sale.attachmentStatus,
    createdByName: sale.createdByName,
    createdAt: dateText(sale.createdAt),
    updatedByName: sale.updatedByName,
    updatedAt: dateText(sale.updatedAt),
  }))
}

function closingRows(closings: RetailDailyClosing[]): TableRow[] {
  return closings.map((closing) => ({
    closingDate: dateText(closing.closingDate),
    outletName: closing.outletName,
    status: statusText(closing.status),
    openingCash: money(closing.openingCash),
    cashSales: money(closing.cashSales),
    bankTransferSales: money(closing.bankTransferSales),
    ewalletSales: money(closing.ewalletSales),
    creditSales: money(closing.creditSales),
    cashExpenses: money(closing.cashExpenses),
    expectedCash: money(closing.expectedCash),
    actualCashCounted: money(closing.actualCashCounted),
    varianceAmount: money(closing.varianceAmount),
    varianceWarning: closing.varianceAmount === 0 ? "OK" : "VARIANCE",
    submittedByName: closing.submittedByName,
    reviewedByName: closing.reviewedByName,
  }))
}

function processingRows(batches: RetailProcessingBatch[]): TableRow[] {
  return batches.map((batch) => ({
    processingDate: dateText(batch.processingDate),
    batchNo: batch.batchNo,
    outletName: batch.outletName,
    processingType: batch.processingType,
    rawItemLabel: batch.rawItemLabel,
    rawWeightKg: money(batch.rawWeightKg),
    finishedItemLabel: batch.finishedItemLabel,
    finishedWeightKg: money(batch.finishedWeightKg),
    yieldPercent: money(batch.yieldPercent),
    wastageWeightKg: money(batch.wastageWeightKg),
    wastagePercent: money(batch.wastagePercent),
    wastagePhoto: retailFileLink(batch.wastagePhotoUrl) ?? "-",
    unaccountedDifferenceKg: money(batch.unaccountedDifferenceKg),
    unaccountedDifferencePercent: money(batch.unaccountedDifferencePercent),
    status: statusText(batch.status),
    submittedByName: batch.submittedByName,
    reviewedByName: batch.reviewedByName,
  }))
}

function cleaningRows(tasks: RetailCleaningTask[]): TableRow[] {
  return tasks.map((task) => ({
    dueDate: dateText(task.dueDate),
    outletName: task.outletName,
    taskName: task.taskName,
    frequency: task.frequency,
    active: task.active,
    status: cleaningDisplayStatus(task),
    completedByName: task.completedByName,
    completedAt: dateText(task.completedAt),
    photoStatus: retailFileLink(task.completionPhotoUrl) ?? "-",
    createdByName: task.createdByName,
    updatedAt: dateText(task.updatedAt),
  }))
}

function expenseRows(expenses: RetailExpense[]): TableRow[] {
  return expenses.map((expense) => ({
    expenseDate: dateText(expense.expenseDate),
    outletName: expense.outletName,
    category: expense.category,
    supplierPayee: expense.supplierPayee,
    amount: money(expense.amount),
    paymentMethod: statusText(expense.paymentMethod),
    status: statusText(expense.status),
    receiptStatus: retailFileLink(expense.receiptUrl) ?? "MISSING",
    submittedByName: expense.submittedByName,
    submittedAt: dateText(expense.submittedAt),
    reviewedByName: expense.reviewedByName,
    reviewedAt: dateText(expense.reviewedAt),
    rejectionReason: expense.rejectionReason,
  }))
}

function expenseCategoryRows(categories: RetailExpenseCategory[]): TableRow[] {
  return categories.map((category) => ({
    name: category.name,
    outletName: category.outletName,
    active: category.active,
  }))
}

function percentOrDash(value: number | null) {
  return value === null ? "-" : money(value)
}

function processingBomRows(boms: RetailProcessingBom[]): TableRow[] {
  return boms.map((bom) => ({
    name: bom.name,
    outletName: bom.outletName,
    rawMaterials: bom.rawMaterialItemNames.join(", "),
    finishedProducts: bom.finishedProductItemNames.join(", "),
    active: bom.active,
    expectedYieldMinPercent: percentOrDash(bom.expectedYieldMinPercent),
    expectedYieldMaxPercent: percentOrDash(bom.expectedYieldMaxPercent),
    expectedWastagePercent: percentOrDash(bom.expectedWastagePercent),
    updatedByName: bom.updatedByName,
    updatedAt: dateText(bom.updatedAt),
  }))
}

function auditRows(logs: RetailAuditLog[]): TableRow[] {
  return logs.map((log) => ({
    editedAt: dateText(log.editedAt),
    outletName: log.outletName,
    tableName: log.tableName,
    recordId: log.recordId,
    fieldChanged: statusText(log.fieldChanged),
    oldValue: log.oldValue,
    newValue: log.newValue,
    editedByName: log.editedByName,
    reason: log.reason,
  }))
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function isToday(value: string | null) {
  return Boolean(value?.slice(0, 10) === todayKey())
}

function cleaningDisplayStatus(task: RetailCleaningTask) {
  if (!task.active) {
    return "INACTIVE"
  }

  if (isToday(task.completedAt)) {
    return "DONE"
  }

  if (isCleaningDueToday(task)) {
    return "PENDING"
  }

  if (task.status === "MISSED" || task.dueDate.slice(0, 10) < todayKey()) {
    return "MISSED"
  }

  return task.status
}

function daysBetween(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T00:00:00.000Z`)

  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000)
}

function monthDiff(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate = new Date(`${end}T00:00:00.000Z`)

  return (
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    endDate.getUTCMonth() -
    startDate.getUTCMonth()
  )
}

function isCleaningDueToday(task: RetailCleaningTask) {
  const today = todayKey()
  const anchor = task.dueDate.slice(0, 10)

  if (anchor > today) {
    return false
  }

  if (task.frequency === "DAILY") {
    return true
  }

  if (task.frequency === "WEEKLY") {
    return daysBetween(anchor, today) % 7 === 0
  }

  const anchorDay = new Date(`${anchor}T00:00:00.000Z`).getUTCDate()
  const todayDay = new Date(`${today}T00:00:00.000Z`).getUTCDate()

  if (anchorDay !== todayDay) {
    return false
  }

  if (task.frequency === "MONTHLY") {
    return monthDiff(anchor, today) >= 0
  }

  return monthDiff(anchor, today) % 3 === 0
}

function requiredCleaningTasks(tasks: RetailCleaningTask[]) {
  return tasks.filter(
    (task) =>
      task.active &&
      (isCleaningDueToday(task) ||
        cleaningDisplayStatus(task) === "MISSED" ||
        isToday(task.completedAt))
  )
}

function isRetailWorkerView(profile: CurrentProfile) {
  return (
    hasAnyRole(profile, retailWorkerRoles) && !hasAnyRole(profile, retailManagerRoles)
  )
}

function filterWorkerTodayData(data: RetailPageData): RetailPageData {
  return {
    ...data,
    cashSessions: data.cashSessions.filter((session) => isToday(session.openedAt)),
    dailySales: data.dailySales.filter((sale) => isToday(sale.salesDate)),
    dailyClosings: data.dailyClosings.filter((closing) =>
      isToday(closing.closingDate)
    ),
    processingBatches: data.processingBatches.filter((batch) =>
      isToday(batch.processingDate)
    ),
    cleaningTasks: data.cleaningTasks.filter(
      (task) => task.dueDate.slice(0, 10) <= todayKey() || isToday(task.completedAt)
    ),
    expenses: data.expenses.filter((expense) => isToday(expense.expenseDate)),
  }
}

function PageHeader({
  route,
  demoMode,
}: {
  route: RetailRoute
  demoMode: boolean
}) {
  const title = titles[route]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {title.description}
        </p>
      </div>
      {demoMode ? <Badge variant="warning">Demo data</Badge> : null}
    </div>
  )
}

function RetailNav({
  route,
  canManageSettings,
  canManageGlobalSettings,
  workerView,
}: {
  route: RetailRoute
  canManageSettings: boolean
  canManageGlobalSettings: boolean
  workerView: boolean
}) {
  const activeRoute = routeGroups[route] ?? route
  const items = canManageGlobalSettings ? globalNavItems : navItems

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items
        .filter((item) => item.route !== "settings" || canManageSettings)
        .filter(
          (item) =>
            canManageGlobalSettings ||
            !workerView ||
            ["home", "today-summary", "expenses", "cleaning", "processing"].includes(
              item.route
            )
        )
        .map((item) => (
          <Button
            key={item.href}
            asChild
            variant={
              (canManageGlobalSettings ? item.route === route : item.route === activeRoute)
                ? "default"
                : "outline"
            }
            size="sm"
          >
            <Link
              href={
                canManageGlobalSettings
                  ? item.href
                  : retailNavHref(item, workerView)
              }
            >
              {canManageGlobalSettings
                ? item.label
                : retailNavLabel(item, workerView)}
            </Link>
          </Button>
        ))}
    </div>
  )
}

function KpiCards({
  kpis,
}: {
  kpis: { label: string; value: string; detail: string }[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="pb-2">
            <CardDescription>{kpi.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{kpi.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PermissionCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function RetailWorkerHome() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {workerHomeItems.map((item) => {
        const Icon = item.icon

        return (
          <Button
            key={item.href}
            asChild
            variant="outline"
            className="h-auto min-h-28 justify-start gap-3 whitespace-normal bg-background p-4 text-left"
          >
            <Link href={item.href}>
              <Icon className="size-5 shrink-0" />
              <span className="min-w-0 space-y-1">
                <span className="block text-base font-semibold leading-snug">
                  {item.label}
                </span>
                <span className="block text-xs font-normal leading-snug text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          </Button>
        )
      })}
    </div>
  )
}

function RetailHome({
  canManageSettings,
  canManageGlobalSettings,
  workerView,
}: {
  canManageSettings: boolean
  canManageGlobalSettings: boolean
  workerView: boolean
}) {
  const items = canManageGlobalSettings
    ? adminHomeItems
    : workerView
    ? workerHomeItems
    : canManageSettings
      ? managerHomeItems
      : [
          {
            href: "/retail/today",
            label: "Today Summary",
            description: "Assigned outlet records.",
            icon: ClipboardCheck,
          },
        ]

  if (workerView) {
    return <RetailWorkerHome />
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <Button
            key={item.href}
            asChild
            variant="outline"
            className="h-auto min-h-24 justify-start gap-3 whitespace-normal p-4 text-left"
          >
            <Link href={item.href}>
              <Icon className="size-5 shrink-0" />
              <span className="min-w-0 space-y-1">
                <span className="block text-base font-semibold leading-snug">
                  {item.label}
                </span>
                <span className="block text-xs font-normal leading-snug text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          </Button>
        )
      })}
    </div>
  )
}

function RetailReportsLauncher({
  canManageGlobalSettings,
}: {
  canManageGlobalSettings: boolean
}) {
  const items = canManageGlobalSettings
    ? adminHomeItems
    : [
        {
          href: "/retail/reports/outlet",
          label: "Outlet Report",
          description: "Assigned outlet sales, cash, cleaning, and processing.",
          icon: BarChart3,
        },
      ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <Button
            key={item.href}
            asChild
            variant="outline"
            className="h-auto min-h-24 justify-start gap-3 whitespace-normal p-4 text-left"
          >
            <Link href={item.href}>
              <Icon className="size-5 shrink-0" />
              <span className="min-w-0 space-y-1">
                <span className="block text-base font-semibold leading-snug">
                  {item.label}
                </span>
                <span className="block text-xs font-normal leading-snug text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          </Button>
        )
      })}
    </div>
  )
}

function RetailReportsFilter({
  filters,
  outlets,
  canViewAllOutlets,
  resetHref = "/retail/reports",
}: {
  filters: RetailReportFilters
  outlets: RetailPageData["outlets"]
  canViewAllOutlets: boolean
  resetHref?: string
}) {
  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>Report filters</CardTitle>
        <CardDescription>
          Managers stay on their assigned outlet. Admin and director can filter all
          outlets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
          <div className="space-y-2">
            <Label htmlFor="retailReportDate">Date</Label>
            <Input
              id="retailReportDate"
              name="date"
              type="date"
              defaultValue={filters.date ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailReportDateFrom">Date from</Label>
            <Input
              id="retailReportDateFrom"
              name="dateFrom"
              type="date"
              defaultValue={filters.dateFrom ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailReportDateTo">Date to</Label>
            <Input
              id="retailReportDateTo"
              name="dateTo"
              type="date"
              defaultValue={filters.dateTo ?? ""}
            />
          </div>
          {canViewAllOutlets ? (
            <div className="space-y-2">
              <Label htmlFor="retailReportOutlet">Outlet/team</Label>
              <select
                id="retailReportOutlet"
                name="outletId"
                defaultValue={filters.outletId ?? ""}
                className={selectClassName}
              >
                <option value="">All outlets</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="retailReportPaymentMethod">Payment method</Label>
            <select
              id="retailReportPaymentMethod"
              name="paymentMethod"
              defaultValue={filters.paymentMethod ?? ""}
              className={selectClassName}
            >
              <option value="">All payment methods</option>
              {retailExpensePaymentMethods.map((method) => (
                <option key={method} value={method}>
                  {statusText(method)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailReportStatus">Status</Label>
            <select
              id="retailReportStatus"
              name="status"
              defaultValue={filters.status ?? ""}
              className={selectClassName}
            >
              <option value="">All statuses</option>
              {retailReportStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusText(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailReportProcessingItem">Processing item</Label>
            <Input
              id="retailReportProcessingItem"
              name="processingItem"
              defaultValue={filters.processingItem ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailReportProcessingType">Processing type/BOM</Label>
            <Input
              id="retailReportProcessingType"
              name="processingType"
              defaultValue={filters.processingType ?? ""}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
            <Button type="submit" className="w-full md:w-auto">
              <Search className="size-4" />
              Filter reports
            </Button>
            <Button asChild type="button" variant="outline" className="w-full md:w-auto">
              <Link href={resetHref}>Reset</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function csvCell(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "")

  return `"${text.replaceAll('"', '""')}"`
}

function retailReportCsvHref(report: ReturnType<typeof buildRetailReportData>) {
  const rows: (string | number | boolean | null | undefined)[][] = [
    ["Section", "Outlet", "Date", "Status", "Name", "Amount", "Detail"],
    ...report.kpis.map((kpi) => [
      "KPI",
      report.scope === "global" ? "All outlets" : "Assigned outlet",
      report.focusDate,
      "",
      kpi.label,
      kpi.value,
      kpi.detail,
    ]),
    ...report.filteredDailySales.map((sale) => [
      "Daily sales",
      sale.outletName,
      sale.salesDate,
      sale.attachmentStatus,
      "AutoCount summary",
      sale.totalSales,
      `Cash ${sale.cashSales} | Bank ${sale.bankTransferSales} | E-wallet ${sale.ewalletSales} | Credit ${sale.creditSales}`,
    ]),
    ...report.filteredExpenses.map((expense) => [
      "Expenses",
      expense.outletName,
      expense.expenseDate,
      expense.status,
      expense.category,
      expense.amount,
      `${expense.paymentMethod} | Receipt ${expense.receiptUrl ? "OK" : "MISSING"}`,
    ]),
    ...report.missingCleaningTasks.map((task) => [
      "Missing cleaning",
      task.outletName,
      report.focusDate,
      "MISSING",
      task.taskName,
      "",
      task.frequency,
    ]),
    ...report.filteredDailyClosings.map((closing) => [
      "Cash closing",
      closing.outletName,
      closing.closingDate,
      closing.status,
      "Cash variance",
      closing.varianceAmount,
      `Expected ${closing.expectedCash} | Actual ${closing.actualCashCounted}`,
    ]),
    ...report.filteredProcessingBatches.map((batch) => [
      "Processing",
      batch.outletName,
      batch.processingDate,
      batch.status,
      batch.processingType,
      batch.finishedWeightKg,
      `Raw ${batch.rawWeightKg}kg | Wastage ${batch.wastageWeightKg}kg | Yield ${batch.yieldPercent.toFixed(2)}%`,
    ]),
  ]
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n")

  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
}

function kpisByLabel(
  report: ReturnType<typeof buildRetailReportData>,
  labels: string[]
) {
  return labels
    .map((label) => report.kpis.find((kpi) => kpi.label === label))
    .filter((kpi): kpi is NonNullable<typeof kpi> => Boolean(kpi))
}

function TodaySummaryView({ data }: { data: RetailPageData }) {
  const todayData = filterWorkerTodayData(data)
  const cleaning = requiredCleaningTasks(todayData.cleaningTasks)
  const missingCleaning = cleaning.filter(
    (task) => cleaningDisplayStatus(task) !== "DONE"
  )
  const todaySale = todayData.dailySales[0]
  const cashClosing = todayData.dailyClosings[0]
  const salesStatus = todaySale ? statusText(todaySale.status) : "Not Entered"
  const hasMissingCleaning = missingCleaning.length > 0
  const cashExpenses = todayData.expenses
    .filter(
      (expense) =>
        expense.paymentMethod === "CASH" &&
        expense.status !== "REJECTED" &&
        expense.status !== "CANCELLED"
    )
    .reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s outlet records</CardTitle>
          <CardDescription>Quick check for today.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 font-medium">
                <Receipt className="size-4" />
                Today sales
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                RM {(todaySale?.totalSales ?? 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Status: {salesStatus}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 font-medium">
                <Banknote className="size-4" />
                Cash closing
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {cashClosing ? "Closed" : "Not Closed"}
              </div>
              <div className="text-sm text-muted-foreground">
                Manager-only closing status
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 font-medium">
                <WalletCards className="size-4" />
                Cash expenses
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                RM {cashExpenses.toFixed(2)}
              </div>
            </div>
            <div
              className={
                hasMissingCleaning
                  ? "rounded-md border border-red-200 bg-red-50 p-3 text-red-950"
                  : "rounded-md border p-3"
              }
            >
              <div className="flex items-center gap-2 font-medium">
                <ClipboardCheck className="size-4" />
                Cleaning missing
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {missingCleaning.length}
              </div>
              <div className="text-sm text-muted-foreground">
                {hasMissingCleaning
                  ? "Missing tasks today"
                  : "All required tasks completed"}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 font-medium">
                <CookingPot className="size-4" />
                Processing records
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {todayData.processingBatches.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TodayDailySalesSummary({
  data,
  canConfirm,
}: {
  data: RetailPageData
  canConfirm: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const todaySales = data.dailySales.filter((sale) => sale.salesDate === today)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s existing summary</CardTitle>
        <CardDescription>
          Saved AutoCount daily sales summary for today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canConfirm ? <RetailDailySaleConfirmForm sales={todaySales} /> : null}
        <DataTable
          columns={dailySaleEntryColumns}
          data={dailySaleRows(todaySales)}
          emptyText="No daily sales summary saved for today."
        />
      </CardContent>
    </Card>
  )
}

function ExpenseReviewQueue({ expenses }: { expenses: RetailExpense[] }) {
  const submitted = expenses.filter((expense) => expense.status === "SUBMITTED")
  const firstExpense = submitted[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submitted expenses</CardTitle>
        <CardDescription>
          Clear submitted outlet expenses one by one. Check the receipt before
          approving or rejecting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-sm font-semibold">Expense review guide</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with the oldest submitted expense, open the receipt, then save
            an approve, reject, or cancel decision.
          </p>
          {firstExpense ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">Start here</div>
                <div className="mt-1 text-sm font-semibold">
                  {firstExpense.category}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  RM {firstExpense.amount.toFixed(2)}
                </div>
              </div>
              <div className="rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">Submitted by</div>
                <div className="mt-1 text-sm font-semibold">
                  {firstExpense.submittedByName}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {firstExpense.outletName}
                </div>
              </div>
              <div className="rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">Next action</div>
                <div className="mt-1 text-sm font-semibold">
                  Open receipt proof
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Different checker required
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                "No submitted expenses",
                "Return to Retail Home",
                "Check history later",
              ].map((step) => (
                <div key={step} className="rounded-md border bg-background p-3">
                  <div className="text-sm font-semibold">{step}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {submitted.length > 0 ? (
          <DataTable columns={expenseReviewColumns} data={expenseRows(submitted)} />
        ) : (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            No submitted expenses need review. New worker submissions will appear
            here after receipt proof is uploaded.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CleaningSetupList({ tasks }: { tasks: RetailCleaningTask[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cleaning task records</CardTitle>
        <CardDescription>Active and inactive task master records.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={cleaningSetupColumns}
          data={cleaningRows(tasks)}
          emptyText="No cleaning task master records yet."
        />
      </CardContent>
    </Card>
  )
}

function ManagerTodayChecklist({
  report,
}: {
  report: ReturnType<typeof buildRetailReportData>
}) {
  const missingClosing =
    report.kpis.find((kpi) => kpi.label === "Missing cash closing")?.value ?? "0"
  const missingCleaning =
    report.kpis.find((kpi) => kpi.label === "Missing cleaning tasks")?.value ?? "0"
  const submittedExpenses = report.filteredExpenses.filter(
    (expense) => expense.status === "SUBMITTED"
  ).length
  const todaySale = report.filteredDailySales[0]
  const salesConfirmed = todaySale?.status === "CONFIRMED"
  const pendingItems = [
    {
      label: "Expenses",
      value: `${submittedExpenses} submitted`,
      pending: submittedExpenses > 0,
      icon: WalletCards,
    },
    {
      label: "Cleaning",
      value: missingCleaning === "0" ? "No missing" : `${missingCleaning} missing`,
      pending: missingCleaning !== "0",
      icon: ClipboardCheck,
    },
    {
      label: "Cash Closing",
      value: missingClosing === "0" ? "Closed" : "Not Closed",
      pending: missingClosing !== "0",
      icon: Banknote,
    },
    {
      label: "Daily Sales",
      value: salesConfirmed ? "Confirmed" : todaySale ? "Draft" : "Not Entered",
      pending: !salesConfirmed,
      icon: Receipt,
    },
  ].sort((a, b) => Number(b.pending) - Number(a.pending))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today checklist</CardTitle>
        <CardDescription>Pending outlet tasks first.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {pendingItems.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.label}
                className={
                  item.pending
                    ? "rounded-md border border-amber-200 bg-amber-50 p-3"
                    : "rounded-md border border-emerald-200 bg-emerald-50 p-3"
                }
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4" />
                  {item.label}
                </div>
                <div className="mt-1 text-xl font-semibold">{item.value}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function OutletReportView({
  data,
  profile,
  filters,
}: {
  data: RetailPageData
  profile: CurrentProfile
  filters: RetailReportFilters
}) {
  const report = buildRetailReportData({
    data,
    profile,
    filters,
    canViewAllOutlets: false,
  })
  const exportHref = retailReportCsvHref(report)

  return (
    <>
      <ManagerTodayChecklist report={report} />
      <KpiCards
        kpis={kpisByLabel(report, [
          "Today total sales",
          "Cash received",
          "Cash expenses",
          "Cash variance",
          "Cleaning completion",
          "Today processing yield %",
        ])}
      />
      <Card>
        <CardHeader>
          <CardTitle>Export outlet report</CardTitle>
          <CardDescription>
            CSV export is scoped to this manager outlet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="min-h-12 w-full sm:w-auto">
            <a href={exportHref} download={`retail-outlet-report-${report.focusDate}.csv`}>
              <Download className="size-4" />
              Export CSV
            </a>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Outlet checks</CardTitle>
          <CardDescription>Today&apos;s missing closing and cleaning work.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={closingColumns}
            data={closingRows(report.filteredDailyClosings)}
            emptyText="No cash closing records match this outlet report."
          />
        </CardContent>
      </Card>
    </>
  )
}

function AllOutletReportView({
  data,
  profile,
  filters,
}: {
  data: RetailPageData
  profile: CurrentProfile
  filters: RetailReportFilters
}) {
  const report = buildRetailReportData({
    data,
    profile,
    filters,
    canViewAllOutlets: true,
  })

  return (
    <>
      <RetailReportsFilter
        filters={filters}
        outlets={data.outlets}
        canViewAllOutlets
        resetHref="/retail/reports/all"
      />
      <Card>
        <CardHeader>
          <CardTitle>Daily sales summaries</CardTitle>
          <CardDescription>All authorized outlet sales records.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={dailySaleColumns}
            data={dailySaleRows(report.filteredDailySales)}
            emptyText="No daily sales summaries match these filters."
          />
        </CardContent>
      </Card>
      <KpiCards
        kpis={kpisByLabel(report, [
          "All outlet total sales",
          "Outlet comparison",
          "Payment method breakdown",
          "Missing closing records",
          "Expenses summary",
        ])}
      />
    </>
  )
}

function CashVarianceReportView({
  data,
  profile,
  filters,
}: {
  data: RetailPageData
  profile: CurrentProfile
  filters: RetailReportFilters
}) {
  const report = buildRetailReportData({
    data,
    profile,
    filters,
    canViewAllOutlets: true,
  })

  return (
    <>
      <RetailReportsFilter
        filters={filters}
        outlets={data.outlets}
        canViewAllOutlets
        resetHref="/retail/reports/cash-variance"
      />
      <Card>
        <CardHeader>
          <CardTitle>Cash variance records</CardTitle>
          <CardDescription>Expected cash compared with counted cash.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={closingColumns}
            data={closingRows(report.filteredDailyClosings)}
            emptyText="No cash closing variance records match these filters."
          />
        </CardContent>
      </Card>
      <KpiCards kpis={kpisByLabel(report, ["Cash variance by outlet"])} />
    </>
  )
}

function MissingTasksReportView({
  data,
  profile,
  filters,
}: {
  data: RetailPageData
  profile: CurrentProfile
  filters: RetailReportFilters
}) {
  const report = buildRetailReportData({
    data,
    profile,
    filters,
    canViewAllOutlets: true,
  })

  return (
    <>
      <RetailReportsFilter
        filters={filters}
        outlets={data.outlets}
        canViewAllOutlets
        resetHref="/retail/reports/missing-tasks"
      />
      <Card>
        <CardHeader>
          <CardTitle>Missing cleaning tasks</CardTitle>
          <CardDescription>Required cleaning not completed for the focus date.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={cleaningColumns}
            data={cleaningRows(report.missingCleaningTasks)}
            emptyText="No missing cleaning tasks for this view."
          />
        </CardContent>
      </Card>
      <KpiCards
        kpis={kpisByLabel(report, [
          "Missing closing records",
          "Cleaning missing tasks",
        ])}
      />
    </>
  )
}

function ProcessingReportView({
  data,
  profile,
  filters,
}: {
  data: RetailPageData
  profile: CurrentProfile
  filters: RetailReportFilters
}) {
  const report = buildRetailReportData({
    data,
    profile,
    filters,
    canViewAllOutlets: true,
  })

  return (
    <>
      <RetailReportsFilter
        filters={filters}
        outlets={data.outlets}
        canViewAllOutlets
        resetHref="/retail/reports/processing"
      />
      <Card>
        <CardHeader>
          <CardTitle>Processing records</CardTitle>
          <CardDescription>Raw material, finished weight, wastage, and yield.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={processingColumns}
            data={processingRows(report.filteredProcessingBatches)}
            emptyText="No processing records match these filters."
          />
        </CardContent>
      </Card>
      <KpiCards
        kpis={kpisByLabel(report, [
          "Processing yield by outlet",
          "Wastage by outlet",
        ])}
      />
    </>
  )
}

function ExpenseReportView({
  data,
  profile,
  filters,
}: {
  data: RetailPageData
  profile: CurrentProfile
  filters: RetailReportFilters
}) {
  const report = buildRetailReportData({
    data,
    profile,
    filters,
    canViewAllOutlets: true,
  })

  return (
    <>
      <RetailReportsFilter
        filters={filters}
        outlets={data.outlets}
        canViewAllOutlets
        resetHref="/retail/reports/expenses"
      />
      <Card>
        <CardHeader>
          <CardTitle>Expense records</CardTitle>
          <CardDescription>All authorized outlet expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={expenseColumns}
            data={expenseRows(report.filteredExpenses)}
            emptyText="No expenses match these filters."
          />
        </CardContent>
      </Card>
      <KpiCards kpis={kpisByLabel(report, ["Expenses summary"])} />
    </>
  )
}

function ExportCenterView({
  data,
  profile,
  filters,
}: {
  data: RetailPageData
  profile: CurrentProfile
  filters: RetailReportFilters
}) {
  const report = buildRetailReportData({
    data,
    profile,
    filters,
    canViewAllOutlets: true,
  })
  const exportHref = retailReportCsvHref(report)

  return (
    <>
      <RetailReportsFilter
        filters={filters}
        outlets={data.outlets}
        canViewAllOutlets
        resetHref="/retail/reports/export"
      />
      <Card>
        <CardHeader>
          <CardTitle>Export Retail CSV</CardTitle>
          <CardDescription>
            Export uses the same authorized filters and report data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="min-h-12 w-full sm:w-auto">
            <a href={exportHref} download={`retail-report-${report.focusDate}.csv`}>
              <Download className="size-4" />
              Export CSV
            </a>
          </Button>
        </CardContent>
      </Card>
    </>
  )
}

export async function RetailPage({
  route,
  filters = {},
}: {
  route: RetailRoute
  filters?: RetailReportFilters
}) {
  const blocked = await moduleAccessBlock("retail", "Retail", retailRoles)

  if (blocked) {
    return blocked
  }

  const profile = await requireCurrentProfile()
  const canManageSettings = hasAnyRole(profile, retailManagerRoles)
  const canManageGlobalSettings = hasAnyRole(profile, retailGlobalAdminRoles)
  const workerView = isRetailWorkerView(profile)
  const canCreateDailySales = canManageSettings || workerView
  const canSubmitCashClosing = canManageSettings
  const canViewFullReports = canManageSettings

  if (route === "settings" && !canManageSettings) {
    return await moduleAccessBlock("retail", "Retail Settings", retailManagerRoles)
  }

  if (
    [
      "expense-review",
      "cleaning-tasks",
      "cleaning-history",
      "processing-history",
      "cash-closing",
      "cash-closing-history",
      "settings-boms",
      "settings-boms-list",
      "settings-categories",
      "settings-categories-list",
      "settings-audit",
    ].includes(route) &&
    !canManageSettings
  ) {
    return await moduleAccessBlock("retail", "Retail Manager Task", retailManagerRoles)
  }

  if (route === "outlet-report" && !canManageSettings) {
    return await moduleAccessBlock("retail", "Outlet Report", retailManagerRoles)
  }

  if (
    [
      "all-outlet-report",
      "cash-variance-report",
      "missing-tasks-report",
      "processing-report",
      "expense-report",
      "export-center",
    ].includes(route) &&
    !canManageGlobalSettings
  ) {
    return await moduleAccessBlock(
      "retail",
      "All Outlet Retail Reports",
      retailGlobalAdminRoles
    )
  }

  const data = await getRetailPageData(profile)
  const visibleData = workerView ? filterWorkerTodayData(data) : data

  return (
    <div className="space-y-5">
      <PageHeader route={route} demoMode={data.demoMode} />
      <RetailNav
        route={route}
        canManageSettings={canManageSettings}
        canManageGlobalSettings={canManageGlobalSettings}
        workerView={workerView}
      />

      {route === "home" ? (
        <>
          <RetailHome
            canManageSettings={canManageSettings}
            canManageGlobalSettings={canManageGlobalSettings}
            workerView={workerView}
          />
        </>
      ) : null}

      {route === "today-summary" ? <TodaySummaryView data={visibleData} /> : null}

      {route === "reports" ? (
        canViewFullReports ? (
          <RetailReportsLauncher
            canManageGlobalSettings={canManageGlobalSettings}
          />
        ) : (
          <PermissionCard
            title="Retail reports are manager controlled"
            description="Retail workers can complete daily outlet work, but full sales, cash, expense, cleaning, and processing reports are available to retail managers, admin, and directors."
          />
        )
      ) : null}

      {route === "outlet-report" ? (
        <OutletReportView data={data} profile={profile} filters={filters} />
      ) : null}

      {route === "all-outlet-report" ? (
        <AllOutletReportView data={data} profile={profile} filters={filters} />
      ) : null}

      {route === "cash-variance-report" ? (
        <CashVarianceReportView data={data} profile={profile} filters={filters} />
      ) : null}

      {route === "missing-tasks-report" ? (
        <MissingTasksReportView data={data} profile={profile} filters={filters} />
      ) : null}

      {route === "processing-report" ? (
        <ProcessingReportView data={data} profile={profile} filters={filters} />
      ) : null}

      {route === "expense-report" ? (
        <ExpenseReportView data={data} profile={profile} filters={filters} />
      ) : null}

      {route === "export-center" ? (
        <ExportCenterView data={data} profile={profile} filters={filters} />
      ) : null}

      {route === "sales" ? (
        <>
          {canCreateDailySales ? (
            <>
              <RetailDailySaleForm outlets={data.outlets} profile={profile} />
              <TodayDailySalesSummary
                data={data}
                canConfirm={canManageSettings}
              />
            </>
          ) : (
            <PermissionCard
              title="Daily sales summary is manager controlled"
              description="Retail workers can view today's outlet summaries here. Draft entry is only available to assigned retail outlet workers."
            />
          )}
        </>
      ) : null}

      {route === "expenses" ? (
        <>
          <RetailExpenseForm
            outlets={data.outlets}
            categories={data.expenseCategories}
            profile={profile}
          />
        </>
      ) : null}

      {route === "expense-review" ? (
        <>
          <ExpenseReviewQueue expenses={data.expenses} />
          <RetailExpenseStatusForm expenses={data.expenses} />
        </>
      ) : null}

      {route === "expense-history" ? (
        <>
          <RetailExpenseEditForm
            expenses={visibleData.expenses}
            categories={data.expenseCategories}
            profile={profile}
          />
          <Card>
            <CardHeader>
              <CardTitle>Outlet expenses</CardTitle>
              <CardDescription>Submitted, reviewed, approved, and paid expenses.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={expenseColumns}
                data={expenseRows(visibleData.expenses)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "cleaning" ? (
        <>
          <RetailCleaningUpdateForm
            tasks={requiredCleaningTasks(visibleData.cleaningTasks).filter(
              isCleaningDueToday
            )}
          />
        </>
      ) : null}

      {route === "cleaning-tasks" ? (
        <>
          <RetailCleaningTaskForm
            outlets={data.outlets}
            departments={data.departments}
            profile={profile}
          />
          <CleaningSetupList tasks={data.cleaningTasks} />
        </>
      ) : null}

      {route === "cleaning-history" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Cleaning checklist</CardTitle>
              <CardDescription>Daily, weekly, monthly, and quarterly retail tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={cleaningColumns}
                data={cleaningRows(requiredCleaningTasks(visibleData.cleaningTasks))}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "processing" ? (
        <>
          <RetailProcessingBatchForm
            outlets={data.outlets}
            items={data.items}
            processingBoms={data.processingBoms}
            profile={profile}
          />
        </>
      ) : null}

      {route === "processing-history" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Processing records</CardTitle>
              <CardDescription>
                Raw materials, finished products, wastage, and actual yield.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={processingColumns}
                data={processingRows(visibleData.processingBatches)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "cash-closing" ? (
        <>
          {canSubmitCashClosing ? (
            <RetailDailyClosingForm
              outlets={data.outlets}
              dailySales={data.dailySales}
              expenses={data.expenses}
              profile={profile}
            />
          ) : (
            <PermissionCard
              title="Cash closing is manager controlled"
              description="Retail workers can check Closed / Not Closed in Today Summary. Retail managers, admin, and directors submit daily cash closing."
            />
          )}
        </>
      ) : null}

      {route === "cash-closing-history" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Daily closings</CardTitle>
              <CardDescription>Outlet cash closing submissions and checks.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={closingColumns}
                data={closingRows(visibleData.dailyClosings)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "settings" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                href: "/retail/settings/categories",
                label: "Add expense category",
                icon: Receipt,
              },
              {
                href: "/retail/settings/boms",
                label: "Add processing BOM",
                icon: CookingPot,
              },
              {
                href: "/retail/settings/audit",
                label: "Audit trail",
                icon: ClipboardCheck,
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <Button
                  key={item.href}
                  asChild
                  variant="outline"
                  className="h-16 justify-start gap-3 text-left"
                >
                  <Link href={item.href}>
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                href: "/retail/settings/categories/records",
                label: "View categories",
                icon: Search,
              },
              {
                href: "/retail/settings/boms/records",
                label: "View BOMs",
                icon: Search,
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className="min-h-11 justify-start gap-2 text-left"
                >
                  <Link href={item.href}>
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </div>
          {canManageGlobalSettings ? (
            <PermissionCard
              title="Global setup access"
              description="Admin and director can manage global processing BOMs. Retail managers can manage outlet categories and task masters for their assigned outlet."
            />
          ) : null}
        </>
      ) : null}

      {route === "settings-boms" ? (
        <>
          {canManageGlobalSettings ? (
            <RetailProcessingBomForm outlets={data.outlets} profile={profile} />
          ) : (
            <PermissionCard
              title="Processing BOMs are admin controlled"
              description="Retail managers can use active BOMs in processing records. Admin and director manage the global BOM master."
            />
          )}
        </>
      ) : null}

      {route === "settings-boms-list" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Processing BOM master</CardTitle>
              <CardDescription>
                Active BOMs appear in new retail processing records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={processingBomColumns}
                data={processingBomRows(data.processingBoms)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "settings-categories" ? (
        <>
          <RetailExpenseCategoryForm outlets={data.outlets} profile={profile} />
        </>
      ) : null}

      {route === "settings-categories-list" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Expense categories</CardTitle>
              <CardDescription>Configurable categories for outlet expenses.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={expenseCategoryColumns}
                data={expenseCategoryRows(data.expenseCategories)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "settings-audit" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Retail audit trail</CardTitle>
              <CardDescription>
                Important retail edits by table, field, old value, new value,
                editor, and reason.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={auditColumns}
                data={auditRows(data.auditLogs)}
                emptyText="No retail audit changes found."
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
