"use client"

import { Save } from "lucide-react"
import Link from "next/link"
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ComponentProps,
  type MutableRefObject,
  type ReactNode,
} from "react"

import {
  approveDamageRequestAction,
  approveReturnSupplierRequestAction,
  approveStockTakeAction,
  barcodeInboundAction,
  confirmDirectOutboundAction,
  createBrandAction,
  createDamageRequestAction,
  createInboundBrandAction,
  createReturnSupplierRequestAction,
  createItemAction,
  createLocationAction,
  createOriginAction,
  createStockTakeSessionAction,
  logInboundScanIssueAction,
  logStockScanIssueAction,
  mergeBrandAction,
  mergeItemAction,
  receiveTransferAction,
  releaseInspectionStockAction,
  rejectDamageRequestAction,
  rejectReturnSupplierRequestAction,
  rejectStockTakeAction,
  reviewDamageRequestAction,
  returnStockAction,
  reviewStockTakeAction,
  scanStockTakeBarcodeAction,
  submitStockTakeAction,
  transferAction,
  undoInboundScanAction,
  undoInboundSessionAction,
  updateItemAction,
} from "@/lib/stock/actions"
import {
  initialStockActionState,
  type StockActionState,
} from "@/lib/stock/action-state"
import {
  generatedItemCode,
  isNumericItemCode,
  nextItemCode,
} from "@/lib/stock/item-code"
import { outboundUnitBlockReason } from "@/lib/stock/outbound-rules"
import { activeStockStatus } from "@/lib/stock/unit-status-rules"
import { stockDamageReasons } from "@/lib/stock/types"
import type {
  Brand,
  BarcodeWeightRule,
  Item,
  Origin,
  StockDamageRequest,
  StockLocation,
  StockMovement,
  StockOutlet,
  StockReturnSupplierRequest,
  StockTakeLine,
  StockTakeSession,
  StockUnit,
  StockDamageReason,
  StockMovementType,
} from "@/lib/stock/types"
import type { CustomerOption } from "@/lib/orders/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input as BaseInput } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BarcodeField } from "@/components/stock/barcode-scanner"
import {
  StockLabelPreview,
  StockLabelPrintActions,
  StockLabelPrintArea,
  StockLabelPrintNote,
} from "@/components/stock/stock-label"
import {
  decodeBarcodeWeight,
  inferBarcodeWeightRuleWithStatus,
} from "@/lib/stock/barcode-weight"
import {
  internalBarcodeSerial,
  makeUniqueInternalBarcode,
} from "@/lib/stock/barcode-label"
import { stockDisplayItemName, stockProductName } from "@/lib/stock/display-names"

type StatefulAction = (
  state: StockActionState,
  formData: FormData
) => Promise<StockActionState>

function Input({ className, ...props }: ComponentProps<typeof BaseInput>) {
  return (
    <BaseInput
      className={["min-h-11 text-base sm:text-sm", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  )
}

function ActionMessage({ state }: { state: StockActionState }) {
  if (!state.message && !state.warning) {
    return null
  }

  return (
    <div className="space-y-2">
      {state.message ? (
        <div
          role={state.status === "success" ? "status" : "alert"}
          aria-live={state.status === "success" ? "polite" : "assertive"}
          className={
            state.status === "success"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm break-words text-emerald-700"
              : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm break-words text-red-700"
          }
        >
          {state.message}
        </div>
      ) : null}
      {state.warning ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium break-words text-amber-800"
        >
          {state.warning}
        </div>
      ) : null}
    </div>
  )
}

type StockIssueType =
  | "DUPLICATE_BARCODE"
  | "BARCODE_LENGTH_MISMATCH"
  | "BARCODE_NOT_FOUND"
  | "WRONG_LOCATION"
  | "WRONG_ITEM"
  | "UNAVAILABLE_STOCK"
  | "BARCODE_RULE_DETECTION_FAILURE"
  | "UNKNOWN_BARCODE_STOCK_TAKE"
  | "STOCK_TAKE_MISMATCH"
  | "TRANSFER_MISSING_ITEM"
  | "TRANSFER_UNEXPECTED_ITEM"
  | "SPOILED_DAMAGED_REVIEW"

type WorkerScanIssueInput = {
  barcode: string
  action: StockMovementType
  message: string
  issueType: StockIssueType
  locationId?: string | null
  itemId?: string | null
  selectedItemId?: string | null
  expectedLocationId?: string | null
  scannedLocationId?: string | null
  expectedStatus?: string | null
  scannedStatus?: string | null
  relatedSessionId?: string | null
  relatedOrderId?: string | null
  relatedCustomerId?: string | null
  relatedTransferId?: string | null
  expectedBarcode?: string | null
  receivedBarcode?: string | null
}

const directOutboundIssueActions: Record<string, StockMovementType> = {
  SALES: "OUTBOUND_SALES",
  PROCESSING: "OUTBOUND_PROCESSING",
  TRANSFER: "OUTBOUND_TRANSFER",
  DAMAGE_SPOILAGE: "OUTBOUND_SPOILED",
  RETURN_SUPPLIER: "OUTBOUND_RETURN_SUPPLIER",
  SAMPLE_TESTING: "OUTBOUND_SAMPLE_TESTING",
}

function setIssueFormValue(
  formData: FormData,
  key: keyof WorkerScanIssueInput,
  value: string | null | undefined
) {
  if (value) {
    formData.set(key, value)
  }
}

function logWorkerScanIssue(
  loggedKeys: MutableRefObject<Set<string>>,
  input: WorkerScanIssueInput
) {
  const barcode = input.barcode.trim()

  if (!barcode) {
    return
  }

  const key = [
    input.action,
    input.issueType,
    barcode,
    input.locationId ?? "",
    input.itemId ?? "",
    input.selectedItemId ?? "",
    input.expectedLocationId ?? "",
    input.scannedLocationId ?? "",
    input.expectedStatus ?? "",
    input.scannedStatus ?? "",
    input.relatedSessionId ?? "",
    input.relatedOrderId ?? "",
    input.relatedCustomerId ?? "",
    input.relatedTransferId ?? "",
    input.expectedBarcode ?? "",
    input.receivedBarcode ?? "",
  ].join(":")

  if (loggedKeys.current.has(key)) {
    return
  }

  loggedKeys.current.add(key)

  const formData = new FormData()
  formData.set("barcode", barcode)
  formData.set("action", input.action)
  formData.set("message", input.message)
  formData.set("issueType", input.issueType)
  setIssueFormValue(formData, "locationId", input.locationId)
  setIssueFormValue(formData, "itemId", input.itemId)
  setIssueFormValue(formData, "selectedItemId", input.selectedItemId)
  setIssueFormValue(formData, "expectedLocationId", input.expectedLocationId)
  setIssueFormValue(formData, "scannedLocationId", input.scannedLocationId)
  setIssueFormValue(formData, "expectedStatus", input.expectedStatus)
  setIssueFormValue(formData, "scannedStatus", input.scannedStatus)
  setIssueFormValue(formData, "relatedSessionId", input.relatedSessionId)
  setIssueFormValue(formData, "relatedOrderId", input.relatedOrderId)
  setIssueFormValue(formData, "relatedCustomerId", input.relatedCustomerId)
  setIssueFormValue(formData, "relatedTransferId", input.relatedTransferId)
  setIssueFormValue(formData, "expectedBarcode", input.expectedBarcode)
  setIssueFormValue(formData, "receivedBarcode", input.receivedBarcode)

  void logStockScanIssueAction(formData).catch(() => {
    loggedKeys.current.delete(key)
  })
}

function NativeSelect({
  id,
  name,
  children,
  value,
  onChange,
  required = true,
  disabled = false,
}: {
  id: string
  name: string
  children: ReactNode
  value?: string
  onChange?: (value: string) => void
  required?: boolean
  disabled?: boolean
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      required={required}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
      className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-sm"
    >
      {children}
    </select>
  )
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" })
}

function canonicalUiName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function SubmitButton({
  pending,
  disabled = false,
  children,
  className,
}: {
  pending: boolean
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className={["min-h-11 w-full gap-2 sm:w-auto", className]
        .filter(Boolean)
        .join(" ")}
    >
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
}: {
  title: string
  description: string
  action: StatefulAction
  children: ReactNode
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialStockActionState
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
          <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

function ItemSelect({
  items,
  brands = [],
  value,
  onChange,
  manufacturerName = "",
  disabled = false,
  allowOther = false,
  customLabel = "Other / custom product",
}: {
  items: Item[]
  brands?: Brand[]
  value?: string
  onChange?: (value: string) => void
  manufacturerName?: string
  disabled?: boolean
  allowOther?: boolean
  customLabel?: string
}) {
  const activeItems = items
    .filter((item) => item.active)
    .sort((a, b) => {
      const aBrand = a.defaultBrandId
        ? brands.find((brand) => brand.id === a.defaultBrandId)
        : undefined
      const bBrand = b.defaultBrandId
        ? brands.find((brand) => brand.id === b.defaultBrandId)
        : undefined
      const aName = manufacturerName
        ? formatProductName(a, { name: manufacturerName })
        : formatProductName(a, aBrand)
      const bName = manufacturerName
        ? formatProductName(b, { name: manufacturerName })
        : formatProductName(b, bBrand)

      return compareText(aName, bName)
    })

  return (
    <NativeSelect
      id="itemId"
      name="itemId"
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      <option value="">Select product</option>
      {activeItems.map((item) => {
        const itemDefaultBrand = item.defaultBrandId
          ? brands.find((brand) => brand.id === item.defaultBrandId)
          : undefined
        const displayName = manufacturerName
          ? formatProductName(item, { name: manufacturerName })
          : formatProductName(item, itemDefaultBrand)

        return (
          <option key={item.id} value={item.id}>
            {displayName} / {item.itemCode}
          </option>
        )
      })}
      {allowOther ? <option value="__other">{customLabel}</option> : null}
    </NativeSelect>
  )
}

function BrandSelect({
  brands,
  value,
  onChange,
  allowOther = false,
  required = false,
  disabled = false,
  emptyLabel = "No manufacturer",
  customLabel = "Other / custom manufacturer",
}: {
  brands: Brand[]
  value?: string
  onChange?: (value: string) => void
  allowOther?: boolean
  required?: boolean
  disabled?: boolean
  emptyLabel?: string
  customLabel?: string
}) {
  const activeBrands = brands
    .filter((brand) => brand.active)
    .sort((a, b) => compareText(a.name, b.name))

  return (
    <NativeSelect
      id="brandId"
      name="brandId"
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
    >
      <option value="">{emptyLabel}</option>
      {activeBrands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
      {allowOther ? <option value="__other">{customLabel}</option> : null}
    </NativeSelect>
  )
}

function OriginSelect({
  origins,
  value,
  onChange,
  allowOther = false,
  required = false,
  disabled = false,
}: {
  origins: Origin[]
  value?: string
  onChange?: (value: string) => void
  allowOther?: boolean
  required?: boolean
  disabled?: boolean
}) {
  const activeOrigins = origins
    .filter((origin) => origin.active)
    .sort((a, b) => compareText(a.name, b.name))

  return (
    <NativeSelect
      id="originId"
      name="originId"
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
    >
      <option value="">Select origin</option>
      {activeOrigins.map((origin) => (
        <option key={origin.id} value={origin.id}>
          {origin.name}
        </option>
      ))}
      {allowOther ? <option value="__other">Other / custom origin</option> : null}
    </NativeSelect>
  )
}

function LocationSelect({
  locations,
  id = "locationId",
  name = "locationId",
  value,
  onChange,
  disabled = false,
}: {
  locations: StockLocation[]
  id?: string
  name?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
}) {
  const activeLocations = locations
    .filter((location) => location.active)
    .sort((a, b) => compareText(a.name, b.name))

  return (
    <NativeSelect
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      <option value="">Select location</option>
      {activeLocations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function transferDestinationOptions(
  outlets: StockOutlet[],
  locations: StockLocation[],
  excludeLocationId?: string | null
) {
  const activeLocations = locations.filter(
    (location) => location.active && location.id !== excludeLocationId
  )
  const usedLocationIds = new Set<string>()
  const outletOptions = outlets
    .map((outlet) => {
      const defaultLocation =
        activeLocations.find(
          (location) =>
            location.outletId === outlet.id && location.isDefaultForOutlet
        ) ??
        activeLocations.find((location) => location.outletId === outlet.id)

      if (!defaultLocation) {
        return null
      }

      usedLocationIds.add(defaultLocation.id)

      return {
        optionId: outlet.id,
        outletName: outlet.name,
        locationId: defaultLocation.id,
        locationName: defaultLocation.name,
      }
    })
    .filter(
      (
        option
      ): option is {
        optionId: string
        outletName: string
        locationId: string
        locationName: string
      } => option !== null
    )

  const fallbackLocationOptions = activeLocations
    .filter((location) => !usedLocationIds.has(location.id))
    .map((location) => ({
      optionId: `location-${location.id}`,
      outletName: location.name,
      locationId: location.id,
      locationName: location.name,
    }))

  return [...outletOptions, ...fallbackLocationOptions]
}

function DestinationOutletSelect({
  outlets,
  locations,
  id,
  name,
  value,
  onChange,
  quickLabel = "Quick destinations",
  helperText = "Tap destination to scan faster.",
  selectedLabel = "Selected stock location",
  excludeLocationId = null,
}: {
  outlets: StockOutlet[]
  locations: StockLocation[]
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  quickLabel?: string
  helperText?: string
  selectedLabel?: string
  excludeLocationId?: string | null
}) {
  const options = transferDestinationOptions(outlets, locations, excludeLocationId)
  const [locationQuery, setLocationQuery] = useState("")
  const selectedOption =
    options.find((option) => option.locationId === value) ?? null
  const normalizedLocationQuery = locationQuery.trim().toLowerCase()
  const filteredOptions = normalizedLocationQuery
    ? options.filter((option) =>
        [option.locationName, option.outletName].some((label) =>
          label.toLowerCase().includes(normalizedLocationQuery)
        )
      )
    : options
  const selectOptions =
    selectedOption &&
    !filteredOptions.some(
      (option) => option.optionId === selectedOption.optionId
    )
      ? [selectedOption, ...filteredOptions]
      : filteredOptions

  function chooseDestination(option: (typeof options)[number]) {
    setLocationQuery(option.locationName)
    onChange(option.locationId)
  }

  return (
    <>
      <input type="hidden" name={name} value={value} />
      {options.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">{quickLabel}</div>
          <Input
            id={`${id}Search`}
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder="Search stock location"
            autoComplete="off"
            enterKeyHint="search"
          />
          <div className="grid gap-2 min-[390px]:grid-cols-2">
            {filteredOptions.slice(0, 8).map((option) => {
              const selected = selectedOption?.locationId === option.locationId

              return (
                <Button
                  key={option.optionId}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                  aria-pressed={selected}
                  onClick={() => chooseDestination(option)}
                >
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <span className="break-words">{option.locationName}</span>
                    {option.outletName !== option.locationName ? (
                      <span className="break-words text-xs opacity-80">{option.outletName}</span>
                    ) : null}
                  </span>
                </Button>
              )
            })}
          </div>
          {filteredOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No matching stock location.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {helperText}
          </p>
        </div>
      ) : null}
      <NativeSelect
        id={id}
        name={`${name}Outlet`}
        value={selectedOption?.optionId ?? ""}
        onChange={(optionId) => {
          const option = options.find((candidate) => candidate.optionId === optionId)
          if (!option) {
            setLocationQuery("")
            onChange("")
            return
          }

          chooseDestination(option)
        }}
      >
        <option value="">Select stock location</option>
        {selectOptions.map((option) => (
          <option key={option.optionId} value={option.optionId}>
            {option.locationName}
            {option.outletName !== option.locationName
              ? ` - ${option.outletName}`
              : ""}
          </option>
        ))}
      </NativeSelect>
      {selectedOption ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {selectedLabel}: {selectedOption.locationName}
        </div>
      ) : null}
    </>
  )
}

export function ItemMasterForm({
  items,
  brands,
}: {
  items: Item[]
  brands: Brand[]
}) {
  const [category, setCategory] = useState("MEAT")
  const [defaultBrandId, setDefaultBrandId] = useState("")
  const [section, setSection] = useState("")
  const [name, setName] = useState("")
  const [itemCode, setItemCode] = useState(() => generatedItemCode(items))
  const [itemCodeEdited, setItemCodeEdited] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState("")
  const [editItemQuery, setEditItemQuery] = useState("")
  const createNameInputRef = useRef<HTMLInputElement | null>(null)
  const editNameInputRef = useRef<HTMLInputElement | null>(null)
  const createItemFormAction: StatefulAction = async (
    previousState,
    formData
  ) => {
    const result = await createItemAction(previousState, formData)

    if (result.status === "success" && result.message === "Item created.") {
      setDefaultBrandId("")
      setSection("")
      setName("")
      setItemCode(nextItemCode(itemCode))
      setItemCodeEdited(false)
      window.setTimeout(() => createNameInputRef.current?.focus(), 0)
    }

    return result
  }
  const [createState, createAction, createPending] = useActionState(
    createItemFormAction,
    initialStockActionState
  )
  const [updateState, updateAction, updatePending] = useActionState(
    updateItemAction,
    initialStockActionState
  )
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const filteredEditItems = useMemo(() => {
    const query = editItemQuery.trim().toLowerCase()

    if (!query) {
      return items
    }

    return items.filter((item) => {
      const defaultBrand = item.defaultBrandId
        ? brands.find((brand) => brand.id === item.defaultBrandId)
        : undefined

      return [
        item.itemCode,
        item.category,
        item.section,
        item.name,
        stockProductName(item, ""),
        formatProductName(item, defaultBrand),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [items, brands, editItemQuery])
  const canCreateItem =
    isNumericItemCode(itemCode) &&
    name.trim().length >= 2
  const canUpdateItem = Boolean(selectedItem)

  function updateGeneratedCode(next: {
    itemCode?: string
  }) {
    if (!itemCodeEdited) {
      setItemCode(next.itemCode ?? generatedItemCode(items))
    }
  }

  function selectEditItem(nextItemId: string) {
    setSelectedItemId(nextItemId)
    if (nextItemId) {
      window.setTimeout(() => editNameInputRef.current?.focus(), 0)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create item</CardTitle>
          <CardDescription>
            Item code is generated. Workers only need category and product name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              Required item setup: item code, category, product name.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="itemCode">Item code</Label>
                <Input
                  id="itemCode"
                  name="itemCode"
                  value={itemCode}
                  required
                  onChange={(event) => {
                    setItemCodeEdited(true)
                    setItemCode(event.target.value)
                  }}
                  placeholder="0007"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  enterKeyHint="done"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <NativeSelect
                  id="category"
                  name="category"
                  value={category}
                  onChange={(value) => {
                    setCategory(value)
                    updateGeneratedCode({})
                  }}
                >
                  <option value="MEAT">MEAT</option>
                  <option value="ORGANS">ORGANS</option>
                  <option value="PROCESSED">PROCESSED</option>
                </NativeSelect>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Product name</Label>
                <Input
                  ref={createNameInputRef}
                  id="name"
                  name="name"
                  value={name}
                  required
                  onChange={(event) => {
                    setName(event.target.value)
                    updateGeneratedCode({})
                  }}
                  placeholder="BONELESS"
                  autoComplete="off"
                  enterKeyHint="done"
                />
              </div>
            </div>
            <input type="hidden" name="barcodeRequired" value="false" />
            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                Optional item details
              </summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandId">Default manufacturer</Label>
                  <BrandSelect
                    brands={brands}
                    value={defaultBrandId}
                    onChange={setDefaultBrandId}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">Product section</Label>
                  <Input
                    id="section"
                    name="section"
                    value={section}
                    onChange={(event) => {
                      setSection(event.target.value)
                      updateGeneratedCode({})
                    }}
                    placeholder="BELLY"
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chineseName">Chinese name</Label>
                  <Input
                    id="chineseName"
                    name="chineseName"
                    placeholder="Optional"
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ibanName">Iban name</Label>
                  <Input
                    id="ibanName"
                    name="ibanName"
                    placeholder="Optional"
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultLowStockLevel">
                    Default low stock kg
                  </Label>
                  <Input
                    id="defaultLowStockLevel"
                    name="defaultLowStockLevel"
                    type="number"
                    min="0"
                    step="0.001"
                    defaultValue="0"
                    inputMode="decimal"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultWeightKg">
                    Default fixed weight kg
                  </Label>
                  <Input
                    id="defaultWeightKg"
                    name="defaultWeightKg"
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    enterKeyHint="done"
                    placeholder="Optional"
                  />
                </div>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="barcodeRequired"
                    value="true"
                    defaultChecked
                    className="size-4 rounded border-input"
                  />
                  Barcode required
                </label>
              </div>
            </details>
            <ActionMessage state={createState} />
            {createState.status === "success" ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <div className="font-medium">Next: open inbound and scan stock.</div>
                <Button asChild className="mt-3 min-h-11 w-full sm:w-auto">
                  <Link href="/stock/inbound">Open Barcode Inbound</Link>
                </Button>
              </div>
            ) : null}
            {!canCreateItem ? (
              <p className="text-sm text-muted-foreground">
                Enter name and a numeric item code before creating the item.
              </p>
            ) : null}
            <SubmitButton pending={createPending} disabled={!canCreateItem}>
              Create item
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit item</CardTitle>
          <CardDescription>
            Update item code, category, naming, barcode requirement, and active status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editItemId">Item</Label>
              <Input
                id="editItemSearch"
                type="search"
                value={editItemQuery}
                onChange={(event) => setEditItemQuery(event.target.value)}
                placeholder="Search item code or product"
                autoComplete="off"
                enterKeyHint="search"
              />
              {filteredEditItems.slice(0, 6).length > 0 ? (
                <div className="grid gap-2 min-[390px]:grid-cols-2">
                  {filteredEditItems.slice(0, 6).map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant={selectedItemId === item.id ? "default" : "outline"}
                      className="h-auto min-h-12 min-w-0 justify-start break-words whitespace-normal py-3 text-left"
                      aria-pressed={selectedItemId === item.id}
                      onClick={() => selectEditItem(item.id)}
                    >
                      <span>
                        <span className="block font-medium">
                          {item.itemCode} - {item.name}
                        </span>
                        <span className="block text-xs opacity-80">
                          {item.category} / {item.section}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              ) : null}
              {editItemQuery.trim() && filteredEditItems.length === 0 ? (
                <p className="text-sm text-amber-700">
                  No product match. Open the full product list.
                </p>
              ) : null}
              <details
                open={Boolean(
                  editItemQuery.trim() && filteredEditItems.length === 0
                )}
                className="rounded-md border bg-muted/30 p-3"
              >
                <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                  Full product list
                </summary>
                <div className="mt-3">
                  <NativeSelect
                    id="editItemId"
                    name="itemId"
                    value={selectedItemId}
                    onChange={selectEditItem}
                  >
                    <option value="">Select product</option>
                    {filteredEditItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.itemCode} - {item.section} / {item.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </details>
            </div>
            {selectedItem ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editItemCode">Item code</Label>
                  <Input
                    id="editItemCode"
                    name="itemCode"
                    defaultValue={selectedItem.itemCode}
                    required
                    key={`${selectedItem.id}-code`}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCategory">Category</Label>
                  <select
                    id="editCategory"
                    name="category"
                    defaultValue={selectedItem.category}
                    key={`${selectedItem.id}-category`}
                    className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-sm"
                  >
                    <option value="MEAT">MEAT</option>
                    <option value="ORGANS">ORGANS</option>
                    <option value="PROCESSED">PROCESSED</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="editName">Product name</Label>
                  <Input
                    ref={editNameInputRef}
                    id="editName"
                    name="name"
                    defaultValue={selectedItem.name}
                    required
                    key={`${selectedItem.id}-name`}
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                </div>
              </div>
            ) : null}
            {selectedItem ? (
              <details className="rounded-md border bg-muted/30 p-3">
                <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                  Optional item details
                </summary>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editDefaultBrandId">Default manufacturer</Label>
                  <select
                    id="editDefaultBrandId"
                    name="defaultBrandId"
                    defaultValue={selectedItem.defaultBrandId ?? ""}
                    key={`${selectedItem.id}-brand`}
                    className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-sm"
                  >
                    <option value="">No manufacturer</option>
                    {brands
                      .filter((brand) => brand.active)
                      .map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSection">Product section</Label>
                  <Input
                    id="editSection"
                    name="section"
                    defaultValue={selectedItem.section}
                    key={`${selectedItem.id}-section`}
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editChineseName">Chinese name</Label>
                  <Input
                    id="editChineseName"
                    name="chineseName"
                    defaultValue={selectedItem.chineseName ?? ""}
                    key={`${selectedItem.id}-chinese`}
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editIbanName">Iban name</Label>
                  <Input
                    id="editIbanName"
                    name="ibanName"
                    defaultValue={selectedItem.ibanName ?? ""}
                    key={`${selectedItem.id}-iban`}
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDefaultLowStockLevel">
                    Default low stock kg
                  </Label>
                  <Input
                    id="editDefaultLowStockLevel"
                    name="defaultLowStockLevel"
                    type="number"
                    min="0"
                    step="0.001"
                    defaultValue={selectedItem.defaultLowStockLevel}
                    key={`${selectedItem.id}-low-stock`}
                    inputMode="decimal"
                    enterKeyHint="done"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDefaultWeightKg">
                    Default fixed weight kg
                  </Label>
                  <Input
                    id="editDefaultWeightKg"
                    name="defaultWeightKg"
                    type="number"
                    min="0"
                    step="0.001"
                    defaultValue={selectedItem.defaultWeightKg ?? ""}
                    key={`${selectedItem.id}-fixed-weight`}
                    inputMode="decimal"
                    enterKeyHint="done"
                    placeholder="Optional"
                  />
                </div>
              </div>
              </details>
            ) : null}
            {selectedItem ? (
              <>
                <input type="hidden" name="barcodeRequired" value="false" />
                <input type="hidden" name="isActive" value="false" />
                <details className="rounded-md border bg-muted/30 p-3">
                  <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                    Advanced item settings
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="barcodeRequired"
                        value="true"
                        defaultChecked={selectedItem.barcodeRequired}
                        key={`${selectedItem.id}-barcode`}
                        className="size-4 rounded border-input"
                      />
                      Barcode required
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="isActive"
                        value="true"
                        defaultChecked={selectedItem.active}
                        key={`${selectedItem.id}-active`}
                        className="size-4 rounded border-input"
                      />
                      Active
                    </label>
                  </div>
                </details>
              </>
            ) : null}
            {!selectedItem ? (
              <p className="text-sm text-muted-foreground">
                Select a product before updating product master details.
              </p>
            ) : null}
            <ActionMessage state={updateState} />
            <SubmitButton pending={updatePending} disabled={!canUpdateItem}>
              Update item
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function MergeManufacturerForm({ brands }: { brands: Brand[] }) {
  const activeBrands = brands
    .filter((brand) => brand.active)
    .sort((a, b) => compareText(a.name, b.name))

  return (
    <WorkflowCard
      title="Merge manufacturers"
      description="Admin cleanup for duplicate manufacturer names."
      action={mergeBrandAction}
      submitLabel="Merge manufacturer"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sourceBrandId">Duplicate</Label>
          <NativeSelect id="sourceBrandId" name="sourceBrandId" required>
            <option value="">Select duplicate</option>
            {activeBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetBrandId">Keep</Label>
          <NativeSelect id="targetBrandId" name="targetBrandId" required>
            <option value="">Select manufacturer to keep</option>
            {activeBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Source becomes inactive. Audit kept.
      </p>
    </WorkflowCard>
  )
}

function MergeProductForm({
  items,
  brands,
}: {
  items: Item[]
  brands: Brand[]
}) {
  const activeItems = items
    .filter((item) => item.active)
    .sort((a, b) =>
      compareText(
        formatProductName(
          a,
          a.defaultBrandId
            ? brands.find((brand) => brand.id === a.defaultBrandId)
            : null
        ),
        formatProductName(
          b,
          b.defaultBrandId
            ? brands.find((brand) => brand.id === b.defaultBrandId)
            : null
        )
      )
    )

  return (
    <WorkflowCard
      title="Merge products"
      description="Admin cleanup for duplicate product names."
      action={mergeItemAction}
      submitLabel="Merge product"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sourceItemId">Duplicate</Label>
          <NativeSelect id="sourceItemId" name="sourceItemId" required>
            <option value="">Select duplicate</option>
            {activeItems.map((item) => (
              <option key={item.id} value={item.id}>
                {formatProductName(
                  item,
                  item.defaultBrandId
                    ? brands.find((brand) => brand.id === item.defaultBrandId)
                    : null
                )}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetItemId">Keep</Label>
          <NativeSelect id="targetItemId" name="targetItemId" required>
            <option value="">Select product to keep</option>
            {activeItems.map((item) => (
              <option key={item.id} value={item.id}>
                {formatProductName(
                  item,
                  item.defaultBrandId
                    ? brands.find((brand) => brand.id === item.defaultBrandId)
                    : null
                )}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Source becomes inactive. Audit kept.
      </p>
    </WorkflowCard>
  )
}

export function MasterDataForms({
  brands = [],
  items = [],
}: {
  brands?: Brand[]
  items?: Item[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <WorkflowCard
        title="Add manufacturer"
        description="Manufacturers are used during inbound capture and reporting."
        action={createBrandAction}
        submitLabel="Add manufacturer"
      >
        <div className="space-y-2">
          <Label htmlFor="brandName">Manufacturer name</Label>
          <Input id="brandName" name="name" placeholder="TICAN" />
        </div>
      </WorkflowCard>
      <WorkflowCard
        title="Add origin"
        description="Origins support purchase traceability and report filters."
        action={createOriginAction}
        submitLabel="Add origin"
      >
        <div className="space-y-2">
          <Label htmlFor="originName">Origin name</Label>
          <Input id="originName" name="name" placeholder="DENMARK" />
        </div>
      </WorkflowCard>
      <WorkflowCard
        title="Add location"
        description="Locations define where stock can be held or transferred."
        action={createLocationAction}
        submitLabel="Add location"
      >
        <div className="space-y-2">
          <Label htmlFor="locationName">Location name</Label>
          <Input id="locationName" name="name" placeholder="JALAN CHANNEL" />
        </div>
      </WorkflowCard>
      <MergeManufacturerForm brands={brands} />
      <MergeProductForm items={items} brands={brands} />
    </div>
  )
}

type InboundPreset = {
  itemId: string
  brandId: string
  originId: string
  locationId: string
  inboundSource:
    | "supplier_import"
    | "processing_output"
    | "customer_return"
    | "transfer_received"
    | "manual_adjustment"
    | "other"
    | "return"
    | "transfer"
  barcodeWeightStart: string
  barcodeWeightLength: string
  barcodeWeightDecimals: string
  fixedWeightKg: string
  autoSave: boolean
  saveWeightRule: boolean
}

type InboundLabel = {
  id: string
  stockUnitId: string
  companyName: string
  productName: string
  weightKg: string
  barcode: string
  scannedAt: string
  scannedBy: string
  locationName: string
  status: "PENDING" | "SAVED" | "VOIDED"
}

type InboundSessionError = {
  id: string
  barcode: string
  message: string
  time: string
}

type InboundTemplate = {
  key: string
  itemId: string
  brandId: string
  originId: string
  label: string
  manufacturerName: string
  originName: string
  updatedAt: string
  hasRule: boolean
}

type InboundSessionHistory = {
  batchNo: string
  itemId: string
  brandId: string
  originId: string
  locationId: string
  displayName: string
  manufacturerName: string
  originName: string
  locationName: string
  hasRule: boolean
  count: number
  voidedCount: number
  totalWeightKg: number
  startedAt: string
  lastAt: string
  barcodes: string[]
}

type InboundMode = "supplier_barcode" | "internal_label"
type InboundStep = "setup" | "rule" | "scan" | "manual" | "summary"

const inboundStepLabels: Record<InboundStep, string> = {
  setup: "1 Setup",
  rule: "2 Barcode Rule",
  scan: "3 Scan",
  manual: "2 Manual Weight",
  summary: "4 Summary",
}

const inboundPresetKey = "elite-meat:stock-inbound-preset"
const inboundSessionDraftKey = "elite-meat:stock-inbound-session-draft"
const inboundScopeKeys: (keyof InboundPreset)[] = [
  "itemId",
  "brandId",
  "originId",
  "locationId",
]

type InboundSessionDraft = {
  batchNo: string
  sessionStartedAt: string
  inboundMode: InboundMode
}

function generateInboundBatchNo() {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "")
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "")

  return `INB-${datePart}-${timePart}`
}

function readInboundSessionDraft(): InboundSessionDraft | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(inboundSessionDraftKey) ?? "null"
    ) as Partial<InboundSessionDraft> | null

    if (
      !parsed?.batchNo ||
      !parsed.sessionStartedAt ||
      (parsed.inboundMode !== "supplier_barcode" &&
        parsed.inboundMode !== "internal_label")
    ) {
      return null
    }

    return {
      batchNo: parsed.batchNo,
      sessionStartedAt: parsed.sessionStartedAt,
      inboundMode: parsed.inboundMode,
    }
  } catch {
    return null
  }
}

function assignedStockLocationId(
  locations: StockLocation[] = [],
  defaultLocationId?: string | null
) {
  const assignedLocation = locations.find(
    (location) => location.active && location.id === defaultLocationId
  )

  return assignedLocation?.id ?? null
}

function initialInboundPreset(
  items: Item[] = [],
  locations: StockLocation[] = [],
  brands: Brand[] = [],
  origins: Origin[] = [],
  defaultLocationId?: string | null
): InboundPreset {
  const assignedLocationId = assignedStockLocationId(
    locations,
    defaultLocationId
  )
  const activeLocation =
    locations.find(
      (location) => location.active && location.id === assignedLocationId
    ) ?? locations.find((location) => location.active)
  const fallback: InboundPreset = {
    itemId: "",
    brandId: "",
    originId: "",
    locationId: activeLocation?.id ?? "",
    inboundSource: "supplier_import",
    barcodeWeightStart: "7",
    barcodeWeightLength: "5",
    barcodeWeightDecimals: "2",
    fixedWeightKg: "",
    autoSave: true,
    saveWeightRule: true,
  }

  if (typeof window === "undefined") {
    return fallback
  }

  try {
    const saved = window.localStorage.getItem(inboundPresetKey)
    return normalizeInboundPreset(
      saved ? { ...fallback, ...JSON.parse(saved) } : fallback,
      items,
      locations,
      brands,
      origins,
      defaultLocationId
    )
  } catch {
    return fallback
  }
}

function normalizeInboundPreset(
  preset: InboundPreset,
  items: Item[] = [],
  locations: StockLocation[] = [],
  brands: Brand[] = [],
  origins: Origin[] = [],
  defaultLocationId?: string | null
): InboundPreset {
  const activeItemIds = new Set(
    items.filter((item) => item.active).map((item) => item.id)
  )
  const activeLocationIds = new Set(
    locations.filter((location) => location.active).map((location) => location.id)
  )
  const activeBrandIds = new Set(
    brands.filter((brand) => brand.active).map((brand) => brand.id)
  )
  const activeOriginIds = new Set(
    origins.filter((origin) => origin.active).map((origin) => origin.id)
  )

  const assignedLocationId = assignedStockLocationId(
    locations,
    defaultLocationId
  )
  const fallbackLocationId =
    assignedLocationId ?? activeLocationIds.values().next().value ?? ""

  return {
    ...preset,
    itemId: activeItemIds.has(preset.itemId) ? preset.itemId : "",
    brandId:
      preset.brandId && activeBrandIds.has(preset.brandId) ? preset.brandId : "",
    originId:
      preset.originId && activeOriginIds.has(preset.originId)
        ? preset.originId
        : "",
    locationId: assignedLocationId
      ? assignedLocationId
      : activeLocationIds.has(preset.locationId)
        ? preset.locationId
        : fallbackLocationId,
    fixedWeightKg: preset.fixedWeightKg ?? "",
  }
}

function applyMatchingWeightRule(
  preset: InboundPreset,
  barcodeWeightRules: BarcodeWeightRule[] = []
) {
  const matchingRule = [...barcodeWeightRules]
    .filter(
      (rule) =>
        rule.itemId === preset.itemId &&
        (rule.brandId ?? "") === preset.brandId &&
        (rule.originId ?? "") === preset.originId
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

  if (!matchingRule) {
    return { ...preset, saveWeightRule: true }
  }

  return {
    ...preset,
    barcodeWeightStart: String(matchingRule.barcodeWeightStart),
    barcodeWeightLength: String(matchingRule.barcodeWeightLength),
    barcodeWeightDecimals: String(matchingRule.barcodeWeightDecimals),
    saveWeightRule: false,
  }
}

function formatTemplateName(
  template: Pick<InboundTemplate, "brandId" | "itemId">,
  items: Item[],
  brands: Brand[]
) {
  const item = items.find((candidate) => candidate.id === template.itemId)
  const brand = brands.find((candidate) => candidate.id === template.brandId)

  return stockDisplayItemName(item, brand, "Unknown product")
}

function buildInboundTemplates({
  items,
  brands,
  origins,
  units,
  barcodeWeightRules,
}: {
  items: Item[]
  brands: Brand[]
  origins: Origin[]
  units: StockUnit[]
  barcodeWeightRules: BarcodeWeightRule[]
}) {
  const templates = new Map<string, InboundTemplate>()

  for (const rule of barcodeWeightRules) {
    if (!rule.itemId || !rule.brandId || !rule.originId) {
      continue
    }

    const key = `${rule.itemId}:${rule.brandId}:${rule.originId}`
    const existing = templates.get(key)

    if (existing && existing.updatedAt >= rule.updatedAt) {
      continue
    }

    templates.set(key, {
      key,
      itemId: rule.itemId,
      brandId: rule.brandId,
      originId: rule.originId,
      label: formatTemplateName(
        { itemId: rule.itemId, brandId: rule.brandId },
        items,
        brands
      ),
      manufacturerName:
        brands.find((brand) => brand.id === rule.brandId)?.name ??
        "Unknown manufacturer",
      originName:
        origins.find((origin) => origin.id === rule.originId)?.name ??
        "Unknown origin",
      updatedAt: rule.updatedAt,
      hasRule: true,
    })
  }

  for (const unit of [...units].sort((a, b) =>
    a.receivedAt.localeCompare(b.receivedAt)
  )) {
    if (
      !unit.itemId ||
      !unit.brandId ||
      !unit.originId ||
      unit.status === "VOIDED"
    ) {
      continue
    }

    const key = `${unit.itemId}:${unit.brandId}:${unit.originId}`
    const existing = templates.get(key)

    if (existing && existing.updatedAt >= unit.receivedAt) {
      continue
    }

    templates.set(key, {
      key,
      itemId: unit.itemId,
      brandId: unit.brandId,
      originId: unit.originId,
      label: formatTemplateName(
        { itemId: unit.itemId, brandId: unit.brandId },
        items,
        brands
      ),
      manufacturerName:
        brands.find((brand) => brand.id === unit.brandId)?.name ??
        "Unknown manufacturer",
      originName:
        origins.find((origin) => origin.id === unit.originId)?.name ??
        "Unknown origin",
      updatedAt: unit.receivedAt,
      hasRule: existing?.hasRule ?? false,
    })
  }

  return [...templates.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
}

function buildInboundSessionHistory({
  units,
  items,
  brands,
  origins,
  locations,
  barcodeWeightRules,
}: {
  units: StockUnit[]
  items: Item[]
  brands: Brand[]
  origins: Origin[]
  locations: StockLocation[]
  barcodeWeightRules: BarcodeWeightRule[]
}) {
  const sessions = new Map<string, InboundSessionHistory>()

  for (const unit of units) {
    const batchNo = unit.batchNo?.trim()

    if (!batchNo) {
      continue
    }

    const item = items.find((candidate) => candidate.id === unit.itemId)
    const brand = brands.find((candidate) => candidate.id === unit.brandId)
    const origin = origins.find((candidate) => candidate.id === unit.originId)
    const location = locations.find(
      (candidate) => candidate.id === unit.locationId
    )
    const itemId = unit.itemId
    const brandId = unit.brandId ?? ""
    const originId = unit.originId ?? ""
    const locationId = unit.locationId
    const existing = sessions.get(batchNo)
    const next: InboundSessionHistory = existing ?? {
      batchNo,
      itemId,
      brandId,
      originId,
      locationId,
      displayName: stockDisplayItemName(item, brand, "Unknown product"),
      manufacturerName: brand?.name ?? "Unknown manufacturer",
      originName: origin?.name ?? "Unknown origin",
      locationName: location?.name ?? "Unknown location",
      hasRule: barcodeWeightRules.some(
        (rule) =>
          rule.itemId === itemId &&
          (rule.brandId ?? "") === brandId &&
          (rule.originId ?? "") === originId
      ),
      count: 0,
      voidedCount: 0,
      totalWeightKg: 0,
      startedAt: unit.receivedAt,
      lastAt: unit.receivedAt,
      barcodes: [],
    }

    if (unit.status === "VOIDED") {
      next.voidedCount += 1
    } else {
      next.count += 1
      next.totalWeightKg += Number(unit.netWeightKg || 0)
      next.barcodes = [unit.barcode, ...next.barcodes]
    }

    next.startedAt =
      unit.receivedAt < next.startedAt ? unit.receivedAt : next.startedAt
    next.lastAt = unit.receivedAt > next.lastAt ? unit.receivedAt : next.lastAt
    sessions.set(batchNo, next)
  }

  return [...sessions.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

function formatProductName(
  item: Item | undefined,
  manufacturer?: Pick<Brand, "name"> | null
) {
  if (!item) {
    return "Unknown product"
  }

  return stockDisplayItemName(item, manufacturer, "Unknown product")
}

function inboundLabelsForBatch(
  batchNo: string,
  units: StockUnit[],
  items: Item[],
  brands: Brand[],
  locations: StockLocation[],
  scannedByName: string
): InboundLabel[] {
  if (!batchNo) {
    return []
  }

  return units
    .filter((unit) => unit.batchNo === batchNo)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .map((unit) => {
      const item = items.find((candidate) => candidate.id === unit.itemId)
      const brand = brands.find((candidate) => candidate.id === unit.brandId)
      const location = locations.find(
        (candidate) => candidate.id === unit.locationId
      )

      return {
        id: unit.id,
        stockUnitId: unit.id,
        companyName: "Elite Meat",
        productName: stockDisplayItemName(item, brand, "Unknown product"),
        weightKg: unit.netWeightKg.toFixed(3),
        barcode: unit.barcode,
        scannedAt: unit.receivedAt,
        scannedBy: scannedByName,
        locationName: location?.name ?? "Unknown location",
        status: unit.status === "VOIDED" ? "VOIDED" : "SAVED",
      }
    })
}

function vibrateAndBeep() {
  navigator.vibrate?.(80)

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext

    if (!AudioContextClass) {
      return
    }

    const audio = new AudioContextClass()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()

    oscillator.frequency.value = 880
    gain.gain.value = 0.04
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start()
    oscillator.stop(audio.currentTime + 0.08)
  } catch {
    // Sound feedback is optional; vibration/success message still work.
  }
}

const directOutboundRemarkOptionsByType: Record<string, string[]> = {
  SALES: ["Direct sales stock out", "Sold from stock"],
  PROCESSING: ["Sent to processing", "Production use"],
  TRANSFER: ["Transfer stock out", "Move to another location"],
  SAMPLE_TESTING: ["Sample/testing stock out", "Quality check sample"],
  DAMAGE_SPOILAGE: ["Damage/spoilage request", "Hold for damage approval"],
  RETURN_SUPPLIER: ["Return supplier request", "Supplier return hold"],
}

const allDirectOutboundQuickRemarks = new Set(
  Object.values(directOutboundRemarkOptionsByType).flat()
)

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}

const offlineScanMessage = "Connection lost. Please reconnect before scanning."

function OfflineScanAlert({ className = "" }: { className?: string }) {
  return (
    <div
      role="alert"
      className={[
        "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium break-words text-red-700",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {offlineScanMessage}
    </div>
  )
}

export function BarcodeInboundForm({
  items = [],
  brands = [],
  origins = [],
  locations = [],
  barcodeWeightRules = [],
  units = [],
  defaultLocationId = null,
  scannedByName = "Current user",
  canDeleteWholeSession = false,
}: {
  items: Item[]
  brands: Brand[]
  origins: Origin[]
  locations: StockLocation[]
  barcodeWeightRules: BarcodeWeightRule[]
  units?: StockUnit[]
  defaultLocationId?: string | null
  scannedByName?: string
  canDeleteWholeSession?: boolean
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement | null>(null)
  const netWeightInputRef = useRef<HTMLInputElement | null>(null)
  const brandSearchInputRef = useRef<HTMLInputElement | null>(null)
  const quickProductInputRef = useRef<HTMLInputElement | null>(null)
  const quickManufacturerInputRef = useRef<HTMLInputElement | null>(null)
  const quickOriginInputRef = useRef<HTMLInputElement | null>(null)
  const [state, formAction, pending] = useActionState(
    inboundFormAction,
    initialStockActionState
  )
  const [undoState, undoAction, undoPending] = useActionState(
    undoScanFormAction,
    initialStockActionState
  )
  const [quickCreateState, quickCreateAction, quickCreatePending] =
    useActionState(quickCreateFormAction, initialStockActionState)
  const [
    quickBrandCreateState,
    quickBrandCreateAction,
    quickBrandCreatePending,
  ] = useActionState(quickBrandCreateFormAction, initialStockActionState)
  const [localItems, setLocalItems] = useState(items)
  const [localBrands, setLocalBrands] = useState(brands)
  const [initialSessionDraft] = useState(() => {
    return readInboundSessionDraft()
  })
  const [barcode, setBarcode] = useState("")
  const [preset, setPreset] = useState(() =>
    initialInboundPreset(items, locations, brands, origins, defaultLocationId)
  )
  const [batchNo, setBatchNo] = useState(
    () => initialSessionDraft?.batchNo ?? generateInboundBatchNo()
  )
  const [sessionStartedAt, setSessionStartedAt] = useState(
    () => initialSessionDraft?.sessionStartedAt ?? new Date().toISOString()
  )
  const [sessionFinishedAt, setSessionFinishedAt] = useState<string | null>(
    null
  )
  const [netWeightKg, setNetWeightKg] = useState("")
  const [inboundMode, setInboundMode] = useState<InboundMode>(
    () => initialSessionDraft?.inboundMode ?? "supplier_barcode"
  )
  const [inboundStep, setInboundStep] = useState<InboundStep>("setup")
  const [wholeSessionUndoing, setWholeSessionUndoing] = useState(false)
  const [wholeSessionUndoConfirmOpen, setWholeSessionUndoConfirmOpen] =
    useState(false)
  const [wholeSessionUndoMessage, setWholeSessionUndoMessage] = useState("")
  const [latestScanUndoing, setLatestScanUndoing] = useState(false)
  const [latestScanUndoMessage, setLatestScanUndoMessage] = useState("")
  const [sessionSetupNotice, setSessionSetupNotice] = useState("")
  const [decodeMessage, setDecodeMessage] = useState("")
  const [decodeStatus, setDecodeStatus] = useState<
    "success" | "warning" | "error" | ""
  >("")
  const [brandName, setBrandName] = useState("")
  const [originName, setOriginName] = useState("")
  const [productQuery, setProductQuery] = useState("")
  const [brandQuery, setBrandQuery] = useState("")
  const [originQuery, setOriginQuery] = useState("")
  const [quickItemName, setQuickItemName] = useState("")
  const [quickItemCategory, setQuickItemCategory] = useState("MEAT")
  const [showManualProductEntry, setShowManualProductEntry] = useState(false)
  const [recentLabels, setRecentLabels] = useState<InboundLabel[]>(() =>
    initialSessionDraft
      ? inboundLabelsForBatch(
          initialSessionDraft.batchNo,
          units,
          items,
          brands,
          locations,
          scannedByName
        )
      : []
  )
  const [pendingInternalLabel, setPendingInternalLabel] =
    useState<InboundLabel | null>(null)
  const [sessionErrors, setSessionErrors] = useState<InboundSessionError[]>([])
  const [sessionBarcodeRuleSaved, setSessionBarcodeRuleSaved] = useState(false)
  const [sessionBarcodeRuleLength, setSessionBarcodeRuleLength] =
    useState<number | null>(null)
  const [sessionHistoryPage, setSessionHistoryPage] = useState(1)
  const [selectedHistorySessionCode, setSelectedHistorySessionCode] =
    useState<string | null>(null)
  const [inboundPrintTarget, setInboundPrintTarget] = useState<
    "labels" | "summary" | null
  >(null)
  const isOnline = useOnlineStatus()
  const pendingLabelRef = useRef<InboundLabel | null>(null)
  const pendingInternalLabelRef = useRef(false)
  const lastErrorMessageRef = useRef("")
  const labelSerialRef = useRef(0)
  const loggedInboundIssueKeysRef = useRef(new Set<string>())

  useEffect(() => {
    try {
      window.localStorage.setItem(inboundPresetKey, JSON.stringify(preset))
    } catch {
      // Ignore unavailable storage, for example private browsing.
    }
  }, [preset])

  useEffect(() => {
    try {
      const hasReadyDraftSetup = Boolean(
        preset.itemId &&
          preset.brandId &&
          preset.brandId !== "__other" &&
          preset.originId &&
          preset.originId !== "__other" &&
          preset.locationId
      )

      if (sessionFinishedAt || !hasReadyDraftSetup) {
        window.localStorage.removeItem(inboundSessionDraftKey)
        return
      }

      window.localStorage.setItem(
        inboundSessionDraftKey,
        JSON.stringify({ batchNo, sessionStartedAt, inboundMode })
      )
    } catch {
      // Ignore unavailable storage, for example private browsing.
    }
  }, [batchNo, inboundMode, preset, sessionFinishedAt, sessionStartedAt])

  useEffect(() => {
    const clearPrintTarget = () => setInboundPrintTarget(null)

    window.addEventListener("afterprint", clearPrintTarget)

    return () => {
      window.removeEventListener("afterprint", clearPrintTarget)
    }
  }, [])

  async function inboundFormAction(
    previousState: StockActionState,
    formData: FormData
  ) {
    const result = await barcodeInboundAction(previousState, formData)
    const wasInternalLabel = pendingInternalLabelRef.current
    pendingInternalLabelRef.current = false

    if (result.status === "success") {
      const resolvedBrandId = result.brandId ?? null
      const resolvedOriginId = result.originId ?? null

      if (
        (preset.brandId === "__other" && resolvedBrandId) ||
        (preset.originId === "__other" && resolvedOriginId)
      ) {
        setPreset((current) => ({
          ...current,
          brandId:
            current.brandId === "__other" && resolvedBrandId
              ? resolvedBrandId
              : current.brandId,
          originId:
            current.originId === "__other" && resolvedOriginId
              ? resolvedOriginId
              : current.originId,
        }))
      }

      if (pendingLabelRef.current) {
        const savedLabel: InboundLabel = {
          ...pendingLabelRef.current,
          stockUnitId:
            result.stockUnitId || pendingLabelRef.current.stockUnitId,
          scannedAt: new Date().toISOString(),
          scannedBy: scannedByName,
          locationName: selectedLocation?.name ?? "Unknown location",
          status: "SAVED",
        }

        setRecentLabels((current) => [savedLabel, ...current])
        pendingLabelRef.current = null
      }

      const savedRuleFromRulePage =
        inboundStep === "rule" && formData.get("saveWeightRule") === "true"
      const savedWeightKg = Number(formData.get("netWeightKg"))
      const savedWeightText = Number.isFinite(savedWeightKg)
        ? `${savedWeightKg.toFixed(3)} kg`
        : "weight"

      if (wasInternalLabel) {
        setPendingInternalLabel(null)
        setNetWeightKg("")
        setDecodeStatus("success")
        setDecodeMessage("Saved. Enter next weight.")
      } else if (savedRuleFromRulePage) {
        setSessionBarcodeRuleSaved(true)
        setSessionBarcodeRuleLength(String(formData.get("barcode") ?? "").length)
        setPreset((current) => ({ ...current, saveWeightRule: false }))
        setDecodeStatus("success")
        setDecodeMessage(`Rule saved. ${savedWeightText} saved.`)
      } else {
        setDecodeStatus("success")
        setDecodeMessage(`${savedWeightText} saved.`)
      }

      setInboundStep(wasInternalLabel && inboundMode === "internal_label" ? "manual" : "scan")
      vibrateAndBeep()
      window.setTimeout(() => {
        setBarcode("")
        setNetWeightKg("")
        if (wasInternalLabel) {
          netWeightInputRef.current?.focus()
          return
        }

        barcodeInputRef.current?.focus()
      }, 0)

      return result
    }

    if (result.message) {
      const errorKey = `${barcode}:${result.message}`

      if (lastErrorMessageRef.current !== errorKey) {
        lastErrorMessageRef.current = errorKey
        recordSessionError(barcode, result.message)
      }
    }

    return result
  }

  async function undoScanFormAction(
    previousState: StockActionState,
    formData: FormData
  ) {
    const result = await undoInboundScanAction(previousState, formData)

    if (result.status === "success" && result.voidedStockUnitId) {
      setRecentLabels((current) =>
        current.map((label) =>
          label.stockUnitId === result.voidedStockUnitId
            ? { ...label, status: "VOIDED" }
            : label
        )
      )
    }

    return result
  }

  async function undoWholeInboundSession() {
    const savedLabels = recentLabels.filter((label) => label.status === "SAVED")

    if (savedLabels.length === 0) {
      setWholeSessionUndoMessage("No saved scans to undo.")
      setWholeSessionUndoConfirmOpen(false)
      return
    }

    setWholeSessionUndoing(true)
    setWholeSessionUndoMessage("")

    const formData = new FormData()
    formData.set("batchNo", batchNo)
    formData.set("reason", "Whole inbound session undo")

    const result = await undoInboundSessionAction(
      initialStockActionState,
      formData
    )

    if (result.status === "success") {
      setRecentLabels((current) =>
        current.map((currentLabel) =>
          currentLabel.status === "SAVED"
            ? { ...currentLabel, status: "VOIDED" }
            : currentLabel
        )
      )
      setWholeSessionUndoMessage(result.message)
      setWholeSessionUndoConfirmOpen(false)
    } else {
      setWholeSessionUndoMessage(
        result.message || "Session was not undone. Ask manager to check."
      )
    }

    setWholeSessionUndoing(false)
  }

  async function quickCreateFormAction(
    previousState: StockActionState,
    formData: FormData
  ) {
    if (!quickProductCreateManufacturerReady) {
      return {
        status: "error",
        message: "Choose manufacturer first.",
      } satisfies StockActionState
    }

    const itemCode = quickItemCode
    const itemName = quickItemName.trim().replace(/\s+/g, " ")
    const itemCategory = quickItemCategory as Item["category"]
    const result = await createItemAction(previousState, formData)

    if (result.status === "success" && result.itemId) {
      const defaultBrandId = result.brandId ?? null
      const resolvedBrandId = result.brandId ?? null
      const resolvedBrandName = result.brandName ?? selectedManufacturerValue
      const nextBrandId =
        preset.brandId === "__other" && resolvedBrandId
          ? resolvedBrandId
          : preset.brandId
      const nextDisplayName = stockDisplayItemName(
        { section: "GENERAL", name: itemName, displayName: null },
        resolvedBrandName ? { name: resolvedBrandName } : null,
        itemName
      )
      const nextItem: Item = {
        id: result.itemId,
        itemCode,
        category: itemCategory,
        defaultBrandId,
        displayName: nextDisplayName,
        section: "GENERAL",
        name: itemName,
        chineseName: null,
        ibanName: null,
        barcodeRequired: true,
        active: true,
        defaultLowStockLevel: 0,
        defaultWeightKg: null,
      }

      setLocalItems((current) =>
        current.some((item) => item.id === nextItem.id)
          ? current
          : [...current, nextItem]
      )
      applyInboundSetupPreset({
        ...preset,
        itemId: nextItem.id,
        brandId: nextBrandId,
      })
      if (preset.brandId === "__other" && resolvedBrandId) {
        setBrandQuery(resolvedBrandName)
      }
      setProductQuery(nextDisplayName)
      setQuickItemName("")
    }

    return result
  }

  async function quickBrandCreateFormAction(
    previousState: StockActionState,
    formData: FormData
  ) {
    const nextBrandName = brandName.trim()
    const result = await createInboundBrandAction(previousState, formData)

    if (result.status === "success" && result.brandId) {
      const savedName =
        result.brandName ?? nextBrandName.replace(/\s+/g, " ").toUpperCase()

      setLocalBrands((current) =>
        current.some((brand) => brand.id === result.brandId)
          ? current
          : [
              ...current,
              {
                id: result.brandId ?? "",
                name: savedName,
                active: true,
              },
            ]
      )
      applyInboundSetupPreset({
        ...preset,
        brandId: result.brandId,
      })
      setBrandQuery(savedName)
      setBrandName("")
    }

    return result
  }

  function recordSessionError(nextBarcode: string, message: string) {
    setSessionErrors((current) => [
      {
        id: `${Date.now()}-${current.length}`,
        barcode: nextBarcode.trim() || "-",
        message,
        time: new Date().toISOString(),
      },
      ...current,
    ])
  }

  function logInboundScanIssue(
    nextBarcode: string,
    message: string,
    issueType?: StockIssueType,
    context: {
      itemId?: string | null
      scannedLocationId?: string | null
      expectedStatus?: string | null
      scannedStatus?: string | null
    } = {}
  ) {
    if (!preset.locationId || !nextBarcode.trim()) {
      return
    }

    const key = ["INBOUND", issueType ?? message, nextBarcode, batchNo].join(":")

    if (loggedInboundIssueKeysRef.current.has(key)) {
      return
    }

    loggedInboundIssueKeysRef.current.add(key)

    const formData = new FormData()
    formData.set("barcode", nextBarcode)
    formData.set("locationId", preset.locationId)
    formData.set("message", message)
    formData.set("expectedLocationId", preset.locationId)
    formData.set("relatedSessionId", batchNo)
    formData.set("productName", stockProductName(selectedItem, ""))
    formData.set("manufacturerName", selectedManufacturerName)
    formData.set("displayProductName", selectedProductDisplayName)

    if (context.itemId ?? preset.itemId) {
      formData.set("itemId", context.itemId ?? preset.itemId)
    }

    if (preset.itemId) {
      formData.set("selectedItemId", preset.itemId)
    }

    setIssueFormValue(
      formData,
      "scannedLocationId",
      context.scannedLocationId
    )
    setIssueFormValue(formData, "expectedStatus", context.expectedStatus)
    setIssueFormValue(formData, "scannedStatus", context.scannedStatus)

    if (preset.brandId && preset.brandId !== "__other") {
      formData.set("brandId", preset.brandId)
    }

    if (preset.originId && preset.originId !== "__other") {
      formData.set("originId", preset.originId)
    }

    if (issueType) {
      formData.set("issueType", issueType)
    }

    void logInboundScanIssueAction(initialStockActionState, formData).catch(
      () => {
        loggedInboundIssueKeysRef.current.delete(key)
      }
    )
  }

  function clearInboundDraftScan() {
    setBarcode("")
    setNetWeightKg("")
    setPendingInternalLabel(null)
    pendingLabelRef.current = null
    pendingInternalLabelRef.current = false
    lastErrorMessageRef.current = ""
    loggedInboundIssueKeysRef.current.clear()
  }

  function updatePreset<K extends keyof InboundPreset>(
    key: K,
    value: InboundPreset[K]
  ) {
    if (scopeLocked && inboundScopeKeys.includes(key)) {
      setDecodeStatus("warning")
      setDecodeMessage(scopeLockedReason)
      return
    }

    const scopeKeyChanged = inboundScopeKeys.includes(key)

    if (scopeKeyChanged) {
      clearInboundDraftScan()
      setSessionBarcodeRuleSaved(false)
      setSessionBarcodeRuleLength(null)
      setSessionSetupNotice("")
      setDecodeStatus("")
      setDecodeMessage("")
    }

    setPreset((current) => {
      const next = { ...current, [key]: value }
      return scopeKeyChanged
        ? applyMatchingWeightRule(next, barcodeWeightRules)
        : next
    })
  }

  function inboundPresetCanScan(next: InboundPreset) {
    return Boolean(
      next.itemId &&
        next.brandId &&
        next.brandId !== "__other" &&
        next.originId &&
        (next.originId !== "__other" || originName.trim()) &&
        next.locationId
    )
  }

  function applyInboundSetupPreset(nextPreset: InboundPreset) {
    const next = applyMatchingWeightRule(nextPreset, barcodeWeightRules)

    clearInboundDraftScan()
    setPreset(next)
    setSessionBarcodeRuleSaved(false)
    setSessionBarcodeRuleLength(null)
    setSessionSetupNotice("")

    if (inboundPresetCanScan(next)) {
      window.setTimeout(() => barcodeInputRef.current?.focus(), 0)
    }
  }

  function selectInboundSetup<K extends (typeof inboundScopeKeys)[number]>(
    key: K,
    value: InboundPreset[K]
  ) {
    if (scopeLocked) {
      setDecodeStatus("warning")
      setDecodeMessage(scopeLockedReason)
      return
    }

    applyInboundSetupPreset({ ...preset, [key]: value })

    if (key === "itemId" && value) {
      setShowManualProductEntry(false)
    }
  }

  function openManualProductEntry() {
    const typedProduct = quickProductNameSuggestion || productQuery.trim()

    if (typedProduct) {
      setQuickItemName(typedProduct)
    }

    setShowManualProductEntry(true)
    window.setTimeout(() => quickProductInputRef.current?.focus(), 0)
  }

  function selectInboundBrand(nextBrandId: string) {
    const selectedBrand = localBrands.find((brand) => brand.id === nextBrandId)

    if (nextBrandId === "__other") {
      if (!brandName.trim() && brandQuery.trim()) {
        setBrandName(brandQuery.trim())
      }
      window.setTimeout(() => quickManufacturerInputRef.current?.focus(), 0)
    } else {
      setBrandName("")
    }

    setBrandQuery(selectedBrand?.name ?? brandQuery.trim())
    selectInboundSetup("brandId", nextBrandId)
  }

  function selectInboundOrigin(nextOriginId: string) {
    const selectedOrigin = origins.find((origin) => origin.id === nextOriginId)

    if (nextOriginId === "__other") {
      if (!originName.trim() && originQuery.trim()) {
        setOriginName(originQuery.trim())
      }
      window.setTimeout(() => quickOriginInputRef.current?.focus(), 0)
    } else {
      setOriginName("")
    }

    setOriginQuery(selectedOrigin?.name ?? originQuery.trim())
    selectInboundSetup("originId", nextOriginId)
  }

  function switchInboundMode(nextMode: InboundMode) {
    if (scopeLocked) {
      setDecodeStatus("warning")
      setDecodeMessage(scopeLockedReason)
      return
    }

    setInboundMode(nextMode)
    clearInboundDraftScan()
    setDecodeStatus(nextMode === "internal_label" ? "warning" : "")
    setDecodeMessage(
      nextMode === "internal_label"
        ? "Enter weight. Stock saves, then print label."
        : ""
    )

    window.setTimeout(() => {
      if (nextMode === "internal_label" && scanSetupReady) {
        netWeightInputRef.current?.focus()
        return
      }

      if (nextMode === "supplier_barcode" && scanSetupReady) {
        barcodeInputRef.current?.focus()
      }
    }, 0)
  }

  function goInboundStep(nextStep: InboundStep) {
    if (
      inboundMode === "internal_label" &&
      (nextStep === "rule" || nextStep === "scan")
    ) {
      setDecodeStatus("warning")
      setDecodeMessage("Use Inbound without Barcode.")
      return
    }

    if (inboundMode === "supplier_barcode" && nextStep === "manual") {
      setDecodeStatus("warning")
      setDecodeMessage("Choose Inbound without Barcode first.")
      return
    }

    if (nextStep === "rule" && !barcodeRuleSetupReady) {
      setDecodeStatus("warning")
      setDecodeMessage("Choose setup first.")
      return
    }

    if (nextStep === "manual" && !scanSetupReady) {
      setDecodeStatus("warning")
      setDecodeMessage(
        "Choose setup first."
      )
      return
    }

    if (nextStep === "scan" && !scanSetupReady) {
      setDecodeStatus("warning")
      setDecodeMessage(
        "Choose setup first."
      )
      return
    }

    if (
      inboundMode === "supplier_barcode" &&
      nextStep === "scan" &&
      !canUseBarcodeRuleForSession
    ) {
      setDecodeStatus("warning")
      setDecodeMessage("Set barcode rule before opening scanner.")
      return
    }

    if (nextStep === "summary" && !sessionFinishedAt) {
      setDecodeStatus("warning")
      setDecodeMessage("Finish session first.")
      return
    }

    if (
      sessionFinishedAt &&
      (nextStep === "scan" || nextStep === "manual")
    ) {
      setInboundStep(nextStep)
      return
    }

    setInboundStep(nextStep)
  }

  function isDuplicateInboundBarcode(value: string) {
    const nextBarcode = value.trim()

    return nextBarcode
      ? units.some((unit) => unit.barcode === nextBarcode) ||
          recentLabels.some((label) => label.barcode === nextBarcode)
      : false
  }

  function inboundBarcodeLengthWarning(value: string) {
    const nextBarcode = value.trim()

    if (
      !nextBarcode ||
      !expectedBarcodeLength ||
      nextBarcode.length === expectedBarcodeLength
    ) {
      return ""
    }

    return `Barcode length changed. Expected ${expectedBarcodeLength}, got ${nextBarcode.length}.`
  }

  function handleBarcodeChange(value: string, submitAfterScan = false) {
    const scannedBarcode = value.trim()

    if (submitAfterScan && !isOnline) {
      const message = offlineScanMessage

      setBarcode(value)
      setDecodeStatus("error")
      setDecodeMessage(message)
      recordSessionError(value, message)
      return
    }

    if (submitAfterScan && pendingInternalLabel) {
      setBarcode(value)

      if (scannedBarcode !== pendingInternalLabel.barcode) {
        const message = `Wrong label. Use ${pendingInternalLabel.barcode} for this saved label.`

        setDecodeStatus("error")
        setDecodeMessage(message)
        recordSessionError(value, message)
        return
      }

      setNetWeightKg(pendingInternalLabel.weightKg)
      setDecodeStatus("success")
      setDecodeMessage("Printed label confirmed. Saving stock.")
      pendingLabelRef.current = pendingInternalLabel
      pendingInternalLabelRef.current = true
      window.setTimeout(() => formRef.current?.requestSubmit(), 0)
      return
    }

    const decoded = decodeBarcodeWeight({
      barcode: value,
      startText: preset.barcodeWeightStart,
      lengthText: preset.barcodeWeightLength,
      decimalsText: preset.barcodeWeightDecimals,
      fixedWeightKgText: preset.fixedWeightKg,
    })
    const lengthWarning = inboundBarcodeLengthWarning(value)

    setBarcode(value)
    setDecodeMessage(lengthWarning || decoded.message)
    setDecodeStatus(
      lengthWarning
        ? "warning"
        : decoded.status === "decoded"
        ? "success"
        : decoded.status === "manual_confirmation_required"
          ? "warning"
          : "error"
    )

    if (decoded.weightKg) {
      setNetWeightKg(decoded.weightKg)
    }

    if (submitAfterScan && isDuplicateInboundBarcode(value)) {
      setDecodeStatus("error")
      const message = "Duplicate barcode. Inbound is blocked."
      const existingUnit = units.find(
        (unit) => unit.barcode === scannedBarcode
      )
      setDecodeMessage(message)
      recordSessionError(value, message)
      logInboundScanIssue(value, message, "DUPLICATE_BARCODE", {
        itemId: existingUnit?.itemId ?? null,
        scannedLocationId: existingUnit?.locationId ?? null,
        expectedStatus: "unused barcode",
        scannedStatus: existingUnit?.status ?? null,
      })
      return
    }

    if (
      submitAfterScan &&
      (!preset.itemId ||
        !preset.brandId ||
        !preset.originId ||
        !preset.locationId)
    ) {
      const message = "Choose setup first."

      setDecodeStatus("error")
      setDecodeMessage(message)
      recordSessionError(value, message)
      return
    }

    if (
      submitAfterScan &&
      inboundStep === "rule" &&
      !canUseBarcodeRuleForSession
    ) {
      setNetWeightKg("")
      setDecodeStatus("warning")
      setDecodeMessage(
        "Sample scanned. Enter kg, then save rule."
      )
      window.setTimeout(() => netWeightInputRef.current?.focus(), 0)
      return
    }

    if (submitAfterScan && decoded.status === "error") {
      const message =
        lengthWarning
          ? `${lengthWarning} Use internal label.`
          : "No weight found. Use internal label."
      setInboundMode("internal_label")
      setInboundStep("manual")
      setDecodeStatus("error")
      setDecodeMessage(message)
      recordSessionError(value, message)
      if (lengthWarning) {
        logInboundScanIssue(value, lengthWarning, "BARCODE_LENGTH_MISMATCH", {
          expectedStatus: `${expectedBarcodeLength} digits`,
          scannedStatus: `${value.length} digits`,
        })
      }
      logInboundScanIssue(value, message, "BARCODE_RULE_DETECTION_FAILURE")
      setBarcode("")
      window.setTimeout(() => netWeightInputRef.current?.focus(), 0)
      return
    }

    if (submitAfterScan && lengthWarning) {
      logInboundScanIssue(
        value,
        lengthWarning,
        "BARCODE_LENGTH_MISMATCH",
        {
          expectedStatus: `${expectedBarcodeLength} digits`,
          scannedStatus: `${value.length} digits`,
        }
      )
      setDecodeStatus("warning")
      setDecodeMessage(
        `${lengthWarning} Save only if correct.`
      )
      return
    }

    const readyToSubmit =
      submitAfterScan &&
      inboundStep !== "rule" &&
      preset.itemId &&
      preset.brandId &&
      preset.originId &&
      preset.locationId &&
      value &&
      !sessionFinishedAt &&
      decoded.status === "decoded"

    if (readyToSubmit) {
      setDecodeStatus("success")
      setDecodeMessage(`Saving ${decoded.weightKg} kg.`)
      window.setTimeout(() => formRef.current?.requestSubmit(), 0)
    }
  }

  function handleNetWeightChange(value: string) {
    if (pendingInternalLabel) {
      setDecodeStatus("warning")
      setDecodeMessage("Cancel pending label first.")
      return
    }

    setNetWeightKg(value)

    if (inboundStep === "rule" && barcode.trim() && Number(value) > 0) {
      const inference = inferBarcodeWeightRuleWithStatus({
        barcode,
        weightKgText: value,
        decimalsText: preset.barcodeWeightDecimals,
      })

      if (inference.status === "ambiguous") {
        const message =
          "Weight appears twice. Scan another sample."
        setDecodeStatus("warning")
        setDecodeMessage(message)
        recordSessionError(barcode, message)
        logInboundScanIssue(
          barcode,
          message,
          "BARCODE_RULE_DETECTION_FAILURE"
        )
        setBarcode("")
        setNetWeightKg("")
        window.setTimeout(() => barcodeInputRef.current?.focus(), 0)
        return
      }

      if (inference.status === "not_found") {
        const message =
          "No weight position found. Use internal label."
        setInboundMode("internal_label")
        setInboundStep("manual")
        setDecodeStatus("warning")
        setDecodeMessage(message)
        recordSessionError(barcode, message)
        logInboundScanIssue(
          barcode,
          message,
          "BARCODE_RULE_DETECTION_FAILURE"
        )
        setBarcode("")
        window.setTimeout(() => netWeightInputRef.current?.focus(), 0)
        return
      }

      const suggestion = inference.suggestion
      if (!suggestion) {
        return
      }
      setPreset((current) => ({
        ...current,
        barcodeWeightStart: String(suggestion.start),
        barcodeWeightLength: String(suggestion.length),
        barcodeWeightDecimals: String(suggestion.decimals),
        fixedWeightKg: "",
        saveWeightRule: true,
      }))
      setDecodeStatus("warning")
      setDecodeMessage("Weight position found. Save rule.")
      return
    }

    const decoded = decodeBarcodeWeight({
      barcode,
      startText: preset.barcodeWeightStart,
      lengthText: preset.barcodeWeightLength,
      decimalsText: preset.barcodeWeightDecimals,
      fixedWeightKgText: preset.fixedWeightKg,
    })

    if (decoded.status !== "error") {
      return
    }

    const inference = inferBarcodeWeightRuleWithStatus({
      barcode,
      weightKgText: value,
      decimalsText: preset.barcodeWeightDecimals,
    })

    if (inference.status === "ambiguous") {
      const message =
        "Weight appears twice. Scan another sample."
      setDecodeStatus("warning")
      setDecodeMessage(message)
      recordSessionError(barcode, message)
      logInboundScanIssue(
        barcode,
        message,
        "BARCODE_RULE_DETECTION_FAILURE"
      )
      setBarcode("")
      setNetWeightKg("")
      window.setTimeout(() => barcodeInputRef.current?.focus(), 0)
      return
    }

    if (inference.status === "not_found") {
      if (barcode.trim() && Number(value) > 0) {
        const message =
          "No weight position found. Use internal label."
        setInboundMode("internal_label")
        setInboundStep("manual")
        setDecodeStatus("warning")
        setDecodeMessage(message)
        recordSessionError(barcode, message)
        logInboundScanIssue(
          barcode,
          message,
          "BARCODE_RULE_DETECTION_FAILURE"
        )
        setBarcode("")
        window.setTimeout(() => netWeightInputRef.current?.focus(), 0)
      }
      return
    }

    const suggestion = inference.suggestion
    if (!suggestion) {
      return
    }
    setPreset((current) => ({
      ...current,
      barcodeWeightStart: String(suggestion.start),
      barcodeWeightLength: String(suggestion.length),
      barcodeWeightDecimals: String(suggestion.decimals),
      fixedWeightKg: "",
      saveWeightRule: true,
    }))
    setDecodeStatus("warning")
    setDecodeMessage("Weight position found. Save rule.")
  }

  function handleNetWeightKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || inboundStep !== "manual") {
      return
    }

    event.preventDefault()

    if (pendingInternalLabel) {
      setDecodeStatus("warning")
      setDecodeMessage("Cancel pending label first.")
      window.setTimeout(() => barcodeInputRef.current?.focus(), 0)
      return
    }

    if (!(Number(netWeightKg) > 0)) {
      setDecodeStatus("error")
      setDecodeMessage("Enter weight first.")
      return
    }

    generateLabelBarcode()
  }

  function rememberLabel() {
    if (!barcode.trim() || !netWeightKg.trim()) {
      pendingLabelRef.current = null
      return
    }

    pendingLabelRef.current = {
      id: `${barcode}-${labelSerialRef.current}`,
      stockUnitId: `${barcode}-${labelSerialRef.current}`,
      companyName: "Elite Meat",
      productName: selectedProductDisplayName,
      weightKg: Number(netWeightKg).toFixed(3),
      barcode,
      scannedAt: new Date().toISOString(),
      scannedBy: scannedByName,
      locationName: selectedLocation?.name ?? "Unknown location",
      status: "PENDING",
    }
  }

  function handleInboundFormSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (
      event.nativeEvent as SubmitEvent & {
        submitter?: HTMLElement | null
      }
    ).submitter

    if (
      submitter?.dataset.stockAction === "quick-create-item" ||
      submitter?.dataset.stockAction === "quick-create-brand"
    ) {
      pendingLabelRef.current = null
      return
    }

    if (!isOnline) {
      event.preventDefault()
      pendingLabelRef.current = null
      setDecodeStatus("error")
      setDecodeMessage(offlineScanMessage)
      recordSessionError(barcode, "Connection lost.")
      return
    }

    if (pendingInternalLabel && !pendingInternalLabelRef.current) {
      event.preventDefault()
      pendingLabelRef.current = null
      setDecodeStatus("error")
      setDecodeMessage("Cancel pending label, then try again.")
      recordSessionError(barcode, "Cancel pending label, then try again.")
      return
    }

    if (inboundMode === "internal_label" && !pendingInternalLabelRef.current) {
      event.preventDefault()
      pendingLabelRef.current = null
      setDecodeStatus("error")
      setDecodeMessage("Enter weight, save stock, then print label.")
      recordSessionError(barcode, "Enter weight, save stock, then print label.")
      window.setTimeout(() => netWeightInputRef.current?.focus(), 0)
      return
    }

    if (pendingInternalLabelRef.current && pendingLabelRef.current) {
      return
    }

    rememberLabel()
  }

  function generateLabelBarcode() {
    if (!isOnline) {
      setDecodeStatus("error")
      setDecodeMessage(offlineScanMessage)
      return
    }

    if (pendingInternalLabel) {
      setDecodeStatus("warning")
      setDecodeMessage("Cancel pending label first.")
      window.setTimeout(() => barcodeInputRef.current?.focus(), 0)
      return
    }

    if (!scanSetupReady || !selectedItem) {
      setDecodeStatus("error")
      setDecodeMessage("Choose setup first.")
      return
    }

    const existingBarcodes = [
      ...units.map((unit) => unit.barcode),
      ...recentLabels.map((label) => label.barcode),
    ]
    const nextSerial = Math.max(
      labelSerialRef.current,
      ...recentLabels
        .map((label) => internalBarcodeSerial(batchNo, label.barcode) ?? 0)
    ) + 1
    const generated = makeUniqueInternalBarcode(
      batchNo,
      netWeightKg,
      existingBarcodes,
      nextSerial
    )

    if (!generated.barcode) {
      setDecodeStatus("error")
      setDecodeMessage("Enter weight first.")
      return
    }

    labelSerialRef.current = generated.serial
    const nextLabel: InboundLabel = {
      id: `${generated.barcode}-${generated.serial}`,
      stockUnitId: `${generated.barcode}-${generated.serial}`,
      companyName: "Elite Meat",
      productName: selectedProductDisplayName,
      weightKg: Number(netWeightKg).toFixed(3),
      barcode: generated.barcode,
      scannedAt: new Date().toISOString(),
      scannedBy: scannedByName,
      locationName: selectedLocation?.name ?? "Unknown location",
      status: "PENDING",
    }

    pendingLabelRef.current = nextLabel
    pendingInternalLabelRef.current = true
    setPendingInternalLabel(nextLabel)
    setInboundMode("internal_label")
    setInboundStep("manual")
    setBarcode(generated.barcode)
    setNetWeightKg(nextLabel.weightKg)
    setDecodeStatus("success")
    setDecodeMessage("Label generated. Saving stock now.")
    window.setTimeout(() => formRef.current?.requestSubmit(), 0)
  }

  function cancelPendingInternalLabel() {
    setPendingInternalLabel(null)
    pendingInternalLabelRef.current = false
    pendingLabelRef.current = null
    setBarcode("")
    setDecodeStatus("warning")
    setDecodeMessage("Label cancelled. Check weight, then generate again.")
    window.setTimeout(() => netWeightInputRef.current?.select(), 0)
  }

  function printInboundLabels() {
    setInboundPrintTarget("labels")
    window.setTimeout(() => window.print(), 0)
  }

  function printInboundSessionSummary() {
    setInboundPrintTarget("summary")
    window.setTimeout(() => window.print(), 0)
  }

  function startNewInboundSession() {
    if (!sessionFinishedAt && recentLabels.some((label) => label.status === "SAVED")) {
      setInboundStep("summary")
      setDecodeStatus("warning")
      setDecodeMessage("Finish or delete first.")
      return
    }

    if (pendingInternalLabel) {
      setInboundStep("manual")
      setDecodeStatus("warning")
      setDecodeMessage("Scan or cancel the pending label first.")
      return
    }

    setRecentLabels([])
    setSessionErrors([])
    setSessionStartedAt(new Date().toISOString())
    setSessionFinishedAt(null)
    setBatchNo(generateInboundBatchNo())
    labelSerialRef.current = 0
    clearInboundDraftScan()
    setDecodeMessage("")
    setDecodeStatus("")
    setLatestScanUndoMessage("")
    setWholeSessionUndoMessage("")
    setWholeSessionUndoConfirmOpen(false)
    setInboundPrintTarget(null)
    setSessionBarcodeRuleSaved(false)
    setSessionBarcodeRuleLength(null)
    setSelectedHistorySessionCode(null)
    setInboundStep("setup")
    setSessionSetupNotice(
      scanSetupReady
        ? `New inbound session ready. Kept setup: ${selectedProductDisplayName}, ${selectedManufacturerName}, ${selectedOriginName}, ${selectedLocation?.name ?? "selected location"}.`
        : "New inbound session ready. Choose setup."
    )
  }

  const selectedItem = localItems.find((item) => item.id === preset.itemId)
  const selectedBrand = localBrands.find((brand) => brand.id === preset.brandId)
  const selectedOrigin = origins.find((origin) => origin.id === preset.originId)
  const selectedLocation = locations.find(
    (location) => location.id === preset.locationId
  )
  const selectedManufacturerValue = (selectedBrand?.name ?? brandName)
    .trim()
    .replace(/\s+/g, " ")
  const typedProductName =
    (quickItemName.trim() || productQuery.trim()).replace(/\s+/g, " ")
  const selectedProductName = selectedItem
    ? stockProductName(selectedItem, "No product")
    : typedProductName || "No product"
  const selectedProductDisplayName = selectedItem
    ? formatProductName(
        selectedItem,
        selectedManufacturerValue ? { name: selectedManufacturerValue } : null
      )
    : typedProductName
      ? stockDisplayItemName(
          { section: "GENERAL", name: typedProductName, displayName: null },
          selectedManufacturerValue ? { name: selectedManufacturerValue } : null,
          typedProductName
        )
      : "No product selected"
  const selectedManufacturerName =
    selectedManufacturerValue || "No manufacturer"
  const selectedOriginName =
    (selectedOrigin?.name ?? originName.trim()) || "No origin"
  const currentBarcodeWeightRule = [...barcodeWeightRules]
    .filter(
      (rule) =>
        rule.itemId === preset.itemId &&
        (rule.brandId ?? "") === preset.brandId &&
        (rule.originId ?? "") === preset.originId
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  const canUseBarcodeRuleForSession =
    Boolean(currentBarcodeWeightRule) || sessionBarcodeRuleSaved
  const expectedBarcodeLength = currentBarcodeWeightRule
    ? currentBarcodeWeightRule.barcodeLength ??
      [...units]
        .filter(
          (unit) =>
            unit.itemId === preset.itemId &&
            (unit.brandId ?? "") === preset.brandId &&
            (unit.originId ?? "") === preset.originId &&
            unit.barcode
        )
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0]?.barcode
        .length
    : sessionBarcodeRuleSaved
      ? sessionBarcodeRuleLength
    : null
  const assignedDefaultLocation = locations.find(
    (location) => location.active && location.id === defaultLocationId
  )
  const locationDefaultedToAssigned =
    assignedDefaultLocation?.id === preset.locationId
  const activeInboundBrands = useMemo(() => {
    const query = canonicalUiName(brandQuery)
    const activeBrands = localBrands
      .filter((brand) => brand.active)
      .sort((a, b) => compareText(a.name, b.name))

    if (!query) {
      return activeBrands
    }

    return activeBrands.filter((brand) =>
      canonicalUiName(brand.name).includes(query)
    )
  }, [localBrands, brandQuery])
  const activeInboundOrigins = useMemo(() => {
    const query = canonicalUiName(originQuery)
    const activeOrigins = origins
      .filter((origin) => origin.active)
      .sort((a, b) => compareText(a.name, b.name))

    if (!query) {
      return activeOrigins
    }

    return activeOrigins.filter((origin) =>
      canonicalUiName(origin.name).includes(query)
    )
  }, [origins, originQuery])
  const activeInboundLocations = locations
    .filter((location) => location.active)
    .sort((a, b) => compareText(a.name, b.name))
  const inboundTemplates = useMemo(
    () =>
      buildInboundTemplates({
        items: localItems,
        brands: localBrands,
        origins,
        units,
        barcodeWeightRules,
      }),
    [localItems, localBrands, origins, units, barcodeWeightRules]
  )
  const inboundSessionHistory = useMemo(
    () =>
      buildInboundSessionHistory({
        units,
        items: localItems,
        brands: localBrands,
        origins,
        locations,
        barcodeWeightRules,
      }),
    [units, localItems, localBrands, origins, locations, barcodeWeightRules]
  )
  const historyPageSize = 10
  const historyPageCount = Math.max(
    1,
    Math.ceil(inboundSessionHistory.length / historyPageSize)
  )
  const boundedHistoryPage = Math.min(sessionHistoryPage, historyPageCount)
  const visibleSessionHistory = inboundSessionHistory.slice(
    (boundedHistoryPage - 1) * historyPageSize,
    boundedHistoryPage * historyPageSize
  )
  const productSearchQuery = canonicalUiName(productQuery)
  const quickProductNameSuggestion = productQuery.trim()
  const quickProductNameKey = canonicalUiName(quickProductNameSuggestion)
  const quickProductCreateManufacturerReady = Boolean(
    (preset.brandId && preset.brandId !== "__other") ||
      (preset.brandId === "__other" && brandName.trim())
  )
  const productSearchHasExactMatch = quickProductNameSuggestion
    ? localItems.some((item) => {
        const itemDefaultBrand = item.defaultBrandId
          ? localBrands.find((brand) => brand.id === item.defaultBrandId)
          : null
        const productName = stockProductName(item, "")
        const displayName = selectedManufacturerValue
          ? formatProductName(item, { name: selectedManufacturerValue })
          : formatProductName(item, itemDefaultBrand)

        return (
          item.active &&
          (canonicalUiName(item.name) === quickProductNameKey ||
            canonicalUiName(productName) === quickProductNameKey ||
            canonicalUiName(displayName) === quickProductNameKey ||
            canonicalUiName(item.itemCode) === quickProductNameKey)
        )
      })
    : false
  const quickManufacturerNameSuggestion = brandQuery.trim()
  const quickManufacturerNameKey = canonicalUiName(
    quickManufacturerNameSuggestion
  )
  const manufacturerSearchHasExactMatch = quickManufacturerNameSuggestion
    ? localBrands.some(
        (brand) =>
          brand.active &&
          canonicalUiName(brand.name) === quickManufacturerNameKey
      )
    : false

  function focusManufacturerSearch() {
    brandSearchInputRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    })
    window.setTimeout(() => brandSearchInputRef.current?.focus(), 0)
  }
  const quickOriginNameSuggestion = originQuery.trim()
  const quickOriginNameKey = canonicalUiName(quickOriginNameSuggestion)
  const originSearchHasExactMatch = quickOriginNameSuggestion
    ? origins.some(
        (origin) =>
          origin.active &&
          canonicalUiName(origin.name) === quickOriginNameKey
      )
    : false
  const filteredItems = localItems
    .filter((item) => {
      if (!productSearchQuery) {
        return true
      }

      const searchableText = [
        item.itemCode,
        item.category,
        item.section,
        item.name,
        stockProductName(item, ""),
        formatProductName(
          item,
          item.defaultBrandId
            ? localBrands.find((brand) => brand.id === item.defaultBrandId)
            : null
        ),
        selectedManufacturerValue
          ? formatProductName(item, { name: selectedManufacturerValue })
          : "",
      ].join(" ")

      return canonicalUiName(searchableText).includes(productSearchQuery)
    })
    .sort((a, b) => {
      const aName = selectedManufacturerValue
        ? formatProductName(a, { name: selectedManufacturerValue })
        : formatProductName(
            a,
            a.defaultBrandId
              ? localBrands.find((brand) => brand.id === a.defaultBrandId)
              : null
          )
      const bName = selectedManufacturerValue
        ? formatProductName(b, { name: selectedManufacturerValue })
        : formatProductName(
            b,
            b.defaultBrandId
              ? localBrands.find((brand) => brand.id === b.defaultBrandId)
              : null
          )

      return compareText(aName, bName)
    })
  const quickInboundItems = filteredItems
    .filter((item) => item.active)
    .sort((a, b) => {
      const aName = selectedManufacturerValue
        ? formatProductName(a, { name: selectedManufacturerValue })
        : formatProductName(
            a,
            a.defaultBrandId
              ? localBrands.find((brand) => brand.id === a.defaultBrandId)
              : null
          )
      const bName = selectedManufacturerValue
        ? formatProductName(b, { name: selectedManufacturerValue })
        : formatProductName(
            b,
            b.defaultBrandId
              ? localBrands.find((brand) => brand.id === b.defaultBrandId)
              : null
          )

      return compareText(aName, bName)
    })
  const duplicateBarcode = barcode
    ? isDuplicateInboundBarcode(barcode)
    : false
  const savedSessionScans = recentLabels.filter(
    (label) => label.status === "SAVED"
  )
  const voidedSessionScans = recentLabels.filter(
    (label) => label.status === "VOIDED"
  )
  const wholeSessionVoided =
    Boolean(sessionFinishedAt) &&
    savedSessionScans.length === 0 &&
    voidedSessionScans.length > 0
  const inboundSessionStatus = wholeSessionVoided
    ? "Voided"
    : sessionFinishedAt
      ? "Finished"
      : "Open"
  const recentInboundCount = savedSessionScans.length
  const recentInboundWeightKg = savedSessionScans.reduce(
    (total, label) => total + Number(label.weightKg || 0),
    0
  )
  const latestSavedScan = savedSessionScans[0]
  const hasSavedSessionEntries = savedSessionScans.length > 0
  const manualPreviousWeightText = pendingInternalLabel
    ? `${pendingInternalLabel.weightKg} kg`
    : latestSavedScan
      ? `${latestSavedScan.weightKg} kg`
      : "No saved unit yet"
  const inboundScanSummary = latestSavedScan
    ? `${latestSavedScan.productName} - ${latestSavedScan.weightKg} kg`
    : ""
  const inboundScanUnitLabel =
    inboundMode === "internal_label" ? "saved unit" : "saved scan"
  const inboundScanTotalSummary =
    recentInboundCount > 0
      ? `${recentInboundCount} ${inboundScanUnitLabel}${
          recentInboundCount === 1 ? "" : "s"
        } / ${recentInboundWeightKg.toFixed(3)} kg total`
      : `0 ${inboundScanUnitLabel}s / 0.000 kg total`
  const inboundUndoEntryLabel =
    inboundMode === "internal_label" ? "unit" : "scan"
  const inboundUndoEmptyMessage = `No saved ${inboundUndoEntryLabel} to undo yet.`
  const inboundUndoMissingMessage = `No saved ${inboundUndoEntryLabel} to undo.`
  const inboundUndoSuccessMessage = `Previous ${inboundUndoEntryLabel} undone. Audit trail kept.`
  const inboundUndoFailureMessage = `${
    inboundMode === "internal_label" ? "Unit" : "Scan"
  } was not undone. Ask manager to check.`

  async function undoLatestInboundScan() {
    if (!latestSavedScan) {
      setLatestScanUndoMessage(inboundUndoMissingMessage)
      return
    }

    if (sessionFinishedAt) {
      setLatestScanUndoMessage("Finished. Delete whole session.")
      return
    }

    setLatestScanUndoing(true)
    setLatestScanUndoMessage("")

    const formData = new FormData()
    formData.set("stockUnitId", latestSavedScan.stockUnitId)
    formData.set("batchNo", batchNo)
    formData.set("reason", "Undo previous inbound scan")

    const result = await undoInboundScanAction(initialStockActionState, formData)

    if (result.status === "success" && result.voidedStockUnitId) {
      setRecentLabels((current) =>
        current.map((label) =>
          label.stockUnitId === result.voidedStockUnitId
            ? { ...label, status: "VOIDED" }
          : label
        )
      )
      setLatestScanUndoMessage(inboundUndoSuccessMessage)
    } else {
      setLatestScanUndoMessage(
        result.message || inboundUndoFailureMessage
      )
    }

    setLatestScanUndoing(false)
  }

  const scopeLocked =
    Boolean(sessionFinishedAt) ||
    hasSavedSessionEntries ||
    Boolean(pendingInternalLabel)
  const scopeLockedReason = sessionFinishedAt
    ? "Finished. Start new to change."
    : pendingInternalLabel
      ? "Scan or cancel pending label first."
      : "Saved stock exists. Finish or delete."
  const setupChangeProtectionMessage =
    "Review only. Finish or delete to change."
  const finishBlockedByPendingLabel = Boolean(pendingInternalLabel)
  const finishBlockedByNoSavedScan = savedSessionScans.length === 0
  const finishBlockedNoSavedMessage = inboundMode === "internal_label"
    ? "Save one unit first."
    : "Save one barcode first."
  function finishInboundSession() {
    if (finishBlockedByPendingLabel) {
      setDecodeStatus("warning")
      setDecodeMessage("Cancel pending label first.")
      return
    }

    if (finishBlockedByNoSavedScan) {
      setDecodeStatus("warning")
      setDecodeMessage(finishBlockedNoSavedMessage)
      return
    }

    setSessionFinishedAt(new Date().toISOString())
    setLatestScanUndoMessage("")
    setWholeSessionUndoMessage("")
    setWholeSessionUndoConfirmOpen(false)
    setInboundPrintTarget(null)
    setInboundStep("summary")
  }

  const summaryStepLockedMessage =
    recentInboundCount > 0
      ? "Finish session for summary."
      : inboundMode === "internal_label"
        ? "Save at least one unit before summary."
        : "Save at least one barcode before summary."
  const scanSetupReady = Boolean(
    preset.itemId &&
      preset.brandId &&
      preset.brandId !== "__other" &&
      preset.originId &&
      (preset.originId !== "__other" || originName.trim()) &&
      preset.locationId
  )
  const inboundScannerContextSummary = scanSetupReady
    ? [
        `Batch: ${batchNo}`,
        `Display product: ${selectedProductDisplayName}`,
        `Product: ${selectedProductName}`,
        `Manufacturer: ${selectedManufacturerName}`,
        `Origin: ${selectedOriginName}`,
        `Location: ${selectedLocation?.name ?? "No location"}`,
      ].join("\n")
    : ""
  const barcodeRuleSetupReady = scanSetupReady
  const shouldOpenWeightRulePanel =
    barcodeRuleSetupReady && !canUseBarcodeRuleForSession && !sessionFinishedAt
  const mustSaveCurrentRule =
    inboundStep === "rule" && barcodeRuleSetupReady && !canUseBarcodeRuleForSession
  const ruleExtractedPreview = decodeBarcodeWeight({
    barcode,
    startText: preset.barcodeWeightStart,
    lengthText: preset.barcodeWeightLength,
    decimalsText: preset.barcodeWeightDecimals,
    fixedWeightKgText: preset.fixedWeightKg,
  })
  const ruleExtractedPreviewWeightKg =
    ruleExtractedPreview.status === "decoded" ||
    ruleExtractedPreview.status === "manual_confirmation_required"
      ? ruleExtractedPreview.weightKg
      : ""
  const rulePreviewInvalid =
    inboundStep === "rule" &&
    Boolean(barcode.trim()) &&
    !ruleExtractedPreviewWeightKg
  const manualWeightConfirmationReady =
    inboundMode === "supplier_barcode" &&
    inboundStep === "scan" &&
    canUseBarcodeRuleForSession &&
    ruleExtractedPreview.status === "manual_confirmation_required" &&
    Boolean(barcode.trim()) &&
    Number(netWeightKg) > 0
  const detectedRuleEndPosition =
    Number(preset.barcodeWeightStart) + Number(preset.barcodeWeightLength) - 1
  const showDetectedRulePreview =
    inboundStep === "rule" &&
    Boolean(barcode.trim()) &&
    Number(netWeightKg) > 0 &&
    Number.isFinite(detectedRuleEndPosition) &&
    Boolean(preset.barcodeWeightStart) &&
    Boolean(preset.barcodeWeightLength) &&
    Boolean(preset.barcodeWeightDecimals)
  const ruleSampleNeedsActualKg =
    inboundStep === "rule" &&
    !canUseBarcodeRuleForSession &&
    (!barcode.trim() || !(Number(netWeightKg) > 0))
  const fixedWeightFallbackActive = Boolean(preset.fixedWeightKg.trim())
  const selectedItemDefaultWeightKg =
    selectedItem?.defaultWeightKg && selectedItem.defaultWeightKg > 0
      ? selectedItem.defaultWeightKg.toFixed(3)
      : ""
  const fixedWeightFallbackValue =
    preset.fixedWeightKg.trim() ||
    selectedItemDefaultWeightKg
  const canToggleFixedWeightFallback = Boolean(fixedWeightFallbackValue)
  const ruleSaveSummaryRows = [
    ["Display product", selectedProductDisplayName],
    ["Product", selectedProductName],
    ["Manufacturer", selectedManufacturerName],
    ["Origin", selectedOriginName],
    ["Sample barcode", barcode.trim() || "-"],
    ["Barcode length", barcode.trim() ? String(barcode.trim().length) : "-"],
    ["Weight start position", preset.barcodeWeightStart || "-"],
    ["Weight digit length", preset.barcodeWeightLength || "-"],
    ["Weight decimals", preset.barcodeWeightDecimals || "-"],
    [
      "Extracted preview",
      ruleExtractedPreviewWeightKg
        ? `${Number(ruleExtractedPreviewWeightKg).toFixed(3)} kg`
        : "-",
    ],
  ] as const
  const scanBlocked = !scanSetupReady || !isOnline || Boolean(sessionFinishedAt)
  const quickItemCode = generatedItemCode(localItems)
  const activePrintLabels = recentLabels.filter(
    (label) => label.status === "SAVED"
  )
  const labelsForPrint = pendingInternalLabel
    ? [pendingInternalLabel]
    : activePrintLabels
  const visibleInboundSteps: InboundStep[] =
    inboundMode === "internal_label"
      ? ["setup", "manual", "summary"]
      : ["setup", "rule", "scan", "summary"]
  const inboundStepLabel = (step: InboundStep) => {
    if (scopeLocked && step === "setup") {
      return "Review Setup"
    }

    if (scopeLocked && step === "rule") {
      return "Review Barcode Rule"
    }

    if (sessionFinishedAt && step === activeScanStep) {
      return manualMode ? "Review Manual Weight" : "Review Scanner"
    }

    if (step === "summary" && inboundMode === "internal_label") {
      return "3 Summary"
    }

    return inboundStepLabels[step]
  }
  const scannerVisible =
    inboundStep === "rule" || inboundStep === "scan" || inboundStep === "manual"
  const barcodeScannerVisible =
    inboundStep === "rule" ||
    inboundStep === "scan" ||
    (inboundStep === "manual" && Boolean(pendingInternalLabel))
  const manualMode = inboundMode === "internal_label"
  const showInternalLabelFallbackCue =
    manualMode &&
    scannerVisible &&
    !sessionFinishedAt &&
    !pendingInternalLabel &&
    decodeMessage.includes("Use internal label")
  const inboundSummaryNextAction = manualMode
    ? "Print labels."
    : "Move stock when ready."
  const inboundCardTitle = manualMode
    ? "Inbound without Barcode"
    : "Inbound with Barcode"
  const inboundCardDescription = manualMode
    ? "Choose once. Enter weights."
    : "Choose once. Scan barcodes."
  const activeScanStep: InboundStep = manualMode ? "manual" : "scan"
  const inboundPageNumber = Math.max(
    visibleInboundSteps.findIndex((step) => step === inboundStep) + 1,
    1
  )
  const inboundPageTitle: Record<InboundStep, string> = {
    setup: "Session Setup",
    rule: "Barcode Rule",
    scan: "Scanner",
    manual: "Manual Weight Entry",
    summary: "Session Summary",
  }
  const inboundPageHelp: Record<InboundStep, string> = {
    setup: "Choose setup once.",
    rule:
      "Scan sample, enter kg.",
    scan: "Keep scanning.",
    manual: "Enter weight. Saves now.",
    summary: "Review session.",
  }
  const sessionStartedText = new Date(sessionStartedAt).toLocaleString()
  const inboundSummaryTitle = manualMode
    ? "Page 3: Inbound without barcode session summary"
    : "Page 4: Inbound session summary"
  const sessionFinishedText = sessionFinishedAt
    ? new Date(sessionFinishedAt).toLocaleString()
    : "-"
  const sessionSummaryPrintRows = [
    ["Session status", inboundSessionStatus],
    ["Display product", selectedProductDisplayName],
    ["Product", selectedProductName],
    ["Manufacturer", selectedManufacturerName],
    ["Origin", selectedOriginName],
    ["Location", selectedLocation?.name ?? "No location"],
    ["Inbound mode", manualMode ? "Inbound without Barcode" : "Inbound with Barcode"],
    [
      manualMode ? "Total count" : "Total barcode units",
      recentInboundCount.toLocaleString(),
    ],
    ["Total weight", `${recentInboundWeightKg.toFixed(3)} kg`],
    ["Duplicate/error scans", sessionErrors.length.toLocaleString()],
    ["Scanned by", scannedByName],
    ["Batch", batchNo],
    ["Started", sessionStartedText],
    ["Finished", sessionFinishedText],
  ] as const

  function applyInboundTemplate(template: InboundTemplate) {
    if (scopeLocked) {
      setDecodeStatus("warning")
      setDecodeMessage(scopeLockedReason)
      return
    }

    const next = applyMatchingWeightRule(
      {
        ...preset,
        itemId: template.itemId,
        brandId: template.brandId,
        originId: template.originId,
      },
      barcodeWeightRules
    )

    clearInboundDraftScan()
    setPreset(next)
    setSessionBarcodeRuleSaved(false)
    setSessionBarcodeRuleLength(null)
    setProductQuery(template.label)
    setBrandQuery(template.manufacturerName)
    setOriginQuery(template.originName)
    setBrandName("")
    setOriginName("")

    if (inboundMode === "internal_label") {
      setInboundMode("internal_label")
      setDecodeStatus(next.locationId ? "success" : "warning")
      setDecodeMessage(
        !next.locationId
          ? "Choose location, then enter weight."
          : "Ready. Enter weight."
      )
      if (inboundPresetCanScan(next)) {
        setInboundStep("manual")
        window.setTimeout(() => netWeightInputRef.current?.focus(), 0)
      }
      return
    }

    setInboundMode("supplier_barcode")
    setDecodeStatus(template.hasRule ? "success" : "warning")
    setDecodeMessage(
      !next.locationId
        ? "Choose location, then scan."
        : template.hasRule
        ? "Ready. Scan next barcode."
        : "Scan sample, enter kg."
    )
    if (inboundPresetCanScan(next)) {
      setInboundStep(template.hasRule ? "scan" : "rule")
      window.setTimeout(() => barcodeInputRef.current?.focus(), 0)
    }
  }

  function applyInboundHistorySetup(session: InboundSessionHistory) {
    if (scopeLocked) {
      setDecodeStatus("warning")
      setDecodeMessage(scopeLockedReason)
      return
    }

    const next = applyMatchingWeightRule(
      normalizeInboundPreset(
        {
          ...preset,
          itemId: session.itemId,
          brandId: session.brandId,
          originId: session.originId,
          locationId: session.locationId,
        },
        localItems,
        locations,
        localBrands,
        origins,
        defaultLocationId
      ),
      barcodeWeightRules
    )

    setRecentLabels([])
    setSessionErrors([])
    setSessionFinishedAt(null)
    setBatchNo(generateInboundBatchNo())
    setSessionStartedAt(new Date().toISOString())
    labelSerialRef.current = 0
    clearInboundDraftScan()
    setPreset(next)
    setSelectedHistorySessionCode(null)
    setSessionBarcodeRuleSaved(false)
    setSessionBarcodeRuleLength(null)
    setProductQuery(session.displayName)
    setBrandQuery(session.manufacturerName)
    setOriginQuery(session.originName)
    setBrandName("")
    setOriginName("")
    setSessionSetupNotice(`New session ready: ${session.displayName}.`)

    if (!inboundPresetCanScan(next)) {
      setDecodeStatus("warning")
      setDecodeMessage("Review setup before scanning.")
      setInboundStep("setup")
      return
    }

    if (manualMode) {
      setDecodeStatus("success")
      setDecodeMessage("Ready. Enter weight.")
      setInboundStep("manual")
      window.setTimeout(() => netWeightInputRef.current?.focus(), 0)
      return
    }

    setInboundMode("supplier_barcode")
    setDecodeStatus(session.hasRule ? "success" : "warning")
    setDecodeMessage(
      session.hasRule
        ? "Ready. Scan next barcode."
        : "Scan sample, enter kg."
    )
    setInboundStep(session.hasRule ? "scan" : "rule")
    window.setTimeout(() => barcodeInputRef.current?.focus(), 0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{inboundCardTitle}</CardTitle>
        <CardDescription>
          {inboundCardDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={formAction}
          onSubmit={handleInboundFormSubmit}
          className="space-y-4"
        >
          <div data-stock-action="guided-inbound-submit-context" hidden>
            <input type="hidden" name="itemId" value={preset.itemId} />
            <input type="hidden" name="brandId" value={preset.brandId} />
            <input type="hidden" name="brandName" value={brandName.trim()} />
            <input type="hidden" name="originId" value={preset.originId} />
            <input type="hidden" name="originName" value={originName.trim()} />
            <input type="hidden" name="locationId" value={preset.locationId} />
            <input
              type="hidden"
              name="inboundSource"
              value={preset.inboundSource}
            />
            <input type="hidden" name="batchNo" value={batchNo} />
            <input
              type="hidden"
              name="barcodeWeightStart"
              value={preset.barcodeWeightStart}
            />
            <input
              type="hidden"
              name="barcodeWeightLength"
              value={preset.barcodeWeightLength}
            />
            <input
              type="hidden"
              name="barcodeWeightDecimals"
              value={preset.barcodeWeightDecimals}
            />
          </div>
          <div
            data-stock-action="guided-inbound-flow"
            className={
              manualMode
                ? "grid gap-2 sm:grid-cols-3"
                : "grid gap-2 sm:grid-cols-4"
            }
          >
            {visibleInboundSteps.map((step) => {
              const disabled =
                (step === "rule" && !barcodeRuleSetupReady) ||
                (step === "scan" &&
                  (!scanSetupReady ||
                    (inboundMode === "supplier_barcode" &&
                      !canUseBarcodeRuleForSession))) ||
                (step === "manual" && !scanSetupReady) ||
                (step === "summary" && !sessionFinishedAt)

              return (
                <Button
                  key={step}
                  type="button"
                  variant={inboundStep === step ? "default" : "outline"}
                  className="min-h-12 whitespace-normal"
                  disabled={disabled}
                  onClick={() => goInboundStep(step)}
                >
                  {inboundStepLabel(step)}
                </Button>
              )
            })}
          </div>
          {!sessionFinishedAt ? (
            <div
              data-stock-action="inbound-summary-locked-cue"
              role="status"
              aria-live="polite"
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
            >
              {summaryStepLockedMessage}
            </div>
          ) : null}

          <div
            data-stock-action="guided-inbound-page-cue"
            className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          >
            <div className="text-xs font-semibold uppercase tracking-wide">
              Page {inboundPageNumber}/{visibleInboundSteps.length}
            </div>
            <div className="mt-1 text-base font-semibold">
              {inboundPageTitle[inboundStep]}
            </div>
            <div className="mt-1 text-emerald-800">
              {inboundPageHelp[inboundStep]}
            </div>
          </div>
          {scopeLocked && inboundStep !== "summary" ? (
            <div
              data-stock-action="safe-back-review-warning"
              role="status"
              aria-live="polite"
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
            >
              Review only. Saved entries stay. Setup is locked.
            </div>
          ) : null}

          <div
            data-stock-action="read-only-inbound-session-code"
            className="rounded-md border bg-muted/30 p-3 text-sm"
          >
            <div className="text-xs uppercase text-muted-foreground">
              Inbound session code
            </div>
            <div className="mt-1 break-all font-mono text-base font-semibold">
              {batchNo}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Auto code.
            </div>
          </div>

          {inboundStep === "setup" ? (
            <div
              data-stock-action="inbound-session-history"
              className="rounded-lg border bg-background p-3 text-sm"
            >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">Inbound Session History</div>
                <div className="text-xs text-muted-foreground">
                  10 per page.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={startNewInboundSession}
              >
                Start new session
              </Button>
            </div>

            {!sessionFinishedAt && (scanSetupReady || recentLabels.length > 0) ? (
              <div
                data-stock-action="continue-current-inbound-session"
                className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"
              >
                <div className="font-medium">Current unfinished session</div>
                <div className="mt-1 break-all font-mono text-xs">
                  {batchNo}
                </div>
                <div className="mt-1 text-xs">
                  {recentInboundCount} saved /{" "}
                  {recentInboundWeightKg.toFixed(3)} kg
                </div>
                <Button
                  type="button"
                  className="mt-3 min-h-11 w-full"
                  onClick={() =>
                    goInboundStep(
                      manualMode || canUseBarcodeRuleForSession
                        ? activeScanStep
                        : "rule"
                    )
                  }
                >
                  Continue unfinished session
                </Button>
              </div>
            ) : null}

            <div className="mt-3 grid gap-2">
              {visibleSessionHistory.map((session) => (
                <div
                  key={session.batchNo}
                  className="rounded-md border bg-muted/30 p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="break-words font-medium">
                        {session.displayName}
                      </div>
                      <div className="break-all font-mono text-xs text-muted-foreground">
                        {session.batchNo}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {session.locationName} /{" "}
                        {new Date(session.lastAt).toLocaleString()}
                      </div>
                      {session.voidedCount > 0 ? (
                        <div className="mt-1 text-xs font-medium text-amber-700">
                          {session.voidedCount} voided kept for audit
                        </div>
                      ) : null}
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-semibold">
                        {session.count} / {session.totalWeightKg.toFixed(3)} kg
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.manufacturerName}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-10 w-full"
                    onClick={() =>
                      setSelectedHistorySessionCode((current) =>
                        current === session.batchNo ? null : session.batchNo
                      )
                    }
                  >
                    {selectedHistorySessionCode === session.batchNo
                      ? "Hide details"
                      : "View details"}
                  </Button>
                  <Button
                    type="button"
                    data-stock-action="use-inbound-history-setup"
                    variant="outline"
                    className="mt-2 min-h-10 w-full"
                    disabled={scopeLocked}
                    onClick={() => applyInboundHistorySetup(session)}
                  >
                    Use same setup
                  </Button>
                  {selectedHistorySessionCode === session.batchNo ? (
                    <div
                      data-stock-action="inbound-session-history-details"
                      className="mt-3 rounded-md border bg-background px-3 py-2 text-xs"
                    >
                      <div>Display name: {session.displayName}</div>
                      <div>Manufacturer: {session.manufacturerName}</div>
                      <div>Location: {session.locationName}</div>
                      <div>
                        Saved: {session.count} /{" "}
                        {session.totalWeightKg.toFixed(3)} kg
                      </div>
                      <div>Voided: {session.voidedCount}</div>
                      <div>Started: {new Date(session.startedAt).toLocaleString()}</div>
                      <div>Last scan: {new Date(session.lastAt).toLocaleString()}</div>
                      <div className="mt-2 break-all font-mono">
                        {session.barcodes.slice(0, 20).join(", ") ||
                          "No barcode details"}
                      </div>
                      {session.barcodes.length > 20 ? (
                        <div className="mt-1 text-muted-foreground">
                          Showing latest 20 barcodes.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              {visibleSessionHistory.length === 0 ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground">
                  No previous inbound sessions yet.
                </div>
              ) : null}
            </div>

            {inboundSessionHistory.length > historyPageSize ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10"
                  disabled={boundedHistoryPage <= 1}
                  onClick={() =>
                    setSessionHistoryPage((page) => Math.max(1, page - 1))
                  }
                >
                  Previous
                </Button>
                <div className="flex min-h-10 items-center justify-center rounded-md border bg-muted/30 text-sm">
                  Page {boundedHistoryPage} / {historyPageCount}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10"
                  disabled={boundedHistoryPage >= historyPageCount}
                  onClick={() =>
                    setSessionHistoryPage((page) =>
                      Math.min(historyPageCount, page + 1)
                    )
                  }
                >
                  Next
                </Button>
              </div>
            ) : null}
            </div>
          ) : null}

          {sessionSetupNotice && inboundStep === "setup" ? (
            <div
              data-stock-action="new-inbound-session-ready-cue"
              role="status"
              aria-live="polite"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium break-words text-emerald-800"
            >
              {sessionSetupNotice}
            </div>
          ) : null}

          <div className={inboundStep === "setup" ? "space-y-2" : "hidden"}>
            {scopeLocked ? (
              <div
                data-stock-action="read-only-inbound-setup-review"
                role="status"
                aria-live="polite"
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
              >
                Setup locked. Finish or delete first.
                <span className="mt-1 block text-xs font-medium">
                  {scopeLockedReason}
                </span>
                {hasSavedSessionEntries ? (
                  <div
                    data-stock-action="inbound-session-change-protection-warning"
                    className="mt-3 rounded-md border border-amber-300 bg-white/80 px-3 py-2 text-xs font-semibold text-amber-900"
                  >
                    {setupChangeProtectionMessage}
                  </div>
                ) : null}
                {hasSavedSessionEntries &&
                !sessionFinishedAt &&
                !pendingInternalLabel ? (
                  <Button
                    type="button"
                    data-stock-action="finish-current-session-before-setup-change"
                    variant="outline"
                    className="mt-3 min-h-11 w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                    onClick={finishInboundSession}
                  >
                    Finish current session
                  </Button>
                ) : null}
                {sessionFinishedAt && hasSavedSessionEntries ? (
                  <Button
                    type="button"
                    data-stock-action="review-delete-whole-session-from-locked-setup"
                    variant="outline"
                    className="mt-3 min-h-11 w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                    onClick={() => goInboundStep("summary")}
                  >
                    Review summary or delete whole session
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={manualMode ? "outline" : "default"}
                className="min-h-14 whitespace-normal"
                disabled={scopeLocked}
                onClick={() => switchInboundMode("supplier_barcode")}
              >
                Inbound with Barcode
              </Button>
              <Button
                type="button"
                variant={manualMode ? "default" : "outline"}
                className="min-h-14 whitespace-normal"
                disabled={scopeLocked}
                onClick={() => switchInboundMode("internal_label")}
              >
                Inbound without Barcode
              </Button>
            </div>
            <div
              data-stock-action="inbound-mode-guidance"
              className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium"
            >
              {manualMode ? "Mode: enter weights" : "Mode: scan barcodes"}
            </div>
            <div
              data-stock-action="inbound-page-one-required-setup"
              className="rounded-lg border bg-background p-3 text-sm"
            >
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {manualMode
                  ? "Page 1: Inbound without barcode setup"
                  : "Page 1 required setup"}
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="setupLocationId">Inbound location</Label>
                  <LocationSelect
                    id="setupLocationId"
                    name="locationId"
                    locations={locations}
                    value={preset.locationId}
                    onChange={(value) =>
                      selectInboundSetup("locationId", value)
                    }
                    disabled={scopeLocked}
                  />
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                {selectedLocation
                  ? `Using location: ${selectedLocation.name}.`
                  : "Choose location first."}
                {locationDefaultedToAssigned && assignedDefaultLocation
                  ? " Profile default."
                  : ""}
                  </div>
                </div>
                <div
                  data-stock-action="page-one-generated-display-name"
                  className="rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Display name
                  </div>
                  <div className="mt-1 break-words text-lg font-semibold">
                    {selectedProductDisplayName}
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                    <div>Product: {selectedProductName}</div>
                    <div>Manufacturer: {selectedManufacturerName}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="font-medium">Recent inbound templates</div>
            {inboundTemplates.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {inboundTemplates.map((template) => (
                  <Button
                    key={template.key}
                    type="button"
                    variant={
                      preset.itemId === template.itemId &&
                      preset.brandId === template.brandId &&
                      preset.originId === template.originId
                        ? "default"
                        : "outline"
                    }
                    className="h-auto min-w-0 justify-start break-words whitespace-normal py-3 text-left"
                    disabled={scopeLocked}
                    onClick={() => applyInboundTemplate(template)}
                  >
                    <span data-stock-action="recent-inbound-template-card">
                      <span className="block font-medium">
                        {template.label}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                No recent templates yet.
              </div>
            )}
            {inboundTemplates.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Tap recent product.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div
              className={
                barcodeScannerVisible
                  ? "md:col-span-2"
                  : "hidden"
              }
            >
              {!isOnline ? (
                <OfflineScanAlert className="mb-3" />
              ) : null}
              {!scanSetupReady && !sessionFinishedAt ? (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  Choose setup first.
                </div>
              ) : null}
              {sessionFinishedAt ? (
                <div
                  data-stock-action="finished-inbound-scan-stop"
                  role="status"
                  aria-live="polite"
                  className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
                >
                  Session finished. Review only.
                </div>
              ) : null}
              {scanSetupReady && !sessionFinishedAt ? (
                <div
                  data-stock-action="sticky-inbound-active-session-summary"
                  role="status"
                  aria-live="polite"
                  className="sticky top-2 z-20 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 shadow-sm"
                >
                  <div className="text-xs font-semibold uppercase">
                    {inboundStep === "rule"
                      ? "Learning barcode rule"
                      : manualMode
                        ? "Manual label inbound"
                        : "Scanning inbound"}
                  </div>
                  <div className="mt-1 text-base font-semibold">
                    {selectedProductDisplayName}
                  </div>
                  <div className="mt-1 break-all font-mono text-xs text-emerald-800">
                    {batchNo}
                  </div>
                  <div className="mt-1 grid gap-1 text-xs text-emerald-800 sm:grid-cols-2">
                    <div>Product: {selectedProductName}</div>
                    <div>Manufacturer: {selectedManufacturerName}</div>
                  </div>
                  <div className="mt-1 text-emerald-800">
                    {selectedOriginName}{" "}
                    - {selectedLocation?.name ?? "No location"}
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-emerald-200 bg-background/70 px-3 py-2">
                      <div className="text-xs uppercase text-emerald-800">
                        Saved
                      </div>
                      <div className="font-semibold">
                        {recentInboundCount}
                      </div>
                    </div>
                    <div className="rounded-md border border-emerald-200 bg-background/70 px-3 py-2">
                      <div className="text-xs uppercase text-emerald-800">
                        Weight
                      </div>
                      <div className="font-semibold">
                        {recentInboundWeightKg.toFixed(3)} kg
                      </div>
                    </div>
                  </div>
                  {scopeLocked ? (
                    <div className="mt-2 rounded-md border border-emerald-200 bg-background/70 px-3 py-2 text-xs font-medium text-emerald-800">
                      {sessionFinishedAt
                        ? "Finished. Start new to change."
                        : "Session locked. Finish first."}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <BarcodeField
                inputRef={barcodeInputRef}
                id="barcode"
                name="barcode"
                label={
                  inboundStep === "rule"
                    ? "Sample barcode"
                    : manualMode
                      ? "Generated barcode"
                      : "Barcode"
                }
                value={barcode}
                onChange={(value) => handleBarcodeChange(value)}
                onScan={(value) => handleBarcodeChange(value, true)}
                scanContextSummary={inboundScannerContextSummary}
                scanSummary={inboundScanSummary}
                scanTotalSummary={inboundScanTotalSummary}
                scanFeedbackMessage={decodeMessage}
                scanFeedbackStatus={decodeStatus}
                scanActionSlot={
                  (inboundStep === "scan" || inboundStep === "manual") &&
                  !sessionFinishedAt ? (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 w-full"
                        disabled={latestScanUndoing || !latestSavedScan}
                        onClick={undoLatestInboundScan}
                      >
                        {latestScanUndoing
                          ? "Undoing..."
                          : manualMode
                            ? "Undo Last Weight Entry"
                            : "Undo Last Scan"}
                      </Button>
                      {latestScanUndoMessage ? (
                        <div
                          role="status"
                          aria-live="polite"
                          className="text-sm break-words text-muted-foreground"
                        >
                          {latestScanUndoMessage}
                        </div>
                      ) : !latestSavedScan ? (
                        <div className="text-sm break-words text-muted-foreground">
                          {inboundUndoEmptyMessage}
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        data-stock-action="scanner-finish-inbound-session"
                        className="min-h-11 w-full"
                        disabled={
                          finishBlockedByNoSavedScan ||
                          finishBlockedByPendingLabel
                        }
                        onClick={finishInboundSession}
                      >
                        Finish Session
                      </Button>
                    </div>
                  ) : undefined
                }
                continuousScan
                placeholder={
                  inboundStep === "rule"
                    ? "Scan sample barcode"
                    : manualMode
                      ? "Label barcode"
                      : "Scan or type barcode"
                }
                helperText={
                  inboundStep === "rule"
                    ? "Scan sample, enter kg."
                    : manualMode
                      ? "Weight saves label."
                      : "Continuous scan is on."
                }
                scanButtonLabel="Use Phone Scanner"
                disabled={scanBlocked}
                disabledReason={
                  !isOnline
                    ? offlineScanMessage
                    : sessionFinishedAt
                      ? "Session finished. Review only."
                      : !scanSetupReady
                        ? "Choose setup first."
                        : ""
                }
              />
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                External scanner: scan into this box.
              </div>
              {!manualMode ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        switchInboundMode("internal_label")
                        setInboundStep("manual")
                      }}
                      disabled={
                        !isOnline ||
                        Boolean(sessionFinishedAt) ||
                        Boolean(pendingInternalLabel) ||
                        !scanSetupReady
                      }
                      className="min-h-12 w-full text-base sm:w-auto"
                    >
                      Use Inbound without Barcode
                    </Button>
                  </div>
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    No weight? Use labels.
                  </div>
                </>
              ) : null}
            </div>

            <div className={inboundStep === "setup" ? "space-y-2" : "hidden"}>
              <Label htmlFor="itemId">Product</Label>
              <Input
                type="search"
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Search manufacturer + product or item code"
                autoComplete="off"
                enterKeyHint="search"
                disabled={scopeLocked}
              />
              {quickInboundItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Quick inbound products
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {quickInboundItems.slice(0, 6).map((item) => {
                      const selected = preset.itemId === item.id
                      const displayName = selectedManufacturerValue
                        ? formatProductName(item, {
                            name: selectedManufacturerValue,
                          })
                        : formatProductName(
                            item,
                            item.defaultBrandId
                              ? localBrands.find(
                                  (brand) => brand.id === item.defaultBrandId
                                )
                              : null
                          )

                      return (
                        <Button
                          key={item.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                          aria-pressed={selected}
                          disabled={scopeLocked}
                          onClick={() => {
                            selectInboundSetup("itemId", item.id)
                            setProductQuery(displayName)
                          }}
                        >
                          <span className="flex flex-col items-start leading-tight">
                            <span>{displayName}</span>
                            <span className="text-xs opacity-80">
                              {item.itemCode} - {item.category}
                            </span>
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tap product.
                  </p>
                </div>
              ) : null}
              <ItemSelect
                items={filteredItems}
                brands={localBrands}
                value={preset.itemId}
                onChange={(value) => {
                  if (value === "__other") {
                    openManualProductEntry()
                    return
                  }

                  selectInboundSetup("itemId", value)
                }}
                manufacturerName={selectedManufacturerValue}
                disabled={scopeLocked}
                allowOther
              />
              {!preset.itemId ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Choose product first.
                </div>
              ) : null}
              {!preset.itemId ? (
                <Button
                  type="button"
                  variant="outline"
                  data-stock-action="use-other-product"
                  className="min-h-11 w-full justify-start whitespace-normal text-left"
                  disabled={scopeLocked}
                  onClick={openManualProductEntry}
                >
                  Use Other Product
                </Button>
              ) : null}
              <details
                data-stock-action="manual-product-entry"
                open={
                  !preset.itemId &&
                  (showManualProductEntry ||
                    (Boolean(quickProductNameSuggestion) &&
                      !productSearchHasExactMatch))
                }
                className="rounded-md border bg-muted/30 p-3"
              >
                <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                  New product
                </summary>
                <p className="mt-2 text-xs text-muted-foreground">
                  Product name.
                </p>
                {!quickProductCreateManufacturerReady ? (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <div>
                      Choose manufacturer first.
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 min-h-11 w-full border-amber-200 bg-white text-amber-900 hover:bg-amber-50"
                      disabled={scopeLocked}
                      onClick={focusManufacturerSearch}
                    >
                      Choose manufacturer
                    </Button>
                  </div>
                ) : null}
                {quickProductNameSuggestion && !productSearchHasExactMatch ? (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Product not found.
                  </div>
                ) : null}
                {quickProductNameSuggestion &&
                quickItemName.trim() !== quickProductNameSuggestion ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-11 w-full justify-start whitespace-normal text-left"
                    disabled={scopeLocked}
                    onClick={() => {
                      setQuickItemName(quickProductNameSuggestion)
                      window.setTimeout(
                        () => quickProductInputRef.current?.focus(),
                        0
                      )
                    }}
                  >
                    Use as product: {quickProductNameSuggestion}
                  </Button>
                ) : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                  <NativeSelect
                    id="quickItemCategory"
                    name="quickItemCategory"
                    value={quickItemCategory}
                    onChange={setQuickItemCategory}
                  >
                    <option value="MEAT">MEAT</option>
                    <option value="ORGANS">ORGANS</option>
                    <option value="PROCESSED">PROCESSED</option>
                  </NativeSelect>
                  <Input
                    ref={quickProductInputRef}
                    value={quickItemName}
                    onChange={(event) => setQuickItemName(event.target.value)}
                    placeholder="Product name only"
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                  <Button
                    type="submit"
                    formAction={quickCreateAction}
                    data-stock-action="quick-create-item"
                    formNoValidate
                    disabled={
                      quickCreatePending ||
                      quickItemName.trim().length < 2 ||
                      !quickProductCreateManufacturerReady ||
                      scopeLocked
                    }
                    variant="outline"
                    className="min-h-11 w-full sm:w-auto"
                  >
                    {quickCreatePending ? "Saving product..." : "Save product now"}
                  </Button>
                </div>
                <input type="hidden" name="itemCode" value={quickItemCode} />
                <input type="hidden" name="category" value={quickItemCategory} />
                <input
                  type="hidden"
                  name="defaultBrandId"
                  value={
                    preset.brandId && preset.brandId !== "__other"
                      ? preset.brandId
                      : ""
                  }
                />
                <input
                  type="hidden"
                  name="defaultBrandName"
                  value={
                    preset.brandId === "__other" ? brandName.trim() : ""
                  }
                />
                <input type="hidden" name="section" value="GENERAL" />
                <input type="hidden" name="name" value={quickItemName} />
                <input type="hidden" name="barcodeRequired" value="true" />
                <input type="hidden" name="defaultLowStockLevel" value="0" />
                <div className="mt-2 text-xs text-muted-foreground">
                  Item code: {quickItemCode}
                </div>
                <ActionMessage state={quickCreateState} />
              </details>
            </div>
            <div className={inboundStep === "setup" ? "space-y-2" : "hidden"}>
              <Label htmlFor="brandId">Manufacturer</Label>
              <Input
                id="inboundBrandSearch"
                ref={brandSearchInputRef}
                type="search"
                value={brandQuery}
                onChange={(event) => setBrandQuery(event.target.value)}
                placeholder="Search manufacturer"
                autoComplete="off"
                enterKeyHint="search"
                disabled={scopeLocked}
              />
              {activeInboundBrands.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Recent manufacturers
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeInboundBrands.slice(0, 6).map((brand) => {
                      const selected = preset.brandId === brand.id

                      return (
                        <Button
                          key={brand.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                          aria-pressed={selected}
                          disabled={scopeLocked}
                          onClick={() => selectInboundBrand(brand.id)}
                        >
                          {brand.name}
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tap manufacturer.
                  </p>
                </div>
              ) : null}
              <BrandSelect
                brands={localBrands}
                value={preset.brandId}
                onChange={selectInboundBrand}
                allowOther
                required
                disabled={scopeLocked}
                emptyLabel="Select manufacturer"
                customLabel="Other / custom manufacturer"
              />
              {quickManufacturerNameSuggestion &&
              !manufacturerSearchHasExactMatch ? (
                <div
                  data-stock-action="manual-manufacturer-entry"
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                >
                  Manufacturer not found.
                </div>
              ) : null}
              {quickManufacturerNameSuggestion &&
              !manufacturerSearchHasExactMatch &&
              (preset.brandId !== "__other" ||
                brandName.trim() !== quickManufacturerNameSuggestion) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full justify-start whitespace-normal text-left"
                  disabled={scopeLocked}
                  onClick={() => {
                    setBrandName(quickManufacturerNameSuggestion)
                    selectInboundBrand("__other")
                  }}
                >
                  Use as manufacturer:{" "}
                  {quickManufacturerNameSuggestion}
                </Button>
              ) : null}
              {preset.brandId === "__other" ? (
                <div
                  data-stock-action="inbound-save-custom-manufacturer"
                  className="space-y-2"
                >
                  <div
                    data-stock-action="custom-manufacturer-save-required"
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
                  >
                    Save manufacturer first.
                  </div>
                  <Input
                    ref={quickManufacturerInputRef}
                    name="brandName"
                    value={brandName}
                    onChange={(event) => setBrandName(event.target.value)}
                    placeholder="Enter custom manufacturer"
                    readOnly={scopeLocked}
                    required
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    formAction={quickBrandCreateAction}
                    formNoValidate
                    data-stock-action="quick-create-brand"
                    disabled={
                      scopeLocked ||
                      quickBrandCreatePending ||
                      brandName.trim().length < 2
                    }
                    className="min-h-11 w-full justify-start whitespace-normal text-left"
                  >
                    {quickBrandCreatePending
                      ? "Saving manufacturer..."
                      : "Save manufacturer now"}
                  </Button>
                  <ActionMessage state={quickBrandCreateState} />
                </div>
              ) : null}
            </div>
            <div className={inboundStep === "setup" ? "space-y-2" : "hidden"}>
              <Label htmlFor="originId">Origin</Label>
              <Input
                id="inboundOriginSearch"
                type="search"
                value={originQuery}
                onChange={(event) => setOriginQuery(event.target.value)}
                placeholder="Search origin"
                autoComplete="off"
                enterKeyHint="search"
                disabled={scopeLocked}
              />
              {activeInboundOrigins.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Quick inbound origins
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeInboundOrigins.slice(0, 6).map((origin) => {
                      const selected = preset.originId === origin.id

                      return (
                        <Button
                          key={origin.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                          aria-pressed={selected}
                          disabled={scopeLocked}
                          onClick={() => selectInboundOrigin(origin.id)}
                        >
                          {origin.name}
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tap origin to avoid dropdown.
                  </p>
                </div>
              ) : null}
              <OriginSelect
                origins={origins}
                value={preset.originId}
                onChange={selectInboundOrigin}
                allowOther
                required
                disabled={scopeLocked}
              />
              {quickOriginNameSuggestion &&
              !originSearchHasExactMatch &&
              (preset.originId !== "__other" ||
                originName.trim() !== quickOriginNameSuggestion) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full justify-start whitespace-normal text-left"
                  disabled={scopeLocked}
                  onClick={() => {
                    setOriginName(quickOriginNameSuggestion)
                    selectInboundOrigin("__other")
                  }}
                >
                  Use search text as custom origin: {quickOriginNameSuggestion}
                </Button>
              ) : null}
              {preset.originId === "__other" ? (
                <Input
                  ref={quickOriginInputRef}
                  name="originName"
                  value={originName}
                  onChange={(event) => setOriginName(event.target.value)}
                  placeholder="Enter custom origin"
                  readOnly={scopeLocked}
                  required
                />
              ) : null}
            </div>
            <div className={inboundStep === "setup" ? "space-y-2" : "hidden"}>
              <Label htmlFor="locationId">Location</Label>
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
              >
                    {selectedLocation
                      ? `Using location: ${selectedLocation.name}.`
                      : "Choose location first."}
                    {locationDefaultedToAssigned && assignedDefaultLocation
                      ? " Profile default."
                      : ""}
              </div>
              <details className="rounded-md border bg-muted/30 p-3">
                <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                  Change Location
                </summary>
                <div className="mt-3 space-y-2">
                  {activeInboundLocations.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Quick inbound locations
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {activeInboundLocations.slice(0, 6).map((location) => {
                          const selected = preset.locationId === location.id

                          return (
                            <Button
                              key={location.id}
                              type="button"
                              variant={selected ? "default" : "outline"}
                              className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                              aria-pressed={selected}
                              disabled={scopeLocked}
                              onClick={() =>
                                selectInboundSetup("locationId", location.id)
                              }
                            >
                              {location.name}
                            </Button>
                          )
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Change location only.
                      </p>
                    </div>
                  ) : null}
                  <LocationSelect
                    locations={locations}
                    value={preset.locationId}
                    onChange={(value) => selectInboundSetup("locationId", value)}
                    disabled={scopeLocked}
                  />
                </div>
              </details>
            </div>
            <div
              className={
                scannerVisible
                  ? "space-y-2"
                  : "hidden"
              }
            >
              <Label htmlFor="netWeightKg">
                {manualMode ? "Enter one unit weight kg" : "Net weight kg"}
              </Label>
              <Input
                ref={netWeightInputRef}
                id="netWeightKg"
                name="netWeightKg"
                type="number"
                step="0.001"
                min="0"
                inputMode="decimal"
                enterKeyHint="done"
                value={netWeightKg}
                onChange={(event) => handleNetWeightChange(event.target.value)}
                onKeyDown={handleNetWeightKeyDown}
                disabled={Boolean(pendingInternalLabel)}
              />
              <p className="text-xs text-muted-foreground">
                {manualMode
                  ? "Enter kg. Press Enter."
                  : currentBarcodeWeightRule
                  ? "Auto-filled by rule."
                  : "Scan sample, enter kg."}
              </p>
              <Button
                type="button"
                variant="outline"
                data-stock-action="generate-internal-label-from-weight"
                onClick={generateLabelBarcode}
                disabled={
                  !isOnline ||
                  Boolean(sessionFinishedAt) ||
                  Boolean(pendingInternalLabel) ||
                  !scanSetupReady
                }
                className="min-h-12 w-full text-base"
              >
                Generate internal label
              </Button>
            </div>
            <div
              data-stock-action="barcode-rule-fields-panel"
              className={
                inboundStep === "rule"
                  ? "rounded-md border bg-muted/30 p-3 md:col-span-2"
                  : "hidden"
              }
            >
              <div className="flex min-h-11 items-center break-words text-sm font-medium">
                {shouldOpenWeightRulePanel
                  ? "Set barcode rule once"
                  : "Weight rule and notes"}
              </div>
              {scopeLocked ? (
                <div
                  data-stock-action="locked-barcode-rule-fields"
                  className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
                >
                  Rule locked. Start new session to change rule.
                </div>
              ) : null}
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inboundSource">Inbound source</Label>
                  <NativeSelect
                    id="inboundSource"
                    name="inboundSource"
                    value={preset.inboundSource}
                    onChange={(value) =>
                      updatePreset(
                        "inboundSource",
                        value as InboundPreset["inboundSource"]
                      )
                    }
                    disabled={scopeLocked}
                  >
                    <option value="supplier_import">Supplier / import</option>
                    <option value="processing_output">Processing output</option>
                    <option value="customer_return">Customer return</option>
                    <option value="transfer_received">Transfer received</option>
                    <option value="manual_adjustment">Manual adjustment</option>
                    <option value="other">Other</option>
                  </NativeSelect>
                  {preset.inboundSource === "customer_return" ? (
                    <p className="text-xs text-amber-700">
                      Customer returns go to inspection first.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcodeWeightStart">Weight start position</Label>
                  <Input
                    id="barcodeWeightStart"
                    name="barcodeWeightStart"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    enterKeyHint="done"
                    value={preset.barcodeWeightStart}
                    disabled={scopeLocked}
                    onChange={(event) =>
                      updatePreset("barcodeWeightStart", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcodeWeightLength">Weight digits</Label>
                  <Input
                    id="barcodeWeightLength"
                    name="barcodeWeightLength"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    enterKeyHint="done"
                    value={preset.barcodeWeightLength}
                    disabled={scopeLocked}
                    onChange={(event) =>
                      updatePreset("barcodeWeightLength", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight decimals</Label>
                  <input
                    name="barcodeWeightDecimals"
                    value={preset.barcodeWeightDecimals}
                    type="hidden"
                    readOnly
                  />
                  <div
                    id="barcodeWeightDecimals"
                    data-stock-action="barcode-rule-decimal-buttons"
                    className="grid gap-2 sm:grid-cols-3"
                  >
                    {[
                      ["1", "0.1"],
                      ["2", "0.01"],
                      ["3", "0.001"],
                    ].map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant={
                          preset.barcodeWeightDecimals === value
                            ? "default"
                            : "outline"
                        }
                        className="min-h-11"
                        disabled={scopeLocked}
                        onClick={() =>
                          updatePreset("barcodeWeightDecimals", value)
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div
                  data-stock-action="fixed-weight-fallback-checkbox"
                  className="space-y-2 rounded-md border bg-background p-3"
                >
                  <label className="flex items-start gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={fixedWeightFallbackActive}
                      disabled={scopeLocked || !canToggleFixedWeightFallback}
                      onChange={(event) =>
                        updatePreset(
                          "fixedWeightKg",
                          event.target.checked ? fixedWeightFallbackValue : ""
                        )
                      }
                      className="mt-1 size-4 rounded border-input"
                    />
                    <span>Use fixed-weight fallback</span>
                  </label>
                  <Label htmlFor="fixedWeightKg">Fixed kg</Label>
                  <Input
                    id="fixedWeightKg"
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    enterKeyHint="done"
                    value={preset.fixedWeightKg}
                    disabled={scopeLocked || !fixedWeightFallbackActive}
                    onChange={(event) =>
                      updatePreset("fixedWeightKg", event.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedItemDefaultWeightKg
                      ? `Default: ${selectedItemDefaultWeightKg} kg.`
                      : "Set default fixed kg first."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchNo">Batch no.</Label>
                  <Input
                    id="batchNo"
                    name="batchNo"
                    value={batchNo}
                    readOnly
                    aria-readonly="true"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto session code.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceNo">Reference no.</Label>
                  <Input
                    id="referenceNo"
                    name="referenceNo"
                    autoComplete="off"
                    enterKeyHint="done"
                    placeholder="GRN-1001"
                    disabled={scopeLocked}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" disabled={scopeLocked} />
                </div>
                {mustSaveCurrentRule ? (
                  <input type="hidden" name="saveWeightRule" value="true" />
                ) : null}
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    name="saveWeightRule"
                    value="true"
                    checked={mustSaveCurrentRule || preset.saveWeightRule}
                    disabled={mustSaveCurrentRule || scopeLocked}
                    onChange={(event) =>
                      updatePreset("saveWeightRule", event.target.checked)
                    }
                    className="size-4 rounded border-input"
                  />
                  {mustSaveCurrentRule
                    ? "Save weight rule for first scan"
                    : "Save weight rule for future scans"}
                </label>
                <p className="text-xs text-muted-foreground md:col-span-2">
                  {mustSaveCurrentRule
                    ? "First barcode teaches rule."
                    : "Future scans use rule."}
                </p>
              </div>
            </div>
          </div>

          <div
            data-stock-action="current-scan-preset-card"
            className={
              inboundStep === "scan" || inboundStep === "manual"
                ? "hidden"
                : "rounded-md border bg-muted/30 p-3 text-sm"
            }
          >
            <div className="font-medium">Current scan preset</div>
            {scopeLocked ? (
              <div className="mb-1 text-xs font-medium text-amber-700">
                {sessionFinishedAt
                  ? "Finished. Start new to change."
                  : "Session locked. Finish first."}
              </div>
            ) : null}
            <div
              data-stock-action="generated-display-name-preview"
              className="mt-2 rounded-md border bg-background px-3 py-2"
            >
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Display name
              </div>
              <div className="mt-1 break-words font-semibold">
                {selectedProductDisplayName}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Manufacturer + product.
              </div>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                Product: {selectedProductName}
              </div>
              <div>
                Manufacturer: {selectedManufacturerName}
              </div>
              <div>
                Origin: {selectedOriginName}
              </div>
              <div>
                Location: {selectedLocation?.name ?? "No location"}
              </div>
            </div>
          </div>

          {inboundStep === "setup" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {manualMode ? (
                <Button
                  type="button"
                  className="min-h-12"
                  disabled={!scanSetupReady}
                  onClick={() => goInboundStep("manual")}
                >
                  Next: Manual Weight
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    className="min-h-12"
                    disabled={!barcodeRuleSetupReady}
                    onClick={() => goInboundStep("rule")}
                  >
                    Next: Barcode Rule Page
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12"
                    disabled={!scanSetupReady}
                    onClick={() =>
                      goInboundStep(canUseBarcodeRuleForSession ? "scan" : "rule")
                    }
                  >
                    {canUseBarcodeRuleForSession
                      ? "Start scanning"
                      : "Set rule first"}
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {inboundStep === "rule" ? (
            <div
              data-stock-action="barcode-rule-selected-product-top"
              className="rounded-md border bg-background p-3 text-sm"
            >
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Barcode rule setup
              </div>
              <div className="font-medium">
                Selected product and manufacturer
              </div>
              <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <span className="font-medium text-foreground">Product:</span>{" "}
                  {selectedProductName}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    Manufacturer:
                  </span>{" "}
                  {selectedManufacturerName}
                </div>
                <div>
                  <span className="font-medium text-foreground">Origin:</span>{" "}
                  {selectedOriginName}
                </div>
                <div>
                  <span className="font-medium text-foreground">Location:</span>{" "}
                  {selectedLocation?.name ?? "No location"}
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium text-foreground">
                    Display name:
                  </span>{" "}
                  {selectedProductDisplayName}
                </div>
              </div>
              <div
                data-stock-action="barcode-rule-scope-cue"
                className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                Rule is for this product, manufacturer, and origin only.
              </div>
            </div>
          ) : null}

          {inboundStep === "rule" ? (
            <div
              data-stock-action="barcode-rule-input-methods"
              className="rounded-md border bg-muted/30 p-3 text-sm"
            >
              <div className="font-medium">Sample barcode input</div>
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-md border bg-background px-3 py-2">
                  Camera scanner
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  Handheld scanner + Enter
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  Manual typing fallback
                </div>
              </div>
            </div>
          ) : null}

          {barcodeRuleSetupReady ? (
            <div
              className={[
                "rounded-md border px-3 py-2 text-sm",
                inboundStep === "rule" || inboundStep === "scan"
                  ? ""
                  : "hidden",
                currentBarcodeWeightRule
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : sessionBarcodeRuleSaved
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900",
              ].join(" ")}
            >
              <div className="font-medium">
                {currentBarcodeWeightRule
                  ? "Saved barcode rule ready"
                  : sessionBarcodeRuleSaved
                    ? "Rule saved for this session"
                  : "No saved barcode rule yet"}
              </div>
              <div className="mt-1 break-words text-xs">
                {currentBarcodeWeightRule
                  ? "Rule ready. Keep scanning."
                  : sessionBarcodeRuleSaved
                    ? "Rule saved. Keep scanning."
                  : "Scan sample, enter kg."}
              </div>
              {currentBarcodeWeightRule?.sampleBarcode ? (
                <div className="mt-1 break-all text-xs">
                  Learned from sample {currentBarcodeWeightRule.sampleBarcode}.
                </div>
              ) : null}
              {expectedBarcodeLength ? (
                <div
                  data-stock-action="saved-barcode-rule-length-cue"
                  className="mt-1 break-words text-xs font-medium"
                >
                  Expected length: {expectedBarcodeLength} digits.
                </div>
              ) : null}
            </div>
          ) : null}

          {inboundStep === "rule" ? (
            <div
              data-stock-action="rule-extracted-weight-preview"
              className={[
                "rounded-md border p-3 text-sm",
                rulePreviewInvalid
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "bg-muted/30",
              ].join(" ")}
            >
              <div className="font-medium">Extracted weight preview</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {ruleExtractedPreviewWeightKg
                  ? `${Number(ruleExtractedPreviewWeightKg).toFixed(3)} kg`
                  : "-"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Preview only. Net kg below.
              </p>
              {barcode ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Preview source: {ruleExtractedPreview.source}.
                </p>
              ) : null}
              {rulePreviewInvalid ? (
                <p className="mt-2 text-xs font-medium" role="alert">
                  No valid weight extracted. Adjust rule or use Inbound without
                  Barcode.
                </p>
              ) : null}
            </div>
          ) : null}

          {inboundStep === "rule" ? (
            <div
              data-stock-action="barcode-rule-save-summary"
              className="rounded-md border bg-background p-3 text-sm"
            >
              <div className="font-medium">Rule values to save</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Check before saving.
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {ruleSaveSummaryRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <div className="text-xs uppercase text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-1 break-all font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showDetectedRulePreview ? (
            <div
              data-stock-action="detected-barcode-rule-preview"
              className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              <div className="font-medium">Detected barcode rule</div>
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  Sample length:{" "}
                  <span className="font-semibold">{barcode.trim().length}</span>
                </div>
                <div>
                  Weight digits:{" "}
                  <span className="font-semibold">
                    {preset.barcodeWeightStart}-{detectedRuleEndPosition}
                  </span>
                </div>
                <div>
                  Digit count:{" "}
                  <span className="font-semibold">
                    {preset.barcodeWeightLength}
                  </span>
                </div>
                <div>
                  Decimals:{" "}
                  <span className="font-semibold">
                    {preset.barcodeWeightDecimals}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs">
                Save first barcode. Rule reused.
              </p>
            </div>
          ) : null}

          {barcodeRuleSetupReady &&
          !canUseBarcodeRuleForSession &&
          inboundStep === "rule" ? (
            <div
              data-stock-action="rule-page-internal-label-escape"
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <div className="font-medium">
                Teach barcode rule
              </div>
              <div className="mt-2 text-xs">
                Scan sample, enter kg.
              </div>
              <div className="mt-3 rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs font-medium text-amber-900">
                No weight? Use labels.
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11 w-full"
                disabled={!scanSetupReady}
                onClick={() => {
                  switchInboundMode("internal_label")
                  setInboundStep("manual")
                  setDecodeStatus("warning")
                  setDecodeMessage("No rule? Use labels.")
                  window.setTimeout(() => netWeightInputRef.current?.focus(), 0)
                }}
              >
                Use Inbound without Barcode
              </Button>
            </div>
          ) : null}

          {inboundStep === "rule" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                onClick={() => goInboundStep("setup")}
              >
                {scopeLocked ? "Review setup" : "Back to setup"}
              </Button>
              <Button
                type="button"
                className="min-h-12"
                disabled={!scanSetupReady || !canUseBarcodeRuleForSession}
                onClick={() => goInboundStep("scan")}
              >
                {canUseBarcodeRuleForSession
                  ? "Open scanner"
                  : "Save rule first"}
              </Button>
            </div>
          ) : null}

          {inboundStep === "manual" ? (
            <div className="space-y-3">
              <div
                data-stock-action="manual-label-next-unit"
                className="sticky top-2 z-20 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 shadow-sm"
              >
                <div className="text-xs font-medium uppercase">
                  Enter next unit
                </div>
                <div className="mt-1 break-words text-base font-semibold">
                  {selectedProductDisplayName}
                </div>
                <div className="mt-1 text-emerald-800">
                  {selectedOriginName} - {selectedLocation?.name ?? "No location"}
                </div>
                <div
                  data-stock-action="manual-weight-progress-card"
                  className="mt-3 grid gap-2 sm:grid-cols-3"
                >
                  <div className="rounded-md border border-emerald-200 bg-white/70 px-3 py-2">
                    <div className="text-xs uppercase text-emerald-800">
                      Previous entered weight
                    </div>
                    <div className="mt-1 text-xl font-semibold tabular-nums">
                      {manualPreviousWeightText}
                    </div>
                    {pendingInternalLabel ? (
                      <div className="mt-1 text-xs text-emerald-700">
                        Saving label
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-white/70 px-3 py-2">
                    <div className="text-xs uppercase text-emerald-800">
                      Saved units
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {recentInboundCount}
                    </div>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-white/70 px-3 py-2">
                    <div className="text-xs uppercase text-emerald-800">
                      Saved total
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {recentInboundWeightKg.toFixed(3)} kg
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-emerald-200 bg-white/70 px-3 py-2 text-xs font-medium text-emerald-800">
                  Setup locked. Save, print, attach.
                </div>
                <div
                data-stock-action="manual-weight-enter-shortcut"
                className="mt-2 rounded-md border border-emerald-200 bg-white/70 px-3 py-2 text-xs font-medium text-emerald-800"
              >
                Enter saves next weight.
                </div>
              </div>
              {!isOnline ? (
                <OfflineScanAlert className="border-red-300 bg-red-50" />
              ) : null}
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-medium">Manual Weight Entry</div>
                <div className="mt-2 text-xs font-medium">
                  Enter kg. Print label. Repeat.
                </div>
              </div>
            </div>
          ) : null}

          {latestSavedScan &&
          (inboundStep === "scan" || inboundStep === "manual") ? (
            <div
              aria-live="polite"
              className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <div className="text-xs font-medium uppercase">
                {manualMode ? "Previous entered weight" : "Previous scan"}
              </div>
              <div className="mt-1 break-words font-semibold">
                {latestSavedScan.productName}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {latestSavedScan.weightKg} kg
              </div>
              <div className="break-all font-mono text-xs">
                {latestSavedScan.barcode}
              </div>
              {!sessionFinishedAt ? (
                <form action={undoAction} className="mt-3">
                  <input
                    type="hidden"
                    name="stockUnitId"
                    value={latestSavedScan.stockUnitId}
                  />
                  <input type="hidden" name="batchNo" value={batchNo} />
                  <input
                    type="hidden"
                    name="reason"
                    value="Undo previous inbound scan"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="min-h-11 w-full"
                    disabled={undoPending}
                  >
                    {manualMode
                      ? "Undo Last Weight Entry"
                      : "Undo Last Scan"}
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}

          {pendingInternalLabel &&
          (inboundStep === "scan" || inboundStep === "manual") ? (
            <div
              data-stock-action="pending-internal-label-confirm"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <div className="font-semibold">Pending label</div>
              <div className="mt-1">
                Saving label. Cancel first.
              </div>
              <div
                data-stock-action="pending-internal-label-display-name"
                className="mt-2 rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs font-medium text-amber-900"
              >
                Label product:{" "}
                <span className="break-words">
                  {pendingInternalLabel.productName}
                </span>
              </div>
              <div
                data-stock-action="pending-internal-label-expected-barcode"
                className="mt-2 rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs font-medium text-amber-900"
              >
                Pending barcode:{" "}
                <span className="break-all font-mono">
                  {pendingInternalLabel.barcode}
                </span>
              </div>
              <div className="mt-2 rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs font-medium text-amber-900">
                After save, next weight.
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <StockLabelPreview label={pendingInternalLabel} />
                <div className="space-y-3">
                  <StockLabelPrintNote />
                  <StockLabelPrintActions onPrint={printInboundLabels} />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full"
                    onClick={cancelPendingInternalLabel}
                  >
                    Cancel label
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {decodeMessage && scannerVisible ? (
            <div
              role={decodeStatus === "error" ? "alert" : "status"}
              aria-live={decodeStatus === "error" ? "assertive" : "polite"}
              className={
                decodeStatus === "success"
                  ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm break-words text-emerald-700"
                  : decodeStatus === "warning"
                    ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm break-words text-amber-800"
                    : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm break-words text-red-700"
              }
            >
              {decodeMessage}
            </div>
          ) : null}
          {showInternalLabelFallbackCue ? (
            <div
              data-stock-action="internal-label-fallback-cue"
              role="status"
              aria-live="polite"
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
            <div className="font-medium">Use internal label inbound</div>
            <div className="mt-1">
                Enter kg, save, print label.
            </div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11 w-full border-amber-200 bg-white text-amber-900 hover:bg-amber-50 sm:w-auto"
                onClick={() => netWeightInputRef.current?.focus()}
              >
                Enter weight
              </Button>
            </div>
          ) : null}

            {duplicateBarcode &&
            (inboundStep === "scan" || inboundStep === "manual") ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm break-words text-red-700"
            >
              Duplicate barcode. Inbound is blocked.
            </div>
          ) : null}
          {finishBlockedByPendingLabel &&
          (inboundStep === "scan" || inboundStep === "manual") ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm break-words text-amber-800"
            >
              Cancel pending label first.
            </div>
          ) : null}
          {finishBlockedByNoSavedScan &&
          (inboundStep === "scan" || inboundStep === "manual") ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm break-words text-amber-800"
            >
              {finishBlockedNoSavedMessage}
            </div>
          ) : null}

          {scannerVisible ? (
            <ActionMessage state={state} />
          ) : null}
          {state.status === "error" ? (
            <p className="text-sm text-muted-foreground">
              Connection issue. Retry this barcode.
            </p>
          ) : null}
          <div
            className={
              scannerVisible
                ? "flex flex-wrap gap-2"
                : "hidden"
            }
          >
            {inboundStep === "rule" ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => goInboundStep("setup")}
              >
                {scopeLocked ? "Review setup" : "Back to setup"}
              </Button>
            ) : null}
            {inboundStep === "scan" ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => goInboundStep("rule")}
              >
                {scopeLocked ? "Review Barcode Rule" : "Back to Barcode Rule"}
              </Button>
            ) : null}
            {inboundStep === "manual" ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => goInboundStep("setup")}
              >
                {scopeLocked ? "Review setup" : "Back to setup"}
              </Button>
            ) : null}
            {!manualMode &&
            (inboundStep !== "rule" || !canUseBarcodeRuleForSession) ? (
              <SubmitButton
                pending={pending}
                disabled={
                  duplicateBarcode ||
                  decodeStatus === "error" ||
                  ruleSampleNeedsActualKg ||
                  !isOnline ||
                  Boolean(sessionFinishedAt)
                }
              >
                {inboundStep === "rule" ? "Save first barcode + rule" : "Save inbound"}
              </SubmitButton>
            ) : null}
            {manualWeightConfirmationReady ? (
              <SubmitButton
                pending={pending}
                disabled={
                  duplicateBarcode ||
                  !isOnline ||
                  Boolean(sessionFinishedAt)
                }
              >
                Confirm weight and save
              </SubmitButton>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              disabled={
                (inboundStep !== "scan" && inboundStep !== "manual") ||
                finishBlockedByNoSavedScan ||
                finishBlockedByPendingLabel ||
                Boolean(sessionFinishedAt)
              }
              onClick={finishInboundSession}
            >
              Finish Session
            </Button>
          </div>
        </form>
        {recentLabels.length > 0 ? (
          <div
            className={
              inboundStep === "scan" ||
              inboundStep === "manual" ||
              inboundStep === "summary"
                ? "mt-4 rounded-md border bg-muted/30 p-3"
                : "hidden"
            }
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <div className="font-medium">
                  {manualMode ? "Recent saved labels" : "Recent inbound scans"}
                </div>
                {manualMode ? (
                  <StockLabelPrintNote />
                ) : (
                  <div className="mt-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                    Barcode labels already attached.
                  </div>
                )}
                {activePrintLabels.length > 0 ? (
                  <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                    {manualMode
                      ? "Print labels."
                      : "Reprint if needed."}
                  </div>
                ) : null}
              </div>
              {activePrintLabels.length > 0 ? (
                <StockLabelPrintActions onPrint={printInboundLabels} />
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {recentLabels.slice(0, 12).map((label) => (
                <div
                  key={label.id}
                  className="rounded-md border bg-background p-3 text-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="break-words font-medium">
                      {label.productName}
                    </div>
                    <Badge
                      className="w-fit max-w-full whitespace-normal break-words"
                      variant={label.status === "SAVED" ? "default" : "outline"}
                    >
                      {label.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {label.weightKg} kg
                  </div>
                  <div className="break-all font-mono text-xs">
                    {label.barcode}
                  </div>
                  {manualMode && label.status === "SAVED" ? (
                    <StockLabelPreview label={label} className="mt-3" />
                  ) : null}
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                    <div>Time: {new Date(label.scannedAt).toLocaleString()}</div>
                    <div>Scanned by: {label.scannedBy}</div>
                    <div>Location: {label.locationName}</div>
                  </div>
                  {label.status === "SAVED" && !sessionFinishedAt ? (
                    <form action={undoAction} className="mt-3">
                      <input
                        type="hidden"
                        name="stockUnitId"
                        value={label.stockUnitId}
                      />
                      <input type="hidden" name="batchNo" value={batchNo} />
                      <input
                        type="hidden"
                        name="reason"
                        value="Current inbound session undo"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        className="h-11 w-full"
                        disabled={undoPending}
                      >
                        {label.stockUnitId === latestSavedScan?.stockUnitId
                          ? manualMode
                            ? "Undo Last Weight Entry"
                            : "Undo Last Scan"
                          : manualMode
                            ? "Undo weight entry"
                            : "Undo scan"}
                      </Button>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Undo before finish.
                      </p>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
            <ActionMessage state={undoState} />
          </div>
        ) : null}
        {sessionFinishedAt && inboundStep === "summary" ? (
          <div
            data-stock-action="inbound-page-four-session-summary"
            className="mt-4 rounded-md border bg-background p-4"
          >
            <div className="text-lg font-semibold">
              {inboundSummaryTitle}
            </div>
            <div
              data-stock-action="inbound-session-summary-status"
              className="mt-2 inline-flex min-h-9 items-center rounded-md border bg-muted/30 px-3 py-1 text-sm font-medium"
            >
              Session status: {inboundSessionStatus}
            </div>
            <div
              data-stock-action="inbound-summary-session-code"
              className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900"
            >
              <div className="text-xs font-semibold uppercase">
                Inbound session code
              </div>
              <div className="mt-1 break-all font-mono text-lg font-semibold">
                {batchNo}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  {manualMode ? "Total count" : "Total barcode units"}
                </div>
                <div className="text-2xl font-semibold">
                  {recentInboundCount}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Total weight
                </div>
                <div className="text-2xl font-semibold">
                  {recentInboundWeightKg.toFixed(3)} kg
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Duplicate/error scans
                </div>
                <div className="text-2xl font-semibold">
                  {sessionErrors.length}
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                Inbound mode:{" "}
                {manualMode ? "Inbound without Barcode" : "Inbound with Barcode"}
              </div>
              <div>Product: {selectedProductName}</div>
              <div>Manufacturer: {selectedManufacturerName}</div>
              <div className="sm:col-span-2">
                Display name: {selectedProductDisplayName}
              </div>
              <div>Origin: {selectedOriginName}</div>
              <div>Inbound location: {selectedLocation?.name ?? "No location"}</div>
              <div>Scanned by: {scannedByName}</div>
              <div>Inbound session code: {batchNo}</div>
              <div>Started: {sessionStartedText}</div>
              <div>Finished: {sessionFinishedText}</div>
            </div>
            {wholeSessionVoided ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                Session undone. Stock units were voided.
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                Next: {inboundSummaryNextAction}
              </div>
            )}
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Manager approval required. Audit kept.
            </div>
            <div
              data-stock-action="future-session-summary-print-area"
              className="mt-3 rounded-md border bg-muted/30 p-3 text-sm"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Print summary
                  </div>
                  <div className="mt-1 break-words text-base font-semibold">
                    {selectedProductDisplayName}
                  </div>
                </div>
                <Badge variant="outline">
                  {recentInboundCount.toLocaleString()} saved
                </Badge>
              </div>
              <div
                data-stock-action="inbound-session-print-summary-fields"
                className="mt-3 grid gap-2 sm:grid-cols-2"
              >
                {sessionSummaryPrintRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border bg-background px-3 py-2"
                  >
                    <div className="text-xs uppercase text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-1 break-words font-medium">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                Print or save PDF.
              </div>
            </div>
            <div
              data-stock-action="inbound-session-summary-saved-list"
              className="mt-3 rounded-md border bg-muted/30 p-3 text-sm"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-medium">
                  {manualMode ? "Saved units in this session" : "Saved barcodes in this session"}
                </div>
                <Badge variant="outline">
                  {savedSessionScans.length} saved
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Compact list.
              </div>
              <div className="mt-3 grid gap-2">
                {savedSessionScans.slice(0, 8).map((label) => (
                  <div
                    key={`summary-${label.id}`}
                    className="rounded-md border bg-background px-3 py-2"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="break-words font-medium">
                          {label.productName}
                        </div>
                        <div className="break-all font-mono text-xs text-muted-foreground">
                          {label.barcode}
                        </div>
                      </div>
                      <div className="text-base font-semibold">
                        {label.weightKg} kg
                      </div>
                    </div>
                    <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>Location: {label.locationName}</div>
                      <div>Time: {new Date(label.scannedAt).toLocaleString()}</div>
                      <div>Scanned by: {label.scannedBy}</div>
                    </div>
                  </div>
                ))}
              </div>
              {savedSessionScans.length > 8 ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  Showing latest 8 saved entries.
                </div>
              ) : null}
            </div>
            {sessionErrors.length > 0 ? (
              <div
                data-stock-action="inbound-session-summary-error-list"
                className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <div className="font-medium">
                  Duplicate/error scans in this session
                </div>
                <div className="mt-3 grid gap-2">
                  {sessionErrors.slice(0, 8).map((error) => (
                    <div
                      key={`summary-error-${error.id}`}
                      className="rounded-md border border-amber-200 bg-background px-3 py-2"
                    >
                      <div className="break-all font-mono text-xs">
                        {error.barcode}
                      </div>
                      <div className="mt-1 break-words">
                        {error.message}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(error.time).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                {sessionErrors.length > 8 ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Latest 8 shown. Full list prints.
                  </div>
                ) : null}
              </div>
            ) : null}
            {voidedSessionScans.length > 0 ? (
              <div
                data-stock-action="inbound-session-summary-voided-list"
                className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium">
                    Voided scans kept for audit
                  </div>
                  <Badge variant="outline">
                    {voidedSessionScans.length} voided
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {voidedSessionScans.slice(0, 8).map((label) => (
                    <div
                      key={`summary-voided-${label.id}`}
                      className="rounded-md border bg-background px-3 py-2"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="break-words font-medium">
                            {label.productName}
                          </div>
                          <div className="break-all font-mono text-xs text-muted-foreground">
                            {label.barcode}
                          </div>
                        </div>
                        <Badge variant="outline">VOIDED</Badge>
                      </div>
                      <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>Weight: {label.weightKg} kg</div>
                        <div>Location: {label.locationName}</div>
                        <div>Time: {new Date(label.scannedAt).toLocaleString()}</div>
                        <div>Scanned by: {label.scannedBy}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {voidedSessionScans.length > 8 ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Showing latest 8 voided. Full audit kept.
                  </div>
                ) : null}
              </div>
            ) : null}
            {activePrintLabels.length > 0 ? (
              <div
                data-stock-action="inbound-summary-print-labels-pdf-area"
                className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
              >
                <div className="font-medium">Print Labels PDF</div>
                <div className="mt-1 text-emerald-800">
                  {activePrintLabels.length} label
                  {activePrintLabels.length === 1 ? "" : "s"} ready.
                </div>
                <StockLabelPrintActions
                  className="mt-3"
                  onPrint={printInboundLabels}
                />
              </div>
            ) : manualMode ? (
              <div
                data-stock-action="internal-label-summary-no-reprint"
                className="mt-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground"
              >
                No saved labels to reprint.
              </div>
            ) : null}
            {wholeSessionUndoMessage ? (
              <div
                role="status"
                className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                {wholeSessionUndoMessage}
              </div>
            ) : null}
            {wholeSessionUndoConfirmOpen ? (
              <div
                data-stock-action="whole-session-undo-confirmation"
                role="alert"
                aria-live="assertive"
                className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <div className="font-semibold">
                  Confirm Delete Whole Session
                </div>
                <div className="mt-1">
                  Voids {recentInboundCount} saved{" "}
                  {manualMode ? "unit" : "barcode"}
                  {recentInboundCount === 1 ? "" : "s"} (
                  {recentInboundWeightKg.toFixed(3)} kg) for {batchNo}. Audit kept.
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 border-red-200 bg-white text-red-700 hover:bg-red-50"
                    disabled={wholeSessionUndoing}
                    onClick={() => setWholeSessionUndoConfirmOpen(false)}
                  >
                    Keep session
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11 bg-red-600 text-white hover:bg-red-700"
                    disabled={wholeSessionUndoing}
                    onClick={undoWholeInboundSession}
                  >
                    {wholeSessionUndoing
                      ? "Deleting..."
                      : "Delete Whole Session"}
                  </Button>
                </div>
              </div>
            ) : null}
            <div
              data-stock-action="inbound-summary-action-grid"
              className={
                manualMode
                  ? "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
                  : "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
              }
            >
              <Button
                type="button"
                variant="outline"
                data-stock-action="print-inbound-session-summary"
                className="min-h-11 w-full whitespace-normal"
                onClick={printInboundSessionSummary}
              >
                Print Session Summary
              </Button>
              <Button
                type="button"
                variant="outline"
                data-stock-action="summary-finish-inbound-session"
                className="min-h-11 w-full whitespace-normal"
                disabled
              >
                Finish Session
              </Button>
              <Button
                type="button"
                variant="outline"
                data-stock-action="summary-safe-back-to-setup"
                className="min-h-11 w-full whitespace-normal"
                onClick={() => goInboundStep("setup")}
              >
                Review setup (read-only)
              </Button>
              {!manualMode ? (
                <Button
                  type="button"
                  variant="outline"
                  data-stock-action="review-barcode-rule-from-summary"
                  className="min-h-11 w-full whitespace-normal"
                  disabled={wholeSessionVoided}
                  onClick={() => goInboundStep("rule")}
                >
                  Review Barcode Rule
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                data-stock-action="summary-safe-back-to-scan"
                className="min-h-11 w-full whitespace-normal"
                disabled={wholeSessionVoided}
                onClick={() => goInboundStep(activeScanStep)}
              >
                Review {manualMode ? "Manual Weight" : "Scanner"}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-stock-action="open-whole-session-delete-confirmation"
                className="min-h-11 w-full whitespace-normal"
                disabled={
                  !canDeleteWholeSession ||
                  wholeSessionUndoing ||
                  savedSessionScans.length === 0
                }
                onClick={() => {
                  setWholeSessionUndoMessage("")
                  setWholeSessionUndoConfirmOpen(true)
                }}
              >
                Delete Whole Session
              </Button>
              <Button
                type="button"
                variant="outline"
                data-stock-action="start-new-inbound-session"
                className="min-h-11 w-full whitespace-normal"
                onClick={startNewInboundSession}
              >
                New inbound session
              </Button>
            </div>
          </div>
        ) : null}
        {sessionErrors.length > 0 ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 p-3"
          >
            <div className="font-medium text-red-900">
              Blocked/error scans this session
            </div>
            <div className="mt-2 grid gap-2">
              {sessionErrors.map((entry) => (
                <div key={entry.id} className="text-sm break-words text-red-900">
                  <span className="break-all font-mono">{entry.barcode}</span> -{" "}
                  {entry.message} ({new Date(entry.time).toLocaleTimeString()})
                </div>
              ))}
            </div>
            {recentLabels.length > 12 ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Showing latest 12. Totals include all.
              </div>
            ) : null}
          </div>
        ) : null}
        <StockLabelPrintArea
          labels={inboundPrintTarget === "labels" ? labelsForPrint : []}
        />
        {inboundPrintTarget === "summary" ? (
          <div
            data-stock-action="inbound-session-summary-print-root"
            className="stock-inbound-summary-print-root hidden print:block"
          >
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }

                .stock-inbound-summary-print-root,
                .stock-inbound-summary-print-root * {
                  visibility: visible;
                }

                .stock-inbound-summary-print-root {
                  display: block !important;
                  position: absolute;
                  inset: 0;
                  background: white;
                  color: black;
                  font-family: Arial, sans-serif;
                }

                @page { size: A4; margin: 12mm; }

                .stock-inbound-summary-print-page {
                  padding: 0;
                  color: black;
                }

                .stock-inbound-summary-title {
                  font-size: 16pt;
                  font-weight: 700;
                  margin-bottom: 2mm;
                }

                .stock-inbound-summary-subtitle {
                  font-size: 9pt;
                  margin-bottom: 5mm;
                }

                .stock-inbound-summary-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 2mm;
                  margin-bottom: 5mm;
                }

                .stock-inbound-summary-cell {
                  border: 1px solid #111;
                  padding: 2mm;
                  font-size: 9pt;
                  break-inside: avoid;
                }

                .stock-inbound-summary-label {
                  font-size: 7pt;
                  text-transform: uppercase;
                  color: #444;
                  margin-bottom: 1mm;
                }

                .stock-inbound-summary-table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 8pt;
                }

                .stock-inbound-summary-table th,
                .stock-inbound-summary-table td {
                  border: 1px solid #111;
                  padding: 1.5mm;
                  text-align: left;
                  vertical-align: top;
                }

                .stock-inbound-summary-table th {
                  font-weight: 700;
                  background: #f3f4f6;
                }
              }
            `}</style>
            <div className="stock-inbound-summary-print-page">
              <div className="stock-inbound-summary-title">
                Elite Meat inbound session summary
              </div>
              <div className="stock-inbound-summary-subtitle">
                {selectedProductDisplayName} / {batchNo}
              </div>
              <div className="stock-inbound-summary-grid">
                {sessionSummaryPrintRows.map(([label, value]) => (
                  <div key={`print-${label}`} className="stock-inbound-summary-cell">
                    <div className="stock-inbound-summary-label">{label}</div>
                    <div>{value}</div>
                  </div>
                ))}
              </div>
              <table className="stock-inbound-summary-table">
                <thead>
                  <tr>
                    <th>Barcode</th>
                    <th>Product</th>
                    <th>Weight</th>
                    <th>Scanned by</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {savedSessionScans.map((label) => (
                    <tr key={`print-row-${label.id}`}>
                      <td>{label.barcode}</td>
                      <td>{label.productName}</td>
                      <td>{label.weightKg} kg</td>
                      <td>{label.scannedBy}</td>
                      <td>{new Date(label.scannedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sessionErrors.length > 0 ? (
                <>
                  <div className="stock-inbound-summary-subtitle">
                    Duplicate/error scans
                  </div>
                  <table className="stock-inbound-summary-table">
                    <thead>
                      <tr>
                        <th>Barcode</th>
                        <th>Message</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionErrors.map((error) => (
                        <tr key={`print-error-${error.id}`}>
                          <td>{error.barcode}</td>
                          <td>{error.message}</td>
                          <td>{new Date(error.time).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
              {voidedSessionScans.length > 0 ? (
                <>
                  <div className="stock-inbound-summary-subtitle">
                    Voided scans kept for audit
                  </div>
                  <table className="stock-inbound-summary-table">
                    <thead>
                      <tr>
                        <th>Barcode</th>
                        <th>Product</th>
                        <th>Weight</th>
                        <th>Status</th>
                        <th>Scanned by</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voidedSessionScans.map((label) => (
                        <tr key={`print-voided-${label.id}`}>
                          <td>{label.barcode}</td>
                          <td>{label.productName}</td>
                          <td>{label.weightKg} kg</td>
                          <td>VOIDED</td>
                          <td>{label.scannedBy}</td>
                          <td>{new Date(label.scannedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function stockUnitLabel(unit: StockUnit, items: Item[], brands: Brand[]) {
  const item = items.find((candidate) => candidate.id === unit.itemId)
  const brand = brands.find((candidate) => candidate.id === unit.brandId)

  return stockDisplayItemName(item, brand, "Unknown product")
}

function directOutboundUnitBlockReason(
  unit: StockUnit,
  defaultLocation: StockLocation | null
) {
  if (unit.status !== "IN_STOCK") {
    return `Barcode is ${unit.status}.`
  }

  if (defaultLocation && unit.locationId !== defaultLocation.id) {
    return `Wrong location. Use stock from ${defaultLocation.name}.`
  }

  return outboundUnitBlockReason(unit)
}

export function OutboundSalesForm({
  customers,
  outlets,
  locations,
  units,
  items,
  brands,
  returnSupplierRequests,
  defaultLocationId = null,
}: {
  customers: CustomerOption[]
  outlets: StockOutlet[]
  locations: StockLocation[]
  units: StockUnit[]
  items: Item[]
  brands: Brand[]
  returnSupplierRequests: StockReturnSupplierRequest[]
  defaultLocationId?: string | null
}) {
  const recentSupplierNames = useMemo(
    () =>
      Array.from(
        new Set(
          returnSupplierRequests
            .map((request) => request.supplierName.trim())
            .filter(Boolean)
        )
      ).slice(0, 4),
    [returnSupplierRequests]
  )
  const [outboundType, setOutboundType] = useState("SALES")
  const [damageReason, setDamageReason] =
    useState<StockDamageReason>("expired")
  const [damagePhotoPath, setDamagePhotoPath] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [customerQuery, setCustomerQuery] = useState("")
  const [outboundNotes, setOutboundNotes] = useState("Direct sales stock out")
  const [barcode, setBarcode] = useState("")
  const [barcodes, setBarcodes] = useState<string[]>([])
  const [scanError, setScanError] = useState("")
  const outboundBarcodeInputRef = useRef<HTMLInputElement | null>(null)
  const outboundCustomerSearchInputRef = useRef<HTMLInputElement | null>(null)
  const loggedOutboundIssueKeysRef = useRef(new Set<string>())
  const isOnline = useOnlineStatus()
  const confirmOutboundFormAction: StatefulAction = async (
    previousState,
    formData
  ) => {
    const result = await confirmDirectOutboundAction(previousState, formData)

    if (result.status === "success" && result.message.includes("outbound batch")) {
      setBarcode("")
      setBarcodes([])
      setScanError("")
    }

    return result
  }
  const [state, formAction, pending] = useActionState(
    confirmOutboundFormAction,
    initialStockActionState
  )
  const scannedUnits = barcodes.map((scannedBarcode) => ({
    barcode: scannedBarcode,
    unit: units.find((unit) => unit.barcode === scannedBarcode),
  }))
  const previousOutboundScan = scannedUnits[scannedUnits.length - 1] ?? null
  const totalWeightKg = scannedUnits.reduce(
    (sum, row) => sum + (row.unit?.netWeightKg ?? 0),
    0
  )
  const selectedDestinationLocation = locations.find(
    (location) => location.id === toLocationId
  )
  const defaultOutboundLocation = locations.find(
    (location) => location.id === defaultLocationId
  )
  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const filteredOutboundCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase()

    if (!query) {
      return customers
    }

    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.categoryName]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [customers, customerQuery])
  const knownScannedUnits = scannedUnits
    .map((row) => row.unit)
    .filter((unit): unit is StockUnit => Boolean(unit))
  const missingScannedBarcodes = scannedUnits
    .filter((row) => !row.unit)
    .map((row) => row.barcode)
  const blockedScannedUnits = knownScannedUnits
    .map((unit) => ({
      barcode: unit.barcode,
      reason: directOutboundUnitBlockReason(
        unit,
        defaultOutboundLocation ?? null
      ),
    }))
    .filter(
      (row): row is { barcode: string; reason: string } =>
        row.reason !== null
    )
  const sameDestinationTransferUnits =
    outboundType === "TRANSFER" && toLocationId
      ? knownScannedUnits
          .filter((unit) => unit.locationId === toLocationId)
          .map((unit) => ({
            barcode: unit.barcode,
            locationName:
              locations.find((location) => location.id === unit.locationId)
                ?.name ?? "selected destination",
          }))
      : []
  const directSalesNeedsCustomer = outboundType === "SALES" && !customerId
  const confirmDisabled =
    !isOnline ||
    barcodes.length === 0 ||
    directSalesNeedsCustomer ||
    (outboundType === "TRANSFER" && !toLocationId) ||
    (outboundType === "DAMAGE_SPOILAGE" &&
      !damagePhotoPath.trim()) ||
    (outboundType === "RETURN_SUPPLIER" &&
      !supplierName.trim()) ||
    missingScannedBarcodes.length > 0 ||
    blockedScannedUnits.length > 0 ||
    sameDestinationTransferUnits.length > 0
  const outboundScanBlocked =
    !isOnline ||
    directSalesNeedsCustomer ||
    (outboundType === "TRANSFER" && !toLocationId) ||
    (outboundType === "DAMAGE_SPOILAGE" &&
      !damagePhotoPath.trim()) ||
    (outboundType === "RETURN_SUPPLIER" &&
      !supplierName.trim())
  const outboundScanBlockMessage = !isOnline
      ? offlineScanMessage
    : directSalesNeedsCustomer
        ? "Choose customer before scanning."
      : outboundType === "TRANSFER" && !toLocationId
        ? "Choose destination stock location first."
        : outboundType === "DAMAGE_SPOILAGE" &&
            !damagePhotoPath.trim()
          ? "Add damage photo first."
          : outboundType === "RETURN_SUPPLIER" &&
              !supplierName.trim()
            ? "Choose supplier first."
          : ""
  const directOutboundOptions = [
    { value: "SALES", label: "Sales", hint: "Choose customer" },
    { value: "PROCESSING", label: "Processing", hint: "Reduce now" },
    { value: "TRANSFER", label: "Transfer", hint: "Needs destination" },
    { value: "SAMPLE_TESTING", label: "Sample/Testing", hint: "No photo" },
    {
      value: "DAMAGE_SPOILAGE",
      label: "Damage/Spoilage",
      hint: "Photo required",
    },
    {
      value: "RETURN_SUPPLIER",
      label: "Return Supplier",
      hint: "Hold for supplier",
    },
  ]
  const outboundTypeOptions = directOutboundOptions
  const activeOutboundType =
    outboundTypeOptions.find((option) => option.value === outboundType) ??
    {
      label: outboundType.replaceAll("_", " "),
      hint: "Check type",
    }
  const directOutboundQuickRemarks =
    directOutboundRemarkOptionsByType[outboundType] ?? [
      `${activeOutboundType.label} stock out`,
    ]
  const defaultDirectOutboundRemark = (type: string, label: string) =>
    directOutboundRemarkOptionsByType[type]?.[0] ?? `${label} stock out`
  const confirmDisabledMessage =
    !isOnline
      ? offlineScanMessage
      : directSalesNeedsCustomer
          ? "Choose customer before confirming."
          : barcodes.length === 0
            ? "Scan at least one barcode."
          : outboundType === "TRANSFER" && !toLocationId
            ? "Choose destination stock location."
            : outboundType === "DAMAGE_SPOILAGE" &&
                !damagePhotoPath.trim()
              ? "Add damage photo first."
              : outboundType === "RETURN_SUPPLIER" &&
                  !supplierName.trim()
                ? "Choose supplier first."
            : missingScannedBarcodes.length > 0
              ? "Remove barcode not found."
              : blockedScannedUnits.length > 0
                ? "Remove blocked barcode."
                : sameDestinationTransferUnits.length > 0
                  ? "Choose another destination."
                  : ""

  function addBarcode(value = barcode) {
    const nextBarcode = value.trim()
    const issueAction =
      directOutboundIssueActions[outboundType] ?? "OUTBOUND_SALES"

    setScanError("")

    if (!isOnline) {
      setScanError(offlineScanMessage)
      return
    }

    if (outboundScanBlocked && outboundScanBlockMessage) {
      setScanError(outboundScanBlockMessage)
      return
    }

    if (!nextBarcode) {
      setScanError("Enter or scan a barcode first.")
      return
    }

    if (barcodes.includes(nextBarcode)) {
      const message = "Duplicate barcode. Outbound is blocked."
      setScanError(message)
      logWorkerScanIssue(loggedOutboundIssueKeysRef, {
        barcode: nextBarcode,
        action: issueAction,
        message,
        issueType: "DUPLICATE_BARCODE",
        locationId: defaultOutboundLocation?.id ?? null,
        expectedLocationId: defaultOutboundLocation?.id ?? null,
        relatedCustomerId: customerId || null,
      })
      return
    }

    const unit = units.find((candidate) => candidate.barcode === nextBarcode)

    if (!unit) {
      const message = "Barcode not found."
      setScanError(message)
      logWorkerScanIssue(loggedOutboundIssueKeysRef, {
        barcode: nextBarcode,
        action: issueAction,
        message,
        issueType: "BARCODE_NOT_FOUND",
        locationId: defaultOutboundLocation?.id ?? null,
        expectedLocationId: defaultOutboundLocation?.id ?? null,
        relatedCustomerId: customerId || null,
      })
      return
    }

    const blockReason = directOutboundUnitBlockReason(
      unit,
      defaultOutboundLocation ?? null
    )

    if (blockReason) {
      setScanError(blockReason)
      logWorkerScanIssue(loggedOutboundIssueKeysRef, {
        barcode: nextBarcode,
        action: issueAction,
        message: blockReason,
        issueType:
          defaultOutboundLocation && unit.locationId !== defaultOutboundLocation.id
            ? "WRONG_LOCATION"
            : "UNAVAILABLE_STOCK",
        locationId: defaultOutboundLocation?.id ?? unit.locationId,
        itemId: unit.itemId,
        expectedLocationId: defaultOutboundLocation?.id ?? null,
        scannedLocationId: unit.locationId,
        expectedStatus: "IN_STOCK",
        scannedStatus: unit.status,
        relatedCustomerId: customerId || null,
      })
      return
    }

    if (
      outboundType === "TRANSFER" &&
      toLocationId &&
      unit.locationId === toLocationId
    ) {
      const message = "Wrong destination."
      setScanError(message)
      logWorkerScanIssue(loggedOutboundIssueKeysRef, {
        barcode: nextBarcode,
        action: "OUTBOUND_TRANSFER",
        message,
        issueType: "WRONG_LOCATION",
        locationId: unit.locationId,
        itemId: unit.itemId,
        expectedLocationId: unit.locationId,
        scannedLocationId: toLocationId,
        expectedStatus: "different destination",
        scannedStatus: unit.status,
      })
      return
    }

    setBarcodes((current) => [...current, nextBarcode])
    setBarcode("")
    window.setTimeout(() => outboundBarcodeInputRef.current?.focus(), 0)
  }

  function selectOutboundCustomer(nextCustomerId: string) {
    setCustomerId(nextCustomerId)
    setCustomerQuery(
      customers.find((customer) => customer.id === nextCustomerId)?.name ?? ""
    )
    setScanError("")
    window.setTimeout(() => outboundBarcodeInputRef.current?.focus(), 0)
  }

  function selectOutboundDestination(nextLocationId: string) {
    setToLocationId(nextLocationId)
    setScanError("")
    window.setTimeout(() => outboundBarcodeInputRef.current?.focus(), 0)
  }

  function focusOutboundBarcodeInput() {
    window.setTimeout(() => outboundBarcodeInputRef.current?.focus(), 0)
  }

  function focusOutboundCustomerSearch() {
    window.setTimeout(() => outboundCustomerSearchInputRef.current?.focus(), 0)
  }

  function selectOutboundDamageReason(nextReason: StockDamageReason) {
    setDamageReason(nextReason)
    setScanError("")
    if (damagePhotoPath.trim()) {
      focusOutboundBarcodeInput()
    }
  }

  function selectOutboundDamagePhoto(nextPhotoPath: string) {
    setDamagePhotoPath(nextPhotoPath)
    setScanError("")
    if (nextPhotoPath.trim()) {
      focusOutboundBarcodeInput()
    }
  }

  function selectOutboundSupplier(nextSupplierName: string) {
    setSupplierName(nextSupplierName)
    setScanError("")
    if (nextSupplierName.trim()) {
      focusOutboundBarcodeInput()
    }
  }

  function outboundTypeCanScanNow(nextType: string) {
    return (
      nextType === "PROCESSING" ||
      nextType === "SAMPLE_TESTING" ||
      (nextType === "SALES" && Boolean(customerId)) ||
      (nextType === "TRANSFER" && Boolean(toLocationId)) ||
      (nextType === "DAMAGE_SPOILAGE" && Boolean(damagePhotoPath.trim())) ||
      (nextType === "RETURN_SUPPLIER" && Boolean(supplierName.trim()))
    )
  }

  function removeBarcode(value: string) {
    setBarcodes((current) => current.filter((item) => item !== value))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outbound scan</CardTitle>
        <CardDescription>
          Direct stock outbound only. Order picking stays in Orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="barcodesJson" value={JSON.stringify(barcodes)} />
          <input type="hidden" name="outboundMode" value="DIRECT" />
          <input type="hidden" name="outboundType" value={outboundType} />
          <input type="hidden" name="customerId" value={customerId} />
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <div className="font-medium">Direct stock outbound</div>
              <div className="mt-1 break-words">
                For customer orders, use Orders picking.
              </div>
              <Button asChild variant="outline" className="mt-3 min-h-11 w-full sm:w-auto">
                <Link href="/orders/picking">Open Orders picking</Link>
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Outbound type</div>
              <div className="grid gap-2 min-[390px]:grid-cols-2 lg:grid-cols-3">
                {outboundTypeOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      outboundType === option.value ? "default" : "outline"
                    }
                    className="h-auto min-h-14 min-w-0 justify-start break-words whitespace-normal py-3 text-left"
                    aria-pressed={outboundType === option.value}
                    onClick={() => {
                      setOutboundType(option.value)
                      setOutboundNotes((currentNotes) =>
                        !currentNotes ||
                        allDirectOutboundQuickRemarks.has(currentNotes)
                          ? defaultDirectOutboundRemark(
                              option.value,
                              option.label
                            )
                          : currentNotes
                      )
                      setScanError("")
                      if (option.value === "SALES" && !customerId) {
                        focusOutboundCustomerSearch()
                      } else if (outboundTypeCanScanNow(option.value)) {
                        focusOutboundBarcodeInput()
                      }
                    }}
                  >
                    <span>
                      <span className="block font-medium">{option.label}</span>
                      <span className="block text-xs opacity-80">
                        {option.hint}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              {activeOutboundType.label}: {activeOutboundType.hint}.
              {defaultOutboundLocation
                ? ` Using ${defaultOutboundLocation.name}.`
                : ""}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orderId" value="" />
            {outboundType === "SALES" ? (
              <div className="space-y-2">
                <Label htmlFor="directCustomerId">Customer</Label>
                <Input
                  ref={outboundCustomerSearchInputRef}
                  id="directCustomerSearch"
                  type="search"
                  value={customerQuery}
                  onChange={(event) => {
                    setCustomerQuery(event.target.value)
                    setCustomerId("")
                  }}
                  placeholder="Search customer or phone"
                  enterKeyHint="search"
                />
                {filteredOutboundCustomers.slice(0, 6).length > 0 ? (
                  <div className="grid gap-2 min-[390px]:grid-cols-2">
                    {filteredOutboundCustomers.slice(0, 6).map((customer) => (
                      <Button
                        key={customer.id}
                        type="button"
                        variant={
                          customerId === customer.id ? "default" : "outline"
                        }
                        className="h-auto min-h-12 min-w-0 justify-start break-words whitespace-normal py-3 text-left"
                        aria-pressed={customerId === customer.id}
                        onClick={() => selectOutboundCustomer(customer.id)}
                      >
                        <span>
                          <span className="block font-medium">
                            {customer.name}
                          </span>
                          <span className="block text-xs opacity-80">
                            {customer.categoryName || customer.phone || "Customer"}
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : null}
                {customerQuery.trim() &&
                filteredOutboundCustomers.length === 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    No customer match. Open the full customer list.
                  </div>
                ) : null}
                <details
                  open={Boolean(
                    customerQuery.trim() && filteredOutboundCustomers.length === 0
                  )}
                  className="rounded-md border bg-muted/30 p-3"
                >
                  <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                    Full customer list
                  </summary>
                  <div className="mt-3">
                    <NativeSelect
                      id="directCustomerId"
                      name="directCustomerId"
                      value={customerId}
                      onChange={selectOutboundCustomer}
                    >
                      <option value="">Choose customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.phone ? ` - ${customer.phone}` : ""}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </details>
                <p className="text-sm text-muted-foreground">
                  Choose customer first, then scan sales stock.
                </p>
              </div>
            ) : null}
            {outboundType === "TRANSFER" ? (
              <div className="space-y-2">
                <Label htmlFor="toLocationId">Destination stock location</Label>
                <DestinationOutletSelect
                  outlets={outlets}
                  locations={locations}
                  id="toOutletId"
                  name="toLocationId"
                  value={toLocationId}
                  onChange={selectOutboundDestination}
                />
              </div>
            ) : (
              <input type="hidden" name="toLocationId" value="" />
            )}
            {outboundType === "DAMAGE_SPOILAGE" ? (
              <>
                <DamageReasonButtons
                  name="damageReason"
                  value={damageReason}
                  onChange={selectOutboundDamageReason}
                />
                <div className="space-y-2">
                  <Label htmlFor="outboundDamagePhotoFile">Damage photo</Label>
                  <Input
                    id="outboundDamagePhotoFile"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0]

                      if (selectedFile) {
                        selectOutboundDamagePhoto(selectedFile.name)
                      }
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Take photo or choose image.
                  </p>
                  {damagePhotoPath.trim() ? (
                    <div className="break-words rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      Photo selected: {damagePhotoPath}
                    </div>
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Take photo before scanning.
                    </div>
                  )}
                  <details className="rounded-md border bg-muted/30 p-3">
                    <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                      Photo reference fallback
                    </summary>
                    <div className="mt-3 space-y-2">
                      <Label htmlFor="damagePhotoPath">
                        Photo file name / reference
                      </Label>
                      <Input
                        id="damagePhotoPath"
                        name="damagePhotoPath"
                        placeholder="Photo reference"
                        value={damagePhotoPath}
                        autoComplete="off"
                        enterKeyHint="done"
                        onChange={(event) => setDamagePhotoPath(event.target.value)}
                        onBlur={(event) => {
                          if (event.target.value.trim()) {
                            focusOutboundBarcodeInput()
                          }
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        Use only if the photo picker does not fill the file name.
                      </p>
                    </div>
                  </details>
                  <p className="text-sm text-amber-700">
                    Photo required. Request only; stock is not deducted now.
                  </p>
                </div>
              </>
            ) : null}
            {outboundType === "RETURN_SUPPLIER" ? (
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier name</Label>
                {recentSupplierNames.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Recent suppliers</div>
                    <div className="grid gap-2 min-[390px]:grid-cols-2">
                      {recentSupplierNames.map((name) => (
                        <Button
                          key={name}
                          type="button"
                          variant={supplierName === name ? "default" : "outline"}
                          className="h-auto min-h-12 justify-start whitespace-normal py-3 text-left"
                          aria-pressed={supplierName === name}
                          onClick={() => selectOutboundSupplier(name)}
                        >
                          {name}
                        </Button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tap supplier to avoid typing.
                    </p>
                  </div>
                ) : null}
                <Input
                  id="supplierName"
                  name="supplierName"
                  value={supplierName}
                  autoComplete="off"
                  enterKeyHint="done"
                  onChange={(event) => setSupplierName(event.target.value)}
                  onBlur={(event) => selectOutboundSupplier(event.target.value)}
                  placeholder="Supplier name"
                />
                <p className="text-sm text-amber-700">
                  Choose supplier before scanning.
                </p>
              </div>
            ) : null}
            </div>

            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                Reference no. (optional)
              </summary>
              <div className="mt-3 space-y-2">
                <Label htmlFor="referenceNo">Reference no.</Label>
                <Input
                  id="referenceNo"
                  name="referenceNo"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="ORDER / INV / TRF"
                />
                <p className="text-sm text-muted-foreground">
                  Open only if paperwork needs a number.
                </p>
              </div>
            </details>
          </div>

          {!outboundScanBlocked ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              <div className="break-words text-xs font-semibold uppercase">
                Scanning outbound
              </div>
              <div className="mt-1 break-words text-base font-semibold">
                Outbound Without Order
              </div>
              <div className="mt-1 break-words text-emerald-800">
                {activeOutboundType.label}
                {outboundType === "SALES" && selectedCustomer
                  ? ` for ${selectedCustomer.name}`
                  : ""}
                {outboundType === "TRANSFER" && selectedDestinationLocation
                  ? ` to ${selectedDestinationLocation.name}`
                  : ""}
              </div>
              <div className="mt-2 rounded-md border border-emerald-200 bg-background/70 px-3 py-2 text-xs font-medium text-emerald-800">
                Scan multiple barcodes, then confirm.
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <BarcodeField
              inputRef={outboundBarcodeInputRef}
              id="batchBarcode"
              name="barcodeEntry"
              label="Barcode"
              value={barcode}
              onChange={setBarcode}
              onScan={(value) => addBarcode(value)}
              continuousScan
              placeholder="EM-BC-000001"
              disabled={outboundScanBlocked}
              disabledReason={outboundScanBlockMessage}
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full md:w-auto"
                disabled={outboundScanBlocked}
                onClick={() => addBarcode()}
              >
                Add barcode
              </Button>
            </div>
          </div>

          {!isOnline ? (
            <OfflineScanAlert />
          ) : null}
          {outboundScanBlocked && isOnline ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {outboundScanBlockMessage}
            </div>
          ) : null}
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm min-[390px]:grid-cols-3">
            <div>
              <div className="text-muted-foreground">Scanned units</div>
              <div className="font-semibold tabular-nums">{barcodes.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Known weight</div>
              <div className="font-semibold tabular-nums">
                {totalWeightKg.toFixed(3)} kg
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Unknown scans</div>
              <div className="font-semibold tabular-nums">
                {scannedUnits.filter((row) => !row.unit).length}
              </div>
            </div>
          </div>

          {previousOutboundScan ? (
            <div
              role={previousOutboundScan.unit ? "status" : "alert"}
              aria-live={previousOutboundScan.unit ? "polite" : "assertive"}
              className={
                previousOutboundScan.unit
                  ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm break-words text-emerald-900"
                  : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm break-words text-red-700"
              }
            >
              <div className="font-medium">Previous outbound scan</div>
              <div className="mt-1 break-all font-mono">
                {previousOutboundScan.barcode}
              </div>
              <div className="mt-1 break-words">
                {previousOutboundScan.unit
                  ? `${stockUnitLabel(previousOutboundScan.unit, items, brands)} - ${previousOutboundScan.unit.netWeightKg.toFixed(3)} kg`
                  : "Barcode not found."}
              </div>
            </div>
          ) : null}

          {scanError ? (
            <div
              role="alert"
              aria-live="assertive"
              className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {scanError}
            </div>
          ) : null}
          {confirmDisabled && isOnline ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {confirmDisabledMessage}
            </div>
          ) : null}
          {missingScannedBarcodes.length > 0 ? (
            <div
              role="alert"
              aria-live="assertive"
              className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <div className="font-medium">Barcode not found</div>
              <div className="mt-1">
                Remove it from scanned list, then scan the correct label.
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {missingScannedBarcodes.map((missingBarcode) => (
                  <li key={missingBarcode} className="break-all font-mono">
                    {missingBarcode}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {blockedScannedUnits.length > 0 ? (
            <div
              role="alert"
              aria-live="assertive"
              className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <div className="font-medium">Blocked barcode</div>
              <div className="mt-1">
                Remove blocked scans, then scan the next barcode.
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {blockedScannedUnits.map((row) => (
                  <li key={row.barcode}>
                    <span className="break-all font-mono">{row.barcode}</span>
                    : {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {sameDestinationTransferUnits.length > 0 ? (
            <div
              role="alert"
              aria-live="assertive"
              className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <div className="font-medium">Wrong destination</div>
              <div className="mt-1">
                Choose another destination or remove it from scanned list.
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {sameDestinationTransferUnits.map((row) => (
                  <li key={row.barcode}>
                    <span className="break-all font-mono">{row.barcode}</span>{" "}
                    is already at {row.locationName}.
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Scanned list</Label>
            {scannedUnits.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Remove a wrong scan before final confirm.
                </p>
                {scannedUnits.map((row) => {
                  const rowStatusBlockReason = row.unit
                    ? directOutboundUnitBlockReason(
                        row.unit,
                        defaultOutboundLocation ?? null
                      )
                    : null
                  const rowDestinationBlockReason =
                    row.unit &&
                    outboundType === "TRANSFER" &&
                    toLocationId &&
                    row.unit.locationId === toLocationId
                      ? "Wrong destination. Remove before confirm."
                      : null
                  const rowBlockReason = !row.unit
                    ? "Barcode not found. Remove before confirm."
                    : rowStatusBlockReason
                      ? "Blocked. Remove before confirm."
                      : rowDestinationBlockReason

                  return (
                    <div
                      key={row.barcode}
                      className={`flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between ${
                        rowBlockReason
                          ? "border-red-200 bg-red-50 text-red-900"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="break-all font-mono text-sm font-medium">
                          {row.barcode}
                        </div>
                        <div
                          className={
                            rowBlockReason
                              ? "text-sm text-red-800"
                              : "text-sm text-muted-foreground"
                          }
                        >
                          {row.unit
                            ? `${stockUnitLabel(row.unit, items, brands)} - ${row.unit.netWeightKg.toFixed(3)} kg`
                            : "Not found"}
                        </div>
                        {rowBlockReason ? (
                          <div className="mt-1 text-sm font-medium text-red-700">
                            {rowBlockReason}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full sm:w-auto"
                        onClick={() => removeBarcode(row.barcode)}
                      >
                        Remove
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No barcodes scanned yet.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <div className="space-y-2">
              <div className="text-sm font-medium">Quick remarks</div>
              <div className="grid gap-2 min-[390px]:grid-cols-2">
                {directOutboundQuickRemarks.map((remark) => (
                  <Button
                    key={remark}
                    type="button"
                    variant={outboundNotes === remark ? "default" : "outline"}
                    className="h-auto min-h-12 min-w-0 justify-start break-words whitespace-normal py-3 text-left"
                    aria-pressed={outboundNotes === remark}
                    onClick={() => setOutboundNotes(remark)}
                  >
                    {remark}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                First remark is selected automatically. Tap another if needed.
              </p>
            </div>
            <Textarea
              id="notes"
              name="notes"
              value={outboundNotes}
              onChange={(event) => setOutboundNotes(event.target.value)}
              required
              placeholder="Required for direct outbound"
            />
          </div>

          <ActionMessage state={state} />
          <SubmitButton
            pending={pending}
            disabled={confirmDisabled}
            className="h-auto whitespace-normal text-left"
          >
            {barcodes.length > 0
              ? `Confirm ${barcodes.length.toLocaleString()} scanned / ${totalWeightKg.toFixed(3)} kg`
              : "Confirm outbound batch"}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

export function TransferForm({
  outlets,
  locations,
  units = [],
  defaultLocationId = null,
}: {
  outlets: StockOutlet[]
  locations: StockLocation[]
  units?: StockUnit[]
  defaultLocationId?: string | null
}) {
  const [barcode, setBarcode] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [localTransferMessage, setLocalTransferMessage] = useState("")
  const [previousTransferBarcode, setPreviousTransferBarcode] = useState("")
  const [transferredBarcodes, setTransferredBarcodes] = useState<string[]>([])
  const transferFormRef = useRef<HTMLFormElement | null>(null)
  const transferBarcodeInputRef = useRef<HTMLInputElement | null>(null)
  const lastTransferBarcodeRef = useRef("")
  const loggedTransferIssueKeysRef = useRef(new Set<string>())
  const [state, formAction, pending] = useActionState(
    transferAction,
    initialStockActionState
  )
  const isOnline = useOnlineStatus()
  const selectedTransferLocation = locations.find(
    (location) => location.id === toLocationId
  )
  const assignedTransferLocation = locations.find(
    (location) => location.active && location.id === defaultLocationId
  )
  const destinationIsAssignedSource =
    Boolean(assignedTransferLocation) && assignedTransferLocation?.id === toLocationId
  const transferScanBlocked =
    !isOnline || !toLocationId || destinationIsAssignedSource
  const currentTransferIssue = transferScanIssue(barcode)
  const transferBlocked =
    transferScanBlocked || !barcode.trim() || Boolean(currentTransferIssue)

  function transferScanIssue(value: string) {
    const nextBarcode = value.trim()

    if (!nextBarcode) {
      return ""
    }

    if (transferredBarcodes.includes(nextBarcode)) {
      return "Duplicate barcode. Transfer is blocked."
    }

    const unit = units.find((candidate) => candidate.barcode === nextBarcode)

    if (!unit) {
      return "Barcode not found."
    }

    if (unit.status !== "IN_STOCK") {
      return `Barcode is ${unit.status}.`
    }

    if (
      assignedTransferLocation &&
      unit.locationId !== assignedTransferLocation.id
    ) {
      return `Wrong source. Use stock from ${assignedTransferLocation.name}.`
    }

    return ""
  }

  useEffect(() => {
    queueMicrotask(() => {
      if (state.status === "success") {
        setPreviousTransferBarcode(lastTransferBarcodeRef.current)
        setTransferredBarcodes((current) =>
          current.includes(lastTransferBarcodeRef.current)
            ? current
            : [lastTransferBarcodeRef.current, ...current]
        )
        setBarcode("")
        setLocalTransferMessage("Transfer sent. Scan next barcode.")
      }

      if (state.status === "error") {
        setLocalTransferMessage("")
      }
    })
  }, [state.status])

  function scanTransferBarcode(value: string) {
    const nextBarcode = value.trim()

    setBarcode(value)

    if (!isOnline) {
      setLocalTransferMessage(offlineScanMessage)
      return
    }

    if (!toLocationId) {
      setLocalTransferMessage("Choose destination stock location first.")
      return
    }

    if (destinationIsAssignedSource) {
      setLocalTransferMessage("Choose a different destination.")
      return
    }

    const issue = transferScanIssue(value)

    if (issue) {
      setLocalTransferMessage(issue)
      const unit = units.find((candidate) => candidate.barcode === nextBarcode)
      logWorkerScanIssue(loggedTransferIssueKeysRef, {
        barcode: nextBarcode,
        action: "OUTBOUND_TRANSFER",
        message: issue,
        issueType: transferredBarcodes.includes(nextBarcode)
          ? "DUPLICATE_BARCODE"
          : !unit
            ? "BARCODE_NOT_FOUND"
            : unit.status !== "IN_STOCK"
              ? "UNAVAILABLE_STOCK"
              : "WRONG_LOCATION",
        locationId: assignedTransferLocation?.id ?? null,
        itemId: unit?.itemId ?? null,
        expectedLocationId: assignedTransferLocation?.id ?? null,
        scannedLocationId: unit?.locationId ?? null,
        expectedStatus: "IN_STOCK",
        scannedStatus: unit?.status ?? null,
        relatedTransferId: toLocationId || null,
      })
      return
    }

    setLocalTransferMessage("Sending transfer...")
    window.setTimeout(() => transferFormRef.current?.requestSubmit(), 0)
  }

  function selectTransferDestination(nextLocationId: string) {
    setToLocationId(nextLocationId)
    setLocalTransferMessage("")
    window.setTimeout(() => transferBarcodeInputRef.current?.focus(), 0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer stock</CardTitle>
        <CardDescription>
          Choose destination stock location, scan barcode, then send.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={transferFormRef}
          action={formAction}
          className="space-y-4"
          onSubmit={(event) => {
            const issue = transferScanIssue(barcode)

            if (issue) {
              event.preventDefault()
              setLocalTransferMessage(issue)
              return
            }

            lastTransferBarcodeRef.current = barcode.trim()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="toOutletId">Destination stock location</Label>
            {assignedTransferLocation ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
              >
                Sending from assigned location: {assignedTransferLocation.name}.
              </div>
            ) : null}
            <DestinationOutletSelect
              outlets={outlets}
              locations={locations}
              id="toOutletId"
              name="toLocationId"
              value={toLocationId}
              onChange={selectTransferDestination}
              excludeLocationId={assignedTransferLocation?.id ?? null}
            />
          </div>

          {selectedTransferLocation ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              <div className="text-xs font-semibold uppercase">Sending to</div>
              <div className="mt-1 text-base font-semibold">
                {selectedTransferLocation.name}
              </div>
              <div className="mt-2 rounded-md border border-emerald-200 bg-background/70 px-3 py-2 text-xs font-medium text-emerald-800">
                Confirm transfer sets stock to In Transfer.
              </div>
            </div>
          ) : null}

          <BarcodeField
            inputRef={transferBarcodeInputRef}
            id="barcode"
            name="barcode"
            label="Barcode"
            value={barcode}
            onChange={setBarcode}
            onScan={scanTransferBarcode}
            placeholder="Scan transfer barcode"
            disabled={transferScanBlocked}
            disabledReason={
              !isOnline
                ? offlineScanMessage
                : !toLocationId
                  ? "Choose destination stock location first."
                  : destinationIsAssignedSource
                    ? "Choose a different destination."
                  : ""
            }
          />

          {!isOnline ? (
            <OfflineScanAlert />
          ) : null}

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Location changes only after receive scan.
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Camera scan sends automatically. Use the button only for typed
            barcode.
          </div>
          {previousTransferBarcode ? (
            <div
              role="status"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              <div className="font-medium">Previous transfer scan</div>
              <div className="mt-1 break-all font-mono">
                {previousTransferBarcode}
              </div>
            </div>
          ) : null}
          {transferredBarcodes.length > 0 ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <div className="font-medium">Sent this transfer session</div>
              <div className="mt-1 tabular-nums">
                {transferredBarcodes.length.toLocaleString()} barcode
                {transferredBarcodes.length === 1 ? "" : "s"} in transfer
              </div>
            </div>
          ) : null}

          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
              Reference and notes
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference no.</Label>
                <Input
                  id="referenceNo"
                  name="referenceNo"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="TRF-2031"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
            </div>
          </details>

          {transferBlocked && isOnline ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {destinationIsAssignedSource
                ? "Choose a different destination."
                : "Choose destination stock location and scan barcode."}
            </div>
          ) : null}
          {localTransferMessage ? (
            <div
              role={
                localTransferMessage === offlineScanMessage ||
                localTransferMessage.startsWith("Choose")
                  ? "alert"
                  : "status"
              }
              aria-live={
                localTransferMessage === offlineScanMessage ||
                localTransferMessage.startsWith("Choose")
                  ? "assertive"
                  : "polite"
              }
              className={[
                "break-words rounded-md border px-3 py-2 text-sm",
                localTransferMessage === offlineScanMessage
                  ? "border-red-200 bg-red-50 text-red-700"
                  : localTransferMessage.startsWith("Choose")
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                  : localTransferMessage.startsWith("Barcode") ||
                      localTransferMessage.startsWith("Wrong") ||
                      localTransferMessage.startsWith("Duplicate")
                    ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              ].join(" ")}
            >
              {localTransferMessage}
            </div>
          ) : null}
          <ActionMessage state={state} />
          <SubmitButton
            pending={pending}
            disabled={transferBlocked}
            className="h-12 w-full"
          >
            Confirm transfer
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

export function ReceiveTransferForm({
  locations,
  units = [],
  defaultLocationId = null,
}: {
  locations: StockLocation[]
  units?: StockUnit[]
  defaultLocationId?: string | null
}) {
  const defaultReceiveLocationId =
    assignedStockLocationId(locations, defaultLocationId) ??
    locations.find((location) => location.active)?.id ??
    ""
  const [barcode, setBarcode] = useState("")
  const receiveLocationId = defaultReceiveLocationId
  const [localReceiveMessage, setLocalReceiveMessage] = useState("")
  const [previousReceiveBarcode, setPreviousReceiveBarcode] = useState("")
  const [selectedReceiveBarcode, setSelectedReceiveBarcode] = useState("")
  const [receivedTransferBarcodes, setReceivedTransferBarcodes] = useState<
    string[]
  >([])
  const receiveFormRef = useRef<HTMLFormElement | null>(null)
  const receiveBarcodeInputRef = useRef<HTMLInputElement | null>(null)
  const lastReceiveBarcodeRef = useRef("")
  const loggedReceiveIssueKeysRef = useRef(new Set<string>())
  const [state, formAction, pending] = useActionState(
    receiveTransferAction,
    initialStockActionState
  )
  const isOnline = useOnlineStatus()
  const selectedReceiveLocation = locations.find(
    (location) => location.id === receiveLocationId
  )
  const assignedReceiveLocation = locations.find(
    (location) => location.active && location.id === defaultLocationId
  )
  const receiveLocationDefaultedToAssigned =
    assignedReceiveLocation?.id === receiveLocationId
  const receiveScanBlocked = !isOnline || !receiveLocationId
  const receiveBlocked = receiveScanBlocked || !barcode.trim()
  const pendingReceiveUnits = units.filter(
    (unit) =>
      unit.status === "TRANSFER_PENDING" &&
      unit.transferToLocationId === receiveLocationId &&
      !receivedTransferBarcodes.includes(unit.barcode)
  )
  const pendingReceivePreviewUnits = pendingReceiveUnits.slice(0, 6)
  const selectedPendingReceiveUnit =
    pendingReceiveUnits.find((unit) => unit.barcode === selectedReceiveBarcode) ??
    null
  const receiveScanIssue = receiveBarcodeIssue(barcode)
  const allVisibleTransferBarcodesReceived =
    pendingReceiveUnits.length === 0 && receivedTransferBarcodes.length > 0

  function receiveBarcodeIssueDetails(value: string): {
    message: string
    issueType: StockIssueType
    unit?: StockUnit
    expectedLocationId?: string | null
    scannedLocationId?: string | null
    expectedStatus?: string | null
    scannedStatus?: string | null
  } | null {
    const nextBarcode = value.trim()

    if (!nextBarcode) {
      return null
    }

    if (!selectedReceiveBarcode) {
      return {
        message: "Tap pending transfer card first.",
        issueType: "TRANSFER_UNEXPECTED_ITEM",
        expectedLocationId: receiveLocationId || null,
        expectedStatus: "selected transfer barcode",
      }
    }

    if (receivedTransferBarcodes.includes(nextBarcode)) {
      return {
        message: "Already received in this session.",
        issueType: "DUPLICATE_BARCODE",
        expectedLocationId: receiveLocationId || null,
        expectedStatus: "not yet received",
        scannedStatus: "already received",
      }
    }

    const unit = units.find((candidate) => candidate.barcode === nextBarcode)

    if (!unit) {
      return {
        message: "Barcode not found.",
        issueType: "BARCODE_NOT_FOUND",
        expectedLocationId: receiveLocationId || null,
        expectedStatus: "TRANSFER_PENDING",
      }
    }

    if (unit.status !== "TRANSFER_PENDING") {
      return {
        message: `Barcode is ${unit.status}.`,
        issueType: "UNAVAILABLE_STOCK",
        unit,
        expectedLocationId: receiveLocationId || null,
        scannedLocationId: unit.locationId,
        expectedStatus: "TRANSFER_PENDING",
        scannedStatus: unit.status,
      }
    }

    if (unit.transferToLocationId !== receiveLocationId) {
      const destinationName =
        locations.find((location) => location.id === unit.transferToLocationId)
          ?.name ?? "the transfer destination"

      return {
        message: `Wrong location. This barcode must be received at ${destinationName}.`,
        issueType: "WRONG_LOCATION",
        unit,
        expectedLocationId: unit.transferToLocationId ?? null,
        scannedLocationId: receiveLocationId || null,
        expectedStatus: "TRANSFER_PENDING",
        scannedStatus: unit.status,
      }
    }

    if (nextBarcode !== selectedReceiveBarcode) {
      return {
        message: "Unexpected barcode. Scan the selected transfer barcode.",
        issueType: "TRANSFER_UNEXPECTED_ITEM",
        unit,
        expectedLocationId: receiveLocationId || null,
        scannedLocationId: unit.locationId,
        expectedStatus: `selected ${selectedReceiveBarcode}`,
        scannedStatus: unit.status,
      }
    }

    return null
  }

  function receiveBarcodeIssue(value: string) {
    return receiveBarcodeIssueDetails(value)?.message ?? ""
  }
  const currentReceiveUnit = barcode.trim()
    ? units.find(
        (unit) =>
          unit.status === "TRANSFER_PENDING" && unit.barcode === barcode.trim()
      )
    : null
  const wrongReceiveDestinationName =
    currentReceiveUnit?.transferToLocationId &&
    currentReceiveUnit.transferToLocationId !== receiveLocationId
      ? locations.find(
          (location) => location.id === currentReceiveUnit.transferToLocationId
        )?.name ?? "the barcode destination"
      : ""

  useEffect(() => {
    queueMicrotask(() => {
      if (state.status === "success") {
        setPreviousReceiveBarcode(lastReceiveBarcodeRef.current)
        setReceivedTransferBarcodes((current) =>
          current.includes(lastReceiveBarcodeRef.current)
            ? current
            : [lastReceiveBarcodeRef.current, ...current]
        )
        setBarcode("")
        setSelectedReceiveBarcode("")
        setLocalReceiveMessage("Received. Scan next barcode.")
      }

      if (state.status === "error") {
        setLocalReceiveMessage("")
      }
    })
  }, [state.status])

  function scanReceiveTransferBarcode(value: string) {
    const nextBarcode = value.trim()

    setBarcode(value)

    if (!isOnline) {
      setLocalReceiveMessage(offlineScanMessage)
      return
    }

    if (!receiveLocationId) {
      setLocalReceiveMessage("Choose receiving stock location first.")
      return
    }

    const issueDetails = receiveBarcodeIssueDetails(value)
    const issue = issueDetails?.message ?? ""

    if (issueDetails) {
      setLocalReceiveMessage(issue)
      logWorkerScanIssue(loggedReceiveIssueKeysRef, {
        barcode: nextBarcode,
        action: "TRANSFER_RECEIVED",
        message: issue,
        issueType: issueDetails.issueType,
        locationId: receiveLocationId || null,
        itemId: issueDetails.unit?.itemId ?? null,
        expectedLocationId: issueDetails.expectedLocationId ?? null,
        scannedLocationId: issueDetails.scannedLocationId ?? null,
        expectedStatus: issueDetails.expectedStatus ?? null,
        scannedStatus: issueDetails.scannedStatus ?? null,
        relatedTransferId: selectedReceiveBarcode || null,
        expectedBarcode: selectedReceiveBarcode || null,
        receivedBarcode: nextBarcode,
      })
      return
    } else {
      setLocalReceiveMessage("Receiving barcode...")
    }

    window.setTimeout(() => receiveFormRef.current?.requestSubmit(), 0)
  }

  function selectPendingReceiveBarcode(nextBarcode: string) {
    setSelectedReceiveBarcode(nextBarcode)
    setBarcode("")
    setLocalReceiveMessage("Selected transfer. Scan its barcode.")
    window.setTimeout(() => receiveBarcodeInputRef.current?.focus(), 0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive transfer</CardTitle>
        <CardDescription>
          Tap pending transfer card, scan barcode, then receive.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={receiveFormRef}
          action={formAction}
          className="space-y-4"
          onSubmit={() => {
            lastReceiveBarcodeRef.current = barcode.trim()
          }}
        >
          <div className="space-y-2">
            <input
              type="hidden"
              name="receiveLocationId"
              value={receiveLocationId}
            />
            <input
              type="hidden"
              name="expectedBarcode"
              value={selectedReceiveBarcode}
            />
            {receiveLocationDefaultedToAssigned ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
              >
                Default receiving location: {assignedReceiveLocation.name}. You
                can change it.
              </div>
            ) : null}
            {!receiveLocationDefaultedToAssigned && selectedReceiveLocation ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
              >
                Receiving location: {selectedReceiveLocation.name}.
              </div>
            ) : null}
          </div>

          {selectedReceiveLocation ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              <div className="text-xs font-semibold uppercase">
                Receiving at
              </div>
              <div className="mt-1 text-base font-semibold">
                {selectedReceiveLocation.name}
              </div>
              <div className="mt-2 rounded-md border border-emerald-200 bg-background/70 px-3 py-2 text-xs font-medium text-emerald-800">
                Scan only barcodes for this destination.
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-medium">Pending to this location</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Showing pending transfers for your receiving location only.
            </div>
            {pendingReceivePreviewUnits.length > 0 ? (
              <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2">
                {pendingReceivePreviewUnits.map((unit) => (
                  <Button
                    key={unit.id}
                    type="button"
                    variant={
                      selectedReceiveBarcode === unit.barcode
                        ? "default"
                        : "outline"
                    }
                    className="h-auto min-h-14 min-w-0 justify-start break-words whitespace-normal py-3 text-left"
                    onClick={() => selectPendingReceiveBarcode(unit.barcode)}
                  >
                    <span className="min-w-0">
                      <span className="block break-all font-mono text-xs">
                        {unit.barcode}
                      </span>
                      <span className="block text-sm font-semibold tabular-nums">
                        {unit.netWeightKg.toLocaleString()} kg
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">
                No pending transfers for this receiving location.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Tap a pending transfer card before scanning.
            </p>
          </div>

          {selectedPendingReceiveUnit ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              <div className="font-medium">Selected transfer card</div>
              <div className="mt-1 break-all font-mono">
                {selectedPendingReceiveUnit.barcode}
              </div>
              <div className="mt-1 tabular-nums">
                {selectedPendingReceiveUnit.netWeightKg.toLocaleString()} kg
              </div>
            </div>
          ) : null}

          <BarcodeField
            inputRef={receiveBarcodeInputRef}
            id="barcode"
            name="barcode"
            label="Barcode"
            value={barcode}
            onChange={setBarcode}
            onScan={scanReceiveTransferBarcode}
            placeholder="Scan transfer barcode"
            disabled={receiveScanBlocked}
            disabledReason={
              !isOnline
                ? offlineScanMessage
                : !receiveLocationId
                  ? "Choose receiving stock location first."
                  : ""
            }
          />

          {!isOnline ? (
            <OfflineScanAlert />
          ) : null}

          {wrongReceiveDestinationName ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              Wrong location. This barcode must be received at{" "}
              {wrongReceiveDestinationName}.
            </div>
          ) : null}
          {receiveScanIssue ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {receiveScanIssue}
            </div>
          ) : null}
          {allVisibleTransferBarcodesReceived ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              All visible expected transfer barcodes are received.
            </div>
          ) : null}
          {pendingReceiveUnits.length > 0 && receivedTransferBarcodes.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Missing transfer barcodes stay pending for manager review.
            </div>
          ) : null}
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Camera scan receives automatically. Use the button only for typed
            barcode.
          </div>
          {previousReceiveBarcode ? (
            <div
              role="status"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              <div className="font-medium">Previous receive scan</div>
              <div className="mt-1 break-all font-mono">
                {previousReceiveBarcode}
              </div>
            </div>
          ) : null}

          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
              Reference and notes
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference no.</Label>
                <Input
                  id="referenceNo"
                  name="referenceNo"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="TRF-2031"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
            </div>
          </details>

          {receiveBlocked && isOnline ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Choose location and scan barcode.
            </div>
          ) : null}
          {localReceiveMessage ? (
            <div
              role={
                localReceiveMessage === offlineScanMessage ||
                localReceiveMessage.startsWith("Choose")
                  ? "alert"
                  : "status"
              }
              aria-live={
                localReceiveMessage === offlineScanMessage ||
                localReceiveMessage.startsWith("Choose")
                  ? "assertive"
                  : "polite"
              }
              className={[
                "break-words rounded-md border px-3 py-2 text-sm",
                localReceiveMessage === offlineScanMessage
                  ? "border-red-200 bg-red-50 text-red-700"
                  : localReceiveMessage.startsWith("Choose")
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                  : localReceiveMessage.startsWith("Tap") ||
                      localReceiveMessage.startsWith("Unexpected") ||
                      localReceiveMessage.startsWith("Already") ||
                      localReceiveMessage.startsWith("Barcode") ||
                      localReceiveMessage.startsWith("Wrong")
                    ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              ].join(" ")}
            >
              {localReceiveMessage}
            </div>
          ) : null}
          <ActionMessage state={state} />
          <SubmitButton
            pending={pending}
            disabled={receiveBlocked}
            className="h-12 w-full"
          >
            Receive barcode
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

export function ReturnForm({
  locations,
  items,
  brands,
  units,
  movements,
  defaultLocationId = null,
}: {
  locations: StockLocation[]
  items: Item[]
  brands: Brand[]
  units: StockUnit[]
  movements: StockMovement[]
  defaultLocationId?: string | null
}) {
  const defaultReturnLocationId =
    assignedStockLocationId(locations, defaultLocationId) ??
    locations.find((location) => location.active)?.id ??
    ""
  const returnConditions = [
    ["GOOD", "Good", "Available"],
    ["NEED_CHECK", "Need Check", "Hold"],
    ["SPOILED_DAMAGED", "Spoiled / Damaged", "Spoiled"],
  ] as const
  const [barcode, setBarcode] = useState("")
  const [locationId, setLocationId] = useState(defaultReturnLocationId)
  const [returnCondition, setReturnCondition] =
    useState<(typeof returnConditions)[number][0]>("GOOD")
  const [localReturnMessage, setLocalReturnMessage] = useState("")
  const [previousReturnBarcode, setPreviousReturnBarcode] = useState("")
  const returnFormRef = useRef<HTMLFormElement | null>(null)
  const returnBarcodeInputRef = useRef<HTMLInputElement | null>(null)
  const lastReturnBarcodeRef = useRef("")
  const loggedReturnIssueKeysRef = useRef(new Set<string>())
  const [state, formAction, pending] = useActionState(
    returnStockAction,
    initialStockActionState
  )
  const isOnline = useOnlineStatus()
  const selectedReturnLocation = locations.find(
    (location) => location.id === locationId
  )
  const assignedReturnLocation = locations.find(
    (location) => location.active && location.id === defaultLocationId
  )
  const returnLocationDefaultedToAssigned =
    assignedReturnLocation?.id === locationId
  const trimmedReturnBarcode = barcode.trim()
  const currentReturnUnit = trimmedReturnBarcode
    ? units.find((unit) => unit.barcode === trimmedReturnBarcode)
    : null
  const currentReturnMovement = trimmedReturnBarcode
    ? movements.find((movement) => movement.barcode === trimmedReturnBarcode)
    : null
  const currentReturnWrongLocation =
    Boolean(currentReturnUnit) &&
    Boolean(locationId) &&
    currentReturnUnit?.locationId !== locationId
  const currentReturnBlocked =
    currentReturnUnit?.status === "TRANSFER_PENDING" ||
    currentReturnUnit?.status === "ADJUSTED_OUT" ||
    currentReturnUnit?.status === "DAMAGED" ||
    currentReturnUnit?.status === "RETURNED" ||
    currentReturnUnit?.status === "HOLD" ||
    currentReturnUnit?.status === "INSPECTION" ||
    currentReturnWrongLocation
  const returnScanBlocked = !isOnline || !locationId
  const returnBlocked =
    returnScanBlocked ||
    !barcode.trim() ||
    !currentReturnUnit ||
    currentReturnBlocked

  useEffect(() => {
    queueMicrotask(() => {
      if (state.status === "success") {
        setPreviousReturnBarcode(lastReturnBarcodeRef.current)
        setBarcode("")
        setLocalReturnMessage("Return saved. Scan next barcode.")
        returnBarcodeInputRef.current?.focus()
      }

      if (state.status === "error") {
        setLocalReturnMessage("")
      }
    })
  }, [state.status])

  function scanReturnBarcode(value: string) {
    const nextBarcode = value.trim()
    const unit = units.find((candidate) => candidate.barcode === nextBarcode)

    setBarcode(value)

    if (!isOnline) {
      setLocalReturnMessage(offlineScanMessage)
      return
    }

    if (!locationId) {
      setLocalReturnMessage("Choose return location first.")
      return
    }

    if (!unit) {
      const message = "Barcode not found."
      setLocalReturnMessage(message)
      logWorkerScanIssue(loggedReturnIssueKeysRef, {
        barcode: nextBarcode,
        action: "RETURN",
        message,
        issueType: "BARCODE_NOT_FOUND",
        locationId,
        expectedLocationId: locationId,
      })
      return
    }

    if (
      unit.status === "TRANSFER_PENDING" ||
      unit.status === "ADJUSTED_OUT" ||
      unit.status === "DAMAGED" ||
      unit.status === "RETURNED" ||
      unit.status === "HOLD" ||
      unit.status === "INSPECTION"
    ) {
      const message = `Barcode is ${unit.status} and cannot be returned.`
      setLocalReturnMessage(message)
      logWorkerScanIssue(loggedReturnIssueKeysRef, {
        barcode: nextBarcode,
        action: "RETURN",
        message,
        issueType: "UNAVAILABLE_STOCK",
        locationId,
        itemId: unit.itemId,
        expectedLocationId: locationId,
        scannedLocationId: unit.locationId,
        expectedStatus: "returnable stock",
        scannedStatus: unit.status,
      })
      return
    }

    if (unit.locationId !== locationId) {
      const scannedLocationName =
        locations.find((location) => location.id === unit.locationId)?.name ??
        "another location"
      const message = `Wrong location. Return at ${scannedLocationName}.`
      setLocalReturnMessage(message)
      logWorkerScanIssue(loggedReturnIssueKeysRef, {
        barcode: nextBarcode,
        action: "RETURN",
        message,
        issueType: "WRONG_LOCATION",
        locationId,
        itemId: unit.itemId,
        expectedLocationId: locationId,
        scannedLocationId: unit.locationId,
        expectedStatus: "return location",
        scannedStatus: unit.status,
      })
      return
    }

    setLocalReturnMessage("Barcode ready. Choose condition, then save.")
    focusReturnBarcodeInput()
  }

  function focusReturnBarcodeInput() {
    window.setTimeout(() => returnBarcodeInputRef.current?.focus(), 0)
  }

  function selectReturnLocation(nextLocationId: string) {
    setLocationId(nextLocationId)
    setLocalReturnMessage("")
    focusReturnBarcodeInput()
  }

  function selectReturnCondition(
    nextCondition: (typeof returnConditions)[number][0]
  ) {
    setReturnCondition(nextCondition)
    setLocalReturnMessage("")
    focusReturnBarcodeInput()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock return</CardTitle>
        <CardDescription>
          Scan barcode, check item details, choose condition, then save.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={returnFormRef}
          action={formAction}
          className="space-y-4"
          onSubmit={() => {
            lastReturnBarcodeRef.current = barcode.trim()
          }}
        >
          {selectedReturnLocation ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              <div className="text-xs font-semibold uppercase">
                Returning to
              </div>
              <div className="mt-1 text-base font-semibold">
                {selectedReturnLocation.name}
              </div>
              <div className="mt-2 rounded-md border border-emerald-200 bg-background/70 px-3 py-2 text-xs font-medium text-emerald-800">
                Choose Good for available, Need Check for hold, or Spoiled /
                Damaged for spoiled stock.
              </div>
            </div>
          ) : null}
          <details
            open={!locationId}
            className="rounded-md border bg-muted/30 p-3"
          >
            <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
              Change return location
            </summary>
            <div className="mt-3 space-y-2">
              <Label htmlFor="locationId">Return location</Label>
              {locations.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Quick return locations</div>
                  <div className="grid gap-2 min-[390px]:grid-cols-2">
                    {locations.slice(0, 6).map((location) => {
                      const selected = locationId === location.id

                      return (
                        <Button
                          key={location.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                          aria-pressed={selected}
                          onClick={() => selectReturnLocation(location.id)}
                        >
                          {location.name}
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tap location to scan faster.
                  </p>
                </div>
              ) : null}
              <LocationSelect
                locations={locations}
                value={locationId}
                onChange={selectReturnLocation}
              />
              {returnLocationDefaultedToAssigned ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                >
                  Default return location: {assignedReturnLocation.name}.
                </div>
              ) : null}
            </div>
          </details>
          <div className="space-y-2">
            <input
              type="hidden"
              name="returnCondition"
              value={returnCondition}
            />
            <div className="text-sm font-medium">Return condition</div>
            <div className="grid gap-2 min-[390px]:grid-cols-3">
              {returnConditions.map(([value, label, mappedStatus]) => (
                <Button
                  key={value}
                  type="button"
                  variant={returnCondition === value ? "default" : "outline"}
                  className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                  aria-pressed={returnCondition === value}
                  onClick={() => selectReturnCondition(value)}
                >
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-xs opacity-80">
                      {mappedStatus}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          </div>
          <BarcodeField
            inputRef={returnBarcodeInputRef}
            id="barcode"
            name="barcode"
            label="Barcode"
            value={barcode}
            onChange={setBarcode}
            onScan={scanReturnBarcode}
            placeholder="Scan return barcode"
            disabled={returnScanBlocked}
            disabledReason={
              !isOnline
                ? offlineScanMessage
                : !locationId
                  ? "Choose return location first."
                  : ""
            }
          />
          {trimmedReturnBarcode ? (
            <div
              role={currentReturnBlocked || !currentReturnUnit ? "alert" : "status"}
              aria-live={currentReturnBlocked || !currentReturnUnit ? "assertive" : "polite"}
              className={[
                "rounded-lg border p-3 text-sm",
                currentReturnBlocked || !currentReturnUnit
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900",
              ].join(" ")}
            >
              <div className="font-semibold">Return barcode details</div>
              {currentReturnUnit ? (
                <div className="mt-2 grid gap-2 min-[390px]:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase opacity-75">Product</div>
                    <div className="font-medium">
                      {stockUnitLabel(currentReturnUnit, items, brands)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase opacity-75">Weight</div>
                    <div className="font-medium tabular-nums">
                      {currentReturnUnit.netWeightKg.toFixed(3)} kg
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase opacity-75">
                      Current status
                    </div>
                    <div className="font-medium">{currentReturnUnit.status}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase opacity-75">
                      Previous movement
                    </div>
                    <div className="font-medium">
                      {currentReturnMovement
                        ? `${currentReturnMovement.movementType} / ${new Date(
                            currentReturnMovement.createdAt
                          ).toLocaleString()}`
                        : "None found"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 break-all">
                  Barcode not found. Save will create manager review issue.
                </div>
              )}
              {currentReturnBlocked ? (
                <div className="mt-2 rounded-md border border-red-200 bg-background/70 px-3 py-2 font-medium">
                  {currentReturnWrongLocation
                    ? "Wrong location. Manager review issue will be logged."
                    : "Cannot return this barcode. Manager review issue will be logged."}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Camera scan fills details. Choose condition, then save.
          </div>
          {previousReturnBarcode ? (
            <div
              role="status"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              <div className="font-medium">Previous return scan</div>
              <div className="mt-1 break-all font-mono">
                {previousReturnBarcode}
              </div>
            </div>
          ) : null}
          {!isOnline ? (
            <OfflineScanAlert />
          ) : null}
          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
              Reference and notes
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference no.</Label>
                <Input
                  id="referenceNo"
                  name="referenceNo"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="RET-5501"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
            </div>
          </details>
          {returnBlocked && isOnline ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {locationId
                ? "Scan barcode."
                : "Choose return location first."}
            </div>
          ) : null}
          {localReturnMessage ? (
            <div
              role={
                localReturnMessage === offlineScanMessage ||
                localReturnMessage.startsWith("Choose")
                  ? "alert"
                  : "status"
              }
              aria-live={
                localReturnMessage === offlineScanMessage ||
                localReturnMessage.startsWith("Choose")
                  ? "assertive"
                  : "polite"
              }
              className={[
                "break-words rounded-md border px-3 py-2 text-sm",
                localReturnMessage === offlineScanMessage
                  ? "border-red-200 bg-red-50 text-red-700"
                  : localReturnMessage.startsWith("Choose")
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800",
              ].join(" ")}
            >
              {localReturnMessage}
            </div>
          ) : null}
          <ActionMessage state={state} />
          <SubmitButton
            pending={pending}
            disabled={returnBlocked}
            className="h-12 w-full"
          >
            Save return
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

export function InspectionReleaseForm({ canManage }: { canManage: boolean }) {
  const [barcode, setBarcode] = useState("")
  const [state, formAction, pending] = useActionState(
    releaseInspectionStockAction,
    initialStockActionState
  )
  const isOnline = useOnlineStatus()
  const releaseBlocked = !isOnline || !canManage || !barcode.trim()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Release inspected return</CardTitle>
        <CardDescription>
          Managers release customer-return stock after inspection so it becomes
          available for normal outbound.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <BarcodeField
              id="inspectionBarcode"
              name="barcode"
              label="Inspection barcode"
              value={barcode}
              onChange={setBarcode}
              onScan={setBarcode}
              placeholder="EM-SEED-RETURN-INSPECTION-001"
              disabled={!isOnline}
              disabledReason={!isOnline ? offlineScanMessage : ""}
            />
            <div className="space-y-2">
              <Label htmlFor="inspectionNotes">Inspection notes</Label>
              <Textarea
                id="inspectionNotes"
                name="notes"
                placeholder="Checked packaging, temperature, and condition"
              />
            </div>
          </div>
          {!canManage ? (
            <p className="text-sm text-muted-foreground">
              Manager or admin review is required before inspection stock can
              become sellable.
            </p>
          ) : null}
          {!isOnline ? (
            <OfflineScanAlert />
          ) : null}
          <ActionMessage state={state} />
          <SubmitButton
            pending={pending}
            disabled={releaseBlocked}
            className="h-12 w-full"
          >
            Release to stock
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

function damageReasonLabel(reason: string) {
  return reason
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function DamageReasonButtons({
  name,
  value,
  onChange,
}: {
  name: string
  value: StockDamageReason
  onChange: (value: StockDamageReason) => void
}) {
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <div className="text-sm font-medium">Damage reason</div>
      <div className="grid gap-2 min-[390px]:grid-cols-2">
        {stockDamageReasons.map((reason) => (
          <button
            key={reason}
            type="button"
            aria-pressed={value === reason}
            onClick={() => onChange(reason)}
            className={[
              "min-h-14 rounded-md border px-3 py-2 text-left text-sm transition",
              value === reason
                ? "border-amber-300 bg-amber-50 font-semibold text-amber-900"
                : "border-input bg-background hover:bg-muted",
            ].join(" ")}
          >
            {damageReasonLabel(reason)}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DamageRequestWorkbench({
  requests,
  canOperate,
  canManage,
  canDirectorApprove,
}: {
  requests: StockDamageRequest[]
  canOperate: boolean
  canManage: boolean
  canDirectorApprove: boolean
}) {
  const [barcode, setBarcode] = useState("")
  const [reason, setReason] = useState<StockDamageReason>("expired")
  const [photoPath, setPhotoPath] = useState("")
  const [localDamageMessage, setLocalDamageMessage] = useState("")
  const [previousDamageBarcode, setPreviousDamageBarcode] = useState("")
  const damageFormRef = useRef<HTMLFormElement | null>(null)
  const damageBarcodeInputRef = useRef<HTMLInputElement | null>(null)
  const lastDamageBarcodeRef = useRef("")
  const [createState, createAction, createPending] = useActionState(
    createDamageRequestAction,
    initialStockActionState
  )
  const [reviewState, reviewAction, reviewPending] = useActionState(
    reviewDamageRequestAction,
    initialStockActionState
  )
  const [approveState, approveAction, approvePending] = useActionState(
    approveDamageRequestAction,
    initialStockActionState
  )
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectDamageRequestAction,
    initialStockActionState
  )
  const isOnline = useOnlineStatus()
  const damageBlocked = !isOnline || !barcode.trim() || !photoPath.trim()

  useEffect(() => {
    queueMicrotask(() => {
      if (createState.status === "success") {
        setPreviousDamageBarcode(lastDamageBarcodeRef.current)
        setBarcode("")
        setLocalDamageMessage("Damage request sent. Scan next.")
        damageBarcodeInputRef.current?.focus()
      }

      if (createState.status === "error") {
        setLocalDamageMessage("")
      }
    })
  }, [createState.status])

  function scanDamageBarcode(value: string) {
    setBarcode(value)

    if (!isOnline) {
      setLocalDamageMessage(offlineScanMessage)
      return
    }

    if (!photoPath.trim()) {
      setLocalDamageMessage("Add damage photo first.")
      return
    }

    setLocalDamageMessage("Sending damage request...")
    window.setTimeout(() => damageFormRef.current?.requestSubmit(), 0)
  }

  function focusDamageBarcodeInput() {
    window.setTimeout(() => damageBarcodeInputRef.current?.focus(), 0)
  }

  function selectDamageReason(nextReason: StockDamageReason) {
    setReason(nextReason)
    setLocalDamageMessage("")
    if (photoPath.trim()) {
      focusDamageBarcodeInput()
    }
  }

  function selectDamagePhoto(nextPhotoPath: string) {
    setPhotoPath(nextPhotoPath)
    setLocalDamageMessage("")
    if (nextPhotoPath.trim()) {
      focusDamageBarcodeInput()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Damage / spoilage approval</CardTitle>
        <CardDescription>
          Staff submit damage with a photo, manager reviews, director approves
          before stock is deducted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canOperate ? (
          <form
            ref={damageFormRef}
            action={createAction}
            className="space-y-4"
            onSubmit={() => {
              lastDamageBarcodeRef.current = barcode.trim()
            }}
          >
            <div className="grid gap-3 min-[390px]:grid-cols-2">
              <DamageReasonButtons
                name="reason"
                value={reason}
                onChange={selectDamageReason}
              />
              <div className="space-y-2">
                <Label htmlFor="damagePhotoFile">Damage photo</Label>
                <Input
                  id="damagePhotoFile"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0]

                    if (selectedFile) {
                      selectDamagePhoto(selectedFile.name)
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Take photo or choose image.
                </p>
                {photoPath.trim() ? (
                  <div className="break-words rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Photo selected: {photoPath}
                  </div>
                ) : (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Take photo before scanning.
                  </div>
                )}
                <details className="rounded-md border bg-muted/30 p-3">
                  <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                    Photo reference fallback
                  </summary>
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="photoPath">Photo file name / reference</Label>
                    <Input
                      id="photoPath"
                      name="photoPath"
                      value={photoPath}
                      required
                      autoComplete="off"
                      enterKeyHint="done"
                      onChange={(event) => setPhotoPath(event.target.value)}
                      onBlur={(event) => {
                        if (event.target.value.trim()) {
                          focusDamageBarcodeInput()
                        }
                      }}
                      placeholder="Photo is required"
                    />
                    <p className="text-sm text-muted-foreground">
                      Use only if the photo picker does not fill the file name.
                    </p>
                  </div>
                </details>
              </div>
            </div>
            {photoPath.trim() ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <div className="text-xs font-semibold uppercase">
                  Requesting damage
                </div>
                <div className="mt-1 text-base font-semibold">
                  {damageReasonLabel(reason)}
                </div>
                <div className="mt-2 rounded-md border border-amber-200 bg-background/70 px-3 py-2 text-xs font-medium text-amber-800">
                  Request only. Stock is deducted after approval.
                </div>
              </div>
            ) : null}
            <BarcodeField
              inputRef={damageBarcodeInputRef}
              id="damageBarcode"
              name="barcode"
              label="Barcode"
              value={barcode}
              onChange={setBarcode}
              onScan={scanDamageBarcode}
              placeholder="Scan damaged barcode"
              disabled={!isOnline || !photoPath.trim()}
              disabledReason={
                !isOnline
                  ? offlineScanMessage
                  : !photoPath.trim()
                    ? "Add damage photo first."
                    : ""
              }
            />
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Photo required. Request only; stock is not deducted now.
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Camera scan sends the damage request automatically after photo.
              Use the button only for typed barcode.
            </div>
            {previousDamageBarcode ? (
              <div
                role="status"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              >
                <div className="font-medium">Previous damage scan</div>
                <div className="mt-1 break-all font-mono">
                  {previousDamageBarcode}
                </div>
              </div>
            ) : null}
            {!isOnline ? (
              <OfflineScanAlert />
            ) : null}
            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                Notes
              </summary>
              <div className="mt-3 space-y-2">
                <Label htmlFor="damageNotes">Notes</Label>
                <Textarea id="damageNotes" name="notes" />
              </div>
            </details>
            {damageBlocked && isOnline ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {photoPath.trim()
                  ? "Scan barcode."
                  : "Add damage photo first."}
              </div>
            ) : null}
            {localDamageMessage ? (
              <div
                role={
                  localDamageMessage === offlineScanMessage ||
                  localDamageMessage.startsWith("Add")
                    ? "alert"
                    : "status"
                }
                aria-live={
                  localDamageMessage === offlineScanMessage ||
                  localDamageMessage.startsWith("Add")
                    ? "assertive"
                    : "polite"
                }
                className={[
                  "break-words rounded-md border px-3 py-2 text-sm",
                  localDamageMessage === offlineScanMessage
                    ? "border-red-200 bg-red-50 text-red-700"
                    : localDamageMessage.startsWith("Add")
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800",
                ].join(" ")}
              >
                {localDamageMessage}
              </div>
            ) : null}
            <ActionMessage state={createState} />
            <SubmitButton
              pending={createPending}
              disabled={damageBlocked}
              className="h-12 w-full"
            >
              Submit damage request
            </SubmitButton>
          </form>
        ) : null}

        <div className="space-y-3">
          <div className="font-medium">Damage requests</div>
          {requests.length > 0 ? (
            requests.map((request) => (
              <div key={request.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold">{request.requestNo}</div>
                    <div className="break-all text-sm text-muted-foreground">
                      {request.barcode} - {request.itemName} -{" "}
                      {request.locationName}
                    </div>
                    <div className="mt-1 text-sm">
                      {damageReasonLabel(request.reason)} - {request.status}
                    </div>
                    <div className="mt-1 break-all text-xs text-muted-foreground">
                      Photo: {request.photoPath}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Manager signature: {request.managerSignature ?? "Pending"} |
                      Director signature: {request.directorSignature ?? "Pending"}
                    </div>
                  </div>
                  <div className="grid w-full gap-2 min-[390px]:grid-cols-2 lg:w-auto lg:flex lg:flex-wrap">
                    {canManage ? (
                      <>
                        <form action={reviewAction}>
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />
                          <input
                            type="hidden"
                            name="managerSignature"
                            value="Manager electronic signature"
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            className="h-11 w-full"
                            disabled={
                              reviewPending || request.status !== "SUBMITTED"
                            }
                          >
                            Manager review
                          </Button>
                        </form>
                        <form action={rejectAction}>
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />
                          <input
                            type="hidden"
                            name="managerSignature"
                            value="Manager electronic signature"
                          />
                          <Button
                            type="submit"
                            variant="destructive"
                            className="h-11 w-full"
                            disabled={
                              rejectPending || request.status !== "SUBMITTED"
                            }
                          >
                            Reject
                          </Button>
                        </form>
                      </>
                    ) : null}
                    {canDirectorApprove ? (
                      <>
                        <form action={approveAction}>
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />
                          <input
                            type="hidden"
                            name="directorSignature"
                            value="Director electronic signature"
                          />
                          <Button
                            type="submit"
                            className="h-11 w-full"
                            disabled={
                              approvePending ||
                              request.status !== "MANAGER_REVIEWED"
                            }
                          >
                            Director approve
                          </Button>
                        </form>
                        <form action={rejectAction}>
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />
                          <input
                            type="hidden"
                            name="directorSignature"
                            value="Director electronic signature"
                          />
                          <Button
                            type="submit"
                            variant="destructive"
                            className="h-11 w-full"
                            disabled={
                              rejectPending ||
                              request.status !== "MANAGER_REVIEWED"
                            }
                          >
                            Reject
                          </Button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No damage requests yet.
            </div>
          )}
        </div>
        <ActionMessage state={reviewState} />
        <ActionMessage state={approveState} />
        <ActionMessage state={rejectState} />
      </CardContent>
    </Card>
  )
}

export function ReturnSupplierWorkbench({
  requests,
  canOperate,
  canManage,
}: {
  requests: StockReturnSupplierRequest[]
  canOperate: boolean
  canManage: boolean
}) {
  const [barcode, setBarcode] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [localReturnSupplierMessage, setLocalReturnSupplierMessage] =
    useState("")
  const [previousReturnSupplierBarcode, setPreviousReturnSupplierBarcode] =
    useState("")
  const returnSupplierFormRef = useRef<HTMLFormElement | null>(null)
  const returnSupplierBarcodeInputRef = useRef<HTMLInputElement | null>(null)
  const lastReturnSupplierBarcodeRef = useRef("")
  const [createState, createAction, createPending] = useActionState(
    createReturnSupplierRequestAction,
    initialStockActionState
  )
  const [approveState, approveAction, approvePending] = useActionState(
    approveReturnSupplierRequestAction,
    initialStockActionState
  )
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectReturnSupplierRequestAction,
    initialStockActionState
  )
  const isOnline = useOnlineStatus()
  const recentSupplierNames = useMemo(
    () =>
      Array.from(
        new Set(
          requests
            .map((request) => request.supplierName.trim())
            .filter(Boolean)
        )
      ).slice(0, 6),
    [requests]
  )
  const returnSupplierBlocked =
    !isOnline || !barcode.trim() || !supplierName.trim()

  useEffect(() => {
    queueMicrotask(() => {
      if (createState.status === "success") {
        setPreviousReturnSupplierBarcode(lastReturnSupplierBarcodeRef.current)
        setBarcode("")
        setLocalReturnSupplierMessage("Supplier return requested. Scan next.")
        returnSupplierBarcodeInputRef.current?.focus()
      }

      if (createState.status === "error") {
        setLocalReturnSupplierMessage("")
      }
    })
  }, [createState.status])

  function scanReturnSupplierBarcode(value: string) {
    setBarcode(value)

    if (!isOnline) {
      setLocalReturnSupplierMessage(offlineScanMessage)
      return
    }

    if (!supplierName.trim()) {
      setLocalReturnSupplierMessage("Choose supplier first.")
      return
    }

    setLocalReturnSupplierMessage("Requesting supplier return...")
    window.setTimeout(() => returnSupplierFormRef.current?.requestSubmit(), 0)
  }

  function selectReturnSupplier(nextSupplierName: string) {
    setSupplierName(nextSupplierName)
    setLocalReturnSupplierMessage("")
    if (nextSupplierName.trim()) {
      window.setTimeout(() => returnSupplierBarcodeInputRef.current?.focus(), 0)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Return supplier approval</CardTitle>
        <CardDescription>
          Staff submit supplier returns, then manager approval deducts the
          barcode from available stock.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canOperate ? (
          <form
            ref={returnSupplierFormRef}
            action={createAction}
            className="space-y-4"
            onSubmit={() => {
              lastReturnSupplierBarcodeRef.current = barcode.trim()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier</Label>
              {recentSupplierNames.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Recent suppliers</div>
                  <div className="grid gap-2 min-[390px]:grid-cols-2">
                    {recentSupplierNames.map((name) => (
                      <Button
                        key={name}
                        type="button"
                        variant={supplierName === name ? "default" : "outline"}
                        className="h-auto min-h-12 justify-start whitespace-normal py-3 text-left"
                        aria-pressed={supplierName === name}
                        onClick={() => selectReturnSupplier(name)}
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tap supplier to avoid typing.
                  </p>
                </div>
              ) : null}
              <Input
                id="supplierName"
                name="supplierName"
                value={supplierName}
                required
                autoComplete="off"
                enterKeyHint="done"
                onChange={(event) => setSupplierName(event.target.value)}
                onBlur={(event) => selectReturnSupplier(event.target.value)}
                placeholder="Supplier name"
              />
            </div>
            {supplierName.trim() ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <div className="text-xs font-semibold uppercase">
                  Returning supplier
                </div>
                <div className="mt-1 text-base font-semibold">
                  {supplierName.trim()}
                </div>
                <div className="mt-2 rounded-md border border-amber-200 bg-background/70 px-3 py-2 text-xs font-medium text-amber-800">
                  Stock goes on supplier hold until manager approval.
                </div>
              </div>
            ) : null}
            <BarcodeField
              inputRef={returnSupplierBarcodeInputRef}
              id="returnSupplierBarcode"
              name="barcode"
              label="Barcode"
              value={barcode}
              onChange={setBarcode}
              onScan={scanReturnSupplierBarcode}
              placeholder="Scan supplier return barcode"
              disabled={!isOnline || !supplierName.trim()}
              disabledReason={
                !isOnline
                  ? offlineScanMessage
                  : !supplierName.trim()
                    ? "Choose supplier first."
                    : ""
              }
            />
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Stock goes on supplier hold until manager approval.
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Camera scan requests supplier return automatically. Use the
              button only for typed barcode.
            </div>
            {previousReturnSupplierBarcode ? (
              <div
                role="status"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              >
                <div className="font-medium">
                  Previous supplier return scan
                </div>
                <div className="mt-1 break-all font-mono">
                  {previousReturnSupplierBarcode}
                </div>
              </div>
            ) : null}
            {!isOnline ? (
              <OfflineScanAlert />
            ) : null}
            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="flex min-h-11 cursor-pointer items-center break-words text-sm font-medium">
                Notes
              </summary>
              <div className="mt-3 space-y-2">
                <Label htmlFor="returnSupplierNotes">Notes</Label>
                <Textarea id="returnSupplierNotes" name="notes" />
              </div>
            </details>
            {returnSupplierBlocked && isOnline ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {supplierName.trim()
                  ? "Scan barcode."
                  : "Choose supplier first."}
              </div>
            ) : null}
            {localReturnSupplierMessage ? (
              <div
                role={
                  localReturnSupplierMessage === offlineScanMessage ||
                  localReturnSupplierMessage.startsWith("Choose")
                    ? "alert"
                    : "status"
                }
                aria-live={
                  localReturnSupplierMessage === offlineScanMessage ||
                  localReturnSupplierMessage.startsWith("Choose")
                    ? "assertive"
                    : "polite"
                }
                className={[
                  "break-words rounded-md border px-3 py-2 text-sm",
                  localReturnSupplierMessage === offlineScanMessage
                    ? "border-red-200 bg-red-50 text-red-700"
                    : localReturnSupplierMessage.startsWith("Choose")
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800",
                ].join(" ")}
              >
                {localReturnSupplierMessage}
              </div>
            ) : null}
            <ActionMessage state={createState} />
            <SubmitButton
              pending={createPending}
              disabled={returnSupplierBlocked}
              className="h-12 w-full"
            >
              Submit return supplier
            </SubmitButton>
          </form>
        ) : null}

        <div className="space-y-3">
          <div className="font-medium">Return supplier requests</div>
          {requests.length > 0 ? (
            requests.map((request) => (
              <div key={request.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold">{request.requestNo}</div>
                    <div className="break-all text-sm text-muted-foreground">
                      {request.barcode} - {request.itemName} -{" "}
                      {request.locationName}
                    </div>
                    <div className="mt-1 text-sm">
                      {request.supplierName} - {request.status}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Manager signature: {request.managerSignature ?? "Pending"}
                    </div>
                  </div>
                  {canManage ? (
                    <div className="grid w-full gap-2 min-[390px]:grid-cols-2 lg:w-auto lg:flex lg:flex-wrap">
                      <form action={approveAction}>
                        <input
                          type="hidden"
                          name="requestId"
                          value={request.id}
                        />
                        <input
                          type="hidden"
                          name="managerSignature"
                          value="Manager electronic signature"
                        />
                        <Button
                          type="submit"
                          className="h-11 w-full"
                          disabled={
                            approvePending || request.status !== "SUBMITTED"
                          }
                        >
                          Manager approve
                        </Button>
                      </form>
                      <form action={rejectAction}>
                        <input
                          type="hidden"
                          name="requestId"
                          value={request.id}
                        />
                        <input
                          type="hidden"
                          name="managerSignature"
                          value="Manager electronic signature"
                        />
                        <Button
                          type="submit"
                          variant="destructive"
                          className="h-11 w-full"
                          disabled={
                            rejectPending || request.status !== "SUBMITTED"
                          }
                        >
                          Reject
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No return supplier requests yet.
            </div>
          )}
        </div>
        <ActionMessage state={approveState} />
        <ActionMessage state={rejectState} />
      </CardContent>
    </Card>
  )
}

export function NoBarcodeInboundForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No-barcode stock needs a label first</CardTitle>
        <CardDescription>
          MVP stock uses one barcode per stock unit. Generate and print an
          internal barcode label from Barcode Inbound. Stock saves when the
          label is generated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          New loose no-barcode balances are disabled. Legacy no-barcode records
          remain visible in reports for compatibility. Open Barcode Inbound and
          choose Inbound without Barcode.
        </div>
        <Button asChild className="min-h-11 w-full sm:w-auto">
          <Link href="/stock/inbound">Open Barcode Inbound</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function StockTakeSessionActions({
  session,
  canOperate,
  canManage,
  canDirectorApprove,
}: {
  session: StockTakeSession
  canOperate: boolean
  canManage: boolean
  canDirectorApprove: boolean
}) {
  const [submitState, submitAction, submitPending] = useActionState(
    submitStockTakeAction,
    initialStockActionState
  )
  const [reviewState, reviewAction, reviewPending] = useActionState(
    reviewStockTakeAction,
    initialStockActionState
  )
  const [approveState, approveAction, approvePending] = useActionState(
    approveStockTakeAction,
    initialStockActionState
  )
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectStockTakeAction,
    initialStockActionState
  )

  return (
    <div className="grid gap-2 min-[390px]:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
      <Badge
        className="min-h-11 justify-center whitespace-normal break-words"
        variant={session.status === "APPROVED" ? "success" : "outline"}
      >
        {session.status}
      </Badge>
      {canOperate ? (
        <form action={submitAction} className="w-full lg:w-auto">
          <input type="hidden" name="sessionId" value={session.id} />
          <Button
            type="submit"
            variant="outline"
            className="h-11 w-full"
            disabled={submitPending || session.status !== "DRAFT"}
          >
            Finish Count
          </Button>
        </form>
      ) : null}
      {canManage ? (
        <>
          <form action={reviewAction} className="w-full lg:w-auto">
            <input type="hidden" name="sessionId" value={session.id} />
            <input
              type="hidden"
              name="managerSignature"
              value="Manager electronic signature"
            />
            <Button
              type="submit"
              variant="outline"
              className="h-11 w-full"
              disabled={reviewPending || session.status !== "SUBMITTED"}
            >
              Review
            </Button>
          </form>
          <form action={rejectAction} className="w-full lg:w-auto">
            <input type="hidden" name="sessionId" value={session.id} />
            <input
              type="hidden"
              name="managerSignature"
              value="Manager electronic signature"
            />
            <Button
              type="submit"
              variant="destructive"
              className="h-11 w-full"
              disabled={rejectPending || session.status !== "SUBMITTED"}
            >
              Reject
            </Button>
          </form>
        </>
      ) : null}
      {canDirectorApprove ? (
        <>
          <form action={approveAction} className="w-full lg:w-auto">
            <input type="hidden" name="sessionId" value={session.id} />
            <input
              type="hidden"
              name="directorSignature"
              value="Director electronic signature"
            />
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={approvePending || session.status !== "REVIEWED"}
            >
              Approve
            </Button>
          </form>
          <form action={rejectAction} className="w-full lg:w-auto">
            <input type="hidden" name="sessionId" value={session.id} />
            <input
              type="hidden"
              name="directorSignature"
              value="Director electronic signature"
            />
            <Button
              type="submit"
              variant="destructive"
              className="h-11 w-full"
              disabled={rejectPending || session.status !== "REVIEWED"}
            >
              Reject
            </Button>
          </form>
        </>
      ) : null}
      <ActionMessage state={submitState} />
      <ActionMessage state={reviewState} />
      <ActionMessage state={approveState} />
      <ActionMessage state={rejectState} />
    </div>
  )
}

export function StockTakeWorkbench({
  items,
  brands,
  locations,
  units,
  sessions,
  lines,
  defaultLocationId = null,
  canOperate,
  canManage,
  canDirectorApprove,
}: {
  items: Item[]
  brands: Brand[]
  locations: StockLocation[]
  units: StockUnit[]
  sessions: StockTakeSession[]
  lines: StockTakeLine[]
  defaultLocationId?: string | null
  canOperate: boolean
  canManage: boolean
  canDirectorApprove: boolean
}) {
  const [selectedSessionId, setSelectedSessionId] = useState(
    () =>
      sessions.find((session) => session.status === "DRAFT")?.id ??
      sessions[0]?.id ??
      ""
  )
  const defaultStockTakeLocationId =
    assignedStockLocationId(locations, defaultLocationId) ??
    locations.find((location) => location.active)?.id ??
    ""
  const [createLocationId, setCreateLocationId] = useState(
    defaultStockTakeLocationId
  )
  const [createItemQuery, setCreateItemQuery] = useState("")
  const [createItemId, setCreateItemId] = useState("")
  const [createBrandId, setCreateBrandId] = useState("")
  const [scanBarcode, setScanBarcode] = useState("")
  const [localScanMessage, setLocalScanMessage] = useState("")
  const [wrongItemScanCountBySession, setWrongItemScanCountBySession] =
    useState<Record<string, number>>({})
  const isOnline = useOnlineStatus()
  const scanFormRef = useRef<HTMLFormElement | null>(null)
  const stockTakeBarcodeInputRef = useRef<HTMLInputElement | null>(null)
  const lastWrongItemErrorRef = useRef("")
  const [scanState, scanAction, scanPending] = useActionState(
    scanStockTakeBarcodeAction,
    initialStockActionState
  )
  const activeScanSessions = sessions.filter(
    (session) => session.status === "DRAFT"
  )
  const firstActiveSessionId = activeScanSessions[0]?.id ?? ""
  const selectedSessionCanScan = activeScanSessions.some(
    (session) => session.id === selectedSessionId
  )
  const effectiveSelectedSessionId =
    selectedSessionCanScan || !firstActiveSessionId
      ? selectedSessionId
      : firstActiveSessionId
  const selectedSession = sessions.find(
    (session) => session.id === effectiveSelectedSessionId
  )
  const selectedSessionLines = lines.filter(
    (line) => line.sessionId === effectiveSelectedSessionId
  )
  const pendingStockTakeExceptions = lines.filter(
    (line) => line.exceptionType && line.exceptionStatus !== "RESOLVED"
  )
  const selectedExpectedUnits = useMemo(() => {
    if (!selectedSession) {
      return []
    }

    return units.filter(
      (unit) =>
        activeStockStatus(unit.status) &&
        unit.itemId === selectedSession.itemId &&
        unit.locationId === selectedSession.locationId &&
        (selectedSession.brandId
          ? unit.brandId === selectedSession.brandId
          : !unit.brandId)
    )
  }, [selectedSession, units])
  const previousStockTakeLine = selectedSessionLines[0] ?? null
  const previousStockTakeLineStatus = previousStockTakeLine?.exceptionType
    ? previousStockTakeLine.exceptionType === "UNKNOWN_BARCODE"
      ? "Unknown barcode exception"
      : "Wrong location exception"
    : "Counted"
  const previousStockTakeLineTone = previousStockTakeLine?.exceptionType
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-emerald-200 bg-emerald-50 text-emerald-900"
  const activeStockTakeItems = useMemo(() => {
    const query = createItemQuery.trim().toLowerCase()
    const activeItems = items.filter((item) => item.active)

    if (!query) {
      return activeItems
    }

    return activeItems.filter((item) => {
      const defaultBrand = item.defaultBrandId
        ? brands.find((brand) => brand.id === item.defaultBrandId)
        : undefined

      return [
        item.itemCode,
        item.category,
        item.section,
        item.name,
        stockProductName(item, ""),
        formatProductName(item, defaultBrand),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [items, brands, createItemQuery])
  const activeStockTakeBrands = brands.filter((brand) => brand.active)
  const assignedStockTakeLocation = locations.find(
    (location) => location.active && location.id === defaultLocationId
  )
  const stockTakeLocationDefaultedToAssigned =
    assignedStockTakeLocation?.id === createLocationId
  const countedStockTakeLines = selectedSessionLines.filter(
    (line) => !line.exceptionType
  )
  const scannedCount = countedStockTakeLines.reduce(
    (sum, line) => sum + line.actualCount,
    0
  )
  const countedBarcodeSet = new Set(
    countedStockTakeLines
      .map((line) => line.barcode)
      .filter((barcode): barcode is string => Boolean(barcode))
  )
  const expectedCount = selectedExpectedUnits.length
  const missingExpectedCount = selectedExpectedUnits.filter(
    (unit) => !countedBarcodeSet.has(unit.barcode)
  ).length
  const extraScannedCount = selectedSessionLines.filter(
    (line) => line.exceptionType === "UNKNOWN_BARCODE"
  ).length
  const wrongLocationCount = selectedSessionLines.filter(
    (line) => line.exceptionType === "WRONG_LOCATION"
  ).length
  const wrongItemScanCount =
    wrongItemScanCountBySession[effectiveSelectedSessionId] ?? 0
  const scannedWeightKg = countedStockTakeLines.reduce(
    (sum, line) => sum + line.actualWeightKg,
    0
  )
  const expectedWeightKg = selectedExpectedUnits.reduce(
    (sum, unit) => sum + unit.netWeightKg,
    0
  )
  const selectedSessionItem = items.find(
    (item) => item.id === selectedSession?.itemId
  )
  const selectedSessionBrand = brands.find(
    (brand) => brand.id === selectedSession?.brandId
  )
  const selectedActiveScanSession =
    selectedSession?.status === "DRAFT" ? selectedSession : null
  const stockTakeScannerBlocked = !isOnline || !selectedActiveScanSession
  const stockTakeScanBlocked =
    stockTakeScannerBlocked || !scanBarcode.trim()
  const stockTakeScanBlockMessage = !isOnline
    ? offlineScanMessage
    : !selectedActiveScanSession
      ? "Select active stock take session first."
      : !scanBarcode.trim()
        ? "Scan barcode."
        : ""

  useEffect(() => {
    queueMicrotask(() => {
      if (scanState.status === "success") {
        setScanBarcode("")
        stockTakeBarcodeInputRef.current?.focus()
      }
    })
  }, [scanState.status])

  useEffect(() => {
    const message = scanState.message
    const wrongItemScan =
      scanState.status === "error" &&
      (message.includes("Barcode/item does not match") ||
        message.includes("Barcode brand does not match"))

    if (!wrongItemScan || !effectiveSelectedSessionId) {
      return
    }

    const errorKey = `${effectiveSelectedSessionId}:${scanBarcode}:${message}`

    if (lastWrongItemErrorRef.current === errorKey) {
      return
    }

    lastWrongItemErrorRef.current = errorKey
    setWrongItemScanCountBySession((current) => ({
      ...current,
      [effectiveSelectedSessionId]:
        (current[effectiveSelectedSessionId] ?? 0) + 1,
    }))
  }, [
    effectiveSelectedSessionId,
    scanBarcode,
    scanState.message,
    scanState.status,
  ])

  function scanStockTakeBarcode(value: string) {
    setScanBarcode(value)

    if (!isOnline) {
      setLocalScanMessage(offlineScanMessage)
      return
    }

    if (!selectedActiveScanSession) {
      setLocalScanMessage("Select active stock take session first.")
      return
    }

    setLocalScanMessage("")
    window.setTimeout(() => scanFormRef.current?.requestSubmit(), 0)
  }

  function selectStockTakeScanSession(nextSessionId: string) {
    setSelectedSessionId(nextSessionId)
    setLocalScanMessage("")
    if (nextSessionId) {
      window.setTimeout(() => stockTakeBarcodeInputRef.current?.focus(), 0)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      {canOperate ? (
        <WorkflowCard
          title="Create stock take session"
          description="Choose item first. Location defaults from your profile, then scan only barcodes for that scope."
          action={createStockTakeSessionAction}
          submitLabel="Start stock take"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="order-2 space-y-2">
              <Label htmlFor="locationId">Location</Label>
              {stockTakeLocationDefaultedToAssigned ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                >
                  Default stock take location: {assignedStockTakeLocation.name}.
                  You can change it.
                </div>
              ) : null}
              {locations.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Quick stock take locations
                  </div>
                  <div className="grid gap-2 min-[390px]:grid-cols-2">
                    {locations.slice(0, 6).map((location) => {
                      const selected = createLocationId === location.id

                      return (
                        <Button
                          key={location.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                          aria-pressed={selected}
                          onClick={() => setCreateLocationId(location.id)}
                        >
                          {location.name}
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Location defaults to your assigned stock location.
                  </p>
                </div>
              ) : null}
              <LocationSelect
                locations={locations}
                value={createLocationId}
                onChange={setCreateLocationId}
              />
            </div>
            <div className="order-1 space-y-2">
              <Label htmlFor="stockTakeCreateItemId">Product</Label>
              <Input
                id="stockTakeCreateItemSearch"
                type="search"
                value={createItemQuery}
                onChange={(event) => setCreateItemQuery(event.target.value)}
                placeholder="Search item or code"
                autoComplete="off"
                enterKeyHint="search"
              />
              {activeStockTakeItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Quick stock take items
                  </div>
                  <div className="grid gap-2 min-[390px]:grid-cols-2">
                    {activeStockTakeItems.slice(0, 6).map((item) => {
                      const selected = createItemId === item.id

                      return (
                        <Button
                          key={item.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                          aria-pressed={selected}
                          onClick={() => setCreateItemId(item.id)}
                        >
                          <span className="flex min-w-0 flex-col items-start leading-tight">
                            <span className="break-words">{item.name}</span>
                            <span className="break-words text-xs opacity-80">
                              {item.category}
                            </span>
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tap item to avoid dropdown.
                  </p>
                </div>
              ) : null}
              <ItemSelect
                items={items}
                value={createItemId}
                onChange={setCreateItemId}
              />
            </div>
            <div className="order-3 space-y-2">
              <Label htmlFor="brandId">Manufacturer</Label>
              {activeStockTakeBrands.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Quick stock take manufacturers
                  </div>
                  <div className="grid gap-2 min-[390px]:grid-cols-2">
                    {activeStockTakeBrands.slice(0, 6).map((brand) => {
                      const selected = createBrandId === brand.id

                      return (
                        <Button
                          key={brand.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          className="min-h-14 min-w-0 justify-start break-words whitespace-normal text-left"
                          aria-pressed={selected}
                          onClick={() => setCreateBrandId(brand.id)}
                        >
                          {brand.name}
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tap manufacturer to avoid dropdown.
                  </p>
                </div>
              ) : null}
              <BrandSelect
                brands={brands}
                value={createBrandId}
                onChange={setCreateBrandId}
              />
            </div>
          </div>
          <div
            role="status"
            aria-live="polite"
            className="break-words rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Stock take is active for this item/manufacturer/location. You can
            continue, but this movement will be recorded.
          </div>
        </WorkflowCard>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Stock take approval</CardTitle>
            <CardDescription>
              Review submitted sessions below. Counting and scan entry are
              for stock operators.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {canOperate ? (
        <Card>
          <CardHeader>
            <CardTitle>Scan stock take barcode</CardTitle>
            <CardDescription>
              Select a session, then keep scanning. No manual count entry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              ref={scanFormRef}
              action={scanAction}
              className="space-y-4"
              onSubmit={(event) => {
                if (stockTakeScanBlocked) {
                  event.preventDefault()
                  setLocalScanMessage(stockTakeScanBlockMessage)
                }
              }}
            >
            {!isOnline ? (
              <OfflineScanAlert />
            ) : null}
            <div className="space-y-2">
              <div className="text-sm font-medium">Tap active session</div>
              {activeScanSessions.length > 0 ? (
                <>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    First active session is selected automatically.
                  </div>
                  <div className="grid gap-2 min-[390px]:grid-cols-2">
                    {activeScanSessions.slice(0, 4).map((session) => {
                      const scopedItem = items.find(
                        (item) => item.id === session.itemId
                      )
                      const scopedBrand = brands.find(
                        (brand) => brand.id === session.brandId
                      )
                    const isSelected = session.id === effectiveSelectedSessionId

                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => selectStockTakeScanSession(session.id)}
                          className={[
                            "min-h-16 min-w-0 rounded-md border px-3 py-2 text-left text-sm transition",
                            isSelected
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : "border-input bg-background hover:bg-muted",
                          ].join(" ")}
                        >
                          <span className="block break-words font-semibold">
                            {scopedBrand?.name ?? "No manufacturer"}{" "}
                            {scopedItem?.name ?? "No product"}
                          </span>
                          <span className="mt-1 block break-words text-xs text-muted-foreground">
                            {session.locationName} - {session.sessionNo}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Start a stock take above, then scan.
                </div>
              )}
            </div>
            {selectedActiveScanSession ? (
              <div
                role="status"
                aria-live="polite"
                className="break-words rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
              >
                <div className="text-xs font-semibold uppercase">
                  Scanning for
                </div>
                <div className="mt-1 break-words text-base font-semibold">
                  {selectedSessionBrand?.name ?? "No manufacturer"}{" "}
                  {selectedSessionItem?.name ?? "No product"}
                </div>
                <div className="mt-1 break-words text-emerald-800">
                  {selectedActiveScanSession.locationName}
                </div>
                <div className="mt-2 rounded-md border border-emerald-200 bg-background/70 px-3 py-2 text-xs font-medium text-emerald-800">
                  Wrong item or manufacturer is blocked.
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scanSessionId">Session</Label>
                <NativeSelect
                  id="scanSessionId"
                  name="sessionId"
                  value={effectiveSelectedSessionId}
                  onChange={selectStockTakeScanSession}
                >
                  <option value="">Select session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.sessionNo} - {session.locationName} - {session.status}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <BarcodeField
                inputRef={stockTakeBarcodeInputRef}
                id="stockTakeBarcode"
                name="barcode"
                label="Barcode"
                value={scanBarcode}
                onChange={setScanBarcode}
                onScan={scanStockTakeBarcode}
                continuousScan
                disabled={stockTakeScannerBlocked}
                disabledReason={
                  !isOnline
                    ? offlineScanMessage
                    : !selectedActiveScanSession
                      ? "Select active stock take session first."
                      : ""
                }
                placeholder="EM-BC-000001"
              />
            </div>
            {stockTakeScannerBlocked && isOnline ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                Select active stock take session first.
              </div>
            ) : null}
            {selectedSession ? (
              <div className="break-words rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="font-medium">Counting scope</div>
                <div className="mt-1 break-words text-muted-foreground">
                  {selectedSession.locationName} -{" "}
                  {selectedSessionItem?.name ?? "No product"} -{" "}
                  {selectedSessionBrand?.name ?? "No manufacturer"}
                </div>
                <div className="mt-3 grid gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Counted quantity
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {scannedCount}/{expectedCount || "?"}
                    </div>
                    <div className="break-all text-xs text-muted-foreground">
                      {selectedSession.sessionNo}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Counted weight
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {scannedWeightKg.toFixed(2)}kg/
                      {expectedWeightKg > 0
                        ? `${expectedWeightKg.toFixed(2)}kg`
                        : "?"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expected stock comes from available units.
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Extra scanned count
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {extraScannedCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Unknown barcode is exception.
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Missing expected count
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {missingExpectedCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Mismatch report waits for approval.
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Wrong item count
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {wrongItemScanCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Wrong item scan is blocked.
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Wrong location count
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {wrongLocationCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Wrong location is exception.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {previousStockTakeLine ? (
              <div
                className={[
                  "rounded-lg border p-3 text-sm",
                  previousStockTakeLineTone,
                ].join(" ")}
              >
                <div className="text-xs font-semibold uppercase">
                  Previous stock take scan
                </div>
                <div className="mt-2 break-all font-mono text-base font-semibold">
                  {previousStockTakeLine.barcode ?? "No barcode"}
                </div>
                <div className="mt-2 grid gap-2 min-[390px]:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase opacity-75">Product</div>
                    <div className="break-words font-medium">
                      {previousStockTakeLine.itemName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase opacity-75">Weight</div>
                    <div className="font-medium tabular-nums">
                      {previousStockTakeLine.actualWeightKg.toFixed(2)}kg
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {previousStockTakeLineStatus}
                  {previousStockTakeLine.exceptionStatus
                    ? ` - ${previousStockTakeLine.exceptionStatus.toLowerCase()}`
                    : ""}
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 min-[390px]:grid-cols-3">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Barcode-only count.
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Wrong item/manufacturer blocked.
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Unknown barcode is exception.
              </div>
            </div>
            {localScanMessage ? (
              <div
                role="alert"
                aria-live="assertive"
                className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {localScanMessage}
              </div>
            ) : null}
            <ActionMessage state={scanState} />
            <SubmitButton
              pending={scanPending}
              disabled={stockTakeScanBlocked}
              className="h-12 w-full"
            >
              Record scanned barcode
            </SubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canOperate ? (
        <Card>
          <CardHeader>
            <CardTitle>Barcode-only count</CardTitle>
            <CardDescription>
              Stock take lines are created only by scanning barcode units.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              Scan every barcode in the selected session. Manual count entry is
              disabled for MVP. Missing barcode adjustment waits for manager
              review and director approval.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {pendingStockTakeExceptions.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/60 xl:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Pending stock take exceptions</CardTitle>
                <CardDescription>
                  Review these before final approval. Unknown barcodes and
                  wrong-location barcodes resolve only after manager review and
                  director approval.
                </CardDescription>
              </div>
              <Badge variant="warning">
                {pendingStockTakeExceptions.length} open
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {pendingStockTakeExceptions.slice(0, 6).map((line) => {
              const session = sessions.find(
                (candidate) => candidate.id === line.sessionId
              )

              return (
                <div
                  key={line.id}
                  className="rounded-md border border-amber-200 bg-background p-3 text-sm"
                >
                  <div className="font-semibold">
                    {line.exceptionType?.replaceAll("_", " ")}
                  </div>
                  <div className="mt-1 break-all font-mono text-xs">
                    {line.barcode ?? "No barcode"}
                  </div>
                  <div className="mt-2 break-words text-muted-foreground">
                    {session?.sessionNo ?? "No session"} -{" "}
                    {session?.locationName ?? "No location"}
                  </div>
                  <div className="mt-1 break-words text-xs text-amber-800">
                    Next: manager review, then director approval.
                  </div>
                </div>
              )
            })}
            {pendingStockTakeExceptions.length > 6 ? (
              <div className="rounded-md border border-dashed border-amber-200 bg-background p-3 text-sm text-muted-foreground">
                +{pendingStockTakeExceptions.length - 6} more stock take
                exception{pendingStockTakeExceptions.length - 6 === 1 ? "" : "s"}.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Review sessions</CardTitle>
          <CardDescription>
            Submit, review, and approve stock take sessions with recorded
            variance lines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.map((session) => {
            const sessionLines = lines.filter(
              (line) => line.sessionId === session.id
            )
            const varianceWeight = sessionLines.reduce(
              (sum, line) => sum + line.varianceWeightKg,
              0
            )
            const exceptionLines = sessionLines.filter(
              (line) => line.exceptionType
            )
            const scopedItem = items.find((item) => item.id === session.itemId)
            const scopedBrand = brands.find((brand) => brand.id === session.brandId)

            return (
              <div key={session.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="break-all font-semibold">
                      {session.sessionNo}
                    </div>
                    <div className="break-words text-sm text-muted-foreground">
                      {session.locationName} -{" "}
                      {scopedItem
                        ? stockDisplayItemName(
                            scopedItem,
                            scopedBrand,
                            "Unknown product"
                          )
                        : "No product scope"}{" "}
                      - {scopedBrand?.name ?? "No manufacturer"} -{" "}
                      {sessionLines.length} lines -{" "}
                      {varianceWeight.toFixed(2)} kg variance
                    </div>
                    {exceptionLines.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {exceptionLines.slice(0, 4).map((line) => (
                          <Badge
                            key={line.id}
                            className="whitespace-normal break-all text-left"
                            variant="secondary"
                          >
                            {line.exceptionType?.replaceAll("_", " ")}:{" "}
                            {line.barcode ?? "No barcode"} (
                            {line.exceptionStatus ?? "PENDING"})
                          </Badge>
                        ))}
                        {exceptionLines.length > 4 ? (
                          <Badge
                            className="whitespace-normal break-words text-left"
                            variant="outline"
                          >
                            +{exceptionLines.length - 4} more exceptions
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-1 break-words text-xs text-muted-foreground">
                      Manager signature: {session.managerSignature ?? "Pending"} |
                      Director signature: {session.directorSignature ?? "Pending"}
                    </div>
                  </div>
                <StockTakeSessionActions
                  session={session}
                  canOperate={canOperate}
                  canManage={canManage}
                  canDirectorApprove={canDirectorApprove}
                />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
