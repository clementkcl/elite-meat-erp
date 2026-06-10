"use client"

import { Save } from "lucide-react"
import { useActionState, useMemo, useState, type ReactNode } from "react"

import {
  addStockTakeLineAction,
  approveStockTakeAction,
  barcodeInboundAction,
  createBrandAction,
  createItemAction,
  createLocationAction,
  createOriginAction,
  createStockTakeSessionAction,
  initialStockActionState,
  noBarcodeInboundAction,
  outboundSalesAction,
  receiveTransferAction,
  returnStockAction,
  reviewStockTakeAction,
  submitStockTakeAction,
  transferAction,
  type StockActionState,
} from "@/lib/stock/actions"
import type {
  Brand,
  Item,
  Origin,
  StockBalanceRow,
  StockLocation,
  StockTakeLine,
  StockTakeSession,
} from "@/lib/stock/types"
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
  children,
}: {
  pending: boolean
  children: ReactNode
}) {
  return (
    <Button type="submit" disabled={pending}>
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

function ItemSelect({ items }: { items: Item[] }) {
  return (
    <NativeSelect id="itemId" name="itemId">
      <option value="">Select item</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.category} / {item.section} / {item.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function LocationSelect({
  locations,
  id = "locationId",
  name = "locationId",
}: {
  locations: StockLocation[]
  id?: string
  name?: string
}) {
  return (
    <NativeSelect id={id} name={name}>
      <option value="">Select location</option>
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </NativeSelect>
  )
}

export function ItemMasterForm() {
  return (
    <WorkflowCard
      title="Create item"
      description="Maintain the stock item master used across barcode and no-barcode workflows."
      action={createItemAction}
      submitLabel="Create item"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="itemCode">Item code</Label>
          <Input
            id="itemCode"
            name="itemCode"
            placeholder="MEAT-BELLY-BONELESS"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <NativeSelect id="category" name="category">
            <option value="MEAT">MEAT</option>
            <option value="ORGANS">ORGANS</option>
            <option value="PROCESSED">PROCESSED</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="section">Section</Label>
          <Input id="section" name="section" placeholder="BELLY" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="BONELESS" />
        </div>
      </div>
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
    </WorkflowCard>
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

export function BarcodeInboundForm({
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
      title="Barcode inbound"
      description="Receive a barcode unit into a stock location."
      action={barcodeInboundAction}
      submitLabel="Save inbound"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" placeholder="EM-BC-000001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="itemId">Item</Label>
          <ItemSelect items={items} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandId">Brand</Label>
          <NativeSelect id="brandId" name="brandId" required={false}>
            <option value="">No brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="originId">Origin</Label>
          <NativeSelect id="originId" name="originId" required={false}>
            <option value="">No origin</option>
            {origins.map((origin) => (
              <option key={origin.id} value={origin.id}>
                {origin.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationId">Location</Label>
          <LocationSelect locations={locations} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="netWeightKg">Net weight kg</Label>
          <Input
            id="netWeightKg"
            name="netWeightKg"
            type="number"
            step="0.01"
            min="0"
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
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function OutboundSalesForm() {
  return (
    <WorkflowCard
      title="Outbound sales"
      description="Scan a barcode unit out for sales."
      action={outboundSalesAction}
      submitLabel="Save outbound"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" placeholder="EM-BC-000001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNo">Reference no.</Label>
          <Input id="referenceNo" name="referenceNo" placeholder="INV-1001" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </WorkflowCard>
  )
}

export function TransferForm({ locations }: { locations: StockLocation[] }) {
  return (
    <WorkflowCard
      title="Create transfer"
      description="Move a barcode unit into transfer pending status."
      action={transferAction}
      submitLabel="Create transfer"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" placeholder="EM-LN-000003" />
        </div>
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
  return (
    <WorkflowCard
      title="Receive transfer"
      description="Confirm a pending transfer into the receiving location."
      action={receiveTransferAction}
      submitLabel="Receive transfer"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" placeholder="EM-LN-000003" />
        </div>
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
  return (
    <WorkflowCard
      title="Stock return"
      description="Return a barcode unit back to a stock location."
      action={returnStockAction}
      submitLabel="Save return"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" name="barcode" placeholder="EM-OR-000004" />
        </div>
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
  locations,
}: {
  items: Item[]
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

function StockTakeSessionActions({ session }: { session: StockTakeSession }) {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={session.status === "APPROVED" ? "success" : "outline"}>
        {session.status}
      </Badge>
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
          disabled={approvePending || session.status === "APPROVED"}
        >
          Approve
        </Button>
      </form>
      <ActionMessage state={submitState} />
      <ActionMessage state={reviewState} />
      <ActionMessage state={approveState} />
    </div>
  )
}

export function StockTakeWorkbench({
  items,
  locations,
  balances,
  sessions,
  lines,
}: {
  items: Item[]
  locations: StockLocation[]
  balances: StockBalanceRow[]
  sessions: StockTakeSession[]
  lines: StockTakeLine[]
}) {
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id ?? "")
  const [selectedLocationId, setSelectedLocationId] = useState(
    sessions[0]?.locationId ?? locations[0]?.id ?? ""
  )
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "")
  const [actualCount, setActualCount] = useState("0")
  const [actualWeightKg, setActualWeightKg] = useState("0")
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
                  <StockTakeSessionActions session={session} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
