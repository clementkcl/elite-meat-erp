"use client"

import { Check, Plus, Save, ScanLine, Search, X } from "lucide-react"
import Link from "next/link"
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"

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
  setCustomerOrderFinalPriceAction,
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
  type OrderPickingEntry,
  type OrderBrandOption,
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
  preferredBrandId: string
  customization: Record<string, string[]>
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

function orderWorkflowLabel(order: CustomerOrder) {
  if (order.status === "READY" && order.totalOrderPrice <= 0) {
    return "Price Required"
  }

  if (order.status === "READY_FOR_PICKUP") {
    return "Ready for Pickup"
  }

  if (order.status === "READY_FOR_DELIVERY") {
    return "Pending Delivery"
  }

  return order.displayStatus
}

function PickingFastPath() {
  const steps = [
    "Select order",
    "Scan barcode",
    "Confirm picked weight",
    "Complete picking",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order picking fast path</CardTitle>
        <CardDescription>
          One order at a time. After picking starts, staff should not edit the
          order; cancel and recreate if changes are needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step} className="rounded-md border p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Step {index + 1}
              </div>
              <div className="mt-1 text-sm font-semibold">{step}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-md border bg-muted/30 p-3">
            Duplicate picked barcodes show a warning and are blocked.
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            Wrong item scans show a warning with the next choice.
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            Manual weight needs a reason when barcode picking is not possible.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PickingSuccessNextStep({
  scanState,
  manualState,
  readyState,
}: {
  scanState: OrdersActionState
  manualState: OrdersActionState
  readyState: OrdersActionState
}) {
  if (readyState.status === "success") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
        Picking complete. Next step: open Price / Ready and enter final total price.
        <Button asChild variant="outline" className="mt-3 min-h-11 w-full bg-background">
          <Link href="/orders/ready">
            <Check className="size-4" />
            Go to Price / Ready
          </Link>
        </Button>
      </div>
    )
  }

  if (scanState.status !== "success" && manualState.status !== "success") {
    return null
  }

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
      Pick saved. Next step: keep scanning until every item is within tolerance,
      then complete picking.
    </div>
  )
}

function PickingMismatchGuide({ state }: { state: OrdersActionState }) {
  const message = state.message ?? ""

  if (
    state.status !== "error" ||
    (!message.includes("Wrong item scanned") &&
      !message.includes("Wrong brand scanned") &&
      !message.includes("Barcode not found"))
  ) {
    return null
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-semibold">Continue picking?</div>
      <p className="mt-1">
        Mismatch is recorded. Scan the correct barcode, or use Manual Weight
        with a reason if the picker must continue without that barcode.
      </p>
      <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2">
        <div className="rounded-md border bg-background px-3 py-2 font-medium">
          Scan correct barcode
        </div>
        <div className="rounded-md border bg-background px-3 py-2 font-medium">
          Manual Weight with reason
        </div>
      </div>
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

function emptyLine(): DraftLine {
  return lineForItem(undefined)
}

function lineForItem(item: StockItemOption | undefined): DraftLine {
  return {
    key: crypto.randomUUID(),
    itemId: item?.id ?? "",
    orderingUnit: item?.orderUnit ?? "KG",
    requestedQuantity: "",
    estimatedWeightKg: "",
    processingRequired: item?.processingRequiredDefault ?? false,
    preferredBrandId: "",
    customization: Object.fromEntries(
      (item?.customizationGroups ?? []).map((group) => [
        group.name,
        group.defaultOptions,
      ])
    ),
    remarks: "",
  }
}

function linePayload(lines: DraftLine[]) {
  return JSON.stringify(
    lines
      .filter((line) => line.itemId)
      .map((line) => ({
        itemId: line.itemId,
        orderingUnit: line.orderingUnit,
        requestedQuantity:
          line.orderingUnit === "KG"
            ? 0
            : Number(line.requestedQuantity) || 0,
        estimatedWeightKg: Number(line.estimatedWeightKg) || 0,
        processingRequired: line.processingRequired,
        preferredBrandId: line.preferredBrandId || null,
        customization: line.customization,
        remarks: line.remarks,
      }))
  )
}

function CreateOrderFastGuide() {
  const steps = [
    "Customer or transfer",
    "Tap order type",
    "Add items",
    "Save order",
    "Price later",
  ]

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3">
      <div className="text-sm font-semibold text-emerald-900">
        Worker fast path
      </div>
      <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2 lg:grid-cols-5">
        {steps.map((label, index) => (
          <div
            key={label}
            className="min-h-12 rounded-md border bg-background/80 px-3 py-2 text-sm"
          >
            <span className="block text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <span className="block font-medium">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-emerald-950/75">
        Use search, quick add, and recent items to avoid typing.
      </p>
    </div>
  )
}

function CreateOrderSuccessNextStep() {
  const nextSteps = [
    "Order saved",
    "Stock checked",
    "Open picking",
  ]

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      <div className="font-semibold">Order created. Pick items next.</div>
      <div className="mt-3 grid gap-2 min-[390px]:grid-cols-3">
        {nextSteps.map((stepLabel) => (
          <div
            key={stepLabel}
            className="flex min-h-11 items-center gap-2 rounded-md border bg-background px-3 font-medium"
          >
            <Check className="size-4 shrink-0 text-emerald-700" />
            {stepLabel}
          </div>
        ))}
      </div>
      <p className="mt-3">
        Stock shortage stays visible in picking. Do not create the same order
        again.
      </p>
      <div className="mt-2 grid gap-2 min-[390px]:grid-cols-2">
        <Link
          href="/orders/picking"
          className="flex min-h-11 items-center justify-center rounded-md border border-emerald-300 bg-background px-3 font-medium text-emerald-900"
        >
          Go to Picking
        </Link>
        <Link
          href="/orders"
          className="flex min-h-11 items-center justify-center rounded-md border border-emerald-300 bg-background px-3 font-medium text-emerald-900"
        >
          Back to Orders
        </Link>
      </div>
    </div>
  )
}

function CreateOrderErrorNextStep() {
  const recoverySteps = [
    "Read the red message",
    "Fix the highlighted step",
    "Try Create Order again",
  ]

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-semibold">Order not saved yet</div>
      <p className="mt-1">
        Fix the missing or blocked details before asking the customer to wait.
      </p>
      <div className="mt-3 grid gap-2 min-[390px]:grid-cols-3">
        {recoverySteps.map((stepLabel) => (
          <div
            key={stepLabel}
            className="rounded-md border bg-background px-3 py-2 font-medium"
          >
            {stepLabel}
          </div>
        ))}
      </div>
    </div>
  )
}

function CreateOrderBlockedGuide({
  reason,
  checks,
}: {
  reason: string
  checks: { label: string; ready: boolean }[]
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="font-semibold">Create order is not ready</div>
      <p className="mt-1">{reason}</p>
      <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2 lg:grid-cols-5">
        {checks.map((check) => (
          <div
            key={check.label}
            className={
              check.ready
                ? "flex min-h-11 items-center gap-2 rounded-md border border-emerald-200 bg-background px-3 text-emerald-800"
                : "flex min-h-11 items-center gap-2 rounded-md border bg-background px-3"
            }
          >
            <span
              className={
                check.ready
                  ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800"
                  : "flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900"
              }
            >
              {check.ready ? "OK" : "!"}
            </span>
            <span className="font-medium">{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function itemById(items: StockItemOption[], itemId: string) {
  return items.find((item) => item.id === itemId)
}

export function CreateOrderForm({
  profile,
  customers,
  stockItems,
  brandOptions,
  scopeOptions,
  initialCustomerId = "",
}: {
  profile: CurrentProfile
  customers: CustomerOption[]
  stockItems: StockItemOption[]
  brandOptions: OrderBrandOption[]
  scopeOptions: {
    outlets: OrderScopeOption[]
    departments: OrderScopeOption[]
    stockLocations: OrderStockLocationOption[]
  }
  initialCustomerId?: string
}) {
  const [state, formAction, pending] = useActionState(
    createCustomerOrderAction,
    initialOrdersActionState
  )
  const canChooseScope = canChooseOrderScope(profile)
  const sortedCustomers = [...customers].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const initialCustomer = sortedCustomers.find(
    (customer) => customer.id === initialCustomerId
  )
  const canSeeOrderCreditWarning = profile.roles.some((role) =>
    [
      "retail_manager",
      "delivery_manager",
      "processing_manager",
      "admin",
      "director",
    ].includes(role)
  )
  const [fulfillmentType, setFulfillmentType] =
    useState<CustomerOrder["fulfillmentType"] | "">("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerId, setCustomerId] = useState(initialCustomer?.id ?? "")
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [scheduledAt, setScheduledAt] = useState(nowForInput())
  const [pickupLocationId, setPickupLocationId] = useState(
    profile.stockLocationId ?? ""
  )
  const [fromLocationId, setFromLocationId] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialCustomer?.address ?? ""
  )
  const [customerRemarks, setCustomerRemarks] = useState(
    initialCustomer?.remarks ?? ""
  )
  const [itemCategory, setItemCategory] = useState("ALL")
  const [itemSearch, setItemSearch] = useState("")
  const [lines, setLines] = useState<DraftLine[]>(() => [emptyLine()])
  const [step, setStep] = useState(1)
  const [stepError, setStepError] = useState("")
  const selectedCustomer = sortedCustomers.find((customer) => customer.id === customerId)
  const categories = Array.from(new Set(stockItems.map((item) => item.category)))
  const recentItems = stockItems.slice(0, 6)
  const steps = [
    "Customer / Transfer",
    "Order Type",
    "Items",
    "Create Order",
  ]
  const createOrderFinalSteps = [
    "Check customer",
    "Check items kg",
    "Create order",
    "Pick items",
    "Enter final price",
  ]
  const visibleCustomers = sortedCustomers.filter((customer) => {
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
  const startedLines = lines.filter(
    (line) =>
      line.itemId ||
      line.requestedQuantity ||
      line.estimatedWeightKg ||
      line.remarks
  )
  const hasInvalidLine = startedLines.some(
    (line) =>
      !line.itemId ||
      Number(line.estimatedWeightKg) <= 0 ||
      (line.orderingUnit !== "KG" && Number(line.requestedQuantity) <= 0) ||
      itemById(stockItems, line.itemId)?.customizationGroups.some(
        (group) => (line.customization[group.name] ?? []).length === 0
      )
  )
  const validLines = lines.filter(
    (line) =>
      line.itemId &&
      Number(line.estimatedWeightKg) > 0 &&
      (line.orderingUnit === "KG" || Number(line.requestedQuantity) > 0) &&
      !itemById(stockItems, line.itemId)?.customizationGroups.some(
        (group) => (line.customization[group.name] ?? []).length === 0
      )
  )
  const hasBrandNoStock = startedLines.some((line) => {
    if (!line.preferredBrandId) {
      return false
    }

    const brand = brandOptions.find(
      (option) =>
        option.itemId === line.itemId && option.id === line.preferredBrandId
    )

    return !brand || brand.availableWeightKg <= 0
  })
  const totalEstimatedWeightKg = validLines.reduce(
    (total, line) => total + (Number(line.estimatedWeightKg) || 0),
    0
  )
  const hasQuickAddCustomer =
    newCustomerName.trim().length > 0 && newCustomerPhone.trim().length > 0
  const hasCustomer = Boolean(customerId) || hasQuickAddCustomer
  const hasSelectedOrNewCustomer =
    fulfillmentType === "INTERNAL_TRANSFER" || hasCustomer
  const selectedCustomerIsVisible = visibleCustomers.some(
    (customer) => customer.id === selectedCustomer?.id
  )
  const selectedPickupLocation = scopeOptions.stockLocations.find(
    (location) => location.id === pickupLocationId
  )
  const selectedFromLocation = scopeOptions.stockLocations.find(
    (location) => location.id === fromLocationId
  )
  const selectedToLocation = scopeOptions.stockLocations.find(
    (location) => location.id === toLocationId
  )

  function selectCustomer(nextCustomerId: string) {
    const nextCustomer = sortedCustomers.find(
      (customer) => customer.id === nextCustomerId
    )

    setCustomerId(nextCustomerId)
    setNewCustomerName("")
    setNewCustomerPhone("")
    setDeliveryAddress(nextCustomer?.address ?? "")
    setCustomerRemarks(nextCustomer?.remarks ?? "")
    setStepError("")
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setStepError("")
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) {
          return line
        }

        const next = { ...line, ...patch }

        if (patch.itemId) {
          const item = itemById(stockItems, patch.itemId)
          next.orderingUnit = item?.orderUnit ?? next.orderingUnit
          if (next.orderingUnit === "KG") {
            next.requestedQuantity = ""
          }
          next.processingRequired =
            item?.processingRequiredDefault ?? next.processingRequired
          next.preferredBrandId = ""
          next.customization = Object.fromEntries(
            (item?.customizationGroups ?? []).map((group) => [
              group.name,
              group.defaultOptions,
            ])
          )
        }

        return next
      })
    )
  }

  function addRecentItem(item: StockItemOption) {
    setStepError("")
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

  function toggleCustomization(line: DraftLine, groupName: string, option: string) {
    const currentOptions = line.customization[groupName] ?? []
    const nextOptions = currentOptions.includes(option)
      ? currentOptions.filter((value) => value !== option)
      : [...currentOptions, option]

    updateLine(line.key, {
      customization: {
        ...line.customization,
        [groupName]: nextOptions,
      },
    })
  }

  function validationForStep(stepNumber: number) {
    if (stepNumber === 1 && !hasSelectedOrNewCustomer) {
      return "Select a customer or enter name and phone."
    }

    if (stepNumber === 2 && !fulfillmentType) {
      return "Select order type."
    }

    if (
      stepNumber === 2 &&
      fulfillmentType !== "INTERNAL_TRANSFER" &&
      !hasCustomer
    ) {
      return "Select a customer or enter name and phone."
    }

    if (
      stepNumber === 2 &&
      fulfillmentType === "DELIVERY" &&
      deliveryAddress.trim().length === 0
    ) {
      return !customerId && hasQuickAddCustomer
        ? "Enter delivery address for new delivery customer."
        : "Enter delivery address."
    }

    if (stepNumber === 2 && fulfillmentType === "PICKUP" && !pickupLocationId) {
      return "Select pickup location."
    }

    if (stepNumber === 2 && fulfillmentType === "INTERNAL_TRANSFER") {
      if (!fromLocationId || !toLocationId) {
        return "Select transfer from and to locations."
      }

      if (fromLocationId === toLocationId) {
        return "Transfer from and to locations must be different."
      }
    }

    if (stepNumber === 3) {
      if (stockItems.length === 0) {
        return "No stock items are available for orders."
      }

      if (validLines.length === 0) {
        return "Add at least one item."
      }

      if (hasInvalidLine) {
        return "Enter estimated weight, quantity, and customization for each item."
      }

      if (hasBrandNoStock) {
        return "Selected brand has no stock. Choose another brand or no brand preference."
      }
    }

    return null
  }

  function createBlockedReason() {
    for (let stepNumber = 1; stepNumber < steps.length; stepNumber += 1) {
      const reason = validationForStep(stepNumber)

      if (reason) {
        return reason
      }
    }

    if (fulfillmentType === "DELIVERY" && deliveryAddress.trim().length === 0) {
      return "Enter a delivery address before creating the order."
    }

    if (fulfillmentType === "PICKUP" && !pickupLocationId) {
      return "Select pickup location before creating the order."
    }

    if (fulfillmentType === "INTERNAL_TRANSFER") {
      if (!fromLocationId || !toLocationId) {
        return "Select transfer from and to locations before creating the order."
      }

      if (fromLocationId === toLocationId) {
        return "Transfer from and to locations must be different."
      }
    }

    if (canChooseScope && scopeOptions.outlets.length === 0) {
      return "No outlet is available for this user."
    }

    return null
  }

  function goToStep(nextStep: number) {
    if (nextStep <= step) {
      setStep(nextStep)
      setStepError("")
      return
    }

    for (let stepNumber = step; stepNumber < nextStep; stepNumber += 1) {
      const reason = validationForStep(stepNumber)

      if (reason) {
        setStep(stepNumber)
        setStepError(reason)
        return
      }
    }

    setStep(nextStep)
    setStepError("")
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (step < steps.length) {
      event.preventDefault()
      goToStep(step + 1)
      return
    }

    const reason = createBlockedReason()

    if (reason) {
      event.preventDefault()
      setStepError(reason)
    }
  }

  const requiredDateTimeLabel =
    fulfillmentType === "PICKUP"
      ? "Pickup date/time"
      : fulfillmentType === "DELIVERY"
        ? "Delivery date/time"
        : "Required date/time"
  const reviewCustomer =
    fulfillmentType === "INTERNAL_TRANSFER"
      ? "Internal transfer"
      : selectedCustomer?.name || newCustomerName.trim() || "Customer not selected"
  const reviewOrderType =
    fulfillmentType === "" ? "Not selected" : fulfillmentType.replaceAll("_", " ")
  const reviewLocationDetail =
    fulfillmentType === "PICKUP"
      ? selectedPickupLocation?.name || "Pickup location not selected"
      : fulfillmentType === "DELIVERY"
        ? deliveryAddress.trim() || "Delivery address not entered"
        : fulfillmentType === "INTERNAL_TRANSFER"
          ? `${selectedFromLocation?.name || "From location not selected"} to ${
              selectedToLocation?.name || "to location not selected"
            }`
          : "Order type not selected"
  const createDisabledReason = createBlockedReason()
  const submitDisabled = Boolean(createDisabledReason)
  const locationReady =
    fulfillmentType === "PICKUP"
      ? Boolean(pickupLocationId)
      : fulfillmentType === "DELIVERY"
        ? deliveryAddress.trim().length > 0
        : fulfillmentType === "INTERNAL_TRANSFER"
          ? Boolean(fromLocationId && toLocationId && fromLocationId !== toLocationId)
          : false
  const createReadinessChecks = [
    { label: "Customer ready", ready: hasSelectedOrNewCustomer },
    { label: "Order type ready", ready: Boolean(fulfillmentType) },
    {
      label: "Items and brand ready",
      ready: validLines.length > 0 && !hasInvalidLine && !hasBrandNoStock,
    },
    { label: "Location ready", ready: locationReady },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create order</CardTitle>
        <CardDescription>
          Step {step} of {steps.length}: {steps[step - 1]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="space-y-5"
          noValidate
          onSubmit={handleFormSubmit}
        >
          <input type="hidden" name="itemsJson" value={linePayload(lines)} />
          <input type="hidden" name="customerId" value={customerId} />
          <input type="hidden" name="fulfillmentType" value={fulfillmentType} />
          <input type="hidden" name="totalOrderPrice" value="0" />
          <CreateOrderFastGuide />
          <div className="grid gap-2 sm:grid-cols-4">
            {steps.map((label, index) => {
              const stepNumber = index + 1

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => goToStep(stepNumber)}
                  className={
                    step === stepNumber
                      ? "min-h-12 rounded-md border border-primary bg-primary px-3 text-left text-sm font-medium text-primary-foreground"
                      : "min-h-12 rounded-md border bg-background px-3 text-left text-sm font-medium text-muted-foreground"
                  }
                >
                  <span className="block text-xs">Step {stepNumber}</span>
                  <span className="block break-words">{label}</span>
                </button>
              )
            })}
          </div>
          {stepError ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {stepError}
            </div>
          ) : null}
          <section hidden={step !== 2} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Step 2 Order Type</h2>
              <p className="text-sm text-muted-foreground">
                Choose pickup, delivery, or internal transfer.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["PICKUP", "Pickup", "Customer collects from outlet"],
                ["DELIVERY", "Delivery", "Delivery sees progress, accepts later"],
                [
                  "INTERNAL_TRANSFER",
                  "Internal Transfer",
                  "Move stock between locations",
                ],
              ].map(([value, label, detail]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={fulfillmentType === value}
                  onClick={() => {
                    setFulfillmentType(value as CustomerOrder["fulfillmentType"])
                    setStepError("")
                  }}
                  className={
                    fulfillmentType === value
                      ? "min-h-24 rounded-md border border-primary bg-primary px-4 text-left text-primary-foreground"
                      : "min-h-24 rounded-md border bg-background px-4 text-left"
                  }
                >
                  <span className="block text-base font-semibold">{label}</span>
                  <span className="mt-1 block text-sm opacity-80">{detail}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">{requiredDateTimeLabel}</Label>
              <Input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => {
                  setScheduledAt(event.target.value)
                  setStepError("")
                }}
                required
                className="min-h-12 text-base md:text-sm"
              />
            </div>
          </section>

          <div hidden={step !== 2}>
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
                  <NativeSelect
                    id="departmentId"
                    name="departmentId"
                    required={false}
                  >
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
          </div>

          <section hidden={step !== 1} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Step 1 Customer / Transfer</h2>
              <p className="text-sm text-muted-foreground">
                Search by name or phone, quick add, or skip for internal transfer.
              </p>
            </div>
            {fulfillmentType !== "INTERNAL_TRANSFER" ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-3">
                  <Label htmlFor="customerSearch">Customer</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      id="customerSearch"
                      value={customerSearch}
                      onChange={(event) => {
                        setCustomerSearch(event.target.value)
                        setStepError("")
                      }}
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
                    {selectedCustomer && !selectedCustomerIsVisible ? (
                      <option value={selectedCustomer.id}>
                        {selectedCustomer.name} - {selectedCustomer.phone}
                      </option>
                    ) : null}
                    {visibleCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </NativeSelect>
                  {selectedCustomer ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      <Badge variant="secondary">Selected customer</Badge>
                      <div className="mt-2 font-medium">{selectedCustomer.name}</div>
                      <div className="break-words">{selectedCustomer.phone}</div>
                    </div>
                  ) : newCustomerName || newCustomerPhone ? (
                    <div className="rounded-md border p-3 text-sm">
                      <Badge variant="outline">Quick add customer</Badge>
                      <div className="mt-2 font-medium">
                        {newCustomerName.trim() || "Name needed"}
                      </div>
                      <div className="break-words">
                        {newCustomerPhone.trim() || "Phone needed"}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      Select a customer or enter name and phone.
                    </div>
                  )}
                  {canSeeOrderCreditWarning && selectedCustomer?.hasOverdueCredit ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Credit overdue warning. Order is not blocked.
                    </div>
                  ) : null}
                  {customerSearch && visibleCustomers.length === 0 ? (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      No matching customer. Quick add with name and phone.
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full justify-start"
                    onClick={() => {
                      setFulfillmentType("INTERNAL_TRANSFER")
                      setStepError("")
                      setStep(2)
                    }}
                  >
                    Internal transfer - skip customer
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newCustomerName">Quick add name</Label>
                    <Input
                      id="newCustomerName"
                      name="newCustomerName"
                      value={newCustomerName}
                      onChange={(event) => {
                        setNewCustomerName(event.target.value)
                        setStepError("")
                      }}
                      disabled={Boolean(customerId)}
                      className="min-h-11 text-base md:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCustomerPhone">Quick add phone</Label>
                    <Input
                      id="newCustomerPhone"
                      name="newCustomerPhone"
                      value={newCustomerPhone}
                      onChange={(event) => {
                        setNewCustomerPhone(event.target.value)
                        setStepError("")
                      }}
                      disabled={Boolean(customerId)}
                      className="min-h-11 text-base md:text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                Internal transfer orders do not need a customer.
              </div>
            )}
          </section>

          <section hidden={step !== 2} className="grid gap-4 lg:grid-cols-3">
            {fulfillmentType === "PICKUP" ? (
              <div className="space-y-2">
                <Label htmlFor="pickupLocationId">Pickup location</Label>
                <NativeSelect
                  id="pickupLocationId"
                  name="pickupLocationId"
                  value={pickupLocationId}
                  onChange={(value) => {
                    setPickupLocationId(value)
                    setStepError("")
                  }}
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
                  <Label htmlFor="deliveryAddress">
                    {!customerId && newCustomerName.trim()
                      ? "Delivery address (saved to new customer)"
                      : "Delivery address"}
                  </Label>
                  <Input
                    id="deliveryAddress"
                    name="deliveryAddress"
                    value={deliveryAddress}
                    onChange={(event) => {
                      setDeliveryAddress(event.target.value)
                      setStepError("")
                    }}
                    required
                    className="min-h-11 text-base md:text-sm"
                  />
                  {!customerId && newCustomerName.trim() ? (
                    <p className="text-sm text-muted-foreground">
                      New delivery customer uses name, phone, and this address.
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
            {fulfillmentType === "INTERNAL_TRANSFER" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fromLocationId">From location</Label>
                  <NativeSelect
                    id="fromLocationId"
                    name="fromLocationId"
                    value={fromLocationId}
                    onChange={(value) => {
                      setFromLocationId(value)
                      setStepError("")
                    }}
                  >
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
                  <NativeSelect
                    id="toLocationId"
                    name="toLocationId"
                    value={toLocationId}
                    onChange={(value) => {
                      setToLocationId(value)
                      setStepError("")
                    }}
                  >
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
          </section>

          <section hidden={step !== 3} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Step 3 Items</h2>
                <p className="text-sm text-muted-foreground">
                  Add ordered items and estimated kg for picking.
                </p>
                <div className="mt-3 rounded-md border bg-muted/30 p-3">
                  <div className="text-sm font-semibold">Recent items</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tap a recent item to add it without typing the item name.
                  </p>
                  {recentItems.length > 0 ? (
                    <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2 md:grid-cols-3">
                      {recentItems.map((item) => (
                        <Button
                          key={item.id}
                          type="button"
                          variant="secondary"
                          className="min-h-11 justify-start"
                          onClick={() => addRecentItem(item)}
                        >
                          {item.itemCode || item.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      No order items are available. Ask a manager to set active
                      stock items before creating orders.
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant={itemCategory === category ? "default" : "outline"}
                      className="min-h-11"
                      onClick={() => setItemCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={itemCategory === "ALL" ? "default" : "outline"}
                    className="min-h-11"
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
                onClick={() => {
                  setStepError("")
                  setLines((current) => [...current, emptyLine()])
                }}
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
              {stockItems.length > 0 && visibleItems.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  No matching order items. Clear search or choose All before
                  adding an item.
                </div>
              ) : null}
              {lines.map((line, index) => {
                const selectedItem = itemById(stockItems, line.itemId)
                const selectedItemVisible = visibleItems.some(
                  (item) => item.id === selectedItem?.id
                )
                const itemBrandOptions = brandOptions.filter(
                  (brand) => brand.itemId === line.itemId
                )
                const selectedBrand = itemBrandOptions.find(
                  (brand) => brand.id === line.preferredBrandId
                )
                const unitLabel = line.orderingUnit.replaceAll("_", " ")

                return (
                  <div key={line.key} className="rounded-md border p-3">
                    <div
                      className={
                        line.orderingUnit === "KG"
                          ? "grid gap-3 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"
                          : "grid gap-3 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto]"
                      }
                    >
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
                        <Label htmlFor={`unit${line.key}`}>Unit</Label>
                        <NativeSelect
                          id={`unit${line.key}`}
                          name={`unit${line.key}`}
                          value={line.orderingUnit}
                          onChange={(value) =>
                            updateLine(line.key, {
                              orderingUnit: value as OrderUnit,
                              requestedQuantity:
                                value === "KG" ? "" : line.requestedQuantity,
                            })
                          }
                        >
                          <option value="KG">Weight</option>
                          <option value="CARTON">Carton</option>
                          <option value="PACKET">Packet</option>
                          <option value="QUANTITY_ESTIMATED_KG">
                            Quantity + estimated kg
                          </option>
                        </NativeSelect>
                      </div>
                      {line.orderingUnit !== "KG" ? (
                        <div className="space-y-2">
                          <Label htmlFor={`quantity${line.key}`}>
                            {unitLabel} quantity
                          </Label>
                          <Input
                            id={`quantity${line.key}`}
                          type="number"
                          min="0"
                          step="0.001"
                          inputMode="decimal"
                          placeholder="Quantity"
                          required
                          value={line.requestedQuantity}
                            onChange={(event) =>
                              updateLine(line.key, {
                                requestedQuantity: event.target.value,
                              })
                            }
                            className="min-h-11 text-base md:text-sm"
                          />
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <Label htmlFor={`weight${line.key}`}>Estimated kg</Label>
                        <Input
                          id={`weight${line.key}`}
                          type="number"
                          min="0"
                          step="0.001"
                          inputMode="decimal"
                          placeholder="Estimated kg"
                          required
                          value={line.estimatedWeightKg}
                          onChange={(event) =>
                            updateLine(line.key, {
                              estimatedWeightKg: event.target.value,
                            })
                          }
                          className="min-h-11 text-base md:text-sm"
                        />
                        {line.orderingUnit === "KG" ? (
                          <p className="text-sm text-muted-foreground">
                            Weight orders use estimated kg only.
                          </p>
                        ) : null}
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
                              ? [emptyLine()]
                              : current.filter((candidate) => candidate.key !== line.key)
                          )
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    {selectedItem ? (
                      <div className="mt-3 space-y-3 rounded-md border bg-muted/20 p-3">
                        <div className="space-y-2">
                          <Label htmlFor={`brand${line.key}`}>
                            Brand / manufacturer preference
                          </Label>
                          <NativeSelect
                            id={`brand${line.key}`}
                            name={`brand${line.key}`}
                            value={line.preferredBrandId}
                            required={false}
                            onChange={(value) =>
                              updateLine(line.key, { preferredBrandId: value })
                            }
                          >
                            <option value="">No brand preference</option>
                            {itemBrandOptions.map((brand) => (
                              <option key={brand.id} value={brand.id}>
                                {brand.name} - {brand.availableWeightKg.toFixed(3)} kg
                              </option>
                            ))}
                          </NativeSelect>
                          {!line.preferredBrandId ? (
                            <p className="text-sm text-muted-foreground">
                              Picker chooses the brand/manufacturer during picking.
                            </p>
                          ) : null}
                          {selectedBrand && selectedBrand.availableWeightKg <= 0 ? (
                            <p className="text-sm font-medium text-amber-800">
                              Selected brand has no stock. Choose another brand or no brand preference.
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="text-sm font-medium">Customization</div>
                            <p className="text-sm text-muted-foreground">
                              Pick at least one chip in each group.
                            </p>
                          </div>
                          {selectedItem.customizationGroups.map((group) => (
                            <div key={group.name} className="space-y-2">
                              <div className="text-sm font-medium">{group.name}</div>
                              <div className="flex flex-wrap gap-2">
                                {group.options.map((option) => {
                                  const selected = (
                                    line.customization[group.name] ?? []
                                  ).includes(option)

                                  return (
                                    <Button
                                      key={option}
                                      type="button"
                                      variant={selected ? "default" : "outline"}
                                      className="min-h-11 whitespace-normal text-left"
                                      onClick={() =>
                                        toggleCustomization(line, group.name, option)
                                      }
                                    >
                                      {option}
                                    </Button>
                                  )
                                })}
                              </div>
                              {(line.customization[group.name] ?? []).length === 0 ? (
                                <p className="text-sm text-amber-800">
                                  Select {group.name.toLowerCase()}.
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                      <Input
                        aria-label="Customer request for item"
                        placeholder="Customer request"
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
                        Needs processing
                      </label>
                    </div>
                    {selectedItem?.requiresEstimatedKg &&
                    Number(line.estimatedWeightKg) <= 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Estimated kg is needed for picking.
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
          </section>

          <section hidden={step !== 4} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Step 4 Create Order</h2>
              <p className="text-sm text-muted-foreground">
                Save now. Final total price is entered after picking.
              </p>
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
                <Label htmlFor="remarks">Special price remark (optional)</Label>
                <Textarea id="remarks" name="remarks" />
                <p className="text-sm text-muted-foreground">
                  Use only for price notes. Final total price is entered after picking.
                </p>
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-sm font-semibold">Final order check</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Check the customer, items, and estimated kg before creating.
              </div>
              <div className="mt-3 grid gap-2 min-[390px]:grid-cols-4">
                {createOrderFinalSteps.map((stepLabel, index) => (
                  <div
                    key={stepLabel}
                    className="rounded-md border bg-background px-3 py-3"
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      Step {index + 1}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{stepLabel}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">Customer</div>
                <div className="break-words font-medium">{reviewCustomer}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">Order type</div>
                <div className="font-medium">{reviewOrderType}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">
                  Required date/time
                </div>
                <div className="break-words font-medium">
                  {scheduledAt ? scheduledAt.replace("T", " ") : "Not selected"}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">
                  Location / address
                </div>
                <div className="break-words font-medium">{reviewLocationDetail}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">Items</div>
                <div className="font-medium">{validLines.length}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">
                  Estimated weight
                </div>
                <div className="font-medium">
                  {totalEstimatedWeightKg.toFixed(3)} kg
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">Stock check</div>
                <div className="font-medium">Brand checked before save</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-muted-foreground">Final price</div>
                <div className="font-medium">Entered after picking</div>
              </div>
            </div>
            {validLines.length > 0 ? (
              <div className="space-y-2">
                {validLines.map((line) => {
                  const item = itemById(stockItems, line.itemId)

                  return (
                    <div key={line.key} className="rounded-md border p-3 text-sm">
                      <div className="break-words font-medium">
                        {item?.label || "Selected item"}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {line.orderingUnit === "KG"
                          ? "Weight order"
                          : `${line.orderingUnit.replaceAll("_", " ")} ${
                              line.requestedQuantity || "-"
                            }`}{" "}
                        - estimated {Number(line.estimatedWeightKg).toFixed(3)} kg
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
            {submitDisabled ? (
              <CreateOrderBlockedGuide
                reason={createDisabledReason ?? "Finish the missing details."}
                checks={createReadinessChecks}
              />
            ) : null}
            <ActionMessage state={state} />
            {state.status === "success" ? <CreateOrderSuccessNextStep /> : null}
            {state.status === "error" ? <CreateOrderErrorNextStep /> : null}
          </section>

          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              onClick={() => goToStep(Math.max(step - 1, 1))}
              disabled={step === 1}
            >
              Back
            </Button>
            {step < steps.length ? (
              <Button
                type="button"
                className="min-h-12"
                onClick={() => goToStep(Math.min(step + 1, steps.length))}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={pending || submitDisabled}
                className="min-h-12"
              >
                <Check className="size-4" />
                {pending ? "Creating..." : "Create Order"}
              </Button>
            )}
          </div>
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

export function QuickCustomerNamePhoneForm({
  profile,
}: {
  profile: CurrentProfile
}) {
  const [state, formAction, pending] = useActionState(
    quickAddCustomerAction,
    initialOrdersActionState
  )

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="outletId" value={profile.outletId ?? ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="simpleCustomerName">Name</Label>
          <Input
            id="simpleCustomerName"
            name="name"
            required
            className="min-h-11 text-base md:text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="simpleCustomerPhone">Phone</Label>
          <Input
            id="simpleCustomerPhone"
            name="phone"
            required
            className="min-h-11 text-base md:text-sm"
          />
        </div>
      </div>
      <ActionMessage state={state} />
      <Button type="submit" disabled={pending} className="min-h-11 w-full sm:w-auto">
        <Plus className="size-4" />
        {pending ? "Saving..." : "Save customer"}
      </Button>
    </form>
  )
}

export function PickupCompletedButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(
    markPickupCompletedAction,
    initialOrdersActionState
  )

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" disabled={pending} className="min-h-11 w-full">
        <Check className="size-4" />
        {pending ? "Saving..." : "Mark Picked Up"}
      </Button>
      <ActionMessage state={state} />
    </form>
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
      <input type="hidden" name="totalOrderPrice" value={order.totalOrderPrice} />
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
  pickingEntries,
  selectedOrderId,
}: {
  orders: CustomerOrder[]
  items: CustomerOrderItem[]
  pickingEntries: OrderPickingEntry[]
  selectedOrderId?: string
}) {
  const [scanState, scanAction, scanPending] = useActionState(
    pickOrderBarcodeAction,
    initialOrdersActionState
  )
  const [manualState, manualAction, manualPending] = useActionState(
    manualPickWeightAction,
    initialOrdersActionState
  )
  const [readyState, readyAction, readyPending] = useActionState(
    markCustomerOrderReadyAction,
    initialOrdersActionState
  )
  const scanInputRef = useRef<HTMLInputElement>(null)
  const pickingOrders = orders.filter((order) =>
    ["NEW", "PREPARING"].includes(order.status)
  )
  const [orderId, setOrderId] = useState(selectedOrderId ?? "")
  const [activeOrderItemId, setActiveOrderItemId] = useState("")
  const selectedOrderIdValue = pickingOrders.some((order) => order.id === orderId)
    ? orderId
    : ""
  const selectedOrder = pickingOrders.find(
    (order) => order.id === selectedOrderIdValue
  )
  const orderItems = items.filter(
    (item) => item.orderId === selectedOrderIdValue
  )
  const activeOrderItemIdValue = orderItems.some(
    (item) => item.id === activeOrderItemId
  )
    ? activeOrderItemId
    : orderItems[0]?.id ?? ""
  const activeOrderItem = orderItems.find(
    (item) => item.id === activeOrderItemIdValue
  )
  const recentEntries = pickingEntries
    .filter((entry) => entry.orderId === selectedOrderIdValue)
    .slice(0, 8)
  const estimatedWeightKg = orderItems.reduce(
    (sum, item) => sum + item.estimatedWeightKg,
    0
  )
  const pickedWeightKg = orderItems.reduce(
    (sum, item) => sum + item.preparedWeightKg,
    0
  )
  const remainingWeightKg = Math.max(estimatedWeightKg - pickedWeightKg, 0)
  const totalProgress =
    estimatedWeightKg > 0
      ? Math.min(100, Math.round((pickedWeightKg / estimatedWeightKg) * 100))
      : 0
  const hasPickedWeight = pickedWeightKg > 0
  const hasOutOfTolerance = orderItems.some(
    (item) => item.preparedWeightKg > 0 && !item.withinTolerance
  )
  const allWithinTolerance =
    orderItems.length > 0 &&
    orderItems.every(
      (item) => item.preparedWeightKg > 0 && item.withinTolerance
    )
  const canPick = Boolean(selectedOrderIdValue && activeOrderItemIdValue)
  const canMarkReady = canPick && orderItems.length > 0

  useEffect(() => {
    if (!scanState.message) {
      return
    }

    if (scanState.status === "success") {
      scanInputRef.current?.form?.reset()
    }

    scanInputRef.current?.focus()
  }, [scanState.message, scanState.status])

  function kg(value: number) {
    return `${value.toFixed(2)} kg`
  }

  function orderWeightSummary(order: CustomerOrder) {
    const orderItemsForCard = items.filter((item) => item.orderId === order.id)
    const estimated = orderItemsForCard.reduce(
      (sum, item) => sum + item.estimatedWeightKg,
      0
    )
    const picked = orderItemsForCard.reduce(
      (sum, item) => sum + item.preparedWeightKg,
      0
    )
    const stockNotEnough = orderItemsForCard.some((item) => item.stockNotEnough)

    return {
      estimated,
      picked,
      remaining: Math.max(estimated - picked, 0),
      stockNotEnough,
    }
  }

  return (
    <div className="space-y-4">
      <PickingFastPath />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Picking workstation</CardTitle>
          <CardDescription>
            Scan continuously or enter manual weight with a reason.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label>Choose order</Label>
              <p className="text-sm text-muted-foreground">
                Open one order, then scan or enter manual weight.
              </p>
            </div>
            {pickingOrders.length === 0 ? (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                No orders are currently open for picking.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {pickingOrders.map((order) => {
                  const summary = orderWeightSummary(order)
                  const isSelected = selectedOrderIdValue === order.id

                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setOrderId(order.id)}
                      disabled={Boolean(selectedOrderId)}
                      className={
                        isSelected
                          ? "min-h-32 rounded-md border border-primary bg-primary/5 p-4 text-left shadow-xs"
                          : "min-h-32 rounded-md border bg-background p-4 text-left shadow-xs"
                      }
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="break-words text-base font-semibold">
                            {order.orderNo}
                          </div>
                          <div className="mt-1 break-words text-sm text-muted-foreground">
                            {order.customerName}
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge variant="secondary">
                            {order.fulfillmentType.replaceAll("_", " ")}
                          </Badge>
                          {summary.stockNotEnough ? (
                            <Badge variant="warning">Stock not enough</Badge>
                          ) : (
                            <Badge variant="success">Stock ok</Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Required
                          </div>
                          <div className="font-medium">
                            {kg(summary.estimated)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Picked
                          </div>
                          <div className="font-medium">{kg(summary.picked)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Left
                          </div>
                          <div className="font-medium">
                            {kg(summary.remaining)}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            <details className="rounded-md border bg-muted/20">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                Simple order list
              </summary>
              <div className="border-t p-3">
                <NativeSelect
                  id="pickerOrderId"
                  name="pickerOrderId"
                  value={selectedOrderIdValue}
                  onChange={setOrderId}
                  disabled={pickingOrders.length === 0 || Boolean(selectedOrderId)}
                  required={false}
                >
                  <option value="">Select order</option>
                  {pickingOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.orderNo} - {order.customerName}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </details>
          </div>

          {selectedOrder ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-lg font-semibold">
                      {selectedOrder.orderNo}
                    </div>
                    <div className="mt-1 break-words text-sm text-muted-foreground">
                      {selectedOrder.customerName}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="secondary">
                      {selectedOrder.status.replaceAll("_", " ")}
                    </Badge>
                    {orderItems.some((item) => item.stockNotEnough) ? (
                      <Badge variant="warning">Stock not enough</Badge>
                    ) : (
                      <Badge variant="success">Stock ok</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Required</div>
                  <div className="text-xl font-semibold">
                    {kg(estimatedWeightKg)}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Picked</div>
                  <div className="text-xl font-semibold">
                    {kg(pickedWeightKg)}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Remaining</div>
                  <div className="text-xl font-semibold">
                    {kg(remainingWeightKg)}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Tolerance</div>
                  <div className="text-xl font-semibold">10.00 kg</div>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="font-medium">Total order progress</div>
                  <div className="tabular-nums text-muted-foreground">
                    {totalProgress}%
                  </div>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${totalProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              Choose an order to start picking.
            </div>
          )}

          {hasOutOfTolerance ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              One or more items are outside the 10kg tolerance. Check the picked
              weight before completing picking.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-2 min-[390px]:grid-cols-2">
        <Button asChild variant="secondary" className="min-h-12">
          <a href="#scan-barcode-action">
            <ScanLine className="size-4" />
            Scan Barcode
          </a>
        </Button>
        <Button asChild variant="outline" className="min-h-12">
          <a href="#manual-weight-action">Manual Weight</a>
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card id="scan-barcode-action">
          <CardHeader>
            <CardTitle className="text-lg">Scan barcode</CardTitle>
            <CardDescription>
              Select item first. Wrong item scans show a warning, then choose
              Scan correct barcode or Manual Weight. Duplicate barcodes are blocked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={scanAction} className="space-y-4">
              <input type="hidden" name="orderId" value={selectedOrderIdValue} />
              <input
                type="hidden"
                name="orderItemId"
                value={activeOrderItemIdValue}
              />
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="text-muted-foreground">Picking item</div>
                <div className="mt-1 font-medium">
                  {activeOrderItem
                    ? activeOrderItem.itemLabel
                    : "Tap an item below first"}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    id="barcode"
                    ref={scanInputRef}
                    name="barcode"
                    required
                    autoFocus
                    autoComplete="off"
                    placeholder="Scan or type barcode"
                    disabled={!canPick}
                    className="min-h-12 text-base md:text-sm"
                  />
                  <Button
                    type="submit"
                    className="min-h-12 w-full sm:w-auto"
                    aria-label="Save scanned barcode"
                    disabled={scanPending || !canPick}
                  >
                    <ScanLine className="size-4" />
                    {scanPending ? "Saving..." : "Scan Barcode"}
                  </Button>
                </div>
              </div>
              <ActionMessage state={scanState} />
              <PickingMismatchGuide state={scanState} />
            </form>
          </CardContent>
        </Card>

        <Card id="manual-weight-action">
          <CardHeader>
            <CardTitle className="text-lg">Manual weight</CardTitle>
            <CardDescription>
              Use only when barcode picking is not possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={manualAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manualOrderItemId">Order item</Label>
                <NativeSelect
                  id="manualOrderItemId"
                  name="orderItemId"
                  value={activeOrderItemIdValue}
                  onChange={setActiveOrderItemId}
                  disabled={orderItems.length === 0}
                >
                  <option value="">Select item</option>
                  {orderItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemLabel} - remaining {kg(item.remainingWeightKg)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pickedWeightKg">Picked kg</Label>
                  <Input
                    id="pickedWeightKg"
                    name="pickedWeightKg"
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    placeholder="Picked kg"
                    required
                    disabled={orderItems.length === 0}
                    className="min-h-11 text-base md:text-sm"
                  />
                  {activeOrderItem?.orderingUnit === "KG" ? (
                    <p className="text-sm text-muted-foreground">
                      Weight items use picked kg only.
                    </p>
                  ) : null}
                </div>
                {activeOrderItem?.orderingUnit !== "KG" ? (
                  <div className="space-y-2">
                    <Label htmlFor="pickedQuantity">
                      {activeOrderItem?.orderingUnit.replaceAll("_", " ") ??
                        "Item"}{" "}
                      quantity
                    </Label>
                    <Input
                      id="pickedQuantity"
                      name="pickedQuantity"
                      type="number"
                      min="0"
                      step="0.001"
                      inputMode="decimal"
                      placeholder="Picked quantity"
                      disabled={orderItems.length === 0}
                      className="min-h-11 text-base md:text-sm"
                    />
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualReason">Reason</Label>
                <NativeSelect
                  id="manualReason"
                  name="manualReason"
                  disabled={orderItems.length === 0}
                >
                  {manualPickReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason.replaceAll("_", " ")}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualNotes">Notes</Label>
                <Textarea
                  id="manualNotes"
                  name="notes"
                  disabled={orderItems.length === 0}
                />
              </div>
              <ActionMessage state={manualState} />
              <SubmitButton pending={manualPending} disabled={orderItems.length === 0}>
                Save manual weight
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pick items</CardTitle>
            <CardDescription>
              Tap an item, then scan barcode or enter weight.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderItems.length === 0 ? (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                Select an order to see items.
              </div>
            ) : null}
            {orderItems.map((item) => {
              const progress =
                item.estimatedWeightKg > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (item.preparedWeightKg / item.estimatedWeightKg) * 100
                      )
                    )
                  : 0
              const outsideTolerance =
                item.preparedWeightKg > 0 && !item.withinTolerance

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveOrderItemId(item.id)}
                  className={
                    activeOrderItemIdValue === item.id
                      ? "w-full rounded-md border border-primary bg-primary/5 p-3 text-left"
                      : "w-full rounded-md border p-3 text-left"
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{item.itemLabel}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Estimated {kg(item.estimatedWeightKg)} - Picked{" "}
                        {kg(item.preparedWeightKg)} - Remaining{" "}
                        {kg(item.remainingWeightKg)}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Brand / manufacturer:{" "}
                        {item.preferredBrandName ||
                          "No preference - scan the brand/manufacturer you pick"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.stockNotEnough ? (
                        <Badge variant="warning">Stock not enough</Badge>
                      ) : (
                        <Badge variant="success">Stock ok</Badge>
                      )}
                      {item.processingRequired ? (
                        <Badge variant="secondary">Processing</Badge>
                      ) : null}
                      {outsideTolerance ? (
                        <Badge variant="warning">Check tolerance</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {Object.keys(item.customization).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(item.customization).flatMap(([group, options]) =>
                        options.map((option) => (
                          <Badge key={`${item.id}-${group}-${option}`} variant="outline">
                            {group}: {option}
                          </Badge>
                        ))
                      )}
                    </div>
                  ) : null}
                  {item.itemRequestRemarks || item.notes ? (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {item.itemRequestRemarks || item.notes}
                    </div>
                  ) : null}
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Finish picking</CardTitle>
            <CardDescription>
              Complete picking after all items are picked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={readyAction} className="space-y-4">
              <input type="hidden" name="orderId" value={selectedOrderIdValue} />
              {hasOutOfTolerance ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Picked weight is outside tolerance. Complete Picking is blocked
                  until the weights are corrected.
                </div>
              ) : allWithinTolerance ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  All picked items are within tolerance.
                </div>
              ) : (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Pick all order items before completing picking.
                </div>
              )}
              <ActionMessage state={readyState} />
              <PickingSuccessNextStep
                scanState={scanState}
                manualState={manualState}
                readyState={readyState}
              />
              <Button
                type="submit"
                disabled={readyPending || !canMarkReady || !hasPickedWeight}
                className="min-h-12 w-full"
              >
                <Check className="size-4" />
                {readyPending ? "Saving..." : "Complete Picking"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <details className="rounded-md border bg-background">
        <summary className="cursor-pointer px-4 py-3 text-base font-semibold">
          Recent picks
        </summary>
        <div className="border-t px-4 pb-4 pt-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Saved scans and manual weights appear here.
          </p>
          <div className="space-y-3">
          {recentEntries.length === 0 ? (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              No picking entries yet.
            </div>
          ) : null}
          {recentEntries.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{entry.itemLabel}</div>
                <Badge
                  variant={
                    entry.entryType === "MISMATCH"
                      ? "warning"
                      : entry.entryType === "BARCODE_SCAN"
                        ? "success"
                        : "secondary"
                  }
                >
                  {entry.entryType.replaceAll("_", " ")}
                </Badge>
              </div>
              <div className="mt-1 text-muted-foreground">
                {entry.barcode && entry.barcode !== "-"
                  ? `Barcode ${entry.barcode}`
                  : entry.manualReason?.replaceAll("_", " ") ?? "Manual entry"}{" "}
                - {kg(entry.pickedWeightKg)}
              </div>
              {entry.mismatchMessage ? (
                <div className="mt-1 text-amber-800">{entry.mismatchMessage}</div>
              ) : null}
              <div className="mt-1 text-xs text-muted-foreground">
                {entry.createdByName} - {entry.createdAt.replace("T", " ").slice(0, 16)}
              </div>
            </div>
          ))}
          </div>
        </div>
      </details>
    </div>
  )
}

export function MarkReadyForm({
  orders,
}: {
  orders: CustomerOrder[]
}) {
  const readyCandidates = orders.filter((order) =>
    ["NEW", "PREPARING"].includes(order.status)
  )

  return (
    <WorkflowCard
      title="Complete picking"
      description="Completed picking moves the order to Price Required."
      action={markCustomerOrderReadyAction}
      submitLabel="Complete picking"
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

export function FinalOrderPriceForm({ orders }: { orders: CustomerOrder[] }) {
  const priceOrders = orders.filter(
    (order) => order.status === "READY" && order.totalOrderPrice <= 0
  )
  const singlePriceOrder = priceOrders.length === 1 ? priceOrders[0] : null

  return (
    <WorkflowCard
      title="Enter final price"
      description="One total for the whole order. No item prices."
      action={setCustomerOrderFinalPriceAction}
      submitLabel="Save final price"
      submitDisabled={priceOrders.length === 0}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {singlePriceOrder ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <input type="hidden" name="orderId" value={singlePriceOrder.id} />
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Order
            </div>
            <div className="mt-1 font-semibold">{singlePriceOrder.orderNo}</div>
            <div className="break-words text-muted-foreground">
              {singlePriceOrder.customerName}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="finalPriceOrderId">Order</Label>
            <NativeSelect
              id="finalPriceOrderId"
              name="orderId"
              disabled={priceOrders.length === 0}
            >
              <option value="">Select order</option>
              {priceOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNo} - {order.customerName}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="finalTotalOrderPrice">Final total price</Label>
          <Input
            id="finalTotalOrderPrice"
            name="totalOrderPrice"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="Final total only"
            required
            disabled={priceOrders.length === 0}
            className="min-h-11 text-base md:text-sm"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Pickup moves to Ready for Pickup. Delivery moves to Pending Delivery.
        Internal transfer moves to the Internal Transfer section.
      </p>
    </WorkflowCard>
  )
}

export function CreateOrderDeliveryForm({ order }: { order: CustomerOrder }) {
  const disabled =
    !order.deliveryRequired ||
    order.fulfillmentType === "PICKUP" ||
    order.status !== "READY_FOR_DELIVERY" ||
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
      {pickupOrders.length > 0 ? (
        <WorkflowCard
          title="Pickup completed"
          description="Staff taps this when customer pickup is complete."
          action={markPickupCompletedAction}
          submitLabel="Picked up"
        >
          <div className="space-y-2">
            <Label htmlFor="pickupOrderId">Pickup order</Label>
            <NativeSelect id="pickupOrderId" name="orderId">
              <option value="">Select pickup order</option>
              {pickupOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNo} - {order.customerName}
                </option>
              ))}
            </NativeSelect>
          </div>
        </WorkflowCard>
      ) : null}

      {cancellableOrders.length > 0 ? (
        <WorkflowCard
          title="Cancel order"
          description="Cancelling releases active reservations."
          action={cancelCustomerOrderAction}
          submitLabel="Cancel order"
        >
          <div className="space-y-2">
            <Label htmlFor="cancelOrderId">Order</Label>
            <NativeSelect id="cancelOrderId" name="orderId">
              <option value="">Select order</option>
              {cancellableOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNo} - {order.customerName} - {orderWorkflowLabel(order)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellationReason">Reason</Label>
            <Textarea id="cancellationReason" name="cancellationReason" required />
          </div>
        </WorkflowCard>
      ) : null}
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
                {order.orderNo} - {order.customerName} - {orderWorkflowLabel(order)}
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
