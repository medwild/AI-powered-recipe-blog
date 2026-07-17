# PRD — PinPilot : Plugin WordPress + API IA + Zernio
> **Version**: 2.0 | **Date**: 2026-07-17 | **Cible**: Google AI Studio (Gemini)
> **Nom de code**: PinPilot

---

## 0. Résumé Exécutif

**PinPilot** est un **plugin WordPress** couplé à une **API de traitement IA** et à **Zernio** (plateforme de publication sociale unifiée) qui automatise l'intégralité du pipeline Pinterest pour les sites WordPress :

> **Nouvel article publié → IA génère 5 pins + images → Zernio publie automatiquement sur Pinterest selon le planning configuré.**

L'utilisateur installe le plugin WordPress, le configure une fois (clé Zernio, boards, cadence), et n'y touche plus. Tout est automatique.

**Cible** : Blogueurs, créateurs de contenu, e-commerçants, PME utilisant WordPress.

**Modèle** : One-time purchase (LTD). Crédits IA offerts au setup, puis BYOK.

---

## 1. Architecture Globale

```
┌──────────────────────────────────────────────────┐
│           PLUGIN WORDPRESS (PHP)                  │
│  UI intégrée dans wp-admin                        │
│                                                   │
│  ONBOARDING (une fois) :                          │
│  • Clé API Zernio                                 │
│  • Clés DeepSeek + Ideogram (après crédits)       │
│  • Mapping catégories WP → boards Pinterest        │
│  • Cadence de publication (X pins/jour, heures)    │
│                                                   │
│  AUTOMATIQUE (après config) :                      │
│  • Nouvel article → webhook → API PinPilot         │
│  • Dashboard : pins générés, statut, files d'attente│
│  • Export CSV (fallback manuel)                    │
└────────┬─────────────────────────────────────────┘
         │ REST API (HTTPS)
         ▼
┌──────────────────────────────────────────────────┐
│           API PINPILOT (Next.js)                  │
│  Hébergée sur Vercel / Railway                    │
│                                                   │
│  • Pipeline IA : analyse → PTRA → pins → images   │
│  • Envoi programmé vers Zernio                    │
│  • Gestion crédits IA initiaux + BYOK             │
│  • Stockage chiffré des clés API                  │
└────────┬─────────────────────────────────────────┘
         │ Zernio REST API (clé utilisateur)
         ▼
┌──────────────────────────────────────────────────┐
│              ZERNIO                               │
│  zernio.com — API unifiée réseaux sociaux         │
│                                                   │
│  • OAuth Pinterest géré côté Zernio               │
│  • POST /posts → création + scheduling des pins   │
│  • Webhooks de statut → callback vers API PinPilot│
│  • Retry automatique en cas d'échec               │
└────────┬─────────────────────────────────────────┘
         │ Pinterest API (via Zernio)
         ▼
┌──────────────────────────────────────────────────┐
│            PINTEREST                              │
│  5 pins/article · boards ciblés · planning auto   │
└──────────────────────────────────────────────────┘
```

---

## 2. Parcours Utilisateur

```
ÉTAPE 1 : Installation
  → L'utilisateur installe le plugin PinPilot sur son WordPress
  → Un menu "PinPilot" apparaît dans la sidebar wp-admin

ÉTAPE 2 : Création compte Zernio (3 min, une fois)
  → Le plugin affiche un lien : "1. Créez votre compte Zernio (gratuit)"
  → L'utilisateur s'inscrit sur zernio.com (2 comptes gratuits)
  → Il connecte son compte Pinterest via l'OAuth Zernio
  → Il copie sa clé API Zernio

ÉTAPE 3 : Configuration (5 min, une fois)
  → Il colle sa clé API Zernio dans les réglages PinPilot
  → Il mappe ses catégories WP vers ses boards Pinterest
  → Il définit sa cadence (ex: 3 pins/jour, entre 8h-20h)
  → (Optionnel) Il ajoute ses clés DeepSeek + Ideogram

ÉTAPE 4 : Automatique — plus rien à faire
  → Il publie un article normalement sur WordPress
  → PinPilot détecte la publication → envoie à l'API
  → L'IA génère 5 pins + images (2-3 min)
  → Les pins apparaissent dans le dashboard wp-admin
  → Zernio les publie selon le planning configuré
```

---

## 3. MVP — Périmètre

### 3.1 Ce que le MVP fait (v1)

| # | Feature | Prio | Description |
|---|---|---|---|
| 1 | Plugin WordPress | P0 | Menu wp-admin, settings, dashboard pins |
| 2 | Détection automatique | P0 | Hook `publish_post` → envoi vers API PinPilot |
| 3 | Analyse de contenu IA | P0 | Détection niche, topics, potentiel Pinterest par article |
| 4 | Plan éditorial PTRA | P0 | Clusters, boards, calendrier de publication |
| 5 | Génération de pins | P0 | 5 pins/article avec PTRA scoring 11 facteurs |
| 6 | Génération d'images IA | P0 | 1 image/pin via Ideogram (2:3, 1000x1500px) |
| 7 | Publication Zernio | P0 | Envoi automatique vers Zernio, scheduling respecté |
| 8 | Dashboard wp-admin | P0 | Files d'attente, statut des pins, logs |
| 9 | Export CSV fallback | P1 | Téléchargement manuel (si Zernio non configuré) |
| 10 | Gestion clés API | P1 | Crédits offerts + BYOK (DeepSeek, Ideogram) |

### 3.2 Ce que le MVP NE fait PAS

- Dashboard analytics Pinterest (impressions, saves, clics) → v2
- Support autres CMS que WordPress → v2
- Multi-sites par utilisateur → v2
- A/B testing des pins → v2
- Custom post types WordPress → v1.1
- Facturation / paiement intégré → manuel en v1

---

## 4. Stack Technique

| Couche | Technologie | Rôle |
|---|---|---|
| Plugin WordPress | PHP 8.0+ | UI dans wp-admin, hooks, API interne |
| API PinPilot | Next.js 16 (App Router) | Traitement IA, orchestration |
| Base de données | PostgreSQL (Neon) | Multi-tenant, pins, projets |
| ORM | Drizzle | Queries typées |
| Jobs async | Inngest | Pipeline IA : analyse → PTRA → pins → images |
| LLM | DeepSeek v4 Pro | Génération de contenu, scoring |
| Images | Ideogram v4 Turbo | Génération images Pinterest |
| Publication | Zernio REST API | Scheduling + publication Pinterest |
| WordPress API | REST API native WP | Extraction de contenu (fallback : flux RSS) |

---

## 5. Plugin WordPress — Spécifications

### 5.1 Structure du Plugin

```
pinpilot/
├── pinpilot.php                 # Plugin entry point
├── includes/
│   ├── class-admin-menu.php     # Menu wp-admin, pages
│   ├── class-settings.php       # Page réglages (clés API, boards, cadence)
│   ├── class-dashboard.php      # Page dashboard (files d'attente, statuts)
│   ├── class-pin-detail.php     # Page détail d'un pin (édition, regénération)
│   ├── class-api-client.php     # Client HTTP vers API PinPilot
│   ├── class-publish-hook.php   # Hook transition_post_status
│   ├── class-cron-sync.php      # WP-Cron : sync statuts Zernio → WP
│   └── class-encryption.php     # Chiffrement clés API stockées
├── assets/
│   ├── css/admin.css            # Styles wp-admin
│   └── js/admin.js              # Interactions UI (onglets, modales)
└── templates/
    ├── settings-page.php        # Template page réglages
    ├── dashboard-page.php       # Template dashboard
    └── pin-detail-page.php      # Template détail pin
```

### 5.2 Hooks WordPress utilisés

| Hook | Usage |
|---|---|
| `transition_post_status` | Détecter `draft→publish` → envoyer à l'API PinPilot |
| `admin_menu` | Ajouter le menu "PinPilot" dans la sidebar |
| `admin_enqueue_scripts` | Charger CSS/JS sur les pages PinPilot |
| `wp_ajax_pinpilot_*` | Endpoints AJAX pour les actions dashboard |
| `admin_post_pinpilot_*` | Form submissions (settings save) |

### 5.3 Pages wp-admin

| Slug | Page | Contenu |
|---|---|---|
| `pinpilot` | Dashboard | Vue d'ensemble : articles en file d'attente, pins publiés, prochains pins |
| `pinpilot-settings` | Réglages | Clé Zernio, clés LLM/Images, mapping catégories→boards, cadence |
| `pinpilot-queue` | File d'attente | Liste des pins en attente de publication, dates programmées |
| `pinpilot-pin` | Détail pin | Vue détaillée : image, titre, description, board, score PTRA, statut |
| `pinpilot-export` | Export CSV | Export manuel (fallback) |

### 5.4 Chiffrement des clés API

```php
// Stockage chiffré dans wp_options
// Utilise wp_salt() comme clé de chiffrement
// AES-256-GCM via openssl_encrypt()
// JAMAIS en clair dans la DB WordPress
```

---

## 6. API PinPilot — Routes

### 6.1 Authentification

Toutes les routes sont authentifiées par une **clé API site** générée à l'installation du plugin.

```
Header: Authorization: Bearer pp_site_xxxx
Header: X-PinPilot-Plugin: 1.0.0
```

### 6.2 Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/sites` | Enregistrer un site (appelé à l'activation du plugin) |
| `POST` | `/api/v1/sites/:id/analyze` | Lancer l'analyse du contenu existant |
| `POST` | `/api/v1/sites/:id/articles` | Envoyer un nouvel article (hook publish) |
| `GET` | `/api/v1/sites/:id/articles` | Lister les articles analysés |
| `GET` | `/api/v1/sites/:id/pins` | Lister les pins générés (filtres : statut, board, date) |
| `GET` | `/api/v1/sites/:id/pins/:pinId` | Détail d'un pin |
| `PATCH` | `/api/v1/sites/:id/pins/:pinId` | Modifier un pin (titre, description, board, date) |
| `POST` | `/api/v1/sites/:id/pins/:pinId/regenerate` | Régénérer l'image d'un pin |
| `POST` | `/api/v1/sites/:id/pins/:pinId/publish` | Forcer la publication immédiate d'un pin |
| `DELETE` | `/api/v1/sites/:id/pins/:pinId` | Supprimer un pin de la file d'attente |
| `GET` | `/api/v1/sites/:id/plan` | Récupérer le plan PTRA |
| `GET` | `/api/v1/sites/:id/export` | Télécharger CSV (fallback) |
| `GET` | `/api/v1/sites/:id/zernio/boards` | Lister les boards Pinterest disponibles via Zernio |
| `POST` | `/api/v1/sites/:id/zernio/webhook` | Webhook Zernio (statut de publication) |

---

## 7. Pipeline IA — Jobs Inngest

### 7.1 Vue d'ensemble — Deux flux distincts

#### Flux A : Analyse initiale (au setup du plugin)

```
TRIGGER : POST /api/v1/sites/:id/analyze
  → JOB 1 (site-analyzer) → JOB 2 (PTRA plan) → JOB 3 (pins) → JOB 4 (images) → JOB 5 (Zernio)
```

#### Flux B : Nouvel article (hook publish_post)

```
TRIGGER : POST /api/v1/sites/:id/articles
  → JOB 3 (pin-generator) → JOB 4 (image-generator) → JOB 5 (zernio-scheduler)
```

> **Règle de routage :** Le paramètre `trigger` (`initial_analysis` | `new_article`) détermine le point d'entrée. Le plan PTRA (JOB 2) n'est généré qu'une fois lors de l'analyse initiale. Les articles suivants héritent du plan existant.

```
┌─────────────────────────────────────────────────────┐
│              TRIGGERS                                │
│                                                     │
│  A) POST /api/v1/sites/:id/analyze                  │
│     trigger = "initial_analysis"                    │
│     → JOB 1 → JOB 2 → JOB 3 → JOB 4 → JOB 5        │
│                                                     │
│  B) POST /api/v1/sites/:id/articles                 │
│     trigger = "new_article"                         │
│     → JOB 3 → JOB 4 → JOB 5                         │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  JOB 1 : site-analyzer  [initial_analysis ONLY]     │
│  → Fetch WP REST API (tous les articles)            │
│  → LLM : détection niche + topics + potentiel        │
│  → Stocke dans articles table                        │
│  → Trigger JOB 2                                     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  JOB 2 : ptra-plan-generator [initial_analysis ONLY] │
│  → LLM : PTRA Editorial Architect (adapté horizontal)│
│  → Génère : Niche Core, Clusters, Boards, Calendrier │
│  → Stocke dans sites.ptra_plan (JSONB)               │
│  → Trigger JOB 3 (pour tous les articles)            │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  JOB 3 : pin-generator  [BOTH flows]                │
│  → Pour chaque article (1 ou N) :                    │
│    → LLM : Pin Designer (adapté horizontal)          │
│    → Génère 5 pins (titres, descriptions, boards)   │
│    → Attribue un score PTRA /100                    │
│  → Stocke dans pins table                            │
│  → Trigger JOB 4 (par lot de 5 pins)                │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  JOB 4 : image-generator  [BOTH flows]              │
│  → Pour chaque pin :                                 │
│    → Ideogram API : génération image 2:3             │
│    → Stocke l'image (R2/S3)                         │
│  → Met à jour pins.image_url                         │
│  → Trigger JOB 5 (par pin)                           │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  JOB 5 : zernio-scheduler  [BOTH flows]             │
│  → Applique le planning (cadence configurée)         │
│  → POST /posts vers Zernio API                       │
│  → Met à jour pins.status = 'scheduled'              │
│  → Écoute les webhooks Zernio pour succès/échec      │
└─────────────────────────────────────────────────────┘
```

### 7.2 Prompts LLM — Adaptés pour le horizontal

#### Site Analyzer

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

#### PTRA Architect (adapté du skill `ptra-editorial-architect/SKILL.md`)

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

#### Pin Designer (adapté du skill `skills/agent-pin-designer.md`)

```
Tu es le PTRA Pin Designer. Génère exactement 5 Pins Pinterest pour ce contenu.

CONTENU :
- Titre : {title}
- URL : {url}
- Type : {contentType}
- Extrait : {excerpt}
- Boards disponibles : {boards}
- Cluster : {cluster}

Pour chaque Pin, génère :
- pin_title : Titre accrocheur (< 100 chars)
- overlay_text : Texte overlay (< 30 chars)
- description : Description SEO (< 500 chars, mots-clés longue traîne)
- image_prompt : Prompt image 2:3 détaillé (composition DIFFÉRENTE par pin)
- board : Board le plus spécifique
- intent : Un des 8 intents Pinterest (tous différents)
- ptra_score : Score /100 avec breakdown 11 facteurs

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
Exemples non-food : "Why Ergonomic Chairs Make Home Office Better" (mobilier),
"The One Lens Every Travel Photographer Needs" (photo), "Why Linen Fabric
Makes Summer Dresses Better" (mode). Le "spotlight" porte sur l'élément
central de l'article, quel que soit le domaine.

PTRA SCORING (11 facteurs, /100) :
Micro-Niche Focus (10) + Problem-Solution Fit (10) + Value-Added Fit (10) +
Semantic Fit (12) + Visual Fit (12) + Board Fit (10) + Destination Fit (10) +
Ethical Hook Fit (10) + Consistency Fit (8) + Trend Timing (4) +
Measurement Readiness (4)

SCORE RANGES :
0-49 REJECT | 50-69 WEAK | 70-79 ACCEPTABLE | 80-89 STRONG | 90-100 EXCELLENT

IMAGE PROMPT — Format obligatoire :
"Aspect ratio 2:3 (1000x1500px), vertical orientation, safe zone respected
(no critical text within outer 8% margin). [Description visuelle détaillée].
Pinterest-optimized, high contrast, single focal subject,
space for text overlay in the top third."

Output : JSON array de 5 PinDraft objects. Pas de markdown, pas de prose.
```

---

## 8. Intégration Zernio

### 8.1 Setup utilisateur (manuel, une fois)

```
1. L'utilisateur va sur zernio.com → sign up (gratuit, 2 comptes)
2. Dans le dashboard Zernio : "Connect Platform" → Pinterest
3. OAuth Pinterest (géré par Zernio, pas par nous)
4. L'utilisateur copie sa clé API Zernio → la colle dans les réglages PinPilot
5. PinPilot appelle GET /api/v1/sites/:id/zernio/boards → récupère la liste
   des boards Pinterest disponibles avec leurs noms et IDs
6. L'utilisateur voit ses boards dans une dropdown → il mappe chaque
   catégorie WordPress vers un board Pinterest
```

### 8.2 Discovery des boards (Zernio API)

```typescript
// GET /api/v1/sites/:id/zernio/boards
// → L'API PinPilot appelle Zernio pour lister les boards du compte Pinterest connecté
//
// Zernio endpoint : GET /v1/platforms/pinterest/boards
// Header: Authorization: Bearer {zernio_api_key}
//
// Response Zernio :
// [
//   { "id": "board_xxx", "name": "Easy Dinners for Two", "pinCount": 45 },
//   { "id": "board_yyy", "name": "30-Minute Meals", "pinCount": 23 },
//   ...
// ]
//
// → L'API PinPilot renvoie cette liste au plugin WordPress
// → Le plugin affiche les boards dans la page settings pour le mapping
```

### 8.3 Publication via Zernio API

```typescript
// POST https://api.zernio.com/v1/posts
// Header: Authorization: Bearer {zernio_api_key}

const payload = {
  content: pin.description,
  title: pin.pin_title,
  mediaUrls: [pin.image_url],    // URL de l'image générée
  linkUrl: article.url,           // URL canonique de l'article
  scheduledFor: pin.scheduled_date, // ISO 8601 avec timezone
  timezone: user.timezone,        // "Europe/Paris"
  platforms: [
    {
      platform: "pinterest",
      accountId: user.zernio_pinterest_account_id,
      boardName: pin.board        // Board cible
    }
  ]
};
```

### 8.4 Webhook Zernio → PinPilot

```
POST /api/v1/sites/:id/zernio/webhook

Body (envoyé par Zernio) :
{
  "postId": "zernio_post_xxx",
  "status": "published" | "failed",
  "platform": "pinterest",
  "error": null | "error message",
  "publishedAt": "2026-07-20T08:00:00Z"
}

→ PinPilot met à jour pins.status = 'published' | 'failed'
→ Le plugin WordPress reçoit la mise à jour au prochain sync
```

### 8.5 Scheduler interne (avant envoi à Zernio)

```typescript
// Logique de planification
// Input : 5 pins/article, cadence configurée (ex: 3 pins/jour, 8h-20h)
// Output : dates de publication espacées

function schedulePins(pins: Pin[], config: ScheduleConfig): Pin[] {
  const { pinsPerDay, startHour, endHour, timezone } = config;
  const availableHours = endHour - startHour;
  const intervalMinutes = (availableHours * 60) / pinsPerDay;

  let currentSlot = getNextAvailableSlot(startHour, timezone);

  return pins.map((pin, index) => {
    pin.scheduled_date = currentSlot.toISOString();
    currentSlot = addMinutes(currentSlot, intervalMinutes);

    // Si on dépasse endHour, passer au jour suivant
    if (currentSlot.getHours() >= endHour) {
      currentSlot = getNextDaySlot(startHour, timezone);
    }

    return pin;
  });
}
```

---

## 9. Data Model

### 9.1 Tables (PostgreSQL — Drizzle)

```sql
-- Site WordPress enregistré
CREATE TABLE sites (
  id TEXT PRIMARY KEY,              -- nanoid
  site_url TEXT NOT NULL,
  site_name TEXT,
  niche TEXT,
  wp_version TEXT,
  zernio_api_key_encrypted TEXT,    -- Chiffré AES-256-GCM
  zernio_pinterest_account_id TEXT, -- ID du compte Pinterest dans Zernio
  pins_per_day INTEGER DEFAULT 3,
  schedule_start_hour INTEGER DEFAULT 8,
  schedule_end_hour INTEGER DEFAULT 20,
  timezone TEXT DEFAULT 'UTC',
  credits_remaining INTEGER DEFAULT 10, -- Crédits IA offerts
  status TEXT DEFAULT 'pending',     -- pending|analyzing|ready|error
  ptra_plan JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Article WordPress
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id),
  wp_id INTEGER,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  excerpt TEXT,
  content_md TEXT,
  featured_image_url TEXT,
  categories JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  pinterest_potential INTEGER,
  content_type TEXT,
  primary_intent TEXT,
  status TEXT DEFAULT 'pending',     -- pending|analyzed|pins_generated|published
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pin généré
CREATE TABLE pins (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id),
  site_id TEXT NOT NULL REFERENCES sites(id),
  pin_title TEXT NOT NULL,
  overlay_text TEXT NOT NULL,
  description TEXT NOT NULL,
  image_prompt TEXT NOT NULL,
  image_url TEXT,
  board TEXT NOT NULL,
  intent TEXT NOT NULL,
  ptra_score INTEGER NOT NULL,
  ptra_breakdown JSONB,
  fresh_pin_rule_status TEXT DEFAULT 'fresh',
  scheduled_date TIMESTAMPTZ,
  zernio_post_id TEXT,               -- ID du post dans Zernio
  zernio_status TEXT,                -- scheduled|published|failed
  status TEXT DEFAULT 'draft',       -- draft|image_generated|scheduled|published|failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clés API utilisateur (BYOK)
CREATE TABLE user_api_keys (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id),
  provider TEXT NOT NULL,            -- deepseek|ideogram|openai
  key_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 10. Logique Métier importée du codebase `ai-blog-builder`

### 10.1 PTRA Scoring (11 facteurs, /100)

| Facteur | Points | Ce qu'il mesure |
|---|---|---|
| Micro-Niche Focus | 10 | Le pin appartient strictement à la micro-niche ? |
| Problem-Solution Fit | 10 | Problème clair + solution claire ? |
| Value-Added Fit | 10 | Le contenu de destination a une vraie valeur ? |
| Semantic Fit | 12 | Titre, description, mots-clés alignés ? |
| Visual Fit | 12 | Image correspond au sujet, angle, board ? |
| Board Fit | 10 | Le board a un rôle clair et correspond à l'intent ? |
| Destination Fit | 10 | Le pin promet uniquement ce que l'article délivre ? |
| Ethical Hook Fit | 10 | Hook éthique, spécifique, vérifiable ? |
| Consistency Fit | 8 | Renforce le graph topical global ? |
| Trend Timing | 4 | Pertinence saisonnière/temporelle ? |
| Measurement Readiness | 4 | Performance traçable et mesurable ? |

### 10.2 Pinterest Intent Taxonomy (8 intents, universels)

| Intent | Hook Pattern |
|---|---|
| `quick_solution` | "[Time] + [Result]" |
| `beginner_guide` | "Beginner-Friendly [Topic]" |
| `step_by_step` | "Step-by-Step: [Process]" |
| `mistake_avoidance` | "[N] Mistakes That Ruin [Topic]" |
| `before_after` | "Before & After: [Result]" |
| `checklist` | "[Topic] Checklist for [Outcome]" |
| `ingredient_spotlight` | "Why [Key Element] Makes [Topic] Better" — universel (pas que food) |
| `budget_friendly` | "Budget-Friendly [Solution]" |

### 10.3 Content Graph 4 Signals

- **Saves** (Engagement) ← quick_solution, step_by_step, checklist
- **Topic Relevance** ← beginner_guide, ingredient_spotlight
- **Domain Quality** ← mistake_avoidance, budget_friendly
- **Visual** (Pinterest Lens) ← before_after

### 10.4 Spécifications Images Pinterest

- Format : 2:3 (1000x1500px) vertical
- Safe zone : 8% marge extérieure (pas de texte/sujet critique)
- Overlay texte : tiers supérieur, grand, lisible, contraste élevé
- Sujet unique, contraste fond/sujet
- Pinterest Lens : texture visible, pas de clutter
- Fresh Pin Rule : chaque image = composition unique

---

## 11. Fichiers du Codebase Existant à Référencer

| Fichier | Extraire |
|---|---|
| `skills/agent-pin-designer.md` | Skill Pin Designer (adapter horizontal) |
| `ptra-editorial-architect/SKILL.md` | Framework PTRA complet |
| `lib/agents/provider.ts` | Abstraction LLM provider |
| `lib/agents/ideogram.ts` | Intégration Ideogram |
| `lib/agents/json-utils.ts` | JSON repair (jsonrepair) |
| `lib/content-validator.ts` | Validation contenu (banned words) |
| `data/pinterest-content-graph-research.md` | Deep research Content Graph |

---

## 12. Plan d'Implémentation (pour Google AI Studio)

### Phase 1 — Plugin WordPress (3-4h)
1. Structure du plugin (entry point, autoloader)
2. Menu admin + pages skeleton
3. Page settings (clés API, mapping catégories, cadence)
4. Hook `transition_post_status` → détecter publication
5. Client HTTP vers API PinPilot
6. Chiffrement clés API

### Phase 2 — API PinPilot Setup (2-3h)
7. Initialiser Next.js 16 + Drizzle + PostgreSQL
8. Créer les schémas DB (sites, articles, pins, api_keys)
9. Route `POST /api/v1/sites` (enregistrement)
10. Middleware d'authentification (clé API site)

### Phase 3 — Site Analyzer (2-3h)
11. Job Inngest `site-analyzer`
12. Fetcher WordPress REST API
13. Prompt LLM Site Analyzer
14. Route `POST /api/v1/sites/:id/analyze`

### Phase 4 — PTRA Plan Generator (2-3h)
15. Job Inngest `ptra-plan-generator`
16. Prompt PTRA Architect adapté horizontal
17. Route `GET /api/v1/sites/:id/plan`

### Phase 5 — Pin Generator (3-4h)
18. Job Inngest `pin-generator`
19. Prompt Pin Designer adapté horizontal
20. Scoring PTRA 11 facteurs
21. Routes pins (list, detail, update, delete)

### Phase 6 — Image Generator (2-3h)
22. Job Inngest `image-generator`
23. Intégration Ideogram API
24. Upload images vers R2/S3
25. Route regenerate image

### Phase 7 — Zernio Integration (2-3h)
26. Job Inngest `zernio-scheduler`
27. Client Zernio API (create post, schedule)
28. Route `GET /api/v1/sites/:id/zernio/boards` (discovery)
29. Webhook Zernio (statut publication)
30. Route `/api/v1/sites/:id/zernio/webhook`

### Phase 8 — Dashboard Plugin + Polish (2-3h)
31. Dashboard wp-admin (files d'attente, statuts)
32. Page détail pin (édition, regénération, republish)
33. Export CSV fallback
34. Sync WP-Cron (statuts Zernio → WP)
35. États vides, erreurs, logs

---

## 13. Gestion des Erreurs & Edge Cases

### WordPress
- REST API désactivée → fallback RSS
- Site non-WordPress → message clair dans le plugin
- Custom post types → support en v1.1
- Timeout requêtes WP → 30s max, retry 3x

### LLM
- Rate limit DeepSeek → retry backoff exponentiel
- JSON malformé → `jsonrepair` systématique
- Timeout 120s → fallback sur une erreur gracieuse

### Images
- Ideogram échec → retry 3x, puis marquer `failed`
- File d'attente : max 3 générations simultanées
- Stockage : URLs signées avec expiration

### Zernio
- API Zernio down → pins restent en file d'attente, retry automatique
- Pinterest account disconnected → notifier l'utilisateur dans le dashboard WP
- Rate limit Zernio → respecter `Retry-After` header

---

## 14. Prompt Global pour Google AI Studio

```
Tu es un développeur full-stack expert (PHP + Next.js). Construis le MVP de
"PinPilot" — un plugin WordPress couplé à une API de traitement IA qui automatise
la création et publication de Pins Pinterest via Zernio.

ARCHITECTURE :
1. Plugin WordPress (PHP) → UI dans wp-admin
2. API PinPilot (Next.js 16 + Vercel) → traitement IA
3. Zernio (API externe) → publication Pinterest

STACK :
- Plugin WP : PHP 8.0+, hooks WordPress natifs
- API : Next.js 16 App Router, Drizzle ORM, PostgreSQL (Neon)
- Jobs async : Inngest
- LLM : DeepSeek v4 Pro
- Images : Ideogram v4 Turbo
- Publication : Zernio REST API (zernio.com)

FLUX UTILISATEUR :
1. Installe le plugin WP → menu "PinPilot" dans wp-admin
2. Crée compte Zernio gratuit → connecte Pinterest → copie clé API
3. Colle clé Zernio + configure boards + cadence (5 min, une fois)
4. Publie un article normalement → tout le reste est automatique

COMMENCE PAR :
1. Plugin WordPress : structure, menu admin, page settings
2. API PinPilot : init Next.js, DB schema, route POST /api/v1/sites
3. Hook publish_post : détecter nouvel article → envoyer à l'API
4. Pipeline IA : analyzer → PTRA → pins → images → Zernio scheduler
5. Dashboard wp-admin : files d'attente, statuts, détails pins

SPÉCIFICATIONS DÉTAILLÉES :
[Inclure sections 5 à 13 de ce document]

LIVRABLES :
- Plugin WordPress complet (zip installable)
- API PinPilot déployable sur Vercel
- README avec instructions installation + configuration
- .env.example avec toutes les variables
- Le MVP doit fonctionner de bout en bout :
  Activation plugin → Config Zernio → Publication article → Pins sur Pinterest
```

---

## 15. Roadmap Post-MVP

| Version | Features |
|---|---|
| v1.1 | Custom post types, support ACF, détection avancée contenu |
| v1.2 | Multi-sites (un utilisateur WP gère plusieurs sites) |
| v1.3 | Analytics dashboard (impressions, saves, clics via Zernio) |
| v2.0 | Support autres CMS (Shopify, Ghost, statique) |
| v2.1 | A/B testing pins (hook A vs hook B, board A vs board B) |
| v2.2 | Mode Agency (multi-clients, tableaux de bord séparés) |
| v3.0 | Intégration native Pinterest API (sans Zernio, si approuvé) |
