"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 150 // 150 × 2s = 5 min max (matches maxDuration)

export function RecipeGenerator() {
  const router = useRouter()
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)
  const mountedRef = useRef(true)

  // Cleanup polling on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    const value = keyword.trim()
    if (!value) return

    setLoading(true)
    setKeyword("")
    attemptsRef.current = 0

    const toastId = toast.loading("Workflow started", {
      description: "SERP analysis in progress...",
    })

    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: value }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Generation failed.")
      }

      // Start polling — the API returns immediately with status "generating"
      pollStatus(data.id, toastId)
    } catch (err) {
      toast.error("Error", { id: toastId, description: (err as Error).message })
      setLoading(false)
    }
  }

  async function pollStatus(recipeId: number, toastId: string | number) {
    if (!mountedRef.current) return

    if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
      if (mountedRef.current) {
        toast.error("Timeout", {
          id: toastId,
          description: "The workflow took too long. Check the status in the list.",
        })
        setLoading(false)
        startTransition(() => router.refresh())
      }
      return
    }

    try {
      const res = await fetch(`/api/recipes/${recipeId}/status`)
      if (!res.ok) throw new Error("Status unavailable")
      const data = await res.json()

      if (!mountedRef.current) return

      const logs: { agent: string; message: string }[] = data.workflowLog ?? []
      const lastLog = logs[logs.length - 1]

      if (data.status === "draft") {
        const agent = lastLog?.agent
        toast.success("Draft ready", {
          id: toastId,
          description: agent
            ? `Last step: ${agent}`
            : "Review the recipe then publish it.",
        })
        setLoading(false)
        startTransition(() => router.refresh())
        return
      }

      if (data.status === "draft_review") {
        toast.info("Awaiting approval", {
          id: toastId,
          description:
            "The draft is ready. Approve it from the dashboard to generate the image.",
        })
        setLoading(false)
        startTransition(() => router.refresh())
        return
      }

      if (data.status === "error" || data.status === "failed") {
        const errorMsg = lastLog?.message || "Unknown error"
        toast.error("Workflow error", {
          id: toastId,
          description: errorMsg,
        })
        setLoading(false)
        startTransition(() => router.refresh())
        return
      }

      if (data.status === "cancelled") {
        toast.info("Generation cancelled", {
          id: toastId,
          description: "The generation has been cancelled.",
        })
        setLoading(false)
        startTransition(() => router.refresh())
        return
      }

      if (data.status === "expired") {
        toast.error("Approval deadline exceeded", {
          id: toastId,
          description: "The recipe expired due to lack of approval within 7 days.",
        })
        setLoading(false)
        startTransition(() => router.refresh())
        return
      }

      // Still generating — update toast with latest progress
      attemptsRef.current++
      if (lastLog) {
        toast.loading("Generating...", {
          id: toastId,
          description: `${lastLog.agent}: ${lastLog.message}`,
        })
      }

      // Continue polling after POLL_INTERVAL_MS
      pollingRef.current = setTimeout(
        () => pollStatus(recipeId, toastId),
        POLL_INTERVAL_MS,
      )
    } catch {
      if (mountedRef.current) {
        toast.error("Tracking error", {
          id: toastId,
          description: "Unable to retrieve the generation status.",
        })
        setLoading(false)
      }
    }
  }

  return (
    <form
      onSubmit={handleGenerate}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <Label htmlFor="keyword" className="text-base font-medium">
        Generate a recipe from a keyword
      </Label>
      <p className="mt-1 text-sm text-muted-foreground">
        Agents analyze Google (SERP), write an SEO article and create a
        dish image.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input
          id="keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g. easy apple tart"
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !keyword.trim()} size="lg">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate
            </>
          )}
        </Button>
      </div>
    </form>
  )
}