"use client"

import { Banknote, Receipt, Save } from "lucide-react"
import { useActionState, type ReactNode } from "react"

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
import { Textarea } from "@/components/ui/textarea"
import {
  closeRetailCashSessionAction,
  completeRetailCleaningTaskAction,
  createRetailCleaningTaskAction,
  createRetailExpenseAction,
  createRetailProcessingBatchAction,
  createRetailSaleAction,
  openRetailCashSessionAction,
  recordRetailDailySaleAction,
  recordRetailPaymentAction,
  reviewRetailProcessingBatchAction,
  submitRetailDailyClosingAction,
  updateRetailExpenseStatusAction,
  upsertRetailPriceRuleAction,
} from "@/lib/retail/actions"
import type { CurrentProfile } from "@/lib/auth/types"
import {
  initialRetailActionState,
  type RetailActionState,
} from "@/lib/retail/action-state"
import {
  retailCleaningFrequencies,
  retailCleaningStatuses,
  retailExpenseStatuses,
  retailPaymentMethods,
  retailPaymentStatuses,
  retailProcessingStatuses,
  type RetailBrand,
  type RetailCashSession,
  type RetailCleaningTask,
  type RetailDepartment,
  type RetailExpense,
  type RetailItem,
  type RetailNoBarcodeStock,
  type RetailOrigin,
  type RetailOutlet,
  type RetailPriceRule,
  type RetailPerson,
  type RetailProcessingBatch,
  type RetailRegister,
  type RetailSale,
  type RetailStockLocation,
  type RetailStockUnit,
} from "@/lib/retail/types"

type StatefulAction = (
  state: RetailActionState,
  formData: FormData
) => Promise<RetailActionState>

function ActionMessage({ state }: { state: RetailActionState }) {
  if (!state.message) {
    return null
  }

  return (
    <div
      className={
        state.status === "success"
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      }
    >
      {state.message}
    </div>
  )
}

function NativeSelect({
  id,
  name,
  children,
  required = true,
}: {
  id: string
  name: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <select
      id={id}
      name={name}
      required={required}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {children}
    </select>
  )
}

function SubmitButton({
  pending,
  children,
  icon = "save",
}: {
  pending: boolean
  children: ReactNode
  icon?: "save" | "receipt" | "cash"
}) {
  const Icon = icon === "receipt" ? Receipt : icon === "cash" ? Banknote : Save

  return (
    <Button type="submit" disabled={pending}>
      <Icon className="size-4" />
      {pending ? "Saving..." : children}
    </Button>
  )
}

function WorkflowCard({
  title,
  description,
  action,
  children,
  submitLabel,
  submitIcon,
}: {
  title: string
  description: string
  action: StatefulAction
  children: ReactNode
  submitLabel: string
  submitIcon?: "save" | "receipt" | "cash"
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialRetailActionState
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {children}
          <ActionMessage state={state} />
          <SubmitButton pending={pending} icon={submitIcon}>
            {submitLabel}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

function RegisterSelect({ registers }: { registers: RetailRegister[] }) {
  return (
    <NativeSelect id="registerId" name="registerId">
      <option value="">Select register</option>
      {registers.map((register) => (
        <option key={register.id} value={register.id}>
          {register.registerName} - {register.stockLocationName}
        </option>
      ))}
    </NativeSelect>
  )
}

function CashSessionSelect({
  sessions,
  required = false,
}: {
  sessions: RetailCashSession[]
  required?: boolean
}) {
  const openSessions = sessions.filter((session) => session.status === "OPEN")

  return (
    <NativeSelect id="cashSessionId" name="cashSessionId" required={required}>
      <option value="">No cash session</option>
      {openSessions.map((session) => (
        <option key={session.id} value={session.id}>
          {session.registerName} - opened {new Date(session.openedAt).toLocaleString()}
        </option>
      ))}
    </NativeSelect>
  )
}

function ItemSelect({ items }: { items: RetailItem[] }) {
  return (
    <NativeSelect id="itemId" name="itemId">
      <option value="">Select item</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </NativeSelect>
  )
}

function BrandSelect({ brands }: { brands: RetailBrand[] }) {
  return (
    <NativeSelect id="brandId" name="brandId" required={false}>
      <option value="">No brand</option>
      {brands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function OriginSelect({ origins }: { origins: RetailOrigin[] }) {
  return (
    <NativeSelect id="originId" name="originId" required={false}>
      <option value="">No origin</option>
      {origins.map((origin) => (
        <option key={origin.id} value={origin.id}>
          {origin.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function OutletSelect({ outlets }: { outlets: RetailOutlet[] }) {
  return (
    <NativeSelect id="outletId" name="outletId" required={false}>
      <option value="">All outlets</option>
      {outlets.map((outlet) => (
        <option key={outlet.id} value={outlet.id}>
          {outlet.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function canChooseScope(profile: CurrentProfile) {
  return profile.roles.includes("admin") || profile.roles.includes("director")
}

function ScopeDisplay({ label }: { label: string }) {
  return (
    <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function OutletScopeField({
  profile,
  outlets,
}: {
  profile: CurrentProfile
  outlets: RetailOutlet[]
}) {
  if (canChooseScope(profile)) {
    return (
      <div className="space-y-2">
        <Label htmlFor="outletId">Outlet</Label>
        <OutletSelect outlets={outlets} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Viewing outlet</Label>
      <input type="hidden" name="outletId" value={profile.outletId ?? ""} />
      <ScopeDisplay label={profile.outletName ?? "Assigned outlet"} />
    </div>
  )
}

function DepartmentSelect({
  departments,
}: {
  departments: RetailDepartment[]
}) {
  return (
    <NativeSelect id="departmentId" name="departmentId" required={false}>
      <option value="">No department</option>
      {departments.map((department) => (
        <option key={department.id} value={department.id}>
          {department.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function DepartmentScopeField({
  profile,
  departments,
}: {
  profile: CurrentProfile
  departments: RetailDepartment[]
}) {
  if (canChooseScope(profile)) {
    return (
      <div className="space-y-2">
        <Label htmlFor="departmentId">Department</Label>
        <DepartmentSelect departments={departments} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Viewing department</Label>
      <input
        type="hidden"
        name="departmentId"
        value={profile.departmentId ?? ""}
      />
      <ScopeDisplay label={profile.departmentName ?? "Assigned department"} />
    </div>
  )
}

function PersonSelect({ people }: { people: RetailPerson[] }) {
  return (
    <NativeSelect id="assignedTo" name="assignedTo" required={false}>
      <option value="">No assignee</option>
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {person.fullName}
        </option>
      ))}
    </NativeSelect>
  )
}

function StockLocationSelect({
  locations,
}: {
  locations: RetailStockLocation[]
}) {
  return (
    <NativeSelect id="stockLocationId" name="stockLocationId">
      <option value="">Select location</option>
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function StockUnitSelect({ stockUnits }: { stockUnits: RetailStockUnit[] }) {
  return (
    <NativeSelect id="stockUnitId" name="stockUnitId" required={false}>
      <option value="">No barcode unit</option>
      {stockUnits.map((unit) => (
        <option key={unit.id} value={unit.id}>
          {unit.barcode} - {unit.itemLabel} - {unit.netWeightKg} kg
        </option>
      ))}
    </NativeSelect>
  )
}

function NoBarcodeStockSelect({
  stock,
}: {
  stock: RetailNoBarcodeStock[]
}) {
  return (
    <NativeSelect id="noBarcodeStockId" name="noBarcodeStockId" required={false}>
      <option value="">No no-barcode stock</option>
      {stock.map((row) => (
        <option key={row.id} value={row.id}>
          {row.itemLabel} - {row.brandName} - {row.originName} -{" "}
          {row.locationName} - {row.quantity} qty / {row.weightKg} kg
        </option>
      ))}
    </NativeSelect>
  )
}

function CleaningTaskSelect({ tasks }: { tasks: RetailCleaningTask[] }) {
  return (
    <NativeSelect id="taskId" name="taskId">
      <option value="">Select task</option>
      {tasks.map((task) => (
        <option key={task.id} value={task.id}>
          {task.taskName} - {task.outletName} - {task.dueDate}
        </option>
      ))}
    </NativeSelect>
  )
}

function ExpenseSelect({ expenses }: { expenses: RetailExpense[] }) {
  return (
    <NativeSelect id="expenseId" name="expenseId">
      <option value="">Select expense</option>
      {expenses.map((expense) => (
        <option key={expense.id} value={expense.id}>
          {expense.expenseDate} - {expense.category} - RM{" "}
          {expense.amount.toFixed(2)}
        </option>
      ))}
    </NativeSelect>
  )
}

function SaleSelect({ sales }: { sales: RetailSale[] }) {
  return (
    <NativeSelect id="saleId" name="saleId">
      <option value="">Select sale</option>
      {sales.map((sale) => (
        <option key={sale.id} value={sale.id}>
          {sale.saleNo} - {sale.customerName} - RM {sale.totalAmount.toFixed(2)}
        </option>
      ))}
    </NativeSelect>
  )
}

export function RetailSaleForm({
  registers,
  cashSessions,
  items,
  brands,
  origins,
  stockLocations,
  stockUnits,
  noBarcodeStock,
}: {
  registers: RetailRegister[]
  cashSessions: RetailCashSession[]
  items: RetailItem[]
  brands: RetailBrand[]
  origins: RetailOrigin[]
  stockLocations: RetailStockLocation[]
  stockUnits: RetailStockUnit[]
  noBarcodeStock: RetailNoBarcodeStock[]
}) {
  return (
    <WorkflowCard
      title="POS sale"
      description="Record one retail sale line and payment."
      action={createRetailSaleAction}
      submitLabel="Complete sale"
      submitIcon="receipt"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="registerId">Register</Label>
          <RegisterSelect registers={registers} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cashSessionId">Cash session</Label>
          <CashSessionSelect sessions={cashSessions} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer name</Label>
          <Input id="customerName" name="customerName" placeholder="Walk-in Customer" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Customer phone</Label>
          <Input id="customerPhone" name="customerPhone" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stockUnitId">Barcode stock</Label>
          <StockUnitSelect stockUnits={stockUnits} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="noBarcodeStockId">No-barcode stock</Label>
          <NoBarcodeStockSelect stock={noBarcodeStock} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="itemId">Item</Label>
          <ItemSelect items={items} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stockLocationId">Stock location</Label>
          <StockLocationSelect locations={stockLocations} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandId">Brand</Label>
          <BrandSelect brands={brands} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="originId">Origin</Label>
          <OriginSelect origins={origins} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" min="0" step="0.001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weightKg">Weight kg</Label>
          <Input id="weightKg" name="weightKg" type="number" min="0" step="0.001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Unit price</Label>
          <Input id="unitPrice" name="unitPrice" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lineDiscount">Line discount</Label>
          <Input
            id="lineDiscount"
            name="lineDiscount"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discountAmount">Sale discount</Label>
          <Input
            id="discountAmount"
            name="discountAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxAmount">Tax</Label>
          <Input
            id="taxAmount"
            name="taxAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment method</Label>
          <NativeSelect id="paymentMethod" name="paymentMethod">
            {retailPaymentMethods.map((method) => (
              <option key={method} value={method}>
                {method.replace("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentAmount">Payment amount</Label>
          <Input
            id="paymentAmount"
            name="paymentAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNo">Reference no.</Label>
          <Input id="referenceNo" name="referenceNo" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function RetailDailySaleForm({
  outlets,
  profile,
}: {
  outlets: RetailOutlet[]
  profile: CurrentProfile
}) {
  return (
    <WorkflowCard
      title="Record daily sales"
      description="Record daily sales totals by payment type."
      action={recordRetailDailySaleAction}
      submitLabel="Save daily sales"
      submitIcon="receipt"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <OutletScopeField profile={profile} outlets={outlets} />
        <div className="space-y-2">
          <Label htmlFor="salesDate">Sales date</Label>
          <Input id="salesDate" name="salesDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentCode">Payment type</Label>
          <NativeSelect id="paymentCode" name="paymentCode">
            {retailPaymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="grossSales">Gross sales</Label>
          <Input id="grossSales" name="grossSales" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discountAmount">Discount</Label>
          <Input id="discountAmount" name="discountAmount" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cashReceived">Cash received</Label>
          <Input id="cashReceived" name="cashReceived" type="number" min="0" step="0.01" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dailySaleNotes">Notes</Label>
        <Textarea id="dailySaleNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function RetailDailyClosingForm({
  outlets,
  profile,
}: {
  outlets: RetailOutlet[]
  profile: CurrentProfile
}) {
  return (
    <WorkflowCard
      title="Daily closing"
      description="Submit or approve outlet daily closing."
      action={submitRetailDailyClosingAction}
      submitLabel="Save closing"
      submitIcon="cash"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <OutletScopeField profile={profile} outlets={outlets} />
        <div className="space-y-2">
          <Label htmlFor="closingDate">Closing date</Label>
          <Input id="closingDate" name="closingDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalSales">Total sales</Label>
          <Input id="totalSales" name="totalSales" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closingCashReceived">Cash received</Label>
          <Input id="closingCashReceived" name="cashReceived" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expensesAmount">Expenses</Label>
          <Input id="expensesAmount" name="expensesAmount" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dailyClosingCash">Closing cash</Label>
          <Input id="dailyClosingCash" name="closingCash" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="varianceAmount">Variance</Label>
          <Input id="varianceAmount" name="varianceAmount" type="number" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dailyClosingStatus">Status</Label>
          <NativeSelect id="dailyClosingStatus" name="status">
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dailyClosingNotes">Notes</Label>
        <Textarea id="dailyClosingNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function RetailPaymentForm({ sales }: { sales: RetailSale[] }) {
  return (
    <WorkflowCard
      title="Record payment"
      description="Add payment against an existing retail sale."
      action={recordRetailPaymentAction}
      submitLabel="Save payment"
      submitIcon="cash"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="saleId">Sale</Label>
          <SaleSelect sales={sales} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment method</Label>
          <NativeSelect id="paymentMethod" name="paymentMethod">
            {retailPaymentMethods.map((method) => (
              <option key={method} value={method}>
                {method.replace("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment status</Label>
          <NativeSelect id="paymentStatus" name="paymentStatus">
            {retailPaymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" name="amount" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNo">Reference no.</Label>
          <Input id="referenceNo" name="referenceNo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentNotes">Notes</Label>
          <Input id="paymentNotes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function RetailProcessingBatchForm({
  outlets,
  stockLocations,
  items,
  brands,
  origins,
  profile,
}: {
  outlets: RetailOutlet[]
  stockLocations: RetailStockLocation[]
  items: RetailItem[]
  brands: RetailBrand[]
  origins: RetailOrigin[]
  profile: CurrentProfile
}) {
  return (
    <WorkflowCard
      title="Processing batch"
      description="Record raw material, finished product, yield, and loss."
      action={createRetailProcessingBatchAction}
      submitLabel="Save batch"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <OutletScopeField profile={profile} outlets={outlets} />
        <div className="space-y-2">
          <Label htmlFor="stockLocationId">Stock location</Label>
          <StockLocationSelect locations={stockLocations} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rawItemId">Raw item</Label>
          <NativeSelect id="rawItemId" name="rawItemId">
            <option value="">Select raw item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="finishedItemId">Finished item</Label>
          <NativeSelect id="finishedItemId" name="finishedItemId">
            <option value="">Select finished item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rawBrandId">Raw brand</Label>
          <NativeSelect id="rawBrandId" name="rawBrandId" required={false}>
            <option value="">No brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="finishedBrandId">Finished brand</Label>
          <NativeSelect id="finishedBrandId" name="finishedBrandId" required={false}>
            <option value="">No brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rawOriginId">Raw origin</Label>
          <NativeSelect id="rawOriginId" name="rawOriginId" required={false}>
            <option value="">No origin</option>
            {origins.map((origin) => (
              <option key={origin.id} value={origin.id}>
                {origin.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="finishedOriginId">Finished origin</Label>
          <NativeSelect
            id="finishedOriginId"
            name="finishedOriginId"
            required={false}
          >
            <option value="">No origin</option>
            {origins.map((origin) => (
              <option key={origin.id} value={origin.id}>
                {origin.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rawQuantity">Raw quantity</Label>
          <Input
            id="rawQuantity"
            name="rawQuantity"
            type="number"
            min="0"
            step="0.001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finishedQuantity">Finished quantity</Label>
          <Input
            id="finishedQuantity"
            name="finishedQuantity"
            type="number"
            min="0"
            step="0.001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rawWeightKg">Raw kg</Label>
          <Input
            id="rawWeightKg"
            name="rawWeightKg"
            type="number"
            min="0"
            step="0.001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finishedWeightKg">Finished kg</Label>
          <Input
            id="finishedWeightKg"
            name="finishedWeightKg"
            type="number"
            min="0"
            step="0.001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status">
            {retailProcessingStatuses
              .filter((status) => status === "OPEN" || status === "COMPLETED")
              .map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="processingNotes">Notes</Label>
          <Textarea id="processingNotes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function RetailProcessingReviewForm({
  batches,
}: {
  batches: RetailProcessingBatch[]
}) {
  const reviewable = batches.filter((batch) => batch.status === "COMPLETED")

  return (
    <WorkflowCard
      title="Review processing batch"
      description="Processing manager review for completed batches."
      action={reviewRetailProcessingBatchAction}
      submitLabel="Save review"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="batchId">Batch</Label>
          <NativeSelect id="batchId" name="batchId">
            <option value="">Select batch</option>
            {reviewable.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.batchNo} - {batch.yieldPercent.toFixed(2)}%
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="processingReviewStatus">Decision</Label>
          <NativeSelect id="processingReviewStatus" name="status">
            <option value="REVIEWED">REVIEWED</option>
            <option value="CANCELLED">CANCELLED</option>
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="processingReviewNotes">Notes</Label>
        <Textarea id="processingReviewNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function RetailCleaningTaskForm({
  outlets,
  departments,
  people,
  profile,
}: {
  outlets: RetailOutlet[]
  departments: RetailDepartment[]
  people: RetailPerson[]
  profile: CurrentProfile
}) {
  return (
    <WorkflowCard
      title="Cleaning task"
      description="Schedule recurring cleaning work by outlet and department."
      action={createRetailCleaningTaskAction}
      submitLabel="Save task"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <OutletScopeField profile={profile} outlets={outlets} />
        <DepartmentScopeField profile={profile} departments={departments} />
        <div className="space-y-2">
          <Label htmlFor="taskName">Task</Label>
          <Input id="taskName" name="taskName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <NativeSelect id="frequency" name="frequency">
            {retailCleaningFrequencies.map((frequency) => (
              <option key={frequency} value={frequency}>
                {frequency}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigned to</Label>
          <PersonSelect people={people} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cleaningNotes">Notes</Label>
          <Textarea id="cleaningNotes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function RetailCleaningUpdateForm({
  tasks,
}: {
  tasks: RetailCleaningTask[]
}) {
  const activeTasks = tasks.filter((task) => task.status !== "DONE")

  return (
    <WorkflowCard
      title="Update cleaning"
      description="Mark cleaning tasks done or missed."
      action={completeRetailCleaningTaskAction}
      submitLabel="Update task"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="taskId">Task</Label>
          <CleaningTaskSelect tasks={activeTasks} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status">
            {retailCleaningStatuses
              .filter((status) => status === "DONE" || status === "MISSED")
              .map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="updateCleaningNotes">Notes</Label>
        <Textarea id="updateCleaningNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function RetailExpenseForm({
  outlets,
  profile,
}: {
  outlets: RetailOutlet[]
  profile: CurrentProfile
}) {
  return (
    <WorkflowCard
      title="Outlet expense"
      description="Record outlet expenses for account review."
      action={createRetailExpenseAction}
      submitLabel="Submit expense"
      submitIcon="cash"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <OutletScopeField profile={profile} outlets={outlets} />
        <div className="space-y-2">
          <Label htmlFor="expenseDate">Expense date</Label>
          <Input id="expenseDate" name="expenseDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" placeholder="Cleaning Supplies" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input id="vendor" name="vendor" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" name="amount" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment method</Label>
          <NativeSelect id="paymentMethod" name="paymentMethod">
            {retailPaymentMethods.map((method) => (
              <option key={method} value={method}>
                {method.replace("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="receiptUrl">Receipt image path</Label>
          <Input
            id="receiptUrl"
            name="receiptUrl"
            placeholder="receipts/jalan-channel/2026-06-11-cleaning.jpg"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="expenseNotes">Notes</Label>
          <Textarea id="expenseNotes" name="notes" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function RetailExpenseStatusForm({
  expenses,
}: {
  expenses: RetailExpense[]
}) {
  return (
    <WorkflowCard
      title="Expense review"
      description="Review, approve, reject, or mark outlet expenses paid."
      action={updateRetailExpenseStatusAction}
      submitLabel="Update expense"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expenseId">Expense</Label>
          <ExpenseSelect expenses={expenses} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status">
            {retailExpenseStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expenseReviewNotes">Notes</Label>
        <Textarea id="expenseReviewNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function RetailCashOpenForm({
  registers,
}: {
  registers: RetailRegister[]
}) {
  return (
    <WorkflowCard
      title="Open cash session"
      description="Start counter cash tracking with an opening float."
      action={openRetailCashSessionAction}
      submitLabel="Open session"
      submitIcon="cash"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="openRegisterId">Register</Label>
          <RegisterSelect registers={registers} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="openingFloat">Opening float</Label>
          <Input
            id="openingFloat"
            name="openingFloat"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="openNotes">Notes</Label>
        <Textarea id="openNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function RetailCashCloseForm({
  cashSessions,
}: {
  cashSessions: RetailCashSession[]
}) {
  const openSessions = cashSessions.filter((session) => session.status === "OPEN")

  return (
    <WorkflowCard
      title="Close cash session"
      description="Close the register and calculate the cash variance."
      action={closeRetailCashSessionAction}
      submitLabel="Close session"
      submitIcon="cash"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sessionId">Open session</Label>
          <NativeSelect id="sessionId" name="sessionId">
            <option value="">Select session</option>
            {openSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.registerName} - expected RM{" "}
                {session.expectedCash.toFixed(2)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="closingCash">Closing cash</Label>
          <Input
            id="closingCash"
            name="closingCash"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="closeNotes">Notes</Label>
        <Textarea id="closeNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function RetailPriceRuleForm({
  items,
  brands,
  origins,
  outlets,
  profile,
}: {
  items: RetailItem[]
  brands: RetailBrand[]
  origins: RetailOrigin[]
  outlets: RetailOutlet[]
  profile: CurrentProfile
}) {
  return (
    <WorkflowCard
      title="Price rule"
      description="Set outlet-level retail price for an item, brand, and origin."
      action={upsertRetailPriceRuleAction}
      submitLabel="Save price"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="itemId">Item</Label>
          <ItemSelect items={items} />
        </div>
        <OutletScopeField profile={profile} outlets={outlets} />
        <div className="space-y-2">
          <Label htmlFor="brandId">Brand</Label>
          <BrandSelect brands={brands} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="originId">Origin</Label>
          <OriginSelect origins={origins} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Unit price</Label>
          <Input id="unitPrice" name="unitPrice" type="number" min="0" step="0.01" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveFrom">Effective from</Label>
          <Input
            id="effectiveFrom"
            name="effectiveFrom"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveTo">Effective to</Label>
          <Input id="effectiveTo" name="effectiveTo" type="date" />
        </div>
      </div>
    </WorkflowCard>
  )
}

export function RetailPriceHint({
  priceRules,
}: {
  priceRules: RetailPriceRule[]
}) {
  if (priceRules.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      Latest price: {priceRules[0].itemLabel} at RM{" "}
      {priceRules[0].unitPrice.toFixed(2)}
    </div>
  )
}
