/**
 * Topical Authority Map — Data Structures & Cluster Presets
 *
 * Based on the Entity-Attribute-Value (E-A-V) model from the Koray Gübür framework.
 * Each cluster maps to a pillar page + spoke pages targeting specific keywords.
 */

// ---- Types ----

export interface EAVTriple {
  entity: string
  attribute: string
  values: string[]
}

export interface TopicNode {
  title: string
  keyword: string
  volume: number
  kd: number
  intent: "informational" | "commercial" | "transactional"
  requiredEntities: string[]
  wordCountRange: { min: number; max: number }
  type: "pillar" | "spoke" | "article"
}

export interface Cluster {
  id: string
  name: string
  cuisine: string
  section: "core" | "outer"
  pillarPage: TopicNode
  spokes: TopicNode[]
  coverageContribution: number
  kdAvg: number
  totalVolume: number
  description: string        // Used on hub pages
  siblings: string[]         // Cross-link target cluster IDs
}

export interface CoverageReport {
  clusterId: string
  clusterName: string
  targetTopics: number
  publishedTopics: number
  coveragePercent: number
  gaps: TopicNode[]
}

// ---- Dinners-for-Two Preset ----

export const DINNERS_FOR_TWO_PRESET = {
  name: "Easy Weeknight Dinners for Two",
  ingredients: "chicken breast, ground beef, pasta, rice, garlic, onion, olive oil, butter, canned tomatoes, frozen vegetables, eggs, cheese, soy sauce, ginger, bell peppers",
  techniques: "searing, deglazing, one-pan cooking, sheet-pan roasting, slow cooking, quick sauces, batch prep, portion scaling, stir-frying, pan-roasting",
}

// ---- Dinners-for-Two Clusters ----

export const SLOW_COOKER_CLUSTER: Cluster = {
  id: "small-batch-slow-cooker",
  name: "Small-Batch Slow Cooker Dinners for Two",
  cuisine: "Small-Batch Slow Cooker",
  section: "core",
  kdAvg: 5,
  totalVolume: 12_500,
  coverageContribution: 25,
  description:
    "Set-and-forget dinners for two: four recipes built around a 2-quart slow cooker, the size that fits two servings without burying you in leftovers. Load the pot, set the time, and dinner is done when you are — every recipe here shares the same 15 minutes of prep and does the rest on its own.\n\n" +
    "The collection is four recipes, and every one is a complete meal in a pot. 2-Quart Slow Cooker Chicken and Gravy for Two: 15 minutes of prep, 4 hours 30 of cooking, and a proper gravy already in the pot. Slow Cooker Chicken and Rice for Two — No Leftovers to Guilt You — runs 15 minutes of prep and 5 hours 30 of cooking. Crockpot Recipes for Two: Slow Cooker Chicken & Tomato Rice takes 15 minutes of prep and 5 hours 45. And Slow Cooker Chicken & Ground Beef Pasta for Two, the Weeknight Ragu, is the longest cook of the group: 15 minutes of prep, 6 hours 25 of cooking.\n\n" +
    "Every recipe shares the same shape: 15 minutes of prep, then 4 hours 30 to 6 hours 25 of unattended cooking. That spread is nearly two hours, so the one you pick depends on when you can load the pot. The chicken and gravy is the late-morning start, done by mid-afternoon. The chicken and rice sits in the middle at 5 hours 30, with the chicken and tomato rice close behind at 5 hours 45. The ragu, at 6 hours 25, is built for a full workday: set it before you leave and come back to a finished dinner.\n\n" +
    "These are for the weeks when you don't want to cook when you get home — if your evenings are a fixed commute, the 6-hour-25 ragu is the lowest-effort dinner here: the work is 15 minutes in the morning. If you want dinner on the table by early evening instead, the 4-hour-30 chicken and gravy lines up better with a mid-afternoon start. Either way, the portion math is done for you: two servings, no half-crock of leftovers. The two-quart difference is real — a smaller cooker heats faster and reduces harder than a full-size crock pot, so the recipes spell out liquid amounts that don't drown two portions. All four of these also appear inside the chicken dinners collection, and the slow cooker chicken and rice is even listed among the one-pan dinners — a slow cooker meal is still a one-vessel dinner when it's done.\n\n" +
    "Three habits make these recipes behave. Pat the chicken dry before it goes into the pot — it keeps the gravy from thinning as the meat cooks. Don't lift the lid to peek: every time you do, the heat escapes and the cooking stretches out. And follow the liquid amounts as written — a 2-quart pot reduces harder than a 6-quart, so a full-size recipe scaled down by hand won't behave the same.",
  siblings: ["budget-meals-for-two", "one-pan-dinners-for-two", "chicken-dinners-for-two"],
  pillarPage: {
    title: "Small-Batch Slow Cooker Dinners for Two — The Complete Guide",
    keyword: "slow cooker recipes for two",
    volume: 2400,
    kd: 8,
    intent: "informational",
    requiredEntities: ["slow_cooker", "small_batch", "dinner_for_two", "meal_prep"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "2-Quart Slow Cooker vs 6-Quart — What You Actually Need for Two",
      keyword: "2 quart slow cooker recipes",
      volume: 1600, kd: 4, intent: "informational",
      requiredEntities: ["slow_cooker", "small_kitchen_appliance", "portion_size"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Mini Crockpot Chicken Dinners for Two",
      keyword: "mini crockpot chicken recipes",
      volume: 2100, kd: 5, intent: "informational",
      requiredEntities: ["slow_cooker", "chicken", "small_batch"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Small-Batch Slow Cooker Beef Stew for Two",
      keyword: "slow cooker beef stew for two",
      volume: 1300, kd: 4, intent: "informational",
      requiredEntities: ["slow_cooker", "beef_stew", "small_batch", "comfort_food"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const ONE_PAN_CLUSTER: Cluster = {
  id: "one-pan-dinners-for-two",
  name: "One-Pan Dinners for Two",
  cuisine: "One-Pan Dinners",
  section: "core",
  kdAvg: 5,
  totalVolume: 18_200,
  coverageContribution: 25,
  description:
    "Thirty-six dinners, one pan each. This is the largest collection on the site: skillets, sheet pans, and one pots that carry a full meal — protein, starch, and sauce — and hand you a single pan to wash at the end. If your definition of a good weeknight is everything cooked in one vessel, this is where to start.\n\n" +
    "The protein range is the widest of any collection. Chicken leads: the one-pan chicken and rice family, 25-Minute One-Pan Garlic Herb Chicken, 30-Minute One-Pan Lemon Garlic Chicken, the lemon butter chicken pasta and the 20-minute garlic butter chicken pasta, the chicken enchilada skillet, and the chicken and vegetable skillet. Ground beef comes next: the ground beef and tomato rice skillet, One-Pan Baked Ziti for a romantic date night, and the small-batch lasagna that goes from one skillet to the oven. Then the rest of the butcher counter: Pan-Seared Steak Dinner with Garlic Butter and Blistered Green Beans, Garlic Shrimp Orzo with Cherry Tomatoes, Salmon Orzo with Dill and Capers, and One-Sheet-Pan Easter Dinner with Herb-Crusted Lamb Chops and Spring Vegetables. Rounding it out: Easy Asian Beef Noodle Stir-Fry, Easy Beef Ramen Noodles, Stovetop Mac and Cheese with no baking in one pot, and Sheet Pan Thanksgiving Dinner with Herb-Roasted Chicken.\n\n" +
    "Cook times run 12 to 35 minutes with prep from 5 to 22. The fastest is the 20-minute garlic butter chicken pasta at 20 minutes total; right behind it, stovetop mac and cheese, the beef noodle stir-fry, the ramen, and garlic butter chicken bites all land at 25. The longest non-slow-cooker recipe is the lasagna at 55 minutes — 20 of prep, 35 of cooking — followed by the two chicken-and-rice dishes that cook 33 minutes. One slow cooker entry even made the cut, Slow Cooker Chicken and Rice for Two at 5 hours 30, which is proof that the collection's real rule is one vessel, not one burner.\n\n" +
    "Pick by protein or by occasion. Date night comfort: the baked ziti or the skillet-to-oven lasagna. A sheet-pan showpiece: the Easter lamb or the Thanksgiving chicken — both 15 minutes of prep and 30 of cooking, with the spring vegetables riding the same pan as the lamb. Fastest possible dinner: mac and cheese, ramen, or the stir-fry, all on the table in 25 minutes. Seafood: the salmon orzo lands at 30 minutes total, the shrimp orzo at 45. Whatever you choose, the cleanup promise is identical: one pan.\n\n" +
    "The collection's single rule is order of operations: everything goes into one pan in sequence, so the slowest component — a 35-minute lasagna bake, a 33-minute rice cook, a 15-minute stir-fry — dictates when you start. For the rice dishes, the long cook time is the rice finishing in the pan, so don't rush the lid off. For the noodle dishes, prep everything before the heat goes on, because 15 minutes of cooking doesn't leave time to slice. And when a sheet pan is involved, the oven does the work: load it, set the timer, and the only thing left is the one pan to wash.",
  siblings: ["chicken-dinners-for-two", "quick-healthy-dinners", "small-batch-slow-cooker"],
  pillarPage: {
    title: "One-Pan Dinners for Two — Minimal Cleanup, Maximum Flavor",
    keyword: "one pan dinners for two",
    volume: 3600,
    kd: 6,
    intent: "informational",
    requiredEntities: ["one_pan_cooking", "sheet_pan", "easy_cleanup", "weeknight_dinner"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Sheet Pan Chicken and Vegetables for Two",
      keyword: "sheet pan chicken dinner for two",
      volume: 2900, kd: 5, intent: "informational",
      requiredEntities: ["sheet_pan", "chicken", "roasted_vegetables"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "One-Skillet Ground Beef Dinner for Two",
      keyword: "one skillet ground beef dinner for two",
      volume: 1400, kd: 4, intent: "informational",
      requiredEntities: ["skillet", "ground_beef", "one_pan_meal"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "One-Pan Lemon Garlic Salmon with Asparagus for Two",
      keyword: "one pan salmon dinner for two",
      volume: 2200, kd: 5, intent: "informational",
      requiredEntities: ["salmon", "asparagus", "sheet_pan", "healthy_dinner"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const BUDGET_CLUSTER: Cluster = {
  id: "budget-meals-for-two",
  name: "Budget Meals for Two",
  cuisine: "Budget Dinners",
  section: "core",
  kdAvg: 4,
  totalVolume: 9_800,
  coverageContribution: 20,
  description:
    "A small collection on purpose: three one-pan dinners for two built from the cheapest staples in the kitchen — rice, chicken, ground beef, tomatoes, garlic, and butter. No exotic ingredients, no special equipment, no family-pack portions to use up.\n\n" +
    "Every recipe is one pan, one protein, and rice. Garlic Butter Chicken Rice Bowls for Two is the quickest of the three: 8 minutes of prep and 15 of cooking. Easy Meal Ideas for Two: One-Pan Chicken and Tomato Rice runs 10 minutes of prep and 30 of cooking. One-Pan Ground Beef and Tomato Rice Skillet — Your Easy Week of Meals Starts Here — takes the longest, 15 minutes of prep plus 30 of cooking, and it's the one that leans on beef instead of chicken.\n\n" +
    "All three are rice skillets, and that's the budget trick doing the work: rice stretches a modest amount of protein into two full plates, and it cooks right in the pan with the sauce, so there's no side dish to make and nothing extra to buy. Total times run from 23 minutes to 45: the chicken rice bowls at 23, the chicken and tomato rice at 40, the ground beef skillet at 45.\n\n" +
    "These are for the weeks when the grocery bill matters and dinner still has to feel like dinner. If you already keep rice, garlic, and canned tomatoes in the cupboard, each recipe is a short list away from two plates — the three share the same pantry, so buying for one means buying for all three. Start with the chicken rice bowls for the fastest payoff, or with the ground beef skillet when you want the week planned ahead — the title says it: your easy week of meals starts there.\n\n" +
    "Because all three cook rice in the pan, the timing logic is the same: brown the protein first, build the tomato-garlic sauce, then let the rice finish in the same skillet. The ground beef version needs the most upfront work — 15 minutes of prep — so chop everything before the pan heats. And none of the three needs a side dish or a second pan: plate them straight from the skillet.",
  siblings: ["chicken-dinners-for-two", "small-batch-slow-cooker", "one-pan-dinners-for-two"],
  pillarPage: {
    title: "Budget-Friendly Dinners for Two — Eat Well for Less",
    keyword: "budget dinners for two",
    volume: 2900,
    kd: 5,
    intent: "informational",
    requiredEntities: ["budget_cooking", "affordable_meals", "meal_planning", "grocery_savings"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "$5 Ground Beef Dinners for Two",
      keyword: "cheap ground beef dinners for two",
      volume: 1800, kd: 4, intent: "informational",
      requiredEntities: ["ground_beef", "budget_meal", "affordable_protein"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Pantry Staple Dinners for Two — No Extra Grocery Trip",
      keyword: "pantry staple dinners for two",
      volume: 1200, kd: 3, intent: "informational",
      requiredEntities: ["pantry_cooking", "shelf_stable", "emergency_meals"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const CHICKEN_CLUSTER: Cluster = {
  id: "chicken-dinners-for-two",
  name: "Chicken Dinners for Two",
  cuisine: "Chicken Dinners",
  section: "core",
  kdAvg: 5,
  totalVolume: 15_600,
  coverageContribution: 20,
  description:
    "The largest chicken collection on the site: 30 chicken dinners for two spanning every method that makes a weeknight — one-pan skillets, pasta, orzo, rice, pot pie, sheet pan, and slow cooker. Whatever form tonight's chicken dinner takes, there's a version here written for exactly two servings, with prep time and cook time spelled out in each recipe.\n\n" +
    "The collection breaks into clear families. Orzo: 40-Minute White Wine Lemon Chicken Orzo, 30-Minute Mediterranean Chicken Orzo with Feta and Olives, Creamy Parmesan Garlic Chicken Orzo, and 30-Minute Summer Herb Chicken Orzo with Zucchini. Rice: One-Pan Chicken and Rice for Two That Actually Tastes Like Dinner, One-Pan Garlic Tomato Chicken and Rice, One-Pan Chicken and Rice for Two with Garlic Butter Tomato Sauce, 35-Minute One-Skillet Chicken and Rice, and the chicken and tomato rice from the Easy Meal Ideas and Simple Dinner Ideas series. Pasta: 30-Minute Lemon Butter Chicken Pasta, 20-Minute Garlic Butter Chicken Pasta, and Pan-Seared Chicken Breast with Creamy Tomato Garlic Pasta. Skillets: the Chicken Enchilada Skillet from Easy Mexican Dinner for Two, Easy Whole30 Chicken Skillet with Tomatoes and Garlic, One-Pan Chicken and Vegetable Skillet, and Garlic Butter Chicken Bites with Blistered Tomatoes and Sautéed Spinach. And the occasion recipes: Chicken Pot Pie for Two with a Flaky Puff Pastry Lid, Sheet Pan Thanksgiving Dinner for Two with Herb-Roasted Chicken, 4-Ingredient Feta Brine Chicken Breast, 25-Minute Pan-Seared Chicken with Herb-Butter Pan Sauce, and Garlic Butter Chicken Rice Bowls.\n\n" +
    "Timing spans the full weeknight range. The fastest recipe in the collection is 20-Minute Garlic Butter Chicken Pasta: 5 minutes of prep, 15 of cooking, 20 end to end. Most one-pan dinners sit between 25 and 45 minutes — the garlic herb chicken and the lemon garlic chicken both run 15 minutes of prep plus 30 of cooking, and two of the rice dishes cook 33 minutes. At the far end, four slow cooker entries take over the evening: 2-Quart Slow Cooker Chicken and Gravy at 4 hours 30, Slow Cooker Chicken and Rice at 5 hours 30, Crockpot Chicken & Tomato Rice at 5 hours 45, and the Weeknight Ragu at 6 hours 25.\n\n" +
    "Choose by method and by mood. One-pan chicken and rice when you want dinner and a single skillet to wash; an orzo or pasta dish when you want something lemony and saucy; the pot pie or the sheet-pan Thanksgiving when a regular Tuesday deserves more; the slow cooker versions when you want to load the pot in the morning and come home to dinner already done. Every recipe is written for two servings, so the portions match the table and the shopping list stays small.\n\n" +
    "A few practical notes. The pan-seared chicken with herb-butter pan sauce and the garlic butter chicken bites both finish in 25 minutes — 10 minutes of prep, 15 of cooking — so measure the butter and herbs before the pan heats, because the cook window is short. The feta brine chicken is the outlier on purpose: 22 minutes of prep and 12 of cooking, the longest prep and the shortest cook in the whole group. And when a title carries a time claim, check the timings: 30-Minute Summer Herb Chicken Orzo is 15 minutes of prep plus 30 of cooking, so the clock starts when you start prepping, not when the pan goes on.",
  siblings: ["one-pan-dinners-for-two", "quick-healthy-dinners", "budget-meals-for-two"],
  pillarPage: {
    title: "Chicken Dinners for Two — Practical Recipes for Small Households",
    keyword: "chicken dinners for two",
    volume: 4400,
    kd: 7,
    intent: "informational",
    requiredEntities: ["chicken", "small_batch_cooking", "weeknight_dinner", "poultry"],
    wordCountRange: { min: 2000, max: 2800 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Pan-Seared Chicken Breast for Two — Juicy Every Time",
      keyword: "pan seared chicken breast for two",
      volume: 2400, kd: 5, intent: "informational",
      requiredEntities: ["chicken_breast", "pan_searing", "cooking_technique"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Chicken Thigh Sheet Pan Dinner for Two",
      keyword: "chicken thigh sheet pan dinner for two",
      volume: 1800, kd: 4, intent: "informational",
      requiredEntities: ["chicken_thighs", "sheet_pan", "roasted_vegetables"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "15-Minute Chicken Stir-Fry for Two",
      keyword: "quick chicken stir fry for two",
      volume: 3200, kd: 6, intent: "informational",
      requiredEntities: ["chicken", "stir_fry", "quick_meal", "wok"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const ASIAN_CLUSTER: Cluster = {
  id: "asian-inspired-dinners",
  name: "Asian-Inspired Dinners for Two",
  cuisine: "Asian-Inspired Dinners",
  section: "outer",
  kdAvg: 5,
  totalVolume: 8_400,
  coverageContribution: 10,
  description:
    "Two beef noodle dinners for two, both one-pan, both on the table in 25 minutes. The collection is young — two recipes — and it's built around a single promise: takeout-level beef noodles without the delivery fee or the wait.\n\n" +
    "The first is Easy Asian Beef Noodle Stir-Fry for Two, ready in 25 minutes: seared beef and noodles in one skillet, 10 minutes of prep and 15 of cooking. The second is Easy Beef Ramen Noodles for Two, one-pan and 25 minutes: the same format — beef, noodles, one skillet — in ramen form, also 10 minutes of prep and 15 of cooking. Both lean on the soy and sesame flavors that make a stir-fry taste like the takeout order you didn't place.\n\n" +
    "The timings are identical by design: 10 minutes of prep and 15 minutes of cooking each, 25 minutes from start to plate. That's the entire appeal — you can decide at 6:35 that it's a noodles night and be eating by 7:00. Both are one-pan recipes, so there's no wok required and no second pot to wash.\n\n" +
    "These are for the takeout impulse — the night you'd order beef noodles and pay a delivery fee for the convenience. If you like your noodles with beef, this is the whole collection for now, and it's where the collection starts rather than where it ends. When the craving hits, the choice between the two is really a choice between stir-fried noodles and ramen — either way the work is identical, and both are sized for two, so the portions match the order you would have placed anyway.\n\n" +
    "Both recipes compress the real work into the 10 minutes of prep: the beef and the noodles have to be ready before the pan gets hot, because 15 minutes of cooking doesn't leave time to slice or measure. Follow that order of operations — everything prepped, then heat — and the dinner comes together in the time it would take to scroll a delivery app. Serve straight from the pan; noodles wait for no one.",
  siblings: ["quick-healthy-dinners", "chicken-dinners-for-two", "one-pan-dinners-for-two"],
  pillarPage: {
    title: "Asian-Inspired Dinners for Two — Easy Weeknight Favorites",
    keyword: "easy asian dinners for two",
    volume: 2400,
    kd: 6,
    intent: "informational",
    requiredEntities: ["asian_cooking", "stir_fry", "rice_dishes", "quick_sauces"],
    wordCountRange: { min: 1800, max: 2500 },
    type: "pillar",
  },
  spokes: [
    {
      title: "Better-Than-Takeout Beef and Broccoli for Two",
      keyword: "beef and broccoli for two",
      volume: 2900, kd: 5, intent: "informational",
      requiredEntities: ["beef", "broccoli", "stir_fry", "asian_sauce"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "Quick Teriyaki Chicken Rice Bowls for Two",
      keyword: "teriyaki chicken rice bowl for two",
      volume: 1800, kd: 4, intent: "informational",
      requiredEntities: ["chicken_teriyaki", "rice_bowl", "japanese_inspired"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

export const QUICK_HEALTHY_CLUSTER: Cluster = {
  id: "quick-healthy-dinners",
  name: "Quick & Healthy Dinners for Two",
  cuisine: "Quick & Healthy Dinners",
  section: "core",
  kdAvg: 5,
  totalVolume: 12_000,
  coverageContribution: 15,
  description:
    "Sixteen fast dinners for two, all built around short timelines and fresh ingredients. The name says quick and healthy: in practice that means honest cooking on a clock, from 20 minutes to 45 minutes end to end, with every recipe sized for exactly two servings. It's also a dinners-only collection — every recipe here is a main course.\n\n" +
    "Chicken leads: 13 of the 16 recipes. The orzo and pasta family — 30-Minute Mediterranean Chicken Orzo with Feta and Olives, 30-Minute Summer Herb Chicken Orzo with Zucchini, 30-Minute Lemon Butter Chicken Pasta, and the garlic butter chicken with tomato orzo from the Easy Dinner Ideas series — covers the one-pot weeknights. The skillet family runs from 25-Minute One-Pan Garlic Herb Chicken and 30-Minute One-Pan Lemon Garlic Chicken to One-Pan Chicken and Vegetable Skillet and Garlic Butter Chicken Bites with Blistered Tomatoes and Sautéed Spinach. The rice dishes — Garlic Butter Chicken Rice Bowls, One-Pan Garlic Tomato Chicken and Rice, and One-Pan Chicken and Rice with Garlic Butter Tomato Sauce — do rice and protein in one pan. Then the three non-chicken entries: Garlic Shrimp Orzo with Cherry Tomatoes, Salmon Orzo with Dill and Capers, and Pan-Seared Steak Dinner with Garlic Butter and Blistered Green Beans.\n\n" +
    "Real timings from the data: prep runs 5 to 15 minutes and cooking runs 15 to 33, for totals of 20 to 45 minutes. Eleven of the sixteen land at 35 minutes or less, and the fastest is 20-Minute Garlic Butter Chicken Pasta — 5 minutes of prep, 15 of cooking, 20 total. The five longest all run 45 minutes — four of them at 15 minutes of prep plus 30 of cooking, the chicken and rice with garlic butter tomato sauce at 12 plus 33 — and here's the honest part: a few of them carry time claims in the title that don't match the total. The 25-Minute garlic herb chicken runs 45 minutes end to end, and 30-Minute One-Pan Lemon Garlic Chicken and 30-Minute Summer Herb Chicken Orzo tell the same story. Check the numbers before you schedule the evening around a title.\n\n" +
    "Reach for this collection when the clock matters more than the occasion. Every recipe is written with a single timeline, so the meal lands on the table at once — no component waiting on another. New to cooking for two? The rice bowls at 23 minutes and the 20-minute pasta are the gentlest entries. Want the closest thing to a weeknight showpiece? The steak with blistered green beans lands at 28 minutes total — 10 of prep, 18 of cooking — and the salmon orzo at 30.\n\n" +
    "Three things worth knowing before you start. First, the 15-minute-cook recipes — the rice bowls, the chicken bites, the pan-seared chicken — don't leave time for mid-cook prep, so measure everything before the heat goes on. Second, when a rice dish lists 25 or 33 minutes of cooking, that's the rice finishing in the pan; plan the timing, not a side dish. Third, the pan-seared steak is the fastest non-chicken option at 28 minutes, with the garlic butter and green beans riding the same pan as the steak.",
  siblings: ["chicken-dinners-for-two", "asian-inspired-dinners", "one-pan-dinners-for-two"],
  pillarPage: {
    title: "Quick & Healthy Dinners for Two — 30 Minutes or Less",
    keyword: "quick healthy dinners for two",
    volume: 3600, kd: 6, intent: "informational",
    requiredEntities: ["quick_meals", "healthy_dinner", "30_minute_meals", "small_batch"],
    wordCountRange: { min: 2000, max: 2800 }, type: "pillar",
  },
  spokes: [
    {
      title: "15-Minute Mediterranean Bowls for Two",
      keyword: "quick mediterranean bowls for two",
      volume: 1800, kd: 4, intent: "informational",
      requiredEntities: ["mediterranean", "grain_bowl", "quick_meal"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "30-Minute Healthy Salmon Dinner for Two",
      keyword: "healthy salmon dinner for two",
      volume: 2400, kd: 5, intent: "informational",
      requiredEntities: ["salmon", "healthy_fats", "omega_3", "quick_dinner"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
    {
      title: "High-Protein Ground Turkey Skillet for Two",
      keyword: "ground turkey skillet for two",
      volume: 1600, kd: 4, intent: "informational",
      requiredEntities: ["ground_turkey", "high_protein", "skillet_meal"],
      wordCountRange: { min: 1200, max: 1800 }, type: "spoke",
    },
  ],
}

/**
 * All active clusters in the topical map.
 * Add new clusters here as we expand to new cuisines.
 */
export const TOPICAL_MAP: Cluster[] = [
  SLOW_COOKER_CLUSTER,   // Priority 1 — 12.5K vol
  ONE_PAN_CLUSTER,       // Priority 2 — 18.2K vol (head term)
  BUDGET_CLUSTER,        // Priority 3 — 9.8K vol
  CHICKEN_CLUSTER,       // Priority 4 — 15.6K vol
  ASIAN_CLUSTER,         // Priority 5 — 8.4K vol
  QUICK_HEALTHY_CLUSTER, // Priority 6 — 12K vol
]

/**
 * Look up a cluster by its ID.
 */
export function getClusterById(id: string): Cluster | undefined {
  return TOPICAL_MAP.find((c) => c.id === id)
}

/**
 * Get cuisine configuration for pipeline injection.
 */
export function getCuisineConfig(cuisine: string): {
  cuisine: string
  cuisine_ingredients: string
  cuisine_techniques: string
} {
  const presets: Record<string, { name: string; ingredients: string; techniques: string }> = {
    "dinners-for-two": DINNERS_FOR_TWO_PRESET,
    "small-batch slow cooker": DINNERS_FOR_TWO_PRESET,
    "one-pan dinners": DINNERS_FOR_TWO_PRESET,
    "budget dinners": DINNERS_FOR_TWO_PRESET,
    "chicken dinners": DINNERS_FOR_TWO_PRESET,
    "asian-inspired dinners": DINNERS_FOR_TWO_PRESET,
  }

  const preset = presets[cuisine.toLowerCase()] ?? presets["dinners-for-two"]
  return {
    cuisine: preset?.name ?? "Easy Weeknight Dinners for Two",
    cuisine_ingredients: preset?.ingredients ?? DINNERS_FOR_TWO_PRESET.ingredients,
    cuisine_techniques: preset?.techniques ?? DINNERS_FOR_TWO_PRESET.techniques,
  }
}
