import { z } from "zod";

export const RecipeArticleSchema = z.object({
  title: z.string().describe("SEO H1, keyword first"),
  metaTitle: z.string().max(60).describe("≤60 chars, keyword first"),
  metaDescription: z.string().min(150).max(160).describe("150-160 chars, actionable"),
  excerpt: z.string().describe("1-2 sentences, hook the reader"),
  contentMarkdown: z.string().describe("Full article in markdown: H2 sections, FAQ, [IMAGE:] placeholders, instructions integrated"),
  ingredients: z.array(z.string()).describe("Each ingredient as 'quantity name, notes' — e.g. '1 cup (140g) all-purpose flour'"),
  instructions: z.array(z.object({
    step: z.number(),
    text: z.string().describe("Step description with temperature and visual cue"),
    duration: z.string().optional(),
    temperature: z.string().optional(),
  })).describe("Step-by-step instructions. Food safety gate scans this array for USDA temps."),
  tags: z.array(z.string()).describe("Keywords, cuisine, technique"),
  prepTime: z.string(),
  cookTime: z.string(),
  totalTime: z.string(),
  servings: z.string().describe("e.g. '2 servings'"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  imagePrompt: z.string().max(120).describe("Food photography prompt, 60-100 words, ≤120"),
  jsonLd: z.object({
    "@context": z.literal("https://schema.org"),
    "@graph": z.array(z.object({
      "@type": z.enum(["Recipe", "BlogPosting", "FAQPage", "BreadcrumbList"]),
    }).passthrough()),
  }).describe("@graph: Recipe + BlogPosting + FAQPage + BreadcrumbList. Validé par eval-recipe.ts, pas par la gate."),
});

export type RecipeArticle = z.infer<typeof RecipeArticleSchema>;
