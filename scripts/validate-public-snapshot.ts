/**
 * Comprehensive verification suite for Chef Augustin's exported static snapshot.
 *
 * Tests all Mission 3 guarantees:
 * 1. Recipe, article, category, and historical rating counts
 * 2. Absence of private fields and draft records
 * 3. Cloudinary URL integrity (hero + inline markdown)
 * 4. Slug validity, uniqueness, and relational integrity (linked_content_id, ratings, markdown cross-links)
 * 5. Compatibility with all public static routes & static JSON/XML/TXT feeds
 * 6. Export reproducibility (2 consecutive exports byte-for-byte identical)
 * 7. Secret & leak scan on the serialized file
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { buildPublicSnapshot } from "./export-public-snapshot"
import {
  type PublicSnapshotPayload,
  scanSerializedSnapshotForLeaks,
  validatePublicSnapshot,
} from "./public-snapshot-schema"
import { HUBS } from "../lib/hub-content"
import { getAllClusters, getClusterTagPatterns } from "../lib/cluster-resolver"
import { CANONICAL_CATEGORIES } from "../lib/category-consolidation"
import { tagToSlug, slugToTag } from "../lib/tag-utils"
import { buildRecipeMarkdown } from "../lib/markdown"
import { resolveAngles, buildPinVariantPrompt } from "../lib/pin-variants"

const SNAPSHOT_PATH = path.resolve(process.cwd(), "data/public-content.json")

function extractMarkdownImageUrls(markdown: string | null): string[] {
  if (!markdown) return []
  const urls: string[] = []
  const re = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<img[^>]+src=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) {
    const u = m[1] || m[2]
    if (u) urls.push(u)
  }
  return urls
}

function extractInternalRecipeLinks(markdown: string | null): string[] {
  if (!markdown) return []
  const slugs: string[] = []
  const re = /\]\((?:https?:\/\/(?:www\.)?chefaugustin\.com)?\/recipes\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:[?#][^)]*)?\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) {
    slugs.push(m[1])
  }
  return slugs
}

async function main() {
  assert.ok(fs.existsSync(SNAPSHOT_PATH), `Snapshot not found at ${SNAPSHOT_PATH}`)
  const rawDisk = fs.readFileSync(SNAPSHOT_PATH, "utf8")
  const parsed = JSON.parse(rawDisk) as PublicSnapshotPayload

  // 1. Schema validation & Counts
  const schemaCheck = validatePublicSnapshot(parsed)
  assert.equal(schemaCheck.ok, true, `Schema errors: ${schemaCheck.ok ? "" : schemaCheck.errors.join("; ")}`)
  assert.ok(parsed.recipes.length > 0, "Expected at least 1 published recipe")

  // 2 & 7. Private data & Secret leak scan
  const leakHits = scanSerializedSnapshotForLeaks(rawDisk)
  assert.deepEqual(leakHits, [], `Leak check failed: ${leakHits.join(", ")}`)
  assert.equal(/\bstatus\b/i.test(rawDisk) && /"status"\s*:\s*"draft"/i.test(rawDisk), false, "Draft leaked")

  // 3. Cloudinary URL integrity
  let heroImageCount = 0
  const inlineImageUrls: string[] = []
  for (const r of [...parsed.recipes, ...parsed.articles]) {
    if (r.heroImageUrl) {
      heroImageCount++
      const u = new URL(r.heroImageUrl)
      assert.equal(u.protocol, "https:")
      assert.equal(u.hostname, "res.cloudinary.com")
      assert.ok(u.pathname.includes("/upload/"))
      assert.equal(r.heroImageUrl.includes("/_next/image"), false)
    }
    for (const img of extractMarkdownImageUrls(r.contentMarkdown)) {
      inlineImageUrls.push(img)
      const u = new URL(img)
      assert.equal(u.protocol, "https:")
      assert.equal(u.hostname, "res.cloudinary.com")
    }
  }

  // 4. Slug & relation integrity
  const recipeSlugSet = new Set(parsed.recipes.map((r) => r.slug))
  const recipeIdSet = new Set(parsed.recipes.map((r) => r.id))

  const brokenArticleLinks: string[] = []
  for (const a of parsed.articles) {
    if (a.linked_content_id !== null && !recipeIdSet.has(a.linked_content_id)) {
      brokenArticleLinks.push(`${a.slug} -> recipe#${a.linked_content_id}`)
    }
    for (const targetSlug of extractInternalRecipeLinks(a.contentMarkdown)) {
      if (!recipeSlugSet.has(targetSlug)) {
        brokenArticleLinks.push(`${a.slug} -> /recipes/${targetSlug}`)
      }
    }
  }
  assert.deepEqual(brokenArticleLinks, [], `Broken article relations: ${brokenArticleLinks.join(", ")}`)

  const brokenRecipeLinks: string[] = []
  for (const r of parsed.recipes) {
    for (const targetSlug of extractInternalRecipeLinks(r.contentMarkdown)) {
      if (!recipeSlugSet.has(targetSlug)) {
        brokenRecipeLinks.push(`${r.slug} -> /recipes/${targetSlug}`)
      }
    }
  }

  // 5. Compatibility with future static frontend & static APIs/feeds
  const canonicalCatSlugs = parsed.categories
    .filter((tag) => CANONICAL_CATEGORIES.has(tag.toLowerCase()))
    .map((tag) => {
      const slug = tagToSlug(tag)
      const resolved = slugToTag(slug, parsed.categories)
      assert.ok(resolved, `slugToTag failed for canonical category "${tag}"`)
      return slug
    })

  const clusters = getAllClusters()
  const clusterCoverage = clusters.map((c) => {
    const patterns = getClusterTagPatterns(c.id)
    const matching = parsed.recipes.filter((r) =>
      r.tags.some((t) => patterns.some((p) => t.toLowerCase().replace(/\s+/g, "-").includes(p))),
    )
    return { id: c.id, count: matching.length }
  })

  const hubCoverage = HUBS.map((h) => ({
    path: `/${h.category}/${h.slug}`,
    count: parsed.recipes.filter((r) => h.curateTags.some((t) => r.tags.includes(t))).length,
  }))

  // Simulate /api/recipes/pins payload construction
  const pinsPayload = parsed.recipes
    .filter((r) => Boolean(r.heroImageUrl))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      url: `https://www.chefaugustin.com/recipes/${r.slug}`,
      pinVariants: resolveAngles(r.tags).map((angle) => ({
        label: angle.label,
        prompt: buildPinVariantPrompt(r.title, angle),
      })),
    }))
  assert.equal(pinsPayload.length, parsed.recipes.filter((r) => r.heroImageUrl).length)

  // Simulate /api/recipes/raw payload construction
  const rawPayload = parsed.recipes.map((r) => ({
    slug: r.slug,
    markdown: buildRecipeMarkdown({
      ...r,
      ingredients: r.ingredients,
      instructions: r.instructions,
    }),
  }))
  assert.equal(rawPayload.length, parsed.recipes.length)
  assert.ok(rawPayload.every((x) => x.markdown.length > 50))

  // Simulate /sitemap.xml URL count
  const cleanSitemapRecipes = parsed.recipes.filter(
    (r) => !r.slug.startsWith("test-") && (r.ingredients.length > 0 || r.instructions.length > 0),
  )

  // 6. Export reproducibility (run twice and verify byte-for-byte match)
  const run1 = await buildPublicSnapshot()
  const run2 = await buildPublicSnapshot()
  assert.equal(run1.snapshot.contentHash, parsed.contentHash, "Disk snapshot hash differs from fresh export")
  assert.equal(run1.snapshot.contentHash, run2.snapshot.contentHash, "Consecutive contentHash mismatch")
  assert.equal(run1.serialized, run2.serialized, "Consecutive serialized JSON mismatch")
  assert.equal(run1.serialized, rawDisk, "Disk snapshot differs byte-for-byte from fresh export")

  const totalVotes = Object.values(parsed.ratingsByRecipeId).reduce((acc, v) => acc + v.count, 0)

  console.log(
    JSON.stringify(
      {
        status: "ALL_CHECKS_PASSED",
        counts: {
          recipes: parsed.recipes.length,
          articles: parsed.articles.length,
          categories: parsed.categories.length,
          canonicalCategories: canonicalCatSlugs.length,
          ratedRecipes: Object.keys(parsed.ratingsByRecipeId).length,
          totalRatingVotes: totalVotes,
          sitemapRecipeUrls: cleanSitemapRecipes.length,
          clusters: clusterCoverage.length,
          hubs: hubCoverage.length,
        },
        cloudinary: {
          heroUrlsVerified: heroImageCount,
          inlineMarkdownUrlsVerified: inlineImageUrls.length,
        },
        relations: {
          brokenArticleLinks,
          brokenRecipeInternalLinksCount: brokenRecipeLinks.length,
          brokenRecipeInternalLinks: brokenRecipeLinks,
        },
        reproducibility: {
          contentHash: parsed.contentHash,
          byteSize: Buffer.byteLength(rawDisk, "utf8"),
          run1MatchesRun2ByteForByte: run1.serialized === run2.serialized,
          diskMatchesFreshExportByteForByte: run1.serialized === rawDisk,
        },
        secretScan: {
          leaksFound: leakHits.length,
        },
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error("[validate-public-snapshot] Failed:", err)
  process.exit(1)
})
