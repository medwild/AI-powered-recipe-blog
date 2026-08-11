# Claude SEO Audit — www.chefaugustin.com

> **Date:** 2026-08-05 | **Framework:** Claude SEO v2.2.4 | **Business type:** Food Blog / Recipe Publisher
> **Site:** "Easy Weeknight Dinners for Two" — small-batch recipes for two (Next.js 16, Hostinger CDN, prerendered SSR)

---

## Executive Summary

| Metric | Value |
|---|---|
| **SEO Health Score** | **75/100** ⚠️ (+4 vs July 2026 audit: 71) |
| Business Type | Food Blog / Recipe Publisher |
| Pages Crawled | 169 sitemap URLs — **all 200 OK** |
| Indexable Pages | 71 (98 pages noindexed via thin-category gate) |
| Platform | Next.js 16 on Hostinger (hcdn), brotli, HTTP/3, prerendered SSR |
| Domain age | ~1 month (registered 2026-07-02) |
| Previous audit | 71/100 (2026-07-29, Vercel) |

### Top 5 Critical Issues

1. **97 of 165 sitemap URLs are `noindex`** — `app/sitemap.ts` lists every category tag, but `app/recipes/category/[slug]/page.tsx:132` noindexes categories with <3 recipes (`MIN_RECIPES_FOR_INDEX = 3`). Google logs noindex-in-sitemap as a crawl anomaly; 59% of the sitemap is wasted crawl budget.
2. **GPTBot is hard-blocked (429) by Hostinger bot protection** on every URL despite robots.txt allowing it — ChatGPT search cannot crawl the site at all. All other AI crawlers (OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, anthropic-ai) return 200. (The same protection serves a ~5s JS challenge to real first-time visitors.)
3. **123 programmatic category pages for 30 recipes = a flat tag dump, not a taxonomy** — 9-16 sampled pages hold ≤3 cards (some 1), templated "Our collection of 1 … recipe" intros, 5 families of near-duplicate categories cannibalizing one intent (30-minute ×5, chicken ×18, one-pan ×7, dessert ×4, quick ×6). Google's SERPs reward category pages only when deep (dessertfortwo.com holds #2 with 20-90 items).
4. **5 empty top-level hubs** (`/techniques`, `/guides`, `/histoire`, `/idees`, `/equipement`) — "0 articles" thin content, indexable, in sitemap, in global nav. 3 of 5 use French slugs on an English site. Soft-404 risk.
5. **Broken hub-spoke internal linking** — category pages link to **zero** cluster hubs, homepage links to **zero** clusters, recipe pages link to zero categories, and every page emits a 119-link pill cloud that flattens link equity. For a domain with zero external backlinks, internal equity distribution is everything.

### Top 5 Quick Wins

1. **Fix the sitemap gate** — filter noindex categories out of `sitemap.ts` (30 min) → 165 → ~68 URLs. Same for the 4 duplicate URL entries + add `/contact`.
2. **Noindex the 5 empty hubs + remove from sitemap** (30 min) — kills the soft-404 exposure.
3. **301-merge the near-duplicate category families** (30-minute ×5 → 1, chicken ×18 → 3-4, one-pan ×7 → 1, dessert ×4 → 1, quick ×6 → 2) — ~123 → ~35 categories.
4. **Fix the garbled intro on the garlic-shrimp recipe** ("25-minute easy easy mexican dinner recipes recipes two") + sanitize DB description fields (affects llms.txt too). Add a token-repetition check to the quality gate.
5. **Whitelist GPTBot in Hostinger bot protection** (or disable the challenge for verified bots + static paths) — restores ChatGPT visibility.

---

## Category Scores

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Technical SEO | 80/100 | 22% | 17.6 |
| Content Quality | 78/100 | 23% | 17.9 |
| On-Page SEO | 72/100 | 20% | 14.4 |
| Schema / Structured Data | 76/100 | 10% | 7.6 |
| Performance (CWV) | 75/100 | 10% | 7.5 |
| AI Search Readiness | 62/100 | 10% | 6.2 |
| Images | 85/100 | 5% | 4.3 |
| **TOTAL** | | | **75.5 → 75/100** |

---

## 1. Technical SEO — 80/100 ✅

### What Works
- **All 169 sitemap URLs return 200**; zero canonical mismatches; zero missing meta descriptions; titles all 25-60 chars; H1 on every page
- HTTPS enforced (301), apex→www canonical (301, 2-hop), HSTS preload + includeSubDomains
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin
- Fully prerendered SSR (x-nextjs-prerender: 1) — content + JSON-LD in raw HTML, no SPA shell
- robots.txt clean; legacy `/recettes/*` → 308 → `/recipes/*` (correct)
- Lab CWV (warm cache): LCP 520-556ms, CLS 0, TBT 0

### Issues

| Severity | Finding | Recommendation |
|---|---|---|
| **High** | **Soft-404s**: unknown `/recipes/category/*`, `/recipes/cluster/*`, `/login` → HTTP 200 generic fallback shell (category/cluster fallback also emits duplicate noindex metas) | Return true 404/410; fix duplicate robots meta in the fallback template |
| **High** | **Sitemap hygiene**: 97 noindexed category URLs listed; 4 duplicate URLs (`dinner-for-two`, `one-pan`, `one-pan-meal`, `small-batch` ×2 each); `/contact` (200, in nav) missing | Gate sitemap by the same MIN_RECIPES_FOR_INDEX as page.tsx; dedupe by slug; add /contact |
| Medium | `/dashboard` + `/login` return 200 without noindex (client-side 307 shell) | 404/401 server-side or noindex + X-Robots-Tag |
| Medium | 25 indexable categories vs 30 recipes; several hold only 3 cards; near-duplicate titles | Consolidate or differentiate; add recipes or noindex |
| Low | IndexNow not implemented (indexnow.txt 404) | Add for Bing/Yandex |
| Low | CSP minimal (upgrade-insecure-requests only) | Extend with default-src/script-src |
| Low | Hostinger edge cache BYPASS for HTML + `/_next/static` (0.14-0.44s origin round-trip) | Enable CDN edge caching for immutable assets |

---

## 2. Content Quality — 78/100 ✅

### What Works
- **Recipe pages are excellent**: avg 1,832 words; QRG quality detector scores **82-94/100**, 0 AI-pattern flags, ~6th-7th grade; concrete specific prose; "Why This Works" + FAQ sections
- **E-E-A-T scaffolding**: /about (598 words) with explicit brand-persona + AI-assistance disclosure ("not pretending a persona is a person") — exactly what Google's QRG asks of AI-produced content; substantive /contact, /privacy, /terms
- Recipe bylines "By Chef Augustin Lefèvre" + real dates (July 27 - Aug 3, 2026); dateModified in JSON-LD
- FAQPage with real user-intent Q&A on every recipe page

### Issues

| Severity | Finding | Recommendation |
|---|---|---|
| **Critical** | **5 empty hub pages** (205-228 words, "0 articles", indexable, sitemapped, in nav) | noindex + remove from sitemap until ≥1 article; 301 French slugs (/histoire, /idees, /equipement) |
| **High** | **~10 near-duplicate "-for-two" category pages** — verbatim boilerplate incl. "for tworecipes" grammar error; H1 collisions on 3 pairs; each holds exactly 1 recipe card (scaled-content pattern) | 301-merge into base categories; kill the template intro |
| **High** | **Garbled keyword-stuffing artifact on garlic-shrimp recipe intro** — "25-minute easy easy mexican dinner recipes recipes two" (visible to users AND AI crawlers; same garbage in llms.txt for ~9-12 recipes) | Rewrite polluted DB description fields; add token-repetition quality gate (5th check) |
| Medium | 96/123 category pages under 500 words (mean 427); clusters 372-571 words; /recipes index ~43 words | Expand intros to 150-250 words with real topical coverage; add cluster intros |
| Medium | No meaningful dates on category pages; sitemap lastmod is one build timestamp for all URLs | Real dates or omit lastmod |
| Low | Unverifiable about-page claims: "cookbook author" (no book anywhere), "7-criteria quality audit" (real gate = 4 checks) | Remove/qualify; align with the real gate; add named human editor |

---

## 3. On-Page SEO — 72/100 ⚠️

### What Works
- Titles/descriptions/H1s clean across all 169 pages (0 truncations, 0 missing)
- Recipe pages: rich H2 structure (Ingredients → Instructions → Why This Works → What Most Recipes Get Wrong → Chef's Tips → FAQ), keyword in H1
- Category/cluster pages: cards above the fold (53 words of intro before cards on /category/30-minute), image-grid card design
- OG tags complete on recipes; favicon via icon.svg

### Issues

| Severity | Finding | Recommendation |
|---|---|---|
| **High** | **Hub-spoke links broken**: 0/119 category pages link to any cluster; homepage links to 0 of 6 clusters; recipes link to 0 categories; clusters link all 119 categories only via untargeted pill cloud | Mandatory category→cluster body links; targeted 8-12 links per cluster; recipe breadcrumbs with category; homepage cluster cards |
| **High** | **Keyword cannibalization**: 5 overlapping 30-minute pages, 18 chicken, 7 one-pan, 6 quick, 4 dessert + 5 category-vs-recipe collisions (e.g. /category/chicken-dinner-for-two vs /recipes/chicken-dinner-for-two) | 301-merge families; keep recipe as money page; verify with SERP overlap before merging |
| **High** | **Chicken category tag imprecision** — /category/chicken (17 cards) lists 8 broad "for two" recipes with no chicken signal, for a SERP whose winners are explicit chicken dishes | Tag precision: only render recipes carrying the tag |
| Medium | Every page emits 119+ category links (pill cloud + mega-menu) — equity flattened to near-zero per link | Remove global cloud; curated 8-12 links per template |
| Medium | Duplicate H1/H2 on category/cluster pages ("30-Minute Recipes for Two" H1 + "30-minute recipes" H2); "6 recipe s" pluralization typo | Distinct question-oriented H2s; fix pluralization |
| Low | 99 pages with descriptions < 90 chars (category pages); /dashboard linked from public nav | Expand descriptions; remove dashboard link |

---

## 4. Schema / Structured Data — 76/100 ⚠️

### What Works
- **Recipe schema solid on 21/30 recipes**: name, image, author Person, HowToStep (position/name/text), ISO times, yield "2 servings", 10-14 ingredients, keywords, datePublished; BlogPosting mainEntity → #recipe; FAQPage in-graph
- Homepage: WebSite + SearchAction (sitelinks searchbox eligible) + Organization with logo + sameAs
- All 9 sampled pages emit valid JSON-LD (schema.org context, absolute URLs, ISO dates, no deprecated types)
- Correctly NO fake aggregateRating (project rule: don't fabricate ratings)

### Issues

| Severity | Finding | Recommendation |
|---|---|---|
| **High** | **9 of 30 recipe pages missing `author` on the Recipe JSON-LD node** (mediterranean-chicken-orzo, white-wine-lemon-chicken, chicken-dinner-for-two, edible-cookie-dough, easy-and-healthy-dinner, easter-dinner, creamy-mashed-potatoes, easy-week-of-meals + 1) — required for Google Recipe rich results | Add author Person to Recipe node for all; add a schema check to the quality gate |
| **High** | **Duplicate BreadcrumbList JSON-LD on category + cluster pages** (129 of 169 URLs); labels disagree on /category/30-minute ("30-Minute" vs "30-minute") | Emit single BreadcrumbList from one source (page title, not slug) |
| Medium | Recipe missing `nutrition` (NutritionInformation) and `recipeCuisine` on all pages | Add computed, factual values |
| Low | Author name inconsistent: "Lefèvre" vs "Lefevre" across pages; no Person @id | Canonical spelling + `@id: /about#person` |
| Low | Recipe node missing `dateModified` (BlogPosting has it) | Mirror onto Recipe |
| Low | /about Organization incomplete (no logo/sameAs) | Reuse homepage Organization |
| Info | aggregateRating appears on ONE page (creamy-parmesan-garlic-chicken-orzo) — inconsistent; must be removed or applied with real review data | Remove or back with real data |

---

## 5. Performance (CWV) — 75/100 ⚠️

### What Works
- Prerendered static HTML + CDN brotli + ETag + immutable 1y cache headers on `/_next/static`
- **Zero third-party hosts** anywhere (all same-origin) — excellent privacy/performance
- Lab (warm cache): LCP 520ms, CLS 0, TBT 0 (technical audit)
- Images: next/image optimizer, width/height on all imgs (verified on 6 recipe pages — no CLS risk), lazy below fold, hero preloaded with full responsive srcset
- Fonts: self-hosted woff2 (Geist + Playfair), preloaded, crossorigin

### Issues

| Severity | Finding | Recommendation |
|---|---|---|
| **Critical** | **Hostinger JS bot-challenge served to non-JS clients** — plain curl and Googlebot-UA GETs of sitemap.xml and `/_next/static/*` get challenge HTML (200/403), including a `noindex,nofollow` challenge page for the homepage; adds ~5s to every real first visit (visual audit) | Whitelist verified bots (UA + reverse-DNS), exclude /_next/static, /sitemap.xml, /robots.txt from challenge |
| **High** | **Mobile LCP at threshold**: 2.76s home / 2.48s recipe (throttled 4x CPU + 1.6Mbps, includes challenge overhead) | Remove challenge overhead; reduce JS; preload hero |
| **High** | **Heavy JS**: 62 script tags/page, 94.5KB inline JS, ~377-389KB external JS, 1 render-blocking non-async chunk | Slim RSC bootstrap; async the blocking chunk |
| Medium | 37-49 RSC prefetch fetches (88-261KB) per page on a fully prerendered static site | `prefetch={false}` on non-critical links |
| Medium | Approx INP 176-237ms — at the 200ms boundary; TBT 309-411ms throttled mobile | Main-thread pressure from JS/RSC prefetch |
| Low | CDN edge BYPASS observed on all browser requests (0.14-0.44s origin); HTTP/3 advertised but unconfirmed; several @font-face faces report load error | Enable edge caching; verify h3; preload only used font faces |

---

## 6. AI Search Readiness (GEO) — 62/100 🔴

### What Works
- Fully prerendered SSR; robots.txt allows all AI crawlers; explicit allows for OAI-SearchBot/PerplexityBot
- llms.txt present (200), well-formed; recipe pages have answer-nugget sections at optimal passage lengths (134-167 words), FAQ + FAQPage schema, stat chips (prep/cook/servings) in first 1000 chars
- Consistent brand entity (Chef Augustin / chefaugustin.com) across pages, footer, socials, schema

### Issues

| Severity | Finding | Recommendation |
|---|---|---|
| **Critical** | **GPTBot blocked (429) by Hostinger bot protection** — verified 5/5 attempts with official UA strings on every URL; robots.txt allows it, the protection layer blocks it anyway → ChatGPT search cannot crawl the site | Hostinger security settings: whitelist GPTBot; validate with curl after |
| **High** | **Keyword artifacts in llms.txt descriptions** ("easy easy mexican dinner recipes recipes two", "servings servings", wrong PT durations, "Published Articles (0)") — the single highest-leverage AI-citation artifact is polluted | Sanitize DB descriptions, regenerate llms.txt, add quality gate |
| **High** | **Garbled intro on garlic-shrimp recipe visible to AI crawlers** (see Content §2) | Fix DB field (same fix) |
| Medium | Category/cluster pages weak for AI Overviews: duplicate H1/H2, ~40-word intros, no ItemList schema | Distinct H2s, 80-120 word answer-first intros, ItemList JSON-LD |
| Medium | Unverifiable about-page claims ("cookbook author", "7-criteria audit"); no persona-transparency line in the disclosure | Remove/qualify; disclose brand persona |
| Low | llms.txt not linked from footer/sitemap; /api/ disallowed while llms.txt links /api/recipes/raw; FAQ answers 60-100 words (under optimal band); no video content | Footer link; Allow: /api/recipes/raw; expand FAQs; 30-60s how-to videos |

---

## 7. Images — 85/100 ✅

### What Works
- **30/30 recipes have hero images** (og:image verified) — was 13 missing in July (fixed ✅)
- All imgs: width + height (no CLS), descriptive alt text, lazy below fold; hero preloaded with responsive srcset
- next/image optimizer + Cloudinary f_auto,q_auto (webp/avif capable)
- Pinterest-first strategy active (13/13 boards, domain verified)

### Issues

| Severity | Finding | Recommendation |
|---|---|---|
| Low | `<img>` tags carry no explicit `srcset` (only the preload link does); single Cloudinary URL in schema image | Confirm next/image emits responsive candidates; keep schema image ≥720px |
| Low | Recipe schema image is a single URL (no sizes) | Consider ImageObject with width/height |

---

## Action Plan Summary

### Phase 1: Critical Fixes (Week 1)
| Priority | Action | Effort |
|---|---|---|
| 🔴 | Sitemap: filter noindex categories (same gate as page.tsx), dedupe 4 URLs, add /contact | 30 min |
| 🔴 | Hostinger: whitelist GPTBot + exclude /_next/static + sitemap from bot challenge | 30 min |
| 🔴 | Noindex + unsitemap the 5 empty hubs; 301 French slugs | 30 min |
| 🔴 | Fix Recipe JSON-LD `author` on 9 recipes + quality-gate schema check | 1h |
| 🔴 | 301-merge near-duplicate category families (123 → ~35) after SERP-overlap verify | 2h |

### Phase 2: High-Impact (Weeks 2-3)
| Priority | Action | Effort |
|---|---|---|
| 🟡 | Category→cluster + homepage→cluster links; remove 119-pill cloud | 2h |
| 🟡 | Sanitize DB description fields; regenerate llms.txt; token-repetition gate | 1-2h |
| 🟡 | Rewrite category intro templates (count-free, 150-250 words); fix "6 recipe s" | 3h |
| 🟡 | Add nutrition + recipeCuisine to Recipe schema; fix Lefèvre spelling | 1h |
| 🟡 | Return true 404s for unknown category/cluster/login slugs | 30 min |

### Phase 3: Content & Authority (Month 2)
| Priority | Action | Effort |
|---|---|---|
| 🟢 | Fill /techniques + /equipement with 2-3 articles each (reuse recipe sections as seeds) | 4h |
| 🟢 | Publish articles to VAGUE 3 categories (beef, seafood, vegetarian, pork) | Pipeline |
| 🟢 | Add author byline + dates on category pages; filters/time badges on kept categories | 2h |
| 🟢 | Add ItemList of Recipe on category pages (AI citation) | 1h |
| 🟢 | Moz free tier + Bing Webmaster for backlink baseline | 30 min |

### Phase 4: Monitoring (Ongoing)
| Priority | Action | Effort |
|---|---|---|
| 🔵 | Re-crawl Seobility after sitemap fixes | 15 min |
| 🔵 | PSI/CrUX with API key (field CWV) | 30 min |
| 🔵 | Monthly cannibalization + internal-link audit | 1h/mo |
| 🔵 | Re-check Common Crawl after Q3 2026 graph (~Nov-Dec) | 15 min |

---

## Priority Definitions
- **Critical**: blocks indexing or causes penalties (fix immediately)
- **High**: significantly impacts rankings (fix within 1 week)
- **Medium**: optimization opportunity (fix within 1 month)
- **Low**: nice to have (backlog)

*Specialist findings: `findings/` (technical, content, on-page/cluster, schema, sitemap, performance, visual, geo, sxo, backlinks) + verified evidence in `findings/00-main-session-verified.md`. Screenshots in `screenshots/`. Audit data: `audit-data.json`.*
