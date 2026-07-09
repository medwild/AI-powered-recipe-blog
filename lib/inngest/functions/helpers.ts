/**
 * Shared helpers extracted from generate-recipe.ts.
 * Used by step modules and the orchestrator.
 */

import { db } from "@/lib/db"
import { recipes, type WorkflowLogEntry } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

// ── Logging ──────────────────────────────────────────────────────────────────

export async function appendLog(recipeId: number, entry: WorkflowLogEntry) {
  try {
    await db
      .update(recipes)
      .set({
        workflowLog: sql`COALESCE(workflow_log, '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, recipeId))
  } catch (err) {
    // Log failure must not crash the pipeline step.
    // If the DB is temporarily unavailable, we lose the log entry
    // but the business logic (LLM call, content processing) is preserved.
    console.error(`[appendLog] DB write failed for recipe ${recipeId}: ${(err as Error).message}`)
  }
}

export function logEntry(
  agent: string,
  status: WorkflowLogEntry["status"],
  message: string,
): WorkflowLogEntry {
  return { agent, status, message, at: new Date().toISOString() }
}

// ── Synthetic PAA ────────────────────────────────────────────────────────────

export function generateSyntheticPAA(keyword: string): string[] {
  const q = keyword.trim()
  const lc = q.charAt(0).toLowerCase() + q.slice(1)
  return [
    `How to make ${lc}?`,
    `What ingredients are needed for ${lc}?`,
    `Is ${lc} healthy?`,
    `Can you freeze ${lc}?`,
    `How long does ${lc} last in the fridge?`,
    `What to serve with ${lc}?`,
    `Common mistakes when making ${lc}?`,
    `How to store ${lc} properly?`,
  ]
}

// ── Error Classification ─────────────────────────────────────────────────────

export function isRecoverableError(err: Error): boolean {
  const msg = err.message
  return (
    msg.includes("No JSON object") ||
    msg.includes("Failed to parse JSON") ||
    msg.includes("aborted") ||
    msg.includes("returned no response") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("403") ||
    msg.includes("408") ||
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  )
}

// ── Retry Escalation ──────────────────────────────────────────────────────────

export type RetryEscalationResult<T> = {
  result: T
  degraded: boolean
  attemptsUsed: number
  finalError: string | null
}

/**
 * Retries a function with exponential backoff and a final fallback value.
 * Complements (does NOT replace) the LLM-level retry in nararouter.ts.
 *
 * Escalation strategy:
 *   1. Primary attempt
 *   2. Retry after 2s delay (transient issues)
 *   3. Retry after 5s delay (intermittent capacity issues)
 *   4. Return fallback value with degraded=true
 *
 * Use for agent calls where the LLM is completely down vs. a transient
 * JSON parse failure. The LLM-level retry handles transient failures fast;
 * this escalation handles systemic failures at the agent level.
 */
export async function withRetryEscalation<T>(
  fn: () => Promise<T>,
  fallbackValue: () => T,
  agentName: string,
  maxRetries = 3,
): Promise<RetryEscalationResult<T>> {
  let lastError: string | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return { result: await fn(), degraded: false, attemptsUsed: attempt, finalError: null }
    } catch (err) {
      lastError = (err as Error).message
      console.warn(`[Retry] ${agentName} attempt ${attempt}/${maxRetries} failed: ${lastError.substring(0, 200)}`)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10_000)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  return {
    result: fallbackValue(),
    degraded: true,
    attemptsUsed: maxRetries,
    finalError: lastError,
  }
}

export function buildFallbackImagePrompt(title: string, tags: string[]): string {
  const dish = title || "the dish"
  const cuisine = tags[1] || tags[0] || ""
  const cuisineSuffix = cuisine ? `, ${cuisine} cuisine` : ""
  return [
    `Professional food photography of ${dish}${cuisineSuffix}.`,
    "Overhead shot on rustic wooden table, natural window light,",
    "styled with fresh herbs and ingredients.",
    "4K, shallow depth of field, warm color grading.",
  ].join(" ")
}

// ── HTML Comment Sanitization ──────────────────────────────────────────────────

/**
 * Strips ALL HTML comments from contentMarkdown.
 * Fix: Writer v6.x occasionally leaks internal "vibe coding tokens"
 * (<!--WARM-->, <!--SHARP-->, <!--WINK-->, <!--GRIT-->, <!--GLOW-->) despite
 * skill instructions to purge them. This deterministic filter guarantees they
 * never reach the final article.
 */
export function stripHtmlComments(text: string): string {
  // Strip both multi-line (<!-- ... -->) and single-line variants
  return text.replace(/<!--[\s\S]*?-->/g, "")
}

/**
 * Strips bracket-style vibe coding tokens that escape stripHtmlComments.
 * The Writer skill instructs deletion of [WARM], [SHARP], [WINK], [GRIT],
 * [GLOW] before output, but the LLM sometimes leaks them. These bracket
 * tokens are NOT caught by stripHtmlComments() (which only handles <!-- -->).
 *
 * Fix: Deterministic regex strip applied at Writer, Editor, and persist-phase.
 */
const BRACKET_TOKENS = ["WARM", "SHARP", "WINK", "GRIT", "GLOW"]
const BRACKET_TOKEN_RE = new RegExp(`\\[(${BRACKET_TOKENS.join("|")})\\]`, "gi")

export function stripBracketTokens(text: string): string {
  return text.replace(BRACKET_TOKEN_RE, "")
}

// ── Agent Boundary Tracing ───────────────────────────────────────────────────

/**
 * Logs agent boundary trace (input/output sizes) as structured console output.
 * grep-friendly `[trace]` prefix for production monitoring.
 */
export function logAgentTrace(
  agentName: string,
  phase: "input" | "output",
  data: { chars?: number; fields?: number },
) {
  const parts: string[] = [`[trace] ${agentName} ${phase}`]
  if (data.chars) parts.push(`${data.chars} chars`)
  if (data.fields) parts.push(`${data.fields} fields`)
  console.log(parts.join(" — "))
}

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_EDITOR_PASSES = 3
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
