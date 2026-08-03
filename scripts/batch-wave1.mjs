// Batch VAGUE 1 — generate 5 missing recipes
import "dotenv/config"

const MISSING = [
  { keyword: "healthy dinner ideas for two", category: "idees" },
  { keyword: "dessert for 2", category: "recettes" },
  { keyword: "cooking for two", category: "guides" },
  { keyword: "easy week of meals", category: "idees" },
  { keyword: "mashed potato recipe for 2", category: "recettes" },
]

const BASE = "http://localhost:3000"

for (const item of MISSING) {
  console.log(`\n🚀 Generating: "${item.keyword}" (${item.category})`)
  const t0 = Date.now()
  try {
    const res = await fetch(`${BASE}/api/recipes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: item.keyword, category: item.category }),
    })
    const data = await res.json()
    if (res.ok) {
      console.log(`   ✅ ${data.slug || data.id} — ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    } else {
      console.log(`   ❌ ${res.status}: ${data.error || data.message}`)
    }
  } catch (err) {
    console.log(`   ❌ ${err.message}`)
  }
  // Rate limit: 1 request per 30s
  if (MISSING.indexOf(item) < MISSING.length - 1) {
    console.log("   ⏳ Waiting 30s (rate limit)...")
    await new Promise(r => setTimeout(r, 30_000))
  }
}
console.log("\n✅ Batch complete")
process.exit(0)
