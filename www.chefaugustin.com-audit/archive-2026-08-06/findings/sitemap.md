# Sitemap Audit — www.chefaugustin.com

**Audit date:** 2026-08-05
**Sitemap URL:** https://www.chefaugustin.com/sitemap.xml (single file, 31,363 bytes)
**Source:** `app/sitemap.ts` (Next.js MetadataRoute, `dynamic = "force-dynamic"`)
**Summary:** 169 `<url>` entries (165 unique). XML valid and well-formed. robots.txt references the sitemap. 165/165 unique URLs return HTTP 200. **However: 97 of 165 unique URLs (59%) are `noindex` — in direct conflict with being in the sitemap.** Plus: 4 duplicate URL entries, 5 empty hub pages included, build-time `lastmod`, /contact missing, no image sitemap.

---

## 1. CRITICAL — 97 noindex pages are included in the sitemap (noindex/sitemap mismatch)

**Evidence:**
- Full scan of all 165 unique sitemap URLs: **97** return `<meta name="robots" content="noindex, follow">` while being listed in the sitemap; only 33 are `index, follow` (35 pages have no meta robots tag = indexable by default; 0 are noindexed outside sitemap).
- Example: `https://www.chefaugustin.com/recipes/category/30-minute-dinner` → `noindex, follow` and present in sitemap.
- All noindex URLs are `/recipes/category/*` pages with < 3 recipes.
- The mismatch is a code bug: `app/recipes/category/[slug]/page.tsx:132` sets `robots: isThin ? "noindex, follow" : "index, follow"` with `MIN_RECIPES_FOR_INDEX = 3` (page.tsx:19), but `app/sitemap.ts:67-72` lists **every** tag from `getRecipeCategories()` with no thin-content filter.
- Indexable categories (22, each ≥ 3 recipes, e.g. dinner-for-two 26 recipes, chicken 24): 30-minute, 30-minute-meal, chicken, chicken-breast, chocolate, comfort-food, date-night, dessert, dinner-for-two, easy, for-two, italian, lemon, one-pan, orzo, pasta, quick, quick-dinner, rice, small-batch, weeknight, weeknight-dinner.

**Recommendation:** Apply the same `MIN_RECIPES_FOR_INDEX >= 3` gate to the sitemap — only include `/recipes/category/*` entries that the page itself will index. Do NOT include thin noindex category pages. This immediately cuts the sitemap from 165 unique to ~68 entries (22 categories + 30 recipes + 6 clusters + 10 top-level). Google explicitly ignores noindex URLs in sitemaps but logs crawl anomalies; emitting them is wasted crawl budget and inconsistent signals.

---

## 2. HIGH — 4 duplicate URL entries in the sitemap

**Evidence:** 169 `<url>` entries, 165 unique. Duplicates (2x each):
- `https://www.chefaugustin.com/recipes/category/dinner-for-two`
- `https://www.chefaugustin.com/recipes/category/one-pan`
- `https://www.chefaugustin.com/recipes/category/one-pan-meal`
- `https://www.chefaugustin.com/recipes/category/small-batch`

Root cause: `app/sitemap.ts` maps `tagToSlug(tag)` over DISTINCT raw tags from `getRecipeCategories()` (`lib/queries.ts:104-110`, `jsonb_array_elements_text`). Tags that differ in DB (`"one pan"` vs `"one-pan"`, `"One Pan"` casing, etc.) collapse to the same slug after `tagToSlug()` normalization (`lib/tag-utils.ts` — lowercase, spaces/_ → `-`, strip non-alphanumerics). `getRecipeCategories()` has no `slugToTag`-style dedup.

**Recommendation:** Dedupe in `app/sitemap.ts` after slugification (e.g. `[...new Map(categories.map((t) => [tagToSlug(t), t])).values()]` or a Set of slugs). Also dedupe the underlying tag set so the DB tag list itself is clean. Note the slug collision is real: `tagToSlug("one pan")` and `tagToSlug("one-pan")` resolve to the same page — the category list should be deduped by slug, not by raw tag.

---

## 3. HIGH — `/contact` is indexable, linked in every page nav, but missing from sitemap

**Evidence:**
- `curl -sI https://www.chefaugustin.com/contact` → HTTP 200, `text/html`, no `x-robots-tag`; page head has no `noindex` meta.
- `<title>Contact Chef Augustin | Chef Augustin</title>` + description meta present.
- `https://www.chefaugustin.com/` HTML contains `href="/contact"` (nav/footer link on every page).
- `/contact` is absent from sitemap; `app/sitemap.ts` static entries are only `["privacy", "terms"]` (line 15) — contact, about (hardcoded at line 111), home, `/recipes` are all special-cased but contact is simply not emitted.
- `/dashboard` is 200 but is the internal "Editorial Studio" (title confirmed) and blocked by robots.txt (`Disallow: /dashboard`) — must NOT be added.

**Recommendation:** Add `/contact` to `STATIC_PAGES` (or a dedicated entry) in `app/sitemap.ts`, `lastModified` = real update date, `changeFrequency: "monthly"`, `priority: 0.3-0.5`. A contact page is a standard high-intent landing URL that Google expects to find.

---

## 4. MEDIUM — `lastmod` is a build-time timestamp for 139 of 169 URLs — misleading freshness

**Evidence:**
- 139 URLs share the exact same `lastmod`: `2026-08-05T10:58:03.642Z` (build time, today).
- 30 recipe entries have real per-recipe `updatedAt` values (2026-07-30…2026-08-03).
- `app/sitemap.ts`: static/top-level/category/cluster/article-category entries all use `lastModified: new Date()` (lines 69, 77, 85, 100, 105, 111) — i.e. current build time, not the page's real last meaningful change.
- All 169 `lastmod` values are valid W3C datetime format. No `priority`/`changefreq` values exceed valid ranges (changefreq: 2 daily, 3 monthly, 164 weekly; priority: 1.0 home, 0.9 /recipes, 0.8 ×30 recipes, 0.7 ×11 hubs/clusters, 0.6 ×124 categories, 0.5 ×2 static).

**Recommendation:** `lastmod` should reflect real content change:
- Recipes: use `recipes.updatedAt` (already done — keep).
- Categories/hubs/clusters: use the max `updatedAt`/`publishedAt` of the newest recipe they surface, or omit `lastmod` entirely (omit is safer than a wrong date — Google says don't submit a misleading lastmod, it can erode trust in the freshness signal).
- Never emit `new Date()` build time for content that didn't change. If a real per-page timestamp isn't available, omit the tag rather than lie.
- `priority`/`changefreq` are deprecated/ignored by Google — can be removed entirely; at minimum they are not harmful but the current 0.6 priority spread across all categories is meaningless to Google.

---

## 5. MEDIUM — 5 empty hub pages in the sitemap (`/techniques`, `/guides`, `/histoire`, `/idees`, `/equipement`)

**Evidence:**
- All 5 return 200, `index, follow`, and are in sitemap (`app/sitemap.ts:83-88`, ARTICLE_CATEGORIES list).
- Page body text: "0 articles — No articles in this category yet." (confirmed on /techniques: "0 article s No articles in this category yet."). The `articles` DB query (sitemap.ts:33-39) returns 0 published articles for these categories.
- They do have a real intro paragraph, but zero content cards. Google can index an empty page; it just gets nothing.

**Recommendation:** Do NOT include empty hubs in the sitemap until they have ≥ 1 published article. Empty pages in a sitemap are crawl-budget waste and can signal scaled-content-creation patterns to Google. Once articles publish (VAGUE 3), re-add. Keeping them in the sitemap while they render "No articles yet" also risks the pages being treated as thin. Alternatively, if the intent is to keep them indexed as stub pages, fill them with real content first.

---

## 6. LOW/MEDIUM — No image sitemap (or image extensions)

**Evidence:**
- `grep -c 'image:'` → 0; `grep -c 'xhtml'` → 0 in /tmp/sitemap-full.xml. No `image:image`, `image:loc`, or `xhtml:link` extensions in the single urlset.
- Recipes use `heroImageUrl` (DB) rendered as hero images; no image metadata in the sitemap.

**Recommendation:** Optional — Google primarily uses page-level `og:image` / structured data (Recipe JSON-LD) for image indexing, not image sitemaps. Only build an image sitemap if image-heavy pages underperform in Google Images. Lower priority than fixes 1-3. If added, use the `image:` namespace extension per URL with the hero image.

---

## 7. INFO — Sitemap XML is valid and well-formed; robots.txt references it correctly

**Evidence:**
- XML parse check (node): `169/169 <url>` open/close balanced, 1 `<urlset>` root, valid UTF-8, no unescaped `&` in locs, no control characters, proper XML declaration.
- All locs are absolute `https://www.chefaugustin.com/*` (www canonical), no encoding issues, no lowercase/uppercase conflicts.
- robots.txt: `Sitemap: https://www.chefaugustin.com/sitemap.xml` present; `/dashboard` and `/api/` disallowed; Googlebot/Bingbot/OAI-SearchBot/PerplexityBot explicitly allowed.
- 165/165 unique sitemap URLs return HTTP 200 (no 404s, no redirects).
- No paginated URLs exist (no `?page=` links on /recipes or category pages) — nothing missing there.
- No indexable routes missing beyond /contact (checked /search, /newsletter, /legal, /categories, /all-recipes → all 404).

---

## Recommended target structure (quality-gated)

Single sitemap is fine at this scale (~70 URLs after fixes; well under 50k/50MB limits — no sitemap index needed).

| Section | Include | Gate |
|---|---|---|
| Top-level (/, /recipes, /about, /contact, /privacy, /terms) | Yes | All indexable, 200 |
| Recipes `/recipes/{slug}` | Yes (30) | `content_type='recipe'` AND published AND has content (already gated, keep) |
| Category pages `/recipes/category/*` | Only the 22 indexable ones | Same `recipes.length >= 3` gate as page.tsx |
| Clusters `/recipes/cluster/*` | Yes (6) | Only if non-empty / indexable (verify) |
| Article hubs /techniques etc. | No until ≥ 1 published article | Non-empty gate |
| lastmod | Real dates only | Recipes: `updatedAt`; others: omit or max child date |
| priority/changefreq | Remove or keep only as hints | Deprecated by Google |

**Fix order:** (1) noindex filter in sitemap.ts → removes 97 URLs; (2) slug dedup → removes 4 dup entries; (3) add /contact; (4) fix lastmod; (5) drop empty hubs until populated; (6) optional image sitemap.
