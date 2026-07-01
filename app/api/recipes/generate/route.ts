import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { slugify } from "@/lib/slug"
import { inngest } from "@/lib/inngest/client"
import { checkRateLimit } from "@/lib/rate-limit"

export const maxDuration = 30

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

  // Aor article params (Step 13 — optional)
  const validAorCategories = ["techniques", "guides", "histoire", "equipement"]
  let aorCategory: string | undefined
  let aorAngle: string | undefined

  if (body?.generateAorArticle === true) {
    aorCategory = body?.aorCategory?.toString().trim()
    if (!aorCategory || !validAorCategories.includes(aorCategory)) {
      return NextResponse.json(
        {
          error: `aorCategory invalide. Valeurs acceptées : ${validAorCategories.join(", ")}`,
        },
        { status: 400 },
      )
    }
    aorAngle = body?.aorAngle?.toString().trim() || undefined
  }

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
      ...(aorCategory ? { aorCategory, aorAngle } : {}),
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
