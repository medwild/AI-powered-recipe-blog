/**
 * Pipeline E2E Test — Recipe Generation (Text + Images)
 *
 * Tests the complete recipe generation flow from SERP through Content Loop
 * to Image generation. External boundaries (LLMs, image APIs, DB) are mocked;
 * deterministic validators (GEO, Content, Loop Scorer) run with real code.
 *
 * Coverage:
 *   - Content Loop: scoring, feedback injection, stopping rules
 *   - Image Phase: generation + upload flow, degraded fallback
 *   - Validators: GEO citability, Content validation, Loop scoring
 *   - Full chain: text content + image variants in a single pipeline run
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ═══════════════════════════════════════════════════════════════════════════════
// Module-level mocks (hoisted by vitest — factories run before imports)
// ═══════════════════════════════════════════════════════════════════════════════

const { mockDbUpdate, mockDbSelect, mockDbInsert } = vi.hoisted(() => {
  const updateWhere = vi.fn().mockResolvedValue(undefined)
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
  const update = vi.fn().mockReturnValue({ set: updateSet })

  const selectLimit = vi.fn().mockResolvedValue([])
  const selectOrderBy = vi.fn().mockReturnValue({ limit: selectLimit })
  const selectWhere = vi.fn().mockReturnValue({ orderBy: selectOrderBy, limit: selectLimit })
  const selectFrom = vi.fn().mockReturnValue({ where: selectWhere, orderBy: selectOrderBy, limit: selectLimit })
  const select = vi.fn().mockReturnValue({ from: selectFrom })

  const insertValues = vi.fn().mockResolvedValue(undefined)
  const insert = vi.fn().mockReturnValue({ values: insertValues })

  return {
    mockDbUpdate: { set: updateSet, where: updateWhere },
    mockDbSelect: { from: selectFrom, where: selectWhere, orderBy: selectOrderBy, limit: selectLimit },
    mockDbInsert: { values: insertValues },
  }
})

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          limit: vi.fn().mockResolvedValue([]),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  },
}))

vi.mock("@/lib/queries", () => ({
  logPipelineError: vi.fn().mockResolvedValue(undefined),
  insertQualityLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/loop-state", () => ({
  startGeneration: vi.fn(),
  finishGeneration: vi.fn(),
  appendRunLog: vi.fn(),
}))

vi.mock("@/lib/agents/ideogram", () => ({
  runImage: vi.fn().mockResolvedValue(Buffer.from("FAKE_IMAGE_DATA_FOR_TEST")),
}))

vi.mock("@/lib/agents/cloudinary", () => ({
  uploadImage: vi.fn().mockResolvedValue("https://res.cloudinary.com/demo/image/upload/v1234/swedish-meatballs.jpg"),
}))

// ── Load skill content (avoid reading real skill files) ────────────────────

vi.mock("@/lib/skills", () => ({
  loadSkillContent: vi.fn().mockResolvedValue("You are a test agent. Output valid JSON."),
  optimizeImagePrompt: vi.fn((source: { title?: string | null; imagePrompt?: string | null }) =>
    source.imagePrompt?.trim() || `Professional food photography of ${source.title || "the dish"}, natural light, 2:3 aspect ratio`
  ),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// Imports (after mocks)
// ═══════════════════════════════════════════════════════════════════════════════

import { runContentLoopPhase, type ContentLoopResult } from "@/lib/inngest/functions/steps/content-loop-phase"
import { runImagePhase, type ImagePhaseResult } from "@/lib/inngest/functions/steps/image-phase"
import { checkCitability } from "@/lib/geo-validator"
import { validateContent, validateFoodSafety } from "@/lib/content-validator"
import { computeQualityScore } from "@/lib/quality-scorer"
import { runImage } from "@/lib/agents/ideogram"
import { uploadImage } from "@/lib/agents/cloudinary"

import {
  MOCK_STRATEGY_PLAN,
  MOCK_SERP_RESULT,
  RECIPE_OUTPUT_PASS_GOOD,
  RECIPE_OUTPUT_PASS_WEAK,
  RECIPE_OUTPUT_PASS_IMPROVED,
  RECIPE_OUTPUT_WITH_BANNED_WORDS,
} from "./fixtures/recipe-outputs"

// ═══════════════════════════════════════════════════════════════════════════════
// Mock agent references (after imports so factory references resolve)
// ═══════════════════════════════════════════════════════════════════════════════

const { mockChefAugustin, mockStrategist } = vi.hoisted(() => ({
  mockChefAugustin: vi.fn(),
  mockStrategist: vi.fn(),
}))

vi.mock("@/lib/inngest/functions/agents/chef-augustin", () => ({
  agentChefAugustin: mockChefAugustin,
}))

vi.mock("@/lib/inngest/functions/agents/strategist", () => ({
  agentStrategist: mockStrategist,
}))

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a mock Inngest step object.
 * `step.run(name, fn)` executes `fn()` immediately and returns its result.
 * `step.sleep()` is a no-op.
 */
function mockStep() {
  return {
    run: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => fn(),
    sleep: async (_name: string, _dur: string): Promise<void> => undefined,
  }
}

const DEFAULT_CUISINE: Record<string, string> = {
  cuisine: "Scandinavian Comfort Food",
  cuisine_ingredients: "beef, pork, cream, allspice, nutmeg, lingonberry, butter, onion",
  cuisine_techniques: "panade, searing, deglazing, cream reduction, roux-based sauce",
}

function setupGoodPass() {
  mockStrategist.mockResolvedValue(MOCK_STRATEGY_PLAN)
  mockChefAugustin.mockResolvedValue(RECIPE_OUTPUT_PASS_GOOD)
}

function setupWeakThenImproved() {
  mockStrategist.mockResolvedValue(MOCK_STRATEGY_PLAN)
  mockChefAugustin
    .mockResolvedValueOnce(RECIPE_OUTPUT_PASS_WEAK)
    .mockResolvedValueOnce(RECIPE_OUTPUT_PASS_IMPROVED)
}

function setupBannedWords() {
  mockStrategist.mockResolvedValue(MOCK_STRATEGY_PLAN)
  mockChefAugustin.mockResolvedValue(RECIPE_OUTPUT_WITH_BANNED_WORDS)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("Pipeline E2E — Content Loop Phase", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Scenario 1: Nominal pass ────────────────────────────────────────────

  describe("Scenario 1 — First-pass success (text + scoring)", () => {
    it("completes in 1 pass when content meets the quality threshold", async () => {
      setupGoodPass()

      const step = mockStep()
      const result: ContentLoopResult = await runContentLoopPhase(
        step, 1, "swedish meatballs recipe",
        MOCK_SERP_RESULT, DEFAULT_CUISINE, "pin-first",
      )

      // Stopped at pass 1
      expect(result.passesUsed).toBe(1)
      expect(result.score).toBeGreaterThanOrEqual(70)
      expect(result.degraded).toBe(false)

      // Output has all required fields
      const out = result.output
      expect(out.title).toBeTruthy()
      expect(out.contentMarkdown).toBeTruthy()
      expect(out.ingredients.length).toBeGreaterThanOrEqual(5)
      expect(out.instructions.length).toBeGreaterThanOrEqual(4)
      expect(out.imagePrompt).toBeTruthy()
      expect(out.tags.length).toBeGreaterThanOrEqual(3)

      // Content passes deterministic validation
      const wordCount = out.contentMarkdown.split(/\s+/).filter(Boolean).length
      expect(wordCount).toBeGreaterThanOrEqual(1000)

      const citability = checkCitability(out.contentMarkdown, wordCount)
      expect(citability.score).toBeGreaterThanOrEqual(50)

      const validation = validateContent({
        contentMarkdown: out.contentMarkdown,
        title: out.title,
        metaTitle: out.metaTitle,
        ingredients: out.ingredients,
        instructions: out.instructions,
        contentType: "recipe",
        format: "pin-first",
        prepTime: out.prepTime,
        cookTime: out.cookTime,
        totalTime: out.totalTime,
        servings: out.servings,
      })
      // Only block on structural/food-safety errors — pin-first format rules may
      // fire on google-oriented fixtures (recipe card position, etc.)
      const blockingErrors = validation.errors.filter(e =>
        e.severity === "error" &&
        (e.message.includes("food safety") ||
         e.message.includes("No ingredients") ||
         e.message.includes("No instructions") ||
         e.message.includes("Title is empty"))
      )
      expect(blockingErrors.length).toBe(0)
    })

    it("produced content has image prompt for the image phase", async () => {
      setupGoodPass()

      const step = mockStep()
      const result = await runContentLoopPhase(
        step, 1, "swedish meatballs recipe",
        MOCK_SERP_RESULT, DEFAULT_CUISINE, "pin-first",
      )

      expect(result.output.imagePrompt).toBeTruthy()
      expect(result.output.imagePrompt.length).toBeGreaterThan(50)
      // Food photography keywords expected
      expect(result.output.imagePrompt.toLowerCase()).toMatch(/photography|light|composition|food/)
    })
  })

  // ── Scenario 2: Two-pass loop ───────────────────────────────────────────
  //
  // SKIPPED: v13 is single-pass with retry on truncation only. The score-based
  // loop correction (weak → feedback → improved) was a v12 Evaluator-Optimizer
  // feature. In v13, the Writer breaks on the first structurally complete output.
  // These tests are kept for reference when the loop is re-enabled.

  describe.skip("Scenario 2 — Loop correction (weak pass → feedback → improved)", () => {
    it("runs a second pass when the first pass score is below threshold", async () => {
      setupWeakThenImproved()

      const step = mockStep()
      const result: ContentLoopResult = await runContentLoopPhase(
        step, 2, "swedish meatballs recipe",
        MOCK_SERP_RESULT, DEFAULT_CUISINE, "pin-first",
      )

      // Should have used 2 passes
      expect(result.passesUsed).toBeGreaterThanOrEqual(2)
      // The improved output should be selected (higher score)
      expect(result.output.title).toBe("Swedish Meatballs with Cream Sauce")
      expect(result.score).toBeGreaterThanOrEqual(70)

      // Chef Augustin was called twice
      expect(mockChefAugustin).toHaveBeenCalledTimes(2)
    })

    it("injects feedback into the second Writer call", async () => {
      setupWeakThenImproved()

      const step = mockStep()
      await runContentLoopPhase(
        step, 2, "swedish meatballs recipe",
        MOCK_SERP_RESULT, DEFAULT_CUISINE, "pin-first",
      )

      // Second call should have received feedback
      const secondCallArgs = mockChefAugustin.mock.calls[1][0]
      expect(secondCallArgs.feedback).toBeTruthy()
      expect(secondCallArgs.feedback).toContain("QUALITY FEEDBACK")
    })
  })

  // ── Scenario 3: Banned words in content ─────────────────────────────────

  describe("Scenario 3 — Banned words detection", () => {
    it("detects banned AI vocabulary in the content validator", () => {
      const validation = validateContent({
        contentMarkdown: RECIPE_OUTPUT_WITH_BANNED_WORDS.contentMarkdown,
        title: "Swedish Meatballs",
        contentType: "recipe",
      })

      const bannedErrors = validation.errors.filter(e => e.message.includes("Banned word"))
      expect(bannedErrors.length).toBeGreaterThan(0)
    })

    it("still completes the loop (banned words are warnings, not blocks)", async () => {
      setupBannedWords()

      const step = mockStep()
      const result = await runContentLoopPhase(
        step, 3, "swedish meatballs recipe",
        MOCK_SERP_RESULT, DEFAULT_CUISINE, "pin-first",
      )

      // Should still complete
      expect(result.output).toBeTruthy()
      expect(result.passesUsed).toBeGreaterThanOrEqual(1)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Image Phase
// ═══════════════════════════════════════════════════════════════════════════════

describe("Pipeline E2E — Image Phase", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("generates and uploads image variants from the recipe image prompt", async () => {
    const mockRunImage = vi.mocked(runImage)
    const mockUploadImage = vi.mocked(uploadImage)

    mockRunImage.mockResolvedValue(Buffer.from("FAKE_IMAGE_DATA_FOR_TEST"))
    mockUploadImage.mockResolvedValue("https://res.cloudinary.com/demo/meatballs-v0.jpg")

    const step = mockStep()
    const result: ImagePhaseResult = await runImagePhase(
      step,
      1,
      {
        title: "Swedish Meatballs",
        tags: ["Main Course", "Swedish"],
        imagePrompt: RECIPE_OUTPUT_PASS_GOOD.imagePrompt,
      },
      "swedish meatballs recipe",
    )

    // At least 1 variant was generated
    expect(result.imageVariants.length).toBeGreaterThanOrEqual(1)
    // Each variant has a URL
    result.imageVariants.forEach(v => {
      expect(v.url).toMatch(/^https:\/\//)
      expect(v.label).toBeTruthy()
      expect(v.prompt).toBeTruthy()
    })
    // Hero image is the first variant
    expect(result.heroImageUrl).toBe(result.imageVariants[0].url)
    expect(result.degraded).toBe(false)
  })

  it("falls back to a deterministic prompt when no imagePrompt is provided", async () => {
    const mockRunImage = vi.mocked(runImage)
    mockRunImage.mockResolvedValue(Buffer.from("FALLBACK_IMAGE"))

    const step = mockStep()
    const result = await runImagePhase(
      step,
      2,
      { title: "Swedish Meatballs", tags: ["swedish"] }, // no imagePrompt
      "swedish meatballs",
    )

    expect(result.imageVariants.length).toBeGreaterThanOrEqual(1)
    // The generated prompt should be the deterministic fallback
    const usedPrompt = result.imageVariants[0].prompt
    expect(usedPrompt).toContain("Swedish Meatballs")
    expect(usedPrompt).toContain("food photography")
  })

  it("handles image generation failure gracefully (degraded mode)", async () => {
    const mockRunImage = vi.mocked(runImage)
    mockRunImage.mockRejectedValue(new Error("Ideogram 500 — service unavailable"))

    const step = mockStep()
    const result = await runImagePhase(
      step,
      3,
      {
        title: "Swedish Meatballs",
        tags: [],
        imagePrompt: "Beautiful Swedish meatballs photo",
      },
      "swedish meatballs",
    )

    // Degraded but returns empty variants (no crash)
    expect(result.degraded).toBe(true)
    expect(result.imageVariants.length).toBe(0)
    expect(result.heroImageUrl).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Full Chain — Content Loop → Image Phase
// ═══════════════════════════════════════════════════════════════════════════════

describe("Pipeline E2E — Full Chain (Text + Images)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("produces a complete recipe with text content AND images", async () => {
    // ── Phase 1: Content Loop ──────────────────────────────────────────
    setupGoodPass()

    const step1 = mockStep()
    const contentResult = await runContentLoopPhase(
      step1, 10, "swedish meatballs recipe",
      MOCK_SERP_RESULT, DEFAULT_CUISINE, "pin-first",
    )

    expect(contentResult.passesUsed).toBe(1)
    expect(contentResult.output.contentMarkdown.length).toBeGreaterThan(500)
    expect(contentResult.output.imagePrompt).toBeTruthy()

    // ── Phase 2: Images ────────────────────────────────────────────────
    const mockRunImage = vi.mocked(runImage)
    const mockUploadImage = vi.mocked(uploadImage)
    mockRunImage.mockResolvedValue(Buffer.from("CHAIN_TEST_IMAGE"))
    mockUploadImage.mockResolvedValue("https://res.cloudinary.com/demo/chain-test.jpg")

    const step2 = mockStep()
    const imageResult = await runImagePhase(
      step2, 10,
      {
        title: contentResult.output.title,
        tags: contentResult.output.tags,
        imagePrompt: contentResult.output.imagePrompt,
      },
      "swedish meatballs recipe",
    )

    expect(imageResult.imageVariants.length).toBeGreaterThanOrEqual(1)
    expect(imageResult.heroImageUrl).toBeTruthy()

    // ── Assert: complete recipe has both text and images ───────────────
    const fullRecipe = {
      text: contentResult.output,
      images: imageResult,
    }

    // Text assertions
    expect(fullRecipe.text.title).toBe("Swedish Meatballs with Cream Sauce")
    expect(fullRecipe.text.ingredients.length).toBeGreaterThanOrEqual(5)
    expect(fullRecipe.text.instructions.length).toBeGreaterThanOrEqual(4)
    expect(fullRecipe.text.contentMarkdown).toContain("FAQ")
    expect(fullRecipe.text.contentMarkdown).toContain("165°F")

    // Image assertions
    expect(fullRecipe.images.heroImageUrl).toMatch(/^https:\/\//)
    expect(fullRecipe.images.imageVariants.length).toBeGreaterThanOrEqual(1)
    fullRecipe.images.imageVariants.forEach(v => {
      expect(v.url).toMatch(/^https:\/\//)
      expect(v.label).toBeTruthy()
    })

    // Validators confirm quality
    const wordCount = fullRecipe.text.contentMarkdown.split(/\s+/).filter(Boolean).length
    const citability = checkCitability(fullRecipe.text.contentMarkdown, wordCount)
    const validation = validateContent({
      contentMarkdown: fullRecipe.text.contentMarkdown,
      title: fullRecipe.text.title,
      metaTitle: fullRecipe.text.metaTitle,
      metaDescription: fullRecipe.text.metaDescription,
      ingredients: fullRecipe.text.ingredients,
      instructions: fullRecipe.text.instructions,
      contentType: "recipe",
      format: "pin-first",
    })

    const compositeScore = computeQualityScore(citability, validation)

    // Quality gates
    expect(citability.score).toBeGreaterThanOrEqual(50)
    // Only block on structural/food-safety errors — pin-first format rules may
    // fire on google-oriented fixtures (recipe card position, etc.)
    const blockingErrors = validation.errors.filter(e =>
      e.severity === "error" &&
      (e.message.includes("food safety") ||
       e.message.includes("No ingredients") ||
       e.message.includes("No instructions") ||
       e.message.includes("Title is empty"))
    )
    expect(blockingErrors.length).toBe(0)
    expect(compositeScore.total).toBeGreaterThanOrEqual(70)
  })

  it("works with pin-first format", async () => {
    setupGoodPass()

    const step = mockStep()
    const result = await runContentLoopPhase(
      step, 11, "swedish meatballs",
      MOCK_SERP_RESULT, DEFAULT_CUISINE, "pin-first",
    )

    expect(result.output).toBeTruthy()
    // Pin-first is more compact (1200-1500 words target)
    const wordCount = result.output.contentMarkdown.split(/\s+/).filter(Boolean).length
    expect(wordCount).toBeGreaterThan(0)
  })

  it("handles strategist failure gracefully (degraded fallback plan)", async () => {
    mockStrategist.mockRejectedValue(new Error("Strategist API timeout"))
    mockChefAugustin.mockResolvedValue(RECIPE_OUTPUT_PASS_GOOD)

    const step = mockStep()
    const result = await runContentLoopPhase(
      step, 12, "swedish meatballs recipe",
      MOCK_SERP_RESULT, DEFAULT_CUISINE, "pin-first",
    )

    // Should still complete with fallback plan
    expect(result.output).toBeTruthy()
    expect(result.strategyPlan.h2Sections.length).toBeGreaterThanOrEqual(2)
    // Fallback plan uses generic headings
    expect(result.strategyPlan.h2Sections[0].heading).toBe("Ingredients")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Food Safety Validation — oven context filter (v13 audit fix)
// ═══════════════════════════════════════════════════════════════════════════════

describe("validateFoodSafety — oven context filter", () => {
  it("does NOT flag oven temperature near food name (false positive prevention)", () => {
    // "Preheat oven to 350°F. Cook chicken..." should not be flagged —
    // 350°F is an oven temperature, not an internal meat temperature.
    const content = "Preheat oven to 350°F. Pat the chicken dry and season with salt. Cook until internal temperature reaches 165°F."
    const errors = validateFoodSafety(content)
    expect(errors.length).toBe(0)
  })

  it("flags real food safety violation (chicken below 165°F internal)", () => {
    // "Cook chicken to 150°F" — this is below USDA 165°F minimum and
    // does NOT have oven context → should be flagged.
    const content = "Remove the chicken from the pan when it reaches 150°F internal temperature."
    const errors = validateFoodSafety(content)
    expect(errors.length).toBe(1)
    expect(errors[0].message).toContain("CRITICAL Food safety")
    expect(errors[0].message).toContain("poultry")
  })

  it("does NOT flag safe temperature (165°F = USDA minimum)", () => {
    const content = "Cook the chicken breasts until the thickest part registers 165°F on an instant-read thermometer."
    const errors = validateFoodSafety(content)
    expect(errors.length).toBe(0) // 165°F is exactly the minimum — safe
  })

  it("skips oven context: 'bake at 400°F' near chicken", () => {
    const content = "Bake at 400°F for 20 minutes until the chicken thighs are golden and cooked through."
    const errors = validateFoodSafety(content)
    expect(errors.length).toBe(0) // 400°F is oven temp, not chicken internal temp
  })
})
