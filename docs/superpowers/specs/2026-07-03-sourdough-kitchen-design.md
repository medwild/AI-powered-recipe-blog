# The Sourdough Kitchen — Design Spec

> **Status**: Validé — 2026-07-03 | **Revision**: v1.1 (post LLM Council review)
> **Concept**: Chef Augustin vous apprend le sourdough — du starter au discard, de la croûte à la mie
> **Méthodologie**: Topical Authority Map — Koray Tuğberk GÜBÜR (Entity-Attribute-Value)
> **Source**: 204 keywords Semrush US, filtres volume≥50, KD≤29, intent info+commercial
> **Data extracted**: 2026-07-03 (Semrush US database)

---

## 1. Why Sourdough (and not world cuisines)

204 keywords analyzed, 6 clusters identified. Here's the data:

| Métrique | Sourdough | Filipino cuisine | Georgian cuisine |
|---|---|---|---|
| Volume combiné | **134K+/mo** | 18K/mo | 3.6K/mo |
| KD moyen | **3.8** | 22 | 21 |
| KD max | **5** | 29 | 23 |
| Résultats SERP médians | **<200** | 100K+ | 100K+ |
| Profondeur contenu | 90+ articles | 15-20 | 8-10 |

Sourdough is 5-8x easier to rank than the cuisines, with 7x more volume.

### Methodology & Caveats

- **Source**: Semrush US database, extracted 2026-07-03
- **Filters applied**: monthly volume ≥50, KD ≤29, intent = informational + commercial
- **KD interpretation**: Semrush KD measures backlink difficulty, not content quality of incumbents. A KD of 3.8 means backlink requirements are low, but it does NOT guarantee ranking — on-page quality, E-E-A-T signals, and brand authority still determine SERP position.
- **What this data CAN tell us**: relative opportunity size vs. other cuisines; topical depth available; keyword-level entry points.
- **What this data CANNOT tell us**: whether AI-generated content can outrank The Perfect Loaf or King Arthur for competitive terms; whether Google will index 90+ articles from a new domain.

---

## 2. Competitive Landscape

### Who ranks for sourdough terms (top SERP incumbents)

| Competitor | Domain Rating (est.) | Strengths | Weaknesses |
|---|---|---|---|
| **King Arthur Baking** | DR 79+ | 230+ years brand, employee-owned, tested recipes, massive backlink profile, dedicated sourdough discard collection | Generalist (flour company first, sourdough is one category); corporate voice |
| **The Perfect Loaf** | DR 65+ | Single-topic authority, baker persona (Maurizio), deep technique articles, baking schedules, community | One person = content cadence limited; persona is a software engineer, not a chef |
| **The Clever Carrot** | DR 55+ | Approachable tone, beginner-friendly, strong Pinterest presence, cookbook author | Less technical depth; general baking, not sourdough-only |
| **Farmhouse on Boone** | DR 50+ | Lifestyle/mommy blog crossover, strong Pinterest, video content | Not sourdough-specialized; persona is a homesteader, not a trained chef |
| **Little Spoon Farm** | DR 40+ | Beginner sourdough focus, simple recipes, "no-knead" angle | Narrow technique range; limited advanced content |
| **Pantry Mama** | DR 35+ | Strong discard recipe collection, Pinterest optimized | Limited technical authority; no culinary credentials |
| **Reddit r/Sourdough** | DR 90+ (domain) | 600K+ members, real user Q&A, troubleshooting goldmine, Google ranks Reddit threads high for long-tail questions | Not a blog; no structured recipes; no monetization |
| **YouTube (various)** | DR 95+ (domain) | Video demonstrations, visual proof of results, personality-driven | Not text-optimized for Google snippets; harder to extract quick answers |

### The gap: where we can win

1. **French chef authority** — Zero sourdough blogs position from a French-trained chef perspective. Incumbents are American bakers, homesteaders, or flour companies. A French culinary school + Parisian bakery narrative is a unique E-E-A-T signal.
2. **Sourdough-only depth** — Most competitors are either generalist (King Arthur) or lifestyle (Farmhouse on Boone). A single-entity sourdough site can go deeper on technique, science, and troubleshooting.
3. **Discard recipes with culinary credibility** — Pantry Mama and Little Spoon Farm have discard recipes, but none from a trained chef. The "discard + French technique" angle is open.
4. **Topical map coverage** — No single competitor covers all 6 sourdough clusters at depth. The Perfect Loaf covers technique + breads, but not dishes/storage. King Arthur covers everything but without a unified voice.
5. **Reddit gap analysis** — r/Sourdough reveals real user problems competitors don't address well: starter diagnostics by smell/texture, bulk fermentation visual cues, humidity adjustments, high-altitude baking. These are content moats.

### The threat: why we can lose

1. **King Arthur's discard collection** validates the demand but also proves the niche has an 800-pound gorilla. Their "Sourdough Discard Recipes" collection page ranks top 3 for the head term.
2. **Google's Helpful Content system** penalizes unverified AI content. If recipes aren't tested, the site won't survive a core update.
3. **Zero backlink profile** — new domain, no existing authority. KD 3.8 means link requirements are low, but not zero.
4. **The Perfect Loaf's depth** — Maurizio's technique articles are 3,000-5,000 words with original photography. Matching that depth with AI requires the full pipeline (Auditor + Editor loop).

---

## 3. Central Entity

```
Entity: Sourdough Home Baking
Type: Concept / Culinary Technique
Parent: Bread Baking
Definition: Complete sourdough mastery for home bakers — from creating a starter
           to baking artisan loaves, from troubleshooting to zero-waste discard recipes.
           Taught by Chef Augustin Lefevre, French-trained chef.
```

### E-A-V (Entity-Attribute-Value)

```
Attributes:
├── stage → [starter_creation, fermentation, shaping, baking, storage]
├── flour_type → [bread_flour, whole_wheat, rye, einkorn, semolina, gluten_free]
├── technique → [stretch_and_fold, scoring, steam, cold_proof, bulk_ferment]
├── equipment → [dutch_oven, banneton, lame, stand_mixer, baking_stone]
├── flavor_profile → [classic, garlic_parmesan, rosemary, cinnamon, jalapeno_cheddar]
├── dish_type → [bread, pizza, focaccia, bagel, crumpet, pretzel, cinnamon_roll]
├── discard_use → [crackers, pancakes, waffles, brownies, muffins, pizza_dough]
├── diet → [classic, vegan, gluten_free, einkorn, whole_wheat]
└── problem → [not_rising, too_dense, crust_too_hard, starter_dead, hooch]
```

---

## 4. Topical Map Architecture

```
                    [THE SOURDOUGH KITCHEN]
                   Chef Augustin Lefevre
                Entity: Sourdough Home Baking
                            |
	    ┌───────────┬───────────┼───────────┬───────────┬───────────┐
	    |           |           |           |           |           |
	[STARTER]   [TECHNIQUE] [DISCARD]   [BREADS]   [DISHES]   [STORAGE]
	 12 kw        15 kw       20+ kw      24 kw       41 kw      13 kw
	 5,650/mo    13,860/mo   78,000/mo    5,750/mo   13,680/mo   3,810/mo
```

### Cluster 1: Starter Care & Troubleshooting (12 articles)

**Hub**: "The Complete Guide to Sourdough Starter"
**KD avg**: 3.5 | **Volume**: 5,650/mo

| Title | Keyword | Vol | KD |
|---|---|---|---|
| Why Does My Starter Smell Like Acetone? | why does my sourdough starter smell like acetone | 390 | 4 |
| Can You Overfeed a Sourdough Starter? | can you overfeed sourdough starter | 320 | 2 |
| My Starter Is Runny — Here's the Fix | my sourdough starter is runny | 590 | 3 |
| White Mold on Starter: Safe or Toss? | white mold on sourdough starter | 260 | 5 |
| Did I Kill My Starter? How to Tell | did i kill my sourdough starter | 210 | 3 |
| What Is Sourdough Hooch? | what is hooch sourdough | 260 | 5 |
| How to Strengthen a Weak Starter | how to strengthen my sourdough starter | 210 | 4 |
| Starter Feeding Ratio Calculator | sourdough starter feeding ratio calculator | 210 | 2 |
| Day 5 Starter — What to Expect | day 5 sourdough starter | 260 | 4 |
| How to Dry Sourdough Starter (Backup) | how to dry sourdough starter | 590 | 5 |
| How to Keep Starter Warm in Winter | how to keep sourdough starter warm | 480 | 4 |
| Starter Smells Like Cheese — Normal? | sourdough starter smells like cheese | 320 | 4 |

### Cluster 2: Baking Technique (15 articles)

**Hub**: "Sourdough Baking: The Complete Technique Guide"
**KD avg**: 4.1 | **Volume**: 13,860/mo

| Title | Keyword | Vol | KD |
|---|---|---|---|
| How to Make Sourdough More Sour | how to make sourdough bread more sour | 480 | 5 |
| Bake Sourdough Without a Dutch Oven | can you bake sourdough without a dutch oven | 390 | 5 |
| Sourdough Proofing: Complete Guide | proofing sourdough | 720 | 5 |
| Sourdough Baking Schedule (Printable) | sourdough baking schedule | 260 | 4 |
| How Many Stretch and Folds Do You Need? | how many stretches and folds for sourdough | 260 | 2 |
| When to Score Sourdough (Visual Guide) | when to score sourdough | 170 | 3 |
| How Long to Proof at Room Temperature | how long to proof sourdough at room temperature | 260 | 5 |
| Overnight Sourdough: Complete Guide | overnight sourdough recipes | 720 | 5 |
| Slow Fermented Sourdough vs Fast | slow fermented sourdough bread | 480 | 4 |
| Sourdough Not Rising? 7 Causes | sourdough not rising in oven | 320 | 5 |
| Bulk Fermentation: The Visual Cues | sourdough after bulk fermentation | 210 | 4 |
| How Long Can You Cold Proof? | how long can i cold proof sourdough | 260 | 4 |
| Mini Sourdough Loaves Guide | how to bake mini sourdough loaves | 170 | 2 |
| Stand Mixer Sourdough Method | stand mixer sourdough | 210 | 5 |
| Sourdough Without Starter (Cheat Method) | sourdough bread without starter recipe | 390 | 4 |

### Cluster 3: Sourdough Discard Recipes (20+ articles)

**Hub**: "Sourdough Discard Recipes: 20+ Ways to Never Waste Starter"
**KD avg**: 3.9 | **Volume**: 4,080/mo (long-tail) + 74,000/mo (head)

| Title | Keyword | Vol | KD |
|---|---|---|---|
| Sourdough Discard Recipes — The Ultimate Guide | sourdough discard recipes | 74,000 | 29 |
| Sourdough Discard Pretzel Bites | sourdough discard pretzel bites recipe | 390 | 4 |
| Sourdough Discard Garlic Bread | sourdough discard garlic bread | 320 | 4 |
| Sourdough Discard Dutch Baby Pancake | sourdough discard dutch baby | 390 | 5 |
| Sourdough Discard Chocolate Cupcakes | sourdough discard chocolate cupcakes | 320 | 5 |
| Sourdough Discard Peach Cobbler | sourdough discard peach cobbler | 260 | 5 |
| Sourdough Discard Scallion Pancakes | sourdough discard scallion pancakes | 260 | 3 |
| Sourdough Discard Apple Fritters | sourdough discard apple fritters | 210 | 3 |
| Sourdough Discard Pizza (Cast Iron) | sourdough discard pizza cast iron | 170 | 3 |
| Sourdough Discard Zucchini Muffins | sourdough discard zucchini muffins | 170 | 3 |
| Sourdough Discard Popovers | sourdough discard popovers | 170 | 5 |
| Sourdough Discard French Bread | sourdough discard french bread | 480 | 4 |
| Sourdough Discard Hoagie Rolls | sourdough discard hoagie rolls | 210 | 5 |
| Sourdough Discard Baguette | sourdough discard baguette | 260 | 4 |
| Sourdough Discard Apple Muffins | sourdough discard apple muffins | 210 | 2 |
| Sourdough Discard Crackers (Everything Bagel) | sourdough discard crackers recipe | — | — |
| Sourdough Discard Waffles | sourdough discard waffles recipe | — | — |
| Sourdough Discard Brownies | sourdough discard brownies | — | — |
| Sourdough Discard Cookies | sourdough discard cookies | — | — |
| Sourdough Discard Pancakes | sourdough discard pancakes | — | — |

### Cluster 4: Flavored & Specialty Breads (24 articles)

**Hub**: "Flavored Sourdough Breads: 20+ Variations"
**KD avg**: 4.0 | **Volume**: 5,750/mo

| Title | Keyword | Vol | KD |
|---|---|---|---|
| Garlic Parmesan Sourdough Bread | garlic parmesan sourdough bread | 170 | 3 |
| Roasted Garlic Rosemary Sourdough | roasted garlic and rosemary sourdough bread | 170 | 5 |
| Cinnamon Focaccia Sourdough | cinnamon focaccia sourdough | 390 | 4 |
| Jalapeño Cheddar Sourdough Bagels | jalapeno cheddar sourdough bagels | 170 | 5 |
| Cranberry Walnut Sourdough | cranberry walnut sourdough bread | 260 | 5 |
| Strawberry Sourdough Bread | strawberry sourdough bread | 590 | 4 |
| Pumpkin Chocolate Chip Sourdough | pumpkin chocolate chip sourdough bread | 210 | 4 |
| Einkorn Sourdough Bread | einkorn sourdough recipe | 320 | 4 |
| Semolina Sourdough Bread | semolina sourdough bread | 260 | 5 |
| Honey Wheat Sourdough Sandwich Bread | honey wheat sourdough sandwich bread | 260 | 0 |
| Potato Bread (Sourdough) | sourdough potato bread | 480 | 1 |
| San Francisco Style Sourdough | san francisco style sourdough bread | 590 | 4 |
| Guinness Sourdough Bread | guinness sourdough bread | 170 | 5 |
| Apple Cider Sourdough | apple cider sourdough bread | 210 | 5 |
| Orange Cranberry Sourdough | orange cranberry sourdough bread | 320 | 4 |
| French Bread Sourdough | french bread sourdough recipe | 320 | 5 |
| Sourdough Cinnamon Raisin Bagels | sourdough cinnamon raisin bagels | 210 | 5 |
| Sourdough Pumpkin Cinnamon Rolls | sourdough pumpkin cinnamon rolls | 1,000 | 5 |
| Chocolate Chip Croissant Sourdough | chocolate chip croissant sourdough bread | 210 | 2 |
| Lemon Blueberry Sourdough Scones | lemon blueberry sourdough scones | 260 | 5 |

### Cluster 5: Sourdough-Based Dishes & Meals (41 articles)

**Hub**: "Beyond the Loaf: Sourdough in Every Meal"
**KD avg**: 4.2 | **Volume**: 13,680/mo

| Title | Keyword | Vol | KD |
|---|---|---|---|
| Sourdough Focaccia Pizza | sourdough focaccia pizza | 880 | 5 |
| Sourdough Crumpets — Easy English Classic | sourdough crumpets | 720 | 5 |
| French Toast with Sourdough Bread | can you make french toast with sourdough bread | 720 | 5 |
| Sourdough Bread Stuffing | sourdough bread stuffing | 880 | 5 |
| Sourdough Mac and Cheese | sourdough mac and cheese | 210 | 4 |
| Sourdough Breakfast Ideas | breakfast ideas with sourdough bread | 320 | 5 |
| Sourdough Cornbread Muffins | sourdough cornbread muffins | 210 | 2 |
| Sourdough Egg Noodles | sourdough egg noodles | 260 | 4 |
| Sourdough Stromboli | sourdough stromboli | 320 | 4 |
| Sourdough Fry Bread | sourdough fry bread | 320 | 5 |
| Sourdough Shortbread Cookies | sourdough shortbread cookies | 390 | 4 |
| Sourdough Pumpkin Cinnamon Rolls | sourdough pumpkin cinnamon rolls | 1,000 | 5 |
| Sourdough King Cake | sourdough king cake | 320 | 3 |
| Bread Pudding with Sourdough | bread pudding with sourdough bread | 260 | 5 |
| Sourdough Pretzels | hard sourdough pretzels | 170 | 5 |

### Cluster 6: Storage, Shelf Life & Leftovers (13 articles)

**Hub**: "Sourdough Storage: Keep Every Loaf Fresh"
**KD avg**: 3.4 | **Volume**: 3,810/mo

| Title | Keyword | Vol | KD |
|---|---|---|---|
| How Long Does Sourdough Last? | sourdough bread how long does it last | 1,000 | 2 |
| How to Reheat Sourdough Bread | how to reheat sourdough bread | 880 | 3 |
| How to Freeze Sourdough Dough | freezing sourdough dough | 170 | 5 |
| How to Thaw Sourdough Bread | how to thaw sourdough bread | 260 | 4 |
| What to Do with Stale Sourdough | what to do with stale sourdough bread | 210 | 4 |
| Reheating Frozen Sourdough | reheating frozen sourdough bread | 320 | 5 |
| How Long Does Fresh Sourdough Last? | how long does fresh sourdough bread last | 480 | 5 |
| Can You Freeze Sourdough Dough? | can i freeze sourdough dough | 210 | 4 |

---

## 5. Internal Linking Strategy (Koray GÜBÜR method)

```
[HOME: The Sourdough Kitchen]
           |
	    ┌──────┴──────┐
	    |             |
	[STARTER] ←→ [TECHNIQUE]
	    |      ×      |
	    |      ×      |
	[DISCARD] ←→ [BREADS]
	    |      ×      |
	    |             |
	[DISHES] ←→ [STORAGE]

Rules:
1. Every spoke → its hub (bottom-up)
2. Hub → all spokes (top-down)
3. Cross-cluster: Starter → Technique (entity: fermentation)
4. Cross-cluster: Discard → Breads (entity: flour usage)
5. Cross-cluster: Storage → Starter (entity: preservation)
6. No orphan pages
7. Semantic anchor text variety (never exact-match only)
```

---

## 6. Persona — Chef Augustin for Sourdough

```
Chef Augustin Lefevre — French-trained chef who mastered sourdough
in Parisian bakeries and now teaches home bakers the art and science
of sourdough, from starter to discard, from crust to crumb.

Tone: Precise but warm, scientific but accessible
Voice: "In my Paris bakery, we learned that..."
Angle: French baking expertise meets American home kitchen practicality
USP: French chef credibility + zero-waste philosophy + complete topic coverage
```

---

## 7. Traffic Strategy

### Phase 1: Pinterest (Month 1-3)
- Sourdough = #1 baking category on Pinterest
- Sourdough discard snacks: growing category (Pinterest Trends, 2026 — verify with Pinterest Trends API before citing specific percentages)
- 3-5 pins per recipe (hero, crumb shot, step-by-step)
- Boards: "Sourdough Starter Guide", "Discard Recipes", "Artisan Bread at Home"

### Phase 2: Google Organic (Month 3-6)
- Target KD 0-3 keywords first (30% of cluster, 15,890/mo)
- KD 4-5 keywords follow naturally (accumulated authority)
- Goal: 70%+ cluster coverage within 6 months
- Rich snippets: Recipe schema + How-To schema

### Phase 3: Monetization (Month 6-12)
- Affiliate: specialty flours, tools (lame, banneton, dutch oven)
- Digital products: "Sourdough Starter Guide PDF", "Discard Recipe eBook"
- Mediavine eligibility at 50K sessions/mo

---

## 8. Pipeline Adaptation

### What changes
| Component | Before | After |
|---|---|---|
| Homepage | "International Home Cooking" | "The Sourdough Kitchen" |
| Strategist prompt | "World cuisines focus" | "Sourdough baking focus — [cluster] batch" |
| Landing page | Multi-cuisine | Single-entity sourdough authority |
| SERP analysis | Country-based | Technique-based |
| Content types | Recipe + AOR article | Recipe + How-To + Troubleshooting + Guide |

### What stays
- Chef Augustin persona
- All 6 agents (Strategist, Writer, Auditor, Editor, QA, Image Optimizer)
- 13-step pipeline
- SEO Gate (17 criteria)
- JSON-LD schema

---

## 9. Risks & Counter-Arguments

A strategy document that doesn't acknowledge its own risks is marketing, not strategy. Here are the real counter-arguments:

### 1. Head term dominance by strong incumbents
**Risk**: "sourdough discard recipes" (74K/mo, KD 29) is already dominated by King Arthur Baking (DR 79+), The Clever Carrot (DR 55+), and others. KD measures backlink difficulty, not brand authority — a new domain with DR 0 won't rank for this term within 6 months.
**Mitigation**: Target long-tail spokes first (KD 2-4, volume 170-590 each). Accumulate topical authority bottom-up. Don't expect the pillar page to rank until domain authority exists.

### 2. AI-generated recipes lack culinary proof
**Risk**: Google's Helpful Content system rewards first-hand experience. AI-generated recipes without actual testing risk being classified as "created primarily for search engines." A core update could wipe the site.
**Mitigation**: The Auditor agent fact-checks ingredient ratios, temperatures, and technique plausibility. The Editor agent applies humanization passes. But the pipeline does NOT physically test recipes — this is a structural limitation. Mitigation degrades gracefully; it does not eliminate the risk.

### 3. "Chef Augustin" persona has no off-site presence
**Risk**: E-E-A-T requires demonstrated expertise. A fictional chef with no social media, no published books, no YouTube channel, and no press mentions has zero off-site E-E-A-T signals. Google's Quality Rater Guidelines consider the author's real-world reputation.
**Mitigation**: (1) Create Pinterest profile with real photos. (2) Add an author page with detailed bio. (3) Long-term: publish on Medium/Substack to build off-site footprint. (4) If the site gains traction, consider partnering with a real chef for content review.

### 4. 90+ article topical map before validation is dangerous
**Risk**: Publishing 90 AI-generated articles before any traffic data or user feedback validates the approach. If the content doesn't rank or convert, 90 articles of sunk cost with no learnings.
**Mitigation**: Phase rollout (see §10 Non-Goals and §11 Success Metrics). Starter + Discard clusters first (25 articles). Validate with 3 months of GSC data. Expand only after confirming ranking signals.

### 5. "French chef = sourdough authority" is an untested assumption
**Risk**: The persona assumes French culinary training confers sourdough credibility. But sourdough has strong non-French traditions (San Francisco, German rye, Eastern European). A French chef persona may not resonate with the American sourdough audience as strongly as a homesteader or science-baker persona would.
**Mitigation**: Test in content. The Writer agent emphasizes French technique precision AND explains the underlying science — the value prop is "precision + science," not "French = better." Monitor user engagement signals (time on page, bounce rate) for persona-audience fit.

### 6. Scope creep from "discard" to "everything sourdough"
**Risk**: Starting with discard (a concrete user problem) but expanding immediately to breads, dishes, and storage dilutes the initial wedge. A "sourdough everything" site competes against everyone; a "sourdough discard" site has a defensible angle.
**Mitigation**: Use "The Sourdough Kitchen" as the umbrella brand but lead with Starter + Discard content for the first 3-6 months (see §10). The topical map defines the full architecture; the rollout defines the actual publishing cadence.

---

## 10. Non-Goals (YAGNI)

- Don't delete the existing multi-cuisine pipeline (it stays for future expansion)
- Don't create a full new visual brand
- Don't launch all clusters at once — **Starter + Discard first** (25 articles initial batch)
- Don't create social accounts beyond Pinterest
- Don't delete the "Grandmother's Kitchen Table" code already in the pipeline
- Don't publish 90 articles before validating with 3 months of GSC data

---

## 11. Success Metrics

| Metric | 3-month | 6-month | 12-month |
|---|---|---|---|
| Pinterest monthly views | 15K | 60K | 250K |
| Google organic clicks/mo | 1K | 10K | 50K |
| Published sourdough articles | 25 | 60 | 90+ |
| Cluster coverage | 30% | 70% | 90% |
| Domain Rating | 5 | 15 | 30 |
| "sourdough discard recipes" rank | Top 50 | Top 20 | Top 10 |

### Phase 1 Validation Gate (after 25 articles / 3 months)

Before expanding beyond Starter + Discard:
- [ ] ≥10 articles indexed in Google Search Console
- [ ] ≥1 article ranking top 30 for its target keyword
- [ ] ≥500 total organic clicks
- [ ] ≥5K Pinterest monthly views
- [ ] Zero manual actions or HCU-related drops
- [ ] SEO Gate pass rate ≥80% (14/17 criteria average)

**If these gates aren't met**: pause publishing, diagnose (content quality? indexing? keyword selection?), iterate before scaling to Breads + Dishes clusters.
