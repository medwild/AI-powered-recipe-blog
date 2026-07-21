/**
 * Step 10 — Draft persistence with JSON-LD enrichment, sitemap ping.
 */

import { db } from "@/lib/db"
import { recipes, type ImageVariant } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { slugify } from "@/lib/slug"
import type { RecipeDraft } from "../agents/chef-augustin"
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

/** Step 10 — Persist the final draft with JSON-LD enrichment.
 * Returns `{ blocked: true }` if content was rejected by quality gates,
 * so the caller can skip downstream steps (Pin generation, A/B stats). */
export async function persistFinalDraft(
  step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> },
  recipeId: number, finalRecipe: RecipeDraft,
  heroImageUrl: string | null, imageVariants: ImageVariant[],
  keyword: string,
  format: "google" | "pin-first" = "google",
  degraded = false,
): Promise<{ blocked: boolean }> {
  const result = await step.run("persist-draft-final", async () => {
    const isAutopilot = process.env.AUTOPILOT === "true"
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

    // Content similarity check removed in v14 — quality gate handles duplicates

    // Replace Writer template variables with actual values.
    // The Writer outputs {{current_month_year}} as a placeholder; the pipeline
    // fills it so the published content carries a real freshness signal.
    const freshnessDate = new Date()
    const currentMonthYear = freshnessDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    if (finalRecipe.contentMarkdown?.includes("{{current_month_year}}")) {
      finalRecipe.contentMarkdown = finalRecipe.contentMarkdown.replace(/\{\{current_month_year\}\}/g, currentMonthYear)
    }

    // Replace [IMAGE:alt text] placeholders with actual <img> tags.
    if (heroImageUrl && finalRecipe.contentMarkdown?.includes("[IMAGE:")) {
      finalRecipe.contentMarkdown = finalRecipe.contentMarkdown.replace(
        /\[IMAGE:\s*(.+?)\]/g,
        (_, alt) => `<img src="${heroImageUrl}" alt="${alt.trim()}" loading="lazy" />`,
      )
    }

    // Content similarity + GEO citability checks removed in v14.
    // Quality gate (lib/quality-gate.ts) handles food safety, word count,
    // banned words, and duplicate detection before content reaches persist.

    // SEO Gate — deterministic pre-publication checks (schema, meta, cannibalization, etc.)
    const recipeSlug = slugify(finalRecipe.title)
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
      if (isAutopilot) {
        await appendLog(recipeId, logEntry("SEO Gate", "error",
          `Warnings (autopilot: warn-only) — ${blockReasons}`))
      } else {
        await appendLog(recipeId, logEntry("SEO Gate", "error", `BLOCKED — ${blockReasons}`))
        await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, recipeId))
        return { blocked: true }
      }
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

    const faqItems = parseFaqFromMarkdown(finalRecipe.contentMarkdown ?? "")
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
      ...(finalRecipe.jsonLd?.nutrition ? { nutrition: (finalRecipe.jsonLd as Record<string, unknown>).nutrition } : {}),
    }

    // Verify JSON-LD integrity — key claims must be visible in page content
    const md = (finalRecipe.contentMarkdown ?? "").toLowerCase()
    const jsonLdIntegrityErrors: string[] = []

    // Check: author name must appear on page (in content or about link)
    if (!md.includes("chef augustin") && !md.includes("augustin lefèvre")) {
      jsonLdIntegrityErrors.push("JSON-LD author 'Chef Augustin Lefèvre' not visible in page content")
    }

    // Check: nutrition data in JSON-LD should be reflected in content
    if (finalRecipe.jsonLd && (finalRecipe.jsonLd as Record<string, unknown>).nutrition) {
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

    // Pin-First: minimal JSON-LD (Recipe + BreadcrumbList only — no BlogPosting, no FAQPage)
    // Google: full JSON-LD (Recipe + BlogPosting + FAQPage + BreadcrumbList)
    const blogPostingNode = format !== "pin-first"
      ? { "@type": "BlogPosting" as const, headline: finalRecipe.title, description: finalRecipe.metaDescription || finalRecipe.excerpt || undefined, author: { "@type": "Person", name: "Chef Augustin Lefèvre", url: `${SITE_URL}/about`, description: "French-trained baker and recipe developer" }, datePublished: now, dateModified: now, keywords: (finalRecipe.tags ?? []).join(", ") }
      : null

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        recipeBase,
        ...(blogPostingNode ? [blogPostingNode] : []),
        ...(faqItems.length > 0 && format !== "pin-first" ? [{ "@type": "FAQPage" as const, mainEntity: faqItems.map(f => ({ "@type": "Question" as const, name: f.question, acceptedAnswer: { "@type": "Answer" as const, text: f.answer } })) }] : []),
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` }, { "@type": "ListItem", position: 2, name: "Recipes", item: `${SITE_URL}/recettes` }, { "@type": "ListItem", position: 3, name: finalRecipe.title, item: `${SITE_URL}/recettes/${recipeSlug}` }] },
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
      content_type: "recipe", slug: recipeSlug,
      status: publishStatus, publishedAt: degraded ? null : new Date(), updatedAt: new Date(),
    }).where(eq(recipes.id, recipeId))

    // Ping Google sitemap after successful publish
    if (publishStatus === "published") {
      try {
        await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`)
      } catch {
        // Sitemap ping failure is non-blocking
      }
    }

    await appendLog(recipeId, logEntry("Workflow", degraded ? "error" : "done",
      `${degraded ? "Degraded" : "Published"} — ${wordCount} words, ${(finalRecipe.ingredients ?? []).length} ingredients, ${(finalRecipe.instructions ?? []).length} steps, JSON-LD @graph with ${jsonLd["@graph"].length} nodes${degraded ? " — REQUIRES MANUAL REVIEW before publishing" : ""}`))

    return { blocked: false }
  })
  return result as { blocked: boolean }
}
