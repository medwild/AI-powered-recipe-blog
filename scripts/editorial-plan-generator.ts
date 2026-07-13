/**
 * Editorial Plan Generator — SEO Organic Rankings Analyzer
 *
 * Reads the enriched MASTER CSV (37 columns), parses, filters by micro-niche,
 * maps to PTRA boards, and generates a prioritized editorial plan.
 *
 * Usage:
 *   npx tsx scripts/editorial-plan-generator.ts --csv claude_code_recipe_keywords_MASTER_combined.csv
 *   npx tsx scripts/editorial-plan-generator.ts --csv <path> --niche "My Micro Niche"
 *   npx tsx scripts/editorial-plan-generator.ts --csv <path> --phase 0  (parse only)
 */

import * as fs from "node:fs"
import * as path from "node:path"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw row as parsed from CSV (all strings) */
interface CsvRow {
  schema_version: string
  global_row_id: string
  source_batch: string
  source_file: string
  source_row: string
  keyword: string
  normalized_keyword: string
  search_intent: string
  previous_position_raw: string
  current_position_raw: string
  position_change_raw: string
  estimated_google_traffic: string
  traffic_change_raw: string
  search_volume: string
  keyword_difficulty: string
  cpc_usd: string
  pinterest_url: string
  pinterest_result_type: string
  last_update_raw: string
  serp_feature_changes: string
  serp_features_new: string
  serp_features_lost: string
  top10_presence_signal: string
  topic_cluster: string
  content_role: string
  priority_tier: string
  ptra_fit_signal: string
  ptra_fit_level_normalized: string
  recommended_action: string
  final_editorial_action: string
  risk_flag: string
  risk_flag_normalized: string
  risk_reason: string
  duplicate_keyword_count: string
  duplicate_keyword_rank: string
  is_duplicate_keyword: string
  claude_code_instruction: string
}

/** Cleaned/normalized keyword record */
interface ParsedKeyword {
  keyword: string
  normalizedKeyword: string
  searchIntent: string
  searchVolume: number
  keywordDifficulty: number
  cpcUsd: number
  currentPosition: number | null
  positionChange: string
  estimatedTraffic: number
  pinterestUrl: string
  pinterestResultType: "pinterest_pin" | "pinterest_board" | "pinterest_profile" | "unknown"
  topicCluster: string
  contentRole: string
  priorityTier: "P1" | "P2" | "P3" | "PILLAR" | "EXCLUDE" | "UNKNOWN"
  ptraFitSignal: string
  ptraFitLevel: string
  recommendedAction: string
  finalEditorialAction: string
  riskFlag: boolean
  riskReason: string
  top10PresenceSignal: string
  serpFeaturesNew: string
  serpFeaturesLost: string
  claudeCodeInstruction: string
  // Parsing metadata
  parsingIssues: string[]
  rowIndex: number
}

/** Niche-filtered keyword with relevance score */
interface NicheKeyword extends ParsedKeyword {
  nicheScore: number
  nicheClassification: "CORE" | "SUPPORTING" | "LONG_TAIL" | "EXCLUDED"
  excludeReason?: string
}

/** PTRA board assignment */
interface BoardMappedKeyword extends NicheKeyword {
  primaryBoard: string
  boardFitConfidence: "HIGH" | "MEDIUM" | "LOW"
}

/** A batch in the editorial plan */
interface EditorialBatch {
  batchId: string
  priority: "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW"
  description: string
  criteria: string
  keywords: BoardMappedKeyword[]
}

/** Full editorial plan */
interface EditorialPlan {
  planName: string
  generatedAt: string
  microNiche: string
  sourceCsv: string
  totalKeywordsAnalyzed: number
  nicheKeywordsRetained: number
  batches: EditorialBatch[]
  boards: { name: string; keywordCount: number; keywords: string[] }[]
  publishingSequence: string[]
  excludedSummary: { keyword: string; reason: string }[]
}

/** Cluster landscape (all keywords, all clusters) */
interface ClusterLandscape {
  generatedAt: string
  sourceCsv: string
  totalKeywords: number
  clusters: {
    clusterName: string
    keywordCount: number
    avgSearchVolume: number
    topKeywords: string[]
    priorityTiers: Record<string, number>
    opportunitySignal: "STRONG" | "MODERATE" | "WEAK"
  }[]
}

// ---------------------------------------------------------------------------
// CSV Parser (RFC 4180 subset — handles quoted fields with commas)
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

function parseCsvFile(filePath: string): { header: string[]; rows: string[][] } {
  const raw = fs.readFileSync(filePath, "utf-8")
  // Strip BOM if present
  const content = raw.replace(/^﻿/, "")
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header row and one data row")
  }

  const header = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line, i) => {
    const fields = parseCsvLine(line)
    if (fields.length !== header.length) {
      console.warn(
        `  ⚠ Row ${i + 2}: expected ${header.length} fields, got ${fields.length} — padding/truncating`,
      )
      while (fields.length < header.length) fields.push("")
      if (fields.length > header.length) fields.length = header.length
    }
    return fields
  })

  return { header, rows }
}

// ---------------------------------------------------------------------------
// Phase 0 — CSV Ingestion & Validation
// ---------------------------------------------------------------------------

const EXPECTED_COLUMNS = [
  "schema_version",
  "global_row_id",
  "source_batch",
  "source_file",
  "source_row",
  "keyword",
  "normalized_keyword",
  "search_intent",
  "previous_position_raw",
  "current_position_raw",
  "position_change_raw",
  "estimated_google_traffic",
  "traffic_change_raw",
  "search_volume",
  "keyword_difficulty",
  "cpc_usd",
  "pinterest_url",
  "pinterest_result_type",
  "last_update_raw",
  "serp_feature_changes",
  "serp_features_new",
  "serp_features_lost",
  "top10_presence_signal",
  "topic_cluster",
  "content_role",
  "priority_tier",
  "ptra_fit_signal",
  "ptra_fit_level_normalized",
  "recommended_action",
  "final_editorial_action",
  "risk_flag",
  "risk_flag_normalized",
  "risk_reason",
  "duplicate_keyword_count",
  "duplicate_keyword_rank",
  "is_duplicate_keyword",
  "claude_code_instruction",
]

const VALID_PRIORITY_TIERS = new Set(["P1", "P2", "P3", "PILLAR", "EXCLUDE"])

function safeInt(val: string): number {
  const n = parseInt(val, 10)
  return isNaN(n) ? 0 : n
}

function safeFloat(val: string): number {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

function safePosition(val: string): number | null {
  const n = parseInt(val, 10)
  if (isNaN(n) || n <= 0) return null
  return n
}

function normalizeResultType(raw: string): ParsedKeyword["pinterestResultType"] {
  const t = raw.toLowerCase().trim()
  if (t === "pinterest_pin") return "pinterest_pin"
  if (t === "pinterest_board") return "pinterest_board"
  if (t === "pinterest_profile") return "pinterest_profile"
  return "unknown"
}

function normalizePriorityTier(raw: string): ParsedKeyword["priorityTier"] {
  const t = raw.trim().toUpperCase()
  if (VALID_PRIORITY_TIERS.has(t)) return t as ParsedKeyword["priorityTier"]
  return "UNKNOWN"
}

function parseKeywords(filePath: string): ParsedKeyword[] {
  console.log("\n=== Phase 0 — CSV Ingestion & Validation ===\n")

  const { header, rows } = parseCsvFile(filePath)

  // Validate header
  console.log(`  Columns found: ${header.length} (expected: ${EXPECTED_COLUMNS.length})`)
  const missingCols = EXPECTED_COLUMNS.filter((c) => !header.includes(c))
  const extraCols = header.filter((c) => !EXPECTED_COLUMNS.includes(c))
  if (missingCols.length > 0) {
    console.warn(`  ⚠ Missing columns: ${missingCols.join(", ")}`)
  }
  if (extraCols.length > 0) {
    console.warn(`  ⚠ Extra columns: ${extraCols.join(", ")}`)
  }

  // Build column index map
  const colIdx: Record<string, number> = {}
  header.forEach((col, i) => {
    colIdx[col] = i
  })

  const keywords: ParsedKeyword[] = []
  let flaggedCount = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const issues: string[] = []

    const priorityTier = normalizePriorityTier(r[colIdx["priority_tier"]] ?? "")
    if (priorityTier === "UNKNOWN") {
      issues.push(`Invalid priority_tier: "${r[colIdx["priority_tier"]]}"`)
    }

    const pinterestType = normalizeResultType(r[colIdx["pinterest_result_type"]] ?? "")
    if (pinterestType === "unknown" && r[colIdx["pinterest_result_type"]]?.trim()) {
      issues.push(`Unknown pinterest_result_type: "${r[colIdx["pinterest_result_type"]]}"`)
    }

    const kw: ParsedKeyword = {
      keyword: r[colIdx["keyword"]] ?? "",
      normalizedKeyword: r[colIdx["normalized_keyword"]] ?? "",
      searchIntent: r[colIdx["search_intent"]] ?? "",
      searchVolume: safeInt(r[colIdx["search_volume"]] ?? "0"),
      keywordDifficulty: safeInt(r[colIdx["keyword_difficulty"]] ?? "0"),
      cpcUsd: safeFloat(r[colIdx["cpc_usd"]] ?? "0"),
      currentPosition: safePosition(r[colIdx["current_position_raw"]] ?? ""),
      positionChange: r[colIdx["position_change_raw"]] ?? "",
      estimatedTraffic: safeInt(r[colIdx["estimated_google_traffic"]] ?? "0"),
      pinterestUrl: r[colIdx["pinterest_url"]] ?? "",
      pinterestResultType: pinterestType,
      topicCluster: r[colIdx["topic_cluster"]] ?? "",
      contentRole: r[colIdx["content_role"]] ?? "",
      priorityTier,
      ptraFitSignal: r[colIdx["ptra_fit_signal"]] ?? "",
      ptraFitLevel: r[colIdx["ptra_fit_level_normalized"]] ?? "",
      recommendedAction: r[colIdx["recommended_action"]] ?? "",
      finalEditorialAction: r[colIdx["final_editorial_action"]] ?? "",
      riskFlag: (r[colIdx["risk_flag"]] ?? "").toLowerCase() === "yes",
      riskReason: r[colIdx["risk_reason"]] ?? "",
      top10PresenceSignal: r[colIdx["top10_presence_signal"]] ?? "",
      serpFeaturesNew: r[colIdx["serp_features_new"]] ?? "",
      serpFeaturesLost: r[colIdx["serp_features_lost"]] ?? "",
      claudeCodeInstruction: r[colIdx["claude_code_instruction"]] ?? "",
      parsingIssues: issues,
      rowIndex: i + 2, // 1-indexed, +1 for header
    }

    if (issues.length > 0) flaggedCount++
    keywords.push(kw)
  }

  // Distribution
  const tiers: Record<string, number> = {}
  for (const kw of keywords) {
    tiers[kw.priorityTier] = (tiers[kw.priorityTier] || 0) + 1
  }
  const riskyCount = keywords.filter((k) => k.riskFlag).length

  console.log(`  Rows parsed:  ${keywords.length}`)
  console.log(`  Flagged:      ${flaggedCount} (parsing issues)`)
  console.log(`  Risk flagged: ${riskyCount} (risk_flag=yes)`)
  console.log(`  Priority tiers: ${Object.entries(tiers).map(([k, v]) => `${k}=${v}`).join(", ")}`)

  return keywords
}

// ---------------------------------------------------------------------------
// Phase 1 — Niche Filtering
// ---------------------------------------------------------------------------

const NICHE_TOKENS_BY_KEYWORD: Record<string, string[]> = {
  "Easy Weeknight Dinners for Two": [
    "dinner", "for two", "weeknight", "meal", "crockpot", "slow cook",
    "one pan", "one pot", "sheet pan", "budget", "easy", "quick",
    "small batch", "couple", "date night",
  ],
}

const NICHE_CLUSTER_BONUS: Record<string, string[]> = {
  "Easy Weeknight Dinners for Two": [
    "dinner_meal_planning",
    "one_pot_meals",
    "chicken_recipes",
    "Protein main dishes",
    "meat_steak_sausage",
    "Asian recipes",
    "Italian recipes",
    "Sides, casseroles & comfort food",
    "appliance_cooking_methods",
    "starches_grains_pasta",
    "Southern soul food",
    "world_cuisine",
    "Mexican recipes",
  ],
}

function nicheTokenScore(keyword: string, niche: string): number {
  const tokens = NICHE_TOKENS_BY_KEYWORD[niche] ?? niche.toLowerCase().split(/\s+/)
  const kw = keyword.toLowerCase()
  let score = 0
  for (const token of tokens) {
    if (kw.includes(token.toLowerCase())) {
      score += 3
      if (score >= 6) break // max +6 from tokens
    }
  }
  return Math.min(score, 6)
}

function nicheClusterBonus(topicCluster: string, niche: string): number {
  const clusters = NICHE_CLUSTER_BONUS[niche] ?? []
  return clusters.some((c) => topicCluster.toLowerCase().includes(c.toLowerCase())) ? 4 : 0
}

function filterByNiche(keywords: ParsedKeyword[], niche: string): NicheKeyword[] {
  console.log(`\n=== Phase 1 — Niche Filtering ===`)
  console.log(`  Micro-niche: "${niche}"\n`)

  const results: NicheKeyword[] = []

  for (const kw of keywords) {
    // Hard excludes
    if (kw.priorityTier === "EXCLUDE") {
      results.push({ ...kw, nicheScore: 0, nicheClassification: "EXCLUDED", excludeReason: "priority_tier=EXCLUDE" })
      continue
    }
    if (kw.finalEditorialAction === "exclude_from_generation") {
      results.push({ ...kw, nicheScore: 0, nicheClassification: "EXCLUDED", excludeReason: "final_editorial_action=exclude_from_generation" })
      continue
    }

    // Niche relevance scoring
    let score = 0
    score += nicheTokenScore(kw.keyword, niche)
    score += nicheClusterBonus(kw.topicCluster, niche)

    if (kw.searchVolume > 5000) score += 2
    else if (kw.searchVolume > 1000) score += 1

    if (kw.currentPosition !== null && kw.currentPosition <= 3) score += 2

    if (kw.pinterestResultType === "pinterest_pin") score += 1

    if (kw.ptraFitSignal === "strong" || kw.ptraFitSignal === "high") score += 2

    let classification: NicheKeyword["nicheClassification"]
    if (score >= 8) classification = "CORE"
    else if (score >= 5) classification = "SUPPORTING"
    else if (score >= 3) classification = "LONG_TAIL"
    else classification = "EXCLUDED"

    results.push({ ...kw, nicheScore: score, nicheClassification: classification })
  }

  const core = results.filter((k) => k.nicheClassification === "CORE")
  const supporting = results.filter((k) => k.nicheClassification === "SUPPORTING")
  const longTail = results.filter((k) => k.nicheClassification === "LONG_TAIL")
  const excluded = results.filter((k) => k.nicheClassification === "EXCLUDED")

  console.log(`  CORE (≥8):       ${core.length}`)
  console.log(`  SUPPORTING (5-7): ${supporting.length}`)
  console.log(`  LONG-TAIL (3-4):  ${longTail.length}`)
  console.log(`  EXCLUDED (<3):   ${excluded.length}`)
  if (excluded.length > 0) {
    console.log(`\n  Top excluded reasons:`)
    const reasons: Record<string, number> = {}
    for (const k of excluded) {
      const r = k.excludeReason || "niche_score_too_low"
      reasons[r] = (reasons[r] || 0) + 1
    }
    for (const [reason, count] of Object.entries(reasons).sort(([, a], [, b]) => b - a)) {
      console.log(`    ${reason}: ${count}`)
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Phase 2 — PTRA Board Mapping
// ---------------------------------------------------------------------------

const PTRA_BOARD_MAP: { board: string; clusters: string[]; signals: string[] }[] = [
  {
    board: "Small-Batch Slow Cooker Dinners",
    clusters: ["crockpot_slow_cooker_dinners", "appliance_cooking_methods", "air_fryer_recipes"],
    signals: ["crockpot", "slow cook", "slow cooker", "2 quart", "small batch", "instant pot", "pressure cook", "air fryer", "air fry"],
  },
  {
    board: "One-Pan Dinners for Two",
    clusters: ["one_pot_meals", "appliance_cooking_methods", "Sides, casseroles & comfort food", "vegetable_sides", "sliders_appetizers_party_food"],
    signals: ["one pan", "one pot", "sheet pan", "skillet", "casserole", "cast iron", "bake", "roasted", "roast", "grill"],
  },
  {
    board: "Budget Meals for Two",
    clusters: ["dinner_meal_planning", "starches_grains_pasta", "Meal planning & family meals", "easy_potato_recipes"],
    signals: ["cheap", "budget", "pantry", "ground beef", "pasta", "rice", "beans", "frugal", "leftover", "potato", "sandwich", "wrap"],
  },
  {
    board: "Chicken Dinners for Two",
    clusters: ["chicken_recipes", "Protein main dishes", "meat_steak_sausage", "Health-focused recipes", "health_diet_sensitive", "salads", "vegetarian_lunch_recipes", "low_sodium_dinner_recipes"],
    signals: ["chicken breast", "chicken thigh", "chicken", "turkey", "pork chop", "steak", "ground beef", "meatball", "salad", "healthy", "protein", "low carb", "keto", "gluten free", "vegetarian", "vegan"],
  },
  {
    board: "Asian-Inspired Dinners for Two",
    clusters: ["Asian recipes", "world_cuisine", "Mexican recipes", "Italian recipes", "Southern soul food", "Latin & Caribbean recipes", "caribbean_haitian_recipes"],
    signals: ["asian", "stir fry", "teriyaki", "fried rice", "noodle", "curry", "taco", "burrito", "pasta", "italian", "mexican", "chinese", "thai", "japanese", "korean", "southern", "soul food", "caribbean", "latin", "enchilada", "quesadilla", "fajita"],
  },
  {
    board: "Quick & Healthy Dinners for Two",
    clusters: ["Desserts & baking", "baking_bread", "Drinks & beverages", "drinks_smoothies_mocktails", "Seasonal & occasion recipes", "seasonal_holiday", "alcoholic_drinks"],
    signals: ["quick", "easy", "healthy", "simple", "best", "summer", "spring", "fall", "winter", "holiday", "christmas", "thanksgiving"],
  },
]

function mapBoard(keyword: string, topicCluster: string): { board: string; confidence: "HIGH" | "MEDIUM" | "LOW" } {
  const kw = keyword.toLowerCase()
  const cluster = topicCluster.toLowerCase()

  let bestMatch: { board: string; score: number } = { board: "", score: 0 }

  for (const mapping of PTRA_BOARD_MAP) {
    let score = 0
    // Cluster match
    for (const c of mapping.clusters) {
      if (cluster.includes(c.toLowerCase())) {
        score += 3
        break
      }
    }
    // Signal match
    for (const s of mapping.signals) {
      if (kw.includes(s.toLowerCase())) {
        score += 1
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { board: mapping.board, score }
    }
  }

  if (bestMatch.score === 0) {
    return { board: "BOARD_CANDIDATE", confidence: "LOW" }
  }
  const confidence: "HIGH" | "MEDIUM" | "LOW" =
    bestMatch.score >= 4 ? "HIGH" : bestMatch.score >= 2 ? "MEDIUM" : "LOW"
  return { board: bestMatch.board, confidence }
}

function mapToPTRABoards(filtered: NicheKeyword[]): BoardMappedKeyword[] {
  console.log(`\n=== Phase 2 — PTRA Board Mapping ===\n`)

  const boardCounts: Record<string, number> = {}

  const mapped: BoardMappedKeyword[] = filtered.map((kw) => {
    const { board, confidence } = mapBoard(kw.keyword, kw.topicCluster)
    boardCounts[board] = (boardCounts[board] || 0) + 1
    return { ...kw, primaryBoard: board, boardFitConfidence: confidence }
  })

  for (const [board, count] of Object.entries(boardCounts).sort(([, a], [, b]) => b - a)) {
    console.log(`  ${board}: ${count} keywords`)
  }

  return mapped
}

// ---------------------------------------------------------------------------
// Phase 3 — Editorial Plan Generation
// ---------------------------------------------------------------------------

function generatePlan(mapped: BoardMappedKeyword[], niche: string, sourceCsv: string): EditorialPlan {
  console.log(`\n=== Phase 3 — Editorial Plan Generation ===\n`)

  const active = mapped.filter((k) =>
    k.nicheClassification !== "EXCLUDED" && k.primaryBoard !== "BOARD_CANDIDATE"
  )

  // PILOT: CORE + strong/high PTRA fit + position ≤ 5 (any URL type)
  const pilotCandidates = active
    .filter((k) =>
      k.nicheClassification === "CORE" &&
      (k.ptraFitSignal === "strong" || k.ptraFitSignal === "high") &&
      k.currentPosition !== null &&
      k.currentPosition <= 5
    )
    .sort((a, b) => b.nicheScore - a.nicheScore || b.searchVolume - a.searchVolume)

  const pilot = pilotCandidates.slice(0, 3)

  // BATCH 1: remaining CORE, sorted by niche score desc
  const pilotKeywords = new Set(pilot.map((k) => k.keyword))
  const batch1Candidates = active
    .filter((k) => k.nicheClassification === "CORE" && !pilotKeywords.has(k.keyword))
    .sort((a, b) => b.nicheScore - a.nicheScore || b.searchVolume - a.searchVolume)
  const batch1 = batch1Candidates.slice(0, 7)

  // BATCH 2: SUPPORTING, one per board for breadth
  const batch1Keywords = new Set([...pilotKeywords, ...batch1.map((k) => k.keyword)])
  const supportingCandidates = active
    .filter((k) => k.nicheClassification === "SUPPORTING" && !batch1Keywords.has(k.keyword))
    .sort((a, b) => b.nicheScore - a.nicheScore || b.searchVolume - a.searchVolume)

  // Pick one per board, then fill remaining
  const batch2: BoardMappedKeyword[] = []
  const boardsUsed = new Set<string>()
  for (const k of supportingCandidates) {
    if (!boardsUsed.has(k.primaryBoard)) {
      batch2.push(k)
      boardsUsed.add(k.primaryBoard)
    }
  }
  for (const k of supportingCandidates) {
    if (batch2.length >= 10) break
    if (!batch2.includes(k)) batch2.push(k)
  }

  // BACKLOG: LONG_TAIL + anything remaining
  const allPlanned = new Set([...pilotKeywords, ...batch1Keywords, ...batch2.map((k) => k.keyword)])
  const backlog = active.filter((k) => !allPlanned.has(k.keyword))

  // Interleave publishing sequence
  const publishingSequence: string[] = []
  const lastBoard: string[] = []
  const allBatches = [...pilot, ...batch1, ...batch2]
  const remaining = [...allBatches]
  while (remaining.length > 0) {
    // Find next keyword that doesn't repeat the last 2 boards
    let picked = false
    for (let i = 0; i < remaining.length; i++) {
      const kw = remaining[i]
      if (!lastBoard.slice(-2).includes(kw.primaryBoard)) {
        publishingSequence.push(kw.keyword)
        lastBoard.push(kw.primaryBoard)
        remaining.splice(i, 1)
        picked = true
        break
      }
    }
    if (!picked) {
      // Fallback: just take the first one
      const kw = remaining.shift()!
      publishingSequence.push(kw.keyword)
      lastBoard.push(kw.primaryBoard)
    }
  }

  // Board summaries
  const boardMap: Record<string, string[]> = {}
  for (const kw of allBatches) {
    if (!boardMap[kw.primaryBoard]) boardMap[kw.primaryBoard] = []
    boardMap[kw.primaryBoard].push(kw.keyword)
  }

  // Excluded summary
  const excludedSummary = mapped
    .filter((k) => k.nicheClassification === "EXCLUDED")
    .map((k) => ({ keyword: k.keyword, reason: k.excludeReason || "niche_score_below_threshold" }))

  console.log(`  PILOT:   ${pilot.length} keywords`)
  console.log(`  BATCH 1: ${batch1.length} keywords`)
  console.log(`  BATCH 2: ${batch2.length} keywords`)
  console.log(`  BACKLOG: ${backlog.length} keywords`)
  console.log(`  Excluded: ${excludedSummary.length} keywords`)

  return {
    planName: `PTRA Editorial Plan — ${niche}`,
    generatedAt: new Date().toISOString(),
    microNiche: niche,
    sourceCsv,
    totalKeywordsAnalyzed: mapped.length,
    nicheKeywordsRetained: active.length,
    batches: [
      {
        batchId: "pilot-01",
        priority: "IMMEDIATE",
        description: `Pilot batch — ${pilot.length} recipes for manual review before scaling`,
        criteria: "CORE classification, ptra_fit_signal=strong|high, position ≤ 5, sorted by nicheScore desc",
        keywords: pilot,
      },
      {
        batchId: "batch-01",
        priority: "HIGH",
        description: `First full batch — ${batch1.length} remaining CORE keywords`,
        criteria: "CORE classification, sorted by niche score descending",
        keywords: batch1,
      },
      {
        batchId: "batch-02",
        priority: "MEDIUM",
        description: `Supporting breadth — ${batch2.length} keywords, one per board`,
        criteria: "SUPPORTING classification, one per PTRA board for topical breadth",
        keywords: batch2,
      },
      {
        batchId: "backlog",
        priority: "LOW",
        description: `Backlog — ${backlog.length} LONG-TAIL and remaining keywords`,
        criteria: "LONG-TAIL classification, generate after CORE and SUPPORTING content indexed",
        keywords: backlog,
      },
    ],
    boards: Object.entries(boardMap).map(([name, keywords]) => ({
      name,
      keywordCount: keywords.length,
      keywords,
    })),
    publishingSequence,
    excludedSummary,
  }
}

// ---------------------------------------------------------------------------
// Bonus — Cluster Landscape (all keywords, all clusters)
// ---------------------------------------------------------------------------

function buildClusterLandscape(keywords: ParsedKeyword[]): ClusterLandscape {
  console.log(`\n=== Bonus — Cluster Landscape ===\n`)

  const clusterMap: Record<string, ParsedKeyword[]> = {}
  for (const kw of keywords) {
    const cluster = kw.topicCluster || "UNCLUSTERED"
    if (!clusterMap[cluster]) clusterMap[cluster] = []
    clusterMap[cluster].push(kw)
  }

  const clusters = Object.entries(clusterMap)
    .map(([clusterName, kws]) => {
      const tiers: Record<string, number> = {}
      for (const k of kws) {
        tiers[k.priorityTier] = (tiers[k.priorityTier] || 0) + 1
      }

      const avgVolume = Math.round(kws.reduce((s, k) => s + k.searchVolume, 0) / kws.length)

      const pinCount = kws.filter((k) => k.pinterestResultType === "pinterest_pin").length
      const strongFitCount = kws.filter((k) => k.ptraFitSignal === "strong" || k.ptraFitSignal === "high").length
      const p1Count = tiers["P1"] || 0

      let opportunitySignal: ClusterLandscape["clusters"][0]["opportunitySignal"]
      if (pinCount >= 2 && strongFitCount >= 1) opportunitySignal = "STRONG"
      else if (p1Count > 0 || strongFitCount >= 1) opportunitySignal = "MODERATE"
      else opportunitySignal = "WEAK"

      return {
        clusterName,
        keywordCount: kws.length,
        avgSearchVolume: avgVolume,
        topKeywords: kws
          .sort((a, b) => b.searchVolume - a.searchVolume)
          .slice(0, 5)
          .map((k) => k.keyword),
        priorityTiers: tiers,
        opportunitySignal,
      }
    })
    .sort((a, b) => b.keywordCount - a.keywordCount)

  console.log(`  Clusters: ${clusters.length}`)
  console.log(`  STRONG opportunities:  ${clusters.filter((c) => c.opportunitySignal === "STRONG").length}`)
  console.log(`  MODERATE opportunities: ${clusters.filter((c) => c.opportunitySignal === "MODERATE").length}`)
  console.log(`  WEAK opportunities:    ${clusters.filter((c) => c.opportunitySignal === "WEAK").length}`)

  return {
    generatedAt: new Date().toISOString(),
    sourceCsv: "",
    totalKeywords: keywords.length,
    clusters,
  }
}

// ---------------------------------------------------------------------------
// Phase 4 — Write Outputs
// ---------------------------------------------------------------------------

function writeOutputs(
  parsed: ParsedKeyword[],
  nicheFiltered: NicheKeyword[],
  boardMapped: BoardMappedKeyword[],
  plan: EditorialPlan,
  landscape: ClusterLandscape,
  csvPath: string,
) {
  console.log(`\n=== Phase 4 — Writing Outputs ===\n`)

  const dataDir = path.join(process.cwd(), "data")
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const outputs: [string, unknown][] = [
    ["parsed-keywords.json", parsed],
    ["niche-filtered-keywords.json", nicheFiltered],
    ["ptra-board-mapped.json", boardMapped],
    ["editorial-plan.json", plan],
    ["cluster-landscape.json", landscape],
  ]

  for (const [filename, data] of outputs) {
    const filePath = path.join(dataDir, filename)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    console.log(`  ✓ data/${filename}`)
  }

  // Human-readable summary
  const summary = buildSummary(plan, landscape, csvPath)
  const summaryPath = path.join(dataDir, "editorial-plan-summary.md")
  fs.writeFileSync(summaryPath, summary)
  console.log(`  ✓ data/editorial-plan-summary.md`)
}

function buildSummary(plan: EditorialPlan, landscape: ClusterLandscape, csvPath: string): string {
  const lines: string[] = [
    `# ${plan.planName}`,
    "",
    `**Généré le :** ${plan.generatedAt.split("T")[0]}`,
    `**Source :** \`${path.basename(csvPath)}\``,
    `**Keywords analysés :** ${plan.totalKeywordsAnalyzed}`,
    `**Keywords retenus pour le niche :** ${plan.nicheKeywordsRetained}`,
    "",
    "---",
    "",
    "## Plan d'exécution",
    "",
  ]

  for (const batch of plan.batches) {
    lines.push(`### ${batch.batchId} — ${batch.priority} (${batch.keywords.length} keywords)`)
    lines.push("")
    lines.push(batch.description)
    lines.push("")
    if (batch.keywords.length > 0) {
      lines.push("| # | Keyword | Board | Volume | Position | Type |")
      lines.push("|---|---------|-------|--------|----------|------|")
      for (const [i, kw] of batch.keywords.entries()) {
        lines.push(
          `| ${i + 1} | ${kw.keyword} | ${kw.primaryBoard} | ${kw.searchVolume.toLocaleString()} | ${kw.currentPosition ?? "?"} | ${kw.pinterestResultType} |`,
        )
      }
      lines.push("")
    } else {
      lines.push("_(aucun keyword dans ce batch)_")
      lines.push("")
    }
  }

  // Risk warnings
  const riskKeywords = plan.batches.flatMap((b) => b.keywords).filter((k) => k.riskFlag)
  if (riskKeywords.length > 0) {
    lines.push("## ⚠️ Keywords à risque (review obligatoire)")
    lines.push("")
    for (const k of riskKeywords) {
      lines.push(`- **${k.keyword}** — ${k.riskReason || "risque non spécifié"}`)
    }
    lines.push("")
  }

  // Cluster landscape preview
  lines.push("---")
  lines.push("")
  lines.push("## Panorama des clusters (tous les keywords)")
  lines.push("")
  lines.push("| Cluster | Keywords | Vol. moyen | Opportunité |")
  lines.push("|---------|----------|------------|-------------|")
  for (const c of landscape.clusters.slice(0, 15)) {
    lines.push(`| ${c.clusterName} | ${c.keywordCount} | ${c.avgSearchVolume.toLocaleString()} | ${c.opportunitySignal} |`)
  }
  if (landscape.clusters.length > 15) {
    lines.push(`| ... | _${landscape.clusters.length - 15} more clusters_ | | |`)
  }
  lines.push("")

  // Next steps
  lines.push("---")
  lines.push("")
  lines.push("## Prochaines étapes")
  lines.push("")
  lines.push("1. Review manuel du PILOT — ajuster les keywords si nécessaire")
  lines.push("2. Lancer la génération PILOT : `POST /api/recipes/generate` pour chaque keyword du PILOT, mode `pin-first`")
  lines.push("3. Review des résultats — si OK → BATCH 1, sinon ajuster les skills")
  lines.push("4. Après épuisement du niche, consulter `data/cluster-landscape.json` pour choisir le prochain micro-niche")
  lines.push("")

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  const csvIdx = args.indexOf("--csv")
  const nicheIdx = args.indexOf("--niche")
  const phaseIdx = args.indexOf("--phase")

  const csvPath = csvIdx >= 0 ? args[csvIdx + 1] : null
  const niche = nicheIdx >= 0 ? args[nicheIdx + 1] : "Easy Weeknight Dinners for Two"
  const phaseOnly = phaseIdx >= 0 ? parseInt(args[phaseIdx + 1], 10) : null

  if (!csvPath) {
    console.error("Usage: npx tsx scripts/editorial-plan-generator.ts --csv <file.csv> [--niche \"Micro Niche\"] [--phase 0]")
    process.exit(1)
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found: ${csvPath}`)
    process.exit(1)
  }

  console.log(`\n╔══════════════════════════════════════════════╗`)
  console.log(`║  SEO Organic Rankings Analyzer — PTRA Plan  ║`)
  console.log(`╚══════════════════════════════════════════════╝`)
  console.log(`  CSV:   ${csvPath}`)
  console.log(`  Niche: "${niche}"`)

  // Phase 0
  const parsed = parseKeywords(csvPath)
  if (phaseOnly === 0) {
    const dataDir = path.join(process.cwd(), "data")
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(path.join(dataDir, "parsed-keywords.json"), JSON.stringify(parsed, null, 2))
    console.log(`\n  ✓ data/parsed-keywords.json (Phase 0 only)`)
    return
  }

  // Phase 1
  const nicheFiltered = filterByNiche(parsed, niche)

  // Phase 2
  const boardMapped = mapToPTRABoards(nicheFiltered)

  // Phase 3
  const plan = generatePlan(boardMapped, niche, csvPath)

  // Bonus
  const landscape = buildClusterLandscape(parsed)

  // Phase 4
  writeOutputs(parsed, nicheFiltered, boardMapped, plan, landscape, csvPath)

  console.log(`\n✅ Done. Editorial plan → data/editorial-plan.json`)
  console.log(`   Summary           → data/editorial-plan-summary.md`)
  console.log(`   Cluster landscape → data/cluster-landscape.json\n`)
}

main()
