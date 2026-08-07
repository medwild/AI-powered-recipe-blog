# Extension pinVariants — Plan d'implémentation

> **Pour agentic workers:** SKILL REQUISE : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe checkbox (`- [ ]`).

**Goal:** Étendre `GET /api/recipes/pins` pour que chaque recette expose ses 4 prompts d'angle (pins 2-5, en anglais) — en extrayant la logique de `scripts/pin-variants.ts` vers un module pur partagé.

**Architecture:** 1 module neuf `lib/pin-variants.ts` (logique d'angles extraite du script, traduite en anglais, ZÉRO import DB), 2 consommateurs : le script CLI (importe depuis `lib/`, comportement console inchangé) et la route API (ajoute `pinVariants` au mapping). Pin 1 = hero inchangé.

**Tech Stack:** Next.js 16 App Router (route handler), TypeScript, script `npx tsx`. Aucune dépendance nouvelle.

## Global Constraints

- `lib/pin-variants.ts` doit être un module **PUR** : constantes + 2 fonctions, zéro import de `@/lib/db`, zéro `dotenv`, zéro side-effect — ⚠️ `lib/db` crée le pool PostgreSQL à l'import ; l'importer depuis la route initialiserait le pool au premier import
- Traduire le prompt **du code actuel** (`scripts/pin-variants.ts:54-62`), source de vérité — PAS celui de la spec du 05/08 §5.2
- Le script CLI garde TOUT sa logique extraite : chargement DB local, fallback title `recipe.title || recipe.keyword || "Untitled"` (`scripts/pin-variants.ts:86`), wording console (`:71,90,103`)
- Labels traduits en anglais : "Macro detail", "Lifestyle shot", "45° hero (height/layers)", "Side cut-away (layers)", "Macro detail (sauce dripping)" — "45° close-up" et "Overhead" restent tels quels
- `pinVariants` : toujours un tableau de 4, format `{ label, prompt }`, résolu par `resolveAngles(tags)` (flat-lay/burger/default)
- Aucun autre champ du contrat v1 ne change ; pas de `category`, pas de champs inventés
- Pas de `any`, pas de `@ts-ignore`, pas d'`eslint-disable` (règle n°9)
- Après modification : `npx tsc --noEmit` doit passer
- Commits : message avec `Co-Authored-By: Claude <noreply@anthropic.com>`

---

### Task 1: Module partagé `lib/pin-variants.ts` + refactor du script CLI

**Files:**
- Create: `lib/pin-variants.ts`
- Modify: `scripts/pin-variants.ts` (supprimer lignes 13-62, ajouter import, renommer l'appel)

**Interfaces:**
- Consumes: rien (module autonome) — lit `scripts/pin-variants.ts:13-62` pour la logique à extraire
- Produces: `resolveAngles(tags: string[]): Angle[]`, `buildPinVariantPrompt(title: string, angle: Angle): string`, `export type Angle = { label: string; specs: string }` — consommés par Task 2

- [ ] **Step 1: Créer `lib/pin-variants.ts`**

```typescript
export type Angle = { label: string; specs: string }

const FLAT_LAY_TAGS = ["pizza", "salad", "board", "cake", "tart"] // food-photography.md §6
const BURGER_TAGS = ["burger", "sandwich", "wrap"] // food-photography.md §6

const LIFESTYLE: Angle = {
  label: "Lifestyle shot",
  specs: "35mm, f/2.0, shallow depth of field",
}

const ANGLES: Record<"default" | "flat-lay" | "burger", Angle[]> = {
  // 45° close-up → overhead → macro → lifestyle (spec §5)
  default: [
    { label: "45° close-up", specs: "90mm macro, f/2.8, shallow depth of field (bokeh)" },
    { label: "Overhead", specs: "50mm, f/5.6, deep depth of field (everything sharp)" },
    { label: "Macro detail", specs: "90mm macro, f/2.2, very shallow depth of field" },
    LIFESTYLE,
  ],
  // Flat-lay: overhead first (pizza, salad, board, cake/tart)
  "flat-lay": [
    { label: "Overhead flat lay", specs: "50mm, f/5.6, deep depth of field (everything sharp)" },
    { label: "45° close-up", specs: "90mm macro, f/2.8, shallow depth of field (bokeh)" },
    { label: "Macro detail", specs: "90mm macro, f/2.2, very shallow depth of field" },
    LIFESTYLE,
  ],
  // Burger/sandwich: 45° hero + side cut-away
  burger: [
    { label: "45° hero (height/layers)", specs: "35mm, f/2.0, shallow depth of field" },
    { label: "Side cut-away (layers)", specs: "50mm, f/4, moderate depth of field" },
    { label: "Macro detail (sauce dripping)", specs: "90mm macro, f/2.2, very shallow depth of field" },
    LIFESTYLE,
  ],
}

export function resolveAngles(tags: string[]): Angle[] {
  const joined = tags.join(" ").toLowerCase()
  if (FLAT_LAY_TAGS.some((t) => joined.includes(t))) return ANGLES["flat-lay"]
  if (BURGER_TAGS.some((t) => joined.includes(t))) return ANGLES.burger
  return ANGLES.default
}

export function buildPinVariantPrompt(title: string, angle: Angle): string {
  return [
    `Recreate this exact same dish — ${title} — same ingredients, same colors, same style, same light. Change only the camera angle: ${angle.label}.`,
    "",
    angle.specs,
    "",
    "2:3 vertical, Pinterest. Simple background. No text on image.",
  ].join("\n")
}
```

Notes :
- Traduction du code actuel (`scripts/pin-variants.ts:54-62`), pas de la spec 05/08
- **Aucun import** — ni `@/lib/db`, ni `dotenv`, ni rien d'autre. Module pur.
- Les labels/specs suivent exactement la table du spec §4 (3 jeux traduits)

- [ ] **Step 2: Refactorer `scripts/pin-variants.ts`**

Supprimer les lignes 13-62 (type `Angle`, `FLAT_LAY_TAGS`, `BURGER_TAGS`, `LIFESTYLE`, `ANGLES`, `resolveAngles`, `buildPrompt`). Ajouter l'import en tête (avec les imports statiques existants, lignes 8-11) :

```typescript
import { resolveAngles, buildPinVariantPrompt } from "../lib/pin-variants"
```

⚠️ `lib/pin-variants` est pur (pas de side-effect) — contrairement au pitfall documenté aux lignes 64-67 concernant `lib/db`, il peut être importé statiquement. Ne pas toucher au reste du script : le fallback title (`:86`), le wording console (`:71,90,103`), le chargement DB dynamique (`:68`).

Remplacer l'unique appel (`:99`) :

```typescript
    console.log("[PROM] " + buildPinVariantPrompt(title, angles[i]))
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur (0 sortie).

- [ ] **Step 4: Vérifier le script CLI sur une recette flat-lay réelle**

```bash
npx tsx scripts/pin-variants.ts dessert-for-2
```

Expected :
- Sortie PIN 1 avec l'URL hero Cloudinary (inchangée)
- PIN 2 = **Overhead flat lay** (cette recette matche le tag "cake" → jeu flat-lay)
- Pins 3-5 = 45° close-up, Macro detail, Lifestyle shot
- Prompts en **anglais** ("Recreate this exact same dish — …")
- Le message `💡 Overlays texte : npx tsx scripts/pin-brief.ts …` intact

Vérifier aussi une recette default (`npx tsx scripts/pin-variants.ts easy-whole30-recipes`) → PIN 2 = 45° close-up.

- [ ] **Step 5: Commit**

```bash
git add lib/pin-variants.ts scripts/pin-variants.ts
git commit -m "$(cat <<'EOF'
feat(pins): extraire la logique des variants vers lib/pin-variants.ts (pur, EN)

Module partagé : resolveAngles + buildPinVariantPrompt, traduits en
anglais (langue du blog). scripts/pin-variants.ts importe depuis lib —
seule la logique sort, wording console et fallback title intacts.
Aucun import DB (le pool PostgreSQL n'est pas initialisé par la route).

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Étendre `app/api/recipes/pins/route.ts` avec `pinVariants`

**Files:**
- Modify: `app/api/recipes/pins/route.ts`

**Interfaces:**
- Consumes: `resolveAngles(tags: string[]): Angle[]`, `buildPinVariantPrompt(title: string, angle: Angle): string` de `@/lib/pin-variants` (créées en Task 1)
- Produces: `pinVariants: { label: string; prompt: string }[]` — toujours longueur 4, ajouté à chaque recette du contrat v1 (le reste inchangé)

- [ ] **Step 1: Ajouter l'import**

Dans `app/api/recipes/pins/route.ts`, après l'import drizzle (ligne 4) :

```typescript
import { resolveAngles, buildPinVariantPrompt } from "@/lib/pin-variants"
```

- [ ] **Step 2: Ajouter `pinVariants` au mapping**

Dans le `.map((recipe) => ({ … }))`, après `url: \`${SITE_URL}/recipes/${recipe.slug}\`,` (ligne 50) :

```typescript
      pinVariants: resolveAngles(recipe.tags ?? []).map((angle) => ({
        label: angle.label,
        prompt: buildPinVariantPrompt(recipe.title, angle),
      })),
```

Notes :
- `recipe.tags ?? []` — le champ est nullable (`jsonb().default([])`), le `??` le ramène à `string[]`
- `recipe.title` est `notNull` → `string`, directement utilisable
- Le select existant (lignes 12-26) inclut déjà `tags` et `title` — aucun changement de requête SQL

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: pas d'erreur (0 sortie).

- [ ] **Step 4: Smoke test avec curl**

```bash
# Terminal 1
npm run dev
# Terminal 2
curl -s localhost:3000/api/recipes/pins | node -e "
let s=''; process.stdin.on('data',d=>s+=d).on('end',()=>{
  const j = JSON.parse(s);
  console.log('status:', j.status, '| totalFound:', j.totalFound);
  const lens = new Set(j.recipes.map(r => r.pinVariants.length));
  console.log('longueurs pinVariants:', [...lens].join(','));
  const flat = j.recipes.find(r => r.slug === 'dessert-for-2');
  console.log('dessert-for-2 pin2:', flat && flat.pinVariants[0].label);
  const def = j.recipes.find(r => r.slug === 'easy-whole30-recipes');
  console.log('default pin2:', def && def.pinVariants[0].label);
  console.log('prompt EN:', flat.pinVariants[0].prompt.startsWith('Recreate this exact same dish'));
})"
```

Expected :
- `status: "ok"`, `totalFound: 46`
- `longueurs pinVariants: 4` (toutes les recettes)
- `dessert-for-2 pin2: Overhead flat lay` (jeu flat-lay via tags)
- `default pin2: 45° close-up` (jeu default)
- `prompt EN: true`

- [ ] **Step 5: Commit**

```bash
git add app/api/recipes/pins/route.ts
git commit -m "$(cat <<'EOF'
feat(pins): exposer pinVariants (4 prompts d'angle) dans /api/recipes/pins

Chaque recette expose désormais ses 4 prompts d'angle (pins 2-5, EN)
résolus par les tags — l'app Google AI Studio consomme hero (pin 1) +
prompts (pins 2-5) en un full fetch. Contrat v1 inchangé sinon.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review (fait à l'écriture)

**1. Couverture du spec :**
- §3 Architecture (lib pur, refactor script, endpoint) → Task 1 Steps 1-2, Task 2 Steps 1-2 ✅
- §4 Contrat (`pinVariants` longueur 4, `{label, prompt}`, table 3 jeux traduite) → Task 1 Step 1 + Task 2 Step 2 ✅
- §6 Vérification (tsc, script CLI, curl, cas limites dessert-for-2/default, build) → Steps de vérif des deux tasks ✅ (`npm run build` ajouté au handoff d'exécution avant push)
- §7 Non-goals (pas d'écriture DB, pas de touché pin-brief, nutrition hors périmètre) → aucune ligne ne les viole ✅

**2. Placeholder scan :** aucun TBD/TODO ; le code de `lib/pin-variants.ts` est complet inline ; les diffs script et route sont exacts (lignes vérifiées sur le code réel).

**3. Cohérence de types :** `Angle` défini/exporté en Task 1, utilisé en Task 2 via `resolveAngles`/`buildPinVariantPrompt` — signatures identiques dans les deux tasks. `recipe.tags ?? []` → `string[]` (signature `resolveAngles(tags: string[])` OK). `recipe.title` notNull → `string` (signature `buildPinVariantPrompt(title: string, …)` OK). `pinVariants` toujours `{label, prompt}[]` dans les deux tasks.
