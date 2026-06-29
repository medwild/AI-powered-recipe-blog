# Rapport de Refacto — Fire-and-Forget + Inngest

## Vue d'ensemble

Deux refactos successifs pour rendre le workflow de génération de recettes fiable et observable :

1. **Fire-and-Forget with Polling** — Éviter les timeouts HTTP en retournant immédiatement
2. **Migration Inngest** — Remplacer `waitUntil` par un background job engine fiable

---

## Étape 1 — Fire-and-Forget + Polling

### Problème initial

La route `POST /api/recipes/generate` exécutait le workflow multi-agents (Serper + Cloudflare AI Texte + Cloudflare AI Image + Cloudinary) de manière synchrone, bloquant la réponse HTTP pendant ~30s.

### Solution

**Architecture :**
```
Client → [POST /generate] → réponse immédiate { id, status: "generating" }
                                │
                                ╰→ waitUntil(runWorkflow) en arrière-plan

Client → [GET /:id/status] → polling toutes les 2s
                                │
                                ╰→ { status, workflowLog } ← mise à jour en direct
```

**Fichiers modifiés/créés :**

| Fichier | Action | Description |
|---------|--------|-------------|
| `package.json` | Modifié | Ajout de `@vercel/functions` aux dépendances |
| `app/api/recipes/generate/route.ts` | Modifié | Fire-and-forget avec `waitUntil` de Vercel |
| `app/api/recipes/[id]/status/route.ts` | Créé | Nouvel endpoint de statut pour le polling |
| `components/dashboard/recipe-generator.tsx` | Modifié | Polling temps réel avec logs dans le toast |

### Détails du polling

- Intervalle : 2 secondes
- Maximum : 150 tentatives (5 min)
- Affichage des logs en direct dans un toast sonner mis à jour par ID
- Nettoyage au démontage (`mountedRef` + `clearTimeout`)
- Gestion des statuts : `draft`, `error`, `generating`

---

## Étape 2 — Migration Inngest

### Problème

`waitUntil` de Vercel n'est pas robuste en production :
- Pas de retry automatique en cas d'échec d'une étape
- Pas d'observabilité (dashboard)
- Risque de cold kill si l'instance serverless est recyclée
- Impossibilité d'annuler un workflow en cours

### Solution

**Architecture Inngest :**
```
Client → [POST /generate] → inngest.send("recipe/generate") → réponse immédiate
                                │
                                ╰→ Inngest engine exécute generate-recipe
                                    │ step.run("analyze-serp")      → retry si échec
                                    │ step.run("generate-content")  → retry si échec
                                    │ step.run("generate-image")    → retry si échec
                                    │ step.run("upload-image")      → retry si échec
                                    │ step.run("persist-draft")     → retry si échec
                                    ╰→ Observable via dashboard Inngest

Client → [POST /:id/cancel] → inngest.send("recipe/cancel")
                                │
                                ╰→ cancelOn match → arrêt du run
                                ╰→ DB status → "cancelled"

Client → [GET /:id/status] → polling (inchangé)
```

### Fichiers créés

| Fichier | Description |
|---------|-------------|
| `lib/inngest/client.ts` | Client Inngest v4 singleton |
| `lib/inngest/functions/generate-recipe.ts` | Fonction Inngest avec `step.run()` pour chaque étape |
| `app/api/inngest/route.ts` | Serveur Inngest (GET, POST, PUT) |
| `app/api/recipes/[id]/cancel/route.ts` | Endpoint d'annulation de workflow |

### Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `app/api/recipes/generate/route.ts` | `waitUntil(runWorkflow(...))` → `inngest.send({ name: "recipe/generate", ... })` |
| `app/actions/recipes.ts` | Nouvelle `cancelRecipe()` avec import direct inngest + DB (anti-pattern fetch évité) |
| `components/dashboard/recipe-row.tsx` | Bouton d'annulation pour statut "generating", styles pour "cancelled"/"failed" |
| `components/dashboard/recipe-generator.tsx` | Gestion des statuts "cancelled" et "failed" dans le polling |
| `lib/agents/workflow.ts` | `runWorkflow` marqué `@deprecated` |

### Fonction Inngest — Détails

**Configuration :**
- `triggers: [{ event: "recipe/generate" }]` (API Inngest v4)
- `cancelOn: [{ event: "recipe/cancel", match: "data.recipeId" }]` — annulation par matching d'événement

**Étapes :**
1. `step.run("analyze-serp")` — Appel Serper.dev + log DB
2. `step.run("generate-content")` — Cloudflare AI Llama 3.1 + log DB
3. `step.run("generate-image")` — Cloudflare AI Stable Diffusion (Buffer sérialisé)
4. `step.run("upload-image")` — Upload Cloudinary
5. `step.run("persist-draft")` — Sauvegarde complète en DB + log

**Sécurité :**
- Le catch vérifie que le statut n'est pas déjà `"cancelled"` avant d'écrire `"failed"` (empêche l'écrasement d'une annulation utilisateur)
- Buffer converti en `number[]` pour la sérialisation `step.run()`, puis reconstruit

### Endpoint d'annulation

**Route :** `POST /api/recipes/:id/cancel`

**Ordre des opérations (anti-race-condition) :**
1. Mise à jour DB → `status: "cancelled"` (visible immédiatement par le frontend)
2. Envoi event `recipe/cancel` à Inngest (arrête le run via `cancelOn`)

**Doublon intentionnel :** La server action `cancelRecipe()` et la route API font la même logique. La server action est utilisée par le frontend (import direct inngest + DB, pas de fetch vers soi-même). La route API existe pour usage externe (curl, webhooks).

---

## Packages ajoutés

| Package | Version | Utilité |
|---------|---------|---------|
| `@vercel/functions` | Dernière | `waitUntil` pour le premier refacto (etape 1) |
| `inngest` | 4.7.0 | Background job engine fiable (etape 2) |

---

## Nouveau flux complet

```
1. Client → [POST /api/recipes/generate]
   → Création DB (status: "generating")
   → inngest.send({ name: "recipe/generate", data: { recipeId, keyword } })
   → Réponse immédiate { id, status: "generating" }

2. Boucle de polling toutes les 2s :
   Client → [GET /api/recipes/:id/status]
   Réponse : { status, workflowLog }

3a. Succès :
   Statut → "draft"
   Toast "Brouillon prêt" + router.refresh()

3b. Échec définitif (après retries Inngest) :
   Statut → "failed"
   Toast "Erreur" + router.refresh()

3c. Annulation par l'utilisateur :
   [POST /api/recipes/:id/cancel]
   DB → "cancelled"
   inngest.send({ name: "recipe/cancel" })
   Statut → "cancelled"
   Toast "Génération annulée"
```

---

## Prochaines améliorations possibles

1. **Tests unitaires** — Tester la fonction Inngest, le polling, et l'annulation
2. **Variables d'environnement** — Ajouter `INNGEST_EVENT_KEY` / signing key au `.env.example`
3. **Server-Sent Events** — Remplacer le polling par des events temps réel (meilleure UX)
4. **Régénération partielle** — Relancer seulement l'image ou le texte sans tout regénérer
