import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { slugify } from "@/lib/slug"
import { inngest } from "@/lib/inngest/client"
import { checkRateLimit } from "@/lib/rate-limit"

export const maxDuration = 30

function getDefaultIngredients(cuisine: string): string {
  const defaults: Record<string, string> = {
    "dinners-for-two": "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter, canned tomatoes, frozen vegetables, eggs",
    swedish: "salmon, rye flour, lingonberry, dill, cardamom, cream, potatoes, herring",
    finnish: "salmon, rye flour, dill, potatoes, blueberries, mushrooms, cream, cardamom",
    polish: "cabbage, potatoes, sausage, sour cream, dill, beets, mushrooms, rye",
    cuban: "plantains, black beans, rice, pork, citrus, cumin, oregano, garlic",
    french: "butter, cream, wine, shallots, herbs de Provence, garlic, cheese, bread",
  }
  return defaults[cuisine.toLowerCase()] ?? defaults["dinners-for-two"]
}

function getDefaultTechniques(cuisine: string): string {
  const defaults: Record<string, string> = {
    "dinners-for-two": "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking, quick sauces, portion scaling",
    swedish: "curing (gravlax), rye bread baking, cream-based sauces, cardamom baking",
    finnish: "rye bread baking, salmon soup making, berry desserts, slow fermentation",
    polish: "pierogi making, slow-braising, pickling, sour cream sauces",
    cuban: "slow-braising (ropa vieja), mojo marination, plantain frying, sofrito base",
    french: "sauce making, braising, pastry, knife skills, butter-based cooking",
  }
  return defaults[cuisine.toLowerCase()] ?? defaults["dinners-for-two"]
}

export async function POST(req: Request) {
  // Rate limiting — protège les quotas Serper + Cloudflare
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  const maxPerMinute = parseInt(
    process.env.RATE_LIMIT_MAX_PER_MINUTE ?? "3",
    10,
  )
  const rateLimit = checkRateLimit(`generate:${ip}`, {
    maxRequests: maxPerMinute,
    windowMs: 60_000,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Trop de requêtes. Réessaie dans quelques secondes.",
        resetInSeconds: rateLimit.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetInSeconds),
          "X-RateLimit-Remaining": "0",
        },
      },
    )
  }

  let keyword: string
  let body: Record<string, unknown>
  try {
    body = await req.json()
    keyword = (body?.keyword ?? "").toString().trim()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 })
  }

  if (!keyword) {
    return NextResponse.json({ error: "Le mot-clé est requis." }, { status: 400 })
  }

  // Keyword deduplication — prevent SEO cannibalization
  const existingPublished = await db.query.recipes.findFirst({
    where: (r, { eq, and }) => and(
      eq(r.keyword, keyword),
      eq(r.status, "published"),
    ),
    columns: { id: true, slug: true, title: true },
  })
  if (existingPublished) {
    return NextResponse.json({
      error: `Ce mot-clé est déjà publié : "${existingPublished.title}" (/${existingPublished.slug}). Le contenu dupliqué causerait une cannibalisation SEO.`,
      existingId: existingPublished.id,
    }, { status: 409 })
  }

  // Check for existing draft/failed — allow regeneration with warning
  const existingDraft = await db.query.recipes.findFirst({
    where: (r, { eq, and }) => and(
      eq(r.keyword, keyword),
      eq(r.status, "draft"),
    ),
    columns: { id: true, slug: true },
  })

  // Aor article params (Step 13 — optional)
  // generateAorArticle is now implicit: providing a valid aorCategory is sufficient.
  // The explicit generateAorArticle flag is retained for backward compatibility.
  const validAorCategories = ["techniques", "guides", "histoire", "equipement"]
  let aorCategory: string | undefined
  let aorAngle: string | undefined

  const rawAorCategory = body?.aorCategory?.toString().trim()
  if (body?.generateAorArticle === true || rawAorCategory) {
    if (!rawAorCategory || !validAorCategories.includes(rawAorCategory)) {
      return NextResponse.json(
        {
          error: `aorCategory invalide. Valeurs acceptées : ${validAorCategories.join(", ")}`,
        },
        { status: 400 },
      )
    }
    aorCategory = rawAorCategory
    aorAngle = body?.aorAngle?.toString().trim() || undefined
  }

  // Mode: content format — "google" (default, 1800-2200 words) or "pin-first" (1200-1500 words, Pinterest-optimized)
  const validModes = ["google", "pin-first"]
  let mode: string | undefined
  const rawMode = body?.mode?.toString().trim()
  if (rawMode) {
    if (!validModes.includes(rawMode)) {
      return NextResponse.json(
        { error: `mode invalide. Valeurs acceptées : ${validModes.join(", ")}` },
        { status: 400 },
      )
    }
    mode = rawMode
  }

  // Cuisine focus — makes the pipeline cuisine-agnostic
  // If not provided, defaults to "dinners-for-two" (backward compatible)
  const cuisine = body?.cuisine?.toString().trim() || "dinners-for-two"
  const cuisineIngredients = body?.cuisineIngredients?.toString().trim() ||
    getDefaultIngredients(cuisine)
  const cuisineTechniques = body?.cuisineTechniques?.toString().trim() ||
    getDefaultTechniques(cuisine)

  // Ensure a unique slug
  const base = slugify(keyword) || "recette"
  let slug = base
  let suffix = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.query.recipes.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
    })
    if (!existing) break
    suffix += 1
    slug = `${base}-${suffix}`
  }

  const [created] = await db
    .insert(recipes)
    .values({
      slug,
      keyword,
      title: keyword,
      status: "generating",
      workflowLog: [],
    })
    .returning({ id: recipes.id })

  // Fire-and-forget via Inngest : exécution fiable en arrière-plan
  // avec retry automatique et observabilité (dashboard Inngest).
  await inngest.send({
    name: "recipe/generate",
    data: {
      recipeId: created.id,
      keyword,
      cuisine,
      cuisineIngredients,
      cuisineTechniques,
      ...(aorCategory ? { aorCategory, aorAngle } : {}),
      ...(mode ? { mode } : {}),
    },
  })

  return NextResponse.json(
    { id: created.id, status: "generating" },
    {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    },
  )
}
