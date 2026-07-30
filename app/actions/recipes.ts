"use server"

import { cookies, headers } from "next/headers"
import { createHash } from "crypto"
import { db } from "@/lib/db"
import { recipes, recipeRatings } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { runSeoGate } from "@/lib/seo/gate"
import type { GateResult } from "@/lib/seo/types"

async function checkAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get("dashboard_auth")?.value
  if (!token || token !== process.env.DASHBOARD_SECRET_TOKEN) {
    throw new Error("Unauthorized")
  }
}

export async function publishRecipe(id: number): Promise<{ ok: boolean; gate?: GateResult; error?: string }> {
  await checkAuth()

  // Fetch full recipe data needed for the SEO gate
  const [recipe] = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      slug: recipes.slug,
      keyword: recipes.keyword,
      metaTitle: recipes.metaTitle,
      metaDescription: recipes.metaDescription,
      contentMarkdown: recipes.contentMarkdown,
      heroImageUrl: recipes.heroImageUrl,
      jsonLd: recipes.jsonLd,
      content_type: recipes.content_type,
      status: recipes.status,
    })
    .from(recipes)
    .where(eq(recipes.id, id))

  if (!recipe) throw new Error("Recipe not found")

  // Run SEO pre-publish gate
  const gateResult = await runSeoGate({
    recipeId: recipe.id,
    title: recipe.title,
    metaTitle: recipe.metaTitle,
    metaDescription: recipe.metaDescription,
    slug: recipe.slug,
    focusKeyphrase: recipe.keyword,
    contentMarkdown: recipe.contentMarkdown,
    heroImageUrl: recipe.heroImageUrl,
    jsonLd: recipe.jsonLd as Record<string, unknown> | null,
    content_type: (recipe.content_type as "recipe" | "article") ?? "recipe",
  })

  if (gateResult.status === "BLOCK") {
    return {
      ok: false,
      gate: gateResult,
      error: `Publication blocked: ${gateResult.summary}`,
    }
  }

  // Publish
  const [row] = await db
    .update(recipes)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning({ slug: recipes.slug, content_type: recipes.content_type, category: recipes.category })

  revalidatePath("/")
  revalidatePath("/dashboard")
  if (row) {
    if (row.content_type === "article") {
      revalidatePath(`/${row.category}`)
      revalidatePath(`/${row.category}/${row.slug}`)
    } else {
      revalidatePath("/recipes")
      revalidatePath(`/recipes/${row.slug}`)
    }
  }

  return { ok: true, gate: gateResult }
}

export async function unpublishRecipe(id: number) {
  await checkAuth()
  const [row] = await db
    .update(recipes)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning({ slug: recipes.slug, content_type: recipes.content_type, category: recipes.category })

  revalidatePath("/")
  revalidatePath("/dashboard")
  if (row) {
    if (row.content_type === "article") {
      revalidatePath(`/${row.category}`)
      revalidatePath(`/${row.category}/${row.slug}`)
    } else {
      revalidatePath("/recipes")
      revalidatePath(`/recipes/${row.slug}`)
    }
  }
}

export async function deleteRecipe(id: number) {
  await checkAuth()
  const [row] = await db
    .delete(recipes)
    .where(eq(recipes.id, id))
    .returning({ slug: recipes.slug, content_type: recipes.content_type, category: recipes.category })

  revalidatePath("/dashboard")
  if (row) {
    if (row.content_type === "article") {
      revalidatePath(`/${row.category}`)
      revalidatePath(`/${row.category}/${row.slug}`)
    } else {
      revalidatePath("/recipes")
      revalidatePath(`/recipes/${row.slug}`)
    }
  }
}

export async function approveRecipe(id: number) {
  await checkAuth()
  const [recipe] = await db
    .select({ status: recipes.status })
    .from(recipes)
    .where(eq(recipes.id, id))

  if (!recipe || recipe.status !== "draft_review") {
    throw new Error("Cette recette n'est pas en attente de validation.")
  }

  await db
    .update(recipes)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(recipes.id, id))

  revalidatePath("/dashboard")
}

export async function cancelRecipe(id: number) {
  await checkAuth()
  // Vérifier que la recette est bien en cours de génération
  const [recipe] = await db
    .select({ status: recipes.status })
    .from(recipes)
    .where(eq(recipes.id, id))

  if (!recipe || recipe.status !== "generating") {
    throw new Error("Cette recette n'est pas en cours de génération.")
  }

  await db
    .update(recipes)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(recipes.id, id))

  revalidatePath("/dashboard")
}

export async function rateRecipe(
  recipeId: number,
  rating: number,
): Promise<{ ok: boolean; avg: number; count: number; error?: string }> {
  if (!recipeId || !Number.isFinite(recipeId) || recipeId < 1) {
    return { ok: false, avg: 0, count: 0, error: "Invalid recipe ID" }
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, avg: 0, count: 0, error: "Rating must be 1-5" }
  }

  // One vote per IP per recipe
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? headersList.get("x-real-ip")
    ?? "unknown"
  const ipHash = createHash("sha256").update(`${ip}:recipe-ratings`).digest("hex").substring(0, 16)

  const [existing] = await db
    .select({ id: recipeRatings.id })
    .from(recipeRatings)
    .where(and(eq(recipeRatings.recipeId, recipeId), eq(recipeRatings.ipHash, ipHash)))

  if (existing) {
    return { ok: false, avg: 0, count: 0, error: "You've already rated this recipe" }
  }

  await db.insert(recipeRatings).values({ recipeId, rating, ipHash })

  const [agg] = await db
    .select({
      avg: sql<string>`ROUND(AVG(${recipeRatings.rating})::numeric, 1)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(recipeRatings)
    .where(eq(recipeRatings.recipeId, recipeId))

  const avg = agg ? parseFloat(agg.avg) : rating
  const count = agg ? agg.count : 1

  const [recipe] = await db.select({ slug: recipes.slug }).from(recipes).where(eq(recipes.id, recipeId))
  if (recipe) revalidatePath(`/recipes/${recipe.slug}`)

  return { ok: true, avg, count }
}
