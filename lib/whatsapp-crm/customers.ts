import type { SupabaseClient } from "@supabase/supabase-js"

import type { CurrentProfile } from "@/lib/auth/session"
import { asRecord, readNullableString, readString } from "@/lib/records"
import type {
  CrmCustomer,
  CrmCustomerProfileUpdate,
} from "@/lib/whatsapp-crm/types"

type UpdateCustomerProfileInput = {
  customerId?: string
  name?: string
  phone?: string
  address?: string
  customerType?: CrmCustomer["customerType"]
  area?: string
  tags?: string[]
  remarks?: string
  birthday?: string | null
  companyName?: string
}

type StoredCustomerAccess = {
  id: string
  assignedStaffId: string | null
}

type UpdateCustomerProfileResult = {
  ok: boolean
  error: string | null
  customer: CrmCustomerProfileUpdate | null
}

const customerTypes: CrmCustomer["customerType"][] = ["Retail", "Wholesale", "VIP"]

const editRoles = [
  "owner",
  "sales",
  "sales_staff",
  "customer_service",
  "admin",
  "director",
]

const globalRoles = ["owner", "admin", "director"]

function hasAnyRole(profile: CurrentProfile, roles: string[]) {
  return profile.roles.some((role) => roles.includes(role))
}

function errorText(value: unknown) {
  const error = asRecord(value)

  return readString(error.message, "Unknown customer profile error")
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function cleanNullableDate(value: unknown) {
  const text = cleanText(value)

  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

function cleanTags(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((tag) => cleanText(tag))
        .filter(Boolean)
        .slice(0, 12)
    )
  )
}

function validateInput(input: UpdateCustomerProfileInput) {
  const name = cleanText(input.name)
  const phone = cleanText(input.phone)
  const customerType = input.customerType ?? "Retail"

  if (!input.customerId) return "Customer is required."
  if (!name) return "Customer name is required."
  if (!phone) return "Phone number is required."
  if (!customerTypes.includes(customerType)) return "Customer type is invalid."

  return null
}

async function loadCustomerAccess(
  supabase: SupabaseClient,
  customerId: string
): Promise<StoredCustomerAccess> {
  const result = await supabase
    .from("crm_customers")
    .select("id, assigned_staff_id")
    .eq("id", customerId)
    .single()

  if (result.error) {
    throw new Error(errorText(result.error))
  }

  const row = asRecord(result.data)

  return {
    id: readString(row.id),
    assignedStaffId: readNullableString(row.assigned_staff_id),
  }
}

function assertCanEditProfile(profile: CurrentProfile, customer: StoredCustomerAccess) {
  if (!hasAnyRole(profile, editRoles)) {
    return "This role cannot edit customer profiles."
  }

  if (hasAnyRole(profile, globalRoles)) {
    return null
  }

  if (customer.assignedStaffId === profile.id) {
    return null
  }

  return "You can only edit profiles for customers assigned to you."
}

function customerUpdateFromRow(row: Record<string, unknown>): CrmCustomerProfileUpdate {
  return {
    id: readString(row.id),
    name: readString(row.name, "Unknown customer"),
    phone: readString(row.phone),
    address: readString(row.address),
    customerType: readString(row.customer_type, "Retail") as CrmCustomer["customerType"],
    area: readString(row.area),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    remarks: readString(row.remarks),
    birthday: readNullableString(row.birthday),
    companyName: readString(row.company_name),
  }
}

export async function updateWhatsappCrmCustomerProfile({
  supabase,
  profile,
  input,
}: {
  supabase: SupabaseClient
  profile: CurrentProfile
  input: UpdateCustomerProfileInput
}): Promise<UpdateCustomerProfileResult> {
  const inputError = validateInput(input)

  if (inputError) {
    return {
      ok: false,
      error: inputError,
      customer: null,
    }
  }

  const customer = await loadCustomerAccess(supabase, input.customerId ?? "")
  const permissionError = assertCanEditProfile(profile, customer)

  if (permissionError) {
    return {
      ok: false,
      error: permissionError,
      customer: null,
    }
  }

  const update = {
    name: cleanText(input.name),
    phone: cleanText(input.phone),
    address: cleanText(input.address),
    customer_type: input.customerType ?? "Retail",
    area: cleanText(input.area),
    tags: cleanTags(input.tags),
    remarks: cleanText(input.remarks),
    birthday: cleanNullableDate(input.birthday),
    company_name: cleanText(input.companyName),
    updated_by: profile.id,
  }
  const result = await supabase
    .from("crm_customers")
    .update(update)
    .eq("id", customer.id)
    .select(
      "id, name, phone, address, customer_type, area, tags, remarks, birthday, company_name"
    )
    .single()

  if (result.error) {
    return {
      ok: false,
      error: errorText(result.error),
      customer: null,
    }
  }

  await supabase.from("crm_audit_logs").insert({
    actor_id: profile.id,
    action: "WHATSAPP_CUSTOMER_PROFILE_UPDATE",
    table_name: "crm_customers",
    record_id: customer.id,
    detail: {
      fields: Object.keys(update).filter((field) => field !== "updated_by"),
    },
  })

  return {
    ok: true,
    error: null,
    customer: customerUpdateFromRow(asRecord(result.data)),
  }
}
