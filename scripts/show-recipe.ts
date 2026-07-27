import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { db } = await import("../lib/db");
  const { recipes } = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const r = await db.select().from(recipes).where(eq(recipes.id, 74)).limit(1);
  if (!r[0]) { console.log("❌ Introuvable"); process.exit(0); }
  const rec = r[0];

  console.log("=".repeat(60));
  console.log(`TITLE: ${rec.title}`);
  console.log(`META: ${rec.metaTitle}`);
  console.log(`DESC: ${rec.metaDescription}`);
  console.log(`TAGS: ${(rec.tags||[]).join(", ")}`);
  console.log(`TIMES: prep=${rec.prepTime} cook=${rec.cookTime} total=${rec.totalTime}`);
  console.log(`SERVINGS: ${rec.servings} | DIFFICULTY: ${rec.difficulty}`);
  console.log("=".repeat(60));

  console.log(`\n--- INGREDIENTS (${(rec.ingredients||[]).length}) ---`);
  for (const i of (rec.ingredients || [])) {
    console.log(`  • ${typeof i === 'string' ? i : `${i.name} (${i.quantity||''})`}`);
  }

  console.log(`\n--- INSTRUCTIONS (${(rec.instructions||[]).length}) ---`);
  for (const s of (rec.instructions || [])) {
    console.log(`  Step ${s.step}: ${(s.text||'').substring(0, 200)}`);
    if (s.temperature) console.log(`    🌡 ${s.temperature}`);
    if (s.duration) console.log(`    ⏱ ${s.duration}`);
  }

  console.log(`\n--- IMAGE PROMPT ---`);
  console.log(rec.imagePrompt);

  console.log(`\n--- CONTENT (first 3000 chars) ---`);
  console.log((rec.contentMarkdown||'').substring(0, 3000));
}
main();
