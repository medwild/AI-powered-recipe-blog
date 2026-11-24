# CHEF AUGUSTIN — FINAL PRODUCTION RELEASE SAFETY CHECK
## Plan de Sécurité et de Restauration Non Destructive (Phase 3B / Prélude Déploiement)

**Date :** 2026-11-24  
**Périmètre :** Projet Google AI Studio ORIGINAL (`/app/applet`) + Dépôt Staging (`/tmp/chef-augustin-main-prep`)  
**Statut :** Plan validé et testé en clone jetable. **Aucun `git push` et aucun déploiement Hostinger n'ont été exécutés.**

---

## 1. Vérification préalable des références Git (Tags & Commit Candidat)

Avant toute opération distante, les repères Git suivants ont été audités et confirmés dans le dépôt :
- **Dernier commit prod fonctionnel (`1e97bef`) :** `1e97bef2472775ef368837b5b4ab3112646e510` (Tag distant / local : `backup/prod-1e97bef`).
- **Commit `8baeaed` (`origin/main`) :** `8baeaed7e615d98fc88257f983fdbea287fcdace` (Tag distant / local : `backup/failed-main-8baeaed`).
- **Commit candidat (`0dbcef0`) :** `0dbcef008bd3fac389b052d2d6350e09cee00972` (Frontend public standalone validé Phase 3B).

---

## 2. Avertissement critique — Studio Privé (`/app/applet`)

**Attention :** Le Studio privé de création de contenu (`/app/applet` dans Google AI Studio) **ne peut pas être affirmé comme opérationnel** pour la génération IA et les mutations en production tant que les variables d'environnement serveur suivantes ne sont pas effectivement configurées, injectées et validées dans l'environnement d'exécution distant :
1. `DASHBOARD_SECRET_TOKEN` (requis par `lib/auth.ts` et `middleware.ts` pour valider l'authentification de l'administrateur sans échouer fermé).
2. Clés API des fournisseurs IA (`GEMINI_API_KEY`, et options associées).
3. Identifiants Cloudinary Admin (`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`).
4. `DATABASE_URL` (connexion Neon PostgreSQL active).

*Note d'architecture :* L'hébergement Hostinger Node.js cible héberge **exclusivement** le frontend public statique/standalone (`chef-augustin-public/`), qui lit le snapshot JSON public (`data/public-content.json`) sans aucune connexion Neon ni clé IA. Le Studio privé reste l'atelier éditorial interne, dont le fonctionnement opérationnel dépend des secrets listés ci-dessus.

---

## 3. Intégrité SEO, Contenu & Redirections (Phase 3B)

Conformément aux instructions, **aucun changement n'a été apporté** au SEO, aux contenus, aux fiches recettes (52), à l'article guide (1), aux catégories (153), aux 153 redirections historiques (`next.config.mjs`) ni aux 94 alias `/recettes/*`. Les signaux validés lors de la Phase 3B sont conservés à l'identique.

---

## 4. Procédure de Rollback Non Destructive (Validée & Testée)

Pour parer à toute régression critique sur Hostinger après le push de `0dbcef0` sur `main`, **il est formellement interdit d'utiliser `git reset --soft 1e97bef`** (qui altère l'index et l'historique). 

La méthode non destructive validée en clone jetable consiste à réinitialiser l'index avec l'arbre de `1e97bef` et à créer un nouveau commit descendant du HEAD actuel, **sans jamais utiliser `--force`** :

### Commande de Rollback d'Urgence :
```bash
# 1. Se placer sur la branche principale locale
git checkout main
git pull --ff-only origin main

# 2. Remplacer l'index par l'arbre exact du commit stable 1e97bef
git read-tree 1e97bef

# 3. Créer un nouveau commit propre (descendant direct du HEAD actuel)
git commit -m "fix(rollback): non-destructive restore to stable 1e97bef tree"

# 4. Pousser vers main sur GitHub (push standard sans --force)
git push origin main
```

### Vérification mathématique de la sécurité du rollback :
- Le commit de rollback ainsi créé est un **enfant direct** de votre HEAD actuel.
- L'historique Git est intégralement préservé (aucun commit écrasé, aucun `push --force`).
- **Empreinte de l'arbre (`tree hash`) :** L'arbre résultant dans le commit de rollback est **strictement identique** (`c710bb3814f04dccb3d42d6873cd48ae6a294c08`) à celui de `1e97bef`, garantissant un retour exact au code de production éprouvé.

---

## 5. Procédure de Publication sur `main` (Rappel des étapes)

Une fois l'autorisation explicite donnée :
1. Vérifier que `origin/main` pointe sur `8baeaed`.
2. Pousser les tags de sauvegarde : `git push origin backup/prod-1e97bef backup/failed-main-8baeaed`.
3. Pousser le commit candidat : `git push origin main` (sans `--force`).
4. Suivre le build Hostinger (`npm run build`, `npm start`).
5. Contrôler les URLs clés, le sitemap (90 URLs), les redirections et les assets CSS/JS.
6. En cas d'anomalie, appliquer immédiatement le rollback non destructif décrit à la section 4.
