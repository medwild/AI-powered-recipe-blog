# AI AutoBlog — CLAUDE.md
> MàJ : 2026-07-21 — Pipeline v14 Single-Shot, Opus 4.8, Karpathy simplification

## Pipeline — 4 étapes (v14 Single-Shot Mega-Skill)

```
SERP → Mega-Skill (1 LLM call, Opus 4.8) → Quality Gate (4 checks) → Persist + Image
```

### Mega-Skill Unique — Chef Augustin

| Paramètre | Valeur |
|---|---|
| Modèle primaire | Claude Opus 4.8 |
| Modèle fallback | Claude Sonnet 5 |
| Thinking | Adaptive, budget 4000 tokens |
| Max tokens | 32000 |
| Skill | `skills/chef-augustin-mega.md` |
L'agent unique gère en un seul appel LLM : analyse SERP, structuration, rédaction, auto-édition, food safety, image prompt, et JSON-LD.

### Quality Gate (code pur, `lib/quality-gate.ts`)

4 checks binaires (tous BLOCK — pas de modification silencieuse) :
1. Duplicate slug → BLOCK immédiat (pas de retry)
2. Food safety USDA temps → BLOCK (retry 1x max)
3. Word count < seuil → BLOCK (retry 1x max)
4. Banned words (AdSense) → BLOCK (retry 2x max avec feedback)

Retry loop avec feedback injecté via le user message. Après max retries → draft.

## Règles globales

- **Avant toute modification** : lire `.claude/rules/global.md` — règles absolues NEVER + checklist
- **Après toute modification du pipeline** : `npx tsc --noEmit` obligatoire
- **Ne jamais modifier un skill Markdown** sans vérifier l'agent runtime correspondant
- Les variables d'env sont documentées dans `.env.example` — ne pas les hardcoder
