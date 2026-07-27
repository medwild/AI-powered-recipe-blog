import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { db } = await import("../lib/db");
  const { recipes } = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(recipes).set({ status: "deleted" }).where(eq(recipes.id, 71));
  console.log("✅ Recette #71 → deleted");
}

main();
