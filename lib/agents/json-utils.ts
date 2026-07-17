/**
 * JSON extraction and repair utilities.
 *
 * Shared by all LLM providers — extracts structured JSON from raw model
 * output (which may contain markdown fences, prose, unescaped control
 * characters, or structural damage from truncated token generation).
 *
 * Uses the jsonrepair library (https://github.com/josdejong/jsonrepair)
 * for robust structural repair — handles truncation, missing commas,
 * unescaped characters, trailing commas, and all common LLM JSON errors.
 */

import { jsonrepair } from "jsonrepair"

/**
 * Attempt to repair a malformed JSON string produced by an LLM.
 *
 * Delegates to the jsonrepair library which handles:
 *   - Truncation (missing closing braces/brackets)
 *   - Unescaped control characters inside string values
 *   - Trailing commas
 *   - Missing commas between elements
 *   - Single quotes instead of double quotes
 *   - Comments (line and block)
 *   - And 30+ other common JSON errors
 *
 * This replaces the previous ~100 lines of custom repair logic which
 * was fragile against DeepSeek's long-output truncation patterns.
 */
function repairJson(badJson: string): string {
  return jsonrepair(badJson)
}

/**
 * Parse a JSON object out of an LLM response that may include prose / fences.
 *
 * The function first attempts a strict parse. On failure (common with LLMs
 * that produce unescaped control characters), it attempts automatic repair
 * before retrying the parse.
 */
export function extractJson<T>(raw: string): T {
  // 1. Extract content potentially wrapped in markdown fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : raw

  // 2. Detect JSON type: array [...] or object {...}
  const isArray = candidate.trimStart().startsWith("[")
  const start = isArray ? candidate.indexOf("[") : candidate.indexOf("{")
  const end = isArray ? candidate.lastIndexOf("]") : candidate.lastIndexOf("}")
  // When the JSON is truncated (model hit max_tokens), the closing brace/bracket
  // may be missing. We can still attempt repair — repairJson() adds missing
  // close delimiters. Only fail when there's NO opening delimiter at all.
  if (start === -1) {
    if (process.env.DEBUG === "true") {
      console.error(
        `[DEBUG extractJson] No JSON found. Raw output (first 2000 chars):\n${raw.substring(0, 2000)}`,
      )
    }
    throw new Error("No JSON found in model output.")
  }

  // Slice from start to end (or to end of string if truncated — repairJson
  // will add missing closing braces/brackets in phase 2d).
  const jsonStr = end === -1
    ? candidate.slice(start)
    : candidate.slice(start, end + 1)

  // 3. Attempt strict parse (skipped if truncated — go straight to repair)
  if (end !== -1) {
    try {
      return JSON.parse(jsonStr) as T
    } catch {
      // falls through to repair below
    }
  }

  // 4. On failure (or truncation), repair then retry
  const repaired = repairJson(jsonStr)
  try {
    return JSON.parse(repaired) as T
  } catch (parseErr) {
    // Log context around the error position for diagnostics
    if (process.env.DEBUG === "true") {
      try {
        const pos = parseInt(((parseErr as Error).message.match(/position (\d+)/) ?? [])[1] ?? "0", 10)
        const ctx = 200
        // Log BOTH before and after repair so we can see what repairJson missed
        console.error(
          `[DEBUG extractJson] Parse error at position ${pos}. Context (BEFORE repair):\n` +
          `  Before: ${JSON.stringify(jsonStr.substring(Math.max(0, pos - ctx), pos))}\n` +
          `  At:     ${JSON.stringify(jsonStr.substring(pos, Math.min(jsonStr.length, pos + ctx)))}`
        )
        console.error(
          `[DEBUG extractJson] Context (AFTER repair):\n` +
          `  Before: ${JSON.stringify(repaired.substring(Math.max(0, pos - ctx), pos))}\n` +
          `  At:     ${JSON.stringify(repaired.substring(pos, Math.min(repaired.length, pos + ctx)))}`
        )
      } catch { /* best-effort */ }
    }
    throw new Error(
      `Failed to parse JSON from model output even after repair: ${(parseErr as Error).message}`,
    )
  }
}
