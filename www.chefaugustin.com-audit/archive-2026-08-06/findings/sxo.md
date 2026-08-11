# SXO Findings — www.chefaugustin.com
> Date: 2026-08-05 | Scope: Search Experience Optimization (page-type fit, user journey, personas, intent landing)
> SERP data: 11 real Google SERPs (US/EN) fetched via the project's own Serper.dev key (`lib/agents/serp.ts` provider). WebSearch API was down in this environment; Serper returned full organic + PAA + related-searches data. See Limitations.

---

## SERP Backwards Analysis — What Google Ranks vs. What the Site Serves

### Head queries ("dinners for two recipes", "recipes for two", "easy dinner ideas for two")

| # | dinners for two recipes | recipes for two | easy dinner ideas for two |
|---|---|---|---|
| 1 | Allrecipes (YouTube video) | Allrecipes (YouTube) | Allrecipes listicle (30-min) |
| 2 | **dessertfortwo.com CATEGORY page** | **dessertfortwo.com CATEGORY page** | **Reddit thread (UGC)** |
| 3 | Allrecipes listicle (20 fall dinners) | Kitchn listicle (21 meals for 2) | **dessertfortwo.com CATEGORY page** |
| 4 | Pinterest board | Pinterest board | Taste of Home listicle |
| 5 | Bon Appetit gallery (43 ideas) | Yummy Healthy Easy listicle | Allrecipes (YouTube) |
| 6 | — | Allrecipes (YouTube) | Pinterest board |

**Consensus: 8/10 results are multi-recipe pages** (listicles, galleries, category hubs, boards). Zero single-recipe posts in the top 6. **Key counter-example: a pure programmatic category page (dessertfortwo.com/category/dinners-for-two/) holds rank #2** for both head queries — proving the category page is a *valid* SERP type for this intent when it has real depth.

### Long-tail "X for two" queries (30 minute / chicken / slow cooker / pasta / sheet pan)

- **"30 minute dinner for two"**: 8/8 multi-recipe (Allrecipes #1, Epicurious gallery, Food Network gallery, OurBestBites category, Taste of Home, Table for Two Blog 30-minute hub, Kitchn "A Week of 30-Minute Meals for 2"). Plus **UGC: Facebook group post #6**.
- **"chicken dinner for two"**: listicle #1 (Table for Two Blog), single recipe posts #2/#4/#8 (Kitchn Tuscan, The Country Cook sheet pan, Half Baked Harvest), gallery #3, category-ish #7. **Mixed SERP: listicles + single recipes + video.**
- **"slow cooker recipes for two"**: Kitchn listicle #1, YouTube #2/#6, Reddit #4, 101CookingForTwo roundup #5.
- **"easy pasta recipes for two"**: Allrecipes listicle #1, **BBC Good Food collection page (category) #2**, listicles #3-5.
- **"romantic dinner ideas for two"**: Bon Appetit gallery #1, then **Reddit #2 + #6, Facebook #7, Quora #8** — UGC dominates positions 2-8.
- **"sheet pan dinner for two"**: gallery #1, single recipes #2/#3, Facebook #5, YouTube #6.
- **"asian recipes for two"**: broad Asian-recipe blogs/listicles (RecipeTin Eats, Beyond Kimchee) — no "for two" specific winner; weak fit for the site's current 1-card category.
- **"small batch cooking for two"**: YouTube #1/#4, **onedishkitchen.com category page #2**, King Arthur article #5.

**SERP verdict:** Google rewards (a) deep listicles/galleries with 15-90 items, (b) *real* category/collection pages with many items (dessertfortwo #2, BBC Good Food #2, onedishkitchen #2), (c) single recipe posts ONLY on the mixed "X for two" long-tail (chicken, sheet pan), and (d) increasingly UGC (Reddit/Facebook/Quora rank top-10 on 4 of 8 queries). chefaugustin.com's page type (category hubs) matches the winning type on head queries — the failure is **depth and card count, not type**. Its category pages carry 1-6 cards vs. the 20-90 items of ranking competitors.

---

## Findings

### F1 — CRITICAL — 123 programmatic category pages are thin near-duplicates of a type Google only rewards when deep

**Evidence:**
- 123 category pages for 30 recipes = **4.1 categories per recipe** (crawl-results.json).
- Card counts (21 sampled pages): avg **4.4 cards/page**; **9/16 pages have ≤3 cards**; asian=1, slow-cooker=1, vegetarian=1, mediterranean-chicken=1, lunch-for-two=1, beef=2, romantic-dinner=2, sheet-pan-dinner=2, meal-prep=2, quick-dinner=3, 30-minute-dinner=1.
- Templated intro literally exposes thinness: "Looking for the best 30-minute dinner recipes for two people? You're in the right place. **Our collection of 1 30-minute dinner recipes** brings profession…" (identical template on /recipes/category/asian with "1 asian recipe"). Intros are 400-word boilerplate clones (word counts 387-733, median 412).
- Sitemap contains duplicate URLs (exact same URL listed twice): dinner-for-two, one-pan, one-pan-meal, small-batch.
- The SERP page type they imitate (dessertfortwo category, BBC Good Food collection) ranks because it lists **20-90 items**. A 1-item "collection" page cannot win any of the 11 SERPs analyzed.

**Recommendation:** Cut 123 → ~25-35 categories. Keep only categories with ≥4 recipes (30-minute, chicken, one-pan, dinner-for-two, dessert, pasta, romantic-dinner, small-batch, date-night, weeknight). 301 the rest to the nearest kept category (or noindex if orphaned). Block rule: a category page must never render while holding <4 cards; below that, serve the parent hub or a curated listicle instead. Rewrite the intro template to count-free editorial copy (the "collection of N" phrasing must go — Seobility already flags template content). Add `ItemList` of `Recipe` objects with images + time, not bare links.

### F2 — CRITICAL — Keyword cannibalization: 5 overlapping 30-minute pages, 6 chicken pages, 4 one-pan pages, all indexable

**Evidence:** Indexable (robots: index, follow) overlapping clusters from crawl:
- 30-minute x4 (`30-minute`, `30-minute-dinner`, `30-minute-meal`, `30-minute-meals`) + `35-minute-meal`
- chicken x6 (`chicken`, `chicken-breast`, `chicken-breast-recipes`, `chicken-for-two`, `chicken-dinner-for-two`, `chicken-recipes-for-two`)
- one-pan x4 (`one-pan` x2 in sitemap, `one-pan-chicken`, `one-pan-chicken-dinner`, `one-pan-dinner`, `one-pan-meal` x2, `one-pan-pasta`)
- dessert x3 (`dessert`, `dessert-for-2`, `dessert-for-two`) and cookie-dough x3, quick x3 (`quick`, `quick-dinner`, `quick-dinner-for-two`), chicken-breast x2, small-batch x2, easy-dinner vs easy-chicken-recipes vs easy-weeknight vs easy.
Each page targets the same query space with ~400 templated words and 1-6 cards. Google sees 10+ near-identical pages competing for one intent — none has the depth to win; crawl budget is wasted on duplicates.

**Recommendation:** One canonical category per intent cluster (see F1 mapping); 301 variants to the canonical. Preserve the 30-minute intent on ONE page and invest all word budget there (target: 1,200+ words, 15+ cards, filter UI) — the "30 minute dinner for two" SERP shows a strong single winner (Allrecipes) takes all top positions.

### F3 — HIGH — /idees ("Dinner Ideas for Two") is an indexable empty shell targeting a head-term listicle SERP

**Evidence:** /idees returns 200, robots "index, follow", H1 "Dinner Ideas for Two", **~225 visible words, zero recipe cards, H2 "Explore more" with no children** (fetched 2026-08-05). "dinner ideas for two" / "dinner for two recipes" (3,600 vol, Semrush niche data) SERPs are 80% listicles with 15-90 ideas. The site's own category /recipes/category/dinner-for-two (19 cards) already covers the intent far better than the hub does.

**Recommendation:** Fill /idees with a genuine listicle (10-15 of the best recipes with images + time + why-it-works — the site's exact SERP-winning type) OR 301 it to /recipes/category/dinner-for-two and noindex the URL. Do not leave it indexable-empty.

### F4 — HIGH — Category pages are the right page type but fail the "decide" step on depth, freshness and trust signals

**Evidence:** Page type is aligned (F1), but per user-story S1 the deciding user wants a scannable menu of many options: ranking pages offer 15-90 items; the site offers 1-19. No publication dates on category pages (freshness 0); no author/E-E-A-T block on category pages (Trust persona gap); no sort/filter (by time, method, protein) — the "30 minute" category cannot sort by actual time even though that is its thesis. UGC outranks the site on 4/8 long-tail SERPs because communities answer "what should I make" with many concrete suggestions.

**Recommendation:** Add per-card metadata badges (time, difficulty, method) + client-side filters (under 30 min / one-pan / protein) on the ~30 kept categories; add author byline + last-updated date on category pages; push card count to ≥8 minimum per kept category by cross-linking related recipes and, where the catalog can't support it, converting the category to a curated listicle section on the parent hub.

### F5 — MEDIUM — Chicken category content-quality mismatch: cards not actually chicken-specific

**Evidence:** /recipes/category/chicken (17 cards) lists `easy-chicken-dinners-for-two`, `chicken-dinner-for-two`, `romantic-dinner-ideas-for-two`, `easy-meal-recipes-for-2`, `easy-and-healthy-dinner-recipes-for-two`, `thanksgiving-dinner-for-two`, `quick-recipes-for-two-for-dinner`, `cooking-for-two` — broad "for two" recipes whose titles carry no chicken signal. For "chicken dinner for two" the SERP's single-recipe winners are explicitly chicken dishes (Tuscan Chicken, Sheet Pan Garlic Parmesan Chicken, Honey Garlic Chicken).

**Recommendation:** Tag precision: a category page must only render recipes carrying that tag. Either retag the 8 broad recipes or accept the category is "chicken + general for-two" and rename intent to "chicken dinners and more" — do not let a query-mismatched card list dilute the page's relevance.

### F6 — HIGH — 5 empty top-level hubs (/techniques /guides /histoire /equipement /idees) are indexable dead ends

**Evidence:** All 5 return 200 with robots "index, follow", identical "Explore more" H2 shell, 205-228 visible words, zero child links (fetched 2026-08-05). Query intents that would land here: "cooking techniques for beginners", "how to pan-sear chicken", "kitchen equipment essentials", "history of french cooking", "dinner ideas for two" (F3). Zero coverage of those intents; Googlebot crawls 5 template pages for nothing.

**Recommendation:**
- /idees → fill as listicle or 301 (F3).
- /techniques, /guides, /equipement → these match real informational queries (techniques/equipment have SERP space for guides). Fill each with 2-3 real articles (reuse recipe "What Most Recipes Get Wrong" + "Chef's Tips" sections as seeds; they already exist on 30 recipes), then surface 6-12 recipe cross-links. If not filled within the sprint: `noindex` until content exists.
- /histoire → lowest value; noindex or fold into /guides.
- Add BreadcrumbList + AboutPage/FAQ schema when filling (currently no breadcrumbs on these pages — prior audit noted).

### F7 — MEDIUM — No recipe-rich results on category pages (ItemList of bare links only)

**Evidence:** JSON-LD on category pages = BreadcrumbList + ListItem only (fetched pages). No CollectionPage, no ItemList of Recipe objects, no image/rating/time metadata in the card markup → category pages are ineligible for recipe rich results even though the recipes themselves have full Recipe schema. The 30 recipes' schema is strong (Recipe + BlogPosting + FAQPage, verified on /recipes/chicken-dinner-for-two).

**Recommendation:** Emit `CollectionPage` + `ItemList` where each item is a `Recipe` node (name, image, totalTime, author). This also feeds the AI-Overview/LLM citability the site already targets (PerplexityBot/OAI-SearchBot allowed in robots.txt).

### F8 — LOW — /dashboard linked from the public navigation

**Evidence:** Homepage and all hub pages include `<a href="/dashboard">` in the primary nav (fetched HTML). If the dashboard renders any admin content publicly, this leaks admin surface; even if it redirects, it wastes crawl and looks broken to users.

**Recommendation:** Remove the link from the public nav (or gate behind auth with a noindex), keep the route itself non-indexable (already blocked in robots per prior audit — verify).

### F9 — POSITIVE — Recipe pages and above-the-fold intent landing are correct

**Evidence:** /recipes/category/30-minute: H1 at byte 11,287, first recipe card at byte 12,200 → **only 53 words of intro before cards**; cards render as an image grid (aspect-[4/3] thumbnails) — intent landing is immediate and good. Recipe page /recipes/chicken-dinner-for-two: 13 H2s (Ingredients, Instructions, Why This Works, What Most Recipes Get Wrong, Chef's Tips, FAQ with 3 Q&A), 1,510 visible words, Recipe+Breadcrumb+FAQPage JSON-LD — the "cook" step is well served. Do not change these; keep the 53-word-intro pattern when rewriting category templates.

---

## User Stories (derived from observed SERP signals)

| # | Story | SERP signal that generated it | Journey stage |
|---|---|---|---|
| S1 | As a busy couple, I want to scan 20+ dinner options in one scroll with photos and time, so I can pick tonight's dinner in under a minute. | 8/10 results for "dinners for two recipes" / "recipes for two" are multi-recipe roundups with 15-90 items (Taste of Home "69 Dinner Ideas", Delish "90 Easy Dinner Recipes for Two") | Decide |
| S2 | As a cook, I want time-to-table visible before I click, so I can filter out anything over 30 minutes. | "30 minute dinner for two" SERP is entirely time-constrained content; PAA: "What food takes 30 minutes to cook?"; Allrecipes #1 "Ready in 30 Minutes or Less" | Decide/Pick |
| S3 | As a cook for two, I want quantities explicitly scaled to 2, including how much chicken to buy, so I don't over-buy or waste. | PAA on "chicken dinner for two": "How much chicken do I need for two people?" and "What can I make with 1 chicken breast for 2 people?" | Decide→Ingredients |
| S4 | As a nervous cook, I want tested, honest feedback from real people, so I trust a recipe before committing. | Reddit/Facebook/Quora threads rank top-10 on "easy dinner ideas for two" (#2), "romantic dinner ideas for two" (#2/#6/#7/#8), "slow cooker recipes for two" (#4), "sheet pan dinner for two" (#5) | Consideration |
| S5 | As a planner, I want a full week of dinners at once, so I don't decide night-by-night. | Kitchn "A Week of 30-Minute Meals for 2" ranks #8 on "30 minute dinner for two" | Decide/Plan |

Coverage: Decide (S1, S2, S5), Consideration/trust (S4), Ingredients/scale (S3), Cook (served by recipe pages — verified strong). **Gap: the category pages only serve the Decide step, and only thinly (1-6 options); the Ingredients/scale step (S3) is the least-served because scaling info is buried in prose, not surfaced at card level.**

---

## Persona Scoring (25 pts each dimension; sorted weakest first)

| Persona | Relevance | Clarity | Trust | Action | Total | Weakest dim → fix |
|---|---|---|---|---|---|---|
| **Meal planner** | 12 | 8 | 6 | 6 | **32/100** | No weekly plan content, no scale/double info at card level, no shopping-list CTA. SERP evidence: Kitchn week-of-meals ranks; PAA "How to feed two people cheaply?" → add a "Plan a week" section on /dinner-for-two category + printable 2-person shopping lists on recipes. |
| **Beginner cook** | 15 | 10 | 5 | 8 | **38/100** | Trust 5: no techniques content (/techniques empty), no video, author authority invisible on category pages; recipe "Chef's Tips" exist but are unreachable from the decide step. Fix: fill /techniques with 2-3 how-tos, link "Beginner?" chip from cards, add author byline on category pages. |
| **Date-night cook** | 18 | 11 | 7 | 9 | **45/100** | Clarity 11: /idees empty while "romantic dinner ideas for two" SERP is galleries + UGC; /romantic-dinner category has 2 cards. Fix: fill /idees as a 10-15 item listicle (F3), 301 duplicate romantic-dinner/date-night categories into one. |
| **Busy couple (weeknight)** | 18 | 12 | 8 | 10 | **48/100** | Strongest persona, still failing: card count (F1) and no time/difficulty filters (F4). Fix: ≥8 cards + filter UI + time badges on kept categories; homepage (10 cards, category grid) is the best page on the site — replicate its pattern on categories. |

---

## SXO Gap Score: 46/100 (separate from the 71/100 SEO Health Score from the July crawl audit)

| Dimension | Max | Score | Evidence |
|---|---|---|---|
| Page Type | 15 | 11 | Category hubs match the winning multi-recipe SERP type (dessertfortwo #2, BBC Good Food #2), but 9/16 sampled categories hold ≤3 cards |
| Content Depth | 15 | 4 | ~400-word templated intros, "Our collection of 1 recipe"; competitors offer 15-90 items |
| UX Signals | 15 | 8 | 53-word intro before cards is excellent; but no filters, no time badges, 1-card pages look broken |
| Schema | 15 | 8 | Strong Recipe schema on recipes; category pages carry only BreadcrumbList + bare ItemList |
| Media | 15 | 7 | Card image grid present; prior audit: 43% of recipes lack hero images |
| Authority | 15 | 4 | No author/E-E-A-T on category pages; UGC (Reddit/Facebook/Quora) outranks on 4/8 long-tail SERPs |
| Freshness | 10 | 4 | No publication/last-updated dates on category pages; static template content |
| **Total** | 100 | **46** | |

---

## Limitations

- **SERP data source:** Google SERPs fetched via Serper.dev (US/EN) — the project's own production SERP provider. The WebSearch tool was down in this environment (API model-name error); Bing RSS was used as a cross-check but garbled multi-word queries and served non-US markets (e.g. Italian "arancia" results), so Bing data was discarded. 11 Google SERPs analyzed (5 core + 6 category-mirroring), not the full 123 category-query set.
- **Page-type classification** of SERP results was inferred from URL patterns + titles (e.g. /gallery/, /collection/, /category/) without rendering each competitor page; a small error margin exists.
- **AI Overview presence** could not be confirmed: Serper responses returned no aiOverview block for these queries, but the July Semrush dataset lists "AI Overview" features for "dinner for two recipes" — treat AIO as likely present for US users.
- **Card counts** were measured on 21 of 123 category pages (sampled); the "≤3 cards" ratio (9/16) is an estimate for the full set.
- Recipe-card relevance on the chicken category (F5) was judged by title only; full recipe content was not re-parsed for each of the 17 cards.
- No rendered-DOM (Playwright) verification was run; analysis used server-rendered HTML, which for this Next.js site matched the crawl data.

---

## Priority Order

1. F1+F2 (collapse 123 categories → ~30, 301 duplicates, kill template intros) — unlocks everything else
2. F3+F6 (/idees listicle or 301; fill or noindex 4 remaining hubs)
3. F4 (filters + time badges + author/date on kept categories)
4. F7 (Recipe-rich ItemList on category pages)
5. F5 (tag precision on chicken)
6. F8 (remove /dashboard from public nav)
