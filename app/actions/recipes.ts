"use server"

import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { inngest } from "@/lib/inngest/client"

async function checkAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get("dashboard_auth")?.value
  if (!token || token !== process.env.DASHBOARD_SECRET_TOKEN) {
    throw new Error("Unauthorized")
  }
}

export async function publishRecipe(id: number) {
  await checkAuth()
  const [row] = await db
    .update(recipes)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning({ slug: recipes.slug })

  revalidatePath("/")
  revalidatePath("/dashboard")
  revalidatePath("/recettes")
  if (row) revalidatePath(`/recettes/${row.slug}`)
}

export async function unpublishRecipe(id: number) {
  await checkAuth()
  const [row] = await db
    .update(recipes)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning({ slug: recipes.slug })

  revalidatePath("/")
  revalidatePath("/dashboard")
  revalidatePath("/recettes")
  if (row) revalidatePath(`/recettes/${row.slug}`)
}

export async function deleteRecipe(id: number) {
  await checkAuth()
  const [row] = await db
    .delete(recipes)
    .where(eq(recipes.id, id))
    .returning({ slug: recipes.slug })

  revalidatePath("/dashboard")
  revalidatePath("/recettes")
  if (row) revalidatePath(`/recettes/${row.slug}`)
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

  // Mise à jour directe en DB (pas besoin de fetch HTTP — on est déjà côté serveur)
  await db
    .update(recipes)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(recipes.id, id))

  // Envoi de l'événement à Inngest pour réveiller le workflow
  await inngest.send({
    name: "recipe/approved",
    data: { recipeId: id },
  })

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

  // 1. Mettre à jour le statut en DB en premier
  //    Le frontend voit immédiatement l'annulation
  await db
    .update(recipes)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(recipes.id, id))

  // 2. Envoyer l'événement d'annulation à Inngest
  //    (la fonction Inngest vérifie aussi le statut dans son catch)
  await inngest.send({
    name: "recipe/cancel",
    data: { recipeId: id },
  })

  revalidatePath("/dashboard")
}
