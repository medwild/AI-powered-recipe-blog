/**
 * Exhaustive post-build verification suite for Next.js standalone build
 * (`chef-augustin-public/.next/standalone` & `.next/static`).
 *
 * Verifies:
 * 1. Standalone entrypoint (`server.js`) and static assets exist
 * 2. Zero `.env`, `.env.local`, `.env.production` inside `.next/standalone`
 * 3. Zero forbidden server dependencies (`pg`, `drizzle-orm`, `cloudinary`, AI SDKs)
 * 4. Pre-rendered SSG HTML/RSC files exist for all 52 recipes, 1 article, 11 hubs, 6 clusters, and canonical categories
 * 5. Zero private fields (`workflowLog`, `serpData`, `imageVariants`, `ipHash`), draft leaks,
 *    PostgreSQL URLs, or secret strings across RSC payloads, JS bundles, Route Handlers, and standalone files
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
const NEXT_DIR = path.resolve(CWD, ".next")
const STANDALONE_DIR = path.resolve(NEXT_DIR, "standalone")
const SERVER_APP_DIR = path.resolve(NEXT_DIR, "server/app")
const SNAPSHOT_PATH = path.resolve(CWD, "data/public-content.json")

function getAllFiles(dirPath: string, out: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return out
  for (const entry of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, entry)
    const stat = fs.lstatSync(full)
    if (stat.isSymbolicLink()) continue
    if (stat.isDirectory()) {
      getAllFiles(full, out)
    } else {
      out.push(full)
    }
  }
  return out
}

const FORBIDDEN_STANDALONE_PACKAGES = [
  "pg",
  "drizzle-orm",
  "cloudinary",
  "@google/genai",
  "@anthropic-ai/sdk",
]

const FORBIDDEN_STANDALONE_CODE_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "env_DATABASE_URL", pattern: /\bDATABASE_URL\b/ },
  { label: "env_DASHBOARD_SECRET_TOKEN", pattern: /\bDASHBOARD_SECRET_TOKEN\b/ },
  { label: "env_CLOUDINARY_API_SECRET", pattern: /\bCLOUDINARY_API_SECRET\b/ },
  { label: "env_GEMINI_API_KEY", pattern: /\bGEMINI_API_KEY\b/ },
  { label: "env_ANTHROPIC_API_KEY", pattern: /\bANTHROPIC_API_KEY\b/ },
  { label: "env_IDEOGRAM_API_KEY", pattern: /\bIDEOGRAM_API_KEY\b/ },
  { label: "env_SERPER_API_KEY", pattern: /\bSERPER_API_KEY\b/ },
  { label: "postgres_connection_string", pattern: /postgres(?:ql)?:\/\/[^\s"'`]+/i },
  { label: "private_field_workflowLog", pattern: /"workflowLog"\s*:|"workflow_log"\s*:/i },
  { label: "private_field_serpData", pattern: /"serpData"\s*:|"serp_data"\s*:/i },
  { label: "private_field_imageVariants", pattern: /"imageVariants"\s*:|"image_variants"\s*:/i },
  { label: "private_field_ipHash", pattern: /"ipHash"\s*:|"ip_hash"\s*:/i },
  { label: "draft_status_leak", pattern: /"status"\s*:\s*"draft"/i },
  { label: "api_key_prefix", pattern: /\b(?:sk-ant-|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{25,})\b/ },
]

async function main() {
  assert.ok(fs.existsSync(STANDALONE_DIR), `Missing ${STANDALONE_DIR}. Run next build --webpack first.`)
  assert.ok(fs.existsSync(path.join(STANDALONE_DIR, "server.js")), "Missing .next/standalone/server.js")
  assert.ok(fs.existsSync(path.join(STANDALONE_DIR, ".next/static")), "Missing .next/standalone/.next/static")
  assert.ok(fs.existsSync(path.join(STANDALONE_DIR, "public")), "Missing .next/standalone/public")
  assert.ok(fs.existsSync(path.join(STANDALONE_DIR, "data/public-content.json")), "Missing .next/standalone/data/public-content.json")

  // 1. Verify NO .env* files in standalone
  const forbiddenEnvFiles = [".env", ".env.local", ".env.production", ".env.development"]
  const foundEnvFiles = forbiddenEnvFiles.filter((f) => fs.existsSync(path.join(STANDALONE_DIR, f)))
  assert.deepEqual(foundEnvFiles, [], `Forbidden env files in standalone: ${foundEnvFiles.join(", ")}`)

  // 2. Verify standalone/node_modules has real traced runtime (not broken symlink) and NO private/DB/AI packages
  const standaloneNodeModules = path.join(STANDALONE_DIR, "node_modules")
  assert.ok(
    fs.existsSync(path.join(standaloneNodeModules, "next")),
    "Missing .next/standalone/node_modules/next (broken symlink or incomplete trace)",
  )
  const bundledForbidden = FORBIDDEN_STANDALONE_PACKAGES.filter((pkg) =>
    fs.existsSync(path.join(standaloneNodeModules, pkg)),
  )
  assert.deepEqual(
    bundledForbidden,
    [],
    `Forbidden packages bundled into standalone/node_modules: ${bundledForbidden.join(", ")}`,
  )

  // 3. Verify NO dashboard/login/admin routes exist in standalone
  const forbiddenRoutes = [
    path.join(SERVER_APP_DIR, "dashboard"),
    path.join(SERVER_APP_DIR, "login"),
    path.join(SERVER_APP_DIR, "api/auth"),
    path.join(SERVER_APP_DIR, "api/internal"),
    path.join(SERVER_APP_DIR, "api/recipes/generate"),
    path.join(SERVER_APP_DIR, "api/self-improvement"),
  ]
  const presentForbiddenRoutes = forbiddenRoutes
    .filter((p) => fs.existsSync(p))
    .map((p) => path.relative(SERVER_APP_DIR, p))
  assert.deepEqual(
    presentForbiddenRoutes,
    [],
    `Forbidden admin routes built into standalone: ${presentForbiddenRoutes.join(", ")}`,
  )

  // 4. Verify SSG pre-rendered pages exist in .next/server/app
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as PublicSnapshotPayload
  const missingRecipes = snapshot.recipes
    .filter((r) => !fs.existsSync(path.join(SERVER_APP_DIR, "recipes", `${r.slug}.html`)))
    .map((r) => r.slug)
  assert.equal(missingRecipes.length, 0, `Missing SSG recipe HTML: ${missingRecipes.join(", ")}`)

  const missingArticles = snapshot.articles
    .filter((a) => !fs.existsSync(path.join(SERVER_APP_DIR, a.category || "guides", `${a.slug}.html`)))
    .map((a) => `${a.category}/${a.slug}`)
  assert.equal(missingArticles.length, 0, `Missing SSG article HTML: ${missingArticles.join(", ")}`)

  const clusters = getAllClusters()
  const missingClusters = clusters
    .filter((c) => !fs.existsSync(path.join(SERVER_APP_DIR, "recipes/collections", `${c.id}.html`)))
    .map((c) => c.id)
  assert.equal(missingClusters.length, 0, `Missing SSG cluster HTML: ${missingClusters.join(", ")}`)

  const missingHubs = HUBS
    .filter((h) => !fs.existsSync(path.join(SERVER_APP_DIR, h.category, `${h.slug}.html`)))
    .map((h) => `${h.category}/${h.slug}`)
  assert.equal(missingHubs.length, 0, `Missing SSG hub HTML: ${missingHubs.join(", ")}`)

  const canonicalCats = snapshot.categories.filter((c) => CANONICAL_CATEGORIES.has(c.toLowerCase()))
  const missingCats = canonicalCats
    .map((c) => tagToSlug(c))
    .filter((slug) => !fs.existsSync(path.join(SERVER_APP_DIR, "recipes/category", `${slug}.html`)))
  assert.equal(missingCats.length, 0, `Missing SSG category HTML: ${missingCats.join(", ")}`)

  // 5. Scan ALL distributed files in .next/standalone + .next/static + .next/server (RSC/HTML/JS/Route Handlers)
  const standaloneFiles = getAllFiles(STANDALONE_DIR)
  const staticFiles = getAllFiles(path.join(NEXT_DIR, "static"))
  const serverFiles = getAllFiles(path.join(NEXT_DIR, "server"))
  const allScanTargets = Array.from(new Set([...standaloneFiles, ...staticFiles, ...serverFiles]))

  const leakFindings: Array<{ file: string; hits: string[] }> = []
  let scannedTextFiles = 0

  for (const filePath of allScanTargets) {
    if (/\.(png|jpg|jpeg|gif|webp|ico|svg|woff2?|ttf|eot|map|node)$/i.test(filePath)) continue
    // Skip Next.js / framework internal node_modules from code-identifier scan; scan app code, RSC, HTML, JS chunks, data
    const rel = path.relative(CWD, filePath)
    const isFrameworkDep = rel.includes("node_modules/")
    if (isFrameworkDep) continue

    const content = fs.readFileSync(filePath, "utf8")
    scannedTextFiles++

    const hits = [
      ...scanSerializedSnapshotForLeaks(content),
      ...FORBIDDEN_STANDALONE_CODE_PATTERNS.filter((r) => r.pattern.test(content)).map((r) => r.label),
    ]
    const uniqueHits = Array.from(new Set(hits))
    if (uniqueHits.length > 0) {
      leakFindings.push({ file: rel, hits: uniqueHits })
    }
  }

  assert.deepEqual(
    leakFindings,
    [],
    `Secret/leak scan failed across standalone artifacts: ${JSON.stringify(leakFindings)}`,
  )

  console.log(
    JSON.stringify(
      {
        status: "STANDALONE_VALIDATION_PASSED",
        counts: {
          ssgRecipesVerified: snapshot.recipes.length,
          ssgArticlesVerified: snapshot.articles.length,
          ssgHubsVerified: HUBS.length,
          ssgClustersVerified: clusters.length,
          ssgCanonicalCategoriesVerified: canonicalCats.length,
          standaloneTextFilesScanned: scannedTextFiles,
        },
        security: {
          envFilesInStandalone: foundEnvFiles.length,
          forbiddenPackagesBundled: bundledForbidden.length,
          forbiddenAdminRoutesPresent: presentForbiddenRoutes.length,
          leaksFound: leakFindings.length,
        },
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error("[validate-standalone] Failed:", err)
  process.exit(1)
})
