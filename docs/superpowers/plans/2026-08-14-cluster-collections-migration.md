# Migration `/recipes/cluster/` → `/recipes/collections/` + Épaississement — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renommer les 6 pages piliers `/recipes/cluster/{id}` en `/recipes/collections/{id}` (301) et épaissir leurs descriptions (500-650 mots) pour que Google indexe le pilier actuellement refusé.

**Architecture:** Migration purement code (0 lien DB vérifié) : git mv de la route, 301 wildcard dans next.config.mjs, 5 fichiers de références mis à jour, type `collection` ajouté à l'audit. Épaississement = données réelles embarquées ci-dessous (membres des collections extraits de la DB le 14/08 avec la même logique que `matchesClusterTags`).

**Tech Stack:** Next.js 16 (routes, next.config.mjs redirects), TypeScript, Python (audit script).

**Spec:** `docs/superpowers/specs/2026-08-14-cluster-collections-migration-design.md`

## Global Constraints

- **Vérification obligatoire avant push** : `npx tsc --noEmit` ET `npm run build` (le push déploie en prod via Hostinger — un build cassé = prod cassée).
- **Règle d'exactitude** : le copy des descriptions n'utilise QUE les données embarquées dans la Task 2 (titres, comptes, durées). Interdiction d'inventer un titre, un compte, une durée, un claim santé (AdSense : probiotics, gut health, detox, etc.) ou une citation.
- **Ne jamais gonfler artificiellement** : les petites collections (2-4 recettes) peuvent descendre sous 500 mots de description si le contenu factuel honnête ne suffit pas — l'exactitude prime sur la cible.
- Archives d'audit (`www.chefaugustin.com-audit/`, `rapport_seo_*.md`, `repports/*.md` historiques) : **PAS modifiées** (enregistrements).
- `.env.local`, `node_modules`, `repports/indexation-*` : hors commits.
- Commits : message en français, suffixe `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Nouvelles URLs : `/recipes/collections/{id}` — les 6 ids inchangés.

---

### Task 1: Migration code — route, 301, références, audit (Partie 1)

**Files:**
- Move: `app/recipes/cluster/[slug]/page.tsx` → `app/recipes/collections/[slug]/page.tsx`
- Modify: `next.config.mjs` (dans `redirects()`, après le bloc `/recettes`)
- Modify: `app/sitemap.ts:82`
- Modify: `app/recipes/page.tsx:137`
- Modify: `components/recipe-hero.tsx:129`
- Modify: `components/homepage/homepage-clusters.tsx:23`
- Modify: `scripts/indexation-audit.py` (TYPE_PATTERNS + 2 itérations de types)

**Interfaces:**
- Consumes: rien (état actuel vérifié 14/08 — références exactes ci-dessous)
- Produces: route `/recipes/collections/[slug]`, 301 `/recipes/cluster/:path*` → `/recipes/collections/:path*`, audit avec type `collection` — consommé par Task 2 (rien) et Task 3 (vérifs).

- [ ] **Step 1: Déplacer la route**

```bash
git mv app/recipes/cluster app/recipes/collections
```
Expected: `app/recipes/collections/[slug]/page.tsx` existe, plus rien sous `app/recipes/cluster/`.

- [ ] **Step 2: Ajouter le 301 wildcard dans `next.config.mjs`**

Dans `redirects()` (ligne 56), juste après le bloc `/recettes/:path*` (ligne 59), insérer :

```js
      { source: "/recipes/cluster/:path*", destination: "/recipes/collections/:path*", permanent: true },
```

- [ ] **Step 3: Mettre à jour les références `/recipes/cluster/` → `/recipes/collections/`**

Dans le fichier déplacé `app/recipes/collections/[slug]/page.tsx`, remplacer les 4 occurrences de chaîne `"/recipes/cluster/"` par `"/recipes/collections/"` :
- canonical (ligne 64) : `alternates: { canonical: `/recipes/collections/${slug}` }`
- breadcrumb (ligne 70) : `url: `/recipes/collections/${slug}``
- lien breadcrumb (ligne 128) : `href: `/recipes/collections/${slug}``
- liens siblings (ligne 195) : `href={`/recipes/collections/${sibling.id}`}`

Puis dans les 3 autres fichiers :
- `app/sitemap.ts:82` : `url: `${BASE_URL}/recipes/collections/${c.id}`` (mettre aussi à jour le commentaire ligne 80 : "6 pillar pages" inchangé — le texte du commentaire reste valide)
- `app/recipes/page.tsx:137` : `href={`/recipes/collections/${c.id}`}`
- `components/recipe-hero.tsx:129` : `href: `/recipes/collections/${cluster.id}``
- `components/homepage/homepage-clusters.tsx:23` : `href={`/recipes/collections/${c.id}`}`

Vérifier ensuite que plus aucune référence active ne subsiste :

```bash
grep -rn "recipes/cluster" app/ components/ lib/ scripts/ --include="*.ts" --include="*.tsx" --include="*.py" --include="*.mjs" || echo "AUCUNE RÉFÉRENCE RESTANTE"
```
Expected: soit le grep ne trouve rien, soit uniquement les archives historiques (hors `app/ components/ lib/ scripts/`).

- [ ] **Step 4: Audit — ajouter le type `collection`**

Dans `scripts/indexation-audit.py` :
1. `TYPE_PATTERNS` (ligne 28) : insérer **AVANT** la ligne `("recipe", ...)` :
```python
    ("collection", re.compile(r"^/recipes/(?:cluster|collections)/")),
```
2. Itération du rapport `write_report` (ligne 119) : `for t in ("recipe", "article", "static"):` → `for t in ("collection", "recipe", "article", "static"):`
3. Itération du résumé `main()` (ligne 156) : `for label in ("recipe", "article", "static"):` → `for label in ("collection", "recipe", "article", "static"):`

- [ ] **Step 5: Vérifier syntaxe + types**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `~/.local/share/claude-seo/.venv/bin/python -m py_compile scripts/indexation-audit.py`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/recipes scripts/indexation-audit.py next.config.mjs app/sitemap.ts components/recipe-hero.tsx components/homepage/homepage-clusters.tsx
git commit -m "feat(collections): migration /recipes/cluster/ → /recipes/collections/ — route, 301, références, audit type collection

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Épaississement — 6 descriptions de piliers (Partie 2)

**Files:**
- Modify: `lib/topical-map.ts` (6 champs `description`)

**Interfaces:**
- Consumes: les données réelles ci-dessous (extraits DB 14/08, même logique d'appartenance que la page) + le style des descriptions actuelles (`topical-map.ts` — lire 2 descriptions existantes avant d'écrire)
- Produces: 6 descriptions de 400-650 mots chacune (selon la taille réelle de la collection), multi-paragraphes (`\n\n` — rendu existant page.tsx:135)

**Règles de rédaction (non négociables) :**
1. N'utiliser QUE les données ci-dessous (titres, comptes, durées) — les titres cités doivent exister dans la liste
2. Aucun claim santé (AdSense bloque : probiotics, digestibility, gut health, immune, detox, anti-inflammatory, fat-burning)
3. Aucune citation attribuée, aucun chiffre inventé (moyennes = les convertir depuis les PT données si citées)
4. Structure (5 paragraphes) : ce qu'est la collection → ce qu'elle contient (vrais titres, vrais comptes) → spécificités de cuisson (vraies durées) → pour qui/comment choisir → conseils pratiques ancrés dans les vraies recettes
5. Ton : direct, concret, deuxième personne, comme les descriptions existantes
6. 2-6 paragraphes, séparés par `\n\n` dans la chaîne (concaténation `+` comme l'existant)

**Données réelles par collection (source : requête DB 14/08, recettes publiées `content_type='recipe'`) :**

**`chicken-dinners-for-two` — 30 recettes** (patterns: chicken/poultry/rotisserie) :
25-Minute One-Pan Garlic Herb Chicken for Two (PT15M+PT30M) · One-Pan Chicken and Rice for Two That Actually Tastes Like Dinner (PT10M+PT33M) · 40-Minute White Wine Lemon Chicken Orzo for Two (PT10M+PT30M) · Garlic Butter Chicken Rice Bowls for Two (PT8M+PT15M) · Easy Mexican Dinner for Two: One-Pan Chicken Enchilada Skillet (PT10M+PT25M) · 30-Minute Mediterranean Chicken Orzo with Feta and Olives for Two (PT10M+PT20M) · Simple Dinner Ideas for Two: One-Pan Chicken with Tomato-Garlic Rice (PT10M+PT30M) · One-Pan Chicken and Rice for Two (Ready in About 40 Minutes) (PT10M+PT30M) · 30-Minute One-Pan Lemon Garlic Chicken for Two (PT15M+PT30M) · 4-Ingredient Feta Brine Chicken Breast for Two (PT22M+PT12M) · Chicken Pot Pie for Two with a Flaky Puff Pastry Lid (PT15M+PT30M) · 2-Quart Slow Cooker Chicken and Gravy for Two (PT15M+PT4H30M) · Slow Cooker Chicken & Ground Beef Pasta for Two (Weeknight Ragu) (PT15M+PT6H25M) · 30-Minute Lemon Butter Chicken Pasta for Two (PT10M+PT20M) · Easy Whole30 Chicken Skillet for Two with Tomatoes and Garlic (PT10M+PT25M) · Creamy Parmesan Garlic Chicken Orzo for Two (30-Minute) (PT15M+PT30M) · Pan-Seared Chicken Breast with Creamy Tomato Garlic Pasta for Two (PT15M+PT30M) · One-Pan Garlic Tomato Chicken and Rice for Two (PT10M+PT25M) · One-Pan Chicken and Vegetable Skillet for Two (PT10M+PT25M) · Easy Meal Ideas for Two: One-Pan Chicken and Tomato Rice (PT10M+PT30M) · Garlic Butter Chicken Bites with Blistered Tomatoes and Sautéed Spinach (PT10M+PT15M) · 30-Minute Summer Herb Chicken Orzo with Zucchini for Two (PT15M+PT30M) · One-Pan Chicken and Rice for Two with Garlic Butter Tomato Sauce (PT12M+PT33M) · 35-Minute One-Skillet Chicken and Rice for Two (PT15M+PT30M) · Easy Dinner Ideas for Two: One-Pan Garlic Butter Chicken with Tomato Orzo (PT10M+PT25M) · Slow Cooker Chicken and Rice for Two (No Leftovers to Guilt You) (PT15M+PT5H30M) · 25-Minute Pan-Seared Chicken with Herb-Butter Pan Sauce for Two (PT10M+PT15M) · Crockpot Recipes for Two: Slow Cooker Chicken & Tomato Rice (PT15M+PT5H45M) · Sheet Pan Thanksgiving Dinner for Two with Herb-Roasted Chicken (PT15M+PT30M) · 20-Minute Garlic Butter Chicken Pasta for Two (PT5M+PT15M)

**`small-batch-slow-cooker` — 4 recettes** (patterns: slow-cooker/crockpot/mijoteuse/gravy) :
2-Quart Slow Cooker Chicken and Gravy for Two (PT15M+PT4H30M) · Slow Cooker Chicken & Ground Beef Pasta for Two (Weeknight Ragu) (PT15M+PT6H25M) · Slow Cooker Chicken and Rice for Two (No Leftovers to Guilt You) (PT15M+PT5H30M) · Crockpot Recipes for Two: Slow Cooker Chicken & Tomato Rice (PT15M+PT5H45M)

**`one-pan-dinners-for-two` — 36 recettes** (patterns: one-pan/sheet-pan/one-pot/single-pan/skillet) :
Garlic Shrimp Orzo with Cherry Tomatoes for Two (PT15M+PT30M) · One-Pan Baked Ziti for Two (Romantic Date Night Dinner) (PT15M+PT30M) · 25-Minute One-Pan Garlic Herb Chicken for Two (PT15M+PT30M) · One-Pan Chicken and Rice for Two That Actually Tastes Like Dinner (PT10M+PT33M) · 40-Minute White Wine Lemon Chicken Orzo for Two (PT10M+PT30M) · Stovetop Mac and Cheese for Two (No Baking, One Pot) (PT10M+PT15M) · Garlic Butter Chicken Rice Bowls for Two (PT8M+PT15M) · Easy Mexican Dinner for Two: One-Pan Chicken Enchilada Skillet (PT10M+PT25M) · 30-Minute Mediterranean Chicken Orzo with Feta and Olives for Two (PT10M+PT20M) · Simple Dinner Ideas for Two: One-Pan Chicken with Tomato-Garlic Rice (PT10M+PT30M) · Easy Asian Beef Noodle Stir-Fry for Two (Ready in 25 Minutes) (PT10M+PT15M) · Easy Lasagna Recipe for Two (Small-Batch, One Skillet to Oven) (PT20M+PT35M) · One-Pan Chicken and Rice for Two (Ready in About 40 Minutes) (PT10M+PT30M) · 30-Minute One-Pan Lemon Garlic Chicken for Two (PT15M+PT30M) · Pan-Seared Steak Dinner for Two with Garlic Butter and Blistered Green Beans (PT10M+PT18M) · 4-Ingredient Feta Brine Chicken Breast for Two (PT22M+PT12M) · One-Sheet-Pan Easter Dinner for Two: Herb-Crusted Lamb Chops with Spring Vegetables (PT15M+PT30M) · Salmon Orzo with Dill and Capers for Two (PT10M+PT20M) · 30-Minute Lemon Butter Chicken Pasta for Two (PT10M+PT20M) · Easy Beef Ramen Noodles for Two (One-Pan, 25 Minutes) (PT10M+PT15M) · Easy Whole30 Chicken Skillet for Two with Tomatoes and Garlic (PT10M+PT25M) · Creamy Parmesan Garlic Chicken Orzo for Two (30-Minute) (PT15M+PT30M) · Pan-Seared Chicken Breast with Creamy Tomato Garlic Pasta for Two (PT15M+PT30M) · One-Pan Garlic Tomato Chicken and Rice for Two (PT10M+PT25M) · One-Pan Chicken and Vegetable Skillet for Two (PT10M+PT25M) · Easy Meal Ideas for Two: One-Pan Chicken and Tomato Rice (PT10M+PT30M) · Garlic Butter Chicken Bites with Blistered Tomatoes and Sautéed Spinach (PT10M+PT15M) · 30-Minute Summer Herb Chicken Orzo with Zucchini for Two (PT15M+PT30M) · One-Pan Ground Beef and Tomato Rice Skillet: Your Easy Week of Meals Starts Here (PT15M+PT30M) · One-Pan Chicken and Rice for Two with Garlic Butter Tomato Sauce (PT12M+PT33M) · 35-Minute One-Skillet Chicken and Rice for Two (PT15M+PT30M) · Easy Dinner Ideas for Two: One-Pan Garlic Butter Chicken with Tomato Orzo (PT10M+PT25M) · Slow Cooker Chicken and Rice for Two (No Leftovers to Guilt You) (PT15M+PT5H30M) · 25-Minute Pan-Seared Chicken with Herb-Butter Pan Sauce for Two (PT10M+PT15M) · Sheet Pan Thanksgiving Dinner for Two with Herb-Roasted Chicken (PT15M+PT30M) · 20-Minute Garlic Butter Chicken Pasta for Two (PT5M+PT15M)

**`asian-inspired-dinners` — 2 recettes** (patterns: asian/stir-fry/soy/ginger/sesame/teriyaki/noodle/ramen) :
Easy Asian Beef Noodle Stir-Fry for Two (Ready in 25 Minutes) (PT10M+PT15M) · Easy Beef Ramen Noodles for Two (One-Pan, 25 Minutes) (PT10M+PT15M)

**`budget-meals-for-two` — 3 recettes** (patterns: budget/cheap/affordable/economical/frugal/meal-prep) :
Garlic Butter Chicken Rice Bowls for Two (PT8M+PT15M) · Easy Meal Ideas for Two: One-Pan Chicken and Tomato Rice (PT10M+PT30M) · One-Pan Ground Beef and Tomato Rice Skillet: Your Easy Week of Meals Starts Here (PT15M+PT30M)

**`quick-healthy-dinners` — 16 recettes** (patterns: healthy/quick/30-minute/15-minute/light/low-carb, desserts exclus) :
Garlic Shrimp Orzo with Cherry Tomatoes for Two (PT15M+PT30M) · 25-Minute One-Pan Garlic Herb Chicken for Two (PT15M+PT30M) · Garlic Butter Chicken Rice Bowls for Two (PT8M+PT15M) · 30-Minute Mediterranean Chicken Orzo with Feta and Olives for Two (PT10M+PT20M) · 30-Minute One-Pan Lemon Garlic Chicken for Two (PT15M+PT30M) · Pan-Seared Steak Dinner for Two with Garlic Butter and Blistered Green Beans (PT10M+PT18M) · Salmon Orzo with Dill and Capers for Two (PT10M+PT20M) · 30-Minute Lemon Butter Chicken Pasta for Two (PT10M+PT20M) · One-Pan Garlic Tomato Chicken and Rice for Two (PT10M+PT25M) · One-Pan Chicken and Vegetable Skillet for Two (PT10M+PT25M) · Garlic Butter Chicken Bites with Blistered Tomatoes and Sautéed Spinach (PT10M+PT15M) · 30-Minute Summer Herb Chicken Orzo with Zucchini for Two (PT15M+PT30M) · One-Pan Chicken and Rice for Two with Garlic Butter Tomato Sauce (PT12M+PT33M) · Easy Dinner Ideas for Two: One-Pan Garlic Butter Chicken with Tomato Orzo (PT10M+PT25M) · 25-Minute Pan-Seared Chicken with Herb-Butter Pan Sauce for Two (PT10M+PT15M) · 20-Minute Garlic Butter Chicken Pasta for Two (PT5M+PT15M)

**Exemple de profondeur attendue (pour la collection de 4 recettes — plus courte que les grandes) :**
~450-550 mots : intro "set-and-forget for two" → les 4 vraies recettes citées avec leurs vraies durées (4h30 à 6h25) → spécificités 2-quart cooker (ratios liquides, cuisson accélérée) → pour qui (semaine chargée, batch cooking léger) → conseils ancrés (sécher les cuisses, ne pas ouvrir le couvercle, liquide ajusté pour 2). Ne PAS inventer de recette manquante ("essayez aussi…" uniquement avec des titres de la liste).

- [ ] **Step 1: Lire le style existant**

Run: `sed -n '/description:/,/siblings/p' lib/topical-map.ts | head -60` (2-3 descriptions actuelles — reproduire ce ton et cette structure de chaîne concaténée)

- [ ] **Step 2: Écrire les 6 descriptions**

Dans `lib/topical-map.ts`, remplacer les 6 valeurs `description` (chaînes concaténées `\n\n`, style existant) par les textes rédigés selon les règles + données ci-dessus. Chaque description : 3-6 paragraphes séparés par `\n\n`.

- [ ] **Step 3: Vérifier syntaxe + mots + honnêteté**

Run: `npx tsc --noEmit` — exit 0 attendu.

Vérification du nombre de mots par description (texte uniquement, `\n` → espaces) :
```bash
~/.local/share/claude-seo/.venv/bin/python - << 'EOF'
import re
src = open("lib/topical-map.ts").read()
descs = re.findall(r'description:\s*"(.*?)"\s*(?:,\n\s*siblings|,?\s*\n\s*\})', src, re.S)
for i, d in enumerate(descs):
    words = len(re.findall(r"\b\w+\b", d))
    print(f"description {i}: {words} mots")
EOF
```
Expected: chaque description 350-700 mots (fourchette honnête selon la taille de collection) ; les petites collections (2-4 recettes) ≥ 300.

Vérification d'honnêteté : chaque titre cité dans les descriptions doit appartenir à la liste embarquée de sa collection :
```bash
grep -oP '(?<=for Two|for 2)[A-Z][^()]{5,60}' lib/topical-map.ts | head
```
(revue manuelle du copy — relire chaque paragraphe : aucun chiffre hors données, aucun claim santé, aucune citation.)

- [ ] **Step 4: Commit**

```bash
git add lib/topical-map.ts
git commit -m "feat(collections): épaississement 6 piliers — descriptions 350-700 mots dérivées des recettes réelles

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Vérifications complètes + push + log hook (Partie 3)

**Files:** aucun (vérifications + déploiement)

**Interfaces:**
- Consumes: commits de Task 1 et Task 2
- Produces: prod déployée avec la migration + l'épaississement ; rapport d'audit reflétant le type `collection`

- [ ] **Step 1: Build local complet**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0 sur les deux (le build valide la syntaxe des redirects + les routes déplacées — le push déploie en prod, un build cassé casserait le site).

- [ ] **Step 2: Push**

```bash
git push
```
Expected: fast-forward ; le hook post-push s'exécute (30 s + ping Google + IndexNow avec les nouvelles URLs du sitemap).

- [ ] **Step 3: Vérifier le déploiement + les 3 statuts HTTP**

Attendre le redeploy (~2-3 min, boucle bornée en avant-plan) puis :
```bash
timeout 300 bash -c 'until curl -s -o /dev/null -w "%{http_code}" https://www.chefaugustin.com/recipes/collections/ | grep -q 200; do sleep 15; done'
curl -sI https://www.chefaugustin.com/recipes/cluster/small-batch-slow-cooker | grep -iE "^HTTP|^location"
curl -s -o /dev/null -w "%{http_code}" https://www.chefaugustin.com/recipes/collections/small-batch-slow-cooker
curl -s -o /dev/null -w "%{http_code}" https://www.chefaugustin.com/recipes/collections/nope
```
Expected: `/recipes/cluster/...` → **301** location `/recipes/collections/small-batch-slow-cooker` ; `/recipes/collections/small-batch-slow-cooker` → **200** ; `/recipes/collections/nope` → **404**.

- [ ] **Step 4: Vérifier l'audit (classification `collection`)**

Run: `~/.local/share/claude-seo/.venv/bin/python scripts/indexation-audit.py --limit 6`
Expected: le résumé affiche `collection: N` (les 6 URLs collections du sitemap) ; le rapport les classe en `collection`, plus en `recipe`.

- [ ] **Step 5: Vérifier le log hook**

Run: `tail -8 ~/.claude/logs/ping-sitemap.log`
Expected: `[ping] sitemap ...` + `[indexnow] OK — N URLs` (N = 93 avec les nouvelles URLs collections).

- [ ] **Step 6: État final + conclusion**

Run: `grep -A6 "^| Type" repports/indexation-2026-08-14.md` (après un run complet si le --limit ne suffit pas — le run complet prend ~25 min)
Expected: les 6 collections listées ; `small-batch-slow-cooker` toujours non indexée **au moment du déploiement** (Google mettra 3-14 jours à recrawler via le 301 + sitemap — ne pas conclure immédiatement ; re-audit dans une semaine).

---

## Self-Review (fait pendant la rédaction)

- **Spec coverage** : §3.1 git mv ✅ (T1 S1) · §3.2 301 ✅ (T1 S2) · §3.3 références 7 fichiers ✅ (T1 S3 — next.config + 5 fichiers + audit = 7) · §3.4 audit type collection ✅ (T1 S4) · §3.5 archives non touchées ✅ (constrainte globale) · §4 épaississement 500-650 mots, données réelles ✅ (T2, fourchette 350-700 honnête selon la taille) · §5 vérifs ✅ (T3 S3-S5) · §6 hors périmètre respecté.
- **Placeholders** : aucun TBD — le copy complet est rédigé par l'implémenteur à partir des données embarquées (pas de texte fourni d'avance = pas un placeholder, c'est la livraison de la Task 2, avec exemple de profondeur fourni).
- **Consistance** : ids de clusters inchangés (mêmes 6 ids dans les données et les URLs) ; `TYPE_PATTERNS` (collection avant recipe) cohérent avec les 2 itérations ; les 4 occurrences de la page déplacée listées avec leurs lignes.
