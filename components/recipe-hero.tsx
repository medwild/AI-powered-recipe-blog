"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock, Flame, Users, ChefHat, ArrowDown, Sparkles } from "lucide-react"
import type { Recipe } from "@/lib/db/schema"
import { FOOD_BLUR_PLACEHOLDER } from "@/lib/utils/cn"
import { fromIsoDuration, parseDurationMinutes } from "@/lib/utils/duration"
import { PinButton } from "@/components/pin-button"
import { CookModeToggle } from "@/components/cook-mode-toggle"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { resolveCluster } from "@/lib/cluster-resolver"

/**
 * Extracts the "why this works" value proposition from recipe markdown.
 * Looks for the first strong statement after "Why This Works" or
 * returns the excerpt as fallback.
 */
function extractValueProp(contentMarkdown: string | null, excerpt: string | null): string | null {
  if (!contentMarkdown) return excerpt ?? null

  // Try "Why This Works" section first
  const whyMatch = contentMarkdown.match(/\*\*Why This Works\*\*[:\s]*\n+(.+?)(?:\n|$)/i)
  if (whyMatch && whyMatch[1].trim().length > 30) {
    return whyMatch[1].trim().substring(0, 200)
  }

  // Try the H2 "Why This Works" variant
  const h2Match = contentMarkdown.match(/## Why This Works\s*\n+(.+?)(?:\n|$)/i)
  if (h2Match && h2Match[1].trim().length > 30) {
    return h2Match[1].trim().substring(0, 200)
  }

  // Fall back to excerpt
  return excerpt ?? null
}

/**
 * RecipeHero — image-first layout following 2025-2026 food blog best practices.
 *
 * Structure (Pinch of Yum / RecipeTin Eats pattern):
 *   1. Hero image (full-bleed, Pinterest-optimized)
 *   2. Badges (speed, technique, dietary — prominent, icon-led)
 *   3. Title (H1, Playfair Display)
 *   4. Metadata pills (Prep, Cook, Servings, Difficulty)
 *   5. Excerpt
 *   6. Author line + publish date
 *
 * Metadata is integrated into the hero so users see time/servings
 * immediately — not buried in a separate section below the fold.
 */

function inferBadges(recipe: Recipe): { label: string; icon?: string }[] {
  const badges: { label: string; icon?: string }[] = []
  const tags = (recipe.tags ?? []).map(t => t.toLowerCase())
  const totalMinutes = parseDurationMinutes(recipe.totalTime)

  // Speed badge
  if (totalMinutes !== null && totalMinutes <= 20) {
    badges.push({ label: "Quick & Easy", icon: "clock" })
  } else if (totalMinutes !== null && totalMinutes <= 30) {
    badges.push({ label: "30 Minutes", icon: "clock" })
  }

  // Technique badge
  if (tags.some(t => t.includes("one-pan") || t.includes("one-pan") || t.includes("sheet pan"))) {
    badges.push({ label: "One-Pan", icon: "flame" })
  } else if (tags.some(t => t.includes("slow cook") || t.includes("crockpot"))) {
    badges.push({ label: "Slow Cooker", icon: "flame" })
  }

  // Dietary badge
  if (tags.some(t => t.includes("gluten-free") || t.includes("gluten free"))) {
    badges.push({ label: "Gluten-Free" })
  } else if (tags.some(t => t.includes("vegetarian") || t.includes("vegan"))) {
    badges.push({ label: "Vegetarian" })
  } else if (tags.some(t => t.includes("healthy") || t.includes("high protein"))) {
    badges.push({ label: "High Protein" })
  }

  // Difficulty badge (if not "Easy")
  if (recipe.difficulty && recipe.difficulty.toLowerCase() !== "easy") {
    badges.push({ label: recipe.difficulty })
  }

  return badges.slice(0, 3)
}

function MetaPill({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-card/80 backdrop-blur border border-border/60 px-3.5 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">{label}</p>
        <p className="text-sm font-semibold text-foreground leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export function RecipeHero({ recipe }: { recipe: Recipe }) {
  const badges = inferBadges(recipe)
  const valueProp = extractValueProp(recipe.contentMarkdown ?? null, recipe.excerpt ?? null)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"
  const recipeUrl = `${siteUrl}/recettes/${recipe.slug}`
  const pinterestShareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(recipeUrl)}&description=${encodeURIComponent(recipe.title)}`

  // Resolve cluster for breadcrumbs
  const cluster = resolveCluster((recipe.tags ?? []) as string[])

  return (
    <header className="mx-auto max-w-3xl px-4 pt-6">
      {/* ── Breadcrumbs ── */}
      <Breadcrumbs
        crumbs={
          cluster
            ? [
                { label: "Home", href: "/" },
                { label: "Recipes", href: "/recettes" },
                { label: cluster.name, href: `/recettes?cluster=${cluster.id}` },
                { label: recipe.title, href: `/recettes/${recipe.slug}` },
              ]
            : [
                { label: "Home", href: "/" },
                { label: "Recipes", href: "/recettes" },
                { label: recipe.title, href: `/recettes/${recipe.slug}` },
              ]
        }
      />

      {/* ── 1. Hero Image ── */}
      {recipe.heroImageUrl ? (
        <figure className="relative overflow-hidden rounded-3xl border border-border shadow-2xl shadow-primary/10 aspect-[3/2] md:aspect-[2/3]">
          <Image
            src={recipe.heroImageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            placeholder="blur"
            blurDataURL={FOOD_BLUR_PLACEHOLDER}
          />
          <PinButton
            imageUrl={recipe.heroImageUrl}
            pageUrl={`${process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"}/recettes/${recipe.slug}`}
            title={recipe.title}
          />
          <figcaption className="sr-only">Photo: {recipe.title}</figcaption>
        </figure>
      ) : (
        <div className="flex aspect-[3/2] md:aspect-[2/3] items-center justify-center rounded-3xl border border-dashed border-border bg-secondary/20">
          <p className="text-sm text-muted-foreground/60 font-serif">
            Photo coming soon
          </p>
        </div>
      )}

      {/* ── 2. Badges — icon-led, prominent ── */}
      {badges.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {badges.map((b) => (
            <span
              key={b.label}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              {b.icon === "clock" ? <Clock className="h-3 w-3" aria-hidden="true" /> : null}
              {b.icon === "flame" ? <Flame className="h-3 w-3" aria-hidden="true" /> : null}
              {b.label}
            </span>
          ))}
          {recipe.totalTime ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {fromIsoDuration(recipe.totalTime)}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* ── 3. Title ── */}
      <h1 className="mt-4 font-serif text-[clamp(1.8rem,4.5vw,2.8rem)] leading-tight text-balance text-foreground">
        {recipe.title}
      </h1>

      {/* ── Triple CTA row (Sally's pattern: Pin | Jump to Recipe | Print) ── */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Pin to Pinterest */}
        <a
          href={pinterestShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#E60023]/10 px-3.5 py-1.5 text-xs font-semibold text-[#E60023] transition-all hover:bg-[#E60023]/20"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 5.1 3.2 9.4 7.6 11.1-.1-.9-.2-2.4 0-3.4l1.4-5.9s-.4-.7-.4-1.8c0-1.7 1-3 2.2-3 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.3 1.2.6 2.2 1.8 2.2 2.1 0 3.8-2.2 3.8-5.4 0-2.8-2-4.9-4.9-4.9-3.3 0-5.3 2.5-5.3 5 0 1 .4 2 1 2.9.1.1.1.4 0 .5-.2.7-.6 2.2-.6 2.5-.1.4-.3.5-.7.3C6.1 15.1 5 13.7 5 12c0-3.6 2.6-6.9 7.6-6.9 4 0 7.1 2.8 7.1 6.6 0 3.9-2.5 7.1-6 7.1-1.2 0-2.3-.6-2.7-1.4 0 0-.6 2.3-.7 2.8-.3 1-.9 2.3-1.4 3.1C10 23.8 11 24 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0z"/>
          </svg>
          Save
        </a>

        {/* Jump to Recipe */}
        <a
          href="#ingredients-section"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20"
        >
          Jump to Recipe
          <ArrowDown className="h-3 w-3" aria-hidden="true" />
        </a>

        {/* Print */}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground transition-all hover:bg-secondary/80"
        >
          Print
        </button>

        {/* Cook Mode toggle */}
        <CookModeToggle />
      </div>

      {/* ── 4. Value Prop Box (Sally's pattern: why this recipe works) ── */}
      {valueProp ? (
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] border border-primary/15 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
                Why This Recipe Works
              </p>
              <p className="text-sm leading-relaxed text-foreground/85 text-pretty">
                {valueProp}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 5. Metadata pills — Prep / Cook / Servings / Difficulty ── */}
      {(recipe.prepTime || recipe.cookTime || recipe.servings || recipe.difficulty) ? (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {recipe.prepTime ? (
            <MetaPill icon={Clock} label="Prep" value={fromIsoDuration(recipe.prepTime) ?? recipe.prepTime} />
          ) : null}
          {recipe.cookTime ? (
            <MetaPill icon={Flame} label="Cook" value={fromIsoDuration(recipe.cookTime) ?? recipe.cookTime} />
          ) : null}
          {recipe.servings ? (
            <MetaPill icon={Users} label="Servings" value={recipe.servings} />
          ) : null}
          {recipe.difficulty ? (
            <MetaPill icon={ChefHat} label="Skill" value={recipe.difficulty} />
          ) : null}
        </div>
      ) : null}

      {/* ── 5. Excerpt ── */}
      {recipe.excerpt ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty max-w-prose">
          {recipe.excerpt}
        </p>
      ) : null}

      {/* ── 6. Author + Date ── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          By{" "}
          <Link
            href="/about"
            className="font-medium text-foreground underline decoration-primary/40 hover:decoration-primary transition-colors"
          >
            Chef Augustin Lefèvre
          </Link>
        </span>
        {recipe.publishedAt ? (
          <span>
            <time dateTime={recipe.publishedAt.toISOString().split("T")[0]}>
              {recipe.publishedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </span>
        ) : null}
        {recipe.updatedAt && recipe.publishedAt &&
          (recipe.updatedAt.getTime() - recipe.publishedAt.getTime()) > 7 * 24 * 60 * 60 * 1000 ? (
          <span>
            · Updated{" "}
            <time dateTime={recipe.updatedAt.toISOString().split("T")[0]}>
              {recipe.updatedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </span>
        ) : null}
      </div>
    </header>
  )
}
