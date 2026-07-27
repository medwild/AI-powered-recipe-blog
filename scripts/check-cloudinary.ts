import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { v2 as c } from "cloudinary"
c.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME!, api_key: process.env.CLOUDINARY_API_KEY!, api_secret: process.env.CLOUDINARY_API_SECRET! })
async function main() {
  const { total_count } = await c.api.resources({ type: "upload", max_results: 10 })
  const roots = await c.api.root_folders()
  console.log(`Images restantes: ${total_count} | Dossiers: ${(roots as any).folders?.map((f: any) => f.name).join(", ") || "aucun"}`)
  process.exit(0)
}
main()
