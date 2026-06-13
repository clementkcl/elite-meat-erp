import {
  BarChart3,
  Building2,
  CalendarCheck,
  ClipboardList,
  DollarSign,
  PackageCheck,
  Truck,
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
  moduleKey?: ModuleKey
  roles?: UserRole[]
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
  "director",
]

const stockOperatorShortcutRoles: UserRole[] = stockRoles.filter(
  (role) => role !== "director"
)

const orderOperatorShortcutRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
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

const shortcuts: Shortcut[] = [
  {
    href: "/stock/dashboard",
    label: "Stock Dashboard",
    description: "Review stock totals, low stock, and recent movements.",
    moduleKey: "stock",
    roles: stockRoles,
    icon: BarChart3,
  },
  {
    href: "/attendance/clock",
    label: "Clock In / Out",
    description: "Record attendance for your assigned location.",
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
    roles: stockRoles,
    icon: BarChart3,
  },
  {
    href: "/orders/new",
    label: "Make Order",
    description: "Create a customer order for pickup or delivery.",
    moduleKey: "orders",
    roles: orderOperatorShortcutRoles,
    icon: ClipboardList,
  },
  {
    href: "/orders",
    label: "Order List",
    description: "Prepare, review, and track customer orders.",
    moduleKey: "orders",
    roles: [...orderOperatorShortcutRoles, "director"],
    icon: ClipboardList,
  },
  {
    href: "/orders/prepare",
    label: "Prepare Orders",
    description: "Record prepared quantity and weight for customer order items.",
    moduleKey: "orders",
    roles: orderOperatorShortcutRoles,
    icon: PackageCheck,
  },
  {
    href: "/processing/dashboard",
    label: "Processing Dashboard",
    description: "Record processing batches and yield/loss.",
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
    moduleKey: "cleaning",
    roles: cleaningRoles.filter((role) => role !== "director"),
    icon: ClipboardList,
  },
  {
    href: "/delivery/driver",
    label: "Driver Pickup List",
    description: "View delivery jobs ready for driver action.",
    moduleKey: "delivery",
    roles: ["delivery_team_general_worker", "delivery_manager", "admin"],
    icon: Truck,
  },
  {
    href: "/delivery/dashboard",
    label: "Delivery Dashboard",
    description: "Review active deliveries, vehicles, and payment follow-up.",
    moduleKey: "delivery",
    roles: ["delivery_team_general_worker", "delivery_manager", "admin", "director"],
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

export function HomePage({ profile }: { profile: CurrentProfile }) {
  const visibleShortcuts = shortcuts.filter((shortcut) =>
    canShowShortcut(profile, shortcut)
  )

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleShortcuts.map((shortcut) => {
          const Icon = shortcut.icon

          return (
            <Link key={shortcut.href} href={shortcut.href}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="rounded-md border p-2">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{shortcut.label}</CardTitle>
                    <CardDescription>{shortcut.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      {visibleShortcuts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No shortcuts are available for this profile yet. Ask admin to assign
            an outlet, department, role, or module access.
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
