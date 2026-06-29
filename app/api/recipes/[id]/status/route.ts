import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  const [recipe] = await db
    .select({ status: recipes.status, workflowLog: recipes.workflowLog })
    .from(recipes)
    .where(eq(recipes.id, numericId))

  if (!recipe) {
    return NextResponse.json({ error: "Recette introuvable." }, { status: 404 })
  }

  return NextResponse.json({
    status: recipe.status,
    workflowLog: recipe.workflowLog ?? [],
  })
}
