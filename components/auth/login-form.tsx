"use client"

import { LogIn } from "lucide-react"
import { useActionState } from "react"

import type { AuthActionState } from "@/lib/auth/action-state"
import { signInAction } from "@/lib/auth/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: AuthActionState = {}

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, initialState)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Staff sign in</CardTitle>
        <CardDescription>
          Use your assigned staff account. Your role controls what you can open.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="min-h-12 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="min-h-12 text-base"
              required
            />
          </div>

          {state.error ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {state.error}
            </div>
          ) : null}

          <Button type="submit" className="min-h-12 w-full" disabled={pending}>
            <LogIn className="size-4" />
            {pending ? "Signing in..." : "Open ERP"}
          </Button>
          <p className="text-sm leading-6 text-muted-foreground">
            Missing a module after sign in? Ask your manager or admin to check
            your role and outlet access.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
