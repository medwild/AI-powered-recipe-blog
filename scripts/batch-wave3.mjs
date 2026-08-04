// Batch VAGUE 3 — révisé selon l'audit SERP (2026-08-04)
// - 4 vraies recettes (RECIPE intent) : aorCategory absent → content_type=recipe
// - 21 hubs (GUIDE/IDEAS intent) : aorCategory guides|idees → content_type=article
// - 2 keywords retirés (off-intent) : candlelight dinner for two (restaurants),
//   texas roadhouse dinner for two (promo restaurant + risque marque)
// Run: node scripts/batch-wave3.mjs [C1|C2|C3|all]
import "dotenv/config"

const WAVE3 = [
  // ── 4 vraies recettes (RECIPE) ──────────────────────────────────────────
  { keyword: "easy lasagna recipe", category: "recettes" },
  { keyword: "easy slow cooker pasta recipes", category: "recettes" },
  { keyword: "easy chili colorado recipe", category: "recettes" },
  { keyword: "easy beef ramen noodle recipes", category: "recettes" },

  // ── 21 hubs (GUIDE/IDEAS) ───────────────────────────────────────────────
  { keyword: "easy dinner ideas for two", category: "guides" },
  { keyword: "quick and easy dinner recipes for two", category: "guides" },
  { keyword: "healthy dinner ideas for two", category: "idees" },
  // romantic dinner ideas for two — RETIRÉ : hub déjà servi par le code
  // (lib/hub-content.ts) + slug déjà publié (#47, recette réalignée).
  { keyword: "easy meal ideas for two", category: "idees" },
  { keyword: "dinner recipe ideas for two", category: "idees" },
  { keyword: "slow cooker recipes for two", category: "guides" },
  { keyword: "crockpot recipes for two", category: "guides" },
  { keyword: "easy recipes for two", category: "guides" },
  { keyword: "recipes for two", category: "guides" },
  { keyword: "fast and easy dinner for 2", category: "guides" },
  { keyword: "simple healthy dinner ideas for two", category: "idees" },
  { keyword: "easy whole30 recipes", category: "guides" },
  { keyword: "easy carnivore recipes", category: "guides" },
  { keyword: "easy low fodmap recipes", category: "guides" },
  { keyword: "easy ibs dinner recipes", category: "guides" },
  { keyword: "easy lactose free dinner recipes", category: "guides" },
  { keyword: "easy meals for beginners", category: "guides" },
  { keyword: "baking for 2", category: "guides" },
  { keyword: "dinner recipes for two", category: "idees" },
  { keyword: "easy to cook dinner for two", category: "idees" },
]

const BASE = "http://localhost:3000"
const BATCH_SIZE = 7 // ~3.5 min par sous-batch

// La route /api/recipes/generate ignore "category" — seuls les articles Aor
// sont déclenchés via aorCategory (techniques|guides|histoire|equipement|idees).
// "recettes" → recette classique (content_type=recipe), aucun aorCategory envoyé.
const AOR_CATEGORY_MAP = { recettes: undefined, guides: "guides", idees: "idees" }

async function runBatch(keywords, label) {
  console.log(`\n📦 ${label} — ${keywords.length} articles`)
  let success = 0, skipped = 0, failed = 0

  for (let i = 0; i < keywords.length; i++) {
    const { keyword, category } = keywords[i]
    console.log(`\n  [${i + 1}/${keywords.length}] "${keyword}" (${category})`)
    const t0 = Date.now()
    try {
      const body = { keyword }
      const aorCategory = AOR_CATEGORY_MAP[category]
      if (aorCategory) body.aorCategory = aorCategory
      const res = await fetch(`${BASE}/api/recipes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        console.log(`  ✅ #${data.id} — ${((Date.now() - t0) / 1000).toFixed(1)}s`)
        success++
      } else if (res.status === 409) {
        console.log(`  ⏭️  DUPLICATE: ${data.message}`)
        skipped++
      } else {
        console.log(`  ❌ ${res.status}: ${data.error || data.message}`)
        failed++
      }
    } catch (err) {
      console.log(`  ❌ Network error: ${err.message}`)
      failed++
    }
    // Rate limit: 1 requête toutes les 30s (marge de sécurité sur le limite 3/min)
    if (i < keywords.length - 1) {
      await new Promise(r => setTimeout(r, 30_000))
    }
  }
  console.log(`\n  📊 ${label}: ${success} OK, ${skipped} skipped, ${failed} failed`)
}

async function main() {
  const arg = (process.argv[2] || "all").toUpperCase()
  const chunks = [
    [WAVE3.slice(0, BATCH_SIZE), "C1 — Recettes + Hubs 1"],
    [WAVE3.slice(BATCH_SIZE, BATCH_SIZE * 2), "C2 — Hubs 2"],
    [WAVE3.slice(BATCH_SIZE * 2), "C3 — Hubs 3"],
  ]
  const selected = arg === "ALL" ? chunks
    : arg === "C1" ? [chunks[0]]
    : arg === "C2" ? [chunks[1]]
    : arg === "C3" ? [chunks[2]]
    : chunks

  console.log("🚀 Batch VAGUE 3 — Démarrage (4 recettes + 20 hubs)")
  console.log("═".repeat(50))
  for (const [keywords, label] of selected) {
    await runBatch(keywords, label)
  }
  console.log("\n✅ Batch VAGUE 3 terminé")
  process.exit(0)
}

main().catch(err => { console.error("❌", err); process.exit(1) })
