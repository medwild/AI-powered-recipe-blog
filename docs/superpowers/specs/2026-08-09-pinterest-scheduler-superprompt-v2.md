# 🎯 SUPER PROMPT v2 — PinScheduler (Google AI Studio)

> Version 2 : le prompt original + les 2 recommandations de Gemini retravaillées selon la version Karpathy (simplicité, règle simple au lieu de vocabulaire).

---

## CONTEXTE

Tu développes **PinScheduler**, une application personnelle React + Vite (SPA, pas de backend) pour planifier des Pins Pinterest d'un blog de recettes. Elle consomme l'API du blog et publie via Zernio.

**Le prompt original est déjà dans ta conversation.** Cette version 2 **complète et affine** 2 aspects précis. Applique ces changements au code que tu es en train d'écrire.

---

## AMENDEMENT 1 — Gestion d'erreurs Zernio (simplifiée)

**Au lieu de** : "exponential backoff retry strategy for up to 2 attempts"

**Fais ceci** — la règle simple :

1. **Distingue 2 types d'erreurs** au moment du `POST /posts` :
   - **Transitoires** (retryables) : `"Pinterest rate limit reached"`, erreurs réseau (timeout, 5xx, connexion)
   - **Permanentes** (non-retryables) : `"Invalid URL or request data"`, `"Pinterest requires a boardId"`, toute erreur 4xx avec un message qui ne changera pas en réessayant

2. **Règle de retry** :
   - **Retry 1x après 5 secondes**, UNIQUEMENT si l'erreur est **transitoire**
   - **Ne jamais retry** une erreur **permanente** (ça ne réparera pas l'URL en réessayant)

3. **Si le retry échoue** (ou si erreur permanente) :
   - Marquer le pin `failed` dans l'état (localStorage)
   - Afficher un message clair : le pin, l'erreur, et un **bouton "Re-planifier"** qui permet à l'utilisateur de re-soumettre manuellement ce pin précis

4. **Pas de système de logging complexe** : un `console.log` par tentative (tentative 1, retry, échec) suffit.

---

## AMENDEMENT 2 — Mapping recette → board (complété)

**Au lieu de** : "suggest or automatically assign relevant Pinterest board IDs"

**Fais ceci** — le flow complet avec la source des boards :

1. **Récupère les boards réels d'abord** : `GET /accounts/{accountId}/pinterest-boards` → liste `[{ id, name, description }]`
2. **Construis le mapping keywords → board À PARTIR des noms réels des boards** (pas codé en dur) :
   - Exemple : si un board s'appelle "Slow Cooker Recipes for Two", un tag recette "slow cooker" suggère ce board
   - Règle : matcher les tags de la recette contre les mots du **nom du board** (lowercase, contains)
3. **SUGGÈRE, n'assigne PAS automatiquement** :
   - Pour chaque recette, montre le board suggéré + les alternatives
   - L'utilisateur **valide ou override** (un dropdown)
   - ⚠️ Ne jamais assigner en silence : un pin sur un board incohérent nuit au compte (Pinterest prune les boards incohérents)
4. **Persiste** le mapping recette → board en **localStorage**
5. **Re-fetch des boards possible** (bouton "Sync boards") — les boardId peuvent changer

---

## RÈGLE D'OR GLOBALE (Karpathy)

**Simplicité d'abord.** Chaque règle doit être une phrase simple qu'un humain peut suivre sans manuel :
- Retry **1x**, seulement si **transitoire**
- Suggérer, **jamais assigner en silence**
- Un `console.log`, pas un système de logging

Le reste du prompt original est inchangé — les règles anti-spam (3-5/jour, 4-6h, 1 variante/board, rotation), le contrat Zernio, la persistance localStorage, les non-goals (pas d'images, pas de nutrition, pas de SaaS).
