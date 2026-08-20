import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const SLUG = "15-easy-dinner-recipes-for-two"
const OUT_DIR = path.resolve(process.cwd(), "roundup-outputs")

interface RoundupOutput {
  title: string
  metaTitle: string
  metaDescription: string
  excerpt: string
  contentMarkdown: string
  faq: Array<{ q: string; a: string }>
}

async function main() {
  const fs = await import("fs")
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // 1) Fetch the 15 curated recipes (real slugs/titles/times)
  const { db } = await import("@/lib/db")
  const { recipes } = await import("@/lib/db/schema")
  const { inArray } = await import("drizzle-orm")

  const ids = [104, 39, 7, 75, 9, 111, 54, 42, 21, 96, 106, 74, 10, 72, 110]
  const rows = await db
    .select({
      id: recipes.id, slug: recipes.slug, title: recipes.title, totalTime: recipes.totalTime,
    })
    .from(recipes)
    .where(inArray(recipes.id, ids))
    .orderBy(recipes.id)

  const ordered = ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean)
  if (ordered.length !== 15) throw new Error(`Expected 15 recipes, got ${ordered.length}`)

  const recipeList = ordered.map((r) => `- ${r!.title} (${r!.totalTime ?? "?"}, /recipes/${r!.slug})`).join("\n")

  // 2) System prompt — roundup/listicle + GEO/AI-search optimization
  const systemPrompt = `You are a senior food SEO writer for "Cooking for Two with Chef Augustin" (chefaugustin.com), a recipe blog for couples and small households. You write roundup / listicle articles that rank in Google AND get cited by AI answers (Google AI Overviews, ChatGPT, Perplexity).

TASK: Write the article "15 Easy Dinner Recipes for Two" — a numbered roundup of 15 existing recipes already published on the site. This is an EDITORIAL ARTICLE, not a recipe page: no ingredients, no steps. Each entry is a short, enticing description of one recipe, with a link to its full recipe page.

WRITING GUIDELINES (non-negotiable):
1. Structure: SEO intro → "why these recipes work" block → 15 numbered entries (H2 per entry) → FAQ (H3 Q&A) → short conclusion. Use markdown: H2 = ##, H3 = ###.
2. GEO citability: include 2-3 self-contained blocks of 130-170 words that could be quoted by an AI answer (e.g. the intro's direct answer, "what makes a recipe easy for two", "how long do these take"). Front-load the direct answer in the first 60 words. Use "X is..." definitional phrasing where natural.
3. Question-based H2 headings that match real queries (e.g. "How Long Do These Recipes Take?", "What Should I Serve With These Dinners?").
4. Short paragraphs (2-4 sentences). Use a numbered list of 15 for the roundup.
5. FAQ: 5-6 real questions with 2-4 sentence answers, conversational and specific.
6. Meta: metaTitle under 60 chars total; metaDescription 150-160 chars; excerpt one punchy sentence.
7. Word count: 2,200-2,800 words total.

VOICE: Chef Augustin, a real home cook — warm, practical, first-person ("in my kitchen"), no fake credentials, no fabricated testing counts, no invented statistics.

HARD RULES:
- NO health or wellness claims (no "boosts immunity", "anti-inflammatory", "detox", "gut health", "superfood", "fat-burning", "probiotics", "all-natural", "clinically proven", "scientifically proven").
- NO process-speak about SEO/SERP/rankings/competitors/keywords.
- NO fabricated numbers, studies, or quotes. You may reference time and pan-type (these are from the recipe data).
- Internal links: each of the 15 entries MUST link to its recipe page exactly as given in the USER message.
- Do NOT repeat an argument more than twice. Avoid the word "easy" more than once per paragraph.
- Write only the article body + meta. Return JSON only, no markdown fences.

OUTPUT JSON SCHEMA:
{
  "title": string,          // H1, ~55-65 chars, human, not keyword-stuffed
  "metaTitle": string,      // <= 60 chars
  "metaDescription": string, // 150-160 chars
  "excerpt": string,        // 1 sentence, punchy
  "contentMarkdown": string, // FULL article markdown (intro + 15 entries + FAQ + conclusion). FAQ section INCLUDED here.
  "faq": [ { "q": string, "a": string } ]  // same Q&A pairs as the FAQ section, for JSON-LD
}`

  // 3) User prompt with the recipe list
  const userPrompt = `Write the article "15 Easy Dinner Recipes for Two" for Cooking for Two with Chef Augustin.

The 15 recipes to feature (title, cook time, canonical URL) — use these EXACT titles and URLs in the entries and links:

${recipeList}

The article must introduce the roundup, explain why these recipes are great for two (weeknight practicality, one-pan convenience, small-batch portions), then present the 15 entries in a logical order (quickest first), then a FAQ, then a one-paragraph conclusion.

Return the JSON object only.`

  // 4) Call deepseek-v4-pro via the provider (LLM_PROVIDER=tokenmix in env; override model)
  const { runTextAndParseJson } = await import("@/lib/agents/provider")
  console.log(`\n[roundup] Generating with deepseek-v4-pro (${ordered.length} recipes)...`)

  const out = await runTextAndParseJson<RoundupOutput>(systemPrompt, userPrompt, {
    model: "deepseek-v4-pro",
    maxTokens: 24000,
    temperature: 0.7,
  })

  // 5) Save raw traceability
  fs.writeFileSync(path.join(OUT_DIR, `${SLUG}.json`), JSON.stringify(out, null, 2), "utf8")
  fs.writeFileSync(path.join(OUT_DIR, `${SLUG}.md`), out.contentMarkdown, "utf8")
  fs.writeFileSync(path.join(OUT_DIR, `${SLUG}-meta.json`), JSON.stringify({
    title: out.title, metaTitle: out.metaTitle, metaDescription: out.metaDescription, excerpt: out.excerpt, faq: out.faq,
  }, null, 2), "utf8")

  // 6) Summary stats
  const words = out.contentMarkdown.trim().split(/\s+/).length
  console.log(`\n=== ROUNDUP GENERATED (deepseek-v4-pro) ===`)
  console.log(`title:          ${out.title}`)
  console.log(`metaTitle:      ${out.metaTitle} (${out.metaTitle.length} chars)`)
  console.log(`metaDescription: ${out.metaDescription.length} chars`)
  console.log(`excerpt:        ${out.excerpt}`)
  console.log(`content words:  ${words}`)
  console.log(`FAQ entries:    ${out.faq.length}`)
  console.log(`\nSaved: ${OUT_DIR}/${SLUG}.json + .md`)
}

main().catch((e) => { console.error(e); process.exit(1) })
