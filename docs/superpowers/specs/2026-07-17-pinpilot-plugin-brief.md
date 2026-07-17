# PinPilot WordPress Plugin — Brief d'Implémentation
> **Cible**: Cline (VS Code) / Claude Code / AI Studio
> **Date**: 2026-07-17
> **Périmètre**: Plugin WordPress UNIQUEMENT (l'API PinPilot et Zernio sont hors scope)

---

## 0. Ce que tu dois construire

Un **plugin WordPress** nommé **PinPilot** qui s'installe dans `/wp-content/plugins/pinpilot/` et qui :

1. Ajoute un menu "PinPilot" dans l'admin WordPress
2. Permet à l'utilisateur de configurer sa clé API Zernio, ses boards Pinterest, et sa cadence de publication
3. Détecte automatiquement quand un article est publié et l'envoie à une **API externe PinPilot** (que tu ne construis pas — tu consommes juste ses endpoints)
4. Affiche un dashboard avec les pins générés, leur statut, et la file d'attente de publication
5. Permet l'export CSV des pins (fallback manuel)

**L'API PinPilot est une boîte noire.** Tu assumes qu'elle existe et qu'elle respecte le contrat d'API documenté ci-dessous. Tu construis le plugin comme un client de cette API.

---

## 1. Contrat API — Ce que le plugin consomme

### Base URL
```
https://api.pinpilot.dev/v1
```

### Authentification
Chaque requête inclut :
```
Authorization: Bearer {site_api_key}
X-PinPilot-Plugin: 1.0.0
```
La `site_api_key` est obtenue lors de l'enregistrement du site (étape 2 ci-dessous). Elle est stockée dans `wp_options` (chiffrée).

### Endpoints utilisés par le plugin

#### 1. Enregistrement du site
```
POST /sites
Body: {
  "site_url": "https://monsite.com",
  "site_name": "Mon Blog",
  "wp_version": "6.7"
}
Response 201: {
  "id": "site_abc123",
  "api_key": "pp_site_xxxx"   // ← Le plugin stocke ça (chiffré)
}
```

#### 2. Lancer l'analyse initiale
```
POST /sites/{site_id}/analyze
Body: { "trigger": "initial_analysis" }
Response 202: { "status": "processing" }
// Lance le pipeline complet : analyzer → PTRA plan → pins → images → Zernio
// Le plugin poll pour savoir quand c'est fini (voir endpoint 6)
```

#### 3. Envoyer un nouvel article (hook publish)
```
POST /sites/{site_id}/articles
Body: {
  "wp_id": 123,
  "title": "Titre de l'article",
  "slug": "titre-article",
  "url": "https://monsite.com/titre-article",
  "excerpt": "Extrait...",
  "content_html": "<p>Contenu HTML brut...</p>",
  "featured_image_url": "https://monsite.com/image.jpg",
  "categories": ["Cuisine", "Dîners"],
  "tags": ["poulet", "rapide"]
}
Response 202: { "status": "processing", "article_id": "art_xyz" }
```

#### 4. Lister les articles analysés
```
GET /sites/{site_id}/articles?status=all&page=1&per_page=20
Response 200: {
  "articles": [...],
  "total": 45,
  "page": 1
}
```

#### 5. Lister les pins
```
GET /sites/{site_id}/pins?status=scheduled&board=Mon+Board&article_id=art_xyz&page=1&per_page=20
Response 200: {
  "pins": [
    {
      "id": "pin_abc",
      "article_id": "art_xyz",
      "article_title": "Titre article",
      "pin_title": "Titre du pin",
      "overlay_text": "Texte overlay",
      "description": "Description SEO...",
      "image_url": "https://cdn.pinpilot.dev/images/pin_abc.jpg",
      "board": "Easy Dinners",
      "board_zernio_id": "board_123",
      "intent": "quick_solution",
      "ptra_score": 87,
      "status": "scheduled",
      "scheduled_date": "2026-07-20T08:00:00Z",
      "zernio_post_id": null
    }
  ],
  "total": 225,
  "page": 1
}
```

#### 6. Détail d'un pin
```
GET /sites/{site_id}/pins/{pin_id}
Response 200: { /* Pin object complet, comme ci-dessus */ }
```

#### 7. Modifier un pin
```
PATCH /sites/{site_id}/pins/{pin_id}
Body: {
  "pin_title": "Nouveau titre",
  "description": "Nouvelle description",
  "board": "Autre Board",
  "board_zernio_id": "board_456",
  "scheduled_date": "2026-07-21T10:00:00Z"
}
Response 200: { /* Pin mis à jour */ }
```

#### 8. Régénérer l'image d'un pin
```
POST /sites/{site_id}/pins/{pin_id}/regenerate
Response 202: { "status": "processing" }
```

#### 9. Supprimer un pin
```
DELETE /sites/{site_id}/pins/{pin_id}
Response 204: {}
```

#### 10. Récupérer le plan PTRA
```
GET /sites/{site_id}/plan
Response 200: {
  "niche_core": { "micro_niche": "...", "target_audience": "...", ... },
  "board_architecture": [
    { "name": "Easy Dinners", "zernio_id": "board_123", "role": "...", ... }
  ],
  "cluster_map": [...],
  "publishing_calendar": [...]
}
```

#### 11. Exporter les pins (CSV)
```
GET /sites/{site_id}/export?format=csv&status=scheduled
Response 200: (fichier CSV téléchargeable)
Content-Type: text/csv
Content-Disposition: attachment; filename="pinpilot-export.csv"
```

#### 12. Lister les boards Pinterest (via Zernio)
```
GET /sites/{site_id}/zernio/boards
Response 200: {
  "boards": [
    { "id": "board_123", "name": "Easy Dinners for Two", "pin_count": 45 },
    { "id": "board_456", "name": "30-Minute Meals", "pin_count": 23 }
  ]
}
```

#### 13. Statut du site (polling)
```
GET /sites/{site_id}
Response 200: {
  "id": "site_abc123",
  "status": "ready",
  "total_articles": 45,
  "total_pins": 225,
  "pins_scheduled": 180,
  "pins_published": 45,
  "pins_failed": 0
}
```

---

## 2. Structure du Plugin

```
pinpilot/
├── pinpilot.php                    # Entry point, hooks, constants
├── includes/
│   ├── class-admin-menu.php        # Menu registration + page routing
│   ├── class-settings-page.php     # Settings page render + save
│   ├── class-dashboard-page.php    # Main dashboard page
│   ├── class-queue-page.php        # Pin queue/filtering page
│   ├── class-pin-detail-page.php   # Single pin detail + edit page
│   ├── class-export-page.php       # CSV export page
│   ├── class-api-client.php        # HTTP client → PinPilot API
│   ├── class-publish-hook.php      # Hook: post published → send to API
│   ├── class-ajax-handlers.php     # WP AJAX handlers (sync, actions)
│   └── class-encryption.php        # Encrypt/decrypt API keys
├── assets/
│   ├── css/admin.css               # Admin styles
│   └── js/
│       ├── dashboard.js            # Dashboard: polling, refresh
│       ├── queue.js                # Queue page: filters, bulk actions
│       ├── pin-detail.js           # Pin detail: edit, regenerate, delete
│       └── settings.js             # Settings: board mapping, validation
└── templates/
    ├── settings-page.php
    ├── dashboard-page.php
    ├── queue-page.php
    ├── pin-detail-page.php
    └── export-page.php
```

---

## 3. Fichier par fichier — Spécifications

### 3.1 `pinpilot.php` — Entry Point

```php
<?php
/**
 * Plugin Name: PinPilot — Pinterest Auto-Pilot
 * Description: Automatise la création et publication de Pins Pinterest depuis votre contenu WordPress.
 * Version: 1.0.0
 * Author: PinPilot
 * Requires PHP: 8.0
 */

defined('ABSPATH') || exit;

define('PINPILOT_VERSION', '1.0.0');
define('PINPILOT_API_BASE', 'https://api.pinpilot.dev/v1');
define('PINPILOT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PINPILOT_PLUGIN_URL', plugin_dir_url(__FILE__));

// Autoloader simple
spl_autoload_register(function ($class) {
    $prefix = 'PinPilot_';
    if (strpos($class, $prefix) !== 0) return;
    $file = PINPILOT_PLUGIN_DIR . 'includes/class-' . str_replace(
        ['PinPilot_', '_'], ['', '-'], strtolower($class)
    ) . '.php';
    if (file_exists($file)) require_once $file;
});

// Init
add_action('plugins_loaded', function () {
    new PinPilot_Admin_Menu();
    new PinPilot_Publish_Hook();
    new PinPilot_Ajax_Handlers();
});

// Activation: register site with API
register_activation_hook(__FILE__, 'pinpilot_activate');
function pinpilot_activate() {
    $site_url = home_url();
    $site_name = get_bloginfo('name');
    // Appel API: POST /sites → reçoit site_id + api_key → chiffre et stocke
}

// Désactivation
register_deactivation_hook(__FILE__, 'pinpilot_deactivate');
```

### 3.2 `class-api-client.php` — Client HTTP

```php
class PinPilot_Api_Client {
    private $site_id;
    private $api_key;

    public function __construct() {
        $this->site_id = PinPilot_Encryption::get('pinpilot_site_id');
        $this->api_key = PinPilot_Encryption::get('pinpilot_api_key');
    }

    public function get($endpoint, $params = []) { /* GET request */ }
    public function post($endpoint, $body = []) { /* POST request */ }
    public function patch($endpoint, $body = []) { /* PATCH request */ }
    public function delete($endpoint) { /* DELETE request */ }

    private function request($method, $endpoint, $body = null) {
        $url = PINPILOT_API_BASE . $endpoint;
        $args = [
            'method' => $method,
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->api_key,
                'X-PinPilot-Plugin' => '1.0.0',
                'Content-Type' => 'application/json',
            ],
        ];
        if ($body) $args['body'] = json_encode($body);
        $response = wp_remote_request($url, $args);
        if (is_wp_error($response)) throw new Exception($response->get_error_message());
        return json_decode(wp_remote_retrieve_body($response), true);
    }
}
```

**Règles :**
- Toute erreur HTTP (4xx, 5xx) → `WP_Error` affiché dans l'admin
- Timeout 30s. Pas de retry côté plugin (l'API gère ses propres retries)
- La clé API n'est JAMAIS loggée ou exposée

### 3.3 `class-encryption.php` — Chiffrement

```php
class PinPilot_Encryption {
    public static function encrypt($value) {
        // AES-256-GCM via openssl_encrypt()
        // Clé = wp_salt('auth') (dérivée)
        // Stockage : update_option('pinpilot_xxx_encrypted', base64_encode($encrypted))
    }
    public static function decrypt($encrypted) { /* inverse */ }
    public static function set($key, $value) { self::encrypt($value); update_option($key . '_encrypted', ...); }
    public static function get($key) { return self::decrypt(get_option($key . '_encrypted')); }
}
```

### 3.4 `class-publish-hook.php` — Détection publication

```php
class PinPilot_Publish_Hook {
    public function __construct() {
        add_action('transition_post_status', [$this, 'on_post_status_change'], 10, 3);
    }

    public function on_post_status_change($new_status, $old_status, $post) {
        // Seulement quand un article passe de non-publié à publié
        if ($new_status !== 'publish' || $old_status === 'publish') return;
        // Ignorer les révisions, menus, etc.
        if (!in_array($post->post_type, ['post'])) return; // 'post', 'page' — configurable v1.1
        // Ignorer si pas configuré
        if (!PinPilot_Encryption::get('pinpilot_api_key')) return;

        // Extraire les données de l'article
        $article = [
            'wp_id' => $post->ID,
            'title' => $post->post_title,
            'slug' => $post->post_name,
            'url' => get_permalink($post),
            'excerpt' => get_the_excerpt($post),
            'content_html' => $post->post_content,
            'featured_image_url' => get_the_post_thumbnail_url($post, 'full') ?: null,
            'categories' => wp_get_post_categories($post->ID, ['fields' => 'names']),
            'tags' => wp_get_post_tags($post->ID, ['fields' => 'names']),
        ];

        try {
            $api = new PinPilot_Api_Client();
            $api->post("/sites/{$api->site_id}/articles", $article);
            // Succès silencieux — le dashboard montrera le résultat
        } catch (Exception $e) {
            error_log('[PinPilot] Failed to send article: ' . $e->getMessage());
            // Ne pas bloquer la publication WordPress
        }
    }
}
```

### 3.5 `class-admin-menu.php` — Menu et routage

```php
class PinPilot_Admin_Menu {
    public function __construct() {
        add_action('admin_menu', [$this, 'register_menus']);
    }

    public function register_menus() {
        add_menu_page(
            'PinPilot', 'PinPilot',
            'manage_options', 'pinpilot',
            [new PinPilot_Dashboard_Page(), 'render'],
            'dashicons-pinterest', 30
        );
        add_submenu_page('pinpilot', 'File d\'attente', 'File d\'attente', 'manage_options', 'pinpilot-queue', [new PinPilot_Queue_Page(), 'render']);
        add_submenu_page('pinpilot', 'Plan PTRA', 'Plan éditorial', 'manage_options', 'pinpilot-plan', [new PinPilot_Plan_Page(), 'render']);
        add_submenu_page('pinpilot', 'Export', 'Export CSV', 'manage_options', 'pinpilot-export', [new PinPilot_Export_Page(), 'render']);
        add_submenu_page('pinpilot', 'Réglages', 'Réglages', 'manage_options', 'pinpilot-settings', [new PinPilot_Settings_Page(), 'render']);
        // Pin detail: pas dans le menu (accessible depuis la queue)
        add_submenu_page(null, 'Détail Pin', 'Détail', 'manage_options', 'pinpilot-pin', [new PinPilot_Pin_Detail_Page(), 'render']);
    }
}
```

### 3.6 `class-settings-page.php` — Page Réglages

**Champs :**
1. Clé API Zernio → `pinpilot_zernio_api_key` (chiffré)
2. Clé API DeepSeek → `pinpilot_deepseek_api_key` (chiffré, optionnel)
3. Clé API Ideogram → `pinpilot_ideogram_api_key` (chiffré, optionnel)
4. Mapping catégories → boards (table dynamic)
5. Cadence : pins/jour (select 1|2|3|5|10), plage horaire (start, end), timezone
6. Bouton "Lancer l'analyse initiale" (POST /sites/{id}/analyze)

**Comportement :**
- Au chargement : appel `GET /sites/{id}/zernio/boards` → populate la dropdown des boards
- Mapping : pour chaque catégorie WP, l'utilisateur choisit un board Pinterest
- Sauvegarde : stocké en JSON dans `wp_options` (`pinpilot_category_board_map`)
- Validation : la clé Zernio est testée (appel API → si 401, erreur affichée)

### 3.7 `class-dashboard-page.php` — Dashboard Principal

**Affichage :**
```
┌─────────────────────────────────────────────┐
│ PinPilot Dashboard                          │
│                                             │
│ 📊 45 articles analysés                     │
│ 📌 225 pins générés                         │
│ ✅ 180 publiés · ⏳ 40 programmés · ❌ 5 échoués │
│                                             │
│ Prochains pins à publier :                  │
│ ┌─────────────────────────────────────────┐ │
│ │ [img] "15-Min Dinner..." → Board X      │ │
│ │       Programmé le 20/07 08:00          │ │
│ │ [img] "Budget Meal Prep..." → Board Y   │ │
│ │       Programmé le 20/07 10:40          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Voir toute la file d'attente]              │
│ [Lancer l'analyse du site]                  │
└─────────────────────────────────────────────┘
```

**Comportement :**
- Au chargement : `GET /sites/{id}` → afficher les stats
- `GET /sites/{id}/pins?status=scheduled&per_page=5` → 5 prochains pins
- Si `site.status === 'analyzing'` : afficher une spinner + "Analyse en cours..."
- AJAX polling toutes les 15s si status === 'analyzing' ou 'processing'
- Si pas encore configuré : afficher un message "Configurez PinPilot dans Réglages"

### 3.8 `class-queue-page.php` — File d'attente

**Filtres :**
- Par statut (tous | scheduled | published | failed | draft)
- Par board (dropdown, chargé depuis le plan PTRA)
- Par article (recherche par titre)
- Pagination (20 par page)

**Tableau :**
```
| Image | Titre Pin | Article | Board | Score | Statut | Date prévue | Actions |
|-------|-----------|---------|-------|-------|--------|--------------|---------|
| [img] | 15-Min... | Titre.. | Board | 87 🟢 | ⏳     | 20/07 08:00 | [Voir] [✏️] [🗑️] |
```

**Actions par lot :**
- Sélection multiple → "Reprogrammer" (choisir une nouvelle date)
- Sélection multiple → "Supprimer"
- Sélection multiple → "Publier maintenant" (POST /pins/{id}/publish)

### 3.9 `class-pin-detail-page.php` — Détail d'un Pin

**Affichage :**
```
┌──────────────────────────────────────────────┐
│ ← Retour à la file d'attente                  │
│                                               │
│ ┌─────────────┐  Titre : "15-Minute..."      │
│ │             │  Article : "Titre article"    │
│ │   IMAGE     │  Board : Easy Dinners         │
│ │   générée   │  Intent : quick_solution      │
│ │             │  Score PTRA : 87/100 🟢       │
│ │             │  Statut : ⏳ Programmée        │
│ └─────────────┘  Date : 20/07/2026 08:00     │
│                                               │
│ [Modifier] [Régénérer l'image] [Publier now]  │
│ [Supprimer]                                   │
└──────────────────────────────────────────────┘
```

**Mode édition (toggle) :**
- Champs éditables : pin_title, description, board (dropdown), scheduled_date (datetime picker)
- Bouton "Enregistrer" → `PATCH /sites/{id}/pins/{pin_id}`
- Bouton "Régénérer l'image" → `POST /sites/{id}/pins/{pin_id}/regenerate` + polling pour la nouvelle image

### 3.10 `class-export-page.php` — Export CSV

**Options :**
- Filtre par statut (tous | scheduled | published)
- Filtre par board
- Format : CSV (compatible Tailwind, Later, Buffer)

**Bouton "Télécharger CSV"** → appele `GET /sites/{id}/export?format=csv&status={filter}` → force le téléchargement.

### 3.11 `class-ajax-handlers.php` — Handlers AJAX

```php
class PinPilot_Ajax_Handlers {
    public function __construct() {
        add_action('wp_ajax_pinpilot_sync_status', [$this, 'sync_status']);
        add_action('wp_ajax_pinpilot_regenerate_pin', [$this, 'regenerate_pin']);
        add_action('wp_ajax_pinpilot_delete_pin', [$this, 'delete_pin']);
        add_action('wp_ajax_pinpilot_bulk_action', [$this, 'bulk_action']);
        add_action('wp_ajax_pinpilot_test_zernio_key', [$this, 'test_zernio_key']);
    }

    public function sync_status() {
        check_ajax_referer('pinpilot_nonce');
        $api = new PinPilot_Api_Client();
        $data = $api->get("/sites/{$api->site_id}");
        wp_send_json_success($data);
    }

    // ... autres handlers
}
```

**Tous les handlers vérifient :**
1. `check_ajax_referer('pinpilot_nonce')` (sécurité)
2. `current_user_can('manage_options')` (capabilities)
3. Try/catch → `wp_send_json_error()` en cas d'échec

---

## 4. Pages — Résumé

| Slug | Titre | Template | Description |
|---|---|---|---|
| `pinpilot` | Dashboard | `dashboard-page.php` | Stats + prochains pins + statut |
| `pinpilot-queue` | File d'attente | `queue-page.php` | Tableau filtrable de tous les pins |
| `pinpilot-pin` | Détail | `pin-detail-page.php` | Vue/edit d'un pin (param: `pin_id`) |
| `pinpilot-plan` | Plan PTRA | `plan-page.php` | Vue du plan éditorial (read-only) |
| `pinpilot-export` | Export CSV | `export-page.php` | Téléchargement CSV |
| `pinpilot-settings` | Réglages | `settings-page.php` | Configuration clés, boards, cadence |

---

## 5. JavaScript — Comportement des pages

### Dashboard (`dashboard.js`)
- `DOMContentLoaded` → fetch `GET /sites/{id}` → afficher stats
- Si `status === 'analyzing'` → polling `setInterval(15000)` → refetch
- Afficher statut en badge coloré (ready=vert, analyzing=orange, error=rouge)
- Prochains pins : render une card simple par pin (image thumbnail + titre + date)

### Queue (`queue.js`)
- Filtres : écouter `change` sur selects → recharger la liste via AJAX
- Pagination : `page` param dans l'URL → recharger
- Checkboxes : sélection multiple → boutons d'action bulk apparaissent
- Bulk delete : confirmation dialog → AJAX → refresh
- Chaque ligne : lien vers `admin.php?page=pinpilot-pin&pin_id={id}`

### Pin Detail (`pin-detail.js`)
- Mode édition : toggle des champs (readonly → editable)
- Save : validation basique (titre non vide) → PATCH API → refresh
- Regenerate image : bouton → POST API → polling 5s → afficher nouvelle image
- Delete : confirmation → DELETE API → redirect vers queue
- Publish now : confirmation → POST API → refresh

### Settings (`settings.js`)
- Load boards : au chargement → GET `/zernio/boards` → peupler dropdowns
- Mapping dynamique : bouton "+" pour ajouter une ligne catégorie↔board
- Test Zernio key : bouton "Tester" → appel API → afficher succès/échec
- Save : POST form → validation → `update_option` via AJAX

---

## 6. Styles CSS (`admin.css`)

**Design system :** Cohérent avec l'admin WordPress natif.
- Utiliser les classes WordPress : `.wp-list-table`, `.button`, `.button-primary`, `.notice`
- Couleurs : palette WordPress (bleu #2271b1, vert #00a32a, rouge #d63638)
- Badges de statut : `.pinpilot-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; }`
  - `ready` → fond vert clair, texte vert foncé
  - `analyzing` → fond orange clair, texte orange foncé
  - `error` → fond rouge clair, texte rouge foncé
- Score PTRA : barre de progression colorée
  - 0-49: rouge, 50-69: orange, 70-79: jaune, 80-89: vert, 90-100: or
- Pin cards : `.pinpilot-pin-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }`
- Responsive : flexbox grid pour les pins, collapse en 1 colonne sur mobile

---

## 7. Sécurité

1. **Tous les inputs sont validés et échappés :**
   - `sanitize_text_field()` pour les strings
   - `absint()` pour les integers
   - `wp_kses()` pour le HTML (si nécessaire)
   - `esc_url()` pour les URLs

2. **Toutes les sorties sont échappées :**
   - `esc_html()` pour le texte
   - `esc_attr()` pour les attributs HTML
   - `esc_url()` pour les URLs

3. **Nonces :** Tous les formulaires et appels AJAX utilisent `wp_nonce_field()` / `check_ajax_referer()`

4. **Capabilities :** Toutes les pages = `manage_options`. Vérifié à chaque requête.

5. **Clés API :** Jamais affichées. Stockées chiffrées. L'input de clé est de type `password`.

6. **Logs :** `error_log()` pour les erreurs uniquement. JAMAIS de clé API dans les logs.

---

## 8. États d'erreur et cas limites

| État | Comportement |
|---|---|
| API PinPilot injoignable | Message d'erreur dans l'admin : "L'API PinPilot est temporairement indisponible. Réessayez dans quelques minutes." |
| Clé Zernio invalide | Erreur sur la page settings : "Clé API Zernio invalide. Vérifiez votre clé sur zernio.com." |
| Aucun article encore analysé | Dashboard : "Aucun article analysé. Lancez l'analyse initiale dans Réglages." |
| Aucun pin généré | Queue : "Aucun pin trouvé. Publiez un article pour générer vos premiers pins." |
| Site non configuré | Dashboard : "Configurez PinPilot dans Réglages avant de commencer." |
| Aucune catégorie WordPress | Settings : ne pas afficher le mapping (pas de catégories à mapper) |
| wp-cron désactivé | Pas bloquant. Le dashboard utilise AJAX polling. |
| PHP < 8.0 | Message d'erreur à l'activation : "PinPilot nécessite PHP 8.0 ou supérieur." |

---

## 9. Ordre de construction (recommandé)

1. **`pinpilot.php`** — entry point, autoloader, activation hook
2. **`class-encryption.php`** — chiffrement des clés (nécessaire partout)
3. **`class-api-client.php`** — client HTTP (nécessaire partout)
4. **`class-admin-menu.php`** — squelette du menu
5. **`class-settings-page.php`** + `settings.js` — page de config (sans elle, rien ne marche)
6. **`class-publish-hook.php`** — détection de publication (cœur du produit)
7. **`class-dashboard-page.php`** + `dashboard.js` — dashboard principal
8. **`class-ajax-handlers.php`** — handlers AJAX (sync, actions)
9. **`class-queue-page.php`** + `queue.js` — file d'attente
10. **`class-pin-detail-page.php`** + `pin-detail.js` — détail/édition
11. **`class-export-page.php`** — export CSV
12. **`assets/css/admin.css`** — styles
13. **Tests** — installer sur un WordPress local, configurer, publier un article, vérifier

---

## 10. Prompt de démarrage pour Cline

```
Tu construis PinPilot, un plugin WordPress qui automatise la création de
Pins Pinterest. Lis TOUT le fichier BRIEF.md avant de commencer.

Contexte :
- Le plugin est un CLIENT d'une API externe (PinPilot API) — tu ne construis
  pas l'API. Le contrat API est documenté dans la Section 1.
- Le plugin s'exécute dans l'admin WordPress (wp-admin).
- L'utilisateur installe, configure une fois (clé Zernio, boards, cadence),
  puis le plugin tourne automatiquement.

Stack :
- PHP 8.0+ (WordPress natif — pas de framework)
- JavaScript vanilla (pas de React/Vue — on reste dans l'écosystème WP)
- CSS simple (utiliser les classes WordPress existantes)

Commence par :
1. Créer la structure de fichiers complète
2. Écrire pinpilot.php (entry point, activation hook, autoloader)
3. Écrire le client API (class-api-client.php)
4. Continuer dans l'ordre de la Section 9

Pour chaque fichier, suis les spécifications de la Section 3.
Les endpoints API sont documentés dans la Section 1.
Les cas d'erreur sont dans la Section 8.
Les règles de sécurité sont dans la Section 7.
```
