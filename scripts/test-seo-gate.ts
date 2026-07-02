/**
 * Unit tests for lib/seo/gate.ts — all 16 deterministic SEO checks.
 * Usage: npx tsx scripts/test-seo-gate.ts
 */

import { runSeoGate, type GateInput } from "../lib/seo/gate"

let passed = 0
let failed = 0

function assert(condition: boolean, name: string) {
  if (condition) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name}`) }
}

async function test(name: string, fn: () => Promise<void>) {
  console.log(`\n${name}`)
  try { await fn() } catch (e) { failed++; console.log(`  💥 ${(e as Error).message}`) }
}

// ── Test Data ────────────────────────────────────────────────────────────────

const validJsonLd = {
  "@context": "https://schema.org",
  "@graph": [{
    "@type": "Recipe",
    name: "Swedish Meatballs",
    image: "https://res.cloudinary.com/test/image.jpg",
    recipeIngredient: ["500g ground beef", "1 egg", "breadcrumbs"],
    recipeInstructions: [{ "@type": "HowToStep", text: "Mix ingredients" }],
    cookTime: "PT30M",
    prepTime: "PT15M",
    nutrition: { calories: "450 kcal" },
    aggregateRating: { ratingValue: "4.8", reviewCount: "24" },
  }],
}

const validInput: GateInput = {
  recipeId: 1,
  title: "Swedish Meatballs Recipe",
  metaTitle: "Swedish Meatballs — Better Than IKEA | Chef Augustin",
  metaDescription: "Authentic Swedish meatballs with cream sauce. Ready in 45 minutes, tested 200+ times for foolproof results every time.",
  slug: "swedish-meatballs-recipe",
  focusKeyphrase: "swedish meatballs recipe",
  contentMarkdown: "## Why This Swedish Meatballs Recipe Actually Works\n\nSwedish meatballs are the ultimate comfort food. At 450 calories per serving, this dish is rated 4.8 stars by readers. Check out our [lingonberry sauce recipe](/recettes/lingonberry-sauce) and [mashed potatoes guide](/recettes/mashed-potatoes).",
  heroImageUrl: "https://res.cloudinary.com/test/meatballs.jpg",
  jsonLd: validJsonLd,
  content_type: "recipe",
}

// ── BLOCK Tests ──────────────────────────────────────────────────────────────

async function main() {
  console.log("=== SEO Gate Unit Tests ===\n")

  // B1: Recipe schema missing
  await test("B1 — RECIPE_SCHEMA_MISSING", async () => {
    const r = await runSeoGate({ ...validInput, jsonLd: null })
    assert(r.status === "BLOCK", "null jsonLd → BLOCK")
    assert(r.blockingIssues.some(i => i.code === "RECIPE_SCHEMA_MISSING"), "code: RECIPE_SCHEMA_MISSING")

    const r2 = await runSeoGate({ ...validInput, jsonLd: { "@graph": [{ "@type": "BlogPosting" }] } })
    assert(r2.status === "BLOCK", "no Recipe node → BLOCK")
  })

  // B2: Ingredients missing
  await test("B2 — INGREDIENTS_MISSING", async () => {
    const bad = JSON.parse(JSON.stringify(validJsonLd))
    delete bad["@graph"][0].recipeIngredient
    const r = await runSeoGate({ ...validInput, jsonLd: bad })
    assert(r.status === "BLOCK", "no recipeIngredient → BLOCK")
  })

  // B3: Instructions missing
  await test("B3 — INSTRUCTIONS_MISSING", async () => {
    const bad = JSON.parse(JSON.stringify(validJsonLd))
    delete bad["@graph"][0].recipeInstructions
    const r = await runSeoGate({ ...validInput, jsonLd: bad })
    assert(r.status === "BLOCK", "no recipeInstructions → BLOCK")
  })

  // B4: Image missing in schema
  await test("B4 — IMAGE_MISSING_IN_SCHEMA", async () => {
    const bad = JSON.parse(JSON.stringify(validJsonLd))
    delete bad["@graph"][0].image
    const r = await runSeoGate({ ...validInput, jsonLd: bad })
    assert(r.status === "BLOCK", "no image in schema → BLOCK")
  })

  // B5: Placeholder image
  await test("B5 — IMAGE_PLACEHOLDER", async () => {
    const r = await runSeoGate({ ...validInput, heroImageUrl: null })
    assert(r.status === "BLOCK", "null heroImageUrl → BLOCK")

    const r2 = await runSeoGate({ ...validInput, heroImageUrl: "/placeholder.svg" })
    assert(r2.status === "BLOCK", "placeholder URL → BLOCK")
  })

  // B6: Recipe name missing
  await test("B6 — RECIPE_NAME_MISSING", async () => {
    const bad = JSON.parse(JSON.stringify(validJsonLd))
    delete bad["@graph"][0].name
    const r = await runSeoGate({ ...validInput, jsonLd: bad })
    assert(r.status === "BLOCK", "no name → BLOCK")
  })

  // B7: Title missing
  await test("B7 — TITLE_MISSING", async () => {
    const r = await runSeoGate({ ...validInput, metaTitle: null })
    assert(r.status === "BLOCK", "null metaTitle → BLOCK")

    const r2 = await runSeoGate({ ...validInput, metaTitle: "Short" })
    assert(r2.status === "BLOCK", "title < 10 chars → BLOCK")
  })

  // B8: Cannibalization (requires DB — skip in unit test)
  await test("B8 — CANIBALIZATION (unit — no DB)", async () => {
    // With no published recipes in DB, this should pass
    const r = await runSeoGate(validInput)
    assert(!r.blockingIssues.some(i => i.code === "CANIBALIZATION"), "no cannibalization detected (fresh DB)")
  })

  // ── WARNING Tests ──────────────────────────────────────────────────────────

  // W1: Keyphrase not in title
  await test("W1 — KEYPHRASE_NOT_IN_TITLE", async () => {
    const r = await runSeoGate({ ...validInput, metaTitle: "A Delicious Recipe You'll Love" })
    assert(r.warnings.some(w => w.code === "KEYPHRASE_NOT_IN_TITLE"), "keyphrase not in title → warning")
    assert(r.status !== "BLOCK", "warning only, not block")
  })

  // W2: Meta description out of range
  await test("W2 — META_DESC_OUT_OF_RANGE", async () => {
    const r = await runSeoGate({ ...validInput, metaDescription: "Too short" })
    assert(r.warnings.some(w => w.code === "META_DESC_OUT_OF_RANGE"), "too short → warning")
  })

  // W3: Keyphrase not in intro
  await test("W3 — KEYPHRASE_NOT_IN_INTRO", async () => {
    const r = await runSeoGate({ ...validInput, contentMarkdown: "This is a generic introduction about cooking comfort food.", focusKeyphrase: "swedish meatballs recipe" })
    assert(r.warnings.some(w => w.code === "KEYPHRASE_NOT_IN_INTRO"), "keyphrase not in intro → warning")
  })

  // W4: Nutrition missing
  await test("W4 — NUTRITION_MISSING_IN_SCHEMA", async () => {
    const bad = JSON.parse(JSON.stringify(validJsonLd))
    delete bad["@graph"][0].nutrition
    const r = await runSeoGate({ ...validInput, jsonLd: bad })
    assert(r.warnings.some(w => w.code === "NUTRITION_MISSING_IN_SCHEMA"), "no nutrition → warning")
  })

  // W5: Rating missing
  await test("W5 — RATING_MISSING_IN_SCHEMA", async () => {
    const bad = JSON.parse(JSON.stringify(validJsonLd))
    delete bad["@graph"][0].aggregateRating
    const r = await runSeoGate({ ...validInput, jsonLd: bad })
    assert(r.warnings.some(w => w.code === "RATING_MISSING_IN_SCHEMA"), "no rating → warning")
  })

  // W6: Low internal links
  await test("W6 — LOW_INTERNAL_LINKS", async () => {
    const r = await runSeoGate({ ...validInput, contentMarkdown: "Just some text without any links." })
    assert(r.warnings.some(w => w.code === "LOW_INTERNAL_LINKS"), "no internal links → warning")

    const r2 = await runSeoGate({ ...validInput, contentMarkdown: "Check [this](/recettes/meatballs) and [this](/recettes/sauce) for more." })
    assert(!r2.warnings.some(w => w.code === "LOW_INTERNAL_LINKS"), "2+ links → no warning")
  })

  // W7: Cook time missing
  await test("W7 — COOK_TIME_MISSING_IN_SCHEMA", async () => {
    const bad = JSON.parse(JSON.stringify(validJsonLd))
    delete bad["@graph"][0].cookTime
    delete bad["@graph"][0].prepTime
    const r = await runSeoGate({ ...validInput, jsonLd: bad })
    assert(r.warnings.some(w => w.code === "COOK_TIME_MISSING_IN_SCHEMA"), "no cookTime → warning")
  })

  // W8: Schema-content mismatch
  await test("W8 — SCHEMA_CONTENT_MISMATCH", async () => {
    const bad = JSON.parse(JSON.stringify(validJsonLd))
    bad["@graph"][0].aggregateRating = { ratingValue: "4.8" }
    const r = await runSeoGate({ ...validInput, jsonLd: bad, contentMarkdown: "Just a recipe. No ratings mentioned." })
    assert(r.warnings.some(w => w.code === "SCHEMA_CONTENT_MISMATCH"), "ratings in schema but not content → warning")
  })

  // ── Scoring ────────────────────────────────────────────────────────────────

  await test("Scoring — PASS with perfect input", async () => {
    const r = await runSeoGate(validInput)
    assert(r.status === "PASS", "perfect input → PASS")
    assert(r.score >= 85, `score ${r.score} >= 85`)
    assert(r.blockingIssues.length === 0, "no blocking issues")
  })

  await test("Scoring — REVISE with warnings only", async () => {
    // 6 warnings = 70 score = REVISE
    const bad = JSON.parse(JSON.stringify(validJsonLd))
    delete bad["@graph"][0].nutrition
    delete bad["@graph"][0].aggregateRating
    delete bad["@graph"][0].cookTime
    delete bad["@graph"][0].prepTime
    const r = await runSeoGate({
      ...validInput,
      jsonLd: bad,
      metaTitle: "Generic Title",
      metaDescription: "Short",
      contentMarkdown: "No links, just text.",
    })
    assert(r.status === "REVISE", "multiple warnings → REVISE")
    assert(r.score < 85 && r.score >= 60, `score ${r.score} between 60-84`)
  })

  await test("Scoring — BLOCK overrides score", async () => {
    const r = await runSeoGate({ ...validInput, metaTitle: null, metaDescription: "Perfect meta description that is very well written and has the keyword. Best recipe ever for swedish meatballs and cream sauce with lingonberry jam." })
    assert(r.status === "BLOCK", "BLOCK despite other fields being OK")
    assert(r.score === 0, "score forced to 0")
  })

  // ── Article mode ───────────────────────────────────────────────────────────

  await test("Article content_type — skips recipe checks", async () => {
    const r = await runSeoGate({ ...validInput, content_type: "article", jsonLd: null, heroImageUrl: "https://example.com/img.jpg" })
    // Articles don't need Recipe schema, so no schema blocks
    assert(!r.blockingIssues.some(i => i.code === "RECIPE_SCHEMA_MISSING"), "article skips recipe schema check")
    assert(!r.warnings.some(w => w.code === "NUTRITION_MISSING_IN_SCHEMA"), "article skips nutrition check")
  })

  // ── Summary ────────────────────────────────────────────────────────────────

  const total = passed + failed
  console.log(`\n${"═".repeat(50)}`)
  console.log(`Results: ${passed}/${total} passed (${Math.round(passed/total*100)}%)`)
  if (failed > 0) {
    console.log(`❌ ${failed} test(s) FAILED`)
    process.exit(1)
  } else {
    console.log("✅ All tests passed")
  }
}

main().catch(e => { console.error(e); process.exit(1) })
