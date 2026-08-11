# Action Plan — www.chefaugustin.com
> Generated: 2026-08-05 | Health Score: 75/100 (was 71/100 on 2026-07-29)

---

## 🔴 CRITICAL — Fix immediately

### 1. Fix the sitemap/noindex mismatch (30 min)
- **Problem**: 97 of 165 unique sitemap URLs are `noindex` (thin categories <3 recipes). `app/sitemap.ts` lists every tag unfiltered; `app/recipes/category/[slug]/page.tsx:132` gates by `MIN_RECIPES_FOR_INDEX = 3`.
- **Fix**: apply the same gate in `app/sitemap.ts`; also dedupe 4 duplicate URLs (`dinner-for-two`, `one-pan`, `one-pan-meal`, `small-batch`) by slug; add `/contact` to STATIC_PAGES.
- **Verify**: `curl -s https://www.chefaugustin.com/sitemap.xml | grep -c '<loc>'` ≈ 68; no noindex URL in the list.

### 2. Whitelist GPTBot + tame the bot challenge in Hostinger (30 min)
- **Problem**: GPTBot gets 429 on every URL (robots.txt allows it; the protection layer blocks it). The same protection serves a ~5s JS challenge to real first visitors and challenge HTML to curl/Googlebot-UA on `/_next/static/*` and sitemap.xml.
- **Fix**: Hostinger Shield/security settings — whitelist verified bots (Googlebot, Bingbot, GPTBot, OAI-SearchBot, PerplexityBot), exclude `/_next/static/*`, `/sitemap.xml`, `/robots.txt` from the challenge.
- **Verify**: `curl -A "GPTBot/1.0" https://www.chefaugustin.com/` returns the real homepage (200, no challenge HTML).

### 3. De-index the 5 empty hubs (30 min)
- **Problem**: `/techniques`, `/guides`, `/histoire`, `/idees`, `/equipement` = "0 articles" shells, indexable, sitemapped, in nav.
- **Fix**: noindex until ≥1 article; remove from sitemap; 301 `/histoire` → `/history` (or drop), `/idees` → `/recipes/category/dinner-for-two`, `/equipement` → `/equipment`.
- **Verify**: curl each → robots noindex or 301; no longer in sitemap.

### 4. Fix Recipe JSON-LD `author` on 9 recipes (1h)
- **Problem**: 9/30 recipes lack `author` on the Recipe node (mediterranean-chicken-orzo, white-wine-lemon-chicken, chicken-dinner-for-two, edible-cookie-dough, easy-and-healthy-dinner, easter-dinner, creamy-mashed-potatoes, easy-week-of-meals + 1) → ineligible for Google Recipe rich results.
- **Fix**: single-source author in `lib/schemas/recipe-article.ts`; add a schema-validation check to `lib/quality-gate.ts`.
- **Verify**: re-render all 30, assert Recipe.author present.

### 5. Collapse the category taxonomy (123 → ~35) (2h + verify)
- **Problem**: 4.1 categories per recipe; 9/16 sampled ≤3 cards; 5 families cannibalize one intent; category-vs-recipe collisions on 5 keywords.
- **Fix**: keep categories with ≥4 recipes (`30-minute`, `chicken`, `one-pan`, `dinner-for-two`, `dessert`, `pasta`, `romantic-dinner`, `small-batch`, `date-night`, `weeknight`, …); 301 the rest to nearest kept category; remove the "Our collection of N recipes" template; kill the global 119-pill cloud.
- **Verify**: SERP-overlap check on candidate pairs first (WebSearch/Serper); then 301s; re-crawl.

---

## 🟡 HIGH — Fix within 1 week

| # | Action | Effort | Notes |
|---|---|---|---|
| 6 | Fix garbled garlic-shrimp intro ("easy easy mexican dinner recipes recipes two") + sanitize DB description fields; add token-repetition quality gate | 1-2h | Affects pages + llms.txt + raw API |
| 7 | Regenerate llms.txt from clean fields; link it in footer/sitemap; `Allow: /api/recipes/raw` | 30 min | AI citation leverage |
| 8 | Category→cluster + homepage→cluster body links (mandatory hub-spoke); replace 119-pill cloud with 8-12 curated links | 2h | Concentrates equity |
| 9 | Return true 404 for unknown `/recipes/category/*`, `/recipes/cluster/*`, `/login` | 30 min | Kill soft-404s; fix duplicate robots meta |
| 10 | Add `nutrition` + `recipeCuisine` to Recipe schema; unify "Lefèvre" spelling + Person @id; mirror dateModified | 1h | Rich-result eligibility |
| 11 | Fix duplicate BreadcrumbList emission (category + cluster pages) | 30 min | `components/breadcrumbs.tsx` single source |
| 12 | noindex/404 `/dashboard` + `/login`; remove /dashboard link from public nav | 15 min | Surface hardening |
| 13 | Chicken category tag precision (8 non-chicken cards) | 1h | Retag or rename intent |
| 14 | Category page pass: distinct question-H2s, 150-250-word intros, fix "6 recipe s", ItemList of Recipe schema | 2-3h | The biggest AI-citation lever outside recipes |

---

## 🟢 MEDIUM — Within 1 month

| # | Action | Effort |
|---|---|---|
| 15 | Fill /techniques + /equipement with 2-3 articles (reuse recipe "What Most Recipes Get Wrong"/"Chef's Tips" as seeds) | 4h |
| 16 | Filters + time/difficulty badges on kept categories; author byline + dates | 2h |
| 17 | Reduce JS: prefetch=false on non-critical links, async the blocking chunk, slim RSC bootstrap | 2h |
| 18 | Verify Hostinger edge caching for /_next/static + HTML | 1h |
| 19 | Expand 3-4 weakest FAQ answers to ~140 words | 1h |
| 20 | About-page claims alignment ("cookbook author", "7-criteria audit") + persona transparency line | 30 min |
| 21 | Add IndexNow | 30 min |
| 22 | Moz free tier + Bing Webmaster verification (backlink baseline) | 30 min |

---

## 🔵 LOW / ONGOING

| # | Action |
|---|---|
| 23 | Re-crawl Seobility after sitemap fixes |
| 24 | PSI/CrUX API key for field CWV |
| 25 | 30-60s how-to videos on top-5 recipes (YouTube) |
| 26 | Reddit presence (as disclosed persona) |
| 27 | Monthly cannibalization + link-graph audit |
| 28 | Re-check Common Crawl after Q3 2026 graph (~Nov-Dec) |

---

## Expected impact

| Fix | Impact |
|---|---|
| 1+3+9 (sitemap/noindex/404s) | Sitemap 165 → ~68 URLs; crawl budget + indexation hygiene |
| 2 (GPTBot + challenge) | Restores ChatGPT search crawl; cuts ~5s first-visit delay |
| 5+8+13 (taxonomy + links) | Concentrates equity on ~35 categories + 6 clusters + 30 recipes; ends cannibalization |
| 6+7+14 (content quality) | Clean AI citations; category pages win "decide" step |
| 4+10+11 (schema) | 30/30 recipes eligible for rich results |
