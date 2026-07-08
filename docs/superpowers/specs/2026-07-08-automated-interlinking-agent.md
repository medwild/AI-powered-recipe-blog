# Automated Internal Linking Agent — Design Spec

> **Date** : 2026-07-08
> **Scope** : Agent IA de maillage interne automatisé, intégré au pipeline Inngest
> **Stratégie** : PTRA, SEO best practices Google, plan éditorial autopilot

---

## Objectifs

1. **Automatisation complète** — aucun lien interne ne nécessite d'intervention manuelle
2. **Conformité SEO** — anchor text naturel, profondeur max 2 clics, liens réciproques, zéro orphelin
3. **Prédictibilité** — le matching est déterministe (pas de LLM pour la sélection des cibles)
4. **Qualité éditoriale** — les liens sont intégrés naturellement dans le flux d'écriture (LLM pour l'insertion)
5. **Backfill** — les contenus existants sont mis à jour quand un nouveau contenu est publié

---

## Architecture — Deux composants

### 1. Link Suggester (step 1.5 — avant Strategist)

**Type** : Déterministe TypeScript, pas de LLM
**Déclencheur** : Exécuté à chaque génération de contenu (recette ou article)
**Input** : `keyword`, `tags[]`, `content_type`, `contentId`
**Output** : `LinkTarget[]` (5-7 cibles) → injecté dans le prompt du Writer

```
┌─────────────────────────────────────────────────────────┐
│                 LINK SUGGESTER                          │
│                                                         │
│  Step 1 — Candidate Pool                               │
│    Query: all published content (recipe + article)      │
│    Exclude: current content, no-image, draft            │
│                                                         │
│  Step 2 — Scoring (0-100)                              │
│    Tag overlap ................... 50 pts               │
│    Content-type diversity ....... 30 pts                │
│    Recency (< 30 days) .......... 15 pts                │
│    Hub priority (essential) ..... 5 pts                 │
│                                                         │
│  Step 3 — Diversity rules                              │
│    Recipe → min 2 articles in top 7                     │
│    Article → min 2 recipes in top 7                     │
│    Max 1 link per category                              │
│                                                         │
│  Step 4 — De-duplication                               │
│    Exclude already-linked content                       │
│    Penalize if reciprocal link exists                   │
│                                                         │
│  Output: 5-7 targets sorted by score                   │
└─────────────────────────────────────────────────────────┘
```

### 2. Link Backfill (step 14 — post-publish, asynchrone)

**Type** : LLM (Editor-like), déclenché après Persist
**Déclencheur** : Événement `content.published`
**Input** : `contentId`, `slug`, `title`, `tags[]`, `content_type`
**Process** : Pour chaque contenu existant le plus pertinent → vérifie si lien absent → génère markdown mis à jour

```
┌─────────────────────────────────────────────────────────┐
│                 LINK BACKFILL                           │
│                                                         │
│  For each of top 5 related existing content:            │
│                                                         │
│    1. Check if existing content already links to new    │
│       → If yes: skip (already linked)                   │
│                                                         │
│    2. Generate updated markdown via LLM:                │
│       - Input: current markdown + new content info      │
│       - Prompt: "Insert 1 natural link to this recipe   │
│         in the most relevant section. Do NOT change     │
│         anything else. Return FULL markdown."           │
│                                                         │
│    3. Validate:                                         │
│       - Link count increased by exactly 1               │
│       - Anchor text is not generic                      │
│       - Original content preserved (diff check)         │
│                                                         │
│    4. Update DB: content_markdown = updated version     │
│       Log: backfill_logs table for audit trail          │
└─────────────────────────────────────────────────────────┘
```

---

## Pipeline révisé (14 étapes)

```
1.  SERP Structurer     — Analyse SERP brute
1.5 LINK SUGGESTER      — Cibles de liens (NEW)
2.  Strategist          — Plan SEO/GEO + cibles liens
3.  Writer              — Rédaction + insertion liens
4.  Auditor             — Vérification liens + contenu
5.  Human Review        — (optionnel, bypassable)
6.  Editor              — Correction + liens manquants
7.  QA                  — Vérification cross-agent
8.  Image Optimizer     — Prompt image food photography
9.  Image Gen           — Génération image A/B
10. Self-Improvement    — Logs feedback
11. Persist             — Sauvegarde DB
12. A/B Tracking        — Stats images
13. AOR Article         — Article lié (si recette)
14. LINK BACKFILL       — Mise à jour liens contenus existants (NEW)
```

---

## Contrats inter-agents

### Link Suggester → Strategist

```typescript
interface LinkTarget {
  slug: string
  title: string
  content_type: "recipe" | "article"
  score: number
  reason: string // e.g. "3 shared tags: dinner, easy, one-pan"
}

// Passé dans le prompt Strategist, relayé au Writer
```

### Writer — Prompt addition

```
## Internal Linking Targets
Insert 2-3 contextual links (3-4 for articles) within the body text.
Rules:
- Natural, varied anchor text — never "click here", "read more", "here"
- Max 1 link per H2 section
- Link must add real value for the reader
- Use markdown: [descriptive anchor text](/path)

Recommended targets (choose 2-3 that fit naturally):
{% for target in linkTargets %}
- /{{ target.slug }} | {{ target.title }} | {{ target.content_type }} | {{ target.reason }}
{% endfor %}
```

### Auditor — Link checks additionnels

| Check | ID | Règle | Severity |
|---|---|---|---|
| Link count | `link_count` | 2-4 internal links (recipe), 3-5 (article) | Warning if < 2 |
| Anchor quality | `anchor_quality` | No "click here", "read more", "here", "learn more" | Hard fail if found |
| Broken references | `broken_links` | All linked slugs exist in DB | Hard fail if broken |

### Link Backfill — Validation rules

| Check | Action if fail |
|---|---|
| New link count ≠ old + 1 | Reject — retry with different prompt |
| Anchor text contains banned words | Reject — regenerate |
| > 20% of original content changed | Reject — content drift detected |
| Link points to wrong slug | Reject — validation error |

---

## Database

### Nouvelle table : `internal_link_logs`

```sql
CREATE TABLE internal_link_logs (
  id SERIAL PRIMARY KEY,
  source_content_id INTEGER NOT NULL,    -- contenu qui contient le lien
  target_slug TEXT NOT NULL,             -- slug lié
  target_content_id INTEGER,            -- ID du contenu lié
  anchor_text TEXT NOT NULL,            -- texte du lien inséré
  action TEXT NOT NULL,                 -- 'insert' | 'backfill' | 'remove'
  source TEXT NOT NULL,                 -- 'writer' | 'editor' | 'backfill'
  score INTEGER,                        -- score du Suggester (si applicable)
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Fichiers à créer / modifier

| Fichier | Action | Description |
|---|---|---|
| `lib/inngest/functions/steps/link-suggester.ts` | **Nouveau** | Step 1.5 — Scoring déterministe |
| `lib/inngest/functions/steps/link-backfill.ts` | **Nouveau** | Step 14 — Backfill asynchrone |
| `lib/inngest/functions/agents/writer.ts` | **Modifié** | Prompt : ajout section "Internal Linking Targets" |
| `lib/inngest/functions/agents/auditor.ts` | **Modifié** | Ajout 3 checks liens |
| `lib/inngest/functions/generate-recipe.ts` | **Modifié** | Ajout step 1.5 + step 14 |
| `lib/db/schema.ts` | **Modifié** | Nouvelle table `internal_link_logs` |
| `skills/agent-writer.md` | **Modifié** | Mise à jour contrat sortie + règles liens |
| `skills/agent-auditor.md` | **Modifié** | Mise à jour critères lien |

---

## Critères de succès

- [ ] Link Suggester retourne 5-7 cibles en < 50ms
- [ ] Writer insère 2-4 liens contextuels avec anchor text varié
- [ ] Auditor détecte les anchors génériques ("click here")
- [ ] Auditor détecte les slugs cassés
- [ ] Link Backfill met à jour les contenus existants sans casser le contenu original
- [ ] `npx tsc --noEmit` passe
- [ ] Aucun step Inngest renommé
- [ ] `internal_link_logs` enregistre chaque lien créé
- [ ] Score maillage interne passe de 76/100 → 90+/100
