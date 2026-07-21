// Agent — Chef Augustin Mega-Skill v14
//
// Single LLM call with structured output (Opus 4.8 primary, Sonnet 5 fallback).
// The mega-skill handles strategy, writing, SEO, food safety, and image prompt
// in one pass. No separate Strategist or Science Enricher needed.
//
// Architecture:
//   System prompt ← loadSkillContent("chef-augustin-mega")
//   Output        ← RecipeArticle via structured output

import { loadSkillContent } from "@/lib/skills"
import { runWithStructuredOutput } from "@/lib/agents/provider"
import { RecipeArticleSchema, type RecipeArticle } from "@/lib/schemas/recipe-article"
import { SITE_URL } from "../helpers"
import { z } from "zod"
import type { Ingredient, Instruction } from "@/lib/db/schema"
import type { StrategyPlan } from "./strategist"

// Re-export for consumers
export type { RecipeArticle }

// Re-export the schema (used by generate-recipe.ts for the user prompt)
export { RecipeArticleSchema }

// ---------------------------------------------------------------------------
// zod-to-JSON-Schema converter
// ---------------------------------------------------------------------------

function zodToJsonSchema(schema: z.ZodObject<any>): Record<string, unknown> {
  const shape = schema._def.shape() as Record<string, z.ZodTypeAny>
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, field] of Object.entries(shape)) {
    properties[key] = fieldToJsonSchema(field)
    if (!(field as any)._def?.isOptional) required.push(key)
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  }
}

function fieldToJsonSchema(field: z.ZodTypeAny): Record<string, unknown> {
  const def = (field as any)._def
  if (!def) return { type: "string" }

  switch (def.typeName) {
    case "ZodString": {
      const checks = def.checks || []
      const maxCheck = checks.find((c: any) => c.kind === "max")
      const minCheck = checks.find((c: any) => c.kind === "min")
      const result: Record<string, unknown> = { type: "string" }
      if (maxCheck) result.maxLength = maxCheck.value
      if (minCheck) result.minLength = minCheck.value
      return result
    }
    case "ZodNumber":
      return { type: "number" }
    case "ZodBoolean":
      return { type: "boolean" }
    case "ZodArray":
      return { type: "array", items: fieldToJsonSchema(def.type) }
    case "ZodEnum":
      return { type: "string", enum: def.values }
    case "ZodLiteral":
      return { type: "string", const: def.value }
    case "ZodObject": {
      // passthrough objects → allow any keys (no strict validation)
      const unknownKeys = (def as any).unknownKeys
      if (unknownKeys === "passthrough") {
        return { type: "object" }
      }
      const objShape = def.shape() as Record<string, z.ZodTypeAny>
      const objProps: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(objShape)) {
        objProps[k] = fieldToJsonSchema(v)
      }
      return { type: "object", properties: objProps }
    }
    default:
      return { type: "string" }
  }
}

// Pre-computed JSON schema for the Anthropic API
export const RECIPE_JSON_SCHEMA = zodToJsonSchema(RecipeArticleSchema)

// ---------------------------------------------------------------------------
// Types — Backward Compat (ChefAugustinOutput / RecipeDraft)
// Consumers from earlier pipeline versions expect Ingredient[] and Instruction[].
// We keep these as separate types and convert internally.
// ---------------------------------------------------------------------------

export type ChefAugustinOutput = {
  title: string
  metaTitle: string
  metaDescription: string
  excerpt: string
  contentMarkdown: string
  ingredients: Ingredient[]
  instructions: Instruction[]
  tags: string[]
  prepTime: string
  cookTime: string
  totalTime: string
  servings: string
  difficulty: string
  imagePrompt: string
  jsonLd: Record<string, unknown>
}

// Backward-compatible alias
export type RecipeDraft = ChefAugustinOutput

/**
 * Converts a RecipeArticle (from the new mega-skill) to the legacy
 * ChefAugustinOutput format. Ingredients are parsed from strings to
 * { name, quantity? } objects.
 */
export function recipeArticleToChefAugustinOutput(r: RecipeArticle): ChefAugustinOutput {
  return {
    title: r.title,
    metaTitle: r.metaTitle,
    metaDescription: r.metaDescription,
    excerpt: r.excerpt,
    contentMarkdown: r.contentMarkdown,
    ingredients: r.ingredients.map(i => parseIngredient(i)),
    instructions: r.instructions.map(i => ({ step: i.step, text: i.text })),
    tags: r.tags,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    totalTime: r.totalTime,
    servings: r.servings,
    difficulty: r.difficulty,
    imagePrompt: r.imagePrompt,
    jsonLd: r.jsonLd as unknown as Record<string, unknown>,
  }
}

/**
 * Parses a structured ingredient string (e.g. "1 cup (140g) all-purpose flour")
 * into an Ingredient object with quantity and name.
 */
function parseIngredient(s: string): Ingredient {
  // Match: optional leading whitespace, then a quantity phrase
  // (digits, fractions, units, parenthetical notes), then a name.
  // Example matches:
  //   "1 cup (140g) all-purpose flour"  → qty: "1 cup (140g)"  name: "all-purpose flour"
  //   "3 large eggs, room temperature"   → qty: "3 large"          name: "eggs, room temperature"
  //   "Salt to taste"                    → qty: undefined          name: "Salt to taste"
  const match = s.match(
    /^([\d¼½¾⅓⅔⅛⅜⅝⅞][\.\d\/\s]*(?:\s*(?:cup|tablespoon|teaspoon|ounce|oz|pound|lb|gram|g|kilogram|kg|ml|liter|piece|slice|clove|pinch|dash|bag|can|jar|bunch|small|medium|large)s?)?(?:\([^)]+\))?\s*)\s+(.+)/i,
  )
  if (match) {
    return { quantity: match[1].trim(), name: match[2].trim() }
  }
  // No structured quantity found — treat whole string as name
  return { name: s }
}

// ---------------------------------------------------------------------------
// Agent — Mega (new)
// ---------------------------------------------------------------------------

export interface ChefAugustinMegaParams {
  keyword: string
  cuisine: string
  cuisineIngredients: string
  cuisineTechniques: string
  serpData: string
  citations: string
  feedback?: string
}

export async function agentChefAugustinMega(
  params: ChefAugustinMegaParams,
): Promise<RecipeArticle> {
  const { keyword, cuisine, cuisineIngredients, cuisineTechniques, serpData, citations, feedback } = params

  try {
    const replacements = {
      cuisine,
      cuisine_ingredients: cuisineIngredients,
      cuisine_techniques: cuisineTechniques,
    }

    const systemPrompt = await loadSkillContent("chef-augustin-mega", replacements)

    let userPrompt = [
      `KEYWORD: ${keyword}`,
      `CUISINE: ${cuisine}`,
      `INGREDIENTS: ${cuisineIngredients}`,
      `TECHNIQUES: ${cuisineTechniques}`,
      ``,
      `## SERP DATA`,
      serpData,
      ``,
      `## AUTHORITATIVE SOURCES (cite 1-2 where contextually relevant)`,
      citations,
    ].join("\n")

    if (feedback) {
      userPrompt += `\n\n---\nQUALITY GATE FEEDBACK (fix these issues):\n${feedback}`
    }

    userPrompt += `\n\n---\nGenerate a complete ${keyword} recipe article. Follow the mega-skill exactly. Output valid JSON only.`

    console.log(`[ChefAugustinMega] Calling Opus 4.8 for "${keyword}" (${systemPrompt.length} chars skill, ${userPrompt.length} chars prompt)`)

    const result = await runWithStructuredOutput<RecipeArticle>(
      systemPrompt,
      userPrompt,
      RECIPE_JSON_SCHEMA,
      {
        model: "claude-opus-4-8",
        maxTokens: 32000,
        timeout: 180_000, // 3 min
      },
    )

    console.log(`[ChefAugustinMega] Success — ${result.contentMarkdown?.split(/\s+/).filter(Boolean).length ?? 0} words, ${result.tags?.length ?? 0} tags`)

    return result
  } catch (err) {
    throw new Error(
      `[ChefAugustinMega] LLM call failed for "${keyword}": ${(err as Error).message}`,
      { cause: err },
    )
  }
}

// ---------------------------------------------------------------------------
// Agent — Backward Compat (wraps mega-skill, adapts old params)
// ---------------------------------------------------------------------------

/**
 * Backward-compatible wrapper that adapts the old multi-agent params
 * (keyword, format, strategyPlan, cuisineReplacements) to the new
 * mega-skill interface. Returns the legacy ChefAugustinOutput type so
 * existing consumers (content-loop-phase, persist-phase, pin-phase)
 * continue to compile and work.
 */
export async function agentChefAugustin(params: {
  keyword: string
  format?: "google" | "pin-first"
  strategyPlan?: StrategyPlan
  cuisineReplacements?: Record<string, string>
  feedback?: string
}): Promise<ChefAugustinOutput> {
  const { keyword, cuisineReplacements = {}, feedback, strategyPlan } = params

  const cuisine = cuisineReplacements.cuisine || "Easy Weeknight Dinners for Two"
  const cuisineIngredients = cuisineReplacements.cuisine_ingredients || ""
  const cuisineTechniques = cuisineReplacements.cuisine_techniques || ""

  // Build serpData from the strategy plan (if available)
  let serpData = ""
  if (strategyPlan) {
    serpData = [
      `Angle: ${strategyPlan.angle}`,
      `Primary Keyword: ${strategyPlan.primaryKeyword}`,
      `Secondary Keywords: ${strategyPlan.secondaryKeywords.join(", ")}`,
      `Target Word Count: ${strategyPlan.targetWordCount}`,
      ``,
      `## H2 Sections`,
      ...strategyPlan.h2Sections.map((h, i) =>
        `${i + 1}. **${h.heading}** — ${h.purpose}${h.coverPaa.length ? ` (cover: ${h.coverPaa.join("; ")})` : ""}`,
      ),
      ``,
      `## FAQ Questions`,
      ...strategyPlan.faqQuestions.map((q, i) => `${i + 1}. ${q}`),
      ``,
      `## Competitor Gaps to Exploit`,
      ...strategyPlan.competitorGaps.map(g => `- ${g}`),
      ``,
      `## Semantic Entities`,
      strategyPlan.semanticEntities.join(", "),
    ].join("\n")
  }

  // Build citations from required citations in the strategy plan
  let citations = ""
  if (strategyPlan?.requiredCitations?.length) {
    citations = strategyPlan.requiredCitations.map(c => c.citationFormat).join("\n")
  }

  const result = await agentChefAugustinMega({
    keyword,
    cuisine,
    cuisineIngredients,
    cuisineTechniques,
    serpData,
    citations,
    feedback,
  })

  return recipeArticleToChefAugustinOutput(result)
}
