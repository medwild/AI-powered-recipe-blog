import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const KEY = process.env.GEMINI_API_KEY ?? ""
const MODELS = [
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
]

async function test(model: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`
  const body = {
    systemInstruction: { parts: [{ text: "Say hello in French." }] },
    contents: [{ role: "user", parts: [{ text: "Bonjour." }] }],
    generationConfig: { maxOutputTokens: 20 },
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json() as any
  const ok = res.ok
  const msg = ok ? "✅" : `❌ ${data?.error?.message ?? ""}`.substring(0, 90)
  console.log(`  ${model.padEnd(30)} ${msg}`)
}

async function main() {
  console.log("Testing Gemini models...\n")
  for (const m of MODELS) await test(m)
  console.log("\nDone.")
}

main().catch(console.error)
