"use client"

import { Save } from "lucide-react"
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ComponentProps,
  type ReactNode,
} from "react"

import {
  approveDamageRequestAction,
  approveReturnSupplierRequestAction,
  approveStockTakeAction,
  barcodeInboundAction,
  confirmDirectOutboundAction,
  confirmOrderOutboundAction,
  createBrandAction,
  createDamageRequestAction,
  createReturnSupplierRequestAction,
  createItemAction,
  createLocationAction,
  createOriginAction,
  createStockTakeSessionAction,
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
import { stockDamageReasons } from "@/lib/stock/types"
import type {
  Brand,
  BarcodeWeightRule,
  Item,
  Origin,
  StockDamageRequest,
  StockLocation,
  StockOutlet,
  StockReturnSupplierRequest,
  StockTakeLine,
  StockTakeSession,
  StockUnit,
  StockDamageReason,
} from "@/lib/stock/types"
import type { CustomerOrder, CustomerOrderItem } from "@/lib/orders/types"
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
import { decodeBarcodeWeight } from "@/lib/stock/barcode-weight"
import { makeUniqueInternalBarcode } from "@/lib/stock/barcode-label"

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
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {state.message}
        </div>
      ) : null}
      {state.warning ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
        >
          {state.warning}
        </div>
      ) : null}
    </div>
  )
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
      className={["min-h-11 gap-2", className].filter(Boolean).join(" ")}
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
  value,
  onChange,
  disabled = false,
}: {
  items: Item[]
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
}) {
  const activeItems = items.filter((item) => item.active)

  return (
    <NativeSelect
      id="itemId"
      name="itemId"
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      <option value="">Select item</option>
      {activeItems.map((item) => (
        <option key={item.id} value={item.id}>
          {item.category} / {item.section} / {item.name}
        </option>
      ))}
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
}: {
  brands: Brand[]
  value?: string
  onChange?: (value: string) => void
  allowOther?: boolean
  required?: boolean
  disabled?: boolean
}) {
  const activeBrands = brands.filter((brand) => brand.active)

  return (
    <NativeSelect
      id="brandId"
      name="brandId"
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
    >
      <option value="">No brand</option>
      {activeBrands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
      {allowOther ? <option value="__other">Other / custom brand</option> : null}
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
  const activeOrigins = origins.filter((origin) => origin.active)

  return (
    <NativeSelect
      id="originId"
      name="originId"
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
    >
      <option value="">No origin</option>
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
  const activeLocations = locations.filter((location) => location.active)

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
  locations: StockLocation[]
) {
  const activeLocations = locations.filter((location) => location.active)
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
}: {
  outlets: StockOutlet[]
  locations: StockLocation[]
  id: string
  name: string
  value: string
  onChange: (value: string) => void
}) {
  const options = transferDestinationOptions(outlets, locations)
  const selectedOption =
    options.find((option) => option.locationId === value) ?? null

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <NativeSelect
        id={id}
        name={`${name}Outlet`}
        value={selectedOption?.optionId ?? ""}
        onChange={(optionId) => {
          const option = options.find((candidate) => candidate.optionId === optionId)
          onChange(option?.locationId ?? "")
        }}
      >
        <option value="">Select stock location</option>
        {options.map((option) => (
          <option key={option.optionId} value={option.optionId}>
            {option.locationName}
            {option.outletName !== option.locationName
              ? ` - ${option.outletName}`
              : ""}
          </option>
        ))}
      </NativeSelect>
      {selectedOption ? (
        <p className="text-xs text-muted-foreground">
          Selected stock location: {selectedOption.locationName}
        </p>
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
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "")
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

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create item</CardTitle>
          <CardDescription>
            Item code starts as the next numeric code and can be edited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="brandId">Default brand</Label>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Product name</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  required
                  onChange={(event) => {
                    setName(event.target.value)
                    updateGeneratedCode({})
                  }}
                  placeholder="BONELESS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chineseName">Chinese name</Label>
                <Input id="chineseName" name="chineseName" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ibanName">Iban name</Label>
                <Input id="ibanName" name="ibanName" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLowStockLevel">Default low stock kg</Label>
                <Input
                  id="defaultLowStockLevel"
                  name="defaultLowStockLevel"
                  type="number"
                  min="0"
                  step="0.001"
                  defaultValue="0"
                />
              </div>
            </div>
            <input type="hidden" name="barcodeRequired" value="false" />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="barcodeRequired"
                value="true"
                defaultChecked
                className="size-4 rounded border-input"
              />
              Barcode required
            </label>
            <ActionMessage state={createState} />
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
              <NativeSelect
                id="editItemId"
                name="itemId"
                value={selectedItemId}
                onChange={setSelectedItemId}
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemCode} - {item.section} / {item.name}
                  </option>
                ))}
              </NativeSelect>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCategory">Category</Label>
                  <select
                    id="editCategory"
                    name="category"
                    defaultValue={selectedItem.category}
                    key={`${selectedItem.id}-category`}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <option value="MEAT">MEAT</option>
                    <option value="ORGANS">ORGANS</option>
                    <option value="PROCESSED">PROCESSED</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDefaultBrandId">Default brand</Label>
                  <select
                    id="editDefaultBrandId"
                    name="defaultBrandId"
                    defaultValue={selectedItem.defaultBrandId ?? ""}
                    key={`${selectedItem.id}-brand`}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <option value="">No brand</option>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editName">Product name</Label>
                  <Input
                    id="editName"
                    name="name"
                    defaultValue={selectedItem.name}
                    required
                    key={`${selectedItem.id}-name`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editChineseName">Chinese name</Label>
                  <Input
                    id="editChineseName"
                    name="chineseName"
                    defaultValue={selectedItem.chineseName ?? ""}
                    key={`${selectedItem.id}-chinese`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editIbanName">Iban name</Label>
                  <Input
                    id="editIbanName"
                    name="ibanName"
                    defaultValue={selectedItem.ibanName ?? ""}
                    key={`${selectedItem.id}-iban`}
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
                  />
                </div>
              </div>
            ) : null}
            <input type="hidden" name="barcodeRequired" value="false" />
            <input type="hidden" name="isActive" value="false" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="barcodeRequired"
                  value="true"
                  defaultChecked={selectedItem?.barcodeRequired ?? true}
                  key={`${selectedItem?.id ?? "none"}-barcode`}
                  className="size-4 rounded border-input"
                />
                Barcode required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={selectedItem?.active ?? true}
                  key={`${selectedItem?.id ?? "none"}-active`}
                  className="size-4 rounded border-input"
                />
                Active
              </label>
            </div>
            {!selectedItem ? (
              <p className="text-sm text-muted-foreground">
                Select an item before updating item master details.
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

export function MasterDataForms() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <WorkflowCard
        title="Add brand"
        description="Brands are used during inbound capture and reporting."
        action={createBrandAction}
        submitLabel="Add brand"
      >
        <div className="space-y-2">
          <Label htmlFor="brandName">Brand name</Label>
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
  status: "SAVED" | "VOIDED"
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
  updatedAt: string
  hasRule: boolean
}

const inboundPresetKey = "elite-meat:stock-inbound-preset"
const inboundScopeKeys: (keyof InboundPreset)[] = [
  "itemId",
  "brandId",
  "originId",
  "locationId",
]

function generateInboundBatchNo() {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "")
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "")

  return `INB-${datePart}-${timePart}`
}

function initialInboundPreset(
  items: Item[] = [],
  locations: StockLocation[] = [],
  brands: Brand[] = [],
  origins: Origin[] = [],
  defaultLocationId?: string | null
): InboundPreset {
  const activeItem = items.find((item) => item.active)
  const activeLocation =
    locations.find(
      (location) => location.active && location.id === defaultLocationId
    ) ?? locations.find((location) => location.active)
  const fallback: InboundPreset = {
    itemId: activeItem?.id ?? "",
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
      origins
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
  origins: Origin[] = []
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

  const fallbackItemId = activeItemIds.values().next().value ?? ""
  const fallbackLocationId = activeLocationIds.values().next().value ?? ""

  return {
    ...preset,
    itemId: activeItemIds.has(preset.itemId) ? preset.itemId : fallbackItemId,
    brandId:
      preset.brandId && activeBrandIds.has(preset.brandId) ? preset.brandId : "",
    originId:
      preset.originId && activeOriginIds.has(preset.originId)
        ? preset.originId
        : "",
    locationId: activeLocationIds.has(preset.locationId)
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
    return preset
  }

  return {
    ...preset,
    barcodeWeightStart: String(matchingRule.barcodeWeightStart),
    barcodeWeightLength: String(matchingRule.barcodeWeightLength),
    barcodeWeightDecimals: String(matchingRule.barcodeWeightDecimals),
  }
}

function formatTemplateName(
  template: Pick<InboundTemplate, "brandId" | "itemId">,
  items: Item[],
  brands: Brand[]
) {
  const item = items.find((candidate) => candidate.id === template.itemId)
  const brand = brands.find((candidate) => candidate.id === template.brandId)

  return `${brand?.name ?? "No brand"} ${item?.name ?? "Unknown product"}`
}

function buildInboundTemplates({
  items,
  brands,
  units,
  barcodeWeightRules,
}: {
  items: Item[]
  brands: Brand[]
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
      updatedAt: rule.updatedAt,
      hasRule: true,
    })
  }

  for (const unit of units) {
    if (!unit.itemId || !unit.brandId || !unit.originId) {
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
      updatedAt: unit.receivedAt,
      hasRule: existing?.hasRule ?? false,
    })
  }

  return [...templates.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
}

function formatProductName(item: Item | undefined) {
  if (!item) {
    return "Unknown product"
  }

  return `${item.category} / ${item.section || "GENERAL"} / ${item.name}`
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
        "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700",
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
}: {
  items: Item[]
  brands: Brand[]
  origins: Origin[]
  locations: StockLocation[]
  barcodeWeightRules: BarcodeWeightRule[]
  units?: StockUnit[]
  defaultLocationId?: string | null
  scannedByName?: string
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement | null>(null)
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
  const [localItems, setLocalItems] = useState(items)
  const [barcode, setBarcode] = useState("")
  const [preset, setPreset] = useState(() =>
    initialInboundPreset(items, locations, brands, origins, defaultLocationId)
  )
  const [batchNo, setBatchNo] = useState(() => generateInboundBatchNo())
  const [sessionStartedAt, setSessionStartedAt] = useState(
    () => new Date().toISOString()
  )
  const [sessionFinishedAt, setSessionFinishedAt] = useState<string | null>(
    null
  )
  const [netWeightKg, setNetWeightKg] = useState("")
  const [decodeMessage, setDecodeMessage] = useState("")
  const [decodeStatus, setDecodeStatus] = useState<
    "success" | "warning" | "error" | ""
  >("")
  const [brandName, setBrandName] = useState("")
  const [originName, setOriginName] = useState("")
  const [productQuery, setProductQuery] = useState("")
  const [quickItemName, setQuickItemName] = useState("")
  const [quickItemCategory, setQuickItemCategory] = useState("MEAT")
  const [recentLabels, setRecentLabels] = useState<InboundLabel[]>([])
  const [sessionErrors, setSessionErrors] = useState<InboundSessionError[]>([])
  const isOnline = useOnlineStatus()
  const pendingLabelRef = useRef<InboundLabel | null>(null)
  const lastErrorMessageRef = useRef("")
  const labelSerialRef = useRef(0)

  useEffect(() => {
    try {
      window.localStorage.setItem(inboundPresetKey, JSON.stringify(preset))
    } catch {
      // Ignore unavailable storage, for example private browsing.
    }
  }, [preset])

  async function inboundFormAction(
    previousState: StockActionState,
    formData: FormData
  ) {
    const result = await barcodeInboundAction(previousState, formData)

    if (result.status === "success") {
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

        setRecentLabels((current) => [savedLabel, ...current].slice(0, 12))
        pendingLabelRef.current = null
      }

      vibrateAndBeep()
      window.setTimeout(() => {
        setBarcode("")
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

  async function quickCreateFormAction(
    previousState: StockActionState,
    formData: FormData
  ) {
    const itemCode = quickItemCode
    const itemName = quickItemName.trim()
    const itemCategory = quickItemCategory as Item["category"]
    const result = await createItemAction(previousState, formData)

    if (result.status === "success" && result.itemId) {
      const nextItem: Item = {
        id: result.itemId,
        itemCode,
        category: itemCategory,
        defaultBrandId: null,
        section: "GENERAL",
        name: itemName,
        chineseName: null,
        ibanName: null,
        barcodeRequired: true,
        active: true,
        defaultLowStockLevel: 0,
      }

      setLocalItems((current) =>
        current.some((item) => item.id === nextItem.id)
          ? current
          : [...current, nextItem]
      )
      updatePreset("itemId", nextItem.id)
      setProductQuery(nextItem.name)
      setQuickItemName("")
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
    ].slice(0, 8))
  }

  function updatePreset<K extends keyof InboundPreset>(
    key: K,
    value: InboundPreset[K]
  ) {
    if (scopeLocked && inboundScopeKeys.includes(key)) {
      setDecodeStatus("warning")
      setDecodeMessage(
        "Finish this inbound session before changing product, brand, origin, or location."
      )
      return
    }

    setPreset((current) => {
      const next = { ...current, [key]: value }
      return inboundScopeKeys.includes(key)
        ? applyMatchingWeightRule(next, barcodeWeightRules)
        : next
    })
  }

  function isDuplicateInboundBarcode(value: string) {
    const nextBarcode = value.trim()

    return nextBarcode
      ? units.some((unit) => unit.barcode === nextBarcode) ||
          recentLabels.some((label) => label.barcode === nextBarcode)
      : false
  }

  function handleBarcodeChange(value: string, submitAfterScan = false) {
    if (submitAfterScan && !isOnline) {
      const message = offlineScanMessage

      setBarcode(value)
      setDecodeStatus("error")
      setDecodeMessage(message)
      recordSessionError(value, message)
      return
    }

    const decoded = decodeBarcodeWeight({
      barcode: value,
      startText: preset.barcodeWeightStart,
      lengthText: preset.barcodeWeightLength,
      decimalsText: preset.barcodeWeightDecimals,
      fixedWeightKgText: preset.fixedWeightKg,
    })

    setBarcode(value)
    setDecodeMessage(decoded.message)
    setDecodeStatus(
      decoded.status === "decoded"
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
      setDecodeMessage(message)
      recordSessionError(value, message)
      return
    }

    if (submitAfterScan && decoded.status === "error") {
      const message =
        "No weight found. Generate an internal label, print it, then attach it."
      setDecodeStatus("error")
      setDecodeMessage(message)
      recordSessionError(value, message)
      return
    }

    if (
      submitAfterScan &&
      (!preset.itemId ||
        !preset.brandId ||
        !preset.originId ||
        !preset.locationId)
    ) {
      const message = "Choose product, brand, origin, and location first."

      setDecodeStatus("error")
      setDecodeMessage(message)
      recordSessionError(value, message)
      return
    }

    const readyToSubmit =
      submitAfterScan &&
      preset.itemId &&
      preset.brandId &&
      preset.originId &&
      preset.locationId &&
      value &&
      !sessionFinishedAt &&
      decoded.status === "decoded"

    if (readyToSubmit) {
      window.setTimeout(() => formRef.current?.requestSubmit(), 0)
    }
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
      productName: formatProductName(selectedItem),
      weightKg: Number(netWeightKg).toFixed(3),
      barcode,
      scannedAt: new Date().toISOString(),
      scannedBy: scannedByName,
      locationName: selectedLocation?.name ?? "Unknown location",
      status: "SAVED",
    }
  }

  function handleInboundFormSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (
      event.nativeEvent as SubmitEvent & {
        submitter?: HTMLElement | null
      }
    ).submitter

    if (submitter?.dataset.stockAction === "quick-create-item") {
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

    rememberLabel()
  }

  function generateLabelBarcode() {
    if (!isOnline) {
      setDecodeStatus("error")
      setDecodeMessage(offlineScanMessage)
      return
    }

    if (
      !selectedItem ||
      !preset.brandId ||
      !preset.originId ||
      !preset.locationId
    ) {
      setDecodeStatus("error")
      setDecodeMessage("Choose product, brand, origin, and location first.")
      return
    }

    const existingBarcodes = [
      ...units.map((unit) => unit.barcode),
      ...recentLabels.map((label) => label.barcode),
    ]
    const generated = makeUniqueInternalBarcode(
      selectedItem,
      netWeightKg,
      existingBarcodes,
      labelSerialRef.current + 1
    )

    if (!generated.barcode) {
      setDecodeStatus("error")
      setDecodeMessage("Enter weight before generating a label.")
      return
    }

    labelSerialRef.current = generated.serial
    setBarcode(generated.barcode)
    setDecodeStatus("warning")
    setDecodeMessage(
      "Internal label generated. Saving stock now; print and attach the label after it appears below."
    )
    window.setTimeout(() => formRef.current?.requestSubmit(), 0)
  }

  const selectedItem = localItems.find((item) => item.id === preset.itemId)
  const selectedBrand = brands.find((brand) => brand.id === preset.brandId)
  const selectedOrigin = origins.find((origin) => origin.id === preset.originId)
  const selectedLocation = locations.find(
    (location) => location.id === preset.locationId
  )
  const inboundTemplates = useMemo(
    () =>
      buildInboundTemplates({
        items: localItems,
        brands,
        units,
        barcodeWeightRules,
      }),
    [localItems, brands, units, barcodeWeightRules]
  )
  const filteredItems = useMemo(() => {
    const query = productQuery.trim().toLowerCase()

    if (!query) {
      return localItems
    }

    return localItems.filter((item) =>
      [item.itemCode, item.category, item.section, item.name]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [localItems, productQuery])
  const duplicateBarcode = barcode
    ? isDuplicateInboundBarcode(barcode)
    : false
  const savedSessionScans = recentLabels.filter(
    (label) => label.status === "SAVED"
  )
  const recentInboundCount = savedSessionScans.length
  const recentInboundWeightKg = savedSessionScans.reduce(
    (total, label) => total + Number(label.weightKg || 0),
    0
  )
  const latestSavedScan = savedSessionScans[0]
  const scopeLocked = savedSessionScans.length > 0 && !sessionFinishedAt
  const quickItemCode = generatedItemCode(localItems)
  const activePrintLabels = recentLabels.filter(
    (label) => label.status === "SAVED"
  )

  function applyInboundTemplate(template: InboundTemplate) {
    if (scopeLocked) {
      setDecodeStatus("warning")
      setDecodeMessage(
        "Finish this inbound session before choosing another template."
      )
      return
    }

    setPreset((current) =>
      applyMatchingWeightRule(
        {
          ...current,
          itemId: template.itemId,
          brandId: template.brandId,
          originId: template.originId,
        },
        barcodeWeightRules
      )
    )
    setProductQuery(template.label)
    setDecodeStatus(template.hasRule ? "success" : "warning")
    setDecodeMessage(
      template.hasRule
        ? "Template selected. Saved barcode weight rule loaded; scan the next barcode."
        : "Template selected. No saved barcode weight rule found; set the rule once before scanning."
    )
    window.setTimeout(() => barcodeInputRef.current?.focus(), 0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Continuous barcode inbound</CardTitle>
        <CardDescription>
          Select product details once, then keep scanning the same item. Weight
          can be read from a saved barcode position rule.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={formAction}
          onSubmit={handleInboundFormSubmit}
          className="space-y-4"
        >
          {scopeLocked ? (
            <>
              <input type="hidden" name="itemId" value={preset.itemId} />
              <input type="hidden" name="brandId" value={preset.brandId} />
              <input type="hidden" name="originId" value={preset.originId} />
              <input type="hidden" name="locationId" value={preset.locationId} />
              <input
                type="hidden"
                name="inboundSource"
                value={preset.inboundSource}
              />
            </>
          ) : null}
          <div className="space-y-2">
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
                    className="h-auto justify-start whitespace-normal py-3 text-left"
                    disabled={scopeLocked}
                    onClick={() => applyInboundTemplate(template)}
                  >
                    <span>
                      <span className="block font-medium">
                        {template.label}
                      </span>
                      <span className="block text-xs opacity-80">
                        {template.hasRule
                          ? "Rule saved"
                          : "Set rule once"}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                No recent templates yet. Choose a product, brand, and origin
                below; future sessions will show it here.
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              {!isOnline ? (
                <OfflineScanAlert className="mb-3" />
              ) : null}
              <BarcodeField
                inputRef={barcodeInputRef}
                id="barcode"
                name="barcode"
                label="Barcode"
                value={barcode}
                onChange={(value) => handleBarcodeChange(value)}
                onScan={(value) => handleBarcodeChange(value, true)}
                continuousScan
                placeholder="Scan or type barcode"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateLabelBarcode}
                  disabled={!isOnline || Boolean(sessionFinishedAt)}
                >
                  Generate internal label
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                If weight is missing, enter kg, generate an internal label, then
                print and attach it. Stock saves immediately.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemId">Product</Label>
              <Input
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Search product or item code"
                disabled={scopeLocked}
              />
              <ItemSelect
                items={filteredItems}
                value={preset.itemId}
                onChange={(value) => updatePreset("itemId", value)}
                disabled={scopeLocked}
              />
              <details className="rounded-md border bg-muted/30 p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  New product
                </summary>
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
                    value={quickItemName}
                    onChange={(event) => setQuickItemName(event.target.value)}
                    placeholder="Product name"
                  />
                  <Button
                    type="submit"
                    formAction={quickCreateAction}
                    data-stock-action="quick-create-item"
                    disabled={
                      quickCreatePending ||
                      quickItemName.trim().length < 2 ||
                      scopeLocked
                    }
                    variant="outline"
                  >
                    {quickCreatePending ? "Creating..." : "Create"}
                  </Button>
                </div>
                <input type="hidden" name="itemCode" value={quickItemCode} />
                <input type="hidden" name="category" value={quickItemCategory} />
                <input type="hidden" name="section" value="GENERAL" />
                <input type="hidden" name="name" value={quickItemName} />
                <input type="hidden" name="barcodeRequired" value="true" />
                <input type="hidden" name="defaultLowStockLevel" value="0" />
                <div className="mt-2 text-xs text-muted-foreground">
                  New item code: {quickItemCode}
                </div>
                <ActionMessage state={quickCreateState} />
              </details>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand</Label>
              <BrandSelect
                brands={brands}
                value={preset.brandId}
                onChange={(value) => updatePreset("brandId", value)}
                allowOther
                required
                disabled={scopeLocked}
              />
              {preset.brandId === "__other" ? (
                <Input
                  name="brandName"
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  placeholder="Enter custom brand"
                  readOnly={scopeLocked}
                  required
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="originId">Origin</Label>
              <OriginSelect
                origins={origins}
                value={preset.originId}
                onChange={(value) => updatePreset("originId", value)}
                allowOther
                required
                disabled={scopeLocked}
              />
              {preset.originId === "__other" ? (
                <Input
                  name="originName"
                  value={originName}
                  onChange={(event) => setOriginName(event.target.value)}
                  placeholder="Enter custom origin"
                  readOnly={scopeLocked}
                  required
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationId">Location</Label>
              <LocationSelect
                locations={locations}
                value={preset.locationId}
                onChange={(value) => updatePreset("locationId", value)}
                disabled={scopeLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="netWeightKg">Net weight kg</Label>
              <Input
                id="netWeightKg"
                name="netWeightKg"
                type="number"
                step="0.001"
                min="0"
                value={netWeightKg}
                onChange={(event) => setNetWeightKg(event.target.value)}
              />
            </div>
            <details className="rounded-md border bg-muted/30 p-3 md:col-span-2">
              <summary className="cursor-pointer text-sm font-medium">
                Weight rule and notes
              </summary>
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
                    value={preset.barcodeWeightStart}
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
                    value={preset.barcodeWeightLength}
                    onChange={(event) =>
                      updatePreset("barcodeWeightLength", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcodeWeightDecimals">Weight decimals</Label>
                  <Input
                    id="barcodeWeightDecimals"
                    name="barcodeWeightDecimals"
                    type="number"
                    min="1"
                    max="3"
                    value={preset.barcodeWeightDecimals}
                    onChange={(event) =>
                      updatePreset("barcodeWeightDecimals", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fixedWeightKg">Fallback fixed kg</Label>
                  <Input
                    id="fixedWeightKg"
                    type="number"
                    min="0"
                    step="0.001"
                    value={preset.fixedWeightKg}
                    onChange={(event) =>
                      updatePreset("fixedWeightKg", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchNo">Batch no.</Label>
                  <Input
                    id="batchNo"
                    name="batchNo"
                    value={batchNo}
                    onChange={(event) => setBatchNo(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceNo">Reference no.</Label>
                  <Input
                    id="referenceNo"
                    name="referenceNo"
                    placeholder="GRN-1001"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" />
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    name="saveWeightRule"
                    value="true"
                    checked={preset.saveWeightRule}
                    onChange={(event) =>
                      updatePreset("saveWeightRule", event.target.checked)
                    }
                    className="size-4 rounded border-input"
                  />
                  Save weight rule for future scans
                </label>
              </div>
            </details>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">Current scan preset</div>
            {scopeLocked ? (
              <div className="mb-1 text-xs font-medium text-amber-700">
                Session locked. Finish this session before changing setup.
              </div>
            ) : null}
            <div className="mt-1 text-muted-foreground">
              {selectedItem
                ? `${selectedItem.category} / ${selectedItem.section} / ${selectedItem.name}`
                : "No product"}{" "}
              - {selectedBrand?.name ?? "No brand"} -{" "}
              {selectedOrigin?.name ?? "No origin"} -{" "}
              {selectedLocation?.name ?? "No location"}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs uppercase text-muted-foreground">
                Saved scans
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {recentInboundCount}
              </div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs uppercase text-muted-foreground">
                Saved weight
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {recentInboundWeightKg.toFixed(3)} kg
              </div>
            </div>
          </div>

          {latestSavedScan ? (
            <div
              aria-live="polite"
              className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <div className="text-xs font-medium uppercase">Previous scan</div>
              <div className="mt-1 font-semibold">
                {latestSavedScan.productName}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {latestSavedScan.weightKg} kg
              </div>
              <div className="break-all font-mono text-xs">
                {latestSavedScan.barcode}
              </div>
            </div>
          ) : null}

          {decodeMessage ? (
            <div
              role={decodeStatus === "error" ? "alert" : "status"}
              aria-live={decodeStatus === "error" ? "assertive" : "polite"}
              className={
                decodeStatus === "success"
                  ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                  : decodeStatus === "warning"
                    ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                    : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              }
            >
              {decodeMessage}
            </div>
          ) : null}

          {duplicateBarcode ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Duplicate barcode. Inbound is blocked.
            </div>
          ) : null}

          <ActionMessage state={state} />
          {state.status === "error" ? (
            <p className="text-sm text-muted-foreground">
              If the internet is unstable, keep the item setup selected and
              retry this barcode when the connection returns.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <SubmitButton
              pending={pending}
              disabled={
                duplicateBarcode ||
                decodeStatus === "error" ||
                !isOnline ||
                Boolean(sessionFinishedAt)
              }
            >
              Save inbound
            </SubmitButton>
            <Button
              type="button"
              variant="outline"
              disabled={recentLabels.length === 0 || Boolean(sessionFinishedAt)}
              onClick={() => setSessionFinishedAt(new Date().toISOString())}
            >
              Finish Inbound Session
            </Button>
          </div>
        </form>
        {recentLabels.length > 0 ? (
          <div className="mt-4 rounded-md border bg-muted/30 p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <div className="font-medium">Recent inbound scans</div>
                <StockLabelPrintNote />
              </div>
              {activePrintLabels.length > 0 ? (
                <StockLabelPrintActions />
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {recentLabels.map((label) => (
                <div
                  key={label.id}
                  className="rounded-md border bg-background p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{label.productName}</div>
                    <Badge
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
                  {label.status === "SAVED" ? (
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
                        size="sm"
                        disabled={undoPending}
                      >
                        Undo scan
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
            <ActionMessage state={undoState} />
          </div>
        ) : null}
        {sessionFinishedAt ? (
          <div className="mt-4 rounded-md border bg-background p-4">
            <div className="text-lg font-semibold">Inbound session summary</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Total barcode units
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
              <div>Item: {selectedItem?.name ?? "No product"}</div>
              <div>Brand: {selectedBrand?.name ?? "No brand"}</div>
              <div>Origin: {selectedOrigin?.name ?? "No origin"}</div>
              <div>Location: {selectedLocation?.name ?? "No location"}</div>
              <div>Scanned by: {scannedByName}</div>
              <div>Batch: {batchNo}</div>
              <div>Started: {new Date(sessionStartedAt).toLocaleString()}</div>
              <div>Finished: {new Date(sessionFinishedAt).toLocaleString()}</div>
            </div>
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Session finished. Normal workers can no longer undo scans here;
              ask a manager or admin to correct stock if something is wrong.
            </div>
            <Button
              type="button"
              className="mt-3"
              variant="outline"
              onClick={() => {
                setRecentLabels([])
                setSessionErrors([])
                setSessionStartedAt(new Date().toISOString())
                setSessionFinishedAt(null)
                setBatchNo(generateInboundBatchNo())
                setBarcode("")
                setNetWeightKg("")
                setDecodeMessage("")
                setDecodeStatus("")
              }}
            >
              New inbound session
            </Button>
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
                <div key={entry.id} className="text-sm text-red-900">
                  <span className="font-mono">{entry.barcode}</span> -{" "}
                  {entry.message} ({new Date(entry.time).toLocaleTimeString()})
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <StockLabelPrintArea labels={activePrintLabels} />
      </CardContent>
    </Card>
  )
}

function stockUnitLabel(unit: StockUnit, items: Item[]) {
  const item = items.find((candidate) => candidate.id === unit.itemId)

  if (!item) {
    return "Unknown item"
  }

  return `${item.category} / ${item.section} / ${item.name}`
}

export function OutboundSalesForm({
  orders,
  orderItems,
  outlets,
  locations,
  units,
  items,
}: {
  orders: CustomerOrder[]
  orderItems: CustomerOrderItem[]
  outlets: StockOutlet[]
  locations: StockLocation[]
  units: StockUnit[]
  items: Item[]
}) {
  const availableOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "READY_FOR_PICKUP" ||
          order.status === "READY_FOR_DELIVERY"
      ),
    [orders]
  )
  const [orderId, setOrderId] = useState("")
  const [outboundMode, setOutboundMode] = useState<"ORDER" | "DIRECT">("ORDER")
  const [outboundType, setOutboundType] = useState("SALES")
  const [damageReason, setDamageReason] =
    useState<StockDamageReason>("expired")
  const [toLocationId, setToLocationId] = useState("")
  const [barcode, setBarcode] = useState("")
  const [barcodes, setBarcodes] = useState<string[]>([])
  const [confirmSubstitution, setConfirmSubstitution] = useState(false)
  const [scanError, setScanError] = useState("")
  const isOnline = useOnlineStatus()
  const confirmOutboundFormAction: StatefulAction = async (
    previousState,
    formData
  ) => {
    const result =
      outboundMode === "ORDER"
        ? await confirmOrderOutboundAction(previousState, formData)
        : await confirmDirectOutboundAction(previousState, formData)

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
  const totalWeightKg = scannedUnits.reduce(
    (sum, row) => sum + (row.unit?.netWeightKg ?? 0),
    0
  )
  const selectedOrderId = availableOrders.some((order) => order.id === orderId)
    ? orderId
    : ""
  const selectedOrderItems = orderItems.filter(
    (item) => item.orderId === selectedOrderId
  )
  const orderedItemIds = new Set(selectedOrderItems.map((item) => item.itemId))
  const requestedQuantity = selectedOrderItems.reduce(
    (sum, item) => sum + item.requestedQuantity,
    0
  )
  const requestedWeightKg = selectedOrderItems.reduce(
    (sum, item) => sum + item.requestedWeightKg,
    0
  )
  const knownScannedUnits = scannedUnits
    .map((row) => row.unit)
    .filter((unit): unit is StockUnit => Boolean(unit))
  const missingScannedBarcodes = scannedUnits
    .filter((row) => !row.unit)
    .map((row) => row.barcode)
  const blockedScannedUnits = knownScannedUnits
    .map((unit) => ({
      barcode: unit.barcode,
      reason: outboundUnitBlockReason(unit),
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
  const substitutionUnits = knownScannedUnits.filter(
    (unit) => !orderedItemIds.has(unit.itemId)
  )
  const orderChecklistRows = selectedOrderItems.map((item) => {
    const scannedForItem = knownScannedUnits.filter(
      (unit) => unit.itemId === item.itemId
    )
    const scannedWeightKg = scannedForItem.reduce(
      (sum, unit) => sum + unit.netWeightKg,
      0
    )

    return {
      item,
      scannedQuantity: scannedForItem.length,
      scannedWeightKg,
      quantityDifference: scannedForItem.length - item.requestedQuantity,
      weightDifferenceKg: scannedWeightKg - item.requestedWeightKg,
    }
  })
  const scannedQuantityDifference = knownScannedUnits.length - requestedQuantity
  const scannedWeightDifference = totalWeightKg - requestedWeightKg
  const showOrderScanWarning =
    outboundMode === "ORDER" &&
    Boolean(selectedOrderId) &&
    barcodes.length > 0 &&
    (Math.abs(scannedQuantityDifference) > 0 ||
      Math.abs(scannedWeightDifference) > 0.001 ||
      substitutionUnits.length > 0)
  const confirmDisabled =
    !isOnline ||
    (outboundMode === "ORDER" && !selectedOrderId) ||
    barcodes.length === 0 ||
    (outboundType === "TRANSFER" && !toLocationId) ||
    missingScannedBarcodes.length > 0 ||
    blockedScannedUnits.length > 0 ||
    sameDestinationTransferUnits.length > 0 ||
    (outboundMode === "ORDER" &&
      substitutionUnits.length > 0 &&
      !confirmSubstitution)
  const outboundModeOptions: {
    value: "ORDER" | "DIRECT"
    label: string
    hint: string
  }[] = [
    {
      value: "ORDER",
      label: "Order outbound",
      hint: "Pick order first",
    },
    {
      value: "DIRECT",
      label: "Direct outbound",
      hint: "Worker allowed",
    },
  ]
  const orderOutboundOptions = [
    { value: "SALES", label: "Sales", hint: "For ready order" },
    { value: "TRANSFER", label: "Transfer", hint: "Needs destination" },
    { value: "PROCESSING", label: "Processing", hint: "Reduce now" },
  ]
  const directOutboundOptions = [
    { value: "SALES", label: "Sales", hint: "No customer name" },
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
  const outboundTypeOptions =
    outboundMode === "ORDER" ? orderOutboundOptions : directOutboundOptions
  const activeOutboundType =
    outboundTypeOptions.find((option) => option.value === outboundType) ??
    {
      label: outboundType.replaceAll("_", " "),
      hint: "Check type",
    }
  const confirmDisabledMessage =
    !isOnline
      ? offlineScanMessage
      : outboundMode === "ORDER" && !selectedOrderId
        ? "Select order first."
        : barcodes.length === 0
          ? "Scan at least one barcode."
          : outboundType === "TRANSFER" && !toLocationId
            ? "Choose destination stock location."
            : missingScannedBarcodes.length > 0
              ? "Remove barcode not found."
              : blockedScannedUnits.length > 0
                ? "Remove blocked barcode."
                : sameDestinationTransferUnits.length > 0
                  ? "Choose another destination."
                  : outboundMode === "ORDER" &&
                      substitutionUnits.length > 0 &&
                      !confirmSubstitution
                    ? "Confirm substitution."
                    : ""

  function addBarcode(value = barcode) {
    const nextBarcode = value.trim()

    setScanError("")

    if (!isOnline) {
      setScanError(offlineScanMessage)
      return
    }

    if (!nextBarcode) {
      setScanError("Enter or scan a barcode first.")
      return
    }

    if (barcodes.includes(nextBarcode)) {
      setScanError("This barcode is already in the outbound batch.")
      return
    }

    setBarcodes((current) => [...current, nextBarcode])
    setBarcode("")
  }

  function removeBarcode(value: string) {
    setBarcodes((current) => current.filter((item) => item !== value))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outbound scan</CardTitle>
        <CardDescription>
          Select the job, scan barcodes, then confirm.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="barcodesJson" value={JSON.stringify(barcodes)} />
          <input type="hidden" name="outboundMode" value={outboundMode} />
          <input type="hidden" name="outboundType" value={outboundType} />
          {outboundMode === "ORDER" ? (
            <input
              type="hidden"
              name="confirmSubstitution"
              value={confirmSubstitution ? "true" : "false"}
            />
          ) : null}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Outbound job</div>
              <div className="grid gap-2 min-[390px]:grid-cols-2">
                {outboundModeOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      outboundMode === option.value ? "default" : "outline"
                    }
                    className="h-auto min-h-14 justify-start whitespace-normal py-3 text-left"
                    aria-pressed={outboundMode === option.value}
                    onClick={() => {
                      setOutboundMode(option.value)
                      setOutboundType("SALES")
                      setConfirmSubstitution(false)
                      setScanError("")
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
                    className="h-auto min-h-14 justify-start whitespace-normal py-3 text-left"
                    aria-pressed={outboundType === option.value}
                    onClick={() => {
                      setOutboundType(option.value)
                      setScanError("")
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
              {outboundMode === "ORDER"
                ? "Order outbound: select a ready order before scanning."
                : `${activeOutboundType.label}: ${activeOutboundType.hint}.`}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
            {outboundMode === "ORDER" ? (
              <div className="space-y-2">
                <Label htmlFor="orderId">Customer order</Label>
                <NativeSelect
                  id="orderId"
                  name="orderId"
                  value={selectedOrderId}
                  onChange={setOrderId}
                >
                  <option value="">Select order</option>
                  {availableOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.orderNo} - {order.customerName} - {order.status}
                    </option>
                  ))}
                </NativeSelect>
                {availableOrders.length === 0 ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    No ready orders yet.
                  </p>
                ) : null}
                {availableOrders.length > 0 && !selectedOrderId ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Select order first.
                  </p>
                ) : null}
              </div>
            ) : (
              <input type="hidden" name="orderId" value="" />
            )}
            {outboundType === "TRANSFER" ? (
              <div className="space-y-2">
                <Label htmlFor="toLocationId">Destination stock location</Label>
                <DestinationOutletSelect
                  outlets={outlets}
                  locations={locations}
                  id="toOutletId"
                  name="toLocationId"
                  value={toLocationId}
                  onChange={setToLocationId}
                />
              </div>
            ) : (
              <input type="hidden" name="toLocationId" value="" />
            )}
            {outboundMode === "DIRECT" && outboundType === "DAMAGE_SPOILAGE" ? (
              <>
                <DamageReasonButtons
                  name="damageReason"
                  value={damageReason}
                  onChange={setDamageReason}
                />
                <div className="space-y-2">
                  <Label htmlFor="damagePhotoPath">Damage photo</Label>
                  <Input
                    id="damagePhotoPath"
                    name="damagePhotoPath"
                    placeholder="Photo reference"
                  />
                  <p className="text-sm text-amber-700">
                    Photo required. Stock goes to approval.
                  </p>
                </div>
              </>
            ) : null}
            {outboundMode === "DIRECT" && outboundType === "RETURN_SUPPLIER" ? (
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier name</Label>
                <Input id="supplierName" name="supplierName" />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="referenceNo">Reference no.</Label>
              <Input id="referenceNo" name="referenceNo" placeholder="ORDER / INV / TRF" />
            </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <BarcodeField
              id="batchBarcode"
              name="barcodeEntry"
              label="Barcode"
              value={barcode}
              onChange={setBarcode}
              onScan={(value) => addBarcode(value)}
              continuousScan
              placeholder="EM-BC-000001"
              disabled={!isOnline}
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full md:w-auto"
                disabled={!isOnline}
                onClick={() => addBarcode()}
              >
                Add barcode
              </Button>
            </div>
          </div>

          {!isOnline ? (
            <OfflineScanAlert />
          ) : null}
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-3">
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

          {scanError ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {scanError}
            </div>
          ) : null}
          {confirmDisabled && isOnline ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {confirmDisabledMessage}
            </div>
          ) : null}
          {missingScannedBarcodes.length > 0 ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <div className="font-medium">Barcode not found</div>
              <div className="mt-1">
                Remove it or check the label.
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
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <div className="font-medium">Blocked barcode</div>
              <div className="mt-1">Remove blocked scans.</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {blockedScannedUnits.map((row) => (
                  <li key={row.barcode}>{row.reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {sameDestinationTransferUnits.length > 0 ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <div className="font-medium">Wrong destination</div>
              <div className="mt-1">Choose another destination or remove it.</div>
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
          {showOrderScanWarning ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div className="font-medium">Check before confirm</div>
              <div className="mt-1">Weight difference is allowed.</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  Requested: {requestedQuantity.toLocaleString()} unit
                  {requestedQuantity === 1 ? "" : "s"} /{" "}
                  {requestedWeightKg.toFixed(3)} kg
                </div>
                <div>
                  Scanned: {knownScannedUnits.length.toLocaleString()} unit
                  {knownScannedUnits.length === 1 ? "" : "s"} /{" "}
                  {totalWeightKg.toFixed(3)} kg
                </div>
              </div>
              {substitutionUnits.length > 0 ? (
                <div className="mt-2">
                  Substitution scanned:{" "}
                  {substitutionUnits
                    .map((unit) => stockUnitLabel(unit, items))
                    .join(", ")}
                  <label className="mt-2 flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={confirmSubstitution}
                      onChange={(event) =>
                        setConfirmSubstitution(event.target.checked)
                      }
                    />
                    <span>
                      Confirm substitution. No reason needed.
                    </span>
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          {outboundMode === "ORDER" && selectedOrderId ? (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="font-medium">Order item checklist</div>
              <div className="space-y-2">
                {orderChecklistRows.map((row) => (
                  <div
                    key={row.item.id}
                    className="grid gap-1 rounded-md bg-muted/30 p-2 text-sm sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {row.item.itemLabel}
                      </div>
                      <div className="text-muted-foreground">
                        Required {row.item.requestedQuantity.toLocaleString()}{" "}
                        unit{row.item.requestedQuantity === 1 ? "" : "s"} /{" "}
                        {row.item.requestedWeightKg.toFixed(3)} kg
                      </div>
                    </div>
                    <div className="text-left tabular-nums sm:text-right">
                      <div>
                        Scanned {row.scannedQuantity.toLocaleString()} unit
                        {row.scannedQuantity === 1 ? "" : "s"} /{" "}
                        {row.scannedWeightKg.toFixed(3)} kg
                      </div>
                      <div
                        className={
                          Math.abs(row.quantityDifference) > 0 ||
                          Math.abs(row.weightDifferenceKg) > 0.001
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }
                      >
                        Difference {row.quantityDifference.toLocaleString()} /{" "}
                        {row.weightDifferenceKg.toFixed(3)} kg
                      </div>
                    </div>
                  </div>
                ))}
                {substitutionUnits.length > 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                    Confirm substitution before final confirm.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Scanned list</Label>
            {scannedUnits.length > 0 ? (
              <div className="space-y-2">
                {scannedUnits.map((row) => (
                  <div
                    key={row.barcode}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{row.barcode}</div>
                      <div className="text-sm text-muted-foreground">
                        {row.unit
                          ? `${stockUnitLabel(row.unit, items)} - ${row.unit.netWeightKg.toFixed(3)} kg`
                          : "Not found"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeBarcode(row.barcode)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No barcodes scanned yet.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              required={outboundMode === "DIRECT"}
              placeholder={
                outboundMode === "DIRECT"
                  ? "Required for direct outbound"
                  : undefined
              }
            />
          </div>

          <ActionMessage state={state} />
          <SubmitButton pending={pending} disabled={confirmDisabled}>
            Confirm outbound batch
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

export function TransferForm({
  outlets,
  locations,
}: {
  outlets: StockOutlet[]
  locations: StockLocation[]
}) {
  const [barcode, setBarcode] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [state, formAction, pending] = useActionState(
    transferAction,
    initialStockActionState
  )
  const isOnline = useOnlineStatus()
  const transferBlocked = !isOnline || !toLocationId || !barcode.trim()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer stock</CardTitle>
        <CardDescription>
          Choose destination stock location, scan barcode, then send.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toOutletId">Destination stock location</Label>
            <DestinationOutletSelect
              outlets={outlets}
              locations={locations}
              id="toOutletId"
              name="toLocationId"
              value={toLocationId}
              onChange={setToLocationId}
            />
          </div>

          <BarcodeField
            id="barcode"
            name="barcode"
            label="Barcode"
            value={barcode}
            onChange={setBarcode}
            onScan={setBarcode}
            placeholder="Scan transfer barcode"
            disabled={!isOnline}
          />

          {!isOnline ? (
            <OfflineScanAlert />
          ) : null}

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Location changes only after receive scan.
          </div>

          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Reference and notes
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference no.</Label>
                <Input id="referenceNo" name="referenceNo" placeholder="TRF-2031" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
            </div>
          </details>

          {transferBlocked && isOnline ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Choose destination stock location and scan barcode.
            </div>
          ) : null}
          <ActionMessage state={state} />
          <SubmitButton
            pending={pending}
            disabled={transferBlocked}
            className="h-12 w-full"
          >
            Send transfer
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

export function ReceiveTransferForm({
  outlets,
  locations,
}: {
  outlets: StockOutlet[]
  locations: StockLocation[]
}) {
  const [barcode, setBarcode] = useState("")
  const [receiveLocationId, setReceiveLocationId] = useState("")
  const [state, formAction, pending] = useActionState(
    receiveTransferAction,
    initialStockActionState
  )
  const isOnline = useOnlineStatus()
  const receiveBlocked = !isOnline || !receiveLocationId || !barcode.trim()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receive transfer</CardTitle>
        <CardDescription>
          Select receiving location, scan barcode, then receive.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receiveOutletId">Receiving stock location</Label>
            <DestinationOutletSelect
              outlets={outlets}
              locations={locations}
              id="receiveOutletId"
              name="receiveLocationId"
              value={receiveLocationId}
              onChange={setReceiveLocationId}
            />
          </div>

          <BarcodeField
            id="barcode"
            name="barcode"
            label="Barcode"
            value={barcode}
            onChange={setBarcode}
            onScan={setBarcode}
            placeholder="Scan transfer barcode"
            disabled={!isOnline}
          />

          {!isOnline ? (
            <OfflineScanAlert />
          ) : null}

          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Wrong location is blocked.
          </div>

          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Reference and notes
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference no.</Label>
                <Input id="referenceNo" name="referenceNo" placeholder="TRF-2031" />
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

export function ReturnForm({ locations }: { locations: StockLocation[] }) {
  const [barcode, setBarcode] = useState("")
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "")
  const [state, formAction, pending] = useActionState(
    returnStockAction,
    initialStockActionState
  )
  const isOnline = useOnlineStatus()
  const returnBlocked = !isOnline || !barcode.trim() || !locationId

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock return</CardTitle>
        <CardDescription>
          Scan barcode, choose return location, then save.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <BarcodeField
            id="barcode"
            name="barcode"
            label="Barcode"
            value={barcode}
            onChange={setBarcode}
            onScan={setBarcode}
            placeholder="Scan return barcode"
            disabled={!isOnline}
          />
          <div className="space-y-2">
            <Label htmlFor="locationId">Return location</Label>
            <LocationSelect
              locations={locations}
              value={locationId}
              onChange={setLocationId}
            />
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Customer returns may need inspection before normal outbound.
          </div>
          {!isOnline ? (
            <OfflineScanAlert />
          ) : null}
          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Reference and notes
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference no.</Label>
                <Input id="referenceNo" name="referenceNo" placeholder="RET-5501" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
            </div>
          </details>
          {returnBlocked && isOnline ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Scan barcode and choose location.
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
          <form action={createAction} className="space-y-4">
            <BarcodeField
              id="damageBarcode"
              name="barcode"
              label="Barcode"
              value={barcode}
              onChange={setBarcode}
              onScan={setBarcode}
              placeholder="Scan damaged barcode"
              disabled={!isOnline}
            />
            <div className="grid gap-3 min-[390px]:grid-cols-2">
              <DamageReasonButtons
                name="reason"
                value={reason}
                onChange={setReason}
              />
              <div className="space-y-2">
                <Label htmlFor="photoPath">Photo reference</Label>
                <Input
                  id="photoPath"
                  name="photoPath"
                  value={photoPath}
                  required
                  onChange={(event) => setPhotoPath(event.target.value)}
                  placeholder="Photo is required"
                />
              </div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Photo required. Request only; stock is not deducted now.
            </div>
            {!isOnline ? (
              <OfflineScanAlert />
            ) : null}
            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Notes
              </summary>
              <div className="mt-3 space-y-2">
                <Label htmlFor="damageNotes">Notes</Label>
                <Textarea id="damageNotes" name="notes" />
              </div>
            </details>
            {damageBlocked && isOnline ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Scan barcode and add photo reference.
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
  const returnSupplierBlocked =
    !isOnline || !barcode.trim() || !supplierName.trim()

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
          <form action={createAction} className="space-y-4">
            <BarcodeField
              id="returnSupplierBarcode"
              name="barcode"
              label="Barcode"
              value={barcode}
              onChange={setBarcode}
              onScan={setBarcode}
              placeholder="Scan supplier return barcode"
              disabled={!isOnline}
            />
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier</Label>
              <Input
                id="supplierName"
                name="supplierName"
                value={supplierName}
                required
                onChange={(event) => setSupplierName(event.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Stock goes on supplier hold until manager approval.
            </div>
            {!isOnline ? (
              <OfflineScanAlert />
            ) : null}
            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Notes
              </summary>
              <div className="mt-3 space-y-2">
                <Label htmlFor="returnSupplierNotes">Notes</Label>
                <Textarea id="returnSupplierNotes" name="notes" />
              </div>
            </details>
            {returnSupplierBlocked && isOnline ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Scan barcode and add supplier.
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
          internal barcode label, attach it to the item, then save it through
          Barcode Inbound.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          New loose no-barcode balances are disabled. Legacy no-barcode records
          remain visible in reports for compatibility.
        </div>
        <Button asChild>
          <a href="/stock/inbound">Open Barcode Inbound</a>
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
      <Badge variant={session.status === "APPROVED" ? "success" : "outline"}>
        {session.status}
      </Badge>
      {canOperate ? (
        <form action={submitAction}>
          <input type="hidden" name="sessionId" value={session.id} />
          <Button
            type="submit"
            variant="outline"
            className="h-11 w-full"
            disabled={submitPending || session.status !== "DRAFT"}
          >
            Submit
          </Button>
        </form>
      ) : null}
      {canManage ? (
        <>
          <form action={reviewAction}>
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
          <form action={rejectAction}>
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
          <form action={approveAction}>
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
          <form action={rejectAction}>
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
  sessions,
  lines,
  canOperate,
  canManage,
  canDirectorApprove,
}: {
  items: Item[]
  brands: Brand[]
  locations: StockLocation[]
  sessions: StockTakeSession[]
  lines: StockTakeLine[]
  canOperate: boolean
  canManage: boolean
  canDirectorApprove: boolean
}) {
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id ?? "")
  const [scanBarcode, setScanBarcode] = useState("")
  const [localScanMessage, setLocalScanMessage] = useState("")
  const isOnline = useOnlineStatus()
  const scanFormRef = useRef<HTMLFormElement | null>(null)
  const [scanState, scanAction, scanPending] = useActionState(
    scanStockTakeBarcodeAction,
    initialStockActionState
  )
  const selectedSession = sessions.find(
    (session) => session.id === selectedSessionId
  )
  const selectedSessionLines = lines.filter(
    (line) => line.sessionId === selectedSessionId
  )
  const activeScanSessions = sessions.filter(
    (session) => session.status === "DRAFT"
  )
  const scannedCount = selectedSessionLines.reduce(
    (sum, line) => sum + line.actualCount,
    0
  )
  const expectedCount = selectedSessionLines.reduce(
    (sum, line) => sum + line.systemCount,
    0
  )
  const scannedWeightKg = selectedSessionLines.reduce(
    (sum, line) => sum + line.actualWeightKg,
    0
  )
  const expectedWeightKg = selectedSessionLines.reduce(
    (sum, line) => sum + line.systemWeightKg,
    0
  )
  const selectedSessionItem = items.find(
    (item) => item.id === selectedSession?.itemId
  )
  const selectedSessionBrand = brands.find(
    (brand) => brand.id === selectedSession?.brandId
  )
  const stockTakeScanBlocked =
    !isOnline || !selectedSessionId || !scanBarcode.trim()
  const stockTakeScanBlockMessage = !isOnline
    ? offlineScanMessage
    : !selectedSessionId
      ? "Select stock take session."
      : !scanBarcode.trim()
        ? "Scan barcode."
        : ""

  function scanStockTakeBarcode(value: string) {
    setScanBarcode(value)

    if (!isOnline) {
      setLocalScanMessage(offlineScanMessage)
      return
    }

    setLocalScanMessage("")
    window.setTimeout(() => scanFormRef.current?.requestSubmit(), 0)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      {canOperate ? (
        <WorkflowCard
          title="Create stock take session"
          description="Choose one location, item, and brand. Then scan only barcodes for that scope."
          action={createStockTakeSessionAction}
          submitLabel="Start stock take"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="locationId">Location</Label>
              <LocationSelect locations={locations} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockTakeCreateItemId">Item</Label>
              <ItemSelect items={items} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand</Label>
              <BrandSelect brands={brands} />
            </div>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Stock take is active for this item/brand/location. You can
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
                <div className="grid gap-2 min-[390px]:grid-cols-2">
                  {activeScanSessions.slice(0, 4).map((session) => {
                    const scopedItem = items.find(
                      (item) => item.id === session.itemId
                    )
                    const scopedBrand = brands.find(
                      (brand) => brand.id === session.brandId
                    )
                    const isSelected = session.id === selectedSessionId

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className={[
                          "min-h-16 rounded-md border px-3 py-2 text-left text-sm transition",
                          isSelected
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : "border-input bg-background hover:bg-muted",
                        ].join(" ")}
                      >
                        <span className="block font-semibold">
                          {scopedBrand?.name ?? "No brand"}{" "}
                          {scopedItem?.name ?? "No item"}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {session.locationName} - {session.sessionNo}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Start a stock take above, then scan.
                </div>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scanSessionId">Session</Label>
                <NativeSelect
                  id="scanSessionId"
                  name="sessionId"
                  value={selectedSessionId}
                  onChange={setSelectedSessionId}
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
                id="stockTakeBarcode"
                name="barcode"
                label="Barcode"
                value={scanBarcode}
                onChange={setScanBarcode}
                onScan={scanStockTakeBarcode}
                continuousScan
                disabled={!isOnline}
                placeholder="EM-BC-000001"
              />
            </div>
            {selectedSession ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="font-medium">Counting scope</div>
                <div className="mt-1 text-muted-foreground">
                  {selectedSession.locationName} -{" "}
                  {selectedSessionItem?.name ?? "No item"} -{" "}
                  {selectedSessionBrand?.name ?? "No brand"}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Barcode progress
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {scannedCount}/{expectedCount || "?"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedSession.sessionNo}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Weight progress
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {scannedWeightKg.toFixed(2)}kg/
                    {expectedWeightKg > 0
                      ? `${expectedWeightKg.toFixed(2)}kg`
                      : "?"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Unknown barcode becomes exception.
                  </div>
                </div>
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Barcode-only count.
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Wrong item/brand blocked.
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Unknown barcode is exception.
              </div>
            </div>
            {localScanMessage ? (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
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
              <div
                key={session.id}
                className="rounded-lg border p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-semibold">{session.sessionNo}</div>
                    <div className="text-sm text-muted-foreground">
                      {session.locationName} -{" "}
                      {scopedItem
                        ? `${scopedItem.category} / ${scopedItem.section} / ${scopedItem.name}`
                        : "No item scope"}{" "}
                      - {scopedBrand?.name ?? "No brand"} -{" "}
                      {sessionLines.length} lines -{" "}
                      {varianceWeight.toFixed(2)} kg variance
                    </div>
                    {exceptionLines.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {exceptionLines.slice(0, 4).map((line) => (
                          <Badge key={line.id} variant="secondary">
                            {line.exceptionType?.replaceAll("_", " ")}:{" "}
                            {line.barcode ?? "No barcode"} (
                            {line.exceptionStatus ?? "PENDING"})
                          </Badge>
                        ))}
                        {exceptionLines.length > 4 ? (
                          <Badge variant="outline">
                            +{exceptionLines.length - 4} more exceptions
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-1 text-xs text-muted-foreground">
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
