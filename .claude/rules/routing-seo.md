# Règles Routing & SEO — NON-NEGOTIABLE

> **Priorité maximale.** Ces règles garantissent la conformité SEO et le bon fonctionnement du blog.
> Toute modification du code doit les respecter. En cas de doute, lire ce fichier d'abord.

---

## 1. Architecture de routing — INTouchable

### 1.1 Routes explicites uniquement

Le site utilise des **routes explicites**, PAS de segments dynamiques catch-all.

```
Structure correcte :
  app/recettes/[slug]/page.tsx     → recettes (content_type = "recipe")
  app/techniques/[slug]/page.tsx   → articles techniques
  app/guides/[slug]/page.tsx       → articles guides
  app/histoire/[slug]/page.tsx     → articles histoire
  app/equipement/[slug]/page.tsx   → articles équipement

INTERDIT :
  app/[category]/[slug]/page.tsx   → catch-all greedy — matcherait /articles/..., /foo/...
  app/articles/[slug]/page.tsx     → "articles" n'est pas une catégorie, c'est le content_type
```

### 1.2 URLs publiques (19 routes)

| Pattern | Content Type | Exemple |
|---|---|---|
| `/` | Homepage | — |
| `/recettes` | Liste des recettes | — |
| `/recettes/{slug}` | Page recette | `/recettes/sourdough-discard-flatbread` |
| `/techniques` | Liste articles techniques | — |
| `/techniques/{slug}` | Article technique | `/techniques/science-maillard-reaction` |
| `/guides` | Liste guides | — |
| `/guides/{slug}` | Article guide | `/guides/flour-types-guide` |
| `/histoire` | Liste histoire | — |
| `/histoire/{slug}` | Article histoire | — |
| `/equipement` | Liste équipement | — |
| `/equipement/{slug}` | Article équipement | — |
| `/about` | Page auteur | — |
| `/dashboard` | Studio éditorial (protégé) | — |
| `/login` | Login dashboard | — |

### 1.3 URL qui NE doivent PAS exister

- `/articles/...` — Pas de route. "articles" est un content_type, pas une catégorie.
- `/category/...` — Pas de route.
- `/blog/...` — Pas de route.
- Tout segment dynamique non listé en §1.2.

### 1.4 Catégories valides

```typescript
const VALID_CATEGORIES = ["techniques", "guides", "histoire", "equipement"]
```

Ajouter une catégorie nécessite :
1. Créer `app/{category}/page.tsx`
2. Créer `app/{category}/[slug]/page.tsx`
3. Mettre à jour ce fichier rules

---

## 2. Séparation content_type — INTouchable

### 2.1 Deux types de contenu

| content_type | URL | Composant card | Query function |
|---|---|---|---|
| `"recipe"` | `/recettes/{slug}` | `RecipeCard` | `getRecipeBySlug()`, `getPublishedRecipes()` |
| `"article"` | `/{category}/{slug}` | `ArticleCard` | `getArticleBySlug()`, `getPublishedArticles()` |

### 2.2 Règles de filtrage dans les queries

**TOUJOURS** filtrer par `content_type` dans les queries publiques :

```typescript
// ✅ CORRECT
getPublishedRecipes()    → WHERE content_type = 'recipe' AND status = 'published'
getPublishedArticles()   → WHERE content_type = 'article' AND status = 'published'
getRecipeBySlug(slug)    → WHERE slug = X AND content_type = 'recipe'
getArticleBySlug(slug)   → WHERE slug = X AND content_type = 'article'

// ❌ INTERDIT — retournerait des articles dans la page recette = 404
getRecipeBySlug(slug)    → WHERE slug = X   // sans content_type !
```

**Raison** : Sans le filtre `content_type`, un article peut être servi par la page recette → `/recettes/{article-slug}` → `notFound()` → page d'erreur.

### 2.3 Composants card

```typescript
// ✅ RecipeCard → utilisé UNIQUEMENT pour les recettes
<RecipeCard recipe={r} />   // href = /recettes/{r.slug}

// ✅ ArticleCard → utilisé UNIQUEMENT pour les articles
<ArticleCard article={a} />  // href = /{a.category}/{a.slug}

// ❌ INTERDIT — un ArticleCard ne doit JAMAIS pointer vers /recettes/...
// ❌ INTERDIT — un RecipeCard ne doit JAMAIS pointer vers /{category}/...
```

---

## 3. Contraintes SEO — Validation avant publication

### 3.1 ContentValidator (lib/content-validator.ts)

Le ContentValidator est le **dernier rempart** avant publication. Il s'exécute dans `persist-phase.ts` pour les recettes.

**Checks bloquants (error)** :
- Banned words Tier 1 (22 termes : "delve", "robust", "elevate", "transform", etc.)
- Internal vibe tokens (`[WARM]`, `<!--GLOW-->`, etc.)
- Word count < 1500
- Title vide
- Ingrédients vides (recettes uniquement)
- Instructions vides (recettes uniquement)
- Health claims non sourcés (probiotics, digestibility, immunity, detox, etc.)

**Checks non-bloquants (warning)** :
- Word count < 1800
- Meta title > 60 chars
- Meta description < 120 ou > 155 chars

### 3.2 Banned Words Tier 1 — Ne jamais retirer de cette liste

```
"delve", "dive into", "unlock", "unleash", "elevate", "transform",
"embark", "journey", "in today's world", "it's worth noting that",
"moreover", "furthermore", "robust", "holistic", "paradigm", "synergy",
"game-changer", "leverage", "utilize", "nestled",
"bursting with flavor", "melts in your mouth"
```

### 3.3 Health claims — Bloqués sans source

Ces patterns sont **bloqués automatiquement** :
- `probiotics` / `probiotic`
- `improves digestion` / `improves digestibility`
- `gut health` / `digestive health`
- `boosts immune system` / `strengthens immune`
- `detox` / `detoxifying`
- `anti-inflammatory`
- `fat-burning`
- `lowers blood pressure` / `lowers cholesterol`
- `prevents cancer` / `prevents heart disease` / `prevents diabetes`

### 3.4 FAQ — Pas de bonus SEO

Google a **retiré les FAQ rich results en mai 2026**. La FAQ garde une valeur utilisateur mais :
- Ne pas scorer la FAQ comme avantage SEO
- FAQPage dans le JSON-LD est optionnel, pas obligatoire
- Minimum 3 questions (pas 5)
- Les questions doivent venir de PAA réels ou de besoins utilisateur réels

### 3.5 Meta titles — Réécriture naturelle

- **JAMAIS** de truncate mécanique (`substring(0, 57) + "…"`) comme solution principale
- Le truncate est un **fallback**, pas la règle
- L'Editor doit réécrire naturellement sous 60 chars
- Logger un warning quand le fallback est utilisé

### 3.6 JSON-LD Integrity

- Les données JSON-LD doivent être **visibles dans le contenu de la page**
- Pas de nutrition dans le JSON-LD sans section nutrition dans le markdown
- Pas d'auteur dans le JSON-LD sans mention dans le contenu
- Recipe schema UNIQUEMENT pour les pages avec ingrédients + instructions visibles

---

## 4. Base de données — Queries

### 4.1 Fonctions dans lib/queries.ts

| Fonction | Filtre content_type | Usage |
|---|---|---|
| `getPublishedRecipes()` | `"recipe"` | Homepage, /recettes |
| `getPublishedArticles()` | `"article"` | Homepage section articles |
| `getRecipeBySlug(slug)` | `"recipe"` | Page /recettes/[slug] |
| `getArticleBySlug(slug)` | `"article"` | Pages /{category}/[slug] |
| `getRelatedRecipes(id, tags)` | `"recipe"` | Sidebar recettes liées |
| `getLinkedArticle(recipeId)` | `"article"` | Cross-link recette→article |
| `getRelatedForArticle(linkedId)` | `"recipe"` (others) | Sidebar article→recettes |
| `getAllRecipes()` | aucun (dashboard) | Dashboard admin |
| `getRecipeById(id)` | aucun (dashboard) | Dashboard admin |

### 4.2 getRelatedForArticle — Attention

```typescript
// Le résultat "linked" N'EST PAS filtré par content_type.
// Il doit TOUJOURS pointer vers une recette (linked_content_id = recipe.id).
// Si linked_content_id pointe vers un article → RecipeCard → /recettes/{article-slug} → 404.
const linked = await db.select().from(recipes).where(eq(recipes.id, linkedRecipeId)).limit(1)
```

---

## 5. Pipeline — Flux de génération

### 5.1 Ordre des steps (NE JAMAIS CHANGER)

```
SERP → Strategist → Writer → Auditor → Human Review → Editor/QA Loop → Image → Persist → A/B Stats → AOR Article
```

### 5.2 Contrats inter-agents (NE JAMAIS ROMPRE)

- Writer v6.2 ne génère PAS `imagePrompt` → Image Optimizer le crée
- Editor v5.2 n'attend pas `imagePrompt` dans son schéma
- QA Check 4 n'exige plus `imagePrompt`
- Auditor reçoit l'article complet (pas de troncature)
- Strategist limite à 10 leçons max

### 5.3 ContentValidator — Où il s'exécute

- ✅ `persistFinalDraft()` — pour les RECETTES
- ❌ NE s'exécute PAS pour les articles AOR — gap connu, à corriger

---

## 6. Composants — Usage correct

### 6.1 RecipeCard
```typescript
// UNIQUEMENT pour des objets de type content_type = "recipe"
import { RecipeCard } from "@/components/recipe-card"
<RecipeCard recipe={recipe} />
// Génère : href="/recettes/{recipe.slug}"
```

### 6.2 ArticleCard
```typescript
// UNIQUEMENT pour des objets de type content_type = "article"
import { ArticleCard } from "@/components/article-card"
<ArticleCard article={article} />
// Génère : href="/{article.category}/{article.slug}"
```

### 6.3 CategoryListing
```typescript
// Composant partagé pour les pages /techniques, /guides, /histoire, /equipement
import { CategoryListing } from "@/components/category-listing"
<CategoryListing category="techniques" />
```

### 6.4 ArticleDetail
```typescript
// Composant partagé pour les pages /{category}/[slug]
import { ArticleDetail } from "@/components/article-detail"
<ArticleDetail slug={slug} />
```

---

## 7. Sitemap & SEO technique

### 7.1 URLs dans le sitemap

Le sitemap (`app/sitemap.ts`) doit inclure :
- Toutes les recettes publiées → `/recettes/{slug}`
- Tous les articles publiés → `/{category}/{slug}`
- Pages statiques : `/`, `/recettes`, `/about`, `/techniques`, `/guides`

### 7.2 Canonical URLs

- Recette : `https://chefaugustin.com/recettes/{slug}`
- Article : `https://chefaugustin.com/{category}/{slug}`
- Homepage : `https://chefaugustin.com/`

### 7.3 JSON-LD par type de page

| Page | @type principal | @graph nodes |
|---|---|---|
| Recette | Recipe | Recipe + BlogPosting + FAQPage (optionnel) + BreadcrumbList |
| Article | Article | Article + FAQPage (optionnel) + BreadcrumbList |
| Homepage | WebSite + Organization | — |

---

## 8. Règles anti-régression

### 8.1 Avant toute modification du routing

- [ ] Vérifier que la nouvelle route ne crée pas de conflit avec une route existante
- [ ] Vérifier que `content_type` est filtré dans les queries
- [ ] Vérifier que les composants card utilisent le bon pattern d'URL
- [ ] Tester : toutes les URLs existantes retournent 200
- [ ] Tester : `/articles/test`, `/foo/bar` retournent 404
- [ ] `npx tsc --noEmit` doit passer

### 8.2 Avant toute modification du ContentValidator

- [ ] Ne jamais retirer un mot de la liste Tier 1 sans discussion explicite
- [ ] Ne jamais retirer un pattern de health claim sans discussion explicite
- [ ] Ajouter un test pour chaque nouvelle règle

### 8.3 Avant toute modification des skills

- [ ] Vérifier les contrats inter-agents (§5.2)
- [ ] Ne pas changer le format de sortie sans mettre à jour TOUS les consommateurs
- [ ] Relire le skill modifié — c'est un system prompt LLM, pas du code

### 8.4 Après toute modification

```bash
npx tsc --noEmit          # Type check
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/  # Homepage 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/articles/test  # Doit être 404
```

---

## 9. Fichiers clés — Responsabilités

| Fichier | Rôle | Modifiable ? |
|---|---|---|
| `app/recettes/[slug]/page.tsx` | Page recette | Oui, avec précautions |
| `app/techniques/[slug]/page.tsx` | Page article technique | Oui, mais le pattern est partagé |
| `components/article-detail.tsx` | Composant partagé article | Impacte 4 routes |
| `components/category-listing.tsx` | Composant partagé listing | Impacte 4 routes |
| `components/recipe-card.tsx` | Card recette | NE PAS changer le href |
| `components/article-card.tsx` | Card article | NE PAS changer le href |
| `lib/queries.ts` | Toutes les queries DB | Ne pas retirer les filtres content_type |
| `lib/content-validator.ts` | Validation pré-publication | Ajouts uniquement, pas de retraits |
| `lib/inngest/functions/steps/persist-phase.ts` | Sauvegarde finale | Contient le ContentValidator |

---

## 10. Erreurs courantes à ne pas reproduire

1. **Créer une route catch-all** → `[category]` matche tout → 200 sur des URLs invalides
2. **Oublier le filtre content_type** dans une query → un article servi comme recette → 404
3. **Utiliser RecipeCard pour un article** → mauvais href → 404
4. **Truncate mécanique des meta titles** → titres cassés → mauvais SEO
5. **Claims santé sans source** → "contains probiotics" dans du pain cuit → erreur factuelle
6. **FAQ scorée comme avantage SEO** → Google a retiré les FAQ rich results en 2026
7. **Même keyword pour recette et article** → cannibalisation SEO
