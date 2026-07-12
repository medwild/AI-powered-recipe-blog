# GEO Chef Augustin + Pinclicks — Plan d'Implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two surgical improvements: (1) add proactive GEO writing instructions to Chef Augustin's system prompt, (2) create a Pinclicks CSV ingestion script (conditional on file availability).

**Architecture:** Modification chirurgicale — 1 fichier Markdown modifié (skill), 1 script créé, 2 fichiers de doc mis à jour. Zéro changement pipeline, zéro nouveau skill, zéro nouvelle dépendance. Le GEO s'ajoute comme §4.7 dans le skill existant. Le Pinclicks est un script standalone qui enrichit l'output JSON de `seo-organic-rankings-analyzer`.

**Tech Stack:** TypeScript (script Pinclicks), Markdown (skill Chef Augustin). Aucune nouvelle dépendance.

## Global Constraints

- Aucun nouveau step Inngest — le pipeline reste inchangé
- Aucun nouveau skill Markdown — pas de doublon avec `seo-organic-rankings-analyzer`
- Aucun nouvel agent — Chef Augustin + Pin Designer suffisent
- `npx tsc --noEmit` doit passer après toute modification de fichier TypeScript
- Les prédictions chiffrées sont interdites — aucun impact score/coût ne sera promis
- L'amélioration Pinclicks est **conditionnelle** : ne rien implémenter tant que le fichier Pinclicks n'est pas fourni
- Le skill Chef Augustin modifié ne doit PAS casser le contrat Output Schema (§8) existant

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `skills/agent-chef-augustin.md` | Modify | Ajout §4.7 GEO + màj §5 Self-Check |
| `scripts/ingest-pinclicks.ts` | Create | Parse CSV Pinclicks → JSON enrichi |
| `.claude/skills/seo-organic-rankings-analyzer/SKILL.md` | Modify | Phase 0 — jointure optionnelle Pinclicks |
| `.claude/skills/seo-organic-rankings-analyzer/references/csv-schema.md` | Modify | Documenter colonne `pinterest_search_volume` |

---

### Task 1: Add GEO Optimization §4.7 to Chef Augustin skill

**Files:**
- Modify: `skills/agent-chef-augustin.md:115` (after §4.6 Culinary Precision, before `## 5. SELF-CHECK`)

**Interfaces:**
- Consumes: Nothing — standalone Markdown change
- Produces: §4.7 section with 4 subsections (Answer Nuggets, Citation-Ready Claims, Structured Data Points, LLM-Friendly Formatting)

- [ ] **Step 1: Insert §4.7 after line 115 of `skills/agent-chef-augustin.md`**

Insert the following block between `## 5. SELF-CHECK` (line 117) and the end of §4.6 (line 115). The exact insertion point is after line 115 (`- USDA minimums: poultry ≥165°F, ground meat ≥160°F, whole cuts ≥145°F`) and before the blank line + `---` separator that precedes `## 5. SELF-CHECK`.

```markdown
### 4.7 GEO Optimization — AI Overview Citability

Your content competes for citation in AI-generated answers (Google AI Overviews, ChatGPT, Perplexity). Write so that LLMs extract and attribute facts to you.

**Answer Nuggets (≥4, distributed throughout):**
Every 300-400 words, place a self-contained factual block that answers one specific question in 1-3 sentences. Format it as a standalone paragraph — a bot must be able to lift it verbatim without context:

> "[Specific number/mechanism/cause] because [reason backed by culinary science]."

Examples:
- "A 30-minute rest at room temperature raises steak core temp by 8°F, cutting sear time by 40% and reducing the gray band."
- "Diamond Crystal kosher salt dissolves 2× faster than Morton's because its hollow pyramid crystals have 60% more surface area per gram."

These are NOT the same as recipe instructions. They are standalone facts that answer "why" or "how much" — the kind of data an AI Overview extracts for "how long should I rest steak before cooking."

**Citation-Ready Claims (pattern: claim + mechanism + source anchor):**
Every factual claim MUST include three elements in the same paragraph: (1) the specific claim, (2) why it works (causal mechanism), (3) a named entity as attribution anchor. Rotate anchors — do not repeat the same pattern consecutively.

Valid anchors: "Chef Augustin Lefèvre [action verb]...", "In French culinary tradition...", "According to [food science source]...", "Professional kitchens standardize this by..."

**Structured Data Points:**
- All cooking temperatures in both °F and °C — AI crawlers index both units and serve the one matching the user's locale
- Times as exact minutes, never ranges or approximations — "12 minutes" not "about 10-15 minutes"
- Key ingredient quantities as both volume AND weight — "1 cup (140g) all-purpose flour"
- Technique names as precise culinary terms — "sear" not "brown", "deglaze" not "add liquid"

**LLM-Friendly Formatting:**
- Technique explanations as numbered steps when the order matters — LLMs extract ordered lists more reliably than narrative paragraphs
- Comparative data as "X vs Y: [difference]" — e.g., "Cast iron vs stainless: cast iron holds 4× more heat but reacts with acidic ingredients"
- Never bury a core instruction inside a long narrative paragraph — AI extractors truncate paragraphs at ~300 tokens; if it's important, it gets its own short paragraph
```

- [ ] **Step 2: Update §5 Self-Check to include GEO items**

Replace the existing Self-Check block (lines 119-126) with the updated version that includes checks 7, 8, and 9:

The old block:
```markdown
## 5. SELF-CHECK (Before Output)

1. **Attribution count** — pin-first: ≥4, google: ≥6. Count them NOW.
2. **Banned words** — remove ALL Tier 1-3 violations.
3. **Structure** — pin-first: recipe card within 500 chars, 4-6 [IMAGE:], no prohibited sections.
4. **Temperatures** — all meet USDA minimums.
5. **Freshness marker** — current month + year present.
6. **Who/How/Why test** — byline visible, technique disclosed, genuine teaching intent.
```

Replace with:
```markdown
## 5. SELF-CHECK (Before Output)

1. **Attribution count** — pin-first: ≥4, google: ≥6. Count them NOW.
2. **Banned words** — remove ALL Tier 1-3 violations.
3. **Structure** — pin-first: recipe card within 500 chars, 4-6 [IMAGE:], no prohibited sections.
4. **Temperatures** — all meet USDA minimums.
5. **Freshness marker** — current month + year present.
6. **Who/How/Why test** — byline visible, technique disclosed, genuine teaching intent.
7. **Answer nuggets** — ≥4 standalone factual blocks. Each answers one specific question in 1-3 sentences. Scan for "[number] because [mechanism]" pattern.
8. **Dual temperatures** — every cooking temperature appears in both °F and °C.
9. **LLM-friendly structure** — core techniques in numbered steps or short standalone paragraphs. No critical instruction buried inside a paragraph exceeding 4 lines.
```

- [ ] **Step 3: Verify the skill file integrity**

Run a quick sanity check — the file should still have the same number of top-level sections (## 1 through ## 10), and §8 Output Schema must be unchanged:

```bash
grep -c "^## " skills/agent-chef-augustin.md
# Expected: 10 (sections 1-10) — §4.7 is a subsection (###) not a top-level section
grep -A5 "## 8. OUTPUT SCHEMA" skills/agent-chef-augustin.md | head -7
# Verify the JSON schema block is intact
```

- [ ] **Step 4: Commit**

```bash
git add skills/agent-chef-augustin.md
git commit -m "feat: add GEO Optimization §4.7 to Chef Augustin skill — proactive AI Overview citability"
```

---

### Task 2: Create Pinclicks CSV ingestion script

> **⛔ GATE: Do NOT start this task until the user provides the Pinclicks CSV file.**
> Without the actual file, you cannot validate the CSV format, keyword normalization, or jointure quality.

**Files:**
- Create: `scripts/ingest-pinclicks.ts`

**Interfaces:**
- Consumes: Pinclicks CSV file (path provided by user), `data/parsed-keywords.json` (existing, from `seo-organic-rankings-analyzer` Phase 0)
- Produces: Enriched `data/parsed-keywords.json` with `pinterestSearchVolume` field added to each keyword entry

- [ ] **Step 1: Write the script**

Create `scripts/ingest-pinclicks.ts`:

```typescript
/**
 * ingest-pinclicks.ts — Parse Pinclicks CSV and enrich parsed-keywords.json
 *
 * Usage: npx tsx scripts/ingest-pinclicks.ts <pinclicks.csv>
 * Input:  Pinclicks CSV export (keyword, pinterest_search_volume columns)
 * Output: data/parsed-keywords.json enriched with pinterestSearchVolume field
 *
 * The script reads the existing parsed-keywords.json, joins on normalized keyword,
 * and writes back the enriched version. Keywords not found in Pinclicks data
 * get pinterestSearchVolume: null.
 */

import * as fs from "fs";
import * as path from "path";

interface PinclicksRow {
  keyword: string;
  pinterestSearchVolume: number | null;
}

interface ParsedKeyword {
  keyword: string;
  normalizedKeyword: string;
  pinterestSearchVolume?: number | null;
  [key: string]: unknown;
}

function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().trim().replace(/\s+/g, " ");
}

function parsePinclicksCsv(filePath: string): Map<string, number> {
  const raw = fs.readFileSync(filePath, "utf-8");
  // Strip BOM if present
  const content = raw.replace(/^﻿/, "");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    throw new Error("Pinclicks CSV has no data rows");
  }

  const header = lines[0].toLowerCase();
  const columns = header.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

  const keywordIdx = columns.findIndex(
    (c) => c === "keyword" || c === "query" || c === "search term"
  );
  const volumeIdx = columns.findIndex(
    (c) =>
      c.includes("volume") ||
      c.includes("searches") ||
      c.includes("search volume")
  );

  if (keywordIdx === -1) {
    throw new Error(
      `Could not find keyword column in Pinclicks CSV. Headers: ${columns.join(", ")}`
    );
  }
  if (volumeIdx === -1) {
    throw new Error(
      `Could not find volume column in Pinclicks CSV. Headers: ${columns.join(", ")}`
    );
  }

  const map = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    // Simple split — Pinclicks CSVs are typically clean (no embedded commas in keyword/volume)
    const fields = lines[i].split(",").map((f) => f.trim().replace(/^"|"$/g, ""));
    const kw = fields[keywordIdx];
    const volRaw = fields[volumeIdx];

    if (!kw) continue;

    const normalized = normalizeKeyword(kw);
    const volume = parseInt(volRaw, 10);

    if (!isNaN(volume) && volume > 0) {
      map.set(normalized, volume);
    }
  }

  return map;
}

function enrichParsedKeywords(
  parsedPath: string,
  volumeMap: Map<string, number>
): { enriched: ParsedKeyword[]; matched: number; unmatched: number } {
  const raw = fs.readFileSync(parsedPath, "utf-8");
  const keywords: ParsedKeyword[] = JSON.parse(raw);

  let matched = 0;
  let unmatched = 0;

  const enriched = keywords.map((kw) => {
    const normalized = normalizeKeyword(kw.normalizedKeyword || kw.keyword);
    const volume = volumeMap.get(normalized);

    if (volume !== undefined) {
      matched++;
      return { ...kw, pinterestSearchVolume: volume };
    } else {
      unmatched++;
      return { ...kw, pinterestSearchVolume: null };
    }
  });

  return { enriched, matched, unmatched };
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: npx tsx scripts/ingest-pinclicks.ts <pinclicks.csv>");
    process.exit(1);
  }

  const pinclicksPath = args[0];
  const parsedPath = path.resolve("data/parsed-keywords.json");

  if (!fs.existsSync(pinclicksPath)) {
    console.error(`Pinclicks file not found: ${pinclicksPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(parsedPath)) {
    console.error(
      `parsed-keywords.json not found at ${parsedPath}. Run seo-organic-rankings-analyzer Phase 0 first.`
    );
    process.exit(1);
  }

  console.log(`Reading Pinclicks data from: ${pinclicksPath}`);
  const volumeMap = parsePinclicksCsv(pinclicksPath);
  console.log(`Parsed ${volumeMap.size} keywords with search volume data`);

  console.log(`Reading parsed keywords from: ${parsedPath}`);
  const { enriched, matched, unmatched } = enrichParsedKeywords(
    parsedPath,
    volumeMap
  );

  // Backup existing file
  const backupPath = parsedPath.replace(".json", `.backup-${Date.now()}.json`);
  fs.copyFileSync(parsedPath, backupPath);
  console.log(`Backup saved to: ${backupPath}`);

  // Write enriched
  fs.writeFileSync(parsedPath, JSON.stringify(enriched, null, 2));
  console.log(`Enriched ${parsedPath}`);
  console.log(`  Matched: ${matched} keywords`);
  console.log(`  Unmatched: ${unmatched} keywords`);

  // Print distribution for threshold calibration
  const volumes = enriched
    .filter((k) => k.pinterestSearchVolume !== null && k.pinterestSearchVolume !== undefined)
    .map((k) => k.pinterestSearchVolume as number)
    .sort((a, b) => a - b);

  if (volumes.length > 0) {
    const p25 = volumes[Math.floor(volumes.length * 0.25)];
    const p50 = volumes[Math.floor(volumes.length * 0.5)];
    const p75 = volumes[Math.floor(volumes.length * 0.75)];
    console.log(`  Volume distribution (n=${volumes.length}):`);
    console.log(`    Min: ${volumes[0]}`);
    console.log(`    P25: ${p25}`);
    console.log(`    Median: ${p50}`);
    console.log(`    P75: ${p75}`);
    console.log(`    Max: ${volumes[volumes.length - 1]}`);
    console.log(
      `  Sample: ${enriched
        .filter((k) => k.pinterestSearchVolume !== null)
        .slice(0, 5)
        .map((k) => `${k.normalizedKeyword}: ${k.pinterestSearchVolume}`)
        .join(", ")}`
    );
  }
}

main();
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```
Expected: No errors. The script uses only Node.js built-ins (`fs`, `path`) — no new dependencies.

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest-pinclicks.ts
git commit -m "feat: add Pinclicks CSV ingestion script — enriches parsed-keywords.json with pinterestSearchVolume"
```

---

### Task 3: Document Pinclicks column in csv-schema.md

> **⛔ GATE: Same as Task 2 — blocked until Pinclicks file is provided.**

**Files:**
- Modify: `.claude/skills/seo-organic-rankings-analyzer/references/csv-schema.md`

**Interfaces:**
- Consumes: Nothing — standalone doc change
- Produces: Updated schema documenting the new optional column

- [ ] **Step 1: Add `pinterestSearchVolume` to the column specification table**

In `csv-schema.md`, the existing table ends at row 37 (`claude_code_instruction`). Add a note after the table explaining the optional Pinclicks enrichment.

Insert after the last row of the schema table (after the `claude_code_instruction` row):

```markdown

## Optional Columns (from Pinclicks enrichment)

| # | Column | Type | Description |
|---|---|---|---|
| 38 | `pinterestSearchVolume` | `integer \| null` | Monthly search volume on Pinterest.com (source: pinclicks.com). Added by `scripts/ingest-pinclicks.ts`. Null when the keyword was not found in Pinclicks data. |
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/seo-organic-rankings-analyzer/references/csv-schema.md
git commit -m "docs: document pinterestSearchVolume column from Pinclicks enrichment"
```

---

### Task 4: Add optional Pinclicks jointure to seo-organic-rankings-analyzer Phase 0

> **⛔ GATE: Same as Task 2 — blocked until Pinclicks file is provided.**

**Files:**
- Modify: `.claude/skills/seo-organic-rankings-analyzer/SKILL.md` (Phase 0 section)

**Interfaces:**
- Consumes: Existing Phase 0 workflow
- Produces: Phase 0 now mentions optional Pinclicks enrichment step

- [ ] **Step 1: Add Pinclicks step to Phase 0**

In `SKILL.md`, Phase 0 currently has 6 steps. Locate the Phase 0 section (starts with `### Phase 0 — CSV Ingestion & Validation`) and add a step 7 after step 6 ("Print summary"):

```markdown
7. **(Optional) Enrich with Pinclicks data:** If a Pinclicks CSV export is available, run the ingestion script to add native Pinterest search volume to each keyword:
   ```bash
   npx tsx scripts/ingest-pinclicks.ts <pinclicks.csv>
   ```
   This adds a `pinterestSearchVolume` field (integer, nullable) to every entry in `data/parsed-keywords.json`. The field is consumed by Phase 1 (niche filtering) if present, ignored otherwise. Skip this step if no Pinclicks data is available — the pipeline functions identically without it.
```

- [ ] **Step 2: Add scoring note to Phase 1**

In Phase 1 (Niche Filtering), locate the scoring rules list (the bullet points under "Niche relevance scoring (0-10):"). Add this rule at the end of the list:

```markdown
   - `pinterestSearchVolume` present and non-null: +1 (dual-potential signal — keyword has native Pinterest demand). Weighting is additive with Google search volume — a keyword ranking high on both signals gets the highest combined score.
```

**Note on threshold calibration:** The script `scripts/ingest-pinclicks.ts` prints the distribution of matched volumes (min, p25, median, p75, max) in its summary output. Use that output to decide whether additional weighting tiers are needed — if all matched keywords cluster within a narrow volume range, a single +1 rule is sufficient. If the range spans multiple orders of magnitude, add tiered scoring following the same pattern as the existing Google search volume rules.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/seo-organic-rankings-analyzer/SKILL.md
git commit -m "feat: add optional Pinclicks enrichment step to seo-organic-rankings-analyzer Phase 0"
```

---

## Execution Sequence

```
Task 1 (GEO prompt) ─── Ready now, no dependencies
     │
     └── Implement → Verify → Commit

Task 2, 3, 4 (Pinclicks) ─── BLOCKED until Pinclicks file provided
     │
     └── GATE: user provides CSV → Implement → Verify → Commit
```

Tasks 2, 3, and 4 are gated. Tasks 3 and 4 can be done in parallel with Task 2 since they modify different files.

**Recommended:** Execute Task 1 immediately (impact immédiat, zéro dépendance). Hold Tasks 2-4 until the Pinclicks file arrives.
