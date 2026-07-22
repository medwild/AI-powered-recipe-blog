// Minimal direct test — ZenMux Sonnet 5, no structured output, no dotenv
// Usage: npx tsx scripts/test-zenmux-direct.ts

const ZENMUX_KEY = "sk-ai-v1-176d6c933efab5c9787ed26ca8b1d5b73f588508841271db4c5faec943d63cba"
const BASE_URL = "https://zenmux.ai/api/anthropic/v1/messages"
const MODEL = "anthropic/claude-opus-4.8"

async function main() {
  console.log(`Testing ZenMux direct connection...`)
  console.log(`URL: ${BASE_URL}`)
  console.log(`Model: ${MODEL}`)
  console.log(`Key: ${ZENMUX_KEY.substring(0, 15)}...`)

  const body = {
    model: MODEL,
    max_tokens: 100,
    system: "You are a chef. Answer briefly.",
    messages: [{ role: "user", content: "What temp for chicken? One sentence." }],
  }

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": ZENMUX_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })

    const text = await res.text()
    console.log(`Status: ${res.status}`)

    if (res.ok) {
      const data = JSON.parse(text)
      const content = data?.content?.[0]?.text || JSON.stringify(data).substring(0, 200)
      console.log(`✅ SUCCESS — Response: ${content}`)
    } else {
      console.log(`❌ FAILED — ${text.substring(0, 500)}`)
    }
  } catch (err) {
    console.log(`❌ NETWORK ERROR: ${(err as Error).message}`)
  }
}

main()
