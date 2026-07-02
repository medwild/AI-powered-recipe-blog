"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  CheckCircle2,
  CircleDashed,
  XCircle,
  Ban,
  ThumbsUp,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  publishRecipe,
  unpublishRecipe,
  deleteRecipe,
  cancelRecipe,
  approveRecipe,
} from "@/app/actions/recipes"
import type { Recipe, WorkflowLogEntry } from "@/lib/db/schema"

const STATUS_STYLES: Record<string, string> = {
  published: "bg-accent text-accent-foreground",
  draft: "bg-secondary text-secondary-foreground",
  generating: "bg-primary/15 text-primary",
  draft_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  error: "bg-destructive/15 text-destructive",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
}

const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  generating: "Generating",
  draft_review: "To approve",
  approved: "Approved",
  error: "Error",
  failed: "Failed",
  cancelled: "Cancelled",
  expired: "Expired",
}

function LogIcon({ status }: { status: WorkflowLogEntry["status"] }) {
  if (status === "done")
    return <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
  if (status === "error")
    return <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
  return <CircleDashed className="h-4 w-4 text-primary" aria-hidden="true" />
}

export function RecipeRow({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const log = recipe.workflowLog ?? []

  function run(action: () => Promise<void>, message: string) {
    startTransition(async () => {
      try {
        await action()
        toast.success(message)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            {recipe.heroImageUrl ? (
              <Image
                src={recipe.heroImageUrl || "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{recipe.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {recipe.keyword}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              STATUS_STYLES[recipe.status] ?? STATUS_STYLES.draft
            }`}
          >
            {STATUS_LABELS[recipe.status] ?? recipe.status}
          </span>

          {recipe.status === "generating" ? (
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              title="Cancel generation"
              onClick={() =>
                run(() => cancelRecipe(recipe.id), "Generation cancelled")
              }
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Ban className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="sr-only">Cancel</span>
            </Button>
          ) : null}

          {recipe.status === "draft_review" ? (
            <Button
              variant="default"
              size="sm"
              disabled={pending}
              title="Approve and generate image"
              onClick={() =>
                run(
                  () => approveRecipe(recipe.id),
                  "Recipe approved — image generation in progress",
                )
              }
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="ml-1.5">Approve & Image</span>
            </Button>
          ) : null}

          {recipe.status === "published" || recipe.status === "draft" ? (
            <Button
              variant="ghost"
              size="icon"
              title="View recipe"
              nativeButton={false}
              render={
                <Link href={`/recettes/${recipe.slug}`} target="_blank" />
              }
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">View recipe</span>
            </Button>
          ) : null}

          {recipe.status === "published" ? (
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              title="Unpublish"
              onClick={() =>
                run(() => unpublishRecipe(recipe.id), "Recipe unpublished")
              }
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Unpublish</span>
            </Button>
          ) : recipe.status === "draft" ? (
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              title="Publish"
              onClick={() =>
                run(async () => {
                  const result = await publishRecipe(recipe.id)
                  if (!result.ok && result.error) {
                    throw new Error(result.error)
                  }
                }, "Recipe published")
              }
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Publish</span>
            </Button>
          ) : null}

          {recipe.status !== "generating" ? (
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              title="Delete"
              onClick={() =>
                run(() => deleteRecipe(recipe.id), "Recipe deleted")
              }
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
              )}
              <span className="sr-only">Delete</span>
            </Button>
          ) : null}

          {log.length > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              title="Workflow log"
              onClick={() => setOpen((o) => !o)}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
              <span className="sr-only">Show log</span>
            </Button>
          ) : null}
        </div>
      </div>

      {open && log.length > 0 ? (
        <div className="border-t border-border bg-secondary/30 px-4 py-3">
          <ul className="flex flex-col gap-2">
            {log.map((entry, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <LogIcon status={entry.status} />
                <span className="font-medium">{entry.agent}</span>
                <span className="text-muted-foreground">— {entry.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}