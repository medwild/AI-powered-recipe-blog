/**
 * POST /api/internal/regenerate-recipe
 *
 * Regenerates content for an EXISTING recipe with a new keyword/angle.
 * Preserves the slug, ID, and all metadata. Only updates content + SEO fields.
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { runSerpPhase } from "@/lib/pipeline/steps/serp-phase"
import { agentChefAugustinMega, recipeArticleToChefAugustinOutput } from "@/lib/pipeline/agents/chef-augustin"
import { persistFinalDraft } from "@/lib/pipeline/steps/persist-phase"
import { appendLog, logEntry } from "@/lib/pipeline/helpers"
import { qualityGate } from "@/lib/quality-gate"

export async function POST(req: Request) {
  const body = await req.json()
  const id = parseInt(body?.id, 10)
  const newKeyword = body?.keyword?.toString().trim()
  const newAngle = body?.angle?.toString().trim() || ""

  if (!id || !newKeyword) {
    return NextResponse.json({ error: "id and keyword required" }, { status: 400 })
  }

  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id))
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
  }

  // Mark as generating so status endpoint works
  await db.update(recipes).set({ status: "generating", updatedAt: new Date() }).where(eq(recipes.id, id))

  console.log(`[regenerate] #${id} "${recipe.keyword}" → "${newKeyword}" (angle: "${newAngle}")`)

  // Fire-and-forget — regeneration runs async
  runRegeneration(id, newKeyword, newAngle).catch((err) => {
    console.error(`[regenerate] Failed for #${id}:`, (err as Error).message)
  })

  return NextResponse.json({
    id,
    slug: recipe.slug,
    oldKeyword: recipe.keyword,
    newKeyword,
    status: "regenerating",
  })
}

async function runRegeneration(id: number, newKeyword: string, newAngle: string) {
  try {
    const serpResult = await runSerpPhase(id, newKeyword)
    const anglePrompt = newAngle ? `\n\nDIFFERENTIATION ANGLE: ${newAngle}` : ""

    await appendLog(id, logEntry("MegaSkill", "running",
      `Regenerating with keyword "${newKeyword}"${newAngle ? ` — angle: "${newAngle}"` : ""}`))

    const article = await agentChefAugustinMega({
      keyword: newKeyword,
      cuisine: "Easy Weeknight Dinners for Two",
      cuisineIngredients: "chicken breast, salmon, shrimp, orzo, pasta, rice, garlic, onion, olive oil, butter, canned tomatoes, frozen vegetables, feta, olives, parmesan, fresh herbs, lemon, white wine",
      cuisineTechniques: "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking, quick sauces, portion scaling, stir-frying",
      serpData: serpResult.serpText,
      citations: "",
      feedback: anglePrompt || undefined,
    })

    const wc = article.contentMarkdown?.split(/\s+/).filter(Boolean).length ?? 0
    await appendLog(id, logEntry("MegaSkill", "done", `${wc} words`))

    // Quality gate — same checks as normal pipeline (v14.3 fix: was hardcoded "PASS")
    const gateResult = await qualityGate(article)
    if (gateResult.status === "BLOCK") {
      await appendLog(id, logEntry("QualityGate", "error",
        `BLOCKED: ${gateResult.reason} — ${gateResult.errors?.join("; ")}`))
    } else {
      await appendLog(id, logEntry("QualityGate", "done", `PASS — ${wc} words`))
    }

    const legacyArticle = recipeArticleToChefAugustinOutput(article)
    await persistFinalDraft(id, legacyArticle, gateResult.status as "PASS" | "BLOCK", false)
    await db.update(recipes).set({ keyword: newKeyword, updatedAt: new Date() }).where(eq(recipes.id, id))
    await appendLog(id, logEntry("Workflow", "done", `Regenerated — ${gateResult.status} (${wc} words)`))

    console.log(`[regenerate] #${id} done — "${newKeyword}"`)
  } catch (err) {
    console.error(`[regenerate] Failed for #${id}:`, (err as Error).message)
    await db.update(recipes).set({ status: "draft", updatedAt: new Date() }).where(eq(recipes.id, id))
    await appendLog(id, logEntry("Workflow", "error", `Regeneration failed: ${(err as Error).message}`))
  }
}
