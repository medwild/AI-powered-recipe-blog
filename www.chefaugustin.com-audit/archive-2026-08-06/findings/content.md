# Content Quality Findings — www.chefaugustin.com

Audit date: 2026-08-05 — Content Quality specialist
Scope: 169 crawled URLs (123 /recipes/category/*, 30 /recipes/{slug}, 6 /recipes/cluster/*, 10 top-level + homepage) + on-demand fetches of /about, /contact, /privacy, /terms, 5 hub pages, 8 category pages, 4 recipe pages.
Method: crawl-results.json word counts; render_page.py (raw mode; Playwright unavailable in this environment — libglib missing); raw HTML parsing; content_quality.py (QRG Sept 2025 §4.6.5/§4.6.6/§4.6 filler + AI-pattern detector, local, no API key).

---

## 1. THIN CONTENT — 5 EMPTY CATEGORY HUBS

### SEVERITY: Critical
**Title: /techniques, /guides, /histoire, /idees, /equipement are empty hub pages (0 articles), indexable and in sitemap — thin content**

Evidence:
- All 5 pages render "0 articles — No articles in this category yet. Browse the homepage" plus one intro paragraph. Total visible text (incl. intro): /techniques 226 words, /guides 212, /histoire 205, /idees 225, /equipement 228 (crawl-results.json; trafilatura-extracted text 84 words each — nav included).
- All 5 are in sitemap.xml with changefreq=weekly, priority=0.7 (sitemap has 169 URLs total, all confirmed live).
- No article cards render (verified in raw HTML). These are the site's core "pillar" sections (Techniques, Guides, History, Equipment, Ideas) — they promise content that does not exist.
- Note: /histoire and /equipement are French-language slugs on an English-language site; /idees likewise (inconsistent with English /techniques, /guides).
- The homepage, /recipes index, category pages and footer all deep-link to these hubs (nav "Techniques / Guides / Histoire / Equipment / Ideas"), so they receive internal link equity.
- Google's thin content policy: pages with no substantive content ("no articles yet") are textbook thin content; indexable + sitemapped + linked = crawled and evaluated, diluting site quality at scale (5 pages).

Recommendation:
1. Immediate: remove the 5 empty hub URLs from sitemap.xml and set noindex on them until content exists.
2. Short term: publish at least 3-5 substantial articles per hub (min ~1,500 words each) OR consolidate: merge /histoire and /idees into /guides and redirect.
3. Long term: do not ship hub routes until they have real content — gate indexability on article count (e.g., auto-noindex when 0 articles). Also fix French-slug inconsistency (/histoire, /equipement, /idees) for an English-Tier-1 audience.

---

## 2. THIN CONTENT — CATEGORY PAGES

### SEVERITY: Medium
**Title: All 123 category pages are thin (387-733 words, mean 427) — below the 500-600 word floor for location/hub-style pages, most below 450**

Evidence:
- crawl-results.json distribution: category pages min=387, max=733, mean=427. 96 of 123 pages are under 500 words.
- Representative intro lengths (trafilatura): /recipes/category/lemon 30 words, /recipes/category/italian 27, /recipes/category/dessert 33, /recipes/category/chicken 41. The intro + "Explore more…" line are the only unique text; remainder is recipe cards.
- content_quality.py flags category intros: /recipes/category/chicken — overall_quality 65, flags ["low-density","thin-content"] (41 tokens); /recipes/category/lemon — 65, ["low-density","thin-content"] (29 tokens).
- Note: word-count floors are topical-coverage heuristics (Google: word count is not a direct ranking factor). The real problem is low information density: one generic intro paragraph per category does not cover the topic.

Recommendation: extend category intros to 150-250 words each with genuine topical coverage (ingredient handling, scaling tips, common mistakes, related-category links), or reduce indexable category count. Prioritize the ~96 pages under 450 words. The 22 handwritten intros added 2026-08-04 are a good baseline — expand them with technique/ingredient-specific guidance rather than generic "scaled for two" boilerplate (see also §5 duplication).

---

## 3. DUPLICATE CONTENT — CATEGORY "FOR TWO" TEMPLATE

### SEVERITY: High
**Title: Near-duplicate category page cluster: base vs "-for-two" slug variants with identical template, near-identical H1s and duplicate sitemap entries**

Evidence:
- Identical "Looking for the best {kw} for two recipes for two people?… Our collection of 1 {kw} for two recipe brings professional French technique…" template on /recipes/category/chicken-for-two, /dessert-for-two, /quick-dinner-for-two (verbatim, incl. grammar error "for tworecipes"), plus /one-pan-for-two, /small-batch-for-two, /one-pan-meal-for-two (same 30KB shell; 3-word text body).
- H1 collisions on distinct URLs (crawl-results.json):
  - "Chicken Recipes for Two" on /recipes/category/chicken-for-two AND /recipes/category/chicken
  - "Dessert Recipes for Two" on /recipes/category/dessert-for-two AND /recipes/category/dessert
  - "Quick Dinner Recipes for Two" on /recipes/category/quick-dinner-for-two AND /recipes/category/quick-dinner
  - Duplicate H1 within a single page: /recipes/category/one-pan, /one-pan-meal, /small-batch each render their H1 twice; /recipes/category/dinner-for-two appears twice in the crawl itself.
- Duplicate URL entries in sitemap.xml: /recipes/category/dinner-for-two listed twice.
- The "-for-two" variants each contain exactly 1 recipe card (e.g., "Our collection of 1 chicken for two recipe…"), i.e., a whole indexable page for a single recipe — scaled-content-abuse pattern (QRG §4.6.5).
- Same-template intros on the base variants (e.g., /chicken: "The most versatile weeknight protein, portioned for two…" vs /chicken-for-two's template) — 7+ pairs of near-duplicate pages competing for the same queries.

Recommendation:
1. Consolidate: 301 the "-for-two" variants into their base category (or vice versa), keeping one canonical page per topic. This removes ~10+ near-duplicate pages and resolves H1 collisions.
2. Fix duplicate sitemap entries and double H1 rendering on /one-pan, /one-pan-meal, /small-batch.
3. Fix the grammar bug "for tworecipes" wherever the template is kept, and rewrite templates so each category has a unique intro (no copy-paste boilerplate).

---

## 4. DUPLICATE CONTENT — CLUSTER PAGES

### SEVERITY: Medium
**Title: Cluster pages thin (372-571 words) and functionally similar to category pages**

Evidence:
- crawl-results.json: /recipes/cluster/budget-meals-for-two 372 words, /recipes/cluster/small-batch-slow-cooker 376, /recipes/cluster/asian-inspired-dinners 390 — the 3 thinnest pages on the site after the 5 empty hubs; all 6 clusters ≤ 571 words.
- /recipes index: only 43 extracted words (recipe cards) — an index page with 30+ cards and almost no intro text.

Recommendation: add 150-250-word hand-written intros to the 6 cluster pages (they receive breadcrumb links from recipes, e.g., "Quick & Healthy Dinners for Two"), and add a real intro + H2 to /recipes. Alternatively fold clusters into category pages if overlap is too high.

---

## 5. E-E-A-T — ABOUT PAGE AND PERSONA TRANSPARENCY

### SEVERITY: Info (Positive finding with caveats)
**Title: About page exists, has a transparency disclosure and contact info; persona is explicitly disclosed as a brand persona — but claims are unverifiable and no human editor is named**

Evidence (full /about text, 598 words, fetched 2026-08-05):
- H1 "Chef Augustin Lefèvre" + subtitle "French-trained chef, cookbook author, and advocate for practical weeknight cooking for two."
- Story: "I trained in the professional kitchens of Lyon — not the tourist spots, the real ones…" — first-person experience claims.
- Explicit disclosure (the good part): "About Our Content — Chef Augustin is a culinary brand persona — a voice that brings together AI-assisted research, professional recipe development, and editorial expertise… We believe in transparency: great recipes come from great technique, not from pretending a persona is a person." This complies with the project's Rule 13 (no fake credentials) and is an E-E-A-T positive: the site does not hide that the persona is fictional.
- Contact: hello@chefaugustin.com (also on /contact page — see §6). Organization/Person JSON-LD present on /about (1 valid block).
- Caveats: (a) "cookbook author" claim — no cookbook title, publisher or link anywhere on the site (unverifiable credential); (b) "professional kitchens of Lyon" — unverifiable; (c) "Every recipe… tested" — no human tester is named; the site-wide footer claim "Human-tested & verified" cannot be verified externally; (d) no named human editor/reviewer anywhere.
- Per Sept 2025 QRG: disclosing AI-assisted authorship is exactly what Google asks of AI-produced content; this is a strength. But the uncorroborated "French-trained chef / cookbook author" credentials are exactly the kind of unverifiable self-claims the QRG says to discount.

Recommendation:
1. Keep and surface the transparency disclosure (maybe move a short version onto recipe pages / footer).
2. Remove or qualify unverifiable credentials: replace "cookbook author" with what is true (e.g., "food writer"), or provide proof (actual cookbook link).
3. Add a named human editor/reviewer (even a pseudonym, transparently framed) and a "testing process" page describing how recipes are tested, with dates.
4. Add a "Last updated" date on /about.

---

## 6. E-E-A-T — CONTACT, PRIVACY, TERMS

### SEVERITY: Low
**Title: Contact page and legal pages exist and are substantive; /contact not linked in footer; no email privacy detail visible in extraction**

Evidence:
- /contact (200, ~465 words): email hello@chefaugustin.com, response-time promise ("typically respond within 1–2 business days"), FAQ (scaling, sponsored content policy, copyright/photo reuse policy, troubleshooting). Strong trust signal.
- /privacy (582 words, last updated July 8, 2026): sections on usage data (Google Analytics), cookies, contact info, GDPR/CCPA mention ("Access, correction, or deletion of personal data under GDPR, CCPA…").
- /terms (724 words, last updated July 8, 2026): informational-purposes-only disclaimer, content copyright.
- Contact info is also in the footer of every page (email shown in footer extraction) and in the /about page.
- Caveat: nav shows a "Studio" link that 404s (HTTP 404 — checked). /contact exists but is not in the header nav (footer "Legal" links only Privacy/Terms).

Recommendation:
1. Add /contact to footer/header nav (the site currently links to a 404 "Studio" instead).
2. Either implement the Studio page or remove the link — a 404 in primary nav is a broken trust/UX signal.
3. Consider adding an explicit "Disclosure" section in /terms or /about stating AI-assistance policy (currently only in /about).

---

## 7. E-E-A-T — RECIPE PAGE BYLINES, DATES, FRESHNESS

### SEVERITY: Info (Positive finding)
**Title: Recipe pages have author bylines, publication dates, modified dates and freshness signals — good E-E-A-T hygiene**

Evidence:
- Byline on every recipe page tested: "By Chef Augustin Lefèvre" + date — e.g., Salmon Orzo: July 29, 2026; Chocolate Chip Cookies: July 27, 2026.
- JSON-LD BlogPosting on salmon recipe: datePublished 2026-07-29T18:29:06.534Z, dateModified 2026-07-30T17:59:56.890Z (modified next day — genuine update signal), author Person with url → /about.
- htmldate publication_date per page (e.g., salmon 2026-07-30, white-wine-lemon-chicken 2026-08-03, cookie 2026-07-27) — content is actively being published/updated (July-Aug 2026, within 1 month of audit).
- Footer trust line on recipe pages: "Regularly updated · Human-tested & verified ·".
- Freshness concern: htmldate returns 2015-01-01 for /recipes/category/chicken — either a bogus date in HTML or an extraction artifact; category pages appear to lack real dates (see §9).

Recommendation: maintain this; add dateModified to visible page (not just schema) on recipe pages; ensure category pages carry last-updated dates too (see §9).

---

## 8. READABILITY AND AI-CONTENT SCORING — RECIPES

### SEVERITY: Info (Positive finding)
**Title: Recipe content scores high on QRG-based quality detector (82-94/100), no AI-pattern or filler flags; reading level ~6th-7th grade**

Evidence — content_quality.py (Sept 2025 QRG §4.6.5/§4.6.6/§4.6 heuristics) on full recipe bodies:
- Salmon Orzo (2,331 tokens): overall 85, filler 0, ai_pattern 0, info density 0.485, repetition 12, no flags.
- White Wine Lemon Chicken Orzo (1,899 tokens): overall 86, filler 0, ai_pattern 0, density 0.532, repetition 14, no flags.
- Chocolate Chip Cookies (1,413 tokens): overall 94, filler 0, ai_pattern 0, density 0.856, repetition 13, no flags.
- Romantic Dinner for Two (2,875 tokens): overall 82, filler 9 (1 match: "at the end of the day"), ai_pattern 0, repetition 21 — minor filler, still clean.
- Manual read (salmon, cookie pages): short sentences, second person, concrete quantities ("2 (6-ounce) skin-on salmon fillets"), specific temperatures/techniques ("Cook undisturbed for 4–5 minutes until skin is deep golden") — reads at roughly 6th-7th grade level; appropriate for a general home-cook audience.
- Structure per recipe: title → meta (prep/cook/servings/skill) → "Why This Recipe Works" → ingredients (with quantities) → Instructions → Tips & FAQ → Chef's Tips → Frequently Asked Questions → storage/reheating/freezing notes → JSON-LD.
- The one flagged filler ("at the end of the day") in romantic-dinner page: trivial, but shows the detector works.

Recommendation: no action required beyond the minor filler cleanup; keep the concrete, specific style (this is what separates these pages from generic AI content). Watch repetition score 21 on the romantic-dinner page (longest article) — check for repeated phrasing in its sections.

---

## 9. AI CITATION READINESS — RECIPE PAGES

### SEVERITY: Info (Positive finding, 2 minor gaps)
**Title: Recipe pages are highly AI-citation-ready: complete Recipe schema graph, FAQPage, HowToStep, Nutrition, JSON-LD dates; minor gaps: no aggregateRating, no visible dates**

Evidence (salmon recipe full JSON-LD extraction, 7,647-byte graph, both blocks valid):
- Recipe node: name, image (Cloudinary), author Person, prepTime/cookTime/totalTime ISO 8601, recipeYield "2", 15 recipeIngredient strings, 9+ HowToStep with position+name+text, description, keywords, BlogPosting with datePublished/dateModified.
- FAQPage with 5 questions (storage, freezing, serving, doneness) + Answer nodes; Organization + Person nodes in-graph; BreadcrumbList 4 levels.
- On-page structure is consistent with schema: ingredients list, numbered instructions, FAQ section, tips, storage notes — everything an LLM needs to cite (clean extraction confirmed: trafilatura pulled the intro cleanly in rendered mode).
- Gaps:
  - No aggregateRating / Review anywhere — expected (Google discourages fake reviews; site says "No fake reviews, no bought ratings"), fine to omit.
  - No visible publication/update date in the page body (dates only in schema + small byline). For AI citation and freshness perception, show date + "Updated" in visible content.
  - Instructions not duplicated as <ol> semantic list? (Instructions exist as numbered steps in text; schema HowToStep is the citation-grade part — OK.)

Recommendation: add visible "Published July 29, 2026 · Updated July 30, 2026" near the byline; optionally add a "Why you can trust this recipe" 3-bullet block (USDA temps, testing) which LLMs frequently quote. No changes needed to the schema itself — it is complete and valid.

---

## 10. FRESHNESS SIGNALS

### SEVERITY: Medium
**Title: Recipes are fresh (July-Aug 2026 dates) but category/hub pages have no meaningful dates and one has a bogus 2015 date**

Evidence:
- Recipe pages: htmldate + JSON-LD dates 2026-07-27 to 2026-08-03 (actively maintained).
- /recipes/category/chicken: htmldate 2015-01-01 — invalid/bogus date (site launched 2026), likely an artifact of missing date markup being parsed as a default; signals category pages carry no real dates.
- Other category pages: htmldate 2026-01-01 (default) — no real per-page dates.
- Sitemap lastmod is 2026-08-05T11:04:53Z for ALL URLs (a single build timestamp — no meaningful per-URL lastmod), so sitemap freshness signals are useless to search engines.

Recommendation: add real datePublished/dateModified markup + visible dates to category and hub pages; fix the 2015 artifact; stop stamping a single build time as lastmod across all URLs.

---

## 11. TECHNICAL NOTE — TOOLING LIMITATIONS

### SEVERITY: Info
**Title: Playwright unavailable in this environment; content_quality.py usable locally**

Evidence: render_page.py --mode always fails ("error while loading shared libraries: libglib-2.0.so.0") — chromium-headless-shell cannot launch; all page analysis used raw prerendered HTML (site is fully server-rendered/prerendered, x-nextjs-prerender: 1, so raw mode is complete). content_quality.py runs offline (no API key). nlp_analyze.py requires a Google Cloud API key (not available) — not used.

Recommendation: none for the site; note for future audits that raw mode suffices for this Next.js-prerendered site.

---

## PRIORITY SUMMARY

| Priority | Item | Issue |
|---|---|---|
| P0 | §1 | 5 empty hub pages: thin content, indexable, sitemapped (Critical) |
| P0 | §3 | ~10 near-duplicate "-for-two" category pages, H1 collisions, duplicate sitemap entry (High) |
| P1 | §2 | 96/123 category pages < 500 words, low density (Medium) |
| P1 | §10 | Category pages lack real dates; 2015 bogus date; lastmod useless (Medium) |
| P1 | §4 | Cluster pages 372-571 words, no intros (Medium) |
| P2 | §6 | /contact not in footer; "Studio" nav link 404s (Low) |
| P2 | §5 | Unverifiable "cookbook author"/"Lyon kitchens" claims; no named human editor (Low/Info) |
| — | §7, §8, §9 | Recipe pages: strong E-E-A-T hygiene, high quality scores (82-94), fully citation-ready schema (Positive) |
