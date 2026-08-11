# Main-session verified evidence (2026-08-05 crawl)

All checks run directly by the main audit session against live https://www.chefaugustin.com.

## Crawl stats
- 169 sitemap URLs: all 200 OK, 0 canonical mismatches, 0 missing meta descriptions, 0 missing titles (all 25-60 chars), 0 missing H1
- Breakdown: 123 category (/recipes/category/*), 30 recipes, 6 clusters, 10 top-level
- 98 pages noindex (all thin categories <3 recipes); 71 indexable (1 root + 9 top-level + 30 recipes + 25 categories + 6 clusters)
- Recipe avg 1,832 words; category avg 427 words; cluster avg 432 words
- 119 distinct category slugs for only 30 recipes (tag dump not taxonomy)

## Infrastructure
- Hostinger CDN (hcdn), brotli, HTTP/3 (alt-svc h3), prerendered Next.js (x-nextjs-prerender: 1, x-nextjs-cache: HIT)
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, HSTS preload, CSP upgrade-insecure-requests
- http:// and apex → 301 to https://www.chefaugustin.com
- /recettes/* → 308 to /recipes/* (intentional legacy migration mapping)
- robots.txt: /dashboard + /api/ disallowed; AI bots (OAI-SearchBot, PerplexityBot, Bingbot, Googlebot) explicitly allowed
- /dashboard, /api/ return 200 but robots-blocked (correct)

## CRITICAL: GPTBot blocked
- GPTBot UA (all official variants) → **429 on every URL** (home, sitemap, recipes), 5/5 attempts, persistent
- All other AI crawlers (OAI-SearchBot, PerplexityBot, ClaudeBot, anthropic-ai, Google-Extended) → 200
- robots.txt allows GPTBot, but Hostinger bot protection blocks it anyway → ChatGPT search cannot crawl site

## Schema (verified on /recipes/easy-chicken-rice-bowls-for-two)
- 2 JSON-LD blocks: BreadcrumbList + @graph (Recipe + BlogPosting + FAQPage)
- Recipe: name, image (Cloudinary), author Person (Chef Augustin Lefèvre), cookTime PT15M, prepTime PT8M, totalTime, yield "2 servings", 10 ingredients, HowToStep with position/name/text
- **MISSING: nutrition, recipeCuisine, aggregateRating** (correct to omit ratings without real data), dateModified on Recipe (BlogPosting has it)
- FAQPage with 5 Q&As on recipe pages

## On-page (verified)
- Homepage: title "Easy Weeknight Dinners for Two", desc good, canonical self, no author meta
- Recipe pages: og:title/description/image/type article all present; hero image 30/30 (was 13 missing in July ✅ fixed)
- Recipe H2 structure: Ingredients / Instructions / Why This Works / What Most Recipes Get Wrong / Chef's Tips / FAQ
- All imgs: width+height present (no CLS), alt present, 6/7 lazy, next/image optimizer, Cloudinary f_auto,q_auto; no explicit srcset (next/image handles)
- Category /recipes/category/30-minute: "6 recipe s" typo visible in body; H2 "30-minute recipes" near-duplicates H1; intro ~40 words
- HTML weight: home 158KB, recipe 186KB; 27 JS/CSS asset refs; **zero third-party hosts** on homepage
- /studio → 404 but linked in global nav (broken nav link)
- /contact → 200, indexable, NOT in sitemap; /favicon.ico 404 but icon.svg linked (fine)
- Meta descriptions: 0 > 160 chars (all fixed since July ✅); 99 pages < 90 chars (categories)
- Category pages have no datePublished in JSON-LD and no visible dates (content agent's "2015-01-01" claim NOT reproduced — dropped)

## llms.txt
- Present (200), well-formed, homepage + key pages + recipe list; but per GEO agent: keyword-polluted descriptions ("easy easy mexican dinner recipes recipes two"), "servings servings", wrong PT durations, "Published Articles (0)"
