# Google SEO Data — www.chefaugustin.com

> Source : Google API (field data) — GSC, URL Inspection, Sitemaps, CrUX, PSI
> Période Search Analytics : 2026-07-11 → 2026-08-05 (28 jours, lag GSC 2-3 jours)
> CrUX : rolling 28j (aucune donnée — trafic Chrome insuffisant)
> Credentials : **Tier 1** (API key + service account) — GA4 non configuré (Tier 2 requis)

---

## 1. Search Analytics 28j — Totaux (site-wide, `totals_complete: true`)

| Métrique | Valeur |
|---|---|
| Clicks | **2** |
| Impressions | **1 022** |
| CTR | **0,2 %** |
| Position moyenne | **15,4** |
| Rows query×page | 167 (55 pages distinctes) |

## 2. Top requêtes par impressions (agrégées sur pages)

| Impressions | Clicks | Pos. moy. | Requête |
|---|---|---|---|
| 52 | 0 | 6,3 | "chefaugustin" (brand, quotes) |
| 16 | 0 | 4,4 | "chefaugustin" instagram |
| 12 | 0 | 59,9 | chicken dinners for two |
| 12 | 0 | 76,1 | stove top dinners for two |
| 9 | 0 | 62,2 | chicken recipes for two |
| 8 | 0 | 72,1 | chicken meals for 2 |
| 8 | 0 | 25,8 | vegetarian meals for two |
| 6 | 0 | 70,8 | chicken for two |
| 6 | 0 | 63,4 | chicken recipe for two |
| 6 | 0 | 73,0 | skillet recipes |

Quick wins (position 4-10, impressions ≥ 3) : **aucune requête non-brand**. Les seules positions 4-10 sont des requêtes brand (privacy 20 imp / pos 4,0 ; contact 19 imp / pos 5,3 ; about 16+9+8 imp / pos 4,4-8,2).

## 3. Indexation — 5 URLs représentatives (URL Inspection, 08/08)

| URL | Coverage state | Canonical | Dernier crawl |
|---|---|---|---|
| / (homepage) | ✅ Submitted and indexed | match | 2026-08-07 (MOBILE) |
| /recipes/easy-lasagna-recipe (recette récente) | ✅ Submitted and indexed | match | 2026-08-05 (MOBILE) |
| /recipes/easy-and-healthy-dinner-recipes-for-two (hub) | ✅ Submitted and indexed | match | 2026-07-31 (MOBILE) |
| /recipes/category/chicken-dinner-for-two (catégorie) | ✅ Submitted and indexed | match | 2026-08-01 (MOBILE) |
| /recipes/cluster/chicken-dinners-for-two (cluster) | ✅ Submitted and indexed | match | 2026-08-01 (MOBILE) |

Rich results : Recettes détectées avec **warnings** — missing `video`, `url`, `aggregateRating` ; hub missing `recipeCuisine` + `author` ; lasagna missing `nutrition` (crawl du 05/08 antérieur au déploiement nutrition du 07/08 — stale, re-crawl nécessaire).

## 4. Sitemaps

`sitemap.xml` (soumis sous chefaugustin.com) : **96 URLs, 0 erreur, 0 warning**, last submitted 2026-08-05, non pending.

## 5. CrUX field data

**404 / pas de données** : « No CrUX history data for this origin. Insufficient Chrome traffic volume for eligibility. » → aucun CWV réel mesurable. Fallback PSI lab (08/08) : mobile performance **96-99/100** (LCP 2,0-2,6 s lab, CLS 0, TBT 0-20 ms), desktop **100/100**, SEO 100/100, a11y 100/100.

## 6. GA4

Non configuré (tier 1) — `ga4_property_id` absent. Trafic organique GA4 indisponible ; GSC seul.

---

## Findings

- **[Sévérité: High] Zéro traction organique sur 28 jours** — 2 clicks / 1 022 impressions / CTR 0,2 % / pos. moy. 15,4. ~91 impressions sont du brand (quoted "chefaugustin") ; les requêtes non-brand (chicken dinners for two, stove top dinners for two, etc.) sont toutes en positions 42-91. Le site ne ranke pas encore pour ses keywords cibles. Preuve : totaux GSC 07-11→08-05, `totals_complete: true`.
- **[Sévérité: Medium] Aucun quick win exploitable** — aucune requête non-brand en position 4-10 ; la meilleure position non-brand est « vegetarian meals for two » à 25,8 (8 imp). Aucune opportunité de titre/méta à court terme ; priorité = indexation/content depth.
- **[Sévérité: Medium] Warnings Rich Results Recettes** — `video` et `url` manquants partout, `aggregateRating` absent (pas de ratings publiés), `recipeCuisine` absent sur le hub (crawl 31/07 — déploiement déterministe du 07/08 non encore re-crawled), `nutrition` absent sur lasagna (crawl 05/08 antérieur au backfill nutrition du 07/08). Re-crawl GSC requis pour valider les fixes du 07/08.
- **[Sévérité: Low] URLs legacy françaises /recettes encore en index** — 7 URLs distinctes, 14 impressions, positions 42-91. 308 live vers /recipes et 301 non-www→www vérifiés ; consolidation Google en cours, mais le cluster page liste encore `chefaugustin.com/recettes?cluster=...` comme referring URL.
- **[Sévérité: Low] Pas de CrUX field data** — trafic Chrome insuffisant ; CWV réels non mesurables. Lab sain (mobile 96-99/100, CLS 0, TBT ≤ 20 ms) ; pas d'action prioritaire.
- **[Sévérité: Low] GA4 non configuré** — le Tier 2 (analytics organique) n'est pas atteignable tant que `ga4_property_id` n'est pas renseigné dans la config claude-seo.

Points positifs : 5/5 URLs indexées avec canonicals match, sitemap 0 erreur (96 URLs), homepage re-crawled le 07/08, aucun problème de coverage/robots/mobile.
