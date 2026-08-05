// lib/quality-gate.ts
import type { RecipeArticle } from "@/lib/schemas/recipe-article";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GateResult {
  status: "PASS" | "BLOCK";
  reason?: "duplicate" | "food_safety" | "too_short" | "banned_words" | "meta_title_length" | "schema_author_missing" | "token_repetition";
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
  "fat-burning", "miracle", "superfood", "cleanse", "cure", "heal your", "heal the body",
  "all-natural", "clinically proven", "scientifically proven",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMinWords(output: RecipeArticle): number {
  const totalMatch = (output.prepTime + output.cookTime).match(/(\d+)/g);
  const minutes = totalMatch ? totalMatch.reduce((sum, n) => sum + parseInt(n), 0) : 999;
  const tags = Array.isArray(output.tags) ? output.tags : [];
  const isDessert = tags.some((t: unknown) =>
    /dessert|mousse|cake|cookie|tart|pie|pudding/i.test(String(t ?? ""))
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
  // Defensive: LLM may return objects or nulls despite Zod schema typing
  const lowerIngredients = ingredients
    .map((i) => (typeof i === "string" ? i.toLowerCase() : ""))
    .join(" ");

  for (const rule of PROTEIN_RULES) {
    // Check if any keyword matches in ingredients
    const matchedKeywords = rule.keywords.filter((kw) =>
      lowerIngredients.includes(kw)
    );

    if (matchedKeywords.length === 0) continue;

    // Skip broader rules if a more specific rule already matched this protein.
    // e.g. "ground beef" (160°F) also matches "beef" (145°F) — the specific
    // rule must win, otherwise the gate demands the wrong temperature.
    if (rule.keywords[0] === "beef" && lowerIngredients.includes("ground beef")) continue;

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
  // Note: slug uniqueness is guaranteed by generate.ts before the pipeline runs.
  // This gate focuses on content quality only — food safety, word count, banned words,
  // meta title length, and H2 heading structure.

  // Check 1: Food Safety — scan instructions[].text, instructions[].temperature, AND contentMarkdown
  // The temperature field is a dedicated structured field — it must be scanned too.
  const instructionsArr = Array.isArray(output.instructions) ? output.instructions : [];
  const allText = [
    ...instructionsArr.map((i: { text?: string; temperature?: string }) =>
      [i.text ?? "", i.temperature ?? ""].join(" ")
    ),
    output.contentMarkdown ?? "",
  ].join(" ");
  const foodSafetyErrors = validateFoodSafety(allText, output.ingredients);
  if (foodSafetyErrors.length > 0) {
    return { status: "BLOCK", reason: "food_safety", errors: foodSafetyErrors };
  }

  // Check 2: Word Count minimum
  const wordCount = (output.contentMarkdown ?? "").split(/\s+/).filter(Boolean).length;
  const minWords = getMinWords(output);
  if (wordCount < minWords) {
    return {
      status: "BLOCK",
      reason: "too_short",
      errors: [`${wordCount} words < ${minWords} minimum`],
    };
  }

  // Check 3: Banned Words
  const bannedWordsFound = detectBannedWords(output.contentMarkdown ?? "");
  if (bannedWordsFound.length > 0) {
    return {
      status: "BLOCK",
      reason: "banned_words",
      errors: bannedWordsFound.map((w) => `"${w}" found`),
    };
  }

  // Check 4: Meta title length (≤60 chars per Zod schema)
  if (output.metaTitle && output.metaTitle.length > 60) {
    return {
      status: "BLOCK",
      reason: "meta_title_length",
      errors: [`Meta title is ${output.metaTitle.length} chars (max 60)`],
    };
  }

  // Check 5: Minimum H2 headings — ensures the article has visual hierarchy
  // (prevents wall-of-text rendering). Require ≥3 H2 sections for scannability.
  const h2Count = (output.contentMarkdown.match(/^## /gm) ?? []).length
  if (h2Count < 3) {
    return {
      status: "BLOCK",
      reason: "too_short",
      errors: [`Only ${h2Count} H2 heading(s) found — need ≥3 for scannable structure. Add ## sections (Why This Works, Ingredients, Instructions, FAQ, Chef Tips, etc.).`],
    };
  }

  // Check 6: Recipe JSON-LD must include author — required for Google Recipe
  // rich results. The LLM sometimes emits author on BlogPosting only.
  const jsonLd = (output.jsonLd ?? {}) as Record<string, unknown>
  const graph = Array.isArray(jsonLd["@graph"]) ? jsonLd["@graph"] : []
  const recipeNode = graph.find((n) => (n as Record<string, unknown>)["@type"] === "Recipe") as Record<string, unknown> | undefined
  if (recipeNode && !recipeNode.author) {
    return {
      status: "BLOCK",
      reason: "schema_author_missing",
      errors: ["Recipe JSON-LD node is missing 'author' (required for Google Recipe rich results)"],
    };
  }

  // Check 7: Token repetition — block keyword-stuffing artifacts like
  // "easy easy mexican dinner recipes recipes two" (seen live on the
  // garlic-shrimp recipe + llms.txt, Seobility/GEO audit 2026-08-05).
  // Catches "word word" and "for two for two" style repetition.
  // Ignore number+number+slash patterns like "1 1/4" (fractions), and
  // pure-digit repeats like "1 1" that are measurement artifacts, not stuffing.
  const repeatMatches = (output.contentMarkdown ?? "")
    .replace(/\b\d+\s+\d+\/\d+\b/g, " ")   // "1 1/4 cups" → fraction, not repetition
    .match(/\b([a-z]+)\s+\1\b/gi) ?? []
  const forTwoRepeat = (output.contentMarkdown ?? "").match(/(for two\s+){2,}/g) ?? []
  if (repeatMatches.length || forTwoRepeat.length) {
    const samples = [...new Set([...repeatMatches, ...forTwoRepeat])].slice(0, 5)
    return {
      status: "BLOCK",
      reason: "token_repetition",
      errors: [`Token repetition detected: ${samples.join(", ")}`],
    };
  }

  return { status: "PASS" };
}
