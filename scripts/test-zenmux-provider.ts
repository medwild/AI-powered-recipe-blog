// scripts/test-zenmux-provider.ts
// Test ZenMux through our actual provider.ts with structured output
// Usage: LLM_PROVIDER=anthropic npx tsx scripts/test-zenmux-provider.ts

import "dotenv/config"
import { runWithStructuredOutput, getProvider, AnthropicProvider } from "../lib/agents/provider"

// Minimal Zod schema for testing
const TEST_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    answer: { type: "string" },
    temperature_f: { type: "number" },
    temperature_c: { type: "number" },
  },
  required: ["title", "answer", "temperature_f", "temperature_c"],
  additionalProperties: false,
}

async function main() {
  const provider = getProvider()
  console.log(`Provider: ${provider.constructor.name}`)
  console.log(`Model: ${process.env.ANTHROPIC_MODEL || "default"}`)
  console.log(`Base URL: ${process.env.ANTHROPIC_BASE_URL || "api.anthropic.com"}`)
  console.log(`API Key: ${process.env.ANTHROPIC_API_KEY ? "SET" : process.env.ANTHROPIC_AUTH_TOKEN ? "SET (AUTH_TOKEN)" : "MISSING"}`)

  if (!(provider instanceof AnthropicProvider)) {
    console.log("⚠️  Not using AnthropicProvider — test skipped")
    return
  }

  console.log("\n--- Testing runWithStructuredOutput ---")
  try {
    const result = await runWithStructuredOutput<{
      title: string
      answer: string
      temperature_f: number
      temperature_c: number
    }>(
      "You are a chef. Answer food safety questions accurately.",
      "What is the safe internal temperature for chicken? Return JSON with title, answer, temperature_f, temperature_c.",
      TEST_SCHEMA,
      { model: "anthropic/claude-sonnet-5", maxTokens: 500, timeout: 60_000 },
    )

    console.log("✅ Structured output works through provider!")
    console.log(`   Title: ${result.title}`)
    console.log(`   Answer: ${result.answer}`)
    console.log(`   Temp: ${result.temperature_f}°F / ${result.temperature_c}°C`)
  } catch (err) {
    console.log(`❌ Error: ${(err as Error).message.substring(0, 300)}`)
  }
}

main().catch(console.error)
