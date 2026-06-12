"use client"

import { Save } from "lucide-react"
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  addStockTakeLineAction,
  approveStockTakeAction,
  barcodeInboundAction,
  confirmOrderOutboundAction,
  createBrandAction,
  createItemAction,
  createLocationAction,
  createOriginAction,
  createStockTakeSessionAction,
  noBarcodeInboundAction,
  receiveTransferAction,
  rejectStockTakeAction,
  returnStockAction,
  reviewStockTakeAction,
  scanStockTakeBarcodeAction,
  submitStockTakeAction,
  transferAction,
  updateItemAction,
} from "@/lib/stock/actions"
import {
  initialStockActionState,
  type StockActionState,
} from "@/lib/stock/action-state"
import type {
  Brand,
  BarcodeWeightRule,
  Item,
  Origin,
  StockBalanceRow,
  StockLocation,
  StockTakeLine,
  StockTakeSession,
  StockUnit,
} from "@/lib/stock/types"
import type { CustomerOrder } from "@/lib/orders/types"
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
import { Badge } from "@/components/ui/badge"
import { BarcodeField } from "@/components/stock/barcode-scanner"
import { decodeBarcodeWeight } from "@/lib/stock/barcode-weight"

type StatefulAction = (
  state: StockActionState,
  formData: FormData
) => Promise<StockActionState>

function ActionMessage({ state }: { state: StockActionState }) {
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
  value,
  onChange,
  required = true,
}: {
  id: string
  name: string
  children: ReactNode
  value?: string
  onChange?: (value: string) => void
  required?: boolean
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      required={required}
      onChange={(event) => onChange?.(event.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
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
    <Button type="submit" disabled={pending || disabled}>
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
}: {
  items: Item[]
  value?: string
  onChange?: (value: string) => void
}) {
  const activeItems = items.filter((item) => item.active)

  return (
    <NativeSelect id="itemId" name="itemId" value={value} onChange={onChange}>
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
}: {
  brands: Brand[]
  value?: string
  onChange?: (value: string) => void
}) {
  const activeBrands = brands.filter((brand) => brand.active)

  return (
    <NativeSelect
      id="brandId"
      name="brandId"
      value={value}
      onChange={onChange}
      required={false}
    >
      <option value="">No brand</option>
      {activeBrands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function OriginSelect({
  origins,
  value,
  onChange,
}: {
  origins: Origin[]
  value?: string
  onChange?: (value: string) => void
}) {
  const activeOrigins = origins.filter((origin) => origin.active)

  return (
    <NativeSelect
      id="originId"
      name="originId"
      value={value}
      onChange={onChange}
      required={false}
    >
      <option value="">No origin</option>
      {activeOrigins.map((origin) => (
        <option key={origin.id} value={origin.id}>
          {origin.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function LocationSelect({
  locations,
  id = "locationId",
  name = "locationId",
  value,
  onChange,
}: {
  locations: StockLocation[]
  id?: string
  name?: string
  value?: string
  onChange?: (value: string) => void
}) {
  const activeLocations = locations.filter((location) => location.active)

  return (
    <NativeSelect id={id} name={name} value={value} onChange={onChange}>
      <option value="">Select location</option>
      {activeLocations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function generatedItemCode(category: string, section: string, name: string) {
  return [category, section, name]
    .map((part) =>
      part
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean)
    .join("-")
}

export function ItemMasterForm({ items }: { items: Item[] }) {
  const [category, setCategory] = useState("MEAT")
  const [section, setSection] = useState("")
  const [name, setName] = useState("")
  const [itemCode, setItemCode] = useState("")
  const [itemCodeEdited, setItemCodeEdited] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "")
  const createItemFormAction: StatefulAction = async (
    previousState,
    formData
  ) => {
    const result = await createItemAction(previousState, formData)

    if (result.status === "success" && result.message === "Item created.") {
      setSection("")
      setName("")
      setItemCode("")
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
    itemCode.trim().length >= 2 &&
    section.trim().length >= 2 &&
    name.trim().length >= 2
  const canUpdateItem = Boolean(selectedItem)

  function updateGeneratedCode(next: {
    category?: string
    section?: string
    name?: string
  }) {
    const nextCategory = next.category ?? category
    const nextSection = next.section ?? section
    const nextName = next.name ?? name

    if (!itemCodeEdited) {
      setItemCode(generatedItemCode(nextCategory, nextSection, nextName))
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create item</CardTitle>
          <CardDescription>
            Item code is generated from category, section, and name until edited.
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
                  placeholder="MEAT-BELLY-BONELESS"
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
                    updateGeneratedCode({ category: value })
                  }}
                >
                  <option value="MEAT">MEAT</option>
                  <option value="ORGANS">ORGANS</option>
                  <option value="PROCESSED">PROCESSED</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  name="section"
                  value={section}
                  required
                  onChange={(event) => {
                    setSection(event.target.value)
                    updateGeneratedCode({ section: event.target.value })
                  }}
                  placeholder="BELLY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  required
                  onChange={(event) => {
                    setName(event.target.value)
                    updateGeneratedCode({ name: event.target.value })
                  }}
                  placeholder="BONELESS"
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
                Enter section, name, and item code before creating the item.
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
                  <Label htmlFor="editSection">Section</Label>
                  <Input
                    id="editSection"
                    name="section"
                    defaultValue={selectedItem.section}
                    required
                    key={`${selectedItem.id}-section`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editName">Name</Label>
                  <Input
                    id="editName"
                    name="name"
                    defaultValue={selectedItem.name}
                    required
                    key={`${selectedItem.id}-name`}
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
  inboundSource: "supplier_import" | "processing_output" | "return" | "transfer"
  barcodeWeightStart: string
  barcodeWeightLength: string
  barcodeWeightDecimals: string
  fixedWeightKg: string
  autoSave: boolean
  saveWeightRule: boolean
}

const inboundPresetKey = "elite-meat:stock-inbound-preset"
const inboundScopeKeys: (keyof InboundPreset)[] = [
  "itemId",
  "brandId",
  "originId",
  "locationId",
]

function initialInboundPreset(
  items: Item[] = [],
  locations: StockLocation[] = [],
  brands: Brand[] = [],
  origins: Origin[] = []
): InboundPreset {
  const activeItem = items.find((item) => item.active)
  const activeLocation = locations.find((location) => location.active)
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
    autoSave: false,
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
  const matchingRule = barcodeWeightRules.find(
    (rule) =>
      rule.itemId === preset.itemId &&
      (rule.brandId ?? "") === preset.brandId &&
      (rule.originId ?? "") === preset.originId &&
      rule.locationId === preset.locationId
  )

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

export function BarcodeInboundForm({
  items = [],
  brands = [],
  origins = [],
  locations = [],
  barcodeWeightRules = [],
}: {
  items: Item[]
  brands: Brand[]
  origins: Origin[]
  locations: StockLocation[]
  barcodeWeightRules: BarcodeWeightRule[]
}) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement | null>(null)
  const [state, formAction, pending] = useActionState(
    barcodeInboundAction,
    initialStockActionState
  )
  const [barcode, setBarcode] = useState("")
  const [preset, setPreset] = useState(() =>
    initialInboundPreset(items, locations, brands, origins)
  )
  const [netWeightKg, setNetWeightKg] = useState("")
  const [decodeMessage, setDecodeMessage] = useState("")
  const [decodeStatus, setDecodeStatus] = useState<
    "success" | "warning" | "error" | ""
  >("")

  useEffect(() => {
    try {
      window.localStorage.setItem(inboundPresetKey, JSON.stringify(preset))
    } catch {
      // Ignore unavailable storage, for example private browsing.
    }
  }, [preset])

  useEffect(() => {
    if (state.status !== "success") {
      return
    }

    window.setTimeout(() => {
      setBarcode("")
      barcodeInputRef.current?.focus()
    }, 0)
  }, [state.status, state.message])

  function updatePreset<K extends keyof InboundPreset>(
    key: K,
    value: InboundPreset[K]
  ) {
    setPreset((current) => {
      const next = { ...current, [key]: value }
      return inboundScopeKeys.includes(key)
        ? applyMatchingWeightRule(next, barcodeWeightRules)
        : next
    })
  }

  function handleBarcodeChange(value: string, submitAfterScan = false) {
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

    const readyToSubmit =
      submitAfterScan &&
      preset.autoSave &&
      preset.itemId &&
      preset.locationId &&
      value &&
      decoded.status === "decoded"

    if (readyToSubmit) {
      window.setTimeout(() => formRef.current?.requestSubmit(), 0)
    }
  }

  const selectedItem = items.find((item) => item.id === preset.itemId)
  const selectedBrand = brands.find((brand) => brand.id === preset.brandId)
  const selectedOrigin = origins.find((origin) => origin.id === preset.originId)
  const selectedLocation = locations.find(
    (location) => location.id === preset.locationId
  )

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
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <BarcodeField
                inputRef={barcodeInputRef}
                id="barcode"
                name="barcode"
                label="Barcode"
                value={barcode}
                onChange={(value) => handleBarcodeChange(value)}
                onScan={(value) => handleBarcodeChange(value, true)}
                placeholder="Scan or type barcode"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemId">Product</Label>
              <ItemSelect
                items={items}
                value={preset.itemId}
                onChange={(value) => updatePreset("itemId", value)}
              />
            </div>
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
              >
                <option value="supplier_import">Supplier / import</option>
                <option value="processing_output">Processing output</option>
                <option value="return">Return</option>
                <option value="transfer">Transfer</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand</Label>
              <BrandSelect
                brands={brands}
                value={preset.brandId}
                onChange={(value) => updatePreset("brandId", value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originId">Origin</Label>
              <OriginSelect
                origins={origins}
                value={preset.originId}
                onChange={(value) => updatePreset("originId", value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationId">Location</Label>
              <LocationSelect
                locations={locations}
                value={preset.locationId}
                onChange={(value) => updatePreset("locationId", value)}
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
              <Input id="batchNo" name="batchNo" placeholder="B240610-A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNo">Reference no.</Label>
              <Input id="referenceNo" name="referenceNo" placeholder="GRN-1001" />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">Current scan preset</div>
            <div className="mt-1 text-muted-foreground">
              {selectedItem
                ? `${selectedItem.category} / ${selectedItem.section} / ${selectedItem.name}`
                : "No product"}{" "}
              - {selectedBrand?.name ?? "No brand"} -{" "}
              {selectedOrigin?.name ?? "No origin"} -{" "}
              {selectedLocation?.name ?? "No location"}
            </div>
          </div>

          {decodeMessage ? (
            <div
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

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
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
              Save weight-position rule
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={preset.autoSave}
                onChange={(event) =>
                  updatePreset("autoSave", event.target.checked)
                }
                className="size-4 rounded border-input"
              />
              Auto-save after camera scan
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <ActionMessage state={state} />
          <SubmitButton pending={pending}>Save inbound</SubmitButton>
        </form>
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
  locations,
  units,
  items,
}: {
  orders: CustomerOrder[]
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
  const [orderId, setOrderId] = useState(availableOrders[0]?.id ?? "")
  const [outboundType, setOutboundType] = useState("SALES")
  const [toLocationId, setToLocationId] = useState("")
  const [barcode, setBarcode] = useState("")
  const [barcodes, setBarcodes] = useState<string[]>([])
  const [scanError, setScanError] = useState("")
  const confirmOutboundFormAction: StatefulAction = async (
    previousState,
    formData
  ) => {
    const result = await confirmOrderOutboundAction(previousState, formData)

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
    : availableOrders[0]?.id ?? ""
  const confirmDisabled =
    !selectedOrderId ||
    barcodes.length === 0 ||
    (outboundType === "TRANSFER" && !toLocationId)

  function addBarcode(value = barcode) {
    const nextBarcode = value.trim()

    setScanError("")

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
        <CardTitle>Order outbound</CardTitle>
        <CardDescription>
          Select a customer order, scan all barcodes, then confirm the outbound type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="barcodesJson" value={JSON.stringify(barcodes)} />
          <div className="grid gap-4 md:grid-cols-2">
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
                <p className="text-sm text-muted-foreground">
                  Mark an order ready before confirming outbound scans.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="outboundType">Outbound type</Label>
              <NativeSelect
                id="outboundType"
                name="outboundType"
                value={outboundType}
                onChange={setOutboundType}
              >
                <option value="SALES">SALES</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SPOILED">SPOILED / DAMAGE</option>
              </NativeSelect>
            </div>
            {outboundType === "TRANSFER" ? (
              <div className="space-y-2">
                <Label htmlFor="toLocationId">Transfer destination</Label>
                <LocationSelect
                  locations={locations}
                  id="toLocationId"
                  name="toLocationId"
                  value={toLocationId}
                  onChange={setToLocationId}
                />
              </div>
            ) : (
              <input type="hidden" name="toLocationId" value="" />
            )}
            <div className="space-y-2">
              <Label htmlFor="referenceNo">Reference no.</Label>
              <Input id="referenceNo" name="referenceNo" placeholder="ORDER / INV / TRF" />
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
              placeholder="EM-BC-000001"
            />
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={() => addBarcode()}>
                Add barcode
              </Button>
            </div>
          </div>

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
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {scanError}
            </div>
          ) : null}
          {confirmDisabled ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Select a ready order, scan at least one barcode, and choose a
              destination for transfer batches before confirming.
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
                          : "Will be checked against database when confirmed"}
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
            <Textarea id="notes" name="notes" />
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

export function TransferForm({ locations }: { locations: StockLocation[] }) {
  const [barcode, setBarcode] = useState("")

  return (
    <WorkflowCard
      title="Create transfer"
      description="Move a barcode unit into transfer pending status."
      action={transferAction}
      submitLabel="Create transfer"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <BarcodeField
          id="barcode"
          name="barcode"
          label="Barcode"
          value={barcode}
          onChange={setBarcode}
          placeholder="EM-LN-000003"
        />
        <div className="space-y-2">
          <Label htmlFor="toLocationId">To location</Label>
          <LocationSelect
            locations={locations}
            id="toLocationId"
            name="toLocationId"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNo">Reference no.</Label>
          <Input id="referenceNo" name="referenceNo" placeholder="TRF-2031" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function ReceiveTransferForm({
  locations,
}: {
  locations: StockLocation[]
}) {
  const [barcode, setBarcode] = useState("")

  return (
    <WorkflowCard
      title="Receive transfer"
      description="Confirm a pending transfer into the receiving location."
      action={receiveTransferAction}
      submitLabel="Receive transfer"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <BarcodeField
          id="barcode"
          name="barcode"
          label="Barcode"
          value={barcode}
          onChange={setBarcode}
          placeholder="EM-LN-000003"
        />
        <div className="space-y-2">
          <Label htmlFor="receiveLocationId">Receive location</Label>
          <LocationSelect
            locations={locations}
            id="receiveLocationId"
            name="receiveLocationId"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNo">Reference no.</Label>
          <Input id="referenceNo" name="referenceNo" placeholder="TRF-2031" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function ReturnForm({ locations }: { locations: StockLocation[] }) {
  const [barcode, setBarcode] = useState("")

  return (
    <WorkflowCard
      title="Stock return"
      description="Return a barcode unit back to a stock location."
      action={returnStockAction}
      submitLabel="Save return"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <BarcodeField
          id="barcode"
          name="barcode"
          label="Barcode"
          value={barcode}
          onChange={setBarcode}
          placeholder="EM-OR-000004"
        />
        <div className="space-y-2">
          <Label htmlFor="locationId">Return location</Label>
          <LocationSelect locations={locations} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNo">Reference no.</Label>
          <Input id="referenceNo" name="referenceNo" placeholder="RET-5501" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function NoBarcodeInboundForm({
  items,
  brands,
  origins,
  locations,
}: {
  items: Item[]
  brands: Brand[]
  origins: Origin[]
  locations: StockLocation[]
}) {
  return (
    <WorkflowCard
      title="No-barcode inbound"
      description="Receive bulk or loose stock by item, quantity, and weight."
      action={noBarcodeInboundAction}
      submitLabel="Save no-barcode inbound"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="itemId">Item</Label>
          <ItemSelect items={items} />
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
          <Label htmlFor="locationId">Location</Label>
          <LocationSelect locations={locations} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" min="0" step="1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weightKg">Weight kg</Label>
          <Input
            id="weightKg"
            name="weightKg"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNo">Reference no.</Label>
          <Input id="referenceNo" name="referenceNo" placeholder="NB-778" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

function StockTakeSessionActions({
  session,
  canOperate,
  canApprove,
}: {
  session: StockTakeSession
  canOperate: boolean
  canApprove: boolean
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
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={session.status === "APPROVED" ? "success" : "outline"}>
        {session.status}
      </Badge>
      {canOperate ? (
        <form action={submitAction}>
          <input type="hidden" name="sessionId" value={session.id} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={submitPending || session.status !== "DRAFT"}
          >
            Submit
          </Button>
        </form>
      ) : null}
      {canApprove ? (
        <>
          <form action={reviewAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={reviewPending || session.status !== "SUBMITTED"}
            >
              Review
            </Button>
          </form>
          <form action={approveAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <Button
              type="submit"
              size="sm"
              disabled={approvePending || session.status !== "REVIEWED"}
            >
              Approve
            </Button>
          </form>
          <form action={rejectAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={
                rejectPending ||
                (session.status !== "SUBMITTED" && session.status !== "REVIEWED")
              }
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
  locations,
  balances,
  sessions,
  lines,
  canOperate,
  canApprove,
}: {
  items: Item[]
  locations: StockLocation[]
  balances: StockBalanceRow[]
  sessions: StockTakeSession[]
  lines: StockTakeLine[]
  canOperate: boolean
  canApprove: boolean
}) {
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id ?? "")
  const [selectedLocationId, setSelectedLocationId] = useState(
    sessions[0]?.locationId ?? locations[0]?.id ?? ""
  )
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "")
  const [scanBarcode, setScanBarcode] = useState("")
  const [actualCount, setActualCount] = useState("0")
  const [actualWeightKg, setActualWeightKg] = useState("0")
  const [scanState, scanAction, scanPending] = useActionState(
    scanStockTakeBarcodeAction,
    initialStockActionState
  )
  const [lineState, lineAction, linePending] = useActionState(
    addStockTakeLineAction,
    initialStockActionState
  )

  const selectedItem = items.find((item) => item.id === selectedItemId)
  const selectedLocation = locations.find(
    (location) => location.id === selectedLocationId
  )
  const system = useMemo(() => {
    if (!selectedItem || !selectedLocation) {
      return { count: 0, weightKg: 0 }
    }

    const itemName = `${selectedItem.category} / ${selectedItem.section} / ${selectedItem.name}`
    const row = balances.find(
      (balance) =>
        balance.itemName === itemName &&
        balance.locationName === selectedLocation.name
    )

    return {
      count: (row?.unitCount ?? 0) + (row?.noBarcodeQuantity ?? 0),
      weightKg: (row?.totalWeightKg ?? 0) + (row?.noBarcodeWeightKg ?? 0),
    }
  }, [balances, selectedItem, selectedLocation])
  const varianceCount = Number(actualCount || 0) - system.count
  const varianceWeight = Number(actualWeightKg || 0) - system.weightKg

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      {canOperate ? (
        <WorkflowCard
          title="Create stock take session"
          description="Open a count session for a selected stock location."
          action={createStockTakeSessionAction}
          submitLabel="Create session"
        >
          <div className="space-y-2">
            <Label htmlFor="locationId">Location</Label>
            <LocationSelect locations={locations} />
          </div>
        </WorkflowCard>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Stock take approval</CardTitle>
            <CardDescription>
              Review submitted sessions below. Counting and scan entry are
              reserved for stock operators.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {canOperate ? (
        <Card>
          <CardHeader>
            <CardTitle>Scan stock take barcode</CardTitle>
            <CardDescription>
              Record a barcode unit against the selected count session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={scanAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scanSessionId">Session</Label>
                <NativeSelect
                  id="scanSessionId"
                  name="sessionId"
                  value={selectedSessionId}
                  onChange={(value) => {
                    const session = sessions.find((item) => item.id === value)
                    setSelectedSessionId(value)
                    setSelectedLocationId(session?.locationId ?? selectedLocationId)
                  }}
                >
                  <option value="">Select session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.sessionNo} - {session.locationName}
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
                placeholder="EM-BC-000001"
              />
            </div>
            <ActionMessage state={scanState} />
            <SubmitButton pending={scanPending}>Record scanned unit</SubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canOperate ? (
        <Card>
          <CardHeader>
            <CardTitle>Add actual stock count</CardTitle>
            <CardDescription>
              Compare system stock against the scanned or counted actual stock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={lineAction} className="space-y-4">
            <input type="hidden" name="systemCount" value={system.count} />
            <input
              type="hidden"
              name="systemWeightKg"
              value={system.weightKg}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sessionId">Session</Label>
                <NativeSelect
                  id="sessionId"
                  name="sessionId"
                  value={selectedSessionId}
                  onChange={(value) => {
                    const session = sessions.find((item) => item.id === value)
                    setSelectedSessionId(value)
                    setSelectedLocationId(session?.locationId ?? selectedLocationId)
                  }}
                >
                  <option value="">Select session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.sessionNo} - {session.locationName}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockTakeItemId">Item</Label>
                <NativeSelect
                  id="stockTakeItemId"
                  name="itemId"
                  value={selectedItemId}
                  onChange={setSelectedItemId}
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.category} / {item.section} / {item.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualCount">Actual count</Label>
                <Input
                  id="actualCount"
                  name="actualCount"
                  type="number"
                  min="0"
                  step="1"
                  value={actualCount}
                  onChange={(event) => setActualCount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualWeightKg">Actual weight kg</Label>
                <Input
                  id="actualWeightKg"
                  name="actualWeightKg"
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualWeightKg}
                  onChange={(event) => setActualWeightKg(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm md:grid-cols-4">
              <div>
                <div className="text-muted-foreground">System count</div>
                <div className="font-semibold tabular-nums">{system.count}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Actual count</div>
                <div className="font-semibold tabular-nums">{actualCount}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Count variance</div>
                <div className="font-semibold tabular-nums">{varianceCount}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Weight variance</div>
                <div className="font-semibold tabular-nums">
                  {varianceWeight.toFixed(2)} kg
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <ActionMessage state={lineState} />
            <SubmitButton pending={linePending}>Add count line</SubmitButton>
            </form>
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

            return (
              <div
                key={session.id}
                className="rounded-lg border p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-semibold">{session.sessionNo}</div>
                    <div className="text-sm text-muted-foreground">
                      {session.locationName} - {sessionLines.length} lines -{" "}
                      {varianceWeight.toFixed(2)} kg variance
                    </div>
                  </div>
                  <StockTakeSessionActions
                    session={session}
                    canOperate={canOperate}
                    canApprove={canApprove}
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
