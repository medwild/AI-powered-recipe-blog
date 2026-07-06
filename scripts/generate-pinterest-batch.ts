/**
 * Pinterest Batch Caller
 *
 * Reads clustered keywords and triggers the AI pipeline for each.
 * Uses mode: "pin-first" for Pinterest-optimized content.
 *
 * Usage: npx tsx scripts/generate-pinterest-batch.ts data/pinterest-clusters.json
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000"

interface ClusterKeyword {
  keyword: string
  score: number
}

interface Cluster {
  cluster_name: string
  primary_board: string
  keywords: ClusterKeyword[]
}

interface ClustersOutput {
  micro_niche: string
  clusters: Cluster[]
}

async function generateOne(keyword: string, clusterName: string, index: number, total: number) {
  const body = {
    keyword,
    cuisine: "sourdough",
    mode: "pin-first",
  }

  const start = Date.now()
  process.stdout.write(`[${index + 1}/${total}] ${keyword}... `)

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
    console.log(`OK — recipe #${data.id} [${clusterName}] (${elapsed}s)`)
    return data.id as number
  } catch (err) {
    console.log(`ERROR: ${(err as Error).message}`)
    return null
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error("Usage: npx tsx scripts/generate-pinterest-batch.ts <clusters.json>")
    process.exit(1)
  }

  const data = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(inputPath, "utf-8"))) as ClustersOutput

  const allKeywords: { keyword: string; cluster: string }[] = []
  for (const cluster of data.clusters) {
    for (const kw of cluster.keywords) {
      allKeywords.push({ keyword: kw.keyword, cluster: cluster.cluster_name })
    }
  }

  console.log(`\n🔧 Pinterest Batch — ${allKeywords.length} keywords across ${data.clusters.length} clusters\n`)

  const ids: number[] = []
  for (let i = 0; i < allKeywords.length; i++) {
    const id = await generateOne(allKeywords[i].keyword, allKeywords[i].cluster, i, allKeywords.length)
    if (id) ids.push(id)

    if (i < allKeywords.length - 1) {
      process.stdout.write("  waiting 35s (rate limit)... ")
      await sleep(35_000)
      console.log("go")
    }
  }

  console.log(`\n✅ Batch complete — ${ids.length}/${allKeywords.length} recipes launched`)
  console.log(`   Recipe IDs: ${ids.join(", ")}`)
  console.log(`   Check progress: npx tsx scripts/check-batch.ts ${ids.join(" ")}\n`)
}

main().catch((err) => {
  console.error("Batch failed:", err)
  process.exit(1)
})
