# PinPilot API — Brief d'Implémentation
> **Cible**: Cline (VS Code) / Claude Code
> **Date**: 2026-07-17
> **Périmètre**: API Next.js UNIQUEMENT (le plugin WordPress et Zernio sont hors scope)

---

## 0. Ce que tu dois construire

Une **API REST** en **Next.js 16 App Router** nommée **PinPilot API** qui :

1. Expose 13 endpoints REST consommés par le plugin WordPress PinPilot
2. Exécute un pipeline IA asynchrone : analyse de site → plan éditorial PTRA → génération de pins → génération d'images → scheduling Zernio
3. Intègre DeepSeek (LLM), Ideogram (images), Zernio (publication Pinterest)
4. Stocke tout dans PostgreSQL (Neon) via Drizzle ORM
5. Utilise Inngest pour les jobs asynchrones
6. Calcule les scores PTRA de façon **déterministe** (code, pas LLM)

**Le plugin WordPress et Zernio sont des boîtes noires.** Tu assumes qu'ils respectent les contrats documentés.

---

## 1. Stack Technique

| Couche | Technologie | Notes |
|---|---|---|
| Framework | Next.js 16 App Router | API routes uniquement (pas de pages SSR) |
| Langage | TypeScript strict | Pas de `any`, pas de `@ts-ignore` |
| Base de données | PostgreSQL (Neon) | Connection string dans `DATABASE_URL` |
| ORM | Drizzle | `drizzle-orm` + `drizzle-kit` pour les migrations |
| Jobs async | Inngest | `inngest` npm package. Événements + fonctions |
| LLM | DeepSeek v4 Pro | Via abstraction provider (cf §7) |
| Images | Ideogram v4 Turbo | Via abstraction provider (cf §7) |
| Publication | Zernio REST API | `https://api.zernio.com/v1` |
| Déploiement | Vercel | L'API doit être accessible publiquement (webhooks Zernio) |

---

## 2. Contrat — Ce que le plugin WordPress attend de l'API

### Base URL
```
https://api.pinpilot.dev/v1
```

### Authentification
Chaque requête du plugin inclut :
```
Authorization: Bearer {site_api_key}
X-PinPilot-Plugin: 1.0.0
```

Le middleware vérifie la clé API contre la colonne `sites.api_key`.

### Endpoints — Spécifications complètes

#### 1. `POST /v1/sites` — Enregistrement du site
```
Body: {
  "site_url": "https://monsite.com",
  "site_name": "Mon Blog",
  "wp_version": "6.7"
}

→ Génère un id (nanoid) et une api_key (crypto.randomUUID)
→ Insère dans la table sites
→ Retourne { "id": "site_xxx", "api_key": "pp_site_xxxx" }
→ Status: 201
```

#### 2. `GET /v1/sites/:id` — Statut du site
```
→ Vérifie auth (api_key dans le header)
→ Retourne toutes les colonnes SAUF les clés chiffrées :
  {
    "id": "site_xxx",
    "site_url": "...",
    "site_name": "...",
    "niche": "Food & Recipes",
    "status": "ready",
    "pins_per_day": 3,
    "schedule_start_hour": 8,
    "schedule_end_hour": 20,
    "timezone": "Europe/Paris",
    "total_articles": 45,
    "total_pins": 225,
    "pins_scheduled": 180,
    "pins_published": 45,
    "pins_failed": 0,
    "credits_remaining": 10
  }
→ total_articles = COUNT(*) FROM articles WHERE site_id = :id
→ total_pins = COUNT(*) FROM pins WHERE site_id = :id
→ pins_scheduled = COUNT(*) FROM pins WHERE site_id = :id AND status = 'scheduled'
→ pins_published = COUNT(*) FROM pins WHERE site_id = :id AND status = 'published'
→ pins_failed = COUNT(*) FROM pins WHERE site_id = :id AND status = 'failed'
```

#### 3. `POST /v1/sites/:id/analyze` — Analyse initiale
```
Body: { "trigger": "initial_analysis" }
→ Vérifie que le site existe
→ Met à jour sites.status = 'analyzing'
→ Déclenche l'événement Inngest "site/analyze"
→ Retourne 202 { "status": "processing" }
```

#### 4. `POST /v1/sites/:id/articles` — Nouvel article
```
Body: {
  "wp_id": 123,
  "title": "Titre de l'article",
  "slug": "titre-article",
  "url": "...",
  "excerpt": "...",
  "content_html": "<p>...</p>",
  "featured_image_url": "https://...",
  "categories": ["Cat1", "Cat2"],
  "tags": ["tag1", "tag2"]
}

→ Convertit content_html en Markdown (lib: turndown)
→ Insère dans la table articles
→ Déclenche l'événement Inngest "article/publish" avec { article_id, trigger: "new_article" }
→ Retourne 202 { "status": "processing", "article_id": "art_xxx" }
```

#### 5. `GET /v1/sites/:id/articles` — Lister les articles
```
Query params: status (all|pending|analyzed|pins_generated), page (default 1), per_page (default 20)
→ LEFT JOIN pour compter les pins par article
→ Retourne :
  {
    "articles": [
      {
        "id": "art_xxx",
        "wp_id": 123,
        "title": "...",
        "url": "...",
        "categories": [...],
        "pinterest_potential": 85,
        "content_type": "recipe",
        "status": "pins_generated",
        "pin_count": 5,
        "created_at": "..."
      }
    ],
    "total": 45,
    "page": 1,
    "per_page": 20
  }
```

#### 6. `GET /v1/sites/:id/pins` — Lister les pins
```
Query params: status (draft|image_generated|scheduled|published|failed|all),
              board (string), article_id (string), page, per_page (default 20)
→ JOIN articles pour avoir article_title
→ Retourne :
  {
    "pins": [
      {
        "id": "pin_xxx",
        "article_id": "art_xxx",
        "article_title": "Titre article",
        "pin_title": "...",
        "overlay_text": "...",
        "description": "...",
        "image_url": "https://cdn...",
        "board": "Easy Dinners",
        "board_zernio_id": "board_123",
        "intent": "quick_solution",
        "ptra_score": 87,
        "ptra_breakdown": { "semantic_fit": 8, "board_fit": 9, ... },
        "fresh_pin_rule_status": "fresh",
        "status": "scheduled",
        "scheduled_date": "2026-07-20T08:00:00Z",
        "zernio_post_id": null
      }
    ],
    "total": 225,
    "page": 1,
    "per_page": 20
  }
```

#### 7. `GET /v1/sites/:id/pins/:pinId` — Détail d'un pin
```
→ Même structure qu'un élément du tableau ci-dessus
→ 404 si pin non trouvé ou n'appartient pas au site
```

#### 8. `PATCH /v1/sites/:id/pins/:pinId` — Modifier un pin
```
Body (tous les champs optionnels) :
  {
    "pin_title": "...",
    "description": "...",
    "board": "...",
    "board_zernio_id": "...",
    "scheduled_date": "2026-07-21T10:00:00Z"
  }
→ Validation Zod
→ UPDATE pins SET ... WHERE id = :pinId AND site_id = :siteId
→ Retourne le pin mis à jour
→ Si le pin est déjà "published" → 400 "Impossible de modifier un pin déjà publié"
```

#### 9. `POST /v1/sites/:id/pins/:pinId/regenerate` — Régénérer l'image
```
→ Vérifie que le pin existe
→ Met à jour pins.status = 'draft'
→ Déclenche l'événement Inngest "image/regenerate" avec { pin_id, trigger: "regenerate" }
→ Retourne 202 { "status": "processing" }
```

#### 10. `POST /v1/sites/:id/pins/:pinId/publish` — Publier maintenant
```
→ Vérifie que le pin existe et n'est pas déjà "published"
→ Ignore le scheduler — envoie directement à Zernio
→ Déclenche l'événement Inngest "zernio/publish_now" avec { pin_id }
→ Retourne 202 { "status": "processing" }
```

#### 11. `DELETE /v1/sites/:id/pins/:pinId` — Supprimer un pin
```
→ Vérifie que le pin existe
→ Si pin.status === 'published' → 400 "Impossible de supprimer un pin déjà publié"
→ Si pin.status === 'scheduled' → annuler dans Zernio d'abord (si zernio_post_id existe)
→ DELETE FROM pins WHERE id = :pinId
→ Retourne 204
```

#### 12. `GET /v1/sites/:id/zernio/boards` — Discovery des boards
```
→ Récupère la clé Zernio chiffrée depuis la DB → déchiffre
→ Appelle Zernio : GET /v1/platforms/pinterest/boards
  Header: Authorization: Bearer {zernio_api_key}
→ Parse la réponse Zernio
→ Retourne :
  {
    "boards": [
      { "id": "board_123", "name": "Easy Dinners for Two", "pin_count": 45 },
      ...
    ],
    "pinterest_account_id": "pinterest_acc_xxx"
  }
→ Si Zernio retourne 401 → 502 { "error": "zernio_auth_failed", "message": "Clé API Zernio invalide" }
→ Stocke le pinterest_account_id dans sites.zernio_pinterest_account_id
```

#### 13. `POST /v1/sites/:id/zernio/webhook` — Webhook Zernio
```
⚠️ Cet endpoint n'utilise PAS l'auth par clé API site.
Il utilise la signature HMAC Zernio.

Header: X-Zernio-Signature: hmac_sha256(raw_body, zernio_webhook_secret)

→ Récupère le site par son ID
→ Vérifie la signature HMAC (utilise sites.zernio_webhook_secret)
→ Si signature invalide → 401
→ Parse le body :
  {
    "postId": "zernio_post_xxx",
    "status": "published" | "failed",
    "platform": "pinterest",
    "error": null | "error message",
    "publishedAt": "2026-07-20T08:00:00Z"
  }
→ UPDATE pins SET status = 'published' | 'failed',
    updated_at = NOW()
  WHERE zernio_post_id = :postId AND site_id = :siteId
→ Retourne 200
```

#### 14. `GET /v1/sites/:id/plan` — Plan PTRA
```
→ SELECT ptra_plan FROM sites WHERE id = :siteId
→ Retourne le JSON brut du plan PTRA
→ 404 si aucun plan généré
```

#### 15. `GET /v1/sites/:id/export` — Export CSV
```
Query params: format=csv, status (scheduled|all)
→ SELECT les pins filtrés
→ Génère un CSV :
  pin_title,description,image_url,board,link,scheduled_date
  "Titre pin","Description...","https://...","Board Name","https://article.url","2026-07-20T08:00:00Z"
→ Headers: Content-Type: text/csv, Content-Disposition: attachment; filename="pinpilot-export.csv"
→ Stream la réponse (pas de chargement en mémoire si beaucoup de pins)
```

---

## 3. Data Model — Drizzle Schema

```typescript
// lib/db/schema.ts
import { pgTable, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const sites = pgTable('sites', {
  id: text('id').primaryKey(),                        // nanoid
  siteUrl: text('site_url').notNull(),
  siteName: text('site_name'),
  niche: text('niche'),
  wpVersion: text('wp_version'),
  apiKey: text('api_key').notNull().unique(),          // Clé API du site (auth plugin WP)
  zernioApiKeyEncrypted: text('zernio_api_key_encrypted'),
  zernioPinterestAccountId: text('zernio_pinterest_account_id'),
  zernioWebhookSecret: text('zernio_webhook_secret'),
  pinsPerDay: integer('pins_per_day').default(3),
  scheduleStartHour: integer('schedule_start_hour').default(8),
  scheduleEndHour: integer('schedule_end_hour').default(20),
  timezone: text('timezone').default('UTC'),
  creditsRemaining: integer('credits_remaining').default(10),
  status: text('status').default('pending'),           // pending|analyzing|ready|error
  ptraPlan: jsonb('ptra_plan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  wpId: integer('wp_id'),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  url: text('url').notNull(),
  excerpt: text('excerpt'),
  contentMd: text('content_md'),
  featuredImageUrl: text('featured_image_url'),
  categories: jsonb('categories').default('[]'),
  tags: jsonb('tags').default('[]'),
  pinterestPotential: integer('pinterest_potential'),
  contentType: text('content_type'),
  primaryIntent: text('primary_intent'),
  status: text('status').default('pending'),           // pending|analyzed|pins_generated
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pins = pgTable('pins', {
  id: text('id').primaryKey(),
  articleId: text('article_id').notNull().references(() => articles.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  pinTitle: text('pin_title').notNull(),
  overlayText: text('overlay_text').notNull(),
  description: text('description').notNull(),
  imagePrompt: text('image_prompt').notNull(),
  imageUrl: text('image_url'),
  board: text('board').notNull(),
  boardZernioId: text('board_zernio_id'),
  intent: text('intent').notNull(),
  ptraScore: integer('ptra_score'),
  ptraBreakdown: jsonb('ptra_breakdown'),
  freshPinRuleStatus: text('fresh_pin_rule_status').default('fresh'),
  scheduledDate: timestamp('scheduled_date'),
  zernioPostId: text('zernio_post_id'),
  status: text('status').default('draft'),             // draft|image_generated|scheduled|published|failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userApiKeys = pgTable('user_api_keys', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  provider: text('provider').notNull(),                // deepseek|ideogram|openai
  keyEncrypted: text('key_encrypted').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 4. Middleware d'authentification

```typescript
// lib/middleware/auth.ts
// Extrait le header Authorization: Bearer {api_key}
// Cherche le site correspondant dans la DB
// Attache le site_id au contexte de la requête
// Si header manquant ou clé invalide → 401 { "error": "unauthorized" }
//
// Exception : le webhook Zernio (/zernio/webhook) utilise la signature HMAC,
// pas l'auth par clé API. Le middleware détecte cette route et skip l'auth bearer.
```

---

## 5. Jobs Inngest — Pipeline IA

### 5.1 Architecture des événements

```
┌────────────────────────────────────────────┐
│ ÉVÉNEMENTS                                 │
│                                            │
│ "site/analyze" { siteId, trigger }         │
│     ↓                                      │
│ "article/publish" { articleId, trigger }   │
│     ↓                                      │
│ "pins/generate" { articleIds[], siteId }   │
│     ↓                                      │
│ "images/generate" { pinIds[], siteId }     │
│     ↓                                      │
│ "zernio/schedule" { pinIds[], siteId }     │
│     ↓                                      │
│ "zernio/publish_now" { pinId }             │
│     ↓                                      │
│ "image/regenerate" { pinId }               │
└────────────────────────────────────────────┘
```

### 5.2 Job 1 : `site-analyzer` (trigger: `site/analyze`)

```typescript
// 1. Récupère le site depuis la DB
// 2. Fetch tous les articles WordPress via REST API :
//    GET {site_url}/wp-json/wp/v2/posts?per_page=100&_embed=true
//    Si échec → fallback RSS {site_url}/feed
// 3. Convertit HTML → Markdown pour chaque article (turndown)
// 4. Insère/Met à jour les articles dans la DB
// 5. Appelle DeepSeek avec le prompt "site-analyzer" (voir §6.1)
// 6. Parse la réponse JSON → met à jour niche, topics, pinterest_potential
// 7. Envoie l'événement "pins/generate" avec tous les article_ids
// 8. Met à jour sites.status = 'ready'
```

### 5.3 Job 2 : `ptra-plan-generator` (trigger implicite, appelé par Job 1)

```typescript
// ⚠️ Ce job n'est appelé QUE lors de l'analyse initiale (trigger = "initial_analysis")
// Pas pour les nouveaux articles individuels.

// 1. Récupère les données du site + articles
// 2. Appelle DeepSeek avec le prompt "ptra-architect" (voir §6.2)
// 3. Parse la réponse JSON → stocke dans sites.ptra_plan
// 4. Le plan contient : niche_core, board_architecture, cluster_map, publishing_calendar
```

### 5.4 Job 3 : `pin-generator` (trigger: `pins/generate`)

```typescript
// Pour CHAQUE article dans articleIds[] :
// 1. Récupère l'article + le plan PTRA du site
// 2. Prépare le contexte : boards disponibles, cluster, content_type
// 3. Appelle DeepSeek avec le prompt "pin-designer" (voir §6.3)
// 4. Valide la réponse :
//    - Exactement 5 pins (sinon → retry)
//    - 5 intents différents (sinon → retry)
//    - Tous les champs obligatoires présents (sinon → JSON repair via jsonrepair)
// 5. Pour chaque pin, calcule le score PTRA DÉTERMINISTE (voir §8)
// 6. Insère les 5 pins dans la DB
// 7. Met à jour articles.status = 'pins_generated'
// 8. Envoie l'événement "images/generate" avec les pin_ids (par lot de 5)
```

### 5.5 Job 4 : `image-generator` (trigger: `images/generate`)

```typescript
// Pour CHAQUE pin_id :
// 1. Récupère le pin
// 2. Appelle Ideogram avec pins.image_prompt + specs Pinterest (voir §7.2)
// 3. Upload l'image générée vers R2 ou S3 (pas de stockage local)
//    → URL publique : https://cdn.pinpilot.dev/images/{pin_id}.jpg
// 4. Met à jour pins.image_url + pins.status = 'image_generated'
// 5. Rate limiting : max 3 appels Ideogram simultanés
// 6. Retry : 3 tentatives. Si échec final → pins.status = 'failed'
// 7. Une fois TOUTES les images du lot générées → événement "zernio/schedule"
```

### 5.6 Job 5 : `zernio-scheduler` (trigger: `zernio/schedule`)

```typescript
// 1. Récupère la config de scheduling du site (pins_per_day, schedule_start_hour, etc.)
// 2. Pour les 5 pins du lot, calcule les dates de publication (voir §9)
// 3. Met à jour pins.scheduled_date pour chaque pin
// 4. Pour CHAQUE pin (dans l'ordre des dates) :
//    → Attend que scheduled_date arrive (Inngest step.sleep)
//    → Appelle Zernio : POST /v1/posts (voir §10)
//    → Met à jour pins.status = 'scheduled', puis 'published' au succès
//    → Stocke pins.zernio_post_id
```

---

## 6. Prompts LLM (DeepSeek)

### 6.1 Site Analyzer — Prompt

```
Tu es un expert en stratégie de contenu Pinterest.
Analyse le contenu de ce site WordPress.

URL du site : {siteUrl}
Articles ({count}) : {articlesSummary}

Pour le site dans son ensemble :
1. niche — catégorie principale (ex: "Minimalist Home Office", "Easy Weeknight Dinners")
2. topics — 3-5 topics/clusters identifiés
3. target_audience — qui lit ce site et quel problème cherche-t-il à résoudre

Pour chaque article :
1. pinterest_potential (0-100) — capacité à générer des pins performants
2. recommended_boards (2-3 boards Pinterest)
3. content_type (article|recipe|guide|tutorial|checklist|inspiration|comparison|product)
4. primary_intent (quick_solution|beginner_guide|step_by_step|mistake_avoidance|
   before_after|checklist|ingredient_spotlight|budget_friendly)

Output : JSON uniquement, pas de markdown.
```

### 6.2 PTRA Architect — Prompt

```
Tu es le PTRA Editorial Architect. Génère un plan éditorial Pinterest-first
pour ce site en utilisant le framework PTRA (Pinterest Topical Resonance Authority).

Données d'entrée :
- Site : {siteUrl}
- Niche détectée : {niche}
- Topics : {topics}
- Audience : {audience}
- Nombre d'articles : {articleCount}

Génère :
1. Niche Core — définition précise, 3 niches adjacentes EXCLUES
2. Board Architecture — 8-15 boards stratégiques. Pas de noms génériques.
   Board naming : mots-clés à forte intention uniquement.
3. Cluster Map — 6-10 clusters. Chaque cluster = 1 problème + 1 solution + 1 board primaire.
4. Publishing Calendar — 4 semaines. 1 cluster renforcé par semaine.
   Respecter la cadence configurée (max {pinsPerDay} pins/jour).

Règles absolues :
- Un board = un intent clair. "Recipes" ou "Ideas" → REJETÉ.
- Chaque Pin doit appartenir à un cluster.
- Les boards trop larges sont élagués du Content Graph.
- Le premier board de sauvegarde est le signal de classification le plus fort.

Output : JSON structuré uniquement.
```

### 6.3 Pin Designer — Prompt

```
Tu es le PTRA Pin Designer. Génère exactement 5 Pins Pinterest pour ce contenu.

CONTENU :
- Titre : {title}
- URL : {url}
- Type : {contentType}
- Extrait : {excerpt}
- Boards disponibles : {boards}
- Cluster : {cluster}

Pour chaque Pin, génère (LE LLM NE SCORE PAS — le score est calculé après) :
- pin_title : Titre accrocheur (< 100 chars)
- overlay_text : Texte overlay (< 30 chars)
- description : Description SEO (< 500 chars, mots-clés longue traîne)
- image_prompt : Prompt image 2:3 détaillé (composition DIFFÉRENTE par pin)
- board : Board le plus spécifique
- intent : Un des 8 intents Pinterest (tous différents)

RÈGLES CRITIQUES :
- 5 intents DIFFÉRENTS. Pas de doublon.
- 5 compositions visuelles DIFFÉRENTES. Pas juste un overlay changé.
- Fresh Pin Rule : visuel unique pour chaque pin.
- Hooks éthiques, spécifiques, vérifiables. Pas de clickbait.
- La description contient des mots-clés présents dans le contenu de destination
  (Topic Cohesion Score — US Patent 20230388261A1).

INTENTS DISPONIBLES (8) :
quick_solution | beginner_guide | step_by_step | mistake_avoidance |
before_after | checklist | ingredient_spotlight | budget_friendly

Note — ingredient_spotlight : malgré son nom hérité du framework PTRA (food-first),
cet intent est UNIVERSEL. Il signifie "Focus sur un élément/feature clé du contenu".

IMAGE PROMPT — Format obligatoire :
"Aspect ratio 2:3 (1000x1500px), vertical orientation, safe zone respected
(no critical text within outer 8% margin). [Description visuelle détaillée].
Pinterest-optimized, high contrast, single focal subject,
space for text overlay in the top third."

Output : JSON array de 5 PinDraft objects. Pas de markdown, pas de prose.
```

---

## 7. Abstraction Providers

### 7.1 LLM Provider

```typescript
// lib/providers/llm.ts
// Interface commune :
interface LLMProvider {
  complete(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;    // default 0.8
    maxTokens?: number;      // default 4096
    responseFormat?: 'json' | 'text';
  }): Promise<string>;
}

// Implémentation DeepSeek :
class DeepSeekProvider implements LLMProvider {
  // POST https://api.deepseek.com/v1/chat/completions
  // Model: deepseek-chat (v4 Pro)
  // Header: Authorization: Bearer {DEEPSEEK_API_KEY}
}

// Factory :
function getLLMProvider(siteId?: string): LLMProvider {
  // 1. Vérifier si le site a une clé BYOK (user_api_keys WHERE provider='deepseek')
  // 2. Si oui → déchiffrer et utiliser
  // 3. Si non → utiliser DEEPSEEK_API_KEY de l'env (crédits offerts)
  //    → Décrémenter sites.credits_remaining
  //    → Si credits_remaining === 0 → erreur "Crédits épuisés. Ajoutez votre clé API."
}
```

### 7.2 Image Provider

```typescript
// lib/providers/image.ts
interface ImageProvider {
  generate(params: {
    prompt: string;
    aspectRatio?: string;   // "2:3"
    width?: number;          // 1000
    height?: number;         // 1500
  }): Promise<{ imageUrl: string }>;
}

// Implémentation Ideogram :
class IdeogramProvider implements ImageProvider {
  // POST https://api.ideogram.ai/v1/generate
  // Model: ideogram-v4-turbo
  // Header: Authorization: Bearer {IDEOGRAM_API_KEY}
  // Response → récupérer l'URL → uploader vers R2 → retourner URL R2
}

// Même logique BYOK que pour le LLM.
```

---

## 8. Scoreur PTRA Déterministe

```typescript
// lib/scoring/ptra-scorer.ts
// LE LLM NE SCORE PAS. Cette fonction calcule le score APRÈS la génération.

interface PTRAFactors {
  semanticFit: number;      // 0-10
  boardFit: number;         // 0-10
  freshPinRule: number;     // 0-10
  ethicalHook: number;      // 0-10
  destinationFit: number;   // 0-10
}

function scorePin(pin: PinDraft, article: Article, allPins: PinDraft[]): { score: number; breakdown: PTRAFactors } {
  const factors: PTRAFactors = {
    semanticFit: scoreSemanticFit(pin, article),
    boardFit: scoreBoardFit(pin, article),
    freshPinRule: scoreFreshPinRule(pin, allPins),
    ethicalHook: scoreEthicalHook(pin),
    destinationFit: scoreDestinationFit(pin, article),
  };

  const total = Object.values(factors).reduce((a, b) => a + b, 0);
  return { score: total * 2, breakdown: factors }; // ×2 → /100
}

// 1. Semantic Fit (0-10)
function scoreSemanticFit(pin, article): number {
  // +3 si ≥1 mot du titre de l'article est dans le pin_title
  // +3 si ≥2 mots des headings (H2/H3) sont dans la description
  // +2 si le mot-clé principal est dans le pin_title
  // +2 si ≥1 catégorie/tag est dans la description
}

// 2. Board Fit (0-10)
function scoreBoardFit(pin, article): number {
  // +5 si le board assigné existe dans le plan PTRA
  // +3 si le nom du board contient ≥1 mot du titre ou des catégories
  // +2 si le board n'est pas générique (vérifier contre une liste de noms interdits)
}

// 3. Fresh Pin Rule (0-10)
function scoreFreshPinRule(pin, allPins): number {
  // Comparer les image_prompts entre eux via similarité cosinus (embeddings)
  // +10 si tous les prompts sont distincts (cosine < 0.8 pour chaque paire)
  // +5 si ≥4 distincts
  // +0 si ≥2 sont trop similaires (cosine > 0.9)
  // Pour le MVP : utiliser string-similarity (Dice coefficient) comme proxy rapide
}

// 4. Ethical Hook (0-10)
function scoreEthicalHook(pin): number {
  // -5 par mot interdit trouvé dans le pin_title (regex : /guaranteed|secret.trick|change.your.life|won.t.believe|crazy|insane|shocking/i)
  // -5 par mot interdit trouvé dans la description
  // +5 si le hook contient un chiffre OU une promesse vérifiable
  // +5 si le overlay_text < 30 chars ET contient un bénéfice concret
}

// 5. Destination Fit (0-10)
function scoreDestinationFit(pin, article): number {
  // Vérifier que la description ne promet rien que l'article ne contient pas :
  // +5 si ≥80% des verbes d'action de la description apparaissent dans le contenu
  // +5 si tous les éléments spécifiques mentionnés (ingrédients, outils, lieux)
  //      sont trouvés dans le contenu de l'article
}
```

---

## 9. Scheduler Interne

```typescript
// lib/scheduling/scheduler.ts

interface ScheduleConfig {
  pinsPerDay: number;
  startHour: number;   // 8 = 8h
  endHour: number;     // 20 = 20h
  timezone: string;    // "Europe/Paris"
}

function schedulePins(pinIds: string[], config: ScheduleConfig): Map<string, Date> {
  const { pinsPerDay, startHour, endHour, timezone } = config;
  const availableMinutes = (endHour - startHour) * 60;
  const intervalMinutes = Math.floor(availableMinutes / pinsPerDay);

  const schedule = new Map<string, Date>();
  let currentSlot = getNextAvailableSlot(startHour, timezone);

  for (const pinId of pinIds) {
    schedule.set(pinId, new Date(currentSlot));
    currentSlot = new Date(currentSlot.getTime() + intervalMinutes * 60_000);

    // Si on dépasse endHour → jour suivant
    if (currentSlot.getHours() >= endHour) {
      const next = new Date(currentSlot);
      next.setDate(next.getDate() + 1);
      next.setHours(startHour, 0, 0, 0);
      currentSlot = next;
    }
  }

  return schedule;
}

function getNextAvailableSlot(startHour: number, timezone: string): Date {
  const now = new Date();
  const slot = new Date(now);
  slot.setHours(startHour, 0, 0, 0);

  // Si l'heure de début est déjà passée aujourd'hui → demain
  if (slot <= now) {
    slot.setDate(slot.getDate() + 1);
  }

  return slot;
}
```

---

## 10. Client Zernio

```typescript
// lib/zernio/client.ts

class ZernioClient {
  constructor(private apiKey: string) {}

  // Lister les boards Pinterest
  async listBoards(): Promise<ZernioBoard[]> {
    // GET https://api.zernio.com/v1/platforms/pinterest/boards
    // ⚠️ HYPOTHESIS — endpoint exact et format de réponse à vérifier
  }

  // Créer un post (pin)
  async createPost(params: {
    content: string;           // description
    title: string;             // pin_title
    mediaUrls: string[];       // [image_url]
    linkUrl: string;           // URL article
    scheduledFor: string;      // ISO 8601
    timezone: string;
    boardId: string;           // ID Zernio du board
    pinterestAccountId: string;
  }): Promise<{ postId: string }> {
    // POST https://api.zernio.com/v1/posts
    // ⚠️ HYPOTHESIS — payload exact à vérifier
  }

  // Annuler un post programmé
  async deletePost(postId: string): Promise<void> {
    // DELETE https://api.zernio.com/v1/posts/{postId}
  }
}
```

---

## 11. Structure du Projet

```
pinpilot-api/
├── next.config.ts
├── tsconfig.json
├── package.json
├── .env.example
├── drizzle.config.ts
├── drizzle/
│   └── migrations/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── v1/
│   │           ├── sites/
│   │           │   ├── route.ts              # POST /v1/sites
│   │           │   └── [siteId]/
│   │           │       ├── route.ts          # GET /v1/sites/:id
│   │           │       ├── analyze/route.ts  # POST /v1/sites/:id/analyze
│   │           │       ├── articles/
│   │           │       │   ├── route.ts      # GET + POST /v1/sites/:id/articles
│   │           │       │   └── [articleId]/
│   │           │       │       └── route.ts
│   │           │       ├── pins/
│   │           │       │   ├── route.ts      # GET /v1/sites/:id/pins
│   │           │       │   └── [pinId]/
│   │           │       │       ├── route.ts  # GET + PATCH + DELETE
│   │           │       │       ├── regenerate/route.ts  # POST
│   │           │       │       └── publish/route.ts     # POST
│   │           │       ├── plan/route.ts     # GET /v1/sites/:id/plan
│   │           │       ├── export/route.ts   # GET /v1/sites/:id/export
│   │           │       └── zernio/
│   │           │           ├── boards/route.ts    # GET
│   │           │           └── webhook/route.ts   # POST
│   │           └── health/route.ts           # GET /v1/health
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts           # Connexion Drizzle
│   │   │   └── schema.ts          # Schéma (Section 3)
│   │   ├── middleware/
│   │   │   └── auth.ts            # Middleware auth (Section 4)
│   │   ├── providers/
│   │   │   ├── llm.ts             # DeepSeek provider (Section 7.1)
│   │   │   └── image.ts           # Ideogram provider (Section 7.2)
│   │   ├── prompts/
│   │   │   ├── site-analyzer.ts   # Prompt §6.1
│   │   │   ├── ptra-architect.ts  # Prompt §6.2
│   │   │   └── pin-designer.ts    # Prompt §6.3
│   │   ├── scoring/
│   │   │   └── ptra-scorer.ts     # Scoreur déterministe (Section 8)
│   │   ├── scheduling/
│   │   │   └── scheduler.ts       # Scheduler (Section 9)
│   │   ├── zernio/
│   │   │   └── client.ts          # Client Zernio (Section 10)
│   │   ├── encryption.ts          # Chiffrement/déchiffrement AES-256-GCM
│   │   ├── json-repair.ts         # jsonrepair wrapper
│   │   └── validation.ts          # Zod schemas pour tous les endpoints
│   └── inngest/
│       ├── client.ts              # Inngest client setup
│       ├── functions/
│       │   ├── site-analyzer.ts   # Job 1 (Section 5.2)
│       │   ├── ptra-plan-generator.ts # Job 2 (Section 5.3)
│       │   ├── pin-generator.ts   # Job 3 (Section 5.4)
│       │   ├── image-generator.ts # Job 4 (Section 5.5)
│       │   └── zernio-scheduler.ts # Job 5 (Section 5.6)
│       └── route.ts               # Inngest API route handler
└── .env.example
```

---

## 12. Variables d'Environnement

```bash
# .env.example

# Base de données
DATABASE_URL=postgres://user:pass@ep-xxx.neon.tech/pinpilot

# API Keys (crédits offerts — utilisés si le site n'a pas de BYOK)
DEEPSEEK_API_KEY=sk-xxx
IDEOGRAM_API_KEY=xxx

# Inngest
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx

# Encryption (clé maîtresse pour chiffrer/déchiffrer les clés API en DB)
ENCRYPTION_KEY=xxx   # générer avec : openssl rand -hex 32

# Optionnel
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=pinpilot-images
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
```

---

## 13. Gestion des Erreurs

### Rate Limiting
- LLM (DeepSeek) : max 5 appels simultanés. Retry backoff exponentiel (1s, 2s, 4s, 8s). Timeout 120s.
- Images (Ideogram) : max 3 appels simultanés. Retry 3x, puis pins.status = 'failed'.
- Zernio : respecter `Retry-After` header. Retry 3x avec backoff.
- API routes : 60 req/min par IP (utiliser `@upstash/ratelimit` ou similaire).

### JSON Repair
- Toute réponse LLM qui n'est pas du JSON valide → passer par `jsonrepair` avant de parser.
- Si `jsonrepair` échoue → retry l'appel LLM (1 seule fois).

### Webhook Zernio
- Vérifier la signature HMAC avant de traiter le payload.
- Si `zernio_post_id` ne correspond à aucun pin → 404 (log warning, pas d'erreur).
- Si le pin est déjà `published` → ignorer (idempotence).

### WordPress API
- Si `/wp-json` retourne 404 → fallback sur le flux RSS (`/feed`).
- Timeout 30s. Retry 3x.
- Si l'API WordPress est injoignable → `sites.status = 'error'` avec message.

---

## 14. Sécurité

1. **Clés API en DB** : chiffrées avec AES-256-GCM. Clé maîtresse = `ENCRYPTION_KEY` (env var).
2. **Auth** : toutes les routes (sauf webhook Zernio) vérifient le header `Authorization: Bearer`.
3. **Validation Zod** : chaque endpoint valide son body ET ses query params.
4. **Pas d'exposition** : les clés API (Zernio, DeepSeek, Ideogram) ne sont JAMAIS retournées dans les réponses.
5. **Rate limiting** : protection basique contre les abus.
6. **Webhook** : signature HMAC vérifiée avant traitement.

---

## 15. Ordre de Construction

### Phase 1 — Setup (1-2h)
1. Initialiser Next.js 16 + TypeScript strict
2. Installer les dépendances : `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `inngest`, `zod`, `nanoid`, `turndown`, `jsonrepair`
3. Configurer Drizzle + créer le schéma (Section 3)
4. Pousser les migrations (`drizzle-kit push`)
5. Route `GET /v1/health` → vérifier que l'API démarre

### Phase 2 — Auth + Sites (1-2h)
6. Middleware d'authentification (Section 4)
7. Chiffrement/déchiffrement (lib/encryption.ts)
8. `POST /v1/sites` — enregistrement
9. `GET /v1/sites/:id` — statut avec compteurs

### Phase 3 — Articles (1-2h)
10. `POST /v1/sites/:id/articles` — réception article (HTML→MD, insert DB)
11. `GET /v1/sites/:id/articles` — liste paginée
12. Validateurs Zod pour les deux endpoints

### Phase 4 — LLM Providers + Prompts (2h)
13. Abstraction LLM provider (Section 7.1) — DeepSeek + BYOK
14. Abstraction Image provider (Section 7.2) — Ideogram + BYOK
15. Fichiers de prompts (Section 6.1, 6.2, 6.3)

### Phase 5 — Inngest + Pipeline (4-5h)
16. Setup Inngest client + route handler
17. Job 1 : `site-analyzer` (WordPress fetcher + LLM call)
18. Job 2 : `ptra-plan-generator` (LLM call)
19. Job 3 : `pin-generator` (LLM call + validation 5 pins)
20. Scoreur PTRA déterministe (Section 8)
21. Job 4 : `image-generator` (Ideogram + upload R2)
22. Job 5 : `zernio-scheduler` (scheduler + Zernio client)

### Phase 6 — Routes Pins + Plan + Export (2h)
23. `GET + PATCH + DELETE /v1/sites/:id/pins/:pinId`
24. `POST regenerate` + `POST publish`
25. `GET /v1/sites/:id/pins` — liste paginée avec filtres
26. `GET /v1/sites/:id/plan`
27. `GET /v1/sites/:id/export` — streaming CSV

### Phase 7 — Zernio (1-2h)
28. Client Zernio (Section 10)
29. `GET /v1/sites/:id/zernio/boards` — discovery
30. `POST /v1/sites/:id/zernio/webhook` — avec vérification HMAC

### Phase 8 — Rate Limiting + Polish (1h)
31. Rate limiting sur toutes les routes
32. Gestion d'erreurs globale (try/catch → réponses JSON propres)
33. Tests end-to-end : curl tous les endpoints avec un site de test

---

## 16. Prompt de démarrage pour Cline

```
Tu construis l'API PinPilot, une API REST en Next.js 16 qui automatise
la création et publication de Pins Pinterest. Lis TOUT le fichier BRIEF.md
avant de commencer.

Contexte :
- L'API est consommée par un plugin WordPress (hors scope — tu ne le construis pas)
- L'API utilise Zernio pour publier sur Pinterest (hors scope — API externe)
- Le contrat API que tu dois respecter est dans la Section 2
- Les jobs asynchrones utilisent Inngest (Section 5)
- Les prompts LLM sont dans la Section 6
- Le scoring est DÉTERMINISTE — pas de LLM pour noter (Section 8)

Stack :
- Next.js 16 App Router (API routes uniquement)
- TypeScript strict (pas de any)
- PostgreSQL (Neon) + Drizzle ORM
- Inngest pour les jobs async
- DeepSeek v4 Pro pour le LLM
- Ideogram v4 Turbo pour les images
- Zernio REST API pour la publication

Structure : suis l'arborescence de la Section 11.
Ordre de build : suis la Section 15 phase par phase.
Sécurité : Section 14.
Erreurs : Section 13.

Commence par :
1. Initialiser le projet Next.js + TypeScript
2. Installer les dépendances
3. Créer le schéma Drizzle + pousser les migrations
4. Route GET /v1/health
5. Continuer dans l'ordre de la Section 15

Pour les parties marquées ⚠️ HYPOTHESIS : implémente selon la spec documentée,
mais ajoute un commentaire "// HYPOTHESIS — à vérifier contre l'API réelle"
pour que je sache quoi tester en premier.
```
