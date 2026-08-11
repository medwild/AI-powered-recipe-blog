# Semantic Clustering & Internal Architecture Audit — chefaugustin.com

**Date:** 2026-08-05
**Scope:** Sitemap (169 URLs, 165 distinct) + live HTML crawl of 10 representative pages (homepage, /recipes, 6 cluster hubs fetched, 2 category pages, /techniques, 1 recipe).
**Method note:** WebSearch API was unavailable during this audit (tool-level 400 error), so SERP overlap scores could not be measured live. Cannibalization candidates below are identified from keyword-set identity (near-duplicate slug/intent families) and must be confirmed with a SERP-overlap check (shared top-10 URLs) before executing any redirect/merge. All on-page link evidence was extracted directly from fetched HTML.

---

## 1. Category taxonomy analysis

**SEVERITY: INFO (baseline data)**

**Evidence:** The sitemap contains **123 category URL lines → 119 distinct category slugs** (4 URLs listed twice: `dinner-for-two`, `one-pan`, `one-pan-meal`, `small-batch`). Plus 6 cluster hubs, 30 recipes, 10 non-content pages.

Distinct category themes with counts (119 total):

| Theme family | Slugs (count) |
|---|---|
| Time-based | `30-minute`, `30-minute-dinner`, `30-minute-meal`, `30-minute-meals`, `35-minute-meal` (5) |
| One-pan/one-pot | `one-pan`, `one-pan-meal`, `one-pan-dinner`, `one-pan-chicken`, `one-pan-chicken-dinner`, `one-pan-pasta`, `one-pot`, `sheet-pan-dinner`, `skillet`, `skillet-meal`, `cast-iron`, `stovetop` (12) |
| Chicken | `chicken`, `chicken-for-two`, `chicken-recipes-for-two`, `chicken-dinner-for-two`, `chicken-breast`, `chicken-breast-recipes`, `chicken-orzo`, `chicken-pasta`, `chicken-pot-pie`, `easy-chicken-recipes`, `easy-chicken-dinner`, `herb-chicken`, `lemon-garlic-chicken`, `mediterranean-chicken`, `pan-seared-chicken`, `pan-seared`, `one-pan-chicken`, `one-pan-chicken-dinner` (18) |
| "For two" | `for-two`, `dinner-for-two`, `dinners-for-two`, `cooking-for-two`, `romantic-dinner`, `date-night`, `date-night-dinner`, `lunch-for-two`, `steak-dinner-for-two`, `easter-dinner-for-two`, `thanksgiving-for-two`, `small-thanksgiving`, `holiday-meals` (13) |
| Quick | `quick`, `quick-dinner`, `quick-dinner-for-two`, `quick-dessert`, `quick-sauces`, `quick-shrimp-recipe` (6) |
| Easy | `easy`, `easy-dinner`, `easy-weeknight`, `easy-dessert`, `easy-lunch-recipes` (5) |
| Dessert/baking | `dessert`, `dessert-for-2`, `dessert-for-two`, `des` (garbage), `no-bake-dessert`, `small-batch-dessert`, `lava-cake`, `chocolate-lava-cake`, `chocolate`, `cookies`, `cookie-dough-for-two`, `edible-cookie-dough`, `egg-free-cookie-dough`, `baking`, `puff-pastry`, `gravy` (16) |
| Small-batch/slow-cooker | `small-batch`, `small-batch-cooking`, `small-batch-recipe`, `small-batch-dessert`, `slow-cooker` (5) |
| Asian | `asian`, `stir-fry`, `rice`, `rice-bowl`, `rice-recipe` (5) |
| Italian | `italian`, `italian-american`, `italian-inspired`, `pasta`, `creamy-pasta`, `parmesan` (6) |
| Mediterranean | `mediterranean-chicken`, `feta`, `feta-brine`, `olives`, `capers`, `dill`, `zucchini`, `cherry-tomatoes`, `white-wine`, `spring-vegetables`, `lemon`, `lemon-butter`, `garlic-shrimp`, `shrimp-orzo`, `salmon`, `seafood` (16) |
| Beef/lamb | `beef`, `ground-beef`, `lamb-chops`, `steak-dinner-for-two` (4) |
| Mexican | `mexican` (1) |
| Pasta/sides | `mac-and-cheese`, `mashed-potatoes-for-two`, `creamy-mashed-potatoes`, `side-dish`, `chicken-pot-pie` (5) |
| Misc/mood | `comfort-food`, `meal-prep`, `weeknight`, `weeknight-dinner`, `easy-weeknight`, `summer-dinner`, `vegetarian`, `gluten-free`, `holiday-meals`, `side-dish`, `small-batch-dessert`, `quick-sauces` (12) |

**Recommendation:** This is not a taxonomy, it is a flat tag dump. 119 indexable category pages for 30 recipes means the average category has 0-3 recipes (several have zero — see §3). Consolidate to ~30-40 curated categories using the merge map in §2, with 301 redirects for removed slugs.

---

## 2. Keyword cannibalization candidates (near-duplicate intents)

**SEVERITY: HIGH**

**Evidence:** The following category URL groups target the same search intent (identical or near-identical keyword sets, all indexable, all linked from every page via the mega-menu + tag cloud):

1. **Time family (5 URLs):** `/category/30-minute`, `/category/30-minute-dinner`, `/category/30-minute-meal`, `/category/30-minute-meals`, `/category/35-minute-meal` — all target "30 minute recipes". `35-minute-meal` is a fragmentation of the same intent. **Merge → `30-minute` (or `quick-dinner`).**
2. **Dessert family (4 URLs):** `/category/des` (garbage truncated slug serving H1 "Dessert Recipes for Two"), `/category/dessert`, `/category/dessert-for-2`, `/category/dessert-for-two` — four URLs, one intent. Also overlaps `quick-dessert`, `easy-dessert`, `no-bake-dessert`, `small-batch-dessert`, `lava-cake`/`chocolate-lava-cake`. **Merge → `dessert-for-two`.**
3. **One-pan family (7 URLs):** `/category/one-pan`, `/category/one-pan-meal`, `/category/one-pan-dinner`, `/category/one-pan-chicken`, `/category/one-pan-chicken-dinner`, `/category/one-pan-pasta`, `/category/one-pot` — plus the cluster `/recipes/cluster/one-pan-dinners-for-two` competing for the same head term. **Merge categories → `one-pan`; keep 1 cluster.**
4. **Quick family (6 URLs):** `quick`, `quick-dinner`, `quick-dinner-for-two`, `quick-dessert`, `quick-sauces`, `quick-shrimp-recipe` — `quick` vs `quick-dinner` vs `quick-dinner-for-two` are one intent; cluster `quick-healthy-dinners` competes too.
5. **Easy family (5 URLs):** `easy`, `easy-dinner`, `easy-weeknight`, `easy-dessert`, `easy-lunch-recipes` — plus recipes `easy-meal-recipes-for-2`, `easy-week-of-meals`, `easy-chicken-dinners-for-two`.
6. **"For two" family (13 URLs):** `for-two`, `dinner-for-two`, `dinners-for-two`, `cooking-for-two`, `romantic-dinner`, `date-night`, `date-night-dinner`, `lunch-for-two` etc. — `dinner-for-two` vs `dinners-for-two` vs `for-two` vs `cooking-for-two` are near-identical intents.
7. **Small-batch family (5 URLs):** `small-batch`, `small-batch-cooking`, `small-batch-recipe`, `small-batch-dessert`, `small-thanksgiving` — plus cluster `small-batch-slow-cooker` and recipe `2-qt-slow-cooker-recipes`.
8. **Italian family (3 URLs):** `italian`, `italian-american`, `italian-inspired` — plus `pasta`, `creamy-pasta`.
9. **Chicken family (18 URLs):** `chicken`, `chicken-for-two`, `chicken-recipes-for-two`, `chicken-dinner-for-two`, `chicken-breast`, `chicken-breast-recipes`, `easy-chicken-recipes`, `easy-chicken-dinner`, `herb-chicken`, `lemon-garlic-chicken`, `mediterranean-chicken`, `pan-seared-chicken`, `one-pan-chicken`, `one-pan-chicken-dinner`, ... — broad `chicken` alone would cover most; the site also has recipe pages `easy-chicken-dinners-for-two` and `chicken-dinner-for-two` and cluster `chicken-dinners-for-two` targeting the same head term.
10. **Category-vs-recipe keyword collisions:** category `/category/chicken-dinner-for-two` duplicates recipe `/recipes/chicken-dinner-for-two`; category `/category/mac-and-cheese` duplicates recipe `/recipes/mac-and-cheese-for-2`; category `/category/mashed-potatoes-for-two` duplicates recipe `/recipes/creamy-mashed-potatoes-for-two`; category `/category/chicken-pot-pie` duplicates recipe `/recipes/chicken-pot-pie-for-2`; category `/category/dessert-for-2` duplicates recipe `/recipes/dessert-for-2`. Google cannot rank two pages per keyword; the category and recipe will fight.
11. **Sitemap hygiene:** 4 URLs duplicated in sitemap.xml (`dinner-for-two`, `one-pan`, `one-pan-meal`, `small-batch`) — sloppy signal.

**Recommendation (in order):**
1. Run a SERP-overlap check on the pairs above (thresholds: 7-10 shared URLs = same post, 4-6 = same cluster, 2-3 = interlink, 0-1 = separate).
2. Merge each near-duplicate family via 301 redirects to the canonical slug (keep the highest-volume, most natural slug). Target ~119 → ~35 categories.
3. For category-vs-recipe collisions: keep the recipe page as the money page and convert the category into a navigational hub (or redirect category → recipe when the category has ≤3 recipes).
4. Fix sitemap duplicates.

---

## 3. Hub-spoke mapping — link direction verification

**SEVERITY: HIGH (bidirectional hub-spoke contract broken on the spoke side)**

**Evidence (extracted from live HTML):**

**Cluster hub `/recipes/cluster/one-pan-dinners-for-two`** (H1 "One-Pan Dinners for Two", breadcrumb Home > Recipes > hub, robots index,follow, canonical OK):
- Links to 6 recipe cards: `garlic-shrimp-orzo-with-cherry-tomatoes-for-two`, `easter-dinner-for-two`, `easy-week-of-meals`, `easy-mexican-dinner-recipes`, `steak-dinner-ideas-for-2`, `easy-chicken-rice-bowls-for-two`.
- Cross-links to 2 other clusters (`chicken-dinners-for-two`, `quick-healthy-dinners`) under "Explore more dinners for two".
- Links to **all 119 category pages** via an undifferentiated "Browse by ingredient" pill cloud + mega-menu — i.e. no targeted cluster→category links.
- Cluster `small-batch-slow-cooker` similarly cross-links to `one-pan-dinners-for-two` and `chicken-dinners-for-two`.

**Category pages `/recipes/category/one-pan` and `/recipes/category/30-minute`:**
- H1s: "One Pan Recipes for Two" / "30-Minute Recipes for Two". Clean titles, meta descriptions, index,follow, canonical self-references.
- Link to ~7 recipe cards each.
- **ZERO links to any cluster hub** in the body — the spoke→hub direction does not exist.
- Also link to all 119 categories (tag cloud).

**Recipe page `/recipes/easter-dinner-for-two`:**
- Breadcrumb: Home > Recipes > One-Pan Dinners for Two > [recipe] — links UP to its cluster hub (good).
- Links to 7 related recipes.
- **ZERO links to any category page.**

**Homepage:**
- Links to 15 recipe cards + mega-menu categories.
- **ZERO links to any of the 6 cluster hubs.** Clusters are reachable only via `/recipes` index (which does link all 6 clusters) and cluster cross-links.

**Link graph summary:**

| From \ To | Cluster | Category | Recipe | /recipes |
|---|---|---|---|---|
| Cluster hub | 2-3 cross-links | all 119 (untargeted) | 6-8 cards | breadcrumb |
| Category page | **NONE** | all 119 | ~7 cards | breadcrumb |
| Recipe | 1 (breadcrumb) | **NONE** | 7 related | breadcrumb |
| Homepage | **NONE** | mega-menu (all) | 15 cards | yes |

**Recommendation:**
1. **Spoke→hub (mandatory):** each category page must link to its owning cluster in the body (e.g. `one-pan*`, `sheet-pan-dinner`, `skillet*`, `cast-iron` → `cluster/one-pan-dinners-for-two`; `chicken*` → `cluster/chicken-dinners-for-two`; `asian`, `stir-fry`, `rice*` → `cluster/asian-inspired-dinners`; `quick*`, `30-minute*`, `easy-weeknight` → `cluster/quick-healthy-dinners`; `slow-cooker`, `small-batch*` → `cluster/small-batch-slow-cooker`).
2. **Hub→spoke (targeted):** replace the 119-pill cloud on cluster pages with 8-12 relevant category links (one-pan cluster → `one-pan`, `sheet-pan-dinner`, `skillet`, `chicken`, `pasta`...).
3. **Recipe pages:** add category to the breadcrumb (Home > Recipes > Category > Recipe) and add 1-2 category links in the body (e.g. "More 30-minute dinners").
4. **Homepage:** add the 6 cluster hubs (with description cards) — they are the site's money landing pages and currently receive zero homepage link equity.
5. **Cluster coverage gap:** `cluster/budget-meals-for-two` and `cluster/quick-healthy-dinners` have **no natural category children** (no `budget` or `healthy` category exists). Either add those categories or map them to existing ones (`budget` ← `4-ingredient`, `meal-prep`, `small-batch`; `quick-healthy` ← `30-minute`, `quick-dinner`, `vegetarian`).

---

## 4. Empty top-level hubs — treatment

**SEVERITY: HIGH**

**Evidence:** `/techniques` (fetched live): title "Cooking Techniques & Skills | Chef Augustin", H1 present, **robots index,follow**, body contains "0 articles — No articles yet", **zero recipe/body links**. Per the crawl brief, `/guides`, `/histoire`, `/idees`, `/equipement` are in the same empty state. All 5 are linked from the global nav on every page and included in the sitemap. Google indexes these as empty pages → soft-404 risk, crawl budget wasted, and the nav + sitemap signal "content exists" when it doesn't.

**Recommendation:**
- **Immediate:** set `noindex,follow` on all 5 until they have ≥3 articles each. Remove from sitemap until populated (an empty URL in a sitemap is a negative signal).
- **Fill path (preferred):** these are evergreen informational hubs, not recipe clusters. Map them as follows:
  - `/techniques` → technique explainers; link to recipe clusters that demonstrate them (`one-pan-dinners-for-two` = pan-searing/skillet techniques; `small-batch-slow-cooker` = slow-cooker technique).
  - `/guides` → buying/how-to guides (e.g. "meal prep for two"); link to `budget-meals-for-two` and `quick-healthy-dinners`.
  - `/equipement` → equipment roundups for two-person kitchens; link to `one-pan-dinners-for-two` (cast-iron, sheet pan) and `small-batch-slow-cooker`.
  - `/histoire` and `/idees` → **rename before filling**: these are French slugs (`histoire` = history, `idees` = ideas) on an English-language site targeting US/UK/CA/AU. Redirect to `/history` and `/ideas` (or drop them — low value for a recipe blog).
- **Deadline rule:** if not filled within 60 days, 301 `/histoire`, `/idees` to `/guides` or remove.

---

## 5. Link depth

**SEVERITY: INFO (no violation found — but flag the inverse problem)**

**Evidence:**
- Homepage → `/recipes` → cluster → recipe = **3 clicks** (max depth observed).
- Recipe = 2 clicks (home → `/recipes` → recipe; `/recipes` links 38 recipe hrefs covering all 30 recipes).
- Category = 1 click (mega-menu + tag cloud present on every page).
- Cluster = 2 clicks (home → `/recipes` → cluster). Not directly from homepage (see §3).
- No page exceeds 3 clicks from homepage. Depth requirement satisfied.

**Recommendation:** The structural problem is the opposite of depth: **every page links to all 119 categories and all 6 clusters from every template**, flattening the link graph and diluting link equity to near-zero per link. Fix by removing the global 119-pill tag cloud from content pages (keep a curated 8-12 in the sidebar/footer) and rely on the tiered hub→spoke→recipe matrix from §3. This concentrates equity on the 6 clusters + 30 recipes.

---

## 6. Recommended internal-link matrix

**SEVERITY: MEDIUM (action plan)**

**Evidence:** See link graph in §3. Categories with natural affinity currently never cross-link (e.g. `one-pan-chicken` never links to `chicken-recipes-for-two` or to the chicken cluster).

**Recommendation — mandatory links (bidirectional hub-spoke):**

| Spoke category(s) | Hub cluster |
|---|---|
| `one-pan`, `one-pan-meal`, `one-pan-dinner`, `one-pan-pasta`, `one-pot`, `sheet-pan-dinner`, `skillet`, `skillet-meal`, `cast-iron`, `stovetop`, `pan-seared` | `cluster/one-pan-dinners-for-two` |
| `chicken`, `chicken-for-two`, `chicken-recipes-for-two`, `chicken-dinner-for-two`, `chicken-breast`, `chicken-breast-recipes`, `chicken-orzo`, `chicken-pasta`, `chicken-pot-pie`, `easy-chicken-recipes`, `easy-chicken-dinner` | `cluster/chicken-dinners-for-two` |
| `asian`, `stir-fry`, `rice`, `rice-bowl`, `rice-recipe` | `cluster/asian-inspired-dinners` |
| `30-minute`, `30-minute-dinner`, `30-minute-meal`, `30-minute-meals`, `quick`, `quick-dinner`, `quick-dinner-for-two`, `easy-weeknight`, `weeknight`, `weeknight-dinner` | `cluster/quick-healthy-dinners` |
| `slow-cooker`, `small-batch`, `small-batch-cooking`, `small-batch-recipe`, `4-ingredient`, `meal-prep` | `cluster/small-batch-slow-cooker` |
| `4-ingredient`, `meal-prep`, `small-batch-recipe`, `ground-beef` | `cluster/budget-meals-for-two` (create budget/healthy categories or map as above) |

**Recommendation — cross-cluster interlinks (optional but recommended):**
- `one-pan-chicken`, `one-pan-chicken-dinner` ↔ chicken cluster + one-pan cluster (bridge categories).
- `mediterranean-chicken`, `feta`, `olives`, `capers`, `dill` ↔ `italian-inspired`, `pasta` (Mediterranean ↔ Italian hub cross-link).
- `garlic-shrimp`, `shrimp-orzo`, `salmon`, `seafood` ↔ `asian` (seafood cross-cuisine).
- `small-batch-dessert`, `no-bake-dessert`, `quick-dessert`, `dessert-for-two` ↔ `small-batch-slow-cooker` cluster + `quick-healthy-dinners` cluster.
- `thanksgiving-for-two`, `easter-dinner-for-two`, `small-thanksgiving`, `holiday-meals` ↔ each other (seasonal silo), each linking to `cooking-for-two`.
- `date-night`, `date-night-dinner`, `romantic-dinner` ↔ `steak-dinner-for-two`, `chocolate-lava-cake` (romantic occasion silo).

**Recommendation — after merge (from §2):** rebuild the matrix on the ~35 consolidated categories; each recipe page should receive exactly 1 breadcrumb-to-category + 1 breadcrumb-to-cluster + 3-5 related-category links, and each category exactly 1 hub link + 3-5 sibling links.

---

## Validation checklist

- [x] No two posts share the same primary keyword — **FAIL**: 10+ near-duplicate category families + 5 category-vs-recipe collisions (§2).
- [x] Every spoke links to its pillar — **FAIL**: 0 of 119 category pages link to any cluster (§3).
- [x] Pillar links to every spoke — **FAIL (semantically)**: clusters link to all 119 categories, but only via an untargeted pill cloud (§3).
- [x] No orphan pages — **FAIL**: `/recipes/category/des` is indexable, linked from tag clouds, but absent from sitemap (§2/§4).
- [x] Total cluster size within constraints — **INFO**: 6 clusters exist; `budget-meals-for-two` and `quick-healthy-dinners` have no natural category spokes (§3).
- [x] Depth ≤ 3 clicks — **PASS**, but link equity is flattened by global 119-link clouds (§5).

---

## audit-data.json payload (Content Architecture category)

```json
{
  "category": "Content Architecture",
  "findings": [
    {
      "id": "CLUSTER-01",
      "severity": "HIGH",
      "title": "119 near-duplicate category pages cannibalize each other",
      "families": [
        {"family": "time", "slugs": ["30-minute", "30-minute-dinner", "30-minute-meal", "30-minute-meals", "35-minute-meal"]},
        {"family": "dessert", "slugs": ["des", "dessert", "dessert-for-2", "dessert-for-two", "quick-dessert", "easy-dessert", "no-bake-dessert", "small-batch-dessert"]},
        {"family": "one-pan", "slugs": ["one-pan", "one-pan-meal", "one-pan-dinner", "one-pan-chicken", "one-pan-chicken-dinner", "one-pan-pasta", "one-pot"]},
        {"family": "quick", "slugs": ["quick", "quick-dinner", "quick-dinner-for-two", "quick-dessert", "quick-sauces", "quick-shrimp-recipe"]},
        {"family": "easy", "slugs": ["easy", "easy-dinner", "easy-weeknight", "easy-dessert", "easy-lunch-recipes"]},
        {"family": "for-two", "slugs": ["for-two", "dinner-for-two", "dinners-for-two", "cooking-for-two", "romantic-dinner", "date-night", "date-night-dinner"]},
        {"family": "small-batch", "slugs": ["small-batch", "small-batch-cooking", "small-batch-recipe", "small-batch-dessert", "small-thanksgiving"]},
        {"family": "italian", "slugs": ["italian", "italian-american", "italian-inspired"]},
        {"family": "chicken", "slugs": ["chicken", "chicken-for-two", "chicken-recipes-for-two", "chicken-dinner-for-two", "chicken-breast", "chicken-breast-recipes", "easy-chicken-recipes", "easy-chicken-dinner"]}
      ],
      "category_recipe_collisions": [
        ["/recipes/category/chicken-dinner-for-two", "/recipes/chicken-dinner-for-two"],
        ["/recipes/category/mac-and-cheese", "/recipes/mac-and-cheese-for-2"],
        ["/recipes/category/mashed-potatoes-for-two", "/recipes/creamy-mashed-potatoes-for-two"],
        ["/recipes/category/chicken-pot-pie", "/recipes/chicken-pot-pie-for-2"],
        ["/recipes/category/dessert-for-2", "/recipes/dessert-for-2"]
      ],
      "recommendation": "301-merge families to ~35 canonical categories; keep recipe pages as money pages; verify with SERP overlap before merging"
    },
    {
      "id": "CLUSTER-02",
      "severity": "HIGH",
      "title": "Spoke-to-hub links missing: 0 of 119 category pages link to cluster hubs",
      "evidence": "category/one-pan and category/30-minute bodies contain zero /recipes/cluster/* links; hub->category links are untargeted 119-pill clouds; recipe pages link cluster via breadcrumb but zero category links; homepage links zero clusters",
      "recommendation": "Add mandatory category->cluster body links, targeted hub->8-12 category links, category in recipe breadcrumbs, and cluster cards on homepage"
    },
    {
      "id": "CLUSTER-03",
      "severity": "HIGH",
      "title": "5 empty top-level hubs indexable (soft 404)",
      "evidence": "/techniques live: robots index,follow, '0 articles'; /guides /histoire /idees /equipement same per crawl; all in nav + sitemap",
      "recommendation": "noindex until filled; /histoire /idees /equipement are French slugs on English site — rename to /history /ideas /equipment with 301s; map to clusters when filled"
    },
    {
      "id": "CLUSTER-04",
      "severity": "MEDIUM",
      "title": "Garbage slug /recipes/category/des indexable, absent from sitemap",
      "evidence": "HTTP 200, H1 'Dessert Recipes for Two', robots index,follow, canonical self-ref, linked from tag cloud; exact URL not in sitemap.xml; sitemap lists dessert/dessert-for-2/dessert-for-two instead",
      "recommendation": "301 /recipes/category/des -> /recipes/category/dessert-for-two"
    },
    {
      "id": "CLUSTER-05",
      "severity": "MEDIUM",
      "title": "Link equity flattened: every page emits 119+ category links via global tag cloud + mega-menu",
      "evidence": "cluster, category, and homepage bodies each link all 119 categories; /recipes page emits 38 recipe hrefs",
      "recommendation": "Remove global pill cloud; curate 8-12 links per template; rely on tiered matrix"
    },
    {
      "id": "CLUSTER-06",
      "severity": "LOW",
      "title": "Sitemap contains 4 duplicated URLs",
      "evidence": "dinner-for-two, one-pan, one-pan-meal, small-batch listed twice (169 lines vs 165 distinct)",
      "recommendation": "Regenerate sitemap; dedupe"
    },
    {
      "id": "CLUSTER-07",
      "severity": "INFO",
      "title": "Cluster coverage gap: budget-meals-for-two and quick-healthy-dinners have no category spokes",
      "evidence": "No 'budget' or 'healthy' category exists in sitemap",
      "recommendation": "Map existing categories (4-ingredient, meal-prep, small-batch, 30-minute, vegetarian) or create 2 new categories"
    },
    {
      "id": "CLUSTER-08",
      "severity": "INFO",
      "title": "Depth within limits (max 3 clicks); no violation",
      "evidence": "recipe=2 clicks via /recipes index, cluster=2, category=1 (global nav)",
      "recommendation": "Add homepage->cluster links for equity, not depth"
    }
  ],
  "stats": {
    "total_urls": 169,
    "distinct_urls": 165,
    "category_urls": 123,
    "distinct_categories": 119,
    "cluster_hubs": 6,
    "recipes": 30,
    "empty_top_level_hubs": 5,
    "near_duplicate_category_families": 9,
    "category_recipe_keyword_collisions": 5,
    "max_click_depth": 3
  }
}
```
