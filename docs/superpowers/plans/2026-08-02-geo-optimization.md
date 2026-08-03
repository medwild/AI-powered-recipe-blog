# Plan d'optimisation GEO — Chef Augustin
> Audit : 2026-08-02 | Score actuel : 58/100 | Cible : 85/100

## État des lieux

Le code est déjà bien préparé : JSON-LD en `@graph`, SSR natif (Next.js App Router), box "Why This Recipe Works", dates Published/Modified, breadcrumbs, `Organization` + `WebSite` schema sur la homepage.

**Blocker critique** : toutes les pages `/recipes/*` retournent 500 en production. Le GEO est effectivement à zéro tant que ce n'est pas fixé.

---

## Phase 1 — Fix critique (30 min)

### 1.1 Debug et fix le 500 sur `/recipes/*`
- [ ] Vérifier les logs Vercel pour l'erreur
- [ ] `npx tsc --noEmit` pour écarter une erreur de compilation
- [ ] Vérifier la query `getRecipeBySlug` — possible regression DB
- [ ] Tester en local : `npm run dev` puis `curl localhost:3000/recipes/garlic-shrimp-orzo`
- [ ] Une fois fixé, vérifier que les pages recettes sont accessibles

---

## Phase 2 — Quick wins GEO (1h, +12 points estimés)

### 2.1 Ajouter les crawlers AI manquants dans `robots.ts`
**Fichier** : `app/robots.ts`
**Action** : Ajouter 3 règles explicites
```typescript
{ userAgent: "GPTBot", allow: "/" },
{ userAgent: "ClaudeBot", allow: "/" },
{ userAgent: "Google-Extended", allow: "/" },
```
**Pourquoi** : GPTBot (OpenAI/ChatGPT) et ClaudeBot (Anthropic/Claude) sont les 2 crawlers AI les plus importants. Google-Extended contrôle l'apparition dans AI Overviews. Sans règle explicite ils passent par la catch-all, mais une règle dédiée envoie un signal d'intention fort.

### 2.2 Créer `/llms.txt`
**Fichier** : `public/llms.txt` (servi statiquement)
**Template** :
```
# Chef Augustin
> Small-batch dinner recipes for two, grounded in French technique. 30+ tested recipes, no wasted ingredients.

## Recipes
- [Garlic Shrimp Orzo](https://www.chefaugustin.com/recipes/garlic-shrimp-orzo): One-pan 20-minute dinner
- [Summer Herb Chicken Orzo](https://www.chefaugustin.com/recipes/summer-herb-chicken-orzo): Quick summer pasta

## Techniques
- [Techniques](https://www.chefaugustin.com/techniques): French cooking techniques explained

## About
- [About Chef Augustin](https://www.chefaugustin.com/about): Chef, recipe developer, small-batch cooking advocate
```
**Pourquoi** : Google l'ignore officiellement, mais ChatGPT et Perplexity le lisent. Coût : 10 min. À maintenir manuellement ou via un script qui liste les derniers slugs.

### 2.3 Forcer `GPTBot` et `ClaudeBot` dans le sitemap via `robots.txt`
Vérifier que `Sitemap: https://www.chefaugustin.com/sitemap.xml` est bien présent dans `robots.ts` (il l'est déjà ✅).

---

## Phase 3 — Contenu citable (2h, +8 points estimés)

### 3.1 Ajouter un pattern "What is X?" dans l'intro des recettes
**Fichier** : `skills/chef-augustin-mega.md` (le mega-skill)
**Action** : Ajouter une instruction dans le prompt pour générer une définition autoportante en 40-60 mots dans le premier paragraphe.
**Template à injecter** :
```
OPEN WITH a self-contained definition (40-60 words): "[Dish name] is a [cuisine origin] [dish type] that [key technique/flavor]. [Why it matters for the home cook]."
```
**Pourquoi** : 44% des citations AI viennent du premier tiers de la page, et les définitions "X is..." sont le pattern de citation le plus fort. Voir référence : SE Ranking study (1.3M citations).

### 3.2 Vérifier que chaque recette a un bloc FAQ
Le `@graph` inclut `FAQPage`, donc le pipeline génère probablement déjà des FAQs. À vérifier sur 3 recettes après le fix du 500.
- [ ] Vérifier la présence de `## Frequently Asked Questions` dans `contentMarkdown` sur 3 recettes
- [ ] Si absent, ajouter l'instruction au mega-skill

### 3.3 Passages 134-167 mots optimisés pour la citation
**Action** : Vérifier que les sections "Why This Recipe Works" et les tips techniques font ~150 mots — c'est la longueur optimale pour être cité par les AI (SE Ranking).
- [ ] Auditer 5 recettes pour mesurer la longueur des blocs citables
- [ ] Ajuster le mega-skill si nécessaire

---

## Phase 4 — Autorité et brand (3h, +7 points estimés)

### 4.1 Créer/enrichir la page `/about`
**Fichier** : `app/about/page.tsx` (ou page Markdown si existante)
**Contenu requis pour le GEO** :
- [ ] Person schema avec `sameAs` vers Instagram, Pinterest, YouTube, LinkedIn
- [ ] Bio crédible : formation, expertise, publié dans...
- [ ] Photo de l'auteur
- [ ] Links vers les plateformes sociales
- [ ] `@id` stable pour l'entity reconciliation

### 4.2 Ajouter le markup `Person` sur chaque page article/recette
L'auteur est déjà lié dans le `BlogPosting` node du `@graph`. Vérifier :
- [ ] `author.url` pointe vers `/about`
- [ ] `author.name` = "Chef Augustin Lefèvre" (OK ✅)
- [ ] `author.@type` = "Person" (OK ✅)

### 4.3 Brand mentions — plan long terme
Actions qui prennent du temps mais rapportent gros :
- [ ] **YouTube** : la corrélation YouTube mentions → citations AI est la plus forte (0.737). Publier 1 vidéo/semaine.
- [ ] **Wikipedia** : entité Wikidata pour "Chef Augustin" (prérequis pour Wikipedia)
- [ ] **Reddit** : participer à r/Cooking, r/recipes, r/dinners — les citations Reddit sont le 2e plus fort signal pour ChatGPT (11.3%) et Perplexity (46.7%)

---

## Phase 5 — Multi-modal (optionnel, +3 points)

- [ ] Ajouter une vidéo YouTube embed sur les recettes phares
- [ ] Créer une infographie "technique" pour les articles techniques (saisie, sauces, etc.)
- [ ] Ajouter un calculateur de portions (outil interactif)

---

## Récapitulatif

| Phase | Effort | Gain GEO | Priorité |
|-------|--------|----------|----------|
| 1. Fix 500 | 30 min | Critique | 🔴 P0 |
| 2. Quick wins | 1h | +12 pts | 🟡 P1 |
| 3. Contenu citable | 2h | +8 pts | 🟡 P1 |
| 4. Autorité/Brand | 3h | +7 pts | 🟢 P2 |
| 5. Multi-modal | 2h | +3 pts | 🔵 P3 |

**Score cible après phases 1-4** : 58 → 85/100

---

## Notes

- Le pipeline mega-skill génère déjà du JSON-LD de qualité — ne pas toucher à ça
- Les social links (Instagram, Pinterest, YouTube) sont déjà dans le `Organization` schema
- Le site est en anglais, cible US/UK/CA/AU — cohérent avec la stratégie AI search
- `llms.txt` est optionnel selon Google mais les autres moteurs AI le consomment
