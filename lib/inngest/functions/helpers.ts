/**
 * Shared helpers extracted from generate-recipe.ts.
 * Used by step modules and the orchestrator.
 */

import { db } from "@/lib/db"
import { recipes, type WorkflowLogEntry } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import type { AuditReport } from "./agents/auditor"
import type { QAReport } from "./agents/qa"

// ── Logging ──────────────────────────────────────────────────────────────────

export async function appendLog(recipeId: number, entry: WorkflowLogEntry) {
  await db
    .update(recipes)
    .set({
      workflowLog: sql`COALESCE(workflow_log, '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, recipeId))
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

// ── Synthetic Fallbacks ──────────────────────────────────────────────────────

const SYNTHETIC_CRITERION_NAMES = [
  "EXPERIENCE — First-Hand Familiarity",
  "EXPERTISE — Depth & Accuracy",
  "AUTHORITATIVENESS — Source Quality & Citations",
  "TRUSTWORTHINESS — Verifiability & Accuracy",
  "SEO / GEO OPTIMIZATION",
  "READABILITY & STRUCTURE",
  "ANTI-AI-SLOP DETECTION",
  "VOICE CONSISTENCY — ADAPTIVE v5.1",
]

export function buildSyntheticAuditReport(): AuditReport {
  return {
    overallScore: 0,
    verdict: "NEEDS REVISION",
    score_ia_estimation: 80,
    factual_corrections: [],
    summary: "CRITICAL: Auditor agent unavailable — content was NOT quality-checked. Manual review required before publication.",
    criteria: [
      ...SYNTHETIC_CRITERION_NAMES.map((name) => ({
        name,
        score: 0,
        issues: ["Auditor unavailable — no automated quality check was performed"],
        recommendation: "Manual review required — all criteria bypassed due to agent failure",
      })),
      {
        name: "CRITICAL: Auditor Unavailable",
        score: 0,
        issues: ["The Auditor agent failed to execute. This recipe has NOT been checked for food safety, factual accuracy, banned vocabulary, or E-E-A-T signals."],
        recommendation: "Do NOT publish without manual human review of all content, especially temperatures, ingredient ratios, and food safety claims.",
      },
    ],
  }
}

export function buildSyntheticQAReport(): QAReport {
  return {
    qaScore: 0,
    verdict: "CRITICAL",
    summary: "CRITICAL: QA agent unavailable — cross-agent verification was NOT performed. Recipe requires manual verification before publication.",
    checks: [],
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

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_EDITOR_PASSES = 3
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
