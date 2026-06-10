"use client"

import {
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck,
  ClipboardList,
  DollarSign,
  FileText,
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
import type { CurrentProfile, UserRole } from "@/lib/auth/session"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  roles?: UserRole[]
}

const stockNav: NavItem[] = [
  { href: "/stock/dashboard", label: "Stock Dashboard", icon: BarChart3 },
  { href: "/stock/items", label: "Items", icon: Boxes },
  { href: "/stock/inbound", label: "Inbound", icon: PackageCheck },
  { href: "/stock/outbound", label: "Outbound Sales", icon: Receipt },
  { href: "/stock/transfer", label: "Transfer", icon: Truck },
  { href: "/stock/receive-transfer", label: "Receive Transfer", icon: Truck },
  { href: "/stock/return", label: "Return", icon: ClipboardList },
  {
    href: "/stock/no-barcode-inbound",
    label: "No-Barcode Inbound",
    icon: PackageCheck,
  },
  { href: "/stock/balance", label: "Balance", icon: Boxes },
  { href: "/stock/movements", label: "Movements", icon: FileText },
  { href: "/stock/stock-take", label: "Stock Take", icon: ClipboardList },
  { href: "/stock/reports", label: "Reports", icon: BarChart3 },
  { href: "/stock/settings", label: "Stock Settings", icon: Settings },
]

const moduleNav: NavItem[] = [
  { href: "/delivery", label: "Delivery", icon: Truck },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/oa-actions", label: "OA Actions", icon: ClipboardList },
  { href: "/retail", label: "Retail", icon: Building2 },
  {
    href: "/accounting-finance",
    label: "Accounting & Finance",
    icon: DollarSign,
    roles: ["account", "admin", "director"],
  },
  {
    href: "/director-reports",
    label: "Director Reports",
    icon: Users,
    roles: ["director", "admin"],
  },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
]

function canSee(profile: CurrentProfile, item: NavItem) {
  return !item.roles || item.roles.some((role) => profile.roles.includes(role))
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
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/78 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-4" />
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
  return (
    <div className="flex h-full flex-col gap-5">
      <div className="px-3 pt-4">
        <div className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          Elite Meat ERP
        </div>
        <div className="mt-1 text-xs text-sidebar-foreground/60">
          Core + Stock Module V1
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        <div>
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/45">
            Stock
          </div>
          <div className="space-y-1">
            {stockNav.map((item) => (
              <NavLink key={item.href} item={item} onClick={close} />
            ))}
          </div>
        </div>

        <div>
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/45">
            ERP Modules
          </div>
          <div className="space-y-1">
            {moduleNav.filter((item) => canSee(profile, item)).map((item) => (
              <NavLink key={item.href} item={item} onClick={close} />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="truncate text-sm font-medium text-sidebar-foreground">
          {profile.fullName}
        </div>
        <div className="truncate text-xs text-sidebar-foreground/60">
          {profile.email}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {profile.roles.map((role) => (
            <Badge key={role} variant="secondary" className="text-[10px]">
              {role.replace("_", " ")}
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

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent profile={profile} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-[min(88vw,20rem)] border-r border-sidebar-border bg-sidebar shadow-xl">
            <SidebarContent profile={profile} close={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/92 px-4 backdrop-blur sm:px-6 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <div className="text-sm font-semibold">Elite Meat ERP</div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  )
}
