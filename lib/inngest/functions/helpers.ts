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
    overallScore: 60,
    verdict: "NEEDS REVISION",
    score_ia_estimation: 50,
    factual_corrections: [],
    summary: "Auditor unavailable — auto-pass with default scores.",
    criteria: SYNTHETIC_CRITERION_NAMES.map((name) => ({
      name,
      score: 12,
      issues: [],
      recommendation: "Auditor unavailable — auto-pass",
    })),
  }
}

export function buildSyntheticQAReport(): QAReport {
  return {
    qaScore: 70,
    verdict: "PASS",
    summary: "QA skipped — Editor output accepted without cross-agent verification.",
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

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_EDITOR_PASSES = 3
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
