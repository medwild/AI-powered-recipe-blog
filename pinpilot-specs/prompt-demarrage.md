# Prompt de démarrage — PinPilot WordPress Plugin

> Copie ce fichier EN ENTIER comme premier message dans Cline (ou Claude Code).

---

Tu construis **PinPilot**, un plugin WordPress qui automatise la création de Pins Pinterest à partir des articles de blog.

## Contexte

- Le plugin s'exécute dans l'admin WordPress (wp-admin)
- Le plugin est un **CLIENT** d'une API externe (PinPilot API) — tu ne construis PAS l'API
- L'API fait tout le travail IA lourd (LLM, images, scoring, publication)
- Le plugin collecte les articles, les envoie à l'API, affiche les résultats
- L'utilisateur installe, configure une fois, puis le plugin tourne automatiquement

## Stack

- **PHP 8.0+** — WordPress natif, pas de framework
- **JavaScript vanilla** — pas de React/Vue, on reste dans l'écosystème WP
- **CSS** — utiliser les classes WordPress natives (`wp-list-table`, `button`, `notice`)

## Ce que le plugin doit faire

1. Ajouter un menu "PinPilot" dans l'admin WP avec 6 pages
2. Page Réglages : clés API, mapping catégories→boards, cadence de publication
3. Détecter automatiquement quand un article est publié → l'envoyer à l'API
4. Dashboard avec stats et prochains pins
5. File d'attente filtrable de tous les pins
6. Page détail d'un pin (voir, éditer, regénérer l'image, supprimer)
7. Export CSV (fallback manuel)
8. Polling AJAX pour suivre l'avancement du pipeline IA

## Ordre de construction

1. `pinpilot.php` — entry point, autoloader, activation hook
2. `class-encryption.php` — chiffrement des clés API
3. `class-api-client.php` — client HTTP vers l'API
4. `class-admin-menu.php` — squelette du menu
5. `class-settings-page.php` + `settings.js` — config (sans elle, rien ne marche)
6. `class-publish-hook.php` — détection publication (cœur du produit)
7. `class-dashboard-page.php` + `dashboard.js` — dashboard
8. `class-ajax-handlers.php` — handlers AJAX
9. `class-queue-page.php` + `queue.js` — file d'attente
10. `class-pin-detail-page.php` + `pin-detail.js` — détail/édition
11. `class-export-page.php` — export CSV
12. `admin.css` — styles

## Règles absolues

- **Lis d'abord les 3 fichiers de spec** : `api-contract.md`, `plugin-spec.md`, `ptra-logic.md`
- Toutes les clés API sont chiffrées (AES-256-GCM), jamais en clair
- Tous les inputs/sorties sont sanitizés/échappés (WPCS)
- Nonces + `current_user_can('manage_options')` sur chaque requête admin
- Le LLM ne score pas les pins — le score est calculé par l'API (code déterministe)
- Si l'API est injoignable → message d'erreur dans l'admin, ne pas bloquer WordPress
- Code en anglais (variables, fonctions, commentaires) — textes utilisateur en anglais

## Structure attendue

```
pinpilot/
├── pinpilot.php
├── includes/
│   ├── class-encryption.php
│   ├── class-api-client.php
│   ├── class-admin-menu.php
│   ├── class-settings-page.php
│   ├── class-publish-hook.php
│   ├── class-dashboard-page.php
│   ├── class-ajax-handlers.php
│   ├── class-queue-page.php
│   ├── class-pin-detail-page.php
│   ├── class-export-page.php
│   └── class-plan-page.php
├── assets/
│   ├── css/admin.css
│   └── js/
│       ├── dashboard.js
│       ├── queue.js
│       ├── pin-detail.js
│       └── settings.js
└── templates/
    ├── settings-page.php
    ├── dashboard-page.php
    ├── queue-page.php
    ├── pin-detail-page.php
    ├── export-page.php
    └── plan-page.php
```

## Validation finale

Quand tu as fini, vérifie que :
- [ ] Le plugin s'active sans erreur fatale
- [ ] Le menu PinPilot apparaît dans l'admin
- [ ] La page Réglages sauvegarde la clé Zernio (chiffrée)
- [ ] Publier un article déclenche l'envoi à l'API (vérifier les logs)
- [ ] Le dashboard affiche les stats
- [ ] La file d'attente est filtrable
- [ ] On peut éditer/supprimer un pin
- [ ] L'export CSV télécharge un fichier valide
- [ ] Aucune clé API n'est visible dans le HTML ou les logs
- [ ] Tous les inputs sont validés et échappés

---

**Commence par lire `api-contract.md`, `plugin-spec.md`, et `ptra-logic.md`.**
**Puis crée les fichiers un par un dans l'ordre de construction ci-dessus.**
