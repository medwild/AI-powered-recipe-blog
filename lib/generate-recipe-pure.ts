/**
 * generate-recipe-pure.ts — Pipeline v14 without Inngest
 *
 * Same 5-step pipeline as the Inngest workflow, but as a plain async function.
 * Callable from CLI scripts or API routes without any external service.
 *
 * Steps: SERP → Mega-Skill → Quality Gate → Persist → Image → SEO Gate
 */
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { logPipelineError } from "@/lib/queries"
import { runSerpPhase } from "./pipeline/steps/serp-phase"
import { agentChefAugustinMega, recipeArticleToChefAugustinOutput } from "./pipeline/agents/chef-augustin"
import type { RecipeArticle } from "./pipeline/agents/chef-augustin"
import { qualityGate, type GateResult } from "@/lib/quality-gate"
import { appendLog, logEntry, isRecoverableError } from "./pipeline/helpers"
import { persistFinalDraft } from "./pipeline/steps/persist-phase"
import { runImagePhase } from "./pipeline/steps/image-phase"
import { runSeoGate } from "@/lib/seo/gate"

const MAX_RETRIES: Record<string, number> = {
  duplicate: 0, food_safety: 1, too_short: 1, banned_words: 2, meta_title_length: 1,
}

function buildFeedback(reason: string, errors: string[]): string {
  switch (reason) {
    case "food_safety": return `WARNING: Missing USDA food safety temperatures. ${errors.join(" ")} Fix: mention the required temperatures in both the step text and the structured temperature field.`
    case "too_short": return errors[0]
    case "banned_words": return `WARNING: Your previous output contained banned health claims: ${errors.join(" ")}. This is a HARD RULE. Do not use these terms. Rewrite without them.`
    case "meta_title_length": return `WARNING: Your metaTitle is too long (>60 chars). Rewrite it under 60 characters, keyword first.`
    default: return errors.join(" ")
  }
}

export interface GenerateRecipeInput {
  recipeId: number
  keyword: string
  cuisine?: string
  cuisineIngredients?: string
  cuisineTechniques?: string
}

export async function generateRecipe(input: GenerateRecipeInput): Promise<void> {
  const { recipeId, keyword } = input
  const cuisine = input.cuisine || "Easy Weeknight Dinners for Two"
  const cuisineIngredients = input.cuisineIngredients || "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter, canned tomatoes, frozen vegetables, eggs"
  const cuisineTechniques = input.cuisineTechniques || "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking, quick sauces, portion scaling"
  let degraded = false

  try {
    // ── Step 1: SERP ──────────────────────────────────────────────
    const serpResult = await runSerpPhase(recipeId, keyword)
    degraded = degraded || serpResult.degraded

    // ── Step 2: Content Generation (Mega-Skill + retry loop) ─────
    await appendLog(recipeId, logEntry("MegaSkill", "running",
      `Generating article for "${keyword}" with Opus 4.8 mega-skill`))

    let attempt = 0
    let feedback = ""
    let article: RecipeArticle | null = null
    let gateResult: GateResult = { status: "BLOCK", reason: undefined, errors: undefined }
    let totalAttempts = 1

    do {
      article = await agentChefAugustinMega({
        keyword, cuisine, cuisineIngredients, cuisineTechniques,
        serpData: serpResult.serpText, citations: "",
        feedback: feedback || undefined,
      })
      const recipeRow = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, recipeId) })
      gateResult = await qualityGate(article, {
        skipDuplicateCheck: attempt > 0,
        selfId: recipeId,
        selfSlug: recipeRow?.slug ?? undefined,
      })
      if (gateResult.status === "BLOCK") {
        const maxRetries = MAX_RETRIES[gateResult.reason!] ?? 0
        if (attempt < maxRetries) {
          feedback = buildFeedback(gateResult.reason!, gateResult.errors ?? [])
          await appendLog(recipeId, logEntry("QualityGate", "error",
            `${gateResult.reason}: ${gateResult.errors?.join("; ")} (attempt ${attempt + 1}/${maxRetries})`))
        }
      }
      attempt++
      totalAttempts = attempt
    } while (gateResult.status === "BLOCK" && attempt <= (MAX_RETRIES[gateResult.reason!] ?? 0))

    if (gateResult.status === "BLOCK") {
      await appendLog(recipeId, logEntry("QualityGate", "error",
        `BLOCKED (final): ${gateResult.reason} — ${gateResult.errors?.join("; ")} after ${totalAttempts} attempts`))
    } else {
      const wc = article!.contentMarkdown?.split(/\s+/).filter(Boolean).length ?? 0
      await appendLog(recipeId, logEntry("QualityGate", "done", `PASS — ${wc} words`))
    }

    // ── Step 3: Persist ───────────────────────────────────────────
    const legacyArticle = recipeArticleToChefAugustinOutput(article!)
    await persistFinalDraft(recipeId, legacyArticle, gateResult.status as "PASS" | "BLOCK", degraded)

    if (gateResult.status === "BLOCK") {
      await appendLog(recipeId, logEntry("Workflow", "done", "Content blocked — skipping image + SEO gate"))
      return
    }

    // ── Step 4: Image (non-blocking) ──────────────────────────────
    let heroImageUrl: string | null = null
    try {
      const imageResult = await runImagePhase(recipeId, article!, keyword)
      if (imageResult.heroImageUrl) {
        heroImageUrl = imageResult.heroImageUrl
        const contentWithImages = article!.contentMarkdown.replace(
          /\[IMAGE:\s*(.+?)\]/g,
          (_: string, alt: string) => `<img src="${imageResult.heroImageUrl}" alt="${alt.trim()}" loading="lazy" />`,
        )
        await db.update(recipes).set({
          heroImageUrl: imageResult.heroImageUrl, contentMarkdown: contentWithImages, updatedAt: new Date(),
        }).where(eq(recipes.id, recipeId))
      }
    } catch (err) {
      await logPipelineError({ recipeId, stepName: "image-phase", errorType: "unknown", message: (err as Error).message, severity: "warning" })
      await appendLog(recipeId, logEntry("Image", "error", `Image generation failed (non-blocking): ${(err as Error).message}`))
    }

    // ── Step 5: SEO Gate (non-blocking) ───────────────────────────
    try {
      const slug = article!.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 100)
      const seoResult = await runSeoGate({
        recipeId, title: article!.title, metaTitle: article!.metaTitle, metaDescription: article!.metaDescription,
        slug, focusKeyphrase: keyword, contentMarkdown: article!.contentMarkdown,
        heroImageUrl, jsonLd: article!.jsonLd as unknown as Record<string, unknown>, content_type: "recipe",
      })
      await appendLog(recipeId, logEntry("SeoGate", seoResult.status === "PASS" ? "done" : "error",
        `${seoResult.summary} (score: ${seoResult.score})`))
      for (const b of seoResult.blockingIssues) {
        await appendLog(recipeId, logEntry("SeoGate", "error", `BLOCK ${b.code}: ${b.message}`))
      }
      for (const w of seoResult.warnings) {
        await appendLog(recipeId, logEntry("SeoGate", "error", `WARN ${w.code}: ${w.message}`))
      }
      if (seoResult.status === "BLOCK") {
        await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
      }
    } catch (err) {
      await appendLog(recipeId, logEntry("SeoGate", "error", `SEO gate failed (non-blocking): ${(err as Error).message}`))
    }

    await appendLog(recipeId, logEntry("Workflow", "done", "Pipeline v14 complete"))
  } catch (err) {
    if (isRecoverableError(err as Error)) throw err
    await logPipelineError({ recipeId, stepName: "generate-recipe", errorType: "unknown", message: (err as Error).message, severity: "critical" })
    await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
    await appendLog(recipeId, logEntry("Workflow", "error", `Pipeline failed: ${(err as Error).message.substring(0, 300)}`))
  }
}
