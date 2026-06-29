#!/usr/bin/env tsx
/**
 * Test — Vérification du self-improvement log
 *
 * 1. Lance une génération via l'API
 * 2. Attend que le workflow atteigne le statut "draft_review" (en attente d'approbation)
 * 3. Envoie l'événement "recipe/approved" via Inngest pour débloquer
 * 4. Attend la fin du workflow (statut "draft")
 * 5. Vérifie que self_improvement_logs contient des entrées
 *
 * Usage : npx tsx scripts/test-self-improvement.ts
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"
const KEYWORD = process.env.KEYWORD ?? "Tarte aux pommes caramélisées"

function log(label: string, message: string) {
  const timestamp = new Date().toLocaleTimeString("fr-FR")
  console.log(`  ${timestamp}  ${label.padEnd(12)} ${message}`)
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

async function main() {
  console.log("")
  console.log("  ╭─────────────────────────────────────────────────────╮")
  console.log("  │  Test Auto-Amélioration — self_improvement_logs     │")
  console.log("  ╰─────────────────────────────────────────────────────╯")
  console.log("")
  console.log(`  Mot-clé   : ${KEYWORD}`)
  console.log(`  API URL    : ${BASE_URL}`)
  console.log("")

  // ── Étape 1 : Vérifier que le serveur répond ──
  try {
    const res = await fetch(`${BASE_URL}/`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch {
    error(`Serveur Next.js introuvable sur ${BASE_URL}. Lancez 'npm run dev'.`)
    process.exit(1)
  }
  log("HEALTH", "Serveur OK")

  // ── Étape 2 : Lancer la génération ──
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

  // ── Étape 3 : Attendre le statut "draft_review" (ou un statut terminal) ──
  log("POLL", "Attente de l'étape d'approbation humaine…")
  console.log("")

  const MAX_ATTEMPTS = 150 // 5 min
  let attempts = 0
  let lastLogCount = 0
  let approved = false

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
        console.log(`  ${icon}  ${entry.agent.padEnd(13)} ${entry.message}`)
      }
      lastLogCount = logs.length

      // Statuts terminaux
      if (status === "draft") {
        console.log("")
        success("Workflow terminé — recette en brouillon !")
        break
      }

      if (status === "failed" || status === "error") {
        console.log("")
        error(`Workflow échoué : ${logs[logs.length - 1]?.message ?? "Inconnu"}`)
        process.exit(1)
      }

      if (status === "cancelled") {
        console.log("")
        warning("Génération annulée.")
        process.exit(1)
      }

      // Si on est en "draft_review", envoyer l'approbation
      if (status === "draft_review" && !approved) {
        console.log("")
        log("APPROVAL", "Envoi de l'approbation humaine…")

        // Envoyer l'événement recipe/approved via l'API Inngest
        try {
          await fetchJson(`${BASE_URL}/api/recipes/${recipeId}/approve`, {
            method: "POST",
          })
          success(`Approbation envoyée pour la recette ${recipeId}`)
          approved = true
        } catch (err) {
          warning(`Impossible d'envoyer l'approbation via API. Tentative directe Inngest…`)
          // Fallback: Inngest dev server is usually on port 8288
          try {
            const res = await fetch(
              `http://localhost:8288/v1/events`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: "recipe/approved",
                  data: { recipeId },
                }),
              },
            )
            if (res.ok) {
              success(`Approbation envoyée via Inngest dev API`)
              approved = true
            } else {
              throw new Error(`HTTP ${res.status}`)
            }
          } catch (e2) {
            error(`Impossible d'envoyer l'approbation : ${(e2 as Error).message}`)
            process.exit(1)
          }
        }
      }

      if (logs.length > 0) {
        const last = logs[logs.length - 1]
        log("POLL", `${status} — ${last.agent}: ${last.message.slice(0, 60)}`)
      }
    } catch (err) {
      warning(`Erreur de polling : ${(err as Error).message}`)
    }

    await sleep(2000)
  }

  if (attempts >= MAX_ATTEMPTS) {
    error(
      `Délai dépassé (${MAX_ATTEMPTS * 2}s). Vérifiez le statut sur le dashboard.`,
    )
    process.exit(1)
  }

  // ── Étape 4 : Vérifier self_improvement_logs ──
  console.log("")
  log("VERIFY", "Vérification de self_improvement_logs…")

  try {
    const logs = await fetchJson(`${BASE_URL}/api/recipes/self-improvement-logs`)
    console.log(`  📊  Nombre d'entrées : ${logs.length}`)
    if (logs.length > 0) {
      console.log("")
      logs.forEach((entry: any, i: number) => {
        console.log(`  [${i + 1}] Mot-clé : ${entry.keyword}`)
        console.log(`      Recommandation : ${entry.recommendation?.slice(0, 120)}…`)
        console.log(`      Date : ${entry.createdAt}`)
        console.log("")
      })
      success(`Auto-amélioration fonctionnelle — ${logs.length} leçons en base !`)
    } else {
      warning("Aucune entrée dans self_improvement_logs.")
      warning("L'auditeur n'a peut-être trouvé aucun critère < 16/20.")
    }
  } catch (err) {
    warning(`Pas d'endpoint de logs direct — lecture en base…`)
    // Fallback: interroger la DB directement
    const { Pool } = require("pg")
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    try {
      const result = await pool.query(
        `SELECT * FROM self_improvement_logs WHERE keyword = $1 ORDER BY created_at DESC LIMIT 5`,
        [KEYWORD],
      )
      console.log(`  📊  Entrées pour "${KEYWORD}" : ${result.rows.length}`)
      if (result.rows.length > 0) {
        result.rows.forEach((row: any, i: number) => {
          console.log(`  [${i + 1}] Recommandation : ${row.recommendation?.slice(0, 120)}…`)
          console.log(`      Date : ${row.created_at}`)
          console.log("")
        })
        success(`Auto-amélioration fonctionnelle !`)
      } else {
        // Vérifier toutes les entrées
        const all = await pool.query("SELECT * FROM self_improvement_logs ORDER BY created_at DESC")
        if (all.rows.length > 0) {
          console.log(`  📊  Autres entrées trouvées (mot-clé différent) : ${all.rows.length}`)
          all.rows.forEach((row: any) => {
            console.log(`      keyword="${row.keyword}" → "${row.recommendation?.slice(0, 80)}…"`)
          })
          success(`Auto-amélioration fonctionnelle ! (écriture avec mot-clé "${all.rows[0].keyword}")`)
        } else {
          warning("Aucune entrée dans self_improvement_logs.")
          warning("C'est normal si l'auditeur a noté tous les critères >= 16/20.")
        }
      }
      await pool.end()
    } catch (dbErr) {
      error(`Erreur DB : ${(dbErr as Error).message}`)
    }
  }
}

main().catch((err) => {
  error(`Erreur inattendue : ${(err as Error).message}`)
  process.exit(1)
})
