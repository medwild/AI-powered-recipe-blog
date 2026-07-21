# Pipeline v14 — Karpathy Simplification

> **Design spec — 2026-07-21**
> Objectif : Simplification radicale du pipeline IA selon les principes Karpathy.
> Principe fondateur : *"The LLM generates, code enforces quality."*

## 1. Philosophy

> "Est-ce qu'un senior engineer dirait que c'est trop compliqué ?" — Karpathy Rule #2

Le pipeline v13 actuel souffre de **complexité accumulée** : 4 agents LLM, 5 skills, ~3,500 lignes de code, 11 fichiers de règles, 8 steps Inngest. Chaque ajout était justifié isolément, mais l'ensemble est devenu fragile — trop de points de défaillance, trop de code à maintenir, trop de règles qui se contredisent.

**v14 revient à l'essentiel** : un seul appel LLM avec un seul skill, une gate de qualité minimale, et le moins de code possible. La qualité vient des instructions données au LLM, pas du nombre de vérifications après coup.

### Ce qu'on garde (non-négociable)

| Élément | Justification |
|---|---|
| Stack technique (Next.js, Drizzle, Inngest, Tailwind, Neon, FLUX-1) | Stabilité, pas de migration infra |
| Persona Chef Augustin | Différenciation éditoriale |
| 7 patterns humains | Signature anti-AI éprouvée |
| SERP data (Serper API) | Base de l'analyse concurrentielle |
| Food safety validation (code) | Risque légal, ne peut pas être délégué au LLM |
| JSON-LD structuré | Rich snippets Google |
| FAQ structuré | Extraction AI Overviews |
| Publié automatique (AUTO_APPROVE) | Mode dev, pas de friction |

### Ce qu'on jette (et pourquoi)

| Élément | Raison |
|---|---|
| Strategist agent séparé | L'analyse SERP se fait dans le mega-skill |
| Science Enricher agent séparé | La food science est intégrée au mega-skill |
| Pin Designer agent | Pinterest = trafic secondaire, pas core |
| 4 des 5 skills | Fusionnés en 1 mega-skill |
| GEO citability scoring | Les règles sont dans le skill, le scoring ne décidait rien |
| Loop state tracking (loop-state.ts) | Plus de loop multi-passes |
| Quality scoring composite | Remplacé par 4 checks binaires |
| A/B image stats | Optimisation prématurée |
| 9 des 11 fichiers de règles | Conservé : global.md, security.md |
| Retry loop + truncation detection | Structured outputs garantit la sortie |
| Internal linking automatique | Complexité > gain SEO |
| Pin-first format | Google format uniquement |
| Review humaine obligatoire | Auto-publish sauf BLOCK |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────┐
│ STEP 1: SERP (code, ~50 lignes)                  │
│                                                   │
│ Serper API → dump SERP brut                       │
│ Pas de structuration, pas de matching             │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ STEP 2: MEGA-SKILL (1 LLM call, Opus 4.8)        │
│                                                   │
│ System: CHEF_AUGUSTIN_MEGA (~200 lignes)          │
│ Messages: [{ role: "user", content: `              │
│   KEYWORD, CUISINE, INGREDIENTS, TECHNIQUES,      │
│   SERP dump, SOURCE citations                     │
│ `}]                                                │
│                                                   │
│ cache_control: { type: "ephemeral" }              │
│ output_config: { format: RecipeArticleSchema }    │
│ thinking: { type: "adaptive" }                    │
│                                                   │
│ Output: RecipeArticle (validated by API)          │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ STEP 3: QUALITY GATE (code, ~60 lignes)          │
│                                                   │
│ 1. Duplicate slug? → BLOCK                        │
│ 2. Food safety temps? → BLOCK                     │
│ 3. Word count < 1200? → BLOCK                     │
│ 4. Banned words? → FIX (scrub)                    │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ STEP 4: PERSIST + IMAGE (code, ~80 lignes)       │
│                                                   │
│ Persist:                                          │
│   slugify(title) → slug                          │
│   Remplacer [IMAGE:] par <img> + alt text        │
│   INSERT INTO recipes                             │
│   content_type = "recipe"                         │
│   status = gate PASS ? "published" : "draft"      │
│   Ping sitemap Google                             │
│                                                   │
│ Image (non-bloquant):                             │
│   try: FLUX-1 → Cloudinary → UPDATE recipe        │
│   catch: log, recipe published without image      │
└──────────────────────────────────────────────────┘
```

---

## 3. Le Mega-Skill

Un seul fichier `skills/chef-augustin-mega.md`, ~200 lignes.

### Structure par priorité (pas par domaine)

```
§1 CRITICAL — Food Safety + AdSense Compliance
    - USDA températures (poultry 165°F/74°C, ground meat 160°F/71°C, ...)
    - Never "healthy", "good for you", "nutritious", "better than [food]"
    - Zero health claims: probiotics, detox, gut health, immune, anti-inflammatory, fat-burning
    - Transparent brand persona — no fabricated credentials

§2 IDENTITY & VOICE
    - Chef Augustin Lefèvre, French-trained, American audience
    - "Dinner for Two — Small-Batch Weeknight Meals for Real Life"
    - Warm authority, first-person, precise, no fake enthusiasm

§3 THE 7 HUMAN PATTERNS (use ≥5 per article)
    1. Title → first sentence (never "This recipe is..." or "Today I'm sharing...")
    2. Parentheses = personality
    3. Sign tips with name ("Chef Augustin's Tip:")
    4. Comment between steps
    5. Substitutions with reassurance
    6. Standalone wisdom lines
    7. Close with a scene, not "Enjoy!" or "Bon appétit!"

§4 WRITING & CULINARY QUALITY
    - Specificity: inconveniently specific
    - Sensory verbs: sizzle, blister, crackle, infuse
    - One culinary failure per article
    - Time + visual cue on every timed step
    - ≥4 source attributions (rotate: named authority + first-person testing)
    - ≥4 answer nuggets (FAQ blocks, 25-120 words, ≥1 number or named entity)
    - Every temperature in °F AND °C
    - Quantities as volume AND weight
    - Cite 1-2 external sources where contextually relevant

§5 SEO & STRUCTURE (Google format, 1800-2200 words)
    - metaTitle: ≤60 chars, keyword first
    - metaDescription: 150-160 chars, actionable
    - H2 sections: 6-8, each with clear purpose
    - FAQ: 5 Q&A with ## Question? format
    - Include sections: "Why This Works", "What Most Recipes Get Wrong", "Chef's Tips"
    - Analyze SERP data for angle — find the gap competitors missed
    - State your angle before writing: one sentence, specific, differentiated

§6 IMAGE PROMPT
    - Subject/Action/Environment (≤40 words subject)
    - Lighting (pick one: natural window 3500K, dramatic side 3200K, golden hour 3000K, studio softbox 5000K)
    - Camera: Sony A7R IV, lens per dish type
    - Total 60-100 words, never >120
    - Low-visual dishes: ingredients, process, texture close-ups

§7 OUTPUT — Follow the Zod schema. Output valid JSON only.
```

### Règles de rédaction du skill
- **Règles vérifiables par le LLM uniquement** — pas de "word count ≥ 1200" (la gate le fait)
- **Ordre par criticité** — food safety en premier
- **Direct, pas poli** — "Never say..." pas "Please avoid..."
- **≤ 200 lignes** — si ça dépasse, c'est qu'on met des règles que la gate devrait gérer

---

## 4. La Quality Gate

Un seul fichier `lib/quality-gate.ts`, ~60 lignes.

### Les 4 checks

```typescript
interface GateResult {
  status: "PASS" | "BLOCK";
  reason?: "duplicate" | "food_safety" | "too_short";
  errors?: string[];
  output: RecipeArticle; // modifié (banned words scrubbed)
}

function qualityGate(output: RecipeArticle): GateResult {
  // Check 0: Duplicate slug
  const slug = slugify(output.title);
  const existing = await db.select().from(recipes).where(eq(recipes.slug, slug)).limit(1);
  if (existing.length > 0) {
    return { status: "BLOCK", reason: "duplicate", errors: [`Slug "${slug}" exists`], output };
  }

  // Check 1: Food Safety
  const foodSafetyErrors = validateFoodSafety(output.instructions, output.ingredients);
  if (foodSafetyErrors.length > 0) {
    return { status: "BLOCK", reason: "food_safety", errors: foodSafetyErrors, output };
  }

  // Check 2: Word Count
  const wordCount = output.contentMarkdown.split(/\s+/).filter(Boolean).length;
  if (wordCount < 1200) {
    return { status: "BLOCK", reason: "too_short", errors: [`${wordCount} words < 1200 minimum`], output };
  }

  // Check 3: Banned Words (FIX — never blocks)
  output.contentMarkdown = scrubBannedWords(output.contentMarkdown);

  return { status: "PASS", output };
}
```

### Banned words list
```
probiotics, gut health, immune boost, detox, anti-inflammatory,
fat-burning, miracle, superfood, cleanse, cure, heal, treat,
all-natural (as health claim), clinically proven, scientifically proven
```

### Food safety validation (30 lignes)
- Vérifie les températures USDA pour les protéines nommées
- Poultry → 165°F/74°C, ground meat → 160°F/71°C, pork → 145°F/63°C, fish → 145°F/63°C
- Si un ingrédient contient "chicken" ou "poultry", au moins une instruction doit mentionner 165°F ou 74°C
- Même logique pour chaque protéine

---

## 5. Fichiers supprimés

| Fichier | ~Lignes | Raison |
|---|---|---|
| `skills/agent-strategist.md` | 76 | Fusionné dans mega-skill §5 |
| `skills/agent-science-enricher.md` | 85 | Fusionné dans mega-skill §4 |
| `skills/agent-pin-designer.md` | 249 | Pinterest hors scope |
| `skills/agent-chef-augustin.md` | 88 | Remplacé par mega-skill |
| `lib/inngest/functions/agents/strategist.ts` | 127 | Plus d'agent séparé |
| `lib/inngest/functions/agents/science-enricher.ts` | 162 | Plus d'agent séparé |
| `lib/inngest/functions/agents/pin-designer.ts` | 152 | Pinterest hors scope |
| `lib/inngest/functions/steps/pin-phase.ts` | 108 | Pinterest hors scope |
| `lib/inngest/functions/steps/content-loop-phase.ts` | 305 | Remplacé par step 2 direct |
| `lib/geo-validator.ts` | 330 | Règles dans le skill |
| `lib/quality-scorer.ts` | 73 | Plus de scoring composite |
| `lib/loop-scorer.ts` | 0 (déjà deleted) | Déjà supprimé |
| `lib/loop-state.ts` | 213 | Plus de multi-passes |
| `lib/external-sources.ts` | 391 | LLM fait le matching |
| `lib/content-validator.ts` | 556 | Remplacé par quality-gate.ts |
| `.claude/rules/ai-pipeline.md` | - | Simplifié dans CLAUDE.md |
| `.claude/rules/routing-seo.md` | - | Fusionné dans global.md |
| `.claude/rules/api.md` | - | Non essentiel |
| `.claude/rules/frontend.md` | - | Non essentiel |
| `.claude/rules/database.md` | - | Fusionné dans global.md |
| `.claude/rules/karpathy.md` | - | Conservé (philosophie) |
| `.claude/rules/accuracy.md` | - | Conservé (philosophie) |
| `scripts/analyze-*.ts` (3 scripts) | - | Outils d'analyse v13 |
| `scripts/build-clusters.ts` | - | Outil v13 |
| `scripts/batch-generate.mjs` | - | Outil v13 |
| `docs/archive/*.md` (10 fichiers) | - | Historique, pas de code |

---

## 6. Fichiers créés ou modifiés

### Créés
| Fichier | Description |
|---|---|
| `skills/chef-augustin-mega.md` | Mega-skill unique (~200 lignes) |
| `lib/quality-gate.ts` | Quality gate simplifiée (~60 lignes) |
| `lib/schemas/recipe-article.ts` | Zod schema pour structured output |
| `scripts/eval-recipe.ts` | Script de test : génère 1 recette et dump le JSON |

### Modifiés
| Fichier | Changement |
|---|---|
| `lib/inngest/functions/generate-recipe.ts` | Réécrit : 4 steps au lieu de 8 |
| `lib/inngest/functions/agents/chef-augustin.ts` | Réécrit : mega-skill au lieu de chef-augustin skill |
| `lib/inngest/functions/steps/serp-phase.ts` | Simplifié : dump brut, pas de structuration |
| `lib/inngest/functions/steps/persist-phase.ts` | Simplifié : persist + sitemap ping |
| `lib/inngest/functions/steps/image-phase.ts` | Simplifié : non-bloquant |
| `lib/inngest/functions/helpers.ts` | Réduit : log functions uniquement |
| `CLAUDE.md` | Mis à jour pour v14 |
| `.claude/rules/global.md` | Fusion de routing-seo + database |
| `package.json` | Dépendances inutilisées retirées |

---

## 7. Métriques

| Métrique | v13 | v14 | Delta |
|---|---|---|---|
| Appels LLM par recette | 2-4 | 1 | **-60% à -75%** |
| Skills Markdown | 5 fichiers | 1 fichier | **-80%** |
| Code pipeline + validateurs | ~3,500 lignes | ~400 lignes | **-89%** |
| Fichiers de règles | 11 | 3 | **-73%** |
| Steps Inngest | 8 | 4 | **-50%** |
| Points de défaillance | ~12 | 4 | **-67%** |
| Latence estimée | 3-8 min | 1.5-3 min | **-50%** |
| Coût LLM/article (est.) | $0.02-0.08 | $0.03-0.05 | ~équivalent |
| Temps humain/recette | Review obligatoire | 0 (sauf BLOCK) | **-100%** |

---

## 8. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Opus 4.8 API down | Faible | Bloquant | Retries Inngest (2), monitoring |
| Mega-skill non testé en production | Moyen | Qualité dégradée | `scripts/eval-recipe.ts` sur 5 keywords avant déploiement |
| Structured output rejeté (schema mismatch) | Faible | Article perdu | Retry Inngest automatique |
| Image FLUX-1 échoue | Faible | Article sans image | Non-bloquant, retry asynchrone |
| AdSense refuse malgré compliance | Faible | Revenu | Hors scope — on suit les règles connues |
| LLM ignore certaines règles du mega-skill | Moyen | Qualité variable | La gate bloque les violations critiques (food safety, mots) |

---

## 9. Plan de migration

1. **Créer** `skills/chef-augustin-mega.md` (skill uniquement, pas de code)
2. **Créer** `lib/schemas/recipe-article.ts` (Zod schema)
3. **Créer** `lib/quality-gate.ts` (4 checks)
4. **Réécrire** `lib/inngest/functions/generate-recipe.ts` (4 steps)
5. **Réécrire** `lib/inngest/functions/agents/chef-augustin.ts` (mega-skill call)
6. **Simplifier** `serp-phase.ts`, `persist-phase.ts`, `image-phase.ts`
7. **Supprimer** les fichiers obsolètes
8. **Créer** `scripts/eval-recipe.ts` et tester sur 5 keywords
9. **Mettre à jour** `CLAUDE.md` et `.claude/rules/`
10. **`npx tsc --noEmit`** + déploiement

---

## 10. Succès — Comment on saura que ça marche

- [ ] `npx tsc --noEmit` passe
- [ ] 1 recette générée de bout en bout sans erreur
- [ ] Quality gate PASS sur 5/5 recettes test
- [ ] Score Google Rich Results Test : 0 erreurs JSON-LD
- [ ] Indexation Google < 24h après ping sitemap
- [ ] AdSense approuve le contenu (pas de violation de politique)
- [ ] Aucun article bloqué pour food safety (faux positif)
