import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  RetailCashCloseForm,
  RetailCashOpenForm,
  RetailCleaningTaskForm,
  RetailCleaningUpdateForm,
  RetailDailyClosingForm,
  RetailDailySaleForm,
  RetailExpenseForm,
  RetailExpenseStatusForm,
  RetailPaymentForm,
  RetailPriceHint,
  RetailPriceRuleForm,
  RetailProcessingBatchForm,
  RetailProcessingReviewForm,
  RetailSaleForm,
} from "@/components/retail/retail-forms"
import { DataTable, type DataTableColumn } from "@/components/stock/data-table"
import { requireCurrentProfile } from "@/lib/auth/session"
import { getRetailPageData } from "@/lib/retail/data"
import type {
  RetailCashSession,
  RetailCleaningTask,
  RetailExpense,
  RetailNoBarcodeStock,
  RetailPageData,
  RetailPayment,
  RetailPriceRule,
  RetailProcessingBatch,
  RetailSale,
  RetailSaleLine,
  RetailStockUnit,
} from "@/lib/retail/types"

export type RetailRoute =
  | "dashboard"
  | "pos"
  | "processing"
  | "cleaning"
  | "sales"
  | "payments"
  | "cash-closing"
  | "expenses"
  | "prices"

type TableRow = Record<string, string | number | boolean>

const titles: Record<RetailRoute, { title: string; description: string }> = {
  dashboard: {
    title: "Retail Dashboard",
    description: "Counter sales, cash sessions, stock availability, and payment follow-up.",
  },
  pos: {
    title: "Retail POS",
    description: "Record walk-in sales from barcode and no-barcode stock.",
  },
  processing: {
    title: "Retail Processing",
    description: "Track raw material, finished product, yield, and loss.",
  },
  cleaning: {
    title: "Retail Cleaning",
    description: "Schedule and complete cleaning tasks by outlet and frequency.",
  },
  sales: {
    title: "Retail Sales",
    description: "Review completed retail sales and line details.",
  },
  payments: {
    title: "Retail Payments",
    description: "Record payment updates and monitor outstanding balances.",
  },
  "cash-closing": {
    title: "Cash Closing",
    description: "Open and close registers with expected cash and variance.",
  },
  expenses: {
    title: "Outlet Expenses",
    description: "Submit, review, approve, and pay retail outlet expenses.",
  },
  prices: {
    title: "Retail Prices",
    description: "Maintain item prices by outlet, brand, and origin.",
  },
}

const navItems: { route: RetailRoute; href: string; label: string }[] = [
  { route: "dashboard", href: "/retail/dashboard", label: "Dashboard" },
  { route: "pos", href: "/retail/pos", label: "POS" },
  { route: "processing", href: "/retail/processing", label: "Processing" },
  { route: "cleaning", href: "/retail/cleaning", label: "Cleaning" },
  { route: "sales", href: "/retail/sales", label: "Sales" },
  { route: "payments", href: "/retail/payments", label: "Payments" },
  { route: "cash-closing", href: "/retail/cash-closing", label: "Cash Closing" },
  { route: "expenses", href: "/retail/expenses", label: "Expenses" },
  { route: "prices", href: "/retail/prices", label: "Prices" },
]

const saleColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "saleNo", header: "Sale" },
  { key: "registerName", header: "Register" },
  { key: "customerName", header: "Customer" },
  { key: "status", header: "Status" },
  { key: "paymentStatus", header: "Payment" },
  { key: "totalAmount", header: "Total", align: "right" },
  { key: "paidAmount", header: "Paid", align: "right" },
  { key: "changeAmount", header: "Change", align: "right" },
]

const saleLineColumns: DataTableColumn<TableRow>[] = [
  { key: "saleNo", header: "Sale" },
  { key: "itemLabel", header: "Item" },
  { key: "brandName", header: "Brand" },
  { key: "originName", header: "Origin" },
  { key: "stockLocationName", header: "Location" },
  { key: "barcode", header: "Barcode" },
  { key: "quantity", header: "Qty", align: "right" },
  { key: "weightKg", header: "Kg", align: "right" },
  { key: "unitPrice", header: "Price", align: "right" },
  { key: "lineTotal", header: "Total", align: "right" },
]

const paymentColumns: DataTableColumn<TableRow>[] = [
  { key: "createdAt", header: "Created" },
  { key: "saleNo", header: "Sale" },
  { key: "paymentMethod", header: "Method" },
  { key: "paymentStatus", header: "Status" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "referenceNo", header: "Reference" },
  { key: "receivedByName", header: "Received by" },
]

const cashSessionColumns: DataTableColumn<TableRow>[] = [
  { key: "openedAt", header: "Opened" },
  { key: "registerName", header: "Register" },
  { key: "status", header: "Status" },
  { key: "openingFloat", header: "Opening", align: "right" },
  { key: "expectedCash", header: "Expected", align: "right" },
  { key: "closingCash", header: "Closing", align: "right" },
  { key: "varianceAmount", header: "Variance", align: "right" },
  { key: "closedAt", header: "Closed" },
]

const priceColumns: DataTableColumn<TableRow>[] = [
  { key: "effectiveFrom", header: "From" },
  { key: "itemLabel", header: "Item" },
  { key: "brandName", header: "Brand" },
  { key: "originName", header: "Origin" },
  { key: "outletName", header: "Outlet" },
  { key: "unitPrice", header: "Price", align: "right" },
  { key: "active", header: "Active" },
]

const processingColumns: DataTableColumn<TableRow>[] = [
  { key: "processedAt", header: "Processed" },
  { key: "batchNo", header: "Batch" },
  { key: "outletName", header: "Outlet" },
  { key: "rawItemLabel", header: "Raw item" },
  { key: "rawWeightKg", header: "Raw kg", align: "right" },
  { key: "finishedItemLabel", header: "Finished item" },
  { key: "finishedWeightKg", header: "Finished kg", align: "right" },
  { key: "yieldPercent", header: "Yield %", align: "right" },
  { key: "lossWeightKg", header: "Loss kg", align: "right" },
  { key: "yieldAlert", header: "Yield alert" },
  { key: "status", header: "Status" },
]

const cleaningColumns: DataTableColumn<TableRow>[] = [
  { key: "dueDate", header: "Due" },
  { key: "outletName", header: "Outlet" },
  { key: "departmentName", header: "Department" },
  { key: "taskName", header: "Task" },
  { key: "frequency", header: "Frequency" },
  { key: "status", header: "Status" },
  { key: "assignedToName", header: "Assigned" },
  { key: "completedAt", header: "Completed" },
]

const cleaningMatrixColumns: DataTableColumn<TableRow>[] = [
  { key: "date", header: "Date" },
  { key: "dueTasks", header: "Due", align: "right" },
  { key: "doneTasks", header: "Done", align: "right" },
  { key: "openTasks", header: "Open", align: "right" },
  { key: "missedTasks", header: "Missed", align: "right" },
]

const expenseColumns: DataTableColumn<TableRow>[] = [
  { key: "expenseDate", header: "Date" },
  { key: "outletName", header: "Outlet" },
  { key: "category", header: "Category" },
  { key: "vendor", header: "Vendor" },
  { key: "amount", header: "Amount", align: "right" },
  { key: "paymentMethod", header: "Method" },
  { key: "status", header: "Status" },
  { key: "receiptUrl", header: "Receipt" },
  { key: "submittedByName", header: "Submitted by" },
  { key: "reviewedByName", header: "Checked by" },
  { key: "paidByName", header: "Paid by" },
]

const stockUnitColumns: DataTableColumn<TableRow>[] = [
  { key: "barcode", header: "Barcode" },
  { key: "itemLabel", header: "Item" },
  { key: "brandName", header: "Brand" },
  { key: "originName", header: "Origin" },
  { key: "locationName", header: "Location" },
  { key: "netWeightKg", header: "Kg", align: "right" },
]

const noBarcodeColumns: DataTableColumn<TableRow>[] = [
  { key: "itemLabel", header: "Item" },
  { key: "brandName", header: "Brand" },
  { key: "originName", header: "Origin" },
  { key: "locationName", header: "Location" },
  { key: "quantity", header: "Qty", align: "right" },
  { key: "weightKg", header: "Kg", align: "right" },
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

function RetailNav({ route }: { route: RetailRoute }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {navItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={item.route === route ? "default" : "outline"}
          size="sm"
        >
          <Link href={item.href}>{item.label}</Link>
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
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

function saleRows(sales: RetailSale[]): TableRow[] {
  return sales.map((sale) => ({
    createdAt: dateText(sale.createdAt),
    saleNo: sale.saleNo,
    registerName: sale.registerName,
    customerName: sale.customerName,
    status: statusText(sale.status),
    paymentStatus: statusText(sale.paymentStatus),
    totalAmount: sale.totalAmount,
    paidAmount: sale.paidAmount,
    changeAmount: sale.changeAmount,
  }))
}

function saleLineRows(lines: RetailSaleLine[]): TableRow[] {
  return lines.map((line) => ({
    saleNo: line.saleNo,
    itemLabel: line.itemLabel,
    brandName: line.brandName,
    originName: line.originName,
    stockLocationName: line.stockLocationName,
    barcode: line.barcode,
    quantity: line.quantity,
    weightKg: line.weightKg,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  }))
}

function paymentRows(payments: RetailPayment[]): TableRow[] {
  return payments.map((payment) => ({
    createdAt: dateText(payment.createdAt),
    saleNo: payment.saleNo,
    paymentMethod: statusText(payment.paymentMethod),
    paymentStatus: statusText(payment.paymentStatus),
    amount: payment.amount,
    referenceNo: payment.referenceNo,
    receivedByName: payment.receivedByName,
  }))
}

function cashSessionRows(sessions: RetailCashSession[]): TableRow[] {
  return sessions.map((session) => ({
    openedAt: dateText(session.openedAt),
    registerName: session.registerName,
    status: session.status,
    openingFloat: session.openingFloat,
    expectedCash: session.expectedCash,
    closingCash: session.closingCash,
    varianceAmount: session.varianceAmount,
    closedAt: dateText(session.closedAt),
  }))
}

function priceRows(prices: RetailPriceRule[]): TableRow[] {
  return prices.map((price) => ({
    effectiveFrom: dateText(price.effectiveFrom),
    itemLabel: price.itemLabel,
    brandName: price.brandName,
    originName: price.originName,
    outletName: price.outletName,
    unitPrice: price.unitPrice,
    active: price.active,
  }))
}

function processingRows(batches: RetailProcessingBatch[]): TableRow[] {
  return batches.map((batch) => ({
    processedAt: dateText(batch.processedAt),
    batchNo: batch.batchNo,
    outletName: batch.outletName,
    rawItemLabel: batch.rawItemLabel,
    rawWeightKg: batch.rawWeightKg,
    finishedItemLabel: batch.finishedItemLabel,
    finishedWeightKg: batch.finishedWeightKg,
    yieldPercent: batch.yieldPercent,
    lossWeightKg: batch.lossWeightKg,
    yieldAlert: batch.yieldAlert,
    status: statusText(batch.status),
  }))
}

function cleaningRows(tasks: RetailCleaningTask[]): TableRow[] {
  return tasks.map((task) => ({
    dueDate: dateText(task.dueDate),
    outletName: task.outletName,
    departmentName: task.departmentName,
    taskName: task.taskName,
    frequency: task.frequency,
    status: task.status,
    assignedToName: task.assignedToName,
    completedAt: dateText(task.completedAt),
  }))
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function missingCleaningTasks(tasks: RetailCleaningTask[]) {
  const today = todayKey()

  return tasks.filter(
    (task) =>
      task.status === "MISSED" ||
      (task.status === "PENDING" && task.dueDate.slice(0, 10) < today)
  )
}

function daysBetween(start: Date, end: Date) {
  const startTime = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  )
  const endTime = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate()
  )

  return Math.floor((endTime - startTime) / 86400000)
}

function taskDueOn(task: RetailCleaningTask, date: Date) {
  if (!task.dueDate) {
    return false
  }

  const firstDue = new Date(`${task.dueDate.slice(0, 10)}T00:00:00.000Z`)
  const diff = daysBetween(firstDue, date)

  if (diff < 0) {
    return false
  }

  if (task.frequency === "DAILY") {
    return true
  }

  if (task.frequency === "WEEKLY") {
    return diff % 7 === 0
  }

  if (task.frequency === "MONTHLY") {
    return date.getUTCDate() === firstDue.getUTCDate()
  }

  const monthsDiff =
    (date.getUTCFullYear() - firstDue.getUTCFullYear()) * 12 +
    date.getUTCMonth() -
    firstDue.getUTCMonth()

  return (
    task.frequency === "QUARTERLY" &&
    monthsDiff >= 0 &&
    monthsDiff % 3 === 0 &&
    date.getUTCDate() === firstDue.getUTCDate()
  )
}

function cleaningMatrixRows(tasks: RetailCleaningTask[]): TableRow[] {
  const today = new Date()
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )

  return Array.from({ length: 30 }).map((_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    const dueTasks = tasks.filter((task) => taskDueOn(task, date))
    const doneTasks = dueTasks.filter((task) => task.status === "DONE")
    const missedTasks = dueTasks.filter((task) => task.status === "MISSED")

    return {
      date: date.toISOString().slice(0, 10),
      dueTasks: dueTasks.length,
      doneTasks: doneTasks.length,
      openTasks: dueTasks.length - doneTasks.length - missedTasks.length,
      missedTasks: missedTasks.length,
    }
  })
}

function expenseRows(expenses: RetailExpense[]): TableRow[] {
  return expenses.map((expense) => ({
    expenseDate: dateText(expense.expenseDate),
    outletName: expense.outletName,
    category: expense.category,
    vendor: expense.vendor,
    amount: expense.amount,
    paymentMethod: statusText(expense.paymentMethod),
    status: statusText(expense.status),
    receiptUrl: expense.receiptUrl,
    submittedByName: expense.submittedByName,
    reviewedByName: expense.reviewedByName,
    paidByName: expense.paidByName,
  }))
}

function stockUnitRows(units: RetailStockUnit[]): TableRow[] {
  return units.map((unit) => ({
    barcode: unit.barcode,
    itemLabel: unit.itemLabel,
    brandName: unit.brandName,
    originName: unit.originName,
    locationName: unit.locationName,
    netWeightKg: unit.netWeightKg,
  }))
}

function noBarcodeRows(stock: RetailNoBarcodeStock[]): TableRow[] {
  return stock.map((row) => ({
    itemLabel: row.itemLabel,
    brandName: row.brandName,
    originName: row.originName,
    locationName: row.locationName,
    quantity: row.quantity,
    weightKg: row.weightKg,
  }))
}

function RetailSaleEntry({ data }: { data: RetailPageData }) {
  return (
    <RetailSaleForm
      registers={data.registers}
      cashSessions={data.cashSessions}
      items={data.items}
      brands={data.brands}
      origins={data.origins}
      stockLocations={data.stockLocations}
      stockUnits={data.stockUnits}
      noBarcodeStock={data.noBarcodeStock}
    />
  )
}

export async function RetailPage({ route }: { route: RetailRoute }) {
  const profile = await requireCurrentProfile()
  const data = await getRetailPageData()

  return (
    <div className="space-y-5">
      <PageHeader route={route} demoMode={data.demoMode} />
      <RetailNav route={route} />

      {route === "dashboard" ? (
        <>
          <KpiCards kpis={data.dashboard.kpis} />
          <Card>
            <CardHeader>
              <CardTitle>Recent sales</CardTitle>
              <CardDescription>Latest completed and pending retail sales.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={saleColumns}
                data={saleRows(data.sales).slice(0, 10)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open cash sessions</CardTitle>
              <CardDescription>Registers currently accepting cash.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={cashSessionColumns}
                data={cashSessionRows(
                  data.cashSessions.filter((session) => session.status === "OPEN")
                )}
              />
            </CardContent>
          </Card>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent processing</CardTitle>
                <CardDescription>Latest raw-to-finished batch yield.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={processingColumns}
                  data={processingRows(data.processingBatches).slice(0, 6)}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cleaning alerts</CardTitle>
                <CardDescription>Overdue and missed cleaning tasks.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={cleaningColumns}
                  data={cleaningRows(missingCleaningTasks(data.cleaningTasks)).slice(
                    0,
                    6
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {route === "pos" ? (
        <>
          <RetailPriceHint priceRules={data.priceRules} />
          <RetailSaleEntry data={data} />
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Barcode stock</CardTitle>
                <CardDescription>Available barcode units for POS sale.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={stockUnitColumns}
                  data={stockUnitRows(data.stockUnits).slice(0, 12)}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>No-barcode stock</CardTitle>
                <CardDescription>Available loose stock for POS sale.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={noBarcodeColumns}
                  data={noBarcodeRows(data.noBarcodeStock).slice(0, 12)}
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {route === "processing" ? (
        <>
          <RetailProcessingBatchForm
            outlets={data.outlets}
            stockLocations={data.stockLocations}
            items={data.items}
            brands={data.brands}
            origins={data.origins}
            profile={profile}
          />
          <RetailProcessingReviewForm batches={data.processingBatches} />
          <Card>
            <CardHeader>
              <CardTitle>Processing batches</CardTitle>
              <CardDescription>Raw material, finished product, yield, and loss.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={processingColumns}
                data={processingRows(data.processingBatches)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "cleaning" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <RetailCleaningTaskForm
              outlets={data.outlets}
              departments={data.departments}
              people={data.people}
              profile={profile}
            />
            <RetailCleaningUpdateForm tasks={data.cleaningTasks} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Missing cleaning alerts</CardTitle>
              <CardDescription>Overdue pending work and missed tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={cleaningColumns}
                data={cleaningRows(missingCleaningTasks(data.cleaningTasks))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cleaning tasks</CardTitle>
              <CardDescription>Daily, weekly, monthly, and quarterly tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={cleaningColumns}
                data={cleaningRows(data.cleaningTasks)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>30-day cleaning matrix</CardTitle>
              <CardDescription>Projected due work from task frequency.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={cleaningMatrixColumns}
                data={cleaningMatrixRows(data.cleaningTasks)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "sales" ? (
        <>
          <RetailDailySaleForm outlets={data.outlets} profile={profile} />
          <Card>
            <CardHeader>
              <CardTitle>Sales</CardTitle>
              <CardDescription>Retail transaction headers.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={saleColumns} data={saleRows(data.sales)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sale lines</CardTitle>
              <CardDescription>Item, barcode, and no-barcode line details.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={saleLineColumns}
                data={saleLineRows(data.saleLines)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "payments" ? (
        <>
          <RetailPaymentForm sales={data.sales} />
          <Card>
            <CardHeader>
              <CardTitle>Payment records</CardTitle>
              <CardDescription>Cash, card, transfer, e-wallet, and credit receipts.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={paymentColumns} data={paymentRows(data.payments)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sale payment status</CardTitle>
              <CardDescription>Outstanding and partially paid retail sales.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={saleColumns} data={saleRows(data.sales)} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "cash-closing" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <RetailDailyClosingForm outlets={data.outlets} profile={profile} />
            <RetailCashOpenForm registers={data.registers} />
            <RetailCashCloseForm cashSessions={data.cashSessions} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Cash sessions</CardTitle>
              <CardDescription>Register opening, closing, and variance records.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={cashSessionColumns}
                data={cashSessionRows(data.cashSessions)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "expenses" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <RetailExpenseForm outlets={data.outlets} profile={profile} />
            <RetailExpenseStatusForm expenses={data.expenses} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Outlet expenses</CardTitle>
              <CardDescription>Submitted expenses and finance review status.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={expenseColumns}
                data={expenseRows(data.expenses)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {route === "prices" ? (
        <>
          <RetailPriceRuleForm
            items={data.items}
            brands={data.brands}
            origins={data.origins}
            outlets={data.outlets}
            profile={profile}
          />
          <Card>
            <CardHeader>
              <CardTitle>Price list</CardTitle>
              <CardDescription>Active retail prices by item and outlet.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={priceColumns} data={priceRows(data.priceRules)} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
