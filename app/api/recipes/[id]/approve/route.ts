import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { inngest } from "@/lib/inngest/client"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth check
  const cookieStore = await cookies()
  const token = cookieStore.get("dashboard_auth")?.value
  if (!token || token !== process.env.DASHBOARD_SECRET_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  // 2. Envoyer l'événement d'approbation à Inngest
  //    Le workflow reprend à l'étape waitForEvent avec Agent 4
  await inngest.send({
    name: "recipe/approved",
    data: { recipeId: numericId },
  })

  return NextResponse.json({ status: "approved" })
}
