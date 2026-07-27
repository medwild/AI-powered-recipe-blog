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

  console.log("--- FULL CONTENT ---\n");
  console.log(rec.contentMarkdown);
  console.log("\n--- END CONTENT ---");
  console.log(`\n--- IMAGE PROMPT RAW: "${rec.imagePrompt}" ---`);
  console.log(`\n--- JSON-LD RAW (first 500 chars): "${(rec.jsonLd||'').substring(0, 500)}" ---`);
}
main();
