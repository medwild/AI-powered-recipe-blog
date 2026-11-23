import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireDashboardAuth } from "@/lib/auth"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireDashboardAuth(req)
  if (authError) return authError

  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  // Vérifier que la recette existe et est en attente de validation
  const [recipe] = await db
    .select({ status: recipes.status })
    .from(recipes)
    .where(eq(recipes.id, numericId))

  if (!recipe) {
    return NextResponse.json({ error: "Recette introuvable." }, { status: 404 })
  }

  if (recipe.status !== "draft_review") {
    return NextResponse.json(
      {
        error:
          "Cette recette n'est pas en attente de validation. Statut actuel : " +
          recipe.status,
      },
      { status: 400 },
    )
  }

  // 1. Mettre à jour le statut en DB
  await db
    .update(recipes)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(recipes.id, numericId))

  return NextResponse.json({ status: "approved" })
}
