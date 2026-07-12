# Spec — Enrichment Léger : Pinclicks + GEO Chef Augustin

**Date :** 2026-07-12
**Type :** Amélioration chirurgicale (pas de nouveau skill)
**Conclusion de la phase brainstorming :** Ne pas créer de nouveau skill. 70% de ce qu'il ferait existe déjà dans `seo-organic-rankings-analyzer`. Deux améliorations ciblées suffisent.

---

## Contexte

Après analyse critique de la proposition de skill "Multi-Channel Editorial Strategist", le verdict est :

- Le skill `seo-organic-rankings-analyzer` fait déjà : scoring, filtrage niche, PTRA mapping, plan éditorial
- Le pipeline v11 fait déjà : génération contenu, GEO validation réactive, Pin Design, JSON-LD, SEO technique
- **Bottleneck réel :** DeepSeek v4 Pro plafonne la qualité (0/4 nuggets, 1-3/6 attributions). Claude Sonnet 4.6 + meilleur system prompt est le vrai levier.
- **Gap réel n°1 :** Les instructions GEO sont uniquement **réactives** (validation post-écriture par `lib/geo-validator.ts`), pas **proactives** dans le system prompt de Chef Augustin.
- **Gap réel n°2 :** Les données de volume de recherche natif Pinterest (Pinclicks) ne sont pas injectées dans les briefs.

**Décision :** Pas de nouveau skill. Deux modifications chirurgicales sur l'existant.

---

## Amélioration 1 — Instructions GEO proactives dans Chef Augustin

### Fichier modifié

`skills/agent-chef-augustin.md` — ajout d'une section "GEO Optimization" (§4.7)

### Ce qui est ajouté

Une nouvelle section dans les Writing Rules qui demande à Chef Augustin, **dès le passage 1**, de structurer le contenu pour maximiser les chances d'être cité par les AI Overviews (Google, ChatGPT, Perplexity).

```markdown
### 4.7 GEO Optimization — AI Overview Citability

Your content competes for AI-generated answers. Write so that LLMs extract and cite you.

**Answer Nuggets (≥4, distributed throughout):**
Every 300-400 words, include a self-contained factual block that answers one specific question in 1-3 sentences. Format as a standalone paragraph a bot could lift verbatim:

> "[Specific number/mechanism/cause] because [reason backed by culinary science]."

Examples of good nuggets:
- "A 30-minute rest at room temperature raises steak core temp by 8°F, cutting sear time by 40% and reducing the gray band."
- "Diamond Crystal kosher salt dissolves 2× faster than Morton's because its hollow pyramid crystals have 60% more surface area per gram."

**Citation-Ready Claims (pattern: claim + mechanism + source anchor):**
Every claim that could be cited MUST include: (1) the specific claim, (2) why it works (mechanism), (3) a named entity anchor ("Chef Augustin Lefèvre explains...", "In French culinary tradition..."). Rotate anchors — do not repeat the same attribution pattern.

**Structured Data Points:**
- Temperatures in both °F and °C (AI crawlers index both)
- Times as exact minutes (not "about 30 minutes")
- Quantities as both volume AND weight for key ingredients
- Technique names as precise culinary terms (sear, not brown)

**LLM-Friendly Formatting:**
- Key technique explanations as numbered steps (LLMs extract ordered lists efficiently)
- Comparison data as "X vs Y: [difference]" format
- Never hide a core instruction in a long narrative paragraph — LLMs may truncate
```

### Impact attendu

- Les answer nuggets sont écrits au passage 1, pas rajoutés après coup au passage 2-3
- Le validateur GEO (`lib/geo-validator.ts`) trouve plus de claims/attributions/nuggets dès le premier passage
- Le Content Loop fait moins de passes → coût réduit (~$0.11/recette au lieu de ~$0.17)
- La note de l'article recette #160 passe de 54/100 à ~70/100 dès le passage 1

### Validation

- Vérifier que le skill modifié ne casse pas le contrat d'input/output existant
- Test avec `npx tsc --noEmit` (aucun code TS modifié, mais par sécurité)
- Premier test de génération : vérifier le GEO score au passage 1 vs baseline DeepSeek

---

## Amélioration 2 — Ingestion Pinclicks + Jointure

### Fichiers créés/modifiés

1. **Nouveau :** `scripts/ingest-pinclicks.ts` — parse le CSV Pinclicks, normalise les keywords
2. **Modifié :** workflow du skill `seo-organic-rankings-analyzer` — phase 0 enrichie avec jointure optionnelle

### Format d'entrée attendu (Pinclicks CSV)

| Colonne | Description |
|---|---|
| `keyword` | Mot-clé recherché sur Pinterest |
| `pinterest_search_volume` | Volume mensuel de recherche sur Pinterest (source : pinclicks.com) |
| *(colonnes additionnelles ignorées)* | — |

### Jointure

```
Pinclicks.keyword → Semrush.keyword (normalisé, lowercase, trimmed)
```

La jointure ajoute `pinterest_search_volume` à chaque keyword du fichier enrichi.

### Output

`data/parsed-keywords.json` enrichi avec le champ `pinterestSearchVolume` (number, nullable).

Les phases suivantes (filtrage niche, PTRA mapping, plan éditorial) n'ont **aucune modification** — elles consomment le champ s'il est présent, l'ignorent sinon.

### Scoring Dual-Potential (ajouté au niche score existant)

Dans la phase 1 (niche filtering), une règle supplémentaire :

```typescript
// Pinterest Search Volume signal (Pinclicks data)
if (pinterestSearchVolume > 1000) nicheScore += 1
if (pinterestSearchVolume > 5000) nicheScore += 2
```

### Impact attendu

- Les keywords avec fort volume natif Pinterest mais faible volume Google sont mieux classés
- Le score niche reflète les DEUX canaux, pas seulement Google

---

## Ce qui N'EST PAS fait (volontairement)

| Non fait | Raison |
|---|---|
| Nouveau skill Markdown | Doublon avec `seo-organic-rankings-analyzer` |
| Nouvel agent | Chef Augustin + Pin Designer suffisent |
| Nouveau step Inngest | L'analyse reste hors pipeline |
| Topical map auto-détection | `cluster-landscape.json` existe déjà |
| Pin briefs complets | Le Pin Designer les génère déjà |
| Modification de `generate-recipe.ts` | Zéro changement pipeline |

---

## Fichiers touchés — Résumé

| Fichier | Action | Lignes estimées |
|---|---|---|
| `skills/agent-chef-augustin.md` | Ajout §4.7 GEO Optimization | ~35 lignes |
| `scripts/ingest-pinclicks.ts` | Nouveau — parse CSV Pinclicks | ~40 lignes |
| `.claude/skills/seo-organic-rankings-analyzer/SKILL.md` | Phase 0 — jointure optionnelle | ~10 lignes |
| `.claude/skills/seo-organic-rankings-analyzer/references/csv-schema.md` | Doc — colonne `pinterest_search_volume` | ~3 lignes |

**Total : ~90 lignes, 4 fichiers, 0 nouveau skill, 0 changement pipeline.**

---

## Ordre d'exécution recommandé

1. Amélioration 1 (GEO prompt) — impact immédiat, zéro dépendance
2. Amélioration 2 (Pinclicks) — nécessite que l'utilisateur fournisse le fichier Pinclicks
