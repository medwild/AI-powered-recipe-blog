#!/usr/bin/env npx tsx
/**
 * Citation Readiness Check — CLI script
 *
 * Audits a recipe's GEO/LLM optimization quality and predicts how
 * likely each major LLM platform is to cite the content.
 *
 * Usage:
 *   npx tsx scripts/citation-readiness-check.ts --id 42
 *   npx tsx scripts/citation-readiness-check.ts --slug "sourdough-discard-flatbread"
 *   npx tsx scripts/citation-readiness-check.ts --markdown ./test-article.md --keyword "test"
 *
 * Requires DATABASE_URL in environment for --id/--slug modes.
 */

import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { eq, and } from "drizzle-orm"
import { assessCitationReadiness } from "../lib/citation-readiness"
import { readFileSync } from "fs"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorScore(score: number): string {
  if (score >= 75) return `\x1b[32m${score}\x1b[0m`   // green
  if (score >= 50) return `\x1b[33m${score}\x1b[0m`   // yellow
  return `\x1b[31m${score}\x1b[0m`                      // red
}

function colorVerdict(v: string): string {
  if (v === "READY" || v === "STRONG") return `\x1b[32m${v}\x1b[0m`
  if (v === "NEEDS_WORK" || v === "ADEQUATE") return `\x1b[33m${v}\x1b[0m`
  return `\x1b[31m${v}\x1b[0m`
}

function pad(str: string, len: number): string {
  return str.padEnd(len)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const idArg = args.find(a => a.startsWith("--id="))?.split("=")[1]
  const slugArg = args.find(a => a.startsWith("--slug="))?.split("=")[1]
  const mdArg = args.find(a => a.startsWith("--markdown="))?.split("=")[1]
  const keywordArg = args.find(a => a.startsWith("--keyword="))?.split("=")[1]

  let markdown: string
  let keyword: string
  let publishedAt: Date | null = null
  let updatedAt: Date | null = null
  let title = "Unknown"

  if (mdArg) {
    // File mode
    markdown = readFileSync(mdArg, "utf-8")
    keyword = keywordArg ?? "unknown"
    title = mdArg
  } else if (idArg || slugArg) {
    // DB mode
    const numericId = idArg ? parseInt(idArg, 10) : null

    let query
    if (numericId && !isNaN(numericId)) {
      query = db.select().from(recipes).where(eq(recipes.id, numericId))
    } else if (slugArg) {
      query = db.select().from(recipes).where(
        and(eq(recipes.slug, slugArg), eq(recipes.content_type, "recipe"))
      )
    } else {
      console.error("Error: --id must be a number, or provide --slug")
      process.exit(1)
    }

    const [recipe] = await query
    if (!recipe) {
      console.error(`Error: Recipe not found (id=${idArg}, slug=${slugArg})`)
      process.exit(1)
    }

    markdown = recipe.contentMarkdown ?? ""
    keyword = recipe.keyword ?? recipe.title
    publishedAt = recipe.publishedAt
    updatedAt = recipe.updatedAt
    title = recipe.title
  } else {
    console.error("Usage: npx tsx scripts/citation-readiness-check.ts --id=42 | --slug=xxx | --markdown=file.md --keyword=xxx")
    process.exit(1)
  }

  if (!markdown.trim()) {
    console.error("Error: No content to assess. The recipe has an empty contentMarkdown.")
    process.exit(1)
  }

  const wordCount = markdown.split(/\s+/).filter(Boolean).length

  console.log(`\n📋 Citation Readiness Report — "${title}"`)
  console.log(`   Words: ${wordCount} | Keyword: ${keyword}\n`)

  const report = assessCitationReadiness({ markdown, wordCount, keyword, publishedAt, updatedAt })

  // ── Overall Score ──────────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────┐")
  console.log(`│  Overall Score: ${colorScore(report.overallScore)}/100  →  ${colorVerdict(report.overallVerdict)}  │`)
  console.log("└─────────────────────────────────────────────┘\n")

  // ── Citability Breakdown ───────────────────────────────────────────────
  console.log("── Citability (GEO Validator) ──")
  console.log(`  Score: ${colorScore(report.citability.score)}/100`)
  console.log(`  Claims:       ${report.citability.claims.count}/${report.citability.claims.minRequired}`)
  console.log(`  Attributions: ${report.citability.attributions.count}/${report.citability.attributions.minRequired}`)
  console.log(`  Nuggets:      ${report.citability.nuggets.count}/${report.citability.nuggets.minRequired}`)
  console.log(`  Feedback: ${report.citability.feedback}`)
  console.log()

  // ── Platform Scores ────────────────────────────────────────────────────
  console.log("── Per-Platform Citation Predictions ──")
  console.log(`  ${pad("Platform", 30)} ${pad("Score", 8)} Verdict`)
  console.log(`  ${"─".repeat(30)} ${"─".repeat(8)} ───────`)
  for (const p of report.platforms) {
    console.log(`  ${pad(p.platform, 30)} ${pad(colorScore(p.score) + "/100", 16)} ${colorVerdict(p.verdict)}`)
  }
  console.log()

  // ── Freshness ──────────────────────────────────────────────────────────
  console.log("── Freshness Signals ──")
  console.log(`  Updated date >7d after published: ${report.freshness.hasUpdatedDate ? "✅" : "❌"}`)
  console.log(`  Freshness marker in content:      ${report.freshness.hasFreshnessMarker ? "✅" : "❌"}`)
  console.log(`  Template {{current_month_year}} replaced: ${report.freshness.templateReplaced ? "✅" : "❌"}`)
  console.log()

  // ── External Sources ───────────────────────────────────────────────────
  console.log(`── External Sources (matched: ${report.matchedSources.length}) ──`)
  if (report.matchedSources.length === 0) {
    console.log("  ⚠️  No external sources matched for this keyword.")
  } else {
    for (const s of report.matchedSources.slice(0, 3)) {
      console.log(`  • ${s.source}`)
      console.log(`    "${s.fact.substring(0, 100)}…"`)
    }
  }
  console.log()

  // ── Answer Nuggets ─────────────────────────────────────────────────────
  console.log(`── Extractable Answer Nuggets (${report.answerNuggets.length}) ──`)
  if (report.answerNuggets.length === 0) {
    console.log("  ⚠️  No extractable Q&A pairs found.")
  } else {
    for (const n of report.answerNuggets.slice(0, 5)) {
      console.log(`  • ${n}`)
    }
  }
  console.log()

  // ── Issues ─────────────────────────────────────────────────────────────
  if (report.issues.length > 0) {
    console.log("── Issues ──")
    for (const issue of report.issues) {
      const icon = issue.severity === "blocking" ? "🔴" : "🟡"
      console.log(`  ${icon} [${issue.severity}] ${issue.message}`)
    }
    console.log()
  }

  // ── Per-Platform Details ──────────────────────────────────────────────
  console.log("── Per-Platform Signal Details ──")
  for (const p of report.platforms) {
    console.log(`\n  ▸ ${p.platform}  ${colorScore(p.score)}/100 (${p.verdict})`)
    console.log(`    ${p.recommendation}`)
    if (p.signalsPresent.length > 0) {
      console.log(`    ✅ Present: ${p.signalsPresent.map(s => s.split("(")[0].trim()).join(", ")}`)
    }
    if (p.signalsMissing.length > 0) {
      console.log(`    ❌ Missing: ${p.signalsMissing.map(s => s.split("(")[0].trim()).join(", ")}`)
    }
  }

  console.log("\n── Done ──\n")

  // Exit code based on readiness
  if (report.overallVerdict === "NOT_READY") {
    process.exit(1)
  }
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(2)
})
