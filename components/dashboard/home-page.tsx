import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DollarSign,
  ListChecks,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Truck,
  UserCog,
} from "lucide-react"
import Link from "next/link"
import type { ComponentType } from "react"

import { TeamScopeBadge } from "@/components/erp/team-scope-badge"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { canAccessModule, type ModuleKey } from "@/lib/auth/access"
import type { CurrentProfile, UserRole } from "@/lib/auth/types"

type Shortcut = {
  href: string
  label: string
  description: string
  workerLabel?: string
  nextStep?: string
  moduleKey?: ModuleKey
  roles?: UserRole[]
  icon: ComponentType<{ className?: string }>
}

type WorkerDailyAction = {
  href: string
  label: string
  description: string
  nextStep: string
  icon: ComponentType<{ className?: string }>
}

const stockRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
  "director",
]

const stockItemMasterRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
]

const stockOperatorShortcutRoles: UserRole[] = stockRoles.filter(
  (role) => role !== "director"
)

const stockAdvancedShortcutRoles: UserRole[] = [
  "retail_manager",
  "delivery_manager",
  "processing_manager",
  "admin",
  "director",
]

const orderOperatorShortcutRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
  "director",
]

const whatsappCrmShortcutRoles: UserRole[] = [
  "owner",
  "sales",
  "sales_staff",
  "customer_service",
  "account",
  "admin",
  "director",
]

const attendanceRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "delivery_team_general_worker",
  "delivery_manager",
  "processing_team_general_worker",
  "processing_manager",
  "account",
  "admin",
  "director",
]

const cleaningRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
  "director",
]

const workerRoles: UserRole[] = [
  "retail_team_general_worker",
  "delivery_team_general_worker",
  "processing_team_general_worker",
]

const managerRoles: UserRole[] = [
  "retail_manager",
  "delivery_manager",
  "processing_manager",
]

const shortcuts: Shortcut[] = [
  {
    href: "/stock",
    label: "Stock",
    description: "Open stock workflows for your assigned location.",
    nextStep: "Scan or check stock",
    moduleKey: "stock",
    roles: stockRoles,
    icon: BarChart3,
  },
  {
    href: "/attendance/clock",
    label: "Clock In / Out",
    workerLabel: "Clock In",
    description: "Record attendance for your assigned location.",
    nextStep: "Start or end shift",
    moduleKey: "attendance",
    roles: attendanceRoles.filter((role) => role !== "director"),
    icon: CalendarCheck,
  },
  {
    href: "/stock/items",
    label: "Item Master",
    description: "Create or edit numeric item codes and item names.",
    moduleKey: "stock",
    roles: stockItemMasterRoles,
    icon: PackageCheck,
  },
  {
    href: "/stock/inbound",
    label: "Stock Inbound",
    description: "Scan new barcode stock into your location.",
    moduleKey: "stock",
    roles: stockOperatorShortcutRoles,
    icon: PackageCheck,
  },
  {
    href: "/stock/outbound",
    label: "Stock Outbound",
    description: "Scan stock out for orders, sales, transfer, or processing.",
    moduleKey: "stock",
    roles: stockOperatorShortcutRoles,
    icon: PackageCheck,
  },
  {
    href: "/stock/reports",
    label: "Stock Reports",
    description: "Print, export, or share stock summaries.",
    moduleKey: "stock",
    roles: stockAdvancedShortcutRoles,
    icon: BarChart3,
  },
  {
    href: "/orders",
    label: "Orders",
    description: "Review order KPIs, alerts, and current order status.",
    moduleKey: "orders",
    roles: orderOperatorShortcutRoles,
    icon: ClipboardList,
  },
  {
    href: "/orders/create",
    label: "Create Order",
    workerLabel: "Order",
    description: "Create a customer order for pickup or delivery.",
    nextStep: "Choose customer",
    moduleKey: "orders",
    roles: orderOperatorShortcutRoles.filter((role) => role !== "director"),
    icon: ClipboardList,
  },
  {
    href: "/oa-actions/dashboard",
    label: "OA Actions",
    workerLabel: "OA Action",
    description: "Submit leave, claim, advance, and payslip requests.",
    nextStep: "Pick request type",
    moduleKey: "oa_actions",
    icon: ClipboardList,
  },
  {
    href: "/whatsapp-crm",
    label: "WhatsApp CRM",
    description: "Reply to customer chats, create simple chat orders, and track response speed.",
    moduleKey: "whatsapp_crm",
    roles: whatsappCrmShortcutRoles,
    icon: MessageCircle,
  },
  {
    href: "/orders/picking",
    label: "Order Picking",
    description: "Scan or enter picked weight for confirmed orders.",
    moduleKey: "orders",
    roles: orderOperatorShortcutRoles,
    icon: PackageCheck,
  },
  {
    href: "/processing/dashboard",
    label: "Processing Dashboard",
    workerLabel: "Processing",
    description: "Record processing batches and yield/loss.",
    nextStep: "Record batch",
    moduleKey: "processing",
    roles: ["processing_team_general_worker", "processing_manager", "admin", "director"],
    icon: PackageCheck,
  },
  {
    href: "/retail/dashboard",
    label: "Retail Dashboard",
    description: "Review daily sales, cash, expenses, and closing status.",
    moduleKey: "retail",
    roles: [
      "retail_team_general_worker",
      "retail_manager",
      "account",
      "admin",
      "director",
    ],
    icon: Building2,
  },
  {
    href: "/cleaning/tasks",
    label: "Cleaning",
    description: "Complete assigned cleaning tasks.",
    nextStep: "Tap completed task",
    moduleKey: "cleaning",
    roles: cleaningRoles.filter((role) => role !== "director"),
    icon: ClipboardList,
  },
  {
    href: "/delivery/driver",
    label: "Driver Pickup List",
    workerLabel: "Delivery",
    description: "View delivery jobs ready for driver action.",
    nextStep: "Accept today job",
    moduleKey: "delivery",
    roles: ["delivery_team_general_worker", "delivery_manager", "admin"],
    icon: Truck,
  },
  {
    href: "/delivery/dashboard",
    label: "Delivery Dashboard",
    description: "Review active deliveries, driver performance, and delivery issues.",
    moduleKey: "delivery",
    roles: ["delivery_manager", "admin", "director"],
    icon: Truck,
  },
  {
    href: "/accounting-finance/dashboard",
    label: "Finance Dashboard",
    description: "Track AR, AP, claims, advances, and container payments.",
    moduleKey: "accounting_finance",
    roles: ["account", "admin", "director"],
    icon: DollarSign,
  },
  {
    href: "/director-reports/dashboard",
    label: "Director Dashboard",
    description: "Review director reports and approvals.",
    moduleKey: "director_reports",
    roles: ["admin", "director"],
    icon: BarChart3,
  },
  {
    href: "/director-reports/reports",
    label: "Director Reports",
    description: "Open print/PDF-ready and WhatsApp-ready report views.",
    moduleKey: "director_reports",
    roles: ["admin", "director"],
    icon: BarChart3,
  },
]

function canShowShortcut(profile: CurrentProfile, shortcut: Shortcut) {
  const roleAllowed =
    !shortcut.roles || shortcut.roles.some((role) => profile.roles.includes(role))

  return roleAllowed && canAccessModule(profile, shortcut.moduleKey)
}

function hasAnyRole(profile: CurrentProfile, roles: UserRole[]) {
  return roles.some((role) => profile.roles.includes(role))
}

function orderedShortcuts(visibleShortcuts: Shortcut[], hrefs: string[]) {
  return hrefs
    .map((href) => visibleShortcuts.find((shortcut) => shortcut.href === href))
    .filter((shortcut): shortcut is Shortcut => Boolean(shortcut))
}

function hasVisibleShortcut(visibleShortcuts: Shortcut[], hrefs: string[]) {
  return hrefs.some((href) =>
    visibleShortcuts.some((shortcut) => shortcut.href === href)
  )
}

function firstVisibleHref(visibleShortcuts: Shortcut[], hrefs: string[]) {
  return hrefs.find((href) =>
    visibleShortcuts.some((shortcut) => shortcut.href === href)
  )
}

function viewingScopeText(profile: CurrentProfile) {
  if (profile.roles.includes("admin") || profile.roles.includes("director")) {
    return "All outlets / departments / teams"
  }

  if (!profile.outletId && !profile.departmentId && !profile.stockLocationId) {
    return "Profile scope missing"
  }

  return [
    profile.outletName ?? "Assigned outlet",
    profile.departmentName ?? "Assigned department",
    profile.stockLocationName ?? "Assigned team",
  ].join(" / ")
}

function ShortcutCard({
  shortcut,
  large = false,
}: {
  shortcut: Shortcut
  large?: boolean
}) {
  const Icon = shortcut.icon

  return (
    <Link key={shortcut.href} href={shortcut.href} className="block h-full">
      <Card className="h-full border-border/70 transition-colors hover:bg-muted/40">
        <CardHeader className={large ? "space-y-3" : "flex flex-row items-start gap-3 space-y-0"}>
          <div
            className={
              large
                ? "flex size-12 items-center justify-center rounded-md border bg-emerald-50 text-emerald-700"
                : "rounded-md border p-2"
            }
          >
            <Icon className={large ? "size-6" : "size-4"} />
          </div>
          <div className="min-w-0">
            <CardTitle className={large ? "text-lg" : "text-base"}>
              {large ? shortcut.workerLabel ?? shortcut.label : shortcut.label}
            </CardTitle>
            <CardDescription className={large ? "mt-1 text-sm" : undefined}>
              {shortcut.description}
            </CardDescription>
          </div>
          {large && shortcut.nextStep ? (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="size-4 text-emerald-700" />
              {shortcut.nextStep}
            </div>
          ) : null}
        </CardHeader>
      </Card>
    </Link>
  )
}

function ShortcutActionLink({ shortcut }: { shortcut: Shortcut }) {
  const Icon = shortcut.icon

  return (
    <Link
      href={shortcut.href}
      className="flex min-h-16 items-start gap-3 rounded-md border px-3 py-3 text-sm transition-colors hover:bg-muted/40"
    >
      <span className="rounded-md border p-2">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{shortcut.label}</span>
        <span className="mt-1 block text-muted-foreground">
          {shortcut.description}
        </span>
      </span>
    </Link>
  )
}

const workerDailyActions: WorkerDailyAction[] = [
  {
    href: "/attendance/clock",
    label: "Clock In",
    description: "Start or end your shift.",
    nextStep: "Tap Clock In or Clock Out",
    icon: CalendarCheck,
  },
  {
    href: "/stock",
    label: "Stock",
    description: "Open stock work for your location.",
    nextStep: "Scan or choose stock task",
    icon: BarChart3,
  },
  {
    href: "/orders/create",
    label: "Order",
    description: "Create a customer order.",
    nextStep: "Choose customer",
    icon: ClipboardList,
  },
  {
    href: "/delivery/driver",
    label: "Delivery",
    description: "Open today delivery jobs.",
    nextStep: "Accept today job",
    icon: Truck,
  },
  {
    href: "/processing/dashboard",
    label: "Processing",
    description: "Record processing batch work.",
    nextStep: "Record raw and finished weight",
    icon: PackageCheck,
  },
  {
    href: "/cleaning/tasks",
    label: "Cleaning",
    description: "Complete assigned cleaning tasks.",
    nextStep: "Tap completed task",
    icon: ClipboardList,
  },
  {
    href: "/oa-actions/dashboard",
    label: "OA Action",
    description: "Submit claim, advance, leave, or payslip request.",
    nextStep: "Pick request type",
    icon: ClipboardList,
  },
]

function WorkerActionTile({
  action,
  shortcut,
}: {
  action: WorkerDailyAction
  shortcut?: Shortcut
}) {
  const Icon = action.icon
  const content = (
    <div
      className={`flex min-h-44 flex-col justify-between rounded-lg border p-4 ${
        shortcut
          ? "border-emerald-200 bg-emerald-50/70 transition-colors hover:bg-emerald-50"
          : "border-border bg-muted/30"
      }`}
    >
      <div className="space-y-3">
        <div
          className={`flex size-12 items-center justify-center rounded-md border ${
            shortcut
              ? "bg-background text-emerald-700"
              : "bg-background text-muted-foreground"
          }`}
        >
          <Icon className="size-6" />
        </div>
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold">{action.label}</h3>
            <Badge variant={shortcut ? "success" : "secondary"}>
              {shortcut ? "Open" : "Missing"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {action.description}
          </p>
        </div>
      </div>
      <div
        className={`mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
          shortcut ? "bg-background text-foreground" : "bg-background text-muted-foreground"
        }`}
      >
        <CheckCircle2
          className={`size-4 ${shortcut ? "text-emerald-700" : "text-muted-foreground"}`}
        />
        {shortcut ? action.nextStep : "Ask manager if this button is missing"}
      </div>
    </div>
  )

  if (!shortcut) {
    return content
  }

  return (
    <Link href={shortcut.href} className="block h-full">
      {content}
    </Link>
  )
}

function WorkerHome({
  profile,
  shortcuts,
}: {
  profile: CurrentProfile
  shortcuts: Shortcut[]
}) {
  const workerActionShortcuts = new Map(
    shortcuts.map((shortcut) => [shortcut.href, shortcut])
  )
  const availableWorkerActions = workerDailyActions.filter((action) =>
    workerActionShortcuts.has(action.href)
  )

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-emerald-50/70">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <MessageCircle className="size-4" />
            Worker home
          </div>
          <CardTitle className="text-xl">What do you need to do now?</CardTitle>
          <CardDescription className="text-emerald-950/70">
            Big buttons only. No finance, cost, stock value, or advanced reports.
          </CardDescription>
          <div className="grid gap-2 sm:grid-cols-4">
            {["Open workflow", "Follow guided steps", "Submit", "Next step shown"].map(
              (step) => (
                <div
                  key={step}
                  className="rounded-md bg-background/80 px-3 py-2 text-sm font-medium text-emerald-950"
                >
                  {step}
                </div>
              )
            )}
          </div>
          <p className="text-sm font-medium text-emerald-950">
            Viewing: {viewingScopeText(profile)}
          </p>
        </CardHeader>
      </Card>

      <section aria-labelledby="worker-daily-actions" className="space-y-3">
        <div>
          <h2 id="worker-daily-actions" className="text-lg font-semibold">
            Worker daily actions
          </h2>
          <p className="text-sm text-muted-foreground">
            Clock In, Stock, Order, Delivery, Processing, Cleaning, and OA Action
            stay in the same place every day.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {workerDailyActions.map((action) => (
            <WorkerActionTile
              key={action.href}
              action={action}
              shortcut={workerActionShortcuts.get(action.href)}
            />
          ))}
        </div>
      </section>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Visible buttons follow your role, outlet, department, team, and module
        access. Missing buttons are not active links.
      </div>

      {availableWorkerActions.length === 0 ? (
        <EmptyHomeState />
      ) : null}
    </div>
  )
}

function ManagerHome({
  profile,
  shortcuts,
}: {
  profile: CurrentProfile
  shortcuts: Shortcut[]
}) {
  const teamActivity = orderedShortcuts(shortcuts, [
    "/attendance/clock",
    "/retail/dashboard",
    "/processing/dashboard",
    "/delivery/dashboard",
    "/cleaning/tasks",
    "/oa-actions/dashboard",
  ])

  const managerRoutineSteps = [
    "Check missing tasks",
    "Open team activity",
    "Clear approvals",
    "Finish completion list",
  ]

  const managerActions = [
    {
      label: "Attendance gaps",
      detail: "Check who has not clocked in or out today.",
      priority: "Needs action",
      href: "/attendance/today",
      accessHrefs: ["/attendance/clock"],
    },
    {
      label: "Missing cleaning",
      detail: "Clear late or incomplete cleaning tasks.",
      priority: "Needs action",
      href: "/cleaning/tasks",
      accessHrefs: ["/cleaning/tasks"],
    },
    {
      label: "Review requests",
      detail: "Handle leave, claim, and advance approvals.",
      priority: "Approval",
      href: "/oa-actions/dashboard",
      accessHrefs: ["/oa-actions/dashboard"],
    },
    {
      label: "Delivery issues",
      detail: "Check failed, accepted, and proof-pending jobs.",
      priority: "Follow up",
      href: "/delivery/dashboard",
      accessHrefs: ["/delivery/dashboard"],
    },
    {
      label: "Yield alerts",
      detail: "Review submitted processing batches.",
      priority: "Check yield",
      href: "/processing/dashboard",
      accessHrefs: ["/processing/dashboard"],
    },
  ].filter((item) => hasVisibleShortcut(shortcuts, item.accessHrefs))

  const teamIssues = [
    {
      label: "Late attendance",
      detail: "Open attendance and confirm missing clock-in or clock-out.",
      href: "/attendance/today",
      accessHrefs: ["/attendance/clock"],
    },
    {
      label: "Missed cleaning",
      detail: "Open cleaning and clear late required tasks.",
      href: "/cleaning/tasks",
      accessHrefs: ["/cleaning/tasks"],
    },
    {
      label: "Failed delivery",
      detail: "Open delivery and check proof or return follow-up.",
      href: "/delivery/dashboard",
      accessHrefs: ["/delivery/dashboard"],
    },
    {
      label: "Abnormal yield",
      detail: "Open processing and review yield below target.",
      href: "/processing/dashboard",
      accessHrefs: ["/processing/dashboard"],
    },
    {
      label: "Approval waiting",
      detail: "Open OA Actions and clear pending manager review.",
      href: "/oa-actions/dashboard",
      accessHrefs: ["/oa-actions/dashboard"],
    },
  ].filter((item) => hasVisibleShortcut(shortcuts, item.accessHrefs))

  const completionItems = [
    {
      label: "Attendance",
      detail: "Clock in/out gaps checked",
      href: "/attendance/today",
      accessHrefs: ["/attendance/clock"],
    },
    {
      label: "Cleaning",
      detail: "Missing or late tasks reviewed",
      href: "/cleaning/tasks",
      accessHrefs: ["/cleaning/tasks"],
    },
    {
      label: "Processing",
      detail: "Yield alerts reviewed",
      href: "/processing/dashboard",
      accessHrefs: ["/processing/dashboard"],
    },
    {
      label: "Delivery",
      detail: "Failed and proof-pending jobs checked",
      href: "/delivery/dashboard",
      accessHrefs: ["/delivery/dashboard"],
    },
    {
      label: "OA Actions",
      detail: "Approvals queue cleared",
      href: "/oa-actions/dashboard",
      accessHrefs: ["/oa-actions/dashboard"],
    },
  ].filter((item) => hasVisibleShortcut(shortcuts, item.accessHrefs))

  const completionSweepSteps = [
    "Attendance checked",
    "Cleaning checked",
    "Approvals cleared",
    "Delivery issues checked",
  ]
  const managerActivityEmptySteps = [
    "Confirm module access",
    "Check team in person",
    "Ask admin if missing",
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Clock3 className="size-4" />
            Manager today board
          </div>
          <CardTitle>Action first</CardTitle>
          <CardDescription>
            Start with missing tasks, team issues, and approvals before normal review.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Today</Badge>
            <Badge variant="secondary">This week</Badge>
            <Badge variant="secondary">This month</Badge>
          </div>
          <p className="text-sm font-medium text-foreground">
            Scope: {viewingScopeText(profile)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {managerRoutineSteps.map((step, index) => (
              <div key={step} className="rounded-md border bg-background px-3 py-3">
                <div className="text-xs font-medium text-muted-foreground">
                  Step {index + 1}
                </div>
                <div className="mt-1 text-sm font-semibold">{step}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {managerActions.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-h-24 flex-col justify-between rounded-md border px-3 py-3 text-sm transition-colors hover:bg-muted/40"
              >
                <span>
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-semibold">{item.label}</span>
                    <Badge variant="warning">Priority</Badge>
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    {item.detail}
                  </span>
                  <span className="mt-2 inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                    {item.priority}
                  </span>
                </span>
                <span className="mt-3 inline-flex items-center gap-2 font-medium text-emerald-700">
                  Open review
                  <CheckCircle2 className="size-4" />
                </span>
              </Link>
            ))}
            {managerActions.length === 0 ? (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground xl:col-span-5">
                No manager actions are available for this profile. Ask admin to
                assign the needed module access.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <AlertTriangle className="size-4" />
            Team issues to clear today
          </div>
          <CardTitle>Watch list</CardTitle>
          <CardDescription>
            Use this as the daily manager route: open each issue area, clear the
            queue, then move to normal review.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {teamIssues.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">{item.label}</div>
                <Badge variant="outline">Check now</Badge>
              </div>
              <div className="mt-2 text-muted-foreground">{item.detail}</div>
            </Link>
          ))}
          {teamIssues.length === 0 ? (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground xl:col-span-5">
              No team issue shortcuts are available for this manager profile.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Clock3 className="size-4" />
              Today team activity
            </div>
            <CardTitle>Live work</CardTitle>
            <CardDescription>
              Open the team screens managers use during the day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {teamActivity.map((shortcut) => (
                <ShortcutActionLink key={shortcut.href} shortcut={shortcut} />
              ))}
              {teamActivity.length === 0 ? (
                <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground sm:col-span-2">
                  <div className="font-semibold text-foreground">
                    No team activity shortcuts are available
                  </div>
                  <p className="mt-1">
                    This manager profile has no visible team screens for today.
                    Check team status directly, then ask admin to confirm module
                    access if the shortcuts should be here.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {managerActivityEmptySteps.map((step) => (
                      <div
                        key={step}
                        className="rounded-md border bg-background px-3 py-2 font-medium text-foreground"
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ListChecks className="size-4" />
              Task completion list
            </div>
            <CardTitle>What to check today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border bg-emerald-50/70 p-3 text-sm text-emerald-950">
              <div className="font-semibold">Manager task completion sweep</div>
              <p className="mt-1">
                Finish today by clearing missing tasks before normal reports.
              </p>
              <div className="mt-3 grid gap-2">
                {completionSweepSteps.map((step) => (
                  <div
                    key={step}
                    className="flex items-center gap-2 rounded-md bg-background/80 px-3 py-2 font-medium"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
            {completionItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-h-14 items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
              >
                <CheckCircle2 className="size-5 shrink-0 text-emerald-700" />
                <span className="min-w-0">
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-muted-foreground">
                    {item.detail}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-emerald-700">
                    Open and clear
                  </span>
                </span>
              </Link>
            ))}
            {completionItems.length === 0 ? (
              <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                No completion checklist items are available for this profile.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DirectorHome({ shortcuts }: { shortcuts: Shortcut[] }) {
  const overview = [
    { label: "Sales", href: "/retail/dashboard", detail: "Outlet sales and cash control" },
    { label: "Stock", href: "/stock", detail: "Stock status, age, and alerts" },
    { label: "Orders", href: "/orders", detail: "Order volume and preparation status" },
    { label: "Delivery", href: "/delivery/dashboard", detail: "Today delivery progress" },
    { label: "Attendance", href: "/attendance/today", detail: "Team attendance view" },
    { label: "Cleaning", href: "/cleaning/tasks", detail: "Cleaning completion" },
    { label: "Processing", href: "/processing/dashboard", detail: "Yield and output review" },
    { label: "OA approvals", href: "/oa-actions/dashboard", detail: "Approval queue" },
  ].filter((item) => shortcuts.some((shortcut) => shortcut.href === item.href))

  const alertHref = firstVisibleHref(shortcuts, [
    "/director-reports/dashboard",
    "/oa-actions/dashboard",
    "/delivery/dashboard",
    "/processing/dashboard",
  ])
  const financeHref = firstVisibleHref(shortcuts, [
    "/accounting-finance/dashboard",
    "/director-reports/dashboard",
  ])

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50/60">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <ShieldCheck className="size-4" />
            Director all-in-one overview
          </div>
          <CardTitle>Company overview</CardTitle>
          <CardDescription className="text-amber-950/70">
            Sales, stock, orders, delivery, attendance, cleaning, processing, approvals, finance, and alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {alertHref ? (
            <Link
              href={alertHref}
              className="flex min-h-24 items-start gap-3 rounded-md border bg-background/80 p-3 text-sm transition-colors hover:bg-background"
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
              <span className="min-w-0">
                <span className="block font-semibold">Alerts first</span>
                <span className="mt-1 block text-muted-foreground">
                  Open company-level exceptions, approvals, failed delivery, and abnormal yield follow-up.
                </span>
              </span>
            </Link>
          ) : null}
          {financeHref ? (
            <Link
              href={financeHref}
              className="flex min-h-24 items-start gap-3 rounded-md border bg-background/80 p-3 text-sm transition-colors hover:bg-background"
            >
              <DollarSign className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <span className="min-w-0">
                <span className="block font-semibold">Finance/accounting</span>
                <span className="mt-1 block text-muted-foreground">
                  Review AR, AP, claims, advances, payments, and cash control.
                </span>
              </span>
            </Link>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <BarChart3 className="size-4" />
            Director daily sections
          </div>
          <CardTitle>Open a company area</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="font-semibold">{item.label}</div>
              <div className="mt-1 text-muted-foreground">{item.detail}</div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function AdminAccountHome({ shortcuts }: { shortcuts: Shortcut[] }) {
  const controlShortcuts = orderedShortcuts(shortcuts, [
    "/accounting-finance/dashboard",
    "/orders",
    "/retail/dashboard",
    "/delivery/dashboard",
    "/oa-actions/dashboard",
    "/whatsapp-crm",
    "/director-reports/dashboard",
  ])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <UserCog className="size-4" />
          Admin and account controls
        </div>
        <CardTitle>Operational review</CardTitle>
        <CardDescription>
          Review finance, orders, retail controls, delivery issues, approvals, and customer messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {controlShortcuts.map((shortcut) => (
          <ShortcutActionLink key={shortcut.href} shortcut={shortcut} />
        ))}
      </CardContent>
    </Card>
  )
}

function EmptyHomeState() {
  return (
    <Card>
      <CardContent className="flex gap-3 py-8 text-sm text-muted-foreground">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" />
        <span>
          No shortcuts are available for this profile yet. Ask admin to assign an
          outlet, department, role, or module access.
        </span>
      </CardContent>
    </Card>
  )
}

export function HomePage({ profile }: { profile: CurrentProfile }) {
  const visibleShortcuts = shortcuts.filter((shortcut) =>
    canShowShortcut(profile, shortcut)
  )
  const isDirector = profile.roles.includes("director")
  const isAdminOrAccount =
    profile.roles.includes("admin") ||
    profile.roles.includes("account") ||
    profile.roles.includes("owner")
  const isManager = hasAnyRole(profile, managerRoles)
  const isWorker = hasAnyRole(profile, workerRoles)
  const showGenericShortcuts =
    !isWorker || isManager || isAdminOrAccount || isDirector

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Home
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Start the workflows available for your assigned role and scope.
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            Viewing: {viewingScopeText(profile)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TeamScopeBadge profile={profile} />
          {profile.demoMode ? <Badge variant="warning">Demo data</Badge> : null}
        </div>
      </div>

      {isWorker ? (
        <WorkerHome profile={profile} shortcuts={visibleShortcuts} />
      ) : null}

      {isManager ? (
        <ManagerHome profile={profile} shortcuts={visibleShortcuts} />
      ) : null}

      {isDirector ? <DirectorHome shortcuts={visibleShortcuts} /> : null}

      {isAdminOrAccount ? <AdminAccountHome shortcuts={visibleShortcuts} /> : null}

      {showGenericShortcuts ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleShortcuts.map((shortcut) => (
            <ShortcutCard key={shortcut.href} shortcut={shortcut} />
          ))}
        </div>
      ) : null}

      {visibleShortcuts.length === 0 ? <EmptyHomeState /> : null}
    </div>
  )
}
