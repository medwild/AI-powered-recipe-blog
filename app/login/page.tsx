"use client"

import { useState } from "react"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Invalid token")
        setLoading(false)
        return
      }

      // Hard navigation pour garantir que le cookie est lu par le middleware
      window.location.assign("/dashboard")
    } catch {
      setError("Connection error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-serif text-2xl">Editorial Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the dashboard access token.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="token">Access token</Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter token..."
              disabled={loading}
              autoFocus
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={loading || !token.trim()}>
            <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
            {loading ? "Loading..." : "Access dashboard"}
          </Button>
        </form>
      </div>
    </div>
  )
}
