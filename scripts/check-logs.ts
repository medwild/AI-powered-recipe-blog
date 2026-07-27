import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { db } = await import("../lib/db");
  const { pipelineLogs } = await import("../lib/db/schema");
  const { eq, desc } = await import("drizzle-orm");

  const logs = await db.select({
    step: pipelineLogs.step, status: pipelineLogs.status, message: pipelineLogs.message, createdAt: pipelineLogs.createdAt,
  }).from(pipelineLogs).where(eq(pipelineLogs.recipeId, 71)).orderBy(pipelineLogs.createdAt).limit(20);

  if (logs.length === 0) { console.log("❌ Aucun log pour #71"); process.exit(0); }
  for (const l of logs) {
    console.log(`[${l.step}] ${l.status}: ${l.message}`);
  }
}

main();
