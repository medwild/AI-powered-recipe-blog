/**
 * Shared types for the Chef Augustin blog.
 * Narrower alternatives to the full Recipe schema type
 * so components declare exactly which fields they consume.
 */

import type { Recipe, Ingredient, Instruction } from "@/lib/db/schema"

// ── Domain types ──────────────────────────────────────────────────────────

export type ContentType = "recipe" | "article"

// ── Component prop types ──────────────────────────────────────────────────

/** Fields consumed by RecipeCard */
export type RecipeCardData = Pick<
  Recipe,
  "slug" | "title" | "excerpt" | "heroImageUrl" | "difficulty" | "totalTime" | "servings"
>

/** Fields consumed by RecipeHero */
export type RecipeHeroData = Pick<
  Recipe,
  "title" | "excerpt" | "heroImageUrl" | "tags" | "publishedAt" | "totalTime" | "slug"
>

/** Fields consumed by RecipeMetaBar */
export type RecipeMetaData = Pick<
  Recipe,
  "prepTime" | "cookTime" | "servings" | "difficulty"
>

// Re-export schema types for convenience
export type { Recipe, Ingredient, Instruction }
