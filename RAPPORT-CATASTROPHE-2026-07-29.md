# Rapport d'Analyse — Session Catastrophique du 28 Juillet 2026

> **Rôle:** Analyse Karpathy — chirurgicale, basée sur les preuves, pas de suppositions.
> **Date:** 2026-07-29
> **Référence:** HEAD = `aa1b6b3` (dernier commit stable = kie.ai provider)

---

## Résumé Exécutif

15 fichiers modifiés, 3 secrets exposés, 1 fichier critique corrompu. La session du 28/07 a laissé le repo dans un état **instable et dangereux** — des clés API sont exposées dans le code source et les headers de sécurité ont été supprimés.

---

## 🔴 CRITICAL — Secrets exposés (à révoquer immédiatement)

| # | Fichier | Secret | Type | Action |
|---|---|---|---|---|
| 1 | `claude-settings.json` (working) | `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` | NVIDIA API key | **Révoquer + Restaurer** |
| 2 | `.idx/dev.nix` (working) | `sk-d45ca42e6b2c47439e25ffb7dc87679a` | DeepSeek API key | **Révoquer + Restaurer** |
| 3 | `lib/agents/provider.ts:252` (working) | `sk-tm-sL17i59qHfMTviVnAneUtaZ1PL753sISpKmstUTnmFymMnfe` | Tokenmix API key | **Révoquer + Fix code** |
| 4 | `claude-settings.json` (HEAD) | `sk-076f968d304e40c1aa8d65cfb24c6aae` | DeepSeek API key | **Déjà commité — révoquer + nettoyer l'historique** |

> ⚠️ **URGENCE:** Les clés #1, #2, #3 sont dans le working tree. La clé #4 est déjà dans l'historique git (commit `aa1b6b3`). Toutes doivent être révoquées côté provider AVANT tout commit correctif.

---

## 🟠 BREAKING — Fichiers corrompus (restauration obligatoire)

### 1. `next.config.mjs` — **Restauration complète requise**

Ce qui a été DÉTRUIT :
- **Headers de sécurité supprimés**: CSP, HSTS (`max-age=63072000; includeSubDomains; preload`), X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), Referrer-Policy
- **Optimisation images dégradée**: `formats: ["image/avif", "image/webp"]`, `deviceSizes`, `imageSizes` supprimés
- **allowedDevOrigins supprimé**: Cloud Workstations dynamic ports cassés
- **Redirect /recettes/ → /recipes/ supprimé**: SEO cassé — les anciennes URLs ne redirigent plus
- **rewrites supprimé**
- Ajouts parasites: `reactStrictMode: false`, patterns `fbcdn.net`/`cdninstagram.com`, redirect `/admin→/dashboard`, config turbo, `optimizeFonts`, commentaires en portugais

**Impact production:** Les pages servies n'auront PLUS de headers de sécurité. Le site est vulnérable au clickjacking et aux injections XSS. Le SEO des anciennes URLs (/recettes/) est cassé.

### 2. `.env.example` — **Restauration complète requise**

Passé de 117 → 46 lignes. Documentation perdue :
- Configuration ZenMux/FlatKey détaillée
- Options Cloudflare Workers AI
- Variables Cloudinary
- Variables Inngest
- Configuration SERP géographique
- Debug flags
- Tous les commentaires explicatifs

---

## 🟡 MODIFIED — Changements légitimes à conserver (avec fix)

### 3. `lib/agents/provider.ts` — **Fix partiel requis**

**Changements légitimes (garder):**
- `NvidiaProvider` (lignes 322-396): Provider OpenAI-compatible pour NVIDIA NIM — utile
- `TokenmixProvider` (lignes 243-316): Provider alternatif — utile

**Bug critique (fixer):**
- Ligne 252: `throw new Error("sk-tm-sL17i59qHfMTviVnAneUtaZ1PL753sISpKmstUTnmFymMnfe")` → doit être `throw new Error("TOKENMIX_API_KEY must be set.")`

**Changements cosmétiques (garder — simplification Karpathy):**
- Commentaires supprimés dans le constructeur AnthropicProvider — acceptable

### 4. `lib/seo/gate.ts` — **Garder (feature legitimate)**

- Ajout W7: `checkFAQPage()` — vérifie la présence d'un nœud FAQPage dans le JSON-LD
- Renumérotation W7→W8, W8→W9
- 16 critères au lieu de 15

### 5. `lib/skills.ts` — **Garder (feature legitimate)**

- `extractFAQFromMarkdown()`: Extraction extractive de Q&A depuis le markdown
- `buildFAQPageNode()`: Construction du nœud Schema.org FAQPage
- `ensureFAQPage()`: Logique de preservation/remplacement

### 6. `lib/pipeline/agents/chef-augustin.ts` — **Garder (feature legitimate)**

- Import de `ensureFAQPage`
- Appel dans `recipeArticleToChefAugustinOutput()` → enrichit le JSON-LD avec FAQPage

### 7. `scripts/test-seo-gate.ts` — **Garder (feature legitimate)**

- Ajout d'un nœud FAQPage dans les données de test

---

## 🟢 NEW FILES — Fichiers à évaluer

| Fichier | Utilité | Verdict |
|---|---|---|
| `__tests__/skills.test.ts` | Tests pour FAQPage extraction — 256 lignes, 13 tests | ✅ **Garder** — tests propres et utiles |
| `scripts/test-nvidia-api.ts` | Test rapide du provider NVIDIA | ⚠️ **Garder ou supprimer** — utilitaire de debug |
| `scripts/run-test.ts` | Runner avec dotenv — wrapper inutile | ❌ **Supprimer** — complexité inutile, `dotenv -e` existe |
| `mcp/.gitkeep` | Placeholder vide pour futur MCP | ⚠️ **Garder** — inoffensif |

---

## 🟡 MODIFIED — Changements mineurs à reviewer

| Fichier | Changement | Verdict |
|---|---|---|
| `package.json` | Scripts `proxy`, `claude`, lint `eslint`→`next lint` | ⚠️ **Review** — `next lint` est le standard Next.js |
| `scripts/eval-recipe.ts` | `override: true` dans dotenv | ⚠️ **Garder** — évite les conflits de vars |
| `scripts/smoke-test-single.ts` | `override: true` dans dotenv | ⚠️ **Garder** — cohérent |
| `.gitignore` | Exclusion `claude-nvidia-proxy/` | ✅ **Garder** — sécurité |
| `.idx/dev.nix` | Changement de clé DeepSeek (modèle `[1m]`) | 🔴 **Restaurer** — clé exposée |
| `next-env.d.ts` | `.next/types` → `.next/dev/types` | ⚠️ **Probablement OK** — Next.js dev vs prod |
| `tsconfig.tsbuildinfo` | Cache TypeScript regénéré | ✅ **Ignorer** — fichier généré |
| `claude-settings.json` | Structure complètement changée | 🔴 **Restaurer** — clé NVIDIA exposée |

---

## 📋 Plan de Restauration (ordre d'exécution)

### Phase A: Sécurité — RÉVOQUER LES CLÉS (À FAIRE EN PREMIER)

```
1. NVIDIA:    Révoquer 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
2. DeepSeek:  Révoquer sk-d45ca42e6b2c47439e25ffb7dc87679a (dev.nix)
3. Tokenmix:  Révoquer sk-tm-sL17i59qHfMTviVnAneUtaZ1PL753sISpKmstUTnmFymMnfe
4. DeepSeek:  Révoquer sk-076f968d304e40c1aa8d65cfb24c6aae (commitée dans HEAD)
```

### Phase B: Restauration des fichiers corrompus

```
1. next.config.mjs    → git checkout HEAD -- next.config.mjs
2. .env.example       → git checkout HEAD -- .env.example
3. .idx/dev.nix       → git checkout HEAD -- .idx/dev.nix (puis corriger la clé)
4. claude-settings.json → Restaurer structure originale SANS clé
```

### Phase C: Fix du bug provider.ts

```
Ligne 252: throw new Error("sk-tm-...") → throw new Error("TOKENMIX_API_KEY must be set.")
```

### Phase D: Nettoyage

```
1. Supprimer scripts/run-test.ts
2. Décider du sort de scripts/test-nvidia-api.ts
3. Vérifier: npx tsc --noEmit
```

### Phase E: Vérification post-restauration

```
1. npx tsc --noEmit doit passer
2. Tests SEO gate: npx tsx scripts/test-seo-gate.ts
3. Tests skills: npx vitest run __tests__/skills.test.ts
4. git diff HEAD --stat → vérifier que SEULS les changements légitimes restent
```

---

## 📊 État du Pipeline (contexte mémoire)

Le pipeline v14.2 est **fonctionnel** avec 10 recettes publiées. Le dernier état stable:

- **Provider:** kie.ai (3 clés, rotation automatique)
- **Modèle recommandé:** `claude-sonnet-5` (Opus 4.8 instable — 500 errors)
- **Skills:** Mega-skill unique (1 appel LLM au lieu de 6 agents)
- **Quality Gate:** 4 checks binaires (duplicate, USDA, word count, banned words)
- **Images:** Ideogram 4 via template-based generator
- **SEO:** /recipes/ (EN), 301 depuis /recettes/

---

## ⚡ Karpathy Truth

> "The diff tells the truth. 658 lines deleted, 320 added. The deletions are the problem — they removed security headers, documentation, and image optimization that took weeks to tune. The additions (FAQPage, NvidiaProvider) are mostly noise — useful but not worth the damage. This is a classic 'move fast and break things' session where the things that broke were invisible (security, SEO, docs) and the things that were added are visible but trivial. Restore the invisible things first."

---

*Rapport généré le 2026-07-29 — Action requise: Phase A (révocation clés) immédiatement.*
