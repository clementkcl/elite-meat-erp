import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { getCurrentProfile } from "@/lib/auth/session"

export default async function LoginPage() {
  const profile = await getCurrentProfile()

  if (profile && !profile.demoMode) {
    redirect("/stock/dashboard")
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 md:grid-cols-[1fr_28rem] md:items-center">
        <div className="space-y-4">
          <div className="inline-flex rounded-md bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
            Elite Meat ERP
          </div>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Stock control for barcode and no-barcode operations.
          </h1>
          <p className="max-w-lg text-base leading-7 text-muted-foreground">
            Sign in to manage item master data, inbound, outbound, transfers,
            stock take, reporting, and audit-ready movement history.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
