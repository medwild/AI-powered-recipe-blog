import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
async function main() {
  const { db } = await import("../lib/db")
  const r = await db.execute("SELECT slug, json_ld FROM recipes WHERE slug IN ('easy-lasagna-recipe','chocolate-chip-cookies-for-2') ")
  for (const row of r.rows as Array<{slug: string; json_ld: unknown}>) {
    const ld = row.json_ld as Record<string, unknown> | null
    console.log(`\n== ${row.slug}:`, ld ? Object.keys(ld).join(",") : "NULL")
    if (ld && Array.isArray(ld["@graph"])) {
      const types = (ld["@graph"] as Array<{["@type"]: unknown}>).map(n => String(n["@type"]))
      console.log("  @graph types:", types.join(" | "))
    }
  }
  process.exit(0)
}
main().catch(e => { console.error("ERR: " + (e as Error).message); process.exit(1) })
