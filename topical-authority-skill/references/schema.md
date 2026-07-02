# Schema Definitions

Complete TypeScript/Zod type definitions for the Topical Authority Skill outputs.

All structures below are designed to be both human-readable and machine-parseable. When the skill produces structured output, it should conform to these types.

---

## Table of Contents

1. [Core Enumerations](#core-enumerations)
2. [Entity-Attribute-Value (E-A-V)](#entity-attribute-value-e-a-v)
3. [Topical Map](#topical-map)
4. [Cluster & Topic Node](#cluster--topic-node)
5. [Coverage Analysis](#coverage-analysis)
6. [Internal Linking Blueprint](#internal-linking-blueprint)
7. [Focus Score Metrics](#focus-score-metrics)
8. [E-E-A-T Recommendations](#e-e-a-t-recommendations)

---

## Core Enumerations

```typescript
enum EntityType {
  Product = "product",
  Service = "service",
  Concept = "concept",
  Organization = "organization",
  Location = "location",
  Person = "person",
  Event = "event",
  Industry = "industry",
  Tool = "tool",
  Methodology = "methodology",
}

enum SearchIntent {
  Informational = "informational",
  CommercialInvestigation = "commercial_investigation",
  Transactional = "transactional",
  Navigational = "navigational",
}

enum ContentPriority {
  Critical = "critical",       // Missing, high-impact, directly on the entity
  High = "high",               // Missing, moderate-impact, close to entity
  Medium = "medium",           // Missing, lower-impact, outer ring
  Low = "low",                 // Nice-to-have, discovery content
  Existing = "existing",       // Already covered
  Dilution = "dilution",       // Should be removed or moved (high siteRadius)
}

enum SectionType {
  Core = "core",       // Inner ring — tightly coupled to central entity
  Outer = "outer",     // Discovery ring — tangentially related
}

enum Difficulty {
  Low = "low",
  Medium = "medium",
  High = "high",
}
```

---

## Entity-Attribute-Value (E-A-V)

The fundamental data model for semantic extraction. Every topic in the topical map is decomposed into entity-attribute-value triples.

```typescript
interface EAVTriple {
  /** The subject entity being described */
  entity: string;

  /** A property or characteristic of the entity */
  attribute: string;

  /** The specific value or range of values for this attribute */
  values: string[];

  /** How confident we are this attribute is relevant (0-1) */
  confidence: number;

  /** Source of this E-A-V: "extracted" | "inferred" | "user_provided" */
  source: "extracted" | "inferred" | "user_provided";
}

interface EntityProfile {
  /** The canonical name of the entity */
  name: string;

  /** The type classification of this entity */
  type: EntityType;

  /** A one-sentence definition of this entity */
  definition: string;

  /** All extracted E-A-V triples */
  attributes: EAVTriple[];

  /** Synonyms, aliases, and related terms */
  aliases: string[];

  /** Broader parent entity (hypernym) if applicable */
  parentEntity?: string;

  /** More specific sub-entities (hyponyms) */
  childEntities?: string[];
}
```

### Zod Equivalent

```typescript
import { z } from "zod";

const EAVTripleSchema = z.object({
  entity: z.string().describe("The subject entity being described"),
  attribute: z.string().describe("A property or characteristic of the entity"),
  values: z.array(z.string()).describe("Specific values for this attribute"),
  confidence: z.number().min(0).max(1).describe("Relevance confidence score"),
  source: z.enum(["extracted", "inferred", "user_provided"]),
});

const EntityProfileSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(EntityType),
  definition: z.string(),
  attributes: z.array(EAVTripleSchema),
  aliases: z.array(z.string()),
  parentEntity: z.string().optional(),
  childEntities: z.array(z.string()).optional(),
});
```

---

## Topical Map

The top-level output structure for Feature 1 (Topical Map Generator).

```typescript
interface TopicalMap {
  /** The central entity this entire map is built around */
  centralEntity: EntityProfile;

  /** All clusters in the map, split by section */
  coreSection: Cluster[];
  outerSection: Cluster[];

  /** Simulated focus metrics */
  focusMetrics: FocusMetrics;

  /** E-E-A-T guidelines for this domain */
  eeatGuidelines: EEA Guidelines;

  /** Metadata about the generation */
  meta: TopicalMapMeta;
}

interface TopicalMapMeta {
  /** ISO timestamp of generation */
  generatedAt: string;

  /** Total number of topic nodes across all clusters */
  totalTopics: number;

  /** Estimated coverage if all topics were created */
  estimatedCoveragePercent: number;

  /** Number of clusters */
  totalClusters: number;

  /** Core vs Outer ratio as a percentage */
  coreToOuterRatio: string;
}
```

### Zod Equivalent

```typescript
const TopicalMapMetaSchema = z.object({
  generatedAt: z.string().datetime(),
  totalTopics: z.number().int(),
  estimatedCoveragePercent: z.number().min(0).max(100),
  totalClusters: z.number().int(),
  coreToOuterRatio: z.string(),
});

const TopicalMapSchema = z.object({
  centralEntity: EntityProfileSchema,
  coreSection: z.array(ClusterSchema),
  outerSection: z.array(ClusterSchema),
  focusMetrics: FocusMetricsSchema,
  eeatGuidelines: EEA GuidelinesSchema,
  meta: TopicalMapMetaSchema,
});
```

---

## Cluster & Topic Node

A cluster is a group of topically related pages organized around a pillar (hub) page.

```typescript
interface Cluster {
  /** Unique identifier for the cluster */
  id: string;

  /** Human-readable cluster name */
  name: string;

  /** Whether this cluster is in the core or outer section */
  section: SectionType;

  /** The hub/pillar page for this cluster */
  pillarPage: TopicNode;

  /** All spoke pages in this cluster */
  spokes: TopicNode[];

  /** Entities shared with other clusters (for cross-linking) */
  sharedEntities: string[];

  /** Estimated percentage of total topic coverage this cluster contributes */
  coverageContribution: number;

  /** Primary search intent of this cluster */
  primaryIntent: SearchIntent;
}

interface TopicNode {
  /** Suggested page title */
  title: string;

  /** Brief description of what this page covers */
  description: string;

  /** E-A-V attributes this page must cover */
  requiredAttributes: EAVTriple[];

  /** Search intent classification */
  intent: SearchIntent;

  /** Related entities mentioned on this page */
  relatedEntities: string[];

  /** Suggested word count range */
  wordCountRange: {
    min: number;
    max: number;
  };

  /** Internal links: pages this should link to */
  outboundLinks: string[];

  /** Internal links: pages that should link to this */
  inboundLinks: string[];

  /** E-E-A-T specific requirements for this page */
  eeatRequirements: string[];

  /** Priority for content creation */
  priority: ContentPriority;
}
```

---

## Coverage Analysis

The output structure for Feature 2 (Gap Analysis).

```typescript
interface CoverageAnalysis {
  /** The topic being analyzed */
  topic: string;

  /** The central entity profile used as reference */
  referenceEntity: EntityProfile;

  /** All entities/attributes that SHOULD be covered */
  idealEntitySet: EAVTriple[];

  /** What's currently covered in the user's content */
  coveredEntities: EAVTriple[];

  /** What's missing */
  gaps: CoverageGap[];

  /** Pages that dilute focus (high siteRadius) */
  dilutionWarnings: DilutionWarning[];

  /** Aggregate coverage score */
  coverageScore: CoverageScore;

  /** Priority-ranked list of content to create */
  recommendations: ContentRecommendation[];
}

interface CoverageGap {
  /** The missing E-A-V triple */
  entity: EAVTriple;

  /** How much creating content for this gap would increase coverage */
  impactPercent: number;

  /** Difficulty of creating quality content for this gap */
  difficulty: Difficulty;

  /** Which competitor or source covers this (if known) */
  competitorCoverage?: string;

  /** Suggested page title to fill this gap */
  suggestedTitle?: string;
}

interface DilutionWarning {
  /** The page/topic that's too far from the core */
  topic: string;

  /** Estimated siteRadius score (0-1, higher = more diluted) */
  siteRadiusScore: number;

  /** Why this topic is flagged */
  reason: string;

  /** Recommendation: "remove" | "move_to_subdomain" | "keep_with_warning" */
  recommendation: "remove" | "move_to_subdomain" | "keep_with_warning";
}

interface CoverageScore {
  /** Current percentage of entities covered */
  current: number;

  /** Target percentage (74% by default) */
  target: number;

  /** Gap to close */
  gap: number;

  /** Total entities in the ideal set */
  totalEntities: number;

  /** Number currently covered */
  covered: number;

  /** Number missing */
  missing: number;
}

interface ContentRecommendation {
  /** Priority rank (1 = most important) */
  rank: number;

  /** Suggested page title */
  title: string;

  /** Which gap this addresses */
  addressesGap: string;

  /** Expected coverage increase */
  coverageIncrease: number;

  /** Estimated effort */
  effort: Difficulty;

  /** Key entities/attributes to include */
  keyEntities: string[];

  /** Brief content brief (2-3 sentences) */
  brief: string;
}
```

---

## Internal Linking Blueprint

The output structure for Feature 3 (Internal Linking Architect).

```typescript
interface LinkingBlueprint {
  /** All hub-spoke relationships */
  hubs: HubDefinition[];

  /** Cross-cluster links */
  crossClusterLinks: CrossClusterLink[];

  /** Pages with no inbound internal links */
  orphanPages: string[];

  /** Authority flow validation */
  flowValidation: FlowValidation;
}

interface HubDefinition {
  /** The pillar page title */
  pillarPage: string;

  /** All spoke pages this hub links to */
  outboundLinks: LinkDefinition[];

  /** All spoke pages that link back to this hub */
  inboundLinks: string[];

  /** Anchor text suggestion for the hub link */
  hubAnchorText: string;
}

interface LinkDefinition {
  /** Target page title */
  targetPage: string;

  /** Suggested anchor text (descriptive, not generic) */
  anchorText: string;

  /** Context of the link (why these pages are related) */
  context: string;

  /** Link direction relative to the core entity */
  direction: "core_to_core" | "outer_to_core" | "core_to_outer" | "outer_to_outer";
}

interface CrossClusterLink {
  /** Source page */
  source: string;

  /** Target page */
  target: string;

  /** Shared entity that justifies the link */
  sharedEntity: string;

  /** Suggested anchor text */
  anchorText: string;

  /** Which clusters are being connected */
  sourceCluster: string;
  targetCluster: string;
}

interface FlowValidation {
  /** Whether outer→core flow is maintained */
  outerToCoreFlow: boolean;

  /** Whether any core→outer links are excessive */
  excessiveCoreToOuter: boolean;

  /** Total number of internal links in the blueprint */
  totalLinks: number;

  /** Average links per page */
  averageLinksPerPage: number;

  /** Any structural issues detected */
  issues: string[];
}
```

---

## Focus Score Metrics

Simulated versions of Google's internal metrics from the 2024 leak.

```typescript
interface FocusMetrics {
  /** Overall site focus score (0-1, higher = more focused) */
  siteFocusScore: number;

  /** Average siteRadius across all pages (0-1, lower = more focused) */
  averageSiteRadius: number;

  /** Per-page radius scores */
  pageRadii: PageRadius[];

  /** Overall assessment */
  assessment: "excellent" | "good" | "moderate" | "diluted" | "severely_diluted";
}

interface PageRadius {
  /** The page/topic title */
  page: string;

  /** Semantic distance from the central entity (0-1) */
  radius: number;

  /** Section this page belongs to */
  section: SectionType;

  /** Whether this page is flagged as too far */
  flagged: boolean;
}
```

---

## E-E-A-T Recommendations

Structured E-E-A-T guidance for content briefs.

```typescript
interface EEATGuidelines {
  /** Domain-specific E-E-A-T strategy */
  domainStrategy: string;

  /** Per-dimension recommendations */
  experience: EEATDimension;
  expertise: EEATDimension;
  authoritativeness: EEATDimension;
  trustworthiness: EEATDimension;
}

interface EEATDimension {
  /** Name of the dimension */
  dimension: "Experience" | "Expertise" | "Authoritativeness" | "Trustworthiness";

  /** Why this dimension matters for this specific topic */
  relevance: string;

  /** 2-4 specific, actionable recommendations */
  recommendations: string[];

  /** Sources or types of evidence to include */
  evidenceTypes: string[];
}
```