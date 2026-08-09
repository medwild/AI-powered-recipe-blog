// One-shot: upload 21 collection images → Cloudinary, write slug→URL mapping.
import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

import { uploadImage } from "@/lib/agents/cloudinary"

async function main() {
  const DIR = path.join(process.cwd(), "public")
  const files = fs.readdirSync(DIR).filter(f => /\.jpe?g$/.test(f) && !f.startsWith("placeholder"))
  console.log("Fichiers jpeg trouvés:", files.length)

  const mapping: Record<string, string> = {}
  let ok = 0, fail = 0
  for (const f of files) {
    const slug = path.basename(f, path.extname(f))
    try {
      const buffer = fs.readFileSync(path.join(DIR, f))
      const url = await uploadImage(buffer, `collections/${slug}`)
      mapping[slug] = url
      ok++
      console.log(`OK ${slug}`)
    } catch (e) {
      fail++
      console.error(`FAIL ${slug}: ${(e as Error).message}`)
    }
  }

  fs.writeFileSync(
    path.join(process.cwd(), "public/images/collections/urls.json"),
    JSON.stringify(mapping, null, 2),
  )
  console.log(`\nTerminé: ${ok} OK, ${fail} échecs → urls.json`)
}

main().catch((e) => { console.error(e); process.exit(1) })
