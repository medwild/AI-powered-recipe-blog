/**
 * generate-recipe workflow — Pipeline v14 Single-Shot Content Generation
 *
 * 5 pipeline steps:
 *   1. serp-phase       — Google SERP analysis (Serper API, plain text output)
 *   2. mega-skill       — Single LLM call with retry loop + quality gate feedback
 *   3. persist-phase    — Save to DB with validation and JSON-LD
 *   4. image-phase      — Generate hero image (non-blocking)
 *   5. seo-gate         — 15 pre-publish SEO checks (non-blocking, BLOCK→draft)
 *
 * Architecture (v14 Karpathy):
 *   - One mega-skill replaces 4 agents (Strategist, Writer, Science Enricher, Editor).
 *   - Structured outputs guarantee valid JSON. No truncation retry needed.
 *   - Quality Gate blocks on critical issues (food safety, banned words, too short).
 *   - Retry loop with per-reason feedback injected into the LLM call.
 *   - Pinterest pins, A/B stats, and human review removed.
 */

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { logPipelineError } from "@/lib/queries"
import { inngest } from "@/lib/inngest/client"
import { runSerpPhase } from "./steps/serp-phase"
import { agentChefAugustinMega, recipeArticleToChefAugustinOutput } from "./agents/chef-augustin"
import type { RecipeArticle } from "./agents/chef-augustin"
import { qualityGate, type GateResult } from "@/lib/quality-gate"
import { appendLog, logEntry, isRecoverableError } from "./helpers"
import { persistFinalDraft } from "./steps/persist-phase"
import { runImagePhase } from "./steps/image-phase"
import { runSeoGate } from "@/lib/seo/gate"

// ---------------------------------------------------------------------------
// Retry strategy (max retries after initial attempt)
// ---------------------------------------------------------------------------

const MAX_RETRIES: Record<string, number> = {
  duplicate: 0,
  food_safety: 1,
  too_short: 1,
  banned_words: 2,
  meta_title_length: 1,
}

function buildFeedback(reason: string, errors: string[]): string {
  switch (reason) {
    case "food_safety":
      return `WARNING: Missing USDA food safety temperatures. ${errors.join(" ")} Fix: mention the required temperatures in both the step text and the structured temperature field.`
    case "too_short":
      return errors[0]
    case "banned_words":
      return `WARNING: Your previous output contained banned health claims: ${errors.join(" ")}. This is a HARD RULE. Do not use these terms. Rewrite without them.`
    case "meta_title_length":
      return `WARNING: Your metaTitle is too long (>60 chars). Rewrite it under 60 characters, keyword first.`
    default:
      return errors.join(" ")
  }
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export const generateRecipeWorkflow = inngest.createFunction(
  {
    id: "generate-recipe",
    triggers: [{ event: "recipe/generate" }],
    concurrency: { key: "generate-recipe-active", limit: 3 },
    throttle: { key: "recipe-generation-throttle", limit: 2, period: "1m" },
    retries: 1,
    cancelOn: [{ event: "recipe/cancel", match: "data.recipeId" }],
  },
  async ({ event, step }) => {
    const { recipeId, keyword, cuisine, cuisineIngredients, cuisineTechniques } = event.data as {
      recipeId: number
      keyword: string
      cuisine?: string
      cuisineIngredients?: string
      cuisineTechniques?: string
    }

    const cuisineDefaults = {
      cuisine: cuisine || "Easy Weeknight Dinners for Two",
      cuisineIngredients: cuisineIngredients || "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter, canned tomatoes, frozen vegetables, eggs",
      cuisineTechniques: cuisineTechniques || "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking, quick sauces, portion scaling",
    }

    let degraded = false

    try {
      // ── Step 1: SERP ──────────────────────────────────────────────────
      const serpResult = await runSerpPhase(step, recipeId, keyword)
      degraded = degraded || serpResult.degraded

      // ── Step 2: Content Generation (Mega-Skill with retry loop) ──────
      const article = await step.run("generate-content", async () => {
        await appendLog(recipeId, logEntry("MegaSkill", "running",
          `Generating article for "${keyword}" with Opus 4.8 mega-skill`))

        let attempt = 0
        let feedback = ""
        let article: RecipeArticle | null = null
        let gateResult: GateResult = { status: "BLOCK", reason: undefined, errors: undefined }
        let totalAttempts = 1

        do {
          article = await agentChefAugustinMega({
            keyword,
            ...cuisineDefaults,
            serpData: serpResult.serpText,
            citations: "", // external sources handled by the mega-skill
            feedback: feedback || undefined,
          })

          gateResult = await qualityGate(article)

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
          const wordCount = article!.contentMarkdown?.split(/\s+/).filter(Boolean).length ?? 0
          await appendLog(recipeId, logEntry("QualityGate", "done",
            `PASS — ${wordCount} words`))
        }

        return { article: article!, gateResult, attempts: totalAttempts }
      }) as { article: RecipeArticle; gateResult: { status: string; reason?: string; errors?: string[] }; attempts: number }

      // ── Step 3: Persist ───────────────────────────────────────────────
      const legacyArticle = recipeArticleToChefAugustinOutput(article.article)
      await persistFinalDraft(
        step, recipeId,
        legacyArticle,
        article.gateResult.status as "PASS" | "BLOCK",
        degraded,
      )

      if (article.gateResult.status === "BLOCK") {
        await appendLog(recipeId, logEntry("Workflow", "done",
          "Content blocked — skipping image + SEO gate"))
        return
      }

      // ── Step 4: Image (non-blocking) ──────────────────────────────────
      let heroImageUrl: string | null = null
      try {
        const imageResult = await runImagePhase(step, recipeId, article.article, keyword)
        if (imageResult.heroImageUrl) {
          heroImageUrl = imageResult.heroImageUrl
          // Replace [IMAGE:alt text] placeholders with actual <img> tags
          const contentWithImages = article.article.contentMarkdown.replace(
            /\[IMAGE:\s*(.+?)\]/g,
            (_, alt) => `<img src="${imageResult.heroImageUrl}" alt="${alt.trim()}" loading="lazy" />`,
          )
          await db
            .update(recipes)
            .set({
              heroImageUrl: imageResult.heroImageUrl,
              contentMarkdown: contentWithImages,
              updatedAt: new Date(),
            })
            .where(eq(recipes.id, recipeId))
        }
      } catch (err) {
        await logPipelineError({
          recipeId,
          stepName: "image-phase",
          errorType: "unknown",
          message: (err as Error).message,
          severity: "warning",
        })
        await appendLog(recipeId, logEntry("Image", "error",
          `Image generation failed (non-blocking): ${(err as Error).message}`))
      }

      // ── Step 5: SEO Gate (non-blocking) ───────────────────────────────
      try {
        await step.run("seo-gate", async () => {
          const slug = article.article.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .substring(0, 100)

          const seoResult = await runSeoGate({
            recipeId,
            title: article.article.title,
            metaTitle: article.article.metaTitle,
            metaDescription: article.article.metaDescription,
            slug,
            focusKeyphrase: keyword,
            contentMarkdown: article.article.contentMarkdown,
            heroImageUrl,
            jsonLd: article.article.jsonLd as unknown as Record<string, unknown>,
            content_type: "recipe",
          })

          await appendLog(recipeId, logEntry("SeoGate", seoResult.status === "PASS" ? "done" : "error",
            `${seoResult.summary} (score: ${seoResult.score})`))

          for (const b of seoResult.blockingIssues) {
            await appendLog(recipeId, logEntry("SeoGate", "error",
              `BLOCK ${b.code}: ${b.message}`))
          }
          for (const w of seoResult.warnings) {
            await appendLog(recipeId, logEntry("SeoGate", "error",
              `WARN ${w.code}: ${w.message}`))
          }

          // BLOCK issues → set recipe to draft for manual review
          if (seoResult.status === "BLOCK") {
            await db
              .update(recipes)
              .set({ status: "draft", updatedAt: new Date() })
              .where(eq(recipes.id, recipeId))
          }
        })
      } catch (err) {
        await appendLog(recipeId, logEntry("SeoGate", "error",
          `SEO gate failed (non-blocking): ${(err as Error).message}`))
      }

      await appendLog(recipeId, logEntry("Workflow", "done", "Pipeline v14 complete"))

    } catch (err) {
      if (isRecoverableError(err as Error)) throw err

      await step.run("handle-pipeline-failure", async () => {
        await logPipelineError({
          recipeId,
          stepName: "generate-recipe",
          errorType: "unknown",
          message: (err as Error).message,
          severity: "critical",
        })

        await db
          .update(recipes)
          .set({ status: "draft", updatedAt: new Date() })
          .where(eq(recipes.id, recipeId))

        await appendLog(recipeId, logEntry("Workflow", "error",
          `Pipeline failed: ${(err as Error).message.substring(0, 300)}`))
      })
    }
  },
)
