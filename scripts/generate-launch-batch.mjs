#!/usr/bin/env node
/**
 * Launch Batch Generator — Lit launch-plan.json et déclenche les générations
 *
 * Usage:
 *   node scripts/generate-launch-batch.mjs [--wave 1|2|3|4] [--dry-run] [--base-url URL]
 *
 * Exemples:
 *   node scripts/generate-launch-batch.mjs --wave 1 --dry-run     (affiche ce qui serait généré)
 *   node scripts/generate-launch-batch.mjs --wave 1               (génère les 10 articles de la V1)
 *   node scripts/generate-launch-batch.mjs --wave 2 --base-url https://chefaugustin.com
 *
 * Prérequis:
 *   - ANTHROPIC_API_KEY dans .env.local
 *   - Serveur Next.js lancé (npm run dev)
 *   - Inngest Dev lancé (npm run inngest:dev)
 *   - AUTO_APPROVE=true et AUTOPILOT=true pour publication automatique
 */

import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, "..")

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const waveArg = args.find((_, i) => args[i - 1] === "--wave") ?? "1"
const wave = parseInt(waveArg, 10)
const dryRun = args.includes("--dry-run")
const baseUrl = args.find((_, i) => args[i - 1] === "--base-url") ?? process.env.BASE_URL ?? "http://localhost:3000"

if (![1, 2, 3, 4].includes(wave)) {
  console.error(`Wave invalide: ${wave}. Utiliser 1, 2, 3, ou 4.`)
  process.exit(1)
}

// ── Load plan ─────────────────────────────────────────────────────────────────

const planPath = resolve(PROJECT_ROOT, "data", "launch-plan.json")
const plan = JSON.parse(readFileSync(planPath, "utf-8"))
const waveKey = `wave${wave}`
const waveData = plan.waves[waveKey]

if (!waveData) {
  console.error(`Wave ${wave} introuvable dans le plan.`)
  process.exit(1)
}

// ── Display plan ──────────────────────────────────────────────────────────────

console.log("")
console.log("══════════════════════════════════════════════════════════════")
console.log(`  AI AUTOBLOG — LAUNCH BATCH GENERATOR`)
console.log(`  Wave ${wave}: ${waveData.description}`)
console.log(`  ${waveData.count} articles | ${waveData.timing}`)
console.log("══════════════════════════════════════════════════════════════")
console.log("")
console.log(`  Base URL : ${baseUrl}`)
console.log(`  Dry run  : ${dryRun ? "✅ OUI (aucune génération)" : "❌ NON"}`)
console.log("")
console.log("Articles à générer :")
console.log("─".repeat(80))

for (const [i, article] of waveData.articles.entries()) {
  const seasonal = article.seasonal ? " 📅" : ""
  console.log(`  ${String(i + 1).padStart(2)}. ${article.keyword.padEnd(52)} ${article.format.padEnd(10)} ${article.category}${seasonal}`)
}

if (dryRun) {
  console.log("")
  console.log("Dry run terminé. Aucune génération déclenchée.")
  console.log("Pour générer : node scripts/generate-launch-batch.mjs --wave " + wave)
  process.exit(0)
}

// ── Confirm ───────────────────────────────────────────────────────────────────

console.log("")
console.log(`⚠️  Prêt à générer ${waveData.articles.length} articles en mode AUTOPILOT.`)
console.log("   Vérifie que :")
console.log("   - Le serveur Next.js tourne sur " + baseUrl)
console.log("   - ANTHROPIC_API_KEY est configurée")
console.log("   - AUTO_APPROVE=true et AUTOPILOT=true")
console.log("")

// 5s countdown
for (let i = 5; i > 0; i--) {
  process.stdout.write(`   Démarrage dans ${i}s... (Ctrl+C pour annuler)\r`)
  await new Promise(r => setTimeout(r, 1000))
}
console.log("")

// ── Trigger generations ───────────────────────────────────────────────────────

const RATE_LIMIT_DELAY = parseInt(process.env.RATE_LIMIT_DELAY_MS ?? "35000", 10) // 35s entre chaque
let success = 0
let failed = 0
const startTime = Date.now()

for (const [i, article] of waveData.articles.entries()) {
  const progress = `[${i + 1}/${waveData.articles.length}]`

  try {
    const res = await fetch(`${baseUrl}/api/recipes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: article.keyword,
        mode: article.format,
      }),
    })

    const data = await res.json()

    if (res.ok && data.id) {
      success++
      console.log(`${progress} ✅ #${data.id} — "${article.keyword}" (${article.format})`)
    } else {
      failed++
      console.error(`${progress} ❌ "${article.keyword}" — ${res.status} ${data.error ?? "unknown"}`)
    }
  } catch (err) {
    failed++
    console.error(`${progress} ❌ "${article.keyword}" — ${err.message}`)
  }

  // Respect rate limit (sauf pour le dernier)
  if (i < waveData.articles.length - 1) {
    process.stdout.write(`   ⏳ Rate limit — pause ${RATE_LIMIT_DELAY / 1000}s...\r`)
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY))
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

const duration = Math.round((Date.now() - startTime) / 1000)
const minutes = Math.floor(duration / 60)
const seconds = duration % 60

console.log("")
console.log("══════════════════════════════════════════════════════════════")
console.log(`  GÉNÉRATION TERMINÉE — Wave ${wave}`)
console.log(`  ✅ ${success} réussies | ❌ ${failed} échouées | ⏱️ ${minutes}m${seconds}s`)
console.log(`  Surveiller : http://localhost:8288 (Inngest Dev)`)
console.log(`  État : cat data/STATE.json`)
console.log("══════════════════════════════════════════════════════════════")
