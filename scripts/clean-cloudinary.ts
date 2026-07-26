/**
 * Script de nettoyage du stockage Cloudinary — supprime toutes les images.
 * Usage: npx tsx scripts/clean-cloudinary.ts
 */
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

async function listAll(): Promise<{ public_id: string; format: string; bytes: number; created_at: string }[]> {
  const all: { public_id: string; format: string; bytes: number; created_at: string }[] = []
  let nextCursor: string | undefined = undefined
  let pages = 0

  do {
    const result = await cloudinary.api.resources({
      type: "upload",
      max_results: 500,
      next_cursor: nextCursor,
    })
    for (const r of result.resources) {
      all.push({
        public_id: r.public_id,
        format: r.format as string,
        bytes: r.bytes as number,
        created_at: r.created_at as string,
      })
    }
    nextCursor = result.next_cursor
    pages++
  } while (nextCursor && pages < 20)

  return all
}

async function main() {
  console.log("\n🔍 Cloudinary — listing des ressources...")
  const resources = await listAll()

  if (resources.length === 0) {
    console.log("✅ Cloudinary déjà propre — aucune image trouvée.\n")
    process.exit(0)
  }

  const totalMB = resources.reduce((s, r) => s + r.bytes, 0) / (1024 * 1024)
  console.log(`\n📋 ${resources.length} images trouvées (${totalMB.toFixed(1)} MB) :`)
  for (const r of resources) {
    console.log(`   🖼️  ${r.public_id}.${r.format}  —  ${(r.bytes / 1024).toFixed(1)} KB  —  ${r.created_at}`)
  }

  console.log(`\n⚠️  Suppression de ${resources.length} images...`)
  let deleted = 0
  let failed = 0

  // Cloudinary allows deleting up to 100 resources per call
  const batchSize = 100
  for (let i = 0; i < resources.length; i += batchSize) {
    const batch = resources.slice(i, i + batchSize)
    try {
      const publicIds = batch.map((r) => r.public_id)
      const result = await cloudinary.api.delete_resources(publicIds, { type: "upload" })
      const ok = Object.values(result.deleted ?? {}).filter((s: unknown) => s === "deleted").length
      deleted += ok
      console.log(`   ✅ Lot ${Math.floor(i / batchSize) + 1}: ${ok}/${batch.length} supprimées`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`   ❌ Lot ${Math.floor(i / batchSize) + 1}: ${msg}`)
      failed += batch.length
    }
  }

  // Also clean up any derived/transformed versions and folders
  console.log("\n🧹 Nettoyage des dossiers vides et ressources résiduelles...")
  const folders = (await cloudinary.api.sub_folders("")).folders ?? []
  for (const f of folders) {
    try {
      await cloudinary.api.delete_folder(f.path)
      console.log(`   📁 ${f.path} — supprimé`)
    } catch {
      // folder might not be empty — try deleting resources inside first
      console.log(`   ⏭️  ${f.path} — non vide ou inexistant (skip)`)
    }
  }

  console.log(`\n✅ ${deleted} images supprimées.${failed > 0 ? ` ${failed} échecs.` : ""} Cloudinary propre.\n`)
  process.exit(0)
}

main()
