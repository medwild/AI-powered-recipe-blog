export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-16 border-b border-border bg-card" />
      <div className="flex-1">
        <div className="border-b border-border">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
            <div className="flex flex-col gap-6">
              <div className="h-6 w-48 animate-pulse rounded-full bg-muted" />
              <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
              <div className="h-12 w-3/4 animate-pulse rounded-lg bg-muted" />
              <div className="h-6 w-full animate-pulse rounded bg-muted" />
              <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
              <div className="flex gap-3">
                <div className="h-11 w-44 animate-pulse rounded-lg bg-muted" />
                <div className="h-11 w-36 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
            <div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 py-14">
          <div className="mb-8 h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}