// Smoke test: Ideogram image generation + Cloudinary upload
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  console.log("🔬 Image Pipeline Smoke Test\n")

  // Step 1: Check config
  const ideogramKey = process.env.IDEOGRAM_API_KEY
  const cloudinaryCloud = process.env.CLOUDINARY_CLOUD_NAME
  console.log(`Ideogram API key: ${ideogramKey ? "✅ set" : "❌ missing"}`)
  console.log(`Cloudinary: ${cloudinaryCloud ? `✅ ${cloudinaryCloud}` : "❌ missing"}`)
  if (!ideogramKey || !cloudinaryCloud) { console.log("\n❌ Missing config. Aborting."); process.exit(1) }

  // Step 2: Generate image via Ideogram
  const { runImage } = await import("../lib/agents/ideogram")
  const prompt = "Pan-seared chicken parmesan with golden crispy crust, melted mozzarella bubbling, fresh basil garnish, rustic ceramic plate, natural window light 3500K from left, shallow depth of field, food photography, 1000x1500 portrait"

  console.log(`\n📸 Generating image...`)
  console.log(`   Prompt: ${prompt.substring(0, 100)}...`)
  const t0 = Date.now()

  let buffer: Buffer
  try {
    buffer = await runImage(prompt)
    console.log(`   ✅ Generated in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${(buffer.length / 1024).toFixed(1)} KB`)
  } catch (err) {
    console.log(`   ❌ Failed: ${(err as Error).message}`)
    process.exit(1)
  }

  // Step 3: Upload to Cloudinary
  const { uploadImage } = await import("../lib/agents/cloudinary")
  console.log(`\n☁️  Uploading to Cloudinary...`)
  const t1 = Date.now()

  let url: string
  try {
    url = await uploadImage(buffer, "test-chicken-parmesan")
    console.log(`   ✅ Uploaded in ${((Date.now() - t1) / 1000).toFixed(1)}s`)
    console.log(`   URL: ${url}`)
  } catch (err) {
    console.log(`   ❌ Failed: ${(err as Error).message}`)
    process.exit(1)
  }

  console.log(`\n✅ Image pipeline works — ${url}`)
}

main().catch(console.error)
