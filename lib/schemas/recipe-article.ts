import { z } from "zod";

export const RecipeArticleSchema = z.object({
  title: z.string().describe("SEO H1, keyword first"),
  metaTitle: z.string().max(60).describe("≤60 chars, keyword first"),
  metaDescription: z.string().min(150).max(160).describe("150-160 chars, actionable"),
  excerpt: z.string().describe("1-2 sentences, hook the reader"),
  contentMarkdown: z.string().describe("Full article in markdown: H2 sections, FAQ, [IMAGE:] placeholders, instructions integrated"),
  ingredients: z.array(z.string()).min(1).describe("Each ingredient as 'quantity name, notes' — e.g. '1 cup (140g) all-purpose flour'. Minimum 8 items required by quality gate."),
  instructions: z.array(z.object({
    step: z.number(),
    text: z.string().describe("Step description with temperature and visual cue"),
    duration: z.string().optional(),
    temperature: z.string().optional(),
  })).min(1).describe("Step-by-step instructions. Minimum 6 steps required by quality gate. Food safety gate scans this array for USDA temps."),
  tags: z.array(z.string()).min(1).describe("Keywords, cuisine, technique. Minimum 4 required by quality gate."),
  prepTime: z.string(),
  cookTime: z.string(),
  totalTime: z.string(),
  servings: z.string().describe("e.g. '2 servings'"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  imagePrompt: z.string().min(50).max(200).describe("Food photography prompt, 60-100 words. Structure: [Subject/Action/Environment]. [Lighting]. [Camera/Lens]. Sony A7R IV. One lighting source."),
  jsonLd: z.record(z.string(), z.unknown()).describe("JSON-LD structured data object (not a string). Include @graph array with Recipe (required — must have @type:'Recipe', image, recipeIngredient, recipeInstructions), BlogPosting, FAQPage, and BreadcrumbList nodes."),
});

export type RecipeArticle = z.infer<typeof RecipeArticleSchema>;
