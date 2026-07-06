/**
 * Sprint Batch Generator
 *
 * Triggers the AI pipeline for all topics in a cluster.
 * Run after pipeline adaptation (Task 3) and topical map (Task 4) are complete.
 *
 * Usage: npx tsx scripts/generate-sprint-batch.ts <cluster-id>
 * Example: npx tsx scripts/generate-sprint-batch.ts nordic-home-cooking
 */

import { getClusterById } from "../lib/topical-map"

const API_BASE = process.env.API_BASE || "http://localhost:3000"

async function generateRecipe(keyword: string, cuisine: string, aorCategory?: string) {
  const body: Record<string, unknown> = {
    keyword,
    cuisine,
    ...(aorCategory ? { aorCategory } : {}),
  }

  const res = await fetch(`${API_BASE}/api/recipes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(`Generation failed for "${keyword}": ${(err as { error?: string }).error || res.status}`)
  }

  const data = (await res.json()) as { id: number; status: string }
  console.log(`  ✅ Recipe #${data.id} — "${keyword}" — ${data.status}`)
  return data.id
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const clusterId = process.argv[2]
  if (!clusterId) {
    console.error("Usage: npx tsx scripts/generate-sprint-batch.ts <cluster-id>")
    console.error("Available clusters:")
    console.error("  nordic-home-cooking")
    process.exit(1)
  }

  const cluster = getClusterById(clusterId)
  if (!cluster) {
    console.error(`Cluster "${clusterId}" not found.`)
    process.exit(1)
  }

  console.log(`\n=== Sprint Batch: ${cluster.name} ===`)
  console.log(`Cuisine: ${cluster.cuisine}`)
  console.log(`Topics: ${1 + cluster.spokes.length} (1 pillar + ${cluster.spokes.length} spokes/articles)\n`)

  const allTopics = [cluster.pillarPage, ...cluster.spokes]
  let completed = 0
  let failed = 0

  for (const topic of allTopics) {
    const label = topic.type.toUpperCase()
    console.log(`[${label}] Generating: ${topic.title}`)

    try {
      // Pillar pages get Aor articles (technique deep-dives for the cuisine)
      const aorCategory = topic.type === "pillar" ? "techniques" : undefined
      await generateRecipe(topic.keyword, cluster.cuisine.split(" & ")[0].toLowerCase(), aorCategory)
      completed++
    } catch (err) {
      console.error(`  ❌ Failed: ${(err as Error).message}`)
      failed++
    }

    // Rate-limit: wait 3 minutes between generations to avoid hammering APIs
    if (allTopics.indexOf(topic) < allTopics.length - 1) {
      console.log(`  ⏳ Waiting 3min for API cooldown...`)
      await sleep(180_000)
    }
  }

  console.log(`\n=== Batch Complete ===`)
  console.log(`✅ Completed: ${completed}`)
  console.log(`❌ Failed: ${failed}`)
}

main().catch((err) => {
  console.error("Batch failed:", err)
  process.exit(1)
})
