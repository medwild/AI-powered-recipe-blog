import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { RECIPE_JSON_SCHEMA } from "../lib/pipeline/agents/chef-augustin"
import { loadSkillContent } from "../lib/skills"

const KEY = process.env.GEMINI_API_KEY ?? ""
const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview"

async function main() {
  const systemPrompt = await loadSkillContent("chef-augustin-mega", {
    cuisine: "Test",
    cuisine_ingredients: "chicken",
    cuisine_techniques: "searing",
  })
  const userPrompt = `KEYWORD: Test Recipe\nGenerate a test recipe.`

  console.log(`Model: ${MODEL}`)
  console.log(`System prompt: ${systemPrompt.length} chars`)
  console.log(`Schema keys: ${Object.keys(RECIPE_JSON_SCHEMA?.properties ?? {}).join(", ")}`)

  // Test 1: Simple prompt, no schema
  console.log("\n--- Test 1: Simple prompt (no schema) ---")
  const r1 = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Say hello in French." }] }],
        generationConfig: { maxOutputTokens: 20 },
      })},
  )
  console.log(`Status: ${r1.status}`)

  // Test 2: With schema
  console.log("\n--- Test 2: With responseSchema ---")
  const r2 = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Output JSON only." }] },
        contents: [{ role: "user", parts: [{ text: "Generate { name: string, age: number }" }] }],
        generationConfig: {
          maxOutputTokens: 50,
          responseMimeType: "application/json",
          responseSchema: { type: "object", properties: { name: { type: "string" }, age: { type: "number" } } },
        },
      })},
  )
  const t2 = await r2.text()
  console.log(`Status: ${r2.status} | ${t2.substring(0, 400)}`)

  // Test 3: Full recipe schema
  console.log("\n--- Test 3: Full recipe schema ---")
  const r3 = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt.substring(0, 2000) }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: 500,
          responseMimeType: "application/json",
          responseSchema: RECIPE_JSON_SCHEMA,
        },
      })},
  )
  const t3 = await r3.text()
  console.log(`Status: ${r3.status}`)
  if (!r3.ok) console.log(t3.substring(0, 600))
  else console.log(`✅ Schema accepted! Output: ${t3.substring(0, 300)}`)
}

main().catch(console.error)
