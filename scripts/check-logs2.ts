import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { db } = await import("../lib/db");
  const { recipes } = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const r = await db.select({
    id: recipes.id, status: recipes.status,
    workflowLog: recipes.workflowLog,
  }).from(recipes).where(eq(recipes.id, 71)).limit(1);

  if (!r[0]) { console.log("❌ Recette #71 introuvable"); process.exit(0); }
  console.log(`Status: ${r[0].status}`);
  const log = r[0].workflowLog as any[];
  if (!log || log.length === 0) { console.log("Aucun log workflow"); process.exit(0); }
  for (const l of log) {
    console.log(`[${l.agent}] ${l.status}: ${l.message}`);
  }
}

main();
