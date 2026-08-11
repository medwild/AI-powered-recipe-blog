# Technical SEO Findings — https://www.chefaugustin.com

Audit date: 2026-08-05
Scope: 169 sitemap URLs + spot-checked routes. Crawl data: `../crawl-results.json`. Lab metrics: Playwright/Chromium 138 (mobile viewport, warm cache) — PSI API unavailable (rate-limited without key).

Technical score: 78/100

---

## HIGH

### H1. Soft-404: unknown /recipes/category/, /recipes/cluster/, and /login slugs return HTTP 200 with a generic indexable shell
- SEVERITY: High
- Evidence:
  - `https://www.chefaugustin.com/recipes/category/this-cat-does-not-exist` → HTTP 200, title "Chef Augustin — Small-Batch Dinner Recipes for Two" (generic fallback), and TWO duplicate `<meta name="robots" content="noindex"/>` tags.
  - `https://www.chefaugustin.com/recipes/cluster/nope` → HTTP 200, same generic fallback title + duplicate noindex.
  - `https://www.chefaugustin.com/login` → HTTP 200 with the same generic fallback title; no meta robots; not in sitemap.
- Recommendation: Return true HTTP 404 (or 410) for any unknown recipe/category/cluster slug and for /login (or make /login a genuinely protected page with `noindex`). Remove the duplicated robots meta emitted by the fallback template. This eliminates crawl-budget waste and prevents junk shells from ever being indexed.

### H2. 30% of recipe pages are missing the required `author` property in the Recipe JSON-LD entity
- SEVERITY: High
- Evidence: 9 of 30 recipe pages (all 30 checked) have no `author` key on the `@type: Recipe` node inside the `@graph`, e.g.:
  - `https://www.chefaugustin.com/recipes/mediterranean-chicken-orzo-with-feta-olives-for-two` (keys present: @id, cookTime, datePublished, description, image, keywords, name, nutrition, prepTime, recipeIngredient, recipeInstructions, recipeYield, totalTime — no author)
  - `https://www.chefaugustin.com/recipes/white-wine-lemon-chicken-orzo-for-two`
  - `https://www.chefaugustin.com/recipes/chicken-dinner-for-two`
  - `https://www.chefaugustin.com/recipes/edible-cookie-dough-recipe-for-2`
  - `https://www.chefaugustin.com/recipes/easy-and-healthy-dinner-recipes-for-two`
  - `https://www.chefaugustin.com/recipes/easter-dinner-for-two`
  - `https://www.chefaugustin.com/recipes/creamy-mashed-potatoes-for-two`
  - `https://www.chefaugustin.com/recipes/easy-week-of-meals`
  - (plus 1 more of the 30)
  The other 21 pages do include author (e.g. `/recipes/creamy-parmesan-garlic-chicken-orzo-for-two`). `author` is a required property for Google Recipe rich results; the missing 9 are ineligible. The BlogPosting node carries author, but that does not satisfy the Recipe requirement.
- Recommendation: Add the author property (Person node) to the Recipe entity in the JSON-LD generator for all recipes, and add a schema validation check to the pipeline (e.g. in `lib/quality-gate.ts`) so a recipe without `author` is blocked. Also note: `aggregateRating` appears on only one page (`/recipes/creamy-parmesan-garlic-chicken-orzo-for-two`) — either remove it or apply consistently with genuine review data (Google policy requires real reviews).

### H3. Sitemap hygiene: 97 noindexed category URLs listed + 4 exact duplicate URLs
- SEVERITY: High
- Evidence:
  - `https://www.chefaugustin.com/sitemap.xml` has 169 `<loc>` entries but only 165 unique URLs. Exact duplicates: `/recipes/category/dinner-for-two`, `/recipes/category/one-pan`, `/recipes/category/one-pan-meal`, `/recipes/category/small-batch` (each appears twice).
  - 97 of the 97 crawled noindexed category URLs are present in the sitemap (98 of 123 category pages are `noindex, follow`; 97 unique ones are listed). Noindexed URLs must not be in the sitemap.
  - `/contact` (HTTP 200, indexable, `<title>Contact Chef Augustin | Chef Augustin</title>`) is NOT in the sitemap.
- Recommendation: Exclude noindexed category URLs from the sitemap (or make them indexable), de-duplicate the 4 repeated URLs, and add /contact. Generate the sitemap from the same source of truth that drives meta robots so the two can never drift.

---

## MEDIUM

### M1. 25 indexable category pages vs 30 recipes — thin categories with near-duplicate titles (cannibalization risk)
- SEVERITY: Medium
- Evidence: 25 category pages are `index, follow` (98 are noindexed). Several indexable ones list only 3 recipe cards each (`/recipes/category/lemon`, `/italian`, `/chocolate`, `/rice` all show 3 recipe links; `/recipes/category/30-minute` shows 6). Near-duplicate title sets among indexable pages:
  - "30-Minute Recipes for Two" (`/recipes/category/30-minute`) vs "30-Minute Meal Recipes for Two" (`/recipes/category/30-minute-meal`)
  - "Quick Recipes for Two" vs "Quick Dinner Recipes for Two"
  - "Weeknight Recipes for Two" vs "Weeknight Dinner Recipes for Two"
  - "Chicken Recipes for Two" vs "Chicken Breast Recipes for Two"
  - "One Pan Recipes for Two" vs "Dinner Recipes for Two" vs "For Two" (733 words — biggest category)
- Recommendation: Consolidate overlapping categories (keep the variant with the most recipes or best keyword), or differentiate titles/intros. Add more recipes to the 3-card categories or noindex them. Watch for duplicate `lastmod` timestamps (28 distinct lastmods across 169 URLs suggest generated, not content-based, dates) — use real content-change dates so search engines trust them.

### M2. /dashboard and /login return HTTP 200 without noindex
- SEVERITY: Medium
- Evidence: `https://www.chefaugustin.com/dashboard` → HTTP 200, `<title>Editorial Studio | Chef Augustin</title>`, body contains a client-side 307 redirect to /login (`NEXT_REDIRECT;replace;/login;307;`), NO meta robots tag. `https://www.chefaugustin.com/login` → HTTP 200 with generic fallback title, no meta robots. robots.txt disallows `/dashboard` (and `/api/`), but 200 + no noindex means these shells can be indexed if Google ever finds them (e.g. via leaks); the dashboard admin surface is also exposed at HTTP 200 rather than 401/404.
- Recommendation: Server-side 404/401 the /dashboard and /login routes (or add `<meta name="robots" content="noindex, nofollow">` + `X-Robots-Tag`), and return the real 404 status code at the edge, not a client-side redirect shell.

### M3. Thin indexable hub pages (5 pages under 300 words)
- SEVERITY: Medium
- Evidence (all `index, follow`, all in sitemap): `/histoire` 205 words, `/guides` 212 words, `/idees` 225 words, `/techniques` 226 words, `/equipement` 228 words. Each renders an H1 + intro but "0 articles" (known issue). They are crawlable, indexable, and thin.
- Recommendation: Either publish content on these hubs (they are "handwritten intro" pages awaiting articles) or set them to `noindex` until they have listings. 200-230 words with no content below the intro is below the thin-content bar and wastes crawl budget.

---

## LOW

### L1. IndexNow not implemented
- SEVERITY: Low
- Evidence: `https://www.chefaugustin.com/indexnow.txt` → 404; `https://www.chefaugustin.com/api/indexnow` → 404. No IndexNow protocol support for Bing/Yandex/Naver.
- Recommendation: Add an IndexNow key file + submission endpoint (or submit via API on publish) to accelerate Bing/Yandex discovery of new recipes.

### L2. CSP is minimal (upgrade-insecure-requests only)
- SEVERITY: Low
- Evidence: `content-security-policy: upgrade-insecure-requests` on all pages (homepage + category verified). No default-src/script-src directives.
- Recommendation: Extend CSP with a real policy (self + Cloudinary for images + Google Fonts if used) now that the app is fully static — low risk, meaningful hardening. Not blocking.

### L3. Hostinger edge cache not engaged for HTML (`x-hcdn-cache-status: BYPASS`)
- SEVERITY: Low
- Evidence: HTML responses carry `x-nextjs-cache: HIT`, `cache-control: s-maxage=31536000` but `x-hcdn-cache-status: BYPASS` with `x-hcdn-upstream-rt: 0.42s` — every HTML request reaches the Next.js origin; the CDN edge is not caching HTML. `/_next/image` optimizer also shows `x-nextjs-cache: MISS` + `BYPASS` (0.6s upstream per uncached image).
- Recommendation: Enable edge caching for immutable HTML/static responses in Hostinger CDN config to cut TTFB variability and origin load.

### L4. FAQPage JSON-LD present on recipe pages
- SEVERITY: Low
- Evidence: Recipe pages emit `FAQPage` with 6 Q&A entities (`@type: FAQPage` in the @graph of `/recipes/mediterranean-chicken-orzo-with-feta-olives-for-two`).
- Recommendation: FAQ rich results were deprecated by Google for most sites (2023); the markup is harmless but adds payload. Keep only if the Q&A genuinely adds user value.

---

## INFO / PASS

### I1. HTTP → HTTPS and host canonicalization (PASS)
- Evidence: `http://www.chefaugustin.com/` → 301 → `https://www.chefaugustin.com/`; `http://chefaugustin.com/` → 301 → `https://chefaugustin.com/` → 301 → `https://www.chefaugustin.com/` (2-hop, correct final host). HSTS `max-age=63072000; includeSubDomains; preload` served. Security headers verified: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin.
- Recommendation: None. (Optional: serve HSTS on the bare domain too for the first hop.)

### I2. Legacy French /recettes/ paths: 308 redirect (not 404) (PASS)
- Evidence: `/recettes/some-recipe` → 308 → `/recipes/some-recipe`; `/recettes/category/beef` → 308 → `/recipes/category/beef`; `/recettes` → 308 → `/recipes`. The task expected 404 on French paths; a 308 to the English equivalent is the better outcome (preserves any legacy links). No French content is served.
- Recommendation: None.

### I3. Lab Core Web Vitals — all good (PASS, warm-cache caveat)
- Evidence (Playwright/Chromium 138, mobile viewport 412x915, DP 2.625, after Hostinger JS challenge cleared):

| Page | Status | TTFB | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| / (homepage) | 200 | 438ms | 520ms | 520ms | 0 | 0 |
| /recipes/mediterranean-chicken-orzo-with-feta-olives-for-two | 200 | 455ms | 544ms | 544ms | 0 | 0 |
| /recipes/category/chicken | 200 | 164ms | 556ms | 556ms | 0 | 0 |

  LCP is the hero image (preloaded with `imageSrcSet`, `fetchpriority` high); fonts preloaded; images lazy below fold; no long tasks; CLS 0. Lab results are warm-cache (s-maxage 1y) so cold TTFB will be higher; PSI API was unavailable (rate limit / no key), so no CrUX field data was obtained. HTML serves `content-encoding: br` (brotli) and advertises HTTP/3 (`alt-svc: h3=":443"`).
- Recommendation: None blocking. Note: Hostinger bot protection serves a JS challenge interstitial (403 "Checking your browser…") to headless/automated first visits — confirm Googlebot and other engines in your allow-list are exempt from the challenge; the robots.txt explicit allows for Googlebot/Bingbot/OAI-SearchBot/PerplexityBot are good but the challenge is separate from robots rules.

### I4. Crawlability / robots.txt (PASS)
- Evidence: `robots.txt` serves `Allow: /` for `*`, `Disallow: /dashboard` and `/api/`, explicit allows for OAI-SearchBot, PerplexityBot, Bingbot, Googlebot, and a valid Sitemap declaration. `sitemap_discovery.py` validated `sitemap.xml` (HTTP 200, urlset, valid). `/api/` → 308 → `/api` → 404; `/api/health` and `/api/test` → 404. No `X-Robots-Tag` headers needed since meta robots is present; no accidental noindex on indexable templates (recipes, about, clusters carry no robots meta → default index).
- Recommendation: None (see H3 for sitemap content issues).

### I5. URL structure (PASS)
- Evidence: All category/cluster/recipe slugs are lowercase, hyphenated, parameter-free; no uppercase 404s (`/Recipes` → 404); trailing-slash variants 308 to canonical non-slash form (`/recipes/category/chicken/` → 308 → `/recipes/category/chicken`); query parameters (e.g. `?utm_source=test`) keep the page 200 with self-referencing canonical. Clean, flat, predictable structure: `/recipes/{slug}`, `/recipes/category/{slug}`, `/recipes/cluster/{slug}`.
- Recommendation: None.

### I6. JS rendering / prerendering (PASS)
- Evidence: Fully static prerender — recipe HTML from raw fetch contains full content (Ingredients, Instructions), Open Graph tags, and complete JSON-LD (Recipe, BlogPosting, FAQPage, BreadcrumbList, Organization, Person). No SPA shell; no client-side rendering required for content or structured data. Category pages render 17-119 internal recipe/category links in raw HTML.
- Recommendation: None. (Verify the whole corpus is covered by prerender after any Next.js config change.)

---

## Top priorities (order of execution)
1. Fix Recipe JSON-LD `author` on the 9 affected recipe pages (H2) + add a quality-gate check.
2. Return true 404s for unknown category/cluster/login slugs (H1).
3. Clean the sitemap: remove noindexed categories, de-dupe 4 URLs, add /contact (H3).
4. Consolidate thin/near-duplicate indexable categories (M1).
5. 404 or noindex /dashboard + /login (M2); noindex or fill the 5 thin hubs (M3).
