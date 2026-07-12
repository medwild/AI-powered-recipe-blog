import { describe, it, expect, vi, beforeEach } from "vitest"
import { insertContextualLinks } from "@/lib/internal-linker"

// Mock the DB queries
vi.mock("@/lib/queries", () => ({
  getPublishedRecipes: vi.fn(() => Promise.resolve([
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
  ])),
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
})
