import "dotenv/config";
import { recipes } from "../lib/db/schema";
import { db } from "../lib/db";
import { eq } from "drizzle-orm";
import { scrubBannedWords, validateContent } from "../lib/content-validator";
import type { Ingredient, Instruction } from "../lib/db/schema";

async function main() {
  const draftIds = [109, 112, 113, 114];

  for (const id of draftIds) {
    const rows = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
    if (!rows.length) continue;

    const r = rows[0];

    // Skip already published
    if (r.status === "published") {
      console.log(`#${r.id} — already published, skipping`);
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`RECIPE #${r.id} — ${r.slug} (${r.content_type})`);

    // 1. Scrub banned words
    const md = r.contentMarkdown ?? "";
    const { scrubbed, replacements } = scrubBannedWords(md);
    if (replacements.length > 0) {
      console.log(`  Scrubbed: ${replacements.join("; ")}`);
    }

    // 2. Detect if this is actually an article (no ingredients list in markdown)
    const isArticle = r.content_type === "article" ||
      (!r.ingredients?.length && !r.instructions?.length && !/\bIngredients\b/i.test(md));

    const contentType = isArticle ? "article" : "recipe";
    const category = isArticle ? (r.category || "techniques") : r.category;

    // 3. Prepare for validation
    const draft = {
      contentMarkdown: scrubbed,
      title: r.title,
      metaTitle: r.metaTitle,
      metaDescription: r.metaDescription,
      ingredients: r.ingredients,
      instructions: r.instructions,
      contentType,
    };

    // 4. Validate
    const validation = validateContent(draft);
    if (!validation.passed) {
      const errors = validation.errors.filter(e => e.severity === "error");
      console.log(`  ❌ Still has ${errors.length} errors:`);
      for (const e of errors) {
        console.log(`     - [${e.field}] ${e.message}`);
      }
      continue;
    }

    const warnings = validation.errors.filter(e => e.severity === "warning");
    console.log(`  ✅ Validation PASSED as "${contentType}"${warnings.length > 0 ? ` (${warnings.length} warnings)` : ""}`);

    // 5. Publish with corrected content_type
    const updateData: Record<string, unknown> = {
      contentMarkdown: scrubbed,
      status: "published",
      content_type: contentType,
      updatedAt: new Date(),
    };
    if (r.status !== "published") {
      updateData.publishedAt = new Date();
    }
    if (isArticle && !r.category) {
      updateData.category = category;
    }

    await db.update(recipes).set(updateData).where(eq(recipes.id, id));
    console.log(`  🚀 Published as "${contentType}"!`);
  }

  await db.$client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
