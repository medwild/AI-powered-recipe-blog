/**
 * Script de nettoyage complet de la DB — supprime toutes les recettes.
 * Usage: npx tsx scripts/clean-db.ts
 */
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/lib/db/schema"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function main() {
  const url = process.env.DATABASE_URL?.replace("&channel_binding=require", "") ?? ""
  if (!url) {
    console.error("❌ DATABASE_URL not found")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: url, max: 1 })
  const db = drizzle(pool, { schema })

  // 1. Lister toutes les recettes
  const all = await db
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      status: recipes.status,
      content_type: recipes.content_type,
    })
    .from(recipes)
    .orderBy(recipes.id)

  console.log("\n📋 Recettes actuelles :")
  console.table(all)
  console.log(`Total: ${all.length}`)

  if (all.length === 0) {
    console.log("\n📋 Aucune recette trouvée — nettoyage des tables liées uniquement.")
  } else {
    // Comptage par statut
    const counts: Record<string, number> = {}
    for (const r of all) counts[r.status ?? "unknown"] = (counts[r.status ?? "unknown"] ?? 0) + 1
    console.log(`\n📊 Par statut: ${JSON.stringify(counts)}`)

    // 2. Suppression
    console.log(`\n⚠️  Suppression de ${all.length} recettes...`)
    for (const r of all) {
      await db.delete(recipes).where(eq(recipes.id, r.id))
      console.log(`  🗑️  #${r.id} — ${r.slug} (${r.status})`)
    }
    console.log(`\n✅ ${all.length} recettes supprimées.`)
  }

  // 3. Nettoyer les tables liées
  const tables = [
    { name: "pipeline_errors", fk: "recipe_id" },
    { name: "internal_link_logs", fk: "source_content_id" },
    { name: "pin_analytics", fk: "recipe_id" },
    { name: "pin_drafts", fk: "recipe_id" },
    { name: "image_variant_stats", fk: "recipe_id" },
    { name: "self_improvement_logs", fk: "recipe_id" },
  ]

  console.log("\n🧹 Nettoyage des tables liées...")
  for (const t of tables) {
    try {
      const result = await pool.query(`DELETE FROM "${t.name}"`)
      console.log(`  ✅ ${t.name}: ${result.rowCount ?? 0} lignes`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("does not exist") || msg.includes("undefined")) {
        console.log(`  ⏭️  ${t.name}: table inexistante (skip)`)
      } else {
        console.log(`  ⚠️  ${t.name}: ${msg}`)
      }
    }
  }

  // 4. Reset la sequence recipes (optionnel — évite les IDs qui explosent)
  try {
    await pool.query(`ALTER SEQUENCE recipes_id_seq RESTART WITH 1`)
    console.log("  🔢 Sequence recipes_id_seq → 1")
  } catch {
    // Sequence might not exist or be named differently
  }

  console.log("\n✅ DB complètement propre.")
  await pool.end()
  process.exit(0)
}

main()
