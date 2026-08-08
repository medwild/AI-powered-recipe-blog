/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone server — self-contained deploy for Hostinger Node.js hosting
  // (Vercel ignores this option; safe to keep).
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [384, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "chefaugustin.com",
      },
    ],
  },
  allowedDevOrigins: [
    process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : undefined,
    // Cloud Workstations dynamic ports — match any port prefix on the cluster domain
    "*.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev",
  ].filter(Boolean),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://res.cloudinary.com data: blob:",
              "font-src 'self'",
              "connect-src 'self' https://res.cloudinary.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action *",
            ].join("; "),
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: "/recettes", destination: "/recipes", permanent: true },
      { source: "/recettes/:path*", destination: "/recipes/:path*", permanent: true },
      // Empty legacy hubs (2026-08-06 Semrush audit — no published articles, no
      // catalog hubs → noindex shells). 301 to the real content sections.
      { source: "/techniques", destination: "/guides", permanent: true },
      { source: "/histoire", destination: "/about", permanent: true },
      { source: "/equipement", destination: "/guides", permanent: true },
      // Orzo slug fix 2026-08-03 — old Wave-2 slugs now point to real keywords
      { source: "/recipes/simple-dinner-recipes-for-2", destination: "/recipes/creamy-parmesan-garlic-chicken-orzo-for-two", permanent: true },
      { source: "/recipes/easy-healthy-dinner-recipes-for-two", destination: "/recipes/summer-herb-chicken-orzo-with-zucchini-for-two", permanent: true },
      { source: "/recipes/easy-dinner-for-two-recipes", destination: "/recipes/white-wine-lemon-chicken-orzo-for-two", permanent: true },
      { source: "/recipes/dinner-for-two-recipes-healthy", destination: "/recipes/mediterranean-chicken-orzo-with-feta-olives-for-two", permanent: true },
      // Deleted slugs — 301 to replacement recipes (2026-07-29 chicken-orzo dedup)
      // NOTE: healthy-dinner-ideas-for-two was re-used by a NEW recipe published
      // 2026-08-05 (One-Pan Chicken and Vegetable Skillet for Two) — its stale
      // redirect was removed so the live recipe is reachable again.
      { source: "/recipes/healthy-dinner-recipes-for-2", destination: "/recipes/salmon-orzo-with-dill-and-capers-for-two", permanent: true },
      // 2026-08-08 audit P1-3 — soft-404 (200 "Recipe not found" + noindex) ;
      // l'ancien slug servait un cul-de-sac via /recettes/:path*
      { source: "/recipes/creamy-garlic-chicken", destination: "/recipes/creamy-parmesan-garlic-chicken-orzo-for-two", permanent: true },
      // Category consolidation 2026-08-05 — 1-2 recipe categories 301 to their
      // canonical parent (kill thin pages + keyword cannibalization, ~119 → ~35)
      { source: "/recipes/category/30-minute-meals", destination: "/recipes/category/quick", permanent: true },
      { source: "/recipes/category/30-minute-dinner", destination: "/recipes/category/quick", permanent: true },
      { source: "/recipes/category/30-minute-meal", destination: "/recipes/category/quick", permanent: true },
      { source: "/recipes/category/35-minute-meal", destination: "/recipes/category/quick", permanent: true },
      { source: "/recipes/category/chicken-breast-recipes", destination: "/recipes/category/chicken", permanent: true },
      { source: "/recipes/category/chicken-dinner-for-two", destination: "/recipes/category/chicken", permanent: true },
      { source: "/recipes/category/chicken-pot-pie", destination: "/recipes/category/chicken", permanent: true },
      { source: "/recipes/category/herb-chicken", destination: "/recipes/category/chicken", permanent: true },
      { source: "/recipes/category/easy-chicken-dinner", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/easy-chicken-recipes", destination: "/recipes/category/chicken", permanent: true },
      { source: "/recipes/category/one-pan-meal", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/one-pan-dinner", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/one-pan-pasta", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/one-pot", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/sheet-pan-dinner", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/skillet", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/skillet-meal", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/cast-iron", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/stovetop", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/pan-seared", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/one-pan-chicken", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/one-pan-chicken-dinner", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/quick-dinner", destination: "/recipes/category/quick", permanent: true },
      { source: "/recipes/category/quick-dinner-for-two", destination: "/recipes/category/quick", permanent: true },
      // 2026-08-08 audit P1-2 — thin legacy categories (63-138 words) served 200
      { source: "/recipes/category/chicken-for-two", destination: "/recipes/category/chicken", permanent: true },
      { source: "/recipes/category/dessert", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/quick-dessert", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/quick-sauces", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/quick-shrimp-recipe", destination: "/recipes/category/quick", permanent: true },
      { source: "/recipes/category/easy-dinner", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/easy-weeknight", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/easy-dessert", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/easy-lunch-recipes", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/for-two", destination: "/recipes/category/dinner-for-two", permanent: true },
      { source: "/recipes/category/dinners-for-two", destination: "/recipes/category/dinner-for-two", permanent: true },
      { source: "/recipes/category/cooking-for-two", destination: "/recipes/category/dinner-for-two", permanent: true },
      { source: "/recipes/category/lunch-for-two", destination: "/recipes/category/dinner-for-two", permanent: true },
      { source: "/recipes/category/romantic-dinner", destination: "/recipes/category/date-night", permanent: true },
      { source: "/recipes/category/romantic-dinner-for-two-at-home", destination: "/recipes/category/date-night", permanent: true },
      { source: "/recipes/category/steak-dinner-for-two", destination: "/recipes/category/date-night", permanent: true },
      { source: "/recipes/category/easter-dinner-for-two", destination: "/recipes/category/dinner-for-two", permanent: true },
      { source: "/recipes/category/thanksgiving-for-two", destination: "/recipes/category/dinner-for-two", permanent: true },
      { source: "/recipes/category/small-thanksgiving", destination: "/recipes/category/dinner-for-two", permanent: true },
      { source: "/recipes/category/dessert-for-2", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/dessert-for-two", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/chocolate", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/chocolate-lava-cake", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/cookie-dough-for-two", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/edible-cookie-dough", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/egg-free-cookie-dough", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/small-batch-dessert", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/no-bake-dessert", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/lava-cake", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/puff-pastry", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/gravy", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/lemon", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/lemon-butter", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/parmesan", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/feta", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/feta-brine", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/olives", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/capers", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/dill", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/white-wine", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/spring-vegetables", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/zucchini", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/salmon", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/shrimp-orzo", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/garlic-shrimp", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/seafood", destination: "/recipes/category/orzo", permanent: true },
      { source: "/recipes/category/rice-bowl", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/rice-recipe", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/stir-fry", destination: "/recipes/category/one-pan", permanent: true },
      // rice promoted to canonical 2026-08-06 (5 recipes) — redirect removed
      { source: "/recipes/category/asian", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/italian-american", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/italian-inspired", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/mexican", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/mediterranean-chicken", destination: "/recipes/category/chicken", permanent: true },
      { source: "/recipes/category/meal-prep", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/gluten-free", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/vegetarian", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/beef", destination: "/recipes/category/dinner-for-two", permanent: true },
      // ground-beef + slow-cooker promoted to canonical 2026-08-06 (4 recipes each) — redirects removed
      { source: "/recipes/category/small-batch-cooking", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/small-batch-recipe", destination: "/recipes/category/small-batch", permanent: true },
      { source: "/recipes/category/summer-dinner", destination: "/recipes/category/weeknight", permanent: true },
      // 2026-08-08 audit P2-9 — strict subset (11/11) duplicate category
      { source: "/recipes/category/weeknight-dinner", destination: "/recipes/category/weeknight", permanent: true },
      { source: "/recipes/category/side-dish", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/mac-and-cheese", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/mashed-potatoes-for-two", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/creamy-mashed-potatoes", destination: "/recipes/category/easy", permanent: true },
      { source: "/recipes/category/easy-to-make-asian-food-recipes", destination: "/recipes/category/one-pan", permanent: true },
      { source: "/recipes/category/easy-to-cook-dinner-for-two", destination: "/recipes/category/dinner-for-two", permanent: true },
      { source: "/recipes/category/quick-and-easy-dinner-recipes-for-two", destination: "/recipes/category/quick", permanent: true },
      { source: "/recipes/category/simple-healthy-dinner-ideas-for-two", destination: "/recipes/category/easy", permanent: true },
    ]
  },
  async rewrites() {
    return []
  },
}

export default nextConfig
