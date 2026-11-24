# Chef Augustin — Public Standalone Frontend

Public-facing Next.js 16.4.6 standalone application for `www.chefaugustin.com`.
Reads exclusively from the static JSON snapshot at `data/public-content.json`.
Contains zero Neon PostgreSQL connections, zero AI pipelines, zero Studio auth/admin routes, and zero server secrets.

## Requirements

- Node.js `22.x`
- Zero required secrets (`DATABASE_URL`, Gemini, Cloudinary Admin, and Studio tokens must NOT be set)
- Optional public configuration:
  - `NEXT_PUBLIC_SITE_URL=https://www.chefaugustin.com`

## Local / Hostinger Node.js Build & Start

1. Install dependencies (including build-time `devDependencies` even if `NODE_ENV=production` is set in the shell):
   ```bash
   npm ci --include=dev
   ```
2. Run TypeScript check and build standalone server:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   `npm run build` executes `NODE_ENV=production next build --webpack` followed by `postbuild`, which copies `.next/static` and `public` into `.next/standalone/`.
3. Validate snapshot & standalone bundle hygiene:
   ```bash
   npm test
   ```
4. Start the standalone Node.js server (Hostinger entrypoint):
   ```bash
   npm start
   ```
   (`node .next/standalone/server.js`, listens on `process.env.PORT || 3000` and `process.env.HOSTNAME || "0.0.0.0"`).
