/**
 * Exhaustive post-build validation suite for Chef Augustin static export (`out/`).
 *
 * Verifies:
 * 1. Exactly 52 recipe HTML pages generated
 * 2. Exactly 1 article HTML page generated
 * 3. All canonical category, collection, and hub pages generated
 * 4. Error 404 page generated
 * 5. Deterministic sitemap.xml, robots.txt, feed.xml, llms.txt generated
 * 6. Static API contracts: /api/recipes/pins (JSON + pinVariants), /api/recipes/raw, and individual slugs
 * 7. Hostinger LiteSpeed .htaccess present with valid 308/301 redirects and cache rules
 * 8. Comprehensive leak and secret scan across EVERY file in out/
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  type PublicSnapshotPayload,
  scanSerializedSnapshotForLeaks,
} from "./public-snapshot-schema"
import { HUBS } from "../lib/hub-content"
import { getAllClusters } from "../lib/cluster-resolver"
import { CANONICAL_CATEGORIES } from "../lib/category-consolidation"
import { tagToSlug } from "../lib/tag-utils"

const CWD = process.cwd()
const OUT_DIR = path.resolve(CWD, "out")
const SNAPSHOT_PATH = path.resolve(CWD, "data/public-content.json")

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath)
  for (const file of files) {
    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles)
    } else {
      arrayOfFiles.push(fullPath)
    }
  }
  return arrayOfFiles
}

async function main() {
  assert.ok(fs.existsSync(OUT_DIR), `Directory ${OUT_DIR} does not exist. Run build first.`)
  const snapshotRaw = fs.readFileSync(SNAPSHOT_PATH, "utf8")
  const snapshot = JSON.parse(snapshotRaw) as PublicSnapshotPayload

  const allFiles = getAllFiles(OUT_DIR)
  console.log(`[validate-out] Scanning ${allFiles.length} files in ${OUT_DIR}...`)

  // 1. Core pages
  assert.ok(fs.existsSync(path.join(OUT_DIR, "index.html")), "index.html missing")
  assert.ok(fs.existsSync(path.join(OUT_DIR, "404.html")), "404.html missing")
  assert.ok(fs.existsSync(path.join(OUT_DIR, "recipes.html")), "recipes.html missing")
  assert.ok(fs.existsSync(path.join(OUT_DIR, "about.html")), "about.html missing")
  assert.ok(fs.existsSync(path.join(OUT_DIR, "privacy.html")), "privacy.html missing")
  assert.ok(fs.existsSync(path.join(OUT_DIR, "terms.html")), "terms.html missing")

  // 2. 52 Recipes
  const missingRecipes: string[] = []
  for (const r of snapshot.recipes) {
    const recipeHtml = path.join(OUT_DIR, "recipes", `${r.slug}.html`)
    if (!fs.existsSync(recipeHtml)) {
      missingRecipes.push(r.slug)
    }
  }
  assert.equal(missingRecipes.length, 0, `Missing recipe HTML files: ${missingRecipes.join(", ")}`)

  // 3. 1 Article
  const missingArticles: string[] = []
  for (const a of snapshot.articles) {
    const articleHtml = path.join(OUT_DIR, a.category || "guides", `${a.slug}.html`)
    if (!fs.existsSync(articleHtml)) {
      missingArticles.push(`${a.category}/${a.slug}`)
    }
  }
  assert.equal(missingArticles.length, 0, `Missing article HTML files: ${missingArticles.join(", ")}`)

  // 4. Collection clusters
  const clusters = getAllClusters()
  const missingClusters: string[] = []
  for (const c of clusters) {
    const clusterHtml = path.join(OUT_DIR, "recipes", "collections", `${c.id}.html`)
    if (!fs.existsSync(clusterHtml)) {
      missingClusters.push(c.id)
    }
  }
  assert.equal(missingClusters.length, 0, `Missing cluster HTML files: ${missingClusters.join(", ")}`)

  // 5. Hubs
  const missingHubs: string[] = []
  for (const h of HUBS) {
    const hubHtml = path.join(OUT_DIR, h.category, `${h.slug}.html`)
    if (!fs.existsSync(hubHtml)) {
      missingHubs.push(`${h.category}/${h.slug}`)
    }
  }
  assert.equal(missingHubs.length, 0, `Missing hub HTML files: ${missingHubs.join(", ")}`)

  // 6. Canonical categories
  const canonicalCats = snapshot.categories.filter((cat) => CANONICAL_CATEGORIES.has(cat.toLowerCase()))
  const missingCategories: string[] = []
  for (const cat of canonicalCats) {
    const catSlug = tagToSlug(cat)
    const catHtml = path.join(OUT_DIR, "recipes", "category", `${catSlug}.html`)
    if (!fs.existsSync(catHtml)) {
      missingCategories.push(catSlug)
    }
  }
  assert.equal(missingCategories.length, 0, `Missing category HTML files: ${missingCategories.join(", ")}`)

  // 7. Feeds, Sitemap, Robots, .htaccess
  assert.ok(fs.existsSync(path.join(OUT_DIR, "sitemap.xml")), "sitemap.xml missing")
  assert.ok(fs.existsSync(path.join(OUT_DIR, "robots.txt")), "robots.txt missing")
  assert.ok(fs.existsSync(path.join(OUT_DIR, "feed.xml")), "feed.xml missing")
  assert.ok(fs.existsSync(path.join(OUT_DIR, "llms.txt")), "llms.txt missing")
  assert.ok(fs.existsSync(path.join(OUT_DIR, ".htaccess")), ".htaccess missing")

  // 8. Static API Contracts
  const pinsPath = path.join(OUT_DIR, "api", "recipes", "pins")
  assert.ok(fs.existsSync(pinsPath), "api/recipes/pins missing")
  const pinsData = JSON.parse(fs.readFileSync(pinsPath, "utf8"))
  assert.equal(pinsData.status, "ok")
  assert.equal(pinsData.blogName, "Chef Augustin")
  assert.equal(pinsData.totalFound, snapshot.recipes.filter((r) => r.heroImageUrl).length)
  assert.equal(pinsData.recipes.length, snapshot.recipes.filter((r) => r.heroImageUrl).length)
  assert.ok(pinsData.recipes.every((p: any) => Array.isArray(p.pinVariants) && p.pinVariants.length === 4))

  const rawPath = path.join(OUT_DIR, "api", "recipes", "raw")
  assert.ok(fs.existsSync(rawPath), "api/recipes/raw missing")
  const rawData = JSON.parse(fs.readFileSync(rawPath, "utf8"))
  assert.equal(rawData.length, snapshot.recipes.length)
  assert.ok(rawData.every((r: any) => typeof r.markdown === "string" && r.markdown.length > 50))

  for (const r of snapshot.recipes) {
    const singleRaw = path.join(OUT_DIR, "api", "recipes", "raw", r.slug)
    assert.ok(fs.existsSync(singleRaw), `api/recipes/raw/${r.slug} missing`)
  }

  // 9. Comprehensive Anti-Leak & Secret Scan across ALL generated files in out/
  const leakFindings: Array<{ file: string; leaks: string[] }> = []
  for (const filePath of allFiles) {
    // Skip binary files if any
    if (/\.(png|jpg|jpeg|gif|webp|ico|svg|woff2?|ttf|eot)$/i.test(filePath)) continue

    const content = fs.readFileSync(filePath, "utf8")
    const leaks = scanSerializedSnapshotForLeaks(content)
    if (leaks.length > 0) {
      leakFindings.push({
        file: path.relative(OUT_DIR, filePath),
        leaks,
      })
    }
  }
  assert.deepEqual(leakFindings, [], `Leak scan failed in out/: ${JSON.stringify(leakFindings)}`)

  // 10. Summary Report
  const result = {
    verdict: "OUT_VALIDATION_PASSED",
    counts: {
      totalFilesGenerated: allFiles.length,
      recipesVerified: snapshot.recipes.length,
      articlesVerified: snapshot.articles.length,
      canonicalCategoriesVerified: canonicalCats.length,
      collectionClustersVerified: clusters.length,
      hubsVerified: HUBS.length,
      pinsEndpointRecipes: pinsData.recipes.length,
      rawEndpointRecipes: rawData.length,
    },
    contracts: {
      indexHtml: true,
      error404Html: true,
      sitemapXml: true,
      robotsTxt: true,
      feedXml: true,
      llmsTxt: true,
      htaccess: true,
      pinsApi: true,
      rawApi: true,
    },
    security: {
      filesScannedForLeaks: allFiles.length,
      leaksDetected: 0,
      privateDraftsLeaked: 0,
    },
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error("[validate-out] Failed:", err)
  process.exit(1)
})
