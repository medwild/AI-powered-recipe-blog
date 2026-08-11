# Schema / Structured Data Audit — www.chefaugustin.com

Date: 2026-08-05 — Auditor: Schema specialist (JSON-LD extraction via claude-seo render_page.py, mode auto)

## Detection summary (sampled 8 pages + homepage)

| Page | JSON-LD blocks | Types present |
|---|---|---|
| / (homepage) | 1 (709 B, valid) | Organization, WebSite, SearchAction, EntryPoint |
| /recipes/easy-chicken-rice-bowls-for-two | 2 (valid) | BreadcrumbList; Recipe + BlogPosting + FAQPage (@graph, w/ Person, Organization, Question, Answer, HowToStep) |
| /recipes/chicken-pot-pie-for-2 | 2 (valid) | BreadcrumbList; Recipe + BlogPosting + FAQPage (@graph) |
| /recipes/chocolate-lava-cakes-for-two | 2 (valid) | BreadcrumbList; Recipe + BlogPosting + FAQPage (@graph) |
| /recipes/category/30-minute | 2 (valid) | BreadcrumbList ×2 (duplicate, differing label) |
| /recipes/category/comfort-food | 2 (valid) | BreadcrumbList ×2 (duplicate) |
| /recipes/cluster/one-pan-dinners-for-two | 2 (valid) | BreadcrumbList ×2 (duplicate, identical) |
| /recipes (listing) | 1 (valid) | BreadcrumbList |
| /about | 1 (valid) | Organization, Person |

Validation: all 9 pages return only valid, well-formed JSON-LD (`valid: true` on every block, `@context` = `https://schema.org`, absolute URLs, ISO 8601 dates). No deprecated types (no HowTo, SpecialAnnouncement, CourseInfo, EstimatedSalary, LearningVideo). No Microdata/RDFa detected.

---

## Findings

### [HIGH] Duplicate BreadcrumbList JSON-LD blocks on category and cluster pages
- **Evidence:** `/recipes/category/30-minute` emits **two** BreadcrumbList blocks (380 B + 380 B) whose position-3 labels disagree: block 1 says `"30-Minute"`, block 2 says `"30-minute"` (pretty title vs slug-derived label). `/recipes/category/comfort-food` emits two 386 B blocks; `/recipes/cluster/one-pan-dinners-for-two` emits two 407 B identical blocks. Recipe pages emit only one BreadcrumbList each (4 levels: Home > Recipes > cluster > self).
- **Recommendation:** Emit a single BreadcrumbList per page. Derive the ListItem `name` from one canonical source (page title, not the URL slug) so labels cannot diverge. Two identical schema nodes of the same type on one page trigger "duplicate structured data" diagnostics and are unnecessary bytes on 129 of 169 URLs.

### [MEDIUM] Recipe schema missing `nutrition` (NutritionInformation)
- **Evidence:** All 3 sampled Recipe nodes (easy-chicken-rice-bowls, chicken-pot-pie-for-2, chocolate-lava-cakes-for-two) have `name, image, author, prepTime, cookTime, totalTime, description, recipeYield, recipeCategory, recipeIngredient (10–14 items), recipeInstructions (6–8 HowToStep), datePublished, keywords` — but **no `nutrition`** on any. Google's recipe rich-results docs list nutrition as a recommended property (calories per serving).
- **Recommendation:** Add `"nutrition": {"@type": "NutritionInformation", "calories": "..."}` (plus servingSize/protein/carbs/fat if computed). Values must be factual — compute from the recipe's ingredient list, don't hand-wave. This is the single highest-value missing recommended field.

### [MEDIUM] Recipe schema missing `recipeCuisine`
- **Evidence:** No Recipe node on the 3 sampled pages includes `recipeCuisine`, although the site is positioned as French technique (per description: "grounded in French cooking technique").
- **Recommendation:** Add `recipeCuisine` (e.g. `"French"`, `"American"`) to each Recipe node. Recommended by Google for recipe rich results; trivial to add in `lib/schemas/recipe-article.ts`.

### [MEDIUM] No `aggregateRating` / `review` anywhere — and it must stay that way until real user data exists
- **Evidence:** Zero `aggregateRating` or `review` properties across all 9 sampled pages (Recipe, BlogPosting, Organization). This is currently **correct** — Google requires ratings to reflect genuine user review data; hardcoding stars risks a manual action.
- **Recommendation:** Do **not** add aggregateRating without a real review collection flow (comment/rating widget writing to the DB). If/when reviews exist, add `aggregateRating` (ratingValue, reviewCount) + `review` (author, datePublished, reviewBody) with counts matching actual data. No action needed now.

### [LOW] Author `Person` identity inconsistent across pages
- **Evidence:** Recipe easy-chicken-rice-bowls and chocolate-lava-cakes: `"Chef Augustin Lefèvre"` (accented); chicken-pot-pie-for-2: `"Chef Augustin Lefevre"` (unaccented). Homepage Organization description: "Chef Augustin Lefevre". `/about` Person: "Chef Augustin Lefèvre". No `@id`/`url` on any Person node (except BlogPosting author which carries `url: /about`).
- **Recommendation:** Use one canonical spelling ("Chef Augustin Lefèvre") in every block and give the Person node `"@id": "https://www.chefaugustin.com/about#person"` so crawlers merge the entity instead of splitting it.

### [LOW] Recipe node missing `dateModified`
- **Evidence:** Recipe nodes carry `datePublished` only (e.g. `2026-07-27T10:44:31.526Z`); the sibling BlogPosting carries `dateModified: 2026-07-30T17:59:56.564Z` (recipes are being updated — e.g. food-safety edits).
- **Recommendation:** Mirror `dateModified` onto the Recipe node whenever the post is updated (same timestamp as BlogPosting). Google uses fresh dates for re-crawl priority.

### [LOW] Organization markup on /about is incomplete vs homepage
- **Evidence:** `/about` Organization has only `name, url, description, founder: Person{name, jobTitle}` — no `logo`, no `sameAs`. Homepage Organization (valid) has `logo: https://www.chefaugustin.com/hero-kitchen.png` and `sameAs: [instagram.com/chefaugustin, pinterest.com/chefaugustin, youtube.com/@chefaugustin]`.
- **Recommendation:** Reuse the full homepage Organization node (logo + sameAs) on /about, and give the founder Person a `url: https://www.chefaugustin.com/about`.

### [INFO] FAQPage present on all recipe pages — no SERP benefit anymore
- **Evidence:** Each recipe page's @graph includes an FAQPage with 5 Question/acceptedAnswer pairs (real user-intent Q&A, e.g. "Do I have to use frozen vegetables?").
- **Recommendation:** Keep or remove — Google retired FAQPage rich results for all sites (May 2026), so this markup yields no Google SERP feature; any AI/GEO citation benefit is unconfirmed. Harmless, but it is ~2 KB of redundant bytes per recipe page if the goal is lean HTML. If removed, the content itself stays on-page (it's also rendered as visible Q&A). Do not add new FAQPage blocks expecting rich results.

### [INFO] Breadcrumb + WebSite/SearchAction baseline is solid (PASS items)
- **Evidence:**
  - Recipe pages: complete required Recipe fields — `name`, `image` (absolute Cloudinary URL), `recipeIngredient` (string list, 10–14 items), `recipeInstructions` in **HowToStep** format with `position`/`name`/`text`, `prepTime`/`cookTime`/`totalTime` in ISO 8601 duration, `recipeYield: "2 servings"`, `author: Person`, `datePublished` ISO 8601, `@id: "#recipe"` correctly referenced by BlogPosting `mainEntity`.
  - BlogPosting nodes carry headline, author (with /about url), publisher Organization "Chef Augustin", datePublished + dateModified.
  - Homepage: WebSite + SearchAction with proper EntryPoint `urlTemplate: /recipes?q={search_term_string}` and `query-input: "required name=search_term_string"` — sitelinks searchbox eligible.
  - Organization logo + 3 sameAs social links (Instagram, Pinterest, YouTube) present on homepage.
  - BreadcrumbList present on every sampled page (recipe, category, cluster, /recipes).
- **Recommendation:** No action.

### [INFO] Missing opportunities (optional, do not fabricate)
- **VideoObject:** no recipe has video markup. Only add if real cooking videos are published (none detected on sampled pages) — otherwise skip.
- **Image size:** recipe `image` is a single Cloudinary URL; Google recommends ≥ 720 px wide for recipe images. Not verifiable from markup — confirm the uploaded originals meet this.
- **Category pages:** beyond the duplicate-fix, category pages are complete with just breadcrumbs; no CollectionPage/ItemList markup is required — do not add without a concrete goal.

## Implementation pointers
- Single source of breadcrumbs + recipe schema: `lib/schemas/recipe-article.ts`, `components/article/article-jsonld.tsx`, `components/breadcrumbs.tsx`, page templates `app/recipes/[slug]/page.tsx`, `app/recipes/category/[slug]/page.tsx`, `app/recipes/cluster/[slug]/page.tsx` (duplicate breadcrumbs likely come from both a component and a page-level emit — fix at emission point).
- After any change: `npx tsc --noEmit` and re-run render_page.py `--json-ld-output` on one category + one recipe page to confirm single BreadcrumbList and nutrition/cuisine present.
