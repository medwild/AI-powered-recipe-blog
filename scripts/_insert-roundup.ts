import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })

const SLUG = "15-easy-dinner-recipes-for-two"

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
  const { db } = await import("@/lib/db")
  const { recipes } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const raw = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "roundup-outputs", `${SLUG}.json`), "utf8")) as RoundupOutput

  // --- Fix 1: metaDescription must be 150-160 chars ---
  let metaDescription = raw.metaDescription
  const trimmedCandidates = [
    "15 easy dinner recipes for two — from 20-minute garlic butter pasta to small-batch lasagna. One-pan, low-cleanup dinners, all scaled to serve exactly two.",
  ]
  metaDescription = trimmedCandidates.find((c) => c.length >= 150 && c.length <= 160) ?? metaDescription
  if (metaDescription.length < 150 || metaDescription.length > 160) {
    throw new Error(`metaDescription out of range: ${metaDescription.length} chars — fix candidates before inserting`)
  }

  // --- Fix 2: strip leading H1 from contentMarkdown (page already renders <h1>{title}) ---
  let content = raw.contentMarkdown.trim()
  if (content.startsWith("# ")) {
    content = content.split("\n").slice(1).join("\n").trim()
  }

  // --- Build jsonLd @graph: Article + ItemList (15 recipes) + FAQPage ---
  const SITE = "https://www.chefaugustin.com"
  const recipeIds = [104, 39, 7, 75, 9, 111, 54, 42, 21, 96, 106, 74, 10, 72, 110]
  const recipeRows = await db
    .select({ id: recipes.id, slug: recipes.slug, title: recipes.title })
    .from(recipes)
    .where(eq(recipes.content_type, "recipe"))
  const byId = new Map(recipeRows.map((r) => [r.id, r]))
  const itemList = recipeIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r!.title,
      url: `${SITE}/recipes/${r!.slug}`,
    }))

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: raw.title,
        description: metaDescription,
        mainEntityOfPage: `${SITE}/guides/${SLUG}`,
        datePublished: new Date().toISOString(),
      },
      {
        "@type": "ItemList",
        name: "15 Easy Dinner Recipes for Two",
        numberOfItems: itemList.length,
        itemListElement: itemList,
      },
      {
        "@type": "FAQPage",
        mainEntity: raw.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  }

  // --- Check for banned words in content ---
  const lower = content.toLowerCase()
  const bannedHits = ["probiotics", "gut health", "immune boost", "detox", "anti-inflammatory",
    "fat-burning", "miracle", "superfood", "cleanse", "cure", "all-natural",
    "clinically proven", "scientifically proven", "serp", "search results",
    "first page", "top results", "top ten", "top 10", "competitor", "seo", "ranking",
  ].filter((w) => lower.includes(w))
  if (bannedHits.length > 0) throw new Error(`BANNED WORDS in content: ${bannedHits.join(", ")}`)

  // --- Insert ---
  const now = new Date()
  const existing = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.slug, SLUG)).limit(1)
  let rowId: number
  if (existing.length > 0) {
    rowId = existing[0]!.id
    await db.update(recipes).set({
      title: raw.title,
      metaTitle: raw.metaTitle,
      metaDescription,
      excerpt: raw.excerpt,
      contentMarkdown: content,
      jsonLd,
      content_type: "article",
      category: "guides",
      linked_content_id: 104, // featured recipe → Related Recipes section
      tags: ["dinner for two", "easy dinner", "weeknight dinner", "one-pan"],
      status: "published",
      publishedAt: now,
      updatedAt: now,
    }).where(eq(recipes.id, rowId))
    console.log(`UPDATED existing row #${rowId}`)
  } else {
    const inserted = await db.insert(recipes).values({
      slug: SLUG,
      keyword: "15 easy dinner recipes for two",
      title: raw.title,
      metaTitle: raw.metaTitle,
      metaDescription,
      excerpt: raw.excerpt,
      contentMarkdown: content,
      jsonLd,
      content_type: "article",
      category: "guides",
      linked_content_id: 104,
      tags: ["dinner for two", "easy dinner", "weeknight dinner", "one-pan"],
      status: "published",
      publishedAt: now,
    }).returning({ id: recipes.id })
    rowId = inserted[0]!.id
    console.log(`INSERTED row #${rowId}`)
  }

  // --- Verify ---
  const check = await db
    .select({ id: recipes.id, slug: recipes.slug, content_type: recipes.content_type, category: recipes.category, status: recipes.status, title: recipes.title })
    .from(recipes)
    .where(eq(recipes.id, rowId))
  console.log("\n=== INSERTED ===")
  console.log(JSON.stringify(check[0], null, 2))
  console.log(`metaDescription: ${metaDescription.length} chars`)
  console.log(`content words:   ${content.trim().split(/\s+/).length}`)
  console.log(`faq in jsonLd:   ${raw.faq.length}`)
  console.log(`itemList:        ${itemList.length} recipes`)
}

main().catch((e) => { console.error(e); process.exit(1) })
