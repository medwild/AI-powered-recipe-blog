#!/usr/bin/env node
/**
 * Batch Recipe Generator — Production Autopilot
 *
 * Reads the editorial plan (data/editorial-plan.json) and triggers recipe
 * generation via the API endpoint for each keyword in the specified batch.
 *
 * Respects the rate limit (default: 2 req/min) and waits for each generation
 * to start before queuing the next one.
 *
 * Usage:
 *   node scripts/batch-generate.mjs [batch-name] [--base-url URL]
 *
 * Batches:
 *   pilot    — 3 recipes (manual review)
 *   batch1   — 7 recipes (high priority)
 *   batch2   — 10 recipes (coverage)
 *   all      — PILOT + BATCH1 + BATCH2 (20 recipes)
 *   backlog  — 113 recipes (LONG — use with caution)
 *   keyword  — generate a single keyword
 *
 * Examples:
 *   node scripts/batch-generate.mjs pilot
 *   node scripts/batch-generate.mjs pilot --base-url http://localhost:3000
 *   node scripts/batch-generate.mjs keyword "easy lunch recipes"
 *   node scripts/batch-generate.mjs all --base-url https://chefaugustin.com
 *
 * Environment:
 *   BASE_URL — API base URL (default: http://localhost:3000)
 *   RATE_LIMIT_DELAY_MS — ms between requests (default: 35000)
 */

import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAN_PATH = resolve(__dirname, "..", "data", "editorial-plan.json")

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const DELAY_MS = parseInt(process.env.RATE_LIMIT_DELAY_MS || "35000", 10)
const MODE = "pin-first"
const CUISINE = "dinners-for-two"

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadPlan() {
  try {
    const raw = readFileSync(PLAN_PATH, "utf-8")
    return JSON.parse(raw)
  } catch (err) {
    console.error(`❌ Cannot read editorial plan: ${PLAN_PATH}`)
    console.error(`   ${err.message}`)
    process.exit(1)
  }
}

function getKeywords(plan, batchName) {
  const batches = plan.batches || []
  switch (batchName) {
    case "pilot": {
      const batch = batches.find(b => b.batchId === "pilot-01")
      return (batch?.keywords || []).map(k => k.keyword || k.name || String(k))
    }
    case "batch1": {
      const batch = batches.find(b => b.batchId === "batch-01")
      return (batch?.keywords || []).map(k => k.keyword || k.name || String(k))
    }
    case "batch2": {
      const batch = batches.find(b => b.batchId === "batch-02")
      return (batch?.keywords || []).map(k => k.keyword || k.name || String(k))
    }
    case "all": {
      return batches.flatMap(b => (b.keywords || []).map(k => k.keyword || k.name || String(k)))
    }
    case "backlog": {
      const batch = batches.find(b => b.batchId === "backlog")
      return (batch?.keywords || []).map(k => k.keyword || k.name || String(k))
    }
    default:
      return []
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateRecipe(keyword) {
  const url = `${BASE_URL}/api/recipes/generate`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword,
        cuisine: CUISINE,
        mode: MODE,
      }),
    })

    const data = await res.json()

    if (res.status === 409) {
      console.log(`  ⏭️  SKIP: ${data.error}`)
      return { status: "skipped", ...data }
    }

    if (!res.ok) {
      console.log(`  ❌ ERROR ${res.status}: ${data.error || res.statusText}`)
      return { status: "error", ...data }
    }

    return { status: "queued", id: data.id }
  } catch (err) {
    console.log(`  ❌ NETWORK: ${err.message}`)
    return { status: "network_error", error: err.message }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)

  // Single keyword mode
  if (args[0] === "keyword" && args[1]) {
    const keyword = args.slice(1).join(" ")
    console.log(`🎯 Generating: "${keyword}"`)
    console.log(`   API: ${BASE_URL}`)
    console.log("")
    const result = await generateRecipe(keyword)
    console.log(`   Result: ${result.status}${result.id ? ` (id=${result.id})` : ""}`)
    return
  }

  const batchName = args[0] || "pilot"

  if (!["pilot", "batch1", "batch2", "all", "backlog"].includes(batchName)) {
    console.error(`❌ Unknown batch: "${batchName}"`)
    console.error("   Valid: pilot, batch1, batch2, all, backlog, keyword <term>")
    process.exit(1)
  }

  const plan = loadPlan()
  const keywords = getKeywords(plan, batchName)

  if (keywords.length === 0) {
    console.error(`❌ No keywords found for batch "${batchName}"`)
    process.exit(1)
  }

  console.log(`🚀 Batch Recipe Generator — ${batchName}`)
  console.log(`   API: ${BASE_URL}`)
  console.log(`   Keywords: ${keywords.length}`)
  console.log(`   Delay: ${DELAY_MS / 1000}s between requests`)
  console.log(`   Mode: ${MODE}`)
  console.log(`   Estimated time: ~${Math.ceil(keywords.length * DELAY_MS / 60000)} minutes`)
  console.log("")

  const results = []
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i]
    const n = i + 1
    console.log(`[${n}/${keywords.length}] "${kw}"`)

    const result = await generateRecipe(kw)
    results.push({ keyword: kw, ...result })

    if (result.status === "queued") {
      console.log(`  ✅ Queued (recipe #${result.id})`)
    }

    // Respect rate limit between requests
    if (i < keywords.length - 1) {
      const waitSec = Math.round(DELAY_MS / 1000)
      process.stdout.write(`  ⏳ Waiting ${waitSec}s...`)
      await sleep(DELAY_MS)
      console.log(" done")
    }
  }

  // Summary
  const queued = results.filter(r => r.status === "queued").length
  const skipped = results.filter(r => r.status === "skipped").length
  const errors = results.filter(r => r.status === "error" || r.status === "network_error").length

  console.log("")
  console.log("═══════════════════════════════════════════")
  console.log(`📊 Batch complete:`)
  console.log(`   ✅ Queued:  ${queued}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Errors:  ${errors}`)
  console.log(`   Total:     ${results.length}`)
  console.log("")
  console.log("Monitor progress:")
  console.log(`   Dashboard: ${BASE_URL}/dashboard`)
  console.log(`   Inngest:   http://localhost:8288 (dev) or app.inngest.com (prod)`)
  console.log("═══════════════════════════════════════════")
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
