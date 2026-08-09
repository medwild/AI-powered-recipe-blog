import dotenv from "dotenv"
import path from "path"
import fs from "fs"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { uploadImage } from "@/lib/agents/cloudinary"

async function main() {
  const buf = fs.readFileSync(path.join(process.cwd(), "public/hero-kitchen.png"))
  const url = await uploadImage(buf, "hero-kitchen")
  console.log("URL:", url)
}
main().catch((e) => { console.error(e); process.exit(1) })
