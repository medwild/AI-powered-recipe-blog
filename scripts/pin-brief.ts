// Generate a pin brief from a published recipe — 5 pin variants with
// text overlays, descriptions, and target boards for the weekly workflow.
// Usage: npx tsx scripts/pin-brief.ts <recipeId|slug>
import dotenv from "dotenv"
import path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true })
import { db } from "../lib/db"
import { recipes } from "../lib/db/schema"
import { eq, and } from "drizzle-orm"

const ANGLE_TEMPLATES = [
  { label: "A — Titre exact", template: (t: string) => t },
  { label: "B — Temps", template: (t: string, r: any) => `${r.totalTime.replace(/[^0-9]/g, "")}-Minute ${t}` },
  { label: "C — Méthode/Accessoire", template: (t: string, r: any) => {
    const tags = (r.tags ?? []) as string[]
    if (tags.some((tag: string) => /one.pan/i.test(tag))) return `One-Pan ${t} (No Mess)`
    if (tags.some((tag: string) => /slow.cook/i.test(tag))) return `Slow Cooker ${t} — Set It & Forget It`
    if (tags.some((tag: string) => /pasta/i.test(tag))) return `${t} — Ready in ${r.totalTime}`
    return `Easy ${t} — Step by Step`
  }},
  { label: "D — Bénéfice/Résultat", template: (t: string) => `The ${t} That Actually Serves 2` },
  { label: "E — Long-tail SEO", template: (t: string) => `Small-Batch ${t} — Just 2 Servings` },
]

const BOARD_MAP: Record<string, string[]> = {
  chicken: ["Easy Chicken Dinners for Two", "Quick Weeknight Dinners for Two"],
  pasta: ["Pasta & Noodles for Two", "Quick Weeknight Dinners for Two"],
  dessert: ["Small-Batch Desserts for Two", "Romantic Dinner Ideas for Two"],
  side: ["Small-Batch Sides for Two"],
  slow_cooker: ["Slow Cooker Recipes for Two", "Comfort Food for Two"],
  one_pan: ["One-Pan Meals for Two", "Quick Weeknight Dinners for Two"],
  comfort: ["Comfort Food for Two", "Budget-Friendly Meals for Two"],
  romantic: ["Romantic Dinner Ideas for Two"],
  asian: ["Asian-Inspired Dinners for Two", "Quick Weeknight Dinners for Two"],
  balanced: ["Balanced Dinners for Two"],
  budget: ["Budget-Friendly Meals for Two", "Quick Weeknight Dinners for Two"],
  tips: ["Cooking Tips & Techniques for Two"],
}

async function main() {
  const target = process.argv[2]
  if (!target) { console.log("Usage: npx tsx scripts/pin-brief.ts <recipeId|slug>"); process.exit(1) }

  const isId = /^\d+$/.test(target)
  const recipe = isId
    ? await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, parseInt(target)) })
    : await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.slug, target) })

  if (!recipe) { console.error(`Recipe not found: ${target}`); process.exit(1) }

  const title = recipe.title || recipe.keyword || "Untitled"
  const tags = (recipe.tags ?? []) as string[]
  const tagStr = tags.join(" ").toLowerCase()

  // Determine which boards match this recipe
  let matchedBoards: string[] = []
  for (const [keyword, boards] of Object.entries(BOARD_MAP)) {
    if (tagStr.includes(keyword)) {
      for (const b of boards) { if (!matchedBoards.includes(b)) matchedBoards.push(b) }
    }
  }
  if (matchedBoards.length === 0) matchedBoards = ["Quick Weeknight Dinners for Two", "Budget-Friendly Meals for Two"]
  const primary = matchedBoards[0]
  const secondary = matchedBoards.length > 1 ? matchedBoards[1] : "Quick Weeknight Dinners for Two"
  const tertiary = matchedBoards.length > 2 ? matchedBoards[2] : "Easy Chicken Dinners for Two"

  // Generate pin description (200-300 chars)
  const baseDescription = `${title} — a small-batch dinner recipe for two people. `.substring(0, 80)
  const timePart = recipe.totalTime ? `Ready in ${recipe.totalTime}. ` : ""
  const servePart = recipe.servings ? `Serves ${recipe.servings}. ` : "Serves 2. "
  const pinDescription = `${baseDescription}${timePart}${servePart}Easy step-by-step instructions with USDA food safety temperatures. Perfect for weeknight cooking without leftovers. Click for the full recipe.`

  console.log("")
  console.log(`📌 PIN BRIEF — ${title}`)
  console.log(`   Recipe #${recipe.id} | Slug: ${recipe.slug}`)
  console.log(`   Image: ${recipe.heroImageUrl || "⚠️ No image — generate first"}`)
  console.log("")
  console.log(`📋 PIN DESCRIPTION (use for all variants):`)
  console.log(`   ${pinDescription}`)
  console.log("")
  console.log(`🗂️  BOARDS: 1) ${primary}  2) ${secondary}  3) ${tertiary}`)
  console.log("")
  console.log("─".repeat(70))
  console.log("5 PIN VARIANTS — Text overlays to add in Canva:")
  console.log("─".repeat(70))

  for (const angle of ANGLE_TEMPLATES) {
    const overlay = angle.template(title, recipe)
    console.log("")
    console.log(`[${angle.label}]`)
    console.log(`Overlay:   ${overlay}`)
    let subline = ""
    if (recipe.totalTime) subline += `${recipe.totalTime} · `
    if (recipe.difficulty) subline += `${recipe.difficulty} · `
    if (tags.length > 0) subline += tags.slice(0, 2).join(" · ")
    console.log(`Subline:   ${subline || "Small-batch · For two"}`)
  }

  console.log("")
  console.log("─".repeat(70))
  console.log("📅 SCHEDULE (Tailwind):")
  const schedule = [
    { day: "Day 1", board: primary, variant: "A — Titre exact" },
    { day: "Day 3", board: secondary, variant: "B — Temps" },
    { day: "Day 5", board: tertiary, variant: "C — Méthode" },
    { day: "Day 7", board: primary, variant: "D — Bénéfice" },
    { day: "Day 9", board: secondary, variant: "E — Long-tail SEO" },
  ]
  for (const s of schedule) {
    console.log(`   ${s.day.padEnd(6)} → ${s.board.padEnd(35)} → ${s.variant}`)
  }
  console.log("")

  // Output JSON for programmatic use
  const json = {
    recipeId: recipe.id,
    slug: recipe.slug,
    title,
    imageUrl: recipe.heroImageUrl,
    pinDescription,
    boards: [primary, secondary, tertiary],
    variants: ANGLE_TEMPLATES.map(a => ({
      angle: a.label,
      textOverlay: a.template(title, recipe),
    })),
    schedule: schedule.map(s => ({ day: s.day, board: s.board, variant: s.variant })),
  }
  console.log("// JSON output:")
  console.log(JSON.stringify(json, null, 2))
}

main().catch((err) => { console.error("❌", err); process.exit(1) })
