# Recipe Page UI/UX Redesign — Design Spec

> **Date** : 2026-07-08
> **Scope** : Page recette (`/recettes/[slug]`) — refonte complète UI/UX
> **Références** : Half Baked Harvest, Minimalist Baker, Pinch of Yum
> **Stratégie** : PTRA Pin-First, Mobile-First, Visual-First

---

## Objectifs

1. **UI moderne et élégante** — design sur mesure blog culinaire, pas un template générique
2. **UX claire par section** — chaque zone (hero, ingrédients, instructions, article) visuellement distincte
3. **Pin-First** — images 2:3, process shots intégrés, chaque élément "pinnable"
4. **Mobile-First** — conçu pour le scroll vertical, desktop en adaptation
5. **Conversion** — lecture fluide → envie de cuisiner → partage Pinterest

---

## Architecture — 7 Sections

```
1. RECIPE HERO       Image 2:3 + Titre + Excerpt + Badges
2. META BAR          Prep/Cook/Servings/Difficulty — pills design
3. ACTION BAR        Jump to Recipe · Print · Share · Save to Pinterest
4. INGREDIENTS       Carte avec checkboxes interactives + groupes
5. INSTRUCTIONS      Steps numérotés + Process Shots 2:3 alternés
6. ARTICLE BODY      FAQ, Tips, Nutrition, Why This Works — Markdown stylé
7. RELATED RECIPES   Grid 3 colonnes de RecipeCards redesignées
```

---

## Section 1 — RECIPE HERO

### Layout

```
┌────────────────────────────────────────────┐
│  [Badge catégorie]  ·  [Temps total]      │  ← pills superposées sur l'image
│                                            │
│  Titre de la recette                       │  ← Playfair clamp(2.2rem, 5vw, 3.5rem)
│  Sur 2-3 lignes max                        │
│                                            │
│  Excerpt — 1-2 phrases descriptives        │  ← text-lg text-muted-foreground
│                                            │
│  ★ Note  ·  Chef Augustin  ·  Date        │  ← text-sm, discret
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │         HERO IMAGE                   │  │
│  │         Ratio 2:3 (800×1200)         │  │
│  │         Rounded-3xl (24px)           │  │
│  │         Shadow-2xl teinté            │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### Spécifications techniques

| Propriété | Valeur |
|---|---|
| Container | `max-w-3xl mx-auto px-4 pt-10` |
| Ratio image | `aspect-[2/3]` |
| Border radius | `rounded-3xl` (24px) |
| Shadow | `shadow-2xl shadow-primary/10` |
| Titre | `font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-tight text-balance` |
| Excerpt | `text-lg leading-relaxed text-muted-foreground text-pretty` |
| Badge | `rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary` |
| Auteur | Lien vers `/about` avec `underline decoration-primary/40` |
| Image | `next/image` fill, `object-cover`, `priority`, `placeholder="blur"` |

---

## Section 2 — META BAR

### Layout

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  🕐 Prep  │  │  🔥 Cook │  │  👥 For  │  │  📊 Easy │
│  15 min   │  │  20 min  │  │  2 people│  │  Medium  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### Spécifications techniques

| Propriété | Valeur |
|---|---|
| Container | `grid grid-cols-2 sm:grid-cols-4 gap-3` |
| Card | `rounded-2xl border border-border bg-card/80 backdrop-blur p-4` |
| Icône | `h-5 w-5 text-primary` |
| Label | `text-xs uppercase tracking-wide text-muted-foreground` |
| Valeur | `font-semibold text-foreground` |
| Sticky | Optionnel : `sticky top-20` sur desktop |

---

## Section 3 — ACTION BAR

### Layout

```
[📋 Jump to Recipe ↓]   [🖨 Print]   [📤 Share]   [📌 Save to Pinterest]
```

### Spécifications techniques

| Propriété | Valeur |
|---|---|
| Container | `flex flex-wrap gap-3` |
| Bouton | `inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:bg-secondary hover:border-primary/30` |
| Jump | Lien ancre `#ingredients` |
| Pinterest | Bouton avec `navigator.share` ou ouverture fenêtre Pinterest |

---

## Section 4 — INGREDIENTS

### Layout

```
┌────────────────────────────────────────────┐
│  🥕  Ingrédients                           │
│                                            │
│  Pour la sauce                             │
│  ─────────────────────────────────────     │
│  ☐  2 c. à soupe d'huile d'olive          │
│  ☐  1 gousse d'ail émincée                 │
│  ☐  Sel et poivre                          │
│                                            │
│  Pour la garniture                         │
│  ─────────────────────────────────────     │
│  ☐  100g de parmesan râpé                  │
│  ☐  Persil frais                           │
│                                            │
│  [✓] Checked = barré + opacity réduite     │
└────────────────────────────────────────────┘
```

### Spécifications techniques

| Propriété | Valeur |
|---|---|
| Container | `rounded-3xl border border-border bg-card p-6 sm:p-8` |
| Titre | `font-serif text-2xl mb-6` |
| Sous-titre groupe | `text-sm font-semibold uppercase tracking-wider text-primary mb-3` |
| Séparateur | `border-b border-border/60` |
| Checkbox | Composant `IngredientCheckbox` — circle animé, pas un input HTML natif |
| Item coché | `line-through text-muted-foreground/50` |
| Animation | Transition `all 0.2s ease` sur le toggle |

---

## Section 5 — INSTRUCTIONS + PROCESS SHOTS

### Layout

```
┌────────────────────────────────────────────┐
│  📝  Instructions                          │
│                                            │
│  ┌─ Step 1 ───────────────────────────────┐│
│  │                                        ││
│  │  1  Préchauffer le four à 180°C.       ││
│  │                                        ││
│  │  ┌──────────────────────────┐          ││
│  │  │  Process Shot 2:3        │          ││
│  │  │  (ingrédients préparés)  │          ││
│  │  └──────────────────────────┘          ││
│  └────────────────────────────────────────┘│
│                                            │
│  ┌─ Step 2 ───────────────────────────────┐│
│  │        ┌──────────────────────┐        ││
│  │  2     │ Process Shot 2:3     │        ││
│  │        │ (cuisson en cours)   │        ││
│  │        └──────────────────────┘        ││
│  │  Mélanger les ingrédients dans un bol. ││
│  └────────────────────────────────────────┘│
│                                            │
│  ┌─ Step 3 ───────────────────────────────┐│
│  │  3  Servir immédiatement et déguster ! ││
│  │  ┌──────────────────────────┐          ││
│  │  │  Process Shot 2:3        │          ││
│  │  │  (plat final dressé)     │          ││
│  │  └──────────────────────────┘          ││
│  └────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

### Spécifications techniques

| Propriété | Valeur |
|---|---|
| Container section | `mt-12` |
| Titre | `font-serif text-2xl mb-8` |
| Step wrapper | `flex gap-5 relative` |
| Numéro | `flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm` |
| Numéro oversized (optionnel) | `absolute text-[8rem] font-serif text-primary/5 -top-16 -left-4 select-none pointer-events-none` |
| Texte step | `text-base leading-relaxed pt-1.5` |
| Process shot | `relative aspect-[2/3] w-full max-w-xs rounded-2xl overflow-hidden border border-border mt-4` |
| Alternance | `sm:flex-row` / `sm:flex-row-reverse` — image à gauche ou droite selon parité |
| Animation | fade-in-up au scroll (Intersection Observer) |

---

## Section 6 — ARTICLE BODY

### Layout

```
┌────────────────────────────────────────────┐
│  Pourquoi cette recette fonctionne         │  ← H2
│                                            │
│  Texte explicatif sur les ingrédients...   │
│                                            │
│  FAQ                                       │  ← H2
│                                            │
│  Q: Peut-on préparer à l'avance ?          │  ← H3
│  R: Oui, jusqu'à 24h au frigo.            │
│                                            │
│  Nutrition Highlights                      │  ← H2
│                                            │
│  Par portion : 350 kcal, 18g protéines... │
└────────────────────────────────────────────┘
```

### Spécifications techniques

| Propriété | Valeur |
|---|---|
| Container | `prose prose-lg prose-neutral max-w-none` |
| Personnalisation | Composants ReactMarkdown custom comme actuellement |
| H2 | `font-serif text-2xl font-bold mt-10 mb-5` |
| H3 | `font-serif text-xl font-bold mt-8 mb-4` |
| FAQ | Q en `font-semibold`, R en `text-muted-foreground` |
| Blockquote | `border-l-4 border-primary/40 pl-5 italic text-muted-foreground` |
| Liens | `text-primary underline hover:text-primary/80` |

---

## Section 7 — RELATED RECIPES

### Layout

```
┌────────────────────────────────────────────┐
│  Ces recettes pourraient vous plaire       │
│                                            │
│  ┌──────┐  ┌──────┐  ┌──────┐             │
│  │ Card │  │ Card │  │ Card │             │
│  │ 2:3  │  │ 2:3  │  │ 2:3  │             │
│  └──────┘  └──────┘  └──────┘             │
└────────────────────────────────────────────┘
```

### Spécifications techniques

| Propriété | Valeur |
|---|---|
| Container | `mx-auto max-w-5xl px-4 py-16` |
| Titre | `font-serif text-2xl sm:text-3xl mb-8 text-balance` |
| Grid | `grid gap-6 sm:grid-cols-2 lg:grid-cols-3` |
| Card | Composant `RecipeCard` redesigné (voir ci-dessous) |

---

## Composant — RecipeCard (redesign)

### Spécifications

| Propriété | Valeur |
|---|---|
| Ratio | `aspect-[2/3]` (change de 4:3 actuel) |
| Border radius | `rounded-2xl` (16px) |
| Badge temps | Overlay `absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium` |
| Image hover | `group-hover:scale-105 transition-transform duration-500` |
| Titre | Sous l'image, `font-serif text-lg leading-snug group-hover:text-primary` |
| Meta | `flex items-center gap-3 text-xs text-muted-foreground` — temps, portions |
| Shadow hover | `shadow-xl shadow-primary/5` |

---

## Design Tokens

### Couleurs (inchangées du thème actuel — déjà bonnes)

```css
--primary: oklch(0.6 0.16 41);       /* Terracotta chaud */
--primary-foreground: oklch(0.985 0.01 85);
--background: oklch(0.985 0.008 85); /* Crème */
--foreground: oklch(0.26 0.02 50);
--card: oklch(1 0.004 85);
--border: oklch(0.9 0.012 80);
--muted-foreground: oklch(0.52 0.02 55);
```

### Typographie

```css
--font-serif: Playfair Display, Georgia, serif;
--font-sans: Geist, system-ui, sans-serif;
```

### Radius

```css
--radius-sm: 0.375rem;   /* 6px — pills, badges */
--radius-lg: 0.625rem;   /* 10px — boutons */
--radius-xl: 0.875rem;   /* 14px — cards */
--radius-2xl: 1.125rem;  /* 18px — RecipeCard */
--radius-3xl: 1.5rem;    /* 24px — Hero image, cartes ingredients */
```

### Espacement

```css
--section-gap: 3rem;     /* 48px entre sections */
--content-gap: 1.5rem;   /* 24px entre éléments d'une section */
--card-padding: 1.5rem;  /* 24px padding interne cartes */
```

---

## Fichiers à créer / modifier

| Fichier | Action | Description |
|---|---|---|
| `components/recipe-article.tsx` | **Refonte** | Composant principal — restructuré en 7 sous-composants |
| `components/recipe-hero.tsx` | **Nouveau** | Section 1 — Hero image + titre |
| `components/recipe-meta-bar.tsx` | **Nouveau** | Section 2 — Meta pills |
| `components/recipe-action-bar.tsx` | **Nouveau** | Section 3 — Jump/Print/Share/Pin |
| `components/recipe-ingredients.tsx` | **Nouveau** | Section 4 — Carte ingrédients avec checkboxes |
| `components/recipe-instructions.tsx` | **Nouveau** | Section 5 — Steps + process shots |
| `components/recipe-article-body.tsx` | **Nouveau** | Section 6 — Markdown stylé (extrait de l'actuel) |
| `components/recipe-related.tsx` | **Nouveau** | Section 7 — Grid de recettes liées |
| `components/recipe-card.tsx` | **Modifié** | Ratio 2:3, nouveau design |
| `app/recettes/[slug]/page.tsx` | **Modifié** | Intégration des nouveaux composants |
| `app/globals.css` | **Modifié** | Ajout animations scroll, tokens additionnels |

---

## Critères de succès

- [ ] Page recette : 7 sections visuellement distinctes
- [ ] Images en ratio 2:3 sur hero + process shots + cards
- [ ] Checkboxes ingrédients interactives (état coché/décoché)
- [ ] Process shots alternés gauche/droite dans les instructions
- [ ] Mobile : scroll fluide, toutes les sections lisibles
- [ ] Desktop : layout aéré, max-w-3xl pour le contenu principal
- [ ] Dark mode : toutes les sections harmonieuses
- [ ] Print : stylesheet fonctionnelle
- [ ] Animation : fade-in-up au scroll sur les sections
- [ ] `npx tsc --noEmit` passe
- [ ] Aucune régression SEO (JSON-LD, meta, canonical)
- [ ] Aucune régression des queries (content_type, slug)
