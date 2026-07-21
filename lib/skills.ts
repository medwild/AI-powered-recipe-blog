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
// Image Prompt Optimizer
// ---------------------------------------------------------------------------

interface PromptSource {
  title?: string | null
  tags?: string[] | null
  difficulty?: string | null
  ingredients?: { name: string; quantity?: string }[] | null
  keyword?: string | null
  imagePrompt?: string | null
}

/** Prompt de secours absolu — utilisé si TOUTES les données sont absentes */
const FALLBACK_PROMPT =
  "Rustic gourmet food photography of a delicious homemade dish, " +
  "natural window lighting, wooden table surface, " +
  "top-down composition, warm and inviting atmosphere, " +
  "high detail, appetizing, shot on Sony A7R IV 90mm macro lens"

/**
 * Construit un prompt d'image professionnel à partir des données de la recette.
 *
 * Architecture 10 couches (sujet → contexte → cadrage → style → éclairage →
 * composition → couleur → technique → format → exclusions) pour produire un
 * prompt de qualité professionnelle quand le Writer n'a pas généré de prompt.
 */
export function buildDefaultPrompt(source: PromptSource): string {
  const dishName = source.title ?? source.keyword

  // Si même le nom du plat est absent, utiliser le prompt de secours absolu
  if (!dishName) return FALLBACK_PROMPT

  // Extraction des données de la recette
  const mainIngredients = (source.ingredients ?? [])
    .slice(0, 3)
    .map((i) => i.name)
    .filter(Boolean)
  const tags = (source.tags ?? []).slice(0, 2)
  const isItalian = tags.some((t) => /italian|pasta|pizza/i.test(t))
  const isDessert = tags.some((t) => /dessert|cake|sweet|baking/i.test(t))

  // -----------------------------------------------------------------------
  // Couche 1 — Sujet principal (attributs spécifiques)
  // -----------------------------------------------------------------------
  const subject = mainIngredients.length > 0
    ? `${dishName} with ${mainIngredients.slice(0, 2).join(" and ")}`
    : dishName

  // -----------------------------------------------------------------------
  // Couche 2 — Action / Contexte (environnement)
  // -----------------------------------------------------------------------
  const context = isDessert
    ? "on a rustic ceramic plate, garnished, elegant presentation"
    : isItalian
      ? "served on a rustic wooden board, fresh garnish scattered around"
      : "beautifully plated on artisanal ceramic, fresh herbs as garnish"

  // -----------------------------------------------------------------------
  // Couche 3 — Cadrage + Angle
  // -----------------------------------------------------------------------
  const framing = isDessert
    ? "medium close-up shot, 45-degree angle"
    : "overhead top-down shot, bird's eye view"

  // -----------------------------------------------------------------------
  // Couche 4 — Style visuel
  // -----------------------------------------------------------------------
  const visualStyle = "professional food photography, editorial culinary style, " +
    "magazine-quality, rustic gourmet aesthetic"

  // -----------------------------------------------------------------------
  // Couche 5 — Éclairage (source, direction, qualité, température)
  // -----------------------------------------------------------------------
  const lighting = "natural soft window lighting from the left, " +
    "diffused through a linen curtain, warm 3500K color temperature, " +
    "gentle fill light from a white reflector on the right, " +
    "soft directional shadows adding depth"

  // -----------------------------------------------------------------------
  // Couche 6 — Composition
  // -----------------------------------------------------------------------
  const composition = isDessert
    ? "rule of thirds, subject offset right, negative space on the left, " +
      "leading lines from plate edge to focal point"
    : "overhead flat lay composition, ingredients artfully scattered, " +
      "rule of thirds placement, negative space around the dish"

  // -----------------------------------------------------------------------
  // Couche 7 — Couleur / Palette
  // -----------------------------------------------------------------------
  const colorPalette = isDessert
    ? "warm golden browns, creamy whites, subtle berry accents, " +
      "harmonious earth tones"
    : "warm vibrant colors, rich reds and greens, " +
      "golden crust tones, natural wood browns"

  // -----------------------------------------------------------------------
  // Couche 8 — Détails techniques
  // -----------------------------------------------------------------------
  const technical = "shot on Sony A7R IV, 90mm macro lens, f/2.8, " +
    "shallow depth of field, ISO 400, crisp focus on the main dish, " +
    "subtle film grain texture"

  // -----------------------------------------------------------------------
  // Couche 9 — Format / Ratio
  // -----------------------------------------------------------------------
  const format = "2:3 vertical aspect ratio, suitable for Pinterest and Instagram"

  // -----------------------------------------------------------------------
  // Couche 10 — Exclusions (formulées positivement)
  // -----------------------------------------------------------------------
  const exclusions = "clean background only, no text overlay, " +
    "no artificial plastic props, no harsh flash lighting, no hands visible"

  // Assemblage final — les couches sont dans l'ordre de pondération décroissante
  return [
    `${visualStyle} of ${subject}, ${context},`,
    `${framing},`,
    `${lighting},`,
    `${composition},`,
    `${colorPalette},`,
    `${technical},`,
    `${format},`,
    exclusions,
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
