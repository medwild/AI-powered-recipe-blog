// lib/quality-gate.ts
import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { RecipeArticle } from "@/lib/schemas/recipe-article";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GateResult {
  status: "PASS" | "BLOCK";
  reason?: "duplicate" | "food_safety" | "too_short" | "banned_words";
  errors?: string[];
}

// ---------------------------------------------------------------------------
// PROTEIN_RULES — USDA food safety temperature matching
// ---------------------------------------------------------------------------

interface ProteinRule {
  keywords: string[];
  temp: string[];
  exclude?: string[];
  rule?: "fda_egg";
}

const PROTEIN_RULES: ProteinRule[] = [
  {
    keywords: ["chicken", "turkey", "duck", "goose", "poultry", "quail", "cornish hen"],
    temp: ["165°F", "74°C"],
    exclude: ["stock", "broth", "powder", "bouillon", "fat", "liver", "gizzard"],
  },
  {
    keywords: ["ground beef", "ground pork", "ground lamb", "ground chicken", "ground turkey",
               "ground meat", "minced beef", "minced pork", "minced lamb"],
    temp: ["160°F", "71°C"],
  },
  {
    keywords: ["pork chop", "pork loin", "pork tenderloin", "pork shoulder", "pork roast",
               "ham", "prosciutto", "serrano ham", "iberico"],
    temp: ["145°F", "63°C"],
    exclude: ["bacon", "pancetta", "guanciale", "lardons", "stock", "broth"],
  },
  {
    keywords: ["steak", "beef", "lamb", "veal", "roast beef", "prime rib", "ribeye",
               "sirloin", "tenderloin", "filet mignon", "strip steak"],
    temp: ["145°F", "63°C"],
  },
  {
    keywords: ["salmon", "tuna", "cod", "halibut", "sea bass", "trout", "mahi mahi",
               "shrimp", "scallop", "lobster", "crab", "mussel", "clam"],
    temp: ["145°F", "63°C"],
  },
  {
    keywords: ["egg", "eggs", "egg yolk", "egg white"],
    temp: [],
    rule: "fda_egg",
  },
];

// ---------------------------------------------------------------------------
// Banned words (AdSense compliance)
// ---------------------------------------------------------------------------

const BANNED_WORDS = [
  "probiotics", "gut health", "immune boost", "detox", "anti-inflammatory",
  "fat-burning", "miracle", "superfood", "cleanse", "cure", "heal",
  "all-natural", "clinically proven", "scientifically proven",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

function getMinWords(output: RecipeArticle): number {
  const totalMatch = (output.prepTime + output.cookTime).match(/(\d+)/g);
  const minutes = totalMatch ? totalMatch.reduce((sum, n) => sum + parseInt(n), 0) : 999;
  const isDessert = output.tags.some((t: string) =>
    /dessert|mousse|cake|cookie|tart|pie|pudding/i.test(t)
  );
  if (isDessert) return 600;
  if (minutes <= 30) return 800;
  return 1200;
}

// ---------------------------------------------------------------------------
// Food safety validation
// ---------------------------------------------------------------------------

export function validateFoodSafety(
  allText: string,
  ingredients: string[],
): string[] {
  const errors: string[] = [];
  const lowerText = allText.toLowerCase();
  const lowerIngredients = ingredients.map((i) => i.toLowerCase()).join(" ");

  for (const rule of PROTEIN_RULES) {
    // Check if any keyword matches in ingredients
    const matchedKeywords = rule.keywords.filter((kw) =>
      lowerIngredients.includes(kw)
    );

    if (matchedKeywords.length === 0) continue;

    // Check excludes
    if (rule.exclude) {
      const excluded = rule.exclude.filter((ex) => lowerIngredients.includes(ex));
      if (excluded.length > 0 && matchedKeywords.every((kw) =>
        rule.exclude!.some((ex) => lowerIngredients.includes(ex))
      )) {
        continue; // All keyword matches are excluded contexts
      }
    }

    // fda_egg rule: check for pasteurized/cooked until firm
    if (rule.rule === "fda_egg") {
      const hasPasteurized = /pasteurized/i.test(lowerText);
      const hasCookedFirm = /cook(ed)? until (yolk and white are )?firm/i.test(lowerText);
      if (!hasPasteurized && !hasCookedFirm) {
        errors.push(
          `Raw egg preparation detected (${matchedKeywords.join(", ")}). ` +
          `Must mention "pasteurized eggs" or "cook until yolk and white are firm" per FDA guidelines.`
        );
      }
      continue;
    }

    // Temperature rule: at least one temp must be mentioned
    if (rule.temp.length > 0) {
      const tempFound = rule.temp.some((t) => lowerText.includes(t.toLowerCase()));
      if (!tempFound) {
        errors.push(
          `Protein "${matchedKeywords.join(", ")}" detected in ingredients ` +
          `but none of the required USDA temperatures found: ${rule.temp.join(", ")}.`
        );
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Banned words detection
// ---------------------------------------------------------------------------

export function detectBannedWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.filter((w) => lowerText.includes(w));
}

// ---------------------------------------------------------------------------
// Quality Gate
// ---------------------------------------------------------------------------

export async function qualityGate(output: RecipeArticle): Promise<GateResult> {
  // Check 0: Duplicate slug
  const slug = slugify(output.title);
  const existing = await db
    .select()
    .from(recipes)
    .where(eq(recipes.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    return { status: "BLOCK", reason: "duplicate", errors: [`Slug "${slug}" exists`] };
  }

  // Check 1: Food Safety — scan BOTH instructions[].text AND contentMarkdown
  const allText = [
    ...output.instructions.map((i) => i.text),
    output.contentMarkdown,
  ].join(" ");
  const foodSafetyErrors = validateFoodSafety(allText, output.ingredients);
  if (foodSafetyErrors.length > 0) {
    return { status: "BLOCK", reason: "food_safety", errors: foodSafetyErrors };
  }

  // Check 2: Word Count minimum
  const wordCount = output.contentMarkdown.split(/\s+/).filter(Boolean).length;
  const minWords = getMinWords(output);
  if (wordCount < minWords) {
    return {
      status: "BLOCK",
      reason: "too_short",
      errors: [`${wordCount} words < ${minWords} minimum`],
    };
  }

  // Check 3: Banned Words
  const bannedWordsFound = detectBannedWords(output.contentMarkdown);
  if (bannedWordsFound.length > 0) {
    return {
      status: "BLOCK",
      reason: "banned_words",
      errors: bannedWordsFound.map((w) => `"${w}" found`),
    };
  }

  return { status: "PASS" };
}
