/**
 * Step 13 — AOR (Article Outside Recipe) generation.
 */

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { slugify } from "@/lib/slug"
import { runImage } from "@/lib/agents/cloudflare"
import { uploadImage } from "@/lib/agents/cloudinary"
import { agentImagePromptOptimizer } from "../agents/image-prompt-optimizer"
import { agentAorWriter, type AorCategory } from "../agents/aor-writer"
import type { RecipeDraft } from "../agents/writer"
import type { SeoPlan } from "../agents/strategist"
import type { StructuredSerp } from "@/lib/agents/serp-structurer"
import { validateContent, scrubBannedWords } from "@/lib/content-validator"
import { checkCitability } from "@/lib/geo-validator"
import { appendLog, logEntry, SITE_URL } from "../helpers"

export async function generateAorArticle(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>; sleep: (name: string, dur: string) => Promise<void> },
  recipeId: number, keyword: string, finalRecipe: RecipeDraft,
  seoPlan: SeoPlan, structuredSerp: StructuredSerp,
  category: string, aorAngle: string | null,
) {
  await step.run("agent-6-aor-article", async () => {
    await appendLog(recipeId, logEntry("AOR Writer", "running", `Generating article for category: ${category}`))

    // Idempotence guard
    const existingArticle = await db.query.recipes.findFirst({
      where: (r, { eq }) => eq(r.linked_content_id, recipeId),
    })
    if (existingArticle) {
      await appendLog(recipeId, logEntry("AOR Writer", "done", `Article already exists — skipping (#${existingArticle.id})`))
      return
    }

    const [recipeRow] = await db.select({ slug: recipes.slug }).from(recipes).where(eq(recipes.id, recipeId))
    const recipeSlug = recipeRow?.slug || slugify(keyword)
    const recipeUrl = `${SITE_URL}/recettes/${recipeSlug}`

    const aorResult = await agentAorWriter({
      keyword, recipeTitle: finalRecipe.title, recipeSlug, recipeUrl,
      seoPlan, serp: structuredSerp as Record<string, unknown>,
      aorCategory: category as AorCategory, aorAngle: aorAngle ?? null,
    })

    // ── Content Validation (same safety net as recipe persist-phase) ─────
    let aorContentValid = true
    const scrubbed = scrubBannedWords(aorResult.contentMarkdown ?? "")
    if (scrubbed.replacements.length > 0) {
      aorResult.contentMarkdown = scrubbed.scrubbed
      await appendLog(recipeId, logEntry("AOR ContentValidator", "error",
        `Banned words scrubbed: ${scrubbed.replacements.join("; ")}`))
    }

    const aorValidation = validateContent({
      contentMarkdown: aorResult.contentMarkdown,
      metaTitle: aorResult.metaTitle,
      metaDescription: aorResult.metaDescription,
      title: aorResult.title,
      contentType: "article",
    })
    if (!aorValidation.passed) {
      aorContentValid = false
      const errorList = aorValidation.errors
        .filter(e => e.severity === "error")
        .map(e => e.message).join("; ")
      await appendLog(recipeId, logEntry("AOR ContentValidator", "error",
        `Content validation FAILED: ${errorList}. Saving as draft.`))
    }

    // GEO Citability check — articles share the same thresholds as recipes
    const aorWordCount = (aorResult.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
    const aorCitability = checkCitability(aorResult.contentMarkdown ?? "", aorWordCount)
    if (aorCitability.score < 50) {
      aorContentValid = false
      await appendLog(recipeId, logEntry("AOR GEO Validator", "error",
        `Citability BLOCKED: score ${aorCitability.score}/100. ` +
        `Claims: ${aorCitability.claims.count}/${aorCitability.claims.minRequired}, ` +
        `Attributions: ${aorCitability.attributions.count}/${aorCitability.attributions.minRequired}. ` +
        aorCitability.feedback))
    } else if (aorCitability.score < 60) {
      await appendLog(recipeId, logEntry("AOR GEO Validator", "error",
        `Citability WARNING: score ${aorCitability.score}/100. ` +
        aorCitability.feedback))
    } else {
      await appendLog(recipeId, logEntry("AOR GEO Validator", "done",
        `Citability PASSED — score ${aorCitability.score}/100. ` +
        `Claims: ${aorCitability.claims.count}, Attributions: ${aorCitability.attributions.count}, ` +
        `Nuggets: ${aorCitability.nuggets.count}.`))
    }

    // Unique slug
    let articleSlug = slugify(aorResult.slug) || slugify(aorResult.title) || "article"
    const baseSlug = articleSlug
    let suffix = 0
    while (true) {
      const existing = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.slug, articleSlug) })
      if (!existing) break
      suffix += 1; articleSlug = `${baseSlug}-${suffix}`
    }

    // Hero image (non-blocking)
    let imageUrl: string | null = null
    try {
      const imagePrompt = await agentImagePromptOptimizer({
        title: aorResult.title, tags: aorResult.tags, keyword,
        ingredients: finalRecipe.ingredients, difficulty: finalRecipe.difficulty,
      })
      const imageBuffer = await runImage(imagePrompt)
      imageUrl = await uploadImage(imageBuffer, `article-${articleSlug}`)
      await appendLog(recipeId, logEntry("AOR Image", "done", "Article image uploaded to Cloudinary"))
    } catch (imgErr) {
      await appendLog(recipeId, logEntry("AOR Image", "error", `Image generation failed: ${(imgErr as Error).message} — persisting article without image`))
    }

    const now = new Date().toISOString()
    const enrichedJsonLd = {
      ...aorResult.jsonLd,
      "@graph": ((aorResult.jsonLd["@graph"] as Record<string, unknown>[]) ?? []).map(node => {
        if (node["@type"] === "Article") {
          return { ...node, datePublished: now, dateModified: now, image: imageUrl, mainEntityOfPage: `${SITE_URL}/${category}/${articleSlug}` }
        }
        return node
      }),
    }

    await db.insert(recipes).values({
      slug: articleSlug, keyword, title: aorResult.title,
      metaTitle: aorResult.metaTitle, metaDescription: aorResult.metaDescription,
      excerpt: aorResult.excerpt, contentMarkdown: aorResult.contentMarkdown,
      tags: aorResult.tags, heroImageUrl: imageUrl, jsonLd: enrichedJsonLd,
      status: aorContentValid ? "published" : "draft", publishedAt: new Date(),
      content_type: "article", category, linked_content_id: recipeId,
    })

    await appendLog(recipeId, logEntry("AOR Writer", "done", `Article "${aorResult.title}" published — /${category}/${articleSlug}`))
  })
}
