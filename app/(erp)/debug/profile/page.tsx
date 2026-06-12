import { notFound } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { asRecord, asRecordArray, readString } from "@/lib/records"
import { getCurrentProfile } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type QueryResult = {
  data: unknown
  error: string | null
}

function queryResult(data: unknown, error: { message?: string } | null): QueryResult {
  return {
    data,
    error: error?.message ?? null,
  }
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function DebugSection({
  title,
  description,
  value,
}: {
  title: string
  description: string
  value: unknown
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <JsonBlock value={value} />
      </CardContent>
    </Card>
  )
}

async function loadNameResult(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  id: string | null
) {
  if (!supabase || !id) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase
    .from(table)
    .select("id, name")
    .eq("id", id)
    .maybeSingle()

  return { data, error }
}

export default async function DebugProfilePage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return (
      <DebugSection
        title="Profile Debug"
        description="Supabase is not configured for this environment."
        value={{ supabaseConfigured: false }}
      />
    )
  }

  const authResult = await supabase.auth.getUser()
  const authUser = authResult.data.user
  const currentProfile = await getCurrentProfile()
  const authEmail = authUser?.email ?? ""

  const profileByIdResult = authUser
    ? await supabase
        .from("profiles")
        .select(
          "id, email, full_name, department_id, branch_id, outlet_id, stock_location_id"
        )
        .eq("id", authUser.id)
        .maybeSingle()
    : { data: null, error: null }

  const profileByEmailResult = authEmail
    ? await supabase
        .from("profiles")
        .select(
          "id, email, full_name, department_id, branch_id, outlet_id, stock_location_id"
        )
        .ilike("email", authEmail)
    : { data: null, error: null }

  const profileById = asRecord(profileByIdResult.data)
  const emailProfiles = asRecordArray(profileByEmailResult.data)
  const firstEmailProfile = emailProfiles[0]
  const profileForModuleLookup =
    readString(profileById.id)
      ? profileById
      : asRecord(firstEmailProfile)
  const outletId = readString(profileForModuleLookup.outlet_id)

  const roleRowsByAuthIdResult = authUser
    ? await supabase
        .from("profile_roles")
        .select("profile_id, role_key")
        .eq("profile_id", authUser.id)
    : { data: null, error: null }

  const roleRowsByEmailProfileResult = readString(firstEmailProfile?.id)
    ? await supabase
        .from("profile_roles")
        .select("profile_id, role_key")
        .eq("profile_id", readString(firstEmailProfile?.id))
    : { data: null, error: null }

  const roleNamesResult = await supabase
    .from("roles")
    .select("role_key, name")
    .order("role_key")

  const moduleAccessResult = outletId
    ? await supabase
        .from("outlet_module_access")
        .select("outlet_id, module_key, is_enabled")
        .eq("outlet_id", outletId)
        .order("module_key")
    : { data: null, error: null }
  const [outletNameResult, departmentNameResult, branchNameResult, stockNameResult] =
    await Promise.all([
      loadNameResult(supabase, "outlets", readString(profileById.outlet_id) || null),
      loadNameResult(
        supabase,
        "departments",
        readString(profileById.department_id) || null
      ),
      loadNameResult(supabase, "branches", readString(profileById.branch_id) || null),
      loadNameResult(
        supabase,
        "stock_locations",
        readString(profileById.stock_location_id) || null
      ),
    ])

  const debugPayload = {
    environment: {
      nodeEnv: process.env.NODE_ENV,
      devOnly: true,
    },
    auth: {
      userId: authUser?.id ?? null,
      email: authEmail || null,
      error: authResult.error?.message ?? null,
    },
    appLoadedCurrentProfile: currentProfile,
    profileByAuthId: queryResult(profileByIdResult.data, profileByIdResult.error),
    profilesByAuthEmail: queryResult(
      profileByEmailResult.data,
      profileByEmailResult.error
    ),
    rolesByAuthId: queryResult(
      roleRowsByAuthIdResult.data,
      roleRowsByAuthIdResult.error
    ),
    rolesByEmailProfileId: queryResult(
      roleRowsByEmailProfileResult.data,
      roleRowsByEmailProfileResult.error
    ),
    roleNames: queryResult(roleNamesResult.data, roleNamesResult.error),
    namesFromLoadedProfileByAuthId: {
      outlet: queryResult(outletNameResult.data, outletNameResult.error),
      department: queryResult(
        departmentNameResult.data,
        departmentNameResult.error
      ),
      branch: queryResult(branchNameResult.data, branchNameResult.error),
      stockLocation: queryResult(stockNameResult.data, stockNameResult.error),
    },
    moduleAccessRowsForResolvedOutlet: queryResult(
      moduleAccessResult.data,
      moduleAccessResult.error
    ),
    likelyCauseHints: {
      authIdProfileMissing:
        Boolean(authUser?.id) && !readString(profileById.id),
      authEmailProfileHasDifferentId:
        Boolean(authUser?.id) &&
        emailProfiles.some((profile) => readString(profile.id) !== authUser?.id),
      rolesHiddenOrMissingForAuthId:
        asRecordArray(roleRowsByAuthIdResult.data).length === 0,
      scopeMissingForAuthId:
        !readString(profileById.outlet_id) &&
        !readString(profileById.department_id) &&
        !readString(profileById.stock_location_id),
    },
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Debug Profile
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Development-only profile loader diagnostics. This page uses the current
          user session only.
        </p>
      </div>

      <DebugSection
        title="Full Diagnostic Payload"
        description="Auth user, loaded app profile, raw profile rows, role rows, module access rows, and query errors."
        value={debugPayload}
      />
    </div>
  )
}
