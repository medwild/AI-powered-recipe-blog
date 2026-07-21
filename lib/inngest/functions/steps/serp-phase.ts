// Step 1 — SERP Analysis (v14: minimal cleanup, no LLM)
//
// Fetches Google SERP via Serper, extracts titles + snippets top 10,
// PAA questions, and related searches. Formats as plain text for the
// mega-skill user prompt. No structuring, no matching — the LLM does that.

import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchSerp } from "@/lib/agents/serp";
import { logPipelineError } from "@/lib/queries";
import { appendLog, logEntry, generateSyntheticPAA, isRecoverableError } from "../helpers";

export interface SerpPhaseResult {
  serpText: string;
  degraded: boolean;
}

function formatSerpForPrompt(raw: Awaited<ReturnType<typeof fetchSerp>>): string {
  const lines: string[] = [];

  // Top organic results
  lines.push(`Top ${raw.organic.length} Google results:`);
  for (const r of raw.organic.slice(0, 10)) {
    lines.push(`- ${r.title}${r.snippet ? ` | ${r.snippet}` : ""}`);
  }

  // PAA questions
  if (raw.relatedQuestions?.length) {
    lines.push(`\nPeople Also Ask:`);
    for (const q of raw.relatedQuestions.slice(0, 10)) {
      lines.push(`- ${q.question}${q.snippet ? ` → ${q.snippet}` : ""}`);
    }
  }

  // Related searches
  if (raw.relatedSearches?.length) {
    lines.push(`\nRelated Searches: ${raw.relatedSearches.join(", ")}`);
  }

  return lines.join("\n");
}

export async function runSerpPhase(
  step: {
    run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
    sleep: (name: string, dur: string) => Promise<void>;
  },
  recipeId: number,
  keyword: string,
): Promise<SerpPhaseResult> {
  let degraded = false;
  let serpText = "";

  try {
    const raw = await step.run("analyze-serp", async () => {
      await appendLog(recipeId, logEntry("SERP", "running", `Google analysis for "${keyword}"`));

      const result = await fetchSerp(keyword);

      // PAA fallback
      if (!result.relatedQuestions || result.relatedQuestions.length < 2) {
        const syntheticPAA = generateSyntheticPAA(keyword);
        result.relatedQuestions = syntheticPAA.map((q) => ({
          question: q,
          snippet: undefined,
          sourceUrl: undefined,
        }));
        await appendLog(recipeId, logEntry("SERP", "error",
          `No PAA questions — using ${syntheticPAA.length} synthetic fallbacks`));
      }

      // Persist raw SERP to DB
      await db
        .update(recipes)
        .set({ serpData: result as unknown as Record<string, unknown> })
        .where(eq(recipes.id, recipeId));

      await appendLog(recipeId, logEntry("SERP", "done",
        `${result.organic.length} organic, ${result.relatedQuestions.length} PAA`));

      return result;
    }) as Awaited<ReturnType<typeof fetchSerp>>;

    serpText = formatSerpForPrompt(raw);
  } catch (err) {
    if (!isRecoverableError(err as Error)) {
      await logPipelineError({
        recipeId,
        stepName: "analyze-serp",
        errorType: "llm_unavailable",
        message: (err as Error).message,
        severity: "critical",
      });
    }
    throw err;
  }

  await step.sleep("sleep-after-serp", "2s");
  return { serpText, degraded };
}
