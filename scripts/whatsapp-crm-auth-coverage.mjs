import { readFileSync } from "node:fs"

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const authTypes = read("lib/auth/types.ts")
const authAccess = read("lib/auth/access.ts")
const appShell = read("components/erp/app-shell.tsx")
const homePage = read("components/dashboard/home-page.tsx")
const loginPage = read("app/(auth)/login/page.tsx")
const loginForm = read("components/auth/login-form.tsx")
const crmData = read("lib/whatsapp-crm/data.ts")
const crmMigration = read("supabase/migrations/202606240003_whatsapp_crm_phase1.sql")

for (const role of ["owner", "admin", "sales", "customer_service", "account"]) {
  assert(authTypes.includes(`"${role}"`), `Auth role missing in TypeScript: ${role}`)
  assert(crmMigration.includes(`'${role}'`), `CRM migration role missing: ${role}`)
}

assert(
  authAccess.includes('"whatsapp_crm"') &&
    authAccess.indexOf('"whatsapp_crm"') === authAccess.lastIndexOf('"whatsapp_crm"'),
  "Module keys must include whatsapp_crm exactly once."
)

assert(
  authAccess.includes('profile.roles.includes("owner")') &&
    authAccess.includes('profile.roles.includes("admin")'),
  "Owner/admin must have global module access in app auth."
)

assert(
  appShell.includes('const whatsappCrmRoles: UserRole[]') &&
    appShell.includes('"sales"') &&
    appShell.includes('"customer_service"') &&
    appShell.includes('"account"'),
  "App shell must expose WhatsApp CRM to requested roles."
)

assert(
  homePage.includes('const whatsappCrmShortcutRoles: UserRole[]') &&
    homePage.includes("/whatsapp-crm"),
  "Home shortcuts must include WhatsApp CRM for CRM roles."
)

assert(
  loginPage.includes("Staff, managers, account, admin, and director users sign in here.") &&
    loginForm.includes("Your role controls what you can open."),
  "Login screen must explain role-based access."
)

assert(
  crmData.includes('role === "owner" || role === "admin"') &&
    crmData.includes('"sales"') &&
    crmData.includes('"account"'),
  "CRM data layer must map owner/admin/staff/account role modes."
)

assert(
  crmMigration.includes("create or replace function public.can_manage_whatsapp_crm()") &&
    crmMigration.includes("create or replace function public.can_reply_whatsapp_crm()") &&
    crmMigration.includes("create or replace function public.can_send_whatsapp_broadcast()"),
  "CRM migration must create role helper functions."
)

assert(
  crmMigration.includes("public.has_role('sales')") &&
    crmMigration.includes("public.has_role('customer_service')") &&
    crmMigration.includes("public.has_role('account')"),
  "CRM RLS helper functions must include sales, customer service, and account roles."
)

assert(
  crmMigration.includes('create policy "crm users read scoped messages"') &&
    !crmMigration.includes("using (public.can_reply_whatsapp_crm() or public.has_role('account'));"),
  "Account role must not be granted chat/broadcast read policy by default."
)

console.log("WhatsApp CRM auth coverage passed.")
