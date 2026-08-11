// _retry-drafts.ts — relance séquentiellement les drafts VAGUE 3 (1 par 1)
// Supprime le draft existant (Pre-Gen Gate 409 sinon), relance, attend le terminal.
// Usage: npx tsx scripts/_retry-drafts.ts
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")
  const r = await db.execute("SELECT id, keyword FROM recipes WHERE id >= 73 AND status = 'draft' ORDER BY id")
  const drafts = r.rows as Array<{ id: number; keyword: string }>
  console.log(`Drafts à relancer: ${drafts.length}`)

  const results = { ok: 0, failed: 0 }
  for (const d of drafts) {
    // 1. Supprimer le draft existant (sinon Pre-Gen Gate → 409)
    await db.delete(recipes).where(eq(recipes.id, d.id))
    console.log(`🗑️  #${d.id} [${d.keyword}] supprimé`)

    // 2. Relancer
    const t0 = Date.now()
    try {
      const res = await fetch("http://localhost:3000/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: d.keyword }),
      })
      const data = await res.json()
      if (res.ok) {
        const newId = data.id as number
        console.log(`✅ relancé → #${newId} [${d.keyword}]`)
        results.ok++
        await waitTerminal(newId)
        console.log(`   ⏱️  ${((Date.now() - t0) / 1000).toFixed(0)}s — terminal`)
      } else {
        console.log(`⚠️ [${d.keyword}] → ${res.status}: ${data.message ?? data.error ?? "?"}`)
        results.failed++
      }
    } catch (e) {
      console.log(`❌ [${d.keyword}] → network: ${(e as Error).message}`)
      results.failed++
    }
  }
  console.log(`\n📊 ${results.ok} publiés, ${results.failed} en échec`)
  process.exit(0)
}

async function waitTerminal(id: number) {
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")
  for (let i = 0; i < 60; i++) {
    const r = await db.select({ status: recipes.status }).from(recipes).where(eq(recipes.id, id))
    const status = r[0]?.status
    if (status === "published" || status === "draft") return
    await new Promise(res => setTimeout(res, 5000))
  }
}

main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })
