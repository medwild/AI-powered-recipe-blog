# Performance Audit — https://www.chefaugustin.com

Audit date: 2026-08-05 | Method: LAB measurements (no PSI API key available; PSI API rate-limited without key)
Tooling: Playwright + Chromium 141 (claude-seo venv), curl (HTTP/2 + brotli), raw HTML sampling of 6 pages.
Pages measured: `/` (homepage) + `/recipes/easy-chicken-rice-bowls-for-two` (recipe), mobile-throttled (4x CPU, ~1.6 Mbps, 150ms RTT) and desktop (unthrottled).
Raw HTML sampled: home + 5 recipe pages (2-qt-slow-cooker-recipes, chicken-dinner-for-two, chicken-pot-pie-for-2, chocolate-chip-cookies-for-2, chocolate-lava-cakes-for-two).

## Lab Core Web Vitals (measured)

| Metric | Home mobile (throttled) | Recipe mobile (throttled) | Home desktop | Recipe desktop | Threshold (good) |
|---|---|---|---|---|---|
| LCP | **2760 ms** | **2476 ms** | 1024 ms | 1340 ms | ≤2500 ms |
| CLS | 0 | 0.0253 | 0 | 0 | ≤0.1 |
| INP (approx., synthetic clicks) | 237 ms | 221 ms | 225 ms | 176 ms | ≤200 ms |
| TTFB | 620 ms | 256 ms | 468 ms | 531 ms | ≤800 ms |
| FCP | — (not captured on throttled) | — | — | 1412 ms | ≤1800 ms |
| TBT | 309 ms | 411 ms | 14 ms | 2 ms | — |

Notes: INP is an **approximation** (max delay+duration of synthetic trusted clicks on anchors/buttons; 9-18 interaction events per run), not field data. LCP includes first-visit anti-bot challenge overhead (see issue 1). CLS on recipe mobile comes from a late-rendered element (images lack explicit dimensions — see issue 5). All measurements include the Hostinger JS challenge round-trip for the first navigation.

---

## Issues

### 1. CRITICAL — Hostinger JS bot-challenge interstitial served to every non-JS client (and some GETs), incl. sitemap and static assets
**Evidence:**
- `curl https://www.chefaugustin.com/` → HTTP 200 with a 6,192-byte challenge page: `<meta name="robots" content="noindex,nofollow">`, `<meta http-equiv="refresh" content="30">`, `<script src="/hcdn-cgi/jschallenge">`, "Checking your browser before accessing… Just a moment" (spinner). The real homepage is never returned to curl.
- `curl` with **Googlebot UA** → HTTP 403 (same challenge HTML).
- `curl https://www.chefaugustin.com/sitemap.xml` → challenge HTML, not the sitemap.
- `curl GET` of `/_next/static/chunks/*.js` and `.css` → HTTP 403 challenge (2,482 B); `HEAD` requests succeed (200) — inconsistent enforcement per method.
- Real browsers (Playwright, JS enabled) pass the challenge and load all assets (72-102 resources, all 200).
**Impact:** SEO crawlers that don't execute JS, social/link previewers, RSS readers and curl-based tooling (PageSpeed API fetch, some SEO tools) cannot read the site. Real users on first visit pay an extra challenge round-trip before LCP starts, inflating field LCP on cold visits.
**Recommendation:** Configure Hostinger Shield / bot-protection to whitelist verified bots (Googlebot, Bingbot via UA+IP reverse-DNS verification), and exclude `/_next/static/*`, `/sitemap.xml`, `/robots.txt` from the challenge. Validate with `curl` (plain UA) that the real HTML is returned. If AdSense/abuse risk is low for a static recipe site, consider disabling the interstitial entirely.

### 2. HIGH — Mobile LCP at 2.48-2.76 s — within "needs improvement" band, driven by JS weight + challenge overhead
**Evidence:** home mobile LCP 2760 ms, recipe mobile 2476 ms (threshold 2500 ms); TTFB 256-620 ms; script execution dominates the resource timeline (scripts = 18.3 s cumulative download time on throttled home vs 10.9 s for images); TBT 309-411 ms on throttled mobile.
**Recommendation:** (a) Preload the hero image (currently no hero `<link rel="preload" as="image">` with a real href — see issue 5); (b) reduce JS bytes (issues 3-4); (c) re-measure after challenge bypass (issue 1) to separate anti-bot overhead from page cost.

### 3. HIGH — Heavy JS footprint: 62 script tags, 94.5 KB inline JS, ~377-389 KB external JS per page
**Evidence:**
- Recipe page DOM: 62 `<script>` tags — 38 inline (94,515 B total) + 24 external; homepage 59 tags.
- External JS transfer: 376.9 KB (21 requests) home mobile, 389.4 KB (22 requests) recipe.
- Largest chunk: `_next/static/chunks/3nw5lwt6vl5ga.js` = 92.5 KB transfer; next two 56.3 KB and 52.4 KB.
- One external chunk `_next/static/chunks/0cz1d0mv5g_q7.js` is **not async/defer** (render-blocking, 24 external scripts — only 23 async).
- Inline scripts are small (526 B, 569 B, …) — likely hydration/bootstrap snippets — but 94.5 KB total.
**Recommendation:** Identify the inline script payload (RSC flight data vs hydration bootstrap) and slim it (e.g., `experimental.inlineScripts`/partial hydration config in Next.js 16). Ensure the one non-async chunk is loaded async or merged. Re-measure main-thread time after reducing bootstrap.

### 4. MEDIUM — 37-49 RSC prefetch requests per homepage load (~88-261 KB) on a fully prerendered static site
**Evidence:** home desktop: 49 `fetch` requests, 260.6 KB; home mobile: 37 fetch, 164 KB; recipe: 31 fetch, 87.6-87.8 KB. All are `?_rsc=<hash>` prefetches of nav destinations (`/about`, `/guides`, `/techniques`, `/recipes`, `/dashboard`, …) and recipe cards.
**Impact:** wasted bandwidth and main-thread parse on a site whose pages are already prerendered static HTML — the prefetch payloads duplicate content that could come from the HTML cache.
**Recommendation:** Set `prefetch={false}` on non-critical navigation links (or `prefetch` only on hover per Next.js 16 API), or disable router prefetch for static routes; verify fetch request count drops on re-measure.

### 5. MEDIUM — Images: no `srcset` and no `width`/`height` attributes; one broken image preload; CLS 0.025 on recipe mobile
**Evidence:**
- All sampled recipe pages: `<img>` tags carry `sizes="(max-width: 768px) 100vw, 768px"` (hero) and `loading="lazy"` (cards, 5-6 of 7) but **zero** `srcset` attributes (grep count = 0 across 5 recipe HTML files) and **no `width`/`height` attributes**.
- All images go through `/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2F…f_auto%2Cq_auto…` (Cloudinary source PNG, `f_auto` format negotiation) — so output format should be webp/avif via Cloudinary+next/image, but with a single candidate per viewport (no srcset = no responsive resizing).
- Homepage: 30 `<img>` tags, 26 image requests, 1004.8 KB transfer on desktop; largest hero cards 44-59 KB each.
- Recipe page: 6-7 images, 76.7 KB (mobile) / 131.1 KB (desktop) transfer.
- Broken preload found in recipe DOM: `<link rel="preload" as="image" href="">` (empty href) — wasted declaration, likely from a conditional preload with an undefined variable.
- CLS 0.0253 on recipe mobile (passes ≤0.1 but nonzero) consistent with images lacking intrinsic-dimension attributes.
**Recommendation:** Ensure `next/image` emits `srcset` (check for a custom loader or `unoptimized` flag suppressing it — with the default optimizer it must emit srcset); add explicit `width`/`height` (or CSS `aspect-ratio`) to all images to fully prevent CLS; delete the empty image preload; add a real hero preload (`<link rel="preload" as="image" fetchpriority="high">`) for the LCP image.

### 6. LOW-MEDIUM — Fonts: correct preloads (2 woff2, crossorigin) but several @font-face faces report load "error" in-browser
**Evidence:** DOM shows 2 preloads: `_next/static/media/2a65768255d6b625-s.p.3u4lli0-axodc.woff2` (37.9 KB transfer) and `…0wgildi0cnwt9.woff2` (30 KB), both `rel=preload as=font crossorigin=anonymous` — correct pattern for self-hosted next/font (Geist + Playfair Display). However `document.fonts` at end of load: Geist 4 faces **error** + 1 loaded; Playfair Display 3 faces **error** + 1 loaded; both Fallback faces "unloaded". Error statuses indicate preloaded font files not matching used faces (or duplicate/extra variants being fetched and failing).
Note: `font-display` value could not be verified from the CSS (curl GET of the CSS chunk is challenge-blocked, issue 1); next/font defaults to `display: swap`, so text should render with fallback during load.
**Recommendation:** Check DevTools network for failed woff2 fetches; preload only the exact face(s) used (variable font subset), and confirm `font-display: swap` in the emitted CSS once the challenge bypass (issue 1) allows asset inspection.

### 7. LOW-MEDIUM — Caching: headers correct, but all browser-run requests hit the CDN edge as BYPASS (origin round-trip 0.14-0.44 s)
**Evidence:**
- Static assets: `cache-control: public, max-age=31536000, immutable` + ETag + `content-encoding: br` (CSS, JS, woff2 all confirmed) — optimal.
- HTML: `cache-control: s-maxage=31536000`, `etag`, `x-nextjs-cache: HIT`, `x-nextjs-prerender: 1`, `x-nextjs-stale-time: 300` — prerendered static with stale-while-revalidate.
- However every browser-observed response (72-102 per run) carried `x-hcdn-cache-status: BYPASS` — Hostinger CDN edge did not serve any asset from cache during these runs (fresh-edge runs; upstream 0.141-0.443 s).
**Recommendation:** Verify CDN hit ratio on repeat/geographically-distributed requests (`x-hcdn-cache-status: HIT`); if BYPASS persists for `/_next/static/*`, the edge is not caching immutable assets — enable Hostinger CDN caching rules for `/_next/static/*` (immutable + 1y) so repeat visitors skip the origin entirely.

### 8. LOW — HTTP/3 advertised but not confirmed on downloads; brotli ~90% of responses
**Evidence:** `alt-svc: h3=":443"; ma=86400` on all responses; curl negotiated HTTP/2 (h3 not exercised here); 57-74 of ~65-102 responses per run served with `content-encoding: br`.
**Recommendation:** Nothing to fix — confirm h3 works from a browser (Performance tab "protocol" column). Note for reference only.

### 9. LOW — Raw HTML size ~180-197 KB per recipe page (prerendered static)
**Evidence:** recipe HTML 164-197 KB (gzip/br-compressed at transfer ≈ 87 KB incl. RSC fetch payloads); homepage challenge page is 6.2 KB but the real homepage is larger (30 imgs, 445 words).
**Recommendation:** Acceptable for prerendered content; revisit if RSC inline payload (issue 3) can be streamed separately.

---

## Overall assessment
- **Lab LCP**: recipe 2.48 s / home 2.76 s on throttled mobile — borderline; fix challenge overhead (issue 1), hero preload + srcset (issue 5), JS reduction (issues 3-4) to move under 2.5 s.
- **Lab CLS**: 0-0.025 — passes, but images without dimensions leave residual risk.
- **Lab INP (approx.)**: 176-237 ms — right at the 200 ms boundary; TBT 309-411 ms on throttled mobile confirms main-thread pressure from JS/RSC prefetch.
- **No third-party requests** (0 third-party hosts; everything same-origin) — excellent for privacy/performance.
- No PSI/Lighthouse score available (API rate-limited without key); field CrUX data unavailable. Recommend re-running PSI with an API key after the challenge bypass so Lighthouse can fetch assets.

## Data files (evidence)
- `/home/user/ai-blog-builder/www.chefaugustin.com-audit/data/cwv_results.json` — full per-run metrics + resource/responses arrays
- `/home/user/ai-blog-builder/www.chefaugustin.com-audit/data/deep_audit_data.json` — DOM audit of recipe page (links, scripts, imgs, fonts)
- `/home/user/ai-blog-builder/www.chefaugustin.com-audit/data/*.html` — raw HTML of 5 sampled recipe pages + challenge page (home.html)
- `/home/user/ai-blog-builder/www.chefaugustin.com-audit/data/cwv_measure.py`, `deep_audit.py` — measurement scripts (rerunnable)
