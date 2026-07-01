/**
 * Topical Coverage Analyzer
 *
 * Scans existing published recipes/articles against the topical map
 * and identifies coverage gaps. Run before each sprint to prioritize
 * which content to generate next.
 *
 * Usage: npx tsx scripts/analyze-topical-coverage.ts
 */

import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"
import { TOPICAL_MAP, type Cluster, type TopicNode } from "../lib/topical-map"

async function main() {
  console.log("=== Topical Coverage Analyzer ===\n")

  // Fetch all published recipes and articles
  const allContent = await db
    .select({
      title: recipes.title,
      slug: recipes.slug,
      keyword: recipes.keyword,
      tags: recipes.tags,
      content_type: recipes.content_type,
      category: recipes.category,
      status: recipes.status,
    })
    .from(recipes)
    .where(eq(recipes.status, "published"))

  const publishedRecipes = allContent.filter((r) => r.content_type !== "article")
  const publishedArticles = allContent.filter((r) => r.content_type === "article")

  console.log(`Published recipes: ${publishedRecipes.length}`)
  console.log(`Published articles: ${publishedArticles.length}`)
  console.log(`Total published: ${allContent.length}\n`)

  // Analyze coverage per cluster
  let totalCoverage = 0
  const reports: Array<{ cluster: Cluster; covered: number; total: number; pct: number; gaps: TopicNode[] }> = []

  for (const cluster of TOPICAL_MAP) {
    const allTopics = [cluster.pillarPage, ...cluster.spokes]
    const covered: TopicNode[] = []
    const gaps: TopicNode[] = []

    for (const topic of allTopics) {
      // Check if we have content matching this topic's keyword or title
      const match = allContent.find(
        (c) =>
          c.keyword?.toLowerCase().includes(topic.keyword.toLowerCase()) ||
          c.title?.toLowerCase().includes(topic.keyword.toLowerCase().split(" ").slice(0, 3).join(" "))
      )
      if (match) {
        covered.push(topic)
      } else {
        gaps.push(topic)
      }
    }

    const pct = Math.round((covered.length / allTopics.length) * 100)
    totalCoverage += pct
    reports.push({ cluster, covered: covered.length, total: allTopics.length, pct, gaps })
  }

  // Print results
  const overallPct = Math.round(totalCoverage / TOPICAL_MAP.length)

  console.log(`Overall coverage: ${overallPct}% (target: 74%)\n`)

  for (const report of reports) {
    console.log(`--- ${report.cluster.name} (${report.cluster.section}) ---`)
    console.log(`Coverage: ${report.pct}% (${report.covered}/${report.total} topics)`)
    console.log(`KD avg: ${report.cluster.kdAvg} | Volume: ${report.cluster.totalVolume.toLocaleString()}/mo`)

    if (report.gaps.length > 0) {
      console.log(`\nGAPS (${report.gaps.length} topics to create):`)
      for (const gap of report.gaps) {
        console.log(`  [${gap.type.toUpperCase()}] ${gap.title}`)
        if (gap.volume > 0) {
          console.log(`    KD: ${gap.kd} | Volume: ${gap.volume.toLocaleString()}/mo`)
        }
      }
    }
    console.log()
  }
}

main().catch((err) => {
  console.error("Analysis failed:", err)
  process.exit(1)
})
