# Super Prompt — Audit Front-End v0 vs Spec Chef Augustin

> **Donne ce prompt à Claude Code dans le dossier du projet généré par v0.**
> Il va lire chaque fichier, le comparer à notre spec, et produire un rapport d'alignement.

---

## Contexte

Tu es un auditeur front-end senior. Tu viens de recevoir un projet Next.js généré par v0 (AI builder). Ta mission : comparer ce code à une spec de référence ultra-précise et identifier TOUS les écarts.

**Document de référence :** Lis d'abord `docs/superpowers/specs/2026-07-20-frontend-vibecoding-prompt.md` (si pas présent, demande-le-moi).

**Rappel des standards clés :**
- Primary color: `#c2683f` (terracotta)
- Polices: Geist (UI) + Playfair Display (titres)
- Routes explicites uniquement — jamais de catch-all `[category]`
- Server Components par défaut, "use client" seulement si interactivité
- Composants shadcn/ui, icônes Lucide, Tailwind CSS 4

---

## Phase 1 — Inventaire (lis TOUS les fichiers)

Fais un inventaire complet du projet :

```
1. Liste TOUS les fichiers dans app/ (pages, layouts, routes)
2. Liste TOUS les fichiers dans components/ (composants partagés + ui)
3. Liste les fichiers de config (next.config, tailwind, tsconfig, package.json)
4. Vérifie la présence de : middleware.ts, globals.css
```

**Output attendu :** un arbre de projet complet avec 1 ligne par fichier.

---

## Phase 2 — Comparaison composant par composant

Pour CHAQUE composant listé ci-dessous, vérifie s'il existe et note l'écart :

### Composants obligatoires (spec §3)

| Composant | Attendu dans | Présent ? | Conformité |
|---|---|---|---|
| SiteHeader | components/site-header.tsx | | |
| SiteFooter | components/site-footer.tsx | | |
| RecipeCard | components/recipe-card.tsx | | |
| ArticleCard | components/article-card.tsx | | |
| Breadcrumbs | components/breadcrumbs.tsx | | |
| ThemeToggle | components/theme-toggle.tsx | | |
| CookieBanner | components/cookie-banner.tsx | | |
| JumpToRecipe (desktop+mobile) | components/jump-to-recipe.tsx | | |
| PinButton | components/pin-button.tsx | | |
| CookModeToggle | components/cook-mode-toggle.tsx | | |
| RecipeActionBar | components/recipe-action-bar.tsx | | |
| SkeletonCard | components/ui/skeleton.tsx | | |
| RecipeSearch | components/recipe-search.tsx | | |

### Pages obligatoires (spec §4)

| Page | Fichier attendu | Présente ? |
|---|---|---|
| Homepage (7 sections) | app/page.tsx | |
| Recipe Listing | app/recettes/page.tsx | |
| Recipe Detail (14 sections) | app/recettes/[slug]/page.tsx | |

### Composants page recette (spec §4.3)

| Composant | Attendu dans | Présent ? |
|---|---|---|
| RecipeHero | components/recipe-hero.tsx | |
| RecipeIngredients | components/recipe-ingredients.tsx | |
| RecipeInstructions | components/recipe-instructions.tsx | |
| RecipeArticleBody | components/recipe-article-body.tsx | |
| RecipeRelated | components/recipe-related.tsx | |

### Pages d'état

| Page | Fichier | Présente ? |
|---|---|---|
| Not Found | app/not-found.tsx | |
| Error | app/error.tsx | |
| Loading | app/loading.tsx | |

---

## Phase 3 — Vérification Design System

Ouvre `app/globals.css` ou le fichier de thème et vérifie :

```
[ ] Primary color = #c2683f (terracotta) — variable CSS --primary
[ ] Dark mode support — .dark { } avec variables overrides
[ ] Police Geist appliquée au body (font-sans)
[ ] Police Playfair Display appliquée aux titres (font-serif)
[ ] Classes personnalisées présentes:
    [ ] .card-hover { transition all 300ms ease }
    [ ] .card-hover:hover { box-shadow + border-color }
    [ ] @keyframes fade-in-up
    [ ] .animate-fade-in-up
    [ ] @media print { header, nav, footer cachés }
[ ] Prose styling configuré (prose-headings:font-serif, prose-a:text-primary)
```

Pour chaque composant, vérifie visuellement (lis le code) :

```
SiteHeader:
  [ ] sticky top-0 z-40
  [ ] bg-background/85 backdrop-blur
  [ ] Logo: rond bg-primary + ChefHat + texte
  [ ] Desktop nav: liens horizontaux visibles sur md:
  [ ] ThemeToggle présent

RecipeCard:
  [ ] rounded-2xl border overflow-hidden
  [ ] Image aspect-[4/3] avec next/image fill
  [ ] group-hover:scale-105 sur l'image
  [ ] PinButton en overlay top-right
  [ ] Badge difficulté en top-left
  [ ] Titre font-serif text-xl
  [ ] Footer avec Clock + Users icônes

RecipeHero:
  [ ] Hero image rounded-3xl shadow-2xl shadow-primary/10
  [ ] aspect-[3/2] md:aspect-[2/3]
  [ ] Badges row (speed, technique, dietary)
  [ ] H1 font-serif clamp
  [ ] Triple CTA row (Save, Jump to Recipe, Print, Cook Mode)
  [ ] "Why This Recipe Works" box avec dégradé from-primary/[0.06]
  [ ] Meta pills (Prep/Cook/Servings/Difficulty)

RecipeIngredients:
  [ ] id="ingredients-section" scroll-mt-20
  [ ] Carte rounded-3xl bg-card
  [ ] FOND PAPIER LIGNÉ: repeating-linear-gradient avec oklch
  [ ] Checkboxes visuels (ronds border-2)
  [ ] Ingrédients avec noms + quantités

RecipeInstructions:
  [ ] H2 "Instructions" font-serif text-2xl
  [ ] <ol> flex flex-col gap-8
  [ ] CHIFFRES FILIGRANE: absolute text-[7rem] text-primary/[0.04]
  [ ] Foreground number circles bg-primary

RecipeArticleBody:
  [ ] id="article-body" scroll-mt-20
  [ ] prose prose-lg prose-neutral max-w-none
  [ ] react-markdown + remark-gfm
  [ ] Custom components: h2/h3 font-serif, a text-primary underline
  [ ] Security: disallowedElements pour script/style/meta/img
```

---

## Phase 4 — Vérification Architecture

```
ROUTING:
  [ ] Aucune route catch-all (pas de [category], pas de [...slug])
  [ ] /articles/* n'existe PAS
  [ ] /blog/* n'existe PAS
  [ ] Les routes sont explicites

LAYOUT:
  [ ] app/layout.tsx avec fonts Geist + Playfair Display
  [ ] metadata (title template, description)
  [ ] metadataBase configuré
  [ ] viewport { colorScheme, themeColor }
  [ ] ThemeProvider de next-themes
  [ ] Skip-to-content link (sr-only focus:not-sr-only)

MIDDLEWARE:
  [ ] middleware.ts protège /dashboard
  [ ] Cookie dashboard_auth
  [ ] Matcher: ['/dashboard/:path*']

SERVER vs CLIENT:
  [ ] "use client" utilisé UNIQUEMENT quand nécessaire
  [ ] Pas de "use client" sur les composants purement visuels
  [ ] Les composants avec interactivité ont "use client"

SEO:
  [ ] app/sitemap.ts existe
  [ ] app/robots.ts existe
  [ ] generateMetadata() sur chaque page
  [ ] <time> avec dateTime ISO sur les dates
  [ ] Balises canonical sur toutes les pages
```

---

## Phase 5 — Rapport d'audit final

Synthétise dans un tableau à 4 colonnes :

| Sévérité | Fichier | Problème | Correction recommandée |
|---|---|---|---|
| 🔴 CRITICAL | chemin | Le problème (routing cassé, composant manquant, etc.) | Ce qu'il faut faire |
| 🟡 WARNING | chemin | Le problème (style incorrect, attribut manquant) | Ce qu'il faut faire |
| 🟢 INFO | chemin | Suggestion d'amélioration | Optionnel |

**Définition des sévérités :**
- 🔴 **CRITICAL** : composant obligatoire manquant, route invalide, couleur primaire fausse, police absente, pas de generateMetadata
- 🟡 **WARNING** : style incorrect mais fonctionnel, attribut aria manquant, mauvais aspect ratio, section dans le désordre
- 🟢 **INFO** : amélioration suggérée, optimisation, détail visuel mineur

---

## Phase 6 — Score d'alignement global

Donne un score sur 100 basé sur :

| Critère | Poids | Score | Notes |
|---|---|---|---|
| Composants présents | 25% | /25 | X/13 composants obligatoires |
| Pages présentes | 20% | /20 | 3 pages + state pages |
| Design System | 25% | /25 | Couleurs, polices, spacing, shadows |
| Architecture | 15% | /15 | Routing, layouts, middleware |
| SEO | 15% | /15 | Metadata, sitemap, robots, canonical |
| **TOTAL** | **100%** | **/100** | |

---

## Phase 7 — Plan de correction priorisé

Liste les corrections à appliquer dans l'ordre, groupées par lot :

**Lot 1 — Bloquants (à faire en premier) :**
- Les 🔴 CRITICAL qui empêchent le site de fonctionner ou cassent le SEO

**Lot 2 — Design (visuel) :**
- Les 🟡 WARNING sur le design system, les styles, les couleurs

**Lot 3 — Polish (finition) :**
- Les 🟢 INFO et les améliorations suggérées

---

## Règles pour l'audit

1. **Lis chaque fichier** — ne suppose rien. Si un composant n'est pas listé dans `components/`, il n'existe pas.
2. **Sois précis** — chaque problème doit pointer vers un fichier et une ligne exacte.
3. **Ne répare rien** — cet audit est un diagnostic. Les corrections viennent après validation.
4. **Priorise sans pitié** — mieux vaut 5 CRITICAL bien identifiés que 50 warnings mineurs qui noient l'essentiel.
5. **Référence la spec** — chaque écart doit mentionner la section de la spec violée (§3.3, §4.3.10, etc.).
