# GEO / AI Search Readiness — www.chefaugustin.com

Audit date: 2026-08-05
Scope: robots.txt, llms.txt, 2 recipe pages (mediterranean-chicken-orzo-with-feta-olives-for-two, chocolate-lava-cakes-for-two), 1 category page (/recipes/category/30-minute), 1 cluster hub (/recipes/cluster/one-pan-dinners-for-two), homepage, about page, 6 additional recipe pages (artifact prevalence check).

## GEO Readiness Score: 79/100

| Dimension | Weight | Score | Notes |
|---|---|---|---|
| Citability | 25% | 20/25 | Near-optimal passage lengths, but one garbled intro poisons citations |
| Structural Readability | 20% | 16/20 | Excellent H2/H3 on recipes; duplicate H1/H2 + typos on category/cluster pages |
| Multi-Modal Content | 15% | 10/15 | Cloudinary images + alt text, Pinterest-first; no video on pages |
| Authority & Brand Signals | 20% | 14/20 | Consistent entity, strong E-E-A-T page; unverifiable claims, no Wikipedia/Reddit |
| Technical Accessibility | 20% | 19/20 | Fully prerendered SSR, permissive robots, rich schema; minor llms.txt link gap |

Platform readiness: Google AIO — READY (FAQ + schema + answer nuggets). ChatGPT — READY with caveats (llms.txt artifacts). Perplexity — READY. Bing Copilot — READY.

---

## 1. AI Crawler Access — PASS (no blocking)

robots.txt (fetched 2026-08-05) is fully permissive:

```
User-Agent: *
Allow: /
Disallow: /dashboard
Disallow: /api/

User-Agent: OAI-SearchBot
Allow: /

User-Agent: PerplexityBot
Allow: /

User-Agent: Bingbot
Allow: /

User-Agent: Googlebot
Allow: /

Sitemap: https://www.chefaugustin.com/sitemap.xml
```

- GPTBot, ClaudeBot, Google-Extended, anthropic-ai, cohere-ai, CCBot: NOT explicitly listed → fall under `User-Agent: *` → ALLOWED by default. No crawler is blocked.
- No weird/accidental rules. `/dashboard` and `/api/` disallows are legitimate.
- Site is fully server-rendered (raw HTML 158-208 KB per page, headings/text present pre-JS) — no SPA shell, no CSR risk for AI crawlers.

### LOW-1 — robots.txt: /api/ disallowed while llms.txt links to /api/recipes/raw
- Evidence: `Disallow: /api/` + llms.txt "For LLMs" section points to `https://www.chefaugustin.com/api/recipes/raw` (returns 200 when fetched directly).
- Recommendation: Add an explicit `Allow: /api/recipes/raw` line for the llms.txt-referenced endpoint (or move the raw export to a non-/api/ path), so strict robots-respecting crawlers don't hit a contradiction between llms.txt and robots.txt.

### LOW-2 — No explicit GPTBot / ClaudeBot entries
- Evidence: Only 4 named crawlers + wildcard. GPTBot/ClaudeBot are allowed via `*`, which is sufficient today.
- Recommendation (optional hardening): add `User-agent: GPTBot` / `User-agent: ClaudeBot` `Allow: /` blocks for zero ambiguity as AI search traffic grows. Low effort, no downside.

---

## 2. llms.txt — PRESENT but with quality issues

### llms.txt exists (200) — positive, contrary to the expected 404
- `https://www.chefaugustin.com/llms.txt` → 200. Well-formed Markdown: About, Key Pages, "For LLMs" (raw recipes API + sitemap), and 30 recipes with description + PT-duration/difficulty/servings metadata.
- `llms-full.txt` → 404 (expected/fine — llms.txt is the convention).
- `.well-known/llms.txt` → 404, `.well-known/resource-links` → 404, `.well-known/resource-list` → 404 (RSL not implemented).

### MEDIUM-1 — Keyword-stuffing artifacts inside llms.txt descriptions
- Evidence (verbatim from llms.txt):
  - Garlic Shrimp Orzo: "That's what's waiting for you in this 25-minute **easy easy mexican dinner recipes recipes two**."
  - 25-Minute One-Pan Garlic Herb Chicken: "…Garlic Herb **easy chicken dinners for two for two for two** (PT45M, Easy, 2 servings)"
  - Several entries: "2 servings **servings**", "PT34M, Easy, 2 **servings servings**", and multiple "(PT45M)" values mismatching the "25-minute/28-minute" claims in the same line.
  - Trailing empty section: `## Published Articles (0)`.
- Impact: llms.txt is the single highest-leverage AI-citation artifact. LLMs ingesting it (and the raw API) will reproduce these garbled strings in brand descriptions. Combined with MEDIUM-5 (live page), this is a data-quality pipeline issue, not just a copy issue.
- Recommendation: sanitize the source description field in the DB (strip repeated keyword fragments; the descriptions should be rewritten, not regex-cleaned), then regenerate llms.txt. Add a quality gate that rejects `(\w+ ){2,}` repetition artifacts. Verify against the raw API export before re-deploying.

### MEDIUM-2 — llms.txt not linked from the site
- Evidence: footer contains brand, tagline, email, socials, site links — no `llms.txt` link anywhere in the page HTML.
- Recommendation: add a "For AI / llms.txt" link in the footer and reference llms.txt in sitemap.xml (or at least in the footer), per the llms.txt discoverability convention. Currently only discoverable by direct-path convention.

### LOW-3 — No RSL (Resource Links) support
- Evidence: `.well-known/resource-links` and `.well-known/resource-list` → 404.
- Recommendation: optionally add `/.well-known/resource-links` (JSON) pointing to llms.txt + sitemap.xml. Small win for RSL-aware crawlers.

---

## 3. Citability — STRONG structure, one critical content bug

### PASS — Answer nuggets at optimal passage length (recipe: orzo)
Section word counts (trafilatura-equivalent body text):
- "Article and tips" intro: ~166 words — inside the 134-167 optimal AI-citation band
- "Why This One-Pan Wonder Works": ~165 words — optimal
- "What Most Recipes Get Wrong": ~153 words — optimal
- "Chef's Tips & What I've Learned": ~200 words
- FAQ: ~489 words total (6 answers, 60-100 words each)
- Direct, first-person advice style ("Most recipes lean on chicken thighs… I wanted a version that works with the chicken you're more likely to have on hand") — high extractability.

### PASS — Answer near top of page
- First ~1000 chars of body text: H1 → summary paragraph ("A bright, one-skillet dinner that channels a Greek taverna in 30 minutes flat…") → Prep/Cook/Servings/Skill chips (10 min / 20 min / 2 / Easy). AIO can answer "how long" / "servings" instantly.
- Meta descriptions clean and complete (orzo: 131 chars; lava: 140 chars).

### PASS — FAQ with schema
- orzo page: H2 "Frequently Asked Questions" + 6 question-H3s ("How do I make Mediterranean chicken orzo with feta and olives for two?", "Can I freeze…?", "How long does…last in the fridge?", "What to serve…?", "What are the most common mistakes…?", "Is this dish gluten-free?") + matching FAQPage JSON-LD with self-contained answers (each answer is a complete extraction unit, includes 165°F/74°C food-safety specificity).
- lava page: 5 question-H2s without an "FAQ" wrapper H2 ("Can I make dessert for two without a scale?", "Why did my lava cake not have a molten center?"…) — acceptable, but inconsistent with the orzo pattern.

### HIGH-5 — Garbled keyword-stuffing text in live recipe intro (garlic shrimp page)
- Evidence — first paragraph of the page (visible body text, position 27668 of HTML, right after the summary sentence):
  "A single skillet. Bright, burst cherry tomatoes. Perfectly pink shrimp. Toasted orzo that drinks up every last drop of garlicky, wine-kissed sauce. That's what's waiting for you in this **25-minute easy easy mexican dinner recipes recipes two**."
- Same artifact string appears twice in the HTML. Page title is "Garlic Shrimp Orzo & Cherry Tomatoes | Chef Augustin" — so the sentence contradicts the dish it's on.
- Impact: CRITICAL for citability — an AI crawler that cites this page will quote "easy easy mexican dinner recipes recipes two" verbatim, destroying trust in the citation and the brand. This is the top fix.
- Prevalence check: 5 other sampled recipe pages (thanksgiving-dinner-for-two, quick-recipes-for-two-for-dinner, dessert-for-2, romantic-dinner-ideas-for-two, easy-chicken-dinners-for-two) are CLEAN of `(for two){2,}` / `(recipes){2,}` artifacts in HTML, but the same garbage persists in llms.txt descriptions for ~9 recipes — so the DB field is polluted broadly while only some pages render it. Fix the DB field, not the page.
- Recommendation: rewrite the affected description fields in DB (11-12 recipes per llms.txt), regenerate all pages + llms.txt, add a content-quality gate rejecting repeated-token artifacts (the existing quality gate has 4 checks; add a 5th for token repetition).

### LOW-4 — FAQ answers below optimal passage length
- Evidence: individual FAQ answers run 60-100 words; the 134-167 word band correlates with higher AI citation.
- Recommendation: expand the weakest answers (freezing, storage) with one more concrete detail each (~140 words). Low effort, direct citability gain.

---

## 4. Multi-Modal Content — ADEQUATE

- Images: Cloudinary-hosted, `loading="lazy"`, descriptive alt text ("30-Minute Mediterranean Chicken Orzo with Feta and Olives for Two"), present in Recipe schema `image` array. Pinterest-first strategy (Pinterest verified per memory: 13/13 boards) aligns with the ~0.737 YouTube/citation correlation only partially — no video content.
- No embedded video on recipe pages; YouTube channel link exists in footer (@chefaugustin) but no video embeds on pages.
- Recommendation: add a 30-60s "how to" video embed to the top-5 traffic recipes (YouTube is the strongest brand→AI-citation signal). Low urgency.

---

## 5. Authority & Brand Signals — GOOD, with honesty caveats

### PASS — Consistent brand entity
- Name "Chef Augustin" in every recipe `<title>` ("…| Chef Augustin"), footer brand block, publisher Organization JSON-LD, llms.txt.
- Persona name "Chef Augustin Lefèvre" identical on about H1, BlogPosting author, llms.txt.
- Socials: Instagram.com/chefaugustin, Pinterest.com/chefaugustin, YouTube.com/@chefaugustin — handle-consistent in footer.
- Footer tagline: "Small-batch dinner recipes for two, grounded in French technique and real-world kitchen experience." + contact email. Strong WHO/WHAT/WHERE clarity.

### PASS — E-E-A-T scaffolding
- About page: H1 "Chef Augustin Lefèvre", H2s "Why Trust These Recipes?", "What to Expect", "About Our Content"; trust checklist (French-trained, professional precision, quality audit, science-backed, "No fake reviews, no bought ratings").
- Recipe schema: BlogPosting `author` → Person with URL /about; `publisher` → Organization "Chef Augustin" (https://www.chefaugustin.com); datePublished 2026-07-30, dateModified 2026-08-03 (fresh); NutritionInformation 580 kcal; 7 HowToSteps with food-safety temps (165°F / 74°C). No fake aggregateRating — correct.

### MEDIUM-3 — Unverifiable credential claims + no persona-transparency disclosure
- Evidence (about page): "French-trained chef, **cookbook author**" and "Every article passes a **7-criteria quality audit** covering food safety, technique accuracy, and clarity."
- Issues: (a) "cookbook author" is not verifiable anywhere on the site (no book title, no publisher) — an LLM evaluating E-E-A-T will find zero corroboration; (b) the pipeline's actual quality gate is 4 binary checks (duplicate slug, USDA food safety, word count, banned words), not 7 criteria — an internally inconsistent claim; (c) the about page reads as a real person ("I trained in the professional kitchens of Lyon… teaching my kids") with no disclosure that Chef Augustin is a brand persona (project rule: persona must stay transparent).
- Recommendation: either remove "cookbook author" or cite the actual book; align the audit claim with the real gate; add one transparent line ("Chef Augustin is the house persona of this blog") — transparency improves long-term trust and de-risks LLM fact-checking.

### LOW-5 — No Wikipedia or Reddit presence; YouTube unverified
- Evidence: no Wikipedia entity for the brand; no Reddit presence found; YouTube channel exists but no video content verified.
- Impact: Wikipedia/Reddit entity presence correlates highly with AI citations; YouTube mentions are the strongest single signal (~0.737).
- Recommendation: next priority after content fixes — publish 2-3 YouTube shorts per month linking recipe pages; consider a Reddit AMA/crosspost in r/cookingforbeginners-class subs (as the persona, disclosed).

---

## 6. AI Overviews Readiness — READY with fixes

- FAQ section + FAQPage schema: READY.
- Concise answer paragraph within first 1000 chars: READY (intro + stat chips).
- Question-based H2/H3s: READY (FAQ H3s on orzo; question-H2s on lava).
- No comparison tables anywhere: recipes don't need them, but category/cluster pages are the natural place for "X vs Y" mini-tables (e.g., "chicken breast vs thigh for one-pan orzo") — opportunity, not a defect.
- Category page weakness (see MEDIUM-4): thin intro (~40 words), duplicate H1/H2, "6 recipe s" typo — weakens category-level AIO queries ("best 30-minute recipes for two").

---

## 7. Passage-level Structure — recipe pages excellent, hub pages need polish

Recipe page (orzo) H2/H3 distribution: H1 → Ingredients → Instructions → "Article and tips" → "Why This One-Pan Wonder Works" → "How to Make… (Step-by-Step)" → "What Most Recipes Get Wrong" → "Chef's Tips & What I've Learned" → "Frequently Asked Questions" (6 H3s) → "More Chicken Dinners for Two" (6 H3s). 10 H2s, 12 H3s — ideal AI-grazeable outline.
Minor: intro paragraph duplicated (hero card + pre-Ingredients); "How to Make…" partially overlaps the recipe-card "Instructions" H2 (schema has 7 HowToSteps; body has both an Instructions list and a step-by-step section — some redundancy, not blocking).

### MEDIUM-4 — Category & cluster hub pages: duplicate H1/H2, typo artifact, thin intros
- Evidence (category /recipes/category/30-minute):
  - H1 "30-Minute Recipes for Two" + H2 "30-minute recipes" (near-duplicate)
  - Intro is only ~40 words: "Dinner in 30 minutes or less, sized for two. These weeknight recipes lean on quick sears…"
  - Visible text contains "**6 recipe s**" (broken template pluralization — "6 recipes")
  - Two duplicate BreadcrumbList JSON-LD blocks; no ItemList schema for the recipe listing
- Evidence (cluster /recipes/cluster/one-pan-dinners-for-two): H1 "One-Pan Dinners for Two" + H2 "One-Pan Dinners for Two recipes" (duplicate); same "6 recipe s" typo; "~ 37 min avg" stat present (good).
- Recommendation: rewrite H2s to be distinct and question-oriented ("What makes a one-pan dinner work for two?"), expand intros to 80-120 words with the answer-first pattern, fix pluralization, add ItemList JSON-LD, dedupe BreadcrumbList. Category pages are 123 of the site's ~160 pages — this is the largest cheap lever for AI visibility outside recipes.

### LOW-6 — Shrimp page title drops the "for Two" keyword
- Evidence: `<title>Garlic Shrimp Orzo & Cherry Tomatoes | Chef Augustin</title>` vs llms.txt name "Garlic Shrimp Orzo with Cherry Tomatoes for Two".
- Recommendation: keep "for Two" in titles (brand's core entity/keyword).

---

## Top 5 highest-impact changes

1. Fix the polluted description fields in DB (11-12 recipes per llms.txt; live-visible on garlic shrimp page) + add a token-repetition quality gate — effort: 1-2h — unblocks clean AI citation (HIGH).
2. Regenerate llms.txt from clean fields + link it in footer/sitemap — effort: 30min (MEDIUM).
3. Category/cluster page pass: distinct question-H2s, 80-120 word intros, fix "6 recipe s", ItemList schema — effort: 2-3h for template + content batch (MEDIUM).
4. Align/soften unverifiable about-page claims ("cookbook author", "7-criteria audit", persona disclosure) — effort: 30min (MEDIUM).
5. Expand 3-4 weakest FAQ answers toward the 134-167 word band — effort: 1h (LOW).

---

## Structured findings (audit-data.json — category "AI Search Readiness")

```json
{
  "category": "AI Search Readiness",
  "score": 79,
  "dimensions": {
    "citability": 20,
    "structural_readability": 16,
    "multi_modal": 10,
    "authority_brand": 14,
    "technical_accessibility": 19
  },
  "findings": [
    {"severity": "HIGH", "id": "GEO-5", "title": "Keyword-stuffing artifact in live recipe intro (garlic shrimp)", "evidence": "That's what's waiting for you in this 25-minute easy easy mexican dinner recipes recipes two.", "recommendation": "Rewrite polluted description fields in DB, regenerate pages + llms.txt, add token-repetition quality gate."},
    {"severity": "MEDIUM", "id": "GEO-1", "title": "llms.txt contains keyword artifacts and metadata mismatches (PT durations, 'servings servings')", "evidence": "25-Minute One-Pan Garlic Herb easy chicken dinners for two for two for two (PT45M, Easy, 2 servings)", "recommendation": "Sanitize source fields; add llms.txt quality gate."},
    {"severity": "MEDIUM", "id": "GEO-2", "title": "llms.txt not linked from site (footer/sitemap)", "evidence": "No llms.txt reference in page HTML", "recommendation": "Add footer link + sitemap entry."},
    {"severity": "MEDIUM", "id": "GEO-3", "title": "Category/cluster pages: duplicate H1/H2, '6 recipe s' typo, ~40-word intros, duplicate BreadcrumbList, no ItemList schema", "evidence": "H1 '30-Minute Recipes for Two' / H2 '30-minute recipes'; '6 recipe s'", "recommendation": "Distinct question-H2s, 80-120 word intros, fix pluralization, add ItemList, dedupe breadcrumbs."},
    {"severity": "MEDIUM", "id": "GEO-4", "title": "Unverifiable E-E-A-T claims: 'cookbook author', '7-criteria quality audit'; no persona transparency", "evidence": "About page trust checklist", "recommendation": "Remove/verify cookbook claim, align audit claim with real 4-check gate, disclose brand persona."},
    {"severity": "LOW", "id": "GEO-6", "title": "robots.txt disallows /api/ while llms.txt links /api/recipes/raw", "evidence": "Disallow: /api/ + llms.txt For LLMs section", "recommendation": "Explicit Allow: /api/recipes/raw."},
    {"severity": "LOW", "id": "GEO-7", "title": "FAQ answers below 134-167 word optimal band (60-100 words)", "evidence": "FAQ section ~489 words / 6 answers", "recommendation": "Expand weakest answers."},
    {"severity": "LOW", "id": "GEO-8", "title": "No RSL (.well-known/resource-links 404); no explicit GPTBot/ClaudeBot rules", "evidence": "404 on .well-known endpoints", "recommendation": "Optional: add RSL + explicit crawler rules."},
    {"severity": "LOW", "id": "GEO-9", "title": "Shrimp page title drops 'for Two'; no Wikipedia/Reddit presence; YouTube empty", "evidence": "title 'Garlic Shrimp Orzo & Cherry Tomatoes'", "recommendation": "Keep 'for Two' in titles; start YouTube shorts + Reddit presence."}
  ],
  "llms_txt": "present_200",
  "llms_full_txt": "404",
  "rsl": "missing",
  "crawlers": {"GPTBot": "allowed_via_wildcard", "ClaudeBot": "allowed_via_wildcard", "OAI-SearchBot": "explicit_allow", "PerplexityBot": "explicit_allow", "Google-Extended": "allowed_via_wildcard", "anthropic-ai": "allowed_via_wildcard", "cohere-ai": "allowed_via_wildcard", "CCBot": "allowed_via_wildcard"},
  "sample_pages": ["/recipes/mediterranean-chicken-orzo-with-feta-olives-for-two", "/recipes/chocolate-lava-cakes-for-two", "/recipes/category/30-minute", "/recipes/cluster/one-pan-dinners-for-two"],
  "schema": {"Recipe": true, "BlogPosting": true, "FAQPage": true, "Organization": true, "Person": true, "NutritionInformation": true, "aggregateRating": false}
}
```
