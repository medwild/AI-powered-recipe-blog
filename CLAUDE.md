# AI AutoBlog — CLAUDE.md
> MàJ : 2026-07-17 — Pipeline v13 Single-Pass, Provider DeepSeek, Corrections pre-merge

## Pipeline — 5 étapes (v13 Single-Pass Strategist → Writer → Quality Gate)

```
SERP → Strategist (LLM) → Writer (LLM, retry once on truncation) → Quality Gate (code) → Persist Draft → Human Review → Images → Final Persist + Validation → A/B Stats → Pin Designer
```

### Agent Unique — Chef Augustin

| Paramètre | Valeur |
|---|---|
| Modèle primaire | DeepSeek v4 Pro |
| Modèle secondaire | Anthropic Claude (via LLM_PROVIDER=anthropic) |
| Temperature | 0.8 |
| Max tokens | 8192 |
| Skill | `skills/agent-chef-augustin.md` |

L'agent unique gère en un seul appel LLM : analyse SERP interne, structuration de l'article (format Google ou Pin-First), rédaction complète, auto-édition, génération de prompt image, et production JSON-LD.

### Content Generation (Single-Pass v13)

Architecture single-pass (Karpathy principle: "the LLM generates, code enforces quality"):
- **Strategist** (LLM) : planifie la structure une fois (H2, FAQ, gaps, angle)
- **Writer / Chef Augustin** (LLM) : génère le contenu en un seul appel, toutes les règles qualité intégrées dans le skill
- **Quality Gate** (code pur) : valide food safety, word count minimum, structure
- **Retry** : uniquement sur sortie tronquée (ingrédients/instructions manquants, < min words). Max 2 tentatives au total.
- **Deterministic fixes** (persist-phase) : banned-word scrubbing, meta truncation (autopilot fallback uniquement), internal linking

Validateurs déterministes utilisés :
- `lib/geo-validator.ts` : Citability score (claims, attributions, answer nuggets)
- `lib/content-validator.ts` : Banned words, health claims, structure, word count
- `lib/loop-scorer.ts` : Score composite (GEO 50% + Content 30% + Structure 20%)

## Règles globales

- **Avant toute modification** : lire `.claude/rules/global.md` — 15 règles absolues NEVER + checklist
- **Avant toute modification du routing** : lire `.claude/rules/routing-seo.md` — architecture, SEO, content_type, patterns intouchables
- **Après toute modification du pipeline** : `npx tsc --noEmit` obligatoire
- **Ne jamais modifier un skill Markdown** sans vérifier l'agent runtime correspondant
- Les variables d'env sont documentées dans `.env.example` — ne pas les hardcoder

## Self-Improvement (boucle fermée)

- Les logs d'amélioration sont écrits dans `self_improvement_logs` (DB) via `persist-phase.ts`
- La Quality Gate + les deterministic fixes sont le mécanisme principal d'amélioration qualité
- Les validateurs déterministes (GEO citability + Content validation) sont la source de vérité
- Le skill Chef Augustin est la source unique des règles de qualité pour le LLM
