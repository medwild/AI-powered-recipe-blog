import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { db } = await import("../lib/db");
  const { recipes } = await import("../lib/db/schema");
  const { sql } = await import("drizzle-orm");

  // Find recipes that have workflow logs mentioning "Gemini"
  const all = await db.select({
    id: recipes.id, title: recipes.title, status: recipes.status,
    workflowLog: recipes.workflowLog,
  }).from(recipes).orderBy(recipes.id);

  console.log(`Total recipes in DB: ${all.length}\n`);
  for (const r of all) {
    const log = r.workflowLog as any[];
    const logStr = JSON.stringify(log ?? []);
    const provider = logStr.includes("Gemini") ? "Gemini"
      : logStr.includes("Opus") ? "Opus"
      : logStr.includes("MegaSkill") ? "MegaSkill (unknown model)"
      : "unknown";
    const steps = log?.length ?? 0;
    console.log(`#${r.id} [${r.status}] ${provider} | ${steps} log entries | ${r.title}`);
  }
}
main();
