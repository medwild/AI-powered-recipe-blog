# Backlink Profile Audit — www.chefaugustin.com

**Date:** 2026-08-05 · **Specialist:** backlink profile analyst
**Tier available:** 0 (Common Crawl web graph + verification crawler only)
**Credentials:** Moz API — NOT configured · Bing Webmaster — NOT configured · DataForSEO — NOT configured
**Sources used:** Common Crawl (claude-seo commoncrawl_graph.py), CC index API, RDAP/WHOIS, live HTTP checks (curl), Pinterest live profile fetch, prior session memory (spam-backlinks-attack, 2026-08-01)

---

## Summary

**No backlink data exists for this domain in any available source at Tier 0. Backlink Health Score: NOT SCORED (INSUFFICIENT DATA).** This is fully explained by domain age, not by a technical fault: the domain was registered 2026-07-02 (RDAP, Hostinger registrar) and the site launched ~2026-07-27. The newest Common Crawl quarterly web graph (cc-main-2026-jan-feb-mar, Jan–Mar 2026) and even the newest raw crawl collection (CC-MAIN-2026-30, crawled 2026-07-10 → 2026-07-23) both predate the domain's existence. Zero captures is the expected outcome.

---

## Findings

### 1. HIGH — Zero Common Crawl presence across all releases (expected for domain age)

- **Evidence:** `commoncrawl_graph.py chefaugustin.com --json` on `cc-main-2026-jan-feb-mar` (latest) and `cc-main-2025-oct-nov-dec`: `in_crawl: false`, `in_rankings: false`, `pagerank: null`, `n_hosts: null` (confidence 0.50, source CC web graph, quarterly). Direct index query `index.commoncrawl.org/CC-MAIN-2026-30-index?url=chefaugustin.com&matchType=domain`: `"No Captures found for: chefaugustin.com"`. Same for www variant. RDAP: registration 2026-07-02T15:16:40Z, last changed 2026-08-03, expires 2027-07-02, status `client transfer prohibited`.
- **Interpretation:** Not a penalty signal and not a crawl-quality signal — the domain did not exist during any crawl window. Common Crawl web graphs are quarterly and lag by ~4-6 months; earliest possible CC appearance is ~Q4 2026. Note: the audit brief said "~6 months old" — the domain is ~1 month old (registered 2026-07-02). This materially changes the backlink expectation baseline: a 1-month-old domain typically has near-zero organic backlinks.
- **Recommendation:** Re-run `claude-seo run commoncrawl_graph.py chefaugustin.com` after the Q3 2026 web graph ships (expected ~Nov-Dec 2026). Until then, treat "no backlinks found" as the true baseline.

### 2. HIGH — No Moz/Bing/DataForSEO configured → backlink profile unscorable at Tier 0

- **Evidence:** `backlinks_auth.py --check` → tier 0; `moz: available=false` (no `MOZ_API_KEY`), `bing: available=false`, only `commoncrawl` and `verify` available.
- **Impact:** Referring-domain count, DA distribution, anchor-text naturalness, toxic-link ratio, link velocity, follow/nofollow ratio, geographic relevance — 7 of 7 scoring factors have no data source. Per tier-0 protocol the score is INSUFFICIENT DATA, not a numeric value.
- **Recommendation:** Sign up for Moz Link Explorer API free tier (2,500 rows/month, https://moz.com/products/api) → tier 1 (confidence 0.85). For tier 2 (confidence 0.70), Bing Webmaster Tools API is free and the domain is already listed in robots.txt sitemap (`Sitemap: https://www.chefaugustin.com/sitemap.xml`), but requires verifying site ownership. Optionally DataForSEO (premium, confidence 1.00) via `./extensions/dataforseo/install.sh`.

### 3. MEDIUM — Prior 80-spam-link profile (July 2026): not observable at Tier 0, but no new evidence of toxicity either

- **Evidence:** Prior session audit (2026-08-01, Ahrefs data) found ~80 backlinks, 100% spam from link farms: all nofollow, auto-generated anchors ("chefaugustin.com gets premium guest posts..."), TLDs .shop/.site/.top/.icu/.agency/.click/.pro, all targeting the homepage. Resolved 2026-08-01: Google removed the Disavow Tool; Google states its algorithm auto-ignores spam links; ~80 nofollow links are ignored; no manual action in GSC.
- **Assessment:** With zero CC captures and no Moz/DataForSEO, the current toxic-link ratio is UNMEASURABLE. The July profile (nofollow, garbage TLDs, single target) matches the pattern Google auto-ignores; nothing in live checks contradicts that. No new spam domains could be confirmed via search (Bing/DDG returned no parseable organic results — bot walls).
- **Recommendation:** Continue the monthly monitoring cadence (Ahrefs/Semrush or Moz once configured); watch GSC Security & Manual Actions. Do not rebuild a disavow file (tool is retired). If Moz free tier is added, re-check spam score on the homepage.

### 4. MEDIUM — Homepage links to 5 near-duplicate "30-minute" category variants + 2 "chicken-breast" variants (internal link dilution / cannibalization risk)

- **Evidence:** Homepage (fetched live, 158,718 bytes) contains links to `/recipes/category/30-minute`, `/recipes/category/30-minute-dinner`, `/recipes/category/30-minute-meal`, `/recipes/category/30-minute-meals`, `/recipes/category/35-minute-meal`, plus `/recipes/category/chicken-breast` and `/recipes/category/chicken-breast-recipes`. All 37 unique internal paths on the homepage return HTTP 200. Sitemap contains 123 category URLs for 30 top-level recipe URLs.
- **Impact:** For a site with zero external backlink equity, every internal link is the main PageRank/equity distribution channel. 5 "30-minute" variants split the small internal authority pool across near-identical target pages and dilute the category topical signal (this overlaps the content audit's cannibalization finding).
- **Recommendation:** Consolidate the "30-minute" family (canonical one slug, 301 the other four) and the two "chicken-breast" variants. Re-check after Seobility recrawl.

### 5. MEDIUM — French-slug indexable routes on an English site (/idees, /histoire, /equipement) carry French meta descriptions

- **Evidence:** `/idees` → title "Dinner Ideas for Two | Chef Augustin", og:description "Browse our ideas articles — French cooking tips, techniques, and guides."; `/histoire` → "History of French Cooking"; `/equipement` → "Kitchen Equipment & Tools". All `index, follow`, canonical to the French slug, all HTTP 200, all in sitemap.xml. `/recettes` → 308 permanent redirect to `/recipes` (correct consolidation).
- **Impact:** Internal equity flows into URLs whose slugs are French while content is English; anchor text from the homepage uses the French slugs. Not a backlink issue per se, but it compounds the dilution in finding 4 for a zero-backlink domain. This likely traces to the 2026-08-03 Seobility fix session (22 hub pages keyed to DB tags).
- **Recommendation:** Either 301 the French slugs to English equivalents (English audience, Tier-1 countries) or accept them as brand-hub pages deliberately — decide once, document in routing-seo.md.

### 6. LOW — /dashboard (editorial studio) is linked from the public homepage but auth-protected

- **Evidence:** Homepage contains `href="/dashboard"` (1 occurrence). Live fetch: HTTP 200 shell page containing "login"/"403" markers; `/dashboard` is correctly `Disallow`ed in robots.txt.
- **Impact:** Minor: noindex is not set but robots.txt blocks crawlers; the link itself passes negligible equity to a login wall. Crawl waste only.
- **Recommendation:** Remove the `/dashboard` link from the public homepage footer/nav (it belongs in the authenticated app shell). Optionally add `X-Robots-Tag: noindex` on the dashboard route as defense-in-depth.

### 7. INFO — Pinterest is the only live verified external property; link presence JS-rendered

- **Evidence:** Live fetch of `https://www.pinterest.com/chefaugustin/` (HTTP 200, 1,081,492 bytes): 27 occurrences of the "chefaugustin" brand string; no raw-HTML outbound `<a href>` to the site (Pinterest renders pin links via JS). Site footer links out to pinterest.com/chefaugustin, instagram.com/chefaugustin, youtube.com/@chefaugustin. Domain was Pinterest-verified in July (13/13 boards, per memory).
- **Assessment:** Pinterest is the most plausible current real referring domain (Rich Pins point back to recipes), but it cannot be confirmed at Tier 0 without the rendered DOM or an API. Instagram/YouTube are nofollow outbound properties with negligible equity return.
- **Recommendation:** When Moz free tier is live, look up `pinterest.com` referring-domain status for the site. Also add `verify_backlinks.py` runs against any links harvested from a future Ahrefs/Moz export.

### 8. INFO — Domain history: fresh registration, no heritage risk detected

- **Evidence:** `domain_history.py chefaugustin.com --json` (fallback WHOIS): created 2026-07-02, updated 2026-08-03, registrar HOSTINGER operations UAB, years_registered 0.09, risk "unknown" (no archive data to compare; topical-shift detection requires `--baseline-topic`).
- **Assessment:** No expired-domain heritage risk (no prior life found). Consistent with a fresh build, not a repurposed domain.

---

## Live checks performed (all 2026-08-05)

| Check | Result |
|---|---|
| CC web graph, latest release (Jan-Mar 2026) | Not found (expected — postdates domain) |
| CC web graph, 2025 Q4 release | Not found (expected) |
| CC index CC-MAIN-2026-30 (crawl Jul 10-23) | No captures (crawl ended 4 days before launch) |
| www + apex, http + https redirects | All 301/308 → https://www.chefaugustin.com/ (canonical OK) |
| Homepage internal links (37 unique paths) | 37/37 HTTP 200 |
| /recettes legacy path | 308 → /recipes (OK) |
| Sitemap | 169 URLs: 123 category, 30 top-level recipes, 6 cluster, 10 static |
| robots.txt | /dashboard and /api/ disallowed; sitemap declared; Googlebot/Bingbot/Perplexity/OAI allowed |
| Pinterest profile | 200, 27 brand mentions, links JS-rendered (unverifiable raw) |
| Bing/DDG "chefaugustin.com" external mention search | Bot walls / no parseable results (unverifiable at Tier 0) |
| RDAP | Registered 2026-07-02, expires 2027-07-02, Hostinger |

## Scoring status

- **Backlink Health Score:** NOT SCORED — INSUFFICIENT DATA (0 of 7 factors had a data source).
- **Confidence:** Common Crawl data would be 0.50; no CC data exists. WHOIS/RDAP and live HTTP checks: 0.95.
- **Next data point:** Q3 2026 CC web graph (~Nov-Dec 2026), or Moz/Bing free tier keys today.
