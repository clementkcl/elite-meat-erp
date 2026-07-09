import { redirect } from "next/navigation"
import {
  Barcode,
  ClipboardList,
  Clock,
  Factory,
  ShieldCheck,
  Truck,
} from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { getCurrentProfile } from "@/lib/auth/session"

const staffWorkflows = [
  { label: "Clock", icon: Clock },
  { label: "Stock", icon: Barcode },
  { label: "Orders", icon: ClipboardList },
  { label: "Delivery", icon: Truck },
  { label: "Processing", icon: Factory },
]

export default async function LoginPage() {
  const profile = await getCurrentProfile()

  if (profile && !profile.demoMode) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:py-10">
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-[minmax(0,1fr)_28rem] md:items-center">
        <section className="space-y-5">
          <div className="inline-flex rounded-md bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
            Elite Meat ERP
          </div>
          <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Start your work day from one ERP.
          </h1>
          <p className="max-w-lg text-base leading-7 text-muted-foreground">
            Staff, managers, account, admin, and director users sign in here.
            Each account only shows the modules, outlet, department, and stock
            location assigned to it.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {staffWorkflows.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex min-h-12 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-card-foreground"
              >
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
            <div className="flex min-h-12 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-card-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              <span>OA</span>
            </div>
          </div>
        </section>
        <LoginForm />
      </div>
    </main>
  )
}
