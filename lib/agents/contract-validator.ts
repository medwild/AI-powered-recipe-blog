/**
 * Contract Validator — Prevents silent field name mismatches between
 * LLM skill output schemas and TypeScript types.
 *
 * Problem: Skills define JSON schemas in Markdown (§Output Schema),
 * code defines TypeScript types. When they diverge (e.g., the skill
 * outputs `aiScore` but the TS type expects `score_ia_estimation`),
 * the value is silently lost (defaults to 0, [], or undefined).
 *
 * Solution: After every agent LLM call, validate that ALL required
 * fields are present. Log warnings for unexpected fields (potential
 * skill/code misalignment). Fail fast for critical contract violations.
 *
 * Usage:
 *   const raw = await runTextAndParseJson<T>(...)
 *   const validated = validateContract(raw, AGENT_CONTRACTS.Auditor)
 *   // validated is guaranteed to have all required fields (or throws)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldDef = {
  /** Field name as expected by the TypeScript code */
  name: string
  /** Whether this field MUST be present. 'critical' = throw if missing. */
  required: "yes" | "no" | "critical"
  /**
   * Alternative names the LLM might use (from an older skill version,
   * or a camelCase/snake_case variant). These are mapped silently.
   */
  aliases?: string[]
  /** Optional numeric range constraint. Validates that field values fall within [min, max]. */
  range?: { min?: number; max?: number }
}

export type AgentContract = {
  /** Human-readable agent name for log messages */
  agent: string
  fields: FieldDef[]
}

// ---------------------------------------------------------------------------
// Contracts — one per agent
// ---------------------------------------------------------------------------

export const AGENT_CONTRACTS = {
  Strategist: {
    agent: "Strategist",
    fields: [
      { name: "title", required: "critical" },
      { name: "metaTitle", required: "critical" },
      { name: "metaDescription", required: "critical" },
      { name: "excerpt", required: "yes" },
      { name: "prepTime", required: "yes" },
      { name: "cookTime", required: "yes" },
      { name: "totalTime", required: "yes" },
      { name: "servings", required: "yes" },
      { name: "difficulty", required: "yes" },
      { name: "tags", required: "critical" },
      { name: "h2Sections", required: "critical" },
      { name: "semanticEntities", required: "critical" },
    ],
  } satisfies AgentContract,

  Writer: {
    agent: "Writer",
    fields: [
      { name: "title", required: "critical" },
      { name: "metaTitle", required: "critical" },
      { name: "metaDescription", required: "critical" },
      { name: "excerpt", required: "yes" },
      { name: "prepTime", required: "yes" },
      { name: "cookTime", required: "yes" },
      { name: "totalTime", required: "yes" },
      { name: "servings", required: "yes" },
      { name: "difficulty", required: "yes" },
      { name: "tags", required: "critical" },
      { name: "ingredients", required: "critical" },
      { name: "instructions", required: "critical" },
      { name: "contentMarkdown", required: "critical" },
    ],
  } satisfies AgentContract,

  Auditor: {
    agent: "Auditor",
    fields: [
      { name: "decision", required: "critical" },
      { name: "publication_readiness_score", required: "critical", aliases: ["overallScore"], range: { min: 0, max: 100 } },
      { name: "confidence_level", required: "critical" },
      { name: "content_type", required: "yes" },
      { name: "scores", required: "critical" },
      { name: "final_recommendation", required: "yes" },
      { name: "summary", required: "yes" },
      { name: "critical_issues", required: "yes" },
      { name: "major_issues", required: "yes" },
      { name: "minor_issues", required: "yes" },
      { name: "required_fixes", required: "yes" },
      { name: "evidence", required: "no" },
      { name: "rewrite_instructions", required: "no" },
    ],
  } satisfies AgentContract,

  QA: {
    agent: "QA",
    fields: [
      { name: "qaScore", required: "critical", range: { min: 0, max: 100 } },
      { name: "verdict", required: "critical" },
      { name: "checks", required: "critical" },
      { name: "summary", required: "yes" },
    ],
  } satisfies AgentContract,

  AorWriter: {
    agent: "AOR Writer",
    fields: [
      { name: "title", required: "critical" },
      { name: "slug", required: "critical" },
      { name: "category", required: "critical" },
      { name: "metaTitle", required: "yes" },
      { name: "metaDescription", required: "yes" },
      { name: "contentMarkdown", required: "critical" },
      { name: "excerpt", required: "yes" },
      { name: "linkedRecipeSlug", required: "yes" },
      { name: "linkedRecipeTitle", required: "yes" },
      { name: "anchorText", required: "yes" },
      { name: "tags", required: "critical" },
      { name: "jsonLd", required: "yes" },
    ],
  } satisfies AgentContract,

  ImagePromptOptimizer: {
    agent: "Image Prompt Optimizer",
    fields: [
      { name: "prompt", required: "critical" },
    ],
  } satisfies AgentContract,

  PinDesigner: {
    agent: "Pin Designer",
    fields: [
      { name: "pin_title", required: "critical" },
      { name: "overlay_text", required: "critical" },
      { name: "description", required: "critical" },
      { name: "image_prompt", required: "critical" },
      { name: "board", required: "critical" },
      { name: "intent", required: "critical" },
      { name: "ptra_score", required: "critical", range: { min: 0, max: 100 } },
      { name: "hashtags", required: "yes" },
    ],
  } satisfies AgentContract,
} as const satisfies Record<string, AgentContract>

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export type ValidationResult<T> = {
  /** The validated object (with alias fields mapped to canonical names) */
  data: T
  /** Warnings about potential skill/code misalignment */
  warnings: string[]
  /** Fields that were mapped from an alias */
  aliased: string[]
}

/**
 * Validates that an agent's LLM output matches the expected contract.
 *
 * - Maps alias fields to their canonical names
 * - Warns about unexpected top-level fields (potential skill/code mismatch)
 * - Warns about missing non-critical fields
 * - THROWS if critical fields are missing (fail-fast)
 *
 * The check is intentionally lightweight — no type validation, just
 * presence checks. The LLM is responsible for producing correct types;
 * this validator only catches FIELD NAME mismatches.
 */
export function validateContract<T extends Record<string, unknown>>(
  raw: T,
  contract: AgentContract,
): ValidationResult<T> {
  const warnings: string[] = []
  const aliased: string[] = []
  const rawKeys = new Set(Object.keys(raw))
  const expectedNames = new Set(contract.fields.map((f) => f.name))
  const aliasMap = new Map<string, string>()
  for (const f of contract.fields) {
    if (f.aliases) {
      for (const alias of f.aliases) {
        aliasMap.set(alias, f.name)
      }
    }
  }

  // 1. Map aliases to canonical names
  for (const [alias, canonical] of aliasMap) {
    if (alias in raw && !(canonical in raw)) {
      ;(raw as Record<string, unknown>)[canonical] = raw[alias]
      aliased.push(`${alias} → ${canonical}`)
    }
  }

  // 2. Check for missing fields
  for (const field of contract.fields) {
    const value = raw[field.name]
    const isMissing = value === undefined || value === null

    if (isMissing) {
      const msg = `[${contract.agent}] Missing field "${field.name}" (${field.required})`
      if (field.required === "critical") {
        throw new Error(
          `${msg} — contract violation. The LLM skill output schema may be out of sync with the TypeScript type. ` +
          `Check the agent skill's §Output Schema against the TS type.`,
        )
      }
      if (field.required === "yes") {
        warnings.push(`${msg} — defaulting to empty/fallback`)
      }
    }
  }

  // 3. Warn about unexpected fields (potential skill/code misalignment)
  for (const key of rawKeys) {
    if (!expectedNames.has(key) && !aliasMap.has(key)) {
      warnings.push(
        `[${contract.agent}] Unexpected field "${key}" in LLM output — ` +
        `may indicate a skill Output Schema that has diverged from the TS type. ` +
        `Update either the skill or the AgentContract.`,
      )
    }
  }

  // 4. Validate numeric ranges
  for (const field of contract.fields) {
    if (field.range) {
      const value = raw[field.name]
      if (typeof value === "number" && !isNaN(value)) {
        if (field.range.min !== undefined && value < field.range.min) {
          warnings.push(
            `[${contract.agent}] Field "${field.name}" = ${value} is below minimum ${field.range.min}`
          )
        }
        if (field.range.max !== undefined && value > field.range.max) {
          warnings.push(
            `[${contract.agent}] Field "${field.name}" = ${value} exceeds maximum ${field.range.max}`
          )
        }
      }
    }
  }

  return { data: raw, warnings, aliased }
}
