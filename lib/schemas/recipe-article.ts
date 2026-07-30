import { z } from "zod";

// Schema constraints are MINIMAL — Anthropic FlatKey doesn't support
// minLength/maxLength on strings or minItems > 1 on arrays.
// All validation is done by the Quality Gate in code.
// additionalProperties: false is required on ALL objects (FlatKey requirement).

export const RecipeArticleSchema = z.object({
  title: z.string().describe("SEO H1, keyword first. Required."),
  metaTitle: z.string().describe("≤60 chars, keyword first. Required."),
  metaDescription: z.string().describe("150-160 chars, actionable. Required."),
  excerpt: z.string().describe("1-2 sentences, hook the reader"),
  contentMarkdown: z.string().describe("Full article in markdown: H2 sections, FAQ, internal links. Recipe title as H1, sections as H2, FAQ as H3."),
  ingredients: z.array(z.string()).min(1).describe("Each ingredient as 'quantity name, notes'. Minimum 8 items required by quality gate."),
  instructions: z.array(z.object({
    step: z.number(),
    text: z.string().describe("One action per step, with USDA temperature and visual cue"),
    duration: z.string().optional(),
    temperature: z.string().optional(),
  })).min(1).describe("Step-by-step instructions. Minimum 6 steps required by quality gate."),
  tags: z.array(z.string()).min(1).describe("Lowercase keywords: cuisine, technique, difficulty, occasion. Minimum 4 required by quality gate."),
  prepTime: z.string().describe("ISO 8601 duration, e.g. PT15M"),
  cookTime: z.string().describe("ISO 8601 duration, e.g. PT25M"),
  totalTime: z.string().describe("ISO 8601 duration, e.g. PT40M"),
  servings: z.string().describe("e.g. '2 servings'"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  jsonLd: z.record(z.string(), z.unknown()).describe("JSON-LD as an object with @graph array: Recipe, BlogPosting, FAQPage, BreadcrumbList nodes. Use '<placeholder>' for image URL."),
});

export type RecipeArticle = z.infer<typeof RecipeArticleSchema>;
