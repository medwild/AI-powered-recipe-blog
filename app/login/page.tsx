import type { Metadata } from "next"
import { LoginForm } from "@/components/login-form"

// Admin login — must not be indexed (internal tool, not content).
export const metadata: Metadata = {
  title: "Editorial Studio — Login",
  robots: "noindex, nofollow",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const errorMap: Record<string, string> = {
    invalid: "Invalid token.",
    config: "Server not configured.",
    rate_limit: "Too many login attempts. Try again in a minute.",
  }
  const error = params.error ? (errorMap[params.error] ?? "Authentication failed.") : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-serif text-2xl">Editorial Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the dashboard access token.
        </p>

        <LoginForm initialError={error} />
      </div>
    </div>
  )
}
