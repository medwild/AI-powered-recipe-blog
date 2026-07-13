// lib/culinary-validator.ts
// CulinaryValidator — Deterministic recipe coherence checks.
//
// Validates ingredient ratios, cook time consistency, serving sizes,
// and temperature realism. Pure functions — no API calls, no DB.
// All checks are warning-only (LLMs can explain edge cases).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CulinaryValidationError {
  field: string
  severity: "error" | "warning"
  message: string
}

export interface Ingredient {
  name?: string | null
  quantity?: string | null
}

export interface Instruction {
  text?: string | null
  duration?: string | null
  temperature?: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts numbers from a string like "2 cups", "1.5 lbs", "3 cloves" */
function extractNumber(input: string | null | undefined): number | null {
  if (!input) return null
  const match = input.match(/(\d+\.?\d*)/)
  return match ? parseFloat(match[1]) : null
}

/** Extracts minutes from time strings like "15 min", "1 hour", "1h30m" */
function parseMinutes(input: string | null | undefined): number | null {
  if (!input) return null
  const normalized = input.toLowerCase().trim()
  let total = 0
  const hourMatch = normalized.match(/(\d+)\s*(?:hours?|hrs?|h)/)
  if (hourMatch) total += parseInt(hourMatch[1], 10) * 60
  const minMatch = normalized.match(/(\d+)\s*(?:minutes?|mins?|m(?!s))/)
  if (minMatch) total += parseInt(minMatch[1], 10)
  // Fallback: just a number
  if (total === 0) {
    const numMatch = normalized.match(/(\d+)/)
    if (numMatch) total = parseInt(numMatch[1], 10)
  }
  return total > 0 ? total : null
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Checks for suspicious ingredient ratios.
 * Common LLM hallucinations: massive quantities for small servings,
 * structural ingredients out of proportion.
 */
export function validateIngredientRatios(
  ingredients: Ingredient[] | null | undefined,
  servings: string | null | undefined,
): CulinaryValidationError[] {
  const errors: CulinaryValidationError[] = []
  if (!ingredients?.length) return errors

  const servingCount = extractNumber(servings)
  const defaultServings = servingCount ?? 2

  for (const ing of ingredients) {
    const name = (ing.name ?? "").toLowerCase()
    const qty = ing.quantity ?? ""

    // Protein check: >1 lb per person is suspicious for a dinner recipe
    const lbs = extractNumber(qty)
    if (lbs && (name.includes("chicken") || name.includes("beef") || name.includes("pork") || name.includes("meat") || name.includes("steak") || name.includes("roast"))) {
      if (qty.toLowerCase().includes("lb") || qty.toLowerCase().includes("pound")) {
        const perPerson = lbs / defaultServings
        if (perPerson > 1) {
          errors.push({
            field: "ingredients",
            severity: "warning",
            message: `Culinary: "${ing.name}" is ${lbs} lbs for ${defaultServings} servings (${perPerson.toFixed(1)} lbs/person). For a dinner entree, 0.25-0.5 lbs per person is typical.`,
          })
        }
      }
    }

    // Flour/pasta check: >2 cups per person is suspicious
    if ((name.includes("flour") || name.includes("pasta")) && lbs) {
      if (qty.toLowerCase().includes("cup")) {
        const perPerson = lbs / defaultServings
        if (perPerson > 2) {
          errors.push({
            field: "ingredients",
            severity: "warning",
            message: `Culinary: "${ing.name}" is ${lbs} cups for ${defaultServings} servings — unusually high.`,
          })
        }
      }
    }

    // Liquid check: >2 cups per person is suspicious
    if ((name.includes("cream") || name.includes("milk") || name.includes("broth") || name.includes("stock")) && lbs) {
      if (qty.toLowerCase().includes("cup")) {
        const perPerson = lbs / defaultServings
        if (perPerson > 2) {
          errors.push({
            field: "ingredients",
            severity: "warning",
            message: `Culinary: "${ing.name}" is ${lbs} cups for ${defaultServings} servings — unusually high for a liquid ingredient.`,
          })
        }
      }
    }
  }

  return errors
}

/**
 * Checks that prep + cook time is approximately total time.
 */
export function validateCookTimes(
  prepTime: string | null | undefined,
  cookTime: string | null | undefined,
  totalTime: string | null | undefined,
): CulinaryValidationError[] {
  const errors: CulinaryValidationError[] = []

  const prepMin = parseMinutes(prepTime)
  const cookMin = parseMinutes(cookTime)
  const totalMin = parseMinutes(totalTime)

  if (prepMin !== null && cookMin !== null && totalMin !== null) {
    const sum = prepMin + cookMin
    // Allow 15 min slack (resting, cooling, etc.)
    if (Math.abs(sum - totalMin) > 30) {
      errors.push({
        field: "metadata",
        severity: "warning",
        message: `Culinary: Prep (${prepMin}min) + Cook (${cookMin}min) = ${sum}min, but Total is ${totalMin}min. Difference of ${Math.abs(sum - totalMin)}min is unusual. Check for accuracy.`,
      })
    }
  }

  return errors
}

/**
 * Checks for unrealistic baking temperatures.
 */
export function validateTemperatures(
  instructions: Instruction[] | null | undefined,
): CulinaryValidationError[] {
  const errors: CulinaryValidationError[] = []
  if (!instructions?.length) return errors

  for (const step of instructions) {
    const text = step.text ?? ""
    const tempMatch = text.match(/(\d{3})\s*°?\s*F/)
    if (tempMatch) {
      const temp = parseInt(tempMatch[1], 10)
      // Baking: suspicious above 550°F or below 200°F
      if (temp > 550) {
        errors.push({
          field: "instructions",
          severity: "warning",
          message: `Culinary: Step mentions ${temp}°F — above 550°F is unrealistic for home ovens.`,
        })
      }
      if (temp < 200 && text.toLowerCase().includes("bake")) {
        errors.push({
          field: "instructions",
          severity: "warning",
          message: `Culinary: Step says "bake" at ${temp}°F — below 200°F is too low for baking.`,
        })
      }
    }
  }

  return errors
}

/**
 * Main culinary validator — aggregates all checks.
 */
export function validateCulinary(params: {
  ingredients: Ingredient[] | null | undefined
  instructions: Instruction[] | null | undefined
  prepTime: string | null | undefined
  cookTime: string | null | undefined
  totalTime: string | null | undefined
  servings: string | null | undefined
}): CulinaryValidationError[] {
  const errors: CulinaryValidationError[] = []

  errors.push(...validateIngredientRatios(params.ingredients, params.servings))
  errors.push(...validateCookTimes(params.prepTime, params.cookTime, params.totalTime))
  errors.push(...validateTemperatures(params.instructions))

  return errors
}
