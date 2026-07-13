# PTRA Board Mapping Matrix

> Micro-niche: **Easy Weeknight Dinners for Two**
> 5 boards PTRA, mapping based on `topic_cluster` + keyword signals

## Board 1 — Small-Batch Slow Cooker Dinners

| Dimension | Match |
|---|---|
| **Topic clusters** | `crockpot_slow_cooker_dinners`, `appliance_cooking_methods` |
| **Keyword signals** | "crockpot", "slow cook", "slow cooker", "2 quart", "small batch", "instant pot", "pressure cook" |
| **Pinterest intent** | Step-by-step recipe |
| **Content format** | Recipe, 1200-1500 words, pin-first |

## Board 2 — One-Pan Dinners for Two

| Dimension | Match |
|---|---|
| **Topic clusters** | `one_pot_meals`, `appliance_cooking_methods`, `Sides, casseroles & comfort food` |
| **Keyword signals** | "one pan", "one pot", "sheet pan", "skillet", "casserole", "cast iron" |
| **Pinterest intent** | Quick solution |
| **Content format** | Recipe, 1200-1500 words, pin-first |

## Board 3 — Budget Meals for Two

| Dimension | Match |
|---|---|
| **Topic clusters** | `dinner_meal_planning`, `starches_grains_pasta` |
| **Keyword signals** | "cheap", "budget", "pantry", "ground beef", "pasta", "rice", "beans", "frugal", "leftover" |
| **Pinterest intent** | Inspiration + quick solution |
| **Content format** | Recipe, 1200-1500 words, pin-first |

## Board 4 — Chicken Dinners for Two

| Dimension | Match |
|---|---|
| **Topic clusters** | `chicken_recipes`, `Protein main dishes`, `meat_steak_sausage`, `Health-focused recipes` |
| **Keyword signals** | "chicken breast", "chicken thigh", "chicken", "turkey", "pork chop", "steak", "ground beef", "meatball" |
| **Pinterest intent** | Step-by-step recipe |
| **Content format** | Recipe, 1200-1500 words, pin-first |

## Board 5 — Asian-Inspired Dinners for Two

| Dimension | Match |
|---|---|
| **Topic clusters** | `Asian recipes`, `world_cuisine`, `Mexican recipes`, `Italian recipes`, `Southern soul food` |
| **Keyword signals** | "asian", "stir fry", "teriyaki", "fried rice", "noodle", "curry", "taco", "burrito", "pasta", "italian", "mexican", "chinese", "thai", "japanese", "korean", "southern", "soul food" |
| **Pinterest intent** | Inspiration + step-by-step |
| **Content format** | Recipe, 1200-1500 words, pin-first |

## Unmapped Keywords

Keywords that don't match any board are assigned `BOARD_CANDIDATE` with `board_fit_confidence = LOW`. These should be reviewed manually — they may indicate:
- A new board opportunity (e.g., "Soup & Stew Dinners for Two")
- Keywords that belong to a different micro-niche
- Edge cases where the keyword phrasing doesn't match signals but topic_cluster does
