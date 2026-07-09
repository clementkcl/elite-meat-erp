import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

const root = process.cwd()
const qaPassword = process.env.RETAIL_QA_PASSWORD || "RetailQA2026!"
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function readEnv() {
  const envPath = path.join(root, ".env.local")
  const lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : []
  const env = { ...process.env }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue
    }

    const [key, ...rest] = trimmed.split("=")
    env[key] = rest.join("=").replace(/^"|"$/g, "")
  }

  return env
}

const env = readEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

const users = [
  {
    email: "retail.worker.outletA@example.test",
    fullName: "Retail QA Worker Outlet A",
    outletId: "20000000-0000-4000-8000-000000000001",
    departmentId: "21000000-0000-4000-8000-000000000001",
    stockLocationId: "22000000-0000-4000-8000-000000000001",
    roleKey: "retail_team_general_worker",
  },
  {
    email: "retail.manager.outletA@example.test",
    fullName: "Retail QA Manager Outlet A",
    outletId: "20000000-0000-4000-8000-000000000001",
    departmentId: "21000000-0000-4000-8000-000000000001",
    stockLocationId: "22000000-0000-4000-8000-000000000001",
    roleKey: "retail_manager",
  },
  {
    email: "retail.worker.outletB@example.test",
    fullName: "Retail QA Worker Outlet B",
    outletId: "20000000-0000-4000-8000-000000000002",
    departmentId: "21000000-0000-4000-8000-000000000002",
    stockLocationId: "22000000-0000-4000-8000-000000000002",
    roleKey: "retail_team_general_worker",
  },
  {
    email: "retail.manager.outletB@example.test",
    fullName: "Retail QA Manager Outlet B",
    outletId: "20000000-0000-4000-8000-000000000002",
    departmentId: "21000000-0000-4000-8000-000000000002",
    stockLocationId: "22000000-0000-4000-8000-000000000002",
    roleKey: "retail_manager",
  },
  {
    email: "admin.qa@example.test",
    fullName: "Retail QA Admin",
    outletId: null,
    departmentId: null,
    stockLocationId: null,
    roleKey: "admin",
  },
  {
    email: "director.qa@example.test",
    fullName: "Retail QA Director",
    outletId: null,
    departmentId: null,
    stockLocationId: null,
    roleKey: "director",
  },
]

for (const user of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: qaPassword,
    email_confirm: true,
    user_metadata: {
      full_name: user.fullName,
    },
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
  })

  if (error) {
    throw new Error(`${user.email} admin create failed: ${error.message}`)
  }

  const userId = data.user?.id

  if (!userId) {
    throw new Error(`${user.email} admin create did not return a user id.`)
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    email: user.email,
    full_name: user.fullName,
    outlet_id: user.outletId,
    department_id: user.departmentId,
    stock_location_id: user.stockLocationId,
  })

  if (profileError) {
    throw new Error(`${user.email} profile upsert failed: ${profileError.message}`)
  }

  const { error: roleError } = await supabase.from("profile_roles").upsert({
    profile_id: userId,
    role_key: user.roleKey,
  })

  if (roleError) {
    throw new Error(`${user.email} role upsert failed: ${roleError.message}`)
  }
}

console.log("Retail staging QA Auth users updated through Admin API.")
