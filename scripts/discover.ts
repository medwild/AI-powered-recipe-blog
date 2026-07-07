/**
 * Discovery Pipeline — Pinterest SERP Opportunity Engine
 *
 * One-shot script that:
 * 1. Reads keywords from data/pinterest-keywords.json
 * 2. Queries Serper.dev for each keyword
 * 3. Extracts Pinterest presence data from SERP results
 * 4. Scores keywords using the 4-factor Opportunity Score v2
 * 5. Writes structured output to data/discovery-output.json
 *
 * Usage: npx tsx scripts/discover.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { db } from "../lib/db/index"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawKeyword {
  keyword: string
  volume?: number
  kd?: number
}

interface PinterestSignal {
  position: number
  url: string
  url_type: "pin" | "board" | "profile" | "search_page" | "other" | "none"
  title: string
  snippet: string
  follower_estimate: number | null
  account_type: "personal" | "brand" | "unknown"
}

interface ScoredKeyword {
  keyword: string
  volume: number
  kd: number
  pinterest_position: number | null
  pinterest_url_type: string
  domain_beatability: { score: number; level: string; domain: string }
  engagement_gap: { score: number; follower_estimate: number | null }
  specialization_gap: { score: number; account_type: string }
  url_type: { score: number; type: string }
  final_opportunity_score: number
  decision: "high_priority" | "medium_priority" | "revisit_later" | "disqualified"
}

interface DiscoveryOutput {
  micro_niche: string
  generated_at: string
  keywords_scored: number
  high_priority: ScoredKeyword[]
  medium_priority: ScoredKeyword[]
  revisit_later: ScoredKeyword[]
  summary: {
    total_keywords: number
    high_priority_count: number
    medium_priority_count: number
    revisit_count: number
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyPinterestUrl(url: string): PinterestSignal["url_type"] {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (pathname.startsWith("/pin/")) return "pin"
    if (pathname.includes("/board/")) return "board"
    if (pathname.split("/").filter(Boolean).length === 1) return "profile"
    if (pathname.includes("/search/")) return "search_page"
    return "other"
  } catch {
    return "none"
  }
}

function extractFollowerEstimate(snippet: string): number | null {
  if (!snippet) return null
  const match = snippet.match(/([\d,.]+)\s*[kK]?\s*followers?/i)
  if (!match) return null
  const raw = match[1].replace(/,/g, "")
  const num = parseFloat(raw)
  if (isNaN(num)) return null
  if (/[kK]\s*followers?/i.test(match[0])) return Math.round(num * 1000)
  return Math.round(num)
}

function classifyAccount(title: string): PinterestSignal["account_type"] {
  const brandKeywords = [
    "allrecipes", "delish", "food network", "bon appetit",
    "tasty", "buzzfeed", "epicurious", "serious eats", "food52",
    "skinnytaste", "half baked harvest", "minimalist baker",
  ]
  const t = title.toLowerCase()
  if (brandKeywords.some(kw => t.includes(kw))) return "brand"
  const words = title.trim().split(/\s+/)
  if (words.length >= 3 && /[A-Z]/.test(title[0] ?? "")) return "brand"
  return words.length <= 2 ? "personal" : "unknown"
}

function scoreDomainBeatability(domain: string): { score: number; level: string; domain: string } {
  const unbeatable = ["allrecipes.com", "delish.com", "foodandwine.com", "foodnetwork.com", "bonappetit.com"]
  const veryHard = ["skinnytaste.com", "gimmesomeoven.com", "wellplated.com", "cookieandkate.com"]

  if (unbeatable.some(d => domain.includes(d))) return { score: 0, level: "unbeatable", domain }
  if (veryHard.some(d => domain.includes(d))) return { score: 20, level: "very_hard", domain }
  if (domain.includes("pinterest.com") || domain.includes("pin.it")) return { score: 80, level: "weak", domain }
  if (domain.length > 3) return { score: 60, level: "medium", domain }
  return { score: 100, level: "unknown", domain }
}

function scoreEngagementGap(followers: number | null, isBrand: boolean): { score: number; follower_estimate: number | null } {
  let score = 50
  if (followers === null) score = 50
  else if (followers < 50) score = 100
  else if (followers <= 200) score = 80
  else if (followers <= 1000) score = 50
  else if (followers <= 5000) score = 20
  else score = 0

  if (isBrand) score = Math.max(0, score - 30)
  return { score, follower_estimate: followers }
}

function scoreSpecializationGap(accountType: string): { score: number; account_type: string } {
  switch (accountType) {
    case "personal": return { score: 100, account_type: accountType }
    case "unknown": return { score: 70, account_type: accountType }
    case "brand": return { score: 10, account_type: accountType }
    default: return { score: 50, account_type: accountType }
  }
}

function scoreUrlType(urlType: string): { score: number; type: string } {
  switch (urlType) {
    case "pin": return { score: 100, type: "pin" }
    case "board": return { score: 40, type: "board" }
    case "profile": return { score: 30, type: "profile" }
    case "search_page": return { score: 20, type: "search_page" }
    default: return { score: 10, type: "other" }
  }
}

function computeFinalScore(kw: {
  domain_beatability: { score: number }
  engagement_gap: { score: number }
  specialization_gap: { score: number }
  url_type: { score: number }
}): number {
  return Math.round(
    kw.domain_beatability.score * 0.35 +
    kw.engagement_gap.score * 0.30 +
    kw.specialization_gap.score * 0.20 +
    kw.url_type.score * 0.15
  )
}

function decide(finalScore: number, domainLevel: string): ScoredKeyword["decision"] {
  if (domainLevel === "unbeatable") return "disqualified"
  if (finalScore >= 75) return "high_priority"
  if (finalScore >= 65) return "medium_priority"
  return "revisit_later"
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🔍 Pinterest SERP Opportunity Engine — Discovery Pipeline\n")

  // 1. Read keywords
  const keywordsPath = "data/pinterest-keywords.json"
  let keywords: RawKeyword[]
  try {
    const fs = await import("fs")
    keywords = JSON.parse(fs.readFileSync(keywordsPath, "utf-8"))
    console.log(`📋 Loaded ${keywords.length} keywords from ${keywordsPath}`)
  } catch {
    console.error(`❌ Could not read ${keywordsPath}. Create it with: echo '[{"keyword":"test"}]' > ${keywordsPath}`)
    process.exit(1)
  }

  const serperKey = process.env.SERPER_API_KEY
  if (!serperKey) {
    console.error("❌ SERPER_API_KEY not set in .env.local")
    process.exit(1)
  }

  const scored: ScoredKeyword[] = []

  // 2. Score each keyword
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i]!
    console.log(`\n🔑 [${i + 1}/${keywords.length}] "${kw.keyword}" (vol: ${kw.volume ?? "?"}, KD: ${kw.kd ?? "?"})`)

    try {
      // Query Serper
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: kw.keyword, gl: process.env.SERP_GL || "us", hl: process.env.SERP_HL || "en" }),
      })

      if (!response.ok) {
        console.log(`  ⚠️  Serper returned ${response.status}, skipping`)
        continue
      }

      const serp = await response.json() as {
        organic?: Array<{ position: number; title: string; link: string; snippet: string; domain?: string }>
      }
      const organic = serp.organic ?? []

      // Find Pinterest results
      const pinterestResults = organic.filter(
        o => o.link?.includes("pinterest.com") || o.link?.includes("pin.it"),
      )

      if (pinterestResults.length === 0) {
        console.log(`  📌 No Pinterest results in top 10 — skipping (no opportunity)`)
        continue
      }

      const topPin = pinterestResults[0]!
      const urlType = classifyPinterestUrl(topPin.link)
      const followers = extractFollowerEstimate(topPin.snippet ?? "")
      const accountType = classifyAccount(topPin.title)
      const domain = new URL(topPin.link).hostname

      const db = scoreDomainBeatability(domain)
      const eg = scoreEngagementGap(followers, accountType === "brand")
      const sg = scoreSpecializationGap(accountType)
      const ut = scoreUrlType(urlType)

      const finalScore = computeFinalScore({ domain_beatability: db, engagement_gap: eg, specialization_gap: sg, url_type: ut })
      const decision = decide(finalScore, db.level)

      const result: ScoredKeyword = {
        keyword: kw.keyword,
        volume: kw.volume ?? 0,
        kd: kw.kd ?? 0,
        pinterest_position: topPin.position,
        pinterest_url_type: urlType,
        domain_beatability: db,
        engagement_gap: eg,
        specialization_gap: sg,
        url_type: ut,
        final_opportunity_score: finalScore,
        decision,
      }

      scored.push(result)
      console.log(`  ✅ Score: ${finalScore}/100 (${decision}) | Type: ${urlType} | Account: ${accountType} | Followers: ${followers ?? "?"}`)

    } catch (err) {
      console.log(`  ❌ Error: ${err instanceof Error ? err.message : "unknown"}`)
    }

    // Rate limit pause between Serper calls
    if (i < keywords.length - 1) {
      await new Promise(r => setTimeout(r, 2_500))
    }
  }

  // 3. Write output
  const output: DiscoveryOutput = {
    micro_niche: "Easy Weeknight Dinners for Two",
    generated_at: new Date().toISOString(),
    keywords_scored: scored.length,
    high_priority: scored.filter(s => s.decision === "high_priority"),
    medium_priority: scored.filter(s => s.decision === "medium_priority"),
    revisit_later: scored.filter(s => s.decision === "revisit_later"),
    summary: {
      total_keywords: scored.length,
      high_priority_count: scored.filter(s => s.decision === "high_priority").length,
      medium_priority_count: scored.filter(s => s.decision === "medium_priority").length,
      revisit_count: scored.filter(s => s.decision === "revisit_later").length,
    },
  }

  const fs = await import("fs")
  fs.writeFileSync("data/discovery-output.json", JSON.stringify(output, null, 2))
  console.log(`\n📊 Done! ${output.summary.high_priority_count} high, ${output.summary.medium_priority_count} medium, ${output.summary.revisit_count} revisit`)
  console.log(`📁 Output: data/discovery-output.json`)

  await db.$client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error("❌ Discovery failed:", err)
  process.exit(1)
})
