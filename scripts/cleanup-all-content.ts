/**
 * Cleanup script — deletes ALL existing content before fresh deployment.
 * Usage: npx tsx scripts/cleanup-all-content.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { db } = await import("../lib/db")
  const { recipes, selfImprovementLogs, imageVariantStats } = await import("../lib/db/schema")
  const { count } = await import("drizzle-orm")

  console.log("=== Content Cleanup ===\n")

  // Count before
  const before = await db.select({ n: count() }).from(recipes)
  console.log(`Before: ${before[0].n} recipes\n`)

  // Delete in dependency order
  console.log("Deleting image_variant_stats...")
  await db.delete(imageVariantStats)

  console.log("Deleting self_improvement_logs...")
  await db.delete(selfImprovementLogs)

  console.log("Deleting recipes...")
  await db.delete(recipes)

  console.log(`\n✅ All content deleted. Ready for fresh deployment on chefaugustin.com.`)
}

main().catch((err) => {
  console.error("Cleanup failed:", err)
  process.exit(1)
})
