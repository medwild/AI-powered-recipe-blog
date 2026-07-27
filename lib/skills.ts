import fs from "fs/promises"
import path from "path"

const SKILLS_DIR = path.join(process.cwd(), "skills")

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Skill = {
  id: string
  version: string
  description: string
  content: string
}

// ---------------------------------------------------------------------------
// Skill Loader
// ---------------------------------------------------------------------------

/**
 * Charge un skill depuis le dossier skills/.
 *
 * Supporte deux formats :
 * - Sous-répertoire : skills/<name>/SKILL.md  (pour les skills complexes avec références)
 * - Fichier plat :   skills/<name>.md          (pour les skills simples)
 *
 * Retourne le contenu complet du fichier Markdown.
 */
export async function loadSkill(name: string): Promise<string> {
  // Priorité 1 : sous-répertoire avec SKILL.md
  const dirPath = path.join(SKILLS_DIR, name, "SKILL.md")
  try {
    return await fs.readFile(dirPath, "utf-8")
  } catch {
    // Priorité 2 : fichier plat .md
    const filePath = path.join(SKILLS_DIR, `${name}.md`)
    try {
      return await fs.readFile(filePath, "utf-8")
    } catch {
      throw new Error(
        `Skill "${name}" introuvable. Chemins vérifiés :
  ${dirPath}
  ${filePath}`,
      )
    }
  }
}

/**
 * Replaces {{placeholder}} variables in skill content with actual values.
 * Used to inject cuisine-specific data without duplicating skill files.
 *
 * Example:
 *   replacePlaceholders("Focus on {{cuisine}} using {{cuisine_ingredients}}", {
 *     cuisine: "Swedish",
 *     cuisine_ingredients: "salmon, rye, lingonberry, dill, cardamom"
 *   })
 */
export function replacePlaceholders(
  content: string,
  replacements: Record<string, string>,
): string {
  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    content,
  )
}

/**
 * Charge le contenu d'un skill SANS le frontmatter YAML.
 *
 * Utilisé par les agents IA comme system prompt — le frontmatter YAML
 * est une métadonnée pour le loader (id, version, description, model…),
 * pas pour le LLM. Le contenu restant (rôle, règles, format de sortie)
 * constitue le system prompt complet.
 *
 * Si `replacements` est fourni, les placeholders {{key}} dans le contenu
 * sont remplacés par les valeurs correspondantes.
 */
export async function loadSkillContent(
  name: string,
  replacements?: Record<string, string>,
): Promise<string> {
  const raw = await loadSkill(name)
  // Strip YAML frontmatter (délimité par --- au début du fichier)
  const stripped = raw.replace(/^---\n[\s\S]*?---\n?/, "")
  const content = stripped.trim()
  return replacements ? replacePlaceholders(content, replacements) : content
}

/**
 * Charge et parse le frontmatter YAML d'un skill.
 */
export async function getSkillMeta(
  name: string,
): Promise<Pick<Skill, "id" | "version" | "description">> {
  const content = await loadSkill(name)
  const frontMatch = content.match(/^---\n([\s\S]*?)---/)
  if (!frontMatch) {
    throw new Error(`Skill "${name}" : frontmatter YAML manquant`)
  }

  const meta: Record<string, string> = {}
  for (const line of frontMatch[1].trim().split("\n")) {
    const [key, ...rest] = line.split(":")
    if (key && rest.length > 0) {
      meta[key.trim()] = rest.join(":").trim().replace(/^"|"$/g, "")
    }
  }

  return {
    id: meta.id ?? name,
    version: meta.version ?? "0.0.0",
    description: meta.description ?? "",
  }
}

// ---------------------------------------------------------------------------
// Image Prompt Optimizer — Ideogram 4 template-based (v14.2 §6)
// ---------------------------------------------------------------------------

interface PromptSource {
  title?: string | null
  tags?: string[] | null
  difficulty?: string | null
  ingredients?: { name: string; quantity?: string }[] | null
  keyword?: string | null
  imagePrompt?: string | null
}

// Mandatory negative tail per mega-skill §6 — appended to every prompt
const NEGATIVE_TAIL =
  "No text, no labels, no logos, no watermarks, no hands, no fingers, no human limbs, no silverware visible"

// Ingredient → hex color map for extracting palette from recipe data
const COLOR_MAP: Record<string, string> = {
  chicken: "#D4954B", lemon: "#F5D44B", tomato: "#D32F2F", garlic: "#F5E6D3",
  beef: "#8B3A3A", steak: "#8B3A3A", pork: "#D4956B", salmon: "#FA8072",
  shrimp: "#FA8072", rice: "#F5F5DC", pasta: "#F5D76E", cheese: "#FFD700",
  parmesan: "#FFD700", mozzarella: "#FFF8E7", cream: "#FFFDD0", butter: "#FFF8B0",
  egg: "#FFF4B0", basil: "#4A7C3F", parsley: "#4A7C3F", cilantro: "#3B7A3B",
  rosemary: "#5C6B3C", thyme: "#4A7C3F", mushroom: "#C4A882", onion: "#D4A76A",
  pepper: "#27AE60", carrot: "#E85D04", broccoli: "#3A7D2C", spinach: "#3B6E2C",
  potato: "#C4A46C", avocado: "#5A7D2C", chocolate: "#4A2C1A", berry: "#8C0032",
  strawberry: "#D53032", blueberry: "#2C3E6B", vanilla: "#F5E6CC", cinnamon: "#9A6B3B",
  curry: "#D4950A", soy: "#3B2314", ginger: "#E8C96A", noodle: "#F5D76E",
  bread: "#D4956B", bacon: "#B8423A", corn: "#F0D060", lime: "#88C840",
  coconut: "#F5E8C8", honey: "#D4950A", maple: "#B8860B", sesame: "#E8C96A",
}

type DishProfile = {
  surface: string
  angle: string
  aperture: string
  lighting: string
  moisture: string
  microDetail: string
}

const DISH_TEMPLATES: Record<string, DishProfile> = {
  skillet: {
    surface: "dark cast iron skillet with seasoned patina, scattered coarse salt at edges",
    angle: "slightly angled 45-degree shot, f/2.8 shallow depth of field",
    aperture: "f/2.8",
    lighting: "overhead kitchen spotlight, side rim light carving texture, warm 3500K",
    moisture: "glistening sauce pooling at edges, a single herb leaf clinging to the surface",
    microDetail: "a single flake of sea salt catching the rim light",
  },
  soup: {
    surface: "matte ceramic bowl with subtle glaze, dark linen napkin beneath",
    angle: "45° close-up showing texture and depth, f/2.8",
    aperture: "f/2.8",
    lighting: "overhead kitchen spotlight, side rim light, warm 3500K",
    moisture: "steam rising from center, glossy droplets on bowl rim",
    microDetail: "a single fresh herb leaf floating on the surface",
  },
  baked: {
    surface: "seamless cream marble with faint grey veining",
    angle: "overhead flat lay, f/5.6 deep depth of field",
    aperture: "f/5.6",
    lighting: "natural window light from left, 3500K, diffused through linen",
    moisture: "crackled golden crust, melting butter pooling in crevices",
    microDetail: "a single flake of finishing salt on a golden edge",
  },
  grilled: {
    surface: "dark walnut cutting board with deep grain, rustic linen beside it",
    angle: "slightly angled 45-degree shot, f/2.8 shallow depth of field",
    aperture: "f/2.8",
    lighting: "overhead kitchen spotlight, warm 3500K, rim light on char marks",
    moisture: "glistening juices at the surface, charred edges with pink center",
    microDetail: "a single rosemary needle resting on a char mark",
  },
  default: {
    surface: "dark walnut countertop with subtle grain, warm tones",
    angle: "slightly angled 45-degree shot, f/2.8",
    aperture: "f/2.8",
    lighting: "overhead kitchen spotlight, side rim light, warm 3500K",
    moisture: "glistening finish catching the overhead light, fresh garnish scattered naturally",
    microDetail: "a single salt flake resting on the surface",
  },
}

function detectDishType(tags: string[]): string {
  const t = tags.map(t => t.toLowerCase()).join(" ")
  if (/skillet|cast.iron|one.pan|pan.sear|sauté|stir.fry/i.test(t)) return "skillet"
  if (/soup|stew|curry|ramen|broth|chili|bisque/i.test(t)) return "soup"
  if (/baked|bake|roast|oven|casserole|sheet.pan/i.test(t)) return "baked"
  if (/grill|bbq|barbecue|char|smok/i.test(t)) return "grilled"
  return "default"
}

/** Extract 2-3 hex colors from recipe title + tags by matching known ingredients. */
function extractColors(title: string, tags: string[]): string[] {
  const text = `${title} ${tags.join(" ")}`.toLowerCase()
  const seen = new Set<string>()
  for (const [ingredient, hex] of Object.entries(COLOR_MAP)) {
    if (text.includes(ingredient)) seen.add(`${ingredient.replace(/_/g, " ")} ${hex}`)
    if (seen.size >= 3) break
  }
  if (seen.size === 0) return ["warm amber #D4954B", "herb green #4A7C3F", "golden brown #C08040"]
  return [...seen]
}

/**
 * Template-based Ideogram 4 food photography prompt generator.
 *
 * Replaces the old 10-layer generic prompt with mega-skill §6 rules applied
 * deterministically: Canon EOS R5, directional lighting, surface specificity,
 * moisture vocabulary, micro-detail, hex colors, mandatory negative tail.
 *
 * Never returns empty or "undefined" — 100% deterministic, no LLM dependency.
 */
export function buildDefaultPrompt(source: PromptSource): string {
  const dishName = source.title ?? source.keyword
  const tags = source.tags ?? []

  if (!dishName) {
    return [
      "Rustic gourmet food photography of a delicious homemade dish.",
      "Dark walnut countertop with subtle grain.",
      "Slightly angled 45-degree shot.",
      "Overhead kitchen spotlight, side rim light, warm 3500K.",
      "Canon EOS R5, 85mm, f/2.8, ISO 400.",
      "Warm amber #D4954B, herb green #4A7C3F.",
      NEGATIVE_TAIL,
    ].join(" ")
  }

  const p = DISH_TEMPLATES[detectDishType(tags)] ?? DISH_TEMPLATES.default
  const colors = extractColors(dishName, tags)

  const mainIngredients = (source.ingredients ?? [])
    .slice(0, 2)
    .map(i => i.name)
    .filter(Boolean)

  const anchors = mainIngredients.length >= 2
    ? `${mainIngredients[0]} and ${mainIngredients[1]}`
    : mainIngredients[0] ?? dishName

  return [
    `${dishName}.`,
    `${anchors}.`,
    p.surface + ".",
    p.angle + ",",
    p.lighting + ".",
    p.moisture + ",",
    p.microDetail + ".",
    `Canon EOS R5, 85mm, ${p.aperture}, ISO 400.`,
    colors.join(", ") + ".",
    NEGATIVE_TAIL,
  ].join(" ")
}

/**
 * Optimise et garantit un prompt d'image non vide.
 *
 * Règles :
 * 1. Si imagePrompt est valide (> 10 chars) → l'utiliser
 * 2. Sinon → construire un prompt à partir des données de la recette
 * 3. En dernier recours → prompt de secours absolu
 */
export function optimizeImagePrompt(source: PromptSource): string {
  const raw = source.imagePrompt?.trim()

  // Si le prompt est valide, l'utiliser
  if (raw && raw.length > 10) {
    return raw
  }

  // Sinon, construire un prompt à partir des données disponibles
  return buildDefaultPrompt(source)
}
