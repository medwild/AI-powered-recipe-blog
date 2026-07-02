# Cluster Templates by Domain

Pre-built cluster architectures for common domains. Use these as starting points and adapt them to the user's specific entity rather than copying them verbatim. Each template includes Core Section clusters (inner ring) and Outer Section clusters (discovery ring) with E-A-V attributes pre-mapped.

---

## Table of Contents

1. [SaaS / CRM Domain](#saas--crm-domain)
2. [E-Commerce / Fashion Domain](#e-commerce--fashion-domain)
3. [Food & Culinary Domain](#food--culinary-domain)
4. [Health & Wellness Domain](#health--wellness-domain)
5. [How to Adapt These Templates](#how-to-adapt-these-templates)

---

## SaaS / CRM Domain

**Central Entity**: CRM Software (Customer Relationship Management)

### Entity Profile

```
Type: Product
Definition: Software that manages an organization's interactions and relationships with current and potential customers.
Parent Entity: Business Software
Child Entities: Sales CRM, Marketing CRM, Service CRM
```

### Core Section Clusters (Inner Ring)

#### Cluster 1: Features & Capabilities

**Pillar Page**: "Complete Guide to CRM Features: What Every Business Needs"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Contact Management | entity: CRM → attribute: contact_storage → values: [fields, custom_fields, deduplication, segmentation] | Informational |
| S2 | Pipeline Management | entity: CRM → attribute: sales_pipeline → values: [stages, kanban, forecasting, drag_drop] | Informational |
| S3 | Email Integration | entity: CRM → attribute: integration → values: [gmail, outlook, smtp, templates, tracking] | Commercial Investigation |
| S4 | Reporting & Analytics | entity: CRM → attribute: analytics → values: [dashboards, custom_reports, kpi_tracking, export] | Commercial Investigation |
| S5 | Automation Workflows | entity: CRM → attribute: automation → values: [triggers, actions, sequences, conditional_logic] | Informational |

**Coverage Contribution**: ~25%

---

#### Cluster 2: Pricing & Plans

**Pillar Page**: "CRM Pricing Models Explained: How to Choose the Right Plan"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Per-User Pricing | entity: CRM → attribute: pricing_model → value: per_user | Commercial Investigation |
| S2 | Free CRM Options | entity: CRM → attribute: pricing_model → value: freemium | Commercial Investigation |
| S3 | Enterprise CRM Pricing | entity: CRM → attribute: pricing_model → value: enterprise_custom | Commercial Investigation |
| S4 | Hidden CRM Costs | entity: CRM → attribute: total_cost → values: [implementation, training, add_ons, support] | Informational |

**Coverage Contribution**: ~15%

---

#### Cluster 3: CRM Comparisons

**Pillar Page**: "Best CRM Software [Current Year]: Head-to-Head Comparisons"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Salesforce vs HubSpot | entity: CRM_vendor → attribute: comparison → value: [salesforce, hubspot] | Commercial Investigation |
| S2 | Pipedrive vs Zoho | entity: CRM_vendor → attribute: comparison → value: [pipedrive, zoho] | Commercial Investigation |
| S3 | CRM for Small Business | entity: CRM → attribute: target_user → value: smb | Commercial Investigation |
| S4 | CRM for Enterprise | entity: CRM → attribute: target_user → value: enterprise | Commercial Investigation |

**Coverage Contribution**: ~15%

---

#### Cluster 4: Implementation & Onboarding

**Pillar Page**: "How to Implement a CRM: A Step-by-Step Guide"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | CRM Data Migration | entity: CRM → attribute: implementation → value: data_migration | Informational |
| S2 | CRM Team Training | entity: CRM → attribute: implementation → value: team_adoption | Informational |
| S3 | CRM Integration Guide | entity: CRM → attribute: integration → values: [api, webhooks, zapier, native_connectors] | Informational |
| S4 | CRM Customization | entity: CRM → attribute: customization → values: [custom_fields, workflows, layouts] | Informational |

**Coverage Contribution**: ~15%

---

### Outer Section Clusters (Discovery Ring)

#### Cluster 5: Sales Methodologies (Discovery)

**Pillar Page**: "Sales Methodologies That Work With Your CRM"

| Spoke | Title | Intent |
|-------|-------|--------|
| S1 | What Is SPIN Selling? | Informational |
| S2 | Challenger Sale Method | Informational |
| S3 | BANT Qualification Framework | Informational |

**Coverage Contribution**: ~8% | **siteRadius**: Medium

---

#### Cluster 6: Business Growth (Discovery)

**Pillar Page**: "How CRM Drives Business Growth: Real Metrics"

| Spoke | Title | Intent |
|-------|-------|--------|
| S1 | CRM ROI Calculator | Transactional |
| S2 | Customer Retention Strategies | Informational |

**Coverage Contribution**: ~5% | **siteRadius**: Medium-High

---

## E-Commerce / Fashion Domain

**Central Entity**: Sustainable Fashion Brand

### Entity Profile

```
Type: Organization / Product
Definition: A fashion brand that prioritizes environmentally and socially responsible practices throughout its supply chain.
Parent Entity: Fashion Industry
Child Entities: Sustainable Clothing, Eco-friendly Accessories, Ethical Footwear
```

### Core Section Clusters

#### Cluster 1: Sustainable Materials

**Pillar Page**: "Complete Guide to Sustainable Fashion Materials"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Organic Cotton vs Regular Cotton | entity: fabric → attribute: sustainability → values: [water_usage, pesticide_free, certification] | Informational |
| S2 | Recycled Polyester Explained | entity: fabric → attribute: source → value: recycled_pet | Informational |
| S3 | Tencel / Lyocell Fabric Guide | entity: fabric → attribute: material → value: lyocell | Informational |
| S4 | Natural Dyes in Fashion | entity: dye → attribute: type → value: natural | Informational |
| S5 | Vegan Leather Alternatives | entity: material → attribute: alternative_to → value: animal_leather | Commercial Investigation |

**Coverage Contribution**: ~22%

---

#### Cluster 2: Ethical Manufacturing

**Pillar Page**: "What Is Ethical Fashion Manufacturing? Complete Guide"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Fair Trade Clothing Certifications | entity: certification → attribute: type → value: fair_trade | Informational |
| S2 | Living Wage in Fashion Industry | entity: labor → attribute: compensation → value: living_wage | Informational |
| S3 | Supply Chain Transparency | entity: supply_chain → attribute: visibility → values: [tracing, auditing, reporting] | Informational |
| S4 | Slow Fashion vs Fast Fashion | entity: fashion_movement → attribute: pace → values: [slow, fast] | Informational |

**Coverage Contribution**: ~18%

---

#### Cluster 3: Brand Comparisons & Shopping

**Pillar Page**: "Best Sustainable Fashion Brands [Year]: Honest Reviews"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | [Brand A] vs [Brand B] Comparison | entity: brand → attribute: comparison | Commercial Investigation |
| S2 | Affordable Sustainable Fashion | entity: brand → attribute: price_range → value: affordable | Commercial Investigation |
| S3 | Luxury Sustainable Brands | entity: brand → attribute: price_range → value: luxury | Commercial Investigation |
| S4 | Sustainable Fashion Under $50 | entity: product → attribute: price → value: budget | Transactional |

**Coverage Contribution**: ~15%

---

### Outer Section Clusters

#### Cluster 4: Capsule Wardrobes (Discovery)

**Pillar Page**: "How to Build a Sustainable Capsule Wardrobe"

| Spoke | Title | Intent |
|-------|-------|--------|
| S1 | 30-Piece Capsule Wardrobe Guide | Informational |
| S2 | Seasonal Wardrobe Transitions | Informational |

**Coverage Contribution**: ~6% | **siteRadius**: Medium

---

#### Cluster 5: Fashion & Environment (Discovery)

**Pillar Page**: "Fashion Industry Environmental Impact: Facts & Data"

| Spoke | Title | Intent |
|-------|-------|--------|
| S1 | Carbon Footprint of Fast Fashion | Informational |
| S2 | Textile Waste Statistics | Informational |

**Coverage Contribution**: ~5% | **siteRadius**: Medium-High

---

## Food & Culinary Domain

**Central Entity**: Italian Cuisine (or a specific entity like "Artisan Pasta Making")

### Entity Profile

```
Type: Concept / Culinary Tradition
Definition: The culinary traditions, ingredients, techniques, and cultural practices associated with Italian food and cooking.
Parent Entity: Mediterranean Cuisine
Child Entities: Regional Italian Cuisine, Italian Baking, Italian Beverages
```

### Core Section Clusters

#### Cluster 1: Core Ingredients & Techniques

**Pillar Page**: "Essential Italian Cooking Ingredients: The Complete Pantry Guide"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Types of Italian Pasta | entity: pasta → attribute: shape → values: [spaghetti, penne, fusilli, ravioli, orecchiette] | Informational |
| S2 | Italian Olive Oil Guide | entity: ingredient → attribute: type → value: olive_oil, sub_attribute: region → values: [tuscan, sicilian, ligurian] | Informational |
| S3 | Italian Cheeses Explained | entity: cheese → attribute: origin → values: [parmigiano, mozzarella, gorgonzola, pecorino, ricotta] | Informational |
| S4 | Tomato Varieties in Italian Cooking | entity: ingredient → attribute: type → value: tomato, sub_attribute: variety → values: [san_marzano, pomodoro, cherry, passata] | Informational |
| S5 | Italian Cooking Techniques | entity: technique → attribute: cuisine → value: italian, sub_attribute: method → values: [al_dente, soffritto, brazing, slow_simmer] | Informational |

**Coverage Contribution**: ~25%

---

#### Cluster 2: Regional Italian Cuisine

**Pillar Page**: "Regional Italian Cuisine: A Complete Guide by Region"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Neapolitan Cuisine | entity: regional_cuisine → attribute: region → value: naples, sub_attribute: specialties → [pizza, ragu, sfogliatella] | Informational |
| S2 | Tuscan Cuisine | entity: regional_cuisine → attribute: region → value: tuscany, sub_attribute: specialties → [bistecca, ribollita, pici] | Informational |
| S3 | Sicilian Cuisine | entity: regional_cuisine → attribute: region → value: sicily, sub_attribute: specialties → [arancini, cannoli, pasta_con_le_sarde] | Informational |
| S4 | Emilian Cuisine | entity: regional_cuisine → attribute: region → value: emilia_romagna, sub_attribute: specialties → [tortellini, prosciutto, balsamic] | Informational |

**Coverage Contribution**: ~20%

---

#### Cluster 3: Classic Recipes (How-To)

**Pillar Page**: "Classic Italian Recipes Every Home Cook Should Master"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Authentic Carbonara Recipe | entity: dish → attribute: name → value: carbonara, sub_attribute: ingredients → [guanciale, pecorino, egg, black_pepper] | Informational |
| S2 | How to Make Fresh Pasta | entity: technique → attribute: product → value: fresh_pasta, sub_attribute: ingredients → [flour_00, eggs, salt] | Informational |
| S3 | Traditional Risotto Technique | entity: technique → attribute: product → value: risotto, sub_attribute: method → [toasting_rice, adding_broth_gradually, mantecatura] | Informational |
| S4 | Neapolitan Pizza Dough Guide | entity: technique → attribute: product → value: pizza_dough, sub_attribute: variables → [hydration, fermentation_time, temperature] | Informational |

**Coverage Contribution**: ~20%

---

#### Cluster 4: Equipment & Pairings

**Pillar Page**: "Essential Italian Cooking Equipment & Ingredient Pairings"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Best Pasta Makers for Home | entity: equipment → attribute: type → value: pasta_maker | Commercial Investigation |
| S2 | Italian Wine Pairing Guide | entity: beverage → attribute: pairing_cuisine → value: italian | Commercial Investigation |
| S3 | Italian Coffee Culture | entity: beverage → attribute: type → value: coffee, sub_attribute: style → [espresso, macchiato, cappuccino] | Informational |

**Coverage Contribution**: ~10%

---

### Outer Section Clusters

#### Cluster 5: Italian Food Culture & History (Discovery)

**Pillar Page**: "The History of Italian Cuisine: From Rome to Your Table"

| Spoke | Title | Intent |
|-------|-------|--------|
| S1 | How the Tomato Conquered Italy | Informational |
| S2 | Italian Food Traditions and Holidays | Informational |

**Coverage Contribution**: ~6% | **siteRadius**: Medium

---

#### Cluster 6: Italian Diet & Health (Discovery)

**Pillar Page**: "The Mediterranean Diet: Is Italian Food Actually Healthy?"

| Spoke | Title | Intent |
|-------|-------|--------|
| S1 | Health Benefits of the Italian Diet | Informational |
| S2 | Italian Gluten-Free Cooking | Informational |

**Coverage Contribution**: ~5% | **siteRadius**: Medium-High

---

## Health & Wellness Domain

**Central Entity**: Personal Fitness Training

### Entity Profile

```
Type: Service / Concept
Definition: Structured physical exercise programs designed to improve strength, endurance, flexibility, and overall health, typically guided by a professional trainer.
Parent Entity: Health & Fitness
Child Entities: Strength Training, Cardiovascular Training, Flexibility Training, Nutrition Planning
```

### Core Section Clusters

#### Cluster 1: Training Fundamentals

**Pillar Page**: "Complete Guide to Personal Fitness Training: Principles & Methods"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Strength Training Basics | entity: exercise → attribute: type → value: strength, sub_attribute: methods → [compound, isolation, progressive_overload] | Informational |
| S2 | Cardio Training Programs | entity: exercise → attribute: type → value: cardio, sub_attribute: methods → [hiit, steady_state, zone_2] | Informational |
| S3 | Flexibility & Mobility Work | entity: exercise → attribute: type → value: flexibility, sub_attribute: methods → [static_stretching, dynamic_stretching, yoga] | Informational |
| S4 | Rest & Recovery Principles | entity: training → attribute: recovery → values: [sleep, nutrition, active_recovery, deload] | Informational |
| S5 | How to Create a Workout Plan | entity: program → attribute: structure → values: [frequency, volume, intensity, periodization] | Informational |

**Coverage Contribution**: ~25%

---

#### Cluster 2: Equipment & Environment

**Pillar Page**: "Home vs Gym Training: Equipment Guide for Every Setting"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Best Home Gym Equipment | entity: equipment → attribute: setting → value: home | Commercial Investigation |
| S2 | Dumbbell Exercises Complete List | entity: equipment → attribute: type → value: dumbbell | Informational |
| S3 | Resistance Band Workouts | entity: equipment → attribute: type → value: resistance_band | Informational |
| S4 | Bodyweight Training Guide | entity: equipment → attribute: type → value: bodyweight | Informational |

**Coverage Contribution**: ~15%

---

#### Cluster 3: Nutrition for Fitness

**Pillar Page**: "Nutrition for Fitness Training: Macros, Timing & Supplements"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Protein Intake for Muscle Growth | entity: nutrient → attribute: type → value: protein, sub_attribute: goal → muscle_growth | Informational |
| S2 | Pre and Post Workout Nutrition | entity: nutrition → attribute: timing → values: [pre_workout, post_workout] | Informational |
| S3 | Supplements Guide: What Works | entity: supplement → attribute: efficacy → values: [creatine, whey_protein, caffeine, omega_3] | Commercial Investigation |

**Coverage Contribution**: ~15%

---

#### Cluster 4: Training for Specific Goals

**Pillar Page**: "Fitness Training by Goal: Customize Your Program"

| Spoke | Title | E-A-V Attributes | Intent |
|-------|-------|-------------------|--------|
| S1 | Weight Loss Training Program | entity: program → attribute: goal → value: weight_loss | Commercial Investigation |
| S2 | Muscle Building Program | entity: program → attribute: goal → value: muscle_building | Commercial Investigation |
| S3 | Training for Beginners | entity: program → attribute: level → value: beginner | Informational |
| S4 | Training for Seniors | entity: program → attribute: demographic → value: senior | Informational |

**Coverage Contribution**: ~15%

---

### Outer Section Clusters

#### Cluster 5: Fitness & Mental Health (Discovery)

**Pillar Page**: "The Connection Between Exercise and Mental Health"

| Spoke | Title | Intent |
|-------|-------|--------|
| S1 | How Exercise Reduces Stress | Informational |
| S2 | Exercise and Anxiety Management | Informational |

**Coverage Contribution**: ~5% | **siteRadius**: Medium

---

#### Cluster 6: Fitness Industry (Discovery)

**Pillar Page**: "How to Choose a Personal Trainer: What to Look For"

| Spoke | Title | Intent |
|-------|-------|--------|
| S1 | Personal Trainer Certifications Explained | Commercial Investigation |
| S2 | Online vs In-Person Training | Commercial Investigation |

**Coverage Contribution**: ~5% | **siteRadius**: Medium

---

## How to Adapt These Templates

These templates are **starting architectures**, not rigid prescriptions. When using them for a user's specific entity:

### 1. Identify the Closest Template

Match the user's entity to the closest domain template. If the user says "project management tool", the SaaS/CRM template is the closest match.

### 2. Replace the Central Entity

Swap the template's central entity with the user's entity. Keep the **cluster structure** but redo the E-A-V extraction.

### 3. Add Entity-Specific Clusters

The templates above are not exhaustive. Use E-A-V extraction on the user's specific entity to find attributes the template doesn't cover. Create new clusters for entity-unique attributes.

### 4. Adjust the Core/Outer Ratio

Some entities are broader (requiring more outer section content) and some are narrower (almost entirely core). Use the `siteFocusScore` simulation to calibrate.

### 5. Validate Coverage

After adapting the template, run a coverage check to ensure the adapted map would hit 74% coverage for the user's specific entity. Fill gaps with additional spokes or clusters.

### 6. Map Search Intent Per Domain

Different domains have different intent distributions. E-commerce has more commercial/transactional intent. Health/wellness has more informational intent. Adjust the intent classification accordingly.