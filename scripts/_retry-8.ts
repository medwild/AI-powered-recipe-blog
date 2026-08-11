// _retry-8.ts — relance les 8 VAGUE 3 manquants (3 drafts + 5 supprimés)
// Séquentiel, DELETE avant relance, attend le terminal. Retry 429 avec backoff.
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const KEYWORDS = [
  "easy carnivore recipes",
  "easy low fodmap recipes",
  "easy ibs dinner recipes",
  "easy lactose free dinner recipes",
  "easy meals for beginners",
  "baking for 2",
  "dinner recipes for two",
  "easy to cook dinner for two",
]

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const results = { ok: 0, failed: 0 }
  for (const keyword of KEYWORDS) {
    // Supprimer tout draft existant avec ce keyword (Pre-Gen Gate 409 sinon)
    const drafts = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.keyword, keyword))
    for (const d of drafts) {
      await db.delete(recipes).where(eq(recipes.id, d.id))
      console.log(`🗑️  draft supprimé pour [${keyword}]`)
    }

    // Relancer avec backoff 429
    const t0 = Date.now()
    let done = false
    for (let attempt = 0; attempt < 4 && !done; attempt++) {
      try {
        const res = await fetch("http://localhost:3000/api/recipes/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword }),
        })
        const data = await res.json()
        if (res.ok) {
          console.log(`✅ relancé → #${data.id} [${keyword}]`)
          await waitTerminal(data.id)
          console.log(`   ⏱️  ${((Date.now() - t0) / 1000).toFixed(0)}s — terminal`)
          done = true
        } else if (res.status === 429) {
          console.log(`⏳ 429 — backoff ${(attempt + 1) * 10}s`)
          await new Promise(r => setTimeout(r, (attempt + 1) * 10_000))
        } else {
          console.log(`⚠️ [${keyword}] → ${res.status}: ${data.message ?? data.error ?? "?"}`)
          done = true
          results.failed++
        }
      } catch (e) {
        console.log(`❌ [${keyword}] → network: ${(e as Error).message}`)
        done = true
        results.failed++
      }
    }
    if (done) results.ok++
  }
  console.log(`\n📊 ${results.ok} traités, ${results.failed} en échec`)
  process.exit(0)
}

async function waitTerminal(id: number) {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")
  for (let i = 0; i < 60; i++) {
    const r = await db.select({ status: recipes.status }).from(recipes).where(eq(recipes.id, id))
    if (r[0]?.status === "published" || r[0]?.status === "draft") return
    await new Promise(res => setTimeout(res, 5000))
  }
}

main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
