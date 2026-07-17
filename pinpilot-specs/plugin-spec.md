# Plugin WordPress — Spécifications Détaillées
> 24 fichiers, 6 pages admin, 8 handlers AJAX

---

## 1. `pinpilot.php` — Entry Point

```php
<?php
/**
 * Plugin Name: PinPilot — Pinterest Auto-Pilot
 * Description: Automatically creates and publishes Pinterest Pins from your WordPress content.
 * Version: 1.0.0
 * Author: PinPilot
 * Requires PHP: 8.0
 */

defined('ABSPATH') || exit;

define('PINPILOT_VERSION', '1.0.0');
define('PINPILOT_API_BASE', 'https://api.pinpilot.dev/v1');
define('PINPILOT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PINPILOT_PLUGIN_URL', plugin_dir_url(__FILE__));
```

**Autoloader :** `spl_autoload_register` — transforme `PinPilot_Api_Client` → `includes/class-api-client.php`.

**Activation :** `register_activation_hook` → appelle `POST /sites` → récupère `{ id, api_key }` → stocke chiffré (`pinpilot_site_id`, `pinpilot_api_key`).

**Désactivation :** cleanup optionnel (garder les données pour réactivation).

**Init :** instancie `PinPilot_Admin_Menu`, `PinPilot_Publish_Hook`, `PinPilot_Ajax_Handlers` sur `plugins_loaded`.

---

## 2. `class-encryption.php` — Chiffrement

```php
class PinPilot_Encryption {
    // Méthode : AES-256-GCM via openssl_encrypt()
    // Clé dérivée de wp_salt('auth') (hashée SHA-256)
    // Stockage : update_option('pinpilot_xxx', base64_encode($iv . $tag . $ciphertext))

    public static function encrypt(string $value): string { ... }
    public static function decrypt(string $encrypted): string { ... }
    public static function set(string $key, string $value): void { ... }
    public static function get(string $key): ?string { ... }
    public static function delete(string $key): void { ... }
}
```

**Règles :**
- Chaque valeur chiffrée a son propre IV (aléatoire, 12 bytes)
- Tag GCM (16 bytes) préfixé au ciphertext
- Si `openssl_encrypt` échoue → `WP_Error`
- Si décryptage échoue → `null`

---

## 3. `class-api-client.php` — Client HTTP

```php
class PinPilot_Api_Client {
    private string $site_id;
    private string $api_key;

    public function __construct() {
        $this->site_id = PinPilot_Encryption::get('pinpilot_site_id');
        $this->api_key = PinPilot_Encryption::get('pinpilot_api_key');
    }

    public function get(string $endpoint, array $params = []): array { ... }
    public function post(string $endpoint, array $body = []): array { ... }
    public function patch(string $endpoint, array $body = []): array { ... }
    public function delete(string $endpoint): array { ... }

    private function request(string $method, string $endpoint, ?array $body): array {
        $url = PINPILOT_API_BASE . $endpoint;
        if (!empty($params)) $url .= '?' . http_build_query($params);

        $args = [
            'method'  => $method,
            'timeout' => 30,
            'headers' => [
                'Authorization'      => 'Bearer ' . $this->api_key,
                'X-PinPilot-Plugin'  => '1.0.0',
                'Content-Type'       => 'application/json',
            ],
        ];
        if ($body) $args['body'] = wp_json_encode($body);

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            throw new RuntimeException('API PinPilot injoignable : ' . $response->get_error_message());
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($code >= 400) {
            $message = $body['message'] ?? 'Erreur API ' . $code;
            throw new RuntimeException($message, $code);
        }

        return $body ?? [];
    }
}
```

**Règles :**
- Timeout 30s, pas de retry côté plugin
- Erreur → exception attrapée par l'appelant
- Le body est TOUJOURS envoyé en JSON
- La clé API n'est JAMAIS loggée

---

## 4. `class-admin-menu.php` — Menu

```php
class PinPilot_Admin_Menu {
    public function __construct() {
        add_action('admin_menu', [$this, 'register']);
    }

    public function register(): void {
        add_menu_page(
            'PinPilot', 'PinPilot',
            'manage_options', 'pinpilot',
            [new PinPilot_Dashboard_Page(), 'render'],
            'dashicons-pinterest', 30
        );
        add_submenu_page('pinpilot', 'Queue', 'Queue', 'manage_options', 'pinpilot-queue', [new PinPilot_Queue_Page(), 'render']);
        add_submenu_page('pinpilot', 'PTRA Plan', 'Editorial Plan', 'manage_options', 'pinpilot-plan', [new PinPilot_Plan_Page(), 'render']);
        add_submenu_page('pinpilot', 'Export', 'Export CSV', 'manage_options', 'pinpilot-export', [new PinPilot_Export_Page(), 'render']);
        add_submenu_page('pinpilot', 'Settings', 'Settings', 'manage_options', 'pinpilot-settings', [new PinPilot_Settings_Page(), 'render']);
        add_submenu_page(null, 'Pin Detail', 'Detail', 'manage_options', 'pinpilot-pin', [new PinPilot_Pin_Detail_Page(), 'render']);
    }
}
```

---

## 5. `class-settings-page.php` — Réglages

**Template :** `templates/settings-page.php`

**Champs :**
1. **Clé API Zernio** — input type `password`, placeholder `zrn_...`
2. **Clé API DeepSeek** (optionnelle) — input `password`, placeholder `sk-...`
3. **Clé API Ideogram** (optionnelle) — input `password`
4. **Mapping catégories → boards** — tableau dynamique :
   ```
   Catégorie WP          → Board Pinterest
   [Cuisine           ▼] → [Easy Dinners for Two    ▼]
   [Voyages           ▼] → [Travel Inspiration      ▼]
   [+ Ajouter une ligne]
   ```
   Les dropdowns de boards sont peuplés via `GET /zernio/boards` au chargement.
5. **Cadence** — pins/jour (select: 1|2|3|5|10), start hour, end hour, timezone
6. **Bouton "Lancer l'analyse initiale"** — `POST /analyze`
7. **Bouton "Tester la connexion Zernio"** — appelle `GET /zernio/boards`, affiche succès/échec

**Sauvegarde :**
- Clés API → chiffrées dans `wp_options`
- Mapping catégories → JSON dans `wp_options` (`pinpilot_category_board_map`)
- Cadence → envoyé à l'API via `PATCH /sites/{id}` (future route ou settings sync)

**JavaScript (`settings.js`) :**
- `DOMContentLoaded` → `GET /zernio/boards` → peupler dropdowns
- Bouton "Tester Zernio" → AJAX `pinpilot_test_zernio_key` → afficher notice
- Bouton "Analyse initiale" → confirmation dialog → AJAX `pinpilot_analyze_site` → redirect dashboard
- Bouton "+" → ajouter une ligne de mapping dynamique
- Validation : clé Zernio requise avant de pouvoir sauvegarder

---

## 6. `class-publish-hook.php` — Détection Publication

```php
class PinPilot_Publish_Hook {
    public function __construct() {
        add_action('transition_post_status', [$this, 'handle'], 10, 3);
    }

    public function handle(string $new_status, string $old_status, WP_Post $post): void {
        // Seulement "draft → publish" (pas "publish → publish" sur update)
        if ($new_status !== 'publish' || $old_status === 'publish') return;
        // Type de post configurable : pour le MVP, 'post' uniquement
        if ($post->post_type !== 'post') return;
        // Vérifier que le plugin est configuré
        if (!PinPilot_Encryption::get('pinpilot_api_key')) return;

        try {
            $api = new PinPilot_Api_Client();
            $article = [
                'wp_id'              => $post->ID,
                'title'              => $post->post_title,
                'slug'               => $post->post_name,
                'url'                => get_permalink($post),
                'excerpt'            => get_the_excerpt($post),
                'content_html'       => $post->post_content,
                'featured_image_url' => get_the_post_thumbnail_url($post, 'full') ?: null,
                'categories'         => wp_get_post_categories($post->ID, ['fields' => 'names']),
                'tags'               => wp_get_post_tags($post->ID, ['fields' => 'names']),
            ];
            $api->post("/sites/{$api->getSiteId()}/articles", $article);
        } catch (Exception $e) {
            error_log('[PinPilot] Failed to send article #' . $post->ID . ': ' . $e->getMessage());
            // Ne jamais bloquer la publication WordPress
        }
    }
}
```

---

## 7. `class-dashboard-page.php` — Dashboard

**Template :** `templates/dashboard-page.php`

**Affichage :**
- 4 cartes de statistiques : articles, pins total, publiés, en erreur
- Si `status === 'analyzing'` : spinner + "AI is analyzing your content..."
- Tableau des 5 prochains pins programmés
- Si non configuré : CTA "Configurez PinPilot dans Settings"

**JavaScript (`dashboard.js`) :**
- `DOMContentLoaded` → `GET /sites/{id}` → afficher stats
- Si `status === 'analyzing'` → `setInterval(pollStatus, 15000)`
- Fonction `pollStatus()` → `GET /sites/{id}` → mise à jour des stats + badges
- Si `status === 'ready'` → arrêter le polling, afficher les stats
- Bouton "Voir la file d'attente" → lien vers `admin.php?page=pinpilot-queue`

---

## 8. `class-ajax-handlers.php` — Handlers AJAX

8 handlers, tous protégés par `check_ajax_referer('pinpilot_nonce')` + `current_user_can('manage_options')` :

| Action | Rôle |
|---|---|
| `pinpilot_sync_status` | `GET /sites/{id}` → retourne JSON |
| `pinpilot_regenerate_pin` | `POST /sites/{id}/pins/{pin_id}/regenerate` |
| `pinpilot_delete_pin` | `DELETE /sites/{id}/pins/{pin_id}` |
| `pinpilot_publish_now` | `POST /sites/{id}/pins/{pin_id}/publish` |
| `pinpilot_update_pin` | `PATCH /sites/{id}/pins/{pin_id}` |
| `pinpilot_bulk_action` | Loop sur les pin_ids → action (delete/publish) |
| `pinpilot_load_queue` | `GET /sites/{id}/pins?status=...&board=...&page=...` → HTML |
| `pinpilot_test_zernio_key` | `GET /sites/{id}/zernio/boards` → succès/échec |
| `pinpilot_refresh_boards` | `GET /sites/{id}/zernio/boards` → options HTML |
| `pinpilot_analyze_site` | `POST /sites/{id}/analyze` |

---

## 9. `class-queue-page.php` — File d'attente

**Template :** `templates/queue-page.php`

**Filtres (barre horizontale) :**
- Statut : All | Scheduled | Published | Failed | Draft
- Board : dropdown (chargé depuis l'API au chargement)
- Recherche par titre d'article (input text + bouton Search)

**Tableau :**
```
[☐] | Image | Pin Title | Article | Board | Score | Status | Scheduled | Actions
[☐] | [img] | 15-Min... | Titre.. | Board | 87 🟢 | ⏳ Sch. | 20/07 08:00 | [View] [✏️] [🗑️]
```

**Checkbox + Actions par lot :**
- "Reprogrammer" → date picker → PATCH par lot
- "Publier maintenant" → POST publish par lot
- "Supprimer" → DELETE par lot (avec confirmation)

**JavaScript (`queue.js`) :**
- Filtres : `change` sur selects → AJAX `pinpilot_load_queue` → remplacer le tableau
- Pagination : liens `page=X` → AJAX reload
- Checkbox "select all" → coche/décoche toutes les lignes
- Bulk actions : bouton → confirmation → AJAX `pinpilot_bulk_action` → reload

---

## 10. `class-pin-detail-page.php` — Détail Pin

**Template :** `templates/pin-detail-page.php`

**Affichage :**
- Colonne gauche : image du pin (grand format)
- Colonne droite :
  - Pin title
  - Article lié (lien cliquable)
  - Board
  - Intent
  - Score PTRA avec barre colorée
  - Statut (badge)
  - Date programmée
  - Description SEO

**Boutons d'action :**
- [Edit] → toggle mode édition
- [Regenerate Image] → AJAX → polling 5s
- [Publish Now] → AJAX → confirmation
- [Delete] → AJAX → confirmation → redirect queue

**Mode édition :**
- pin_title, description, board (dropdown), scheduled_date → éditables
- Enregistrer → `PATCH /sites/{id}/pins/{pin_id}` → refresh

**JavaScript (`pin-detail.js`) :**
- Toggle edit → `display: none/block` sur les spans vs inputs
- Save → validation basique → `pinpilot_update_pin` → refresh
- Regenerate → `pinpilot_regenerate_pin` → polling `setInterval(5000)` jusqu'à `image_generated`
- Delete → `confirm()` → `pinpilot_delete_pin` → `window.location = queue`
- Publish now → `confirm()` → `pinpilot_publish_now` → refresh

---

## 11. `class-export-page.php` — Export CSV

**Template :** `templates/export-page.php`

**Options :**
- Radio : Scheduled pins only | All pins
- Radio : All boards | Board spécifique (dropdown)

**Bouton "Download CSV"** → `GET /sites/{id}/export?format=csv&status={selected}` → force download.

---

## 12. `class-plan-page.php` — Plan PTRA

**Template :** `templates/plan-page.php`

**Affichage read-only :**
- Niche Core (micro-niche, audience, problème, solution)
- Board Architecture (tableau : nom, rôle, contenu autorisé)
- Cluster Map (tableau : cluster, priorité, board primaire, problème/solution)
- Publishing Calendar (4 semaines, cluster focus, nombre de pins)

Si pas de plan → "Aucun plan éditorial. Lancez l'analyse initiale dans Settings."

---

## 13. `admin.css` — Styles

**Design system WordPress natif :**
- Utiliser `.wp-list-table` pour les tableaux
- `.button`, `.button-primary` pour les actions
- `.notice`, `.notice-success`, `.notice-error` pour les messages
- Palette WP : `#2271b1` (bleu), `#00a32a` (vert), `#d63638` (rouge), `#f0ad4e` (orange)

**Badges de statut :**
```css
.pinpilot-badge {
    display: inline-block; padding: 3px 10px; border-radius: 4px;
    font-size: 12px; font-weight: 600;
}
.pinpilot-badge--ready    { background: #edfaef; color: #1e7b2c; }
.pinpilot-badge--analyzing { background: #fef3e2; color: #b85c00; }
.pinpilot-badge--error    { background: #fde8ec; color: #b3243b; }
.pinpilot-badge--pending  { background: #f0f0f1; color: #646970; }
```

**Barre de score PTRA (5 couleurs) :**
```css
.pinpilot-score { height: 8px; border-radius: 4px; }
.pinpilot-score--excellent { background: #f1c40f; } /* 90-100 or */
.pinpilot-score--strong    { background: #00a32a; } /* 80-89 vert */
.pinpilot-score--acceptable { background: #f0ad4e; } /* 70-79 jaune */
.pinpilot-score--weak      { background: #e67e22; } /* 50-69 orange */
.pinpilot-score--reject    { background: #d63638; } /* 0-49 rouge */
```

**Cartes de pins (dashboard + queue) :**
```css
.pinpilot-pin-card {
    border: 1px solid #dcdcde; border-radius: 8px; padding: 12px;
    background: #fff; display: flex; gap: 12px; align-items: center;
}
.pinpilot-pin-card img { width: 60px; height: 90px; object-fit: cover; border-radius: 4px; }
```

**Responsive :**
```css
@media (max-width: 782px) {
    .pinpilot-pin-card { flex-direction: column; }
    .pinpilot-dashboard-grid { grid-template-columns: 1fr; }
}
```

---

## 14. Templates — Notes

Chaque template est un fichier PHP standalone inclus depuis la classe correspondante :

```php
public function render(): void {
    $api = new PinPilot_Api_Client();
    $data = $api->get("/sites/{$api->getSiteId()}");
    $nonce = wp_create_nonce('pinpilot_nonce');
    include PINPILOT_PLUGIN_DIR . 'templates/dashboard-page.php';
}
```

**Règles templates :**
- Toujours échapper les sorties : `esc_html($data['title'])`, `esc_attr($value)`, `esc_url($url)`
- Jamais de logique métier dans les templates — juste de l'affichage
- Les templates reçoivent les données via des variables PHP (pas d'accès direct à `$_GET`/`$_POST`)

---

## 15. Sécurité — Checklist

- [ ] `current_user_can('manage_options')` sur chaque page admin
- [ ] `wp_verify_nonce()` sur chaque traitement de formulaire
- [ ] `check_ajax_referer()` sur chaque handler AJAX
- [ ] `sanitize_text_field()` sur tous les inputs texte
- [ ] `esc_html()`, `esc_attr()`, `esc_url()` sur toutes les sorties
- [ ] Inputs clés API : `type="password"` + `autocomplete="off"`
- [ ] Clés API chiffrées dans `wp_options` — jamais en clair
- [ ] `error_log()` pour les erreurs uniquement — jamais de clés dans les logs

---

## 16. États d'erreur — Messages utilisateur

| État | Message |
|---|---|
| API PinPilot injoignable | "PinPilot API is temporarily unavailable. Please try again in a few minutes." |
| Clé Zernio invalide | "Invalid Zernio API key. Please check your key at zernio.com." |
| Aucun article analysé | "No articles analyzed yet. Launch the initial analysis in Settings." |
| Aucun pin généré | "No pins found. Publish an article to generate your first pins." |
| Plugin non configuré | "Configure PinPilot in Settings before getting started." |
| Pin déjà publié (modification) | "This pin has already been published and cannot be modified." |
| Pin déjà publié (suppression) | "This pin has already been published and cannot be deleted." |
| Crédits IA épuisés | "AI credits exhausted. Please add your own API keys in Settings." |
