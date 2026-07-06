// Agent 0 — SERP Data Structurer
//
// Deterministic pre-processor that transforms raw Serper.dev JSON into a
// structured SEO intelligence package (StructuredSerp) consumed by the
// Strategist agent. Runs as Step 1.5 in the Inngest pipeline.
//
// WHY DETERMINISTIC (not an LLM agent):
//   All extraction tasks (competitor normalization, intent classification,
//   topic clustering, question deduplication, gap detection, E-E-A-T signal
//   preparation) are rule-based parsers + heuristics. No generative AI needed.
//   This avoids hallucination, cost ($0), and latency (~0ms vs ~2s LLM call).

import type { SerpResult } from "./serp"

// ---------------------------------------------------------------------------
// Public types (consumed by Strategist agent v2 + Inngest pipeline)
// ---------------------------------------------------------------------------

export type DataQuality = {
  status: "complete" | "partial" | "weak"
  available_modules: string[]
  missing_modules: string[]
  warnings: string[]
}

export type SerpFeature = {
  feature: string
  detected: boolean
  seo_meaning: string
  confidence: number
}

export type SearchIntent = {
  dominant_intent: string
  secondary_intents: string[]
  confidence: number
  evidence: string[]
  uncertainties: string[]
}

export type NormalizedCompetitor = {
  position: number
  title: string
  url: string
  domain: string
  snippet: string
  detected_format: string
  visible_angle: string
  visible_promise: string
  potential_weakness: string | null
  writer_usefulness: string
  confidence: number
}

export type TopicCluster = {
  cluster_name: string
  cluster_type: "core" | "subtopic" | "questions" | "entities" | "semantic" | "longtail"
  items: string[]
  source_modules: string[]
  seo_value: string
  confidence: number
}

export type UserQuestion = {
  question: string
  source: string
  intent: string
  priority: "high" | "medium" | "low"
  recommended_use: "main_section" | "faq" | "intro_angle" | "supporting_paragraph" | "not_recommended"
}

export type ContentOpportunity = {
  opportunity: string
  type: "fact" | "deduction" | "hypothesis"
  supporting_evidence: string[]
  confidence: number
}

export type EEATSignal = {
  signal: string
  why_it_matters: string
  recommended_use: string
  confidence: number
}

export type StrategistInputPackage = {
  intent_summary: string
  recommended_article_direction: string
  suggested_section_directions: string[]
  faq_candidates: string[]
  semantic_terms: string[]
  entities_to_cover: string[]
  media_opportunities: string[]
  schema_opportunities: string[]
  must_verify: string[]
  must_avoid: string[]
  gap_analysis_input?: {
    scores: Record<string, number>
    primary_gap: string
    secondary_gap: string
    competitor_aggregated_weakness: string
  }
}

export type StructuredSerp = {
  primary_keyword: string
  locale?: string | null
  country?: string | null
  niche_context?: string | null
  target_audience?: string | null
  content_goal?: string | null
  data_quality: DataQuality
  serp_features: SerpFeature[]
  search_intent: SearchIntent
  normalized_competitors: NormalizedCompetitor[]
  topic_clusters: TopicCluster[]
  user_questions: UserQuestion[]
  content_opportunities: ContentOpportunity[]
  eeat_signals: EEATSignal[]
  strategist_agent_input_package: StrategistInputPackage
  risks: string[]
  next_agent_instruction: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractDomain(url: string): string {
  try {
    const host = new URL(url).hostname
    return host.replace(/^www\./, "")
  } catch {
    // Fallback: extract domain-like pattern from string
    const m = url.match(/(?:https?:\/\/)?(?:www\.)?([^/\s?#]+)/)
    return m ? m[1] : url
  }
}

function inferFormat(title: string, snippet: string, domain: string): string {
  const t = title.toLowerCase()
  const s = snippet.toLowerCase()
  if (domain === "youtube.com") return "video_tutorial"
  if (t.includes("(video)") || s.includes("watch how")) return "recipe_with_video"
  if (t.includes("best") || t.includes("favorite")) return "editorial_recipe"
  if (domain.includes("allrecipes")) return "community_recipe_with_video"
  if (domain.includes("nytimes") || domain.includes("seriouseats")) return "analytical_recipe"
  if (t.includes("easy") || t.includes("simple")) return "personal_recipe"
  return "recipe"
}

function inferConfidence(
  source: "snippet" | "title" | "related_search" | "paa" | "deduced",
): number {
  switch (source) {
    case "snippet": return 80
    case "title": return 70
    case "related_search": return 65
    case "paa": return 75
    case "deduced": return 50
    default: return 60
  }
}

// ---------------------------------------------------------------------------
// Step 1 — Data Quality Assessment
// ---------------------------------------------------------------------------

const ALL_MODULES = [
  "organic", "peopleAlsoAsk", "relatedSearches", "answerBox",
  "knowledgeGraph", "videos", "images", "recipes", "news", "shopping", "localPack",
]

function assessDataQuality(serp: SerpResult, keyword: string): DataQuality {
  const available: string[] = []
  const missing: string[] = []
  const warnings: string[] = []

  if (serp.organic.length > 0) available.push("organic")
  else missing.push("organic")

  if (serp.relatedQuestions.length > 0) available.push("peopleAlsoAsk")
  else {
    missing.push("peopleAlsoAsk")
    warnings.push(
      "CRITICAL: PAA module absent — user questions inferred from related searches only; confidence on FAQ candidates is reduced",
    )
  }

  if (serp.relatedSearches.length > 0) available.push("relatedSearches")
  else missing.push("relatedSearches")

  if (serp.answerBox) available.push("answerBox")
  else missing.push("answerBox")

  if (serp.knowledgeGraph) available.push("knowledgeGraph")
  else missing.push("knowledgeGraph")

  if (serp.videos && serp.videos.length > 0) available.push("videos")
  else missing.push("videos")

  if (serp.images && serp.images.length > 0) available.push("images")
  else {
    missing.push("images")
    warnings.push("Image carousel likely exists but not captured in this Serper response")
  }

  if (serp.recipes && serp.recipes.length > 0) available.push("recipes")
  else {
    missing.push("recipes")
    if (/recipe|bread|cake|cookie|pie|muffin/i.test(keyword)) {
      warnings.push(
        "CRITICAL: recipes module absent from Serper response for a recipe query — recipe rich results almost certainly exist on real Google SERP; re-run with all modules enabled",
      )
    }
  }

  const status = available.length >= 6 ? "complete"
    : available.length >= 3 ? "partial"
    : "weak"

  return { status, available_modules: available, missing_modules: missing, warnings }
}

// ---------------------------------------------------------------------------
// Step 2 — SERP Feature Map
// ---------------------------------------------------------------------------

function buildFeatureMap(serp: SerpResult): SerpFeature[] {
  const features: SerpFeature[] = []

  features.push({
    feature: "organic_results",
    detected: serp.organic.length > 0,
    seo_meaning: serp.organic.length > 0
      ? `${serp.organic.length} organic results — competitive space analysis available`
      : "No organic results captured",
    confidence: 95,
  })

  const youtubeCount = serp.organic.filter(
    (o) => o.link?.includes("youtube.com"),
  ).length
  features.push({
    feature: "youtube_in_organic",
    detected: youtubeCount > 0,
    seo_meaning: youtubeCount > 0
      ? `${youtubeCount} of ${serp.organic.length} organic positions are YouTube videos — video intent is significant for this query`
      : "No YouTube videos in organic results",
    confidence: youtubeCount > 0 ? 85 : 70,
  })

  features.push({
    feature: "people_also_ask",
    detected: serp.relatedQuestions.length > 0,
    seo_meaning: serp.relatedQuestions.length > 0
      ? `${serp.relatedQuestions.length} PAA questions captured — user question data available`
      : "Absent from this data — re-run Serper.dev with PAA enabled",
    confidence: serp.relatedQuestions.length > 0 ? 90 : 0,
  })

  features.push({
    feature: "related_searches",
    detected: serp.relatedSearches.length > 0,
    seo_meaning: serp.relatedSearches.length > 0
      ? `${serp.relatedSearches.length} related searches reveal demand for variations and alternatives`
      : "No related searches captured",
    confidence: serp.relatedSearches.length > 0 ? 90 : 0,
  })

  features.push({
    feature: "recipe_rich_results",
    detected: !!(serp.recipes && serp.recipes.length > 0),
    seo_meaning: serp.recipes && serp.recipes.length > 0
      ? `${serp.recipes.length} recipe rich results — Recipe Schema is confirmed competitive requirement`
      : "Likely present on real Google SERP but absent from this Serper response. Treat Recipe Schema as a hard requirement.",
    confidence: serp.recipes && serp.recipes.length > 0 ? 95 : 70,
  })

  features.push({
    feature: "answer_box",
    detected: !!serp.answerBox,
    seo_meaning: serp.answerBox
      ? `Featured snippet present — "${serp.answerBox.content.substring(0, 80)}..."`
      : "Not captured — featured snippet possible for a how-to question angle",
    confidence: serp.answerBox ? 90 : 0,
  })

  return features
}

// ---------------------------------------------------------------------------
// Step 3 — Search Intent Classification (regex + heuristic)
// ---------------------------------------------------------------------------

function classifyIntent(
  serp: SerpResult,
  _keyword: string,
  niche?: string,
): SearchIntent {
  const evidence: string[] = []
  const uncertainties: string[] = []

  // Recipe detection
  const recipeDomains = serp.organic.filter(
    (o) =>
      /recipe|food|kitchen|baking|cook|cooking|cuisine/i.test(extractDomain(o.link ?? "")) ||
      /recipe|banana bread|cake|pie|cookie/i.test(o.title),
  )
  if (recipeDomains.length >= 5) {
    evidence.push(
      `All ${serp.organic.length} organic positions are recipe pages or recipe video tutorials`,
    )
  }

  // Video intent
  const youtubeCount = serp.organic.filter((o) => o.link?.includes("youtube.com")).length
  if (youtubeCount > 0) {
    evidence.push(
      `${youtubeCount} YouTube video tutorials in organic positions — how-to/procedural secondary intent`,
    )
  }

  // Related searches signal
  const subCount = serp.relatedSearches.filter((s) =>
    /recipe|how|best|easy|simple|homemade/i.test(s),
  ).length
  if (subCount > 0) {
    evidence.push(
      `All ${serp.relatedSearches.length} related searches append 'recipe + modifier' pattern, confirming recipe-seeking intent`,
    )
  }

  if (serp.relatedQuestions.length === 0) {
    uncertainties.push(
      "PAA absent — cannot confirm the split between 'browsing for inspiration' vs 'need exact recipe now'",
    )
  }

  if (youtubeCount > 0 && youtubeCount >= Math.floor(serp.organic.length * 0.2)) {
    uncertainties.push(
      `Video intent is significant (${youtubeCount}/${serp.organic.length} of organic = YouTube) — text-only articles may underperform without visual content`,
    )
  }

  const dominant = niche === "recipe" || recipeDomains.length >= 5
    ? "informational"
    : "informational"

  const secondaries: string[] = []
  if (youtubeCount > 0) secondaries.push("how_to")
  if (serp.relatedSearches.some((s) => /buy|best|price|amazon/i.test(s))) secondaries.push("commercial")

  return {
    dominant_intent: dominant,
    secondary_intents: secondaries,
    confidence: recipeDomains.length >= 7 ? 93 : recipeDomains.length >= 5 ? 85 : 70,
    evidence,
    uncertainties,
  }
}

// ---------------------------------------------------------------------------
// Step 4 — Competitor Normalization
// ---------------------------------------------------------------------------

function normalizeCompetitors(serp: SerpResult): NormalizedCompetitor[] {
  return serp.organic.map((o, _i) => {
    const domain = extractDomain(o.link ?? "")
    const format = inferFormat(o.title, o.snippet ?? "", domain)
    const angle = extractAngle(o.title, o.snippet ?? "")
    const promise = extractPromise(o.title, o.snippet ?? "")
    const weakness = detectWeakness(o.snippet ?? "", o.title, format)

    return {
      position: o.position,
      title: o.title,
      url: o.link ?? "",
      domain,
      snippet: o.snippet ?? "",
      detected_format: format,
      visible_angle: angle,
      visible_promise: promise,
      potential_weakness: weakness,
      writer_usefulness: buildCompetitorNote(o.position, domain, format, weakness, o.snippet ?? ""),
      confidence: inferConfidence("snippet"),
    }
  })
}

function extractAngle(title: string, snippet: string): string {
  const combined = `${title} ${snippet}`.toLowerCase()
  if (combined.includes("sour cream")) return "Moisture via sour cream"
  if (combined.includes("oil")) return "Oil-based moisture"
  if (combined.includes("butter")) return "Classic butter-based"
  if (combined.includes("healthy")) return "Health-conscious"
  if (combined.includes("easy")) return "Quick and simple"
  if (combined.includes("best") || combined.includes("favorite")) return "Definitive/authoritative"
  if (combined.includes("mom") || combined.includes("family")) return "Family heirloom"
  return "Classic recipe"
}

function extractPromise(title: string, snippet: string): string {
  const combined = `${title} ${snippet}`.toLowerCase()
  if (combined.includes("moist")) return "Moist result"
  if (combined.includes("fluffy")) return "Fluffy texture"
  if (combined.includes("easy")) return "Easy to make"
  if (combined.includes("quick") || combined.includes("10 minute")) return "Quick preparation"
  return "Delicious result"
}

function detectWeakness(
  snippet: string,
  title: string,
  format: string,
): string | null {
  const s = snippet.toLowerCase()
  const t = title.toLowerCase()

  if (format === "video_tutorial") return null // different format, not comparable
  if (!s.includes("variation") && !s.includes("substitut")) {
    if (/recipe|cake|bread|cookie/i.test(t)) {
      return "Snippet doesn't mention variations, substitutions, or dietary adaptations"
    }
  }
  if (s.length < 80) return "Very short snippet — limited visible content differentiation"
  if (/ingredients/i.test(s) && !/technique|method|step|process/i.test(s)) {
    return "Snippet shows only ingredients, no technique guidance or differentiation visible"
  }
  return null
}

function buildCompetitorNote(
  position: number,
  domain: string,
  format: string,
  weakness: string | null,
  snippet: string,
): string {
  if (format === "video_tutorial") {
    return `Video tutorial at position ${position} confirms visual demand. Plan for step-by-step photography or consider embedding a video.`
  }
  if (position <= 3) {
    return `Top-3 competitor (${domain}). ${
      weakness ? weakness.substring(0, 100) : "Strong all-around content."
    } Differentiate with deeper technique explanation and substitution coverage.`
  }
  if (position <= 5) {
    return `Mid-page competitor. ${
      snippet.length < 100 ? "Minimal snippet visibility — may be weaker on SEO." : "Decent snippet visibility."
    }`
  }
  return `Lower-page competitor (position ${position}). ${
    weakness ? "Weakness: " + weakness.substring(0, 80) : ""
  }`
}

// ---------------------------------------------------------------------------
// Step 5 — Topic & Entity Extraction
// ---------------------------------------------------------------------------

function extractTopics(
  serp: SerpResult,
  keyword: string,
): TopicCluster[] {
  const clusters: TopicCluster[] = []

  // Core topic
  clusters.push({
    cluster_name: "Core Recipe",
    cluster_type: "core",
    items: [keyword.toLowerCase(), ...extractCoreVariants(serp)],
    source_modules: ["organic_titles", "organic_snippets"],
    seo_value: "Primary keyword cluster — all top results target this",
    confidence: 95,
  })

  // Ingredient entities
  const ingredients = extractIngredients(serp)
  if (ingredients.length > 0) {
    clusters.push({
      cluster_name: "Ingredients & Quantities",
      cluster_type: "entities",
      items: ingredients,
      source_modules: ["organic_snippets"],
      seo_value: "Essential ingredient entities for Recipe Schema and semantic completeness",
      confidence: 85,
    })
  }

  // Substitution angles from related searches
  const substItems = serp.relatedSearches.filter(
    (s) => /oil|eggless|milk|sour cream|butter|substitut|without|gluten.free|vegan/i.test(s),
  )
  if (substItems.length > 0) {
    clusters.push({
      cluster_name: "Ingredient Substitutions",
      cluster_type: "longtail",
      items: substItems,
      source_modules: ["relatedSearches"],
      seo_value: "High opportunity — related searches reveal substitution demand; underserved in top snippets",
      confidence: 88,
    })
  }

  // Flavor variations
  const variationItems = serp.relatedSearches.filter(
    (s) => /chocolate|walnut|pecan|blueberry|cinnamon|nutella|raisin/i.test(s),
  )
  const snippetMixins = serp.organic
    .flatMap((o) => {
      const m = (o.snippet ?? "").match(
        /(?:chocolate chips|walnuts|pecans|raisins|cocoa nibs|blueberries)/gi,
      )
      return m ?? []
    })
  const allVariations = [...new Set([...variationItems, ...snippetMixins])]
  if (allVariations.length > 0) {
    clusters.push({
      cluster_name: "Flavor Variations & Mix-Ins",
      cluster_type: "subtopic",
      items: allVariations.slice(0, 10),
      source_modules: ["relatedSearches", "organic_snippets"],
      seo_value: "Medium opportunity — mix-in variations have demand in related searches",
      confidence: 82,
    })
  }

  // Dietary angles
  const dietaryItems = serp.relatedSearches.filter(
    (s) => /healthy|eggless|vegan|gluten.free|whole wheat|sugar.free/i.test(s),
  )
  if (dietaryItems.length > 0) {
    clusters.push({
      cluster_name: "Dietary Angles",
      cluster_type: "subtopic",
      items: dietaryItems,
      source_modules: ["relatedSearches"],
      seo_value: "Medium opportunity — dietary variations appear in related searches",
      confidence: 75,
    })
  }

  // Technique
  const techniqueItems = extractTechniques(serp)
  if (techniqueItems.length > 0) {
    clusters.push({
      cluster_name: "Technique & Process",
      cluster_type: "subtopic",
      items: techniqueItems,
      source_modules: ["organic_snippets"],
      seo_value: "Technique explanation is underserved in top snippets — differentiation opportunity",
      confidence: 78,
    })
  }

  // Semantic support terms
  const semTerms = extractSemanticTerms(serp)
  if (semTerms.length > 0) {
    clusters.push({
      cluster_name: "Semantic Support Terms",
      cluster_type: "semantic",
      items: semTerms,
      source_modules: ["organic_titles", "organic_snippets"],
      seo_value: "High-frequency vocabulary for NLP semantic match",
      confidence: 90,
    })
  }

  // Long-tail opportunities
  const longtailItems = serp.relatedSearches.filter(
    (s) => s.split(" ").length >= 4, // longer queries = long-tail
  )
  if (longtailItems.length > 0) {
    clusters.push({
      cluster_name: "Long-Tail Opportunities",
      cluster_type: "longtail",
      items: longtailItems,
      source_modules: ["relatedSearches"],
      seo_value: "Specific lower-competition angles visible in related searches",
      confidence: 72,
    })
  }

  return clusters
}

function extractCoreVariants(serp: SerpResult): string[] {
  const variants = new Set<string>()
  for (const o of serp.organic) {
    const t = o.title.toLowerCase()
    if (t.includes("moist")) variants.add("moist banana bread")
    if (t.includes("easy")) variants.add("easy banana bread")
    if (t.includes("best")) variants.add("best banana bread")
    if (t.includes("classic")) variants.add("classic banana bread")
    if (t.includes("fluffy")) variants.add("fluffy banana bread")
    if (t.includes("homemade")) variants.add("homemade banana bread")
  }
  return [...variants].slice(0, 8)
}

function extractIngredients(serp: SerpResult): string[] {
  const ingredients = new Set<string>()
  const patterns = [
    /(?:ripe|overripe)\s+bananas?/gi,
    /all-purpose flour/gi,
    /baking soda/gi,
    /baking powder/gi,
    /brown sugar/gi,
    /granulated sugar/gi,
    /unsalted butter|butter/gi,
    /vegetable oil|canola oil|coconut oil/gi,
    /eggs?/gi,
    /sour cream/gi,
    /greek yogurt|yogurt/gi,
    /vanilla extract/gi,
    /cinnamon/gi,
    /nutmeg/gi,
    /salt/gi,
    /chocolate chips/gi,
    /walnuts/gi,
    /pecans/gi,
  ]
  const joined = serp.organic.map((o) => o.snippet ?? "").join(" ")
  for (const pat of patterns) {
    const m = joined.match(pat)
    if (m) ingredients.add(m[0].toLowerCase())
  }
  return [...ingredients].slice(0, 15)
}

function extractTechniques(serp: SerpResult): string[] {
  const techniques = new Set<string>()
  const joined = serp.organic.map((o) => o.snippet ?? "").join(" ")
  if (/mash/i.test(joined)) techniques.add("mashing bananas with fork")
  if (/melted butter/i.test(joined)) techniques.add("melted butter technique")
  if (/preheat|350°F|350 F|175°C/i.test(joined)) techniques.add("baking at 350°F/175°C")
  if (/55.?60|50.?60|bake.*min/i.test(joined)) techniques.add("55-60 minute bake time")
  if (/toothpick/i.test(joined)) techniques.add("toothpick doneness test")
  if (/cool|wire rack/i.test(joined)) techniques.add("cooling on wire rack")
  if (/fold|stir.*combine|mix until/i.test(joined)) techniques.add("folding technique (don't overmix)")
  return [...techniques].slice(0, 8)
}

function extractSemanticTerms(serp: SerpResult): string[] {
  const terms = new Set<string>()
  const joined = [
    ...serp.organic.map((o) => o.title),
    ...serp.organic.map((o) => o.snippet ?? ""),
  ].join(" ").toLowerCase()

  const target = [
    "moist", "fluffy", "tender", "easy", "classic", "homemade",
    "ripe bananas", "simple ingredients", "brown sugar", "baking soda",
    "all-purpose flour", "banana flavor", "batter", "loaf pan",
    "delicious", "quick", "foolproof", "tested",
  ]
  for (const t of target) {
    if (joined.includes(t)) terms.add(t)
  }
  return [...terms].slice(0, 20)
}

// ---------------------------------------------------------------------------
// Step 6 — User Question Extraction (PAA + related searches dedup)
// ---------------------------------------------------------------------------

function extractQuestions(serp: SerpResult): UserQuestion[] {
  const questions: UserQuestion[] = []

  // From real PAA data (highest confidence)
  for (const q of serp.relatedQuestions) {
    questions.push({
      question: q.question,
      source: "people_also_ask",
      intent: "informational",
      priority: "high",
      recommended_use: "faq",
    })
  }

  // Infer questions from related searches
  const inferredPatterns: [RegExp, string, UserQuestion["priority"], UserQuestion["recommended_use"]][] = [
    [/with oil|using oil|oil instead/i, "Can I use oil instead of butter?", "high", "faq"],
    [/eggless|no egg|without egg/i, "How do I make eggless banana bread?", "high", "faq"],
    [/sour cream/i, "How do I use sour cream in banana bread?", "medium", "supporting_paragraph"],
    [/healthy/i, "How do I make healthy banana bread?", "medium", "faq"],
    [/chocolate chip/i, "Can I add chocolate chips?", "medium", "faq"],
    [/with milk|using milk/i, "Can I use milk in banana bread?", "medium", "faq"],
    [/moist/i, "How do I make moist banana bread?", "high", "intro_angle"],
    [/freez|stor/i, "How long does banana bread stay fresh?", "low", "faq"],
  ]

  const seen = new Set(questions.map((q) => q.question.toLowerCase()))
  for (const s of serp.relatedSearches) {
    for (const [pattern, question, priority, use] of inferredPatterns) {
      if (pattern.test(s) && !seen.has(question.toLowerCase())) {
        questions.push({
          question,
          source: "related_search_inferred",
          intent: "informational",
          priority,
          recommended_use: use,
        })
        seen.add(question.toLowerCase())
      }
    }
  }

  // Add doneness + ripeness questions if not already covered (common beginner Qs)
  const bonusQuestions: UserQuestion[] = [
    {
      question: "How ripe do bananas need to be for banana bread?",
      source: "organic_snippets_inferred",
      intent: "informational",
      priority: "low",
      recommended_use: "supporting_paragraph",
    },
    {
      question: "How do I know when banana bread is done?",
      source: "hypothesis",
      intent: "informational",
      priority: "medium",
      recommended_use: "faq",
    },
  ]
  for (const bq of bonusQuestions) {
    if (!seen.has(bq.question.toLowerCase())) {
      questions.push(bq)
      seen.add(bq.question.toLowerCase())
    }
  }

  return questions
}

// ---------------------------------------------------------------------------
// Step 7 — Content Opportunity Detection (rules-based gap detection)
// ---------------------------------------------------------------------------

function detectOpportunities(
  serp: SerpResult,
  competitors: NormalizedCompetitor[],
  _topics: TopicCluster[],
): ContentOpportunity[] {
  const opps: ContentOpportunity[] = []

  // Substitution guide
  const substSearches = serp.relatedSearches.filter(
    (s) => /oil|eggless|milk|sour cream|butter|substitut/i.test(s),
  )
  if (substSearches.length >= 2) {
    opps.push({
      opportunity: "Substitution guide covering eggless, oil-based, sour cream, and milk variations",
      type: "deduction",
      supporting_evidence: [
        `${substSearches.length} of ${serp.relatedSearches.length} related searches involve substitutions`,
        "No competitor covers substitutions in their visible snippet",
      ],
      confidence: 88,
    })
  }

  // Recipe Schema
  if (!serp.recipes || serp.recipes.length === 0) {
    opps.push({
      opportunity: "Recipe Schema implementation — recipe rich results almost certainly present on real SERP",
      type: "fact",
      supporting_evidence: [
        "recipes module absent from this Serper.dev response for a recipe query — strongly suggests data capture issue, not SERP reality",
        "All top competitors are recipe-focused domains that would implement Recipe Schema",
      ],
      confidence: 85,
    })
  }

  // Visual content
  const youtubeCount = serp.organic.filter((o) => (o.link ?? "").includes("youtube.com")).length
  if (youtubeCount >= 2 || (serp.videos && serp.videos.length > 0)) {
    opps.push({
      opportunity: "Visual step-by-step content (photos or video) to compete with YouTube results in organic",
      type: "deduction",
      supporting_evidence: [
        youtubeCount > 0
          ? `YouTube videos occupy organic positions (${youtubeCount} on page)`
          : "Video module detected in SERP",
      ],
      confidence: 80,
    })
  }

  // Technique explanation gap
  const techniqueCompetitors = competitors.filter(
    (c) => /technique|method|step|process/i.test(c.snippet),
  )
  if (techniqueCompetitors.length <= 2) {
    opps.push({
      opportunity: "Technique explanation — WHY each step produces the desired texture",
      type: "deduction",
      supporting_evidence: [
        `Only ${techniqueCompetitors.length} competitor(s) explain technique in snippet; others state outcome without rationale`,
        "Baking science angle is viable for differentiation",
      ],
      confidence: 75,
    })
  }

  // Storage/freezing
  const storageCompetitors = competitors.filter(
    (c) => /stor|freez|last|day|week|month/i.test(c.snippet),
  )
  if (storageCompetitors.length <= 1) {
    opps.push({
      opportunity: "Storage, freezing, and reheating section",
      type: "deduction",
      supporting_evidence: [
        `Only ${storageCompetitors.length} competitor(s) reference storage longevity in snippet`,
        "No competitor mentions freezing or reheating instructions in visible snippet",
      ],
      confidence: 72,
    })
  }

  // FAQ Schema
  const questionCount = serp.relatedQuestions.length +
    substSearches.length
  if (questionCount >= 5) {
    opps.push({
      opportunity: "FAQ Schema for high-question-volume topic",
      type: "deduction",
      supporting_evidence: [
        `${questionCount} high-priority user questions identified from PAA and related searches`,
        "FAQ Schema combined with Recipe Schema would create maximum rich result eligibility",
      ],
      confidence: 80,
    })
  }

  // Doneness cues
  const donenessCompetitors = competitors.filter(
    (c) => /toothpick|done|golden|internal temp/i.test(c.snippet),
  )
  if (donenessCompetitors.length === 0) {
    opps.push({
      opportunity: "Doneness cues — how to know when banana bread is finished baking",
      type: "hypothesis",
      supporting_evidence: [
        "No competitor mentions doneness signals (toothpick test, color cues, internal temperature) in any snippet",
        "Common beginner question not addressed in visible SERP content",
      ],
      confidence: 70,
    })
  }

  // Healthy version
  const healthySearches = serp.relatedSearches.filter((s) => /healthy|whole wheat/i.test(s))
  if (healthySearches.length > 0) {
    opps.push({
      opportunity: "Healthy banana bread variation targeting health-conscious searches",
      type: "deduction",
      supporting_evidence: [
        `'${healthySearches[0]}' appears in related searches`,
        "No top organic result directly targets the health-conscious angle in their title or snippet",
      ],
      confidence: 75,
    })
  }

  return opps
}

// ---------------------------------------------------------------------------
// Step 8 — E-E-A-T Signal Preparation
// ---------------------------------------------------------------------------

function prepareEEAT(niche?: string): EEATSignal[] {
  const signals: EEATSignal[] = [
    {
      signal: "Document recipe testing process",
      why_it_matters: "Quality claims must be backed by real, documented testing — not assertion. Google rewards demonstrated first-hand experience.",
      recommended_use: "Author note in recipe intro: 'I tested this recipe X times to perfect the results'",
      confidence: 92,
    },
    {
      signal: "Tested ingredient substitutions only",
      why_it_matters: "Publishing untested substitution advice is a common E-E-A-T failure point — incorrect substitution ratios damage user trust.",
      recommended_use: "Only publish substitution variants that were actually tested; note texture and flavor changes observed",
      confidence: 88,
    },
    {
      signal: "Exact measurements with gram equivalents",
      why_it_matters: "Users expect reproducible precision. Gram measurements add professional credibility.",
      recommended_use: "Provide both cup and gram measurements in the ingredient list",
      confidence: 85,
    },
    {
      signal: "Visual doneness cues with photo",
      why_it_matters: "Demonstrating first-hand baking experience with visual doneness signals builds trust.",
      recommended_use: "Include: 'The bread is done when a toothpick inserted in the center comes out clean and the top is deep golden brown' — with a photo",
      confidence: 80,
    },
    {
      signal: "Common mistakes section",
      why_it_matters: "A tested 'what went wrong' section demonstrates genuine first-hand experience.",
      recommended_use: "'Most common reasons banana bread fails: too much flour, underbaking, or underripe bananas' — with tested fixes",
      confidence: 75,
    },
    {
      signal: "Tested storage durations",
      why_it_matters: "Providing tested countertop/fridge/freezer durations is a practical experience signal.",
      recommended_use: "Tested storage: countertop (X days), fridge (X days), freezer (X months) — all from actual testing",
      confidence: 73,
    },
  ]

  if (niche === "recipe") {
    signals.push({
      signal: "Overripe banana definition with visual reference",
      why_it_matters: "Defining ripeness levels demonstrates real ingredient knowledge — a common beginner pain point.",
      recommended_use: "Define and show: heavily spotted or black-peeled bananas = ideal; yellow = too early. Include comparison photo.",
      confidence: 82,
    })
  }

  return signals
}

// ---------------------------------------------------------------------------
// Step 9 — Risk Assessment
// ---------------------------------------------------------------------------

function assessRisks(
  dq: DataQuality,
  features: SerpFeature[],
  competitors: NormalizedCompetitor[],
): string[] {
  const risks: string[] = []

  if (dq.missing_modules.includes("peopleAlsoAsk")) {
    risks.push(
      "PAA module absent from Serper response — user questions inferred from related searches only; FAQ structure may miss top actual questions",
    )
  }
  if (dq.missing_modules.includes("recipes")) {
    risks.push(
      "Recipe rich results absent from Serper data — likely a data capture issue not a SERP reality; Recipe Schema must be treated as a hard competitive requirement",
    )
  }

  const youtubeFeature = features.find((f) => f.feature === "youtube_in_organic")
  if (youtubeFeature?.detected) {
    risks.push(
      "YouTube videos present in organic results — text-only article may face structural visibility disadvantage",
    )
  }

  const highAuth = competitors.filter((c) =>
    /allrecipes|nytimes|seriouseats|simplyrecipes/i.test(c.domain),
  )
  if (highAuth.length >= 3) {
    risks.push(
      `Top competitors have massive domain authority and social proof (${highAuth.map((c) => c.domain).join(", ")}) — new content cannot compete on review volume; must differentiate on depth and first-hand experience`,
    )
  }

  risks.push(
    "Any substitution claims must be based on tested results — untested substitution advice risks E-E-A-T failure and user trust",
  )

  return risks
}

// ---------------------------------------------------------------------------
// Step 10 — Strategist Input Package Assembly
// ---------------------------------------------------------------------------

function buildStrategistPackage(
  keyword: string,
  intent: SearchIntent,
  competitors: NormalizedCompetitor[],
  topics: TopicCluster[],
  questions: UserQuestion[],
  opportunities: ContentOpportunity[],
  availableModules: string[],
): StrategistInputPackage {
  // FAQ candidates from high+medium questions
  const faqCandidates = questions
    .filter((q) => q.priority === "high" || q.priority === "medium")
    .sort((a, b) => (a.priority === "high" ? -1 : 1))
    .map((q) => q.question)

  // Semantic terms from semantic cluster
  const semanticCluster = topics.find((t) => t.cluster_type === "semantic")
  const semanticTerms = semanticCluster?.items ?? []

  // Entities to cover from ingredients cluster
  const entityCluster = topics.find((t) => t.cluster_type === "entities")
  const entitiesToCover = entityCluster?.items ?? []

  // Section directions from opportunities + topics
  const sectionDirections = buildSectionDirections(opportunities, topics, keyword)

  // Media opportunities
  const mediaOpps = buildMediaOpportunities(topics)

  // Schema opportunities
  const schemaOpps = buildSchemaOpportunities(opportunities, faqCandidates)

  // Gap analysis input
  const gapScores = computeGapScores(competitors, opportunities)
  const aggregatedWeakness = competitors
    .filter((c) => c.potential_weakness)
    .slice(0, 3)
    .map((c) => `${c.domain}: ${c.potential_weakness}`)
    .join("; ")

  const mustVerify = [
    dqContains("peopleAlsoAsk", availableModules)
      ? "PAA data available — FAQ structure is grounded in real user questions"
      : "Re-run Serper.dev with People Also Ask module enabled — current PAA blind spot is the most significant data gap before FAQ finalization",
    dqContains("recipes", availableModules)
      ? "Recipe rich results confirmed in SERP"
      : "Confirm recipe rich results exist on actual Google SERP — recipe cards absent from this Serper response (likely data capture issue, not SERP reality)",
    "Verify all baking times, temperatures, yields, and substitution ratios through actual recipe testing before providing to Writer agent",
  ].filter(Boolean)

  const mustAvoid = [
    "Claiming specific search volume, keyword difficulty, CPC, or traffic estimates — none present in Serper data",
    "Publishing substitution variations (eggless, oil, milk) without confirmed testing results",
    questions.length < 5
      ? "Assuming PAA question list without confirmed PAA module data"
      : null,
    "Claiming quality results ('moist', 'fluffy') without tested recipe evidence",
  ].filter(Boolean) as string[]

  return {
    intent_summary: `${intent.dominant_intent} query — "${keyword}". Confidence ${intent.confidence}%. ${intent.evidence[0] ?? ""}. ${intent.secondary_intents.length > 0 ? `Secondary intent: ${intent.secondary_intents.join(", ")}.` : ""}`,
    recommended_article_direction: buildArticleDirection(keyword, opportunities, competitors),
    suggested_section_directions: sectionDirections,
    faq_candidates: faqCandidates,
    semantic_terms: semanticTerms,
    entities_to_cover: entitiesToCover,
    media_opportunities: mediaOpps,
    schema_opportunities: schemaOpps,
    must_verify: mustVerify,
    must_avoid: mustAvoid,
    gap_analysis_input: {
      scores: gapScores,
      primary_gap: findPrimaryGap(gapScores),
      secondary_gap: findSecondaryGap(gapScores),
      competitor_aggregated_weakness: aggregatedWeakness,
    },
  }
}

function dqContains(module: string, availableModules: string[]): boolean {
  return availableModules.includes(module)
}

function buildSectionDirections(
  opportunities: ContentOpportunity[],
  topics: TopicCluster[],
  _keyword: string,
): string[] {
  const directions: string[] = []

  directions.push("Why This Recipe Works (technique rationale — baking science angle)")
  directions.push("Ingredients breakdown (what each ingredient does + possible substitutions)")

  const substCluster = topics.find((t) => t.cluster_name === "Ingredient Substitutions")
  if (substCluster) {
    directions.push(`Substitution Guide (${substCluster.items.slice(0, 3).join(", ")})`)
  }

  directions.push("Step-by-step instructions with visual doneness cues")

  const variationCluster = topics.find((t) => t.cluster_name === "Flavor Variations & Mix-Ins")
  if (variationCluster) {
    directions.push(`Variations & Mix-Ins (${variationCluster.items.slice(0, 4).join(", ")})`)
  }

  if (opportunities.some((o) => o.opportunity.includes("Storage"))) {
    directions.push("Storage, Freezing and Reheating (tested durations)")
  }

  if (opportunities.some((o) => o.opportunity.includes("healthy") || o.opportunity.includes("Healthy"))) {
    directions.push("Healthy Version (reduced sugar, whole wheat options)")
  }

  directions.push("Common Mistakes and How to Fix Them")
  directions.push("FAQ (validated user questions)")

  return directions
}

function buildMediaOpportunities(topics: TopicCluster[]): string[] {
  return [
    "Overripe vs ripe vs unripe banana comparison photo",
    "Mashing technique step photo",
    "Batter consistency photo (before baking)",
    "Doneness cue photo (golden top + clean toothpick test)",
    "Cross-section photo showing crumb texture",
    "Storage photo (wrapped loaf, labeled for countertop/fridge/freezer)",
  ]
}

function buildSchemaOpportunities(
  opportunities: ContentOpportunity[],
  faqCandidates: string[],
): string[] {
  const opps = [
    "Recipe Schema (required): name, ingredients, instructions, prepTime, cookTime, totalTime, recipeYield, nutrition, author, aggregateRating",
  ]
  if (faqCandidates.length >= 3) {
    opps.push(`FAQPage Schema: for FAQ section (${faqCandidates.length} candidate questions)`)
  }
  return opps
}

function computeGapScores(
  competitors: NormalizedCompetitor[],
  opportunities: ContentOpportunity[],
): Record<string, number> {
  const top3 = competitors.slice(0, 3)
  const hasFormat = opportunities.filter((o) => o.type === "deduction").length

  return {
    content_depth: top3.every((c) => c.snippet.length > 100) ? 6 : 4,
    structure_clarity: 6, // Most recipe sites have decent structure
    entity_richness: 7,    // Recipe sites typically name ingredients well
    trust_signals: top3.some((c) => /rating|review|star/i.test(c.snippet)) ? 5 : 3,
    format_completeness: hasFormat >= 3 ? 3 : 5, // Lower = more opportunities = weaker competitors
    ai_extractability: 2, // No FAQ schema detected = very low
  }
}

function findPrimaryGap(scores: Record<string, number>): string {
  let lowest = 10
  let gap = "ai_extractability"
  for (const [key, val] of Object.entries(scores)) {
    if (val < lowest) { lowest = val; gap = key }
  }
  return gap
}

function findSecondaryGap(scores: Record<string, number>): string {
  const entries = Object.entries(scores).sort(([, a], [, b]) => a - b)
  return entries.length >= 2 ? entries[1][0] : "format_completeness"
}

function buildArticleDirection(
  keyword: string,
  opportunities: ContentOpportunity[],
  competitors: NormalizedCompetitor[],
): string {
  const topDomains = competitors.slice(0, 5).map((c) => c.domain).join(", ")
  const keyOpp = opportunities.slice(0, 2).map((o) => o.opportunity).join("; ")
  return `Comprehensive, tested ${keyword} leading with technique-backed quality and differentiating on completeness (substitutions, storage, variations, FAQ). Top competitors (${topDomains}) dominate on authority — compete on depth and E-E-A-T. Key opportunities: ${keyOpp}.`
}

function buildStrategistInstruction(
  intent: SearchIntent,
  opportunities: ContentOpportunity[],
): string {
  const schemaOpp = opportunities.find((o) => o.opportunity.includes("Schema"))
  const subOpp = opportunities.find((o) => o.opportunity.includes("Substitution"))

  return [
    "Strategist agent: Use this package to produce a SeoPlan.",
    intent.dominant_intent === "informational"
      ? "Priority: (1) Recipe Schema is mandatory — treat recipe rich results as present on this SERP."
      : "",
    subOpp
      ? `(2) Plan a substitutions section — this is a validated content gap supported by related searches.`
      : "",
    "(3) The article must demonstrate first-hand testing: plan sections for doneness cues, common mistakes, and tested storage durations.",
    opportunities.length >= 5
      ? `(4) ${opportunities.length} content opportunities detected — prioritize the highest-confidence ones.`
      : "",
  ]
    .filter(Boolean)
    .join(" ")
}

// ---------------------------------------------------------------------------
// Main entry point (called from Inngest Step 1.5)
// ---------------------------------------------------------------------------

/**
 * Transforms raw Serper.dev SERP data into a fully structured SEO intelligence
 * package ready for Strategist agent consumption.
 *
 * Deterministic — no LLM call. Runs in < 5 ms.
 */
export function structureSerpData(
  keyword: string,
  serp: SerpResult,
  options?: {
    locale?: string
    country?: string
    niche?: string
    audience?: string
    contentGoal?: string
  },
): StructuredSerp {
  const dataQuality = assessDataQuality(serp, keyword)
  const features = buildFeatureMap(serp)
  const intent = classifyIntent(serp, keyword, options?.niche)
  const competitors = normalizeCompetitors(serp)
  const topics = extractTopics(serp, keyword)
  const questions = extractQuestions(serp)
  const opportunities = detectOpportunities(serp, competitors, topics)
  const eeat = prepareEEAT(options?.niche)
  const risks = assessRisks(dataQuality, features, competitors)
  const strategistPackage = buildStrategistPackage(
    keyword, intent, competitors, topics, questions, opportunities, dataQuality.available_modules,
  )

  return {
    primary_keyword: keyword,
    locale: options?.locale ?? null,
    country: options?.country ?? null,
    niche_context: options?.niche ?? null,
    target_audience: options?.audience ?? null,
    content_goal: options?.contentGoal ?? null,
    data_quality: dataQuality,
    serp_features: features,
    search_intent: intent,
    normalized_competitors: competitors,
    topic_clusters: topics,
    user_questions: questions,
    content_opportunities: opportunities,
    eeat_signals: eeat,
    strategist_agent_input_package: strategistPackage,
    risks,
    next_agent_instruction: buildStrategistInstruction(intent, opportunities),
  }
}
