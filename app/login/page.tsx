import { LogIn } from "lucide-react"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error ? decodeURIComponent(params.error) : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-serif text-2xl">Editorial Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the dashboard access token.
        </p>

        <form action="/api/auth/login" method="GET" className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="token" className="text-sm font-medium leading-none">
              Access token
            </label>
            <input
              id="token"
              name="token"
              type="password"
              placeholder="Enter token..."
              autoFocus
              required
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Access dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
