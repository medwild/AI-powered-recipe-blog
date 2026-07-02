/**
 * Unit tests for deterministic helpers.
 * Usage: npx tsx scripts/test-helpers.ts
 */

import { generateSyntheticPAA, isRecoverableError, buildFallbackImagePrompt, buildSyntheticAuditReport, buildSyntheticQAReport } from "../lib/inngest/functions/helpers"
import { slugify } from "../lib/slug"

let passed = 0, failed = 0
function assert(c: boolean, n: string) { c ? passed++ : failed++; console.log(`  ${c ? "✅" : "❌"} ${n}`) }

console.log("=== Helpers Unit Tests ===\n")

// ── generateSyntheticPAA ─────────────────────────────────────────────────────
console.log("generateSyntheticPAA()")
const paa = generateSyntheticPAA("banana bread")
assert(paa.length === 8, "generates 8 questions")
assert(paa[0] === "How to make banana bread?", "first question template")
assert(paa[3] === "Can you freeze banana bread?", "freezing question")
assert(paa.every(q => q.includes("banana bread")), "all questions contain keyword")
assert(paa.every(q => q.endsWith("?")), "all questions end with ?")

// ── isRecoverableError ───────────────────────────────────────────────────────
console.log("\nisRecoverableError()")
assert(isRecoverableError(new Error("No JSON object found")), "JSON parse error → recoverable")
assert(isRecoverableError(new Error("Request timed out")), "timeout → recoverable")
assert(isRecoverableError(new Error("HTTP 429")), "rate limit → recoverable")
assert(isRecoverableError(new Error("HTTP 503")), "server error → recoverable")
assert(isRecoverableError(new Error("aborted")), "aborted → recoverable")
assert(!isRecoverableError(new Error("Invalid API key")), "auth error → not recoverable")
assert(!isRecoverableError(new Error("Schema validation failed")), "validation error → not recoverable")

// ── buildFallbackImagePrompt ─────────────────────────────────────────────────
console.log("\nbuildFallbackImagePrompt()")
const prompt = buildFallbackImagePrompt("Swedish Meatballs", ["main course", "Swedish"])
assert(prompt.includes("Swedish Meatballs"), "includes dish name")
assert(prompt.includes("Swedish cuisine"), "includes cuisine tag")
assert(prompt.toLowerCase().includes("overhead"), "includes composition direction")
assert(prompt.includes("4K"), "includes quality spec")
const noTag = buildFallbackImagePrompt("Test", [])
assert(!noTag.includes("undefined"), "no undefined in output")

// ── buildSyntheticAuditReport ────────────────────────────────────────────────
console.log("\nbuildSyntheticAuditReport()")
const audit = buildSyntheticAuditReport()
assert(audit.verdict === "NEEDS REVISION", "synthetic audit → NEEDS_REVISION")
assert(audit.overallScore === 60, "synthetic audit score = 60")
assert(audit.score_ia_estimation === 50, "AI score = 50")
assert(audit.criteria.length === 8, "8 criteria")
assert(audit.criteria.every(c => c.score === 12), "all criteria = 12")

// ── buildSyntheticQAReport ───────────────────────────────────────────────────
console.log("\nbuildSyntheticQAReport()")
const qa = buildSyntheticQAReport()
assert(qa.verdict === "PASS", "synthetic QA → PASS")
assert(qa.qaScore === 70, "QA score = 70")
assert(qa.checks.length === 0, "no checks")

// ── slugify ──────────────────────────────────────────────────────────────────
console.log("\nslugify()")
assert(slugify("Swedish Meatballs Recipe") === "swedish-meatballs-recipe", "basic slug")
assert(slugify("Café au Lait") === "cafe-au-lait", "accents removed")
assert(slugify("What's For Dinner?") === "what-s-for-dinner", "special chars → dashes")
assert(slugify("  Extra   Spaces  ") === "extra-spaces", "trimmed + collapsed spaces")
assert(slugify("---dashes---") === "dashes", "leading/trailing dashes trimmed")

// ── Summary ──────────────────────────────────────────────────────────────────
const total = passed + failed
console.log(`\n${"═".repeat(50)}`)
console.log(`Results: ${passed}/${total} passed (${Math.round(passed/total*100)}%)`)
if (failed > 0) { console.log(`❌ ${failed} FAILED`); process.exit(1) }
else console.log("✅ All tests passed")
