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

// StrategyPlan was deleted in v14 — define a minimal local type for backward compat
export interface StrategyPlan {
  angle?: string
  primaryKeyword?: string
  secondaryKeywords?: string[]
  h2Sections?: { heading: string; purpose?: string; coverPaa?: string[] }[]
  faqQuestions?: string[]
  competitorGaps?: string[]
  semanticEntities?: string[]
  targetWordCount?: string
  requiredCitations?: { sourceId?: string; h2Section?: string; citationFormat?: string }[]
}

// Re-export for consumers
export type { RecipeArticle }

// Re-export the schema (used by generate-recipe.ts for the user prompt)
export { RecipeArticleSchema }

// ---------------------------------------------------------------------------
// zod-to-JSON-Schema converter
// ---------------------------------------------------------------------------

function zodToJsonSchema(schema: z.ZodObject<any>): Record<string, unknown> {
  const def = (schema as any)._def
  const shape = typeof def.shape === "function" ? def.shape() : (def.shape ?? {})
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, field] of Object.entries(shape as Record<string, z.ZodTypeAny>)) {
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
      const raw = (def as any).shape
      const objShape: Record<string, z.ZodTypeAny> = typeof raw === "function" ? raw() : (raw ?? {})
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
/**
 * Normalizes a RecipeArticle from LLM output — coerces all fields to their
 * expected types. LLMs (especially in text+parse mode) sometimes return
 * strings where arrays are expected, objects instead of strings, or null
 * in required fields. This runs before quality gate or persist so downstream
 * code can trust the types.
 */
export function normalizeRecipeArticle(raw: Record<string, unknown>): RecipeArticle {
  const str = (v: unknown, fallback = ""): string =>
    typeof v === "string" ? v : (v != null ? String(v) : fallback)

  /** Extract ingredient lines from markdown (## Ingredients section). */
  const extractMdIngredients = (md: string): string[] => {
    // Find the Ingredients heading and capture bullet lines until next ## heading
    const section = md.match(/^##\s+Ingredients?\b.*?\n([\s\S]*?)(?=^##\s|\Z)/im)
    if (!section?.[1]) return []
    const lines = section[1].split("\n")
    const bullets: string[] = []
    for (const line of lines) {
      const trimmed = line.replace(/^[-*•]\s+/, "").replace(/\*\*/g, "").trim()
      if (trimmed && !trimmed.startsWith("#") && trimmed.length > 3) {
        bullets.push(trimmed)
      }
    }
    return bullets
  }

  const strArr = (v: unknown, fallbackMd?: string): string[] => {
    const fromJson: string[] = []
    if (Array.isArray(v)) {
      for (const x of v) {
        const s = typeof x === "string" ? x : String(x?.name ?? x?.text ?? x ?? "")
        if (s.includes(";") && (s.match(/;/g) ?? []).length >= 2) {
          fromJson.push(...s.split(";").map(p => p.trim()).filter(Boolean))
        } else {
          fromJson.push(s)
        }
      }
    } else if (typeof v === "string") {
      fromJson.push(...v.split(/\n|•|-|\*/).map(s => s.trim()).filter(Boolean))
    }

    // If JSON parsing produced ≤3 items but markdown has more, use markdown
    if (fromJson.filter(Boolean).length <= 3 && fallbackMd) {
      const mdIngredients = extractMdIngredients(fallbackMd)
      if (mdIngredients.length > fromJson.filter(Boolean).length) return mdIngredients
    }
    return fromJson.filter(Boolean)
  }

  /** Extract numbered instruction steps from markdown (## Instructions section). */
  const extractMdInstructions = (md: string): { step: number; text: string }[] => {
    const section = md.match(/^##\s+Instructions?\b.*?\n([\s\S]*?)(?=^##\s|\Z)/im)
    if (!section?.[1]) return []
    // Match "Step 1 — text" or "**Step 1**" or "1. text" patterns
    const steps = section[1].match(/(?:\*\*Step\s+(\d+)\*\*[:\-—]\s*(.+?)(?=\n|$)|Step\s+(\d+)\s*[—\-]\s*(.+?)(?=\n|$)|^(\d+)\.\s+(.+?)$)/gm)
    if (!steps) return []
    return steps.map((s, i) => {
      const match = s.match(/Step\s+(\d+)|^(\d+)\./)
      const num = match ? parseInt(match[1] ?? match[2] ?? "0", 10) : i + 1
      const text = s.replace(/^(\*\*)?Step\s+\d+(\*\*)?[:\-—]\s*/, "").replace(/^\d+\.\s*/, "").trim()
      return { step: num, text }
    }).filter(x => x.text.length > 10)
  }

  const instructionsArr = (v: unknown, fallbackMd?: string): { step: number; text: string; duration?: string; temperature?: string }[] => {
    const fromJson: { step: number; text: string; duration?: string; temperature?: string }[] = []
    if (Array.isArray(v)) {
      for (const i of v) {
        if (typeof i === "string") { fromJson.push({ step: fromJson.length + 1, text: i }); continue }
        if (i && typeof i === "object") {
          const o = i as Record<string, unknown>
          fromJson.push({
            step: typeof o.step === "number" ? o.step : Number(o.step ?? fromJson.length + 1),
            text: str(o.text ?? o.instruction ?? o.description, ""),
            ...(o.duration ? { duration: str(o.duration) } : {}),
            ...(o.temperature ? { temperature: str(o.temperature) } : {}),
          })
        }
      }
    }

    // If JSON produced 0 instructions but markdown has steps, use markdown
    if (fromJson.filter(x => x.text.length > 0).length === 0 && fallbackMd) {
      const mdSteps = extractMdInstructions(fallbackMd)
      if (mdSteps.length > 0) return mdSteps
    }
    return fromJson.filter(x => x.text.length > 0)
  }

  const tagsArr = (v: unknown): string[] => {
    if (Array.isArray(v)) {
      const flat = v.flatMap((x: unknown) => {
        if (typeof x === "string") {
          return x.includes(",") ? x.split(",").map(t => t.trim()).filter(Boolean) : [x]
        }
        if (x && typeof x === "object") return [str((x as Record<string, unknown>).name ?? x, "")]
        return []
      })
      return [...new Set(flat.map(t => t.toLowerCase()).filter(Boolean))]
    }
    if (typeof v === "string") return v.split(",").map(t => t.trim()).filter(Boolean)
    return []
  }

  return {
    title: str(raw.title, raw.keyword as string ?? "Untitled"),
    metaTitle: str(raw.metaTitle, str(raw.title, "")).substring(0, 60),
    metaDescription: str(raw.metaDescription),
    excerpt: str(raw.excerpt),
    contentMarkdown: str(raw.contentMarkdown),
    ingredients: strArr(raw.ingredients, str(raw.contentMarkdown)),
    instructions: instructionsArr(raw.instructions, str(raw.contentMarkdown)),
    tags: tagsArr(raw.tags),
    prepTime: str(raw.prepTime, "PT15M"),
    cookTime: str(raw.cookTime, "PT30M"),
    totalTime: str(raw.totalTime, "PT45M"),
    servings: str(raw.servings, "2"),
    difficulty: (["Easy", "Medium", "Hard"].includes(String(raw.difficulty ?? "")) ? String(raw.difficulty) : "Easy") as "Easy" | "Medium" | "Hard",
    imagePrompt: str(raw.imagePrompt).substring(0, 120),
    jsonLd: str(raw.jsonLd),
  }
}

export function recipeArticleToChefAugustinOutput(r: RecipeArticle): ChefAugustinOutput {
  // jsonLd is a JSON string from the LLM — parse it to an object for DB storage
  let parsedJsonLd: Record<string, unknown> = {}
  if (typeof r.jsonLd === "string") {
    try { parsedJsonLd = JSON.parse(r.jsonLd) } catch { /* leave empty */ }
  } else if (typeof r.jsonLd === "object" && r.jsonLd !== null) {
    parsedJsonLd = r.jsonLd as unknown as Record<string, unknown>
  }

  return {
    title: r.title,
    metaTitle: r.metaTitle,
    metaDescription: r.metaDescription,
    excerpt: r.excerpt,
    contentMarkdown: r.contentMarkdown,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients.map((i: unknown) => {
      if (typeof i === "string") return parseIngredient(i)
      if (i && typeof i === "object") {
        const obj = i as Record<string, unknown>
        return { name: String(obj.name ?? obj.ingredient ?? ""), quantity: String(obj.quantity ?? obj.amount ?? "") }
      }
      return { name: String(i ?? "") }
    }) : [],
    instructions: Array.isArray(r.instructions) ? r.instructions.map((i: unknown) => {
      if (i && typeof i === "object") {
        const obj = i as Record<string, unknown>
        return { step: Number(obj.step ?? 0), text: String(obj.text ?? obj.instruction ?? "") }
      }
      return { step: 0, text: String(i ?? "") }
    }) : [],
    tags: r.tags,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    totalTime: r.totalTime,
    servings: r.servings,
    difficulty: r.difficulty,
    imagePrompt: r.imagePrompt,
    jsonLd: parsedJsonLd,
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

    console.log(`[ChefAugustinMega] Calling ${RECIPE_JSON_SCHEMA ? "structured output" : "LLM"} for "${keyword}" (${systemPrompt.length} chars skill, ${userPrompt.length} chars prompt)`)

    const raw = await runWithStructuredOutput<RecipeArticle>(
      systemPrompt,
      userPrompt,
      RECIPE_JSON_SCHEMA,
      {
        model: process.env.ANTHROPIC_MODEL || "anthropic/claude-sonnet-5",
        maxTokens: 32000,
        timeout: 180_000, // 3 min
      },
    )

    // Normalize — LLM output in text+parse mode may not conform to schema
    const result = normalizeRecipeArticle(raw as unknown as Record<string, unknown>)

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
      `Secondary Keywords: ${(strategyPlan.secondaryKeywords ?? []).join(", ")}`,
      `Target Word Count: ${strategyPlan.targetWordCount}`,
      ``,
      `## H2 Sections`,
      ...(strategyPlan.h2Sections ?? []).map((h, i) =>
        `${i + 1}. **${h.heading}** — ${h.purpose}${(h.coverPaa?.length ?? 0) > 0 ? ` (cover: ${(h.coverPaa ?? []).join("; ")})` : ""}`,
      ),
      ``,
      `## FAQ Questions`,
      ...(strategyPlan.faqQuestions ?? []).map((q, i) => `${i + 1}. ${q}`),
      ``,
      `## Competitor Gaps to Exploit`,
      ...(strategyPlan.competitorGaps ?? []).map((g: string) => `- ${g}`),
      ``,
      `## Semantic Entities`,
      (strategyPlan.semanticEntities ?? []).join(", "),
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
