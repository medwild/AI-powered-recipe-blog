/**
 * End-to-End Recipe Generation Test — REAL APIs
 *
 * Tests the full pipeline with real external services:
 *   DeepSeek v4 Pro (LLM), Ideogram (images), Cloudinary (upload),
 *   Serper (SERP), Neon (DB).
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx scripts/test-e2e-real.ts [keyword]
 *
 * Example:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx scripts/test-e2e-real.ts "swedish meatballs"
 *
 * Cost estimate per run: ~$0.05-0.15 (LLM + 2-3 images)
 */

// dotenv/config reads DOTENV_CONFIG_PATH from env. It runs FIRST (ESM hoisting)
// so all subsequent imports see the correct DATABASE_URL, API keys, etc.
import "dotenv/config"

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { runSerpPhase } from "@/lib/inngest/functions/steps/serp-phase"
import { runContentLoopPhase } from "@/lib/inngest/functions/steps/content-loop-phase"
import { runImagePhase } from "@/lib/inngest/functions/steps/image-phase"
import { persistFinalDraft } from "@/lib/inngest/functions/steps/persist-phase"
import { checkCitability } from "@/lib/geo-validator"
import { validateContent, scrubBannedWords } from "@/lib/content-validator"
import { computeLoopScore } from "@/lib/loop-scorer"

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function mockStep(label?: string) {
  return {
    run: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now()
      console.log(`  ▶ ${_name}...`)
      try {
        const result = await fn()
        const dur = ((Date.now() - start) / 1000).toFixed(1)
        console.log(`  ✓ ${_name} (${dur}s)`)
        return result
      } catch (err) {
        const dur = ((Date.now() - start) / 1000).toFixed(1)
        console.log(`  ✗ ${_name} (${dur}s) — ${(err as Error).message}`)
        throw err
      }
    },
    sleep: async (_name: string, _dur: string): Promise<void> => undefined,
  }
}

const SEP = "═".repeat(60)

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const keyword = process.argv[2] || "swedish meatballs recipe"
  const format = (process.argv[3] === "pin-first" ? "pin-first" : "google") as "google" | "pin-first"

  console.log(`\n${SEP}`)
  console.log(`E2E Recipe Generation Test — REAL APIs`)
  console.log(`${SEP}`)
  console.log(`Keyword:  "${keyword}"`)
  console.log(`Format:   ${format}`)
  console.log(`Provider: ${process.env.LLM_PROVIDER || "default"} → ${process.env.ANTHROPIC_MODEL || "unspecified"}`)
  console.log(`Images:   Ideogram ${process.env.IDEOGRAM_MODEL || "V_4_TURBO"}`)
  console.log(`${SEP}\n`)

  const cuisineReplacements = {
    cuisine: "Scandinavian Comfort Food",
    cuisine_ingredients: "beef, pork, cream, allspice, nutmeg, butter, onion, egg, breadcrumbs, stock",
    cuisine_techniques: "panade, searing, deglazing, roux-based sauce, cream reduction, chilling",
  }

  let recipeId: number | null = null

  try {
    // ── Setup: Create test recipe in DB ────────────────────────────────────
    console.log("1. DB SETUP — Creating test recipe row...")
    const [recipe] = await db.insert(recipes).values({
      slug: `test-${Date.now()}`,
      keyword,
      title: keyword,
      status: "draft",
      content_type: "recipe",
    }).returning({ id: recipes.id })
    recipeId = recipe.id
    console.log(`   Recipe ID: ${recipeId}\n`)

    // ── Phase 1: SERP ──────────────────────────────────────────────────────
    console.log("2. SERP PHASE — Fetching Google SERP data...")
    const stepSerp = mockStep()
    const serpResult = await runSerpPhase(stepSerp, recipeId, keyword)
    console.log(`   Organic results:  ${serpResult.serp.organic.length}`)
    console.log(`   PAA questions:    ${serpResult.serp.relatedQuestions.length}`)
    console.log(`   Related searches: ${serpResult.serp.relatedSearches.length}`)
    console.log(`   Degraded:         ${serpResult.degraded}\n`)

    // ── Phase 2: Content Loop ──────────────────────────────────────────────
    console.log("3. CONTENT LOOP — Writer + Validators (max 3 passes)...")
    const stepLoop = mockStep()
    const loopStart = Date.now()
    const contentResult = await runContentLoopPhase(
      stepLoop, recipeId, keyword, serpResult, cuisineReplacements, format,
    )
    const loopDur = ((Date.now() - loopStart) / 1000).toFixed(1)
    console.log(`   Passes used:      ${contentResult.passesUsed}`)
    console.log(`   Best score:        ${contentResult.bestScore}/100`)
    console.log(`   Degraded:          ${contentResult.degraded}`)
    console.log(`   Total duration:    ${loopDur}s\n`)

    // ── Text content assertions ────────────────────────────────────────────
    console.log("4. TEXT VALIDATION — Deterministic checks...")
    const out = contentResult.output
    const wordCount = (out.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length
    const citability = checkCitability(out.contentMarkdown ?? "", wordCount)

    console.log(`   Title:             "${out.title}"`)
    console.log(`   Words:             ${wordCount}`)
    console.log(`   Ingredients:       ${out.ingredients.length}`)
    console.log(`   Instructions:      ${out.instructions.length}`)
    console.log(`   Tags:              ${out.tags.join(", ")}`)
    console.log(`   GEO Score:         ${citability.score}/100`)
    console.log(`   Claims:            ${citability.claims.count}/${citability.claims.minRequired}`)
    console.log(`   Attributions:      ${citability.attributions.count}/${citability.attributions.minRequired}`)
    console.log(`   Nuggets:           ${citability.nuggets.count}/${citability.nuggets.minRequired}`)

    // Content validation
    const validation = validateContent({
      contentMarkdown: out.contentMarkdown,
      title: out.title,
      metaTitle: out.metaTitle,
      metaDescription: out.metaDescription,
      ingredients: out.ingredients,
      instructions: out.instructions,
      contentType: "recipe",
      format,
    })

    const errors = validation.errors.filter(e => e.severity === "error")
    const warnings = validation.errors.filter(e => e.severity === "warning")

    if (errors.length > 0) {
      console.log(`\n   ❌ ERRORS:`)
      errors.forEach(e => console.log(`      - ${e.field}: ${e.message}`))
    }
    if (warnings.length > 0) {
      console.log(`   ⚠ WARNINGS (${warnings.length}):`)
      warnings.forEach(w => console.log(`      - ${w.field}: ${w.message}`))
    }
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`   ✅ No content validation issues`)
    }

    // Banned word check
    const scrubbed = scrubBannedWords(out.contentMarkdown ?? "")
    if (scrubbed.replacements.length > 0) {
      console.log(`   ⚠ Banned words found: ${scrubbed.replacements.join(", ")}`)
    } else {
      console.log(`   ✅ No banned words`)
    }

    // Text assertions
    const textChecks = {
      title: out.title.length > 0,
      wordCount: wordCount >= 1000,
      ingredients: out.ingredients.length >= 4,
      instructions: out.instructions.length >= 3,
      tags: out.tags.length >= 2,
      imagePrompt: (out.imagePrompt ?? "").length >= 50,
      jsonLd: typeof out.jsonLd === "object",
      noErrors: errors.length === 0,
    }

    console.log(`\n   Text Checks:`)
    Object.entries(textChecks).forEach(([k, v]) => {
      console.log(`   ${v ? "✅" : "❌"} ${k}`)
    })
    const textPassed = Object.values(textChecks).every(Boolean)

    // ── Phase 3: Images ────────────────────────────────────────────────────
    console.log("\n5. IMAGE PHASE — Generating and uploading images...")
    const stepImage = mockStep()
    const imageStart = Date.now()
    const imageResult = await runImagePhase(
      stepImage, recipeId,
      { title: out.title, tags: out.tags, imagePrompt: out.imagePrompt },
      keyword,
    )
    const imageDur = ((Date.now() - imageStart) / 1000).toFixed(1)

    console.log(`   Variants:          ${imageResult.imageVariants.length}`)
    console.log(`   Hero image:        ${imageResult.heroImageUrl ? "✅" : "❌"}`)
    console.log(`   Degraded:          ${imageResult.degraded}`)
    console.log(`   Duration:          ${imageDur}s`)

    imageResult.imageVariants.forEach((v, i) => {
      console.log(`   Variant ${i + 1}:       ${v.url.substring(0, 80)}...`)
    })

    const imageChecks = {
      hasHero: imageResult.heroImageUrl !== null,
      hasVariants: imageResult.imageVariants.length >= 1,
      urlsValid: imageResult.imageVariants.every(v => v.url.startsWith("https://")),
      notDegraded: !imageResult.degraded,
    }

    console.log(`\n   Image Checks:`)
    Object.entries(imageChecks).forEach(([k, v]) => {
      console.log(`   ${v ? "✅" : "❌"} ${k}`)
    })
    const imagePassed = Object.values(imageChecks).every(Boolean)

    // ── Persist final draft ─────────────────────────────────────────────────
    console.log("\n6. PERSIST — Final validation + DB write...")
    const stepPersist = mockStep()
    await persistFinalDraft(
      stepPersist, recipeId, out,
      imageResult.heroImageUrl, imageResult.imageVariants as any,
      keyword, format, contentResult.degraded || imageResult.degraded,
    )

    // ── Read back from DB ───────────────────────────────────────────────────
    const saved = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1)
    const savedRecipe = saved[0]

    console.log(`   Status:            ${savedRecipe.status}`)
    console.log(`   Has JSON-LD:       ${savedRecipe.jsonLd ? "✅" : "❌"}`)
    console.log(`   Has hero image:    ${savedRecipe.heroImageUrl ? "✅" : "❌"}`)
    console.log(`   Published at:      ${savedRecipe.publishedAt || "not set"}`)

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log(`\n${SEP}`)
    console.log(`RESULTS`)
    console.log(`${SEP}`)
    console.log(`  Text:    ${textPassed ? "✅ PASS" : "❌ FAIL"}`)
    console.log(`  Images:  ${imagePassed ? "✅ PASS" : "❌ FAIL"}`)
    console.log(`  Overall: ${textPassed && imagePassed ? "✅ PASS" : "❌ FAIL"}`)
    console.log(`${SEP}\n`)

    // ── Content preview ─────────────────────────────────────────────────────
    console.log("CONTENT PREVIEW (first 500 chars):")
    console.log("---")
    console.log((out.contentMarkdown ?? "").substring(0, 500))
    console.log("...\n")

    // ── Final exit code ─────────────────────────────────────────────────────
    if (!textPassed || !imagePassed) {
      process.exit(1)
    }

  } catch (err) {
    console.error(`\n💥 FATAL: ${(err as Error).message}`)
    console.error((err as Error).stack)
    process.exit(1)
  } finally {
    // Cleanup: mark test recipe as draft so it doesn't show on the site
    if (recipeId) {
      try {
        await db.update(recipes)
          .set({ status: "draft", updatedAt: new Date() })
          .where(eq(recipes.id, recipeId))
        console.log(`Cleaned up test recipe ${recipeId} (set to draft).`)
      } catch {
        // best effort
      }
    }
    process.exit(0) // Force exit (DB pool stays open)
  }
}

main()
