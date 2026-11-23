"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogIn, Loader2 } from "lucide-react"

export function LoginForm({ initialError }: { initialError?: string | null }) {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return

    const formData = new FormData(e.currentTarget)
    const submittedToken = (token || String(formData.get("token") ?? "")).trim()
    if (!submittedToken) {
      setError("Please enter the dashboard access token.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: submittedToken }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Invalid token.")
        setSubmitting(false)
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Network error while signing in.")
      setSubmitting(false)
    }
  }

  return (
    <form
      method="post"
      action="/api/auth/login"
      onSubmit={handleSubmit}
      data-hydrated={hydrated ? "true" : "false"}
      className="mt-6 flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="token" className="text-sm font-medium leading-none">
          Access token
        </label>
        <input
          id="token"
          name="token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter token..."
          autoComplete="current-password"
          autoFocus
          required
          disabled={submitting}
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
        disabled={submitting}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden="true" />
        )}
        Access dashboard
      </button>
    </form>
  )
}
