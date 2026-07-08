/**
 * Step 14 — Link Backfill
 *
 * After a new content is published, finds the top 5 most-related existing
 * published content and inserts 1 contextual link to the new content in each,
 * using an Editor-like LLM call to minimize content drift.
 *
 * Validation:
 *   - Link count increased by exactly 1
 *   - Anchor text is not generic ("click here", "read more")
 *   - < 20% of original content changed (length diff check)
 */

import { db } from "@/lib/db"
import { recipes, internalLinkLogs } from "@/lib/db/schema"
import { eq, and, ne, sql } from "drizzle-orm"
import { appendLog, logEntry } from "../helpers"
import { loadSkillContent } from "@/lib/skills"
import { runTextAndParseJson } from "@/lib/agents/nararouter"

const BANNED_ANCHORS = [
  "click here", "read more", "here", "learn more",
  "this article", "this recipe",
]

export async function runLinkBackfill(
  step: { run: (name: string, fn: () => Promise<void>) => Promise<void> },
  recipeId: number,
  slug: string,
  title: string,
  tags: string[],
  contentType: "recipe" | "article",
): Promise<void> {
  return step.run("link-backfill", async () => {
    try {
      await appendLog(recipeId, logEntry("Link Backfill", "running",
        "Finding related content for backfill linking"))

      // Step 1 — Find top 5 related existing content (opposite type preferred)
      const candidates = await db
        .select({
          id: recipes.id,
          slug: recipes.slug,
          title: recipes.title,
          contentMarkdown: recipes.contentMarkdown,
          tags: recipes.tags,
        })
        .from(recipes)
        .where(
          and(
            eq(recipes.status, "published"),
            eq(recipes.content_type, contentType === "recipe" ? "article" : "recipe"),
            ne(recipes.id, recipeId),
            sql`${recipes.contentMarkdown} IS NOT NULL`,
          ),
        )
        .limit(5)

      if (!candidates.length) {
        await appendLog(recipeId, logEntry("Link Backfill", "done",
          "No eligible candidates for backfill"))
        return
      }

      const systemPrompt = await loadSkillContent("agent-editor", {})

      for (const candidate of candidates) {
        // Skip if already links to this content
        const alreadyLinked = candidate.contentMarkdown?.includes(`/${slug}`) ??
          false
        if (alreadyLinked) continue

        const userPrompt = `BACKFILL TASK: Insert exactly 1 natural contextual link to this content in the most relevant section.
Do NOT change anything else. Return the FULL updated markdown.

NEW CONTENT TO LINK TO:
- URL: /${slug}
- Title: ${title}

EXISTING MARKDOWN TO UPDATE:
${candidate.contentMarkdown}

RULES:
- Insert exactly 1 link
- Anchor text must be descriptive and natural (NOT: "click here", "read more", "here", "this recipe", "this article")
- Place the link where it adds real value for the reader
- Keep ALL original content, structure, and formatting
- Return the COMPLETE markdown, identical except for the new link

Return JSON: { "updatedMarkdown": "...", "anchorText": "...", "section": "..." }`

        try {
          const result = await runTextAndParseJson<{
            updatedMarkdown: string
            anchorText: string
            section: string
          }>(systemPrompt, userPrompt, {
            temperature: 0.3,
            maxTokens: 4096,
          })

          // Validation
          if (!result?.updatedMarkdown || !result?.anchorText) continue

          const anchorLower = result.anchorText.toLowerCase()
          if (BANNED_ANCHORS.some((b) => anchorLower.includes(b))) continue

          // Count links before and after
          const linkRegex = /\]\(\/[\w-]+\/?[\w-]*\)/g
          const beforeLinks = (candidate.contentMarkdown?.match(linkRegex) ?? []).length
          const afterLinks = (result.updatedMarkdown.match(linkRegex) ?? []).length
          if (afterLinks !== beforeLinks + 1) continue

          // Content drift check: < 20% length change
          const beforeLen = (candidate.contentMarkdown ?? "").length
          const afterLen = result.updatedMarkdown.length
          if (Math.abs(afterLen - beforeLen) / beforeLen > 0.2) continue

          // Apply the update
          await db
            .update(recipes)
            .set({
              contentMarkdown: result.updatedMarkdown,
              updatedAt: new Date(),
            })
            .where(eq(recipes.id, candidate.id))

          // Log the link
          await db.insert(internalLinkLogs).values({
            sourceContentId: candidate.id,
            targetSlug: slug,
            targetContentId: recipeId,
            anchorText: result.anchorText,
            action: "backfill",
            source: "backfill",
          })

          await appendLog(recipeId, logEntry("Link Backfill", "done",
            `Backfilled link in "${candidate.title}" → anchor: "${result.anchorText}"`))
        } catch {
          // Single failure shouldn't kill the loop
          continue
        }
      }

      await appendLog(recipeId, logEntry("Link Backfill", "done",
        "Backfill complete"))
    } catch (err) {
      await appendLog(recipeId, logEntry("Link Backfill", "error",
        (err as Error).message))
    }
  })
}
