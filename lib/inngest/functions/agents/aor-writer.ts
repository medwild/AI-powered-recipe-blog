// Agent 7 — Aor Writer (Article de blog SEO)
//
// Génère un article Aor (Outer Section) orthogonal à une recette.
// Couvre un angle technique, historique, ingrédient ou équipement.
// Ne répète JAMAIS la recette — contenu 100% complémentaire.
//
// Architecture :
//   System prompt ← loadSkillContent("agent-aor-writer")  (règles, anti-duplicate, contrat)
//   User prompt   ← buildUserPrompt()                       (recette source, angle, catégorie)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"
import { validateContract, AGENT_CONTRACTS } from "@/lib/agents/contract-validator"
import type { SeoPlan } from "./strategist"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AorCategory = "techniques" | "guides" | "histoire" | "equipement"

export type AorWriterInput = {
  keyword: string
  recipeTitle: string
  recipeSlug: string
  recipeUrl: string
  seoPlan: SeoPlan
  serp: Record<string, unknown>   // StructuredSerp — évite dépendance circulaire
  aorCategory: AorCategory
  aorAngle: string | null
}

export type AorArticle = {
  title: string
  slug: string
  category: AorCategory
  metaTitle: string
  metaDescription: string
  contentMarkdown: string
  excerpt: string
  linkedRecipeSlug: string
  linkedRecipeTitle: string
  anchorText: string
  tags: string[]
  jsonLd: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(input: AorWriterInput): string {
  const angleLine = input.aorAngle
    ? `Angle éditorial imposé : "${input.aorAngle}"`
    : `Angle éditorial : DÉDUIS-LE automatiquement à partir des content_opportunities du SeoPlan et de la catégorie "${input.aorCategory}".`

  const categoryGuide: Record<AorCategory, string> = {
    techniques: "Rédige un article PÉDAGOGIQUE qui explique la SCIENCE ou la TECHNIQUE derrière la recette.",
    guides: "Rédige un GUIDE EXHAUSTIF sur un ingrédient clé de la recette.",
    histoire: "Rédige une NARRATION CULTURELLE sur l'histoire ou l'origine du plat/technique.",
    equipement: "Rédige une ANALYSE COMPARATIVE d'un équipement essentiel à la recette.",
  }

  return `Recette source :
  Titre : ${input.recipeTitle}
  URL : ${input.recipeUrl}
  Slug : ${input.recipeSlug}

Mot-clé de la recette : ${input.keyword}

IMPORTANT — MOT-CLÉ DISTINCT POUR L'ARTICLE :
L'article NE doit PAS cibler le même mot-clé que la recette ("${input.keyword}").
Déduis un mot-clé INFORMATIONNEL distinct pour l'article, basé sur l'angle et la catégorie.
Exemples :
- Recette "one-pan lemon chicken for two" → Article "why searing locks in moisture for weeknight chicken"
- Recette "slow cooker beef stew for two" → Article "how low-and-slow transforms tough cuts"
- Recette "chocolate chip cookies" → Article "how brown sugar affects cookie texture"
Le mot-clé de l'article doit refléter une intention de RECHERCHE ÉDUCATIVE, pas transactionnelle.
Utilise ce mot-clé distinct dans le title, metaTitle, H1, et slug de l'article.

${angleLine}

Catégorie Aor : ${input.aorCategory}
${categoryGuide[input.aorCategory]}

Plan SEO (SeoPlan) :
${JSON.stringify(input.seoPlan, null, 2).substring(0, 8000)}

Données SERP :
${JSON.stringify(input.serp, null, 2).substring(0, 4000)}

RÈGLE ABSOLUE — Ne répète PAS les ingrédients, étapes, ou instructions de la recette.
Produis UN lien contextuel avec ancre riche vers la recette source dans le corps du texte.
Longueur : 800-1200 mots.
Structure : H2 informatifs (pas "Ingredients", pas "Instructions").
Ton : expert pédagogique qui explique le "pourquoi", pas de "moi je" narratif.`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentAorWriter(input: AorWriterInput): Promise<AorArticle> {
  try {
    const systemPrompt = await loadSkillContent("agent-aor-writer")
    const userPrompt = buildUserPrompt(input)

    const result = await runTextAndParseJson<AorArticle>(
      systemPrompt,
      userPrompt,
      { temperature: 0.4, maxTokens: 6144 },
    )

    const validation = validateContract(result as Record<string, unknown>, AGENT_CONTRACTS.AorWriter)
    if (validation.warnings.length > 0) {
      console.warn("[AOR Writer] Contract warnings:", validation.warnings.join("; "))
    }

    return result
  } catch (err) {
    const msg = (err as Error).message
    console.error(`[AOR Writer] Failed: ${msg}`)
    throw new Error(`[AOR Writer] Generation failed: ${msg}`, { cause: err })
  }
}
