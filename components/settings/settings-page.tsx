"use client"

import { useActionState, useMemo, useState, type ReactNode } from "react"

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
import {
  saveBarcodeWeightRuleAction,
  saveClaimCategoryAction,
  saveCustomerAction,
  saveCustomerCategoryAction,
  saveCustomerPriceRuleAction,
  saveLeaveTypeAction,
  savePaymentTypeAction,
  updateOutletModuleAccessAction,
  updateUserAccessAction,
} from "@/lib/settings/actions"
import {
  moduleKeys,
  type SettingsOption,
  type SettingsPageData,
  type SettingsProfile,
} from "@/lib/settings/types"
import type { UserRole } from "@/lib/auth/types"

type ActionState = {
  status: "idle" | "success" | "error"
  message: string
}

const initialState: ActionState = { status: "idle", message: "" }

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function SelectField({
  name,
  options,
  defaultValue,
  includeBlank = true,
  onChange,
}: {
  name: string
  options: SettingsOption[]
  defaultValue?: string | null
  includeBlank?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      onChange={(event) => onChange?.(event.currentTarget.value)}
      className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
    >
      {includeBlank ? <option value="">Not assigned</option> : null}
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  )
}

function ActionMessage({ state }: { state: typeof initialState }) {
  if (!state.message) {
    return null
  }

  return (
    <p
      className={
        state.status === "error"
          ? "text-sm font-medium text-destructive"
          : "text-sm font-medium text-emerald-700"
      }
    >
      {state.message}
    </p>
  )
}

function SubmitButton({
  pending,
  children = "Save",
}: {
  pending: boolean
  children?: React.ReactNode
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : children}
    </Button>
  )
}

function BooleanFields({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
      <input type="hidden" name={name} value="false" />
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="size-4"
      />
      <span>{label}</span>
    </label>
  )
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Table({
  headers,
  rows,
}: {
  headers: string[]
  rows: (string | number | boolean | null)[][]
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-muted-foreground" colSpan={headers.length}>
                No records yet.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2">
                    {cell === null || cell === "" ? "-" : String(cell)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function UserAccessForm({
  profiles,
  roles,
  outlets,
  departments,
  stockLocations,
  accessRows,
}: {
  profiles: SettingsProfile[]
  roles: UserRole[]
  outlets: SettingsOption[]
  departments: SettingsOption[]
  stockLocations: SettingsOption[]
  accessRows: SettingsPageData["outletModuleAccess"]
}) {
  const [state, formAction, pending] = useActionState(
    updateUserAccessAction,
    initialState
  )
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "")
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === profileId) ?? profiles[0],
    [profileId, profiles]
  )
  const [outletSelection, setOutletSelection] = useState({
    profileId: selectedProfile?.id ?? "",
    outletId: selectedProfile?.outletId ?? outlets[0]?.id ?? "",
  })
  const outletId =
    outletSelection.profileId === selectedProfile?.id
      ? outletSelection.outletId
      : selectedProfile?.outletId ?? ""
  const enabledModules = new Set(
    accessRows
      .filter((row) => row.outletId === outletId && row.isEnabled)
      .map((row) => row.moduleKey)
  )

  return (
    <SettingsCard
      title="User Access"
      description="Assign profile scope, roles, and the selected outlet's module access."
    >
      <form action={formAction} className="space-y-4">
        <Field label="User">
          <SelectField
            name="profileId"
            options={profiles.map((profile) => ({
              id: profile.id,
              name: `${profile.fullName} (${profile.email})`,
            }))}
            includeBlank={false}
            defaultValue={selectedProfile?.id}
            onChange={setProfileId}
          />
        </Field>
        <div key={selectedProfile?.id ?? "roles"} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <label key={role} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="roles"
                value={role}
                defaultChecked={selectedProfile?.roles.includes(role)}
                className="size-4"
              />
              <span>{titleCase(role)}</span>
            </label>
          ))}
        </div>
        <div key={`${selectedProfile?.id ?? "scope"}-scope`} className="grid gap-3 md:grid-cols-3">
          <Field label="Outlet">
            <SelectField
              name="outletId"
              options={outlets}
              defaultValue={selectedProfile?.outletId}
              onChange={(value) =>
                setOutletSelection({
                  profileId: selectedProfile?.id ?? "",
                  outletId: value,
                })
              }
            />
          </Field>
          <Field label="Department">
            <SelectField
              name="departmentId"
              options={departments}
              defaultValue={selectedProfile?.departmentId}
            />
          </Field>
          <Field label="Stock location">
            <SelectField
              name="stockLocationId"
              options={stockLocations}
              defaultValue={selectedProfile?.stockLocationId}
            />
          </Field>
        </div>
        <div key={`${outletId || "no-outlet"}-modules`} className="space-y-2">
          <div>
            <Label>Module access for selected outlet</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              These module toggles are saved on the outlet and apply to users assigned to that outlet.
            </p>
          </div>
          {outletId ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {moduleKeys.map((moduleKey) => (
                <label
                  key={moduleKey}
                  className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="outletModules"
                    value={moduleKey}
                    defaultChecked={enabledModules.has(moduleKey)}
                    className="size-4"
                  />
                  <span>{titleCase(moduleKey)}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Choose an outlet to edit module access.
            </p>
          )}
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Update user</SubmitButton>
      </form>
    </SettingsCard>
  )
}

function OutletModuleForm({
  outlets,
  accessRows,
}: {
  outlets: SettingsOption[]
  accessRows: SettingsPageData["outletModuleAccess"]
}) {
  const [state, formAction, pending] = useActionState(
    updateOutletModuleAccessAction,
    initialState
  )
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? "")
  const enabledModules = new Set(
    accessRows
      .filter((row) => row.outletId === outletId && row.isEnabled)
      .map((row) => row.moduleKey)
  )

  return (
    <SettingsCard
      title="Outlet Module Access"
      description="Module availability by outlet."
    >
      <form action={formAction} className="space-y-4">
        <Field label="Outlet">
          <SelectField
            name="outletId"
            options={outlets}
            includeBlank={false}
            defaultValue={outletId}
            onChange={setOutletId}
          />
        </Field>
        <div key={outletId} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {moduleKeys.map((moduleKey) => (
            <label key={moduleKey} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="modules"
                value={moduleKey}
                defaultChecked={enabledModules.has(moduleKey)}
                className="size-4"
              />
              <span>{titleCase(moduleKey)}</span>
            </label>
          ))}
        </div>
        <ActionMessage state={state} />
        <SubmitButton pending={pending}>Update outlet</SubmitButton>
      </form>
    </SettingsCard>
  )
}

function PaymentTypeForm() {
  const [state, formAction, pending] = useActionState(
    savePaymentTypeAction,
    initialState
  )

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-5">
      <Field label="Code">
        <Input name="code" required placeholder="BANK_TRANSFER" />
      </Field>
      <Field label="Name">
        <Input name="name" required placeholder="Bank transfer" />
      </Field>
      <Field label="Sort">
        <Input name="sortOrder" type="number" defaultValue={100} min={0} />
      </Field>
      <div className="flex items-end gap-2 md:col-span-2">
        <BooleanFields name="isCash" label="Cash" />
        <BooleanFields name="isActive" label="Active" defaultChecked />
        <SubmitButton pending={pending} />
      </div>
      <div className="md:col-span-5">
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function SimpleSettingForm({
  type,
}: {
  type: "claim" | "leave" | "customer"
}) {
  const action =
    type === "claim"
      ? saveClaimCategoryAction
      : type === "leave"
        ? saveLeaveTypeAction
        : saveCustomerCategoryAction
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-6">
      <Field label="Code">
        <Input name="code" required />
      </Field>
      <Field label="Name">
        <Input name="name" required />
      </Field>
      {type === "leave" ? (
        <>
          <Field label="Days">
            <Input name="defaultDays" type="number" defaultValue={0} min={0} step="0.5" />
          </Field>
          <div className="flex items-end">
            <BooleanFields name="requiresAttachment" label="Attachment" />
          </div>
        </>
      ) : null}
      {type === "customer" ? (
        <>
          <Field label="Credit days">
            <Input name="creditTermDays" type="number" defaultValue={0} min={0} />
          </Field>
          <div className="flex items-end">
            <BooleanFields name="isCredit" label="Credit" />
          </div>
        </>
      ) : null}
      <Field label="Sort">
        <Input name="sortOrder" type="number" defaultValue={100} min={0} />
      </Field>
      <div className="flex items-end gap-2">
        <BooleanFields name="isActive" label="Active" defaultChecked />
        <SubmitButton pending={pending} />
      </div>
      <div className="md:col-span-6">
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function CustomerForm({
  outlets,
  categories,
}: {
  outlets: SettingsOption[]
  categories: SettingsOption[]
}) {
  const [state, formAction, pending] = useActionState(
    saveCustomerAction,
    initialState
  )

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-4">
      <Field label="Code">
        <Input name="customerCode" placeholder="Auto if blank" />
      </Field>
      <Field label="Name">
        <Input name="name" required />
      </Field>
      <Field label="Phone">
        <Input name="phone" />
      </Field>
      <Field label="Category">
        <SelectField name="categoryId" options={categories} />
      </Field>
      <Field label="Outlet">
        <SelectField name="outletId" options={outlets} />
      </Field>
      <Field label="Credit days">
        <Input name="creditTermDays" type="number" defaultValue={0} min={0} />
      </Field>
      <Field label="Latitude">
        <Input name="latitude" type="number" step="0.000001" />
      </Field>
      <Field label="Longitude">
        <Input name="longitude" type="number" step="0.000001" />
      </Field>
      <div className="md:col-span-4">
        <Field label="Address">
          <Textarea name="address" rows={3} />
        </Field>
      </div>
      <div className="flex items-end gap-2 md:col-span-4">
        <BooleanFields name="isActive" label="Active" defaultChecked />
        <SubmitButton pending={pending}>Save customer</SubmitButton>
      </div>
      <div className="md:col-span-4">
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function BarcodeRuleForm({
  items,
  brands,
  origins,
  stockLocations,
}: {
  items: SettingsOption[]
  brands: SettingsOption[]
  origins: SettingsOption[]
  stockLocations: SettingsOption[]
}) {
  const [state, formAction, pending] = useActionState(
    saveBarcodeWeightRuleAction,
    initialState
  )

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-4">
      <Field label="Item">
        <SelectField name="itemId" options={items} includeBlank={false} />
      </Field>
      <Field label="Brand">
        <SelectField name="brandId" options={brands} />
      </Field>
      <Field label="Origin">
        <SelectField name="originId" options={origins} />
      </Field>
      <Field label="Location">
        <SelectField name="locationId" options={stockLocations} includeBlank={false} />
      </Field>
      <Field label="Start">
        <Input name="barcodeWeightStart" type="number" defaultValue={1} min={1} max={100} />
      </Field>
      <Field label="Length">
        <Input name="barcodeWeightLength" type="number" defaultValue={5} min={1} max={12} />
      </Field>
      <Field label="Decimals">
        <Input name="barcodeWeightDecimals" type="number" defaultValue={2} min={0} max={4} />
      </Field>
      <div className="flex items-end">
        <SubmitButton pending={pending}>Save rule</SubmitButton>
      </div>
      <div className="md:col-span-4">
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function CustomerPriceRuleForm({
  categories,
  customers,
  items,
  brands,
  origins,
  outlets,
}: {
  categories: SettingsOption[]
  customers: SettingsOption[]
  items: SettingsOption[]
  brands: SettingsOption[]
  origins: SettingsOption[]
  outlets: SettingsOption[]
}) {
  const [state, formAction, pending] = useActionState(
    saveCustomerPriceRuleAction,
    initialState
  )

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-4">
      <Field label="Category">
        <SelectField name="customerCategoryId" options={categories} />
      </Field>
      <Field label="Specific customer">
        <SelectField name="customerId" options={customers} />
      </Field>
      <Field label="Item">
        <SelectField name="itemId" options={items} includeBlank={false} />
      </Field>
      <Field label="Outlet">
        <SelectField name="outletId" options={outlets} />
      </Field>
      <Field label="Brand">
        <SelectField name="brandId" options={brands} />
      </Field>
      <Field label="Origin">
        <SelectField name="originId" options={origins} />
      </Field>
      <Field label="Unit price">
        <Input name="unitPrice" type="number" min={0} step="0.01" required />
      </Field>
      <Field label="Effective from">
        <Input
          name="effectiveFrom"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
      </Field>
      <div className="flex items-end gap-2 md:col-span-4">
        <BooleanFields name="isActive" label="Active" defaultChecked />
        <SubmitButton pending={pending}>Save price</SubmitButton>
      </div>
      <div className="md:col-span-4">
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

export function SettingsPage({ data }: { data: SettingsPageData }) {
  const customerCategoryOptions = data.customerCategories.map((category) => ({
    id: category.id,
    name: category.name,
  }))
  const customerOptions = data.customers.map((customer) => ({
    id: customer.id,
    name: `${customer.customerCode || "NO-CODE"} - ${customer.name}`,
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Admin controls for access scope, workflow lists, customers, and barcode rules.
          </p>
        </div>
        <Badge variant={data.demoMode ? "warning" : "outline"}>
          {data.demoMode ? "Demo data" : "Admin scope"}
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <UserAccessForm
          profiles={data.profiles}
          roles={data.roles}
          outlets={data.outlets}
          departments={data.departments}
          stockLocations={data.stockLocations}
          accessRows={data.outletModuleAccess}
        />
        <OutletModuleForm
          outlets={data.outlets}
          accessRows={data.outletModuleAccess}
        />
      </div>

      <SettingsCard title="Payment Types" description="Retail and order payment choices.">
        <div className="space-y-4">
          <PaymentTypeForm />
          <Table
            headers={["Code", "Name", "Cash", "Active", "Sort"]}
            rows={data.paymentTypes.map((row) => [
              row.code,
              row.name,
              row.isCash,
              row.isActive,
              row.sortOrder,
            ])}
          />
        </div>
      </SettingsCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SettingsCard title="Claim Categories" description="Expense claim categories.">
          <div className="space-y-4">
            <SimpleSettingForm type="claim" />
            <Table
              headers={["Code", "Name", "Active"]}
              rows={data.claimCategories.map((row) => [
                row.code,
                row.name,
                row.isActive,
              ])}
            />
          </div>
        </SettingsCard>
        <SettingsCard title="Leave Types" description="Leave choices and annual defaults.">
          <div className="space-y-4">
            <SimpleSettingForm type="leave" />
            <Table
              headers={["Code", "Name", "Days", "Attachment"]}
              rows={data.leaveTypes.map((row) => [
                row.code,
                row.name,
                row.defaultDays,
                row.requiresAttachment,
              ])}
            />
          </div>
        </SettingsCard>
        <SettingsCard title="Customer Categories" description="Pricing and credit grouping.">
          <div className="space-y-4">
            <SimpleSettingForm type="customer" />
            <Table
              headers={["Code", "Name", "Credit days", "Credit"]}
              rows={data.customerCategories.map((row) => [
                row.code,
                row.name,
                row.creditTermDays,
                row.isCredit,
              ])}
            />
          </div>
        </SettingsCard>
      </div>

      <SettingsCard title="Customer Master" description="Customers, delivery address, credit term, and outlet scope.">
        <div className="space-y-4">
          <CustomerForm outlets={data.outlets} categories={customerCategoryOptions} />
          <Table
            headers={["Code", "Name", "Phone", "Credit days", "Active"]}
            rows={data.customers.map((row) => [
              row.customerCode,
              row.name,
              row.phone,
              row.creditTermDays,
              row.isActive,
            ])}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Customer Price List" description="Price rules by customer category, customer, item, and outlet.">
        <div className="space-y-4">
          <CustomerPriceRuleForm
            categories={customerCategoryOptions}
            customers={customerOptions}
            items={data.items}
            brands={data.brands}
            origins={data.origins}
            outlets={data.outlets}
          />
          <Table
            headers={["Category", "Customer", "Item", "Outlet", "Price", "From", "Active"]}
            rows={data.customerPriceRules.map((row) => [
              row.categoryName,
              row.customerName,
              row.itemName,
              row.outletName,
              row.unitPrice,
              row.effectiveFrom,
              row.isActive,
            ])}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Barcode Weight Rules" description="Saved weight positions by item, brand, origin, and location.">
        <div className="space-y-4">
          <BarcodeRuleForm
            items={data.items}
            brands={data.brands}
            origins={data.origins}
            stockLocations={data.stockLocations}
          />
          <Table
            headers={["Item", "Brand", "Origin", "Location", "Start", "Length", "Decimals"]}
            rows={data.barcodeWeightRules.map((row) => [
              row.itemName,
              row.brandName,
              row.originName,
              row.locationName,
              row.barcodeWeightStart,
              row.barcodeWeightLength,
              row.barcodeWeightDecimals,
            ])}
          />
        </div>
      </SettingsCard>
    </div>
  )
}
