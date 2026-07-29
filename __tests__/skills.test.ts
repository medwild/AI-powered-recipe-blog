import { describe, it, expect } from "vitest"
import {
  extractFAQFromMarkdown,
  buildFAQPageNode,
  ensureFAQPage,
} from "@/lib/skills"

// ---------------------------------------------------------------------------
// extractFAQFromMarkdown
// ---------------------------------------------------------------------------

describe("extractFAQFromMarkdown", () => {
  it("extracts single FAQ from markdown", () => {
    const md = `## Why does this recipe work?

This recipe works because the butter basting technique locks in moisture while the garlic infuses the oil. At 350°F, the Maillard reaction creates a golden crust in under 4 minutes.`

    const faqs = extractFAQFromMarkdown(md)
    expect(faqs).toHaveLength(1)
    expect(faqs[0].question).toBe("Why does this recipe work?")
    expect(faqs[0].answer).toContain("butter basting technique")
  })

  it("extracts multiple FAQs", () => {
    const md = `## FAQ

## Can I use chicken thighs instead?

Yes, chicken thighs work beautifully here. They have more fat than breasts so they stay juicier — just add 3-4 minutes to the cooking time. The internal temperature should still hit 165°F.

## How long do leftovers keep?

Store in an airtight container in the fridge for up to 3 days. Reheat gently on the stovetop with a splash of water to revive the sauce.

## Can I freeze this?

Yes, freeze for up to 2 months. Thaw overnight in the fridge and reheat on the stovetop. The sauce may separate slightly — just stir vigorously.`

    const faqs = extractFAQFromMarkdown(md)
    expect(faqs).toHaveLength(3)
    expect(faqs[0].question).toBe("Can I use chicken thighs instead?")
    expect(faqs[1].question).toBe("How long do leftovers keep?")
    expect(faqs[2].question).toBe("Can I freeze this?")
  })

  it("skips non-question headings (no question mark)", () => {
    const md = `## Ingredients

- 2 chicken breasts
- 3 cloves garlic

## Is this spicy?

Not at all — the chili flakes add warmth, not heat. Omit them entirely for a mild version.`

    const faqs = extractFAQFromMarkdown(md)
    expect(faqs).toHaveLength(1)
    expect(faqs[0].question).toBe("Is this spicy?")
  })

  it("returns empty array for no FAQs", () => {
    expect(extractFAQFromMarkdown("")).toEqual([])
    expect(extractFAQFromMarkdown("## Just a heading\n\nNo questions here.")).toEqual([])
    expect(extractFAQFromMarkdown("## Ingredients\n\n- item 1\n- item 2")).toEqual([])
  })

  it("skips question headings with too-short answers (< 20 chars)", () => {
    const md = `## Short question?

Yes.

## Real question?

This is a proper answer with at least twenty characters of real content to explain the technique.`

    const faqs = extractFAQFromMarkdown(md)
    expect(faqs).toHaveLength(1)
    expect(faqs[0].question).toBe("Real question?")
  })

  it("skips overly long 'questions' (> 100 chars = section heading)", () => {
    const q = "Is this a real question or is it actually a very long section heading that just happens to end with a question mark and goes on way too long to be a genuine FAQ entry?"
    const md = `## ${q}

Some answer content here that is actually meaningful and has enough words to pass the length check easily.`

    const faqs = extractFAQFromMarkdown(md)
    expect(faqs).toHaveLength(0)
  })

  it("handles FAQ at end of content (no closing heading)", () => {
    const md = `## Can I make this vegetarian?

You can substitute the chicken with firm tofu or king oyster mushrooms. Press the tofu for 20 minutes first, then pan-fry until golden on both sides. The sauce works exactly the same way.`

    const faqs = extractFAQFromMarkdown(md)
    expect(faqs).toHaveLength(1)
    expect(faqs[0].question).toBe("Can I make this vegetarian?")
    expect(faqs[0].answer).toContain("king oyster mushrooms")
  })

  it("stops at --- horizontal rule as boundary", () => {
    const md = `## What pan should I use?

A 10-inch cast iron skillet is ideal. Stainless steel works too but you may need more oil.

---

## Other Tips

Some non-FAQ content here.`

    const faqs = extractFAQFromMarkdown(md)
    expect(faqs).toHaveLength(1)
    expect(faqs[0].question).toBe("What pan should I use?")
    expect(faqs[0].answer).not.toContain("Other Tips")
  })
})

// ---------------------------------------------------------------------------
// buildFAQPageNode
// ---------------------------------------------------------------------------

describe("buildFAQPageNode", () => {
  it("builds a valid FAQPage schema node", () => {
    const faqs = [
      { question: "Can I freeze this?", answer: "Yes, up to 2 months in an airtight container." },
      { question: "What pan to use?", answer: "10-inch cast iron skillet works best." },
    ]

    const node = buildFAQPageNode(faqs)
    expect(node).not.toBeNull()
    expect(node!["@type"]).toBe("FAQPage")
    expect(Array.isArray(node!["mainEntity"])).toBe(true)
    expect(node!["mainEntity"]).toHaveLength(2)

    const q1 = (node!["mainEntity"] as any[])[0]
    expect(q1["@type"]).toBe("Question")
    expect(q1.name).toBe("Can I freeze this?")
    expect(q1.acceptedAnswer["@type"]).toBe("Answer")
    expect(q1.acceptedAnswer.text).toBe("Yes, up to 2 months in an airtight container.")
  })

  it("returns null for empty array", () => {
    expect(buildFAQPageNode([])).toBeNull()
  })

  it("returns null for null/undefined input", () => {
    // @ts-expect-error testing runtime null
    expect(buildFAQPageNode(null)).toBeNull()
    // @ts-expect-error testing runtime undefined
    expect(buildFAQPageNode(undefined)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// ensureFAQPage
// ---------------------------------------------------------------------------

describe("ensureFAQPage", () => {
  const contentWithFAQ = `## Why does this recipe work?

Butter basting locks in moisture. At 350°F, the Maillard reaction creates a golden crust.

## Can I substitute the chicken?

Yes, use firm tofu. Press for 20 minutes, then pan-fry until golden. Same sauce, same timing.

## How long do leftovers keep?

Up to 3 days in the fridge. Reheat on the stovetop with a splash of water.`

  it("keeps existing valid FAQPage unchanged", () => {
    const jsonLd = {
      "@graph": [
        { "@type": "Recipe", name: "Test" },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Existing Q?",
              acceptedAnswer: { "@type": "Answer", text: "Existing A." },
            },
          ],
        },
      ],
    }

    const result = ensureFAQPage(jsonLd, contentWithFAQ)
    expect(result).toEqual(jsonLd) // strict equality — unchanged
  })

  it("adds FAQPage from markdown when missing", () => {
    const jsonLd = {
      "@graph": [
        { "@type": "Recipe", name: "Test" },
      ],
    }

    const result = ensureFAQPage(jsonLd, contentWithFAQ)
    const graph = result["@graph"] as any[]
    const faqNode = graph.find(n => n["@type"] === "FAQPage")
    expect(faqNode).toBeDefined()
    expect(faqNode.mainEntity).toHaveLength(3)
    expect(faqNode.mainEntity[0].name).toBe("Why does this recipe work?")
  })

  it("skips FAQPage with empty mainEntity (replaces with extracted)", () => {
    const jsonLd = {
      "@graph": [
        { "@type": "Recipe", name: "Test" },
        { "@type": "FAQPage", mainEntity: [] },
      ],
    }

    const result = ensureFAQPage(jsonLd, contentWithFAQ)
    const graph = result["@graph"] as any[]
    const faqNodes = graph.filter(n => n["@type"] === "FAQPage")
    expect(faqNodes).toHaveLength(1)
    expect(faqNodes[0].mainEntity).toHaveLength(3)
  })

  it("returns unchanged when no FAQs in markdown", () => {
    const jsonLd = {
      "@graph": [{ "@type": "Recipe", name: "Test" }],
    }

    const result = ensureFAQPage(jsonLd, "## Ingredients\n\n- chicken\n- garlic")
    expect(result).toEqual(jsonLd)
  })

  it("handles null/empty inputs gracefully", () => {
    const jsonLd = { "@graph": [{ "@type": "Recipe" }] }
    expect(ensureFAQPage(jsonLd as any, "")).toEqual(jsonLd)
    expect(ensureFAQPage({} as any, "## FAQ?\n\nSome answer here with enough text.")).toEqual({})
  })

  it("replaces empty FAQPage with extracted one", () => {
    const jsonLd = {
      "@graph": [
        { "@type": "Recipe", name: "Test" },
        { "@type": "FAQPage" }, // no mainEntity
        { "@type": "BlogPosting" },
      ],
    }

    const result = ensureFAQPage(jsonLd, contentWithFAQ)
    const graph = result["@graph"] as any[]
    const faqNodes = graph.filter(n => n["@type"] === "FAQPage")
    expect(faqNodes).toHaveLength(1) // old empty one removed, new one added
    expect(faqNodes[0].mainEntity).toHaveLength(3)
    // BlogPosting should still be there
    expect(graph.some(n => n["@type"] === "BlogPosting")).toBe(true)
  })
})
