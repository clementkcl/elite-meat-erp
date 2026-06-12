"use client"

import {
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck,
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Menu,
  PackageCheck,
  Receipt,
  Settings,
  Truck,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ComponentType, type ReactNode } from "react"

import { signOutAction } from "@/lib/auth/actions"
import { canAccessModule, type ModuleKey } from "@/lib/auth/access"
import type { CurrentProfile, UserRole } from "@/lib/auth/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModuleAccessState } from "@/components/erp/module-access-state"
import { TeamScopeBadge } from "@/components/erp/team-scope-badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  roles?: UserRole[]
  moduleKey?: ModuleKey
}

type NavGroup = {
  label: string
  items: NavItem[]
}

type RouteAccess = {
  prefix: string
  moduleKey?: ModuleKey
  moduleName: string
  roles?: UserRole[]
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

const stockOperatorRoles: UserRole[] = stockRoles.filter(
  (role) => role !== "director"
)

const orderRoles: UserRole[] = [
  "retail_team_general_worker",
  "retail_manager",
  "processing_team_general_worker",
  "processing_manager",
  "admin",
  "director",
]

const dashboardNav: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
  },
]

const stockNav: NavItem[] = [
  {
    href: "/stock/dashboard",
    label: "Stock Dashboard",
    icon: BarChart3,
    roles: stockRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/items",
    label: "Items",
    icon: Boxes,
    roles: stockRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/inbound",
    label: "Inbound",
    icon: PackageCheck,
    roles: stockOperatorRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/outbound",
    label: "Outbound Sales",
    icon: Receipt,
    roles: stockOperatorRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/transfer",
    label: "Transfer",
    icon: Truck,
    roles: stockOperatorRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/receive-transfer",
    label: "Receive Transfer",
    icon: Truck,
    roles: stockOperatorRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/return",
    label: "Return",
    icon: ClipboardList,
    roles: stockOperatorRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/no-barcode-inbound",
    label: "No-Barcode Inbound",
    icon: PackageCheck,
    roles: stockOperatorRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/balance",
    label: "Balance",
    icon: Boxes,
    roles: stockRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/movements",
    label: "Movements",
    icon: FileText,
    roles: stockRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/stock-take",
    label: "Stock Take",
    icon: ClipboardList,
    roles: stockRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/reports",
    label: "Reports",
    icon: BarChart3,
    roles: stockRoles,
    moduleKey: "stock",
  },
  {
    href: "/stock/settings",
    label: "Stock Settings",
    icon: Settings,
    roles: ["admin", "director"],
    moduleKey: "stock",
  },
]

const orderNav: NavItem[] = [
  {
    href: "/orders",
    label: "Orders",
    icon: ClipboardList,
    roles: orderRoles,
    moduleKey: "orders",
  },
]

const attendanceNav: NavItem[] = [
  {
    href: "/attendance/today",
    label: "Attendance",
    icon: CalendarCheck,
    moduleKey: "attendance",
  },
]

const oaNav: NavItem[] = [
  {
    href: "/oa-actions/dashboard",
    label: "OA Actions",
    icon: ClipboardList,
    moduleKey: "oa_actions",
  },
]

const retailNav: NavItem[] = [
  {
    href: "/retail/dashboard",
    label: "Retail",
    icon: Building2,
    moduleKey: "retail",
    roles: [
      "retail_team_general_worker",
      "retail_manager",
      "account",
      "admin",
      "director",
    ],
  },
]

const deliveryNav: NavItem[] = [
  {
    href: "/delivery/dashboard",
    label: "Delivery",
    icon: Truck,
    moduleKey: "delivery",
    roles: ["delivery_team_general_worker", "delivery_manager", "admin", "director"],
  },
]

const accountingNav: NavItem[] = [
  {
    href: "/accounting-finance/dashboard",
    label: "Accounting & Finance",
    icon: DollarSign,
    moduleKey: "accounting_finance",
    roles: ["account", "admin", "director"],
  },
]

const directorNav: NavItem[] = [
  {
    href: "/director-reports/dashboard",
    label: "Director Reports",
    icon: Users,
    moduleKey: "director_reports",
    roles: ["director", "admin"],
  },
]

const settingsNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
]

const moduleNav: NavItem[] = [
  ...orderNav,
  ...attendanceNav,
  ...oaNav,
  ...retailNav,
  {
    href: "/processing/dashboard",
    label: "Processing",
    icon: PackageCheck,
    moduleKey: "processing",
    roles: [
      "processing_team_general_worker",
      "processing_manager",
      "admin",
      "director",
    ],
  },
  {
    href: "/cleaning/tasks",
    label: "Cleaning",
    icon: ClipboardList,
    moduleKey: "cleaning",
    roles: [
      "retail_team_general_worker",
      "retail_manager",
      "processing_team_general_worker",
      "processing_manager",
      "admin",
      "director",
    ],
  },
  ...deliveryNav,
  ...accountingNav,
  ...directorNav,
  ...settingsNav,
]

const routeAccess: RouteAccess[] = [
  {
    prefix: "/stock/inbound",
    moduleKey: "stock",
    moduleName: "Stock Inbound",
    roles: stockOperatorRoles,
  },
  {
    prefix: "/stock/outbound",
    moduleKey: "stock",
    moduleName: "Stock Outbound",
    roles: stockOperatorRoles,
  },
  {
    prefix: "/stock/transfer",
    moduleKey: "stock",
    moduleName: "Stock Transfer",
    roles: stockOperatorRoles,
  },
  {
    prefix: "/stock/receive-transfer",
    moduleKey: "stock",
    moduleName: "Receive Transfer",
    roles: stockOperatorRoles,
  },
  {
    prefix: "/stock/return",
    moduleKey: "stock",
    moduleName: "Stock Return",
    roles: stockOperatorRoles,
  },
  {
    prefix: "/stock/no-barcode-inbound",
    moduleKey: "stock",
    moduleName: "No-Barcode Inbound",
    roles: stockOperatorRoles,
  },
  {
    prefix: "/stock",
    moduleKey: "stock",
    moduleName: "Stock",
    roles: stockRoles,
  },
  {
    prefix: "/orders",
    moduleKey: "orders",
    moduleName: "Orders",
    roles: orderRoles,
  },
  { prefix: "/attendance", moduleKey: "attendance", moduleName: "Attendance" },
  { prefix: "/oa-actions", moduleKey: "oa_actions", moduleName: "OA Actions" },
  { prefix: "/oa", moduleKey: "oa_actions", moduleName: "OA Actions" },
  {
    prefix: "/retail",
    moduleKey: "retail",
    moduleName: "Retail",
    roles: [
      "retail_team_general_worker",
      "retail_manager",
      "account",
      "admin",
      "director",
    ],
  },
  {
    prefix: "/processing",
    moduleKey: "processing",
    moduleName: "Processing",
    roles: [
      "processing_team_general_worker",
      "processing_manager",
      "admin",
      "director",
    ],
  },
  {
    prefix: "/cleaning",
    moduleKey: "cleaning",
    moduleName: "Cleaning",
    roles: [
      "retail_team_general_worker",
      "retail_manager",
      "processing_team_general_worker",
      "processing_manager",
      "admin",
      "director",
    ],
  },
  {
    prefix: "/delivery",
    moduleKey: "delivery",
    moduleName: "Delivery",
    roles: ["delivery_team_general_worker", "delivery_manager", "admin", "director"],
  },
  {
    prefix: "/accounting-finance",
    moduleKey: "accounting_finance",
    moduleName: "Accounting & Finance",
    roles: ["account", "admin", "director"],
  },
  {
    prefix: "/accounting",
    moduleKey: "accounting_finance",
    moduleName: "Accounting & Finance",
    roles: ["account", "admin", "director"],
  },
  {
    prefix: "/director-reports",
    moduleKey: "director_reports",
    moduleName: "Director Reports",
    roles: ["director", "admin"],
  },
  {
    prefix: "/director",
    moduleKey: "director_reports",
    moduleName: "Director Reports",
    roles: ["director", "admin"],
  },
  { prefix: "/settings", moduleName: "Settings", roles: ["admin"] },
]

function canSee(profile: CurrentProfile, item: NavItem) {
  const roleAllowed =
    !item.roles || item.roles.some((role) => profile.roles.includes(role))

  return roleAllowed && canAccessModule(profile, item.moduleKey)
}

function currentPageLabel(pathname: string) {
  const visibleItems = [...dashboardNav, ...stockNav, ...moduleNav]
  const exact = visibleItems.find((item) => pathname === item.href)

  if (exact) {
    return exact.label
  }

  const matched = visibleItems
    .filter((item) => item.href !== "/" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]

  if (matched) {
    return matched.label
  }

  const segment = pathname.split("/").filter(Boolean)[0]

  return segment
    ? segment
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Dashboard"
}

function routeAccessForPath(pathname: string) {
  return routeAccess
    .filter(
      (route) =>
        pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
    )
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]
}

function canAccessRoute(profile: CurrentProfile, route: RouteAccess | undefined) {
  if (!route) {
    return true
  }

  const roleAllowed =
    !route.roles || route.roles.some((role) => profile.roles.includes(role))

  return roleAllowed && canAccessModule(profile, route.moduleKey)
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname()
  const Icon = item.icon
  const active =
    pathname === item.href ||
    (item.href !== "/stock/dashboard" && pathname.startsWith(item.href))

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/74 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <span
        className={cn(
          "absolute left-0 h-5 w-0.5 rounded-r bg-transparent transition-colors",
          active && "bg-sidebar-primary"
        )}
      />
      <Icon className={cn("size-4 text-sidebar-foreground/62", active && "text-sidebar-primary")} />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function SidebarContent({
  profile,
  close,
}: {
  profile: CurrentProfile
  close?: () => void
}) {
  const navGroups: NavGroup[] = [
    { label: "Dashboard", items: dashboardNav },
    { label: "Stock", items: stockNav },
    { label: "Orders", items: orderNav },
    { label: "Attendance", items: attendanceNav },
    { label: "OA Actions", items: oaNav },
    { label: "Retail", items: retailNav },
    {
      label: "Processing",
      items: moduleNav.filter((item) => item.href.startsWith("/processing")),
    },
    {
      label: "Cleaning",
      items: moduleNav.filter((item) => item.href.startsWith("/cleaning")),
    },
    { label: "Delivery", items: deliveryNav },
    { label: "Accounting", items: accountingNav },
    { label: "Director", items: directorNav },
    { label: "Settings", items: settingsNav },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSee(profile, item)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="text-base font-semibold tracking-tight text-sidebar-foreground">
          Elite Meat ERP
        </div>
        <div className="mt-1 text-xs text-sidebar-foreground/58">
          Operations workspace
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} onClick={close} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="truncate text-sm font-medium text-sidebar-foreground">
          {profile.fullName}
        </div>
        <div className="truncate text-xs text-sidebar-foreground/60">
          {profile.email}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <TeamScopeBadge profile={profile} className="text-[10px]" />
          {profile.roles.map((role) => (
            <Badge key={role} variant="secondary" className="text-[10px]">
              {role.replaceAll("_", " ")}
            </Badge>
          ))}
          {profile.demoMode ? (
            <Badge variant="warning" className="text-[10px]">
              demo
            </Badge>
          ) : null}
        </div>
        <form action={signOutAction} className="mt-3">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Sign out
          </Button>
        </form>
      </div>
    </div>
  )
}

export function AppShell({
  children,
  profile,
}: {
  children: ReactNode
  profile: CurrentProfile
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const pageLabel = currentPageLabel(pathname)
  const routeGate = routeAccessForPath(pathname)
  const canAccessCurrentRoute = canAccessRoute(profile, routeGate)

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent profile={profile} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b bg-background/92 px-8 backdrop-blur lg:flex">
          <div>
            <div className="text-sm font-semibold">Elite Meat ERP</div>
            <div className="text-xs text-muted-foreground">
              {profile.fullName}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <TeamScopeBadge profile={profile} />
            {profile.demoMode ? <Badge variant="warning">Demo data</Badge> : null}
          </div>
        </header>
        <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b bg-background/92 px-3 backdrop-blur sm:px-4 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-controls="erp-mobile-navigation"
              aria-expanded={open}
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-4" />
            </Button>
            <SheetContent
              id="erp-mobile-navigation"
              side="left"
              className="p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Elite Meat ERP navigation</SheetTitle>
                <SheetDescription>
                  Module navigation and account actions.
                </SheetDescription>
              </SheetHeader>
              <SidebarContent
                profile={profile}
                close={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Elite Meat ERP</div>
            <div className="truncate text-xs text-muted-foreground">
              {pageLabel}
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-1">
            <div className="hidden min-w-0 max-w-28 text-right min-[390px]:block">
              <div className="truncate text-xs font-medium">
                {profile.fullName}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {profile.demoMode ? "Demo" : profile.roles[0]?.replaceAll("_", " ")}
              </div>
            </div>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="outline"
                size="icon"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {canAccessCurrentRoute ? (
            children
          ) : (
            <ModuleAccessState moduleName={routeGate?.moduleName ?? "Module"} />
          )}
        </main>
      </div>
    </div>
  )
}
