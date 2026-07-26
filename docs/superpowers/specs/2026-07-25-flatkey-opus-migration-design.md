# Spec: Migration Gemini Flash 3 → Claude Opus 4.8 via FlatKey

> **Date** : 2026-07-25 | **Statut** : Approuvé | **Complexité** : Faible (~25 lignes)

## Objectif

Remplacer définitivement Gemini Flash 3 par Claude Opus 4.8 comme modèle de génération de recettes, en utilisant FlatKey (flatkey.ai) comme proxy Anthropic avec rotation de clés multi-comptes ($1 crédit gratuit par compte).

## Décisions clés

| Décision | Choix | Raison |
|----------|-------|--------|
| Provider | Réutiliser `AnthropicProvider` existant | FlatKey expose un endpoint Anthropic natif — zéro code nouveau |
| Rotation | Ajoutée à `AnthropicProvider.runText()` | Inspiré de `GeminiProvider.fetchWithRotation()` |
| Détection épuisement | 401 + `"insufficient_balance"` | Confirmé par test réel |
| Structured output | Chemin Anthropic natif, fallback text+parse si erreur | On ne sait pas si FlatKey supporte `output_config` |
| `thinking` | Désactivé si base URL contient `flatkey.ai` | FlatKey ne supporte probablement pas |
| `cache_control` | Désactivé si base URL contient `flatkey.ai` | FlatKey ne supporte probablement pas le prompt caching |
| Gemini | Conservé dans le code, plus utilisé | Pas de suppression — rollback facile possible |

## Architecture

```
LLM_PROVIDER=anthropic  ← inchangé (pas de nouveau provider)
ANTHROPIC_BASE_URL=https://router.flatkey.ai  ← la seule nouveauté
ANTHROPIC_MODEL=claude-opus-4-8
ANTHROPIC_API_KEY=sk-fk-xxx
ANTHROPIC_API_KEY_2=sk-fk-yyy
...
```

### Modifications — `lib/agents/provider.ts`

**1. AnthropicProvider — multi-clé (lignes 39-47)**

Comme `GeminiProvider` (lignes 308-318) : lire toutes les variables `ANTHROPIC_API_KEY*`, stocker `{ key, exhausted }[]`.

**2. AnthropicProvider.runText() — rotation sur 401 insufficient_balance**

Comme `GeminiProvider.fetchWithRotation()` (lignes 338-354) : essayer jusqu'à 3 clés différentes avant de throw.

**3. Détection FlatKey — désactiver `thinking` + `cache_control`**

Check `this.baseUrl.includes("flatkey.ai")` → pas de `thinking`, pas de `cache_control`.

**4. `runWithStructuredOutput()` — inchangé**

Le `instanceof AnthropicProvider` check (ligne 641) continue de matcher. Si FlatKey rejette `output_config` → l'erreur est catchée → on pourra ajouter un fallback text+parse si nécessaire.

### Fichiers touchés

| Fichier | Changement | Lignes |
|---------|-----------|--------|
| `lib/agents/provider.ts` | Multi-clé + rotation + détection FlatKey | ~25 |
| `.env.local` | `ANTHROPIC_BASE_URL` + `ANTHROPIC_API_KEY*` ×5 | ~6 |
| `CLAUDE.md` | Tableau modèles | ~3 |
| `skills/chef-augustin-mega.md` | Aucun (le skill est agnostique au modèle) | 0 |

### Non touché

- `GeminiProvider` — conservé (rollback)
- `CloudflareProvider` — conservé
- `chef-augustin.ts` — inchangé
- `quality-gate.ts` — inchangé

## Flux d'exécution

```
generate.ts
  → generateRecipe()
    → ChefAugustinMega.generate()
      → runWithStructuredOutput(..., "anthropic/claude-opus-4-8")
        → AnthropicProvider (FlatKey)
          → POST https://router.flatkey.ai/v1/messages
            → 200 ✅ → retourne le JSON
            → 401 + "insufficient_balance" → markExhausted → clé suivante
            → 401 + autre code → erreur réelle (clé invalide)
            → 400 + "output_config" → fallback text+parse
            → 429/5xx → retry standard (déjà dans le code)
```

## Risques connus

| Risque | Probabilité | Mitigation |
|--------|------------|-----------|
| FlatKey rejette `output_config` (structured output) | Moyenne | Si 400 → on ajoutera un catch + fallback text+parse. Pas pré-codé — Karpathy. |
| FlatKey rejette `thinking` | Moyenne | Déjà géré : on désactive si `flatkey.ai` dans l'URL |
| FlatKey rejette `cache_control` | Moyenne | Déjà géré : on désactive si `flatkey.ai` dans l'URL |
| Nom du modèle incorrect | Faible | On utilisera le nom exact après premier appel réussi |
| Rate limiting FlatKey | Faible | Déjà géré : retry standard 429 dans le code existant |

## Validation

1. `npx tsc --noEmit` — doit passer
2. Génération test : `npx tsx scripts/generate.ts "test opus flatkey"` — 1 recette
3. Vérifier le log `[provider] Anthropic` dans la sortie
4. Vérifier `cache n/a` (pas de cache FlatKey)
5. Vérifier qualité : ingrédients > 8, instructions > 5 (pire que Zod v4 = échec)

## Rollback

```bash
# Revenir à Gemini
LLM_PROVIDER=gemini
# Commenter ANTHROPIC_BASE_URL et ANTHROPIC_API_KEY*
```

GeminiProvider et ses 4 clés restent dans `.env.local` (commentées) et dans le code.
