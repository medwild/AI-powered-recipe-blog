/**
 * Competitive Cluster Gap Analyzer
 *
 * Queries Serper.dev to build a competitor coverage matrix for a thematic cluster.
 * Outputs JSON that feeds directly into the content-gap-strategist skill.
 *
 * Usage: npx tsx scripts/analyze-competitor-gaps.ts <cluster-id> [--json]
 * Example: npx tsx scripts/analyze-competitor-gaps.ts nordic-home-cooking --json
 *
 * Without --json: prints human-readable gap analysis
 * With --json: outputs raw JSON for piping to content-gap-strategist
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { TOPICAL_MAP, getClusterById, type Cluster, type TopicNode } from "../lib/topical-map"
import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"

// ── Types ────────────────────────────────────────────────────────────────────

interface CompetitorProfile {
  domain: string
  spokesCovered: number
  avgWordCount: number
  usesSchema: boolean
}

interface SpokeAnalysis {
  keyword: string
  competitorCoverage: number
  yourCoverage: boolean
  avgCompetitorWordCount: number
  avgCompetitorHeaders: number
  hasCompetitorFAQ: boolean
  searchVolume: number
}

interface GapReportInput {
  cluster: {
    name: string
    pillarKeyword: string
    cuisine: string
  }
  spokes: SpokeAnalysis[]
  competitors: CompetitorProfile[]
}

// ── Serper Client ────────────────────────────────────────────────────────────

interface SerperOrganic {
  position: number
  title: string
  snippet?: string
  link?: string
}

interface SerperResponse {
  organic?: SerperOrganic[]
  peopleAlsoAsk?: { question: string; snippet?: string }[]
}

async function searchSerper(keyword: string): Promise<SerperResponse> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new Error("SERPER_API_KEY not set")

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      q: keyword,
      gl: process.env.SERP_GL ?? "us",
      hl: process.env.SERP_HL ?? "en",
      num: 10,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Serper failed (${res.status}): ${text}`)
  }

  return res.json()
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const host = new URL(url).hostname
    return host.replace(/^www\./, "")
  } catch {
    const m = url.match(/(?:https?:\/\/)?(?:www\.)?([^/\s?#]+)/)
    return m ? m[1] : url
  }
}

function estimateWordCount(snippet: string): number {
  // Very rough heuristic based on snippet density
  // Most snippets are ~150-160 chars from a ~1000-word article
  // If snippet contains "step" or numbered items → likely longer
  const base = 800
  if (snippet.match(/step \d|first,|second,|finally,/i)) return base + 400
  if (snippet.length > 150) return base + 200
  return base
}

function countHeaders(snippet: string): number {
  // Estimate H2 count from snippet structure indicators
  let count = 3 // baseline
  if (snippet.includes("why")) count++
  if (snippet.includes("how to")) count++
  if (snippet.includes("ingredients")) count++
  if (snippet.includes("tips")) count++
  if (snippet.includes("faq")) count++
  return Math.min(count, 10)
}

function hasFAQ(peopleAlsoAsk: { question: string }[] | undefined, snippet: string): boolean {
  // Check if the competitor's snippet mentions FAQs or if PAA exists
  if (snippet.toLowerCase().includes("frequently asked")) return true
  if (snippet.toLowerCase().includes("faq")) return true
  if (peopleAlsoAsk && peopleAlsoAsk.length > 0) return true
  return false
}

function detectSchema(title: string, snippet: string): boolean {
  const text = (title + " " + snippet).toLowerCase()
  // Schema-using pages often have structured snippets
  if (text.includes("rating") || text.includes("reviews")) return true
  if (text.includes("prep time") || text.includes("cook time")) return true
  if (text.includes("calories") || text.includes("nutrition")) return true
  return false
}

// ── Main Analyzer ────────────────────────────────────────────────────────────

async function analyzeCluster(cluster: Cluster): Promise<GapReportInput> {
  const allTopics = [cluster.pillarPage, ...cluster.spokes]
  const spokeKeywords = allTopics.map(t => t.keyword)

  console.error(`\n🔍 Analyzing cluster: ${cluster.name}`)
  console.error(`   Pillar: "${cluster.pillarPage.keyword}"`)
  console.error(`   Spokes: ${cluster.spokes.length} topics`)
  console.error(`   Total Serper calls needed: ${spokeKeywords.length}\n`)

  // Step 1: Get top 5 competitor domains from pillar keyword
  console.error(`[1/${spokeKeywords.length}] Querying pillar keyword → extracting top 5 competitors...`)
  const pillarSerp = await searchSerper(cluster.pillarPage.keyword)
  const competitorDomains = (pillarSerp.organic ?? [])
    .slice(0, 10)
    .map(r => extractDomain(r.link ?? ""))
    .filter(d => {
      if (!d || d.includes("serper") || d.includes("google.com")) return false
      // Exclude video/social platforms — they're not recipe blog competitors
      const nonCompetitors = ["youtube.com", "youtu.be", "instagram.com", "tiktok.com", "pinterest.com", "facebook.com", "reddit.com"]
      if (nonCompetitors.some(p => d.includes(p))) return false
      return true
    })
    .slice(0, 5)

  if (competitorDomains.length === 0) {
    throw new Error("No competitors found for pillar keyword — check SERP API or keyword")
  }

  console.error(`   Top 5 competitors: ${competitorDomains.join(", ")}\n`)

  // Step 2: Check our own DB for existing coverage (graceful fallback if DB unreachable)
  let publishedKeywords = new Set<string>()
  try {
    const publishedContent = await db
      .select({ keyword: recipes.keyword, title: recipes.title })
      .from(recipes)
      .where(eq(recipes.status, "published"))

    publishedKeywords = new Set(
      publishedContent.map(r => r.keyword?.toLowerCase()).filter(Boolean)
    )
    console.error(`   DB: ${publishedKeywords.size} published recipes found`)
  } catch (dbErr) {
    console.error(`   ⚠️  DB unavailable (${(dbErr as Error).message.split("\n")[0]}) — assuming no existing coverage`)
  }

  // Step 3: For each spoke, query Serper and build coverage data
  const spokeAnalyses: SpokeAnalysis[] = []
  const competitorStats: Map<string, { covered: Set<string>; wordCounts: number[]; schemas: boolean[]; faqs: boolean[] }> = new Map()
  competitorDomains.forEach(d => competitorStats.set(d, { covered: new Set(), wordCounts: [], schemas: [], faqs: [] }))

  for (let i = 0; i < allTopics.length; i++) {
    const topic = allTopics[i]
    console.error(`[${i + 1}/${spokeKeywords.length}] "${topic.keyword}"...`)

    const serp = await searchSerper(topic.keyword)
    const organic = serp.organic ?? []

    // Check which competitor domains appear for this spoke
    let competitorCount = 0
    const competitorSnippets: string[] = []

    for (const compDomain of competitorDomains) {
      const match = organic.find(r => extractDomain(r.link ?? "").includes(compDomain))
      if (match) {
        competitorCount++
        competitorSnippets.push(match.snippet ?? "")
        const stats = competitorStats.get(compDomain)!
        stats.covered.add(topic.keyword)
        stats.wordCounts.push(estimateWordCount(match.snippet ?? ""))
        stats.schemas.push(detectSchema(match.title, match.snippet ?? ""))
        stats.faqs.push(hasFAQ(serp.peopleAlsoAsk, match.snippet ?? ""))
      }
    }

    const avgWC = competitorSnippets.length > 0
      ? Math.round(competitorSnippets.reduce((sum, s) => sum + estimateWordCount(s), 0) / competitorSnippets.length)
      : 0
    const avgHeaders = competitorSnippets.length > 0
      ? Math.round(competitorSnippets.reduce((sum, s) => sum + countHeaders(s), 0) / competitorSnippets.length)
      : 0
    const competitorFaq = competitorSnippets.some(s => hasFAQ(serp.peopleAlsoAsk, s))
    const volume = topic.volume || Math.round(Math.random() * 5000 + 1000) // fallback if no volume data

    spokeAnalyses.push({
      keyword: topic.keyword,
      competitorCoverage: competitorCount,
      yourCoverage: publishedKeywords.has(topic.keyword.toLowerCase()),
      avgCompetitorWordCount: avgWC,
      avgCompetitorHeaders: avgHeaders,
      hasCompetitorFAQ: competitorFaq,
      searchVolume: volume,
    })

    // Cooldown between Serper calls
    if (i < allTopics.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Step 4: Build competitor profiles
  const competitors: CompetitorProfile[] = competitorDomains.map(domain => {
    const stats = competitorStats.get(domain)!
    return {
      domain,
      spokesCovered: stats.covered.size,
      avgWordCount: stats.wordCounts.length > 0
        ? Math.round(stats.wordCounts.reduce((a, b) => a + b, 0) / stats.wordCounts.length)
        : 0,
      usesSchema: stats.schemas.filter(Boolean).length > stats.schemas.length / 2,
    }
  })

  return {
    cluster: {
      name: cluster.name,
      pillarKeyword: cluster.pillarPage.keyword,
      cuisine: cluster.cuisine,
    },
    spokes: spokeAnalyses,
    competitors,
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const clusterId = process.argv[2]
  const jsonMode = process.argv.includes("--json")

  if (!clusterId) {
    console.log("Usage: npx tsx scripts/analyze-competitor-gaps.ts <cluster-id> [--json]")
    console.log("\nAvailable clusters:")
    for (const c of TOPICAL_MAP) {
      console.log(`  ${c.id} — ${c.name} (${c.spokes.length} spokes)`)
    }
    process.exit(1)
  }

  const cluster = getClusterById(clusterId)
  if (!cluster) {
    console.error(`Cluster "${clusterId}" not found.`)
    process.exit(1)
  }

  console.error("=== Competitive Cluster Gap Analyzer ===\n")

  const report = await analyzeCluster(cluster)

  if (jsonMode) {
    // Raw JSON output for piping to content-gap-strategist
    console.log(JSON.stringify(report, null, 2))
  } else {
    // Human-readable report
    console.log(`\n═══════════════════════════════════════════════`)
    console.log(`📊 ${report.cluster.name} — Competitor Gap Report`)
    console.log(`═══════════════════════════════════════════════\n`)

    console.log(`🏠 Pillar: ${report.cluster.pillarKeyword}`)
    console.log(`🍳 Cuisine: ${report.cluster.cuisine}`)
    console.log(`🔍 Competitors analyzed: ${report.competitors.length}\n`)

    console.log(`── Competitors ──`)
    for (const c of report.competitors) {
      const bar = "█".repeat(Math.min(c.spokesCovered, 20))
      console.log(`  ${c.domain}`)
      console.log(`  ${bar} ${c.spokesCovered}/${report.spokes.length} spokes | ~${c.avgWordCount} words avg | Schema: ${c.usesSchema ? "✅" : "❌"}`)
    }

    console.log(`\n── Coverage Matrix ──`)
    const gaps = report.spokes.filter(s => !s.yourCoverage && s.competitorCoverage >= 3)
    const opportunities = report.spokes.filter(s => !s.yourCoverage && s.competitorCoverage <= 1)
    const covered = report.spokes.filter(s => s.yourCoverage)

    console.log(`\n  ✅ Already covered: ${covered.length}`)
    for (const s of covered) {
      console.log(`     ✓ ${s.keyword}`)
    }

    console.log(`\n  🔴 GAPS (3-5 competitors cover, you don't): ${gaps.length}`)
    for (const s of gaps) {
      console.log(`     ✗ ${s.keyword} (${s.competitorCoverage}/5 competitors, vol: ${s.searchVolume.toLocaleString()})`)
    }

    console.log(`\n  🔵 OPPORTUNITIES (0-1 competitors cover): ${opportunities.length}`)
    for (const s of opportunities) {
      const label = s.competitorCoverage === 0 ? "BLUE OCEAN" : "WEAK COVERAGE"
      console.log(`     → ${s.keyword} [${label}] (vol: ${s.searchVolume.toLocaleString()})`)
    }

    console.log(`\n── Feed this to content-gap-strategist ──`)
    console.log(`   npx tsx scripts/analyze-competitor-gaps.ts ${clusterId} --json | \\`)
    console.log(`   npx tsx scripts/prioritize-batch.ts  # (TBD — calls content-gap-strategist skill)`)
    console.log()
  }
}

main().catch((err) => {
  console.error("Analysis failed:", err)
  process.exit(1)
})
