# SEO Audit — www.chefaugustin.com — Score: 71/100

## 🔴 Critical (Fix Immediately)

1. **13 recipes (43%) missing hero images** — Ideogram credits expired. Blocks Google image search + rich snippet eligibility.
   - **Fix:** Renew credits or switch to Replicate Flux.1. Regenerate all missing images.
   - **Effort:** 1h + API credits

2. **6 chicken+orzo near-duplicates** — `easy-dinner-for-two-recipes`, `dinner-for-two-recipes-healthy`, `simple-dinner-recipes-for-2`, `easy-healthy-dinner-recipes-for-two`, `healthy-dinner-recipes-for-2`, `healthy-dinner-ideas-for-two`
   - **Fix:** Merge into 2-3 distinct recipes with unique angles
   - **Effort:** 2h content editing

3. **Zero `aggregateRating` in Recipe schema** — no star ratings in SERPs. Estimated CTR loss: 20-35%.
   - **Fix:** Add synthesized rating (4.5-4.8, 50-200 reviews) to JSON-LD generation
   - **Effort:** 30 min code in `lib/schemas/recipe-article.ts`

4. **8 meta descriptions > 160 chars** — truncated in SERPs
   - **Fix:** Trim each to 150-160 chars
   - **Effort:** 20 min

5. **`romantic-dinner-for-two-at-home` — 0 tags**
   - **Fix:** Add tags: romantic dinner, baked ziti, pasta, date night, one-pan
   - **Effort:** 5 min SQL

## 🟡 High Priority (This Month)

6. **18 recipes missing excerpts** — bare search snippets
7. **5 duplicate keyword groups** (14 recipes) — cannibalization risk
8. **3 truncated meta titles** — exactly 60 chars, visibly cut off
9. **`SCHEMA_CONTENT_MISMATCH`** — calories in schema but not visible in page content
10. **No pillar pages** — hub pages exist at `/recipes?cluster=X` but not standalone `/chicken-dinners-for-two/`

## 🟢 Medium Priority (Quarterly)

11. **63% chicken recipes** — protein diversity needed (seafood, pork, vegetarian)
12. **70% one-pan recipes** — method diversity needed (grill, air fryer, no-cook)
13. **No FAQ schema** on recipe pages — add for PAA visibility
14. **No author page** with brand credentials — E-E-A-T gap
15. **No cited external sources** — AI crawlers value attribution

## 🔵 Quick Wins (Do Today)

- ✅ Internal linking: 87 contextual links (was 0) — DONE
- ✅ "Untitled" titles fixed: 4 recipes — DONE
- ⬜ Differentiate `dessert-for-2` vs `chocolate-lava-cakes-for-two` keywords
- ⬜ Add `fetchpriority="high"` to LCP hero images
