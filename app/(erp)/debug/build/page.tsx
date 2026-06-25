import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = "force-dynamic"

function text(value: string | undefined) {
  return value && value.length > 0 ? value : "unknown"
}

function supabaseRef() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!rawUrl) {
    return "unknown"
  }

  try {
    const host = new URL(rawUrl).hostname

    return host.endsWith(".supabase.co") ? host.split(".")[0] : host
  } catch {
    return "invalid-url"
  }
}

export default function BuildDebugPage() {
  const rows = [
    ["Environment", text(process.env.VERCEL_ENV ?? process.env.NODE_ENV)],
    ["Branch", text(process.env.VERCEL_GIT_COMMIT_REF)],
    ["Commit", text(process.env.VERCEL_GIT_COMMIT_SHA)],
    ["Deployment URL", text(process.env.VERCEL_URL)],
    ["Supabase ref", supabaseRef()],
  ]

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Build Debug</h1>
        <p className="text-sm text-muted-foreground">
          Use this page to spot stale Delivery V1 deployments quickly.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Runtime Identity</CardTitle>
          <CardDescription>
            Public build metadata only. No secrets are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-medium text-muted-foreground">{label}</dt>
                <dd className="break-all font-mono">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </main>
  )
}
