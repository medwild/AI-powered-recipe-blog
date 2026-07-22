// Trigger a recipe generation via the API (real pipeline: Inngest dev server + Next.js)
// Usage: npx tsx scripts/trigger-generate.ts "Sourdough bread for two"
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const keyword = process.argv[2]
if (!keyword) { console.log("Usage: npx tsx scripts/trigger-generate.ts \"Keyword here\""); process.exit(1) }

async function main() {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  console.log(`Triggering: "${keyword}" via ${url}/api/recipes/generate`)

  const res = await fetch(`${url}/api/recipes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  })

  const data = await res.json()
  console.log(`Status: ${res.status}`)
  console.log(JSON.stringify(data, null, 2))
  if (res.ok) console.log(`\n✅ Recipe #${data.id} queued. Watch progress at http://localhost:8288`)
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
