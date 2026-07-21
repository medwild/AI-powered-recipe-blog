// scripts/eval-recipe.ts
// Eval script v14 — generates 10 recipes with the mega-skill and audits
// each section: food safety, human patterns, attributions, FAQ, JSON-LD.
// Logs token usage for cost estimation.
//
// Usage: npx tsx scripts/eval-recipe.ts

import "dotenv/config";
import { agentChefAugustinMega } from "../lib/inngest/functions/agents/chef-augustin";
import { qualityGate } from "../lib/quality-gate";
import { fetchSerp } from "../lib/agents/serp";
import { formatSerpForPrompt } from "../lib/inngest/functions/steps/serp-phase";
import { generateSyntheticPAA } from "../lib/inngest/functions/helpers";

const KEYWORDS = [
  "Roast chicken for two",
  "Beef bourguignon small batch",
  "Authentic carbonara for two",
  "Pan-seared salmon medium-rare",
  "Vegetarian chickpea curry for two",
  "Caesar salad with homemade dressing",
  "Perfect medium-rare steak for two",
  "Dark chocolate mousse for two",
  "Chicken bacon pasta for two",
  "15-minute garlic shrimp",
];

function auditArticle(article: any, keyword: string): Record<string, string | number | boolean> {
  const content = article.contentMarkdown || "";
  const h2Count = (content.match(/^## /gm) || []).length;
  const faqCount = (content.match(/^## .+\?$/gm) || []).length;
  const tipCount = (content.match(/Chef Augustin'?s Tip/gi) || []).length;
  const parenCount = (content.match(/\([^)]+\)/g) || []).length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    keyword,
    title: article.title?.substring(0, 80),
    wordCount,
    h2Count,
    faqCount,
    tipCount,
    parenCount,
    jsonLdValid: !!article.jsonLd?.["@graph"],
    tags: article.tags?.join(", ") || "none",
  };
}

async function main() {
  console.log("=== Pipeline v14 — eval-recipe.ts ===\n");

  const cuisineDefaults = {
    cuisine: "Easy Weeknight Dinners for Two",
    cuisineIngredients: "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter",
    cuisineTechniques: "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking",
  };

  let passCount = 0;
  let blockCount = 0;
  const results: any[] = [];

  for (const keyword of KEYWORDS) {
    console.log(`\n--- ${keyword} ---`);

    try {
      const serp = await fetchSerp(keyword);
      if (!serp.relatedQuestions || serp.relatedQuestions.length < 2) {
        serp.relatedQuestions = generateSyntheticPAA(keyword).map((q) => ({ question: q }));
      }
      const serpText = formatSerpForPrompt(serp);

      const article = await agentChefAugustinMega({
        keyword,
        ...cuisineDefaults,
        serpData: serpText,
        citations: "",
      });

      const gate = await qualityGate(article);
      const audit = auditArticle(article, keyword);

      console.log(`  Gate: ${gate.status}${gate.reason ? ` (${gate.reason})` : ""}`);
      console.log(`  Words: ${audit.wordCount} | H2s: ${audit.h2Count} | FAQ: ${audit.faqCount} | Tips: ${audit.tipCount} | Parens: ${audit.parenCount}`);
      console.log(`  Tags: ${audit.tags}`);
      console.log(`  Title: ${audit.title}`);
      if (gate.errors?.length) {
        console.log(`  Errors: ${gate.errors.join("; ")}`);
      }

      if (gate.status === "PASS") passCount++;
      else blockCount++;

      results.push({ ...audit, gateStatus: gate.status, gateReason: gate.reason, gateErrors: gate.errors });
    } catch (err) {
      console.log(`  ERROR: ${(err as Error).message}`);
      blockCount++;
      results.push({ keyword, error: (err as Error).message });
    }
  }

  console.log(`\n=== Results: ${passCount}/${KEYWORDS.length} PASS, ${blockCount} BLOCK ===`);

  console.log("\nKeyword,Words,H2s,FAQ,Tips,Gate");
  for (const r of results) {
    console.log(`${r.keyword},${r.wordCount ?? "ERROR"},${r.h2Count ?? "-"},${r.faqCount ?? "-"},${r.tipCount ?? "-"},${r.gateStatus ?? "ERROR"}`);
  }
}

main().catch(console.error);
