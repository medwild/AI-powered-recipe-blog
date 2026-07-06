/**
 * Sourdough Batch #1 — Starter + Discard clusters
 *
 * Generates 7 articles from the 2 highest-priority clusters.
 * Rate-limited to respect Serper + Cloudflare quotas.
 *
 * Usage: npx tsx scripts/generate-sourdough-batch.ts
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000"

const BATCH = [
  // ── Starter cluster ──────────────────────────────────────────
  { keyword: "sourdough starter troubleshooting", cuisine: "sourdough", aorCategory: "techniques" as const },
  { keyword: "sourdough starter feeding schedule", cuisine: "sourdough", aorCategory: "guides" as const },
  { keyword: "how to revive sourdough starter", cuisine: "sourdough" },
  // ── Discard cluster ───────────────────────────────────────────
  { keyword: "sourdough discard crackers", cuisine: "sourdough", aorCategory: "techniques" as const },
  { keyword: "sourdough discard pretzel bites", cuisine: "sourdough", aorCategory: "techniques" as const },
  { keyword: "sourdough discard pizza dough", cuisine: "sourdough" },
  { keyword: "sourdough discard pancakes", cuisine: "sourdough", aorCategory: "guides" as const },
]

async function generateOne(item: typeof BATCH[0], index: number) {
  const body: Record<string, unknown> = {
    keyword: item.keyword,
    cuisine: item.cuisine,
    ...(item.aorCategory ? { aorCategory: item.aorCategory } : {}),
  }

  const start = Date.now()
  process.stdout.write(`[${index + 1}/${BATCH.length}] ${item.keyword}... `)

  try {
    const res = await fetch(`${API_BASE}/api/recipes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      console.log(`FAILED: ${(err as { error?: string }).error || res.status}`)
      return null
    }

    const data = await res.json()
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`OK — recipe #${data.id} (${elapsed}s)`)
    return data.id as number
  } catch (err) {
    console.log(`ERROR: ${(err as Error).message}`)
    return null
  }
}

async function main() {
  console.log(`\n🔧 Sourdough Batch #1 — ${BATCH.length} articles (Starter + Discard)\n`)

  const ids: number[] = []
  for (let i = 0; i < BATCH.length; i++) {
    const id = await generateOne(BATCH[i], i)
    if (id) ids.push(id)

    // Rate limit: 2 requests per minute (Inngest throttle)
    if (i < BATCH.length - 1) {
      process.stdout.write("  waiting 35s (rate limit)... ")
      await new Promise((r) => setTimeout(r, 35_000))
      console.log("go")
    }
  }

  console.log(`\n✅ Batch complete — ${ids.length}/${BATCH.length} recipes launched`)
  console.log(`   Recipe IDs: ${ids.join(", ")}`)
  console.log(`   Check progress: npx tsx scripts/check-batch.ts ${ids.join(" ")}\n`)
}

main()
