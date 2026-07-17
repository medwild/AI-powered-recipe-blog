# Contrat API PinPilot
> Ce que le plugin WordPress consomme — endpoints, requêtes, réponses.

---

## Base

```
URL: https://api.pinpilot.dev/v1
Auth: Authorization: Bearer {site_api_key}
      X-PinPilot-Plugin: 1.0.0
```

La `site_api_key` est obtenue à l'activation du plugin (endpoint 1). Elle est stockée chiffrée dans `wp_options`.

---

## 1. Enregistrer le site

```
POST /sites
Body: {
  "site_url": "https://monsite.com",
  "site_name": "Mon Blog",
  "wp_version": "6.7"
}
Response 201: {
  "id": "site_abc123",
  "api_key": "pp_site_xxxx"
}
```
→ Appelé UNE fois à l'activation du plugin.
→ Stocker `id` et `api_key` (chiffré).

---

## 2. Statut du site

```
GET /sites/{site_id}
Response 200: {
  "id": "site_abc123",
  "site_url": "https://monsite.com",
  "site_name": "Mon Blog",
  "niche": "Food & Recipes",
  "status": "ready",              // pending | analyzing | ready | error
  "pins_per_day": 3,
  "schedule_start_hour": 8,
  "schedule_end_hour": 20,
  "timezone": "Europe/Paris",
  "total_articles": 45,
  "total_pins": 225,
  "pins_scheduled": 40,
  "pins_published": 180,
  "pins_failed": 5,
  "credits_remaining": 10
}
```
→ Utilisé par le dashboard pour les stats.
→ Si `status === 'analyzing'` → polling 15s.

---

## 3. Lancer l'analyse initiale

```
POST /sites/{site_id}/analyze
Body: { "trigger": "initial_analysis" }
Response 202: { "status": "processing" }
```
→ Lance le pipeline IA complet (analyse site → plan → pins → images → Zernio).
→ Le dashboard poll pour savoir quand c'est fini.

---

## 4. Envoyer un nouvel article

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
Response 202: {
  "status": "processing",
  "article_id": "art_xyz"
}
```
→ Appelé automatiquement via le hook `transition_post_status`.
→ Envoyer le HTML brut (pas de conversion côté plugin).

---

## 5. Lister les articles

```
GET /sites/{site_id}/articles?status=all&page=1&per_page=20
Response 200: {
  "articles": [
    {
      "id": "art_xxx",
      "wp_id": 123,
      "title": "Titre article",
      "url": "https://monsite.com/titre-article",
      "categories": ["Cuisine"],
      "pinterest_potential": 85,
      "content_type": "recipe",
      "status": "pins_generated",
      "pin_count": 5,
      "created_at": "2026-07-17T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "per_page": 20
}
```
→ `status` : all | pending | analyzed | pins_generated.
→ `pin_count` : nombre de pins générés pour cet article.

---

## 6. Lister les pins

```
GET /sites/{site_id}/pins?status=all&board=Mon+Board&article_id=art_xyz&page=1&per_page=20
Response 200: {
  "pins": [
    {
      "id": "pin_abc",
      "article_id": "art_xyz",
      "article_title": "Titre article",
      "pin_title": "15-Minute Dinner for Two",
      "overlay_text": "15-Min Dinner",
      "description": "Quick and easy dinner recipe...",
      "image_url": "https://cdn.pinpilot.dev/images/pin_abc.jpg",
      "board": "Easy Dinners",
      "board_zernio_id": "board_123",
      "intent": "quick_solution",
      "ptra_score": 87,
      "ptra_breakdown": {
        "semantic_fit": 8,
        "board_fit": 9,
        "fresh_pin_rule": 10,
        "ethical_hook": 8,
        "destination_fit": 9
      },
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
→ `status` : all | draft | image_generated | scheduled | published | failed.
→ `board` : filtrer par nom de board (URL-encodé).
→ Tous les query params sont optionnels.

---

## 7. Détail d'un pin

```
GET /sites/{site_id}/pins/{pin_id}
Response 200: { /* mêmes champs qu'un élément du tableau ci-dessus */ }
Response 404: { "error": "not_found" }
```

---

## 8. Modifier un pin

```
PATCH /sites/{site_id}/pins/{pin_id}
Body: {
  "pin_title": "Nouveau titre",
  "description": "Nouvelle description",
  "board": "Autre Board",
  "board_zernio_id": "board_456",
  "scheduled_date": "2026-07-21T10:00:00Z"
}
Response 200: { /* pin mis à jour */ }
Response 400: { "error": "already_published", "message": "Impossible de modifier un pin déjà publié" }
```
→ Tous les champs du body sont optionnels (envoyer seulement ceux modifiés).

---

## 9. Régénérer l'image d'un pin

```
POST /sites/{site_id}/pins/{pin_id}/regenerate
Response 202: { "status": "processing" }
```
→ L'API regénère une nouvelle image via Ideogram.
→ Le pin passe en `draft` → `image_generated` quand c'est fait.

---

## 10. Publier maintenant (force)

```
POST /sites/{site_id}/pins/{pin_id}/publish
Response 202: { "status": "processing" }
```
→ Ignore le scheduler, envoie directement à Zernio.

---

## 11. Supprimer un pin

```
DELETE /sites/{site_id}/pins/{pin_id}
Response 204: {}
Response 400: { "error": "already_published" }
```
→ Impossible si le pin est déjà publié.

---

## 12. Lister les boards Pinterest (via Zernio)

```
GET /sites/{site_id}/zernio/boards
Response 200: {
  "boards": [
    { "id": "board_123", "name": "Easy Dinners for Two", "pin_count": 45 },
    { "id": "board_456", "name": "30-Minute Meals", "pin_count": 23 },
    { "id": "board_789", "name": "Budget-Friendly Dinners", "pin_count": 12 }
  ],
  "pinterest_account_id": "pinterest_acc_xxx"
}
Response 502: { "error": "zernio_auth_failed", "message": "Clé API Zernio invalide" }
```
→ Appelé au chargement de la page Réglages pour peupler les dropdowns de mapping.

---

## 13. Récupérer le plan PTRA

```
GET /sites/{site_id}/plan
Response 200: {
  "niche_core": {
    "micro_niche": "Easy Weeknight Dinners",
    "target_audience": "Couples cooking at home",
    "user_problem": "...",
    "solution_promise": "...",
    "primary_pinterest_intent": "quick_solution",
    "content_positioning": "..."
  },
  "board_architecture": [
    {
      "name": "Easy Dinners for Two",
      "zernio_id": "board_123",
      "role": "Primary board for quick weeknight meals",
      "allowed_content": ["quick_solution", "beginner_guide"]
    }
  ],
  "cluster_map": [
    {
      "cluster_name": "One-Pan Meals",
      "priority": "high",
      "primary_board": "Easy Dinners for Two",
      "problem": "No time to cook after work",
      "solution": "One-pan meals ready in 30 minutes"
    }
  ],
  "publishing_calendar": [
    {
      "week": 1,
      "focus_cluster": "One-Pan Meals",
      "pins_count": 15
    }
  ]
}
Response 404: { "error": "no_plan" }
```
→ Affichage read-only dans la page Plan PTRA.

---

## 14. Exporter les pins (CSV)

```
GET /sites/{site_id}/export?format=csv&status=scheduled
Response 200:
  Content-Type: text/csv
  Content-Disposition: attachment; filename="pinpilot-export-2026-07-17.csv"

  pin_title,description,image_url,board,link,scheduled_date
  "Titre 1","Description 1","https://...","Board A","https://...","2026-07-20T08:00:00Z"
  "Titre 2","Description 2","https://...","Board B","https://...","2026-07-20T10:40:00Z"
```
→ `status` : scheduled | all (default: scheduled).
→ Le plugin force le téléchargement du CSV.

---

## Codes d'erreur globaux

| Code | Signification |
|---|---|
| 401 | Clé API site invalide ou manquante |
| 404 | Ressource non trouvée |
| 400 | Requête invalide (body/params incorrects) |
| 429 | Rate limit dépassé (60 req/min) |
| 500 | Erreur interne |
| 502 | Erreur Zernio (clé invalide, API down) |
| 503 | API PinPilot en maintenance |

Tous les corps d'erreur suivent le format : `{ "error": "code_erreur", "message": "Description lisible" }`
