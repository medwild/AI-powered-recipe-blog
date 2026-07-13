// Agent 8 — Pin Designer
//
// Génère 5 drafts de Pinterest Pins en utilisant le framework PTRA
// (Pin Title Relevance Algorithm) pour optimiser le reach organique.
// Chaque Pin cible un intent Pinterest différent avec un angle éthique.
//
// Architecture :
//   System prompt ← loadSkillContent("agent-pin-designer")  (règles PTRA, contrat de sortie)
//   User prompt   ← buildUserPrompt()                        (recette, SEO plan, image variants)

import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/provider"
import type { ImageVariant } from "@/lib/db/schema"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PinDesignerInput {
  recipeTitle: string
  recipeSlug: string
  recipeUrl: string
  recipeExcerpt: string
  heroImageUrl: string
  imageVariants: ImageVariant[]
  ingredients: { name: string; quantity?: string }[]
  tags: string[]
  contentMarkdown: string
  microNiche: string
  targetCountry: string
}

export interface PinDraftOutput {
  // Core fields (unchanged)
  pin_title: string
  overlay_text: string
  description: string
  image_prompt: string
  board: string
  intent: string
  ptra_score: number
  hashtags: string[]

  // PTRA V2.1 fields
  /** Whether the keyword is validated as belonging to the micro-niche. */
  micro_niche_validated?: boolean
  /** Destination page quality assessment. */
  destination_quality_status?: "good" | "unknown" | "poor"
  /** How visually distinct this Pin is from the other 4 Pins (0-100). */
  visual_uniqueness?: number
  /** Breakdown of the PTRA coherence score across 6 sub-dimensions. */
  ptra_coherence_breakdown?: {
    keyword_alignment: number
    board_fit: number
    visual_quality: number
    freshness: number
    destination_quality: number
    engagement_potential: number
  }
  /** Fresh Pin Rule compliance status. */
  fresh_pin_rule_status?: "fresh" | "refresh" | "unknown"
  /** How well this Pin fits its assigned board. */
  board_fit_status?: "excellent" | "good" | "poor"
}

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(input: PinDesignerInput): string {
  // Extract H2 headings and FAQ questions from content markdown
  // Filter out question-style H2s (FAQ entries are extracted separately below)
  const h2Headings = (input.contentMarkdown.match(/^## (.+)$/gm) ?? [])
    .map(h => h.replace(/^## /, ""))
    .filter(h => !h.includes("?"))
  const faqQuestions = (input.contentMarkdown.match(/^\*\*(.+?\?)\*\*\s*$/gm) ?? [])
    .map(q => q.replace(/\*\*/g, "").trim())

  return `Generate exactly 5 Pinterest Pins for this recipe using the PTRA framework.

RECIPE:
Title: ${input.recipeTitle}
Slug: ${input.recipeSlug}
URL: ${input.recipeUrl}
Excerpt: ${input.recipeExcerpt}
Hero Image: ${input.heroImageUrl}
Image Variants: ${input.imageVariants.map(v => v.url).join(", ")}
Ingredients: ${input.ingredients.map(i => `${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join(", ")}
Tags: ${input.tags.join(", ")}

ARTICLE STRUCTURE:
H2 Sections: ${h2Headings.join(" | ")}
FAQ Questions: ${faqQuestions.join(" | ")}

MICRO-NICHE: ${input.microNiche}
TARGET COUNTRY: ${input.targetCountry}

INSTRUCTIONS:
1. Generate exactly 5 Pins — each with a DIFFERENT Pinterest intent
2. Use ETHICAL hooks — specific, verifiable, honest (NO clickbait)
3. Every image_prompt must be DISTINCT (different composition/angle/staging)
4. Image format: 2:3 (1000x1500px), safe zone 8%, Type 6 Food Photography
5. Score each Pin /100 using the 11-factor PTRA system
6. All Pins must score ≥70 — discard and regenerate any below 70
7. Output a pure JSON array — start with [, end with ]`
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function agentPinDesigner(
  input: PinDesignerInput,
): Promise<PinDraftOutput[]> {
  try {
    const systemPrompt = await loadSkillContent("agent-pin-designer")
    const userPrompt = buildUserPrompt(input)

    const result = await runTextAndParseJson<PinDraftOutput[]>(
      systemPrompt,
      userPrompt,
      { temperature: 0.5, maxTokens: 4096 },
    )

    // Validate and filter
    if (!Array.isArray(result)) {
      throw new Error(`Pin Designer returned non-array: ${typeof result}`)
    }

    // Contract validation — each pin individually
    for (const pin of result) {
      // Contract validation removed — no inter-agent contracts in v10
    }

    // Filter pins below 70 PTRA
    const valid = result.filter(p => {
      if (!p.pin_title || !p.image_prompt || !p.intent) return false
      if (typeof p.ptra_score !== "number" || p.ptra_score < 70) return false
      return true
    })

    if (valid.length === 0) {
      throw new Error("Pin Designer: all Pins scored below 70 PTRA or were invalid")
    }

    return valid.slice(0, 5) // Max 5 Pins
  } catch (err) {
    const msg = (err as Error).message
    console.error(`[Pin Designer] Failed: ${msg}`)
    throw new Error(`[Pin Designer] Generation failed: ${msg}`, { cause: err })
  }
}
