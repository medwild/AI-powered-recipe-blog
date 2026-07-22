import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set — check .env.local")
  process.exit(1)
}

async function main() {
  const { db } = await import("../lib/db")
  console.log("Connecting to:", process.env.DATABASE_URL!.substring(0, 60) + "...")
  const r = await db.execute("SELECT 1 as ok")
  console.log("✅ DB OK:", JSON.stringify(r.rows?.[0] ?? r))
}
main()
