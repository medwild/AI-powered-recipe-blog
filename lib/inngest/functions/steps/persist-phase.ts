/**
 * Steps 5 + 10 + 11 + 12 — Draft persistence, self-improvement, final JSON-LD, stats.
 */

import { db } from "@/lib/db"
import { recipes, selfImprovementLogs, imageVariantStats, type NewSelfImprovementLog, type ImageVariant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { slugify } from "@/lib/slug"
import type { RecipeDraft } from "../agents/writer"
import type { SeoPlan } from "../agents/strategist"
import type { AuditReport } from "../agents/auditor"
import type { QAReport } from "../agents/qa"
import { appendLog, logEntry, SITE_URL } from "../helpers"

/** Step 5 — Persist draft for human review. */
export async function persistDraftForReview(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>; sleep: (name: string, dur: string) => Promise<void> },
  recipeId: number, draft: RecipeDraft, audit: AuditReport,
) {
  await step.run("persist-draft-for-review", async () => {
    await db.update(recipes).set({
      title: draft.title, metaTitle: draft.metaTitle, metaDescription: draft.metaDescription,
      excerpt: draft.excerpt, contentMarkdown: draft.contentMarkdown,
      prepTime: draft.prepTime, cookTime: draft.cookTime, totalTime: draft.totalTime,
      servings: draft.servings, difficulty: draft.difficulty,
      ingredients: draft.ingredients, instructions: draft.instructions, tags: draft.tags,
      status: "draft_review", updatedAt: new Date(),
    }).where(eq(recipes.id, recipeId))
    await appendLog(recipeId, logEntry("Human Review", "running",
      `Awaiting approval — audit score: ${audit.overallScore}/100 | AI: ${audit.score_ia_estimation}/100 | Verdict: ${audit.verdict}`))
  })
}

/** Step 6 — Wait for human approval (or auto-approve). Returns true if approved. */
export async function waitForApproval(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>; waitForEvent: (name: string, opts: { event: string; timeout: string; if: string }) => Promise<unknown>; sleep: (name: string, dur: string) => Promise<void> },
  recipeId: number,
): Promise<boolean> {
  const autoApprove = process.env.AUTO_APPROVE === "true"
  if (!autoApprove) {
    const approval = await step.waitForEvent("wait-for-approval", {
      event: "recipe/approved", timeout: "7d", if: `event.data.recipeId == ${recipeId}`,
    })
    if (!approval) {
      await step.run("log-approval-expired", async () => {
        await db.update(recipes).set({ status: "expired", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
        await appendLog(recipeId, logEntry("Human Review", "error", "7-day approval window expired — recipe expired"))
      })
      throw new Error("APPROVAL_TIMEOUT")
    }
    await step.run("log-approval-granted", async () => {
      await appendLog(recipeId, logEntry("Human Review", "done", "Recipe approved — launching final editing"))
    })
  } else {
    await step.run("log-auto-approve", async () => {
      await appendLog(recipeId, logEntry("Human Review", "done", "Auto-approved (AUTO_APPROVE=true) — launching final editing"))
    })
  }
  return true
}

/** Step 10 — Self-improvement feedback loop. */
export async function runSelfImprovement(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number, keyword: string, finalRecipe: RecipeDraft,
  audit: AuditReport, qaReport: QAReport, humanizationPass: number,
) {
  await step.run("self-improvement", async () => {
    const tagList = finalRecipe.tags ?? []
    const lessons: NewSelfImprovementLog[] = []
    for (const c of audit.criteria) {
      if (c.score < 16) lessons.push({ keyword, criterion: c.name, score: String(c.score), recommendation: c.recommendation, tags: tagList, source: "auditor" })
    }
    if (audit.score_ia_estimation != null) {
      lessons.push({
        keyword, criterion: "ai_score", score: String(audit.score_ia_estimation),
        recommendation: audit.score_ia_estimation < 20 ? "AI detection score below 20 — anti-AI techniques working well." :
          audit.score_ia_estimation < 40 ? `AI score ${audit.score_ia_estimation}/100 — moderate risk.` :
            `AI score ${audit.score_ia_estimation}/100 — high detection risk.`,
        tags: tagList, source: "auditor",
      })
    }
    if (qaReport.verdict !== "PASS") {
      const qaIssues = qaReport.checks.filter(c => c.status !== "PASS").map(c => `[${c.name}] ${c.status}: ${(c.issues ?? []).join("; ") || "no specific issues"}`).join(" | ")
      lessons.push({ keyword, criterion: "qa_verdict", score: String(qaReport.qaScore), recommendation: `QA ${qaReport.verdict} (${qaReport.qaScore}/100): ${qaReport.summary} | Issues: ${qaIssues}`, tags: tagList, source: "qa" })
    }
    if (lessons.length > 0) await db.insert(selfImprovementLogs).values(lessons)
    await appendLog(recipeId, logEntry("Self-Improvement", "done",
      `${lessons.length} lessons saved | Final pass: ${humanizationPass} | AI Score: ${audit.score_ia_estimation}/100 | QA: ${qaReport.verdict}`))
  })
}

/** Step 11 — Persist the final draft with JSON-LD enrichment. */
export async function persistFinalDraft(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number, finalRecipe: RecipeDraft, seoPlan: SeoPlan,
  heroImageUrl: string | null, imageVariants: ImageVariant[],
  keyword: string,
) {
  await step.run("persist-draft-final", async () => {
    // SEO guards
    if (finalRecipe.metaTitle && finalRecipe.metaTitle.length > 60) {
      finalRecipe.metaTitle = finalRecipe.metaTitle.substring(0, 57).replace(/\s\S*$/, "") + "…"
    }
    if (finalRecipe.metaDescription && finalRecipe.metaDescription.length > 155) {
      finalRecipe.metaDescription = finalRecipe.metaDescription.substring(0, 152).replace(/\s\S*$/, "") + "…"
    }

    const wordCount = (finalRecipe.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
    if (wordCount < 1500) {
      await appendLog(recipeId, logEntry("Workflow", "error", `Content length warning: ${wordCount} words (target: 1800-2200).`))
    }

    // Parse FAQ from markdown
    function parseFaqFromMarkdown(md: string): { question: string; answer: string }[] {
      const faq: { question: string; answer: string }[] = []
      const blocks = md.split(/\n\n+/)
      for (let i = 0; i < blocks.length; i++) {
        const qMatch = blocks[i].match(/^\*\*(.+?\?)\*\*$/)
        if (qMatch && i + 1 < blocks.length) {
          const answer = blocks[i + 1].replace(/\n/g, " ").trim()
          if (answer.length > 20 && !answer.startsWith("**")) faq.push({ question: qMatch[1].trim(), answer })
        }
      }
      return faq.slice(0, 5)
    }

    const faqItems = seoPlan.faqItems?.length ? seoPlan.faqItems : parseFaqFromMarkdown(finalRecipe.contentMarkdown ?? "")
    const now = new Date().toISOString()

    const recipeBase: Record<string, unknown> = {
      "@type": "Recipe", name: finalRecipe.title,
      description: finalRecipe.metaDescription || finalRecipe.excerpt || undefined,
      author: { "@type": "Person", name: "Chef Augustin Lefèvre", url: `${SITE_URL}/about` },
      prepTime: finalRecipe.prepTime ? `PT${(finalRecipe.prepTime.match(/\d+/) ?? ["0"])[0]}M` : "PT0M",
      cookTime: finalRecipe.cookTime ? `PT${(finalRecipe.cookTime.match(/\d+/) ?? ["0"])[0]}M` : "PT0M",
      totalTime: finalRecipe.totalTime ? `PT${(finalRecipe.totalTime.match(/\d+/) ?? ["0"])[0]}M` : "PT0M",
      recipeYield: finalRecipe.servings ?? "4 servings",
      recipeCategory: finalRecipe.tags?.[0] ?? "Main Course",
      recipeCuisine: finalRecipe.tags?.[1] ?? "American",
      keywords: (finalRecipe.tags ?? []).join(", "),
      recipeIngredient: (finalRecipe.ingredients ?? []).map(i => `${i.quantity ? i.quantity + " " : ""}${i.name}`),
      recipeInstructions: (finalRecipe.instructions ?? []).map((s, idx) => ({ "@type": "HowToStep", position: idx + 1, text: s.text })),
      ...(seoPlan.json_ld_recipe_base?.nutrition ? { nutrition: seoPlan.json_ld_recipe_base.nutrition } : {}),
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        recipeBase,
        { "@type": "BlogPosting", headline: finalRecipe.title, description: finalRecipe.metaDescription || finalRecipe.excerpt || undefined, author: { "@type": "Person", name: "Chef Augustin Lefèvre", url: `${SITE_URL}/about` }, datePublished: now, dateModified: now, keywords: (finalRecipe.tags ?? []).join(", ") },
        ...(faqItems.length > 0 ? [{ "@type": "FAQPage" as const, mainEntity: faqItems.map(f => ({ "@type": "Question" as const, name: f.question, acceptedAnswer: { "@type": "Answer" as const, text: f.answer } })) }] : []),
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` }, { "@type": "ListItem", position: 2, name: "Recipes", item: `${SITE_URL}/recettes` }, { "@type": "ListItem", position: 3, name: finalRecipe.title }] },
      ],
    }

    await db.update(recipes).set({
      title: finalRecipe.title, metaTitle: finalRecipe.metaTitle, metaDescription: finalRecipe.metaDescription,
      excerpt: finalRecipe.excerpt, contentMarkdown: finalRecipe.contentMarkdown,
      prepTime: finalRecipe.prepTime, cookTime: finalRecipe.cookTime, totalTime: finalRecipe.totalTime,
      servings: finalRecipe.servings, difficulty: finalRecipe.difficulty,
      ingredients: finalRecipe.ingredients, instructions: finalRecipe.instructions, tags: finalRecipe.tags,
      heroImageUrl, imageVariants, jsonLd: jsonLd as Record<string, unknown>,
      status: "published", publishedAt: new Date(), updatedAt: new Date(),
    }).where(eq(recipes.id, recipeId))

    await appendLog(recipeId, logEntry("Workflow", "done", `Published — ${wordCount} words, ${(finalRecipe.ingredients ?? []).length} ingredients, ${(finalRecipe.instructions ?? []).length} steps, JSON-LD @graph with ${jsonLd["@graph"].length} nodes`))
  })
}

/** Step 12 — Initialize A/B variant stats. */
export async function initVariantStats(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number, imageVariants: ImageVariant[],
) {
  if (imageVariants.length <= 1) return
  await step.run("init-variant-stats", async () => {
    for (const v of imageVariants) {
      await db.insert(imageVariantStats).values({ recipeId, variantIndex: imageVariants.indexOf(v), impressions: 0, clicks: 0 })
    }
    await appendLog(recipeId, logEntry("A/B Stats", "done", `Initialized tracking for ${imageVariants.length} variants`))
  })
}
