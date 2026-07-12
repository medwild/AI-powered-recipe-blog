import { describe, it, expect, vi, beforeEach } from "vitest"
import { insertContextualLinks } from "@/lib/internal-linker"

// Mock data factory for queries
const ALL_RECIPES = [
  {
    id: 2,
    slug: "lemon-chicken-for-two",
    title: "Lemon Chicken for Two",
    tags: ["chicken", "lemon", "one-pan"],
    contentMarkdown: "A bright lemon chicken dinner.",
  },
  {
    id: 3,
    slug: "garlic-green-beans",
    title: "Garlic Green Beans",
    tags: ["green-beans", "garlic", "quick"],
    contentMarkdown: "Quick garlic green beans side dish.",
  },
  {
    id: 4,
    slug: "chicken-marsala",
    title: "Chicken Marsala for Two",
    tags: ["chicken", "marsala", "mushroom"],
    contentMarkdown: "Classic chicken marsala scaled for two.",
  },
]

// Mock the DB queries
vi.mock("@/lib/queries", () => ({
  getPublishedRecipes: vi.fn(() => Promise.resolve(ALL_RECIPES)),
  getRelatedRecipes: vi.fn((id: number, tags: string[]) => {
    // Simulate tag-overlap scoring (matching getRelatedRecipes in queries.ts)
    const scored = ALL_RECIPES
      .filter((r) => r.id !== id)
      .map((r) => ({
        ...r,
        score: r.tags.filter((t: string) => tags.includes(t)).length,
      }))
      .filter((r) => (r.score as number) > 0)
      .sort((a, b) => (b.score as number) - (a.score as number))
      .slice(0, 5)
    return Promise.resolve(scored)
  }),
}))

describe("insertContextualLinks", () => {
  const RECIPE_ID = 1
  const TAGS = ["chicken", "lemon", "one-pan"]

  it("inserts a link for a matching recipe title phrase", async () => {
    const markdown = [
      "## Chicken Piccata for Two",
      "",
      "This chicken piccata is a quick weeknight dinner. The lemon-butter sauce",
      "comes together in minutes.",
      "",
      "Serve it with steamed green beans for a complete meal.",
    ].join("\n")

    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)

    // Should contain at least one link to a matching recipe
    expect(result).toContain("/recettes/")
    expect(result).toContain("garlic-green-beans")
  })

  it("never links to the current recipe", async () => {
    const markdown = "## Lemon Chicken for Two\n\nThis is my lemon chicken recipe."
    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)

    // Should NOT link to itself even though "Lemon Chicken" matches recipe id:2
    // The recipeId check prevents self-links
    expect(result).not.toContain(`/recettes/${RECIPE_ID}`)
  })

  it("inserts at most 1 link per paragraph", async () => {
    const markdown = [
      "## Chicken Piccata",
      "",
      "This chicken dish pairs well with lemon chicken and chicken marsala.",
      "",
      "Another paragraph about garlic green beans as a side.",
    ].join("\n")

    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)

    // Count links per paragraph
    const paragraphs = result.split("\n\n")
    for (const p of paragraphs) {
      const linkCount = (p.match(/\[.*?\]\(\/recettes\//g) ?? []).length
      expect(linkCount).toBeLessThanOrEqual(1)
    }
  })

  it("returns unchanged markdown when no matches found", async () => {
    const markdown = "## Unique Dish\n\nSomething completely unrelated to any recipe."
    const result = await insertContextualLinks(markdown, RECIPE_ID, ["unique"])

    expect(result).toBe(markdown)
  })

  it("preserves existing markdown structure", async () => {
    const markdown = [
      "## Title",
      "",
      "This is a **bold** statement with `code` and a [link](https://example.com).",
      "",
      "Green beans are great with chicken marsala.",
    ].join("\n")

    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)

    // Bold text preserved
    expect(result).toContain("**bold**")
    // Code preserved
    expect(result).toContain("`code`")
    // Existing links preserved
    expect(result).toContain("[link](https://example.com)")
  })

  it("enforces 200-word spacing between links for recipes >= 400 words", async () => {
    // Total word count > 400 so spacing enforcement kicks in.
    // First link at ~word 3 in paragraph 1; second candidate at ~word 14
    // in paragraph 2 (distance = 11 < 200 → blocked).
    // Third paragraph is 400+ words of padding for total > 400.
    const pad = (n: number) => Array(n).fill("test").join(" ")

    const markdown = [
      "## Chicken Lemon",
      "",
      "This lemon chicken is great.",   // 5 words, link at ~word 3
      "",
      "We also love green beans with this.",  // 8 words, candidate at ~word 14
      "",
      pad(400),  // 400 words → total ~416 > 400 ✓
    ].join("\n")

    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)
    const links = result.match(/\[.*?\]\(\/recettes\/.*?\)/g) ?? []

    // Only the first link should pass the spacing check
    expect(links.length).toBe(1)
    // The second link ("green" → garlic-green-beans) should be blocked
    expect(result).not.toContain("[green](/recettes/garlic-green-beans)")
  })

  it("does not enforce spacing for short recipes under 400 words", async () => {
    // Under 400 words total — spacing rule should NOT apply,
    // so links close together are permitted.
    const markdown = [
      "## Chicken Lemon",
      "",
      "This lemon chicken is great.",
      "",
      "We also love green beans with this dish.",
    ].join("\n")

    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)
    const links = result.match(/\[.*?\]\(\/recettes\/.*?\)/g) ?? []

    // Both paragraphs should get links despite being within 200 words
    expect(links.length).toBe(2)
  })

  it("does not match inside hyphenated compound words", async () => {
    const markdown = [
      "## Side Dish",
      "",
      "These garlic green-beans are a perfect side.",
      "",
      "We also love lemon chicken with this.",
    ].join("\n")

    const result = await insertContextualLinks(markdown, RECIPE_ID, TAGS)

    // "green" in "green-beans" should NOT be matched as it's hyphenated
    // (would produce broken output like [green](/recettes/...)-beans)
    expect(result).not.toContain("](/recettes/)-beans")
    expect(result).not.toContain("[green](/recettes/garlic-green-beans)")

    // "lemon chicken" should still be matched normally (not hyphenated)
    expect(result).toContain("/recettes/lemon-chicken-for-two")
  })
})
