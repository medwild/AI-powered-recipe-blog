/**
 * Deterministic Apache / Hostinger LiteSpeed `.htaccess` generator
 * for `staging` and `production` static deployments (`output: "export"`).
 *
 * Compiles:
 * - Static redirects from `next.config.mjs` (preserving 301/308 parity)
 * - Single-hop 308 rules for `/recettes/<slug>` (published + RECIPE_SLUG_REDIRECTS)
 * - Clean extensionless HTML routing (`slug` -> `slug.html` HTTP 200)
 * - JSON MIME & CORS `*` on `/api/recipes/pins` and `/api/recipes/raw*`
 * - Isolated staging protection (no prod domain redirect + global `noindex`)
 */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { RECIPE_SLUG_REDIRECTS } from "../lib/recipe-slug-redirects"
import type { PublicSnapshotPayload } from "./public-snapshot-schema"

export type TargetEnv = "staging" | "production"

export interface GenerateHtaccessOptions {
  env: TargetEnv
  snapshotPath?: string
  nextConfigPath?: string
  stagingHtpasswdPath?: string
}

export async function generateHtaccessContent(opts: GenerateHtaccessOptions): Promise<string> {
  const cwd = process.cwd()
  const snapshotPath = opts.snapshotPath ?? path.resolve(cwd, "data/public-content.json")
  const nextConfigPath = opts.nextConfigPath ?? path.resolve(cwd, "next.config.mjs")

  const snapshotRaw = fs.readFileSync(snapshotPath, "utf8")
  const snapshot = JSON.parse(snapshotRaw) as PublicSnapshotPayload

  const configMod = await import(pathToFileURL(nextConfigPath).href)
  const nextConfig = configMod.default as {
    redirects?: () => Promise<Array<{ source: string; destination: string; permanent?: boolean }>>
  }
  const configRedirects = typeof nextConfig.redirects === "function" ? await nextConfig.redirects() : []

  const lines: string[] = [
    `# Chef Augustin — Static Hostinger LiteSpeed Configuration (${opts.env.toUpperCase()})`,
    "# Generated deterministically by scripts/generate-htaccess.ts",
    "",
    "Options -Indexes -MultiViews",
    "ErrorDocument 404 /404.html",
    "",
  ]

  if (opts.env === "staging") {
    lines.push("# --- STAGING ISOLATION (No redirect to production, global noindex) ---")
    if (opts.stagingHtpasswdPath) {
      lines.push("AuthType Basic")
      lines.push('AuthName "Chef Augustin Staging"')
      lines.push(`AuthUserFile "${opts.stagingHtpasswdPath}"`)
      lines.push("Require valid-user")
      lines.push("")
    } else {
      lines.push("# Enable Basic Auth in Hostinger hPanel Directory Privacy for staging.chefaugustin.com")
      lines.push("")
    }
    lines.push("<IfModule mod_headers.c>")
    lines.push('  Header always set X-Robots-Tag "noindex, nofollow"')
    lines.push("</IfModule>")
    lines.push("")
  }

  lines.push("<IfModule mod_rewrite.c>")
  lines.push("  RewriteEngine On")
  lines.push("")

  if (opts.env === "production") {
    lines.push("  # Canonical HTTPS + www.chefaugustin.com (301)")
    lines.push("  RewriteCond %{HTTPS} !=on [OR]")
    lines.push("  RewriteCond %{HTTP_HOST} !^www\\.chefaugustin\\.com$ [NC]")
    lines.push("  RewriteCond %{HTTP_HOST} chefaugustin\\.com$ [NC]")
    lines.push("  RewriteRule ^(.*)$ https://www.chefaugustin.com/$1 [R=301,L]")
    lines.push("")
    lines.push("  # Filtered /recipes?cat=... or ?q=... views: X-Robots-Tag noindex, follow")
    lines.push("  RewriteCond %{REQUEST_URI} ^/recipes/?$ [NC]")
    lines.push("  RewriteCond %{QUERY_STRING} .+")
    lines.push("  RewriteRule ^ - [E=NOINDEX_RECIPES:1]")
    lines.push("")
  }

  lines.push("  # Redirect explicit .html requests back to canonical clean URLs (301)")
  lines.push("  RewriteCond %{THE_REQUEST} \\s/+([^\\s]+?)\\.html[\\s?] [NC]")
  lines.push("  RewriteRule ^ /%1 [R=301,L]")
  lines.push("")

  lines.push("  # Legacy wildcard cluster -> collections (301)")
  lines.push("  RewriteRule ^recipes/cluster/(.*)$ /recipes/collections/$1 [R=301,L]")
  lines.push("")

  lines.push("  # Single-hop /recettes/<slug> -> /recipes/<target> (308)")
  const seenRecettes = new Set<string>()
  for (const [oldSlug, newSlug] of Object.entries(RECIPE_SLUG_REDIRECTS).sort(([a], [b]) => a.localeCompare(b))) {
    seenRecettes.add(oldSlug)
    lines.push(`  RewriteRule ^recettes/${escapeRegex(oldSlug)}/?$ /recipes/${newSlug} [R=308,L]`)
  }
  for (const recipe of [...snapshot.recipes].sort((a, b) => a.slug.localeCompare(b.slug))) {
    if (!seenRecettes.has(recipe.slug)) {
      lines.push(`  RewriteRule ^recettes/${escapeRegex(recipe.slug)}/?$ /recipes/${recipe.slug} [R=308,L]`)
    }
  }
  lines.push("")

  lines.push("  # Exact redirects imported from next.config.mjs")
  for (const r of configRedirects) {
    if (r.source.includes(":path*")) continue
    const code = r.permanent === false ? 307 : 301
    const cleanSource = r.source.replace(/^\//, "")
    lines.push(`  RewriteRule ^${escapeRegex(cleanSource)}/?$ ${r.destination} [R=${code},L]`)
  }
  lines.push("")

  lines.push("  # Serve pre-rendered extensionless static pages (/recipes/slug -> /recipes/slug.html in HTTP 200)")
  lines.push("  RewriteCond %{REQUEST_FILENAME} !-f")
  lines.push("  RewriteCond %{REQUEST_FILENAME} !-d")
  lines.push("  RewriteCond %{REQUEST_FILENAME}.html -f")
  lines.push("  RewriteRule ^(.+?)/?$ $1.html [L]")
  lines.push("</IfModule>")
  lines.push("")

  lines.push("# --- JSON MIME Types & PinScheduler CORS for extensionless static APIs ---")
  lines.push('<FilesMatch "^pins$">')
  lines.push("  ForceType application/json")
  lines.push("  <IfModule mod_headers.c>")
  lines.push('    Header always set Access-Control-Allow-Origin "*"')
  lines.push('    Header always set Access-Control-Allow-Methods "GET, OPTIONS"')
  lines.push('    Header always set Cache-Control "public, max-age=900, must-revalidate"')
  lines.push("  </IfModule>")
  lines.push("</FilesMatch>")
  lines.push("")
  lines.push("<If \"%{REQUEST_URI} =~ m#^/api/recipes/raw(/.*)?$#\">")
  lines.push("  ForceType application/json")
  lines.push("  <IfModule mod_headers.c>")
  lines.push('    Header always set Cache-Control "public, max-age=900, must-revalidate"')
  lines.push("  </IfModule>")
  lines.push("</If>")
  lines.push("")

  if (opts.env === "production") {
    lines.push("# --- Security & Differentiated Cache Headers (Production) ---")
    lines.push("<IfModule mod_headers.c>")
    lines.push('  Header always set X-Content-Type-Options "nosniff"')
    lines.push('  Header always set Referrer-Policy "strict-origin-when-cross-origin"')
    lines.push('  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains"')
    lines.push('  Header always set X-Robots-Tag "noindex, follow" env=NOINDEX_RECIPES')
    lines.push("</IfModule>")
    lines.push("")
    lines.push('<If "%{REQUEST_URI} =~ m#^/_next/static/#">')
    lines.push("  <IfModule mod_headers.c>")
    lines.push('    Header set Cache-Control "public, max-age=31536000, immutable"')
    lines.push("  </IfModule>")
    lines.push("</If>")
    lines.push("")
    lines.push('<FilesMatch "\\.(?:html)$">')
    lines.push("  <IfModule mod_headers.c>")
    lines.push('    Header set Cache-Control "public, max-age=3600, must-revalidate"')
    lines.push("  </IfModule>")
    lines.push("</FilesMatch>")
    lines.push("")
    lines.push('<FilesMatch "^(?:sitemap\\.xml|feed\\.xml|llms\\.txt|robots\\.txt)$">')
    lines.push("  <IfModule mod_headers.c>")
    lines.push('    Header set Cache-Control "public, max-age=900, must-revalidate"')
    lines.push("  </IfModule>")
    lines.push("</FilesMatch>")
    lines.push("")
  }

  return `${lines.join("\n")}\n`
}

function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function main() {
  const args = process.argv.slice(2)
  let env: TargetEnv = (process.env.TARGET_ENV === "production" ? "production" : "staging")
  let outPath: string | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--env" && (args[i + 1] === "staging" || args[i + 1] === "production")) {
      env = args[i + 1] as TargetEnv
      i++
    } else if (args[i] === "--out" && args[i + 1]) {
      outPath = path.resolve(process.cwd(), args[i + 1])
      i++
    }
  }

  const content = await generateHtaccessContent({
    env,
    stagingHtpasswdPath: process.env.STAGING_HTPASSWD_PATH,
  })

  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, content, "utf8")
    console.log(JSON.stringify({ env, outPath: path.relative(process.cwd(), outPath), bytes: Buffer.byteLength(content, "utf8") }))
  } else {
    process.stdout.write(content)
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[generate-htaccess] Failed:", err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
