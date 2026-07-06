# Ethical Hooks, Titles, Descriptions & Rich Pins (Reference)

Read this file during **Phases 7–9bis** of the PTRA workflow, when writing `overlay_hook`, `pin_title`, `description`, or evaluating Rich Pin eligibility.

## Phase 7 — Ethical Hook Framework (Overlay Text)

Hooks must be incitative AND honest. They must create a reason to save or click without lying.

**Allowed Hook Types:**
1. Concrete number
2. Time promise
3. Visual result
4. Transformation
5. Mistake avoided
6. Checklist
7. Before / After
8. Simple solution
9. Beginner guide
10. Economic benefit

**Allowed Formulas:**
```text
[Number] + [Useful Outcome]
[Time] + [Specific Result]
[Problem] + [Simple Solution]
[Before State] → [After State]
[Beginner-Friendly] + [Desired Outcome]
[Checklist] + [Use Case]
```

**Valid Examples (Cross-Niche):**
- "5 Small Desk Ideas That Save Space"
- "10-Minute Morning Reset Checklist"
- "Beginner-Friendly Capsule Wardrobe"
- "Before & After: Tiny Office Makeover"
- "7 Sensory Activities Toddlers Actually Use"
- "The Simple Budget Planner You'll Reuse"

**Rejected Examples (Clickbait / Vague):**
- "This Will Change Your Life"
- "Secret Trick Nobody Knows"
- "You Won't Believe This"
- "Guaranteed Results"
- "The Only Method That Works"

**Rule:** The hook can be strong, but it must remain verifiable, specific, and aligned with the destination page.

---

## Phase 8 — Pinterest Title Rules

Format: `[Specific Topic] + [Intent or Benefit]`

**Requirements:** Contains the main subject · matches the intent · readable and scannable · no clickbait · reinforces the cluster · matches the board · matches the destination page.

**Examples:**
- "Minimalist Home Office Ideas for Small Spaces"
- "Toddler Sensory Activities for Rainy Days"
- "Capsule Wardrobe Essentials for Beginners"
- "Budget-Friendly Pantry Organization Ideas"

---

## Phase 9 — Pinterest Description Rules

Format: `[Topic] + [problem/intent] + [benefit] + [save reason]`

**Requirements:** Naturally includes the main topic · explains the promise · gives a reason to save · stays aligned with the destination page · no keyword stuffing · no unverified claims.

**Example:**
> "Discover minimalist home office ideas for small spaces with clean layouts, practical storage and simple desk setups. Save these ideas for your next workspace refresh."

---

## Phase 9bis — Rich Pins & Keyword Policy

**Rich Pins:** If the destination site has structured data available (e.g., Schema.org Recipe markup, product schema), always recommend enabling the matching Rich Pin type (Recipe, Product, or Article). Rich Pins pull metadata (ingredients, price, title) automatically from the site into the Pin — no extra design step needed, and it increases the destination's perceived quality signal. Add to `content_assets`:
```json
{ "rich_pin_eligible": "recipe | product | article | none", "rich_pin_recommended": true }
```

**Hashtag Policy:** Do NOT include hashtags in Pin descriptions or titles. Hashtags contribute negligibly to Pinterest's ranking in the current algorithm; keyword phrases in natural language (title, description, board name) carry the actual weight. If the user asks for hashtags, explain this and redirect effort to long-tail keyword phrasing instead.

**Trend Sourcing:** The `Trend Timing` score factor must be grounded, not guessed. Before scoring, ask the user (or mark as HYPOTHESIS) whether the topic has been checked against Pinterest Trends or Pinterest Predicts. If unchecked:
> "HYPOTHESIS: Trend timing has not been verified against Pinterest Trends/Predicts data. Score reflects seasonal logic only (45–60 day lead time assumed)."
