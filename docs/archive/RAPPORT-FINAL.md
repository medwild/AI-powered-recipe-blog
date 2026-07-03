# AI AutoBlog — Générateur de Recettes de Cuisine Automatisé

> Rapport final du projet — Juin 2026

---

## 1. Présentation générale

**AI AutoBlog** est un générateur automatique de recettes de cuisine optimisées SEO. L'utilisateur entre un mot-clé (ex: "Tarte aux pommes facile"), et un pipeline multi-agents orchestre :

1. **Analyse SERP** (Serper.dev) — Récupère les données Google pour le mot-clé
2. **Rédaction IA** (Cloudflare Workers AI / Llama 3.1) — Génère une recette structurée avec article Markdown
3. **Génération d'image** (Cloudflare Workers AI / Stable Diffusion XL) — Crée une photo culinaire
4. **Upload CDN** (Cloudinary) — Héberge l'image générée
5. **Persistance** (Neon PostgreSQL) — Sauvegarde le brouillon complet en base

Le tout est orchestré par **Inngest** (background job engine) avec retry automatique par étape, annulation de workflow, et observabilité via dashboard.

---

## 2. Stack technique complète

### 🖥️ Frontend

| Technologie | Version | Usage |
|---|---|---|
| **Next.js** (App Router) | 16.2.9 | Framework full-stack React |
| **React** | 19 | UI components |
| **Tailwind CSS** | 4.2.0 | Styling utility-first |
| **Tailwind Typography** | 0.5.20 | Styles prose pour Markdown |
| **shadcn/ui** | 4.8.0 | Composants UI (button, card, input, badge, etc.) |
| **Lucide React** | 1.16.0 | Icônes |
| **Sonner** | 2.0.7 | Toast notifications |
| **React Markdown** | 10.1.0 | Rendu Markdown → HTML |
| **remark-gfm** | 4.0.1 | Support GitHub Flavored Markdown |
| **Geist / Playfair Display** | (Google Fonts) | Typographie |

### 🗄️ Backend & Base de données

| Technologie | Version | Usage |
|---|---|---|
| **PostgreSQL** | (Neon Serverless) | Base de données relationnelle |
| **Neon** | (Serverless) | Hébergement PostgreSQL avec branching |
| **Drizzle ORM** | 0.45.2 | ORM TypeScript type-safe |
| **Drizzle Kit** | 0.31.10 | Migrations et push de schéma |
| **pg** | 8.22.0 | Driver PostgreSQL Node.js |

### 🤖 Agents IA & Services externes

| Service | API | Usage |
|---|---|---|
| **Serper.dev** | REST | Analyse SERP Google (top 10 résultats, questions fréquentes, recherches associées) |
| **Cloudflare Workers AI** | REST | Génération texte (Llama 3.1 8B) + image (Stable Diffusion XL) |
| **Cloudinary** | Node SDK | Upload CDN des images générées |

### ⚙️ Workflow Engine

| Technologie | Version | Usage |
|---|---|---|
| **Inngest** | 4.7.0 | Background job engine avec retry, annulation, observabilité |
| **Inngest CLI** | latest | Dev Server local (port 8288) pour tester les workflows |

### 🛠️ Outils de développement

| Technologie | Version | Usage |
|---|---|---|
| **TypeScript** | 5.7.3 | Langage |
| **tsx** | 4.22.4 | Exécution TypeScript directe (scripts) |
| **concurrently** | 9.2.3 | Lancement parallèle Next.js + Inngest Dev |
| **Turbopack** | (Next.js) | Bundler dev rapide |
| **PostCSS** | 8.5 | Processeur CSS |

---

## 3. Architecture du projet

### 3.1 Arborescence des fichiers clés

```
ai-blog-builder/
├── app/
│   ├── page.tsx                        # Page d'accueil (recettes publiées)
│   ├── layout.tsx                      # Layout racine (fonts, metadata, theme)
│   ├── globals.css                     # Styles Tailwind + thème shadcn
│   ├── dashboard/
│   │   └── page.tsx                    # Studio éditorial (generate + liste)
│   ├── recettes/
│   │   ├── page.tsx                    # Liste publique des recettes publiées
│   │   └── [slug]/
│   │       └── page.tsx                # Page détail recette (article complet)
│   ├── api/
│   │   ├── inngest/
│   │   │   └── route.ts                # Endpoint Inngest (GET, POST, PUT)
│   │   └── recipes/
│   │       ├── generate/
│   │       │   └── route.ts            # POST /api/recipes/generate
│   │       └── [id]/
│   │           ├── status/
│   │           │   └── route.ts        # GET /api/recipes/:id/status
│   │           └── cancel/
│   │               └── route.ts        # POST /api/recipes/:id/cancel
│   └── actions/
│       └── recipes.ts                  # Server Actions (publish, unpublish, delete, cancel)
├── components/
│   ├── site-header.tsx                 # Header navigation
│   ├── site-footer.tsx                 # Footer
│   ├── recipe-card.tsx                 # Carte recette pour grille publique
│   ├── recipe-article.tsx              # Article recette complet
│   └── dashboard/
│       ├── recipe-generator.tsx         # Formulaire de génération + polling
│       └── recipe-row.tsx              # Ligne recette dans la liste du dashboard
├── lib/
│   ├── db/
│   │   ├── index.ts                    # Connexion DB (pool singleton)
│   │   ├── schema.ts                   # Schéma Drizzle (table recipes)
│   │   └── queries.ts                  # Fonctions de requêtes DB
│   ├── agents/
│   │   ├── serp.ts                     # Agent SERP (Serper.dev)
│   │   ├── cloudflare.ts              # Agent Cloudflare AI (texte + image)
│   │   ├── cloudinary.ts              # Agent Cloudinary (upload image)
│   │   └── workflow.ts                # Ancien workflow synchrone (DEPRECATED)
│   ├── inngest/
│   │   ├── client.ts                   # Client Inngest singleton
│   │   └── functions/
│   │       └── generate-recipe.ts      # Fonction Inngest du workflow principal
│   ├── slug.ts                         # Utilitaire de slugification
│   └── utils.ts                        # Utilitaires généraux (cn)
├── scripts/
│   └── test-workflow.ts               # Script de test E2E (npm run test:e2e)
├── next.config.mjs                     # Config Next.js
├── drizzle.config.ts                   # Config Drizzle Kit
├── package.json                        # Dépendances et scripts
└── .env.local                          # Variables d'environnement (gitignoré)
```

### 3.2 Schéma de la base de données (Neon PostgreSQL)

**Table : `recipes`**

```typescript
// lib/db/schema.ts
export const recipes = pgTable("recipes", {
  id:            serial("id").primaryKey(),
  slug:          text("slug").notNull().unique(),
  keyword:       text("keyword").notNull(),
  title:         text("title").notNull(),
  metaTitle:     text("meta_title"),
  metaDescription: text("meta_description"),
  excerpt:       text("excerpt"),
  contentMarkdown: text("content_markdown"),
  heroImageUrl:  text("hero_image_url"),
  prepTime:      text("prep_time"),
  cookTime:      text("cook_time"),
  totalTime:     text("total_time"),
  servings:      text("servings"),
  difficulty:    text("difficulty"),
  ingredients:   jsonb("ingredients").$type<Ingredient[]>().default([]),
  instructions:  jsonb("instructions").$type<Instruction[]>().default([]),
  tags:          jsonb("tags").$type<string[]>().default([]),
  serpData:      jsonb("serp_data"),
  status:        text("status").notNull().default("draft"),
  workflowLog:   jsonb("workflow_log").$type<WorkflowLogEntry[]>().default([]),
  publishedAt:   timestamp("published_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
```

**Statuts possibles :** `generating` → `draft` / `failed` / `cancelled` → `published`

**Types JSONB :**
- `Ingredient[]` : `{ name: string, quantity?: string }`
- `Instruction[]` : `{ step: number, text: string }`
- `WorkflowLogEntry[]` : `{ agent: string, status: "running"|"done"|"error", message: string, at: string }`

### 3.3 Variables d'environnement (.env.local)

```env
# Base de données
DATABASE_URL=postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=verify-full

# API Services
SERPER_API_KEY=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Inngest (dev local)
INNGEST_DEV=1
```

**Tous les appels API sont côté serveur exclusivement** — pas de fuite de secrets vers le client.

---

## 4. Workflow de génération (Inngest)

### 4.1 Déclenchement

1. **Client** → `POST /api/recipes/generate` avec `{ keyword: "Tarte aux pommes facile" }`
2. La route API crée la recette en DB (`status: "generating"`)
3. Envoie l'event `recipe/generate` à Inngest
4. Réponse immédiate au client : `{ id: 18, status: "generating" }`

### 4.2 Exécution Inngest (4 étapes)

```
Fonction : generate-recipe (lib/inngest/functions/generate-recipe.ts)
Trigger  : event "recipe/generate"
CancelOn : event "recipe/cancel" match "data.recipeId"
```

| Étape | ID step.run | Agent | Description |
|---|---|---|---|
| 1 | `analyze-serp` | Serper.dev | Récupère les 10 résultats Google + questions fréquentes. Stocke en DB directement (évite limite de taille de step.run). |
| 2 | `generate-content` | Cloudflare AI (Llama 3.1) | Génère la recette structurée (titre, meta, ingrédients, instructions, article Markdown). Lit les données SERP depuis la DB. |
| 3 | `generate-and-upload-image` | Cloudflare AI (SDXL) + Cloudinary | Génère l'image avec Stable Diffusion XL, upload direct sur Cloudinary. Les deux opérations sont dans le MÊME step.run pour éviter la sérialisation du buffer PNG (~3MB). Timeout 20s avec AbortController sur le fetch. |
| 4 | `persist-draft` | DB | Sauvegarde toutes les données en base, status → `draft`. |

**Gestion des erreurs :**
- Chaque `step.run` a un retry automatique (Inngest)
- L'étape image est dans un `try/catch` — si elle échoue (timeout, API error), le workflow continue sans image
- Le `catch` global vérifie que le statut n'est pas déjà `cancelled` avant d'écrire `failed` (anti-race-condition)

### 4.3 Annulation

- `POST /api/recipes/:id/cancel` ou Server Action `cancelRecipe(id)`
- Ordre : 1) DB → `status: "cancelled"` 2) Envoi event `recipe/cancel` à Inngest
- Le `cancelOn` d'Inngest arrête le run immédiatement

### 4.4 Polling client

- `GET /api/recipes/:id/status` → `{ status, workflowLog }`
- Le frontend (RecipeGenerator) poll toutes les 2s, max 150 tentatives (5 min)
- Affichage des logs en direct dans un toast Sonner mis à jour par ID
- Gestion des statuts : `draft` → succès, `failed`/`error` → erreur, `cancelled` → annulation

---

## 5. Pages et routes

| Route | Type | Description |
|---|---|---|
| `/` | SSR (revalidate: 60s) | Page d'accueil : hero + grille des recettes publiées |
| `/recettes` | SSR (revalidate: 60s) | Liste publique de toutes les recettes publiées |
| `/recettes/[slug]` | ISR (revalidate: 300s) | Article recette complet (Schema.org JSON-LD, Open Graph) |
| `/dashboard` | SSR (force-dynamic) | Studio éditorial : formulaire de génération + liste de toutes les recettes + actions (publier, dépublier, supprimer, annuler, voir) |
| `/api/recipes/generate` | POST (maxDuration: 30s) | Lance une génération via Inngest |
| `/api/recipes/:id/status` | GET | Statut et logs du workflow |
| `/api/recipes/:id/cancel` | POST | Annulation de workflow |
| `/api/inngest` | GET/POST/PUT | Endpoint Inngest (serveur de fonctions) |

---

## 6. Composants frontend

### 6.1 Dashboard (Studio éditorial)

- **RecipeGenerator** : Formulaire avec input mot-clé + bouton "Générer". Polling toast avec progression en temps réel.
- **RecipeRow** : Ligne par recette avec :
  - Miniature image (si existante)
  - Titre et mot-clé
  - Badge de statut (Publiée/Brouillon/En cours/Échec/Annulée)
  - Actions : Voir (draft/published), Publier/Dépublier, Supprimer, Annuler (generating)
  - Journal du workflow dépliable (logs par agent avec icônes ✅🔄❌)

### 6.2 Pages publiques

- **RecipeCard** : Carte avec image 4:3, badge difficulté, titre, excerpt, temps, portions. Lien vers la page recette.
- **RecipeArticle** : Article complet avec :
  - Tags, titre H1, excerpt
  - Image hero
  - Grille meta (préparation, cuisson, portions, difficulté)
  - Section ingrédients (liste avec quantités)
  - Section instructions (étapes numérotées avec cercles)
  - Article Markdown (prose Tailwind Typography)
  - Schema.org JSON-LD (Recipe structured data)

### 6.3 Header/Footer

- **SiteHeader** : Logo + navigation (Recettes, Studio). Sticky avec backdrop-blur.
- **SiteFooter** : Marque, année, lien Studio.

---

## 7. Agents IA — Détail

### 7.1 Agent SERP (`lib/agents/serp.ts`)

```
API      : Serper.dev (POST https://google.serper.dev/search)
Param    : { q: keyword, gl: "fr", hl: "fr", num: 10 }
Retour   : { organic: [{ title, snippet, link }], relatedQuestions: string[], relatedSearches: string[] }
```

### 7.2 Agent Rédaction (`lib/agents/cloudflare.ts` — `runText`)

```
API      : Cloudflare Workers AI
Modèle   : @cf/meta/llama-3.1-8b-instruct
Prompt   : System "Tu es un chef et expert SEO francophone..."
           User avec contexte SERP + template JSON attendu
Max tokens : 4096
Retour   : JSON structuré (GeneratedRecipe)
```

**Prompt engineering :**
- System prompt : chef + expert SEO francophone
- Contexte SERP : titres concurrents, questions fréquentes, recherches associées
- Template JSON strict avec champs, contraintes de longueur, et instructions en français

**Parsing JSON :** La fonction `extractJson()` gère :
- Fences Markdown (` ```json ... ``` `)
- Caractères de contrôle non échappés dans les chaînes (repaired avec `repairJson()` qui remplace `[\x00-\x1F]` par des espaces)
- Double tentative : parse strict → réparation → second parse

### 7.3 Agent Image (`lib/agents/cloudflare.ts` — `runImage`)

```
API      : Cloudflare Workers AI
Modèle   : @cf/stabilityai/stable-diffusion-xl-base-1.0
Param    : { prompt, num_steps: 20 }
Timeout  : 20s (AbortController)
Retour   : Buffer (PNG)
```

Le prompt de l'image est généré par l'agent Rédaction dans le champ `imagePrompt` de la recette.

### 7.4 Agent Upload (`lib/agents/cloudinary.ts`)

```
SDK      : cloudinary v2 (Node.js)
Upload   : upload_stream → folder: "recipes", public_id: "recipe-{id}-{slug}", overwrite: true
Retour   : URL sécurisée (secure_url)
```

---

## 8. Scripts npm

```json
{
  "dev":          "concurrently \"next dev\" \"npx inngest-cli@latest dev --sdk-url http://localhost:3000/api/inngest\"",
  "dev:next":     "next dev",
  "inngest:dev":  "npx inngest-cli@latest dev --sdk-url http://localhost:3000/api/inngest",
  "build":        "next build",
  "start":        "next start",
  "lint":         "eslint .",
  "test:e2e":     "npx tsx scripts/test-workflow.ts"
}
```

**Pour lancer en développement :**
```bash
npm run dev          # Next.js (3000) + Inngest Dev (8288)
```

**Dashboard Inngest Dev :** http://localhost:8288

---

## 9. Script de test E2E

`scripts/test-workflow.ts` — Test automatisé complet :

1. Vérifie que le serveur Next.js répond
2. Envoie `POST /api/recipes/generate` avec le mot-clé
3. Poll `GET /api/recipes/:id/status` toutes les 2s
4. Affiche les logs en temps réel avec icônes (🔄 ✅ ❌)
5. Vérifie le statut final `draft`
6. Timeout : 150 tentatives (5 min)

Usage : `npm run test:e2e`

**Résultat du dernier test :** ✅ Workflow complet en **18 secondes**
- SERP : 10 résultats, 0 questions (2s)
- Rédaction : Recette rédigée (5s)
- Image : Générée + uploadée Cloudinary (10s)
- Persistance : Statut `draft` (1s)

---

## 10. Problèmes résolus pendant le développement

### 10.1 Connexion à la base de données
- **Problème :** `ECONNREFUSED 127.0.0.1:5432` (PostgreSQL local inexistant)
- **Solution :** Migration vers Neon (PostgreSQL serverless). URL de connexion dans `.env.local`.

### 10.2 Schéma non créé
- **Problème :** `relation "recipes" does not exist`
- **Solution :** Installation de `drizzle-kit` et `npx drizzle-kit push` pour créer la table.

### 10.3 Warning SSL PostgreSQL
- **Problème :** `sslmode=require` traité comme alias de `verify-full`
- **Solution :** Remplacé par `sslmode=verify-full` dans l'URL de connexion.

### 10.4 Taille de sortie step.run (SERP)
- **Problème :** `step output size is greater than the limit` — les 10 résultats SERP avec snippets dépassent la limite Inngest
- **Solution :** Stockage des données SERP directement en DB dans l'étape, plus de retour via step.run.

### 10.5 Taille de sortie step.run (Image)
- **Problème :** `Array.from(buf)` créait un tableau de ~3 millions de nombres (buffer PNG) qui dépassait aussi la limite
- **Solution :** Fusion des steps generate-image + upload-image en un seul step. Le buffer reste en mémoire, seule l'URL retournée traverse step.run().

### 10.6 Parsing JSON LLM
- **Problème :** Llama 3.1 produisait des caractères de contrôle non échappés (`\n`, `\r`, `\t`) dans les chaînes JSON
- **Solution :** Fonction `repairJson()` avec regex `[\x00-\x1F]` → remplacement par des espaces avant second parse.

### 10.7 Timeout génération d'image
- **Problème :** Cloudflare Stable Diffusion XL prenait >5 min (cold start)
- **Solution :** AbortController avec timeout 20s sur `runImage()`. L'erreur est attrapée gracieusement par le try/catch du workflow (image ignorée, suite du workflow).

---

## 11. État actuel de la base de données

```
ID 12 → failed   (test avant correction)
ID 18 → draft    ✅ Recette "Tarte aux pommes facile et délicieuse à la maison"
                  Image: https://res.cloudinary.com/dpgm5gata/image/upload/...png
                  Slug: tarte-aux-pommes-facile-18
```

---

## 12. Améliorations possibles

1. **Server-Sent Events** — Remplacer le polling par des events temps réel (meilleure UX)
2. **Régénération partielle** — Relancer seulement l'image ou le texte sans tout regénérer
3. **Génération par lots** — Plusieurs mots-clés à la fois
4. **Planification** — Génération automatique via cron Inngest
5. **Tests unitaires** — Tester la fonction Inngest, le polling, et les actions serveur
6. **Galerie d'images** — Stocker plusieurs images par recette
7. **Mode sombre** — Déjà partiellement configuré dans le CSS (thème dark)
8. **SEO avancé** — Sitemap XML, RSS feed, breadcrumbs
9. **Multi-langue** — Support anglais et autres langues

---

*Document généré le 23 juin 2026 — Projet AI AutoBlog Builder*
