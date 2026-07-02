/**
 * Pre-Production SEO Gate — Type Definitions
 *
 * Used by the deterministic validation gate that runs before a recipe
 * or article is published. No LLM — all checks are regex, length, or
 * DB queries.
 */

/** Input shape the gate expects from the caller (Server Action). */
export interface GateInput {
  recipeId: number
  title: string
  metaTitle: string | null
  metaDescription: string | null
  slug: string
  /** The primary SEO keyword (maps to recipes.keyword in the DB). */
  focusKeyphrase: string
  contentMarkdown: string | null
  heroImageUrl: string | null
  /** Raw JSON-LD @graph object stored in the recipes.jsonLd column. */
  jsonLd: Record<string, unknown> | null
  content_type: "recipe" | "article"
}

/** A hard-blocking issue — publication MUST be refused. */
export interface BlockingIssue {
  code: string
  message: string
}

/** A non-blocking warning — publication proceeds but the issue is surfaced. */
export interface Warning {
  code: string
  message: string
}

export type GateStatus = "PASS" | "REVISE" | "BLOCK"

/** Final output of the SEO gate. */
export interface GateResult {
  status: GateStatus
  /** 0-100. Any BLOCK forces score to 0. */
  score: number
  blockingIssues: BlockingIssue[]
  warnings: Warning[]
  /** One-line summary for dashboards / logs. */
  summary: string
  checkedAt: string // ISO 8601
}
