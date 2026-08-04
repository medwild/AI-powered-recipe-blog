// scripts/fix-internal-links.ts
// One-shot fix for the broken internal-link module (P0-1 from SEO audit 2026-08-04):
// the auto-interlinker injected anchors mid-sentence with the wrong /recettes/ prefix.
// Fixes applied (surgical, markdown-aware):
//   1. Remove malformed anchors: [text with [nested [brackets]](/recettes/...) — drop the
//      whole broken link + its leftover bracket text.
//   2. Fix prefix: (/recettes/X) → (/recipes/X) for remaining well-formed links.
//   3. Collapse duplicated words around a link ("easy [easy ...] recipes two") — remove
//      the redundant word immediately before/after the anchor.
// Run: npx tsx scripts/fix-internal-links.ts  (dry-run with --dry)
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { recipes } from "../lib/db/schema"
import { eq } from "drizzle-orm"

const DRY = process.argv.includes("--dry")

// Regex pour un lien markdown complet : [ancre](url)
const LINK = /\[([^\]]*)\]\((\/recettes\/[^)]*)\)/g

function fixContent(md: string): { fixed: string; changes: number } {
  let out = md
  let changes = 0

  // 1. Retirer les ancres malformées (crochets imbriqués ou non fermés)
  //    Pattern : [texte avec [imbriqué]](/recettes/...) — on retire tout le lien cassé.
  const BAD = /\[([^\]]*\[[^\]]*)\]\(\/recettes\/[^)]*\)/g
  out = out.replace(BAD, (_m, inner) => {
    changes++
    // Retire aussi le texte cassé avant le lien (le [ ouvrant restant)
    return inner.replace(/.*\[/, "")
  })

  // 2. Corriger le préfixe des liens bien formés
  out = out.replace(LINK, (_m, anchor, url) => {
    const fixedUrl = url.replace(/^\/recettes\//, "/recipes/")
    if (fixedUrl !== url) changes++
    return `[${anchor}](${fixedUrl})`
  })

  // 3. Collapser les mots dupliqués autour des ancres
  //    Pattern : "easy [easy X](/recipes/Y) recipes" → garder l'ancre, retirer les doublons
  out = out.replace(
    /(\w+)\s+\[(\w+)\s+([^\]]*)\]\((\/recipes\/[^)]*)\)\s+\1/g,
    (_m, _w1, _w2, rest, url) => {
      changes++
      return `[${_w2} ${rest}](${url})`
    },
  )

  // 4. Retirer les mots orphelins autour d'une ancre bien formée
  //    Pattern : "easy [easy X](/recipes/Y) recipes" où avant/après ≠ l'ancre
  //    → retirer le mot "easy" redondant avant et "recipes" redondant après
  out = out.replace(
    /(\w+)\s+\[(\w+)\s+([^\]]*)\]\((\/recipes\/[^)]*)\)\s+(\w+)/g,
    (_m, before, first, rest, url, after) => {
      // Ne toucher que si le mot AVANT = premier mot de l'ancre (redondant)
      if (before.toLowerCase() === first.toLowerCase()) {
        changes++
        return `[${first} ${rest}](${url}) ${after}`
      }
      return _m
    },
  )

  // 5. Retirer les liens markdown cassés SANS crochet ouvrant
  //    Pattern : "texte](/recettes/...)" ou "texte](/recipes/...)" sans "["
  //    → le [ a été mangé par le module de maillage ; le texte autour est cassé
  //    → supprimer le lien et nettoyer les répétitions de mots autour.
  const BROKEN = /([\w\s,'-]+)\]\((\/(?:recettes|recipes)\/[^)]*)\)/g
  out = out.replace(BROKEN, (m, text, url) => {
    // Ne toucher que si le texte contient une répétition (signe de cassure)
    const words = text.trim().split(/\s+/)
    const hasRepeat = words.some((w, i) => i > 0 && w.toLowerCase() === words[i-1].toLowerCase())
    if (hasRepeat) {
      changes++
      // Retire le lien et nettoie les répétitions : garde le dernier mot unique
      const cleaned = words.filter((w, i) => i === 0 || w.toLowerCase() !== words[i-1].toLowerCase()).join(" ")
      return cleaned
    }
    // Sinon, corriger juste le préfixe si /recettes/
    if (url.startsWith("/recettes/")) {
      changes++
      return `${text}](/recipes/${url.slice("/recettes/".length)})`
    }
    return m
  })

  // 6. Nettoyer les répétitions "for two for two ..." (résidus des ancres cassées)
  //    → réduire à un seul "for two" (avec ou sans espace/ponctuation après)
  const REPEAT = /(?:for two\s+){1,}for two(?=\s|\.|\*\*|,|\]|\n|$)/gi
  const repeats = out.match(REPEAT) || []
  if (repeats.length) {
    changes += repeats.length
    out = out.replace(REPEAT, "for two")
  }

  return { fixed: out, changes }
}

async function main() {
  const { db } = await import("../lib/db")
  const rows = await db
    .select()
    .from(recipes)
    .where(eq(recipes.status, "published"))

  let totalChanges = 0
  let fixedCount = 0
  for (const r of rows) {
    if (!r.contentMarkdown) continue
    const { fixed, changes } = fixContent(r.contentMarkdown)
    if (changes > 0) {
      totalChanges += changes
      fixedCount++
      if (!DRY) {
        await db
          .update(recipes)
          .set({ contentMarkdown: fixed })
          .where(eq(recipes.id, r.id))
      }
      console.log(`${DRY ? "[DRY] " : ""}#${r.id} ${r.slug} — ${changes} fix(es)`)
    }
  }
  console.log(`\n${DRY ? "[DRY-RUN] " : ""}${fixedCount} recettes, ${totalChanges} corrections.`)
  if (DRY) console.log("Lancez sans --dry pour appliquer.")
}

main().catch((e) => { console.error(e); process.exit(1) })
