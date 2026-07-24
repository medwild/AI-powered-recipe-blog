/**
 * Step 3 — Persist (v14 simplified)
 *
 * slugify → save → sitemap ping
 *
 * The LLM generates JSON-LD, FAQ, and all structured data in the mega-skill.
 * This step only persists. [IMAGE:] replacement happens after image generation
 * (in generate-recipe.ts, Step 4), because the hero URL isn't ready yet.
 */

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { slugify } from "@/lib/slug"
import type { ChefAugustinOutput } from "../agents/chef-augustin"
import { appendLog, logEntry, SITE_URL } from "../helpers"

export async function persistFinalDraft(
  recipeId: number,
  finalRecipe: ChefAugustinOutput,
  gateStatus: "PASS" | "BLOCK",
  degraded: boolean,
): Promise<void> {
  // Keep the recipe's existing slug — generate.ts already created a unique one.
  // Deriving from the title risks collisions with other recipes sharing the same keyword.
  const existing = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, recipeId) })
  const slug = existing?.slug ?? slugify(finalRecipe.title)
  const wordCount = (finalRecipe.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
  const status = (gateStatus === "PASS" && !degraded) ? "published" : "draft"

  await db.update(recipes).set({
    title: finalRecipe.title,
    metaTitle: finalRecipe.metaTitle,
    metaDescription: finalRecipe.metaDescription,
    excerpt: finalRecipe.excerpt,
    contentMarkdown: finalRecipe.contentMarkdown,
    prepTime: finalRecipe.prepTime,
    cookTime: finalRecipe.cookTime,
    totalTime: finalRecipe.totalTime,
    servings: finalRecipe.servings,
    difficulty: finalRecipe.difficulty,
    ingredients: finalRecipe.ingredients,
    instructions: finalRecipe.instructions,
    tags: finalRecipe.tags,
    jsonLd: finalRecipe.jsonLd,
    content_type: "recipe",
    slug,
    status,
    publishedAt: status === "published" ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(recipes.id, recipeId))

  // Ping Google sitemap after publish
  if (status === "published") {
    try {
      await fetch(
        `https://www.google.com/ping?sitemap=${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`,
      )
    } catch {
      // Non-blocking — sitemap ping failure doesn't affect the article
    }
  }

  await appendLog(recipeId, logEntry(
    "Workflow",
    status === "published" ? "done" : "error",
    `${status === "published" ? "Published" : "Draft"} — ${wordCount} words, ${(finalRecipe.ingredients ?? []).length} ingredients`,
  ))
}
