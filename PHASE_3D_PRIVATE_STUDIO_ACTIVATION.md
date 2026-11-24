# CHEF AUGUSTIN — PHASE 3D
## Private Studio Operational Activation & Readiness Report

**Date :** 2026-11-24  
**Périmètre :** Compte Google AI Studio ORIGINAL (`/app/applet`)  
**Objectif :** Établir l'état opérationnel réel du Studio éditorial privé, auditer ses prérequis d'exécution et formaliser les étapes de configuration et de test sécurisé avant de remplacer le dashboard Hostinger.

---

## 1. Mission 1 — Runtime Identification

- **Environnement d'exécution :** Le Studio s'exécute dans l'infrastructure de développement et de prévisualisation Google AI Studio (conteneur Node.js Next.js 16.4.6, port 3000, URLs `ais-dev-...` et Cloud Run `ais-pre-...`).
- **Persistance & Stockage des secrets :** 
  - Les variables d'environnement serveur persistent via les mécanismes de configuration de la plateforme AI Studio ou le fichier `.env.local`.
  - Aucune persistance disque durable n'est garantie hors du conteneur AI Studio et des services de bases de données externes connectés (`DATABASE_URL`).
- **Isolation réseau :** Les URLs de prévisualisation AI Studio n'utilisent pas d'authentification Cloud IAM au niveau de l'infrastructure par défaut ; la protection de l'administration repose donc entièrement sur l'authentification applicative (`middleware.ts` et `lib/auth.ts`).

---

## 2. Mission 2 — Audit des Variables Nécessaires (Audit de présence uniquement)

Conformément aux consignes de sécurité, aucune valeur, suffixe, préfixe ou chaîne de connexion n'est affiché.

| Variable | Statut détecté | Rôle / Criticité | Action requise |
|---|---|---|---|
| `DATABASE_URL` | **Configuré** (`.env.local`) | Connexion Neon PostgreSQL (lecture/écriture) | Aucune (opérationnel) |
| `DASHBOARD_SECRET_TOKEN` | **Manquant** | Clé de hachage SHA-256 pour l'authentification admin | À configurer dans `.env.local` / AI Studio secrets |
| `GEMINI_API_KEY` | **Manquant** | Génération de texte IA (recettes / articles) | À configurer pour activer les pipelines IA |
| `ANTHROPIC_API_KEY` | **Manquant** | Provider IA alternatif | Optionnel |
| `IDEOGRAM_API_KEY` | **Manquant** | Génération d'images Ideogram | À configurer pour l'étape image des articles/recettes |
| `SERPER_API_KEY` | **Manquant** | Recherche web SERP pour l'enrichissement IA | À configurer pour la recherche sémantique |
| `CLOUDINARY_CLOUD_NAME` | **Manquant** | Nom du cloud Cloudinary | À configurer pour les uploads d'images admin |
| `CLOUDINARY_API_KEY` | **Manquant** | Clé API d'administration Cloudinary | À configurer pour les uploads d'images admin |
| `CLOUDINARY_API_SECRET` | **Manquant** | Secret API d'administration Cloudinary | À configurer pour les uploads d'images admin |

*Remédiation sécurisée :* Configurer ces secrets directement dans l'interface de gestion des secrets de Google AI Studio ou via un fichier `.env.local` strictement privé. Ne jamais préfixer par `NEXT_PUBLIC_`.

---

## 3. Mission 3 — Restauration de l'Accès Administrateur

- **Architecture d'authentification existante :**
  - `middleware.ts` intercepte `/dashboard` et applique une redirection `307` vers `/login` si le cookie `dashboard_auth` est absent ou invalide.
  - `lib/auth.ts` vérifie le jeton à l'aide d'une comparaison à temps constant (`crypto.timingSafeEqual`) basée sur le hachage SHA-256 du `DASHBOARD_SECRET_TOKEN`.
  - Protection CSRF active sur les Server Actions (`app/actions/*`).
- **Tests réalisés :**
  - Accès non authentifié à `/dashboard` → **HTTP 307 Temporary Redirect** vers `/login` (`X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`).
  - Accès non authentifié à `/api/articles/raw` → **HTTP 401 Unauthorized** (JSON).
- **Instructions de configuration :**
  1. Définir un token secret fort dans `DASHBOARD_SECRET_TOKEN`.
  2. S'authentifier via `/login` dans l'interface du Studio (pose le cookie HttpOnly `dashboard_auth`).
  3. Le dashboard devient pleinement accessible ; la déconnexion efface le cookie via `/api/auth/logout`.

---

## 4. Mission 4 — Validation de Neon (Mode Lecture Seule)

Exécution de l'exportateur de snapshot public en mode vérification (`npx tsx --env-file=.env.local scripts/export-public-snapshot.ts --check-diff`) :
- **Connexion & Fermeture :** Connexion poolée (`max: 1`) établie et fermée proprement.
- **Contenu validé en lecture :**
  - **52** recettes publiées.
  - **1** article publié (`15-easy-dinner-recipes-for-two`).
  - **153** catégories extraites.
  - **contentHash** : `8faad7fd79c41fbb956a3b6c26e9bfc6adba3bc7508fff696d31a8e18ff2a90b`.
- **Intégrité :** Aucune modification ni écriture n'a été effectuée sur la base de production.

---

## 5. Mission 5 — Préparation des Fournisseurs IA

- **État :** Les agents de génération (`lib/agents/*`, pipelines de recettes et articles) reposent sur les clés `GEMINI_API_KEY`, `IDEOGRAM_API_KEY` et `SERPER_API_KEY`.
- **Validation :** Aucun appel génératif n'a été effectué pendant cette phase (statut **BLOCKED** en l'absence des clés dans l'environnement de test actuel).
- **Sécurité :** Aucun quota n'a été consommé.

---

## 6. Mission 6 — Préparation de Cloudinary

- **État :** Le SDK Cloudinary (`cloudinary`) est configuré pour l'export et l'intégration des médias.
- **Validation en lecture :** Les 53 URLs Cloudinary des recettes et articles existants sont accessibles (`HEAD 200`).
- **Validation en écriture :** En l'absence de `CLOUDINARY_API_SECRET` et des clés Admin, les uploads par l'administrateur sont suspendus (statut **BLOCKED**). Aucun asset n'a été modifié ou supprimé.

---

## 7. Mission 7 — Protocole de Test Éditorial Isolé (À exécuter après configuration des secrets)

Pour tester la chaîne complète sans corrompre la production :
1. **Étape 1 :** Configurer `DATABASE_URL` pointant vers une base de staging (ou utiliser une transaction de test isolée) et renseigner `DASHBOARD_SECRET_TOKEN`.
2. **Étape 2 :** Se connecter au dashboard via `/login`.
3. **Étape 3 :** Créer un brouillon de recette test (ex. `test-recipe-staging-01`).
4. **Étape 4 :** Sauvegarder et modifier le brouillon.
5. **Étape 5 :** Exécuter une génération IA contrôlée (nécessite `GEMINI_API_KEY`).
6. **Étape 6 :** Valider l'article/recette et basculer le statut en `published`.
7. **Étape 7 :** Exécuter `npx tsx scripts/export-public-snapshot.ts` et vérifier la mise à jour de `contentHash` dans `data/public-content.json`.

---

## 8. Mission 8 — Contrôle des Coûts / Free Tier

- **Neon Free Tier :** Respecté grâce au pooling court (`max: 1`, `idleTimeoutMillis: 2000`), permettant le passage à zéro (Scale-to-Zero).
- **Cloudinary Free Tier :** Respecté par l'utilisation d'URLs transformées à la source (`unoptimized: true`).
- **Quotas IA & Cloud Run :** Aucun coût additionnel ni modification d'abonnement engagé.

---

## 9. Verdict Final : **CONDITIONAL GO**

Le Studio privé possède une architecture logicielle extrêmement robuste et sécurisée. Son activation complète et son remplacement définitif du dashboard Hostinger sont subordonnés exclusivement à la saisie sécurisée des variables d'environnement manquantes (`DASHBOARD_SECRET_TOKEN`, clés IA, identifiants Cloudinary Admin) dans le gestionnaire de secrets du Studio.
