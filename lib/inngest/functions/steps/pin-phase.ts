/**
 * Step 14 — Pin Designer phase.
 * Generates Pinterest Pins using the PTRA framework and inserts draft rows.
 */

import { db } from "@/lib/db"
import { pinDrafts, pinAnalytics } from "@/lib/db/schema"
import type { ImageVariant } from "@/lib/db/schema"
import { slugify } from "@/lib/slug"
import { agentPinDesigner } from "../agents/pin-designer"
import { appendLog, logEntry, SITE_URL } from "../helpers"
import type { RecipeDraft, SeoPlan } from "../agents/chef-augustin"

export async function generatePins(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number,
  finalRecipe: RecipeDraft,
  seoPlan: SeoPlan,
  heroImageUrl: string | null,
  imageVariants: ImageVariant[],
) {
  await step.run("pin-designer", async () => {
    const slug = slugify(finalRecipe.title ?? "recipe")
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL

    const pins = await agentPinDesigner({
      recipeTitle: finalRecipe.title ?? "",
      recipeSlug: slug,
      recipeUrl: `${siteUrl}/recettes/${slug}`,
      recipeExcerpt: finalRecipe.excerpt ?? "",
      heroImageUrl: heroImageUrl ?? "",
      imageVariants: imageVariants ?? [],
      ingredients: (finalRecipe.ingredients ?? []) as { name: string; quantity?: string }[],
      tags: finalRecipe.tags ?? [],
      seoPlan,
      microNiche: "Easy Weeknight Dinners for Two",
      targetCountry: process.env.SERP_GL || "us",
    })

    // Batch insert all valid Pins
    const now = new Date()
    const rows = pins.map((pin, idx) => ({
      recipeId,
      pinTitle: pin.pin_title,
      overlayText: pin.overlay_text,
      description: pin.description,
      imagePrompt: pin.image_prompt,
      board: pin.board,
      intent: pin.intent,
      ptraScore: pin.ptra_score,
      hashtags: pin.hashtags ?? [],
      variantIndex: idx,
      status: "draft" as const,
      createdAt: now,
      updatedAt: now,
    }))

    await db.insert(pinDrafts).values(rows)

    // Insert pin_analytics records with UTM tracking
    const analyticsRows = rows.map((row, idx) => ({
      recipeId,
      board: row.board,
      boardSlug: slugify(row.board),
      pinIndex: idx,
      pinTitle: row.pinTitle,
      overlayHook: row.overlayText,
      intent: row.intent,
      utmSource: "pinterest",
      utmMedium: "pin",
      utmCampaign: slugify(row.board),
      utmContent: `pin_${idx}`,
      publishStatus: "draft" as const,
      createdAt: now,
      updatedAt: now,
    }))
    await db.insert(pinAnalytics).values(analyticsRows)

    const avgScore = Math.round(
      pins.reduce((sum, p) => sum + p.ptra_score, 0) / pins.length,
    )

    await appendLog(
      recipeId,
      logEntry(
        "Pin Designer",
        "done",
        `${pins.length} Pins generated | Avg PTRA: ${avgScore}/100 | Intents: ${pins.map(p => p.intent).join(", ")} | UTM tracking active`,
      ),
    )
  })
}
