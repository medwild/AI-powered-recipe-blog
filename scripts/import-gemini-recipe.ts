// Import a Gemini-generated recipe JSON into the blog — standalone, disposable.
// Usage: npx tsx scripts/import-gemini-recipe.ts "<keyword>" <path-to-json> [--dry-run]
// Pattern: mirrors scripts/generate.ts (draft insert) + lib/generate-recipe-pure.ts (gate → persist → image).
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  // Dynamic imports — ES modules hoist static imports before dotenv
  const { db } = await import("../lib/db")
  const { recipes } = await import("../lib/db/schema")
  const { eq } = await import("drizzle-orm")
  const { slugify } = await import("../lib/slug")
  const { RecipeArticleSchema } = await import("../lib/schemas/recipe-article")
  const { qualityGate } = await import("../lib/quality-gate")
  const { recipeArticleToChefAugustinOutput } = await import("../lib/pipeline/agents/chef-augustin")
  const { persistFinalDraft } = await import("../lib/pipeline/steps/persist-phase")
  const { runImagePhase } = await import("../lib/pipeline/steps/image-phase")

  const keyword = process.argv[2]
  const jsonPath = process.argv[3]
  const dryRun = process.argv.includes("--dry-run")
  if (!keyword || !jsonPath) {
    console.log('Usage: npx tsx scripts/import-gemini-recipe.ts "<keyword>" <path-to-json> [--dry-run]')
    process.exit(1)
  }

  // ── 1. Read + parse Gemini output ────────────────────────────────
  const raw = fs.readFileSync(jsonPath, "utf-8")
  const article = RecipeArticleSchema.parse(JSON.parse(raw))
  console.log(`📄 "${article.title}" parsed (${(article.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length} words)`)

  // ── 2. Quality gate ──────────────────────────────────────────────
  const gateResult = await qualityGate(article)
  console.log(`🧪 Quality gate: ${gateResult.status}${gateResult.reason ? ` (${gateResult.reason})` : ""}`)
  if (gateResult.errors?.length) console.log(`   ${gateResult.errors.join("\n   ")}`)
  if (gateResult.status === "BLOCK") {
    console.log("❌ BLOCK — fixing the content in Gemini (Étape 4) is required. Nothing written.")
    process.exit(1)
  }

  if (dryRun) {
    console.log("✅ dry-run: schema + gate PASS — would insert & publish. No DB writes performed.")
    return
  }

  // ── 3. Create draft row (unique slug — same loop as generate.ts) ─
  const base = slugify(keyword) || "recette"
  let slug = base
  let suffix = 0
  while (true) {
    const existing = await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.slug, slug) })
    if (!existing) break
    slug = `${base}-${++suffix}`
  }
  const [created] = await db.insert(recipes).values({
    slug, keyword, title: article.title, status: "generating", workflowLog: [],
  }).returning({ id: recipes.id })
  const recipeId = created.id
  console.log(`📦 Draft #${recipeId} — slug: ${slug}`)

  // ── 4. Persist (sets status published/draft itself) ──────────────
  const legacy = recipeArticleToChefAugustinOutput(article)
  await persistFinalDraft(recipeId, legacy, gateResult.status as "PASS" | "BLOCK", false)

  // ── 5. Image (non-blocking, same as pipeline) ────────────────────
  // runImagePhase never throws on its own failures (returns heroImageUrl: null).
  // The db.update below ALWAYS runs so a failed image never leaves a literal
  // `[IMAGE: …]` marker rendering as visible text on the live page.
  try {
    const imageResult = await runImagePhase(recipeId, article, keyword)
    const persisted = await db.query.recipes.findFirst({
      where: (r, { eq }) => eq(r.id, recipeId),
      columns: { contentMarkdown: true },
    })
    const baseMd = persisted?.contentMarkdown ?? article.contentMarkdown
    const contentWithImages = baseMd.replace(/\[IMAGE:\s*(.+?)\]/g, (_: string, alt: string) =>
      imageResult.heroImageUrl
        ? `<img src="${imageResult.heroImageUrl}" alt="${alt.trim()}" loading="lazy" />`
        : "",
    )
    await db.update(recipes).set({
      ...(imageResult.heroImageUrl ? { heroImageUrl: imageResult.heroImageUrl } : {}),
      contentMarkdown: contentWithImages, updatedAt: new Date(),
    }).where(eq(recipes.id, recipeId))
    if (imageResult.heroImageUrl) {
      console.log(`🖼️  Image: ${imageResult.heroImageUrl}`)
    } else {
      console.warn("⚠️  Image generation failed (non-blocking) — [IMAGE:] markers cleaned, recipe published without image")
    }
  } catch (err) {
    console.warn(`⚠️  Image step failed (non-blocking): ${(err as Error).message}`)
  }

  console.log(`✅ Published — Recipe #${recipeId} (${slug})`)
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
