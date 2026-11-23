"use client"

import { useEffect } from "react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled page error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-serif text-5xl">Something went wrong</h1>
          <p className="mt-4 text-muted-foreground">
            An unexpected error occurred. This has been logged and we&apos;ll
            look into it.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button onClick={reset} nativeButton={false} render={<button />}>
              Try again
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/" />}
            >
              Back to home
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
