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
// zod-to-JSON-Schema converter (Zod v4)
// ---------------------------------------------------------------------------
// Zod v4 uses def.type (lowercase strings: "string","number","array","object",
// "enum","boolean","optional") instead of Zod v3's def.typeName ("ZodString", etc.).
// Every v3-based field fell through to default: { type: "string" }, so Gemini's
// responseSchema told it ingredients and instructions are plain strings — not arrays.

function fieldToJsonSchema(field: z.ZodTypeAny): Record<string, unknown> {
  const def = (field as any)._def
  if (!def) return { type: "string" }

  // Unwrap optional — actual type is in innerType
  if (def.type === "optional" && def.innerType) {
    return fieldToJsonSchema(def.innerType)
  }

  const desc = (field as any).description as string | undefined
  const t = def.type as string

  switch (t) {
    case "string": {
      const maxLen = (field as any).maxLength as number | null | undefined
      const minLen = (field as any).minLength as number | null | undefined
      return {
        type: "string",
        ...(maxLen != null ? { maxLength: maxLen } : {}),
        ...(minLen != null ? { minLength: minLen } : {}),
        ...(desc ? { description: desc } : {}),
      }
    }
    case "number":
      return { type: "number", ...(desc ? { description: desc } : {}) }
    case "boolean":
      return { type: "boolean", ...(desc ? { description: desc } : {}) }
    case "array": {
      // Zod v4 stores min/max on checks with _zod.def.{minimum,maximum}
      const checks: Array<{ _zod?: { def?: { check?: string; minimum?: number; maximum?: number } } }> = def.checks ?? []
      let minItems: number | undefined
      let maxItems: number | undefined
      for (const c of checks) {
        if (c._zod?.def?.check === "min_length") minItems = c._zod.def.minimum
        if (c._zod?.def?.check === "max_length") maxItems = c._zod.def.maximum
      }
      return {
        type: "array",
        items: fieldToJsonSchema(def.element),
        ...(minItems != null ? { minItems } : {}),
        ...(maxItems != null ? { maxItems } : {}),
        ...(desc ? { description: desc } : {}),
      }
    }
    case "enum":
      return {
        type: "string",
        enum: def.entries ? Object.keys(def.entries) : [],
        ...(desc ? { description: desc } : {}),
      }
    case "literal":
      return { type: "string", const: def.value }
    case "object": {
      // passthrough objects → allow any keys (no strict validation)
      const unknownKeys = (def as any).unknownKeys
      if (unknownKeys === "passthrough") {
        return { type: "object" }
      }
      const raw = (def as any).shape
      const objShape: Record<string, z.ZodTypeAny> = typeof raw === "function" ? raw() : (raw ?? {})
      const objProps: Record<string, unknown> = {}
      const objRequired: string[] = []
      for (const [k, v] of Object.entries(objShape)) {
        objProps[k] = fieldToJsonSchema(v)
        // Zod v4: isOptional() is a method on the ZodType instance
        if (!(v as any).isOptional?.()) objRequired.push(k)
      }
      return {
        type: "object", properties: objProps, additionalProperties: false,
        ...(objRequired.length > 0 ? { required: objRequired } : {}),
        ...(desc ? { description: desc } : {}),
      }
    }
    default:
      return { type: "string" }
  }
}

function zodToJsonSchema(schema: z.ZodObject<any>): Record<string, unknown> {
  const def = (schema as any)._def
  const shape = typeof def.shape === "function" ? def.shape() : (def.shape ?? {})
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, field] of Object.entries(shape as Record<string, z.ZodTypeAny>)) {
    properties[key] = fieldToJsonSchema(field)
    // Zod v4: isOptional() is a method on the ZodType instance
    if (!(field as any).isOptional?.()) required.push(key)
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
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
function parseJsonLd(v: unknown): Record<string, unknown> {
  if (typeof v === "object" && v !== null) return v as Record<string, unknown>
  if (typeof v === "string") {
    try { return JSON.parse(v) as Record<string, unknown> } catch { /* fall through */ }
  }
  return {}
}

export function normalizeRecipeArticle(raw: Record<string, unknown>): RecipeArticle {
  const str = (v: unknown, fallback = ""): string =>
    typeof v === "string" ? v : (v != null ? String(v) : fallback)

  /** Extract ingredient lines from markdown (any heading containing "ingredient"). */
  const extractMdIngredients = (md: string): string[] => {
    // Find the ingredient heading, then capture text until the next H2/H3 heading.
    // Using indexOf instead of a regex lookahead — the non-greedy [\s\S]*?(?=^#)
    // pattern is unreliable across multiple newlines in JS.
    const headingRe = /^#{1,3}\s+[^#\n]*ingredients?[^#\n]*$/im
    const headingMatch = md.match(headingRe)
    if (!headingMatch) return []
    const startIdx = md.indexOf(headingMatch[0]) + headingMatch[0].length
    const rest = md.substring(startIdx)
    // Stop at next H2 (or H1), NOT H3 — H3 sub-headings (### Step N) belong inside the section.
    const nextHeading = rest.search(/^#{1,2}\s/m)
    const sectionText = nextHeading >= 0 ? rest.substring(0, nextHeading) : rest
    const lines = sectionText.split("\n")
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
        fromJson.push(typeof x === "string" ? x : String(x?.name ?? x?.text ?? x ?? ""))
      }
    }

    const jsonCount = fromJson.filter(Boolean).length
    // Fall back to markdown ONLY when JSON is completely empty (structured output failure).
    // When JSON has items, trust the structured data — the markdown extraction is a safety net.
    if (jsonCount === 0 && fallbackMd) {
      const mdIngredients = extractMdIngredients(fallbackMd)
      if (mdIngredients.length > 0) {
        console.log(`[normalize] Ingredients: markdown fallback (${mdIngredients.length} items) — JSON was empty`)
        return mdIngredients
      }
    }
    console.log(`[normalize] Ingredients: using JSON (${jsonCount} items)`)
    return fromJson.filter(Boolean)
  }

  /** Extract numbered instruction steps from markdown (any heading containing "instruction"). */
  const extractMdInstructions = (md: string): { step: number; text: string }[] => {
    // Find the instruction heading, then capture text until the next H2 heading.
    const headingRe = /^#{1,3}\s+[^#\n]*instructions?[^#\n]*$/im
    const headingMatch = md.match(headingRe)
    if (!headingMatch) return []
    const startIdx = md.indexOf(headingMatch[0]) + headingMatch[0].length
    const rest = md.substring(startIdx)
    // Stop at next H2 (or H1), NOT H3 — H3 sub-headings (### Step N) are the steps we want to parse.
    const nextHeading = rest.search(/^#{1,2}\s/m)
    const sectionText = nextHeading >= 0 ? rest.substring(0, nextHeading) : rest
    // Extract step blocks — split by "### N." or "### Step N" boundaries.
    // Gemini uses both formats: "### Step 1: Title" and "### 1. Title".
    const stepBlocks = sectionText.split(/\n(?=###\s+(?:Step\s+)?\d+[\.:\-—])/)
    const result: { step: number; text: string }[] = []
    for (const block of stepBlocks) {
      const trimmed = block.trim()
      if (!trimmed) continue
      // First line is "### Step N: Title" or "### N. Title" or "### N — Title"
      const firstLineEnd = trimmed.indexOf("\n")
      const firstLine = firstLineEnd >= 0 ? trimmed.substring(0, firstLineEnd) : trimmed
      const body = firstLineEnd >= 0 ? trimmed.substring(firstLineEnd + 1).trim() : ""
      // Match "### Step N: Title" or "### N. Title" or "### N — Title"
      const stepMatch = firstLine.match(/^###\s+(?:Step\s+)?(\d+)[\.:\-—\s]+(.+)/)
      if (!stepMatch) {
        // Fallback: try older patterns like "**Step N**" or "N. text"
        const altMatch = trimmed.match(/^(?:\*\*Step\s+(\d+)\*\*[:\-—]\s*(.+)|Step\s+(\d+)\s*[—\-]\s*(.+)|^(\d+)\.\s+(.+))/m)
        if (altMatch) {
          const num = parseInt(altMatch[1] ?? altMatch[3] ?? altMatch[5] ?? "0", 10)
          const title = (altMatch[2] ?? altMatch[4] ?? altMatch[6] ?? "").trim()
          const altBody = trimmed.substring(altMatch[0].length).trim()
          const fullText = (title + "\n" + altBody).trim()
          if (fullText.length > 10) result.push({ step: num || result.length + 1, text: fullText })
        }
        continue
      }
      const num = parseInt(stepMatch[1], 10)
      const title = stepMatch[2].trim()
      const fullText = (title + "\n" + body).trim()
      if (fullText.length > 10) result.push({ step: num, text: fullText })
    }
    return result
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

    const jsonSteps = fromJson.filter(x => x.text.length > 0).length
    // Fall back to markdown ONLY when JSON is completely empty
    if (jsonSteps === 0 && fallbackMd) {
      const mdSteps = extractMdInstructions(fallbackMd)
      if (mdSteps.length > 0) {
        console.log(`[normalize] Instructions: markdown fallback (${mdSteps.length} steps) — JSON was empty`)
        return mdSteps
      }
    }
    console.log(`[normalize] Instructions: using JSON (${jsonSteps} steps)`)
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
    imagePrompt: (() => { const s = str(raw.imagePrompt); return (s && s !== "undefined") ? s.substring(0, 200) : ""; })(),
    jsonLd: parseJsonLd(raw.jsonLd),
  }
}

// USDA protein → temperature map (same as quality-gate.ts PROTEIN_RULES)
const PROTEIN_TEMPS: Record<string, string> = {
  chicken: "165°F / 74°C", turkey: "165°F / 74°C", duck: "165°F / 74°C",
  poultry: "165°F / 74°C", quail: "165°F / 74°C",
  "ground beef": "160°F / 71°C", "ground pork": "160°F / 71°C",
  "ground lamb": "160°F / 71°C", "ground meat": "160°F / 71°C",
  beef: "145°F / 63°C", steak: "145°F / 63°C", lamb: "145°F / 63°C",
  veal: "145°F / 63°C",
  pork: "145°F / 63°C", ham: "145°F / 63°C",
  salmon: "145°F / 63°C", tuna: "145°F / 63°C", cod: "145°F / 63°C",
  halibut: "145°F / 63°C", trout: "145°F / 63°C",
  shrimp: "145°F / 63°C", scallop: "145°F / 63°C",
  fish: "145°F / 63°C", seafood: "145°F / 63°C",
}

/**
 * Injects missing USDA temperatures into instruction text and temperature field.
 * Opus 4.8 consistently fails to include beef/pork/fish temps (chicken is fine).
 * This is a deterministic safety net — same principle as buildDefaultPrompt().
 */
function injectUsdaTemps(
  instructions: { step: number; text: string; temperature?: string }[],
  ingredients: string[],
): { step: number; text: string; temperature?: string }[] {
  const lowerText = ingredients.join(" ").toLowerCase()

  // Find which proteins need temperatures
  const requiredTemps = new Set<string>()
  for (const [protein, temp] of Object.entries(PROTEIN_TEMPS)) {
    if (lowerText.includes(protein)) requiredTemps.add(temp)
  }

  if (requiredTemps.size === 0) return instructions

  // Check if all required temps are already present in any instruction text or temperature field
  const existingTemps = new Set(
    instructions.flatMap(i => {
      const temps: string[] = []
      const combined = `${i.text} ${i.temperature ?? ""}`.toLowerCase()
      for (const t of requiredTemps) {
        // Match "145°F" or "145°F / 63°C" or "63°C" — any variation
        const parts = t.split(" / ")
        if (parts.some(p => combined.includes(p.toLowerCase()))) temps.push(t)
      }
      return temps
    })
  )

  const missing = new Set([...requiredTemps].filter(t => !existingTemps.has(t)))
  if (missing.size === 0) return instructions

  // Inject missing temps into the most relevant step (first step mentioning cooking/heat)
  return instructions.map((inst) => {
    const text = inst.text.toLowerCase()
    const isCookingStep = /cook|sear|grill|roast|bake|fry|sauté|brown|heat|sizzle|flip|internal|thermometer/i.test(text)
    const alreadyHasTemp = inst.text.includes("°F") || inst.text.includes("°C") || (inst.temperature?.length ?? 0) > 0
    const needsInjection = isCookingStep && !alreadyHasTemp && missing.size > 0

    if (!needsInjection) return inst

    // Take one missing temp and inject it
    const temp = [...missing][0]
    missing.delete(temp)
    const tempSuffix = ` until the internal temperature reaches ${temp} on an instant-read thermometer`

    // Don't add if text already ends similarly
    if (inst.text.toLowerCase().includes("internal temperature")) return inst

    return {
      ...inst,
      text: inst.text.replace(/\.\s*$/, "") + tempSuffix + ".",
      temperature: inst.temperature || temp,
    }
  })
}

export function recipeArticleToChefAugustinOutput(r: RecipeArticle): ChefAugustinOutput {
  // jsonLd is a JSON string from the LLM — parse it to an object for DB storage
  let parsedJsonLd: Record<string, unknown> = {}
  if (typeof r.jsonLd === "string") {
    try { parsedJsonLd = JSON.parse(r.jsonLd) } catch { /* leave empty */ }
  } else if (typeof r.jsonLd === "object" && r.jsonLd !== null) {
    parsedJsonLd = r.jsonLd as unknown as Record<string, unknown>
  }

  const rawInstructions = Array.isArray(r.instructions) ? r.instructions.map((i: unknown) => {
    if (i && typeof i === "object") {
      const obj = i as Record<string, unknown>
      return { step: Number(obj.step ?? 0), text: String(obj.text ?? obj.instruction ?? ""), temperature: obj.temperature ? String(obj.temperature) : undefined }
    }
    return { step: 0, text: String(i ?? "") }
  }) : []

  const ingredientNames = Array.isArray(r.ingredients)
    ? r.ingredients.map((i: unknown) => typeof i === "string" ? i : String((i as any)?.name ?? (i as any)?.ingredient ?? ""))
    : []

  // Inject missing USDA temperatures — safety net for Opus blind spot on beef/pork/fish
  const enrichedInstructions = injectUsdaTemps(rawInstructions, ingredientNames)

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
    instructions: enrichedInstructions,
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
    /^([\d¼½¾⅓⅔⅛⅜⅝⅞][\.\d\/\s]*(?:\s*(?:cup|tablespoon|teaspoon|ounce|oz|pound|lb|gram|g|kilogram|kg|ml|liter|piece|slice|clove|pinch|dash|bag|can|jar|bunch|small|medium|large)s?)?(?:\s*\([^)]+\))*\s*)\s*(.+)/i,
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

    userPrompt += `\n\n---\nGenerate a complete ${keyword} recipe article. Follow the mega-skill exactly. Output valid JSON only.\n\nCRITICAL — USDA food safety temperatures (MANDATORY): Every protein in your ingredients must have its USDA-safe internal temperature mentioned in BOTH the step text AND the structured \`temperature\` field. Poultry (chicken/turkey/duck) → 165°F / 74°C. Ground meat (beef/pork/lamb) → 160°F / 71°C. Beef/lamb/veal whole muscle → 145°F / 63°C. Pork whole muscle → 145°F / 63°C. Fish/seafood → 145°F / 63°C. Missing any required temperature = automatic rejection. No exceptions.\n\nCRITICAL — imagePrompt: Write a 100-150 word food photography prompt following §6 of the system instructions. Use Canon EOS R5, directional lighting, specific surface (material+texture), hex colors from real ingredients, and the mandatory negative tail verbatim. Do NOT write "undefined" or leave empty.`

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
