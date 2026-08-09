// lib/pin-variants.ts
// Pure module — no DB import, no dotenv, no side effects.
// Resolves the 4 photo-angle variants (pins 2-5) for a recipe from its tags,
// and builds the English image-to-image prompt for each angle. Consumed by
// scripts/pin-variants.ts (CLI) and app/api/recipes/pins/route.ts (API).

export type Angle = { label: string; specs: string }

const FLAT_LAY_TAGS = ["pizza", "salad", "board", "cake", "tart"] // food-photography.md §6
const BURGER_TAGS = ["burger", "sandwich", "wrap"] // food-photography.md §6

const LIFESTYLE: Angle = {
  label: "Lifestyle shot",
  specs: "35mm, f/2.0, shallow depth of field",
}

const ANGLES: Record<"default" | "flat-lay" | "burger", Angle[]> = {
  // 45° close-up → overhead → macro → lifestyle (spec §5)
  default: [
    { label: "45° close-up", specs: "90mm macro, f/2.8, shallow depth of field (bokeh)" },
    { label: "Overhead", specs: "50mm, f/5.6, deep depth of field (everything sharp)" },
    { label: "Macro detail", specs: "90mm macro, f/2.2, very shallow depth of field" },
    LIFESTYLE,
  ],
  // Flat-lay: overhead first (pizza, salad, board, cake/tart)
  "flat-lay": [
    { label: "Overhead flat lay", specs: "50mm, f/5.6, deep depth of field (everything sharp)" },
    { label: "45° close-up", specs: "90mm macro, f/2.8, shallow depth of field (bokeh)" },
    { label: "Macro detail", specs: "90mm macro, f/2.2, very shallow depth of field" },
    LIFESTYLE,
  ],
  // Burger/sandwich: 45° hero + side cut-away
  burger: [
    { label: "45° hero (height/layers)", specs: "35mm, f/2.0, shallow depth of field" },
    { label: "Side cut-away (layers)", specs: "50mm, f/4, moderate depth of field" },
    { label: "Macro detail (sauce dripping)", specs: "90mm macro, f/2.2, very shallow depth of field" },
    LIFESTYLE,
  ],
}

export function resolveAngles(tags: string[]): Angle[] {
  const joined = tags.join(" ").toLowerCase()
  if (FLAT_LAY_TAGS.some((t) => joined.includes(t))) return ANGLES["flat-lay"]
  if (BURGER_TAGS.some((t) => joined.includes(t))) return ANGLES.burger
  return ANGLES.default
}

export function buildPinVariantPrompt(title: string, angle: Angle): string {
  return [
    `Recreate this exact same dish — ${title} — same ingredients, same colors, same style, same light. Change only the camera angle: ${angle.label}.`,
    "",
    angle.specs,
    "",
    "2:3 vertical, Pinterest. Simple background. No text on image.",
  ].join("\n")
}
