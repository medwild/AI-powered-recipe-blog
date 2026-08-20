import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const SLUG = "15-easy-dinner-recipes-for-two"

async function main() {
  const { db } = await import("@/lib/db")
  const { recipes } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const a = await db.select({ id: recipes.id, contentMarkdown: recipes.contentMarkdown }).from(recipes).where(eq(recipes.slug, SLUG)).limit(1)
  if (!a[0]) throw new Error("Article not found")
  const rowId = a[0].id
  let content = a[0].contentMarkdown ?? ""

  // --- Fix 1: H2 "Frequently Asked Questions" above the 6 H3 FAQ blocks ---
  const faqHeading = "## Frequently Asked Questions"
  if (!content.includes(faqHeading)) {
    const firstFaq = content.indexOf("### ")
    if (firstFaq === -1) throw new Error("No H3 FAQ block found")
    content = content.slice(0, firstFaq) + faqHeading + "\n\n" + content.slice(firstFaq)
    console.log("  H2 FAQ inserted before first H3")
  } else {
    console.log("  H2 FAQ already present")
  }

  // --- Fix 2: metaDescription trim (154 → ~146, avoid mobile truncation ~155-160) ---
  const candidates = [
    "15 easy dinner recipes for two — from 20-minute garlic butter pasta to small-batch lasagna. One-pan, low-cleanup, all scaled to serve exactly two.",
  ]
  let metaDescription = candidates[0]
  if (metaDescription.length < 140 || metaDescription.length > 152) {
    throw new Error(`metaDescription candidate out of range: ${metaDescription.length}`)
  }

  await db.update(recipes)
    .set({ contentMarkdown: content, metaDescription, updatedAt: new Date() })
    .where(eq(recipes.id, rowId))
  console.log(`  metaDescription → ${metaDescription.length} chars`)

  // --- Verify ---
  const check = await db.select({ contentMarkdown: recipes.contentMarkdown, metaDescription: recipes.metaDescription }).from(recipes).where(eq(recipes.id, rowId))
  const hasFaq = check[0].contentMarkdown.includes(faqHeading)
  const faqPos = check[0].contentMarkdown.indexOf(faqHeading)
  const firstH3 = check[0].contentMarkdown.indexOf("### ")
  const h2s = (check[0].contentMarkdown.match(/^## /gm) ?? []).length
  console.log(`\n  H2 FAQ present: ${hasFaq} (pos ${faqPos}, before H3 ${faqPos < firstH3})`)
  console.log(`  H2 count: ${h2s} (intro 2 + FAQ 1 + 15 recipes = 18 expected)`)
  console.log(`  metaDescription: ${check[0].metaDescription.length} chars`)
  console.log(`  words: ${check[0].contentMarkdown.trim().split(/\s+/).length}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
