/**
 * Strict schema & runtime validator for Chef Augustin's static public snapshot
 * (`data/public-content.json`).
 *
 * Zero external dependencies so it runs standalone in both the private Studio
 * exporter and the public static repository build/CI checks.
 */

export interface PublicIngredient {
  name: string
  quantity?: string
}

export interface PublicInstruction {
  step: number
  text: string
}

export interface PublicRecipeRecord {
  id: number
  slug: string
  keyword: string
  title: string
  metaTitle: string | null
  metaDescription: string | null
  excerpt: string | null
  contentMarkdown: string | null
  heroImageUrl: string | null
  prepTime: string | null
  cookTime: string | null
  totalTime: string | null
  servings: string | null
  difficulty: string | null
  ingredients: PublicIngredient[]
  instructions: PublicInstruction[]
  tags: string[]
  jsonLd: Record<string, unknown> | null
  content_type: "recipe"
  category: string | null
  linked_content_id: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicArticleRecord {
  id: number
  slug: string
  keyword: string
  title: string
  metaTitle: string | null
  metaDescription: string | null
  excerpt: string | null
  contentMarkdown: string | null
  heroImageUrl: string | null
  tags: string[]
  jsonLd: Record<string, unknown> | null
  content_type: "article"
  category: string | null
  linked_content_id: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicRatingSummary {
  avg: number
  count: number
}

export interface PublicSnapshotPayload {
  schemaVersion: "1.0.0"
  sourceUpdatedAt: string | null
  contentHash: string
  counts: {
    recipes: number
    articles: number
    ratedRecipes: number
    categories: number
  }
  categories: string[]
  recipes: PublicRecipeRecord[]
  articles: PublicArticleRecord[]
  ratingsByRecipeId: Record<string, PublicRatingSummary>
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

export const FORBIDDEN_PRIVATE_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "private_field_workflowLog", pattern: /"workflowLog"\s*:|"workflow_log"\s*:/i },
  { label: "private_field_serpData", pattern: /"serpData"\s*:|"serp_data"\s*:/i },
  { label: "private_field_imageVariants", pattern: /"imageVariants"\s*:|"image_variants"\s*:/i },
  { label: "private_field_ipHash", pattern: /"ipHash"\s*:|"ip_hash"\s*:/i },
  { label: "draft_status_leak", pattern: /"status"\s*:\s*"draft"/i },
  { label: "postgres_connection_string", pattern: /postgres(?:ql)?:\/\/[^\s"']+/i },
  { label: "env_secret_name", pattern: /\b(?:DATABASE_URL|CLOUDINARY_API_SECRET|DASHBOARD_SECRET_TOKEN|SERPER_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|IDEOGRAM_API_KEY|NEON_API_KEY)\b/ },
  { label: "api_key_prefix", pattern: /\b(?:sk-ant-|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{25,})\b/ },
]

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

function isNullableString(v: unknown): v is string | null {
  return v === null || typeof v === "string"
}

function isValidIsoTimestamp(v: unknown): v is string {
  return typeof v === "string" && ISO_DATE_REGEX.test(v) && !Number.isNaN(Date.parse(v))
}

function isValidCloudinaryUrl(v: string): boolean {
  try {
    const parsed = new URL(v)
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com" && parsed.pathname.includes("/upload/")
  } catch {
    return false
  }
}

export function scanSerializedSnapshotForLeaks(serializedJson: string): string[] {
  const hits: string[] = []
  for (const rule of FORBIDDEN_PRIVATE_PATTERNS) {
    if (rule.pattern.test(serializedJson)) {
      hits.push(rule.label)
    }
  }
  return hits
}

export function validatePublicSnapshot(input: unknown): { ok: true; data: PublicSnapshotPayload } | { ok: false; errors: string[] } {
  const errors: string[] = []

  if (!isPlainObject(input)) {
    return { ok: false, errors: ["Snapshot root must be a plain JSON object."] }
  }

  if (input.schemaVersion !== "1.0.0") {
    errors.push(`Unsupported schemaVersion: ${String(input.schemaVersion)}`)
  }
  if (input.sourceUpdatedAt !== null && !isValidIsoTimestamp(input.sourceUpdatedAt)) {
    errors.push("sourceUpdatedAt must be null or a valid ISO-8601 UTC timestamp.")
  }
  if (typeof input.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(input.contentHash)) {
    errors.push("contentHash must be a 64-char lowercase SHA-256 hex digest.")
  }

  if (!isPlainObject(input.counts)) {
    errors.push("counts must be an object.")
  }
  if (!Array.isArray(input.categories) || !input.categories.every(isNonEmptyString)) {
    errors.push("categories must be an array of non-empty strings.")
  }
  if (!Array.isArray(input.recipes)) {
    errors.push("recipes must be an array.")
  }
  if (!Array.isArray(input.articles)) {
    errors.push("articles must be an array.")
  }
  if (!isPlainObject(input.ratingsByRecipeId)) {
    errors.push("ratingsByRecipeId must be an object.")
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const recipes = input.recipes as unknown[]
  const articles = input.articles as unknown[]
  const categories = input.categories as string[]
  const ratingsByRecipeId = input.ratingsByRecipeId as Record<string, unknown>
  const counts = input.counts as Record<string, unknown>

  if (counts.recipes !== recipes.length) errors.push(`counts.recipes (${counts.recipes}) !== recipes.length (${recipes.length})`)
  if (counts.articles !== articles.length) errors.push(`counts.articles (${counts.articles}) !== articles.length (${articles.length})`)
  if (counts.categories !== categories.length) errors.push(`counts.categories (${counts.categories}) !== categories.length (${categories.length})`)
  if (counts.ratedRecipes !== Object.keys(ratingsByRecipeId).length) {
    errors.push(`counts.ratedRecipes (${counts.ratedRecipes}) !== ratings keys (${Object.keys(ratingsByRecipeId).length})`)
  }

  const recipeIds = new Set<number>()
  const recipeSlugs = new Set<string>()
  const articleIds = new Set<number>()
  const articleSlugs = new Set<string>()

  const allowedRecipeKeys = new Set([
    "id", "slug", "keyword", "title", "metaTitle", "metaDescription", "excerpt",
    "contentMarkdown", "heroImageUrl", "prepTime", "cookTime", "totalTime",
    "servings", "difficulty", "ingredients", "instructions", "tags", "jsonLd",
    "content_type", "category", "linked_content_id", "publishedAt", "createdAt", "updatedAt",
  ])

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i]
    if (!isPlainObject(r)) {
      errors.push(`recipes[${i}] is not an object.`)
      continue
    }
    for (const k of Object.keys(r)) {
      if (!allowedRecipeKeys.has(k)) {
        errors.push(`recipes[${i}] contains disallowed/unexpected key "${k}".`)
      }
    }
    if (typeof r.id !== "number" || !Number.isInteger(r.id) || r.id <= 0) {
      errors.push(`recipes[${i}].id must be a positive integer.`)
    } else {
      if (recipeIds.has(r.id)) errors.push(`Duplicate recipe id: ${r.id}`)
      recipeIds.add(r.id)
    }
    if (typeof r.slug !== "string" || !SLUG_REGEX.test(r.slug)) {
      errors.push(`recipes[${i}].slug invalid: ${String(r.slug)}`)
    } else {
      if (recipeSlugs.has(r.slug)) errors.push(`Duplicate recipe slug: ${r.slug}`)
      recipeSlugs.add(r.slug)
    }
    if (!isNonEmptyString(r.keyword)) errors.push(`recipes[${i}].keyword empty`)
    if (!isNonEmptyString(r.title)) errors.push(`recipes[${i}].title empty`)
    if (r.content_type !== "recipe") errors.push(`recipes[${i}].content_type must be "recipe"`)
    if (!isNullableString(r.metaTitle)) errors.push(`recipes[${i}].metaTitle invalid`)
    if (!isNullableString(r.metaDescription)) errors.push(`recipes[${i}].metaDescription invalid`)
    if (!isNullableString(r.excerpt)) errors.push(`recipes[${i}].excerpt invalid`)
    if (!isNullableString(r.contentMarkdown)) errors.push(`recipes[${i}].contentMarkdown invalid`)
    if (r.heroImageUrl !== null) {
      if (typeof r.heroImageUrl !== "string" || !isValidCloudinaryUrl(r.heroImageUrl)) {
        errors.push(`recipes[${i}].heroImageUrl must be a valid res.cloudinary.com URL or null: ${String(r.heroImageUrl)}`)
      }
    }
    if (!isNullableString(r.prepTime) || !isNullableString(r.cookTime) || !isNullableString(r.totalTime) || !isNullableString(r.servings) || !isNullableString(r.difficulty)) {
      errors.push(`recipes[${i}] timing/serving/difficulty fields must be string | null`)
    }
    if (!Array.isArray(r.ingredients) || !r.ingredients.every((ing) => isPlainObject(ing) && isNonEmptyString(ing.name) && (ing.quantity === undefined || typeof ing.quantity === "string"))) {
      errors.push(`recipes[${i}].ingredients invalid`)
    }
    if (!Array.isArray(r.instructions) || !r.instructions.every((inst) => isPlainObject(inst) && typeof inst.step === "number" && Number.isInteger(inst.step) && inst.step >= 1 && isNonEmptyString(inst.text))) {
      errors.push(`recipes[${i}].instructions invalid`)
    }
    if (!Array.isArray(r.tags) || !r.tags.every(isNonEmptyString)) {
      errors.push(`recipes[${i}].tags must be string[]`)
    }
    if (r.jsonLd !== null && !isPlainObject(r.jsonLd)) {
      errors.push(`recipes[${i}].jsonLd must be object | null`)
    }
    if (r.publishedAt !== null && !isValidIsoTimestamp(r.publishedAt)) {
      errors.push(`recipes[${i}].publishedAt must be ISO timestamp or null`)
    }
    if (!isValidIsoTimestamp(r.createdAt)) errors.push(`recipes[${i}].createdAt invalid`)
    if (!isValidIsoTimestamp(r.updatedAt)) errors.push(`recipes[${i}].updatedAt invalid`)
  }

  const allowedArticleKeys = new Set([
    "id", "slug", "keyword", "title", "metaTitle", "metaDescription", "excerpt",
    "contentMarkdown", "heroImageUrl", "tags", "jsonLd", "content_type",
    "category", "linked_content_id", "publishedAt", "createdAt", "updatedAt",
  ])

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i]
    if (!isPlainObject(a)) {
      errors.push(`articles[${i}] is not an object.`)
      continue
    }
    for (const k of Object.keys(a)) {
      if (!allowedArticleKeys.has(k)) {
        errors.push(`articles[${i}] contains disallowed/unexpected key "${k}".`)
      }
    }
    if (typeof a.id !== "number" || !Number.isInteger(a.id) || a.id <= 0) {
      errors.push(`articles[${i}].id must be a positive integer.`)
    } else {
      if (articleIds.has(a.id)) errors.push(`Duplicate article id: ${a.id}`)
      articleIds.add(a.id)
    }
    if (typeof a.slug !== "string" || !SLUG_REGEX.test(a.slug)) {
      errors.push(`articles[${i}].slug invalid: ${String(a.slug)}`)
    } else {
      if (articleSlugs.has(a.slug)) errors.push(`Duplicate article slug: ${a.slug}`)
      articleSlugs.add(a.slug)
    }
    if (!isNonEmptyString(a.keyword)) errors.push(`articles[${i}].keyword empty`)
    if (!isNonEmptyString(a.title)) errors.push(`articles[${i}].title empty`)
    if (a.content_type !== "article") errors.push(`articles[${i}].content_type must be "article"`)
    if (!isNonEmptyString(a.category)) errors.push(`articles[${i}].category must be non-empty string`)
    if (a.heroImageUrl !== null && (typeof a.heroImageUrl !== "string" || !isValidCloudinaryUrl(a.heroImageUrl))) {
      errors.push(`articles[${i}].heroImageUrl invalid: ${String(a.heroImageUrl)}`)
    }
    if (!Array.isArray(a.tags) || !a.tags.every(isNonEmptyString)) {
      errors.push(`articles[${i}].tags must be string[]`)
    }
    if (a.linked_content_id !== null) {
      if (typeof a.linked_content_id !== "number" || !recipeIds.has(a.linked_content_id)) {
        errors.push(`articles[${i}].linked_content_id (${String(a.linked_content_id)}) does not reference a published recipe id.`)
      }
    }
    if (a.publishedAt !== null && !isValidIsoTimestamp(a.publishedAt)) {
      errors.push(`articles[${i}].publishedAt invalid`)
    }
    if (!isValidIsoTimestamp(a.createdAt)) errors.push(`articles[${i}].createdAt invalid`)
    if (!isValidIsoTimestamp(a.updatedAt)) errors.push(`articles[${i}].updatedAt invalid`)
  }

  for (const [key, val] of Object.entries(ratingsByRecipeId)) {
    const idNum = Number(key)
    if (!Number.isInteger(idNum) || !recipeIds.has(idNum)) {
      errors.push(`ratingsByRecipeId["${key}"] does not map to a published recipe id.`)
      continue
    }
    if (!isPlainObject(val) || typeof val.avg !== "number" || val.avg < 1 || val.avg > 5 || typeof val.count !== "number" || !Number.isInteger(val.count) || val.count < 1) {
      errors.push(`ratingsByRecipeId["${key}"] has invalid avg/count.`)
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, data: input as unknown as PublicSnapshotPayload }
}
