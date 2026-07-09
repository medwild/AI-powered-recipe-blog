/**
 * Steps 5 + 10 + 11 + 12 — Draft persistence, self-improvement, final JSON-LD, stats.
 */

import { db } from "@/lib/db"
import { recipes, selfImprovementLogs, imageVariantStats, type NewSelfImprovementLog, type ImageVariant } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { slugify } from "@/lib/slug"
import type { RecipeDraft, SeoPlan } from "../agents/chef-augustin"

// Minimal audit type (was AuditReport from deleted auditor.ts)
type MinimalAudit = {
  publication_readiness_score: number
  scores: Record<string, number>
  required_fixes: { description: string }[]
  final_recommendation: string
  decision: string
}

// Minimal QA type (was QAReport from deleted qa.ts)
type MinimalQAReport = {
  qaScore: number
  verdict: string
  summary: string
  checks: { name: string; status: string; issues: string[] }[]
}
import { validateContent, computeOriginalityScore, scrubBannedWords, checkContentSimilarity } from "@/lib/content-validator"
import { checkCitability } from "@/lib/geo-validator"
import { appendLog, logEntry, SITE_URL, stripHtmlComments, stripBracketTokens } from "../helpers"
import { runSeoGate } from "@/lib/seo/gate"

// ── Duration formatting for JSON-LD ──────────────────────────────────────────

/**
 * Converts human-readable time strings to ISO 8601 duration.
 * Handles "1 hour 30 minutes", "45 min", "2 hours", "1h30m", etc.
 */
function formatDuration(input: string): string {
  const normalized = input.toLowerCase()
  let totalMinutes = 0

  // Hours
  const hourMatch = normalized.match(/(\d+)\s*(?:hours?|hrs?|h)/)
  if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60

  // Minutes
  const minMatch = normalized.match(/(\d+)\s*(?:minutes?|mins?|m(?!s))/)
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10)

  // Fallback: first number found
  if (totalMinutes === 0) {
    const numMatch = normalized.match(/(\d+)/)
    if (numMatch) totalMinutes = parseInt(numMatch[1], 10)
  }

  return `PT${totalMinutes}M`
}

/** Step 5 — Persist draft for human review. */
export async function persistDraftForReview(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>; sleep: (name: string, dur: string) => Promise<void> },
  recipeId: number, draft: RecipeDraft, audit: MinimalAudit,
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
      `Awaiting approval — readiness: ${audit.publication_readiness_score}/100 | LLM Sig: ${audit.scores.signature_llm}/100 | Decision: ${audit.decision}`))
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
  audit: MinimalAudit, qaReport: MinimalQAReport, humanizationPass: number,
) {
  await step.run("self-improvement", async () => {
    const tagList = finalRecipe.tags ?? []
    const lessons: NewSelfImprovementLog[] = []
    // Normal dimensions (high = good): record lesson if score < 60
    // Inverted dimensions (high = bad): record lesson if score >= 60
    const normalCriteria: (keyof typeof audit.scores)[] = [
      "factualite", "originalite", "utilite", "experience",
      "coherence_interne", "eeat_trust",
    ]
    for (const key of normalCriteria) {
      const score = audit.scores[key]
      if (typeof score === "number" && score < 60) {
        lessons.push({
          keyword, criterion: key, score: String(score),
          recommendation: audit.required_fixes
            .filter(f => f.description.toLowerCase().includes(key.replace(/_/g, " ")))
            .map(f => f.description)
            .join("; ") || audit.final_recommendation,
          tags: tagList, source: "auditor",
        })
      }
    }
    // validite_recette: only if present and low
    if (audit.scores.validite_recette != null && audit.scores.validite_recette < 60) {
      lessons.push({
        keyword, criterion: "validite_recette", score: String(audit.scores.validite_recette),
        recommendation: audit.required_fixes
          .filter(f => f.description.toLowerCase().includes("recipe") || f.description.toLowerCase().includes("ratio"))
          .map(f => f.description)
          .join("; ") || audit.final_recommendation,
        tags: tagList, source: "auditor",
      })
    }
    // Inverted scores: record if risk is high (>= 60)
    if (audit.scores.signature_llm >= 60) {
      lessons.push({
        keyword, criterion: "llm_signature", score: String(audit.scores.signature_llm),
        recommendation: audit.scores.signature_llm >= 80
          ? `LLM signature risk ${audit.scores.signature_llm}/100 — very high. Strong anti-pattern signals detected.`
          : `LLM signature risk ${audit.scores.signature_llm}/100 — elevated. Review vocabulary, transitions, and structure.`,
        tags: tagList, source: "auditor",
      })
    }
    if (audit.scores.sur_optimisation_seo >= 60) {
      lessons.push({
        keyword, criterion: "seo_overoptimization", score: String(audit.scores.sur_optimisation_seo),
        recommendation: audit.scores.sur_optimisation_seo >= 80
          ? `SEO over-optimization risk ${audit.scores.sur_optimisation_seo}/100 — very high. Visible keyword stuffing or artificial structure.`
          : `SEO over-optimization risk ${audit.scores.sur_optimisation_seo}/100 — elevated. Review keyword density and section relevance.`,
        tags: tagList, source: "auditor",
      })
    }
    if (qaReport.verdict !== "PASS") {
      const qaIssues = qaReport.checks.filter(c => c.status !== "PASS").map(c => `[${c.name}] ${c.status}: ${(c.issues ?? []).join("; ") || "no specific issues"}`).join(" | ")
      lessons.push({ keyword, criterion: "qa_verdict", score: String(qaReport.qaScore), recommendation: `QA ${qaReport.verdict} (${qaReport.qaScore}/100): ${qaReport.summary} | Issues: ${qaIssues}`, tags: tagList, source: "qa" })
    }
    // Originality score — Koray GÜBÜR §6: track n-gram uniqueness vs AI detectability
    const originality = computeOriginalityScore(finalRecipe.contentMarkdown ?? "")
    lessons.push({
      keyword, criterion: "originality", score: String(originality),
      recommendation: originality >= 60 ? "High originality — strong anti-AI signal." :
        originality >= 40 ? "Moderate originality — consider adding more unique phrasing." :
          "Low originality — content may be detectable as AI-generated. Add personal anecdotes, unique sensory details, or technique variations.",
      tags: tagList, source: "validator",
    })
    if (lessons.length > 0) await db.insert(selfImprovementLogs).values(lessons)
    await appendLog(recipeId, logEntry("Self-Improvement", "done",
      `${lessons.length} lessons saved | Final pass: ${humanizationPass} | LLM Sig: ${audit.scores.signature_llm}/100 | QA: ${qaReport.verdict}`))
  })
}

/** Step 11 — Persist the final draft with JSON-LD enrichment. */
export async function persistFinalDraft(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number, finalRecipe: RecipeDraft, seoPlan: SeoPlan,
  heroImageUrl: string | null, imageVariants: ImageVariant[],
  keyword: string,
  format: "google" | "pin-first" = "google",
  degraded = false,
) {
  await step.run("persist-draft-final", async () => {
    // SEO guards — flag oversize metadata for rewrite (do NOT mechanically truncate)
    if (finalRecipe.metaTitle && finalRecipe.metaTitle.length > 60) {
      await appendLog(recipeId, logEntry("Workflow", "error",
        `Meta title is ${finalRecipe.metaTitle.length} chars (max 60). Editor should rewrite naturally, not truncate. Published with truncated title as fallback.`))
      finalRecipe.metaTitle = finalRecipe.metaTitle.substring(0, 57).replace(/\s\S*$/, "") + "…"
    }
    if (finalRecipe.metaDescription && finalRecipe.metaDescription.length > 155) {
      await appendLog(recipeId, logEntry("Workflow", "error",
        `Meta description is ${finalRecipe.metaDescription.length} chars (max 155). Editor should rewrite naturally. Published with truncated description as fallback.`))
      finalRecipe.metaDescription = finalRecipe.metaDescription.substring(0, 152).replace(/\s\S*$/, "") + "…"
    }

    const wordCount = (finalRecipe.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length

    // Pin-first IMAGE placeholder validation (warning-only)
    if (format === "pin-first") {
      const imagePlaceholders = ((finalRecipe.contentMarkdown ?? "").match(/\[IMAGE:/gi) ?? []).length
      if (imagePlaceholders < 4) {
        await appendLog(recipeId, logEntry("Workflow", "error",
          `Pin-First: Only ${imagePlaceholders} [IMAGE:] placeholders found (expected 4-6). Process shots may be incomplete.`))
      }
    }

    // Strip HTML comments and bracket tokens — last-resort safety net.
    // Writer and Editor should already have stripped these; this catches
    // what slips through both agents.
    let sanitizedMarkdown = stripHtmlComments(finalRecipe.contentMarkdown ?? "")
    sanitizedMarkdown = stripBracketTokens(sanitizedMarkdown)
    if (sanitizedMarkdown !== (finalRecipe.contentMarkdown ?? "")) {
      finalRecipe.contentMarkdown = sanitizedMarkdown
      await appendLog(recipeId, logEntry("Workflow", "error",
        "HTML comments or bracket tokens stripped at persist — Writer/Editor missed them"))
    }

    // Deterministic banned-word scrubbing — LAST-RESORT safety net.
    // The Editor should already have removed these; this catches what slips through.
    const scrubbed = scrubBannedWords(finalRecipe.contentMarkdown ?? "")
    if (scrubbed.replacements.length > 0) {
      finalRecipe.contentMarkdown = scrubbed.scrubbed
      await appendLog(recipeId, logEntry("Workflow", "error",
        `Banned words scrubbed (Editor missed): ${scrubbed.replacements.join("; ")}`))
    }

    // Content similarity check — catch near-duplicate content before publication.
    // Fetch the 50 most recently published recipes for bigram comparison.
    const recentPublished = await db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        title: recipes.title,
        contentMarkdown: recipes.contentMarkdown,
      })
      .from(recipes)
      .where(eq(recipes.status, "published"))
      .orderBy(desc(recipes.publishedAt))
      .limit(50)

    const similarityResult = checkContentSimilarity(finalRecipe.contentMarkdown ?? "", recentPublished)
    if (similarityResult.similar) {
      const topMatch = similarityResult.matches[0]
      await appendLog(recipeId, logEntry("Workflow", "error",
        `Content similarity BLOCKED: ${topMatch.similarity}% similar to "${topMatch.title}" (/${topMatch.slug}). ` +
        similarityResult.matches.map(m => `${m.similarity}% → ${m.title}`).join("; ")))
      await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
      return
    }
    if (similarityResult.matches.length > 0) {
      await appendLog(recipeId, logEntry("Workflow", "error",
        `Content similarity WARNING: ${similarityResult.matches.map(m => `${m.similarity}% → ${m.title}`).join("; ")}`))
    }

    // Replace Writer template variables with actual values.
    // The Writer outputs {{current_month_year}} as a placeholder; the pipeline
    // fills it so the published content carries a real freshness signal.
    const freshnessDate = new Date()
    const currentMonthYear = freshnessDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    if (finalRecipe.contentMarkdown?.includes("{{current_month_year}}")) {
      finalRecipe.contentMarkdown = finalRecipe.contentMarkdown.replace(/\{\{current_month_year\}\}/g, currentMonthYear)
    }

    // GEO Citability check — ensure content has enough specific claims
    // and source attributions for LLM extraction. Block if score < 60.
    const citability = checkCitability(finalRecipe.contentMarkdown ?? "", wordCount)
    if (citability.score < 60) {
      await appendLog(recipeId, logEntry("GEO Validator", "error",
        `Citability BLOCKED: score ${citability.score}/100. ` +
        `Claims: ${citability.claims.count}/${citability.claims.minRequired}, ` +
        `Attributions: ${citability.attributions.count}/${citability.attributions.minRequired}. ` +
        citability.feedback))
      await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
      return
    }
    if (citability.score < 70) {
      await appendLog(recipeId, logEntry("GEO Validator", "error",
        `Citability WARNING: score ${citability.score}/100. ` +
        `Claims: ${citability.claims.count}/${citability.claims.minRequired}, ` +
        `Attributions: ${citability.attributions.count}/${citability.attributions.minRequired}. ` +
        citability.feedback))
    } else {
      await appendLog(recipeId, logEntry("GEO Validator", "done",
        `Citability PASSED — score ${citability.score}/100. ` +
        `Claims: ${citability.claims.count}, Attributions: ${citability.attributions.count}, ` +
        `Nuggets: ${citability.nuggets.count}.`))
    }

    // Deterministic content validation — catches banned words, token leaks,
    // missing fields BEFORE publication. Runs regardless of LLM availability.
    let validation = validateContent({ ...finalRecipe, contentType: "recipe", format })

    // Auto-remediate: if ContentValidator found recoverable errors (banned words,
    // health claims), re-scrub more aggressively and re-validate before giving up.
    if (!validation.passed) {
      const fixableErrors = validation.errors.filter(e =>
        e.severity === "error" &&
        (e.message.includes("Banned word") || e.message.includes("Unsourced health claim"))
      )

      if (fixableErrors.length > 0) {
        // Aggressive remediation: for each failing word, force-replace all occurrences
        let md = finalRecipe.contentMarkdown ?? ""
        for (const err of fixableErrors) {
          const wordMatch = err.message.match(/"([^"]+)"/)
          if (wordMatch) {
            const word = wordMatch[1]
            // Case-insensitive global replace of the banned word
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(escaped.replace(/\s+/g, '\\s+'), 'gi')
            const before = md
            md = md.replace(regex, '[...]')
            if (md !== before) {
              await appendLog(recipeId, logEntry("Workflow", "error",
                `Auto-scrubbed "${word}" → removed (ContentValidator remediation)`))
            }
          }
        }
        finalRecipe.contentMarkdown = md

        // Re-validate after aggressive scrubbing
        validation = validateContent({ ...finalRecipe, contentType: "recipe", format })
      }
    }

    if (!validation.passed) {
      const errorList = validation.errors
        .filter((e) => e.severity === "error")
        .map((e) => e.message)
        .join("; ")
      await appendLog(recipeId, logEntry("Workflow", "error", `ContentValidator FAILED: ${errorList}. Marking as draft.`))
      await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
      return // Stop — do not publish content that fails deterministic checks
    }
    const warnList = validation.errors.filter((e) => e.severity === "warning")
    if (warnList.length > 0) {
      await appendLog(recipeId, logEntry("Workflow", "error", `ContentValidator warnings: ${warnList.map((w) => w.message).join("; ")}`))
    }

    // SEO Gate — deterministic pre-publication checks (schema, meta, cannibalization, etc.)
    const recipeSlug = slugify(keyword)
    const seoGateResult = await runSeoGate({
      recipeId, title: finalRecipe.title,
      metaTitle: finalRecipe.metaTitle ?? null,
      metaDescription: finalRecipe.metaDescription ?? null,
      slug: recipeSlug,
      focusKeyphrase: keyword,
      contentMarkdown: finalRecipe.contentMarkdown ?? null,
      heroImageUrl: heroImageUrl,
      jsonLd: null, // JSON-LD not yet built at this point; schema checks run on the stored data later
      content_type: "recipe",
    })

    if (seoGateResult.status === "BLOCK") {
      const blockReasons = seoGateResult.blockingIssues.map(i => `${i.code}: ${i.message}`).join("; ")
      await appendLog(recipeId, logEntry("SEO Gate", "error", `BLOCKED — ${blockReasons}`))
      await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
      return
    }
    if (seoGateResult.warnings.length > 0) {
      await appendLog(recipeId, logEntry("SEO Gate", "error",
        `${seoGateResult.warnings.length} warnings: ${seoGateResult.warnings.map(w => `${w.code}: ${w.message}`).join("; ")}`))
    } else {
      await appendLog(recipeId, logEntry("SEO Gate", "done", `PASS — score: ${seoGateResult.score}/100`))
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
      author: { "@type": "Person", name: "Chef Augustin Lefèvre", url: `${SITE_URL}/about`, description: "French-trained baker and recipe developer" },
      prepTime: finalRecipe.prepTime ? formatDuration(finalRecipe.prepTime) : "PT0M",
      cookTime: finalRecipe.cookTime ? formatDuration(finalRecipe.cookTime) : "PT0M",
      totalTime: finalRecipe.totalTime ? formatDuration(finalRecipe.totalTime) : "PT0M",
      recipeYield: finalRecipe.servings ?? "4 servings",
      recipeCategory: finalRecipe.tags?.[0] ?? "Main Course",
      recipeCuisine: finalRecipe.tags?.[1] ?? "American",
      keywords: (finalRecipe.tags ?? []).join(", "),
      recipeIngredient: (finalRecipe.ingredients ?? []).map(i => `${i.quantity ? i.quantity + " " : ""}${i.name}`),
      recipeInstructions: (finalRecipe.instructions ?? []).map((s, idx) => ({ "@type": "HowToStep", position: idx + 1, text: s.text })),
      ...(seoPlan.json_ld_recipe_base?.nutrition ? { nutrition: seoPlan.json_ld_recipe_base.nutrition } : {}),
    }

    // Verify JSON-LD integrity — key claims must be visible in page content
    const md = (finalRecipe.contentMarkdown ?? "").toLowerCase()
    const jsonLdIntegrityErrors: string[] = []

    // Check: author name must appear on page (in content or about link)
    if (!md.includes("chef augustin") && !md.includes("augustin lefèvre")) {
      jsonLdIntegrityErrors.push("JSON-LD author 'Chef Augustin Lefèvre' not visible in page content")
    }

    // Check: nutrition data in JSON-LD should be reflected in content
    if (seoPlan.json_ld_recipe_base?.nutrition) {
      if (!md.includes("calories") && !md.includes("nutrition") && !md.includes("per serving")) {
        jsonLdIntegrityErrors.push("JSON-LD contains nutrition data not reflected in visible content")
      }
    }

    // Check: recipe schema must have visible ingredients and instructions
    if (!finalRecipe.ingredients?.length || !finalRecipe.instructions?.length) {
      jsonLdIntegrityErrors.push("JSON-LD Recipe schema generated but ingredients/instructions are empty in visible content")
    }

    if (jsonLdIntegrityErrors.length > 0) {
      await appendLog(recipeId, logEntry("Workflow", "error",
        `JSON-LD integrity issues: ${jsonLdIntegrityErrors.join("; ")}`))
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        recipeBase,
        { "@type": "BlogPosting", headline: finalRecipe.title, description: finalRecipe.metaDescription || finalRecipe.excerpt || undefined, author: { "@type": "Person", name: "Chef Augustin Lefèvre", url: `${SITE_URL}/about`, description: "French-trained baker and recipe developer" }, datePublished: now, dateModified: now, keywords: (finalRecipe.tags ?? []).join(", ") },
        ...(faqItems.length > 0 && format !== "pin-first" ? [{ "@type": "FAQPage" as const, mainEntity: faqItems.map(f => ({ "@type": "Question" as const, name: f.question, acceptedAnswer: { "@type": "Answer" as const, text: f.answer } })) }] : []),
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` }, { "@type": "ListItem", position: 2, name: "Recipes", item: `${SITE_URL}/recettes` }, { "@type": "ListItem", position: 3, name: finalRecipe.title, item: `${SITE_URL}/recettes/${slugify(keyword)}` }] },
      ],
    }

    const publishStatus = degraded ? "degraded" : "published"
    await db.update(recipes).set({
      title: finalRecipe.title, metaTitle: finalRecipe.metaTitle, metaDescription: finalRecipe.metaDescription,
      excerpt: finalRecipe.excerpt, contentMarkdown: finalRecipe.contentMarkdown,
      prepTime: finalRecipe.prepTime, cookTime: finalRecipe.cookTime, totalTime: finalRecipe.totalTime,
      servings: finalRecipe.servings, difficulty: finalRecipe.difficulty,
      ingredients: finalRecipe.ingredients, instructions: finalRecipe.instructions, tags: finalRecipe.tags,
      heroImageUrl, imageVariants, jsonLd: jsonLd as Record<string, unknown>,
      status: publishStatus, publishedAt: degraded ? null : new Date(), updatedAt: new Date(),
    }).where(eq(recipes.id, recipeId))

    await appendLog(recipeId, logEntry("Workflow", degraded ? "error" : "done",
      `${degraded ? "Degraded" : "Published"} — ${wordCount} words, ${(finalRecipe.ingredients ?? []).length} ingredients, ${(finalRecipe.instructions ?? []).length} steps, JSON-LD @graph with ${jsonLd["@graph"].length} nodes${degraded ? " — REQUIRES MANUAL REVIEW before publishing" : ""}`))
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
