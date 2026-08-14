# Design — Phase Indexation multi-moteurs (Google + Bing + IndexNow)

> Date : 2026-08-14 — Statut : validé par l'utilisateur (design approuvé 14/08)
> Objectif : **100 % des pages indexables du sitemap indexées sur Google ET Bing**

## 1. Contexte

Le blog (chefaugustin.com) a **93 URLs indexables** (vérifié sur le sitemap prod le 14/08 ; sitemap force-dynamic, `lastmod = updatedAt`).
Au 08/08 : 43/46 recettes indexées sur Google. L'infra actuelle :

- `app/sitemap.ts` — sitemap dynamique, `lastmod = updatedAt`
- `app/robots.ts` — robots.txt (sitemap déclaré)
- `scripts/ping-sitemap.py` — ping HTTP + soumission GSC Sitemaps API après chaque `git push` (hook `scripts/hook-ping-sitemap.sh`)
- GSC configuré : service account `~/.config/claude-seo/service_account.json`, property `sc-domain:chefaugustin.com`
- Plugin claude-seo 2.2.4 : `gsc_inspect.py` (inspection single+batch), `indexnow_submit.py` (POST IndexNow), `bing_webmaster.py` (API BWT), `google_auth.py` (auth partagée), venv `~/.local/share/claude-seo/.venv/bin/python`

**Bing : déjà fait le 14/08** — site ajouté manuellement dans BWT (méthode fichier), fichier `public/BingSiteAuth.xml` committé (`2281b52`) et vérifié live sur prod, vérification validée par l'utilisateur. Reste : clé API BWT.

## 2. Contraintes

- **Pas d'Indexing API Google** (usage restreint JobPosting/VideoObject/BroadcastEvent — illégal pour du contenu générique). Re-crawl via `requestIndexing` de l'URL Inspection API (quotas respectés).
- Google ne participe pas à IndexNow (FAQ IndexNow) — IndexNow est un signal Bing/Seznam/Naver/Yandex/Yep.
- Scripts en **Python** (précédent `ping-sitemap.py`, imports directs du plugin, venv partagé). Pas de tsx pour cette zone.
- La clé IndexNow est **committée dans `public/{clé}.txt`** : par design d'IndexNow elle doit être servie à la racine ; ce n'est pas un secret (règle 8 non concernée).
- La clé API BWT (elle, réelle credential) va dans `~/.config/claude-seo/backlinks-api.json` (`bing_api_key`), **jamais** dans le repo.

## 3. Architecture

```
SITEMAP PROD (https://www.chefaugustin.com/sitemap.xml)
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ scripts/indexation-audit.py   (venv plugin)            │
│  • fetch sitemap → URLs classées par type              │
│  • Google : batch inspect via gsc_inspect.py           │
│  • Bing : statut URLs via API BWT (GetUrlSubmission…)  │
│  • sortie : repports/indexation-YYYY-MM-DD.md + JSON   │
└────────────────────────────────────────────────────────┘
        │  (JSON des non-indexées)
        ▼
┌────────────────────────────────────────────────────────┐
│ scripts/indexation-request.py  (venv plugin)           │
│  • requestIndexing GSC URL Inspection API              │
│  • délai 5s entre requêtes, retry exponentiel 429/403  │
│  • priorité : recipe > article > static          │
└────────────────────────────────────────────────────────┘
        │
        ▼
hook-ping-sitemap.sh (étendu, post-push)
  • ping sitemap Google        (existant)
  • indexnow_submit.py         (nouveau — toutes URLs)
```

## 4. Composants

### 4.1 `scripts/indexation-audit.py` — audit Google + Bing, rapport (phases A + D)

Interface :

```
python3 scripts/indexation-audit.py [--site-url sc-domain:chefaugustin.com] [--limit N]
```

- Fetch du sitemap prod → liste d'URLs (93 au 14/08)
- Classification par type via pattern d'URL : `/recettes/` → recipe ; hubs/articles → article ; le reste → static
- Google : réutilise `batch_inspect` de `gsc_inspect.py` (rate-limit intégré) → statut par URL (`indexStatus`, canonical, `lastCrawlTime`)
- Bing : statut par URL via l'API BWT — **forme exacte de l'endpoint à confirmer à l'implémentation** (GetUrlSubmissionStatus / GetUrlSubmissionStatusByPage, base `https://ssl.bing.com/webmaster/api.svc/json`). Si l'endpoint n'est pas fiable, repli : sitemap submit status + liste des URLs poussées via IndexNow (acceptance = signal).
- Sorties :
  - `repports/indexation-YYYY-MM-DD.md` — tableaux par type : ✅ indexée / ❌ non indexée / ❓ inconnue + résumé
  - `repports/indexation-last.json` — brut (réutilisé par le re-crawl)
- Erreurs : retry 3× par URL, sinon statut "inconnu" (rapport honnête, jamais de faux ✅)

### 4.2 `scripts/indexation-request.py` — re-crawl Google (phase B)

Interface :

```
python3 scripts/indexation-request.py --missing [--type recipe] [--dry-run] [--max N]
python3 scripts/indexation-request.py --file urls.txt
```

- `--missing` : lit `repports/indexation-last.json` → URLs non-indexées (filtre `--type` optionnel : `recipe` / `article` / `static`)
- `requestIndexing` de l'URL Inspection API : 1 requête / 5 s, retry exponentiel sur 429/403 (backoff ×2, max 3 essais)
- `--dry-run` : affiche ce qui serait soumis sans rien envoyer
- Log : `~/.claude/logs/indexation-request.log`

### 4.3 IndexNow (phase C)

1. Générer la clé : `openssl rand -hex 24` (48 chars)
2. Écrire `public/{clé}.txt` (contenu = clé) — **committé** (servi à `https://www.chefaugustin.com/{clé}.txt`)
3. `.env.local` : `INDEXNOW_KEY=<clé>` et `INDEXNOW_KEY_LOCATION=https://www.chefaugustin.com/{clé}.txt`
4. Étendre `scripts/hook-ping-sitemap.sh` : après le ping Google existant, appeler `indexnow_submit.py` (URLs du sitemap) avec l'env ci-dessus
5. Échec IndexNow → log non-bloquant (le push passe quand même)

### 4.4 Bing Webmaster Tools (phase C')

Déjà fait : vérification domaine ✅ (fichier, validée 14/08).

À faire :
1. Utilisateur : page **API Access** dans BWT → copier la clé → la transmettre
2. Config : `~/.config/claude-seo/backlinks-api.json` → `"bing_api_key": "<clé>"` (lue par `backlinks_auth.py`)
3. Soumission sitemap à Bing : API BWT `SubmitSitemap` (à confirmer à l'implémentation) — sinon le sitemap est découvert via robots.txt (déjà en place)
4. Le statut URLs Bing est consommé par `indexation-audit.py` (4.1)

## 5. Flux de données

1. `indexation-audit.py` : sitemap → listes → inspect Google + statut Bing → rapport + JSON
2. `indexation-request.py` : JSON non-indexées → requestIndexing → log ; re-audit N jours après pour vérifier
3. Hook post-push : ping Google (existant) + IndexNow (nouveau) → Bing recrawl rapide des pages modifiées

## 6. Gestion d'erreurs

| Cas | Comportement |
|---|---|
| Quota GSC dépassé (429/403) | backoff exponentiel, log, s'arrête proprement — reprise le lendemain |
| URL inspect en échec | retry 3×, sinon "inconnu" dans le rapport |
| IndexNow KO | log non-bloquant |
| API Bing KO | rapport mentionne le manque, pas de blocage |
| Sitemap prod injoignable | arrêt avec message clair |

## 7. Vérification & critères de succès

- `python3 -m py_compile` sur les 2 scripts avant usage
- **Test partiel avant batch complet** : audit sur 3 URLs (`--limit 3`), valider le format du rapport
- Critère de succès phase D : rapport avec **~0 pages non-indexées côté Google** ; Bing : sitemap soumis + URLs IndexNow acceptées
- Le push déclenche le hook → vérifier le log `~/.claude/logs/ping-sitemap.log` (IndexNow présent)

## 8. Hors périmètre (YAGNI)

- Indexing API Google (restreint)
- Dashboard / UI — rapport markdown
- Cron automatique au départ — décision après la phase A (le script peut être crontabé ensuite)
- Vérification poussée des autres moteurs IndexNow (Seznam/Naver/Yandex/Yep)

## 9. Étapes d'implémentation (ordre)

1. Phase A : `indexation-audit.py` + test 3 URLs + audit complet
2. Phase C : clé IndexNow + `public/{clé}.txt` + `.env.local` + hook étendu + push
3. Phase B : `indexation-request.py` + re-crawl des non-indexées
4. Phase C' : clé API BWT (utilisateur) + config plugin + soumission sitemap
5. Phase D : re-audit, itérations jusqu'à ~0 non-indexées, décision cron
