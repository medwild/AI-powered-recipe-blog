// Test which Cloudflare models are available on the Free plan.
// Usage: npx tsx scripts/_test-models.ts
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? ""
const TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? ""
if (!ACCOUNT_ID || !TOKEN) { console.error("Set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN"); process.exit(1) }

const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/v1/chat/completions`

const MODELS = [
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/qwen/qwq-32b",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/openai/gpt-oss-20b",
  "@cf/openai/gpt-oss-120b",
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/nvidia/nemotron-3-120b-a12b",
  "@cf/moonshotai/kimi-k2.6",
  "@cf/zai-org/glm-4.7-flash",
  "@cf/zai-org/glm-5.2",
  "@cf/google/gemma-3-12b-it",
]

async function testModel(model: string): Promise<{ ok: boolean; tokens: number; error: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Say 'hello' and nothing else." }],
        max_tokens: 20,
      }),
      signal: controller.signal,
    })
    const data = await res.json() as any
    if (!res.ok) {
      const msg = data?.errors?.[0]?.message ?? JSON.stringify(data).substring(0, 150)
      return { ok: false, tokens: 0, error: msg }
    }
    const out = data?.choices?.[0]?.message?.content ?? ""
    const tokens = data?.usage?.completion_tokens ?? 0
    return { ok: true, tokens, error: "" }
  } catch (err) {
    return { ok: false, tokens: 0, error: (err as Error).message }
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  console.log("Testing Cloudflare models (Free plan compatibility)...\n")

  for (const model of MODELS) {
    process.stdout.write(`  ${model.padEnd(55)} `)
    const r = await testModel(model)
    if (r.ok) {
      console.log(`✅ FREE (${r.tokens} tokens)`)
    } else {
      const paid = r.error.includes("Paid") || r.error.includes("paid") || r.error.includes("PRO")
      console.log(`${paid ? "💲 PAID" : "❌ FAIL"} — ${r.error.substring(0, 80)}`)
    }
  }

  console.log("\nDone.")
}

main().catch(console.error)
