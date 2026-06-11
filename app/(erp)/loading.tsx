export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-md border bg-card"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-md border bg-card" />
    </div>
  )
}
