# PTRA Logic — Règles métier
> Logique importée du framework PTRA (Pinterest Topical Resonance Authority).
> Le plugin n'implémente PAS ces calculs (ils sont côté API), mais doit les comprendre pour l'affichage.

---

## Pinterest Intent Taxonomy (8 intents)

Chaque pin a UN intent parmi ces 8 :

| Intent | Hook Pattern | Content Graph Signal |
|---|---|---|
| `quick_solution` | "[Time] + [Result]" | Saves (Engagement) |
| `beginner_guide` | "Beginner-Friendly [Topic]" | Topic Relevance |
| `step_by_step` | "Step-by-Step: [Process]" | Saves (Engagement) |
| `mistake_avoidance` | "[N] Mistakes That Ruin [Topic]" | Domain Quality |
| `before_after` | "Before & After: [Result]" | Visual (Pinterest Lens) |
| `checklist` | "[Topic] Checklist for [Outcome]" | Saves (Engagement) |
| `ingredient_spotlight` | "Why [Key Element] Makes [Topic] Better" | Topic Relevance |
| `budget_friendly` | "Budget-Friendly [Solution]" | Domain Quality |

> **Note :** `ingredient_spotlight` est universel malgré son nom — il signifie "Focus sur un élément clé", quel que soit le domaine (pas que food).

---

## PTRA Scoring — 5 facteurs (déterministe)

Le score est calculé par l'API (code TypeScript, PAS le LLM).

| Facteur | Points | Règle |
|---|---|---|
| Semantic Fit | 0-10 | Titre + description contiennent les mots-clés du contenu |
| Board Fit | 0-10 | Le board assigné existe dans le plan PTRA et match la catégorie |
| Fresh Pin Rule | 0-10 | Les 5 images sont visuellement distinctes (pas juste un overlay changé) |
| Ethical Hook | 0-10 | Pas de clickbait, hook spécifique et vérifiable |
| Destination Fit | 0-10 | Le pin promet uniquement ce que l'article contient |

Total = somme × 2 → score /100

### Score Ranges (affichage)

| Score | Label | Couleur |
|---|---|---|
| 90-100 | Excellent | Or `#f1c40f` |
| 80-89 | Strong | Vert `#00a32a` |
| 70-79 | Acceptable | Jaune `#f0ad4e` |
| 50-69 | Weak | Orange `#e67e22` |
| 0-49 | Reject | Rouge `#d63638` |

---

## Content Graph — 4 Signaux

Pinterest évalue chaque pin sur ces signaux :

| Signal | Poids relatif | Intents associés |
|---|---|---|
| **Saves** (Engagement) | Le plus fort | quick_solution, step_by_step, checklist |
| **Domain Quality** | Fort | mistake_avoidance, budget_friendly |
| **Topic Relevance** | Important | beginner_guide, ingredient_spotlight |
| **Visual** (Pinterest Lens) | Important | before_after |

---

## Ethical Hook Rules

### Interdits (clickbait)
Ces patterns sont détectés par le scoreur — les pins qui les utilisent perdent des points :
- "This Will Change Your Life"
- "Secret Trick Nobody Knows"
- "You Won't Believe This"
- "Guaranteed Results"
- "The Only Method That Works"
- "Crazy / Insane / Shocking"

### Recommandés
- "[Number] + [Useful Outcome]" → "15-Minute Dinner"
- "[Time] + [Specific Result]" → "30-Min One-Pan Meal"
- "[Problem] + [Simple Solution]" → "No More Leftover Chaos"
- "[Beginner-Friendly] + [Desired Outcome]" → "Beginner's Guide to..."

---

## Fresh Pin Rule

5 pins pour le même article = 5 images **visuellement distinctes**.

**Rejeté :** Même photo avec juste un overlay texte différent.
**Accepté :** Composition, angle, mise en scène, arrière-plan différents.

Le scoreur compare les `image_prompt` entre eux (similarité cosinus ou Dice coefficient). Si ≥2 pins sont trop similaires → pénalité.

---

## Image Specs (Pinterest)

- Format : **2:3** (1000×1500px) vertical
- **Safe zone** : 8% de marge extérieure — pas de texte ni sujet critique dans cette zone (les overlays UI et le crop mobile coupent cette zone)
- **Texte overlay** : tiers supérieur, grand, lisible, contraste élevé
- **Sujet unique** : un élément focal par image
- **Contraste** : sujet clair sur fond sombre, ou inversement
- **Pinterest Lens** : texture visible, pas de composition encombrée

---

## Board Architecture

Règles issues du framework PTRA :

1. **Un board = un intent clair.** "Recipes" ou "Ideas" → REJETÉ.
2. **Noms spécifiques > noms génériques.** "30-Minute Meals for Two" > "Easy Dinners" > "Recipes".
3. **Le premier board de sauvegarde** d'un pin est le signal de classification le plus fort (US Patent 11256747).
4. **Les boards génériques** sont élagués du Content Graph Pinterest.
5. **Board naming** : mots-clés à forte intention uniquement.

---

## Topic Cohesion Score

Pinterest mesure l'alignement entre le contenu du pin et la page de destination (US Patent 20230388261A1).

**Règle :** La description du pin doit contenir des mots-clés présents dans l'article (H2, FAQ, corps du texte). Si la description promet quelque chose que l'article ne contient pas → pénalité Destination Fit.

---

## Contenu du plan PTRA (`GET /sites/{id}/plan`)

```json
{
  "niche_core": {
    "micro_niche": "string — une et une seule micro-niche",
    "excluded_adjacent_niches": ["niche1", "niche2", "niche3"],
    "target_audience": "string",
    "user_problem": "string",
    "solution_promise": "string",
    "primary_pinterest_intent": "quick_solution | beginner_guide | ...",
    "content_positioning": "string"
  },
  "board_architecture": [
    {
      "name": "Board Name",
      "zernio_id": "board_xxx",
      "role": "Primary board for quick meals",
      "allowed_content": ["quick_solution", "beginner_guide"],
      "rejected_content": ["budget_friendly"]
    }
  ],
  "cluster_map": [
    {
      "cluster_name": "One-Pan Meals",
      "priority": "high | medium | low",
      "user_problem": "No time to cook after work",
      "solution_angle": "One-pan meals ready in 30 min",
      "primary_board": "Easy Dinners for Two",
      "pinterest_intent": "quick_solution",
      "ptra_target_score": 85
    }
  ],
  "publishing_calendar": [
    {
      "week": 1,
      "focus_cluster": "One-Pan Meals",
      "supporting_cluster": "Budget Meals",
      "pins_count": 15,
      "notes": "Reinforce quick_solution intent"
    }
  ]
}
```
