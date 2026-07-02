# Topical Authority Methodology

Based on the Koray Gübür framework for semantic SEO and Google's algorithmic evaluation of topical expertise. This document provides the theoretical foundation that the skill relies on.

---

## Table of Contents

1. [The Topical Authority Equation](#the-topical-authority-equation)
2. [Entity-Based Thinking vs Keyword-Based Thinking](#entity-based-thinking-vs-keyword-based-thinking)
3. [The 2024 Leak: siteFocusScore and siteRadius](#the-2024-leak-sitefocusscore-and-siteradius)
4. [The 74% Coverage Benchmark](#the-74-coverage-benchmark)
5. [The Hub & Spokes Internal Linking Model](#the-hub--spokes-internal-linking-model)
6. [E-E-A-T Integration](#e-e-a-t-integration)
7. [Content Depth vs Content Volume](#content-depth-vs-content-volume)
8. [Semantic Distance and Topic Boundaries](#semantic-distance-and-topic-boundaries)
9. [The Prompt Chaining Approach](#the-prompt-chaining-approach)

---

## The Topical Authority Equation

Topical authority is not a score you can look up in a tool. It is a **ranking state** that Google assigns to a website based on the combination of two signals:

```
Topical Authority = Topical Coverage × Historical Engagement Data
```

### Topical Coverage

This measures how comprehensively a website covers a subject area. Google evaluates coverage by analyzing the **entities, attributes, and facts** present across a site's content — not by counting pages or word count. A site that deeply covers the entities associated with "CRM software" (pricing models, deployment options, integrations, user types, use cases, comparisons) demonstrates higher topical coverage than a site with 50 thin pages about vaguely related topics.

Coverage is evaluated entity-by-entity. Google's knowledge graph defines what "facts" are associated with a given topic, and the algorithm checks how many of those facts appear across the site's content corpus.

### Historical Engagement Data

This refers to user behavior signals accumulated over time:

- **Click-through rate (CTR)** from search results
- **Dwell time** / time on page
- **Bounce rate** (specifically, "pogo-sticking" — returning to search results quickly)
- **Return visits** to the site
- **Branded search volume** growth (people searching for the site by name)

Engagement data is why new sites can't instantly rank for competitive topics even with perfect content. The authority state requires both coverage AND demonstrated user satisfaction.

### Why This Matters for Content Strategy

The equation has a critical implication: **you cannot compensate for poor coverage with good engagement, or vice versa.** A site must invest in BOTH:

1. Building comprehensive, entity-rich content that covers the topic's knowledge graph.
2. Creating content that genuinely satisfies users so engagement signals accumulate.

---

## Entity-Based Thinking vs Keyword-Based Thinking

### The Old Way: Keywords

Traditional SEO operates on strings of characters. A keyword tool outputs "crm software" with a search volume of 12,000/month, and the strategist creates a page targeting that exact phrase. The limitation is that "crm software" could mean dozens of different things to different searchers — and the keyword approach doesn't distinguish between them.

### The New Way: Entities

An entity is a **distinct, well-defined concept** in Google's knowledge graph. "CRM software" isn't a string — it's a node connected to other nodes (pricing, features, vendors, use cases, comparisons, alternatives). The entity-based approach asks:

- What are all the **attributes** of this entity that users might want to know?
- What **relationships** does this entity have with other entities?
- What **values** do those attributes take?
- What **intent** drives a user to seek this information?

This is the Entity-Attribute-Value (E-A-V) model. For every topic, we extract:

| Entity | Attribute | Value(s) |
|--------|-----------|----------|
| CRM Software | pricing_model | per_user, tiered, freemium, usage_based |
| CRM Software | deployment | cloud, on_premise, hybrid |
| CRM Software | target_user | smb, enterprise, startup, freelancer |
| CRM Software | integration | email, calendar, accounting, analytics, erp |

Each row in this table represents a potential content piece or section within a page. The goal is to ensure the site's content collectively covers all relevant E-A-V triples for the central entity.

### Why E-A-V Beats Keywords

1. **Semantic completeness**: E-A-V ensures you cover the topic as Google understands it, not just as keyword tools report it.
2. **Zero-volume opportunities**: Some important entities have low search volume but are critical for coverage completeness.
3. **Future-proof**: As Google gets better at semantic understanding, entity-based content becomes more valuable, not less.
4. **Content differentiation**: Most competitors use keyword tools. An entity-based approach naturally produces content that competitors haven't thought of.

---

## The 2024 Leak: siteFocusScore and siteRadius

In early 2024, internal Google documentation was leaked that revealed several previously unknown ranking signals. Two of the most important for topical authority are:

### siteFocusScore

This metric measures how **concentrated** a website's content is around a central topic. Think of it as the inverse of topical sprawl.

- A site that publishes exclusively about "project management" has a high `siteFocusScore`.
- A site that publishes about "project management" on Monday, "dog training" on Tuesday, and "cryptocurrency" on Wednesday has a low `siteFocusScore`.

Google uses this signal to determine whether a site is a genuine authority on a topic or just a general-purpose publisher that happens to have a few pages about the topic.

**How to maintain a high siteFocusScore:**

- Keep 80-85% of content in the Core Section (tightly coupled to the central entity).
- Limit Outer Section content to 15-20% of total pages.
- Ensure every page has a clear semantic connection to the central entity.
- Avoid "content bloat" — pages that exist only for traffic, not for coverage.

### siteRadius

This metric measures the **semantic distance** of an individual page from the site's topical core. Every page on the site gets a `siteRadius` score.

- A page about "CRM pricing" on a CRM-focused site has a low `siteRadius`.
- A page about "healthy recipes" on a CRM-focused site has a very high `siteRadius`.

High `siteRadius` pages directly reduce the `siteFocusScore`. The algorithm doesn't just look at the average — it penalizes sites with individual pages that are dramatically off-topic.

**How to manage siteRadius:**

- Before creating any page, ask: "Is this page about an attribute of my central entity, or is it a different entity entirely?"
- If a topic is interesting but off-topic, consider publishing it on a subdomain or a separate site.
- Use the `siteRadius` simulation in this skill to flag potential issues before content is published.

### The Interaction

```
siteFocusScore ≈ f(average_siteRadius, max_siteRadius, core_content_ratio)
```

A single extremely high-`siteRadius` page can disproportionately damage the `siteFocusScore`. This is why the skill proactively warns about dilution — it's not just about having too many off-topic pages; even one very off-topic page can hurt.

---

## The 74% Coverage Benchmark

Analysis of SERP correlations shows a clear threshold separating top-ranking pages from the rest:

| SERP Position | Average Entity Coverage |
|---------------|------------------------|
| Positions 1-3 | ~78% of relevant entities covered |
| Positions 1-10 | ~74% of relevant entities covered |
| Positions 11-20 | ~60% of relevant entities covered |
| Positions 20+ | ~50% of relevant entities covered |

### What "74% Coverage" Means

This doesn't mean you need to cover 74% of all possible facts about a topic (which could be infinite). It means covering 74% of the **commonly expected entities and attributes** that Google's knowledge graph associates with the topic. For a given topic, there's a finite, discoverable set of entities that top-ranking pages consistently cover.

### How to Apply This

1. **Extract the ideal entity set** for the topic using E-A-V analysis.
2. **Audit existing content** against this set.
3. **Calculate current coverage** as a percentage.
4. **Prioritize gaps** by coverage impact — which missing entities, if covered, would most increase the percentage?
5. **Target 74% as the minimum** for competitive ranking potential.

Note: this is a guideline, not a guarantee. Coverage alone doesn't determine ranking (engagement matters too), but pages below 74% coverage are rarely in the top 10.

---

## The Hub & Spokes Internal Linking Model

Internal linking is the mechanism through which topical authority **circulates** within a site. Without strategic internal links, even perfectly written content won't achieve its ranking potential because Google can't determine the topical relationships between pages.

### Architecture

```
                    [Core Entity Pillar Page]
                           /    |    \
                          /     |     \
                   [Hub 1]  [Hub 2]  [Hub 3]
                   / | \     / | \     / | \
                 /   |   \  /   |   \ /   |   \
              [S]  [S]  [S] [S] [S] [S] [S] [S] [S]

S = Spoke Page
```

### Rules

1. **Every cluster has exactly one hub** (pillar page). The hub is the most comprehensive page on the cluster topic — it should cover all sub-topics at a high level and link to the spoke pages for detail.

2. **The hub links to ALL its spokes.** This is the outward flow of the hub.

3. **Every spoke links back to its hub.** This reinforces the hub's authority for the cluster topic.

4. **Spokes may link to other spokes** within the same cluster when they share entities, but this is optional and should be natural (not forced).

5. **Cross-cluster links** are valuable when two clusters share an entity. For example, a "CRM Integrations" cluster and a "CRM Automation" cluster both relate to "workflow" — linking between them signals topical depth.

6. **Outer Section → Core Section flow.** Outer (discovery) pages should link inward to Core pages. This funnels authority from broad discovery content toward high-conversion core content. Avoid the reverse (core pages linking out to outer pages) except where contextually essential.

### Why This Matters

Google uses internal links to understand:
- **Which pages are important** (pages with many internal links are weighted higher)
- **What topics are related** (pages that link to each other are topically connected)
- **The site's topical structure** (hub-and-spoke patterns signal organized expertise)

A site with 100 pages but no internal linking strategy is just a collection of orphaned documents. The Hub & Spokes model transforms it into an **information network** where authority compounds.

---

## E-E-A-T Integration

E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) is not a separate concern from topical authority — it is part of the same system. Google's quality raters evaluate E-E-A-T as part of the "Page Quality" rating, and the algorithm approximates these signals at scale.

### For Topical Authority Purposes

- **Experience**: The content should demonstrate first-hand interaction with the topic. For a CRM topical map, this means including real screenshots, workflow examples, and case studies — not just abstract descriptions.
- **Expertise**: Content should go beyond surface-level explanations. It should cite primary sources, reference industry frameworks, and demonstrate domain-specific knowledge that a generalist couldn't produce.
- **Authoritativeness**: The site should reference and be referenced by other authoritative sources in the space. Content should link out to high-quality sources and earn backlinks from them.
- **Trustworthiness**: Accuracy is non-negotiable. Claims should be cited. Methodology should be transparent. Limitations should be acknowledged.

### Content Brief Requirements

Every content brief produced by this skill should include an E-E-A-T section with:

- At least 2 specific recommendations per dimension (Experience, Expertise, Authoritativeness, Trustworthiness).
- Recommendations must be **specific to the topic** — not generic advice like "include expert quotes."
- Sources or evidence types should be named (e.g., "cite Gartner's 2024 CRM market report", "include a comparison table with data from Capterra reviews").

---

## Content Depth vs Content Volume

This is one of the most misunderstood aspects of topical authority.

### The Wrong Approach

"I need to publish 200 pages about CRM to outrank my competitor who has 180 pages."

This leads to:
- Thin, repetitive content
- Keyword cannibalization
- Increased `siteRadius` (dilution)
- Potential quality penalties
- Wasted resources

### The Right Approach

"I need to cover 74% of the entities associated with CRM. Let me identify which entities my competitor misses and create deep, comprehensive content for those specific gaps."

This leads to:
- Focused, high-quality content
- Unique coverage that competitors lack
- Maintained or improved `siteFocusScore`
- Better engagement signals (dwell time, CTR)
- Efficient resource allocation

### Depth Indicators

A page has sufficient depth when it:
1. Covers all E-A-V attributes relevant to its specific topic.
2. Addresses multiple search intents related to the topic.
3. Provides original insight, data, or analysis — not just regurgitated information.
4. Includes practical, actionable information (not just theory).
5. Demonstrates E-E-A-T through specific evidence (case studies, screenshots, methodology descriptions).

A 2,000-word page that thoroughly covers 5 entity attributes is more valuable than a 5,000-word page that superficially touches on 20.

---

## Semantic Distance and Topic Boundaries

Not everything related to a topic belongs in a site's topical map. Understanding **semantic distance** helps determine where to draw the line.

### The Concentric Model

```
         [Discovery Ring - Outer Section]
        /   Topics 2-3 hops from core    \
       /     (15-20% of content)          \
      |                                       |
      |    [Inner Ring - Core Section]        |
      |     Topics 1 hop from core            |
      |     (80-85% of content)               |
      |                                       |
       \         [Central Entity]            /
        \___________________________________/
```

### Hierarchy of Distance

- **0 hops**: The central entity itself and its direct attributes (e.g., "CRM pricing" from "CRM").
- **1 hop**: Closely related entities that share attributes with the core (e.g., "sales automation" shares the "workflow" attribute with CRM).
- **2 hops**: Tangentially related topics (e.g., "remote team management" — relevant to CRM users but not an attribute of CRM itself).
- **3+ hops**: Generally too far. A "recipe for chicken stir-fry" on a CRM site is 10+ hops away.

### Decision Framework

When evaluating whether a topic belongs in the topical map:

1. Does this topic share at least one E-A-V attribute with the central entity? If no → reject or move to subdomain.
2. Is the shared attribute a **primary** attribute of the central entity, or a secondary one? Primary → Core Section. Secondary → Outer Section.
3. Would covering this topic create a meaningful connection in the internal link graph? If the only connection is a generic "related topics" link → reconsider.
4. Would a user searching for this topic realistically be interested in the central entity? If the conversion path is too long → Outer Section at best.

---

## The Prompt Chaining Approach

Generating a high-quality topical map in a single prompt is unreliable. The recommended approach is to chain multiple analysis steps:

### Chain 1: Entity Extraction

**Input**: User's central entity (e.g., "CRM software for small businesses")

**Task**: Extract the complete entity profile — name, type, definition, attributes (E-A-V), aliases, parent/child entities.

**Output**: `EntityProfile` (see `schema.md`)

### Chain 2: Cluster Architecture

**Input**: `EntityProfile` from Chain 1

**Task**: Group attributes into logical clusters, define pillar pages and spoke pages, classify each topic's search intent, and assign to Core or Outer section.

**Output**: Array of `Cluster` objects

### Chain 3: Coverage Validation

**Input**: The complete cluster architecture from Chain 2

**Task**: Simulate the `siteFocusScore` and `siteRadius` for the proposed map. Validate that coverage would reach 74%. Flag any dilution risks. Check that every entity attribute is assigned to at least one page.

**Output**: `FocusMetrics` + gap identification

### Chain 4: Link Architecture

**Input**: Validated cluster architecture from Chain 3

**Task**: Design the Hub & Spokes internal linking structure. Map cross-cluster links. Validate authority flow direction (Outer → Core). Check for orphan pages.

**Output**: `LinkingBlueprint`

### Chain 5: E-E-A-T Briefs (Optional)

**Input**: Individual topic nodes from the validated architecture

**Task**: Generate E-E-A-T-specific content briefs for each page, with actionable recommendations per dimension.

**Output**: Per-page `EEATGuidelines`

### Why Chaining Works

Each chain produces a structured output that the next chain consumes. This prevents hallucination (each step validates the previous), ensures consistency (data structures are passed between steps), and produces output that is both comprehensive and accurate.

When executing this skill, think of yourself as running through these chains sequentially. Even in a single response, structure your analysis following this chain order.