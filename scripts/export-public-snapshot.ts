/**
 * Read-only Neon PostgreSQL exporter for Chef Augustin's static public site.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/export-public-snapshot.ts [--out data/public-content.json] [--check-diff]
 *
 * Guarantees:
 * - Strictly read-only SQL SELECTs (published content only; 0 mutations, 0 AI calls, 0 deploys).
 * - Minimal short-lived pg.Pool (max: 1) cleanly closed in finally so Neon scales to zero.
 * - Deterministic sorting & SHA-256 contentHash for reliable change detection.
 * - Strict schema validation + private-field / secret leak scan before writing output.
 */

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { Pool } from "pg"
import {
  type PublicArticleRecord,
  type PublicRatingSummary,
  type PublicRecipeRecord,
  type PublicSnapshotPayload,
  scanSerializedSnapshotForLeaks,
  validatePublicSnapshot,
} from "./public-snapshot-schema"

function loadEnvLocalIfMissing(): void {
  if (process.env.DATABASE_URL) return
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = val
    }
  }
}

function parseArgs(argv: string[]): { outPath: string; checkDiff: boolean } {
  let outPath = path.resolve(process.cwd(), "data/public-content.json")
  let checkDiff = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--out" && argv[i + 1]) {
      outPath = path.resolve(process.cwd(), argv[i + 1])
      i++
    } else if (arg === "--check-diff") {
      checkDiff = true
    }
  }
  return { outPath, checkDiff }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      const v = obj[key]
      if (v !== undefined) {
        sorted[key] = canonicalize(v)
      }
    }
    return sorted
  }
  return value
}

function toIsoOrNull(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const d = val instanceof Date ? val : new Date(String(val))
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function toIsoRequired(val: unknown, label: string): string {
  const iso = toIsoOrNull(val)
  if (!iso) {
    throw new Error(`Missing or invalid required timestamp for ${label}`)
  }
  return iso
}

function normalizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
}

export async function buildPublicSnapshot(): Promise<{
  snapshot: PublicSnapshotPayload
  serialized: string
}> {
  loadEnvLocalIfMissing()
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Refusing to export mock/empty snapshot.")
  }

  // Minimal short-lived connection pool so Neon scales back to zero after 5 min idle
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 2000,
    connectionTimeoutMillis: 15000,
  })

  try {
    // Strict column projection: excludes workflow_log, serp_data, image_variants
    const contentResult = await pool.query(`
      SELECT
        id,
        slug,
        keyword,
        title,
        meta_title,
        meta_description,
        excerpt,
        content_markdown,
        hero_image_url,
        prep_time,
        cook_time,
        total_time,
        servings,
        difficulty,
        ingredients,
        instructions,
        tags,
        json_ld,
        content_type,
        category,
        linked_content_id,
        published_at,
        created_at,
        updated_at
      FROM recipes
      WHERE status = 'published'
      ORDER BY published_at DESC NULLS LAST, id DESC
    `)

    const ratingsResult = await pool.query(`
      SELECT
        rr.recipe_id,
        ROUND(AVG(rr.rating)::numeric, 1)::text AS avg,
        COUNT(*)::int AS count
      FROM recipe_ratings rr
      INNER JOIN recipes r ON r.id = rr.recipe_id
      WHERE r.status = 'published' AND r.content_type = 'recipe'
      GROUP BY rr.recipe_id
      ORDER BY rr.recipe_id ASC
    `)

    const recipes: PublicRecipeRecord[] = []
    const articles: PublicArticleRecord[] = []
    const categorySet = new Set<string>()
    let maxUpdatedMs = 0

    for (const row of contentResult.rows) {
      const updatedIso = toIsoRequired(row.updated_at, `row#${row.id}.updated_at`)
      const updatedMs = Date.parse(updatedIso)
      if (updatedMs > maxUpdatedMs) maxUpdatedMs = updatedMs

      const tags = normalizeStringArray(row.tags)
      for (const tag of tags) {
        categorySet.add(tag)
      }

      const contentType = row.content_type === "article" ? "article" : "recipe"

      if (contentType === "article") {
        articles.push({
          id: Number(row.id),
          slug: String(row.slug),
          keyword: String(row.keyword),
          title: String(row.title),
          metaTitle: row.meta_title ?? null,
          metaDescription: row.meta_description ?? null,
          excerpt: row.excerpt ?? null,
          contentMarkdown: row.content_markdown ?? null,
          heroImageUrl: row.hero_image_url ?? null,
          tags,
          jsonLd: (row.json_ld as Record<string, unknown> | null) ?? null,
          content_type: "article",
          category: row.category ?? null,
          linked_content_id: row.linked_content_id !== null && row.linked_content_id !== undefined ? Number(row.linked_content_id) : null,
          publishedAt: toIsoOrNull(row.published_at),
          createdAt: toIsoRequired(row.created_at, `article#${row.id}.created_at`),
          updatedAt: updatedIso,
        })
      } else {
        recipes.push({
          id: Number(row.id),
          slug: String(row.slug),
          keyword: String(row.keyword),
          title: String(row.title),
          metaTitle: row.meta_title ?? null,
          metaDescription: row.meta_description ?? null,
          excerpt: row.excerpt ?? null,
          contentMarkdown: row.content_markdown ?? null,
          heroImageUrl: row.hero_image_url ?? null,
          prepTime: row.prep_time ?? null,
          cookTime: row.cook_time ?? null,
          totalTime: row.total_time ?? null,
          servings: row.servings ?? null,
          difficulty: row.difficulty ?? null,
          ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
          instructions: Array.isArray(row.instructions) ? row.instructions : [],
          tags,
          jsonLd: (row.json_ld as Record<string, unknown> | null) ?? null,
          content_type: "recipe",
          category: row.category ?? null,
          linked_content_id: row.linked_content_id !== null && row.linked_content_id !== undefined ? Number(row.linked_content_id) : null,
          publishedAt: toIsoOrNull(row.published_at),
          createdAt: toIsoRequired(row.created_at, `recipe#${row.id}.created_at`),
          updatedAt: updatedIso,
        })
      }
    }

    const ratingsByRecipeId: Record<string, PublicRatingSummary> = {}
    for (const r of ratingsResult.rows) {
      ratingsByRecipeId[String(r.recipe_id)] = {
        avg: parseFloat(String(r.avg)),
        count: Number(r.count),
      }
    }

    // Locale-independent deterministic codepoint sort
    const categories = Array.from(categorySet).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const sourceUpdatedAt = maxUpdatedMs > 0 ? new Date(maxUpdatedMs).toISOString() : null

    const hashCore = {
      schemaVersion: "1.0.0" as const,
      sourceUpdatedAt,
      categories,
      recipes,
      articles,
      ratingsByRecipeId,
    }

    const contentHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(canonicalize(hashCore)))
      .digest("hex")

    const snapshot: PublicSnapshotPayload = {
      schemaVersion: "1.0.0",
      sourceUpdatedAt,
      contentHash,
      counts: {
        recipes: recipes.length,
        articles: articles.length,
        ratedRecipes: Object.keys(ratingsByRecipeId).length,
        categories: categories.length,
      },
      categories,
      recipes,
      articles,
      ratingsByRecipeId,
    }

    const validation = validatePublicSnapshot(snapshot)
    if (!validation.ok) {
      throw new Error(`Snapshot schema validation failed:\n- ${validation.errors.join("\n- ")}`)
    }

    const serialized = `${JSON.stringify(snapshot, null, 2)}\n`
    const leakHits = scanSerializedSnapshotForLeaks(serialized)
    if (leakHits.length > 0) {
      throw new Error(`Security leak guard tripped: ${leakHits.join(", ")}`)
    }

    return { snapshot, serialized }
  } finally {
    await pool.end()
  }
}

async function main() {
  const { outPath, checkDiff } = parseArgs(process.argv.slice(2))
  const { snapshot, serialized } = await buildPublicSnapshot()

  if (checkDiff && fs.existsSync(outPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outPath, "utf8")) as Partial<PublicSnapshotPayload>
      if (prev.contentHash === snapshot.contentHash) {
        console.log(
          JSON.stringify(
            {
              changed: false,
              contentHash: snapshot.contentHash,
              counts: snapshot.counts,
              outPath: path.relative(process.cwd(), outPath),
            },
            null,
            2,
          ),
        )
        return
      }
    } catch {
      // Existing file unreadable/invalid -> rewrite cleanly
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, serialized, "utf8")

  console.log(
    JSON.stringify(
      {
        changed: true,
        contentHash: snapshot.contentHash,
        sourceUpdatedAt: snapshot.sourceUpdatedAt,
        counts: snapshot.counts,
        byteSize: Buffer.byteLength(serialized, "utf8"),
        outPath: path.relative(process.cwd(), outPath),
      },
      null,
      2,
    ),
  )
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[export-public-snapshot] Failed:", err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
