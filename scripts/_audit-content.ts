import dotenv from "dotenv"
import path from "path"
import fs from "node:fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

interface Finding { slug: string; check: string; line: number; text: string }

async function main() {
  const { db } = await import("../lib/db")
  const { sql } = await import("drizzle-orm")
  const rows = (await db.execute(sql`SELECT slug, title, content_markdown FROM recipes WHERE content_type='recipe' AND status='published'`)).rows as Array<{ slug: string; title: string; content_markdown: string }>
  const findings: Finding[] = []
  const add = (slug: string, check: string, line: number, text: string) => findings.push({ slug, check, line, text: text.slice(0, 300) })

  const RE_CHECK: Array<{ name: string; re: RegExp }> = [
    // A. Process-speak (rappel)
    { name: "process-speak", re: /serp|search results|first page|top results|top ten|top 10|competitor|competing recipe|scan the top|scroll through|our angle|the angle here|my angle here|that's the angle|top-ranked|before writing/i },
    // B. Fuites de structure interne / placeholders
    { name: "placeholder", re: /\[video[^\]]*placeholder[^\]]*\]|\[image[^\]]*\]|\{\{|\}\}|TODO|FIXME|lorem|placeholder|XXX|INSERT|SAMPLE TEXT|# #|##\s*##/i },
    { name: "internal-heading", re: /^#{1,4} (SERP|Before Writing|Meta|Quality|Draft|Outline|Angle|Research|Notes|Internal Notes)/i },
    // C. Artefacts cassés
    { name: "standalone-z", re: /(^|\s)z(\s|\)|,|$)/ },
    { name: "broken-md", re: /\]\(\s*\)|\(http[^)]*\)\)/ },
    // D. Duplications de mots (bigrammes répétés ≥2×, ex "for 2 for 2 for 2")
    { name: "word-repeat", re: /(\b[a-z0-9]{1,12}\s+[a-z0-9]{1,12}\b)(?:\s+\1){2,}/i },
    // E. Fausses credentials
    { name: "credential-claim", re: /\b\d{2,}\s*(years?|times?|recipes?)\b|\b(certified|cordon bleu|classically trained|master [a-z]+ chef)\b/i },
    // F. Texte étranger (accents français)
    { name: "non-english", re: /[àâçéèêëîïôûùüÿœæ]+/i },
  ]

  for (const row of rows) {
    const lines = row.content_markdown.split("\n")
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      for (const c of RE_CHECK) {
        if (c.re.test(l)) add(row.slug, c.name, i + 1, l.trim())
      }
    }
    // Sections vides (## X suivi de ## ou fin de fichier)
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^#{2,3} /.test(lines[i]) && (/^#{2,3} /.test(lines[i + 1]) || (lines[i + 1] === "" && (lines[i + 2] === "" || /^#{2,3} /.test(lines[i + 2] ?? ""))))) {
        add(row.slug, "empty-section", i + 1, lines[i].trim())
      }
    }
  }

  // Keyword-stuffing : phrases contenant ≥3 phrases-clés connues
  const KEYWORDS = ["dinner ideas", "recipe ideas", "meal ideas", "recipes for two", "dinner for two", "easy dinner", "healthy dinner", "romantic dinner", "chicken dinner", "steak dinner", "slow cooker", "one-pan", "for two", "for 2"]
  const kws = new Set(KEYWORDS)
  for (const row of rows) {
    const sentences = row.content_markdown.split(/(?<=[.!?])\s+/)
    for (const s of sentences) {
      const low = s.toLowerCase()
      const hits = [...kws].filter(k => low.includes(k))
      if (hits.length >= 3) add(row.slug, "keyword-stuff", 0, s.trim())
    }
  }

  // Liens internes cassés
  const validSlugs = new Set(rows.map(r => r.slug))
  const linkRe = /\]\((\/recipes\/([a-z0-9-]+))\)/g
  const linkFinds: Array<{ slug: string; target: string }> = []
  for (const row of rows) {
    let m: RegExpExecArray | null
    while ((m = linkRe.exec(row.content_markdown))) {
      const target = m[2]
      if (!validSlugs.has(target)) linkFinds.push({ slug: row.slug, target })
    }
  }

  // Doublons de titres proches (cannibalisation)
  const titleMap = new Map<string, string[]>()
  for (const row of rows) {
    const key = row.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(two|2)\b/g, "{2}").replace(/\s+/g, " ").slice(0, 40)
    const arr = titleMap.get(key) ?? []
    arr.push(row.slug)
    titleMap.set(key, arr)
  }
  const dupTitles = [...titleMap.entries()].filter(([, v]) => v.length > 1)

  fs.writeFileSync("repports/audit-content-2026-08-11.json", JSON.stringify({ findings, brokenLinks: linkFinds, dupTitles }, null, 2))
  const byCheck = new Map<string, number>()
  for (const f of findings) byCheck.set(f.check, (byCheck.get(f.check) ?? 0) + 1)
  console.log("=== RÉSUMÉ AUDIT ===")
  for (const [k, v] of [...byCheck.entries()].sort((a, b) => b[1] - a[1])) console.log(`${String(v).padStart(3)}  ${k}`)
  console.log(`\nLiens cassés: ${linkFinds.length} (${new Set(linkFinds.map(l => l.target)).size} cibles distinctes)`)
  console.log(`Titres quasi-dupliqués: ${dupTitles.length} groupes`)
  console.log(`Total findings: ${findings.length} — détail dans repports/audit-content-2026-08-11.json`)
  process.exit(0)
}
main().catch((e) => { console.error("ERR: " + (e as Error).message); process.exit(1) })