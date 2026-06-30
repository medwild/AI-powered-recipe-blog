# Spec — Agent Aor Article Generator

> **Date :** 2026-06-30
> **Version :** 1.0
> **Statut :** Prêt pour implémentation
> **Contexte :** Post-stabilisation pipeline — ajout de contenu Aor (Outer Section) pour la Topical Authority

## 1. Résumé

Ajout d'un Step 13 optionnel au pipeline Inngest existant. Ce step génère un article de blog (Aor) à partir d'une recette fraîchement générée, couvrant un angle orthogonal (technique, histoire, guide ingrédient, équipement). L'article est lié à la recette via maillage interne automatique avec ancres enrichies.

**1 seul nouvel agent IA** (`aor-writer.ts`), **pas de pipeline séparé**, **pas de refacto du pipeline existant**.

---

## 2. Motivation SEO

### 2.1 Topical Authority (Koray Tuğberk GÜGÜR)

L'équation `Topical Authority = Couverture Topique × Données Historiques` exige une section Aor (Outer Section) qui enrichit le site en contenu périphérique :

- **Concepts et Techniques** → `/techniques/`
- **Histoire et Culture** → `/histoire/`
- **Guides Ingrédients** → `/guides/`
- **Équipement** → `/equipement/`

### 2.2 Maillage Aor → Core

Le flux d'autorité sémantique suit un schéma asymétrique :

```
Aor Section (articles techniques/histoire/guides)
    │
    │ Lien textuel contextuel avec ancre riche
    ▼
Core Section (pages recettes)
```

### 2.3 Contenu orthogonal (anti-duplicate)

L'article Aor **ne répète jamais** la recette. Il couvre un angle que la recette ne couvre pas : science, histoire, analyse d'ingrédients, ou recommandation d'équipement.

---

## 3. Architecture

### 3.1 Position dans le pipeline

```
Étapes 1-12 (inchangées) :
SERP → Structurer → Strategist → Writer → Auditor → Review → Editor → QA
→ ImgPrompt → ImgGen → Self-Improve → Persist → A/B Tracking

Step 13 (NOUVEAU) :
agent-6-aor-article (optionnel)
```

| Propriété | Valeur |
|---|---|
| Déclenchement | Paramètre `generateAorArticle: true` dans le body de `POST /api/recipes/generate` |
| Timing | Après Step 12 (Persist + A/B terminés) |
| Input | Recette générée + SeoPlan + StructuredSerp + `aorCategory` + `aorAngle` |
| Output | Article Aor persisté + lien bidirectionnel injecté |
| Fallback | `warning` — la recette est déjà persistée, l'article est un bonus |

### 3.2 Flux de données

```
Recipe (persisted) ──┐
SeoPlan              ├──→ Aor Writer Agent ──→ AorArticle
StructuredSerp       │         │
aorCategory + angle ─┘         │
                               ▼
                     Image Prompt Optimizer
                     (réutilise agent existant, prompt adapté)
                               │
                               ▼
                     FLUX-1-Schnell → Cloudinary
                               │
                               ▼
                     Semantic Linker
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
              Article reçoit       Recette reçoit
              lien → recette       lien → article
```

---

## 4. Agent Aor Writer

### 4.1 Runtime

**Fichier :** `lib/inngest/functions/agents/aor-writer.ts`

```typescript
// Input
type AorWriterInput = {
  keyword: string
  recipeTitle: string
  recipeSlug: string
  recipeUrl: string              // URL canonique de la recette
  seoPlan: SeoPlan               // Plan SEO du Strategist
  serp: StructuredSerp           // Données SERP structurées
  aorCategory: "techniques" | "guides" | "histoire" | "equipement"
  aorAngle: string | null        // Angle éditorial précis. Si null, l'agent déduit depuis SeoPlan.content_opportunities
}

// Output
type AorArticle = {
  title: string                  // H1 de l'article
  slug: string                   // slug pour l'URL
  category: string               // techniques | guides | histoire | equipement
  metaTitle: string              // <title> (peut différer du H1)
  metaDescription: string        // <meta description>
  contentMarkdown: string        // Article complet en Markdown
  excerpt: string                // Extrait 1-2 phrases
  linkedRecipeSlug: string       // Slug de la recette source
  linkedRecipeTitle: string      // Titre de la recette source
  anchorText: string             // Texte d'ancre enrichi pour le lien article→recette
  tags: string[]
  jsonLd: Record<string, unknown> // Article + FAQPage + BreadcrumbList
}
```

### 4.2 Skill prompt

**Fichier :** `skills/agent-aor-writer.md`

Règles critiques encodées dans le system prompt :

| Règle | Description |
|---|---|
| **CRITICAL OUTPUT RULE** | No reasoning or analysis. Start with `{`, end with `}`. Pure JSON output ONLY. |
| **ORTHOGONALITÉ** | Ne pas répéter les ingrédients, étapes, ou instructions de la recette |
| **ANGLE UNIQUE** | Couvrir la science, l'histoire, ou la technique DERRIÈRE la recette |
| **ANCRE RICHE** | Produire UN lien contextuel Aor→Recette avec une phrase naturelle |
| **TON PÉDAGOGIQUE** | Voix d'expert qui explique le "pourquoi", pas de "moi je" narratif |
| **LONGUEUR** | 800-1200 mots (plus court que les recettes 1800-2200 mots) |
| **STRUCTURE** | H2 de type informatif, pas de "Ingredients" ni "Instructions" |

### 4.3 Contenu attendu par catégorie

| Catégorie | Ce que l'agent produit |
|---|---|
| `techniques` | Explication scientifique + application pratique. Ex: "La réaction de Maillard — pourquoi 190°C est la température magique" |
| `guides` | Guide exhaustif sur un ingrédient. Ex: "Farines T45 à T150 — laquelle choisir pour quelle utilisation" |
| `histoire` | Narration culturelle sourcée. Ex: "Du croissant viennois au croissant français — 300 ans d'histoire" |
| `equipement` | Analyse comparative + recommandation. Ex: "Rouleau à pâtisserie — bois, marbre ou silicone ?" |

### 4.4 Modèle LLM

- **Primaire :** NaraRouter (Mistral Medium 3.5)
- **Fallback :** Cloudflare Gemma 4 26B
- **maxTokens :** 6144 (headroom pour article 800-1200 mots + skill ~400 lignes — évite l'épuisement token sur fallback Cloudflare, leçon de l'Auditor fix)
- **temperature :** 0.4

---

## 5. Semantic Linker

### 5.1 Injection de liens

Au persist de l'article (Step 13), le linker :

1. Cherche dans `contentMarkdown` de l'article un emplacement naturel (milieu de contenu, après un H2)
2. Injecte une phrase de transition avec ancre enrichie pointant vers la recette
3. Inverse : exécute un **UPDATE SQL** sur la recette (déjà persistée au Step 11) pour ajouter une mention dans une section "Pour aller plus loin" pointant vers l'article

### 5.2 Règles

| Règle | Valeur |
|---|---|
| Nombre de liens | 1 article→recette (principal), 1 recette→article (secondaire) |
| Position | Corps du texte (pas footer/sidebar) |
| Format ancre | Phrase complète enrichie sémantiquement |
| Interdit | "cliquez ici", "voir la recette", "lire plus" |

### 5.3 Exemple d'ancre

```
Article → Recette :
"Cette réaction est au cœur de [notre recette du croissant parfait](/recettes/croissant),
où chaque détail de température a été calibré pour une croûte dorée et feuilletée."

Recette → Article :
"Pour comprendre la science derrière cette température, consultez 
[notre guide sur la réaction de Maillard](/techniques/reaction-maillard-cuisson)."
```

---

## 6. Template page article

### 6.1 Route

**Fichier :** `app/[category]/[slug]/page.tsx`

### 6.2 Image hero

L'article Aor génère sa **propre image via FLUX-1-Schnell** (Cloudflare Workers AI), en utilisant le même Image Prompt Optimizer que les recettes. Le prompt image est dérivé de l'angle Aor (ex: "Une photo culinaire professionnelle illustrant la réaction de Maillard sur une croûte de croissant doré, éclairage studio, profondeur de champ réduite").

**Flow :** Aor Writer output → Image Prompt Optimizer (adapté pour angle article) → FLUX-1-Schnell → Cloudinary upload → `heroImageUrl` stocké.

### 6.3 Structure de la page

```
┌─────────────────────────────┐
│  Breadcrumb                  │
│  Home > Techniques > Titre   │
├─────────────────────────────┤
│  Hero Image (FLUX-1 generated)   │
├─────────────────────────────┤
│  H1 + Meta info              │
│  (auteur, date, lecture)     │
├─────────────────────────────┤
│  Contenu Markdown            │
│  (avec lien Aor→Core inclus) │
├─────────────────────────────┤
│  Recettes associées          │
│  (1-2 recettes liées)        │
└─────────────────────────────┘
```

### 6.4 Métadonnées

```typescript
// generateMetadata()
{
  title: article.metaTitle,
  description: article.metaDescription,
  alternates: { canonical: `/${article.category}/${article.slug}` },
  openGraph: {
    title: article.metaTitle,
    description: article.metaDescription,
    type: "article",
    images: [article.heroImageUrl],
  },
}
```

---

## 7. JSON-LD différencié

### 7.1 Article Aor

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "#article",
      "headline": "La réaction de Maillard — pourquoi 190°C est la température magique",
      "description": "Comprendre la chimie derrière la croûte dorée...",
      "author": {
        "@type": "Person",
        "name": "Chef Augustin Lefèvre",
        "url": "https://lecarnetgourmand.fr/about"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Le Carnet Gourmand",
        "url": "https://lecarnetgourmand.fr"
      },
      "datePublished": "2026-06-30T...",
      "dateModified": "2026-06-30T...",
      "image": "https://res.cloudinary.com/...",
      "mainEntityOfPage": "https://lecarnetgourmand.fr/techniques/reaction-maillard-cuisson"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [...]
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://lecarnetgourmand.fr/" },
        { "@type": "ListItem", "position": 2, "name": "Techniques", "item": "https://lecarnetgourmand.fr/techniques" },
        { "@type": "ListItem", "position": 3, "name": "La réaction de Maillard", "item": "https://lecarnetgourmand.fr/techniques/reaction-maillard-cuisson" }
      ]
    }
  ]
}
```

**Pas de `Recipe`** dans le JSON-LD des articles. **`Article`** à la place de `BlogPosting` (plus riche, meilleur pour le contenu informatif).

### 7.2 Recette (corrigé — BlogPosting.mainEntity + publisher manquants)

Ajouter au JSON-LD existant des recettes :

```json
{
  "@type": "BlogPosting",
  "@id": "#blogposting",
  "mainEntity": { "@id": "#recipe" },
  "mainEntityOfPage": "https://lecarnetgourmand.fr/recettes/croissant",
  "publisher": {
    "@type": "Organization",
    "name": "Le Carnet Gourmand",
    "url": "https://lecarnetgourmand.fr"
  }
}
```

Et au nœud Recipe :

```json
{
  "@type": "Recipe",
  "@id": "#recipe"
}
```

---

## 8. Base de données

### 8.1 Colonnes ajoutées à `recipes`

| Colonne | Type | Description |
|---|---|---|
| `content_type` | `text().default("recipe")` | `"recipe"` ou `"article"` |
| `category` | `text()` | `null` pour recettes, `"techniques"` / `"guides"` / `"histoire"` / `"equipement"` pour articles |
| `linked_content_id` | `integer()` | ID du contenu lié (article→recette, ou recette→article) |

### 8.2 Utilisation de la table existante

Les articles utilisent la même table `recipes` (renommée logiquement en "content" dans le code, mais sans renommer la table physiquement — interdit par les règles DB). Le `content_type` différencie les lignes.

Les colonnes `ingredients`, `instructions`, `prepTime`, `cookTime`, `servings` sont `null` pour les articles. La colonne `heroImageUrl` est utilisée pour l'image générée par FLUX-1.

---

## 9. API

### 9.1 Endpoint de génération (modifié)

```typescript
POST /api/recipes/generate
Body: {
  "keyword": "croissant",
  "generateAorArticle": true,       // NOUVEAU — optionnel
  "aorCategory": "techniques",      // requis si generateAorArticle=true
  "aorAngle": "La réaction de Maillard à 190°C"  // optionnel — si absent, l'agent déduit l'angle automatiquement
}
```

### 9.2 Nouvelles routes

| Route | Méthode | Description |
|---|---|---|
| `/[category]/[slug]` | GET | Page article (SSR dynamique) |
| `/api/articles/raw` | GET | Liste tous les articles (raw) |
| `/api/articles/raw/[slug]` | GET | Article par slug (raw) |

---

## 10. Fichiers — récapitulatif

### Créés

| Fichier | Rôle |
|---|---|
| `lib/inngest/functions/agents/aor-writer.ts` | Runtime agent Aor Writer (~150 lignes) |
| `skills/agent-aor-writer.md` | System prompt Aor Writer (~400 lignes) |
| `app/[category]/[slug]/page.tsx` | Template page article SSR |
| `app/actions/articles.ts` | Server Actions (publish, delete article) |
| `app/api/articles/raw/route.ts` | API liste articles |
| `app/api/articles/raw/[slug]/route.ts` | API article par slug |

### Modifiés

| Fichier | Changement |
|---|---|
| `lib/inngest/functions/generate-recipe.ts` | + Step 13 + Semantic Linker injection |
| `lib/db/schema.ts` | + `content_type`, `category`, `linked_content_id` |
| `lib/queries.ts` | + `getArticleBySlug()`, + `getRelatedForArticle()` |
| `app/recettes/[slug]/page.tsx` | Correction JSON-LD: + `@id`, + `mainEntity`, + `mainEntityOfPage` sur BlogPosting |
| `app/sitemap.ts` | Ajouter les URLs articles |
| `middleware.ts` | Protéger `/[category]/[slug]` si nécessaire |

---

## 11. Contraintes de non-régression

- **Ne jamais renommer un step Inngest existant** (règle CLAUDE.md)
- **Ne pas modifier l'ordre des steps 1-12**
- **`npx tsc --noEmit` obligatoire** après toute modification
- **`npm run test:pipeline`** doit continuer à passer (8/8)
- **Le pipeline recette doit fonctionner sans `generateAorArticle`** (step 13 conditionnel)
- **Pas de renommage de la table `recipes`** (règle DB)

---

## 12. Critères de succès

1. Génération d'une recette SANS `generateAorArticle` → pipeline inchangé, 12 steps, recette persistée
2. Génération d'une recette AVEC `generateAorArticle: true` → 13 steps, recette + article persistés, lien bidirectionnel injecté
3. L'article Aor ne contient PAS d'ingrédients, d'étapes, ni de duplication du contenu de la recette
4. Le lien article→recette utilise une ancre enrichie (pas "cliquez ici")
5. Le JSON-LD de l'article utilise `Article` (pas `Recipe`, pas `BlogPosting`)
6. Le JSON-LD de la recette a `BlogPosting.mainEntity` pointant vers `#recipe`
7. `npm run test:pipeline` passe (8/8)
8. `npx tsc --noEmit` passe
