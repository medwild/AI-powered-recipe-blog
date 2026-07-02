/**
 * Test runner for content-gap-strategist skill evaluation.
 * Usage: npx tsx scripts/test-content-gap-strategist.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"

// Dynamic import to ensure env vars are loaded before module evaluation
let runText: typeof import("../lib/agents/nararouter").runText

const WORKSPACE = "content-gap-strategist-workspace/iteration-1"

async function runEval(evalDir: string) {
  const metaPath = join(WORKSPACE, evalDir, "eval_metadata.json")
  const meta = JSON.parse(readFileSync(metaPath, "utf-8"))
  const skillContent = readFileSync("skills/content-gap-strategist.md", "utf-8")

  console.log(`\n=== Running: ${meta.eval_name} ===`)
  console.log(`  Spokes: ${meta.input.spokes.length}, Competitors: ${meta.input.competitors.length}`)
  console.log(`  Skill: ${skillContent.length} chars, Input: ${JSON.stringify(meta.input).length} chars`)

  const systemPrompt = skillContent
  const userPrompt = JSON.stringify(meta.input, null, 2)

  try {
    const rawOutput = await runText(
      systemPrompt,
      `Analyze this cluster and produce a prioritized batch plan:\n\n${userPrompt}`,
      { temperature: 0.2, maxTokens: 2048 }
    )

    console.log(`  Output length: ${rawOutput.length} chars`)
    console.log(`  First 300 chars:\n${rawOutput.substring(0, 300)}`)

    // Try to parse JSON from output
    let jsonOutput: unknown
    let isValidJson = false
    try {
      const cleaned = rawOutput
        .replace(/^```json\s*\n?/gm, "")
        .replace(/^```\s*\n?/gm, "")
        .trim()
      jsonOutput = JSON.parse(cleaned)
      isValidJson = true
    } catch {
      jsonOutput = { raw: rawOutput, error: "Failed to parse JSON" }
    }

    // Save output
    const outputDir = join(WORKSPACE, evalDir, "with_skill", "outputs")
    mkdirSync(outputDir, { recursive: true })
    writeFileSync(join(outputDir, "raw_output.txt"), rawOutput)
    writeFileSync(join(outputDir, "parsed_output.json"), JSON.stringify(jsonOutput, null, 2))

    // Quick validation
    const checks: string[] = []
    if (isValidJson) {
      const plan = jsonOutput as Record<string, unknown>
      if (plan.batchPlan && Array.isArray(plan.batchPlan)) {
        checks.push(`✅ batchPlan: ${plan.batchPlan.length} items`)
        for (let i = 0; i < Math.min(3, plan.batchPlan.length); i++) {
          const item = plan.batchPlan[i] as Record<string,unknown>
          checks.push(`  #${item.rank}: ${item.keyword} [${item.priority}]`)
        }
      } else {
        checks.push("❌ No batchPlan array found")
      }
      if (plan.excludedSpokes && Array.isArray(plan.excludedSpokes)) {
        checks.push(`✅ excludedSpokes: ${plan.excludedSpokes.length} items`)
        plan.excludedSpokes.forEach((e: Record<string,unknown>) => {
          checks.push(`  ✕ ${e.keyword}: ${e.reason}`)
        })
      }
      if (plan.strategyNote) {
        checks.push(`✅ strategyNote: ${plan.strategyNote}`)
      }
      if (plan.batchCoherenceScore != null) {
        checks.push(`✅ batchCoherenceScore: ${plan.batchCoherenceScore}`)
      }
    }

    console.log(checks.join("\n"))
    writeFileSync(join(outputDir, "validation.txt"), checks.join("\n"))

    return { evalDir, isValidJson, checks, output: jsonOutput }
  } catch (err) {
    console.error(`❌ Error: ${(err as Error).message}`)
    return { evalDir, error: (err as Error).message }
  }
}

async function main() {
  console.log("=== Content Gap Strategist — Skill Evaluation ===\n")

  // Load runText dynamically after env config
  const mod = await import("../lib/agents/nararouter")
  runText = mod.runText

  const results = []
  for (const dir of ["eval-2-saturated-cluster"]) {
    const result = await runEval(dir)
    results.push(result)
    if (results.length < 3) {
      console.log("\n⏳ Cooldown 5s...")
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  console.log("\n=== Summary ===")
  for (const r of results) {
    const status = r.isValidJson ? "✅ Valid JSON" : "❌"
    console.log(`${r.evalDir}: ${status}${r.error ? ` — ${r.error}` : ""}`)
  }
}

main().catch(console.error)
