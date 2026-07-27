import dotenv from "dotenv"; import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
async function main() {
  const { db } = await import("../lib/db"); const { recipes } = await import("../lib/db/schema"); const { eq } = await import("drizzle-orm");
  const r = await db.select({ id: recipes.id, status: recipes.status, title: recipes.title, workflowLog: recipes.workflowLog }).from(recipes).where(eq(recipes.id, 79)).limit(1);
  if (!r[0]) { console.log("❌ Introuvable"); process.exit(0); }
  console.log(`Status: ${r[0].status} | Title: ${r[0].title}`);
  console.log(`Workflow log:`); (r[0].workflowLog||[]).forEach((l:any)=>console.log(`  [${l.agent}] ${l.status}: ${l.message}`));
}
main();
