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

- Les answer nuggets et claims citables sont demandés dès le passage 1 — le validateur GEO les trouve sans attendre le feedback du Content Loop
- **Limite connue :** DeepSeek v4 Pro a déjà du mal à suivre les instructions existantes (0/4 nuggets, 1-3/6 attributions). L'ajout de §4.7 ne produira son plein effet qu'avec **Claude Sonnet 4.6**. Avec DeepSeek, le gain sera marginal au mieux — le bottleneck est le modèle, pas les instructions.
- Pas de prédiction chiffrée — seul un test réel avec Claude Sonnet 4.6 pourra mesurer l'impact sur le GEO score

### Validation

- Vérifier que le skill modifié ne casse pas le contrat d'input/output existant (les champs du Output Schema §8 restent inchangés)
- `npx tsc --noEmit` (le skill est un fichier Markdown, aucun code TS modifié — par sécurité)
- Test de génération avec DeepSeek : mesurer si le GEO score passe 1 s'améliore, mais s'attendre à un gain limité
- Test de génération avec Claude Sonnet 4.6 (dès qu'`ANTHROPIC_API_KEY` est disponible) : mesurer le GEO score réel

---

## Amélioration 2 — Ingestion Pinclicks + Jointure

> **⚠️ Condition :** Cette amélioration est conditionnée à la réception du fichier Pinclicks. Ne rien implémenter avant que l'utilisateur fournisse le fichier.

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

### Scoring Dual-Potential

Dans la phase 1 (niche filtering), ajouter le `pinterestSearchVolume` comme signal. **Les seuils exacts seront calibrés après analyse de la distribution réelle des données Pinclicks** — ne pas utiliser de valeurs arbitraires. La règle suit le même principe que le scoring existant : volume plus élevé = signal plus fort.

### Impact attendu

Les keywords avec fort volume natif Pinterest mais faible volume Google sont mieux classés. Le score niche reflète les DEUX canaux. L'ampleur de l'impact dépend de la corrélation entre volume Pinclicks et traffic Pinterest réel — à mesurer après déploiement.

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

1. **Amélioration 1 (GEO prompt)** — prête à implémenter, zéro dépendance. Gain limité avec DeepSeek, plein effet avec Claude Sonnet 4.6.
2. **Amélioration 2 (Pinclicks)** — **bloquée** tant que le fichier Pinclicks n'est pas fourni. Ne pas coder avant.

## Risques et limites reconnus

| Risque | Probabilité | Impact |
|---|---|---|
| DeepSeek ignore les nouvelles instructions GEO | Élevée | Faible (le prompt est déjà ignoré sur d'autres points) |
| Pinclicks non fourni → Amélioration 2 jamais implémentée | Moyenne | Faible (le scoring Google-only fonctionne déjà) |
| Les instructions GEO alourdissent le prompt sans bénéfice mesurable | Moyenne | Négligeable (~35 lignes sur 176 existantes) |
| **Vrai levier non adressé :** absence d'`ANTHROPIC_API_KEY` | Certain | Élevé — Claude Sonnet 4.6 est le facteur décisif de qualité |
