// lib/loop-state.ts
// Pipeline v11 — STATE.json file management.
//
// Tracks the content generation loop state in a durable JSON file.
// Replaces the previous STATE.md + regex parsing with native JSON
// for reliability and simplicity.
//
// Design: simple file I/O — no database, no API calls. The state file
// is JSON (pretty-printed for human readability).

import * as fs from "fs"
import * as path from "path"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveGeneration {
  recipeId: number
  keyword: string
  pass: number
  maxPasses: number
  score: number
  startedAt: string
}

export interface WaitingForHuman {
  recipeId: number
  keyword: string
  bestScore: number
  passesUsed: number
  reason: string
  blockedAt: string
}

export interface RecentCompletion {
  recipeId: number
  keyword: string
  score: number
  passesUsed: number
  outcome: "published" | "draft" | "degraded"
  completedAt: string
}

export interface LoopState {
  lastRun: string
  activeGenerations: ActiveGeneration[]
  waitingForHuman: WaitingForHuman[]
  recentCompletions: RecentCompletion[]
}

// ---------------------------------------------------------------------------
// File path
// ---------------------------------------------------------------------------

const STATE_FILE = path.resolve(process.cwd(), "STATE.json")

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

function emptyState(): LoopState {
  return {
    lastRun: "",
    activeGenerations: [],
    waitingForHuman: [],
    recentCompletions: [],
  }
}

export function readLoopState(): LoopState {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return emptyState()
    }
    const content = fs.readFileSync(STATE_FILE, "utf-8")
    const parsed = JSON.parse(content)
    // Ensure all expected arrays exist (backward-compatible with partial data)
    return {
      lastRun: parsed.lastRun ?? "",
      activeGenerations: parsed.activeGenerations ?? [],
      waitingForHuman: parsed.waitingForHuman ?? [],
      recentCompletions: parsed.recentCompletions ?? [],
    }
  } catch {
    return emptyState()
  }
}

export function writeLoopState(state: LoopState): void {
  state.lastRun = new Date().toISOString()
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8")
}

// ---------------------------------------------------------------------------
// Update helpers
// ---------------------------------------------------------------------------

/** Called at the START of the content loop. */
export function startGeneration(recipeId: number, keyword: string, maxPasses: number): void {
  const state = readLoopState()
  state.activeGenerations.push({
    recipeId,
    keyword,
    pass: 1,
    maxPasses,
    score: 0,
    startedAt: new Date().toISOString(),
  })
  writeLoopState(state)
}

/** Called after EACH loop pass. */
export function updateGenerationProgress(recipeId: number, pass: number, score: number): void {
  const state = readLoopState()
  const gen = state.activeGenerations.find(g => g.recipeId === recipeId)
  if (gen) {
    gen.pass = pass
    gen.score = score
  }
  writeLoopState(state)
}

/** Called at the END of the content loop. */
export function finishGeneration(
  recipeId: number,
  keyword: string,
  bestScore: number,
  passesUsed: number,
  outcome: "published" | "draft" | "degraded",
  threshold: number,
): void {
  const state = readLoopState()

  // Remove from active
  state.activeGenerations = state.activeGenerations.filter(g => g.recipeId !== recipeId)

  if (outcome === "draft" && bestScore < threshold) {
    // Escalate to human
    state.waitingForHuman.push({
      recipeId,
      keyword,
      bestScore,
      passesUsed,
      reason: `Score ${bestScore} < threshold ${threshold} after ${passesUsed} passes`,
      blockedAt: new Date().toISOString(),
    })
  } else {
    // Add to recent completions
    state.recentCompletions.unshift({
      recipeId,
      keyword,
      score: bestScore,
      passesUsed,
      outcome,
      completedAt: new Date().toISOString(),
    })
    // Prune to 10 most recent
    state.recentCompletions = state.recentCompletions.slice(0, 10)
  }

  writeLoopState(state)
}

/** Appends a run log entry to loop-run-log.md (NDJSON format, unchanged). */
export function appendRunLog(entry: {
  runId: string
  recipeId: number
  keyword: string
  passesUsed: number
  bestScore: number
  duration_s: number
  outcome: string
  threshold: number
}): void {
  const runLogFile = path.resolve(process.cwd(), "loop-run-log.md")
  try {
    // Dedup by recipeId: Inngest step replay re-executes the function body,
    // generating multiple runId values for the same recipe. Skip if this
    // recipeId already has a completed log entry.
    if (fs.existsSync(runLogFile)) {
      const existing = fs.readFileSync(runLogFile, "utf-8")
      if (existing.includes(`"recipeId":${entry.recipeId}`)) {
        return // Already logged — skip duplicate from Inngest replay
      }
    }

    const { recipeId, ...displayEntry } = entry
    const jsonLine = JSON.stringify(displayEntry)
    let content = ""
    if (fs.existsSync(runLogFile)) {
      content = fs.readFileSync(runLogFile, "utf-8")
    }
    // Insert before the closing ``` if it exists, otherwise append
    if (content.includes("```")) {
      const lastFence = content.lastIndexOf("```")
      content = content.substring(0, lastFence) + jsonLine + "\n" + content.substring(lastFence)
    } else {
      content += jsonLine + "\n"
    }
    fs.writeFileSync(runLogFile, content, "utf-8")
  } catch {
    console.error(`[loop-state] Failed to write run log: ${(new Error()).message}`)
  }
}
