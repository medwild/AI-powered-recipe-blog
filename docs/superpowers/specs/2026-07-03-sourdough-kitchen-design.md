# The Sourdough Kitchen — Design Spec

> **Status**: Validé — 2026-07-03
> **Concept**: Chef Augustin vous apprend le sourdough — du starter au discard, de la croûte à la mie
> **Méthodologie**: Topical Authority Map — Koray Tuğberk GÜBÜR (Entity-Attribute-Value)
> **Source**: 204 keywords Semrush US, filtres volume≥50, KD≤29, intent info+commercial

---

## 1. Pourquoi Sourdough (et pas les cuisines du monde)

Les données Semrush ont parlé. 204 keywords analysés, 6 clusters identifiés, et un verdict sans appel :

| Métrique | Sourdough | Filipino cuisine | Georgian cuisine |
|---|---|---|---|
| Volume combiné | **134K+/mo** | 18K/mo | 3.6K/mo |
| KD moyen | **3.8** | 22 | 21 |
| KD max | **5** | 29 | 23 |
| Résultats SERP médians | **<200** | 100K+ | 100K+ |
| Profondeur contenu | 90+ articles | 15-20 | 8-10 |

Le sourdough est 5-8x plus facile à ranker que les cuisines, avec 7x plus de volume.

---

## 2. Entité Centrale

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

## 3. Architecture Topical Map

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

## 4. Internal Linking Strategy (Koray GÜBÜR method)

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

## 5. Persona — Chef Augustin for Sourdough

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

## 6. Traffic Strategy

### Phase 1: Pinterest (Month 1-3)
- Sourdough = catégorie #1 baking sur Pinterest
- Sourdough discard snacks = +180% month-over-month
- 3-5 pins per recipe (hero, crumb shot, step-by-step)
- Boards: "Sourdough Starter Guide", "Discard Recipes", "Artisan Bread at Home"

### Phase 2: Google Organic (Month 3-6)
- Target KD 0-3 keywords first (30% du cluster, 15,890/mo)
- KD 4-5 keywords suivent naturellement (autorité accumulée)
- Objectif: 70%+ de couverture du cluster en 6 mois
- Rich snippets: Recipe schema + How-To schema

### Phase 3: Monetization (Month 6-12)
- Affiliate: farines spéciales, ustensiles (lame, banneton, dutch oven)
- Digital products: "Sourdough Starter Guide PDF", "Discard Recipe eBook"
- Mediavine eligibility at 50K sessions/mo

---

## 7. Pipeline Adaptation

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

## 8. Non-Goals (YAGNI)

- Ne pas supprimer le pipeline multi-cuisine existant (il reste pour expansion future)
- Ne pas créer de nouveau branding visuel complet
- Ne pas lancer tous les clusters en même temps — Starter + Discard d'abord
- Ne pas créer d'autres comptes sociaux que Pinterest
- Ne pas supprimer le code "Grandmother's Kitchen Table" déjà écrit dans le pipeline

---

## 9. Success Metrics

| Metric | 3-month | 6-month | 12-month |
|---|---|---|---|
| Pinterest monthly views | 15K | 60K | 250K |
| Google organic clicks/mo | 1K | 10K | 50K |
| Published sourdough articles | 25 | 60 | 90+ |
| Cluster coverage | 30% | 70% | 90% |
| Domain Rating | 5 | 15 | 30 |
| "sourdough discard recipes" rank | Top 50 | Top 20 | Top 10 |
