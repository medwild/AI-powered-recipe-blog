import { db } from "@/lib/db"
import { recipes, selfImprovementLogs, pinDrafts } from "@/lib/db/schema"
import type { Recipe } from "@/lib/db/schema"
import { desc, eq, and, ne, ilike, or, sql } from "drizzle-orm"

export async function getAllRecipes() {
  return db.select().from(recipes).orderBy(desc(recipes.createdAt))
}

export async function getPublishedRecipes() {
  return db
    .select()
    .from(recipes)
    .where(
      and(
        eq(recipes.status, "published"),
        eq(recipes.content_type, "recipe"),
      ),
    )
    .orderBy(desc(recipes.publishedAt))
}

export async function searchPublishedRecipes(query?: string, category?: string) {
  const conditions = [
    eq(recipes.status, "published"),
    eq(recipes.content_type, "recipe"),
  ]

  if (query) {
    const pattern = `%${query}%`
    conditions.push(
      or(
        ilike(recipes.title, pattern),
        ilike(recipes.keyword, pattern),
        ilike(recipes.excerpt, pattern),
      )!,
    )
  }

  if (category) {
    conditions.push(
      sql`${recipes.tags}::text ILIKE ${`%${category}%`}`,
    )
  }

  return db
    .select()
    .from(recipes)
    .where(and(...conditions))
    .orderBy(desc(recipes.publishedAt))
}

export async function getRecipeCategories() {
  // Use PostgreSQL to unnest tags at the DB level — no JS memory overhead
  const rows = await db.execute<{ tag: string }>(
    sql`SELECT DISTINCT jsonb_array_elements_text(${recipes.tags}) AS tag FROM ${recipes} WHERE ${recipes.status} = 'published' ORDER BY tag`
  )
  return rows.rows.map((r) => r.tag)
}

export async function getRelatedRecipes(currentId: number, tags: string[]): Promise<Recipe[]> {
  if (tags.length === 0) return []

  // Build a tag-overlap score at the DB level with LIMIT 5.
  // For each published recipe (excluding current), count how many of
  // its tags appear in the current recipe's tag list, then take top 5.
  const tagConditions = tags.map((t) =>
    sql`CASE WHEN ${recipes.tags}::text ILIKE ${`%${t}%`} THEN 1 ELSE 0 END`
  )
  const overlapExpr = sql.join(tagConditions, sql` + `)

  const rows = await db
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      heroImageUrl: recipes.heroImageUrl,
      excerpt: recipes.excerpt,
      tags: recipes.tags,
      totalTime: recipes.totalTime,
      servings: recipes.servings,
      difficulty: recipes.difficulty,
      score: sql<number>`(${overlapExpr})`.as("score"),
    })
    .from(recipes)
    .where(
      and(
        eq(recipes.status, "published"),
        eq(recipes.content_type, "recipe"),
        ne(recipes.id, currentId),
      ),
    )
    .orderBy((t) => desc(t.score))
    .limit(5)

  return rows.filter((r) => (r.score as number) > 0) as unknown as Recipe[]
}

export async function getRecipeBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.content_type, "recipe")))
  return row ?? null
}

export async function getRecipeById(id: number) {
  const [row] = await db.select().from(recipes).where(eq(recipes.id, id))
  return row ?? null
}

export async function getPublishedArticles() {
  return db
    .select()
    .from(recipes)
    .where(
      and(
        eq(recipes.status, "published"),
        eq(recipes.content_type, "article"),
      ),
    )
    .orderBy(desc(recipes.publishedAt))
}

export async function getArticleBySlug(slug: string) {
  const rows = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.slug, slug), eq(recipes.content_type, "article")))
    .limit(1)
  return rows[0] ?? null
}

/** Find the AOR article that links back to this recipe via linked_content_id. */
export async function getLinkedArticle(recipeId: number) {
  const [row] = await db
    .select({
      slug: recipes.slug,
      title: recipes.title,
      category: recipes.category,
      excerpt: recipes.excerpt,
    })
    .from(recipes)
    .where(
      and(
        eq(recipes.content_type, "article"),
        eq(recipes.linked_content_id, recipeId),
        eq(recipes.status, "published"),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function getRelatedForArticle(linkedRecipeId: number | null) {
  if (!linkedRecipeId) return []
  // Return the linked recipe + up to 2 other published recipes
  const linked = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, linkedRecipeId))
    .limit(1)
  const others = await db
    .select()
    .from(recipes)
    .where(
      and(
        eq(recipes.status, "published"),
        eq(recipes.content_type, "recipe"),
        ne(recipes.id, linkedRecipeId),
      ),
    )
    .limit(2)
  return [...linked, ...others]
}

// ---------------------------------------------------------------------------
// Calibration — AI Score analytics
// ---------------------------------------------------------------------------

export type CalibrationStats = {
  /** Total number of data points (articles analyzed) */
  totalDataPoints: number
  /** Average AI Score across all articles */
  averageAiScore: number
  /** Lowest AI Score recorded */
  minAiScore: number
  /** Highest AI Score recorded */
  maxAiScore: number
  /** AI Score trend: average of last 10 vs overall average */
  recentAverageAiScore: number
  /** Is the calibration ready for v2.0 formula? (50+ data points) */
  calibrationReady: boolean
  /** Per-criterion average scores */
  criteriaAverages: { criterion: string; averageScore: number; count: number }[]
  /** Per-tag AI Score averages */
  tagAverages: { tag: string; averageAiScore: number; count: number }[]
  /** Total lessons by source */
  sourceBreakdown: { source: string; count: number }[]
}

/**
 * Computes AI Score calibration statistics from self_improvement_logs.
 *
 * Used by:
 * - GET /api/self-improvement/calibration (dashboard visibility)
 * - Strategist agent (context-aware planning based on calibration data)
 */
export async function getCalibrationStats(): Promise<CalibrationStats> {
  // --- AI Score entries (criterion = "ai_score") ---
  const aiScoreRows = await db
    .select({
      score: selfImprovementLogs.score,
      createdAt: selfImprovementLogs.createdAt,
    })
    .from(selfImprovementLogs)
    .where(eq(selfImprovementLogs.criterion, "ai_score"))

  const scores = aiScoreRows
    .map((r) => parseFloat(r.score ?? ""))
    .filter((n) => !isNaN(n))

  const totalDataPoints = scores.length
  const averageAiScore =
    totalDataPoints > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / totalDataPoints)
      : 0
  const minAiScore = totalDataPoints > 0 ? Math.min(...scores) : 0
  const maxAiScore = totalDataPoints > 0 ? Math.max(...scores) : 0

  // Recent trend — last 10 entries sorted by date
  const sorted = [...aiScoreRows]
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    )
    .slice(0, 10)
  const recentScores = sorted
    .map((r) => parseFloat(r.score ?? ""))
    .filter((n) => !isNaN(n))
  const recentAverageAiScore =
    recentScores.length > 0
      ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
      : 0

  const calibrationReady = totalDataPoints >= 50

  // --- Per-criterion averages (exclude ai_score and qa_verdict meta-entries) ---
  const criterionRows = await db
    .select({
      criterion: selfImprovementLogs.criterion,
      score: selfImprovementLogs.score,
    })
    .from(selfImprovementLogs)
    .where(
      and(
        sql`${selfImprovementLogs.criterion} IS NOT NULL`,
        sql`${selfImprovementLogs.criterion} NOT IN ('ai_score', 'qa_verdict')`,
      ),
    )

  const criterionMap = new Map<
    string,
    { total: number; count: number }
  >()
  for (const row of criterionRows) {
    const s = parseFloat(row.score ?? "")
    if (isNaN(s)) continue
    const key = row.criterion!
    const entry = criterionMap.get(key) ?? { total: 0, count: 0 }
    entry.total += s
    entry.count++
    criterionMap.set(key, entry)
  }
  const criteriaAverages = Array.from(criterionMap.entries())
    .map(([criterion, { total, count }]) => ({
      criterion,
      averageScore: Math.round((total / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => a.averageScore - b.averageScore)

  // --- Per-tag AI Score averages ---
  const tagRows = await db
    .select({
      score: selfImprovementLogs.score,
      tags: selfImprovementLogs.tags,
    })
    .from(selfImprovementLogs)
    .where(eq(selfImprovementLogs.criterion, "ai_score"))

  const tagMap = new Map<string, { total: number; count: number }>()
  for (const row of tagRows) {
    const s = parseFloat(row.score ?? "")
    if (isNaN(s)) continue
    const tagList = row.tags ?? []
    for (const tag of tagList) {
      const entry = tagMap.get(tag) ?? { total: 0, count: 0 }
      entry.total += s
      entry.count++
      tagMap.set(tag, entry)
    }
  }
  const tagAverages = Array.from(tagMap.entries())
    .map(([tag, { total, count }]) => ({
      tag,
      averageAiScore: Math.round(total / count),
      count,
    }))
    .sort((a, b) => a.averageAiScore - b.averageAiScore)

  // --- Source breakdown ---
  const sourceRows = await db
    .select({ source: selfImprovementLogs.source })
    .from(selfImprovementLogs)

  const sourceMap = new Map<string, number>()
  for (const row of sourceRows) {
    const src = row.source ?? "unknown"
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1)
  }
  const sourceBreakdown = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalDataPoints,
    averageAiScore,
    minAiScore,
    maxAiScore,
    recentAverageAiScore,
    calibrationReady,
    criteriaAverages,
    tagAverages,
    sourceBreakdown,
  }
}

import { pipelineErrors, type NewPipelineError } from "@/lib/db/schema"

export async function logPipelineError(params: {
  recipeId: number
  stepName: string
  errorType: "timeout" | "parse" | "rate_limit" | "llm_unavailable" | "unknown"
  message: string
  severity: "warning" | "degraded" | "critical"
}) {
  return db.insert(pipelineErrors).values(params as NewPipelineError)
}

/** Get all pin drafts for a recipe, ordered by PTRA score descending. */
export async function getPinDraftsForRecipe(recipeId: number) {
  return db
    .select()
    .from(pinDrafts)
    .where(eq(pinDrafts.recipeId, recipeId))
    .orderBy(desc(pinDrafts.ptraScore))
}
