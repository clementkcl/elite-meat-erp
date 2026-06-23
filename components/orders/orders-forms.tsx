"use client"

import { Check, Plus, Save, ScanLine, Search, X } from "lucide-react"
import { useActionState, useMemo, useState, type ReactNode } from "react"

import {
  cancelCustomerOrderAction,
  createCustomerOrderAction,
  createOrderDeliveryAction,
  editCustomerOrderBeforePickingAction,
  manualPickWeightAction,
  markCustomerOrderReadyAction,
  markPickupCompletedAction,
  pickOrderBarcodeAction,
  quickAddCustomerAction,
  updateCustomerOrderDeliveryStatusAction,
  uploadCustomerOrderProofAction,
} from "@/lib/orders/actions"
import {
  initialOrdersActionState,
  type OrdersActionState,
} from "@/lib/orders/action-state"
import {
  manualPickReasons,
  type CustomerOption,
  type CustomerOrder,
  type CustomerOrderItem,
  type OrderScopeOption,
  type OrderStockLocationOption,
  type OrderUnit,
  type StockItemOption,
} from "@/lib/orders/types"
import type { CurrentProfile } from "@/lib/auth/types"
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
import { Textarea } from "@/components/ui/textarea"

type StatefulAction = (
  state: OrdersActionState,
  formData: FormData
) => Promise<OrdersActionState>

type DraftLine = {
  key: string
  itemId: string
  orderingUnit: OrderUnit
  requestedQuantity: string
  estimatedWeightKg: string
  processingRequired: boolean
  remarks: string
}

function ActionMessage({ state }: { state: OrdersActionState }) {
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
  defaultValue,
  value,
  onChange,
  required = true,
  disabled = false,
}: {
  id: string
  name: string
  children: ReactNode
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  required?: boolean
  disabled?: boolean
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      required={required}
      disabled={disabled}
      className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
    >
      {children}
    </select>
  )
}

function SubmitButton({
  pending,
  disabled = false,
  children,
}: {
  pending: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Button type="submit" disabled={pending || disabled} className="min-h-11">
      <Save className="size-4" />
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
  submitDisabled = false,
}: {
  title: string
  description: string
  action: StatefulAction
  children: ReactNode
  submitLabel: string
  submitDisabled?: boolean
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialOrdersActionState
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {children}
          <ActionMessage state={state} />
          <SubmitButton pending={pending} disabled={submitDisabled}>
            {submitLabel}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

function canChooseOrderScope(profile: CurrentProfile) {
  return profile.roles.includes("admin") || profile.roles.includes("director")
}

function nowForInput() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function emptyLine(stockItems: StockItemOption[]): DraftLine {
  const first = stockItems[0]

  return lineForItem(first)
}

function lineForItem(item: StockItemOption | undefined): DraftLine {
  return {
    key: crypto.randomUUID(),
    itemId: item?.id ?? "",
    orderingUnit: item?.orderUnit ?? "KG",
    requestedQuantity: "",
    estimatedWeightKg: "",
    processingRequired: item?.processingRequiredDefault ?? false,
    remarks: "",
  }
}

function linePayload(lines: DraftLine[]) {
  return JSON.stringify(
    lines.map((line) => ({
      itemId: line.itemId,
      orderingUnit: line.orderingUnit,
      requestedQuantity: Number(line.requestedQuantity) || 0,
      estimatedWeightKg: Number(line.estimatedWeightKg) || 0,
      processingRequired: line.processingRequired,
      remarks: line.remarks,
    }))
  )
}

function itemById(items: StockItemOption[], itemId: string) {
  return items.find((item) => item.id === itemId)
}

export function CreateOrderForm({
  profile,
  customers,
  stockItems,
  scopeOptions,
}: {
  profile: CurrentProfile
  customers: CustomerOption[]
  stockItems: StockItemOption[]
  scopeOptions: {
    outlets: OrderScopeOption[]
    departments: OrderScopeOption[]
    stockLocations: OrderStockLocationOption[]
  }
}) {
  const [state, formAction, pending] = useActionState(
    createCustomerOrderAction,
    initialOrdersActionState
  )
  const canChooseScope = canChooseOrderScope(profile)
  const [fulfillmentType, setFulfillmentType] =
    useState<CustomerOrder["fulfillmentType"]>("PICKUP")
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "")
  const [deliveryAddress, setDeliveryAddress] = useState(customers[0]?.address ?? "")
  const [customerRemarks, setCustomerRemarks] = useState(customers[0]?.remarks ?? "")
  const [itemCategory, setItemCategory] = useState("ALL")
  const [itemSearch, setItemSearch] = useState("")
  const [lines, setLines] = useState<DraftLine[]>(() => [emptyLine(stockItems)])
  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const categories = Array.from(new Set(stockItems.map((item) => item.category)))
  const recentItems = stockItems.slice(0, 6)
  const visibleCustomers = customers.filter((customer) => {
    const query = customerSearch.trim().toLowerCase()

    return (
      !query ||
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query)
    )
  })
  const visibleItems = stockItems.filter((item) => {
    const query = itemSearch.trim().toLowerCase()
    const matchesCategory = itemCategory === "ALL" || item.category === itemCategory
    const matchesSearch =
      !query ||
      item.label.toLowerCase().includes(query) ||
      item.itemCode.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query)

    return matchesCategory && matchesSearch
  })
  const hasInvalidLine = lines.some(
    (line) =>
      !line.itemId ||
      Number(line.estimatedWeightKg) <= 0 ||
      (line.orderingUnit !== "KG" && Number(line.requestedQuantity) <= 0)
  )
  const submitDisabled =
    stockItems.length === 0 ||
    hasInvalidLine ||
    (fulfillmentType === "DELIVERY" && deliveryAddress.trim().length === 0) ||
    (canChooseScope && scopeOptions.outlets.length === 0)

  function selectCustomer(nextCustomerId: string) {
    const nextCustomer = customers.find((customer) => customer.id === nextCustomerId)

    setCustomerId(nextCustomerId)
    setDeliveryAddress(nextCustomer?.address ?? "")
    setCustomerRemarks(nextCustomer?.remarks ?? "")
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) {
          return line
        }

        const next = { ...line, ...patch }

        if (patch.itemId) {
          const item = itemById(stockItems, patch.itemId)
          next.orderingUnit = item?.orderUnit ?? next.orderingUnit
          next.processingRequired =
            item?.processingRequiredDefault ?? next.processingRequired
        }

        return next
      })
    )
  }

  function addRecentItem(item: StockItemOption) {
    setLines((current) => {
      const firstBlankIndex = current.findIndex(
        (line) =>
          !line.itemId &&
          !line.requestedQuantity &&
          !line.estimatedWeightKg &&
          !line.remarks
      )
      const nextLine = lineForItem(item)

      if (firstBlankIndex === -1) {
        return [...current, nextLine]
      }

      return current.map((line, index) =>
        index === firstBlankIndex ? nextLine : line
      )
    })
  }

  const requiredDateTimeLabel =
    fulfillmentType === "PICKUP"
      ? "Pickup date/time"
      : fulfillmentType === "DELIVERY"
        ? "Delivery date/time"
        : "Required date/time"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create order</CardTitle>
        <CardDescription>Manual ERP source, confirmed on save.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="itemsJson" value={linePayload(lines)} />
          <input type="hidden" name="customerId" value={customerId} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fulfillmentType">Order type</Label>
              <NativeSelect
                id="fulfillmentType"
                name="fulfillmentType"
                value={fulfillmentType}
                onChange={(value) =>
                  setFulfillmentType(value as CustomerOrder["fulfillmentType"])
                }
              >
                <option value="PICKUP">Pickup</option>
                <option value="DELIVERY">Delivery</option>
                <option value="INTERNAL_TRANSFER">Internal transfer</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">{requiredDateTimeLabel}</Label>
              <Input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                defaultValue={nowForInput()}
                required
                className="min-h-11 text-base md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalOrderPrice">Total price</Label>
              <Input
                id="totalOrderPrice"
                name="totalOrderPrice"
                type="number"
                min="0"
                step="0.01"
                required
                className="min-h-11 text-base md:text-sm"
              />
            </div>
          </div>

          {canChooseScope ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="outletId">Outlet</Label>
                <NativeSelect id="outletId" name="outletId">
                  <option value="">Select outlet</option>
                  {scopeOptions.outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentId">Department</Label>
                <NativeSelect id="departmentId" name="departmentId" required={false}>
                  <option value="">No department</option>
                  {scopeOptions.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          ) : (
            <>
              <input type="hidden" name="outletId" value={profile.outletId ?? ""} />
              <input
                type="hidden"
                name="departmentId"
                value={profile.departmentId ?? ""}
              />
            </>
          )}

          {fulfillmentType !== "INTERNAL_TRANSFER" ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                <Label htmlFor="customerSearch">Customer</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="customerSearch"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Search name or phone"
                    className="min-h-11 pl-9 text-base md:text-sm"
                  />
                </div>
                <NativeSelect
                  id="customerPicker"
                  name="customerPicker"
                  value={customerId}
                  onChange={selectCustomer}
                  required={false}
                >
                  <option value="">Quick add below</option>
                  {visibleCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </NativeSelect>
                {selectedCustomer?.hasOverdueCredit ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Credit overdue warning. Order is not blocked.
                  </div>
                ) : null}
                {customerSearch && visibleCustomers.length === 0 ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    No matching customer. Quick add with name and phone.
                  </div>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newCustomerName">Quick add name</Label>
                  <Input
                    id="newCustomerName"
                    name="newCustomerName"
                    required={!customerId}
                    disabled={Boolean(customerId)}
                    className="min-h-11 text-base md:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newCustomerPhone">Quick add phone</Label>
                  <Input
                    id="newCustomerPhone"
                    name="newCustomerPhone"
                    required={!customerId}
                    disabled={Boolean(customerId)}
                    className="min-h-11 text-base md:text-sm"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {fulfillmentType === "PICKUP" ? (
              <div className="space-y-2">
                <Label htmlFor="pickupLocationId">Pickup location</Label>
                <NativeSelect
                  id="pickupLocationId"
                  name="pickupLocationId"
                  defaultValue={profile.stockLocationId ?? ""}
                >
                  <option value="">Select pickup location</option>
                  {scopeOptions.stockLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
            {fulfillmentType === "DELIVERY" ? (
              <>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="deliveryAddress">Delivery address</Label>
                  <Input
                    id="deliveryAddress"
                    name="deliveryAddress"
                    value={deliveryAddress}
                    onChange={(event) => setDeliveryAddress(event.target.value)}
                    required
                    className="min-h-11 text-base md:text-sm"
                  />
                </div>
              </>
            ) : null}
            {fulfillmentType === "INTERNAL_TRANSFER" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fromLocationId">From location</Label>
                  <NativeSelect id="fromLocationId" name="fromLocationId">
                    <option value="">Select source</option>
                    {scopeOptions.stockLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toLocationId">To location</Label>
                  <NativeSelect id="toLocationId" name="toLocationId">
                    <option value="">Select destination</option>
                    {scopeOptions.stockLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Items</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recentItems.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addRecentItem(item)}
                    >
                      {item.itemCode || item.name}
                    </Button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant={itemCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setItemCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={itemCategory === "ALL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setItemCategory("ALL")}
                  >
                    All
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setLines((current) => [...current, emptyLine(visibleItems)])}
              >
                <Plus className="size-4" />
                Add item
              </Button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="itemSearch"
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
                placeholder="Search item code or name"
                className="min-h-11 pl-9 text-base md:text-sm"
              />
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => {
                const selectedItem = itemById(stockItems, line.itemId)
                const selectedItemVisible = visibleItems.some(
                  (item) => item.id === selectedItem?.id
                )
                const unitLabel = line.orderingUnit.replaceAll("_", " ")

                return (
                  <div key={line.key} className="rounded-md border p-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto]">
                      <div className="space-y-2">
                        <Label htmlFor={`lineItem${line.key}`}>Item {index + 1}</Label>
                        <NativeSelect
                          id={`lineItem${line.key}`}
                          name={`lineItem${line.key}`}
                          value={line.itemId}
                          onChange={(value) => updateLine(line.key, { itemId: value })}
                        >
                          <option value="">Select item</option>
                          {selectedItem && !selectedItemVisible ? (
                            <option value={selectedItem.id}>
                              {selectedItem.label}
                            </option>
                          ) : null}
                          {visibleItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input
                          value={line.orderingUnit.replaceAll("_", " ")}
                          readOnly
                          className="min-h-11 text-base md:text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`quantity${line.key}`}>
                          {line.orderingUnit === "KG" ? "Quantity" : `${unitLabel} quantity`}
                        </Label>
                        <Input
                          id={`quantity${line.key}`}
                          type="number"
                          min="0"
                          step="0.001"
                          required={line.orderingUnit !== "KG"}
                          value={line.requestedQuantity}
                          onChange={(event) =>
                            updateLine(line.key, {
                              requestedQuantity: event.target.value,
                            })
                          }
                          className="min-h-11 text-base md:text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`weight${line.key}`}>Estimated kg</Label>
                        <Input
                          id={`weight${line.key}`}
                          type="number"
                          min="0"
                          step="0.001"
                          required
                          value={line.estimatedWeightKg}
                          onChange={(event) =>
                            updateLine(line.key, {
                              estimatedWeightKg: event.target.value,
                            })
                          }
                          className="min-h-11 text-base md:text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="mt-7 min-h-11 min-w-11"
                        aria-label="Remove item"
                        onClick={() =>
                          setLines((current) =>
                            current.length === 1
                              ? [emptyLine(stockItems)]
                              : current.filter((candidate) => candidate.key !== line.key)
                          )
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                      <Input
                        aria-label="Item remarks"
                        placeholder="Item remarks"
                        value={line.remarks}
                        onChange={(event) =>
                          updateLine(line.key, { remarks: event.target.value })
                        }
                        className="min-h-11 text-base md:text-sm"
                      />
                      <label className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm">
                        <input
                          type="checkbox"
                          checked={line.processingRequired}
                          onChange={(event) =>
                            updateLine(line.key, {
                              processingRequired: event.target.checked,
                            })
                          }
                        />
                        Processing required
                      </label>
                    </div>
                    {selectedItem?.requiresEstimatedKg &&
                    Number(line.estimatedWeightKg) <= 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Estimated kg is needed for stock reservation.
                      </p>
                    ) : null}
                    {line.orderingUnit !== "KG" &&
                    Number(line.requestedQuantity) <= 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Enter quantity plus estimated kg for this unit.
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerRemarks">Customer remarks</Label>
              <Textarea
                id="customerRemarks"
                name="customerRemarks"
                value={customerRemarks}
                onChange={(event) => setCustomerRemarks(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Staff remarks</Label>
              <Textarea id="remarks" name="remarks" />
            </div>
          </div>

          <ActionMessage state={state} />
          <Button type="submit" disabled={pending || submitDisabled} className="min-h-12 w-full sm:w-auto">
            <Check className="size-4" />
            {pending ? "Creating..." : "Create confirmed order"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function QuickCustomerForm({
  profile,
  outlets,
}: {
  profile: CurrentProfile
  outlets: OrderScopeOption[]
}) {
  const canChooseScope = canChooseOrderScope(profile)

  return (
    <WorkflowCard
      title="Quick add customer"
      description="Name and phone are required."
      action={quickAddCustomerAction}
      submitLabel="Save customer"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Name</Label>
          <Input id="customerName" name="name" required className="min-h-11 text-base md:text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Phone</Label>
          <Input id="customerPhone" name="phone" required className="min-h-11 text-base md:text-sm" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="customerAddress">Address</Label>
          <Textarea id="customerAddress" name="address" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="customerRemarksInput">Remarks</Label>
          <Textarea id="customerRemarksInput" name="remarks" />
        </div>
        {canChooseScope ? (
          <div className="space-y-2">
            <Label htmlFor="customerOutletId">Outlet</Label>
            <NativeSelect id="customerOutletId" name="outletId" required={false}>
              <option value="">No outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <input type="hidden" name="outletId" value={profile.outletId ?? ""} />
        )}
        <label className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm">
          <input type="checkbox" name="isActive" defaultChecked />
          Active customer
        </label>
      </div>
    </WorkflowCard>
  )
}

export function EditOrderBeforePickingForm({ order }: { order: CustomerOrder }) {
  const disabled = order.status !== "NEW"

  return (
    <WorkflowCard
      title="Edit before picking"
      description="Allowed only before the first pick."
      action={editCustomerOrderBeforePickingAction}
      submitLabel="Save changes"
      submitDisabled={disabled}
    >
      <input type="hidden" name="orderId" value={order.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="editScheduledAt">Required date/time</Label>
          <Input
            id="editScheduledAt"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={(order.requiredAt ?? new Date().toISOString()).slice(0, 16)}
            disabled={disabled}
            required
            className="min-h-11 text-base md:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="editTotalOrderPrice">Total price</Label>
          <Input
            id="editTotalOrderPrice"
            name="totalOrderPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={order.totalOrderPrice}
            disabled={disabled}
            className="min-h-11 text-base md:text-sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="editDeliveryAddress">Delivery address</Label>
        <Input
          id="editDeliveryAddress"
          name="deliveryAddress"
          defaultValue={order.deliveryAddress}
          disabled={disabled}
          className="min-h-11 text-base md:text-sm"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="editCustomerRemarks">Customer remarks</Label>
          <Textarea
            id="editCustomerRemarks"
            name="customerRemarks"
            defaultValue={order.customerRemarks}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="editRemarks">Staff remarks</Label>
          <Textarea
            id="editRemarks"
            name="remarks"
            defaultValue={order.remarks}
            disabled={disabled}
          />
        </div>
      </div>
      {disabled ? (
        <p className="text-sm text-muted-foreground">
          Picking has started or the order is no longer editable.
        </p>
      ) : null}
    </WorkflowCard>
  )
}

export function PickingForms({
  orders,
  items,
  selectedOrderId,
}: {
  orders: CustomerOrder[]
  items: CustomerOrderItem[]
  selectedOrderId?: string
}) {
  const pickingOrders = orders.filter((order) =>
    ["NEW", "PREPARING"].includes(order.status)
  )
  const orderId = selectedOrderId ?? pickingOrders[0]?.id ?? ""
  const orderItems = items.filter((item) => item.orderId === orderId)

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <WorkflowCard
        title="Scan barcode"
        description="Wrong item scans are recorded as mismatches."
        action={pickOrderBarcodeAction}
        submitLabel="Save scan"
        submitDisabled={pickingOrders.length === 0}
      >
        <div className="space-y-2">
          <Label htmlFor="scanOrderId">Order</Label>
          <NativeSelect
            id="scanOrderId"
            name="orderId"
            defaultValue={orderId}
            disabled={pickingOrders.length === 0}
          >
            <option value="">Select order</option>
            {pickingOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNo} - {order.customerName}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <div className="flex gap-2">
            <Input
              id="barcode"
              name="barcode"
              required
              className="min-h-11 text-base md:text-sm"
            />
            <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Scan barcode">
              <ScanLine className="size-4" />
            </Button>
          </div>
        </div>
      </WorkflowCard>

      <WorkflowCard
        title="Manual weight"
        description="Reason is required when no barcode is used."
        action={manualPickWeightAction}
        submitLabel="Save manual weight"
        submitDisabled={orderItems.length === 0}
      >
        <div className="space-y-2">
          <Label htmlFor="manualOrderItemId">Order item</Label>
          <NativeSelect
            id="manualOrderItemId"
            name="orderItemId"
            disabled={orderItems.length === 0}
          >
            <option value="">Select item</option>
            {orderItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.orderNo} - {item.itemLabel}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pickedQuantity">Picked quantity</Label>
            <Input id="pickedQuantity" name="pickedQuantity" type="number" min="0" step="0.001" className="min-h-11 text-base md:text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickedWeightKg">Picked kg</Label>
            <Input id="pickedWeightKg" name="pickedWeightKg" type="number" min="0" step="0.001" className="min-h-11 text-base md:text-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="manualReason">Reason</Label>
          <NativeSelect id="manualReason" name="manualReason">
            {manualPickReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason.replaceAll("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="manualNotes">Notes</Label>
          <Textarea id="manualNotes" name="notes" />
        </div>
      </WorkflowCard>
    </div>
  )
}

export function MarkReadyForm({
  orders,
}: {
  orders: CustomerOrder[]
}) {
  const readyCandidates = orders.filter((order) =>
    ["NEW", "PREPARING", "READY"].includes(order.status)
  )

  return (
    <WorkflowCard
      title="Mark ready"
      description="Ready delivery orders appear in Delivery."
      action={markCustomerOrderReadyAction}
      submitLabel="Mark ready"
      submitDisabled={readyCandidates.length === 0}
    >
      <div className="space-y-2">
        <Label htmlFor="readyOrderId">Order</Label>
        <NativeSelect
          id="readyOrderId"
          name="orderId"
          disabled={readyCandidates.length === 0}
        >
          <option value="">Select order</option>
          {readyCandidates.map((order) => (
            <option key={order.id} value={order.id}>
              {order.orderNo} - {order.customerName}
            </option>
          ))}
        </NativeSelect>
      </div>
    </WorkflowCard>
  )
}

export function CreateOrderDeliveryForm({ order }: { order: CustomerOrder }) {
  const disabled =
    !order.deliveryRequired ||
    order.fulfillmentType === "PICKUP" ||
    ["DELIVERED", "FAILED", "CANCELLED"].includes(order.status)

  return (
    <WorkflowCard
      title="Create delivery"
      description="Creates or links the Delivery job for this order."
      action={createOrderDeliveryAction}
      submitLabel="Create Delivery"
      submitDisabled={disabled}
    >
      <input type="hidden" name="orderId" value={order.id} />
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <div className="font-medium">{order.orderNo}</div>
        <div className="text-muted-foreground">
          {order.customerName} - {order.fulfillmentType.replaceAll("_", " ")}
        </div>
      </div>
      {order.fulfillmentType === "PICKUP" ? (
        <p className="text-sm text-muted-foreground">
          Customer pickup stays in Orders.
        </p>
      ) : null}
    </WorkflowCard>
  )
}

export function ReadyOrderActions({ orders }: { orders: CustomerOrder[] }) {
  const pickupOrders = orders.filter((order) => order.status === "READY_FOR_PICKUP")
  const cancellableOrders = orders.filter(
    (order) => !["DELIVERED", "FAILED", "CANCELLED"].includes(order.status)
  )

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <WorkflowCard
        title="Pickup completed"
        description="Staff taps this when customer pickup is complete."
        action={markPickupCompletedAction}
        submitLabel="Picked up"
        submitDisabled={pickupOrders.length === 0}
      >
        <div className="space-y-2">
          <Label htmlFor="pickupOrderId">Pickup order</Label>
          <NativeSelect
            id="pickupOrderId"
            name="orderId"
            disabled={pickupOrders.length === 0}
          >
            <option value="">Select pickup order</option>
            {pickupOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNo} - {order.customerName}
              </option>
            ))}
          </NativeSelect>
        </div>
      </WorkflowCard>

      <WorkflowCard
        title="Cancel order"
        description="Cancelling releases active reservations."
        action={cancelCustomerOrderAction}
        submitLabel="Cancel order"
        submitDisabled={cancellableOrders.length === 0}
      >
        <div className="space-y-2">
          <Label htmlFor="cancelOrderId">Order</Label>
          <NativeSelect
            id="cancelOrderId"
            name="orderId"
            disabled={cancellableOrders.length === 0}
          >
            <option value="">Select order</option>
            {cancellableOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNo} - {order.customerName} - {order.displayStatus}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cancellationReason">Reason</Label>
          <Textarea id="cancellationReason" name="cancellationReason" required />
        </div>
      </WorkflowCard>
    </div>
  )
}

export function CustomerOrderDeliveryStatusForm({
  orders,
}: {
  orders: CustomerOrder[]
}) {
  const deliveryOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.deliveryRequired &&
          (order.status === "READY_FOR_DELIVERY" ||
            order.status === "OUT_FOR_DELIVERY")
      ),
    [orders]
  )
  const [orderId, setOrderId] = useState(deliveryOrders[0]?.id ?? "")
  const selectedOrderId = deliveryOrders.some((order) => order.id === orderId)
    ? orderId
    : deliveryOrders[0]?.id ?? ""
  const selectedOrder = deliveryOrders.find(
    (order) => order.id === selectedOrderId
  )
  const statusOptions =
    selectedOrder?.status === "READY_FOR_DELIVERY"
      ? [
          ["OUT_FOR_DELIVERY", "OUT FOR DELIVERY"],
          ["CANCELLED", "CANCELLED"],
        ]
      : selectedOrder?.status === "OUT_FOR_DELIVERY"
        ? [
            ["DELIVERED", "DELIVERED"],
            ["CANCELLED", "CANCELLED"],
          ]
        : []

  return (
    <WorkflowCard
      title="Customer order delivery"
      description="Delivery proof is handled by Delivery."
      action={updateCustomerOrderDeliveryStatusAction}
      submitLabel="Update delivery"
      submitDisabled={!selectedOrderId || statusOptions.length === 0}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerDeliveryOrderId">Order</Label>
          <NativeSelect
            id="customerDeliveryOrderId"
            name="orderId"
            value={selectedOrderId}
            onChange={setOrderId}
            disabled={deliveryOrders.length === 0}
          >
            <option value="">Select customer order</option>
            {deliveryOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNo} - {order.customerName} - {order.status}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerDeliveryStatus">Status</Label>
          <NativeSelect
            id="customerDeliveryStatus"
            name="status"
            disabled={statusOptions.length === 0}
          >
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerDeliveryNotes">Notes</Label>
        <Textarea id="customerDeliveryNotes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function CustomerOrderProofUploadForm({
  orders,
}: {
  orders: CustomerOrder[]
}) {
  const deliveryOrders = orders.filter(
    (order) =>
      order.deliveryRequired &&
      (order.status === "OUT_FOR_DELIVERY" ||
        order.status === "DELIVERED" ||
        order.status === "FAILED")
  )

  return (
    <WorkflowCard
      title="Customer order proof"
      description="Proof photo, receiver/contact name, and GPS."
      action={uploadCustomerOrderProofAction}
      submitLabel="Upload proof"
      submitDisabled={deliveryOrders.length === 0}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerProofOrderId">Order</Label>
          <NativeSelect
            id="customerProofOrderId"
            name="orderId"
            disabled={deliveryOrders.length === 0}
          >
            <option value="">Select customer order</option>
            {deliveryOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNo} - {order.customerName} - {order.status}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerProofFile">Proof photo</Label>
          <Input
            id="customerProofFile"
            name="proofFile"
            type="file"
            accept="image/*"
            required={deliveryOrders.length > 0}
            className="min-h-11 text-base md:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerDeliveryOutcome">Outcome</Label>
          <NativeSelect
            id="customerDeliveryOutcome"
            name="deliveryOutcome"
            disabled={deliveryOrders.length === 0}
          >
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerProofReceiverName">Receiver/contact name</Label>
          <Input
            id="customerProofReceiverName"
            name="receiverName"
            disabled={deliveryOrders.length === 0}
            required={deliveryOrders.length > 0}
            className="min-h-11 text-base md:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerProofLatitude">GPS latitude</Label>
          <Input
            id="customerProofLatitude"
            name="latitude"
            type="number"
            step="0.0000001"
            disabled={deliveryOrders.length === 0}
            required={deliveryOrders.length > 0}
            className="min-h-11 text-base md:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerProofLongitude">GPS longitude</Label>
          <Input
            id="customerProofLongitude"
            name="longitude"
            type="number"
            step="0.0000001"
            disabled={deliveryOrders.length === 0}
            required={deliveryOrders.length > 0}
            className="min-h-11 text-base md:text-sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerProofNotes">Failed delivery notes</Label>
        <Textarea
          id="customerProofNotes"
          name="notes"
          disabled={deliveryOrders.length === 0}
        />
      </div>
    </WorkflowCard>
  )
}

export function StockWarningBadge({ show }: { show: boolean }) {
  return show ? <Badge variant="destructive">Stock not enough</Badge> : null
}
