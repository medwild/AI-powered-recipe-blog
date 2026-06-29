#!/usr/bin/env tsx
/**
 * Test E2E — Workflow de génération de recette
 *
 * Lance une génération via l'API et suit la progression en temps réel.
 * Pré-requis : le serveur Next.js doit tourner sur localhost:3000.
 *
 * Usage :
 *   npm run test:e2e
 *   # ou directement :
 *   npx tsx scripts/test-workflow.ts
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"
const KEYWORD = process.env.KEYWORD ?? "Tarte aux pommes facile"

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(label: string, message: string) {
  const timestamp = new Date().toLocaleTimeString("fr-FR")
  console.log(`  ${timestamp}  ${label.padEnd(10)} ${message}`)
}

function success(message: string) {
  console.log(`\n  ✅ ${message}\n`)
}

function warning(message: string) {
  console.log(`  ⚠️  ${message}`)
}

function error(message: string) {
  console.log(`\n  ❌ ${message}\n`)
}

const FETCH_TIMEOUT = 15_000

async function fetchJson(url: string, init?: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error ?? `HTTP ${res.status}`)
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("")
  console.log("  ╭──────────────────────────────────────────────╮")
  console.log("  │  Test E2E — Workflow de génération de recette │")
  console.log("  ╰──────────────────────────────────────────────╯")
  console.log("")
  console.log(`  Mot-clé   : ${KEYWORD}`)
  console.log(`  API URL    : ${BASE_URL}`)
  console.log("")
  console.log("  Les clés API sont lues par le serveur Next.js depuis .env.local.")
  console.log("  Si elles manquent, le workflow échouera à la première étape SERP.")
  console.log("")

  // ── Étape 1 : Vérifier que le serveur répond ──────────────────────────────

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5_000)
    const health = await fetch(`${BASE_URL}/`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!health.ok) throw new Error(`HTTP ${health.status}`)
  } catch {
    error(
      `Le serveur Next.js est introuvable sur ${BASE_URL}.\n` +
        "  Assurez-vous qu'il tourne avec `npm run dev`.",
    )
    process.exit(1)
  }
  log("HEALTH", "Serveur OK")

  // ── Étape 2 : Lancer la génération ────────────────────────────────────────

  log("GENERATE", `Envoi du mot-clé « ${KEYWORD} »…`)

  let recipeId: number
  try {
    const data = await fetchJson(`${BASE_URL}/api/recipes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: KEYWORD }),
    })
    recipeId = data.id
    success(`Génération lancée (ID ${recipeId})`)
  } catch (err) {
    error(`Impossible de lancer la génération : ${(err as Error).message}`)
    process.exit(1)
  }

  // ── Étape 3 : Polling des logs ────────────────────────────────────────────

  log("POLL", "Surveillance du workflow…")
  console.log("")

  const MAX_ATTEMPTS = 150 // 5 min
  let attempts = 0
  let lastLogCount = 0

  while (attempts < MAX_ATTEMPTS) {
    attempts++

    try {
      const { status, workflowLog } = await fetchJson(
        `${BASE_URL}/api/recipes/${recipeId}/status`,
      )
      const logs: { agent: string; status: string; message: string }[] =
        workflowLog ?? []

      // Afficher les nouvelles entrées
      for (let i = lastLogCount; i < logs.length; i++) {
        const entry = logs[i]
        const icon =
          entry.status === "done"
            ? "✅"
            : entry.status === "error"
              ? "❌"
              : "🔄"
        console.log(`  ${icon}  ${entry.agent.padEnd(12)} ${entry.message}`)
      }
      lastLogCount = logs.length

      // Statuts terminaux
      if (status === "draft") {
        console.log("")
        success("Recette générée avec succès !")
        await verifyContent(recipeId)
        process.exit(0)
      }

      if (status === "failed" || status === "error") {
        console.log("")
        error(
          `Le workflow a échoué.\n` +
            `  Dernier message : ${logs[logs.length - 1]?.message ?? "Inconnu"}`,
        )
        process.exit(1)
      }

      if (status === "cancelled") {
        console.log("")
        warning("Génération annulée.")
        process.exit(1)
      }

      // Encore en cours
      if (logs.length > 0) {
        const last = logs[logs.length - 1]
        log("POLL", `En cours — ${last.agent} : ${last.message.slice(0, 60)}`)
      }
    } catch (err) {
      warning(`Erreur de polling : ${(err as Error).message}`)
    }

    await sleep(2000)
  }

  // Timeout
  error(
    `Le workflow a dépassé la limite de ${MAX_ATTEMPTS * 2}s.\n` +
      "  Vérifiez le statut manuellement sur le dashboard.",
  )
  process.exit(1)
}

async function verifyContent(recipeId: number) {
  try {
    const { status } = await fetchJson(
      `${BASE_URL}/api/recipes/${recipeId}/status`,
    )
    if (status === "draft") {
      log("VERIFY", "Recette persistée en base (statut draft)")
    }
  } catch {
    warning("Impossible de vérifier le contenu final.")
  }
}

main().catch((err) => {
  error(`Erreur inattendue : ${(err as Error).message}`)
  process.exit(1)
})
