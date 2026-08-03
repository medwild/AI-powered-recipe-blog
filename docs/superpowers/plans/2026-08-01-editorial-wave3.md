# Plan Éditorial — VAGUE 3 & Finalisation Vagues 1+2

> **For agentic workers:** Ce plan s'exécute en 5 phases séquentielles. Chaque phase est indépendante et vérifiable. Utiliser `npx tsx scripts/trigger-generate.ts` pour les générations unitaires, ou le script batch pour les vagues.

**Goal:** Finaliser les vagues 1+2 (2 keywords manquants), générer les 27 articles de la Vague 3, corriger les 4 slugs orphelins, et créer les pillar pages manquantes. Cible : ~57 articles publiés (30 actuels + 2 + 27 - 2 remplacés).

**Architecture:** Pipeline v14 Single-Shot via `POST /api/recipes/generate` → Mega-Skill Chef Augustin → Quality Gate (4 checks) → Persist + Image. Rate limit : 3 req/min. Pre-Generation Gate bloque les doublons (HTTP 409).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Neon PostgreSQL, Tokenmix (Opus 4.8 via OpenAI-compatible), Ideogram 4 (images).

## Global Constraints

- Rate limit : 3 requêtes/min max (`RATE_LIMIT_MAX_PER_MINUTE=3`)
- Pre-Generation Gate actif — un 409 bloque le keyword, passer au suivant
- `npx tsc --noEmit` doit passer après toute modification de code
- Ne jamais modifier `lib/skills.ts`, `lib/quality-gate.ts`, ou le pipeline sans vérifier l'agent runtime
- Les slugs une fois publiés ne doivent pas changer (301 redirect si nécessaire)
- Toute nouvelle recette → `content_type = "recipe"`, tout guide → `content_type = "article"`
- AUTO_APPROVE=true en dev local (pas de review humaine)

---

## Phase A : Corriger les 4 slugs orphelins (orzo)

### Contexte

4 recettes ont un slug qui ne correspond pas à leur keyword réel. Les slugs appartenaient aux keywords originaux de la Vague 2, mais le contenu a été régénéré avec des recettes orzo (commit `3d44c68`, différentiation des doublons). Résultat : l'URL promet "simple dinner recipes for 2" mais la page parle de "creamy parmesan garlic chicken orzo".

| ID | Slug actuel | Keyword réel |
|---|---|---|
| #43 | `simple-dinner-recipes-for-2` | creamy parmesan garlic chicken orzo for two |
| #45 | `easy-healthy-dinner-recipes-for-two` | summer herb chicken orzo with zucchini for two |
| #48 | `easy-dinner-for-two-recipes` | white wine lemon chicken orzo for two |
| #50 | `dinner-for-two-recipes-healthy` | mediterranean chicken orzo with feta and olives for two |

### Task A1: Mettre à jour les slugs dans la DB

**Files:**
- Create: `scripts/fix-orzo-slugs.sql` (one-shot SQL)

**Action :** Exécuter un script SQL qui renomme les slugs pour correspondre au keyword.

```sql
-- scripts/fix-orzo-slugs.sql
-- Exécuter via : psql $DATABASE_URL -f scripts/fix-orzo-slugs.sql
BEGIN;
UPDATE recipes SET slug = 'creamy-parmesan-garlic-chicken-orzo-for-two', updated_at = NOW() WHERE id = 43;
UPDATE recipes SET slug = 'summer-herb-chicken-orzo-with-zucchini-for-two', updated_at = NOW() WHERE id = 45;
UPDATE recipes SET slug = 'white-wine-lemon-chicken-orzo-for-two', updated_at = NOW() WHERE id = 48;
UPDATE recipes SET slug = 'mediterranean-chicken-orzo-with-feta-olives-for-two', updated_at = NOW() WHERE id = 50;
COMMIT;
```

### Task A2: Ajouter les redirections 301

**Files:**
- Modify: `next.config.mjs`

Ajouter 4 redirections permanentes des anciens slugs vers les nouveaux :

```js
// Dans la section redirects() de next.config.mjs
{ source: '/recipes/simple-dinner-recipes-for-2', destination: '/recipes/creamy-parmesan-garlic-chicken-orzo-for-two', permanent: true },
{ source: '/recipes/easy-healthy-dinner-recipes-for-two', destination: '/recipes/summer-herb-chicken-orzo-with-zucchini-for-two', permanent: true },
{ source: '/recipes/easy-dinner-for-two-recipes', destination: '/recipes/white-wine-lemon-chicken-orzo-for-two', permanent: true },
{ source: '/recipes/dinner-for-two-recipes-healthy', destination: '/recipes/mediterranean-chicken-orzo-with-feta-olives-for-two', permanent: true },
```

### Task A3: Vérification

```bash
npx tsc --noEmit
curl -I https://www.chefaugustin.com/recipes/simple-dinner-recipes-for-2  # → 301
curl -I https://www.chefaugustin.com/recipes/creamy-parmesan-garlic-chicken-orzo-for-two  # → 200
```

**Vérifier:** Les 4 anciennes URLs → 301, les 4 nouvelles → 200. Le typecheck passe.

---

## Phase B : Finaliser la Vague 1+2 (2 keywords manquants)

### Contexte

La Vague 1 est à 9/10, la Vague 2 à 13/15. Il manque uniquement :
- `healthy dinner ideas for two` (Wave 1, #1 priorité, vol 2400, KD 14) → catégorie `idees`
- `healthy dinner recipes for 2` (Wave 2, #1, vol 2900, KD 20) → catégorie `recettes`

⚠️ **Attention Pre-Generation Gate :** `healthy dinner ideas for two` peut être bloqué (proche sémantiquement des orzo ou de `easy and healthy dinner recipes for two` #42). Si 409 → skip et documenter.

### Task B1: Générer "healthy dinner ideas for two"

```bash
# S'assurer que le serveur Next.js tourne sur localhost:3000
npx tsx scripts/trigger-generate.ts "healthy dinner ideas for two"
```

**Vérifier:** La réponse est 200. Le JSON contient `id` et `slug`. Si 409 DUPLICATE_KEYWORD → noter le blocage et passer à B2.

### Task B2: Générer "healthy dinner recipes for 2"

```bash
npx tsx scripts/trigger-generate.ts "healthy dinner recipes for 2"
```

**Vérifier:** La réponse est 200. Le contenu est bien `content_type = "recipe"`.

### Task B3: Vérifier l'état post-génération

```bash
node -e 'require("dotenv").config({path:".env.local",override:true});const{Pool}=require("pg");(async()=>{const p=new Pool({connectionString:process.env.DATABASE_URL});const r=await p.query("SELECT id,slug,keyword,status FROM recipes WHERE keyword ILIKE $1 OR keyword ILIKE $2",["healthy dinner ideas%","healthy dinner recipes for 2%"]);console.log(JSON.stringify(r.rows,null,2));await p.end()})()' 2>&1 | grep -v injected
```

**Vérifier:** Les 2 nouveaux rows apparaissent avec `status = "published"`.

---

## Phase C : VAGUE 3 — 27 articles

### Stratégie de batch

La Vague 3 contient 27 keywords. On les divise en 3 sous-batchs pour permettre des vérifications intermédiaires et ne pas saturer le rate limit.

**Préparation :** Créer le script batch `scripts/batch-wave3.mjs` (inspiré de `batch-wave1.mjs`).

```js
// scripts/batch-wave3.mjs
// Batch VAGUE 3 — 27 articles, divisé en 3 sous-batchs
import "dotenv/config"

const WAVE3 = [
  // Sous-batch C1 : Quick wins KD<20 (7 articles)
  { keyword: "easy lasagna recipe", category: "recettes" },
  { keyword: "easy slow cooker pasta recipes", category: "recettes" },
  { keyword: "easy chili colorado recipe", category: "recettes" },
  { keyword: "easy beef ramen noodle recipes", category: "recettes" },
  { keyword: "easy whole30 recipes", category: "guides" },
  { keyword: "easy carnivore recipes", category: "guides" },
  { keyword: "easy low fodmap recipes", category: "guides" },

  // Sous-batch C2 : Guides & niches (7 articles)
  { keyword: "easy ibs dinner recipes", category: "guides" },
  { keyword: "easy lactose free dinner recipes", category: "guides" },
  { keyword: "easy meals for beginners", category: "guides" },
  { keyword: "candlelight dinner for two", category: "guides" },
  { keyword: "romantic dinner recipes for two", category: "guides" },
  { keyword: "baking for 2", category: "guides" },
  { keyword: "texas roadhouse dinner for two", category: "recettes" },

  // Sous-batch C3 : High volume + haute compétition (13 articles)
  { keyword: "healthy dinner recipes for two", category: "recettes" },
  { keyword: "easy to cook dinner for two", category: "guides" },
  { keyword: "easy dinner recipes for two", category: "recettes" },
  { keyword: "dinner recipe ideas for two", category: "idees" },
  { keyword: "dinner recipes for two", category: "recettes" },
  { keyword: "dinner for two recipes", category: "recettes" },
  { keyword: "easy recipes for two", category: "recettes" },
  { keyword: "recipes for two", category: "guides" },
  { keyword: "crockpot recipes for two", category: "recettes" },
  { keyword: "fast and easy dinner for 2", category: "recettes" },
  { keyword: "easy meal ideas for two", category: "idees" },
  { keyword: "simple healthy dinner ideas for two", category: "idees" },
  { keyword: "quick and easy dinner recipes for two", category: "recettes" },
]

const BASE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
const BATCH_SIZE = 7  // ~3.5 min par sous-batch

async function runBatch(keywords, label) {
  console.log(`\n📦 ${label} — ${keywords.length} articles`)
  let success = 0, skipped = 0, failed = 0

  for (let i = 0; i < keywords.length; i++) {
    const { keyword, category } = keywords[i]
    console.log(`\n  [${i + 1}/${keywords.length}] "${keyword}" (${category})`)
    const t0 = Date.now()
    try {
      const res = await fetch(`${BASE}/api/recipes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, category }),
      })
      const data = await res.json()
      if (res.ok) {
        console.log(`  ✅ #${data.id} ${data.slug} — ${((Date.now() - t0) / 1000).toFixed(1)}s`)
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
  console.log("🚀 Batch VAGUE 3 — Démarrage")
  console.log("═".repeat(50))

  // Sous-batch C1: Quick wins
  await runBatch(WAVE3.slice(0, 7), "C1 — Quick Wins KD<20")

  // Sous-batch C2: Guides & niches
  await runBatch(WAVE3.slice(7, 14), "C2 — Guides & Niches")

  // Sous-batch C3: High volume
  await runBatch(WAVE3.slice(14), "C3 — High Volume")

  console.log("\n✅ Batch VAGUE 3 terminé")
  process.exit(0)
}

main().catch(err => { console.error("❌", err); process.exit(1) })
```

### Task C1: Lancer le sous-batch C1 — Quick Wins (7 articles)

```bash
# Vérifier que le serveur Next.js tourne
# Générer les 7 quick wins un par un (ou via le script qui boucle)
npx tsx scripts/trigger-generate.ts "easy lasagna recipe"
# Attendre 30s
npx tsx scripts/trigger-generate.ts "easy slow cooker pasta recipes"
# ...etc pour les 5 autres
```

**Vérifier:** 7 nouveaux rows dans la DB avec `status = "published"`.

### Task C2: Lancer le sous-batch C2 — Guides & Niches (7 articles)

Même procédure que C1, avec les 7 keywords du sous-batch C2.

### Task C3: Lancer le sous-batch C3 — High Volume (13 articles)

Même procédure, avec les 13 keywords du sous-batch C3.

⚠️ **Attention :** `healthy dinner recipes for two` (74 000 vol) peut déclencher un 409 car proche de `healthy dinner recipes for 2` (Wave 2) ou `easy and healthy dinner recipes for two` (#42). Si bloqué, le noter et continuer.

### Task C4: Vérification post-Vague 3

```bash
node -e 'require("dotenv").config({path:".env.local",override:true});const{Pool}=require("pg");(async()=>{const p=new Pool({connectionString:process.env.DATABASE_URL});const r=await p.query("SELECT content_type, status, COUNT(*) FROM recipes GROUP BY content_type, status ORDER BY content_type, status");console.log(JSON.stringify(r.rows,null,1));await p.end()})()' 2>&1 | grep -v injected
```

**Vérifier:** Le compte total a augmenté. Compter les `skipped` (409) pour savoir combien de keywords Vague 3 restent à traiter.

---

## Phase D : Pillar pages manquantes

### Contexte

Le site a 5 clusters définis dans `docs/topical-authority-architecture.md` mais **aucune pillar page standalone**. Les hubs sont servis dynamiquement via `?cluster=X`. Les pillar pages sont nécessaires pour :
- Donner une cible de lien interne aux clusters
- Offrir une page de destination riche pour le SEO
- Servir de contenu éditorial de fond pour chaque thématique

### Task D1: Pillar page — Cluster 4 "Idées & Menus"

**Files:**
- Create: `app/idees/page.tsx` (ou enrichir la page existante `/idees`)

La page `/idees` existe déjà (listée dans le crawl) mais comme page de catégorie. La transformer en pillar page avec :
- H1 : "Dinner Ideas for Two: Weekly Plans & Inspiration"
- Intro éditoriale 300-400 mots sur la planification de repas pour deux
- Liste des articles liés (linking vers les recettes du cluster)
- Schema.org CollectionPage

### Task D2: Pillar page — Cluster 5 "Guides & Occasions"

**Files:**
- Create/Modify: `app/guides/page.tsx`

Même approche : enrichir la page existante avec :
- H1 : "Cooking for Two: The Ultimate Beginner's Guide"
- Intro éditoriale 300-400 mots
- Sous-sections par thématique (occasions, dietary, saisonnier)
- Liens vers les guides existants

### Task D3: Vérification

```bash
curl -s https://www.chefaugustin.com/idees | grep -o '<h1[^>]*>[^<]*</h1>'
curl -s https://www.chefaugustin.com/guides | grep -o '<h1[^>]*>[^<]*</h1>'
```

**Vérifier:** Les H1 correspondent aux titres prévus. Le contenu fait >300 mots.

---

## Phase E : Vérification globale & ménage

### Task E1: Vérifier le typecheck

```bash
npx tsc --noEmit
```

### Task E2: Vérifier les slugs problématiques

```bash
node -e 'require("dotenv").config({path:".env.local",override:true});const{Pool}=require("pg");(async()=>{const p=new Pool({connectionString:process.env.DATABASE_URL});const r=await p.query("SELECT id, slug, keyword FROM recipes WHERE slug NOT LIKE '%' || REGEXP_REPLACE(LOWER(keyword), '[^a-z0-9]+', '-', 'g') || '%' AND id > 40 LIMIT 10");console.log(JSON.stringify(r.rows,null,1));await p.end()})()' 2>&1 | grep -v injected
```

**Vérifier:** Seuls les 4 slugs orzo apparaissent (déjà corrigés en Phase A).

### Task E3: Mettre à jour les mémoires projet

Mettre à jour :
- `memory/plan-2026-08-01.md` → statut des phases
- `memory/MEMORY.md` → nouvelle entrée "Session 2026-08-01"
- `memory/session-2026-08-01.md` → créer le compte-rendu de session

### Task E4: Relancer un crawl Seobility

Depuis l'interface Seobility, relancer un crawl complet pour mesurer le score post-Vague 3.

---

## Ordre d'exécution recommandé

```
Phase A (slugs) → Phase B (wave 1+2) → Phase C (wave 3) → Phase D (pillars) → Phase E (vérif)
```

**Durée estimée :** ~4-5h (principalement du temps d'attente rate-limit pour la Phase C : 27 articles × 30s = ~13 min par sous-batch, + temps de génération ~70s/article).

## Notes

- **Si un 409 apparaît sur un keyword important**, le noter dans le compte-rendu de session. Ces keywords devront être retravaillés manuellement (brief différent, angle distinct).
- **Les 4 slugs orzo corrigés** libèrent 4 keywords de la Vague 2 qui peuvent être régénérés plus tard avec leur contenu légitime (`simple dinner recipes for 2`, `easy healthy dinner recipes for two`, `easy dinner for two recipes`, `dinner for two recipes healthy`).
- **content_type = "article"** : les guides (catégorie `guides`) devraient idéalement être générés en `content_type = "article"`. Vérifier si l'API supporte ce paramètre. Si non, un fix pipeline est nécessaire (hors scope de ce plan).
