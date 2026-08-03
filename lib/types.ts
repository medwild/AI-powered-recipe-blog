/**
 * Shared types for the Chef Augustin blog.
 * Narrower alternatives to the full Recipe schema type
 * so components declare exactly which fields they consume.
 */

import type { Recipe, Ingredient, Instruction } from "@/lib/db/schema"

// ── Domain types ──────────────────────────────────────────────────────────

export type ContentType = "recipe" | "article"

// ── Component prop types ──────────────────────────────────────────────────

/** Fields consumed by RecipeCard.
 *  Excerpt intentionally excluded — not rendered in listing cards (avoids duplicate content). */
export type RecipeCardData = Pick<
  Recipe,
  "id" | "slug" | "title" | "heroImageUrl" | "difficulty" | "totalTime" | "servings"
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

/** Fields consumed by ArticleCard */
export type ArticleCardData = Pick<
  Recipe,
  "id" | "slug" | "title" | "heroImageUrl" | "publishedAt" | "category"
>

// Re-export schema types for convenience
export type { Recipe, Ingredient, Instruction }
