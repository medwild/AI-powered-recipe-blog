import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { db } = await import("../lib/db");
  const { recipes } = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const id = parseInt(process.argv[2] || "73", 10);
  const r = await db.select({
    id: recipes.id, title: recipes.title, status: recipes.status,
    ingredients: recipes.ingredients, instructions: recipes.instructions,
    workflowLog: recipes.workflowLog,
  }).from(recipes).where(eq(recipes.id, id)).limit(1);

  if (!r[0]) { console.log(`❌ Recette #${id} introuvable`); process.exit(0); }
  const rec = r[0];
  const ing = Array.isArray(rec.ingredients) ? rec.ingredients : [];
  const ins = Array.isArray(rec.instructions) ? rec.instructions : [];
  console.log(`Status: ${rec.status} | Title: ${rec.title}`);
  console.log(`Ingredients: ${ing.length} | Instructions: ${ins.length}`);

  console.log(`\n--- Workflow Log ---`);
  const log = rec.workflowLog as any[];
  if (log) for (const l of log) console.log(`  [${l.agent}] ${l.status}: ${l.message}`);
}
main();
