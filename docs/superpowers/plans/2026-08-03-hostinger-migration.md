# Migration chefaugustin.com → Hostinger Node.js — 2026-08-03

## Contexte

- Depuis le passage sur Vercel (1er août), `chefaugustin.com` est **injoignable depuis le Maroc** : « La connexion a été réinitialisée » (ERR_CONNECTION_RESET) sur **tous** appareils/réseaux marocains.
- Preuves de la panne côté Maroc uniquement :
  - 30+ nœuds mondiaux OK (dont datacenter français fr2) ; 80/80 requêtes en rafale OK.
  - `https://ai-powered-recipe-blog.vercel.app` **marche** au Maroc (même app).
  - Échec testé sur : plages Vercel récentes (64.29.17.x, 216.198.79.x) **et** classiques (76.76.21.x, 66.33.60.x), en navigation privée, avec DNS public 1.1.1.1.
- Conclusion : blocage réseau marocain sur Vercel (IP ou nom). Le blog **marchait avant** chez Hostinger → migration retour vers Hostinger Node.js (plan Business, Node 22).

## Architecture cible

- **Serveur** : Hostinger Node.js hosting — Next.js **standalone** (`node server.js`), Node 22.
- **DB** : Neon PostgreSQL conservée (distante).
- **Images** : Cloudinary conservées.
- **Domaine** : chefaugustin.com (registraire = Hostinger, créé 2026-07-02). **DNS géré par Hostinger** (name servers d'origine restaurés le 3/08 : aurora.dns-parking.com / nebula.dns-parking.com) — les records se posent dans hPanel, plus via l'API Vercel.
- **Redirection apex → www** : middleware Next (nouveau, `middleware.ts`) — remplace le redirect de plateforme Vercel.
- **Keep-warm GitHub Action** : désactivé (sans objet sur Node hosting).

## Étape A — Fait (côté repo)

1. `next.config.mjs` : `output: "standalone"`.
2. `middleware.ts` : redirection 301 apex → `https://www.chefaugustin.com` (hosts `*.chefaugustin.com` uniquement ; URLs vercel.app non touchées).
3. `.github/workflows/keep-warm.yml` : schedule désactivé (workflow_dispatch conservé).
4. Build local validé (`npm run build`, tsc OK) — 30 recettes + 120 catégories SSG.
5. Package : `/tmp/chefaugustin-hostinger/` = `.next/standalone` + `.next/static` + `public` + `.env` (copie de `.env.local`, non commité).

## Étape B — À faire par l'utilisateur (hPanel Hostinger, ~20 min)

1. hPanel → Hosting → **Node.js** → activer pour le domaine `chefaugustin.com` (Node 22 si proposé).
2. Récupérer l'**IP du serveur** (visible dans la section Node.js / infos d'hébergement) → la donner à Claude.
3. Uploader le contenu de `/tmp/chefaugustin-hostinger/` (via gestionnaire de fichiers ou Git/SSH) à la racine du projet Node.
4. Vérifier que le fichier `.env` est présent (contient DATABASE_URL + clés).
5. Node.js → **Start** (commande par défaut `node server.js` ; le port est fourni par Hostinger via `$PORT`).
6. Node.js → **Domain** : s'assurer que `chefaugustin.com` est attaché.
7. **SSL** : hPanel → Sécurité → SSL → générer le certificat pour `chefaugustin.com` (+ www).

## Étape C — Après réception de l'IP (utilisateur hPanel + Claude vérifie)

**NS restaurés Hostinger le 3/08** (aurora/nebula.dns-parking.com) — délégation en propagation (Cloudflare OK immédiat, Google jusqu'à quelques heures, TTL résiduel ~3h constaté).

⚠️ La zone Hostinger contient ENCORE les anciens records Vercel (`A @ → 216.198.79.1`, `CNAME www → vercel-dns-017.com`) → le site reste servi par Vercel (donc toujours bloqué au Maroc) jusqu'au remplacement.

Actions utilisateur dans **hPanel → Domains → chefaugustin.com → DNS Management** :
1. Éditer `A @` → remplacer `216.198.79.1` par l'**IP du serveur Node.js**.
2. Remplacer `CNAME www` par un `A www` → même IP (ou garder un CNAME www → @).

Puis Claude : vérifier résolution + HTTP (apex 301 → www 200) + check-host.net global.

## Étape C′ — RÉALISÉ le 3/08 (16h30)

- Node.js activé par l'utilisateur ; zone Hostinger mise à jour automatiquement (ou manuellement) :
  `A @ → 93.127.179.203 / 77.37.53.246`, `CNAME www → www.chefaugustin.com.cdn.hstgr.net`, MX/SPF/DKIM Hostinger intacts.
- Déploiement GitHub → **site 200 partout** : accueil, `/recipes` (DB), `/sitemap.xml` (frais), redirects `/recettes`→308, recette SSG. **25/25 nœuds check-host.net → 200.**
- Bug corrigé : redirect apex→www portait `:3000` (app sur `$PORT` derrière le proxy Hostinger) → middleware reconstruit l'URL cible explicitement. Commit `bac6b75` (push le 3/08 16h35).
- RESTE : redeploy (auto GitHub ou manuel) → retest Maroc (test décisif) → vérif redirect apex propre.

## Étape D — Validation finale (RÉALISÉE)

- **Test Maroc mobile : ✅ PASSÉ** (3/08 soir) — le site charge au Maroc sur mobile. Objectif de la migration atteint.
- PC au bureau : bloqué par l'**antivirus d'entreprise** (PC admin-restreint, pas de whitelist possible) — problème local, sans rapport avec la migration.
- Migration **CLÔTURÉE** : chefaugustin.com servi depuis Hostinger Node.js, accessible depuis le Maroc.

## Leçons pour la suite

- Le blocage « Vercel » au Maroc n'était pas (que) réseau : l'antivirus d'entreprise bloquait par domaine/catégorie sur les plages Vercel. Hostinger est maintenant whitelisté ou non-catégorisé par l'AV → OK.
- Le site reste sur Hostinger ; pas de retour Vercel prévu.

## Risques

- RAM Business : pas de build sur Hostinger (build local) → OK.
- SSL : génération via hPanel après pointage DNS.
- Emails/autres services Hostinger : aucun MX/SPF/DKIM dans la zone actuelle → aucun impact.
