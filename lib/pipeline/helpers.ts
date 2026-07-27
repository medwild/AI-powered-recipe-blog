/**
 * Shared helpers extracted from generate-recipe.ts.
 * Used by step modules and the orchestrator.
 */

import { db } from "@/lib/db"
import { recipes, type WorkflowLogEntry } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { isRecoverable } from "@/lib/agents/provider"

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
  // Delegates to the canonical isRecoverable in provider.ts (single source of truth).
  return isRecoverable(err?.message ?? "")
}

// ── Fallback Image Prompt ──────────────────────────────────────────────────────

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

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"
