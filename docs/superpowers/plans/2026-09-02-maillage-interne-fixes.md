# Corrections Maillage Interne — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans ( INLINE — sous-agents impossibles : gateway B.Ai renvoie 403 sur modèles premium, vérifié 02/09). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer les 3 trouvailles de l'audit maillage interne 2026-09-02 (`repports/maillage-interne-audit-2026-09-02.md`) : liens contextuels→308, sections mortes dans les index, recettes sous-équitées + 2 phrases mangées.

**Architecture:** 3 tâches indépendantes (2 correctifs DB `content_markdown`, 1 correctif composant React, 1 correction de doc) → un seul push → redeploy Hostinger cuit les pages SSG → recrawl de vérification avec les scripts `_crawl-maillage.mjs` / `_analyze-maillage.mjs` déjà en place.

**Tech Stack:** PostgreSQL (Neon) via drizzle `db.execute(sql`) dans `npx tsx`, Next.js 16 App Router, Node 20+.

**Spec:** `repports/maillage-interne-audit-2026-09-02.md`

## Global Constraints

- Backup DB avant TOUTE écriture, dans `repports/backup-*.json` (pattern établi)
- Après modif de code : `npx tsc --noEmit` doit passer ; pas de `@ts-ignore`
- Push GitHub → redeploy Hostinger auto : **ne pas push avant la fin des tâches** (1 seul cycle)
- Scripts scratch en `scripts/_*.ts` (gitignorés) ; seuls `repports/` + `components/` + `.claude/rules/` sont commités
- Vérification DB par assertions SELECT (0 ligneold / 1 ligne new), jamais par confiance

---

### Task 1: Corriger les liens `content_markdown` (7 UPDATE DB)

**Files:**
- Create: `scripts/_fix-maillage-content.ts` (scratch, non commité)
- Backup: `repports/backup-maillage-links-2026-09-02.json`

**Interfaces:**
- Consumes : pattern `import("../lib/db")` après `dotenv.config` (voir `scripts/_check-drafts.ts:6-8`)
- Produces : 9 slugs au propre pour la vérification Task 4

- [ ] **Step 1: Écrire le script backup + UPDATE + assertions**

```ts
// scripts/_fix-maillage-content.ts — usage : npx tsx scripts/_fix-maillage-content.ts
import dotenv from "dotenv"
import path from "path"
import { writeFileSync } from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const EDITS: Array<{ slug: string; old: string; neu: string }> = [
  // A. Liens contextuels → slugs 308-renommés (consolidation 20/08)
  { slug: "garlic-butter-chicken-pasta-for-two", old: "](/recipes/recipes-for-two)", neu: "](/recipes/one-pan-chicken-rice-for-two)" },
  { slug: "garlic-butter-chicken-pasta-for-two", old: "](/recipes/dinner-recipe-ideas-for-two)", neu: "](/recipes/one-pan-chicken-rice-garlic-butter-tomato-sauce)" },
  { slug: "one-pan-chicken-rice-garlic-butter-tomato-sauce", old: "](/recipes/easy-dinner-ideas-for-two)", neu: "](/recipes/one-pan-garlic-butter-chicken-tomato-orzo)" },
  { slug: "one-pan-chicken-rice-garlic-butter-tomato-sauce", old: "](/recipes/easy-meal-ideas-for-two)", neu: "](/recipes/one-pan-chicken-tomato-rice)" },
  { slug: "one-pan-chicken-vegetable-skillet", old: "](/recipes/easy-dinner-ideas-for-two)", neu: "](/recipes/one-pan-garlic-butter-chicken-tomato-orzo)" },
  { slug: "one-pan-garlic-tomato-chicken-rice", old: "](/recipes/easy-dinner-ideas-for-two)", neu: "](/recipes/one-pan-garlic-butter-chicken-tomato-orzo)" },
  // B. Phrases mangées par le linker v0 (verdict 02/09) — réécriture minimale, lien conservé/reparé
  { slug: "easy-chicken-dinners-for-two",
    old: "The best one-pan healthy dinner recipes for 2 for 2 dish [romantic dinner](/guides/romantic-dinner-ideas-for-two) ideas for two doesn’t come from a list of 20—it comes from",
    neu: "The best one-pan [romantic dinner ideas for two](/guides/romantic-dinner-ideas-for-two) don’t come from a list of 20—they come from" },
  { slug: "creamy-mashed-potatoes-for-two",
    old: "Creamy mashed potatoes [romantic dinner](/recipes/chocolate-lava-cakes-for-two) ideas for two is a quiet act of precision",
    neu: "Creamy mashed potatoes are a quiet act of precision" },
  // C. Inbound manquant cookie dough → 1 lien contextuel naturel (phrase vérifiée 02/09, 1 occurrence, non déjà lié)
  { slug: "chocolate-lava-cakes-for-two", old: "and cookie doughs, but", neu: "and [cookie doughs](/recipes/edible-cookie-dough-recipe-for-2), but" },
]

async function main() {
  const { db } = await import("../lib/db")
  const { sql } = await import("drizzle-orm")
  const slugs = [...new Set(EDITS.map((e) => e.slug))]

  // 1. Backup intégral des lignes touchées
  const before = await db.execute(sql`SELECT id, slug, content_markdown, updated_at FROM recipes WHERE slug IN (${sql.join(slugs.map((s) => sql`${s}`), sql`, `)})`)
  writeFileSync("repports/backup-maillage-links-2026-09-02.json", JSON.stringify(before.rows, null, 1))
  console.log(`Backup : ${slugs.length} slugs → repports/backup-maillage-links-2026-09-02.json`)

  // 2. Pré-vol : chaque `old` doit exister exactement une fois (sinon abort, rien écrit)
  const rows = before.rows as any[]
  for (const e of EDITS) {
    const md = rows.find((r) => r.slug === e.slug)?.content_markdown ?? ""
    const n = md.split(e.old).length - 1
    if (n !== 1) { console.error(`ABORT [${e.slug}] : occurrence ${n}≠1 → ${e.old.slice(0, 60)}…`); process.exit(1) }
  }

  // 3. UPDATE + post-vol
  for (const e of EDITS) {
    await db.execute(sql`UPDATE recipes SET content_markdown = replace(content_markdown, ${e.old}, ${e.neu}), updated_at = NOW() WHERE slug = ${e.slug}`)
    const check = await db.execute(sql`SELECT (content_markdown LIKE ${"%" + e.old + "%"}) AS has_old, (content_markdown LIKE ${"%" + e.neu + "%"}) AS has_new FROM recipes WHERE slug = ${e.slug}`)
    const c = (check.rows as any)[0]
    if (c.has_old || !c.has_new) { console.error(`ABORT post-vol [${e.slug}]`); process.exit(1) }
    console.log(`OK [${e.slug}] ${e.old.slice(0, 45)}… → ${e.neu.slice(0, 45)}…`)
  }

  // 4. Assert global : plus aucun vieux slug dans le contenu publié
  const stale = await db.execute(sql`SELECT slug FROM recipes WHERE status='published' AND (
    content_markdown LIKE '%](/recipes/easy-dinner-ideas-for-two)%' OR content_markdown LIKE '%](/recipes/easy-meal-ideas-for-two)%'
    OR content_markdown LIKE '%](/recipes/dinner-recipe-ideas-for-two)%' OR content_markdown LIKE '%](/recipes/recipes-for-two)%')`)
  console.log(`Liens 308 restants : ${(stale.rows as any[]).length}`)
  process.exit((stale.rows as any[]).length === 0 ? 0 : 1)
}
main()
```

- [ ] **Step 2: Exécuter**

Run : `npx tsx scripts/_fix-maillage-content.ts`
Expected : 9 lignes `OK`, `Backup : 9 slugs`, `Liens 308 restants : 0`, exit 0. Si `ABORT occurrence` : la chaîne exacte a bougé → relire le dump DB du slug concerné et ajuster `old` (ne pas forcer).

- [ ] **Step 3: Commit (backup + audit mis à jour)**

Mettre à jour `repports/maillage-interne-audit-2026-09-02.md` : ajouter une section « ✅ Corrections appliquées 02/09 » listant les 3 trouvailles traitées + la nouvelle trouvaille (phrases mangées B, à documenter comme trouvaille #4 Medium).

```bash
git add repports/backup-maillage-links-2026-09-02.json repports/maillage-interne-audit-2026-09-02.md
git commit -m "fix(maillage): 6 liens contextuels vers slugs 308 repointés + 2 phrases mangées réparées + inbound cookie dough (audit 02/09, backup inclus)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Retirer les sections mortes de « Explore more » (`/guides`, `/idees`)

**Files:**
- Modify: `components/category-listing.tsx:258-259`
- Test : serveur dev local + curl

**Interfaces:**
- Produces : plus aucun `href="/techniques|/histoire|/equipement"` dans les pages render → vérifié par recrawl Task 4

- [ ] **Step 1: Filtrer la grille de sections sur les pages réellement en ligne**

Dans `components/category-listing.tsx`, remplacer la ligne 258-259 :

```tsx
            {Object.entries(CATEGORY_LABELS)
              .filter(([key]) => key !== category)
```

par :

```tsx
            {Object.entries(CATEGORY_LABELS)
              .filter(([key]) => key !== category && LIVE_SECTION_PAGES.includes(key))
```

et définir au-dessus de `export async function CategoryListing` (≈ ligne 90) :

```ts
/** Pages de section réellement montées (app/guides, app/idees). Les autres
 * clés de CATEGORY_LABELS sont 308-pées depuis la consolidation 06/08 —
 * les lier ferait passer chaque clic par une redirection (audit 02/09). */
const LIVE_SECTION_PAGES = ["guides", "idees"]
```

- [ ] **Step 2: Type-check**

Run : `npx tsc --noEmit` → Expected : exit 0

- [ ] **Step 3: Vérifier le rendu local**

Démarrer `npm run dev` (port 3000), puis :

```bash
curl -s http://localhost:3000/guides | grep -c 'href="/techniques"\|href="/histoire"\|href="/equipement"'   # attendu: 0
curl -s http://localhost:3000/guides | grep -c 'href="/idees"'   # attendu: ≥1 (chip conservée)
```

Arrêter le serveur dev.

- [ ] **Step 4: Commit**

```bash
git add components/category-listing.tsx
git commit -m "fix(links): index /guides+/idees ne linkent plus leurs sections 308 (techniques/histoire/equipement)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: Mettre à jour la règle globale #3 (doc obsolète)

**Files:**
- Modify: `.claude/rules/global.md` (règle #3)

- [ ] **Step 1: Corriger l'href documenté**

Dans `.claude/rules/global.md`, règle « 3. Ne jamais utiliser le mauvais composant card », remplacer `href \`/recettes/{slug}\`` par `href \`/recipes/{slug}\`` et ajouter la note :

```markdown
   (`/recettes/` n'est plus qu'un handler de redirection legacy — `app/recettes/[slug]/route.ts` ;
   lier `/recettes/` ferait passer chaque clic par un 308. Audit maillage 02/09.)
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/global.md
git commit -m "docs(rules): règle #3 alignée sur le code — RecipeCard émet /recipes/{slug} (legacy /recettes/ = redirections)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: Push + redeploy + vérification par recrawl

**Files:** aucune (déploiement + preuve)

- [ ] **Step 1: Push**

```bash
git push
```

- [ ] **Step 2: Attendre le build Hostinger puis recrawle**

Lancer quand les pages fixes sont servies (monitor ou retry ~8 min) :

```bash
node scripts/_crawl-maillage.mjs && node scripts/_analyze-maillage.mjs
```

Expected : `LIENS VERS REDIRECT (30x) : 0` · `Orphelines : 0` · `LIENS CASSÉS : 0`.

- [ ] **Step 3: Spot-check prod ciblé**

```bash
for u in recipes/garlic-butter-chicken-pasta-for-two recipes/easy-chicken-dinners-for-two recipes/chocolate-lava-cakes-for-two guides; do
  echo "$u → $(curl -s -o /dev/null -w '%{http_code}' -L https://www.chefaugustin.com/$u)"
done
curl -s https://www.chefaugustin.com/recipes/chocolate-lava-cakes-for-two | grep -o 'href="/recipes/edible-cookie-dough-recipe-for-2"' | head -1
```

Expected : 4× `200` et le lien cookie dough présent dans le HTML.

- [ ] **Step 4: MàJ mémoire + rapport final** (section « post-vérification » dans le rapport d'audit avec les résultats du recrawl)
