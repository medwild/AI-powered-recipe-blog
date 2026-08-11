# Visual Audit — www.chefaugustin.com

Date: 2026-08-05 — Playwright + Chromium 138 (system binary), desktop 1440x900 / mobile 390x844 (iPhone UA, dpr 2).
Note: site sits behind a Hostinger JS bot-challenge; each capture waits ~5s for it to clear. Screenshots in `/home/user/ai-blog-builder/www.chefaugustin.com-audit/screenshots/`.

## Screenshots

| Page | Desktop | Mobile |
|---|---|---|
| Homepage | `home_desktop.png` | `home_mobile.png` |
| Recipe (easy-chicken-rice-bowls-for-two) | `recipe_desktop.png` | `recipe_mobile.png` |
| Category (chicken) | `category_desktop.png` | `category_mobile.png` |
| Cluster (one-pan-dinners-for-two) | `cluster_desktop.png` | `cluster_mobile.png` |
| Dark-mode emulation (color-scheme dark) | `home_desktop_dark.png`, `recipe_desktop_dark.png` | — |

---

## 1. HIGH — Hostinger bot-challenge interstitial blocks content for ~5 s on every page

- **Evidence**: All 4 URLs first render a challenge page whose H1 is "Checking your browser before accessing www.chefaugustin.com" (visible in the raw captures before the ~5 s wait; body has no content during it). Real content (H1 "Easy Weeknight Dinners for Two") appears only at t≈5 s. Screenshots were taken post-clear, so they show real content; the interstitial itself is not visible in the final PNGs.
- **Impact**: Above-the-fold paint for real users delayed ~5 s; JS-less/verification crawlers get a blank H1 (SEO/crawlability risk, and CLS/LCP pain).
- **Recommendation**: Hosting-layer config — whitelist known search bots (Googlebot, Bingbot) and validate the challenge clears faster for real browsers; not a frontend issue.

## 2. MEDIUM — Desktop recipe page: H1 below the fold, 1102 px-tall hero image dominates the viewport

- **Evidence** (`recipe_desktop.png`): hero IMG spans top 134 → ~1236 px (734 x 1102 px, `object-cover`); H1 "Garlic Butter Chicken Rice Bowls for Two" starts at top 1301 px (inFold=false at 900 px viewport). Above the fold on desktop: sticky nav + breadcrumbs + giant photo only. Mobile is fine (H1 at 502 px, "Jump to Recipe" at 590 px — both in fold, see `recipe_mobile.png`).
- **Impact**: Desktop users must scroll ~1.4 viewport heights before seeing the recipe title; the primary intent signal (title) is invisible at first paint.
- **Recommendation**: Cap hero image height (e.g. `max-h-[60-70vh] object-cover`) or overlay/place the H1 beside the image so the title and meta are in the first viewport.

## 3. MEDIUM — Mobile homepage: zero recipe cards above the fold; intro section delays the grid

- **Evidence** (`home_mobile.png` + DOM): hero section 65–793 px (hero image 201 px, H1 32 px at 386 px, tagline chips, "Browse all recipes" CTA at 716 px), then a 587 px intro section ("Small-batch cooking, big French technique", 793–1380 px) before the "Easy Dinner Recipes for Two" grid starts at ~1380 px — ~1.6 viewport heights of scrolling to see a single recipe.
- **Impact**: Weakest first impression for the core content type; mobile users searching for a recipe see marketing copy instead.
- **Recommendation**: On mobile, move the intro section below the recipe grid (or cut it); hero image + H1 + CTA + first card row would fit the first viewport.

## 4. MEDIUM — Dark mode exists but is opt-in; system preference is ignored (screenshots byte-identical)

- **Evidence**: `home_desktop_dark.png` is byte-identical to `home_desktop.png` (both 355181 bytes), same for recipe (559236) — with `prefers-color-scheme: dark` emulated, `<html>` still has class `light` + inline `style="color-scheme: light"` and body renders near-white. A `@media(prefers-color-scheme:dark){html{background:#1a1614;color:#f5efe6}}` rule exists in CSS but only colors the `<html>` element. Clicking the header toggle (aria-label "Passer en mode sombre" — in French on an English site) does switch to a real dark theme (`<html class="... dark">`, `color-scheme: dark`, body bg near-black `lab(3.67...)`).
- **Impact**: Dark-mode users (OS-level setting) get a light site on every first visit; the working theme is hidden behind a French-labeled button.
- **Recommendation**: Switch the theme provider default to `system` (e.g. next-themes `defaultTheme: "system"`) and localize the toggle label ("Dark mode"). Dark-theme contrast itself was not pixel-audited here (PNGs not readable in this environment) — recommend a follow-up contrast pass on the dark palette.

## 5. LOW — Mobile homepage primary CTA is 36 px tall (below 44/48 px target guidance)

- **Evidence** (`home_mobile.png`): "Browse all recipes" button measures 170 x 36 px (`tapTargetsSmall` from DOM).
- **Recommendation**: Bump button padding to >= 44 px height (48 px for WCAG 2.2).

## 6. LOW — 10 px uppercase labels on mobile recipe page

- **Evidence** (`recipe_mobile.png`): "Prep", "Cook", "Servings" stat labels render at `text-[10px]` uppercase; below the 12 px readability floor, though they sit next to larger values.
- **Recommendation**: Raise to 11–12 px or make them part of the value line.

## 7. LOW — Fixed cookie-consent bar consumes ~131 px at the bottom on desktop recipe page

- **Evidence** (`recipe_desktop.png` after dismiss-allow): `position: fixed; bottom: 0; z-50`, height 131 px, "We use cookies to analyze traffic and serve personalized ads", present at 1440 x 900.
- **Recommendation**: Keep the bar under ~80 px and/or ensure it dismisses to a compact state; verify it never overlaps a sticky bottom action bar on short viewports.

---

## Checks that PASS

- **No horizontal overflow** on any page/viewport: scrollWidth == clientWidth (1440 / 390) everywhere.
- **Viewport meta correct**: `width=device-width, initial-scale=1`, no `user-scalable=no`.
- **Mobile rendering**: no text clipping, no overlap detected in DOM geometry; sticky glass nav present (`sticky top-0 z-40`, 0.85 alpha).
- **Contrast (light mode, computed with alpha compositing over real backdrops)**: no element below 4.5:1 on the recipe page — body text 8.2, H1 15.0, primary orange button (white text) 5.7, accent "for Two" 5.7. Category badge "One-Pan" (`bg-primary/10` orange chip) initially measured 1.07:1 due to an uncomposited alpha artifact; correctly composited over the card background it is ~5:1 — no finding.
- **Visual hierarchy**: H1s are prominent (Playfair Display, 48 px desktop / 32 px mobile home; 36 px on category/cluster pages), single H1 per page, correct heading order; recipe cards are rounded, image-led, hover-lifted (`card-hover`), titles as H3 — clean card design on `category_desktop.png` / `cluster_desktop.png`.
- **Category/cluster pages load recipe cards above the fold**: 9 cards desktop (6 images) / 2 cards mobile in first viewport (`category_desktop.png`, `category_mobile.png`, `cluster_desktop.png`, `cluster_mobile.png`).
- **Hero (homepage)**: effective on both breakpoints — image + H1 + tagline chips + orange CTA all within first viewport (`home_desktop.png`, `home_mobile.png`).
- **Images**: hero images loaded (`complete=true`); below-fold related-recipe images correctly lazy-loaded; no broken images above the fold.
- **Recipe page mobile UX**: H1 in fold at 502 px, sticky "Jump to Recipe" at 590 px — strong intent capture.

Data source: `visual-data.json` + `capture_audit2.py` / `contrast_check.py` in `/home/user/ai-blog-builder/www.chefaugustin.com-audit/`.
