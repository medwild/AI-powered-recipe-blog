# AdSense Readiness — Legal Pages + Mobile Header — Design Spec

> **Date** : 2026-07-08
> **Scope** : Pages légales, bannière cookie, header responsive mobile, footer links
> **Objectif** : Préparer le blog à la soumission AdSense (score cible : 85/100)

---

## Part A — Pages légales (3 pages + 1 composant)

### A1. Privacy Policy (`/privacy`)

**Fichier** : `app/privacy/page.tsx`
**Layout** : `max-w-3xl prose` avec breadcrumbs Home > Privacy Policy

Contenu :
- Introduction : données collectées (cookies, IP, analytics)
- Cookies : nécessaires + publicitaires (AdSense)
- Google AdSense : collecte automatique, cookies tiers, personnalisation
- Google Analytics : données de navigation anonymisées
- Droits utilisateur : accès, rectification, suppression, opposition
- Contact : lien vers page Contact
- Last updated : date

### A2. Terms & Disclaimer (`/terms`)

**Fichier** : `app/terms/page.tsx`
**Layout** : identique à Privacy

Contenu :
- Recettes informatives : pas de conseil médical/nutritionnel professionnel
- Allergies : l'utilisateur doit vérifier les ingrédients
- Nutrition : valeurs estimatives, non certifiées
- Liens affiliés : déclaration si applicable
- Propriété intellectuelle : contenu protégé
- Limitation de responsabilité
- Last updated : date

### A3. Contact (`/contact`)

**Fichier** : `app/contact/page.tsx`
**Layout** : `max-w-3xl` avec breadcrumbs

Options :
- **Approche simple (recommandée)** : Email visible + formulaire statique (mailto)
- Pas de backend — pas de server action, pas de DB

```
┌──────────────────────────────────────┐
│  Get in Touch                        │
│                                      │
│  Questions about a recipe? Found     │
│  an error? We'd love to hear from   │
│  you.                                │
│                                      │
│  Email: hello@chefaugustin.com       │
│  Response time: 2-3 business days   │
└──────────────────────────────────────┘
```

### A4. Cookie Consent Banner

**Fichier** : `components/cookie-banner.tsx`
**Type** : Client component (`"use client"`)

Comportement :
- Apparaît en bas de l'écran (fixed bottom)
- Stocke le consentement dans `localStorage`
- Si déjà accepté → ne s'affiche plus
- Bouton "Accept" + lien vers `/privacy`

```tsx
// Pattern
<div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur p-4">
  <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
    <p>We use cookies to improve your experience. <Link href="/privacy">Privacy Policy</Link></p>
    <Button onClick={accept}>Accept</Button>
  </div>
</div>
```

### A5. Footer — Ajout liens légaux

Modifier `components/site-footer.tsx` :

```diff
- Explore:
-   All Recipes, Techniques, Guides, About
+ Explore:
+   All Recipes, Techniques, Guides, About
+ 
+ Legal:
+   Privacy Policy, Terms, Contact
```

---

## Part B — Header Responsive Mobile

### B1. Problème actuel

Le header actuel a 4 liens nav + ThemeToggle en ligne horizontale fixe. Sur mobile (<768px), les liens débordent ou deviennent illisibles. Pas de hamburger menu.

### B2. Solution

**Fichier** : `components/site-header.tsx`
**Refactor** : Ajouter un hamburger menu pour mobile

**Breakpoint** : `md:` (768px)

```
Desktop (≥768px) : Navigation horizontale inchangée
Mobile  (<768px) : Logo + Hamburger ☰ → menu slide-down
```

**Comportement** :
- State `open` géré via `useState`
- Clic sur ☰ → toggle `open`, icône change ☰→✕
- Menu s'affiche en dessous du header avec `backdrop-blur`
- Animation `transition-all duration-200`
- Fermeture automatique au clic sur un lien (via `onClick={() => setOpen(false)}`)
- Fermeture au clic sur l'overlay (fond semi-transparent)
- `escape` key ferme le menu (via `onKeyDown`)

**Menu mobile — liens**:
```
Recipes
Techniques
Guides
───────── (separator)
About
Studio
🌙 Dark mode (ThemeToggle)
```

**Spécifications techniques** :

| Élément | Classes |
|---|---|
| Bouton hamburger | `md:hidden flex items-center justify-center h-10 w-10 rounded-lg hover:bg-secondary` |
| Icône menu | `h-5 w-5` — `Menu` quand fermé, `X` quand ouvert (lucide icons) |
| Menu panel | `md:hidden absolute top-16 left-0 right-0 border-b border-border bg-background/95 backdrop-blur` |
| Menu items | `block px-4 py-3 text-base font-medium hover:bg-secondary transition-colors` |
| Overlay | `fixed inset-0 z-30 bg-black/20` quand menu ouvert |

**Props** : Aucun changement — `SiteHeader` reste sans props, tout est interne.

---

## Fichiers à créer / modifier

| Fichier | Action | Description |
|---|---|---|
| `app/privacy/page.tsx` | **Nouveau** | Page Privacy Policy |
| `app/terms/page.tsx` | **Nouveau** | Page Terms & Disclaimer |
| `app/contact/page.tsx` | **Nouveau** | Page Contact |
| `components/cookie-banner.tsx` | **Nouveau** | Bannière cookie consent |
| `components/site-header.tsx` | **Modifié** | Hamburger menu mobile |
| `components/site-footer.tsx` | **Modifié** | Liens légaux dans footer |
| `app/layout.tsx` | **Modifié** | Ajouter `<CookieBanner />` |

---

## Critères de succès

- [ ] `/privacy`, `/terms`, `/contact` accessibles et indexables
- [ ] Cookie banner apparaît au premier chargement, disparaît après accept
- [ ] Header : hamburger fonctionnel sur mobile (<768px)
- [ ] Header : navigation horizontale inchangée sur desktop (≥768px)
- [ ] Footer : liens légaux présents dans une section "Legal"
- [ ] `npx tsc --noEmit` passe
- [ ] `npm run build` passe
- [ ] Aucune dépendance ajoutée
- [ ] Aucun backend ou query modifié
